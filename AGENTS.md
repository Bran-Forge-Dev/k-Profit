# K-Profit

POS/sistema de control para negocio de comida. Sitio estático puro:
HTML + Tailwind (CDN) + Supabase JS (CDN). Sin build, sin package.json.

## Servir en local

```bash
npx serve .          # o: python -m http.server 8000
```

No abrir con `file://` — las rutas relativas y la sesión lo requieren servido por HTTP.

## Entornos (demo / prod)

Definidos en `JS/supabase-config.js` (`ENVIRONMENTS`). La selección, en orden:

1. `?env=demo` o `?env=prod` en la URL — override manual, persiste en
   `localStorage` (`kprofit_env`) y **solo se respeta en localhost**.
2. `HOST_ENV` — mapa dominio → entorno (agregar URLs de Netlify/Vercel ahí).
3. Hostname que contenga `demo` → demo.
4. Default → `prod`.

`window.APP_ENV` y `window.APP_CONFIG` quedan disponibles en todas las páginas.

En modo demo, `index.html` muestra el botón "Explorar Demo sin registro"
(auth.js) que entra con `APP_CONFIG.demoEmail/demoPassword`.

## Backend

- Un solo proyecto Supabase; tablas con prefijo `dev_`, multi-tenant por
  columna `user_id` + RLS.
- El entorno **demo comparte el proyecto de prod**: es solo un usuario más
  (`demo@kprofit.app`) cuyos datos quedan aislados por RLS. Las credenciales
  del proyecto se toman del bloque `prod` en `supabase-config.js`.
- `supabase/setup.sql`: Sección A = drop + esquema + RLS (**destructivo,
  borra todos los datos**); Sección B = datos semilla para el UUID que
  se pegue en `uid` (correrla por usuario).
- **Licencias**: tabla `perfiles` con `fecha_vencimiento`. Un trigger crea
  perfil de +30 días a cada usuario nuevo de Auth. `obtenerUsuario()`
  (en `supabase-config.js`, compartida por todas las páginas) bloquea
  acceso si la fecha ya pasó. Renovar = UPDATE a la fecha en el dashboard.
- `supabase/perfiles.sql`: migración standalone para agregar licencias a
  un proyecto existente (equivalente a la parte de perfiles de setup.sql).

## Convenciones de commits

- Conventional Commits: `feat:`, `fix:`, `docs:`, `chore:`, `refactor:`, etc.
- Sin footer "Generated with Devin" ni `Co-Authored-By`.

## Pendiente para activar la demo

- [ ] Correr `supabase/setup.sql` Sección A en el SQL Editor (borra y recrea las tablas)
- [ ] Crear el usuario demo en Authentication > Users (Auto Confirm)
- [ ] Correr Sección B con el UUID del usuario demo
- [ ] Ajustar `demoEmail`/`demoPassword` en `ENVIRONMENTS.demo`
- [ ] Desplegar el sitio demo (hostname con "demo" lo detecta solo)
