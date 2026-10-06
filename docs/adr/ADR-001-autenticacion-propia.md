# ADR-001: Autenticación propia sobre PostgreSQL

| Campo | Detalle |
|---|---|
| Estado | Aceptada |
| Fecha | 2026-10-05 |
| Decisor | Líder del proyecto (Jonatan) |
| Decisiones relacionadas | D-3 (autenticación propia), D-4 (HTTP en LAN, sin HTTPS) |
| Referencias | Entregable Fase 1, secciones A.1, D.4 y F.1 |

## Contexto

El sistema se despliega solo en la red local de la oficina, con un único servidor que aloja el backend (Node.js + Express) y PostgreSQL. La web y la app móvil consumen la misma API en `/api/v1` y ninguna accede directamente a la base de datos.

Se evaluó usar un proveedor externo (Supabase), donde la autenticación es configuración. Se descartó porque el proyecto requiere un esquema de autenticación distinto al que ofrece ese proveedor.

## Decisión

El backend implementa su propia autenticación (Opción B), sin proveedor externo:

- **Contraseñas:** hash con `bcrypt` o `argon2id`. Política de longitud mínima de 12 caracteres, verificación contra contraseñas filtradas y bloqueo progresivo tras intentos fallidos.
- **Tokens:** el backend firma los JWT (HS256 o RS256) con un secreto en variables de entorno. Se verifican `exp`, `iss` y `aud`, y el rol se toma del claim `rol`.
- **Web:** cookies `psis_access` (`HttpOnly; SameSite=Lax`) y `psis_refresh` (`HttpOnly; SameSite=Strict; Path=/api/v1/auth`), más token CSRF en `X-CSRF-Token`. Sin atributo `Secure`, porque el despliegue es HTTP-LAN (D-4).
- **Móvil:** `Authorization: Bearer` con almacenamiento en Keychain o Keystore.
- **Refresh:** tabla `sesiones_refresh` que guarda el hash del token, con rotación en cada uso. Si se reutiliza un refresh ya reemplazado, se revocan todas las sesiones del usuario y se registra en `auditoria`.
- **Vida de tokens:** access de unos 15 minutos, refresh de 7 a 14 días.
- **Altas:** no hay registro público. El Administrador crea cada cuenta con contraseña temporal de un solo uso.
- **MFA (TOTP):** recomendado para Administrador y para reautenticar aprobar planilla y pagar. Puede posponerse sin bloquear el login básico.
- **Autorización:** guarda de UI (solo experiencia de usuario), luego autorización en la API (rol y pertenencia, primera barrera real) y RLS opcional como segunda barrera.

## Alternativas consideradas

| Alternativa | Resultado |
|---|---|
| Proveedor externo (Supabase Auth) | Descartada: el proyecto requiere otro tipo de autenticación |
| Autenticación propia en el backend | **Elegida** |

## Consecuencias

**Positivas**
- Sin dependencia de un proveedor externo, coherente con el despliegue solo en LAN.
- El control del ciclo de sesiones (rotación, revocación, auditoría) queda en nuestro código.

**Negativas y riesgos**
- Es código de seguridad real, más grande y **bloqueante**: la web, el móvil y casi todos los endpoints protegidos no se pueden probar sin un login funcional. Por eso es la primera pieza a codificar y la construyen Daniel y Marco en paralelo.
- Se pierden las protecciones que un proveedor traería integradas (límite de tasa, detección de credenciales filtradas, MFA). Hay que construirlas y probarlas.
- Sin `Secure` ni HTTPS, el único control compensatorio del transporte es la contraseña WPA2/WPA3 del WiFi de la oficina (D-4, D-7).
- La API es hoy la única barrera obligatoria de autorización. RLS es opcional.

**Seguimiento**
- Todo PR que toque autenticación, sesiones o secretos requiere revisión de Jonatan o Daniel.
- La rotación de `JWT_SECRET` invalida todas las sesiones activas.