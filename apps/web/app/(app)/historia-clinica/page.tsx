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
import { PatientBanner } from "@/components/layout/patient-banner";
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
  return normalized.length > 180
    ? `${normalized.slice(0, 180).trim()}...`
    : normalized;
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
          bundle.vitals.temperatureC
            ? `Temp ${bundle.vitals.temperatureC} °C`
            : "",
          bundle.vitals.heartRate ? `FC ${bundle.vitals.heartRate}` : "",
          bundle.vitals.systolic && bundle.vitals.diastolic
            ? `PA ${bundle.vitals.systolic}/${bundle.vitals.diastolic}`
            : "",
          bundle.vitals.oxygenSaturation
            ? `Sat ${bundle.vitals.oxygenSaturation}%`
            : "",
        ]
          .filter(Boolean)
          .join(" · ") || "Sin parámetros destacados",
      meta: `${bundle.vitals.updatedByName ?? bundle.vitals.createdByName ?? "Sin autor"} · ${formatDateTime(bundle.vitals.updatedAt ?? bundle.vitals.createdAt ?? bundle.vitals.recordedAt)}`,
      tone: "info",
      timestamp:
        bundle.vitals.updatedAt ??
        bundle.vitals.createdAt ??
        bundle.vitals.recordedAt,
    });
  }

  if (bundle.medical) {
    items.push({
      id: `medical-${bundle.medical.encounterId}`,
      filter: "assessments",
      label: "Valoración médica",
      title: bundle.medical.chiefComplaint || "Consulta médica",
      description: truncate(
        bundle.medical.diagnosticImpression || bundle.medical.currentIllness,
        "Sin impresión diagnóstica registrada",
      ),
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
      description: truncate(
        bundle.nursing.observations || bundle.nursing.risks,
        "Sin observaciones registradas",
      ),
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
      description: truncate(
        diagnosis.notes,
        diagnosis.code
          ? `${diagnosis.source} · ${diagnosis.code}`
          : diagnosis.source,
      ),
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
        note.noteKind === "psychology_plan"
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
      description: truncate(
        procedure.result || procedure.notes,
        "Sin observaciones del procedimiento",
      ),
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
      description: truncate(
        examOrder.instructions,
        `${examOrder.category} · ${examOrder.status}`,
      ),
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

  return items.sort(
    (left, right) =>
      new Date(right.timestamp).getTime() - new Date(left.timestamp).getTime(),
  );
}

export default function HistoryPage() {
  const { client } = useAuth();
  const searchParams = useSearchParams();
  const patientId = searchParams.get("patientId") ?? "";
  const [selectedPatientId, setSelectedPatientId] = useState(patientId);
  const [selectedEncounterId, setSelectedEncounterId] = useState<string>("");
  const [activeFilter, setActiveFilter] = useState<HistoryFilter>("all");

  useEffect(() => {
    setSelectedPatientId(patientId);
  }, [patientId]);

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
      current && encountersQuery.data?.some((item) => item.id === current)
        ? current
        : nextEncounterId,
    );
  }, [encountersQuery.data]);

  const patients = patientsQuery.data ?? [];
  const encounters = encountersQuery.data ?? [];
  const bundle = encounterBundleQuery.data;
  const selectedPatient = patientQuery.data;
  const selectedEncounter = useMemo(
    () =>
      encounters.find((encounter) => encounter.id === selectedEncounterId) ??
      null,
    [encounters, selectedEncounterId],
  );
  const timelineItems = useMemo(
    () => (bundle ? buildTimelineItems(bundle) : []),
    [bundle],
  );
  const filteredTimelineItems = useMemo(
    () =>
      timelineItems.filter((item) =>
        activeFilter === "all" ? true : item.filter === activeFilter,
      ),
    [activeFilter, timelineItems],
  );
  const timelineCounts = useMemo(
    () => ({
      all: timelineItems.length,
      assessments: timelineItems.filter((item) => item.filter === "assessments")
        .length,
      notes: timelineItems.filter((item) => item.filter === "notes").length,
      orders: timelineItems.filter((item) => item.filter === "orders").length,
      documents: timelineItems.filter((item) => item.filter === "documents")
        .length,
    }),
    [timelineItems],
  );

  return (
    <div className="stack">
      <section className="clinical-hero">
        <div className="clinical-hero__primary">
          <div>
            <span className="patient-kicker">Historia clínica</span>
            <h1 className="clinical-hero__title">Consulta longitudinal</h1>
            <p className="clinical-hero__subtitle">
              Selecciona paciente y episodio para revisar la evolución completa
              con una sola lectura cronológica del encounter.
            </p>
          </div>
          <div className="clinical-hero__actions">
            <Link href="/pacientes" className="btn secondary">
              Buscar paciente
            </Link>
            <Link href="/nueva-atencion" className="btn">
              Abrir atención
            </Link>
            <button
              type="button"
              className="btn secondary"
              onClick={() => window.print()}
            >
              Imprimir vista
            </button>
          </div>
        </div>
        <div className="patient-tabbar patient-tabbar--hero">
          <Link
            href="/historia-clinica"
            className="patient-tabbar__link active"
          >
            Historia clínica
          </Link>
          <Link href="/pacientes" className="patient-tabbar__link">
            Pacientes
          </Link>
          <Link href="/nueva-atencion" className="patient-tabbar__link">
            Nueva atención
          </Link>
          <Link href="/documentos" className="patient-tabbar__link">
            Documentos
          </Link>
        </div>
      </section>

      <Card className="clinical-filter-card">
        <SectionHeading
          title="Filtro clínico"
          description="La historia se organiza por paciente, encounter y tipo de contenido."
        />
        <div className="form-grid">
          <div className="form-field">
            <span>Paciente</span>
            <select
              value={selectedPatientId}
              onChange={(event) => setSelectedPatientId(event.target.value)}
            >
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
              {(
                [
                  "all",
                  "assessments",
                  "notes",
                  "orders",
                  "documents",
                ] as HistoryFilter[]
              ).map((filter) => (
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
        {selectedPatient ? (
          <div className="patient-glance" style={{ marginTop: 18 }}>
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
      </Card>

      {selectedPatient ? (
        <PatientBanner
          patient={selectedPatient}
          actions={
            <>
              {selectedEncounter ? (
                <StatusBadge
                  label={selectedEncounter.status === "open" ? "Encounter abierto" : "Encounter cerrado"}
                  tone={selectedEncounter.status === "open" ? "warning" : "success"}
                />
              ) : null}
              <StatusBadge
                label={`${encounters.length} encounter${encounters.length === 1 ? "" : "s"}`}
                tone="info"
              />
            </>
          }
        />
      ) : null}

      <div className="history-station">
        <Card className="history-station__list">
          <SectionHeading
            title="Encuentros registrados"
            description="Abre cualquiera para revisar la secuencia completa del episodio."
          />
          {encounters.length ? (
            <div className="stack">
              {encounters.map((encounter) => (
                <button
                  key={encounter.id}
                  type="button"
                  className={`picker-row ${selectedEncounterId === encounter.id ? "selected" : ""}`}
                  onClick={() => setSelectedEncounterId(encounter.id)}
                >
                  <strong>{formatDateTime(encounter.startedAt)}</strong>
                  <span>
                    {encounter.chiefComplaint ?? "Sin motivo registrado"}
                  </span>
                  <div className="btn-row">
                    <StatusBadge label={encounter.encounterType} tone="info" />
                    <StatusBadge
                      label={encounter.status}
                      tone={encounter.status === "open" ? "warning" : "success"}
                    />
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <strong>No hay encuentros para mostrar.</strong>
              <p>
                Abre una nueva atención desde la ficha del paciente para
                comenzar la historia clínica.
              </p>
            </div>
          )}
        </Card>

        <Card className="history-station__actions">
          <SectionHeading
            title="Acciones"
            description="Trabaja sobre el mismo episodio clínico, no sobre copias."
          />
          {selectedEncounter ? (
            <div className="stack">
              <div className="meta-strip">
                <strong>Estado</strong>
                <span>{selectedEncounter.status}</span>
              </div>
              <div className="meta-strip">
                <strong>Contenido visible</strong>
                <span>
                  {filteredTimelineItems.length} eventos filtrados de{" "}
                  {timelineItems.length}
                </span>
              </div>
              <div className="btn-row">
                <Link
                  href={`/nueva-atencion?patientId=${selectedEncounter.patientId}&encounterId=${selectedEncounter.id}`}
                  className="btn"
                >
                  Continuar edición
                </Link>
                <Link
                  href={`/pacientes/${selectedEncounter.patientId}`}
                  className="btn secondary"
                >
                  Ver ficha
                </Link>
              </div>
            </div>
          ) : (
            <div className="empty-state">
              <strong>Selecciona un encounter.</strong>
              <p>
                Así podrás revisar su secuencia clínica y continuar la edición.
              </p>
            </div>
          )}
        </Card>
      </div>

      {selectedEncounter && bundle ? (
        <div className="clinical-layout">
          <div className="clinical-layout__main stack">
            <Card>
              <SectionHeading
                title="Resumen del episodio"
                description={
                  selectedEncounter.chiefComplaint ?? "Sin motivo registrado"
                }
                action={
                  <div className="btn-row">
                    <StatusBadge
                      label={selectedEncounter.encounterType}
                      tone="info"
                    />
                    <StatusBadge
                      label={selectedEncounter.status}
                      tone={
                        selectedEncounter.status === "open"
                          ? "warning"
                          : "success"
                      }
                    />
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
                <div className="stack">
                  {filteredTimelineItems.map((item) => (
                    <article key={item.id} className="history-timeline-card">
                      <div className="history-timeline-card__top">
                        <div>
                          <strong>{item.title}</strong>
                          <p>{item.description}</p>
                        </div>
                        <StatusBadge label={item.label} tone={item.tone} />
                      </div>
                      <span>{item.meta}</span>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="empty-state">
                  <strong>No hay eventos para este filtro.</strong>
                  <p>
                    Cambia el filtro o continúa el encounter para registrar más
                    contenido clínico.
                  </p>
                </div>
              )}
            </Card>
          </div>

          <aside className="clinical-layout__side stack">
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
                <span>
                  {bundle.medical || bundle.nursing || bundle.vitals
                    ? "Ya existe contexto clínico inicial"
                    : "Todavía no hay valoración inicial"}
                </span>
              </div>
              <div className="meta-strip">
                <strong>Exámenes pendientes</strong>
                <span>
                  {
                    bundle.examOrders.filter(
                      (examOrder) => examOrder.status === "pendiente",
                    ).length
                  }
                </span>
              </div>
              <div className="meta-strip">
                <strong>Adjuntos del episodio</strong>
                <span>{bundle.attachments.length}</span>
              </div>
            </Card>
          </aside>
        </div>
      ) : null}
    </div>
  );
}
