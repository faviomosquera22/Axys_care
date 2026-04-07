# Ejecución local

## Requisitos

- Node 24+
- Corepack
- Cuenta y proyecto de Supabase

## Instalar dependencias

```bash
corepack enable
corepack pnpm install
```

## Variables de entorno

Completa `.env.local` en la raíz:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SERVICE_ROLE_KEY=
EXPO_PUBLIC_SUPABASE_URL=
EXPO_PUBLIC_SUPABASE_ANON_KEY=
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=http://localhost:3000/api/google-calendar/callback
GOOGLE_CALENDAR_TIMEZONE=America/Guayaquil
```

## Web

```bash
corepack pnpm dev:web
```

## Mobile

```bash
corepack pnpm dev:mobile
```

## Supabase

- Ejecuta el SQL de `supabase/migrations/001_initial_schema.sql`.
- Ejecuta luego `supabase/migrations/002_patient_collaboration.sql` para habilitar colaboración clínica y RLS compartido.
- Ejecuta `supabase/migrations/005_google_calendar_oauth.sql` si vas a conectar Google Calendar.
- Carga semillas desde `supabase/seed/001_initial_seed.sql`.
- Verifica buckets y políticas de storage antes de usar adjuntos en producción.

## Google Calendar

- Crea un cliente OAuth en Google Cloud con tipo `Web application`.
- Autoriza el callback local `http://localhost:3000/api/google-calendar/callback`.
- Si vas a desplegar en Vercel, agrega también `https://tu-dominio/api/google-calendar/callback`.
- Completa `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` y `GOOGLE_REDIRECT_URI`.
- Conecta Google Calendar desde `Configuración`.
- Al guardar una cita:
  - si la cuenta está conectada, Axyscare crea o actualiza el evento en Google Calendar;
  - si la modalidad es `virtual`, Google puede generar el enlace de Meet y Axyscare lo guarda en la cita.

## Validación rápida del flujo compartido

- Crea dos usuarios profesionales en Supabase Auth.
- Con el usuario A, crea un paciente desde la web.
- Desde la ficha del paciente usa `Compartir` y asigna acceso al usuario B.
- Verifica `Compartidos por mí` con A y `Compartidos conmigo` con B.
- Crea una nota o diagnóstico con B y confirma que A vea el cambio en tiempo real.
- Revoca el acceso con A o usa `Quitar de mi lista` con B para validar la salida sin borrar el expediente maestro.

## Convenciones

- Formularios con `react-hook-form + zod`.
- Mutaciones con servicios de `@axyscare/core-db`.
- Cálculos clínicos solo desde `@axyscare/core-clinical`.
