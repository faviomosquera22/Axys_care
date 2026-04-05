"use client";

import { signOut } from "@axyscare/core-db";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/components/providers/providers";

const items = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/agenda", label: "Agenda" },
  { href: "/pacientes", label: "Pacientes" },
  { href: "/compartidos-conmigo", label: "Compartidos conmigo" },
  { href: "/compartidos-por-mi", label: "Compartidos por mí" },
  { href: "/nueva-atencion", label: "Nueva atención" },
  { href: "/historia-clinica", label: "Historia clínica" },
  { href: "/enfermeria", label: "Enfermería" },
  { href: "/examenes", label: "Exámenes" },
  { href: "/procedimientos", label: "Procedimientos" },
  { href: "/documentos", label: "Documentos" },
  { href: "/configuracion", label: "Configuración" },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { client, user } = useAuth();

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <strong>Axyscare</strong>
          <span>Consulta clínica unificada</span>
        </div>
        <nav>
          {items.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className={`sidebar-link ${pathname === item.href || pathname.startsWith(`${item.href}/`) ? "active" : ""}`}
            >
              {item.label}
            </a>
          ))}
        </nav>
        <div style={{ marginTop: 28 }} className="ax-card">
          <div className="stack">
            <div>
              <strong>{user?.email ?? "Sin sesión"}</strong>
              <p className="muted" style={{ marginTop: 6 }}>
                Acceso clínico individual.
              </p>
            </div>
            <button
              className="btn secondary"
              onClick={async () => {
                await signOut(client);
                router.push("/login");
              }}
            >
              Cerrar sesión
            </button>
          </div>
        </div>
      </aside>
      <main className="shell-main">{children}</main>
    </div>
  );
}
