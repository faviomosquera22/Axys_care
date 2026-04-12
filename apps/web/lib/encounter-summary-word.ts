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

function renderImageBlock(label: string, src?: string | null, className = "") {
  if (!src) return "";
  return `
    <div class="validation-card ${className}">
      <div class="validation-label">${escapeHtml(label)}</div>
      <img src="${src}" alt="${escapeHtml(label)}" />
    </div>
  `;
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
  const registration = professional?.professionalLicense
    ? `Registro ${professional.professionalLicense}`
    : "Registro pendiente";
  const city = professional?.city ? ` · ${professional.city}` : "";
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
          .footer { margin-top: 28px; border-top: 1px solid #d8ccc0; padding-top: 16px; }
          .validation-grid { margin-top: 14px; width: 100%; }
          .validation-card { display: inline-block; vertical-align: top; width: 47%; min-height: 120px; margin-right: 3%; border: 1px solid #e2d8cc; border-radius: 12px; padding: 12px; background: #fbf8f4; box-sizing: border-box; }
          .validation-card:last-child { margin-right: 0; }
          .validation-label { font-size: 11px; text-transform: uppercase; color: #6a6056; margin-bottom: 8px; }
          .validation-card img { max-width: 100%; max-height: 120px; object-fit: contain; }
          .signature-name { margin-top: 8px; font-size: 12px; }
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

        <div class="footer">
          <h2>Validación profesional</h2>
          ${renderRow("Profesional", professionalName)}
          ${renderRow("Perfil", `${professionalRole}${specialty}`)}
          ${renderRow("Registro", `${registration}${city}`)}
          ${
            professional?.signatureUrl || professional?.sealUrl
              ? `
                <div class="validation-grid">
                  ${renderImageBlock("Firma", professional?.signatureUrl)}
                  ${renderImageBlock("Sello", professional?.sealUrl)}
                </div>
              `
              : ""
          }
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
