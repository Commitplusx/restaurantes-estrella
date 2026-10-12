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

En el navegador local, la consulta real al número reportado devuelve el estado «Tu número aún no tiene historial de lealtad» sin `checkout_loyalty_lookup_failed`. Se comprobó el retiro del estado al dejar el teléfono incompleto. No se envió OTP ni se confirmó un pedido. Publicación: pendiente al guardar esta nota; no interpretar un build local como publicación productiva.

## Alcance

No se certifica la política general de privacidad de `clientes`, el alta automática de clientes ni la entrega de un pedido completo con esta corrección. La disponibilidad de Mapbox depende del estado de su cuenta y sigue documentada por separado.
