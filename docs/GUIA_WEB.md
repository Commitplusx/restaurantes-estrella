# Guía técnica de la web — 12 de octubre de 2026

**Entrega a GitHub main — 24 de octubre:** optimización del inicio `87b183f` y carga de menú `529605b`, con sus fuentes, assets, pruebas y documentación. Las notas de candidato siguientes conservan la evidencia local previa a esta entrega. Build y 45 pruebas tipadas aprobados; capturas automáticas móvil/PC revisadas. Publicación efectiva en Vercel y recorrido interactivo del dominio pendientes de comprobar. No incluye cambios de backend, SQL, worker, OTP ni APK.

**Carga del menú — candidato local, 24 de octubre:** skeleton con la distribución real en móvil/PC, menú público compartido (20 s fresco/120 s retenido), consultas paralelas con ID conocido y precarga por intención. Errores visibles sin vaciar el menú o carrito por una lectura parcial; selección y animaciones conservadas. 45 pruebas tipadas y build aprobados; medición móvil local de 733 KB a 408 KB, sin mejora clara del primer pintado. Sin publicar; interacción física pendiente. [Contrato, evidencia y límites](MENU_LOADING_20261024.md).

**Rendimiento del inicio — candidato local, 24 de octubre:** composición y animaciones conservadas, imágenes a tamaño de uso, Outfit local y snapshots públicos con caducidad/revalidación. Medición móvil local de 6.18 MB a 0.85 MB transferidos; 21 pruebas tipadas y build aprobados. Sin publicar; revisión interactiva de retorno/filtros pendiente por control de navegador desactivado. [Hallazgos, contrato y límites](HOME_PERFORMANCE_20261024.md).

**Movimiento obligatorio, 17 de octubre:** el selector manual se elimina de todas las entradas, incluida bienvenida y DEV. Se ignora la elección antigua y se presenta movimiento completo. [Política, alcance y verificación](MOTION_REQUIRED_20261017.md). Las referencias siguientes a controles o modo reducido describen versiones anteriores.

**Actualización del 17 de octubre:** recibos, tracker y tarjetas activas usan la RPC de seguimiento con acceso privado en el fragmento; catálogo/sucursales usan la vista pública. La recuperación de otro pedido no consume el carrito nuevo. [Contrato, pruebas, dependencia push y límites de publicación](TRACKING_ACCESS_20261017.md). Se envía a main para que Kaleb compruebe Vercel; las lecturas amplias del backend siguen pendientes de corte. Los apartados anteriores son historial cuando discrepan con esta actualización.

## Fuente y alcance

Arquitectura central: [Loyalty, archivo de la raíz `arquitectura_sistema_v2.md`](https://github.com/Commitplusx/loyalty-estrella/blob/main/arquitectura_sistema_v2.md). Esta guía describe el frontend comprobado en `restaurantes-estrella`; no sustituye esa arquitectura ni certifica el estado productivo de PostgreSQL, Edge, WhatsApp o la APK.

En local, la web está en `loyalty-estrella/estrella-eats`, que es un repositorio Git independiente enlazado desde Loyalty. Comprobar el repositorio y la rama antes de hacer commit. El diseño y navegación de información pública se subieron primero en `3c51df8`, después del aviso PWA `93b53ec`, el catálogo compacto `728088a` y menú/carrito `cdde377`.

## Mapa de rutas y archivos

`src/App.tsx` resuelve sesión y dominio, carga las páginas de forma diferida y monta los avisos compartidos dentro de `BrowserRouter`.

| Ruta | Entrada | Responsabilidad |
| --- | --- | --- |
| `/` | `PublicLandingPage.tsx` | Catálogo, búsqueda, categorías, favoritos y banners |
| `/menu/:id` | `PublicMenuView.tsx` | Menú y opciones del restaurante; agregar al carrito |
| `/menu/:id/carrito` | `CartPage.tsx` | Productos → entrega/contacto → efectivo → OTP |
| `/success` | `SuccessPage.tsx` | Leer el pedido persistido y, si está confirmado, abrir el tracker |
| `/tracker` | `TrackerPage.tsx` | Leer pedido/repartidor y seguir cambios por Realtime |
| `/beneficios` | `BeneficiosPage.tsx` | Beneficios y acceso al catálogo |
| `/privacidad`, `/terminos` | `PrivacyPage.tsx`, `TermsPage.tsx` | Lectura de documentos con índice y enlaces |
| `/login`, `/portal/*` | `LoginPage.tsx`, `PortalPage.tsx` | Acceso y operación del restaurante según sesión |

La cuenta principal administra sus ubicaciones en **Sucursales**. Cada local tiene login con teléfono y contraseña generada; la cocina del grupo y los menús por local conservan su `restaurante_id`. Consulta [alta, accesos y contratos de sucursales](BRANCHES_20261015.md). El backend está publicado con `branch-access` v1 y las migraciones `20261015000003`/`004`, verificado con una marca temporal real y limpieza completa.

Los dominios aliados se identifican en `App.tsx`; no deben alterar los patrones de email canónico del backend. `vercel.json` conserva el rewrite del menú a `api/seo-menu` y el fallback de la SPA a `index.html`.

## Estado y fronteras del checkout

`src/store/useCartStore.ts` persiste el borrador en `estrella-cart-storage`. La ubicación, referencias y clave de idempotencia usan las claves existentes de `sessionStorage`; el acceso al pedido activo usa `est_active_order`. Un borrador del navegador no es un pedido aceptado por el servidor.

1. El menú conserva identidad del producto, opciones y cantidades. El carrito presenta el cálculo provisional.
2. `DeliveryLocationPicker` usa Mapbox para el mapa, pin y búsqueda permanente habilitada. `src/lib/deliveryLocation.ts` valida los datos. La cobertura/cotización conserva H3 y las reglas existentes: Mapbox no asigna tarifas ni repartidores.
3. `CartPage` solicita `auth-otp`, acción `request-client-otp`, con teléfono y clave idempotente; guarda el desafío recibido.
4. Envía `verify-and-order` con desafío, código y borrador. La Edge deriva al gateway existente `cash-checkout-gateway.ts`, que valida el catálogo y llama a `checkout_cash_order` en PostgreSQL. No insertar `pedidos` desde la web ni aceptar totales calculados por el cliente como autoridad.
5. Sólo después de una respuesta con pedido válido se limpia el carrito y se abre `/success?pedido=...`. Success comprueba el registro persistido y reemplaza la ruta por `/tracker?pedido=...`; un parámetro de URL de pago no confirma nada.
6. Cocina, asignación, aceptación, recogida y entrega corresponden a las RPC y procesos asíncronos documentados en Loyalty. El frontend presenta ese estado; no arranca otro algoritmo de asignación.

El checkout actual ofrece efectivo. Los diagramas antiguos de Mercado Pago no describen este recorrido activo. Los callbacks y documentos legales heredados no autorizan volver a habilitar pagos en línea.

La consulta previa de lealtad es opcional: `CartPage` → `useCheckoutLoyalty` → `clientes.maybeSingle()`. Separa ficha válida, ausencia y fallo; valida el contrato, aborta respuestas anteriores y ofrece reintento explícito con plazo de ocho segundos. Una ficha ausente no provoca 406 ni se crea artificialmente desde el navegador. La validación final de beneficios sigue en el servidor. Ver [causa, pruebas y publicación](LOYALTY_LOOKUP_20261012.md).

## Presentación y navegación

Inicio: `DesktopLandingIntro`, `DesktopRestaurantList` y `LandingFoodCategories`. Menú: componentes `MenuProductCard`, `RestaurantMenuIdentity` y `MenuDetailsFrame`. Carrito: `CheckoutHeader`, `CheckoutStepScene` y `DeliveryLocationPicker`.

Información pública: `PublicInfoLayout` comparte cabecera, footer, foco y regreso al inicio. `LegalDocument` conserva el texto legal existente; `PublicInfoLink` coordina una salida acotada antes de navegar. Ver restaurantes usa `/#eats-desktop-categories` y el mismo desplazamiento del inicio, con cancelación por interacción y posición recalculada mientras cambia el layout. No se añadieron consultas ni estados persistidos para las animaciones.

La entrada de documentos dura 420ms y la salida 180ms; navegación a los 190ms, una sola operación pendiente, temporizador retirado al desmontar. Los enlaces modificados, descarga y nueva pestaña conservan su comportamiento nativo. Reducir movimiento elimina el desplazamiento y la espera. La barra horizontal móvil está oculta mediante CSS; el carrusel conserva gesto, scroll y navegación por teclado.

## Publicación y evidencia

| Superficie | Publicación | Comprobación necesaria |
| --- | --- | --- |
| Web | GitHub `main` → Vercel `deiffs-projects/restaurantes-estrella` | Commit, Ready, dominio y comportamiento real |
| Supabase | Migraciones y funciones en el proyecto correcto | Esquema, fuente activa, permisos y pruebas del servidor |
| Worker | VPS/PM2, archivos revisados | Tenant/emisor, respaldo, hashes y salud |
| APK | Compilar e instalar Flutter | Build instalado y prueba en teléfono |

Esta entrega ejecutó build TypeScript/Vite y ESLint de las páginas nuevas; probó enlaces, índices, foco, retorno al catálogo y filtros. Se revisaron pantallas de 320/390px y 1280px, además de la comprobación previa del inicio en 768/1024/1919px. El navegador de prueba reporta reducir movimiento activado: esa variante se ejercitó realmente; la secuencia de movimiento normal se verificó en código, sin afirmar una prueba física en todos los dispositivos. Las capturas locales y el recibo de publicación se conservan en el workspace de trabajo, fuera del código del producto.

## Preparación de la siguiente revisión de backend

El checkout local de Loyalty conserva cambios anteriores en Edge, APK, paneles, migraciones y archivos de arquitectura, incluidos archivos sin versionar y eliminaciones. Esta entrega no los sube como un lote ni demuestra que coincidan con producción. No limpiar ese trabajo, ni desplegarlo por existir en local.

Antes de cambiar backend: elegir el síntoma, comprobar tenant/proyecto, leer la arquitectura central y las reglas del proyecto; comparar local con fuentes activas y esquema/checks/FK/RLS; seguir entrada → estado → regla → salida; revisar idempotencia y error real; probar el contrato y conservar evidencia del despliegue autorizado. El primer inventario debe resolver las diferencias locales/productivas y los anexos de documentación pendientes de versionar. No declarar preparado todo el backend por haber aprobado el build de la web.

## Movimiento conectado — 17 de octubre de 2026

Entrega posterior autorizada a GitHub main: [opciones y reemplazo de carrito](MENU_CHOICES_LOCAL_20261017.md) y [parallax individual por fotografía](PARALLAX_REFINEMENT_LOCAL_20261017.md). Incluye validación de precios/opciones, confirmación real antes de reemplazar y geometría acotada con observación compartida. Sin bibliotecas nuevas. La revisión visual está pendiente de acceso al navegador; la subida a GitHub no equivale a una verificación de Vercel, Supabase o APK. El recibo anterior descrito a continuación pertenece a `1ba10e9`.

Foto continua entre tarjeta/menú y regreso al catálogo, vuelo ligado a agregados reales del carrito (incluido el primero y opciones) y encabezado compacto del restaurante. Geometría proporcional, restauración de posición vertical/lateral una sola vez, medición real del header y cancelaciones/vencimientos acotados. Se conserva la política obligatoria de movimiento. No modifica reglas, precios ni consultas del backend. Build, lint, 16 pruebas tipadas, navegador 320/390/1280 y confirmación del build de producción comprobados; delta de 2478 bytes gzip de JavaScript sin dependencias. [Contrato, presupuesto y límites](CONNECTED_MOTION_20261017.md).
