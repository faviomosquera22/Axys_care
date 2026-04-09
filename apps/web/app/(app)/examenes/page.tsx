"use client";

import {
  getEncounterBundle,
  listEncounters,
  listPatients,
} from "@axyscare/core-db";
import {
  Card,
  EmptyStatePanel,
  LoadingStateCard,
  SectionHeading,
  StatusBadge,
} from "@axyscare/ui-shared";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/providers/providers";

export default function ExamsPage() {
  const { client } = useAuth();
  const [selectedPatientId, setSelectedPatientId] = useState("");
  const [selectedEncounterId, setSelectedEncounterId] = useState("");

  const patientsQuery = useQuery({
    queryKey: ["patients", "exams"],
    queryFn: () => listPatients(client),
  });
  const encountersQuery = useQuery({
    queryKey: ["encounters", "exams", selectedPatientId],
    queryFn: () => listEncounters(client, selectedPatientId || undefined),
  });
  const bundleQuery = useQuery({
    queryKey: ["encounter-bundle", "exams", selectedEncounterId],
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

  const bundle = bundleQuery.data;

  return (
    <div className="stack">
      <div className="topbar">
        <div>
          <h1>Exámenes</h1>
          <p>
            Los exámenes viven dentro del encounter. Esta vista solo los
            consolida para revisión rápida.
          </p>
        </div>
      </div>

      <Card>
        <SectionHeading
          title="Filtrar por paciente"
          description="Elige un paciente y luego el encounter donde se solicitaron los exámenes."
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

      <div className="workspace-grid">
        <Card>
          <SectionHeading
            title="Encuentros del paciente"
            description="Selecciona el episodio clínico a revisar."
          />
          {encountersQuery.isPending ? (
            <LoadingStateCard
              title="Cargando encounters con exámenes"
              description="Estamos trayendo los episodios clínicos del paciente para ubicar órdenes y resultados."
            />
          ) : (encountersQuery.data ?? []).length ? (
            (encountersQuery.data ?? []).map((encounter) => (
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
              title="No hay encounters disponibles."
              description="Solicita los exámenes desde Nueva atención o continúa un episodio existente para que se consoliden aquí."
              action={
                <Link href="/nueva-atencion" className="pill-link">
                  Solicitar desde Nueva atención
                </Link>
              }
            />
          )}
        </Card>

        <Card className="workspace-aside">
          <SectionHeading
            title="Edición"
            description="Los exámenes se agregan dentro de la atención o la historia clínica."
          />
          {selectedEncounterId ? (
            <Link
              href={`/nueva-atencion?encounterId=${selectedEncounterId}`}
              className="btn"
            >
              Continuar encuentro
            </Link>
          ) : null}
        </Card>
      </div>

      {bundleQuery.isPending ? (
        <LoadingStateCard
          title="Cargando órdenes y resultados"
          description="Estamos trayendo solicitudes del encounter, estados y archivos anexos relacionados."
        />
      ) : bundle ? (
        <Card>
          <SectionHeading
            title="Órdenes y resultados anexos"
            description="Solicitudes del encounter y archivos relacionados."
          />
          {bundle.examOrders.length || bundle.attachments.length ? (
            <div className="stack">
              {bundle.examOrders.map((examOrder) => (
                <div key={examOrder.id} className="trace-row">
                  <strong>{examOrder.examName}</strong>
                  <p>{examOrder.instructions ?? "Sin indicaciones."}</p>
                  <div className="btn-row">
                    <StatusBadge label={examOrder.category} tone="info" />
                    <StatusBadge
                      label={examOrder.status}
                      tone={
                        examOrder.status === "pendiente" ? "warning" : "success"
                      }
                    />
                  </div>
                </div>
              ))}
              {bundle.attachments.map((attachment) => (
                <div key={attachment.id} className="trace-row">
                  <strong>{attachment.fileName}</strong>
                  <span>{attachment.category}</span>
                  {attachment.path.startsWith("data:") ? (
                    <a
                      href={attachment.path}
                      download={attachment.fileName}
                      className="pill-link"
                    >
                      Descargar archivo
                    </a>
                  ) : null}
                </div>
              ))}
            </div>
          ) : (
            <EmptyStatePanel
              title="Este encounter no tiene exámenes ni resultados anexos."
              description="Solicítalos desde Nueva atención y luego vuelve aquí para revisar el estado y descargar archivos relacionados."
              action={
                <Link
                  href={`/nueva-atencion?encounterId=${selectedEncounterId}`}
                  className="pill-link"
                >
                  Solicitar examen
                </Link>
              }
            />
          )}
        </Card>
      ) : null}
    </div>
  );
}
