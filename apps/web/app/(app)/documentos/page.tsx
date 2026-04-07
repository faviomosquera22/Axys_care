"use client";

import { listAttachments, listPatients } from "@axyscare/core-db";
import { Card, SectionHeading, StatusBadge } from "@axyscare/ui-shared";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";
import { useAuth } from "@/components/providers/providers";

export default function DocumentsPage() {
  const { client } = useAuth();
  const [selectedPatientId, setSelectedPatientId] = useState("");

  const patientsQuery = useQuery({
    queryKey: ["patients", "documents"],
    queryFn: () => listPatients(client),
  });
  const attachmentsQuery = useQuery({
    queryKey: ["attachments", "documents", selectedPatientId],
    queryFn: () => listAttachments(client, selectedPatientId ? { patientId: selectedPatientId } : undefined),
  });

  return (
    <div className="stack">
      <div className="topbar">
        <div>
          <h1>Documentos clínicos</h1>
          <p>Resultados, PDFs e imágenes adjuntos al paciente o al encounter. Ya no es un módulo aislado.</p>
        </div>
      </div>

      <Card>
        <SectionHeading title="Filtro por paciente" description="Los documentos viven dentro de la historia clínica; aquí solo se consolidan." />
        <div className="form-grid">
          <div className="form-field">
            <span>Paciente</span>
            <select value={selectedPatientId} onChange={(event) => setSelectedPatientId(event.target.value)}>
              <option value="">Todos</option>
              {(patientsQuery.data ?? []).map((patient) => (
                <option key={patient.id} value={patient.id}>
                  {patient.firstName} {patient.lastName}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="info-panel">
          <strong>Flujo recomendado</strong>
          <span>Sube el PDF o la imagen dentro de Nueva atención o al revisar la historia clínica. Aquí podrás localizarlo y descargarlo.</span>
        </div>
      </Card>

      <Card>
        <SectionHeading
          title="Adjuntos registrados"
          description="PDFs, resultados escaneados y otros documentos clínicos visibles por trazabilidad."
          action={<StatusBadge label={`${attachmentsQuery.data?.length ?? 0} archivos`} tone="info" />}
        />
        {(attachmentsQuery.data ?? []).length ? (
          <div className="stack">
            {(attachmentsQuery.data ?? []).map((attachment) => (
              <div key={attachment.id} className="trace-row">
                <strong>{attachment.fileName}</strong>
                <span>
                  {attachment.category} · {attachment.createdByName ?? "Sin autor"} ·{" "}
                  {attachment.createdAt ? new Date(attachment.createdAt).toLocaleString() : "sin fecha"}
                </span>
                <div className="btn-row">
                  {attachment.encounterId ? (
                    <Link href={`/historia-clinica?patientId=${attachment.patientId ?? ""}`} className="pill-link">
                      Ver historia
                    </Link>
                  ) : null}
                  {attachment.path.startsWith("data:") ? (
                    <a href={attachment.path} download={attachment.fileName} className="pill-link">
                      Descargar
                    </a>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <strong>No hay documentos adjuntos todavía.</strong>
            <p>Cuando subas un PDF o una imagen desde Nueva atención, quedará visible aquí.</p>
          </div>
        )}
      </Card>
    </div>
  );
}
