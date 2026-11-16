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

## Fluxo de toda funcionalidade
1. **Especificar** — `arquiteto` registra a spec em `docs/specs/SPEC-NNN-*.md` (ver `docs/specs/README.md`) com status `rascunho`.
2. **Aprovar** — o dono do projeto responde as perguntas em aberto e aprova. **Sem spec `aprovada`, não se escreve código.** Só ajuste trivial (correção pontual, texto) dispensa spec. Ao começar, mude o status para `em-implementacao`.
3. **Banco** (se houver) — `especialista-banco` cria migração + RLS + pgTAP.
4. **Implementar** — domínio puro primeiro, com testes; depois `dados/`, `acoes/` e interface (`especialista-frontend`). Mudança de escopo atualiza a spec antes do código.
5. **Testar** — `engenheiro-testes` e `engenheiro-e2e` cobrem cada critério de aceite (CA-n) da spec.
6. **Revisar** — `revisor-codigo` confere o código contra a spec e os padrões. Bloqueantes voltam para a etapa 4 e a revisão é refeita.
7. **Fechar** — só com a *Definição de pronto* do doc 06 cumprida; spec como `concluida`, docs e `CHANGELOG.md` (citando a spec) atualizados.

Etapas independentes (ex.: testes unitários e E2E da mesma funcionalidade) podem rodar em paralelo.

## Commits
Sempre pela skill `commit` (`.claude/skills/commit/`): Conventional Commits em português, escopo do módulo e `Spec: SPEC-NNN` no rodapé.

## Regras inegociáveis
- Migração aplicada não se edita; `supabase/seed.sql` não se edita à mão.
- RLS em toda tabela; nenhuma chave no código ou no front-end.
- Regra de negócio só em `dominio/`, pura e testada.
- Comentário só quando importante e pertinente: explica o porquê, nunca o quê (doc 06 § Comentários).
- Não marcar tarefa como pronta com teste falhando ou revisão reprovada; relatar o resultado real.
- Documentação e código em português; termos do domínio sem acento, iguais aos do banco.
