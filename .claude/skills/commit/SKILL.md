---
name: commit
description: Cria commits padronizados no Gabarita (Conventional Commits em inglês, com escopo do módulo e referência à spec). Use quando o usuário pedir para commitar, fazer commit, salvar as mudanças no git ou digitar /commit.
model: sonnet
---

# Commits padronizados do Gabarita

Formato: [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/), com mensagem inteira em inglês (tipo, escopo, descrição e corpo), conforme o ADR-007.

```
<type>(<scope>): <description>

<optional body: why the change was made>

<footer: Spec, ADR, BREAKING CHANGE, co-author>
```

## Tipos

| Tipo | Quando |
|---|---|
| `feat` | Funcionalidade nova para o usuário |
| `fix` | Correção de bug |
| `refactor` | Mudança de código sem alterar comportamento |
| `test` | Só testes (novos ou corrigidos) |
| `docs` | Só documentação (docs/, specs, ADRs, README, CHANGELOG) |
| `style` | Formatação, sem mudança de lógica |
| `perf` | Melhoria de desempenho |
| `build` | Dependências, configuração de build, package.json |
| `ci` | Pipelines de integração contínua |
| `chore` | Manutenção que não se encaixa acima (ex.: .gitignore, agentes) |
| `revert` | Desfaz um commit anterior |

## Escopos

Use o módulo ou a área afetada. Omita o escopo só se a mudança for realmente transversal.

- **Módulos:** `auth`, `settings`, `questions`, `review`, `schedule`, `mock-exams`, `essays`, `materials`, `ai` (nomes do glossário, `docs/08-glossario.md`)
- **Áreas:** `ui`, `db`, `seed`, `design`, `specs`, `adr`, `e2e`, `infra`, `agents`, `deps`

## Regras da mensagem

- Descrição no imperativo, minúscula, sem ponto final, até 72 caracteres: `feat(review): add 1–4 shortcuts to card rating`.
- Corpo explica **por quê**, não o quê (o diff já mostra o quê). Linhas de até 72 caracteres.
- Rodapé:
  - `Spec: SPEC-NNN` quando a mudança implementa uma spec de `docs/specs/`.
  - `ADR: ADR-NNN` quando aplica ou cria uma decisão.
  - `BREAKING CHANGE: <descrição>` (e `!` após o escopo) para mudança incompatível, ex.: migração que altera coluna usada.
  - Sempre termine com a linha de coautoria:
    `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`

## Procedimento

1. **Inspecionar:** `git status`, `git diff` e `git diff --staged`. Veja também `git log --oneline -10` para manter o tom dos commits anteriores.
2. **Barrar o que não pode entrar.** Pare e avise o usuário se houver:
   - `.env` ou qualquer arquivo com chave, token ou `service_role`;
   - backups do banco, dumps ou dados pessoais;
   - edição de migração já existente em `supabase/migrations/` (deve ser migração nova);
   - edição manual de `supabase/seed.sql` sem alteração correspondente em `data/seed/`.
3. **Verificar**, se os scripts existirem: `npm run lint`, `npm run typecheck`, `npm test`. Se algo falhar, mostre o erro e não commite, a menos que o usuário mande commitar mesmo assim.
4. **Separar em commits atômicos:** uma intenção por commit. Ex.: migração + pgTAP num commit `feat(db)`, domínio + testes em outro `feat(review)`, docs no seu. Adicione arquivos pelo nome (`git add caminho`), nunca `git add -A` às cegas.
5. **Conferir pendências de documentação:** mudou schema, regra ou decisão e o `CHANGELOG.md` / doc correspondente não foi atualizado? Avise antes de commitar.
6. **Commitar** passando a mensagem por heredoc (Bash) para preservar quebras de linha:
   ```bash
   git commit -F - <<'EOF'
   feat(review): schedule next due date with ts-fsrs

   Desired retention comes from settings so the user's adjustment
   is respected.

   Spec: SPEC-003
   Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
   EOF
   ```
7. **Mostrar o resultado:** `git log --oneline -n <quantidade criada>`.

## Branches

- Funcionalidade com spec: branch `feat/spec-NNN-nome-curto` (ou `fix/...`). Se estiver na `main` com mudanças de uma spec, pergunte se deve criar a branch antes de commitar.
- O commit inicial do repositório e ajustes de documentação podem ir direto na `main`.

## Nunca

- `--no-verify`, `--amend` ou `push` sem pedido explícito do usuário.
- Commitar com teste falhando sem o usuário autorizar.
- Mensagens genéricas: `update`, `tweaks`, `wip`, `fix stuff`.
