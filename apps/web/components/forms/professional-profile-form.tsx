"use client";

import { specialties } from "@axyscare/core-catalogs";
import type { Profile } from "@axyscare/core-types";
import { getProfile, upsertProfile } from "@axyscare/core-db";
import { professionalProfileSchema, type ProfessionalProfileInput } from "@axyscare/core-validation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { Card, SectionHeading } from "@axyscare/ui-shared";
import { FormField, FormStatusMessage } from "@/components/forms/form-ui";
import { useAuth } from "@/components/providers/providers";

const genericProfessions = new Set(["", "Profesional", "Pendiente"]);

const professionSuggestionsByRole: Record<ProfessionalProfileInput["role"], string[]> = {
  admin: ["Administración clínica", "Coordinación clínica", "Gestión operativa"],
  medico: ["Medicina General", "Medicina Interna", "Pediatría", "Ginecología", "Medicina Familiar"],
  psicologo: ["Psicología", "Psicología clínica", "Psicología infantil", "Neuropsicología"],
  enfermeria: ["Enfermería", "Licenciatura en Enfermería", "Enfermería clínica", "Enfermería comunitaria"],
  nutricion: ["Nutrición", "Nutrición clínica", "Nutrición deportiva", "Nutrición pediátrica"],
  profesional_mixto: ["Profesional mixto", "Atención integral", "Coordinación clínica"],
};

function isPlaceholderProfession(value?: string | null) {
  return genericProfessions.has((value ?? "").trim());
}

export function ProfessionalProfileForm() {
  const { client, user } = useAuth();
  const queryClient = useQueryClient();
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
    onSuccess: (profile) => {
      setServerError(null);
      setSuccessMessage("Perfil profesional guardado correctamente.");
      queryClient.setQueryData(["profile", user?.id], profile);
      queryClient.invalidateQueries({ queryKey: ["profile", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["profile", "shell", user?.id] });
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
  const watchedCity = form.watch("city");
  const persistedProfile = profileQuery.data as Profile | null | undefined;
  const roleProfessionOptions = professionSuggestionsByRole[watchedRole] ?? [];
  const isProfessionLocked = Boolean(
    persistedProfile?.role && persistedProfile.profession?.trim() && !isPlaceholderProfession(persistedProfile.profession),
  );

  useEffect(() => {
    if (isProfessionLocked) return;

    if (watchedRole === "medico" && isPlaceholderProfession(form.getValues("profession"))) {
      form.setValue("profession", "Medicina General", { shouldDirty: true });
    }

    if (watchedRole === "enfermeria") {
      if (isPlaceholderProfession(form.getValues("profession"))) {
        form.setValue("profession", "Enfermería", { shouldDirty: true });
      }

      if (!form.getValues("specialty")) {
        form.setValue("specialty", "Enfermería clínica", { shouldDirty: true });
      }
    }

    if (watchedRole === "psicologo") {
      if (isPlaceholderProfession(form.getValues("profession"))) {
        form.setValue("profession", "Psicología", { shouldDirty: true });
      }

      if (!form.getValues("specialty")) {
        form.setValue("specialty", "Psicología clínica", { shouldDirty: true });
      }
    }

    if (watchedRole === "nutricion") {
      if (isPlaceholderProfession(form.getValues("profession"))) {
        form.setValue("profession", "Nutrición", { shouldDirty: true });
      }

      if (!form.getValues("specialty")) {
        form.setValue("specialty", "Nutrición clínica", { shouldDirty: true });
      }
    }

    if (watchedRole === "profesional_mixto" && isPlaceholderProfession(form.getValues("profession"))) {
      form.setValue("profession", "Profesional mixto", { shouldDirty: true });
    }

    if (watchedRole === "admin" && isPlaceholderProfession(form.getValues("profession"))) {
      form.setValue("profession", "Administración clínica", { shouldDirty: true });
    }
  }, [form, isProfessionLocked, watchedRole]);

  const professionalClosingPreview = useMemo(
    () => [
      `${watchedFirstName || "Nombre"} ${watchedLastName || "Apellido"}`.trim(),
      [watchedProfession || "Profesión", watchedSpecialty || ""].filter(Boolean).join(" · "),
      `Cédula: ${watchedLicense || "Pendiente"}`,
      `Registro profesional: ${watchedLicense || "Pendiente"}`,
      `Fecha de emisión: ${new Date().toLocaleDateString()}`,
      watchedCity ? `Ciudad: ${watchedCity}` : "",
    ].filter(Boolean),
    [watchedFirstName, watchedLastName, watchedProfession, watchedSpecialty, watchedLicense, watchedCity],
  );

  return (
    <Card>
      <SectionHeading
        title="Perfil profesional"
        description="Datos usados en atención, impresión y trazabilidad clínica."
      />
      <form
        className="stack"
        onSubmit={form.handleSubmit((values) =>
          mutation.mutate({
            ...values,
            signatureUrl: "",
            sealUrl: "",
          }),
        )}
      >
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
              <option value="nutricion">nutricion</option>
              <option value="profesional_mixto">profesional_mixto</option>
            </select>
          </FormField>
          <FormField label="Profesión">
            <input
              {...form.register("profession")}
              list="profession-suggestions"
              readOnly={isProfessionLocked}
            />
            <datalist id="profession-suggestions">
              {roleProfessionOptions.map((option) => (
                <option key={option} value={option} />
              ))}
            </datalist>
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
        <div className="profile-form-actions">
          <div className="profile-form-actions__copy">
            <strong>Identidad profesional</strong>
            <span>
              {isProfessionLocked
                ? `La profesión quedó confirmada como ${persistedProfile?.profession}.`
                : "Puedes escoger o escribir una profesión y guardarla desde aquí."}
            </span>
          </div>
          <button className="btn" disabled={mutation.isPending || !user}>
            {mutation.isPending ? "Guardando..." : "Guardar perfil profesional"}
          </button>
        </div>
        <FormField label="Dirección profesional">
          <input {...form.register("professionalAddress")} />
        </FormField>
        <FormField label="Ciudad">
          <input {...form.register("city")} />
        </FormField>
        <FormField
          label="Cierre profesional"
          helper="Este bloque se insertará automáticamente en la última hoja del PDF o Word descargado."
        >
          <div className="info-panel">
            <strong>Vista previa del cierre</strong>
            <span>
              {professionalClosingPreview.map((line) => (
                <span key={line} style={{ display: "block" }}>
                  {line}
                </span>
              ))}
            </span>
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
        {watchedRole === "nutricion" ? (
          <div className="info-panel">
            <strong>Perfil de nutrición</strong>
            <span>La profesión se fija automáticamente como Nutrición para mantener el flujo de evaluación, diagnóstico alimentario y plan nutricional.</span>
          </div>
        ) : null}
        {isProfessionLocked ? (
          <div className="info-panel">
            <strong>Profesión bloqueada</strong>
            <span>
              Este profesional ya fue confirmado como {persistedProfile?.profession}. Si necesitas cambiarlo después, habría que hacerlo como ajuste administrativo controlado.
            </span>
          </div>
        ) : null}
        {successMessage ? <FormStatusMessage tone="success" message={successMessage} /> : null}
        {serverError ? <div className="form-error">{serverError}</div> : null}
      </form>
    </Card>
  );
}
