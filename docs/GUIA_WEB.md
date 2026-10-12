# Guía técnica de la web — 12 de octubre de 2026

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
