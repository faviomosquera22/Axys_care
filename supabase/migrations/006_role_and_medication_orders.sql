alter type app.user_role add value if not exists 'psicologo';

create table if not exists public.medication_orders (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  encounter_id uuid not null references public.encounters(id) on delete cascade,
  medication_name text not null,
  presentation text,
  dosage text,
  route text,
  frequency text,
  duration text,
  instructions text,
  prescriber_role app.user_role not null,
  created_by uuid not null references auth.users(id) on delete set null,
  updated_by uuid not null references auth.users(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists medication_orders_encounter_idx on public.medication_orders (encounter_id);

alter table public.medication_orders enable row level security;

drop trigger if exists medication_orders_set_updated_at on public.medication_orders;
create trigger medication_orders_set_updated_at
before update on public.medication_orders
for each row execute function app.handle_updated_at();

drop policy if exists "medication_orders read shared or owner" on public.medication_orders;
drop policy if exists "medication_orders insert shared edit or owner" on public.medication_orders;
drop policy if exists "medication_orders update shared edit or owner" on public.medication_orders;

create policy "medication_orders read shared or owner"
on public.medication_orders
for select
using (app.has_patient_read_access(app.patient_from_encounter(encounter_id)));

create policy "medication_orders insert shared edit or owner"
on public.medication_orders
for insert
with check (app.has_patient_edit_access(app.patient_from_encounter(encounter_id)));

create policy "medication_orders update shared edit or owner"
on public.medication_orders
for update
using (app.has_patient_edit_access(app.patient_from_encounter(encounter_id)))
with check (app.has_patient_edit_access(app.patient_from_encounter(encounter_id)));
