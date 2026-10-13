---
primaryTarget: src/pages/TrackerPage.tsx
relatedTargets:
  - src/components/TrackingMap.tsx
  - src/components/TrackingMap.css
  - src/pages/TrackerPage.css
  - src/hooks/useOrderTracking.ts
  - src/hooks/useTrackingRoute.ts
mode: Operate
---

# Seguimiento de un pedido

Mantener Outfit, blanco/tinta y naranja de Estrella Eats. Conservar estados reales, recibo persistido, identidad por Auth y recogida separada de domicilio. Sin ETA inventada, aprobación adicional del cliente, GPS ficticio ni avatar que transmita el nombre a otro proveedor.

Mapa Mapbox con marcadores semánticos: origen naranja de interacción, entrega verde `#16805c`, repartidor tinta. Popup/etiqueta accesible distingue el papel además del color. Conservar atribución; contenedor con altura efectiva incluso después de cargar CSS del SDK. Controles de 44px, foco visible y errores recuperables sin ocultar el pedido.

Desktop: mapa flexible y panel de 380px. Teléfono: mapa visible, panel compacto inicial y botón para abrir recibo completo; contenidos ocultos fuera del panel no reciben foco. Sin scroll horizontal ni posiciones por encima del viewport. La home tiene su propio DESIGN.md; no extender a ella estos colores de estado.

Validación y publicación: `docs/TRACKER_MAPBOX_20261013.md`.
