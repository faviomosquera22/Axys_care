"use client";

import { calculateAge } from "@axyscare/core-clinical";
import { getPatient, getProfile, listEncounters, listPatientAccess } from "@axyscare/core-db";
import { Card, SectionHeading, StatusBadge } from "@axyscare/ui-shared";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
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
  const accessQuery = useQuery({
    queryKey: ["patient-access", params.id],
    queryFn: () => listPatientAccess(client, params.id),
  });

  usePatientRealtime(params.id, [
    ["patient", params.id],
    ["encounters", params.id],
    ["patient-access", params.id],
  ]);

  const patient = patientQuery.data;
  const encounters = encountersQuery.data ?? [];
  const activeCollaborators = (accessQuery.data ?? []).filter((access) => access.status === "active").length;
  const latestEncounter = encounters[0] ?? null;
  const ownerName = ownerProfileQuery.data
    ? `${ownerProfileQuery.data.firstName} ${ownerProfileQuery.data.lastName}`.trim()
    : patient?.ownerUserId;

  if (!patient) {
    return <div className="ax-card">Cargando paciente...</div>;
  }

  return (
    <div className="stack">
      <section className="clinical-hero">
        <div className="clinical-hero__primary">
          <div>
            <span className="patient-kicker">Ficha clínica</span>
            <h1 className="clinical-hero__title">
              {patient.firstName} {patient.lastName}
            </h1>
            <p className="clinical-hero__subtitle">
              {patient.documentType} {patient.documentNumber} · {calculateAge(patient.birthDate)} años ·{" "}
              {patient.sex}
              {patient.gender ? ` · ${patient.gender}` : ""}
            </p>
          </div>
          <div className="clinical-hero__actions">
            <Link href={`/nueva-atencion?patientId=${patient.id}`} className="btn">
              Iniciar atención
            </Link>
            <Link href={`/historia-clinica?patientId=${patient.id}`} className="btn secondary">
              Ver historia completa
            </Link>
            <button type="button" className="btn secondary" onClick={() => window.print()}>
              Imprimir PDF
            </button>
          </div>
        </div>

        <div className="clinical-hero__metrics">
          <div className="clinical-hero__metric">
            <span>Propietario</span>
            <strong>{ownerName}</strong>
          </div>
          <div className="clinical-hero__metric">
            <span>Encuentros</span>
            <strong>{encounters.length}</strong>
          </div>
          <div className="clinical-hero__metric">
            <span>Colaboradores</span>
            <strong>{activeCollaborators}</strong>
          </div>
          <div className="clinical-hero__metric">
            <span>Última atención</span>
            <strong>{latestEncounter ? new Date(latestEncounter.startedAt).toLocaleDateString() : "Pendiente"}</strong>
          </div>
        </div>

        <div className="patient-tabbar patient-tabbar--hero">
          <Link href={`/pacientes/${patient.id}`} className="patient-tabbar__link active">
            Ficha paciente
          </Link>
          <Link href={`/historia-clinica?patientId=${patient.id}`} className="patient-tabbar__link">
            Historia clínica
          </Link>
          <Link href={`/nueva-atencion?patientId=${patient.id}`} className="patient-tabbar__link">
            Nueva atención
          </Link>
          <Link href="/procedimientos" className="patient-tabbar__link">
            Procedimientos
          </Link>
          <Link href="/documentos" className="patient-tabbar__link">
            Documentos
          </Link>
          <button type="button" className="patient-tabbar__action" onClick={() => window.print()}>
            Imprimir ficha
          </button>
        </div>
      </section>

      <div className="clinical-layout">
        <div className="clinical-layout__main stack">
          <Card>
            <SectionHeading title="Ficha base" description="Datos demográficos y antecedentes visibles antes de iniciar cualquier atención." />
            <div className="clinical-summary-grid">
              <div className="summary-item">
                <span>Teléfono</span>
                <strong>{patient.phone || "No registrado"}</strong>
              </div>
              <div className="summary-item">
                <span>Contacto de emergencia</span>
                <strong>{patient.emergencyContact?.name || "No registrado"}</strong>
              </div>
              <div className="summary-item">
                <span>Documento</span>
                <strong>{patient.documentNumber}</strong>
              </div>
              <div className="summary-item">
                <span>Edad</span>
                <strong>{calculateAge(patient.birthDate)} años</strong>
              </div>
            </div>
          </Card>

          <Card>
          <SectionHeading title="Resumen clínico" description="Datos base y contexto antes de abrir una nueva atención." />
          <div className="meta-strip">
            <strong>Sexo y género</strong>
            <span>
              {patient.sex}
              {patient.gender ? ` · ${patient.gender}` : ""}
            </span>
          </div>
          <div className="meta-strip">
            <strong>Teléfono</strong>
            <span>{patient.phone || "No registrado"}</span>
          </div>
          <div className="meta-strip">
            <strong>Alergias</strong>
            <span>{patient.allergies?.join(", ") || "No registradas"}</span>
          </div>
          <div className="meta-strip">
            <strong>Antecedentes</strong>
            <span>{patient.relevantHistory || "Sin antecedentes cargados"}</span>
          </div>
          <div className="meta-strip">
            <strong>Contacto de emergencia</strong>
            <span>
              {patient.emergencyContact?.name
                ? `${patient.emergencyContact.name} · ${patient.emergencyContact.phone || "sin teléfono"}`
                : "No registrado"}
            </span>
          </div>
          </Card>

          <Card>
          <SectionHeading title="Ruta clínica" description="Atajos de trabajo sobre el mismo expediente vivo del paciente." />
          <div className="route-grid">
            <Link href={`/nueva-atencion?patientId=${patient.id}`} className="route-card">
              <strong>1. Nueva atención</strong>
              <span>Abre el encounter, captura signos vitales y registra la nota clínica.</span>
            </Link>
            <Link href={`/historia-clinica?patientId=${patient.id}`} className="route-card">
              <strong>2. Historia clínica</strong>
              <span>Revisa todos los encuentros del paciente en secuencia longitudinal.</span>
            </Link>
            <Link href="/agenda" className="route-card">
              <strong>3. Agenda y seguimiento</strong>
              <span>Programa controles, reagenda y enlaza nuevas atenciones desde citas.</span>
            </Link>
            <Link href="/documentos" className="route-card">
              <strong>4. Documentos</strong>
              <span>Impresión, anexos y material clínico del mismo registro maestro.</span>
            </Link>
          </div>
          </Card>

          <Card>
            <SectionHeading title="Línea de tiempo clínica" description="Cada encuentro conserva su autor, tipo y fecha de apertura." />
            {encounters.length ? (
              encounters.map((encounter) => (
                <div key={encounter.id} className="timeline-entry">
                  <div className="timeline-entry__marker" />
                  <div className="timeline-entry__body">
                    <div className="timeline-entry__top">
                      <strong>{new Date(encounter.startedAt).toLocaleString()}</strong>
                      <div className="btn-row">
                        <StatusBadge label={encounter.encounterType} tone="info" />
                        <StatusBadge label={encounter.status} tone={encounter.status === "open" ? "warning" : "success"} />
                      </div>
                    </div>
                    <p>{encounter.chiefComplaint ?? "Sin motivo registrado"}</p>
                    <span>{encounter.createdByName ?? "Sin autor"} · episodio {encounter.id.slice(0, 8)}</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="empty-state">
                <strong>Este paciente todavía no tiene encuentros.</strong>
                <p>La siguiente acción lógica es abrir una nueva atención desde esta ficha.</p>
              </div>
            )}
          </Card>
        </div>

        <aside className="clinical-layout__side stack">
          <Card className="clinical-side-card">
            <SectionHeading title="Panel rápido" description="Información clínica breve y acciones inmediatas." />
            <div className="meta-strip">
              <strong>Alergias</strong>
              <span>{patient.allergies?.join(", ") || "No registradas"}</span>
            </div>
            <div className="meta-strip">
              <strong>Antecedentes</strong>
              <span>{patient.relevantHistory || "Sin antecedentes cargados"}</span>
            </div>
            <div className="meta-strip">
              <strong>Estado del expediente</strong>
              <span>{latestEncounter ? "Con historia activa" : "Pendiente de primera atención"}</span>
            </div>
            <div className="btn-row">
              <Link href="/agenda" className="pill-link">
                Nueva cita
              </Link>
              <Link href="/documentos" className="pill-link">
                Documentos
              </Link>
            </div>
          </Card>

          <PatientSharePanel patientId={patient.id} ownerUserId={patient.ownerUserId} />
        </aside>
      </div>
    </div>
  );
}
