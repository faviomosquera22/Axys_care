import { Card } from "@axyscare/ui-shared";
import { RegisterForm } from "@/components/forms/register-form";

export default function RegisterPage() {
  return (
    <div className="auth-shell">
      <Card className="auth-card">
        <h1>Registro inicial</h1>
        <p>Crea la cuenta base para configurar perfil profesional y empezar a operar Axyscare.</p>
        <RegisterForm />
      </Card>
    </div>
  );
}

