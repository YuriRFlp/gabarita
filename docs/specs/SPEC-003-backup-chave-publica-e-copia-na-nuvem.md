# SPEC-003 — Backup com chave pública e cópia automática para a nuvem

**Status:** rascunho · **Criada:** 2026-11-18 · **Atualizada:** 2026-11-18
**Módulo:** — (infraestrutura: `scripts/`, `docs/operacao/`) · **ADRs relacionados:** ADR-001, ADR-005, ADR-007, ADR-008, ADR-009 (redigido, § 7)

## 1. Objetivo
Tirar do backup semanal os dois passos manuais que não têm risco de segurança: digitar a senha do `gpg` a cada backup e enviar o `.tar.gz.gpg` para o Google Drive pelo navegador. O backup continua manual e disparado pelo dono (a senha do banco segue só na sessão); passa a criptografar com a chave pública do dono, sem pedir senha, e a copiar só o arquivo criptografado para a pasta do Google Drive para computador sincronizada no Windows. A senha da chave privada só é usada ao restaurar.

## 2. Regras de origem
| Regra | Origem | Interpretação ou esclarecimento |
|---|---|---|
| Backup semanal e manual, mais um antes de cada `db:push` com migração; retenção de 8 cópias | ADR-008 § Decisão (Backup); SPEC-002 P-8 | Continua manual. A retenção de 8 passa a valer também, por código, para as cópias na pasta da nuvem (hoje é poda à mão, runbook § 3). |
| Senha do banco só na sessão do terminal, nunca em arquivo, `.env*` ou segredo do GitHub Actions | ADR-008 § Decisão (Segredos); SPEC-002 P-6; `docs/06-padroes-de-codigo.md` § Segurança | Nada muda. Por isso o agendamento sem o dono fica fora (§ 3). As duas variáveis novas (`GABARITA_GPG_RECIPIENT`, `GABARITA_CLOUD_DIR`) **não são segredos** (impressão digital da chave e caminho de pasta) e podem ficar no `~/.zshrc`, fora do repositório. |
| Cópia fora da máquina numa pasta privada do Google Drive pessoal, criptografada; o script não guarda credencial do Drive | ADR-008 § Decisão (Backup); SPEC-002 P-7, § 5.7 | A cópia passa a ser feita pelo script para uma pasta local que o Google Drive para computador sincroniza. Continua sem nenhuma credencial do Google no projeto: quem envia é o aplicativo do Drive, já autenticado no Windows. |
| Criptografia com `gpg --symmetric` (senha no gerenciador) | ADR-008 § Decisão (Backup); SPEC-002 CA-22 | **Muda** para criptografia por chave pública (`--encrypt --recipient`). O modo simétrico fica como alternativa quando a variável não está definida (P-1). Exige o ADR-009 (§ 7). |
| Backup jamais no git; destino fora do repositório por guarda de código | SPEC-002 CA-17; `.gitignore` | A mesma guarda vale para a pasta da nuvem. Nova guarda: o texto puro (`data.sql`, com `auth.users`) nunca pode ficar dentro da pasta sincronizada. |
| Dados pessoais no backup (`auth.users`: e-mail e hash da senha) | SPEC-002 § 7 (Riscos) | Motiva as guardas de sobreposição de pastas (CA-7, CA-8) e de cópia só do `.gpg` (CA-9). |
| Custo zero | ADR-001 | Google Drive gratuito (15 GB) e `gpg` do Ubuntu do WSL. Nenhum serviço novo. |
| Funções puras com executor de comandos e sistema de arquivos injetados; nenhum teste unitário toca rede, Docker ou o remoto | `docs/07-estrategia-de-testes.md` § Comandos e onde cada nível roda; SPEC-002 § 6 | O `gpg` real só aparece em teste de integração, com chave descartável num `GNUPGHOME` temporário (nunca o `~/.gnupg` do dono). |
| Código em inglês; documentação em português | ADR-007 | Variáveis, funções e mensagens de log de código em inglês nos identificadores; mensagens ao usuário e runbook em português, como na SPEC-002. |

## 3. Escopo
**Pré-requisito:** a branch `fix/spec-002-gpg-prompt` (o `gpg` com terminal herdado e `--pinentry-mode loopback`) precisa estar na `main` antes de a implementação começar; esta spec parte desse comportamento.

**Dentro:**
- **Criptografia por chave pública** no `npm run backup`: com `GABARITA_GPG_RECIPIENT` definida (impressão digital completa), o `gpg` criptografa sem pedir senha e sem terminal (`--batch`), depois de uma checagem prévia da chave no chaveiro (existe, não revogada, não expirada, com capacidade de criptografia).
- **Modo simétrico como alternativa** quando a variável não está definida, com aviso explícito (P-1).
- **Cópia automática** do `<nome>.tar.gz.gpg` para `GABARITA_CLOUD_DIR` (opcional), com guardas de pasta, cópia atômica (nome temporário e renomeação), conferência do SHA-256 e retenção de 8 cópias na pasta da nuvem.
- **Falha da cópia não invalida o backup local:** o backup local fica completo e podado; o script avisa e sai com código próprio (P-4).
- **Guarda nova para a base local:** recusar `GABARITA_BACKUP_DIR` num disco do Windows (`/mnt/<letra>/`), para o texto puro nunca ficar ao alcance de sincronizadores do Windows (P-3).
- **`backup:verify` aceita o `.tar.gz.gpg`** além do diretório: descriptografa (o `gpg` pede a senha da chave privada), confere o conteúdo do pacote, extrai numa pasta temporária, restaura no Supabase local e apaga a pasta temporária (P-7). É o ensaio que prova que a cópia da nuvem e a chave funcionam.
- **Runbook** `docs/operacao/backup-e-restauracao.md` atualizado: gerar a chave, guardar a chave privada e o certificado de revogação, configurar as variáveis, lembrete semanal no calendário do celular, restaurar a chave numa máquina nova, ensaio com a cópia da nuvem, teste periódico da cópia da chave guardada fora da máquina, transição das cópias simétricas antigas.
- **Documentação:** ADR-009 (§ 7), nota de status no ADR-008 apontando para o ADR-009, `docs/02-arquitetura.md` § Restrições do plano gratuito (linha do backup), `docs/06-padroes-de-codigo.md` § Segurança (chave privada e senha do `gpg` nunca no repositório, em argumento ou variável), `docs/07-estrategia-de-testes.md` (`backup:verify` aceita `.gpg`; teste de integração do `gpg`), `CHANGELOG.md` citando a SPEC-003, e uma linha no histórico da SPEC-002 informando que o CA-22 passou a valer só para o modo simétrico.

**Fora (fica para depois):**
- **Agendamento sem o dono** (cron no WSL, Agendador de Tarefas do Windows, GitHub Actions). Exigiria a senha do banco guardada em disco ou num chaveiro destravado sem o dono (contra P-6/ADR-008), o WSL e o Docker ligados no horário e um canal para avisar falhas. **Reavaliar** se o backup semanal for esquecido na prática (por exemplo, duas lacunas de mais de 14 dias entre `createdAt` de backups seguidos) ou se o repositório ficar privado; a reavaliação gera spec e ADR próprios.
- **Lembrete pelo código** (aviso de backup atrasado, notificação): o lembrete fica no calendário do celular; o runbook o cita.
- **Envio pela API do Google Drive** (rclone, conta de serviço, OAuth): traria credencial do Google para a máquina ou o projeto sem ganho sobre a pasta sincronizada.
- **Assinatura do backup** (`--sign`): exigiria a senha da chave privada a cada backup, o que esta spec quer eliminar (§ 7, riscos).
- **Remover o modo simétrico:** depende de P-1; se for removido, é numa spec futura, depois de todas as cópias simétricas terem saído da retenção.
- **Restauração em produção:** continua manual, só pelo runbook (SPEC-002 § 5.7).

## 4. Critérios de aceite
**Manual (checklist)** significa conferido pelo dono seguindo o runbook; o revisor confere que o runbook cobre o item.

**Criptografia**

| # | Dado / Quando / Então | Teste |
|---|---|---|
| CA-1 | Dado `GABARITA_GPG_RECIPIENT` com uma impressão digital completa (40 caracteres hexadecimais, maiúsculas ou minúsculas, espaços aceitos e removidos), quando `resolveEncryption` lê o ambiente, então devolve o modo `recipient` com a impressão digital normalizada (sem espaços, maiúscula). Dado a variável ausente ou vazia, então devolve o modo `symmetric`. Dado um valor em outro formato (e-mail, nome, ID curto de 8 ou longo de 16 caracteres, impressão digital com caractere não hexadecimal), então devolve erro e o backup recusa **antes de conectar**, com mensagem pedindo a impressão digital completa e sem cair no modo simétrico. | unitário (`resolveEncryption`) |
| CA-2 | Dado o modo `symmetric`, quando o backup começa, então registra no log, antes de qualquer `supabase db dump`, o aviso "GABARITA_GPG_RECIPIENT não definida: criptografia simétrica, o gpg pedirá a senha" e segue com o comportamento atual (SPEC-002 CA-22: `--pinentry-mode loopback --symmetric --cipher-algo AES256`, terminal herdado). | unitário (orquestração com executor injetado) |
| CA-3 | Dado o modo `recipient`, quando o backup começa, então, antes de qualquer `supabase db dump`, roda `gpg --batch --with-colons --list-keys <impressão digital>` com a saída capturada; se o comando falhar ou a saída não tiver a chave com essa impressão digital, ou se a chave estiver revogada, expirada ou inválida, ou se não tiver capacidade de criptografia utilizável, então o backup recusa com a mensagem do motivo e não chama `supabase db dump`. | unitário (`checkRecipientKey` com saídas `--with-colons` de exemplo; orquestração) |
| CA-4 | Dado o modo `recipient` com a chave válida, quando o backup criptografa, então o `gpg` é chamado **sem terminal** (saída capturada, `interactive` falso) com exatamente `--batch --trust-model always --encrypt --recipient <impressão digital> --output <nome>.tar.gz.gpg <nome>.tar.gz`; os argumentos não contêm `--symmetric`, `--pinentry-mode`, `--passphrase` nem variante; nenhuma senha é pedida. | unitário (`encryptionCommands`) |
| CA-5 | Dado um `GNUPGHOME` temporário com uma chave de teste sem senha, quando os argumentos de CA-4 criptografam um `.tar.gz` e `gpg --batch --decrypt` o abre, então o resultado é byte a byte igual ao original; e o mesmo comando de descriptografia abre uma cópia feita no modo simétrico (o runbook usa um único comando para os dois modos). O teste nunca usa o `~/.gnupg` do dono. | integração (`gpg` real, sem Supabase) |
| CA-6 | Dado qualquer modo, quando o `tar` ou o `gpg` falha, então vale o comportamento da SPEC-002 CA-20: `ok: false`, diretório sem `.incomplete`, sem poda local, o `.tar.gz` sem criptografia é apagado; e, além disso, nenhuma cópia para a nuvem é feita. No modo `recipient`, o `stderr` do `gpg` aparece na mensagem (passado por `scrubSecret`). | unitário (orquestração) |

**Pastas: local e nuvem**

| # | Dado / Quando / Então | Teste |
|---|---|---|
| CA-7 | Dado `GABARITA_BACKUP_DIR` (ou o padrão) que resolve, pelo caminho real, para dentro de `/mnt/<letra>/` (disco do Windows), quando rodo `npm run backup`, então o script recusa antes de conectar, explicando que o texto puro precisa ficar no disco do WSL. As guardas atuais (absoluto, fora do repositório) continuam. | unitário (`resolveBackupBase`) |
| CA-8 | Dado `GABARITA_CLOUD_DIR`, quando `resolveCloudDir` avalia, então: ausente ou vazia → "não configurada"; caminho relativo ou no formato do Windows (`C:\...`) → erro orientando usar `/mnt/c/...`; igual ao repositório ou dentro dele (inclusive por `..` ou link simbólico) → erro; a base local igual à pasta da nuvem, dentro dela, ou a pasta da nuvem dentro da base local → erro de sobreposição. Sob `/mnt/<letra>/` a comparação de sobreposição ignora maiúsculas e minúsculas (o disco do Windows não as distingue). Qualquer erro recusa **antes de conectar**. | unitário (`resolveCloudDir`) |
| CA-9 | Dado um backup criptografado com sucesso e `GABARITA_CLOUD_DIR` válida e existente, quando a cópia roda, então o único arquivo escrito na pasta da nuvem é `<nome>.tar.gz.gpg`: primeiro como `<nome>.tar.gz.gpg.partial`, depois renomeado; o SHA-256 da cópia final é igual ao do arquivo local; nenhum caminho de `roles.sql`, `schema.sql`, `data.sql`, `manifest.json` ou `.tar.gz` é lido para escrita na nuvem. A função de cópia recusa qualquer origem cujo nome não siga `AAAA-MM-DDTHHmmssZ.tar.gz.gpg`. | unitário (`copyToCloud` com sistema de arquivos falso que registra cada escrita) |
| CA-10 | Dado a cópia de CA-9 conferida, quando há na pasta da nuvem mais cópias que o limite de retenção (`GABARITA_BACKUP_KEEP`, padrão 8), então são apagadas só as mais antigas cujo nome segue exatamente `AAAA-MM-DDTHHmmssZ.tar.gz.gpg`; nunca arquivos `.partial`, subpastas ou outros nomes. Se a cópia não foi conferida, nada é apagado na nuvem. | unitário (`selectCloudCopiesToPrune`; orquestração) |
| CA-11 | Dado um backup local completo e criptografado, quando a cópia para a nuvem falha (pasta inexistente no fim, erro ao copiar, erro ao renomear, SHA-256 diferente), então o backup local continua válido (diretório com nome normal, `.gpg` local mantido, poda local aplicada), o `.partial` é apagado (melhor esforço), e o script termina com o código de P-4 e a mensagem "Backup local concluído; a cópia para a nuvem falhou: <motivo>. Copie à mão <caminho do .gpg>". Se a pasta da nuvem não existir já no início, o script avisa no início e segue com o backup (a pasta pode ser o Drive desligado; o backup é mais importante que a cópia). | unitário (orquestração) |
| CA-12 | Dado `GABARITA_CLOUD_DIR` não configurada, quando o backup termina com sucesso, então o comportamento é o atual: código 0 e a orientação de enviar o `.gpg` ao Drive à mão. | unitário (orquestração) |

**Verificação e restauração**

| # | Dado / Quando / Então | Teste |
|---|---|---|
| CA-13 | Dado `npm run backup:verify -- <diretório>`, então o comportamento é o da SPEC-002 (CA-23, CA-24). Dado um caminho que não é diretório nem arquivo com nome `AAAA-MM-DDTHHmmssZ.tar.gz.gpg`, então recusa sem descriptografar. | unitário (`resolveVerifyInput`) |
| CA-14 | Dado `npm run backup:verify -- <nome>.tar.gz.gpg`, quando roda, então: recusa antes de descriptografar se a URL do Supabase não for local; cria uma pasta temporária com permissão 0700 fora do repositório e fora de `GABARITA_CLOUD_DIR`; chama `gpg --pinentry-mode loopback --output <temp>/<nome>.tar.gz --decrypt <arquivo>` com o terminal herdado (o `gpg` pede a senha da chave privada; nada passa por argumento ou variável); lista o pacote com `tar -tzf` e recusa se houver qualquer entrada além de `<nome>/` e `<nome>/{roles.sql,schema.sql,data.sql,manifest.json}` (caminho absoluto, `..`, arquivo extra, link); extrai e roda a verificação de diretório; e **apaga a pasta temporária em todos os casos** (sucesso, falha do `gpg`, falha do `tar`, entrada recusada, contagem divergente). | unitário (`archiveEntriesAreSafe`; orquestração com executor e sistema de arquivos injetados) |
| CA-15 | Dado um backup gerado do Supabase local com dados de fábrica e criptografado para a chave de teste de CA-5, quando `backup:verify` recebe o `.tar.gz.gpg`, então restaura no Supabase local e as contagens conferem com o manifesto (código 0), e a pasta temporária não existe ao final. | integração (Supabase local + `gpg` com `GNUPGHOME` temporário; estende `verify-backup.int.test.ts`) |

**Operação**

| # | Dado / Quando / Então | Teste |
|---|---|---|
| CA-16 | Dado o runbook de backup, quando o revisor lê, então ele cobre: gerar a chave (curva 25519, senha gerada pelo gerenciador, sem expiração, P-5); exportar a chave privada em ASCII e o certificado de revogação para o gerenciador de senhas (P-6), nunca para o repositório nem para a pasta do Drive; definir `GABARITA_GPG_RECIPIENT` e `GABARITA_CLOUD_DIR` no `~/.zshrc` (não são segredos); conferir o caminho do Drive visto pelo WSL; o lembrete semanal recorrente no calendário do celular; o comando de backup sem senha do `gpg`; o que fazer se a cópia para a nuvem falhar; importar a chave numa máquina ou WSL novos (e marcar a confiança); o ensaio trimestral usando a cópia **do Drive** com `backup:verify`; o teste periódico da cópia da chave guardada no gerenciador, importada num `GNUPGHOME` temporário (P-10); manter a senha simétrica antiga até a última cópia simétrica sair da retenção; e que arquivos apagados no Drive vão para a lixeira dele. | manual (revisão de documentação) |
| CA-17 | Dado o primeiro backup real com as duas variáveis definidas, quando rodo `npm run backup`, então só a senha do banco é digitada (no `read -s` antes do comando), o `gpg` não pede nada, o `.gpg` aparece na pasta da nuvem e, depois de sincronizado, no Drive pela web; e `backup:verify` com essa cópia (baixada do Drive ou lida da pasta sincronizada) passa, pedindo a senha da chave privada. A data fica no registro de ensaios do runbook. | manual (checklist; obrigatório para fechar a spec) |

Casos-limite do doc 07 aplicáveis: `now` injetado (nome das cópias e ordem da retenção); executor de comandos e sistema de arquivos injetados, nenhum teste unitário roda `gpg`, `tar`, Docker ou toca `/mnt`; testes independentes da ordem (pastas temporárias por teste, `GNUPGHOME` temporário por teste de integração); retenção com exatamente `keep`, `keep + 1` e zero cópias; nomes parecidos com o padrão que não devem ser apagados (`.partial`, sufixo extra, data inválida no formato).

## 5. Design técnico

### 5.1 Arquivos por camada
Não há código de aplicação em `src/`. Os scripts seguem o padrão da SPEC-002: funções puras exportadas e testadas, orquestração com dependências injetadas e um bloco final que só roda quando o arquivo é executado diretamente.

| Camada | Arquivo | Criar/Alterar | Responsabilidade |
|---|---|---|---|
| scripts | `scripts/backup-encryption.ts` (+ `.test.ts`) | Criar | `resolveEncryption`, `checkRecipientKey` (análise da saída `--with-colons`), `encryptionCommands` (movida de `backup-db.ts`, agora por modo) (CA-1 a CA-4) |
| scripts | `scripts/cloud-copy.ts` (+ `.test.ts`) | Criar | `resolveCloudDir`, `selectCloudCopiesToPrune`, `copyToCloud` (CA-8 a CA-11) |
| scripts | `scripts/backup-db.ts` (+ `.test.ts`) | Alterar | `resolveBackupBase` com a guarda de `/mnt/<letra>/` (CA-7); `runBackup` com a checagem prévia de criptografia e nuvem, o modo de criptografia e a cópia para a nuvem; código de saída por resultado (CA-2, CA-6, CA-11, CA-12) |
| scripts | `scripts/backup-paths.ts` | Criar | `isInsideDirectory` e `realPathOf` extraídos de `backup-db.ts`, mais `isOnWindowsDrive` e a comparação sem distinção de maiúsculas sob `/mnt/<letra>/`; usados por backup, nuvem e verificação |
| scripts | `scripts/verify-backup.ts` (+ `.test.ts`, `.int.test.ts`) | Alterar | `resolveVerifyInput`, `archiveEntriesAreSafe`, `verifyEncryptedBackup` (CA-13 a CA-15) |
| scripts | `scripts/gpg-roundtrip.int.test.ts` | Criar | CA-5, com `GNUPGHOME` temporário e chave de teste sem senha |
| testes | `tests/fixtures/backup/gpg-colons/` | Criar | Saídas `--with-colons` de exemplo: válida, revogada, expirada, sem subchave de criptografia, outra impressão digital |
| docs | `docs/operacao/backup-e-restauracao.md` | Alterar | CA-16 |
| docs | `docs/adr/ADR-009-backup-chave-publica-e-pasta-sincronizada.md` | Criado (rascunho, junto com as respostas da § 8) | § 7 |
| docs | `docs/adr/ADR-008-implantacao-e-backup-locais.md` | Alterado (só o status) | Nota apontando para o ADR-009 |
| docs | `docs/02`, `docs/06`, `docs/07`, `CHANGELOG.md`, `docs/specs/SPEC-002-implantacao.md` (histórico) | Alterar | Ver § 3 |

`command-runner.ts` não muda: o modo `interactive` já existe.

### 5.2 Contratos

**Variáveis lidas pelo `backup` e pelo `backup:verify` (nunca versionadas)**

| Variável | Obrigatória | Observação |
|---|---|---|
| `SUPABASE_DB_PASSWORD` | sim (`backup`) | Sem mudança: só na sessão (`read -s`). |
| `GABARITA_BACKUP_DIR` | não | Sem mudança, mais a guarda de CA-7. |
| `GABARITA_BACKUP_KEEP` | não | Vale para a pasta local e para a pasta da nuvem (P-8). |
| `GABARITA_GPG_RECIPIENT` | não | Impressão digital completa da chave de backup. Ausente: modo simétrico (P-1). |
| `GABARITA_CLOUD_DIR` | não | Caminho no WSL da pasta sincronizada; o Google Drive para computador está em modo **Espelhar arquivos** (P-2), então o caminho é `/mnt/c/Users/<usuário>/My Drive/gabarita-backups`. O valor real fica só no `~/.zshrc`; o runbook usa `<usuário>`. A pasta precisa existir (o script não a cria: pasta ausente costuma ser Drive desligado ou caminho errado). |

**Criptografia**

```ts
// scripts/backup-encryption.ts
export const GPG_FINGERPRINT = /^[0-9A-F]{40}$/;

export type Encryption = { mode: 'recipient'; fingerprint: string } | { mode: 'symmetric' };

export function resolveEncryption(
  env: Record<string, string | undefined>,
): { ok: true; encryption: Encryption } | { ok: false; error: 'invalid_fingerprint' };

export type RecipientKeyError =
  'key_not_found' | 'key_revoked' | 'key_expired' | 'key_invalid' | 'no_encryption_capability';

/**
 * Reads `gpg --batch --with-colons --list-keys <fpr>` output: the `pub` record whose `fpr` matches,
 * validity (field 2: r/e/i refuse) and key capabilities (field 12 must contain uppercase E).
 */
export function checkRecipientKey(
  colonsOutput: string,
  fingerprint: string,
): { ok: true } | { ok: false; error: RecipientKeyError };

export function describeEncryptionError(error: 'invalid_fingerprint' | RecipientKeyError): string; // Portuguese

export function encryptionCommands(
  base: string,
  name: string,
  encryption: Encryption,
): {
  archive: string;                                      // <base>/<name>.tar.gz
  encrypted: string;                                    // <base>/<name>.tar.gz.gpg
  tar: { command: 'tar'; args: string[] };
  gpg: { command: 'gpg'; args: string[]; interactive: boolean }; // recipient: false; symmetric: true
};
// recipient: ['--batch', '--trust-model', 'always', '--encrypt', '--recipient', fpr, '--output', encrypted, archive]
// symmetric: ['--pinentry-mode', 'loopback', '--symmetric', '--cipher-algo', 'AES256', '--output', encrypted, archive]
```

`--trust-model always` é seguro aqui porque o destinatário é fixado pela impressão digital completa (não por e-mail ou nome): o modelo de confiança do `gpg` serve para ligar identidades a chaves, e a impressão digital já identifica a chave sem ambiguidade. Sem ele, uma chave importada numa máquina nova (confiança "desconhecida") faria o `--batch` falhar.

**Pastas**

```ts
// scripts/backup-paths.ts
export function isInsideDirectory(child: string, parent: string): boolean; // real paths; case-insensitive under /mnt/<letter>/
export function isOnWindowsDrive(path: string): boolean;                   // real path starts with /mnt/<letter>/

// scripts/backup-db.ts (error union grows)
export function resolveBackupBase(input: {
  env: Record<string, string | undefined>;
  home: string;
  repoRoot: string;
}): { ok: true; path: string } | { ok: false; error: 'not_absolute' | 'inside_repository' | 'on_windows_drive' };
```

**Nuvem**

```ts
// scripts/cloud-copy.ts
export const ENCRYPTED_NAME = /^\d{4}-\d{2}-\d{2}T\d{6}Z\.tar\.gz\.gpg$/;

export function resolveCloudDir(input: {
  env: Record<string, string | undefined>;
  repoRoot: string;
  backupBase: string;
}):
  | { ok: true; path: string | null }                   // null: not configured
  | { ok: false; error: 'not_absolute' | 'inside_repository' | 'overlaps_backup_base' };

export function selectCloudCopiesToPrune(entries: readonly string[], keep: number): string[];

export type CloudFs = {
  isDirectory(path: string): Promise<boolean>;
  copyFile(from: string, to: string): Promise<void>;
  rename(from: string, to: string): Promise<void>;
  sha256(path: string): Promise<string>;
  readdir(path: string): Promise<string[]>;
  rm(path: string): Promise<void>;                      // files only; never recursive in the cloud folder
};

/** Copies only `<name>.tar.gz.gpg` (via `.partial` + rename), checks SHA-256, then prunes the cloud folder. */
export function copyToCloud(deps: {
  fs: CloudFs;
  encrypted: string;
  cloudDir: string;
  keep: number;
  log: (line: string) => void;
}): Promise<{ ok: true; copied: string; pruned: number } | { ok: false; reason: string }>;
```

**Orquestração do backup**

```ts
// scripts/backup-db.ts
type BackupResult =
  | {
      ok: true;
      directory: string;
      encrypted: string;
      cloud: { status: 'not_configured' } | { status: 'copied'; path: string; pruned: number } | { status: 'failed'; reason: string };
    }
  | { ok: false; directory?: string; reason: string };

/**
 * Order: base (CA-7) -> keep -> cloud dir (CA-8) -> encryption (CA-1) -> recipient key check (CA-3)
 * -> DB password -> dumps -> validation -> manifest -> tar + gpg (CA-4/CA-2) -> local prune
 * -> cloud copy + cloud prune (CA-9 to CA-11).
 * Everything that can refuse for configuration runs before the first `supabase db dump`.
 */
export function runBackup(deps: {
  run: CommandRunner;
  now: Date;
  env: Record<string, string | undefined>;
  fs: BackupFs;
  cloudFs: CloudFs;
  log: (line: string) => void;
  home: string;
  repoRoot: string;
  publicTables: readonly string[];
}): Promise<BackupResult>;

/** 0: ok and copied or not configured; 2: local ok, cloud failed (P-4); 1: failure. */
export function backupExitCode(result: BackupResult): 0 | 1 | 2;
```

**Verificação**

```ts
// scripts/verify-backup.ts
export function resolveVerifyInput(
  path: string,
  isDirectory: boolean,
): { kind: 'directory'; path: string } | { kind: 'encrypted'; path: string; name: string } | { kind: 'invalid' };

/** Exactly `<name>/` plus `<name>/` + roles.sql, schema.sql, data.sql, manifest.json. */
export function archiveEntriesAreSafe(entries: readonly string[], name: string): boolean;

/**
 * Local URL guard -> temp dir (0700, outside repo and cloud dir) -> interactive `gpg --decrypt`
 * -> `tar -tzf` + archiveEntriesAreSafe -> `tar -xzf --no-same-owner` -> verifyBackup -> rm temp (always).
 */
export function verifyEncryptedBackup(
  file: string,
  deps: VerifyDeps & {
    makeTempDir: () => Promise<string>;
    removeDir: (path: string) => Promise<void>;
    repoRoot: string;
    cloudDir: string | null;
  },
): Promise<{ ok: true } | { ok: false; reason: string }>;
```

### 5.3 Banco
Nenhuma mudança. Nenhuma migração, política ou visão.

### 5.4 Interface
Nenhuma tela. A "interface" é o terminal:
- **Modo `recipient`:** `Criptografando para a chave <últimos 16 caracteres da impressão digital>...`, sem pedido de senha.
- **Modo `symmetric`:** aviso de CA-2 no início e `Criptografando a cópia para a nuvem (o gpg pedirá a senha)...` como hoje.
- **Cópia:** `Copiando para a pasta da nuvem...`, depois `Cópia conferida (SHA-256): <caminho>` e `Retenção na nuvem: N cópia(s) antiga(s) apagada(s).`
- **Falha só da nuvem:** mensagem de CA-11 em `stderr`, código 2 (P-4).
- **Sem nuvem configurada:** a linha atual "Envie <arquivo> para o Google Drive (passo manual do runbook)."

### 5.5 Gestão da chave (vai para o runbook)
1. Gerar no WSL, sem expiração (P-5): `gpg --quick-generate-key "Gabarita backup" ed25519 cert never` e `gpg --quick-add-key <impressão digital> cv25519 encr never`, com senha gerada pelo gerenciador de senhas. A chave de curva 25519 cabe numa nota de texto do gerenciador (cerca de 1 KB em ASCII), sem precisar de anexo.
2. Guardar no gerenciador (P-6): a senha da chave, num item próprio; numa nota segura, a chave privada exportada com `gpg --export-secret-keys --armor <impressão digital>`; o certificado de revogação (`~/.gnupg/openpgp-revocs.d/<impressão digital>.rev`). Nunca no repositório, em `.env*` ou na pasta do Drive. Segunda cópia offline (pendrive guardado em casa) é opcional.
3. `export GABARITA_GPG_RECIPIENT=<impressão digital>` e `export GABARITA_CLOUD_DIR="/mnt/c/Users/<usuário>/My Drive/gabarita-backups"` (aspas por causa do espaço em `My Drive`) no `~/.zshrc`.
4. Máquina ou WSL novos: importar a chave do gerenciador (`gpg --import`), sem precisar marcar confiança (o script usa `--trust-model always`).
5. Teste da cópia guardada, a cada ensaio trimestral (P-10): `GNUPGHOME=$(mktemp -d)`, importar a chave do gerenciador e descriptografar a última cópia do Drive; apagar o `GNUPGHOME` temporário. Prova que a restauração não depende do `~/.gnupg` do WSL.
6. Transição: as cópias simétricas antigas continuam abríveis com o mesmo `gpg --decrypt` e a senha antiga; essa senha fica no gerenciador até a última cópia simétrica sair da retenção (8 semanas após o primeiro backup em modo `recipient`).

## 6. Plano de testes
| Nível | O que cobre | Critérios |
|---|---|---|
| Unitário | `resolveEncryption` (válido, espaços, minúsculas, ausente, e-mail, ID curto e longo); `checkRecipientKey` com as fixtures `--with-colons`; argumentos de `encryptionCommands` nos dois modos; `resolveBackupBase` com `/mnt/c`; `resolveCloudDir` (ausente, relativo, `C:\`, repositório, `..`, link simbólico, base dentro, nuvem dentro, igual, maiúsculas sob `/mnt`); `copyToCloud` com sistema de arquivos falso (sucesso, erro de cópia, de renomeação, hash diferente, pasta ausente); `selectCloudCopiesToPrune` (limites e nomes parecidos); `runBackup` (ordem das checagens antes do dump, aviso simétrico, falha de criptografia sem cópia, falha só da nuvem com poda local, sem nuvem); `backupExitCode`; `resolveVerifyInput`; `archiveEntriesAreSafe`; `verifyEncryptedBackup` com limpeza da pasta temporária em cada caminho de falha | CA-1 a CA-4, CA-6 a CA-14 |
| Integração | Ida e volta com `gpg` real em `GNUPGHOME` temporário; `backup:verify` restaurando no Supabase local a partir de um `.tar.gz.gpg` | CA-5, CA-15 |
| Manual (checklist) | Primeiro backup real sem senha do `gpg`, cópia no Drive, ensaio com a cópia do Drive | CA-17 |
| Revisão de documentação | Runbook | CA-16 |

Componente, E2E e pgTAP: não se aplicam. As regras do doc 04 não se aplicam.

## 7. Riscos e alternativas descartadas
**Riscos**
- **A restauração passa a depender da chave privada.** Sem ela (e sem a senha dela), todas as cópias em modo `recipient` ficam **ilegíveis para sempre**, inclusive as do Drive. Mitigação: chave exportada e senha no gerenciador de senhas (P-6), certificado de revogação guardado, teste periódico importando a chave do gerenciador num `GNUPGHOME` temporário (P-10) e ensaio trimestral com a cópia do Drive (CA-16). O `~/.gnupg` do WSL não é a única cópia: um WSL reinstalado não pode levar a chave junto.
- **Gerenciador de senhas como ponto único:** ele já guarda a senha do banco; agora guarda também a chave e a senha dela. Quem tiver o cofre e o Drive lê os backups. Aceito: é o mesmo nível de confiança da senha do banco hoje. Uma segunda cópia offline (pendrive guardado em casa) é opcional (P-6).
- **Sem assinatura, o arquivo não prova a origem:** quem tiver a chave pública e acesso de escrita à pasta do Drive poderia colocar lá um backup forjado. Mitigação: a chave pública não é publicada; o acesso ao Drive é a barreira; a restauração é manual e o `backup:verify` confere conteúdo do pacote (CA-14) e contagens. Assinar exigiria a senha da chave privada a cada backup.
- **Caminho `/mnt/c` lento e com semântica do Windows:** a ponte de arquivos do WSL2 para o NTFS é lenta e não tem permissões POSIX nem renomeação garantidamente atômica com o Drive lendo o arquivo. Mitigação: só um arquivo pequeno (alguns MB) atravessa a ponte; cópia para `.partial` e renomeação; SHA-256 conferido depois; o texto puro nunca vai para `/mnt` (CA-7).
- **Modo do Google Drive para computador:** o dono usa o modo **Espelhar arquivos** (P-2): a pasta fica em `C:\Users\<usuário>\My Drive` e aparece no WSL em `/mnt/c/Users/<usuário>/My Drive`, num disco que o WSL monta sozinho. Se um dia o modo mudar para "transmitir" (unidade virtual `G:`, que o WSL pode não montar), o CA-11 cobre a pasta ausente e o runbook precisa ser revisto. O espaço em `My Drive` exige aspas no `~/.zshrc`; os scripts recebem o caminho como argumento, sem passar por shell.
- **Cópia local na pasta sincronizada não é cópia no Drive:** se o aplicativo do Drive estiver parado ou sem login, o arquivo fica só no disco do Windows. Mitigação: o CA-17 confere pela web na primeira vez; o runbook manda conferir no ensaio trimestral que as cópias recentes estão no Drive pela web.
- **Lixeira do Drive:** a retenção apaga as cópias antigas da pasta, mas o Drive as mantém na lixeira por 30 dias. Inofensivo (estão criptografadas), registrado no runbook.
- **Chave sem expiração (P-5):** não há rito de renovação; se a chave vazar ou se perder, o certificado de revogação guardado no gerenciador a invalida e o runbook orienta gerar outra. A checagem de CA-3 continua recusando chave expirada, para o caso de a validade ser mudada à mão.
- **Backup esquecido:** continua dependendo do lembrete no calendário do celular (o agendamento fica fora, § 3).

**Alternativas descartadas**
- **Manter `--symmetric` e passar a senha por arquivo ou variável (`--passphrase-file`):** elimina a digitação, mas põe em disco ou no ambiente uma senha que abre todas as cópias; a chave pública resolve sem nenhum segredo no momento do backup.
- **Exigir `GABARITA_GPG_RECIPIENT` (sem modo simétrico):** mais simples de raciocinar, mas quebra o backup até a chave ser configurada. Fica como alternativa em P-1.
- **Escolher o destinatário por e-mail ou ID curto:** ambíguo (várias chaves podem casar) e sujeito a colisão no ID curto; a impressão digital completa fixa a chave.
- **Não usar `--trust-model always` e exigir confiança "absoluta":** força um passo manual (`gpg --edit-key ... trust`) em toda máquina nova sem ganho, já que o destinatário é fixado pela impressão digital.
- **Enviar pela API do Google Drive (rclone, OAuth, conta de serviço):** traz um token do Google para a máquina; a pasta sincronizada faz o mesmo sem credencial.
- **Agendar o backup (cron, Agendador de Tarefas, GitHub Actions):** ver § 3, Fora.
- **Criar a pasta da nuvem quando não existir:** esconderia o caso "Drive desligado" ou caminho digitado errado, criando uma pasta que nunca sincroniza.

**ADR proposto: ADR-009 (novo), não emenda do ADR-008.** A regra do projeto é que ADR aceito não se reescreve: mudança cria um ADR que o substitui. O ADR-009 ("Backup com chave pública e cópia para pasta sincronizada") substitui **só o item Backup** do ADR-008 nos pontos de criptografia (`--symmetric` → `--encrypt --recipient`, simétrico como alternativa) e de envio (manual → cópia automática para a pasta do Google Drive para computador, sem credencial do Google), e registra o agendamento sem o dono como alternativa descartada com o gatilho de reavaliação. O ADR-008 continua aceito no resto (implantação, migrações, segredos, homologação) e recebe apenas, no status, a nota "item Backup substituído em parte pelo ADR-009". O ADR-009 foi redigido com as respostas da § 8 (`docs/adr/ADR-009-backup-chave-publica-e-pasta-sincronizada.md`), como foi com o ADR-008; fica `proposto` até a aprovação desta spec.

## 8. Perguntas em aberto
Respondidas pelo dono do projeto em 2026-11-18: **todas as recomendações foram aceitas**, com P-2 = Google Drive para computador em modo **Espelhar arquivos**, pasta `/mnt/c/Users/<usuário>/My Drive/gabarita-backups`. As marcadas como **bloqueante** mudavam critérios de aceite ou arquivos; os valores decididos já estão aplicados nas seções acima. A spec segue em `rascunho` até a aprovação do dono.

| # | Pergunta | Recomendação | Resposta |
|---|---|---|---|
| P-1 | **(bloqueante)** Sem `GABARITA_GPG_RECIPIENT`, manter o modo simétrico atual ou recusar? | Manter o simétrico, com o aviso de CA-2: o backup nunca fica bloqueado por falta de configuração da chave, e as cópias antigas continuam abríveis do mesmo jeito. Valor inválido recusa (não cai no simétrico), para erro de digitação não virar senha pedida em silêncio. Remover o simétrico numa spec futura, se quiser, depois de 8 semanas em modo `recipient`. | Respondida: aceita a recomendação |
| P-2 | **(bloqueante)** Qual o modo do Google Drive para computador (espelhar ou transmitir) e qual pasta o WSL enxerga? | Usar a pasta `gabarita-backups` dentro do "My Drive" **espelhado** (`/mnt/c/Users/<usuário>/My Drive/gabarita-backups`), porque fica num disco que o WSL monta sozinho. Se usar o modo transmitir, a implementação confere se `/mnt/g` aparece; senão, o runbook documenta a montagem. O caminho real fica só no seu `~/.zshrc`; o runbook usa `<usuário>`. | Respondida: aceita; modo **Espelhar arquivos**, pasta `/mnt/c/Users/<usuário>/My Drive/gabarita-backups` |
| P-3 | **(bloqueante)** Proibir `GABARITA_BACKUP_DIR` em disco do Windows (`/mnt/<letra>/`)? | Sim (CA-7). O texto puro tem e-mail e hash de senha; no Windows ele fica ao alcance do backup de pastas do OneDrive, do indexador e de outros sincronizadores, e a guarda de sobreposição sozinha não cobre esses casos. Hoje o padrão já é `~/gabarita-backups` no disco do WSL, então nada muda na prática. | Respondida: aceita a recomendação |
| P-4 | Código de saída quando o backup local deu certo mas a cópia para a nuvem falhou. | `2`: diferente de sucesso (você percebe) e diferente de falha do backup (`1`), sem invalidar o backup local. Alternativa: `0` com aviso, que é fácil de não ver. | Respondida: aceita a recomendação |
| P-5 | Validade da chave de backup. | Sem expiração, com o certificado de revogação guardado no gerenciador: uma chave que expira faria o backup recusar num dia qualquer (CA-3) e exigiria um rito de renovação para uso pessoal. Alternativa: 2 anos, com lembrete para estender. | Respondida: aceita a recomendação |
| P-6 | **(bloqueante)** Onde guardar a chave privada: o seu gerenciador de senhas aceita uma nota de texto de cerca de 1 KB? Quer uma segunda cópia offline? | Nota segura no gerenciador com a chave em ASCII (curva 25519 cabe sem anexo) e o certificado de revogação; a senha da chave num item separado do mesmo gerenciador. Segunda cópia num pendrive guardado em casa é opcional e recomendada se o gerenciador não tiver exportação fácil. Nunca na pasta do Drive. | Respondida: aceita a recomendação |
| P-7 | **(bloqueante)** `backup:verify` passa a aceitar o `.tar.gz.gpg` (descriptografa, confere e restaura no local)? | Sim (CA-13 a CA-15). É a única prova automática de que a cópia da nuvem e a chave funcionam juntas, e substitui o passo manual "descriptografe uma vez" do ensaio. Sem isso, o ensaio continua só com o diretório local, que não testa o que realmente sobra num desastre. | Respondida: aceita a recomendação |
| P-8 | Retenção na pasta da nuvem: mesma variável `GABARITA_BACKUP_KEEP` (8) ou variável própria? | Mesma variável: 8 cópias nos dois lugares, coerente com a P-8 da SPEC-002, sem configuração nova. | Respondida: aceita a recomendação |
| P-9 | Registrar a mudança num ADR-009 novo (substitui em parte o ADR-008) ou emendar o ADR-008? | ADR-009 novo, com nota no status do ADR-008 (§ 7): segue a regra de que ADR aceito não se reescreve e preserva o porquê do `--symmetric` original. | Respondida: aceita a recomendação |
| P-10 | Com que frequência testar a cópia da chave guardada no gerenciador (importação num `GNUPGHOME` temporário)? | A cada ensaio trimestral de restauração: custa dois minutos e é o cenário de desastre real (WSL perdido). | Respondida: aceita a recomendação |

## 9. Histórico
| Data | Mudança |
|---|---|
| 2026-11-18 | Criação |
| 2026-11-18 | Respostas da § 8 registradas (todas as recomendações aceitas; P-2 = Google Drive em modo Espelhar arquivos); valores aplicados (chave sem expiração, código de saída 2, retenção 8 nos dois lugares, caminho da pasta do Drive); ADR-009 redigido e nota de status no ADR-008; aguardando aprovação do dono |
