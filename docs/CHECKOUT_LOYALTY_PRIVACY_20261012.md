# Beneficios del carrito: proyección pública limitada

La web consulta `auth-otp`, acción `checkout-benefit-preview`, en lugar de leer la ficha completa de `clientes` por teléfono. El contrato sólo devuelve registro, elegibilidad de envío y tarifa VIP aplicable; no devuelve identidad, PIN, puntos ni saldo.

La consulta se limita por IP/teléfono, valida la respuesta, cancela a ocho segundos y oculta inmediatamente los beneficios anteriores al cambiar de teléfono. Una ausencia de ficha se distingue de un fallo de red. La validación y el consumo definitivo siguen en checkout/RPC; la proyección no autoriza pedidos ni canjes.

Checkout conserva efectivo y elimina los controles de billetera/PIN deshabilitados. En domicilio muestra el beneficio aplicable; en recogida conserva envío cero. Siete pruebas tipadas del contrato y `tsc -b && vite build` aprobaron. `auth-otp` compatible se publicó antes de esta web; el cierre de lecturas generales pertenece a una fase posterior con APK compatible.

No se crearon pedidos ni se descontó saldo durante esta entrega. Publicación web y verificación del dominio se registran después del despliegue; este archivo no prueba por sí solo producción.
