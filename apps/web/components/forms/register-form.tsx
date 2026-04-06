"use client";

import { loginSchema } from "@axyscare/core-validation";
import { isSupabaseConfigured, signUpWithPassword } from "@axyscare/core-db";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { FormField } from "@/components/forms/form-ui";
import { useAuth } from "@/components/providers/providers";

const registerSchema = loginSchema.extend({
  confirmPassword: z.string().min(8),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Las contraseñas no coinciden.",
  path: ["confirmPassword"],
});

type RegisterInput = z.infer<typeof registerSchema>;

export function RegisterForm() {
  const { client } = useAuth();
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const form = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: { email: "", password: "", confirmPassword: "" },
  });

  return (
    <form
      className="stack"
      onSubmit={form.handleSubmit(async ({ email, password }) => {
        setServerError(null);
        setSuccessMessage(null);
        if (!isSupabaseConfigured()) {
          setServerError("Configura las variables de Supabase antes de registrar usuarios.");
          return;
        }

        try {
          const result = await signUpWithPassword(client, { email, password });

          if (result.session) {
            router.push("/dashboard");
            return;
          }

          setSuccessMessage("Cuenta creada. Revisa tu correo para confirmar el acceso antes de iniciar sesión.");
          form.reset();
        } catch (error) {
          setServerError(error instanceof Error ? error.message : "No se pudo registrar.");
        }
      })}
    >
      <FormField label="Correo" error={form.formState.errors.email?.message}>
        <input type="email" {...form.register("email")} />
      </FormField>
      <FormField label="Contraseña" error={form.formState.errors.password?.message}>
        <input type="password" {...form.register("password")} />
      </FormField>
      <FormField label="Confirmar contraseña" error={form.formState.errors.confirmPassword?.message}>
        <input type="password" {...form.register("confirmPassword")} />
      </FormField>
      {successMessage ? <div className="form-success">{successMessage}</div> : null}
      {serverError ? <div className="form-error">{serverError}</div> : null}
      <button className="btn" disabled={form.formState.isSubmitting}>
        {form.formState.isSubmitting ? "Creando..." : "Crear cuenta"}
      </button>
      <p className="muted">
        ¿Ya tienes acceso? <Link href="/login" className="pill-link">Inicia sesión</Link>
      </p>
    </form>
  );
}
