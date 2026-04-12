import type {
  Encounter,
  MedicalAssessment,
  NursingAssessment,
  Patient,
  Profile,
  VitalSigns,
} from "@axyscare/core-types";
import { Document, Image, Page, StyleSheet, Text, View } from "@react-pdf/renderer";

const styles = StyleSheet.create({
  page: { padding: 32, fontSize: 11, color: "#1f1a16" },
  header: { marginBottom: 18, borderBottom: "1 solid #c7b9a6", paddingBottom: 12 },
  title: { fontSize: 18, marginBottom: 4 },
  subtitle: { fontSize: 10, color: "#6a6056" },
  section: { marginTop: 14 },
  sectionTitle: { fontSize: 12, marginBottom: 6, color: "#156669" },
  row: { marginBottom: 4 },
  footer: {
    marginTop: 22,
    paddingTop: 16,
    borderTop: "1 solid #d8ccc0",
    gap: 10,
  },
  footerTitle: { fontSize: 12, color: "#156669", marginBottom: 4 },
  footerText: { fontSize: 10, color: "#6a6056", marginBottom: 2 },
  validationRow: { flexDirection: "row", gap: 16, marginTop: 8, alignItems: "flex-end" },
  validationBlock: {
    flex: 1,
    minHeight: 96,
    border: "1 solid #e2d8cc",
    borderRadius: 12,
    padding: 10,
    justifyContent: "space-between",
    backgroundColor: "#fbf8f4",
  },
  validationLabel: { fontSize: 9, color: "#6a6056", marginBottom: 6, textTransform: "uppercase" },
  signatureImage: { width: "100%", height: 56, objectFit: "contain" },
  sealImage: { width: "100%", height: 88, objectFit: "contain" },
  validationName: { fontSize: 10, marginTop: 6, color: "#1f1a16" },
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

        <View style={styles.footer}>
          <Text style={styles.footerTitle}>Validación profesional</Text>
          <Text style={styles.footerText}>
            {professional ? `${professional.firstName} ${professional.lastName}` : "Perfil profesional pendiente"}
          </Text>
          <Text style={styles.footerText}>
            {professional?.profession ?? "Profesional"} {professional?.specialty ? `· ${professional.specialty}` : ""}
          </Text>
          <Text style={styles.footerText}>
            {professional?.professionalLicense ? `Registro ${professional.professionalLicense}` : "Registro pendiente"}
            {professional?.city ? ` · ${professional.city}` : ""}
          </Text>
          {professional?.signatureUrl || professional?.sealUrl ? (
            <View style={styles.validationRow}>
              {professional?.signatureUrl ? (
                <View style={styles.validationBlock}>
                  <Text style={styles.validationLabel}>Firma</Text>
                  <Image src={professional.signatureUrl} style={styles.signatureImage} />
                  <Text style={styles.validationName}>{professional.firstName} {professional.lastName}</Text>
                </View>
              ) : null}
              {professional?.sealUrl ? (
                <View style={styles.validationBlock}>
                  <Text style={styles.validationLabel}>Sello</Text>
                  <Image src={professional.sealUrl} style={styles.sealImage} />
                </View>
              ) : null}
            </View>
          ) : null}
        </View>
      </Page>
    </Document>
  );
}
