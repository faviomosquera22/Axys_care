type GoogleTokenResponse = {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  scope?: string;
  token_type: string;
};

type GoogleCalendarEventResponse = {
  id: string;
  hangoutLink?: string;
  conferenceData?: {
    entryPoints?: Array<{
      uri?: string;
      entryPointType?: string;
    }>;
  };
};

function requireEnv(name: string) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Falta configurar ${name}.`);
  }
  return value;
}

function getGoogleCalendarBaseConfig() {
  const clientId = requireEnv("GOOGLE_CLIENT_ID");
  const clientSecret = requireEnv("GOOGLE_CLIENT_SECRET");

  return {
    clientId,
    clientSecret,
    timezone: process.env.GOOGLE_CALENDAR_TIMEZONE ?? "America/Guayaquil",
  };
}

function getGoogleCalendarRedirectUri(request: Request) {
  const redirectUri =
    process.env.GOOGLE_REDIRECT_URI ?? new URL("/api/google-calendar/callback", request.url).toString();

  if (!redirectUri) {
    throw new Error("Falta configurar GOOGLE_REDIRECT_URI.");
  }

  return redirectUri;
}

export function buildGoogleCalendarAuthUrl(request: Request, state: string) {
  const { clientId } = getGoogleCalendarBaseConfig();
  const redirectUri = getGoogleCalendarRedirectUri(request);
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("access_type", "offline");
  url.searchParams.set("include_granted_scopes", "true");
  url.searchParams.set("prompt", "consent");
  url.searchParams.set(
    "scope",
    [
      "openid",
      "email",
      "https://www.googleapis.com/auth/calendar.events",
      "https://www.googleapis.com/auth/calendar",
    ].join(" "),
  );
  url.searchParams.set("state", state);
  return url.toString();
}

export async function exchangeGoogleCode(request: Request, code: string) {
  const { clientId, clientSecret } = getGoogleCalendarBaseConfig();
  const redirectUri = getGoogleCalendarRedirectUri(request);
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });

  if (!response.ok) {
    throw new Error("No se pudo completar la autorización con Google.");
  }

  return (await response.json()) as GoogleTokenResponse;
}

export async function refreshGoogleAccessToken(refreshToken: string) {
  const { clientId, clientSecret } = getGoogleCalendarBaseConfig();
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });

  if (!response.ok) {
    throw new Error("No se pudo refrescar el acceso de Google Calendar.");
  }

  return (await response.json()) as GoogleTokenResponse;
}

export async function fetchGoogleProfile(accessToken: string) {
  const response = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    throw new Error("No se pudo obtener el perfil de Google.");
  }

  return (await response.json()) as { email?: string };
}

export async function createOrUpdateGoogleCalendarEvent(params: {
  accessToken: string;
  calendarId?: string | null;
  googleCalendarEventId?: string | null;
  title: string;
  description: string;
  startAt: string;
  endAt: string;
  modality: string;
  meetLink?: string | null;
  attendeeEmails?: string[];
}) {
  const { timezone } = getGoogleCalendarBaseConfig();
  const calendarId = params.calendarId || "primary";
  const baseUrl = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`;
  const isVirtual = params.modality === "virtual";
  const url = new URL(params.googleCalendarEventId ? `${baseUrl}/${params.googleCalendarEventId}` : baseUrl);

  if (isVirtual) {
    url.searchParams.set("conferenceDataVersion", "1");
  }
  if (params.attendeeEmails?.length) {
    url.searchParams.set("sendUpdates", "all");
  }

  const eventBody = {
    summary: params.title,
    description: params.description,
    start: {
      dateTime: params.startAt,
      timeZone: timezone,
    },
    end: {
      dateTime: params.endAt,
      timeZone: timezone,
    },
    location: isVirtual ? params.meetLink || "Teleconsulta Axyscare" : undefined,
    reminders: {
      useDefault: false,
      overrides: [
        { method: "popup", minutes: 30 },
        { method: "email", minutes: 120 },
      ],
    },
    attendees: params.attendeeEmails?.length
      ? params.attendeeEmails.map((email) => ({
          email,
        }))
      : undefined,
    conferenceData: isVirtual
      ? {
          createRequest: {
            requestId: `axyscare-${crypto.randomUUID()}`,
            conferenceSolutionKey: { type: "hangoutsMeet" },
          },
        }
      : undefined,
  };

  const response = await fetch(url.toString(), {
    method: params.googleCalendarEventId ? "PATCH" : "POST",
    headers: {
      Authorization: `Bearer ${params.accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(eventBody),
  });

  if (!response.ok) {
    throw new Error("No se pudo sincronizar la cita con Google Calendar.");
  }

  return (await response.json()) as GoogleCalendarEventResponse;
}
