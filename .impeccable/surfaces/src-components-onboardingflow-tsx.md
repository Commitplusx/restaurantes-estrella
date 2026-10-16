---
version: 1
slug: "src-components-onboardingflow-tsx"
primary_target: "src/components/OnboardingFlow.tsx"
related_targets: ["src/components/OnboardingFlow.css","src/hooks/useNoticeSlot.ts","src/lib/noticePreferences.ts","src/pages/PublicLandingPage.tsx","src/dev/WelcomeDesignPreview.tsx"]
---

# Bienvenida de clientes

## Scope and visitor mode

Operate. Presentar Estrella Eats y explicar su pedido real en dos pasos para móvil y PC. Extensión autorizada de la identidad de la web existente; conservar `PRODUCT.md`, `DESIGN.md` y su sidecar. No sustituir menús, checkout ni lógica de pedidos.

## Direction contract

THESIS: Una bienvenida breve que el cliente pueda completar, recorrer o saltar y que lo devuelva al catálogo existente.

OWN-WORLD: Blanco, Outfit, tinta, naranja Estrella, logo existente y foto `/desktop/comitan-table.webp` sin edición raster. El sistema documentado de home sigue acotado a su alcance original; este brief registra su extensión a bienvenida, sin inventar nuevos tokens globales.

STORY: «Comida de Comitán. A tu puerta.» presenta el servicio; «Tu antojo. Así de fácil.» explica explorar, elegir domicilio/recogida y confirmar con el código de WhatsApp. No añadir tiempos, calificaciones ni beneficios sin respaldo.

FIRST VIEWPORT: PC con cabecera de marca/Omitir, texto y foto en dos columnas y acciones al pie. Hasta 760px, pantalla completa con fotografía arriba y texto debajo. El cuerpo central permite scroll; cabecera y acciones conservan su espacio. Menos de 420px coloca progreso y acciones en filas distintas. Ventanas bajas de PC reducen márgenes.

FORM: Extensión ordinaria de la web, conforme a la petición de bienvenida «con el estilo web». No abrir otra exploración de identidad ni reemplazar DESIGN.md.

SIGNATURE INTERACTION: Dos pasos, indicadores directos, Cómo pedir, volver, Ver restaurantes y Omitir. Flechas cambian de paso, Tab/Shift+Tab quedan dentro del diálogo y Escape completa/omite. Apertura enfoca el diálogo, vuelve inert `#root`, bloquea scroll del body y restaura sus estados y foco al cerrar. Reduced motion elimina desplazamientos y transiciones.

FINISH: Revisión local de 322×844, 1440×875 y geometría de 1024×600; sin overflow horizontal a 322/1024/1440px. Se comprobaron avance, regreso, omisión, reapertura, foco, inert, Escape y liberación de cola. Finish reviewer devolvió ship tras corregir anuncio push y capturas móviles. Build final y ESLint de módulos nuevos aprobaron. No atribuir lector de pantalla físico, Safari/iOS físico ni publicación a esta evidencia.

## State and integration

`OnboardingFlow` solicita prioridad 100 a la cola compartida, por delante de privacidad 20 y push 10. Se monta en portal de body con diálogo modal nombrado. Completar escribe `estrella_onboarding_done=true` por el adaptador de preferencias y ejecuta el callback existente; no navega por un checkout nuevo. Si localStorage falla, la elección se mantiene en memoria durante ese contexto, sin garantía tras recarga.

Logo y foto son activos existentes reutilizados; el vídeo y los artes antiguos con texto dejan de intervenir. Imagen fallida muestra fallback de icono. `/bienvenida` es una ruta DEV que monta el componente real y permite reabrir; completar también cambia la preferencia local.

Estado al cierre documental: local, publicación pendiente de evidencia separada. Contratos, capturas y límites: `docs/WELCOME_AND_NOTIFICATIONS_20261016.md`.
