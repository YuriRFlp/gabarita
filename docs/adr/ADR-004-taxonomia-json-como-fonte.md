# ADR-004 — Taxonomia em JSON versionado como fonte da verdade

**Status:** aceito · **Data:** 2026-11-16

## Contexto
A taxonomia e a matriz de incidência vêm da leitura de editais e mudam a cada novo edital.

## Decisão
Manter `data/seed/taxonomia_tribunais_ti_vX.Y.json` no repositório como fonte da verdade. O `supabase/seed.sql` é gerado por script e é idempotente.

## Consequências
- Mudanças na taxonomia ficam revisáveis no histórico do Git.
- Atualizar após um novo edital = editar o JSON, subir a versão e regenerar o seed.
- Ids de assunto são estáveis; renomear um assunto não quebra respostas e cartões já gravados.
