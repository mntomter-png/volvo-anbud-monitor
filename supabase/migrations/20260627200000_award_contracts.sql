-- Tildelingskunngjøringer: vinner, kontraktsvarighet og estimert utløp.

alter table public.tenders
  add column if not exists notice_kind text not null default 'competition'
    check (notice_kind in ('competition', 'award')),
  add column if not exists winner_name text,
  add column if not exists contract_duration_months integer,
  add column if not exists contract_end_date timestamptz;

create index if not exists tenders_notice_kind_idx on public.tenders (notice_kind);
create index if not exists tenders_contract_end_date_idx on public.tenders (contract_end_date);
