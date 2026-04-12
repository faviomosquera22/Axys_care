import type { AppointmentStatus, AppointmentType, UserRole } from "@axyscare/core-types";

export const documentTypes = ["cedula", "pasaporte", "dni", "otro"] as const;
export const sexOptions = ["femenino", "masculino", "intersexual", "no_especificado"] as const;
export const genderOptions = ["mujer", "hombre", "no_binario", "prefiere_no_decir"] as const;

export const specialties = [
  "Medicina general",
  "Enfermería clínica",
  "Psicología clínica",
  "Nutrición clínica",
  "Nutrición deportiva",
  "Nutrición pediátrica",
  "Nutrición renal",
  "Nutrición oncológica",
  "Pediatría",
  "Ginecología",
  "Medicina interna",
  "Cardiología",
  "Medicina familiar",
  "Emergencias",
  "Salud mental",
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

export type DiagnosisCatalogEntry = {
  code: string;
  label: string;
  audience: UserRole[];
};

export type ExamCatalogEntry = {
  category: "laboratorio" | "imagen" | "estudio_especial";
  label: string;
  panel?: string;
};

export type MedicationCatalogEntry = {
  name: string;
  presentation: string;
  commonDose?: string;
};

export type NursingCareCatalogEntry = {
  id: string;
  label: string;
  outcomes: string[];
  interventions: string[];
  signs?: string[];
};

export const examCatalog: ExamCatalogEntry[] = [
  { category: "laboratorio", panel: "hematologia", label: "Biometría hemática completa" },
  { category: "laboratorio", panel: "hematologia", label: "Velocidad de eritrosedimentación" },
  { category: "laboratorio", panel: "hematologia", label: "Proteína C reactiva" },
  { category: "laboratorio", panel: "quimica", label: "Glucosa basal" },
  { category: "laboratorio", panel: "quimica", label: "Hemoglobina glicosilada" },
  { category: "laboratorio", panel: "quimica", label: "Perfil lipídico" },
  { category: "laboratorio", panel: "quimica", label: "Urea y creatinina" },
  { category: "laboratorio", panel: "quimica", label: "Electrolitos séricos" },
  { category: "laboratorio", panel: "hepatico", label: "Perfil hepático" },
  { category: "laboratorio", panel: "endocrino", label: "TSH" },
  { category: "laboratorio", panel: "endocrino", label: "T4 libre" },
  { category: "laboratorio", panel: "orina", label: "Uroanálisis" },
  { category: "laboratorio", panel: "orina", label: "Urocultivo" },
  { category: "laboratorio", panel: "microbiologia", label: "Coprológico" },
  { category: "laboratorio", panel: "microbiologia", label: "Coprocultivo" },
  { category: "laboratorio", panel: "microbiologia", label: "Prueba rápida de influenza" },
  { category: "laboratorio", panel: "microbiologia", label: "Prueba rápida de COVID-19" },
  { category: "laboratorio", panel: "cardiometabolico", label: "Troponina" },
  { category: "imagen", panel: "radiologia", label: "Radiografía de tórax" },
  { category: "imagen", panel: "radiologia", label: "Radiografía de extremidad" },
  { category: "imagen", panel: "radiologia", label: "Radiografía de columna" },
  { category: "imagen", panel: "ecografia", label: "Ecografía abdominal" },
  { category: "imagen", panel: "ecografia", label: "Ecografía pélvica" },
  { category: "imagen", panel: "ecografia", label: "Ecografía obstétrica" },
  { category: "imagen", panel: "tomografia", label: "Tomografía de cráneo" },
  { category: "imagen", panel: "tomografia", label: "Tomografía de tórax" },
  { category: "imagen", panel: "resonancia", label: "Resonancia magnética cerebral" },
  { category: "imagen", panel: "resonancia", label: "Resonancia magnética de columna" },
  { category: "estudio_especial", panel: "cardiologia", label: "Electrocardiograma" },
  { category: "estudio_especial", panel: "cardiologia", label: "Holter 24 horas" },
  { category: "estudio_especial", panel: "cardiologia", label: "Ecocardiograma" },
  { category: "estudio_especial", panel: "neumologia", label: "Espirometría" },
  { category: "estudio_especial", panel: "gastro", label: "Endoscopia digestiva alta" },
  { category: "estudio_especial", panel: "gastro", label: "Colonoscopia" },
  { category: "estudio_especial", panel: "neurologia", label: "Electroencefalograma" },
  { category: "estudio_especial", panel: "obstetricia", label: "Monitoreo fetal" },
];

export const frequentExams = examCatalog.slice(0, 10).map((item) => item.label);

export const frequentProcedures = [
  "Curación simple",
  "Curación avanzada",
  "Retiro de suturas",
  "Nebulización",
  "Canalización periférica",
  "Administración intramuscular",
  "Lavado de herida",
  "Sutura simple",
];

export const medicationCatalog: MedicationCatalogEntry[] = [
  { name: "Paracetamol", presentation: "Tableta 500 mg", commonDose: "1 tableta cada 8 horas" },
  { name: "Paracetamol", presentation: "Suspensión 120 mg/5 ml", commonDose: "Según peso y edad" },
  { name: "Ibuprofeno", presentation: "Tableta 400 mg", commonDose: "1 tableta cada 8 horas con alimentos" },
  { name: "Ibuprofeno", presentation: "Suspensión 100 mg/5 ml", commonDose: "Según peso y edad" },
  { name: "Omeprazol", presentation: "Cápsula 20 mg", commonDose: "1 cápsula antes del desayuno" },
  { name: "Amoxicilina", presentation: "Cápsula 500 mg", commonDose: "1 cápsula cada 8 horas" },
  { name: "Amoxicilina", presentation: "Suspensión 250 mg/5 ml", commonDose: "Según prescripción" },
  { name: "Amoxicilina + ácido clavulánico", presentation: "Tableta 875/125 mg", commonDose: "1 tableta cada 12 horas" },
  { name: "Loratadina", presentation: "Tableta 10 mg", commonDose: "1 tableta al día" },
  { name: "Losartán", presentation: "Tableta 50 mg", commonDose: "1 tableta al día" },
  { name: "Metformina", presentation: "Tableta 850 mg", commonDose: "1 tableta cada 12 horas" },
  { name: "Salbutamol", presentation: "Inhalador 100 mcg", commonDose: "2 puff según necesidad" },
  { name: "Amlodipino", presentation: "Tableta 5 mg", commonDose: "1 tableta al día" },
  { name: "Enalapril", presentation: "Tableta 10 mg", commonDose: "1 tableta cada 12 horas" },
  { name: "Azitromicina", presentation: "Tableta 500 mg", commonDose: "1 tableta al día" },
  { name: "Cefalexina", presentation: "Cápsula 500 mg", commonDose: "1 cápsula cada 6 horas" },
  { name: "Ciprofloxacino", presentation: "Tableta 500 mg", commonDose: "1 tableta cada 12 horas" },
  { name: "Diclofenaco", presentation: "Tableta 50 mg", commonDose: "1 tableta cada 8 horas" },
  { name: "Naproxeno", presentation: "Tableta 550 mg", commonDose: "1 tableta cada 12 horas" },
  { name: "Prednisona", presentation: "Tableta 20 mg", commonDose: "Según esquema" },
  { name: "Dexametasona", presentation: "Ampolla 4 mg/ml", commonDose: "Según prescripción" },
  { name: "Furosemida", presentation: "Tableta 40 mg", commonDose: "1 tableta al día" },
  { name: "Hidroclorotiazida", presentation: "Tableta 25 mg", commonDose: "1 tableta al día" },
  { name: "Atorvastatina", presentation: "Tableta 20 mg", commonDose: "1 tableta en la noche" },
  { name: "Levotiroxina", presentation: "Tableta 100 mcg", commonDose: "1 tableta en ayunas" },
  { name: "Insulina NPH", presentation: "Frasco 100 UI/ml", commonDose: "Según control glucémico" },
  { name: "Insulina regular", presentation: "Frasco 100 UI/ml", commonDose: "Según control glucémico" },
  { name: "Clonazepam", presentation: "Tableta 0.5 mg", commonDose: "Según indicación médica" },
  { name: "Sertralina", presentation: "Tableta 50 mg", commonDose: "1 tableta al día" },
  { name: "Escitalopram", presentation: "Tableta 10 mg", commonDose: "1 tableta al día" },
  { name: "Fluoxetina", presentation: "Cápsula 20 mg", commonDose: "1 cápsula al día" },
  { name: "Metoclopramida", presentation: "Tableta 10 mg", commonDose: "1 tableta cada 8 horas" },
  { name: "Ondansetrón", presentation: "Tableta 8 mg", commonDose: "1 tableta cada 12 horas" },
  { name: "Ambroxol", presentation: "Jarabe 30 mg/5 ml", commonDose: "10 ml cada 8 horas" },
  { name: "Acetilcisteína", presentation: "Sobre 600 mg", commonDose: "1 sobre al día" },
  { name: "Clorfenamina", presentation: "Tableta 4 mg", commonDose: "1 tableta cada 8 horas" },
  { name: "Cetirizina", presentation: "Tableta 10 mg", commonDose: "1 tableta al día" },
  { name: "Nitrofurantoína", presentation: "Cápsula 100 mg", commonDose: "1 cápsula cada 12 horas" },
  { name: "Trimetoprim sulfametoxazol", presentation: "Tableta 160/800 mg", commonDose: "1 tableta cada 12 horas" },
  { name: "Mupirocina", presentation: "Ungüento 2%", commonDose: "Aplicar 2 a 3 veces al día" },
  { name: "Clotrimazol", presentation: "Crema 1%", commonDose: "Aplicar cada 12 horas" },
  { name: "Ketoconazol", presentation: "Tableta 200 mg", commonDose: "Según indicación médica" },
  { name: "Sulfato ferroso", presentation: "Tableta 300 mg", commonDose: "1 tableta al día" },
  { name: "Ácido fólico", presentation: "Tableta 1 mg", commonDose: "1 tableta al día" },
  { name: "Calcio + vitamina D", presentation: "Tableta", commonDose: "1 tableta al día" },
];

export const frequentMedications = medicationCatalog.map((item) => item.name);

export const icd10Catalog: DiagnosisCatalogEntry[] = [
  { code: "J06.9", label: "Infección aguda de vías respiratorias superiores, no especificada", audience: ["medico", "profesional_mixto"] },
  { code: "I10", label: "Hipertensión esencial primaria", audience: ["medico", "profesional_mixto"] },
  { code: "E11.9", label: "Diabetes mellitus tipo 2 sin complicaciones", audience: ["medico", "profesional_mixto"] },
  { code: "N39.0", label: "Infección de vías urinarias, sitio no especificado", audience: ["medico", "profesional_mixto"] },
  { code: "M54.5", label: "Lumbalgia", audience: ["medico", "profesional_mixto"] },
  { code: "R50.9", label: "Fiebre, no especificada", audience: ["medico", "profesional_mixto"] },
  { code: "K29.7", label: "Gastritis, no especificada", audience: ["medico", "profesional_mixto"] },
  { code: "A09.9", label: "Gastroenteritis y colitis de origen infeccioso no especificado", audience: ["medico", "profesional_mixto"] },
  { code: "J45.9", label: "Asma, no especificada", audience: ["medico", "profesional_mixto"] },
  { code: "F41.1", label: "Trastorno de ansiedad generalizada", audience: ["medico", "profesional_mixto", "psicologo"] },
];

export const psychologyCatalog = [
  {
    code: "PSY-ANX",
    label: "Síntomas compatibles con ansiedad clínica",
    audience: ["psicologo", "profesional_mixto"] as UserRole[],
  },
  {
    code: "PSY-DEP",
    label: "Síntomas compatibles con episodio depresivo",
    audience: ["psicologo", "profesional_mixto"] as UserRole[],
  },
  {
    code: "PSY-INS",
    label: "Alteración del sueño con impacto funcional",
    audience: ["psicologo", "profesional_mixto"] as UserRole[],
  },
  {
    code: "PSY-STR",
    label: "Respuesta clínica asociada a estrés agudo",
    audience: ["psicologo", "profesional_mixto"] as UserRole[],
  },
] as const;

export const nutritionCatalog = [
  {
    code: "NUT-OB1",
    label: "Exceso de ingesta energética con objetivo de reducción ponderal",
    audience: ["nutricion", "profesional_mixto"] as UserRole[],
  },
  {
    code: "NUT-DM2",
    label: "Plan de alimentación para diabetes mellitus tipo 2",
    audience: ["nutricion", "profesional_mixto"] as UserRole[],
  },
  {
    code: "NUT-DLP",
    label: "Intervención nutricional para dislipidemia",
    audience: ["nutricion", "profesional_mixto"] as UserRole[],
  },
  {
    code: "NUT-HTA",
    label: "Manejo dietético para hipertensión arterial",
    audience: ["nutricion", "profesional_mixto"] as UserRole[],
  },
  {
    code: "NUT-SGI",
    label: "Orientación nutricional para síntomas gastrointestinales",
    audience: ["nutricion", "profesional_mixto"] as UserRole[],
  },
] as const;

export const internalNursingSuggestionCatalog: NursingCareCatalogEntry[] = [
  {
    id: "hydration-risk",
    label: "Riesgo de hidratación insuficiente",
    signs: ["Mucosas secas", "Baja ingesta oral", "Balance hídrico negativo"],
    outcomes: ["Balance hídrico estable", "Mucosas hidratadas"],
    interventions: ["Monitorizar ingesta", "Reforzar hidratación oral"],
  },
  {
    id: "acute-pain-watch",
    label: "Dolor agudo en observación",
    signs: ["Escala de dolor elevada", "Gestos de dolor", "Limitación funcional"],
    outcomes: ["Disminución del dolor", "Mayor confort"],
    interventions: ["Revalorar escala de dolor", "Aplicar medidas de alivio"],
  },
  {
    id: "oxygenation-watch",
    label: "Vigilancia de oxigenación comprometida",
    signs: ["SatO2 disminuida", "Disnea", "Trabajo respiratorio aumentado"],
    outcomes: ["Saturación estable", "Trabajo respiratorio adecuado"],
    interventions: ["Control de saturación", "Valorar necesidad de derivación"],
  },
  {
    id: "skin-integrity-risk",
    label: "Riesgo de deterioro de la integridad cutánea",
    signs: ["Herida activa", "Curación repetida", "Movilidad limitada"],
    outcomes: ["Piel íntegra", "Herida en proceso de cicatrización"],
    interventions: ["Valorar bordes y exudado", "Mantener técnica aséptica"],
  },
] as const;
