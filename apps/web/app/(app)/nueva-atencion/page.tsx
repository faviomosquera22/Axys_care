"use client";

import { calculateAge } from "@axyscare/core-clinical";
import { getPatient, getProfile, listPatients } from "@axyscare/core-db";
import { Card } from "@axyscare/ui-shared";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { EncounterWorkspace } from "@/components/forms/encounter-workspace";
import { useAuth } from "@/components/providers/providers";

export default function NewEncounterPage() {
  const searchParams = useSearchParams();
  const patientId = searchParams.get("patientId") ?? undefined;
  const encounterId = searchParams.get("encounterId") ?? undefined;
  const { client, user } = useAuth();
  const patientsQuery = useQuery({
    queryKey: ["patients", "encounter"],
    queryFn: () => listPatients(client),
  });
  const patientQuery = useQuery({
    queryKey: ["patient", "encounter", patientId],
    queryFn: () => getPatient(client, patientId!),
    enabled: Boolean(patientId),
  });
  const profileQuery = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: () => getProfile(client, user!.id),
    enabled: Boolean(user?.id),
  });

  return (
    <div className="stack">
      <section className="clinical-hero">
        <div className="clinical-hero__primary">
          <div>
            <span className="patient-kicker">Consulta clínica</span>
            <h1 className="clinical-hero__title">Nueva atención</h1>
            <p className="clinical-hero__subtitle">
              {encounterId ? "Continuación del encounter clínico existente." : "Flujo guiado desde el paciente hasta el cierre clínico del encuentro."}
            </p>
          </div>
          <div className="clinical-hero__actions">
            <Link href="/pacientes" className="btn secondary">
              Buscar paciente
            </Link>
            <Link href="/historia-clinica" className="btn secondary">
              Ver historia
            </Link>
            <button type="button" className="btn secondary" onClick={() => window.print()}>
              Imprimir vista
            </button>
          </div>
        </div>
        <div className="patient-tabbar patient-tabbar--hero">
          <Link href="/nueva-atencion" className="patient-tabbar__link active">
            Nueva atención
          </Link>
          <Link href={patientId ? `/historia-clinica?patientId=${patientId}` : "/historia-clinica"} className="patient-tabbar__link">
            Historia clínica
          </Link>
          <Link href={patientId ? `/pacientes/${patientId}` : "/pacientes"} className="patient-tabbar__link">
            Ficha del paciente
          </Link>
          <Link href="/documentos" className="patient-tabbar__link">
            Documentos
          </Link>
        </div>
      </section>
      <Card className="workflow-banner workflow-banner--dense">
        <div className="workflow-banner__step">
          <strong>1. Confirmar contexto</strong>
          <span>Paciente, tipo de encuentro y motivo principal.</span>
        </div>
        <div className="workflow-banner__step">
          <strong>2. Registrar atención</strong>
          <span>Signos vitales, nota médica o enfermería, procedimientos y notas.</span>
        </div>
        <div className="workflow-banner__step">
          <strong>3. Cerrar resumen</strong>
          <span>Revisar trazabilidad y descargar el PDF del episodio.</span>
        </div>
      </Card>
      {patientQuery.data ? (
        <Card className="patient-glance">
          <div>
            <strong>
              {patientQuery.data.firstName} {patientQuery.data.lastName}
            </strong>
            <p>
              {patientQuery.data.documentType} {patientQuery.data.documentNumber} · {calculateAge(patientQuery.data.birthDate)} años
            </p>
          </div>
          <div className="patient-glance__meta">
            <span>Alergias: {patientQuery.data.allergies?.join(", ") || "No registradas"}</span>
            <span>Antecedentes: {patientQuery.data.relevantHistory || "Sin antecedentes cargados"}</span>
          </div>
        </Card>
      ) : null}
      <EncounterWorkspace
        patients={patientsQuery.data ?? []}
        professional={profileQuery.data ?? null}
        initialPatientId={patientId}
        initialEncounterId={encounterId}
      />
    </div>
  );
}
