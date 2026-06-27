-- Utvid tenders med KAM/Fleet Sales-felter: type, el-flagg, pipeline-status, ansvarlig.

alter table public.tenders
  add column if not exists tender_type text not null default 'unknown'
    check (tender_type in ('direct_purchase', 'transport_service', 'service_parts', 'unknown')),
  add column if not exists is_electric boolean not null default false,
  add column if not exists pipeline_status text not null default 'new'
    check (pipeline_status in (
      'new', 'reviewing', 'pursuing', 'bid_submitted', 'won', 'lost', 'not_relevant'
    )),
  add column if not exists assignee text;

create index if not exists tenders_tender_type_idx on public.tenders (tender_type);
create index if not exists tenders_pipeline_status_idx on public.tenders (pipeline_status);
create index if not exists tenders_is_electric_idx on public.tenders (is_electric);
create index if not exists tenders_assignee_idx on public.tenders (assignee);
