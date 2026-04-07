import { NextResponse } from "next/server";
import { getServerSupabaseClient } from "@/lib/server-supabase";

export async function POST() {
  const supabase = await getServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }

  const { error } = await supabase
    .from("professional_settings")
    .update({
      google_calendar_connected: false,
      google_calendar_email: null,
      google_calendar_access_token: null,
      google_calendar_refresh_token: null,
      google_calendar_scope: null,
      google_calendar_token_expires_at: null,
      google_calendar_primary_calendar_id: null,
    })
    .eq("user_id", user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
