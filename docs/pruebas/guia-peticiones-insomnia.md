# Guía de peticiones en Insomnia: planilla-sis

Cada prueba se puede hacer por separado: incluye todo lo necesario, sin volver a otro paso.

## Antes de empezar

**Qué necesitas**

- La contraseña de `admin@local.test`.
- El correo y la contraseña de una cuenta de trabajador de prueba.

**Dónde está cada cosa en Insomnia**

- **Arriba:** el método (`GET`, `POST` o `PATCH`), la dirección y el botón **Send**.
- **Debajo de la dirección:** las pestañas **Body**, **Auth** y **Headers**.
- **A la derecha:** el código de respuesta y el contenido. Para ver el contenido, usa la pestaña **Preview** o **Response**, no **Timeline** ni **Console**.

**Cómo crear una petición:** toca **+** en el panel izquierdo y elige **HTTP Request**.

---

## Prueba 1: entrar sin sesión

**Qué demuestra:** la API rechaza a quien no ha iniciado sesión.

- **Método:** `GET`
- **Dirección:**

  ```text
  https://planilla-sis-umg-beb3atf2d8epcbbk.francecentral-01.azurewebsites.net/api/v1/me
  ```
- **Auth:** ninguna
- **Body:** vacío

**Debe dar:** `401`

---

## Prueba 2: ruta inexistente

**Qué demuestra:** los errores llegan en un formato JSON uniforme.

- **Método:** `GET`
- **Dirección:**

  ```text
  https://planilla-sis-umg-beb3atf2d8epcbbk.francecentral-01.azurewebsites.net/api/v1/nada
  ```
- **Auth:** ninguna
- **Body:** vacío

**Debe dar:** `404`

---

## Prueba 3: login sin datos

**Qué demuestra:** la API valida los datos que recibe.

- **Método:** `POST`
- **Dirección:**

  ```text
  https://planilla-sis-umg-beb3atf2d8epcbbk.francecentral-01.azurewebsites.net/api/v1/auth/session
  ```
- **Auth:** ninguna
- **Body → JSON:**

  ```json
  {}
  ```

**Debe dar:** `400`, con `code` igual a `CREDENCIALES_REQUERIDAS`

---

## Prueba 4: login correcto

**Qué demuestra:** con credenciales válidas, la API entrega un token de acceso.

- **Método:** `POST`
- **Dirección:**

  ```text
  https://planilla-sis-umg-beb3atf2d8epcbbk.francecentral-01.azurewebsites.net/api/v1/auth/session
  ```
- **Auth:** ninguna
- **Headers:** nombre `X-Client-Type`, valor `mobile`
- **Body → JSON:**

  ```json
  { "email": "admin@local.test", "password": "CONTRASEÑA-DEL-ADMIN" }
  ```

**Debe dar:** `200`, con `user`, `access_token`, `refresh_token` y `expira_en`

---

## Prueba 5: ver mi perfil con token

**Qué demuestra:** con un token válido, la API reconoce al usuario.

**Paso 1: obtener el token**

- **Método:** `POST`
- **Dirección:**

  ```text
  https://planilla-sis-umg-beb3atf2d8epcbbk.francecentral-01.azurewebsites.net/api/v1/auth/session
  ```
- **Headers:** nombre `X-Client-Type`, valor `mobile`
- **Body → JSON:**

  ```json
  { "email": "admin@local.test", "password": "CONTRASEÑA-DEL-ADMIN" }
  ```
- Toca **Send** y copia el valor de `access_token`, sin comillas.

**Paso 2: consultar el perfil**

- **Método:** `GET`
- **Dirección:**

  ```text
  https://planilla-sis-umg-beb3atf2d8epcbbk.francecentral-01.azurewebsites.net/api/v1/me
  ```
- **Auth → Bearer Token:** pega el token en **Token**.
- **Body:** vacío

**Debe dar:** `200`, con el perfil y `rol` igual a `administrador`

---

## Prueba 6: un trabajador intenta ver planillas

**Qué demuestra:** el backend bloquea a quien no tiene el rol necesario. Esta prueba debe hacerse con un **trabajador**, porque un administrador sí tiene permiso y recibiría `200`.

**Paso 1: obtener el token del trabajador**

- **Método:** `POST`
- **Dirección:**

  ```text
  https://planilla-sis-umg-beb3atf2d8epcbbk.francecentral-01.azurewebsites.net/api/v1/auth/session
  ```
- **Headers:** nombre `X-Client-Type`, valor `mobile`
- **Body → JSON:**

  ```json
  { "email": "CORREO-DEL-TRABAJADOR", "password": "CONTRASEÑA-DEL-TRABAJADOR" }
  ```
- Toca **Send** y copia el valor de `access_token`, sin comillas.

**Paso 2: pedir las planillas**

- **Método:** `GET`
- **Dirección:**

  ```text
  https://planilla-sis-umg-beb3atf2d8epcbbk.francecentral-01.azurewebsites.net/api/v1/planillas
  ```
- **Auth → Bearer Token:** pega el token del trabajador en **Token**.
- **Body:** vacío

**Debe dar:** `403`, con `code` igual a `ROL_NO_PERMITIDO`

---

## Prueba 7: rechazar una jornada sin motivo

**Qué demuestra:** el backend aplica la regla de negocio aunque la petición no pase por la pantalla. La jornada no cambia, porque la petición se rechaza por falta de motivo.

**Paso 1: obtener el token del administrador**

- **Método:** `POST`
- **Dirección:**

  ```text
  https://planilla-sis-umg-beb3atf2d8epcbbk.francecentral-01.azurewebsites.net/api/v1/auth/session
  ```
- **Headers:** nombre `X-Client-Type`, valor `mobile`
- **Body → JSON:**

  ```json
  { "email": "admin@local.test", "password": "CONTRASEÑA-DEL-ADMIN" }
  ```
- Toca **Send** y copia el valor de `access_token`, sin comillas.

**Paso 2: obtener el id de una jornada**

- **Método:** `GET`
- **Dirección:**

  ```text
  https://planilla-sis-umg-beb3atf2d8epcbbk.francecentral-01.azurewebsites.net/api/v1/registros-tiempo?page_size=50
  ```
- **Auth → Bearer Token:** pega el token en **Token**.
- Toca **Send** y, dentro de `items`, copia el `id` de una jornada de prueba.

**Paso 3: intentar rechazarla sin motivo**

- **Método:** `PATCH`
- **Dirección:** cambia `ID-DE-LA-JORNADA` por el `id` que copiaste.

  ```text
  https://planilla-sis-umg-beb3atf2d8epcbbk.francecentral-01.azurewebsites.net/api/v1/registros-tiempo/ID-DE-LA-JORNADA/validacion
  ```
- **Auth → Bearer Token:** pega el mismo token en **Token**.
- **Body → JSON:**

  ```json
  { "estado_validacion": "RECHAZADA" }
  ```

**Debe dar:** `422`, con `code` igual a `OBSERVACIONES_REQUERIDAS`

---

## Si sale algo distinto

| Resultado | Causa probable | Qué hacer |
|---|---|---|
| `200` con `text/html` | A la dirección le falta `/api/v1` | Copia la dirección completa de esta guía |
| `401` al usar un token | Venció (dura 15 minutos) o se pegó mal | Vuelve a hacer el login y pega el token nuevo, sin comillas |
| `401` en el login | Correo o contraseña incorrectos | Revísalos antes de reintentar |
| `423` en el login | La cuenta se bloqueó tras varios intentos fallidos | Espera a que termine el bloqueo, hasta 15 minutos |
| `403` con `DEBE_CAMBIAR_PASSWORD` | La cuenta tiene una contraseña temporal | Cámbiala en la web y vuelve a hacer el login |
| `400` en la prueba 7 | El cuerpo no es JSON o el `id` no es válido | Revisa **Body → JSON** y el `id` |

## Para la presentación

- **Tokens:** obtenlos justo antes de proyectar, porque duran 15 minutos.
- **Datos sensibles:** no muestres las pantallas de login con contraseña ni los tokens. Si el docente pide ver un login, muestra la prueba 3.
- **Contraseñas:** no las guardes en este archivo. Deja los textos en mayúsculas tal como están y escribe la contraseña real solo en Insomnia.
