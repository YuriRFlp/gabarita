# ADR-013 — Cabeçalho de página sem sobretítulo

**Status:** aceito · **Data:** 2026-11-20 · **Origem:** pedido do dono durante a implementação da [SPEC-005](../specs/SPEC-005-configuracoes-e-pesos-dos-concursos.md) · **Substitui em parte:** [ADR-010](ADR-010-direcao-visual-folha-de-prova.md) (só o item "Cabeçalho de página" e a menção ao sobretítulo nas consequências) e a frase do [ADR-012](ADR-012-barra-lateral-com-icones-e-tema-so-em-configuracoes.md) segundo a qual "a numeração do doc 01 continua no sobretítulo do cabeçalho de página". O restante dos dois ADRs continua valendo.

## Contexto
O ADR-010 definiu o cabeçalho de página da direção "Folha de prova" como um sobretítulo em caixa alta (estilo `eyebrow`, por exemplo "Módulo 01"), o `h1` em Schibsted Grotesk 800 e uma régua grossa abaixo. Hoje há quatro sobretítulos na aplicação:

| Tela | Sobretítulo | Arquivo |
|---|---|---|
| Mapa do edital (`/topics`) | "Módulo 01" | `src/modules/topics/components/TopicMapView.tsx` |
| Detalhe do assunto (`/topics/<id>`) | "Assunto" | `src/modules/topics/components/TopicDetailView.tsx` |
| Configurações (`/settings`) | "Preferências" | `src/app/(app)/settings/page.tsx` |
| Login (`/login`, formulário) | "Acesso" | `src/app/(public)/login/page.tsx` |

O dono perguntou por que as páginas fazem referência ao número do módulo e pediu para tirar o sobretítulo de todas elas.

**Por que o sobretítulo existia.** Veio da metáfora da direção A: a interface é a folha de respostas numerada, e a numeração espelha a lista de módulos do doc 01 ("00 Início", "01 Mapa do edital"). Na versão original, o número aparecia na barra lateral e o sobretítulo o repetia no topo da página, ligando os dois.

**Por que não se sustenta.**
- **Não informa nada.** O número do módulo é um identificador de planejamento (ordem de construção no doc 01), não um conceito que o usuário use para estudar. Para um usuário único, que sabe onde está, "Módulo 01" acima de "Mapa do edital", "Preferências" acima de "Configurações" e "Acesso" acima de "Entrar" repetem o título com outras palavras ou não dizem nada. "Assunto" acima do nome do assunto é o caso mais próximo de útil, mas o link de volta ao mapa e as etiquetas de perfil e fase já dão esse contexto.
- **Ficou incoerente com o ADR-012.** A barra lateral perdeu os números (agora usa ícones). O sobretítulo "Módulo 01" passou a ser a única aparição do número na interface, sem nada que o ligue a outra parte da tela. O próprio ADR-012 manteve a numeração no sobretítulo para preservar a metáfora, e é essa frase que deixa de valer.
- **Gera regra sem uso.** Páginas que não são módulos do doc 01 (Configurações, login) precisaram de um sobretítulo inventado ("Preferências", "Acesso") só para seguir o padrão. A SPEC-005 chegou a justificar por que Configurações "não tem número".

## Decisão
Decisão do dono, registrada antes do código.

- **Cabeçalho de página:** `h1` em Schibsted Grotesk 800 e régua grossa (2 px, `rule`) abaixo; o resumo ou os metadados (por exemplo a contagem de assuntos, subtópicos e concursos no mapa, as etiquetas de perfil e fase no detalhe) ficam à direita onde houver. Não há sobretítulo. O `h1` é o primeiro elemento de `gb-page-header`.
- **Sem `hgroup`.** O `hgroup` só existia para agrupar o sobretítulo com o `h1`. Com um único título ele não acrescenta semântica, então sai: o `h1.gb-page-header__title` fica direto dentro de `header.gb-page-header`. A regra `min-width: 0`, que hoje está no `hgroup` (necessária para o título longo quebrar dentro do flex), passa para `.gb-page-header__title`.
- **Login:** o formulário começa pelo `h1` "Entrar", sem "Acesso" e sem `hgroup`.
- **A linha de marca do login continua.** "Analista Judiciário · Tecnologia da Informação", no painel de marca (só a partir de 1024 px), não é sobretítulo de página: não fica acima de nenhum título, diz para quem é o produto e compõe a identidade do painel junto com o logo, a promessa e as três linhas da folha (ADR-010, CA-37 da SPEC-004). Ela continua com a classe `gb-eyebrow`.
- **O que sai do design system:**
  - a classe `gb-page-header__eyebrow` (o seletor sai da regra compartilhada `.gb-eyebrow, .gb-page-header__eyebrow`);
  - as regras `.gb-page-header hgroup` e `.gb-login__form hgroup`.
- **O que fica:**
  - o **estilo tipográfico `eyebrow`** em `design/tokens.json` (13/18, peso 700, caixa alta, espaçamento 0,08em, `graphite-soft`), com os mesmos valores. Ele continua em uso nos rótulos curtos da folha: a linha de marca do login, os rótulos de campo do login (`.gb-login__form .gb-field__label`), os cabeçalhos de coluna das tabelas (`.gb-topic-list thead th`, `.gb-contributions thead th`) e os rótulos de bloco das seções de Configurações. Mudam só o exemplo (`sample`, de "Módulo 01" para "Concurso-alvo") e o texto de uso, que deixa de citar o sobretítulo;
  - a **classe avulsa `gb-eyebrow`**, para aplicar o estilo a um rótulo curto fora de tabela ou campo.
- **Nome em português.** O termo "sobretítulo" sai do glossário. O estilo `eyebrow` e a classe `gb-eyebrow` passam a corresponder a "rótulo curto (caixa alta)".
- **Numeração do doc 01.** A numeração continua nos documentos, como ordem de planejamento e construção, mas não aparece na interface. Nenhuma tela nova deve exibir "Módulo NN".

## Alternativas consideradas
- **Manter o sobretítulo só nas páginas de módulo ("Módulo 01")**: preserva a metáfora onde ela nasceu, mas mantém um número sem correspondência visível depois do ADR-012, e cria duas formas de cabeçalho. Descartada.
- **Trocar o sobretítulo por trilha de navegação (breadcrumb), por exemplo "Mapa do edital" acima do nome do assunto**: daria informação real no detalhe, mas duplica o link de volta que já existe e, nas páginas de primeiro nível, não teria o que mostrar. Fica como caminho se surgirem páginas com mais de dois níveis.
- **Manter o sobretítulo só no detalhe ("Assunto")**: é o único caso com algum valor, mas pequeno, e reintroduz a exceção no padrão. Descartada.
- **Apagar também o estilo `eyebrow` e a classe `gb-eyebrow`**: deixaria os cabeçalhos de coluna e os rótulos de campo sem um nome comum para o estilo que repetem, e a linha de marca do login sem classe. Descartada: o estilo tem uso real, só o papel de sobretítulo sai.
- **Tirar também a linha de marca do login**: é identidade do produto, não repete nenhum título, e a mudança não foi pedida. Descartada.

## Consequências
- **Telas alteradas:** mapa do edital (estado normal e de erro), detalhe do assunto (estado normal e de erro), Configurações e login perdem o sobretítulo e o `hgroup`. O `h1` continua único em cada página. Nenhum texto lido por leitor de tela como título muda: o sobretítulo era um `<p>`, não um título.
- **Contraste:** nenhum par de cor muda. Em `tests/design/contrast.test.ts`, `graphite-soft` × `paper` continua (rótulos curtos e cabeçalhos de coluna; o texto do caso deixa de citar o sobretítulo e os números da barra) e `graphite-soft` × `grid-light` continua por causa da linha de marca do login.
- **Testes:** as jornadas 1, 8 e 9 e os testes de componente das quatro telas passam a verificar que o `h1` é o primeiro elemento do cabeçalho (ou do formulário, no login) e que o sobretítulo não existe. O *page object* `SettingsPage` perde o localizador `eyebrow`. A rastreabilidade fica no CA-42 e no CA-43 da SPEC-005.
- **Specs concluídas:** a SPEC-001 e a SPEC-004 não são reescritas (registro histórico). Cada uma ganha uma nota no histórico apontando para este ADR. A SPEC-005, em implementação, é atualizada.
- **Documentos a atualizar** na implementação da SPEC-005: doc 05 (seção "Direção visual", item "Cabeçalho de página" e item "Login"; tabela de tokens; parágrafo dos pares de contraste; linha "Cabeçalho de página" da tabela de componentes), glossário (sai "sobretítulo" e `gb-page-header__eyebrow`; `gb-page-header` passa a `__title`, `__meta`; entra "rótulo curto"), `design/tokens.json` (`sample` e `usage` de `eyebrow`), `design/components.css` e os mockups, que ficam como estão por serem registro da escolha.
- **Telas futuras** usam o cabeçalho com `h1` e régua. Voltar a ter sobretítulo (ou outra linha acima do título) exige um ADR novo que substitua este.
