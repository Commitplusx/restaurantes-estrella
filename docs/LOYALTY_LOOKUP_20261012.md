# Consulta de lealtad del carrito — 12 de octubre de 2026

## Causa comprobada

La consulta del carrito pedía un objeto único con `.single()` al buscar por teléfono en `clientes`. En el proyecto Loyalty `jdrrkpvodnqoljycixbg`, el número reportado por el usuario (terminado en 7971) devuelve cero filas, también al comprobar el formato normalizado. Una persona sin ficha de lealtad es un resultado posible del checkout público; exigir una fila provocaba el HTTP 406.

Se comprobó el esquema activo por SQL de sólo lectura: `telefono` es obligatorio y único, `nombre` y `qr_code` son obligatorios, y RLS está habilitado con una política de lectura pública ya existente. No hay un filtro por tenant en esta tabla global del programa. La ausencia concreta no se debe a duplicados ni a un formato alternativo encontrado. No se insertaron clientes, se modificaron políticas, se acreditaron puntos ni se crearon pedidos para resolver la consulta.

## Corrección

`CartPage.tsx` → `useCheckoutLoyalty.ts` → consulta existente `clientes` con `.maybeSingle()` → `checkoutLoyalty.ts` valida el dato externo antes de presentarlo.

- Una fila válida conserva puntos, VIP, saldo y envíos disponibles; cero filas produce «Tu número aún no tiene historial de lealtad».
- Error de red/permisos, varias filas o contrato inválido producen un estado de error separado con «Reintentar». No se presentan como cero pedidos.
- Debounce de 400 ms, una consulta por cambio/intento y plazo de ocho segundos; desmontar o cambiar el teléfono aborta la consulta anterior. La clave teléfono/intento oculta inmediatamente datos anteriores, incluso antes de la limpieza del efecto.
- La espera artificial de dos segundos se retiró. Sólo una consulta vigente y válida puede activar el beneficio; el usuario conserva el interruptor de aplicación.
- Las fuentes no registran teléfonos, nombres, saldos ni payloads de errores. El identificador de diagnóstico es `checkout_loyalty_lookup_failed`.

El servidor sigue recalculando catálogo, tarifa y beneficios al confirmar por OTP mediante `auth-otp`/`checkout_cash_order`. La consulta del navegador no crea una ficha ni autoriza un canje. Sin cambios de RPC, Edge, PostgreSQL, worker o APK.

## Validación y publicación

Build TypeScript/Vite aprobado; ESLint de los dos módulos nuevos aprobado. Nueve pruebas de contrato más cinco regresiones de cotización y cuatro de recibo: 18 aprobadas, con comprobación de tipos. Cubren ausencia, errores, datos inválidos, VIP, valores nulos del esquema y separación inmediata de teléfono/intento, incluso al regresar a un teléfono consultado anteriormente.

En el navegador local, la consulta real al número reportado devuelve el estado «Tu número aún no tiene historial de lealtad» sin `checkout_loyalty_lookup_failed`. Se comprobó el retiro del estado al dejar el teléfono incompleto.

Publicado en `main` con `fef4830a29c97d79aa52abcebb59a43de6b02633`. Vercel `C8UTvsHjm8BxHuy1sCpBKdgjrqAC` quedó **Ready**, Production, Current, con dominio `estrella-eats.mx`. El navegador público cargó `index-RLcy1hRv.js` y comprobó una ficha existente con beneficio, seguida del número reportado sin historial: mensaje correcto, cero errores de consulta de lealtad y cero errores 406 capturados. No se envió OTP ni se confirmó un pedido. El artículo usado sólo en el borrador se retiró al terminar y se restauró el teléfono previo.

Recibo y captura sin datos privados: `C:/Users/Kaleb/Desktop/pollo-robins-panel/output/loyalty-lookup-20261012/receipt.json` y `customer-not-found-public.png`. La captura local adicional usa un número sintético.

## Alcance

No se certifica la política general de privacidad de `clientes`, el alta automática de clientes ni la entrega de un pedido completo con esta corrección. La disponibilidad de Mapbox depende del estado de su cuenta y sigue documentada por separado.

## Presentación del mensaje — refinamiento posterior

El estado sin ficha ahora saluda con «¡Qué gusto verte por aquí!» y explica «Aún no tienes beneficios con este número. Puedes seguir con tu pedido». No supone que sea la primera compra ni promete registrar puntos automáticamente.

La presentación queda integrada debajo del teléfono: divisor discreto, iconos Lucide de 20 px en naranja del carrito, título de 14 px y apoyo de 13 px con mayor interlineado. Carga, ficha encontrada y error comparten esta estructura. El error mantiene su mensaje propio y un botón Reintentar con objetivo mínimo de 44 px; no se convierte en ausencia de beneficios. Se conservan la consulta, las condiciones de canje y las transiciones existentes.

Compilación TypeScript/Vite aprobada. Revisión local a 319 px y 1280 px: texto completo, sin desbordamiento horizontal. Teléfono sintético retirado al terminar; carrito de dos productos intacto. Capturas `loyalty-message-mobile.png` y `loyalty-message-desktop.png` en el directorio de evidencia anterior. Esta revisión visual es independiente de la comprobación pública de la corrección original.
