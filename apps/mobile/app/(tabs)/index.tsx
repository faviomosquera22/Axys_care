import { listAppointments, listPatients } from "@axyscare/core-db";
import { useQuery } from "@tanstack/react-query";
import { Text, View } from "react-native";
import { Card, Screen, SectionTitle, uiStyles } from "../../components/ui";
import { supabase } from "../../lib/client";

export default function HomeTab() {
  const appointmentsQuery = useQuery({
    queryKey: ["mobile", "appointments"],
    queryFn: () => listAppointments(supabase),
  });
  const patientsQuery = useQuery({
    queryKey: ["mobile", "patients"],
    queryFn: () => listPatients(supabase),
  });

  const today = new Date().toDateString();
  const todayAppointments = (appointmentsQuery.data ?? []).filter(
    (item) => new Date(item.startAt).toDateString() === today,
  );

  return (
    <Screen>
      <Card>
        <SectionTitle title="Inicio" subtitle="Resumen rápido para atención independiente." />
        <View style={{ gap: 10 }}>
          <Text style={uiStyles.title}>{todayAppointments.length}</Text>
          <Text style={uiStyles.subtitle}>citas para hoy</Text>
        </View>
      </Card>
      <Card>
        <SectionTitle title="Actividad" />
        <Text style={uiStyles.subtitle}>Pacientes registrados: {patientsQuery.data?.length ?? 0}</Text>
        <Text style={uiStyles.subtitle}>Próximas citas: {appointmentsQuery.data?.length ?? 0}</Text>
      </Card>
    </Screen>
  );
}

