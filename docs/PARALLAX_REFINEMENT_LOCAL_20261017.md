# Profundidad del menú — entrega del 17 de octubre de 2026

Destino autorizado: GitHub main, sobre `1ba10e9`, por petición posterior de Kaleb. Preparado y servido en `127.0.0.1:5234`; incluye el rediseño de opciones/carrito. La subida del código, la publicación del sitio y la revisión visual son evidencias separadas; no confundir esta revisión con el recibo de la publicación anterior.

## Referencia y dirección

Kaleb pidió una sensación de parallax más profesional y aportó [Delassus](https://delassus.com/en/). Se consultó la página y su código público `javascripts/app.js`/`stylesheets/app.css`: incluye WebGL/Three.js, GSAP, control de scroll suavizado y reglas de parallax. El navegador de Work sigue deshabilitado, así que **no se recorrió visualmente ni se afirma haber reproducido sus interacciones**. La adaptación usa la biblioteca ya instalada y conserva la identidad/fotografías de Estrella Eats; no copia código, activos ni añade esas dependencias.

Momento principal: las fotografías cruzan sus marcos a otra velocidad que el texto fijo del catálogo. La pose depende de su posición individual dentro de la pantalla. Navegación conectada, pasos y carrito conservan sus rutas. Al agregar, el marco confirma con color durante 380 ms; se elimina la ampliación del artículo completo, sin mover los controles.

## Implementación y presupuesto

- `ScrollDepthGroup local` activa el comportamiento únicamente en el catálogo del menú. La proyección anterior compartía una pose para toda la sección; ahora usa geometría de cada foto, altura de sección y viewport. La posición visual equivalente produce la misma pose en un menú corto o largo.
- Un registro por sección comparte ResizeObserver e IntersectionObserver entre las fotos. Geometría de layout sin transformaciones medida al registrar/redimensionar; no se lee el DOM desde cada actualización de scroll. La altura usa el mismo viewport de layout que la biblioteca de scroll. Al desaparecer una tarjeta, se retira del registro; al desmontar, se eliminan observadores y listeners.
- Movimiento vertical limitado al menor de 18 px o 7.5% de la altura; puntero limitado por el tamaño de la imagen, hasta 4 px. Desaceleración sin rebote mediante el resorte existente. Inclinación por velocidad limitada a 0.3 grados; perspectiva sólo dentro de la foto, hasta 1.4 grados con mouse. Texto, controles y documento conservan sus posiciones de layout.
- El marco reserva espacio interior para scroll/puntero y conserva `object-fit:contain`. No se amplían ni recortan deliberadamente las fotografías/promos para crear el efecto. Pausa decorativa fuera del margen de observación de 120 px o con documento oculto; las fuentes de movimiento conservan suscripciones para funcionar al reaparecer.
- Fuentes leídas incondicionalmente antes de comprobar visibilidad: se verificó el contrato real de `useComputed` de Framer instalado, que descubre dependencias durante render. Evita que una foto inicialmente fuera de pantalla quede sin suscribirse al scroll. No hay React setState por cuadro, RAF propio permanente, scroll artificial, WebGL, nuevas fotos ni nuevas consultas.
- El resto de consumidores de `ParallaxMedia` conserva el modo de sección anterior; el resorte del puntero comparte la nueva desaceleración. La identidad/logo y la geometría de navegación conectada no se modifican.

## Evidencia y pendientes

ESLint pertinente, TypeScript y build Vite/PWA aprobados durante la revisión. Veinticuatro pruebas tipadas aprobadas: cuatro nuevas de proyección individual/seguridad geométrica/reversibilidad, seis de viaje y agregados, cuatro de producto configurado, cuatro de opciones y seis de sucursales. El ajuste final del viewport se comprobó con TypeScript. Módulos servidos HTTP 200 y flags locales verificados. Persisten avisos de tamaño de chunks; no se añadieron dependencias para ocultarlos.

Falta verificar visualmente a 320/390/1280 px, scroll de ida/vuelta, mouse y categoría/sucursal sobre el código nuevo. La herramienta devuelve «Local browser use is disabled in Work settings». Código, HTTP y pruebas matemáticas no prueban fluidez física, foco, gestos o recorte final; no hay medición de FPS/CPU/batería ni garantía de costo cero. No se presenta una captura anterior como evidencia del nuevo efecto. Kaleb autorizó subir esta revisión a GitHub aun con esta comprobación visual pendiente.

Respaldos privados: `.codex/private-backups/eats-parallax-refinement-20261017`; incluye las fuentes anteriores, logs y código público de referencia. Base de datos, checkout, opciones, precios, WABA, backend y APK no cambian.
