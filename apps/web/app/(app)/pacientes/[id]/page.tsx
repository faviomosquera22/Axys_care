"use client";

import { calculateAge } from "@axyscare/core-clinical";
import {
  getPatient,
  getProfile,
  listEncounters,
  listPatientAccess,
} from "@axyscare/core-db";
import { Card, SectionHeading, StatusBadge } from "@axyscare/ui-shared";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ClinicalContextBanner } from "@/components/layout/clinical-context-banner";
import { PatientSharePanel } from "@/components/forms/patient-share-panel";
import { useAuth } from "@/components/providers/providers";
import { usePatientRealtime } from "@/components/realtime/use-patient-realtime";

export default function PatientDetailPage() {
  const params = useParams<{ id: string }>();
  const { client } = useAuth();
  const patientId = Array.isArray(params.id) ? params.id[0] : params.id;
  const patientQuery = useQuery({
    queryKey: ["patient", patientId],
    queryFn: () => getPatient(client, patientId!),
    enabled: Boolean(patientId),
  });
  const encountersQuery = useQuery({
    queryKey: ["encounters", patientId],
    queryFn: () => listEncounters(client, patientId!),
    enabled: Boolean(patientId),
  });
  const ownerProfileQuery = useQuery({
    queryKey: ["profile", "owner", patientQuery.data?.ownerUserId],
    queryFn: () => getProfile(client, patientQuery.data!.ownerUserId),
    enabled: Boolean(patientQuery.data?.ownerUserId),
  });
  const accessQuery = useQuery({
    queryKey: ["patient-access", patientId],
    queryFn: () => listPatientAccess(client, patientId!),
    enabled: Boolean(patientId),
  });

  usePatientRealtime(patientId, [
    ["patient", patientId],
    ["encounters", patientId],
    ["patient-access", patientId],
  ]);

  const patient = patientQuery.data;
  const encounters = encountersQuery.data ?? [];
  const activeCollaborators = (accessQuery.data ?? []).filter(
    (access) => access.status === "active",
  ).length;
  const openEncounter =
    encounters.find((encounter) => encounter.status === "open") ?? null;
  const latestEncounter = encounters[0] ?? null;
  const closedEncounters = encounters.filter(
    (encounter) => encounter.status === "closed",
  ).length;
  const ownerName = ownerProfileQuery.data
    ? `${ownerProfileQuery.data.firstName} ${ownerProfileQuery.data.lastName}`.trim()
    : patient?.ownerUserId;

  if (!patientId) {
    return (
      <Card>
        <SectionHeading
          title="Ruta de paciente no válida"
          description="La ficha recibió un identificador inválido. Vuelve al listado y abre el paciente nuevamente."
        />
        <div className="btn-row">
          <Link href="/pacientes" className="btn">
            Volver a pacientes
          </Link>
        </div>
      </Card>
    );
  }

  if (patientQuery.isPending) {
    return <div className="ax-card">Cargando paciente...</div>;
  }

  if (patientQuery.error || !patient) {
    const message =
      patientQuery.error instanceof Error
        ? patientQuery.error.message
        : "No se pudo cargar la ficha del paciente.";

    return (
      <Card>
        <SectionHeading
          title="No se pudo abrir la ficha"
          description="La navegación llegó a la ruta correcta, pero la ficha no pudo recuperar el contexto clínico del paciente."
        />
        <div className="empty-state">
          <strong>{message}</strong>
          <p>
            Revisa si el paciente sigue disponible para tu usuario o vuelve al
            listado para intentar abrirlo otra vez.
          </p>
        </div>
        <div className="btn-row">
          <Link href="/pacientes" className="btn">
            Volver a pacientes
          </Link>
          <button
            type="button"
            className="btn secondary"
            onClick={() => patientQuery.refetch()}
          >
            Reintentar
          </button>
        </div>
      </Card>
    );
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
              {patient.documentType} {patient.documentNumber} ·{" "}
              {calculateAge(patient.birthDate)} años · {patient.sex}
              {patient.gender ? ` · ${patient.gender}` : ""}
            </p>
          </div>
          <div className="clinical-hero__actions">
            <Link
              href={`/nueva-atencion?patientId=${patient.id}`}
              className="btn"
            >
              Iniciar atención
            </Link>
            <Link
              href={`/historia-clinica?patientId=${patient.id}`}
              className="btn secondary"
            >
              Ver historia completa
            </Link>
            <button
              type="button"
              className="btn secondary"
              onClick={() => window.print()}
            >
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
            <strong>{encountersQuery.isError ? "Error" : encounters.length}</strong>
          </div>
          <div className="clinical-hero__metric">
            <span>Colaboradores</span>
            <strong>{accessQuery.isError ? "Error" : activeCollaborators}</strong>
          </div>
          <div className="clinical-hero__metric">
            <span>Última atención</span>
            <strong>
              {latestEncounter
                ? new Date(latestEncounter.startedAt).toLocaleDateString()
                : "Pendiente"}
            </strong>
          </div>
        </div>

        <div className="patient-tabbar patient-tabbar--hero">
          <Link
            href={`/pacientes/${patient.id}`}
            className="patient-tabbar__link active"
          >
            Ficha paciente
          </Link>
          <Link
            href={`/historia-clinica?patientId=${patient.id}`}
            className="patient-tabbar__link"
          >
            Historia clínica
          </Link>
          <Link
            href={`/nueva-atencion?patientId=${patient.id}`}
            className="patient-tabbar__link"
          >
            Nueva atención
          </Link>
          <Link href="/procedimientos" className="patient-tabbar__link">
            Procedimientos
          </Link>
          <Link href="/documentos" className="patient-tabbar__link">
            Documentos
          </Link>
          <button
            type="button"
            className="patient-tabbar__action"
            onClick={() => window.print()}
          >
            Imprimir ficha
          </button>
        </div>
      </section>

      <ClinicalContextBanner
        patient={patient}
        encounter={openEncounter ?? latestEncounter}
        stageLabel={
          openEncounter
            ? "Encounter abierto en curso"
            : latestEncounter
              ? "Ficha y continuidad clínica"
              : "Paciente sin encounter activo"
        }
        lastSavedAt={
          (openEncounter ?? latestEncounter)?.updatedAt ??
          (openEncounter ?? latestEncounter)?.createdAt ??
          (openEncounter ?? latestEncounter)?.startedAt
        }
      />

      <div className="clinical-layout">
        <div className="clinical-layout__main stack">
          <Card className="patient-spotlight">
            <SectionHeading
              title="Estado del expediente"
              description="La ficha debe decirte qué hacer ahora, no solo mostrar datos."
            />
            <div className="patient-spotlight__grid">
              <div className="patient-spotlight__primary">
                <span className="patient-kicker">
                  {openEncounter
                    ? "Atención en curso"
                    : "Siguiente paso recomendado"}
                </span>
                <h2>
                  {openEncounter
                    ? openEncounter.chiefComplaint ||
                      "Continuar encounter abierto"
                    : latestEncounter
                      ? "Revisar historia y decidir nueva atención"
                      : "Abrir primera atención"}
                </h2>
                <p>
                  {openEncounter
                    ? `Existe un encounter abierto desde ${new Date(openEncounter.startedAt).toLocaleString()}. La acción más segura es retomarlo antes de crear otro.`
                    : latestEncounter
                      ? `El último encounter fue el ${new Date(latestEncounter.startedAt).toLocaleDateString()}. Conviene revisar continuidad clínica antes de iniciar uno nuevo.`
                      : "Este paciente aún no tiene historia clínica operativa. La siguiente acción lógica es abrir la primera atención."}
                </p>
                <div className="patient-hub__actions">
                  {openEncounter ? (
                    <Link
                      href={`/nueva-atencion?patientId=${patient.id}&encounterId=${openEncounter.id}`}
                      className="btn"
                    >
                      Retomar encounter
                    </Link>
                  ) : (
                    <Link
                      href={`/nueva-atencion?patientId=${patient.id}`}
                      className="btn"
                    >
                      Iniciar atención
                    </Link>
                  )}
                  <Link
                    href={`/historia-clinica?patientId=${patient.id}`}
                    className="btn secondary"
                  >
                    Ver historia
                  </Link>
                  <Link href="/agenda" className="btn secondary">
                    Programar cita
                  </Link>
                </div>
              </div>

              <div className="patient-spotlight__stats">
                <div className="patient-spotlight__stat">
                  <span>Encuentros cerrados</span>
                  <strong>{closedEncounters}</strong>
                </div>
                <div className="patient-spotlight__stat">
                  <span>Encounter abierto</span>
                  <strong>{openEncounter ? "Sí" : "No"}</strong>
                </div>
                <div className="patient-spotlight__stat">
                  <span>Último autor</span>
                  <strong>
                    {latestEncounter?.createdByName ??
                      ownerName ??
                      "Sin registro"}
                  </strong>
                </div>
                <div className="patient-spotlight__stat">
                  <span>Expediente</span>
                  <strong>
                    {encounters.length
                      ? "Con continuidad clínica"
                      : "Pendiente"}
                  </strong>
                </div>
              </div>
            </div>
          </Card>

          <Card>
            <SectionHeading
              title="Ficha base"
              description="Datos demográficos y operativos que necesitas antes de abrir o retomar un encounter."
            />
            <div className="clinical-summary-grid">
              <div className="summary-item">
                <span>Teléfono</span>
                <strong>{patient.phone || "No registrado"}</strong>
              </div>
              <div className="summary-item">
                <span>Contacto de emergencia</span>
                <strong>
                  {patient.emergencyContact?.name || "No registrado"}
                </strong>
              </div>
              <div className="summary-item">
                <span>Documento</span>
                <strong>{patient.documentNumber}</strong>
              </div>
              <div className="summary-item">
                <span>Edad</span>
                <strong>{calculateAge(patient.birthDate)} años</strong>
              </div>
              <div className="summary-item">
                <span>Correo</span>
                <strong>{patient.email || "No registrado"}</strong>
              </div>
              <div className="summary-item">
                <span>Tipo de sangre</span>
                <strong>{patient.bloodType || "No registrado"}</strong>
              </div>
              <div className="summary-item">
                <span>Seguro</span>
                <strong>{patient.insurance || "No registrado"}</strong>
              </div>
              <div className="summary-item">
                <span>Ocupación</span>
                <strong>{patient.occupation || "No registrada"}</strong>
              </div>
            </div>
          </Card>

          <Card>
            <SectionHeading
              title="Contexto clínico útil"
              description="Lectura rápida de antecedentes y alertas antes de cualquier decisión."
            />
            <div className="patient-alert-grid">
              <div className="info-panel" style={{ marginTop: 0 }}>
                <strong>Alergias</strong>
                <span>{patient.allergies?.join(", ") || "No registradas"}</span>
              </div>
              <div className="info-panel" style={{ marginTop: 0 }}>
                <strong>Antecedentes relevantes</strong>
                <span>
                  {patient.relevantHistory || "Sin antecedentes cargados"}
                </span>
              </div>
              <div className="info-panel" style={{ marginTop: 0 }}>
                <strong>Contacto de emergencia</strong>
                <span>
                  {patient.emergencyContact?.name
                    ? `${patient.emergencyContact.name} · ${patient.emergencyContact.relation || "sin parentesco"} · ${patient.emergencyContact.phone || "sin teléfono"}`
                    : "No registrado"}
                </span>
              </div>
              <div className="info-panel" style={{ marginTop: 0 }}>
                <strong>Sexo y género</strong>
                <span>
                  {patient.sex}
                  {patient.gender ? ` · ${patient.gender}` : ""}
                </span>
              </div>
            </div>
          </Card>

          <Card>
            <SectionHeading
              title="Ruta clínica"
              description="Accesos operativos sobre el mismo expediente vivo del paciente."
            />
            <div className="route-grid">
              <Link
                href={`/nueva-atencion?patientId=${patient.id}`}
                className="route-card"
              >
                <strong>
                  {openEncounter ? "1. Retomar atención" : "1. Nueva atención"}
                </strong>
                <span>
                  {openEncounter
                    ? "Vuelve al encounter abierto para continuar el episodio sin crear duplicados."
                    : "Abre el encounter, captura signos vitales y registra la nota clínica."}
                </span>
              </Link>
              <Link
                href={`/historia-clinica?patientId=${patient.id}`}
                className="route-card"
              >
                <strong>2. Historia clínica</strong>
                <span>
                  Revisa todos los encuentros del paciente en secuencia
                  longitudinal.
                </span>
              </Link>
              <Link href="/agenda" className="route-card">
                <strong>3. Agenda y seguimiento</strong>
                <span>
                  Programa controles, reagenda y enlaza nuevas atenciones desde
                  citas.
                </span>
              </Link>
              <Link href="/documentos" className="route-card">
                <strong>4. Documentos y anexos</strong>
                <span>
                  Impresión, anexos y material clínico del mismo registro
                  maestro.
                </span>
              </Link>
            </div>
          </Card>

          <Card>
            <SectionHeading
              title="Línea de tiempo clínica"
              description="Cada encuentro conserva su autor, tipo, estado y siguiente acción sugerida."
            />
            {encountersQuery.error ? (
              <div className="empty-state">
                <strong>No se pudo cargar la línea de tiempo.</strong>
                <p>
                  {encountersQuery.error instanceof Error
                    ? encountersQuery.error.message
                    : "Error recuperando los encounters del paciente."}
                </p>
              </div>
            ) : null}
            {encounters.length ? (
              encounters.map((encounter) => (
                <div key={encounter.id} className="timeline-entry">
                  <div className="timeline-entry__marker" />
                  <div className="timeline-entry__body">
                    <div className="timeline-entry__top">
                      <strong>
                        {new Date(encounter.startedAt).toLocaleString()}
                      </strong>
                      <div className="btn-row">
                        <StatusBadge
                          label={encounter.encounterType}
                          tone="info"
                        />
                        <StatusBadge
                          label={encounter.status}
                          tone={
                            encounter.status === "open" ? "warning" : "success"
                          }
                        />
                      </div>
                    </div>
                    <p>{encounter.chiefComplaint ?? "Sin motivo registrado"}</p>
                    <span>
                      {encounter.createdByName ?? "Sin autor"} · episodio{" "}
                      {encounter.id.slice(0, 8)}
                    </span>
                    <div className="btn-row">
                      <Link
                        href={`/historia-clinica?patientId=${patient.id}`}
                        className="pill-link"
                      >
                        Ver en historia
                      </Link>
                      <Link
                        href={`/nueva-atencion?patientId=${patient.id}&encounterId=${encounter.id}`}
                        className="pill-link"
                      >
                        {encounter.status === "open"
                          ? "Continuar encounter"
                          : "Reabrir contexto"}
                      </Link>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="empty-state">
                <strong>Este paciente todavía no tiene encuentros.</strong>
                <p>
                  La siguiente acción lógica es abrir una nueva atención desde
                  esta ficha.
                </p>
              </div>
            )}
          </Card>
        </div>

        <aside className="clinical-layout__side stack">
          <Card className="clinical-side-card">
            <SectionHeading
              title="Panel operativo"
              description="Resumen de coordinación clínica y colaboración."
            />
            <div className="meta-strip">
              <strong>Propietario</strong>
              <span>{ownerName}</span>
            </div>
            <div className="meta-strip">
              <strong>Alergias</strong>
              <span>{patient.allergies?.join(", ") || "No registradas"}</span>
            </div>
            <div className="meta-strip">
              <strong>Antecedentes</strong>
              <span>
                {patient.relevantHistory || "Sin antecedentes cargados"}
              </span>
            </div>
            <div className="meta-strip">
              <strong>Estado del expediente</strong>
              <span>
                {openEncounter
                  ? "Encounter abierto"
                  : latestEncounter
                    ? "Con historia activa"
                    : "Pendiente de primera atención"}
              </span>
            </div>
            <div className="meta-strip">
              <strong>Colaboradores</strong>
              <span>
                {accessQuery.isError
                  ? "No disponible por error de carga"
                  : `${activeCollaborators} con acceso activo`}
              </span>
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

          {accessQuery.isError ? (
            <Card>
              <SectionHeading
                title="Colaboración clínica no disponible"
                description="La ficha pudo abrirse, pero el panel de colaboración no logró cargar."
              />
              <div className="empty-state">
                <strong>
                  {accessQuery.error instanceof Error
                    ? accessQuery.error.message
                    : "No se pudo cargar el panel de acceso compartido."}
                </strong>
                <p>
                  Puedes seguir usando la ficha y reintentar más tarde sin perder
                  el contexto clínico del paciente.
                </p>
              </div>
            </Card>
          ) : (
            <PatientSharePanel
              patientId={patient.id}
              ownerUserId={patient.ownerUserId}
            />
          )}
        </aside>
      </div>
    </div>
  );
}
