# Roadmap UX/UI Axyscare

## Objetivo

Convertir las auditorias de Claude y Gemini en un plan ejecutable para Axyscare, priorizando primero la seguridad percibida, la continuidad del flujo clinico y la coherencia entre paciente, encounter e historia clinica.

## Principios de decision

- primero se corrige `contexto + confianza`, luego `belleza`
- la unidad mental del sistema es `Paciente -> Encounter -> Historia`
- web y movil deben compartir modelo mental, aunque no tengan la misma interfaz
- documentos, examenes, procedimientos y enfermeria son consecuencias del encounter, no productos aislados
- no conviene reescribir el sistema de una vez; conviene madurar el flujo existente por capas

## Sintesis de las auditorias

### Lo que ambas auditorias aciertan

- falta contexto persistente del paciente y de la atencion activa
- el workspace de `Nueva atencion` necesita mejor orientacion y feedback de guardado
- la arquitectura visual actual tiene demasiada densidad baja en modulos clave
- la historia clinica todavia no se siente como timeline clinico unificado
- movil aun no esta definido como herramienta de point-of-care

### Lo que tomamos con matices

- no se recomienda eliminar ya el flujo por etapas de `Nueva atencion`
- no se recomienda rehacer el dashboard antes de resolver contexto clinico
- no se recomienda elevar `Command Palette` a prioridad P0
- no se recomienda mantener Enfermeria, Examenes, Procedimientos y Documentos como destinos principales de primer nivel a largo plazo

## Decisiones de producto

1. `Nueva atencion` sigue siendo el core del sistema.
2. El primer gran cambio UX sera un `Patient Banner` persistente y un `Encounter Banner` persistente.
3. La navegacion evolucionara para que el sistema se lea como un flujo clinico y no como modulos desconectados.
4. La historia clinica debe consolidar eventos del encounter en una sola lectura cronologica.
5. La app movil debe convertirse en una extension tactica de la web para captura rapida, no en un espejo reducido.

## Priorizacion

### P0 - friccion clinica y confianza

- contexto persistente del paciente
- contexto persistente del encounter activo
- estado de guardado visible en `Nueva atencion`
- proteccion ante salida con cambios pendientes
- alertas clinicas visibles en ficha, historia y atencion

### P1 - flujo core

- agenda mas orientada a acciones clinicas
- historia clinica con mejor lectura y filtros
- consolidacion mental de encounter y modulos derivados
- mejor densidad visual en listados y paneles
- estados vacios y de carga mas accionables

### P2 - madurez del sistema

- tokens compartidos web y movil
- macros, atajos y productividad
- colaboracion en vivo mas visible
- movil orientado a triage, nota rapida y adjuntos

## Roadmap en 3 fases

### Fase 1 - Friccion y confianza

Objetivo: evitar perdida de contexto y reducir ansiedad operativa.

#### Tickets

`UX-001` Patient Banner global
- impacto: alto
- esfuerzo: medio
- resultado: banner sticky con nombre, edad, documento, alergias, alertas y responsable
- archivos candidatos:
  - `apps/web/components/layout/app-shell.tsx`
  - `apps/web/app/globals.css`
  - `apps/web/app/(app)/pacientes/[id]/page.tsx`
  - `apps/web/app/(app)/historia-clinica/page.tsx`
  - `apps/web/app/(app)/nueva-atencion/page.tsx`

`UX-002` Encounter Banner global
- impacto: alto
- esfuerzo: medio
- resultado: estado visible de encounter abierto, profesional, etapa actual, ultimo guardado y cambios pendientes
- archivos candidatos:
  - `apps/web/components/forms/encounter-workspace.tsx`
  - `apps/web/app/globals.css`

`UX-003` Autosave visible y feedback persistente
- impacto: alto
- esfuerzo: medio
- resultado: indicador `Guardando...`, `Guardado hace X segundos`, error recuperable
- archivos candidatos:
  - `apps/web/components/forms/encounter-workspace.tsx`
  - `apps/web/components/forms/form-ui.tsx`

`UX-004` Proteccion ante salida accidental
- impacto: alto
- esfuerzo: bajo
- resultado: advertencia si hay cambios sin sincronizar o formularios sucios
- archivos candidatos:
  - `apps/web/components/forms/encounter-workspace.tsx`

`UX-005` Estados vacios y carga accionables
- impacto: medio
- esfuerzo: bajo
- resultado: cada vacio debe decir que falta y cual es la siguiente accion
- archivos candidatos:
  - `apps/web/app/(app)/documentos/page.tsx`
  - `apps/web/app/(app)/examenes/page.tsx`
  - `apps/web/app/(app)/procedimientos/page.tsx`
  - `apps/web/app/(app)/enfermeria/page.tsx`
  - `apps/web/app/(app)/historia-clinica/page.tsx`
  - `apps/web/components/layout/protected-shell.tsx`

`UX-006` Densidad visual inicial
- impacto: medio
- esfuerzo: bajo
- resultado: reducir paddings, mejorar contraste y priorizar informacion visible sin scroll
- archivos candidatos:
  - `apps/web/app/globals.css`
  - `apps/web/app/(app)/dashboard/page.tsx`
  - `apps/web/app/(app)/pacientes/page.tsx`

### Fase 2 - Flujo core y arquitectura UX

Objetivo: hacer que Agenda, Pacientes, Nueva atencion e Historia se perciban como un mismo flujo clinico.

#### Tickets

`UX-101` Refactor ligero de `Nueva atencion`
- impacto: alto
- esfuerzo: alto
- resultado: mantener etapas, pero con navegacion lateral, checklist de completitud y mejor lectura de progreso
- archivos candidatos:
  - `apps/web/components/forms/encounter-workspace.tsx`
  - `apps/web/app/globals.css`

`UX-102` Agenda orientada a accion clinica
- impacto: alto
- esfuerzo: medio
- resultado: mejores acciones sobre cita, estados semanticos, acceso mas directo a paciente y atencion
- archivos candidatos:
  - `apps/web/app/(app)/agenda/page.tsx`
  - `apps/web/components/forms/appointment-form.tsx`

`UX-103` Historia clinica con timeline mas util
- impacto: alto
- esfuerzo: medio
- resultado: timeline cronologico mejor agrupado y filtros por tipo de contenido
- archivos candidatos:
  - `apps/web/app/(app)/historia-clinica/page.tsx`

`UX-104` Ficha del paciente como hub clinico real
- impacto: medio
- esfuerzo: medio
- resultado: mejor jerarquia, mejor panel rapido y acceso directo a historia, encounter y colaboracion
- archivos candidatos:
  - `apps/web/app/(app)/pacientes/[id]/page.tsx`

`UX-105` Simplificacion de navegacion principal
- impacto: medio
- esfuerzo: medio
- resultado: reducir prominencia de modulos derivados y recentrar la IA en flujo clinico
- archivos candidatos:
  - `apps/web/components/layout/app-shell.tsx`

`UX-106` Documentos con trazabilidad visible
- impacto: medio
- esfuerzo: medio
- resultado: mostrar autor, fecha, estado y relacion con encounter/paciente
- archivos candidatos:
  - `apps/web/app/(app)/documentos/page.tsx`
  - `apps/web/components/pdf/encounter-summary-document.tsx`

### Fase 3 - Sistema compartido, movil y automatizacion

Objetivo: consolidar Axyscare como plataforma clinica madura y coherente entre superficies.

#### Tickets

`UX-201` Tokens y componentes compartidos
- impacto: medio
- esfuerzo: alto
- resultado: sistema de diseno con variables compartidas entre web y movil
- archivos candidatos:
  - `packages/ui-shared/src/index.tsx`
  - `apps/web/app/globals.css`
  - `apps/mobile/components/ui.tsx`

`UX-202` Movil como companion de trinchera
- impacto: alto
- esfuerzo: alto
- resultado: nota rapida, triage, signos vitales, adjuntos y escaneo ligados al encounter
- archivos candidatos:
  - `apps/mobile/app/(tabs)/nueva-nota.tsx`
  - `apps/mobile/app/(tabs)/agenda.tsx`
  - `apps/mobile/app/(tabs)/pacientes.tsx`
  - `apps/mobile/app/(tabs)/perfil.tsx`
  - `apps/mobile/components/ui.tsx`

`UX-203` Colaboracion y realtime mas visibles
- impacto: medio
- esfuerzo: medio
- resultado: feedback instantaneo cuando otro profesional actualiza el mismo expediente
- archivos candidatos:
  - `apps/web/components/realtime/use-table-realtime.ts`
  - `apps/web/components/realtime/use-patient-realtime.ts`
  - `apps/mobile/app/(tabs)/pacientes.tsx`
  - `apps/mobile/app/(tabs)/agenda.tsx`

`UX-204` Productividad clinica
- impacto: medio
- esfuerzo: medio
- resultado: plantillas, atajos, macros y mejores comandos operativos
- archivos candidatos:
  - `apps/web/components/forms/encounter-workspace.tsx`
  - `packages/core-catalogs`

## Backlog recomendado por sprint

### Sprint 1

- `UX-001` Patient Banner global
- `UX-002` Encounter Banner global
- `UX-003` Autosave visible
- `UX-005` Estados vacios y carga accionables

### Sprint 2

- `UX-004` Proteccion ante salida accidental
- `UX-006` Densidad visual inicial
- `UX-102` Agenda orientada a accion clinica

### Sprint 3

- `UX-101` Refactor ligero de `Nueva atencion`
- `UX-103` Historia clinica con timeline mas util
- `UX-104` Ficha del paciente como hub clinico real

### Sprint 4

- `UX-105` Simplificacion de navegacion principal
- `UX-106` Documentos con trazabilidad visible
- `UX-202` primer corte movil

## Recomendaciones de implementacion

### No romper todavia

- el modelo de datos basado en `patient` y `encounter`
- el flujo base de agenda -> paciente -> nueva atencion -> historia
- el estilo visual calido-clinico ya presente

### Si conviene tocar ya

- banners persistentes
- densidad y jerarquia
- estados del sistema
- guardado y continuidad
- ubicacion funcional de modulos derivados

## Punto de entrada recomendado

Si solo se va a ejecutar una cosa primero, debe ser esta:

`Patient Banner + Encounter Banner + estado de guardado visible en Nueva atencion`

Ese cambio mejora al mismo tiempo seguridad percibida, continuidad del flujo, lectura de contexto y confianza clinica.
