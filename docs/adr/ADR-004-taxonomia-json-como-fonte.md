# ADR-004 — Taxonomia em JSON versionado como fonte da verdade

**Status:** aceito · **Data:** 2026-11-16

## Contexto
A taxonomia e a matriz de incidência vêm da leitura de editais e mudam a cada novo edital.

## Decisão
Manter `data/seed/court_it_taxonomy_vX.Y.json` no repositório como fonte da verdade. O `supabase/seed.sql` é gerado por `scripts/generate_seed.py` e é idempotente. As chaves do JSON seguem em inglês (ADR-007); os valores textuais (nomes, critérios) e os ids continuam em português.

## Consequências
- Mudanças na taxonomia ficam revisáveis no histórico do Git.
- Atualizar após um novo edital = editar o JSON, subir a versão e regenerar o seed.
- Ids de assunto são estáveis; renomear um assunto não quebra respostas e cartões já gravados.
