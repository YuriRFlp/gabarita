# SPEC-001 — Fundação da aplicação

**Status:** concluida · **Criada:** 2026-11-17 · **Atualizada:** 2026-11-17
**Módulo:** `src/modules/auth`, `src/modules/settings`, `src/shared` · **ADRs relacionados:** ADR-001, ADR-005, ADR-006, ADR-007

## 1. Objetivo
Criar a base sobre a qual todas as funcionalidades do MVP serão construídas: projeto Next.js com as ferramentas de qualidade do ADR-006, integração contínua no GitHub Actions, Supabase local com RLS testada, login com e-mail e senha, design system aplicado no código (temas claro e escuro, com a preferência sincronizada entre aparelhos) e a casca do app autenticado. Ao final, a próxima spec só precisa escrever a funcionalidade dela, sem montar infraestrutura.

## 2. Regras de origem
| Regra | Origem | Interpretação ou esclarecimento |
|---|---|---|
| Next.js + Supabase, custo zero | ADR-001; `docs/02-arquitetura.md` | Nenhuma dependência paga; tudo roda no plano gratuito ou localmente. O GitHub Actions é gratuito para repositório público (D-5). |
| RLS em toda tabela; cadastro público desativado | ADR-005 | Desativado em `supabase/config.toml` (local). No projeto remoto, a mesma opção será configurada no painel, na spec de implantação (D-4). |
| Chaves só no servidor; `service_role` só em scripts locais | `docs/02-arquitetura.md` § Segurança; `docs/06-padroes-de-codigo.md` § Segurança | O script que cria o usuário de teste usa a chave secreta (`service_role`) do Supabase **local**, lida de `supabase status` em tempo de execução, e se recusa a rodar contra URL que não seja `localhost`/`127.0.0.1`. |
| Só a URL e a chave pública do Supabase em `NEXT_PUBLIC_` | `docs/06-padroes-de-codigo.md` § Segurança | A variável da chave passa a se chamar `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (D-13); o doc 06 é atualizado nesta spec. |
| Estrutura de pastas e regras de dependência | `docs/06-padroes-de-codigo.md` § Estrutura de pastas, § Regras de dependência | Impostas por ESLint (CA-3, CA-4). Dois esclarecimentos decididos: módulo novo `auth` (D-11) e importação entre domínios só por `domain/index.ts` (D-12); ambos entram no doc 06. |
| `data/` é o único lugar com queries | `docs/06-padroes-de-codigo.md` | Interpretado como "camada de persistência": a leitura e a escrita do cookie de tema também ficam em `data/`. |
| `Date.now()` proibido no domínio | `docs/06-padroes-de-codigo.md` | Interpretado como incluindo `new Date()` sem argumentos e `Math.random()` (mesma razão: determinismo). |
| Toda mudança de schema é migração nova; `comment on column` para semântica não óbvia; mudança de banco tem pgTAP | `docs/06-padroes-de-codigo.md` § Banco | A preferência de tema entra por migração nova; a migração inicial não é editada. |
| Ferramentas, TypeScript strict, tipos gerados | ADR-006 (aceito nesta spec, D-1); `docs/06-padroes-de-codigo.md` § TypeScript | — |
| Código em inglês; documentação e textos de interface em português | ADR-007; `docs/08-glossario.md` | Identificadores, arquivos, rotas, banco, classes CSS, tokens e scripts seguem o glossário (D-15). |
| Pirâmide de testes, cobertura ≥ 90% em `domain/`, jornadas 1 e 7 | `docs/07-estrategia-de-testes.md` | — |
| Tokens viram variáveis CSS; `data-theme="dark"` no `<html>`; padrão por `prefers-color-scheme` | `docs/05-identidade-visual.md` § Como usar no código | Para o usuário poder forçar o tema claro num sistema escuro, também existe `data-theme="light"`. Sem atributo = segue o sistema. Entra no doc 05. |
| Componente novo entra em `design/` antes do código | `docs/05-identidade-visual.md`; `docs/06-padroes-de-codigo.md` § Interface | `Field`, `Notice` e `Shell`/navegação entram em `design/components.css` e no doc 05 nesta spec; a aprovação visual é pela revisão do código (D-9). |
| Uma linha de `settings` por usuário | `docs/03-modelo-de-dados.md` § Estudo | A migração inicial dá padrão a todas as colunas (`user_id default auth.uid()`, `target_exam_id` anulável), e a coluna nova `theme` também tem padrão, então a linha pode ser criada sem dados do usuário. Criada no login (§ 5.3 e § 7). |
| Preferência de tema sincronizada entre aparelhos | Decisão do dono do projeto (D-8) | Fonte da verdade: `settings.theme`. O cookie `gb-theme` é só cache, para o servidor pintar o tema certo sem consultar o banco em toda renderização e para as telas sem sessão (§ 5.4). |
| Mobile-first a partir de 360 px; AA nos dois temas; teclado e foco visível | `docs/06-padroes-de-codigo.md` § Interface | — |

## 3. Escopo
**Dentro:**
- Scaffold Next.js 16.x (App Router, React 19.2) em TypeScript `strict` + `noUncheckedIndexedAccess`, alias `@/*` → `src/*`, estrutura de pastas do doc 06. Node 26 LTS fixado em `.nvmrc` e `engines` no `package.json`; npm como gerenciador; dependências com versão exata (D-2).
- ESLint (flat config, `eslint-config-next`, `eslint-config-prettier`) com regras que impõem as dependências entre camadas; Prettier.
- Vitest + Testing Library (projetos `unit` em Node e `components` em jsdom), cobertura v8 com limite de 90% de linhas e ramos em `src/modules/**/domain/**`.
- Testes de integração (`*.int.test.ts`, projeto `integration`) contra Supabase local, em script separado (`npm run test:int`), para `npm test` não depender do Docker.
- Playwright com projetos `desktop` (Chromium) e `mobile` (descritor Pixel 7 com viewport forçada em 360 × 800, D-14) + `@axe-core/playwright`.
- Scripts npm (§ 5.2).
- **CI no GitHub Actions** (D-5): workflow com `lint`, `typecheck`, `format:check`, `test` e `build` em push e pull request. pgTAP, integração e E2E continuam locais (precisam de Docker).
- Supabase local: `supabase/config.toml` com cadastro desativado e confirmação de e-mail desligada; CLI como dependência de desenvolvimento; tipos gerados em `src/shared/supabase/database.types.ts`; cliente de servidor e helper de sessão do proxy com `@supabase/ssr`; `.env.example` só com `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`; validação das variáveis com Zod.
- **Migração nova** `supabase/migrations/20261117000000_settings_theme.sql`: enum `theme_preference` e coluna `settings.theme` (§ 5.3), com pgTAP e tipos regenerados.
- pgTAP cobrindo a RLS das 21 tabelas e o `security_invoker` das 2 visões, além da coluna nova.
- Autenticação: tela `/login` (e-mail e senha), proteção de todas as rotas exceto `/login` pelo `proxy.ts` do Next 16, retorno seguro à rota pedida, logout, redirecionamento de quem já está logado.
- Script que cria (ou recria) o usuário de teste do E2E no Supabase local.
- Design system no código: `tokens.css` gerado de `design/tokens.json` por script, `design/components.css` importado diretamente, fontes por `next/font/google` (D-10), tema claro/escuro/sistema com alternador, salvo em `settings.theme` e espelhado no cookie `gb-theme`.
- Componentes React em `shared/ui`: `Button`, `Field`, `Notice`, `Shell`. Os três novos (`Field`, `Notice`, `Shell`) entram antes em `design/components.css` e no doc 05.
- Casca do app autenticado: cabeçalho com logo, navegação (só "Início", D-7), alternador de tema e botão Sair; página inicial `/` simples.
- Criação idempotente da linha de `settings` no login.
- Páginas `not-found` e `error` em português, com o design system.
- Jornadas E2E 1 e 7 (para as telas desta spec).
- **Atualizações de documentação (entregáveis da implementação):**
  - `docs/adr/ADR-006-qualidade-e-testes.md`: status `proposto` → `aceito` (D-1).
  - `docs/03-modelo-de-dados.md` § Estudo: `settings` passa a citar a preferência de tema (D-8).
  - `docs/05-identidade-visual.md`: fontes por `next/font/google` no lugar do Google Fonts por `@import` (D-10); `data-theme="light"` e a preferência salva; componentes `Field`, `Notice` e `Shell`/navegação (D-9).
  - `docs/06-padroes-de-codigo.md`: módulo `auth` na lista (D-11); regra de `domain/index.ts` para importação entre domínios (D-12); § Segurança com `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` e "chave publicável" no lugar de "chave anônima" (D-13). O doc 02 não cita a variável (verificado em 2026-11-17); se alguma outra ocorrência surgir até a implementação, também é atualizada.
  - `docs/07-estrategia-de-testes.md`: comando `test:int` e o que roda no CI × localmente (D-5).
  - `.claude/agents/engenheiro-e2e.md`: "Pixel 7, 360 px" → "descritor Pixel 7 com viewport 360 × 800" (D-14).
  - `README.md` (Estado atual, comandos, variáveis de ambiente) e `CHANGELOG.md` citando a SPEC-001.

**Fora (fica para depois):**
- Projeto Supabase remoto, Vercel, variáveis de ambiente de produção, cadastro desativado no painel, criação do usuário real e rotina de backup: ainda não existem; ficam para uma spec de implantação (D-4).
- pgTAP, testes de integração e E2E no CI (precisam de Docker e levam minutos); reavaliar quando o tempo local incomodar.
- Páginas dos módulos do MVP, inclusive placeholders (D-7).
- `Option`, `MasteryMeter` e `Tag` em React: entram nas specs que os usam, para não haver componente sem uso.
- Cliente Supabase de navegador: nenhuma tela desta spec precisa dele; entra na primeira spec que precisar.
- Recuperação de senha, troca de senha, login social, link mágico, cadastro.
- Cabeçalhos de segurança (CSP etc.) e PWA/manifest.
- Troca de tema em tempo real entre aparelhos abertos ao mesmo tempo: o outro aparelho aplica o tema novo no próximo carregamento completo de página (CA-36).

## 4. Critérios de aceite
CA-1 a CA-31 vêm da primeira versão (alguns alterados); CA-32 em diante foram acrescentados com as decisões da § 8.

| # | Dado / Quando / Então | Teste |
|---|---|---|
| CA-1 | Dado o repositório recém-clonado com a versão de Node do `.nvmrc`, quando rodo `npm ci && npm run lint && npm run typecheck && npm run format:check && npm test && npm run build`, então todos terminam com código 0. | manual + CI (CA-32) |
| CA-2 | Dado um arquivo com `any` explícito ou acesso indexado usado sem checagem, quando rodo `npm run typecheck`/`lint`, então falha. | unitário (ESLint Node API) |
| CA-3 | Dado um arquivo em `src/modules/x/domain/` que importa `react`, `next/*`, `@supabase/*`, `zod`¹ ou usa `fetch`, `Date.now()`, `new Date()` sem argumentos ou `Math.random()`, quando rodo o lint, então ele aponta erro. | unitário (ESLint Node API) |
| CA-4 | Dado um arquivo em `src/app/` que importa `@/modules/x/data/...` (ou qualquer arquivo interno de módulo), ou um arquivo de `components/` que importa `data/`, ou um módulo que importa arquivo interno de outro módulo, ou um arquivo fora de `domain/` que importa `@/modules/y/domain`, quando rodo o lint, então ele aponta erro; importar `@/modules/x` (o `index.ts`) passa, e um arquivo de `src/modules/x/domain/` importar `@/modules/y/domain` passa. | unitário (ESLint Node API) |
| CA-5 | Dado `src/modules/**/domain/` com cobertura abaixo de 90% de linhas ou ramos, quando rodo `npm run test:coverage`, então falha. | configuração (verificada uma vez na revisão) |
| CA-6 | Dado o Supabase local recém-resetado, quando rodo `npm run db:test`, então o pgTAP confirma: RLS ativa nas 21 tabelas; toda tabela tem política e nenhuma política é para `anon`; `anon` não lê nem grava nenhuma tabela; usuário A não lê, não altera e não insere linhas com `user_id` de B nas 9 tabelas pessoais; A não acessa `review_logs` e `mock_exam_questions` de cartões/simulados de B; autenticado lê e grava nas 10 tabelas de referência; as 2 visões têm `security_invoker = true` e `v_topic_performance` não mostra respostas de B para A. | pgTAP |
| CA-7 | **(alterado)** Dado o Supabase local, quando alguém chama `auth.signUp` com a chave publicável, então recebe erro de cadastro desativado e nenhum usuário é criado. | integração |
| CA-8 | **(alterado)** Dado que `NEXT_PUBLIC_SUPABASE_URL` ou `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` falta ou é inválida, quando a aplicação lê o ambiente, então lança erro dizendo qual variável falta, sem mostrar valores. | unitário |
| CA-9 | **(alterado)** Dado o código-fonte, quando procuro `service_role`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_SECRET_KEY` ou o prefixo `sb_secret_` em `src/`, então não há ocorrência; e nenhuma variável `NEXT_PUBLIC_` além de `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` existe em `src/`, `.env.example` e no workflow de CI. | unitário (varredura de arquivos) |
| CA-10 | Dado o script de usuário de teste, quando a URL do Supabase não é local, então ele termina com erro sem chamar a API; quando é local, então cria o usuário (ou o recria, se já existir) com e-mail confirmado. | unitário (guarda de URL) + integração |
| CA-11 | **(alterado)** Dado o schema atual (migração inicial + `20261117000000_settings_theme.sql`), quando rodo `npm run db:types`, então `src/shared/supabase/database.types.ts` é regenerado sem diferença em relação ao versionado e contém o enum `theme_preference` e a coluna `settings.theme`. | manual na revisão |
| CA-12 | Dado um visitante sem sessão, quando acessa `/` ou qualquer rota que não seja `/login`, então é redirecionado para `/login?next=<rota pedida>` e nenhum conteúdo protegido é renderizado. | E2E (Jornada 1) + unitário (`decideAccess`) |
| CA-13 | Dado o usuário de teste em `/login?next=/x`, quando informa e-mail e senha corretos e envia, então chega em `/x` (ou `/` sem `next`) com a casca do app visível. | E2E (Jornada 1) |
| CA-14 | Dado `next` com valor externo ou ambíguo (`https://site.com`, `//site.com`, `/\site.com`, `javascript:...`, vazio, ausente), quando o login dá certo, então o destino é `/`. | unitário (`safeReturnPath`) |
| CA-15 | Dado e-mail ou senha incorretos, quando envio o formulário, então vejo a mensagem genérica "E-mail ou senha incorretos." (mesma para e-mail inexistente e senha errada), o e-mail digitado é mantido, a senha é limpa e o foco vai para o aviso. | E2E (Jornada 1) + componente |
| CA-16 | Dado e-mail em formato inválido ou campo vazio, quando envio, então a validação Zod da ação devolve mensagem no campo (`aria-invalid` e `aria-describedby`) e o Supabase não é chamado. | unitário (esquema) + componente |
| CA-17 | Dado falha inesperada do Supabase (rede, serviço fora), quando envio, então vejo "Não foi possível entrar agora. Tente de novo em instantes." e nenhum detalhe técnico. | integração (cliente simulado) |
| CA-18 | Dado o formulário enviado e aguardando resposta, então o botão fica desabilitado com o rótulo "Entrando…" e não é possível enviar duas vezes. | componente |
| CA-19 | **(alterado)** Dado um usuário sem linha em `settings`, quando faz login, então a linha é criada com os padrões da migração (inclusive `theme = 'system'`); dado que já existe, quando faz login de novo, então nada muda (sem erro, sem duplicar e sem sobrescrever o `theme` salvo). Se a criação ou a leitura falhar, o login é desfeito (sessão encerrada) e aparece a mensagem de CA-17. | integração |
| CA-20 | **(alterado)** Dado um usuário logado, quando aciona "Sair", então a sessão deste aparelho é encerrada, ele vai para `/login` e, ao voltar no navegador ou acessar `/`, é redirecionado de novo para `/login`; a sessão do mesmo usuário em outro aparelho continua ativa (D-16). | E2E (Jornada 1) |
| CA-21 | Dado um usuário logado, quando acessa `/login`, então é redirecionado para `/`. | E2E (Jornada 1) + unitário (`decideAccess`) |
| CA-22 | Dado o formulário de login, quando uso só o teclado (Tab, digitação, Enter), então consigo entrar, com foco visível em cada controle. | E2E (Jornada 1) |
| CA-23 | Dado `design/tokens.json`, quando rodo `npm run tokens`, então `tokens.css` tem uma variável por token (cores nos dois temas, famílias, espaços, raios, sombra de foco); e o teste falha se o `tokens.css` versionado estiver diferente do gerado. | unitário |
| CA-24 | **(alterado)** Dado o sistema em modo escuro, sem sessão e sem cookie de tema, quando abro `/login`, então a página usa o tema escuro (fundo `paper` escuro) sem atributo `data-theme`; com o sistema claro, usa o claro. | E2E (Jornada 7) |
| CA-25 | **(alterado)** Dado o alternador de tema na casca, quando escolho "Escuro", "Claro" ou "Sistema", então `settings.theme` passa a `dark`, `light` ou `system`, o cookie `gb-theme` recebe o mesmo valor, o `<html>` recebe `data-theme="dark"`, `data-theme="light"` ou nenhum atributo, a opção escolhida fica com `aria-pressed="true"`, a escolha persiste após recarregar a página e não há troca visível de tema durante o carregamento (o atributo já vem no HTML do servidor). | E2E (Jornada 7) + integração (`setTheme`) + unitário (`parseThemePreference`, `themeAttribute`) + componente |
| CA-26 | **(alterado)** Dado valor de cookie de tema adulterado ou desconhecido, quando uma página sem sessão é renderizada, então vale "Sistema"; com sessão, vale o tema salvo em `settings` (CA-36). | unitário (`parseThemePreference`, `themeToSync`) |
| CA-27 | Dado `/login`, a página inicial e a página 404, nos temas claro e escuro, quando o axe analisa, então não há violação séria nem crítica (inclui contraste). | E2E (Jornada 7) |
| CA-28 | Dado viewport de 360 px, quando abro `/login`, a página inicial e a 404, então não há rolagem horizontal (`scrollWidth ≤ 360`), a navegação, o alternador de tema e o botão Sair são alcançáveis e todo alvo de toque tem pelo menos 44 px de altura. | E2E (Jornada 7, projeto `mobile`) |
| CA-29 | Dado o componente `Button`, quando renderizado com `variant` `primary`, `secondary` ou `text`, `disabled` ou `loading`, então aplica a classe `gb-button--<variant>`, fica desabilitado quando `loading` e expõe `aria-busy`. | componente |
| CA-30 | Dado o componente `Field` com `error`, então o `<input>` tem rótulo associado, `aria-invalid="true"` e `aria-describedby` apontando para a mensagem, que tem ícone e texto. | componente |
| CA-31 | Dado uma rota inexistente com sessão, quando acesso, então vejo a página 404 em português com link para o início. | E2E (Jornada 7) |
| CA-32 | **(novo)** Dado um push (qualquer branch) ou um pull request, quando o workflow `.github/workflows/ci.yml` roda, então executa, com o Node do `.nvmrc`, `npm ci`, `lint`, `typecheck`, `format:check`, `test` e `build`, e falha se qualquer passo falhar; o workflow tem `permissions: contents: read`, não usa `pull_request_target` nem segredos e define apenas valores fictícios locais para as duas variáveis públicas. | unitário (leitura do YAML) + manual (primeira execução verde no GitHub, conferida na revisão) |
| CA-33 | **(novo)** Dado o Supabase local recém-resetado, quando rodo `npm run db:test`, então o pgTAP confirma: o enum `theme_preference` tem exatamente `system`, `light`, `dark`, nessa ordem; `settings.theme` é `theme_preference not null default 'system'` e tem `comment on column`; uma linha inserida sem `theme` recebe `system`; gravar um valor fora do enum falha; o usuário A não lê nem altera o `theme` do usuário B. | pgTAP |
| CA-34 | **(novo)** Dado os tipos gerados do banco, quando rodo `npm test`, então `THEME_PREFERENCES` do domínio é igual, na mesma ordem, aos valores do enum `theme_preference` em `database.types.ts`; o teste falha se divergirem. | unitário |
| CA-35 | **(novo)** Dado o usuário de teste com `theme = 'dark'` salvo e um navegador sem cookie de tema com o sistema claro, quando faz login, então a primeira página após o login já vem do servidor com `data-theme="dark"` e o cookie `gb-theme` passa a `dark`. | E2E (Jornada 7) + integração (`login` grava o cache) |
| CA-36 | **(novo)** Dado `theme = 'dark'` salvo em `settings` e um segundo navegador com sessão e cookie `gb-theme=light` (o tema foi trocado em outro aparelho), quando esse navegador faz um carregamento completo de qualquer página autenticada, então o HTML do servidor já vem com `data-theme="dark"` e o cookie é atualizado para `dark`; se a leitura de `settings` falhar, a página é servida com o tema do cookie, sem erro para o usuário. | E2E (Jornada 7, dois contextos de navegador) + unitário (`themeToSync`) |
| CA-37 | **(novo)** Dado um usuário que escolheu "Escuro" e saiu, quando abre `/login` no mesmo navegador, então a tela usa o tema escuro (o cookie de cache permanece após o logout). | E2E (Jornada 7) |
| CA-38 | **(novo)** Dado falha ao gravar `settings.theme` (banco fora ou nenhuma linha atualizada), quando escolho um tema no alternador, então o cookie e o `data-theme` não mudam, a opção anterior continua com `aria-pressed="true"` e aparece o aviso "Não foi possível salvar o tema. Tente de novo." sem detalhe técnico. | integração (cliente simulado) + componente |
| CA-39 | **(novo)** Dado um envio de `setTheme` com valor fora de `system`/`light`/`dark` ou ausente, quando a ação roda, então o esquema Zod rejeita e nada é gravado (nem banco nem cookie); dado um envio sem sessão válida, então nada é gravado e o usuário é redirecionado para `/login`. | unitário (esquema) + integração |

¹ `zod` no domínio: proibido por enquanto, já que o doc 06 põe a validação em `actions/`. Se uma spec futura precisar, muda-se a regra.

## 5. Design técnico

### 5.1 Arquivos por camada
| Camada | Arquivo | Criar/Alterar | Responsabilidade |
|---|---|---|---|
| raiz | `package.json`, `package-lock.json`, `.nvmrc` | Criar | Dependências com versão exata, scripts, `engines` (`node` 26), `.nvmrc` com 26 |
| raiz | `tsconfig.json` | Criar | `strict`, `noUncheckedIndexedAccess`, `noImplicitOverride`, alias `@/*` |
| raiz | `next.config.ts` | Criar | Configuração mínima |
| raiz | `eslint.config.mjs` | Criar | Next + Prettier + regras de camada (`no-restricted-imports`, `no-restricted-syntax`, `no-restricted-globals` por glob) |
| raiz | `.prettierrc.json`, `.prettierignore` | Criar | Formatação (ignora `database.types.ts`, `seed.sql`, `tokens.css` gerado) |
| raiz | `vitest.config.ts`, `vitest.setup.ts` | Criar | Projetos `unit` e `components`; cobertura com limite em `domain/`; `*.int.test.ts` excluídos do `npm test` |
| raiz | `vitest.int.config.ts` | Criar | Projeto `integration`: testes de integração contra Supabase local |
| raiz | `playwright.config.ts` | Criar | Projetos `desktop` e `mobile` (Pixel 7 com viewport 360 × 800); `webServer` com `next build && next start`; `trace: 'retain-on-failure'`; setup que faz login e salva `storageState` em `tests/e2e/.auth/` |
| raiz | `.env.example` | Criar | Só `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` |
| raiz | `.gitignore` | Alterar (se preciso) | Já cobre `.env*`, `tests/e2e/.auth/`, cobertura e relatórios |
| ci | `.github/workflows/ci.yml` | Criar | CA-32 (§ 5.2 Integração contínua) |
| supabase | `supabase/config.toml` | Criar | `project_id`, `[auth] enable_signup = false` (a CLI 3.x não tem a opção em `[auth.email]`), `enable_confirmations = false`, `site_url = "http://localhost:3000"` |
| supabase | `supabase/migrations/20261117000000_settings_theme.sql` | Criar | Enum `theme_preference` e coluna `settings.theme` (§ 5.3) |
| supabase | `supabase/tests/rls.test.sql` | Criar | pgTAP de CA-6 |
| supabase | `supabase/tests/settings_theme.test.sql` | Criar | pgTAP de CA-33 |
| design | `design/components.css` | Alterar | Novos `gb-field`, `gb-notice`, `gb-shell` (cabeçalho, navegação, item ativo, menu do celular); remover o `@import` do Google Fonts (D-10) |
| scripts | `scripts/generate-tokens-css.ts` (+ `.test.ts`) | Criar | `generateTokensCss()` puro + escrita do arquivo; esquema Zod de `tokens.json` |
| scripts | `scripts/create-test-user.ts` (+ `.test.ts`, `.int.test.ts`) | Criar | Guarda de URL local (`isLocalUrl`), lê chaves de `supabase status -o json` (`readLocalSupabase`), recria o usuário pela API admin (`createTestUser`) |
| shared | `src/shared/supabase/database.types.ts` | Criar (gerado) | `supabase gen types typescript --local`, já com a migração do tema |
| shared | `src/shared/supabase/types.ts` | Criar | Tipo `DbClient` (cliente tipado com `Database`) |
| shared | `src/shared/supabase/server.ts` | Criar | `createSupabaseServerClient()` com `createServerClient` e `cookies()` |
| shared | `src/shared/supabase/session.ts` | Criar | `refreshSession(request)`: renova a sessão no proxy e devolve resposta, cliente e usuário (`auth.getUser()`, nunca `getSession()` para decidir acesso) |
| shared | `src/shared/supabase/index.ts` | Criar | Exporta clientes e o tipo `DbClient` |
| shared | `src/shared/utils/env.ts` (+ `.test.ts`) | Criar | `validateEnv`/`readEnv`: valida as variáveis públicas com Zod (CA-8) |
| shared | `src/shared/ui/styles/tokens.css` | Criar (gerado) | Variáveis CSS dos dois temas |
| shared | `src/shared/ui/styles/global.css` | Criar | Importa `tokens.css` e `design/components.css`; reset mínimo e base (`body` com `gb-root`) |
| shared | `src/shared/ui/Button.tsx` (+ teste) | Criar | CA-29 |
| shared | `src/shared/ui/Field.tsx` (+ teste) | Criar | CA-30 |
| shared | `src/shared/ui/Notice.tsx` (+ teste) | Criar | Mensagem de erro/sucesso com ícone + texto, `role="alert"` para erro |
| shared | `src/shared/ui/Shell.tsx` (+ teste) | Criar | Layout genérico com slots (logo, navegação, ações); item ativo com `aria-current="page"` |
| shared | `src/shared/ui/index.ts` | Criar | API pública do design system |
| shared | `src/shared/ui/fonts.ts` | Criar | `next/font/google` preenchendo `--font-face-display`, `--font-face-text`, `--font-face-code`, que o `tokens.css` usa como primeira opção de `--font-*`; exporta `fontClasses`, aplicado no `<html>` e importado direto pelo layout (fora do `index.ts`, porque `next/font` só funciona no build do Next) |
| domain | `src/modules/auth/domain/return-path.ts` (+ teste) | Criar | CA-14 |
| domain | `src/modules/auth/domain/decide-access.ts` (+ teste) | Criar | CA-12, CA-21 |
| domain | `src/modules/auth/domain/index.ts` | Criar | API do domínio para outros domínios (D-12) |
| domain | `src/modules/settings/domain/theme-preference.ts` (+ teste) | Criar | CA-25, CA-26, CA-36 |
| domain | `src/modules/settings/domain/index.ts` | Criar | API do domínio para outros domínios (D-12) |
| data | `src/modules/settings/data/settings-repository.ts` (+ `.int.test.ts`) | Criar | `ensureSettings`, `readSavedTheme`, `saveTheme` (CA-19, CA-25, CA-36, CA-38) |
| data | `src/modules/settings/data/theme-preference-cookie.ts` | Criar | Lê e grava o cookie `gb-theme` (Server Components/ações e proxy) |
| data | `src/modules/settings/data/theme-preference-db.test.ts` | Criar | CA-34: compara `THEME_PREFERENCES` com o enum gerado |
| actions | `src/modules/auth/actions/login-schema.ts` (+ teste) | Criar | `loginSchema`, `LoginState`, estado inicial e mensagens (fora do arquivo `'use server'`, que só exporta funções assíncronas) |
| actions | `src/modules/auth/actions/login.ts` (+ `.int.test.ts`) | Criar | Zod, `signInWithPassword`, `ensureSettings`, gravação do cache de tema, redirecionamento |
| actions | `src/modules/auth/actions/logout.ts` | Criar | `signOut` e redirecionamento (não apaga o cookie de tema, CA-37) |
| actions | `src/modules/auth/public-signup.int.test.ts` | Criar | CA-7 |
| actions | `src/modules/settings/actions/set-theme-schema.ts` (+ teste) | Criar | `setThemeSchema`, `SetThemeState`, estado inicial e mensagem |
| actions | `src/modules/settings/actions/set-theme.ts` (+ `.int.test.ts`) | Criar | Zod, sessão, `saveTheme`, depois cookie; CA-25, CA-38, CA-39 |
| components | `src/modules/auth/components/LoginForm.tsx` (+ teste) | Criar | Client Component com `useActionState`; CA-15, CA-16, CA-18 |
| components | `src/modules/auth/components/LogoutButton.tsx` | Criar | Formulário com a ação `logout` |
| components | `src/modules/settings/components/ThemeToggle.tsx` (+ teste) | Criar | Client Component com `useActionState`; grupo de três opções (Sistema, Claro, Escuro), `aria-pressed`, ícones Lucide, `Notice` em caso de erro (CA-38) |
| módulos | `src/modules/auth/index.ts`, `src/modules/settings/index.ts` | Criar | APIs públicas (§ 5.2) |
| app | `src/proxy.ts` | Criar | Chama `refreshSession` e `decideAccess`; em carregamento completo autenticado, sincroniza o cache de tema (§ 5.4); `matcher` exclui `_next`, imagens e `brand/` |
| app | `src/app/layout.tsx` | Criar | `<html lang="pt-BR">`, fontes, `data-theme` vindo do cookie `gb-theme`, metadados, ícone |
| app | `src/app/logo.tsx` | Criar | Logo nas versões normal e branca, trocadas por CSS (`gb-logo--light-theme`, `gb-logo--dark-theme`) |
| app | `src/app/(public)/login/page.tsx` | Criar | Tela de login |
| app | `src/app/(app)/layout.tsx` | Criar | Compõe `AppShell` + `ThemeToggle` (recebe o tema salvo) + `LogoutButton` |
| app | `src/app/(app)/app-shell.tsx` | Criar | Client Component que passa `NAVIGATION_ITEMS` e o caminho atual (`usePathname`) ao `Shell` |
| app | `src/app/(app)/navigation.tsx` | Criar | Lista `NAVIGATION_ITEMS` (só "Início" nesta spec; cada spec acrescenta o seu) |
| app | `src/app/(app)/page.tsx` | Criar | Página inicial simples |
| app | `src/app/not-found.tsx`, `src/app/error.tsx` | Criar | Páginas de erro |
| testes | `tests/e2e/auth.setup.ts` | Criar | Roda o script do usuário de teste e salva a sessão |
| testes | `tests/e2e/pages/LoginPage.ts`, `HomePage.ts` | Criar | Page Objects |
| testes | `tests/e2e/data/test-user.ts` | Criar | E-mail (`test@gabarita.local`) e senha do usuário local de teste (não são segredo: só existem no Supabase local) |
| testes | `tests/e2e/journey-01-login.spec.ts` | Criar | CA-12, 13, 15, 20, 21, 22 |
| testes | `tests/e2e/journey-07-themes-mobile.spec.ts` | Criar | CA-24, 25, 27, 28, 31, 35, 36, 37 |
| testes | `tests/e2e/support/axe.ts` | Criar | Helper que falha em violações sérias e críticas |
| testes | `tests/e2e/support/{focus,layout,session,theme,users}.ts` | Criar | Apoio do E2E: foco, medidas de layout, arquivo de sessão, leitura e gravação do tema, usuários descartáveis |
| testes | `tests/assets/brand-paths.test.ts` | Criar | Todo asset de `/brand/` citado em `src/` existe em `public/` |
| supabase | `supabase/tests/schema_constraints.test.sql` | Criar | Enums, padrões e `check` do schema reescrito em inglês (ADR-007) |
| testes | `tests/factories/` | Criar | Fábricas de dados e cliente Supabase simulado para os testes de integração e componente |
| testes | `tests/integration/setup.ts` | Criar | `globalSetup` do projeto `integration` |
| testes | `tests/lint/layers.test.ts`, `tests/lint/typescript-options.test.ts`, `tests/security/keys.test.ts` | Criar | CA-2 a CA-4 e CA-9 (`typescript-options` cobre a parte de acesso indexado do CA-2 pela API do compilador) |
| testes | `tests/ci/workflow.test.ts` | Criar | CA-32: lê `.github/workflows/ci.yml` com `yaml` e confere gatilhos, permissões, Node e passos |
| docs | `docs/03`, `docs/05`, `docs/06`, `docs/07`, `docs/adr/ADR-006-qualidade-e-testes.md`, `.claude/agents/engenheiro-e2e.md`, `README.md`, `CHANGELOG.md` | Alterar | Ver § 3, "Atualizações de documentação" |

### 5.2 Contratos

**Versões (D-2)**

Node 26 LTS (`.nvmrc` e `engines`), Next.js 16.x estável mais recente, React 19.2, Zod 4, npm; todas as dependências com versão exata (sem `^`/`~`). Os scripts `.ts` rodam direto no Node (remoção de tipos nativa), sem `tsx`.

**Scripts npm**

| Script | Comando |
|---|---|
| `dev` / `build` / `start` | `next dev` / `next build` / `next start` |
| `lint` | `eslint .` (o `next lint` foi removido no Next 16) |
| `format` / `format:check` | `prettier --write .` / `prettier --check .` |
| `typecheck` | `tsc --noEmit` |
| `test` | `vitest run` (unitário + componentes, sem Docker) |
| `test:coverage` | `vitest run --coverage` |
| `test:int` | `vitest run --config vitest.int.config.ts` |
| `test:e2e` | `supabase db reset && playwright test` |
| `db:start` / `db:stop` / `db:reset` | `supabase start` / `supabase stop` / `supabase db reset` |
| `db:test` | `supabase test db` |
| `db:types` | `supabase gen types typescript --local > src/shared/supabase/database.types.ts` |
| `tokens` | `node scripts/generate-tokens-css.ts` |
| `e2e:user` | `node scripts/create-test-user.ts` |

**Integração contínua (`.github/workflows/ci.yml`)**

- Gatilhos: `push` (todas as branches) e `pull_request`. Nunca `pull_request_target` (o repositório é público e PRs de terceiros não podem rodar com permissões elevadas).
- `permissions: contents: read`; `concurrency` por branch com `cancel-in-progress: true`.
- Um job em `ubuntu-latest`: `actions/checkout` → `actions/setup-node` com `node-version-file: .nvmrc` e `cache: npm` → `npm ci` → `npm run lint` → `npm run typecheck` → `npm run format:check` → `npm test` → `npm run build`.
- Ações fixadas por SHA de commit, com a versão em comentário (repositório público: evita que uma tag movida altere o que roda).
- `env` do job: `NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321` e `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` com valor fictício, só para a validação de ambiente (CA-8) passar no build. Nenhum segredo do repositório é usado.
- Não roda `db:test`, `test:int` nem `test:e2e` (precisam de Docker); a sincronia de `database.types.ts` (CA-11) continua conferida localmente.

**Domínio**

```ts
// src/modules/auth/domain/return-path.ts
export const HOME_PATH = '/';
/** Aceita só caminho interno absoluto ("/x"); qualquer outra coisa vira HOME_PATH. */
export function safeReturnPath(value: string | null | undefined): string;

// src/modules/auth/domain/decide-access.ts
export const LOGIN_ROUTE = '/login';
export const PUBLIC_ROUTES: readonly string[]; // [LOGIN_ROUTE]
export type AccessDecision =
  | { type: 'continue' }
  | { type: 'redirect'; destination: string };
export function decideAccess(input: {
  path: string;          // pathname + search da requisição
  authenticated: boolean;
}): AccessDecision;
// sem sessão + rota protegida -> /login?next=<caminho codificado>
// com sessão + /login         -> /

// src/modules/settings/domain/theme-preference.ts
export const THEME_PREFERENCES = ['system', 'light', 'dark'] as const; // mesma ordem do enum do banco (CA-34)
export type ThemePreference = (typeof THEME_PREFERENCES)[number];
export const DEFAULT_THEME_PREFERENCE: ThemePreference; // 'system'
export function parseThemePreference(value: string | undefined): ThemePreference;
/** Valor do atributo data-theme do <html>; undefined = segue prefers-color-scheme. */
export function themeAttribute(preference: ThemePreference): 'light' | 'dark' | undefined;
/**
 * Decide se o cache precisa ser regravado: devolve o valor salvo, a menos que o cookie já
 * tenha exatamente esse valor (cookie ausente ou adulterado é regravado, D-17); null quando
 * a leitura falhou.
 */
export function themeToSync(
  saved: ThemePreference | null,
  cookie: string | undefined,
): ThemePreference | null;
```

**Dados**

```ts
// src/shared/supabase/index.ts
export type DbClient = SupabaseClient<Database>;
export function createSupabaseServerClient(): Promise<DbClient>;
export type ProxySession = {
  response: NextResponse;
  client: DbClient;
  user: { id: string } | null;
};
export function refreshSession(request: NextRequest): Promise<ProxySession>;

// src/modules/settings/data/settings-repository.ts
export type DbFailure = { ok: false; error: 'db_failure' };
/**
 * Recebe o mesmo cliente que acabou de autenticar: um cliente novo leria os cookies
 * da requisição, que ainda não têm a sessão.
 */
export function ensureSettings(
  client: DbClient,
  userId: string,
): Promise<{ ok: true; theme: ThemePreference } | DbFailure>;
// insert ... on conflict (user_id) do nothing (upsert com ignoreDuplicates), depois select de theme

/** null em erro ou ausência de linha; quem chama mantém o cache atual. */
export function readSavedTheme(client: DbClient, userId: string): Promise<ThemePreference | null>;

/** update settings set theme = $1 where user_id = $2; 0 linhas atualizadas conta como falha. */
export function saveTheme(
  client: DbClient,
  userId: string,
  theme: ThemePreference,
): Promise<{ ok: true } | DbFailure>;

// src/modules/settings/data/theme-preference-cookie.ts
export const THEME_COOKIE = 'gb-theme'; // path=/, SameSite=Lax, httpOnly, secure em produção, 1 ano
/** Server Components e ações (next/headers). */
export function readThemePreference(): Promise<ThemePreference>;
export function writeThemePreference(preference: ThemePreference): Promise<void>;
/** Proxy: valor bruto do cookie na requisição (interpretado por themeToSync). */
export function readThemeCookieFromRequest(request: NextRequest): string | undefined;
/**
 * Proxy: regrava o cookie na requisição (para o layout desta mesma requisição ler o valor
 * novo) e na resposta, preservando os cookies de sessão já definidos em `response`.
 */
export function applyThemeCacheInProxy(
  request: NextRequest,
  response: NextResponse,
  theme: ThemePreference,
): NextResponse;
```

**Ações**

```ts
// src/modules/auth/actions/login-schema.ts
export const loginSchema = z.object({
  email: z.string().trim().pipe(z.email({ error: 'Informe um e-mail válido.' })),
  password: z.string().min(1, { error: 'Informe a senha.' }),
  next: z.string().optional(),
});
export type LoginField = 'email' | 'password';
export type LoginState =
  | { status: 'idle' }
  | {
      status: 'error';
      message?: string; // erro geral (credenciais, falha inesperada)
      fields?: Partial<Record<LoginField, string>>;
      email: string;    // devolvido para manter o campo preenchido
    };

// src/modules/auth/actions/login.ts
'use server';
/**
 * Sucesso não retorna: ensureSettings -> writeThemePreference(tema salvo)
 * -> redirect(safeReturnPath(next)).
 */
export function login(previous: LoginState, formData: FormData): Promise<LoginState>;

// src/modules/auth/actions/logout.ts
'use server';
export function logout(): Promise<never>; // signOut({ scope: 'local' }) + redirect('/login'); mantém o cookie gb-theme

// src/modules/settings/actions/set-theme-schema.ts
export const setThemeSchema = z.object({ theme: z.enum(THEME_PREFERENCES) });
export type SetThemeState =
  | { status: 'idle' }
  | { status: 'error'; message: string };

// src/modules/settings/actions/set-theme.ts
'use server';
/**
 * Ordem: Zod -> auth.getUser() (sem sessão: redirect('/login')) -> saveTheme
 * -> só então writeThemePreference -> revalidatePath('/', 'layout').
 * Banco antes do cookie: se o banco falhar, o cache não diverge da fonte da verdade.
 */
export function setTheme(previous: SetThemeState, formData: FormData): Promise<SetThemeState>;
```

Mensagens de erro de `login` (constantes do módulo): `"E-mail ou senha incorretos."` para `invalid_credentials`; `"Não foi possível entrar agora. Tente de novo em instantes."` para qualquer outro erro, inclusive falha em `ensureSettings` (nesse caso, `signOut` antes de responder). Mensagem de `setTheme`: `"Não foi possível salvar o tema. Tente de novo."` para falha de banco; valor inválido (só possível por envio adulterado) devolve a mesma mensagem. Detalhes técnicos vão para `console.error` no servidor, nunca para a tela.

**APIs públicas dos módulos**

```ts
// src/modules/auth/index.ts
export { login } from './actions/login';
export { logout } from './actions/logout';
export { LoginForm } from './components/LoginForm';
export { LogoutButton } from './components/LogoutButton';
export { LOGIN_ROUTE, safeReturnPath, decideAccess } from './domain';

// src/modules/settings/index.ts
export { ensureSettings, readSavedTheme } from './data/settings-repository';
export {
  applyThemeCacheInProxy,
  writeThemePreference,
  readThemeCookieFromRequest,
  readThemePreference,
} from './data/theme-preference-cookie';
export { themeAttribute, themeToSync, type ThemePreference } from './domain';
export { setTheme } from './actions/set-theme';
export { ThemeToggle } from './components/ThemeToggle';
```

`domain/index.ts` de cada módulo reexporta só funções e tipos puros; é o único ponto que outro `domain/` pode importar (D-12).

**Design system**

```ts
// src/shared/ui
type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'text'; // padrão: primary
  loading?: boolean;
  icon?: ReactNode;
};
type FieldProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'id'> & {
  id: string;
  label: string;
  error?: string;
};
type NoticeProps = {
  kind: 'error' | 'success';
  children: ReactNode;
  id?: string;
  tabIndex?: number;            // o aviso de erro do login recebe foco (CA-15)
  ref?: Ref<HTMLDivElement>;
};
type NavigationItem = { label: string; href: string; icon: ReactNode };
type ShellProps = {
  logo: ReactNode;
  navigation: ReadonlyArray<NavigationItem>;
  currentPath: string;
  actions: ReactNode;           // alternador de tema, botão Sair
  children: ReactNode;
};

// src/modules/settings/components/ThemeToggle.tsx
type ThemeToggleProps = {
  savedTheme: ThemePreference;
  action?: SetThemeAction;      // padrão: setTheme; injetável nos testes de componente
};

// scripts/generate-tokens-css.ts
export const tokensSchema: z.ZodType<DesignTokens>;
export function generateTokensCss(tokens: DesignTokens): string;
// Saída: :root { light + espaços, raios, famílias }
//        :root[data-theme="dark"] { dark }
//        @media (prefers-color-scheme: dark) { :root:not([data-theme]) { dark } }
//        color-scheme coerente em cada caso.
```

As famílias de fonte dos tokens viram `--font-display`, `--font-text` e `--font-code`, os nomes que `design/components.css` usa; `next/font` preenche `--font-face-display`, `--font-face-text` e `--font-face-code` com a fonte auto-hospedada, e o `tokens.css` as usa como primeira opção, mantendo a pilha de fallback dos tokens.

**Regras de lint (resumo do que `eslint.config.mjs` impõe)**

| Glob | Regra |
|---|---|
| `src/**` | Sem `any` explícito; sem `@ts-ignore`; `@ts-expect-error` e `eslint-disable` só com descrição |
| `src/modules/*/domain/**` | Proibido importar `react`, `react-dom`, `next`, `next/*`, `@supabase/*`, `zod`, `@/shared/supabase`, `@/shared/ui`, `@/modules/<y>` (o `index.ts` geral) e `../data`, `../actions`, `../components`; proibido `fetch`, `Date.now()`, `new Date()` sem argumentos, `Math.random()` |
| `src/modules/*/data/**` | Proibido importar `react`, `../components`, `../actions` |
| `src/modules/*/actions/**` | Proibido importar `../components` |
| `src/modules/*/components/**` | Proibido importar `../data`, `@/shared/supabase` |
| `src/**` | Proibido `@/modules/*/*` (arquivo interno de módulo); entre módulos só `@/modules/<module>`. Única exceção: arquivos de `src/modules/*/domain/**` podem importar `@/modules/<y>/domain` (D-12) |
| `src/shared/**` | Proibido importar `@/modules/**` |
| `src/**` | Proibido `process.env.SUPABASE_SERVICE_ROLE_KEY`, `process.env.SUPABASE_SECRET_KEY` e qualquer `process.env.NEXT_PUBLIC_*` fora de `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` |

Primeiro com regras nativas do ESLint. Se elas não conseguirem expressar alguma regra (por exemplo, caminhos relativos que saem do módulo), a implementação pode adotar `eslint-plugin-boundaries`, registrando isso no histórico desta spec.

### 5.3 Banco
**Migração nova:** `supabase/migrations/20261117000000_settings_theme.sql`. A migração inicial (`20261116000000_initial_schema.sql`) não é editada.

```sql
-- UI theme preference in settings, synced across devices (SPEC-001).
create type theme_preference as enum ('system', 'light', 'dark');

alter table settings
  add column theme theme_preference not null default 'system';

comment on column settings.theme is
  'UI theme chosen by the user. system = follows the device prefers-color-scheme; '
  'the app keeps a copy in a cookie only as a cache to paint the page without querying the database.';
```

- **Enum, não `check`:** segue o padrão da migração inicial (`ai_mode` e demais). Acrescentar um valor no futuro é `alter type ... add value` em migração nova.
- **RLS:** nenhuma política nova; `owner_settings` (`for all`, `user_id = auth.uid()` em `using` e `with check`) já cobre a coluna. Nenhum `grant` novo (a migração inicial não altera os grants padrão do Supabase).
- **Índices:** nenhum; a leitura é por chave primária (`user_id`).
- **Linhas existentes:** recebem `system` pelo `default` do `add column`.
- **`updated_at`:** o gatilho `trg_settings_updated` já atualiza a coluna quando o tema muda.
- **Tipos:** `npm run db:types` regenera `database.types.ts` com `theme_preference` (CA-11); CA-34 garante que o domínio acompanha o enum.
- **Doc 03:** a descrição de `settings` passa a incluir a preferência de tema (entregável, § 3).

**Linha de `settings`:** criada pela aplicação no login (`ensureSettings`), com `on conflict do nothing`, seguida da leitura do `theme`. A RLS (`owner_settings`) garante `user_id = auth.uid()` no `with check`.

**`supabase/config.toml`:** cadastro desativado; confirmação de e-mail desligada (o usuário de teste é criado já confirmado pela API admin, que ignora `enable_signup`).

**pgTAP** (`create extension if not exists pgtap` no próprio teste, tudo em `begin; ... rollback;`):
- `supabase/tests/rls.test.sql` (CA-6):
  - `rowsecurity = true` para cada uma das 21 tabelas de `public` (lista explícita, para o teste falhar se aparecer tabela nova sem cobertura: compara a lista com `pg_tables`);
  - existência das políticas `owner_*` e `authenticated_*` e ausência de política para `anon`;
  - usuários simulados com `set local role authenticated` + `set local request.jwt.claims = '{"sub":"<uuid>","role":"authenticated"}'` (as tabelas não têm FK para `auth.users`, então não é preciso criar usuários);
  - `anon`: `select` vê 0 linhas mesmo com dados inseridos; `insert` falha;
  - isolamento A/B em cada tabela pessoal (ler, atualizar, apagar, inserir com `user_id` alheio) e nas filhas `review_logs` e `mock_exam_questions`;
  - `reloptions` das visões contém `security_invoker=true`; `v_topic_performance` só devolve as linhas do usuário corrente.
- `supabase/tests/settings_theme.test.sql` (CA-33): `enum_has_labels('public', 'theme_preference', array['system','light','dark'])`; `col_type_is`, `col_not_null`, `col_default_is` em `settings.theme`; `obj_description`/`col_description` não nulo; insert sem `theme` → `system`; `throws_ok` para valor fora do enum; como A, `update ... set theme` na linha de B afeta 0 linhas e `select` não a vê.

### 5.4 Interface

**`/login`**
- Logo (versão normal no claro, branca no escuro, trocada por CSS conforme o tema efetivo), `h1` "Entrar", campos E-mail (`type="email"`, `autocomplete="email"`, `name="email"`) e Senha (`type="password"`, `autocomplete="current-password"`, `name="password"`), botão primário "Entrar".
- Estados: inicial; enviando (botão desabilitado, "Entrando…", `aria-busy`); erro de campo (mensagem sob o campo, ícone + texto); erro geral (`Notice` de erro acima do botão, recebe foco); sucesso (redirecionamento).
- Sem link de cadastro nem de "esqueci a senha" (fora do escopo).
- Celular: coluna única, largura total com margem `--space-4`; desktop: cartão centralizado com largura máxima (`gb-login`, `gb-login__card`).

**Casca autenticada**
- Cabeçalho: logo (link para `/`), navegação a partir de `NAVIGATION_ITEMS`, `ThemeToggle`, `LogoutButton` (variante `text`, ícone `LogOut` + "Sair").
- Celular (< 768 px): navegação vira um botão "Menu" (`aria-expanded`, `aria-controls`) que abre a lista; o alternador e Sair ficam dentro do menu. Funciona com teclado; `Esc` fecha e devolve o foco ao botão.
- Desktop: navegação horizontal no cabeçalho.
- Item da página atual com `aria-current="page"`.
- `main` com `id` e link "Pular para o conteúdo" como primeiro elemento focável.

**Página inicial `/`**
- `h1` "Início" e um parágrafo curto dizendo que os módulos aparecem aqui conforme forem entregues. Sem dados do banco além do tema.

**404 e erro**
- `h1` "Página não encontrada" / "Algo deu errado", texto curto e link (ou botão "Tentar de novo" no erro) com `Button`.

**Tema: como o servidor aplica sem piscar**

Fonte da verdade: `settings.theme`. Cache: cookie `gb-theme` (httpOnly; o navegador não precisa lê-lo).

1. **Renderização (todas as páginas):** o layout raiz lê só o cookie (`readThemePreference`) e escreve `data-theme` no `<html>` com `themeAttribute`. Nenhuma consulta ao banco no layout raiz e nenhum script inline: o HTML já sai com o tema certo.
2. **Login (`login`):** depois de `ensureSettings`, grava o cookie com o tema salvo, antes do redirecionamento (CA-35).
3. **Troca no alternador (`setTheme`):** grava no banco e só então no cookie; `revalidatePath('/', 'layout')` re-renderiza o layout raiz com o atributo novo (CA-25, CA-38).
4. **Outro aparelho (`proxy.ts`):** em requisição autenticada que seja carregamento completo de página (`GET` com `Sec-Fetch-Dest: document`), o proxy, que já tem o cliente e o usuário de `refreshSession`, chama `readSavedTheme` (uma leitura por chave primária) e `themeToSync` com o valor de `readThemeCookieFromRequest`; se o valor salvo difere do cookie, `applyThemeCacheInProxy` regrava o cookie na requisição e na resposta, e o layout raiz desta mesma requisição já renderiza o tema salvo (CA-36). Navegações internas (RSC), prefetch e ações não disparam a leitura.
5. **Logout:** o cookie permanece, para `/login` manter o último tema (CA-37).
6. **Sem sessão e sem cookie:** sem atributo; vale `prefers-color-scheme` pelo CSS (CA-24).

**`ThemeToggle`**
- Recebe `savedTheme` do layout autenticado (lido com `readSavedTheme`, recorrendo ao cookie se a leitura falhar) e marca a opção correspondente com `aria-pressed="true"`.
- Três botões com ícone + texto (`Monitor` Sistema, `Sun` Claro, `Moon` Escuro) dentro de um `<form>` (`gb-theme-toggle`, grupo `gb-segmented`) ligado a `setTheme` por `useActionState`; cada botão envia `name="theme"` com seu valor (`system`, `light`, `dark`). Sem JavaScript continua funcionando (envio do formulário).
- Estados: inicial; enviando (botões desabilitados, `aria-busy` no grupo); erro (`Notice` de erro com "Não foi possível salvar o tema. Tente de novo.", opção anterior mantida); sucesso (layout re-renderizado com o tema novo).
- `prefers-reduced-motion` respeitado (as transições já estão condicionadas em `components.css`).

## 6. Plano de testes
| Nível | O que cobre | Critérios |
|---|---|---|
| Unitário | `safeReturnPath`, `decideAccess`, `parseThemePreference`, `themeAttribute`, `themeToSync` (salvo nulo, igual, diferente, cookie adulterado), `loginSchema`, `setThemeSchema`, `validateEnv`, `generateTokensCss` + sincronia do `tokens.css`, guarda de URL do script de usuário (`isLocalUrl`), regras de lint via ESLint Node API com arquivos de exemplo (inclui a exceção de `domain/index.ts`), varredura de chaves, `THEME_PREFERENCES` × enum gerado, leitura do YAML do workflow | CA-2, 3, 4, 8, 9, 10, 12, 14, 16, 21, 23, 25, 26, 32, 34, 36, 39 |
| Componente | `Button`, `Field`, `Notice`, `Shell` (item ativo, menu no celular), `LoginForm` (estados com ação simulada), `ThemeToggle` (opção marcada, enviando, erro com ação simulada) | CA-15, 16, 18, 25, 29, 30, 38 |
| Integração | `ensureSettings` (cria com `theme = 'system'`, é idempotente e não sobrescreve o tema), `login` com falha simulada do cliente, com falha em `ensureSettings` e gravando o cache de tema no sucesso, `setTheme` (grava banco e cookie; falha de banco não toca o cookie; sem sessão não grava), `readSavedTheme`/`saveTheme` contra o banco local, `signUp` bloqueado, script de usuário de teste | CA-7, 10, 17, 19, 25, 35, 38, 39 |
| pgTAP | RLS das 21 tabelas, `anon`, isolamento A/B, filhas, visões; enum e coluna `theme` | CA-6, 33 |
| E2E | Jornada 1 (login, acesso negado, retorno, erro, logout, teclado); Jornada 7 (tema do sistema, alternador e persistência, tema salvo aplicado no login, sincronia entre dois contextos de navegador, cache após logout, axe nos dois temas, 360 px, 404) | CA-12, 13, 15, 20, 21, 22, 24, 25, 27, 28, 31, 35, 36, 37 |
| CI | Workflow no GitHub Actions executando lint, typecheck, formatação, testes e build | CA-1, 32 |
| Configuração / revisão | Limite de cobertura, regeneração de tipos, comandos do CA-1, primeira execução verde do CI | CA-1, 5, 11, 32 |

Casos-limite do doc 07 aplicáveis: E2E com banco limpo (`supabase db reset`) e usuário criado por script; testes independentes da ordem (os testes de tema da Jornada 7 restauram `theme = 'system'` do usuário de teste ou recriam o usuário antes de cada caso, porque o tema agora é estado no banco); sem `waitForTimeout`; localizadores por papel e rótulo. "Sem piscar" é verificado lendo o atributo `data-theme` da resposta HTML do servidor (antes da hidratação), não só depois do carregamento. As regras do doc 04 não se aplicam (esta spec não tem regra de estudo).

## 7. Riscos e alternativas descartadas
**Riscos**
- **Next 16 renomeou `middleware.ts` para `proxy.ts` e removeu `next lint`.** A spec já assume Next 16 (D-2).
- **Chaves do Supabase:** a variável passa a `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (D-13). Se a versão do Supabase CLI local ainda expuser só a chave `anon` legada em `supabase status`, ela é usada como valor da mesma variável (ambas são públicas e sujeitas à RLS); o README explica de onde copiar.
- **Docker no WSL** é pré-requisito de `db:*`, `test:int` e `test:e2e`; sem ele, só lint, typecheck, formatação, `npm test` e build rodam, que é exatamente o que o CI cobre.
- **Regressão de banco não pega pelo CI:** pgTAP, integração e E2E são locais; a Definição de pronto do doc 06 continua exigindo rodá-los antes de fechar a tarefa.
- **Cobertura de 90% com domínio pequeno:** o limite vale desde já, com poucas funções; não há risco de bloquear, só de dar falsa segurança.
- **`next/font/google` baixa as fontes no build:** exige rede no build (a Vercel e o GitHub Actions têm); em troca, nenhuma requisição ao Google no navegador e sem salto de layout.
- **Tema re-renderizado após ação com redirecionamento:** se o redirecionamento de `login` não re-renderizar o layout raiz com o cookie novo (a navegação após ação é feita no cliente), a primeira página após o login pode vir com o tema antigo. CA-35 detecta; a correção prevista é o proxy tratar também a primeira requisição após o login ou o formulário fazer navegação completa, registrada no histórico.
- **`Sec-Fetch-Dest` ausente** (navegador antigo ou cliente sem Fetch Metadata): o proxy não sincroniza e vale o cookie; o tema se corrige no próximo login ou troca. Aceitável para uso pessoal em navegadores atuais.
- **Uma leitura extra ao banco por carregamento completo autenticado:** consulta por chave primária, só em documento (não em navegação interna); custo desprezível para um usuário.

**Alternativas descartadas**
- **Tailwind (padrão do `create-next-app`):** criaria um segundo sistema de estilos ao lado dos tokens e das classes `gb-` exigidos pelo doc 06.
- **Gatilho em `auth.users` para criar `settings`:** garantiria a linha no próprio banco, mas exige função `security definer` no schema `auth`, acoplamento a uma parte interna do Supabase e esbarra na ordem das migrações. Criar no login é mais simples e, desfazendo o login quando falha, mantém a regra "sessão no app ⇒ linha existe". Se aparecer outro caminho de criação de sessão, reavaliar.
- **Criar `settings` no layout da casca a cada requisição:** escrita durante a renderização e uma consulta extra por página.
- **Tema só em cookie, por aparelho:** proposta original; descartada pelo dono do projeto, que quer sincronia entre computador e celular (D-8).
- **Ler `settings.theme` no layout raiz a cada renderização:** exige `auth.getUser()` (ida ao serviço de autenticação) mais a consulta em toda página, inclusive navegações internas e telas sem sessão; o proxy já tem o usuário e só lê em carregamento completo.
- **Sincronizar pelo cliente (componente que compara o tema salvo com o atual e troca o atributo):** a página pisca quando os valores divergem.
- **Tema em `localStorage`:** o servidor não sabe o tema e a página pisca no carregamento, ou exige script inline.
- **`check` em vez de enum para o tema:** funcionaria, mas destoa do padrão da migração inicial e não gera união de tipos em `database.types.ts`.
- **pgTAP e E2E no CI agora:** exigiriam subir o Supabase (Docker) no runner a cada push, com minutos de execução; ficam locais até haver necessidade.
- **Páginas placeholder para os 9 módulos:** links para telas vazias, testes e axe sobre conteúdo que será refeito; cada spec acrescenta a sua entrada na navegação (D-7).
- **`eslint-plugin-boundaries` desde o início:** dependência extra quando as regras nativas provavelmente bastam; fica como plano B (§ 5.2).
- **Cliente Supabase de navegador agora:** código sem uso e sem teste nesta spec.
- **Copiar `components.css` para `src/`:** duas cópias divergiriam; o app importa o arquivo de `design/`.

## 8. Registro de decisões
Todas as perguntas da primeira versão foram respondidas pelo dono do projeto em 2026-11-17. Não há pergunta em aberto. Os identificadores citados abaixo já estão em inglês (D-15).

| # | Pergunta | Decisão |
|---|---|---|
| D-1 | ADR-006 estava `proposto`; precisa ser aceito antes da aprovação. | Aceito ("Concordo com a spec"). A implementação muda o status do ADR-006 para `aceito`. |
| D-2 | Versões de Node, Next, React, Zod e gerenciador. | Node 26 LTS (`.nvmrc` e `engines`), Next.js 16.x estável mais recente, React 19.2, Zod 4, npm, dependências com versão exata. |
| D-3 | As datas de 2026-11-16 nos documentos estavam certas? | Sim; o relógio da máquina de desenvolvimento estava atrasado (a data real era 2026-11-17). |
| D-4 | Projeto Supabase remoto e Vercel já existem? | Não existem. Ficam para uma spec de implantação futura (variáveis na Vercel, cadastro desativado no painel, usuário real, backup do doc 02). |
| D-5 | CI no GitHub Actions entra nesta spec? Repositório público ou privado? | Entra. O repositório é público. Workflow com `lint`, `typecheck`, `test`, `format:check` e `build` em push e pull request; pgTAP e E2E ficam locais (CA-32). |
| D-6 | Docker disponível no WSL? | Sim, Docker Desktop (o relógio do Windows precisa estar sincronizado para baixar imagens). |
| D-7 | Navegação com só "Início" ou com os 9 módulos e páginas "em breve"? | Só "Início"; cada spec acrescenta o seu módulo. |
| D-8 | Tema por aparelho (cookie) ou sincronizado? | Sincronizado entre computador e celular: coluna `settings.theme` em migração nova, cookie só como cache (§ 5.3, § 5.4, CA-33 a CA-39). |
| D-9 | Novos componentes do design system precisam de aprovação visual antes? | Não; basta a revisão do código. Ajustes visuais, se necessários, serão pedidos depois. |
| D-10 | Fontes por `next/font/google` em vez do `@import` do Google Fonts? | Sim. O `@import` sai de `design/components.css` e o doc 05 é atualizado. |
| D-11 | Módulo novo de autenticação, fora da lista do doc 06. | Aprovado como `auth`; entra no doc 06. |
| D-12 | Ambiguidade do doc 06 sobre importação entre domínios. | Cada módulo pode ter `domain/index.ts`, e só arquivos de `domain/` podem importar `@/modules/<x>/domain`. Regra de lint nasce aqui; doc 06 atualizado. |
| D-13 | Manter `NEXT_PUBLIC_SUPABASE_ANON_KEY` ou renomear? | Renomear para `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` e atualizar o doc 06 (o doc 02 não cita a variável). |
| D-14 | Viewport do celular: descritor Pixel 7 tem 412 px, não 360. | Descritor Pixel 7 com viewport 360 × 800; o texto de `.claude/agents/engenheiro-e2e.md` é corrigido. |
| D-15 | Idioma do código (decisão do dono do projeto durante a implementação). | Todo código passa para inglês: identificadores, arquivos, pastas, rotas, comentários, testes, banco (tabelas, colunas, enums e seus valores, políticas, migrações), classes CSS, tokens, scripts npm e mensagens de commit. Documentação, specs e textos de interface continuam em português. Registrado no ADR-007; traduções fixas em `docs/08-glossario.md`. Como nenhuma migração foi aplicada fora do ambiente local, as migrações desta spec foram reescritas em inglês (`20261116000000_initial_schema.sql`, `20261117000000_settings_theme.sql`). A semântica dos critérios de aceite não muda. |
| D-16 | "Sair" num aparelho encerra a sessão dos outros? (apontado na revisão) | Não: logout com `signOut({ scope: 'local' })`, só no aparelho atual, coerente com o uso em computador e celular ao mesmo tempo (D-8). CA-20 ganha o caso do outro aparelho. |
| D-17 | `themeToSync` deve regravar cookie ausente ou adulterado quando o tema salvo é `system`? (divergência entre código e spec apontada na revisão) | Sim: devolve o valor salvo sempre que o cookie não tem exatamente esse valor; o cookie inválido é corrigido na primeira carga completa. |

## 9. Histórico
| Data | Mudança |
|---|---|
| 2026-11-17 | Criação |
| 2026-11-17 | P-3 resolvida: as datas dos documentos estavam certas; o relógio da máquina estava atrasado. P-2 passa a propor Node 26 LTS. P-6: Docker Desktop disponível. |
| 2026-11-17 | Respostas do dono do projeto incorporadas; § 8 virou registro de decisões (D-1 a D-14). Escopo: CI no GitHub Actions (D-5, CA-32); tema sincronizado entre aparelhos com migração `20261117000000_tema_configuracoes.sql`, cache em cookie sincronizado pelo proxy e ação `definirTema` gravando no banco (D-8, CA-33 a CA-39); variável renomeada para `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (D-13); versões fixadas (D-2); atualizações de documentação listadas como entregáveis (ADR-006, docs 03, 05, 06, 07, agente `engenheiro-e2e`). CAs alterados: 1, 4, 7, 8, 9, 11, 19, 24, 25, 26, 28. Status continua `rascunho`. |
| 2026-11-17 | Aprovada pelo dono do projeto; status `em-implementacao`. |
| 2026-11-17 | Identificadores passam para inglês (ADR-007); projeto movido para o sistema de arquivos do WSL. |
| 2026-11-17 | Revisão: D-16 (logout só no aparelho atual, CA-20 alterado) e D-17 (contrato de `themeToSync`); `config.toml` sem `[auth.email] enable_signup`; arquivos de apoio do E2E, teste de assets de marca e `schema_constraints.test.sql` listados em § 5.1. |
| 2026-11-17 | Revisão final: desfazer o login quando `ensureSettings` falha passa a usar `signOut({ scope: 'local' })` (D-16); comentário do `playwright.config.ts` corrigido; teste `tests/lint/typescript-options.test.ts` para o acesso indexado do CA-2. |
| 2026-11-17 | Concluída: `revisor-codigo` aprovou; primeira execução do CI no GitHub verde (run 44182938464: lint, typecheck, format:check, test e build), fechando CA-1 e CA-32; pgTAP, integração e E2E verdes localmente. Status `concluida`. |
