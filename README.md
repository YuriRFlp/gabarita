<img src="public/brand/gabarita-logo.svg" alt="Gabarita" width="280">

# Gabarita

**Plataforma de estudos para concursos de TI em tribunais.**

O Gabarita é uma plataforma web de uso pessoal para preparação para concursos de **Analista Judiciário — Tecnologia da Informação**, com foco nos tribunais de Minas Gerais (TRT-3, TRF-6, TJMG) e depois do Sudeste.

O princípio central: em concurso, o que conta é **o quanto você lembra na hora da prova**. Por isso a plataforma combina questões, revisão espaçada (FSRS) e um cronograma que se ajusta ao seu desempenho.

## Estado atual

Fase de **modelagem de dados**. Ainda não há código de aplicação.

| Item | Situação |
|---|---|
| Taxonomia e matriz de incidência (4 editais) | ✅ `data/seed/` |
| Schema do banco (migração inicial) | ✅ validado em PostgreSQL 16 |
| Identidade visual e design system | ✅ `public/brand/`, `design/` |
| Carga inicial (seed) | ✅ gerada por script |
| Aplicação (MVP) | ⏳ próxima etapa |

## Estrutura do repositório

```
data/seed/            Dados de origem (taxonomia, concursos, rubricas) em JSON
design/               Tokens e estilos dos componentes
docs/                 Documentação do projeto (comece por docs/README.md)
public/brand/         Logo, símbolo e ícone do app
scripts/              Utilitários (ex.: geração do seed)
supabase/migrations/  Migrações SQL do banco
supabase/seed.sql     Carga inicial gerada a partir de data/seed/
```

## Como recriar o banco localmente

```bash
python scripts/gerar_seed.py      # regenera supabase/seed.sql a partir do JSON
supabase db reset                 # aplica migrações + seed (Supabase CLI)
```

## Documentação

Veja [docs/README.md](docs/README.md).
