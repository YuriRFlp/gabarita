# 04 — Regras de estudo

Regras de negócio que a aplicação implementa. Valores entre colchetes são padrões configuráveis.

## Prioridade de um assunto

```
prioridade(assunto) = Σ peso_alvo(concurso) × incidência(assunto, concurso)
```

Calculada pela visão `v_topic_priority` (coluna `priority`, a partir de `exams.target_weight` e `incidences.value`). Varia de 0 a 1.

## Domínio de um assunto

```
domínio = 0,5 × taxa_de_acerto_firme + 0,5 × retenção_média
```

- **Taxa de acerto firme** (visão `v_topic_performance`, coluna `mastery_rate` = `firm_correct` / `answered`): acertos dos últimos 60 dias que **não** foram marcados como chute (`confidence = 'guess'`), divididos pelo total respondido.
- **Retenção média**: média da probabilidade de lembrar (retrievability do FSRS) dos cartões do assunto, calculada na aplicação.
- Assunto sem respostas tem domínio 0.
- Assunto com respostas e **nenhum cartão** (a retenção média não existe) tem domínio igual à taxa de acerto firme. Com cartões, vale a fórmula acima, mesmo que a retenção média seja 0. Implementado em `src/modules/topics/domain/mastery.ts` (SPEC-004).

## Escolha do assunto da vez

```
urgência = prioridade × (1 − domínio)
```

O assunto com maior urgência entra no ciclo, com as exceções:
1. Assuntos de fase `post_notice` só entram quando o concurso-alvo tiver edital publicado.
2. Se a cota semanal de infraestrutura [180 min] ainda não foi cumprida e faltam até 2 dias para o fim da semana, o próximo assunto é o de perfil (`profile`) `infra` com maior urgência.
3. O mesmo assunto não é escolhido em dois dias seguidos, salvo se for o único com urgência acima de 0,2.

## Sessão diária

Disponibilidade configurada: [3 h por dia, todos os dias]. Ordem fixa, dentro das horas do dia:

1. **Revisões vencidas** (cartões com `due` até agora), até 40% do tempo do dia.
2. **Ciclo do assunto da vez**: leitura [15 min] → questões [o restante] → cartões dos erros.
3. Tempo de revisão não usado volta para o ciclo.

Exemplo com 3 h (180 min):

| Fase do estudo | Revisões | Leitura | Questões e cartões |
|---|---|---|---|
| Primeiras semanas (poucos cartões) | ~20 min | 15 min | ~145 min |
| Após 2 a 3 meses (fila maior) | até 72 min (teto de 40%) | 15 min | ~93 min |

A cota de infraestrutura [180 min/semana] equivale a cerca de 14% das 21 h semanais.

## Criação automática de cartões

| Evento | Resultado |
|---|---|
| Questão errada | Cria cartão do tipo `question` (se ainda não existir) |
| Questão certa com confiança "chute" (`guess`) ou "dúvida" (`doubt`) | Cria cartão do tipo `question` |
| Questão certa com "certeza" (`certain`) | Nenhum cartão |
| Botão "gerar cartões" no resumo | Cartões `concept` a partir dos pontos-chave (via IA manual) |

O limite de cartões novos por dia [20] vale para a fila de revisão, não para a criação.

## Revisão (FSRS)

- Biblioteca `ts-fsrs`, retenção desejada [0,90].
- Notas: 1 Errei, 2 Difícil, 3 Bom, 4 Fácil.
- Cada revisão atualiza `cards` e grava uma linha em `review_logs`.

## Simulados

- Montados com a distribuição do concurso escolhido (JSON `exams.objective`, chave `distribution`), sorteando questões não respondidas nos últimos 30 dias, quando houver.
- Nota calculada pela regra da banca: Cebraspe com penalidade de erro e nota mínima por prova; FCC com pesos 1 e 2 e escala 0–10; Fumarc com 60% do total e nenhuma disciplina zerada.
- Respostas de simulado alimentam domínio e criação de cartões como qualquer outra resposta.

## Discursivas

- Escrita à mão, digitada depois; a plataforma conta linhas e compara com os limites do concurso.
- No modo manual, o prompt de correção leva o texto, o tema e a rubrica da banca escolhida e pede a nota em JSON, critério por critério.
- O painel mostra a evolução por critério (ex.: morfossintaxe ao longo do tempo).
