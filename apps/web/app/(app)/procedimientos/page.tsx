import { ModulePlaceholder } from "@/components/layout/module-placeholder";

export default function ProceduresPage() {
  return (
    <ModulePlaceholder
      title="Procedimientos"
      description="Catálogo y tabla base listos para registro clínico estructurado."
      bullets={[
        "Registro de fecha y hora.",
        "Profesional responsable, materiales y resultado.",
        "Relación directa con el episodio clínico.",
      ]}
    />
  );
}

