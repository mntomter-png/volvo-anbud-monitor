-- ───────────────────────────────────────────────────────────────────────────
-- Anbud-monitor · Volvo Norge – databaseskjema (referanse)
--
-- MERK: Kilde til sannhet er filene i supabase/migrations/.
-- Kjør migrasjoner med: npm run db:migrate -- supabase/migrations/<fil>.sql
-- ───────────────────────────────────────────────────────────────────────────

-- tenders: offentlige anbud fra Doffin (se 20260626000000_init_tenders.sql)
-- Pipeline-felter: 20260627100000_pipeline_fields.sql
-- Tildelinger: 20260627200000_award_contracts.sql

-- profiles + auth RLS: 20260701000000_profiles_auth.sql
-- Sikkerhetsforsterkning (rolle-trigger, app_settings RLS): 20260709100000_security_hardening.sql

-- RLS-oppsummering etter alle migrasjoner:
--
-- tenders:
--   SELECT / UPDATE: authenticated (alle innloggede brukere)
--   INSERT / DELETE: kun service role (cron/sync)
--
-- profiles:
--   SELECT: egen rad eller admin
--   UPDATE: egen rad eller admin (rolleendring blokkeres for ikke-admins via trigger)
--
-- app_settings:
--   RLS aktivert, ingen policies – kun service role har tilgang

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

alter table public.tenders enable row level security;

-- Lesing og oppdatering krever innlogging (ikke anon).
-- Se migrasjoner for gjeldende policies.
