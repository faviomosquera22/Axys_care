import type {
  Encounter,
  MedicalAssessment,
  NursingAssessment,
  Patient,
  Profile,
  VitalSigns,
} from "@axyscare/core-types";
import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";

const styles = StyleSheet.create({
  page: { padding: 32, fontSize: 11, color: "#1f1a16" },
  header: { marginBottom: 18, borderBottom: "1 solid #c7b9a6", paddingBottom: 12 },
  title: { fontSize: 18, marginBottom: 4 },
  subtitle: { fontSize: 10, color: "#6a6056" },
  section: { marginTop: 14 },
  sectionTitle: { fontSize: 12, marginBottom: 6, color: "#156669" },
  row: { marginBottom: 4 },
  closingPage: { padding: 32, fontSize: 11, color: "#1f1a16", justifyContent: "flex-end" },
  closingCard: {
    borderTop: "1 solid #d8ccc0",
    paddingTop: 22,
    gap: 6,
  },
  closingEyebrow: {
    fontSize: 10,
    color: "#6a6056",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  closingName: { fontSize: 17, color: "#1f1a16" },
  closingLine: { fontSize: 11, color: "#4d463f" },
  closingNote: { fontSize: 9, color: "#7a7168", marginTop: 10 },
});

export function EncounterSummaryDocument({
  patient,
  professional,
  encounter,
  vitals,
  medical,
  nursing,
}: {
  patient: Patient;
  professional?: Profile | null;
  encounter: Encounter;
  vitals?: VitalSigns | null;
  medical?: MedicalAssessment | null;
  nursing?: NursingAssessment | null;
}) {
  const professionalName = professional
    ? `${professional.firstName} ${professional.lastName}`.trim()
    : "Perfil profesional pendiente";
  const professionLine = [professional?.profession ?? "Profesional", professional?.specialty ?? ""]
    .filter(Boolean)
    .join(" · ");
  const identityLine = [
    patient.documentType ? `${patient.documentType}: ${patient.documentNumber}` : "",
  ].filter(Boolean);
  void identityLine;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>Resumen clínico</Text>
          <Text style={styles.subtitle}>
            {professional?.profession ?? "Profesional"} {professional?.professionalLicense ? `· Reg. ${professional.professionalLicense}` : ""}
          </Text>
          <Text style={styles.subtitle}>
            {professional ? `${professional.firstName} ${professional.lastName}` : "Perfil profesional pendiente"}
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Paciente</Text>
          <Text style={styles.row}>
            {patient.firstName} {patient.lastName} · {patient.documentType}: {patient.documentNumber}
          </Text>
          <Text style={styles.row}>Nacimiento: {patient.birthDate}</Text>
          <Text style={styles.row}>Alergias: {(patient.allergies ?? []).join(", ") || "No registradas"}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Encuentro</Text>
          <Text style={styles.row}>Tipo: {encounter.encounterType}</Text>
          <Text style={styles.row}>Inicio: {new Date(encounter.startedAt).toLocaleString()}</Text>
          <Text style={styles.row}>Motivo: {encounter.chiefComplaint ?? "No registrado"}</Text>
        </View>

        {vitals ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Signos vitales</Text>
            <Text style={styles.row}>
              T {vitals.temperatureC ?? "-"} °C · FC {vitals.heartRate ?? "-"} · FR {vitals.respiratoryRate ?? "-"}
            </Text>
            <Text style={styles.row}>
              PA {vitals.systolic ?? "-"}/{vitals.diastolic ?? "-"} · PAM {vitals.meanArterialPressure ?? "-"} · IMC {vitals.bmi ?? "-"}
            </Text>
          </View>
        ) : null}

        {medical ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Médico</Text>
            <Text style={styles.row}>Enfermedad actual: {medical.currentIllness}</Text>
            <Text style={styles.row}>Impresión: {medical.diagnosticImpression ?? "No registrada"}</Text>
            <Text style={styles.row}>Plan: {medical.therapeuticPlan ?? "No registrado"}</Text>
          </View>
        ) : null}

        {nursing ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Enfermería</Text>
            <Text style={styles.row}>Motivo: {nursing.careReason}</Text>
            <Text style={styles.row}>Observaciones: {nursing.observations ?? "No registradas"}</Text>
            <Text style={styles.row}>
              Diagnósticos sugeridos: {(nursing.selectedDiagnoses ?? []).join(", ") || "Sin selección"}
            </Text>
          </View>
        ) : null}

      </Page>
      <Page size="A4" style={styles.closingPage}>
        <View style={styles.closingCard}>
          <Text style={styles.closingEyebrow}>Cierre profesional</Text>
          <Text style={styles.closingName}>{professionalName}</Text>
          <Text style={styles.closingLine}>{professionLine}</Text>
          <Text style={styles.closingLine}>
            Cédula: {professional?.professionalLicense ? professional.professionalLicense : "Pendiente"}
          </Text>
          <Text style={styles.closingLine}>
            Registro profesional: {professional?.professionalLicense ? professional.professionalLicense : "Pendiente"}
          </Text>
          <Text style={styles.closingLine}>
            Fecha de emisión: {new Date().toLocaleDateString()}
          </Text>
          <Text style={styles.closingNote}>
            Documento generado desde el expediente clínico con cierre automático del profesional responsable.
          </Text>
        </View>
      </Page>
    </Document>
  );
}
