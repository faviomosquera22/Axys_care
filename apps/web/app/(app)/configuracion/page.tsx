import { GoogleCalendarSettings } from "@/components/forms/google-calendar-settings";
import { ProfessionalProfileForm } from "@/components/forms/professional-profile-form";

export default function SettingsPage() {
  return (
    <div className="stack">
      <div className="topbar">
        <div>
          <h1>Configuración</h1>
          <p>Perfil profesional centralizado para auth, impresión y futura integración con agenda externa.</p>
        </div>
      </div>
      <GoogleCalendarSettings />
      <ProfessionalProfileForm />
    </div>
  );
}
