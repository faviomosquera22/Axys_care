"use client";

import { getEncounterBundle, listEncounters, listPatients } from "@axyscare/core-db";
import { Card, SectionHeading } from "@axyscare/ui-shared";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/providers/providers";

export default function ProceduresPage() {
  const { client } = useAuth();
  const [selectedPatientId, setSelectedPatientId] = useState("");
  const [selectedEncounterId, setSelectedEncounterId] = useState("");

  const patientsQuery = useQuery({
    queryKey: ["patients", "procedures"],
    queryFn: () => listPatients(client),
  });
  const encountersQuery = useQuery({
    queryKey: ["encounters", "procedures", selectedPatientId],
    queryFn: () => listEncounters(client, selectedPatientId || undefined),
  });
  const bundleQuery = useQuery({
    queryKey: ["encounter-bundle", "procedures", selectedEncounterId],
    queryFn: () => getEncounterBundle(client, selectedEncounterId),
    enabled: Boolean(selectedEncounterId),
  });

  useEffect(() => {
    const nextEncounterId = encountersQuery.data?.[0]?.id ?? "";
    setSelectedEncounterId((current) => (current && encountersQuery.data?.some((item) => item.id === current) ? current : nextEncounterId));
  }, [encountersQuery.data]);

  const bundle = bundleQuery.data;

  return (
    <div className="stack">
      <div className="topbar">
        <div>
          <h1>Procedimientos</h1>
          <p>Subcategoría clínica del encounter. Esta vista sirve para revisar y localizar procedimientos ya registrados.</p>
        </div>
      </div>

      <Card>
        <SectionHeading title="Filtrar por paciente" description="Selecciona un paciente y revisa los procedimientos por episodio." />
        <div className="form-grid">
          <div className="form-field">
            <span>Paciente</span>
            <select value={selectedPatientId} onChange={(event) => setSelectedPatientId(event.target.value)}>
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
          <SectionHeading title="Encuentros del paciente" description="Abre el episodio donde se registró el procedimiento." />
          {(encountersQuery.data ?? []).length ? (
            (encountersQuery.data ?? []).map((encounter) => (
              <button
                key={encounter.id}
                type="button"
                className={`picker-row ${selectedEncounterId === encounter.id ? "selected" : ""}`}
                onClick={() => setSelectedEncounterId(encounter.id)}
              >
                <strong>{new Date(encounter.startedAt).toLocaleString()}</strong>
                <span>{encounter.chiefComplaint ?? "Sin motivo registrado"}</span>
                <span>{encounter.createdByName ?? "Sin autor"}</span>
              </button>
            ))
          ) : (
            <div className="empty-state">
              <strong>No hay encounters disponibles.</strong>
              <p>Los procedimientos se registran dentro de la atención y luego aparecen aquí.</p>
            </div>
          )}
        </Card>

        <Card className="workspace-aside">
          <SectionHeading title="Edición" description="Agrega o corrige procedimientos dentro del mismo encounter." />
          {selectedEncounterId ? (
            <Link href={`/nueva-atencion?encounterId=${selectedEncounterId}`} className="btn">
              Continuar encuentro
            </Link>
          ) : null}
        </Card>
      </div>

      {bundle ? (
        <Card>
          <SectionHeading title="Procedimientos del encounter" description="Materiales, resultados y trazabilidad del procedimiento." />
          {bundle.procedures.length ? (
            <div className="stack">
              {bundle.procedures.map((procedure) => (
                <div key={procedure.id} className="trace-row">
                  <strong>{procedure.name}</strong>
                  <p>{procedure.result ?? procedure.notes ?? "Sin observaciones."}</p>
                  <span>
                    {procedure.responsibleProfessional ?? procedure.createdByName ?? "Sin responsable"} ·{" "}
                    {procedure.performedAt ? new Date(procedure.performedAt).toLocaleString() : "sin fecha"}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <strong>Este encounter no tiene procedimientos registrados.</strong>
              <p>Agrega uno desde Nueva atención y aparecerá aquí y en la historia clínica.</p>
            </div>
          )}
        </Card>
      ) : null}
    </div>
  );
}
