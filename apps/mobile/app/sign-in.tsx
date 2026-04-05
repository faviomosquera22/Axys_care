import { signInWithPassword } from "@axyscare/core-db";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "expo-router";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Text } from "react-native";
import { loginSchema, type LoginInput } from "@axyscare/core-validation";
import { Card, LabelledInput, PrimaryButton, Screen, SectionTitle } from "../components/ui";
import { supabase } from "../lib/client";

export default function SignInPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const { register, handleSubmit, setValue, formState } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  register("email");
  register("password");

  return (
    <Screen>
      <Card>
        <SectionTitle
          title="Axyscare móvil"
          subtitle="Sesión unificada con Supabase y persistencia local por MMKV."
        />
        <LabelledInput
          label="Correo"
          keyboardType="email-address"
          autoCapitalize="none"
          onChangeText={(value) => setValue("email", value)}
        />
        <LabelledInput
          label="Contraseña"
          secureTextEntry
          onChangeText={(value) => setValue("password", value)}
        />
        {error ? <Text style={{ color: "#a63d3d" }}>{error}</Text> : null}
        <PrimaryButton
          title={formState.isSubmitting ? "Ingresando..." : "Ingresar"}
          disabled={formState.isSubmitting}
          onPress={handleSubmit(async (values) => {
            try {
              setError(null);
              await signInWithPassword(supabase, values);
              router.replace("/(tabs)");
            } catch (submissionError) {
              setError(
                submissionError instanceof Error ? submissionError.message : "No se pudo iniciar sesión.",
              );
            }
          })}
        />
      </Card>
    </Screen>
  );
}

