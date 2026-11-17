# Gabarita — instruções para o Claude

Plataforma pessoal de estudos para concursos de TI em tribunais. Next.js (Vercel) + Supabase (Postgres, Auth, RLS) + ts-fsrs. Custo zero. Leia `README.md` e `docs/README.md` para o contexto.

## Documentos que mandam
| Assunto | Documento |
|---|---|
| Arquitetura e segurança | `docs/02-arquitetura.md`, `docs/adr/` |
| Banco | `docs/03-modelo-de-dados.md` |
| Regras de negócio | `docs/04-regras-de-estudo.md` |
| Design system | `docs/05-identidade-visual.md`, `design/` |
| Padrões de código | `docs/06-padroes-de-codigo.md` |
| Testes | `docs/07-estrategia-de-testes.md` |
| Specs por funcionalidade | `docs/specs/` |
| Tradução dos termos (código em inglês) | `docs/08-glossario.md`, ADR-007 |

Se o código e o documento divergirem, pare e pergunte qual está certo; não escolha em silêncio.

## Time de agentes (`.claude/agents/`)
| Agente | Papel |
|---|---|
| `arquiteto` | Plano técnico antes de implementar; ADRs |
| `especialista-banco` | Migrações, RLS, visões, seed, pgTAP |
| `especialista-frontend` | Telas, componentes, design system, acessibilidade |
| `engenheiro-testes` | Testes unitários, de componente e integração (Vitest) |
| `engenheiro-e2e` | Jornadas no navegador (Playwright + axe) |
| `revisor-codigo` | Revisão obrigatória antes de dar a tarefa por pronta |

## Gestão de modelos
Use o modelo mais barato que faça a tarefa bem.

| Modelo | Quando usar |
|---|---|
| **Opus 5.5** (`opus`) | Tarefas complexas: plano técnico e ADR, migração/RLS/visões, regra de domínio nova (FSRS, prioridade, cronograma), depuração difícil, revisão de código, decisões com alternativas |
| **Sonnet 5.5** (`sonnet`) | Tarefas simples ou repetitivas: telas seguindo o design system, testes de critérios já especificados, renomeações, ajustes de texto e docs, regenerar seed, commits, buscas no código |

- O padrão de cada agente está no campo `model:` do frontmatter: `opus` em `arquiteto`, `especialista-banco` e `revisor-codigo`; `sonnet` em `especialista-frontend`, `engenheiro-testes`, `engenheiro-e2e` e na skill `commit`.
- Ao delegar, troque o modelo pelo parâmetro `model` quando a tarefa fugir do padrão do agente (ex.: `especialista-frontend` com `opus` para um componente de estado complexo; `especialista-banco` com `sonnet` só para regenerar o seed).
- Na sessão principal, prefira delegar trabalho repetitivo e volumoso a um agente `sonnet` em vez de fazê-lo no Opus. Se a sessão inteira for de tarefas simples, sugira ao dono trocar com `/model`.

## Fluxo de toda funcionalidade
1. **Especificar** — `arquiteto` registra a spec em `docs/specs/SPEC-NNN-*.md` (ver `docs/specs/README.md`) com status `rascunho`.
2. **Aprovar** — o dono do projeto responde as perguntas em aberto e aprova. **Sem spec `aprovada`, não se escreve código.** Só ajuste trivial (correção pontual, texto) dispensa spec. Ao começar, mude o status para `em-implementacao`.
3. **Banco** (se houver) — `especialista-banco` cria migração + RLS + pgTAP.
4. **Implementar** — domínio puro primeiro, com testes; depois `data/`, `actions/` e interface (`especialista-frontend`). Mudança de escopo atualiza a spec antes do código.
5. **Testar** — `engenheiro-testes` e `engenheiro-e2e` cobrem cada critério de aceite (CA-n) da spec.
6. **Revisar** — `revisor-codigo` confere o código contra a spec e os padrões. Bloqueantes voltam para a etapa 4 e a revisão é refeita.
7. **Fechar** — só com a *Definição de pronto* do doc 06 cumprida; spec como `concluida`, docs e `CHANGELOG.md` (citando a spec) atualizados.

Etapas independentes (ex.: testes unitários e E2E da mesma funcionalidade) podem rodar em paralelo.

## Commits
Sempre pela skill `commit` (`.claude/skills/commit/`): Conventional Commits em inglês, escopo do módulo e `Spec: SPEC-NNN` no rodapé.

## Regras inegociáveis
- Migração aplicada não se edita; `supabase/seed.sql` não se edita à mão.
- RLS em toda tabela; nenhuma chave no código ou no front-end.
- Regra de negócio só em `domain/`, pura e testada.
- Comentário só quando importante e pertinente: explica o porquê, nunca o quê (doc 06 § Comentários).
- Não marcar tarefa como pronta com teste falhando ou revisão reprovada; relatar o resultado real.
- Código em inglês (identificadores, arquivos, pastas, comentários, testes, banco, CSS, commits); documentação e textos da interface em português (ADR-007). Termos do domínio seguem `docs/08-glossario.md`, iguais no banco e no código.
