"use client";

import { calculateAge } from "@axyscare/core-clinical";
import type { Patient } from "@axyscare/core-types";
import type { ReactNode } from "react";

function compactList(values?: string[] | null, fallback = "Sin alertas registradas") {
  const items = values?.map((item) => item.trim()).filter(Boolean) ?? [];
  return items.length ? items.join(", ") : fallback;
}

export function PatientBanner({
  patient,
  actions,
}: {
  patient: Patient;
  actions?: ReactNode;
}) {
  return (
    <section className="patient-banner">
      <div className="patient-banner__row">
        <div className="patient-banner__identity">
          <strong>
            {patient.firstName} {patient.lastName}
          </strong>
          <span>
            {patient.documentType} {patient.documentNumber} ·{" "}
            {calculateAge(patient.birthDate)} años
          </span>
        </div>
        {actions ? <div className="patient-banner__actions">{actions}</div> : null}
      </div>

      <div className="patient-banner__facts">
        <span>Sexo: {patient.sex}</span>
        {patient.gender ? <span>Género: {patient.gender}</span> : null}
        <span>Teléfono: {patient.phone || "No registrado"}</span>
        <span>Correo: {patient.email || "No registrado"}</span>
      </div>

      <div className="patient-banner__alerts">
        <span className="patient-banner__alert">
          Alergias: {compactList(patient.allergies)}
        </span>
        <span className="patient-banner__alert patient-banner__alert--neutral">
          ID: {patient.id.slice(0, 8)}
        </span>
      </div>
    </section>
  );
}
