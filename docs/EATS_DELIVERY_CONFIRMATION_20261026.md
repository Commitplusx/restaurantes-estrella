# Confirmación de envíos del restaurante — 26 de octubre de 2026

## Hallazgo observado

La revisión de producción encontró una cotización por pin creada el 26 de octubre a las 16:16 UTC, sin solicitud/pedido asociado; en la ventana de 24 horas había una cotización y cero solicitudes. Eso demuestra que no había una orden creada en ese corte, pero no demuestra si el operador omitió confirmar o si tuvo un fallo anterior. No se capturó un error de consola que permita atribuirlo al servidor. No se creó ni reenvió una orden del cliente para diagnosticarlo.

La pantalla ya tenía un recibo de éxito, pero no enfocaba ni desplazaba la zona de confirmación. El cálculo previo y la acción que realmente crea el servicio tampoco distinguían suficientemente sus efectos.

## Cambio en la ruta existente

- Revisar importes avisa expresamente que sólo calcula el cobro. La cotización muestra **Confirma el envío** y el botón **Confirmar y solicitar repartidor**. No se convierte una cotización en un pedido ni se solicita automáticamente.
- Sólo un recibo válido del servidor muestra **¡Envío solicitado!**, folio, estado y cobros. El foco y desplazamiento van a esa confirmación, también dentro del contenedor desplazable del portal. Ofrece el seguimiento existente y una acción explícita para otro envío.
- El recibo distingue pedido guardado de repartidor asignado. Cancelación y entrega final tienen títulos propios; el refresco existente de recientes actualiza el mismo recibo por pedido/referencia coincidentes. No se inventa aceptación, entrega, plazo ni disponibilidad de conductores.
- Crear y recuperar verifican que el recibo pertenezca a la referencia solicitada, además de validar importes y estado. Una respuesta incierta mantiene la referencia y permite comprobar/reintentar sin duplicados; un rechazo no muestra éxito. No hay otro algoritmo, notificador ni RPC de creación.
- El campo de comida aclara que se captura sin envío ni descuento por aportación. Se conserva el cálculo: comida $500, envío $45 y aporte $15 → cliente $530, sucursal $485, repartidor $45.

## Validación y límites

Build de producción y análisis ESLint de los cuatro archivos TypeScript/TSX de ejecución modificados aprobados. **28 pruebas Deno con tipos**: nueve del contrato de solicitudes, catorce de ubicación y cinco de cotización. El primer pase de tipado detectó la firma opcional del parser utilizada directamente como callback de `map`; se corrigió pasando explícitamente sólo el elemento y se repitieron tipado/pruebas/build, sin supresiones.

Recorrido local por UI real en Opera, usando exclusivamente `/envios-diseno` con API sintética: revisar sin crear, confirmación, respuesta perdida después del guardado, recuperación del mismo recibo sin otra fila y rechazo sin guardado ni éxito. Se revisaron 1366×900 y 390×844, foco en el encabezado confirmado y ausencia de desbordamiento horizontal móvil. Capturas y datos de prueba guardados en `.codex-tmp/eats-delivery-confirmation-20261026/` de la raíz operativa; no representan una recepción física en la APK. Los controles de fallos son sólo de desarrollo y no se incluyen en la ruta de producción.

El backend Supabase, las reglas de cobro/asignación, la APK y el bot independiente no cambian en esta corrección. No se envían mensajes ni se crean servicios reales de QA. La publicación se identifica por el commit y la comparación del bundle público en el registro privado de esta entrega; una edición o un push por sí solos no prueban el despliegue de Vercel.
