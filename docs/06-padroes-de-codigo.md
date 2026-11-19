# 06 — Padrões de código e arquitetura

Regras que todo código do Gabarita segue. O agente `revisor-codigo` usa este documento como checklist. Decisão de origem: ADR-006.

## Estrutura de pastas

```
src/
  app/                        Rotas do Next.js (App Router). Finas: só compõem módulos.
  proxy.ts                    Sessão e controle de acesso (proxy do Next 16)
  modules/
    <module>/                 auth, settings, topics, questions, review, schedule, mock-exams, essays, materials, ai
      domain/                 Regras de negócio puras (sem I/O). Ex.: computeUrgency, cebraspeScore
      data/                   Acesso ao Supabase (repositórios). Único lugar com queries.
      actions/                Server actions e leitores de servidor: validam com Zod, chamam domain + data
      components/             Componentes React do módulo
      index.ts                API pública do módulo
  shared/
    ui/                       Componentes do design system (Button, Field, Notice, Shell…)
    supabase/                 Clientes (servidor) e tipos gerados (database.types.ts)
    utils/
tests/
  e2e/                        Playwright
  factories/                  Fábricas de dados de teste
supabase/tests/               pgTAP (RLS, restrições, visões)
```

## Regras de dependência

| Camada | Pode importar | Não pode importar |
|---|---|---|
| `domain/` | só `domain/` de outros módulos e `ts-fsrs` | React, Next, Supabase, `fetch`, `Date.now()` direto |
| `data/` | `shared/supabase`, `domain/` (tipos) | React, componentes |
| `actions/` | `domain/`, `data/`, Zod | componentes |
| `components/` | `shared/ui`, `actions/`, tipos do domínio | `data/` direto |
| `app/` | `index.ts` dos módulos | arquivos internos dos módulos |

- Um módulo usa outro **apenas** pelo `index.ts`.
- **Leitores de servidor em `actions/` sem `'use server'` (SPEC-004, P-9).** A diretiva `'use server'` transforma cada função exportada num endpoint que o navegador pode chamar. Uma função de leitura que recebe o cliente do Supabase e o `userId` como parâmetros não pode ser exposta assim; ela fica em `actions/`, sem a diretiva, e é chamada só pelas páginas em `app/`, pelo `index.ts` do módulo. É o caso de `getTopicMap` e `getTopicDetail` (`src/modules/topics/actions/get-topic-map.ts`). Só mutações disparadas pelo navegador levam `'use server'`.
- Exceção para o domínio: o `index.ts` do módulo expõe ações e componentes, então um `domain/` importa o domínio de outro módulo só por `@/modules/<module>/domain` (o `domain/index.ts`, que reexporta apenas funções e tipos puros). Fora de `domain/`, essa importação é proibida.
- As regras desta tabela são impostas pelo ESLint (`eslint.config.mjs`) e testadas em `tests/lint/`.
- Tempo e aleatoriedade entram por parâmetro (`now: Date`, `random: () => number`) para o domínio ser determinístico e testável.

## Nomenclatura

- **Código em inglês** (ADR-007): identificadores, arquivos, pastas, rotas, comentários, nomes de teste, banco, classes CSS e tokens. Documentação e textos da interface ficam em português.
- **Termos do domínio** seguem o glossário (`docs/08-glossario.md`), iguais no banco e no código: `card`, `review_logs`, `topic`, `incidence`, `urgency`. Termo novo entra no glossário antes do código.
- Arquivos: `kebab-case.ts`; componentes: `PascalCase.tsx`; funções e variáveis: `camelCase`; constantes: `UPPER_SNAKE_CASE`.
- Testes ao lado do código: `cebraspe-score.ts` → `cebraspe-score.test.ts`.

## TypeScript

- `strict` e `noUncheckedIndexedAccess` ligados. Proibido `any`; use `unknown` + validação.
- Proibido `as` para silenciar erro de tipo (exceção: tipos gerados do Supabase em JSON, com comentário).
- Erros esperados do domínio retornam resultado tipado (`{ ok: true, value } | { ok: false, error }`); `throw` só para falhas inesperadas.

## Comentários

**Por padrão, não há comentário.** O código se explica por nomes claros, funções pequenas e tipos. Um comentário só existe quando diz algo que o código não consegue dizer, e quase sempre isso é o **porquê**.

### Quando comentar
| Situação | Exemplo |
|---|---|
| Regra de negócio não óbvia, citando a fonte | `// A blank item carries no penalty on Cebraspe (docs/04 § Simulados).` |
| Decisão que parece errada, mas é intencional | `// No await: the AI log must not delay the response to the user.` |
| Contorno de bug ou limitação externa, com link | `// ts-fsrs 4.x rounds due to minutes; see <issue link>.` |
| Escolha de segurança ou de desempenho | `-- Partial index: the daily queue only reads cards that are not suspended.` |
| Expressão regular, SQL ou cálculo difícil de ler | O que a regex aceita, com um exemplo |
| Contrato público não expresso pelos tipos (TSDoc no `index.ts` do módulo) | Unidade, faixa (0 a 1), efeitos colaterais |
| Pendência com dono | `// TODO(SPEC-012): add the − 6 × NE / TL variant.` |

### Nunca comentar
- O que o código já diz: `// increments the counter`, `// returns the user`.
- Código desativado: apague; o git guarda o histórico.
- Histórico, autoria ou datas (`// changed on…`, `// by so-and-so`): isso vai no commit.
- Separadores e banners (`// ===== HELPERS =====`).
- TSDoc que só repete nome e tipos dos parâmetros.
- Recados para o revisor ou para a IA (`// now using the new function`, `// fixed`).
- `TODO` ou `FIXME` sem spec associada.
- `eslint-disable` ou `@ts-expect-error` sem o motivo na mesma linha.

### Forma
- Inglês, curto, frase completa. Se precisar de um parágrafo, o código provavelmente precisa ser simplificado, ou o assunto é uma spec ou um ADR, e o comentário apenas o cita.
- Comentário desatualizado é pior que nenhum: quem muda o código atualiza ou remove o comentário.
- Testes não levam comentários explicando o caso; o nome do teste faz isso.
- SQL: `comment on table/column` para semânticas que não são óbvias (ex.: `wrong_answer_penalty`); cada migração começa com uma linha dizendo o propósito dela.

## Banco (Supabase)

- Toda mudança de schema é uma **nova** migração em `supabase/migrations/`; migração já aplicada não se edita.
- A migração é aplicada no remoto **antes** do merge e precisa ser compatível com o código que está em produção: aditiva (tabela, coluna anulável ou com padrão, valor novo de enum, índice). Mudança que quebra o código antigo (renomear, apagar, `not null` sem padrão) é feita em duas etapas, expandir e depois contrair. O `revisor-codigo` confere essa regra.
- Toda tabela nova tem RLS ativa e política conforme ADR-005, com teste pgTAP.
- Visões com `security_invoker = true`.
- `service_role` nunca no código da aplicação.
- Após mudar o schema: regenerar tipos e atualizar `docs/03-modelo-de-dados.md`.

## Interface

- Usar tokens (`--ink`, `--paper`, `--space-4`…) e classes `gb-`; nada de cor ou espaçamento literal.
- Componente novo do design system entra em `design/` antes de ir para o código (doc 05).
- Acerto e erro sempre com ícone + texto, nunca só cor.
- Contraste AA nos dois temas; tudo operável por teclado; foco visível.
- Mobile-first: todo fluxo funciona a partir de 360 px de largura.

## Segurança

- Chaves só em variáveis de ambiente do servidor; nada com `NEXT_PUBLIC_` além da URL e da chave publicável do Supabase (`NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`).
- A senha do banco remoto (`SUPABASE_DB_PASSWORD`) só existe como variável de ambiente da sessão do terminal: nunca em arquivo versionado, em `.env*` nem em segredo do GitHub Actions.
- Toda entrada externa (formulário, JSON colado do chat do Claude, importação de questões) é validada com Zod antes de tocar o banco.
- Markdown de materiais é renderizado sanitizado.

## Definição de pronto

Uma tarefa só está pronta quando:
0. Existe spec aprovada em `docs/specs/` e todos os critérios de aceite dela têm teste passando.
1. `npm run lint`, `npm run typecheck` e `npm test` passam.
2. Regras de domínio novas têm teste unitário (inclusive casos-limite do doc 04).
3. Mudanças de banco têm teste pgTAP.
4. Fluxos de usuário novos ou alterados têm teste E2E.
5. O `revisor-codigo` aprovou sem pendências bloqueantes.
6. Documentação e `CHANGELOG.md` atualizados quando mudam schema, regra ou decisão.
