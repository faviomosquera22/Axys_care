alter table public.professional_settings
  add column if not exists google_calendar_email text,
  add column if not exists google_calendar_access_token text,
  add column if not exists google_calendar_refresh_token text,
  add column if not exists google_calendar_scope text,
  add column if not exists google_calendar_token_expires_at timestamptz,
  add column if not exists google_calendar_primary_calendar_id text;
