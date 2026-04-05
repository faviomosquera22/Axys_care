"use client";

import type { PatientAccess } from "@axyscare/core-types";
import { listPatientAccess, removeSharedPatientFromMyList, revokePatientAccess, searchProfessionals, sharePatient } from "@axyscare/core-db";
import { patientShareSchema } from "@axyscare/core-validation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useDeferredValue, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { Card, SectionHeading, StatusBadge } from "@axyscare/ui-shared";
import { FormField } from "@/components/forms/form-ui";
import { useAuth } from "@/components/providers/providers";
import { usePatientRealtime } from "@/components/realtime/use-patient-realtime";

export function PatientSharePanel({
  patientId,
  ownerUserId,
}: {
  patientId: string;
  ownerUserId: string;
}) {
  const { client, user } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const isOwner = user?.id === ownerUserId;

  usePatientRealtime(patientId, [
    ["patient-access", patientId],
    ["patients-shared-with-me"],
    ["patients-shared-by-me"],
  ]);

  const accessQuery = useQuery({
    queryKey: ["patient-access", patientId],
    queryFn: () => listPatientAccess(client, patientId),
  });

  const professionalsQuery = useQuery({
    queryKey: ["professional-search", deferredSearch],
    queryFn: () => searchProfessionals(client, deferredSearch),
    enabled: deferredSearch.trim().length >= 2 && isOwner,
  });

  const form = useForm<any>({
    resolver: zodResolver(patientShareSchema) as any,
    defaultValues: {
      patientId,
      sharedWithUserId: "",
      permissionLevel: "read",
      status: "active",
      expiresAt: null,
    },
  });

  const selectedProfessional = useMemo(
    () => professionalsQuery.data?.find((item) => item.id === form.watch("sharedWithUserId")) ?? null,
    [form, professionalsQuery.data],
  );

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["patient-access", patientId] });
    queryClient.invalidateQueries({ queryKey: ["patients-shared-with-me"] });
    queryClient.invalidateQueries({ queryKey: ["patients-shared-by-me"] });
    queryClient.invalidateQueries({ queryKey: ["patients"] });
  };

  const shareMutation = useMutation({
    mutationFn: async (values: any) =>
      sharePatient(client, {
        ...values,
        expiresAt: values.expiresAt || null,
      }),
    onSuccess: () => {
      form.reset({
        patientId,
        sharedWithUserId: "",
        permissionLevel: "read",
        status: "active",
        expiresAt: null,
      });
      setSearch("");
      refresh();
    },
  });

  const revokeMutation = useMutation({
    mutationFn: (accessId: string) => revokePatientAccess(client, accessId),
    onSuccess: refresh,
  });

  const removeMutation = useMutation({
    mutationFn: (accessId: string) => removeSharedPatientFromMyList(client, accessId),
    onSuccess: refresh,
  });

  const myAccess = (accessQuery.data ?? []).find((item) => item.sharedWithUserId === user?.id);

  return (
    <Card>
      <SectionHeading
        title="Colaboración clínica"
        description="Privado por defecto. El registro maestro sigue siendo único."
      />

      {isOwner ? (
        <form
          className="stack"
          onSubmit={form.handleSubmit((values) => shareMutation.mutate({ ...values, patientId }))}
        >
          <div className="form-grid">
            <FormField label="Buscar profesional">
              <input
                placeholder="Correo, nombre o profesión"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </FormField>
            <FormField label="Permiso">
              <select {...form.register("permissionLevel")}>
                <option value="read">read</option>
                <option value="edit">edit</option>
              </select>
            </FormField>
          </div>

          <div className="stack">
            {(professionalsQuery.data ?? []).map((professional) => (
              <button
                key={professional.id}
                type="button"
                className={`picker-row ${selectedProfessional?.id === professional.id ? "selected" : ""}`}
                onClick={() => form.setValue("sharedWithUserId", professional.id)}
              >
                <strong>
                  {professional.firstName} {professional.lastName}
                </strong>
                <span>
                  {professional.profession} · {professional.email}
                </span>
              </button>
            ))}
          </div>

          <FormField label="Expira el">
            <input
              type="datetime-local"
              onChange={(event) =>
                form.setValue(
                  "expiresAt",
                  event.target.value ? new Date(event.target.value).toISOString() : null,
                )
              }
            />
          </FormField>

          {shareMutation.error ? (
            <div className="form-error">
              {shareMutation.error instanceof Error ? shareMutation.error.message : "No se pudo compartir."}
            </div>
          ) : null}

          <button className="btn" disabled={shareMutation.isPending || !form.watch("sharedWithUserId")}>
            {shareMutation.isPending ? "Compartiendo..." : "Compartir paciente"}
          </button>
        </form>
      ) : myAccess ? (
        <div className="stack">
          <div className="meta-strip">
            <strong>Mi acceso</strong>
            <span>
              {myAccess.permissionLevel} · {myAccess.status}
            </span>
          </div>
          <button
            className="btn ghost"
            onClick={() => removeMutation.mutate(myAccess.id)}
            disabled={removeMutation.isPending}
          >
            {removeMutation.isPending ? "Quitando..." : "Quitar de mi lista"}
          </button>
        </div>
      ) : null}

      <div className="stack" style={{ marginTop: 18 }}>
        {(accessQuery.data ?? []).map((access: PatientAccess) => (
          <div key={access.id} className="trace-row">
            <div>
              <strong>
                {access.sharedWithProfile
                  ? `${access.sharedWithProfile.firstName} ${access.sharedWithProfile.lastName}`
                  : access.sharedWithUserId}
              </strong>
              <p>
                {access.permissionLevel} · {access.createdByName ?? "Sin autor"} ·{" "}
                {access.createdAt ? new Date(access.createdAt).toLocaleString() : "sin fecha"}
              </p>
            </div>
            <div className="btn-row">
              <StatusBadge
                label={access.status}
                tone={access.status === "active" ? "success" : access.status === "pending" ? "warning" : "danger"}
              />
              {isOwner && access.status === "active" ? (
                <button
                  className="btn ghost"
                  type="button"
                  onClick={() => revokeMutation.mutate(access.id)}
                  disabled={revokeMutation.isPending}
                >
                  Revocar
                </button>
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
