# Descubrimiento de restaurantes con Mapbox

Fecha: 15 de octubre de 2026. Entrega inicialmente revisada en la rama
`codex/mapbox-home-20261015` de `Commitplusx/restaurantes-estrella`.
Kaleb autorizó después integrar este cambio a `main`. La integración de Git
y el despliegue de Vercel se verifican por separado; un push no confirma que
la web publicada ya sirva la nueva versión.

## Alcance

La vista existente «Cerca de mí» y el control de ubicación de escritorio usan
`RestaurantMap`. Esta superficie deja de cargar el SDK y el geocodificador de
Google. Conserva las coordenadas del catálogo, la ubicación GPS solicitada por
el usuario y las rutas existentes de los menús.

- Mapbox `light-v11` con tema gris y calles legibles; atribución conservada.
- Agrupación GeoJSON con radio de 90 px. Al tocar un grupo, se amplía el mapa y
  se listan sus restaurantes, incluso cuando comparten coordenadas.
- Logo y estado de horario real en los marcadores. El nombre del marcador sólo
  aparece al seleccionarlo o enfocarlo para reducir cruces.
- Tarjetas horizontales en móvil y lista lateral en escritorio. No se agregan
  distancias, calificaciones o tiempos de entrega estimados.
- Dimensiones explícitas del contenedor y `ResizeObserver` para evitar la vista
  gris causada por una altura de mapa igual a cero.
- Apertura limitada a 12 segundos y reintento manual. Si el proveedor falla,
  permanece disponible la lista de restaurantes.

## Archivos y configuración

`src/pages/PublicLandingPage.tsx` integra el componente. La presentación y los
marcadores viven en `src/components/RestaurantMap.tsx`,
`src/components/EatsMap.css` y `src/lib/eatsMapTheme.ts`.

Se utiliza la configuración pública de Mapbox existente; no se incluyen claves
ni archivos de entorno. `@types/geojson` se declara como dependencia de
desarrollo. No se cambian funciones, permisos, tablas ni credenciales del
backend.

## Validación local

- `npm run build`: TypeScript y compilación de producción aprobados.
- ESLint de `RestaurantMap.tsx` y `eatsMapTheme.ts`: aprobado.
- Navegador con catálogo real: mapa cargado, grupos expandibles y enlace de menú
  de Pollo Robins correcto.
- Revisión a 320×568, 390×844 y 1280×800, sin desbordamiento horizontal.
- Comprobación geométrica del grupo expandido observado: ningún cruce entre
  marcadores visibles con margen de ocho píxeles. Esta observación no garantiza
  separación universal en cualquier distribución o nivel de zoom.

La compilación conserva avisos previos sobre tamaño de paquetes, Browserslist
y `eval` dentro de la dependencia `lottie-web`; no impiden compilar.

Esta entrega cubre la vista del mapa. El rediseño de la APK, paneles de
restaurantes y otros cambios de seguridad en curso tienen su propia entrega.
