import { isSupabaseConfigured, signInWithPassword } from "@axyscare/core-db";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "expo-router";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Text } from "react-native";
import { loginSchema, type LoginInput } from "@axyscare/core-validation";
import { AuthLink, AuthShell } from "../components/auth-shell";
import { LabelledInput, PrimaryButton } from "../components/ui";
import { supabase } from "../lib/client";

export default function SignInPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const { register, handleSubmit, setValue, watch, formState } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
    reValidateMode: "onChange",
  });

  register("email");
  register("password");

  return (
    <AuthShell
      eyebrow="Axyscare"
      title="Continuidad clínica real"
      subtitle="Accede a la misma agenda, los mismos pacientes y el mismo encounter desde móvil."
      footer={
        <AuthLink
          label="¿Todavía no tienes cuenta?"
          action="Crear acceso"
          onPress={() => router.push("/register")}
        />
      }
    >
      <LabelledInput
        label="Correo"
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
        placeholder="Tu contraseña"
        error={formState.errors.password?.message}
      />
      {error ? <Text style={{ color: "#a63d3d", lineHeight: 20 }}>{error}</Text> : null}
      <PrimaryButton
        title={formState.isSubmitting ? "Ingresando..." : "Ingresar"}
        disabled={formState.isSubmitting}
        onPress={handleSubmit(async (values) => {
          try {
            setError(null);
            if (!isSupabaseConfigured()) {
              setError("Falta configurar Supabase en la app móvil. Reinicia Expo después de cargar las variables EXPO_PUBLIC.");
              return;
            }
            await signInWithPassword(supabase, {
              email: values.email.trim().toLowerCase(),
              password: values.password,
            });
            router.replace("/(tabs)");
          } catch (submissionError) {
            setError(
              submissionError instanceof Error ? submissionError.message : "No se pudo iniciar sesión.",
            );
          }
        })}
      />
    </AuthShell>
  );
}
