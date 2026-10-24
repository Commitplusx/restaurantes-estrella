# Banners móviles — 24 de octubre de 2026

## Estado

Candidato local posterior a main `9a8c31b`, sin subir a GitHub ni publicar. Vista normal: `http://127.0.0.1:5262/`, build de producción local. No modifica banners reales, SQL, checkout, worker, WhatsApp ni APK.

## Presentación y contenido

- `MobileLandingCarousel.tsx` conserva la ruta existente del hero móvil/tablet. Las campañas activas aparecen primero; la foto de descubrimiento de Estrella permanece como última diapositiva y como contenido cuando no hay campañas.
- Marco de arte 16:9 con `object-fit: contain`, radio uniforme de 16 px, título y subtítulo/destino fuera de la imagen. Se retira el recorte de la esquina de 48 px y la altura fija de 220/380 px, que dejaba aire excesivo en tablet. El arte publicado no recibe zoom ni recorte; la fotografía de descubrimiento conserva parallax.
- Separación de 12 px y vista parcial del siguiente banner. En teléfono el bloque se acerca al margen exterior; tablet conserva su columna. La ficha y el espacio de controles reservan altura tanto en la foto de descubrimiento como en campañas, reduciendo cambios de composición al llegar los datos.
- El texto comercial procede de `titulo`/`subtitulo`; no se interpreta HTML. Sólo un `link_url` existente habilita la tarjeta enlazada y el icono de destino. Los dos banners actuales no tienen enlace; se presentan sin inventarles un destino.
- Se conserva el feed público existente: hasta cinco campañas activas, ordenadas por `orden`/fecha, más la foto de descubrimiento. No cambia la consulta ni su política de caché.

## Navegación y carga

- Deslizamiento horizontal con separación respecto al desplazamiento vertical; un gesto de cambio impide abrir accidentalmente el enlace. Flechas de teclado y controles anterior/siguiente de 44 px.
- Contador y progreso compacto. Avance automático cada 6.5 segundos; se pausa por interacción, foco, salida de pantalla y pestaña oculta. El control de pausa pertenece al carrusel, no añade un selector de reducción de animaciones de la web.
- La selección usa identidad estable de campaña: una actualización/reordenación conserva la actual; si se elimina, se selecciona la primera vigente. Elementos fuera de la selección quedan `inert` y ocultos para lectores de pantalla.
- Sólo se preparan imágenes de la diapositiva actual y sus dos vecinas: como máximo tres, incluso con cinco campañas. `CatalogImage` conserva transformación pública acotada y un intento al original si falla. Si tampoco carga el original, se muestra un error de imagen y el texto real del banner; el enlace sigue disponible.
- Sin dependencias nuevas ni cambios al hero de escritorio.

## Nuevos artes

Recomendación: **1600 × 900 px (16:9)**, preferiblemente WebP optimizado. Mantener título, precios y condiciones separados del borde; el radio del contenedor afecta las esquinas. No incorporar texto diminuto: el arte se verá a unos 264–374 px de ancho en teléfonos comunes.

Se aceptan imágenes cuadradas/verticales a través del contrato actual: se ven completas dentro del marco horizontal, con margen lateral. Eso no las convierte automáticamente en un arte diseñado para móvil. El banner conserva sus proporciones originales y su texto.

## Verificación

- Build TypeScript/Vite y ESLint de los componentes nuevos/aplicables aprobados, sin añadir `any` ni supresiones.
- Seis pruebas tipadas: conservación de campaña tras refrescar, retirada/estado inicial, movimiento circular, presupuesto de imágenes y transformaciones seguras de `CatalogImage`.

```powershell
deno test --sloppy-imports --config tests/deno.web.json tests/landingCarousel_test.ts tests/catalogImage_test.ts
```

- Dos rondas acotadas de capturas automáticas Lighthouse/Edge: datos reales a 390 px, varias campañas a 320 px y formato vertical a 768 px. Inspeccionados arte completo, vecino visible, textos, controles y transición automática. Ajuste entre rondas: reserva de ficha/controles de descubrimiento y muestra 16:9 explícita.
- Las dos campañas reales respondieron HTTP 200 en la confirmación final. La primera ejecución agotó el plazo de diez segundos y conservó su reporte de fallo; una lectura HTTP independiente respondió 200 en 1.13 s. No se cambió la configuración ni se introdujeron reintentos ilimitados para ocultarlo.
- Auditorías de foco oculto y tamaño de objetivos aprobadas. El aviso global heredado de instalación PWA conserva una advertencia de contraste ajena al banner; no se declara cumplimiento global de accesibilidad.
- Estas capturas usan un servidor DEV y red/CPU sin simulación (`throttling-method=provided`): no son medidas de rendimiento de producción, ni una prueba táctil física. Work mantiene desactivado el control interactivo. Pendientes gesto real, enlaces y pausa/reanudación en iPhone/Android.

## Vista de desarrollo

Con `npm run dev -- --port 5263 --strictPort`, `/banners` muestra los datos reales; `?muestra=varios`, `vertical`, `texto` o `vacio` presentan muestras locales etiquetadas. `BannerDesignPreview.tsx` y el diagrama SVG 16:9 sólo se importan con `import.meta.env.DEV`. Confirmado que sus marcadores no aparecen en los assets del build de producción. No es un segundo feed ni una función comercial publicada.

Evidencia privada: `C:/Users/Kaleb/Desktop/pollo-robins-panel/.codex-tmp/eats-performance-20261024/`, archivos `banners-*` y `banner-build.log`. No subir reportes crudos con URLs de API.
