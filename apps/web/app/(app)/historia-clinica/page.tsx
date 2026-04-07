"use client";

import { getEncounterBundle, getPatient, listEncounters, listPatients } from "@axyscare/core-db";
import { Card, SectionHeading, StatusBadge } from "@axyscare/ui-shared";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/components/providers/providers";

export default function HistoryPage() {
  const { client } = useAuth();
  const searchParams = useSearchParams();
  const patientId = searchParams.get("patientId") ?? "";
  const [selectedPatientId, setSelectedPatientId] = useState(patientId);
  const [selectedEncounterId, setSelectedEncounterId] = useState<string>("");

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
    setSelectedEncounterId((current) => (current && encountersQuery.data?.some((item) => item.id === current) ? current : nextEncounterId));
  }, [encountersQuery.data]);

  const patients = patientsQuery.data ?? [];
  const encounters = encountersQuery.data ?? [];
  const bundle = encounterBundleQuery.data;
  const selectedPatient = patientQuery.data;
  const selectedEncounter = useMemo(
    () => encounters.find((encounter) => encounter.id === selectedEncounterId) ?? null,
    [encounters, selectedEncounterId],
  );

  return (
    <div className="stack">
      <section className="clinical-hero">
        <div className="clinical-hero__primary">
          <div>
            <span className="patient-kicker">Historia clínica</span>
            <h1 className="clinical-hero__title">Consulta longitudinal</h1>
            <p className="clinical-hero__subtitle">
              Selecciona paciente y episodio para revisar la evolución completa y continuar la edición clínica.
            </p>
          </div>
          <div className="clinical-hero__actions">
            <Link href="/pacientes" className="btn secondary">
              Buscar paciente
            </Link>
            <Link href="/nueva-atencion" className="btn">
              Abrir atención
            </Link>
            <button type="button" className="btn secondary" onClick={() => window.print()}>
              Imprimir vista
            </button>
          </div>
        </div>
        <div className="patient-tabbar patient-tabbar--hero">
          <Link href="/historia-clinica" className="patient-tabbar__link active">
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
        <SectionHeading title="Filtro clínico" description="La historia se organiza por paciente y por episodio." />
        <div className="form-grid">
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
              <span>Alergias: {selectedPatient.allergies?.join(", ") || "No registradas"}</span>
              <span>Antecedentes: {selectedPatient.relevantHistory || "Sin antecedentes cargados"}</span>
            </div>
          </div>
        ) : null}
      </Card>

      <div className="history-station">
        <Card className="history-station__list">
          <SectionHeading title="Encuentros registrados" description="Abre cualquiera para revisar o continuar la atención." />
          {encounters.length ? (
            encounters.map((encounter) => (
              <button
                key={encounter.id}
                type="button"
                className={`picker-row ${selectedEncounterId === encounter.id ? "selected" : ""}`}
                onClick={() => setSelectedEncounterId(encounter.id)}
              >
                <strong>{new Date(encounter.startedAt).toLocaleString()}</strong>
                <span>{encounter.chiefComplaint ?? "Sin motivo registrado"}</span>
                <span>
                  {encounter.createdByName ?? "Sin autor"} · {encounter.encounterType}
                </span>
              </button>
            ))
          ) : (
            <div className="empty-state">
              <strong>No hay encuentros para mostrar.</strong>
              <p>Abre una nueva atención desde la ficha del paciente para comenzar la historia clínica.</p>
            </div>
          )}
        </Card>

        <Card className="history-station__actions">
          <SectionHeading title="Acciones" description="Trabaja sobre el mismo episodio clínico, no sobre copias." />
          {selectedEncounter ? (
            <div className="stack">
              <div className="meta-strip">
                <strong>Estado</strong>
                <span>{selectedEncounter.status}</span>
              </div>
              <div className="btn-row">
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
              <p>Así podrás revisar sus datos y continuar la edición clínica.</p>
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
                <span>Diagnósticos</span>
                <strong>{bundle.diagnoses.length}</strong>
              </div>
              <div className="summary-item">
                <span>Notas</span>
                <strong>{bundle.notes.length}</strong>
              </div>
              <div className="summary-item">
                <span>Procedimientos</span>
                <strong>{bundle.procedures.length}</strong>
              </div>
              <div className="summary-item">
                <span>Exámenes</span>
                <strong>{bundle.examOrders.length}</strong>
              </div>
            </div>
          </Card>

          <div className="two-column">
            <Card>
              <SectionHeading title="Notas y diagnósticos" description="Contenido clínico principal del encounter." />
              {(bundle.diagnoses.length || bundle.notes.length) ? (
                <div className="stack">
                  {bundle.diagnoses.map((diagnosis) => (
                    <div key={diagnosis.id} className="trace-row">
                      <strong>{diagnosis.label}</strong>
                      <span>
                        {diagnosis.source} · {diagnosis.createdByName ?? "Sin autor"} ·{" "}
                        {diagnosis.createdAt ? new Date(diagnosis.createdAt).toLocaleString() : "sin fecha"}
                      </span>
                    </div>
                  ))}
                  {bundle.notes.map((note) => (
                    <div key={note.id} className="trace-row">
                      <strong>{note.noteKind}</strong>
                      <p>{note.content}</p>
                      <span>
                        {note.createdByName ?? "Sin autor"} ·{" "}
                        {note.createdAt ? new Date(note.createdAt).toLocaleString() : "sin fecha"}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="empty-state">
                  <strong>Sin notas ni diagnósticos.</strong>
                  <p>Continúa este encounter desde Nueva atención para completarlos.</p>
                </div>
              )}
            </Card>

            <Card>
              <SectionHeading title="Procedimientos, exámenes y adjuntos" description="Subcategorías clínicas del mismo episodio." />
              {(bundle.procedures.length || bundle.examOrders.length || bundle.attachments.length) ? (
                <div className="stack">
                  {bundle.procedures.map((procedure) => (
                    <div key={procedure.id} className="trace-row">
                      <strong>{procedure.name}</strong>
                      <p>{procedure.result ?? procedure.notes ?? "Sin observaciones."}</p>
                      <span>
                        {procedure.createdByName ?? "Sin autor"} ·{" "}
                        {procedure.createdAt ? new Date(procedure.createdAt).toLocaleString() : "sin fecha"}
                      </span>
                    </div>
                  ))}
                  {bundle.examOrders.map((examOrder) => (
                    <div key={examOrder.id} className="trace-row">
                      <strong>{examOrder.examName}</strong>
                      <p>{examOrder.instructions ?? "Sin indicaciones."}</p>
                      <span>
                        {examOrder.category} · {examOrder.createdByName ?? "Sin autor"} ·{" "}
                        {examOrder.orderedAt ? new Date(examOrder.orderedAt).toLocaleString() : "sin fecha"}
                      </span>
                    </div>
                  ))}
                  {bundle.attachments.map((attachment) => (
                    <div key={attachment.id} className="trace-row">
                      <strong>{attachment.fileName}</strong>
                      <span>
                        {attachment.category} · {attachment.createdByName ?? "Sin autor"} ·{" "}
                        {attachment.createdAt ? new Date(attachment.createdAt).toLocaleString() : "sin fecha"}
                      </span>
                      {attachment.path.startsWith("data:") ? (
                        <a className="pill-link" href={attachment.path} download={attachment.fileName}>
                          Descargar
                        </a>
                      ) : null}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="empty-state">
                  <strong>Sin procedimientos ni exámenes adjuntos.</strong>
                  <p>Todo esto se agrega dentro de Nueva atención y queda reflejado aquí automáticamente.</p>
                </div>
              )}
            </Card>
          </div>
          </div>

          <aside className="clinical-layout__side stack">
            <Card className="clinical-side-card">
              <SectionHeading title="Panel derecho" description="Resumen compacto del episodio activo." />
              <div className="meta-strip">
                <strong>Paciente</strong>
                <span>
                  {selectedPatient?.firstName} {selectedPatient?.lastName}
                </span>
              </div>
              <div className="meta-strip">
                <strong>Estado</strong>
                <span>{selectedEncounter.status}</span>
              </div>
              <div className="meta-strip">
                <strong>Diagnósticos</strong>
                <span>{bundle.diagnoses.length}</span>
              </div>
              <div className="meta-strip">
                <strong>Procedimientos</strong>
                <span>{bundle.procedures.length}</span>
              </div>
              <div className="meta-strip">
                <strong>Adjuntos</strong>
                <span>{bundle.attachments.length}</span>
              </div>
            </Card>
          </aside>
        </div>
      ) : null}
    </div>
  );
}
