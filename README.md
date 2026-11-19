<img src="public/brand/gabarita-logo.svg" alt="Gabarita" width="280">

# Gabarita

**Plataforma de estudos para concursos de TI em tribunais.**

O Gabarita é uma plataforma web de uso pessoal para preparação para concursos de **Analista Judiciário — Tecnologia da Informação**, com foco nos tribunais de Minas Gerais (TRT-3, TRF-6, TJMG) e depois do Sudeste.

O princípio central: em concurso, o que conta é **o quanto você lembra na hora da prova**. Por isso a plataforma combina questões, revisão espaçada (FSRS) e um cronograma que se ajusta ao seu desempenho.

## Estado atual

Fundação da aplicação concluída ([SPEC-001](docs/specs/SPEC-001-fundacao-da-aplicacao.md)); implantação em andamento ([SPEC-002](docs/specs/SPEC-002-implantacao.md), runbooks em `docs/operacao/`); primeiro módulo do MVP, o Mapa do edital, implementado ([SPEC-004](docs/specs/SPEC-004-mapa-do-edital.md)); próximos passos: demais módulos.

| Item | Situação |
|---|---|
| Taxonomia e matriz de incidência (14 editais, v0.2) | ✅ `data/seed/` |
| Schema do banco, RLS e testes pgTAP | ✅ `supabase/` |
| Identidade visual e design system (direção "Folha de prova", ADR-010) | ✅ `public/brand/`, `design/` |
| Fundação: Next.js, login, tema, casca, CI | ✅ SPEC-001 |
| Implantação (Vercel + Supabase remoto), backup e runbooks | ✅ SPEC-002 |
| Mapa do edital (módulo 01): lista, matriz de incidência e detalhe do assunto, com prioridade, domínio e urgência | ✅ SPEC-004 |
| Demais módulos do MVP | ⏳ próximas specs |

## Estrutura do repositório

```
src/app/              Rotas do Next.js (App Router)
src/modules/          Módulos por funcionalidade (domain, data, actions, components)
src/shared/           Design system (ui), clientes Supabase e utilitários
tests/                E2E (Playwright), regras de lint, segurança e CI
data/seed/            Dados de origem (taxonomia, concursos, rubricas) em JSON
design/               Tokens e estilos dos componentes
docs/                 Documentação do projeto (comece por docs/README.md)
public/brand/         Logo, símbolo e ícone do app
scripts/              Utilitários (seed, tokens, usuário de teste, migração, backup, checagem de produção)
supabase/             Configuração local, migrações, seed e testes pgTAP
```

## Como rodar localmente

Pré-requisitos: Node 26 (`nvm use`) e Docker.

```bash
npm ci
npm run db:start        # sobe o Supabase local (migrações + seed)
cp .env.example .env.local
# preencha .env.local com "API URL" e "Publishable key" mostrados por `npx supabase status`
npm run e2e:user          # cria o usuário local test@gabarita.local
npm run dev               # http://localhost:3000
```

Variáveis de ambiente: só `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, ambas públicas e sujeitas à RLS. Nenhuma chave secreta entra no código ou no `.env`.

## Comandos

| Comando | O que faz |
|---|---|
| `npm run lint` / `typecheck` / `format:check` | Qualidade estática |
| `npm test` | Testes unitários e de componente (sem Docker) |
| `npm run test:coverage` | Idem, com limite de 90% em `domain/` |
| `npm run test:int` | Integração contra o Supabase local |
| `npm run db:test` | Testes pgTAP (RLS, restrições, visões) |
| `npm run test:e2e` | Reseta o banco e roda o Playwright (desktop e celular) |
| `npm run db:types` | Regenera os tipos do banco |
| `npm run tokens` | Regenera `tokens.css` a partir de `design/tokens.json` |
| `python scripts/generate_seed.py` | Regenera `supabase/seed.sql` a partir do JSON |
| `npm run db:link -- <ref>` | Liga o repositório ao projeto Supabase remoto (uma vez por máquina) |
| `npm run db:push` | Aplica migrações e seed no remoto, com guardas e confirmação (precisa de `SUPABASE_DB_PASSWORD` na sessão) |
| `npm run db:test:remote` | pgTAP contra o remoto, depois do `db:push` |
| `npm run backup` | Exporta papéis, schema e dados do remoto para fora do repositório, com cópia criptografada |
| `npm run backup:verify -- <diretório>` | Ensaio de restauração de um backup no Supabase local |
| `npm run check:prod` | Checagem sem credenciais contra a produção |

Os comandos de implantação e backup rodam só na máquina do dono do projeto e exigem Docker. Procedimentos: [implantação](docs/operacao/implantacao.md) e [backup e restauração](docs/operacao/backup-e-restauracao.md). A URL de produção não é publicada neste repositório.

## Documentação

Veja [docs/README.md](docs/README.md). Runbooks de operação em [docs/operacao/](docs/operacao/).
