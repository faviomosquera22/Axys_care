# Arquitectura Axyscare

## Decisiones base

- Monorepo `pnpm + turbo`.
- Backend único en Supabase.
- Tipos, validaciones y reglas clínicas compartidas por web y móvil.
- Seguridad centrada en `auth.uid()` y `owner_user_id`.
- Cada atención clínica vive en `encounters`.

## Capas

1. `packages/core-types`
   - Contratos de dominio y enumeraciones.
2. `packages/core-validation`
   - Schemas de entrada y validación transversal.
3. `packages/core-clinical`
   - Cálculos clínicos, validación de rangos y sugerencias internas de enfermería.
4. `packages/core-db`
   - Clientes Supabase, servicios CRUD y helpers reutilizables.
5. `apps/web`
   - UX completa para escritorio con agenda, pacientes y atención.
6. `apps/mobile`
   - Flujo rápido para agenda, pacientes y nueva nota.

## Principios de datos

- `profiles.id = auth.users.id`.
- Todas las tablas clínicas incluyen `owner_user_id`.
- RLS niega acceso cruzado entre profesionales.
- `appointments` puede originar un `encounter`.
- `medical_assessments` y `nursing_assessments` quedan ligados al mismo episodio.

## Crecimiento previsto

- Membresía institucional.
- Integración Google Calendar / Meet.
- Catálogo CIE-10 completo.
- Adjuntos y documentos enriquecidos.
- Motor clínico más profundo para enfermería con catálogos licenciados en el futuro.

