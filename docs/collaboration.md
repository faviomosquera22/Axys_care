# Colaboración clínica

## Alcance inicial

Axyscare mantiene un registro maestro por paciente. El paciente pertenece a un `owner_user_id` y solo ese profesional puede compartirlo con otro usuario autenticado de la plataforma.

La primera fase habilita:

- acceso compartido completo al paciente
- permisos `read` y `edit`
- estados `pending`, `active`, `revoked` y `expired`
- listados `Compartidos conmigo` y `Compartidos por mí`
- revocación por el propietario
- salida del colaborador de su propia lista
- auditoría básica de accesos
- realtime para cambios clínicos clave

## Modelo de datos

- `patients`: conserva `owner_user_id`, `created_by`, `updated_by`
- `patient_access`: vínculo activo o histórico entre paciente propietario y colaborador
- `patient_access_audit`: eventos de acceso
- `encounter_access`: reservado para extensión futura por atención específica

No se crean copias del paciente ni de su historia clínica. Los colaboradores operan sobre el mismo registro vivo.

## Reglas de acceso

- El propietario principal siempre conserva control del paciente.
- Un colaborador con acceso `read` puede consultar el expediente compartido.
- Un colaborador con acceso `edit` puede crear y actualizar registros clínicos incluidos en esta fase.
- Si el acceso es revocado o expira, el colaborador deja de ver el paciente en sus listados compartidos.
- Cuando un colaborador quita un paciente de su lista, se revoca su vínculo sin borrar el historial maestro.

## Realtime

Se publica sincronización en tiempo real para:

- `patients`
- `patient_access`
- `appointments`
- `encounters`
- `vital_signs`
- `medical_assessments`
- `nursing_assessments`
- `diagnoses`
- `procedures`
- `exam_orders`
- `exam_results`
- `clinical_notes`
- `attachments`

La web invalida consultas del paciente y de los listados compartidos cuando entran eventos de Realtime. La app móvil refresca pacientes y agenda con el mismo criterio.

## Prueba manual sugerida

1. Aplica `supabase/migrations/001_initial_schema.sql` y luego `supabase/migrations/002_patient_collaboration.sql`.
2. Inicia sesión con el profesional A y crea un paciente.
3. Abre la ficha del paciente y usa `Compartir`.
4. Busca al profesional B por correo o nombre, asigna `read` o `edit` y confirma.
5. Verifica que el paciente aparezca en `Compartidos por mí` para A y en `Compartidos conmigo` para B.
6. Con B, abre el mismo paciente y confirma que ve el mismo historial.
7. Si B tiene `edit`, crea una nota, diagnóstico o procedimiento y verifica que A reciba el cambio sin recargar manualmente.
8. Revoca el acceso desde A y confirma que B deja de ver el paciente compartido.
9. Repite el flujo con expiración opcional y valida que el acceso quede fuera de los listados una vez vencido.
