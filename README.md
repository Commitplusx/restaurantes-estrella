# Estrella Eats — web pública y portal de restaurantes

React, TypeScript y Vite. Publica el catálogo, menú, carrito, verificación por WhatsApp y seguimiento del pedido; también contiene el portal autenticado de restaurantes.

Repositorio oficial: [Commitplusx/restaurantes-estrella](https://github.com/Commitplusx/restaurantes-estrella). Sitio: [estrella-eats.mx](https://estrella-eats.mx). Proyecto Vercel: `deiffs-projects/restaurantes-estrella`, rama productiva `main`.

## Leer antes de modificar

La arquitectura central está en la raíz de **Loyalty**, en [`arquitectura_sistema_v2.md`](https://github.com/Commitplusx/loyalty-estrella/blob/main/arquitectura_sistema_v2.md); su título interno es v3. No crear otro motor de pedidos, asignación o transiciones desde esta web. La guía de este repositorio complementa esa arquitectura con rutas y operación del frontend.

- [Guía de la web, contratos y preparación del trabajo de backend](docs/GUIA_WEB.md).
- [Menú de restaurante](docs/MENU_DESIGN_20261012.md).
- [Carrito y transiciones entre pasos](docs/CART_REDESIGN_LOCAL_20261012.md).
- [Mapbox: dirección, pin y límites](docs/MAPBOX_CART_20261012.md).
- [Promociones y selección del menú](docs/PROMOCIONES_MENU_2026-10-06.md).
- [Actualizaciones de la PWA y categorías](docs/WEB_UPDATES_2026-10-12.md).
- [Beneficios, documentos legales y navegación](docs/PUBLIC_INFO_DESIGN_20261012.md).

## Desarrollo

Usar las versiones bloqueadas en `package-lock.json`:

```sh
npm ci
npm run dev -- --port 5196
npm run build
npm run preview -- --port 5197
```

`npm run build` ejecuta TypeScript y genera `dist/` con la PWA. El servidor de desarrollo permite revisar el diseño; para comprobar cambios de versión del service worker se necesita la compilación y el preview.

## Configuración

Configurar `.env.local` y las variables equivalentes en Vercel. Consultar los contratos de cada integración antes de cambiar sus valores.

| Variable | Uso |
| --- | --- |
| `VITE_SUPABASE_URL` | Proyecto Supabase compartido con Loyalty |
| `VITE_SUPABASE_ANON_KEY` | Clave pública del cliente, sujeta a las políticas del servidor |
| `VITE_MAPBOX_ACCESS_TOKEN` | Token público del mapa del carrito |
| `VITE_MAPBOX_PERMANENT_GEOCODING` | `true` sólo si la cuenta permite guardar los resultados de búsqueda |
| `VITE_MAPBOX_STYLE_URL` | Estilo opcional de Mapbox; existe un estilo predeterminado |

Las variables `VITE_` terminan en el navegador. Nunca colocar claves `service_role`, tokens privados de WhatsApp ni contraseñas en ellas. Los valores y archivos `.env` no pertenecen a GitHub. El resto de las pantallas que todavía usa Google Maps requiere su revisión independiente; el cambio a Mapbox cubre el selector del carrito.

## Verificación y publicación

Compilar, revisar los archivos cambiados con ESLint y probar las rutas afectadas en PC/móvil. El lint global conserva deuda previa: un lint de archivos concretos no certifica todo el repositorio.

Un commit subido a `main` dispara Vercel, pero **push no significa publicado**. Comprobar que el despliegue correspondiente esté Ready y que el dominio público cargue esa versión. Supabase, worker/VPS y APK se despliegan por separado; este repositorio no publica esos servicios.

El aviso de nueva versión requiere haber cargado previamente la versión que lo incorpora. Detecta la activación de la PWA existente y permite recargar; conserva un recordatorio si se pospone. La acción se bloquea en carrito, login y portal. No se modificó el ciclo de cachés ni el registro push.
