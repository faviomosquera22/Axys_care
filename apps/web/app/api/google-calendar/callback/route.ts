import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { exchangeGoogleCode, fetchGoogleProfile } from "@/lib/google-calendar";
import { getServerSupabaseClient } from "@/lib/server-supabase";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const nextUrl = new URL("/configuracion", request.url);
  const cookieStore = await cookies();
  const savedState = cookieStore.get("google_calendar_oauth_state")?.value;

  if (!code || !state || state !== savedState) {
    nextUrl.searchParams.set("googleCalendar", "error");
    nextUrl.searchParams.set("message", "No se pudo validar la autorización de Google.");
    return NextResponse.redirect(nextUrl);
  }

  try {
    const supabase = await getServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.redirect(new URL("/login", request.url));
    }

    const token = await exchangeGoogleCode(request, code);
    const profile = await fetchGoogleProfile(token.access_token);
    const expiresAt = new Date(Date.now() + token.expires_in * 1000).toISOString();

    const { error } = await supabase
      .from("professional_settings")
      .upsert({
        user_id: user.id,
        google_calendar_connected: true,
        google_calendar_email: profile.email ?? null,
        google_calendar_access_token: token.access_token,
        google_calendar_refresh_token: token.refresh_token ?? null,
        google_calendar_scope: token.scope ?? null,
        google_calendar_token_expires_at: expiresAt,
        google_calendar_primary_calendar_id: "primary",
      }, {
        onConflict: "user_id",
      })
      .select("user_id")
      .single();

    if (error) {
      throw new Error(error.message);
    }

    cookieStore.delete("google_calendar_oauth_state");
    nextUrl.searchParams.set("googleCalendar", "connected");
    return NextResponse.redirect(nextUrl);
  } catch (error) {
    nextUrl.searchParams.set("googleCalendar", "error");
    nextUrl.searchParams.set("message", error instanceof Error ? error.message : "No se pudo conectar Google Calendar.");
    return NextResponse.redirect(nextUrl);
  }
}
