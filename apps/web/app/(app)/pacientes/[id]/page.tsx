import { PatientDetailPage } from "@/components/patients/patient-detail-page";

export default async function PatientDetailRoute({
  params,
}: {
  params: Promise<{ id: string }> | { id: string };
}) {
  const resolvedParams = await Promise.resolve(params);

  return <PatientDetailPage patientId={resolvedParams.id} />;
}
