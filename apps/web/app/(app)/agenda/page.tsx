"use client";

import type { Appointment } from "@axyscare/core-types";
import {
  createEncounterFromAppointment,
  listAppointments,
  listPatients,
  updateAppointmentStatus,
} from "@axyscare/core-db";
import { Card, SectionHeading, StatusBadge } from "@axyscare/ui-shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import timeGridPlugin from "@fullcalendar/timegrid";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { AppointmentForm } from "@/components/forms/appointment-form";
import { useAuth } from "@/components/providers/providers";

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
    },
  });

  return (
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
          <FullCalendar
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
            <div className="empty-state">
              <strong>No hay citas programadas en esta ventana.</strong>
              <p>
                Selecciona un rango en el calendario para crear una nueva cita o
                vuelve a la vista mensual para revisar agenda futura.
              </p>
            </div>
          )}
        </Card>
      </div>

      <div className="stack">
        <Card>
          <SectionHeading
            title={selectedAppointment ? "Editar cita" : "Crear cita"}
            description={
              selectedAppointment
                ? "Modifica la cita seleccionada sin salir de la agenda."
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
              title="Sin cita seleccionada"
              description="Elige una cita de la cola operativa o haz clic sobre un evento para ver acciones clínicas."
            />
            <div className="empty-state">
              <strong>La agenda ya no es solo calendario.</strong>
              <p>
                Desde aquí deberías poder abrir ficha, entrar a historia,
                iniciar atención o reagendar sin cambiar de módulo mentalmente.
              </p>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
