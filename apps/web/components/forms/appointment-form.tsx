"use client";

import { appointmentStatuses, appointmentTypes } from "@axyscare/core-catalogs";
import type { Appointment, Patient } from "@axyscare/core-types";
import { appointmentSchema, type AppointmentInput } from "@axyscare/core-validation";
import { getProfessionalSettings, upsertAppointment } from "@axyscare/core-db";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { FormField, FormStatusMessage } from "@/components/forms/form-ui";
import { trackUIEvent } from "@/lib/client-analytics";
import { useAuth, useUI } from "@/components/providers/providers";

function formatGoogleCalendarDate(value: string) {
  return new Date(value).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

function buildGoogleCalendarUrl(params: {
  title: string;
  details?: string;
  startAt: string;
  endAt: string;
  location?: string;
}) {
  const search = new URLSearchParams({
    action: "TEMPLATE",
    text: params.title,
    details: params.details ?? "",
    dates: `${formatGoogleCalendarDate(params.startAt)}/${formatGoogleCalendarDate(params.endAt)}`,
  });

  if (params.location) {
    search.set("location", params.location);
  }

  return `https://calendar.google.com/calendar/render?${search.toString()}`;
}

export function AppointmentForm({
  patients,
  initialAppointment,
  initialRange,
  initialValues,
  onSaved,
}: {
  patients: Patient[];
  initialAppointment?: Appointment | null;
  initialRange?: { startAt: string; endAt: string } | null;
  initialValues?: Partial<AppointmentInput>;
  onSaved?: (appointment: Appointment) => void;
}) {
  const { client, user } = useAuth();
  const { notify } = useUI();
  const queryClient = useQueryClient();
  const [serverError, setServerError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const form = useForm<AppointmentInput>({
    resolver: zodResolver(appointmentSchema),
    defaultValues: {
      patientId: initialValues?.patientId ?? "",
      professionalId: user?.id,
      startAt: initialRange?.startAt ?? "",
      endAt: initialRange?.endAt ?? "",
      reason: initialValues?.reason ?? "",
      type: initialValues?.type ?? "presencial",
      modality: initialValues?.modality ?? "presencial",
      status: initialValues?.status ?? "programada",
      notes: initialValues?.notes ?? "",
      meetLink: initialValues?.meetLink ?? "",
    },
  });
  const settingsQuery = useQuery({
    queryKey: ["professional-settings", user?.id],
    queryFn: () => getProfessionalSettings(client, user!.id),
    enabled: Boolean(user?.id),
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

  useEffect(() => {
    if (initialAppointment || !initialValues) return;
    if (initialValues.patientId) {
      form.setValue("patientId", initialValues.patientId);
    }
    if (initialValues.reason) {
      form.setValue("reason", initialValues.reason);
    }
    if (initialValues.type) {
      form.setValue("type", initialValues.type);
    }
    if (initialValues.modality) {
      form.setValue("modality", initialValues.modality);
    }
    if (initialValues.status) {
      form.setValue("status", initialValues.status);
    }
    if (initialValues.notes) {
      form.setValue("notes", initialValues.notes);
    }
    if (initialValues.meetLink) {
      form.setValue("meetLink", initialValues.meetLink);
    }
  }, [form, initialAppointment, initialValues]);

  const mutation = useMutation({
    mutationFn: (values: AppointmentInput) =>
      upsertAppointment(client, {
        ...values,
        id: initialAppointment?.id,
        professionalId: user?.id,
        startAt: new Date(values.startAt).toISOString(),
        endAt: new Date(values.endAt).toISOString(),
      }),
    onSuccess: async (appointment) => {
      setServerError(null);
      setSuccessMessage(initialAppointment ? "Cita actualizada correctamente." : "Cita creada correctamente.");
      notify({
        tone: "success",
        message: initialAppointment ? "Cita actualizada." : "Cita creada y lista para seguimiento.",
      });
      trackUIEvent(initialAppointment ? "appointment_update" : "appointment_create", appointment.id);
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      if (settingsQuery.data?.googleCalendarConnected) {
        const response = await fetch("/api/google-calendar/sync", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ appointmentId: appointment.id }),
        });

        if (!response.ok) {
          const payload = (await response.json()) as { error?: string };
          const message = payload.error ?? "La cita se guardó, pero no se pudo sincronizar con Google Calendar.";
          setServerError(message);
          setSuccessMessage("La cita se guardó, pero la sincronización con Google Calendar falló.");
          notify({ tone: "error", message });
        } else {
          queryClient.invalidateQueries({ queryKey: ["appointments"] });
          setSuccessMessage("Cita guardada y sincronizada con Google Calendar.");
          notify({ tone: "info", message: "Cita sincronizada con Google Calendar." });
        }
      }
      onSaved?.(appointment);
    },
    onError: (error) => {
      setSuccessMessage(null);
      const message = error instanceof Error ? error.message : "No se pudo guardar la cita.";
      setServerError(message);
      notify({ tone: "error", message });
    },
  });

  const watchedPatientId = form.watch("patientId");
  const watchedStartAt = form.watch("startAt");
  const watchedEndAt = form.watch("endAt");
  const watchedReason = form.watch("reason");
  const watchedModality = form.watch("modality");
  const selectedPatient = patients.find((patient) => patient.id === watchedPatientId) ?? null;
  const googleCalendarUrl = useMemo(() => {
    if (!watchedStartAt || !watchedEndAt || !watchedReason || !selectedPatient) return null;

    const title = `${watchedReason} · ${selectedPatient.firstName} ${selectedPatient.lastName}`;
    const details = [
      `Paciente: ${selectedPatient.firstName} ${selectedPatient.lastName}`,
      `Documento: ${selectedPatient.documentNumber}`,
      selectedPatient.email ? `Correo del paciente: ${selectedPatient.email}` : "",
      `Modalidad: ${watchedModality}`,
    ]
      .filter(Boolean)
      .join("\n");

    return buildGoogleCalendarUrl({
      title,
      details,
      startAt: watchedStartAt,
      endAt: watchedEndAt,
      location: watchedModality === "virtual" ? "Teleconsulta Axyscare" : undefined,
    });
  }, [watchedEndAt, watchedModality, watchedReason, watchedStartAt, selectedPatient]);

  return (
    <form className="stack" onSubmit={form.handleSubmit((values) => mutation.mutate(values))}>
      <div className="form-grid">
        <FormField
          label="Paciente"
          error={form.formState.errors.patientId?.message}
          helper="El contexto del paciente facilitará abrir la ficha o invitar por Calendar."
        >
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
        <FormField label="Inicio" error={form.formState.errors.startAt?.message} helper="Hora en la que inicia el bloque clínico.">
          <input type="datetime-local" {...form.register("startAt")} />
        </FormField>
        <FormField label="Fin" error={form.formState.errors.endAt?.message} helper="Incluye margen realista para evitar solapamientos.">
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
      <FormField label="Correo del paciente">
        <input value={selectedPatient?.email ?? ""} readOnly placeholder="El paciente no tiene correo registrado" />
      </FormField>
      {googleCalendarUrl ? (
        <div className="info-panel">
          <strong>Google Calendar</strong>
          <span>
            {settingsQuery.data?.googleCalendarConnected
              ? selectedPatient?.email
                ? "Tu cuenta ya está conectada. Al guardar la cita se sincronizará con Google Calendar, el paciente irá como invitado y Google enviará la notificación a su correo."
                : "Tu cuenta ya está conectada. La cita se sincronizará con Google Calendar, pero el paciente no recibirá invitación hasta que tenga un correo registrado."
              : "Con la fecha y hora actuales ya puedes generar el evento con recordatorio desde Google Calendar."}
          </span>
          <a href={googleCalendarUrl} target="_blank" rel="noreferrer" className="pill-link">
            {settingsQuery.data?.googleCalendarConnected ? "Abrir en Google Calendar" : "Agregar a Google Calendar"}
          </a>
        </div>
      ) : null}
      <FormField label="Notas">
        <textarea {...form.register("notes")} />
      </FormField>
      {mutation.isPending ? <FormStatusMessage tone="loading" message="Guardando cita y preparando continuidad..." /> : null}
      {successMessage ? <FormStatusMessage tone="success" message={successMessage} /> : null}
      {serverError ? <div className="form-error">{serverError}</div> : null}
      <button className="btn" disabled={mutation.isPending}>
        {mutation.isPending ? "Guardando..." : initialAppointment ? "Actualizar cita" : "Crear cita"}
      </button>
    </form>
  );
}
