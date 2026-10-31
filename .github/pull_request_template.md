## Qué cambia
<!-- Resumen breve y el motivo del cambio -->

## Tipo de cambio
- [ ] feat
- [ ] fix
- [ ] refactor
- [ ] docs
- [ ] test
- [ ] ci
- [ ] security

## Cómo probarlo
<!-- Pasos o comandos para verificar el cambio -->

## Contrato y base de datos
- [ ] Actualicé `docs/openapi.yaml` si cambié un endpoint
- [ ] Incluí una migración si cambié el esquema
- [ ] No aplica

## Lista de verificación de seguridad
- [ ] No hay secretos, contraseñas ni llaves en el código ni en el historial
- [ ] Las consultas SQL están parametrizadas (sin concatenar texto)
- [ ] La API valida rol y pertenencia del recurso (no solo la interfaz)
- [ ] La entrada se valida con esquema y longitud máxima
- [ ] El texto de usuario o JSONB se muestra como texto plano (sin `innerHTML`)
- [ ] No hay tokens en `localStorage`; las escrituras web llevan `X-CSRF-Token`
- [ ] Los errores no exponen stack traces ni detalles internos
- [ ] Probé con un rol sin permiso y obtengo 403 o 404
- [ ] No aplica (explica por qué):

## Pruebas
- [ ] Agregué o actualicé pruebas
- [ ] Las pruebas existentes pasan