"use client";

import { calculateAge } from "@axyscare/core-clinical";
import type { Encounter, Patient } from "@axyscare/core-types";
import { StatusBadge } from "@axyscare/ui-shared";
import type { ReactNode } from "react";

function formatDateTime(value?: string | null) {
  if (!value) return "Sin registro";
  return new Date(value).toLocaleString();
}

function truncate(value?: string | null, maxLength = 120) {
  if (!value) return "Sin registro";
  return value.length > maxLength
    ? `${value.slice(0, maxLength).trim()}...`
    : value;
}

export function ClinicalContextBanner({
  patient,
  encounter,
  stageLabel,
  lastSavedAt,
  hasPendingChanges = false,
  sticky = true,
  actions,
}: {
  patient: Patient;
  encounter?: Encounter | null;
  stageLabel?: string;
  lastSavedAt?: string | null;
  hasPendingChanges?: boolean;
  sticky?: boolean;
  actions?: ReactNode;
}) {
  const allergies = patient.allergies?.join(", ") || "No registradas";
  const patientRelationship =
    patient.relationshipToViewer === "shared_with_me"
      ? "Compartido conmigo"
      : patient.relationshipToViewer === "shared_by_me"
        ? "Compartido por mí"
        : "Propio";

  return (
    <section
      className={`clinical-context-banner ${sticky ? "clinical-context-banner--sticky" : ""}`}
    >
      <div className="clinical-context-banner__top">
        <div className="clinical-context-banner__identity">
          <span className="patient-kicker">
            {encounter ? "Atención activa" : "Contexto del paciente"}
          </span>
          <h2 className="clinical-context-banner__title">
            {patient.firstName} {patient.lastName}
          </h2>
          <p className="clinical-context-banner__subtitle">
            {patient.documentType} {patient.documentNumber} ·{" "}
            {calculateAge(patient.birthDate)} años · {patient.sex}
            {patient.gender ? ` · ${patient.gender}` : ""}
          </p>
        </div>

        <div className="clinical-context-banner__badges">
          <StatusBadge
            label={patientRelationship}
            tone={patient.relationshipToViewer === "owner" ? "success" : "info"}
          />
          {allergies !== "No registradas" ? (
            <StatusBadge label="Alergias registradas" tone="warning" />
          ) : null}
          {encounter ? (
            <StatusBadge label={encounter.encounterType} tone="info" />
          ) : null}
          {encounter ? (
            <StatusBadge
              label={
                encounter.status === "open"
                  ? "Encuentro abierto"
                  : "Encuentro cerrado"
              }
              tone={encounter.status === "open" ? "success" : "neutral"}
            />
          ) : null}
          {encounter ? (
            <StatusBadge
              label={
                hasPendingChanges
                  ? "Cambios pendientes"
                  : "Contexto sincronizado"
              }
              tone={hasPendingChanges ? "warning" : "success"}
            />
          ) : null}
        </div>
      </div>

      <div className="clinical-context-banner__grid">
        <div className="clinical-context-banner__item">
          <span>Alergias</span>
          <strong>{allergies}</strong>
        </div>
        <div className="clinical-context-banner__item">
          <span>Antecedentes</span>
          <strong>{truncate(patient.relevantHistory)}</strong>
        </div>
        <div className="clinical-context-banner__item">
          <span>Contacto clave</span>
          <strong>
            {patient.emergencyContact?.name
              ? `${patient.emergencyContact.name}${patient.emergencyContact.phone ? ` · ${patient.emergencyContact.phone}` : ""}`
              : patient.phone || "Sin contacto registrado"}
          </strong>
        </div>
        <div className="clinical-context-banner__item">
          <span>{encounter ? "Etapa activa" : "Último dato visible"}</span>
          <strong>
            {encounter
              ? stageLabel || "Contexto general"
              : formatDateTime(patient.updatedAt ?? patient.createdAt)}
          </strong>
        </div>
        {encounter ? (
          <>
            <div className="clinical-context-banner__item">
              <span>Motivo actual</span>
              <strong>{truncate(encounter.chiefComplaint, 100)}</strong>
            </div>
            <div className="clinical-context-banner__item">
              <span>Inicio del encounter</span>
              <strong>{formatDateTime(encounter.startedAt)}</strong>
            </div>
            <div className="clinical-context-banner__item">
              <span>Último guardado visible</span>
              <strong>
                {formatDateTime(
                  lastSavedAt ??
                    encounter.updatedAt ??
                    encounter.createdAt ??
                    encounter.startedAt,
                )}
              </strong>
            </div>
          </>
        ) : null}
      </div>

      {actions ? (
        <div className="clinical-context-banner__actions">{actions}</div>
      ) : null}
    </section>
  );
}
