import DocumentScanner from "react-native-document-scanner-plugin";
import {
  closeEncounter,
  createAttachmentRecord,
  createEncounter,
  getEncounter,
  getEncounterBundle,
  listPatients,
  saveClinicalNote,
  saveMedicalAssessment,
  saveVitalSigns,
} from "@axyscare/core-db";
import { calculateAge } from "@axyscare/core-clinical";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { useLocalSearchParams } from "expo-router";
import { useForm } from "react-hook-form";
import { Alert, Image, Pressable, Text, View } from "react-native";
import {
  encounterSchema,
  medicalAssessmentSchema,
  vitalSignsSchema,
} from "@axyscare/core-validation";
import {
  Card,
  ChoiceChip,
  InfoPanel,
  LabelledInput,
  PrimaryButton,
  Screen,
  SecondaryButton,
  SectionTitle,
  StatusBadge,
  uiStyles,
} from "../../components/ui";
import { useMobilePatientRealtime } from "../../lib/realtime";
import { supabase } from "../../lib/client";

function parseMaybeNumber(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  const parsed = Number(trimmed);
  return Number.isNaN(parsed) ? undefined : parsed;
}

function getFirstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function formatEncounterMoment(value: string) {
  return new Intl.DateTimeFormat("es-EC", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function buildVitalsSummary(bundle: Awaited<ReturnType<typeof getEncounterBundle>> | undefined) {
  if (!bundle?.vitals) return "Sin signos vitales guardados todavía.";

  const items = [
    bundle.vitals.temperatureC ? `${bundle.vitals.temperatureC} C` : null,
    bundle.vitals.heartRate ? `FC ${bundle.vitals.heartRate}` : null,
    bundle.vitals.oxygenSaturation ? `Sat ${bundle.vitals.oxygenSaturation}%` : null,
    bundle.vitals.systolic && bundle.vitals.diastolic
      ? `PA ${bundle.vitals.systolic}/${bundle.vitals.diastolic}`
      : null,
  ].filter(Boolean);

  return items.length ? items.join(" · ") : "Sin signos vitales relevantes.";
}

export default function NewNoteTab() {
  const params = useLocalSearchParams<{
    patientId?: string | string[];
    encounterId?: string | string[];
    appointmentId?: string | string[];
    chiefComplaint?: string | string[];
  }>();
  const [encounterId, setEncounterId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [patientSearch, setPatientSearch] = useState("");
  const [scannedImage, setScannedImage] = useState<string | null>(null);
  const [closureSummary, setClosureSummary] = useState("");
  const [closingEncounter, setClosingEncounter] = useState(false);
  const [quickNoteText, setQuickNoteText] = useState("");
  const [quickNoteKind, setQuickNoteKind] = useState<
    "general" | "evolution" | "patient_indications"
  >("evolution");
  const [savingQuickNote, setSavingQuickNote] = useState(false);
  const hydratedEncounterRef = useRef<string | null>(null);
  const queryClient = useQueryClient();
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
      oxygenSaturation: undefined,
      systolic: undefined,
      diastolic: undefined,
      notes: "",
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
  encounterForm.register("encounterType");
  encounterForm.register("chiefComplaint");
  vitalsForm.register("temperatureC");
  vitalsForm.register("heartRate");
  vitalsForm.register("oxygenSaturation");
  vitalsForm.register("systolic");
  vitalsForm.register("diastolic");
  vitalsForm.register("notes");
  medicalForm.register("chiefComplaint");
  medicalForm.register("currentIllness");
  medicalForm.register("diagnosticImpression");
  medicalForm.register("therapeuticPlan");

  const patients = patientsQuery.data ?? [];
  const filteredPatients = useMemo(() => {
    const search = patientSearch.trim().toLowerCase();
    if (!search) return patients.slice(0, 8);

    return patients
      .filter((patient) =>
        `${patient.firstName} ${patient.lastName} ${patient.documentNumber} ${patient.email ?? ""}`
          .toLowerCase()
          .includes(search),
      )
      .slice(0, 8);
  }, [patientSearch, patients]);

  const selectedPatient = patients.find(
    (patient) => patient.id === encounterForm.watch("patientId"),
  );
  const patientIdParam = getFirstParam(params.patientId);
  const encounterIdParam = getFirstParam(params.encounterId);
  const appointmentIdParam = getFirstParam(params.appointmentId);
  const chiefComplaintParam = getFirstParam(params.chiefComplaint);
  const activeEncounterId = encounterId ?? encounterIdParam ?? null;
  const activePatientId =
    patientIdParam ??
    encounterForm.watch("patientId") ??
    undefined;

  const encounterQuery = useQuery({
    queryKey: ["mobile", "encounter", activeEncounterId],
    queryFn: () => getEncounter(supabase, activeEncounterId!),
    enabled: Boolean(activeEncounterId),
  });

  const encounterBundleQuery = useQuery({
    queryKey: ["mobile", "encounter-bundle", activeEncounterId],
    queryFn: () => getEncounterBundle(supabase, activeEncounterId!),
    enabled: Boolean(activeEncounterId),
  });

  const realtimeQueryKeys = useMemo(() => {
    const keys: (readonly unknown[])[] = [
      ["mobile", "agenda"],
      ["mobile", "appointments"],
      ["mobile", "patients"],
      ["mobile", "patients", "owned"],
      ["mobile", "patients", "shared"],
      ["mobile", "patients", "encounter"],
      ["mobile", "encounters"],
    ];

    if (activeEncounterId) {
      keys.push(["mobile", "encounter", activeEncounterId]);
      keys.push(["mobile", "encounter-bundle", activeEncounterId]);
    }

    return keys;
  }, [activeEncounterId]);

  useMobilePatientRealtime(activePatientId || encounterQuery.data?.patientId, realtimeQueryKeys);

  useEffect(() => {
    if (!patientIdParam) return;
    encounterForm.setValue("patientId", patientIdParam);
    vitalsForm.setValue("patientId", patientIdParam);
  }, [encounterForm, patientIdParam, vitalsForm]);

  useEffect(() => {
    if (!appointmentIdParam) return;
    encounterForm.setValue("appointmentId", appointmentIdParam);
  }, [appointmentIdParam, encounterForm]);

  useEffect(() => {
    if (!chiefComplaintParam) return;
    encounterForm.setValue("chiefComplaint", chiefComplaintParam);
    medicalForm.setValue("chiefComplaint", chiefComplaintParam);
  }, [chiefComplaintParam, encounterForm, medicalForm]);

  useEffect(() => {
    if (!encounterIdParam) return;
    setEncounterId((current) => current ?? encounterIdParam);
    vitalsForm.setValue("encounterId", encounterIdParam);
    medicalForm.setValue("encounterId", encounterIdParam);
    setSuccess("Continuando un encounter ya abierto desde otra pantalla.");
  }, [encounterIdParam, medicalForm, vitalsForm]);

  useEffect(() => {
    const encounter = encounterQuery.data;
    if (!encounter) return;

    const shouldHydrate =
      hydratedEncounterRef.current !== encounter.id ||
      !encounterForm.formState.isDirty;

    if (!shouldHydrate) return;

    setEncounterId(encounter.id);
    encounterForm.reset({
      patientId: encounter.patientId,
      appointmentId: encounter.appointmentId ?? null,
      encounterType: encounter.encounterType,
      chiefComplaint: encounter.chiefComplaint ?? "",
      startedAt: encounter.startedAt,
    });
    vitalsForm.setValue("encounterId", encounter.id, { shouldDirty: false });
    vitalsForm.setValue("patientId", encounter.patientId, { shouldDirty: false });
    medicalForm.setValue("encounterId", encounter.id, { shouldDirty: false });
    medicalForm.setValue("chiefComplaint", encounter.chiefComplaint ?? "", {
      shouldDirty: false,
    });
    hydratedEncounterRef.current = encounter.id;
  }, [encounterForm, encounterQuery.data, medicalForm, vitalsForm]);

  useEffect(() => {
    const bundle = encounterBundleQuery.data;
    if (!bundle) return;

    if (!vitalsForm.formState.isDirty && bundle.vitals) {
      vitalsForm.reset({
        encounterId: bundle.vitals.encounterId,
        patientId: bundle.vitals.patientId,
        recordedAt: bundle.vitals.recordedAt,
        temperatureC: bundle.vitals.temperatureC ?? undefined,
        heartRate: bundle.vitals.heartRate ?? undefined,
        oxygenSaturation: bundle.vitals.oxygenSaturation ?? undefined,
        systolic: bundle.vitals.systolic ?? undefined,
        diastolic: bundle.vitals.diastolic ?? undefined,
        notes: bundle.vitals.notes ?? "",
      });
    }

    if (!medicalForm.formState.isDirty && bundle.medical) {
      medicalForm.reset({
        encounterId: bundle.medical.encounterId,
        chiefComplaint: bundle.medical.chiefComplaint,
        currentIllness: bundle.medical.currentIllness,
        diagnosticImpression: bundle.medical.diagnosticImpression ?? "",
        therapeuticPlan: bundle.medical.therapeuticPlan ?? "",
      });
    }

    if (!closureSummary.trim() && bundle.encounter?.summary) {
      setClosureSummary(bundle.encounter.summary);
    }
  }, [encounterBundleQuery.data, medicalForm, vitalsForm]);

  const encounterBundle = encounterBundleQuery.data;
  const hasVitals = Boolean(encounterBundle?.vitals);
  const hasMedical = Boolean(encounterBundle?.medical);
  const hasAttachment = Boolean(encounterBundle?.attachments?.length);
  const completionCount = [hasVitals, hasMedical, hasAttachment || Boolean(scannedImage)].filter(Boolean).length;
  const selectedPatientId = encounterForm.watch("patientId");
  const chiefComplaintValue = encounterForm.watch("chiefComplaint");
  const encounterTypeValue = encounterForm.watch("encounterType");
  const selectedEncounterTypeLabel =
    encounterTypeValue === "medical"
      ? "Médico"
      : encounterTypeValue === "nursing"
        ? "Enfermería"
        : "Mixto";
  const encounterReady = Boolean(selectedPatient && chiefComplaintValue);
  const encounterSnapshot = encounterBundle?.encounter ?? null;
  const latestAttachment = encounterBundle?.attachments?.[0] ?? null;
  const latestClinicalNote = encounterBundle?.notes?.[0] ?? null;
  const encounterClosed = encounterSnapshot?.status === "closed" || encounterQuery.data?.status === "closed";

  return (
    <Screen>
      <Card>
        <View
          style={{
            borderRadius: 28,
            padding: 20,
            backgroundColor: "#214f58",
            gap: 16,
          }}
        >
          <Text style={{ color: "rgba(255,249,243,0.72)", fontSize: 12, fontWeight: "700", letterSpacing: 1 }}>
            WORKSPACE MOVIL
          </Text>
          <Text style={{ color: "#fff9f3", fontSize: 28, fontWeight: "800" }}>
            Triage, nota y adjunto sin romper el encounter
          </Text>
          <Text style={{ color: "rgba(255,249,243,0.82)", lineHeight: 20 }}>
            Aquí no deberías llenar una historia larga. Deberías resolver lo esencial del episodio en pocos pasos.
          </Text>

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
              <Text style={{ color: "#fff9f3", fontSize: 22, fontWeight: "700" }}>{completionCount}/3</Text>
              <Text style={{ color: "rgba(255,249,243,0.72)" }}>bloques resueltos</Text>
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
              <Text style={{ color: "#fff9f3", fontSize: 18, fontWeight: "700" }}>{selectedEncounterTypeLabel}</Text>
              <Text style={{ color: "rgba(255,249,243,0.72)" }}>tipo de encounter</Text>
            </View>
          </View>

          <View style={{ flexDirection: "row", gap: 10, flexWrap: "wrap" }}>
            {[
              {
                step: "01",
                title: "Contexto",
                state: encounterId ? "Activo" : encounterReady ? "Listo" : "Pendiente",
              },
              {
                step: "02",
                title: "Triage",
                state: hasVitals ? "Guardado" : encounterId ? "Capturar" : "Bloqueado",
              },
              {
                step: "03",
                title: "Nota y adjunto",
                state: hasMedical || hasAttachment || scannedImage ? "En curso" : encounterId ? "Pendiente" : "Bloqueado",
              },
            ].map((item) => (
              <View
                key={item.step}
                style={{
                  minWidth: 96,
                  flex: 1,
                  borderRadius: 18,
                  padding: 14,
                  backgroundColor: "rgba(255,249,243,0.14)",
                  gap: 4,
                }}
              >
                <Text style={{ color: "rgba(255,249,243,0.7)", fontSize: 11, fontWeight: "800", letterSpacing: 0.7 }}>
                  PASO {item.step}
                </Text>
                <Text style={{ color: "#fff9f3", fontSize: 15, fontWeight: "800" }}>{item.title}</Text>
                <Text style={{ color: "rgba(255,249,243,0.72)" }}>{item.state}</Text>
              </View>
            ))}
          </View>
        </View>
      </Card>

      <Card>
        <SectionTitle
          title="Contexto del episodio"
          subtitle="Selecciona paciente, define el tipo de atención y abre o retoma el encounter."
        />

        {encounterId ? (
          <View style={{ gap: 8 }}>
            <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
              <StatusBadge label="Encounter activo" tone="info" />
              <StatusBadge label={hasVitals ? "Triage guardado" : "Triage pendiente"} tone={hasVitals ? "success" : "warning"} />
              <StatusBadge label={hasMedical ? "Nota guardada" : "Nota pendiente"} tone={hasMedical ? "success" : "warning"} />
            </View>
            <Text style={uiStyles.subtitle}>
              Estás trabajando sobre el episodio {encounterId.slice(0, 8)}.
            </Text>
          </View>
        ) : null}

        <View
          style={{
            borderRadius: 18,
            padding: 16,
            backgroundColor: encounterId ? "rgba(21, 102, 105, 0.08)" : "rgba(32,24,18,0.05)",
            gap: 6,
          }}
        >
          <Text style={{ color: encounterId ? "#156669" : "#201812", fontWeight: "800" }}>
            {encounterId
              ? "Estas retomando un episodio ya abierto y todo lo que guardes cae en el mismo contexto."
              : "Primero asegura paciente, motivo y tipo de encounter. Despues abre el episodio."}
          </Text>
          <Text style={uiStyles.subtitle}>
            La meta en movil es resolver el episodio rapido sin romper continuidad con web.
          </Text>
        </View>

        <LabelledInput
          label="Buscar paciente"
          value={patientSearch}
          onChangeText={setPatientSearch}
          placeholder="Nombre, documento o correo"
        />

        <View style={{ gap: 8 }}>
          {filteredPatients.map((patient) => (
            <Pressable
              key={patient.id}
              onPress={() => {
                encounterForm.setValue("patientId", patient.id);
                vitalsForm.setValue("patientId", patient.id);
              }}
              style={{
                borderRadius: 18,
                padding: 14,
                borderWidth: 1,
                borderColor:
                  selectedPatientId === patient.id
                    ? "rgba(21, 102, 105, 0.24)"
                    : "rgba(32,24,18,0.08)",
                backgroundColor:
                  selectedPatientId === patient.id
                    ? "rgba(21, 102, 105, 0.10)"
                    : "rgba(255,255,255,0.88)",
                gap: 4,
              }}
            >
              <Text style={{ fontWeight: "700", color: "#201812" }}>
                {patient.firstName} {patient.lastName}
              </Text>
              <Text style={uiStyles.subtitle}>
                {patient.documentNumber} {patient.email ? `· ${patient.email}` : ""}
              </Text>
            </Pressable>
          ))}
        </View>

        {selectedPatient ? (
          <View
            style={{
              borderRadius: 18,
              padding: 16,
              backgroundColor: "rgba(255,255,255,0.82)",
              borderWidth: 1,
              borderColor: "rgba(32,24,18,0.08)",
              gap: 10,
            }}
          >
            <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 10 }}>
              <View style={{ flex: 1, gap: 4 }}>
                <Text style={{ fontWeight: "700", color: "#201812", fontSize: 17 }}>
                  {selectedPatient.firstName} {selectedPatient.lastName}
                </Text>
                <Text style={uiStyles.subtitle}>
                  {selectedPatient.documentNumber} · {calculateAge(selectedPatient.birthDate)} años · {selectedPatient.sex}
                </Text>
              </View>
              <StatusBadge
                label={selectedPatient.relationshipToViewer === "owner" ? "Propio" : "Compartido"}
                tone={selectedPatient.relationshipToViewer === "owner" ? "success" : "info"}
              />
            </View>
            <Text style={uiStyles.subtitle}>
              {selectedPatient.allergies?.length
                ? `Alergias: ${selectedPatient.allergies.join(", ")}`
                : "Sin alergias registradas"}
            </Text>
            {selectedPatient.relevantHistory ? (
              <Text style={uiStyles.subtitle}>Antecedentes: {selectedPatient.relevantHistory}</Text>
            ) : null}
          </View>
        ) : (
          <Text style={uiStyles.subtitle}>
            Selecciona un paciente del listado para abrir el encounter en el expediente correcto.
          </Text>
        )}

        <Text style={uiStyles.label}>Tipo de encounter</Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
          {[
            { value: "medical", label: "Médico" },
            { value: "nursing", label: "Enfermería" },
            { value: "mixed", label: "Mixto" },
          ].map((option) => (
            <ChoiceChip
              key={option.value}
              label={option.label}
              selected={encounterTypeValue === option.value}
              onPress={() =>
                encounterForm.setValue(
                  "encounterType",
                  option.value as "medical" | "nursing" | "mixed",
                )
              }
            />
          ))}
        </View>

        <LabelledInput
          label="Motivo principal"
          value={chiefComplaintValue}
          onChangeText={(value) => {
            encounterForm.setValue("chiefComplaint", value);
            medicalForm.setValue("chiefComplaint", value);
          }}
          multiline
          placeholder="Ej. cefalea intensa, control postoperatorio, curación"
        />

        {error ? <Text style={{ color: "#a63d3d" }}>{error}</Text> : null}
        {success ? <Text style={{ color: "#1d6a48" }}>{success}</Text> : null}

        <PrimaryButton
          title={encounterClosed ? "Encounter cerrado" : encounterId ? "Encounter en curso" : "Abrir encounter"}
          disabled={
            !selectedPatient ||
            !chiefComplaintValue ||
            Boolean(encounterId)
          }
          onPress={encounterForm.handleSubmit(async (values) => {
            try {
              setError(null);
              setSuccess(null);
              const encounter = await createEncounter(supabase, values);
              setEncounterId(encounter.id);
              vitalsForm.setValue("encounterId", encounter.id);
              medicalForm.setValue("encounterId", encounter.id);
              setSuccess(
                "Encounter abierto. Ya puedes capturar signos, nota y escaneo.",
              );
            } catch (submissionError) {
              setError(
                submissionError instanceof Error
                  ? submissionError.message
                  : "No se pudo crear el encounter.",
              );
            }
          })}
        />
      </Card>

      {encounterId ? (
        <>
          <Card>
            <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12, alignItems: "flex-start" }}>
              <SectionTitle
                title="Estado guardado del encounter"
                subtitle="Lo que ya queda visible para web y movil dentro del mismo episodio."
              />
              <StatusBadge
                label={encounterBundleQuery.isLoading ? "Sincronizando" : "Sincronizado"}
                tone={encounterBundleQuery.isLoading ? "warning" : "success"}
              />
            </View>

            {encounterBundleQuery.isLoading ? (
              <InfoPanel
                title="Armando resumen del episodio"
                body="Estamos trayendo el estado actual del encounter para que no tengas que cambiar de pantalla."
              />
            ) : null}

            <View style={{ flexDirection: "row", gap: 10, flexWrap: "wrap" }}>
              <View
                style={{
                  minWidth: 96,
                  flex: 1,
                  borderRadius: 18,
                  padding: 14,
                  backgroundColor: "rgba(32,24,18,0.05)",
                  gap: 4,
                }}
              >
                <Text style={{ color: "#6d635b", fontSize: 12, fontWeight: "700" }}>TRIAGE</Text>
                <Text style={{ color: "#201812", fontSize: 18, fontWeight: "800" }}>
                  {hasVitals ? "Guardado" : "Pendiente"}
                </Text>
              </View>
              <View
                style={{
                  minWidth: 96,
                  flex: 1,
                  borderRadius: 18,
                  padding: 14,
                  backgroundColor: "rgba(32,24,18,0.05)",
                  gap: 4,
                }}
              >
                <Text style={{ color: "#6d635b", fontSize: 12, fontWeight: "700" }}>NOTA</Text>
                <Text style={{ color: "#201812", fontSize: 18, fontWeight: "800" }}>
                  {hasMedical ? "Guardada" : "Pendiente"}
                </Text>
              </View>
              <View
                style={{
                  minWidth: 96,
                  flex: 1,
                  borderRadius: 18,
                  padding: 14,
                  backgroundColor: "rgba(32,24,18,0.05)",
                  gap: 4,
                }}
              >
                <Text style={{ color: "#6d635b", fontSize: 12, fontWeight: "700" }}>ADJUNTOS</Text>
                <Text style={{ color: "#201812", fontSize: 18, fontWeight: "800" }}>
                  {encounterBundle?.attachments?.length ?? 0}
                </Text>
              </View>
            </View>

            {encounterSnapshot ? (
              <View
                style={{
                  borderRadius: 18,
                  padding: 16,
                  backgroundColor: "rgba(21, 102, 105, 0.08)",
                  gap: 6,
                }}
              >
                <Text style={{ color: "#156669", fontWeight: "800" }}>
                  {encounterSnapshot.chiefComplaint || "Sin motivo registrado"}
                </Text>
                <Text style={uiStyles.subtitle}>
                  {formatEncounterMoment(encounterSnapshot.startedAt)} · {encounterSnapshot.encounterType} ·{" "}
                  {encounterSnapshot.status}
                </Text>
              </View>
            ) : null}

            <View
              style={{
                borderRadius: 18,
                padding: 16,
                backgroundColor: "rgba(255,255,255,0.78)",
                borderWidth: 1,
                borderColor: "rgba(32,24,18,0.08)",
                gap: 8,
              }}
            >
              <Text style={{ color: "#201812", fontWeight: "800" }}>Resumen de signos guardados</Text>
              <Text style={uiStyles.subtitle}>{buildVitalsSummary(encounterBundle)}</Text>
              {encounterBundle?.vitals?.notes ? (
                <Text style={uiStyles.subtitle}>Observación: {encounterBundle.vitals.notes}</Text>
              ) : null}
            </View>

            <View
              style={{
                borderRadius: 18,
                padding: 16,
                backgroundColor: "rgba(255,255,255,0.78)",
                borderWidth: 1,
                borderColor: "rgba(32,24,18,0.08)",
                gap: 8,
              }}
            >
              <Text style={{ color: "#201812", fontWeight: "800" }}>Resumen clínico visible</Text>
              <Text style={uiStyles.subtitle}>
                {encounterBundle?.medical?.diagnosticImpression?.trim() ||
                  encounterBundle?.medical?.currentIllness?.trim() ||
                  "Todavia no hay nota clinica guardada."}
              </Text>
              {encounterBundle?.medical?.therapeuticPlan ? (
                <Text style={uiStyles.subtitle}>Plan: {encounterBundle.medical.therapeuticPlan}</Text>
              ) : null}
            </View>

            <View style={{ flexDirection: "row", gap: 10 }}>
              <View
                style={{
                  flex: 1,
                  borderRadius: 18,
                  padding: 16,
                  backgroundColor: "rgba(32,24,18,0.05)",
                  gap: 6,
                }}
              >
                <Text style={{ color: "#201812", fontWeight: "800" }}>Notas del encounter</Text>
                <Text style={uiStyles.subtitle}>
                  {encounterBundle?.notes?.length
                    ? `${encounterBundle.notes.length} nota(s) clinicas en el episodio`
                    : "Sin notas clinicas adicionales"}
                </Text>
                {latestClinicalNote?.content ? (
                  <Text style={uiStyles.subtitle}>Ultima: {latestClinicalNote.content}</Text>
                ) : null}
              </View>
              <View
                style={{
                  flex: 1,
                  borderRadius: 18,
                  padding: 16,
                  backgroundColor: "rgba(32,24,18,0.05)",
                  gap: 6,
                }}
              >
                <Text style={{ color: "#201812", fontWeight: "800" }}>Adjuntos</Text>
                <Text style={uiStyles.subtitle}>
                  {latestAttachment
                    ? `${encounterBundle?.attachments.length ?? 0} archivo(s) en este encounter`
                    : "Sin adjuntos por ahora"}
                </Text>
                {latestAttachment ? (
                  <Text style={uiStyles.subtitle}>Ultimo: {latestAttachment.fileName}</Text>
                ) : null}
              </View>
            </View>
          </Card>

          <Card>
            <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12, alignItems: "flex-start" }}>
              <SectionTitle
                title="Cierre del episodio"
                subtitle="Cuando ya resolviste lo esencial, deja un cierre corto y marca el encounter como cerrado."
              />
              <StatusBadge
                label={encounterClosed ? "Cerrado" : "Abierto"}
                tone={encounterClosed ? "success" : "warning"}
              />
            </View>

            {encounterClosed ? (
              <InfoPanel
                title="Encounter cerrado"
                body="El episodio ya fue marcado como cerrado. Puedes seguir leyendo el contexto guardado, pero ya no deberias seguir capturando aqui."
              />
            ) : (
              <InfoPanel
                title="Cuando conviene cerrarlo"
                body="Usa este cierre cuando ya dejaste triage, nota y adjuntos necesarios. El resumen final ayuda a que web y movil lean el mismo desenlace."
              />
            )}

            <LabelledInput
              label="Resumen final del episodio"
              multiline
              value={closureSummary}
              onChangeText={setClosureSummary}
              placeholder="Ej. paciente estable, analgesia indicada, control en 48 horas, signos sin alarma"
            />

            {encounterSnapshot?.endedAt ? (
              <Text style={uiStyles.subtitle}>
                Cerrado el {formatEncounterMoment(encounterSnapshot.endedAt)}.
              </Text>
            ) : null}

            <PrimaryButton
              title={
                encounterClosed
                  ? "Encounter cerrado"
                  : closingEncounter
                    ? "Cerrando encounter..."
                    : "Cerrar encounter"
              }
              disabled={encounterClosed || closingEncounter || !closureSummary.trim()}
              onPress={async () => {
                if (!encounterId) return;
                try {
                  setError(null);
                  setSuccess(null);
                  setClosingEncounter(true);
                  await closeEncounter(supabase, {
                    encounterId,
                    summary: closureSummary.trim(),
                  });
                  await Promise.all([
                    queryClient.invalidateQueries({ queryKey: ["mobile", "encounter", encounterId] }),
                    queryClient.invalidateQueries({ queryKey: ["mobile", "encounter-bundle", encounterId] }),
                    queryClient.invalidateQueries({ queryKey: ["mobile", "encounters"] }),
                    queryClient.invalidateQueries({ queryKey: ["mobile", "patients"] }),
                  ]);
                  setSuccess("Encounter cerrado correctamente. El resumen final ya queda visible en el expediente.");
                } catch (submissionError) {
                  setError(
                    submissionError instanceof Error
                      ? submissionError.message
                      : "No se pudo cerrar el encounter.",
                  );
                } finally {
                  setClosingEncounter(false);
                }
              }}
            />
          </Card>

          <Card>
            <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12, alignItems: "flex-start" }}>
              <SectionTitle
                title="Notas rápidas del episodio"
                subtitle="Úsalas para evolución corta, indicaciones o continuidad entre superficies."
              />
              <StatusBadge
                label={`${encounterBundle?.notes?.length ?? 0} nota(s)`}
                tone={encounterBundle?.notes?.length ? "info" : "neutral"}
              />
            </View>

            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
              {[
                { value: "evolution", label: "Evolución" },
                { value: "general", label: "General" },
                { value: "patient_indications", label: "Indicaciones" },
              ].map((option) => (
                <ChoiceChip
                  key={option.value}
                  label={option.label}
                  selected={quickNoteKind === option.value}
                  onPress={() =>
                    setQuickNoteKind(
                      option.value as "general" | "evolution" | "patient_indications",
                    )
                  }
                />
              ))}
            </View>

            <LabelledInput
              label="Nueva nota breve"
              multiline
              value={quickNoteText}
              onChangeText={setQuickNoteText}
              placeholder="Ej. paciente tolera vía oral, dolor en descenso, se indican signos de alarma"
            />

            <PrimaryButton
              title={
                encounterClosed
                  ? "Encounter cerrado"
                  : savingQuickNote
                    ? "Guardando nota..."
                    : "Guardar nota rápida"
              }
              disabled={encounterClosed || savingQuickNote || !quickNoteText.trim()}
              onPress={async () => {
                if (!encounterId) return;
                try {
                  setError(null);
                  setSuccess(null);
                  setSavingQuickNote(true);
                  await saveClinicalNote(supabase, {
                    encounterId,
                    noteKind: quickNoteKind,
                    content: quickNoteText.trim(),
                  });
                  setQuickNoteText("");
                  await queryClient.invalidateQueries({
                    queryKey: ["mobile", "encounter-bundle", encounterId],
                  });
                  setSuccess("Nota clínica breve guardada en el encounter actual.");
                } catch (submissionError) {
                  setError(
                    submissionError instanceof Error
                      ? submissionError.message
                      : "No se pudo guardar la nota clínica.",
                  );
                } finally {
                  setSavingQuickNote(false);
                }
              }}
            />

            {encounterBundle?.notes?.length ? (
              <View style={{ gap: 10 }}>
                {encounterBundle.notes.slice(0, 3).map((note) => (
                  <View
                    key={note.id}
                    style={{
                      borderRadius: 18,
                      padding: 16,
                      backgroundColor: "rgba(255,255,255,0.78)",
                      borderWidth: 1,
                      borderColor: "rgba(32,24,18,0.08)",
                      gap: 6,
                    }}
                  >
                    <View
                      style={{
                        flexDirection: "row",
                        justifyContent: "space-between",
                        gap: 10,
                        alignItems: "flex-start",
                      }}
                    >
                      <StatusBadge
                        label={note.noteKind.replaceAll("_", " ")}
                        tone="info"
                      />
                      <Text style={uiStyles.subtitle}>
                        {note.createdAt ? formatEncounterMoment(note.createdAt) : "sin fecha"}
                      </Text>
                    </View>
                    <Text style={{ color: "#201812", lineHeight: 21 }}>{note.content}</Text>
                    {note.createdByName ? (
                      <Text style={uiStyles.subtitle}>Por {note.createdByName}</Text>
                    ) : null}
                  </View>
                ))}
              </View>
            ) : (
              <InfoPanel
                title="Sin notas rápidas"
                body="Aún no hay notas clínicas cortas en este episodio."
              />
            )}
          </Card>

          <Card>
            <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12, alignItems: "flex-start" }}>
              <SectionTitle
                title="Captura rápida de triage"
                subtitle={`Encounter ${encounterId.slice(0, 8)}`}
              />
              <StatusBadge label={hasVitals ? "Guardado" : "Pendiente"} tone={hasVitals ? "success" : "warning"} />
            </View>
            <InfoPanel
              title="Objetivo del bloque"
              body="Captura solo lo mínimo que cambia conducta o seguimiento. Si necesitas historia larga, eso vive mejor en web."
            />
            <View style={{ flexDirection: "row", gap: 10, flexWrap: "wrap" }}>
              {[
                { label: "Temp", value: vitalsForm.watch("temperatureC") ?? "--" },
                { label: "FC", value: vitalsForm.watch("heartRate") ?? "--" },
                { label: "Sat", value: vitalsForm.watch("oxygenSaturation") ?? "--" },
                {
                  label: "PA",
                  value:
                    vitalsForm.watch("systolic") && vitalsForm.watch("diastolic")
                      ? `${vitalsForm.watch("systolic")}/${vitalsForm.watch("diastolic")}`
                      : "--",
                },
              ].map((metric) => (
                <View
                  key={metric.label}
                  style={{
                    minWidth: 72,
                    flex: 1,
                    borderRadius: 18,
                    padding: 14,
                    backgroundColor: "rgba(32,24,18,0.05)",
                    gap: 4,
                  }}
                >
                  <Text style={{ color: "#6d635b", fontSize: 12, fontWeight: "700" }}>{metric.label}</Text>
                  <Text style={{ color: "#201812", fontSize: 18, fontWeight: "800" }}>{String(metric.value)}</Text>
                </View>
              ))}
            </View>
            <View style={{ flexDirection: "row", gap: 12 }}>
              <View style={{ flex: 1 }}>
                <LabelledInput
                  label="Temperatura"
                  keyboardType="numeric"
                  value={String(vitalsForm.watch("temperatureC") ?? "")}
                  placeholder="36.5"
                  onChangeText={(value) =>
                    vitalsForm.setValue("temperatureC", parseMaybeNumber(value))
                  }
                />
              </View>
              <View style={{ flex: 1 }}>
                <LabelledInput
                  label="Frecuencia cardiaca"
                  keyboardType="numeric"
                  value={String(vitalsForm.watch("heartRate") ?? "")}
                  placeholder="78"
                  onChangeText={(value) =>
                    vitalsForm.setValue("heartRate", parseMaybeNumber(value))
                  }
                />
              </View>
            </View>
            <View style={{ flexDirection: "row", gap: 12 }}>
              <View style={{ flex: 1 }}>
                <LabelledInput
                  label="Saturación"
                  keyboardType="numeric"
                  value={String(vitalsForm.watch("oxygenSaturation") ?? "")}
                  placeholder="98"
                  onChangeText={(value) =>
                    vitalsForm.setValue(
                      "oxygenSaturation",
                      parseMaybeNumber(value),
                    )
                  }
                />
              </View>
              <View style={{ flex: 1 }}>
                <LabelledInput
                  label="PA sistólica"
                  keyboardType="numeric"
                  value={String(vitalsForm.watch("systolic") ?? "")}
                  placeholder="120"
                  onChangeText={(value) =>
                    vitalsForm.setValue("systolic", parseMaybeNumber(value))
                  }
                />
              </View>
              <View style={{ flex: 1 }}>
                <LabelledInput
                  label="PA diastólica"
                  keyboardType="numeric"
                  value={String(vitalsForm.watch("diastolic") ?? "")}
                  placeholder="80"
                  onChangeText={(value) =>
                    vitalsForm.setValue("diastolic", parseMaybeNumber(value))
                  }
                />
              </View>
            </View>
            <LabelledInput
              label="Observación rápida"
              multiline
              value={vitalsForm.watch("notes") ?? ""}
              placeholder="Ej. paciente orientado, dolor 6/10, dificultad respiratoria leve"
              onChangeText={(value) => vitalsForm.setValue("notes", value)}
            />
            <PrimaryButton
              title={hasVitals ? "Actualizar signos vitales" : "Guardar signos vitales"}
              disabled={encounterClosed}
              onPress={vitalsForm.handleSubmit(async (values) => {
                try {
                  setError(null);
                  await saveVitalSigns(supabase, values);
                  setSuccess("Signos vitales guardados correctamente.");
                } catch (submissionError) {
                  setError(
                    submissionError instanceof Error
                      ? submissionError.message
                      : "No se pudieron guardar los signos vitales.",
                  );
                }
              })}
            />
          </Card>

          <Card>
            <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12, alignItems: "flex-start" }}>
              <SectionTitle
                title="Nota médica breve"
                subtitle="Pensada para dejar evolución útil sin escribir una historia larga en móvil."
              />
              <StatusBadge label={hasMedical ? "Guardada" : "Pendiente"} tone={hasMedical ? "success" : "warning"} />
            </View>
            <InfoPanel
              title="Qué conviene dejar aquí"
              body="Evolución corta, impresión diagnóstica y plan inmediato. Lo importante es que web y móvil lean el mismo episodio sin contradicciones."
            />
            <View
              style={{
                borderRadius: 18,
                padding: 16,
                backgroundColor: "rgba(255,255,255,0.72)",
                borderWidth: 1,
                borderColor: "rgba(32,24,18,0.08)",
                gap: 6,
              }}
            >
              <Text style={{ color: "#201812", fontWeight: "800" }}>Enfoque recomendado</Text>
              <Text style={uiStyles.subtitle}>
                Resume la evolución, deja una impresión clara y cierra con la conducta inmediata. Nada más.
              </Text>
            </View>
            <LabelledInput
              label="Evolución actual"
              multiline
              value={medicalForm.watch("currentIllness") ?? ""}
              placeholder="Resumen corto de evolución, hallazgos o síntoma principal"
              onChangeText={(value) =>
                medicalForm.setValue("currentIllness", value)
              }
            />
            <LabelledInput
              label="Impresión diagnóstica"
              multiline
              value={medicalForm.watch("diagnosticImpression") ?? ""}
              placeholder="Sospecha, impresión o problema principal"
              onChangeText={(value) =>
                medicalForm.setValue("diagnosticImpression", value)
              }
            />
            <LabelledInput
              label="Plan"
              multiline
              value={medicalForm.watch("therapeuticPlan") ?? ""}
              placeholder="Conducta, control o medicación"
              onChangeText={(value) =>
                medicalForm.setValue("therapeuticPlan", value)
              }
            />
            <PrimaryButton
              title={hasMedical ? "Actualizar nota médica" : "Guardar nota médica"}
              disabled={encounterClosed}
              onPress={medicalForm.handleSubmit(async (values) => {
                try {
                  setError(null);
                  await saveMedicalAssessment(supabase, values);
                  setSuccess("Nota médica guardada correctamente.");
                } catch (submissionError) {
                  setError(
                    submissionError instanceof Error
                      ? submissionError.message
                      : "No se pudo guardar la nota médica.",
                  );
                }
              })}
            />
          </Card>

          <Card>
            <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12, alignItems: "flex-start" }}>
              <SectionTitle
                title="Escaneo en contexto"
                subtitle="El escaneo ya no vive en perfil. Se adjunta al encounter activo."
              />
              <StatusBadge
                label={hasAttachment || scannedImage ? "Listo" : "Pendiente"}
                tone={hasAttachment || scannedImage ? "success" : "warning"}
              />
            </View>
            <InfoPanel
              title="Uso recomendado"
              body="Adjunta consentimiento, orden física o resultado recibido en mano. Si ya quedó adjunto, el resto del equipo debería verlo en el mismo encounter."
            />
            <View style={{ flexDirection: "row", gap: 12 }}>
              <View style={{ flex: 1 }}>
                <PrimaryButton
                  title="Escanear documento"
                  disabled={encounterClosed}
                  onPress={async () => {
                    try {
                      const result = await DocumentScanner.scanDocument();
                      if (result.scannedImages?.length) {
                        setScannedImage(result.scannedImages[0]);
                        setSuccess("Escaneo listo para adjuntar al encounter.");
                      }
                    } catch (scanError) {
                      Alert.alert(
                        "Escáner",
                        scanError instanceof Error
                          ? scanError.message
                          : "No se pudo escanear.",
                      );
                    }
                  }}
                />
              </View>
              <View style={{ flex: 1 }}>
                <SecondaryButton
                  title="Adjuntar al encounter"
                  disabled={!scannedImage || !selectedPatient || encounterClosed}
                  onPress={async () => {
                    if (!scannedImage || !selectedPatient || !encounterId)
                      return;

                    try {
                      setError(null);
                      await createAttachmentRecord(supabase, {
                        patientId: selectedPatient.id,
                        encounterId,
                        examOrderId: null,
                        bucket: "mobile-scans",
                        path: scannedImage,
                        fileName: `scan-${Date.now()}.jpg`,
                        mimeType: "image/jpeg",
                        category: "documento_escaneado",
                      });
                      setSuccess("Escaneo adjuntado al encounter actual.");
                    } catch (attachmentError) {
                      setError(
                        attachmentError instanceof Error
                          ? attachmentError.message
                          : "No se pudo adjuntar el escaneo.",
                      );
                    }
                  }}
                />
              </View>
            </View>

            {scannedImage ? (
              <View
                style={{
                  borderRadius: 20,
                  padding: 12,
                  backgroundColor: "rgba(32,24,18,0.04)",
                  borderWidth: 1,
                  borderColor: "rgba(32,24,18,0.08)",
                }}
              >
                <Image
                  source={{ uri: scannedImage }}
                  style={{ width: "100%", height: 260, borderRadius: 16 }}
                  resizeMode="contain"
                />
              </View>
            ) : (
              <Text style={uiStyles.subtitle}>
                Escanea consentimiento, orden física o resultado para dejarlo
                asociado al mismo episodio.
              </Text>
            )}

            {hasAttachment && !scannedImage ? (
              <View
                style={{
                  borderRadius: 16,
                  padding: 14,
                  backgroundColor: "rgba(29, 106, 72, 0.08)",
                  gap: 4,
                }}
              >
                <Text style={{ color: "#1d6a48", fontWeight: "700" }}>Ya hay adjuntos en este encounter</Text>
                <Text style={uiStyles.subtitle}>
                  El episodio ya tiene archivos asociados. Puedes seguir capturando sin perder continuidad con web.
                </Text>
              </View>
            ) : null}
          </Card>
        </>
      ) : null}
    </Screen>
  );
}
