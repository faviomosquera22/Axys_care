create extension if not exists "pgcrypto";

create schema if not exists app;

create type app.user_role as enum ('admin', 'medico', 'enfermeria', 'profesional_mixto');
create type app.appointment_status as enum ('programada', 'confirmada', 'atendida', 'cancelada', 'no_asistio');
create type app.appointment_type as enum (
  'presencial',
  'teleconsulta',
  'control',
  'procedimiento',
  'curacion',
  'valoracion_enfermeria',
  'visita_domiciliaria'
);
create type app.appointment_modality as enum ('presencial', 'virtual', 'domicilio');
create type app.encounter_kind as enum ('medical', 'nursing', 'mixed');
create type app.encounter_status as enum ('open', 'closed');
create type app.exam_category as enum ('laboratorio', 'imagen', 'estudio_especial');
create type app.exam_status as enum ('pendiente', 'recibido', 'revisado');
create type app.attachment_category as enum (
  'pdf',
  'imagen',
  'resultado',
  'documento_escaneado',
  'firma_profesional',
  'firma_paciente'
);

create or replace function app.handle_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create or replace function app.extract_uuid(payload jsonb, key_name text)
returns uuid
language sql
stable
as $$
  select case
    when payload ? key_name and payload ->> key_name <> '' then (payload ->> key_name)::uuid
    else null
  end;
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role app.user_role not null default 'medico',
  first_name text not null,
  last_name text not null,
  profession text not null,
  specialty text,
  professional_license text not null,
  phone text,
  email text not null,
  professional_address text,
  city text,
  signature_url text,
  seal_url text,
  logo_url text,
  avatar_url text,
  short_bio text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.professional_settings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  working_hours jsonb not null default '{}'::jsonb,
  default_appointment_minutes integer not null default 30,
  buffer_minutes integer not null default 0,
  calendar_colors jsonb not null default '{"confirmed":"#0f766e","pending":"#b45309","teleconsultation":"#1d4ed8","nursing":"#7c3aed"}'::jsonb,
  print_preferences jsonb not null default '{"showLicense":true,"showAddress":true,"showPhone":true}'::jsonb,
  letterhead_format jsonb not null default '{"title":"Axyscare","subtitle":"Atención clínica"}'::jsonb,
  signature_footer text,
  google_calendar_connected boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.patients (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  first_name text not null,
  last_name text not null,
  document_type text not null,
  document_number text not null,
  birth_date date not null,
  sex text not null,
  gender text,
  marital_status text,
  occupation text,
  address text,
  phone text,
  email text,
  emergency_contact jsonb,
  blood_type text,
  allergies text[] not null default '{}',
  relevant_history text,
  insurance text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.patient_contacts (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients(id) on delete cascade,
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  relation text,
  phone text,
  is_primary boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.appointments (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  professional_id uuid not null references auth.users(id) on delete cascade,
  patient_id uuid not null references public.patients(id) on delete cascade,
  start_at timestamptz not null,
  end_at timestamptz not null,
  reason text not null,
  type app.appointment_type not null,
  modality app.appointment_modality not null default 'presencial',
  status app.appointment_status not null default 'programada',
  notes text,
  meet_link text,
  google_calendar_event_id text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint appointments_end_after_start check (end_at > start_at)
);

create table if not exists public.appointment_reminders (
  id uuid primary key default gen_random_uuid(),
  appointment_id uuid not null references public.appointments(id) on delete cascade,
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  channel text not null,
  scheduled_for timestamptz not null,
  sent_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.encounters (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  patient_id uuid not null references public.patients(id) on delete cascade,
  appointment_id uuid references public.appointments(id) on delete set null,
  encounter_type app.encounter_kind not null,
  status app.encounter_status not null default 'open',
  started_at timestamptz not null default timezone('utc', now()),
  ended_at timestamptz,
  chief_complaint text,
  summary text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.vital_signs (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  encounter_id uuid not null unique references public.encounters(id) on delete cascade,
  patient_id uuid not null references public.patients(id) on delete cascade,
  recorded_at timestamptz not null default timezone('utc', now()),
  temperature_c numeric(4,1),
  heart_rate integer,
  respiratory_rate integer,
  systolic integer,
  diastolic integer,
  oxygen_saturation integer,
  glucose numeric(6,2),
  pain_scale integer,
  weight_kg numeric(5,2),
  height_cm numeric(5,2),
  bmi numeric(5,2),
  mean_arterial_pressure numeric(5,2),
  notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.medical_assessments (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  encounter_id uuid not null unique references public.encounters(id) on delete cascade,
  chief_complaint text not null,
  current_illness text not null,
  systems_review text,
  background text,
  physical_exam text,
  diagnostic_impression text,
  therapeutic_plan text,
  indications text,
  follow_up text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.nursing_assessments (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  encounter_id uuid not null unique references public.encounters(id) on delete cascade,
  care_reason text not null,
  pain_notes text,
  consciousness text,
  mobility text,
  skin_and_mucosa text,
  elimination text,
  nutrition_hydration text,
  devices text,
  risks text,
  observations text,
  suggestion_ids text[] not null default '{}',
  selected_diagnoses text[] not null default '{}',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.clinical_notes (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  encounter_id uuid not null references public.encounters(id) on delete cascade,
  note_kind text not null,
  content text not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.diagnosis_catalog_icd10 (
  code text primary key,
  label text not null,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.diagnoses (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  encounter_id uuid not null references public.encounters(id) on delete cascade,
  source text not null,
  code text references public.diagnosis_catalog_icd10(code) on delete set null,
  label text not null,
  is_primary boolean not null default false,
  notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.procedure_catalog (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  category text,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.procedures (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  encounter_id uuid not null references public.encounters(id) on delete cascade,
  catalog_id uuid references public.procedure_catalog(id) on delete set null,
  name text not null,
  performed_at timestamptz not null,
  responsible_professional text,
  materials jsonb not null default '[]'::jsonb,
  result text,
  notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.exam_orders (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  encounter_id uuid not null references public.encounters(id) on delete cascade,
  category app.exam_category not null,
  exam_name text not null,
  instructions text,
  status app.exam_status not null default 'pendiente',
  ordered_at timestamptz not null default timezone('utc', now()),
  reviewed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.exam_results (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  exam_order_id uuid not null references public.exam_orders(id) on delete cascade,
  encounter_id uuid not null references public.encounters(id) on delete cascade,
  result_summary text,
  interpretation text,
  status app.exam_status not null default 'recibido',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.attachments (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  patient_id uuid references public.patients(id) on delete set null,
  encounter_id uuid references public.encounters(id) on delete set null,
  exam_order_id uuid references public.exam_orders(id) on delete set null,
  storage_bucket text not null,
  storage_path text not null,
  file_name text not null,
  mime_type text not null,
  category app.attachment_category not null,
  uploaded_at timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.care_plans (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  encounter_id uuid not null references public.encounters(id) on delete cascade,
  diagnosis text not null,
  related_factors jsonb not null default '[]'::jsonb,
  observed_characteristics jsonb not null default '[]'::jsonb,
  expected_outcomes jsonb not null default '[]'::jsonb,
  interventions jsonb not null default '[]'::jsonb,
  activities jsonb not null default '[]'::jsonb,
  reevaluation_date timestamptz,
  evolution text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.care_plan_reviews (
  id uuid primary key default gen_random_uuid(),
  care_plan_id uuid not null references public.care_plans(id) on delete cascade,
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  review_notes text not null,
  reviewed_at timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid references auth.users(id) on delete set null,
  table_name text not null,
  record_id uuid,
  action text not null,
  old_values jsonb,
  new_values jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists patients_owner_idx on public.patients(owner_user_id, created_at desc);
create index if not exists patients_document_idx on public.patients(document_number);
create index if not exists appointments_owner_start_idx on public.appointments(owner_user_id, start_at);
create index if not exists encounters_owner_patient_idx on public.encounters(owner_user_id, patient_id, started_at desc);
create index if not exists diagnoses_encounter_idx on public.diagnoses(encounter_id);
create index if not exists procedures_encounter_idx on public.procedures(encounter_id);
create index if not exists exam_orders_encounter_idx on public.exam_orders(encounter_id);
create index if not exists attachments_owner_patient_idx on public.attachments(owner_user_id, patient_id);

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
begin
  payload_new := case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) else null end;
  payload_old := case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) else null end;

  effective_owner := coalesce(
    app.extract_uuid(payload_new, 'owner_user_id'),
    app.extract_uuid(payload_new, 'user_id'),
    app.extract_uuid(payload_new, 'professional_id'),
    app.extract_uuid(payload_new, 'id'),
    app.extract_uuid(payload_old, 'owner_user_id'),
    app.extract_uuid(payload_old, 'user_id'),
    app.extract_uuid(payload_old, 'professional_id'),
    app.extract_uuid(payload_old, 'id'),
    auth.uid()
  );

  insert into public.audit_logs (owner_user_id, table_name, record_id, action, old_values, new_values)
  values (
    effective_owner,
    tg_table_name,
    coalesce(app.extract_uuid(payload_new, 'id'), app.extract_uuid(payload_old, 'id')),
    lower(tg_op),
    payload_old,
    payload_new
  );

  return coalesce(new, old);
end;
$$;

create or replace function app.enable_audit_for(table_name text)
returns void
language plpgsql
as $$
begin
  execute format('drop trigger if exists %I_audit_trigger on public.%I', table_name, table_name);
  execute format(
    'create trigger %I_audit_trigger after insert or update or delete on public.%I for each row execute function app.audit_changes()',
    table_name,
    table_name
  );
end;
$$;

do $$
declare
  target text;
begin
  foreach target in array array[
    'profiles',
    'professional_settings',
    'patients',
    'patient_contacts',
    'appointments',
    'appointment_reminders',
    'encounters',
    'vital_signs',
    'medical_assessments',
    'nursing_assessments',
    'clinical_notes',
    'diagnoses',
    'procedures',
    'exam_orders',
    'exam_results',
    'attachments',
    'care_plans',
    'care_plan_reviews'
  ]
  loop
    perform app.enable_audit_for(target);
  end loop;
end $$;

do $$
declare
  target text;
begin
  foreach target in array array[
    'profiles',
    'professional_settings',
    'patients',
    'patient_contacts',
    'appointments',
    'appointment_reminders',
    'encounters',
    'vital_signs',
    'medical_assessments',
    'nursing_assessments',
    'clinical_notes',
    'diagnoses',
    'procedures',
    'exam_orders',
    'exam_results',
    'attachments',
    'care_plans',
    'care_plan_reviews'
  ]
  loop
    execute format('drop trigger if exists %I_set_updated_at on public.%I', target, target);
    execute format(
      'create trigger %I_set_updated_at before update on public.%I for each row execute function app.handle_updated_at()',
      target,
      target
    );
  end loop;
end $$;

alter table public.profiles enable row level security;
alter table public.professional_settings enable row level security;
alter table public.patients enable row level security;
alter table public.patient_contacts enable row level security;
alter table public.appointments enable row level security;
alter table public.appointment_reminders enable row level security;
alter table public.encounters enable row level security;
alter table public.vital_signs enable row level security;
alter table public.medical_assessments enable row level security;
alter table public.nursing_assessments enable row level security;
alter table public.clinical_notes enable row level security;
alter table public.diagnoses enable row level security;
alter table public.procedures enable row level security;
alter table public.exam_orders enable row level security;
alter table public.exam_results enable row level security;
alter table public.attachments enable row level security;
alter table public.care_plans enable row level security;
alter table public.care_plan_reviews enable row level security;
alter table public.audit_logs enable row level security;

create policy "profiles own row"
on public.profiles
for all
using (id = auth.uid())
with check (id = auth.uid());

create policy "professional_settings own row"
on public.professional_settings
for all
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "owner rows only patients"
on public.patients
for all
using (owner_user_id = auth.uid())
with check (owner_user_id = auth.uid());

create policy "owner rows only patient_contacts"
on public.patient_contacts
for all
using (owner_user_id = auth.uid())
with check (owner_user_id = auth.uid());

create policy "owner rows only appointments"
on public.appointments
for all
using (owner_user_id = auth.uid())
with check (owner_user_id = auth.uid() and professional_id = auth.uid());

create policy "owner rows only appointment_reminders"
on public.appointment_reminders
for all
using (owner_user_id = auth.uid())
with check (owner_user_id = auth.uid());

create policy "owner rows only encounters"
on public.encounters
for all
using (owner_user_id = auth.uid())
with check (owner_user_id = auth.uid());

create policy "owner rows only vital_signs"
on public.vital_signs
for all
using (owner_user_id = auth.uid())
with check (owner_user_id = auth.uid());

create policy "owner rows only medical_assessments"
on public.medical_assessments
for all
using (owner_user_id = auth.uid())
with check (owner_user_id = auth.uid());

create policy "owner rows only nursing_assessments"
on public.nursing_assessments
for all
using (owner_user_id = auth.uid())
with check (owner_user_id = auth.uid());

create policy "owner rows only clinical_notes"
on public.clinical_notes
for all
using (owner_user_id = auth.uid())
with check (owner_user_id = auth.uid());

create policy "owner rows only diagnoses"
on public.diagnoses
for all
using (owner_user_id = auth.uid())
with check (owner_user_id = auth.uid());

create policy "owner rows only procedures"
on public.procedures
for all
using (owner_user_id = auth.uid())
with check (owner_user_id = auth.uid());

create policy "owner rows only exam_orders"
on public.exam_orders
for all
using (owner_user_id = auth.uid())
with check (owner_user_id = auth.uid());

create policy "owner rows only exam_results"
on public.exam_results
for all
using (owner_user_id = auth.uid())
with check (owner_user_id = auth.uid());

create policy "owner rows only attachments"
on public.attachments
for all
using (owner_user_id = auth.uid())
with check (owner_user_id = auth.uid());

create policy "owner rows only care_plans"
on public.care_plans
for all
using (owner_user_id = auth.uid())
with check (owner_user_id = auth.uid());

create policy "owner rows only care_plan_reviews"
on public.care_plan_reviews
for all
using (owner_user_id = auth.uid())
with check (owner_user_id = auth.uid());

create policy "owner rows only audit_logs"
on public.audit_logs
for select
using (owner_user_id = auth.uid());

