"use client";

import { calculateAge } from "@axyscare/core-clinical";
import { getPatient, getProfile, listEncounters } from "@axyscare/core-db";
import { Card, SectionHeading, StatusBadge } from "@axyscare/ui-shared";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { PatientSharePanel } from "@/components/forms/patient-share-panel";
import { useAuth } from "@/components/providers/providers";
import { usePatientRealtime } from "@/components/realtime/use-patient-realtime";

export default function PatientDetailPage() {
  const params = useParams<{ id: string }>();
  const { client } = useAuth();
  const patientQuery = useQuery({
    queryKey: ["patient", params.id],
    queryFn: () => getPatient(client, params.id),
  });
  const encountersQuery = useQuery({
    queryKey: ["encounters", params.id],
    queryFn: () => listEncounters(client, params.id),
  });
  const ownerProfileQuery = useQuery({
    queryKey: ["profile", "owner", patientQuery.data?.ownerUserId],
    queryFn: () => getProfile(client, patientQuery.data!.ownerUserId),
    enabled: Boolean(patientQuery.data?.ownerUserId),
  });

  usePatientRealtime(params.id, [
    ["patient", params.id],
    ["encounters", params.id],
    ["patient-access", params.id],
  ]);

  const patient = patientQuery.data;

  if (!patient) {
    return <div className="ax-card">Cargando paciente...</div>;
  }

  return (
    <div className="stack">
      <div className="two-column">
        <Card>
          <SectionHeading
            title={`${patient.firstName} ${patient.lastName}`}
            description={`Edad ${calculateAge(patient.birthDate)} · ${patient.documentType} ${patient.documentNumber}`}
            action={<a href={`/nueva-atencion?patientId=${patient.id}`} className="btn">Nueva atención</a>}
          />
          <div className="stack">
            <div className="meta-strip">
              <strong>Propietario principal</strong>
              <span>
                {ownerProfileQuery.data
                  ? `${ownerProfileQuery.data.firstName} ${ownerProfileQuery.data.lastName}`
                  : patient.ownerUserId}
              </span>
            </div>
            <div>
              <strong>Alergias</strong>
              <p className="muted">{patient.allergies?.join(", ") || "No registradas"}</p>
            </div>
            <div>
              <strong>Antecedentes</strong>
              <p className="muted">{patient.relevantHistory || "Sin antecedentes cargados"}</p>
            </div>
          </div>
        </Card>
        <Card>
          <SectionHeading title="Encuentros" description="Historia clínica vinculada al mismo episodio." />
          {(encountersQuery.data ?? []).map((encounter) => (
            <div key={encounter.id} className="trace-row">
              <strong>{new Date(encounter.startedAt).toLocaleString()}</strong>
              <p>{encounter.chiefComplaint ?? "Sin motivo registrado"}</p>
              <span>
                {encounter.createdByName ?? "Sin autor"} · {encounter.encounterType}
              </span>
              <StatusBadge label={encounter.status} tone={encounter.status === "open" ? "warning" : "success"} />
            </div>
          ))}
        </Card>
      </div>

      <PatientSharePanel patientId={patient.id} ownerUserId={patient.ownerUserId} />
    </div>
  );
}
