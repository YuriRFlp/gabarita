# 07 — Estratégia de testes

Decisão de origem: ADR-006.

## Pirâmide

| Nível | Ferramenta | O que cobre | Onde fica | Meta |
|---|---|---|---|---|
| Unitário | Vitest | Funções de `domain/` (regras do doc 04) | ao lado do código | ≥ 90% de linhas e ramos em `domain/` |
| Componente | Vitest + Testing Library | Estados e interação de componentes | ao lado do código | Todo componente com lógica |
| Banco | pgTAP (`supabase test db`) | RLS, restrições, visões, índices | `supabase/tests/` | Toda tabela e visão |
| Design | Vitest | Contraste dos pares de cor de `design/tokens.json` nos dois temas | `tests/design/` | Pares novos de cada direção visual |
| Integração | Vitest + Supabase local | `data/` e `actions/` contra banco real | `*.int.test.ts` | Caminhos principais |
| E2E | Playwright (+ axe) | Jornadas do usuário no navegador | `tests/e2e/` | Jornadas críticas abaixo |

## Casos obrigatórios do domínio

Derivados de `docs/04-regras-de-estudo.md`; cada um vira teste com nome descritivo.

- **Prioridade e urgência:** `urgencia = prioridade × (1 − dominio)`; assunto sem respostas tem domínio 0.
- **Domínio:** acerto com confiança "chute" não conta; janela de 60 dias (limite exato do dia 60 e 61).
- **Escolha do assunto:** `pos_edital` bloqueado sem edital; cota de infra com 2 dias restantes (e com 3); proibição de repetir assunto em dias seguidos, com a exceção de urgência > 0,2.
- **Sessão diária:** teto de 40% para revisões; sobra de revisão volta ao ciclo; dia com 0 min.
- **Criação de cartões:** errada → cria; certa + chute/dúvida → cria; certa + certeza → não cria; cartão já existente → não duplica.
- **FSRS:** notas 1–4 atualizam o cartão e geram log; datas com `agora` injetado.
- **Notas de simulado:** Cebraspe (penalidade, item em branco, nota mínima, variante `− 6 × NE / TL`), FCC (pesos 1 e 2, escala 0–10), Fumarc (60% e disciplina zerada).
- **Discursivas:** contagem de linhas versus limites do concurso.
- **IA modo manual:** JSON colado inválido, incompleto ou com campos extras é rejeitado com mensagem clara.

- **Mapa do edital (SPEC-004):** prioridade como soma de `peso_alvo × incidência` dos concursos ativos; domínio sem respostas (0), com respostas e sem cartões (taxa de acerto firme) e com cartões (média das duas partes); urgência; filtros e ordenações do mapa (`src/modules/topics/domain/`). Nos pgTAP, `topic_views.test.sql` cobre os mesmos números do lado do banco (ver abaixo).

## Comandos e onde cada nível roda

| Comando | Nível | Precisa de Docker | Roda no CI |
|---|---|---|---|
| `npm test` | Unitário e componente; inclui `tests/design/` (contraste) | Não | Sim |
| `npm run test:coverage` | Unitário e componente, com limite de 90% em `domain/` | Não | Não |
| `npm run test:int` | Integração (`*.int.test.ts`) | Sim | Não |
| `npm run db:test` | pgTAP | Sim | Não |
| `npm run test:e2e` | E2E (reseta o banco antes) | Sim | Não |
| `npm run backup:verify -- <diretório>` | Ensaio de restauração de um backup no Supabase local (compara contagens com o manifesto) | Sim | Não |
| `npm run db:test:remote` | pgTAP contra o projeto remoto ligado, depois de cada `db:push` | Sim | Não |
| `npm run check:prod` | Checagem sem credenciais contra produção (redirecionamento, cabeçalhos, cadastro desligado, acesso anônimo às 22 tabelas) | Não | Não |

Os scripts de implantação e backup (`scripts/push-migrations.ts`, `backup-db.ts`, `verify-backup.ts`, `check-production.ts`) têm testes unitários no `npm test` (executor de comandos e `fetch` injetados: nenhum toca rede, Docker ou o remoto) e, portanto, rodam no CI. A restauração de `backup:verify` tem teste de integração (`scripts/verify-backup.int.test.ts`) no `npm run test:int`.

**O que roda contra produção:** somente `db:test:remote` (pgTAP em transação com `rollback`, sem deixar dados) e `check:prod` (só leitura, sem credenciais), ambos manuais, depois de cada migração ou implantação. Não há E2E com login real contra produção; o checklist manual de implantação cobre o login real (SPEC-002, `docs/operacao/implantacao.md`).

O que mudou com a SPEC-004: o projeto de testes unitários do Vitest passou a incluir `tests/design/**/*.test.ts` (em `vitest.config.ts`), então `tests/design/contrast.test.ts` roda no `npm test` e no CI, sem Docker. Os demais comandos não mudaram; `npm run db:test` passa a executar também `supabase/tests/topic_views.test.sql`, e `npm run test:e2e` passa a incluir a jornada 8.

Arquivos de teste introduzidos pela SPEC-004:

- `tests/design/contrast.test.ts`: lê `design/tokens.json` e confere, nos temas claro e escuro, que `rule` é igual a `graphite` e que cada par de cor da direção "Folha de prova" atinge 4,5:1 (texto) ou 3:1 (elementos gráficos): item atual da barra lateral, sobretítulo e números, régua, bolhas cheia, meia e vazia, anel de foco, filtro atual, aviso informativo, etiqueta de fase, "Sem respostas", barra de prioridade e o painel do login sobre a textura.
- `supabase/tests/topic_views.test.sql`: pgTAP de `v_topic_priority` (38 linhas, prioridades entre 0 e 1, valores conhecidos do seed, concurso inativo, assunto sem incidência) e de `v_topic_performance` (janela de 60 dias com o limite exato, chute que não conta como firme, em branco, isolamento entre usuários e acesso anônimo vazio).
- `supabase/tests/exam_weights.test.sql` (SPEC-005): pgTAP de `exam_weights` (estrutura, faixa 0 a 1, cascata, gatilho de `updated_at`, RLS e isolamento entre usuários, anônimo), da coluna `settings.target_notice_published` com seu `check`, de `v_topic_priority` com pesos padrão e de que o seed não toca nas linhas do usuário; `rls.test.sql` passa a cobrir 22 tabelas.
- `src/modules/topics/**/*.int.test.ts`: integração do repositório e de `getTopicMap` contra o Supabase local (`npm run test:int`).

O CI (`.github/workflows/ci.yml`) roda `lint`, `typecheck`, `format:check`, `test` e `build` em todo push e pull request. pgTAP, integração e E2E rodam localmente e são exigidos pela Definição de pronto (doc 06) antes de fechar uma tarefa.

## Jornadas E2E críticas

1. Login e acesso negado sem sessão.
2. Responder questão → ver correção → cartão criado em caso de erro.
3. Fila de revisão do dia → avaliar cartão → próximo vencimento atualizado.
4. Plano do dia gerado → iniciar e concluir sessão (planejado × realizado).
5. Simulado completo → nota por disciplina conforme a banca.
6. Discursiva: gerar prompt (modo manual) → colar resposta → nota por critério.
7. Tema claro e escuro; viewport de celular (360 px).
8. Mapa do edital e casca nova (SPEC-004, `tests/e2e/journey-08-topic-map.spec.ts`): navegação para `/topics` com os 38 assuntos; usuário sem respostas (aviso, "Sem respostas") e com respostas (percentual e urgência seguindo o domínio); filtros na URL, inclusive sem JavaScript; estado vazio com "Limpar filtros"; matriz de incidência e detalhe do assunto (`/topics/pdpj_stack`, `/topics/seg_infra`) e o 404 em português; teclado; axe sem violações sérias nos dois temas; celular (sem rolagem lateral, alvos de 44 px); barra lateral a partir de 1024 px; login redesenhado. Usa o objeto de página `tests/e2e/pages/TopicMapPage.ts` e respostas criadas por `tests/e2e/data/answers.ts`.
9. Configurações e pesos dos concursos (SPEC-005, `tests/e2e/journey-09-settings.spec.ts`, com usuário descartável): tabela de pesos padrão, total ao vivo, erro de soma, "Ajustar os demais e salvar", efeito na prioridade do mapa e do detalhe, restaurar padrão com confirmação, concurso-alvo e edital publicado, aviso de pesos fechado que volta só se os pesos mudarem, alternador de tema só em Aparência, teclado, axe nos dois temas e celular de 360 px.

## Regras de escrita dos testes

- Nome do teste descreve a regra: `"não cria cartão quando acerta com certeza"`.
- Padrão Arrange–Act–Assert; uma regra por teste.
- Sem `sleep`/`waitForTimeout`; no Playwright, usar localizadores por papel e rótulo (`getByRole`, `getByLabel`).
- Dados de teste criados por fábricas (`tests/factories/`), nunca dependentes da ordem de execução.
- E2E começa com banco limpo (`supabase db reset`) e usuário de teste criado por script.
- Teste instável não é desligado em silêncio: corrige-se ou abre-se pendência no `CHANGELOG.md`.
