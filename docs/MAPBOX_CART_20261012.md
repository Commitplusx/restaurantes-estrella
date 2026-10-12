# Mapbox en el carrito — 12 de octubre de 2026

## Estado

Implementado y ejecutado **en local**, con un token público suministrado por el usuario. No publicado en Vercel y sin cambios en Supabase, APK o worker. Vista compilada en `http://127.0.0.1:5194/menu/pollo-robin-s-1353/carrito`.

El alcance es el selector de dirección de `CartPage.tsx`. Inicio, perfil del restaurante, tracker y editor de sucursales todavía usan Google Maps; conservar su dependencia hasta migrar esas superficies por separado.

## Ruta y contrato

`CartPage` → `DeliveryLocationPicker` → Mapbox GL JS 3.32.0 y Geocoding v6 → confirmación explícita de dirección y `{lat,lng}` → carrito existente → cotización H3 existente → checkout `auth-otp` existente. No se añadieron campos, estados, pedidos ni llamadas de asignación.

El mapa se instancia sólo al abrir el selector y se libera al cerrarlo. Conserva atribución de Mapbox, pin central, navegación, teclado, cierre con Escape y retorno de foco. El centro inicial del restaurante y los cambios de tamaño no cuentan como una selección. La dirección puede escribirse manualmente.

Se eliminó de este carrito el fallback de ubicación aproximada por IP: no se acepta como destino. El GPS del navegador tiene plazo de ocho segundos y rechaza precisión mayor a cien metros; el cliente confirma el punto antes de cotizar. La precisión física del GPS no se ha probado desde el navegador automatizado.

Búsqueda y consulta inversa son acciones explícitas, en español, limitadas a México y tipos `address,street`, cinco resultados como máximo. Cada consulta tiene plazo de ocho segundos, cancelación al cambiar selección/consulta/dirección o cerrar, descarte de respuestas antiguas y cero reintentos automáticos. Datos externos se validan como `unknown`. Los errores del proveedor no se muestran con su cuerpo o token.

Una calle encontrada no verifica el número ni la puerta: el cliente debe revisar y ajustar el pin. Se comprobó cobertura de ejemplos de Comitán, no la calidad de todas las direcciones de la ciudad.

La cotización invalida inmediatamente el precio anterior cuando cambia el pin, cancela solicitudes obsoletas y tiene plazo de ocho segundos. Tarifas nulas o malformadas no se convierten en envío gratis. Cobertura y precio siguen perteneciendo a la tabla existente `h3_zonas`; el checkout continúa validando en servidor.

## Configuración

- `VITE_MAPBOX_ACCESS_TOKEN`: token **público** `pk.*`. Guardado en `.env.local`, ignorado por Git; no guardar su valor en documentación, logs o commits.
- `VITE_MAPBOX_PERMANENT_GEOCODING=true`: habilita consultas con `permanent=true`. El usuario confirmó método de pago y autorizó esta modalidad. Sin esa configuración el selector ofrece mapa, GPS y dirección escrita, sin consultas que guarden resultados temporales.
- `VITE_MAPBOX_STYLE_URL`: opcional; por defecto `mapbox://styles/mapbox/streets-v12`.

La [documentación de Mapbox](https://docs.mapbox.com/api/search/geocoding/#storing-geocoding-results) exige modalidad permanente para almacenar resultados. No usar Search Box temporal para persistir direcciones de pedidos. El token público es visible en el navegador por diseño; antes de producción revisar un token específico con los permisos mínimos y [restricciones de URL](https://docs.mapbox.com/accounts/guides/tokens/#url-restrictions) del dominio y de la vista de pruebas. No se certificaron las restricciones del token recibido.

## Verificación

- `npm run build`: tipos y compilación aprobados. Avisos heredados de Browserslist y `eval` en lottie-web; sin ampliar esa dependencia en esta tarea.
- ESLint de los cuatro archivos nuevos/cambiados del selector y cotización: aprobado.
- Deno con tipos: **26 pruebas aprobadas**, 18 de direcciones/tarifas y ocho regresiones de estado de pedido/opciones de menú.
- Proveedor real desde el navegador: render del mapa en escritorio y 390×844, búsqueda de una calle visible de Comitán, consulta inversa de un pin público, selección explícita, cancelación, reapertura y conservación de dirección/coordenadas.
- Cotización real de la selección local: envío mostrado de $45 y total $225 con un artículo de $180. Ningún OTP, pedido, cobro o despacho generado.
- Confirmación deshabilitada sin selección/dirección, también después de redimensionar. Sin desbordamiento horizontal en móvil. Lienzo con altura real en ambas vistas.

Capturas sin datos privados: `C:/Users/Kaleb/Desktop/pollo-robins-panel/output/mapbox-cart-20261012/desktop.png` y `mobile.png`.

Se encontró y corrigió que el CSS de Mapbox cambiaba el contenedor a `position:relative`, dejándolo con altura cero. Se fijó explícitamente su geometría absoluta al contenedor del mapa. Una vista de prueba anterior conservaba por PWA el índice de otro build e intentaba importar chunks ya reemplazados; la verificación final se realizó en un origen local limpio. Esto no certifica la actualización de una PWA de producción.

## Pendiente para publicar

Configurar las variables de Mapbox en Vercel, comprobar restricciones del token, publicar sólo los archivos revisados y repetir el recorrido sobre el dominio real. Esta entrega local no prueba el despliegue público ni migra las demás superficies de Google Maps.
