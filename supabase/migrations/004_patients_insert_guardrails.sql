create or replace function app.handle_patient_traceability()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  actor_id uuid;
begin
  actor_id := auth.uid();

  if actor_id is null then
    raise exception 'No authenticated user found for patient write';
  end if;

  if tg_op = 'INSERT' then
    new.owner_user_id := coalesce(new.owner_user_id, actor_id);
    new.created_by := coalesce(new.created_by, actor_id);
    new.updated_by := coalesce(new.updated_by, actor_id);
  else
    new.owner_user_id := old.owner_user_id;
    new.created_by := old.created_by;
    new.updated_by := actor_id;
  end if;

  return new;
end;
$$;

drop trigger if exists patients_set_traceability on public.patients;
create trigger patients_set_traceability
before insert or update on public.patients
for each row execute function app.handle_patient_traceability();

drop policy if exists "patients insert owner only" on public.patients;
create policy "patients insert owner only"
on public.patients
for insert
with check (owner_user_id = auth.uid());
