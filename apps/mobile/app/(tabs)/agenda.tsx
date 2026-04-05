import { listAppointments } from "@axyscare/core-db";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { Text, View } from "react-native";
import { Card, Screen, SectionTitle, uiStyles } from "../../components/ui";
import { supabase } from "../../lib/client";

export default function AgendaTab() {
  const queryClient = useQueryClient();
  const appointmentsQuery = useQuery({
    queryKey: ["mobile", "agenda"],
    queryFn: () => listAppointments(supabase),
  });

  useEffect(() => {
    const channel = supabase.channel("mobile-agenda");
    channel.on("postgres_changes", { event: "*", schema: "public", table: "appointments" }, () => {
      queryClient.invalidateQueries({ queryKey: ["mobile", "agenda"] });
    });
    channel.subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return (
    <Screen>
      <Card>
        <SectionTitle
          title="Agenda"
          subtitle="Acceso rápido a citas, teleconsulta y estado operativo desde móvil."
        />
        {(appointmentsQuery.data ?? []).map((appointment) => (
          <View
            key={appointment.id}
            style={{ paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "rgba(32,24,18,0.08)" }}
          >
            <Text style={{ fontWeight: "700", color: "#201812" }}>{appointment.reason}</Text>
            <Text style={uiStyles.subtitle}>{new Date(appointment.startAt).toLocaleString()}</Text>
            <Text style={uiStyles.subtitle}>
              {appointment.modality === "virtual" ? appointment.meetLink ?? "Sin link" : appointment.modality}
            </Text>
          </View>
        ))}
      </Card>
    </Screen>
  );
}
