import { Card } from "@axyscare/ui-shared";
import Image from "next/image";
import { RegisterForm } from "@/components/forms/register-form";

export default function RegisterPage() {
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
        <h1>Registro inicial</h1>
        <p>Crea tu acceso y deja lista la base para atender, documentar y compartir contexto clínico con orden.</p>
        <RegisterForm />
      </Card>
    </div>
  );
}
