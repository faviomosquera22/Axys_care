import { NextResponse } from "next/server";
import { createOrUpdateGoogleCalendarEvent, refreshGoogleAccessToken } from "@/lib/google-calendar";
import { getServerSupabaseClient } from "@/lib/server-supabase";

async function ensureGoogleAccessToken(supabase: Awaited<ReturnType<typeof getServerSupabaseClient>>, userId: string) {
  const { data: settings, error } = await supabase
    .from("professional_settings")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (error || !settings || !settings.google_calendar_connected) {
    throw new Error("Google Calendar no está conectado.");
  }

  const currentAccessToken = settings.google_calendar_access_token as string | null;
  const refreshToken = settings.google_calendar_refresh_token as string | null;
  const expiresAt = settings.google_calendar_token_expires_at as string | null;

  if (currentAccessToken && expiresAt && new Date(expiresAt).getTime() > Date.now() + 60_000) {
    return { accessToken: currentAccessToken, settings };
  }

  if (!refreshToken) {
    throw new Error("La conexión de Google Calendar no tiene refresh token. Reconecta la cuenta.");
  }

  const refreshed = await refreshGoogleAccessToken(refreshToken);
  const nextExpiresAt = new Date(Date.now() + refreshed.expires_in * 1000).toISOString();

  const { error: updateError } = await supabase
    .from("professional_settings")
    .update({
      google_calendar_access_token: refreshed.access_token,
      google_calendar_scope: refreshed.scope ?? settings.google_calendar_scope,
      google_calendar_token_expires_at: nextExpiresAt,
      google_calendar_connected: true,
    })
    .eq("user_id", userId);

  if (updateError) {
    throw new Error(updateError.message);
  }

  return {
    accessToken: refreshed.access_token,
    settings: {
      ...settings,
      google_calendar_access_token: refreshed.access_token,
      google_calendar_token_expires_at: nextExpiresAt,
    },
  };
}

export async function POST(request: Request) {
  try {
    const supabase = await getServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "No autenticado." }, { status: 401 });
    }

    const body = (await request.json()) as { appointmentId?: string };
    if (!body.appointmentId) {
      return NextResponse.json({ error: "Falta appointmentId." }, { status: 400 });
    }

    const { accessToken, settings } = await ensureGoogleAccessToken(supabase, user.id);

    const { data: appointment, error: appointmentError } = await supabase
      .from("appointments")
      .select("*")
      .eq("id", body.appointmentId)
      .single();

    if (appointmentError || !appointment) {
      throw new Error(appointmentError?.message ?? "No se encontró la cita.");
    }

    const { data: patient } = await supabase
      .from("patients")
      .select("first_name, last_name, document_number")
      .eq("id", appointment.patient_id)
      .single();

    const patientName = patient ? `${patient.first_name} ${patient.last_name}`.trim() : "Paciente";
    const title = `${appointment.reason} · ${patientName}`;
    const description = [
      `Paciente: ${patientName}`,
      patient?.document_number ? `Documento: ${patient.document_number}` : "",
      `Modalidad: ${appointment.modality}`,
      appointment.notes ? `Notas: ${appointment.notes}` : "",
      appointment.meet_link ? `Teleconsulta: ${appointment.meet_link}` : "",
    ]
      .filter(Boolean)
      .join("\n");

    const googleEvent = await createOrUpdateGoogleCalendarEvent({
      accessToken,
      calendarId: settings.google_calendar_primary_calendar_id,
      googleCalendarEventId: appointment.google_calendar_event_id,
      title,
      description,
      startAt: appointment.start_at,
      endAt: appointment.end_at,
      modality: appointment.modality,
      meetLink: appointment.meet_link,
    });

    const generatedMeetLink =
      googleEvent.hangoutLink ??
      googleEvent.conferenceData?.entryPoints?.find((entryPoint) => entryPoint.entryPointType === "video")?.uri ??
      null;

    const { error: updateError } = await supabase
      .from("appointments")
      .update({
        google_calendar_event_id: googleEvent.id,
        meet_link: generatedMeetLink ?? appointment.meet_link,
      })
      .eq("id", appointment.id);

    if (updateError) {
      throw new Error(updateError.message);
    }

    return NextResponse.json({
      ok: true,
      googleCalendarEventId: googleEvent.id,
      meetLink: generatedMeetLink ?? appointment.meet_link,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "No se pudo sincronizar con Google Calendar." },
      { status: 400 },
    );
  }
}
