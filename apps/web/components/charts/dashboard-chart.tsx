"use client";

import type { Appointment } from "@axyscare/core-types";
import { Card, SectionHeading } from "@axyscare/ui-shared";
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

type DashboardAppointmentStatus = Appointment["status"];
export type DashboardChartStatus =
  | "programada"
  | "confirmada"
  | "atendida"
  | "no_asistio";

export function DashboardChart({
  appointments,
  activeStatus,
  onSelectStatus,
}: {
  appointments: Appointment[];
  activeStatus?: DashboardChartStatus | null;
  onSelectStatus?: (status: DashboardChartStatus) => void;
}) {
  const grouped = [
    {
      label: "Programadas",
      total: appointments.filter((item) => item.status === "programada").length,
      status: "programada" as const,
      fill: activeStatus === "programada" ? "#0f5356" : "#156669",
    },
    {
      label: "Confirmadas",
      total: appointments.filter((item) => item.status === "confirmada").length,
      status: "confirmada" as const,
      fill: activeStatus === "confirmada" ? "#0f5356" : "#156669",
    },
    {
      label: "Atendidas",
      total: appointments.filter((item) => item.status === "atendida").length,
      status: "atendida" as const,
      fill: activeStatus === "atendida" ? "#0f5356" : "#156669",
    },
    {
      label: "No asistió",
      total: appointments.filter((item) => item.status === "no_asistio").length,
      status: "no_asistio" as const,
      fill: activeStatus === "no_asistio" ? "#0f5356" : "#156669",
    },
  ];

  return (
    <Card>
      <SectionHeading
        title="Pulso de agenda"
        description="Distribución rápida de estados de citas. Pulsa una barra para ver los pacientes incluidos."
      />
      <div style={{ width: "100%", height: 280 }}>
        <ResponsiveContainer>
          <BarChart data={grouped}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.24} />
            <XAxis dataKey="label" />
            <YAxis allowDecimals={false} />
            <Tooltip />
            <Bar
              dataKey="total"
              radius={[12, 12, 0, 0]}
              cursor={onSelectStatus ? "pointer" : "default"}
              onClick={(data: any) => {
                if (!onSelectStatus || !data?.status) return;
                onSelectStatus(data.status as DashboardChartStatus);
              }}
            >
              {grouped.map((item) => (
                <Cell key={item.status} fill={item.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
