# 05 — Identidade visual e design system

Referência completa e navegável (tokens, componentes com prévia ao vivo, logos): design system "Gabarita" publicado no Claude.
Cópias versionadas no repositório:

| Caminho | Conteúdo |
|---|---|
| `public/brand/` | Logo, símbolo e ícone do app (SVG e PNG 512) |
| `design/tokens.json` | Tokens: cores (temas claro e escuro), tipografia, espaços, raios, foco |
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

## Componentes já definidos

| Componente | Classes (`design/components.css`) | No código |
|---|---|---|
| Button | `gb-button`, `gb-button--primary/secondary/text` | `shared/ui/Button.tsx` |
| Field | `gb-field`, `gb-field__label`, `gb-field__input`, `gb-field__error` | `shared/ui/Field.tsx` |
| Notice | `gb-notice`, `gb-notice--error/success` | `shared/ui/Notice.tsx` |
| Shell e navegação | `gb-shell` e elementos (`__header`, `__menu`, `__link`, `__actions`, `__content`, `__skip`) | `shared/ui/Shell.tsx` |
| Grupo segmentado (alternador de tema) | `gb-segmented`, `gb-segmented__option` | `modules/settings/components/ThemeToggle.tsx` |
| Option, MasteryMeter, Tag | `gb-option`, `gb-mastery`, `gb-tag` | Entram em React nas specs que os usam |

Field, Notice, Shell e o grupo segmentado entraram com a SPEC-001. Os nomes de tokens e classes seguem o glossário (`docs/08-glossario.md`). Novos componentes do MVP seguem os mesmos tokens e entram em `design/` antes de irem para o código.

## Como usar no código

- `npm run tokens` gera `src/shared/ui/styles/tokens.css` a partir de `design/tokens.json`; um teste falha se o arquivo versionado estiver desatualizado.
- Tema: sem atributo no `<html>`, segue o `prefers-color-scheme`; `data-theme="dark"` ou `data-theme="light"` força um tema. A preferência (Sistema, Claro, Escuro) fica salva em `settings.theme`, sincronizada entre aparelhos, com cópia em cookie para o servidor já entregar a página no tema certo.
- Fontes: auto-hospedadas por `next/font/google` (`src/shared/ui/fonts.ts`), sem requisição ao Google no navegador. Elas preenchem `--font-face-display`, `--font-face-text` e `--font-face-code`, que o `tokens.css` usa como primeira opção de `--font-*`, mantendo a pilha de fallback dos tokens.
