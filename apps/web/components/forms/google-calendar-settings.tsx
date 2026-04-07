"use client";

import { getProfessionalSettings } from "@axyscare/core-db";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, SectionHeading, StatusBadge } from "@axyscare/ui-shared";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/components/providers/providers";

export function GoogleCalendarSettings() {
  const { client, user } = useAuth();
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const status = searchParams.get("googleCalendar");
  const message = searchParams.get("message");

  const settingsQuery = useQuery({
    queryKey: ["professional-settings", user?.id],
    queryFn: () => getProfessionalSettings(client, user!.id),
    enabled: Boolean(user?.id),
  });

  const disconnectMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/google-calendar/disconnect", { method: "POST" });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "No se pudo desconectar Google Calendar.");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["professional-settings", user?.id] });
    },
  });

  const isConnected = Boolean(settingsQuery.data?.googleCalendarConnected);

  return (
    <Card>
      <SectionHeading
        title="Google Calendar"
        description="Conecta tu cuenta para crear eventos automáticos y recordatorios al guardar la cita."
        action={
          <StatusBadge
            label={isConnected ? "conectado" : "no conectado"}
            tone={isConnected ? "success" : "warning"}
          />
        }
      />
      <div className="stack">
        {status === "connected" ? (
          <div className="info-panel">
            <strong>Google Calendar conectado</strong>
            <span>Las nuevas citas podrán sincronizarse automáticamente con recordatorios y Meet si aplica.</span>
          </div>
        ) : null}
        {status === "error" ? (
          <div className="form-error">{message ?? "No se pudo completar la conexión con Google Calendar."}</div>
        ) : null}
        <div className="meta-strip">
          <strong>Cuenta</strong>
          <span>{settingsQuery.data?.googleCalendarEmail ?? "Sin cuenta conectada"}</span>
        </div>
        <div className="btn-row">
          <a className="btn" href="/api/google-calendar/connect">
            {isConnected ? "Reconectar Google Calendar" : "Conectar Google Calendar"}
          </a>
          {isConnected ? (
            <button
              type="button"
              className="btn secondary"
              onClick={() => disconnectMutation.mutate()}
              disabled={disconnectMutation.isPending}
            >
              {disconnectMutation.isPending ? "Desconectando..." : "Desconectar"}
            </button>
          ) : null}
        </div>
      </div>
    </Card>
  );
}
