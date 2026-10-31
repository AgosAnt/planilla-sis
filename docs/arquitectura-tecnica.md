# Entregable: Arquitectura Técnica de la Solución

**Sistema de Control de Planillas y Rutas (`planilla-sis`)**

| Campo | Detalle |
| --- | --- |
| Versión | 3.0 (final) |
| Fecha | 30 de octubre de 2026 |
| Equipo | 6 integrantes (§A.1) |
| Repositorio | [https://github.com/AgosAnt/planilla-sis](https://github.com/AgosAnt/planilla-sis) |
| Despliegue | Backend y web en Azure App Service; PostgreSQL en Supabase (ver [`manual-despliegue.md`](manual-despliegue.md)) |

---

## A. Matriz de Asignación de Responsabilidades (RACI / RAM)

### A.1 Roles del equipo

| Integrante | Carné | Rol | Perfil | Foco principal |
| --- | --- | --- | --- | --- |
| Jonatan Josue Santiago Itzep | 0910-23-19455 | **Dev Backend 1** y **Dev Móvil 1** | Líder Técnico / Arquitecto | Contrato API, arquitectura, revisión de calidad; app móvil y sincronización offline |
| Marco Antonio Rolando Corado García | 0910-23-6501 | **Dev Backend 2** | Backend – Dominio | Rutas, turnos, registros de tiempo, motor de cálculo, aprobación y pagos |
| Dáliet Sofía Salguero Franco | 0910-23-6180 | **Dev Backend 3** | Datos / DBA | Esquema 3FN, JSONB, migraciones, RLS |
| Jose Daniel Pereira Cabrera | 0910-23-3852 | **Dev Backend 4** | Seguridad / DevOps / QA | Autenticación propia, OWASP, CI/CD, secretos, pruebas |
| Adal Samuel López Reyes | 0910-23-24277 | **Dev Web 1** | Líder Frontend | Shell de la SPA, routing, guardas, CSP |
| Stefany Mariana Hernández Galindo | 0910-23-6319 | **Dev Web 2** | Frontend | Módulos de UI (rutas, supervisión, planillas) |

El plan original contemplaba 7 integrantes, con un desarrollador móvil. El rol de Dev Móvil 1 lo asumió el líder técnico.

**Leyenda.** **R** = Responsable (ejecuta). **A** = Aprobador (rinde cuentas; **uno solo por fila**). **C** = Consultado. **I** = Informado. **A/R** = quien aprueba también ejecuta.

### A.2 Matriz RACI planificada

| # | Entregable técnico | Samuel | Stefany | Jonatan (BE1) | Marco | Sofía | Daniel | Jonatan (Móvil) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Arquitectura, patrones y ADRs | C | I | **A/R** | C | C | C | C |
| 2 | Integración con el repositorio (estructura, ramas, convenciones) | C | I | **A** | R | C | R | I |
| 3 | Auditoría del esquema BD existente | I | I | C | C | **A/R** | C | C |
| 4 | Modelo ER 3FN, JSONB y migraciones | I | I | C | C | **A/R** | I | C |
| 5 | Seguridad a nivel de fila (RLS) | I | I | C | C | **A/R** | C | I |
| 6 | Contrato API REST (OpenAPI) | C | I | **A** | R | C | C | C |
| 7 | Backend: rutas, turnos, registros de tiempo | I | I | C | **A/R** | C | C | C |
| 8 | Backend: motor de cálculo, verificación y aprobación | I | I | C | **A/R** | C | C | I |
| 9 | Frontend: shell SPA, History API, guardas por rol | **A/R** | R | C | I | I | C | I |
| 10 | Frontend: rutas, turnos y supervisión | **A** | R | I | C | I | I | I |
| 11 | Frontend: planillas y pagos | **A** | R | I | C | I | I | I |
| 12 | Autenticación propia y endpoints de sesión | C | I | C | R | C | **A/R** | C |
| 13 | Seguridad OWASP (XSS, CSRF, CSP, secretos) | R | C | C | C | C | **A/R** | I |
| 14 | API móvil y sincronización offline | I | I | **A** | R | C | C | R |
| 15 | App móvil | I | I | I | C | I | C | **A/R** |
| 16 | Pruebas | C | R | C | R | C | **A** | C |
| 17 | CI/CD, entornos y secretos | I | I | C | C | C | **A/R** | I |
| 18 | Documentación técnica | R | C | **A** | R | R | R | C |

### A.3 Matriz RACI ejecutada

Elaborada con base en la participación de cada integrante durante el desarrollo y en el rol asignado. La **R** indica quién realizó el trabajo y la **A**, el responsable del rol que lo aprueba.

| # | Entregable técnico | Samuel | Stefany | Jonatan | Marco | Sofía | Daniel |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Arquitectura, patrones y ADRs | C | I | **A/R** | R | C | C |
| 2 | Integración con el repositorio | R | I | **A** | R | C | C |
| 3 | Auditoría del esquema BD | I | I | C | C | **A/R** | I |
| 4 | Modelo 3FN, JSONB y migraciones | I | I | R | C | **A/R** | C |
| 5 | RLS | I | I | R | C | **A/R** | R |
| 6 | Contrato API REST | C | C | **A/R** | R | C | R |
| 7 | Backend: rutas, turnos, registros | I | C | R | **A/R** | C | C |
| 8 | Backend: cálculo, verificación y aprobación | C | I | C | **A/R** | R | C |
| 9 | Frontend: shell SPA y guardas | **A/R** | R | R | I | I | C |
| 10 | Frontend: rutas, turnos y supervisión | **A** | R | C | C | I | I |
| 11 | Frontend: planillas y pagos | **A/R** | C | C | C | I | I |
| 12 | Autenticación propia y sesión | C | R | R | C | R | **A/R** |
| 13 | Seguridad OWASP | C | I | R | C | C | **A/R** |
| 14 | API móvil y sincronización offline | I | I | **A/R** | R | C | C |
| 15 | App móvil | I | I | **A/R** | C | I | C |
| 16 | Pruebas | C | C | R | R | C | **A/R** |
| 17 | CI/CD y secretos | I | I | R | I | C | **A/R** |
| 18 | Documentación técnica | C | C | **A/R** | R | R | R |
| 19 | Estados del trabajador (CU-03) | I | R | C | **A** | C | R |
| 20 | Emergencias (CU-08) | I | R | R | **A** | I | R |
| 21 | Usuarios, auditoría y permisos (CU-02, CU-14) | R | I | R | I | C | **A/R** |
| 22 | Geocerca de las rutas (CU-04) | I | R | R | **A/R** | R | I |
| 23 | Frontend: parámetros, feriados y tarifas (CU-15) | **A/R** | C | C | C | I | I |

**Cambios respecto al plan**

| Fila | Cambio | Motivo |
| --- | --- | --- |
| 11 | Samuel construyó las pantallas de planillas y pagos | Stefany tenía a su cargo rutas, supervisión, estados, turnos y panel |
| 12 | La autenticación la trabajaron Daniel y Jonatan | Marco se concentró en rutas, turnos y cálculo |
| 15 | La app móvil la desarrolló el líder técnico | El equipo quedó en 6 integrantes |
| 19–23 | Entregables nuevos | Se identificaron al implementar CU-02, CU-03, CU-04, CU-08, CU-14 y CU-15 |

### A.4 Desglose de entregables por integrante

| Integrante | Módulos a su cargo | Sección del documento | Cumplimiento |
| --- | --- | --- | --- |
| Jonatan | Arquitectura y contrato API; app móvil; despliegue en Azure; documentación | A, B.1, B.5, manual | Cumplido |
| Marco | Backend: rutas, asignaciones, turnos, registros, motor de cálculo, aprobación y pagos, geocerca | C.3, E | Cumplido |
| Sofía | Base de datos: 3FN, JSONB, migraciones M002–M012, RLS | D | Cumplido |
| Daniel | Autenticación, sesiones, OWASP, usuarios, estados y emergencias | F | Cumplido |
| Samuel | Shell de la SPA, guardas, planillas y pagos, usuarios, auditoría y parámetros | B.2, B.3 | Cumplido |
| Stefany | Módulos de UI: rutas, supervisión, geocerca, estados, turnos, panel | B.4, C | Cumplido |

---

## B. Justificación de Arquitectura y Patrones

### B.1 Diagrama de arquitectura (contenedores, C4 nivel 2)

```mermaid
flowchart LR
  subgraph Clientes["Clientes"]
    W["Cliente Web (SPA React)<br/>Administradores y Supervisores"]
    M["App Móvil Android<br/>Trabajadores en ruta"]
  end
  subgraph AZ["Azure App Service (Node 22)"]
    subgraph BE["Backend Node.js + Express - API REST /api/v1"]
      GW["Capa HTTP<br/>CORS, cabeceras de seguridad, CSRF, validación"]
      AUTH["Módulo de autenticación propio<br/>bcrypt, JWT, refresh con rotación"]
      SVC["Servicios de dominio<br/>Rutas, Turnos, Registros, Eventos, Planillas, Pagos"]
      CALC["Motor de cálculo de planilla"]
      GW --> AUTH
      GW --> SVC --> CALC
    end
    STATIC["Web compilada (web/dist)<br/>servida por el mismo backend"]
  end
  subgraph SB["Supabase"]
    PG[("PostgreSQL gestionado<br/>3FN + JSONB + RLS activo en las 27 tablas")]
  end
  GH["GitHub Actions<br/>merge a develop: compila y publica"]
  W -- "HTTPS, cookies HttpOnly + CSRF" --> GW
  W -. "carga la SPA (mismo origen)" .-> STATIC
  M -- "HTTPS, Bearer JWT + client_uuid" --> GW
  AUTH -- "perfiles y sesiones_refresh" --> PG
  SVC -- "pool pg con app_user<br/>(sin superusuario, sujeto a RLS)" --> PG
  GH -- "publica backend + web" --> AZ
```

- **Contexto.** Tres actores: *Administrador* (configura, aprueba y paga), *Supervisor* (asigna, supervisa, verifica) y *Trabajador en ruta* (registra su jornada). Azure y Supabase son solo alojamiento: no se usan Supabase Auth, su API REST ni la llave `service_role`.
- **Contenedores.** La **SPA** (React + TypeScript + Vite) la sirve el mismo backend, por lo que web y API comparten origen. La **app Android** (Java) usa la misma API con `Bearer` y guarda los tokens cifrados con el Android Keystore. La **API REST** es la frontera de confianza: valida, autoriza y calcula. **PostgreSQL** aplica RLS como segunda barrera; el backend se conecta con `app_user` (sin superusuario).
- **Componentes de la API.** Controller → Service → Repository; el motor de cálculo es una función pura, probada con casos deterministas.

| Patrón | Dónde | Justificación |
| --- | --- | --- |
| Arquitectura por capas | Backend | Separa transporte, negocio y persistencia; facilita pruebas |
| Máquina de estados | Planilla, registro de tiempo, acuerdo de turno | Transiciones explícitas y auditables |
| Idempotencia (`Idempotency-Key`, `client_uuid`) | Escrituras del móvil | Los reintentos por mala señal no duplican registros |
| Defensa en profundidad | API + RLS | Un fallo de autorización en la API no expone datos |
| Bitácora *append-only* y *snapshot* inmutable | `auditoria`, `planilla_detalle` | Trazabilidad; los montos aprobados no cambian si cambia una tarifa |

### B.2 SPA o MPA

| Criterio | SPA | MPA | Ganador |
| --- | --- | --- | --- |
| Interacción intensiva (tablas, filtros, edición de registros) | Actualiza parcialmente y conserva el contexto | Recarga en cada acción | **SPA** |
| Flujo de planilla en varios pasos | El estado vive en la API; la vista no se reconstruye | Se reconstruye en cada página | **SPA** |
| Reutilizar la API del móvil | Mismo contrato JSON | Requiere además vistas en servidor | **SPA** |
| SEO | Débil | Fuerte | No aplica: es un panel privado con inicio de sesión |
| Carga inicial y superficie XSS | Mayores | Menores | MPA. En un panel interno se acepta la carga inicial; XSS se mitiga con CSP estricta |

**Decisión: SPA.** Los casos de uso son intensivos en interacción, no se necesita SEO y la API REST ya es obligatoria para el móvil.

**Tecnología adoptada:** React 19 + TypeScript + Vite, React Router (History API), Tailwind CSS con componentes shadcn/ui. TanStack Query y Zod, propuestos al inicio, no se adoptaron: un cliente propio (`web/src/lib/api.ts`) maneja sesión, token CSRF y errores, y la validación de seguridad se hace en el backend.

### B.3 Enrutamiento con History API

1. **Rutas limpias** sin `#` (`/planillas`, `/admin/usuarios`) mediante React Router, que usa `pushState`, `replaceState` y `popstate`; el backend devuelve `index.html` para cualquier ruta que no sea un archivo ni `/api/*`, así funcionan los enlaces directos y el refresco.
2. **Estado compartible en la URL:** la planilla seleccionada en Pagos viaja como *query param* (`/pagos?planilla=<id>`), por lo que la vista se puede recargar o enlazar.
3. **Guardas por autenticación y rol** antes de mostrar la vista. Son solo experiencia de usuario: la autorización real está en la API y en RLS.
4. **Nada sensible** en la URL ni en `history.state`.

| Ruta | Vista | Roles |
| --- | --- | --- |
| `/login` | Inicio de sesión | Público |
| `/panel` | Resumen | Admin, Supervisor |
| `/rutas` | Rutas y geocerca | Admin, Supervisor |
| `/turnos` | Asignaciones, turnos y acuerdos | Admin, Supervisor |
| `/supervision` | Registros de tiempo | Admin, Supervisor |
| `/trabajadores` | Estados del trabajador | Admin, Supervisor |
| `/emergencias` | Eventos y emergencias | Admin, Supervisor |
| `/planillas` | Períodos, cálculo, verificación y aprobación | Admin, Supervisor |
| `/pagos` | Pagos | Admin |
| `/admin/usuarios`, `/admin/parametros`, `/auditoria` | Administración | Admin |
| `/cambiar-password` | Cambio de contraseña; obligatoria si es temporal | Autenticado |
| `/403`, `*` | Acceso denegado / no encontrado | Autenticado |

### B.4 Distribución del almacenamiento web

| Mecanismo | Se almacena | **No** se almacena | Justificación |
| --- | --- | --- | --- |
| **Cookies `HttpOnly; SameSite`** (`psis_access`, `psis_refresh`; `Secure` por HTTPS) | Access y refresh token | Datos de negocio | JavaScript no las lee: un XSS no puede robar la sesión |
| **Memoria** (estado de React) | Token CSRF, perfil y rol (`/api/v1/me`), datos de cada pantalla | — | Se pierde al recargar y se vuelve a pedir a la API |
| **`localStorage`** | Solo el tema claro/oscuro (`psis:v1:tema`) | Tokens, nómina, datos personales | Persistente y legible por cualquier script: solo preferencias inocuas |
| **`sessionStorage`** | Nada | Todo | No se necesitó (se explica a continuación) |
| **Caché HTTP** | Nada | Todas las respuestas, incluidos los archivos de la web, llevan `Cache-Control: no-store` | Evita fugas en equipos compartidos; a cambio, los archivos se descargan de nuevo en cada carga |

**Uso de `sessionStorage`.** En el diseño inicial se reservó para guardar borradores del flujo de planilla. Al implementarlo no fue necesario, porque cada paso (calcular, verificar, aprobar y pagar) se guarda como estado en la API y, al recargar, la web consulta el estado vigente. Además, los formularios son cortos y se envían en una sola acción. Al cerrar sesión se ejecuta `sessionStorage.clear()` como medida preventiva.

### B.5 Estructura del repositorio

```text
planilla-sis/
├── Database/          → migrations/ (M002–M012), seeds/ (S001), tests/ (pruebas de RLS)
├── backend/           → API REST: src/modules/<módulo>/ controller, service, repository, routes
├── web/               → SPA (React + TS + Vite); se compila a web/dist y la sirve el backend
├── web-prototipo/     → web anterior; el backend solo la sirve si no existe web/dist
├── mobile/            → App Android (Java)
├── docs/              → este entregable, manual de despliegue, OpenAPI, reglas de cálculo
└── .github/workflows/ → cada merge a develop compila la web y publica en Azure
```

Ramas `main` / `develop` / `feature/*`; todo cambio entra por *pull request* a `develop` con revisión y *squash and merge*; *Conventional Commits*; `docs/openapi.yaml` es la fuente única del contrato entre web, backend y móvil.

---

## C. Análisis de Sistemas e Ingeniería de Requisitos

### C.1 Actores

| Actor | Tipo | Plataforma | Responsabilidades |
| --- | --- | --- | --- |
| **Administrador** | Primario | Web | Usuarios y roles, parámetros de pago, **aprobar planilla**, registrar pagos, auditoría |
| **Supervisor** | Primario | Web | Rutas y asignaciones, acuerdos de turno, supervisar y validar registros, atender emergencias, **verificar planilla** |
| **Trabajador en ruta** | Primario | Móvil | Registrar ingreso, salida, descansos y emergencias; consultar turnos y horas |
| **Módulo de autenticación** | Secundario (interno) | — | Verificar contraseñas, emitir y rotar tokens |
| **Motor de cálculo** | Secundario (interno) | — | Calcular horas y montos de forma determinista |

### C.2 Matriz y diagrama de casos de uso

| ID | Caso de uso | Actor(es) | Prioridad | Plataforma |
| --- | --- | --- | --- | --- |
| CU-01 | Iniciar sesión y verificar rol | Todos | Alta | Web / Móvil |
| CU-02 | Gestionar usuarios y roles | Administrador | Alta | Web |
| CU-03 | Gestionar estado del trabajador | Supervisor, Administrador | Media | Web |
| CU-04 | Crear y gestionar rutas y sus puntos (geocerca) | Administrador, Supervisor | Alta | Web |
| CU-05 | Asignar trabajadores a rutas | Supervisor, Administrador | Alta | Web |
| CU-06 | Proponer y confirmar acuerdos de turno | Supervisor, Administrador, Trabajador | Alta | Web / Móvil |
| CU-07 | Registrar ingreso, salida y descansos | Trabajador | Alta | Móvil |
| CU-08 | Registrar eventos y emergencias, y atenderlos | Trabajador; Supervisor y Administrador atienden | Media | Móvil / Web |
| CU-09 | Supervisar horarios y registros | Supervisor, Administrador | Alta | Web |
| CU-10 | Validar o rechazar registros | Supervisor, Administrador | Alta | Web |
| **CU-11** | **Calcular, verificar y aprobar planilla** | Supervisor, Administrador | **Crítica** | Web |
| CU-12 | Registrar el pago de planilla | Administrador | Alta | Web |
| CU-13 | Consultar mis turnos y horas | Trabajador | Media | Móvil |
| CU-14 | Consultar bitácora de auditoría | Administrador | Media | Web |
| CU-15 | Configurar parámetros de pago | Administrador | Alta | Web |

![Diagrama UML de casos de uso de planilla-sis](diagramas/casos-de-uso.svg)

*Usuario* es un actor abstracto del que heredan Administrador, Supervisor y Trabajador; los tres pueden ejecutar CU-01. CU-11 incluye a CU-10 porque no se puede calcular una planilla mientras haya registros pendientes de validar.

**Fuera de alcance de esta versión**

- **Rechazo de planillas:** una planilla no se rechaza con motivo. Los errores se corrigen antes de verificarla, recalculándola mientras siga `CALCULADA`.
- **Corrección de registros de tiempo:** un registro se aprueba o se rechaza. La base incluye el estado `CORREGIDA` y el cálculo lo acepta, pero ningún endpoint lo asigna.

**Matriz de acceso por rol**

| Acción | Administrador | Supervisor | Trabajador |
| --- | --- | --- | --- |
| Gestionar usuarios | Sí | No | No |
| Rutas y asignaciones | Sí | Solo sus rutas | No |
| Registrar ingreso, descanso o evento | No | No | Sí (propio) |
| Ver y validar registros | Sí | Sus rutas | Ver propios |
| Calcular / **verificar** / **aprobar** planilla | Calcular y **aprobar** | Calcular y **verificar** | No |
| Registrar pago y consultar auditoría | Sí | No | No |

### C.3 Especificación de los casos de uso principales

#### CU-11 · Calcular, verificar y aprobar planilla

| Campo | Descripción |
| --- | --- |
| **Actores** | Supervisor o Administrador (calculan), Supervisor (verifica), Administrador (aprueba); secundario: motor de cálculo |
| **Precondiciones** | Usuario autenticado con rol autorizado; período existente que no esté `CERRADO` ni `PAGADO`; tarifas vigentes para cada trabajador; ninguna jornada del período pendiente de validar o sin salida |
| **Flujo principal** | 1. El supervisor o el administrador selecciona el período y, si corresponde, la ruta; la planilla general (sin ruta) solo la crea el administrador. 2. Ejecuta **Calcular** (`POST /planillas`): en una transacción, el backend lee jornadas, descansos, tarifas y parámetros, calcula horas ordinarias y extra y montos por trabajador, y guarda `planilla_detalle` con el desglose en JSONB; la planilla queda `CALCULADA`. 3. Un supervisor distinto de quien calculó **verifica** y la planilla queda `VERIFICADA`. 4. El administrador **aprueba** con reautenticación e indica el total esperado; la planilla queda `APROBADA` y se guarda `hash_integridad`. 5. Cada transición queda en `auditoria`. |
| **Flujos alternos** | FA-1 hay jornadas pendientes o sin salida: no se calcula, se informa cuáles son y se validan (CU-10). FA-2 se corrige un dato antes de verificar: la planilla se recalcula mientras siga `CALCULADA`. |
| **Excepciones** | `403` sin rol o fuera de su alcance · `409 JORNADAS_PENDIENTES` · `409 SEGREGACION_FUNCIONES` si la misma persona calcula y verifica o aprueba · `409 PLANILLA_NO_RECALCULABLE` si ya no está `CALCULADA` · `409 TOTAL_NO_COINCIDE` si el total esperado cambió · `422 TARIFA_FALTANTE` · fallo de BD: *rollback* completo |
| **Postcondiciones** | Éxito: planilla `APROBADA`, *snapshot* inmutable, habilita CU-12 (pago). Fallo: la transacción se revierte y la planilla queda en su último estado válido. |

```mermaid
stateDiagram-v2
  [*] --> CALCULADA: calcular()
  CALCULADA --> CALCULADA: recalcular()
  CALCULADA --> VERIFICADA: verificar() [supervisor distinto]
  VERIFICADA --> APROBADA: aprobar() [administrador distinto]
  APROBADA --> PAGADA: registrar pago
```

**Reglas de negocio**

- Solo entran las jornadas aprobadas o corregidas; las rechazadas no se pagan.
- Tiempo efectivo = de la hora de inicio contada a la salida, menos el exceso de almuerzo sobre 30 minutos. Las pausas remuneradas cuentan como trabajo.
- La jornada ordinaria es de 8 h (diurna), 7 h (mixta) o 6 h (nocturna); las horas que la exceden se pagan como extra, con el factor definido en los parámetros.
- Los montos se guardan en columnas `NUMERIC`, nunca como punto flotante.
- Calcular, verificar y aprobar deben hacerlo personas distintas (restricción CHECK en la base y validación en la API).
- Una planilla aprobada no se puede modificar: lo impiden triggers en la base (`trg_planillas_inmutable`, `trg_planilla_detalle_inmutable`).

El detalle está en [`docs/reglas-calculo.md`](https://github.com/AgosAnt/planilla-sis/blob/develop/docs/reglas-calculo.md).

#### CU-07 · Registrar ingreso, salida y descansos

| Campo | Descripción |
| --- | --- |
| **Actores** | Trabajador en ruta (app móvil); secundario: GPS del teléfono |
| **Precondiciones** | Sesión iniciada como trabajador; asignación de ruta vigente (CU-05); permiso de ubicación y GPS encendido |
| **Flujo principal** | 1. El trabajador toca *Marcar entrada*. 2. La app lee el GPS y verifica que esté dentro del radio de algún punto de su ruta. 3. Guarda la marca en la cola local (SQLite) con un `client_uuid`. 4. Envía `POST /registros-tiempo/ingreso` con `Idempotency-Key`. 5. El backend verifica asignación, jornada abierta y solapamiento, recalcula la geocerca por su cuenta y responde `201`. 6. La app muestra la jornada en curso. |
| **Flujos alternos** | FA-1 sin conexión: la marca espera en la cola y se envía en orden al volver la red. FA-2 salida: `PATCH /registros-tiempo/{id}/salida`. FA-3 descanso: inicio y fin con su tipo. FA-4 reintento: el servidor reconoce el `client_uuid` y no duplica. FA-5 la ruta no tiene puntos de geocerca: se permite marcar y el supervisor revisa la ubicación al validar. |
| **Excepciones** | Fuera de la geocerca: la app no guarda y muestra la distancia · `422 ASIGNACION_NO_ACTIVA` · `409 REGISTRO_ABIERTO` (la app recupera esa jornada) · `422 SOLAPA_JORNADA_ANTERIOR` · error `5xx`: se reintenta |
| **Postcondiciones** | Éxito: registro `PENDIENTE` de validación con hora del dispositivo, hora de recepción y ubicación; el supervisor lo valida (CU-10). Fallo: la marca no se guarda o queda en la cola con su motivo visible. |

#### CU-01 · Iniciar sesión y verificar rol

| Campo | Descripción |
| --- | --- |
| **Actores** | Administrador y Supervisor (web), Trabajador (app); secundario: módulo de autenticación |
| **Precondiciones** | El administrador creó la cuenta (no hay registro público) y está activa |
| **Flujo principal** | 1. El usuario escribe correo y contraseña. 2. `POST /auth/session`. 3. El backend compara con `bcrypt` (con un hash de relleno si el correo no existe, para no revelar qué correos hay). 4. Firma el access token y guarda el *hash* del refresh en `sesiones_refresh`. 5. La web recibe las cookies `HttpOnly` y el token CSRF; la app recibe los tokens y los cifra con el Keystore. 6. Ambos consultan `GET /me` y muestran la pantalla de su rol. |
| **Flujos alternos** | FA-1 contraseña temporal: todo responde `403 DEBE_CAMBIAR_PASSWORD` hasta cambiarla. FA-2 access vencido: renovación con el refresh (§F.1). FA-3 rol equivocado para la plataforma: la web muestra `/403` y la app indica que es solo para trabajadores. |
| **Excepciones** | `401 CREDENCIALES_INVALIDAS` (mismo mensaje para correo o contraseña) · `423` con bloqueo progresivo de 1 a 15 min tras 5 intentos · refresh reutilizado: se revocan todas las sesiones |
| **Postcondiciones** | Éxito: sesión registrada con IP y dispositivo. Fallo: no hay sesión y el intento suma al contador de la cuenta. |

---

## D. Diseño de Base de Datos Híbrida (PostgreSQL en Supabase)

La base se diseñó para PostgreSQL estándar: las mismas migraciones corren en Supabase y en un PostgreSQL local.

### D.1 Punto de partida y migraciones

El prototipo tenía 6 tablas (`Usuarios`, `Rutas`, `Jornadas`, `Eventos_Ruta`, `Eventos_Descanso`, `Planillas`) con solo datos de prueba. El análisis encontró 21 problemas; los decisivos fueron:

| Problema | Corrección |
| --- | --- |
| Sin credenciales ni sesiones; la app se conectaba como `postgres` con la contraseña en el código | `email` + `password_hash`, tabla `sesiones_refresh`, rol `app_user` sin superusuario |
| `TIMESTAMP` sin zona horaria | Todo en `timestamptz`; el cliente envía UTC (ISO 8601) y se muestra en `America/Guatemala` |
| `ON DELETE CASCADE` borraba el historial de pagos al borrar un usuario | Sin borrado en cascada del historial; baja lógica con `activo` |
| Sin restricciones: varias jornadas abiertas, duplicados por reintentos | Índice único de jornada abierta, `client_uuid` único por trabajador |
| `Planillas` mezclaba período y detalle, sin flujo de aprobación ni pagos | `periodos_planilla`, `planillas`, `planilla_detalle`, `pagos` con segregación de funciones |
| Sin RLS | RLS activo en las 27 tablas |

Se hizo una **reconstrucción limpia** con migraciones SQL versionadas, aplicadas en orden:

| Migración | Contenido |
| --- | --- |
| M002 | `pgcrypto`, rol `app_user`, identidad y auditoría |
| M003 | Rutas, geocerca, asignaciones (sin solapamiento, `btree_gist`) y turnos |
| M004 | Registros de tiempo, descansos y eventos (JSONB) |
| M005 | Tarifas, parámetros, períodos, planillas y pagos |
| M006 | Privilegios mínimos de `app_user` |
| M007 | Estados del trabajador y permisos por rol |
| M008 | RLS en registros y eventos, funciones `app.*` y pruebas por rol |
| M009 | Parámetros de pago y feriados del motor de cálculo |
| M010 | RLS en las 25 tablas restantes |
| M011 | Rotación de refresh tokens y detección de reúso |
| M012 | Validaciones de la geocerca (coordenadas, radio de 10 a 5000 m) |

### D.2 Modelo relacional (3FN)

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
  ASIGNACIONES_RUTA |o--o{ REGISTROS_TIEMPO : "genera"
  PERFILES ||--o{ REGISTROS_TIEMPO : "registra"
  REGISTROS_TIEMPO ||--o{ DESCANSOS : "incluye"
  TIPOS_DESCANSO ||--o{ DESCANSOS : "clasifica"
  PERFILES ||--o{ EVENTOS_DIARIOS : "reporta"
  REGISTROS_TIEMPO |o--o{ EVENTOS_DIARIOS : "contextualiza"
  PERFILES ||--o{ TARIFAS_TRABAJADOR : "percibe"
  PERIODOS_PLANILLA ||--o{ PLANILLAS : "agrupa"
  RUTAS |o--o{ PLANILLAS : "limita"
  PLANILLAS ||--o{ PLANILLA_DETALLE : "detalla"
  PERFILES ||--o{ PLANILLA_DETALLE : "devenga"
  PLANILLA_DETALLE ||--o{ DETALLE_CONCEPTOS : "ajusta"
  CONCEPTOS_PAGO ||--o{ DETALLE_CONCEPTOS : "tipifica"
  PLANILLA_DETALLE ||--o{ PAGOS : "se paga con"
  METODOS_PAGO ||--o{ PAGOS : "medio"
  PERFILES ||--o{ AUDITORIA : "actor de"
  PERFILES ||--o{ SESIONES_REFRESH : "autentica"
```

| # | Tabla | PK | FK principales | Atributos clave / restricciones |
| --- | --- | --- | --- | --- |
| 1 | `roles` | `id smallint` | — | `nombre` UNIQUE |
| 2 | `permisos` | `id smallint` | — | `codigo` UNIQUE (p. ej. `planilla.aprobar`) |
| 3 | `rol_permiso` | (`rol_id`, `permiso_id`) | → roles, permisos | N:M |
| 4 | `perfiles` | `id uuid` | `rol_id` → roles | `email` UNIQUE, `password_hash`, `codigo_empleado` UNIQUE, `documento` UNIQUE, `activo` |
| 5 | `estados_trabajador` | `id smallint` | — | `codigo` UNIQUE (ACTIVO, EN_RUTA, INCAPACIDAD, …) |
| 6 | `historial_estado_trabajador` | `id uuid` | `trabajador_id` → perfiles, `estado_id` → estados_trabajador, `cambiado_por` → perfiles | `inicio_at`, `fin_at`, `motivo`; sin solapamiento por trabajador |
| 7 | `rutas` | `id uuid` | `supervisor_id` → perfiles | `codigo` UNIQUE, `activa` |
| 8 | `ruta_puntos` | `id uuid` | `ruta_id` → rutas | `latitud`, `longitud`, `radio_m` (10–5000) |
| 9 | `asignaciones_ruta` | `id uuid` | → rutas, perfiles | `fecha_inicio`, `fecha_fin`; sin solapamiento por trabajador |
| 10 | `turnos` | `id smallint` | — | `hora_inicio`, `hora_fin`, `es_nocturno` |
| 11 | `acuerdos_turno` | `id uuid` | → asignaciones_ruta, turnos | `fecha`, `estado`; UNIQUE(`asignacion_id`, `fecha`) |
| 12 | `registros_tiempo` | `id uuid` | → perfiles, asignaciones_ruta | `ingreso_at`, `salida_at`, `estado_validacion`, `client_uuid`; CHECK(`salida_at > ingreso_at`) |
| 13 | `tipos_descanso` | `id smallint` | — | `remunerado boolean` |
| 14 | `descansos` | `id uuid` | → registros_tiempo, tipos_descanso | CHECK(`fin_at > inicio_at`) |
| 15 | `eventos_diarios` | `id uuid` | `trabajador_id` → perfiles, `registro_tiempo_id` → registros_tiempo, `atendido_por` → perfiles | `tipo_evento`, `estado_atencion`, `client_uuid`; **JSONB** `payload` |
| 16 | `tarifas_trabajador` | `id uuid` | → perfiles | `monto_hora`, `monto_hora_extra`, `vigente_desde`, `vigente_hasta` |
| 17 | `parametros_pago` | `id smallint` (fila única) | — | Factores de hora extra y nocturna, tolerancia de llegada, regla de redondeo, periodicidad, IGSS laboral, bonificación incentivo, almuerzo pagado, horas máximas por día |
| 18 | `periodos_planilla` | `id uuid` | — | `codigo` UNIQUE, `fecha_inicio`, `fecha_fin`, `estado`; UNIQUE(`fecha_inicio`, `fecha_fin`) |
| 19 | `planillas` | `id uuid` | → periodos_planilla, rutas, perfiles (calcula, verifica, aprueba) | `estado`, `hash_integridad`; CHECK de segregación; UNIQUE(`periodo_id`, `ruta_id`) |
| 20 | `planilla_detalle` | `id uuid` | → planillas, perfiles | horas, montos, **JSONB** `calculo_detalle` |
| 21 | `conceptos_pago` | `id smallint` | — | `codigo` UNIQUE, `tipo` (BONIFICACION / DEDUCCION) |
| 22 | `detalle_conceptos` | `id uuid` | → planilla_detalle, conceptos_pago | `monto` |
| 23 | `metodos_pago` | `id smallint` | — | `nombre` |
| 24 | `pagos` | `id uuid` | → planilla_detalle, metodos_pago, `registrado_por` → perfiles | `monto_pagado`, `referencia_transaccion`, `estado`, `pagado_at`; un solo pago procesado por detalle |
| 25 | `auditoria` | `id bigint` | `actor_id` → perfiles | **JSONB** `datos_antes`, `datos_despues`, `contexto` |
| 26 | `sesiones_refresh` | `id uuid` | → perfiles, → sí misma (`reemplazado_por`) | `token_hash` UNIQUE, `familia_id`, `expira_at`, `revocado_at`, `ip`, `user_agent` |
| 27 | `feriados` | `fecha` | — | Días de asueto para el cálculo (M009) |

**Justificación de 3FN**

- **1FN:** todos los atributos son atómicos; los descansos se registran en su propia tabla.
- **2FN:** en las tablas con clave compuesta ningún atributo depende solo de una parte de la clave.
- **3FN:** los catálogos evitan repetir descripciones y no hay dependencias transitivas, salvo las excepciones siguientes.
- **Excepciones deliberadas:** `planilla_detalle` guarda los totales calculados para que un cambio de tarifa posterior no modifique pagos ya aprobados; `auditoria.actor_rol` conserva el rol que la persona tenía en ese momento; `eventos_diarios` guarda `trabajador_id` porque un evento puede no tener jornada, y la API verifica que la jornada indicada sea del mismo trabajador.

### D.3 Componente NoSQL: JSONB

Los datos que entran al cálculo del pago están en columnas tipadas; JSONB se usa para lo que varía según el tipo de evento o la acción y cambia más rápido que el esquema.

| Tabla.columna | Uso | Formato |
| --- | --- | --- |
| `eventos_diarios.payload` | Datos variables de cada evento del móvil | Objeto JSON (CHECK `jsonb_typeof = 'object'`), versionado con `esquema_version`, índice GIN |
| `planilla_detalle.calculo_detalle` | Desglose del cálculo: jornadas, minutos y alertas | Objeto JSON generado por el motor de cálculo |
| `registros_tiempo.dispositivo` | Dispositivo que hizo la marca y desfase con la hora del servidor | Objeto JSON |
| `auditoria.datos_antes` / `datos_despues` | Estado anterior y nuevo del registro | Objetos JSON. La columna `contexto` (JSONB) queda reservada para datos adicionales |

Ejemplo de `payload` de una emergencia enviada desde la app:

```json
{ "origen": "boton_emergencia", "precision_m": 12.5 }
```

Reglas: la API exige que `payload` sea un objeto de hasta 32 KB y limita el lote a 100 eventos y 256 KB; la web muestra el contenido siempre como texto, nunca como HTML (XSS).

### D.4 Políticas de Seguridad a Nivel de Fila (RLS)

RLS está **activo en las 27 tablas** y es la segunda barrera después de la autorización de la API. El backend usa un único rol, `app_user` (`NOSUPERUSER`, no es dueño de las tablas), y en cada transacción declara quién es el usuario con los *claims* ya verificados de su JWT:

```sql
select set_config('app.jwt_claims', '{"sub":"5b1c…","rol":"supervisor"}', true);
```

Las políticas los leen con funciones definidas en M008 y M010: `app.usuario_actual()` (equivalente propio a `auth.uid()` de Supabase), `app.rol_actual()`, `app.supervisa_trabajador(id)` y `app.gestiona_ruta(id)`. La llave `service_role` y el rol `postgres` de Supabase saltan RLS: la aplicación no los usa. Las migraciones las aplica el DBA con el rol `postgres`, desde el editor SQL.

| Tabla | Trabajador | Supervisor | Administrador |
| --- | --- | --- | --- |
| `perfiles` | SELECT su fila | SELECT de los trabajadores | SELECT, INSERT, UPDATE |
| `roles`, `permisos`, `rol_permiso`, `estados_trabajador`, `tipos_descanso`, `turnos`, `metodos_pago`, `conceptos_pago` | SELECT | SELECT | SELECT |
| `feriados` | SELECT | SELECT | SELECT, INSERT, DELETE |
| `parametros_pago` | SELECT | SELECT | SELECT, UPDATE |
| `historial_estado_trabajador` | SELECT propio | SELECT, INSERT, UPDATE de sus trabajadores | SELECT, INSERT, UPDATE |
| `rutas` | SELECT | SELECT; INSERT y UPDATE de las que supervisa | SELECT, INSERT, UPDATE |
| `ruta_puntos` | SELECT | SELECT; ALL de las rutas que gestiona | ALL |
| `asignaciones_ruta` | SELECT propias | SELECT, INSERT, UPDATE de sus rutas | SELECT, INSERT, UPDATE |
| `acuerdos_turno` | SELECT propios; aceptar o rechazar | SELECT, INSERT, UPDATE de sus asignaciones | SELECT, INSERT, UPDATE |
| `registros_tiempo` | SELECT propios; INSERT en `PENDIENTE`; UPDATE mientras siga `PENDIENTE` | SELECT, UPDATE de sus trabajadores | ALL |
| `descansos` | SELECT e INSERT en sus registros | SELECT de sus trabajadores | ALL |
| `eventos_diarios` | SELECT e INSERT propios | SELECT, UPDATE de sus trabajadores | SELECT, UPDATE |
| `tarifas_trabajador` | SELECT propia | SELECT de sus trabajadores | SELECT, INSERT, UPDATE |
| `periodos_planilla` | Sin acceso | SELECT, UPDATE | SELECT, INSERT, UPDATE |
| `planillas` | Sin acceso | SELECT, INSERT, UPDATE | SELECT, INSERT, UPDATE |
| `planilla_detalle`, `detalle_conceptos` | SELECT propio | ALL | ALL |
| `pagos` | SELECT propios | Sin acceso | SELECT, INSERT, UPDATE |
| `auditoria` | INSERT de sus acciones | INSERT de sus acciones | SELECT; INSERT de sus acciones |
| `sesiones_refresh` | ALL de las propias | ALL de las propias | ALL de las propias |

En `planillas` y `planilla_detalle`, RLS permite el acceso por rol; la restricción por ruta y las transiciones de estado las valida la API. Ningún rol tiene política de UPDATE o DELETE sobre `auditoria`. En `tarifas_trabajador`, RLS permite al trabajador leer su fila, pero la API no lo expone: consultar tarifas responde `403` y la app solo muestra horas, sin montos. El supervisor las necesita porque calcula planillas.

Ejemplo (`registros_tiempo`):

```sql
create policy rt_trabajador_select on public.registros_tiempo
  for select to app_user
  using (app.rol_actual() = 'trabajador' and trabajador_id = app.usuario_actual());

create policy rt_supervisor_update on public.registros_tiempo
  for update to app_user
  using      (app.rol_actual() = 'supervisor' and app.supervisa_trabajador(trabajador_id))
  with check (app.rol_actual() = 'supervisor' and app.supervisa_trabajador(trabajador_id));
```

**Verificación en Supabase:** `pg_class` muestra las 27 tablas con `relrowsecurity = true`; las pruebas de `Database/tests/M008_pruebas_rls.sql` fijan los *claims* de cada rol en `registros_tiempo` y `eventos_diarios`, y comprueban lo permitido, lo denegado y que un supervisor no ve datos de rutas ajenas.

---

## E. Especificación de la API REST (Contrato de Interfaz)

El contrato completo está en [`docs/openapi.yaml`](https://github.com/AgosAnt/planilla-sis/blob/develop/docs/openapi.yaml) (OpenAPI 3.1).

### E.1 Convenciones

| Aspecto | Convención |
| --- | --- |
| Base y formato | `/api/v1`, `application/json; charset=utf-8` |
| Auth web | Cookies `HttpOnly` (`psis_access`, `psis_refresh`) + `X-CSRF-Token` en métodos que modifican |
| Auth móvil | `Authorization: Bearer <JWT>` |
| Idempotencia | `Idempotency-Key: <uuid>` en las escrituras del móvil y en pagos |
| Errores | `application/problem+json`: `{ type, title, status, detail, code, instance }` |
| Fechas y dinero | ISO 8601 en UTC; dinero como cadena decimal (`"1234.50"`) |

**Códigos:** `200`/`201`/`204` éxito · `207` resultado por elemento · `400` petición inválida · `401` no autenticado · `403` sin permiso · `404` no existe o no visible · `409` conflicto de estado · `413` lote demasiado grande · `422` regla de negocio · `423` cuenta bloqueada · `429` demasiadas peticiones · `500` error del servidor.

### E.2 Matriz de endpoints principales

Todas las rutas parten de `/api/v1`. En el payload, `?` indica un campo opcional. Los errores se responden en `application/problem+json` (§E.1).

| Verbo | Ruta | Rol | Cabeceras requeridas | Payload JSON (entrada) | Éxito | Errores |
| --- | --- | --- | --- | --- | --- | --- |
| `POST` | `/auth/session` | Público | `Content-Type` | `{ email, password }` | `200` | `400`, `401`, `423`, `500` |
| `POST` | `/auth/refresh` | Con refresh token | Web: cookie de refresh. Móvil: `Content-Type`, `X-Client-Type: mobile` | Web: sin cuerpo. Móvil: `{ refresh_token }` | `200` | `401`, `409`, `500` |
| `POST` | `/auth/logout` | Autenticado | Web: cookie + `X-CSRF-Token`. Móvil: `Authorization` | Sin cuerpo | `204` | `401`, `403`, `500` |
| `GET` | `/me` | Autenticado | Cookie o `Authorization` | Sin cuerpo | `200` | `401`, `500` |
| `POST` | `/admin/usuarios` | Administrador | Cookie + `X-CSRF-Token` + `Content-Type` | `{ email, nombres, apellidos, rol, codigo_empleado, documento }` | `201` | `400`, `401`, `403`, `409`, `422`, `500` |
| `GET` | `/rutas` | Autenticado | Cookie o `Authorization` | Sin cuerpo; `?page&page_size` | `200` | `400`, `401`, `500` |
| `PUT` | `/rutas/{id}/puntos` | Supervisor, Admin | Cookie + `X-CSRF-Token` + `Content-Type` | `{ puntos: [{ nombre, latitud, longitud, radio_m }] }` | `200` | `400`, `401`, `403`, `404`, `500` |
| `POST` | `/rutas/{id}/asignaciones` | Supervisor, Admin | Cookie + `X-CSRF-Token` + `Content-Type` | `{ trabajador_id, fecha_inicio, fecha_fin?, turno_id }` | `201` | `400`, `401`, `403`, `404`, `409`, `422`, `500` |
| `POST` | `/registros-tiempo/ingreso` | Trabajador | `Authorization` + `Idempotency-Key` + `Content-Type` | `{ client_uuid, asignacion_id, ingreso_at, ubicacion?, dispositivo? }` | `201` (`200` si es reintento) | `400`, `401`, `403`, `409`, `422`, `500` |
| `PATCH` | `/registros-tiempo/{id}/salida` | Trabajador | `Authorization` + `Idempotency-Key` + `Content-Type` | `{ salida_at, ubicacion? }` | `200` | `400`, `401`, `403`, `404`, `409`, `422`, `500` |
| `PATCH` | `/registros-tiempo/{id}/validacion` | Supervisor, Admin | Cookie + `X-CSRF-Token` + `Content-Type` | `{ estado_validacion, observaciones? }` | `200` | `400`, `401`, `403`, `404`, `409`, `422`, `500` |
| `POST` | `/eventos:batch` | Trabajador | `Authorization` + `Idempotency-Key` + `Content-Type` | `{ eventos: [{ client_uuid, tipo_evento, esquema_version, ocurrido_en, registro_tiempo_id?, latitud?, longitud?, payload? }] }` | `207` | `400`, `401`, `403`, `413`, `500` |
| `POST` | `/planillas` | Supervisor, Admin | Cookie + `X-CSRF-Token` + `Content-Type` | `{ periodo_id, ruta_id? }` | `201` | `400`, `401`, `403`, `404`, `409`, `422`, `500` |
| `POST` | `/planillas/{id}/calcular` | Supervisor, Admin | Cookie + `X-CSRF-Token` | Sin cuerpo | `200` | `400`, `401`, `403`, `404`, `409`, `422`, `500` |
| `POST` | `/planillas/{id}/verificar` | Supervisor | Cookie + `X-CSRF-Token` + `Content-Type` | `{ observaciones, excepciones_revisadas? }` | `200` | `400`, `401`, `403`, `404`, `409`, `422`, `500` |
| `POST` | `/planillas/{id}/aprobar` | Administrador | Cookie + `X-CSRF-Token` + `X-Reauth-Token` + `Content-Type` | `{ total_esperado, comentario? }` | `200` | `400`, `401`, `403`, `404`, `409`, `500` |
| `POST` | `/planillas/{id}/pagos` | Administrador | Cookie + `X-CSRF-Token` + `X-Reauth-Token` + `Idempotency-Key` + `Content-Type` | `{ metodo_id, fecha_pago, pagos: [{ detalle_id, monto, referencia? }] }` | `201` | `400`, `401`, `403`, `404`, `409`, `422`, `500` |
| `DELETE` | `/admin/feriados/{fecha}` | Administrador | Cookie + `X-CSRF-Token` | Sin cuerpo | `204` | `400`, `401`, `403`, `404`, `500` |

### E.3 Contratos de los endpoints vitales

#### `POST /auth/session` (inicio de sesión)

Entrada: `{ "email": "supervisor@empresa.com", "password": "********" }`

Respuesta `200` para la web (los tokens se envían únicamente en `Set-Cookie`):

```json
{
  "user": { "id": "5b1c…", "email": "supervisor@empresa.com", "nombres": "Ana", "apellidos": "López", "rol": "supervisor", "debe_cambiar_password": false },
  "csrf_token": "b7f0c1…",
  "expira_en": 900
}
```

Con `X-Client-Type: mobile` la respuesta incluye además `access_token` y `refresh_token`. `401` usa el mismo mensaje sin importar si el correo existe.

#### `POST /registros-tiempo/ingreso` (marcar entrada)

Entrada:

```json
{
  "client_uuid": "0d3f4c1e-…",
  "asignacion_id": "c2a9f0f4-…",
  "ingreso_at": "2026-09-21T13:00:12Z",
  "ubicacion": { "lat": 14.6349, "lng": -90.5069, "precision_m": 9 }
}
```

Respuesta `201`: `{ "id": "e17b…", "estado_validacion": "PENDIENTE", "dentro_de_geocerca": true }`; `turno` y `dentro_de_geocerca` solo vienen cuando aplican. Un reintento idéntico responde `200` con el registro original, sin duplicarlo. `409` si ya hay una jornada abierta o el `client_uuid` se usó con otros datos; `422` si no hay asignación activa.

#### `POST /planillas/{id}/aprobar` (aprobar planilla)

Requiere la cabecera `X-Reauth-Token`, que entrega `POST /auth/reauth` al volver a ingresar la contraseña. Sin ella responde `403 REAUTENTICACION_REQUERIDA`.

Entrada (`comentario` es opcional): `{ "total_esperado": "184230.75", "comentario": "Aprobada quincena 1" }`

Respuesta `200`:

```json
{ "id": "8c11…", "estado": "APROBADA", "aprobada_por": "f2b0…", "aprobada_at": "2026-09-16T11:02:31Z", "hash_integridad": "9c1f…" }
```

`409 TOTAL_NO_COINCIDE` si el total esperado no coincide con el de la planilla; `409 SEGREGACION_FUNCIONES` si quien aprueba calculó o verificó.

---

## F. Plan de Seguridad y Mitigaciones OWASP

### F.1 Sesiones y autenticación

**Integración con Supabase.** La base de datos está en Supabase, pero la autenticación se implementó en el backend en lugar de usar Supabase Auth, por estas razones:

1. **Tokens fuera del alcance de JavaScript.** El SDK de Supabase Auth guarda el JWT en `localStorage` o en cookies legibles por JavaScript; aquí la web usa cookies `HttpOnly` emitidas por nuestro dominio y el móvil usa `Bearer`, con un solo contrato.
2. **Altas controladas:** sin registro público; el administrador crea cada cuenta con contraseña temporal y el rol del sistema viaja en el token.
3. **Reglas propias:** bloqueo progresivo, reautenticación para aprobar y pagar, revocación de sesiones y auditoría en nuestra tabla.
4. **Portabilidad:** el mismo código corre contra un PostgreSQL local sin Supabase.

**Las dos cookies**

| Cookie | Contiene | Vida | Viaja a | Atributos |
| --- | --- | --- | --- | --- |
| `psis_access` | JWT firmado (`sub`, `email`, `rol`, `jti`, `iss`, `aud`) | **15 min** | Todo `/` | `HttpOnly; SameSite=Lax`; `Secure` por HTTPS |
| `psis_refresh` | Token aleatorio (en la base solo su *hash*) | **7 días**, se reinician en cada renovación | Solo `/api/v1/auth` | `HttpOnly; SameSite=Strict`; `Secure` por HTTPS |

El access es corto porque viaja en cada petición y el servidor no lo consulta en la base; solo revisa en memoria si su sesión ya se cerró. El refresh es largo, pero casi nunca viaja, se reemplaza en cada uso (rotación) y se puede revocar.

```mermaid
sequenceDiagram
  autonumber
  participant N as Navegador (SPA)
  participant API as API (módulo Auth)
  participant DB as sesiones_refresh
  N->>API: POST /auth/session (correo, contraseña)
  API->>DB: INSERT sesión A (hash de R1, expira en 7 días)
  API-->>N: Set-Cookie psis_access=AT1 (15 min, Path=/) y psis_refresh=R1 (7 días, Path=/api/v1/auth)
  loop Mientras AT1 esté vigente
    N->>API: GET/POST /api/v1/... (envía solo psis_access + X-CSRF-Token)
    API-->>N: 200 (verifica firma y exp, sin consultar sesiones_refresh)
  end
  Note over N,API: AT1 vence
  N->>API: GET /api/v1/... con AT1 vencido
  API-->>N: 401
  N->>API: POST /auth/refresh (el navegador envía psis_refresh=R1)
  API->>DB: R1 vigente → A queda reemplazada por B (hash de R2)
  API-->>N: Set-Cookie psis_access=AT2 y psis_refresh=R2 (los 7 días vuelven a contar)
  N->>API: repite la petición con AT2
  API-->>N: 200
  alt Otra pestaña renovó con R1 hace menos de 30 s
    N->>API: POST /auth/refresh con R1
    API-->>N: 409 REFRESH_CONCURRENTE (la cookie nueva ya está en el navegador: repite la petición)
  else Alguien usa R1 después (copia robada)
    N->>API: POST /auth/refresh con R1 ya reemplazado
    API->>DB: posible robo: revoca TODAS las sesiones del usuario y lo registra en auditoria
    API-->>N: 401 REFRESH_REUTILIZADO: hay que volver a iniciar sesión
  end
  Note over N,DB: Pasan 7 días sin renovar → refresh vencido → 401 → login
  N->>API: POST /auth/logout
  API->>DB: revoca la sesión (revocado_at) y el backend deja de aceptar su access
  API-->>N: borra las dos cookies
```

**Renovación automática.** La web y la app móvil renuevan la sesión de la misma forma: cuando reciben un `401`, llaman a `/auth/refresh` y repiten la petición una vez. Si varias peticiones de la web reciben `401` al mismo tiempo, comparten una sola renovación.

| Tema | Decisión |
| --- | --- |
| Contraseñas | `bcrypt` (costo 10); mínimo 12 caracteres; bloqueo progresivo de 1 a 15 min tras 5 fallos |
| Firma | JWT HS256 con `JWT_SECRET` en variables de entorno; se verifican firma, `exp`, `iss` y `aud` |
| Refresh | Solo su *hash* en `sesiones_refresh`; rotación en cada uso; reúso = revocar todas las sesiones |
| Operaciones críticas | Aprobar planilla y registrar pago piden reautenticación con contraseña (token de un solo uso, válido 5 min) |
| Revocación | Cerrar sesión revoca esa sesión; cambiar la contraseña revoca todas las del usuario. La baja y el cambio de rol se aplican al renovar: el access vigente sigue válido hasta su vencimiento (máximo 15 min) y un usuario dado de baja ya no puede renovar |
| Móvil | Tokens cifrados con el Android Keystore; al no usar cookies, CSRF no aplica |
| MFA (TOTP) | Diferido a una fase posterior; la reautenticación cubre las acciones de mayor impacto |

### F.2 Matriz de mitigación

| Amenaza | Vector | Mitigación |
| --- | --- | --- |
| **XSS** | Nombres, observaciones y `payload` JSONB mostrados a supervisores; parámetros de la URL | React escapa por defecto; no se usa `innerHTML` ni `dangerouslySetInnerHTML`; JSONB se muestra como texto; validación y longitud máxima en la API; CSP estricta sin `unsafe-inline` |
| **Robo de sesión por XSS** | Script inyectado | Cookies `HttpOnly`; ningún token en `localStorage`; refresh revocable |
| **CSRF** | Las cookies viajan solas | `SameSite=Lax/Strict`; token HMAC por sesión en `X-CSRF-Token` para toda escritura autenticada con cookie; web y API en el mismo origen, sin CORS en producción (lista blanca configurable con `CORS_ORIGINS`); ninguna mutación por `GET` |
| **Secretos** | Credenciales de BD, `JWT_SECRET` | Solo en variables de entorno de Azure y secretos de GitHub; `.env` ignorado por Git; `app_user` sin superusuario; `service_role` de Supabase nunca en la app, la web ni el repositorio; ningún secreto con prefijo `VITE_` |
| **Control de acceso roto (IDOR)** | Cambiar IDs en la URL | Autorización por rol y pertenencia en la API + RLS; IDs `uuid` |
| **Inyección SQL** | Filtros y cuerpos | Consultas parametrizadas con `pg`; los valores del usuario siempre van como parámetros y solo se interpolan fragmentos fijos definidos en el código |
| **Fuerza bruta** | Login y reautenticación | Bloqueo progresivo desde el 5.º intento fallido, con `Retry-After`; mismo mensaje para correo o contraseña incorrectos |
| **Integridad de la planilla** | Alterar una planilla aprobada | Triggers de inmutabilidad, `hash_integridad`, segregación de funciones con CHECK |
| **Dependencias vulnerables** | npm | Revisión con `npm audit` y actualización de dependencias; `package-lock.json` versionado |
| **Clickjacking** | `iframe` | `frame-ancestors 'none'` y `X-Frame-Options: DENY` |

**Cabeceras aplicadas** (`backend/src/middlewares/seguridad.js`):

```http
# Web
Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'
# API
Content-Security-Policy: default-src 'none'; frame-ancestors 'none'
# Todas las respuestas
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
Referrer-Policy: no-referrer
Cache-Control: no-store
Strict-Transport-Security: max-age=15552000  (solo por HTTPS)
```
