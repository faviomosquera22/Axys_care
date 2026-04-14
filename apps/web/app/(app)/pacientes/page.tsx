"use client";

import { calculateAge } from "@axyscare/core-clinical";
import type { Patient } from "@axyscare/core-types";
import { deletePatient, listPatients } from "@axyscare/core-db";
import { Card, LoadingStateCard, SectionHeading, StatusBadge } from "@axyscare/ui-shared";
import { startTransition, useDeferredValue, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PatientForm } from "@/components/forms/patient-form";
import { PatientSharePanel } from "@/components/forms/patient-share-panel";
import { useAuth } from "@/components/providers/providers";
import { useTableRealtime } from "@/components/realtime/use-table-realtime";

function ActionIcon({ kind }: { kind: "open" | "care" | "edit" | "share" | "delete" }) {
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

  if (kind === "share") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M16 5a3 3 0 1 1-.1 6 3 3 0 0 1 .1-6ZM6 9a3 3 0 1 1-.1 6A3 3 0 0 1 6 9Zm10 4a3 3 0 1 1-.1 6 3 3 0 0 1 .1-6Zm-7.4.7 4.8 2.4.9-1.8-4.8-2.4-.9 1.8Zm.2-2 4.6-2.8-1-1.7-4.6 2.8 1 1.7Z" />
      </svg>
    );
  }

  if (kind === "delete") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M9 3h6l1 2h4v2H4V5h4l1-2Zm1 7h2v8h-2v-8Zm4 0h2v8h-2v-8ZM7 10h2v8H7v-8Z" />
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
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [view, setView] = useState<"all" | "owners" | "shared">("all");
  const [editingPatient, setEditingPatient] = useState<Patient | null>(null);
  const [sharingPatient, setSharingPatient] = useState<Patient | null>(null);
  const deferredSearch = useDeferredValue(search);
  const patientsQuery = useQuery({
    queryKey: ["patients", deferredSearch],
    queryFn: () => listPatients(client, deferredSearch),
  });
  const patients = patientsQuery.data ?? [];
  const ownedCount = patients.filter((patient) => patient.relationshipToViewer === "owner").length;
  const sharedCount = patients.filter((patient) => patient.relationshipToViewer !== "owner").length;
  const filteredPatients = useMemo(() => {
    if (view === "owners") {
      return patients.filter((patient) => patient.relationshipToViewer === "owner");
    }

    if (view === "shared") {
      return patients.filter((patient) => patient.relationshipToViewer !== "owner");
    }

    return patients;
  }, [patients, view]);

  useTableRealtime("patients-browser", ["patients", "patient_access"], [["patients", deferredSearch]]);

  const deleteMutation = useMutation({
    mutationFn: (patientId: string) => deletePatient(client, patientId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["patients"] });
      queryClient.invalidateQueries({ queryKey: ["patients-shared-with-me"] });
      queryClient.invalidateQueries({ queryKey: ["patients-shared-by-me"] });
    },
  });

  if (patientsQuery.isLoading) {
    return (
      <div className="stack">
        <LoadingStateCard
          title="Cargando directorio de pacientes"
          description="Estamos trayendo el padrón clínico para que puedas buscar, filtrar y continuar la atención."
        />
      </div>
    );
  }

  return (
    <div className="stack">
      <section className="clinical-hero">
        <div className="clinical-hero__primary">
          <div>
            <span className="patient-kicker">Directorio clínico</span>
            <h1 className="clinical-hero__title">Pacientes</h1>
            <p className="clinical-hero__subtitle">
              Encuentra rápido a quién ver, distingue lo propio de lo compartido y entra a la ficha o
              a la atención sin cambiar de contexto.
            </p>
          </div>
          <div className="clinical-hero__actions">
            <Link href="/nueva-atencion" className="btn">
              Nueva atención
            </Link>
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

      <section className="onboarding-panel">
        <div className="onboarding-panel__card">
          <strong>Busca primero</strong>
          <p>Antes de crear un registro nuevo, confirma si el paciente ya existe en tu base o fue compartido.</p>
        </div>
        <div className="onboarding-panel__card">
          <strong>Abre contexto</strong>
          <p>La ficha es el centro para historia, colaboración, documentos y la siguiente atención.</p>
        </div>
        <div className="onboarding-panel__card">
          <strong>Activa seguimiento</strong>
          <p>Desde aquí deberías poder atender, reagendar o compartir sin duplicar trabajo.</p>
        </div>
      </section>

      <Card className="workflow-banner">
        <div className="workflow-banner__step">
          <strong>1. Registrar o ubicar</strong>
          <span>Demografía, antecedentes y datos base.</span>
        </div>
        <div className="workflow-banner__step">
          <strong>2. Revisar contexto</strong>
          <span>Resumen clínico, colaboración y línea temporal.</span>
        </div>
        <div className="workflow-banner__step">
          <strong>3. Actuar</strong>
          <span>Encounter, signos vitales, nota médica o de enfermería.</span>
        </div>
      </Card>

      <div className="clinical-layout clinical-layout--patients">
      <div className="clinical-layout__main stack">
      <Card>
        <SectionHeading
          title="Base de pacientes"
          description="Listado operativo con foco en continuidad, no solo en almacenamiento."
          action={
            <input
              placeholder="Buscar por nombre, documento o correo"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          }
        />
        <div className="filter-row">
          <button type="button" className={`filter-chip ${view === "all" ? "active" : ""}`} onClick={() => setView("all")}>
            Todos
          </button>
          <button
            type="button"
            className={`filter-chip ${view === "owners" ? "active" : ""}`}
            onClick={() => setView("owners")}
          >
            Propios
          </button>
          <button
            type="button"
            className={`filter-chip ${view === "shared" ? "active" : ""}`}
            onClick={() => setView("shared")}
          >
            Compartidos
          </button>
        </div>
        {filteredPatients.length ? (
          <div className="patient-directory">
            <div className="patient-directory__head">
              <span>Paciente</span>
              <span>Edad</span>
              <span>Correo</span>
              <span>Teléfono</span>
              <span>Acceso</span>
              <span>Acciones</span>
            </div>
            {filteredPatients.map((patient) => (
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
                    <span>Ficha</span>
                  </Link>
                  <Link href={`/nueva-atencion?patientId=${patient.id}`} className="action-pill action-pill--care" title="Atender">
                    <ActionIcon kind="care" />
                    <span>Atender</span>
                  </Link>
                  <button
                    type="button"
                    className="action-pill action-pill--edit"
                    title="Editar paciente"
                    onClick={() => {
                      setEditingPatient(patient);
                      setSharingPatient(null);
                    }}
                  >
                    <ActionIcon kind="edit" />
                    <span>Editar</span>
                  </button>
                  {patient.relationshipToViewer === "owner" ? (
                    <>
                      <button
                        type="button"
                        className="action-pill action-pill--share"
                        title="Compartir paciente"
                        onClick={() => {
                          setSharingPatient(patient);
                          setEditingPatient(null);
                        }}
                      >
                        <ActionIcon kind="share" />
                        <span>Compartir</span>
                      </button>
                      <button
                        type="button"
                        className="action-pill action-pill--delete"
                        title="Eliminar paciente"
                        disabled={deleteMutation.isPending}
                        onClick={() => {
                          if (
                            !window.confirm(
                              `Eliminar a ${patient.firstName} ${patient.lastName} borrará citas, encounters y accesos compartidos asociados. Esta acción no se puede deshacer. ¿Continuar?`,
                            )
                          ) {
                            return;
                          }

                          deleteMutation.mutate(patient.id);
                        }}
                      >
                        <ActionIcon kind="delete" />
                        <span>{deleteMutation.isPending ? "Eliminando" : "Eliminar"}</span>
                      </button>
                    </>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <strong>No hay pacientes para este filtro.</strong>
            <p>
              Ajusta la búsqueda o crea un nuevo registro desde el panel lateral. La ficha quedará
              lista para continuidad clínica.
            </p>
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

      {sharingPatient ? (
        <Card>
          <SectionHeading
            title={`Compartir a ${sharingPatient.firstName} ${sharingPatient.lastName}`}
            description="Busca al profesional por correo, nombre o profesión. Solo se comparte dentro de cuentas ya registradas en Axyscare."
          />
          <PatientSharePanel patientId={sharingPatient.id} ownerUserId={sharingPatient.ownerUserId} />
          <div className="btn-row" style={{ marginTop: 12 }}>
            <button type="button" className="btn secondary" onClick={() => setSharingPatient(null)}>
              Cerrar panel
            </button>
            <Link href={`/pacientes/${sharingPatient.id}`} className="pill-link">
              Abrir ficha
            </Link>
          </div>
        </Card>
      ) : null}
      </aside>
      </div>
    </div>
  );
}
