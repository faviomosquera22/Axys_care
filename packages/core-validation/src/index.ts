import { calculateBMI, calculateMAP } from "@axyscare/core-clinical";
import { z } from "zod";

const assetUrlSchema = z
  .string()
  .refine((value) => value === "" || value.startsWith("data:") || /^https?:\/\//.test(value), {
    message: "Debe ser una URL válida o un archivo embebido.",
  })
  .optional()
  .nullable();

export const loginSchema = z.object({
  email: z.email(),
  password: z.string().min(8),
});

export const professionalProfileSchema = z.object({
  firstName: z.string().min(2),
  lastName: z.string().min(2),
  role: z.enum(["admin", "medico", "psicologo", "enfermeria", "profesional_mixto"]),
  profession: z.string().min(2),
  specialty: z.string().optional().nullable(),
  professionalLicense: z.string().min(3),
  phone: z.string().optional().nullable(),
  email: z.email(),
  professionalAddress: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  shortBio: z.string().max(500).optional().nullable(),
  signatureUrl: assetUrlSchema,
  sealUrl: assetUrlSchema,
  logoUrl: assetUrlSchema,
  avatarUrl: assetUrlSchema,
});

export const patientSchema = z.object({
  firstName: z.string().min(2),
  lastName: z.string().min(2),
  documentType: z.string().min(2),
  documentNumber: z.string().min(3),
  birthDate: z.string().min(10),
  sex: z.string().min(2),
  gender: z.string().optional().nullable(),
  maritalStatus: z.string().optional().nullable(),
  occupation: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  email: z.email().optional().or(z.literal("")).nullable(),
  bloodType: z.string().optional().nullable(),
  allergies: z.array(z.string()).default([]),
  relevantHistory: z.string().optional().nullable(),
  insurance: z.string().optional().nullable(),
  emergencyContact: z
    .object({
      name: z.string().optional(),
      relation: z.string().optional(),
      phone: z.string().optional(),
    })
    .optional()
    .nullable(),
});

export const appointmentSchema = z
  .object({
    patientId: z.string().uuid(),
    professionalId: z.string().uuid().optional(),
    startAt: z.string().min(10),
    endAt: z.string().min(10),
    reason: z.string().min(3),
    type: z.enum([
      "presencial",
      "teleconsulta",
      "control",
      "procedimiento",
      "curacion",
      "valoracion_enfermeria",
      "visita_domiciliaria",
    ]),
    modality: z.enum(["presencial", "virtual", "domicilio"]),
    status: z.enum(["programada", "confirmada", "atendida", "cancelada", "no_asistio"]),
    notes: z.string().optional().nullable(),
    meetLink: z.url().optional().or(z.literal("")).nullable(),
  })
  .refine((data) => new Date(data.endAt) > new Date(data.startAt), {
    message: "La cita debe terminar después de iniciar.",
    path: ["endAt"],
  });

export const encounterSchema = z.object({
  patientId: z.string().uuid(),
  appointmentId: z.string().uuid().optional().nullable(),
  encounterType: z.enum(["medical", "nursing", "mixed"]),
  chiefComplaint: z.string().min(3),
  startedAt: z.string().min(10),
});

export const vitalSignsSchema = z
  .object({
    encounterId: z.string().uuid(),
    patientId: z.string().uuid(),
    recordedAt: z.string().min(10),
    temperatureC: z.coerce.number().min(30).max(45).optional().nullable(),
    heartRate: z.coerce.number().min(20).max(250).optional().nullable(),
    respiratoryRate: z.coerce.number().min(5).max(80).optional().nullable(),
    systolic: z.coerce.number().min(40).max(260).optional().nullable(),
    diastolic: z.coerce.number().min(30).max(180).optional().nullable(),
    oxygenSaturation: z.coerce.number().min(40).max(100).optional().nullable(),
    glucose: z.coerce.number().min(20).max(600).optional().nullable(),
    painScale: z.coerce.number().min(0).max(10).optional().nullable(),
    weightKg: z.coerce.number().min(1).max(400).optional().nullable(),
    heightCm: z.coerce.number().min(30).max(250).optional().nullable(),
    notes: z.string().optional().nullable(),
  })
  .transform((data) => ({
    ...data,
    bmi: calculateBMI(data.weightKg, data.heightCm),
    meanArterialPressure: calculateMAP(data.systolic, data.diastolic),
  }));

export const medicalAssessmentSchema = z.object({
  encounterId: z.string().uuid(),
  chiefComplaint: z.string().min(3),
  currentIllness: z.string().min(3),
  systemsReview: z.string().optional().nullable(),
  background: z.string().optional().nullable(),
  physicalExam: z.string().optional().nullable(),
  diagnosticImpression: z.string().optional().nullable(),
  therapeuticPlan: z.string().optional().nullable(),
  indications: z.string().optional().nullable(),
  followUp: z.string().optional().nullable(),
});

export const nursingAssessmentSchema = z.object({
  encounterId: z.string().uuid(),
  careReason: z.string().min(3),
  painNotes: z.string().optional().nullable(),
  consciousness: z.string().optional().nullable(),
  mobility: z.string().optional().nullable(),
  skinAndMucosa: z.string().optional().nullable(),
  elimination: z.string().optional().nullable(),
  nutritionHydration: z.string().optional().nullable(),
  devices: z.string().optional().nullable(),
  risks: z.string().optional().nullable(),
  observations: z.string().optional().nullable(),
  suggestionIds: z.array(z.string()).default([]),
  selectedDiagnoses: z.array(z.string()).default([]),
});

export const procedureSchema = z.object({
  encounterId: z.string().uuid(),
  name: z.string().min(2),
  performedAt: z.string().min(10),
  responsibleProfessional: z.string().optional().nullable(),
  materials: z.array(z.string()).default([]),
  result: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export const examOrderSchema = z.object({
  encounterId: z.string().uuid(),
  category: z.enum(["laboratorio", "imagen", "estudio_especial"]),
  examName: z.string().min(2),
  instructions: z.string().optional().nullable(),
  status: z.enum(["pendiente", "recibido", "revisado"]).default("pendiente"),
  orderedAt: z.string().min(10),
});

export const medicationOrderSchema = z.object({
  encounterId: z.string().uuid(),
  medicationName: z.string().min(2),
  presentation: z.string().optional().nullable(),
  dosage: z.string().optional().nullable(),
  route: z.string().optional().nullable(),
  frequency: z.string().optional().nullable(),
  duration: z.string().optional().nullable(),
  instructions: z.string().optional().nullable(),
  prescriberRole: z.enum(["medico", "profesional_mixto"]),
});

export const printSchema = z.object({
  encounterId: z.string().uuid(),
  includeMedicalSection: z.boolean().default(true),
  includeNursingSection: z.boolean().default(true),
  includeVitals: z.boolean().default(true),
});

export const patientShareSchema = z
  .object({
    patientId: z.string().uuid(),
    sharedWithUserId: z.string().uuid(),
    permissionLevel: z.enum(["read", "edit"]),
    status: z.enum(["pending", "active", "revoked", "expired"]).default("active"),
    expiresAt: z.string().datetime().optional().nullable(),
  })
  .refine((data) => data.sharedWithUserId !== "", {
    message: "Selecciona un profesional válido.",
    path: ["sharedWithUserId"],
  });

export type LoginInput = z.infer<typeof loginSchema>;
export type ProfessionalProfileInput = z.infer<typeof professionalProfileSchema>;
export type PatientInput = z.infer<typeof patientSchema>;
export type AppointmentInput = z.infer<typeof appointmentSchema>;
export type EncounterInput = z.infer<typeof encounterSchema>;
export type VitalSignsInput = z.infer<typeof vitalSignsSchema>;
export type MedicalAssessmentInput = z.infer<typeof medicalAssessmentSchema>;
export type NursingAssessmentInput = z.infer<typeof nursingAssessmentSchema>;
export type MedicationOrderInput = z.infer<typeof medicationOrderSchema>;
export type PatientShareInput = z.infer<typeof patientShareSchema>;
