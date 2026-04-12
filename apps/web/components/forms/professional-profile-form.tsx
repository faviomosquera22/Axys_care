"use client";

import { specialties } from "@axyscare/core-catalogs";
import type { Profile } from "@axyscare/core-types";
import { getProfile, upsertProfile } from "@axyscare/core-db";
import { professionalProfileSchema, type ProfessionalProfileInput } from "@axyscare/core-validation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { Card, SectionHeading } from "@axyscare/ui-shared";
import { FormField, FormStatusMessage } from "@/components/forms/form-ui";
import { SignatureField } from "@/components/forms/signature-field";
import { useAuth } from "@/components/providers/providers";

function buildSealDataUrl({
  firstName,
  lastName,
  profession,
  specialty,
  professionalLicense,
}: {
  firstName: string;
  lastName: string;
  profession: string;
  specialty?: string | null;
  professionalLicense: string;
}) {
  const issuedAt = new Intl.DateTimeFormat("es-EC", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date());
  const lines = [
    `${firstName} ${lastName}`.trim() || "Profesional",
    specialty ? `${profession} · ${specialty}` : profession || "Profesión",
    `Registro: ${professionalLicense || "PENDIENTE"}`,
    `Fecha: ${issuedAt}`,
  ];
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="720" height="240" viewBox="0 0 720 240">
      <rect x="10" y="10" width="700" height="220" rx="28" fill="#fffaf4" stroke="#8f5a3c" stroke-width="6" />
      <rect x="26" y="26" width="668" height="188" rx="20" fill="none" stroke="#156669" stroke-width="2" stroke-dasharray="10 8" />
      <text x="360" y="82" text-anchor="middle" font-size="34" font-family="Georgia, serif" fill="#211b16">${lines[0]}</text>
      <text x="360" y="122" text-anchor="middle" font-size="24" font-family="Georgia, serif" fill="#156669">${lines[1]}</text>
      <text x="360" y="158" text-anchor="middle" font-size="22" font-family="Georgia, serif" fill="#5d5247">${lines[2]}</text>
      <text x="360" y="192" text-anchor="middle" font-size="20" font-family="Georgia, serif" fill="#5d5247">${lines[3]}</text>
    </svg>
  `;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

export function ProfessionalProfileForm() {
  const { client, user } = useAuth();
  const [serverError, setServerError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
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
    onSuccess: () => {
      setServerError(null);
      setSuccessMessage("Perfil profesional guardado correctamente.");
    },
    onError: (error) => {
      setSuccessMessage(null);
      setServerError(error instanceof Error ? error.message : "No se pudo guardar el perfil.");
    },
  });

  const watchedFirstName = form.watch("firstName");
  const watchedLastName = form.watch("lastName");
  const watchedRole = form.watch("role");
  const watchedProfession = form.watch("profession");
  const watchedSpecialty = form.watch("specialty");
  const watchedLicense = form.watch("professionalLicense");
  const persistedProfile = profileQuery.data as Profile | null | undefined;
  const isProfessionLocked = Boolean(persistedProfile?.profession?.trim() && persistedProfile.role);

  useEffect(() => {
    if (isProfessionLocked) return;

    if (watchedRole === "medico" && form.getValues("profession") !== "Medicina General") {
      form.setValue("profession", "Medicina General", { shouldDirty: true });
    }

    if (watchedRole === "enfermeria") {
      if (form.getValues("profession") !== "Enfermería") {
        form.setValue("profession", "Enfermería", { shouldDirty: true });
      }

      if (!form.getValues("specialty")) {
        form.setValue("specialty", "Enfermería clínica", { shouldDirty: true });
      }
    }

    if (watchedRole === "psicologo") {
      if (form.getValues("profession") !== "Psicología") {
        form.setValue("profession", "Psicología", { shouldDirty: true });
      }

      if (!form.getValues("specialty")) {
        form.setValue("specialty", "Psicología clínica", { shouldDirty: true });
      }
    }

    if (watchedRole === "profesional_mixto" && form.getValues("profession") !== "Profesional mixto") {
      form.setValue("profession", "Profesional mixto", { shouldDirty: true });
    }

    if (watchedRole === "admin" && form.getValues("profession") !== "Administración clínica") {
      form.setValue("profession", "Administración clínica", { shouldDirty: true });
    }
  }, [form, isProfessionLocked, watchedRole]);

  const sealPreview = useMemo(
    () =>
      buildSealDataUrl({
        firstName: watchedFirstName,
        lastName: watchedLastName,
        profession: watchedProfession,
        specialty: watchedSpecialty,
        professionalLicense: watchedLicense,
      }),
    [watchedFirstName, watchedLastName, watchedProfession, watchedSpecialty, watchedLicense],
  );

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
            <select {...form.register("role")} disabled={isProfessionLocked}>
              <option value="admin">admin</option>
              <option value="medico">medico</option>
              <option value="psicologo">psicologo</option>
              <option value="enfermeria">enfermeria</option>
              <option value="profesional_mixto">profesional_mixto</option>
            </select>
          </FormField>
          <FormField label="Profesión">
            <input
              {...form.register("profession")}
              readOnly
            />
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
        <FormField label="Ciudad">
          <input {...form.register("city")} />
        </FormField>
        <FormField label="Firma">
          <SignatureField value={form.watch("signatureUrl")} onChange={(value) => form.setValue("signatureUrl", value ?? "")} />
        </FormField>
        <FormField label="Sello profesional">
          <div className="stack">
            <div className="seal-card">
              <img src={form.watch("sealUrl") || sealPreview} alt="Sello profesional" className="seal-preview" />
            </div>
            <div className="btn-row">
              <button
                type="button"
                className="btn secondary"
                onClick={() => form.setValue("sealUrl", sealPreview)}
              >
                Generar sello automático
              </button>
              <label className="btn secondary">
                Subir sello PNG
                <input
                  type="file"
                  accept="image/png"
                  style={{ display: "none" }}
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (!file) return;
                    const reader = new FileReader();
                    reader.onload = () => form.setValue("sealUrl", String(reader.result ?? ""));
                    reader.readAsDataURL(file);
                  }}
                />
              </label>
            </div>
          </div>
        </FormField>
        <FormField label="Biografía corta">
          <textarea {...form.register("shortBio")} />
        </FormField>
        {watchedRole === "enfermeria" ? (
          <div className="info-panel">
            <strong>Perfil de enfermería</strong>
            <span>La profesión se fija automáticamente como Enfermería para mantener consistencia con el rol clínico.</span>
          </div>
        ) : null}
        {watchedRole === "psicologo" ? (
          <div className="info-panel">
            <strong>Perfil de psicología</strong>
            <span>La profesión se fija automáticamente como Psicología para activar el flujo clínico orientado a salud mental.</span>
          </div>
        ) : null}
        {isProfessionLocked ? (
          <div className="info-panel">
            <strong>Profesión bloqueada</strong>
            <span>
              Este profesional ya fue dado de alta como {persistedProfile?.profession}. Para evitar inconsistencias clínicas, el rol y la profesión ya no se pueden cambiar.
            </span>
          </div>
        ) : null}
        {successMessage ? <FormStatusMessage tone="success" message={successMessage} /> : null}
        {serverError ? <div className="form-error">{serverError}</div> : null}
        <button className="btn" disabled={mutation.isPending || !user}>
          {mutation.isPending ? "Guardando..." : "Guardar perfil"}
        </button>
      </form>
    </Card>
  );
}
