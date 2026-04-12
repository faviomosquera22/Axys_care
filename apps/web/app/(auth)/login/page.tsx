import { Card } from "@axyscare/ui-shared";
import { isSupabaseConfigured } from "@axyscare/core-db";
import Image from "next/image";
import { LoginForm } from "@/components/forms/login-form";

export default function LoginPage() {
  return (
    <div className="auth-shell">
      <Card className="auth-card">
        <div className="auth-brand">
          <Image
            src="/branding/axyscare-logo.png"
            alt="AxysCare"
            width={220}
            height={56}
            className="auth-brand__logo"
            priority
          />
        </div>
        <h1>Ingreso clínico</h1>
        <p>Entra a tu estación clínica con agenda, pacientes e historia en un mismo flujo de trabajo.</p>
        {!isSupabaseConfigured() ? (
          <div className="setup-banner">
            Falta configurar Supabase. Completa `.env.local` con las credenciales del proyecto.
          </div>
        ) : null}
        <LoginForm />
      </Card>
    </div>
  );
}
