import { calculateAge } from "@axyscare/core-clinical";
import { listOwnedPatients, listSharedPatientsWithMe } from "@axyscare/core-db";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { Text, View } from "react-native";
import { Card, Screen, SectionTitle, uiStyles } from "../../components/ui";
import { supabase } from "../../lib/client";

export default function PatientsTab() {
  const queryClient = useQueryClient();
  const ownPatientsQuery = useQuery({
    queryKey: ["mobile", "patients", "owned"],
    queryFn: () => listOwnedPatients(supabase),
  });
  const sharedPatientsQuery = useQuery({
    queryKey: ["mobile", "patients", "shared"],
    queryFn: () => listSharedPatientsWithMe(supabase),
  });

  useEffect(() => {
    const channel = supabase.channel("mobile-patient-access");
    channel.on("postgres_changes", { event: "*", schema: "public", table: "patient_access" }, () => {
      queryClient.invalidateQueries({ queryKey: ["mobile", "patients", "shared"] });
      queryClient.invalidateQueries({ queryKey: ["mobile", "patients", "owned"] });
    });
    channel.on("postgres_changes", { event: "*", schema: "public", table: "patients" }, () => {
      queryClient.invalidateQueries({ queryKey: ["mobile", "patients", "shared"] });
      queryClient.invalidateQueries({ queryKey: ["mobile", "patients", "owned"] });
    });
    channel.subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return (
    <Screen>
      <Card>
        <SectionTitle title="Pacientes propios" subtitle="Base clínica donde eres propietario principal." />
        {(ownPatientsQuery.data ?? []).map((patient) => (
          <View
            key={patient.id}
            style={{ paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "rgba(32,24,18,0.08)" }}
          >
            <Text style={{ fontWeight: "700", color: "#201812" }}>
              {patient.firstName} {patient.lastName}
            </Text>
            <Text style={uiStyles.subtitle}>
              {patient.documentNumber} · {calculateAge(patient.birthDate)} años
            </Text>
          </View>
        ))}
      </Card>
      <Card>
        <SectionTitle
          title="Compartidos conmigo"
          subtitle="Pacientes maestros compartidos desde otra cuenta con acceso vigente."
        />
        {(sharedPatientsQuery.data ?? []).map((access) => (
          <View
            key={access.id}
            style={{ paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "rgba(32,24,18,0.08)" }}
          >
            <Text style={{ fontWeight: "700", color: "#201812" }}>
              {access.patient?.firstName} {access.patient?.lastName}
            </Text>
            <Text style={uiStyles.subtitle}>
              {access.permissionLevel} · Propietario{" "}
              {access.ownerProfile ? `${access.ownerProfile.firstName} ${access.ownerProfile.lastName}` : access.ownerUserId}
            </Text>
          </View>
        ))}
      </Card>
    </Screen>
  );
}
