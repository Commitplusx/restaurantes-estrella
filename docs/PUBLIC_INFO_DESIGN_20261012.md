# Beneficios y documentos legales — 12 de octubre de 2026

Superficie: `/beneficios`, `/privacidad`, `/terminos` y navegación al catálogo. Código subido a `main` de `Commitplusx/restaurantes-estrella` en `3c51df8`. GitHub y despliegue Vercel son comprobaciones distintas.

## Diseño y contenido

El usuario amplió el diseño blanco de la web a estas páginas. `PublicInfoLayout` utiliza Outfit, blanco, tinta `#1d1d1f`, texto `#515154`, divisor `#e8e8ed` y acento de interacción `#bd3818`. No cambia los tokens de menús, carrito ni portal.

El contenedor mide como máximo 1120px con gutter de 32px; por debajo de 768px, el gutter es 20px. Los títulos se adaptan entre 34–56px en PC y 32–44px en teléfono. Beneficios tiene dos columnas de filas con separadores en PC y una en móvil. El cierre ofrece un acceso claro al catálogo. Las descripciones comerciales anteriores se conservaron; esta revisión visual no verifica sus claims.

Los documentos legales dejan las tarjetas repetidas y presentan una columna de lectura de hasta 70ch, con índice lateral sticky en PC y un índice de dos columnas sobre el texto en teléfono. Se conservan íntegros los títulos, textos y listas existentes: siete secciones de privacidad y nueve de términos. No se redactaron nuevas condiciones legales ni se auditó su vigencia jurídica.

## Movimiento y accesibilidad

Entrada de contenido con máscara y desplazamiento lateral de 12px en 420ms, `cubic-bezier(.16,1,.3,1)`. Salida más breve de 180ms; regresar al inicio invierte la dirección. Un único temporizador de 190ms limita la salida antes de navegar; se retira al desmontar y evita solicitudes simultáneas. Contenido visible en el estado predeterminado, sin ocultarlo a la espera de JavaScript.

Los enlaces reales conservan href, abrir en nueva pestaña y modificadores. Foco visible naranja en controles, objetivos de al menos 44px, salto al contenido e índices que desplazan/enfocan la sección. El foco programático del bloque de lectura no dibuja un contorno gigante alrededor de toda la página. La opción reducir movimiento omite animación y espera; el acceso al catálogo se posiciona inmediatamente.

Ver restaurantes dirige a `/#eats-desktop-categories` y reutiliza `exploreRestaurants`. En movimiento normal recalcula el destino mientras cambian las promociones; en la variante reducida, las promociones no animan su altura. Se corrigió una llegada desalineada de unos 276px causada por esa expansión. La posición móvil comprobada fue 210px, correspondiente al margen de la cabecera existente, con foco en el catálogo.

## Verificación

Build TypeScript/Vite y ESLint de `PublicInfoLayout`, Beneficios, Privacy y Terms aprobaron. Se comprobaron navegación entre páginas, regreso, Ver restaurantes, índices de términos/privacidad, filtro Sushi/Todos y ausencia de overflow horizontal en 320/390px y 1280px. El navegador de prueba tenía reducir movimiento activo; no se declara una prueba física de movimiento normal.

La línea gris de categorías era el scrollbar. Se oculta con `scrollbar-width: none` y la variante WebKit; se mantiene `overflow-x: auto`, gesto y centrado de la selección. Capturas en `output/mapbox-cart-20261012/benefits-desktop.png`, `benefits-mobile.png`, `privacy-desktop.png`, `terms-mobile.png` y `categories-mobile.png` del workspace Robin's; no contienen pedidos ni datos de clientes.
