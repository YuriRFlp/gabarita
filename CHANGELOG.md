# Histórico de mudanças — Gabarita

Formato inspirado em [Keep a Changelog](https://keepachangelog.com/pt-BR/). Datas no formato AAAA-MM-DD.

## [0.3.0] — 2026-11-16

### Adicionado
- Time de agentes do Claude Code em `.claude/agents/`: arquiteto, especialista-banco, especialista-frontend, engenheiro-testes, engenheiro-e2e e revisor-codigo.
- `CLAUDE.md` com o fluxo de desenvolvimento do time.
- `docs/06-padroes-de-codigo.md`, `docs/07-estrategia-de-testes.md` e ADR-006 (proposto): ferramentas de qualidade e testes.
- `docs/specs/`: registro de specs por funcionalidade (modelo, ciclo de vida e índice). Código só começa com spec aprovada.
- `.gitignore` e skill `commit` (Conventional Commits em português, com escopo por módulo e referência à spec).

## [0.2.0] — 2026-11-16

### Adicionado
- Identidade visual: logo, símbolo e ícone do app em `public/brand/`.
- Design system: tokens (temas claro e escuro, tipografia, espaços, raios) em `design/tokens.json` e componentes Botao, Alternativa, MedidorDominio e Etiqueta em `design/componentes.css`.
- `docs/05-identidade-visual.md`.

## [0.1.2] — 2026-11-16

### Alterado
- Projeto passa a se chamar **Gabarita**. Repositório renomeado para `gabarita`; README, documentação, migração e script atualizados.

## [0.1.1] — 2026-11-16

### Alterado
- Disponibilidade padrão em `configuracoes.horas_por_dia`: 3 h todos os dias (antes: 2 h em dias úteis, 4 h no sábado, folga no domingo). Alteração feita na migração inicial, que ainda não foi aplicada em nenhum ambiente.
- `docs/04-regras-de-estudo.md`: exemplo de divisão da sessão de 3 h.

## [0.1.0] — 2026-11-16

### Adicionado
- Taxonomia v0.1: 36 assuntos (27 específicos, 9 gerais) e 194 subtópicos, extraídos dos editais TRT-3 2022, TRT-4 2026, TJMG 2022 e TRF-6 2024.
- Matriz de incidência por concurso e fórmula de prioridade com pesos por concurso-alvo.
- Rubricas de discursiva das bancas Fumarc, FCC, IBFC e Cebraspe.
- Migração inicial do banco (21 tabelas, 2 visões, RLS).
- Script `scripts/gerar_seed.py` para gerar a carga inicial.
- Documentação: visão e escopo, arquitetura, modelo de dados, regras de estudo e ADRs 001 a 005.
