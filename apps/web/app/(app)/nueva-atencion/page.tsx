"use client";

import { getProfile, listPatients } from "@axyscare/core-db";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { EncounterWorkspace } from "@/components/forms/encounter-workspace";
import { useAuth } from "@/components/providers/providers";

export default function NewEncounterPage() {
  const searchParams = useSearchParams();
  const patientId = searchParams.get("patientId") ?? undefined;
  const { client, user } = useAuth();
  const patientsQuery = useQuery({
    queryKey: ["patients", "encounter"],
    queryFn: () => listPatients(client),
  });
  const profileQuery = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: () => getProfile(client, user!.id),
    enabled: Boolean(user?.id),
  });

  return (
    <div className="stack">
      <div className="topbar">
        <div>
          <h1>Nueva atención</h1>
          <p>Paciente, encounter, signos vitales, nota médica, enfermería y PDF base.</p>
        </div>
      </div>
      <EncounterWorkspace
        patients={patientsQuery.data ?? []}
        professional={profileQuery.data ?? null}
        initialPatientId={patientId}
      />
    </div>
  );
}

