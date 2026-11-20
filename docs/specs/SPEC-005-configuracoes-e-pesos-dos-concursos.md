# SPEC-005 — Configurações e pesos dos concursos

**Status:** concluida · **Criada:** 2026-11-19 · **Atualizada:** 2026-11-20
**Módulo:** `src/modules/topics` (pesos e efeito na prioridade), `src/modules/settings` (concurso-alvo, edital publicado, página), `src/shared/ui`, `design/` · **ADRs relacionados:** ADR-004, ADR-005, ADR-006, ADR-007, ADR-010; [ADR-011](../adr/ADR-011-valores-do-usuario-sobre-dados-de-referencia.md) (aceito); [ADR-012](../adr/ADR-012-barra-lateral-com-icones-e-tema-so-em-configuracoes.md) (aceito, substitui em parte o ADR-010); [ADR-013](../adr/ADR-013-cabecalho-de-pagina-sem-sobretitulo.md) (aceito, substitui em parte o ADR-010 e o ADR-012)

## 1. Objetivo
Criar a tela de **Configurações**, onde o usuário ajusta o Gabarita aos próprios objetivos, como estrutura extensível em seções. O primeiro caso concreto é o **peso de cada concurso na prioridade dos assuntos**: hoje o TRT-2 está fixo em 5%, mas, se o edital abrir e a prova for em 4 meses, o usuário precisa subir o peso dele e ver a prioridade dos assuntos acompanhar. Na mesma seção entram o **concurso-alvo** e a marcação **"edital publicado"**, que o doc 04 (exceção 1) exige e o schema ainda não tem onde guardar.

## 2. Regras de origem
| Regra | Origem | Interpretação ou esclarecimento |
|---|---|---|
| Prioridade = Σ peso_alvo × incidência, de 0 a 1 | `docs/04-regras-de-estudo.md` § Prioridade; SPEC-004 § 2 | A fórmula não muda. Muda a origem do peso: o **peso efetivo** do usuário (padrão do seed ou valor personalizado, § 5.2) entra em `computeTopicPriority` no lugar de `exams.target_weight`. A aritmética inteira (milésimos × meios) continua exata porque todo peso, padrão ou personalizado, tem no máximo 3 casas decimais (`numeric(4,3)`) e a redistribuição devolve milésimos inteiros. |
| Sem normalização no cálculo da prioridade | SPEC-004 P-10; doc 04 | A **soma de 100% é garantida na gravação** (validação no domínio e na ação), não no cálculo. Se os pesos ativos deixarem de somar 100% por mudança no seed (concurso desativado ou novo), a prioridade não é normalizada e a interface avisa (CA-26, CA-35). |
| Pesos por faixa e "podem ser alterados a qualquer momento" | `docs/01-visao-e-escopo.md` § Concursos-alvo e pesos | O valor do doc 01 e do JSON passa a ser o **peso padrão**. A alteração é feita em Configurações e fica na tabela pessoal `exam_weights` (ADR-011), porque o seed sobrescreve `exams.target_weight` a cada aplicação (SPEC-002 § 2). O texto do doc 01 é atualizado na implementação. |
| Só concursos ativos contam | SPEC-004 § 2 e CA-3; `exams.active` | `active` continua sendo dado de referência (curadoria). Concurso inativo aparece em Configurações sem campo de peso e fora do total (P-4). Para "não quero mais contar este concurso", o usuário dá peso 0. |
| Exceção 1: assuntos `post_notice` só entram quando o concurso-alvo tiver edital publicado | `docs/04-regras-de-estudo.md` § Escolha do assunto da vez; SPEC-004 § 3 (observação para o módulo 4) | Esta spec só **guarda e edita** o concurso-alvo (`settings.target_exam_id`, já existe) e a marcação nova `settings.target_notice_published`. Quem aplica a exceção é o módulo 4; o mapa do edital não muda por causa dela (P-2). |
| Configurações por usuário (concurso-alvo, horas por dia, cota de infra, cartões novos, retenção desejada, modo de IA, tema) | `docs/03-modelo-de-dados.md` § Estudo | Só o tema já tem consumidor. Horas, cota, cartões, retenção e modo de IA ficam fora da tela até a spec do módulo que os usa (P-8). |
| Valores do usuário sobre dados de referência | ADR-011 (aceito); ADR-004; ADR-005 | Tabela pessoal de sobreposição com RLS de dono; "restaurar padrão" apaga as linhas do usuário. |
| Exibição em porcentagem; cálculo de 0 a 1 | SPEC-004 § 5.2 (`formatShare`) | Pesos exibidos e digitados em porcentagem com no máximo uma casa decimal (0,1 ponto = 1 milésimo); domínio, banco e ordenação em 0–1 (ou milésimos inteiros no domínio). |
| Migração aditiva aplicada antes do merge | `docs/06-padroes-de-codigo.md` § Banco; `docs/operacao/implantacao.md` § 3 | Tabela nova e coluna com padrão; nenhum código em produção lê ou quebra com elas (§ 5.6). |
| RLS, pgTAP, tipos gerados, doc 03 | doc 06 § Banco; ADR-005 | `exam_weights` entra no `rls.test.sql` (22 tabelas) e ganha pgTAP próprio. |
| Domínio puro, camadas, resultado tipado, Zod em toda entrada | doc 06 | Formulários validados com Zod; erros esperados como `{ ok: false, error }`. |
| Direção visual "Folha de prova", AA, teclado, 360 px, componente novo em `design/` antes do código | ADR-010; doc 05; doc 06 § Interface | § 5.4. |
| Barra lateral com ícones em vez de números, item atual indicado pelo fundo com contraste de 3:1 com a barra, alternador de tema só em Configurações | ADR-012 (substitui esses três pontos do ADR-010) | CA-19, CA-30, CA-40, CA-41; § 5.4. Substitui a resposta original da P-9. |
| Cabeçalho de página sem sobretítulo: `h1` e régua grossa, com resumo ou metadados à direita onde houver; o estilo `eyebrow` continua para rótulos curtos; a linha de marca do login continua | ADR-013 (substitui o item "Cabeçalho de página" do ADR-010 e a frase do ADR-012 sobre a numeração no sobretítulo) | CA-19, CA-37, CA-42, CA-43; § 5.4. Vale para `/settings`, `/topics`, `/topics/<id>` e `/login`. |
| Código em inglês, interface em português, glossário | ADR-007; doc 08 | Termos novos em § 5.2 (entram no glossário antes do código). |

## 3. Escopo
**Dentro:**
- **Rota `/settings`** ("Configurações"), com seções empilhadas, cada uma com `h2`, descrição curta e âncora: **Concursos e pesos** e **Aparência**. A página é uma composição em `app/` de seções vindas dos módulos donos de cada dado (§ 5.1), de modo que um módulo futuro acrescenta a sua seção sem mexer nas outras.
- **Navegação:** link "Configurações" (ícone Lucide `Settings`) no rodapé da barra lateral e no menu do celular (P-10).
- **Casca (ADR-012):** "Início" e "Mapa do edital" trocam os números ("00", "01") por ícones Lucide (`House`, `Map`, traço 2 px), visíveis em todas as larguras; o item atual (lista principal e "Configurações") mantém o ícone e é indicado pelo fundo `ink` com texto e ícone em `on-ink` (contraste de 3:1 com a barra nos dois temas) e por `aria-current="page"`, sem bolha; o bloco "Aparência" sai do rodapé da barra e do menu do celular.
- **Cabeçalho de página sem sobretítulo (ADR-013):** saem "Módulo 01" (mapa do edital, estados normal e de erro), "Assunto" (detalhe do assunto, estados normal e de erro), "Preferências" (Configurações) e "Acesso" (formulário do login), junto com o `hgroup` que os agrupava ao `h1`; o cabeçalho fica com o `h1`, a régua e, onde houver, o resumo ou as etiquetas à direita. Sai a classe `gb-page-header__eyebrow`. Ficam o estilo `eyebrow` (mesmos valores; mudam só o exemplo e o texto de uso em `design/tokens.json`), a classe `gb-eyebrow` e a linha de marca do login ("Analista Judiciário · Tecnologia da Informação").
- **Pesos dos concursos** em porcentagem somando 100% (P-1): tabela dos concursos ativos com peso padrão e campo de peso em %, total ao vivo, "Salvar", "Ajustar os demais e salvar" (redistribui proporcionalmente os concursos não alterados), "Restaurar padrão" com confirmação; concursos inativos listados à parte, sem campo.
- **Concurso-alvo e edital publicado:** seleção do concurso-alvo (ou "Nenhum") e caixa "O edital do concurso-alvo foi publicado", com a explicação de que o efeito vem no módulo 4 (P-2).
- **Aparência:** o alternador de tema (`ThemeToggle`, sem mudança de comportamento) fica **só** nesta seção; ele sai da barra lateral e do menu do celular (P-9, resposta alterada pelo dono em 2026-11-20; ADR-012).
- **Efeito no mapa do edital:** prioridade, urgência, ordem das colunas da matriz e contribuições passam a usar o peso efetivo do usuário; aviso "Pesos personalizados em uso" no mapa e no detalhe (P-7).
- **Domínio puro** em `src/modules/topics/domain/exam-weights.ts`: aplicar sobreposições, validar o conjunto, redistribuir com o método do maior resto, reconhecer o conjunto padrão.
- **Banco:** migração aditiva com a tabela `exam_weights` (RLS de dono) e a coluna `settings.target_notice_published` (padrão `false`, com `check` que exige concurso-alvo); pgTAP novo; `rls.test.sql` atualizado.
- **Componentes do design system** (em `design/` e no doc 05 antes do código): `PageSection`, sufixo em `Field` (`suffix="%"`), `SelectField`, `CheckboxField`, tabela de pesos e link secundário da barra lateral.
- **Implantação em produção** (§ 5.6): migração aplicada antes do merge com `npm run db:push`, compatível com o código em produção, junto com o seed corrigido da SPEC-004 que ainda não foi aplicado no remoto (P-12).
- **Documentação (entregáveis da implementação):** ADR-011, ADR-012 e ADR-013 (já redigidos e aceitos), glossário, docs 01, 03, 04, 05, 06 (módulos que expõem seção de configurações), 07 (jornada 9 e o pgTAP novo), runbook de implantação (§ 9 "o seed é reaplicado a cada push?" respondido; checklist do CA-15 da SPEC-002 com o tema escolhido em Configurações), `README.md` e `CHANGELOG.md` citando a SPEC-005.

**Fora (fica para depois):**
- **Incluir concursos ou editais novos no seed.** É curadoria do JSON (`data/seed/court_it_taxonomy_v0.2.json`) e `python scripts/generate_seed.py`, sem migração (ADR-004). Resposta à pergunta do dono: para mapear um edital novo nos 38 assuntos **basta o conteúdo programático** (é dele que sai a incidência 0, 0,5 ou 1 por assunto); **provas anteriores** da mesma banca e órgão não entram na incidência, mas ajudam a calibrar o 0,5 contra o 1 (o que de fato cai com profundidade) e serão a matéria-prima do banco de questões (módulo 2). Um edital novo de um tribunal que já está no seed exige decidir, na curadoria, entre atualizar o registro existente (mesmo `id`, o peso personalizado continua valendo) ou criar outro (`id` novo, entra sem peso num conjunto personalizado, CA-26). Se o conteúdo trouxer assunto que não cabe nos 38, a taxonomia ganha assunto novo pelo mesmo fluxo.
- **Cronograma, assunto da vez e a aplicação da exceção 1** (módulo 4), inclusive o uso de `target_notice_published`.
- **Data da prova e peso automático pela proximidade da prova** (P-3): regra nova, que não está no doc 04.
- **Histórico de mudanças de pesos** (P-6).
- **Campos de estudo** em Configurações (horas por dia, cota de infra, cartões novos por dia, retenção desejada): entram com as specs dos módulos 3 e 4; **modo de IA** com o módulo 8 (P-8).
- **Ativar ou desativar concurso pelo usuário** e editar incidências pela interface (P-4; seguiriam o ADR-011 se um dia forem pedidos).
- Mudar `v_topic_priority` para os pesos do usuário (P-11).

## 4. Critérios de aceite
Exemplo usado em vários critérios, **conjunto S1**: a partir dos pesos padrão, o usuário muda só o TRT-2 de 5% para 40% e usa "Ajustar os demais e salvar". Resultado (milésimos, § 5.2): TRT-2 400; TRT-3 177; TRF-6 114; TJMG 88; TRF-2, TRT-1 e TRT-15 32 cada; TRF-4, TRT-4 e TRT-12 25 cada; TJRJ e TJSP 16 cada; TJRS e TJSC 9 cada (soma 1000).

### 4.1 Regras de domínio
| # | Dado / Quando / Então | Teste |
|---|---|---|
| CA-1 | Dado os 14 concursos do seed e nenhuma sobreposição, quando aplico `applyExamWeights`, então os concursos voltam inalterados, `mode = 'default'`, `activeTotal = 1000` e `unweightedExamIds` vazio; e a prioridade dos 38 assuntos continua igual ao JSON (o CA-1 da SPEC-004 segue passando). | unitário |
| CA-2 | Dado o conjunto S1 como sobreposição dos 14 concursos, quando aplico `applyExamWeights` e calculo a prioridade, então `mode = 'custom'`, `activeTotal = 1000`, `legislacao_mg` = 0,088, `redes` = 0,757, `monitoramento` = 0,708, `projetos` = 0,334 e `pdpj_stack` é exatamente 1 (`=== 1`); e `sortExams` devolve TRT-2, TRT-3, TRF-6, TJMG, TRF-2, TRT-1, TRT-15, TRF-4, TRT-4, TRT-12, TJRJ, TJSP, TJRS, TJSC. | unitário |
| CA-3 | Dado um conjunto personalizado sem linha para um concurso ativo, então esse concurso vale 0, aparece em `unweightedExamIds` e `activeTotal` é a soma dos demais; dado uma sobreposição para um concurso inativo, então ela não entra em `activeTotal` e o concurso continua `counted: false`; dado sobreposições ativas que somam 720, então `activeTotal = 720` e um assunto com incidência 1 em todos tem prioridade 0,72 (sem normalização, SPEC-004 P-10). | unitário |
| CA-4 | Dado os ids dos concursos ativos e um conjunto de entrada em milésimos, quando chamo `validateWeightSet`, então: soma 1000 com todos os ativos → `ok`; peso 0 e um único concurso com 1000 → `ok`; soma 1350 → `{ kind: 'sum_not_total', total: 1350 }`; concurso ativo ausente → `missing_exam`; id inexistente ou inativo → `unknown_exam`. | unitário |
| CA-5 | Dado os pesos atuais padrão e a entrada com TRT-2 = 400 e os demais iguais aos atuais, quando chamo `rebalanceWeights`, então o resultado é exatamente o conjunto S1, o TRT-2 (alterado) fica com 400 e a soma é 1000; dado uma entrada em que nada mudou e a soma já é 1000, então o resultado é igual à entrada. | unitário |
| CA-6 | Dado pesos atuais A = 100, TRT-1 = 300, TRT-15 = 300 e TRT-2 = 300 e a entrada com A = 0, quando redistribuo, então cada um dos três recebe 333 e o milésimo que sobra vai para o primeiro na ordem de `sortExams` pelos pesos atuais (TRT-1, depois TRT-2, depois TRT-15), ficando TRT-1 = 334; a ordem é a mesma em execuções repetidas. | unitário |
| CA-7 | Dado alterações que somam 1350 → `{ kind: 'locked_exceeds_total', lockedTotal: 1350 }`; alterações que somam exatamente 1000 → os não alterados ficam com 0; alterações que somam menos de 1000 sem nenhum concurso não alterado, ou com todos os não alterados em peso 0 → `nothing_to_rebalance`. | unitário |
| CA-8 | Dado um conjunto igual aos pesos padrão dos concursos ativos, quando chamo `isDefaultWeightSet`, então é `true` (a ação apaga as linhas em vez de gravar, CA-24); com qualquer milésimo diferente, `false`. | unitário |
| CA-9 | Dado os textos "40", "2,5", "2.5", " 17,7 ", "0" e "100", quando o esquema de peso os lê, então devolve 400, 25, 25, 177, 0 e 1000 milésimos; dado "", "-1", "100,1", "2,55", "abc", "1e2" e "٣", então rejeita com a mensagem do campo (§ 5.2); `intent` fora de `save`/`rebalance` e id de concurso fora de `^[a-z0-9_]{1,64}$` são rejeitados sem tocar o banco. | unitário |
| CA-10 | Esquema e domínio. Dado o formulário de concurso-alvo, quando o esquema lê `targetExamId` vazio ("Nenhum") com a caixa marcada, então rejeita com "Escolha o concurso-alvo antes de marcar o edital como publicado." (e `validateStudyTarget` rejeita o mesmo par com `notice_requires_target`); vazio sem a caixa → `{ targetExamId: null, targetNoticePublished: false }`; `trt2` com a caixa → `{ 'trt2', true }`. | unitário |

### 4.2 Banco e dados
| # | Dado / Quando / Então | Teste |
|---|---|---|
| CA-11 | Dado a migração aplicada, então `exam_weights` tem `user_id uuid not null default auth.uid()`, `exam_id text not null` com chave estrangeira para `exams(id)` e `on delete cascade`, `weight numeric(4,3) not null` com `check (weight between 0 and 1)`, `updated_at` atualizado por gatilho, chave primária `(user_id, exam_id)`, RLS ativa com a política `owner_exam_weights` e comentário na tabela; inserir peso 1,001 ou −0,001 falha com `23514`. | pgTAP |
| CA-12 | Dado os usuários A e B com pesos próprios, quando A consulta, insere, atualiza e apaga em `exam_weights`, então só enxerga e altera as próprias linhas; A não insere linha com `user_id` de B; o anônimo não lê nada. | pgTAP |
| CA-13 | Dado a migração aplicada, então `settings.target_notice_published` é `boolean not null default false`, tem comentário, e marcar `true` com `target_exam_id` nulo falha com `23514`; com `target_exam_id = 'trt2'`, passa; linhas já existentes ficam com `false`. | pgTAP |
| CA-14 | Dado o `rls.test.sql`, então ele cobre exatamente as 22 tabelas de `public`, com `exam_weights` entre as pessoais; e `scripts/public-tables.test.ts` encontra 22 tabelas nos tipos gerados (o `check:prod` passa a conferir o acesso anônimo a `exam_weights`). | pgTAP + unitário |
| CA-15 | Dado A com o conjunto S1 gravado, quando consulto `v_topic_priority` como A, então os valores continuam os dos pesos padrão (`pdpj_stack` = 1,000, `legislacao_mg` = 0,140); e, ao reexecutar na transação o `insert … on conflict do update set target_weight` dos concursos (o mesmo do seed), as linhas de A em `exam_weights` não mudam. | pgTAP |
| CA-16 | Dado A com o conjunto S1 e B sem pesos personalizados, no banco local com o seed, quando o mapa é lido com a sessão de A, então `legislacao_mg` tem prioridade 0,088 e a primeira coluna da matriz é o TRT-2; com a sessão de B, os valores são os da SPEC-004 e a prioridade do domínio arredondada continua igual à de `v_topic_priority` para os 38 assuntos (o CA-15 da SPEC-004 segue passando). | integração |
| CA-17 | Dado A sem pesos, quando grava o conjunto S1, então há 14 linhas de A numa única instrução; ao gravar de novo com outros valores, as 14 linhas são atualizadas; "restaurar padrão" apaga só as linhas de A (as de B ficam); gravar um conjunto igual ao padrão deixa A sem linhas; gravar o concurso-alvo `trt2` com edital publicado atualiza a linha de `settings` de A. | integração |
| CA-18 | Dado falha do Supabase (cliente simulado) na leitura, na gravação ou na restauração, então os leitores devolvem `{ ok: false, error: 'load_failed' }` e as ações devolvem o estado de erro com a mensagem de § 5.2, sem lançar exceção e sem detalhe técnico; atualização que afeta 0 linhas em `settings` conta como falha. | integração (cliente simulado) |

### 4.3 Interface de Configurações
| # | Dado / Quando / Então | Teste |
|---|---|---|
| CA-19 | Dado o usuário logado, quando aciona "Configurações" no rodapé da barra lateral (ou no menu do celular), então chega em `/settings`, o link fica com `aria-current="page"`, mantém o ícone `Settings` e é indicado pelo fundo do item atual (CA-40, sem bolha), o título é "Configurações" (`h1` único, primeiro elemento do cabeçalho, sem sobretítulo: CA-42) e as seções aparecem nesta ordem, cada uma com `h2`: "Concursos e pesos", "Aparência". Não há seção "Estudo" (P-8). | E2E (jornada 9) + componente |
| CA-20 | Dado um usuário com os pesos padrão, então a tabela "Pesos dos concursos" mostra os 14 concursos ativos na ordem dos pesos padrão (a ordem não muda depois de salvar, para as linhas não pularem durante a edição), cada linha com o rótulo curto do tribunal, banca e ano, "Padrão 28%" e o campo com "28"; o total mostra "100%" com ícone e o texto "Soma correta"; a etiqueta "Pesos padrão" aparece e o botão "Restaurar padrão" não. | E2E (jornada 9) + componente |
| CA-21 | Dado a tabela com JavaScript, quando digito 40 no TRT-2, então o total passa a "135%" com ícone e o texto "35 pontos acima de 100%", numa região `aria-live="polite"` **abaixo da tabela** (fora do `tfoot`), e o número do total fica na coluna "Peso", sob os campos; com 2 no TRT-2, "97%" e "Faltam 3 pontos"; com um valor inválido em algum campo, o total mostra "—" e "Há valores inválidos". Nada é gravado enquanto digito. | componente + E2E (jornada 9) |
| CA-22 | Dado o total diferente de 100% (135%), então "Salvar" fica bloqueado na interface: `aria-disabled="true"` (sem o atributo `disabled`, para continuar focável), clique e `Enter` num campo não enviam, e ao focá-lo ou passar o ponteiro aparece a dica `role="tooltip"` "A soma dos pesos deve ser 100%." (ligada por `aria-describedby`, `Esc` fecha; só existe enquanto bloqueado); em telas sem hover a mesma frase aparece como texto de ajuda sob os botões; ao chegar a 100% o botão volta ao normal e a dica some; "Ajustar os demais e salvar" segue habilitado. O servidor continua recusando: com JavaScript desligado (ou envio forjado) nada é gravado, aparece o resumo de erro "A soma dos pesos precisa ser 100%. Agora está em 135%." (com ícone), que recebe o foco, e os valores digitados são mantidos. | E2E (jornada 9) + componente |
| CA-23 | Dado o TRT-2 alterado para 40 e os demais intactos, quando aciono "Ajustar os demais e salvar", então os pesos gravados e exibidos são os do conjunto S1 em porcentagem (TRT-2 40%, TRT-3 17,7%, TRF-6 11,4%, TJMG 8,8%, TRF-2/TRT-1/TRT-15 3,2%, TRF-4/TRT-4/TRT-12 2,5%, TJRJ/TJSP 1,6%, TJRS/TJSC 0,9%), o total é "100%", aparece a confirmação "Pesos salvos. A prioridade dos assuntos já usa os novos pesos." com o link "Ver o mapa do edital", a etiqueta muda para "Pesos personalizados" e "Restaurar padrão" aparece. "Alterado" é o concurso cujo valor digitado difere do peso efetivo gravado, lido do banco no momento da ação. | E2E (jornada 9) + integração |
| CA-24 | Dado os campos preenchidos com os pesos padrão (ou alterados e depois devolvidos ao padrão), quando aciono "Salvar", então o usuário fica sem pesos personalizados (etiqueta "Pesos padrão", sem "Restaurar padrão"). | componente + integração |
| CA-25 | Dado alterações que já somam 135%, quando aciono "Ajustar os demais e salvar", então aparece "Os pesos alterados já somam 135%, mais que 100%. Reduza algum deles." e nada é gravado; dado nenhum concurso não alterado com peso acima de 0, então "Para ajustar os demais, deixe pelo menos um concurso com o peso salvo e maior que 0." | componente + integração |
| CA-26 | Dado um conjunto personalizado em que um concurso ativo não tem peso (concurso novo no seed), então a seção mostra o aviso informativo "TRT-X ainda não tem peso definido e conta como 0%." e o campo vazio; dado pesos ativos que somam 72% (concurso desativado no seed), o aviso "Os pesos dos concursos ativos somam 72%. Ajuste e salve para voltar a 100%." | componente |
| CA-27 | Dado um concurso inativo (fixture), então ele aparece numa lista à parte, "Inativos (não contam na prioridade)", com a etiqueta "Inativo", sem campo de peso e fora do total. | componente |
| CA-28 | Dado "Restaurar padrão" num conjunto personalizado, quando aciono, então a página mostra a confirmação "Restaurar os pesos padrão? Seus pesos personalizados serão apagados." com "Restaurar pesos padrão" e "Cancelar" (estado na URL, `?confirm=restore`, funciona sem JavaScript); ao confirmar, os pesos padrão voltam, a etiqueta é "Pesos padrão", aparece "Pesos padrão restaurados." e o endereço deixa de ter `?confirm=restore` (com JavaScript, `/settings#exam-weights`; sem JavaScript, o servidor redireciona para `/settings?restored=1#exam-weights` e a mensagem vem do parâmetro); "Cancelar" volta sem alterar nada. | E2E (jornada 9) + componente |
| CA-29 | Dado o bloco "Concurso-alvo", então há a seleção "Concurso-alvo" com "Nenhum" e os concursos ativos (tribunal, banca e ano), a caixa "O edital do concurso-alvo foi publicado" e a explicação "O plano do dia só inclui assuntos pós-edital depois que o edital do concurso-alvo for publicado."; com JavaScript, a caixa fica desabilitada com "Nenhum"; sem JavaScript, marcar sem concurso mostra a mensagem do CA-10; ao salvar `TRT-2 (SP)` com a caixa marcada, aparece "Concurso-alvo salvo." e, ao recarregar, os valores persistem. Mudar o concurso-alvo não altera nenhum peso. | E2E (jornada 9) + componente |
| CA-30 | Dado a seção "Aparência" de `/settings`, então ela tem o único alternador de tema da aplicação, que funciona como na SPEC-001 (`aria-pressed`, gravação em `settings.theme`, cookie, `data-theme`); a barra lateral (≥ 1024 px) e o menu do celular (360 px) não têm alternador de tema nem o sobretítulo "Aparência" (nenhum grupo com as opções "Sistema", "Claro" e "Escuro" fora da seção); depois de escolher "Escuro" na página, o recarregamento mostra a página em `data-theme="dark"` e o alternador em "Escuro". (ADR-012) | E2E (jornada 9, projetos desktop e `mobile`) + componente (`AppShell`) |
| CA-31 | Dado falha ao carregar, então a página mostra "Não foi possível carregar as configurações. Tente de novo em instantes." com o link "Tentar de novo", sem detalhe técnico; dado nenhum concurso no banco (seed não carregado), a seção de pesos mostra o estado vazio "Nenhum concurso carregado." e o restante da página funciona. A página responde completa, sem `loading.tsx` (como na SPEC-004). | componente |
| CA-32 | Dado `/settings` só com teclado, então alcanço em ordem lógica a seleção do concurso-alvo, a caixa, os 14 campos de peso, os botões e o alternador de tema, com foco visível; `Enter` num campo de peso aciona "Salvar" (primeiro botão do formulário); cada campo tem nome acessível "Peso do TRT-2 (SP), em porcentagem" e, quando inválido, `aria-invalid` e `aria-describedby` para a mensagem; após um envio com erro o foco vai para o resumo, e após sucesso a confirmação é anunciada (`role="status"`). | E2E (jornada 9) + componente |
| CA-33 | Dado `/settings` no estado padrão, no estado de erro de soma e na confirmação de restauração, nos temas claro e escuro, quando o axe analisa, então não há violação séria nem crítica (inclui contraste). | E2E (jornada 9) |
| CA-34 | Dado viewport de 360 px, então `/settings` não tem rolagem horizontal, a tabela de pesos cabe em três colunas (concurso, padrão, peso), os botões se empilham, os campos usam `inputmode="decimal"` e todo alvo de toque tem pelo menos 44 × 44 px. | E2E (jornada 9, projeto `mobile`) |

### 4.4 Efeito no mapa do edital
| # | Dado / Quando / Então | Teste |
|---|---|---|
| CA-35 | Dado um usuário com o conjunto S1 e sem respostas, quando abre `/topics`, então vê o aviso informativo "Pesos personalizados em uso." com o link "Configurações"; `legislacao_mg` mostra "8,8%" e `redes` "75,7%"; a ordem por urgência segue as novas prioridades; na matriz, a primeira coluna é o TRT-2 com "40%". Dado pesos ativos que somam 72%, o aviso é "Os pesos dos concursos ativos somam 72%; as prioridades ficam fora da escala de 0 a 100%." com o mesmo link. Dado o aviso fechado no X, quando recarrega ou navega entre o mapa e o detalhe no mesmo navegador, então ele continua fechado; quando os pesos são salvos com outro conjunto, então o aviso volta; quando são restaurados ao padrão, o aviso não aparece (modo padrão sem aviso). A dispensa é por navegador (cookie `gb-weights-notice` com a impressão digital do conjunto de pesos) e não vai para o banco. | E2E (jornada 9) + componente + unitário (`weightsFingerprint`) |
| CA-36 | Dado o mesmo usuário, quando abre `/topics/legislacao_mg`, então o TJMG aparece com "peso 8,8%" e contribuição "8,8%", o total é "8,8%" e o aviso de pesos personalizados aparece também no detalhe, e fechar o aviso em uma das telas o mantém fechado na outra (mesma impressão digital). | E2E (jornada 9) + componente |
| CA-37 | Dado um usuário com os pesos padrão, então o mapa e o detalhe ficam exatamente como na SPEC-004, sem aviso de pesos: as verificações do mapa e do detalhe da jornada 8 passam sem alteração. Só as verificações da casca (CA-36 da SPEC-004: números, bolha e alternador na barra) mudam para o comportamento do ADR-012 (CA-40), e o cabeçalho do mapa e do detalhe perde o sobretítulo (ADR-013, CA-42), sem afrouxar as demais. | E2E (jornada 8) |

### 4.5 Design system e implantação
| # | Dado / Quando / Então | Teste |
|---|---|---|
| CA-38 | Dado `PageSection`, `Field` com `suffix`, `SelectField`, `CheckboxField` e o link secundário da barra lateral, quando renderizados, então aplicam as classes `gb-` descritas em `design/components.css` e no doc 05 (registradas antes do código); nenhum token novo é criado; se algum par de cor novo surgir, ele entra no `tests/design/contrast.test.ts` nos dois temas. | componente + unitário |
| CA-39 | Dado a implantação (§ 5.6), então: a migração foi aplicada no remoto com `npm run db:push` **antes** do merge, a partir da branch publicada; `npm run db:test:remote` passou (22 tabelas, `exam_weights`, `settings.target_notice_published`); a consulta de conferência do seed (§ 5.6) mostra a ordem dos subtópicos e os perfis do JSON; depois do merge, `npm run check:prod` passou e o checklist manual em produção (abrir `/settings`, ajustar o TRT-2, ver o mapa, restaurar o padrão) foi cumprido; a resposta a "o seed é reaplicado a cada push?" ficou registrada no runbook. | manual (checklist no PR) + pgTAP remoto |

### 4.6 Casca (ADR-012)
| # | Dado / Quando / Então | Teste |
|---|---|---|
| CA-40 | Dado a casca em ≥ 1024 px e no menu do celular (360 px), então "Início" e "Mapa do edital" mostram cada um o seu ícone Lucide (`aria-hidden`) e o rótulo, sem número (nenhum "00" ou "01" na navegação; nenhum elemento `gb-shell__rail-number`); em `/topics` e em `/topics/<id>`, "Mapa do edital" tem `aria-current="page"`, continua com o ícone, não contém bolha (`.gb-bubble`) e tem fundo diferente do fundo dos demais itens; os demais itens não têm `aria-current`; o mesmo vale para "Configurações" em `/settings`; o rodapé da barra tem só "Configurações" e "Sair". No modo `forced-colors: active`, o item atual usa `Highlight`/`HighlightText`. | componente (`Shell`, `AppShell`) + E2E (jornadas 8 e 9) |
| CA-41 | Dado `design/tokens.json`, quando o teste de contraste roda, então, nos temas claro e escuro: o fundo do item atual (`ink`) sobre o fundo da barra (`paper`) atinge pelo menos 3:1; o texto e o ícone do item atual (`on-ink` sobre `ink`) atingem 4,5:1; o anel de foco do item atual (`ink`) sobre o intervalo em `paper` atinge 3:1; os pares que saíram com a bolha (`ink` e `ink-strong` sobre `ink-light` no item atual) deixam de ser citados como item da barra. Com foco de teclado no item atual, o anel aparece separado do fundo por 2 px de `paper`. | unitário (`tests/design/contrast.test.ts`) + E2E (jornada 8, foco visível) |

### 4.7 Cabeçalho de página (ADR-013)
| # | Dado / Quando / Então | Teste |
|---|---|---|
| CA-42 | Dado `/topics`, `/topics/<id>` (ambos também no estado de erro de carga), `/settings` e `/login`, então: o `header.gb-page-header` (no login, o bloco `gb-login__form`) tem o `h1` como primeiro elemento, sem `hgroup` e sem elemento `.gb-page-header__eyebrow` ou `.gb-eyebrow` antes dele; nenhuma dessas páginas mostra os sobretítulos "Módulo 01", "Assunto", "Preferências" ou "Acesso" no cabeçalho; o `h1` continua único e com o mesmo texto ("Mapa do edital", o nome do assunto, "Configurações", "Entrar"); o resumo do mapa e as etiquetas do detalhe continuam no cabeçalho, à direita a partir de 1024 px; um título longo de assunto quebra sem rolagem horizontal em 360 px. No login a partir de 1024 px, o painel de marca continua mostrando "Analista Judiciário · Tecnologia da Informação". | componente (`TopicMapView`, `TopicDetailView`, `settings/page`, `login/page`) + E2E (jornadas 1, 8 e 9) |
| CA-43 | Dado o design system, então `design/components.css` não tem o seletor `gb-page-header__eyebrow` nem regras para `hgroup` em `gb-page-header` e `gb-login__form`; o estilo `eyebrow` de `design/tokens.json` mantém os valores (13/18, 700, caixa alta, 0,08em, `graphite-soft`), com exemplo e texto de uso que não citam sobretítulo; `npm run tokens` não altera `tokens.css` além do que o texto de uso exigir, e o teste de sincronia passa; no teste de contraste, `graphite-soft` sobre `paper` (rótulos curtos e cabeçalhos de coluna) e sobre `grid-light` (linha de marca do login) continuam verificados nos dois temas, com descrições que não citam sobretítulo nem números da barra. | unitário (`tests/design/contrast.test.ts`, sincronia dos tokens) + revisão (busca no código) |

## 5. Design técnico

### 5.1 Arquivos por camada
| Camada | Arquivo | Criar/Alterar | Responsabilidade |
|---|---|---|---|
| domain | `src/modules/topics/domain/exam-weights.ts` (+ `.test.ts`) | Criar | `applyExamWeights`, `validateWeightSet`, `rebalanceWeights`, `isDefaultWeightSet`, `buildExamWeightsSettings`, `toWeightUnits` (CA-1 a CA-8) |
| domain | `src/modules/topics/domain/topic-map.ts` (+ teste) | Alterar | `buildTopicMap`/`buildTopicDetail` aplicam as sobreposições antes da prioridade e devolvem o resumo dos pesos (CA-35, CA-36) |
| domain | `src/modules/topics/domain/topic-map-types.ts`, `index.ts` | Alterar | `TopicMapSource.weightOverrides`; reexportar os tipos e funções novos |
| data | `src/modules/topics/data/topics-repository.ts` (+ `.int.test.ts`) | Alterar | Quinta leitura em paralelo: `exam_weights` do usuário, com `count: 'exact'` (CA-16) |
| data | `src/modules/topics/data/exam-weights-repository.ts` (+ `.int.test.ts`) | Criar | `readExamWeights`, `saveExamWeights` (upsert de todas as linhas numa instrução), `deleteExamWeights` (CA-17, CA-18) |
| actions | `src/modules/topics/actions/exam-weights-schema.ts` (+ `.test.ts`) | Criar | Zod do formulário, leitura do `FormData`, soma ao vivo para o componente, estado do formulário e mensagens (CA-9) |
| actions | `src/modules/topics/actions/save-exam-weights.ts` (+ `.int.test.ts`) | Criar | `'use server'`: intents `save` e `rebalance` (CA-22 a CA-25) |
| actions | `src/modules/topics/actions/restore-default-weights.ts` (+ `.int.test.ts`) | Criar | `'use server'`: apaga as sobreposições (CA-28) |
| actions | `src/modules/topics/actions/get-exam-weights-settings.ts` (+ `.int.test.ts`) | Criar | Leitor de servidor sem `'use server'` (doc 06, SPEC-004 P-9) |
| components | `src/modules/topics/components/ExamWeightsSection.tsx`, `ExamWeightsForm.tsx`, `RestoreDefaultWeights.tsx` (+ testes) | Criar | Seção "Pesos dos concursos": tabela, total ao vivo, botões, avisos, confirmação de restauração (CA-20 a CA-28) |
| components | `src/modules/topics/components/ExamWeightsEditor.tsx` (+ teste) | Criar | Cliente que reúne `ExamWeightsForm` e `RestoreDefaultWeights`, recebe as Server Actions como *props* e garante que só um resultado (salvo ou restaurado) apareça por vez |
| components | `src/modules/topics/components/TopicMapView.tsx`, `TopicDetailView.tsx` (+ testes) | Alterar | Aviso de pesos personalizados ou de soma diferente de 100% (CA-35, CA-36); ADR-013: cabeçalho sem sobretítulo nem `hgroup` nos estados normal e de erro (CA-42) |
| data | `src/modules/topics/data/exam-catalog.ts` | Criar | `selectExams` e `toExam`: consulta e conversão de concursos, compartilhadas pelos repositórios de pesos e do mapa |
| módulo | `src/modules/topics/index.ts` | Alterar | Exporta `getExamWeightsSettings`, `ExamWeightsSection` |
| domain | `src/modules/settings/domain/study-target.ts` (+ `.test.ts`), `index.ts` | Criar/Alterar | Tipo `StudyTarget` e a regra "edital publicado exige concurso-alvo" (CA-10) |
| data | `src/modules/settings/data/settings-repository.ts` (+ `.int.test.ts`) | Alterar | `readStudyTarget`, `saveStudyTarget`, `readActiveExamOptions` (CA-17, CA-18) |
| actions | `src/modules/settings/actions/study-target-schema.ts` (+ teste), `save-study-target.ts` (+ `.int.test.ts`), `get-study-target.ts` | Criar | Zod, `'use server'` da gravação, leitor de servidor |
| components | `src/modules/settings/components/StudyTargetForm.tsx` (+ teste), `AppearanceSection.tsx` (+ teste) | Criar | Bloco "Concurso-alvo" (CA-29); seção "Aparência" com o `ThemeToggle` existente, único lugar do alternador (CA-30, ADR-012) |
| módulo | `src/modules/settings/index.ts` | Alterar | Exporta `getStudyTarget`, `saveStudyTarget`, `StudyTargetForm`, `AppearanceSection` |
| shared/ui | `PageSection.tsx`, `SelectField.tsx`, `CheckboxField.tsx` (+ testes) | Criar | Componentes do design system (CA-38) |
| shared/ui | `use-hydrated.ts` | Criar | Hook `useHydrated`, exportado em `shared/ui/index.ts`; o formulário de restauração só envia o campo `enhanced` quando o JavaScript já roda |
| shared/ui | `Field.tsx`, `Shell.tsx` (+ testes), `index.ts` | Alterar | `suffix` em `Field`; `secondaryNavigation` no `Shell` (link no rodapé com `aria-current`, CA-19); ADR-012: `NavigationItem` sem `number`, ícone sempre visível, item atual sem `Bubble` (CA-40) |
| app | `src/app/(app)/settings/page.tsx` | Criar | Compõe as seções na ordem; lê `?confirm=restore`; `metadata` "Configurações"; ADR-013: cabeçalho só com o `h1` (CA-19, CA-42) |
| app | `src/app/(public)/login/page.tsx` (+ `page.test.tsx`) | Alterar | ADR-013: formulário começa pelo `h1` "Entrar", sem "Acesso" e sem `hgroup`; a linha de marca do painel continua (CA-42) |
| app | `src/app/(app)/layout.tsx`, `app-shell.tsx` (+ `app-shell.test.tsx`), `navigation.tsx` | Alterar | Link "Configurações" no rodapé da barra; ADR-012: `layout.tsx` deixa de passar o bloco "Aparência" com o `ThemeToggle` em `actions` (fica só `LogoutButton`); `navigation.tsx` sem números, com ícones `House` e `Map` (CA-30, CA-40) |
| banco | `supabase/migrations/<timestamp>_exam_weights_and_target_notice.sql` | Criar | § 5.3 (timestamp maior que o último da `main`) |
| banco | `src/shared/supabase/database.types.ts` | Regenerar | `npm run db:types` |
| testes | `supabase/tests/exam_weights.test.sql` | Criar | CA-11 a CA-13, CA-15 |
| testes | `supabase/tests/rls.test.sql`, `scripts/public-tables.test.ts` | Alterar | 22 tabelas (CA-14) |
| testes | `tests/factories/server-action.ts` | Criar | `asServerAction` e `serverFormActions`: referências no formato das do Next, para provar que o formulário não renderiza `javascript:throw` |
| testes | `tests/factories/exam-weights.ts` | Criar | Conjunto S1 e gravação para um usuário (cliente admin local) |
| testes | `tests/e2e/journey-09-settings.spec.ts`, `tests/e2e/pages/SettingsPage.ts` | Criar | Jornada 9, com usuário descartável; ADR-013: sai o localizador `eyebrow` do *page object*, entra a verificação de ausência do sobretítulo (CA-42) |
| testes | `tests/e2e/journey-07-themes-mobile.spec.ts`, `tests/e2e/pages/HomePage.ts` | Alterar | ADR-012: troca de tema feita em `/settings` (desktop e celular), sem afrouxar as verificações de persistência, cookie e sincronia (CA-30) |
| testes | `tests/e2e/journey-08-topic-map.spec.ts` | Alterar | ADR-012: verificações da casca passam de número/bolha/alternador na barra para ícone, fundo e ausência do alternador (CA-37, CA-40, CA-41); ADR-013: ausência do sobretítulo no mapa e no detalhe (CA-42) |
| testes | `tests/e2e/journey-01-login.spec.ts`, `tests/e2e/pages/LoginPage.ts` | Alterar | ADR-013: formulário sem "Acesso", `h1` "Entrar" primeiro; linha de marca visível a partir de 1024 px (CA-42) |
| testes | `tests/design/contrast.test.ts` | Alterar | Pares do item atual pelo fundo (CA-41); ADR-013: descrições dos pares `graphite-soft` sem "sobretítulo" nem números da barra, valores iguais (CA-43) |
| design | `design/components.css` | Alterar | Classes de § 5.4 (antes do código); ADR-012: remover `gb-shell__rail-number`, `gb-shell__appearance` e as regras de `.gb-shell__actions .gb-theme-toggle`/`.gb-segmented`; item atual com fundo `ink`, cor `on-ink`, foco com intervalo `paper` e regra de `forced-colors`; ícone visível no desktop; ADR-013: tirar `gb-page-header__eyebrow` da regra de `gb-eyebrow`, remover `.gb-page-header hgroup` e `.gb-login__form hgroup`, passar `min-width: 0` para `.gb-page-header__title`, atualizar o comentário do cabeçalho (CA-43) |
| design | `design/tokens.json` (e `tokens.css` regenerado, se mudar) | Alterar | ADR-013: `sample` e `usage` do estilo `eyebrow` sem sobretítulo (CA-43) |
| docs | ADR-011, ADR-012, ADR-013, glossário, docs 01, 03, 04, 05, 06, 07, runbook, `README.md`, `CHANGELOG.md` | Criar/Alterar | § 3; artefatos do ADR-012 e do ADR-013 listados no Histórico (2026-11-20) |

Por que os pesos ficam no módulo `topics` e o concurso-alvo no `settings`: o peso é entrada da prioridade, e o tipo `Exam` e `computeTopicPriority` vivem em `topics`; o concurso-alvo e o edital publicado são colunas de `settings`. A página `/settings` é uma composição em `app/`, como o doc 06 prevê, e cada módulo futuro traz a própria seção pelo seu `index.ts`.

### 5.2 Contratos

```ts
// src/modules/topics/domain/exam-weights.ts
/** Integer thousandths: 1000 = 100%, 1 = 0.1 percentage point. */
export type WeightUnits = number;
export const TOTAL_WEIGHT_UNITS = 1000;

/** One row of exam_weights for the current user. weight is 0..1 with at most 3 decimals. */
export type ExamWeightOverride = { examId: string; weight: number };
export type ExamWeightsMode = 'default' | 'custom';
export type ExamWeightsSummary = {
  mode: ExamWeightsMode;                       // custom = the user has at least one override
  activeTotal: WeightUnits;                    // sum of the effective weights of active exams
  unweightedExamIds: ReadonlyArray<string>;    // active exams without a row in custom mode (count as 0)
  fingerprint: string | null;                  // weightsFingerprint of the overrides; null in default mode (nothing to dismiss)
};

export function toWeightUnits(weight: number): WeightUnits; // Math.round(weight × 1000)

/**
 * Short, stable identity of a set of overrides (FNV-1a 32 bits over the sorted "examId:units"
 * pairs, in base36). Lets a dismissed notice stay closed until the weights change (CA-35).
 */
export function weightsFingerprint(overrides: ReadonlyArray<ExamWeightOverride>): string;

/**
 * ADR-011: the seed weight is the default; with any override, the user's set replaces it and an
 * active exam without a row weighs 0. Returns exams with targetWeight set to the effective weight.
 */
export function applyExamWeights(
  exams: ReadonlyArray<Exam>,
  overrides: ReadonlyArray<ExamWeightOverride>,
): { exams: Exam[]; summary: ExamWeightsSummary };

export type WeightSetError =
  | { kind: 'missing_exam'; examId: string }
  | { kind: 'unknown_exam'; examId: string }
  | { kind: 'sum_not_total'; total: WeightUnits };
export function validateWeightSet(
  activeExamIds: ReadonlyArray<string>,
  input: ReadonlyMap<string, WeightUnits>,
): { ok: true; value: ReadonlyMap<string, WeightUnits> } | { ok: false; error: WeightSetError };

export type RebalanceError =
  | Exclude<WeightSetError, { kind: 'sum_not_total' }>
  | { kind: 'locked_exceeds_total'; lockedTotal: WeightUnits }
  | { kind: 'nothing_to_rebalance' };
/**
 * Exams whose input differs from the current weight are kept; the others are scaled to fill the
 * rest, by the largest remainder method in integers, ties broken by sortExams over the current
 * weights. The result always sums to exactly 1000.
 */
export function rebalanceWeights(
  activeExams: ReadonlyArray<Exam>,               // targetWeight = current effective weight
  input: ReadonlyMap<string, WeightUnits>,
): { ok: true; value: ReadonlyMap<string, WeightUnits> } | { ok: false; error: RebalanceError };

export function isDefaultWeightSet(
  exams: ReadonlyArray<Exam>,                     // targetWeight = seed default
  set: ReadonlyMap<string, WeightUnits>,
): boolean;

export type ExamWeightRow = { exam: Exam; defaultWeight: number; weight: number | null }; // null = no weight (CA-26)
export type ExamWeightsSettings = {
  active: ReadonlyArray<ExamWeightRow>;   // ordered by default weight (sortExams over the defaults)
  inactive: ReadonlyArray<Exam>;
  summary: ExamWeightsSummary;
};
export function buildExamWeightsSettings(
  exams: ReadonlyArray<Exam>,
  overrides: ReadonlyArray<ExamWeightOverride>,
): ExamWeightsSettings;
```

```ts
// src/modules/topics/domain/topic-map-types.ts (changes)
export type TopicMapSource = {
  topics: ReadonlyArray<Topic>;
  exams: ReadonlyArray<Exam>;                          // targetWeight = seed default
  incidences: ReadonlyArray<Incidence>;
  performance: ReadonlyArray<TopicPerformance>;
  weightOverrides: ReadonlyArray<ExamWeightOverride>;  // new
};
// TopicMap gains `weights: ExamWeightsSummary`.
// topic-map.ts: export type TopicDetail = TopicMapEntry & { weights: ExamWeightsSummary }; buildTopicDetail returns it.
```

```ts
// src/modules/topics/actions/exam-weights-schema.ts (no 'use server'; shared by the form and the action)
import { z } from 'zod';
export const EXAM_ID_PATTERN = /^[a-z0-9_]{1,64}$/;
export const WEIGHT_FIELD_PREFIX = 'weight.';          // <input name="weight.trt2">
// "40", "2,5", "2.5" → thousandths; at most 100 and one decimal place.
export const weightPercentSchema = z
  .string()
  .trim()
  .regex(/^\d{1,3}(?:[.,]\d)?$/, WEIGHT_FIELD_MESSAGE)
  .transform(percentTextToUnits)
  .refine((units) => units <= TOTAL_WEIGHT_UNITS, WEIGHT_FIELD_MESSAGE);
export const examWeightsFormSchema = z.object({
  intent: z.enum(['save', 'rebalance']),
  weights: z.record(z.string().regex(EXAM_ID_PATTERN), weightPercentSchema),
});
export function readExamWeightsForm(formData: FormData): ReturnType<typeof examWeightsFormSchema.safeParse>;
/** Live total for the form; null when any field is invalid ("Há valores inválidos"). */
export function sumWeightInputs(values: Readonly<Record<string, string>>): WeightUnits | null;

export type ExamWeightsFormState =
  | { status: 'idle' }
  | { status: 'saved'; message: string }
  | {
      status: 'error';
      message: string;                                 // summary, receives focus
      fieldErrors: Readonly<Record<string, string>>;   // by exam id
      values: Readonly<Record<string, string>>;        // what the user typed, kept on error
    };
```

```ts
// src/modules/topics/actions/save-exam-weights.ts
'use server';
export async function saveExamWeights(
  previous: ExamWeightsFormState,
  formData: FormData,
): Promise<ExamWeightsFormState>;
// 1. Zod; 2. auth.getUser (redirect to /login without a session); 3. read exams + current overrides;
// 4. save → validateWeightSet; rebalance → rebalanceWeights over the current effective weights;
// 5. isDefaultWeightSet → deleteExamWeights, otherwise saveExamWeights (one upsert of the active rows);
// 6. revalidatePath('/settings') and revalidatePath('/topics', 'layout').

// src/modules/topics/actions/restore-default-weights.ts
'use server';
export async function restoreDefaultWeights(
  previous: ExamWeightsFormState,
  formData: FormData,
): Promise<ExamWeightsFormState>;
// Deletes the overrides and revalidates as saveExamWeights. On success, without the `enhanced=1`
// field (sent by the form only after hydration) it redirects to RESTORED_PATH
// ('/settings?restored=1#exam-weights'); with it, it returns the "saved" state and the client
// replaces the address with '/settings#exam-weights'. A failure always returns the error state.

// src/modules/topics/actions/get-exam-weights-settings.ts (server only, no 'use server')
export function getExamWeightsSettings(
  client: DbClient,
  userId: string,
): Promise<LoadResult<ExamWeightsSettings>>;

// src/modules/topics/data/exam-weights-repository.ts
export function readExamWeights(client: DbClient, userId: string): Promise<LoadResult<ExamWeightOverride[]>>;
/** Every exam with its seed default weight (targetWeight); the base the user's rows are applied over. */
export function readExamCatalog(client: DbClient): Promise<LoadResult<Exam[]>>;
export function saveExamWeights(
  client: DbClient,
  userId: string,
  set: ReadonlyMap<string, WeightUnits>,               // written as units / 1000
): Promise<{ ok: true } | { ok: false; error: 'save_failed' }>;
export function deleteExamWeights(
  client: DbClient,
  userId: string,
): Promise<{ ok: true } | { ok: false; error: 'save_failed' }>;
```

```ts
// src/modules/topics/actions/dismiss-weights-notice.ts
'use server';
/** Remembers, in this browser only, that the notice for this set of weights was closed (CA-35). */
export async function dismissWeightsNotice(fingerprint: string): Promise<void>; // validates with weightsFingerprintSchema; ignores invalid input

// src/modules/topics/data/weights-notice-cookie.ts (reads and writes the cookie; no 'use server')
export const WEIGHTS_NOTICE_COOKIE = 'gb-weights-notice';   // httpOnly, sameSite lax, secure in production, path /, 1 year
export function readDismissedWeightsFingerprint(): Promise<string | null>;
export function writeDismissedWeightsFingerprint(fingerprint: string): Promise<void>;
```

```ts
// src/modules/settings/domain/study-target.ts
export type StudyTarget = { targetExamId: string | null; targetNoticePublished: boolean };
/** docs/04 exception 1 refers to the target exam's notice, so the flag needs a target. */
export function validateStudyTarget(
  input: StudyTarget,
): { ok: true; value: StudyTarget } | { ok: false; error: 'notice_requires_target' };

// src/modules/settings/actions/study-target-schema.ts
export const studyTargetSchema = z.object({
  targetExamId: z.union([z.literal('').transform(() => null), z.string().regex(EXAM_ID_PATTERN)]),
  targetNoticePublished: z.literal('on').optional().transform((value) => value === 'on'),
});
export type StudyTargetFormState =
  | { status: 'idle' } | { status: 'saved'; message: string } | { status: 'error'; message: string };

// src/modules/settings/actions/save-study-target.ts
'use server';
export async function saveStudyTarget(
  previous: StudyTargetFormState,
  formData: FormData,
): Promise<StudyTargetFormState>; // also checks that targetExamId is an active exam

// src/modules/settings/actions/get-study-target.ts (no 'use server')
export function getStudyTarget(
  client: DbClient,
  userId: string,
): Promise<LoadResult<{ target: StudyTarget; examOptions: ReadonlyArray<ExamOption> }>>;
export type ExamOption = { id: string; label: string };   // "TRT-2 (SP) · FCC 2025"
```

```ts
// src/shared/ui (new or changed)
type PageSectionProps = { id: string; title: string; description?: string; children: ReactNode }; // h2 + anchor
type FieldProps = /* as today */ & { suffix?: string };                  // "%" outside the input, aria-hidden
type SelectFieldProps = Omit<SelectHTMLAttributes<HTMLSelectElement>, 'id'> & { id: string; label: string; error?: string }; // the <option>s come as children
type CheckboxFieldProps = { id: string; label: string; hint?: string; error?: string } & InputHTMLAttributes<HTMLInputElement>;
type ShellProps = /* as today */ & { secondaryNavigation?: ReadonlyArray<{ label: string; href: string; icon: ReactNode }> };
// ADR-012: the module number leaves the rail; every item shows its icon, also when current.
type NavigationItem = { label: string; href: string; icon: ReactNode };   // was { number; label; href; icon }
```

**Mensagens (texto de interface):**
| Situação | Texto |
|---|---|
| Campo inválido | "Use um número de 0 a 100, com no máximo uma casa decimal (ex.: 2,5)." |
| Soma diferente de 100% | "A soma dos pesos precisa ser 100%. Agora está em 135%." |
| Alterados acima de 100% | "Os pesos alterados já somam 135%, mais que 100%. Reduza algum deles." |
| Nada a redistribuir | "Para ajustar os demais, deixe pelo menos um concurso com o peso salvo e maior que 0." |
| Falha ao gravar | "Não foi possível salvar os pesos. Tente de novo." |
| Sucesso | "Pesos salvos. A prioridade dos assuntos já usa os novos pesos." + "Ver o mapa do edital" |
| Restaurado | "Pesos padrão restaurados." |
| Concurso-alvo | "Concurso-alvo salvo." · "Escolha o concurso-alvo antes de marcar o edital como publicado." · "Não foi possível salvar o concurso-alvo. Tente de novo." |

**Exibição:** pesos, total e diferença com `formatShare` (máximo uma casa, sem zeros à direita); a diferença em "pontos" ("35 pontos acima de 100%", "Faltam 3 pontos", "Faltam 0,5 ponto"). O campo mostra o número sem "%" ("17,7"), com o sufixo visual "%".

**Termos novos (glossário, antes do código):** peso do concurso (do usuário) = *exam weight* / `exam_weights`; peso padrão = *default weight*; peso efetivo = *effective weight*; pesos personalizados = *custom weights* (`mode: 'custom'`); restaurar padrão = *restore defaults*; ajustar os demais (redistribuir) = *rebalance*; concurso-alvo = *target exam* (`target_exam_id`, coluna já existente); edital publicado (do concurso-alvo) = `target_notice_published`; seção de página = `PageSection`; navegação secundária = `secondaryNavigation`.

**Validação de faixa e precisão.** O domínio (`validateWeightSet`, `rebalanceWeights`) trabalha em milésimos inteiros e confere só pertencimento (concursos ativos, sem faltar nem sobrar) e a soma de 1000; **não** valida a faixa 0 a 100% nem a precisão de uma casa decimal por valor. Isso fica no esquema Zod (`weightPercentSchema`, na entrada) e no `check (weight between 0 and 1)` com `numeric(4,3)` (no banco).

### 5.3 Banco
**Migração nova:** `supabase/migrations/<timestamp>_exam_weights_and_target_notice.sql` (timestamp maior que `20261117010000`, definido na implementação).

```sql
-- Per-user exam weights over the seed defaults, and the target exam notice flag (SPEC-005, ADR-011).
create table exam_weights (
  user_id     uuid not null default auth.uid(),
  exam_id     text not null references exams(id) on delete cascade,
  weight      numeric(4,3) not null check (weight between 0 and 1),
  updated_at  timestamptz not null default now(),
  primary key (user_id, exam_id)
);
create trigger trg_exam_weights_updated before update on exam_weights
  for each row execute function set_updated_at();

alter table exam_weights enable row level security;
create policy owner_exam_weights on exam_weights for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

comment on table exam_weights is
  'User weight of each exam in topic priority, over exams.target_weight (the seed default, rewritten '
  'by every seed run). Any row puts the user in custom mode: an active exam without a row weighs 0. '
  'No rows = defaults. The 100% total is checked by the application (SPEC-005).';

alter table settings
  add column target_notice_published boolean not null default false;
alter table settings
  add constraint settings_notice_requires_target
  check (target_exam_id is not null or not target_notice_published);
comment on column settings.target_notice_published is
  'The notice of the target exam has been published: post_notice topics may enter the cycle '
  '(docs/04, exception 1; used by module 4).';
```

- **Compatível com o código em produção:** tabela nova e coluna com padrão; o `check` só envolve a coluna nova (todas as linhas existentes ficam `false`). O código da `main` não lê `exam_weights` e grava em `settings` só `user_id` e `theme`.
- **Índices:** a chave primária `(user_id, exam_id)` atende a única leitura (todas as linhas de um usuário). Nada a acrescentar.
- **Sem chave estrangeira para `auth.users`:** segue a convenção das demais tabelas pessoais do schema inicial.
- **Soma de 100% não é restrição do banco:** exigiria gatilho de restrição adiado entre linhas; a validação fica no domínio e na ação, e o domínio trata uma soma diferente sem quebrar (CA-3, CA-26, CA-35).
- **Gravação atômica sem função SQL:** o conjunto inteiro vai num único `upsert` (uma instrução); "restaurar padrão" é um único `delete`. Linhas de concursos que ficaram inativos são ignoradas pelo domínio; não é preciso apagá-las.
- **Visões:** `v_topic_priority` **não muda** e passa a ser declaradamente a conferência dos pesos padrão (P-11, CA-15); `v_topic_performance` não é afetada.
- **Seed:** não muda. O `generate_seed.py` continua sobrescrevendo `exams.target_weight`, agora sem efeito sobre o usuário (CA-15).
- **Tipos e docs:** `npm run db:types`; doc 03 (22 tabelas, bloco Estudo com `exam_weights`, `settings.target_notice_published`, visão de prioridade com os pesos padrão, migração na lista, pgTAP novo em § Validação); doc 04 § Prioridade ("calculada no domínio com o peso efetivo do usuário; a visão confere os pesos padrão").

**pgTAP:** `supabase/tests/exam_weights.test.sql` (CA-11 a CA-13, CA-15), na convenção dos existentes (transação com `rollback`, usuários fictícios); `rls.test.sql` com `exam_weights` entre as tabelas pessoais (o primeiro teste dele falha se a tabela nova não for listada) e `plan` atualizado.

### 5.4 Interface

**`/settings` — desktop (≥ 1024 px)**
```
┌ casca ─────────┬──────────────────────────────────────────────────────────────────┐
│▪ ● Gabarita    │ Configurações                                                     │
│▪ ⌂ Início      │ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│▪ ▱ Mapa do     │ Concursos e pesos                                                 │
│▪   edital      │ Quanto cada concurso pesa na prioridade dos assuntos.             │
│                │ ─────────────────────────────────────────────────────────────────│
│                │ CONCURSO-ALVO                                                     │
│                │ [ TRT-2 (SP) · FCC 2025          ▾]                               │
│                │ [x] O edital do concurso-alvo foi publicado                       │
│                │     O plano do dia só inclui assuntos pós-edital…      │
│                │ [Salvar concurso-alvo]                                            │
│                │ ─────────────────────────────────────────────────────────────────│
│                │ PESOS DOS CONCURSOS                          [Pesos personalizados]│
│                │ Concurso                         Padrão        Peso               │
│                │ TRT-3 · Fumarc 2022                28%      [ 17,7 ] %            │
│                │ TRF-6 · Cebraspe 2024              18%      [ 11,4 ] %            │
│                │ …                                                                 │
│                │ TRT-2 · FCC 2025                    5%      [ 40   ] %            │
│                │ …                                                                 │
│                │ Total                                         100% ✓ Soma correta │
│                │ [Salvar] [Ajustar os demais e salvar]        Restaurar padrão     │
│                │ ─────────────────────────────────────────────────────────────────│
│█⚙ Configurações│ Aparência                                                         │
│ ⎋ Sair         │ [Sistema|Claro|Escuro]                                            │
└────────────────┴──────────────────────────────────────────────────────────────────┘
```
- **Cabeçalho (ADR-013):** `gb-page-header` com o `h1` "Configurações" direto no `header` (sem `hgroup` e sem sobretítulo) e a régua grossa abaixo; sem metadados à direita.
- **Seções:** `PageSection` (`gb-page-section`, `__title`, `__description`), separadas por régua de 1 px (`rule`); blocos internos com rótulo em `eyebrow`. Sem índice interno enquanto houver até 4 seções.
- **Tabela de pesos** (`gb-weight-table`, `__exam`, `__default`, `__input`, `__total`, `__status`): `<table>` com `caption` "Pesos dos concursos", cabeçalhos de coluna, tribunal no cabeçalho de linha (rótulo curto visível; nome completo, banca e ano visíveis em texto menor), padrão em número tabular, campo `Field` compacto com `suffix="%"`, `inputmode="decimal"`, largura para "100,0". Total no rodapé (`tfoot`): "Total" ocupa as colunas "Concurso" e "Padrão" (`colSpan={2}`) e o número fica na célula da coluna "Peso", alinhado ao valor dos campos (o deslocamento anterior vinha de uma única célula com `colSpan={2}` que começava na coluna "Padrão"). O status (ícone Lucide `CircleCheck`/`CircleAlert` e texto) fica **abaixo da tabela**, fora do `tfoot`, em `aria-live="polite"`. "Salvar" é bloqueado com `aria-disabled` enquanto a soma não é 100% e mostra a dica "A soma dos pesos deve ser 100%." (`ActionHint`, mesmas classes `gb-header-hint`; em telas sem hover, texto de ajuda `gb-form__help` sob os botões). Etiqueta `Tag` "Pesos padrão"/"Pesos personalizados".
- **Botões:** "Salvar" (`primary`, primeiro no DOM, botão padrão do `Enter`), "Ajustar os demais e salvar" (`secondary`), "Restaurar padrão" (`text`, só no modo personalizado; é um link para `?confirm=restore#exam-weights`).
- **Confirmação de restauração:** bloco no lugar dos botões, com o texto, "Restaurar pesos padrão" (`primary`, formulário com a ação) e "Cancelar" (link para `/settings#exam-weights`). Ao abrir, o foco vai para o texto da confirmação.
- **Resumo de erro:** `Notice kind="error"` acima da tabela, com `tabIndex={-1}`, focado após o envio; erros de campo com `gb-field__error` (ícone e texto).
- **Avisos:** todo `Notice` (erro, sucesso, informação) tem o botão X "Fechar aviso" (`Esc` no botão também fecha; o foco segue para o próximo controle; um novo resultado de ação reexibe o aviso; avisos de estado reaparecem ao recarregar), exceto a pergunta de confirmação da restauração (`dismissible={false}`, rotula os botões abaixo). `Notice kind="info"` para concurso sem peso e soma ativa diferente de 100% (CA-26).
- **Inativos:** lista abaixo da tabela, "Inativos (não contam na prioridade)", com `Tag` "Inativo".
- **Barra lateral (ADR-012):** itens com ícone Lucide e rótulo, sem número; rodapé com o link "Configurações" (`gb-shell__secondary-link`) e "Sair", sem o bloco "Aparência". Item atual (principal ou secundário): fundo `ink` (█ no esboço), texto e ícone `on-ink`, ícone mantido, `aria-current="page"`, sem bolha; foco no item atual com intervalo de 2 px em `paper` antes do anel; em `forced-colors`, `Highlight`/`HighlightText`. No celular, o link aparece no fim do menu, seguido de "Sair"; o menu não tem alternador de tema.
- **Mapa do edital:** `Notice kind="info"` logo abaixo do cabeçalho, antes dos filtros, só no modo personalizado ou com soma diferente de 100% (CA-35, CA-36). **Dispensa persistente:** o X chama a ação `dismissWeightsNotice(fingerprint)` (`Notice` recebe `onDismiss`, uma Server Action), que grava o cookie `gb-weights-notice` (`httpOnly`, `SameSite=Lax`, `Secure` em produção, `path=/`, 1 ano) com a impressão digital do conjunto de pesos (`weightsFingerprint`: FNV-1a de 32 bits em base36 sobre `examId:milésimos` ordenado; `null` no modo padrão). As páginas leem o cookie e o aviso não é renderizado quando ele é igual à impressão digital atual; salvar outro conjunto muda a impressão digital e o aviso volta; restaurar o padrão leva ao modo padrão (sem aviso). No modo padrão com soma diferente de 100% (mudança no seed) não há impressão digital: o aviso aparece sempre e o X só o fecha até recarregar. Além disso, só a mudança de cabeçalho do ADR-013.
- **Cabeçalho nas outras telas (ADR-013, CA-42):** no mapa, `h1` "Mapa do edital" com o resumo (`gb-page-header__meta`) à direita; no detalhe, `h1` com o nome do assunto e as etiquetas de perfil e fase à direita; nos dois, o estado de erro tem só o `h1`. No login, o formulário começa pelo `h1` "Entrar"; o painel de marca não muda (a linha "Analista Judiciário · Tecnologia da Informação", em `gb-eyebrow`, continua a partir de 1024 px). Como o `hgroup` sai, o `min-width: 0` que ele tinha passa para `.gb-page-header__title`, para o nome longo de assunto quebrar dentro do `flex`.

**360 px:** tabela de pesos em três colunas (concurso em duas linhas: rótulo curto e "banca ano"; padrão; campo com 44 px de altura); botões em coluna, largura total; seleção e caixa em largura total; sem rolagem horizontal (CA-34).

**Estados**
| Estado | `/settings` |
|---|---|
| Carregando | Sem estado de carregamento: a página responde completa (como na SPEC-004) |
| Vazio | Sem concursos: `EmptyState` "Nenhum concurso carregado." na seção de pesos (CA-31) |
| Erro de carga | `Notice` `error` + "Tentar de novo" (CA-31) |
| Erro de validação | Resumo focado + erros de campo, valores mantidos (CA-22, CA-25) |
| Enviando | Botões com `disabled` e `aria-busy` no formulário (como o `ThemeToggle`) |
| Sucesso | `Notice` `success` com `role="status"` (CA-23, CA-28, CA-29) |
| Confirmação | Bloco de confirmação de restauração (CA-28) |

**Sem JavaScript:** os três formulários (concurso-alvo, pesos, restauração) são `<form>` com server action e funcionam sem JavaScript (o Next envia o formulário e devolve o estado); o total ao vivo e o desabilitar da caixa são melhorias com JavaScript; a confirmação usa parâmetro de URL. Para isso a Server Action chega ao componente cliente como *prop* vinda de um Server Component (`ExamWeightsSection` e a página) e vai direto para o `useActionState`, sem função do cliente em volta (uma função embrulhada faz o React renderizar `action="javascript:throw …"`). A restauração bem-sucedida sem JavaScript termina em `/settings?restored=1#exam-weights`, que mostra "Pesos padrão restaurados.".

### 5.5 Por que porcentagem somando 100% com "Ajustar os demais" (P-1)
O mapa e o detalhe já mostram os pesos em porcentagem, e a contribuição de cada concurso é peso × incidência: com porcentagem, o que se digita é o que aparece no mapa ("TRT-2 40%"). O botão "Ajustar os demais e salvar" resolve o atrito de ter de mexer em 13 campos para subir um: o usuário digita só o que quer mudar e o sistema redistribui o resto na proporção atual, com resultado exato em milésimos (método do maior resto). Restaurar o padrão é exato porque o padrão também está em porcentagem. As alternativas descartadas (importância relativa e pontos livres) estão em § 7.

### 5.6 Plano de implantação em produção
Segue `docs/operacao/implantacao.md` § 3 ("Com migração"), com dois acréscimos: o seed da SPEC-004 e a conferência da reaplicação do seed.

**Situação atual:** o remoto tem as 3 migrações; o seed corrigido da SPEC-004 (o `on conflict` de `topics` e `subtopics` passou a regravar perfil, categoria e ordem) **ainda não foi aplicado no remoto**, e o runbook (§ 9) ainda não sabe se a CLI 3.2.0 reaplica o seed a cada `db push --include-seed` ou só quando o arquivo muda.

**Passo 0 — seed da SPEC-004, antes desta spec (P-12):** da `main` atualizada e limpa, `npm run backup`, `npm run db:push` (sem migração pendente; ler no dry-run se aparece "Would seed these files") e rodar a consulta de conferência abaixo. Se o seed foi aplicado, registrar no runbook § 9 que a CLI reaplica o seed sem migração pendente. Se a CLI não aplicar o seed sem migração pendente, registrar isso e o seed vai junto no passo 3.

```sql
-- Conferência do seed (SQL Editor do remoto): perfis e ordem iguais ao JSON
select id, category, profile, phase, sort_order from topics order by sort_order;
select s.sort_order, s.name from subtopics s where s.topic_id = 'pdpj_stack' order by s.sort_order;
```

**Passos da SPEC-005:**
1. PR com migração, código, testes e docs; local verde: `npm run lint`, `typecheck`, `test`, `db:test`, `test:int`, `test:e2e`.
2. Branch publicada (`git push`) e árvore limpa (exigências do `db:push`).
3. `npm run backup`, depois `npm run db:push`: o dry-run deve listar só `<timestamp>_exam_weights_and_target_notice.sql` (e o seed); conferir a linha `Target:` e digitar o identificador do projeto.
4. `npm run db:test:remote` com os testes da branch: `rls.test.sql` com 22 tabelas, `exam_weights.test.sql`, os demais inalterados. Conferir que as tabelas pessoais têm as mesmas contagens de antes (transação com `rollback`).
5. Entre o passo 3 e o merge, a produção roda o código da `main` com a tabela e a coluna novas, que ela ignora (migração aditiva). `npm run check:prod` pode rodar já nesta etapa, a partir da branch (lê as 22 tabelas dos tipos gerados): o anônimo não lê `exam_weights`.
6. Merge do PR (a Vercel implanta) e `npm run check:prod`.
7. Checklist manual em produção (CA-39): abrir `/settings`, conferir os 14 pesos padrão e o total 100%; mudar o TRT-2 para 40 e "Ajustar os demais e salvar"; conferir no mapa o aviso, `legislacao_mg` 8,8% e o TRT-2 na primeira coluna da matriz; restaurar o padrão; salvar o concurso-alvo desejado; conferir que a barra não tem alternador e escolher o tema em Configurações > Aparência (ADR-012).
8. Atualizar o runbook: § 9 (resposta sobre o seed) e o número de tabelas citado em § 2.3 e § 2.6 (21 → 22).

**Reverter:** "Promote" da implantação anterior na Vercel; a tabela e a coluna ficam no banco sem efeito sobre o código antigo. Se for preciso remover a tabela, é uma migração nova (não se edita a aplicada). PR abandonado depois do `db:push`: runbook § 5.

## 6. Plano de testes
| Nível | O que cobre | Critérios |
|---|---|---|
| Design (unitário) | `tests/design/contrast.test.ts`: fundo do item atual × barra (3:1), texto e ícone do item atual, anel de foco sobre o intervalo, nos dois temas; pares `graphite-soft` dos rótulos curtos e da linha de marca do login com descrições sem sobretítulo (ADR-013); sincronia dos tokens com o `eyebrow` revisto | CA-38, CA-41, CA-43 |
| Unitário | `applyExamWeights` (padrão, personalizado, concurso sem linha, inativo, soma 720), `validateWeightSet`, `rebalanceWeights` (S1 exato, desempate pelo maior resto, erros, alterados = 1000), `isDefaultWeightSet`, `validateStudyTarget`; esquemas Zod de peso e de concurso-alvo; `sumWeightInputs`; contagem de 22 tabelas nos tipos | CA-1 a CA-10, CA-14 |
| Componente | `ExamWeightsForm` (total ao vivo, estados de erro com foco, valores mantidos, etiqueta, botão de restaurar só no modo personalizado), `RestoreDefaultWeights` (confirmação), `ExamWeightsSection` (avisos, inativos, vazio, erro), `StudyTargetForm`, `AppearanceSection`, `PageSection`, `Field` com sufixo, `SelectField`, `CheckboxField`, `Shell` com link secundário e itens com ícone, sem número e sem bolha, `AppShell` sem alternador, `TopicMapView`/`TopicDetailView` (avisos de pesos; cabeçalho sem sobretítulo nos estados normal e de erro), página `/settings` e página `/login` (`h1` primeiro, sem sobretítulo; linha de marca mantida) | CA-19 a CA-32, CA-35, CA-36, CA-38, CA-40, CA-42 |
| Integração | Leitura do mapa com sobreposições de A e de B, igualdade domínio × visão para quem não tem sobreposição, gravação e regravação do conjunto, restauração isolada por usuário, conjunto igual ao padrão, concurso-alvo, falhas simuladas | CA-16 a CA-18, CA-23 a CA-25 |
| pgTAP | `exam_weights.test.sql` (estrutura, faixa, cascata, gatilho, RLS e isolamento, anônimo, coluna e `check` de `settings`, visão com pesos padrão, seed não toca as sobreposições); `rls.test.sql` com 22 tabelas | CA-11 a CA-15 |
| E2E | **Jornada 9 (nova)**, `tests/e2e/journey-09-settings.spec.ts`, com **usuário descartável** (o usuário de teste padrão continua com os pesos padrão, garantindo a jornada 8 em qualquer ordem): navegação, tabela padrão, total ao vivo, erro de soma (também sem JavaScript), "Ajustar os demais e salvar" com o conjunto S1, efeito no mapa e no detalhe, restauração com confirmação, concurso-alvo, aparência (único alternador, ausente da barra e do menu), teclado, axe nos dois temas, 360 px. **Jornada 8**: verificações do mapa sem mudança; as da casca seguem o ADR-012. **Jornada 7**: troca de tema feita em `/settings`. **Jornadas 1, 8 e 9**: cabeçalho sem sobretítulo no login, no mapa, no detalhe e em Configurações (ADR-013) | CA-19 a CA-23, CA-28 a CA-30, CA-32 a CA-37, CA-40 a CA-42 |
| Manual | Checklist de implantação no PR | CA-39 |

Casos-limite do doc 07 aplicáveis: prioridade como soma de peso × incidência dos concursos ativos (agora com o peso efetivo, CA-1 a CA-3) e a exatidão de 1 (CA-2). O caso "`pos_edital` bloqueado sem edital" é do módulo 4: aqui só se testa que a marcação é guardada e exige concurso-alvo (CA-10, CA-13). Casos-limite próprios desta spec: soma 0% e 100% num só concurso, peso 0, campo com vírgula e com ponto, 100,1, duas casas, empate no maior resto, alterações que somam mais de 100% ou exatamente 100%, conjunto igual ao padrão, concurso novo sem peso, concurso inativo com linha antiga.

## 7. Riscos e alternativas descartadas
**Riscos**
- **Prioridade do aplicativo diferente da visão** (`v_topic_priority` com pesos padrão): alguém consultando o SQL pode estranhar. Mitigação: o doc 03 e o doc 04 passam a dizer isso (mudar o comentário da visão exigiria migração, sem ganho), e o CA-15 fixa o comportamento.
- **Soma fora de 100% depois de mudança no seed** (concurso novo ou desativado num conjunto personalizado): prioridades fora da escala sem normalização. Mitigação: avisos em Configurações e no mapa (CA-26, CA-35) e o "Ajustar os demais e salvar".
- **Arredondamento da redistribuição** (17,684% vira 17,7%): o usuário pode estranhar 0,1 ponto de diferença do esperado. Aceito: a soma exata de 100% é mais importante; o método do maior resto é determinístico e testado (CA-5, CA-6).
- **"Alterado" decidido pelo banco no momento da ação:** se a página estiver desatualizada (outra aba), um campo pode ser tratado como alterado ou não. Uso pessoal; aceito.
- **Item atual indicado só pelo fundo** (ADR-012): com fundo pouco contrastante, violaria a WCAG 1.4.1. Mitigação: fundo `ink` com 3:1 ou mais contra a barra, testado nos dois temas (CA-41), `aria-current` mantido e regra de `forced-colors` (CA-40).
- **Tema a um clique a mais** (só em Configurações): aceito pelo dono, preferência rara (ADR-012).
- **Seed nunca aplicado no remoto** (SPEC-004): passo 0 com conferência por SQL.
- **Marcar "edital publicado" sem efeito visível até o módulo 4:** pode parecer que não faz nada. Mitigação: a explicação no próprio bloco (CA-29).

**Alternativas descartadas**
- **Gravar o peso em `exams.target_weight`, `jsonb` em `settings`, visão que aplica a sobreposição:** ver ADR-011.
- **Normalizar no cálculo** (dividir pela soma dos ativos): esconderia um conjunto inválido e contraria a SPEC-004 P-10; a soma é garantida na gravação.
- **Restrição de soma no banco** (gatilho de restrição adiado): complexidade e falha difícil de explicar na interface para um invariante que o domínio já garante.
- **Função SQL para gravar o conjunto:** um `upsert` de todas as linhas já é atômico.
- **Redistribuição automática enquanto se digita:** os outros campos mudariam sob o cursor, ruim para leitor de tela e teclado; o botão explícito é previsível e funciona sem JavaScript.
- **Ordenar a tabela pelo peso efetivo:** as linhas pulariam depois de salvar; a ordem pelo peso padrão é estável.
- **Página de Configurações dentro do módulo `settings` com todos os formulários:** obrigaria `settings` a conhecer pesos e prioridade (do `topics`); a composição em `app/` mantém cada dado com o seu módulo.
- **Manter o alternador de tema nos dois lugares** (resposta original da P-9): dois controles do mesmo estado na mesma tela e rodapé da barra mais carregado; substituída pelo dono em 2026-11-20 pelo ADR-012 (tema só em Configurações).
- **Manter a bolha ou `ink-light` no item atual da barra:** ver ADR-012 (a bolha esconderia o ícone; `ink-light` fica em 1,17:1 e 1,41:1 contra a barra).
- **Campos de estudo editáveis já:** sem consumidor, não há efeito a testar (P-8).
- **Peso por importância relativa** (baixa/média/alta ou 1–5, normalizado pelo sistema): 3 ou 5 níveis não representam os pesos padrão (28% contra 1,5%), "padrão" e "personalizado" virariam escalas diferentes e subir um nível mudaria todos os percentuais de forma pouco previsível (P-1).
- **Peso em pontos livres, normalizado** (percentual efetivo ao lado): dois números por concurso confundem e digitar 40 no TRT-2 daria 29,6%, não 40% (P-1).
- **Deixar concurso-alvo e "edital publicado" para a spec do módulo 4:** a lacuna apontada na SPEC-004 continuaria aberta e a mesma seção seria mexida duas vezes (P-2).
- **Usuário ativar ou desativar concurso:** seria uma segunda sobreposição para o mesmo efeito do peso 0 (P-4).
- **Concurso ativo sem peso valer o peso padrão:** a soma passaria de 100% sem o usuário saber (P-5).
- **Data da prova e peso automático pela proximidade:** regra nova, fora do doc 04; fica para o cronograma (P-3).
- **Histórico de pesos:** sem uso concreto; backup e `updated_at` bastam (P-6).
- **Mapa do edital continuar com os pesos padrão:** o objetivo pedido é justamente a prioridade acompanhar o peso (P-7).
- **Aplicar o seed da SPEC-004 só junto com esta migração:** juntaria os riscos e adiaria a resposta do runbook (P-12).
- **Restaurar padrão sem confirmação:** apaga 14 valores ajustados com um clique (P-13).
- **Mudar o concurso-alvo ajustar pesos ou desmarcar "edital publicado":** acopla decisões independentes (P-14).
- **Mockup estático antes da aprovação:** dispensado; a tela usa a direção A e componentes existentes (P-15).

## 8. Perguntas em aberto
| # | Pergunta | Recomendação | Resposta |
|---|---|---|---|
| **P-1** (bloqueante) | **Como o usuário informa o peso?** (a) **Porcentagem somando 100%**: total ao vivo, "Salvar" exige 100% e "Ajustar os demais e salvar" redistribui proporcionalmente os não alterados. (b) **Importância relativa** (baixa/média/alta ou 1–5) e o sistema normaliza para 100%. (c) **Pontos livres** (qualquer número; o padrão é o atual em %), com o percentual efetivo mostrado ao lado e normalizado pelo sistema. Todas com "Restaurar padrão". | **(a).** Prós: o que se digita é o que o mapa mostra; restaurar o padrão é exato; o caso do TRT-2 se resolve digitando um campo e acionando "Ajustar os demais"; resultado exato em milésimos. Contras: 14 campos numéricos; quem quer "40%" precisa entender que os outros caem. **(b)** Prós: rápido, sem conta. Contras: 3 ou 5 níveis não representam os pesos padrão (28% contra 1,5% é uma razão de quase 19), então "padrão" e "personalizado" viram escalas diferentes; subir um nível de um concurso muda o percentual de todos de forma pouco previsível; perde a ordem por faixa do doc 01. **(c)** Prós: sem a restrição de 100%, o padrão é representável. Contras: dois números por concurso (pontos e % efetivo) confundem; digitar 40 no TRT-2 dá 29,6%, não 40%. |  **(a) porcentagem somando 100%**, com "Ajustar os demais e salvar" (dono, 2026-11-19). |
| **P-2** (bloqueante) | Tratar **concurso-alvo e "edital publicado"** nesta spec (só guardar e editar; quem aplica a exceção 1 é o módulo 4) ou deixar para a spec do módulo 4? | **Nesta spec.** É a mesma seção, custa uma coluna com padrão e fecha a lacuna apontada na SPEC-004; o módulo 4 já encontra o dado. O efeito invisível até lá é explicado no próprio bloco. |  **Nesta spec** (dono, 2026-11-19). |
| P-3 | Guardar já a **data da prova** do concurso-alvo (o exemplo do dono fala em "prova em 4 meses") e/ou subir o peso automaticamente conforme a prova se aproxima? | **Não agora.** Peso automático é regra nova, fora do doc 04; a data da prova é insumo do cronograma (módulo 4), que define o uso. Nesta spec o ajuste é manual. |  Aceita a recomendação: não agora (dono, 2026-11-19). |
| **P-4** (bloqueante) | **Concursos inativos** (`exams.active = false`, curadoria): como aparecem? | Listados à parte, sem campo de peso, fora do total; o usuário não ativa nem desativa concurso (para tirar um concurso da conta, dá peso 0). Mantém `active` como dado de referência e evita uma segunda sobreposição. |  Aceita a recomendação: listados à parte, sem campo, fora do total (dono, 2026-11-19). |
| P-5 | **Concurso ativo sem peso** num conjunto personalizado (por exemplo, edital novo entrou no seed com `id` novo): vale 0 até o usuário ajustar, ou vale o peso padrão? | **Vale 0, com aviso** em Configurações (CA-26). Usar o padrão faria a soma passar de 100% sem o usuário saber; com 0, a soma fica abaixo e o aviso aponta o concurso. |  Aceita a recomendação: vale 0, com aviso (dono, 2026-11-19). |
| P-6 | **Histórico de mudanças de pesos?** | **Não.** Uso pessoal; o backup semanal guarda o estado; `updated_at` por linha basta. Reavaliar se o painel (módulo 7) quiser mostrar a evolução da prioridade. |  Aceita a recomendação: sem histórico (dono, 2026-11-19). |
| **P-7** (bloqueante) | **Efeito no mapa do edital:** prioridade, urgência, ordem das colunas da matriz e contribuições passam a usar os pesos do usuário, com o aviso "Pesos personalizados em uso"? | **Sim, tudo**, com o aviso e o link para Configurações (CA-35 a CA-37). A ordem por urgência muda junto, que é o objetivo pedido. |  Aceita a recomendação: sim, tudo, com aviso e link (dono, 2026-11-19). |
| P-8 | Seção **"Estudo"** (horas por dia, cota de infra, cartões novos por dia, retenção desejada) e **modo de IA**: editáveis já, só leitura, ou fora da tela até o módulo que os usa? | **Fora da tela por enquanto.** Sem consumidor, editar não tem efeito testável; cada spec (módulos 3, 4 e 8) acrescenta a sua seção à página, que já nasce preparada para isso. |  Aceita a recomendação: fora da tela por enquanto (dono, 2026-11-19). |
| P-9 | **Aparência:** manter o alternador na barra lateral e repeti-lo na página, ou levá-lo só para a página? | **Manter nos dois lugares.** O ADR-010 decidiu "Aparência" no rodapé da barra; tirá-la de lá exige um ADR novo que substitua essa parte. |  ~~Aceita a recomendação: nos dois lugares (dono, 2026-11-19).~~ **Alterada pelo dono em 2026-11-20: só na página** (seção "Aparência"); o alternador sai da barra lateral e do menu do celular. Registrado no [ADR-012](../adr/ADR-012-barra-lateral-com-icones-e-tema-so-em-configuracoes.md), que substitui essa parte do ADR-010. |
| P-10 | **Navegação:** "Configurações" como link sem número no rodapé da barra lateral (acima de "Aparência" e "Sair"), com ícone de engrenagem? | **Sim.** A numeração da barra é a dos módulos do doc 01, e Configurações não é um deles. |  Aceita a recomendação: sim (dono, 2026-11-19). |
| P-11 | **`v_topic_priority`:** passar a usar os pesos do usuário ou ficar como conferência dos pesos padrão? | **Conferência dos pesos padrão.** Ninguém lê a visão no código (o domínio calcula); levar a sobreposição para o SQL duplicaria a regra (ADR-011) e exigiria `auth.uid()` na visão. |  Aceita a recomendação: conferência dos pesos padrão (dono, 2026-11-19). |
| P-12 | **Seed da SPEC-004 no remoto:** aplicar já, num `db:push` a partir da `main` sem migração pendente (passo 0, que também responde se a CLI reaplica o seed), ou junto com a migração desta spec? | **Já, no passo 0.** Separa os riscos e responde a pendência do runbook antes da migração. Se a CLI não aplicar o seed sem migração pendente, ele vai junto no passo 3. |  Aceita a recomendação: já, no passo 0 (dono, 2026-11-19). |
| P-13 | **"Restaurar padrão" pede confirmação?** | **Sim**, com a confirmação na própria página (`?confirm=restore`, funciona sem JavaScript): apaga 14 valores ajustados. |  Aceita a recomendação: sim, na própria página (dono, 2026-11-19). |
| P-14 | **Concurso-alvo:** mudar o concurso-alvo deve mexer em algo automaticamente (peso, desmarcar "edital publicado")? | **Não.** Concurso-alvo e pesos são independentes; a caixa é gravada como enviada, e o banco impede "edital publicado" sem concurso-alvo. |  Aceita a recomendação: não (dono, 2026-11-19). |
| P-15 | Quer um **mockup estático** da tela antes de aprovar, como na SPEC-004? | **Não é necessário:** a tela usa a direção A (ADR-010) e componentes que já existem; o esboço de § 5.4 basta. Se preferir ver antes, o `especialista-frontend` faz o HTML em `docs/specs/assets/`. |  Aceita a recomendação: sem mockup (dono, 2026-11-19). |

## 9. Histórico
| Data | Mudança |
|---|---|
| 2026-11-19 | Criação. Rascunho do ADR-011 (proposto). |
| 2026-11-19 | Respostas do dono registradas: P-1 = (a) porcentagem somando 100%; P-2 = concurso-alvo e edital publicado nesta spec; P-4 e P-7 aceitas; P-3, P-5, P-6 e P-8 a P-15 aceitas como recomendado. Corpo ajustado aos valores decididos; alternativas descartadas movidas para § 7. Status segue `rascunho`, aguardando aprovação. |
| 2026-11-19 | Aprovada pelo dono. ADR-011 aceito. A implementação começa quando o dono pedir; ao começar, o status passa a `em-implementacao`. |
| 2026-11-19 | Início da implementação (a pedido do dono). |
| 2026-11-20 | Pedidos do dono sobre a casca, registrados antes do código no [ADR-012](../adr/ADR-012-barra-lateral-com-icones-e-tema-so-em-configuracoes.md) (aceito; substitui em parte o ADR-010): (1) o alternador de tema sai da barra lateral e do menu do celular e fica só em Configurações > Aparência (P-9 alterada); (2) o item atual mantém o ícone e é indicado pelo fundo (`ink` com `on-ink`, contraste de 3:1 com a barra nos dois temas, porque `ink-light` fica em 1,17:1 e 1,41:1) e por `aria-current`, sem bolha; (3) "Início" e "Mapa do edital" trocam os números por ícones (`House`, `Map`). Alterados: cabeçalho, § 2, § 3, CA-19, CA-30, CA-37, novos CA-40 e CA-41 (§ 4.6), § 5.1, § 5.2 (`NavigationItem` sem `number`), § 5.4 (esboço e barra lateral), § 5.6 (passo 7), § 6, § 7 e P-9. Artefatos fora desta spec a ajustar na implementação: SPEC-001 (CA-25, CA-28) e SPEC-004 (CA-36), só com nota no histórico; docs 05, 06 e 07, glossário (`gb-shell__rail-number`, `gb-shell__appearance`, bloco "Aparência" da barra), `design/components.css`, `tests/design/contrast.test.ts`, jornadas 7, 8 e 9, testes de `Shell` e `AppShell`, e o checklist do CA-15 da SPEC-002 em `docs/operacao/implantacao.md` (escolher "Escuro" em Configurações). |
| 2026-11-20 | Pedido do dono, registrado antes do código no [ADR-013](../adr/ADR-013-cabecalho-de-pagina-sem-sobretitulo.md) (aceito; substitui o item "Cabeçalho de página" do ADR-010 e a frase do ADR-012 sobre a numeração no sobretítulo): sai o sobretítulo acima do `h1` em todas as páginas ("Módulo 01" no mapa, "Assunto" no detalhe, "Preferências" em Configurações, "Acesso" no login), junto com o `hgroup` e a classe `gb-page-header__eyebrow`; o cabeçalho fica com `h1`, régua e resumo ou etiquetas à direita onde houver. Ficam o estilo `eyebrow` (rótulos curtos, rótulos de campo do login, cabeçalhos de coluna), a classe `gb-eyebrow` e a linha de marca do login. Motivo registrado no ADR: o sobretítulo vinha da metáfora da folha numerada (ADR-010), não informava nada a um usuário único e ficou incoerente depois que a barra perdeu os números (ADR-012). Alterados: cabeçalho, § 2, § 3, CA-19, CA-37, novos CA-42 e CA-43 (§ 4.7), § 5.1, § 5.4 (esboço, cabeçalho e telas do `topics` e do login) e § 6. Notas de status no ADR-010 e no ADR-012; nota no histórico da SPEC-001 e da SPEC-004. Artefatos fora desta spec a ajustar na implementação: `design/components.css`, `design/tokens.json` (exemplo e uso do `eyebrow`), `tests/design/contrast.test.ts` (só as descrições), jornadas 1, 8 e 9 com os *page objects* `LoginPage`, `TopicMapPage` e `SettingsPage`, testes de componente de `TopicMapView`, `TopicDetailView`, `settings/page` e `login/page`, doc 05 e glossário. |
| 2026-11-20 | Pedido do dono: os avisos de sucesso de Configurações ganham um botão X para fechar (`DismissibleNotice`, `gb-notice__close`, rótulo "Fechar aviso", Esc também fecha, o foco segue para o próximo controle); erro e informação continuam fixos. Um novo salvamento reexibe o aviso. Sem mudança de critério de aceite. |
| 2026-11-20 | Pedido do dono sobre a tabela de pesos: (1) o status da soma passa para baixo da tabela, fora do `tfoot`, e o número do total fica na coluna "Peso" (corrige o deslocamento por `colSpan`); (2) "Salvar" fica bloqueado na interface (`aria-disabled`) enquanto a soma não for 100%, com dica "A soma dos pesos deve ser 100%." no hover e no foco (e texto de ajuda sem hover); o servidor continua validando. Alterados: CA-20 (sem mudança), CA-21, CA-22, § 5.4 e `design/components.css`. Jornada 9 afetada (erro de soma só sem JavaScript ou com "Salvar" forçado). |
| 2026-11-20 | Pedido do dono (reverte a linha anterior sobre "erro e informação fixos"): todos os avisos da interface (erro com `role="alert"`, sucesso com `role="status"`, informação sem papel) ganham o botão X. `Notice` delega ao `DismissibleNotice` por padrão (`dismissible` padrão `true`, `resetKey` para avisos de ação); exceção: a pergunta de confirmação de "Restaurar padrão". Afeta CA-20, CA-22, CA-26, CA-32 e CA-35 só no sentido de que os avisos podem ser fechados; os textos e papéis não mudam. |
| 2026-11-20 | Pedido do dono: o aviso de pesos ("Pesos personalizados em uso" e "soma diferente de 100%"), depois de fechado no X, continua fechado ao recarregar e navegar, e volta só se os pesos forem alterados. Decisão do arquiteto: cookie por navegador (sem migração, sem tabela nova) com a impressão digital do conjunto de pesos (`weightsFingerprint`, domínio), ação `dismissWeightsNotice` e `onDismiss` opcional em `Notice`/`DismissibleNotice`. Alterados: CA-35, CA-36 e § 5.4. Jornadas 8 e 9 afetadas: o aviso de pesos some após fechado no mesmo contexto do navegador (limpar cookies ou usar contexto novo por teste). |
| 2026-11-20 | Revisão do `revisor-codigo` e ajuste da spec ao código implementado (sem mudança de comportamento): § 5.2 passa a registrar `ExamWeightsSummary.fingerprint`, `weightsFingerprint`, `TopicDetail = TopicMapEntry & { weights }`, `readExamCatalog`, `dismissWeightsNotice` e `weights-notice-cookie.ts`, `SelectFieldProps` com as opções em `children` e `PageSection.description` como `string`; CA-10 é "esquema + domínio" (`validateStudyTarget` também rejeita); registrado que o domínio não valida faixa nem precisão por valor (Zod e `check` do banco fazem). Docs 01 a 08, runbook de implantação, README e CHANGELOG atualizados (22 tabelas, glossário, jornada 9, `exam_weights.test.sql`). Status segue `em-implementacao`. |
| 2026-11-20 | Correções da revisão (formulários sem JavaScript): as Server Actions passam a chegar aos formulários como *props* de Server Components, sem embrulho no cliente; a restauração limpa `?confirm=restore` no sucesso (com JavaScript, `router.replace('/settings#exam-weights')`; sem JavaScript, redireciona para `/settings?restored=1#exam-weights`, com a mensagem pelo parâmetro). Alterados: CA-28, § 5.2 (contrato de `restoreDefaultWeights`) e § 5.4 (Sem JavaScript). Também: a região viva da soma anuncia o total junto do status ("135%: 35 pontos acima de 100%"); concurso-alvo salvo que ficou inativo aparece como "Nenhum"; seta da seleção nativa em `forced-colors`. |
| 2026-11-20 | Parecer final (sem mudança de comportamento além do item 1): a mensagem "Pesos padrão restaurados." por `?restored=1` só vale com os pesos padrão, para não aparecer junto de "Pesos salvos" depois de um salvamento sem JavaScript; as constantes de endereço de `/settings#exam-weights` ficam em `exam-weights-schema.ts`; `enhanced` é validado com Zod. § 5.1 passa a listar `ExamWeightsEditor.tsx`, `exam-catalog.ts`, `use-hydrated.ts` e `tests/factories/server-action.ts`, e o `index.ts` de `settings` exporta `saveStudyTarget`. |
| 2026-11-20 | Fechamento: revisão aprovada (sem bloqueantes); pgTAP 361, integração 184, E2E 216 sem falhas, 932 testes unitários e de componente. Status `concluida`. Pendente só a implantação em produção (CA-15, CA-39), feita pelo dono conforme o runbook. |
