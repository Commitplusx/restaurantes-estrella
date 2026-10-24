# Textos de clientes y prioridad de marcas — 24 de octubre de 2026

## Bienvenida: entrega a main

Después de la entrega `cd28768`, Kaleb pidió trabajar específicamente el lenguaje del onboarding. Fuentes funcionales hasta `23a4cc6`, incluidas en la subida autorizada a GitHub main del 24 de octubre: sólo literales de `OnboardingFlow.tsx`, conservando las tres pantallas, las animaciones, la navegación, el foco, las preferencias y los permisos. Despliegue efectivo en Vercel pendiente de comprobar.

- Entrada: «¿Qué vas a comer hoy?»; explicación breve de elegir restaurante y pedir a casa o para recoger.
- Pedido: «Así armas tu pedido»; comida, modalidad/dirección y «Revisa el total y confirma tu pedido».
- Seguimiento: «¿Cómo va tu pedido?»; detalles, cocina/recogida/entrega y «Recíbelo o pasa por él».
- Botones: «Saltar», «Cómo pedir», «Cómo ver mi pedido» y «Ver restaurantes». Sin promesas nuevas de velocidad, precio o disponibilidad.

Corrección posterior de Kaleb: no mencionar códigos, WhatsApp ni PIN en la bienvenida. Se retiraron esas referencias del onboarding. El checkout y las instrucciones de entrega conservan su verificación real en el momento correspondiente; no se desactivó ni ocultó un requisito al confirmar una operación.

Build TypeScript/Vite y ESLint del componente aprobados. No se añaden pruebas que sólo comparen frases estáticas. Vista repetible de desarrollo existente: `http://127.0.0.1:5263/bienvenida`; permite volver a abrirla sin borrar el carrito ni las preferencias del origen de producción local en 5262. El build normal 5262 también contiene los textos, pero la bienvenida sólo aparece allí a quien todavía no la haya completado.

La entrega añade este registro documental a las fuentes ya compiladas y revisadas; no cambia nuevamente el componente. Los archivos generados por el servidor DEV bajo `dev-dist` quedan fuera de los commits y de la subida.

Capturas automáticas de la pantalla inicial a 390 × 844 y 1280 × 900 inspeccionadas: texto completo y botones visibles, sin error de ejecución. Los pasos dos/tres se revisaron en código, pendientes de recorrido interactivo. Lighthouse mantiene 94/100 de accesibilidad por la restricción heredada de zoom del viewport; los avisos de recursos del servidor DEV no se presentan como una medición de producción. Se conservaron `welcome-copy-*` y el log de build en la evidencia privada del workspace principal.

## Entrega anterior

Estado de entrega: código funcional `5ba8179`, incluido en la subida autorizada a GitHub `main` del 24 de octubre junto con los banners móviles. Despliegue efectivo en Vercel pendiente de comprobar. Se conserva el build de producción local en `http://127.0.0.1:5262/`; la rama de preparación es `codex/eats-mobile-banners-20261024`.

## Lenguaje

Revisión del inicio, búsqueda, bienvenida, menú, carrito, beneficios, avisos y seguimiento. Se mantiene la identidad de Estrella Eats y se sustituyen frases genéricas, jerga interna y promesas innecesarias por el estado o la acción real.

| Antes | Ahora |
| --- | --- |
| «¡Uy, qué vacío!», seguido de «muchísimas opciones deliciosas» | «No encontramos restaurantes», con instrucciones según los filtros |
| «Tu carrito, a tu manera» | «Guardamos tu carrito», conservando la explicación y enlace de privacidad |
| «Tu pedido empieza aquí» | «Tu carrito está vacío» |
| «¡Cupón de Plataforma Aplicado!» | «Cupón aplicado» |
| «tomó un descanso» | «no está recibiendo pedidos por ahora» |
| «Vamos a encontrar tu pedido» | «No pudimos abrir este pedido», con la recuperación existente |
| «Ver Ticket Completo» | «Ver mi pedido» |
| «Instala la app y pide en segundos» | «Ábrela desde tu pantalla de inicio» |

Se usa **pedido** de forma consistente y se evita mostrar «tracker» al cliente. La búsqueda habla de comida/restaurantes; las categorías no se presentan como populares sin datos que lo demuestren. Se conservan las condiciones de promociones, la verificación por WhatsApp, las instrucciones del PIN, las acciones de recuperación y el aviso de notificaciones/promociones. El cierre del aviso PWA recibe un nombre accesible y el enlace de marca incluye su texto visible en el nombre accesible.

El vacío de «Cerca» explica el radio real de dos kilómetros. «Ver todos los restaurantes» limpia también esa pestaña, además de búsqueda/categoría, para que la acción corresponda con su texto.

Los documentos legales y los textos/arte cargados por cada restaurante no se reescribieron. La página de beneficios conserva las afirmaciones comerciales preexistentes sobre precios, saldo y referidos; esta revisión de redacción no certifica nuevamente esas reglas del backend. No hay cambios a importes, elegibilidad, consentimiento ni creación de pedidos.

## Prioridad solicitada por Kaleb

`src/lib/restaurantPriority.ts` define el orden **Makitán → Pollo Robin’s → resto del catálogo**, por IDs públicos de marca verificados en una lectura acotada de `storefront_restaurants` el 24 de octubre. No se decide por coincidencias del nombre. La lectura devolvió once ubicaciones activas y con perfil completo, incluidas Makitán y las tres de Robin’s.

El `matriz_id` permite que las sucursales hereden el lugar de la marca aunque cambie el nombre o no esté la matriz en el resultado. `useLandingCatalog` entrega ese orden a búsqueda y lista del mapa. El listado principal lo reaplica después de filtros, orden de apertura/distancia y selección de una sucursal por marca; así conserva la sucursal elegida y prioriza la marca en móvil y escritorio.

El orden es estable: entre sucursales de la misma marca y entre restaurantes sin prioridad se conserva el criterio existente. No se modifica el array del snapshot ni los datos de disponibilidad. Un restaurante cerrado mantiene su etiqueta; uno inactivo, incompleto, excluido por el filtro o fuera del radio no se inserta artificialmente. Favoritos sigue mostrando sólo los elegidos por el cliente. No se alteró el orden del feed de campañas ni las reglas de las ofertas.

La prioridad actúa sobre el catálogo cargado por la paginación existente. El catálogo verificado cabe completo en la primera página de cien ubicaciones; no se añadieron solicitudes, suscripciones, dependencias, campos SQL ni cachés para esta regla.

## Verificación

- Build TypeScript/Vite aprobado, conservando las advertencias heredadas de tamaño de chunk y `eval` dentro de Lottie.
- ESLint de los componentes tipados y la nueva regla/pruebas aprobado. No se afirma limpieza completa de las páginas heredadas con supresiones preexistentes.
- Doce pruebas con tipos: seis de prioridad, aislamiento por marca, sucursal sin matriz visible, conservación de filtros/orden/objetos y seis de agrupación/elegibilidad de promociones.

Antes de subir se ejecutaron juntas esas doce pruebas y las siete de carrusel/imágenes: **19 aprobadas, cero fallos**, con comprobación de tipos. ESLint de los componentes tipados nuevos/modificados aprobado. Las fuentes coinciden con el build local ya verificado; la entrega añade sólo el registro documental del estado de publicación.

```powershell
deno test --sloppy-imports --config tests/deno.web.json tests/restaurantPriority_test.ts tests/landingPromotions_test.ts
```

El primer intento de pruebas omitió `--sloppy-imports` y falló resolviendo imports sin extensión del frontend; se repitió con el comando documentado, conservando la comprobación de tipos. No se rebajaron expectativas ni se usó `--no-check`.

Capturas automáticas del build local con Lighthouse/Edge: bienvenida a 390 × 844 y beneficios a 1280 × 900. Textos visibles completos, sin error de ejecución; revisión de los demás estados por código. La segunda auditoría conserva 94/100 de accesibilidad, con la restricción heredada de zoom del viewport pendiente. La primera detectó además falta de nombre en el cierre PWA, desajuste del nombre del enlace de marca y contraste del botón PWA: se corrigieron los nombres; el botón de instalación no apareció en la captura final y su contraste heredado no se declara corregido. Los reportes de rendimiento no se usan para afirmar una mejora de velocidad por este cambio de texto.

La revisión automática de las páginas locales no equivale a una prueba física de búsqueda, permisos push o checkout. No se enviaron códigos, pedidos, WhatsApps ni notificaciones. Evidencia privada bajo `.codex-tmp/eats-performance-20261024` en el workspace principal; los reportes crudos no se versionan porque pueden contener URLs de servicios.
