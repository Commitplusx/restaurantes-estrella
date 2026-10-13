# Tracker de Estrella Eats con Mapbox

13 de octubre de 2026. Sustituye la carga de Google Maps de `TrackerPage`; otras superficies con Google Maps quedan fuera de esta entrega. No cambia checkout, asignación, estados, pagos, cupones ni el backend.

## Contrato

- URL pública conservada: `/tracker?pedido=UUID` o folio de seis caracteres. Un enlace inválido muestra recuperación; no consulta una referencia inventada.
- Lecturas acotadas a una orden y su restaurante/repartidor; contrato tipado desde `unknown`. Un candidato `ofrecido` no se presenta como repartidor aceptado: se conserva `acceptedDriver` y el propietario se busca por `repartidores.user_id`.
- Suscripciones Realtime separadas por UUID de orden y fila de repartidor; no muestran un propietario anterior después de reasignar. Recuperación cada 30 segundos sólo con página visible y conexión; volver a primer plano/online vuelve a consultar. Peticiones con plazo y cancelación al desmontar; un error conserva el último estado válido y ofrece reconsulta.
- Mapbox GL JS ya instalado, cargado de forma diferida, con la misma configuración pública del carrito. Marcadores de origen, entrega y repartidor sólo cuando sus coordenadas son finitas y válidas. No inventa GPS ni identifica un repartidor por el ID de su ficha.
- Ruta de conducción Mapbox sólo cuando la orden está `en_camino` y hay ubicaciones válidas. Máximo un inicio por 30 segundos, posiciones recientes al terminar la espera, petición de ocho segundos y respuesta/GeoJSON validados. Un rechazo/no ruta no genera una línea ficticia ni bloquea el estado del pedido. La ruta es presentación; no calcula cobro ni cambia el algoritmo de despacho.
- Sin WebGL/configuración/proveedor disponible: mensaje visible y «Reintentar mapa», estado/recibo del pedido siguen funcionando. Error de mapa registra únicamente fase/tipo, sin token, URL privada ni coordenadas.
- En móvil el mapa ocupa 65dvh y «Ver mi pedido» abre el panel; el resumen puede volver a cerrarse. El área de mapa reserva su altura y conserva la atribución visible. Controles de zoom de 44px; foco visible, enlaces de contacto sin teléfono deshabilitados y no enfocables. Órdenes cerradas ofrecen volver a restaurantes. Sin avatar externo que envíe el nombre del repartidor.

## Causa adicional corregida

La clase `mapboxgl-map` define posición relativa. Su CSS anulaba la clase `absolute` del contenedor y dejaba altura cero, aunque el SDK hubiera cargado. `TrackingMap.css` define un selector propio, posición absoluta y ancho/alto completos; ResizeObserver ajusta la instancia. La altura real se comprobó en el navegador junto con el mapa dibujado, no sólo por `load` del SDK.

## Verificación

Diez pruebas Deno con tipos (seis nuevas de seguimiento/ruta y cuatro regresiones de estados), ESLint de las seis fuentes TypeScript/React y build de producción aprobados. Revisión conjunta con viewport de escritorio y móvil: mapa, marcadores, zoom/encuadre, expansión/resumen, altura efectiva y ausencia de scroll horizontal. Capturas locales en `C:/Users/Kaleb/Desktop/pollo-robins-panel/output/eats-tracker-20261013/`; el pedido mostrado es una prueba cancelada sin cobro.

El contexto Impeccable de la home no define los colores semánticos del mapa. Se mantuvieron tinta/naranja/Outfit de Estrella y el marcador de entrega verde. El detector identificó rebote y letras de 10–11px heredados; se sustituyeron por icono estático y texto de 14px. El sidecar general de la home está desactualizado y no se reescribió durante esta entrega.

Preparación sobre `origin/main` `da1695b`, en la copia aislada ya utilizada por este chat. Sólo se incorporan fuentes/pruebas/docs del tracker. Los cambios locales de recuperación de checkout, documentos ajenos, `dev-dist`, resultados de pruebas y locks no forman parte de esta publicación.

**Publicación pendiente de confirmar:** el código local y las capturas no prueban actualización del dominio. Después de publicar, comprobar el tracker público, su versión PWA y la carga de Mapbox; actualizar esta sección con el commit y el resultado real.

No se hizo viaje físico ni se probó navegación de una entrega en movimiento. La consulta de pedidos sigue usando el contrato/RLS existente; esta migración visual no publica el cierre separado de lecturas privadas de clientes.

Referencias de contrato: [controles y marcadores Mapbox](https://docs.mapbox.com/mapbox-gl-js/api/markers/), [Directions API](https://docs.mapbox.com/api/navigation/directions/).
