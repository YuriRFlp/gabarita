# SPEC-006 — Banco de questões

**Status:** rascunho · **Criada:** 2026-11-19 · **Atualizada:** 2026-11-19
**Módulo:** `src/modules/questions`, `src/modules/ai` (extração no modo manual) · **ADRs relacionados:** ADR-002, ADR-004, ADR-005, ADR-007

> **Esqueleto.** Por pedido do dono, esta versão registra só o objetivo, as regras de origem, o schema atual relevante e as perguntas em aberto, com a análise e as recomendações do arquiteto. As outras seções ficam para o rascunho completo.

## 1. Objetivo
Montar o banco de questões do módulo 2 (`docs/01-visao-e-escopo.md` § Módulos do MVP): importar provas reais e completar com questões inéditas, nos formatos múltipla escolha e Certo/Errado, para a prática por assunto no formato de cada banca. O banco alimenta a etapa de questões da sessão diária, o domínio por assunto, os cartões de erro e, depois, os simulados.

## 2. Regras de origem
| Regra | Origem | Interpretação ou esclarecimento |
|---|---|---|
| Módulo 2: importação de provas reais e questões inéditas; múltipla escolha e Certo/Errado; registro de confiança | `docs/01-visao-e-escopo.md` § Módulos do MVP | — |
| Importação automática e em massa de provas fica fora do MVP | `docs/01-visao-e-escopo.md` § Fora do MVP | A importação é manual e assistida, uma prova por vez (§ 8, P2). |
| Risco "banco começa pequeno": importar provas reais aos poucos e completar com inéditas | `docs/01-visao-e-escopo.md` § Riscos conhecidos | Base da ordem de prioridade da P2. |
| Fase pré-edital neutra quanto à banca no TRT-3 | `docs/01-visao-e-escopo.md` § Riscos conhecidos | Afeta o filtro de banca na prática (P1): sem banca definida, o alvo principal não fixa uma banca. |
| `papers` guarda metadados da prova; uma prova pode não pertencer a um concurso-alvo (prova de TI de outro órgão usada para treino) | `docs/03-modelo-de-dados.md` § Conteúdo | Já prevê provas de outros órgãos, mas sem dizer de que tipo de órgão ou área (P1). |
| `questions`: restrição entre formato e gabarito; `content_hash` impede importação duplicada; `base_text` para itens Cebraspe com cenário comum | `docs/03-modelo-de-dados.md` § Conteúdo | — |
| `question_topics`: uma questão pode cobrir mais de um assunto | `docs/03-modelo-de-dados.md` § Conteúdo | — |
| `ai_requests` é a trilha de auditoria do conteúdo gerado por IA (prompt, resposta colada, status) | `docs/03-modelo-de-dados.md` § IA | A extração de provas pelo modo manual também passa por aqui (P2). |
| Tabelas de conteúdo com RLS de acesso total para autenticados enquanto o uso é pessoal | ADR-005; migração inicial § 8 | `papers`, `questions` e `question_topics` são compartilhadas, não têm `user_id`. |
| Sessão diária: leitura e depois questões do assunto da vez | `docs/04-regras-de-estudo.md` § Sessão diária | A seleção das questões do assunto da vez é o ponto da P1. |
| Domínio usa a taxa de acerto firme dos últimos 60 dias; chute não conta | `docs/04-regras-de-estudo.md` § Domínio | Exige gravar a confiança em cada resposta (`answers.confidence`). |
| Cartões criados por erro, chute ou dúvida | `docs/04-regras-de-estudo.md` § Criação automática de cartões | — |
| Simulados sorteiam questões não respondidas nos últimos 30 dias | `docs/04-regras-de-estudo.md` § Simulados | Fora desta spec, mas o banco precisa servir a essa consulta. |
| IA em três modos, manual como padrão, atrás de `AIProvider`; o conteúdo gerado é armazenado e reutilizado | ADR-002; `docs/02-arquitetura.md` § Modos de IA | Extração de prova e geração de inéditas usam o modo manual (P2). |
| JSON colado inválido, incompleto ou com campos extras é rejeitado com mensagem clara | `docs/07-estrategia-de-testes.md` § Casos obrigatórios do domínio | Vale para o JSON da extração e para o das inéditas. |
| Taxonomia em JSON versionado como fonte da verdade; ids de assunto estáveis | ADR-004 | As questões se ligam a `topics.id` e `subtopics.id`. As questões **não** entram no JSON da taxonomia nem no `seed.sql` (decisão do rascunho completo, § 8 P3). |
| Código e banco em inglês, documentação em português | ADR-007; `docs/08-glossario.md` | Módulo `questions`. |

### 2.1 Schema atual relevante (migração `20261116000000_initial_schema.sql`)
Conferido no arquivo, sem mudanças nas migrações posteriores:

- **`exam_boards`**: `id` texto (`fumarc`, `fcc`, `ibfc`, `cebraspe`, `vunesp`, `fgv`, `aocp`, as 7 do seed), `name`, `default_format` (`question_format`) e `wrong_answer_penalty` (Cebraspe = 1).
- **`papers`**: `exam_board_id` (obrigatório), `agency` texto livre (ex.: `'TRT-3'`), `year`, `position`, `exam_id` opcional (só quando a prova é de um concurso cadastrado em `exams`), `source_url`; único em `(exam_board_id, agency, year, position)`. **Não há tipo nem área do órgão.**
- **`questions`**: `paper_id` opcional (`on delete set null`), `number`, `exam_board_id` (obrigatório, também nas inéditas), `format`, `base_text`, `statement`, `options` (JSON `[{"letter","text"}]`), `answer_key` (`'A'..'E'` ou `'C'/'E'`, com `check` de coerência), `commentary_md`, `source` (`content_source`), `annulled` (padrão `false`), `content_hash` único, `created_at`. Índice só em `paper_id`.
- **`question_topics`**: PK `(question_id, topic_id)`, `subtopic_id` opcional; índice em `topic_id`.
- **enum `content_source`**: `past_paper`, `ai_manual`, `ai_api`, `user`, `official`.
- **enum `question_format`**: `multiple_choice`, `true_false`.
- **`ai_requests.type`** (`ai_request_type`): `summary`, `questions`, `essay_grading`, `classification`, `cards`. **Não há um tipo para a extração de prova.**
- **`answers`** já tem `confidence`, `time_sec`, `session_id`, `mock_exam_id`; **`v_topic_performance`** liga respostas a assuntos por `question_topics`.

Lacunas que o rascunho completo precisa resolver, observadas no schema: (a) tipo ou área do órgão das provas de fora dos 14 concursos (P1); (b) data de referência da questão para pesar recência (só as provas têm `year`; as inéditas têm apenas `created_at`); (c) não há índice em `questions (exam_board_id)`; (d) a origem do *comentário* não é registrada (comentário de IA em questão de prova real); (e) não há como guardar o gabarito preliminar junto com o definitivo; (f) falta um valor de `ai_request_type` para a extração.

Observação: `docs/02-arquitetura.md` § Modos de IA ainda cita a tabela como `ia_solicitacoes`; o nome real é `ai_requests`. É ajuste trivial de documentação, fora desta spec.

## 3. Escopo
A detalhar no rascunho completo.

## 4. Critérios de aceite
A detalhar no rascunho completo. Devem incluir, no mínimo, os casos do doc 07 sobre JSON inválido, incompleto ou com campos extras, a duplicata por `content_hash`, a questão anulada fora da prática e a coerência entre formato e gabarito.

## 5. Design técnico
A detalhar no rascunho completo (arquivos por camada, contratos e esquemas Zod, migração, interface).

## 6. Plano de testes
A detalhar no rascunho completo.

## 7. Riscos e alternativas descartadas
A detalhar no rascunho completo. As alternativas para alimentar o banco estão analisadas na § 8, P2.

## 8. Perguntas em aberto

### P1 — Escopo das questões na prática por assunto: banca de qualquer concurso ou só de tribunais? (bloqueante)
Na prática por assunto, usar questões da mesma banca em qualquer concurso, ou só da mesma banca em concursos do mesmo tipo (tribunais)?

**Recomendação do arquiteto (registrada a pedido do dono), em camadas:**

1. **A banca pesa mais que o órgão.** Formato, estilo de enunciado e armadilhas vêm da banca; o conteúdo técnico de TI é o mesmo em qualquer órgão.
2. **Camada 1 (padrão):** assunto + banca, em questões de **tribunais**.
3. **Camada 2 (ampliar, só em assuntos técnicos):** mesma banca, **qualquer órgão que cobre TI** (ex.: questões de banco de dados ou redes da FCC em outro órgão).
4. **Não misturar questões de outras áreas** (fora de TI), mesmo da mesma banca.
5. **Assuntos próprios do tribunal ficam restritos a tribunais.** Na taxonomia atual: `legislacao_mg`, `cnj_normativos`, `pdpj_stack` e `legislacao_tribunal`. O regimento interno entra em `legislacao_tribunal`. A lista exata (ex.: se `contratacoes_ti` também entra) é decisão do dono.
6. **Recência pesa mais nos assuntos que mudam rápido** (ex.: `lgpd`, `ia_ml`, `nuvem_virtualizacao`): questões antigas desses assuntos podem cobrar norma ou tecnologia superada.
7. **Implementar como filtro, não como regra fixa no código:** camada, banca e janela de recência são parâmetros da consulta, com padrões configuráveis, não constantes do domínio.

**Decisão de modelagem que fica para o rascunho completo:** `questions` já tem `exam_board_id` e `paper_id` (opcional), mas falta registrar o **tipo e a área do órgão** das provas de outros órgãos sem transformá-los em concurso-alvo em `exams` (que deve continuar só com os 14 acompanhados). Opções a comparar no rascunho completo: colunas em `papers` (ex.: tipo do órgão e área do cargo) ou uma tabela de referência de órgãos. Se as alternativas forem equilibradas, vira ADR.

Perguntas derivadas para o dono:
- a) Aceita as camadas 1 e 2 como descritas, com a camada 1 como padrão?
- b) Quais assuntos contam como "próprios do tribunal" (lista do item 5)?
- c) Quais assuntos contam como "de mudança rápida" e qual janela de recência usar neles (ex.: últimos N anos)?
- d) Na fase pré-edital do TRT-3, sem banca definida, qual banca o filtro usa para os assuntos de maior peso: todas as bancas dos 14 concursos, ponderadas pelo peso, ou uma escolha manual?
- e) As questões inéditas (sem prova, sem órgão) entram em qual camada?

### P2 — Como alimentar o banco (bloqueante para o escopo)
**Opções avaliadas:**

| Opção | Prós | Contras | Lugar no plano |
|---|---|---|---|
| **A. Importar provas reais públicas com extração assistida pelo modo manual (ADR-002).** O dono passa o PDF da prova e do gabarito ao Claude no chat; o Claude devolve JSON; a plataforma valida com esquema Zod e importa. O JSON traz: metadados da prova (banca, órgão, ano, cargo, link oficial), cada questão (número, texto base, enunciado, alternativas, formato), gabarito oficial (definitivo, após recursos), marca de anulada, assunto(s) e subtópico(s) da taxonomia e comentário. `content_hash` evita duplicata. | Questões reais, no estilo exato da banca; gabarito oficial; custo zero; cabe no MVP; reaproveita o fluxo do modo manual e a trilha `ai_requests`. | Trabalho manual por prova; a extração e a classificação por IA podem errar (exige conferência); PDF escaneado extrai pior; o comentário gerado por IA pode errar. | **1ª prioridade: é a base do banco.** |
| **B. Questões inéditas geradas por IA no modo manual**, com `source = 'ai_manual'`, revisadas antes de entrar na prática. | Cobre lacunas de assunto × banca que as provas reais não cobrem (ex.: assunto novo no edital, banca com poucas provas de TI). | Risco de erro de conteúdo ou gabarito; o estilo é só imitação da banca; não substitui prova real. | **2ª prioridade: só para preencher lacunas** apontadas pela métrica de cobertura. |
| **C. Importação automática em massa** (lote de muitos PDFs, raspagem, API de terceiros). | Volume rápido. | Fora do MVP (`docs/01`); raspagem de sites agregadores esbarra em termos de uso; qualidade difícil de garantir. | **Fora do MVP.** Não raspar sites. |

**Melhor opção recomendada:** A como fonte principal, B só para lacunas, C descartada no MVP.

**Fonte e direitos autorais.** Usar apenas a prova e o gabarito publicados pela banca ou pelo órgão (site oficial). Agregadores de questões têm termos de uso próprios; não copiar deles nem raspar sites. Gravar `papers.source_url` com o link oficial. Com uso pessoal (ADR-005), o banco não é redistribuído. Se um dia virar multiusuário, a questão de redistribuição precisa ser revista antes.

**Ordem de importação sugerida:**
1. Provas de TI dos concursos de maior peso (`docs/01`): TRT-3 (Fumarc 2022), TRF-6 (Cebraspe 2024), TJMG (IBFC 2022).
2. Depois, pelas bancas na ordem do peso somado nos 14 concursos (pesos de `docs/01`): FCC 0,27 em seis concursos (TRT-1, TRT-2, TRT-15, TRT-4, TRT-12, TRF-4), o que faz dela a de maior volume útil depois da Fumarc (0,28, só no TRT-3); em seguida, Cebraspe 0,18, IBFC 0,14, AOCP 0,05, Vunesp 0,04 e FGV 0,04. Se o dono mudar os pesos (SPEC-005), a ordem acompanha.
3. Dentro de cada banca, as provas de tribunal mais recentes primeiro (camada 1).
4. Por último, provas de TI de outros órgãos da mesma banca (camada 2), escolhidas para cobrir os assuntos técnicos com menos questões.
5. O **mapa do edital** (SPEC-004) guia as lacunas: assuntos de maior prioridade com poucas questões na banca relevante vão para o começo da fila. Inéditas (opção B) só entram onde não houver prova real que cubra.

**Unidade de trabalho:** uma prova por lote, ou seja, uma `ai_requests` e uma importação por prova. O lote importa inteiro ou não importa nada (transação), para não deixar prova pela metade.

**Controle de qualidade por lote:**
- Contagem de questões igual à da prova (número esperado informado na importação).
- Números das questões sem lacuna nem repetição.
- Gabarito conferido com o gabarito oficial definitivo; questões anuladas marcadas como `annulled` e fora da prática.
- Validação Zod (formato × gabarito, alternativas A–E, assunto existente na taxonomia) e `content_hash` sem duplicata.
- Amostra manual: o dono confere algumas questões por prova (enunciado, alternativas, assunto) contra o PDF antes de confirmar. O tamanho da amostra é pergunta para o dono.

**Métricas de cobertura:** quantidade de questões por **assunto × banca** (e por camada), destacando os assuntos de maior prioridade com cobertura baixa. É a mesma métrica que define a fila de importação e o uso de inéditas.

Perguntas derivadas para o dono:
- f) Aprova a ordem A → B, com C fora do MVP?
- g) Uma questão de prova real extraída pela IA fica com `source = 'past_paper'` (a origem do conteúdo é a prova) e o comentário gerado pela IA é marcado à parte? Recomendação: sim.
- h) Inéditas precisam de revisão explícita (marca "revisada") antes de entrar na prática, ou basta a origem `ai_manual` visível?
- i) Tamanho da amostra manual por prova (ex.: 5 questões ou 10%)?
- j) Gravar só o gabarito definitivo, ou também o preliminar e as alterações após recurso?
- k) Qual é a meta de cobertura mínima por assunto × banca para considerar uma lacuna resolvida (ex.: N questões)?

### P3 — Onde ficam as questões importadas (a decidir no rascunho completo)
As questões entram direto no banco pela aplicação, ou também em arquivos versionados no repositório (como a taxonomia no ADR-004) para servirem de backup e recarga? O `seed.sql` não deve crescer com questões. Se houver alternativas equilibradas, vira ADR.

## 9. Histórico
| Data | Mudança |
|---|---|
| 2026-11-19 | Criação do esqueleto: objetivo, regras de origem, schema atual e perguntas em aberto (P1 escopo da prática, P2 como alimentar o banco, P3 onde ficam as questões) |
