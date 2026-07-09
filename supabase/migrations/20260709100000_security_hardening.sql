-- Sikkerhetsforsterkning: hindre rolle-eskalering, lås app_settings, tryggere bootstrap.

-- Blokker at ikke-admins endrer egen eller andres rolle via Supabase-klient.
create or replace function public.protect_profile_role()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role is distinct from old.role and not public.is_admin() then
    raise exception 'Kun administratorer kan endre brukerroller';
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_protect_role on public.profiles;
create trigger profiles_protect_role
  before update on public.profiles
  for each row execute function public.protect_profile_role();

-- Kun første admin kan auto-promoteres fra initial_admin_email (unngår race ved åpen signup).
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

  if initial_admin is not null
     and lower(new.email) = lower(initial_admin)
     and not exists (select 1 from public.profiles where role = 'admin') then
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

-- app_settings inneholder initial_admin_email – skal ikke være lesbar for klienter.
alter table public.app_settings enable row level security;
