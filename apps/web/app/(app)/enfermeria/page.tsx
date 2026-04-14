"use client";

import {
  createDiagnosis,
  getEncounterBundle,
  listEncounters,
  listPatients,
  saveClinicalNote,
} from "@axyscare/core-db";
import { internalNursingSuggestionCatalog } from "@axyscare/core-catalogs";
import {
  Card,
  EmptyStatePanel,
  LoadingStateCard,
  SectionHeading,
  StatusBadge,
} from "@axyscare/ui-shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/components/providers/providers";
import { usePatientRealtime } from "@/components/realtime/use-patient-realtime";

function formatPaePlanContent(input: {
  patientName: string;
  assessmentSummary: string;
  selectedLabels: string[];
  outcomes: string[];
  interventions: string[];
  goals: string;
  evaluation: string;
}) {
  return [
    `PAE estructurado para ${input.patientName}`,
    "",
    "Valoración de enfermería:",
    input.assessmentSummary || "Sin valoración complementaria registrada.",
    "",
    "Diagnósticos NANDA/PAE:",
    input.selectedLabels.length ? input.selectedLabels.map((item) => `- ${item}`).join("\n") : "- Sin diagnósticos seleccionados.",
    "",
    "Resultados esperados (NOC):",
    input.outcomes.length ? input.outcomes.map((item) => `- ${item}`).join("\n") : "- Sin resultados seleccionados.",
    "",
    "Intervenciones (NIC):",
    input.interventions.length ? input.interventions.map((item) => `- ${item}`).join("\n") : "- Sin intervenciones seleccionadas.",
    "",
    "Objetivos y metas:",
    input.goals || "Sin metas registradas.",
    "",
    "Evaluación y reevaluación:",
    input.evaluation || "Sin criterios de evaluación registrados.",
  ].join("\n");
}

export default function NursingPage() {
  const { client } = useAuth();
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const patientIdFromQuery = searchParams.get("patientId") ?? "";
  const encounterIdFromQuery = searchParams.get("encounterId") ?? "";
  const sectionFromQuery = searchParams.get("section") ?? "";
  const [selectedPatientId, setSelectedPatientId] = useState("");
  const [selectedEncounterId, setSelectedEncounterId] = useState("");
  const [paeSearch, setPaeSearch] = useState("");
  const [selectedPaeIds, setSelectedPaeIds] = useState<string[]>([]);
  const [selectedOutcomes, setSelectedOutcomes] = useState<string[]>([]);
  const [selectedInterventions, setSelectedInterventions] = useState<string[]>([]);
  const [assessmentSummary, setAssessmentSummary] = useState("");
  const [goalsText, setGoalsText] = useState("");
  const [evaluationText, setEvaluationText] = useState("");
  const [paeMessage, setPaeMessage] = useState<string | null>(null);

  const patientsQuery = useQuery({
    queryKey: ["patients", "nursing"],
    queryFn: () => listPatients(client),
  });
  const encountersQuery = useQuery({
    queryKey: ["encounters", "nursing", selectedPatientId],
    queryFn: () => listEncounters(client, selectedPatientId || undefined),
  });
  const bundleQuery = useQuery({
    queryKey: ["encounter-bundle", "nursing", selectedEncounterId],
    queryFn: () => getEncounterBundle(client, selectedEncounterId),
    enabled: Boolean(selectedEncounterId),
  });
  usePatientRealtime(selectedPatientId || undefined, [
    ["encounters", "nursing", selectedPatientId],
    ["encounter-bundle", "nursing", selectedEncounterId],
  ]);

  const nursingEncounters = (encountersQuery.data ?? []).filter(
    (encounter) =>
      encounter.encounterType === "nursing" ||
      encounter.encounterType === "mixed",
  );

  useEffect(() => {
    if (patientIdFromQuery) {
      setSelectedPatientId(patientIdFromQuery);
    }
  }, [patientIdFromQuery]);

  useEffect(() => {
    if (encounterIdFromQuery) {
      setSelectedEncounterId(encounterIdFromQuery);
    }
  }, [encounterIdFromQuery]);

  useEffect(() => {
    const nextEncounterId = nursingEncounters[0]?.id ?? "";
    setSelectedEncounterId((current) =>
      current && nursingEncounters.some((item) => item.id === current)
        ? current
        : nextEncounterId,
    );
  }, [nursingEncounters]);

  const bundle = bundleQuery.data;
  const selectedPatient = (patientsQuery.data ?? []).find((patient) => patient.id === selectedPatientId) ?? null;
  const filteredPaeCatalog = useMemo(() => {
    const search = paeSearch.trim().toLowerCase();
    return internalNursingSuggestionCatalog.filter((entry) =>
      !search
        ? true
        : `${entry.label} ${entry.signs?.join(" ") ?? ""} ${entry.outcomes.join(" ")} ${entry.interventions.join(" ")}`
            .toLowerCase()
            .includes(search),
    );
  }, [paeSearch]);
  const selectedPaeEntries = useMemo(
    () =>
      internalNursingSuggestionCatalog.filter((entry) =>
        selectedPaeIds.includes(entry.id),
      ),
    [selectedPaeIds],
  );
  const availableOutcomes = useMemo(
    () => Array.from(new Set(selectedPaeEntries.flatMap((entry) => entry.outcomes))),
    [selectedPaeEntries],
  );
  const availableInterventions = useMemo(
    () => Array.from(new Set(selectedPaeEntries.flatMap((entry) => entry.interventions))),
    [selectedPaeEntries],
  );
  const existingPaeDiagnoses = (bundle?.diagnoses ?? []).filter((item) => item.source === "nursing_pae");
  const latestCarePlanNote =
    (bundle?.notes ?? [])
      .filter((note) => note.noteKind === "nursing_care_plan")
      .sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""))[0] ?? null;
  const quickSummary = [
    { label: "Pacientes visibles", value: patientsQuery.data?.length ?? 0 },
    { label: "Encuentros nursing", value: nursingEncounters.length },
    { label: "Diagnósticos PAE", value: bundle?.diagnoses.length ?? 0 },
    { label: "Adjuntos clínicos", value: bundle?.attachments.length ?? 0 },
  ];

  useEffect(() => {
    const nursing = bundle?.nursing;
    if (!nursing) return;
    setAssessmentSummary((current) => current || nursing.observations || nursing.careReason || "");
  }, [bundle?.nursing]);

  useEffect(() => {
    const existingIds = existingPaeDiagnoses
      .map((diagnosis) => diagnosis.code)
      .filter((code): code is string => Boolean(code));

    if (!existingIds.length) return;
    setSelectedPaeIds((current) => (current.length ? current : existingIds));
  }, [existingPaeDiagnoses]);

  const paeMutation = useMutation({
    mutationFn: async () => {
      if (!selectedEncounterId || !selectedPatient) {
        throw new Error("Selecciona un paciente y un episodio nursing antes de guardar el PAE.");
      }

      const diagnosesToCreate = selectedPaeEntries.filter(
        (entry) =>
          !existingPaeDiagnoses.some(
            (diagnosis) => diagnosis.code === entry.id || diagnosis.label === entry.label,
          ),
      );

      await Promise.all(
        diagnosesToCreate.map((entry, index) =>
          createDiagnosis(client, {
            encounterId: selectedEncounterId,
            source: "nursing_pae",
            code: entry.id,
            label: entry.label,
            isPrimary: index === 0 && existingPaeDiagnoses.length === 0,
            notes: entry.signs?.join(" · ") ?? null,
          }),
        ),
      );

      await saveClinicalNote(client, {
        encounterId: selectedEncounterId,
        noteKind: "nursing_care_plan",
        content: formatPaePlanContent({
          patientName: `${selectedPatient.firstName} ${selectedPatient.lastName}`.trim(),
          assessmentSummary,
          selectedLabels: selectedPaeEntries.map((entry) => entry.label),
          outcomes: selectedOutcomes,
          interventions: selectedInterventions,
          goals: goalsText,
          evaluation: evaluationText,
        }),
      });
    },
    onSuccess: () => {
      setPaeMessage("PAE guardado dentro del episodio clínico.");
      queryClient.invalidateQueries({ queryKey: ["encounter-bundle", "nursing", selectedEncounterId] });
      queryClient.invalidateQueries({ queryKey: ["encounters", "nursing", selectedPatientId] });
    },
    onError: (error) => {
      setPaeMessage(error instanceof Error ? error.message : "No se pudo guardar el PAE.");
    },
  });

  return (
    <div className="stack">
      <div className="topbar">
        <div>
          <h1>Centro de valoración y continuidad</h1>
          <p>
            Consola operativa para valorar, revisar evolución y sostener el
            plan de cuidados dentro del mismo episodio clínico.
          </p>
        </div>
      </div>

      <div className="summary-grid">
        {quickSummary.map((item) => (
          <Card key={item.label} className="summary-item">
            <span>{item.label}</span>
            <strong>{item.value}</strong>
          </Card>
        ))}
      </div>

      <Card>
        <SectionHeading
          title="Selecciona el caso activo"
          description="Filtra por paciente y continúa la valoración o el plan PAE dentro del episodio correcto."
        />
        <div className="form-grid">
          <div className="form-field">
            <span>Paciente</span>
            <select
              value={selectedPatientId}
              onChange={(event) => setSelectedPatientId(event.target.value)}
            >
              <option value="">Selecciona</option>
              {(patientsQuery.data ?? []).map((patient) => (
                <option key={patient.id} value={patient.id}>
                  {patient.firstName} {patient.lastName}
                </option>
              ))}
            </select>
          </div>
        </div>
      </Card>

      {sectionFromQuery === "pae" || selectedEncounterId ? (
        <Card>
          <SectionHeading
            title="Constructor PAE"
            description="Selecciona diagnósticos de enfermería, resultados esperados e intervenciones para dejar un plan estructurado dentro del episodio."
            action={
              selectedEncounterId ? (
                <StatusBadge label="PAE activo" tone="info" />
              ) : undefined
            }
          />
          {!selectedEncounterId ? (
            <EmptyStatePanel
              title="Selecciona primero un episodio nursing."
              description="El PAE se guarda dentro de un encuentro de enfermería o mixto para mantener continuidad clínica."
            />
          ) : (
            <div className="two-column">
              <div className="stack">
                <div className="form-field">
                  <span>Buscar diagnóstico PAE / NANDA</span>
                  <input
                    value={paeSearch}
                    onChange={(event) => setPaeSearch(event.target.value)}
                    placeholder="Dolor, infección, piel, respiratorio, glucemia..."
                  />
                </div>
                <div className="stack">
                  {filteredPaeCatalog.slice(0, 10).map((entry) => {
                    const active = selectedPaeIds.includes(entry.id);
                    return (
                      <button
                        key={entry.id}
                        type="button"
                        className={`picker-row ${active ? "selected" : ""}`}
                        onClick={() =>
                          setSelectedPaeIds((current) =>
                            current.includes(entry.id)
                              ? current.filter((item) => item !== entry.id)
                              : [...current, entry.id],
                          )
                        }
                      >
                        <strong>{entry.label}</strong>
                        <span>{entry.signs?.join(" · ") || "Sin signos guía."}</span>
                        <span>{active ? "Seleccionado" : "Pulsa para agregar al PAE"}</span>
                      </button>
                    );
                  })}
                </div>

                <div className="form-field">
                  <span>Valoración resumida</span>
                  <textarea
                    value={assessmentSummary}
                    onChange={(event) => setAssessmentSummary(event.target.value)}
                    placeholder="Resume hallazgos subjetivos, objetivos, riesgos y respuestas del paciente."
                  />
                </div>

                <div className="form-field">
                  <span>Objetivos y metas</span>
                  <textarea
                    value={goalsText}
                    onChange={(event) => setGoalsText(event.target.value)}
                    placeholder="Ej. disminuir dolor a EVA menor de 3, mantener piel íntegra, saturación mayor a 92%..."
                  />
                </div>

                <div className="form-field">
                  <span>Evaluación y reevaluación</span>
                  <textarea
                    value={evaluationText}
                    onChange={(event) => setEvaluationText(event.target.value)}
                    placeholder="Define qué se va a reevaluar, en cuánto tiempo y qué criterio indicará evolución favorable."
                  />
                </div>

                <div className="btn-row">
                  <button
                    type="button"
                    className="btn"
                    onClick={() => {
                      setPaeMessage(null);
                      paeMutation.mutate();
                    }}
                    disabled={paeMutation.isPending || !selectedPaeIds.length}
                  >
                    {paeMutation.isPending ? "Guardando PAE..." : "Guardar PAE"}
                  </button>
                  <Link
                    href={`/historia-clinica?patientId=${selectedPatientId}&encounterId=${selectedEncounterId}`}
                    className="pill-link"
                  >
                    Ver en historia clínica
                  </Link>
                </div>
                {paeMessage ? <div className="info-panel"><strong>Estado</strong><span>{paeMessage}</span></div> : null}
              </div>

              <div className="stack">
                <Card>
                  <SectionHeading
                    title="Resultados esperados (NOC)"
                    description="Selecciona los resultados a monitorizar para este plan."
                  />
                  {availableOutcomes.length ? (
                    <div className="stack">
                      {availableOutcomes.map((outcome) => (
                        <label key={outcome} className="picker-row" style={{ cursor: "pointer" }}>
                          <strong>{outcome}</strong>
                          <input
                            type="checkbox"
                            checked={selectedOutcomes.includes(outcome)}
                            onChange={() =>
                              setSelectedOutcomes((current) =>
                                current.includes(outcome)
                                  ? current.filter((item) => item !== outcome)
                                  : [...current, outcome],
                              )
                            }
                          />
                        </label>
                      ))}
                    </div>
                  ) : (
                    <EmptyStatePanel
                      title="Selecciona primero diagnósticos PAE."
                      description="Los resultados se sugieren a partir de los diagnósticos elegidos."
                    />
                  )}
                </Card>

                <Card>
                  <SectionHeading
                    title="Intervenciones (NIC)"
                    description="Marca las acciones de cuidado que compondrán el plan."
                  />
                  {availableInterventions.length ? (
                    <div className="stack">
                      {availableInterventions.map((intervention) => (
                        <label key={intervention} className="picker-row" style={{ cursor: "pointer" }}>
                          <strong>{intervention}</strong>
                          <input
                            type="checkbox"
                            checked={selectedInterventions.includes(intervention)}
                            onChange={() =>
                              setSelectedInterventions((current) =>
                                current.includes(intervention)
                                  ? current.filter((item) => item !== intervention)
                                  : [...current, intervention],
                              )
                            }
                          />
                        </label>
                      ))}
                    </div>
                  ) : (
                    <EmptyStatePanel
                      title="Sin intervenciones sugeridas todavía."
                      description="Elige uno o más diagnósticos para activar intervenciones NIC asociadas."
                    />
                  )}
                </Card>
              </div>
            </div>
          )}
        </Card>
      ) : null}

      <div className="workspace-grid">
        <Card>
          <SectionHeading
            title="Episodios con ruta de enfermería"
            description="Se priorizan encounters nursing o mixed para continuar el mismo plan de cuidado."
          />
          {encountersQuery.isPending ? (
            <LoadingStateCard
              title="Cargando encuentros de enfermería"
              description="Estamos localizando los episodios nursing o mixed vinculados al paciente seleccionado."
            />
          ) : nursingEncounters.length ? (
            nursingEncounters.map((encounter) => (
              <button
                key={encounter.id}
                type="button"
                className={`picker-row ${selectedEncounterId === encounter.id ? "selected" : ""}`}
                onClick={() => setSelectedEncounterId(encounter.id)}
              >
                <strong>
                  {new Date(encounter.startedAt).toLocaleString()}
                </strong>
                <span>
                  {encounter.chiefComplaint ?? "Sin motivo registrado"}
                </span>
                <span>{encounter.createdByName ?? "Sin autor"}</span>
              </button>
            ))
          ) : (
            <EmptyStatePanel
              title="No hay valoraciones de enfermería disponibles."
              description="Abre una nueva atención de tipo enfermería o mixta para empezar y la valoración aparecerá aquí."
              action={
                <Link href="/nueva-atencion" className="pill-link">
                  Abrir Nueva atención
                </Link>
              }
            />
          )}
        </Card>

        <Card className="workspace-aside">
          <SectionHeading
            title="Acciones clínicas"
            description="Usa el mismo contexto del episodio para evitar duplicidad."
          />
          <div className="stack">
            {selectedEncounterId ? (
              <Link
                href={`/nueva-atencion?encounterId=${selectedEncounterId}${selectedPatientId ? `&patientId=${selectedPatientId}` : ""}`}
                className="btn"
              >
                Continuar valoración
              </Link>
            ) : null}
            {selectedPatientId ? (
              <Link
                href={`/historia-clinica?patientId=${selectedPatientId}${selectedEncounterId ? `&encounterId=${selectedEncounterId}` : ""}`}
                className="pill-link"
              >
                Abrir historia longitudinal
              </Link>
            ) : null}
            {selectedPatientId ? (
              <Link
                href={`/documentos?patientId=${selectedPatientId}${selectedEncounterId ? `&encounterId=${selectedEncounterId}` : ""}`}
                className="pill-link"
              >
                Revisar documentos clínicos
              </Link>
            ) : null}
          </div>
        </Card>
      </div>

      {bundleQuery.isPending ? (
        <LoadingStateCard
          title="Cargando valoración de enfermería"
          description="Estamos trayendo notas, signos vitales y contexto clínico del encounter seleccionado."
        />
      ) : bundle ? (
        <div className="two-column">
          <Card>
            <SectionHeading
              title="Valoración de enfermería"
              description="Motivo de atención, observaciones y sugerencias registradas."
              action={
                <StatusBadge
                  label={bundle.encounter.encounterType}
                  tone="info"
                />
              }
            />
            {bundle.nursing ? (
              <div className="stack">
                <div className="trace-row">
                  <strong>Motivo de atención</strong>
                  <p>{bundle.nursing.careReason}</p>
                  <span>
                    {bundle.nursing.updatedByName ??
                      bundle.nursing.createdByName ??
                      "Sin autor"}{" "}
                    ·{" "}
                    {bundle.nursing.updatedAt
                      ? new Date(bundle.nursing.updatedAt).toLocaleString()
                      : bundle.nursing.createdAt
                        ? new Date(bundle.nursing.createdAt).toLocaleString()
                        : "sin fecha"}
                  </span>
                </div>
                <div className="trace-row">
                  <strong>Observaciones</strong>
                  <p>{bundle.nursing.observations || "Sin observaciones."}</p>
                </div>
                <div className="trace-row">
                  <strong>Riesgos</strong>
                  <p>{bundle.nursing.risks || "Sin riesgos registrados."}</p>
                </div>
              </div>
            ) : (
              <EmptyStatePanel
                title="Este encounter aún no tiene valoración de enfermería guardada."
                description="Puedes completarla desde Nueva atención y luego volver aquí para revisar continuidad del cuidado."
                action={
                  <Link
                    href={`/nueva-atencion?encounterId=${selectedEncounterId}`}
                    className="pill-link"
                  >
                    Completar valoración
                  </Link>
                }
              />
            )}
          </Card>

          <Card>
            <SectionHeading
              title="Contexto clínico"
              description="Indicadores mínimos para decidir continuidad, riesgos y plan de cuidados."
            />
            <div className="summary-grid">
              <div className="summary-item">
                <span>Signos vitales</span>
                <strong>{bundle.vitals ? "Sí" : "Pendiente"}</strong>
              </div>
              <div className="summary-item">
                <span>Diagnósticos</span>
                <strong>{bundle.diagnoses.length}</strong>
              </div>
              <div className="summary-item">
                <span>Notas</span>
                <strong>{bundle.notes.length}</strong>
              </div>
              <div className="summary-item">
                <span>Adjuntos</span>
                <strong>{bundle.attachments.length}</strong>
              </div>
            </div>
            <div className="info-panel">
              <strong>Uso recomendado</strong>
              <span>
                Desde esta vista conviene revisar riesgos, confirmar signos
                vitales, abrir historia longitudinal y continuar el mismo plan
                de cuidados sin abrir un episodio nuevo.
              </span>
            </div>
            {latestCarePlanNote ? (
              <div className="trace-row">
                <strong>Último PAE guardado</strong>
                <p style={{ whiteSpace: "pre-wrap" }}>{latestCarePlanNote.content}</p>
                <span>
                  {latestCarePlanNote.createdByName ?? "Sin autor"} ·{" "}
                  {latestCarePlanNote.createdAt
                    ? new Date(latestCarePlanNote.createdAt).toLocaleString()
                    : "sin fecha"}
                </span>
              </div>
            ) : null}
          </Card>
        </div>
      ) : null}
    </div>
  );
}
