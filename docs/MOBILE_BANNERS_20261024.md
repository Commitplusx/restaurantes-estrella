# Banners móviles — 24 de octubre de 2026

## Estado

Entrega autorizada a GitHub main el 24 de octubre: candidato posterior a `9a8c31b`, incluido con las mejoras de textos y prioridad de marcas hasta `5ba8179`. Despliegue efectivo en Vercel pendiente de comprobar. Vista normal local: `http://127.0.0.1:5262/`, build de producción. No modifica banners reales, SQL, checkout, worker, WhatsApp ni APK.

**Ampliación solicitada: parallax al cambiar.** Posterior al candidato `708e95f`: transición direccional por planos en lugar de trasladar una tira completa. Confirmada visualmente la transición automática entre los dos banners reales en una captura de traza a 320 px. Siete pruebas tipadas y build aprobados; incluida en esta entrega a main. Verificación conjunta antes de subir: diecinueve pruebas de carrusel, imágenes, prioridad y promociones aprobadas.

## Presentación y contenido

- `MobileLandingCarousel.tsx` conserva la ruta existente del hero móvil/tablet. Las campañas activas aparecen primero; la foto de descubrimiento de Estrella permanece como última diapositiva y como contenido cuando no hay campañas.
- Marco de arte 16:9 con `object-fit: contain`, radio uniforme de 16 px, título y subtítulo/destino fuera de la imagen. Se retira el recorte de la esquina de 48 px y la altura fija de 220/380 px, que dejaba aire excesivo en tablet. El arte publicado termina completo: durante el cambio se reduce hasta 90% y se desplaza hasta 4%, sin ampliarlo sobre el marco. La fotografía de descubrimiento conserva además parallax de scroll.
- Separación de 12 px y vista parcial del siguiente banner. En teléfono el bloque se acerca al margen exterior; tablet conserva su columna. La ficha y el espacio de controles reservan altura tanto en la foto de descubrimiento como en campañas, reduciendo cambios de composición al llegar los datos.
- El texto comercial procede de `titulo`/`subtitulo`; no se interpreta HTML. Sólo un `link_url` existente habilita la tarjeta enlazada y el icono de destino. Los dos banners actuales no tienen enlace; se presentan sin inventarles un destino.
- Se conserva el feed público existente: hasta cinco campañas activas, ordenadas por `orden`/fecha, más la foto de descubrimiento. No cambia la consulta ni su política de caché.

## Navegación y carga

- Deslizamiento horizontal con separación respecto al desplazamiento vertical; un gesto de cambio impide abrir accidentalmente el enlace. Flechas de teclado y controles anterior/siguiente de 44 px.
- Contador y progreso compacto. Avance automático cada 6.5 segundos; se pausa por interacción, foco, salida de pantalla y pestaña oculta. El control de pausa pertenece al carrusel, no añade un selector de reducción de animaciones de la web.
- La selección usa identidad estable de campaña: una actualización/reordenación conserva la actual; si se elimina, se selecciona la primera vigente. Elementos fuera de la selección quedan `inert` y ocultos para lectores de pantalla.
- Se montan la diapositiva actual, la siguiente vista parcial y, sólo durante la transición, una saliente: como máximo tres planos. En reposo son dos. Un nuevo gesto sustituye el snapshot saliente y el cierre de una revisión anterior no puede retirar la actual; no se acumulan salidas con pulsaciones rápidas. `CatalogImage` conserva transformación pública acotada y un intento al original si falla. Si tampoco carga el original, se muestra un error de imagen y el texto real del banner; el enlace sigue disponible.
- Sin dependencias nuevas ni cambios al hero de escritorio.

### Movimiento de cambio

La tarjeta cruza en 580 ms; la imagen se mueve en sentido relativo opuesto y termina en 660 ms, y el texto recorre una distancia menor como primer plano, con 45 ms de desfase. La salida termina antes que la entrada. Son transformaciones y opacidad mediante Framer Motion existente; no se animan dimensiones, no se clona una imagen de alta resolución para decoración ni se añaden blur, canvas o filtros.

El último→primero y el sentido inverso utilizan el mismo desplazamiento de una tarjeta que cualquier cambio. Se elimina el recorrido de todas las tarjetas intermedias. Durante la transición la vista parcial se oculta y reaparece al concluir. Los planos saliente y de vista parcial permanecen `inert`; el cambio por teclado desde un enlace conserva el foco en el enlace nuevo sin desplazar la página.

## Nuevos artes

Recomendación: **1600 × 900 px (16:9)**, preferiblemente WebP optimizado. Mantener título, precios y condiciones separados del borde; el radio del contenedor afecta las esquinas. No incorporar texto diminuto: el arte se verá a unos 264–374 px de ancho en teléfonos comunes.

Se aceptan imágenes cuadradas/verticales a través del contrato actual: se ven completas dentro del marco horizontal, con margen lateral. Eso no las convierte automáticamente en un arte diseñado para móvil. El banner conserva sus proporciones originales y su texto.

## Verificación

- Build TypeScript/Vite y ESLint de los componentes nuevos/aplicables aprobados, sin añadir `any` ni supresiones.
- Siete pruebas tipadas actuales: conservación de campaña tras refrescar, retirada/estado inicial, movimiento circular, sustitución de una transición en curso, revisión anterior incapaz de retirar la actual, sentido inverso/selección sin cambio y transformaciones seguras de `CatalogImage`. La comprobación anterior del helper de imágenes se sustituye por el contrato de snapshot único del nuevo render por planos.

```powershell
deno test --sloppy-imports --config tests/deno.web.json tests/landingCarousel_test.ts tests/catalogImage_test.ts
```

- Dos rondas acotadas de capturas automáticas Lighthouse/Edge: datos reales a 390 px, varias campañas a 320 px y formato vertical a 768 px. Inspeccionados arte completo, vecino visible, textos, controles y transición automática. Ajuste entre rondas: reserva de ficha/controles de descubrimiento y muestra 16:9 explícita.
- Las dos campañas reales respondieron HTTP 200 en la confirmación final. La primera ejecución agotó el plazo de diez segundos y conservó su reporte de fallo; una lectura HTTP independiente respondió 200 en 1.13 s. No se cambió la configuración ni se introdujeron reintentos ilimitados para ocultarlo.
- Auditorías de foco oculto y tamaño de objetivos aprobadas. El aviso global heredado de instalación PWA conserva una advertencia de contraste ajena al banner; no se declara cumplimiento global de accesibilidad.
- Estas capturas usan un servidor DEV y red/CPU sin simulación (`throttling-method=provided`): no son medidas de rendimiento de producción, ni una prueba táctil física. Work mantiene desactivado el control interactivo. Pendientes gesto real, enlaces y pausa/reanudación en iPhone/Android.

Ampliación parallax: build y ESLint pertinentes aprobados. Capturas automáticas a 390 px con muestras y 320 px con banners reales; se inspeccionaron cinco fotogramas de la traza durante la transición (antes, entrada, cruce, llegada y reposo). Sin error de ejecución; auditorías de foco oculto y objetivos táctiles aprobadas, con la advertencia PWA de contraste heredada. El reporte de muestras terminó justo al iniciar el cambio y no se presenta como una secuencia completa; la traza real sí contiene el movimiento. Comportamiento inverso, interrupciones y foco ejercitados por contratos/inspección de código, pendientes de prueba física. Delta del chunk de inicio respecto al candidato sin parallax: ~0.56 KB gzip de JS y ~0.07 KB gzip de CSS, sin afirmar FPS ni batería en un teléfono real.

## Vista de desarrollo

Con `npm run dev -- --port 5263 --strictPort`, `/banners` muestra los datos reales; `?muestra=varios`, `vertical`, `texto` o `vacio` presentan muestras locales etiquetadas. `BannerDesignPreview.tsx` y el diagrama SVG 16:9 sólo se importan con `import.meta.env.DEV`. Confirmado que sus marcadores no aparecen en los assets del build de producción. No es un segundo feed ni una función comercial publicada.

Evidencia privada: `C:/Users/Kaleb/Desktop/pollo-robins-panel/.codex-tmp/eats-performance-20261024/`, archivos `banners-*`, `banner-real-transition-*`, `banner-build.log` y `banner-parallax-build.log`. No subir reportes crudos con URLs de API.
