# Entregable Fase 1: Arquitectura Técnica de la Solución

**Sistema de Control de Planillas y Rutas (`planilla-sis`)**

| Campo | Detalle |
| --- | --- |
| Versión | 2.0 – Borrador para revisión (Decisión D-3 tomada: PostgreSQL autoadministrado + autenticación propia) |
| Fecha | 21 de septiembre de 2026 |
| Elaborado por | Arquitectura de Software y Análisis de Sistemas |
| Equipo | 7 integrantes: 6 en Web/Backend, 1 en App Móvil |
| Repositorio base | [https://github.com/AgosAnt/planilla-sis](https://github.com/AgosAnt/planilla-sis) |
| Estado | Sujeto a validación de los puntos marcados **\[VALIDAR\]** |

---

## A. Matriz de Asignación de Responsabilidades (RACI / RAM)

### A.1 Roles del equipo

| Rol | Perfil | Foco principal |
| --- | --- | --- |
| **Dev Web 1** | Líder Frontend | Arquitectura SPA, routing, guardas, CSP |
| **Dev Web 2** | Frontend | Módulos de UI (rutas, supervisión, planillas) |
| **Dev Backend 1** | Líder Técnico / Arquitecto | ADRs, contrato API, revisión de calidad |
| **Dev Backend 2** | Backend – Dominio | API REST, motor de cálculo de planillas |
| **Dev Backend 3** | Datos / DBA | Esquema 3FN, JSONB, migraciones, RLS |
| **Dev Backend 4** | Seguridad / Autenticación / DevOps / QA | Módulo de autenticación propio (hash, JWT, refresh), OWASP, CI/CD, secretos, pruebas |
| **Dev Móvil 1** | Móvil | App móvil, sincronización offline |


**Leyenda.** **R** = Responsable (ejecuta). **A** = Aprobador/Accountable (rinde cuentas; **uno solo por fila**). **C** = Consultado (bidireccional). **I** = Informado. **A/R** = quien aprueba también ejecuta.

### A.2 Matriz RACI

| # | Entregable técnico | Dev Web 1 | Dev Web 2 | Dev BE 1 | Dev BE 2 | Dev BE 3 | Dev BE 4 | Dev Móvil |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Arquitectura, patrones y ADRs | C | I | **A/R** | C | C | C | C |
| 2 | Integración con repo `planilla-sis` (estructura, ramas, convenciones) | C | I | **A** | R | C | R | I |
| 3 | Auditoría del esquema BD existente | I | I | C | C | **A/R** | C | C |
| 4 | Modelo ER 3FN, JSONB y migraciones | I | I | C | C | **A/R** | I | C |
| 5 | Autorización a nivel de fila (RLS opcional, defensa en profundidad, §D.4) | I | I | C | C | **A/R** | C | I |
| 6 | Contrato API REST (OpenAPI 3.x) | C | I | **A** | R | C | C | C |
| 7 | Backend: módulos Rutas, Turnos, Registros de tiempo | I | I | C | **A/R** | C | C | C |
| 8 | Backend: motor de cálculo, verificación y aprobación de planilla | I | I | C | **A/R** | C | C | I |
| 9 | Frontend: shell SPA, History API, guardas por rol | **A/R** | R | C | I | I | C | I |
| 10 | Frontend: módulos de rutas, turnos y supervisión | **A** | R | I | C | I | I | I |
| 11 | Frontend: módulos de planillas y pagos | **A** | R | I | C | I | I | I |
| 12 | Autenticación propia (hash de contraseñas, JWT, rotación de refresh, MFA) y endpoints de sesión | C | I | C | R | C | **A/R** | C |
| 13 | Seguridad OWASP (XSS, CSRF, CSP, secretos) | R | C | C | C | C | **A/R** | I |
| 14 | API móvil y sincronización offline (idempotencia) | I | I | **A** | R | C | C | R |
| 15 | App móvil (registro de ingreso/descanso/eventos, cálculos) | I | I | I | C | I | C | **A/R** |
| 16 | Pruebas (unitarias, integración, e2e, seguridad) | C | R | C | R | C | **A** | C |
| 17 | CI/CD, entornos y gestión de secretos | I | I | C | C | C | **A/R** | I |
| 18 | Documentación técnica y entregables de fase | R | C | **A** | R | R | R | C |

**Verificación de consistencia:** cada fila tiene exactamente una **A**; ningún integrante concentra más de 7 filas como A, y ninguna persona es único R en un entregable crítico sin un C de respaldo (mitiga el riesgo de "factor camión").

---

## B. Justificación de Arquitectura y Patrones

### B.1 Diagrama de arquitectura (vista de contenedores, nivel C4-2)

> Este es el diagrama **objetivo**. El estado actual (MVP) se muestra en §0.4.1 y la decisión de usar autenticación propia sobre PostgreSQL en §0.4.4 (ADR-001).

```mermaid
flowchart LR
  subgraph Clientes["Clientes"]
    W["Cliente Web (SPA)<br/>Administradores y Supervisores"]
    M["App Móvil<br/>Trabajadores en ruta"]
  end
  subgraph BE["Backend Node.js + Express - API REST /api/v1"]
    GW["Capa HTTP<br/>CORS, rate limit, validación"]
    AUTH["Módulo de autenticación propio<br/>hash, emisión/verificación de JWT, refresh"]
    SVC["Servicios de dominio<br/>Rutas, Turnos, Registros, Planillas, Pagos"]
    CALC["Motor de cálculo de planilla"]
    GW --> AUTH
    GW --> SVC --> CALC
  end
  PG[("PostgreSQL autoadministrado<br/>3FN + JSONB + RLS opcional")]
  W -- "HTTPS, cookies HttpOnly + CSRF" --> GW
  M -- "HTTPS, Bearer JWT + Idempotency-Key" --> GW
  AUTH -- "verifica credenciales,<br/>lee/escribe perfiles y sesiones_refresh" --> PG
  SVC -- "consultas con pool pg<br/>(rol de aplicación, no superusuario)" --> PG
```

**Descripción textual (C4)**

- **Nivel 1 – Contexto.** Tres personas interactúan con el sistema: el *Administrador* (configura, aprueba y paga), el *Supervisor* (asigna, supervisa, verifica) y el *Trabajador en ruta* (registra su jornada). El sistema no depende de proveedores externos de identidad ni de datos: la autenticación y la persistencia son propias (PostgreSQL autoadministrado).
- **Nivel 2 – Contenedores.**
  1. **Cliente Web (SPA):** aplicación estática en el navegador. Se comunica **solo** con la API REST mediante cookies `HttpOnly`.
  2. **App Móvil:** aplicación nativa/multiplataforma. Se comunica con la misma API mediante `Authorization: Bearer`. Guarda tokens en el almacén seguro del SO (Keychain/Keystore).
  3. **API REST (Backend):** contenedor de lógica de negocio, validación, autorización y motor de cálculo. Es la **frontera de confianza**.
  4. **Módulo de autenticación (dentro del backend):** valida credenciales, emite y renueva JWT propios, gestiona la rotación de *refresh tokens*.
  5. **PostgreSQL autoadministrado:** persistencia con 3FN, JSONB y RLS opcional como defensa en profundidad.
- **Nivel 3 – Componentes (API).** Capa HTTP → Servicios de dominio → Repositorios de datos. El *Motor de cálculo* es un componente puro (sin E/S), fácilmente testeable con casos de prueba deterministas.

**Patrones aplicados**

| Patrón | Dónde | Justificación |
| --- | --- | --- |
| **API Gateway ligero / BFF de facto** | Capa HTTP del backend | Un único contrato para Web y Móvil; la web nunca recibe llaves privilegiadas. |
| **Arquitectura por capas** (Controller → Service → Repository) | Backend | Separa transporte, negocio y persistencia; facilita pruebas. |
| **Máquina de estados** | Planilla, registro de tiempo, acuerdo de turno | Transiciones explícitas y auditables. |
| **Idempotencia** (`Idempotency-Key` / `client_uuid`) | Endpoints de escritura del móvil | Evita duplicar registros en reintentos por red inestable. |
| **Defensa en profundidad** | API (autorización) + RLS (BD) | Un fallo de autorización en la API no expone datos. |
| **Append-only log** | `auditoria`, `eventos_diarios` | Trazabilidad e integridad forense. |
| **Snapshot inmutable** | `planilla_detalle` al aprobar | Los montos pagados no cambian si cambian las tarifas después. |

### B.2 ¿SPA o MPA? Decisión y justificación

| Criterio | SPA | MPA (multipágina, render en servidor) | Ganador para este caso |
| --- | --- | --- | --- |
| Interacción intensiva (tablas de horas, filtros, edición en línea de registros) | Actualización parcial sin recargar; mantiene estado de filtros y selecciones | Recarga por cada acción; pierde contexto | **SPA** |
| Supervisión "casi en vivo" de horarios | Polling/SSE actualiza solo los componentes afectados | Requiere recargas o JS adicional por página | **SPA** |
| Flujo de planilla de varios pasos (calcular → revisar → verificar → aprobar) | Estado del asistente persistente en memoria y `sessionStorage` | Estado a reconstruir en cada página | **SPA** |
| Reutilización del contrato API con el móvil | Mismo API JSON, cero duplicación | Requiere capa de vistas en servidor además de la API | **SPA** |
| SEO / indexación | Débil | Fuerte | **Irrelevante** (panel administrativo privado tras login) |
| Tiempo de carga inicial | Mayor (bundle JS) | Menor | MPA, **mitigable** con *code splitting* y carga diferida por ruta |
| Superficie XSS | Mayor responsabilidad en cliente | Menor | MPA, **mitigable** con CSP estricta y escape por defecto del framework |
| Equipo (2 devs web) | Un solo paradigma y una sola base de código | Dos capas de render (servidor y cliente) | **SPA** |

**Decisión:** **SPA**. Los casos de uso (supervisión, cálculo de planilla y control de rutas) son intensivos en interacción y estado, el panel no requiere SEO, y la API REST ya es obligatoria para el móvil. Las debilidades de la SPA (carga inicial, superficie XSS) son mitigables con técnicas estándar (§B.3 y §F).

**Propuesta tecnológica \[VALIDAR con el equipo\]:** React + TypeScript + Vite; React Router (implementa la History API) o equivalente; TanStack Query para caché y sincronización de datos de servidor; validación de esquemas con Zod. Si el equipo prefiere otro framework, los principios de este documento se mantienen.

### B.3 Estrategia de enrutamiento con History API

**Principios**

1. **Rutas limpias** (`/planillas/2026-09`), sin hash (`#`), usando `history.pushState`, `history.replaceState` y el evento `popstate`.
2. **Fallback del servidor:** el servidor estático debe devolver `index.html` para cualquier ruta que no sea un archivo o `/api/*`, para que los *deep links* y el refresco funcionen.
3. **Estado de UI compartible en la URL:** filtros, paginación y ordenamiento viajan como *query params* (`/supervision?ruta=R-12&fecha=2026-09-21`). Esto permite enlazar y restaurar vistas.
4. **Guardas de navegación** por autenticación y rol antes de renderizar.
5. **Protección contra pérdida de cambios:** confirmación al abandonar formularios sucios (mediante `beforeunload` y bloqueo de transición en el router).
6. **Nunca datos sensibles en `history.state`** ni en la URL (el `state` es visible al JavaScript de la página y persiste en la sesión del navegador).

**Mapa de rutas (SPA)**

| Ruta | Vista | Roles permitidos |
| --- | --- | --- |
| `/login` | Inicio de sesión | Público |
| `/` → `/panel` | Panel/resumen | Admin, Supervisor |
| `/rutas`, `/rutas/:rutaId` | Listado y detalle de rutas, asignación de personal | Admin, Supervisor |
| `/turnos`, `/turnos/acuerdos` | Catálogo de turnos y confirmación de acuerdos | Admin, Supervisor |
| `/supervision` | Supervisión de horarios y registros (móvil) | Admin, Supervisor |
| `/planillas`, `/planillas/:periodoId` | Períodos y planillas | Admin, Supervisor |
| `/planillas/:planillaId/detalle` | Detalle por trabajador, verificación | Admin, Supervisor |
| `/pagos` | Registro y consulta de pagos | Admin |
| `/admin/usuarios`, `/admin/parametros` | Gestión de usuarios, roles y parámetros de pago | Admin |
| `/auditoria` | Consulta de bitácora | Admin |
| `/403`, `*` | Acceso denegado / no encontrado | Autenticado |

**Núcleo de navegación (referencia)**

```js
function navigate(path, { replace = false, state = {} } = {}) {
  const url = new URL(path, window.location.origin);
  if (url.origin !== window.location.origin) return;      // evita open-redirect
  history[replace ? "replaceState" : "pushState"](state, "", url);
  renderRoute(url.pathname + url.search);                  // guardas + carga diferida
}
window.addEventListener("popstate", () =>
  renderRoute(window.location.pathname + window.location.search)
);
```

> **Nota de seguridad:** la guarda de rutas en el cliente es solo **experiencia de usuario**. La autorización real ocurre en la API (rol + pertenencia) y, si está activa, en RLS; ocultar una ruta no protege un dato.

### B.4 Distribución del almacenamiento web

| Mecanismo | Se almacena | **No** se almacena | Justificación |
| --- | --- | --- | --- |
| **Cookies `HttpOnly; Secure; SameSite`** | Access token (JWT), refresh token | Datos de negocio | Inaccesibles a JavaScript: un XSS no puede exfiltrar los tokens. Se envían automáticamente al mismo origen. |
| **Memoria (variable de módulo / estado de la app)** | Token CSRF, perfil del usuario y rol cargados desde `/api/v1/me` | — | Se pierde al recargar; se rehidrata desde la API. Mínima persistencia = mínima exposición. |
| **`sessionStorage`** | Borradores de formularios de planilla, filtros de la pestaña, paso actual del asistente | Tokens, datos personales completos | Aislado por pestaña y se destruye al cerrarla. Adecuado para estado efímero. |
| **`localStorage`** | Preferencias no sensibles: tema, densidad de tabla, columnas visibles, colapso del menú, idioma | **Tokens, JWT, datos de nómina, PII** | Persistente y legible por cualquier script del origen: solo para preferencias inocuas. |
| **`IndexedDB`** (opcional) | Caché de catálogos (turnos, rutas) para arranque rápido | Datos de pago | Solo si el rendimiento lo exige; se limpia al cerrar sesión. |
| **Caché HTTP / Service Worker** | Activos estáticos versionados | Respuestas de la API con datos personales | Evita fugas en equipos compartidos. |

**Reglas transversales**

- **Cerrar sesión** limpia `sessionStorage`, `localStorage` (claves de la app), IndexedDB, caché de consultas en memoria y ejecuta `POST /auth/logout` para invalidar cookies.
- Toda clave de almacenamiento usa el prefijo `psis:` y un **versionado** (`psis:v1:`) para migrar formatos sin errores.
- Se lee siempre con `try/catch` y se asume que el almacenamiento puede estar vacío o bloqueado (modo privado).

### B.5 Integración con el repositorio y estructura propuesta

```text
planilla-sis/
├── Database/        (existente)  → migraciones versionadas y seeds
├── backend/         (existente)  → API REST
├── mobile/          (existente)  → App móvil
├── web/             (NUEVO)      → SPA (React + TS + Vite)
├── docs/            (NUEVO)      → este entregable, ADRs, OpenAPI
└── .github/workflows/ (NUEVO)    → CI: lint, test, escaneo de secretos y dependencias
```

Convenciones: ramas `main` (protegida) / `develop` / `feature/*`, *pull requests* con al menos 1 revisión, *Conventional Commits*, y contrato OpenAPI en `docs/openapi.yaml` como fuente única de verdad entre Web, Backend y Móvil.

---

## C. Análisis de Sistemas e Ingeniería de Requisitos

### C.1 Actores

| Actor | Tipo | Descripción | Plataforma | Responsabilidades |
| --- | --- | --- | --- | --- |
| **Administrador** | Primario | Responsable de configuración, aprobación final y pago | Web | Gestionar usuarios/roles, parámetros de pago, **aprobar planilla**, registrar pagos, consultar auditoría |
| **Supervisor** | Primario | Responsable operativo de una o varias rutas | Web | Asignar rutas y turnos, confirmar acuerdos, supervisar horarios, validar registros, **verificar cálculo de horas** |
| **Trabajador en Ruta** | Primario | Personal operativo | Móvil | Registrar ingreso/salida, descansos y eventos; consultar sus turnos, horas y horas extra |
| **Módulo de Autenticación** | Secundario (interno) | Componente del backend que valida credenciales y emite/renueva JWT propios | — | Hash y verificación de contraseñas, emisión y rotación de tokens |
| **Motor de cálculo** | Secundario (interno) | Componente que aplica reglas de pago | — | Calcular horas y montos de forma determinista |
| **Auditor** *(opcional, fase futura)* | Primario | Rol de solo lectura | Web | Consultar planillas y bitácora |

### C.2 Matriz de casos de uso principales

| ID | Caso de uso | Actor(es) | Módulo | Prioridad | Plataforma |
| --- | --- | --- | --- | --- | --- |
| CU-01 | Iniciar sesión y verificar rol | Todos | Acceso | Alta | Web / Móvil |
| CU-02 | Gestionar usuarios y asignar roles | Administrador | Acceso | Alta | Web |
| CU-03 | Gestionar estado del trabajador (activo, en ruta, descanso, incapacidad, vacaciones, suspendido) | Supervisor, Administrador | Estados | Media | Web |
| CU-04 | Crear y gestionar rutas y sus puntos | Administrador, Supervisor | Rutas | Alta | Web |
| CU-05 | Asignar trabajadores a rutas | Supervisor, Administrador | Rutas | Alta | Web |
| CU-06 | Definir turnos y proponer/confirmar acuerdos de turno | Supervisor, Trabajador | Turnos | Alta | Web / Móvil |
| CU-07 | Registrar ingreso, salida y descansos | Trabajador | Registro de tiempo | Alta | Móvil |
| CU-08 | Registrar eventos diarios (incidentes, notas, geocercas) | Trabajador | Eventos | Media | Móvil |
| CU-09 | Supervisar horarios y registros en tiempo casi real | Supervisor | Supervisión | Alta | Web |
| CU-10 | Validar, corregir o rechazar registros de tiempo | Supervisor | Supervisión | Alta | Web |
| **CU-11** | **Cálculo, verificación y aprobación de planilla** | Supervisor, Administrador | Planillas | **Crítica** | Web |
| CU-12 | Registrar el pago final de planilla | Administrador | Pagos | Alta | Web |
| CU-13 | Consultar mis turnos, horas y horas extra | Trabajador | Consulta | Media | Móvil |
| CU-14 | Consultar bitácora de auditoría | Administrador | Auditoría | Media | Web |
| CU-15 | Configurar parámetros de pago (multiplicadores, jornada) | Administrador | Configuración | Alta | Web |

**Matriz de acceso por rol (resumen de permisos)**

| Recurso / Acción | Administrador | Supervisor | Trabajador |
| --- | --- | --- | --- |
| Gestionar usuarios y roles | ✔ | ✖ | ✖ |
| Rutas (crear/editar) | ✔ | Solo las suyas | ✖ |
| Asignar trabajadores | ✔ | Solo sus rutas | ✖ |
| Registrar ingreso/descanso/evento | ✖ | ✖ | ✔ (propio) |
| Ver registros de tiempo | ✔ (todos) | Sus rutas | Propios |
| Validar/corregir registros | ✔ | Sus rutas | ✖ |
| Calcular planilla | ✔ | ✔ (sus rutas) | ✖ |
| **Verificar** planilla | ✖ | ✔ | ✖ |
| **Aprobar** planilla | ✔ | ✖ | ✖ |
| Registrar pago | ✔ | ✖ | ✖ |
| Ver mi cálculo/pago | — | — | ✔ (propio) |
| Consultar auditoría | ✔ | ✖ | ✖ |

### C.3 Especificación detallada – CU-11: Cálculo, verificación y aprobación de planilla

| Campo | Descripción |
| --- | --- |
| **Identificador** | CU-11 |
| **Nombre** | Cálculo, verificación y aprobación de planilla |
| **Actores primarios** | Supervisor (calcula y verifica), Administrador (aprueba) |
| **Actores secundarios** | Motor de cálculo, PostgreSQL (persistencia) |
| **Descripción** | Genera la planilla de un período a partir de los registros de tiempo validados, aplica las reglas de pago vigentes, somete el resultado a revisión independiente y a aprobación final, dejando el resultado inmutable y listo para pago. |
| **Disparador** | Cierre de un período de planilla (fecha fin alcanzada) o solicitud manual de un usuario autorizado. |
| **Precondiciones** | 1. El usuario está autenticado con rol autorizado. 2. El período existe en estado `ABIERTO`. 3. Existen parámetros de pago y tarifa vigentes para el período. 4. No quedan registros de tiempo en estado `PENDIENTE` dentro del alcance (o el usuario acepta excluirlos explícitamente). |
| **Postcondiciones (éxito)** | La planilla queda en `APROBADA`; sus montos son un *snapshot* inmutable; se registran eventos en `auditoria`; queda habilitado CU-12 (pago). |
| **Postcondiciones (fallo)** | La planilla permanece en su último estado válido; no se altera ningún monto aprobado; el intento queda auditado. |

**Máquina de estados de la planilla**

```mermaid
stateDiagram-v2
  [*] --> BORRADOR
  BORRADOR --> CALCULADA: calcular()
  CALCULADA --> BORRADOR: recalcular / corregir registros
  CALCULADA --> VERIFICADA: verificar() [supervisor distinto al calculador]
  CALCULADA --> RECHAZADA: rechazar(motivo)
  VERIFICADA --> APROBADA: aprobar() [admin distinto al calculador]
  VERIFICADA --> RECHAZADA: rechazar(motivo)
  RECHAZADA --> BORRADOR: reabrir
  APROBADA --> PAGADA: registrar pago completo
  PAGADA --> CERRADA: cerrar período
```

**Flujo principal**

1. El **Supervisor** abre `/planillas/:periodoId` y selecciona alcance (ruta o todas las de su responsabilidad).
2. El sistema lista **excepciones previas**: registros pendientes de validación, jornadas sin salida, descansos incompletos, solapamientos.
3. El Supervisor resuelve excepciones (CU-10) o marca exclusión justificada.
4. El Supervisor ejecuta **Calcular** (`POST /planillas/{id}/calcular`). El backend, en una transacción:
   1. Bloquea el período (evita cálculos concurrentes).
   2. Lee registros validados, descansos, tarifas y parámetros vigentes.
   3. Por trabajador, calcula horas efectivas, ordinarias, extras diurnas y nocturnas, y montos.
   4. Aplica bonificaciones y deducciones (`detalle_conceptos`).
   5. Persiste `planilla_detalle` con el desglose en JSONB (`calculo_detalle`) y estado `CALCULADA`.
5. La web muestra el resultado por trabajador, con *drill-down* a cada jornada y comparación con el período anterior (alertas por variaciones atípicas).
6. Un **Supervisor verificador** (distinto de quien calculó) revisa y ejecuta **Verificar** con observaciones. Estado → `VERIFICADA`.
7. El **Administrador** revisa el resumen y ejecuta **Aprobar** (con reautenticación/MFA). Estado → `APROBADA`; se congelan los montos.
8. El sistema registra `auditoria` (actor, IP, antes/después) y notifica a los interesados.

**Flujos alternos**

| ID | Condición | Comportamiento |
| --- | --- | --- |
| FA-1 | Existen registros `PENDIENTE` | Se bloquea el cálculo y se muestra el listado; el usuario valida, rechaza o excluye con motivo. |
| FA-2 | El verificador detecta una inconsistencia | **Rechazar** con motivo → `RECHAZADA` → se corrige y se recalcula (vuelve a `BORRADOR`). |
| FA-3 | El administrador rechaza | Igual que FA-2; el motivo queda en auditoría. |
| FA-4 | Se corrige un registro después de calcular | La planilla vuelve a `BORRADOR`; se exige recalcular y re-verificar. |
| FA-5 | Recálculo tras cambio de parámetros | Solo permitido antes de `APROBADA`. Los parámetros nuevos no afectan planillas aprobadas. |

**Flujos de excepción**

| ID | Excepción | Respuesta |
| --- | --- | --- |
| FE-1 | Usuario sin rol o fuera de su ruta | `403 Forbidden`; se audita el intento. |
| FE-2 | Mismo usuario intenta calcular y verificar (o calcular y aprobar) | `409 Conflict` con código `SEGREGACION_FUNCIONES`. |
| FE-3 | Falta tarifa/parámetro vigente | `422 Unprocessable Entity` indicando trabajador/parámetro faltante. |
| FE-4 | Cálculo concurrente sobre el mismo período | `409 Conflict` (bloqueo optimista/*advisory lock*). |
| FE-5 | Falla de BD durante el cálculo | *Rollback* completo; estado sin cambios; `503`/`500` con identificador de correlación. |
| FE-6 | Sesión expirada | `401`; la SPA intenta *refresh* y reintenta una vez; si falla, redirige a `/login` conservando la ruta destino. |

**Reglas de negocio**

- **RN-01.** Horas efectivas = (salida − ingreso) − descansos **no remunerados**.
- **RN-02.** Horas ordinarias = mínimo entre horas efectivas y jornada ordinaria diaria (parámetro).
- **RN-03.** Horas extra = exceso sobre la jornada ordinaria; se clasifican en diurnas/nocturnas según el turno y se multiplican por el factor parametrizado (`parametros_pago`).
- **RN-04.** El redondeo (p. ej. al minuto o al cuarto de hora) es un parámetro y se aplica **una sola vez** por jornada.
- **RN-05.** Los montos se almacenan con `numeric(12,2)`; nunca `float`.
- **RN-06.** Segregación de funciones: `calculada_por ≠ verificada_por`; `calculada_por ≠ aprobada_por`; `verificada_por ≠ aprobada_por` (restricciones `CHECK` y validación en API).
- **RN-07.** Una planilla `APROBADA` es **inmutable**: cualquier cambio requiere una planilla de ajuste, no edición.
- **RN-08.** Toda transición de estado genera un registro de auditoría.
- **RN-09.** El cálculo es **idempotente y reproducible**: mismos insumos → mismo resultado.

**Requisitos no funcionales asociados**

| Atributo | Meta |
| --- | --- |
| Rendimiento | Cálculo de 500 trabajadores × 31 días ≤ 30 s (ejecución transaccional) |
| Integridad | Transacción ACID; nunca resultados parciales |
| Seguridad | Reautenticación/MFA para *aprobar* y *pagar*; autorización a nivel API y RLS |
| Trazabilidad | Auditoría completa (quién, cuándo, antes/después, IP) |
| Usabilidad | Advertencias antes de acciones irreversibles; confirmación explícita |

---

## D. Diseño de Base de Datos Híbrida (PostgreSQL autoadministrado)

### D.1 Análisis del esquema existente (`Database/` en `planilla-sis`)

> **Fuente del análisis.** Script SQL preliminar entregado por el equipo (6 tablas: `Usuarios`, `Rutas`, `Jornadas`, `Eventos_Ruta`, `Eventos_Descanso`, `Planillas`). El script se analizó tal como fue entregado; se contrastó con el código del backend y de la app móvil recibidos (§0.4). Se desconoce si la base local tiene índices, funciones o vistas que no figuren en el script (ver §D.1.5).

#### D.1.1 Valoración general

**Aciertos que se conservan**

- La app móvil ya captura **geolocalización** de entrada, salida y eventos.
- Los **descansos** están en una tabla hija (`Eventos_Descanso`) en lugar de columnas repetidas en la jornada: buen criterio de normalización.
- Los **eventos de emergencia** están separados de la jornada y tienen un estado de atención pensado para que el supervisor los revise en la web.
- Los importes usan `NUMERIC` y no `FLOAT`.
- Ya se definieron políticas `ON DELETE` en las claves foráneas y se documentaron los valores esperados de los estados.

**Brechas principales:** el esquema cubre bien el registro de campo, pero **no** cubre asignación de rutas por supervisor, confirmación de acuerdos de turno, flujo de aprobación de planilla, pagos, auditoría ni seguridad por fila. Además contiene varios defectos de integridad que afectarían al cálculo de pago (H-07, H-09, H-11, H-12, H-17).

#### D.1.2 Hallazgos

Severidad: **Crítica** (bloquea seguridad o integridad de pago) · **Alta** · **Media** · **Baja**.

| ID | Tabla | Hallazgo | Impacto | Sev. |
| --- | --- | --- | --- | --- |
| H-01 | `Usuarios` | No existe columna de credenciales (`email`, `password_hash`) ni tabla de sesiones; no hay forma de emitir un login real ni de derivar la identidad de un JWT. | Sin esto no hay autenticación propia ni RLS por usuario. | Alta |
| H-02 | `Usuarios` | `rol` es texto libre (`VARCHAR(50)`) sin `CHECK` ni catálogo. | Valores inválidos o con distinta capitalización rompen la autorización. | Media |
| H-03 | `Usuarios` | `tarifa_hora` vive en la tabla de identidad, **sin vigencia ni historial**. | Un cambio de tarifa altera la reproducibilidad de pagos pasados; cualquier política que exponga `Usuarios` expone salarios. | Alta |
| H-04 | `Usuarios` | Faltan `activo`, estado laboral (CU-03), documento y datos de contacto. | No hay baja lógica ni estados de trabajador. | Media |
| H-05 | `Rutas` | No hay **supervisor responsable** ni bandera `activa`. | La regla RLS "el supervisor ve su ruta" es **imposible de expresar**. | Alta |
| H-06 | `Rutas` / `Jornadas` | La relación trabajador–ruta existe **solo dentro de `Jornadas`**; no hay asignación previa ni vigencia. | No se puede "asignar rutas" antes de que exista una jornada; el caso de uso CU-05 no tiene soporte. | Alta |
| H-07 | `Jornadas` | **Contradicción interna:** `hora_entrada` es `NOT NULL`, pero el estado `'PROGRAMADA'` describe una jornada que aún no ocurrió. | Es imposible insertar una jornada programada sin inventar una hora de entrada. | Alta |
| H-08 | `Jornadas` | `estado` mezcla el ciclo operativo (`EN_RUTA`, `EN_PAUSA`, `FINALIZADA`) con la validación administrativa (`APROBADA`); `EN_PAUSA` además es derivable de un descanso abierto. | Estado inconsistente; no se sabe quién validó ni cuándo. | Media |
| H-09 | `Jornadas`, `Eventos_*` | Todas las marcas de tiempo son `TIMESTAMP` **sin zona horaria**. | Ambigüedad entre hora del dispositivo y del servidor; errores en horas nocturnas y turnos que cruzan la medianoche. | Alta |
| H-10 | `Jornadas` | `fecha` es redundante con `hora_entrada` (dependencia funcional). | Puede quedar inconsistente, sobre todo en turnos nocturnos. | Baja |
| H-11 | Varias | `ON DELETE CASCADE` desde `Usuarios` hacia `Jornadas`, `Eventos_Ruta` y `Planillas`. | **Borrar un usuario destruye su historial de tiempo y de pagos.** | Alta |
| H-12 | `Jornadas`, `Eventos_Descanso`, `Planillas` | No hay restricciones de integridad: `salida > entrada`, **una sola jornada abierta** por trabajador, descansos sin solapamiento, `UNIQUE(usuario, periodo)`. | Datos contradictorios que llegan al cálculo de horas. | Alta |
| H-13 | `Jornadas`, eventos | No hay identificador de idempotencia generado por el cliente. | Con conectividad intermitente el móvil reintentará y **duplicará** registros. | Alta |
| H-14 | `Eventos_Ruta` | `id_usuario` es redundante: ya se deduce de `id_jornada → id_usuario` (**dependencia transitiva, viola 3FN**). | Un evento podría apuntar a la jornada de otro usuario. | Media |
| H-15 | `Eventos_Ruta` | `tipo_evento` y `estado_atencion` sin `CHECK`; faltan `atendido_por`, `atendido_at`, notas y un campo flexible para datos variables. | El flujo de revisión del supervisor no queda trazado. | Media |
| H-16 | `Eventos_Descanso` | `tipo_evento` es texto libre y no indica si el descanso es **remunerado**; el nombre "evento" es confuso. | El cálculo no puede parametrizar qué descansos restan. | Media |
| H-17 | `Planillas` | Mezcla cabecera de período y detalle por trabajador; `periodo` es `VARCHAR` (`'SEMANA_1_SEP_2026'`) **sin fechas**. | No es consultable ni validable por rango; no se puede evitar solapar períodos. | Alta |
| H-18 | `Planillas` | `estado_aprobacion` solo admite `PENDIENTE`/`PAGADA`; no hay `calculada_por`, `verificada_por`, `aprobada_por`. | No soporta el flujo calcular → verificar → aprobar ni la segregación de funciones (CU-11). | Alta |
| H-19 | `Planillas` | No guarda la tarifa aplicada, la separación de horas extra diurnas/nocturnas, bonificaciones/deducciones ni el desglose del cálculo; no existe tabla de **pagos**. | El pago no es auditable ni reproducible. | Alta |
| H-20 | Todas | El script **no habilita RLS** ni define índices. Hoy la única barrera es la API, y esta no autentica (C-02). | Con autenticación propia y sin RLS, toda la autorización recae en el código del backend; un error de autorización en un endpoint expone o modifica datos sin una segunda barrera. | **Crítica** |
| H-21 | Backend | La aplicación se conecta con el rol `postgres` (superusuario) y la contraseña está en el código (C-01). | Un fallo de autorización o una inyección comprometen toda la base; no hay separación de privilegios. | **Crítica** |

#### D.1.3 Disposición por tabla (conservar / modificar / agregar)

| Tabla existente | Decisión | Destino en el modelo objetivo | Cambios principales |
| --- | --- | --- | --- |
| `Usuarios` | **Modificar y dividir** | `perfiles` (+ `roles`, `estados_trabajador`, `historial_estado_trabajador`, `tarifas_trabajador`, `sesiones_refresh`) | La PK pasa a `uuid` generado con `gen_random_uuid()`; se añaden `email` (UNIQUE) y `password_hash` para el login propio; `rol` → `rol_id` (FK); se **retira** `tarifa_hora` hacia `tarifas_trabajador` con vigencia; se añaden `activo`, documento, código de empleado, y la tabla `sesiones_refresh` para las sesiones (§D.2, §F.1). |
| `Rutas` | **Modificar** | `rutas` (+ `ruta_puntos`) | Añadir `codigo`, `supervisor_id` (FK), `activa`; `descripcion` → `nombre`/`descripcion`; el texto `ubicacion` se conserva como referencia y las coordenadas van a `ruta_puntos`. |
| `Jornadas` | **Dividir** | `registros_tiempo` (lo que **ocurrió**) + `asignaciones_ruta` y `acuerdos_turno` (lo que está **programado**) + `turnos` | Se resuelve H-07: lo programado deja de vivir en la misma fila que la entrada real. `hora_entrada` sigue `NOT NULL` en `registros_tiempo`. `APROBADA` pasa a `estado_validacion`. `TIMESTAMP` → `timestamptz`. `fecha` se elimina (se deriva). |
| `Eventos_Ruta` | **Conservar y evolucionar** | `eventos_diarios` | Se conservan las columnas tipadas (`tipo_evento`, `fecha_hora`, `latitud`, `longitud`, `estado_atencion`) porque alimentan la cola de revisión del supervisor. Se añaden `payload jsonb`, `client_uuid`, `atendido_por`, `atendido_at`, `CHECK` de dominios y FK compuesta (H-14). |
| `Eventos_Descanso` | **Renombrar y modificar** | `descansos` (+ `tipos_descanso`) | `tipo_evento` → `tipo_id` (FK a catálogo con `remunerado`); `CHECK (fin > inicio)`; sin solapamiento por jornada. |
| `Planillas` | **Reinterpretar y dividir** | `planilla_detalle` (cada fila actual es en realidad el detalle de **un trabajador**) + `periodos_planilla` + `planillas` (cabecera) + `detalle_conceptos` + `pagos` | `periodo` texto → `periodos_planilla` con fechas; se añade el flujo de estados y las columnas de segregación; se guarda la tarifa aplicada y el desglose en `calculo_detalle jsonb`. |

**Tablas nuevas (20):** `roles`, `permisos`, `rol_permiso`, `estados_trabajador`, `historial_estado_trabajador`, `ruta_puntos`, `asignaciones_ruta`, `turnos`, `acuerdos_turno`, `tipos_descanso`, `tarifas_trabajador`, `parametros_pago`, `periodos_planilla`, `planillas` (cabecera), `conceptos_pago`, `detalle_conceptos`, `metodos_pago`, `pagos`, `auditoria`, `sesiones_refresh`.

**Resultado:** 6 tablas existentes (todas modificadas o evolucionadas) + 20 nuevas = **26 tablas** del modelo de §D.2.

**Convenciones de nombres.** Se propone `snake_case`, minúsculas y plurales (`registros_tiempo`), y `trabajador_id` en lugar de `id_usuario`. Equivalencias de columnas más usadas:

| Actual | Objetivo |
| --- | --- |
| `Usuarios.id_usuario` | `perfiles.id` (uuid) |
| `Jornadas.id_usuario` | `registros_tiempo.trabajador_id` |
| `Jornadas.hora_entrada` / `hora_salida` | `registros_tiempo.ingreso_at` / `salida_at` |
| `Eventos_Descanso.hora_inicio` / `hora_fin` | `descansos.inicio_at` / `fin_at` |
| `Planillas.horas_normales` / `horas_extras` | `planilla_detalle.horas_ordinarias` / `horas_extra_diurnas` + `horas_extra_nocturnas` |
| `Planillas.total_pago` | `planilla_detalle.neto` (snapshot inmutable al aprobar) |

**Ejemplos de correcciones clave**

```sql
-- H-14: un evento solo puede apuntar a una jornada del MISMO trabajador (FK compuesta)
alter table public.registros_tiempo
  add constraint registros_tiempo_id_trabajador_uk unique (id, trabajador_id);

alter table public.eventos_diarios
  add constraint eventos_registro_trabajador_fk
  foreign key (registro_tiempo_id, trabajador_id)
  references public.registros_tiempo (id, trabajador_id);

-- H-12: una sola jornada abierta por trabajador
create unique index registros_uno_abierto
  on public.registros_tiempo (trabajador_id) where salida_at is null;

-- H-11: el historial no se borra en cascada
--   FK a perfiles con ON DELETE RESTRICT; baja lógica mediante perfiles.activo = false
```

#### D.1.4 Estrategia de migración

**Decisión D-1 (resuelta):** las tablas actuales contienen **solo datos de prueba**. Se adopta la **reconstrucción limpia** del esquema con migraciones versionadas (herramienta a elegir: `node-pg-migrate` o Flyway **\[VALIDAR\]**), en sustitución del script SQL único. Solo se cargan *seeds* de catálogos; los datos de prueba se descartan.

**Decisión D-2 (resuelta con una observación):** el equipo indica que los valores actuales están en hora local del dispositivo. Sin embargo, el código de la app **ya envía UTC** (`yyyy-MM-dd'T'HH:mm:ss.SSS'Z'`) y el servidor lo inserta tal cual en columnas `TIMESTAMP`, que **ignoran el sufijo `Z`**: los registros recientes quedan como hora UTC sin etiqueta de zona (la consulta `AT TIME ZONE 'UTC' AT TIME ZONE 'America/Guatemala'` del servidor es coherente con eso). Como los datos se descartan, no hace falta convertirlos; lo que importa es fijar el contrato de aquí en adelante:

- El cliente envía siempre **UTC en ISO 8601**.
- La base guarda `timestamptz`.
- La conversión a hora local se hace **solo al mostrar**, con la zona de operación como parámetro configurable (`parametros_pago`).

**Transición de la app móvil.** La app ya se comunica con la API (no escribe en la base), por lo que no hay un problema de acceso directo. La transición se organiza en fases:

| Fase | Trabajo | Riesgo que cierra |
| --- | --- | --- |
| **0 (inmediata)** | Sacar las credenciales del código a variables de entorno y usar un rol de aplicación sin superusuario. Añadir el índice parcial único de jornada abierta. En la app: sincronización secuencial y no marcar como enviados los `400`/`409` genéricos. | C-01, C-04, C-05, C-06 |
| **1** | Reconstruir el esquema (M001 a M008), publicar `/api/v1` con autenticación y mantener `POST /api/registros` como capa de compatibilidad. | H-01 a H-20, C-02, C-03 |
| **2** | La app migra a `/api/v1`: inicio de sesión, `client_uuid`, `Idempotency-Key`, envío de precisión de ubicación y pantalla de descansos. | C-08, C-09 |
| **3** | Retirar `POST /api/registros` y el `GET /api/jornadas` público. | C-02 |

**Orden sugerido de migraciones**

| Migración | Contenido |
| --- | --- |
| M001 | Extensiones (`btree_gist`, `pgcrypto`), esquema `app`, funciones auxiliares |
| M002 | Catálogos (`roles`, `permisos`, `estados_trabajador`, `tipos_descanso`, `metodos_pago`, `conceptos_pago`, `turnos`) |
| M003 | `perfiles` (con `email`, `password_hash`), `tarifas_trabajador`, `historial_estado_trabajador`, `sesiones_refresh` (tokens de renovación para rotación y detección de reúso) |
| M004 | `rutas`, `ruta_puntos`, `asignaciones_ruta`, `acuerdos_turno` |
| M005 | `registros_tiempo`, `descansos`, `eventos_diarios` (con `CHECK`, índices y exclusiones) |
| M006 | `parametros_pago`, `periodos_planilla`, `planillas`, `planilla_detalle`, `detalle_conceptos`, `pagos` |
| M007 | `auditoria` y *triggers* de auditoría |
| M008 | **RLS y políticas** de §D.4 (capa opcional de defensa en profundidad, ver ADR-001) y pruebas automatizadas por rol |

#### D.1.5 Información pendiente para cerrar el análisis

1. **Archivos móviles restantes:** `DatabaseHelper.java` (estructura de la cola offline y estados de sincronización), `RetrofitClient.java` (URL base, TLS y tiempos de espera), `AndroidManifest.xml` (permisos y tráfico en claro) y `build.gradle`.
2. **Estructura del backend:** nombre del archivo principal y si existe algún otro archivo o carpeta además del servidor recibido.
3. **Estado real de la base local:** salida de `\d jornadas` y `\di` para confirmar si existe el índice único que el código da por hecho (C-06).
4. **Reglas de negocio del cálculo (a definir con quien corresponda):** jornada ordinaria diaria y semanal; factor de horas extra diurnas y nocturnas; definición de horario nocturno; si los descansos restan o son remunerados; regla de redondeo; periodicidad de planilla (semanal, quincenal o mensual); qué ocurre con jornadas sin salida.
5. Política de contraseñas y si el **MFA del Administrador** se construye desde el MVP o se difiere a una fase posterior (ver §F.1); ya no depende de un proveedor externo, así que es una decisión enteramente del equipo.

### D.2 Modelo relacional transaccional (3FN)

**Modelo Entidad-Relación**

```mermaid
erDiagram
  ROLES ||--o{ PERFILES : "clasifica"
  ROLES ||--o{ ROL_PERMISO : "concede"
  PERMISOS ||--o{ ROL_PERMISO : "incluido en"
  ESTADOS_TRABAJADOR ||--o{ HISTORIAL_ESTADO_TRABAJADOR : "define"
  PERFILES ||--o{ HISTORIAL_ESTADO_TRABAJADOR : "tiene"
  PERFILES ||--o{ RUTAS : "supervisa"
  RUTAS ||--o{ RUTA_PUNTOS : "contiene"
  RUTAS ||--o{ ASIGNACIONES_RUTA : "recibe"
  PERFILES ||--o{ ASIGNACIONES_RUTA : "es asignado"
  TURNOS ||--o{ ACUERDOS_TURNO : "plantilla de"
  ASIGNACIONES_RUTA ||--o{ ACUERDOS_TURNO : "acuerda"
  ASIGNACIONES_RUTA ||--o{ REGISTROS_TIEMPO : "genera"
  PERFILES ||--o{ REGISTROS_TIEMPO : "registra"
  REGISTROS_TIEMPO ||--o{ DESCANSOS : "incluye"
  TIPOS_DESCANSO ||--o{ DESCANSOS : "clasifica"
  PERFILES ||--o{ EVENTOS_DIARIOS : "reporta"
  REGISTROS_TIEMPO |o--o{ EVENTOS_DIARIOS : "contextualiza"
  PERFILES ||--o{ TARIFAS_TRABAJADOR : "percibe"
  PERIODOS_PLANILLA ||--o{ PLANILLAS : "agrupa"
  PLANILLAS ||--o{ PLANILLA_DETALLE : "detalla"
  PERFILES ||--o{ PLANILLA_DETALLE : "devenga"
  PLANILLA_DETALLE ||--o{ DETALLE_CONCEPTOS : "ajusta"
  CONCEPTOS_PAGO ||--o{ DETALLE_CONCEPTOS : "tipifica"
  PLANILLA_DETALLE ||--o{ PAGOS : "se paga con"
  METODOS_PAGO ||--o{ PAGOS : "medio"
  PERFILES ||--o{ AUDITORIA : "actor de"
  PERFILES ||--o{ SESIONES_REFRESH : "autentica"
```

**Diccionario de datos (tablas, PK y FK)**

| # | Tabla | PK | FK principales | Atributos clave / restricciones |
| --- | --- | --- | --- | --- |
| 1 | `roles` | `id smallint` | — | `nombre` UNIQUE (`administrador`, `supervisor`, `trabajador`) |
| 2 | `permisos` | `id smallint` | — | `codigo` UNIQUE (p. ej. `planilla.aprobar`) |
| 3 | `rol_permiso` | (`rol_id`, `permiso_id`) | `rol_id`→roles, `permiso_id`→permisos | PK compuesta (N:M) |
| 4 | `perfiles` | `id uuid` (gen. con `gen_random_uuid()`) | `rol_id`→roles | `email` UNIQUE, `password_hash`, `codigo_empleado` UNIQUE, nombres, apellidos, documento UNIQUE, `activo`, `mfa_secret` (nullable) |
| 5 | `estados_trabajador` | `id smallint` | — | `codigo` UNIQUE (ACTIVO, EN_RUTA, DESCANSO, INCAPACIDAD, VACACIONES, SUSPENDIDO, INACTIVO) |
| 6 | `historial_estado_trabajador` | `id uuid` | `perfil_id`→perfiles, `estado_id`→estados_trabajador, `registrado_por`→perfiles | `desde`, `hasta` NULL = vigente; sin solapamiento por perfil (*exclusion constraint*) |
| 7 | `rutas` | `id uuid` | `supervisor_id`→perfiles | `codigo` UNIQUE, `nombre`, `activa` |
| 8 | `ruta_puntos` | `id uuid` | `ruta_id`→rutas | `orden`, `nombre`, `latitud`, `longitud`, `radio_m`; UNIQUE(`ruta_id`,`orden`) |
| 9 | `asignaciones_ruta` | `id uuid` | `ruta_id`→rutas, `trabajador_id`→perfiles, `asignado_por`→perfiles | `fecha_inicio`, `fecha_fin`, `activa`; sin solapamiento por trabajador |
| 10 | `turnos` | `id smallint` | — | `nombre`, `hora_inicio`, `hora_fin`, `minutos_descanso`, `es_nocturno` |
| 11 | `acuerdos_turno` | `id uuid` | `asignacion_id`→asignaciones_ruta, `turno_id`→turnos, `confirmado_por`→perfiles | `fecha`, `estado` (PROPUESTO/ACEPTADO/RECHAZADO/CONFIRMADO), `confirmado_at`; UNIQUE(`asignacion_id`,`fecha`) |
| 12 | `registros_tiempo` | `id uuid` | `trabajador_id`→perfiles, `asignacion_id`→asignaciones_ruta, `validado_por`→perfiles | `ingreso_at`, `salida_at`, `lat/lng`, `origen`, `estado_validacion`, `client_uuid`; CHECK(`salida_at > ingreso_at`); UNIQUE(`trabajador_id`,`client_uuid`) |
| 13 | `tipos_descanso` | `id smallint` | — | `nombre`, `remunerado boolean` |
| 14 | `descansos` | `id uuid` | `registro_tiempo_id`→registros_tiempo, `tipo_id`→tipos_descanso | `inicio_at`, `fin_at`; CHECK(`fin_at > inicio_at`) |
| 15 | `eventos_diarios` (evoluciona de `Eventos_Ruta`) | `id uuid` | `trabajador_id`→perfiles, (`registro_tiempo_id`,`trabajador_id`)→registros_tiempo, `atendido_por`→perfiles | `tipo_evento`, `latitud`, `longitud`, `estado_atencion`, `client_uuid`; **JSONB** `payload` (§D.3) |
| 16 | `tarifas_trabajador` | `id uuid` | `trabajador_id`→perfiles | `valor_hora numeric(12,4)`, `vigente_desde`, `vigente_hasta` |
| 17 | `parametros_pago` | `id smallint` | — | `clave` UNIQUE + vigencia (jornada diaria, factor extra diurna, factor extra nocturna, regla de redondeo) |
| 18 | `periodos_planilla` | `id uuid` | — | `fecha_inicio`, `fecha_fin`, `estado`; UNIQUE(`fecha_inicio`,`fecha_fin`) |
| 19 | `planillas` | `id uuid` | `periodo_id`→periodos, `ruta_id`→rutas (nullable), `calculada_por`, `verificada_por`, `aprobada_por`→perfiles | `estado`; CHECK de segregación de funciones |
| 20 | `planilla_detalle` | `id uuid` | `planilla_id`→planillas, `trabajador_id`→perfiles | horas ordinarias/extra, `monto_*`, `calculo_detalle jsonb`; UNIQUE(`planilla_id`,`trabajador_id`) |
| 21 | `conceptos_pago` | `id smallint` | — | `nombre`, `tipo` (BONIFICACION/DEDUCCION) |
| 22 | `detalle_conceptos` | `id uuid` | `detalle_id`→planilla_detalle, `concepto_id`→conceptos_pago | `monto numeric(12,2)` |
| 23 | `metodos_pago` | `id smallint` | — | `nombre` (TRANSFERENCIA, EFECTIVO, CHEQUE) |
| 24 | `pagos` | `id uuid` | `detalle_id`→planilla_detalle, `metodo_id`→metodos_pago, `registrado_por`→perfiles | `monto`, `referencia`, `pagado_at`, `estado` |
| 25 | `auditoria` | `id bigint identity` | `actor_id`→perfiles | **JSONB** `datos_antes`, `datos_despues`, `contexto` (§D.3) |
| 26 | `sesiones_refresh` | `id uuid` | `perfil_id`→perfiles, `reemplazado_por`→sesiones_refresh (self-FK, nullable) | `token_hash` UNIQUE (nunca el token en claro), `creado_at`, `expira_at`, `revocado_at`, `ip`, `user_agent`; encadena la rotación (§F.1) |

**Tabla `sesiones_refresh` (soporta la autenticación propia, §F.1)**

```sql
create table public.sesiones_refresh (
  id                uuid primary key default gen_random_uuid(),
  perfil_id         uuid        not null references public.perfiles(id) on delete cascade,
  token_hash        text        not null unique,        -- SHA-256 del refresh token; nunca el token en claro
  creado_at         timestamptz not null default now(),
  expira_at         timestamptz not null,
  revocado_at       timestamptz,                        -- logout o detección de reúso
  reemplazado_por   uuid        references public.sesiones_refresh(id), -- encadena la rotación
  ip                inet,
  user_agent        text
);

create index sesiones_refresh_perfil on public.sesiones_refresh (perfil_id) where revocado_at is null;
```

**Justificación de 3FN**

- **1FN:** todos los atributos son atómicos; los descansos (antes potencial lista dentro del registro) se extraen a `descansos`.
- **2FN:** en tablas con PK compuesta (`rol_permiso`) no hay atributos que dependan de solo una parte de la clave.
- **3FN:** no existen dependencias transitivas; los catálogos (`roles`, `estados_trabajador`, `tipos_descanso`, `metodos_pago`, `conceptos_pago`) evitan repetir descripciones y permiten cambios en un solo lugar.
- **Desnormalización deliberada y documentada:** `planilla_detalle` almacena **totales derivados** (horas y montos). Es un *snapshot* contable: recalcular en cada consulta permitiría que un cambio de tarifa alterara pagos históricos. La integridad se garantiza porque el snapshot solo se escribe en el cálculo y se congela al aprobar (RN-07). Este es el único desvío de 3FN y se acepta por requisito de inmutabilidad.

**Integridad y rendimiento (resumen)**

- `EXCLUDE USING gist` (extensión `btree_gist`) para impedir asignaciones e historiales de estado con rangos de fechas solapados por trabajador.
- Índices en todas las FKs y compuestos para consultas frecuentes: `registros_tiempo(trabajador_id, ingreso_at DESC)`, `asignaciones_ruta(ruta_id, activa)`.
- Tipos: `uuid` para entidades transaccionales, `smallint` para catálogos, `timestamptz` (UTC) para toda marca de tiempo, `numeric` para dinero.
- Borrado lógico (`activo`) en entidades maestras; las transaccionales no se borran.

### D.3 Componente NoSQL: JSONB

**Justificación.** La app móvil produce eventos de estructura variable (incidentes, geocercas, cambios de conectividad, notas) que evolucionan más rápido que el esquema relacional. JSONB permite **almacenar sin migrar** mientras se conserva consulta indexada y transaccionalidad de PostgreSQL (más RLS si el equipo la activa, §D.4). Los datos que participan en el **cálculo de pago** permanecen en columnas relacionales tipadas. De igual forma, en `eventos_diarios` se conservan como columnas tipadas los campos que el supervisor filtra a diario (tipo, coordenadas, estado de atención) y solo la parte variable va en `payload`.

**Tabla 1: `eventos_diarios`** (generada por el móvil y por la web)

```sql
create table public.eventos_diarios (
  id                 uuid primary key default gen_random_uuid(),
  client_uuid        uuid        not null,              -- idempotencia desde el móvil
  trabajador_id      uuid        not null references public.perfiles(id),
  registro_tiempo_id uuid,                              -- FK compuesta a (id, trabajador_id), ver §D.1.3
  tipo_evento        text        not null
    check (tipo_evento in ('EMERGENCIA','VISITA_FALLIDA','PROBLEMA_VEHICULO','CAMBIO_ESTADO','NOTA','OTRO')),
  origen             text        not null check (origen in ('MOVIL','WEB','SISTEMA')),
  latitud            numeric(10,8),                    -- se conservan de Eventos_Ruta (cola de revisión)
  longitud           numeric(11,8),
  estado_atencion    text        not null default 'PENDIENTE_REVISION'
    check (estado_atencion in ('PENDIENTE_REVISION','EN_ATENCION','ATENDIDO','DESCARTADO')),
  atendido_por       uuid        references public.perfiles(id),
  atendido_at        timestamptz,
  esquema_version    smallint    not null default 1,    -- versionado del payload
  payload            jsonb       not null default '{}'::jsonb
    check (jsonb_typeof(payload) = 'object'),           -- parte dinámica (evoluciona sin migrar)
  ocurrido_en        timestamptz not null,             -- hora del dispositivo
  recibido_en        timestamptz not null default now(),-- hora del servidor
  unique (trabajador_id, client_uuid),
  foreign key (registro_tiempo_id, trabajador_id)
    references public.registros_tiempo (id, trabajador_id)
);

create index eventos_payload_gin on public.eventos_diarios using gin (payload jsonb_path_ops);
create index eventos_pendientes  on public.eventos_diarios (estado_atencion, ocurrido_en desc)
  where estado_atencion = 'PENDIENTE_REVISION';
create index eventos_trab_fecha  on public.eventos_diarios (trabajador_id, ocurrido_en desc);
```

Ejemplo de `payload` (`tipo_evento = 'PROBLEMA_VEHICULO'`):

```json
{
  "subtipo": "LLANTA",
  "severidad": "MEDIA",
  "descripcion": "Llanta ponchada en el km 34",
  "precision_m": 12,
  "adjuntos": [{ "tipo": "foto", "ref": "storage://incidentes/2026/09/abc.jpg" }],
  "dispositivo": { "so": "Android 15", "app": "1.4.2", "bateria": 62 }
}
```

**Tabla 2: `auditoria`** (cambios hechos desde la web y eventos de seguridad)

```sql
create table public.auditoria (
  id             bigint generated always as identity primary key,
  actor_id       uuid references public.perfiles(id),
  actor_rol      text,
  entidad        text not null,
  entidad_id     text not null,
  accion         text not null
    check (accion in ('INSERT','UPDATE','DELETE','VERIFICAR','APROBAR','RECHAZAR','PAGAR','LOGIN','EXPORT')),
  datos_antes    jsonb,
  datos_despues  jsonb,
  contexto       jsonb not null default '{}'::jsonb,   -- ip, user_agent, request_id
  ocurrido_en    timestamptz not null default now()
);

create index auditoria_entidad on public.auditoria (entidad, entidad_id, ocurrido_en desc);
create index auditoria_ctx_gin on public.auditoria using gin (contexto);

-- Append-only: nadie modifica ni borra bitácora desde la API de datos
revoke update, delete, truncate on public.auditoria from anon, authenticated;
```

**Reglas del componente JSONB**

1. **Validación en la API** con esquema por `tipo_evento` y `esquema_version` (Zod/JSON Schema); PostgreSQL solo garantiza que sea objeto JSON.
2. **Nunca se renderiza como HTML** en la web: se muestra como texto (mitigación XSS; ver §F).
3. **Sin PII innecesaria** en `payload`; datos personales solo por referencia (`trabajador_id`).
4. Tamaño máximo por evento (p. ej. 32 KB), controlado en API.
5. La auditoría se escribe mediante **triggers `SECURITY DEFINER`** para cambios en tablas críticas y desde la API para acciones de negocio (aprobar, pagar).

### D.4 Políticas de Seguridad a Nivel de Fila (RLS opcional, defensa en profundidad)

**Alcance de esta sección.** Con autenticación propia sobre PostgreSQL (Opción B, ADR-001), **la primera barrera de autorización es el backend** (rol + pertenencia verificados en cada endpoint, §E y §F.1). RLS se documenta aquí como **segunda capa opcional**: recomendada antes de producción, pero no bloqueante para empezar a codificar (puede activarse en la Fase 1 de §D.1.4 sin cambiar el esquema).

**Principios**

- **RLS activada en todas las tablas** del esquema `public` (`alter table ... enable row level security`). Sin política = sin acceso.
- El backend **no tiene un usuario de base de datos por persona**: usa un único rol de aplicación (`app_user`, sin privilegios de superusuario, cierra H-21/C-01) para todas las conexiones del *pool* `pg`. Por eso, para que RLS distinga entre trabajador, supervisor y administrador, **cada transacción que necesite RLS debe declarar quién es el usuario actual** después de verificar su JWT propio:

  ```sql
  -- Al inicio de cada transacción que requiera RLS, con los claims YA verificados por el backend:
  select set_config('app.jwt_claims', '{"sub":"5b1c2d3e-…","rol":"supervisor"}', true);
  ```

  Las políticas leen ese valor con la función auxiliar `app.usuario_actual()` (equivalente casero a `auth.uid()`), nunca con un dato que el cliente pueda manipular directamente.
- **El rol de aplicación (`app_user`) tiene los privilegios mínimos** que sus operaciones requieren; nunca se conecta con `postgres` ni con un rol de superusuario (cierra H-21/C-01).
- Las funciones auxiliares usan `security definer` con `search_path` fijo para evitar recursión y suplantación.

**Funciones auxiliares**

```sql
create schema if not exists app;

-- Lee los claims que el backend fijó con set_config() tras verificar su propio JWT.
create or replace function app.jwt_claims() returns jsonb
language sql stable security definer set search_path = ''
as $$ select coalesce(nullif(current_setting('app.jwt_claims', true), ''), '{}')::jsonb $$;

create or replace function app.rol_actual() returns text
language sql stable security definer set search_path = ''
as $$ select coalesce(app.jwt_claims() ->> 'rol', 'sin_rol') $$;

-- Equivalente casero a auth.uid(): el id del perfil autenticado.
create or replace function app.usuario_actual() returns uuid
language sql stable security definer set search_path = ''
as $$ select nullif(app.jwt_claims() ->> 'sub', '')::uuid $$;

create or replace function app.supervisa_trabajador(p_trabajador uuid) returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1
    from public.asignaciones_ruta a
    join public.rutas r on r.id = a.ruta_id
    where a.trabajador_id = p_trabajador
      and a.activa
      and r.supervisor_id = app.usuario_actual()
  )
$$;

create or replace function app.supervisa_ruta(p_ruta uuid) returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.rutas r
    where r.id = p_ruta and r.supervisor_id = app.usuario_actual()
  )
$$;
```

**Catálogo de políticas**

| Tabla | Trabajador | Supervisor | Administrador |
| --- | --- | --- | --- |
| `perfiles` | SELECT solo su fila | SELECT de trabajadores en sus rutas | ALL |
| `roles`, `permisos`, `rol_permiso` | SELECT | SELECT | ALL |
| `estados_trabajador`, `tipos_descanso`, `turnos`, `metodos_pago`, `conceptos_pago` | SELECT | SELECT | ALL |
| `historial_estado_trabajador` | SELECT propio | SELECT/INSERT de sus trabajadores | ALL |
| `rutas`, `ruta_puntos` | SELECT de rutas con asignación propia activa | SELECT/UPDATE de rutas que supervisa | ALL |
| `asignaciones_ruta` | SELECT propias | ALL sobre sus rutas (`app.supervisa_ruta`) | ALL |
| `acuerdos_turno` | SELECT propios; UPDATE solo `estado` ∈ {ACEPTADO, RECHAZADO} de los propios | SELECT/UPDATE (confirmar) de sus trabajadores | ALL |
| `registros_tiempo` | SELECT propios; INSERT propio con `estado_validacion='PENDIENTE'`; sin UPDATE/DELETE una vez validado | SELECT/UPDATE (validar/corregir) de sus trabajadores | ALL |
| `descansos` | Igual que su `registros_tiempo` padre | Igual que padre | ALL |
| `eventos_diarios` | INSERT y SELECT propios; **sin UPDATE/DELETE** | SELECT de sus trabajadores; UPDATE **solo** de `estado_atencion`, `atendido_por`, `atendido_at` | SELECT/UPDATE (mismas columnas) |
| `tarifas_trabajador` | SELECT propia | ✖ (no ve salarios) | ALL |
| `parametros_pago` | SELECT | SELECT | ALL |
| `periodos_planilla` | ✖ | SELECT | ALL |
| `planillas` | ✖ | SELECT/UPDATE de las de sus rutas, solo transiciones permitidas | ALL |
| `planilla_detalle`, `detalle_conceptos` | SELECT propio **solo si** la planilla está `VERIFICADA`/`APROBADA`/`PAGADA` | SELECT de sus trabajadores | ALL |
| `pagos` | SELECT propios | ✖ | ALL |
| `auditoria` | ✖ | ✖ | **Solo SELECT**; INSERT vía trigger/función; UPDATE/DELETE nadie |

> El trabajador consulta su **cálculo estimado** en curso mediante el endpoint `GET /me/calculo`, que el backend deriva de sus `registros_tiempo` (que sí puede leer) sin exponer tarifas de otros ni la planilla en borrador.

**Ejemplo de implementación (`registros_tiempo`)**

```sql
alter table public.registros_tiempo enable row level security;

-- "to app_user" porque todas las conexiones del backend usan ese único rol de aplicación;
-- lo que distingue al trabajador del supervisor es app.jwt_claims(), fijado por transacción.

create policy rt_trabajador_select on public.registros_tiempo
  for select to app_user
  using (trabajador_id = app.usuario_actual());

create policy rt_trabajador_insert on public.registros_tiempo
  for insert to app_user
  with check (
    trabajador_id = app.usuario_actual()
    and app.rol_actual() = 'trabajador'
    and estado_validacion = 'PENDIENTE'
  );

create policy rt_supervisor_select on public.registros_tiempo
  for select to app_user
  using (app.rol_actual() = 'supervisor' and app.supervisa_trabajador(trabajador_id));

create policy rt_supervisor_update on public.registros_tiempo
  for update to app_user
  using      (app.rol_actual() = 'supervisor' and app.supervisa_trabajador(trabajador_id))
  with check (app.rol_actual() = 'supervisor' and app.supervisa_trabajador(trabajador_id));

create policy rt_admin_all on public.registros_tiempo
  for all to app_user
  using      (app.rol_actual() = 'administrador')
  with check (app.rol_actual() = 'administrador');
```

**Pruebas de RLS (criterio de aceptación, si el equipo la activa):** suite automatizada que, para cada tabla, fija `app.jwt_claims` con cada rol y verifica (a) lo permitido, (b) lo denegado y (c) que un supervisor **no** accede a datos de rutas ajenas. Se incluye en CI.

**Restricción de segregación de funciones en BD:**

```sql
alter table public.planillas add constraint planillas_segregacion check (
  (verificada_por is null or verificada_por <> calculada_por) and
  (aprobada_por   is null or aprobada_por   <> calculada_por) and
  (aprobada_por   is null or aprobada_por   <> verificada_por)
);
```

---

## E. Especificación de la API REST (Contrato de Interfaz)

### E.1 Convenciones generales

| Aspecto | Convención |
| --- | --- |
| Base URL | `/api/v1` (versionado en la ruta) |
| Formato | `application/json; charset=utf-8` |
| **Auth Web** | Cookies `HttpOnly` propias (`__Host-psis-access`, `__Secure-psis-refresh`) + cabecera `X-CSRF-Token` en métodos que modifican estado |
| **Auth Móvil** | `Authorization: Bearer <JWT>` |
| Idempotencia | `Idempotency-Key: <uuid>` en `POST` del móvil (además de `client_uuid` en el cuerpo) |
| Trazabilidad | `X-Request-Id` (generado si no viene); se devuelve en toda respuesta |
| Errores | RFC 9457 / 7807 `application/problem+json`: `{ "type", "title", "status", "detail", "code", "request_id", "errors": [...] }` |
| Fechas | ISO 8601 en UTC (`2026-09-21T13:05:00Z`) |
| Paginación | `?page=1&page_size=50` → `{ data, page, page_size, total }` |
| Dinero | Cadena decimal (`"1234.50"`) para evitar errores de punto flotante |
| Autorización | Rol en el claim `rol` del JWT propio + verificación de pertenencia (ruta/trabajador) en la API + RLS opcional |

**Códigos HTTP comunes:** `400` petición mal formada · `401` no autenticado/token vencido · `403` sin permiso · `404` no existe (o no visible por RLS) · `409` conflicto de estado/duplicado · `422` regla de negocio incumplida · `429` límite de tasa · `500`/`503` error del servidor.

### E.2 Matriz de endpoints

| # | Verbo | Ruta | Actor / Rol | Cabeceras de Auth | Éxito | Errores |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | `POST` | `/auth/session` | Público | `Content-Type` (Web: recibe cookies `Set-Cookie`) | `200` | `400`, `401`, `423`, `429` |
| 1b | `POST` | `/auth/refresh` | Autenticado (cookie/token de refresh) | Cookie de refresh (Web) / `refresh_token` en el cuerpo (Móvil) | `200` | `401` |
| 2 | `POST` | `/auth/logout` | Autenticado | Cookie + `X-CSRF-Token` (Web) / `Bearer` (Móvil) | `204` | `401` |
| 2b | `POST` | `/admin/usuarios` | Administrador | Cookie + `X-CSRF-Token` | `201` | `400`, `401`, `403`, `409`, `422` |
| 3 | `GET` | `/me` | Autenticado | Cookie / `Bearer` | `200` | `401` |
| 4 | `POST` | `/registros-tiempo/ingreso` | Trabajador | `Bearer` + `Idempotency-Key` | `201` (`200` si repetido) | `400`, `401`, `403`, `409`, `422` |
| 5 | `POST` | `/registros-tiempo/{id}/descansos` | Trabajador | `Bearer` + `Idempotency-Key` | `201` | `400`, `401`, `403`, `404`, `409`, `422` |
| 6 | `PATCH` | `/registros-tiempo/{id}/salida` | Trabajador | `Bearer` + `Idempotency-Key` | `200` | `400`, `401`, `403`, `404`, `409`, `422` |
| 7 | `POST` | `/eventos:batch` | Trabajador (sync móvil) | `Bearer` + `Idempotency-Key` | `207` (multi-estado) | `400`, `401`, `413`, `422` |
| 8 | `PATCH` | `/registros-tiempo/{id}/validacion` | Supervisor, Admin | Cookie + `X-CSRF-Token` | `200` | `400`, `401`, `403`, `404`, `409` |
| 9 | `POST` | `/rutas/{rutaId}/asignaciones` | Supervisor (propia), Admin | Cookie + `X-CSRF-Token` | `201` | `400`, `401`, `403`, `404`, `409`, `422` |
| 10 | `POST` | `/acuerdos-turno/{id}/confirmar` | Supervisor, Admin | Cookie + `X-CSRF-Token` | `200` | `400`, `401`, `403`, `404`, `409` |
| 11 | `GET` | `/me/calculo?desde=&hasta=` | Trabajador | `Bearer` | `200` | `400`, `401`, `403` |
| 12 | `GET` | `/planillas/periodos/{periodoId}/calculo` | Supervisor, Admin | Cookie | `200` | `400`, `401`, `403`, `404` |
| 13 | `POST` | `/planillas/{id}/calcular` | Supervisor, Admin | Cookie + `X-CSRF-Token` | `200` | `401`, `403`, `404`, `409`, `422` |
| 14 | `POST` | `/planillas/{id}/verificar` | Supervisor | Cookie + `X-CSRF-Token` | `200` | `401`, `403`, `404`, `409`, `422` |
| 15 | `POST` | `/planillas/{id}/aprobar` | Administrador | Cookie + `X-CSRF-Token` + reautenticación/MFA | `200` | `401`, `403`, `404`, `409`, `422` |
| 16 | `POST` | `/planillas/{id}/pagos` | Administrador | Cookie + `X-CSRF-Token` + `Idempotency-Key` | `201` | `401`, `403`, `404`, `409`, `422` |

### E.3 Contratos de los endpoints vitales

#### E-1 · `POST /api/v1/auth/session` (login)

**Solicitud**

```json
{ "email": "supervisor@empresa.com", "password": "********" }
```

El backend busca `perfiles` por `email`, verifica `password_hash` con bcrypt/argon2, y si el rol es `administrador` y tiene MFA activo, exige un segundo paso (`mfa_token`) antes de emitir sesión (§F.1).

**Respuesta `200`** (Web: los tokens viajan **solo** en `Set-Cookie`, no en el cuerpo)

```json
{
  "user": { "id": "5b1c…", "nombres": "Ana", "apellidos": "López", "rol": "supervisor" },
  "csrf_token": "b7f0c1…"
}
```

Web: `Set-Cookie: __Host-psis-access=…; HttpOnly; Secure; SameSite=Lax; Path=/` (JWT propio, firmado por el backend) y `Set-Cookie: __Secure-psis-refresh=…; HttpOnly; Secure; SameSite=Strict; Path=/api/v1/auth`. El backend guarda el *hash* del refresh token emitido en `sesiones_refresh`. Móvil: enviar `X-Client-Type: mobile` para recibir `access_token`/`refresh_token` en el cuerpo (se guardan en Keychain/Keystore). **Errores:** `400` validación · `401` credenciales inválidas (mensaje genérico, no revela si el correo existe) · `423` cuenta bloqueada por intentos fallidos · `429` demasiados intentos.

#### E-1b · `POST /api/v1/auth/refresh` (renovar sesión)

El cliente no envía el refresh token en el cuerpo si es Web (viaja en la cookie `__Secure-psis-refresh`); el móvil sí lo envía explícito.

**Respuesta `200`**

```json
{ "access_token_emitido": true, "expira_en": 900 }
```

El backend: (1) busca el `token_hash` recibido en `sesiones_refresh`; (2) si está `revocado_at` o no existe, responde `401` y, si el token ya había sido reemplazado antes (indicio de robo/reúso), **revoca todas las sesiones del usuario**; (3) si es válido, emite un access token nuevo y **rota** el refresh (marca el actual como reemplazado y crea uno nuevo). **Errores:** `401` refresh inválido, expirado o revocado.

#### E-2b · `POST /api/v1/admin/usuarios` (crear usuario)

No hay registro público: el Administrador da de alta a cada trabajador/supervisor.

**Solicitud**

```json
{
  "email": "trabajador3@empresa.com",
  "nombres": "Carlos",
  "apellidos": "Pérez",
  "rol": "trabajador",
  "codigo_empleado": "EMP-0034"
}
```

**Respuesta `201`**

```json
{ "id": "9a77…", "email": "trabajador3@empresa.com", "password_temporal": "X7f2-Km91", "debe_cambiar_password": true }
```

El backend genera una contraseña temporal aleatoria (nunca la elige el Administrador) y obliga a cambiarla en el primer inicio de sesión. **`409`** si el correo o el código de empleado ya existen. **`422`** si el rol no es válido.

#### E-4 · `POST /api/v1/registros-tiempo/ingreso` (registrar ingreso)

**Solicitud**

```json
{
  "client_uuid": "0d3f4c1e-6a4e-4a5b-9c6c-1d0c1f2e9a77",
  "asignacion_id": "c2a9f0f4-7e2b-4a0d-8c34-1f9ea1a0b111",
  "ingreso_at": "2026-09-21T13:00:12Z",
  "ubicacion": { "lat": 14.6349, "lng": -90.5069, "precision_m": 9 },
  "dispositivo": { "id": "dev-9F3A", "app_version": "1.4.2" }
}
```

**Respuesta `201`**

```json
{
  "id": "e17b2f7a-3c1d-4d86-9b3a-2f1d0c9a5555",
  "estado_validacion": "PENDIENTE",
  "turno": { "nombre": "Matutino", "hora_inicio": "06:00", "hora_fin": "14:00" },
  "dentro_de_geocerca": true
}
```

**Reglas:** el servidor **no confía en la hora del dispositivo** para el cálculo: guarda `ingreso_at` (cliente) y `recibido_en` (servidor) y marca desviaciones grandes para revisión del supervisor. **`409`** si ya existe un ingreso abierto o `client_uuid` repetido con contenido distinto; **`200`** con el recurso original si es un reintento idéntico (idempotencia). **`422`** si no hay asignación activa.

#### E-7 · `POST /api/v1/eventos:batch` (sincronización de eventos móviles)

**Solicitud**

```json
{
  "eventos": [
    {
      "client_uuid": "6f2b…",
      "tipo_evento": "PROBLEMA_VEHICULO",
      "esquema_version": 1,
      "ocurrido_en": "2026-09-21T15:20:00Z",
      "registro_tiempo_id": "e17b2f7a-…",
      "latitud": 14.6349,
      "longitud": -90.5069,
      "payload": { "subtipo": "LLANTA", "severidad": "MEDIA", "descripcion": "Llanta ponchada" }
    }
  ]
}
```

**Respuesta `207`**

```json
{
  "resultados": [
    { "client_uuid": "6f2b…", "estado": "CREADO", "id": "a91c…" },
    { "client_uuid": "77aa…", "estado": "DUPLICADO" },
    { "client_uuid": "12de…", "estado": "RECHAZADO", "code": "PAYLOAD_INVALIDO" }
  ]
}
```

Máximo 100 eventos y 256 KB por lote (`413` si se excede).

#### E-9 · `POST /api/v1/rutas/{rutaId}/asignaciones`

**Solicitud**

```json
{
  "trabajador_id": "5b1c2d3e-…",
  "fecha_inicio": "2026-10-01",
  "fecha_fin": null,
  "turno_id": 2
}
```

**Respuesta `201`**

```json
{
  "id": "c2a9f0f4-…",
  "ruta_id": "9d0e…",
  "trabajador_id": "5b1c2d3e-…",
  "activa": true,
  "acuerdo_turno": { "id": "77b1…", "estado": "PROPUESTO" }
}
```

**`409`** si el trabajador ya tiene una asignación solapada. **`403`** si el supervisor no es responsable de la ruta.

#### E-12 · `GET /api/v1/planillas/periodos/{periodoId}/calculo` (obtener cálculo)

**Respuesta `200`**

```json
{
  "periodo": { "id": "2f0a…", "desde": "2026-09-01", "hasta": "2026-09-15", "estado": "ABIERTO" },
  "planilla": { "id": "8c11…", "estado": "CALCULADA", "calculada_por": "a3e2…" },
  "resumen": { "trabajadores": 48, "horas_ordinarias": "7360.00", "horas_extra": "412.50", "total_bruto": "184230.75" },
  "detalle": [
    {
      "trabajador_id": "5b1c…",
      "horas_ordinarias": "120.00",
      "horas_extra_diurnas": "6.50",
      "horas_extra_nocturnas": "2.00",
      "monto_bruto": "3840.25",
      "total_bonificaciones": "150.00",
      "total_deducciones": "212.40",
      "neto": "3777.85",
      "alertas": ["VARIACION_MAYOR_20_PORCIENTO"]
    }
  ],
  "page": 1, "page_size": 50, "total": 48
}
```

Un **supervisor** solo recibe trabajadores de sus rutas; los montos salariales requieren rol autorizado.

#### E-14 · `POST /api/v1/planillas/{id}/verificar`

**Solicitud**

```json
{ "observaciones": "Revisadas 3 alertas de variación; justificadas por cobertura de ausencias.", "excepciones_revisadas": ["5b1c…", "9a77…"] }
```

**Respuesta `200`**

```json
{ "id": "8c11…", "estado": "VERIFICADA", "verificada_por": "d4f6…", "verificada_at": "2026-09-16T10:14:00Z" }
```

**`409`** con `code: "SEGREGACION_FUNCIONES"` si quien verifica calculó la planilla. **`409`** `ESTADO_INVALIDO` si no está `CALCULADA`.

#### E-15 · `POST /api/v1/planillas/{id}/aprobar` (aprobar)

**Cabeceras:** cookie de sesión + `X-CSRF-Token` + `X-Reauth-Token` (token de reautenticación/MFA reciente, válido pocos minutos). **Solicitud**

```json
{ "comentario": "Aprobada para pago quincena 1 de septiembre.", "total_esperado": "184230.75" }
```

`total_esperado` es una **protección contra condición de carrera**: si el total actual difiere (alguien recalculó), se responde `409 TOTAL_DESACTUALIZADO`. **Respuesta `200`**

```json
{ "id": "8c11…", "estado": "APROBADA", "aprobada_por": "f2b0…", "aprobada_at": "2026-09-16T11:02:31Z", "hash_integridad": "sha256:9c1f…" }
```

`hash_integridad` (resumen criptográfico del snapshot) permite detectar alteraciones posteriores.

#### E-16 · `POST /api/v1/planillas/{id}/pagos`

**Solicitud**

```json
{
  "metodo_id": 1,
  "fecha_pago": "2026-09-17",
  "pagos": [
    { "detalle_id": "d1a2…", "monto": "3777.85", "referencia": "TRX-000123" }
  ]
}
```

**Respuesta `201`**

```json
{ "planilla_id": "8c11…", "estado": "PAGADA", "pagos_registrados": 1, "total_pagado": "3777.85" }
```

**`422`** si `monto` ≠ neto aprobado, o la planilla no está `APROBADA`. **`409`** si el detalle ya fue pagado (idempotencia por `Idempotency-Key`).

---

## F. Plan de Seguridad y Mitigaciones OWASP

### F.1 Estrategia de sesiones y autenticación (JWT propio en cookies seguras)

> Decisión D-3 (ADR-001, §0.4.4): autenticación construida en el backend, sin proveedor externo.

**Flujo Web**

```mermaid
sequenceDiagram
  autonumber
  participant U as Navegador (SPA)
  participant API as API REST (módulo Auth)
  participant DB as PostgreSQL
  U->>API: POST /auth/session (email, password)
  API->>DB: SELECT perfil WHERE email
  API->>API: verifica password_hash (bcrypt/argon2)
  API->>API: firma access_token (JWT, secreto propio, vida corta)
  API->>DB: INSERT sesiones_refresh (hash del refresh token)
  API-->>U: Set-Cookie HttpOnly Secure SameSite + csrf_token en cuerpo
  U->>API: GET /me (cookie automática)
  API->>API: valida firma propia, exp, iss, aud; lee claim rol
  API-->>U: perfil y rol
  Note over U,API: Access token expira (corta vida)
  U->>API: 401 → POST /auth/refresh (cookie de refresh)
  API->>DB: valida token_hash en sesiones_refresh (no revocado, no expirado)
  API->>DB: marca sesión actual como reemplazada, crea una nueva (rotación)
  API-->>U: nuevas cookies
```

**Decisiones**

| Tema | Decisión | Justificación |
| --- | --- | --- |
| Emisión de tokens | El propio backend firma los JWT (librería estándar, p. ej. `jsonwebtoken`), con un secreto (`JWT_SECRET`, HS256) o par de llaves (RS256) fuera del código, en variables de entorno | La SPA nunca manipula tokens; JavaScript no puede leerlos. Ningún proveedor externo emite ni valida credenciales. |
| Hash de contraseñas | `bcrypt` o `argon2id` con costo adecuado (nunca hash propio ni reversible) | Estándar de la industria; resistente a fuerza bruta con hardware dedicado. |
| Cookies del access token | `__Host-psis-access`, `HttpOnly; Secure; SameSite=Lax; Path=/` sin atributo `Domain` | El prefijo `__Host-` impide que subdominios las sobrescriban. |
| Cookie de refresh | `__Secure-psis-refresh`, `HttpOnly; Secure; SameSite=Strict; Path=/api/v1/auth` | Solo viaja al endpoint de renovación; menor exposición. |
| Persistencia del refresh | Tabla `sesiones_refresh`: se guarda el **hash** del token (no el token), con `expira_at`, `revocado_at` y `reemplazado_por` para encadenar la rotación | Un volcado de la base no revela tokens utilizables; permite revocar sesiones individuales o todas las de un usuario. |
| Vida de tokens | Access corto (≈15 min, configurable); refresh de vida más larga (p. ej. 7–14 días) con **rotación en cada uso** | Limita el daño de un robo de token. |
| Detección de reúso | Si llega un refresh ya marcado `reemplazado_por`, se asume robo: se revocan **todas** las sesiones de ese usuario y se registra en `auditoria` | Un atacante que copie un refresh viejo dispara la alarma en el primer intento. |
| Verificación en API | Firma con el secreto/llave propios, `exp`, `iss`, `aud`; el rol se toma del claim `rol` del propio JWT | Un JWT manipulado o firmado con otra clave se rechaza. |
| Revocación | Logout marca la sesión como `revocado_at`; cambio de rol o baja del usuario fuerza cierre de sus sesiones activas | El access token sigue siendo válido hasta su `exp`; por eso su vida es corta y además se comprueba `perfiles.activo` en cada request. |
| MFA (TOTP) | **Recomendado** para el Administrador y para reautenticar *aprobar planilla* y *pagar*; puede diferirse a una fase posterior sin bloquear el resto del sistema (decisión de equipo, §D.1.5) | Acciones de mayor impacto financiero; construirlo a mano (p. ej. con `otplib`) es poco código pero se prioriza después del login básico. |
| Política de contraseña | Longitud mínima ≥ 12, verificación contra contraseñas filtradas, bloqueo progresivo tras intentos fallidos | Reduce ataques de fuerza bruta y *credential stuffing*; compensa no depender de un proveedor con estas protecciones ya integradas. |
| Alta de usuarios | Sin registro público: el Administrador crea cada cuenta (E-2b) con contraseña temporal de un solo uso | Sistema interno, no orientado al público; reduce superficie de ataque. |
| Móvil | `Bearer` en almacén seguro del SO (Keychain/Keystore); sin tokens en almacenamiento plano | No hay cookies, por lo que CSRF no aplica. |
| Registro de accesos | `LOGIN`, fallos, refresh con reúso detectado y cambios de rol a `auditoria` | Detección de anomalías, ahora sin el respaldo de un proveedor externo. |
| Autorización | Guarda de UI (solo UX) → **autorización en API** (rol + pertenencia, primera barrera real) → **RLS opcional** (segunda barrera, §D.4) | Defensa en profundidad, adaptada a que la API es hoy la única barrera obligatoria. |

### F.2 Matriz de mitigación para la Web

| Amenaza | Vector en este sistema | Mitigación | Verificación |
| --- | --- | --- | --- |
| **XSS almacenado** | Observaciones de planilla, nombres, descripciones de incidentes y `payload` JSONB enviados desde el móvil se muestran a supervisores | 1) **Escape por defecto** del framework (React/Vue/Angular); prohibido `innerHTML`, `dangerouslySetInnerHTML`, `v-html`, `bypassSecurityTrust*`. 2) Todo texto de usuario/JSONB se renderiza **como texto**. 3) Si se requiere texto enriquecido, **DOMPurify** con lista blanca estricta. 4) Validación y normalización de entrada en la API (esquemas Zod/JSON Schema, longitud máxima). 5) **Trusted Types** habilitado. | Regla ESLint (`no-danger`, `no-unsanitized`) en CI; pruebas con *payloads* XSS; revisión de PR |
| **XSS reflejado / basado en DOM** | Parámetros de la URL (filtros, `?ruta=`) leídos por la SPA; History API | Parsear y **validar** *query params* contra una lista/esquema antes de usarlos; nunca insertar en el DOM como HTML; validar `next`/`redirect` (solo rutas internas, mismo origen) | Pruebas unitarias del *parser* de rutas; prueba de *open redirect* |
| **Impacto de XSS (contención)** | Un XSS residual no debe robar sesión | Cookies `HttpOnly` (no exfiltrables); **CSP estricta** (abajo); sin tokens en `localStorage`; refresh tokens revocables desde `sesiones_refresh` | Escaneo de cabeceras (securityheaders); auditoría de almacenamiento |
| **CSRF** | Cookies de sesión se envían automáticamente a la API | 1) `SameSite=Lax/Strict`. 2) **Token CSRF** (sincronizador o *double-submit* firmado) en `X-CSRF-Token` para `POST/PUT/PATCH/DELETE`. 3) Validar `Origin`/`Referer` contra lista blanca. 4) CORS con **lista blanca** de orígenes y `credentials` solo para el dominio de la web. 5) Las mutaciones nunca usan `GET`. 6) Exigir `Content-Type: application/json`. | Pruebas: petición cruzada sin token → `403`; CORS con origen no permitido rechazado |
| **Exposición de secretos** | Credenciales de BD escritas en el código (C-01), `JWT_SECRET`/llave de firma, contraseña del rol `app_user` | 1) `DATABASE_URL` (con el rol `app_user`, sin superusuario) y `JWT_SECRET` **solo en el backend**, en variables de entorno del servidor o gestor de secretos; **jamás** en el bundle web ni en el móvil ni en el repositorio. 2) La web y el móvil **nunca** tienen credenciales de base de datos: solo hablan con la API. 3) Prohibido prefijar secretos con `VITE_`/`NEXT_PUBLIC_`/`REACT_APP_` (se incrustan en el cliente). 4) `.env` en `.gitignore`; `.env.example` sin valores; si la contraseña actual estuvo versionada (C-01), **cambiarla** y limpiar el historial de Git. 5) **Escaneo de secretos** en CI (gitleaks/GitHub secret scanning) y *pre-commit hook*. 6) Bases de datos separadas para dev/staging/prod; **rotación** de `JWT_SECRET` y contraseñas ante cualquier sospecha (invalida todas las sesiones activas). | Búsqueda de la llave en el bundle compilado; escaneo del historial de Git del repositorio |
| **Control de acceso roto / IDOR** | Manipular IDs (`/planillas/{id}`, `/registros-tiempo/{id}`) | Autorización por objeto en la API (pertenencia a ruta/trabajador), reforzada con **RLS opcional** si está activa; IDs `uuid`; respuesta `404` en lugar de `403` cuando el recurso no es visible | Suite de pruebas con JWT de roles cruzados (§D.4) |
| **Inyección (SQL/NoSQL/JSONB)** | Filtros y payloads | Consultas **siempre parametrizadas** con `pg` (`pool.query(texto, [valores])`); **nunca** concatenar SQL (corrige el patrón usado hoy en la ruta `/api/registros`, que ya parametriza, y lo mantiene como estándar); validación de esquema; `jsonb_path` con parámetros, no con cadenas del usuario | SAST (Semgrep/CodeQL) en CI |
| **Fallas de autenticación** | Fuerza bruta, credenciales filtradas | Límite de tasa en `/auth/session`, bloqueo progresivo, MFA, mensajes de error genéricos | Pruebas de límite de tasa |
| **Configuración insegura** | Cabeceras, CORS, mensajes de error detallados | Cabeceras de seguridad (abajo); errores sin *stack traces* al cliente; *debug* apagado en producción | Revisión de configuración por entorno |
| **Componentes vulnerables / cadena de suministro** | Dependencias npm | `npm audit`/Dependabot, *lockfile* obligatorio, SRI para recursos externos, mínimo de dependencias | Alertas semanales; bloqueo de PR con vulnerabilidades críticas |
| **Registro y monitoreo insuficientes** | Acciones críticas sin rastro | Auditoría append-only; alertas ante múltiples fallos de login, aprobaciones fuera de horario, cambios de rol | Simulacros de incidente |
| **Fallas de integridad** | Alteración de planilla aprobada | Inmutabilidad (RN-07), `hash_integridad`, segregación de funciones, restricciones `CHECK` | Pruebas de intento de UPDATE sobre `APROBADA` |
| **Clickjacking** | Incrustar la web en un `iframe` | `frame-ancestors 'none'` / `X-Frame-Options: DENY` | Prueba de incrustación |

**Cabeceras de seguridad (servidor de la SPA)**

```http
Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'; require-trusted-types-for 'script'
Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: geolocation=(), camera=(), microphone=()
Cross-Origin-Opener-Policy: same-origin
```

> Se evita `'unsafe-inline'` y `'unsafe-eval'`. Si el *bundler* o alguna librería exige estilos en línea, se resuelve con *nonces*/hashes y no relajando la política. Los valores exactos deben probarse en modo *report-only* (`Content-Security-Policy-Report-Only`) antes de imponerlos.

### F.3 Controles complementarios

| Área | Control |
| --- | --- |
| Transporte | HTTPS obligatorio con HSTS; TLS moderno en la API y en la conexión a PostgreSQL (`sslmode=require` si la base se aloja de forma remota) |
| Datos personales | Minimización; acceso a salarios restringido por rol en la API (y RLS si está activa); enmascarar identificadores en listados |
| Copias y recuperación | *Backups* de BD y prueba de restauración periódica |
| Móvil | Certificado *pinning* (opcional), detección de root/jailbreak (opcional), cifrado de la cola offline |
| Ciclo de desarrollo seguro | Modelado de amenazas por módulo (planilla y pagos primero), revisión de PR con lista de verificación de seguridad, pruebas de seguridad antes de cada entrega |

---