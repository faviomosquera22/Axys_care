import type {
  Encounter,
  MedicalAssessment,
  NursingAssessment,
  Patient,
  Profile,
  VitalSigns,
} from "@axyscare/core-types";

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function renderRow(label: string, value?: string | null) {
  return `<p><strong>${escapeHtml(label)}:</strong> ${escapeHtml(value?.trim() || "No registrado")}</p>`;
}

export function downloadEncounterSummaryWord({
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
  const professionalRole = professional?.profession ?? "Profesional";
  const specialty = professional?.specialty ? ` · ${professional.specialty}` : "";
  const professionalId = professional?.professionalLicense || "Pendiente";
  const issueDate = new Date().toLocaleDateString();
  const html = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta charset="utf-8" />
        <title>Resumen clínico</title>
        <style>
          body { font-family: Arial, sans-serif; color: #1f1a16; margin: 34px; }
          h1 { margin: 0 0 6px; font-size: 24px; }
          h2 { font-size: 16px; margin: 22px 0 10px; color: #156669; }
          p { margin: 0 0 8px; line-height: 1.45; }
          .header { border-bottom: 1px solid #c7b9a6; padding-bottom: 12px; margin-bottom: 18px; }
          .subtitle { color: #6a6056; font-size: 12px; }
          .section { margin-top: 16px; }
          .closing-page { page-break-before: always; padding-top: 420px; }
          .closing-card { border-top: 1px solid #d8ccc0; padding-top: 18px; }
          .closing-eyebrow { font-size: 11px; letter-spacing: 1px; text-transform: uppercase; color: #6a6056; margin-bottom: 10px; }
          .closing-name { font-size: 22px; margin: 0 0 10px; }
          .closing-line { margin: 0 0 6px; color: #4d463f; }
          .closing-note { margin-top: 14px; font-size: 11px; color: #7a7168; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Resumen clínico</h1>
          <p class="subtitle">${escapeHtml(professionalRole)}${escapeHtml(specialty)}${professional?.professionalLicense ? ` · Reg. ${escapeHtml(professional.professionalLicense)}` : ""}</p>
          <p class="subtitle">${escapeHtml(professionalName)}</p>
        </div>

        <div class="section">
          <h2>Paciente</h2>
          ${renderRow("Paciente", `${patient.firstName} ${patient.lastName} · ${patient.documentType}: ${patient.documentNumber}`)}
          ${renderRow("Nacimiento", patient.birthDate)}
          ${renderRow("Alergias", (patient.allergies ?? []).join(", "))}
        </div>

        <div class="section">
          <h2>Encuentro</h2>
          ${renderRow("Tipo", encounter.encounterType)}
          ${renderRow("Inicio", new Date(encounter.startedAt).toLocaleString())}
          ${renderRow("Motivo", encounter.chiefComplaint)}
        </div>

        ${
          vitals
            ? `
              <div class="section">
                <h2>Signos vitales</h2>
                ${renderRow(
                  "Registro principal",
                  `T ${vitals.temperatureC ?? "-"} °C · FC ${vitals.heartRate ?? "-"} · FR ${vitals.respiratoryRate ?? "-"}`,
                )}
                ${renderRow(
                  "Presión y antropometría",
                  `PA ${vitals.systolic ?? "-"}/${vitals.diastolic ?? "-"} · PAM ${vitals.meanArterialPressure ?? "-"} · IMC ${vitals.bmi ?? "-"}`,
                )}
              </div>
            `
            : ""
        }

        ${
          medical
            ? `
              <div class="section">
                <h2>Valoración médica</h2>
                ${renderRow("Enfermedad actual", medical.currentIllness)}
                ${renderRow("Impresión", medical.diagnosticImpression)}
                ${renderRow("Plan", medical.therapeuticPlan)}
              </div>
            `
            : ""
        }

        ${
          nursing
            ? `
              <div class="section">
                <h2>Valoración de enfermería</h2>
                ${renderRow("Motivo", nursing.careReason)}
                ${renderRow("Observaciones", nursing.observations)}
                ${renderRow("Diagnósticos sugeridos", (nursing.selectedDiagnoses ?? []).join(", "))}
              </div>
            `
            : ""
        }

        <div class="closing-page">
          <div class="closing-card">
            <p class="closing-eyebrow">Cierre profesional</p>
            <p class="closing-name">${escapeHtml(professionalName)}</p>
            <p class="closing-line"><strong>Profesión:</strong> ${escapeHtml(`${professionalRole}${specialty}`)}</p>
            <p class="closing-line"><strong>Cédula:</strong> ${escapeHtml(professionalId)}</p>
            <p class="closing-line"><strong>Registro profesional:</strong> ${escapeHtml(professionalId)}</p>
            <p class="closing-line"><strong>Fecha de emisión:</strong> ${escapeHtml(issueDate)}</p>
            <p class="closing-note">Documento generado desde el expediente clínico con cierre automático del profesional responsable.</p>
          </div>
        </div>
      </body>
    </html>
  `;

  const blob = new Blob(["\ufeff", html], { type: "application/msword;charset=utf-8" });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `encounter-${encounter.id}.doc`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}
