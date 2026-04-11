# Sprint 1 - Sincronización clínica web y app

## Objetivo

Cerrar la continuidad operativa entre web y móvil para que ambos trabajen sobre el mismo paciente y el mismo `encounter`, sin duplicar contexto ni perder trazabilidad clínica.

## Resultado esperado

- un `encounter` abierto en web se puede retomar en móvil con sus datos actuales
- signos vitales, nota médica y adjuntos creados en móvil quedan visibles en web
- cambios relevantes sobre el paciente y el `encounter` invalidan consultas en ambas superficies
- la app móvil deja de depender de refrescos manuales para contexto clínico base

## Tareas

### S1-01 Realtime móvil reutilizable

- crear un helper compartido para escuchar cambios de tablas y de paciente
- reemplazar suscripciones manuales en agenda y pacientes
- mantener invalidación consistente de queries entre pestañas

Archivos:

- [apps/mobile/lib/realtime.ts](/Users/Apple/Desktop/AXYSCARE/apps/mobile/lib/realtime.ts)
- [apps/mobile/app/(tabs)/agenda.tsx](/Users/Apple/Desktop/AXYSCARE/apps/mobile/app/(tabs)/agenda.tsx)
- [apps/mobile/app/(tabs)/pacientes.tsx](/Users/Apple/Desktop/AXYSCARE/apps/mobile/app/(tabs)/pacientes.tsx)

### S1-02 Hydratación real del `encounter` en móvil

- cargar `encounter` y `encounter bundle` cuando `Nueva nota` recibe `encounterId`
- poblar formularios con el estado persistido del episodio
- evitar sobreescribir formularios si hay cambios locales sin guardar

Archivos:

- [apps/mobile/app/(tabs)/nueva-nota.tsx](/Users/Apple/Desktop/AXYSCARE/apps/mobile/app/(tabs)/nueva-nota.tsx)

### S1-03 Matriz de sincronización clínica

- definir qué recursos deben invalidar qué consultas
- validar recursos críticos:
  - `patients`
  - `appointments`
  - `encounters`
  - `vital_signs`
  - `medical_assessments`
  - `nursing_assessments`
  - `diagnoses`
  - `procedures`
  - `clinical_notes`
  - `attachments`
  - `exam_orders`

Referencias:

- [docs/collaboration.md](/Users/Apple/Desktop/AXYSCARE/docs/collaboration.md)
- [packages/core-db/src/index.ts](/Users/Apple/Desktop/AXYSCARE/packages/core-db/src/index.ts)

### S1-04 Prueba manual multi-superficie

1. crear un paciente en web
2. abrir atención desde web y copiar `encounterId`
3. retomar ese `encounter` en móvil
4. guardar signos vitales y nota médica desde móvil
5. verificar que web refleje el cambio
6. adjuntar un escaneo en móvil y verificar trazabilidad en web
7. editar de nuevo el mismo paciente en web y comprobar refresco en móvil

### S1-05 Cierre técnico del sprint

- `corepack pnpm --filter @axyscare/mobile typecheck`
- validación manual de agenda, pacientes y nueva nota
- documentar incidencias encontradas para Sprint 2

## Criterios de cierre

- no hay divergencia visible entre web y móvil para el mismo paciente
- la app móvil puede retomar un `encounter` ya abierto con datos cargados
- agenda y pacientes en móvil se actualizan por realtime usando helpers comunes
- `mobile` pasa `typecheck`

## Riesgos abiertos

- aún no existe estrategia formal de resolución de conflicto cuando web y móvil editan el mismo formulario al mismo tiempo
- todavía no hay CI ni tests automáticos para blindar la regresión
- siguen faltando más módulos clínicos sincronizados en móvil fuera del flujo de `Nueva nota`
