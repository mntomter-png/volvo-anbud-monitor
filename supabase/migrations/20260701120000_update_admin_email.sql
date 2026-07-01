-- Oppdater standard admin-e-post for nye registreringer.
update public.app_settings
set value = 'martin.tomter@volvo.com'
where key = 'initial_admin_email';

insert into public.app_settings (key, value)
values ('initial_admin_email', 'martin.tomter@volvo.com')
on conflict (key) do update set value = excluded.value;
