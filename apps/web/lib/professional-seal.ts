import type { UserRole } from "@axyscare/core-types";

export type SealVariant = "institutional" | "minimal" | "round";
export type SealAccent = "teal" | "navy" | "burgundy";

type SealPalette = {
  frame: string;
  accent: string;
  soft: string;
  ink: string;
  muted: string;
};

const sealPalettes: Record<SealAccent, SealPalette> = {
  teal: {
    frame: "#1f6f78",
    accent: "#14808d",
    soft: "#f4fbfb",
    ink: "#1e2430",
    muted: "#60707b",
  },
  navy: {
    frame: "#294466",
    accent: "#426ca0",
    soft: "#f4f7fb",
    ink: "#1d2633",
    muted: "#5d6978",
  },
  burgundy: {
    frame: "#6b2f45",
    accent: "#9b536d",
    soft: "#fcf7f8",
    ink: "#241d22",
    muted: "#6f6269",
  },
};

export const sealVariantOptions: Array<{ value: SealVariant; label: string; description: string }> = [
  { value: "institutional", label: "Institucional", description: "Marco sobrio con cabecera clínica." },
  { value: "minimal", label: "Minimal", description: "Limpio y compacto para documentos formales." },
  { value: "round", label: "Circular", description: "Formato tipo sello profesional clásico." },
];

export const sealAccentOptions: Array<{ value: SealAccent; label: string }> = [
  { value: "teal", label: "Verde clínico" },
  { value: "navy", label: "Azul serio" },
  { value: "burgundy", label: "Borgoña" },
];

function escapeXml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function encodeSvg(svg: string) {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function buildMetadataComment(variant: SealVariant, accent: SealAccent) {
  return `<!-- axyscare-seal:${JSON.stringify({ variant, accent })} -->`;
}

function getInitials(firstName: string, lastName: string) {
  const seed = `${firstName} ${lastName}`.trim();
  if (!seed) return "AX";
  return seed
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function formatIssueDate() {
  return new Intl.DateTimeFormat("es-EC", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date());
}

export function getDefaultSealVariant(role: UserRole): SealVariant {
  if (role === "psicologo") return "minimal";
  if (role === "nutricion") return "round";
  return "institutional";
}

export function parseSealMetadata(value?: string | null): { variant: SealVariant; accent: SealAccent } | null {
  if (!value?.startsWith("data:image/svg+xml")) return null;

  try {
    const decoded = decodeURIComponent(value.split(",", 2)[1] ?? "");
    const match = decoded.match(/axyscare-seal:({.+?})/);
    if (!match) return null;
    const parsed = JSON.parse(match[1]) as { variant?: SealVariant; accent?: SealAccent };
    if (!parsed.variant || !parsed.accent) return null;
    return {
      variant: parsed.variant,
      accent: parsed.accent,
    };
  } catch {
    return null;
  }
}

export function buildSealDataUrl({
  firstName,
  lastName,
  profession,
  specialty,
  professionalLicense,
  city,
  variant,
  accent,
}: {
  firstName: string;
  lastName: string;
  profession: string;
  specialty?: string | null;
  professionalLicense: string;
  city?: string | null;
  variant: SealVariant;
  accent: SealAccent;
}) {
  const palette = sealPalettes[accent];
  const initials = escapeXml(getInitials(firstName, lastName));
  const fullName = escapeXml(`${firstName} ${lastName}`.trim() || "Profesional tratante");
  const detailLine = escapeXml(
    specialty ? `${profession || "Profesión"} · ${specialty}` : profession || "Profesión",
  );
  const registration = escapeXml(professionalLicense || "PENDIENTE");
  const cityLine = escapeXml(city?.trim() || "Ciudad no registrada");
  const issuedAt = escapeXml(formatIssueDate());
  const metadata = buildMetadataComment(variant, accent);

  if (variant === "round") {
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="520" height="520" viewBox="0 0 520 520">
        ${metadata}
        <defs>
          <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="10" stdDeviation="10" flood-color="${palette.frame}" flood-opacity="0.14" />
          </filter>
        </defs>
        <circle cx="260" cy="260" r="226" fill="${palette.soft}" stroke="${palette.frame}" stroke-width="12" filter="url(#shadow)" />
        <circle cx="260" cy="260" r="198" fill="none" stroke="${palette.accent}" stroke-width="4" stroke-dasharray="8 10" />
        <circle cx="260" cy="136" r="42" fill="${palette.accent}" opacity="0.12" />
        <text x="260" y="150" text-anchor="middle" font-size="34" font-family="Georgia, serif" fill="${palette.frame}">${initials}</text>
        <text x="260" y="208" text-anchor="middle" font-size="34" font-family="Georgia, serif" fill="${palette.ink}">${fullName}</text>
        <text x="260" y="248" text-anchor="middle" font-size="22" font-family="Arial, sans-serif" fill="${palette.accent}">${detailLine}</text>
        <text x="260" y="300" text-anchor="middle" font-size="21" font-family="Arial, sans-serif" fill="${palette.muted}">Registro profesional ${registration}</text>
        <text x="260" y="334" text-anchor="middle" font-size="19" font-family="Arial, sans-serif" fill="${palette.muted}">${cityLine}</text>
        <path d="M130 370h260" stroke="${palette.frame}" stroke-width="2" stroke-linecap="round" opacity="0.2" />
        <text x="260" y="404" text-anchor="middle" font-size="16" font-family="Arial, sans-serif" fill="${palette.muted}">Emitido ${issuedAt}</text>
      </svg>
    `;
    return encodeSvg(svg);
  }

  if (variant === "minimal") {
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="760" height="240" viewBox="0 0 760 240">
        ${metadata}
        <rect x="10" y="10" width="740" height="220" rx="22" fill="${palette.soft}" stroke="${palette.frame}" stroke-width="3" />
        <rect x="34" y="34" width="104" height="104" rx="24" fill="${palette.accent}" opacity="0.12" />
        <text x="86" y="100" text-anchor="middle" font-size="42" font-family="Georgia, serif" fill="${palette.frame}">${initials}</text>
        <text x="164" y="108" font-size="34" font-family="Georgia, serif" fill="${palette.ink}">${fullName}</text>
        <text x="164" y="144" font-size="22" font-family="Arial, sans-serif" fill="${palette.muted}">${detailLine}</text>
        <text x="164" y="176" font-size="20" font-family="Arial, sans-serif" fill="${palette.muted}">Reg. ${registration}</text>
        <text x="164" y="204" font-size="18" font-family="Arial, sans-serif" fill="${palette.muted}">${cityLine}</text>
        <path d="M164 194h528" stroke="${palette.frame}" stroke-width="2" opacity="0.18" />
        <text x="692" y="214" text-anchor="end" font-size="16" font-family="Arial, sans-serif" fill="${palette.muted}">Emitido ${issuedAt}</text>
      </svg>
    `;
    return encodeSvg(svg);
  }

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="820" height="280" viewBox="0 0 820 280">
      ${metadata}
      <defs>
        <linearGradient id="panel" x1="0%" x2="100%" y1="0%" y2="100%">
          <stop offset="0%" stop-color="#ffffff" />
          <stop offset="100%" stop-color="${palette.soft}" />
        </linearGradient>
      </defs>
      <rect x="16" y="16" width="788" height="248" rx="28" fill="url(#panel)" stroke="${palette.frame}" stroke-width="4" />
      <rect x="34" y="34" width="752" height="212" rx="20" fill="none" stroke="${palette.accent}" stroke-width="2" stroke-dasharray="10 8" />
      <rect x="54" y="52" width="178" height="176" rx="26" fill="${palette.accent}" opacity="0.1" />
      <text x="143" y="122" text-anchor="middle" font-size="54" font-family="Georgia, serif" fill="${palette.frame}">${initials}</text>
      <text x="264" y="112" font-size="38" font-family="Georgia, serif" fill="${palette.ink}">${fullName}</text>
      <text x="264" y="152" font-size="24" font-family="Arial, sans-serif" fill="${palette.frame}">${detailLine}</text>
      <text x="264" y="190" font-size="21" font-family="Arial, sans-serif" fill="${palette.muted}">Registro: ${registration}</text>
      <text x="264" y="220" font-size="18" font-family="Arial, sans-serif" fill="${palette.muted}">${cityLine} · Emitido ${issuedAt}</text>
    </svg>
  `;

  return encodeSvg(svg);
}
