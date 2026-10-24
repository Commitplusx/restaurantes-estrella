# Estrella Eats — propuesta de logo, 24 de octubre de 2026

Propuesta generada y aprobada por Kaleb. Integración en la web autorizada después: logo horizontal compartido y estrella para iconos. Maestro PNG RGBA con fondo transparente, 2172 × 724 px. Es una imagen raster, no un archivo vectorial.

## Paleta de referencia

Fuente: DESIGN.md y src/components/desktopLanding.css del frontend actual. Son los colores base de la web, no una certificación de uniformidad de todos los activos históricos.

| Función | Color |
| --- | --- |
| Naranja principal | #EA4E25 |
| Negro de texto/marca | #1D1D1F |
| Blanco | #FFFFFF |
| Fondo gris claro | #F5F5F7 |
| Líneas | #E8E8ED |
| Naranja oscuro de interacción | #BD3818 |

El icono histórico estrella-icon-512.png tiene fondo rojo y queda conservado como activo anterior, sin referencias en las rutas web actualizadas. Algunas superficies usan variantes #FA4A0C y #D63B17. Los códigos anteriores son la referencia de diseño; una generación raster no sustituye la definición exacta de tintas o curvas de un maestro vectorial.

## Entregable

- design/brand/estrella-eats-logo-propuesta-20261024.png
- Marca: estrella de cinco puntas con corte que sugiere avance; wordmark horizontal en minúsculas, negro/naranja.
- Generado con la herramienta integrada image_gen; sin CLI ni clave de API. Texto revisado: «estrella eats». Transparencia y dimensiones comprobadas con Pillow, sin editar el archivo.
- El usuario respondió «sí» y después «ponlo en la web»: integración mediante `src/components/BrandLogo.tsx`. No modifica la APK nativa.

## Activos de la web

`public/brand` contiene el wordmark transparente en WebP lossless a 360 × 120 (~12 KB) y 720 × 240 (~38 KB), la estrella transparente a 192/512 px y un icono maskable de 512 px con fondo blanco y margen seguro. URLs nuevas `v2` para evitar reutilizar el logo histórico del caché. Se conserva el PNG original.

La estrella aislada se generó con `image_gen`, tomando el logo aprobado como referencia. Maestro local `design/brand/estrella-eats-mark-propuesta-20261024.png`. Prompt de extracción:

```text
Precise asset extraction from the supplied Estrella Eats logo. Produce ONLY the orange star emblem from the LEFT side of the reference image, completely remove the wordmark and all letters. Keep that exact star silhouette, proportions, rounded tips and diagonal negative-space cut; do not redesign or invent a different symbol. Center the isolated star on a square transparent canvas with 16% clear padding around it, preserving the original orange. Flat clean edges, no shadows, no border, no circle, no additional graphic or text. Transparent background. This will be used for browser favicon and mobile app icon.
```

Las variantes de distribución se redimensionaron/convirtieron con FFmpeg; no se sustituyó el dibujo por una aproximación SVG. El icono maskable se compone sobre blanco, sin convertir transparencias en negro. El componente define dimensiones y `srcSet`, nombre accesible y variante de estrella, sin nuevas dependencias ni descargas externas.

## Integración y entrega

Inicio móvil/PC y footer, bienvenida, menú y skeleton, carrito, páginas informativas y footer, mapa de descubrimiento, aviso PWA, recibo/fallback de seguimiento y acceso/panel de restaurantes. Iconos de notificación del panel y manifiesto PWA/favicon actualizados. Las fotos y logos propios de restaurantes se conservan.

Build TypeScript/Vite y ESLint pertinente aprobados; las páginas heredadas conservan su deuda previa de tipos. Tres capturas automáticas a 390 × 844 (bienvenida/carrito) y 1280 × 900 (beneficios) revisadas: logo legible, proporciones completas y sin error de ejecución. Auditoría 94/100 conserva la limitación heredada de zoom del viewport; no se declara accesibilidad global completa. El primer intento no cargó porque el servidor local había terminado: se restableció y se conservaron los reportes fallidos. La confirmación posterior sí mostró las páginas y logo correctos. Icono maskable revisado separadamente.

GitHub main `32eaec5` confirmado por lectura del remoto, por petición de Kaleb. Comprobación HTTP posterior del dominio: el entry JS referencia el wordmark nuevo y `/brand/estrella-eats-v2-360.webp` devuelve 200, tipo `image/webp` y SHA256 idéntico al archivo revisado. El nombre del entry productivo difiere del build local: no se afirma igualdad global de los bundles. Recorrido visual/interactivo de producción pendiente. Evidencia privada `logo-*` en `.codex-tmp/eats-performance-20261024` del workspace principal. El aviso autorizado al dispatcher no se envió: SSH agotó conexión y Work informa acceso al navegador desactivado. No hubo pedidos, OTP, cambios de servidor ni otros envíos a clientes.

## Prompt final

```text
Use case: logo-brand.
Create one polished new logo proposal for "estrella eats", a local food-ordering and delivery platform in Comitán, Mexico. This is a newly designed brand logo, not a UI mockup.
Output a single clean horizontal logo lockup on a truly transparent background, with generous clear margins, high resolution, suitable for a website header and future packaging. Icon on the left, wordmark on the right, visually balanced. No presentation board, no alternate versions or decorative captions.
Design the symbol as a distinctive five-point star with soft geometric corners and a subtle forward sense of motion. Bold simple silhouette that remains recognizable at app-icon size. Orange #EA4E25, perhaps a clever small negative-space cut, but the shape must remain unmistakably a star. No circle badge, no utensils, scooters, location pins or food mascots.
Wordmark exact text: "estrella eats" all lowercase, spelled correctly. Custom-looking contemporary rounded geometric sans, inspired by Outfit, confident heavy weight, carefully crafted letterforms and optical spacing. "estrella" in near-black #1D1D1F, "eats" in orange #EA4E25. A modest word gap keeps both words united as a brand.
Flat solid colors and crisp vector-like edges. Minimal, friendly, highly professional, distinctive and readable. No gradients, shadows, bevels, 3D, glow, textures, photography, watermarks, extra text or tagline. Background must be transparent, not a white rectangle or checkerboard baked into the art.
```

