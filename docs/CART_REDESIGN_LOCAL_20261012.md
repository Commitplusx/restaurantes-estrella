# Carrito responsive — diseño revisado, 12 de octubre de 2026

Publicado en `estrella-eats.mx`: commit de código `cdde3770ac0d6b5c47476c610ec3ef4e22777701`, incorporado a `main` mediante fast-forward y subido a `Commitplusx/restaurantes-estrella`. Vercel `deiffs-projects/restaurantes-estrella`, despliegue `9oqaGzt7NEHrSuEkfy25HirXkDVY`, Ready con el dominio público asignado. El usuario aprobó el diseño y autorizó la subida. El nombre histórico de este archivo no implica que la entrega continúe sólo en local; la evidencia local y la comprobación pública se distinguen abajo.

## Alcance aprobado

La extensión aprobada abarca carrito PC/móvil, avance y regreso entre pasos, y su continuidad con el menú de restaurante documentado en `docs/MENU_DESIGN_20261012.md`. Conserva Outfit, blanco, gris frío, tinta y acento naranja de Estrella. `PRODUCT.md`, `DESIGN.md` y `.impeccable/design.json` siguen describiendo el inicio público; este registro no los convierte en un sistema global.

Los estilos del carrito pertenecen a `src/pages/CartPage.css` y a la superficie `.checkout-page`. `CheckoutChrome.tsx` presenta cabecera, progreso y acción; `CheckoutStepScene.tsx` presenta la escena de cada paso. `CartPage.tsx` conserva cálculo, estado de carrito, catálogo, H3, selección de Mapbox, validación existente y `auth-otp`. Los botones móvil/PC comparten la misma acción; avanzar desde entrega comprueba `isStepValid`, incluida la selección de coordenadas y la cotización finalizada. El precio final continúa validándose en servidor. Se conservan RPC, backend, pago en efectivo y las protecciones existentes de doble envío/OTP.

## Presentación y valores observados

El checkout muestra tres pasos, productos con cantidades y opciones, cupón desplegable, formulario con etiquetas y selección explícita de entrega. PC mantiene un resumen junto al contenido; por debajo de (1024px), una barra inferior presenta importe y acción. Antes de cotizar, el importe dice «Productos, sin envío». La pantalla de pago muestra todos los productos y el cambio de efectivo. El estado vacío comparte la misma superficie.

Los valores siguientes se extraen del CSS del carrito y se aplican sólo a esta superficie:

| Rol | Valor vigente | Aplicación |
| --- | --- | --- |
| Blanco | `--checkout-paper: #fff` | Cabecera, paneles y campos |
| Gris frío | `--checkout-surface: #f5f5f7` | Fondo y controles secundarios |
| Tinta | `--checkout-ink: #1d1d1f` | Texto principal, paso activo y acción |
| Texto secundario | `--checkout-muted: #626267` | Ayudas y metadatos |
| Divisor | `--checkout-line: #e8e8ed` | Bordes y separación |
| Naranja de interacción | `--checkout-accent: #bd3818` | Selección, enlaces y foco |
| Fondo naranja suave | `--checkout-tint: #fff3ec` | Estados seleccionados y apoyo |

La composición PC tiene un ancho máximo de (1104px), resumen de (360px) y separación de (48px). Los paneles usan esquinas de (22px); la acción principal, (14px). Los controles de cantidad y regreso miden (44×44px), la acción principal tiene un alto mínimo de (56px), y los campos usan texto de (16px). La barra móvil y el área desplazable reservan safe-area inferior. El foco visible usa contorno naranja.

## Transiciones de pasos

El título y el contenido se animan como una sola escena mediante `CheckoutStepScene`. Avanzar entra desde la derecha y salir se desplaza hacia la izquierda; volver invierte el recorrido. El desplazamiento normal es de (24px), con salida de (180ms) y entrada de (400ms). La entrada usa la curva `cubic-bezier(.22,1,.36,1)` y la salida `cubic-bezier(.4,0,1,1)`. El indicador activo de progreso comparte su posición entre pasos. El resumen y la barra de acción conservan su ubicación durante el cambio.

Con reduced motion, el desplazamiento es de (0px), la salida dura (120ms) y la entrada (260ms), mediante fundido. La escena que sale queda `inert` y fuera del árbol accesible. `AnimatePresence` espera la salida; sólo entonces se restablece el scroll del contenedor. Mientras cambia el paso, avance/regreso permanecen bloqueados y `stepTransitionRef` evita dos cambios en el mismo evento. Al terminar la entrada se libera el bloqueo y el foco llega al título con `preventScroll`. El desbloqueo depende de la finalización de la animación.

La navegación menú → carrito y el regreso al menú usan un fundido de (240ms) con la misma curva de entrada. Este movimiento enlaza las dos superficies sin cambiar el cálculo o la validación del checkout.

## Cupón y cierre de revisión

La apertura de «¿Tienes un cupón?» tiene estado de presentación propio, `couponOpen`, inicializado con la validez persistida y sincronizado con el `onToggle` nativo de `details`. Abrir, cerrar o escribir no depende de que el cupón sea válido. El `summary` tiene un alto mínimo de (44px). Esta separación evita que una actualización del formulario cierre el campo durante la escritura.

La revisión completa detectó dos hallazgos en el cupón; ambos se corrigieron y el veredicto posterior fue `ship`, con ambos marcados `resolved`. Ese veredicto puntúa estas dos correcciones; la comprobación del despliegue se registra por separado.

## Verificación y evidencia

Compilación TypeScript/Vite final aprobada, ESLint de los cinco componentes de presentación aprobado y 26 pruebas Deno existentes aprobadas con comprobación de tipos. Se verificaron cantidades/precios, contacto, recogida sin envío y cálculo visual de cambio.

En navegador se revisaron PC (1280×900), móvil (390×844) y el ancho de la captura del usuario (1919×1000), sin desbordamiento horizontal. La revisión previa del carrito también cubrió (320×740). La navegación 1↔2 comprobó bloqueo ante doble activación, desbloqueo y foco; el navegador de revisión ejercitó el fundido de reduced motion. La variante espacial se contrastó con el componente y no se certifica como prueba en un dispositivo físico.

La continuidad con el menú comprobó apertura, selección y cierre de opciones, ficha con imagen completa, Escape con restauración de foco y scroll del body, y agregar una unidad de «8 Piezas de Pollo» para comprobar cálculo y paso menú → carrito. La cantidad de ese producto pasó de (1) a (2) y el subtotal de ($210.00) a ($390.00). Al reducirlo a (1), se restableció el subtotal original de ($210.00) de los dos productos de la muestra. Estos valores describen la prueba local y no son claims comerciales.

No se hicieron llamadas OTP ni se crearon pedidos durante la revisión visual. Falta validación física en Safari/iOS y no se certifica un pedido real con este candidato.

Las capturas viven en `C:/Users/Kaleb/Desktop/pollo-robins-panel/output/mapbox-cart-20261012/`:

- `cart-redesign-desktop.png`: composición PC y resumen.
- `cart-redesign-mobile.png`: composición móvil y barra inferior.
- `cart-step-motion-mobile.png`: paso de entrega revisado.
- `cart-coupon-mobile.png`: cupón desplegado después de la corrección.

El commit de código se limita a los cinco componentes de presentación, `CartPage.tsx`, `CartPage.css`, `PublicMenuView.tsx` y `PublicMenuView.css`. Los archivos generados de desarrollo y trabajo ajeno a estas superficies quedaron fuera del commit.

## Comprobación pública

Vercel confirmó Ready, el commit de código y el dominio de producción. El índice servido por la PWA cambió de `/assets/index-D5SCWuq1.js` a `/assets/index-BbkcNbg6.js` después de una recarga; la primera apertura conservaba la versión anterior. No se certifica la actualización de todos los dispositivos ni el funcionamiento offline.

En el dominio público se comprobó menú → carrito, un artículo de catálogo de $180, avance 1→2 y regreso 2→1, y estado vacío después de retirar únicamente el artículo añadido para verificar. Se conservaron los datos previos de contacto. No se solicitaron OTP, crearon pedidos, cobros ni despachos. La revisión no certifica un pedido real ni sustituye las pruebas del servidor.

Captura pública sin datos privados: `cart-published-desktop.png`, en el mismo directorio de evidencia. Las fotos del menú publicado se comprobaron completas en PC y 390×844, sin desbordamiento; véase `MENU_DESIGN_20261012.md`.
