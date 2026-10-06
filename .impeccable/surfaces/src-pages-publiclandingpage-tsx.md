---
version: 1
slug: "src-pages-publiclandingpage-tsx"
primary_target: "src/pages/PublicLandingPage.tsx"
related_targets: ["src/components/DesktopLandingIntro.tsx","src/components/DesktopRestaurantList.tsx","src/components/MobileLandingCarousel.tsx","src/components/BottomNav.tsx","src/components/desktopLanding.css","src/lib/landingBanner.ts"]
---

# Desktop landing

## Scope and visitor mode

Persuade. Redesign the public landing at widths >=1024px only. Preserve the mobile and tablet implementation below that threshold. The user explicitly chose the Uber Eats desktop/web reference, presentation before restaurants, and building directly in code.

## Direction contract

THESIS: Introduce Estrella Eats through an immediately usable food search, then its actual restaurant catalog. The pinned Uber Eats reference overrides the random concept assignment.

OWN-WORLD: White navigation, black functional controls, restrained Estrella orange, broad food photography, locally served Manrope, clear rectangular search fields, and unboxed restaurant photography. No decorative seals, kicker labels or invented ratings.

STORY: Understand this is Estrella Eats in Comitán, choose delivery or pickup, search for food, and enter a real restaurant menu.

FIRST VIEWPORT: An 80px navigation strip, full-width food photograph with a 52px heading and working search form positioned to the left, then the beginning of categories and restaurants. The search submit scrolls directly to the filtered catalog.

FORM: User-pinned category standard, Uber Eats desktop web. Seed 1a95f51c was run; its assigned index 6 and catalog challengers do not replace the explicit user preference. Code-first is the confirmed workflow.

SIGNATURE INTERACTION: One continuous path from the hero search to the catalog, with keyboard submission, category selection, and visible result counts. Respect reduced motion for scrolling and transitions.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance


## Mobile adaptation — 2026-10-06

The user now requests only the home on mobile, in the same style as the actual PC implementation, with responsive phone and tablet layouts. This supersedes the former desktop-only scope for this surface. The rendered incumbent is the visual authority: warm paper (#faf7f2), dark ink (#28231e), orange (#ea4e25), Outfit lettering, a three-line headline and the existing local-table photo. The earlier white/Manrope/full-width-photo contract does not describe that rendered incumbent; no PC identity replacement is included here.

Responsive contract: shared semantic header and hero; phone touch targets >=44px, search input 16px, a single-column hero, two-column tablet hero from 640px, legacy PC layout from 1024px. Keep real catalog filters, favorites, pickup/delivery, menu/cart/benefit routes and the existing mobile map/search tabs. Search hides the mobile presentation so the filtered catalog is immediately reachable; Enter scrolls to it. Benefits stay in the phone header without duplicating the hero action. Footer remains dark to the bottom with navigation and safe-area clearance. The inherited white bottom-dock gradient must not cover the footer or legal links; the user explicitly reported that defect in a Safari screenshot.

Work is local, not deployed. No menu or checkout page styles are changed. Browser viewport captures verify layout; Chromium emulation does not prove physical Safari gesture behavior. The photo is reused as-is; no raster assets generated or replaced.


### User follow-up — mobile hero banners

The photo area below 1024px now also contains the actual active app_banners records (up to five, original order), in a shared mobile/tablet carousel after the table photo. Keep PC photography unchanged. Slides move horizontally, with previous/next and direct-selection buttons; autoplay uses a six-second interval, pauses on interaction/focus/hover and hidden tabs, and stays disabled under reduced motion. A horizontal pointer gesture changes a slide; touch-action pan-y preserves vertical page scrolling. The separate old mobile banner strip and timer have been removed so there is only one presentation flow. Images use contain to retain text in the supplied banner artwork. Reserve media/control space during loading; validate external banner records at the load boundary. No banners are created or modified in the database.

UI UX Pro Max was requested and installed globally from nextlevelbuilder/ui-ux-pro-max-skill/.claude/skills/ui-ux-pro-max. Its broad carousel search did not provide a verified specific hit after one retry; the explicit auto-rotation-controls, dragging-alternative, reduced-motion and touch guidance in references/quick-reference.md was applied instead. No private project data was sent to its search.

### Latest interaction and language steering

BottomNav hides on downward scrolling beyond 100px and returns on upward scrolling, using the existing scroll-direction state with an 8px threshold. Keep focused navigation visible; hidden navigation is inert and removed from accessibility navigation. The mobile location/search tabs retain a visible dock. Exit is 180ms, return 280ms; reduced motion changes state immediately. Carousel movement is a 500ms horizontal transition with one 600ms bounded edge reveal. Autoplay also stops when the carousel is outside the viewport. Keep banner artwork, manual controls and the six-second interval.

The user reported that the website copy felt generic and AI-written. Use direct Spanish grounded in the product and Comitán. The home title is “Comida de Comitán. A tu puerta.” and changes to “Para llevar.” with pickup. CTA is “Ver restaurantes”; location and search labels name their function. Replace the unsupported “Populares” label with “Para empezar” on the existing initial restaurant row, without changing its order. Footer describes the actual ordering service and names Comitán instead of presenting an unverified live-service status. Existing banner artwork and legal text remain supplied content. Preserve the three-line composition and white palette.

The user's latest component screenshot confirms the photo/caption/arrow composition and asks for visible transitions after arrow taps and after “Ver restaurantes”. Normal motion keeps the slide/reveal and native smooth scrolling. Reduced motion uses a short 180ms opacity transition for the active banner instead of spatial movement. The CTA moves keyboard focus to the catalog without an extra jump and gives the category region a bounded opacity arrival (700ms normal / 180ms reduced). Repeat activation cancels the previous arrival, and unmount cancels it. These are action feedback, not a page-wide entrance sequence.

### User rejects abrupt transitions — 2026-10-06

The user reports that “Ver restaurantes” still jumps and requests actual animation for both actions. This supersedes the previous native-scroll/arrival-fade approach. Animate the scroll position itself through the existing Framer Motion dependency: 800ms normally, a shorter 450ms for the explicitly requested manual navigation under reduced motion, with an ease-in/out curve, clamped document bounds and the CSS scroll margin. Focus the catalog only after completion; avoid an animation when already at the destination. Repeat activation replaces the previous animation. Wheel, touch, pointer, keyboard input, viewport resize, document hiding and unmount stop it without stealing focus.

Under reduced motion, stack the existing carousel slides in the same track and crossfade the complete outgoing/incoming slides over 360ms. No image jump followed by a partial fade. Normal mode retains the existing horizontal transition and edge reveal. Inactive slides are inert. Reduced-motion autoplay remains disabled; no operating-system or browser preferences are changed. The user explicitly requested manual animated navigation; the reduced path limits its duration and removes spatial banner movement.


### Latest palette steering — white / Apple-like

User explicitly requested white colors, Apple-like, while preserving the composition. This supersedes the warm-paper palette for the home at all widths. Final UI surfaces are white (#ffffff), cool light gray (#f5f5f7), dark ink (#1d1d1f), gray dividers (#e8e8ed), and the existing orange accent. Header, restaurant surfaces and photo-caption panel use white; footer uses the same cool light gray, without the removed haze. Keep Outfit, imagery, hero layout, carousel, routes and brand. Footer legal anchors now have a 44px mobile target. This is a palette refinement of this landing only, not an application-wide design replacement.

### Documentation snapshot — 2026-10-06

Esta superficie es una extensión del inicio existente. Los anexos de adaptación, lenguaje, movimiento y paleta prevalecen sobre el contrato histórico desktop-only/Manrope/papel cálido/footer oscuro. No se eligió una nueva identidad para toda la aplicación.

Cortes efectivos de la implementación: hero en una columna hasta 639px, dos columnas desde 640px, foto de PC desde 1024px. Carrusel hasta 1023px; DesktopRestaurantList desde 768px y BottomNav visible por debajo de 768px. Las diferencias de corte son estado real conservado. La búsqueda móvil/tablet oculta la presentación y hace accesible el catálogo; CTA y Enter conducen a eats-desktop-categories, región etiquetada y enfocada con preventScroll.

Snapshot vigente de movimiento tras el rechazo del salto: 500ms de slide y 600ms de revelado en modo normal; diapositivas completas apiladas y crossfade de 360ms en reducido, sin autoplay ni transformación del track. CTA y Enter animan scrollY con Framer Motion en 800ms normal/450ms reducido; destino acotado al documento y margen CSS. Foco preventScroll solo al finalizar o si ya está en destino. Se detiene por wheel, touchstart, pointerdown, cualquier tecla, resize, ocultar pestaña, desmontaje o repetir; repetir reemplaza el recorrido. Se retiró la opacidad de llegada anterior. motion-validation.md aporta posiciones intermedias reales, opacidades de ambas diapositivas y cancelación observada en reduced-motion=true. Modo normal y Safari físico siguen comprobados solo por fuente/no certificados.

La paleta blanca explícitamente aprobada se documenta como sistema acotado en DESIGN.md y .impeccable/design.json. Antes no existían esos archivos; el sistema global de otras rutas permanece sin documentación verificada. Reutilizar foto, marca y banners sin cambios raster. Los 4.8/25–35 min heredados siguen sin verificación aportada y no son nuevos compromisos de producto.

Estado: local en http://127.0.0.1:5188/, sin publicación. Evidencia y límites en .impeccable/review/validation.md, measurements.json y documentation.md; las capturas de nav anteriores solo prueban visibilidad. El cierre documental no sustituye el veredicto del finish reviewer.

Recheck tras la corrección de contraste del revisor: las etiquetas y metadatos text-slate-400 de ofertas y filas móviles usan #6e6e73 solo hasta 1023px; color calculado confirmado y contraste 5.07:1 sobre blanco. El posterior recheck de movimiento consulta los seis viewports actualizados y motion-validation.md. El ship anterior corresponde a la corrección previa de contraste; no aprueba por sí mismo este delta de scroll/crossfade. Paleta y alcance de producto se conservan; las limitaciones de modo normal observado y Safari físico siguen vigentes.

Corrección final del stack reducido: fila minmax(0,1fr) y diapositivas min-height:0 evitan que el tamaño intrínseco de la fotografía expanda la fila. Se verificaron ventana/slide de 220px en teléfono y 380px en tablet, con caption a 12px del borde inferior. Las seis capturas vigentes se reabrieron tras esta corrección; el crossfade simultáneo sigue observado, sin alterar los tiempos.
