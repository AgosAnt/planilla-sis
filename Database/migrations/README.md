# Migraciones de Base de Datos - Planilla SIS

## Orden de Ejecución
Las migraciones deben ejecutarse en el siguiente orden estricto utilizando un usuario administrador (ej. `postgres`), no con `app_user`, ya que se requiere la creación de extensiones y roles:

1. `M002_schema_inicial.sql` (Contiene la creación del rol app_user)
2. `M003_rutas_y_asignaciones.sql`
3. `M004_registros_y_eventos.sql`
4. `M005_planillas_y_pagos.sql`

> **Legacy:** El archivo original `M001_trabajo_previo_urgente.sql` fue deprecado. Su contenido (índice de registros_tiempo) fue reubicado en `M004` para evitar fallos de ejecución en bases limpias.

## Ejecución Local
Para levantar el esquema desde cero en un entorno local, ejecuta:

```bash
psql -U postgres -d planilla_db -h localhost -f Database/migrations/M002_schema_inicial.sql
psql -U postgres -d planilla_db -h localhost -f Database/migrations/M003_rutas_y_asignaciones.sql
psql -U postgres -d planilla_db -h localhost -f Database/migrations/M004_registros_y_eventos.sql
psql -U postgres -d planilla_db -h localhost -f Database/migrations/M005_planillas_y_pagos.sql
