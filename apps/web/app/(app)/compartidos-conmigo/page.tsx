"use client";

import { listSharedPatientsWithMe, removeSharedPatientFromMyList } from "@axyscare/core-db";
import { Card, EmptyStatePanel, SectionHeading, StatusBadge } from "@axyscare/ui-shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useAuth } from "@/components/providers/providers";
import { useTableRealtime } from "@/components/realtime/use-table-realtime";

export default function SharedWithMePage() {
  const { client } = useAuth();
  const queryClient = useQueryClient();
  const accessQuery = useQuery({
    queryKey: ["patients-shared-with-me"],
    queryFn: () => listSharedPatientsWithMe(client),
  });

  useTableRealtime(
    "shared-with-me",
    ["patient_access", "patients", "appointments", "encounters"],
    [["patients-shared-with-me"]],
  );

  const removeMutation = useMutation({
    mutationFn: (accessId: string) => removeSharedPatientFromMyList(client, accessId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["patients-shared-with-me"] }),
  });

  return (
    <Card>
      <SectionHeading
        title="Pacientes compartidos conmigo"
        description="Pacientes maestros de otros profesionales a los que hoy tienes acceso activo."
      />
      {(accessQuery.data ?? []).length ? (
        (accessQuery.data ?? []).map((access) => (
          <div key={access.id} className="trace-row">
            <strong>
              {access.patient?.firstName} {access.patient?.lastName}
            </strong>
            <p>
              Propietario:{" "}
              {access.ownerProfile ? `${access.ownerProfile.firstName} ${access.ownerProfile.lastName}` : access.ownerUserId}
            </p>
            <span>
              Permiso {access.permissionLevel} · {access.expiresAt ? `expira ${new Date(access.expiresAt).toLocaleString()}` : "sin expiración"}
            </span>
            <div className="btn-row">
              <StatusBadge label={access.status} tone={access.status === "active" ? "success" : "warning"} />
              <Link href={`/pacientes/${access.patientId}`} className="pill-link">
                Abrir
              </Link>
              <button
                className="btn ghost"
                onClick={() => removeMutation.mutate(access.id)}
                disabled={removeMutation.isPending}
              >
                Quitar de mi lista
              </button>
            </div>
          </div>
        ))
      ) : (
        <EmptyStatePanel
          title="Aún no tienes pacientes compartidos"
          description="Cuando otro profesional te comparta un expediente, aparecerá aquí para que lo abras sin perder contexto clínico."
          action={
            <Link href="/pacientes" className="btn secondary">
              Ir a pacientes
            </Link>
          }
        />
      )}
    </Card>
  );
}
