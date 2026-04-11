# Axyscare

Base clínica unificada para web y app móvil con `Next.js + Expo + Supabase`, organizada como monorepo con paquetes compartidos para tipos, validaciones y lógica clínica.

## Estructura

- `apps/web`: aplicación web clínica con App Router.
- `apps/mobile`: aplicación móvil base con Expo Router.
- `packages/core-types`: contratos TypeScript compartidos.
- `packages/core-validation`: schemas `zod` compartidos.
- `packages/core-clinical`: cálculos clínicos y motor inicial de sugerencias.
- `packages/core-catalogs`: catálogos maestros iniciales.
- `packages/core-db`: clientes Supabase y servicios compartidos.
- `packages/ui-shared`: componentes y utilidades visuales reutilizables.
- `supabase/migrations`: esquema SQL y RLS.
- `supabase/seed`: datos semilla iniciales.
- `docs`: documentación operativa y de arquitectura.

## Stack

- Web: Next.js App Router, TypeScript, React Hook Form, Zod, TanStack Query, FullCalendar, React PDF, Recharts, Signature Pad.
- Móvil: Expo Router, TypeScript, React Hook Form, Zod, TanStack Query, MMKV, Supabase, Document Scanner.
- Backend: Supabase Auth, Postgres, Storage y Realtime.

## Primer arranque

1. Habilita `corepack` si no tienes `pnpm`:
   - `corepack enable`
2. Instala dependencias:
   - `corepack pnpm install`
3. Copia `.env.example` a `.env.local` y completa credenciales de Supabase.
4. Si vas a usar Google Calendar, completa también `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` y `GOOGLE_REDIRECT_URI`.
4. Levanta la web:
   - `corepack pnpm dev:web`
5. Levanta la app móvil:
   - `corepack pnpm dev:mobile`
6. Aplica migraciones de Supabase con la CLI o desde SQL Editor.
7. Para sincronización automática de citas con Google Calendar, ejecuta `supabase/migrations/005_google_calendar_oauth.sql` y conecta la cuenta desde `Configuración`.

## Documentación clave

- [Arquitectura](/Users/Apple/Desktop/AXYSCARE/docs/architecture.md)
- [Ejecución](/Users/Apple/Desktop/AXYSCARE/docs/runbook.md)
- [Colaboración clínica](/Users/Apple/Desktop/AXYSCARE/docs/collaboration.md)
- [Roadmap UX/UI](/Users/Apple/Desktop/AXYSCARE/docs/ux-roadmap.md)
- [Supabase RLS](/Users/Apple/Desktop/AXYSCARE/supabase/policies/README.md)
