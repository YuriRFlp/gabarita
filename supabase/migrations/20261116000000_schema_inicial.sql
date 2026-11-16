-- =====================================================================
-- Migração 0001 — Schema inicial do MVP
-- Projeto: Gabarita — plataforma de estudos para concursos de TI (tribunais)
-- Banco: PostgreSQL (Supabase)
-- Documentação: docs/03-modelo-de-dados.md
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------
-- Tipos enumerados
-- ---------------------------------------------------------------------
create type grupo_assunto         as enum ('especificos', 'gerais');
create type perfil_assunto        as enum ('sistemas', 'infra', 'comum');
create type fase_estudo           as enum ('pre_edital', 'pos_edital');
create type formato_questao       as enum ('multipla_escolha', 'certo_errado');
create type origem_conteudo       as enum ('prova_real', 'ia_manual', 'ia_api', 'usuario', 'oficial');
create type nivel_confianca       as enum ('chute', 'duvida', 'certeza');
create type tipo_material         as enum ('resumo', 'link', 'anotacao');
create type tipo_cartao           as enum ('questao', 'conceito');
create type tipo_sessao           as enum ('ciclo', 'revisao', 'simulado', 'discursiva');
create type etapa_ciclo           as enum ('leitura', 'questoes', 'revisao');
create type status_item           as enum ('pendente', 'concluido', 'pulado');
create type tipo_discursiva       as enum ('redacao_tema_geral', 'estudo_de_caso_tecnico', 'questao_tecnica');
create type modo_ia               as enum ('desligado', 'manual', 'api');
create type tipo_solicitacao_ia   as enum ('resumo', 'questoes', 'correcao_discursiva', 'classificacao', 'cartoes');
create type status_solicitacao_ia as enum ('aguardando_resposta', 'importada', 'descartada');

-- ---------------------------------------------------------------------
-- Função utilitária: mantém updated_at
-- ---------------------------------------------------------------------
create or replace function set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

-- =====================================================================
-- 1. REFERÊNCIA: bancas, rubricas, concursos e taxonomia
-- =====================================================================
create table bancas (
  id               text primary key,                 -- ex.: 'fumarc', 'cebraspe'
  nome             text not null,
  formato_padrao   formato_questao not null,
  penalidade_erro  numeric(3,2) not null default 0   -- Cebraspe: 1.00 (um erro anula um acerto)
);

create table rubricas (
  id               text primary key,                 -- ex.: 'fumarc_redacao'
  banca_id         text not null references bancas(id),
  tipo             tipo_discursiva not null,
  definicao        jsonb not null                    -- critérios, faixas, descontos, fórmula
);

create table concursos (
  id               text primary key,                 -- ex.: 'trt3'
  tribunal         text not null,
  ano              int  not null,
  banca_id         text not null references bancas(id),
  cargo            text not null,
  duracao_min      int  not null check (duracao_min > 0),
  objetiva         jsonb not null,                   -- distribuição, pesos, regras de aprovação
  discursiva       jsonb,                            -- tipo, linhas, pontos, mínimo
  rubrica_id       text references rubricas(id),
  peso_alvo        numeric(4,3) not null default 0 check (peso_alvo between 0 and 1),
  ativo            boolean not null default true,
  created_at       timestamptz not null default now()
);

create table assuntos (
  id               text primary key,                 -- ex.: 'pdpj_stack'
  grupo            grupo_assunto not null,
  nome             text not null,
  perfil           perfil_assunto,                   -- preenchido só em 'especificos'
  fase             fase_estudo not null default 'pre_edital',
  ordem            int not null default 0
);

create table subtopicos (
  id               uuid primary key default gen_random_uuid(),
  assunto_id       text not null references assuntos(id) on delete cascade,
  nome             text not null,
  ordem            int  not null default 0,
  unique (assunto_id, nome)
);

create table incidencias (
  concurso_id      text not null references concursos(id) on delete cascade,
  assunto_id       text not null references assuntos(id) on delete cascade,
  valor            numeric(2,1) not null check (valor in (0, 0.5, 1)),
  primary key (concurso_id, assunto_id)
);

-- =====================================================================
-- 2. CONTEÚDO: material de estudo, provas e questões
-- =====================================================================
create table materiais (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null default auth.uid(),
  subtopico_id     uuid not null references subtopicos(id) on delete cascade,
  tipo             tipo_material not null,
  titulo           text not null,
  conteudo_md      text,                             -- Markdown; vira mapa mental via Markmap
  url              text,                             -- fonte oficial ou material externo
  origem           origem_conteudo not null,
  verificado       boolean not null default false,   -- conferido contra a fonte oficial?
  versao           int not null default 1,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  check (tipo <> 'link' or url is not null),
  check (tipo =  'link' or conteudo_md is not null)
);
create trigger trg_materiais_updated before update on materiais
  for each row execute function set_updated_at();

create table provas (
  id               uuid primary key default gen_random_uuid(),
  banca_id         text not null references bancas(id),
  orgao            text not null,                    -- ex.: 'TRT-3'
  ano              int  not null,
  cargo            text not null,
  concurso_id      text references concursos(id),    -- quando a prova é de um concurso cadastrado
  fonte_url        text,
  created_at       timestamptz not null default now(),
  unique (banca_id, orgao, ano, cargo)
);

create table questoes (
  id               uuid primary key default gen_random_uuid(),
  prova_id         uuid references provas(id) on delete set null,
  numero           int,                              -- número na prova original
  banca_id         text not null references bancas(id),
  formato          formato_questao not null,
  texto_base       text,                             -- texto ou cenário compartilhado por vários itens
  enunciado        text not null,
  alternativas     jsonb,                            -- [{"letra":"A","texto":"..."}]
  gabarito         text not null,                    -- 'A'..'E' ou 'C'/'E'
  comentario_md    text,
  origem           origem_conteudo not null,
  anulada          boolean not null default false,
  hash_conteudo    text unique,                      -- evita importar a mesma questão duas vezes
  created_at       timestamptz not null default now(),
  check (
    (formato = 'certo_errado'     and gabarito in ('C', 'E')) or
    (formato = 'multipla_escolha' and alternativas is not null and gabarito ~ '^[A-E]$')
  )
);
create index idx_questoes_prova on questoes (prova_id);

create table questao_assuntos (
  questao_id       uuid not null references questoes(id) on delete cascade,
  assunto_id       text not null references assuntos(id),
  subtopico_id     uuid references subtopicos(id),
  primary key (questao_id, assunto_id)
);
create index idx_questao_assuntos_assunto on questao_assuntos (assunto_id);

-- =====================================================================
-- 3. ESTUDO: configuração, cronograma, sessões, simulados e respostas
-- =====================================================================
create table configuracoes (
  user_id                 uuid primary key default auth.uid(),
  concurso_alvo           text references concursos(id),
  horas_por_dia           jsonb not null default
    '{"seg":3,"ter":3,"qua":3,"qui":3,"sex":3,"sab":3,"dom":3}',
  cota_infra_min_semana   int not null default 180,
  novos_cartoes_por_dia   int not null default 20,
  retencao_desejada       numeric(3,2) not null default 0.90
                          check (retencao_desejada between 0.70 and 0.99),
  modo_ia                 modo_ia not null default 'manual',
  updated_at              timestamptz not null default now()
);
create trigger trg_configuracoes_updated before update on configuracoes
  for each row execute function set_updated_at();

create table sessoes_estudo (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null default auth.uid(),
  tipo               tipo_sessao not null,
  assunto_id         text references assuntos(id),
  etapa              etapa_ciclo,
  minutos_planejados int,
  inicio             timestamptz not null default now(),
  fim                timestamptz,
  check (fim is null or fim >= inicio)
);
create index idx_sessoes_user_inicio on sessoes_estudo (user_id, inicio desc);

create table itens_cronograma (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null default auth.uid(),
  data             date not null,
  ordem            int  not null default 0,
  tipo             tipo_sessao not null,
  assunto_id       text references assuntos(id),
  etapa            etapa_ciclo,
  minutos          int not null check (minutos > 0),
  status           status_item not null default 'pendente',
  sessao_id        uuid references sessoes_estudo(id) on delete set null,
  gerado_em        timestamptz not null default now()
);
create index idx_cronograma_user_data on itens_cronograma (user_id, data);

create table simulados (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null default auth.uid(),
  concurso_id      text not null references concursos(id),
  limite_min       int not null,
  iniciado_em      timestamptz not null default now(),
  finalizado_em    timestamptz,
  resultado        jsonb,                            -- nota por disciplina e nota final
  aprovado         boolean
);

create table simulado_questoes (
  simulado_id      uuid not null references simulados(id) on delete cascade,
  questao_id       uuid not null references questoes(id),
  ordem            int  not null,
  disciplina       text not null,                    -- chave da distribuição do concurso
  primary key (simulado_id, questao_id)
);

create table respostas (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null default auth.uid(),
  questao_id       uuid not null references questoes(id) on delete cascade,
  sessao_id        uuid references sessoes_estudo(id) on delete set null,
  simulado_id      uuid references simulados(id) on delete cascade,
  resposta         text,                             -- null = deixou em branco
  correta          boolean,                          -- null = em branco
  confianca        nivel_confianca,
  tempo_seg        int check (tempo_seg >= 0),
  respondida_em    timestamptz not null default now(),
  check ((resposta is null) = (correta is null))
);
create index idx_respostas_user_data on respostas (user_id, respondida_em desc);
create index idx_respostas_questao   on respostas (questao_id);

-- =====================================================================
-- 4. MEMORIZAÇÃO: cartões FSRS e histórico de revisões
--    Os campos espelham Card e ReviewLog da biblioteca ts-fsrs.
-- =====================================================================
create table cartoes (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null default auth.uid(),
  tipo             tipo_cartao not null,
  questao_id       uuid references questoes(id) on delete cascade,
  subtopico_id     uuid references subtopicos(id) on delete set null,
  frente           text,
  verso            text,
  origem           origem_conteudo not null,
  suspenso         boolean not null default false,
  -- estado FSRS
  due              timestamptz not null default now(),
  stability        double precision not null default 0,
  difficulty       double precision not null default 0,
  elapsed_days     int not null default 0,
  scheduled_days   int not null default 0,
  learning_steps   int not null default 0,
  reps             int not null default 0,
  lapses           int not null default 0,
  state            smallint not null default 0 check (state between 0 and 3), -- 0 New, 1 Learning, 2 Review, 3 Relearning
  last_review      timestamptz,
  created_at       timestamptz not null default now(),
  check (
    (tipo = 'questao'  and questao_id is not null) or
    (tipo = 'conceito' and frente is not null and verso is not null)
  )
);
create unique index uq_cartao_questao on cartoes (user_id, questao_id) where questao_id is not null;
create index idx_cartoes_fila on cartoes (user_id, due) where not suspenso;

create table revisoes (
  id                 uuid primary key default gen_random_uuid(),
  cartao_id          uuid not null references cartoes(id) on delete cascade,
  rating             smallint not null check (rating between 1 and 4), -- 1 Again, 2 Hard, 3 Good, 4 Easy
  state              smallint not null check (state between 0 and 3),
  due                timestamptz not null,
  stability          double precision not null,
  difficulty         double precision not null,
  elapsed_days       int not null,
  last_elapsed_days  int not null,
  scheduled_days     int not null,
  learning_steps     int not null default 0,
  revisado_em        timestamptz not null default now()
);
create index idx_revisoes_cartao on revisoes (cartao_id, revisado_em);

-- =====================================================================
-- 5. DISCURSIVAS
-- =====================================================================
create table temas_discursiva (
  id                  uuid primary key default gen_random_uuid(),
  tipo                tipo_discursiva not null,
  banca_id            text references bancas(id),
  assunto_id          text references assuntos(id),  -- usado em estudo de caso técnico
  titulo              text not null,
  enunciado           text not null,
  textos_apoio        jsonb,
  padrao_resposta_md  text,                         -- padrão de resposta da banca, quando houver
  origem              origem_conteudo not null,
  created_at          timestamptz not null default now()
);

create table discursivas (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null default auth.uid(),
  tema_id          uuid not null references temas_discursiva(id),
  rubrica_id       text not null references rubricas(id),
  texto            text not null,
  linhas           int  not null check (linhas >= 0),
  tempo_seg        int,
  notas            jsonb,                            -- nota por critério da rubrica
  nota_total       numeric(5,2),
  feedback_md      text,
  escrita_em       timestamptz not null default now(),
  corrigida_em     timestamptz
);

-- =====================================================================
-- 6. IA (modo manual agora; modo API no futuro)
-- =====================================================================
create table ia_solicitacoes (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null default auth.uid(),
  tipo             tipo_solicitacao_ia not null,
  modo             modo_ia not null,
  referencia       jsonb,                            -- ex.: {"subtopico_id": "..."}
  prompt           text not null,
  resposta_bruta   text,
  status           status_solicitacao_ia not null default 'aguardando_resposta',
  created_at       timestamptz not null default now(),
  importada_em     timestamptz
);

-- =====================================================================
-- 7. VISÕES
-- =====================================================================
-- Prioridade de cada assunto = soma(peso_alvo × incidência) nos concursos ativos.
create view v_prioridade_assunto with (security_invoker = true) as
select a.id as assunto_id,
       a.nome,
       a.grupo,
       a.perfil,
       a.fase,
       coalesce(round(sum(c.peso_alvo * i.valor), 3), 0) as prioridade
from assuntos a
left join incidencias i on i.assunto_id = a.id
left join concursos  c on c.id = i.concurso_id and c.ativo
group by a.id, a.nome, a.grupo, a.perfil, a.fase;

-- Desempenho dos últimos 60 dias por assunto.
-- Acerto marcado como 'chute' não conta como domínio (ver docs/04-regras-de-estudo.md).
create view v_desempenho_assunto with (security_invoker = true) as
select r.user_id,
       qa.assunto_id,
       count(*) as respondidas,
       count(*) filter (where r.correta and r.confianca is distinct from 'chute') as acertos_firmes,
       round(
         count(*) filter (where r.correta and r.confianca is distinct from 'chute')::numeric
         / nullif(count(*), 0), 3) as taxa_dominio
from respostas r
join questao_assuntos qa on qa.questao_id = r.questao_id
where r.respondida_em >= now() - interval '60 days'
group by r.user_id, qa.assunto_id;

-- =====================================================================
-- 8. SEGURANÇA (Row Level Security) — ver ADR-005
--    Tabelas pessoais: cada usuário só acessa as próprias linhas.
--    Tabelas de referência e conteúdo: acesso total para usuário autenticado
--    (aceitável enquanto o uso é pessoal).
-- =====================================================================
do $$
declare t text;
begin
  foreach t in array array['materiais','configuracoes','sessoes_estudo','itens_cronograma',
                           'simulados','respostas','cartoes','discursivas','ia_solicitacoes'] loop
    execute format('alter table %I enable row level security', t);
    execute format('create policy %I on %I for all to authenticated
                    using (user_id = auth.uid()) with check (user_id = auth.uid())',
                   'dono_' || t, t);
  end loop;

  foreach t in array array['bancas','rubricas','concursos','assuntos','subtopicos','incidencias',
                           'provas','questoes','questao_assuntos','temas_discursiva'] loop
    execute format('alter table %I enable row level security', t);
    execute format('create policy %I on %I for all to authenticated using (true) with check (true)',
                   'autenticado_' || t, t);
  end loop;
end $$;

-- Tabelas filhas sem user_id: o acesso deriva do registro pai.
alter table simulado_questoes enable row level security;
create policy dono_simulado_questoes on simulado_questoes for all to authenticated
  using (exists (select 1 from simulados s where s.id = simulado_id and s.user_id = auth.uid()))
  with check (exists (select 1 from simulados s where s.id = simulado_id and s.user_id = auth.uid()));

alter table revisoes enable row level security;
create policy dono_revisoes on revisoes for all to authenticated
  using (exists (select 1 from cartoes c where c.id = cartao_id and c.user_id = auth.uid()))
  with check (exists (select 1 from cartoes c where c.id = cartao_id and c.user_id = auth.uid()));
