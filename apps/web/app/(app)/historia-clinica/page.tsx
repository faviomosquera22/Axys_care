"use client";

import {
  getEncounterBundle,
  getPatient,
  listEncounters,
  listPatients,
} from "@axyscare/core-db";
import { Card, SectionHeading, StatusBadge } from "@axyscare/ui-shared";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ClinicalContextBanner } from "@/components/layout/clinical-context-banner";
import { useAuth } from "@/components/providers/providers";

type HistoryFilter = "all" | "assessments" | "notes" | "orders" | "documents";
type EncounterBundle = Awaited<ReturnType<typeof getEncounterBundle>>;

type TimelineItem = {
  id: string;
  filter: HistoryFilter;
  label: string;
  title: string;
  description: string;
  meta: string;
  tone: "neutral" | "success" | "warning" | "danger" | "info";
  timestamp: string;
};

function formatDateTime(value?: string | null) {
  if (!value) return "Sin fecha";
  return new Date(value).toLocaleString();
}

function truncate(value?: string | null, fallback = "Sin detalle") {
  const normalized = value?.trim();
  if (!normalized) return fallback;
  return normalized.length > 180 ? `${normalized.slice(0, 180).trim()}...` : normalized;
}

function filterLabel(filter: HistoryFilter) {
  if (filter === "assessments") return "Valoraciones";
  if (filter === "notes") return "Notas";
  if (filter === "orders") return "Órdenes";
  if (filter === "documents") return "Documentos";
  return "Todo";
}

function buildTimelineItems(bundle: EncounterBundle) {
  const items: TimelineItem[] = [];

  if (bundle.vitals) {
    items.push({
      id: `vitals-${bundle.vitals.encounterId}`,
      filter: "assessments",
      label: "Signos vitales",
      title: "Captura de signos vitales",
      description:
        [
          bundle.vitals.temperatureC ? `Temp ${bundle.vitals.temperatureC} °C` : "",
          bundle.vitals.heartRate ? `FC ${bundle.vitals.heartRate}` : "",
          bundle.vitals.systolic && bundle.vitals.diastolic ? `PA ${bundle.vitals.systolic}/${bundle.vitals.diastolic}` : "",
          bundle.vitals.oxygenSaturation ? `Sat ${bundle.vitals.oxygenSaturation}%` : "",
        ]
          .filter(Boolean)
          .join(" · ") || "Sin parámetros destacados",
      meta: `${bundle.vitals.updatedByName ?? bundle.vitals.createdByName ?? "Sin autor"} · ${formatDateTime(bundle.vitals.updatedAt ?? bundle.vitals.createdAt ?? bundle.vitals.recordedAt)}`,
      tone: "info",
      timestamp: bundle.vitals.updatedAt ?? bundle.vitals.createdAt ?? bundle.vitals.recordedAt,
    });
  }

  if (bundle.medical) {
    items.push({
      id: `medical-${bundle.medical.encounterId}`,
      filter: "assessments",
      label: "Valoración médica",
      title: bundle.medical.chiefComplaint || "Consulta médica",
      description: truncate(bundle.medical.diagnosticImpression || bundle.medical.currentIllness, "Sin impresión diagnóstica registrada"),
      meta: `${bundle.medical.updatedByName ?? bundle.medical.createdByName ?? "Sin autor"} · ${formatDateTime(bundle.medical.updatedAt ?? bundle.medical.createdAt)}`,
      tone: "success",
      timestamp: bundle.medical.updatedAt ?? bundle.medical.createdAt ?? "",
    });
  }

  if (bundle.nursing) {
    items.push({
      id: `nursing-${bundle.nursing.encounterId}`,
      filter: "assessments",
      label: "Enfermería",
      title: bundle.nursing.careReason || "Valoración de enfermería",
      description: truncate(bundle.nursing.observations || bundle.nursing.risks, "Sin observaciones registradas"),
      meta: `${bundle.nursing.updatedByName ?? bundle.nursing.createdByName ?? "Sin autor"} · ${formatDateTime(bundle.nursing.updatedAt ?? bundle.nursing.createdAt)}`,
      tone: "info",
      timestamp: bundle.nursing.updatedAt ?? bundle.nursing.createdAt ?? "",
    });
  }

  bundle.diagnoses.forEach((diagnosis) => {
    items.push({
      id: `diagnosis-${diagnosis.id}`,
      filter: "assessments",
      label: "Diagnóstico",
      title: diagnosis.label,
      description: truncate(diagnosis.notes, diagnosis.code ? `${diagnosis.source} · ${diagnosis.code}` : diagnosis.source),
      meta: `${diagnosis.createdByName ?? "Sin autor"} · ${formatDateTime(diagnosis.createdAt)}`,
      tone: diagnosis.isPrimary ? "warning" : "neutral",
      timestamp: diagnosis.createdAt ?? "",
    });
  });

  bundle.notes.forEach((note) => {
    items.push({
      id: `note-${note.id}`,
      filter: "notes",
      label: "Nota clínica",
      title: note.noteKind,
      description: truncate(note.content),
      meta: `${note.createdByName ?? "Sin autor"} · ${formatDateTime(note.createdAt)}`,
      tone:
        note.noteKind === "patient_indications" ||
        note.noteKind === "nursing_care_plan" ||
        note.noteKind === "psychology_plan" ||
        note.noteKind === "nutrition_plan"
          ? "success"
          : "neutral",
      timestamp: note.createdAt ?? "",
    });
  });

  bundle.medicationOrders.forEach((medication) => {
    items.push({
      id: `medication-${medication.id}`,
      filter: "orders",
      label: "Medicamento",
      title: medication.medicationName,
      description:
        [
          medication.presentation,
          medication.dosage,
          medication.route,
          medication.frequency,
          medication.duration,
        ]
          .filter(Boolean)
          .join(" · ") || "Sin detalle farmacológico",
      meta: `${medication.createdByName ?? "Sin autor"} · ${formatDateTime(medication.createdAt)}`,
      tone: "success",
      timestamp: medication.createdAt ?? "",
    });
  });

  bundle.procedures.forEach((procedure) => {
    items.push({
      id: `procedure-${procedure.id}`,
      filter: "orders",
      label: "Procedimiento",
      title: procedure.name,
      description: truncate(procedure.result || procedure.notes, "Sin observaciones del procedimiento"),
      meta: `${procedure.responsibleProfessional ?? procedure.createdByName ?? "Sin responsable"} · ${formatDateTime(procedure.performedAt ?? procedure.createdAt)}`,
      tone: "warning",
      timestamp: procedure.performedAt ?? procedure.createdAt ?? "",
    });
  });

  bundle.examOrders.forEach((examOrder) => {
    items.push({
      id: `exam-${examOrder.id}`,
      filter: "orders",
      label: "Examen",
      title: examOrder.examName,
      description: truncate(examOrder.instructions, `${examOrder.category} · ${examOrder.status}`),
      meta: `${examOrder.createdByName ?? "Sin autor"} · ${formatDateTime(examOrder.orderedAt)}`,
      tone: examOrder.status === "pendiente" ? "warning" : "info",
      timestamp: examOrder.orderedAt ?? "",
    });
  });

  bundle.attachments.forEach((attachment) => {
    items.push({
      id: `attachment-${attachment.id}`,
      filter: "documents",
      label: "Adjunto",
      title: attachment.fileName,
      description: `${attachment.category} · ${attachment.mimeType}`,
      meta: `${attachment.createdByName ?? "Sin autor"} · ${formatDateTime(attachment.createdAt)}`,
      tone: attachment.category === "resultado" ? "info" : "neutral",
      timestamp: attachment.createdAt ?? "",
    });
  });

  return items.sort((left, right) => new Date(right.timestamp).getTime() - new Date(left.timestamp).getTime());
}

export default function HistoryPage() {
  const { client } = useAuth();
  const searchParams = useSearchParams();
  const patientId = searchParams.get("patientId") ?? "";
  const encounterId = searchParams.get("encounterId") ?? "";
  const [selectedPatientId, setSelectedPatientId] = useState(patientId);
  const [selectedEncounterId, setSelectedEncounterId] = useState<string>(encounterId);
  const [activeFilter, setActiveFilter] = useState<HistoryFilter>("all");

  useEffect(() => {
    setSelectedPatientId(patientId);
  }, [patientId]);

  useEffect(() => {
    if (encounterId) {
      setSelectedEncounterId(encounterId);
    }
  }, [encounterId]);

  const patientsQuery = useQuery({
    queryKey: ["patients", "history"],
    queryFn: () => listPatients(client),
  });
  const patientQuery = useQuery({
    queryKey: ["patient", "history", selectedPatientId],
    queryFn: () => getPatient(client, selectedPatientId),
    enabled: Boolean(selectedPatientId),
  });
  const encountersQuery = useQuery({
    queryKey: ["encounters", "history", selectedPatientId],
    queryFn: () => listEncounters(client, selectedPatientId || undefined),
  });
  const encounterBundleQuery = useQuery({
    queryKey: ["encounter-bundle", "history", selectedEncounterId],
    queryFn: () => getEncounterBundle(client, selectedEncounterId),
    enabled: Boolean(selectedEncounterId),
  });

  useEffect(() => {
    const nextEncounterId = encountersQuery.data?.[0]?.id ?? "";
    setSelectedEncounterId((current) =>
      current && encountersQuery.data?.some((item) => item.id === current) ? current : nextEncounterId,
    );
  }, [encountersQuery.data]);

  const patients = patientsQuery.data ?? [];
  const encounters = encountersQuery.data ?? [];
  const bundle = encounterBundleQuery.data;
  const selectedPatient = patientQuery.data;
  const selectedEncounter = useMemo(
    () => encounters.find((encounter) => encounter.id === selectedEncounterId) ?? null,
    [encounters, selectedEncounterId],
  );
  const timelineItems = useMemo(() => (bundle ? buildTimelineItems(bundle) : []), [bundle]);
  const filteredTimelineItems = useMemo(
    () => timelineItems.filter((item) => (activeFilter === "all" ? true : item.filter === activeFilter)),
    [activeFilter, timelineItems],
  );
  const timelineCounts = useMemo(
    () => ({
      all: timelineItems.length,
      assessments: timelineItems.filter((item) => item.filter === "assessments").length,
      notes: timelineItems.filter((item) => item.filter === "notes").length,
      orders: timelineItems.filter((item) => item.filter === "orders").length,
      documents: timelineItems.filter((item) => item.filter === "documents").length,
    }),
    [timelineItems],
  );
  const filters = ["all", "assessments", "notes", "orders", "documents"] as HistoryFilter[];

  return (
    <div className="stack">
      {selectedPatient ? null : (
        <section className="page-hero">
          <div className="page-hero__content">
            <span className="page-hero__eyebrow">Historia clínica</span>
            <h1>Consulta longitudinal del expediente</h1>
            <p>
              Selecciona paciente y episodio para revisar evolución, órdenes, notas y adjuntos
              sobre el mismo encounter.
            </p>
          </div>
        </section>
      )}

      <div className="history-status-strip">
        <span className="status-chip">
          <span className="status-dot dot-teal" />
          {selectedPatient ? `${selectedPatient.firstName} ${selectedPatient.lastName}` : "Sin paciente seleccionado"}
        </span>
        <span className="status-chip">
          <span className={`status-dot ${selectedEncounter?.status === "open" ? "dot-amber" : "dot-green"}`} />
          {selectedEncounter ? `Encounter ${selectedEncounter.status}` : "Sin encounter activo"}
        </span>
        <span className="status-chip">
          <span className="status-dot dot-blue" />
          {filteredTimelineItems.length} eventos visibles
        </span>
      </div>

      <div className="history-console">
        <Card className="history-console__filters">
          <SectionHeading
            title="Filtro clínico"
            description="La historia se organiza por paciente, encounter y tipo de contenido."
          />
          <div className="stack">
            <div className="form-field">
              <span>Paciente</span>
              <select value={selectedPatientId} onChange={(event) => setSelectedPatientId(event.target.value)}>
                <option value="">Todos los pacientes</option>
                {patients.map((patient) => (
                  <option key={patient.id} value={patient.id}>
                    {patient.firstName} {patient.lastName}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-field">
              <span>Contenido visible</span>
              <div className="history-filter-row">
                {filters.map((filter) => (
                  <button
                    key={filter}
                    type="button"
                    className={`history-filter-chip ${activeFilter === filter ? "active" : ""}`}
                    onClick={() => setActiveFilter(filter)}
                  >
                    {filterLabel(filter)} · {timelineCounts[filter]}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </Card>

        <Card className="history-console__summary">
          <SectionHeading
            title="Resumen operativo"
            description="Puntos de control para leer el episodio sin perder contexto."
          />
          <div className="summary-grid">
            <div className="summary-item">
              <span>Encuentros</span>
              <strong>{encounters.length}</strong>
            </div>
            <div className="summary-item">
              <span>Filtro</span>
              <strong>{filterLabel(activeFilter)}</strong>
            </div>
            <div className="summary-item">
              <span>Notas</span>
              <strong>{timelineCounts.notes}</strong>
            </div>
            <div className="summary-item">
              <span>Adjuntos</span>
              <strong>{timelineCounts.documents}</strong>
            </div>
          </div>
        </Card>
      </div>

      {selectedPatient ? (
        <ClinicalContextBanner
          patient={selectedPatient}
          encounter={selectedEncounter}
          stageLabel={selectedEncounter ? "Historia clínica longitudinal" : "Paciente seleccionado sin encounter activo"}
          lastSavedAt={
            selectedEncounter
              ? selectedEncounter.updatedAt ?? selectedEncounter.createdAt ?? selectedEncounter.startedAt
              : selectedPatient.updatedAt ?? selectedPatient.createdAt
          }
        />
      ) : null}

      <div className="history-workspace">
        <Card className="history-workspace__rail">
          <SectionHeading
            title="Encuentros"
            description="Selecciona un episodio para leer o continuar la evolución."
          />
          {encounters.length ? (
            <div className="stack">
              {encounters.map((encounter) => (
                <button
                  key={encounter.id}
                  type="button"
                  className={`history-encounter-card ${selectedEncounterId === encounter.id ? "selected" : ""}`}
                  onClick={() => setSelectedEncounterId(encounter.id)}
                >
                  <strong>{encounter.chiefComplaint ?? "Sin motivo registrado"}</strong>
                  <span>{formatDateTime(encounter.startedAt)}</span>
                  <div className="btn-row">
                    <StatusBadge label={encounter.encounterType} tone="info" />
                    <StatusBadge label={encounter.status} tone={encounter.status === "open" ? "warning" : "success"} />
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <strong>No hay encuentros para mostrar.</strong>
              <p>Abre una nueva atención para comenzar la historia clínica del paciente.</p>
            </div>
          )}
        </Card>

        <div className="history-workspace__main stack">
          {selectedEncounter && bundle ? (
            <>
              <Card>
                <SectionHeading
                  title="Resumen del episodio"
                  description={selectedEncounter.chiefComplaint ?? "Sin motivo registrado"}
                  action={
                    <div className="btn-row">
                      <StatusBadge label={selectedEncounter.encounterType} tone="info" />
                      <StatusBadge label={selectedEncounter.status} tone={selectedEncounter.status === "open" ? "warning" : "success"} />
                    </div>
                  }
                />
                <div className="summary-grid">
                  <div className="summary-item">
                    <span>Eventos visibles</span>
                    <strong>{filteredTimelineItems.length}</strong>
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
              </Card>

              <Card>
                <SectionHeading
                  title="Timeline del episodio"
                  description="Lectura cronológica unificada del encounter seleccionado."
                />
                {filteredTimelineItems.length ? (
                  <div className="history-timeline">
                    {filteredTimelineItems.map((item) => (
                      <article key={item.id} className="history-timeline-entry">
                        <div className={`history-timeline-entry__dot history-timeline-entry__dot--${item.tone}`} />
                        <div className="history-timeline-entry__body">
                          <div className="history-timeline-card__top">
                            <div>
                              <strong>{item.title}</strong>
                              <p>{item.description}</p>
                            </div>
                            <StatusBadge label={item.label} tone={item.tone} />
                          </div>
                          <span>{item.meta}</span>
                        </div>
                      </article>
                    ))}
                  </div>
                ) : (
                  <div className="empty-state">
                    <strong>No hay eventos para este filtro.</strong>
                    <p>Cambia el filtro o continúa el encounter para registrar más contenido clínico.</p>
                  </div>
                )}
              </Card>
            </>
          ) : (
            <Card>
              <SectionHeading
                title="Selecciona un encounter"
                description="La lectura longitudinal se activa cuando eliges un episodio del paciente."
              />
              <div className="empty-state">
                <strong>Sin episodio seleccionado.</strong>
                <p>Usa el rail izquierdo para abrir un encounter existente o crea una nueva atención.</p>
              </div>
            </Card>
          )}
        </div>

        <aside className="history-workspace__side stack">
          <Card className="clinical-side-card">
            <SectionHeading
              title="Acciones"
              description="Trabaja sobre el mismo episodio, no sobre copias."
            />
            {selectedEncounter ? (
              <div className="stack">
                <div className="meta-strip">
                  <strong>Estado</strong>
                  <span>{selectedEncounter.status}</span>
                </div>
                <div className="meta-strip">
                  <strong>Contenido visible</strong>
                  <span>{filteredTimelineItems.length} eventos filtrados de {timelineItems.length}</span>
                </div>
                <div className="btn-row" style={{ flexWrap: "wrap" }}>
                  <Link
                    href={`/nueva-atencion?patientId=${selectedEncounter.patientId}&encounterId=${selectedEncounter.id}`}
                    className="btn"
                  >
                    Continuar edición
                  </Link>
                  <Link href={`/pacientes/${selectedEncounter.patientId}`} className="btn secondary">
                    Ver ficha
                  </Link>
                </div>
              </div>
            ) : (
              <div className="empty-state">
                <strong>Selecciona un encounter.</strong>
                <p>Así podrás revisar la secuencia clínica y continuar la edición.</p>
              </div>
            )}
          </Card>

          {selectedEncounter && bundle ? (
            <Card className="clinical-side-card">
              <SectionHeading
                title="Lectura rápida"
                description="Puntos de control antes de seguir editando."
              />
              <div className="meta-strip">
                <strong>Último evento</strong>
                <span>
                  {filteredTimelineItems[0]
                    ? `${filteredTimelineItems[0].label} · ${formatDateTime(filteredTimelineItems[0].timestamp)}`
                    : "Sin eventos visibles"}
                </span>
              </div>
              <div className="meta-strip">
                <strong>Valoración base</strong>
                <span>{bundle.medical || bundle.nursing || bundle.vitals ? "Ya existe contexto clínico inicial" : "Todavía no hay valoración inicial"}</span>
              </div>
              <div className="meta-strip">
                <strong>Exámenes pendientes</strong>
                <span>{bundle.examOrders.filter((examOrder) => examOrder.status === "pendiente").length}</span>
              </div>
              <div className="meta-strip">
                <strong>Adjuntos del episodio</strong>
                <span>{bundle.attachments.length}</span>
              </div>
            </Card>
          ) : null}
        </aside>
      </div>
    </div>
  );
}
