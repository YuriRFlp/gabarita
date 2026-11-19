# 05 — Identidade visual e design system

Referência completa e navegável (tokens, componentes com prévia ao vivo, logos): design system "Gabarita" publicado no Claude.
Cópias versionadas no repositório:

| Caminho | Conteúdo |
|---|---|
| `public/brand/` | Logo, símbolo e ícone do app (SVG e PNG 512) |
| `design/tokens.json` | Tokens: cores (temas claro e escuro), tipografia (inclui `eyebrow`), espaços, raios, foco |
| `design/components.css` | Classes dos componentes (prefixo `gb-`) |

## Conceito

A folha de respostas: papel branco, grade rosada, caneta azul e a bolha preenchida. A bolha é o elemento-assinatura (símbolo, alternativas, medidor de domínio).

## Decisões principais

| Tema | Escolha |
|---|---|
| Cor da marca | `ink` #22309a (claro) / #9aa8ff (escuro), a caneta esferográfica azul |
| Destaques | `highlighter` #ffe36e, só para trechos de resumo e revisão vencida |
| Acerto e erro | Verde-escuro e laranja, diferentes em claridade, sempre com ícone e texto |
| Títulos | Schibsted Grotesk 700/800 |
| Texto | Atkinson Hyperlegible, 17/27px |
| Código | JetBrains Mono, só em trechos de código |
| Ícones | Lucide, traço 2px |
| Temas | Claro e escuro, ambos com contraste AA verificado |

## Direção visual: "Folha de prova"

Decidida no [ADR-010](adr/ADR-010-direcao-visual-folha-de-prova.md) (SPEC-004): a interface é a própria folha óptica da prova. Vale para todas as telas.

- **Plana:** sem sombras; seções separadas por réguas de 1 a 2 px na cor `rule`; cantos quase retos. A bolha é a única forma redonda e continua a assinatura.
- **Casca:** barra lateral fixa de 280 px a partir de 1024 px; abaixo disso, barra superior com o botão "Menu". Os itens são numerados como linhas da folha, na numeração dos módulos do doc 01 ("00" para o início). O item atual tem fundo `ink-light` e uma bolha preenchida no lugar do número, para não depender só de cor. "Aparência" (alternador de tema) e "Sair" ficam no rodapé da barra.
- **Cabeçalho de página:** sobretítulo (`eyebrow`, por exemplo "Módulo 01"), `h1` em Schibsted Grotesk 800 e régua grossa abaixo; metadados à direita.
- **Login:** a partir de 1024 px, duas colunas (painel de marca e formulário). O painel traz a promessa "Estude o que cai. Lembre no dia da prova." e, só no desktop, o sobretítulo, as marcas de sincronismo e três linhas da folha com as prioridades do produto. No celular, o painel vira uma faixa curta com o logo e a promessa.
- **Ornamentos contidos:** a textura de grade (`gb-sheet-texture`) e as marcas de sincronismo (`gb-timing-marks`, sempre `aria-hidden`) só aparecem no login, na barra lateral e nos estados vazios; nunca atrás de texto corrido ou de tabelas.
- **Números:** prioridades, contagens e numeração usam `font-variant-numeric: tabular-nums`.

### Tokens novos ou alterados

| Token | Mudança |
|---|---|
| `rule` (cor) | Novo. Igual a `graphite` nos dois temas; réguas fortes, borda da barra lateral e marcas de sincronismo |
| `eyebrow` (tipografia) | Novo. 13/18, peso 700, caixa alta, espaçamento 0,08em, `graphite-soft` |
| `space-5`, `space-10`, `space-12` | Novos: 20, 40 e 48 px |
| `radius-sm` / `radius-md` / `radius-lg` | De 6/10/16 px para 2/4/6 px |
| `graphite-soft`, `ink-light`, `grid-light` | Mesmos valores; o texto de uso passou a citar sobretítulo, item atual da barra lateral e a textura de grade |

Os pares de cor da direção (item atual, sobretítulo, régua, bolhas, filtro atual, aviso informativo, etiqueta de fase, painel do login sobre a textura) têm teste de contraste nos dois temas em `tests/design/contrast.test.ts`.

## Componentes

| Componente | Classes (`design/components.css`) | No código |
|---|---|---|
| Button | `gb-button`, `gb-button--primary/secondary/text` | `shared/ui/Button.tsx` |
| Field | `gb-field`, `gb-field__label`, `gb-field__input`, `gb-field__error` | `shared/ui/Field.tsx` |
| Notice | `gb-notice`, `gb-notice--error/success/info` | `shared/ui/Notice.tsx` |
| Shell e navegação | `gb-shell` e elementos (`__skip`, `__rail`, `__rail-number`, `__timing-marks`, `__logo`, `__menu-button`, `__menu`, `__menu--open`, `__list`, `__link`, `__actions`, `__appearance`, `__content`) | `shared/ui/Shell.tsx` |
| Grupo segmentado (alternador de tema) | `gb-segmented`, `gb-segmented__option` | `modules/settings/components/ThemeToggle.tsx` |
| Bubble | `gb-bubble`, `gb-bubble--filled/half/small` | `shared/ui/Bubble.tsx` (`fill`: `empty`, `half`, `filled`) |
| MasteryMeter | `gb-mastery`, `gb-mastery__bubbles` | `shared/ui/MasteryMeter.tsx` (5 bolhas; "Sem respostas" quando o valor é nulo) |
| Tag | `gb-tag`, `gb-tag--new/overdue/phase` | `shared/ui/Tag.tsx` |
| HeaderHint (dica no título da coluna: hover e foco, Esc fecha) | `gb-header-hint`, `gb-header-hint--end` | `shared/ui/HeaderHint.tsx` |
| EmptyState | `gb-empty-state`, `__title`, `__body` | `shared/ui/EmptyState.tsx` (bolha vazia, título, explicação e ação opcionais) |
| PriorityValue | `gb-priority`, `__bar`, `__fill` | `shared/ui/PriorityValue.tsx` (número com 2 casas e barra decorativa) |
| FilterGroup | `gb-filter-group`, `gb-filter-group__label` (opções em `gb-segmented`) | `shared/ui/FilterGroup.tsx` (opções são links; `aria-current` na atual) |
| Cabeçalho de página | `gb-page-header` (`__eyebrow`, `__title`, `__meta`); `gb-eyebrow` avulso | Usado nas telas do módulo `topics` |
| Login | `gb-login` (`__panel`, `__promise`, `__sheet-rows`, `__row-number`, `__row-bubbles`, `__form`) | `src/app/(public)/login/page.tsx` |
| Matriz de incidência | `gb-matrix-block`, `gb-matrix-legend`, `gb-matrix` e elementos | `modules/topics/components/IncidenceMatrix.tsx` |
| Lista e detalhe do assunto | `gb-topic-map`, `gb-topic-filters`, `gb-topic-list`, `gb-topic-detail__*`, `gb-subtopics`, `gb-contributions`, `gb-detail-mastery`, `gb-back-link` | `modules/topics/components/` |
| Option | `gb-option`, `gb-option--correct/wrong` | Ainda sem componente React; entra com a spec de questões |

`Bubble`, `MasteryMeter`, `Tag`, `EmptyState`, `PriorityValue`, `FilterGroup` e o estado `info` do Notice entraram com a SPEC-004. Os nomes de tokens e classes seguem o glossário (`docs/08-glossario.md`). Novos componentes do MVP seguem os mesmos tokens e entram em `design/` antes de irem para o código.

## Como usar no código

- `npm run tokens` gera `src/shared/ui/styles/tokens.css` a partir de `design/tokens.json`; um teste falha se o arquivo versionado estiver desatualizado.
- Tema: sem atributo no `<html>`, segue o `prefers-color-scheme`; `data-theme="dark"` ou `data-theme="light"` força um tema. A preferência (Sistema, Claro, Escuro) fica salva em `settings.theme`, sincronizada entre aparelhos, com cópia em cookie para o servidor já entregar a página no tema certo.
- Fontes: auto-hospedadas por `next/font/google` (`src/shared/ui/fonts.ts`), sem requisição ao Google no navegador. Elas preenchem `--font-face-display`, `--font-face-text` e `--font-face-code`, que o `tokens.css` usa como primeira opção de `--font-*`, mantendo a pilha de fallback dos tokens.
