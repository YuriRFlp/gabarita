# ADR-002 — IA em três modos, com o manual como padrão

**Status:** aceito · **Data:** 2026-11-16

## Contexto
A assinatura do Claude (chat) não inclui acesso à API, que é cobrada à parte. O usuário quer custo zero, com a opção de ativar IA paga no futuro.

## Decisão
Uma interface única (`AIProvider`) com três implementações: `desligado`, `manual` (gera prompt para copiar e colar no chat e importa a resposta) e `api` (prevista, não implementada no MVP). Modo padrão: `manual`.

## Consequências
- Correção de discursivas, geração de resumos, questões e cartões funcionam sem custo.
- Todo conteúdo gerado por IA é armazenado e reutilizado (não se paga duas vezes no modo API).
- Chave de API, quando existir, fica apenas em variável de ambiente do servidor.
