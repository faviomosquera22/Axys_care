"use client";

import { listAppointments, listAttachments, listEncounters, listPatients } from "@axyscare/core-db";
import { useQuery } from "@tanstack/react-query";
import { useDeferredValue, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { trackUIEvent } from "@/lib/client-analytics";
import { useAuth } from "@/components/providers/providers";

type SearchResult = {
  id: string;
  label: string;
  detail: string;
  href: string;
  group: string;
};

function formatDateTime(value: string) {
  return new Date(value).toLocaleString();
}

function renderHighlightedText(value: string, query: string) {
  if (!query) return value;
  const normalizedValue = value.toLowerCase();
  const normalizedQuery = query.toLowerCase();
  const index = normalizedValue.indexOf(normalizedQuery);

  if (index === -1) return value;

  const before = value.slice(0, index);
  const match = value.slice(index, index + query.length);
  const after = value.slice(index + query.length);

  return (
    <>
      {before}
      <mark>{match}</mark>
      {after}
    </>
  );
}

export function GlobalSearch() {
  const router = useRouter();
  const { client } = useAuth();
  const [term, setTerm] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const deferredTerm = useDeferredValue(term.trim());
  const shouldSearch = deferredTerm.length >= 2;

  const patientsQuery = useQuery({
    queryKey: ["global-search", "patients", deferredTerm],
    queryFn: () => listPatients(client, deferredTerm),
    enabled: shouldSearch,
  });

  const appointmentsQuery = useQuery({
    queryKey: ["global-search", "appointments"],
    queryFn: () => {
      const from = new Date();
      from.setDate(from.getDate() - 30);
      const to = new Date();
      to.setDate(to.getDate() + 120);
      return listAppointments(client, from.toISOString(), to.toISOString());
    },
    enabled: shouldSearch,
  });

  const encountersQuery = useQuery({
    queryKey: ["global-search", "encounters"],
    queryFn: () => listEncounters(client),
    enabled: shouldSearch,
  });

  const attachmentsQuery = useQuery({
    queryKey: ["global-search", "attachments"],
    queryFn: () => listAttachments(client),
    enabled: shouldSearch,
  });

  const patientResults = useMemo<SearchResult[]>(
    () =>
      (patientsQuery.data ?? []).slice(0, 5).map((patient) => ({
        id: patient.id,
        label: `${patient.firstName} ${patient.lastName}`.trim(),
        detail: `${patient.documentType}: ${patient.documentNumber}`,
        href: `/pacientes/${patient.id}`,
        group: "Pacientes",
      })),
    [patientsQuery.data],
  );

  const appointmentResults = useMemo<SearchResult[]>(() => {
    if (!shouldSearch) return [];

    const patients = new Map(
      (patientsQuery.data ?? []).map((patient) => [patient.id, `${patient.firstName} ${patient.lastName}`.trim()]),
    );

    return (appointmentsQuery.data ?? [])
      .filter((appointment) => {
        const patientName = patients.get(appointment.patientId) ?? "";
        return `${appointment.reason} ${patientName}`.toLowerCase().includes(deferredTerm.toLowerCase());
      })
      .slice(0, 4)
      .map((appointment) => ({
        id: appointment.id,
        label: appointment.reason,
        detail: `${formatDateTime(appointment.startAt)} · ${patients.get(appointment.patientId) ?? "Paciente"}`,
        href: "/agenda",
        group: "Citas",
      }));
  }, [appointmentsQuery.data, deferredTerm, patientsQuery.data, shouldSearch]);

  const encounterResults = useMemo<SearchResult[]>(() => {
    if (!shouldSearch) return [];

    const patients = new Map(
      (patientsQuery.data ?? []).map((patient) => [patient.id, `${patient.firstName} ${patient.lastName}`.trim()]),
    );

    return (encountersQuery.data ?? [])
      .filter((encounter) => {
        const patientName = patients.get(encounter.patientId) ?? "";
        return `${encounter.chiefComplaint ?? ""} ${patientName}`.toLowerCase().includes(deferredTerm.toLowerCase());
      })
      .slice(0, 4)
      .map((encounter) => ({
        id: encounter.id,
        label: encounter.chiefComplaint || "Encounter clínico",
        detail: `${patients.get(encounter.patientId) ?? "Paciente"} · ${formatDateTime(encounter.startedAt)}`,
        href: `/historia-clinica?patientId=${encounter.patientId}&encounterId=${encounter.id}`,
        group: "Encuentros",
      }));
  }, [deferredTerm, encountersQuery.data, patientsQuery.data, shouldSearch]);

  const attachmentResults = useMemo<SearchResult[]>(() => {
    if (!shouldSearch) return [];

    return (attachmentsQuery.data ?? [])
      .filter((attachment) =>
        `${attachment.fileName} ${attachment.category}`.toLowerCase().includes(deferredTerm.toLowerCase()),
      )
      .slice(0, 4)
      .map((attachment) => ({
        id: attachment.id ?? `${attachment.fileName}-${attachment.createdAt ?? "attachment"}`,
        label: attachment.fileName,
        detail: `${attachment.category} · ${attachment.mimeType}`,
        href:
          attachment.patientId && attachment.encounterId
            ? `/historia-clinica?patientId=${attachment.patientId}&encounterId=${attachment.encounterId}`
            : "/documentos",
        group: "Documentos",
      }));
  }, [attachmentsQuery.data, deferredTerm, shouldSearch]);

  const groupedResults = useMemo(
    () => ({
      Pacientes: patientResults,
      Citas: appointmentResults,
      Encuentros: encounterResults,
      Documentos: attachmentResults,
    }),
    [appointmentResults, attachmentResults, encounterResults, patientResults],
  );

  const flatResults = useMemo(
    () => [...patientResults, ...appointmentResults, ...encounterResults, ...attachmentResults],
    [appointmentResults, attachmentResults, encounterResults, patientResults],
  );

  const isLoading =
    patientsQuery.isLoading ||
    appointmentsQuery.isLoading ||
    encountersQuery.isLoading ||
    attachmentsQuery.isLoading;

  const hasResults = flatResults.length > 0;

  function openResult(result: SearchResult) {
    trackUIEvent("global_search_select", `${result.group}:${result.label}`);
    setTerm("");
    setActiveIndex(0);
    router.push(result.href);
  }

  return (
    <div className="global-search">
      <label className="global-search__field">
        <span className="sr-only">Buscar pacientes o citas</span>
        <input
          ref={inputRef}
          value={term}
          onChange={(event) => {
            setTerm(event.target.value);
            setActiveIndex(0);
          }}
          onKeyDown={(event) => {
            if (!shouldSearch || !flatResults.length) {
              if (event.key === "Escape") {
                setTerm("");
              }
              return;
            }

            if (event.key === "ArrowDown") {
              event.preventDefault();
              setActiveIndex((current) => (current + 1) % flatResults.length);
            }

            if (event.key === "ArrowUp") {
              event.preventDefault();
              setActiveIndex((current) => (current - 1 + flatResults.length) % flatResults.length);
            }

            if (event.key === "Enter") {
              event.preventDefault();
              openResult(flatResults[activeIndex] ?? flatResults[0]);
            }

            if (event.key === "Escape") {
              setTerm("");
              inputRef.current?.blur();
            }
          }}
          placeholder="Buscar paciente, cita, encuentro o documento"
          aria-label="Buscar paciente, cita, encuentro o documento"
          aria-expanded={shouldSearch}
          aria-controls="global-search-panel"
        />
      </label>
      {shouldSearch ? (
        <div id="global-search-panel" className="global-search__panel">
          {isLoading ? <p className="global-search__hint">Buscando resultados...</p> : null}
          {!isLoading && !hasResults ? (
            <p className="global-search__hint">Sin coincidencias. Prueba con nombre, documento, motivo o archivo.</p>
          ) : null}
          {Object.entries(groupedResults).map(([group, results]) =>
            results.length ? (
              <div key={group} className="global-search__group">
                <span className="global-search__title">{group}</span>
                {results.map((result) => {
                  const itemIndex = flatResults.findIndex((item) => item.id === result.id && item.group === result.group);
                  const isActive = itemIndex === activeIndex;

                  return (
                    <button
                      key={`${result.group}-${result.id}`}
                      type="button"
                      className={`global-search__item ${isActive ? "active" : ""}`}
                      onMouseEnter={() => setActiveIndex(itemIndex)}
                      onClick={() => openResult(result)}
                    >
                      <strong>{renderHighlightedText(result.label, deferredTerm)}</strong>
                      <span>{renderHighlightedText(result.detail, deferredTerm)}</span>
                    </button>
                  );
                })}
              </div>
            ) : null,
          )}
        </div>
      ) : null}
    </div>
  );
}
