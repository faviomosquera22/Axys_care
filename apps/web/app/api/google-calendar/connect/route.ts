import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { buildGoogleCalendarAuthUrl } from "@/lib/google-calendar";
import { getServerSupabaseClient } from "@/lib/server-supabase";

export async function GET(request: Request) {
  const supabase = await getServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const state = crypto.randomUUID();
  const cookieStore = await cookies();
  cookieStore.set("google_calendar_oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 10,
  });

  return NextResponse.redirect(buildGoogleCalendarAuthUrl(request, state));
}
