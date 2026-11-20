# Histórico de mudanças — Gabarita

Formato inspirado em [Keep a Changelog](https://keepachangelog.com/pt-BR/). Datas no formato AAAA-MM-DD.

## [Não lançado]

### Adicionado
- Configurações e pesos dos concursos (SPEC-005, ADR-011, ADR-012, ADR-013): rota `/settings` em seções (`PageSection`) com o peso de cada concurso na prioridade dos assuntos (tabela em porcentagem somando 100%, "Ajustar os demais", "Restaurar padrão" com confirmação), concurso-alvo e "edital publicado", e Aparência (único lugar do alternador de tema); a prioridade do mapa e do detalhe usa o peso efetivo (`applyExamWeights`, `rebalanceWeights`, `validateWeightSet`, `weightsFingerprint` em `src/modules/topics/domain/exam-weights.ts`; `validateStudyTarget` em `settings`). O aviso de pesos fechado fica fechado por navegador (cookie `gb-weights-notice`) até os pesos mudarem. Componentes `PageSection`, `CheckboxField`, `SelectField`, `Field` com sufixo, `DismissibleNotice` e `secondaryNavigation` no `Shell`.
- Migração `20261119000000_exam_weights_and_target_notice.sql`: tabela `exam_weights` (RLS de dono, `check` de faixa 0 a 1, gatilho de `updated_at`) e coluna `settings.target_notice_published` com `check` que exige concurso-alvo (SPEC-005).
- Testes da SPEC-005: `supabase/tests/exam_weights.test.sql` (pgTAP; `rls.test.sql` passa a cobrir 22 tabelas), unitários e de integração de pesos e concurso-alvo, e a jornada E2E 9 (`tests/e2e/journey-09-settings.spec.ts`).
- Mapa do edital (SPEC-004): módulo `topics` com as rotas `/topics` (lista e matriz de incidência, filtros por visão, grupo, perfil e ordem na URL, funcionando sem JavaScript) e `/topics/[topicId]` (subtópicos, contribuição de cada concurso e domínio); domínio puro em `src/modules/topics/domain/` (prioridade, domínio, urgência); leitores de servidor `getTopicMap` e `getTopicDetail` em `actions/`, sem `'use server'` (P-9).
- Direção visual "Folha de prova" (ADR-010, SPEC-004): barra lateral numerada com marcas de sincronismo, cabeçalho de página com sobretítulo e régua, login em duas colunas; tokens `rule`, `eyebrow`, `space-5`, `space-10` e `space-12`; componentes `Bubble`, `MasteryMeter`, `Tag`, `EmptyState`, `PriorityValue` e `FilterGroup`, `Notice` com `kind="info"`; classes `gb-` correspondentes em `design/components.css`.
- Testes da SPEC-004: `supabase/tests/topic_views.test.sql` (pgTAP de `v_topic_priority` e `v_topic_performance`), `tests/design/contrast.test.ts` (contraste dos pares de cor nos dois temas), integração de `topics` e a jornada E2E 8 (`tests/e2e/journey-08-topic-map.spec.ts`).
- Implantação (SPEC-002): `vercel.json` (região `gru1`, implantação só da `main`), cabeçalhos de segurança e `noindex` em `next.config.ts`, scripts `db:link`, `db:push` (guardas de migração e confirmação pelo identificador do projeto), `db:test:remote`, `backup`, `backup:verify` e `check:prod`, com testes unitários e de integração.
- Runbooks em `docs/operacao/`: `implantacao.md` e `backup-e-restauracao.md` (SPEC-002). ADR-008 (implantação e backup manuais pela máquina local).
- Aplicação Next.js 16 (App Router, React 19.2, TypeScript strict com `noUncheckedIndexedAccess`), Node 26 fixado em `.nvmrc`, estrutura de módulos do doc 06 (SPEC-001).
- Ferramentas do ADR-006: ESLint com regras de dependência entre camadas (testadas em `tests/lint/`), Prettier, Vitest (unitário, componente e integração, cobertura ≥ 90% em `domain/`), Playwright desktop e celular 360 px com axe (SPEC-001).
- CI no GitHub Actions (`.github/workflows/ci.yml`): lint, typecheck, formatação, testes e build em push e pull request, ações fixadas por SHA (SPEC-001).
- Supabase local (`supabase/config.toml`, cadastro desativado), clientes de servidor e renovação de sessão com `@supabase/ssr`, validação das variáveis públicas (SPEC-001).
- Login com e-mail e senha em `/login`, proteção de rotas no `src/proxy.ts`, retorno seguro por `?next=`, logout, criação da linha de `settings` no primeiro login (SPEC-001).
- Tema Sistema/Claro/Escuro salvo em `settings.theme` e sincronizado entre aparelhos, com cache no cookie `gb-theme` e sincronia no proxy, sem piscar no carregamento (SPEC-001).
- Design system no código: `tokens.css` gerado de `design/tokens.json` (`npm run tokens`), fontes por `next/font`, componentes `Button`, `Field`, `Notice` e `Shell`, casca do app, páginas 404 e de erro (SPEC-001).
- Script `npm run e2e:user` que recria o usuário local de teste, só contra o Supabase local (SPEC-001).
- ADR-007 (código em inglês) e `docs/08-glossario.md` com a tradução fixa dos termos.
- Migração `20261117000000_settings_theme.sql`: enum `theme_preference` e coluna `settings.theme` (padrão `system`), para o tema sincronizado entre aparelhos (SPEC-001).
- Testes pgTAP em `supabase/tests/`: `rls.test.sql` (RLS das 21 tabelas e `security_invoker` das visões, CA-6) e `settings_theme.test.sql` (CA-33) (SPEC-001).
- Teste pgTAP `schema_constraints.test.sql`: valores dos enums, padrão de `settings.hours_per_day`, restrições `check` e formato do seed (ADR-007).

### Alterado
- Casca e cabeçalho (ADR-012, ADR-013, SPEC-005): a barra lateral troca os números dos módulos por ícones, o alternador de tema sai dela e do menu do celular, e o sobretítulo acima do `h1` deixa de existir em todas as páginas. Todos os avisos (`Notice`) ganham o botão de fechar.
- Docs 01, 02, 03, 04, 05, 06, 07 e 08, `docs/operacao/implantacao.md` e `README.md` atualizados para a SPEC-005: 22 tabelas, peso padrão e peso efetivo, `v_topic_priority` como conferência dos pesos padrão, seção de configurações por módulo, jornada 9, `ia_solicitacoes` → `ai_requests` no doc 02.
- Direção visual (SPEC-004, ADR-010): raios `radius-sm/md/lg` de 6/10/16 px para 2/4/6 px; casca com `gb-shell__rail` no lugar de `gb-shell__header`; login sem `gb-login__card`. `Button`, `Field`, `Notice` e o grupo segmentado ficam com cantos mais retos.
- `scripts/generate_seed.py` e `supabase/seed.sql`: o `on conflict` de `topics` regrava categoria, nome, perfil, fase e ordem, e o de `subtopics` regrava a ordem, para a ordenação do mapa valer em banco já semeado (SPEC-004).
- Docs 03, 04, 05, 06, 07 e 08 e `README.md` atualizados: visões testadas em `topic_views.test.sql`, domínio de assunto sem cartões (a retenção média fica de fora da fórmula), direção "Folha de prova", módulo `topics`, leitores de servidor sem `'use server'`, jornada 8 e teste de contraste no `npm test` (SPEC-004).
- Banco em inglês (ADR-007, `docs/08-glossario.md`): migração inicial reescrita como `20261116000000_initial_schema.sql` (tabelas, colunas, enums e valores, visões `v_topic_priority` e `v_topic_performance`, políticas `owner_*`/`authenticated_*`, índices, gatilhos e comentários); `settings.hours_per_day` com chaves `mon`…`sun`. Exceção ao "migração aplicada não se edita": nenhuma migração havia sido aplicada fora do ambiente local.
- Fonte da taxonomia renomeada para `data/seed/court_it_taxonomy_v0.1.json`, com chaves e valores de enum em inglês (textos e ids continuam em português); script renomeado para `scripts/generate_seed.py` e `supabase/seed.sql` regenerado.
- Tipos do banco gerados em `src/shared/supabase/database.types.ts`.
- Taxonomia v0.2 (`data/seed/court_it_taxonomy_v0.2.json`): 14 concursos, 7 bancas (entram Vunesp, FGV e Instituto AOCP), 9 rubricas, 38 assuntos, 218 subtópicos e 532 incidências; chaves e valores de enum em inglês. Discursiva da FGV (TJRJ) tratada como `technical_question`; a da Vunesp (TJSP), que cobra questões dissertativas e estudo de caso na mesma etapa, ganha o tipo próprio `technical_questions_and_case_study` (migração `20261117010000_essay_type_questions_and_case_study.sql`). `scripts/generate_seed.py` passa a ler a v0.2, obtém banca e tipo de cada rubrica dos concursos que a usam e aceita concurso sem discursiva; `supabase/seed.sql` regenerado; contagem de assuntos do `schema_constraints.test.sql` atualizada. Docs 01, 03 e 08 atualizados.
- Gestão de modelos no `CLAUDE.md`: Opus 5.5 para tarefas complexas, Sonnet 5.5 para as simples e repetitivas; campo `model:` nos agentes e na skill `commit`.
- Código, arquivos, classes CSS, tokens, scripts npm, assets de marca e commits em inglês (ADR-007); documentação e textos da interface continuam em português. `CLAUDE.md`, doc 06, skill `commit` e agentes atualizados.
- ADR-006 passa de proposto a aceito (SPEC-001).
- Docs 02, 06, 07, `docs/README.md` e `README.md` atualizados: seção Implantação, regra de migração compatível com o código em produção, senha do banco remoto só na sessão, comandos novos e o que roda contra produção (SPEC-002).
- Docs 03, 05, 06 e 07 atualizados: tema sincronizado, componentes novos, fontes por `next/font`, módulo `auth`, regra de `domain/index.ts`, variável `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, comandos de teste e escopo do CI (SPEC-001).
- Projeto passa a ser desenvolvido no sistema de arquivos do WSL (desempenho).

## [0.3.0] — 2026-11-16

### Adicionado
- Time de agentes do Claude Code em `.claude/agents/`: arquiteto, especialista-banco, especialista-frontend, engenheiro-testes, engenheiro-e2e e revisor-codigo.
- `CLAUDE.md` com o fluxo de desenvolvimento do time.
- `docs/06-padroes-de-codigo.md`, `docs/07-estrategia-de-testes.md` e ADR-006 (proposto): ferramentas de qualidade e testes.
- `docs/specs/`: registro de specs por funcionalidade (modelo, ciclo de vida e índice). Código só começa com spec aprovada.
- Regra de comentários em `docs/06-padroes-de-codigo.md`: só quando importantes e pertinentes, explicando o porquê.
- `.gitignore` e skill `commit` (Conventional Commits em português, com escopo por módulo e referência à spec).

## [0.2.0] — 2026-11-16

### Adicionado
- Identidade visual: logo, símbolo e ícone do app em `public/brand/`.
- Design system: tokens (temas claro e escuro, tipografia, espaços, raios) em `design/tokens.json` e componentes Botao, Alternativa, MedidorDominio e Etiqueta em `design/componentes.css`.
- `docs/05-identidade-visual.md`.

## [0.1.2] — 2026-11-16

### Alterado
- Projeto passa a se chamar **Gabarita**. Repositório renomeado para `gabarita`; README, documentação, migração e script atualizados.

## [0.1.1] — 2026-11-16

### Alterado
- Disponibilidade padrão em `configuracoes.horas_por_dia`: 3 h todos os dias (antes: 2 h em dias úteis, 4 h no sábado, folga no domingo). Alteração feita na migração inicial, que ainda não foi aplicada em nenhum ambiente.
- `docs/04-regras-de-estudo.md`: exemplo de divisão da sessão de 3 h.

## [0.1.0] — 2026-11-16

### Adicionado
- Taxonomia v0.1: 36 assuntos (27 específicos, 9 gerais) e 194 subtópicos, extraídos dos editais TRT-3 2022, TRT-4 2026, TJMG 2022 e TRF-6 2024.
- Matriz de incidência por concurso e fórmula de prioridade com pesos por concurso-alvo.
- Rubricas de discursiva das bancas Fumarc, FCC, IBFC e Cebraspe.
- Migração inicial do banco (21 tabelas, 2 visões, RLS).
- Script `scripts/gerar_seed.py` para gerar a carga inicial.
- Documentação: visão e escopo, arquitetura, modelo de dados, regras de estudo e ADRs 001 a 005.
