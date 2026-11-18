# ADR-008 — Implantação e backup manuais a partir da máquina local

**Status:** aceito · **Data:** 2026-11-18 · **Origem:** [SPEC-002](../specs/SPEC-002-implantacao.md)

> **Nota de status (2026-11-18):** o item **Backup**, nos pontos de criptografia (`--symmetric`) e envio ao Google Drive, é substituído em parte pelo [ADR-009](ADR-009-backup-chave-publica-e-pasta-sincronizada.md) (proposto, passa a valer com a aprovação da SPEC-003). O restante deste ADR continua aceito.

## Contexto
O Gabarita vai para o ar no plano gratuito da Vercel e do Supabase (ADR-001). O repositório é público, o desenvolvimento é feito por uma pessoa e há um único usuário (ADR-005). O plano gratuito do Supabase não tem backup automático nem download de backup pelo painel, e pausa o projeto após 7 dias sem uso. Era preciso decidir de onde as migrações chegam ao banco remoto, onde mora a senha do banco, como e onde o backup é feito e se existe um ambiente intermediário entre o local e a produção.

## Decisão
- **Código:** a Vercel implanta automaticamente só a `main`, pela integração Vercel–GitHub (sem token da Vercel no GitHub). Sem previews por PR. A `main` só recebe merge por PR com o check `verify` verde.
- **Migrações:** aplicadas no remoto pelo dono do projeto, da máquina local, com `npm run db:push` (CLI do Supabase fixada no `package.json`). O script tem guardas: árvore limpa, branch publicada, nenhuma migração já presente na `main` alterada, ordem e padrão de nome, *dry-run* exibido e confirmação digitando o identificador do projeto. Depois de aplicar, `npm run db:test:remote` roda o pgTAP contra o remoto.
- **Ordem:** a migração é aplicada antes do merge, a partir da branch do PR aprovada e publicada, e precisa ser compatível com o código em produção (aditiva; mudança destrutiva em duas etapas, expandir e depois contrair).
- **Segredos:** a senha do banco remoto fica só no gerenciador de senhas e entra por variável de ambiente da sessão do terminal. Nenhum segredo de banco em arquivo versionado, `.env*` ou segredo do GitHub Actions enquanto o repositório for público. A chave secreta (`service_role`) do remoto não é usada; o usuário real é criado pelo painel. Na Vercel ficam só as duas variáveis públicas.
- **Configuração de Auth do remoto:** feita no painel e conferida por checklist e por `npm run check:prod`; `supabase config push` não é usado (o `supabase/config.toml` descreve só o ambiente local).
- **Backup:** semanal e manual (`npm run backup`), mais um antes de cada `db:push` com migração. Cópia primária em `~/gabarita-backups/` (fora do repositório, por guarda de código), com manifesto (contagens e SHA-256) e retenção das 8 últimas cópias. Cópia fora da máquina numa pasta privada do Google Drive pessoal, criptografada com `gpg --symmetric` (senha no gerenciador). Ensaio de restauração no Supabase local (`npm run backup:verify`) a cada 3 meses e sempre que a CLI do Supabase for atualizada. Restauração em produção é manual, só pelo runbook.
- **Homologação:** o Supabase local cumpre o papel; não há segundo projeto remoto.

## Alternativas consideradas
- **Aplicar migrações pelo GitHub Actions no merge:** automatiza, mas exige a senha do banco como segredo num repositório público; um workflow alterado por engano poderia expô-la, e o ganho para um único desenvolvedor é pequeno.
- **Backup agendado no GitHub Actions:** além do segredo do banco, artefatos de repositório público podem ser baixados por qualquer conta logada, o que obrigaria a criptografar e enviar a um armazenamento externo (outra credencial); workflows agendados de repositório público são desativados após 60 dias sem atividade.
- **Segundo projeto Supabase como homologação (com previews por PR):** cabe no plano gratuito, mas dobra a manutenção (migrações, usuário, pausa) sem necessidade concreta. Previews apontando para o banco de produção foram descartados de saída: gravariam nos dados reais e quebrariam com migração ainda não aplicada.
- **`supabase config push` com o `config.toml`:** traria a configuração de Auth como código, mas o arquivo é do ambiente local e o comando sincroniza seções inteiras; um push errado reabriria o cadastro ou quebraria o login.
- **Aplicar a migração depois do merge, a partir da `main`:** mais simples, mas deixa a produção quebrada por alguns minutos a cada migração, entre a implantação automática e o `db:push`.

## Consequências
- Implantar com migração e fazer backup dependem de disciplina: os passos ficam nos runbooks de `docs/operacao/` e o backup semanal tem lembrete recorrente no calendário.
- Docker em execução passa a ser pré-requisito de `db:push`, `backup` e `backup:verify` (a CLI usa a imagem do Postgres).
- O doc 06 ganha a regra de migração compatível com o código em produção e a regra da senha do banco só na sessão; o `revisor-codigo` passa a conferi-las.
- Depois da primeira implantação, vale sem exceção: migração aplicada não se edita (a exceção usada no ADR-007 deixa de existir).
- **Se o repositório ficar privado ou o projeto virar multiusuário:** reavaliar aplicação de migrações e backup automatizados (novo ADR que substitui este).
