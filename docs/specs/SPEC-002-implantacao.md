# SPEC-002 — Implantação

**Status:** concluida · **Criada:** 2026-11-17 · **Atualizada:** 2026-11-18
**Módulo:** — (infraestrutura: `scripts/`, `vercel.json`, `next.config.ts`, `docs/operacao/`) · **ADRs relacionados:** ADR-001, ADR-004, ADR-005, ADR-006, ADR-007, ADR-008

## 1. Objetivo
Colocar o Gabarita no ar para o uso real: projeto Supabase remoto com as migrações e o seed, aplicação na Vercel, autenticação travada para um único usuário e uma rotina de backup que já tenha sido restaurada pelo menos uma vez. Tudo no plano gratuito, sem segredo no repositório público e com procedimentos escritos (runbooks), para que implantar, aplicar migração e restaurar backup sejam passos repetíveis e não memória.

## 2. Regras de origem
| Regra | Origem | Interpretação ou esclarecimento |
|---|---|---|
| Next.js na Vercel (Hobby) + Supabase (gratuito), custo zero | ADR-001; `docs/02-arquitetura.md` § Visão geral | Nenhum serviço pago: sem domínio próprio, sem plano Pro, sem armazenamento pago para backup (P-2, P-7). |
| Supabase gratuito pausa após 7 dias sem uso e não tem backup automático | ADR-001 § Consequências; `docs/02-arquitetura.md` § Restrições do plano gratuito | A "rotina semanal de exportação" é criada nesta spec (§ 5.7). A exportação pelo painel não existe no plano gratuito; a rotina usa `supabase db dump` (`pg_dump` da imagem Docker da CLI, na mesma versão do Postgres remoto). |
| Cadastro público desativado; RLS em toda tabela | ADR-005 | No remoto, o cadastro é desligado no painel (o `supabase/config.toml` só vale para o local). A RLS chega pelas migrações já existentes e é verificada no remoto com pgTAP (P-11) e com a checagem de produção (CA-12). |
| Chaves só em variável de ambiente do servidor; `service_role` só em scripts locais | `docs/02-arquitetura.md` § Segurança; `docs/06-padroes-de-codigo.md` § Segurança | Na Vercel entram só `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. A chave secreta do projeto remoto **não é usada em nenhum lugar** desta spec: o usuário real é criado pelo painel. A senha do banco remoto (necessária para `db push` e `db dump`) vive só no gerenciador de senhas e entra por variável de ambiente da sessão do terminal. |
| Migração aplicada não se edita | `CLAUDE.md`; `docs/06-padroes-de-codigo.md` § Banco | Passa a ter guarda automática antes de aplicar no remoto (CA-5). Depois da primeira implantação, a exceção usada no ADR-007 ("nenhuma migração havia sido aplicada fora do local") deixa de existir. |
| Seed gerado do JSON, idempotente | ADR-004; `docs/03-modelo-de-dados.md` § Carga inicial | O mesmo `supabase/seed.sql` vai para o remoto; por ser idempotente, reaplicá-lo quando a taxonomia mudar é seguro. Consequência aceita: o seed sobrescreve `exams.target_weight` e `rubrics.definition` no remoto (o JSON é a fonte da verdade). |
| Pirâmide de testes; E2E contra Supabase local | ADR-006; `docs/07-estrategia-de-testes.md` | Nada desta spec roda E2E contra produção. O que é testável vira teste unitário (funções puras dos scripts) ou de integração (restauração no Supabase local); o resto é checklist manual, marcado como tal na coluna "Teste". |
| Backup jamais no git | Repositório público; `.gitignore` (`backups/`, `*.dump`, `*.backup`) | O script de backup recusa destino dentro do repositório (CA-17), e não apenas confia no `.gitignore`. |
| Código em inglês; documentação em português | ADR-007 | Scripts, chaves de manifesto e nomes de arquivo de backup em inglês; runbooks em português. |

## 3. Escopo
**Dentro:**
- **Supabase remoto:** criação do projeto na região `sa-east-1`, São Paulo (P-1), conferência da versão do Postgres (igual ao `major_version = 17` do `config.toml`), `supabase link`, aplicação das 3 migrações e do seed, cadastro desligado e demais ajustes de Auth no painel (Site URL, URLs de redirecionamento, login anônimo desligado, comprimento mínimo de senha, SSL obrigatório), criação do usuário real pelo painel com e-mail confirmado.
- **Vercel:** projeto ligado ao repositório pela integração Vercel–GitHub, implantação automática só da `main` (P-3, P-4), as duas variáveis públicas no ambiente Production, Node 26 no build (P-14), região das funções `gru1` (P-1).
- **`vercel.json`** com região das funções e implantação restrita à `main`.
- **Cabeçalhos de segurança mínimos** em `next.config.ts` (P-12): `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy` e `X-Robots-Tag: noindex, nofollow`. CSP fica fora.
- **Script `db:push`** que aplica migrações e seed no remoto com guardas: árvore limpa, branch publicada, nenhuma migração já existente na `main` alterada, nomes em ordem, *dry-run* exibido e confirmação digitando o identificador do projeto (§ 5.6).
- **Script `db:test:remote`**: pgTAP contra o projeto ligado, após cada aplicação de migração (P-11).
- **Script `backup`**: exportação de papéis, schema e dados (inclusive `auth.users`) para diretório fora do repositório, com manifesto (data, commit, última migração, contagem de linhas por tabela, SHA-256 de cada arquivo), validação de completude, retenção e arquivo criptografado para a cópia no Google Drive (P-7, § 5.7).
- **Script `backup:verify`**: restaura um backup no Supabase **local** (guarda de URL local) e compara a contagem de linhas com o manifesto; é o ensaio de restauração.
- **Script `check:prod`**: checagem sem credenciais contra produção (redirecionamento sem sessão, cabeçalhos, HSTS, cadastro desligado via `/auth/v1/settings`, `anon` sem acesso às 21 tabelas) (P-10).
- **Proteção de contas e da `main`** (P-13): 2FA em GitHub, Vercel e Supabase; regra da `main` exigindo PR e o check `verify` do CI.
- **Runbooks** em `docs/operacao/`: `implantacao.md` (primeira implantação, implantação de rotina, aplicação de migração, projeto pausado, rotação da senha do banco) e `backup-e-restauracao.md` (rotina semanal, onde guardar, ensaio de restauração, restauração em projeto novo).
- **Primeiro ensaio de restauração** com um backup real de produção, antes de fechar a spec.
- **Atualizações de documentação (entregáveis da implementação):**
  - `docs/02-arquitetura.md`: § Restrições do plano gratuito aponta para o runbook de backup; nova § Implantação (regiões, fluxo `main` → Vercel, migrações aplicadas pela CLI local).
  - `docs/06-padroes-de-codigo.md`: § Banco ganha a regra de migração compatível com o código em produção (P-5); § Segurança ganha "senha do banco remoto só em variável de ambiente da sessão, nunca em arquivo versionado nem em segredo de Actions" (P-6).
  - `docs/07-estrategia-de-testes.md`: comandos novos (`backup:verify`, `db:test:remote`, `check:prod`) e o que roda contra produção.
  - `docs/README.md` (índice com `docs/operacao/`), `README.md` (Estado atual, comandos, link para os runbooks) e `CHANGELOG.md` citando a SPEC-002.
  - [ADR-008](../adr/ADR-008-implantacao-e-backup-locais.md) (implantação e backup manuais pela máquina local), redigido em 2026-11-18.

**Fora (fica para depois):**
- Domínio próprio (custa dinheiro; P-2).
- Ambiente de homologação (segundo projeto Supabase) e previews por PR (P-4).
- Aplicação de migrações ou backup por GitHub Actions (P-6, P-8).
- E2E com login real contra produção (P-10).
- CSP com nonce (exige renderização dinâmica e ajuste no `proxy.ts`; reavaliar quando houver Markdown de materiais renderizado, doc 06 § Segurança).
- Monitoramento, alertas e *keep-alive* automático contra pausa (P-9).
- Fuso horário do servidor: as funções da Vercel rodam em UTC. Esta spec não tem regra de data; as specs de cronograma e revisão precisam fixar o fuso (`America/Sao_Paulo`) ao derivar "dia" a partir de `now`. Registrado aqui para não se perder.
- Recuperação de senha por e-mail (continua fora, como na SPEC-001; em caso de perda, a senha é redefinida pelo painel do Supabase).

## 4. Critérios de aceite
Implantação tem muitos itens que só existem nos painéis da Vercel, do Supabase e do GitHub. Eles aparecem como **manual (checklist)**: são conferidos pelo dono do projeto seguindo o runbook, e o revisor confere que o runbook cobre cada um. **Produção (script)** significa que roda contra o ambiente real, sem credenciais, com `npm run check:prod`.

**Configuração versionada**

| # | Dado / Quando / Então | Teste |
|---|---|---|
| CA-1 | Dado `vercel.json`, quando é lido, então define `regions` com uma única região, `gru1` (P-1) e `git.deploymentEnabled` que habilita só a `main`. | unitário (leitura do JSON) |
| CA-2 | Dado `next.config.ts`, quando `headers()` é chamado, então devolve para `/:path*` exatamente: `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy: camera=(), microphone=(), geolocation=()`, `X-Robots-Tag: noindex, nofollow`; e `poweredByHeader` continua `false`. | unitário |
| CA-3 | Dado qualquer arquivo versionado (`git ls-files`), quando a varredura roda, então não há string de conexão Postgres com senha embutida (`postgres(ql)?://usuario:senha@`), nem uma chave `sb_secret_` completa (prefixo seguido de pelo menos 20 caracteres), nem JWT cujo papel (`role`) seja o da chave de serviço do Supabase, exceto no próprio arquivo de teste da varredura. | unitário (varredura de arquivos) |
| CA-4 | Dado todos os arquivos de `.github/workflows/`, quando são lidos, então nenhum referencia `secrets.` (além do `GITHUB_TOKEN` implícito) nem `pull_request_target`, e todos têm `permissions: contents: read`. | unitário (leitura do YAML) |

**Migrações no remoto**

| # | Dado / Quando / Então | Teste |
|---|---|---|
| CA-5 | Dado um destes casos: árvore de trabalho com mudanças; `HEAD` diferente do upstream (branch não publicada ou atrás); arquivo de `supabase/migrations/` que já existe em `origin/main` modificado, renomeado ou apagado; migração nova com timestamp menor ou igual ao da última migração de `origin/main`; nome fora do padrão `AAAAMMDDHHmmss_snake_case.sql` — quando rodo `npm run db:push`, então o script termina com código diferente de 0, lista **todos** os motivos em português e não chama `supabase db push`. | unitário (`checkMigrationPreflight`) |
| CA-6 | Dado a verificação prévia aprovada, quando rodo `npm run db:push`, então o script mostra o identificador do projeto ligado e a saída do `supabase db push --remote --dry-run --include-seed`, pede que eu digite esse identificador e só aplica se o texto digitado for igual; qualquer outra resposta aborta sem aplicar. Sem projeto ligado, termina com erro orientando o `supabase link`. | unitário (orquestração com executor de comandos e confirmação injetados) |
| CA-7 | Dado `SUPABASE_DB_PASSWORD` ausente na sessão, quando rodo `db:push`, `db:test:remote` ou `backup`, então o script termina com erro dizendo qual variável falta, sem mostrar valores e sem abrir conexão. | unitário |
| CA-8 | Dado o projeto remoto recém-criado, quando a primeira implantação do banco é feita com `db:push`, então o histórico remoto tem exatamente as 3 migrações do repositório e `npm run db:test:remote` passa todos os testes pgTAP (RLS das 21 tabelas, `security_invoker` das visões, tema, restrições e contagens do seed: 7 bancas, 9 rubricas, 14 concursos, 38 assuntos, 218 subtópicos, 532 incidências). | manual (checklist) + pgTAP contra o remoto |
| CA-9 | Dado o banco remoto após `db:test:remote`, quando conto as linhas das tabelas pessoais, então estão como antes do teste (os testes rodam em transação com `rollback` e não deixam dados nem a extensão `pgtap`). | manual (checklist, consulta no SQL Editor) |

**Produção**

| # | Dado / Quando / Então | Teste |
|---|---|---|
| CA-10 | Dado a URL de produção, quando acesso `/` sem sessão, então recebo redirecionamento (307) para `/login?next=%2F`; e `/login` responde 200. | produção (script) |
| CA-11 | Dado `/login` em produção, quando inspeciono a resposta, então tem os cabeçalhos de CA-2, `Strict-Transport-Security` e não tem `X-Powered-By`. | produção (script) |
| CA-12 | Dado a chave publicável de produção sem sessão, quando consulto `GET /auth/v1/settings`, então `disable_signup` é `true`; e quando faço `GET /rest/v1/<tabela>?select=*&limit=1` para cada uma das 21 tabelas de `public` (lista lida de `database.types.ts`), então cada resposta é lista vazia ou erro de permissão, nunca uma linha. | produção (script) |
| CA-13 | Dado o painel do Supabase, quando confiro Auth, então: cadastro por e-mail desligado; login anônimo desligado; Site URL = URL de produção; URLs de redirecionamento só a de produção; comprimento mínimo de senha 12 (P-13); existe exatamente 1 usuário, com e-mail confirmado. E em Database: SSL obrigatório ligado e versão do Postgres 17. | manual (checklist) |
| CA-14 | Dado o painel da Vercel, quando confiro o projeto, então: só `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` existem, no ambiente Production, com os valores do projeto remoto; nenhuma outra variável; o build usa Node 26; a proteção de implantação não bloqueia a produção; push na `main` gera implantação de produção e push em outra branch não gera implantação. | manual (checklist) |
| CA-15 | Dado o usuário real em produção, quando faço login no computador e no celular (360 px), então chego à casca do app; a linha de `settings` é criada; escolher "Escuro" no computador aparece no celular no próximo carregamento completo; "Sair" encerra só o aparelho atual; senha errada mostra "E-mail ou senha incorretos.". | manual (checklist; repete as jornadas 1 e 7 da SPEC-001 no ambiente real) |
| CA-16 | Dado o GitHub, quando confiro o repositório e as contas, então a `main` exige PR e o check `verify` verde antes do merge e não aceita push direto nem force push; GitHub, Vercel e Supabase têm 2FA ligado. | manual (checklist) |

**Backup e restauração**

| # | Dado / Quando / Então | Teste |
|---|---|---|
| CA-17 | Dado `GABARITA_BACKUP_DIR` relativo, ou apontando para o repositório ou para dentro dele (inclusive por caminho com `..` ou link simbólico resolvido), quando rodo `npm run backup`, então o script recusa antes de conectar; sem a variável, usa o padrão de § 5.7, que fica fora do repositório. | unitário (`resolveBackupBase`, `isInsideDirectory`) |
| CA-18 | Dado um backup bem-sucedido, então existe `<base>/<AAAA-MM-DDTHHmmssZ>/` (UTC, a partir de `now` injetado) com `roles.sql`, `schema.sql`, `data.sql` e `manifest.json`; o manifesto passa no esquema Zod e contém data, commit do repositório, última migração local, versão da CLI, tamanho e SHA-256 de cada arquivo e contagem de linhas por tabela. | unitário (`backupDirectoryName`, `buildManifest`, `manifestSchema`) + manual (primeira execução real) |
| CA-19 | Dado o conteúdo de um `data.sql`, quando `summarizeDataDump` analisa, então conta as linhas de cada bloco `COPY <schema>.<tabela> ... FROM stdin;` até `\.`, inclusive tabela vazia (0) e linhas com tabulação, barra invertida e acentos escapados; bloco `COPY` sem terminador ou dump em formato `INSERT` gera erro. | unitário |
| CA-20 | Dado um dump em que falta o bloco de alguma das 21 tabelas de `public` ou de `auth.users`, ou em que `auth.users` tem 0 linhas, ou em que algum dos três `supabase db dump` termina com erro, quando o backup termina, então o script sai com código diferente de 0, renomeia o diretório para `<nome>.incomplete` e não aplica a retenção. Se só a criptografia (CA-22) falha, o backup está completo: o script também sai com código diferente de 0 (`ok: false`), mas o diretório mantém o nome normal (sem `.incomplete`) e a retenção não é aplicada. | unitário (`validateDump`) + unitário (orquestração com executor injetado) |
| CA-21 | Dado backups completos além do limite de retenção de 8 cópias (P-8), quando um backup novo termina com sucesso, então são apagados só os mais antigos cujo nome segue o padrão de CA-18, junto com o respectivo `<nome>.tar.gz.gpg`, só dentro da base, nunca diretórios `.incomplete` nem arquivos com outro nome. | unitário (`selectBackupsToPrune`) |
| CA-22 | Dado um backup bem-sucedido (P-7: cópia criptografada para o Google Drive), quando o backup termina, então também existe `<nome>.tar.gz.gpg` criado por `gpg --symmetric` (senha pedida pelo próprio `gpg`, nunca passada por argumento ou variável do script). | unitário (argumentos montados) + manual (descriptografar uma vez no ensaio de CA-25) |
| CA-23 | Dado um diretório de backup, quando rodo `npm run backup:verify <diretório>` com a URL do Supabase diferente de local, então recusa sem conectar; quando algum SHA-256 não confere com o manifesto, então recusa antes de restaurar. | unitário (guarda de URL e checagem de hash) |
| CA-24 | Dado um backup gerado do Supabase local com dados de fábrica (usuário e linhas pessoais conhecidas), quando `backup:verify` restaura no Supabase local zerado, então a contagem de cada tabela é igual à do manifesto e o script termina com 0; com uma contagem adulterada no manifesto (e hash ajustado), termina com diferença listada por tabela. | integração (Supabase local) |
| CA-25 | Dado o primeiro backup real de produção, quando faço o ensaio de restauração no Supabase local seguindo o runbook, então as contagens conferem, consigo entrar no app local com o e-mail e a senha reais (prova de que `auth.users` foi restaurado) e vejo meus dados; a data do ensaio fica registrada no runbook. | manual (checklist; obrigatório para fechar a spec) |
| CA-26 | Dado o runbook de backup, quando o revisor lê, então ele cobre: frequência e lembrete, comando, onde guardar cada cópia, retenção, ensaio de restauração periódico, restauração em projeto Supabase novo (ordem `roles` → `schema` → dados com `session_replication_role = replica`, troca das variáveis na Vercel) e o que fazer se o backup falhar. | manual (revisão de documentação) |
| CA-27 | Dado o runbook de implantação, quando o revisor lê, então cobre cada item de CA-8, CA-13 a CA-16, a aplicação de migração de rotina (CA-5, CA-6, P-5), o projeto pausado (como perceber: login mostra "Não foi possível entrar agora…" da SPEC-001; como reativar pelo painel; prazo de restauração do plano gratuito) e a rotação da senha do banco. | manual (revisão de documentação) |

Casos-limite do doc 07 aplicáveis: funções com `now` injetado (nome do diretório, data no manifesto); nenhum teste unitário toca rede, Docker ou o remoto (executor de comandos e `fetch` injetados); testes independentes da ordem (diretórios temporários por teste); a integração de CA-24 parte de banco limpo (`supabase db reset`) e cria os dados por fábricas de `tests/factories/`.

## 5. Design técnico

### 5.1 Arquivos por camada
Não há código de aplicação novo em `src/` além de `next.config.ts`. Os scripts seguem o padrão dos existentes (`scripts/generate-tokens-css.ts`, `scripts/create-test-user.ts`): funções puras exportadas e testadas, e um bloco final que só roda quando o arquivo é executado diretamente.

| Camada | Arquivo | Criar/Alterar | Responsabilidade |
|---|---|---|---|
| raiz | `vercel.json` | Criar | `regions` = `gru1` (P-1) e `git.deploymentEnabled` só para `main` (CA-1) |
| raiz | `next.config.ts` | Alterar | `headers()` com os cabeçalhos de CA-2 |
| raiz | `package.json` | Alterar | Scripts de § 5.2 |
| scripts | `scripts/local-supabase.ts` | Criar | `isLocalUrl` e `readLocalSupabase` extraídos de `create-test-user.ts` (reuso em `verify-backup.ts`) |
| scripts | `scripts/create-test-user.ts` | Alterar | Passa a importar de `local-supabase.ts`; comportamento igual |
| scripts | `scripts/command-runner.ts` | Criar | Tipo `CommandRunner` e implementação com `execFile` (sem shell, argumentos em lista) |
| scripts | `scripts/remote-env.ts` (+ `.test.ts`) | Criar | `requireDbPassword(env)` (CA-7) e leitura do projeto ligado em `supabase/.temp/project-ref` |
| scripts | `scripts/push-migrations.ts` (+ `.test.ts`) | Criar | `checkMigrationPreflight`, `pushMigrations` (CA-5, CA-6) |
| scripts | `scripts/test-remote.ts` (+ `.test.ts`) | Criar | `testRemote`: exige `SUPABASE_DB_PASSWORD` e só então roda `supabase test db --remote` (CA-7); `db:test:remote` aponta para ele |
| scripts | `scripts/backup-db.ts` (+ `.test.ts`) | Criar | `resolveBackupBase`, `backupDirectoryName`, `summarizeDataDump`, `validateDump`, `buildManifest`, `selectBackupsToPrune`, `runBackup` (CA-17 a CA-22) |
| scripts | `scripts/backup-manifest.ts` | Criar | `manifestSchema` e tipos, compartilhados por backup e verificação |
| scripts | `scripts/verify-backup.ts` (+ `.test.ts`, `.int.test.ts`) | Criar | `compareCounts`, `verifyBackup` com guarda local (CA-23, CA-24) |
| scripts | `scripts/check-production.ts` (+ `.test.ts`) | Criar | `checkProduction` com `fetch` injetado (CA-10 a CA-12) |
| scripts | `scripts/public-tables.ts` (+ `.test.ts`) | Criar | Lista as tabelas de `public` a partir de `database.types.ts` (usada por backup e checagem; o teste confere que são 21 e iguais às do `rls.test.sql`) |
| testes | `tests/config/vercel.test.ts`, `tests/config/next-headers.test.ts` | Criar | CA-1, CA-2 |
| testes | `tests/security/keys.test.ts` | Alterar | CA-3 (varredura de todos os arquivos versionados) |
| testes | `tests/ci/workflow.test.ts` | Alterar | CA-4 (todos os workflows) |
| testes | `tests/fixtures/backup/` | Criar | `data.sql` de exemplo (vazio, com escapes, sem terminador, formato `INSERT`) para CA-19 e CA-20 |
| docs | `docs/operacao/implantacao.md` | Criar | Runbook de implantação (CA-27) |
| docs | `docs/operacao/backup-e-restauracao.md` | Criar | Runbook de backup e restauração, com registro dos ensaios (CA-26) |
| docs | `docs/02`, `docs/06`, `docs/07`, `docs/README.md`, `README.md`, `CHANGELOG.md` | Alterar | Ver § 3, "Atualizações de documentação" |
| docs | `docs/adr/ADR-008-implantacao-e-backup-locais.md` | Criado (2026-11-18) | Decisão de § 7 |

`supabase/config.toml` **não** muda: ele descreve o ambiente local. Nenhum `supabase config push` é usado (§ 7).

### 5.2 Contratos

**Scripts npm**

| Script | Comando | Onde roda |
|---|---|---|
| `db:link` | `supabase link --project-ref` (identificador passado na linha de comando) | local, uma vez por máquina |
| `db:push` | `node scripts/push-migrations.ts` | local, contra o remoto |
| `db:test:remote` | `node scripts/test-remote.ts` | local, contra o remoto, depois de `db:push` |
| `backup` | `node scripts/backup-db.ts` | local, contra o remoto |
| `backup:verify` | `node scripts/verify-backup.ts` | local, contra o Supabase local |
| `check:prod` | `node scripts/check-production.ts` | local, contra a produção, sem credenciais |

O CI não muda: nenhum desses comandos roda no GitHub Actions. Os testes unitários deles entram no `npm test` e, portanto, no CI.

**Variáveis lidas pelos scripts (nunca versionadas)**

| Variável | Usada por | Observação |
|---|---|---|
| `SUPABASE_DB_PASSWORD` | `db:push`, `db:test:remote`, `backup` | Lida pela própria CLI do Supabase. Definida só na sessão (`read -s`), copiada do gerenciador de senhas; nunca em `.env*`, arquivo versionado ou segredo do GitHub |
| `GABARITA_BACKUP_DIR` | `backup` | Opcional; caminho absoluto fora do repositório |
| `GABARITA_BACKUP_KEEP` | `backup` | Opcional; padrão 8 (P-8) |
| `PRODUCTION_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | `check:prod` | Valores públicos de produção, passados na linha de comando ou num `.env.production.local` (já ignorado pelo `.gitignore`) |

**Executor de comandos**

```ts
// scripts/command-runner.ts
export type CommandResult = { code: number; stdout: string; stderr: string };
/** Runs without a shell; arguments are never interpolated into a string. */
export type CommandRunner = (
  command: string,
  args: readonly string[],
  options?: { env?: Record<string, string | undefined>; cwd?: string },
) => Promise<CommandResult>;
export const runCommand: CommandRunner;
```

**Variáveis remotas**

```ts
// scripts/remote-env.ts
export function requireDbPassword(
  env: Record<string, string | undefined>,
): { ok: true } | { ok: false; message: string }; // message names the variable, never the value
export function readLinkedProjectRef(repoRoot: string): Promise<string | null>; // supabase/.temp/project-ref
```

**Aplicação de migrações**

```ts
// scripts/push-migrations.ts
export const MIGRATION_NAME = /^\d{14}_[a-z0-9_]+\.sql$/;

export type GitSnapshot = {
  porcelainStatus: string;                // git status --porcelain
  head: string;                           // git rev-parse HEAD
  upstream: string | null;                // git rev-parse @{u} (after git fetch)
  changesSinceMain: ReadonlyArray<{       // git diff --name-status origin/main...HEAD -- supabase/migrations
    status: 'A' | 'M' | 'D' | `R${string}` | string;
    path: string;
  }>;
  mainMigrations: readonly string[];      // git ls-tree --name-only origin/main supabase/migrations/
};

export type PreflightError =
  | { type: 'dirty_worktree' }
  | { type: 'no_upstream' }
  | { type: 'not_pushed' }
  | { type: 'applied_migration_changed'; path: string }
  | { type: 'migration_out_of_order'; file: string; latestOnMain: string }
  | { type: 'invalid_migration_name'; file: string };

export function checkMigrationPreflight(
  snapshot: GitSnapshot,
): { ok: true; newMigrations: string[] } | { ok: false; errors: PreflightError[] };

export function describePreflightError(error: PreflightError): string; // Portuguese message

/**
 * Order: preflight -> requireDbPassword -> linked ref -> `supabase db push --remote --dry-run --include-seed`
 * -> confirm(typed ref) -> `supabase db push --remote --include-seed`. The dry-run output is shown as is,
 * not parsed: reading it is the human check.
 */
export function pushMigrations(deps: {
  run: CommandRunner;
  confirm: (prompt: string) => Promise<string>;
  readSnapshot: () => Promise<GitSnapshot>;
  linkedRef: () => Promise<string | null>;
  env: Record<string, string | undefined>;
  log: (line: string) => void;
}): Promise<'pushed' | 'aborted' | 'refused'>;
```

**Backup**

```ts
// scripts/backup-manifest.ts
export const BACKUP_FILES = ['roles.sql', 'schema.sql', 'data.sql'] as const;
export type BackupFile = (typeof BACKUP_FILES)[number];
export type TableCounts = Record<string, number>; // 'public.answers' -> 120, 'auth.users' -> 1
export const manifestSchema = z.object({
  createdAt: z.iso.datetime(),
  gitCommit: z.string().regex(/^[0-9a-f]{40}$/),
  latestMigration: z.string().regex(MIGRATION_NAME),
  supabaseCliVersion: z.string().min(1),
  files: z.record(z.enum(BACKUP_FILES), z.object({ bytes: z.number().int().positive(), sha256: z.string().regex(/^[0-9a-f]{64}$/) })),
  rowCounts: z.record(z.string(), z.number().int().nonnegative()),
});
export type BackupManifest = z.infer<typeof manifestSchema>;

// scripts/backup-db.ts
export const BACKUP_NAME = /^\d{4}-\d{2}-\d{2}T\d{6}Z$/;
export function backupDirectoryName(now: Date): string;           // UTC, e.g. 2026-11-17T183000Z
export function isInsideDirectory(child: string, parent: string): boolean; // on resolved real paths
export function resolveBackupBase(input: {
  env: Record<string, string | undefined>;
  home: string;
  repoRoot: string;
}): { ok: true; path: string } | { ok: false; error: 'not_absolute' | 'inside_repository' };
export function summarizeDataDump(sql: string): TableCounts;       // throws on unterminated COPY or INSERT format
export function validateDump(
  counts: TableCounts,
  requiredTables: readonly string[],                               // 21 public tables + 'auth.users'
): { ok: true } | { ok: false; missing: string[]; emptyUsers: boolean };
export function buildManifest(input: {
  now: Date;
  gitCommit: string;
  latestMigration: string;
  supabaseCliVersion: string;
  files: Record<BackupFile, { bytes: number; sha256: string }>;
  rowCounts: TableCounts;
}): BackupManifest;
export function selectBackupsToPrune(entries: readonly string[], keep: number): string[];
/**
 * Runs `supabase db dump --remote` three times (--role-only; schema; --data-only --use-copy),
 * validates, writes the manifest, encrypts the copy for the cloud (P-7) and only then prunes.
 */
export function runBackup(deps: {
  run: CommandRunner;
  now: Date;
  env: Record<string, string | undefined>;
  fs: BackupFs;                                                    // injected for tests
  log: (line: string) => void;
  home: string;                                                    // base padrão: <home>/gabarita-backups
  repoRoot: string;                                                // cwd dos comandos e raiz proibida para o destino
  publicTables: readonly string[];                                 // tabelas de public exigidas no dump (de database.types.ts)
}): Promise<{ ok: true; directory: string } | { ok: false; directory?: string; reason: string }>;

// scripts/verify-backup.ts
export function compareCounts(
  expected: TableCounts,
  actual: TableCounts,
): { ok: true } | { ok: false; differences: Array<{ table: string; expected: number; actual: number | null }> };
/** Refuses unless the local Supabase URL passes isLocalUrl; checks hashes before restoring. */
export function verifyBackup(directory: string, deps: VerifyDeps): Promise<{ ok: true } | { ok: false; reason: string }>;
```

**Checagem de produção**

```ts
// scripts/check-production.ts
export type ProductionCheck = { name: string; ok: boolean; detail: string }; // detail never echoes keys
export const EXPECTED_HEADERS: Readonly<Record<string, string>>;            // same values as CA-2
export function checkProduction(
  input: { appUrl: string; supabaseUrl: string; publishableKey: string; tables: readonly string[] },
  fetchFn: (url: string, init?: RequestInit) => Promise<Response>,
): Promise<ProductionCheck[]>;
// '/' with redirect: 'manual' -> 307 to /login?next=%2F; '/login' -> 200, headers, HSTS, no X-Powered-By;
// GET /auth/v1/settings -> disable_signup === true;
// GET /rest/v1/<table>?select=*&limit=1 -> [] or 401/403 for each table.
```

A checagem de cadastro usa `/auth/v1/settings` (somente leitura) em vez de tentar um `signUp`: se o cadastro estivesse aberto por engano, a checagem criaria um usuário.

**Configuração**

```jsonc
// vercel.json (região decidida em P-1)
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "regions": ["gru1"],
  "git": { "deploymentEnabled": { "main": true, "*": false } }
}
```

Se a Vercel não aceitar o curinga em `deploymentEnabled` na versão vigente, a alternativa equivalente é o *Ignored Build Step* do painel com `[ "$VERCEL_GIT_COMMIT_REF" != "main" ]`; a escolha é registrada no histórico desta spec.

### 5.3 Banco
**Nenhuma migração nova e nenhuma mudança de schema.** O que muda é como as migrações existentes chegam ao remoto.

- **Ferramenta:** `supabase db push` da CLI fixada em `devDependencies` (3.2.0), contra o projeto ligado por `supabase link`. O vínculo fica em `supabase/.temp/` (já ignorado).
- **Quem e de onde:** o dono do projeto, da máquina local, com `npm run db:push` (P-6). Nunca pelo CI.
- **Quando:** decidido em P-5: depois da aprovação do PR e com os testes locais verdes (`db:test`, `test:int`, `test:e2e`), **antes** do merge, a partir da branch do PR já publicada; em seguida `db:test:remote` e o merge, que dispara a implantação da Vercel. Por isso, toda migração precisa ser compatível com o código que está em produção (aditiva: tabela, coluna anulável ou com padrão, enum com valor novo, índice). Mudança que quebra o código antigo (renomear, apagar, `not null` sem padrão) é feita em duas specs/PRs (expandir, depois contrair).
- **Proteções contra aplicar migração errada:** (1) a guarda de CA-5 impede aplicar migração alterada, fora de ordem ou não publicada; (2) o *dry-run* com confirmação pelo identificador do projeto (CA-6) impede aplicar no projeto errado; (3) a própria CLI recusa quando o histórico remoto tem versão que não existe localmente; (4) `db:test:remote` confirma RLS e restrições depois de aplicar; (5) backup antes de cada `db:push` que tenha migração (passo do runbook).
- **Seed:** vai junto com `--include-seed`, que lê `[db.seed] sql_paths` do `config.toml`. Como o seed é idempotente (ADR-004), reaplicar é seguro; a implementação confirma se a CLI 3.2.0 reaplica o seed a cada push ou só quando o arquivo muda e registra no runbook.
- **Versão do Postgres:** a do projeto remoto precisa ser a mesma do `major_version = 17` do `config.toml` (CA-13). Se o Supabase criar o projeto em outra versão, a implementação para e pergunta antes de mudar o `config.toml`.
- **Grants do remoto:** as migrações não fazem `grant` explícito e dependem do padrão do Supabase de expor tabelas novas de `public` a `authenticated`. Se o projeto remoto vier com esse padrão desligado, o `db:test:remote` (CA-8) falha nos testes de leitura e gravação de `authenticated`; a correção seria uma migração nova com os `grant`, em spec própria.
- **pgTAP no remoto (P-11):** os arquivos de `supabase/tests/` já rodam em `begin; ... rollback;` e criam a extensão `pgtap` dentro da transação, então não deixam rastro (CA-9). A contagem do seed no `schema_constraints.test.sql` serve também de conferência da carga inicial.
- **RLS:** sem política nova. Os usuários continuam sem FK para `auth.users`; por isso o backup **precisa** incluir `auth.users` com os mesmos `id` (§ 5.7).

### 5.4 Interface
Nenhuma tela nova nem alterada. Comportamentos do ambiente real que dependem do que a SPEC-001 já entrega:

- **Projeto Supabase pausado ou fora do ar:** o login mostra "Não foi possível entrar agora. Tente de novo em instantes." (CA-17 da SPEC-001). O runbook usa essa mensagem como sintoma de "verificar se o projeto está pausado".
- **Cookie de tema:** passa a sair com `Secure` em produção (já previsto na SPEC-001 pelo `NODE_ENV`).
- **Indexação:** `X-Robots-Tag: noindex, nofollow` em todas as respostas; a única página pública é `/login`.

### 5.5 Primeira implantação (resumo; o passo a passo fica no runbook)
1. 2FA nas três contas; regra da `main` no GitHub (CA-16).
2. Supabase: criar o projeto na região de P-1 com senha do banco gerada pelo gerenciador; conferir Postgres 17; desligar cadastro, login anônimo; Site URL e redirecionamento ficam para o passo 5; SSL obrigatório (CA-13).
3. Local: `npm run db:link -- <ref>`; `SUPABASE_DB_PASSWORD` na sessão; `npm run db:push`; `npm run db:test:remote` (CA-8, CA-9).
4. Vercel: importar o repositório; variáveis no Production; Node 26; região; conferir que a primeira implantação da `main` sai verde (CA-14).
5. Supabase: Site URL e redirecionamento com a URL da Vercel; criar o usuário real pelo painel ("Create new user", "Auto Confirm User"), senha do gerenciador (CA-13).
6. `npm run check:prod` (CA-10 a CA-12) e checklist com login real no computador e no celular (CA-15).
7. Primeiro `npm run backup` e ensaio de restauração com `backup:verify` e login local com o usuário real (CA-18, CA-25).

### 5.6 Implantação de rotina
- **Só código:** PR aprovado e CI verde → merge na `main` → a Vercel implanta → `npm run check:prod`.
- **Com migração:** testes locais verdes → `npm run backup` → `npm run db:push` (CA-5, CA-6) → `npm run db:test:remote` → merge → `npm run check:prod` (ordem decidida em P-5).
- **Reverter código:** "Promote" da implantação anterior no painel da Vercel (sem build novo). Migração não se reverte editando: corrige-se com migração nova ou, em último caso, restaura-se o backup tirado antes do `db:push`.
- **PR abandonado com migração já aplicada:** a CLI passa a recusar `db push` (versão remota sem arquivo local). O runbook descreve a saída: trazer a migração para a `main` ou desfazê-la com migração nova e reparar o histórico com `supabase migration repair`.

### 5.7 Backup e restauração
- **O que entra:** `roles.sql` (`--role-only`), `schema.sql` (schema) e `data.sql` (`--data-only --use-copy`), todos por `supabase db dump --remote`. O `data.sql` inclui `auth.users` e `auth.identities`; sem eles, os `user_id` das tabelas pessoais ficariam órfãos numa restauração em projeto novo.
- **Validação:** `summarizeDataDump` conta as linhas por tabela; `validateDump` exige o bloco das 21 tabelas de `public` e de `auth.users` com pelo menos 1 linha (CA-20). A lista das tabelas vem de `database.types.ts`, então tabela nova entra na validação automaticamente após `db:types`.
- **Manifesto:** CA-18. Serve ao `backup:verify` (contagens e hashes) e diz de qual migração o backup é, para restaurar com o código compatível.
- **Destino padrão (P-7):** `~/gabarita-backups/` no WSL como cópia primária e, criptografado com `gpg --symmetric`, uma pasta privada do Google Drive pessoal (plano gratuito) como cópia fora da máquina. O envio do `.tar.gz.gpg` para o Google Drive é manual (passo do runbook); o script não guarda credencial do Drive.
- **Retenção:** as 8 últimas cópias completas (P-8); ao podar `<nome>`, apaga-se também `<nome>.tar.gz.gpg`; `.incomplete` nunca é apagado automaticamente, para investigação. A poda só ocorre depois de a criptografia ter dado certo.
- **Ensaio (`backup:verify`):** sobe o Supabase local, `supabase db reset --no-seed` (schema pelas migrações, sem dados), copia o `data.sql` para o contêiner (`docker cp`), restaura-o com `psql` e `session_replication_role = replica` dentro de uma transação (removendo o arquivo temporário do contêiner ao final, mesmo em falha), compara as contagens e, no ensaio completo (CA-25), o dono entra no app local com a senha real. A restauração usa `psql` do contêiner do banco local (`docker exec`), para não exigir cliente Postgres instalado no WSL; se a implementação achar caminho mais simples com a CLI, registra no histórico.
- **Restauração em projeto novo (desastre):** manual e só pelo runbook, nunca por script: criar projeto, `psql` com `roles.sql`, `schema.sql` e `data.sql` (ordem da documentação do Supabase), conferir o histórico de migrações, trocar as duas variáveis na Vercel e reimplantar, ajustar Site URL, rodar `db:test:remote` e `check:prod`.
- **Pré-requisito:** Docker em execução (a CLI usa a imagem do Postgres para o `pg_dump`, com a mesma versão do remoto).

## 6. Plano de testes
| Nível | O que cobre | Critérios |
|---|---|---|
| Unitário | `vercel.json`; `headers()` do `next.config.ts`; varredura de segredos em arquivos versionados; leitura de todos os workflows; `checkMigrationPreflight` (cada erro isolado e todos juntos), `pushMigrations` com executor e confirmação simulados (confirmação certa, errada, sem projeto ligado); `requireDbPassword`; `resolveBackupBase` (relativo, repositório, subpasta, `..`, link simbólico, padrão); `backupDirectoryName` com `now` fixo; `summarizeDataDump` com as fixtures; `validateDump`; `buildManifest` + `manifestSchema`; `selectBackupsToPrune`; `runBackup` com falha em cada dump; argumentos do `gpg`; guarda local e hash do `verifyBackup`; `compareCounts`; `checkProduction` com `fetch` simulado (cada checagem passando e falhando, sem eco da chave); `public-tables` × `rls.test.sql` | CA-1 a CA-7, CA-17 a CA-23 |
| Integração | `backup:verify` restaurando no Supabase local um dump gerado do próprio local com dados de fábrica; manifesto adulterado | CA-24 |
| pgTAP (remoto) | `db:test:remote` depois da primeira aplicação e de cada migração | CA-8 |
| Produção (script) | `check:prod` depois de cada implantação | CA-10, CA-11, CA-12 |
| Manual (checklist) | Painéis do Supabase, da Vercel e do GitHub; jornadas 1 e 7 com o usuário real no computador e no celular; primeiro backup real; ensaio de restauração completo; linhas intactas depois do pgTAP remoto | CA-8, CA-9, CA-13 a CA-16, CA-18, CA-22, CA-25 |
| Revisão de documentação | Runbooks completos | CA-26, CA-27 |

Componente e E2E: não se aplicam (nenhuma tela muda). As regras do doc 04 não se aplicam. O checklist manual é registrado no PR da implementação com cada CA marcado e a data, para o `revisor-codigo` conferir.

## 7. Riscos e alternativas descartadas
**Riscos**
- **Node 26 na Vercel:** o `engines` exige `>=26 <27` (D-2 da SPEC-001). Se a Vercel ainda não oferecer Node 26 no build, a implantação falha. Mitigação: conferir no primeiro passo da implementação; se não houver, parar e decidir (P-14), sem afrouxar o `engines` em silêncio.
- **Região das funções no plano Hobby:** a decisão (P-1) assume que o Hobby permite escolher uma região única (`gru1`). Se não permitir, as funções ficam na região padrão (EUA) e cada consulta ao banco em São Paulo cruza o continente (centenas de ms por página). Plano B já aceito em P-1: Supabase em `us-east-1` e funções em `iad1`; como o projeto Supabase não muda de região depois de criado, a região das funções é conferida **antes** de criar o projeto.
- **Conexão IPv6:** a conexão direta ao banco do plano gratuito é só IPv6 e o WSL costuma não ter IPv6. A CLI usa o *pooler* quando ligada por `supabase link`; se `db dump`/`db push` falharem por rede, o runbook indica a URL do *session pooler* (porta 5432).
- **Pausa por inatividade:** com estudo diário não ocorre (doc 02); em férias, o projeto pausa e o app mostra erro de login até reativar no painel. O backup semanal provavelmente conta como atividade, mas isso não é garantido pelo Supabase. Ver P-9.
- **Formato do dump e versão da CLI:** `summarizeDataDump` depende do formato `COPY` do `pg_dump`. A CLI está fixada; atualizar a CLI exige rodar o ensaio de restauração de novo.
- **Backup esquecido:** rotina manual depende de disciplina. Mitigação: lembrete recorrente (P-8) e o manifesto com data, que o runbook manda conferir.
- **Dados pessoais no backup:** `auth.users` tem e-mail e hash da senha. Por isso o destino é fora do repositório por guarda de código (CA-17) e a cópia no Google Drive é criptografada (P-7).
- **Implantação automática antes do banco:** com implantação automática da `main`, código que depende de migração ainda não aplicada quebra a produção até o `db:push`. A regra de P-5 (migração antes do merge, sempre compatível) elimina essa janela.
- **Segredo vazado:** se a senha do banco vazar, o runbook descreve a rotação (painel → nova senha → atualizar o gerenciador). A chave publicável é pública por natureza; a RLS é a proteção (ADR-005).
- **Limites do plano gratuito:** 500 MB de banco e 2 projetos ativos no Supabase; uso não comercial na Vercel Hobby. Para um usuário, folga grande; o manifesto de backup dá a evolução do volume.

**Alternativas descartadas**
- **Aplicar migrações pelo GitHub Actions ao fazer merge na `main`:** automatiza, mas exige a senha do banco como segredo num repositório público; um workflow alterado por engano poderia expô-la, e o ganho para um único desenvolvedor é pequeno. (P-6)
- **Backup agendado no GitHub Actions:** além do segredo do banco, os artefatos de um repositório público podem ser baixados por qualquer conta logada no GitHub, então o backup teria de ser criptografado e enviado a um armazenamento externo (mais uma credencial). Workflows agendados de repositório público também são desativados após 60 dias sem atividade no repositório. (P-8)
- **Exportação pelo painel do Supabase:** não existe download de backup no plano gratuito.
- **`supabase config push` com o `config.toml`:** traria a configuração de Auth como código, mas o arquivo descreve o ambiente local (`site_url` em `localhost`, porta, Studio) e o comando sincroniza seções inteiras; um push errado reabriria o cadastro ou quebraria o login. Os ajustes de Auth são poucos e feitos uma vez; checklist + `check:prod` (CA-12) bastam.
- **Criar o usuário real por script com a chave secreta do remoto:** levaria a `service_role` de produção para a máquina e para um script, contra o doc 02. O painel faz o mesmo sem chave nenhuma.
- **Previews por PR apontando para o banco de produção:** um PR com migração ainda não aplicada quebraria o preview, e um preview com bug gravaria nos dados reais. **Segundo projeto Supabase como homologação:** possível no plano gratuito, mas dobra a manutenção (migrações, usuário, pausa) sem necessidade concreta; o Supabase local já cumpre esse papel. (P-4)
- **E2E com login real contra produção:** exigiria a senha real em automação e gravaria dados de teste no banco real. (P-10)
- **CSP agora:** CSP útil no Next exige nonce por requisição (renderização dinâmica e ajuste no proxy); sem conteúdo de terceiros nem Markdown renderizado ainda, o ganho não paga o custo. Volta junto com a spec de materiais.
- **Domínio próprio:** custa dinheiro (ADR-001). (P-2)
- **Restauração em produção por script:** é rara, destrutiva e exige julgamento; fica manual no runbook, ensaiada no local.

**ADR:** [ADR-008](../adr/ADR-008-implantacao-e-backup-locais.md) — Implantação e backup manuais a partir da máquina local (migrações pela CLI local com guardas, sem segredo de banco no GitHub Actions, backup semanal local com cópia criptografada no Google Drive). Redigido em 2026-11-18, depois das respostas da § 8.

## 8. Perguntas em aberto
Respondidas pelo dono do projeto em 2026-11-18: **todas as recomendações foram aceitas**, com P-7 = Google Drive. As marcadas como **bloqueante** mudavam critérios de aceite ou arquivos; os valores decididos já estão aplicados nas seções acima.

| # | Pergunta | Recomendação | Resposta |
|---|---|---|---|
| P-1 | **(bloqueante)** Região do Supabase e das funções da Vercel. | Supabase em `sa-east-1` (São Paulo) e funções da Vercel em `gru1` (São Paulo), juntas e perto de Minas Gerais. Se o Hobby não permitir escolher a região das funções, os dois nos EUA (`us-east-1` e `iad1`), porque o que mais pesa é função e banco na mesma região. | Respondida: aceita a recomendação |
| P-2 | Domínio: subdomínio `*.vercel.app` ou domínio próprio? | `*.vercel.app` (custo zero, HTTPS e HSTS já incluídos). Domínio próprio só se um dia houver motivo além da estética. | Respondida: aceita a recomendação |
| P-3 | Implantação automática da `main` pela integração Vercel–GitHub ou manual? | Automática: não exige token da Vercel no GitHub, e a `main` só recebe merge com CI verde (P-13). Reversão pelo "Promote" da implantação anterior. | Respondida: aceita a recomendação |
| P-4 | **(bloqueante)** Previews por PR? Com qual banco? | Desligar por enquanto (só a `main` implanta, CA-1). O Supabase local é a homologação. Se previews fizerem falta, uma spec futura cria um segundo projeto Supabase gratuito para eles, nunca o banco de produção. | Respondida: aceita a recomendação |
| P-5 | **(bloqueante)** Ordem entre migração e implantação do código. | Migração aplicada **antes** do merge, a partir da branch do PR aprovada e publicada, e sempre compatível com o código em produção (aditiva; mudança destrutiva em duas etapas). A regra entra no doc 06 § Banco e o `revisor-codigo` passa a conferi-la. Alternativa: aplicar a partir da `main` logo depois do merge, aceitando alguns minutos de produção quebrada a cada migração. | Respondida: aceita a recomendação |
| P-6 | **(bloqueante)** Quem aplica as migrações no remoto: você, pela CLI local, ou o GitHub Actions? | CLI local com `npm run db:push` (guardas de CA-5 e CA-6), senha do banco só na sessão do terminal. Nenhum segredo de banco no GitHub enquanto o repositório for público. | Respondida: aceita a recomendação |
| P-7 | **(bloqueante)** Onde guardar o backup e se criptografa. | Cópia primária em `~/gabarita-backups/` no WSL; cópia fora da máquina numa pasta privada da nuvem pessoal que você já usa (OneDrive ou Google Drive, gratuitos), **criptografada** com `gpg --symmetric` (já vem no Ubuntu do WSL; senha no gerenciador). Motivo: o backup tem e-mail e hash de senha, e a nuvem é de terceiros. Qual nuvem você usa? | Respondida: aceita; nuvem = **Google Drive** |
| P-8 | **(bloqueante)** Frequência, automação e retenção do backup. | Semanal e manual (`npm run backup`), com lembrete recorrente no calendário do celular, mais um backup antes de cada `db:push` com migração. Manter as 8 últimas cópias (cerca de 2 meses). Ensaio de restauração completo a cada 3 meses e sempre que a CLI do Supabase for atualizada. GitHub Actions descartado (§ 7). | Respondida: aceita a recomendação |
| P-9 | Manter o projeto Supabase ativo contra a pausa de 7 dias? | Não automatizar agora: o estudo diário e o backup semanal já mantêm atividade, e um projeto pausado é reativado pelo painel sem perda de dados. O runbook descreve o sintoma e a reativação. Se acontecer na prática, uma spec pequena cria um *cron* da Vercel (gratuito no Hobby) que faz uma consulta leve. | Respondida: aceita a recomendação |
| P-10 | Smoke/E2E contra produção? | Sim para `npm run check:prod`, sem credenciais e só leitura, rodado manualmente depois de cada implantação (CA-10 a CA-12). Não para E2E com login real. Automatizar o `check:prod` no Actions depois da implantação fica para depois (usa só valores públicos, então seria seguro, mas hoje não compensa). | Respondida: aceita a recomendação |
| P-11 | Rodar o pgTAP contra o banco de produção (`db:test:remote`) depois de cada migração? | Sim: os testes rodam em transação com `rollback` e são a única verificação automática de que RLS e grants do remoto estão certos (inclusive o padrão de grants do projeto novo, § 5.3). | Respondida: aceita a recomendação |
| P-12 | Cabeçalhos de segurança agora? | Sim, os mínimos de CA-2 (estáticos, custo quase zero) e `noindex`. CSP fica para a spec de materiais. | Respondida: aceita a recomendação |
| P-13 | Endurecimento de contas: 2FA, proteção da `main`, senha mínima no remoto. | Sim para tudo: 2FA em GitHub, Vercel e Supabase; ruleset na `main` exigindo PR e o check `verify`, sem push direto nem force push; comprimento mínimo de senha 12 no painel do remoto (o local continua 6, só para o usuário de teste), com a senha real gerada pelo gerenciador. | Respondida: aceita a recomendação |
| P-14 | Se a Vercel não oferecer Node 26 no build, o que fazer? | Primeiro conferir (pode já estar disponível). Se não estiver: parar e decidir entre esperar ou baixar o `engines` e o `.nvmrc` para o Node LTS anterior, o que altera a D-2 da SPEC-001 e precisa da sua aprovação explícita. | Respondida: aceita a recomendação |
| P-15 | A URL de produção pode aparecer na documentação pública (README, runbooks)? | Não: não traz benefício e facilita tentativas de login. Os documentos dizem "URL de produção (painel da Vercel)"; o valor real fica só nos painéis e no seu `.env.production.local`. | Respondida: aceita a recomendação |

## 9. Histórico
| Data | Mudança |
|---|---|
| 2026-11-17 | Criação |
| 2026-11-18 | Respostas da § 8 aceitas (todas as recomendações; P-7 = Google Drive); valores decididos aplicados (regiões `sa-east-1`/`gru1`, retenção 8, senha mínima 12, ordem da migração antes do merge); ADR-008 redigido; status `aprovada` |
| 2026-11-18 | Implementação: na CLI 3.2.0 `db push`, `db dump` e `test db` miram o banco **local** por padrão; os scripts passam a usar `--remote` (o `--linked` está obsoleto e some na v4). CA-3: o padrão de `sb_secret_` exige chave real (prefixo + 20 caracteres), porque a SPEC-001 cita o prefixo em prosa. `backup:verify` roda o `psql` como `supabase_admin` (com `postgres` falha por permissão em `storage`). |
| 2026-11-18 | Correções da revisão: contrato de `runBackup` com `home`, `repoRoot` e `publicTables` (§ 5.2); `docker cp` antes do `psql` e limpeza do arquivo temporário (§ 5.7); falha só na criptografia devolve `ok: false` sem `.incomplete` e sem poda (CA-20); CA-3 exige chave `sb_secret_` completa; CA-21 poda também o `.tar.gz.gpg`; `db:test:remote` passa por `scripts/test-remote.ts` (CA-7). |
| 2026-11-18 | Implementação: `db:push` e `db:test:remote` passam `--yes` (a CLI recusa confirmar sem terminal). A verificação prévia separa `no_upstream` (branch sem upstream) de `not_pushed` (HEAD diferente do upstream), com a orientação certa em cada caso. |
| 2026-11-18 | Implementação: o `gpg` do backup roda com o terminal herdado e `--pinentry-mode loopback` (com a saída capturada não tinha onde pedir a senha); falha do `tar` passa a aparecer na mensagem. |
| 2026-11-18 | Fechamento: CA-1 a CA-24 atendidos (testes, revisão e `check:prod` com 27 checagens); checklists de CA-8, CA-9, CA-13 a CA-16 conferidos pelo dono; primeiro backup e ensaio de restauração (CA-25) feitos com login local do usuário real. CA-22 conferido: a cópia `.tar.gz.gpg` do backup `2026-11-18T214929Z` foi aberta com `gpg --decrypt` e lista os 4 arquivos. Pendência sem bloqueio, registrada no runbook: confirmar se a CLI reaplica o seed a cada push. |
