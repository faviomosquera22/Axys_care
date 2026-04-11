import { Card } from "@axyscare/ui-shared";
import { RegisterForm } from "@/components/forms/register-form";

export default function RegisterPage() {
  return (
    <div className="auth-shell">
      <Card className="auth-card">
        <h1>Registro inicial</h1>
        <p>Crea tu acceso y deja lista la base para atender, documentar y compartir contexto clínico con orden.</p>
        <RegisterForm />
      </Card>
    </div>
  );
}
