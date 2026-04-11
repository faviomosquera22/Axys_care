import { isSupabaseConfigured, signUpWithPassword } from "@axyscare/core-db";
import { loginSchema } from "@axyscare/core-validation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "expo-router";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Text } from "react-native";
import { z } from "zod";
import { AuthLink, AuthShell } from "../components/auth-shell";
import { LabelledInput, PrimaryButton } from "../components/ui";
import { supabase } from "../lib/client";

const registerSchema = loginSchema
  .extend({
    confirmPassword: z.string().min(8, "Confirma una contraseña válida."),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Las contraseñas no coinciden.",
    path: ["confirmPassword"],
  });

type RegisterInput = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const { register, handleSubmit, setValue, watch, formState } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: { email: "", password: "", confirmPassword: "" },
    reValidateMode: "onChange",
  });

  register("email");
  register("password");
  register("confirmPassword");

  return (
    <AuthShell
      eyebrow="Registro clínico"
      title="Crea tu acceso base"
      subtitle="Abre tu cuenta para operar Axyscare desde web y móvil sobre la misma historia clínica."
      footer={
        <AuthLink
          label="¿Ya tienes acceso?"
          action="Inicia sesión"
          onPress={() => router.replace("/sign-in")}
        />
      }
    >
      <LabelledInput
        label="Correo profesional"
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        value={watch("email")}
        onChangeText={(value) =>
          setValue("email", value.trim().toLowerCase(), {
            shouldDirty: true,
            shouldValidate: formState.isSubmitted,
          })
        }
        placeholder="profesional@correo.com"
        error={formState.errors.email?.message}
      />
      <LabelledInput
        label="Contraseña"
        secureTextEntry
        value={watch("password")}
        onChangeText={(value) =>
          setValue("password", value, {
            shouldDirty: true,
            shouldValidate: formState.isSubmitted,
          })
        }
        placeholder="Mínimo 8 caracteres"
        error={formState.errors.password?.message}
      />
      <LabelledInput
        label="Confirmar contraseña"
        secureTextEntry
        value={watch("confirmPassword")}
        onChangeText={(value) =>
          setValue("confirmPassword", value, {
            shouldDirty: true,
            shouldValidate: formState.isSubmitted,
          })
        }
        placeholder="Repite tu contraseña"
        error={formState.errors.confirmPassword?.message}
      />

      {error ? <Text style={{ color: "#a63d3d", lineHeight: 20 }}>{error}</Text> : null}
      {success ? <Text style={{ color: "#1d6a48", lineHeight: 20 }}>{success}</Text> : null}

      <PrimaryButton
        title={formState.isSubmitting ? "Creando cuenta..." : "Crear cuenta"}
        disabled={formState.isSubmitting}
        onPress={handleSubmit(async ({ email, password }) => {
          try {
            setError(null);
            setSuccess(null);
            if (!isSupabaseConfigured()) {
              setError("Falta configurar Supabase en la app móvil. Reinicia Expo después de cargar las variables EXPO_PUBLIC.");
              return;
            }
            const result = await signUpWithPassword(supabase, {
              email: email.trim().toLowerCase(),
              password,
            });
            if (result.session) {
              router.replace("/(tabs)");
              return;
            }

            setSuccess(
              "Cuenta creada. Si Supabase exige confirmación por correo, revisa tu bandeja antes de ingresar.",
            );
          } catch (submissionError) {
            setError(
              submissionError instanceof Error ? submissionError.message : "No se pudo crear la cuenta.",
            );
          }
        })}
      />
    </AuthShell>
  );
}
