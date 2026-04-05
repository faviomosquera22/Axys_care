import { ModulePlaceholder } from "@/components/layout/module-placeholder";

export default function NursingPage() {
  return (
    <ModulePlaceholder
      title="Módulo de enfermería"
      description="La valoración básica ya opera dentro de Nueva atención. Esta vista queda preparada para planes y seguimiento."
      bullets={[
        "Valoración por conciencia, movilidad, piel, eliminación e hidratación.",
        "Sugerencias internas por reglas clínicas propias.",
        "Base lista para planes de cuidado y reevaluación.",
      ]}
    />
  );
}

