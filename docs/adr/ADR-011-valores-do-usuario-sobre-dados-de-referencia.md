# ADR-011 — Valores do usuário sobre dados de referência ficam em tabelas pessoais de sobreposição

**Status:** aceito · **Data:** 2026-11-19 · **Origem:** [SPEC-005](../specs/SPEC-005-configuracoes-e-pesos-dos-concursos.md) § 5.3

## Contexto
O dono quer ajustar o peso de cada concurso na prioridade dos assuntos (por exemplo, subir o TRT-2 quando o edital abrir). Hoje o peso existe só em `exams.target_weight`, uma tabela de referência:
- o seed (`supabase/seed.sql`, gerado do JSON pelo ADR-004) faz `on conflict (id) do update set target_weight = excluded.target_weight` e é reaplicado a cada `npm run db:push --include-seed` (SPEC-002), então um valor gravado ali pelo usuário seria apagado na próxima implantação;
- o JSON é a fonte da verdade da taxonomia (ADR-004); gravar nele pela interface não é possível em produção;
- pelo ADR-005, tabelas de referência são compartilhadas entre usuários autenticados: num futuro multiusuário, o peso de um usuário mudaria a prioridade de todos.

A mesma situação vai se repetir com outros dados de referência que o usuário queira adaptar aos próprios objetivos (por exemplo, marcar o edital do concurso-alvo como publicado ou, mais adiante, ajustar uma incidência). Por isso a decisão vale para além da SPEC-005.

## Decisão
- **Dado de referência continua sendo o padrão**, vindo do JSON pelo seed, e não é editado pela interface.
- **O valor do usuário fica numa tabela pessoal de sobreposição**, com `user_id` (padrão `auth.uid()`), chave estrangeira para a linha de referência (`on delete cascade`), as mesmas restrições de faixa e precisão da coluna de referência e RLS de dono (ADR-005). O primeiro caso é `exam_weights (user_id, exam_id, weight)`.
- **A combinação padrão + sobreposição é regra de negócio** e fica no `domain/` (função pura e testada), não numa visão. Visões que já existem sobre a referência continuam calculando com o padrão e servem de conferência.
- **"Restaurar padrão" apaga as linhas de sobreposição do usuário.** Não se copia o padrão para a tabela pessoal.
- Uma preferência pessoal que não sobrepõe uma linha específica de referência (por exemplo, "o edital do concurso-alvo foi publicado") vai para `settings`, como coluna com padrão.

## Alternativas consideradas
- **Gravar em `exams.target_weight`:** o seed sobrescreve a cada implantação; contraria o ADR-004 (o JSON deixa de ser a fonte) e vaza entre usuários (ADR-005). Descartada.
- **Parar de sobrescrever `target_weight` no seed** (`on conflict do nothing` para a coluna): o peso padrão nunca mais acompanharia o JSON em banco já semeado, o JSON e o banco divergiriam em silêncio e continuaria sendo um valor global. Descartada.
- **Coluna `jsonb` em `settings`** (`exam_weights jsonb`, mapa concurso → peso): uma coluna, gravação atômica, RLS já existente e nenhuma tabela nova. Perde a chave estrangeira (chave órfã quando um concurso sai do seed), a restrição de faixa por valor e o tipo `numeric(4,3)`, e exige validar a forma do JSON no banco ou confiar só na aplicação. Descartada pela integridade; reconsiderar se as sobreposições se multiplicarem em muitas tabelas pequenas.
- **Visão que já aplica a sobreposição** (`coalesce(w.weight, e.target_weight)` com `auth.uid()`): a regra ficaria no SQL, contra o doc 06, e o comportamento "concurso sem linha num conjunto personalizado vale 0" não cabe num `coalesce` simples. Descartada; a visão de prioridade continua com o padrão.

## Consequências
- O seed pode continuar sendo reaplicado a cada implantação sem apagar nada do usuário; a SPEC-005 testa isso em pgTAP.
- Cada sobreposição nova é uma tabela pessoal a mais: entra no `rls.test.sql`, nos tipos gerados e, por consequência, no `check:prod` (que lê a lista de tabelas dos tipos).
- A prioridade exibida pela aplicação (domínio, com os pesos do usuário) pode diferir da visão `v_topic_priority` (pesos padrão). O doc 03 e o doc 04 passam a dizer isso explicitamente.
- Se o projeto virar multiusuário, nada muda nesta parte: cada usuário já tem os próprios pesos.
