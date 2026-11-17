# ADR-007 — Código em inglês, documentação e interface em português

**Status:** aceito · **Data:** 2026-11-17 · **Substitui:** a regra "Documentação e código em português" do `CLAUDE.md` e a seção Nomenclatura do doc 06

## Contexto
Até a SPEC-001, a regra era escrever código e documentação em português, com os termos do domínio sem acento e iguais aos do banco. Durante a implementação da SPEC-001, o dono do projeto decidiu que tudo o que é código passa para o inglês, mantendo a documentação em português. Nenhuma migração foi aplicada fora do ambiente local, então o banco ainda pode ser renomeado sem migração de dados.

## Decisão
| Em inglês | Em português |
|---|---|
| Identificadores de código (variáveis, funções, tipos, componentes) | Documentação (`docs/`, `README.md`, `CHANGELOG.md`, specs, ADRs) |
| Nomes de arquivos e pastas de código, rotas da aplicação | Textos da interface (rótulos, mensagens, títulos, mensagens de validação) |
| Comentários no código, nomes de testes | Instruções dos agentes (`.claude/agents/`) |
| Banco: tabelas, colunas, enums e seus valores, visões, políticas, índices, comentários SQL | Dados de conteúdo: nomes de assuntos, enunciados, ids de registros de referência (`trt3`, `pdpj_stack`, `fumarc_redacao`), que são dados estáveis (ADR-004) |
| Chaves do JSON de origem (`data/seed/`) | Valores textuais do JSON (nomes, critérios descritos) |
| Classes CSS, tokens de design, scripts npm | — |
| Mensagens de commit (Conventional Commits) | — |

- A tradução de cada termo do domínio é fixa e está em [`docs/08-glossario.md`](../08-glossario.md). Termo novo entra no glossário antes de entrar no código.
- O banco e o código usam o mesmo termo em inglês (ex.: tabela `cards`, tipo `Card`, módulo `review`).

## Alternativas consideradas
- **Manter tudo em português:** regra anterior; descartada pelo dono do projeto.
- **Só o TypeScript em inglês, banco em português:** as queries e os tipos gerados misturariam os dois idiomas (`from('configuracoes').select('tema')` dentro de `getTheme`).
- **Interface em inglês:** fora de questão; o usuário estuda para concursos brasileiros.

## Consequências
- A migração inicial e a do tema são reescritas em inglês (permitido só porque nunca foram aplicadas em ambiente compartilhado). Daqui em diante vale de novo: migração aplicada não se edita.
- O `CLAUDE.md`, o doc 06, a skill `commit` e os agentes passam a citar esta regra.
- Specs e docs continuam em português, mas citam os identificadores em inglês.
