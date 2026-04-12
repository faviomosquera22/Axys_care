"use client";

import { getProfile, signOut } from "@axyscare/core-db";
import { useQuery } from "@tanstack/react-query";
import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { GlobalSearch } from "@/components/layout/global-search";
import { RouteFocusStrip } from "@/components/layout/route-focus-strip";
import { useAuth } from "@/components/providers/providers";

const navigationGroups = [
  {
    label: "Operación",
    items: [
      { href: "/dashboard", label: "Inicio" },
      { href: "/agenda", label: "Agenda" },
      { href: "/pacientes", label: "Pacientes" },
      { href: "/nueva-atencion", label: "Nueva atención" },
    ],
  },
  {
    label: "Expediente",
    items: [
      { href: "/historia-clinica", label: "Historia clínica" },
      { href: "/documentos", label: "Documentos" },
      { href: "/procedimientos", label: "Procedimientos" },
      { href: "/examenes", label: "Exámenes" },
      { href: "/enfermeria", label: "Enfermería" },
    ],
  },
  {
    label: "Colaboración",
    items: [
      { href: "/compartidos-conmigo", label: "Compartidos conmigo" },
      { href: "/compartidos-por-mi", label: "Compartidos por mí" },
      { href: "/configuracion", label: "Configuración" },
    ],
  },
];

function getPageMeta(pathname: string) {
  if (pathname.startsWith("/agenda")) {
    return {
      title: "Agenda clínica",
      description: "Coordina citas, seguimiento y apertura de atención desde la misma estación.",
    };
  }

  if (pathname.startsWith("/pacientes/")) {
    return {
      title: "Ficha del paciente",
      description: "Contexto activo del expediente y acceso directo a continuidad clínica.",
    };
  }

  if (pathname.startsWith("/pacientes")) {
    return {
      title: "Base de pacientes",
      description: "Busca, filtra y entra rápido a la ficha o a la atención.",
    };
  }

  if (pathname.startsWith("/historia-clinica")) {
    return {
      title: "Historia clínica",
      description: "Lectura longitudinal del encounter y del expediente clínico.",
    };
  }

  if (pathname.startsWith("/nueva-atencion")) {
    return {
      title: "Nueva atención",
      description: "Flujo guiado para documentar el encounter sin perder contexto.",
    };
  }

  if (pathname.startsWith("/configuracion")) {
    return {
      title: "Configuración",
      description: "Perfil profesional, firma y sincronización operativa.",
    };
  }

  return {
    title: "Centro clínico",
    description: "Vista operativa para coordinar agenda, pacientes y continuidad clínica.",
  };
}

function getQuickActions(pathname: string) {
  const patientMatch = pathname.match(/^\/pacientes\/([^/]+)/);
  const patientId = patientMatch?.[1];

  if (patientId) {
    return [
      { href: `/nueva-atencion?patientId=${patientId}`, label: "Retomar atención" },
      { href: `/historia-clinica?patientId=${patientId}`, label: "Historia clínica" },
      { href: `/pacientes/${patientId}`, label: "Resumen del paciente" },
      { href: "/agenda", label: "Programar seguimiento" },
    ];
  }

  if (pathname.startsWith("/agenda")) {
    return [
      { href: "/nueva-atencion", label: "Abrir atención" },
      { href: "/pacientes", label: "Buscar paciente" },
      { href: "/configuracion", label: "Google Calendar" },
      { action: "print", label: "Imprimir agenda" },
    ];
  }

  if (pathname.startsWith("/historia-clinica")) {
    return [
      { href: "/pacientes", label: "Buscar paciente" },
      { href: "/nueva-atencion", label: "Continuar atención" },
      { href: "/documentos", label: "Documentos clínicos" },
      { action: "print", label: "Imprimir historia" },
    ];
  }

  if (pathname.startsWith("/configuracion")) {
    return [
      { href: "/configuracion", label: "Perfil profesional" },
      { href: "/configuracion", label: "Firma y sello" },
      { href: "/configuracion", label: "Google Calendar" },
    ];
  }

  return [
    { href: "/nueva-atencion", label: "Nueva atención" },
    { href: "/agenda", label: "Agenda de hoy" },
    { href: "/pacientes", label: "Buscar paciente" },
    { href: "/documentos", label: "Documentos clínicos" },
  ];
}

function QuickActionIcon({ label }: { label: string }) {
  let icon: ReactNode = null;

  if (label.includes("Paciente") || label.includes("Pacientes") || label.includes("Ficha")) {
    icon = (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4Zm0 2c-3.3 0-6 1.8-6 4v1h12v-1c0-2.2-2.7-4-6-4Z" />
      </svg>
    );
  } else if (label.includes("Cita") || label.includes("Calendario")) {
    icon = (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M7 2h2v2h6V2h2v2h3v16H4V4h3V2Zm11 8H6v8h12v-8Z" />
      </svg>
    );
  } else if (label.includes("atención") || label.includes("historia")) {
    icon = (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M5 4h12a2 2 0 0 1 2 2v12H7a2 2 0 0 0-2 2V4Zm2 3v2h8V7H7Zm0 4v2h8v-2H7Z" />
      </svg>
    );
  } else if (label.includes("Documento")) {
    icon = (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M7 3h7l5 5v13H7V3Zm7 1.5V9h4.5L14 4.5ZM9 12v2h6v-2H9Zm0 4v2h6v-2H9Z" />
      </svg>
    );
  } else if (label.includes("Imprimir")) {
    icon = (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M7 3h10v4H7V3Zm10 6a3 3 0 0 1 3 3v5h-3v4H7v-4H4v-5a3 3 0 0 1 3-3h10Zm-2 10v-4H9v4h6Z" />
      </svg>
    );
  } else if (label.includes("Google")) {
    icon = (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 3a9 9 0 1 0 8.5 12H12v-3h8.8A9 9 0 0 0 12 3Z" />
      </svg>
    );
  }

  if (!icon) return null;
  return <span className="quick-chip__icon">{icon}</span>;
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { client, user } = useAuth();
  const profileQuery = useQuery({
    queryKey: ["profile", "shell", user?.id],
    queryFn: () => getProfile(client, user!.id),
    enabled: Boolean(user?.id),
  });
  const profile = profileQuery.data;
  const displayName =
    profile ? `${profile.firstName} ${profile.lastName}`.trim() : user?.email?.split("@")[0] ?? "Sin sesión";
  const subtitle = profile?.profession ?? profile?.role ?? "Perfil profesional";
  const initials = displayName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((value) => value[0]?.toUpperCase() ?? "")
    .join("");
  const quickActions = getQuickActions(pathname);
  const pageMeta = getPageMeta(pathname);

  return (
    <div className="shell-layout">
      <aside className="shell-sidebar">
        <div className="shell-sidebar__brand">
          <div className="shell-sidebar__logo">Ax</div>
          <div className="brand brand--header">
            <strong>Axyscare</strong>
            <span>Historia clínica digital</span>
          </div>
        </div>

        <div className="shell-sidebar__profile">
          <div className="shell-user__avatar">{initials || "AX"}</div>
          <div className="shell-user__meta">
            <strong>{displayName}</strong>
            <span>{profile ? subtitle : user?.email ?? "Sin sesión"}</span>
          </div>
        </div>

        <nav className="shell-sidebar__nav">
          {navigationGroups.map((group) => (
            <div key={group.label} className="shell-nav-group">
              <span className="shell-nav-group__label">{group.label}</span>
              <div className="shell-nav-group__items">
                {group.items.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`shell-sidebar__link ${pathname === item.href || pathname.startsWith(`${item.href}/`) ? "active" : ""}`}
                  >
                    <span className="shell-sidebar__dot" />
                    {item.label}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </nav>

        <div className="shell-sidebar__footer">
          <Link href="/configuracion" className="quick-chip quick-chip--ghost">
            {profile ? "Perfil profesional" : "Completar perfil"}
          </Link>
          <button
            className="quick-chip quick-chip--danger"
            onClick={async () => {
              await signOut(client);
              router.push("/login");
            }}
          >
            Salir
          </button>
        </div>
      </aside>

      <div className="shell-panel">
        <header className="shell-topbar">
          <div className="shell-topbar__main">
            <div>
              <span className="shell-topbar__eyebrow">AxysCare Web</span>
              <h1>{pageMeta.title}</h1>
              <p>{pageMeta.description}</p>
            </div>
            <div className="shell-topbar__actions">
              {quickActions.map((action) =>
                action.href ? (
                  <Link key={`${action.label}-${action.href}`} href={action.href} className="quick-chip">
                    <QuickActionIcon label={action.label} />
                    {action.label}
                  </Link>
                ) : (
                  <button key={action.label} type="button" className="quick-chip quick-chip--ghost" onClick={() => window.print()}>
                    <QuickActionIcon label={action.label} />
                    {action.label}
                  </button>
                ),
              )}
            </div>
          </div>
          <GlobalSearch />
        </header>
        <RouteFocusStrip />
        <main className="shell-main">{children}</main>
      </div>
    </div>
  );
}
