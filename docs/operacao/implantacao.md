# Runbook de implantação

Procedimentos para colocar o Gabarita no ar e mantê-lo. Origem: [SPEC-002](../specs/SPEC-002-implantacao.md) e [ADR-008](../adr/ADR-008-implantacao-e-backup-locais.md). Backup e restauração ficam em [backup-e-restauracao.md](backup-e-restauracao.md).

Convenções:
- **URL de produção** é a que aparece no painel da Vercel. O valor real não é escrito neste repositório público (P-15); ele fica só nos painéis e no seu `.env.production.local` (já ignorado pelo git).
- `<ref>` é o identificador do projeto Supabase (painel do Supabase, em Project Settings).
- Todos os comandos rodam na raiz do repositório, na sua máquina (WSL), com Node 26 (`nvm use`) e **Docker em execução** (a CLI usa a imagem do Postgres).
- Nenhuma senha ou chave entra em arquivo versionado, `.env*` ou segredo do GitHub Actions. A senha do banco remoto vive no gerenciador de senhas.

## 1. Senha do banco só na sessão

`db:push`, `db:test:remote` e `backup` exigem `SUPABASE_DB_PASSWORD` na sessão do terminal. Sem ela, os scripts terminam com erro dizendo qual variável falta. Defina-a sem deixar rastro no histórico:

```bash
read -s SUPABASE_DB_PASSWORD   # cole a senha do gerenciador e tecle Enter
export SUPABASE_DB_PASSWORD
```

Ela vale só para aquela sessão do terminal. Nunca a coloque em `.env*`, em arquivo versionado nem em segredo do GitHub.

## 2. Primeira implantação

Faça na ordem. Cada passo cita o critério de aceite da SPEC-002 que ele cobre.

### 2.1 Contas (CA-16)
- [ ] 2FA ligado no GitHub, na Vercel e no Supabase.
- [ ] Regra (ruleset) da `main` no GitHub: exige pull request e o check `verify` verde antes do merge; não aceita push direto nem force push.

### 2.2 Projeto Supabase (CA-13)
Antes de criar, confira se o plano Hobby da Vercel permite escolher a região das funções (P-1): a região do Supabase não muda depois de criado.

1. Criar o projeto na região `sa-east-1` (São Paulo), com a senha do banco gerada pelo gerenciador de senhas.
2. Conferir a versão do Postgres: precisa ser a 17 (`major_version = 17` do `supabase/config.toml`). Se vier outra, pare e decida antes de mudar o `config.toml`.
3. Ajustes no painel (o `config.toml` só vale para o local):
   - [ ] Auth: cadastro por e-mail **desligado**.
   - [ ] Auth: login anônimo **desligado**.
   - [ ] Auth: comprimento mínimo de senha **12**.
   - [ ] Database: SSL obrigatório **ligado**.
   - [ ] Site URL e URLs de redirecionamento: ficam para o passo 2.5 (precisam da URL da Vercel).

### 2.3 Banco: migrações, seed e pgTAP (CA-8, CA-9)
```bash
npm run db:link -- <ref>     # liga este repositório ao projeto remoto (vínculo em supabase/.temp/, ignorado pelo git)
# defina SUPABASE_DB_PASSWORD (seção 1)
npm run db:push              # verificações, dry-run, confirmação, aplicação
npm run db:test:remote       # pgTAP contra o remoto
```

O `db:push` só aplica se, nesta ordem: a árvore de trabalho estiver limpa; o `HEAD` for igual ao upstream (branch publicada); nenhuma migração que já existe em `origin/main` tiver sido alterada, renomeada ou apagada; as migrações novas tiverem timestamp maior que o da última de `origin/main` e nome no padrão `AAAAMMDDHHmmss_snake_case.sql`. Todos os motivos de recusa são listados. Depois ele mostra o projeto ligado e a saída de `supabase db push --remote --dry-run --include-seed`, e pede que você **digite o identificador do projeto**; qualquer outra resposta aborta sem aplicar.

> **Confira a linha `Target:` do dry-run.** Na CLI 3.2.0 os comandos `db push`, `db dump` e `test db` apontam para o banco **local** por padrão; os scripts do repositório passam `--remote` para mirar o projeto ligado. Mesmo assim, se a saída do dry-run mostrar `Target: local stack (127.0.0.1:54322)`, **não confirme**: o alvo não é o remoto. Ver seção 9.

Checklist de CA-8 e CA-9:
- [ ] No painel (Database, Migrations) ou no SQL Editor, o histórico remoto tem exatamente as 4 migrações do repositório (a última é `20261119000000_exam_weights_and_target_notice.sql`, SPEC-005).
- [ ] `npm run db:test:remote` passa todos os testes pgTAP (RLS das 22 tabelas, `security_invoker` das visões, tema, `exam_weights` e `target_notice_published`, restrições e contagens do seed: 7 bancas, 9 rubricas, 14 concursos, 38 assuntos, 218 subtópicos, 532 incidências).
- [ ] CA-9: as tabelas pessoais têm as mesmas contagens de antes do teste (os testes rodam em transação com `rollback` e não deixam dados nem a extensão `pgtap`). Confira no SQL Editor.

Se `db:test:remote` falhar nos testes de leitura e gravação de `authenticated`, o projeto remoto pode ter vindo sem o padrão de grants do Supabase; a correção seria uma migração nova com `grant`, em spec própria.

### 2.4 Vercel (CA-14)
1. Importar o repositório pela integração Vercel–GitHub.
2. Variáveis no ambiente **Production**: somente `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, com os valores do projeto remoto (Project Settings, API). Nenhuma outra, e a chave secreta do Supabase não entra em lugar nenhum.
3. Build com Node 26 (o `engines` do `package.json` exige `>=26 <27`). Se a Vercel não oferecer Node 26, pare e decida (P-14); não afrouxe o `engines` em silêncio.
4. A região das funções (`gru1`) e a implantação só da `main` vêm do `vercel.json` versionado.

Checklist de CA-14:
- [ ] Só as duas variáveis existem, em Production, com os valores do projeto remoto.
- [ ] O build usa Node 26.
- [ ] A proteção de implantação da Vercel não bloqueia a produção.
- [ ] Push na `main` gera implantação de produção; push em outra branch não gera implantação.
- [ ] A primeira implantação da `main` terminou verde.

Se a Vercel não aceitar o curinga `"*": false` em `git.deploymentEnabled`, a alternativa equivalente é o *Ignored Build Step* do painel com `[ "$VERCEL_GIT_COMMIT_REF" != "main" ]` (e a escolha é registrada na SPEC-002).

### 2.5 Auth com a URL da Vercel e usuário real (CA-13)
- [ ] Supabase, Auth: Site URL = URL de produção; URLs de redirecionamento = só a de produção.
- [ ] Criar o usuário real pelo painel (Authentication, Users, "Create new user"), com "Auto Confirm User" marcado e a senha gerada pelo gerenciador (12 caracteres ou mais). Não há chave secreta nem script envolvidos.
- [ ] Existe exatamente 1 usuário, com e-mail confirmado.
- [ ] Database: versão do Postgres 17 e SSL obrigatório ligado (conferir de novo).

### 2.6 Checagem de produção e login real (CA-10 a CA-12, CA-15)
Defina `PRODUCTION_URL`, `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` na linha de comando ou em `.env.production.local` (o script lê esse arquivo se existir; todos os valores são públicos) e rode:

```bash
npm run check:prod
```

Ele roda sem credenciais, só com leitura, e imprime `OK`/`FALHA` por checagem (sai com código 1 se alguma falhar):
- `/` sem sessão redireciona (307) para `/login?next=%2F`; `/login` responde 200;
- cabeçalhos de segurança, `Strict-Transport-Security` presente e sem `X-Powered-By` em `/login`;
- `GET /auth/v1/settings` com `disable_signup` igual a `true`;
- leitura anônima de cada uma das 22 tabelas de `public` devolve lista vazia ou erro de permissão (401/403), nunca linha.

Checklist de CA-15 (login real, no computador e no celular a 360 px):
- [ ] O login leva à casca do app e a linha de `settings` é criada.
- [ ] Escolher "Escuro" em Configurações > Aparência, no computador, aparece no celular no próximo carregamento completo.
- [ ] "Sair" encerra só o aparelho atual.
- [ ] Senha errada mostra "E-mail ou senha incorretos."

### 2.7 Primeiro backup e ensaio (CA-18, CA-25)
Siga [backup-e-restauracao.md](backup-e-restauracao.md): primeiro `npm run backup`, depois o ensaio com `npm run backup:verify -- <diretório>` e o login local com o usuário real. Registre a data na tabela de ensaios.

Registre no PR da implementação cada CA do checklist marcado e com a data (SPEC-002 § 6).

## 3. Implantação de rotina

**Só código**
1. PR aprovado e CI verde (`verify`).
2. Merge na `main`: a Vercel implanta sozinha.
3. `npm run check:prod`.

**Com migração** (a migração é aplicada antes do merge, P-5)
1. Testes locais verdes: `npm run db:test`, `npm run test:int`, `npm run test:e2e`.
2. Branch do PR publicada (`git push`) e árvore limpa.
3. `npm run backup` (cópia antes de alterar o banco; ver o runbook de backup).
4. `npm run db:push`: leia o dry-run, confira o alvo e digite o identificador do projeto.
5. `npm run db:test:remote`.
6. Merge do PR (dispara a implantação da Vercel).
7. `npm run check:prod`.

Como a migração chega ao remoto **antes** do código novo, toda migração precisa ser compatível com o código que está em produção: aditiva (tabela, coluna anulável ou com padrão, valor novo de enum, índice). Mudança que quebra o código antigo (renomear, apagar, `not null` sem padrão) é feita em duas etapas (specs ou PRs): expandir e, depois, contrair.

## 4. Reverter

- **Código:** no painel da Vercel, "Promote" da implantação anterior (não gera build novo). Se a migração já aplicada era aditiva, o código antigo continua funcionando.
- **Migração:** não se reverte editando a migração aplicada. Corrige-se com uma migração nova ou, em último caso, restaura-se o backup tirado antes do `db:push` (ver [backup-e-restauracao.md](backup-e-restauracao.md)).

## 5. PR abandonado com migração já aplicada

Como a migração é aplicada antes do merge, um PR descartado pode deixar no remoto uma versão de migração que não existe mais nos arquivos do repositório. A CLI então recusa novos `db push`, porque o histórico remoto tem uma versão sem arquivo local. Saídas:
- **Trazer a migração para a `main`:** reabra o trabalho e leve o arquivo da migração para a `main` por um PR.
- **Desfazer:** crie uma migração nova que desfaça o efeito e repare o histórico com `supabase migration repair` (consulte `npx supabase migration repair --help` para a sintaxe da versão 3.2.0). Antes de qualquer reparo, faça `npm run backup`.

## 6. Projeto Supabase pausado

O plano gratuito pausa o projeto após 7 dias sem uso (em férias, por exemplo).
- **Sintoma:** o login mostra "Não foi possível entrar agora. Tente de novo em instantes." Esse é o aviso para verificar se o projeto está pausado.
- **Reativação:** painel do Supabase, abrir o projeto e usar o botão de restaurar/reativar (o projeto pausado é reativado pelo painel, sem perda de dados). Aguarde o projeto voltar ao estado ativo e tente o login de novo.
- **Prazo de restauração do plano gratuito:** 1 ano após a pausa. Depois disso o projeto não pode mais ser restaurado pelo painel; só resta recuperar os dados de um backup em um projeto novo (ver `backup-e-restauracao.md`). Fonte: documentação oficial do Supabase, "Project Pausing" (https://supabase.com/docs/guides/platform/free-project-pausing) e o guia de solução de problemas "How To Restore a Project Paused for More Than 1 Year" (https://supabase.com/docs/guides/troubleshooting/restore-project-after-90-days-pause), consultadas em 2026-11-18. Observação: uma versão antiga da documentação e o aviso do painel falam em 90 dias; confira o prazo exibido no painel do projeto. Faça um backup antes de qualquer período de ausência prolongada.
- O backup semanal e o estudo diário contam como uso, mas o Supabase não garante que o backup conte como atividade (P-9).

## 7. Rotação da senha do banco

Quando a senha vazar ou por higiene:
1. Painel do Supabase, Project Settings, Database: redefinir a senha do banco (gere uma nova no gerenciador de senhas).
2. Atualizar o gerenciador de senhas.
3. Fechar os terminais antigos (a variável `SUPABASE_DB_PASSWORD` só existe na sessão) e definir a nova ao precisar (seção 1).
4. A aplicação na Vercel não usa a senha do banco, então não há o que atualizar lá. A chave publicável é pública por natureza; a proteção é a RLS (ADR-005).
5. Conferir com `npm run db:test:remote` que a conexão funciona com a senha nova.

## 8. Conexão por IPv6 e pooler

A conexão direta ao banco do plano gratuito é só IPv6, e o WSL costuma não ter IPv6. O `supabase link` usa o *pooler* por padrão (a opção `--skip-pooler` força a conexão direta; não use). Se `db push`, `db dump` ou `db test` falharem por rede:
- confira se o `link` foi feito sem `--skip-pooler`, refazendo `npm run db:link -- <ref>`;
- a CLI 3.2.0 aceita `--remote=<url>` com a URL do *session pooler* (porta 5432, copiada do painel em Connect). Os scripts npm deste repositório não repassam essa opção; use a CLI diretamente e registre o resultado aqui se precisar disso.

## 9. A confirmar na primeira implantação

- **Alvo dos comandos na CLI 3.2.0.** Sem projeto ligado, `npx supabase db push --dry-run --include-seed` mostra `Target: local stack (127.0.0.1:54322)`: a CLI é "Local by default" e só usa o projeto ligado com `--remote` (`--linked` é obsoleto e some na v4). Os scripts `db:push`, `db:test:remote` e `backup` já passam `--remote`. Na primeira implantação, confirme que a linha `Target:` do dry-run aponta o projeto remoto.
- **O seed é reaplicado a cada push?** A saída do dry-run lista `supabase/seed.sql` como arquivo que seria aplicado ("Would seed these files"), mas não foi possível verificar sem um remoto se a CLI 3.2.0 reaplica o seed a cada `db push --include-seed` ou só quando o arquivo muda. **A confirmar na primeira implantação.** Em qualquer caso, o seed é idempotente (ADR-004), então reaplicar é seguro; a consequência aceita é que ele sobrescreve `exams.target_weight` e `rubrics.definition` no remoto (o JSON é a fonte da verdade).
- **Migração da SPEC-005 (`exam_weights`).** Ao aplicá-la, o `db:push` deve listar só `20261119000000_exam_weights_and_target_notice.sql` (e o seed); depois, `db:test:remote` com 22 tabelas e `check:prod` (o anônimo não lê `exam_weights`). Registrar aqui se a CLI 3.2.0 reaplicou o seed sem migração pendente. A SPEC-005 ainda não foi implantada.
- **Região das funções no plano Hobby e Node 26 na Vercel** (seções 2.2 e 2.4): conferir no painel.
