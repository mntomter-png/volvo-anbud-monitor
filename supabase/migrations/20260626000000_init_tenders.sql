-- Anbud-monitor · Volvo Norge – tenders-tabell
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
  created_at      timestamptz not null default now()
);

create index if not exists tenders_region_idx on public.tenders (region);
create index if not exists tenders_published_at_idx on public.tenders (published_at desc);
create index if not exists tenders_deadline_idx on public.tenders (deadline);
create index if not exists tenders_created_at_idx on public.tenders (created_at desc);

alter table public.tenders enable row level security;

drop policy if exists "tenders_read_anon" on public.tenders;
create policy "tenders_read_anon"
  on public.tenders
  for select
  to anon, authenticated
  using (true);
