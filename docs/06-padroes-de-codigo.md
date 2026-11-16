# 06 — Padrões de código e arquitetura

Regras que todo código do Gabarita segue. O agente `revisor-codigo` usa este documento como checklist. Decisão de origem: ADR-006.

## Estrutura de pastas

```
src/
  app/                        Rotas do Next.js (App Router). Finas: só compõem módulos.
  modulos/
    <modulo>/                 questoes, revisao, cronograma, simulados, discursivas, materiais, ia, configuracoes
      dominio/                Regras de negócio puras (sem I/O). Ex.: calcularUrgencia, notaCebraspe
      dados/                  Acesso ao Supabase (repositórios). Único lugar com queries.
      acoes/                  Server actions: validam com Zod, chamam dominio + dados
      componentes/            Componentes React do módulo
      index.ts                API pública do módulo
  compartilhado/
    ui/                       Componentes do design system (Botao, Alternativa, MedidorDominio, Etiqueta…)
    supabase/                 Clientes (servidor e navegador) e tipos gerados
    utilitarios/
tests/
  e2e/                        Playwright
supabase/tests/               pgTAP (RLS, restrições, visões)
```

## Regras de dependência

| Camada | Pode importar | Não pode importar |
|---|---|---|
| `dominio/` | só `dominio/` de outros módulos e `ts-fsrs` | React, Next, Supabase, `fetch`, `Date.now()` direto |
| `dados/` | `compartilhado/supabase`, `dominio/` (tipos) | React, componentes |
| `acoes/` | `dominio/`, `dados/`, Zod | componentes |
| `componentes/` | `compartilhado/ui`, `acoes/`, tipos do domínio | `dados/` direto |
| `app/` | `index.ts` dos módulos | arquivos internos dos módulos |

- Um módulo usa outro **apenas** pelo `index.ts`.
- Tempo e aleatoriedade entram por parâmetro (`agora: Date`, `sortear: () => number`) para o domínio ser determinístico e testável.

## Nomenclatura

- **Termos do domínio em português, sem acento**, iguais aos do banco: `cartao`, `revisao`, `assunto`, `incidencia`, `urgencia`.
- Termos técnicos consagrados podem ficar em inglês quando já fixados em ADR (`AIProvider`).
- Arquivos: `kebab-case.ts`; componentes: `PascalCase.tsx`; funções e variáveis: `camelCase`; constantes: `UPPER_SNAKE_CASE`.
- Testes ao lado do código: `nota-cebraspe.ts` → `nota-cebraspe.test.ts`.

## TypeScript

- `strict` e `noUncheckedIndexedAccess` ligados. Proibido `any`; use `unknown` + validação.
- Proibido `as` para silenciar erro de tipo (exceção: tipos gerados do Supabase em JSON, com comentário).
- Erros esperados do domínio retornam resultado tipado (`{ ok: true, valor } | { ok: false, erro }`); `throw` só para falhas inesperadas.

## Banco (Supabase)

- Toda mudança de schema é uma **nova** migração em `supabase/migrations/`; migração já aplicada não se edita.
- Toda tabela nova tem RLS ativa e política conforme ADR-005, com teste pgTAP.
- Visões com `security_invoker = true`.
- `service_role` nunca no código da aplicação.
- Após mudar o schema: regenerar tipos e atualizar `docs/03-modelo-de-dados.md`.

## Interface

- Usar tokens (`--tinta`, `--papel`, `--espaco-4`…) e classes `gb-`; nada de cor ou espaçamento literal.
- Componente novo do design system entra em `design/` antes de ir para o código (doc 05).
- Acerto e erro sempre com ícone + texto, nunca só cor.
- Contraste AA nos dois temas; tudo operável por teclado; foco visível.
- Mobile-first: todo fluxo funciona a partir de 360 px de largura.

## Segurança

- Chaves só em variáveis de ambiente do servidor; nada com `NEXT_PUBLIC_` além da URL e da chave anônima do Supabase.
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
