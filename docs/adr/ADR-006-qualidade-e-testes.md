# ADR-006 — Ferramentas de qualidade, testes e arquitetura do código

**Status:** proposto · **Data:** 2026-11-16

## Contexto
O desenvolvimento do MVP será feito com apoio de um time de agentes de IA (ver `CLAUDE.md`). Para que o código gerado seja revisável e consistente, é preciso fixar antes: a organização das pastas, as ferramentas de qualidade e a estratégia de testes.

## Decisão
- **Linguagem:** TypeScript em modo `strict` (inclui `noUncheckedIndexedAccess`).
- **Organização:** módulos por funcionalidade, com camada de domínio pura (ver `docs/06-padroes-de-codigo.md`).
- **Validação de entrada:** Zod em toda fronteira (formulários, server actions, JSON importado do modo manual de IA).
- **Tipos do banco:** gerados com `supabase gen types typescript`, nunca escritos à mão.
- **Lint e formatação:** ESLint (config do Next.js + regras de import) e Prettier.
- **Testes unitários e de componentes:** Vitest + Testing Library.
- **Testes de banco (RLS, restrições, visões):** pgTAP via `supabase test db`.
- **Testes E2E:** Playwright contra Supabase local (`supabase start`), com projetos desktop e celular.
- **Acessibilidade:** `@axe-core/playwright` nos fluxos E2E principais.

## Alternativas consideradas
- **Jest** no lugar do Vitest: mais lento e com configuração de ESM mais trabalhosa.
- **Cypress** no lugar do Playwright: sem suporte nativo a vários navegadores e emulação de celular no plano gratuito com a mesma facilidade.
- **Biome** no lugar de ESLint + Prettier: mais rápido, mas sem as regras específicas do Next.js.

## Consequências
- Toda regra de `docs/04-regras-de-estudo.md` vira função pura testável sem banco nem navegador.
- Os testes E2E dependem do Docker (Supabase local).
- Mudar qualquer item acima exige um novo ADR.
