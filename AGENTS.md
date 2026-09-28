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
- `supabase/demo-setup.sql` Sección B: datos semilla para el usuario demo
  (requiere pegar su UUID). Sección A es solo referencia de esquema.

## Convenciones de commits

- Conventional Commits: `feat:`, `fix:`, `docs:`, `chore:`, `refactor:`, etc.
- Sin footer "Generated with Devin" ni `Co-Authored-By`.

## Pendiente para activar la demo

- [ ] Crear el usuario demo en Authentication > Users (Auto Confirm)
- [ ] Correr `supabase/demo-setup.sql` Sección B con su UUID
- [ ] Ajustar `demoEmail`/`demoPassword` en `ENVIRONMENTS.demo`
- [ ] Desplegar el sitio demo (hostname con "demo" lo detecta solo)
