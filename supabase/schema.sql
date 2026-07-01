-- ───────────────────────────────────────────────────────────────────────────
-- Anbud-monitor · Volvo Norge – databaseskjema for Supabase/PostgreSQL
-- Kjør dette i Supabase SQL Editor (eller via `supabase db push`).
-- ───────────────────────────────────────────────────────────────────────────

create table if not exists public.tenders (
  id              uuid primary key default gen_random_uuid(),
  doffin_id       text not null unique,
  title           text,
  buyer           text,
  region          text,
  published_at    timestamptz,
  deadline        timestamptz,
  estimated_value numeric,
  url             text,
  raw_data        jsonb,
  tender_type     text not null default 'unknown'
    check (tender_type in ('direct_purchase', 'transport_service', 'service_parts', 'unknown')),
  is_electric     boolean not null default false,
  pipeline_status text not null default 'new'
    check (pipeline_status in (
      'new', 'reviewing', 'pursuing', 'bid_submitted', 'won', 'lost', 'not_relevant'
    )),
  assignee        text,
  notice_kind     text not null default 'competition'
    check (notice_kind in ('competition', 'award')),
  winner_name     text,
  contract_duration_months integer,
  contract_end_date timestamptz,
  created_at      timestamptz not null default now()
);

-- Indekser for raske filtre/sortering i dashbordet.
create index if not exists tenders_region_idx       on public.tenders (region);
create index if not exists tenders_published_at_idx  on public.tenders (published_at desc);
create index if not exists tenders_deadline_idx      on public.tenders (deadline);
create index if not exists tenders_created_at_idx    on public.tenders (created_at desc);
create index if not exists tenders_tender_type_idx   on public.tenders (tender_type);
create index if not exists tenders_pipeline_status_idx on public.tenders (pipeline_status);
create index if not exists tenders_is_electric_idx   on public.tenders (is_electric);
create index if not exists tenders_assignee_idx      on public.tenders (assignee);
create index if not exists tenders_notice_kind_idx   on public.tenders (notice_kind);
create index if not exists tenders_contract_end_date_idx on public.tenders (contract_end_date);

-- Row Level Security
alter table public.tenders enable row level security;

-- Lesetilgang for anon (dashbordet leser med anon-nøkkelen).
drop policy if exists "tenders_read_anon" on public.tenders;
create policy "tenders_read_anon"
  on public.tenders
  for select
  to anon, authenticated
  using (true);

-- MERK: Skriving (insert/upsert) gjøres fra server med SUPABASE_SERVICE_ROLE_KEY,
-- som omgår RLS. Hvis du heller vil skrive med anon-nøkkelen, legg til en
-- insert-policy under (mindre sikkert – anbefales ikke i produksjon):
--
-- create policy "tenders_insert_anon"
--   on public.tenders
--   for insert
--   to anon
--   with check (true);
