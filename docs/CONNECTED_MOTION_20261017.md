# Movimiento conectado — 17 de octubre de 2026

Estado: implementado y comprobado en local y en el build de producción, preparado sobre `main a180019`. La publicación y sus recibos se verifican por separado; este documento no declara un despliegue de Supabase o APK.

La ampliación conserva blanco, Outfit, naranja Estrella, fotos reales y movimiento completo obligatorio. No altera compra, disponibilidad, sucursales, precios, datos privados ni servicios del servidor.

## Dirección y presupuesto

- Momento principal: la fotografía viaja desde la tarjeta hasta la identidad del menú y vuelve al catálogo al regresar. La navegación empieza inmediatamente; la capa visual no retiene clics, foco ni respuestas de red.
- Continuidad: al pasar la presentación del restaurante, la barra superior presenta su foto, nombre y sucursal. Categorías usan la altura real de esa barra, sin animar el layout ni recalcularlo por cuadro.
- Confirmación: el vuelo al carrito nace de un incremento real en el store. Incluye primer producto y selección con opciones; no se dispara al abrir detalles, cancelar, reducir cantidades o rechazar un cambio de sucursal.
- Presupuesto: Framer Motion existente, transform/opacity, imágenes ya cargadas, hasta tres vuelos simultáneos, esperas visuales con vencimiento, limpieza por ruta/resize/pestaña oculta y ningún bucle infinito. No nuevos paquetes ni WebGL. El regreso restaura una sola vez la posición vertical y lateral del catálogo anterior; interacción nueva cancela esa espera. Sin destino visible, termina discretamente sin perseguir al usuario ni inventar una tarjeta.

## Implementación

`SiteJourneyProvider` conserva la ruta existente y observa una suscripción al carrito. `addedCartProduct` distingue un incremento unitario de una cancelación, reducción, restauración o cambio de datos. La geometría del producto se captura antes de cerrar sus detalles/opciones; el destino espera como máximo 450 ms a que monte el primer dock. La animación dura 580 ms, con vencimiento de seguridad de 1100 ms y pulso acotado del icono al llegar. Contador y contenido siempre reflejan el store inmediatamente, sin esperar la animación.

El viaje de restaurante dura 460 ms después de tener destino. El marco cambia de proporción mediante transformaciones, mientras la foto mantiene escala uniforme. La espera por ruta/catálogo termina a 1800 ms; el observador de DOM sólo existe durante ese viaje. Enlaces modificados, descargas y nueva pestaña conservan comportamiento nativo. Regreso con el enlace y con historial usan el mismo mecanismo de captura; no se modifica historial ni se intercepta navegación. Diagnóstico de captura/finalización sólo en DEV, sin registros remotos ni datos privados.

`RestaurantMenuHeader` detecta el cruce de la identidad por IntersectionObserver y mide su altura sólo con ResizeObserver. Foto, nombre y sucursal reemplazan visualmente la marca al bajar. Categorías usan esa altura real como offset, y el carrito de PC tiene espacio reservado. Se oculta la barra horizontal decorativa de las categorías móviles, conservando gesto y teclado. No se anima altura, anchura ni posición de layout por cuadro.

## Verificación y límites

- TypeScript, build Vite/PWA y ESLint de los ocho módulos propios comprobados. Dieciséis pruebas tipadas: seis nuevas del reconocimiento de agregados/geometría, seis de sucursales y cuatro de opciones. Deno usa `--sloppy-imports` para resolver las importaciones de bundler existentes; se conserva la comprobación de tipos.
- Comparación del mismo build base/candidato: **2478 bytes gzip adicionales** en el conjunto de JavaScript, sin dependencias nuevas. Es tamaño de transferencia agregado; no es una medición de CPU, batería ni FPS físicos.
- Navegador real de la sesión: 320, 390 y 1280 px, sin overflow horizontal del documento, categorías por debajo del encabezado y dock dentro de pantalla. Regreso conserva tarjeta móvil y rail lateral (168 px observados); captura y finalización reales verificadas en DEV. Confirmación adicional del build de producción: vuelo del primer producto, contador, encabezado compacto y adaptación 1280/390; diagnósticos DEV ausentes.
- Primer agregado, adiciones seguidas, confirmación con opciones, ruta de detalles/carrito y retiro de todos los productos temporales comprobados. Capa decorativa con `pointer-events:none` y cero vuelos residuales al terminar. Pruebas en orígenes locales separados del carrito abierto por Kaleb; sin enviar pedidos, OTP, pagos ni canjes.
- Detector mecánico: recomendaciones heredadas de tokens acotados a home y un `animate-bounce` anterior fuera del delta; ninguna nueva advertencia en los componentes añadidos. No se cambió el diseño global para silenciar esas recomendaciones.
- No se midieron FPS, consumo de batería o comportamiento físico en todos los dispositivos/Safari. Se conserva el rendimiento mediante presupuesto y limpieza acotados; no se promete costo cero. Backend, reglas de compra, permisos, precios, catálogo, worker, WABA y APK no cambian.

La identidad visual y la política de movimiento obligatorio indicadas por Kaleb prevalecen sobre recomendaciones genéricas del skill. No se reintroduce un selector de animaciones.
