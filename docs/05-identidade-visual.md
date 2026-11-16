# 05 — Identidade visual e design system

Referência completa e navegável (tokens, componentes com prévia ao vivo, logos): design system "Gabarita" publicado no Claude.
Cópias versionadas no repositório:

| Caminho | Conteúdo |
|---|---|
| `public/brand/` | Logo, símbolo e ícone do app (SVG e PNG 512) |
| `design/tokens.json` | Tokens: cores (temas claro e escuro), tipografia, espaços, raios, foco |
| `design/componentes.css` | Classes dos componentes (prefixo `gb-`) |

## Conceito

A folha de respostas: papel branco, grade rosada, caneta azul e a bolha preenchida. A bolha é o elemento-assinatura (símbolo, alternativas, medidor de domínio).

## Decisões principais

| Tema | Escolha |
|---|---|
| Cor da marca | `tinta` #22309a (claro) / #9aa8ff (escuro), a caneta esferográfica azul |
| Destaques | `marca-texto` #ffe36e, só para trechos de resumo e revisão vencida |
| Acerto e erro | Verde-escuro e laranja, diferentes em claridade, sempre com ícone e texto |
| Títulos | Schibsted Grotesk 700/800 |
| Texto | Atkinson Hyperlegible, 17/27px |
| Código | JetBrains Mono, só em trechos de código |
| Ícones | Lucide, traço 2px |
| Temas | Claro e escuro, ambos com contraste AA verificado |

## Componentes já definidos

Botao, Alternativa, MedidorDominio, Etiqueta. Novos componentes do MVP devem seguir os mesmos tokens e entrar no design system antes de irem para o código.

## Como usar no código

Os tokens viram variáveis CSS (`--tinta`, `--papel`, `--espaco-4`…) e o tema escuro é ativado por `data-theme="escuro"` no `<html>`, com padrão pelo `prefers-color-scheme`. As fontes vêm do Google Fonts (ver `design/componentes.css`).
