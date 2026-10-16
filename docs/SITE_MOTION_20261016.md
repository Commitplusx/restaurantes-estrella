# Movimiento de la web cliente — ampliación local del 16 de octubre de 2026

## Alcance y estado

Ampliación local de la web cliente de Estrella Eats: tercer paso de bienvenida, profundidad de fotografía y transiciones de contenido en home, menú, carrito, selección de sucursal e información pública. Se conserva la identidad existente: blanco, Outfit, tinta, naranja Estrella, logo y fotografía actuales. No se añadieron activos, dependencias ni promesas comerciales; `PRODUCT.md`, `DESIGN.md` y `.impeccable/design.json` conservan su alcance previo.

Al cierre de la revisión local, el código está **sin commit y pendiente de publicación**, sobre `HEAD 3900976`, en `C:/Users/Kaleb/.codex/tmp/eats-branches-release-20261015`. El usuario autorizó publicar posteriormente; aún falta registrar el commit y el recibo verificado de GitHub/Vercel. La evidencia de este documento corresponde a localhost. No acredita despliegue en Vercel, staging o producción. No hubo cambios de SQL, runtime del worker, roles, WABA ni APK.

[WELCOME_AND_NOTIFICATIONS_20261016.md](WELCOME_AND_NOTIFICATIONS_20261016.md) conserva el recibo histórico del release funcional `cd946f9`: bienvenida de **dos** pasos y avisos publicados. Ese recibo no publica ni certifica la ampliación aquí descrita.

## Preferencia y límites del movimiento

`SiteMotionProvider`, el contexto `SiteMotionContext` y `useSiteMotion` centralizan la elección y la transmiten a `MotionConfig`. En el build de producción, el valor inicial sigue `prefers-reduced-motion` salvo una elección explícita `full` o `reduced`. Esa elección se guarda con el adaptador seguro existente bajo `eats_motion_preference`; si falla localStorage, el adaptador conserva memoria durante ese contexto, sin garantizar persistencia tras recargar.

DEV comienza en movimiento completo para la revisión local y sus cambios no persisten esta preferencia. Hay controles en la bienvenida y en los pies de home, menú e información pública. El control flotante adicional es exclusivo de DEV y sólo aparece desde 1024px; se ocultó hasta 1023px tras detectar que podía cubrir el CTA móvil.

`ParallaxMedia` acepta únicamente puntero de tipo mouse, acota el desplazamiento según su profundidad y mueve el primer plano en sentido inverso. Usa motion values, sin un render React por movimiento del puntero. La última ampliación incorpora planos independientes de scroll en el hero y movimiento acotado de las tarjetas completas; sus enlaces y foco acompañan la tarjeta. El mapa mantiene su integración existente. `ScrollDepth` conserva un export legado de −16 a +16px, pero ya no es el hero vigente. Los logos conservan `contain`, su margen interior de 10px y su escala; no se amplían para simular profundidad.

La elección reducida elimina el parallax y el desplazamiento de las nuevas escenas; admite cambios breves de opacidad. No se afirma que esta ampliación haya auditado todas las animaciones heredadas ni que una medición de FPS demuestre rendimiento físico.

## Bienvenida de tres pasos

Se conserva la ruta de bienvenida, su cola de avisos, finalización, bloqueo/restauración del DOM y controles de teclado. Los indicadores ahora recorren tres pasos:

1. **Comida de Comitán. A tu puerta.** presenta el servicio.
2. **Tu antojo. Así de fácil.** explica el pedido existente.
3. **Tu pedido. Siempre a la vista.** explica selección, estado y entrega o recogida.

Las acciones principales son **Cómo pedir**, **Ver seguimiento** y **Ver restaurantes**. Avanzar, retroceder, elegir un indicador y omitir usan el mismo flujo; no se crea un checkout alternativo ni se realiza un pedido desde la bienvenida.

Los títulos se revelan por líneas enmascaradas con escalonado de 65ms. La salida dura 180ms y la entrada de texto entre 480 y 520ms. Fotografía y leyenda cambian de posición a velocidades distintas al pasar de paso (850ms y 620ms); el movimiento del mouse de la foto se acota a ±14px horizontal y ±10px vertical. La foto existente `/desktop/comitan-table.webp` se reutiliza con su alternativa/fallback. El modo reducido deja su transform en `none` durante la comprobación local.

## Superficies conectadas

| Ruta existente | Ampliación local |
| --- | --- |
| Home de PC y móvil | Profundidad de foto y leyenda; hero con scroll acotado; categorías y medios del catálogo con respuesta visual |
| Menú y `MenuProductCard` | La reacción de añadir depende del incremento real de cantidad; el contador del carrito cambia con su valor |
| Carrito | Cantidades y dinero animados como presentación; `CheckoutStepScene` sigue la preferencia central |
| Cambio de sucursal | Entrada de diálogo, lista, confirmación e identidad de menú; conserva la confirmación existente cuando hay productos |
| Detalles, beneficios y textos legales | Entrada del contenido mediante el layout público existente |
| Tracker | Conexión con la preferencia central; en la versión de tracker de este checkout se anima el título al cambiar el estado |

Se preservó el rediseño del tracker que ya estaba sucio en el workspace original; sólo se conectó su preferencia de movimiento. Esta entrega local no publica ni sustituye ese rediseño. Las reglas de negocio y las rutas existentes de pedido/sucursal no se trasladan a la capa de animación.

## Corrección hallada en QA del carrito

La secuencia rápida de cantidad 2 → 3 → 2 dejó visible un total anterior por el estado duplicado `displayTotal` y su bucle `requestAnimationFrame`. Se retiraron ambos: el total se deriva inmediatamente del estado vigente y `AnimatedMoney` anima únicamente su presentación.

La revalidación del efectivo conserva la condición explícita de ejecutarse sólo al cambiar el total, comparado mediante una referencia. Escribir el importe no vacía el campo. La animación no determina precios, cantidades, validación ni el importe enviado por el checkout.

## Verificación local

El build TypeScript/Vite del checkout de revisión y ESLint de los módulos nuevos aprobaron. La integración en el workspace original también aprobó `npm run build` con el CSS final que oculta el dock DEV en móvil y los nuevos módulos sincronizados, preservando sus cambios locales de checkout y tracker. Log privado: `C:/Users/Kaleb/.codex/private-backups/promotion-rules-20261016/motion-original-integration-build.log`.

Pasaron **27 pruebas Deno con comprobación de tipos**: 12 de activación push, 5 de promociones, 4 de opciones de menú y 6 de sucursales. Son regresiones de contratos existentes; no son pruebas de FPS, entrega push ni una certificación de todas las animaciones. No se añadieron pruebas que duplicaran el CSS.

La revisión interactiva local comprobó:

- Los tres pasos de bienvenida, avance, retroceso y modo reducido; a 322×844 el documento midió 322px de ancho.
- Home a 1440×900 y 390×844.
- Carrito de dos unidades a $190 tras sumar y restar rápidamente una unidad de $95; acceso al paso 2 y regreso.
- Cancelar el cambio de sucursal conservó las dos unidades. Confirmar San Agustín vació el carrito local y abrió el menú de esa sucursal por la ruta existente.

No se creó un pedido ni se ejecutaron OTP, cobro o mensaje reales. Tampoco se demostró recepción push, lector de pantalla físico, Safari/iOS físico, teléfono físico ni FPS de un dispositivo.

El detector `site-motion-detector.json`, en la evidencia privada de esta revisión, terminó con código 0. Sus avisos sobre tokens heredados son orientativos; no justificaron reescribir el diseño global.

## Evidencia y cierre de revisión

Capturas vigentes, abiertas y válidas en `C:/Users/Kaleb/.codex/private-backups/promotion-rules-20261016/`:

- `welcome-third-step-desktop.png` y `welcome-third-step-mobile.png`.
- `site-motion-home-desktop.png` y `site-motion-home-mobile.png`.
- `site-motion-cart-desktop.png` y `site-motion-cart-mobile.png`.
- `site-motion-branches-mobile.png`.

La revisión de acabado inicial devolvió **fix** con un único hallazgo P2: el control flotante DEV podía cubrir el CTA móvil. El CSS lo oculta hasta 1023px. Se sustituyeron y abrieron las capturas de home y carrito móviles con los controles despejados. El reviewer puntuó ese hallazgo **resuelto**, con resultado **clear** y disposición **ship** para ese fix y aquella entrega local. El veredicto no cubre por sí solo los cambios posteriores de scroll y ofertas, registrados a continuación, ni acredita publicación.

## Última ampliación local: scroll y ofertas

Tras rechazar el scroll sutil, el usuario pidió «parallax nivel pro» y evitar que la misma promoción apareciera tres veces por sus sucursales. Se mantiene la identidad existente: blanco, tinta, naranja Estrella, Outfit y los activos actuales. Se compararon `PRODUCT.md`, `DESIGN.md` y `.impeccable/design.json` sin modificarlos. La regla nominal **Home Scope** conserva su alcance del inicio público; esta ampliación no crea reglas globales ni normaliza desviaciones heredadas.

El hero de PC usa progreso propio y planos independientes: fotografía de −54 a +54px, texto de 0 a −60px, leyenda de 0 a −76px y sello de 0 a −95px con giro de 12 a −24 grados. En móvil, la fotografía recorre −38 a +38px y la leyenda de +18 a −22px. `ScrollDepthGroup` comparte progreso por sección; `ScrollLayer` mueve las tarjetas completas dentro de límites: ofertas ±50px/±1.4 grados, directorio de PC ±24–44px/±0.45 grados y tarjetas móviles ±26px/±0.35 grados. Los medios del catálogo aprovechan `ParallaxMedia` existente.

La primera revisión de esta ampliación detectó un P2 por recorte del arte de la oferta. Se corrigió con un marco cuadrado y `contain`, retirando el parallax interior y el sobredimensionamiento del arte; la tarjeta completa conserva su movimiento. En las capturas finales abiertas se ven completos «VIERNES» y el precio del arte. Los contornos visibles corresponden al foco de teclado. El mismo reviewer volvió a revisar la corrección y devolvió **pass**, disposición **ship**, con el P2 **resuelto**; el veredicto se limita a esta corrección y su evidencia local.

`src/lib/landingPromotions.ts` recibe `unknown`, valida datos y agrupa sólo después de aplicar elegibilidad por sucursal y modalidad seleccionada. La clave compara raíz de marca, título, descripción, precio, opciones, días, vencimiento y subsidio; conserva una ruta real de sucursal. Las copias de IDs de catálogo no convierten opciones equivalentes en ofertas distintas. La consulta está acotada a 200 filas, con cancelación a los 8 segundos y reintento manual observable. La agrupación es de presentación: no elimina ni modifica filas de base de datos.

La lectura de reglas reales confirmó Itaes y Belisario sólo para tienda; San Agustín admite tienda y domicilio. Para recoger se muestra una tarjeta con tres sucursales; a domicilio, una tarjeta de San Agustín. No se cambiaron esas reglas.

Se añadieron **6 pruebas Deno tipadas** de agrupación, diferencias reales, modalidad, opciones copiadas, elegibilidad y rechazo de datos inválidos. Con las 27 regresiones anteriores, aprobaron **33 pruebas**. Los builds finales aprobaron en el checkout de revisión y en el workspace original `C:/Users/Kaleb/Desktop/loyalty-estrella/estrella-eats`, con los archivos finales sincronizados y los cambios ajenos de checkout/tracker preservados. Logs privados: `pro-scroll-review-fix-build.log` y `pro-scroll-original-final-build.log` en la carpeta de evidencia indicada abajo.

La comprobación interactiva midió en PC scroll de 0 a 630px: texto de 0 a −58.4px, fotografía de −54 a +51.2px y sello de 0 a −92.5px, con giro de 12 a −23 grados. En móvil, scroll de 0 a 738px produjo fotografía de −14.2 a +29.5px. Al activar movimiento reducido, los nuevos desplazamientos quedaron sin transform de movimiento. No se atribuyen FPS físicos ni cobertura de Safari/iOS físico.

Capturas finales abiertas en `C:/Users/Kaleb/.codex/private-backups/promotion-rules-20261016/` (dimensiones de los archivos, distintas del viewport nominal):

- `pro-scroll-desktop-top.png` — 1276×718.
- `pro-scroll-offers-desktop.png` — 1276×716.
- `pro-scroll-offers-mobile.png` — 386×835.

El detector de esta ampliación se ejecutó **una vez**, antes del fix del arte: `pro-scroll-detector.json`, código 0, con avisos orientativos de tokens. No se ejecutó de nuevo después de ese fix. La QA anterior de bienvenida de tres pasos y sus 27 pruebas conserva su alcance separado. No se crearon pedidos ni se ejecutaron OTP, push, cobros o escrituras reales. Esta revisión cierra el trabajo local; la publicación autorizada queda pendiente de su recibo verificable.
