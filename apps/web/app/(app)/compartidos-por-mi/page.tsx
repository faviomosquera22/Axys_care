"use client";

import { listPatientsSharedByMe, revokePatientAccess } from "@axyscare/core-db";
import { Card, SectionHeading, StatusBadge } from "@axyscare/ui-shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/components/providers/providers";
import { useTableRealtime } from "@/components/realtime/use-table-realtime";

export default function SharedByMePage() {
  const { client } = useAuth();
  const queryClient = useQueryClient();
  const accessQuery = useQuery({
    queryKey: ["patients-shared-by-me"],
    queryFn: () => listPatientsSharedByMe(client),
  });

  useTableRealtime("shared-by-me", ["patient_access", "patients"], [["patients-shared-by-me"]]);

  const revokeMutation = useMutation({
    mutationFn: (accessId: string) => revokePatientAccess(client, accessId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["patients-shared-by-me"] }),
  });

  return (
    <Card>
      <SectionHeading
        title="Compartidos por mí"
        description="Control maestro del paciente y colaboradores activos o históricos."
      />
      {(accessQuery.data ?? []).map((access) => (
        <div key={access.id} className="trace-row">
          <strong>
            {access.patient?.firstName} {access.patient?.lastName}
          </strong>
          <p>
            Colaborador:{" "}
            {access.sharedWithProfile
              ? `${access.sharedWithProfile.firstName} ${access.sharedWithProfile.lastName}`
              : access.sharedWithUserId}
          </p>
          <span>
            Permiso {access.permissionLevel} · creado {access.createdAt ? new Date(access.createdAt).toLocaleString() : "sin fecha"}
          </span>
          <div className="btn-row">
            <StatusBadge
              label={access.status}
              tone={access.status === "active" ? "success" : access.status === "pending" ? "warning" : "danger"}
            />
            <a href={`/pacientes/${access.patientId}`} className="pill-link">
              Abrir
            </a>
            {access.status === "active" ? (
              <button
                className="btn ghost"
                onClick={() => revokeMutation.mutate(access.id)}
                disabled={revokeMutation.isPending}
              >
                Revocar
              </button>
            ) : null}
          </div>
        </div>
      ))}
    </Card>
  );
}

