"use client";

import { listEncounters } from "@axyscare/core-db";
import { Card, SectionHeading, StatusBadge } from "@axyscare/ui-shared";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/components/providers/providers";

export default function HistoryPage() {
  const { client } = useAuth();
  const encountersQuery = useQuery({
    queryKey: ["encounters", "history"],
    queryFn: () => listEncounters(client),
  });

  return (
    <Card>
      <SectionHeading title="Historia clínica" description="Listado consolidado de encounters registrados." />
      {(encountersQuery.data ?? []).map((encounter) => (
        <div key={encounter.id} className="list-row">
          <div>
            <strong>{new Date(encounter.startedAt).toLocaleString()}</strong>
            <p className="muted">{encounter.chiefComplaint ?? "Sin motivo registrado"}</p>
          </div>
          <StatusBadge label={encounter.encounterType} tone="info" />
        </div>
      ))}
    </Card>
  );
}

