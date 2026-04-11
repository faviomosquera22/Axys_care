"use client";

import { usePathname } from "next/navigation";

type FocusGuide = {
  eyebrow: string;
  title: string;
  steps: string[];
};

function getGuide(pathname: string): FocusGuide {
  if (pathname.startsWith("/agenda")) {
    return {
      eyebrow: "Ritmo del día",
      title: "Selecciona, decide y entra a la atención desde la agenda.",
      steps: ["Ubica la cita", "Valida estado o contacto", "Abre ficha o encounter"],
    };
  }

  if (pathname.startsWith("/pacientes/")) {
    return {
      eyebrow: "Expediente vivo",
      title: "La ficha debe dejar claro el siguiente paso clínico.",
      steps: ["Lee el contexto", "Retoma o crea atención", "Programa seguimiento"],
    };
  }

  if (pathname.startsWith("/pacientes")) {
    return {
      eyebrow: "Continuidad",
      title: "Encuentra al paciente correcto y actúa sin perder tiempo.",
      steps: ["Busca o filtra", "Abre ficha", "Atiende o comparte"],
    };
  }

  if (pathname.startsWith("/nueva-atencion")) {
    return {
      eyebrow: "Encuentro guiado",
      title: "Confirma contexto, documenta y deja trazabilidad clara.",
      steps: ["Confirma paciente", "Registra atención", "Cierra resumen"],
    };
  }

  return {
    eyebrow: "Flujo recomendado",
    title: "Empieza por el contexto y sigue con la acción clínica más probable.",
    steps: ["Revisa el foco del día", "Abre el módulo correcto", "Mantén continuidad"],
  };
}

export function RouteFocusStrip() {
  const pathname = usePathname();
  const guide = getGuide(pathname);

  return (
    <section className="route-focus-strip" aria-label="Guía contextual de trabajo">
      <div className="route-focus-strip__intro">
        <span>{guide.eyebrow}</span>
        <strong>{guide.title}</strong>
      </div>
      <div className="route-focus-strip__steps">
        {guide.steps.map((step, index) => (
          <div key={step} className="route-focus-strip__step">
            <span>{index + 1}</span>
            <strong>{step}</strong>
          </div>
        ))}
      </div>
    </section>
  );
}
