"use client";

import { listAppointments, listEncounters, listPatients } from "@axyscare/core-db";
import { MetricCard, SectionHeading, StatusBadge } from "@axyscare/ui-shared";
import { useQuery } from "@tanstack/react-query";
import { DashboardChart } from "@/components/charts/dashboard-chart";
import { useAuth } from "@/components/providers/providers";

export default function DashboardPage() {
  const { client } = useAuth();
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

  return (
    <div className="stack">
      <div className="topbar">
        <div>
          <h1>Dashboard</h1>
          <p>Vista rápida de agenda, pacientes y episodios abiertos.</p>
        </div>
        <StatusBadge label={`${todayAppointments.length} citas hoy`} tone="info" />
      </div>

      <div className="stats-grid">
        <MetricCard label="Citas del día" value={todayAppointments.length} />
        <MetricCard label="Pacientes" value={patients.length} />
        <MetricCard label="Encuentros" value={encounters.length} />
        <MetricCard
          label="Abiertos"
          value={encounters.filter((item) => item.status === "open").length}
          hint="Seguimiento clínico activo"
        />
      </div>

      <div className="two-column">
        <DashboardChart appointments={appointments} />
        <div className="stack">
          <div className="ax-card">
            <SectionHeading title="Próximas citas" description="Próximos movimientos operativos." />
            {(appointments.slice(0, 5) ?? []).map((appointment) => (
              <div key={appointment.id} className="list-row">
                <div>
                  <strong>{new Date(appointment.startAt).toLocaleString()}</strong>
                  <p className="muted">{appointment.reason}</p>
                </div>
                <StatusBadge label={appointment.status} tone={appointment.status === "atendida" ? "success" : "warning"} />
              </div>
            ))}
          </div>
          <div className="ax-card">
            <SectionHeading title="Pacientes recientes" description="Últimos registros creados." />
            {(patients.slice(0, 5) ?? []).map((patient) => (
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
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

