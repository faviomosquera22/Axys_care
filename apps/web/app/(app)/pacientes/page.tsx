"use client";

import { calculateAge } from "@axyscare/core-clinical";
import type { Patient } from "@axyscare/core-types";
import { listPatients } from "@axyscare/core-db";
import { Card, SectionHeading, StatusBadge } from "@axyscare/ui-shared";
import { startTransition, useDeferredValue, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PatientForm } from "@/components/forms/patient-form";
import { useAuth } from "@/components/providers/providers";
import { useTableRealtime } from "@/components/realtime/use-table-realtime";

function ActionIcon({ kind }: { kind: "open" | "care" | "edit" }) {
  if (kind === "open") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 5c5.5 0 9.5 5.4 9.7 5.7l.3.3-.3.3C21.5 11.6 17.5 17 12 17S2.5 11.6 2.3 11.3L2 11l.3-.3C2.5 10.4 6.5 5 12 5Zm0 2c-3.7 0-6.8 3.2-7.9 4 1.1.8 4.2 4 7.9 4s6.8-3.2 7.9-4c-1.1-.8-4.2-4-7.9-4Zm0 1.5A2.5 2.5 0 1 1 9.5 11 2.5 2.5 0 0 1 12 8.5Z" />
      </svg>
    );
  }

  if (kind === "care") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M10 4h4v6h6v4h-6v6h-4v-6H4v-4h6V4Z" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="m4 16.5 9.8-9.8 3.5 3.5-9.8 9.8H4v-3.5Zm11.2-10.6 1.4-1.4a1.5 1.5 0 0 1 2.1 0l.8.8a1.5 1.5 0 0 1 0 2.1l-1.4 1.4-2.9-2.9Z" />
    </svg>
  );
}

export default function PatientsPage() {
  const { client } = useAuth();
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [editingPatient, setEditingPatient] = useState<Patient | null>(null);
  const deferredSearch = useDeferredValue(search);
  const patientsQuery = useQuery({
    queryKey: ["patients", deferredSearch],
    queryFn: () => listPatients(client, deferredSearch),
  });
  const patients = patientsQuery.data ?? [];
  const ownedCount = patients.filter((patient) => patient.relationshipToViewer === "owner").length;
  const sharedCount = patients.filter((patient) => patient.relationshipToViewer !== "owner").length;

  useTableRealtime("patients-browser", ["patients", "patient_access"], [["patients", deferredSearch]]);

  return (
    <div className="stack">
      <section className="clinical-hero">
        <div className="clinical-hero__primary">
          <div>
            <span className="patient-kicker">Directorio clínico</span>
            <h1 className="clinical-hero__title">Pacientes</h1>
            <p className="clinical-hero__subtitle">
              Busca rápido, revisa edad, correo y teléfono antes de abrir la ficha clínica.
            </p>
          </div>
          <div className="clinical-hero__actions">
            <button type="button" className="btn secondary" onClick={() => window.print()}>
              Imprimir listado
            </button>
          </div>
        </div>
        <div className="clinical-hero__metrics">
          <div className="clinical-hero__metric">
            <span>Total visibles</span>
            <strong>{patients.length}</strong>
          </div>
          <div className="clinical-hero__metric">
            <span>Propios</span>
            <strong>{ownedCount}</strong>
          </div>
          <div className="clinical-hero__metric">
            <span>Compartidos</span>
            <strong>{sharedCount}</strong>
          </div>
          <div className="clinical-hero__metric">
            <span>Búsqueda</span>
            <strong>{search ? "Activa" : "Completa"}</strong>
          </div>
        </div>
      </section>

      <Card className="workflow-banner">
        <div className="workflow-banner__step">
          <strong>1. Registrar paciente</strong>
          <span>Demografía, antecedentes y datos base.</span>
        </div>
        <div className="workflow-banner__step">
          <strong>2. Abrir ficha</strong>
          <span>Resumen clínico, colaboración y línea temporal.</span>
        </div>
        <div className="workflow-banner__step">
          <strong>3. Iniciar atención</strong>
          <span>Encounter, signos vitales, nota médica o de enfermería.</span>
        </div>
      </Card>

      <div className="clinical-layout">
      <div className="clinical-layout__main stack">
      <Card>
        <SectionHeading
          title="Base de pacientes"
          description="Listado clínico rápido con acceso directo a ficha y atención."
          action={
            <input
              placeholder="Buscar por nombre, documento o correo"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          }
        />
        {patients.length ? (
          <div className="patient-directory">
            <div className="patient-directory__head">
              <span>Paciente</span>
              <span>Edad</span>
              <span>Correo</span>
              <span>Teléfono</span>
              <span>Acceso</span>
              <span>Acciones</span>
            </div>
            {patients.map((patient) => (
              <div key={patient.id} className="patient-directory__row">
                <div className="patient-directory__identity">
                  <strong>
                    {patient.firstName} {patient.lastName}
                  </strong>
                  <span>
                    {patient.documentType}: {patient.documentNumber}
                  </span>
                </div>
                <div className="patient-directory__cell">
                  <strong>{calculateAge(patient.birthDate)} años</strong>
                </div>
                <div className="patient-directory__cell">
                  <strong>{patient.email || "Sin correo"}</strong>
                </div>
                <div className="patient-directory__cell">
                  <strong>{patient.phone || "Sin teléfono"}</strong>
                </div>
                <div className="patient-directory__cell">
                  <StatusBadge
                    label={patient.relationshipToViewer === "owner" ? "propio" : "compartido"}
                    tone={patient.relationshipToViewer === "owner" ? "success" : "info"}
                  />
                </div>
                <div className="patient-directory__actions">
                  <Link href={`/pacientes/${patient.id}`} className="action-pill action-pill--open" title="Abrir ficha">
                    <ActionIcon kind="open" />
                    <span>Abrir ficha</span>
                  </Link>
                  <Link href={`/nueva-atencion?patientId=${patient.id}`} className="action-pill action-pill--care" title="Atender">
                    <ActionIcon kind="care" />
                    <span>Atender</span>
                  </Link>
                  <button
                    type="button"
                    className="action-pill action-pill--edit"
                    title="Editar paciente"
                    onClick={() => setEditingPatient(patient)}
                  >
                    <ActionIcon kind="edit" />
                    <span>Editar</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <strong>Aún no tienes pacientes registrados.</strong>
            <p>Empieza por crear uno en el panel derecho. Cuando se guarde, la ficha será el punto central para toda la atención.</p>
          </div>
        )}
      </Card>
      </div>
      <aside className="clinical-layout__side stack">
      <Card>
        <SectionHeading
          title={editingPatient ? "Editar paciente" : "Nuevo paciente"}
          description={
            editingPatient
              ? "Actualiza los datos del paciente sin salir del listado."
              : "Registro clínico básico con datos demográficos y antecedentes."
          }
        />
        <PatientForm
          initialPatient={editingPatient}
          onSaved={(patient) => {
            if (editingPatient) {
              setEditingPatient(null);
              return;
            }
            startTransition(() => router.push(`/pacientes/${patient.id}`));
          }}
        />
        {editingPatient ? (
          <div className="btn-row" style={{ marginTop: 12 }}>
            <button type="button" className="btn secondary" onClick={() => setEditingPatient(null)}>
              Cancelar edición
            </button>
            <Link href={`/pacientes/${editingPatient.id}`} className="pill-link">
              Abrir ficha
            </Link>
          </div>
        ) : null}
        <div className="info-panel">
          <strong>Qué sigue después</strong>
          <span>
            {editingPatient
              ? "Guarda los cambios y el listado reflejará los datos actualizados del paciente."
              : "La ficha del paciente te llevará a historia clínica, colaboración y apertura ordenada de una nueva atención."}
          </span>
        </div>
      </Card>
      </aside>
      </div>
    </div>
  );
}
