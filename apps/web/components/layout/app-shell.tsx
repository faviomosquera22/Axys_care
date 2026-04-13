"use client";

import { calculateAge } from "@axyscare/core-clinical";
import { getPatient, getProfile, signOut } from "@axyscare/core-db";
import { useQuery } from "@tanstack/react-query";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/components/providers/providers";

type RoleKey = "admin" | "medico" | "psicologo" | "enfermeria" | "nutricion" | "profesional_mixto";

type NavEntry =
  | { type: "title"; label: string }
  | { type: "item"; href: string; label: string; icon: string; match?: string[]; badge?: string };

type TopbarAction = {
  href?: string;
  label: string;
  icon: string;
  tone: "outline" | "navy" | "primary" | "icon";
  action?: "print";
};

const professionOptions: { role: RoleKey; shortLabel: string }[] = [
  { role: "medico", shortLabel: "Medico" },
  { role: "enfermeria", shortLabel: "Enferm." },
  { role: "psicologo", shortLabel: "Psico." },
  { role: "nutricion", shortLabel: "Nutri." },
  { role: "profesional_mixto", shortLabel: "Mixto" },
];

function withClinicalContext(
  basePath: string,
  options?: { patientId?: string; encounterId?: string; preserveEncounter?: boolean },
) {
  const params = new URLSearchParams();
  if (options?.patientId) params.set("patientId", options.patientId);
  if (options?.preserveEncounter && options?.encounterId) {
    params.set("encounterId", options.encounterId);
  }
  const query = params.toString();
  return query ? `${basePath}?${query}` : basePath;
}

function getPathnameFromHref(href: string) {
  return href.split("?", 1)[0];
}

function getRolePreset(
  role?: string,
  profession?: string,
  context?: { patientId?: string; encounterId?: string },
) {
  const currentRole = (role as RoleKey | undefined) ?? "medico";
  const patientId = context?.patientId;
  const encounterId = context?.encounterId;

  if (currentRole === "enfermeria") {
    return {
      role: currentRole,
      topbarLabel: `🩺 ${profession || "Enfermería"}`,
      topbarClassName: "prof-tag prof-enfermeria",
      sidebarRoleLabel: `${profession || "Enfermería"} · AxysCare`,
      nav: [
        { type: "item", href: "/dashboard", icon: "🏠", label: "Inicio" },
        { type: "item", href: "/agenda", icon: "📅", label: "Agenda" },
        { type: "item", href: "/pacientes", icon: "👤", label: "Pacientes" },
        { type: "title", label: "ENFERMERIA" },
        {
          type: "item",
          href: withClinicalContext("/enfermeria", { patientId, encounterId, preserveEncounter: true }),
          icon: "🩺",
          label: "Valoración integral",
        },
        {
          type: "item",
          href: withClinicalContext("/historia-clinica", { patientId, encounterId, preserveEncounter: true }),
          icon: "📚",
          label: "Historia longitudinal",
          badge: patientId ? "PAC" : undefined,
        },
        {
          type: "item",
          href: withClinicalContext("/nueva-atencion", { patientId, encounterId, preserveEncounter: true }),
          icon: "📋",
          label: "Plan de cuidados",
          badge: encounterId ? "ACT" : undefined,
        },
        {
          type: "item",
          href: withClinicalContext("/documentos", { patientId, encounterId, preserveEncounter: true }),
          icon: "📎",
          label: "Documentos clínicos",
        },
      ] satisfies NavEntry[],
    };
  }

  if (currentRole === "psicologo") {
    return {
      role: currentRole,
      topbarLabel: `🧠 ${profession || "Psicología"}`,
      topbarClassName: "prof-tag prof-psicologia",
      sidebarRoleLabel: `${profession || "Psicología"} · AxysCare`,
      nav: [
        { type: "item", href: "/dashboard", icon: "🏠", label: "Inicio" },
        { type: "item", href: "/agenda", icon: "📅", label: "Agenda" },
        { type: "item", href: "/pacientes", icon: "👤", label: "Pacientes" },
        { type: "title", label: "PSICOLOGIA" },
        { type: "item", href: withClinicalContext("/historia-clinica", { patientId }), icon: "🧠", label: "Historia del caso" },
        { type: "item", href: "/examenes", icon: "🔍", label: "Diagnóstico" },
        { type: "item", href: withClinicalContext("/nueva-atencion", { patientId, encounterId, preserveEncounter: true }), icon: "🎯", label: "Plan terapéutico" },
        { type: "item", href: withClinicalContext("/documentos", { patientId }), icon: "📎", label: "Documentación clínica" },
      ] satisfies NavEntry[],
    };
  }

  if (currentRole === "nutricion") {
    return {
      role: currentRole,
      topbarLabel: `🥗 ${profession || "Nutrición"}`,
      topbarClassName: "prof-tag prof-nutricion",
      sidebarRoleLabel: `${profession || "Nutrición"} · AxysCare`,
      nav: [
        { type: "item", href: "/dashboard", icon: "🏠", label: "Inicio" },
        { type: "item", href: "/agenda", icon: "📅", label: "Agenda" },
        { type: "item", href: "/pacientes", icon: "👤", label: "Pacientes" },
        { type: "title", label: "NUTRICION" },
        { type: "item", href: withClinicalContext("/historia-clinica", { patientId }), icon: "📚", label: "Historia clínica", badge: "ACT" },
        { type: "item", href: withClinicalContext("/nueva-atencion", { patientId, encounterId, preserveEncounter: true }), icon: "🥗", label: "Evaluación nutricional" },
        { type: "item", href: "/examenes", icon: "📏", label: "Indicadores y exámenes" },
        { type: "item", href: withClinicalContext("/documentos", { patientId }), icon: "📝", label: "Plan alimentario" },
      ] satisfies NavEntry[],
    };
  }

  if (currentRole === "profesional_mixto" || currentRole === "admin") {
    return {
      role: currentRole,
      topbarLabel: `⚕ ${profession || "Profesional mixto"}`,
      topbarClassName: "prof-tag prof-mixto",
      sidebarRoleLabel: `${profession || "Profesional mixto"} · AxysCare`,
      nav: [
        { type: "item", href: "/dashboard", icon: "🏠", label: "Inicio" },
        { type: "item", href: "/agenda", icon: "📅", label: "Agenda" },
        { type: "item", href: "/pacientes", icon: "👤", label: "Pacientes" },
        { type: "title", label: "CLINICA" },
        { type: "item", href: withClinicalContext("/historia-clinica", { patientId }), icon: "📚", label: "Historia clínica", badge: "ACT" },
        { type: "item", href: withClinicalContext("/nueva-atencion", { patientId, encounterId, preserveEncounter: true }), icon: "📝", label: "Atención activa" },
        { type: "item", href: "/examenes", icon: "🔍", label: "Exámenes" },
        { type: "item", href: withClinicalContext("/documentos", { patientId }), icon: "📎", label: "Documentación" },
      ] satisfies NavEntry[],
    };
  }

  return {
    role: "medico" as const,
    topbarLabel: `⚕ ${profession || "Medicina General"}`,
    topbarClassName: "prof-tag prof-medico",
    sidebarRoleLabel: `${profession || "Medicina General"} · AxysCare`,
    nav: [
      { type: "item", href: "/dashboard", icon: "🏠", label: "Inicio" },
      { type: "item", href: "/agenda", icon: "📅", label: "Agenda" },
      { type: "item", href: "/pacientes", icon: "👤", label: "Pacientes" },
      { type: "title", label: "MEDICO" },
      { type: "item", href: withClinicalContext("/historia-clinica", { patientId }), icon: "📚", label: "Historia clínica", badge: "ACT" },
      { type: "item", href: withClinicalContext("/nueva-atencion", { patientId, encounterId, preserveEncounter: true }), icon: "📝", label: "Valoración y plan" },
      { type: "item", href: "/examenes", icon: "🔍", label: "Diagnóstico" },
      { type: "item", href: withClinicalContext("/documentos", { patientId }), icon: "💊", label: "Recetas y documentos" },
    ] satisfies NavEntry[],
  };
}

function getPageMeta(pathname: string) {
  if (pathname.startsWith("/agenda")) {
    return {
      title: "Agenda clínica",
      chip: "Jornada activa",
      meta: ["📅 Citas y seguimientos", "⏱ Apertura rápida de atención", "🔄 Reagenda y continuidad"],
    };
  }

  if (pathname.startsWith("/pacientes/")) {
    return {
      title: "Ficha del paciente",
      chip: "Ficha activa",
      meta: ["📋 Expediente centralizado", "🧾 Contexto longitudinal", "📌 Siguiente paso clínico"],
    };
  }

  if (pathname.startsWith("/pacientes")) {
    return {
      title: "Base de pacientes",
      chip: "Directorio activo",
      meta: ["👤 Búsqueda y filtros", "🤝 Compartición controlada", "🩺 Acceso a atención"],
    };
  }

  if (pathname.startsWith("/historia-clinica")) {
    return {
      title: "Historia clínica",
      chip: "Historia activa",
      meta: ["📚 Lectura por encounter", "🧾 Timeline clínico", "📎 Órdenes y adjuntos"],
    };
  }

  if (pathname.startsWith("/nueva-atencion")) {
    return {
      title: "Nueva atención",
      chip: "Edición en curso",
      meta: ["🩺 Registro guiado", "💾 Trazabilidad clínica", "✅ Cierre por etapas"],
    };
  }

  if (pathname.startsWith("/configuracion")) {
    return {
      title: "Configuración",
      chip: "Perfil profesional",
      meta: ["✍️ Firma y sello", "⚕ Datos del profesional", "🔗 Integraciones"],
    };
  }

  return {
    title: "Centro clínico",
    chip: "Operación activa",
    meta: ["📊 Vista operativa", "👥 Pacientes y agenda", "🩺 Continuidad clínica"],
  };
}

function getTopbarActions(pathname: string, patientId?: string, encounterId?: string): TopbarAction[] {
  if (pathname.startsWith("/historia-clinica") && patientId) {
    return [
      {
        href: withClinicalContext("/documentos", { patientId, encounterId, preserveEncounter: true }),
        icon: "📎",
        label: "Adjuntar",
        tone: "outline",
      },
      { href: `/pacientes/${patientId}`, icon: "📄", label: "Resumen", tone: "navy" },
      {
        href: withClinicalContext("/nueva-atencion", { patientId, encounterId, preserveEncounter: true }),
        icon: "💾",
        label: "Continuar",
        tone: "primary",
      },
      { icon: "🖨", label: "Imprimir", tone: "icon", action: "print" },
    ];
  }

  if (pathname.startsWith("/pacientes/") && patientId) {
    return [
      { href: "/agenda", icon: "📅", label: "Agenda", tone: "outline" },
      { href: withClinicalContext("/historia-clinica", { patientId }), icon: "📚", label: "Historia", tone: "outline" },
      { href: `/pacientes/${patientId}`, icon: "📄", label: "Resumen", tone: "navy" },
      { href: withClinicalContext("/nueva-atencion", { patientId }), icon: "🩺", label: "Atender", tone: "primary" },
    ];
  }

  if (pathname.startsWith("/configuracion")) {
    return [
      { href: "/configuracion", icon: "✍️", label: "Firma", tone: "outline" },
      { href: "/configuracion", icon: "🔗", label: "Integrar", tone: "outline" },
      { href: "/configuracion", icon: "📄", label: "Perfil", tone: "navy" },
      { icon: "🖨", label: "Imprimir", tone: "icon", action: "print" },
    ];
  }

  return [
    { href: "/pacientes", icon: "🔎", label: "Buscar", tone: "outline" },
    { href: "/agenda", icon: "📅", label: "Agenda", tone: "outline" },
    { href: "/documentos", icon: "📄", label: "Documentos", tone: "navy" },
    { href: "/nueva-atencion", icon: "🩺", label: "Atención", tone: "primary" },
  ];
}

function isNavActive(pathname: string, entry: Extract<NavEntry, { type: "item" }>) {
  const entryPathname = getPathnameFromHref(entry.href);
  return pathname === entryPathname || pathname.startsWith(`${entryPathname}/`) || entry.match?.some((item) => pathname.startsWith(item));
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { client, user } = useAuth();
  const profileQuery = useQuery({
    queryKey: ["profile", "shell", user?.id],
    queryFn: () => getProfile(client, user!.id),
    enabled: Boolean(user?.id),
  });
  const patientIdFromPath = pathname.match(/^\/pacientes\/([^/]+)/)?.[1] ?? "";
  const patientIdFromQuery = searchParams.get("patientId") ?? "";
  const encounterIdFromQuery = searchParams.get("encounterId") ?? "";
  const contextualPatientId = patientIdFromPath || patientIdFromQuery;
  const patientQuery = useQuery({
    queryKey: ["shell", "context-patient", contextualPatientId],
    queryFn: () => getPatient(client, contextualPatientId),
    enabled: Boolean(contextualPatientId),
  });

  const profile = profileQuery.data;
  const rolePreset = getRolePreset(profile?.role, profile?.profession, {
    patientId: contextualPatientId || undefined,
    encounterId: encounterIdFromQuery || undefined,
  });
  const pageMeta = getPageMeta(pathname);
  const displayName =
    profile ? `${profile.firstName} ${profile.lastName}`.trim() : user?.email?.split("@")[0] ?? "Sin sesión";
  const initials = displayName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((value) => value[0]?.toUpperCase() ?? "")
    .join("");
  const patient = patientQuery.data;
  const topbarTitle = patient ? `${patient.firstName} ${patient.lastName}`.trim() : pageMeta.title;
  const topbarInitials = patient
    ? `${patient.firstName?.[0] ?? ""}${patient.lastName?.[0] ?? ""}`.toUpperCase()
    : (pageMeta.title
        .split(" ")
        .filter(Boolean)
        .slice(0, 2)
        .map((value) => value[0]?.toUpperCase() ?? "")
        .join("") || "AX");
  const topbarChip = patient
    ? pathname.startsWith("/historia-clinica")
      ? "Historia activa"
      : "Ficha activa"
    : pageMeta.chip;
  const topbarMeta = patient
    ? [
        `📋 ${patient.documentType} ${patient.documentNumber}`,
        `🎂 ${calculateAge(patient.birthDate)} años · ${patient.sex}`,
        patient.bloodType ? `🩸 ${patient.bloodType}` : "",
        patient.phone ? `📞 ${patient.phone}` : patient.email ? `✉️ ${patient.email}` : "",
      ].filter(Boolean)
    : pageMeta.meta;
  const topbarActions = getTopbarActions(pathname, contextualPatientId || undefined, encounterIdFromQuery || undefined);

  return (
    <div className="shell-layout">
      <aside className="shell-sidebar">
        <div className="shell-sidebar__brand">
          <div className="brand brand--header shell-sidebar__brand-panel">
            <Image
              src="/branding/axyscare-logo.png"
              alt="AxysCare"
              width={220}
              height={60}
              className="shell-sidebar__wordmark"
              priority
            />
            <span>Historia clínica digital</span>
          </div>
        </div>

        <div className="prof-selector" aria-label="Profesión activa">
          {professionOptions.map((option) => (
            <button
              key={option.role}
              type="button"
              className={`prof-btn ${rolePreset.role === option.role ? "active" : ""}`}
              disabled
            >
              {option.shortLabel}
            </button>
          ))}
        </div>

        <nav className="shell-sidebar__nav">
          {rolePreset.nav.map((entry) =>
            entry.type === "title" ? (
              <div key={entry.label} className="nav-section-title">
                {entry.label}
              </div>
            ) : (
              <Link
                key={`${entry.href}-${entry.label}`}
                href={entry.href}
                className={`nav-item ${isNavActive(pathname, entry) ? "active" : ""}`}
              >
                <span className="nav-item__icon" aria-hidden="true">
                  {entry.icon}
                </span>
                <span>{entry.label}</span>
                {"badge" in entry && entry.badge ? <span className="nav-badge">{entry.badge}</span> : null}
              </Link>
            ),
          )}
        </nav>

        <div className="shell-sidebar__footer">
          <div className="prof-card">
            <div className="prof-avatar">{initials || "AX"}</div>
            <div>
              <div className="prof-info-name">{displayName}</div>
              <div className="prof-info-role">{rolePreset.sidebarRoleLabel}</div>
            </div>
          </div>

          <div className="shell-sidebar__footer-actions">
            <Link href="/configuracion" className="sidebar-footer-link">
              ⚙️ Perfil
            </Link>
            <button
              type="button"
              className="sidebar-footer-link sidebar-footer-link--danger"
              onClick={async () => {
                await signOut(client);
                router.push("/login");
              }}
            >
              ⏻ Salir
            </button>
          </div>
        </div>
      </aside>

      <div className="shell-panel">
        <header className="shell-topbar">
          <div className="patient-info">
            <div className="patient-avatar">{topbarInitials || "AX"}</div>
            <div>
              <div className="shell-topbar__headline">
                <span className="patient-name">{topbarTitle}</span>
                <span className="meta-chip">{topbarChip}</span>
                <span className={rolePreset.topbarClassName}>{rolePreset.topbarLabel}</span>
              </div>
              <div className="patient-meta">
                {topbarMeta.map((item) => (
                  <span key={item}>{item}</span>
                ))}
              </div>
            </div>
          </div>

          <div className="topbar-actions">
            {topbarActions.map((action) =>
              action.href ? (
                <Link
                  key={`${action.label}-${action.href}`}
                  href={action.href}
                  className={`btn ${action.tone === "primary" ? "btn-primary" : action.tone === "navy" ? "btn-navy" : "btn-outline"}`}
                >
                  <span aria-hidden="true">{action.icon}</span>
                  {action.tone !== "icon" ? <span>{action.label}</span> : null}
                </Link>
              ) : (
                <button
                  key={`${action.label}-${action.icon}`}
                  type="button"
                  className={action.tone === "icon" ? "btn-icon" : "btn btn-outline"}
                  onClick={() => {
                    if (action.action === "print") window.print();
                  }}
                >
                  <span aria-hidden="true">{action.icon}</span>
                  {action.tone !== "icon" ? <span>{action.label}</span> : null}
                </button>
              ),
            )}
          </div>
        </header>

        <main className="shell-main">{children}</main>
      </div>
    </div>
  );
}
