"use client";

import { documentTypes, genderOptions, sexOptions } from "@axyscare/core-catalogs";
import type { Patient } from "@axyscare/core-types";
import { patientSchema, type PatientInput } from "@axyscare/core-validation";
import { upsertPatient } from "@axyscare/core-db";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { FormField, FormStatusMessage } from "@/components/forms/form-ui";
import { useAuth } from "@/components/providers/providers";

type PatientFormValues = PatientInput & { allergies: string[] };

export function PatientForm({
  initialPatient,
  onSaved,
}: {
  initialPatient?: Patient | null;
  onSaved?: (patient: Patient) => void;
}) {
  const { client } = useAuth();
  const queryClient = useQueryClient();
  const [serverError, setServerError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const form = useForm<PatientInput>({
    resolver: zodResolver(patientSchema) as any,
    defaultValues: {
      firstName: "",
      lastName: "",
      documentType: "cedula",
      documentNumber: "",
      birthDate: "",
      sex: "femenino",
      gender: "",
      maritalStatus: "",
      occupation: "",
      address: "",
      phone: "",
      email: "",
      bloodType: "",
      allergies: [],
      relevantHistory: "",
      insurance: "",
      emergencyContact: { name: "", relation: "", phone: "" },
    },
  });

  useEffect(() => {
    if (!initialPatient) return;
    form.reset({
      firstName: initialPatient.firstName,
      lastName: initialPatient.lastName,
      documentType: initialPatient.documentType,
      documentNumber: initialPatient.documentNumber,
      birthDate: initialPatient.birthDate,
      sex: initialPatient.sex,
      gender: initialPatient.gender ?? "",
      maritalStatus: initialPatient.maritalStatus ?? "",
      occupation: initialPatient.occupation ?? "",
      address: initialPatient.address ?? "",
      phone: initialPatient.phone ?? "",
      email: initialPatient.email ?? "",
      bloodType: initialPatient.bloodType ?? "",
      allergies: initialPatient.allergies ?? [],
      relevantHistory: initialPatient.relevantHistory ?? "",
      insurance: initialPatient.insurance ?? "",
      emergencyContact: {
        name: initialPatient.emergencyContact?.name ?? "",
        relation: initialPatient.emergencyContact?.relation ?? "",
        phone: initialPatient.emergencyContact?.phone ?? "",
      },
    });
  }, [form, initialPatient]);

  const mutation = useMutation({
    mutationFn: async (values: PatientFormValues) =>
      upsertPatient(client, {
        ...values,
        id: initialPatient?.id,
        allergies: values.allergies,
      }),
    onSuccess: (patient) => {
      setServerError(null);
      setSuccessMessage(initialPatient ? "Paciente actualizado correctamente." : "Paciente creado correctamente.");
      queryClient.invalidateQueries({ queryKey: ["patients"] });
      onSaved?.(patient);
      if (!initialPatient) {
        form.reset();
      }
    },
    onError: (error) => {
      setSuccessMessage(null);
      setServerError(error instanceof Error ? error.message : "No se pudo guardar el paciente.");
    },
  });

  return (
    <form className="stack" onSubmit={form.handleSubmit((values) => mutation.mutate(values as PatientFormValues))}>
      <div className="form-grid">
        <FormField label="Nombres" error={form.formState.errors.firstName?.message}>
          <input {...form.register("firstName")} />
        </FormField>
        <FormField label="Apellidos" error={form.formState.errors.lastName?.message}>
          <input {...form.register("lastName")} />
        </FormField>
        <FormField label="Tipo de documento" error={form.formState.errors.documentType?.message}>
          <select {...form.register("documentType")}>
            {documentTypes.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </FormField>
        <FormField label="Documento" error={form.formState.errors.documentNumber?.message}>
          <input {...form.register("documentNumber")} />
        </FormField>
        <FormField label="Fecha de nacimiento" error={form.formState.errors.birthDate?.message}>
          <input type="date" {...form.register("birthDate")} />
        </FormField>
        <FormField label="Sexo" error={form.formState.errors.sex?.message}>
          <select {...form.register("sex")}>
            {sexOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </FormField>
        <FormField label="Género" error={form.formState.errors.gender?.message}>
          <select {...form.register("gender")}>
            <option value="">Opcional</option>
            {genderOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </FormField>
        <FormField label="Teléfono">
          <input {...form.register("phone")} />
        </FormField>
        <FormField label="Correo del paciente" error={form.formState.errors.email?.message}>
          <input type="email" placeholder="nombre@correo.com" {...form.register("email")} />
        </FormField>
      </div>
      <div className="info-panel">
        <strong>Correo para agenda y Google Calendar</strong>
        <span>
          Si el paciente tiene correo guardado, la agenda lo reflejará automáticamente y Google Calendar podrá enviarle la invitación.
        </span>
      </div>
      <FormField label="Alergias (separadas por coma)">
        <input
          defaultValue={(initialPatient?.allergies ?? []).join(", ")}
          onChange={(event) =>
            form.setValue(
              "allergies",
              event.target.value.split(",").map((item) => item.trim()).filter(Boolean),
            )
          }
        />
      </FormField>
      <FormField label="Antecedentes relevantes">
        <textarea {...form.register("relevantHistory")} />
      </FormField>
      {successMessage ? <FormStatusMessage tone="success" message={successMessage} /> : null}
      {serverError ? <div className="form-error">{serverError}</div> : null}
      <button className="btn" disabled={mutation.isPending}>
        {mutation.isPending ? "Guardando..." : initialPatient ? "Actualizar paciente" : "Crear paciente"}
      </button>
    </form>
  );
}
