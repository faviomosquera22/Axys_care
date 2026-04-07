import { calculateBMI, calculateMAP } from "@axyscare/core-clinical";
import type {
  Attachment,
  Appointment,
  ClinicalNote,
  DashboardSnapshot,
  Diagnosis,
  Encounter,
  ExamOrder,
  ExamResult,
  MedicationOrder,
  MedicalAssessment,
  NursingAssessment,
  Patient,
  PatientAccess,
  PatientAccessAudit,
  PermissionLevel,
  ProfessionalDirectoryEntry,
  Procedure,
  Profile,
  ProfessionalSettings,
  VitalSigns,
} from "@axyscare/core-types";
import type {
  AppointmentInput,
  EncounterInput,
  MedicalAssessmentInput,
  MedicationOrderInput,
  NursingAssessmentInput,
  PatientInput,
  PatientShareInput,
  ProfessionalProfileInput,
  VitalSignsInput,
} from "@axyscare/core-validation";
import { createBrowserClient, createServerClient } from "@supabase/ssr";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export type Database = Record<string, never>;

export function getSupabaseUrl() {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_URL ??
    process.env.EXPO_PUBLIC_SUPABASE_URL ??
    "https://example.supabase.co"
  );
}

export function getSupabaseAnonKey() {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ??
    process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    "demo-anon-key"
  );
}

export function isSupabaseConfigured() {
  return !getSupabaseUrl().includes("example.supabase.co") && getSupabaseAnonKey() !== "demo-anon-key";
}

export const patientRealtimeTables = [
  "patients",
  "patient_access",
  "appointments",
  "encounters",
  "vital_signs",
  "medical_assessments",
  "nursing_assessments",
  "diagnoses",
  "procedures",
  "exam_orders",
  "exam_results",
  "clinical_notes",
  "attachments",
  "medication_orders",
] as const;

let browserClient: SupabaseClient | null = null;

export function createWebBrowserClient() {
  if (!browserClient) {
    browserClient = createBrowserClient(getSupabaseUrl(), getSupabaseAnonKey());
  }
  return browserClient;
}

export function createServiceClient(serviceRoleKey: string) {
  return createClient(getSupabaseUrl(), serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export function createNextServerSupabaseClient(cookieStore: {
  getAll(): { name: string; value: string }[];
  setAll(cookies: { name: string; value: string; options?: Record<string, unknown> }[]): void;
}) {
  return createServerClient(getSupabaseUrl(), getSupabaseAnonKey(), {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookies) {
        cookieStore.setAll(cookies);
      },
    },
  });
}

export function createMobileSupabaseClient(storage: {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}) {
  return createClient(getSupabaseUrl(), getSupabaseAnonKey(), {
    auth: {
      storage: {
        getItem: async (key) => storage.getItem(key),
        setItem: async (key, value) => storage.setItem(key, value),
        removeItem: async (key) => storage.removeItem(key),
      },
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  });
}

async function unwrap<T>(promise: PromiseLike<{ data: T; error: { message: string } | null }>) {
  const { data, error } = await promise;
  if (error) throw new Error(error.message);
  return data;
}

export async function getCurrentUserId(client: SupabaseClient) {
  const {
    data: { user },
    error,
  } = await client.auth.getUser();
  if (error) throw new Error(error.message);
  return user?.id ?? null;
}

async function getPatientContext(client: SupabaseClient, patientId: string) {
  const row = (await unwrap(
    client.from("patients").select("id, owner_user_id, first_name, last_name").eq("id", patientId).single(),
  )) as any;
  return {
    id: row.id as string,
    ownerUserId: row.owner_user_id as string,
    patientName: `${row.first_name} ${row.last_name}`.trim(),
  };
}

async function getEncounterContext(client: SupabaseClient, encounterId: string) {
  const row = (await unwrap(
    client.from("encounters").select("id, patient_id, owner_user_id").eq("id", encounterId).single(),
  )) as any;
  return {
    id: row.id as string,
    patientId: row.patient_id as string,
    ownerUserId: row.owner_user_id as string,
  };
}

async function getProfilesMap(client: SupabaseClient, userIds: string[]) {
  const uniqueIds = [...new Set(userIds.filter(Boolean))];
  if (!uniqueIds.length) return new Map<string, Profile>();

  const rows = await unwrap(client.from("profiles").select("*").in("id", uniqueIds));
  return new Map((rows ?? []).map((row: any) => [row.id, fromProfileRow(row)]));
}

async function syncExpiredPatientAccesses(client: SupabaseClient) {
  const { error } = await client.rpc("sync_expired_patient_accesses");
  if (error) throw new Error(error.message);
}

export async function signInWithPassword(
  client: SupabaseClient,
  credentials: { email: string; password: string },
) {
  const { data, error } = await client.auth.signInWithPassword(credentials);
  if (error) throw new Error(error.message);
  return data;
}

export async function signUpWithPassword(
  client: SupabaseClient,
  credentials: { email: string; password: string },
) {
  const { data, error } = await client.auth.signUp(credentials);
  if (error) throw new Error(error.message);
  return data;
}

export async function signOut(client: SupabaseClient) {
  const { error } = await client.auth.signOut();
  if (error) throw new Error(error.message);
}

export async function getProfile(client: SupabaseClient, userId: string) {
  const row = await unwrap(client.from("profiles").select("*").eq("id", userId).maybeSingle());
  return row ? fromProfileRow(row) : null;
}

export async function upsertProfile(client: SupabaseClient, input: ProfessionalProfileInput & { id: string }) {
  const row = await unwrap(client.from("profiles").upsert(toProfileRow(input)).select().single());
  return fromProfileRow(row);
}

export async function getProfessionalSettings(client: SupabaseClient, userId: string) {
  const row = await unwrap(
    client.from("professional_settings").select("*").eq("user_id", userId).maybeSingle(),
  );
  return row ? fromProfessionalSettingsRow(row) : null;
}

export async function listPatients(client: SupabaseClient, search?: string) {
  const viewerId = await getCurrentUserId(client);
  let query = client.from("patients").select("*").order("created_at", { ascending: false });
  if (search) {
    query = query.or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%,document_number.ilike.%${search}%`);
  }
  const rows = await unwrap(query);
  return (rows ?? []).map((row: any) =>
    fromPatientRow(row, {
      relationshipToViewer: viewerId && row.owner_user_id === viewerId ? "owner" : "shared_with_me",
    }),
  );
}

export async function listOwnedPatients(client: SupabaseClient, search?: string) {
  const viewerId = await getCurrentUserId(client);
  if (!viewerId) return [];

  let query = client
    .from("patients")
    .select("*")
    .eq("owner_user_id", viewerId)
    .order("created_at", { ascending: false });
  if (search) {
    query = query.or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%,document_number.ilike.%${search}%`);
  }

  const rows = await unwrap(query);
  return (rows ?? []).map((row: any) => fromPatientRow(row, { relationshipToViewer: "owner" }));
}

export async function getPatient(client: SupabaseClient, patientId: string) {
  const row = await unwrap(client.from("patients").select("*").eq("id", patientId).single());
  return fromPatientRow(row);
}

export async function getEncounter(client: SupabaseClient, encounterId: string) {
  const row = await unwrap(client.from("encounters").select("*").eq("id", encounterId).single());
  const profiles = await getProfilesMap(client, [row.created_by, row.updated_by].filter(Boolean) as string[]);
  return fromEncounterRow(row, profiles);
}

export async function upsertPatient(client: SupabaseClient, input: PatientInput & { id?: string }) {
  const actorUserId = await getCurrentUserId(client);
  if (!actorUserId) throw new Error("No hay sesión activa.");

  const payload = {
    ...toPatientRow(input),
    updated_by: actorUserId,
  };

  const row = input.id
    ? await unwrap(
        client
          .from("patients")
          .update(payload)
          .eq("id", input.id)
          .select()
          .single(),
      )
    : await unwrap(
        client
          .from("patients")
          .insert({
            ...payload,
            owner_user_id: actorUserId,
            created_by: actorUserId,
          })
          .select()
          .single(),
      );
  return fromPatientRow(row);
}

export async function listAppointments(client: SupabaseClient, from?: string, to?: string) {
  let query = client.from("appointments").select("*").order("start_at", { ascending: true });
  if (from) query = query.gte("start_at", from);
  if (to) query = query.lte("start_at", to);
  const rows = await unwrap(query);
  const profiles = await getProfilesMap(
    client,
    (rows ?? []).flatMap((row: any) => [row.created_by, row.updated_by, row.professional_id]),
  );
  return (rows ?? []).map((row: any) => fromAppointmentRow(row, profiles));
}

export async function upsertAppointment(client: SupabaseClient, input: AppointmentInput & { id?: string }) {
  const actorUserId = await getCurrentUserId(client);
  if (!actorUserId) throw new Error("No hay sesión activa.");
  const patientContext = await getPatientContext(client, input.patientId);

  const payload = {
    ...toAppointmentRow(input),
    professional_id: input.professionalId ?? actorUserId,
    owner_user_id: patientContext.ownerUserId,
    updated_by: actorUserId,
  };

  const row = input.id
    ? await unwrap(
        client
          .from("appointments")
          .update(payload)
          .eq("id", input.id)
          .select()
          .single(),
      )
    : await unwrap(
        client
          .from("appointments")
          .insert({
            ...payload,
            created_by: actorUserId,
          })
          .select()
          .single(),
      );
  return fromAppointmentRow(row);
}

export async function updateAppointmentStatus(client: SupabaseClient, appointmentId: string, status: Appointment["status"]) {
  const row = await unwrap(
    client.from("appointments").update({ status }).eq("id", appointmentId).select().single(),
  );
  return fromAppointmentRow(row);
}

export async function createEncounter(client: SupabaseClient, input: EncounterInput) {
  const actorUserId = await getCurrentUserId(client);
  if (!actorUserId) throw new Error("No hay sesión activa.");
  const patientContext = await getPatientContext(client, input.patientId);

  const row = await unwrap(
    client
      .from("encounters")
      .insert({
        owner_user_id: patientContext.ownerUserId,
        patient_id: input.patientId,
        appointment_id: input.appointmentId,
        encounter_type: input.encounterType,
        chief_complaint: input.chiefComplaint,
        started_at: input.startedAt,
        status: "open",
        created_by: actorUserId,
        updated_by: actorUserId,
      })
      .select()
      .single(),
  );
  return fromEncounterRow(row);
}

export async function createEncounterFromAppointment(client: SupabaseClient, appointment: Appointment) {
  return createEncounter(client, {
    patientId: appointment.patientId,
    appointmentId: appointment.id,
    encounterType:
      appointment.type === "valoracion_enfermeria"
        ? "nursing"
        : appointment.type === "curacion"
          ? "mixed"
          : "medical",
    chiefComplaint: appointment.reason,
    startedAt: appointment.startAt,
  });
}

export async function listEncounters(client: SupabaseClient, patientId?: string) {
  let query = client.from("encounters").select("*").order("started_at", { ascending: false });
  if (patientId) query = query.eq("patient_id", patientId);
  const rows = await unwrap(query);
  const profiles = await getProfilesMap(
    client,
    (rows ?? []).flatMap((row: any) => [row.created_by, row.updated_by]),
  );
  return (rows ?? []).map((row: any) => fromEncounterRow(row, profiles));
}

export async function saveVitalSigns(client: SupabaseClient, input: VitalSignsInput) {
  const actorUserId = await getCurrentUserId(client);
  if (!actorUserId) throw new Error("No hay sesión activa.");
  const encounterContext = await getEncounterContext(client, input.encounterId);

  const payload = {
    owner_user_id: encounterContext.ownerUserId,
    encounter_id: input.encounterId,
    patient_id: encounterContext.patientId,
    recorded_at: input.recordedAt,
    temperature_c: input.temperatureC,
    heart_rate: input.heartRate,
    respiratory_rate: input.respiratoryRate,
    systolic: input.systolic,
    diastolic: input.diastolic,
    oxygen_saturation: input.oxygenSaturation,
    glucose: input.glucose,
    pain_scale: input.painScale,
    weight_kg: input.weightKg,
    height_cm: input.heightCm,
    bmi: calculateBMI(input.weightKg, input.heightCm),
    mean_arterial_pressure: calculateMAP(input.systolic, input.diastolic),
    notes: input.notes,
    updated_by: actorUserId,
  };

  const existing = await unwrap(
    client.from("vital_signs").select("*").eq("encounter_id", input.encounterId).maybeSingle(),
  );

  const row = existing
    ? await unwrap(
        client
          .from("vital_signs")
          .update(payload)
          .eq("id", existing.id)
          .select()
          .single(),
      )
    : await unwrap(
        client
          .from("vital_signs")
          .insert({
            ...payload,
            created_by: actorUserId,
          })
          .select()
          .single(),
      );
  return fromVitalSignsRow(row);
}

export async function saveMedicalAssessment(client: SupabaseClient, input: MedicalAssessmentInput) {
  const actorUserId = await getCurrentUserId(client);
  if (!actorUserId) throw new Error("No hay sesión activa.");
  const encounterContext = await getEncounterContext(client, input.encounterId);

  const payload = {
    owner_user_id: encounterContext.ownerUserId,
    encounter_id: input.encounterId,
    chief_complaint: input.chiefComplaint,
    current_illness: input.currentIllness,
    systems_review: input.systemsReview,
    background: input.background,
    physical_exam: input.physicalExam,
    diagnostic_impression: input.diagnosticImpression,
    therapeutic_plan: input.therapeuticPlan,
    indications: input.indications,
    follow_up: input.followUp,
    updated_by: actorUserId,
  };

  const existing = await unwrap(
    client.from("medical_assessments").select("*").eq("encounter_id", input.encounterId).maybeSingle(),
  );

  const row = existing
    ? await unwrap(
        client
          .from("medical_assessments")
          .update(payload)
          .eq("id", existing.id)
          .select()
          .single(),
      )
    : await unwrap(
        client
          .from("medical_assessments")
          .insert({
            ...payload,
            created_by: actorUserId,
          })
          .select()
          .single(),
      );
  return fromMedicalAssessmentRow(row);
}

export async function saveNursingAssessment(client: SupabaseClient, input: NursingAssessmentInput) {
  const actorUserId = await getCurrentUserId(client);
  if (!actorUserId) throw new Error("No hay sesión activa.");
  const encounterContext = await getEncounterContext(client, input.encounterId);

  const payload = {
    owner_user_id: encounterContext.ownerUserId,
    encounter_id: input.encounterId,
    care_reason: input.careReason,
    pain_notes: input.painNotes,
    consciousness: input.consciousness,
    mobility: input.mobility,
    skin_and_mucosa: input.skinAndMucosa,
    elimination: input.elimination,
    nutrition_hydration: input.nutritionHydration,
    devices: input.devices,
    risks: input.risks,
    observations: input.observations,
    suggestion_ids: input.suggestionIds,
    selected_diagnoses: input.selectedDiagnoses,
    updated_by: actorUserId,
  };

  const existing = await unwrap(
    client.from("nursing_assessments").select("*").eq("encounter_id", input.encounterId).maybeSingle(),
  );

  const row = existing
    ? await unwrap(
        client
          .from("nursing_assessments")
          .update(payload)
          .eq("id", existing.id)
          .select()
          .single(),
      )
    : await unwrap(
        client
          .from("nursing_assessments")
          .insert({
            ...payload,
            created_by: actorUserId,
          })
          .select()
          .single(),
      );
  return fromNursingAssessmentRow(row);
}

export async function saveClinicalNote(client: SupabaseClient, note: ClinicalNote) {
  const actorUserId = await getCurrentUserId(client);
  if (!actorUserId) throw new Error("No hay sesión activa.");
  const encounterContext = await getEncounterContext(client, note.encounterId);

  const row = await unwrap(
    client
      .from("clinical_notes")
      .insert({
        owner_user_id: encounterContext.ownerUserId,
        encounter_id: note.encounterId,
        note_kind: note.noteKind,
        content: note.content,
        created_by: actorUserId,
        updated_by: actorUserId,
      })
      .select()
      .single(),
  );
  return fromClinicalNoteRow(row);
}

export async function listProcedures(client: SupabaseClient, encounterId?: string) {
  let query = client.from("procedures").select("*").order("performed_at", { ascending: false });
  if (encounterId) query = query.eq("encounter_id", encounterId);
  const rows = await unwrap(query);
  const profiles = await getProfilesMap(
    client,
    (rows ?? []).flatMap((row: any) => [row.created_by, row.updated_by]),
  );
  return (rows ?? []).map((row: any) => fromProcedureRow(row, profiles));
}

export async function listExamOrders(client: SupabaseClient, encounterId?: string) {
  let query = client.from("exam_orders").select("*").order("ordered_at", { ascending: false });
  if (encounterId) query = query.eq("encounter_id", encounterId);
  const rows = await unwrap(query);
  const profiles = await getProfilesMap(
    client,
    (rows ?? []).flatMap((row: any) => [row.created_by, row.updated_by]),
  );
  return (rows ?? []).map((row: any) => fromExamOrderRow(row, profiles));
}

export async function createExamOrder(
  client: SupabaseClient,
  input: Pick<ExamOrder, "encounterId" | "category" | "examName" | "instructions" | "status" | "orderedAt">,
) {
  const actorUserId = await getCurrentUserId(client);
  if (!actorUserId) throw new Error("No hay sesión activa.");
  const encounterContext = await getEncounterContext(client, input.encounterId);

  const row = await unwrap(
    client
      .from("exam_orders")
      .insert({
        owner_user_id: encounterContext.ownerUserId,
        encounter_id: input.encounterId,
        category: input.category,
        exam_name: input.examName,
        instructions: input.instructions,
        status: input.status,
        ordered_at: input.orderedAt,
        created_by: actorUserId,
        updated_by: actorUserId,
      })
      .select()
      .single(),
  );
  const profiles = await getProfilesMap(client, [actorUserId]);
  return fromExamOrderRow(row, profiles);
}

export async function listMedicationOrders(client: SupabaseClient, encounterId?: string) {
  let query = client.from("medication_orders").select("*").order("created_at", { ascending: false });
  if (encounterId) query = query.eq("encounter_id", encounterId);
  const rows = await unwrap(query);
  const profiles = await getProfilesMap(
    client,
    (rows ?? []).flatMap((row: any) => [row.created_by, row.updated_by]),
  );
  return (rows ?? []).map((row: any) => fromMedicationOrderRow(row, profiles));
}

export async function createMedicationOrder(client: SupabaseClient, input: MedicationOrderInput) {
  const actorUserId = await getCurrentUserId(client);
  if (!actorUserId) throw new Error("No hay sesión activa.");
  const encounterContext = await getEncounterContext(client, input.encounterId);

  const row = await unwrap(
    client
      .from("medication_orders")
      .insert({
        owner_user_id: encounterContext.ownerUserId,
        encounter_id: input.encounterId,
        medication_name: input.medicationName,
        presentation: input.presentation,
        dosage: input.dosage,
        route: input.route,
        frequency: input.frequency,
        duration: input.duration,
        instructions: input.instructions,
        prescriber_role: input.prescriberRole,
        created_by: actorUserId,
        updated_by: actorUserId,
      })
      .select()
      .single(),
  );
  const profiles = await getProfilesMap(client, [actorUserId]);
  return fromMedicationOrderRow(row, profiles);
}

export async function listAttachments(
  client: SupabaseClient,
  filters?: { patientId?: string; encounterId?: string; examOrderId?: string },
) {
  let query = client.from("attachments").select("*").order("created_at", { ascending: false });
  if (filters?.patientId) query = query.eq("patient_id", filters.patientId);
  if (filters?.encounterId) query = query.eq("encounter_id", filters.encounterId);
  if (filters?.examOrderId) query = query.eq("exam_order_id", filters.examOrderId);
  const rows = await unwrap(query);
  const profiles = await getProfilesMap(
    client,
    (rows ?? []).flatMap((row: any) => [row.created_by, row.updated_by]),
  );
  return (rows ?? []).map((row: any) => fromAttachmentRow(row, profiles));
}

export async function createAttachmentRecord(
  client: SupabaseClient,
  input: Pick<Attachment, "patientId" | "encounterId" | "examOrderId" | "bucket" | "path" | "fileName" | "mimeType" | "category">,
) {
  const actorUserId = await getCurrentUserId(client);
  if (!actorUserId) throw new Error("No hay sesión activa.");

  let ownerUserId = actorUserId;
  if (input.patientId) {
    const patientContext = await getPatientContext(client, input.patientId);
    ownerUserId = patientContext.ownerUserId;
  } else if (input.encounterId) {
    const encounterContext = await getEncounterContext(client, input.encounterId);
    ownerUserId = encounterContext.ownerUserId;
  }

  const row = await unwrap(
    client
      .from("attachments")
      .insert({
        owner_user_id: ownerUserId,
        patient_id: input.patientId,
        encounter_id: input.encounterId,
        exam_order_id: input.examOrderId,
        storage_bucket: input.bucket,
        storage_path: input.path,
        file_name: input.fileName,
        mime_type: input.mimeType,
        category: input.category,
        created_by: actorUserId,
        updated_by: actorUserId,
      })
      .select()
      .single(),
  );
  const profiles = await getProfilesMap(client, [actorUserId]);
  return fromAttachmentRow(row, profiles);
}

export async function listClinicalNotes(client: SupabaseClient, encounterId: string) {
  const rows = await unwrap(
    client.from("clinical_notes").select("*").eq("encounter_id", encounterId).order("created_at", { ascending: false }),
  );
  const profiles = await getProfilesMap(
    client,
    (rows ?? []).flatMap((row: any) => [row.created_by, row.updated_by]),
  );
  return (rows ?? []).map((row: any) => fromClinicalNoteRow(row, profiles));
}

export async function listDiagnoses(client: SupabaseClient, encounterId: string) {
  const rows = await unwrap(
    client.from("diagnoses").select("*").eq("encounter_id", encounterId).order("created_at", { ascending: false }),
  );
  const profiles = await getProfilesMap(
    client,
    (rows ?? []).flatMap((row: any) => [row.created_by, row.updated_by]),
  );
  return (rows ?? []).map((row: any) => fromDiagnosisRow(row, profiles));
}

export async function createDiagnosis(
  client: SupabaseClient,
  input: Pick<Diagnosis, "encounterId" | "source" | "label" | "code" | "isPrimary" | "notes">,
) {
  const actorUserId = await getCurrentUserId(client);
  if (!actorUserId) throw new Error("No hay sesión activa.");
  const encounterContext = await getEncounterContext(client, input.encounterId);

  const row = await unwrap(
    client
      .from("diagnoses")
      .insert({
        owner_user_id: encounterContext.ownerUserId,
        encounter_id: input.encounterId,
        source: input.source,
        code: input.code,
        label: input.label,
        is_primary: input.isPrimary,
        notes: input.notes,
        created_by: actorUserId,
        updated_by: actorUserId,
      })
      .select()
      .single(),
  );
  const profiles = await getProfilesMap(client, [actorUserId]);
  return fromDiagnosisRow(row, profiles);
}

export async function createProcedure(
  client: SupabaseClient,
  input: Pick<Procedure, "encounterId" | "name" | "performedAt" | "responsibleProfessional" | "materials" | "result" | "notes">,
) {
  const actorUserId = await getCurrentUserId(client);
  if (!actorUserId) throw new Error("No hay sesión activa.");
  const encounterContext = await getEncounterContext(client, input.encounterId);

  const row = await unwrap(
    client
      .from("procedures")
      .insert({
        owner_user_id: encounterContext.ownerUserId,
        encounter_id: input.encounterId,
        name: input.name,
        performed_at: input.performedAt,
        responsible_professional: input.responsibleProfessional,
        materials: input.materials ?? [],
        result: input.result,
        notes: input.notes,
        created_by: actorUserId,
        updated_by: actorUserId,
      })
      .select()
      .single(),
  );
  const profiles = await getProfilesMap(client, [actorUserId]);
  return fromProcedureRow(row, profiles);
}

export async function listSharedPatientsWithMe(client: SupabaseClient) {
  const userId = await getCurrentUserId(client);
  if (!userId) return [];
  await syncExpiredPatientAccesses(client);

  const rows = await unwrap(
    client
      .from("patient_access")
      .select("*")
      .eq("shared_with_user_id", userId)
      .order("updated_at", { ascending: false }),
  );

  const patientIds = [...new Set((rows ?? []).map((row: any) => row.patient_id))];
  const userIds = [...new Set((rows ?? []).flatMap((row: any) => [row.owner_user_id, row.shared_with_user_id, row.created_by]))];
  const [patientRows, profiles] = await Promise.all([
    patientIds.length ? unwrap(client.from("patients").select("*").in("id", patientIds)) : Promise.resolve([]),
    getProfilesMap(client, userIds),
  ]);
  const patientMap = new Map(
    (patientRows ?? []).map((row: any) => [row.id, fromPatientRow(row, { relationshipToViewer: "shared_with_me" })]),
  );

  return (rows ?? [])
    .map((row: any) => fromPatientAccessRow(row, patientMap, profiles))
    .filter((item) => item.status !== "revoked" && item.status !== "expired");
}

export async function listPatientsSharedByMe(client: SupabaseClient) {
  const userId = await getCurrentUserId(client);
  if (!userId) return [];
  await syncExpiredPatientAccesses(client);

  const rows = await unwrap(
    client
      .from("patient_access")
      .select("*")
      .eq("owner_user_id", userId)
      .order("updated_at", { ascending: false }),
  );

  const patientIds = [...new Set((rows ?? []).map((row: any) => row.patient_id))];
  const userIds = [...new Set((rows ?? []).flatMap((row: any) => [row.owner_user_id, row.shared_with_user_id, row.created_by]))];
  const [patientRows, profiles] = await Promise.all([
    patientIds.length ? unwrap(client.from("patients").select("*").in("id", patientIds)) : Promise.resolve([]),
    getProfilesMap(client, userIds),
  ]);
  const patientMap = new Map(
    (patientRows ?? []).map((row: any) => [row.id, fromPatientRow(row, { relationshipToViewer: "shared_by_me" })]),
  );

  return (rows ?? []).map((row: any) => fromPatientAccessRow(row, patientMap, profiles));
}

export async function listPatientAccess(client: SupabaseClient, patientId: string) {
  await syncExpiredPatientAccesses(client);
  const rows = await unwrap(
    client
      .from("patient_access")
      .select("*")
      .eq("patient_id", patientId)
      .order("created_at", { ascending: false }),
  );
  const patient = await getPatient(client, patientId);
  const profiles = await getProfilesMap(
    client,
    (rows ?? []).flatMap((row: any) => [row.owner_user_id, row.shared_with_user_id, row.created_by]),
  );
  const patientMap = new Map([[patient.id, patient]]);
  return (rows ?? []).map((row: any) => fromPatientAccessRow(row, patientMap, profiles));
}

export async function searchProfessionals(client: SupabaseClient, search: string) {
  const userId = await getCurrentUserId(client);
  let query = client
    .from("profiles")
    .select("id, first_name, last_name, profession, specialty, email")
    .order("first_name", { ascending: true });

  if (search) {
    query = query.or(
      `email.ilike.%${search}%,first_name.ilike.%${search}%,last_name.ilike.%${search}%,profession.ilike.%${search}%`,
    );
  }

  const rows = await unwrap(query.limit(10));
  return (rows ?? [])
    .filter((row: any) => row.id !== userId)
    .map((row: any): ProfessionalDirectoryEntry => ({
      id: row.id,
      firstName: row.first_name,
      lastName: row.last_name,
      profession: row.profession,
      specialty: row.specialty,
      email: row.email,
    }));
}

export async function sharePatient(client: SupabaseClient, input: PatientShareInput) {
  const actorUserId = await getCurrentUserId(client);
  if (!actorUserId) throw new Error("No hay sesión activa.");
  await syncExpiredPatientAccesses(client);
  if (input.sharedWithUserId === actorUserId) {
    throw new Error("No puedes compartir un paciente contigo mismo.");
  }

  const patientContext = await getPatientContext(client, input.patientId);
  if (patientContext.ownerUserId !== actorUserId) {
    throw new Error("Solo el propietario principal puede compartir el paciente.");
  }

  const duplicate = await unwrap(
    client
      .from("patient_access")
      .select("id")
      .eq("patient_id", input.patientId)
      .eq("shared_with_user_id", input.sharedWithUserId)
      .in("status", ["pending", "active"])
      .maybeSingle(),
  );
  if (duplicate?.id) {
    throw new Error("Ya existe un acceso activo o pendiente para este profesional.");
  }

  const row = await unwrap(
    client
      .from("patient_access")
      .insert({
        patient_id: input.patientId,
        owner_user_id: actorUserId,
        shared_with_user_id: input.sharedWithUserId,
        permission_level: input.permissionLevel,
        status: input.status ?? "active",
        expires_at: input.expiresAt,
        created_by: actorUserId,
      })
      .select()
      .single(),
  );
  const [patient, profiles] = await Promise.all([
    getPatient(client, input.patientId),
    getProfilesMap(client, [actorUserId, input.sharedWithUserId]),
  ]);
  return fromPatientAccessRow(row, new Map([[patient.id, patient]]), profiles);
}

export async function revokePatientAccess(client: SupabaseClient, accessId: string) {
  const row = await unwrap(
    client
      .from("patient_access")
      .update({ status: "revoked" })
      .eq("id", accessId)
      .select()
      .single(),
  );

  const [patient, profiles] = await Promise.all([
    getPatient(client, row.patient_id),
    getProfilesMap(client, [row.owner_user_id, row.shared_with_user_id, row.created_by]),
  ]);
  return fromPatientAccessRow(row, new Map([[patient.id, patient]]), profiles);
}

export async function removeSharedPatientFromMyList(client: SupabaseClient, accessId: string) {
  const { data, error } = await client.rpc("quit_shared_patient_access", { access_row_id: accessId });
  if (error) throw new Error(error.message);
  const row = data as any;
  const [patient, profiles] = await Promise.all([
    getPatient(client, row.patient_id),
    getProfilesMap(client, [row.owner_user_id, row.shared_with_user_id, row.created_by]),
  ]);
  return fromPatientAccessRow(row, new Map([[patient.id, patient]]), profiles);
}

export function subscribeToPatientRealtime(
  client: SupabaseClient,
  patientId: string,
  onChange: (table: string) => void,
) {
  const channel = client.channel(`patient-live:${patientId}`);

  channel.on(
    "postgres_changes",
    { event: "*", schema: "public", table: "patients", filter: `id=eq.${patientId}` },
    () => onChange("patients"),
  );
  channel.on(
    "postgres_changes",
    { event: "*", schema: "public", table: "appointments", filter: `patient_id=eq.${patientId}` },
    () => onChange("appointments"),
  );
  channel.on(
    "postgres_changes",
    { event: "*", schema: "public", table: "encounters", filter: `patient_id=eq.${patientId}` },
    () => onChange("encounters"),
  );
  channel.on(
    "postgres_changes",
    { event: "*", schema: "public", table: "vital_signs", filter: `patient_id=eq.${patientId}` },
    () => onChange("vital_signs"),
  );

  for (const table of [
    "patient_access",
    "medical_assessments",
    "nursing_assessments",
    "diagnoses",
    "procedures",
    "exam_orders",
    "exam_results",
    "clinical_notes",
    "attachments",
  ] as const) {
    channel.on("postgres_changes", { event: "*", schema: "public", table }, () => onChange(table));
  }

  channel.subscribe();
  return channel;
}

export async function getEncounterBundle(client: SupabaseClient, encounterId: string) {
  const [encounter, vitals, medical, nursing, notes, diagnoses, procedures, examOrders, attachments, medicationOrders] = await Promise.all([
    unwrap(client.from("encounters").select("*").eq("id", encounterId).single()),
    unwrap(client.from("vital_signs").select("*").eq("encounter_id", encounterId).maybeSingle()),
    unwrap(client.from("medical_assessments").select("*").eq("encounter_id", encounterId).maybeSingle()),
    unwrap(client.from("nursing_assessments").select("*").eq("encounter_id", encounterId).maybeSingle()),
    unwrap(client.from("clinical_notes").select("*").eq("encounter_id", encounterId).order("created_at")),
    unwrap(client.from("diagnoses").select("*").eq("encounter_id", encounterId).order("created_at")),
    unwrap(client.from("procedures").select("*").eq("encounter_id", encounterId).order("performed_at", { ascending: false })),
    unwrap(client.from("exam_orders").select("*").eq("encounter_id", encounterId).order("ordered_at", { ascending: false })),
    unwrap(client.from("attachments").select("*").eq("encounter_id", encounterId).order("created_at", { ascending: false })),
    unwrap(client.from("medication_orders").select("*").eq("encounter_id", encounterId).order("created_at", { ascending: false })),
  ]);

  const profiles = await getProfilesMap(
    client,
    [
      encounter.created_by,
      encounter.updated_by,
      vitals?.created_by,
      vitals?.updated_by,
      medical?.created_by,
      medical?.updated_by,
      nursing?.created_by,
      nursing?.updated_by,
      ...(notes ?? []).flatMap((row: any) => [row.created_by, row.updated_by]),
      ...(diagnoses ?? []).flatMap((row: any) => [row.created_by, row.updated_by]),
      ...(procedures ?? []).flatMap((row: any) => [row.created_by, row.updated_by]),
      ...(examOrders ?? []).flatMap((row: any) => [row.created_by, row.updated_by]),
      ...(attachments ?? []).flatMap((row: any) => [row.created_by, row.updated_by]),
      ...(medicationOrders ?? []).flatMap((row: any) => [row.created_by, row.updated_by]),
    ].filter(Boolean) as string[],
  );

  return {
    encounter: fromEncounterRow(encounter, profiles),
    vitals: vitals ? fromVitalSignsRow(vitals, profiles) : null,
    medical: medical ? fromMedicalAssessmentRow(medical, profiles) : null,
    nursing: nursing ? fromNursingAssessmentRow(nursing, profiles) : null,
    notes: (notes ?? []).map((row: any) => fromClinicalNoteRow(row, profiles)),
    diagnoses: (diagnoses ?? []).map((row: any) => fromDiagnosisRow(row, profiles)),
    procedures: (procedures ?? []).map((row: any) => fromProcedureRow(row, profiles)),
    examOrders: (examOrders ?? []).map((row: any) => fromExamOrderRow(row, profiles)),
    attachments: (attachments ?? []).map((row: any) => fromAttachmentRow(row, profiles)),
    medicationOrders: (medicationOrders ?? []).map((row: any) => fromMedicationOrderRow(row, profiles)),
  };
}

export async function getDashboardSnapshot(client: SupabaseClient) {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).toISOString();

  const [todayAppointments, pendingAppointments, patients, openEncounters] = await Promise.all([
    client
      .from("appointments")
      .select("id", { count: "exact", head: true })
      .gte("start_at", todayStart)
      .lt("start_at", todayEnd),
    client
      .from("appointments")
      .select("id", { count: "exact", head: true })
      .eq("status", "programada"),
    client.from("patients").select("id", { count: "exact", head: true }),
    client.from("encounters").select("id", { count: "exact", head: true }).eq("status", "open"),
  ]);

  return {
    todayAppointments: todayAppointments.count ?? 0,
    pendingAppointments: pendingAppointments.count ?? 0,
    activePatients: patients.count ?? 0,
    openEncounters: openEncounters.count ?? 0,
  } satisfies DashboardSnapshot;
}

function toProfileRow(input: ProfessionalProfileInput & { id: string }) {
  return {
    id: input.id,
    role: input.role,
    first_name: input.firstName,
    last_name: input.lastName,
    profession: input.profession,
    specialty: input.specialty,
    professional_license: input.professionalLicense,
    phone: input.phone,
    email: input.email,
    professional_address: input.professionalAddress,
    city: input.city,
    signature_url: input.signatureUrl,
    seal_url: input.sealUrl,
    logo_url: input.logoUrl,
    avatar_url: input.avatarUrl,
    short_bio: input.shortBio,
  };
}

function toPatientRow(input: PatientInput) {
  return {
    first_name: input.firstName,
    last_name: input.lastName,
    document_type: input.documentType,
    document_number: input.documentNumber,
    birth_date: input.birthDate,
    sex: input.sex,
    gender: input.gender,
    marital_status: input.maritalStatus,
    occupation: input.occupation,
    address: input.address,
    phone: input.phone,
    email: input.email || null,
    emergency_contact: input.emergencyContact,
    blood_type: input.bloodType,
    allergies: input.allergies,
    relevant_history: input.relevantHistory,
    insurance: input.insurance,
  };
}

function toAppointmentRow(input: AppointmentInput) {
  return {
    patient_id: input.patientId,
    start_at: input.startAt,
    end_at: input.endAt,
    reason: input.reason,
    type: input.type,
    modality: input.modality,
    status: input.status,
    notes: input.notes,
    meet_link: input.meetLink || null,
  };
}

function mapTraceability(row: any, profiles?: Map<string, Profile>) {
  return {
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    createdBy: row.created_by ?? null,
    updatedBy: row.updated_by ?? null,
    createdByName: row.created_by ? getProfileName(profiles?.get(row.created_by)) : null,
    updatedByName: row.updated_by ? getProfileName(profiles?.get(row.updated_by)) : null,
  };
}

function getProfileName(profile?: Profile | null) {
  return profile ? `${profile.firstName} ${profile.lastName}`.trim() : null;
}

function normalizeAccessStatus(row: any) {
  if (row.status === "active" && row.expires_at && new Date(row.expires_at).getTime() <= Date.now()) {
    return "expired";
  }
  return row.status;
}

function fromProfileRow(row: any): Profile {
  return {
    id: row.id,
    role: row.role,
    firstName: row.first_name,
    lastName: row.last_name,
    profession: row.profession,
    specialty: row.specialty,
    professionalLicense: row.professional_license,
    phone: row.phone,
    email: row.email,
    professionalAddress: row.professional_address,
    city: row.city,
    signatureUrl: row.signature_url,
    sealUrl: row.seal_url,
    logoUrl: row.logo_url,
    avatarUrl: row.avatar_url,
    shortBio: row.short_bio,
    ...mapTraceability(row),
  };
}

function fromProfessionalSettingsRow(row: any): ProfessionalSettings {
  return {
    id: row.id,
    userId: row.user_id,
    workingHours: row.working_hours ?? {},
    defaultAppointmentMinutes: row.default_appointment_minutes ?? 30,
    bufferMinutes: row.buffer_minutes ?? 0,
    calendarColors: row.calendar_colors ?? {},
    printPreferences: row.print_preferences ?? {},
    letterheadFormat: row.letterhead_format ?? {},
    signatureFooter: row.signature_footer,
    googleCalendarConnected: row.google_calendar_connected ?? false,
    googleCalendarEmail: row.google_calendar_email ?? null,
    googleCalendarPrimaryCalendarId: row.google_calendar_primary_calendar_id ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function fromPatientRow(
  row: any,
  options?: { relationshipToViewer?: Patient["relationshipToViewer"]; ownerName?: string | null },
): Patient {
  return {
    id: row.id,
    ownerUserId: row.owner_user_id,
    ownerName: options?.ownerName ?? null,
    relationshipToViewer: options?.relationshipToViewer,
    firstName: row.first_name,
    lastName: row.last_name,
    documentType: row.document_type,
    documentNumber: row.document_number,
    birthDate: row.birth_date,
    sex: row.sex,
    gender: row.gender,
    maritalStatus: row.marital_status,
    occupation: row.occupation,
    address: row.address,
    phone: row.phone,
    email: row.email,
    emergencyContact: row.emergency_contact,
    bloodType: row.blood_type,
    allergies: row.allergies ?? [],
    relevantHistory: row.relevant_history,
    insurance: row.insurance,
    ...mapTraceability(row),
  };
}

function fromAppointmentRow(row: any, profiles?: Map<string, Profile>): Appointment {
  return {
    id: row.id,
    ownerUserId: row.owner_user_id,
    professionalId: row.professional_id,
    patientId: row.patient_id,
    startAt: row.start_at,
    endAt: row.end_at,
    reason: row.reason,
    type: row.type,
    modality: row.modality,
    status: row.status,
    notes: row.notes,
    meetLink: row.meet_link,
    googleCalendarEventId: row.google_calendar_event_id,
    ...mapTraceability(row, profiles),
  };
}

function fromEncounterRow(row: any, profiles?: Map<string, Profile>): Encounter {
  return {
    id: row.id,
    ownerUserId: row.owner_user_id,
    patientId: row.patient_id,
    appointmentId: row.appointment_id,
    encounterType: row.encounter_type,
    status: row.status,
    startedAt: row.started_at,
    endedAt: row.ended_at,
    chiefComplaint: row.chief_complaint,
    summary: row.summary,
    ...mapTraceability(row, profiles),
  };
}

function fromVitalSignsRow(row: any, profiles?: Map<string, Profile>): VitalSigns {
  return {
    id: row.id,
    ownerUserId: row.owner_user_id,
    encounterId: row.encounter_id,
    patientId: row.patient_id,
    recordedAt: row.recorded_at,
    temperatureC: row.temperature_c,
    heartRate: row.heart_rate,
    respiratoryRate: row.respiratory_rate,
    systolic: row.systolic,
    diastolic: row.diastolic,
    oxygenSaturation: row.oxygen_saturation,
    glucose: row.glucose,
    painScale: row.pain_scale,
    weightKg: row.weight_kg,
    heightCm: row.height_cm,
    bmi: row.bmi,
    meanArterialPressure: row.mean_arterial_pressure,
    notes: row.notes,
    ...mapTraceability(row, profiles),
  };
}

function fromMedicalAssessmentRow(row: any, profiles?: Map<string, Profile>): MedicalAssessment {
  return {
    id: row.id,
    ownerUserId: row.owner_user_id,
    encounterId: row.encounter_id,
    chiefComplaint: row.chief_complaint,
    currentIllness: row.current_illness,
    systemsReview: row.systems_review,
    background: row.background,
    physicalExam: row.physical_exam,
    diagnosticImpression: row.diagnostic_impression,
    therapeuticPlan: row.therapeutic_plan,
    indications: row.indications,
    followUp: row.follow_up,
    ...mapTraceability(row, profiles),
  };
}

function fromNursingAssessmentRow(row: any, profiles?: Map<string, Profile>): NursingAssessment {
  return {
    id: row.id,
    ownerUserId: row.owner_user_id,
    encounterId: row.encounter_id,
    careReason: row.care_reason,
    painNotes: row.pain_notes,
    consciousness: row.consciousness,
    mobility: row.mobility,
    skinAndMucosa: row.skin_and_mucosa,
    elimination: row.elimination,
    nutritionHydration: row.nutrition_hydration,
    devices: row.devices,
    risks: row.risks,
    observations: row.observations,
    suggestionIds: row.suggestion_ids ?? [],
    selectedDiagnoses: row.selected_diagnoses ?? [],
    ...mapTraceability(row, profiles),
  };
}

function fromClinicalNoteRow(row: any, profiles?: Map<string, Profile>): ClinicalNote {
  return {
    id: row.id,
    ownerUserId: row.owner_user_id,
    encounterId: row.encounter_id,
    noteKind: row.note_kind,
    content: row.content,
    ...mapTraceability(row, profiles),
  };
}

function fromDiagnosisRow(row: any, profiles?: Map<string, Profile>): Diagnosis {
  return {
    id: row.id,
    ownerUserId: row.owner_user_id,
    encounterId: row.encounter_id,
    source: row.source,
    code: row.code,
    label: row.label,
    isPrimary: row.is_primary,
    notes: row.notes,
    ...mapTraceability(row, profiles),
  };
}

function fromMedicationOrderRow(row: any, profiles?: Map<string, Profile>): MedicationOrder {
  return {
    id: row.id,
    ownerUserId: row.owner_user_id,
    encounterId: row.encounter_id,
    medicationName: row.medication_name,
    presentation: row.presentation,
    dosage: row.dosage,
    route: row.route,
    frequency: row.frequency,
    duration: row.duration,
    instructions: row.instructions,
    prescriberRole: row.prescriber_role,
    ...mapTraceability(row, profiles),
  };
}

function fromProcedureRow(row: any, profiles?: Map<string, Profile>): Procedure {
  return {
    id: row.id,
    ownerUserId: row.owner_user_id,
    encounterId: row.encounter_id,
    name: row.name,
    performedAt: row.performed_at,
    responsibleProfessional: row.responsible_professional,
    materials: Array.isArray(row.materials) ? row.materials : [],
    result: row.result,
    notes: row.notes,
    ...mapTraceability(row, profiles),
  };
}

function fromExamOrderRow(row: any, profiles?: Map<string, Profile>): ExamOrder {
  return {
    id: row.id,
    ownerUserId: row.owner_user_id,
    encounterId: row.encounter_id,
    category: row.category,
    examName: row.exam_name,
    instructions: row.instructions,
    status: row.status,
    orderedAt: row.ordered_at,
    reviewedAt: row.reviewed_at,
    ...mapTraceability(row, profiles),
  };
}

function fromExamResultRow(row: any, profiles?: Map<string, Profile>): ExamResult {
  return {
    id: row.id,
    ownerUserId: row.owner_user_id,
    examOrderId: row.exam_order_id,
    encounterId: row.encounter_id,
    resultSummary: row.result_summary,
    interpretation: row.interpretation,
    status: row.status,
    ...mapTraceability(row, profiles),
  };
}

function fromAttachmentRow(row: any, profiles?: Map<string, Profile>): Attachment {
  return {
    id: row.id,
    ownerUserId: row.owner_user_id,
    patientId: row.patient_id,
    encounterId: row.encounter_id,
    examOrderId: row.exam_order_id,
    bucket: row.storage_bucket,
    path: row.storage_path,
    fileName: row.file_name,
    mimeType: row.mime_type,
    category: row.category,
    ...mapTraceability(row, profiles),
  };
}

function fromPatientAccessRow(
  row: any,
  patientMap: Map<string, Patient>,
  profiles: Map<string, Profile>,
): PatientAccess {
  return {
    id: row.id,
    patientId: row.patient_id,
    ownerUserId: row.owner_user_id,
    sharedWithUserId: row.shared_with_user_id,
    permissionLevel: row.permission_level as PermissionLevel,
    status: normalizeAccessStatus(row),
    expiresAt: row.expires_at,
    patient: patientMap.get(row.patient_id),
    ownerProfile: profiles.get(row.owner_user_id) ?? null,
    sharedWithProfile: profiles.get(row.shared_with_user_id) ?? null,
    ...mapTraceability(row, profiles),
  };
}

function fromPatientAccessAuditRow(row: any): PatientAccessAudit {
  return {
    id: row.id,
    patientAccessId: row.patient_access_id,
    action: row.action,
    performedBy: row.performed_by,
    targetUserId: row.target_user_id,
    metadata: row.metadata,
    createdAt: row.created_at,
  };
}
