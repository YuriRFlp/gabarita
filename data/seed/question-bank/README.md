# Banco de questões – Gabarita

Questões de provas oficiais de concursos para tribunais, transcritas dos cadernos e gabaritos publicados pelas bancas. O banco guarda **só dados**: enunciado, alternativas, gabarito e metadados. Regras de uso (treino, simulado, peso, filtros) ficam fora daqui.

> Uso privado. Os cadernos trazem o aviso de que a divulgação é proibida. Mantenha este diretório fora de repositório público (por exemplo, no `.gitignore`) e não publique o conteúdo.

## Conteúdo (v1.1)

| Prova | Banca | Nível | Formato | Questões | Anuladas | Gabarito |
|---|---|---|---|---|---|---|
| `stj-2024-analista-sistemas` | Cebraspe | analista | certo/errado | 120 | 4 | definitivo |
| `stj-2024-analista-suporte-ti` | Cebraspe | analista | certo/errado | 120 (50 repetidas) | 3 | definitivo |
| `tse-2024-analista-ti` | Cebraspe | analista | certo/errado | 120 | 2 | definitivo |
| `trf6-2024-analista-sistemas` | Cebraspe | analista | certo/errado | 120 | 4 | definitivo |
| `tjmg-2022-analista-ti` | IBFC | analista | múltipla escolha (A–E) | 60 | 7 | definitivo (pós-recurso) |
| `trt3-2022-analista-ti` | Fumarc | analista | múltipla escolha (A–E) | 60 | 0 | **preliminar** |
| `trt4-2015-analista-ti` | FCC | analista | múltipla escolha (A–E) | 60 | 0 | sem indicação (tratado como definitivo) |
| `trt4-2022-tecnico-administrativa` | FCC | técnico | múltipla escolha (A–E) | 60 | 0 | sem indicação (tratado como definitivo) |

Total: 720 questões (670 distintas), 34 textos-base, 9 figuras.

As duas provas do STJ usam o mesmo caderno de Conhecimentos Básicos (itens 1–50). Na prova de Suporte em TI esses itens têm `duplicate_of` apontando para a questão igual da prova de Análise de Sistemas; para treinar sem repetir, ignore as questões com `duplicate_of` preenchido. A prova do TSE é a do concurso unificado da Justiça Eleitoral, que vale também para o TRE-MG.

## Estrutura

```
papers/<id>.json        fonte da verdade: uma prova por arquivo (metadados, textos-base, questões)
schema/exam_paper.schema.json   JSON Schema (draft 2020-12) de cada arquivo em papers/
questions.jsonl         gerado: uma questão por linha, já com os dados da prova (banca, ano, nível...)
stimuli.jsonl           gerado: um texto-base por linha; liga às questões por stimulus_key
index.json              gerado: resumo das provas e totais
assets/                 figuras recortadas dos cadernos (PNG), referenciadas em questions[].figures
tools/                  scripts de extração, configurações por prova e conferência
```

Edite só `papers/*.json`. Os arquivos gerados saem de `python3 tools/scripts/flatten.py .`, que também valida tudo contra o schema.

Para importar no banco de dados, `questions.jsonl` + `stimuli.jsonl` é o caminho mais simples: cada linha vira um registro, sem precisar juntar tabelas para filtrar por banca, ano, nível ou disciplina.

## Campos principais da questão

| Campo | Conteúdo |
|---|---|
| `id` | estável: `<id da prova>-q<número com 3 dígitos>`, ex.: `trf6-2024-analista-sistemas-q051` |
| `level` | `analista` ou `tecnico` (em `questions.jsonl`; nos papers fica na prova) |
| `year`, `exam_board`, `court_id`, `state`, `justice_branch` | ano do edital, banca, tribunal (mesmo id da taxonomia), UF, ramo da Justiça (`federal`, `trabalho`, `estadual`, `eleitoral`, `superior` – este para o STJ) |
| `section` / `subject` | bloco da prova e disciplina como aparece no caderno ou no edital |
| `format` | `multiple_choice` ou `true_false` |
| `stimulus_id` / `stimulus_key` | texto-base compartilhado (texto, código, tabela), quando houver |
| `command` | comando comum a um grupo de questões ("Considere o texto abaixo...", comandos do Cebraspe) |
| `statement` | enunciado; no certo/errado, a afirmação a julgar |
| `options` | alternativas `[{key, text}]`; `null` no certo/errado |
| `answer` | letra; no certo/errado, `C` (certo) ou `E` (errado); `null` se anulada |
| `status` / `status_note` | `valida` ou `anulada`, com a justificativa oficial quando publicada |
| `answer_changed_from` | resposta do gabarito preliminar quando o definitivo mudou (TJMG q43: E → B; no Cebraspe, C → E) |
| `duplicate_of` | id da mesma questão em outra prova do banco (caderno comum a mais de um cargo); `null` nas demais |
| `has_code`, `has_table`, `has_figure`, `figures` | marcadores para filtro; figura com arquivo e descrição textual |
| `topic_ids` | vazio: ligação com `topics` da taxonomia, a fazer |
| `review` | observação sobre trechos reconstruídos manualmente |

Na prova (`papers/<id>.json`) ficam também: cargo e especialidade, caderno e tipo, situação do gabarito, fontes (arquivos e URLs), notas e a discursiva em `essay`: `prompt` (enunciado), `instructions`, `max_score`, `answer_standard` (padrão de resposta definitivo da banca) e `grading_criteria` (quesitos e conceitos). STJ: enunciado, padrão e quesitos dos dois cargos. TSE: só o enunciado (o padrão de resposta não foi obtido).

## Convenções do texto

- Os destaques da banca estão marcados como em Markdown: `**negrito**`, `__sublinhado__`, `*itálico*`, `` `monoespaçado` ``. Importam quando a questão fala em "termo destacado" ou "sublinhado".
- Código aparece em blocos ```` ``` ```` com a linguagem (`sql`, `java`, `python`, `html`).
- Tabelas que estavam no enunciado viraram tabelas Markdown.
- Textos-base: um parágrafo por linha. Nos textos em que a prova cita **linhas** (TRT-4 2015, Português), cada linha do campo corresponde a uma linha impressa. Na crônica do TRT-4 2022, cada linha é um parágrafo numerado.
- Lacunas aparecem como `______`, `...I...` ou **I** em negrito, conforme o caderno.
- Hifens de fim de linha foram removidos; compostos e ênclises foram mantidos (`bate-papo`, `pode-se`).

## Limitações conhecidas

- **TRT-3 2022:** gabarito preliminar; o pós-recurso não foi obtido. Nenhuma questão marcada como anulada.
- **TRT-4:** a prova de analista de TI de 2022 não foi obtida (só os gabaritos do cargo A14). Entraram a prova de analista de TI de 2015 e a de técnico administrativo de 2022, esta para treinar conhecimentos gerais.
- **TRT-4 (FCC):** a página de gabaritos não diz se é preliminar ou definitiva e não marca anulações.
- **TRF-6:** o caderno do Cebraspe não imprime o nome das disciplinas dos conhecimentos gerais; elas foram atribuídas pela sequência dos comandos. A discursiva não foi transcrita.
- **Reconstruções manuais**, conferidas com a imagem do caderno: frações do raciocínio lógico (TRT-4 2015 q17 e q19), códigos com indentação (TRT-3 q36, q37, q38, q47; TRT-4 2015 q47 e textos-base de código), tabelas (TRT-4 2015 q50), estrofes do poema (TRT-4 2022 t01), alternativas da TRT-4 2015 q34.
- **Figuras:** 9 imagens recortadas, cada uma com descrição textual para uso sem a imagem.
- **STJ e TSE:** o caderno não imprime o nome das disciplinas dos Conhecimentos Básicos; elas foram atribuídas pelos comandos (no STJ, por exemplo, "Previdência complementar (Lei 12.618/2012)"). Na parte de TI, a disciplina é "Tecnologia da Informação" em todas as provas.
- **Códigos do TSE e do STJ** foram reconstruídos com a indentação do caderno (TSE q51, q54, q80, q94, q100 e textos-base de Rust, Python, libcurl, GRUB e C#; STJ Suporte q75, q79, q96; STJ Sistemas q67). Linhas de código quebradas só pela diagramação foram unidas. A TSE q104 teve palavras fora de ordem na extração e foi reescrita conforme o caderno.
- **Datas de aplicação:** foram confirmadas as do TJMG (04/12/2022), TRF-6 (19/01/2025), STJ (01/12/2024) e TSE (08/12/2024); as demais estão `null`.

## Conferência feita

- Validação de todos os arquivos contra o schema.
- Gabaritos lidos diretamente dos PDFs oficiais (sem digitação); anulações e alterações cruzadas com o gabarito preliminar quando havia.
- Fidelidade: cada enunciado, alternativa e texto-base foi procurado no texto do PDF de origem (`tools/scripts/check_fidelity.py`). TRF-6 e TJMG: 100% encontrados. TRT-3 e TRT-4: os trechos não encontrados são exatamente as reconstruções manuais listadas acima. STJ e TSE: 100% encontrados, inclusive os trechos de código reconstruídos.

## Próximos passos sugeridos (a decidir no Claude Code)

1. Preencher `topic_ids` com os assuntos da taxonomia.
2. Camada de explicações separada (`explanations/<id>.json`, ligada por `id` da questão, com `source: "ia"` e `reviewed: false`), sem misturar com os dados oficiais.
3. Novas provas: TST 2023 (técnico de programação), TRT-4 2022 analista de TI, padrão de resposta da discursiva do TSE, edições anteriores dos alvos de MG.

## Ferramentas (`tools/`)

- `scripts/layout.py`: extrai o texto do PDF em ordem de leitura (colunas, recuo de parágrafo, destaques).
- `scripts/parse_cebraspe.py` e `scripts/build_cebraspe.py`: provas de certo/errado.
- `scripts/parse_mc.py` e `scripts/build_mc.py`: provas de múltipla escolha.
- `scripts/keys.py`: leitura dos gabaritos; `scripts/textutil.py`: reconstrução de texto.
- `scripts/mono_block.py`: reconstrói a indentação de trechos em fonte monoespaçada a partir das coordenadas do PDF.
- `scripts/check_fidelity.py`: conferência contra o PDF; `scripts/flatten.py`: arquivos gerados.
- `config/`: decisões de extração de cada prova (faixas de disciplinas, textos-base, figuras, correções manuais). Os caminhos de arquivo nesses configs são do ambiente onde o banco foi gerado; ajuste-os antes de rodar de novo.

Requer Python 3, `pdfplumber`, `jsonschema` e `poppler-utils` (`pdftotext`, `pdftoppm`).
