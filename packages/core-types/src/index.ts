export type UserRole = "admin" | "medico" | "enfermeria" | "profesional_mixto";

export type AppointmentStatus =
  | "programada"
  | "confirmada"
  | "atendida"
  | "cancelada"
  | "no_asistio";

export type AppointmentType =
  | "presencial"
  | "teleconsulta"
  | "control"
  | "procedimiento"
  | "curacion"
  | "valoracion_enfermeria"
  | "visita_domiciliaria";

export type AppointmentModality = "presencial" | "virtual" | "domicilio";
export type EncounterKind = "medical" | "nursing" | "mixed";
export type ExamCategory = "laboratorio" | "imagen" | "estudio_especial";
export type ExamStatus = "pendiente" | "recibido" | "revisado";
export type PermissionLevel = "read" | "edit";
export type AccessStatus = "pending" | "active" | "revoked" | "expired";
export type AttachmentCategory =
  | "pdf"
  | "imagen"
  | "resultado"
  | "documento_escaneado"
  | "firma_profesional"
  | "firma_paciente";

export interface AuditFields {
  createdAt?: string;
  updatedAt?: string;
}

export interface TraceabilityFields extends AuditFields {
  createdBy?: string | null;
  updatedBy?: string | null;
  createdByName?: string | null;
  updatedByName?: string | null;
}

export interface Profile extends TraceabilityFields {
  id: string;
  role: UserRole;
  firstName: string;
  lastName: string;
  profession: string;
  specialty?: string | null;
  professionalLicense: string;
  phone?: string | null;
  email: string;
  professionalAddress?: string | null;
  city?: string | null;
  signatureUrl?: string | null;
  sealUrl?: string | null;
  logoUrl?: string | null;
  avatarUrl?: string | null;
  shortBio?: string | null;
}

export interface ProfessionalSettings extends AuditFields {
  id: string;
  userId: string;
  workingHours: Record<string, { start: string; end: string }[]>;
  defaultAppointmentMinutes: number;
  bufferMinutes: number;
  calendarColors: {
    confirmed: string;
    pending: string;
    teleconsultation: string;
    nursing: string;
  };
  printPreferences: {
    showLicense: boolean;
    showAddress: boolean;
    showPhone: boolean;
  };
  letterheadFormat: {
    title: string;
    subtitle?: string;
  };
  signatureFooter?: string | null;
  googleCalendarConnected: boolean;
  googleCalendarEmail?: string | null;
  googleCalendarPrimaryCalendarId?: string | null;
}

export interface Patient extends TraceabilityFields {
  id: string;
  ownerUserId: string;
  ownerName?: string | null;
  relationshipToViewer?: "owner" | "shared_with_me" | "shared_by_me";
  firstName: string;
  lastName: string;
  documentType: string;
  documentNumber: string;
  birthDate: string;
  sex: string;
  gender?: string | null;
  maritalStatus?: string | null;
  occupation?: string | null;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  emergencyContact?: {
    name?: string;
    relation?: string;
    phone?: string;
  } | null;
  bloodType?: string | null;
  allergies?: string[];
  relevantHistory?: string | null;
  insurance?: string | null;
}

export interface Appointment extends TraceabilityFields {
  id: string;
  ownerUserId: string;
  professionalId: string;
  patientId: string;
  startAt: string;
  endAt: string;
  reason: string;
  type: AppointmentType;
  modality: AppointmentModality;
  status: AppointmentStatus;
  notes?: string | null;
  meetLink?: string | null;
  googleCalendarEventId?: string | null;
}

export interface Encounter extends TraceabilityFields {
  id: string;
  ownerUserId: string;
  patientId: string;
  appointmentId?: string | null;
  encounterType: EncounterKind;
  status: "open" | "closed";
  startedAt: string;
  endedAt?: string | null;
  chiefComplaint?: string | null;
  summary?: string | null;
}

export interface VitalSigns extends TraceabilityFields {
  id?: string;
  ownerUserId?: string;
  encounterId: string;
  patientId: string;
  recordedAt: string;
  temperatureC?: number | null;
  heartRate?: number | null;
  respiratoryRate?: number | null;
  systolic?: number | null;
  diastolic?: number | null;
  oxygenSaturation?: number | null;
  glucose?: number | null;
  painScale?: number | null;
  weightKg?: number | null;
  heightCm?: number | null;
  bmi?: number | null;
  meanArterialPressure?: number | null;
  notes?: string | null;
}

export interface MedicalAssessment extends TraceabilityFields {
  id?: string;
  ownerUserId?: string;
  encounterId: string;
  chiefComplaint: string;
  currentIllness: string;
  systemsReview?: string | null;
  background?: string | null;
  physicalExam?: string | null;
  diagnosticImpression?: string | null;
  therapeuticPlan?: string | null;
  indications?: string | null;
  followUp?: string | null;
}

export interface NursingAssessment extends TraceabilityFields {
  id?: string;
  ownerUserId?: string;
  encounterId: string;
  careReason: string;
  painNotes?: string | null;
  consciousness?: string | null;
  mobility?: string | null;
  skinAndMucosa?: string | null;
  elimination?: string | null;
  nutritionHydration?: string | null;
  devices?: string | null;
  risks?: string | null;
  observations?: string | null;
  suggestionIds?: string[];
  selectedDiagnoses?: string[];
}

export interface Diagnosis extends TraceabilityFields {
  id?: string;
  ownerUserId?: string;
  encounterId: string;
  source: "medical" | "nursing";
  code?: string | null;
  label: string;
  isPrimary: boolean;
  notes?: string | null;
}

export interface Procedure extends TraceabilityFields {
  id?: string;
  ownerUserId?: string;
  encounterId: string;
  name: string;
  performedAt: string;
  responsibleProfessional?: string | null;
  materials?: string[];
  result?: string | null;
  notes?: string | null;
}

export interface ExamOrder extends TraceabilityFields {
  id?: string;
  ownerUserId?: string;
  encounterId: string;
  category: ExamCategory;
  examName: string;
  instructions?: string | null;
  status: ExamStatus;
  orderedAt: string;
  reviewedAt?: string | null;
}

export interface ExamResult extends TraceabilityFields {
  id?: string;
  ownerUserId?: string;
  examOrderId: string;
  encounterId: string;
  resultSummary?: string | null;
  interpretation?: string | null;
  status: ExamStatus;
}

export interface Attachment extends TraceabilityFields {
  id?: string;
  ownerUserId?: string;
  patientId?: string | null;
  encounterId?: string | null;
  examOrderId?: string | null;
  bucket: string;
  path: string;
  fileName: string;
  mimeType: string;
  category: AttachmentCategory;
}

export interface ClinicalNote extends TraceabilityFields {
  id?: string;
  ownerUserId?: string;
  encounterId: string;
  noteKind: "general" | "evolution" | "nursing_followup" | "medical_followup";
  content: string;
}

export interface PatientAccess extends TraceabilityFields {
  id: string;
  patientId: string;
  ownerUserId: string;
  sharedWithUserId: string;
  permissionLevel: PermissionLevel;
  status: AccessStatus;
  expiresAt?: string | null;
  patient?: Patient;
  ownerProfile?: Profile | null;
  sharedWithProfile?: Profile | null;
}

export interface PatientAccessAudit extends AuditFields {
  id: string;
  patientAccessId: string;
  action: string;
  performedBy: string;
  targetUserId?: string | null;
  metadata?: Record<string, unknown> | null;
}

export interface ProfessionalDirectoryEntry {
  id: string;
  firstName: string;
  lastName: string;
  profession: string;
  specialty?: string | null;
  email: string;
}

export interface NursingSuggestion {
  id: string;
  label: string;
  rationale: string;
  suggestedOutcomes: string[];
  suggestedInterventions: string[];
}

export interface CarePlan {
  id?: string;
  encounterId: string;
  diagnosis: string;
  relatedFactors: string[];
  observedCharacteristics: string[];
  expectedOutcomes: string[];
  interventions: string[];
  activities: string[];
  reevaluationDate?: string | null;
  evolution?: string | null;
}

export interface DashboardSnapshot {
  todayAppointments: number;
  pendingAppointments: number;
  activePatients: number;
  openEncounters: number;
}
