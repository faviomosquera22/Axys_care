"use client";

import { specialties } from "@axyscare/core-catalogs";
import type { Profile } from "@axyscare/core-types";
import { getProfile, upsertProfile } from "@axyscare/core-db";
import { professionalProfileSchema, type ProfessionalProfileInput } from "@axyscare/core-validation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { Card, SectionHeading } from "@axyscare/ui-shared";
import { FormField } from "@/components/forms/form-ui";
import { SignatureField } from "@/components/forms/signature-field";
import { useAuth } from "@/components/providers/providers";

export function ProfessionalProfileForm() {
  const { client, user } = useAuth();
  const [serverError, setServerError] = useState<string | null>(null);
  const profileQuery = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: () => getProfile(client, user!.id),
    enabled: Boolean(user?.id),
  });

  const form = useForm<ProfessionalProfileInput>({
    resolver: zodResolver(professionalProfileSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      role: "medico",
      profession: "",
      specialty: "",
      professionalLicense: "",
      phone: "",
      email: user?.email ?? "",
      professionalAddress: "",
      city: "",
      shortBio: "",
      signatureUrl: "",
      sealUrl: "",
      logoUrl: "",
      avatarUrl: "",
    },
  });

  useEffect(() => {
    const profile = profileQuery.data as Profile | null | undefined;
    if (!profile) return;
    form.reset({
      firstName: profile.firstName,
      lastName: profile.lastName,
      role: profile.role,
      profession: profile.profession,
      specialty: profile.specialty ?? "",
      professionalLicense: profile.professionalLicense,
      phone: profile.phone ?? "",
      email: profile.email,
      professionalAddress: profile.professionalAddress ?? "",
      city: profile.city ?? "",
      shortBio: profile.shortBio ?? "",
      signatureUrl: profile.signatureUrl ?? "",
      sealUrl: profile.sealUrl ?? "",
      logoUrl: profile.logoUrl ?? "",
      avatarUrl: profile.avatarUrl ?? "",
    });
  }, [form, profileQuery.data]);

  const mutation = useMutation({
    mutationFn: (values: ProfessionalProfileInput) => upsertProfile(client, { ...values, id: user!.id }),
    onSuccess: () => setServerError(null),
    onError: (error) => {
      setServerError(error instanceof Error ? error.message : "No se pudo guardar el perfil.");
    },
  });

  return (
    <Card>
      <SectionHeading
        title="Perfil profesional"
        description="Datos usados en atención, impresión y trazabilidad clínica."
      />
      <form className="stack" onSubmit={form.handleSubmit((values) => mutation.mutate(values))}>
        <div className="form-grid">
          <FormField label="Nombres" error={form.formState.errors.firstName?.message}>
            <input {...form.register("firstName")} />
          </FormField>
          <FormField label="Apellidos" error={form.formState.errors.lastName?.message}>
            <input {...form.register("lastName")} />
          </FormField>
          <FormField label="Rol">
            <select {...form.register("role")}>
              <option value="admin">admin</option>
              <option value="medico">medico</option>
              <option value="enfermeria">enfermeria</option>
              <option value="profesional_mixto">profesional_mixto</option>
            </select>
          </FormField>
          <FormField label="Profesión">
            <input {...form.register("profession")} />
          </FormField>
          <FormField label="Especialidad">
            <select {...form.register("specialty")}>
              <option value="">Selecciona</option>
              {specialties.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </FormField>
          <FormField label="Registro profesional">
            <input {...form.register("professionalLicense")} />
          </FormField>
          <FormField label="Correo">
            <input type="email" {...form.register("email")} />
          </FormField>
          <FormField label="Teléfono">
            <input {...form.register("phone")} />
          </FormField>
        </div>
        <FormField label="Dirección profesional">
          <input {...form.register("professionalAddress")} />
        </FormField>
        <FormField label="Firma">
          <SignatureField value={form.watch("signatureUrl")} onChange={(value) => form.setValue("signatureUrl", value ?? "")} />
        </FormField>
        <FormField label="Biografía corta">
          <textarea {...form.register("shortBio")} />
        </FormField>
        {serverError ? <div className="form-error">{serverError}</div> : null}
        <button className="btn" disabled={mutation.isPending || !user}>
          {mutation.isPending ? "Guardando..." : "Guardar perfil"}
        </button>
      </form>
    </Card>
  );
}

