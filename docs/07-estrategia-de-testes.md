# 07 — Estratégia de testes

Decisão de origem: ADR-006.

## Pirâmide

| Nível | Ferramenta | O que cobre | Onde fica | Meta |
|---|---|---|---|---|
| Unitário | Vitest | Funções de `dominio/` (regras do doc 04) | ao lado do código | ≥ 90% de linhas e ramos em `dominio/` |
| Componente | Vitest + Testing Library | Estados e interação de componentes | ao lado do código | Todo componente com lógica |
| Banco | pgTAP (`supabase test db`) | RLS, restrições, visões, índices | `supabase/tests/` | Toda tabela e visão |
| Integração | Vitest + Supabase local | `dados/` e `acoes/` contra banco real | `*.int.test.ts` | Caminhos principais |
| E2E | Playwright (+ axe) | Jornadas do usuário no navegador | `tests/e2e/` | Jornadas críticas abaixo |

## Casos obrigatórios do domínio

Derivados de `docs/04-regras-de-estudo.md`; cada um vira teste com nome descritivo.

- **Prioridade e urgência:** `urgencia = prioridade × (1 − dominio)`; assunto sem respostas tem domínio 0.
- **Domínio:** acerto com confiança "chute" não conta; janela de 60 dias (limite exato do dia 60 e 61).
- **Escolha do assunto:** `pos_edital` bloqueado sem edital; cota de infra com 2 dias restantes (e com 3); proibição de repetir assunto em dias seguidos, com a exceção de urgência > 0,2.
- **Sessão diária:** teto de 40% para revisões; sobra de revisão volta ao ciclo; dia com 0 min.
- **Criação de cartões:** errada → cria; certa + chute/dúvida → cria; certa + certeza → não cria; cartão já existente → não duplica.
- **FSRS:** notas 1–4 atualizam o cartão e geram log; datas com `agora` injetado.
- **Notas de simulado:** Cebraspe (penalidade, item em branco, nota mínima, variante `− 6 × NE / TL`), FCC (pesos 1 e 2, escala 0–10), Fumarc (60% e disciplina zerada).
- **Discursivas:** contagem de linhas versus limites do concurso.
- **IA modo manual:** JSON colado inválido, incompleto ou com campos extras é rejeitado com mensagem clara.

## Jornadas E2E críticas

1. Login e acesso negado sem sessão.
2. Responder questão → ver correção → cartão criado em caso de erro.
3. Fila de revisão do dia → avaliar cartão → próximo vencimento atualizado.
4. Plano do dia gerado → iniciar e concluir sessão (planejado × realizado).
5. Simulado completo → nota por disciplina conforme a banca.
6. Discursiva: gerar prompt (modo manual) → colar resposta → nota por critério.
7. Tema claro e escuro; viewport de celular (360 px).

## Regras de escrita dos testes

- Nome do teste descreve a regra: `"não cria cartão quando acerta com certeza"`.
- Padrão Arrange–Act–Assert; uma regra por teste.
- Sem `sleep`/`waitForTimeout`; no Playwright, usar localizadores por papel e rótulo (`getByRole`, `getByLabel`).
- Dados de teste criados por fábricas (`tests/fabricas/`), nunca dependentes da ordem de execução.
- E2E começa com banco limpo (`supabase db reset`) e usuário de teste criado por script.
- Teste instável não é desligado em silêncio: corrige-se ou abre-se pendência no `CHANGELOG.md`.
