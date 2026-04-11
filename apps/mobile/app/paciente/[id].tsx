import { calculateAge } from "@axyscare/core-clinical";
import {
  getEncounterBundle,
  getCurrentUserId,
  getPatient,
  listEncounters,
  listPatientAccess,
  removeSharedPatientFromMyList,
  revokePatientAccess,
  searchProfessionals,
  sharePatient,
  upsertPatient,
} from "@axyscare/core-db";
import { patientSchema, type PatientInput } from "@axyscare/core-validation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { Pressable, Text, View } from "react-native";
import {
  Card,
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

function getFirstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function formatEncounterDate(value: string) {
  return new Intl.DateTimeFormat("es-EC", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function buildPatientValues(patient: Awaited<ReturnType<typeof getPatient>>): PatientInput {
  return {
    firstName: patient.firstName,
    lastName: patient.lastName,
    documentType: patient.documentType,
    documentNumber: patient.documentNumber,
    birthDate: patient.birthDate,
    sex: patient.sex,
    gender: patient.gender ?? "",
    maritalStatus: patient.maritalStatus ?? "",
    occupation: patient.occupation ?? "",
    address: patient.address ?? "",
    phone: patient.phone ?? "",
    email: patient.email ?? "",
    bloodType: patient.bloodType ?? "",
    allergies: patient.allergies ?? [],
    relevantHistory: patient.relevantHistory ?? "",
    insurance: patient.insurance ?? "",
    emergencyContact: {
      name: patient.emergencyContact?.name ?? "",
      relation: patient.emergencyContact?.relation ?? "",
      phone: patient.emergencyContact?.phone ?? "",
    },
  };
}

function formatVitalsSummary(bundle: Awaited<ReturnType<typeof getEncounterBundle>> | undefined) {
  if (!bundle?.vitals) return "Sin signos vitales registrados";

  const parts = [
    bundle.vitals.temperatureC ? `${bundle.vitals.temperatureC} C` : null,
    bundle.vitals.heartRate ? `FC ${bundle.vitals.heartRate}` : null,
    bundle.vitals.oxygenSaturation ? `Sat ${bundle.vitals.oxygenSaturation}%` : null,
    bundle.vitals.systolic && bundle.vitals.diastolic
      ? `PA ${bundle.vitals.systolic}/${bundle.vitals.diastolic}`
      : null,
  ].filter(Boolean);

  return parts.length ? parts.join(" · ") : "Sin signos vitales relevantes";
}

export default function PatientDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const patientId = getFirstParam(params.id);
  const queryClient = useQueryClient();
  const [editorOpen, setEditorOpen] = useState(false);
  const [allergiesText, setAllergiesText] = useState("");
  const [shareSearch, setShareSearch] = useState("");
  const [selectedProfessionalId, setSelectedProfessionalId] = useState("");
  const [sharePermission, setSharePermission] = useState<"read" | "edit">("read");
  const [shareExpiresAtInput, setShareExpiresAtInput] = useState("");
  const [saveState, setSaveState] = useState<{ error: string | null; success: string | null }>({
    error: null,
    success: null,
  });

  const patientForm = useForm<PatientInput>({
    resolver: zodResolver(patientSchema) as any,
    defaultValues: {
      firstName: "",
      lastName: "",
      documentType: "cedula",
      documentNumber: "",
      birthDate: "",
      sex: "femenino",
      gender: "",
      maritalStatus: "",
      occupation: "",
      address: "",
      phone: "",
      email: "",
      bloodType: "",
      allergies: [],
      relevantHistory: "",
      insurance: "",
      emergencyContact: { name: "", relation: "", phone: "" },
    },
    reValidateMode: "onChange",
  });

  patientForm.register("phone");
  patientForm.register("email");
  patientForm.register("address");
  patientForm.register("insurance");
  patientForm.register("relevantHistory");
  patientForm.register("emergencyContact.name");
  patientForm.register("emergencyContact.relation");
  patientForm.register("emergencyContact.phone");

  const patientQuery = useQuery({
    queryKey: ["mobile", "patient", patientId],
    queryFn: () => getPatient(supabase, patientId!),
    enabled: Boolean(patientId),
  });

  const currentUserQuery = useQuery({
    queryKey: ["mobile", "current-user-id"],
    queryFn: () => getCurrentUserId(supabase),
  });

  const encountersQuery = useQuery({
    queryKey: ["mobile", "encounters", patientId],
    queryFn: () => listEncounters(supabase, patientId!),
    enabled: Boolean(patientId),
  });

  const patient = patientQuery.data;
  const encounters = encountersQuery.data ?? [];
  const openEncounter = encounters.find((encounter) => encounter.status === "open") ?? null;
  const recentEncounters = encounters.slice(0, 4);
  const focusEncounterId = openEncounter?.id ?? recentEncounters[0]?.id ?? null;

  const encounterBundleQuery = useQuery({
    queryKey: ["mobile", "encounter-bundle", focusEncounterId],
    queryFn: () => getEncounterBundle(supabase, focusEncounterId!),
    enabled: Boolean(focusEncounterId),
  });

  const patientAccessQuery = useQuery({
    queryKey: ["mobile", "patient-access", patientId],
    queryFn: () => listPatientAccess(supabase, patientId!),
    enabled: Boolean(patientId),
  });

  const professionalSearchQuery = useQuery({
    queryKey: ["mobile", "professional-search", shareSearch],
    queryFn: () => searchProfessionals(supabase, shareSearch.trim()),
    enabled: Boolean(patientId) && shareSearch.trim().length >= 2 && patient?.relationshipToViewer === "owner",
  });

  useMobilePatientRealtime(patientId, [
    ["mobile", "patient", patientId],
    ["mobile", "encounters", patientId],
    ["mobile", "encounters"],
    ["mobile", "encounter-bundle", focusEncounterId],
    ["mobile", "patient-access", patientId],
    ["mobile", "patients"],
    ["mobile", "patients", "owned"],
    ["mobile", "patients", "shared"],
  ]);

  useEffect(() => {
    if (!patient) return;
    patientForm.reset(buildPatientValues(patient));
    setAllergiesText((patient.allergies ?? []).join(", "));
  }, [patient, patientForm]);

  const updatePatientMutation = useMutation({
    mutationFn: (values: PatientInput) => upsertPatient(supabase, { ...values, id: patientId }),
    onSuccess: async () => {
      setSaveState({
        error: null,
        success: "Ficha actualizada. La informacion ya queda disponible para web y movil.",
      });
      setEditorOpen(false);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["mobile", "patient", patientId] }),
        queryClient.invalidateQueries({ queryKey: ["mobile", "patients"] }),
        queryClient.invalidateQueries({ queryKey: ["mobile", "patients", "owned"] }),
        queryClient.invalidateQueries({ queryKey: ["mobile", "patients", "shared"] }),
      ]);
    },
    onError: (error) => {
      setSaveState({
        error: error instanceof Error ? error.message : "No se pudo actualizar la ficha.",
        success: null,
      });
    },
  });

  const shareMutation = useMutation({
    mutationFn: () =>
      sharePatient(supabase, {
        patientId: patientId!,
        sharedWithUserId: selectedProfessionalId,
        permissionLevel: sharePermission,
        status: "active",
        expiresAt: shareExpiresAtInput ? new Date(shareExpiresAtInput).toISOString() : null,
      }),
    onSuccess: async () => {
      setSelectedProfessionalId("");
      setShareSearch("");
      setShareExpiresAtInput("");
      setSaveState({
        error: null,
        success: "Paciente compartido correctamente. El acceso ya queda visible en movil y web.",
      });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["mobile", "patient-access", patientId] }),
        queryClient.invalidateQueries({ queryKey: ["mobile", "patients", "shared"] }),
      ]);
    },
    onError: (error) => {
      setSaveState({
        error: error instanceof Error ? error.message : "No se pudo compartir el paciente.",
        success: null,
      });
    },
  });

  const revokeMutation = useMutation({
    mutationFn: (accessId: string) => revokePatientAccess(supabase, accessId),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["mobile", "patient-access", patientId] }),
        queryClient.invalidateQueries({ queryKey: ["mobile", "patients", "shared"] }),
      ]);
    },
  });

  const removeSharedMutation = useMutation({
    mutationFn: (accessId: string) => removeSharedPatientFromMyList(supabase, accessId),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["mobile", "patient-access", patientId] }),
        queryClient.invalidateQueries({ queryKey: ["mobile", "patients", "shared"] }),
      ]);
    },
  });

  const relationshipLabel = useMemo(() => {
    if (!patient?.relationshipToViewer) return "Expediente";
    return patient.relationshipToViewer === "owner" ? "Paciente propio" : "Compartido";
  }, [patient?.relationshipToViewer]);

  const relationshipTone = patient?.relationshipToViewer === "owner" ? "success" : "info";
  const isOwner = patient?.relationshipToViewer === "owner";
  const myAccess = (patientAccessQuery.data ?? []).find(
    (access) => access.sharedWithUserId === currentUserQuery.data,
  );

  return (
    <Screen>
      <Card>
        <View
          style={{
            borderRadius: 28,
            padding: 20,
            backgroundColor: "#2f5c55",
            gap: 16,
          }}
        >
          <Pressable
            onPress={() => router.back()}
            style={{
              alignSelf: "flex-start",
              borderRadius: 999,
              paddingHorizontal: 12,
              paddingVertical: 8,
              backgroundColor: "rgba(255,249,243,0.14)",
            }}
          >
            <Text style={{ color: "#fff9f3", fontWeight: "800" }}>Volver</Text>
          </Pressable>

          {patientQuery.isLoading ? (
            <>
              <Text style={{ color: "rgba(255,249,243,0.72)", fontSize: 12, fontWeight: "700", letterSpacing: 1 }}>
                FICHA MOVIL
              </Text>
              <Text style={{ color: "#fff9f3", fontSize: 28, fontWeight: "800" }}>Cargando expediente</Text>
              <Text style={{ color: "rgba(255,249,243,0.82)", lineHeight: 20 }}>
                Estamos trayendo identidad, alertas y continuidad del paciente.
              </Text>
            </>
          ) : (
            <>
              <Text style={{ color: "rgba(255,249,243,0.72)", fontSize: 12, fontWeight: "700", letterSpacing: 1 }}>
                FICHA MOVIL
              </Text>
              <Text style={{ color: "#fff9f3", fontSize: 28, fontWeight: "800" }}>
                {patient ? `${patient.firstName} ${patient.lastName}` : "Paciente no disponible"}
              </Text>
              <Text style={{ color: "rgba(255,249,243,0.82)", lineHeight: 20 }}>
                {patient
                  ? `${patient.documentNumber} · ${calculateAge(patient.birthDate)} anos · ${patient.sex}`
                  : "No fue posible cargar el contexto del paciente desde el movil."}
              </Text>

              {patient ? (
                <View style={{ flexDirection: "row", gap: 10, flexWrap: "wrap" }}>
                  <View
                    style={{
                      minWidth: 96,
                      flex: 1,
                      borderRadius: 18,
                      padding: 14,
                      backgroundColor: "rgba(255,249,243,0.14)",
                      gap: 4,
                    }}
                  >
                    <Text style={{ color: "#fff9f3", fontSize: 18, fontWeight: "800" }}>{openEncounter ? "1" : "0"}</Text>
                    <Text style={{ color: "rgba(255,249,243,0.72)" }}>encounter abierto</Text>
                  </View>
                  <View
                    style={{
                      minWidth: 96,
                      flex: 1,
                      borderRadius: 18,
                      padding: 14,
                      backgroundColor: "rgba(255,249,243,0.14)",
                      gap: 4,
                    }}
                  >
                    <Text style={{ color: "#fff9f3", fontSize: 18, fontWeight: "800" }}>
                      {patient.allergies?.length ?? 0}
                    </Text>
                    <Text style={{ color: "rgba(255,249,243,0.72)" }}>alertas</Text>
                  </View>
                  <View
                    style={{
                      minWidth: 96,
                      flex: 1,
                      borderRadius: 18,
                      padding: 14,
                      backgroundColor: "rgba(255,249,243,0.14)",
                      gap: 4,
                    }}
                  >
                    <Text style={{ color: "#fff9f3", fontSize: 18, fontWeight: "800" }}>{recentEncounters.length}</Text>
                    <Text style={{ color: "rgba(255,249,243,0.72)" }}>episodios visibles</Text>
                  </View>
                </View>
              ) : null}
            </>
          )}
        </View>
      </Card>

      {patientQuery.isError ? (
        <Card>
          <InfoPanel
            title="No se pudo abrir la ficha"
            body={patientQuery.error instanceof Error ? patientQuery.error.message : "El expediente no esta disponible."}
          />
        </Card>
      ) : null}

      {patient ? (
        <>
          <Card>
            <SectionTitle
              title="Accion clinica"
              subtitle="Entra al encounter abierto o abre una nota nueva desde esta ficha."
            />
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
              <PrimaryButton
                title={openEncounter ? "Retomar encounter" : "Abrir nueva nota"}
                onPress={() =>
                  router.push({
                    pathname: "/(tabs)/nueva-nota",
                    params: {
                      patientId: patient.id,
                      encounterId: openEncounter?.id ?? "",
                      chiefComplaint: openEncounter?.chiefComplaint ?? "",
                    },
                  })
                }
              />
              <SecondaryButton
                title={editorOpen ? "Cerrar edicion" : "Editar ficha"}
                onPress={() => {
                  setEditorOpen((current) => !current);
                  setSaveState({ error: null, success: null });
                }}
              />
            </View>
            {openEncounter ? (
              <View
                style={{
                  borderRadius: 18,
                  padding: 16,
                  backgroundColor: "rgba(21, 102, 105, 0.08)",
                  gap: 6,
                }}
              >
                <Text style={{ color: "#156669", fontWeight: "800" }}>Encounter activo</Text>
                <Text style={uiStyles.subtitle}>
                  {openEncounter.chiefComplaint || "Sin motivo registrado"} · {formatEncounterDate(openEncounter.startedAt)}
                </Text>
              </View>
            ) : (
              <InfoPanel
                title="Sin encounter abierto"
                body="Puedes abrir una nota nueva desde movil y dejar el episodio listo para continuidad con web."
              />
            )}
          </Card>

          {editorOpen ? (
            <Card>
              <SectionTitle
                title="Editar datos basicos"
                subtitle="Aqui corrige contacto, alertas y soporte del expediente sin salir del movil."
              />
              <View style={{ flexDirection: "row", gap: 12 }}>
                <View style={{ flex: 1 }}>
                  <LabelledInput
                    label="Telefono"
                    value={patientForm.watch("phone") ?? ""}
                    onChangeText={(value) =>
                      patientForm.setValue("phone", value, {
                        shouldDirty: true,
                        shouldValidate: patientForm.formState.isSubmitted,
                      })
                    }
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <LabelledInput
                    label="Correo"
                    value={patientForm.watch("email") ?? ""}
                    onChangeText={(value) =>
                      patientForm.setValue("email", value.trim().toLowerCase(), {
                        shouldDirty: true,
                        shouldValidate: patientForm.formState.isSubmitted,
                      })
                    }
                    autoCapitalize="none"
                    autoCorrect={false}
                    keyboardType="email-address"
                    error={patientForm.formState.errors.email?.message}
                  />
                </View>
              </View>

              <LabelledInput
                label="Direccion"
                value={patientForm.watch("address") ?? ""}
                onChangeText={(value) =>
                  patientForm.setValue("address", value, {
                    shouldDirty: true,
                    shouldValidate: patientForm.formState.isSubmitted,
                  })
                }
              />

              <View style={{ flexDirection: "row", gap: 12 }}>
                <View style={{ flex: 1 }}>
                  <LabelledInput
                    label="Seguro"
                    value={patientForm.watch("insurance") ?? ""}
                    onChangeText={(value) =>
                      patientForm.setValue("insurance", value, {
                        shouldDirty: true,
                        shouldValidate: patientForm.formState.isSubmitted,
                      })
                    }
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <LabelledInput
                    label="Alergias"
                    value={allergiesText}
                    onChangeText={(value) => {
                      setAllergiesText(value);
                      patientForm.setValue(
                        "allergies",
                        value
                          .split(",")
                          .map((item) => item.trim())
                          .filter(Boolean),
                        { shouldDirty: true },
                      );
                    }}
                  />
                </View>
              </View>

              <LabelledInput
                label="Antecedentes relevantes"
                value={patientForm.watch("relevantHistory") ?? ""}
                onChangeText={(value) =>
                  patientForm.setValue("relevantHistory", value, {
                    shouldDirty: true,
                    shouldValidate: patientForm.formState.isSubmitted,
                  })
                }
                multiline
              />

              <View style={{ flexDirection: "row", gap: 12 }}>
                <View style={{ flex: 1 }}>
                  <LabelledInput
                    label="Emergencia: nombre"
                    value={patientForm.watch("emergencyContact.name") ?? ""}
                    onChangeText={(value) =>
                      patientForm.setValue("emergencyContact.name", value, {
                        shouldDirty: true,
                        shouldValidate: patientForm.formState.isSubmitted,
                      })
                    }
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <LabelledInput
                    label="Relacion"
                    value={patientForm.watch("emergencyContact.relation") ?? ""}
                    onChangeText={(value) =>
                      patientForm.setValue("emergencyContact.relation", value, {
                        shouldDirty: true,
                        shouldValidate: patientForm.formState.isSubmitted,
                      })
                    }
                  />
                </View>
              </View>

              <LabelledInput
                label="Telefono de emergencia"
                value={patientForm.watch("emergencyContact.phone") ?? ""}
                onChangeText={(value) =>
                  patientForm.setValue("emergencyContact.phone", value, {
                    shouldDirty: true,
                    shouldValidate: patientForm.formState.isSubmitted,
                  })
                }
              />

              {saveState.success ? <Text style={{ color: "#1d6a48", lineHeight: 20 }}>{saveState.success}</Text> : null}
              {saveState.error ? <Text style={{ color: "#a63d3d", lineHeight: 20 }}>{saveState.error}</Text> : null}

              <View style={{ gap: 10 }}>
                <PrimaryButton
                  title={updatePatientMutation.isPending ? "Guardando cambios..." : "Guardar cambios"}
                  disabled={updatePatientMutation.isPending}
                  onPress={patientForm.handleSubmit((values) => {
                    updatePatientMutation.mutate({
                      ...values,
                      email: values.email?.trim().toLowerCase() ?? "",
                    });
                  })}
                />
                <SecondaryButton
                  title="Cancelar"
                  onPress={() => {
                    patientForm.reset(buildPatientValues(patient));
                    setAllergiesText((patient.allergies ?? []).join(", "));
                    setEditorOpen(false);
                    setSaveState({ error: null, success: null });
                  }}
                />
              </View>
            </Card>
          ) : null}

          <Card>
            <SectionTitle
              title="Colaboracion clinica"
              subtitle="Comparte el expediente con otro profesional o quitalo de tu lista si solo lo estabas consultando."
            />

            {isOwner ? (
              <>
                <LabelledInput
                  label="Buscar profesional"
                  value={shareSearch}
                  onChangeText={setShareSearch}
                  placeholder="Correo, nombre o profesion"
                />

                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
                  {[
                    { value: "read", label: "Solo lectura" },
                    { value: "edit", label: "Editable" },
                  ].map((option) => (
                    <StatusBadge
                      key={option.value}
                      label={option.label}
                      tone={sharePermission === option.value ? "info" : "neutral"}
                    />
                  ))}
                </View>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
                  <SecondaryButton title="Solo lectura" onPress={() => setSharePermission("read")} />
                  <SecondaryButton title="Editable" onPress={() => setSharePermission("edit")} />
                </View>

                <LabelledInput
                  label="Expira el"
                  value={shareExpiresAtInput}
                  onChangeText={setShareExpiresAtInput}
                  placeholder="2026-04-18T18:00"
                />

                {shareSearch.trim().length >= 2 && professionalSearchQuery.data?.length === 0 ? (
                  <InfoPanel
                    title="Sin profesionales"
                    body="No encontramos profesionales con ese criterio de busqueda."
                  />
                ) : null}

                {(professionalSearchQuery.data ?? []).map((professional) => (
                  <Pressable
                    key={professional.id}
                    onPress={() => setSelectedProfessionalId(professional.id)}
                    style={{
                      borderRadius: 18,
                      padding: 16,
                      backgroundColor:
                        selectedProfessionalId === professional.id
                          ? "rgba(21, 102, 105, 0.10)"
                          : "rgba(255,255,255,0.78)",
                      borderWidth: 1,
                      borderColor:
                        selectedProfessionalId === professional.id
                          ? "rgba(21, 102, 105, 0.24)"
                          : "rgba(32,24,18,0.08)",
                      gap: 6,
                    }}
                  >
                    <Text style={{ color: "#201812", fontWeight: "800" }}>
                      {professional.firstName} {professional.lastName}
                    </Text>
                    <Text style={uiStyles.subtitle}>
                      {professional.profession} · {professional.email}
                    </Text>
                  </Pressable>
                ))}

                <PrimaryButton
                  title={shareMutation.isPending ? "Compartiendo..." : "Compartir paciente"}
                  disabled={shareMutation.isPending || !selectedProfessionalId}
                  onPress={() => {
                    setSaveState({ error: null, success: null });
                    shareMutation.mutate();
                  }}
                />
              </>
            ) : myAccess ? (
              <>
                <InfoPanel
                  title="Mi acceso actual"
                  body={`Tu acceso es ${myAccess.permissionLevel} y aparece como ${myAccess.status}.`}
                />
                <SecondaryButton
                  title={removeSharedMutation.isPending ? "Quitando..." : "Quitar de mi lista"}
                  disabled={removeSharedMutation.isPending}
                  onPress={() => removeSharedMutation.mutate(myAccess.id)}
                />
              </>
            ) : null}

            {(patientAccessQuery.data ?? []).map((access) => (
              <View
                key={access.id}
                style={{
                  borderRadius: 18,
                  padding: 16,
                  backgroundColor: "rgba(32,24,18,0.05)",
                  gap: 8,
                }}
              >
                <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 10, alignItems: "flex-start" }}>
                  <View style={{ flex: 1, gap: 4 }}>
                    <Text style={{ color: "#201812", fontWeight: "800" }}>
                      {access.sharedWithProfile
                        ? `${access.sharedWithProfile.firstName} ${access.sharedWithProfile.lastName}`
                        : access.sharedWithUserId}
                    </Text>
                    <Text style={uiStyles.subtitle}>
                      {access.permissionLevel} · {access.status}
                    </Text>
                    {access.createdAt ? (
                      <Text style={uiStyles.subtitle}>
                        Creado {new Date(access.createdAt).toLocaleString()}
                      </Text>
                    ) : null}
                    {access.expiresAt ? (
                      <Text style={uiStyles.subtitle}>
                        Expira {new Date(access.expiresAt).toLocaleString()}
                      </Text>
                    ) : null}
                  </View>
                  <StatusBadge
                    label={access.status}
                    tone={access.status === "active" ? "success" : access.status === "pending" ? "warning" : "danger"}
                  />
                </View>

                {isOwner && access.status === "active" ? (
                  <SecondaryButton
                    title={revokeMutation.isPending ? "Revocando..." : "Revocar acceso"}
                    disabled={revokeMutation.isPending}
                    onPress={() => revokeMutation.mutate(access.id)}
                  />
                ) : null}
              </View>
            ))}
          </Card>

          <Card>
            <SectionTitle
              title="Resumen clinico"
              subtitle="Alertas y antecedentes que conviene ver antes de tocar el encounter."
            />
            <View style={{ flexDirection: "row", gap: 10, flexWrap: "wrap" }}>
              <StatusBadge label={relationshipLabel} tone={relationshipTone} />
              {patient.bloodType ? <StatusBadge label={`Grupo ${patient.bloodType}`} tone="neutral" /> : null}
              {patient.insurance ? <StatusBadge label={patient.insurance} tone="warning" /> : null}
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
              <Text style={{ color: "#201812", fontWeight: "800" }}>Alergias</Text>
              <Text style={uiStyles.subtitle}>
                {patient.allergies?.length ? patient.allergies.join(", ") : "Sin alergias registradas"}
              </Text>
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
              <Text style={{ color: "#201812", fontWeight: "800" }}>Antecedentes relevantes</Text>
              <Text style={uiStyles.subtitle}>
                {patient.relevantHistory?.trim() || "Sin antecedentes relevantes registrados"}
              </Text>
            </View>
          </Card>

          <Card>
            <SectionTitle
              title="Ultimo episodio visible"
              subtitle="Lectura corta del encounter mas reciente para no entrar a ciegas."
            />
            {focusEncounterId && encounterBundleQuery.isLoading ? (
              <InfoPanel
                title="Cargando resumen del episodio"
                body="Traemos signos, nota y contexto del encounter mas reciente."
              />
            ) : null}
            {!focusEncounterId ? (
              <InfoPanel
                title="Sin encounters visibles"
                body="Este paciente aun no tiene episodios visibles desde tu cuenta."
              />
            ) : null}
            {focusEncounterId && encounterBundleQuery.data ? (
              <>
                <View
                  style={{
                    borderRadius: 18,
                    padding: 16,
                    backgroundColor: "rgba(21, 102, 105, 0.08)",
                    gap: 6,
                  }}
                >
                  <Text style={{ color: "#156669", fontWeight: "800" }}>
                    {encounterBundleQuery.data.encounter.chiefComplaint || "Sin motivo registrado"}
                  </Text>
                  <Text style={uiStyles.subtitle}>
                    {formatEncounterDate(encounterBundleQuery.data.encounter.startedAt)} · {encounterBundleQuery.data.encounter.encounterType}
                  </Text>
                </View>

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
                    <Text style={{ color: "#201812", fontWeight: "800" }}>
                      {encounterBundleQuery.data.vitals ? "Capturado" : "Pendiente"}
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
                    <Text style={{ color: "#201812", fontWeight: "800" }}>
                      {encounterBundleQuery.data.medical ? "Guardada" : "Pendiente"}
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
                    <Text style={{ color: "#201812", fontWeight: "800" }}>
                      {encounterBundleQuery.data.attachments.length}
                    </Text>
                  </View>
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
                  <Text style={{ color: "#201812", fontWeight: "800" }}>Signos vitales</Text>
                  <Text style={uiStyles.subtitle}>{formatVitalsSummary(encounterBundleQuery.data)}</Text>
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
                  <Text style={{ color: "#201812", fontWeight: "800" }}>Impresion y plan</Text>
                  <Text style={uiStyles.subtitle}>
                    {encounterBundleQuery.data.medical?.diagnosticImpression?.trim() ||
                      encounterBundleQuery.data.medical?.currentIllness?.trim() ||
                      "Sin resumen medico breve disponible"}
                  </Text>
                  {encounterBundleQuery.data.medical?.therapeuticPlan ? (
                    <Text style={uiStyles.subtitle}>
                      Plan: {encounterBundleQuery.data.medical.therapeuticPlan}
                    </Text>
                  ) : null}
                </View>
              </>
            ) : null}
          </Card>

          <Card>
            <SectionTitle
              title="Contacto y soporte"
              subtitle="Datos utiles cuando el episodio ya esta en curso."
            />
            <View style={{ gap: 12 }}>
              <View
                style={{
                  borderRadius: 18,
                  padding: 16,
                  backgroundColor: "rgba(32,24,18,0.05)",
                  gap: 6,
                }}
              >
                <Text style={{ color: "#201812", fontWeight: "800" }}>Contacto principal</Text>
                <Text style={uiStyles.subtitle}>{patient.phone || "Sin telefono registrado"}</Text>
                <Text style={uiStyles.subtitle}>{patient.email || "Sin correo registrado"}</Text>
                <Text style={uiStyles.subtitle}>{patient.address || "Sin direccion registrada"}</Text>
              </View>

              <View
                style={{
                  borderRadius: 18,
                  padding: 16,
                  backgroundColor: "rgba(32,24,18,0.05)",
                  gap: 6,
                }}
              >
                <Text style={{ color: "#201812", fontWeight: "800" }}>Contacto de emergencia</Text>
                <Text style={uiStyles.subtitle}>{patient.emergencyContact?.name || "Sin nombre registrado"}</Text>
                <Text style={uiStyles.subtitle}>
                  {patient.emergencyContact?.relation || "Sin relacion registrada"}
                </Text>
                <Text style={uiStyles.subtitle}>
                  {patient.emergencyContact?.phone || "Sin telefono de emergencia"}
                </Text>
              </View>
            </View>
          </Card>

          <Card>
            <SectionTitle
              title="Continuidad del expediente"
              subtitle="Ultimos episodios visibles desde movil para no perder contexto."
            />
            {encountersQuery.isLoading ? (
              <InfoPanel
                title="Cargando episodios"
                body="Estamos preparando encounters recientes y el estado actual del paciente."
              />
            ) : null}
            {!encountersQuery.isLoading && recentEncounters.length === 0 ? (
              <InfoPanel
                title="Sin episodios visibles"
                body="Aun no hay encounters para este paciente o no estan disponibles para tu cuenta."
              />
            ) : null}
            {recentEncounters.map((encounter) => (
              <View
                key={encounter.id}
                style={{
                  borderRadius: 20,
                  padding: 16,
                  backgroundColor: "rgba(255,255,255,0.88)",
                  borderWidth: 1,
                  borderColor: "rgba(32,24,18,0.08)",
                  gap: 10,
                }}
              >
                <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 10, alignItems: "flex-start" }}>
                  <View style={{ flex: 1, gap: 4 }}>
                    <Text style={{ color: "#201812", fontWeight: "800" }}>
                      {encounter.chiefComplaint || "Sin motivo registrado"}
                    </Text>
                    <Text style={uiStyles.subtitle}>
                      {formatEncounterDate(encounter.startedAt)} · {encounter.encounterType}
                    </Text>
                  </View>
                  <StatusBadge
                    label={encounter.status === "open" ? "Abierto" : "Cerrado"}
                    tone={encounter.status === "open" ? "info" : "neutral"}
                  />
                </View>
                <PrimaryButton
                  title={encounter.status === "open" ? "Retomar" : "Abrir nueva nota"}
                  onPress={() =>
                    router.push({
                      pathname: "/(tabs)/nueva-nota",
                      params: {
                        patientId: patient.id,
                        encounterId: encounter.status === "open" ? encounter.id : "",
                        chiefComplaint: encounter.chiefComplaint ?? "",
                      },
                    })
                  }
                />
              </View>
            ))}
          </Card>
        </>
      ) : null}
    </Screen>
  );
}
