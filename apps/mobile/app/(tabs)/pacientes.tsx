import { documentTypes, sexOptions } from "@axyscare/core-catalogs";
import { calculateAge } from "@axyscare/core-clinical";
import {
  listEncounters,
  listOwnedPatients,
  listSharedPatientsWithMe,
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
  ChoiceChip,
  DateField,
  InfoPanel,
  LabelledInput,
  PrimaryButton,
  Screen,
  SecondaryButton,
  SectionTitle,
  StatusBadge,
  uiStyles,
} from "../../components/ui";
import { useMobileTableRealtime } from "../../lib/realtime";
import { supabase } from "../../lib/client";

const patientDefaults: PatientInput = {
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
};

export default function PatientsTab() {
  const router = useRouter();
  const params = useLocalSearchParams<{ compose?: string | string[] }>();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [composerOpen, setComposerOpen] = useState(false);
  const [allergiesText, setAllergiesText] = useState("");
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);

  const ownPatientsQuery = useQuery({
    queryKey: ["mobile", "patients", "owned"],
    queryFn: () => listOwnedPatients(supabase),
  });
  const sharedPatientsQuery = useQuery({
    queryKey: ["mobile", "patients", "shared"],
    queryFn: () => listSharedPatientsWithMe(supabase),
  });
  const encountersQuery = useQuery({
    queryKey: ["mobile", "encounters"],
    queryFn: () => listEncounters(supabase),
  });

  const patientForm = useForm<PatientInput>({
    resolver: zodResolver(patientSchema) as any,
    defaultValues: patientDefaults,
    reValidateMode: "onChange",
  });

  patientForm.register("firstName");
  patientForm.register("lastName");
  patientForm.register("documentType");
  patientForm.register("documentNumber");
  patientForm.register("birthDate");
  patientForm.register("sex");
  patientForm.register("phone");
  patientForm.register("email");
  patientForm.register("relevantHistory");

  useMobileTableRealtime(
    "mobile-patient-access",
    ["patient_access", "patients", "encounters"],
    [
      ["mobile", "patients"],
      ["mobile", "patients", "owned"],
      ["mobile", "patients", "shared"],
      ["mobile", "patients", "encounter"],
      ["mobile", "encounters"],
    ],
  );

  const createPatientMutation = useMutation({
    mutationFn: (values: PatientInput) => upsertPatient(supabase, values),
    onSuccess: async (patient) => {
      setSaveError(null);
      setSaveSuccess("Paciente creado. Ya puedes abrir una nota o retomar el expediente desde móvil.");
      setComposerOpen(false);
      setAllergiesText("");
      patientForm.reset(patientDefaults);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["mobile", "patients"] }),
        queryClient.invalidateQueries({ queryKey: ["mobile", "patients", "owned"] }),
        queryClient.invalidateQueries({ queryKey: ["mobile", "patients", "shared"] }),
        queryClient.invalidateQueries({ queryKey: ["mobile", "patients", "encounter"] }),
      ]);
    },
    onError: (error) => {
      setSaveSuccess(null);
      setSaveError(error instanceof Error ? error.message : "No se pudo guardar el paciente.");
    },
  });

  const searchTerm = search.trim().toLowerCase();
  const ownedPatients = useMemo(() => {
    const patients = ownPatientsQuery.data ?? [];
    if (!searchTerm) return patients;
    return patients.filter((patient) =>
      `${patient.firstName} ${patient.lastName} ${patient.documentNumber} ${patient.phone ?? ""} ${patient.email ?? ""}`
        .toLowerCase()
        .includes(searchTerm),
    );
  }, [ownPatientsQuery.data, searchTerm]);

  const sharedPatients = useMemo(() => {
    const accesses = sharedPatientsQuery.data ?? [];
    if (!searchTerm) return accesses;
    return accesses.filter((access) =>
      `${access.patient?.firstName ?? ""} ${access.patient?.lastName ?? ""} ${access.patient?.documentNumber ?? ""} ${access.patient?.email ?? ""}`
        .toLowerCase()
        .includes(searchTerm),
    );
  }, [searchTerm, sharedPatientsQuery.data]);

  const openEncounters = new Map(
    (encountersQuery.data ?? [])
      .filter((encounter) => encounter.status === "open")
      .map((encounter) => [encounter.patientId, encounter]),
  );
  const patientById = new Map([
    ...((ownPatientsQuery.data ?? []).map((patient) => [patient.id, patient] as const)),
    ...((sharedPatientsQuery.data ?? [])
      .flatMap((access) => (access.patient ? [[access.patient.id, access.patient] as const] : []))),
  ]);
  const openEncounterList = (encountersQuery.data ?? [])
    .filter((encounter) => encounter.status === "open")
    .slice(0, 3);
  const closedEncounterList = (encountersQuery.data ?? [])
    .filter((encounter) => encounter.status === "closed")
    .filter((encounter) => {
      if (!searchTerm) return true;
      const patient = patientById.get(encounter.patientId);
      const haystack = `${patient?.firstName ?? ""} ${patient?.lastName ?? ""} ${patient?.documentNumber ?? ""} ${
        encounter.chiefComplaint ?? ""
      }`.toLowerCase();
      return haystack.includes(searchTerm);
    })
    .slice(0, 4);
  const newestOpenEncounter = openEncounterList[0] ?? null;

  useEffect(() => {
    const composeParam = Array.isArray(params.compose) ? params.compose[0] : params.compose;
    if (composeParam === "1") {
      setComposerOpen(true);
    }
  }, [params.compose]);

  function openPatientDetail(patientId: string) {
    router.push(`/paciente/${patientId}` as any);
  }

  function openPatientWorkspace(patientId: string, encounterId?: string | null, chiefComplaint?: string | null) {
    router.push({
      pathname: "/(tabs)/nueva-nota",
      params: {
        patientId,
        encounterId: encounterId ?? "",
        chiefComplaint: chiefComplaint ?? "",
      },
    });
  }

  return (
    <Screen>
      <Card>
        <SectionTitle
          title="Pacientes"
          subtitle="Busca en listado y registra un paciente nuevo solo cuando lo necesites."
        />
        <View style={{ flexDirection: "row", gap: 12 }}>
          <View
            style={{
              flex: 1,
              borderRadius: 18,
              padding: 14,
              backgroundColor: "rgba(140, 75, 48, 0.08)",
              gap: 4,
            }}
          >
            <Text style={{ color: "#8c4b30", fontSize: 22, fontWeight: "700" }}>{ownPatientsQuery.data?.length ?? 0}</Text>
            <Text style={uiStyles.subtitle}>propios</Text>
          </View>
          <View
            style={{
              flex: 1,
              borderRadius: 18,
              padding: 14,
              backgroundColor: "rgba(21, 102, 105, 0.08)",
              gap: 4,
            }}
          >
            <Text style={{ color: "#156669", fontSize: 22, fontWeight: "700" }}>{openEncounterList.length}</Text>
            <Text style={uiStyles.subtitle}>encounters abiertos</Text>
          </View>
        </View>
        <View style={{ gap: 10 }}>
          <PrimaryButton
            title={composerOpen ? "Ocultar formulario" : "Registrar paciente"}
            onPress={() => {
              setComposerOpen((current) => !current);
              setSaveError(null);
              setSaveSuccess(null);
            }}
          />
          {newestOpenEncounter ? (
            <SecondaryButton
              title="Retomar último encounter"
              onPress={() =>
                router.push({
                  pathname: "/(tabs)/nueva-nota",
                  params: {
                    patientId: newestOpenEncounter.patientId,
                    encounterId: newestOpenEncounter.id,
                    chiefComplaint: newestOpenEncounter.chiefComplaint ?? "",
                  },
                })
              }
            />
          ) : null}
        </View>
      </Card>

      {composerOpen ? (
        <Card>
          <SectionTitle
            title="Nuevo paciente"
            subtitle="Formulario compacto para que el alta no te saque del flujo clínico."
          />

          <View style={{ flexDirection: "row", gap: 12 }}>
            <View style={{ flex: 1 }}>
              <LabelledInput
                label="Nombres"
                value={patientForm.watch("firstName")}
                onChangeText={(value) =>
                  patientForm.setValue("firstName", value, {
                    shouldDirty: true,
                    shouldValidate: patientForm.formState.isSubmitted,
                  })
                }
                error={patientForm.formState.errors.firstName?.message}
              />
            </View>
            <View style={{ flex: 1 }}>
              <LabelledInput
                label="Apellidos"
                value={patientForm.watch("lastName")}
                onChangeText={(value) =>
                  patientForm.setValue("lastName", value, {
                    shouldDirty: true,
                    shouldValidate: patientForm.formState.isSubmitted,
                  })
                }
                error={patientForm.formState.errors.lastName?.message}
              />
            </View>
          </View>

          <Text style={uiStyles.label}>Tipo de documento</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
            {documentTypes.map((option) => (
              <ChoiceChip
                key={option}
                label={option}
                selected={patientForm.watch("documentType") === option}
                onPress={() =>
                  patientForm.setValue("documentType", option, {
                    shouldDirty: true,
                    shouldValidate: patientForm.formState.isSubmitted,
                  })
                }
              />
            ))}
          </View>

          <LabelledInput
            label="Documento"
            value={patientForm.watch("documentNumber")}
            onChangeText={(value) =>
              patientForm.setValue("documentNumber", value, {
                shouldDirty: true,
                shouldValidate: patientForm.formState.isSubmitted,
              })
            }
            placeholder="Cédula, DNI o pasaporte"
            error={patientForm.formState.errors.documentNumber?.message}
          />

          <View style={{ flexDirection: "row", gap: 12 }}>
            <View style={{ flex: 1 }}>
              <DateField
                label="Fecha de nacimiento"
                value={patientForm.watch("birthDate")}
                onChange={(value) =>
                  patientForm.setValue("birthDate", value, {
                    shouldDirty: true,
                    shouldValidate: patientForm.formState.isSubmitted,
                  })
                }
                error={patientForm.formState.errors.birthDate?.message}
              />
            </View>
            <View style={{ flex: 1, gap: 8 }}>
              <Text style={uiStyles.label}>Sexo</Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                {sexOptions.map((option) => (
                  <ChoiceChip
                    key={option}
                    label={option.replace("_", " ")}
                    selected={patientForm.watch("sex") === option}
                    onPress={() =>
                      patientForm.setValue("sex", option, {
                        shouldDirty: true,
                        shouldValidate: patientForm.formState.isSubmitted,
                      })
                    }
                  />
                ))}
              </View>
            </View>
          </View>

          <View style={{ flexDirection: "row", gap: 12 }}>
            <View style={{ flex: 1 }}>
              <LabelledInput
                label="Teléfono"
                value={patientForm.watch("phone") ?? ""}
                onChangeText={(value) =>
                  patientForm.setValue("phone", value, {
                    shouldDirty: true,
                    shouldValidate: patientForm.formState.isSubmitted,
                  })
                }
                placeholder="0999999999"
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
                placeholder="paciente@correo.com"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                error={patientForm.formState.errors.email?.message}
              />
            </View>
          </View>

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
                {
                  shouldDirty: true,
                },
              );
            }}
            placeholder="penicilina, mariscos, látex"
          />

          <LabelledInput
            label="Antecedente relevante"
            value={patientForm.watch("relevantHistory") ?? ""}
            onChangeText={(value) =>
              patientForm.setValue("relevantHistory", value, {
                shouldDirty: true,
                shouldValidate: patientForm.formState.isSubmitted,
              })
            }
            placeholder="HTA, diabetes, asma, embarazo, cirugía reciente"
            multiline
          />

          {saveSuccess ? <Text style={{ color: "#1d6a48", lineHeight: 20 }}>{saveSuccess}</Text> : null}
          {saveError ? <Text style={{ color: "#a63d3d", lineHeight: 20 }}>{saveError}</Text> : null}

          <View style={{ gap: 10 }}>
            <PrimaryButton
              title={createPatientMutation.isPending ? "Guardando paciente..." : "Guardar paciente"}
              disabled={createPatientMutation.isPending}
              onPress={patientForm.handleSubmit((values) => {
                createPatientMutation.mutate({
                  ...values,
                  email: values.email?.trim().toLowerCase() ?? "",
                });
              })}
            />
            <SecondaryButton
              title="Cancelar"
              onPress={() => {
                setComposerOpen(false);
                setSaveError(null);
                setSaveSuccess(null);
              }}
            />
          </View>
        </Card>
      ) : null}

      <Card>
        <SectionTitle
          title="Filtro rápido"
          subtitle="Busca por nombre, documento o teléfono sin perder de vista los encuentros abiertos."
        />
        <LabelledInput
          label="Buscar paciente"
          placeholder="Nombre, documento o teléfono"
          value={search}
          onChangeText={setSearch}
        />
      </Card>

      <Card>
        <SectionTitle
          title="Retomar ahora"
          subtitle="Encuentros abiertos que conviene cerrar antes de abrir otro episodio."
        />
        {openEncounterList.length === 0 ? (
          <Text style={uiStyles.subtitle}>No hay encuentros abiertos que necesiten continuidad inmediata.</Text>
        ) : null}
        {openEncounterList.map((encounter) => (
          <Pressable
            key={encounter.id}
            onPress={() =>
              router.push({
                pathname: "/(tabs)/nueva-nota",
                params: {
                  patientId: encounter.patientId,
                  encounterId: encounter.id,
                  chiefComplaint: encounter.chiefComplaint ?? "",
                },
              })
            }
            style={{
              borderRadius: 18,
              padding: 16,
              backgroundColor: "rgba(21, 102, 105, 0.08)",
              gap: 6,
            }}
          >
            <Text style={{ fontWeight: "700", color: "#201812" }}>
              {encounter.chiefComplaint || "Sin motivo registrado"}
            </Text>
            <Text style={uiStyles.subtitle}>
              {new Date(encounter.startedAt).toLocaleString()} · {encounter.encounterType}
            </Text>
          </Pressable>
        ))}
      </Card>

      <Card>
        <SectionTitle
          title="Cerrados recientes"
          subtitle="Seguimiento corto de episodios ya resueltos para no perder continuidad."
        />
        {closedEncounterList.length === 0 ? (
          <Text style={uiStyles.subtitle}>No hay encounters cerrados recientes para mostrar.</Text>
        ) : null}
        {closedEncounterList.map((encounter) => {
          const patient = patientById.get(encounter.patientId);
          return (
            <View
              key={encounter.id}
              style={{
                borderRadius: 18,
                padding: 16,
                backgroundColor: "rgba(32,24,18,0.05)",
                gap: 8,
              }}
            >
              <View
                style={{ flexDirection: "row", justifyContent: "space-between", gap: 10, alignItems: "flex-start" }}
              >
                <View style={{ flex: 1, gap: 4 }}>
                  <Text style={{ fontWeight: "800", color: "#201812" }}>
                    {patient ? `${patient.firstName} ${patient.lastName}` : "Paciente no identificado"}
                  </Text>
                  <Text style={uiStyles.subtitle}>
                    {encounter.chiefComplaint || "Sin motivo registrado"} ·{" "}
                    {encounter.endedAt
                      ? new Date(encounter.endedAt).toLocaleString()
                      : new Date(encounter.startedAt).toLocaleString()}
                  </Text>
                  {encounter.summary ? (
                    <Text style={uiStyles.subtitle}>Cierre: {encounter.summary}</Text>
                  ) : null}
                </View>
                <StatusBadge label="Cerrado" tone="success" />
              </View>

              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
                {patient ? (
                  <SecondaryButton title="Ver ficha" onPress={() => openPatientDetail(patient.id)} />
                ) : null}
                <PrimaryButton
                  title="Abrir nuevo episodio"
                  onPress={() => openPatientWorkspace(encounter.patientId, null, encounter.chiefComplaint)}
                />
              </View>
            </View>
          );
        })}
      </Card>

      <Card>
        <SectionTitle
          title="Pacientes propios"
          subtitle="Tu base clínica principal con salida directa a triage o nueva nota."
        />
        {ownPatientsQuery.isLoading ? (
          <InfoPanel
            title="Cargando pacientes"
            body="Estamos preparando la base clínica y los encuentros abiertos."
          />
        ) : null}
        {!ownPatientsQuery.isLoading && ownedPatients.length === 0 ? (
          <InfoPanel
            title="Sin resultados"
            body="No encontramos pacientes con ese criterio. Usa la alta rápida de arriba para crear uno desde móvil."
          />
        ) : null}
        {ownedPatients.map((patient) => {
          const openEncounter = openEncounters.get(patient.id);
          return (
            <View
              key={patient.id}
              style={{
                padding: 16,
                borderRadius: 20,
                borderWidth: 1,
                borderColor: "rgba(32,24,18,0.08)",
                backgroundColor: "rgba(255,255,255,0.9)",
                gap: 12,
              }}
            >
              <View
                style={{ flexDirection: "row", justifyContent: "space-between", gap: 10, alignItems: "flex-start" }}
              >
                <View style={{ flex: 1, gap: 4 }}>
                  <Text style={{ fontWeight: "700", color: "#201812", fontSize: 17 }}>
                    {patient.firstName} {patient.lastName}
                  </Text>
                  <Text style={uiStyles.subtitle}>
                    {patient.documentNumber} · {calculateAge(patient.birthDate)} años · {patient.sex}
                  </Text>
                  <Text style={uiStyles.subtitle}>
                    {patient.allergies?.length
                      ? `Alergias: ${patient.allergies.join(", ")}`
                      : "Sin alergias registradas"}
                  </Text>
                </View>
                <StatusBadge
                  label={openEncounter ? "Encounter abierto" : "Sin encounter"}
                  tone={openEncounter ? "info" : "neutral"}
                />
              </View>

              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
                <SecondaryButton
                  title="Ver ficha"
                  onPress={() => openPatientDetail(patient.id)}
                />
                <PrimaryButton
                  title={openEncounter ? "Retomar atención" : "Nueva nota"}
                  onPress={() => openPatientWorkspace(patient.id, openEncounter?.id, openEncounter?.chiefComplaint)}
                />
              </View>
            </View>
          );
        })}
      </Card>

      <Card>
        <SectionTitle
          title="Compartidos conmigo"
          subtitle="Pacientes compartidos por otros profesionales con permisos vigentes."
        />
        {!sharedPatientsQuery.isLoading && sharedPatients.length === 0 ? (
          <Text style={uiStyles.subtitle}>
            No hay pacientes compartidos que coincidan con la búsqueda.
          </Text>
        ) : null}
        {sharedPatients.map((access) => {
          const patient = access.patient;
          const openEncounter = patient ? openEncounters.get(patient.id) : null;
          return (
            <View
              key={access.id}
              style={{
                padding: 16,
                borderRadius: 20,
                borderWidth: 1,
                borderColor: "rgba(32,24,18,0.08)",
                backgroundColor: "rgba(255,255,255,0.9)",
                gap: 12,
              }}
            >
              <View
                style={{ flexDirection: "row", justifyContent: "space-between", gap: 10, alignItems: "flex-start" }}
              >
                <View style={{ flex: 1, gap: 4 }}>
                  <Text style={{ fontWeight: "700", color: "#201812" }}>
                    {patient?.firstName} {patient?.lastName}
                  </Text>
                  <Text style={uiStyles.subtitle}>
                    {patient?.documentNumber ?? "Sin documento"} · permiso {access.permissionLevel}
                  </Text>
                  <Text style={uiStyles.subtitle}>
                    Propietario{" "}
                    {access.ownerProfile
                      ? `${access.ownerProfile.firstName} ${access.ownerProfile.lastName}`
                      : access.ownerUserId}
                  </Text>
                </View>
                <StatusBadge
                  label={access.permissionLevel === "edit" ? "Editable" : "Solo lectura"}
                  tone={access.permissionLevel === "edit" ? "info" : "warning"}
                />
              </View>

              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
                {patient ? (
                  <SecondaryButton
                    title="Ver ficha"
                    onPress={() => openPatientDetail(patient.id)}
                  />
                ) : null}
                {access.permissionLevel === "edit" && patient ? (
                  <PrimaryButton
                    title={openEncounter ? "Retomar atención" : "Abrir nota"}
                    onPress={() => openPatientWorkspace(patient.id, openEncounter?.id, openEncounter?.chiefComplaint)}
                  />
                ) : (
                  <SecondaryButton title="Solo lectura" disabled onPress={() => undefined} />
                )}
              </View>
            </View>
          );
        })}
      </Card>
    </Screen>
  );
}
