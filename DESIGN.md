---
name: Estrella Eats — inicio público
description: "Sistema aprobado y observado solo para la home; no define las demás pantallas."
colors:
  eats-paper: "#ffffff"
  eats-ink: "#1d1d1f"
  eats-orange: "#ea4e25"
  eats-line: "#e8e8ed"
  cool-surface: "#f5f5f7"
  secondary-text: "#515154"
  muted-text: "#6e6e73"
  control-surface: "#f0f0f2"
  interactive-border: "#d2d2d7"
  interaction-orange: "#bd3818"
  ink-hover: "#3a3a3c"
  selected-category-surface: "#fff0e7"
typography:
  display-phone:
    fontFamily: "Outfit, sans-serif"
    fontSize: "clamp(46px, 13vw, 64px)"
    fontWeight: 800
    lineHeight: 0.98
    letterSpacing: "-0.035em"
  display-tablet:
    fontFamily: "Outfit, sans-serif"
    fontSize: "clamp(50px, 7.4vw, 72px)"
    fontWeight: 800
    lineHeight: 0.98
    letterSpacing: "-0.035em"
  display-desktop:
    fontFamily: "Outfit, sans-serif"
    fontSize: "clamp(64px, 6.2vw, 94px)"
    fontWeight: 800
    lineHeight: 0.98
    letterSpacing: "-5px"
  body-phone:
    fontFamily: "Outfit, sans-serif"
    fontSize: "15px"
    lineHeight: 1.5
  body-desktop:
    fontFamily: "Outfit, sans-serif"
    fontSize: "16px"
    lineHeight: 1.6
  title-phone:
    fontFamily: "Outfit, sans-serif"
    fontSize: "21px"
    fontWeight: 700
    letterSpacing: "-0.025em"
  action:
    fontFamily: "Outfit, sans-serif"
    fontSize: "14px"
    fontWeight: 600
  search-phone:
    fontFamily: "Outfit, sans-serif"
    fontSize: "16px"
  mode-label:
    fontFamily: "Outfit, sans-serif"
    fontSize: "12px"
    fontWeight: 600
rounded:
  control: "9px"
  search-phone: "10px"
  mode-option: "6px"
  caption: "8px"
  restaurant-phone: "14px"
  category-phone: "16px"
  dock: "9999px"
spacing:
  restaurant-phone: "12px"
  gutter-phone: "20px"
  gutter-tablet: "28px"
  gutter-desktop: "48px"
components:
  button-primary-phone:
    backgroundColor: "{colors.eats-ink}"
    textColor: "{colors.eats-paper}"
    typography: "{typography.action}"
    rounded: "{rounded.control}"
    padding: "12px 17px"
  button-primary-hover:
    backgroundColor: "{colors.ink-hover}"
    textColor: "{colors.eats-paper}"
  search-phone:
    backgroundColor: "{colors.eats-paper}"
    textColor: "{colors.eats-ink}"
    typography: "{typography.search-phone}"
    rounded: "{rounded.search-phone}"
    padding: "0 12px"
  mode-selected:
    backgroundColor: "{colors.eats-ink}"
    textColor: "{colors.eats-paper}"
    typography: "{typography.mode-label}"
    rounded: "{rounded.mode-option}"
  restaurant-phone:
    backgroundColor: "{colors.eats-paper}"
    textColor: "{colors.eats-ink}"
    rounded: "{rounded.restaurant-phone}"
    padding: "{spacing.restaurant-phone}"
  category-phone:
    backgroundColor: "{colors.eats-paper}"
    rounded: "{rounded.category-phone}"
    width: "64px"
    height: "64px"
  navigation-phone:
    backgroundColor: "{colors.eats-paper}"
    rounded: "{rounded.dock}"
  carousel-control:
    textColor: "{colors.secondary-text}"
    rounded: "{rounded.caption}"
    width: "44px"
    height: "44px"
---

# Design System: Estrella Eats — inicio público

## Overview

**Creative North Star: "Estrella Eats sobre blanco"**

Este documento captura la paleta blanca que el usuario aprobó para `src/pages/PublicLandingPage.tsx` y los patrones existentes que la acompañan. La referencia Apple-like describe el color y la claridad de las superficies. La composición, Outfit, fotografía, activos de Estrella y acento naranja siguen siendo los del inicio.

**Alcance normativo: únicamente el inicio público.** Estos tokens no autorizan restilizar menús, checkout, beneficios, paneles ni otras rutas. Antes de esta tarea no existían DESIGN.md ni su sidecar; no se reconstruyó ni auditó un sistema visual global. Este archivo registra el cambio de paleta aprobado para una superficie existente, no una nueva identidad de toda la aplicación.

**Key Characteristics:**
- Blanco y gris frío para las superficies del inicio.
- Outfit y naranja Estrella conservados.
- Fotografía y banners existentes, sin recolorear su contenido.
- Controles oscuros y estados visibles; texto directo en español.

## Colors

La base blanca y los grises fríos dejan que la comida y el naranja de marca concentren la atención. Los valores de frontmatter son el registro normativo; su uso se restringe a la home.

### Primary

- **Naranja Estrella** (`eats-orange`): marca, última línea del título y motivos existentes.
- **Naranja de interacción** (`interaction-orange`): foco y selección en teléfono y tablet; acompaña estados accesibles sobre blanco.

### Neutral

- **Blanco del inicio** (`eats-paper`): fondo, cabecera móvil, panel de pie de foto y tarjetas móviles.
- **Tinta oscura** (`eats-ink`): título, CTA, carrito y modalidad seleccionada.
- **Gris frío de superficie** (`cool-surface`): footer y mensajes de banner.
- **Divisor claro** (`eats-line`): separación de secciones y límites de superficies.
- **Texto secundario** (`secondary-text`) y **texto discreto** (`muted-text`): descripción, ayudas y navegación. El texto discreto también se aplica a etiquetas y metadatos de ofertas/filas hasta (1023px), con contraste medido en la prueba de implementación de (5.07:1) sobre blanco.
- **Gris de control** (`control-surface`): contenedor de modalidades.
- **Borde interactivo** (`interactive-border`): campo de búsqueda móvil y algunos estados de hover.
- **Tinta de hover** (`ink-hover`): respuesta del CTA y carrito.
- **Fondo de categoría elegida** (`selected-category-surface`): acompaña el borde naranja de la categoría.

Los activos conservados pueden tener otros colores, incluido el sello crema de escritorio y el arte de campañas. La paleta de UI no cambia esos activos. El catálogo de escritorio mantiene sus grises, blancos y negro heredados; no se afirma que toda la home esté normalizada a una única escala de tokens.

**The Home Scope Rule.** Aplicar estos colores solo dentro del inicio público; cualquier ampliación a otras rutas requiere su propio alcance aprobado.

## Typography

**Display Font:** Outfit (fallback sans-serif).
**Body Font:** Outfit (fallback sans-serif).

**Character:** Letras compactas y de peso alto para el título, con texto de apoyo de lectura sencilla. Se conserva la tipografía real heredada; el contrato histórico de Manrope no es la fuente vigente del inicio.

### Hierarchy

- **Display:** título en tres líneas, peso (800) y alto de línea (0.98); los roles phone/tablet/desktop del frontmatter expresan sus escalas.
- **Desktop compacto:** entre (1024px) y (1199px), título de (70px) con espaciado de (-3px); esta excepción existente prevalece sobre display-desktop.
- **Title:** títulos móviles de categorías y catálogo, peso (700), escala title-phone.
- **Body:** descripción del hero; ancho máximo móvil (36ch). Cambia de body-phone a body-desktop a partir de escritorio.
- **Action:** CTA, peso (600); búsqueda móvil usa (16px), con etiqueta accesible independiente del placeholder.
- **Mode label:** selector de domicilio/recogida, peso (600).

## Layout

La adaptación conserva el hero y su foto de escritorio. El contrato de esta composición, las etiquetas y el flujo de búsqueda viven en `.impeccable/surfaces/src-pages-publiclandingpage-tsx.md`; no son una plantilla global para futuras páginas.

- Teléfono por debajo de (640px): hero en una columna, cabecera en filas y controles táctiles. Gutter habitual (20px), reducido a (16px) por debajo de (360px).
- Tablet de (640px) a (1023px): hero en dos columnas, gutter (28px) y carrusel con ventana de (380px).
- Escritorio desde (1024px): hero existente de dos columnas, cabecera fija y contenedor máximo de (1440px); gutter (48px), reducido a (32px) entre (1024px) y (1199px).
- Los cortes no son uniformes: el catálogo utiliza DesktopRestaurantList desde (768px), y BottomNav se oculta desde ese mismo corte. El hero utiliza carrusel hasta (1023px).
- En ventanas de menos de (500px) de alto y menos de (1024px) de ancho, la cabecera participa del flujo para liberar espacio.
- El footer móvil reserva (108px) más safe-area inferior. Los enlaces legales tienen un objetivo mínimo de (44px).

## Elevation & Depth

Las superficies principales del inicio son blancas y se distinguen con espacios y bordes discretos. El panel de foto y BottomNav conservan sombras concretas. La cabecera de escritorio conserva su blanco translúcido y blur; no se añade vidrio a los demás componentes. Los valores completos de sombra viven en el sidecar porque el formato de frontmatter no los admite.

El catálogo de escritorio mantiene su tratamiento anterior de fotos; no se documentan como primitivas vigentes las reglas CSS de tarjetas que no coinciden con el markup activo de DesktopRestaurantList.

## Shapes

Los controles conservan esquinas suaves; el CTA usa control y la búsqueda móvil search-phone. El selector activo usa mode-option; las tarjetas de teléfono restaurant-phone y los iconos de categoría category-phone. BottomNav mantiene una cápsula. El recorte asimétrico de la fotografía permanece en la home: ventana móvil (14px 14px 48px 14px), foto de escritorio (18px 18px 100px 18px).

## Components

### Buttons

El CTA y el carrito usan tinta oscura sobre blanco, con hover tinta de hover. El CTA móvil mide al menos (48px) de alto; en escritorio tiene padding (17px 20px), salvo la variante compacta. El foco móvil/tablet utiliza el naranja de interacción; el foco de escritorio conserva naranja Estrella. El estado de foco no se oculta.

### Search and mode selector

El campo móvil mide al menos (48px), recibe texto de (16px) y muestra borde y foco visibles. Enter y «Ver restaurantes» dirigen al catálogo real; limpiar restablece el listado. La navegación anima scrollY mediante la dependencia Framer Motion existente: (800ms normal / 450ms reducido), con curva cubic-bezier(.4,0,.2,1), margen CSS del catálogo y destino limitado al documento. El foco se mueve con preventScroll solo al terminar, o inmediatamente si ya está en el destino. Rueda, touch, pointer, cualquier tecla, resize, pestaña oculta, desmontaje y activación repetida detienen la animación; una repetición inicia el recorrido nuevo. Se retiró la antigua confirmación por opacidad de llegada. El usuario pidió expresamente animar esta navegación manual; la variante reducida es más corta, sin cambiar preferencias del navegador o sistema. Las modalidades usan botones con `aria-pressed`, sin convertir la elección en navegación.

### Categories and restaurant cards

Las categorías muestran selección en contorno, fondo y texto. El listado móvil conserva fotografía, nombre, categoría, modalidad y favorito. El listado que aparece desde (768px) conserva su componente de escritorio. Las muestras del sidecar usan nombres y metadatos de muestra, no ratings ni tiempos comerciales nuevos.

### Navigation

En teléfono, BottomNav conserva objetivos de (48px). Dentro del inicio, su fondo es blanco y su selección usa naranja de interacción. El desplazamiento hacia abajo lo oculta y hacia arriba lo devuelve, preservando el foco; oculto es inert. En ubicación y búsqueda móvil permanece visible. El estado de visibilidad respeta reduced motion; las animaciones internas heredadas de los iconos no se certifican como una revisión global de motion.

### Hero carousel

Hasta (1023px), una sola presentación contiene la fotografía y hasta cinco banners activos reales en el orden del backend. El arte usa contain, la foto cover. Botones anterior/siguiente y selección directa complementan el gesto horizontal; el desplazamiento vertical sigue disponible. Autoplay se detiene al interactuar, al enfocarse, fuera del viewport, con pestaña oculta y con reduced motion. La cadencia normal es de (6s). En modo normal hay deslizamiento horizontal (500ms) y revelado de borde (600ms). En reducido no hay autoplay ni desplazamiento del track: las diapositivas completas se apilan en grid y hacen crossfade simultáneo de (360ms), con curva cubic-bezier(.4,0,.2,1). Las diapositivas inactivas son inert y no reciben pointer events; la activa pasa a opacidad (1). Se sustituyó el fundido parcial anterior. No se inventan campañas ni se modifica la base de datos.

La fila del stack está acotada por minmax(0,1fr) y las diapositivas por min-height:0, para conservar la ventana de (220px) en teléfono y (380px) en tablet. El panel de foto conserva su separación inferior de (12px) dentro de la ventana.

## Do's and Don'ts

### Do:

- **Do** conservar Outfit, fotografía, marca y naranja Estrella al refinar esta home.
- **Do** usar blanco y gris frío en las superficies aprobadas del inicio.
- **Do** preservar foco visible, estados de selección y controles manuales del carrusel.
- **Do** mantener las diferencias reales entre los cortes del hero, catálogo y navegación.

### Don't:

- **Don't** aplicar este documento como sistema global de menús, checkout u otras rutas.
- **Don't** recolorear fotos, sellos o banners para forzarlos a la paleta de UI.
- **Don't** convertir muestras documentales en calificaciones, tiempos o promesas comerciales verificadas.
- **Don't** eliminar alternativas manuales o ignorar reduced motion.
