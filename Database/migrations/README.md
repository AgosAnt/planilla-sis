# Migraciones de Base de Datos - Planilla SIS

## Orden de Ejecución
Las migraciones deben ejecutarse en el siguiente orden estricto utilizando un usuario administrador (ej. `postgres`), no con `app_user`:

1. `M002_schema_inicial.sql`
2. `M003_rutas_y_asignaciones.sql`
3. `M004_registros_y_eventos.sql`
4. `M005_planillas_y_pagos.sql`
5. `M006_permisos_app_user.sql`
6. `M007_estados_y_permisos.sql`
7. `M008_rls_registros_eventos.sql`
8. `M009_parametros_feriados.sql`
9. `M010_rls_todas_las_tablas.sql`

Cada archivo se ejecuta en una sola transacción, deteniéndose ante el primer error:

```
psql -v ON_ERROR_STOP=1 -1 -d <base> -f M002_schema_inicial.sql
```

En Windows, si `psql` no está en el PATH, usa la ruta completa: `"C:\Program Files\PostgreSQL\<versión>\bin\psql.exe"`.

## Configuración de Seguridad
El rol `app_user` se crea sin contraseña en los repositorios por motivos de seguridad. Para asignar su contraseña en el servidor local o de producción, el administrador de la base de datos debe ejecutar manualmente:
ALTER ROLE app_user WITH PASSWORD 'tu_contrasena_segura';

## Datos de prueba (solo desarrollo)
Después de M008, `Database/seeds/S001_datos_desarrollo.sql` crea un administrador, un supervisor y un trabajador (`admin@local.test`, `supervisor@local.test`, `trabajador@local.test`), una ruta con el trabajador asignado y un registro de tiempo abierto. La contraseña de los tres usuarios se pasa al ejecutarlo (mínimo 12 caracteres) y nunca se guarda en el repositorio:

```
psql -v ON_ERROR_STOP=1 -v password='<tu contraseña local>' -1 -d <base> -f ../seeds/S001_datos_desarrollo.sql
```

Es idempotente: si se vuelve a ejecutar no duplica datos ni cambia contraseñas ya creadas. **Nunca se ejecuta en el servidor de producción.**
