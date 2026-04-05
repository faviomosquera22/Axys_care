import { createEncounter, listPatients, saveMedicalAssessment, saveVitalSigns } from "@axyscare/core-db";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Text } from "react-native";
import {
  encounterSchema,
  medicalAssessmentSchema,
  vitalSignsSchema,
} from "@axyscare/core-validation";
import { Card, LabelledInput, PrimaryButton, Screen, SectionTitle } from "../../components/ui";
import { supabase } from "../../lib/client";

export default function NewNoteTab() {
  const [encounterId, setEncounterId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const patientsQuery = useQuery({
    queryKey: ["mobile", "patients", "encounter"],
    queryFn: () => listPatients(supabase),
  });

  const encounterForm = useForm({
    resolver: zodResolver(encounterSchema),
    defaultValues: {
      patientId: "",
      appointmentId: null,
      encounterType: "mixed" as const,
      chiefComplaint: "",
      startedAt: new Date().toISOString(),
    },
  });

  const vitalsForm = useForm({
    resolver: zodResolver(vitalSignsSchema),
    defaultValues: {
      encounterId: "",
      patientId: "",
      recordedAt: new Date().toISOString(),
      temperatureC: undefined,
      heartRate: undefined,
    },
  });

  const medicalForm = useForm({
    resolver: zodResolver(medicalAssessmentSchema),
    defaultValues: {
      encounterId: "",
      chiefComplaint: "",
      currentIllness: "",
      diagnosticImpression: "",
      therapeuticPlan: "",
    },
  });

  encounterForm.register("patientId");
  encounterForm.register("chiefComplaint");
  vitalsForm.register("temperatureC");
  vitalsForm.register("heartRate");
  medicalForm.register("chiefComplaint");
  medicalForm.register("currentIllness");
  medicalForm.register("diagnosticImpression");
  medicalForm.register("therapeuticPlan");

  return (
    <Screen>
      <Card>
        <SectionTitle title="Nueva nota" subtitle="Captura rápida de atención desde móvil." />
        <LabelledInput
          label="Paciente (UUID)"
          value={encounterForm.watch("patientId")}
          onChangeText={(value) => {
            encounterForm.setValue("patientId", value);
            vitalsForm.setValue("patientId", value);
          }}
          placeholder={patientsQuery.data?.[0]?.id ?? "Selecciona desde listado de pacientes"}
        />
        <LabelledInput
          label="Motivo"
          value={encounterForm.watch("chiefComplaint")}
          onChangeText={(value) => {
            encounterForm.setValue("chiefComplaint", value);
            medicalForm.setValue("chiefComplaint", value);
          }}
          multiline
        />
        {error ? <Text style={{ color: "#a63d3d" }}>{error}</Text> : null}
        <PrimaryButton
          title="Abrir encounter"
          onPress={encounterForm.handleSubmit(async (values) => {
            try {
              setError(null);
              const encounter = await createEncounter(supabase, values);
              setEncounterId(encounter.id);
              vitalsForm.setValue("encounterId", encounter.id);
              medicalForm.setValue("encounterId", encounter.id);
            } catch (submissionError) {
              setError(submissionError instanceof Error ? submissionError.message : "No se pudo crear.");
            }
          })}
        />
      </Card>

      {encounterId ? (
        <>
          <Card>
            <SectionTitle title="Signos vitales" subtitle={`Encounter ${encounterId}`} />
            <LabelledInput
              label="Temperatura"
              keyboardType="numeric"
              onChangeText={(value) => vitalsForm.setValue("temperatureC", Number(value))}
            />
            <LabelledInput
              label="Frecuencia cardiaca"
              keyboardType="numeric"
              onChangeText={(value) => vitalsForm.setValue("heartRate", Number(value))}
            />
            <PrimaryButton
              title="Guardar signos vitales"
              onPress={vitalsForm.handleSubmit(async (values) => {
                await saveVitalSigns(supabase, values);
              })}
            />
          </Card>
          <Card>
            <SectionTitle title="Nota médica" />
            <LabelledInput
              label="Enfermedad actual"
              multiline
              onChangeText={(value) => medicalForm.setValue("currentIllness", value)}
            />
            <LabelledInput
              label="Impresión diagnóstica"
              multiline
              onChangeText={(value) => medicalForm.setValue("diagnosticImpression", value)}
            />
            <LabelledInput
              label="Plan"
              multiline
              onChangeText={(value) => medicalForm.setValue("therapeuticPlan", value)}
            />
            <PrimaryButton
              title="Guardar nota médica"
              onPress={medicalForm.handleSubmit(async (values) => {
                await saveMedicalAssessment(supabase, values);
              })}
            />
          </Card>
        </>
      ) : null}
    </Screen>
  );
}

