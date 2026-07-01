-- Profiler, roller og RLS for Supabase Auth.

create table if not exists public.app_settings (
  key   text primary key,
  value text not null
);

insert into public.app_settings (key, value)
values ('initial_admin_email', 'anbud@biloversikt.com')
on conflict (key) do nothing;

create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  email       text not null,
  full_name   text,
  role        text not null default 'user'
    check (role in ('user', 'admin')),
  invited_by  uuid references auth.users (id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists profiles_email_idx on public.profiles (email);
create index if not exists profiles_role_idx on public.profiles (role);

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  initial_admin text;
  assigned_role text := 'user';
begin
  select value into initial_admin
  from public.app_settings
  where key = 'initial_admin_email';

  if initial_admin is not null and lower(new.email) = lower(initial_admin) then
    assigned_role := 'admin';
  end if;

  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data->>'full_name', split_part(coalesce(new.email, ''), '@', 1)),
    assigned_role
  );

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.set_profiles_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_updated_at on public.profiles;
create trigger profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_profiles_updated_at();

alter table public.profiles enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
  on public.profiles for select
  to authenticated
  using (id = auth.uid() or public.is_admin());

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
  on public.profiles for update
  to authenticated
  using (id = auth.uid() or public.is_admin())
  with check (id = auth.uid() or public.is_admin());

-- Strammere RLS på tenders: kun innloggede brukere leser/oppdaterer.
drop policy if exists "tenders_read_anon" on public.tenders;

drop policy if exists "tenders_select_authenticated" on public.tenders;
create policy "tenders_select_authenticated"
  on public.tenders for select
  to authenticated
  using (true);

drop policy if exists "tenders_update_authenticated" on public.tenders;
create policy "tenders_update_authenticated"
  on public.tenders for update
  to authenticated
  using (true)
  with check (true);
