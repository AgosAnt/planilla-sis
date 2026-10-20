# Web de planilla-sis

Aplicación web (SPA) para administradores y supervisores. Usa React, TypeScript, Vite, Tailwind CSS v4 y shadcn/ui.

## Requisitos

- Node.js 18 o superior.
- Backend local corriendo en `http://localhost:3000` (ver `CONTRIBUTING.md`, sección 8).

## Instalación

```
npm ci
```

## Desarrollo

1. En una terminal, levanta el backend desde `backend/`:

```
npm run dev
```

2. En otra terminal, desde `web/`:

```
npm run dev
```

3. Abre `http://localhost:5173`. Vite reenvía las peticiones de `/api` al backend en el puerto 3000, así que la web y la API quedan en el mismo origen y la cookie de sesión funciona sin CORS.

Usuarios de prueba: `admin@local.test`, `supervisor@local.test` y `trabajador@local.test`, con la contraseña que usaste al cargar el seed. Los trabajadores usan la aplicación móvil, por lo que la web les muestra "Acceso denegado".

## Compilación de producción

```
npm run build
```

Genera `web/dist/`. El backend sirve esa carpeta en `http://localhost:3000`; si no existe, usa `web-prototipo/`.

## Antes de abrir un pull request

```
npm run build
npm run lint
```

## Reglas de seguridad

- Sin tokens en `localStorage` ni `sessionStorage`.
- Prohibido `innerHTML` y `dangerouslySetInnerHTML`.
- Ninguna variable sensible con prefijo `VITE_`.