create or replace function app.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  email_value text;
  default_first_name text;
  default_last_name text;
begin
  email_value := coalesce(new.email, '');
  default_first_name := coalesce(nullif(new.raw_user_meta_data ->> 'first_name', ''), split_part(email_value, '@', 1), 'Profesional');
  default_last_name := coalesce(nullif(new.raw_user_meta_data ->> 'last_name', ''), 'Pendiente');

  insert into public.profiles (
    id,
    role,
    first_name,
    last_name,
    profession,
    specialty,
    professional_license,
    phone,
    email
  )
  values (
    new.id,
    'medico',
    default_first_name,
    default_last_name,
    coalesce(nullif(new.raw_user_meta_data ->> 'profession', ''), 'Profesional'),
    nullif(new.raw_user_meta_data ->> 'specialty', ''),
    coalesce(nullif(new.raw_user_meta_data ->> 'professional_license', ''), 'PENDIENTE'),
    nullif(new.raw_user_meta_data ->> 'phone', ''),
    email_value
  )
  on conflict (id) do update
  set email = excluded.email;

  insert into public.professional_settings (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function app.handle_new_auth_user();

insert into public.profiles (
  id,
  role,
  first_name,
  last_name,
  profession,
  specialty,
  professional_license,
  phone,
  email
)
select
  u.id,
  'medico'::app.user_role,
  coalesce(nullif(u.raw_user_meta_data ->> 'first_name', ''), split_part(coalesce(u.email, ''), '@', 1), 'Profesional'),
  coalesce(nullif(u.raw_user_meta_data ->> 'last_name', ''), 'Pendiente'),
  coalesce(nullif(u.raw_user_meta_data ->> 'profession', ''), 'Profesional'),
  nullif(u.raw_user_meta_data ->> 'specialty', ''),
  coalesce(nullif(u.raw_user_meta_data ->> 'professional_license', ''), 'PENDIENTE'),
  nullif(u.raw_user_meta_data ->> 'phone', ''),
  coalesce(u.email, '')
from auth.users u
left join public.profiles p on p.id = u.id
where p.id is null;

insert into public.professional_settings (user_id)
select u.id
from auth.users u
left join public.professional_settings ps on ps.user_id = u.id
where ps.user_id is null;
