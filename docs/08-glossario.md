# 08 — Glossário PT → EN

Tradução fixa dos termos usados no código, no banco e no design system (ADR-007). A documentação continua em português; os identificadores seguem esta tabela. Termo novo entra aqui antes de entrar no código.

## Domínio

| Português | Inglês (singular / tabela) | Observação |
|---|---|---|
| assunto | topic / `topics` | |
| subtópico | subtopic / `subtopics` | |
| incidência | incidence / `incidences` | Valor 0, 0,5 ou 1 por assunto × concurso |
| prioridade | priority | |
| domínio (de um assunto) | mastery | Não confundir com a camada `domain/` |
| urgência | urgency | |
| banca | exam board / `exam_boards` | |
| concurso (edital analisado) | exam / `exams` | |
| edital | notice | Fases `pre_notice` e `post_notice` |
| prova (de origem de questões) | paper / `papers` | |
| questão | question / `questions` | |
| alternativa | option | |
| gabarito | answer key (`answer_key`) | Valores `A`–`E`, `C`/`E` são dados da prova e não mudam |
| enunciado | statement | |
| texto-base | base text | |
| resposta | answer / `answers` | |
| confiança (chute, dúvida, certeza) | confidence (`guess`, `doubt`, `certain`) | |
| cartão | card / `cards` | |
| revisão (log FSRS) | review log / `review_logs` | Módulo de revisão: `review` |
| fila de revisão | review queue | |
| conceito | concept | |
| frente / verso | front / back | |
| material, resumo, anotação | material / `materials`, summary, note | |
| ciclo, etapa | cycle, stage | |
| cronograma, item do cronograma | schedule, schedule item / `schedule_items` | |
| sessão de estudo | study session / `study_sessions` | |
| simulado | mock exam / `mock_exams` | |
| disciplina (de simulado) | subject | |
| discursiva | essay / `essays` | |
| tema de discursiva | essay prompt / `essay_prompts` | |
| rubrica | rubric / `rubrics` | |
| nota, nota por critério | score, scores | |
| configurações | settings / `settings` | Uma linha por usuário |
| preferência de tema (sistema, claro, escuro) | theme preference (`system`, `light`, `dark`) | |
| modo de IA (desligado, manual, api) | AI mode (`off`, `manual`, `api`) | |
| solicitação de IA | AI request / `ai_requests` | |
| cota de infraestrutura | infra quota | |
| retenção desejada | desired retention | |
| peso do concurso (do usuário) | exam weight / `exam_weights` | Quanto o concurso pesa na prioridade; uma linha por usuário e concurso (SPEC-005, ADR-011) |
| peso padrão | default weight | `exams.target_weight`, regravado pelo seed |
| peso efetivo | effective weight | O que entra na prioridade: o peso padrão, ou o do usuário no modo personalizado (concurso ativo sem linha pesa 0) |
| pesos personalizados | custom weights | `mode: 'custom'` de `ExamWeightsSummary`; `'default'` quando não há linhas em `exam_weights` |
| restaurar padrão | restore defaults | Apaga as linhas de `exam_weights` (`restoreDefaultWeights`) |
| ajustar os demais (redistribuir) | rebalance | `rebalanceWeights`: mantém os pesos alterados e escala os outros até somar 100% |
| edital do concurso-alvo publicado | `target_notice_published` | Coluna de `settings`; exige concurso-alvo (`target_exam_id`) |
| impressão digital dos pesos | `weightsFingerprint` | Identidade curta de um conjunto de pesos; mantém fechado o aviso já dispensado |
| mapa do edital | topic map | Tela e módulo `topics` (rotas `/topics`); na interface, "Mapa do edital" (SPEC-004) |
| matriz de incidência | incidence matrix | Assuntos × concursos (SPEC-004); componente `IncidenceMatrix` |
| contribuição (de um concurso para a prioridade) | contribution | peso_alvo × incidência (SPEC-004) |
| taxa de acerto firme | firm correct rate | `firm_correct` / `answered` (SPEC-004) |
| retenção média | average retention | Média da retrievability dos cartões do assunto (SPEC-004); `null` quando o assunto não tem cartões |

## Banco

### Tabelas e visões
| Antes | Depois |
|---|---|
| `bancas` | `exam_boards` |
| `rubricas` | `rubrics` |
| `concursos` | `exams` |
| `assuntos` | `topics` |
| `subtopicos` | `subtopics` |
| `incidencias` | `incidences` |
| `materiais` | `materials` |
| `provas` | `papers` |
| `questoes` | `questions` |
| `questao_assuntos` | `question_topics` |
| `configuracoes` | `settings` |
| (nova, SPEC-005) | `exam_weights` |
| `sessoes_estudo` | `study_sessions` |
| `itens_cronograma` | `schedule_items` |
| `simulados` | `mock_exams` |
| `simulado_questoes` | `mock_exam_questions` |
| `respostas` | `answers` |
| `cartoes` | `cards` |
| `revisoes` | `review_logs` |
| `temas_discursiva` | `essay_prompts` |
| `discursivas` | `essays` |
| `ia_solicitacoes` | `ai_requests` |
| `v_prioridade_assunto` | `v_topic_priority` |
| `v_desempenho_assunto` | `v_topic_performance` |

Políticas: `dono_<tabela>` → `owner_<table>`; `autenticado_<tabela>` → `authenticated_<table>`. Índices e gatilhos seguem o nome novo da tabela.

### Enums
| Antes | Depois | Valores |
|---|---|---|
| `grupo_assunto` | `topic_category` | `especificos`→`specific`, `gerais`→`general` |
| `perfil_assunto` | `topic_profile` | `sistemas`→`systems`, `infra`, `comum`→`common` |
| `fase_estudo` | `study_phase` | `pre_edital`→`pre_notice`, `pos_edital`→`post_notice` |
| `formato_questao` | `question_format` | `multipla_escolha`→`multiple_choice`, `certo_errado`→`true_false` |
| `origem_conteudo` | `content_source` | `prova_real`→`past_paper`, `ia_manual`→`ai_manual`, `ia_api`→`ai_api`, `usuario`→`user`, `oficial`→`official` |
| `nivel_confianca` | `confidence_level` | `chute`→`guess`, `duvida`→`doubt`, `certeza`→`certain` |
| `tipo_material` | `material_type` | `resumo`→`summary`, `link`, `anotacao`→`note` |
| `tipo_cartao` | `card_type` | `questao`→`question`, `conceito`→`concept` |
| `tipo_sessao` | `session_type` | `ciclo`→`cycle`, `revisao`→`review`, `simulado`→`mock_exam`, `discursiva`→`essay` |
| `etapa_ciclo` | `cycle_stage` | `leitura`→`reading`, `questoes`→`questions`, `revisao`→`review` |
| `status_item` | `item_status` | `pendente`→`pending`, `concluido`→`done`, `pulado`→`skipped` |
| `tipo_discursiva` | `essay_type` | `redacao_tema_geral`→`general_essay`, `estudo_de_caso_tecnico`→`technical_case_study`, `questao_tecnica`→`technical_question`, `questoes_dissertativas_e_estudo_de_caso`→`technical_questions_and_case_study` |
| `modo_ia` | `ai_mode` | `desligado`→`off`, `manual`, `api` |
| `tipo_solicitacao_ia` | `ai_request_type` | `resumo`→`summary`, `questoes`→`questions`, `correcao_discursiva`→`essay_grading`, `classificacao`→`classification`, `cartoes`→`cards` |
| `status_solicitacao_ia` | `ai_request_status` | `aguardando_resposta`→`awaiting_response`, `importada`→`imported`, `descartada`→`discarded` |
| `preferencia_tema` | `theme_preference` | `sistema`→`system`, `claro`→`light`, `escuro`→`dark` |

### Colunas
Colunas com o mesmo nome em várias tabelas usam sempre a mesma tradução. `id`, `user_id`, `url`, `prompt`, `status` e as colunas FSRS (`due`, `stability`…) não mudam.

| Antes | Depois | | Antes | Depois |
|---|---|---|---|---|
| `nome` | `name` | | `tipo` | `type` |
| `ordem` | `sort_order` | | `grupo` | `category` |
| `perfil` | `profile` | | `fase` | `phase` |
| `valor` | `value` | | `ano` | `year` |
| `tribunal` | `court` | | `cargo` | `position` |
| `banca_id` | `exam_board_id` | | `concurso_id` | `exam_id` |
| `assunto_id` | `topic_id` | | `subtopico_id` | `subtopic_id` |
| `questao_id` | `question_id` | | `prova_id` | `paper_id` |
| `rubrica_id` | `rubric_id` | | `cartao_id` | `card_id` |
| `simulado_id` | `mock_exam_id` | | `sessao_id` | `session_id` |
| `tema_id` | `prompt_id` | | `formato_padrao` | `default_format` |
| `penalidade_erro` | `wrong_answer_penalty` | | `definicao` | `definition` |
| `duracao_min` | `duration_min` | | `objetiva` | `objective` |
| `discursiva` | `essay` | | `peso_alvo` | `target_weight` |
| `ativo` | `active` | | `titulo` | `title` |
| `conteudo_md` | `content_md` | | `origem` | `source` |
| `verificado` | `verified` | | `versao` | `version` |
| `orgao` | `agency` | | `fonte_url` | `source_url` |
| `numero` | `number` | | `formato` | `format` |
| `texto_base` | `base_text` | | `enunciado` | `statement` |
| `alternativas` | `options` | | `gabarito` | `answer_key` |
| `comentario_md` | `commentary_md` | | `anulada` | `annulled` |
| `hash_conteudo` | `content_hash` | | `concurso_alvo` | `target_exam_id` |
| `horas_por_dia` | `hours_per_day` (chaves `mon`…`sun`) | | `cota_infra_min_semana` | `infra_quota_min_per_week` |
| `novos_cartoes_por_dia` | `new_cards_per_day` | | `retencao_desejada` | `desired_retention` |
| `modo_ia` | `ai_mode` | | `tema` | `theme` |
| `etapa` | `stage` | | `minutos_planejados` | `planned_minutes` |
| `inicio` / `fim` | `started_at` / `ended_at` | | `data` | `date` |
| `minutos` | `minutes` | | `gerado_em` | `generated_at` |
| `limite_min` | `time_limit_min` | | `iniciado_em` / `finalizado_em` | `started_at` / `finished_at` |
| `resultado` | `result` | | `aprovado` | `passed` |
| `disciplina` | `subject` | | `resposta` | `answer` |
| `correta` | `correct` | | `confianca` | `confidence` |
| `tempo_seg` | `time_sec` | | `respondida_em` | `answered_at` |
| `frente` / `verso` | `front` / `back` | | `suspenso` | `suspended` |
| `revisado_em` | `reviewed_at` | | `textos_apoio` | `support_texts` |
| `padrao_resposta_md` | `model_answer_md` | | `texto` | `text` |
| `linhas` | `lines` | | `notas` | `scores` |
| `nota_total` | `total_score` | | `feedback_md` | `feedback_md` |
| `escrita_em` / `corrigida_em` | `written_at` / `graded_at` | | `modo` | `mode` |
| `referencia` | `reference` | | `resposta_bruta` | `raw_response` |
| `importada_em` | `imported_at` | | `prioridade` (visão) | `priority` |
| `respondidas` / `acertos_firmes` / `taxa_dominio` (visão) | `answered` / `firm_correct` / `mastery_rate` | | | |

### Chaves do JSON de origem (`data/seed/`) e das colunas jsonb
Chaves que já constam da tabela de colunas (`nome`, `tipo`, `grupo`, `perfil`, `fase`, `ano`, `tribunal`, `cargo`, `objetiva`, `discursiva`, `formato`, `alternativas`, `linhas`, `versao`, `gerado_em`→`generated_at`, `subtopicos`, `rubricas`) usam a mesma tradução. Valores de enum dentro do JSON (`grupo`, `perfil`, `fase`, `formato`, `tipo` da discursiva) usam os valores em inglês da tabela de enums. Continuam como estão, por serem dados: ids de concurso (`trt3`), de rubrica (`fumarc_redacao`), de critério (`AI`, `recorte`), as chaves da escala de incidência (`1`, `0.5`, `0`), os símbolos da fórmula Cebraspe (`NC`, `NE`, `TL`, `NC_max`) e as chaves de disciplina da distribuição (`portugues`, `informatica`, `legislacao`, `nocoes_direito`, `ingles`, `raciocinio_logico` e as da v0.2, como `direitos_humanos` e `legislacao_pjsc`), exceto `especificos`/`gerais`, que são o enum `topic_category` (`specific`/`general`).

| Antes | Depois | | Antes | Depois |
|---|---|---|---|---|
| `concursos` (lista) | `exams` | | `taxonomia` | `taxonomy` |
| `banca` (nome da banca) | `exam_board` | | `duracao_h` | `duration_h` |
| `escala_incidencia` | `incidence_scale` | | `pesos_alvo` | `target_weights` |
| `formula_prioridade` | `priority_formula` | | `observacoes` | `notes` |
| `distribuicao` | `distribution` | | `aprovacao` | `passing_rule` |
| `pesos` | `weights` | | `itens` | `items` |
| `pontuacao` (`acerto`, `erro`, `branco`) | `scoring` (`correct`, `wrong`, `blank`) | | `minimos` / `minimo` | `minimums` / `minimum` |
| `pontos` | `points` | | `rubrica` (dentro de `essay`) | `rubric` |
| `criterios` | `criteria` | | `faixas` (`ruim`, `regular`, `bom`, `muito_bom`) | `bands` (`poor`, `fair`, `good`, `very_good`) |
| `desconto_por_erro` | `deduction_per_error` | | `zera_se` | `zeroed_if` |
| `legenda` | `legend` | | `variante_tecnica` (`uso`) | `technical_variant` (`usage`) |
| `incidencia` (por assunto) | `incidence` | | `prioridade` (por assunto) | `priority` |
| `letra` / `texto` (itens de `questions.options`) | `letter` / `text` | | `subtopico_id` (em `ai_requests.reference`) | `subtopic_id` |
| `faixas_prioridade` (`descricao`, `peso_total`) | `priority_tiers` (`description`, `total_weight`) | | `edital` | `notice` |
| `pontuacao_maxima` | `max_score` | | `observacao` | `note` |
| `distribuicao_detalhada` | `detailed_distribution` | | `questoes` / `estudos_de_caso` (na discursiva) | `questions` / `case_studies` |
| `tema` (assunto cobrado na discursiva) | `subject` | | `titulos` (prova de títulos) | `credentials` |
| `linhas_por` / `por` (valor `questao`) | `lines_per` / `per` (valor `question`) | | `quantidade` | `quantity` |
| `aspectos_avaliados` | `assessed_aspects` | | `elimina_se` / `penaliza` | `eliminated_if` / `penalized_if` |
| `limite_linhas` | `line_limit` | | | |

## Código

| Português | Inglês |
|---|---|
| `src/compartilhado/` (`ui`, `supabase`, `utilitarios`) | `src/shared/` (`ui`, `supabase`, `utils`) |
| `src/modulos/<modulo>/` | `src/modules/<module>/` |
| camadas `dominio/`, `dados/`, `acoes/`, `componentes/` | `domain/`, `data/`, `actions/`, `components/` |
| módulos `autenticacao`, `configuracoes`, `questoes`, `revisao`, `cronograma`, `simulados`, `discursivas`, `materiais`, `ia` | `auth`, `settings`, `questions`, `review`, `schedule`, `mock-exams`, `essays`, `materials`, `ai` |
| rotas `/entrar` | `/login` |
| componentes `Botao`, `Campo`, `Aviso`, `Casca`, `Alternativa`, `MedidorDominio`, `Etiqueta` | `Button`, `Field`, `Notice`, `Shell`, `Option`, `MasteryMeter`, `Tag` |
| `FormularioEntrar`, `BotaoSair`, `AlternadorTema` | `LoginForm`, `LogoutButton`, `ThemeToggle` |
| cookie `gb-tema` | `gb-theme` |
| (novo, SPEC-005) cookie do aviso de pesos fechado | `gb-weights-notice` |
| `data-theme="claro"` / `"escuro"` | `data-theme="light"` / `"dark"` |

## Design system

| Tokens antes | Depois | | Antes | Depois |
|---|---|---|---|---|
| `papel`, `papel-2` | `paper`, `paper-2` | | `borda`, `borda-controle` | `border`, `control-border` |
| `grafite`, `grafite-suave` | `graphite`, `graphite-soft` | | `tinta`, `tinta-forte`, `tinta-clara` | `ink`, `ink-strong`, `ink-light` |
| `texto-sobre-tinta` | `on-ink` | | `grade`, `grade-clara` | `grid`, `grid-light` |
| `marca-texto`, `texto-sobre-marca` | `highlighter`, `on-highlighter` | | `acerto`, `acerto-fundo` | `correct`, `correct-bg` |
| `erro`, `erro-vivo`, `erro-fundo` | `error`, `error-vivid`, `error-bg` | | `espaco-N` | `space-N` |
| `raio-sm/md/lg`, `raio-bolha` | `radius-sm/md/lg`, `radius-bubble` | | `sombra-foco` | `focus-shadow` |
| famílias `display`, `texto`, `codigo` | `display`, `text`, `code` | | temas `claro`, `escuro` | `light`, `dark` |

| Classes antes | Depois |
|---|---|
| `gb-raiz` | `gb-root` |
| `gb-botao` (`--primario`, `--secundario`, `--texto`) | `gb-button` (`--primary`, `--secondary`, `--text`) |
| `gb-bolha` (`--marcada`, `--pequena`) | `gb-bubble` (`--filled`, `--small`) |
| `gb-alternativa` (`--correta`, `--errada`, `__texto`, `__status`) | `gb-option` (`--correct`, `--wrong`, `__text`, `__status`) |
| `gb-dominio` (`__bolhas`, `.cheia`) | `gb-mastery` (`__bubbles`, `.filled`) |
| `gb-etiqueta` (`--nova`, `--vencida`) | `gb-tag` (`--new`, `--overdue`) |
| `gb-campo` (`__rotulo`, `__entrada`, `__erro`) | `gb-field` (`__label`, `__input`, `__error`) |
| `gb-aviso` (`--erro`, `--sucesso`) | `gb-notice` (`--error`, `--success`) |
| `gb-casca` (`__pular`, `__cabecalho`, `__logo`, `__menu-botao`, `__menu`, `--aberto`, `__lista`, `__link`, `__acoes`, `__conteudo`) | `gb-shell` (`__skip`, `__rail`, `__timing-marks`, `__logo`, `__menu-button`, `__menu`, `__menu--open`, `__list`, `__link`, `__actions`, `__content`); o antigo `__cabecalho` virou `__rail` com a SPEC-004 (ADR-010) |
| `gb-segmentado` (`__opcao`), `gb-alternador-tema` | `gb-segmented` (`__option`), `gb-theme-toggle` |
| `gb-formulario`, `gb-entrar` (`__cartao`), `gb-pagina-erro` | `gb-form`, `gb-login` (`__panel`, `__promise`, `__sheet-rows`, `__row-number`, `__row-bubbles`, `__form`; o antigo `__cartao` deixou de existir com a SPEC-004), `gb-error-page` |
| `gb-logo--tema-claro`, `gb-logo--tema-escuro`, `gb-visualmente-oculto` | `gb-logo--light-theme`, `gb-logo--dark-theme`, `gb-visually-hidden` |
| `design/componentes.css` | `design/components.css` |

Termos novos da direção visual "Folha de prova" e do mapa do edital (SPEC-004 e ADR-010; não há nome anterior em português no código):

| Português | Inglês |
|---|---|
| régua (separador forte) | token `rule` |
| rótulo curto (caixa alta) | estilo `eyebrow`; classe `gb-eyebrow` (avulso). Substitui "sobretítulo", que deixou de existir (ADR-013) |
| cabeçalho de página | `gb-page-header` (`__title`, `__meta`) |
| barra lateral (itens com ícone, sem número) | `gb-shell__rail` |
| marcas de sincronismo | `gb-timing-marks` (base); `gb-shell__timing-marks` (posição na barra lateral) |
| textura de folha | `gb-sheet-texture` |
| painel de marca, promessa, linhas da folha (login) | `gb-login__panel`, `__promise`, `__sheet-rows`, `__row-number`, `__row-bubbles`, `__form` |
| bolha (cheia, meia, vazia) | `Bubble` (`fill`: `filled`, `half`, `empty`; `size`: `regular`, `small`); classes `gb-bubble--filled`, `gb-bubble--half`, `gb-bubble--small` |
| medidor de domínio | `MasteryMeter`; classes `gb-mastery`, `gb-mastery__bubbles` |
| etiqueta de fase | `Tag` (`variant`: `default`, `new`, `overdue`, `phase`); classe `gb-tag--phase` |
| aviso informativo | `Notice` com `kind="info"`; classe `gb-notice--info` |
| seção de página (Configurações) | `PageSection`; classes `gb-page-section`, `__header`, `__title`, `__description`, `__body`, `__block-title` |
| navegação secundária da barra lateral | `secondaryNavigation` (prop de `Shell`; classes `gb-shell__secondary`, `__secondary-link`) |
| estado vazio | `EmptyState`; classes `gb-empty-state`, `__title`, `__body` |
| grupo de filtros | `FilterGroup`; classes `gb-filter-group`, `gb-filter-group__label` (as opções reutilizam `gb-segmented`) |
| valor de prioridade | `PriorityValue`; classes `gb-priority`, `__bar`, `__fill` |
| matriz de incidência (estilos) | `gb-matrix-block`, `gb-matrix-legend`, `gb-matrix` (`__table`, `__caption`, `__corner`, `__exam`, `__weight`, `__topic`, `__cell`) |
| mapa do edital (estilos) | `gb-topic-map` (`__count`), `gb-topic-filters`, `gb-topic-list` (`__name`, `__count`, `__tags`), `gb-topic-detail__*`, `gb-subtopics`, `gb-contributions`, `gb-detail-mastery`, `gb-back-link` |

## Scripts e arquivos

| Antes | Depois |
|---|---|
| `public/brand/gabarita-logo-branco.svg`, `gabarita-simbolo(-branco).svg`, `gabarita-icone-app(-512).svg/png` | `gabarita-logo-white.svg`, `gabarita-symbol(-white).svg`, `gabarita-app-icon(-512).svg/png` |
| `scripts/gerar_seed.py` | `scripts/generate_seed.py` |
| `scripts/gerar-tokens-css.ts` | `scripts/generate-tokens-css.ts` |
| `scripts/criar-usuario-teste.ts` | `scripts/create-test-user.ts` |
| `data/seed/taxonomia_tribunais_ti_v0.1.json` | `data/seed/court_it_taxonomy_v0.1.json` |
| `supabase/migrations/20261116000000_schema_inicial.sql` | `20261116000000_initial_schema.sql` |
| `supabase/migrations/20261117000000_tema_configuracoes.sql` | `20261117000000_settings_theme.sql` |
| npm `format:verificar`, `test:cobertura`, `db:iniciar`, `db:parar`, `e2e:usuario` | `format:check`, `test:coverage`, `db:start`, `db:stop`, `e2e:user` |
