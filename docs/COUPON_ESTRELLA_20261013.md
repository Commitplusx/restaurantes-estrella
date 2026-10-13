# Cupón Estrella — primer envío de Pollo Robin’s

El cliente escribe **Estrella** en el carrito. El código acepta mayúsculas, minúsculas y espacios exteriores. Descuenta **el menor entre el costo del envío y $50**, sin descontar comida y conservando el pago calculado del repartidor.

Sólo para el primer pedido a domicilio de Estrella Eats, comprando en el perfil de Pollo Robin’s terminado en 1353. Un uso vigente por WhatsApp verificado. Una cancelación libera el beneficio conservando su recibo histórico. Recogida ya tiene envío cero. No se acumula con un beneficio de envío de Loyalty.

## Contrato

La web usa la acción existente de auth-otp extendida con **checkout-coupon-preview**. La elegibilidad se consulta en el servidor al completar WhatsApp y modalidad; se muestra comprobando, pendiente de datos, aplicado o error con reintento. Al confirmar, el checkout vuelve a comprobar el cupón y usa la verificación OTP habitual.

El subtotal de comida se conserva. Ejemplos: productos $100 + envío $35 → total $100; productos $100 + envío $70 → total $120. La vista de escritorio separa envío original y descuento; el total móvil usa el mismo cálculo. Cambiar teléfono, restaurante o modalidad invalida la respuesta anterior antes de volver a comprobarla.

Supabase: migración **20261013000002**, código compartido ESTRELLA de tipo primer_envio, cap fijo 50. La RPC checkout_cash_order conserva su implementación canónica y agrega el recibo privado storefront_first_delivery_redemptions dentro de la misma transacción. Bloqueo por teléfono e índice único de redención vigente; rollback ante fallo de guardado, replay del pedido existente y liberación al cancelar. Sin un cupón por destinatario ni emisor adicional.

## Verificación y publicación

- Doce pruebas Deno del cálculo y gateway, con tipos habilitados, pasaron. Incluyen costo cero, fracciones, 35, 45, 50 y 70; recogida, combinación, cap alterado, respuestas inválidas, rechazo y red.
- Diecisiete controles de SQL con ROLLBACK pasaron antes y después de aplicar. No se confirmaron pedidos ni se enviaron mensajes durante las pruebas.
- Diez recorridos Playwright pasaron en escritorio y móvil: envío 35/70, falta de teléfono, rechazo del servidor y fallo con recuperación. Sin llamadas reales para enviar OTP ni pedidos.
- Build, comprobación de tipos de auth-otp y lint de los módulos nuevos pasaron.
- SQL aplicada y registrada; auth-otp publicado desde una descarga de la versión activa v85, cambiando sólo el punto de entrada y los módulos cash-checkout/cash-checkout-gateway. Se conservaron las demás dependencias activas. Campaña inicialmente desactivada durante el despliegue de la web; la activación se comprueba aparte.
- Esta publicación es la del cupón. El rediseño del tracker y la recuperación ampliada del checkout siguen siendo cambios locales separados.

## Pruebas locales

npm ci
npm run build
npx playwright test --config playwright.coupon.config.ts

El servidor de pruebas recibe variables de prueba desde playwright.coupon.config.ts. No contiene credenciales de producción. Las capturas del recorrido son datos sintéticos.

La elegibilidad de una campaña no se deduce de la actividad en el bot de Robin’s: se verifica en los pedidos de Estrella Eats. No se enviaron campañas a los contactos analizados.
