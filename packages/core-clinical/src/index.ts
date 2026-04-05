import type {
  Encounter,
  MedicalAssessment,
  NursingAssessment,
  NursingSuggestion,
  Patient,
  VitalSigns,
} from "@axyscare/core-types";

export function calculateAge(birthDate: string, referenceDate = new Date()): number {
  const birth = new Date(`${birthDate}T00:00:00`);
  let age = referenceDate.getFullYear() - birth.getFullYear();
  const monthDiff = referenceDate.getMonth() - birth.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && referenceDate.getDate() < birth.getDate())) {
    age -= 1;
  }

  return Math.max(age, 0);
}

export function calculateBMI(weightKg?: number | null, heightCm?: number | null): number | null {
  if (!weightKg || !heightCm) return null;
  const meters = heightCm / 100;
  if (meters <= 0) return null;
  return Number((weightKg / (meters * meters)).toFixed(2));
}

export function calculateMAP(systolic?: number | null, diastolic?: number | null): number | null {
  if (!systolic || !diastolic) return null;
  return Number(((systolic + 2 * diastolic) / 3).toFixed(2));
}

export function calculateBodySurfaceArea(weightKg?: number | null, heightCm?: number | null): number | null {
  if (!weightKg || !heightCm) return null;
  return Number(Math.sqrt((weightKg * heightCm) / 3600).toFixed(2));
}

export function calculateHydricBalance(inputsMl: number, outputsMl: number): number {
  return inputsMl - outputsMl;
}

export function classifyBloodPressure(
  systolic?: number | null,
  diastolic?: number | null,
): "normal" | "elevada" | "hta-estadio-1" | "hta-estadio-2" | "crisis" | "sin-datos" {
  if (!systolic || !diastolic) return "sin-datos";
  if (systolic >= 180 || diastolic >= 120) return "crisis";
  if (systolic >= 140 || diastolic >= 90) return "hta-estadio-2";
  if (systolic >= 130 || diastolic >= 80) return "hta-estadio-1";
  if (systolic >= 120 && diastolic < 80) return "elevada";
  return "normal";
}

export function classifyPainScale(value?: number | null): "sin-dolor" | "leve" | "moderado" | "severo" | "sin-datos" {
  if (value === null || value === undefined) return "sin-datos";
  if (value <= 0) return "sin-dolor";
  if (value <= 3) return "leve";
  if (value <= 6) return "moderado";
  return "severo";
}

export function validateVitalSignsRanges(vitals: VitalSigns): string[] {
  const warnings: string[] = [];

  if (vitals.temperatureC && (vitals.temperatureC < 35 || vitals.temperatureC > 39.5)) {
    warnings.push("Temperatura fuera de rango esperado.");
  }
  if (vitals.heartRate && (vitals.heartRate < 45 || vitals.heartRate > 130)) {
    warnings.push("Frecuencia cardiaca fuera de rango esperado.");
  }
  if (vitals.respiratoryRate && (vitals.respiratoryRate < 10 || vitals.respiratoryRate > 30)) {
    warnings.push("Frecuencia respiratoria fuera de rango esperado.");
  }
  if (vitals.oxygenSaturation && vitals.oxygenSaturation < 92) {
    warnings.push("Saturación de oxígeno baja.");
  }
  if (vitals.systolic && vitals.diastolic) {
    const bpClass = classifyBloodPressure(vitals.systolic, vitals.diastolic);
    if (bpClass === "hta-estadio-2" || bpClass === "crisis") {
      warnings.push("Presión arterial requiere atención prioritaria.");
    }
  }

  return warnings;
}

export function generateNursingSuggestionsFromRules(vitals: VitalSigns, notes?: string | null): NursingSuggestion[] {
  const suggestions: NursingSuggestion[] = [];

  if ((vitals.oxygenSaturation ?? 100) < 92) {
    suggestions.push({
      id: "oxygenation-watch",
      label: "Vigilancia de oxigenación comprometida",
      rationale: "La saturación registrada sugiere necesidad de seguimiento respiratorio.",
      suggestedOutcomes: ["Saturación estable", "Disnea controlada"],
      suggestedInterventions: ["Monitorizar saturación", "Registrar patrón respiratorio"],
    });
  }

  if ((vitals.painScale ?? 0) >= 7 || notes?.toLowerCase().includes("dolor")) {
    suggestions.push({
      id: "acute-pain-watch",
      label: "Dolor agudo en observación",
      rationale: "Escala de dolor elevada o referencia clínica compatible.",
      suggestedOutcomes: ["Dolor reducido", "Mayor tolerancia funcional"],
      suggestedInterventions: ["Revalorar dolor", "Aplicar medidas no farmacológicas"],
    });
  }

  if ((vitals.temperatureC ?? 0) >= 38 || (vitals.heartRate ?? 0) > 110) {
    suggestions.push({
      id: "hydration-risk",
      label: "Riesgo de hidratación insuficiente",
      rationale: "Fiebre o taquicardia pueden incrementar pérdidas y requerir vigilancia.",
      suggestedOutcomes: ["Balance hídrico adecuado", "Signos de perfusión estables"],
      suggestedInterventions: ["Monitorizar ingesta", "Educar sobre hidratación"],
    });
  }

  return suggestions;
}

export function buildEncounterSummary(params: {
  patient: Patient;
  encounter: Encounter;
  vitals?: VitalSigns | null;
  medical?: MedicalAssessment | null;
  nursing?: NursingAssessment | null;
}): string {
  const { patient, encounter, vitals, medical, nursing } = params;
  const parts = [
    `${patient.firstName} ${patient.lastName}`,
    `Atención ${encounter.encounterType} iniciada el ${new Date(encounter.startedAt).toLocaleString()}.`,
  ];

  if (encounter.chiefComplaint) parts.push(`Motivo: ${encounter.chiefComplaint}`);
  if (vitals?.temperatureC || vitals?.heartRate || vitals?.systolic) {
    parts.push(
      `Signos vitales: T ${vitals.temperatureC ?? "-"} °C, FC ${vitals.heartRate ?? "-"}, PA ${vitals.systolic ?? "-"}/${vitals.diastolic ?? "-"}.`,
    );
  }
  if (medical?.diagnosticImpression) parts.push(`Impresión diagnóstica: ${medical.diagnosticImpression}`);
  if (nursing?.observations) parts.push(`Observaciones de enfermería: ${nursing.observations}`);

  return parts.join(" ");
}

