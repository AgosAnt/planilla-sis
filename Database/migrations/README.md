# Migraciones de Base de Datos - Planilla SIS

## Orden de Ejecución
Las migraciones deben ejecutarse en el siguiente orden estricto utilizando un usuario administrador (ej. `postgres`), no con `app_user`:

1. `M002_schema_inicial.sql`
2. `M003_rutas_y_asignaciones.sql`
3. `M004_registros_y_eventos.sql`
4. `M005_planillas_y_pagos.sql`
5. `M006_permisos_app_user.sql`
6. `M007_estados_y_permisos.sql`

## Configuración de Seguridad
El rol `app_user` se crea sin contraseña en los repositorios por motivos de seguridad. Para asignar su contraseña en el servidor local o de producción, el administrador de la base de datos debe ejecutar manualmente:
ALTER ROLE app_user WITH PASSWORD 'tu_contrasena_segura';
