"use client";

import { calculateAge } from "@axyscare/core-clinical";
import { listPatients } from "@axyscare/core-db";
import { Card, SectionHeading, StatusBadge } from "@axyscare/ui-shared";
import { useDeferredValue, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { PatientForm } from "@/components/forms/patient-form";
import { useAuth } from "@/components/providers/providers";
import { useTableRealtime } from "@/components/realtime/use-table-realtime";

export default function PatientsPage() {
  const { client } = useAuth();
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const patientsQuery = useQuery({
    queryKey: ["patients", deferredSearch],
    queryFn: () => listPatients(client, deferredSearch),
  });

  useTableRealtime("patients-browser", ["patients", "patient_access"], [["patients", deferredSearch]]);

  return (
    <div className="two-column">
      <Card>
        <SectionHeading
          title="Pacientes"
          description="Listado clínico con búsqueda y acceso a ficha."
          action={<input placeholder="Buscar..." value={search} onChange={(event) => setSearch(event.target.value)} />}
        />
        {(patientsQuery.data ?? []).map((patient) => (
          <div key={patient.id} className="list-row">
            <div>
              <strong>
                {patient.firstName} {patient.lastName}
              </strong>
              <p className="muted">
                {patient.documentType}: {patient.documentNumber} · {calculateAge(patient.birthDate)} años
              </p>
            </div>
            <div className="btn-row">
              <StatusBadge
                label={patient.relationshipToViewer === "owner" ? "propio" : "compartido"}
                tone={patient.relationshipToViewer === "owner" ? "success" : "info"}
              />
              <a href={`/pacientes/${patient.id}`} className="pill-link">
                Abrir ficha
              </a>
            </div>
          </div>
        ))}
      </Card>
      <Card>
        <SectionHeading title="Nuevo paciente" description="Registro clínico básico con datos demográficos y antecedentes." />
        <PatientForm />
      </Card>
    </div>
  );
}
