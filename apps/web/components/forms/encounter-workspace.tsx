"use client";

import { generateNursingSuggestionsFromRules } from "@axyscare/core-clinical";
import type {
  Encounter,
  Patient,
  Procedure,
  Profile,
} from "@axyscare/core-types";
import {
  createDiagnosis,
  createEncounter,
  createProcedure,
  getEncounterBundle,
  saveClinicalNote,
  saveMedicalAssessment,
  saveNursingAssessment,
  saveVitalSigns,
} from "@axyscare/core-db";
import {
  encounterSchema,
  medicalAssessmentSchema,
  nursingAssessmentSchema,
  vitalSignsSchema,
} from "@axyscare/core-validation";
import { zodResolver } from "@hookform/resolvers/zod";
import { PDFDownloadLink } from "@react-pdf/renderer";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { Card, SectionHeading, StatusBadge } from "@axyscare/ui-shared";
import { FormField } from "@/components/forms/form-ui";
import { EncounterSummaryDocument } from "@/components/pdf/encounter-summary-document";
import { useAuth } from "@/components/providers/providers";
import { usePatientRealtime } from "@/components/realtime/use-patient-realtime";

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
        {author ?? "Sin autor"} · {date ? new Date(date).toLocaleString() : "sin fecha"}
      </span>
    </div>
  );
}

export function EncounterWorkspace({
  patients,
  professional,
  initialPatientId,
}: {
  patients: Patient[];
  professional?: Profile | null;
  initialPatientId?: string;
}) {
  const { client } = useAuth();
  const queryClient = useQueryClient();
  const [activeEncounter, setActiveEncounter] = useState<Encounter | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [diagnosisDraft, setDiagnosisDraft] = useState("");
  const [noteDraft, setNoteDraft] = useState("");
  const [procedureDraft, setProcedureDraft] = useState<Pick<Procedure, "name" | "result" | "notes">>({
    name: "",
    result: "",
    notes: "",
  });

  const encounterForm = useForm<any>({
    resolver: zodResolver(encounterSchema),
    defaultValues: {
      patientId: initialPatientId ?? "",
      appointmentId: null,
      encounterType: "mixed" as const,
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
    (patient) => patient.id === (activeEncounter?.patientId ?? encounterForm.watch("patientId")),
  );

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
    if (!activeEncounter) return;
    vitalsForm.setValue("encounterId", activeEncounter.id);
    vitalsForm.setValue("patientId", activeEncounter.patientId);
    medicalForm.setValue("encounterId", activeEncounter.id);
    medicalForm.setValue("chiefComplaint", activeEncounter.chiefComplaint ?? "");
    nursingForm.setValue("encounterId", activeEncounter.id);
  }, [activeEncounter, medicalForm, nursingForm, vitalsForm]);

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
      setActiveEncounter(encounter);
      queryClient.invalidateQueries({ queryKey: ["encounters", encounter.patientId] });
    },
    onError: (error) => {
      setServerError(error instanceof Error ? error.message : "No se pudo abrir el encuentro.");
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

  const invalidateBundle = () => {
    if (!activeEncounter?.id) return;
    queryClient.invalidateQueries({ queryKey: ["encounter-bundle", activeEncounter.id] });
  };

  return (
    <div className="stack">
      <Card>
        <SectionHeading
          title="Abrir episodio clínico"
          description="Toda atención médica o de enfermería vive dentro de un encounter."
        />
        <form className="stack" onSubmit={encounterForm.handleSubmit((values) => encounterMutation.mutate(values))}>
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
            <FormField label="Tipo de encuentro">
              <select {...encounterForm.register("encounterType")}>
                <option value="medical">Médico</option>
                <option value="nursing">Enfermería</option>
                <option value="mixed">Mixto</option>
              </select>
            </FormField>
            <FormField label="Inicio">
              <input type="datetime-local" {...encounterForm.register("startedAt")} />
            </FormField>
          </div>
          <FormField label="Motivo principal">
            <textarea {...encounterForm.register("chiefComplaint")} />
          </FormField>
          {serverError ? <div className="form-error">{serverError}</div> : null}
          <button className="btn" disabled={encounterMutation.isPending}>
            {encounterMutation.isPending ? "Abriendo..." : "Abrir encuentro"}
          </button>
        </form>
      </Card>

      {activeEncounter && selectedPatient ? (
        <>
          <Card>
            <SectionHeading
              title="Signos vitales"
              description="Con IMC y PAM calculados automáticamente."
              action={<StatusBadge label={`Encounter ${activeEncounter.id.slice(0, 8)}`} tone="info" />}
            />
            <form
              className="stack"
              onSubmit={vitalsForm.handleSubmit(async (values) => {
                await saveVitalSigns(client, {
                  ...values,
                  recordedAt: new Date(values.recordedAt).toISOString(),
                });
                invalidateBundle();
              })}
            >
              <div className="form-grid">
                <FormField label="Temperatura">
                  <input type="number" step="0.1" {...vitalsForm.register("temperatureC", { valueAsNumber: true })} />
                </FormField>
                <FormField label="FC">
                  <input type="number" {...vitalsForm.register("heartRate", { valueAsNumber: true })} />
                </FormField>
                <FormField label="FR">
                  <input type="number" {...vitalsForm.register("respiratoryRate", { valueAsNumber: true })} />
                </FormField>
                <FormField label="PA sistólica">
                  <input type="number" {...vitalsForm.register("systolic", { valueAsNumber: true })} />
                </FormField>
                <FormField label="PA diastólica">
                  <input type="number" {...vitalsForm.register("diastolic", { valueAsNumber: true })} />
                </FormField>
                <FormField label="Saturación">
                  <input type="number" {...vitalsForm.register("oxygenSaturation", { valueAsNumber: true })} />
                </FormField>
                <FormField label="Peso">
                  <input type="number" step="0.1" {...vitalsForm.register("weightKg", { valueAsNumber: true })} />
                </FormField>
                <FormField label="Talla (cm)">
                  <input type="number" step="0.1" {...vitalsForm.register("heightCm", { valueAsNumber: true })} />
                </FormField>
              </div>
              <button className="btn secondary">Guardar signos vitales</button>
            </form>
            <TraceBlock
              label="Última captura"
              author={bundle?.vitals?.updatedByName ?? bundle?.vitals?.createdByName}
              date={bundle?.vitals?.updatedAt ?? bundle?.vitals?.createdAt}
            />
          </Card>

          <div className="two-column">
            <Card>
              <SectionHeading title="Formulario médico" description="Versión base para consulta general." />
              <form
                className="stack"
                onSubmit={medicalForm.handleSubmit(async (values) => {
                  await saveMedicalAssessment(client, values);
                  invalidateBundle();
                })}
              >
                <FormField label="Motivo de consulta">
                  <textarea {...medicalForm.register("chiefComplaint")} />
                </FormField>
                <FormField label="Enfermedad actual">
                  <textarea {...medicalForm.register("currentIllness")} />
                </FormField>
                <FormField label="Impresión diagnóstica">
                  <textarea {...medicalForm.register("diagnosticImpression")} />
                </FormField>
                <FormField label="Plan terapéutico">
                  <textarea {...medicalForm.register("therapeuticPlan")} />
                </FormField>
                <button className="btn secondary">Guardar médico</button>
              </form>
              <TraceBlock
                label="Última edición médica"
                author={bundle?.medical?.updatedByName ?? bundle?.medical?.createdByName}
                date={bundle?.medical?.updatedAt ?? bundle?.medical?.createdAt}
              />
            </Card>

            <Card>
              <SectionHeading title="Enfermería" description="Valoración base con sugerencias internas." />
              <form
                className="stack"
                onSubmit={nursingForm.handleSubmit(async (values) => {
                  await saveNursingAssessment(client, {
                    ...values,
                    suggestionIds: nursingSuggestions.map((item) => item.id),
                  });
                  invalidateBundle();
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
                <button className="btn secondary">Guardar enfermería</button>
              </form>
              <TraceBlock
                label="Última edición de enfermería"
                author={bundle?.nursing?.updatedByName ?? bundle?.nursing?.createdByName}
                date={bundle?.nursing?.updatedAt ?? bundle?.nursing?.createdAt}
              />
            </Card>
          </div>

          <div className="two-column">
            <Card>
              <SectionHeading title="Diagnósticos y notas" description="Trazabilidad visible por autor y hora." />
              <div className="stack">
                <FormField label="Nuevo diagnóstico">
                  <input value={diagnosisDraft} onChange={(event) => setDiagnosisDraft(event.target.value)} />
                </FormField>
                <button
                  className="btn secondary"
                  onClick={async () => {
                    if (!activeEncounter || !diagnosisDraft.trim()) return;
                    await createDiagnosis(client, {
                      encounterId: activeEncounter.id,
                      source: "medical",
                      label: diagnosisDraft.trim(),
                      code: null,
                      isPrimary: bundle?.diagnoses?.length ? false : true,
                      notes: null,
                    });
                    setDiagnosisDraft("");
                    invalidateBundle();
                  }}
                  type="button"
                >
                  Agregar diagnóstico
                </button>
                {(bundle?.diagnoses ?? []).map((diagnosis) => (
                  <div key={diagnosis.id} className="trace-row">
                    <strong>{diagnosis.label}</strong>
                    <span>
                      {diagnosis.createdByName ?? "Sin autor"} · {diagnosis.createdAt ? new Date(diagnosis.createdAt).toLocaleString() : "sin fecha"}
                    </span>
                  </div>
                ))}
              </div>
              <div className="stack" style={{ marginTop: 18 }}>
                <FormField label="Nueva nota clínica">
                  <textarea value={noteDraft} onChange={(event) => setNoteDraft(event.target.value)} />
                </FormField>
                <button
                  className="btn secondary"
                  onClick={async () => {
                    if (!activeEncounter || !noteDraft.trim()) return;
                    await saveClinicalNote(client, {
                      encounterId: activeEncounter.id,
                      noteKind: "general",
                      content: noteDraft.trim(),
                    });
                    setNoteDraft("");
                    invalidateBundle();
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
                      {note.createdByName ?? "Sin autor"} · {note.createdAt ? new Date(note.createdAt).toLocaleString() : "sin fecha"}
                    </span>
                  </div>
                ))}
              </div>
            </Card>

            <Card>
              <SectionHeading title="Procedimientos" description="Registro vivo compartido del episodio." />
              <div className="stack">
                <FormField label="Procedimiento">
                  <input
                    value={procedureDraft.name}
                    onChange={(event) => setProcedureDraft((current) => ({ ...current, name: event.target.value }))}
                  />
                </FormField>
                <FormField label="Resultado">
                  <textarea
                    value={procedureDraft.result ?? ""}
                    onChange={(event) => setProcedureDraft((current) => ({ ...current, result: event.target.value }))}
                  />
                </FormField>
                <button
                  className="btn secondary"
                  onClick={async () => {
                    if (!activeEncounter || !procedureDraft.name.trim()) return;
                    await createProcedure(client, {
                      encounterId: activeEncounter.id,
                      name: procedureDraft.name.trim(),
                      performedAt: new Date().toISOString(),
                      responsibleProfessional: professional ? `${professional.firstName} ${professional.lastName}` : null,
                      materials: [],
                      result: procedureDraft.result ?? null,
                      notes: procedureDraft.notes ?? null,
                    });
                    setProcedureDraft({ name: "", result: "", notes: "" });
                    invalidateBundle();
                  }}
                  type="button"
                >
                  Registrar procedimiento
                </button>
                {(bundle?.procedures ?? []).map((procedure) => (
                  <div key={procedure.id} className="trace-row">
                    <strong>{procedure.name}</strong>
                    <p>{procedure.result ?? procedure.notes ?? "Sin observaciones."}</p>
                    <span>
                      {procedure.createdByName ?? "Sin autor"} · {procedure.createdAt ? new Date(procedure.createdAt).toLocaleString() : "sin fecha"}
                    </span>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          <Card>
            <SectionHeading title="Impresión básica" description="Resumen inicial listo para descarga en PDF." />
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
                  <button className="btn warn">{loading ? "Preparando PDF..." : "Descargar resumen clínico"}</button>
                )}
              </PDFDownloadLink>
            </div>
          </Card>
        </>
      ) : null}
    </div>
  );
}
