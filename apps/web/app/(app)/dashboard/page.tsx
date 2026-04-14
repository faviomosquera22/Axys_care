"use client";

import { listAppointments, listEncounters, listPatients } from "@axyscare/core-db";
import { EmptyStatePanel, LoadingStateCard, MetricCard, SectionHeading, StatusBadge } from "@axyscare/ui-shared";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import Link from "next/link";
import { DashboardChart, type DashboardChartStatus } from "@/components/charts/dashboard-chart";
import { readTrackedEvents, type AnalyticsEvent } from "@/lib/client-analytics";
import { useAuth } from "@/components/providers/providers";

export default function DashboardPage() {
  const { client } = useAuth();
  const [recentEvents, setRecentEvents] = useState<AnalyticsEvent[]>([]);
  const [selectedAppointmentStatus, setSelectedAppointmentStatus] = useState<DashboardChartStatus | null>(null);
  const appointmentsQuery = useQuery({
    queryKey: ["appointments", "dashboard"],
    queryFn: () => listAppointments(client),
  });
  const patientsQuery = useQuery({
    queryKey: ["patients", "dashboard"],
    queryFn: () => listPatients(client),
  });
  const encountersQuery = useQuery({
    queryKey: ["encounters", "dashboard"],
    queryFn: () => listEncounters(client),
  });

  const appointments = appointmentsQuery.data ?? [];
  const patients = patientsQuery.data ?? [];
  const encounters = encountersQuery.data ?? [];

  const today = new Date().toDateString();
  const todayAppointments = appointments.filter(
    (appointment) => new Date(appointment.startAt).toDateString() === today,
  );
  const openEncounters = encounters.filter((item) => item.status === "open");
  const unattendedAppointments = todayAppointments.filter((item) => item.status !== "atendida");
  const recentPatients = patients.slice(0, 5);
  const patientNameMap = new Map(
    patients.map((patient) => [patient.id, `${patient.firstName} ${patient.lastName}`.trim()]),
  );
  const appointmentsForSelectedStatus = selectedAppointmentStatus
    ? appointments.filter((appointment) => appointment.status === selectedAppointmentStatus)
    : [];
  const selectedStatusLabel =
    selectedAppointmentStatus === "programada"
      ? "Programadas"
      : selectedAppointmentStatus === "confirmada"
        ? "Confirmadas"
        : selectedAppointmentStatus === "atendida"
          ? "Atendidas"
          : selectedAppointmentStatus === "no_asistio"
            ? "No asistió"
            : "";
  const nextActionLabel = openEncounters.length
    ? "Retomar encounters abiertos"
    : unattendedAppointments.length
      ? "Preparar agenda del día"
      : "Crear una nueva atención";

  useEffect(() => {
    setRecentEvents(readTrackedEvents().slice(0, 5));
  }, []);

  if (appointmentsQuery.isLoading || patientsQuery.isLoading || encountersQuery.isLoading) {
    return (
      <div className="stack">
        <LoadingStateCard
          title="Cargando tablero clínico"
          description="Estamos reuniendo agenda, pacientes y encounters para mostrarte el foco de la jornada."
        />
      </div>
    );
  }

  return (
    <div className="stack">
      <section className="page-hero page-hero--dashboard">
        <div className="page-hero__content">
          <span className="page-hero__eyebrow">Centro de control</span>
          <h1>Tu jornada clínica en una sola vista</h1>
          <p>
            Prioriza citas de hoy, encounters abiertos y pacientes que necesitan continuidad sin
            perder tiempo navegando entre módulos.
          </p>
        </div>
        <div className="page-hero__aside">
          <div className="hero-priority-card">
            <span>Foco inmediato</span>
            <strong>{nextActionLabel}</strong>
            <p>
              {openEncounters.length
                ? `${openEncounters.length} episodios siguen en curso y conviene retomarlos antes de abrir nuevos.`
                : unattendedAppointments.length
                  ? `${unattendedAppointments.length} citas de hoy siguen pendientes de atención o confirmación.`
                  : "La agenda está controlada; el siguiente mejor paso es abrir una atención o revisar historia clínica."}
            </p>
          </div>
        </div>
      </section>

      <section className="onboarding-panel">
        <div className="onboarding-panel__card">
          <strong>Empieza por hoy</strong>
          <p>Revisa citas pendientes y encounters abiertos antes de abrir trabajo nuevo.</p>
        </div>
        <div className="onboarding-panel__card">
          <strong>Usa el buscador global</strong>
          <p>Salta a paciente o agenda escribiendo nombre, documento o motivo de consulta.</p>
        </div>
        <div className="onboarding-panel__card">
          <strong>Mantén continuidad</strong>
          <p>Desde cada vista intenta llegar a ficha, historia y atención sin perder contexto.</p>
        </div>
      </section>

      <div className="stats-grid">
        <MetricCard label="Citas de hoy" value={todayAppointments.length} hint="Vista operativa del día" />
        <MetricCard label="Pacientes" value={patients.length} />
        <MetricCard label="Encuentros" value={encounters.length} />
        <MetricCard
          label="Abiertos"
          value={openEncounters.length}
          hint="Seguimiento clínico activo"
        />
      </div>

      <div className="two-column">
        <div className="stack">
          <DashboardChart
            appointments={appointments}
            activeStatus={selectedAppointmentStatus}
            onSelectStatus={(status) =>
              setSelectedAppointmentStatus((current) => (current === status ? null : status))
            }
          />
          {selectedAppointmentStatus ? (
            <div className="ax-card">
              <SectionHeading
                title={`Pacientes en ${selectedStatusLabel}`}
                description="Listado de citas incluidas en la barra seleccionada."
                action={
                  <button
                    type="button"
                    className="pill-link"
                    onClick={() => setSelectedAppointmentStatus(null)}
                  >
                    Limpiar
                  </button>
                }
              />
              {appointmentsForSelectedStatus.length ? (
                appointmentsForSelectedStatus.map((appointment) => (
                  <div key={appointment.id} className="list-row">
                    <div>
                      <strong>{patientNameMap.get(appointment.patientId) ?? "Paciente sin nombre visible"}</strong>
                      <p className="muted">
                        {new Date(appointment.startAt).toLocaleString()} · {appointment.reason}
                      </p>
                    </div>
                    <div className="btn-row">
                      <Link href={`/pacientes/${appointment.patientId}`} className="pill-link">
                        Ver paciente
                      </Link>
                      <Link href="/agenda" className="pill-link">
                        Ver agenda
                      </Link>
                    </div>
                  </div>
                ))
              ) : (
                <EmptyStatePanel
                  title="No hay citas para este estado."
                  description="El gráfico quedó filtrado, pero no hay registros visibles en la agenda actual para esa barra."
                />
              )}
            </div>
          ) : null}
        </div>
        <div className="stack">
          <div className="ax-card">
            <SectionHeading
              title="Acciones priorizadas"
              description="Lo que más probablemente necesita atención ahora mismo."
              action={<StatusBadge label={`${todayAppointments.length} citas hoy`} tone="info" />}
            />
            {(openEncounters.slice(0, 3) ?? []).map((encounter) => (
              <div key={encounter.id} className="list-row">
                <div>
                  <strong>{encounter.chiefComplaint || "Encounter abierto en curso"}</strong>
                  <p className="muted">
                    Iniciado el {new Date(encounter.startedAt).toLocaleString()} por{" "}
                    {encounter.createdByName ?? "equipo clínico"}
                  </p>
                </div>
                <a href={`/nueva-atencion?patientId=${encounter.patientId}&encounterId=${encounter.id}`} className="pill-link">
                  Retomar
                </a>
              </div>
            ))}
            {!openEncounters.length
              ? (unattendedAppointments.slice(0, 3) ?? []).map((appointment) => (
                  <div key={appointment.id} className="list-row">
                    <div>
                      <strong>{new Date(appointment.startAt).toLocaleString()}</strong>
                      <p className="muted">{appointment.reason}</p>
                    </div>
                    <StatusBadge
                      label={appointment.status}
                      tone={appointment.status === "confirmada" ? "info" : "warning"}
                    />
                  </div>
                ))
              : null}
            {!openEncounters.length && !unattendedAppointments.length ? (
              <div className="empty-state">
                <strong>No hay alertas operativas urgentes.</strong>
                <p>La jornada está al día. Puedes revisar pacientes recientes o programar seguimiento.</p>
              </div>
            ) : null}
          </div>
          <div className="ax-card">
            <SectionHeading title="Próximas citas" description="Próximos movimientos de agenda." />
            {appointments.length ? (appointments.slice(0, 5) ?? []).map((appointment) => (
              <div key={appointment.id} className="list-row">
                <div>
                  <strong>{new Date(appointment.startAt).toLocaleString()}</strong>
                  <p className="muted">{appointment.reason}</p>
                </div>
                <StatusBadge label={appointment.status} tone={appointment.status === "atendida" ? "success" : "warning"} />
              </div>
            )) : (
              <EmptyStatePanel
                title="Todavía no hay citas registradas."
                description="Empieza creando una cita desde Agenda para que el tablero pueda priorizar tu jornada."
              />
            )}
          </div>
          <div className="ax-card">
            <SectionHeading title="Pacientes recientes" description="Acceso rápido a continuidad clínica." />
            {recentPatients.length ? (recentPatients ?? []).map((patient) => (
              <div key={patient.id} className="list-row">
                <div>
                  <strong>
                    {patient.firstName} {patient.lastName}
                  </strong>
                  <p className="muted">{patient.documentNumber}</p>
                </div>
                <a href={`/pacientes/${patient.id}`} className="pill-link">
                  Abrir
                </a>
              </div>
            )) : (
              <EmptyStatePanel
                title="Aún no hay pacientes cargados."
                description="Registra el primer paciente para empezar una historia clínica con continuidad."
              />
            )}
          </div>
          <div className="ax-card">
            <SectionHeading title="Uso reciente" description="Señales locales para entender qué flujo se usa más." />
            {recentEvents.length ? (
              recentEvents.map((event) => (
                <div key={`${event.type}-${event.createdAt}`} className="list-row">
                  <div>
                    <strong>{event.type}</strong>
                    <p className="muted">{event.detail}</p>
                  </div>
                  <StatusBadge label={new Date(event.createdAt).toLocaleTimeString()} tone="neutral" />
                </div>
              ))
            ) : (
              <EmptyStatePanel
                title="Todavía no hay eventos locales."
                description="Cuando empieces a buscar, crear o abrir flujos, este resumen mostrará qué se usa más."
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
