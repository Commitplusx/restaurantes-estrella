# Seguimiento y catálogo compatibles con el cierre de lecturas

## Alcance de esta entrega

La web pública deja de consultar directamente `pedidos` y `repartidores` para abrir recibos, seguimiento y tarjetas del pedido activo. Usa `storefront_tracking_read(p_reference,p_token)`, publicado previamente en Loyalty `jdrrkpvodnqoljycixbg` por la migración `20261015000001`.

El pedido se consulta con referencia más una clave independiente. El checkout confirmado guarda esa clave y la navegación la conserva en `#clave=…`; no se incluye en la query enviada al servidor de la web. El navegador conserva como máximo veinte accesos, sin teléfonos, PIN ni contenido del pedido. Si su almacenamiento está bloqueado, mantiene el acceso de esta pestaña y el enlace completo. Una clave explícita inválida no usa una guardada como sustituto. Un enlace antiguo sin clave pide abrir el enlace completo recibido por WhatsApp: no intenta recuperar el pedido consultando tablas públicas por teléfono.

`useOrderTracking` valida recibo, restaurante y propietario del repartidor antes de presentarlos. Las respuestas anteriores quedan separadas por referencia y clave. Cada petición tiene diez segundos de plazo y se cancela al salir; el sondeo de recuperación ocurre cada treinta segundos sólo con página visible y conexión. Los avisos Broadcast contienen únicamente una señal de cambio sobre el tema derivado por el servidor; siempre se relee la RPC con la clave. Home y tarjeta flotante comparten la suscripción mediante conteo de consumidores, incluida la salida/remontaje de StrictMode. Desmontar una tarjeta no desconecta la otra. El canal, temporizadores y listeners se retiran al salir del último consumidor.

El catálogo y las sucursales consultan `storefront_restaurants` con columnas explícitas. Las promociones usan su relación pública con esa vista. Esta entrega no cambia precios, reglas comerciales, Mapbox, estilos o animaciones.

## Confirmación y conservación del carrito

La comprobación de un pedido previo ocurre en el backend después del OTP, mediante el contrato existente de `auth-otp`. Se elimina la búsqueda pública previa de pedidos por teléfono. El carrito sólo se limpia después de validar el recibo y recibir su clave; recuperar otro pedido activo conserva el borrador. Si otra pestaña cambió los productos mientras se verificaba el teléfono, tampoco se borra ese nuevo carrito. La repetición idempotente del mismo pedido conserva el comportamiento de confirmación. Si falta el acceso en la respuesta, se conserva el desafío para recuperar con el mismo código.

Success mantiene un límite de treinta segundos para mostrar una confirmación pendiente y ofrece volver a consultar. Las banderas de pago en la URL no confirman un pedido. Las órdenes terminales dejan de mostrarse como activas.

## Compatibilidad de notificaciones

La comprobación de una inserción duplicada de push usa `storefront_has_push_subscription(jsonb)`, que devuelve sólo booleano, exige endpoint HTTPS y las dos claves criptográficas del navegador y no permite comprobar una suscripción con otro propietario. No reasigna suscripciones ni envía notificaciones.

Su dependencia aditiva está publicada: `20261017164321_eats_push_subscription_proof`, SHA-256 `1cc814db45c4d34852184425492fc8903a35e641fb6ead7e6350701c7187dc8d`. La migración canónica está en `loyalty-estrella/supabase/migrations/`; añade la RPC y su índice de endpoint, sin retirar permisos de los consumidores antiguos. Veinte comprobaciones SQL pasaron antes y después con ROLLBACK: datos malformados, clave equivocada, visitante, propietario y otra identidad. La CLI informó un fallo de telemetría al cerrar una de las ejecuciones, después de devolver las veinte comprobaciones aprobadas; la lectura posterior confirmó migración y salud.

## Verificación y publicación

- 35 pruebas Deno con comprobación de tipos: acceso/proyección, vida compartida del canal, conservación del carrito, estados, rutas, promociones y activación push.
- TypeScript, build Vite/PWA, ESLint de las nuevas piezas de seguimiento y `git diff --check` aprobados. El build conserva advertencias anteriores de tamaño de Mapbox y dependencias.
- Lectura HTTP real con clave válida y parseo de un recibo existente; otra clave devuelve null. RPC push disponible por REST y entrada vacía rechazada. No se crearon pedidos ni se enviaron mensajes o push.
- Proyecciones públicas de restaurantes y promociones comprobaron HTTP 200. Salud: cero bloqueos, ofertas vencidas o pedidos activos durante la revisión.
- No se obtuvo revisión visual de esta entrega: el control de navegador seguía deshabilitado en Work. Estas comprobaciones no acreditan sonido o recepción física de notificaciones.

**Publicación web:** esta entrega se envía a `main` de `Commitplusx/restaurantes-estrella` por petición de Kaleb; él revisará el despliegue Vercel. Un push no confirma que `estrella-eats.mx` ya sirva esa versión. Comprobar commit y estado Ready, apertura del catálogo, menú por slug/UUID, enlace completo de seguimiento y PWA actualizada antes del siguiente corte.

**Privacidad todavía pendiente:** las lecturas amplias de las tablas base no se retiraron en esta entrega. Falta comprobar también Loyalty/APK, conservar la bandeja autorizada de los repartidores, separar campos privados de comercios y rotar accesos previamente expuestos. Los avisos de cambios de catálogo aún usan suscripciones existentes a tablas base; requieren una ruta pública de invalidación compatible antes de cerrar su lectura. No aplicar el borrador completo de privacidad sólo porque esta web compila. Robin’s independiente, worker, WABA, APK y Traccar no se modificaron.
