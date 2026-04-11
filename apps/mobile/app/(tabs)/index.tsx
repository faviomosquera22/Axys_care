import { listAppointments, listEncounters, listPatients } from "@axyscare/core-db";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { Pressable, Text, View } from "react-native";
import { Card, InfoPanel, Screen, SectionTitle, StatusBadge, uiStyles } from "../../components/ui";
import { supabase } from "../../lib/client";

export default function HomeTab() {
  const router = useRouter();
  const appointmentsQuery = useQuery({
    queryKey: ["mobile", "appointments"],
    queryFn: () => listAppointments(supabase),
  });
  const patientsQuery = useQuery({
    queryKey: ["mobile", "patients"],
    queryFn: () => listPatients(supabase),
  });
  const encountersQuery = useQuery({
    queryKey: ["mobile", "home", "encounters"],
    queryFn: () => listEncounters(supabase),
  });

  const today = new Date().toDateString();
  const appointments = appointmentsQuery.data ?? [];
  const patients = patientsQuery.data ?? [];
  const encounters = encountersQuery.data ?? [];
  const todayAppointments = appointments.filter(
    (item) => new Date(item.startAt).toDateString() === today,
  );
  const nextAppointment = todayAppointments[0] ?? appointments[0] ?? null;
  const openEncounters = encounters.filter((item) => item.status === "open");
  const sharedPatients = patients.filter((item) => item.relationshipToViewer !== "owner");
  const recentPatients = patients.slice(0, 3);

  return (
    <Screen>
      <Card>
        <View
          style={{
            borderRadius: 24,
            padding: 18,
            backgroundColor: "#1f676a",
            gap: 16,
          }}
        >
          <View style={{ gap: 6 }}>
            <Text style={{ color: "rgba(255,249,243,0.72)", fontSize: 12, fontWeight: "700", letterSpacing: 1 }}>
              HOY
            </Text>
            <Text style={{ color: "#fff9f3", fontSize: 28, fontWeight: "800" }}>
              {todayAppointments.length} citas y {openEncounters.length} encuentros abiertos
            </Text>
            <Text style={{ color: "rgba(255,249,243,0.82)", lineHeight: 20 }}>Solo lo esencial para empezar el turno.</Text>
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
              <Text style={{ color: "#fff9f3", fontSize: 22, fontWeight: "700" }}>{patients.length}</Text>
              <Text style={{ color: "rgba(255,249,243,0.72)" }}>pacientes visibles</Text>
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
              <Text style={{ color: "#fff9f3", fontSize: 22, fontWeight: "700" }}>{sharedPatients.length}</Text>
              <Text style={{ color: "rgba(255,249,243,0.72)" }}>compartidos</Text>
            </View>
          </View>
        </View>
      </Card>

      <Card>
        <SectionTitle title="Acciones principales" subtitle="Tres accesos para no perder tiempo." />
        <View style={{ gap: 10 }}>
          <Pressable
            onPress={() => router.push("/(tabs)/agenda")}
            style={{
              borderRadius: 20,
              padding: 16,
              backgroundColor: "rgba(21, 102, 105, 0.08)",
              gap: 6,
            }}
          >
            <Text style={{ fontWeight: "700", color: "#201812" }}>Abrir agenda</Text>
            <Text style={uiStyles.subtitle}>Ver la cita del día, confirmar o entrar a teleconsulta.</Text>
          </Pressable>
          <Pressable
            onPress={() =>
              router.push({
                pathname: "/(tabs)/pacientes",
                params: { compose: "1" },
              })
            }
            style={{
              borderRadius: 20,
              padding: 16,
              backgroundColor: "rgba(140, 75, 48, 0.08)",
              gap: 6,
            }}
          >
            <Text style={{ fontWeight: "700", color: "#201812" }}>Registrar paciente</Text>
            <Text style={uiStyles.subtitle}>Dar de alta al paciente y dejarlo listo para atender.</Text>
          </Pressable>
          <Pressable
            onPress={() => router.push("/(tabs)/nueva-nota")}
            style={{
              borderRadius: 20,
              padding: 16,
              backgroundColor: "rgba(29, 106, 72, 0.08)",
              gap: 6,
            }}
          >
            <Text style={{ fontWeight: "700", color: "#201812" }}>Atender ahora</Text>
            <Text style={uiStyles.subtitle}>Abrir o retomar un encounter sin pasar por pantallas extras.</Text>
          </Pressable>
        </View>
      </Card>

      <Card>
        <SectionTitle title="Siguiente cita" subtitle="Lo próximo del día." />
        {nextAppointment ? (
          <View
            style={{
              borderRadius: 20,
              padding: 16,
              backgroundColor: "rgba(255,255,255,0.82)",
              borderWidth: 1,
              borderColor: "rgba(32, 24, 18, 0.08)",
              gap: 8,
            }}
          >
            <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 10 }}>
              <View style={{ flex: 1, gap: 4 }}>
                <Text style={{ fontWeight: "700", color: "#201812" }}>{nextAppointment.reason}</Text>
                <Text style={uiStyles.subtitle}>
                  {new Date(nextAppointment.startAt).toLocaleString()} · {nextAppointment.modality}
                </Text>
              </View>
              <StatusBadge label={nextAppointment.status.replaceAll("_", " ")} tone="info" />
            </View>
            <Pressable
              onPress={() => router.push("/(tabs)/agenda")}
              style={{
                alignSelf: "flex-start",
                paddingHorizontal: 12,
                paddingVertical: 10,
                borderRadius: 999,
                backgroundColor: "rgba(21, 102, 105, 0.12)",
              }}
            >
              <Text style={{ color: "#156669", fontWeight: "700" }}>Ir a agenda</Text>
            </Pressable>
          </View>
        ) : (
          <InfoPanel
            title="Sin citas cargadas"
            body="Todavía no hay citas para mostrar. Puedes crear una desde Agenda."
          />
        )}
      </Card>

      <Card>
        <SectionTitle title="Pacientes recientes" subtitle="Listado corto para retomar rápido." />
        {recentPatients.length === 0 ? (
          <InfoPanel
            title="Sin pacientes visibles"
            body="Aún no hay pacientes visibles. Usa Registrar paciente para empezar."
          />
        ) : null}
        {recentPatients.map((patient) => (
          <Pressable
            key={patient.id}
            onPress={() =>
              router.push({
                pathname: "/(tabs)/nueva-nota",
                params: { patientId: patient.id },
              })
            }
            style={{
              paddingVertical: 12,
              borderBottomWidth: 1,
              borderBottomColor: "rgba(32,24,18,0.08)",
              gap: 4,
            }}
          >
            <Text style={{ fontWeight: "700", color: "#201812" }}>
              {patient.firstName} {patient.lastName}
            </Text>
            <Text style={uiStyles.subtitle}>
              {patient.documentNumber} · {patient.relationshipToViewer === "owner" ? "propio" : "compartido"}
            </Text>
          </Pressable>
        ))}
      </Card>
    </Screen>
  );
}
