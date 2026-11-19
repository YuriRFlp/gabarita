# ADR-010 — Direção visual "Folha de prova" para a interface

**Status:** aceito · **Data:** 2026-11-19 · **Origem:** [SPEC-004](../specs/SPEC-004-mapa-do-edital.md) § 5.5, pergunta P-1

## Contexto
O doc 05 definiu o conceito (a folha de respostas), a paleta, as fontes, os ícones e os temas, mas não como a interface se organiza. A casca da SPEC-001 ficou genérica e foi considerada pouco profissional pelo dono: um cabeçalho com links que não comporta os 9 módulos do MVP, o alternador de tema no lugar mais nobre da tela, um login sem nenhum sinal do produto, pouca hierarquia tipográfica e o conceito "folha de respostas" presente só no logo. Antes de desenhar a primeira tela com dado de estudo (o Mapa do edital), foram apresentadas ao dono duas direções, com mockups em [`docs/specs/assets/SPEC-004-direcoes-visuais.html`](../specs/assets/SPEC-004-direcoes-visuais.html). A escolha vale para todas as telas futuras, por isso fica registrada aqui.

## Decisão
Adotar a direção **A, "Folha de prova"**: a interface é a própria folha óptica da prova.
- **Plana:** sem sombras; seções separadas por réguas de 1–2 px em grafite; cantos quase retos. A bolha é a única forma redonda da tela e continua o elemento-assinatura.
- **Casca:** barra lateral fixa a partir de 1024 px (abaixo, o botão "Menu" atual), com itens numerados como linhas da folha, na numeração dos módulos do doc 01; o item atual tem fundo `ink-light` e uma bolha preenchida no lugar do número (indicador que não depende só de cor). "Aparência" e "Sair" no rodapé da barra. Marcas de sincronismo da folha óptica como ornamento decorativo (`aria-hidden`).
- **Cabeçalho de página:** sobretítulo (`eyebrow`, "Módulo 01"), `h1` em Schibsted Grotesk 800 e régua grossa abaixo.
- **Login:** duas colunas no desktop, com painel de marca (textura de grade, a promessa "Estude o que cai. Lembre no dia da prova." e três linhas da folha com as prioridades do produto) e o formulário; no celular, o painel vira uma faixa curta.
- **Ornamentos contidos:** textura e marcas de sincronismo só no login, na barra lateral e nos estados vazios; nunca atrás de texto corrido ou de tabelas.

**Tokens e classes novos ou alterados** (`design/tokens.json`, `design/components.css`):
| Item | Mudança |
|---|---|
| `radius-sm` / `radius-md` / `radius-lg` | 6 / 10 / 16 px → 2 / 4 / 6 px |
| `rule` (novo) | Igual a `graphite` nos dois temas, para réguas fortes |
| `space-5`, `space-10`, `space-12` (novos) | 20, 40 e 48 px, para respiro em telas grandes |
| Estilo `eyebrow` (novo) | 13/18, 700, caixa alta, espaçamento 0,08em, `graphite-soft` |
| Números tabulares | `tabular-nums` em prioridades, contagens e numeração |
| Classes | `gb-shell` (`__rail`, `__rail-number`, `__timing-marks`), `gb-login` (`__panel`, `__promise`, `__sheet-rows`, `__form`), `gb-page-header` (`__eyebrow`, `__title`, `__meta`), `gb-sheet-texture` |

`grid-light` é reaproveitado para a textura; nenhuma sombra é criada.

**O que não muda do doc 05:** cor da marca (`ink`) e paleta, uso restrito do `highlighter`, acerto e erro com ícone e texto, fontes (Schibsted Grotesk, Atkinson Hyperlegible 17/27, JetBrains Mono), ícones Lucide com traço de 2 px, temas claro e escuro com contraste AA, o conceito "folha de respostas" e a bolha como assinatura (`radius-bubble` continua 50%).

## Alternativas consideradas
- **Direção B, "Caderno digital":** painéis em `paper` com sombra sobre um fundo `canvas`, barra lateral em azul de tinta (`ink-surface`), cantos mais redondos e números grandes em cartões. Descartada porque pede mais tokens (`canvas`, `ink-surface`, `on-ink-soft`, `shadow-1`, `shadow-2`) e dois tratamentos por tema (sombra no claro, contorno no escuro, já que sombra não aparece em fundo escuro), torna o contraste AA mais difícil de garantir (texto secundário sobre azul profundo) e tende a um visual genérico de SaaS, com o conceito da folha só nos detalhes. Os números grandes no topo podem voltar como componente nas telas de painel (módulo 7), sem mudar a direção.
- **Combinar elementos das duas:** daria duas linguagens de superfície (plana e com sombra) convivendo na mesma tela, sem ganho claro sobre a A.
- **Manter a casca atual com ajustes pontuais:** não resolve o problema principal, que é a navegação não comportar os 9 módulos.
- **Biblioteca de componentes pronta (shadcn/ui, Material, Chakra):** traria a aparência da biblioteca em vez da identidade do doc 05, além de dependência e tema para sobrescrever; o design system próprio em CSS já existe e é pequeno.

## Consequências
- Toda tela nova usa a casca com barra lateral, o cabeçalho de página com sobretítulo e régua, e os raios novos; a especificação de cada módulo não precisa rediscutir a aparência.
- A mudança de raios atinge os componentes que já existem (Button, Field, Notice, grupo segmentado): eles ficam com cantos mais retos sem mudar de comportamento. As jornadas E2E 1 e 7 da SPEC-001 devem continuar passando sem afrouxar nenhuma verificação (CA-35 da SPEC-004).
- Com mais itens e ornamentos na casca, cresce o risco de poluição visual; a regra dos ornamentos contidos limita isso e deve ser conferida na revisão de cada tela.
- Os pares de cor novos (item atual, `eyebrow`, réguas, meia-bolha) passam a ter teste automático de contraste sobre `design/tokens.json` nos dois temas (CA-34 da SPEC-004).
- O doc 05 ganha uma seção sobre a direção visual e os componentes novos, e o design system publicado no Claude é atualizado pelo dono a partir de `design/`.
- Mudar fontes, cor da marca, temas ou o conceito deixa de ser só direção visual: exige um ADR novo que substitua este, com revisão de contraste de todo o sistema.
