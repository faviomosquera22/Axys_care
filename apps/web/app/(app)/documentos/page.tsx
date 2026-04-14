"use client";

import { listAttachments, listPatients } from "@axyscare/core-db";
import {
  Card,
  EmptyStatePanel,
  LoadingStateCard,
  SectionHeading,
  StatusBadge,
} from "@axyscare/ui-shared";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/components/providers/providers";
import { usePatientRealtime } from "@/components/realtime/use-patient-realtime";

export default function DocumentsPage() {
  const { client } = useAuth();
  const searchParams = useSearchParams();
  const patientIdFromQuery = searchParams.get("patientId") ?? "";
  const encounterIdFromQuery = searchParams.get("encounterId") ?? "";
  const [selectedPatientId, setSelectedPatientId] = useState("");

  useEffect(() => {
    if (patientIdFromQuery) {
      setSelectedPatientId(patientIdFromQuery);
    }
  }, [patientIdFromQuery]);

  const patientsQuery = useQuery({
    queryKey: ["patients", "documents"],
    queryFn: () => listPatients(client),
  });
  const attachmentsQuery = useQuery({
    queryKey: ["attachments", "documents", selectedPatientId],
    queryFn: () =>
      listAttachments(
        client,
        selectedPatientId ? { patientId: selectedPatientId } : undefined,
      ),
  });
  usePatientRealtime(selectedPatientId || undefined, [
    ["attachments", "documents", selectedPatientId],
  ]);
  const attachments = attachmentsQuery.data ?? [];
  const documentSummary = useMemo(() => {
    const byCategory = attachments.reduce<Record<string, number>>((accumulator, attachment) => {
      accumulator[attachment.category] = (accumulator[attachment.category] ?? 0) + 1;
      return accumulator;
    }, {});

    return [
      { label: "Archivos visibles", value: attachments.length },
      { label: "Resultados", value: byCategory.resultado ?? 0 },
      { label: "Imágenes", value: byCategory.imagen ?? 0 },
      { label: "Documentos del episodio", value: attachments.filter((item) => item.encounterId === encounterIdFromQuery).length },
    ];
  }, [attachments, encounterIdFromQuery]);

  return (
    <div className="stack">
      <div className="topbar">
        <div>
          <h1>Centro documental clínico</h1>
          <p>
            Consolida resultados, consentimientos, imágenes y soportes del
            paciente o del episodio con trazabilidad clínica.
          </p>
        </div>
      </div>

      <div className="summary-grid">
        {documentSummary.map((item) => (
          <Card key={item.label} className="summary-item">
            <span>{item.label}</span>
            <strong>{item.value}</strong>
          </Card>
        ))}
      </div>

      <Card>
        <SectionHeading
          title="Filtro del expediente"
          description="Los documentos viven dentro de la historia clínica; aquí se concentran para búsqueda, descarga y continuidad."
        />
        <div className="form-grid">
          <div className="form-field">
            <span>Paciente</span>
            <select
              value={selectedPatientId}
              onChange={(event) => setSelectedPatientId(event.target.value)}
            >
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
          <span>
            Sube el archivo dentro de Nueva atención o desde historia clínica.
            Aquí podrás auditarlo, descargarlo y volver al episodio correcto.
          </span>
        </div>
        <div className="btn-row">
          {selectedPatientId ? (
            <Link
              href={`/historia-clinica?patientId=${selectedPatientId}${encounterIdFromQuery ? `&encounterId=${encounterIdFromQuery}` : ""}`}
              className="pill-link"
            >
              Abrir historia longitudinal
            </Link>
          ) : null}
          {selectedPatientId ? (
            <Link
              href={`/nueva-atencion?patientId=${selectedPatientId}${encounterIdFromQuery ? `&encounterId=${encounterIdFromQuery}` : ""}`}
              className="pill-link"
            >
              Adjuntar desde atención
            </Link>
          ) : (
            <Link href="/nueva-atencion" className="pill-link">
              Adjuntar desde atención
            </Link>
          )}
        </div>
      </Card>

      <Card>
        <SectionHeading
          title="Adjuntos registrados"
          description="PDFs, resultados escaneados y otros documentos clínicos visibles por trazabilidad."
          action={
            <StatusBadge
              label={`${attachmentsQuery.data?.length ?? 0} archivos`}
              tone="info"
            />
          }
        />
        {attachmentsQuery.isPending ? (
          <LoadingStateCard
            title="Cargando adjuntos del expediente"
            description="Estamos consolidando documentos, resultados y archivos asociados al paciente o al encounter."
          />
        ) : (attachmentsQuery.data ?? []).length ? (
          <div className="stack">
            {attachments.map((attachment) => (
              <div key={attachment.id} className="trace-row">
                <strong>{attachment.fileName}</strong>
                <span>
                  {attachment.category} ·{" "}
                  {attachment.createdByName ?? "Sin autor"} ·{" "}
                  {attachment.createdAt
                    ? new Date(attachment.createdAt).toLocaleString()
                    : "sin fecha"}
                </span>
                <div className="btn-row">
                  {attachment.encounterId ? (
                    <Link
                      href={`/historia-clinica?patientId=${attachment.patientId ?? ""}&encounterId=${attachment.encounterId}`}
                      className="pill-link"
                    >
                      Ver episodio
                    </Link>
                  ) : null}
                  {attachment.patientId ? (
                    <Link
                      href={`/pacientes/${attachment.patientId}`}
                      className="pill-link"
                    >
                      Ver paciente
                    </Link>
                  ) : null}
                  {attachment.path.startsWith("data:") ? (
                    <a
                      href={attachment.path}
                      download={attachment.fileName}
                      className="pill-link"
                    >
                      Descargar
                    </a>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyStatePanel
            title="No hay documentos adjuntos todavía."
            description="Cuando subas un PDF o una imagen desde Nueva atención, quedará visible aquí con trazabilidad del episodio."
            action={
              <Link href="/nueva-atencion" className="pill-link">
                Ir a Nueva atención
              </Link>
            }
          />
        )}
      </Card>
    </div>
  );
}
