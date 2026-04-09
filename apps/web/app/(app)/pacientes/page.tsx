"use client";

import { calculateAge } from "@axyscare/core-clinical";
import type { Patient } from "@axyscare/core-types";
import { deletePatient, listPatients, searchProfessionals, sharePatient } from "@axyscare/core-db";
import { Card, SectionHeading, StatusBadge } from "@axyscare/ui-shared";
import { startTransition, useDeferredValue, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PatientForm } from "@/components/forms/patient-form";
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
        <path d="M15.7 8.1a3.5 3.5 0 1 0-1.3-2.7c0 .2 0 .4.1.6L8.8 9.1a3.5 3.5 0 1 0 0 5.8l5.7 3.1a3.1 3.1 0 0 0-.1.7 3.5 3.5 0 1 0 1.1-2.5l-5.9-3.2a3.6 3.6 0 0 0 0-1.8l6.1-3.1Z" />
      </svg>
    );
  }

  if (kind === "delete") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M9 3h6l1 2h4v2H4V5h4l1-2Zm-2 6h10l-.7 10.2A2 2 0 0 1 14.3 21H9.7a2 2 0 0 1-2-1.8L7 9Zm3 2v7h2v-7h-2Zm4 0v7h2v-7h-2Z" />
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
  const [editingPatient, setEditingPatient] = useState<Patient | null>(null);
  const [sharingPatient, setSharingPatient] = useState<Patient | null>(null);
  const [shareSearch, setShareSearch] = useState("");
  const [selectedProfessionalId, setSelectedProfessionalId] = useState("");
  const [permissionLevel, setPermissionLevel] = useState<"read" | "edit">("read");
  const deferredSearch = useDeferredValue(search);
  const deferredShareSearch = useDeferredValue(shareSearch);
  const patientsQuery = useQuery({
    queryKey: ["patients", deferredSearch],
    queryFn: () => listPatients(client, deferredSearch),
  });
  const professionalsQuery = useQuery({
    queryKey: ["professional-search", "patients-page", deferredShareSearch],
    queryFn: () => searchProfessionals(client, deferredShareSearch),
    enabled: Boolean(sharingPatient) && deferredShareSearch.trim().length >= 2,
  });
  const patients = patientsQuery.data ?? [];
  const ownedCount = patients.filter((patient) => patient.relationshipToViewer === "owner").length;
  const sharedCount = patients.filter((patient) => patient.relationshipToViewer !== "owner").length;
  const selectedProfessional = useMemo(
    () => professionalsQuery.data?.find((professional) => professional.id === selectedProfessionalId) ?? null,
    [professionalsQuery.data, selectedProfessionalId],
  );

  const shareMutation = useMutation({
    mutationFn: async () => {
      if (!sharingPatient || !selectedProfessionalId) {
        throw new Error("Selecciona un usuario por correo antes de compartir.");
      }

      return sharePatient(client, {
        patientId: sharingPatient.id,
        sharedWithUserId: selectedProfessionalId,
        permissionLevel,
        status: "active",
        expiresAt: null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["patients"] });
      queryClient.invalidateQueries({ queryKey: ["patients", deferredSearch] });
      queryClient.invalidateQueries({ queryKey: ["patients-shared-with-me"] });
      queryClient.invalidateQueries({ queryKey: ["patients-shared-by-me"] });
      if (sharingPatient) {
        queryClient.invalidateQueries({ queryKey: ["patient-access", sharingPatient.id] });
      }
      setShareSearch("");
      setSelectedProfessionalId("");
      setPermissionLevel("read");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (patientId: string) => deletePatient(client, patientId),
    onSuccess: (_, deletedPatientId) => {
      queryClient.invalidateQueries({ queryKey: ["patients"] });
      queryClient.invalidateQueries({ queryKey: ["patients", deferredSearch] });
      queryClient.invalidateQueries({ queryKey: ["patient", deletedPatientId] });
      queryClient.invalidateQueries({ queryKey: ["encounters", deletedPatientId] });
      queryClient.invalidateQueries({ queryKey: ["patient-access", deletedPatientId] });
      queryClient.invalidateQueries({ queryKey: ["patients-shared-with-me"] });
      queryClient.invalidateQueries({ queryKey: ["patients-shared-by-me"] });
      if (editingPatient?.id === deletedPatientId) {
        setEditingPatient(null);
      }
      if (sharingPatient?.id === deletedPatientId) {
        setSharingPatient(null);
      }
    },
  });

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
                  {patient.relationshipToViewer === "owner" ? (
                    <button
                      type="button"
                      className="action-pill action-pill--share"
                      title="Compartir paciente"
                      onClick={() => {
                        setEditingPatient(null);
                        setSharingPatient(patient);
                        setShareSearch("");
                        setSelectedProfessionalId("");
                        setPermissionLevel("read");
                        shareMutation.reset();
                      }}
                    >
                      <ActionIcon kind="share" />
                      <span>Compartir</span>
                    </button>
                  ) : null}
                  <button
                    type="button"
                    className="action-pill action-pill--edit"
                    title="Editar paciente"
                    onClick={() => {
                      setSharingPatient(null);
                      setEditingPatient(patient);
                    }}
                  >
                    <ActionIcon kind="edit" />
                    <span>Editar</span>
                  </button>
                  {patient.relationshipToViewer === "owner" ? (
                    <button
                      type="button"
                      className="action-pill action-pill--danger"
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
                      <span>Eliminar</span>
                    </button>
                  ) : null}
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
      {sharingPatient ? (
      <Card>
        <SectionHeading
          title={`Compartir a ${sharingPatient.firstName} ${sharingPatient.lastName}`}
          description="Escribe el correo del otro usuario del sistema y selecciónalo para que el paciente aparezca en sus compartidos."
        />
        <div className="stack">
          <label className="stack" style={{ gap: 8 }}>
            <span className="field-label">Correo del profesional</span>
            <input
              placeholder="correo@dominio.com"
              value={shareSearch}
              onChange={(event) => {
                setShareSearch(event.target.value);
                setSelectedProfessionalId("");
                shareMutation.reset();
              }}
            />
          </label>

          <label className="stack" style={{ gap: 8 }}>
            <span className="field-label">Permiso</span>
            <select
              value={permissionLevel}
              onChange={(event) => setPermissionLevel(event.target.value as "read" | "edit")}
            >
              <option value="read">read</option>
              <option value="edit">edit</option>
            </select>
          </label>

          {shareSearch.trim().length >= 2 ? (
            <div className="stack">
              {(professionalsQuery.data ?? []).length ? (
                (professionalsQuery.data ?? []).map((professional) => (
                  <button
                    key={professional.id}
                    type="button"
                    className={`picker-row ${selectedProfessional?.id === professional.id ? "selected" : ""}`}
                    onClick={() => setSelectedProfessionalId(professional.id)}
                  >
                    <strong>
                      {professional.firstName} {professional.lastName}
                    </strong>
                    <span>
                      {professional.profession} · {professional.email}
                    </span>
                  </button>
                ))
              ) : (
                <div className="info-panel">
                  <strong>No encontramos un usuario con ese correo.</strong>
                  <span>Verifica el correo o pide al profesional que tenga cuenta creada en el sistema.</span>
                </div>
              )}
            </div>
          ) : (
            <div className="info-panel">
              <strong>Cómo funciona</strong>
              <span>Empieza escribiendo el correo del otro usuario. Cuando aparezca en la lista, selecciónalo y comparte el paciente.</span>
            </div>
          )}

          {shareMutation.error ? (
            <div className="form-error">
              {shareMutation.error instanceof Error ? shareMutation.error.message : "No se pudo compartir el paciente."}
            </div>
          ) : null}

          {shareMutation.isSuccess ? (
            <div className="info-panel">
              <strong>Paciente compartido</strong>
              <span>El usuario seleccionado ya debería verlo en su bandeja de pacientes compartidos.</span>
            </div>
          ) : null}

          <div className="btn-row">
            <button
              type="button"
              className="btn"
              disabled={shareMutation.isPending || !selectedProfessionalId}
              onClick={() => shareMutation.mutate()}
            >
              {shareMutation.isPending ? "Compartiendo..." : "Compartir paciente"}
            </button>
            <button
              type="button"
              className="btn secondary"
              onClick={() => {
                setSharingPatient(null);
                setShareSearch("");
                setSelectedProfessionalId("");
                setPermissionLevel("read");
                shareMutation.reset();
              }}
            >
              Cerrar
            </button>
          </div>
        </div>
      </Card>
      ) : null}
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
            setSharingPatient(null);
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
        {deleteMutation.error ? (
          <div className="form-error">
            {deleteMutation.error instanceof Error
              ? deleteMutation.error.message
              : "No se pudo eliminar el paciente."}
          </div>
        ) : null}
        <div className="info-panel">
          <strong>Qué sigue después</strong>
          <span>
            {sharingPatient
              ? "Comparte el paciente por correo y el otro profesional lo verá en su módulo de compartidos."
              : editingPatient
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
