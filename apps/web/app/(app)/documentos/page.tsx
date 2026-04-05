import { ModulePlaceholder } from "@/components/layout/module-placeholder";

export default function DocumentsPage() {
  return (
    <ModulePlaceholder
      title="Documentos"
      description="El PDF clínico inicial se descarga desde Nueva atención; este módulo queda listo para consolidar adjuntos e impresiones."
      bullets={[
        "Resumen clínico PDF con paciente y profesional.",
        "Estructura preparada para evolución, constancias y planes de cuidado.",
        "Buckets y rutas seguras pendientes de configurar en Storage.",
      ]}
    />
  );
}

