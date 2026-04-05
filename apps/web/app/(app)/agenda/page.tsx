"use client";

import type { Appointment } from "@axyscare/core-types";
import {
  createEncounterFromAppointment,
  listAppointments,
  listPatients,
  updateAppointmentStatus,
} from "@axyscare/core-db";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import timeGridPlugin from "@fullcalendar/timegrid";
import { useState } from "react";
import { AppointmentForm } from "@/components/forms/appointment-form";
import { useAuth } from "@/components/providers/providers";

export default function AgendaPage() {
  const { client } = useAuth();
  const queryClient = useQueryClient();
  const [selectedRange, setSelectedRange] = useState<{ startAt: string; endAt: string } | null>(null);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [createdEncounterId, setCreatedEncounterId] = useState<string | null>(null);

  const appointmentsQuery = useQuery({
    queryKey: ["appointments"],
    queryFn: () => listAppointments(client),
  });
  const patientsQuery = useQuery({
    queryKey: ["patients"],
    queryFn: () => listPatients(client),
  });

  const startEncounterMutation = useMutation({
    mutationFn: async (appointment: Appointment) => {
      const encounter = await createEncounterFromAppointment(client, appointment);
      await updateAppointmentStatus(client, appointment.id, "atendida");
      return encounter;
    },
    onSuccess: (encounter) => {
      setCreatedEncounterId(encounter.id);
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
    },
  });

  return (
    <div className="two-column">
      <div className="ax-card">
        <div className="topbar">
          <div>
            <h1>Agenda clínica</h1>
            <p>Daily, weekly y monthly views con transición a teleconsulta o encounter.</p>
          </div>
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
          events={(appointmentsQuery.data ?? []).map((appointment) => ({
            id: appointment.id,
            title: appointment.reason,
            start: appointment.startAt,
            end: appointment.endAt,
          }))}
          select={(selection) => {
            setSelectedRange({
              startAt: selection.startStr,
              endAt: selection.endStr,
            });
            setSelectedAppointment(null);
          }}
          eventClick={(event) => {
            const appointment = (appointmentsQuery.data ?? []).find((item) => item.id === event.event.id) ?? null;
            setSelectedAppointment(appointment);
            setSelectedRange(null);
          }}
        />
      </div>

      <div className="stack">
        <div className="ax-card">
          <h2 style={{ marginTop: 0 }}>Crear o editar cita</h2>
          <AppointmentForm
            patients={patientsQuery.data ?? []}
            initialAppointment={selectedAppointment}
            initialRange={selectedRange}
            onSaved={() => {
              setSelectedAppointment(null);
              setSelectedRange(null);
            }}
          />
        </div>
        {selectedAppointment ? (
          <div className="ax-card">
            <h2 style={{ marginTop: 0 }}>Operaciones de cita</h2>
            <p className="muted">
              {selectedAppointment.modality === "virtual" && selectedAppointment.meetLink
                ? `Teleconsulta disponible en ${selectedAppointment.meetLink}`
                : "Cita presencial o sin link configurado."}
            </p>
            <div className="btn-row">
              <button
                className="btn"
                onClick={() => startEncounterMutation.mutate(selectedAppointment)}
                disabled={startEncounterMutation.isPending}
              >
                {startEncounterMutation.isPending ? "Abriendo..." : "Iniciar atención"}
              </button>
              {selectedAppointment.meetLink ? (
                <a className="btn secondary" href={selectedAppointment.meetLink} target="_blank" rel="noreferrer">
                  Abrir Meet
                </a>
              ) : null}
            </div>
            {createdEncounterId ? (
              <p className="muted" style={{ marginTop: 12 }}>
                Encounter creado: {createdEncounterId}
              </p>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}

