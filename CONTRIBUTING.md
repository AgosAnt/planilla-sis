# Guía de contribución

Reglas de trabajo para el repositorio `planilla-sis`. Leer completo antes de hacer el primer commit.

## 1. Estructura del repositorio

```text
planilla-sis/
├── backend/            API REST (Node.js + Express)
├── Database/           Esquema y migraciones
├── mobile/             App móvil (Android)
├── web/                SPA (se crea cuando se valide el stack)
├── docs/               Entregable, ADRs (docs/adr) y contrato (docs/openapi.yaml)
└── .github/            Plantilla de PR y flujos de CI
```

## 2. Cómo trabajar con ramas (introducción)

Piensa en las ramas como copias paralelas del proyecto. Así nadie rompe el trabajo de los demás.

| Rama | Para qué sirve | ¿Se trabaja directo? |
|---|---|---|
| `main` | Versión estable. Solo recibe cambios desde `develop`. | No |
| `develop` | Aquí se juntan todos los cambios ya revisados. | No |
| `feature/*` | Tu espacio para una funcionalidad nueva. | Sí |
| `fix/*` | Tu espacio para corregir un error. | Sí |

**Nombres de ramas:** minúsculas y guiones, con el prefijo según el tipo.
Ejemplos: `feature/auth-login`, `fix/sync-movil-secuencial`.

### Flujo diario, paso a paso

```bash
# 1. Parte siempre de develop actualizado
git checkout develop
git pull origin develop

# 2. Crea tu rama
git checkout -b feature/nombre-corto

# 3. Trabaja y guarda cambios en commits pequeños
git status
git add archivo1 archivo2
git commit -m "feat(backend): agrega endpoint POST /auth/session"

# 4. Sube tu rama
git push -u origin feature/nombre-corto
```

5. En GitHub, abre un **Pull Request** hacia `develop` y completa la plantilla.
6. Espera la revisión. Si te piden cambios, haz nuevos commits en la misma rama y vuelve a hacer `git push`.
7. Cuando se apruebe, se integra con **Squash and merge** y se borra la rama.
8. Vuelve a empezar desde el paso 1.

### Mantener tu rama al día

Si `develop` avanzó mientras trabajabas:

```bash
git fetch origin
git merge origin/develop
```

Si Git reporta conflictos, abre los archivos marcados en Visual Studio Code, elige qué código se queda, guarda, y ejecuta `git add` y `git commit`. Si no estás seguro de qué conservar, pregunta antes de decidir.

### Reglas ! 

- Nunca hagas `push` directo a `main` ni a `develop`.
- Nunca uses `git push --force` en ramas compartidas.
- Una rama, un propósito. No mezcles cambios que no tienen relación.
- Antes de `git add`, revisa `git status`. Nunca uses `git add .` sin mirar qué incluye.

## 3. Commits (Conventional Commits)

Formato: `tipo(alcance): descripción`. El tipo va en inglés y la descripción en español, en imperativo y sin punto final.

| Tipo | Uso |
|---|---|
| `feat` | Funcionalidad nueva |
| `fix` | Corrección de un error |
| `docs` | Documentación |
| `refactor` | Cambio interno sin alterar el comportamiento |
| `test` | Pruebas |
| `chore` | Tareas de mantenimiento |
| `ci` | Integración continua |
| `security` | Correcciones o mejoras de seguridad |

Alcances: `backend`, `web`, `mobile`, `db`, `docs`.

Ejemplos:
- `feat(backend): agrega endpoint POST /auth/session`
- `fix(mobile): envía la cola de sincronización de forma secuencial`
- `docs: agrega ADR-001 de autenticación propia`

## 4. Pull Requests

- Siempre hacia `develop`.
- Mínimo **1 revisión** aprobada antes de integrar.
- Los PR que toquen autenticación, sesiones, secretos o permisos requieren la revisión de **Jonatan o Daniel**.
- Completa la lista de verificación de seguridad de la plantilla. Si un punto no aplica, márcalo y explica por qué.
- PR pequeños y enfocados se revisan más rápido.

## 5. Secretos y configuración

- El archivo `.env` **nunca** se sube al repositorio. Se publica `.env.example` sin valores.
- Ninguna variable sensible puede llevar los prefijos `VITE_`, `NEXT_PUBLIC_` ni `REACT_APP_`.
- Si subes un secreto por error, avisa de inmediato: hay que cambiarlo y limpiar el historial.
- Instala el hook de pre-commit de detección de secretos que entregará Daniel.

## 6. Base de datos

- Cada integrante usa su propia base PostgreSQL local. No se comparte una base de desarrollo.
- Los cambios de esquema se hacen solo mediante migraciones versionadas.
- Las consultas siempre van parametrizadas. Nunca concatenes SQL.

## 7. Contrato de la API

`docs/openapi.yaml` es la fuente única de verdad entre web, backend y móvil. Si cambias un endpoint, actualizas el contrato en el mismo PR.

## 8. Primeros pasos (backend)

### 8.1 Base de datos local

1. Crea una base vacía en tu PostgreSQL (por ejemplo `planilla_sis_dev`, desde pgAdmin o con `createdb`).
2. Aplica las migraciones M002 a M008 en orden, con un usuario administrador. Ver `Database/migrations/README.md`.
3. Asigna una contraseña local a `app_user`: `ALTER ROLE app_user WITH PASSWORD '...';`
4. Carga los datos de prueba con una contraseña de al menos 12 caracteres para los usuarios de prueba:
   `psql -v ON_ERROR_STOP=1 -v password='...' -1 -d planilla_sis_dev -f Database/seeds/S001_datos_desarrollo.sql`
   Crea `admin@local.test`, `supervisor@local.test` y `trabajador@local.test`.

### 8.2 Backend

1. Actualiza tu copia: `git checkout develop` y `git pull origin develop`.
2. Instala las dependencias: entra a `backend/` y ejecuta `npm ci` (instala exactamente las versiones de `package-lock.json`).
3. Copia `backend/.env.example` a `backend/.env`.
4. Completa `backend/.env`:
   - `DATABASE_URL`: tu base local conectando como **`app_user`**, no como `postgres` (un superusuario se salta la RLS y no pruebas lo real).
   - `JWT_SECRET`: genera el tuyo con `node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"`. **No se comparte**: cada integrante tiene su propia base y su propio secreto.
   - `JWT_ISSUER=planilla-sis` y `JWT_AUDIENCE=planilla-sis-api` (iguales para todo el equipo; no son secretos).
5. Arranca el servidor desde `backend/` con `node index.js`. En la consola debe aparecer "Servidor corriendo en http://localhost:3000".
6. Prueba el login: `POST http://localhost:3000/api/v1/auth/session` con `{"email": "trabajador@local.test", "password": "<la del paso 8.1.4>"}`.

Si falta `DATABASE_URL` o alguna variable `JWT_*`, el servidor se detiene con un mensaje de error: es lo esperado.