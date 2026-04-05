"use client";

import type { Appointment } from "@axyscare/core-types";
import { Card, SectionHeading } from "@axyscare/ui-shared";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export function DashboardChart({ appointments }: { appointments: Appointment[] }) {
  const grouped = [
    { label: "Programadas", total: appointments.filter((item) => item.status === "programada").length },
    { label: "Confirmadas", total: appointments.filter((item) => item.status === "confirmada").length },
    { label: "Atendidas", total: appointments.filter((item) => item.status === "atendida").length },
    { label: "No asistió", total: appointments.filter((item) => item.status === "no_asistio").length },
  ];

  return (
    <Card>
      <SectionHeading title="Pulso de agenda" description="Distribución rápida de estados de citas." />
      <div style={{ width: "100%", height: 280 }}>
        <ResponsiveContainer>
          <BarChart data={grouped}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.24} />
            <XAxis dataKey="label" />
            <YAxis allowDecimals={false} />
            <Tooltip />
            <Bar dataKey="total" fill="#156669" radius={[12, 12, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}

