"use client";

import { appointmentStatuses, appointmentTypes } from "@axyscare/core-catalogs";
import type { Appointment, Patient } from "@axyscare/core-types";
import { appointmentSchema, type AppointmentInput } from "@axyscare/core-validation";
import { upsertAppointment } from "@axyscare/core-db";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { FormField } from "@/components/forms/form-ui";
import { useAuth } from "@/components/providers/providers";

export function AppointmentForm({
  patients,
  initialAppointment,
  initialRange,
  onSaved,
}: {
  patients: Patient[];
  initialAppointment?: Appointment | null;
  initialRange?: { startAt: string; endAt: string } | null;
  onSaved?: (appointment: Appointment) => void;
}) {
  const { client, user } = useAuth();
  const queryClient = useQueryClient();
  const [serverError, setServerError] = useState<string | null>(null);
  const form = useForm<AppointmentInput>({
    resolver: zodResolver(appointmentSchema),
    defaultValues: {
      patientId: "",
      professionalId: user?.id,
      startAt: initialRange?.startAt ?? "",
      endAt: initialRange?.endAt ?? "",
      reason: "",
      type: "presencial",
      modality: "presencial",
      status: "programada",
      notes: "",
      meetLink: "",
    },
  });

  useEffect(() => {
    if (!initialAppointment) return;
    form.reset({
      patientId: initialAppointment.patientId,
      professionalId: initialAppointment.professionalId,
      startAt: initialAppointment.startAt.slice(0, 16),
      endAt: initialAppointment.endAt.slice(0, 16),
      reason: initialAppointment.reason,
      type: initialAppointment.type,
      modality: initialAppointment.modality,
      status: initialAppointment.status,
      notes: initialAppointment.notes ?? "",
      meetLink: initialAppointment.meetLink ?? "",
    });
  }, [form, initialAppointment]);

  useEffect(() => {
    if (!initialRange || initialAppointment) return;
    form.setValue("startAt", initialRange.startAt.slice(0, 16));
    form.setValue("endAt", initialRange.endAt.slice(0, 16));
  }, [form, initialAppointment, initialRange]);

  const mutation = useMutation({
    mutationFn: (values: AppointmentInput) =>
      upsertAppointment(client, {
        ...values,
        id: initialAppointment?.id,
        professionalId: user?.id,
        startAt: new Date(values.startAt).toISOString(),
        endAt: new Date(values.endAt).toISOString(),
      }),
    onSuccess: (appointment) => {
      setServerError(null);
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      onSaved?.(appointment);
    },
    onError: (error) => {
      setServerError(error instanceof Error ? error.message : "No se pudo guardar la cita.");
    },
  });

  return (
    <form className="stack" onSubmit={form.handleSubmit((values) => mutation.mutate(values))}>
      <div className="form-grid">
        <FormField label="Paciente" error={form.formState.errors.patientId?.message}>
          <select {...form.register("patientId")}>
            <option value="">Selecciona</option>
            {patients.map((patient) => (
              <option key={patient.id} value={patient.id}>
                {patient.firstName} {patient.lastName}
              </option>
            ))}
          </select>
        </FormField>
        <FormField label="Tipo">
          <select {...form.register("type")}>
            {appointmentTypes.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </FormField>
        <FormField label="Inicio" error={form.formState.errors.startAt?.message}>
          <input type="datetime-local" {...form.register("startAt")} />
        </FormField>
        <FormField label="Fin" error={form.formState.errors.endAt?.message}>
          <input type="datetime-local" {...form.register("endAt")} />
        </FormField>
        <FormField label="Modalidad">
          <select {...form.register("modality")}>
            <option value="presencial">Presencial</option>
            <option value="virtual">Virtual</option>
            <option value="domicilio">Domicilio</option>
          </select>
        </FormField>
        <FormField label="Estado">
          <select {...form.register("status")}>
            {appointmentStatuses.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </FormField>
      </div>
      <FormField label="Motivo" error={form.formState.errors.reason?.message}>
        <textarea {...form.register("reason")} />
      </FormField>
      <FormField label="Link de Meet">
        <input {...form.register("meetLink")} />
      </FormField>
      <FormField label="Notas">
        <textarea {...form.register("notes")} />
      </FormField>
      {serverError ? <div className="form-error">{serverError}</div> : null}
      <button className="btn" disabled={mutation.isPending}>
        {mutation.isPending ? "Guardando..." : initialAppointment ? "Actualizar cita" : "Crear cita"}
      </button>
    </form>
  );
}

