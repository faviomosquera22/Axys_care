import { ModulePlaceholder } from "@/components/layout/module-placeholder";

export default function ExamsPage() {
  return (
    <ModulePlaceholder
      title="Exámenes"
      description="El esquema y los servicios compartidos ya soportan órdenes y resultados."
      bullets={[
        "Solicitudes por laboratorio, imagen y estudios especiales.",
        "Estados pendiente, recibido y revisado.",
        "Preparado para adjuntos y trazabilidad por encounter.",
      ]}
    />
  );
}

