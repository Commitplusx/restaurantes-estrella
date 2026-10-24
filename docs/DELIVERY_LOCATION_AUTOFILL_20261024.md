# Mapa gris y dirección automática — 24 de octubre de 2026

Estado de entrega: fuentes `61e6c4e`, posteriores a GitHub main `ee9387c`, incluidas en la subida autorizada a main del 24 de octubre junto con el logo nuevo. Despliegue efectivo en Vercel pendiente de verificar. Build normal en 5262; vista repetible DEV en `http://127.0.0.1:5263/mapa-entrega`, usando el mismo `DeliveryLocationPicker` del carrito. No crea pedidos ni guarda la selección fuera de esa vista de pruebas.

## Comportamiento

- El selector usa Mapbox Light v11 con un tema gris propio: edificios, parques y agua en escala de grises, calles blancas, rótulos legibles y pin naranja de Estrella. Se conservan atribución, navegación, GPS, teclado y adaptación a móvil. Home y tracker no cambian de tema en esta entrega.
- Un GPS válido o la selección por arrastre/clic actualiza el pin y busca la calle automáticamente. Se esperan 450 ms después de seleccionar; las selecciones rápidas cancelan el trabajo anterior. Un zoom que conserva el centro no invalida la dirección.
- Se invalida la dirección del punto anterior al seleccionar otro punto. El texto nuevo procede de la respuesta validada del proveedor; sus coordenadas no sustituyen el pin exacto elegido por el cliente.
- Si ya existe una dirección guardada, abrir el selector no la reemplaza ni solicita otra búsqueda. Un punto guardado sin dirección sí la consulta. Elegir un resultado de búsqueda usa directamente su dirección, sin otra consulta inversa.
- Corregir el campo, escribir otra búsqueda o cerrar cancela el temporizador y la petición actual. Las respuestas anteriores se descartan aunque el proveedor ignore el aborto; no pueden reemplazar una corrección o reabrir resultados viejos. `AddressLookupSession` concentra la concurrencia de ambas búsquedas sobre la ruta existente `requestAddresses`.
- Sin cobertura de calle, con error o sin permiso/configuración del proveedor, se muestra el problema y queda disponible la corrección manual. No se inventa una dirección ni se confirma sin pin y dirección válidos. Confirmar conserva la acción explícita del cliente y el contrato `{lat,lng,address}` del carrito.
- El formulario presenta primero la dirección; la búsqueda de otra calle está en un desplegable secundario. Sólo se pide revisar número/referencias. Los avisos de privacidad, push e instalación esperan mientras el selector reserva la cola de avisos existente. El aviso PWA se incorpora a esa misma cola.

El GPS sigue solicitándose desde el botón del usuario, con plazo de ocho segundos y precisión máxima de cien metros. No se afirma que Mapbox conozca todas las puertas ni que pueda garantizar el número exterior. La cobertura H3, cotización y validación final del servidor no se modifican.

## Proveedor y configuración

Se mantienen el token público configurado y `VITE_MAPBOX_PERMANENT_GEOCODING=true`; no se cambió facturación, cuenta ni secretos. La dirección continúa usando almacenamiento permanente, español y México. La consulta inversa conserva `types=address,street` y omite `limit`; la búsqueda escrita mantiene límite de cinco resultados. Esto respeta el contrato documentado de [Geocoding v6](https://docs.mapbox.com/api/search/geocoding/#reverse-geocoding), que limita el uso de un `limit` explícito con varios tipos. No se añadió Search Box temporal ni otro proveedor.

La comprobación HTTP real sobre el punto público del centro de Comitán respondió 200 tanto con el formato anterior como con el nuevo. Por tanto, esta revisión **no** presenta un 422 como fallo observado. La causa observable del trabajo manual era que sólo el botón independiente lanzaba la consulta inversa; ahora se ejecuta desde la selección del pin.

El selector fija `mapbox://styles/mapbox/light-v11` con su tema gris. La variable general `VITE_MAPBOX_STYLE_URL` permanece para los otros mapas que ya la consumían; no se reescribe una configuración remota.

## Verificación y límites

- Build TypeScript/Vite aprobado; el primer intento detectó parameter properties incompatibles con `erasableSyntaxOnly`, corregidas declarando campos concretos, sin supresiones ni cambios de configuración.
- ESLint pertinente aprobado en selector, tema, sesión, frontera del proveedor, vista DEV y pruebas. El aviso PWA conserva deuda de tipos previa; se revisaron sus tres líneas de integración sin afirmar limpieza global de ese archivo.
- **26 pruebas tipadas:** ocho de concurrencia/cancelación/temporizadores/errores de dirección, trece del contrato de geocodificación y cinco de cotización. Se cubren proveedor que ignora aborto, selección rápida, edición manual, cierre, resultado vacío, cambio entre búsqueda e inversa y recuperación explícita tras 429.

```powershell
deno test --sloppy-imports --config tests/deno.web.json tests/addressLookupSession_test.ts tests/deliveryLocation_test.ts tests/deliveryQuote_test.ts
```

La vista DEV acepta `?punto=centro` para iniciar un pin público de muestra sin dirección. Está etiquetado como ejemplo; no simula una medición del GPS. Capturas automáticas con Mapbox y consulta inversa reales a 390 × 844 y 1280 × 900; red 200 y campo completado sin pulsar un botón de búsqueda. Primera ronda detectó avisos globales encima del formulario: se corrigió su coordinación y se confirmó en una segunda ronda. No hubo pedido, OTP, cobro, despacho ni modificación de datos de clientes.

La precisión física del GPS, arrastre táctil y recorrido completo del checkout no se probaron en un teléfono en esta entrega. Las capturas usan servidor DEV y no certifican rendimiento productivo ni despliegue. Los artefactos de esa vista quedan fuera del bundle de producción. La evidencia privada `gray-map-*` y el log de build se conservan en `.codex-tmp/eats-performance-20261024` del workspace principal; no versionar los reportes con URLs del proveedor.
