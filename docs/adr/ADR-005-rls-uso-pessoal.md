# ADR-005 — Política de RLS para uso pessoal

**Status:** aceito · **Data:** 2026-11-16

## Contexto
O Supabase expõe o banco diretamente ao navegador; sem RLS, qualquer pessoa com a chave pública leria os dados.

## Decisão
- RLS ativa em todas as tabelas.
- Tabelas pessoais (respostas, cartões, configurações etc.): acesso somente às linhas com `user_id = auth.uid()`.
- Tabelas de referência e conteúdo (questões, assuntos etc.): leitura e escrita para qualquer usuário autenticado.
- Cadastro público de usuários desativado no Supabase.

## Consequências
- Seguro para um único usuário.
- **Se o projeto virar multiusuário:** restringir escrita nas tabelas de referência a um papel de administrador (novo ADR).
