import type { AppointmentStatus, AppointmentType } from "@axyscare/core-types";

export const documentTypes = ["cedula", "pasaporte", "dni", "otro"] as const;
export const sexOptions = ["femenino", "masculino", "intersexual", "no_especificado"] as const;
export const genderOptions = ["mujer", "hombre", "no_binario", "prefiere_no_decir"] as const;

export const specialties = [
  "Medicina general",
  "Enfermería clínica",
  "Pediatría",
  "Ginecología",
  "Medicina interna",
  "Cardiología",
  "Medicina familiar",
  "Emergencias",
] as const;

export const appointmentTypes: AppointmentType[] = [
  "presencial",
  "teleconsulta",
  "control",
  "procedimiento",
  "curacion",
  "valoracion_enfermeria",
  "visita_domiciliaria",
];

export const appointmentStatuses: AppointmentStatus[] = [
  "programada",
  "confirmada",
  "atendida",
  "cancelada",
  "no_asistio",
];

export const frequentExams = [
  "Biometría hemática",
  "Glucosa",
  "Perfil lipídico",
  "Uroanálisis",
  "Radiografía de tórax",
  "Electrocardiograma",
  "Ecografía abdominal",
];

export const frequentProcedures = [
  "Curación simple",
  "Retiro de suturas",
  "Nebulización",
  "Canalización periférica",
  "Administración intramuscular",
];

export const frequentMedications = [
  "Paracetamol",
  "Ibuprofeno",
  "Omeprazol",
  "Amoxicilina",
  "Loratadina",
];

export const icd10Catalog = [
  { code: "J06.9", label: "Infección aguda de vías respiratorias superiores, no especificada" },
  { code: "I10", label: "Hipertensión esencial primaria" },
  { code: "E11.9", label: "Diabetes mellitus tipo 2 sin complicaciones" },
  { code: "N39.0", label: "Infección de vías urinarias, sitio no especificado" },
  { code: "M54.5", label: "Lumbalgia" },
  { code: "R50.9", label: "Fiebre, no especificada" },
] as const;

export const internalNursingSuggestionCatalog = [
  {
    id: "hydration-risk",
    label: "Riesgo de hidratación insuficiente",
    outcomes: ["Balance hídrico estable", "Mucosas hidratadas"],
    interventions: ["Monitorizar ingesta", "Reforzar hidratación oral"],
  },
  {
    id: "acute-pain-watch",
    label: "Dolor agudo en observación",
    outcomes: ["Disminución del dolor", "Mayor confort"],
    interventions: ["Revalorar escala de dolor", "Aplicar medidas de alivio"],
  },
  {
    id: "oxygenation-watch",
    label: "Vigilancia de oxigenación comprometida",
    outcomes: ["Saturación estable", "Trabajo respiratorio adecuado"],
    interventions: ["Control de saturación", "Valorar necesidad de derivación"],
  },
] as const;

