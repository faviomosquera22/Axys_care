"use client";

import { loginSchema, type LoginInput } from "@axyscare/core-validation";
import { isSupabaseConfigured, signInWithPassword } from "@axyscare/core-db";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { FormField } from "@/components/forms/form-ui";
import { useAuth } from "@/components/providers/providers";

export function LoginForm() {
  const { client } = useAuth();
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  return (
    <form
      className="stack"
      onSubmit={form.handleSubmit(async (values) => {
        setServerError(null);
        if (!isSupabaseConfigured()) {
          setServerError("Configura las variables de Supabase antes de iniciar sesión.");
          return;
        }

        try {
          await signInWithPassword(client, values);
          router.push("/dashboard");
        } catch (error) {
          setServerError(error instanceof Error ? error.message : "No se pudo iniciar sesión.");
        }
      })}
    >
      <FormField label="Correo" error={form.formState.errors.email?.message}>
        <input type="email" {...form.register("email")} />
      </FormField>
      <FormField label="Contraseña" error={form.formState.errors.password?.message}>
        <input type="password" {...form.register("password")} />
      </FormField>
      {serverError ? <div className="form-error">{serverError}</div> : null}
      <button className="btn" disabled={form.formState.isSubmitting}>
        {form.formState.isSubmitting ? "Ingresando..." : "Ingresar"}
      </button>
      <p className="muted">
        ¿No tienes cuenta? <Link href="/register" className="pill-link">Crear acceso</Link>
      </p>
    </form>
  );
}

