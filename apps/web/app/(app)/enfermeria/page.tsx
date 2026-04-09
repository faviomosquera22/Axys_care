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

export default function NursingPage() {
  const { client } = useAuth();
  const [selectedPatientId, setSelectedPatientId] = useState("");
  const [selectedEncounterId, setSelectedEncounterId] = useState("");

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

  const nursingEncounters = (encountersQuery.data ?? []).filter(
    (encounter) =>
      encounter.encounterType === "nursing" ||
      encounter.encounterType === "mixed",
  );

  useEffect(() => {
    const nextEncounterId = nursingEncounters[0]?.id ?? "";
    setSelectedEncounterId((current) =>
      current && nursingEncounters.some((item) => item.id === current)
        ? current
        : nextEncounterId,
    );
  }, [nursingEncounters]);

  const bundle = bundleQuery.data;

  return (
    <div className="stack">
      <div className="topbar">
        <div>
          <h1>Módulo de enfermería</h1>
          <p>
            Seguimiento de valoraciones y continuidad de cuidado sobre el mismo
            encounter clínico.
          </p>
        </div>
      </div>

      <Card>
        <SectionHeading
          title="Selecciona el caso"
          description="Filtra por paciente y abre la valoración de enfermería existente."
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
            title="Encuentros de enfermería"
            description="Solo se muestran nursing o mixed."
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
            title="Acción"
            description="Trabaja sobre el mismo episodio clínico."
          />
          {selectedEncounterId ? (
            <Link
              href={`/nueva-atencion?encounterId=${selectedEncounterId}`}
              className="btn"
            >
              Continuar valoración
            </Link>
          ) : null}
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
              description="Signos vitales y notas relacionadas con la valoración."
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
          </Card>
        </div>
      ) : null}
    </div>
  );
}
