# ADR-001 — Stack web com custo zero

**Status:** aceito · **Data:** 2026-11-16

## Contexto
Uso pessoal, sem orçamento. A plataforma precisa estar acessível de qualquer lugar (computador e celular).

## Decisão
Next.js hospedado na Vercel (plano Hobby) + Supabase (Postgres, Auth e RLS no plano gratuito).

## Alternativas consideradas
- **Aplicação local com IndexedDB:** custo zero e sem limites, mas sem acesso pelo celular e sem backup natural.
- **Cloudflare Pages + D1:** também gratuito, mas SQLite limita visões e RLS.

## Consequências
- Supabase pausa projetos após 7 dias sem uso e não faz backup no plano gratuito: é preciso uma rotina de exportação.
- Postgres permite visões, índices parciais e RLS, usados no modelo de dados.
