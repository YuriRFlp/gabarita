# SPEC-004 — Mapa do edital

**Status:** em-implementacao · **Criada:** 2026-11-19 · **Atualizada:** 2026-11-19
**Módulo:** `src/modules/topics` (novo), `src/shared/ui`, `design/` · **ADRs relacionados:** ADR-003, ADR-004, ADR-005, ADR-006, ADR-007; [ADR-010](../adr/ADR-010-direcao-visual-folha-de-prova.md) (proposto, passa a valer com a aprovação desta spec)

## 1. Objetivo
Entregar o módulo 1 do MVP (`docs/01-visao-e-escopo.md` § Módulos do MVP): uma tela que mostra a taxonomia dos 38 assuntos e 218 subtópicos, a incidência de cada assunto nos 14 concursos-alvo, a prioridade calculada pela regra do doc 04 e o domínio por assunto, que hoje é sempre "não medido" porque ainda não há respostas. É a primeira tela com dado de estudo e a base de "Direção" do produto: o que estudar primeiro.

A spec inclui também o **redesenho visual da casca e do login** pedido pelo dono do projeto (a versão atual pareceu pouco profissional), na direção visual A, "Folha de prova", escolhida pelo dono entre duas propostas (§ 5.5, P-1, ADR-010). O mapa é desenhado já nessa direção, para não ser feito duas vezes.

## 2. Regras de origem
| Regra | Origem | Interpretação ou esclarecimento |
|---|---|---|
| Prioridade = Σ peso_alvo × incidência, de 0 a 1 | `docs/04-regras-de-estudo.md` § Prioridade de um assunto; `docs/03-modelo-de-dados.md` § Visões | Calculada em `domain/` (função pura) a partir de `exams.target_weight`, `exams.active` e `incidences.value`, porque a tela mostra a contribuição de cada concurso e o doc 06 põe regra de negócio no domínio. A visão `v_topic_priority` continua existindo e passa a ter pgTAP de valores; um teste de integração garante que domínio e visão dão o mesmo resultado (§ 7). Só concursos com `active = true` contribuem, como na visão. Incidência ausente vale 0. Sem normalização: a faixa 0–1 vale porque a soma dos pesos do seed é 1,000 (P-10). |
| Incidência 0, 0,5 ou 1 por assunto × concurso | `docs/03-modelo-de-dados.md` § Referência; `meta.incidence_scale` do JSON | Os rótulos "ausente", "parcial ou em nível de noções" e "cobrado com profundidade" vêm do JSON (ADR-004) e não estão no banco; entram como texto de interface, citando a origem. |
| Pesos por faixa e ordem dos concursos | `docs/01-visao-e-escopo.md` § Concursos-alvo e pesos | As faixas (`meta.priority_tiers`) não estão no banco. Ordenar por `target_weight` decrescente já reproduz a ordem das faixas, porque todo concurso de uma faixa pesa mais que qualquer um da seguinte; desempate pelo nome do tribunal (`court`, ordem numérica: TRT-2 antes de TRT-15). Agrupar visualmente por faixa exigiria migração (P-6). |
| Domínio = 0,5 × acerto firme + 0,5 × retenção média; sem respostas = 0 | `docs/04-regras-de-estudo.md` § Domínio de um assunto | Taxa de acerto firme calculada no domínio a partir de `answered` e `firm_correct` de `v_topic_performance` (sem o arredondamento de `mastery_rate`). "Sem respostas" = nenhuma linha na visão, isto é, nenhuma resposta nos últimos 60 dias; o domínio vale 0 e a interface diz "Sem respostas", não "0%". **Com respostas e sem nenhum cartão** (retenção média inexistente), o domínio é só a taxa de acerto firme (P-3; esclarecimento registrado no doc 04 § Domínio). Até o módulo 3 a retenção média não é calculada (P-4), então todo assunto medido cai nesse caso. |
| Acerto com "chute" não conta; janela de 60 dias | `docs/04-regras-de-estudo.md` § Domínio; `docs/07-estrategia-de-testes.md` § Casos obrigatórios | A janela e o filtro de chute estão na visão (`answered_at >= now() - interval '60 days'`), então os limites do dia 60 e do dia 61 são testados em pgTAP, não no domínio. Resposta em branco conta no total respondido e não é acerto (comportamento atual da visão; P-7). |
| Urgência = prioridade × (1 − domínio) | `docs/04-regras-de-estudo.md` § Escolha do assunto da vez | Só a fórmula entra aqui (`computeUrgency`), usada para ordenar o mapa (P-5). As exceções da escolha do assunto da vez (pós-edital, cota de infra, repetição) são do módulo 4 e ficam fora. |
| Fase `pre_notice`/`post_notice`, perfil `systems`/`infra`/`common` | `docs/03-modelo-de-dados.md` § Referência | Exibidos como etiquetas e filtros; nenhum bloqueio nesta spec. Assuntos gerais têm `profile` nulo e são rotulados "Geral". |
| Taxonomia vem do JSON versionado; seed gerado | ADR-004; `docs/03-modelo-de-dados.md` § Carga inicial | A tela só lê. Nenhuma edição de assunto, incidência ou peso pela interface. |
| RLS: referência legível por autenticado; respostas só do dono | ADR-005 | Já coberto pelo `rls.test.sql`. O repositório filtra `v_topic_performance` também por `user_id` (defesa adicional, sem custo, pensando no multiusuário). |
| Domínio puro, regras de dependência, resultado tipado | `docs/06-padroes-de-codigo.md` | O leitor que junta `data/` e `domain/` fica em `actions/` como função de servidor comum, sem `'use server'` (não vira endpoint). Interpretação a confirmar (P-9). |
| Componente novo entra em `design/` antes do código; AA, teclado, 360 px, acerto e erro com ícone e texto | `docs/05-identidade-visual.md`; `docs/06-padroes-de-codigo.md` § Interface | Toda informação codificada pela bolha (incidência, domínio) tem também texto, visível ou para leitor de tela. |
| Código em inglês, interface em português, termos do glossário | ADR-007; `docs/08-glossario.md` | Termos novos (mapa do edital, matriz de incidência, contribuição, taxa de acerto firme, retenção média e os tokens, classes e componentes da direção A) já estão no glossário como proposta (§ 3). Os rótulos de incidência são texto de interface em português, sem tradução fixa. |
| Pirâmide e cobertura ≥ 90% em `domain/` | `docs/07-estrategia-de-testes.md`; ADR-006 | Nova jornada E2E 8 (Mapa do edital) entra no doc 07. |

## 3. Escopo
**Dentro:**
- **Redesenho (fase 1, PR próprio, antes do mapa):** casca autenticada e `/login` na direção A "Folha de prova" (P-1); tokens e classes novos em `design/`; doc 05 atualizado; ADR-010 registra a direção (§ 5.5). As jornadas E2E 1 e 7 da SPEC-001 continuam passando sem mudar o que verificam.
- **Navegação:** item "Mapa do edital" (ícone Lucide `Map`) em `NAVIGATION_ITEMS`.
- **Rota `/topics`** (Mapa do edital): lista de assuntos com prioridade e domínio, alternável para a **matriz de incidência** (assuntos × concursos); filtros por grupo (específicos/gerais) e perfil (sistemas/infra/comum); ordenação por urgência (padrão), prioridade ou nome. Estado na URL (`?view=&category=&profile=&sort=`), funciona sem JavaScript.
- **Rota `/topics/[topicId]`** (detalhe do assunto): subtópicos em ordem, contribuição de cada concurso para a prioridade, domínio (com estado vazio) e urgência.
- **Domínio puro** em `src/modules/topics/domain/`: `computeTopicPriority`, `computeMastery`, `computeUrgency`, `buildTopicMap`, constantes dos enums sincronizadas com os tipos gerados.
- **Dados:** leitura de `topics`, `subtopics`, `exams` (+ nome da banca), `incidences` e `v_topic_performance`.
- **Componentes do design system** (em `design/components.css` e no doc 05 antes do código): `Bubble` (com o estado novo meia-bolha), `MasteryMeter` e `Tag` em React (já existiam só em CSS), variante `info` do `Notice` (a prop se chama `kind`, não `variant`), `EmptyState`, `IncidenceMatrix`, `TopicList`, `PriorityValue`, `FilterGroup` (grupo segmentado de links) e os componentes da casca redesenhada.
- **pgTAP novo** para os valores das visões `v_topic_priority` e `v_topic_performance` (hoje só o `security_invoker` e o isolamento são testados).
- **Documentação (entregáveis da implementação):** glossário (termos novos), doc 05 (direção visual, componentes, tokens), doc 06 (módulo `topics` na lista; leitores de servidor em `actions/`, P-9), doc 07 (jornada 8), doc 03 (cita o novo arquivo pgTAP em § Validação), `README.md`, `CHANGELOG.md` citando a SPEC-004. Já registrados como proposta junto com este rascunho (passam a valer com a aprovação): o esclarecimento do domínio sem cartões no doc 04 (P-3) e os termos novos no glossário, marcados "(SPEC-004, proposto)"; ao fechar a spec, a marca sai. O design system publicado no Claude é atualizado pelo dono a partir de `design/` (fora do repositório).

**Fora (fica para depois):**
- Cálculo da retenção média com `ts-fsrs` e o mapeamento cartão → assunto (cartão `question` via `question_topics`, `concept` via `subtopics.topic_id`): spec do módulo 3 (P-4).
- Escolha do assunto da vez e suas exceções (módulo 4). Observação para essa spec: o schema não tem hoje onde marcar "concurso-alvo com edital publicado", exigido pela exceção 1 do doc 04.
- Edição de pesos, ativação de concursos e escolha do concurso-alvo pela interface (configurações).
- Materiais, links oficiais e anotações por subtópico (módulo 9).
- Painel de desempenho e evolução no tempo (módulo 7).
- Página inicial com resumo do dia (ganha conteúdo com os módulos 3 e 4; nesta spec só herda a casca nova).
- Agrupamento dos concursos por faixa (P-6).

## 4. Critérios de aceite
### 4.1 Regras de domínio
| # | Dado / Quando / Então | Teste |
|---|---|---|
| CA-1 | Dado os 14 concursos ativos e as incidências do seed v0.2, quando calculo `computeTopicPriority` para cada um dos 38 assuntos, então o resultado é igual ao campo `priority` do mesmo assunto em `data/seed/court_it_taxonomy_v0.2.json` (tolerância 1e-9), inclusive `seg_aplicacoes` = 0,8325 e `arquitetura_computadores` = 0,065. | unitário |
| CA-2 | Dado um assunto com incidência 1 em todos os concursos ativos cujos pesos somam 1,000, quando calculo a prioridade, então ela é exatamente 1 (sem resíduo de ponto flutuante: `=== 1`), e quatro assuntos assim empatam exatamente entre si. | unitário |
| CA-3 | Dado um concurso com `active = false`, quando calculo a prioridade, então ele não contribui (contribuição 0, marcada `counted: false`), mas aparece na lista de contribuições; dado um par assunto × concurso sem linha em `incidences`, então a incidência vale 0; dado nenhum concurso ativo ou nenhuma incidência, então a prioridade é 0. | unitário |
| CA-4 | Dado um assunto, quando calculo a prioridade, então as contribuições vêm ordenadas por peso decrescente e, no empate, pelo nome do tribunal em ordem numérica (TRF-2, TRT-1, TRT-2, TRT-15), e a soma das contribuições contadas é igual à prioridade. | unitário |
| CA-5 | Dado um assunto sem linha em `v_topic_performance` (nenhuma resposta nos últimos 60 dias), quando calculo `computeMastery`, então o resultado é `{ kind: 'no_answers', value: 0 }`, mesmo que haja retenção média informada. | unitário |
| CA-6 | Dado `answered = 10` e `firmCorrect = 6`, quando calculo o domínio com retenção média 0,8, então `value = 0,5 × 0,6 + 0,5 × 0,8 = 0,7`; dado `firmCorrect = 0`, então `kind: 'measured'` com `firmCorrectRate = 0` (diferente de "sem respostas"). | unitário |
| CA-7 | Dado `answered = 10`, `firmCorrect = 6` e retenção média ausente (`null`, nenhum cartão), quando calculo o domínio, então `kind: 'measured'`, `value = firmCorrectRate = 0,6` e `averageRetention = null` (P-3); dado `answered = 4` e `firmCorrect = 4` sem cartões, então `value = 1` (sem teto de 50%); dado retenção média 0 (cartões existem e foram esquecidos), então ela entra na fórmula: `value = 0,5 × 0,6 + 0,5 × 0 = 0,3` (0 não é o mesmo que ausente). | unitário |
| CA-8 | Dado prioridade 0,89 e domínio 0, quando calculo `computeUrgency`, então é 0,89; com domínio 1, é 0; com domínio 0,25, é 0,6675. | unitário |
| CA-9 | Dado a lista de entradas do mapa, quando ordeno por `urgency` ou `priority`, então a ordem é decrescente pelo valor, com desempate por `sortOrder` crescente e depois `id`; por `name`, ordem alfabética pt-BR sem diferenciar acento e caixa. A ordem é a mesma em execuções repetidas. | unitário |
| CA-10 | Dado o filtro `category=general`, então só aparecem os 10 assuntos gerais; `profile=infra` mostra só os 7 específicos de perfil infra (assuntos gerais, sem perfil, ficam de fora); `category=general&profile=infra` resulta em lista vazia; `all` não filtra. O resumo devolve total geral (38) e total filtrado. | unitário |
| CA-11 | Dado `TOPIC_CATEGORIES`, `TOPIC_PROFILES` e `STUDY_PHASES` do domínio, quando comparo com os enums `topic_category`, `topic_profile` e `study_phase` de `database.types.ts`, então são iguais e na mesma ordem. | unitário |
| CA-12 | Dado parâmetros de URL ausentes, desconhecidos, repetidos (`?sort=a&sort=b`) ou com valor fora da lista, quando o esquema `topicMapQuerySchema` os lê, então cada parâmetro inválido cai no padrão (`view=list`, `category=all`, `profile=all`, `sort=urgency`) sem erro; `topicId` fora do formato `^[a-z0-9_]{1,64}$` leva ao 404 sem consultar o banco. | unitário |

### 4.2 Banco (sem migração)
| # | Dado / Quando / Então | Teste |
|---|---|---|
| CA-13 | Dado o banco recém-resetado com o seed, quando consulto `v_topic_priority`, então há 38 linhas, todas entre 0 e 1, com `pdpj_stack` = 1,000, `seg_aplicacoes` = 0,833 (arredondamento do `round` do Postgres), `legislacao_mg` = 0,140 e `arquitetura_computadores` = 0,065; ao marcar `trt3` como inativo na transação, `pdpj_stack` passa a 0,720; um assunto novo sem incidências tem prioridade 0. | pgTAP |
| CA-14 | Dado o usuário A com respostas em uma questão ligada a `pdpj_stack` e `redes`, quando consulto `v_topic_performance`, então: resposta em `now() - interval '60 days'` conta; em `now() - interval '60 days 1 second'` e em `now() - interval '61 days'` não conta; acerto com `guess` conta em `answered` e não em `firm_correct`; acerto com `doubt` e com `certain` contam em `firm_correct`; erro com `certain` não é acerto firme; resposta em branco conta em `answered` e não em `firm_correct`; a mesma resposta aparece nos dois assuntos da questão. | pgTAP |
| CA-15 | Dado o banco local com o seed, quando o repositório lê a fonte do mapa, então recebe 38 assuntos, 218 subtópicos, 14 concursos com o nome da banca e 532 incidências; e, para os 38 assuntos, a prioridade do domínio arredondada a milésimos (meio para cima, como o Postgres) é igual à coluna `priority` de `v_topic_priority`. | integração |
| CA-16 | Dado o usuário A com respostas e o usuário B com outras respostas, quando o mapa é lido com a sessão de A, então o domínio reflete só as respostas de A. | integração |
| CA-17 | Dado falha do Supabase em qualquer das leituras (cliente simulado), quando `getTopicMap` ou `getTopicDetail` roda, então devolve `{ ok: false, error: 'load_failed' }` sem lançar exceção e sem detalhe técnico. | integração (cliente simulado) |

### 4.3 Interface do mapa
| # | Dado / Quando / Então | Teste |
|---|---|---|
| CA-18 | Dado o usuário logado, quando aciona "Mapa do edital" na navegação, então chega em `/topics`, o item fica com `aria-current="page"` (também em `/topics/<id>`), o título da página é "Mapa do edital" e a lista mostra os 38 assuntos com nome, etiqueta de perfil ou "Geral", etiqueta "Pós-edital" quando `phase = 'post_notice'`, prioridade com duas casas em pt-BR ("0,89"), domínio e número de subtópicos. | E2E (jornada 8) + componente |
| CA-19 | Dado um usuário sem nenhuma resposta, quando abre `/topics`, então vê o aviso informativo "Domínio ainda não medido" explicando que começa em 0 e passa a ser calculado com respostas dos últimos 60 dias, cada assunto mostra "Sem respostas" com as cinco bolhas vazias (nunca "0%"), e a ordem padrão por urgência coincide com a ordem por prioridade. | E2E (jornada 8) + componente |
| CA-20 | Dado um usuário com respostas em parte dos assuntos (criadas por fábrica), quando abre `/topics`, então os assuntos medidos mostram a porcentagem inteira ("70%") e as bolhas preenchidas por `round(valor × 5)`, os demais continuam "Sem respostas", o aviso de CA-19 não aparece e a ordem por urgência reflete o domínio. | E2E (jornada 8) + componente |
| CA-21 | Dado `/topics`, quando escolho grupo, perfil, ordenação ou a visão "Matriz", então a URL muda para refletir a escolha, os outros parâmetros são preservados, a opção escolhida fica com `aria-current="true"`, a contagem "Mostrando N de 38 assuntos" é atualizada numa região `aria-live="polite"`, e recarregar a página mantém o estado. Com JavaScript desligado, os filtros continuam funcionando (são links). | E2E (jornada 8) + componente |
| CA-22 | Dado filtros que resultam em lista vazia (`category=general&profile=infra`), quando a página carrega, então aparece o estado vazio "Nenhum assunto com esses filtros." com o link "Limpar filtros" para `/topics`. | componente + E2E (jornada 8) |
| CA-23 | Dado a visão "Matriz", então há uma tabela com legenda (`caption`), uma coluna por concurso na ordem de CA-4 com cabeçalho curto visível ("TRT-3") e nome completo, banca, ano e peso disponíveis ao leitor de tela, uma linha por assunto com cabeçalho de linha que leva ao detalhe, e cada célula com bolha cheia, meia ou vazia **e** o texto "cobrado com profundidade", "parcial ou em nível de noções" ou "ausente" (oculto visualmente, lido pelo leitor de tela); a legenda das três bolhas aparece visível acima da tabela. | componente + E2E (jornada 8, axe) |
| CA-24 | Dado a matriz em 360 px, então a página não tem rolagem horizontal (`scrollWidth ≤ 360`); a tabela rola dentro de uma região com `role="region"`, nome acessível e `tabindex="0"`, alcançável e rolável pelo teclado, com a coluna dos assuntos fixa à esquerda. | E2E (jornada 8, projeto `mobile`) |
| CA-25 | Dado o detalhe `/topics/pdpj_stack`, então vejo o nome como `h1`, as etiquetas, os 12 subtópicos em lista ordenada na ordem do seed, a prioridade 1,00 com a tabela de contribuição dos 14 concursos (concurso com banca e ano, peso, incidência com bolha e texto, contribuição) e a linha de total igual à prioridade, a seção de domínio e a urgência; em `/topics/seg_infra`, TJMG aparece com meia-bolha e "Noções" e contribuição 0,07. | E2E (jornada 8) + componente |
| CA-26 | Dado o detalhe de um assunto sem respostas, então a seção "Domínio" mostra o estado vazio "Você ainda não respondeu questões deste assunto nos últimos 60 dias. Para a urgência, o domínio conta como 0." e nenhuma porcentagem; com respostas, mostra a porcentagem, "N respostas, M acertos firmes (chutes não contam)" e a retenção média como "ainda não calculada", com a nota "Sem cartões, o domínio é a taxa de acerto firme." (até o módulo 3, P-3 e P-4). | componente + E2E (jornada 8) |
| CA-27 | Dado um `topicId` inexistente (`/topics/nao_existe`) ou fora do formato (`/topics/..%2F`), quando acesso, então vejo a página 404 em português dentro da casca, com status HTTP 404 nas duas URLs. | E2E (jornada 8) + unitário (CA-12) |
| CA-28 | Dado falha ao carregar (CA-17), quando abro `/topics` ou o detalhe, então vejo o aviso de erro "Não foi possível carregar o mapa do edital. Tente de novo em instantes." com o link "Tentar de novo" para o mesmo endereço, sem detalhe técnico; dado a taxonomia vazia (seed não carregado), vejo o estado vazio "A taxonomia ainda não foi carregada." | componente |
| CA-29 | Dado a navegação entre filtros ou para o detalhe, enquanto o servidor responde, então a página responde completa, sem `loading.tsx` nem Suspense (as tabelas são pequenas): os filtros funcionam sem JavaScript e o 404 de assunto inexistente responde com status HTTP 404, não 200. Há um único `h1` por página. | E2E (jornada 8) |
| CA-30 | Dado `/topics` (lista e matriz) e `/topics/pdpj_stack`, quando uso só o teclado, então alcanço em ordem lógica os filtros, cada assunto e a região da matriz, com foco visível em todos, e `Enter` abre o detalhe. | E2E (jornada 8) |
| CA-31 | Dado `/topics` (lista e matriz), `/topics/pdpj_stack` e o estado vazio de filtros, nos temas claro e escuro, quando o axe analisa, então não há violação séria nem crítica (inclui contraste). | E2E (jornada 8) |
| CA-32 | Dado viewport de 360 px, quando abro `/topics` e `/topics/pdpj_stack`, então não há rolagem horizontal da página, nomes longos (no seed, até 49 caracteres em assuntos e 57 em subtópicos) quebram linha sem cortar, e todo alvo de toque (filtros, links de assunto, menu) tem pelo menos 44 × 44 px. | E2E (jornada 8, projeto `mobile`) |

### 4.4 Design system e redesenho
| # | Dado / Quando / Então | Teste |
|---|---|---|
| CA-33 | Dado os componentes `Bubble`, `MasteryMeter`, `Tag`, `Notice` (`info`), `EmptyState`, `PriorityValue` e `FilterGroup`, quando renderizados, então aplicam as classes `gb-` de `design/components.css`; `Bubble` com `fill` `empty`, `half` e `filled`; `MasteryMeter` com valor nulo mostra "Sem respostas" e cinco bolhas vazias, com 0,7 mostra "70%" e quatro cheias (0,1 → 1; 0,5 → 3; 0,95 → 5), e as bolhas ficam ocultas ao leitor de tela (`aria-hidden`), que lê só o texto. | componente |
| CA-34 | Dado os tokens novos ou alterados da direção A (§ 5.5: raios, `rule`, `space-5/10/12`, estilo `eyebrow`), quando rodo `npm run tokens`, então `tokens.css` é regenerado e o teste de sincronia passa; e todo par texto/fundo novo atinge 4,5:1 (texto) ou 3:1 (bordas de controle, bolhas e ícones) nos dois temas, conferido por teste unitário de contraste sobre `design/tokens.json`. | unitário |
| CA-35 | Dado o redesenho da casca e do login, quando rodo as jornadas 1 e 7 da SPEC-001 (login, acesso negado, logout, teclado, tema, 360 px, axe, 404), então todas passam sem afrouxar nenhuma verificação; mudanças só em seletores ou page objects são permitidas. | E2E (jornadas 1 e 7) |
| CA-36 | Dado a casca redesenhada em largura ≥ 1024 px, então a navegação fica numa barra lateral fixa que comporta os 9 módulos do MVP sem quebra, itens numerados como linhas da folha ("00 Início", "01 Mapa do edital", na numeração dos módulos do doc 01) e o item atual marcado por `aria-current="page"`, por fundo `ink-light` e por um indicador que não depende de cor (o número dá lugar a uma bolha pequena preenchida); as marcas de sincronismo são `aria-hidden` e não recebem foco; abaixo de 1024 px, vale o botão "Menu" atual (`aria-expanded`, `Esc` fecha e devolve o foco); o alternador de tema e "Sair" continuam alcançáveis nas duas larguras. | E2E (jornada 7) + componente (`Shell`) |
| CA-37 | Dado `/login` redesenhado, em desktop e em 360 px, então mantém os mesmos campos, rótulos, mensagens e estados da SPEC-001 (CA-13 a CA-18 dela); o painel de marca (direção A: textura de grade, marcas de sincronismo, a promessa e as três linhas da folha) tem ornamentos `aria-hidden`, texto real em HTML e nenhum texto em imagem; em 360 px o painel vira uma faixa curta acima do formulário e o botão "Entrar" aparece sem rolar na viewport 360 × 800. | E2E (jornada 1) + componente |

## 5. Design técnico

### 5.1 Arquivos por camada
| Camada | Arquivo | Criar/Alterar | Responsabilidade |
|---|---|---|---|
| domain | `src/modules/topics/domain/topic-map-types.ts` | Criar | Tipos e constantes (`TOPIC_CATEGORIES`, `TOPIC_PROFILES`, `STUDY_PHASES`, `INCIDENCE_VALUES`) |
| domain | `src/modules/topics/domain/priority.ts` (+ `.test.ts`, `priority-seed.test.ts`) | Criar | `computeTopicPriority` em aritmética inteira (milésimos × meios) e contribuições ordenadas (CA-1 a CA-4) |
| domain | `src/modules/topics/domain/mastery.ts` (+ `.test.ts`) | Criar | `computeMastery` (CA-5 a CA-7) |
| domain | `src/modules/topics/domain/urgency.ts` (+ `.test.ts`) | Criar | `computeUrgency` (CA-8) |
| domain | `src/modules/topics/domain/topic-map.ts` (+ `.test.ts`) | Criar | `buildTopicMap` e `buildTopicDetail`: junta, filtra, ordena e resume (CA-9, CA-10) |
| data | `src/modules/topics/data/enums-sync.test.ts` | Criar | CA-11 (fica em `data/` porque lê o banco; divergência registrada em § 9) |
| domain | `src/modules/topics/domain/index.ts` | Criar | Reexporta só funções e tipos puros (para os módulos 3, 4 e 7); `index.ts` do módulo exporta também o tipo `LoadResult` |
| data | `src/modules/topics/data/topics-repository.ts` (+ `.int.test.ts`) | Criar | `readTopicMapSource(client, userId)`: 4 leituras em paralelo, mapeamento snake_case → tipos do domínio, guarda dos valores de incidência; leituras com `count: 'exact'` e `load_failed` quando o PostgREST trunca em 1000 linhas (CA-15 a CA-17) |
| actions | `src/modules/topics/actions/topic-map-query-schema.ts` (+ `.test.ts`) | Criar | Zod para `searchParams` e `topicId` (CA-12) |
| actions | `src/modules/topics/actions/get-topic-map.ts` (+ `.int.test.ts`) | Criar | `getTopicMap` e `getTopicDetail`: leitores de servidor sem `'use server'` que chamam `data/` e `domain/` (P-9) |
| components | `src/modules/topics/components/TopicMapView.tsx` (+ `.test.tsx`) | Criar | Cabeçalho, resumo, aviso de domínio não medido, filtros, lista ou matriz, estados vazio e erro |
| components | `src/modules/topics/components/TopicMapFilters.tsx` (+ `.test.tsx`) | Criar | Grupos de links (visão, grupo, perfil, ordenação) que preservam os outros parâmetros |
| components | `src/modules/topics/components/TopicList.tsx` (+ `.test.tsx`) | Criar | Lista (tabela no desktop, itens empilhados no celular) |
| components | `src/modules/topics/components/IncidenceMatrix.tsx` (+ `.test.tsx`) | Criar | Matriz em região rolável com coluna fixa (CA-23, CA-24) |
| components | `src/modules/topics/components/TopicDetailView.tsx` (+ `.test.tsx`) | Criar | Detalhe: subtópicos, contribuições, domínio, urgência (CA-25, CA-26) |
| components | `src/modules/topics/components/format.ts` (+ `.test.ts`) | Criar | Formatação pt-BR (`0,89`, `0,025`, `70%`) e rótulo curto do tribunal ("TRT-3 (MG)" → "TRT-3") |
| módulo | `src/modules/topics/index.ts` | Criar | API pública (§ 5.2) |
| shared/ui | `Bubble.tsx`, `MasteryMeter.tsx`, `Tag.tsx`, `EmptyState.tsx`, `PriorityValue.tsx`, `FilterGroup.tsx` (+ testes) | Criar | Componentes do design system (CA-33) |
| shared/ui | `Notice.tsx` (+ teste) | Alterar | Variante `info` (prop `kind`) |
| shared/ui | `Shell.tsx` (+ teste), `index.ts` | Alterar | Casca redesenhada (CA-36) |
| app | `src/app/(app)/topics/page.tsx` | Criar | Lê `searchParams`, chama `getTopicMap`, renderiza `TopicMapView` |
| app | `src/app/(app)/topics/[topicId]/page.tsx` | Criar | Valida `topicId`, chama `getTopicDetail`, `notFound()` quando não existe; `generateMetadata` com o nome do assunto |
| app | `src/app/(app)/navigation.tsx` | Alterar | Item "Mapa do edital" |
| app | `src/app/(public)/login/page.tsx`, `src/app/logo.tsx` | Alterar | Login redesenhado (CA-37); `logo.tsx` não mudou |
| design | `design/tokens.json`, `design/components.css` | Alterar | Tokens e classes da direção A (§ 5.5) e dos componentes novos (antes do código) |
| design | `src/shared/ui/styles/tokens.css` | Regenerar | `npm run tokens` |
| testes | `supabase/tests/topic_views.test.sql` | Criar | CA-13, CA-14 |
| testes | `tests/factories/topic-map-entries.ts` | Criar | Entradas do mapa (`makeEntry`, `EXAMS`) para os testes de componente; fica em `tests/factories/` e não em `components/` |
| testes | `tests/factories/answers.ts` | Criar | Questão + `question_topics` + respostas para um usuário (cliente admin local) |
| testes | `tests/e2e/journey-08-topic-map.spec.ts`, `tests/e2e/pages/TopicMapPage.ts`, `tests/e2e/data/answers.ts` | Criar | Jornada 8 |
| testes | `tests/e2e/pages/LoginPage.ts`, `HomePage.ts` | Alterar (se preciso) | Seletores da casca e do login novos (CA-35) |
| testes | `tests/design/contrast.test.ts` | Criar | CA-34 |
| docs | glossário, docs 03, 04, 05, 06, 07, `README.md`, `CHANGELOG.md`, `docs/adr/ADR-010-direcao-visual-folha-de-prova.md` (já redigido, proposto) | Alterar/Criar | § 3 |

### 5.2 Contratos

```ts
// src/modules/topics/domain/topic-map-types.ts
export const TOPIC_CATEGORIES = ['specific', 'general'] as const;
export const TOPIC_PROFILES = ['systems', 'infra', 'common'] as const;
export const STUDY_PHASES = ['pre_notice', 'post_notice'] as const;
export const INCIDENCE_VALUES = [0, 0.5, 1] as const;

export type TopicCategory = (typeof TOPIC_CATEGORIES)[number];
export type TopicProfile = (typeof TOPIC_PROFILES)[number];
export type StudyPhase = (typeof STUDY_PHASES)[number];
export type IncidenceValue = (typeof INCIDENCE_VALUES)[number];

export type Subtopic = { id: string; name: string; sortOrder: number };
export type Topic = {
  id: string;
  name: string;
  category: TopicCategory;
  profile: TopicProfile | null;
  phase: StudyPhase;
  sortOrder: number;
  subtopics: ReadonlyArray<Subtopic>;
};
export type Exam = {
  id: string;
  court: string;          // "TRT-3 (MG)"
  year: number;
  examBoardName: string;  // "Fumarc"
  targetWeight: number;   // 0..1, at most 3 decimals (numeric(4,3))
  active: boolean;
};
export type Incidence = { examId: string; topicId: string; value: IncidenceValue };
/** One row of v_topic_performance for the current user (last 60 days). */
export type TopicPerformance = { topicId: string; answered: number; firmCorrect: number };

export type TopicMapSource = {
  topics: ReadonlyArray<Topic>;
  exams: ReadonlyArray<Exam>;
  incidences: ReadonlyArray<Incidence>;
  performance: ReadonlyArray<TopicPerformance>;
};
```

```ts
// src/modules/topics/domain/priority.ts
export type PriorityContribution = {
  exam: Exam;
  incidence: IncidenceValue;   // 0 when there is no row in incidences
  contribution: number;        // targetWeight × incidence; 0 when not counted
  counted: boolean;            // false for inactive exams
};
export type TopicPriority = {
  topicId: string;
  priority: number;            // 0..1 when active weights sum to 1
  contributions: ReadonlyArray<PriorityContribution>; // weight desc, then court (numeric collation)
};
/**
 * docs/04 § Prioridade. Summed as integers (weight in thousandths × incidence in halves) so that
 * ties are exact and 1 is exactly 1.
 */
export function computeTopicPriority(
  topicId: string,
  exams: ReadonlyArray<Exam>,
  incidences: ReadonlyArray<Incidence>,
): TopicPriority;
```

```ts
// src/modules/topics/domain/mastery.ts
export type Mastery =
  | { kind: 'no_answers'; value: 0 }
  | {
      kind: 'measured';
      value: number;                    // 0..1
      answered: number;
      firmCorrect: number;
      firmCorrectRate: number;          // firmCorrect / answered
      averageRetention: number | null;  // null = no cards: value = firmCorrectRate (P-3)
    };
/**
 * docs/04 § Domínio. A topic without answers in the last 60 days has mastery 0; with answers and
 * no cards, the missing retention is left out instead of counted as 0 or 1.
 */
export function computeMastery(
  performance: TopicPerformance | undefined,
  averageRetention: number | null,
): Mastery;

// src/modules/topics/domain/urgency.ts
/** docs/04 § Escolha do assunto da vez: priority × (1 − mastery). */
export function computeUrgency(priority: number, mastery: number): number;
```

```ts
// src/modules/topics/domain/topic-map.ts
export const TOPIC_MAP_VIEWS = ['list', 'matrix'] as const;
export const TOPIC_MAP_SORTS = ['urgency', 'priority', 'name'] as const;
export type TopicMapQuery = {
  view: (typeof TOPIC_MAP_VIEWS)[number];
  category: TopicCategory | 'all';
  profile: TopicProfile | 'all';
  sort: (typeof TOPIC_MAP_SORTS)[number];
};
export type TopicMapEntry = {
  topic: Topic;
  priority: TopicPriority;
  mastery: Mastery;
  urgency: number;
};
export type TopicMap = {
  query: TopicMapQuery;
  entries: ReadonlyArray<TopicMapEntry>;   // filtered and sorted
  exams: ReadonlyArray<Exam>;              // matrix column order (same as contributions)
  totals: { topics: number; subtopics: number; exams: number; shown: number; measured: number };
};
export function buildTopicMap(source: TopicMapSource, query: TopicMapQuery): TopicMap;
export function buildTopicDetail(source: TopicMapSource, topicId: string): TopicMapEntry | null;
```

```ts
// src/modules/topics/actions/topic-map-query-schema.ts
import { z } from 'zod';
export const topicMapQuerySchema = z.object({
  view: z.enum(TOPIC_MAP_VIEWS).catch('list'),
  category: z.enum(['all', ...TOPIC_CATEGORIES]).catch('all'),
  profile: z.enum(['all', ...TOPIC_PROFILES]).catch('all'),
  sort: z.enum(TOPIC_MAP_SORTS).catch('urgency'),
});
export const topicIdSchema = z.string().regex(/^[a-z0-9_]{1,64}$/);
export function parseTopicMapQuery(searchParams: Record<string, string | string[] | undefined>): TopicMapQuery;
```

```ts
// src/modules/topics/data/topics-repository.ts
export type LoadResult<T> = { ok: true; value: T } | { ok: false; error: 'load_failed' };
export function readTopicMapSource(
  client: SupabaseServerClient,
  userId: string,
): Promise<LoadResult<TopicMapSource>>;
// Queries (in parallel):
//   topics:      id, name, category, profile, phase, sort_order, subtopics(id, name, sort_order)
//   exams:       id, court, year, target_weight, active, exam_boards(name)
//   incidences:  exam_id, topic_id, value
//   v_topic_performance: topic_id, answered, firm_correct  .eq('user_id', userId)

// src/modules/topics/actions/get-topic-map.ts  (server only, no 'use server')
export function getTopicMap(client, userId, query: TopicMapQuery): Promise<LoadResult<TopicMap>>;
export function getTopicDetail(
  client, userId, topicId: string,
): Promise<LoadResult<{ entry: TopicMapEntry; exams: ReadonlyArray<Exam> } | null>>; // null → 404

// src/modules/topics/index.ts
export { getTopicMap, getTopicDetail } from './actions/get-topic-map';
export { parseTopicMapQuery, topicIdSchema } from './actions/topic-map-query-schema';
export { TopicMapView } from './components/TopicMapView';
export { TopicDetailView } from './components/TopicDetailView';
export type { TopicMap, TopicMapEntry, Mastery } from './domain';
```

```ts
// src/shared/ui (novos)
type BubbleProps = { fill: 'empty' | 'half' | 'filled'; size?: 'small' | 'regular'; label?: string };
type MasteryMeterProps = { value: number | null };              // null = "Sem respostas"
type TagProps = { variant?: 'default' | 'new' | 'overdue' | 'phase'; children: ReactNode };
type EmptyStateProps = { title: string; children?: ReactNode; action?: ReactNode };
type PriorityValueProps = { value: number };                    // "0,89" + bar 0..1
type FilterGroupProps = {
  label: string;                                                // visible group label
  options: ReadonlyArray<{ label: string; href: string; current: boolean }>;
};
type NoticeProps = { kind: 'error' | 'success' | 'info'; /* … as today */ };
```

Valores de exibição:
- Bolhas do domínio: `round(valor × 5)`, limitado a 0–5; `null` → 0 bolhas e "Sem respostas".
- Prioridade e urgência: duas casas; pesos: até três casas, sem zeros à direita ("0,28", "0,025"); contribuição: duas casas.
- Rótulo curto do tribunal: texto de `court` antes do primeiro " (" ("TRF-4 (RS/SC/PR)" → "TRF-4").
- Rótulos de incidência (do `meta.incidence_scale` do JSON): longo para leitor de tela e legenda ("cobrado com profundidade", "parcial ou em nível de noções", "ausente"); curto visível no detalhe ("Profundidade", "Noções", "Ausente").

### 5.3 Banco
**Nenhuma migração nova.** Verificado contra `20261116000000_initial_schema.sql`:

| Necessidade da tela | Onde está |
|---|---|
| Assuntos, grupo, perfil, fase, ordem | `topics` |
| Subtópicos e ordem | `subtopics` (`sort_order` gerado pelo `generate_seed.py`) |
| Concursos, tribunal, ano, banca, peso, ativo | `exams` + `exam_boards.name` |
| Incidência | `incidences` (532 = 38 × 14, matriz completa no seed) |
| Domínio (respostas firmes, 60 dias) | `v_topic_performance` |
| Prioridade (conferência) | `v_topic_priority` |
| RLS | Já ativa e testada (`rls.test.sql`): referência legível por autenticado; visão de desempenho com `security_invoker` |

O que **não** está no banco e não é necessário: as faixas de prioridade (a ordem por peso as reproduz; agrupar exige migração, P-6) e os rótulos da escala de incidência (texto de interface). Índices: a tela lê tabelas de referência pequenas inteiras; `v_topic_performance` usa `idx_answers_user_answered` e `idx_question_topics_topic`. Nada a acrescentar.

Testes novos sem mudar o schema: `supabase/tests/topic_views.test.sql` (CA-13, CA-14), na mesma convenção dos existentes (transação com `rollback`, usuários fictícios em `auth.users`).

Observação para outra tarefa (não bloqueia esta spec): o `generate_seed.py` faz `on conflict (id) do update set name, phase` em `topics`; se uma versão nova do JSON mudar `profile`, `category` ou a ordem de um assunto existente, o banco já semeado não acompanha. O mapa exibiria o perfil antigo. Correção trivial no gerador (incluir as colunas no `do update`), proposta como ajuste pontual fora desta spec (P-11).

### 5.4 Interface

Estrutura das telas; a aparência (réguas, raios, tipografia de títulos, numeração) segue a direção A (§ 5.5).

**`/topics` — desktop (≥ 1024 px)**
```
┌ casca ─────────┬─────────────────────────────────────────────────────────────────┐
│▪ ● Gabarita    │ MÓDULO 01                            38 assuntos · 218 subtópicos│
│▪               │ Mapa do edital                                     · 14 concursos│
│▪ 00 Início     │ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│▪ ●  Mapa do    │ Ver [Lista|Matriz]  Grupo [Todos|Específicos|Gerais]             │
│▪    edital     │ Perfil [Todos|Sistemas|Infra|Comum]  Ordenar [Urgência|Prioridade│
│▪               │ |Nome]                               Mostrando 38 de 38 assuntos │
│                │ ┌ i Domínio ainda não medido. Começa em 0 e passa a ser ───────┐ │
│                │ │   calculado quando houver respostas nos últimos 60 dias.     │ │
│                │ └──────────────────────────────────────────────────────────────┘ │
│                │ Assunto                         Prioridade  Domínio       Subt.  │
│                │ Stack da PDPJ-Br  [Sistemas]    1,00 ████   ○○○○○ Sem resp.  12  │
│                │ Língua Portuguesa [Geral]       1,00 ████   ○○○○○ Sem resp.   6  │
│                │ Legislação própria do tribunal  0,89 ███▌   ○○○○○ Sem resp.   3  │
│ Aparência      │   [Geral] [Pós-edital]                                           │
│ Sair           │ …                                                                │
└────────────────┴─────────────────────────────────────────────────────────────────┘
```
- Lista como `<table>` (cabeçalhos de coluna, nome do assunto como link no cabeçalho de linha). Em < 768 px, a MESMA `<table>` é reempilhada por CSS (não há `<ul>`; requer checagem manual de leitor de tela no Safari/VoiceOver): nome (link), etiquetas, "Prioridade 1,00" e domínio numa segunda linha.
- Filtros: `FilterGroup` (grupo de links com aparência de `gb-segmented`, rótulo visível, `aria-current="true"` na opção ativa). No celular, os grupos quebram linha; nenhum excede 360 px (o maior, Perfil, tem 4 opções curtas).
- A contagem "Mostrando N de 38 assuntos" fica em `<p aria-live="polite">`.

**Matriz (`?view=matrix`)**
```
Legenda: ● cobrado com profundidade   ◐ parcial ou em nível de noções   ○ ausente
┌ região rolável (tabindex=0, "Matriz de incidência por concurso") ───────────────┐
│ Assunto            │TRT-3│TRF-6│TJMG│TRF-2│TRT-1│TRT-2│TRT-15│TRF-4│ … │TJSC│   │
│                    │0,28 │0,18 │0,14│0,05 │0,05 │0,05 │0,05  │0,04 │   │0,015│  │
│ Stack da PDPJ-Br   │  ●  │  ●  │ ●  │  ●  │  ●  │  ●  │  ●   │  ●  │   │ ●  │   │
│ Segurança de infra │  ●  │  ○  │ ◐  │  ●  │  ●  │  ●  │  ●   │  ●  │   │ ○  │   │
└──────────────────────────────────────────────────────────────────────────────────┘
```
- `<table>` com `<caption>`, `<th scope="col">` por concurso (rótulo curto visível + nome completo, banca, ano e peso em `gb-visually-hidden`), `<th scope="row">` com link para o detalhe, células com `Bubble` + texto oculto visualmente. Primeira coluna `position: sticky`. Mesmos filtros e ordem da lista.

**`/topics/[topicId]`**
```
← Mapa do edital
Stack da PDPJ-Br                          [Sistemas]
Prioridade 1,00 · Urgência 1,00 · Domínio: sem respostas

Prioridade                               (prioridade = Σ peso × incidência)
 Concurso                        Incidência        Contribuição
 TRT-3 (MG) · Fumarc 2022 · 0,28  ● Profundidade        0,28
 TRF-6 (MG) · Cebraspe 2024 · 0,18 ● Profundidade       0,18
 …
 Total                                                  1,00

Domínio
 ┌ ○ Você ainda não respondeu questões deste assunto nos últimos 60 dias. ┐
 │   Para a urgência, o domínio conta como 0.                              │
 └─────────────────────────────────────────────────────────────────────────┘

Subtópicos (12)
 1. Java   2. Spring Boot/Cloud   3. Eureka …
```
- Tabela de contribuições com 3 colunas em todas as larguras (concurso com banca, ano e peso na mesma célula), cabe em 360 px.
- Concurso inativo (não acontece no seed): linha com etiqueta "Inativo" e contribuição "—".

**Estados**
| Estado | `/topics` | Detalhe |
|---|---|---|
| Carregando | Sem estado de carregamento: a página responde completa (tabelas pequenas); o streaming do Suspense esconderia o conteúdo sem JavaScript e faria o 404 responder 200 | Idem |
| Vazio (sem respostas) | `Notice` `info` "Domínio ainda não medido" + "Sem respostas" em cada linha (CA-19) | `EmptyState` na seção Domínio (CA-26) |
| Vazio (filtros) | `EmptyState` "Nenhum assunto com esses filtros." + "Limpar filtros" (CA-22) | — |
| Vazio (sem taxonomia) | `EmptyState` "A taxonomia ainda não foi carregada." (CA-28) | 404 |
| Erro | `Notice` `error` + link "Tentar de novo" (CA-28) | Idem |
| Sucesso | Lista ou matriz | Detalhe |
| Não encontrado | — | `notFound()` → 404 da casca (CA-27) |

**Teclado e leitores de tela:** sem atalhos próprios; ordem de tabulação natural (filtros → contagem → assuntos). Região da matriz focável e rolável por setas. Títulos: `h1` da página, `h2` por seção do detalhe. `prefers-reduced-motion` respeitado (só transições de cor já condicionadas).

### 5.5 Redesenho: direção A "Folha de prova" (escolhida em P-1, ADR-010)

**Diagnóstico da versão atual.** A casca é um cabeçalho com links de texto que não comporta os 9 módulos do MVP (com 4 ou 5 itens, o alternador de tema e "Sair" já disputam espaço); o alternador de tema ocupa o lugar mais nobre da tela para uma ação rara; o login é um cartão genérico sem nenhum sinal do produto; títulos e corpo têm pouca diferença de peso e não há escala tipográfica de apoio (sobretítulo, números tabulares); o conceito "folha de respostas" do doc 05 não aparece em lugar nenhum além do logo.

**Ideia.** A interface é a própria folha óptica da prova: plana, sem sombras, réguas de 1–2 px em `graphite` separando seções, cantos quase retos. A bolha é a única forma redonda da tela, o que a deixa ainda mais forte como assinatura.

**Estrutura**
- **Casca:** barra lateral fixa a partir de 1024 px (abaixo disso continua o botão "Menu" atual), em `paper` com régua de 1 px à direita. Itens numerados como linhas da folha, na numeração dos módulos do doc 01 ("00 Início", "01 Mapa do edital"…), em números tabulares. Item atual: fundo `ink-light`, texto `ink-strong` e o número substituído por uma bolha pequena preenchida (indicador que não depende de cor, CA-36). Marcas de sincronismo (retângulos de grafite da borda da folha de leitura óptica) como ornamento na borda esquerda, `aria-hidden`. "Aparência" (alternador) e "Sair" no rodapé da barra lateral.
- **Cabeçalho de página:** sobretítulo `eyebrow` ("Módulo 01") + `h1` em Schibsted Grotesk 800 + régua grossa (2 px, `rule`) abaixo; metadados à direita em números tabulares.
- **Login:** duas colunas no desktop. Painel de marca com textura de grade em `grid-light` (linhas de 1 px a cada 24 px), marcas de sincronismo, a promessa tirada das três prioridades do doc 01 ("Estude o que cai. Lembre no dia da prova.") e um bloco de três linhas da folha (01–03, bolhas marcadas) com as três prioridades do produto. Formulário com rótulos em `eyebrow` e campos de borda `control-border`. Em 360 px, o painel vira uma faixa curta acima do formulário (CA-37).
- **Uso contido dos ornamentos:** textura e marcas de sincronismo só no login, na barra lateral e nos estados vazios; nunca atrás de texto corrido ou de tabelas.

**Tokens (`design/tokens.json`)**
| Token | Hoje | Direção A |
|---|---|---|
| `radius-sm` / `radius-md` / `radius-lg` | 6 / 10 / 16 px | 2 / 4 / 6 px |
| `radius-bubble` | 50% | 50% (não muda) |
| `rule` (novo) | — | = `graphite` nos dois temas; réguas fortes |
| `space-5`, `space-10`, `space-12` (novos) | — | 20, 40, 48 px |
| Estilo `eyebrow` (novo) | — | 13/18, 700, caixa alta, espaçamento 0,08em, `graphite-soft` |
| Números tabulares | — | `font-variant-numeric: tabular-nums` em prioridades, contagens, numeração |
| Sombra | — | nenhuma nova |

`grid-light` é reaproveitado para a textura. Entram no teste de contraste (CA-34): `ink-strong` e a bolha `ink` sobre `ink-light` (item atual), `graphite-soft` sobre `paper` (`eyebrow`, números dos itens), `rule` sobre `paper` e a meia-bolha, nos dois temas.

**Classes novas ou alteradas (`design/components.css`):** `gb-shell` (`__rail`, que substituiu `gb-shell__header`, `__rail-number`, `__timing-marks`), `gb-login` (`__panel`, `__promise`, `__sheet-rows`, `__form`), `gb-page-header` (`__eyebrow`, `__title`, `__meta`), `gb-sheet-texture`; mais as dos componentes do mapa (§ 3).

**O que não muda do doc 05:** paleta e cor da marca (`ink`), destaque `highlighter` e seu uso restrito, acerto e erro com ícone e texto, fontes (Schibsted Grotesk, Atkinson Hyperlegible, JetBrains Mono) e tamanho do texto, ícones Lucide, temas claro e escuro com AA, conceito "folha de respostas" e a bolha como assinatura. Se uma spec futura quiser mudar algum desses pontos, isso exige ADR novo que substitua o ADR-010.

**Mockups (registro):** [`assets/SPEC-004-direcoes-visuais.html`](assets/SPEC-004-direcoes-visuais.html) (abrir no navegador; estático, tema claro, sem requisições externas). Guarda as duas direções apresentadas ao dono, A "Folha de prova" e B "Caderno digital" (barra lateral em azul de tinta, painéis com sombra sobre fundo `canvas`, cantos mais redondos); **a A foi escolhida**, e o motivo do descarte da B está no ADR-010. Onde o mockup e esta spec divergirem (por exemplo, a altura de 40 px dos itens da barra lateral contra o mínimo de 44 px do CA-32, o indicador do item atual só por cor, o rótulo "Gerais" na etiqueta contra "Geral" do CA-18), vale a spec.

## 6. Plano de testes
| Nível | O que cobre | Critérios |
|---|---|---|
| Unitário | `computeTopicPriority` (seed inteiro contra o JSON, exatidão de 1, inativo, ausência de incidência, ordem e soma das contribuições), `computeMastery` (sem respostas, medido, taxa 0, retenção nula = só acerto firme, retenção 0 entra na fórmula; P-3), `computeUrgency`, `buildTopicMap` (filtros, combinação vazia, ordenações e desempates, totais), `buildTopicDetail` (existe/não existe), sincronia dos enums, `topicMapQuerySchema` e `topicIdSchema`, formatação pt-BR e rótulo curto, contraste dos tokens | CA-1 a CA-12, 34 |
| Componente | `Bubble`, `MasteryMeter`, `Tag`, `Notice` `info`, `EmptyState`, `PriorityValue`, `FilterGroup`, `Shell` redesenhado, `TopicMapView` (aviso de domínio, estados vazio/erro/sem taxonomia), `TopicMapFilters` (hrefs preservam parâmetros, `aria-current`), `TopicList`, `IncidenceMatrix` (cabeçalhos, textos ocultos, região), `TopicDetailView` (contribuições, total, estado vazio do domínio) | CA-18 a CA-23, 25, 26, 28, 33, 36, 37 |
| Integração | `readTopicMapSource` contra o banco local (contagens, nome da banca, prioridade do domínio = visão para os 38), isolamento por usuário com fábrica de respostas, falha simulada em `getTopicMap`/`getTopicDetail` | CA-15, 16, 17 |
| pgTAP | `topic_views.test.sql`: valores de `v_topic_priority` (seed, inativo, sem incidência) e de `v_topic_performance` (limites de 60 dias e 1 segundo, 61 dias, chute, dúvida, certeza, erro, branco, questão com dois assuntos) | CA-13, 14 |
| E2E | **Jornada 8 (nova)**: navegação até o mapa, lista sem respostas, filtros e ordenação com recarga, estado vazio de filtros, matriz, detalhe de `pdpj_stack` e `seg_infra`, 404, usuário descartável com respostas (CA-20), teclado, axe nos dois temas, 360 px. **Jornadas 1 e 7** reexecutadas após o redesenho | CA-18 a CA-27, 30 a 32, 35 a 37 |

Casos-limite do doc 07 aplicáveis: domínio 0 sem respostas e urgência = prioridade (CA-5, CA-8, CA-19); chute não conta (CA-14); janela de 60 dias com os limites dos dias 60 e 61 (CA-14, em pgTAP porque a janela vive na visão). Os demais casos do doc 07 (escolha do assunto, sessão, cartões, FSRS, simulados, discursivas, IA) não se aplicam. Regras de escrita: nomes descrevendo a regra, fábricas em `tests/factories/`, E2E com banco limpo e usuário descartável para o caso com respostas (o usuário de teste padrão permanece sem respostas, garantindo CA-19 em qualquer ordem), sem `waitForTimeout`, localizadores por papel e rótulo.

## 7. Riscos e alternativas descartadas
**Riscos**
- **Três lugares com a mesma prioridade** (campo `priority` do JSON, visão `v_topic_priority` e domínio): podem divergir em silêncio. Mitigação: CA-1 amarra domínio ao JSON, CA-13 amarra a visão ao seed e CA-15 amarra domínio à visão. Quem mudar a fórmula num lugar quebra um teste.
- **Ponto flutuante:** somar `0,28 + 0,18 + …` em `number` dá 0,9999999999999999 e quebra empates e a exibição de "1,00". Mitigação: soma inteira (milésimos × meios) e uma única divisão no fim (CA-2).
- **Domínio sempre "não medido" até o módulo 2:** a tela pode parecer incompleta. Mitigação: o aviso explica o porquê e a ordem por urgência continua útil (igual à prioridade).
- **Domínio sem cartões (P-3, decidido: só a taxa de acerto firme):** quando o módulo 3 passar a calcular a retenção, assuntos com cartões terão o domínio puxado para baixo ou para cima pela retenção, e o valor exibido muda sem nenhuma resposta nova. Esperado e explicado no detalhe (CA-26); a spec do módulo 3 deve mencionar essa transição.
- **Redesenho quebrar a SPEC-001:** a casca e o login têm 14 CAs de E2E. Mitigação: fase 1 em PR próprio, CA-35 exige as jornadas 1 e 7 verdes sem afrouxar verificações.
- **Escopo do redesenho crescer** (página inicial, ilustrações, animações): fica restrito à casca, ao login e aos componentes desta spec; o resto entra nas specs dos módulos.
- **Matriz de 14 colunas no celular:** legível só com rolagem interna. Mitigação: região focável com coluna fixa (CA-24); a lista e o detalhe cobrem o uso principal no celular.
- **Contraste dos tokens novos** (especialmente `ink-strong` sobre `ink-light` no item atual, `graphite-soft` no `eyebrow` e a meia-bolha nos dois temas): verificado por teste (CA-34), não a olho.
- **Seed desatualizado em perfil/ordem** (§ 5.3): o mapa mostraria dado antigo após uma versão nova do JSON; correção no gerador proposta em P-11.

**Alternativas descartadas**
- **Ler a prioridade direto de `v_topic_priority`:** não traz a contribuição por concurso, arredonda a 3 casas e deixa a regra só no SQL, contra o doc 06. A visão continua, com testes, como conferência e para consultas SQL futuras.
- **Calcular a taxa de acerto firme no domínio a partir das respostas brutas** (com `now` injetado): duplicaria a janela de 60 dias que o doc 04 atribui à visão e traria todas as respostas ao servidor. Fica a visão, testada em pgTAP.
- **Migração com coluna de faixa em `exams`** (ou tabela de faixas): só para agrupar visualmente; a ordem por peso já reproduz as faixas (P-6).
- **Filtros no cliente com estado em React:** perde o estado ao recarregar, não funciona sem JavaScript e exige mais testes de componente; links com parâmetros de URL são mais simples.
- **Biblioteca de gráficos ou de tabelas para a matriz:** dependência para algo que uma `<table>` com CSS resolve, com acessibilidade melhor.
- **Página separada para a matriz:** duplicaria filtros e ordem; um parâmetro `view` basta.
- **Cache dos dados de referência (`unstable_cache`):** 38 assuntos e 532 incidências são lidos em milissegundos; cache traria invalidação sem ganho perceptível.
- **Direção visual B "Caderno digital"** (superfícies com sombra, barra lateral em azul de tinta, cantos mais redondos): mais tokens, dois tratamentos por tema e risco de visual genérico. Descartada em P-1; motivos no ADR-010.
- **Redesenho em spec separada antes desta:** o mapa seria desenhado no visual atual e refeito; manter na mesma spec, em PR próprio, evita o retrabalho (P-2).

## 8. Perguntas em aberto
| # | Pergunta | Recomendação | Resposta |
|---|---|---|---|
| P-1 | Qual direção visual: A "Folha de prova", B "Caderno digital" ou uma combinação (diga quais elementos de cada)? Ver § 5.5 e os mockups. | **A.** Leva o conceito do doc 05 para a interface inteira em vez de só ao logo, é plana (o tema escuro não depende de sombras e o AA é mais fácil de manter) e pede menos tokens novos. Da B, vale aproveitar só os números grandes no topo de telas de painel (módulo 7). Registrar no ADR-010. | **A "Folha de prova"** (dono, 2026-11-19). Aplicada em § 5.5 e nos CAs 34, 36 e 37; registrada no ADR-010. |
| P-2 | Manter o redesenho dentro da SPEC-004 (fase 1, PR próprio) ou separá-lo numa SPEC-005? | Manter aqui, em PR próprio e antes do mapa: o mapa é a primeira tela no visual novo e serve de prova da direção; separar faria o mapa esperar outra aprovação. | Aceita a recomendação: redesenho dentro da SPEC-004, fase 1 em PR próprio, antes do mapa. |
| P-3 | Domínio de um assunto **com respostas e sem nenhum cartão** (a retenção média não existe). Acontece sempre até o módulo 3 e, depois, em todo assunto em que você só acerta com certeza, porque isso não cria cartão (doc 04 § Criação automática de cartões). Opções: (a) retenção ausente = 0, domínio = 0,5 × acerto firme (teto de 50% para quem nunca erra); (b) usar só o componente disponível, domínio = acerto firme; (c) retenção ausente = 1, domínio = 0,5 × acerto firme + 0,5. | **(b).** Não pune quem acerta com certeza (a) nem infla o domínio sem evidência (c). Registrar o esclarecimento no doc 04 § Domínio. | **(b)** (dono): quando há respostas e nenhum cartão, o domínio é só a taxa de acerto firme. Com cartões, vale a fórmula do doc 04 sem mudança (retenção 0 entra como 0). Aplicada em § 2, CA-7, CA-26 e no doc 04 § Domínio (proposta). |
| P-4 | Calcular a retenção média (com `ts-fsrs`, ADR-003) já nesta spec ou na spec do módulo 3? | No módulo 3: hoje nenhum fluxo cria cartões, a biblioteca ainda não está instalada e o mapeamento cartão → assunto é decisão daquela spec. Aqui `computeMastery` já recebe `averageRetention` e a tela mostra "ainda não calculada". | Aceita: retenção média na spec do módulo 3; aqui "ainda não calculada". |
| P-5 | Ordem padrão do mapa: urgência (prioridade × (1 − domínio)) ou prioridade pura? | Urgência: é o que o doc 01 chama de Direção ("o que mais cai e onde há mais erro"); até haver respostas, as duas ordens coincidem. Prioridade e nome ficam como opções. | Aceita: ordem padrão por urgência; prioridade e nome como opções. |
| P-6 | Quer ver os concursos agrupados por faixa (MG, federais do Sudeste…) na matriz e no detalhe? Exige migração (faixa em `exams`) e mudança no gerador do seed. | Não por enquanto: a ordem por peso já reproduz as faixas e o peso aparece em cada coluna. Reavaliar se a matriz ficar difícil de ler. | Aceita: sem agrupamento por faixa e sem migração; reavaliar se a matriz ficar difícil de ler. |
| P-7 | Resposta em branco deve contar no total respondido (denominador do acerto firme)? A visão atual conta; mudar exige migração que recria `v_topic_performance`. | Manter como está: deixar em branco é não saber, e o doc 04 fala em "total respondido". Relevante sobretudo no Cebraspe. | Aceita: resposta em branco continua contando no total respondido. |
| P-8 | Nomes: módulo `topics`, rotas `/topics` e `/topics/[topicId]`, e no glossário "mapa do edital" = *topic map* e "matriz de incidência" = *incidence matrix*. De acordo? | Sim: `topics` é a tabela central e evita um termo novo para "edital" (já é *notice*); o texto da interface continua "Mapa do edital". | Aceita: módulo `topics`, rotas `/topics` e `/topics/[topicId]`; termos no glossário (proposta). |
| P-9 | Leitores de servidor que combinam `data/` e `domain/` (`getTopicMap`) ficam em `actions/` como funções comuns, sem `'use server'`? É uma interpretação do doc 06 (que fala em "server actions"), registrada nele. | Sim. A alternativa (o `index.ts` exportar funções de `data/` e de `domain/` para a página do `app/` combinar) põe lógica em `app/`, que o doc 06 quer fino. | Aceita: leitores de servidor em `actions/`, sem `'use server'`; registrar no doc 06 na implementação. |
| P-10 | Se um dia os pesos dos concursos ativos somarem mais (ou menos) que 1, a prioridade sai da faixa 0–1. Normalizar? | Não normalizar: o doc 04 não normaliza e a edição de pesos está fora desta spec. A spec de configurações, que permitirá editar pesos, deve validar a soma ou decidir a normalização. | Aceita: sem normalização; a spec de configurações valida a soma dos pesos ou decide a normalização. |
| P-11 | Corrigir já, como ajuste pontual fora desta spec, o `generate_seed.py` para atualizar `category`, `profile` e `sort_order` de assuntos existentes (§ 5.3)? | Sim, antes da implementação do mapa: é uma linha no gerador, não muda o schema e evita exibir perfil desatualizado após a próxima versão do JSON. | Aceita: ajuste pontual no `generate_seed.py`, fora desta spec e antes da implementação do mapa. |

## 9. Histórico
| Data | Mudança |
|---|---|
| 2026-11-19 | Criação, com mockups das direções visuais em `assets/SPEC-004-direcoes-visuais.html` |
| 2026-11-19 | Respostas do dono às perguntas P-1 a P-11 (coluna Resposta). P-1: direção A "Folha de prova"; § 5.5 reescrita só com ela (a B fica no HTML dos mockups como registro, com o descarte no ADR-010); CAs 34, 36 e 37 detalhados para a A, incluindo indicador do item atual que não depende de cor (bolha no lugar do número, ajuste em relação ao mockup). P-3: domínio = taxa de acerto firme quando há respostas e nenhum cartão; CA-7 e CA-26 fechados. Rascunho do ADR-010 (proposto); esclarecimento do domínio no doc 04 e termos novos no glossário registrados como proposta. Status continua `rascunho`. |
| 2026-11-19 | Aprovada pelo dono e iniciada a implementação (ADR-010 aceito). Ordem: correção do `generate_seed.py`, redesenho da casca e do login, depois o mapa. |
| 2026-11-19 | Divergências aceitas na implementação: removido `loading.tsx` (o streaming do Suspense esconde o conteúdo sem JavaScript e faz o 404 responder 200; a página responde completa, filtros funcionam sem JS, 404 com status 404; CA-29 reescrito); `Notice` usa a prop `kind`; lista no celular é a mesma `<table>` reempilhada por CSS, com checagem manual de leitor de tela no Safari/VoiceOver; `logo.tsx` não mudou; `gb-shell__header` virou `gb-shell__rail`. |
| 2026-11-19 | Divergências aceitas após a revisão: `enums-sync.test.ts` fica em `data/` (lê o banco); `index.ts` exporta também o tipo `LoadResult`; `generate_seed.py` faz `do update set sort_order` em `subtopics`; as leituras usam `count: 'exact'` e devolvem `load_failed` se a contagem diferir do recebido (o PostgREST corta em 1000 linhas sem erro); as fixtures de componente ficam em `tests/factories/topic-map-entries.ts`; a tabela da lista tem papéis ARIA explícitos; o E2E ganhou um teste nomeado CA-29. |
