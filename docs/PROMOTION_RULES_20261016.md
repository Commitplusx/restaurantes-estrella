# Reglas de promociones — 16 de octubre de 2026

## Alcance y estado

Extensión del editor de promociones existente para configurar recogida, domicilio o ambas modalidades y conservar los días y la fecha final de cada oferta. Abarca promociones nuevas y existentes del restaurante seleccionado, las etiquetas del menú público y la comprobación del carrito. Mantiene el checkout canónico de Eats.

| Superficie | Estado al cerrar esta revisión |
| --- | --- |
| Web de Estrella Eats | Publicada en main `98b7ed8`; Vercel success y módulos del dominio comprobados |
| PostgreSQL de Eats, `jdrrkpvodnqoljycixbg` | Migración `20261016000001_promotion_delivery_rules.sql` aplicada y verificada el 16 de octubre |

El backend dejó las 16 promociones existentes con ambas modalidades y cero configuraciones inválidas. Elegir una exclusividad concreta corresponde al restaurante. El despliegue Vercel `J3aGS7cwXyK5jP9WwgGmDgn6yNDU` terminó en success; estrella-eats.mx sirvió el editor `MenuPromosView-BW7j2pnk.js` y carrito `CartPage-ZUD3tlL8.js` con las reglas revisadas. No se modificó una oferta real para la prueba visual ni se hizo un pedido.

## Uso del editor

1. En el portal del restaurante, abrir **Promociones** y elegir **Nueva Promoción** o editar una existente.
2. Completar título, descripción y precio. En **¿Dónde aplica?**, activar **Recoger en sucursal**, **A domicilio** o ambas opciones.
3. Seleccionar los **Días de aplicación**. Debe quedar al menos un día y una modalidad para guardar.
4. Si corresponde, indicar **Fecha límite (opcional)**. Sin fecha no hay vencimiento por calendario; los días y el estado activo siguen aplicando.
5. Guardar. La lista resume modalidad, días y fecha final para revisar la configuración.

Una promoción nueva inicia con ambas modalidades y los siete días. Al editar se conserva la configuración guardada. Un campo de modalidades ausente en un menú antiguo se interpreta como ambas; una lista explícita inválida se rechaza. Un arreglo histórico vacío de días mantiene el contrato de todos los días en checkout, pero el editor exige elegir al menos uno antes de guardar esa promoción.

La fecha final incluye todo el día seleccionado. Los días y el vencimiento se evalúan en `America/Mexico_City`, independientemente de la zona horaria del dispositivo. `tienda` significa recoger el pedido en la sucursal; no añade consumo en mesa.

## Ayuda al cliente y autoridad del servidor

Las tarjetas del menú público identifican **Solo recoger en sucursal** o **Solo a domicilio** cuando la promoción tiene una única modalidad. Las ofertas con ambas mantienen la etiqueta **Promoción**. La elegibilidad final se comprueba con las reglas actuales en el carrito.

El carrito muestra la promoción afectada y explica si está pausada, vencida, fuera de sus días, eliminada o restringida para la entrega seleccionada. Mientras consulta o existe un error/incompatibilidad, bloquea los pasos de entrega/pago y la confirmación. Un fallo de consulta ofrece **Volver a comprobar** y conserva el borrador.

El cliente puede cambiar la entrega o usar **Quitar promociones que no aplican**. Esa acción retira únicamente las promociones señaladas; el resto del pedido se conserva. Cambiar de modalidad por sí solo conserva todas las líneas. Antes de solicitar OTP se vuelven a leer las reglas. La interfaz orienta al cliente; PostgreSQL decide si el pedido cumple.

Ruta existente: editor → REST con RLS de restaurante → catálogo público → carrito → `auth-otp` → checkout canónico → `checkout_cash_order` → `storefront_checked_cash_checkout` → pedido y avisos existentes.

La función SQL comprueba modalidad, estado, días y fecha bajo el bloqueo existente de las filas del catálogo antes del INSERT. Rechaza con `promotion_delivery_restricted` o `promotion_unavailable`, sin crear pedido ni consumir la verificación. La recuperación idempotente de un pedido ya confirmado sigue funcionando aunque después cambien las reglas. La migración conserva los permisos restringidos de la función interna.

## Archivos y contrato

| Archivo | Responsabilidad |
| --- | --- |
| `src/pages/views/MenuPromosView.tsx` y `.css` | Selección de modalidades, validación al guardar, resumen y adaptación móvil del editor |
| `src/lib/promotionRules.ts` | Validación de datos externos, etiquetas y evaluación de modalidad, días y fecha local |
| `src/hooks/usePromotionEligibility.ts` | Lectura vigente, estados de carga/error, reintento y descarte de respuestas antiguas |
| `src/pages/PublicMenuView.tsx` | Etiqueta de modalidad exclusiva en las tarjetas públicas |
| `src/pages/CartPage.tsx` y `.css` | Aviso, acciones del cliente, bloqueo y comprobación previa al OTP |
| `src/lib/supabase.ts` | Campo `tipos_pedido` en el contrato `MenuPromocion` |
| `tests/promotionRules_test.ts` | Cinco pruebas tipadas de las reglas puras |

`menu_promociones.tipos_pedido` es `text[] NOT NULL` y admite `tienda`, `domicilio` o ambas, sin valores vacíos, repetidos, nulos ni desconocidos. Su valor predeterminado es `['tienda','domicilio']`. Se conservan `activa`, `dias_aplicacion` y `fecha_fin`.

La consulta del carrito está acotada al restaurante y a los IDs presentes, máximo 100 y plazo de ocho segundos. Ignora respuestas de selecciones anteriores, reconsulta al recuperar foco/visibilidad y permite reintento explícito. La comprobación previa al OTP también tiene plazo de ocho segundos. No incorpora polling ni nuevas suscripciones Realtime.

## Continuidad visual

La comparación con el editor anterior muestra una ampliación dentro del BottomSheet, con la tipografía del portal, tarjetas cálidas de promociones y secciones azules de opciones/subsidio conservadas. Se añade el grupo **¿Dónde aplica?** entre descripción y precio/fecha, con selección cálida, icono, check y foco visible. Las opciones están en dos columnas y se apilan a 420px o menos. Se elimina la transición de color con movimiento reducido.

El brief de esta superficie permanece en modo **Operate**. `DESIGN.md` y `.impeccable/design.json` describen el inicio público y no se extienden a todo el portal ni al checkout por esta tarea. Las capturas son evidencia de QA; no se añadieron imágenes al producto.

## QA y evidencia

Los resultados siguientes corresponden al trabajo de implementación previo al cierre documental. Este cierre revisó los archivos, sus diferencias y las dos capturas; no repitió pruebas ni ejecutó mutaciones.

| Comprobación | Resultado y alcance |
| --- | --- |
| Reglas web | Cinco pruebas tipadas aprobadas: fronteras inválidas, tres configuraciones de modalidad, cambio de modalidad, fecha/día local, pausa, ausencia y aislamiento de filas |
| Regresión web | Cuatro pruebas de `menuOptions_test.ts` y seis de `restaurantBranches_test.ts` aprobadas; 15 pruebas web en total junto con las cinco nuevas |
| Compilación | TypeScript/Vite aprobado; permanecen advertencias heredadas de bundle, Browserslist y lottie |
| Análisis estático | ESLint aprobado para los módulos nuevos; no se declara una auditoría de toda la base web |
| SQL | 16 verificaciones transaccionales aprobadas antes y después de aplicar la migración; fixtures y posibles solicitudes pg_net revertidos, cero restaurantes QA persistidos |
| Editor PC | Captura 1440×1000; medición de ancho del documento 1440/1440 |
| Editor móvil | Captura 390×844; medición de ancho del documento 390/390 |
| Interacción del editor | Se ejercitaron ambas modalidades, ambas desmarcadas con guardar desactivado y sólo recogida; no se guardó una promoción real |
| Finish independiente | Veredicto `ship` para el alcance inspeccionado; no equivale a publicación |

Comando de las 15 pruebas web, con comprobación de tipos:

```powershell
deno test --no-lock --unstable-sloppy-imports --config tests/deno.web.json tests/promotionRules_test.ts tests/menuOptions_test.ts tests/restaurantBranches_test.ts
```

Las capturas revisadas están en `C:/Users/Kaleb/.codex/private-backups/promotion-rules-20261016/editor-desktop.png` y `editor-mobile.png`. Muestran el editor con recogida seleccionada y domicilio desmarcado, en dos columnas de PC y apilado móvil. Las mediciones registradas no muestran desbordamiento horizontal del documento en esos dos anchos. La captura móvil llega hasta los campos de precio/fecha; no acredita por sí sola los controles inferiores.

El aviso del carrito se revisó en código y no tiene una captura renderizada en esta evidencia. Las capturas del editor no prueban su presentación, ni constituyen un recorrido de cliente con OTP/pedido real. Tampoco se certifican aquí todos los dispositivos físicos, lectores de pantalla ni la publicación web. Tras publicar se requiere comprobar en el dominio el guardado/lectura de reglas y el bloqueo/recuperación del carrito.

La fuente documental de backend revisada es `C:/Users/Kaleb/.codex/tmp/loyalty-branches-release-20261015/docs/PROMOTION_RULES_20261016.md`. Registra la aplicación en Eats, el contrato, los permisos y las verificaciones del servidor. Los respaldos y el log local `web-build.log` permanecen en la carpeta privada de evidencia.

## Deriva previa de documentación

El sidecar registra generación el 6 de octubre y su lista `narrative.keyCharacteristics` incluye una entrada del catálogo compacto de PC ausente en la lista equivalente de `DESIGN.md`. Esa diferencia ya estaba presente al iniciar este cierre. Ambos documentos conservan su alcance de inicio público y se preservan, sin regenerarlos ni reconciliarlos como efecto de esta extensión.

El brief de promociones anterior describía los grupos de opciones y una campaña concreta de MAKITAN. Se amplió con las reglas de entrega y vigencia sin convertir los detalles de esa campaña en valores predeterminados para otras ofertas.
