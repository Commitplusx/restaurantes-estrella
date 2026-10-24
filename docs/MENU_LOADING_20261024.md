# Carga del menú — 24 de octubre de 2026

## Estado y alcance

**Entrega a GitHub main, 24 de octubre:** fuentes del menú en `529605b`, junto con el inicio `87b183f` y esta documentación. Las referencias a candidato describen el estado durante las mediciones locales. Verificación del despliegue Vercel y recorrido interactivo en el dominio pendientes.

Candidato **local, sin publicar**, en `codex/eats-performance-20261024`, sobre la optimización de inicio `87b183f` y main `66f5e45`. Vista de revisión: `http://127.0.0.1:5262/menu/wingman-6846`.

Se conserva el diseño del menú, sucursales, opciones, carrito y animaciones. Sin migraciones, pedidos, OTP, WhatsApps, worker, APK ni despliegue Vercel. Las mediciones ejecutan la analítica normal de visitas. No se modificó el catálogo real para probar eventos.

## Ruta de carga

1. `App.tsx` mantiene el router montado también durante la espera de sesión. El fallback inicial y el de la página diferida muestran `RestaurantMenuSkeleton`: cabecera con regreso, identidad del negocio, categorías y tarjetas con las mismas reglas adaptables del menú real.
2. `PublicMenuView.tsx` consume `useRestaurantMenu`, que comparte `publicMenuResource`. Se elimina la caché anterior sin caducidad y la lectura duplicada del componente.
3. `publicMenuRequest.ts` valida el identificador. Con UUID, o con ID/slug conocido del inicio, consulta ficha y las cuatro partes del menú en paralelo. Un enlace directo por slug primero resuelve la ficha; después inicia las cuatro consultas. El dato del inicio sólo permite resolver el ID: nunca sustituye la ficha completa del servidor y se comprueban ID/slug.
4. `publicMenuCatalog.ts` lee `storefront_restaurants` y columnas explícitas de `menu_categorias`, `menu_items`, `menu_combos` y `menu_promociones`, siempre por restaurante. Las listas tienen límites y se validan antes de publicar un snapshot. Se retira una consulta de cupón automático cuyo resultado no se consumía en esta página; el checkout conserva su ruta.
5. `publicMenuData.ts` recibe `unknown` y comprueba identidad, pertenencia a sucursal, precios, opciones y reglas. Un fallo de una consulta no se convierte en un menú vacío exitoso. Los metadatos históricos de opciones dejan el producto visible y no comprable hasta corregir su configuración; no inventan elecciones vacías.

## Frescura, fallos y navegación

- Sólo memoria del documento: 20 segundos fresco, hasta 120 segundos retenido y máximo 20 recursos de menú en el pool. No persiste sesiones, pedidos ni datos de clientes.
- Una petición compartida por recurso; plazo de diez segundos y espera de diez segundos después de fallo, con reintento manual. Un fallo aborta las consultas hermanas. La versión invalidada en vuelo no puede sobrescribir otra revisión.
- Retorno dentro del plazo fresco sin nuevas lecturas. Después se conserva el snapshot reciente mientras se actualiza; si falla se muestra aviso y reintento. Los datos que vencen se retiran. Foco, reconexión, visibilidad y comprobación periódica conservan el contrato de `usePublicResource`.
- Realtime invalida las tablas del menú por sucursal y concilia una pausa inmediata con la siguiente lectura completa. Los cambios recibidos durante una consulta permiten una actualización posterior compartida; no hay bucle de reintentos sin límite.
- Enlaces del restaurante preparan el menú sólo con intención de pulsación principal o foco de teclado; una precarga especulativa a la vez, sólo con documento visible y conexión. El fallo de import de esa preparación se anuncia como `menu_prefetch_unavailable`; no bloquea la navegación normal.
- Actualizar conserva la categoría/combo/promoción seleccionada si todavía existe. Cambiar de restaurante limpia el detalle y selector anteriores. Las sucursales usan un recurso público compartido con retención acotada.
- El carrito sólo se concilia tras una nueva lectura completa de su propio restaurante. Un error, una respuesta parcial o el snapshot inicial cacheado no lo vacían. Se conservan cantidades, opciones y precios del borrador; el checkout servidor sigue validando el catálogo vigente.

## Peso de contenido

Fotos de menú con `CatalogImage`: variantes públicas compartidas de 480/900 px, selección adaptable y recuperación una vez al original si falla la transformación. Se conservan arte, proporción y parámetros de versión. La animación al carrito reutiliza `currentSrc` de la foto cargada y su geometría, sin descargar otra vez el original por el vuelo.

El SDK de Google del selector heredado ya no se carga al abrir el menú; sólo se monta si se abre ese diálogo. No se cambia de proveedor el carrito Mapbox ni sus tarifas. Sin clave o con fallo del SDK se presenta error explícito.

## Verificación y medición

Build TypeScript/Vite, ESLint pertinente y `git diff --check` aprobados. Se conservan los avisos heredados del build. La página grande conserva su `@ts-nocheck` anterior; los nuevos contratos, loaders, caché y pruebas se comprueban con tipos, sin añadir supresiones ni `any`.

**45 pruebas tipadas aprobadas**, incluidas identidad/consultas paralelas, retorno sin nuevas lecturas, petición compartida, invalidación, timeout, fallo parcial, aislamiento entre sucursales, carrito, selección de pestaña, opciones y geometría de animaciones:

```powershell
deno test --sloppy-imports --config tests/deno.web.json tests/publicResource_test.ts tests/publicMenuData_test.ts tests/publicMenuRequest_test.ts tests/menuOptions_test.ts tests/catalogImage_test.ts tests/landingPromotions_test.ts tests/promotionRules_test.ts tests/journeyGeometry_test.ts
```

Snapshots públicos reales validados: Wingman (8 categorías/59 productos), Pollo Robin’s (3/12, 6 combos/3 promociones) y Carnitas El Jr. (2/9). Las consultas explícitas del menú final respondieron HTTP 200 en Lighthouse.

Lighthouse 12.8.2/Edge headless, build de producción local, URL de Wingman, perfil móvil por defecto con CPU/red limitadas. Comparación puntual contra el candidato previo de inicio; no es un móvil físico ni percentiles de producción:

| Métrica | Anterior local | Final local |
|---|---:|---:|
| Transferencia | 732,603 bytes | 407,863 bytes (−44.3%) |
| FCP | 2.68 s | 2.68 s |
| LCP | 3.69 s | 3.99 s |
| Bloqueo total | 135 ms | 36.5 ms |
| Desplazamiento acumulado | 0 | 0 |
| Performance móvil | 84/100 | 83/100 |
| Cargas de Google Maps SDK | 1 | 0 |

**No se afirma que el primer acceso móvil sea más rápido**: menor transferencia y bloqueo no mejoraron FCP/LCP en esta ejecución. La consulta directa por slug conserva una dependencia inicial y la latencia del servicio varía. El retorno reciente sin nuevas lecturas está demostrado por contrato, no por un recorrido interactivo físico.

Escritorio final: 99/100, FCP 0.61 s, LCP 0.84 s, bloqueo 0 ms y 407,078 bytes; sin comparación de escritorio anterior.

Se inspeccionaron las capturas automáticas de móvil/escritorio y el filmstrip con skeleton seguido del menú real. La primera integración produjo `NO_FCP`: los enlaces del skeleton quedaban fuera del router durante la espera de sesión. Se conservó el reporte fallido y se corrigió montando el router antes de esa espera; los dos perfiles finales pintan y terminan sin errores de ejecución ni advertencias Lighthouse.

El control interactivo de Work sigue desactivado. Pendiente comprobar físicamente regreso, cambios de sucursal/categoría, opciones y vuelo al carrito, recepción Realtime y fallo de transformación. Las pruebas y capturas automáticas no se presentan como esa comprobación.

Evidencia privada, fuera de Git: `C:/Users/Kaleb/Desktop/pollo-robins-panel/.codex-tmp/eats-performance-20261024/`, reportes `menu-before-mobile`, `menu-after-mobile-failed`, `menu-after-mobile`, `menu-after-desktop`, filmstrip, build y snapshots de catálogo. No publicar los reportes crudos con URLs de API.
