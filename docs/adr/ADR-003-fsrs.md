# ADR-003 — FSRS como algoritmo de revisão espaçada

**Status:** aceito · **Data:** 2026-11-16

## Contexto
O objetivo principal é retenção até o dia da prova. Algoritmos clássicos (SM-2) usam intervalos fixos pouco ajustados ao indivíduo.

## Decisão
Usar FSRS por meio da biblioteca `ts-fsrs`. O estado do cartão é guardado em colunas que espelham o `Card` da biblioteca, e cada revisão é registrada em `revisoes`.

## Consequências
- Intervalos ajustados à retenção desejada (padrão 0,90).
- O histórico completo permite otimizar os parâmetros com os dados do próprio usuário no futuro.
- A retenção estimada é calculada na aplicação, não em SQL.
