# Runbook de backup e restauração

O plano gratuito do Supabase não tem backup automático nem download de backup pelo painel. Por isso o backup é uma rotina manual feita da sua máquina. Origem: [SPEC-002](../specs/SPEC-002-implantacao.md) § 5.7 e [ADR-008](../adr/ADR-008-implantacao-e-backup-locais.md). Implantação: [implantacao.md](implantacao.md).

O backup contém dados pessoais: `auth.users` tem e-mail e hash da senha. Ele nunca vai para o git (o script recusa destino dentro do repositório) e a cópia na nuvem é criptografada.

Pré-requisitos: Docker em execução, Node 26, `gpg` instalado, projeto ligado (`npm run db:link -- <ref>`) e `SUPABASE_DB_PASSWORD` na sessão (ver [implantacao.md](implantacao.md) seção 1).

## 1. Frequência e lembrete

- **Semanal**, e **também antes de cada `db:push` que tenha migração** (P-8).
- Crie um lembrete recorrente no calendário do celular ("Gabarita: rodar o backup semanal").
- A cada backup, confira a data no `manifest.json` (campo `createdAt`): se a última cópia tem mais de uma semana, o lembrete falhou.
- **Ensaio de restauração** (seção 4) a cada 3 meses e sempre que a CLI do Supabase for atualizada (o `summarizeDataDump` depende do formato `COPY` do `pg_dump` da versão fixada).

## 2. Comando

```bash
read -s SUPABASE_DB_PASSWORD && export SUPABASE_DB_PASSWORD
export GPG_TTY=$(tty)      # ver a nota de GPG na seção 7
npm run backup
```

O script:
1. Roda `supabase db dump` três vezes: papéis (`roles.sql`), schema (`schema.sql`) e dados (`data.sql`, com `--data-only --use-copy`, que inclui `auth.users`).
2. Valida que o `data.sql` tem o bloco `COPY` das 21 tabelas de `public` e de `auth.users`, e que `auth.users` tem pelo menos 1 linha.
3. Grava o `manifest.json` (data, commit do repositório, última migração local, versão da CLI, tamanho e SHA-256 de cada arquivo e contagem de linhas por tabela).
4. Cria `<nome>.tar.gz.gpg` com `gpg --symmetric --cipher-algo AES256`. **O próprio `gpg` pede a senha** no terminal; ela nunca passa por argumento ou variável do script. Use uma senha guardada no gerenciador de senhas (sem ela a cópia na nuvem não abre).
5. Só então aplica a retenção.

Variáveis opcionais:

| Variável | Efeito |
|---|---|
| `GABARITA_BACKUP_DIR` | Pasta base dos backups. Precisa ser caminho absoluto e ficar fora do repositório (inclusive por `..` ou link simbólico), senão o script recusa antes de conectar. |
| `GABARITA_BACKUP_KEEP` | Quantas cópias completas manter. Inteiro maior que 0; padrão 8. |

## 3. Onde guardar

| Cópia | Onde | Observação |
|---|---|---|
| Primária | `~/gabarita-backups/<AAAA-MM-DDTHHmmssZ>/` no WSL (nome em UTC) | Contém `roles.sql`, `schema.sql`, `data.sql` e `manifest.json`, sem criptografia. Fica ao lado do `<nome>.tar.gz.gpg`. |
| Fora da máquina | Pasta privada do seu Google Drive pessoal (plano gratuito) | Só o arquivo criptografado `<nome>.tar.gz.gpg`. |

**Envio manual ao Google Drive:** ao final do backup o script imprime o caminho do `.tar.gz.gpg`. Envie esse arquivo (e só ele) para a pasta privada do Drive, pelo navegador ou pelo aplicativo. O script não guarda credencial do Drive. Nunca envie a pasta sem criptografia.

**Retenção:** as 8 últimas cópias completas (cerca de 2 meses). O script apaga só as mais antigas cujo nome segue o padrão de data, dentro da base. Pastas `.incomplete` e arquivos com outro nome nunca são apagados automaticamente. A retenção vale para a pasta local; poda os arquivos `.gpg` do Drive à mão, mantendo também as 8 últimas.

## 4. Ensaio de restauração (no Supabase local)

O `backup:verify` restaura um backup no Supabase **local** e compara a contagem de linhas com o manifesto. Ele recusa se a URL do Supabase não for local e recusa antes de restaurar se algum SHA-256 não conferir com o manifesto. **Ele apaga o banco local** (`supabase db reset --no-seed`).

```bash
npm run db:start
npm run backup:verify -- ~/gabarita-backups/<AAAA-MM-DDTHHmmssZ>
```

Passos do script: recria o banco local sem seed (schema pelas migrações), copia o `data.sql` para o contêiner do banco local e o restaura com `session_replication_role = replica` em uma única transação, e conta as linhas de cada tabela do manifesto. Termina com código 0 se tudo bateu; senão lista as diferenças por tabela.

Ensaio completo (CA-25), além do script:
1. [ ] As contagens conferem (código 0).
2. [ ] Descriptografe uma vez a cópia `.tar.gz.gpg` que está no Drive para provar que a senha funciona (ver nota de GPG): `gpg --pinentry-mode loopback --decrypt <nome>.tar.gz.gpg > /caminho/fora/do/repo/teste.tar.gz`.
3. [ ] Com o app local (`npm run dev`, `.env.local` apontando para o Supabase local), entre com o **e-mail e a senha reais**: isso prova que `auth.users` foi restaurado. Confira que seus dados aparecem.
4. [ ] Registre a data na tabela da seção 8.
5. Depois, volte o banco local ao estado de fábrica com `npm run db:reset` (o ensaio deixa dados reais no local).

## 5. Restauração em projeto Supabase novo (desastre)

Manual e só por este runbook, nunca por script. Os usuários não têm chave estrangeira para `auth.users`, por isso o `data.sql` precisa trazer `auth.users` com os mesmos `id`.

1. Escolha o backup (o mais recente completo; o `manifest.json` diz a migração e o commit de onde ele veio, para usar o código compatível). Se vier do Drive, descriptografe (nota de GPG) e extraia o `.tar.gz`.
2. Crie um projeto Supabase novo (região `sa-east-1`, Postgres 17), com senha do banco nova guardada no gerenciador. Aplique os ajustes de Auth de [implantação 2.2](implantacao.md).
3. Copie do painel (Connect) a string de conexão do *session pooler* (porta 5432). Restaure **nesta ordem**, nunca antes de papéis e schema:
   ```bash
   psql "<conexão>" -f roles.sql
   psql "<conexão>" -f schema.sql
   psql "<conexão>" -c "set session_replication_role = replica" -f data.sql
   ```
   Em cada comando, leia a saída. A SPEC-002 manda seguir a ordem da documentação do Supabase; erros de objetos que o projeto novo já criou (como papéis padrão) precisam ser avaliados caso a caso, não ignorados em silêncio. Para o `data.sql`, o `set session_replication_role = replica` e o `-f` rodam na mesma sessão do `psql`; se preferir, use `--single-transaction`.
4. Confira o histórico de migrações do projeto novo contra o `latestMigration` do manifesto.
5. Na Vercel, troque `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` pelos do projeto novo (Production) e reimplante.
6. No Supabase novo, ajuste Site URL e URLs de redirecionamento para a URL de produção.
7. Religue o projeto: `npm run db:link -- <novo ref>`, defina a nova `SUPABASE_DB_PASSWORD`, rode `npm run db:test:remote` e `npm run check:prod`, e entre com o usuário real.
8. Compare as contagens do banco restaurado com o `rowCounts` do manifesto.

## 6. Se o backup falhar

- O script sai com código 1 e imprime o motivo. Se algum dump falhou ou o resultado está incompleto (tabela ausente, `auth.users` vazio, `COPY` sem terminador, dump em formato `INSERT`), a pasta é renomeada para `<nome>.incomplete`, mantida para investigação, e **a retenção não é aplicada**. Não use uma pasta `.incomplete` como backup.
- Mensagem sobre `SUPABASE_DB_PASSWORD`: defina a variável na sessão (seção 2).
- `GABARITA_BACKUP_DIR` recusado: use um caminho absoluto fora do repositório.
- Falha por rede (conexão IPv6): ver [implantação, seção 8](implantacao.md).
- Docker parado: a CLI usa a imagem do Postgres para o `pg_dump`; inicie o Docker.
- Se o backup estava completo mas a cópia `.tar.gz.gpg` não foi criada, a pasta fica íntegra e o script avisa; corrija o `gpg` (nota abaixo) e crie a cópia criptografada à mão com `tar -czf <nome>.tar.gz -C <base> <nome>` e `gpg --symmetric --cipher-algo AES256 --output <nome>.tar.gz.gpg <nome>.tar.gz`, depois apague o `.tar.gz` sem criptografia.
- Não dê o trabalho por feito sem um backup completo: repita o comando até passar. Se persistir, investigue antes de fazer qualquer `db:push`.

## 7. Nota sobre GPG_TTY e `--pinentry-mode loopback`

O `gpg` pede a senha por um programa de pinentry. Em terminal do WSL ou em sessão sem tela, isso pode falhar com erros como "Inappropriate ioctl for device" ou "No pinentry". Se acontecer:
- exporte `GPG_TTY=$(tty)` na sessão antes de rodar o backup;
- para criptografar ou descriptografar à mão, acrescente `--pinentry-mode loopback`, que faz o `gpg` pedir a senha direto no terminal.

Na primeira execução real, o `gpg` chamado com a saída capturada não tinha terminal para pedir a senha e a cópia criptografada não foi criada. O script agora roda o `gpg` com o terminal herdado e `--pinentry-mode loopback`, e o próprio `gpg` pede a senha: ela nunca passa por argumento, variável ou pelo script. Se mesmo assim falhar, criptografe à mão o backup já exportado:

```bash
cd ~/gabarita-backups
tar -czf <nome>.tar.gz <nome>
gpg --pinentry-mode loopback --symmetric --cipher-algo AES256 --output <nome>.tar.gz.gpg <nome>.tar.gz
rm <nome>.tar.gz
```

## 8. Registro de ensaios de restauração

| Data | Backup usado (nome da pasta) | Versão da CLI | Contagens conferem | Login local com usuário real | Observações |
|---|---|---|---|---|---|
| | | | | | |
