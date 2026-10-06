# Promociones con productos del menú — 6 de octubre de 2026

El editor de opciones permite buscar y marcar productos existentes del mismo restaurante. Cada opción vinculada conserva `menu_item_id`, nombre de catálogo y costo adicional. Los extras manuales siguen disponibles. Guardar revalida productos, nombres, grupos y precio; la escritura comprueba la fila devuelta y no presenta éxito ante un error.

El menú público elimina opciones vinculadas agotadas o desactivadas y comprueba todos los pasos obligatorios antes de agregar al carrito. Cada elección conserva grupo e ID. Al cerrar o cambiar de paso cancela el avance pendiente. La API existente `auth-otp`, compartida por `direct-order` y `verify-and-order`, valida promoción vigente, día de Comitán, pertenencia al restaurante, opciones requeridas, límites, duplicados e identidad/disponibilidad de cada producto. Canonicaliza extras, calcula el total con el catálogo y persiste el carrito validado en `pedidos.items`.

La consulta de restaurante del checkout se corrigió al contrato publicado: `id`. Los campos `envio_gratis_monto_minimo`, `envio_gratis_tope` y `cupon_*` no existen en esta base. Se retiraron las ramas que nunca recibían estos valores; los cupones de plataforma y beneficios VIP mantienen sus tablas existentes. Los fallos reales de catálogo ahora detienen el pedido.

## MAKITAN

Promoción `b7afeec6-be5a-5d47-9f13-5c31816f490a`, restaurante `010c7fdd-1c8a-4392-92d1-9a9f9e33c0a0`, Supabase `jdrrkpvodnqoljycixbg` producción. Título: **Martes: 3 makis por $200**. Tres grupos obligatorios `Maki 1`, `Maki 2`, `Maki 3`, una elección por grupo; sabores repetidos entre grupos permitidos. Imagen original del usuario en el bucket `menu-fotos`, no una recreación.

Solo entran Gara roll, Camaroll, Bolvo, Abokado, Suri, Noritan, Vegetalroll, Californiaextra, California, Mar y tierra, Kamikaze, Gurke roll, Mexiroll, Chicken, Misuri, Original, Tampiqueño y Tampico roll. Los 18 se localizaron por coincidencia única en el menú real; otras variedades y especialidades quedan fuera, incluidos Oriente y Tabasco.

Extra opcional: 1/2/3 aderezos por $5/$10/$15. Descripción conserva las condiciones de la imagen: un rollo sin salsa/aderezo ni palillos; no se modifican rollos ni aderezos. Sin subsidio adicional ni cambio de precios base. No tiene fecha final; aplica los martes. Se conservó el horario vigente del restaurante (martes 15:30–21:30), aunque la imagen publicitaria dice hasta las 22:00.

## Verificación y publicación

- Ocho pruebas tipadas de servidor y cuatro de dominio frontend: sabores válidos/repetidos, obligatoriedad, IDs falsos, exclusiones, cantidades, extras, tenant, agotados y vigencia local. `deno test supabase/tests/promotion-catalog_test.ts estrella-eats/tests/menuOptions_test.ts` desde la raíz Loyalty.
- Tres controles adicionales con la función real extraída en entorno aislado: inserción simulada a $200, extras a $205, rechazo sin inserción. No son pedidos productivos.
- API real: selección incompleta y Oriente devuelven HTTP 400 con su causa de validación. No se crearon pedidos de prueba ni se ejecutaron pagos.
- Build frontend, lint de los módulos tipados afectados y `deno check` del punto de entrada. `PublicMenuView.tsx` conserva su supresión de tipos heredada; estas comprobaciones no prueban tipado completo de ese archivo.
- `auth-otp` se respaldó desde el código activo antes de editar. Se publicaron únicamente su entrada revisada y `promotion-catalog.ts`; `utils.ts`, secretos y configuración de autenticación no se cambiaron. Fuente activa y candidata comparadas después de publicar.
- Promoción guardada/verificada en Supabase y activada. GitHub y el despliegue web se verifican por separado; los respaldos, capturas y manifiestos privados están en `.codex-tmp/`, excluidos de Git.

La selección se revalida al enviar el pedido. No garantiza reservar inventario ante ventas concurrentes ni constituye una auditoría completa del checkout, pagos, cupones o navegadores físicos.
