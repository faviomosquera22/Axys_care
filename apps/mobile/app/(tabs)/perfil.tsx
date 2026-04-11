import Constants from "expo-constants";
import { useQuery } from "@tanstack/react-query";
import { getProfessionalSettings, getProfile, signOut } from "@axyscare/core-db";
import { Alert, Text, View } from "react-native";
import {
  Card,
  InfoPanel,
  PrimaryButton,
  Screen,
  SectionTitle,
  StatusBadge,
  uiStyles,
} from "../../components/ui";
import { supabase } from "../../lib/client";
import { useSession } from "../../lib/providers";

function getInitials(firstName?: string | null, lastName?: string | null, email?: string | null) {
  const source = `${firstName ?? ""} ${lastName ?? ""}`.trim();
  if (source) {
    return source
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((item) => item[0]?.toUpperCase() ?? "")
      .join("");
  }

  if (!email) return "AX";
  return email.slice(0, 2).toUpperCase();
}

function getBackendHost() {
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
  if (!url) return "Sin configurar";
  return url.replace(/^https?:\/\//, "");
}

export default function ProfileTab() {
  const { user, session } = useSession();
  const appVersion = Constants.expoConfig?.version ?? "0.1.0";
  const backendHost = getBackendHost();
  const profileQuery = useQuery({
    queryKey: ["mobile", "profile", user?.id],
    queryFn: () => getProfile(supabase, user!.id),
    enabled: Boolean(user?.id),
  });
  const settingsQuery = useQuery({
    queryKey: ["mobile", "professional-settings", user?.id],
    queryFn: () => getProfessionalSettings(supabase, user!.id),
    enabled: Boolean(user?.id),
  });

  const profile = profileQuery.data;
  const settings = settingsQuery.data;
  const fullName =
    profile ? `${profile.firstName} ${profile.lastName}`.trim() : user?.email ?? "Sin sesión activa";

  return (
    <Screen>
      <Card>
        <View
          style={{
            borderRadius: 24,
            padding: 18,
            backgroundColor: "#314b67",
            gap: 16,
          }}
        >
          <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 14 }}>
            <View style={{ flex: 1, gap: 6 }}>
              <Text
                style={{
                  color: "rgba(255,249,243,0.72)",
                  fontSize: 12,
                  fontWeight: "700",
                  letterSpacing: 1,
                }}
              >
                MI PERFIL
              </Text>
              <Text style={{ color: "#fff9f3", fontSize: 28, fontWeight: "800" }}>{fullName}</Text>
              <Text style={{ color: "rgba(255,249,243,0.82)", lineHeight: 20 }}>
                {profile?.profession ?? "Completa tus datos profesionales para que el móvil y la web muestren la misma identidad clínica."}
              </Text>
            </View>
            <View
              style={{
                width: 58,
                height: 58,
                borderRadius: 29,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: "rgba(255,249,243,0.16)",
              }}
            >
              <Text style={{ color: "#fff9f3", fontSize: 18, fontWeight: "800" }}>
                {getInitials(profile?.firstName, profile?.lastName, user?.email)}
              </Text>
            </View>
          </View>

          <View style={{ flexDirection: "row", gap: 10 }}>
            <View
              style={{
                flex: 1,
                borderRadius: 18,
                padding: 14,
                backgroundColor: "rgba(255,249,243,0.14)",
                gap: 4,
              }}
            >
              <Text style={{ color: "#fff9f3", fontSize: 18, fontWeight: "700" }}>
                {profile?.specialty || profile?.profession || "Sin especialidad"}
              </Text>
              <Text style={{ color: "rgba(255,249,243,0.72)" }}>área principal</Text>
            </View>
            <View
              style={{
                flex: 1,
                borderRadius: 18,
                padding: 14,
                backgroundColor: "rgba(255,249,243,0.14)",
                gap: 4,
              }}
            >
              <Text style={{ color: "#fff9f3", fontSize: 18, fontWeight: "700" }}>v{appVersion}</Text>
              <Text style={{ color: "rgba(255,249,243,0.72)" }}>versión móvil</Text>
            </View>
          </View>
        </View>
      </Card>

      <Card>
        <SectionTitle title="Datos profesionales" subtitle="Información base que debería ver el paciente y el equipo." />
        {profileQuery.isLoading ? (
          <InfoPanel title="Cargando perfil" body="Estamos trayendo tus datos profesionales." />
        ) : null}
        <View style={{ gap: 12 }}>
          <InfoPanel title="Profesión" body={profile?.profession ?? "No configurada"} />
          <InfoPanel title="Especialidad" body={profile?.specialty ?? "No configurada"} />
          <InfoPanel title="Licencia profesional" body={profile?.professionalLicense ?? "No configurada"} />
        </View>
      </Card>

      <Card>
        <SectionTitle title="Contacto" subtitle="Datos visibles para comunicación y agenda." />
        <View style={{ gap: 12 }}>
          <InfoPanel title="Correo" body={profile?.email ?? user?.email ?? "Sin correo"} />
          <InfoPanel title="Teléfono" body={profile?.phone ?? "Sin teléfono"} />
          <InfoPanel title="Ciudad" body={profile?.city ?? "Sin ciudad"} />
          <InfoPanel title="Dirección profesional" body={profile?.professionalAddress ?? "Sin dirección"} />
        </View>
      </Card>

      <Card>
        <SectionTitle title="Agenda y Google" subtitle="Estado real de la conexión para citas y teleconsulta." />
        <View style={{ flexDirection: "row", gap: 10, flexWrap: "wrap" }}>
          <StatusBadge label={session ? "Sesión activa" : "Sin sesión"} tone={session ? "success" : "danger"} />
          <StatusBadge
            label={settings?.googleCalendarConnected ? "Google Calendar conectado" : "Google Calendar pendiente"}
            tone={settings?.googleCalendarConnected ? "success" : "warning"}
          />
        </View>
        <View style={{ gap: 12 }}>
          <InfoPanel
            title="Cuenta de Google"
            body={settings?.googleCalendarEmail ?? "Todavía no hay una cuenta Google conectada desde la web."}
          />
          <InfoPanel
            title="Google Meet en móvil"
            body={
              settings?.googleCalendarConnected
                ? "La conexión está activa, pero la generación automática del Meet todavía depende de la sincronización web con Google Calendar. En móvil puedes guardar el enlace manual."
                : "Para crear Meet automático al agendar, primero conecta Google Calendar desde la web."
            }
          />
        </View>
      </Card>

      <Card>
        <SectionTitle title="Estado técnico" subtitle="Lo mínimo para saber si esta instalación está operativa." />
        <View style={{ flexDirection: "row", gap: 10, flexWrap: "wrap" }}>
          <StatusBadge label={__DEV__ ? "Modo desarrollo" : "Modo release"} tone={__DEV__ ? "warning" : "success"} />
          <StatusBadge label={backendHost === "Sin configurar" ? "Backend pendiente" : "Supabase remoto"} tone={backendHost === "Sin configurar" ? "warning" : "info"} />
        </View>
        <InfoPanel
          title="Backend actual"
          body={backendHost === "Sin configurar" ? "La app móvil no tiene variables EXPO_PUBLIC para Supabase." : `Conectada a ${backendHost}.`}
        />
      </Card>

      <Card>
        <SectionTitle title="Sesión" subtitle="Cierra sesión en este iPhone si vas a entregarlo o cambiar de usuario." />
        <PrimaryButton
          title="Cerrar sesión"
          onPress={async () => {
            try {
              await signOut(supabase);
            } catch (error) {
              Alert.alert("Perfil", error instanceof Error ? error.message : "No se pudo cerrar la sesión.");
            }
          }}
        />
      </Card>
    </Screen>
  );
}
