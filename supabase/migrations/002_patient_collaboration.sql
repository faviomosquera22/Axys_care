do $$
begin
  if not exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where t.typname = 'permission_level' and n.nspname = 'app'
  ) then
    create type app.permission_level as enum ('read', 'edit');
  end if;

  if not exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where t.typname = 'access_status' and n.nspname = 'app'
  ) then
    create type app.access_status as enum ('pending', 'active', 'revoked', 'expired');
  end if;
end
$$;

alter table public.patients add column if not exists created_by uuid references auth.users(id) on delete set null;
alter table public.patients add column if not exists updated_by uuid references auth.users(id) on delete set null;
update public.patients set created_by = coalesce(created_by, owner_user_id), updated_by = coalesce(updated_by, owner_user_id);
alter table public.patients alter column created_by set not null;
alter table public.patients alter column updated_by set not null;

alter table public.appointments add column if not exists created_by uuid references auth.users(id) on delete set null;
alter table public.appointments add column if not exists updated_by uuid references auth.users(id) on delete set null;
update public.appointments set created_by = coalesce(created_by, professional_id, owner_user_id), updated_by = coalesce(updated_by, professional_id, owner_user_id);
alter table public.appointments alter column created_by set not null;
alter table public.appointments alter column updated_by set not null;

alter table public.encounters add column if not exists created_by uuid references auth.users(id) on delete set null;
alter table public.encounters add column if not exists updated_by uuid references auth.users(id) on delete set null;
update public.encounters set created_by = coalesce(created_by, owner_user_id), updated_by = coalesce(updated_by, owner_user_id);
alter table public.encounters alter column created_by set not null;
alter table public.encounters alter column updated_by set not null;

alter table public.vital_signs add column if not exists created_by uuid references auth.users(id) on delete set null;
alter table public.vital_signs add column if not exists updated_by uuid references auth.users(id) on delete set null;
update public.vital_signs set created_by = coalesce(created_by, owner_user_id), updated_by = coalesce(updated_by, owner_user_id);
alter table public.vital_signs alter column created_by set not null;
alter table public.vital_signs alter column updated_by set not null;

alter table public.medical_assessments add column if not exists created_by uuid references auth.users(id) on delete set null;
alter table public.medical_assessments add column if not exists updated_by uuid references auth.users(id) on delete set null;
update public.medical_assessments set created_by = coalesce(created_by, owner_user_id), updated_by = coalesce(updated_by, owner_user_id);
alter table public.medical_assessments alter column created_by set not null;
alter table public.medical_assessments alter column updated_by set not null;

alter table public.nursing_assessments add column if not exists created_by uuid references auth.users(id) on delete set null;
alter table public.nursing_assessments add column if not exists updated_by uuid references auth.users(id) on delete set null;
update public.nursing_assessments set created_by = coalesce(created_by, owner_user_id), updated_by = coalesce(updated_by, owner_user_id);
alter table public.nursing_assessments alter column created_by set not null;
alter table public.nursing_assessments alter column updated_by set not null;

alter table public.clinical_notes add column if not exists created_by uuid references auth.users(id) on delete set null;
alter table public.clinical_notes add column if not exists updated_by uuid references auth.users(id) on delete set null;
update public.clinical_notes set created_by = coalesce(created_by, owner_user_id), updated_by = coalesce(updated_by, owner_user_id);
alter table public.clinical_notes alter column created_by set not null;
alter table public.clinical_notes alter column updated_by set not null;

alter table public.diagnoses add column if not exists created_by uuid references auth.users(id) on delete set null;
alter table public.diagnoses add column if not exists updated_by uuid references auth.users(id) on delete set null;
update public.diagnoses set created_by = coalesce(created_by, owner_user_id), updated_by = coalesce(updated_by, owner_user_id);
alter table public.diagnoses alter column created_by set not null;
alter table public.diagnoses alter column updated_by set not null;

alter table public.procedures add column if not exists created_by uuid references auth.users(id) on delete set null;
alter table public.procedures add column if not exists updated_by uuid references auth.users(id) on delete set null;
update public.procedures set created_by = coalesce(created_by, owner_user_id), updated_by = coalesce(updated_by, owner_user_id);
alter table public.procedures alter column created_by set not null;
alter table public.procedures alter column updated_by set not null;

alter table public.exam_orders add column if not exists created_by uuid references auth.users(id) on delete set null;
alter table public.exam_orders add column if not exists updated_by uuid references auth.users(id) on delete set null;
update public.exam_orders set created_by = coalesce(created_by, owner_user_id), updated_by = coalesce(updated_by, owner_user_id);
alter table public.exam_orders alter column created_by set not null;
alter table public.exam_orders alter column updated_by set not null;

alter table public.exam_results add column if not exists created_by uuid references auth.users(id) on delete set null;
alter table public.exam_results add column if not exists updated_by uuid references auth.users(id) on delete set null;
update public.exam_results set created_by = coalesce(created_by, owner_user_id), updated_by = coalesce(updated_by, owner_user_id);
alter table public.exam_results alter column created_by set not null;
alter table public.exam_results alter column updated_by set not null;

alter table public.attachments add column if not exists created_by uuid references auth.users(id) on delete set null;
alter table public.attachments add column if not exists updated_by uuid references auth.users(id) on delete set null;
update public.attachments set created_by = coalesce(created_by, owner_user_id), updated_by = coalesce(updated_by, owner_user_id);
alter table public.attachments alter column created_by set not null;
alter table public.attachments alter column updated_by set not null;

alter table public.audit_logs add column if not exists performed_by uuid references auth.users(id) on delete set null;
update public.audit_logs set performed_by = coalesce(performed_by, owner_user_id);

create table if not exists public.patient_access (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients(id) on delete cascade,
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  shared_with_user_id uuid not null references auth.users(id) on delete cascade,
  permission_level app.permission_level not null,
  status app.access_status not null default 'pending',
  expires_at timestamptz,
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint patient_access_no_self_share check (owner_user_id <> shared_with_user_id)
);

create table if not exists public.patient_access_audit (
  id uuid primary key default gen_random_uuid(),
  patient_access_id uuid not null references public.patient_access(id) on delete cascade,
  action text not null,
  performed_by uuid not null references auth.users(id) on delete cascade,
  target_user_id uuid references auth.users(id) on delete set null,
  metadata jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.encounter_access (
  id uuid primary key default gen_random_uuid(),
  encounter_id uuid not null references public.encounters(id) on delete cascade,
  patient_id uuid not null references public.patients(id) on delete cascade,
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  shared_with_user_id uuid not null references auth.users(id) on delete cascade,
  permission_level app.permission_level not null,
  status app.access_status not null default 'pending',
  expires_at timestamptz,
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists patient_access_patient_idx on public.patient_access(patient_id, status);
create index if not exists patient_access_shared_user_idx on public.patient_access(shared_with_user_id, status);
create unique index if not exists patient_access_active_unique_idx
on public.patient_access(patient_id, shared_with_user_id)
where status in ('pending', 'active');

create or replace function app.owner_from_patient(target_patient_id uuid)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select p.owner_user_id from public.patients p where p.id = target_patient_id
$$;

create or replace function app.patient_from_encounter(target_encounter_id uuid)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select e.patient_id from public.encounters e where e.id = target_encounter_id
$$;

create or replace function app.encounter_from_exam_order(target_exam_order_id uuid)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select eo.encounter_id from public.exam_orders eo where eo.id = target_exam_order_id
$$;

create or replace function app.has_patient_read_access(target_patient_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.patients p
    where p.id = target_patient_id
      and p.owner_user_id = auth.uid()
  )
  or exists (
    select 1
    from public.patient_access pa
    where pa.patient_id = target_patient_id
      and pa.shared_with_user_id = auth.uid()
      and pa.status = 'active'
      and (pa.expires_at is null or pa.expires_at > timezone('utc', now()))
  )
$$;

create or replace function app.has_patient_edit_access(target_patient_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.patients p
    where p.id = target_patient_id
      and p.owner_user_id = auth.uid()
  )
  or exists (
    select 1
    from public.patient_access pa
    where pa.patient_id = target_patient_id
      and pa.shared_with_user_id = auth.uid()
      and pa.permission_level = 'edit'
      and pa.status = 'active'
      and (pa.expires_at is null or pa.expires_at > timezone('utc', now()))
  )
$$;

create or replace function app.sync_expired_patient_accesses()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  affected_count integer;
begin
  update public.patient_access
  set status = 'expired',
      updated_at = timezone('utc', now())
  where status in ('pending', 'active')
    and expires_at is not null
    and expires_at <= timezone('utc', now());

  get diagnostics affected_count = row_count;
  return affected_count;
end;
$$;

create or replace function app.log_patient_access_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.patient_access_audit (
      patient_access_id,
      action,
      performed_by,
      target_user_id,
      metadata
    )
    values (
      new.id,
      'access_created',
      coalesce(new.created_by, auth.uid()),
      new.shared_with_user_id,
      jsonb_build_object('permission_level', new.permission_level, 'status', new.status)
    );

    if new.status = 'active' then
      insert into public.patient_access_audit (
        patient_access_id,
        action,
        performed_by,
        target_user_id,
        metadata
      )
      values (
        new.id,
        'access_activated',
        coalesce(new.created_by, auth.uid()),
        new.shared_with_user_id,
        jsonb_build_object('permission_level', new.permission_level)
      );
    end if;
  elsif tg_op = 'UPDATE' and old.status is distinct from new.status then
    insert into public.patient_access_audit (
      patient_access_id,
      action,
      performed_by,
      target_user_id,
      metadata
    )
    values (
      new.id,
      case new.status
        when 'active' then 'access_activated'
        when 'revoked' then 'access_revoked'
        when 'expired' then 'access_expired'
        else 'access_status_changed'
      end,
      auth.uid(),
      new.shared_with_user_id,
      jsonb_build_object('from', old.status, 'to', new.status, 'permission_level', new.permission_level)
    );
  end if;

  return coalesce(new, old);
end;
$$;

drop trigger if exists patient_access_set_updated_at on public.patient_access;
create trigger patient_access_set_updated_at
before update on public.patient_access
for each row execute function app.handle_updated_at();

drop trigger if exists patient_access_audit_log on public.patient_access;
create trigger patient_access_audit_log
after insert or update on public.patient_access
for each row execute function app.log_patient_access_change();

create or replace function app.audit_changes()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  payload_new jsonb;
  payload_old jsonb;
  effective_owner uuid;
  patient_id_candidate uuid;
  encounter_id_candidate uuid;
  exam_order_id_candidate uuid;
begin
  payload_new := case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) else null end;
  payload_old := case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) else null end;

  patient_id_candidate := coalesce(
    app.extract_uuid(payload_new, 'patient_id'),
    app.extract_uuid(payload_old, 'patient_id')
  );
  encounter_id_candidate := coalesce(
    app.extract_uuid(payload_new, 'encounter_id'),
    app.extract_uuid(payload_old, 'encounter_id')
  );
  exam_order_id_candidate := coalesce(
    app.extract_uuid(payload_new, 'exam_order_id'),
    app.extract_uuid(payload_old, 'exam_order_id')
  );

  effective_owner := coalesce(
    app.extract_uuid(payload_new, 'owner_user_id'),
    app.extract_uuid(payload_old, 'owner_user_id'),
    app.owner_from_patient(patient_id_candidate),
    app.owner_from_patient(app.patient_from_encounter(encounter_id_candidate)),
    app.owner_from_patient(app.patient_from_encounter(app.encounter_from_exam_order(exam_order_id_candidate))),
    auth.uid()
  );

  insert into public.audit_logs (owner_user_id, performed_by, table_name, record_id, action, old_values, new_values)
  values (
    effective_owner,
    auth.uid(),
    tg_table_name,
    coalesce(app.extract_uuid(payload_new, 'id'), app.extract_uuid(payload_old, 'id')),
    lower(tg_op),
    payload_old,
    payload_new
  );

  return coalesce(new, old);
end;
$$;

create or replace function public.quit_shared_patient_access(access_row_id uuid)
returns public.patient_access
language plpgsql
security definer
set search_path = public
as $$
declare
  updated_row public.patient_access;
begin
  update public.patient_access
  set status = 'revoked',
      updated_at = timezone('utc', now())
  where id = access_row_id
    and shared_with_user_id = auth.uid()
    and status in ('pending', 'active')
  returning * into updated_row;

  if updated_row.id is null then
    raise exception 'No tienes acceso para quitar este paciente de tu lista';
  end if;

  insert into public.patient_access_audit (
    patient_access_id,
    action,
    performed_by,
    target_user_id,
    metadata
  )
  values (
    updated_row.id,
    'access_removed_by_collaborator',
    auth.uid(),
    updated_row.shared_with_user_id,
    jsonb_build_object('status', updated_row.status)
  );

  return updated_row;
end;
$$;

grant execute on function public.quit_shared_patient_access(uuid) to authenticated;
grant execute on function app.sync_expired_patient_accesses() to authenticated;

drop policy if exists "profiles own row" on public.profiles;
drop policy if exists "professional_settings own row" on public.professional_settings;
drop policy if exists "owner rows only patients" on public.patients;
drop policy if exists "owner rows only patient_contacts" on public.patient_contacts;
drop policy if exists "owner rows only appointments" on public.appointments;
drop policy if exists "owner rows only appointment_reminders" on public.appointment_reminders;
drop policy if exists "owner rows only encounters" on public.encounters;
drop policy if exists "owner rows only vital_signs" on public.vital_signs;
drop policy if exists "owner rows only medical_assessments" on public.medical_assessments;
drop policy if exists "owner rows only nursing_assessments" on public.nursing_assessments;
drop policy if exists "owner rows only clinical_notes" on public.clinical_notes;
drop policy if exists "owner rows only diagnoses" on public.diagnoses;
drop policy if exists "owner rows only procedures" on public.procedures;
drop policy if exists "owner rows only exam_orders" on public.exam_orders;
drop policy if exists "owner rows only exam_results" on public.exam_results;
drop policy if exists "owner rows only attachments" on public.attachments;
drop policy if exists "owner rows only care_plans" on public.care_plans;
drop policy if exists "owner rows only care_plan_reviews" on public.care_plan_reviews;
drop policy if exists "owner rows only audit_logs" on public.audit_logs;

create policy "profiles self manage"
on public.profiles
for all
using (id = auth.uid())
with check (id = auth.uid());

create policy "profiles directory read"
on public.profiles
for select
using (auth.role() = 'authenticated');

create policy "professional_settings own row"
on public.professional_settings
for all
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "patients read shared or owner"
on public.patients
for select
using (app.has_patient_read_access(id));

create policy "patients insert owner only"
on public.patients
for insert
with check (owner_user_id = auth.uid() and created_by = auth.uid() and updated_by = auth.uid());

create policy "patients edit shared or owner"
on public.patients
for update
using (app.has_patient_edit_access(id))
with check (app.has_patient_edit_access(id));

create policy "patients delete owner only"
on public.patients
for delete
using (owner_user_id = auth.uid());

create policy "patient_contacts read shared or owner"
on public.patient_contacts
for select
using (app.has_patient_read_access(patient_id));

create policy "patient_contacts edit shared or owner"
on public.patient_contacts
for all
using (app.has_patient_edit_access(patient_id))
with check (app.has_patient_edit_access(patient_id));

create policy "appointments read shared or owner"
on public.appointments
for select
using (app.has_patient_read_access(patient_id));

create policy "appointments insert shared edit or owner"
on public.appointments
for insert
with check (app.has_patient_edit_access(patient_id));

create policy "appointments update shared edit or owner"
on public.appointments
for update
using (app.has_patient_edit_access(patient_id))
with check (app.has_patient_edit_access(patient_id));

create policy "appointments delete owner only"
on public.appointments
for delete
using (owner_user_id = auth.uid());

create policy "appointment_reminders owner only"
on public.appointment_reminders
for all
using (owner_user_id = auth.uid())
with check (owner_user_id = auth.uid());

create policy "encounters read shared or owner"
on public.encounters
for select
using (app.has_patient_read_access(patient_id));

create policy "encounters insert shared edit or owner"
on public.encounters
for insert
with check (app.has_patient_edit_access(patient_id));

create policy "encounters update shared edit or owner"
on public.encounters
for update
using (app.has_patient_edit_access(patient_id))
with check (app.has_patient_edit_access(patient_id));

create policy "encounters delete owner only"
on public.encounters
for delete
using (owner_user_id = auth.uid());

create policy "vital_signs read shared or owner"
on public.vital_signs
for select
using (app.has_patient_read_access(patient_id));

create policy "vital_signs insert shared edit or owner"
on public.vital_signs
for insert
with check (app.has_patient_edit_access(patient_id));

create policy "vital_signs update shared edit or owner"
on public.vital_signs
for update
using (app.has_patient_edit_access(patient_id))
with check (app.has_patient_edit_access(patient_id));

create policy "medical_assessments read shared or owner"
on public.medical_assessments
for select
using (app.has_patient_read_access(app.patient_from_encounter(encounter_id)));

create policy "medical_assessments insert shared edit or owner"
on public.medical_assessments
for insert
with check (app.has_patient_edit_access(app.patient_from_encounter(encounter_id)));

create policy "medical_assessments update shared edit or owner"
on public.medical_assessments
for update
using (app.has_patient_edit_access(app.patient_from_encounter(encounter_id)))
with check (app.has_patient_edit_access(app.patient_from_encounter(encounter_id)));

create policy "nursing_assessments read shared or owner"
on public.nursing_assessments
for select
using (app.has_patient_read_access(app.patient_from_encounter(encounter_id)));

create policy "nursing_assessments insert shared edit or owner"
on public.nursing_assessments
for insert
with check (app.has_patient_edit_access(app.patient_from_encounter(encounter_id)));

create policy "nursing_assessments update shared edit or owner"
on public.nursing_assessments
for update
using (app.has_patient_edit_access(app.patient_from_encounter(encounter_id)))
with check (app.has_patient_edit_access(app.patient_from_encounter(encounter_id)));

create policy "clinical_notes read shared or owner"
on public.clinical_notes
for select
using (app.has_patient_read_access(app.patient_from_encounter(encounter_id)));

create policy "clinical_notes insert shared edit or owner"
on public.clinical_notes
for insert
with check (app.has_patient_edit_access(app.patient_from_encounter(encounter_id)));

create policy "clinical_notes update shared edit or owner"
on public.clinical_notes
for update
using (app.has_patient_edit_access(app.patient_from_encounter(encounter_id)))
with check (app.has_patient_edit_access(app.patient_from_encounter(encounter_id)));

create policy "diagnoses read shared or owner"
on public.diagnoses
for select
using (app.has_patient_read_access(app.patient_from_encounter(encounter_id)));

create policy "diagnoses insert shared edit or owner"
on public.diagnoses
for insert
with check (app.has_patient_edit_access(app.patient_from_encounter(encounter_id)));

create policy "diagnoses update shared edit or owner"
on public.diagnoses
for update
using (app.has_patient_edit_access(app.patient_from_encounter(encounter_id)))
with check (app.has_patient_edit_access(app.patient_from_encounter(encounter_id)));

create policy "procedures read shared or owner"
on public.procedures
for select
using (app.has_patient_read_access(app.patient_from_encounter(encounter_id)));

create policy "procedures insert shared edit or owner"
on public.procedures
for insert
with check (app.has_patient_edit_access(app.patient_from_encounter(encounter_id)));

create policy "procedures update shared edit or owner"
on public.procedures
for update
using (app.has_patient_edit_access(app.patient_from_encounter(encounter_id)))
with check (app.has_patient_edit_access(app.patient_from_encounter(encounter_id)));

create policy "exam_orders read shared or owner"
on public.exam_orders
for select
using (app.has_patient_read_access(app.patient_from_encounter(encounter_id)));

create policy "exam_orders insert shared edit or owner"
on public.exam_orders
for insert
with check (app.has_patient_edit_access(app.patient_from_encounter(encounter_id)));

create policy "exam_orders update shared edit or owner"
on public.exam_orders
for update
using (app.has_patient_edit_access(app.patient_from_encounter(encounter_id)))
with check (app.has_patient_edit_access(app.patient_from_encounter(encounter_id)));

create policy "exam_results read shared or owner"
on public.exam_results
for select
using (app.has_patient_read_access(app.patient_from_encounter(encounter_id)));

create policy "exam_results insert shared edit or owner"
on public.exam_results
for insert
with check (app.has_patient_edit_access(app.patient_from_encounter(encounter_id)));

create policy "exam_results update shared edit or owner"
on public.exam_results
for update
using (app.has_patient_edit_access(app.patient_from_encounter(encounter_id)))
with check (app.has_patient_edit_access(app.patient_from_encounter(encounter_id)));

create policy "attachments read shared or owner"
on public.attachments
for select
using (
  app.has_patient_read_access(
    coalesce(
      patient_id,
      app.patient_from_encounter(encounter_id),
      app.patient_from_encounter(app.encounter_from_exam_order(exam_order_id))
    )
  )
);

create policy "attachments insert shared edit or owner"
on public.attachments
for insert
with check (
  app.has_patient_edit_access(
    coalesce(
      patient_id,
      app.patient_from_encounter(encounter_id),
      app.patient_from_encounter(app.encounter_from_exam_order(exam_order_id))
    )
  )
);

create policy "attachments update shared edit or owner"
on public.attachments
for update
using (
  app.has_patient_edit_access(
    coalesce(
      patient_id,
      app.patient_from_encounter(encounter_id),
      app.patient_from_encounter(app.encounter_from_exam_order(exam_order_id))
    )
  )
)
with check (
  app.has_patient_edit_access(
    coalesce(
      patient_id,
      app.patient_from_encounter(encounter_id),
      app.patient_from_encounter(app.encounter_from_exam_order(exam_order_id))
    )
  )
);

create policy "care_plans read shared or owner"
on public.care_plans
for select
using (app.has_patient_read_access(app.patient_from_encounter(encounter_id)));

create policy "care_plans edit shared or owner"
on public.care_plans
for all
using (app.has_patient_edit_access(app.patient_from_encounter(encounter_id)))
with check (app.has_patient_edit_access(app.patient_from_encounter(encounter_id)));

create policy "care_plan_reviews read shared or owner"
on public.care_plan_reviews
for select
using (
  exists (
    select 1
    from public.care_plans cp
    where cp.id = care_plan_id
      and app.has_patient_read_access(app.patient_from_encounter(cp.encounter_id))
  )
);

create policy "care_plan_reviews edit shared or owner"
on public.care_plan_reviews
for all
using (
  exists (
    select 1
    from public.care_plans cp
    where cp.id = care_plan_id
      and app.has_patient_edit_access(app.patient_from_encounter(cp.encounter_id))
  )
)
with check (
  exists (
    select 1
    from public.care_plans cp
    where cp.id = care_plan_id
      and app.has_patient_edit_access(app.patient_from_encounter(cp.encounter_id))
  )
);

create policy "audit_logs owner or actor"
on public.audit_logs
for select
using (owner_user_id = auth.uid() or performed_by = auth.uid());

alter table public.patient_access enable row level security;
alter table public.patient_access_audit enable row level security;
alter table public.encounter_access enable row level security;

create policy "patient_access owner or collaborator read"
on public.patient_access
for select
using (owner_user_id = auth.uid() or shared_with_user_id = auth.uid());

create policy "patient_access owner insert"
on public.patient_access
for insert
with check (
  owner_user_id = auth.uid()
  and created_by = auth.uid()
  and shared_with_user_id <> auth.uid()
  and exists (
    select 1 from public.patients p
    where p.id = patient_id
      and p.owner_user_id = auth.uid()
  )
);

create policy "patient_access owner update"
on public.patient_access
for update
using (owner_user_id = auth.uid())
with check (owner_user_id = auth.uid());

create policy "patient_access owner delete"
on public.patient_access
for delete
using (owner_user_id = auth.uid());

create policy "patient_access_audit owner or collaborator read"
on public.patient_access_audit
for select
using (
  exists (
    select 1
    from public.patient_access pa
    where pa.id = patient_access_id
      and (pa.owner_user_id = auth.uid() or pa.shared_with_user_id = auth.uid())
  )
);

create policy "encounter_access owner read"
on public.encounter_access
for select
using (owner_user_id = auth.uid() or shared_with_user_id = auth.uid());

do $$
begin
  alter publication supabase_realtime add table
    public.patients,
    public.patient_access,
    public.appointments,
    public.encounters,
    public.vital_signs,
    public.medical_assessments,
    public.nursing_assessments,
    public.diagnoses,
    public.procedures,
    public.exam_orders,
    public.exam_results,
    public.clinical_notes,
    public.attachments;
exception
  when duplicate_object then
    null;
end $$;
