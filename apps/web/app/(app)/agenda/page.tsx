"use client";

import type { Appointment } from "@axyscare/core-types";
import {
  createEncounterFromAppointment,
  listAppointments,
  listPatients,
  updateAppointmentStatus,
} from "@axyscare/core-db";
import { Card, EmptyStatePanel, LoadingStateCard, SectionHeading, StatusBadge } from "@axyscare/ui-shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import timeGridPlugin from "@fullcalendar/timegrid";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { AppointmentForm } from "@/components/forms/appointment-form";
import { trackUIEvent } from "@/lib/client-analytics";
import { useAuth, useUI } from "@/components/providers/providers";

const ClientFullCalendar = dynamic(() => import("@fullcalendar/react"), {
  ssr: false,
  loading: () => <div className="calendar-loading">Cargando calendario...</div>,
});

function getAppointmentTone(status: Appointment["status"]) {
  if (status === "atendida") return "success" as const;
  if (status === "cancelada" || status === "no_asistio")
    return "danger" as const;
  if (status === "confirmada") return "info" as const;
  return "warning" as const;
}

function getAppointmentEventColors(appointment: Appointment) {
  if (appointment.status === "atendida") {
    return {
      backgroundColor: "rgba(29, 106, 72, 0.18)",
      borderColor: "rgba(29, 106, 72, 0.38)",
      textColor: "#184d36",
    };
  }

  if (
    appointment.status === "cancelada" ||
    appointment.status === "no_asistio"
  ) {
    return {
      backgroundColor: "rgba(166, 61, 61, 0.16)",
      borderColor: "rgba(166, 61, 61, 0.38)",
      textColor: "#7e2f2f",
    };
  }

  if (appointment.modality === "virtual") {
    return {
      backgroundColor: "rgba(53, 87, 168, 0.16)",
      borderColor: "rgba(53, 87, 168, 0.38)",
      textColor: "#274287",
    };
  }

  if (appointment.status === "confirmada") {
    return {
      backgroundColor: "rgba(21, 102, 105, 0.16)",
      borderColor: "rgba(21, 102, 105, 0.34)",
      textColor: "#134d50",
    };
  }

  return {
    backgroundColor: "rgba(176, 86, 39, 0.14)",
    borderColor: "rgba(176, 86, 39, 0.3)",
    textColor: "#8d461f",
  };
}

function isSameDay(dateA: Date, dateB: Date) {
  return (
    dateA.getFullYear() === dateB.getFullYear() &&
    dateA.getMonth() === dateB.getMonth() &&
    dateA.getDate() === dateB.getDate()
  );
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString();
}

export default function AgendaPage() {
  const { client } = useAuth();
  const { notify } = useUI();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [selectedRange, setSelectedRange] = useState<{
    startAt: string;
    endAt: string;
  } | null>(null);
  const [selectedAppointment, setSelectedAppointment] =
    useState<Appointment | null>(null);
  const [createdEncounterId, setCreatedEncounterId] = useState<string | null>(
    null,
  );

  const appointmentsQuery = useQuery({
    queryKey: ["appointments"],
    queryFn: () => listAppointments(client),
  });
  const patientsQuery = useQuery({
    queryKey: ["patients"],
    queryFn: () => listPatients(client),
  });

  const appointments = useMemo(
    () =>
      [...(appointmentsQuery.data ?? [])].sort(
        (left, right) =>
          new Date(left.startAt).getTime() - new Date(right.startAt).getTime(),
      ),
    [appointmentsQuery.data],
  );
  const patients = patientsQuery.data ?? [];
  const patientMap = useMemo(
    () => new Map(patients.map((patient) => [patient.id, patient])),
    [patients],
  );
  const selectedPatient = selectedAppointment
    ? (patientMap.get(selectedAppointment.patientId) ?? null)
    : null;

  const today = new Date();
  const todayAppointments = appointments.filter((appointment) =>
    isSameDay(new Date(appointment.startAt), today),
  );
  const nextAppointments = appointments
    .filter(
      (appointment) =>
        new Date(appointment.startAt).getTime() >= today.getTime(),
    )
    .slice(0, 6);
  const confirmedAppointments = todayAppointments.filter((appointment) => appointment.status === "confirmada").length;
  const virtualAppointments = todayAppointments.filter((appointment) => appointment.modality === "virtual").length;

  if (appointmentsQuery.isLoading || patientsQuery.isLoading) {
    return (
      <div className="stack">
        <LoadingStateCard
          title="Cargando agenda clínica"
          description="Estamos reuniendo citas y pacientes para que puedas coordinar el día sin fricción."
        />
      </div>
    );
  }

  const startEncounterMutation = useMutation({
    mutationFn: async (appointment: Appointment) => {
      const encounter = await createEncounterFromAppointment(
        client,
        appointment,
      );
      await updateAppointmentStatus(client, appointment.id, "atendida");
      return encounter;
    },
    onSuccess: (encounter) => {
      setCreatedEncounterId(encounter.id);
      setSelectedAppointment((current) =>
        current ? { ...current, status: "atendida" } : current,
      );
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      trackUIEvent("agenda_open_encounter", encounter.id);
      notify({
        tone: "success",
        message: "Encounter abierto desde la agenda.",
        actionLabel: "Continuar",
        actionHref: `/nueva-atencion?patientId=${encounter.patientId}&encounterId=${encounter.id}`,
      });
    },
  });

  const appointmentStatusMutation = useMutation({
    mutationFn: async ({
      appointmentId,
      status,
    }: {
      appointmentId: string;
      status: Appointment["status"];
    }) => updateAppointmentStatus(client, appointmentId, status),
    onSuccess: (updatedAppointment) => {
      setCreatedEncounterId(null);
      setSelectedAppointment((current) =>
        current && current.id === updatedAppointment.id
          ? updatedAppointment
          : current,
      );
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      trackUIEvent("agenda_status_change", updatedAppointment.status);
      notify({ tone: "info", message: `Cita marcada como ${updatedAppointment.status}.` });
    },
  });

  return (
    <div className="stack">
      <section className="page-hero page-hero--agenda">
        <div className="page-hero__content">
          <span className="page-hero__eyebrow">Agenda clínica</span>
          <h1>Coordina el día y entra a la atención sin fricción</h1>
          <p>
            El calendario debe ayudarte a decidir rápido: qué cita sigue, qué paciente atender y
            cuándo abrir el encounter.
          </p>
        </div>
        <div className="hero-stat-grid">
          <div className="hero-stat-card">
            <span>Citas hoy</span>
            <strong>{todayAppointments.length}</strong>
          </div>
          <div className="hero-stat-card">
            <span>Confirmadas</span>
            <strong>{confirmedAppointments}</strong>
          </div>
          <div className="hero-stat-card">
            <span>Virtuales</span>
            <strong>{virtualAppointments}</strong>
          </div>
        </div>
      </section>

      <section className="onboarding-panel">
        <div className="onboarding-panel__card">
          <strong>Selecciona una cita</strong>
          <p>Haz clic en la cola operativa o en el calendario para traerla al panel de acción.</p>
        </div>
        <div className="onboarding-panel__card">
          <strong>Decide en un solo lugar</strong>
          <p>Confirma, cancela o abre la atención desde el panel derecho sin saltar entre módulos.</p>
        </div>
        <div className="onboarding-panel__card">
          <strong>Usa bloques libres</strong>
          <p>Arrastra en el calendario para crear una nueva cita con hora ya precargada.</p>
        </div>
      </section>

      <div className="two-column">
        <div className="stack">
        <Card>
          <div className="topbar">
            <div>
              <h1>Agenda clínica</h1>
              <p>
                Agenda semanal con foco operativo: cola del día, transición a
                ficha y apertura de atención desde la misma estación.
              </p>
            </div>
            <StatusBadge
              label={`${todayAppointments.length} citas hoy`}
              tone="info"
            />
          </div>
          <ClientFullCalendar
            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
            initialView="timeGridWeek"
            headerToolbar={{
              left: "prev,next today",
              center: "title",
              right: "dayGridMonth,timeGridWeek,timeGridDay",
            }}
            selectable
            events={appointments.map((appointment) => ({
              id: appointment.id,
              title: appointment.reason,
              start: appointment.startAt,
              end: appointment.endAt,
              ...getAppointmentEventColors(appointment),
            }))}
            select={(selection) => {
              setCreatedEncounterId(null);
              trackUIEvent("agenda_select_range", `${selection.startStr}::${selection.endStr}`);
              setSelectedRange({
                startAt: selection.startStr,
                endAt: selection.endStr,
              });
              setSelectedAppointment(null);
            }}
            eventClick={(event) => {
              const appointment =
                appointments.find((item) => item.id === event.event.id) ?? null;
              setCreatedEncounterId(null);
              if (appointment) {
                trackUIEvent("agenda_select_appointment", appointment.id);
              }
              setSelectedAppointment(appointment);
              setSelectedRange(null);
            }}
          />
        </Card>

        <Card>
          <SectionHeading
            title="Cola operativa"
            description="Citas del día y próximos movimientos para entrar a la atención sin perder tiempo."
            action={
              <StatusBadge
                label={`${nextAppointments.length} próximas`}
                tone="neutral"
              />
            }
          />
          {(todayAppointments.length ? todayAppointments : nextAppointments)
            .length ? (
            <div className="stack">
              {(todayAppointments.length
                ? todayAppointments
                : nextAppointments
              ).map((appointment) => {
                const patient = patientMap.get(appointment.patientId);
                const isSelected = selectedAppointment?.id === appointment.id;

                return (
                  <button
                    key={appointment.id}
                    type="button"
                    className={`picker-row ${isSelected ? "selected" : ""}`}
                    onClick={() => {
                      setCreatedEncounterId(null);
                      setSelectedAppointment(appointment);
                      setSelectedRange(null);
                    }}
                  >
                    <strong>
                      {formatDateTime(appointment.startAt)} ·{" "}
                      {patient
                        ? `${patient.firstName} ${patient.lastName}`
                        : "Paciente sin cargar"}
                    </strong>
                    <span>{appointment.reason}</span>
                    <div className="btn-row">
                      <StatusBadge
                        label={appointment.status}
                        tone={getAppointmentTone(appointment.status)}
                      />
                      <StatusBadge
                        label={appointment.modality}
                        tone={
                          appointment.modality === "virtual"
                            ? "info"
                            : "neutral"
                        }
                      />
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <EmptyStatePanel
              title="No hay citas programadas en esta ventana."
              description="Selecciona un rango en el calendario para crear una nueva cita o cambia la vista para revisar agenda futura."
            />
          )}
        </Card>
        </div>

        {(selectedAppointment || selectedRange) ? (
          <button
            type="button"
            aria-label="Cerrar panel lateral"
            className="agenda-drawer__scrim"
            onClick={() => {
              trackUIEvent("agenda_close_drawer", "scrim");
              setSelectedAppointment(null);
              setSelectedRange(null);
              setCreatedEncounterId(null);
            }}
          />
        ) : null}
        <div className={`agenda-drawer ${(selectedAppointment || selectedRange) ? "open" : ""}`}>
          {(selectedAppointment || selectedRange) ? (
            <button
              type="button"
              className="agenda-drawer__close"
              onClick={() => {
                trackUIEvent("agenda_close_drawer", "button");
                setSelectedAppointment(null);
                setSelectedRange(null);
                setCreatedEncounterId(null);
              }}
            >
              Cerrar panel
            </button>
          ) : null}
          <div className="stack">
          <Card className="operations-card">
          <SectionHeading
            title={selectedAppointment ? "Panel de cita seleccionada" : "Crear o preparar cita"}
            description={
              selectedAppointment
                ? "Las acciones importantes deben vivir aquí, no dispersas por toda la agenda."
                : "Selecciona un bloque en el calendario o crea una cita manualmente."
            }
          />
          {selectedRange ? (
            <div className="info-panel">
              <strong>Bloque seleccionado</strong>
              <span>
                Desde {formatDateTime(selectedRange.startAt)} hasta{" "}
                {formatDateTime(selectedRange.endAt)}.
              </span>
            </div>
          ) : null}
          <AppointmentForm
            patients={patients}
            initialAppointment={selectedAppointment}
            initialRange={selectedRange}
            onSaved={() => {
              setSelectedAppointment(null);
              setSelectedRange(null);
            }}
          />
        </Card>

        {selectedAppointment ? (
          <Card>
            <SectionHeading
              title="Operaciones de cita"
              description="Contexto clínico y acciones inmediatas para no salir del flujo operativo."
              action={
                <StatusBadge
                  label={selectedAppointment.status}
                  tone={getAppointmentTone(selectedAppointment.status)}
                />
              }
            />

            <div className="stack">
              <div className="meta-strip">
                <strong>Paciente</strong>
                <span>
                  {selectedPatient
                    ? `${selectedPatient.firstName} ${selectedPatient.lastName}`
                    : "Paciente no encontrado"}
                </span>
              </div>
              <div className="meta-strip">
                <strong>Horario</strong>
                <span>{formatDateTime(selectedAppointment.startAt)}</span>
              </div>
              <div className="meta-strip">
                <strong>Motivo</strong>
                <span>{selectedAppointment.reason}</span>
              </div>
              <div className="meta-strip">
                <strong>Modalidad</strong>
                <span>
                  {selectedAppointment.modality === "virtual" &&
                  selectedAppointment.meetLink
                    ? `Virtual · ${selectedAppointment.meetLink}`
                    : selectedAppointment.modality}
                </span>
              </div>
              <div className="meta-strip">
                <strong>Contacto</strong>
                <span>
                  {selectedPatient?.email ||
                    selectedPatient?.phone ||
                    "Sin correo ni teléfono"}
                </span>
              </div>
            </div>

            <div
              className="btn-row"
              style={{ marginTop: 16, flexWrap: "wrap" }}
            >
              <button
                className="btn"
                onClick={() =>
                  startEncounterMutation.mutate(selectedAppointment)
                }
                disabled={
                  startEncounterMutation.isPending ||
                  selectedAppointment.status === "atendida" ||
                  selectedAppointment.status === "cancelada"
                }
              >
                {startEncounterMutation.isPending
                  ? "Abriendo..."
                  : selectedAppointment.status === "atendida"
                    ? "Atención ya iniciada"
                    : "Iniciar atención"}
              </button>
              {selectedPatient ? (
                <>
                  <Link
                    href={`/pacientes/${selectedPatient.id}`}
                    className="btn secondary"
                  >
                    Abrir ficha
                  </Link>
                  <Link
                    href={`/historia-clinica?patientId=${selectedPatient.id}`}
                    className="btn secondary"
                  >
                    Ver historia
                  </Link>
                </>
              ) : null}
              {selectedAppointment.meetLink ? (
                <a
                  className="btn secondary"
                  href={selectedAppointment.meetLink}
                  target="_blank"
                  rel="noreferrer"
                >
                  Abrir Meet
                </a>
              ) : null}
            </div>

            <div
              className="btn-row"
              style={{ marginTop: 12, flexWrap: "wrap" }}
            >
              {selectedAppointment.status !== "confirmada" ? (
                <button
                  type="button"
                  className="btn ghost"
                  onClick={() =>
                    appointmentStatusMutation.mutate({
                      appointmentId: selectedAppointment.id,
                      status: "confirmada",
                    })
                  }
                  disabled={appointmentStatusMutation.isPending}
                >
                  Confirmar cita
                </button>
              ) : null}
              {selectedAppointment.status !== "no_asistio" ? (
                <button
                  type="button"
                  className="btn ghost"
                  onClick={() =>
                    appointmentStatusMutation.mutate({
                      appointmentId: selectedAppointment.id,
                      status: "no_asistio",
                    })
                  }
                  disabled={appointmentStatusMutation.isPending}
                >
                  Marcar no asistió
                </button>
              ) : null}
              {selectedAppointment.status !== "cancelada" ? (
                <button
                  type="button"
                  className="btn ghost"
                  onClick={() =>
                    appointmentStatusMutation.mutate({
                      appointmentId: selectedAppointment.id,
                      status: "cancelada",
                    })
                  }
                  disabled={appointmentStatusMutation.isPending}
                >
                  Cancelar cita
                </button>
              ) : null}
            </div>

            {createdEncounterId && selectedPatient ? (
              <div className="info-panel">
                <strong>Encounter listo</strong>
                <span>
                  Se abrió el episodio clínico y la cita quedó marcada como
                  atendida.
                </span>
                <button
                  type="button"
                  className="btn"
                  onClick={() =>
                    router.push(
                      `/nueva-atencion?patientId=${selectedPatient.id}&encounterId=${createdEncounterId}`,
                    )
                  }
                >
                  Continuar en Nueva atención
                </button>
              </div>
            ) : null}
          </Card>
        ) : (
          <Card>
            <SectionHeading
              title="Cómo usar esta agenda"
              description="La idea es reducir clics y evitar cambiar de módulo para tareas frecuentes."
            />
            <div className="compact-guide">
              <div className="compact-guide__item">
                <strong>1. Selecciona</strong>
                <p>Haz clic en una cita o arrastra un bloque libre para crear una nueva.</p>
              </div>
              <div className="compact-guide__item">
                <strong>2. Decide</strong>
                <p>Confirma, cancela o entra a la atención desde el panel lateral.</p>
              </div>
              <div className="compact-guide__item">
                <strong>3. Continúa</strong>
                <p>Salta a ficha, historia o encuentro sin romper el hilo clínico.</p>
              </div>
            </div>
          </Card>
        )}
          </div>
        </div>
      </div>
    </div>
  );
}
