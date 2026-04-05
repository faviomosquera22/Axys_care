# Políticas iniciales

La seguridad base usa `owner_user_id` y `auth.uid()` como frontera clínica por profesional.

## Cobertura actual

- `profiles`: cada usuario gestiona su propio perfil.
- `professional_settings`: acceso solo del propietario.
- Tablas clínicas y operativas: acceso total solo a filas con `owner_user_id = auth.uid()`.
- `audit_logs`: solo lectura para el propietario.

## Notas

- El modelo queda preparado para membresía institucional futura, pero no habilita todavía acceso compartido.
- Para adjuntos, faltan buckets y políticas de Storage específicas por ruta antes de producción.
- La estrategia de `security definer` del trigger de auditoría debe revisarse junto con despliegue final y políticas de logs.

