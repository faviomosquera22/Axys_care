"use client";

import { generateNursingSuggestionsFromRules } from "@axyscare/core-clinical";
import {
  examCatalog,
  icd10Catalog,
  internalNursingSuggestionCatalog,
  medicationCatalog,
  nursingBasicMedicationNames,
  nutritionCatalog,
  psychologyCatalog,
} from "@axyscare/core-catalogs";
import type {
  Encounter,
  EncounterKind,
  Patient,
  Procedure,
  Profile,
  UserRole,
} from "@axyscare/core-types";
import {
  createAttachmentRecord,
  createDiagnosis,
  createEncounter,
  createExamOrder,
  createMedicationOrder,
  createProcedure,
  getEncounter,
  getEncounterBundle,
  saveClinicalNote,
  saveMedicalAssessment,
  saveNursingAssessment,
  saveVitalSigns,
} from "@axyscare/core-db";
import {
  encounterSchema,
  medicalAssessmentSchema,
  medicationOrderSchema,
  nursingAssessmentSchema,
  type AppointmentInput,
  vitalSignsSchema,
} from "@axyscare/core-validation";
import { zodResolver } from "@hookform/resolvers/zod";
import { PDFDownloadLink } from "@react-pdf/renderer";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { Card, SectionHeading, StatusBadge } from "@axyscare/ui-shared";
import { ClinicalContextBanner } from "@/components/layout/clinical-context-banner";
import { AppointmentForm } from "@/components/forms/appointment-form";
import { FormField, FormStatusMessage } from "@/components/forms/form-ui";
import { EncounterSummaryDocument } from "@/components/pdf/encounter-summary-document";
import { downloadEncounterSummaryWord } from "@/lib/encounter-summary-word";
import { useAuth } from "@/components/providers/providers";
import { usePatientRealtime } from "@/components/realtime/use-patient-realtime";

type EncounterStage =
  | "open"
  | "vitals"
  | "assessment"
  | "records"
  | "treatment"
  | "summary";

const encounterStageMeta: Record<
  EncounterStage,
  { title: string; description: string }
> = {
  open: {
    title: "Preparación",
    description: "Aún no se ha abierto el encounter.",
  },
  vitals: {
    title: "Signos vitales",
    description: "Captura inicial del estado del paciente.",
  },
  assessment: {
    title: "Valoración clínica",
    description: "Juicio clínico y observaciones principales.",
  },
  records: {
    title: "Diagnósticos y notas",
    description: "Registro clínico y trazabilidad del episodio.",
  },
  treatment: {
    title: "Tratamiento e indicaciones",
    description: "Prescripción, cuidados y plan al paciente.",
  },
  summary: {
    title: "Resumen e impresión",
    description: "Cierre operativo y lectura final del episodio.",
  },
};

function normalizeSearch(value: string) {
  return value.trim().toLowerCase();
}

function inferDiagnosisSource(role: UserRole) {
  if (role === "enfermeria") return "nursing_pae" as const;
  if (role === "psicologo") return "psychology_dsm5_ready" as const;
  if (role === "nutricion") return "nutrition_care" as const;
  return "medical_icd10" as const;
}

function inferPlanNoteKind(role: UserRole) {
  if (role === "enfermeria") return "nursing_care_plan" as const;
  if (role === "psicologo") return "psychology_plan" as const;
  if (role === "nutricion") return "nutrition_plan" as const;
  return "patient_indications" as const;
}

function inferEncounterTypeForRole(role: UserRole): EncounterKind {
  if (role === "enfermeria") return "nursing";
  if (role === "profesional_mixto" || role === "admin") return "mixed";
  return "medical";
}

function formatEncounterTypeLabel(type: EncounterKind, role: UserRole) {
  if (role === "nutricion" && type === "medical") return "Ruta nutricional";
  if (role === "psicologo" && type === "medical") return "Ruta psicológica";
  if (type === "nursing") return "Ruta de enfermería";
  if (type === "mixed") return "Ruta mixta";
  return "Ruta médica";
}

function shouldShowDiagnosisCode(source: ReturnType<typeof inferDiagnosisSource>) {
  return source === "medical_icd10";
}

function buildSuggestedFollowUpRange(startedAt: string) {
  const baseDate = new Date(startedAt);
  baseDate.setDate(baseDate.getDate() + 7);
  baseDate.setSeconds(0, 0);
  const endDate = new Date(baseDate);
  endDate.setMinutes(endDate.getMinutes() + 30);

  return {
    startAt: baseDate.toISOString(),
    endAt: endDate.toISOString(),
  };
}

const medicationRouteOptions = [
  "Oral",
  "Sublingual",
  "Tópica",
  "Inhalatoria",
  "Nasal",
  "Oftálmica",
  "Ótica",
  "Rectal",
  "Vaginal",
  "Intramuscular",
  "Intravenosa",
  "Subcutánea",
] as const;

const medicationFrequencyOptions = [
  "Cada 4 horas",
  "Cada 6 horas",
  "Cada 8 horas",
  "Cada 12 horas",
  "Cada 24 horas",
  "Una vez al día",
  "Dos veces al día",
  "Tres veces al día",
  "Cuatro veces al día",
  "Antes de dormir",
  "Según necesidad",
] as const;

const medicationDurationOptions = [
  "1 día",
  "3 días",
  "5 días",
  "7 días",
  "10 días",
  "14 días",
  "21 días",
  "30 días",
] as const;

function inferMedicationRoute(presentation: string) {
  const normalized = presentation.toLowerCase();

  if (
    normalized.includes("tableta") ||
    normalized.includes("cápsula") ||
    normalized.includes("capsula") ||
    normalized.includes("jarabe") ||
    normalized.includes("suspensión") ||
    normalized.includes("suspension") ||
    normalized.includes("solución oral") ||
    normalized.includes("solucion oral") ||
    normalized.includes("sobres")
  ) {
    return "Oral";
  }

  if (normalized.includes("crema") || normalized.includes("gel") || normalized.includes("pomada")) {
    return "Tópica";
  }

  if (normalized.includes("spray nasal") || normalized.includes("gotas nasales")) {
    return "Nasal";
  }

  if (normalized.includes("inhalador") || normalized.includes("nebul")) {
    return "Inhalatoria";
  }

  if (normalized.includes("gotas oft")) {
    return "Oftálmica";
  }

  if (normalized.includes("gotas ót") || normalized.includes("gotas ot")) {
    return "Ótica";
  }

  if (normalized.includes("ampolla") || normalized.includes("inyectable")) {
    return "Intramuscular";
  }

  if (normalized.includes("óvulo") || normalized.includes("ovulo")) {
    return "Vaginal";
  }

  if (normalized.includes("supositorio")) {
    return "Rectal";
  }

  return "";
}

function buildDosageOptions(commonDose?: string | null) {
  return Array.from(
    new Set(
      [
        commonDose?.trim() || "",
        "5 mg",
        "10 mg",
        "20 mg",
        "25 mg",
        "40 mg",
        "50 mg",
        "100 mg",
        "200 mg",
        "400 mg",
        "500 mg",
        "600 mg",
        "800 mg",
        "1 g",
        "5 mL",
        "10 mL",
        "15 mL",
        "20 gotas",
        "1 tableta",
        "2 tabletas",
        "1 cápsula",
        "2 cápsulas",
        "1 ampolla",
        "1 puff",
        "2 puff",
      ].filter(Boolean),
    ),
  );
}

function TraceBlock({
  label,
  author,
  date,
}: {
  label: string;
  author?: string | null;
  date?: string | null;
}) {
  if (!author && !date) return null;

  return (
    <div className="meta-strip">
      <strong>{label}</strong>
      <span>
        {author ?? "Sin autor"} ·{" "}
        {date ? new Date(date).toLocaleString() : "sin fecha"}
      </span>
    </div>
  );
}

function StageButton({
  label,
  description,
  active,
  disabled,
  onClick,
}: {
  label: string;
  description: string;
  active: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={`step-button ${active ? "active" : ""}`}
      disabled={disabled}
      onClick={onClick}
    >
      <strong>{label}</strong>
      <span>{description}</span>
    </button>
  );
}

function ProgressItem({ label, done }: { label: string; done: boolean }) {
  return (
    <div className="progress-item">
      <span className={`progress-item__dot ${done ? "done" : ""}`} />
      <span>{label}</span>
    </div>
  );
}

export function EncounterWorkspace({
  patients,
  professional,
  initialPatientId,
  initialEncounterId,
  initialStage,
}: {
  patients: Patient[];
  professional?: Profile | null;
  initialPatientId?: string;
  initialEncounterId?: string;
  initialStage?: EncounterStage;
}) {
  const { client } = useAuth();
  const numberFieldOptions = {
    setValueAs: (value: string) => (value === "" ? undefined : Number(value)),
  };
  const queryClient = useQueryClient();
  const [activeEncounter, setActiveEncounter] = useState<Encounter | null>(
    null,
  );
  const [activeStage, setActiveStage] = useState<EncounterStage>(initialStage ?? "open");
  const [serverError, setServerError] = useState<string | null>(null);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [actionFeedback, setActionFeedback] = useState<{
    tone: "loading" | "success" | "error";
    message: string;
  } | null>(null);
  const [diagnosisSearch, setDiagnosisSearch] = useState("");
  const [diagnosisNotes, setDiagnosisNotes] = useState("");
  const [noteDraft, setNoteDraft] = useState("");
  const [carePlanDraft, setCarePlanDraft] = useState("");
  const [examDraft, setExamDraft] = useState({
    category: "laboratorio" as const,
    examName: "",
    instructions: "",
  });
  const [medicationDraft, setMedicationDraft] = useState({
    medicationName: "",
    presentation: "",
    dosage: "",
    route: "",
    frequency: "",
    duration: "",
    instructions: "",
  });
  const [attachmentDraft, setAttachmentDraft] = useState<{
    fileName: string;
    mimeType: string;
    category: "pdf" | "imagen" | "resultado" | "documento_escaneado";
    path: string;
  }>({
    fileName: "",
    mimeType: "application/pdf",
    category: "resultado",
    path: "",
  });
  const [procedurePhotoDraft, setProcedurePhotoDraft] = useState<{
    fileName: string;
    mimeType: string;
    path: string;
  }>({
    fileName: "",
    mimeType: "image/png",
    path: "",
  });
  const [procedureDraft, setProcedureDraft] = useState<
    Pick<Procedure, "name" | "result" | "notes">
  >({
    name: "",
    result: "",
    notes: "",
  });

  const encounterForm = useForm<any>({
    resolver: zodResolver(encounterSchema),
    defaultValues: {
      patientId: initialPatientId ?? "",
      appointmentId: null,
      encounterType: inferEncounterTypeForRole(professional?.role ?? "medico"),
      chiefComplaint: "",
      startedAt: new Date().toISOString().slice(0, 16),
    },
  });

  const vitalsForm = useForm<any>({
    resolver: zodResolver(vitalSignsSchema) as any,
    defaultValues: {
      encounterId: "",
      patientId: initialPatientId ?? "",
      recordedAt: new Date().toISOString().slice(0, 16),
      notes: "",
    },
  });

  const medicalForm = useForm<any>({
    resolver: zodResolver(medicalAssessmentSchema),
    defaultValues: {
      encounterId: "",
      chiefComplaint: "",
      currentIllness: "",
      systemsReview: "",
      background: "",
      physicalExam: "",
      diagnosticImpression: "",
      therapeuticPlan: "",
      indications: "",
      followUp: "",
    },
  });

  const nursingForm = useForm<any>({
    resolver: zodResolver(nursingAssessmentSchema) as any,
    defaultValues: {
      encounterId: "",
      careReason: "",
      painNotes: "",
      consciousness: "",
      mobility: "",
      skinAndMucosa: "",
      elimination: "",
      nutritionHydration: "",
      devices: "",
      risks: "",
      observations: "",
      suggestionIds: [],
      selectedDiagnoses: [],
    },
  });

  const selectedPatient = patients.find(
    (patient) =>
      patient.id ===
      (activeEncounter?.patientId ?? encounterForm.watch("patientId")),
  );
  const selectedEncounterType = (activeEncounter?.encounterType ??
    encounterForm.watch("encounterType")) as EncounterKind;
  const initialEncounterQuery = useQuery({
    queryKey: ["encounter", initialEncounterId],
    queryFn: () => getEncounter(client, initialEncounterId!),
    enabled: Boolean(initialEncounterId),
  });

  const encounterBundleQuery = useQuery({
    queryKey: ["encounter-bundle", activeEncounter?.id],
    queryFn: () => getEncounterBundle(client, activeEncounter!.id),
    enabled: Boolean(activeEncounter?.id),
  });

  usePatientRealtime(activeEncounter?.patientId, [
    ["encounter-bundle", activeEncounter?.id],
    ["encounters", activeEncounter?.patientId],
    ["patient", activeEncounter?.patientId],
  ]);

  useEffect(() => {
    if (activeEncounter || !initialEncounterQuery.data) return;
    setActiveEncounter(initialEncounterQuery.data);
    setLastSavedAt(
      initialEncounterQuery.data.updatedAt ??
        initialEncounterQuery.data.createdAt ??
        initialEncounterQuery.data.startedAt,
    );
  }, [activeEncounter, initialEncounterQuery.data]);

  useEffect(() => {
    if (!activeEncounter) return;
    vitalsForm.setValue("encounterId", activeEncounter.id);
    vitalsForm.setValue("patientId", activeEncounter.patientId);
    medicalForm.setValue("encounterId", activeEncounter.id);
    medicalForm.setValue(
      "chiefComplaint",
      activeEncounter.chiefComplaint ?? "",
    );
    nursingForm.setValue("encounterId", activeEncounter.id);
    if (activeStage === "open") {
      setActiveStage(initialStage && initialStage !== "open" ? initialStage : "vitals");
    }
  }, [activeEncounter, activeStage, initialStage, medicalForm, nursingForm, vitalsForm]);

  useEffect(() => {
    const bundle = encounterBundleQuery.data;
    if (!bundle) return;

    if (bundle.vitals) {
      vitalsForm.reset({
        encounterId: bundle.vitals.encounterId,
        patientId: bundle.vitals.patientId,
        recordedAt: bundle.vitals.recordedAt.slice(0, 16),
        temperatureC: bundle.vitals.temperatureC ?? undefined,
        heartRate: bundle.vitals.heartRate ?? undefined,
        respiratoryRate: bundle.vitals.respiratoryRate ?? undefined,
        systolic: bundle.vitals.systolic ?? undefined,
        diastolic: bundle.vitals.diastolic ?? undefined,
        oxygenSaturation: bundle.vitals.oxygenSaturation ?? undefined,
        glucose: bundle.vitals.glucose ?? undefined,
        painScale: bundle.vitals.painScale ?? undefined,
        weightKg: bundle.vitals.weightKg ?? undefined,
        heightCm: bundle.vitals.heightCm ?? undefined,
        notes: bundle.vitals.notes ?? "",
      });
    }

    if (bundle.medical) {
      medicalForm.reset({
        encounterId: bundle.medical.encounterId,
        chiefComplaint: bundle.medical.chiefComplaint,
        currentIllness: bundle.medical.currentIllness,
        systemsReview: bundle.medical.systemsReview ?? "",
        background: bundle.medical.background ?? "",
        physicalExam: bundle.medical.physicalExam ?? "",
        diagnosticImpression: bundle.medical.diagnosticImpression ?? "",
        therapeuticPlan: bundle.medical.therapeuticPlan ?? "",
        indications: bundle.medical.indications ?? "",
        followUp: bundle.medical.followUp ?? "",
      });
    }

    if (bundle.nursing) {
      nursingForm.reset({
        encounterId: bundle.nursing.encounterId,
        careReason: bundle.nursing.careReason,
        painNotes: bundle.nursing.painNotes ?? "",
        consciousness: bundle.nursing.consciousness ?? "",
        mobility: bundle.nursing.mobility ?? "",
        skinAndMucosa: bundle.nursing.skinAndMucosa ?? "",
        elimination: bundle.nursing.elimination ?? "",
        nutritionHydration: bundle.nursing.nutritionHydration ?? "",
        devices: bundle.nursing.devices ?? "",
        risks: bundle.nursing.risks ?? "",
        observations: bundle.nursing.observations ?? "",
        suggestionIds: bundle.nursing.suggestionIds ?? [],
        selectedDiagnoses: bundle.nursing.selectedDiagnoses ?? [],
      });
    }
  }, [encounterBundleQuery.data, medicalForm, nursingForm, vitalsForm]);

  const encounterMutation = useMutation({
    mutationFn: (values: any) =>
      createEncounter(client, {
        ...values,
        startedAt: new Date(values.startedAt).toISOString(),
      }),
    onSuccess: (encounter) => {
      setServerError(null);
      setActionFeedback({
        tone: "success",
        message: "Encuentro abierto correctamente.",
      });
      setActiveEncounter(encounter);
      setLastSavedAt(
        encounter.updatedAt ?? encounter.createdAt ?? encounter.startedAt,
      );
      queryClient.invalidateQueries({
        queryKey: ["encounters", encounter.patientId],
      });
    },
    onError: (error) => {
      const message =
        error instanceof Error
          ? error.message
          : "No se pudo abrir el encuentro.";
      setServerError(message);
      setActionFeedback({ tone: "error", message });
    },
  });

  const vitalsSnapshot = vitalsForm.watch();
  const nursingSuggestions = activeEncounter
    ? generateNursingSuggestionsFromRules(
        {
          encounterId: activeEncounter.id,
          patientId: vitalsSnapshot.patientId,
          recordedAt: vitalsSnapshot.recordedAt,
          temperatureC: vitalsSnapshot.temperatureC,
          heartRate: vitalsSnapshot.heartRate,
          respiratoryRate: vitalsSnapshot.respiratoryRate,
          systolic: vitalsSnapshot.systolic,
          diastolic: vitalsSnapshot.diastolic,
          oxygenSaturation: vitalsSnapshot.oxygenSaturation,
          glucose: vitalsSnapshot.glucose,
          painScale: vitalsSnapshot.painScale,
          weightKg: vitalsSnapshot.weightKg,
          heightCm: vitalsSnapshot.heightCm,
          notes: vitalsSnapshot.notes,
        },
        nursingForm.watch("observations"),
      )
    : [];

  const bundle = encounterBundleQuery.data;
  const supportsMedical =
    selectedEncounterType === "medical" || selectedEncounterType === "mixed";
  const supportsNursing =
    selectedEncounterType === "nursing" || selectedEncounterType === "mixed";
  const activeRole = professional?.role ?? "medico";
  const encounterTypeLabel = formatEncounterTypeLabel(selectedEncounterType, activeRole);

  useEffect(() => {
    if (activeEncounter) return;
    const inferredEncounterType = inferEncounterTypeForRole(activeRole);
    if (encounterForm.getValues("encounterType") !== inferredEncounterType) {
      encounterForm.setValue("encounterType", inferredEncounterType);
    }
  }, [activeEncounter, activeRole, encounterForm]);

  const diagnosisSource = inferDiagnosisSource(activeRole);
  const canPrescribeMedication =
    activeRole === "medico" || activeRole === "profesional_mixto" || activeRole === "enfermeria";
  const medicationCatalogForRole = useMemo(() => {
    if (activeRole !== "enfermeria") return medicationCatalog;
    return medicationCatalog.filter((item) =>
      nursingBasicMedicationNames.includes(item.name as (typeof nursingBasicMedicationNames)[number]),
    );
  }, [activeRole]);
  const diagnosisCatalog = useMemo(() => {
    if (activeRole === "enfermeria") {
      return internalNursingSuggestionCatalog.map((item) => ({
        code: item.id,
        label: item.label,
        meta: `${item.outcomes[0] ?? "Resultado esperado"} · ${item.interventions[0] ?? "Intervención sugerida"}`,
      }));
    }

    if (activeRole === "psicologo") {
      return psychologyCatalog.map((item) => ({
        code: item.code,
        label: item.label,
        meta: "Catálogo interno DSM-ready",
      }));
    }

    if (activeRole === "nutricion") {
      return nutritionCatalog.map((item) => ({
        code: item.code,
        label: item.label,
        meta: "Diagnóstico e intervención nutricional",
      }));
    }

    return icd10Catalog.map((item) => ({
      code: item.code,
      label: item.label,
      meta: "CIE-10",
    }));
  }, [activeRole]);
  const filteredDiagnosisCatalog = useMemo(() => {
    const search = normalizeSearch(diagnosisSearch);
    if (!search) return diagnosisCatalog.slice(0, 12);
    return diagnosisCatalog
      .filter((item) =>
        normalizeSearch(`${item.code} ${item.label} ${item.meta}`).includes(
          search,
        ),
      )
      .slice(0, 12);
  }, [diagnosisCatalog, diagnosisSearch]);
  const filteredExamCatalog = useMemo(() => {
    const search = normalizeSearch(examDraft.examName);
    return examCatalog
      .filter((item) => item.category === examDraft.category)
      .filter(
        (item) =>
          !search ||
          normalizeSearch(`${item.label} ${item.panel ?? ""}`).includes(search),
      )
      .slice(0, 14);
  }, [examDraft.category, examDraft.examName]);
  const filteredMedicationCatalog = useMemo(() => {
    const search = normalizeSearch(medicationDraft.medicationName);
    return medicationCatalogForRole
      .filter(
        (item) =>
          !search ||
          normalizeSearch(
            `${item.name} ${item.presentation} ${item.commonDose ?? ""}`,
          ).includes(search),
      )
      .slice(0, 10);
  }, [medicationCatalogForRole, medicationDraft.medicationName]);
  const filteredMedicationNames = useMemo(
    () => Array.from(new Set(filteredMedicationCatalog.map((item) => item.name))),
    [filteredMedicationCatalog],
  );
  const availableMedicationPresentations = useMemo(
    () =>
      medicationCatalogForRole.filter(
        (item) =>
          normalizeSearch(item.name) ===
          normalizeSearch(medicationDraft.medicationName),
      ),
    [medicationCatalogForRole, medicationDraft.medicationName],
  );
  const selectedMedicationPresentation = useMemo(
    () =>
      availableMedicationPresentations.find(
        (item) => item.presentation === medicationDraft.presentation,
      ) ?? null,
    [availableMedicationPresentations, medicationDraft.presentation],
  );
  const dosageOptions = useMemo(
    () => buildDosageOptions(selectedMedicationPresentation?.commonDose),
    [selectedMedicationPresentation?.commonDose],
  );
  const encounterAuthor =
    activeEncounter?.createdByName ??
    (professional
      ? `${professional.firstName} ${professional.lastName}`.trim()
      : "Sin autor");
  const progress = {
    encounter: Boolean(activeEncounter),
    vitals: Boolean(bundle?.vitals),
    medical: Boolean(bundle?.medical),
    nursing: Boolean(bundle?.nursing),
    records: Boolean(
      (bundle?.diagnoses?.length ?? 0) ||
      (bundle?.notes?.length ?? 0) ||
      (bundle?.procedures?.length ?? 0),
    ),
    treatment: Boolean(
      (bundle?.medicationOrders?.length ?? 0) ||
      (bundle?.notes ?? []).some((note) =>
        [
          "patient_indications",
          "nursing_care_plan",
          "psychology_plan",
          "nutrition_plan",
        ].includes(note.noteKind),
      ),
    ),
  };
  const completedBlocks = Object.values(progress).filter(Boolean).length;
  const totalBlocks = Object.keys(progress).length;
  const currentStageMeta = encounterStageMeta[activeStage];
  const hasPendingChanges = Boolean(
    encounterForm.formState.isDirty ||
    vitalsForm.formState.isDirty ||
    medicalForm.formState.isDirty ||
    nursingForm.formState.isDirty ||
    diagnosisSearch.trim() ||
    diagnosisNotes.trim() ||
    noteDraft.trim() ||
    carePlanDraft.trim() ||
    examDraft.examName.trim() ||
    examDraft.instructions.trim() ||
    medicationDraft.medicationName.trim() ||
    medicationDraft.presentation.trim() ||
    medicationDraft.dosage.trim() ||
    medicationDraft.route.trim() ||
    medicationDraft.frequency.trim() ||
    medicationDraft.duration.trim() ||
    medicationDraft.instructions.trim() ||
    procedureDraft.name.trim() ||
    (procedureDraft.result?.trim() ?? "") ||
    (procedureDraft.notes?.trim() ?? "") ||
    attachmentDraft.path ||
    procedurePhotoDraft.path,
  );
  const suggestedFollowUpRange = useMemo(
    () => buildSuggestedFollowUpRange(activeEncounter?.startedAt ?? new Date().toISOString()),
    [activeEncounter?.startedAt],
  );
  const followUpAppointmentDefaults = useMemo<Partial<AppointmentInput>>(
    () => ({
      patientId: selectedPatient?.id ?? "",
      reason:
        activeRole === "enfermeria"
          ? "Seguimiento de valoración y plan de cuidados"
          : activeRole === "psicologo"
            ? "Seguimiento terapéutico"
            : activeRole === "nutricion"
              ? "Control de seguimiento nutricional"
              : "Control y seguimiento clínico",
      type: activeRole === "enfermeria" ? "valoracion_enfermeria" : "control",
      modality: "presencial" as const,
      status: "programada" as const,
      notes: activeEncounter
        ? `Cita de seguimiento sugerida al finalizar el encounter ${activeEncounter.id.slice(0, 8)}.`
        : "",
    }),
    [activeEncounter, activeRole, selectedPatient?.id],
  );
  const guardEnabled = Boolean(activeEncounter && hasPendingChanges);
  const navigationGuardRef = useRef(guardEnabled);

  useEffect(() => {
    navigationGuardRef.current = guardEnabled;
  }, [guardEnabled]);

  useEffect(() => {
    if (!guardEnabled) return;

    const confirmationMessage =
      "Hay cambios pendientes en esta atención. Si sales ahora, podrías perder contexto clínico no guardado.";

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!navigationGuardRef.current) return;
      event.preventDefault();
      event.returnValue = "";
    };

    const handleDocumentClick = (event: MouseEvent) => {
      if (!navigationGuardRef.current || event.defaultPrevented) return;
      if (
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      )
        return;
      if (!(event.target instanceof Element)) return;

      const anchor = event.target.closest(
        "a[href]",
      ) as HTMLAnchorElement | null;
      if (!anchor) return;
      if (anchor.target === "_blank" || anchor.hasAttribute("download")) return;

      const targetUrl = new URL(anchor.href, window.location.href);
      const currentUrl = new URL(window.location.href);

      if (targetUrl.origin !== currentUrl.origin) return;
      if (
        targetUrl.pathname === currentUrl.pathname &&
        targetUrl.search === currentUrl.search
      )
        return;

      const confirmed = window.confirm(confirmationMessage);
      if (confirmed) return;

      event.preventDefault();
      event.stopPropagation();
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    document.addEventListener("click", handleDocumentClick, true);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      document.removeEventListener("click", handleDocumentClick, true);
    };
  }, [guardEnabled]);

  const invalidateBundle = () => {
    if (!activeEncounter?.id) return;
    queryClient.invalidateQueries({
      queryKey: ["encounter-bundle", activeEncounter.id],
    });
  };

  const runAction = async (
    messages: { loading: string; success: string },
    action: () => Promise<void>,
  ) => {
    setServerError(null);
    setActionFeedback({ tone: "loading", message: messages.loading });
    try {
      await action();
      setLastSavedAt(new Date().toISOString());
      setActionFeedback({ tone: "success", message: messages.success });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "No se pudo completar la acción.";
      setServerError(message);
      setActionFeedback({ tone: "error", message });
    }
  };

  const addDiagnosis = async (entry: {
    code: string | null;
    label: string;
  }) => {
    if (!activeEncounter) return;
    await createDiagnosis(client, {
      encounterId: activeEncounter.id,
      source: diagnosisSource,
      label: entry.label,
      code: entry.code,
      isPrimary: !(bundle?.diagnoses?.length ?? 0),
      notes: diagnosisNotes.trim() || null,
    });
    if (supportsNursing && diagnosisSource === "nursing_pae") {
      const currentSelected = nursingForm.getValues("selectedDiagnoses") ?? [];
      nursingForm.setValue(
        "selectedDiagnoses",
        [...new Set([...currentSelected, entry.label])],
        {
          shouldDirty: true,
        },
      );
    }
    setDiagnosisSearch("");
    setDiagnosisNotes("");
    invalidateBundle();
  };

  return (
    <div className="stack">
      <Card>
        <SectionHeading
          title="Abrir episodio clínico"
          description="La atención nace con el paciente, se materializa en un encounter y luego se completa por etapas."
        />
        {selectedPatient ? (
          <div className="patient-glance">
            <div>
              <strong>
                {selectedPatient.firstName} {selectedPatient.lastName}
              </strong>
              <p>
                {selectedPatient.documentType} {selectedPatient.documentNumber}
              </p>
            </div>
            <div className="patient-glance__meta">
              <span>
                Alergias:{" "}
                {selectedPatient.allergies?.join(", ") || "No registradas"}
              </span>
              <span>
                Antecedentes:{" "}
                {selectedPatient.relevantHistory || "Sin antecedentes cargados"}
              </span>
            </div>
          </div>
        ) : null}
        <form
          className="stack"
          onSubmit={encounterForm.handleSubmit((values) =>
            encounterMutation.mutate(values),
          )}
        >
          <div className="form-grid">
            <FormField label="Paciente">
              <select {...encounterForm.register("patientId")}>
                <option value="">Selecciona</option>
                {patients.map((patient) => (
                  <option key={patient.id} value={patient.id}>
                    {patient.firstName} {patient.lastName}
                  </option>
                ))}
              </select>
            </FormField>
            <FormField label="Inicio">
              <input
                type="datetime-local"
                {...encounterForm.register("startedAt")}
              />
            </FormField>
          </div>
          <div className="info-panel" style={{ marginTop: 0 }}>
            <strong>Ruta clínica activa</strong>
            <span>
              {encounterTypeLabel}. Se determina automáticamente según el perfil profesional para evitar aperturas inconsistentes.
            </span>
          </div>
          <FormField label="Motivo principal">
            <textarea {...encounterForm.register("chiefComplaint")} />
          </FormField>
          {actionFeedback && !activeEncounter ? (
            <FormStatusMessage
              tone={actionFeedback.tone}
              message={actionFeedback.message}
            />
          ) : null}
          {serverError ? <div className="form-error">{serverError}</div> : null}
          <button className="btn" disabled={encounterMutation.isPending}>
            {encounterMutation.isPending ? "Abriendo..." : "Abrir encuentro"}
          </button>
        </form>
      </Card>

      {activeEncounter && selectedPatient ? (
        <>
          {actionFeedback ? (
            <FormStatusMessage
              tone={actionFeedback.tone}
              message={actionFeedback.message}
            />
          ) : null}
          <ClinicalContextBanner
            patient={selectedPatient}
            encounter={activeEncounter}
            stageLabel={`${currentStageMeta.title} · ${completedBlocks}/${totalBlocks} bloques listos`}
            lastSavedAt={lastSavedAt}
            hasPendingChanges={hasPendingChanges}
            sticky={false}
            actions={
              <div className="clinical-context-banner__inline-meta">
                <span>{currentStageMeta.description}</span>
                <span>{encounterAuthor}</span>
              </div>
            }
          />
          <Card className="stepper-card">
            <div className="stepper-grid">
              <StageButton
                label="Paso 1"
                description="Signos vitales"
                active={activeStage === "vitals"}
                onClick={() => setActiveStage("vitals")}
              />
              <StageButton
                label="Paso 2"
                description="Valoración clínica"
                active={activeStage === "assessment"}
                onClick={() => setActiveStage("assessment")}
              />
              <StageButton
                label="Paso 3"
                description="Diagnósticos y notas"
                active={activeStage === "records"}
                onClick={() => setActiveStage("records")}
              />
              <StageButton
                label="Paso 4"
                description="Tratamiento e indicaciones"
                active={activeStage === "treatment"}
                onClick={() => setActiveStage("treatment")}
              />
              <StageButton
                label="Paso 5"
                description="Resumen e impresión"
                active={activeStage === "summary"}
                onClick={() => setActiveStage("summary")}
              />
            </div>
          </Card>

          <div className="workspace-grid">
            <div className="stack">
              {activeStage === "vitals" ? (
                <Card>
                  <SectionHeading
                    title="Signos vitales"
                    description="Primera captura clínica del encuentro, con IMC y PAM automáticos."
                    action={
                      <StatusBadge
                        label={`Encounter ${activeEncounter.id.slice(0, 8)}`}
                        tone="info"
                      />
                    }
                  />
                  <form
                    className="stack"
                    onSubmit={vitalsForm.handleSubmit(async (values) => {
                      await runAction(
                        {
                          loading: "Guardando signos vitales...",
                          success: "Signos vitales guardados correctamente.",
                        },
                        async () => {
                          await saveVitalSigns(client, {
                            ...values,
                            recordedAt: new Date(
                              values.recordedAt,
                            ).toISOString(),
                          });
                          vitalsForm.reset(vitalsForm.getValues());
                          invalidateBundle();
                          setActiveStage("assessment");
                        },
                      );
                    })}
                  >
                    <div className="form-grid">
                      <FormField
                        label="Temperatura"
                        error={
                          vitalsForm.formState.errors.temperatureC?.message as
                            | string
                            | undefined
                        }
                      >
                        <input
                          type="number"
                          step="0.1"
                          {...vitalsForm.register(
                            "temperatureC",
                            numberFieldOptions,
                          )}
                        />
                      </FormField>
                      <FormField
                        label="FC"
                        error={
                          vitalsForm.formState.errors.heartRate?.message as
                            | string
                            | undefined
                        }
                      >
                        <input
                          type="number"
                          {...vitalsForm.register(
                            "heartRate",
                            numberFieldOptions,
                          )}
                        />
                      </FormField>
                      <FormField
                        label="FR"
                        error={
                          vitalsForm.formState.errors.respiratoryRate
                            ?.message as string | undefined
                        }
                      >
                        <input
                          type="number"
                          {...vitalsForm.register(
                            "respiratoryRate",
                            numberFieldOptions,
                          )}
                        />
                      </FormField>
                      <FormField
                        label="PA sistólica"
                        error={
                          vitalsForm.formState.errors.systolic?.message as
                            | string
                            | undefined
                        }
                      >
                        <input
                          type="number"
                          {...vitalsForm.register(
                            "systolic",
                            numberFieldOptions,
                          )}
                        />
                      </FormField>
                      <FormField
                        label="PA diastólica"
                        error={
                          vitalsForm.formState.errors.diastolic?.message as
                            | string
                            | undefined
                        }
                      >
                        <input
                          type="number"
                          {...vitalsForm.register(
                            "diastolic",
                            numberFieldOptions,
                          )}
                        />
                      </FormField>
                      <FormField
                        label="Saturación"
                        error={
                          vitalsForm.formState.errors.oxygenSaturation
                            ?.message as string | undefined
                        }
                      >
                        <input
                          type="number"
                          {...vitalsForm.register(
                            "oxygenSaturation",
                            numberFieldOptions,
                          )}
                        />
                      </FormField>
                      <FormField
                        label="Glucemia"
                        error={
                          vitalsForm.formState.errors.glucose?.message as
                            | string
                            | undefined
                        }
                      >
                        <input
                          type="number"
                          step="0.1"
                          {...vitalsForm.register(
                            "glucose",
                            numberFieldOptions,
                          )}
                        />
                      </FormField>
                      <FormField
                        label="Peso (kg)"
                        error={
                          vitalsForm.formState.errors.weightKg?.message as
                            | string
                            | undefined
                        }
                      >
                        <input
                          type="number"
                          step="0.1"
                          placeholder="Ej. 72.5"
                          {...vitalsForm.register(
                            "weightKg",
                            numberFieldOptions,
                          )}
                        />
                      </FormField>
                      <FormField
                        label="Talla (cm)"
                        error={
                          vitalsForm.formState.errors.heightCm?.message as
                            | string
                            | undefined
                        }
                      >
                        <input
                          type="number"
                          step="0.1"
                          {...vitalsForm.register(
                            "heightCm",
                            numberFieldOptions,
                          )}
                        />
                      </FormField>
                    </div>
                    {serverError ? (
                      <div className="form-error">{serverError}</div>
                    ) : null}
                    <button className="btn secondary">
                      Guardar signos vitales
                    </button>
                  </form>
                  <TraceBlock
                    label="Última captura"
                    author={
                      bundle?.vitals?.updatedByName ??
                      bundle?.vitals?.createdByName
                    }
                    date={
                      bundle?.vitals?.updatedAt ?? bundle?.vitals?.createdAt
                    }
                  />
                </Card>
              ) : null}

              {activeStage === "assessment" ? (
                <div
                  className={
                    supportsMedical && supportsNursing ? "two-column" : "stack"
                  }
                >
                  {supportsMedical ? (
                    <Card>
                      <SectionHeading
                        title={activeRole === "nutricion" ? "Formulario nutricional" : "Formulario médico"}
                        description={
                          activeRole === "nutricion"
                            ? "Valoración nutricional, diagnóstico alimentario y plan de intervención."
                            : "Consulta, impresión diagnóstica y plan terapéutico."
                        }
                      />
                      <form
                        className="stack"
                        onSubmit={medicalForm.handleSubmit(async (values) => {
                          await runAction(
                            {
                              loading: activeRole === "nutricion" ? "Guardando valoración nutricional..." : "Guardando valoración médica...",
                              success:
                                activeRole === "nutricion"
                                  ? "Valoración nutricional guardada correctamente."
                                  : "Valoración médica guardada correctamente.",
                            },
                            async () => {
                              await saveMedicalAssessment(client, values);
                              medicalForm.reset(medicalForm.getValues());
                              invalidateBundle();
                            },
                          );
                        })}
                      >
                        <FormField label={activeRole === "nutricion" ? "Motivo nutricional" : "Motivo de consulta"}>
                          <textarea
                            {...medicalForm.register("chiefComplaint")}
                          />
                        </FormField>
                        <FormField label={activeRole === "nutricion" ? "Historia alimentaria actual" : "Enfermedad actual"}>
                          <textarea
                            {...medicalForm.register("currentIllness")}
                          />
                        </FormField>
                        <FormField label={activeRole === "nutricion" ? "Diagnóstico nutricional" : "Impresión diagnóstica"}>
                          <textarea
                            {...medicalForm.register("diagnosticImpression")}
                          />
                        </FormField>
                        <FormField label={activeRole === "nutricion" ? "Plan alimentario y metas" : "Plan terapéutico"}>
                          <textarea
                            {...medicalForm.register("therapeuticPlan")}
                          />
                        </FormField>
                        <button className="btn secondary">
                          {activeRole === "nutricion" ? "Guardar nutrición" : "Guardar médico"}
                        </button>
                      </form>
                      <TraceBlock
                        label={activeRole === "nutricion" ? "Última edición nutricional" : "Última edición médica"}
                        author={
                          bundle?.medical?.updatedByName ??
                          bundle?.medical?.createdByName
                        }
                        date={
                          bundle?.medical?.updatedAt ??
                          bundle?.medical?.createdAt
                        }
                      />
                    </Card>
                  ) : null}

                  {supportsNursing ? (
                    <Card>
                      <SectionHeading
                        title="Enfermería"
                        description="Valoración base con sugerencias internas."
                      />
                      <form
                        className="stack"
                        onSubmit={nursingForm.handleSubmit(async (values) => {
                          await runAction(
                            {
                              loading: "Guardando valoración de enfermería...",
                              success:
                                "Valoración de enfermería guardada correctamente.",
                            },
                            async () => {
                              await saveNursingAssessment(client, {
                                ...values,
                                suggestionIds: nursingSuggestions.map(
                                  (item) => item.id,
                                ),
                              });
                              nursingForm.reset(nursingForm.getValues());
                              invalidateBundle();
                            },
                          );
                        })}
                      >
                        <FormField label="Motivo de atención">
                          <textarea {...nursingForm.register("careReason")} />
                        </FormField>
                        <FormField label="Observaciones">
                          <textarea {...nursingForm.register("observations")} />
                        </FormField>
                        <div className="stack">
                          {nursingSuggestions.map((suggestion) => (
                            <div key={suggestion.id} className="ax-card">
                              <strong>{suggestion.label}</strong>
                              <p className="muted">{suggestion.rationale}</p>
                            </div>
                          ))}
                        </div>
                        <button className="btn secondary">
                          Guardar enfermería
                        </button>
                      </form>
                      <TraceBlock
                        label="Última edición de enfermería"
                        author={
                          bundle?.nursing?.updatedByName ??
                          bundle?.nursing?.createdByName
                        }
                        date={
                          bundle?.nursing?.updatedAt ??
                          bundle?.nursing?.createdAt
                        }
                      />
                    </Card>
                  ) : null}
                </div>
              ) : null}

              {activeStage === "records" ? (
                <div className="two-column">
                  <Card>
                    <SectionHeading
                      title="Diagnósticos y notas"
                      description={
                        activeRole === "enfermeria"
                          ? "PAE interno y notas de seguimiento."
                          : activeRole === "psicologo"
                            ? "Diagnóstico psicológico con estructura DSM-ready."
                            : activeRole === "nutricion"
                              ? "Diagnóstico nutricional, objetivos y seguimiento alimentario."
                            : "CIE-10, razonamiento clínico y notas del encuentro."
                      }
                    />
                    <div className="stack">
                      <FormField
                        label={
                          activeRole === "enfermeria"
                            ? "Diagnóstico de enfermería / PAE"
                            : activeRole === "psicologo"
                              ? "Diagnóstico psicológico (busca por iniciales)"
                              : activeRole === "nutricion"
                                ? "Diagnóstico nutricional (busca por objetivo o condición)"
                              : "Diagnóstico CIE-10 (busca por código o iniciales)"
                        }
                      >
                        <input
                          list="diagnosis-catalog-options"
                          value={diagnosisSearch}
                          onChange={(event) =>
                            setDiagnosisSearch(event.target.value)
                          }
                          placeholder={
                            activeRole === "enfermeria"
                              ? "Busca plan o respuesta clínica"
                              : activeRole === "psicologo"
                                ? "Busca referencia interna o describe el cuadro"
                                : activeRole === "nutricion"
                                  ? "Busca por objetivo, condición o intervención"
                                : "Busca por código o nombre"
                          }
                        />
                      </FormField>
                      <datalist id="diagnosis-catalog-options">
                        {diagnosisCatalog.map((item) => (
                          <option
                            key={item.code}
                            value={
                              shouldShowDiagnosisCode(diagnosisSource)
                                ? `${item.code} · ${item.label}`
                                : item.label
                            }
                          />
                        ))}
                      </datalist>
                      <FormField label="Nota diagnóstica u observación">
                        <textarea
                          value={diagnosisNotes}
                          onChange={(event) =>
                            setDiagnosisNotes(event.target.value)
                          }
                        />
                      </FormField>
                      {diagnosisSearch.trim() &&
                      filteredDiagnosisCatalog.length ? (
                        <div className="stack">
                          {filteredDiagnosisCatalog.map((entry) => (
                            <div key={entry.code} className="trace-row">
                              <div>
                                <strong>
                                  {shouldShowDiagnosisCode(diagnosisSource)
                                    ? `${entry.code} · ${entry.label}`
                                    : entry.label}
                                </strong>
                                <p>{entry.meta}</p>
                              </div>
                              <button
                                className="pill-link"
                                type="button"
                                onClick={() =>
                                  runAction(
                                    {
                                      loading: "Guardando diagnóstico...",
                                      success:
                                        "Diagnóstico agregado al encuentro.",
                                    },
                                    async () => {
                                      await addDiagnosis(entry);
                                    },
                                  )
                                }
                              >
                                Usar
                              </button>
                            </div>
                          ))}
                        </div>
                      ) : null}
                      <button
                        className="btn secondary"
                        onClick={async () => {
                          const manualLabel = diagnosisSearch.includes("·")
                            ? diagnosisSearch
                                .split("·")
                                .slice(1)
                                .join("·")
                                .trim()
                            : diagnosisSearch.trim();
                          const manualCode = diagnosisSearch.includes("·")
                            ? diagnosisSearch.split("·")[0].trim()
                            : diagnosisSource === "medical_icd10"
                              ? null
                              : diagnosisSource === "nursing_pae"
                                ? "PAE-MANUAL"
                                : "PSY-MANUAL";

                          if (!manualLabel) return;
                          await runAction(
                            {
                              loading: "Guardando diagnóstico...",
                              success: "Diagnóstico agregado al encuentro.",
                            },
                            async () => {
                              await addDiagnosis({
                                code: manualCode,
                                label: manualLabel,
                              });
                            },
                          );
                        }}
                        type="button"
                      >
                        Agregar diagnóstico
                      </button>
                      {(bundle?.diagnoses ?? []).map((diagnosis) => (
                        <div key={diagnosis.id} className="trace-row">
                          <strong>{diagnosis.label}</strong>
                          <span>
                            {diagnosis.createdByName ?? "Sin autor"} ·{" "}
                            {diagnosis.createdAt
                              ? new Date(diagnosis.createdAt).toLocaleString()
                              : "sin fecha"}
                          </span>
                        </div>
                      ))}
                    </div>
                    <div className="stack" style={{ marginTop: 18 }}>
                      <FormField label="Nueva nota clínica">
                        <textarea
                          value={noteDraft}
                          onChange={(event) => setNoteDraft(event.target.value)}
                        />
                      </FormField>
                      <button
                        className="btn secondary"
                        onClick={async () => {
                          if (!activeEncounter || !noteDraft.trim()) return;
                          await runAction(
                            {
                              loading: "Guardando nota clínica...",
                              success: "Nota clínica guardada correctamente.",
                            },
                            async () => {
                              await saveClinicalNote(client, {
                                encounterId: activeEncounter.id,
                                noteKind:
                                  activeRole === "enfermeria"
                                    ? "nursing_followup"
                                    : activeRole === "psicologo"
                                      ? "psychology_plan"
                                      : activeRole === "nutricion"
                                        ? "nutrition_followup"
                                      : "medical_followup",
                                content: noteDraft.trim(),
                              });
                              setNoteDraft("");
                              invalidateBundle();
                            },
                          );
                        }}
                        type="button"
                      >
                        Guardar nota
                      </button>
                      {(bundle?.notes ?? []).map((note) => (
                        <div key={note.id} className="trace-row">
                          <strong>{note.noteKind}</strong>
                          <p>{note.content}</p>
                          <span>
                            {note.createdByName ?? "Sin autor"} ·{" "}
                            {note.createdAt
                              ? new Date(note.createdAt).toLocaleString()
                              : "sin fecha"}
                          </span>
                        </div>
                      ))}
                    </div>
                  </Card>

                  <Card>
                    <SectionHeading
                      title="Procedimientos"
                      description="Registro complementario dentro del mismo episodio."
                    />
                    <div className="stack">
                      <FormField label="Procedimiento">
                        <input
                          value={procedureDraft.name}
                          onChange={(event) =>
                            setProcedureDraft((current) => ({
                              ...current,
                              name: event.target.value,
                            }))
                          }
                        />
                      </FormField>
                      <FormField label="Resultado">
                        <textarea
                          value={procedureDraft.result ?? ""}
                          onChange={(event) =>
                            setProcedureDraft((current) => ({
                              ...current,
                              result: event.target.value,
                            }))
                          }
                        />
                      </FormField>
                      <FormField label="Foto de evolución del procedimiento">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(event) => {
                            const file = event.target.files?.[0];
                            if (!file) return;
                            const reader = new FileReader();
                            reader.onload = () => {
                              setProcedurePhotoDraft({
                                fileName: file.name,
                                mimeType: file.type || "image/png",
                                path: String(reader.result ?? ""),
                              });
                            };
                            reader.readAsDataURL(file);
                          }}
                        />
                      </FormField>
                      {procedurePhotoDraft.path ? (
                        <div className="info-panel">
                          <strong>{procedurePhotoDraft.fileName}</strong>
                          <span>
                            Se guardará como evolución fotográfica del
                            procedimiento.
                          </span>
                          <img
                            src={procedurePhotoDraft.path}
                            alt="Vista previa del procedimiento"
                            className="attachment-preview"
                          />
                        </div>
                      ) : null}
                      <button
                        className="btn secondary"
                        onClick={async () => {
                          if (!activeEncounter || !procedureDraft.name.trim())
                            return;
                          await runAction(
                            {
                              loading: "Registrando procedimiento...",
                              success: "Procedimiento guardado correctamente.",
                            },
                            async () => {
                              const createdProcedure = await createProcedure(
                                client,
                                {
                                  encounterId: activeEncounter.id,
                                  name: procedureDraft.name.trim(),
                                  performedAt: new Date().toISOString(),
                                  responsibleProfessional: professional
                                    ? `${professional.firstName} ${professional.lastName}`
                                    : null,
                                  materials: [],
                                  result: procedureDraft.result ?? null,
                                  notes: procedureDraft.notes ?? null,
                                },
                              );
                              if (procedurePhotoDraft.path && selectedPatient) {
                                await createAttachmentRecord(client, {
                                  patientId: selectedPatient.id,
                                  encounterId: activeEncounter.id,
                                  examOrderId: null,
                                  bucket: "inline-uploads",
                                  path: procedurePhotoDraft.path,
                                  fileName: `procedimiento-${createdProcedure.name.replace(/\s+/g, "-").toLowerCase()}-${procedurePhotoDraft.fileName}`,
                                  mimeType: procedurePhotoDraft.mimeType,
                                  category: "imagen",
                                });
                              }
                              setProcedureDraft({
                                name: "",
                                result: "",
                                notes: "",
                              });
                              setProcedurePhotoDraft({
                                fileName: "",
                                mimeType: "image/png",
                                path: "",
                              });
                              invalidateBundle();
                            },
                          );
                        }}
                        type="button"
                      >
                        Registrar procedimiento
                      </button>
                      <div className="stack" style={{ marginTop: 18 }}>
                        <FormField label="Solicitar examen">
                          <select
                            value={examDraft.category}
                            onChange={(event) =>
                              setExamDraft((current) => ({
                                ...current,
                                category: event.target
                                  .value as typeof current.category,
                              }))
                            }
                          >
                            <option value="laboratorio">Laboratorio</option>
                            <option value="imagen">Imagen</option>
                            <option value="estudio_especial">
                              Estudio especial
                            </option>
                          </select>
                        </FormField>
                        <FormField label="Nombre del examen (busca por iniciales)">
                          <input
                            list="exam-catalog-options"
                            placeholder="Ej. bio, eco, radio, elec..."
                            value={examDraft.examName}
                            onChange={(event) =>
                              setExamDraft((current) => ({
                                ...current,
                                examName: event.target.value,
                              }))
                            }
                          />
                        </FormField>
                        <datalist id="exam-catalog-options">
                          {filteredExamCatalog.map((entry) => (
                            <option
                              key={`${entry.category}-${entry.label}`}
                              value={entry.label}
                            />
                          ))}
                        </datalist>
                        {examDraft.examName.trim() &&
                        filteredExamCatalog.length ? (
                          <div className="stack">
                            {filteredExamCatalog.slice(0, 6).map((entry) => (
                              <div
                                key={`${entry.category}-${entry.label}`}
                                className="trace-row"
                              >
                                <div>
                                  <strong>{entry.label}</strong>
                                  <span>{entry.panel ?? entry.category}</span>
                                </div>
                                <button
                                  className="pill-link"
                                  type="button"
                                  onClick={() =>
                                    setExamDraft((current) => ({
                                      ...current,
                                      examName: entry.label,
                                    }))
                                  }
                                >
                                  Usar
                                </button>
                              </div>
                            ))}
                          </div>
                        ) : null}
                        <FormField label="Indicaciones">
                          <textarea
                            value={examDraft.instructions}
                            onChange={(event) =>
                              setExamDraft((current) => ({
                                ...current,
                                instructions: event.target.value,
                              }))
                            }
                          />
                        </FormField>
                        <button
                          className="btn secondary"
                          type="button"
                          onClick={async () => {
                            if (!activeEncounter || !examDraft.examName.trim())
                              return;
                            await runAction(
                              {
                                loading: "Solicitando examen...",
                                success: "Examen solicitado correctamente.",
                              },
                              async () => {
                                await createExamOrder(client, {
                                  encounterId: activeEncounter.id,
                                  category: examDraft.category,
                                  examName: examDraft.examName.trim(),
                                  instructions: examDraft.instructions || null,
                                  status: "pendiente",
                                  orderedAt: new Date().toISOString(),
                                });
                                setExamDraft({
                                  category: "laboratorio",
                                  examName: "",
                                  instructions: "",
                                });
                                invalidateBundle();
                              },
                            );
                          }}
                        >
                          Solicitar examen
                        </button>
                        {(bundle?.examOrders ?? []).map((examOrder) => (
                          <div key={examOrder.id} className="trace-row">
                            <strong>{examOrder.examName}</strong>
                            <p>
                              {examOrder.instructions ??
                                "Sin indicaciones adicionales."}
                            </p>
                            <span>
                              {examOrder.category} ·{" "}
                              {examOrder.createdByName ?? "Sin autor"} ·{" "}
                              {examOrder.orderedAt
                                ? new Date(examOrder.orderedAt).toLocaleString()
                                : "sin fecha"}
                            </span>
                          </div>
                        ))}
                      </div>
                      <div className="stack" style={{ marginTop: 18 }}>
                        <FormField label="Adjuntar resultado o documento">
                          <input
                            type="file"
                            accept="application/pdf,image/*"
                            onChange={(event) => {
                              const file = event.target.files?.[0];
                              if (!file) return;
                              const reader = new FileReader();
                              reader.onload = () => {
                                setAttachmentDraft({
                                  fileName: file.name,
                                  mimeType:
                                    file.type || "application/octet-stream",
                                  category:
                                    file.type === "application/pdf"
                                      ? "pdf"
                                      : "resultado",
                                  path: String(reader.result ?? ""),
                                });
                              };
                              reader.readAsDataURL(file);
                            }}
                          />
                        </FormField>
                        {attachmentDraft.fileName ? (
                          <div className="info-panel">
                            <strong>{attachmentDraft.fileName}</strong>
                            <span>{attachmentDraft.mimeType}</span>
                          </div>
                        ) : null}
                        <button
                          className="btn secondary"
                          type="button"
                          onClick={async () => {
                            if (
                              !activeEncounter ||
                              !selectedPatient ||
                              !attachmentDraft.path ||
                              !attachmentDraft.fileName
                            )
                              return;
                            await runAction(
                              {
                                loading: "Guardando adjunto clínico...",
                                success: "Adjunto guardado correctamente.",
                              },
                              async () => {
                                await createAttachmentRecord(client, {
                                  patientId: selectedPatient.id,
                                  encounterId: activeEncounter.id,
                                  examOrderId: null,
                                  bucket: "inline-uploads",
                                  path: attachmentDraft.path,
                                  fileName: attachmentDraft.fileName,
                                  mimeType: attachmentDraft.mimeType,
                                  category: attachmentDraft.category,
                                });
                                setAttachmentDraft({
                                  fileName: "",
                                  mimeType: "application/pdf",
                                  category: "resultado",
                                  path: "",
                                });
                                invalidateBundle();
                              },
                            );
                          }}
                          disabled={!attachmentDraft.path}
                        >
                          Guardar adjunto
                        </button>
                        {(bundle?.attachments ?? []).map((attachment) => (
                          <div key={attachment.id} className="trace-row">
                            <strong>{attachment.fileName}</strong>
                            <span>
                              {attachment.category} ·{" "}
                              {attachment.createdByName ?? "Sin autor"} ·{" "}
                              {attachment.createdAt
                                ? new Date(
                                    attachment.createdAt,
                                  ).toLocaleString()
                                : "sin fecha"}
                            </span>
                            {attachment.path?.startsWith("data:") ? (
                              <a
                                href={attachment.path}
                                download={attachment.fileName}
                                className="pill-link"
                              >
                                Descargar
                              </a>
                            ) : null}
                          </div>
                        ))}
                      </div>
                      {(bundle?.procedures ?? []).map((procedure) => (
                        <div key={procedure.id} className="trace-row">
                          <strong>{procedure.name}</strong>
                          <p>
                            {procedure.result ??
                              procedure.notes ??
                              "Sin observaciones."}
                          </p>
                          <span>
                            {procedure.createdByName ?? "Sin autor"} ·{" "}
                            {procedure.createdAt
                              ? new Date(procedure.createdAt).toLocaleString()
                              : "sin fecha"}
                          </span>
                        </div>
                      ))}
                      {(bundle?.attachments ?? []).filter(
                        (attachment) =>
                          attachment.category === "imagen" &&
                          attachment.fileName.startsWith("procedimiento-"),
                      ).length ? (
                        <div className="stack" style={{ marginTop: 18 }}>
                          <strong>Evolución fotográfica</strong>
                          <div className="photo-grid">
                            {(bundle?.attachments ?? [])
                              .filter(
                                (attachment) =>
                                  attachment.category === "imagen" &&
                                  attachment.fileName.startsWith(
                                    "procedimiento-",
                                  ),
                              )
                              .map((attachment) => (
                                <a
                                  key={attachment.id}
                                  href={attachment.path}
                                  download={attachment.fileName}
                                  className="photo-card"
                                >
                                  <img
                                    src={attachment.path}
                                    alt={attachment.fileName}
                                    className="attachment-preview"
                                  />
                                  <span>{attachment.fileName}</span>
                                </a>
                              ))}
                          </div>
                        </div>
                      ) : null}
                    </div>
                  </Card>
                </div>
              ) : null}

              {activeStage === "treatment" ? (
                <div className="two-column">
                  <Card>
                    <SectionHeading
                      title="Tratamiento y medicación"
                      description={
                        activeRole === "enfermeria"
                          ? "Registro limitado a medicación básica de apoyo y continuidad del cuidado."
                          : canPrescribeMedication
                            ? "Prescripción estructurada con trazabilidad por profesional."
                            : "Este rol no prescribe medicación. Usa esta etapa para educación y continuidad del cuidado."
                      }
                    />
                    {canPrescribeMedication ? (
                      <div className="stack">
                        {activeRole === "enfermeria" ? (
                          <div className="info-panel">
                            <strong>Alcance de enfermería</strong>
                            <span>
                              Aquí solo se habilita medicación básica frecuente para manejo inicial o seguimiento, como analgésicos, antiinflamatorios y soporte respiratorio o gastrointestinal.
                            </span>
                          </div>
                        ) : null}
                        <FormField label="Medicamento (busca por iniciales)">
                          <input
                            list="medication-catalog-options"
                            value={medicationDraft.medicationName}
                            onChange={(event) =>
                              setMedicationDraft((current) => ({
                                ...current,
                                medicationName: event.target.value,
                                presentation: "",
                              }))
                            }
                            placeholder="Ej. para, ibu, amoxi, losa..."
                          />
                        </FormField>
                        <datalist id="medication-catalog-options">
                          {[
                            ...new Set(
                              medicationCatalogForRole.map((item) => item.name),
                            ),
                          ].map((name) => (
                            <option key={name} value={name} />
                          ))}
                        </datalist>
                        {medicationDraft.medicationName.trim() &&
                        filteredMedicationNames.length ? (
                          <div className="stack">
                            {filteredMedicationNames
                              .slice(0, 6)
                              .map((name) => {
                                const presentationCount =
                                  medicationCatalogForRole.filter(
                                    (item) => item.name === name,
                                  ).length;
                                return (
                                <div
                                  key={name}
                                  className="trace-row"
                                >
                                  <div>
                                    <strong>{name}</strong>
                                    <p>
                                      {presentationCount === 1
                                        ? "1 presentación disponible"
                                        : `${presentationCount} presentaciones disponibles`}
                                    </p>
                                  </div>
                                  <button
                                    className="pill-link"
                                    type="button"
                                    onClick={() =>
                                      setMedicationDraft((current) => ({
                                        ...current,
                                        medicationName: name,
                                        presentation: "",
                                      }))
                                    }
                                  >
                                    Usar
                                  </button>
                                </div>
                                );
                              })}
                          </div>
                        ) : null}
                        <div className="form-grid">
                          <FormField
                            label="Presentación"
                            helper={
                              availableMedicationPresentations.length
                                ? "Elige la forma farmacéutica más adecuada para completar la orden."
                                : "Selecciona primero un medicamento del catálogo."
                            }
                          >
                            <select
                              value={medicationDraft.presentation}
                              disabled={!availableMedicationPresentations.length}
                              onChange={(event) => {
                                const selectedPresentation =
                                  availableMedicationPresentations.find(
                                    (item) =>
                                      item.presentation === event.target.value,
                                  );
                                setMedicationDraft((current) => ({
                                  ...current,
                                  presentation: event.target.value,
                                  dosage:
                                    current.dosage ||
                                    selectedPresentation?.commonDose ||
                                    "",
                                  route:
                                    current.route ||
                                    inferMedicationRoute(event.target.value),
                                }));
                              }}
                            >
                              <option value="">
                                {availableMedicationPresentations.length
                                  ? "Selecciona una presentación"
                                  : "Sin presentaciones disponibles"}
                              </option>
                              {availableMedicationPresentations.map((item) => (
                                <option
                                  key={`${item.name}-${item.presentation}`}
                                  value={item.presentation}
                                >
                                  {item.presentation}
                                </option>
                              ))}
                            </select>
                          </FormField>
                          <FormField
                            label="Dosis"
                            helper={selectedMedicationPresentation?.commonDose}
                          >
                            <select
                              value={medicationDraft.dosage}
                              onChange={(event) =>
                                setMedicationDraft((current) => ({
                                  ...current,
                                  dosage: event.target.value,
                                }))
                              }
                            >
                              <option value="">Selecciona una dosis</option>
                              {dosageOptions.map((option) => (
                                <option key={option} value={option}>
                                  {option}
                                </option>
                              ))}
                            </select>
                          </FormField>
                          <FormField label="Vía">
                            <select
                              value={medicationDraft.route}
                              onChange={(event) =>
                                setMedicationDraft((current) => ({
                                  ...current,
                                  route: event.target.value,
                                }))
                              }
                            >
                              <option value="">Selecciona una vía</option>
                              {medicationRouteOptions.map((option) => (
                                <option key={option} value={option}>
                                  {option}
                                </option>
                              ))}
                            </select>
                          </FormField>
                          <FormField label="Frecuencia">
                            <select
                              value={medicationDraft.frequency}
                              onChange={(event) =>
                                setMedicationDraft((current) => ({
                                  ...current,
                                  frequency: event.target.value,
                                }))
                              }
                            >
                              <option value="">Selecciona una frecuencia</option>
                              {medicationFrequencyOptions.map((option) => (
                                <option key={option} value={option}>
                                  {option}
                                </option>
                              ))}
                            </select>
                          </FormField>
                          <FormField label="Duración">
                            <select
                              value={medicationDraft.duration}
                              onChange={(event) =>
                                setMedicationDraft((current) => ({
                                  ...current,
                                  duration: event.target.value,
                                }))
                              }
                            >
                              <option value="">Selecciona una duración</option>
                              {medicationDurationOptions.map((option) => (
                                <option key={option} value={option}>
                                  {option}
                                </option>
                              ))}
                            </select>
                          </FormField>
                        </div>
                        <FormField label="Indicaciones farmacológicas">
                          <textarea
                            value={medicationDraft.instructions}
                            onChange={(event) =>
                              setMedicationDraft((current) => ({
                                ...current,
                                instructions: event.target.value,
                              }))
                            }
                          />
                        </FormField>
                        <button
                          className="btn secondary"
                          type="button"
                          onClick={async () => {
                            if (!activeEncounter) return;
                            const parsed = medicationOrderSchema.safeParse({
                              ...medicationDraft,
                              encounterId: activeEncounter.id,
                              prescriberRole:
                                activeRole === "medico"
                                  ? "medico"
                                  : activeRole === "enfermeria"
                                    ? "enfermeria"
                                  : "profesional_mixto",
                            });
                            if (!parsed.success) {
                              const message =
                                parsed.error.issues[0]?.message ??
                                "Completa el medicamento antes de guardar.";
                              setServerError(message);
                              setActionFeedback({ tone: "error", message });
                              return;
                            }
                            await runAction(
                              {
                                loading: "Guardando medicación...",
                                success: "Medicación guardada correctamente.",
                              },
                              async () => {
                                await createMedicationOrder(
                                  client,
                                  parsed.data,
                                );
                                setMedicationDraft({
                                  medicationName: "",
                                  presentation: "",
                                  dosage: "",
                                  route: "",
                                  frequency: "",
                                  duration: "",
                                  instructions: "",
                                });
                                invalidateBundle();
                              },
                            );
                          }}
                        >
                          Guardar medicación
                        </button>
                      </div>
                    ) : (
                      <div className="info-panel">
                        <strong>Medicación deshabilitada</strong>
                        <span>
                          Solo perfiles médicos o mixtos pueden registrar
                          prescripción farmacológica en esta fase.
                        </span>
                      </div>
                    )}

                    {(bundle?.medicationOrders ?? []).map((medication) => (
                      <div key={medication.id} className="trace-row">
                        <strong>{medication.medicationName}</strong>
                        <p>
                          {[
                            medication.presentation,
                            medication.dosage,
                            medication.route,
                            medication.frequency,
                            medication.duration,
                          ]
                            .filter(Boolean)
                            .join(" · ")}
                        </p>
                        <span>
                          {medication.createdByName ?? "Sin autor"} ·{" "}
                          {medication.createdAt
                            ? new Date(medication.createdAt).toLocaleString()
                            : "sin fecha"}
                        </span>
                      </div>
                    ))}
                  </Card>

                  <Card>
                    <SectionHeading
                      title="Indicaciones y plan al paciente"
                      description="Plan final, educación, cuidados y seguimiento según el rol clínico."
                    />
                    {activeRole === "enfermeria" ? (
                      <div className="stack">
                        {internalNursingSuggestionCatalog.map((item) => (
                          <div key={item.id} className="ax-card">
                            <strong>{item.label}</strong>
                            <p className="muted">
                              Resultados esperados: {item.outcomes.join(" · ")}
                            </p>
                            <p className="muted">
                              Intervenciones: {item.interventions.join(" · ")}
                            </p>
                          </div>
                        ))}
                      </div>
                    ) : null}
                    {activeRole === "nutricion" ? (
                      <div className="stack">
                        <div className="ax-card">
                          <strong>Checklist nutricional</strong>
                          <p className="muted">Incluye objetivos calóricos, distribución de comidas, hidratación, educación alimentaria y fecha de reevaluación.</p>
                        </div>
                        <div className="ax-card">
                          <strong>Seguimiento recomendado</strong>
                          <p className="muted">Registra adherencia, cambios antropométricos, síntomas digestivos y barreras para cumplir el plan alimentario.</p>
                        </div>
                      </div>
                    ) : null}
                    <FormField
                      label={
                        activeRole === "enfermeria"
                          ? "Plan de cuidados e indicaciones"
                          : activeRole === "psicologo"
                            ? "Plan terapéutico e indicaciones"
                            : activeRole === "nutricion"
                              ? "Plan nutricional e indicaciones"
                            : "Indicaciones al paciente"
                      }
                    >
                      <textarea
                        value={carePlanDraft}
                        onChange={(event) =>
                          setCarePlanDraft(event.target.value)
                        }
                      />
                    </FormField>
                    <button
                      className="btn secondary"
                      type="button"
                      onClick={async () => {
                        if (!activeEncounter || !carePlanDraft.trim()) return;
                        await runAction(
                          {
                            loading: "Guardando plan e indicaciones...",
                            success:
                              "Plan e indicaciones guardados correctamente.",
                          },
                          async () => {
                            await saveClinicalNote(client, {
                              encounterId: activeEncounter.id,
                              noteKind: inferPlanNoteKind(activeRole),
                              content: carePlanDraft.trim(),
                            });
                            setCarePlanDraft("");
                            invalidateBundle();
                          },
                        );
                      }}
                    >
                      Guardar plan
                    </button>
                    {(bundle?.notes ?? [])
                      .filter((note) =>
                        [
                          "patient_indications",
                          "nursing_care_plan",
                          "psychology_plan",
                        ].includes(note.noteKind),
                      )
                      .map((note) => (
                        <div key={note.id} className="trace-row">
                          <strong>{note.noteKind}</strong>
                          <p>{note.content}</p>
                          <span>
                            {note.createdByName ?? "Sin autor"} ·{" "}
                            {note.createdAt
                              ? new Date(note.createdAt).toLocaleString()
                              : "sin fecha"}
                          </span>
                        </div>
                      ))}
                  </Card>
                </div>
              ) : null}

              {activeStage === "summary" ? (
                <div className="two-column">
                  <Card>
                    <SectionHeading
                      title="Resumen e impresión"
                      description="Cierre del encuentro con trazabilidad y PDF clínico base."
                    />
                    <div className="summary-grid">
                      <div className="summary-item">
                        <span>Paciente</span>
                        <strong>
                          {selectedPatient.firstName} {selectedPatient.lastName}
                        </strong>
                      </div>
                      <div className="summary-item">
                        <span>Ruta clínica</span>
                        <strong>{encounterTypeLabel}</strong>
                      </div>
                      <div className="summary-item">
                        <span>Diagnósticos</span>
                        <strong>{bundle?.diagnoses?.length ?? 0}</strong>
                      </div>
                      <div className="summary-item">
                        <span>Notas clínicas</span>
                        <strong>{bundle?.notes?.length ?? 0}</strong>
                      </div>
                      <div className="summary-item">
                        <span>Exámenes</span>
                        <strong>{bundle?.examOrders?.length ?? 0}</strong>
                      </div>
                      <div className="summary-item">
                        <span>Adjuntos</span>
                        <strong>{bundle?.attachments?.length ?? 0}</strong>
                      </div>
                      <div className="summary-item">
                        <span>Medicaciones</span>
                        <strong>{bundle?.medicationOrders?.length ?? 0}</strong>
                      </div>
                    </div>
                    <div className="btn-row">
                      <PDFDownloadLink
                        document={
                          <EncounterSummaryDocument
                            patient={selectedPatient}
                            professional={professional}
                            encounter={activeEncounter}
                            vitals={bundle?.vitals ?? null}
                            medical={bundle?.medical ?? null}
                            nursing={bundle?.nursing ?? null}
                          />
                        }
                        fileName={`encounter-${activeEncounter.id}.pdf`}
                      >
                        {({ loading }) => (
                          <button className="btn warn">
                            {loading
                              ? "Preparando PDF..."
                              : "Descargar resumen clínico"}
                          </button>
                        )}
                      </PDFDownloadLink>
                      <button
                        type="button"
                        className="btn secondary"
                        onClick={() =>
                          downloadEncounterSummaryWord({
                            patient: selectedPatient,
                            professional,
                            encounter: activeEncounter,
                            vitals: bundle?.vitals ?? null,
                            medical: bundle?.medical ?? null,
                            nursing: bundle?.nursing ?? null,
                          })
                        }
                      >
                        Descargar Word (.doc)
                      </button>
                    </div>
                  </Card>

                  <Card>
                    <SectionHeading
                      title="Programar próxima cita"
                      description="Al finalizar la atención, deja agendado el seguimiento del mismo paciente."
                    />
                    <div className="info-panel">
                      <strong>Seguimiento sugerido</strong>
                      <span>
                        Se propone una cita en 7 días para el mismo paciente. Puedes ajustar fecha, modalidad, motivo o duración antes de guardarla.
                      </span>
                    </div>
                    <AppointmentForm
                      patients={patients}
                      initialRange={suggestedFollowUpRange}
                      initialValues={followUpAppointmentDefaults}
                      onSaved={() => {
                        setActionFeedback({
                          tone: "success",
                          message: "Próxima cita agendada correctamente desde el cierre de la atención.",
                        });
                      }}
                    />
                  </Card>
                </div>
              ) : null}
            </div>

            <Card className="workspace-aside">
              <SectionHeading
                title="Resumen del encuentro"
                description="Contexto y avance del flujo clínico."
              />
              <div className="meta-strip">
                <strong>Paciente</strong>
                <span>
                  {selectedPatient.firstName} {selectedPatient.lastName}
                </span>
              </div>
              <div className="meta-strip">
                <strong>Ruta</strong>
                <span>{encounterTypeLabel}</span>
              </div>
              <div className="meta-strip">
                <strong>Apertura</strong>
                <span>
                  {new Date(activeEncounter.startedAt).toLocaleString()}
                </span>
              </div>
              <div className="meta-strip">
                <strong>Autor</strong>
                <span>{encounterAuthor}</span>
              </div>

              <div className="progress-list">
                <ProgressItem
                  label="Encounter abierto"
                  done={progress.encounter}
                />
                <ProgressItem
                  label="Signos vitales guardados"
                  done={progress.vitals}
                />
                {supportsMedical ? (
                  <ProgressItem
                    label="Valoración médica"
                    done={progress.medical}
                  />
                ) : null}
                {supportsNursing ? (
                  <ProgressItem
                    label="Valoración de enfermería"
                    done={progress.nursing}
                  />
                ) : null}
                <ProgressItem
                  label="Diagnósticos, notas o procedimientos"
                  done={progress.records}
                />
                <ProgressItem
                  label="Plan, indicaciones o medicación"
                  done={progress.treatment}
                />
              </div>

              <div className="info-panel">
                <strong>Siguiente paso sugerido</strong>
                <span>
                  {activeStage === "vitals"
                    ? "Completa signos vitales y pasa a la valoración clínica."
                    : activeStage === "assessment"
                      ? "Registra la parte médica o de enfermería según el tipo de encuentro."
                      : activeStage === "records"
                        ? "Añade diagnósticos, notas, procedimientos y exámenes relevantes del episodio."
                        : activeStage === "treatment"
                          ? "Cierra con medicación, plan e indicaciones según el rol del profesional."
                          : "Revisa el resumen final y descarga el PDF clínico."}
                </span>
              </div>
            </Card>
          </div>
        </>
      ) : null}
    </div>
  );
}
