import {
  createEncounterFromAppointment,
  getProfessionalSettings,
  listAppointments,
  listPatients,
  upsertAppointment,
  updateAppointmentStatus,
} from "@axyscare/core-db";
import { appointmentStatuses, appointmentTypes } from "@axyscare/core-catalogs";
import { appointmentSchema, type AppointmentInput } from "@axyscare/core-validation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { Alert, Linking, Pressable, Text, View } from "react-native";
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
import { useSession } from "../../lib/providers";

function formatAgendaDate(value: string) {
  return new Intl.DateTimeFormat("es-EC", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatAgendaTime(value: string) {
  return new Intl.DateTimeFormat("es-EC", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function getStatusTone(status: string): "warning" | "info" | "success" | "danger" | "neutral" {
  if (status === "programada") return "warning";
  if (status === "confirmada") return "info";
  if (status === "atendida") return "success";
  if (status === "cancelada" || status === "no_asistio") return "danger";
  return "neutral";
}

function getModalityLabel(modality: string) {
  if (modality === "virtual") return "Teleconsulta";
  if (modality === "domicilio") return "Domicilio";
  return "Presencial";
}

function formatDateTimeInput(value: string) {
  return new Date(value).toISOString().slice(0, 16);
}

function buildDefaultRange() {
  const now = new Date();
  const start = new Date(now);
  start.setMinutes(Math.ceil(start.getMinutes() / 30) * 30, 0, 0);
  const end = new Date(start);
  end.setMinutes(end.getMinutes() + 30);
  return {
    startAt: start.toISOString().slice(0, 16),
    endAt: end.toISOString().slice(0, 16),
  };
}

export default function AgendaTab() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useSession();
  const [activeAppointmentId, setActiveAppointmentId] = useState<string | null>(null);
  const [composerOpen, setComposerOpen] = useState(false);
  const [editingAppointmentId, setEditingAppointmentId] = useState<string | null>(null);
  const [appointmentPatientSearch, setAppointmentPatientSearch] = useState("");
  const [agendaSearch, setAgendaSearch] = useState("");
  const [agendaScope, setAgendaScope] = useState<"today" | "upcoming" | "all">("today");
  const [agendaStatusFilter, setAgendaStatusFilter] = useState<"all" | "programada" | "confirmada" | "atendida" | "cancelada">("all");
  const [agendaModalityFilter, setAgendaModalityFilter] = useState<"all" | "presencial" | "virtual" | "domicilio">("all");
  const [appointmentFeedback, setAppointmentFeedback] = useState<{ error: string | null; success: string | null }>({
    error: null,
    success: null,
  });
  const appointmentsQuery = useQuery({
    queryKey: ["mobile", "agenda"],
    queryFn: () => listAppointments(supabase),
  });
  const patientsQuery = useQuery({
    queryKey: ["mobile", "patients", "appointment-composer"],
    queryFn: () => listPatients(supabase),
  });
  const settingsQuery = useQuery({
    queryKey: ["mobile", "professional-settings", user?.id],
    queryFn: () => getProfessionalSettings(supabase, user!.id),
    enabled: Boolean(user?.id),
  });

  const appointmentForm = useForm<AppointmentInput>({
    resolver: zodResolver(appointmentSchema),
    defaultValues: {
      patientId: "",
      professionalId: undefined,
      ...buildDefaultRange(),
      reason: "",
      type: "presencial",
      modality: "presencial",
      status: "programada",
      notes: "",
      meetLink: "",
    },
  });

  appointmentForm.register("patientId");
  appointmentForm.register("type");
  appointmentForm.register("modality");
  appointmentForm.register("status");
  appointmentForm.register("reason");
  appointmentForm.register("startAt");
  appointmentForm.register("endAt");
  appointmentForm.register("notes");
  appointmentForm.register("meetLink");

  useMobileTableRealtime("mobile-agenda", ["appointments"], [
    ["mobile", "agenda"],
    ["mobile", "appointments"],
  ]);

  const appointments = appointmentsQuery.data ?? [];
  const patients = patientsQuery.data ?? [];
  const today = new Date().toDateString();
  const startOfToday = useMemo(() => new Date(new Date().setHours(0, 0, 0, 0)), []);
  const filteredAgenda = useMemo(() => {
    const search = agendaSearch.trim().toLowerCase();

    return appointments.filter((appointment) => {
      const appointmentDate = new Date(appointment.startAt);
      const matchesScope =
        agendaScope === "all"
          ? true
          : agendaScope === "today"
            ? appointmentDate.toDateString() === today
            : appointmentDate >= startOfToday && appointmentDate.toDateString() !== today;
      const matchesStatus =
        agendaStatusFilter === "all" ? true : appointment.status === agendaStatusFilter;
      const matchesModality =
        agendaModalityFilter === "all" ? true : appointment.modality === agendaModalityFilter;
      const haystack = `${appointment.reason} ${appointment.type} ${appointment.status} ${appointment.modality} ${
        appointment.notes ?? ""
      }`.toLowerCase();
      const matchesSearch = !search || haystack.includes(search);

      return matchesScope && matchesStatus && matchesModality && matchesSearch;
    });
  }, [agendaModalityFilter, agendaScope, agendaSearch, agendaStatusFilter, appointments, startOfToday, today]);
  const todayAppointments = useMemo(
    () => filteredAgenda.filter((appointment) => new Date(appointment.startAt).toDateString() === today),
    [filteredAgenda, today],
  );
  const immediateQueue = todayAppointments.filter((appointment) => appointment.status !== "cancelada");
  const pendingAppointments = filteredAgenda.filter(
    (appointment) => appointment.status === "programada" || appointment.status === "confirmada",
  );
  const confirmedToday = todayAppointments.filter((appointment) => appointment.status === "confirmada").length;
  const virtualToday = todayAppointments.filter(
    (appointment) => appointment.status !== "cancelada" && appointment.modality === "virtual",
  ).length;
  const nextAppointments = filteredAgenda
    .filter((appointment) => new Date(appointment.startAt).toDateString() !== today)
    .slice(0, 5);
  const hasAgendaFilters =
    agendaSearch.trim().length > 0 ||
    agendaScope !== "today" ||
    agendaStatusFilter !== "all" ||
    agendaModalityFilter !== "all";
  const filteredPatients = useMemo(() => {
    const term = appointmentPatientSearch.trim().toLowerCase();
    if (!term) return patients.slice(0, 6);
    return patients
      .filter((patient) =>
        `${patient.firstName} ${patient.lastName} ${patient.documentNumber}`.toLowerCase().includes(term),
      )
      .slice(0, 6);
  }, [appointmentPatientSearch, patients]);

  const appointmentMutation = useMutation({
    mutationFn: (values: AppointmentInput) =>
      upsertAppointment(supabase, {
        ...values,
        id: editingAppointmentId ?? undefined,
        startAt: new Date(values.startAt).toISOString(),
        endAt: new Date(values.endAt).toISOString(),
      }),
    onSuccess: async () => {
      setAppointmentFeedback({
        error: null,
        success: editingAppointmentId ? "Cita actualizada correctamente." : "Cita creada correctamente.",
      });
      setComposerOpen(false);
      setEditingAppointmentId(null);
      appointmentForm.reset({
        patientId: "",
        professionalId: undefined,
        ...buildDefaultRange(),
        reason: "",
        type: "presencial",
        modality: "presencial",
        status: "programada",
        notes: "",
        meetLink: "",
      });
      setAppointmentPatientSearch("");
      await queryClient.invalidateQueries({ queryKey: ["mobile", "agenda"] });
    },
    onError: (error) => {
      setAppointmentFeedback({
        error: error instanceof Error ? error.message : "No se pudo guardar la cita.",
        success: null,
      });
    },
  });

  useEffect(() => {
    if (!editingAppointmentId) return;
    const appointment = appointments.find((item) => item.id === editingAppointmentId);
    if (!appointment) return;
    appointmentForm.reset({
      patientId: appointment.patientId,
      professionalId: appointment.professionalId,
      startAt: formatDateTimeInput(appointment.startAt),
      endAt: formatDateTimeInput(appointment.endAt),
      reason: appointment.reason,
      type: appointment.type,
      modality: appointment.modality,
      status: appointment.status,
      notes: appointment.notes ?? "",
      meetLink: appointment.meetLink ?? "",
    });
  }, [appointmentForm, appointments, editingAppointmentId]);

  async function runAppointmentAction(appointmentId: string, action: () => Promise<void>) {
    try {
      setActiveAppointmentId(appointmentId);
      await action();
      await queryClient.invalidateQueries({ queryKey: ["mobile", "agenda"] });
    } catch (error) {
      Alert.alert("Agenda", error instanceof Error ? error.message : "No se pudo completar la acción.");
    } finally {
      setActiveAppointmentId(null);
    }
  }

  return (
    <Screen>
      <Card>
        <View
          style={{
            borderRadius: 28,
            padding: 20,
            backgroundColor: "#173f48",
            gap: 16,
          }}
        >
          <Text style={{ color: "rgba(255,249,243,0.72)", fontSize: 12, fontWeight: "700", letterSpacing: 1 }}>
            AGENDA OPERATIVA
          </Text>
          <Text style={{ color: "#fff9f3", fontSize: 28, fontWeight: "800" }}>
            {immediateQueue.length} en cola inmediata y {pendingAppointments.length} por resolver
          </Text>
          <Text style={{ color: "rgba(255,249,243,0.82)", lineHeight: 20 }}>
            Agenda simple para confirmar, editar o atender sin salir del iPhone.
          </Text>

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
              <Text style={{ color: "#fff9f3", fontSize: 18, fontWeight: "800" }}>{immediateQueue.length}</Text>
              <Text style={{ color: "rgba(255,249,243,0.72)" }}>ahora</Text>
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
              <Text style={{ color: "#fff9f3", fontSize: 18, fontWeight: "800" }}>{confirmedToday}</Text>
              <Text style={{ color: "rgba(255,249,243,0.72)" }}>confirmadas hoy</Text>
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
              <Text style={{ color: "#fff9f3", fontSize: 18, fontWeight: "800" }}>{virtualToday}</Text>
              <Text style={{ color: "rgba(255,249,243,0.72)" }}>virtuales</Text>
            </View>
          </View>
        </View>
      </Card>

      <Card>
        <SectionTitle title="Buscar" subtitle="Filtra solo por lo necesario." />
        <LabelledInput
          label="Buscar en agenda"
          value={agendaSearch}
          onChangeText={setAgendaSearch}
          placeholder="Motivo, estado, modalidad o nota"
        />

        <Text style={uiStyles.label}>Rango</Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
          {[
            { value: "today", label: "Hoy" },
            { value: "upcoming", label: "Próximas" },
            { value: "all", label: "Todas" },
          ].map((option) => (
            <ChoiceChip
              key={option.value}
              label={option.label}
              selected={agendaScope === option.value}
              onPress={() => setAgendaScope(option.value as "today" | "upcoming" | "all")}
            />
          ))}
        </View>

        {hasAgendaFilters ? (
          <InfoPanel
            title="Filtros activos"
            body={`Mostrando ${filteredAgenda.length} cita(s) con la combinacion actual.`}
          />
        ) : null}
      </Card>

      <Card>
        <SectionTitle
          title="Crear o editar cita"
          subtitle="Agenda rápida desde móvil para registrar o corregir una cita sin pasar por escritorio."
        />
        <View style={{ gap: 10 }}>
          <PrimaryButton
            title={
              composerOpen
                ? editingAppointmentId
                  ? "Ocultar edición"
                  : "Ocultar nueva cita"
                : editingAppointmentId
                  ? "Editar cita"
                  : "Nueva cita"
            }
            onPress={() => {
              setComposerOpen((current) => !current);
              if (composerOpen) {
                setEditingAppointmentId(null);
              }
              setAppointmentFeedback({ error: null, success: null });
            }}
          />
          {appointmentFeedback.success ? <Text style={{ color: "#1d6a48" }}>{appointmentFeedback.success}</Text> : null}
          {appointmentFeedback.error ? <Text style={{ color: "#a63d3d" }}>{appointmentFeedback.error}</Text> : null}
        </View>

        {composerOpen ? (
          <View style={{ gap: 12 }}>
            <LabelledInput
              label="Buscar paciente"
              value={appointmentPatientSearch}
              onChangeText={setAppointmentPatientSearch}
              placeholder="Nombre o documento"
            />

            <View style={{ gap: 8 }}>
              {filteredPatients.map((patient) => (
                <Pressable
                  key={patient.id}
                  onPress={() => appointmentForm.setValue("patientId", patient.id)}
                  style={{
                    borderRadius: 18,
                    padding: 14,
                    borderWidth: 1,
                    borderColor:
                      appointmentForm.watch("patientId") === patient.id
                        ? "rgba(21, 102, 105, 0.24)"
                        : "rgba(32,24,18,0.08)",
                    backgroundColor:
                      appointmentForm.watch("patientId") === patient.id
                        ? "rgba(21, 102, 105, 0.10)"
                        : "rgba(255,255,255,0.88)",
                    gap: 4,
                  }}
                >
                  <Text style={{ fontWeight: "700", color: "#201812" }}>
                    {patient.firstName} {patient.lastName}
                  </Text>
                  <Text style={uiStyles.subtitle}>{patient.documentNumber}</Text>
                </Pressable>
              ))}
            </View>

            <View style={{ flexDirection: "row", gap: 12 }}>
              <View style={{ flex: 1 }}>
                <DateField
                  label="Inicio"
                  value={appointmentForm.watch("startAt")}
                  onChange={(value) => appointmentForm.setValue("startAt", value)}
                  mode="datetime"
                  error={appointmentForm.formState.errors.startAt?.message}
                />
              </View>
              <View style={{ flex: 1 }}>
                <DateField
                  label="Fin"
                  value={appointmentForm.watch("endAt")}
                  onChange={(value) => appointmentForm.setValue("endAt", value)}
                  mode="datetime"
                  error={appointmentForm.formState.errors.endAt?.message}
                />
              </View>
            </View>

            <LabelledInput
              label="Motivo"
              value={appointmentForm.watch("reason")}
              onChangeText={(value) => appointmentForm.setValue("reason", value)}
              multiline
            />

            <Text style={uiStyles.label}>Tipo</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
              {appointmentTypes.map((type) => (
                <ChoiceChip
                  key={type}
                  label={type.replaceAll("_", " ")}
                  selected={appointmentForm.watch("type") === type}
                  onPress={() => appointmentForm.setValue("type", type)}
                />
              ))}
            </View>

            <Text style={uiStyles.label}>Modalidad</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
              {[
                { value: "presencial", label: "Presencial" },
                { value: "virtual", label: "Virtual" },
                { value: "domicilio", label: "Domicilio" },
              ].map((option) => (
                <ChoiceChip
                  key={option.value}
                  label={option.label}
                  selected={appointmentForm.watch("modality") === option.value}
                  onPress={() =>
                    appointmentForm.setValue(
                      "modality",
                      option.value as "presencial" | "virtual" | "domicilio",
                    )
                  }
                />
              ))}
            </View>

            <Text style={uiStyles.label}>Estado</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
              {appointmentStatuses.map((status) => (
                <ChoiceChip
                  key={status}
                  label={status.replaceAll("_", " ")}
                  selected={appointmentForm.watch("status") === status}
                  onPress={() => appointmentForm.setValue("status", status)}
                />
              ))}
            </View>

            <LabelledInput
              label="Notas"
              value={appointmentForm.watch("notes") ?? ""}
              onChangeText={(value) => appointmentForm.setValue("notes", value)}
              multiline
            />
            {appointmentForm.watch("modality") === "virtual" ? (
              <View style={{ gap: 10 }}>
                <InfoPanel
                  title={
                    settingsQuery.data?.googleCalendarConnected
                      ? "Google Calendar conectado"
                      : "Google Calendar no conectado"
                  }
                  body={
                    settingsQuery.data?.googleCalendarConnected
                      ? settingsQuery.data.googleCalendarEmail
                        ? `Conectado como ${settingsQuery.data.googleCalendarEmail}. La sincronización automática de Meet todavía vive en la web; aquí puedes guardar el enlace manual.`
                        : "La cuenta está conectada, pero en móvil todavía debes pegar el enlace Meet manualmente."
                      : "Si quieres generar Meet automáticamente, primero conecta Google Calendar desde la web."
                  }
                />
                <LabelledInput
                  label="Enlace Meet"
                  value={appointmentForm.watch("meetLink") ?? ""}
                  onChangeText={(value) => appointmentForm.setValue("meetLink", value)}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>
            ) : null}

            <View style={{ gap: 10 }}>
              <PrimaryButton
                title={appointmentMutation.isPending ? "Guardando..." : editingAppointmentId ? "Actualizar cita" : "Crear cita"}
                disabled={appointmentMutation.isPending}
                onPress={appointmentForm.handleSubmit((values) => appointmentMutation.mutate(values))}
              />
              <SecondaryButton
                title="Cancelar"
                onPress={() => {
                  setComposerOpen(false);
                  setEditingAppointmentId(null);
                  setAppointmentFeedback({ error: null, success: null });
                }}
              />
            </View>
          </View>
        ) : null}
      </Card>

      <Card>
        <SectionTitle
          title="Atención inmediata"
          subtitle="Lo que deberías resolver desde la mano sin volver al escritorio."
        />
        {appointmentsQuery.isLoading ? (
          <InfoPanel
            title="Cargando agenda"
            body="Traemos citas, estado y modalidad para priorizar la siguiente acción."
          />
        ) : null}
        {!appointmentsQuery.isLoading && immediateQueue.length === 0 ? (
          <InfoPanel
            title={hasAgendaFilters ? "Sin resultados con esos filtros" : "Sin cola inmediata"}
            body={
              hasAgendaFilters
                ? "Ajusta rango, estado o modalidad para volver a ver citas en esta vista."
                : "No hay citas activas para hoy. Revisa las próximas o usa Nueva nota si llega un paciente sin agenda."
            }
          />
        ) : null}

        {immediateQueue.map((appointment) => (
          <View
            key={appointment.id}
            style={{
              padding: 16,
              borderRadius: 24,
              borderWidth: 1,
              borderColor: "rgba(32,24,18,0.08)",
              backgroundColor: "rgba(255,255,255,0.88)",
              gap: 14,
            }}
          >
            <View
              style={{
                alignSelf: "flex-start",
                borderRadius: 999,
                paddingHorizontal: 12,
                paddingVertical: 7,
                backgroundColor: "rgba(23,63,72,0.08)",
              }}
            >
              <Text style={{ color: "#173f48", fontWeight: "800", fontSize: 12, letterSpacing: 0.3 }}>
                {formatAgendaTime(appointment.startAt)} · {getModalityLabel(appointment.modality)}
              </Text>
            </View>
            <View
              style={{ flexDirection: "row", justifyContent: "space-between", gap: 10, alignItems: "flex-start" }}
            >
              <View style={{ flex: 1, gap: 4 }}>
                <Text style={{ fontWeight: "800", color: "#201812", fontSize: 17 }}>{appointment.reason}</Text>
                <Text style={uiStyles.subtitle}>
                  {formatAgendaDate(appointment.startAt)} · {appointment.type.replaceAll("_", " ")}
                </Text>
                <Text style={uiStyles.subtitle}>
                  {appointment.status === "programada"
                    ? "Pendiente de confirmacion"
                    : appointment.status === "confirmada"
                      ? "Lista para iniciar atencion"
                      : "Seguimiento ya marcado en agenda"}
                  {appointment.meetLink ? " · enlace listo" : ""}
                </Text>
              </View>
              <StatusBadge
                label={appointment.status.replaceAll("_", " ")}
                tone={getStatusTone(appointment.status)}
              />
            </View>

            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
              {appointment.status === "programada" ? (
                <SecondaryButton
                  title={activeAppointmentId === appointment.id ? "Confirmando..." : "Confirmar"}
                  disabled={activeAppointmentId === appointment.id}
                  onPress={() =>
                    runAppointmentAction(appointment.id, async () => {
                      await updateAppointmentStatus(supabase, appointment.id, "confirmada");
                    })
                  }
                />
              ) : null}
              <PrimaryButton
                title={activeAppointmentId === appointment.id ? "Abriendo..." : "Iniciar atención"}
                disabled={activeAppointmentId === appointment.id}
                onPress={() =>
                  runAppointmentAction(appointment.id, async () => {
                    const encounter = await createEncounterFromAppointment(supabase, appointment);
                    await updateAppointmentStatus(supabase, appointment.id, "atendida");
                    router.push({
                      pathname: "/(tabs)/nueva-nota",
                      params: {
                        patientId: appointment.patientId,
                        appointmentId: appointment.id,
                        encounterId: encounter.id,
                        chiefComplaint: appointment.reason,
                      },
                    });
                  })
                }
              />
              {appointment.modality === "virtual" ? (
                <SecondaryButton
                  title="Abrir Meet"
                  disabled={!appointment.meetLink}
                  onPress={async () => {
                    if (!appointment.meetLink) return;
                    const canOpen = await Linking.canOpenURL(appointment.meetLink);
                    if (!canOpen) {
                      Alert.alert("Agenda", "No se pudo abrir el enlace de teleconsulta.");
                      return;
                    }
                    await Linking.openURL(appointment.meetLink);
                  }}
                />
              ) : null}
              <SecondaryButton
                title="Editar cita"
                onPress={() => {
                  setEditingAppointmentId(appointment.id);
                  setComposerOpen(true);
                  setAppointmentFeedback({ error: null, success: null });
                }}
              />
            </View>

            <Pressable
              onPress={() => router.push("/(tabs)/pacientes")}
              style={{
                alignSelf: "flex-start",
                paddingHorizontal: 12,
                paddingVertical: 8,
                borderRadius: 999,
                backgroundColor: "rgba(32,24,18,0.06)",
              }}
            >
              <Text style={{ color: "#5f564e", fontWeight: "700" }}>Ver contexto del paciente</Text>
            </Pressable>
          </View>
        ))}
      </Card>

      <Card>
        <SectionTitle title="Próximas" subtitle="Visión corta de lo que sigue en la jornada." />
        {nextAppointments.length === 0 ? (
          <InfoPanel
            title="Sin próximas visibles"
            body={
              hasAgendaFilters
                ? "Los filtros actuales no dejan citas futuras visibles."
                : "No hay más citas futuras registradas."
            }
          />
        ) : null}
        {nextAppointments.map((appointment) => (
          <View
            key={appointment.id}
            style={{
              padding: 14,
              borderRadius: 20,
              backgroundColor: "rgba(255,255,255,0.78)",
              borderWidth: 1,
              borderColor: "rgba(32,24,18,0.06)",
              gap: 10,
            }}
          >
            <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
              <Text style={{ fontWeight: "700", color: "#201812", flex: 1 }}>{appointment.reason}</Text>
              <StatusBadge
                label={appointment.status.replaceAll("_", " ")}
                tone={getStatusTone(appointment.status)}
              />
            </View>
            <Text style={uiStyles.subtitle}>
              {formatAgendaDate(appointment.startAt)} · {getModalityLabel(appointment.modality)}
            </Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
              <SecondaryButton
                title="Editar"
                onPress={() => {
                  setEditingAppointmentId(appointment.id);
                  setComposerOpen(true);
                  setAppointmentFeedback({ error: null, success: null });
                }}
              />
            </View>
            <View
              style={{
                alignSelf: "flex-start",
                borderRadius: 999,
                paddingHorizontal: 10,
                paddingVertical: 6,
                backgroundColor: "rgba(32,24,18,0.05)",
              }}
            >
              <Text style={{ color: "#5f564e", fontWeight: "700", fontSize: 12 }}>
                {appointment.type.replaceAll("_", " ")}
              </Text>
            </View>
          </View>
        ))}
      </Card>
    </Screen>
  );
}
