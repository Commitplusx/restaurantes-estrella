# Rendimiento del inicio — 24 de octubre de 2026

## Alcance y estado

Auditoría de `https://estrella-eats.mx/` y candidato **local, sin publicar**, basado en main `66f5e45`. Fuentes aisladas en `C:/Users/Kaleb/.codex/tmp/eats-db-privacy-20261017`; no se sobrescribió el árbol de experimentos `loyalty-estrella/estrella-eats`.

Se conservan contenido, composición, Outfit y animaciones. No cambia SQL, políticas, precios, OTP, pedidos, despacho, worker, APK ni WhatsApp. Las visitas automáticas ejecutan la analítica normal; no crean pedidos ni solicitan códigos. No se alteraron fotos o filas productivas.

## Hallazgos medidos y correcciones locales

| Prioridad | Problema y evidencia | Corrección local |
|---|---|---|
| P1 | Portada publicada: 10,346,702 bytes transferidos en Lighthouse móvil, de los que 9,333,105 eran imágenes. Categorías mostradas a 44 px descargaban JPEG de 440–596 KB. | Variantes WebP de 160 px de las mismas fotos. Dieciocho originales: 9,271,613 bytes; variantes: 65,508 bytes. Originales intactos. |
| P1 | Banner de 4200×2363: 2,003,440 bytes. Fachada de 1200×2607: 1,860,445 bytes y contenido PNG aunque se llame `.webp`. | `CatalogImage`: transformación pública `contain`, calidad 82, dos variantes compartidas: tarjeta 480×480 y banner 960×600. Sin recortar la imagen. Recuperación una sola vez al original si falla la variante. |
| P1 | El inicio publicado repite consultas al montarse. La caché preparada en otro árbol local no estaba en main ni en el artefacto publicado. | `PublicResource`, `useLandingCatalog` y `usePublicResource`: snapshot público compartido, deduplicación, caducidad y revalidación. |
| P2 | El `@import` externo de Outfit añadió una consulta CSS de ~2.1 s en la ejecución publicada. | Los mismos subsets variables latin/latin-ext servidos localmente, `font-display: swap` y preload de latin. |
| P2 | Logo de 3203×3203: 675,451 bytes para cabeceras pequeñas. | PNG de 192/512 px: 19,434/58,396 bytes, también en instalación y encabezados de menú. |
| P2 | Precarga PWA: 109 recursos, 14,801.24 KiB de archivos sin comprimir, con fotos fuera de pantalla. | 88 recursos, 4,229.65 KiB. Raster bajo demanda; imágenes públicas con actualización en segundo plano, máximo 50 entradas/siete días. Push conservado. |
| P2 | El cliente Supabase importa el compresor de subidas para todos los visitantes. | Import dinámico únicamente al subir una fotografía; misma ruta de subida. |
| P2 | Los assets con hash publicados responden `max-age=0, must-revalidate`. | Regla local `/assets/*`: un año e `immutable`, exclusivamente para el build con hash. HTML, SW y catálogo no reciben esa regla. Efectividad en Vercel pendiente. |

Mapbox ya usa `import()` en la vista del mapa: el SDK no se descargó en la portada medida. No se atribuye la lentitud a Mapbox ni se retira su función.

La lista de once restaurantes pesa **10,998 bytes JSON**; tres lecturas HTTP tuvieron TTFB de **1,047 / 1,236 / 549 ms**. Incluyen red/conexión/gateway: no prueban que PostgreSQL tarde eso. No se añadió un índice sin un plan SQL que lo justifique.

## Contrato de frescura y aislamiento

- Snapshots de datos públicos: 30 segundos frescos y hasta cinco minutos de retención durante actualización; sólo memoria del documento.
- Volver dentro del plazo fresco reutiliza la lista. Después se mantiene visible mientras revalida; foco, reconexión, visibilidad y revisión cada 60 segundos también actualizan.
- Realtime invalida restaurantes, categorías, promociones, cupones y banners. Una respuesta invalidada durante una consulta no sobrescribe la nueva revisión. No se editó el catálogo real para probar ese evento.
- Una consulta compartida por recurso; plazo de diez segundos, espera de diez segundos tras error y reintento manual. Error visible y retirada de datos vencidos. Sin reintento ilimitado ni éxito ficticio.
- Cien restaurantes por página, hasta diez páginas, orden estable nombre/ID y deduplicación. Se conservan `storefront_restaurants`, reglas de sucursales y promociones.
- Checkout conserva validación final de disponibilidad, opciones y precios en el servidor. Esta capa no guarda sesiones, clientes, beneficios, códigos ni pedidos.
- Imágenes: sólo se transforman URLs HTTPS de los buckets públicos `menu-fotos` y `publicidad` del proyecto esperado. Parámetros de versión conservados; URLs privadas, firmadas o ajenas intactas. El SW sólo cachea imágenes HTTP 200 de la propia web y esos buckets públicos.

## Medición local

Lighthouse 12.8.2/Edge headless, build de producción, misma URL local, móvil emulado con CPU/red limitadas. Son ejecuciones puntuales con variabilidad de red/caché, no percentiles ni un Android físico.

| Métrica | Anterior local | Final local |
|---|---:|---:|
| Bytes transferidos | 6,175,514 | 849,031 (**−86.3%**) |
| Primer pintado con contenido | 3.37 s | 2.52 s |
| Mayor pintado con contenido | 10.37 s | 5.35 s |
| Bloqueo total | 136 ms | 220 ms |
| Performance móvil | 67/100 | 72/100 |

Escritorio final local: **96/100**, FCP **0.58 s**, LCP **1.31 s**, bloqueo **7 ms**, 788,650 bytes. Sin baseline de escritorio: no presentar un porcentaje de mejora para ese dispositivo.

**No todos los indicadores mejoraron**: bloqueo móvil mayor en esta ejecución y LCP móvil todavía fuera de 2.5 s. Bienvenida y carrusel animado afectan al LCP observado. No se retiraron animaciones para mejorar una puntuación. Falta medir con la bienvenida completada y en móvil físico.

## Validación y límites

- Build TypeScript/Vite aprobado, con avisos heredados del compresor y tabla de navegadores. Ninguna dependencia nueva en `package.json`.
- ESLint de módulos nuevos de caché/imagen y hooks, y `git diff --check`: aprobados.
- **21 pruebas tipadas**: retorno sin lecturas extra, frescura, petición compartida, invalidación durante vuelo, error/retención/caducidad, timeout, vacíos, límites; transformaciones seguras y reglas/agrupación de promociones.
- Comando: `deno test --sloppy-imports --config tests/deno.web.json tests/publicResource_test.ts tests/catalogImage_test.ts tests/landingPromotions_test.ts tests/promotionRules_test.ts`. La primera ejecución omitió `--sloppy-imports`, requerido por imports Vite sin extensión; se corrigió el comando sin deshabilitar tipos.
- Consultas anónimas y transformaciones reales HTTP 200 comprobadas sin service role. Variantes estáticas reproducibles con `python scripts/optimize-home-images.py` y Pillow.
- Capturas automáticas móvil/escritorio revisadas: bienvenida, marca, Outfit y foto completa conservados. No sustituyen la revisión de tarjetas detrás del diálogo.
- Work devolvió control de navegador desactivado. **Entrar al menú y volver, filtros, favoritos y recepción Realtime no se certifican como prueba física**. La reutilización sí está ejercitada en las pruebas tipadas.
- Si falla una transformación, `CatalogImage` puede usar el original pesado una vez: preserva la foto, sin prometer el mismo ahorro durante una caída de Storage. Ese error no se simuló en navegador real.

Evidencia privada: `C:/Users/Kaleb/Desktop/pollo-robins-panel/.codex-tmp/eats-performance-20261024/`: HTTP y muestras, Lighthouse publicado/baseline/intermedio/final, build, variantes/hashes originales y capturas. No subir esos reportes crudos con URLs de API a un repositorio público.

## Pendientes separados

1. Revisión interactiva local; después publicar y medir el dominio. Main/Vercel todavía no contienen este candidato.
2. Medir la espera global de `getSession()` en `App.tsx` antes de montar rutas públicas, conservando aislamiento del portal. No se cambió autenticación.
3. Perfilar tareas largas de arranque y trabajo detrás de la bienvenida, sin retirar parallax.
4. Revisar subidas: `compressImage` puede devolver el archivo original y `subirFoto` conservar extensión `.webp`. Es compatible con el PNG mal etiquetado observado, pero no prueba qué llamada lo creó. Sólo cambió el import del compresor, no ese contrato.
