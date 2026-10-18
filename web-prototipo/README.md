# Web: prototipo navegable

> **Prototipo temporal.** Cubre lo mínimo para demostrar la arquitectura de la web (sección B del entregable) y
> **se reemplaza por la web definitiva** que construyen Samuel y Stefany con el stack que validen (B.2 propone
> React + TypeScript + Vite). No es la base de la web final: tomen lo que sirva como referencia.

## Cómo verlo

El backend sirve esta carpeta en el mismo origen que la API, así que la cookie de sesión funciona sin CORS:

1. Levanta el backend (`backend/`, ver CONTRIBUTING §8) con la base que tiene M002–M008 y el seed S001.
2. Abre `http://localhost:3000` e inicia sesión con `admin@local.test` o `supervisor@local.test` y la contraseña que usaste en el seed.

No requiere build ni dependencias: HTML, CSS y JavaScript con módulos ES.

## Qué demuestra

| Punto | Dónde |
|---|---|
| Maquetación HTML5/CSS3 | `index.html` (header, nav, main, footer), `css/estilos.css` con tema claro y oscuro |
| SPA con History API (B.3) | `js/router.js`: `pushState`/`replaceState`, `popstate`, enlaces `data-link`, guardas por sesión y rol, `?siguiente=` sin open redirect. El backend devuelve `index.html` en cualquier ruta que no sea `/api`, para que funcionen los deep links y el refresco |
| Estado (B.4) | `js/estado.js`: preferencias en `localStorage` con prefijo `psis:v1:` (tema y filas por página); sesión en la cookie `psis_access` (HttpOnly, SameSite=Lax), que JavaScript no lee; perfil y token CSRF solo en memoria, rehidratados desde `/me` y `/auth/csrf` |
| Consumo de la API | `js/api.js`: `fetch` con `credentials` y `X-CSRF-Token` en escrituras. Vistas: login, panel, listado paginado de rutas desde PostgreSQL, detalle (baja y reactivación) y alta de rutas |
| XSS (F.2) | `js/dom.js`: todo se construye con `createElement` y texto; nunca `innerHTML`. La CSP de la web no permite scripts ni estilos en línea |

## Lo que queda para la web definitiva

- Diseño visual, componentes reutilizables, responsive y accesibilidad completos.
- Vistas de supervisión, turnos, planillas, pagos, administración de usuarios y auditoría (mapa de rutas de B.3).
- Router del framework con carga diferida y aviso al salir de formularios con cambios sin guardar.
- `sessionStorage` para borradores y pasos de asistentes, y limpieza completa al cerrar sesión.
- Manejo de errores y estados de carga en toda la interfaz.
