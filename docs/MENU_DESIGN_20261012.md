# Menú de restaurante — diseño aprobado, 12 de octubre de 2026

## Overview

Este registro describe la extensión aprobada del diseño de Estrella Eats al menú de restaurante PC/móvil y su continuidad con el carrito. Código publicado: `cdde3770ac0d6b5c47476c610ec3ef4e22777701`, en `main` de `Commitplusx/restaurantes-estrella`. Vercel `deiffs-projects/restaurantes-estrella`, despliegue `9oqaGzt7NEHrSuEkfy25HirXkDVY`, Ready con `estrella-eats.mx` asignado. El usuario aprobó el diseño y autorizó la subida. La revisión local y la comprobación del dominio público se distinguen abajo.

La identidad conserva Outfit, blanco, gris frío, tinta y naranja Estrella. La organización facilita consultar categorías, ver el producto completo y agregarlo con sus opciones reales. Se conservan logo, fotografía, nombres, categorías, precios y opciones procedentes del catálogo. No se añade una calificación ficticia de 4.8, un tiempo estimado sin respaldo ni nuevos claims comerciales.

El contrato se limita al menú: presentación en `src/pages/PublicMenuView.tsx`, estilos en `src/pages/PublicMenuView.css` dentro de `.restaurant-menu-page`, y los componentes `MenuProductCard`, `RestaurantMenuIdentity` y `MenuDetailsFrame`. `PRODUCT.md`, `DESIGN.md` y `.impeccable/design.json` mantienen su alcance existente de inicio público. La ampliación de estas superficies no constituye una nueva identidad global.

## Colors

La paleta deja la atención en el catálogo real y distingue la selección con tinta y naranja. Los valores observados pertenecen al CSS de esta superficie:

| Rol | Valor vigente | Aplicación |
| --- | --- | --- |
| Blanco | `--menu-paper: #fff` | Fondo, cabecera, fichas y tarjetas |
| Gris frío | `--menu-surface: #f5f5f7` | Ventanas de fotografía y hover secundario |
| Tinta | `--menu-ink: #1d1d1f` | Texto principal, categoría elegida y acceso al pedido |
| Texto secundario | `--menu-muted: #626267` | Descripciones, ayudas y metadatos |
| Divisor | `--menu-line: #e8e8ed` | Límites de tarjetas y secciones |
| Naranja de interacción | `--menu-accent: #bd3818` | Agregar, ubicación y foco |
| Fondo naranja suave | `--menu-tint: #fff3ec` | Acción de agregar y selección de texto |

El estado Abierto/Cerrado refleja la lógica existente; el verde de abierto no sustituye el acento de marca. Los colores del logo y de las fotos se conservan como activos.

## Typography

La fuente es Outfit con fallback sans-serif. El nombre del restaurante usa una escala de (30–44px) en PC, (30px) hasta (899px) y (27px) por debajo de (640px); el peso observado es (650). Los títulos de categoría usan (27px) en PC y (24px) en móvil. Los productos usan (19px) en PC y (17px) en móvil, con peso (600). Los precios tienen cifras tabulares; las descripciones usan (14px) en PC y (13px) en móvil.

La jerarquía conserva primero nombre, descripción breve y precio. Los textos y nombres extensos pueden partirse; las descripciones de tarjeta muestran hasta dos líneas y la ficha ofrece el contenido completo.

## Layout

El contenedor principal tiene ancho máximo de (1160px), con padding lateral de (28px) en PC y (20px) hasta (899px). En PC, las categorías forman una columna lateral de (190px), separada del catálogo por (38px). La navegación de categorías queda sticky; la categoría elegida se distingue con fondo tinta y `aria-pressed`.

Hasta (899px), las categorías se convierten en chips horizontales desplazables, conservando nombres y cantidades del catálogo. La tarjeta de producto cambia a una fila de texto y foto por debajo de (640px). Por debajo de (360px), el gutter baja a (16px) y la foto compacta mide (88×100px).

El acceso «Ver mi pedido» muestra la cantidad y el subtotal existentes. En PC aparece junto a la cabecera; hasta (899px) se sitúa en una barra inferior con safe-area. La página reserva espacio inferior para que la barra no impida recorrer el catálogo. La navegación menú ↔ carrito usa un fundido de (240ms) con `cubic-bezier(.22,1,.36,1)`.

## Elevation & Depth

La separación principal usa blanco, gris frío, espacio y bordes discretos. La barra del pedido lleva la sombra existente `0 8px 30px rgba(0,0,0,.12)`. La ficha se presenta sobre un fondo oscurecido `rgba(29,29,31,.4)`. Estas capas pertenecen al acceso al pedido y al diálogo; no son tokens globales nuevos.

## Shapes

Las tarjetas tienen esquinas de (16px) en PC y (14px) en móvil. Los botones para agregar miden (44×44px), con esquinas de (12px) en PC y (10px) en móvil. Regresar y cerrar también tienen objetivos de (44×44px). La acción principal de la ficha tiene un alto mínimo de (56px). El foco visible usa contorno naranja de (3px) con separación de (4px).

La ficha de PC tiene esquinas de (22px) y ancho máximo de (520px). En móvil se presenta como una hoja inferior con esquinas superiores de (24px), alto acotado al viewport y espacio para safe-area.

## Components

### RestaurantMenuIdentity

Presenta logo o foto de fachada real, nombre, categorías, descripción, estado de apertura, horarios y ubicación disponibles. El logo usa `contain`, con ventana de (128×128px) en PC y (84×84px) hasta (899px). Si falta o falla la imagen, aparece un icono de restaurante. El botón de sucursal sólo se muestra cuando existen sucursales.

### MenuProductCard

Presenta nombre, descripción, precio real y las opciones incluidas disponibles. La acción distingue agregar directamente de elegir opciones, informa la cantidad ya agregada y deshabilita agregar cuando el producto no está disponible o el precio no es válido. Un precio ausente o inválido se muestra como «Precio no disponible».

**Regla de imagen completa.** La corrección del zoom señalado por el usuario conserva la foto completa con `object-fit: contain`. En PC, la imagen está posicionada de forma absoluta dentro de una ventana fija de (210px) de alto; así su tamaño intrínseco no expande la tarjeta. En móvil la ventana habitual mide (112×112px), con la excepción compacta registrada en Layout. No se aplica zoom a la fotografía. Si falta o falla la fuente, se muestra un icono de utensilios.

La ficha mantiene también `contain`: ventana de (240px) en PC y (210px) en móvil. El recorte de esquinas afecta a la ventana, sin recortar el contenido para llenar el espacio.

### MenuDetailsFrame

La ficha es un diálogo con nombre accesible. Al abrir, conserva el elemento que tenía foco, bloquea el scroll del body y mueve el foco al diálogo. Tab y Shift+Tab permanecen dentro de sus controles visibles; Escape y el fondo cierran la ficha. Al desmontarse, restaura el overflow anterior y el foco del elemento original si sigue conectado. La ficha que sale queda `inert`.

Las opciones y la acción de agregar usan los contratos existentes del catálogo y del carrito. El componente presenta el diálogo; no introduce otro flujo de compra. Se conservan backend, H3, `auth-otp`, selección de Mapbox y el pago en efectivo del checkout.

## Do's and Don'ts

- **Do** conservar activos, nombres, categorías, precios y opciones reales.
- **Do** comprobar la foto completa tanto en tarjetas como en la ficha, incluyendo fuentes ausentes o fallidas.
- **Do** conservar selección visible, foco, cierre por Escape, restauración de foco y controles de (44px).
- **Do** mantener el CSS acotado a esta superficie y consultar el registro del carrito para sus transiciones.
- **Don't** presentar calificaciones, tiempos o nuevos claims comerciales sin datos verificados.
- **Don't** convertir este registro en autorización para rediseñar home, autenticación, ubicación o backend.

## Verificación y evidencia

La revisión final del conjunto carrito/menú aprobó compilación TypeScript/Vite, ESLint de los cinco componentes de presentación y 26 pruebas Deno existentes con tipos. La revisión completa corrigió dos hallazgos del cupón del carrito; el veredicto posterior fue `ship`, con ambos `resolved`.

Las capturas de PC (1280×900), móvil (390×844) y ancho de usuario (1919×1000) muestran la composición aprobada, las fotos completas y ausencia de desbordamiento horizontal. El render a (1919×1000) se contrastó con la captura aportada por el usuario y no se identificó una diferencia visual material del menú. La corrección respecto a la imagen ampliada anterior queda expresada en la ventana fija y `contain`, verificadas en código y capturas.

En navegador se ejercitaron apertura, selección y cierre de opciones; ficha móvil con imagen completa; Escape con restauración de foco y scroll del body; y agregar una unidad de «8 Piezas de Pollo» para comprobar actualización del pedido y navegación menú → carrito. La cantidad de ese producto pasó de (1) a (2) y el subtotal de ($210.00) a ($390.00). Al reducirlo a (1), se restableció el subtotal original de ($210.00) de los dos productos de la muestra local. No se hicieron llamadas OTP ni se generaron pedidos reales. No se probó en dispositivos físicos Safari/iOS.

Evidencia en `C:/Users/Kaleb/Desktop/pollo-robins-panel/output/mapbox-cart-20261012/`:

- `restaurant-menu-desktop.png`: menú PC, categorías laterales y fotos completas.
- `restaurant-menu-mobile.png`: chips móviles, tarjetas y acceso inferior al pedido.
- `restaurant-menu-user-1919.png`: render al ancho de la captura del usuario.
- `cart-redesign-desktop.png` y `cart-redesign-mobile.png`: continuidad con el carrito.
- `cart-coupon-mobile.png`: cupón corregido.

La evidencia anterior corresponde a la revisión local del código subido en `cdde377`.

## Comprobación del sitio activo

Se verificaron en `https://estrella-eats.mx/menu/pollo-robin-s-1353` las categorías, fotos cargadas completas con `contain`, altura de 210px en PC y 112px en 390×844, y ausencia de desbordamiento horizontal. También se comprobó agregar un artículo, entrar al carrito, avanzar y regresar, retirarlo y volver al menú vacío. No se generaron pedidos ni OTP. La PWA necesitó una recarga para sustituir el índice anterior por `/assets/index-BbkcNbg6.js`; no se certifica la actualización de otros dispositivos.

Capturas del dominio público, en el mismo directorio de evidencia: `restaurant-menu-published-desktop.png`, `restaurant-menu-published-mobile.png` y `cart-published-desktop.png`. El recibo duradero `menu-cart-publication.json` registra el commit de código y el despliegue comprobados sin datos privados.
