# Actualizaciones de la web y categorías

Superficie: web pública Estrella Eats. No cambia bot, Supabase, APK ni notificaciones push.

`PwaUpdateNotice` observa la activación de una nueva versión mediante el registro de la PWA existente. El aviso ofrece Actualizar ahora y Más tarde; minimizarlo conserva un botón Nueva versión. Recargar se bloquea en carrito, login y portal para no interrumpir formularios. La versión nueva ya debe estar activada antes de ofrecer la recarga. No se modificó registerType, workbox, cachés ni el registro push.

La comprobación ocurre con la página visible y online, al volver a ella, recuperar conexión, cambiar de ruta y cada cinco minutos. Hay límite de una comprobación por minuto, sin concurrencia duplicada; los errores son observables y permiten el próximo intento acotado. No se promete detección inmediata sin conexión. Las páginas antiguas que todavía no contienen este componente necesitan cargar esta versión inicialmente.

La revisión automática rechazó una propuesta amplia que también cambiaba caché y registro push. Se redujo el cambio a observación y UI sobre el ciclo ya instalado.

`LandingFoodCategories` conserva filtros y catálogo existentes, con seis columnas en PC, cuatro en tablet y carrusel en teléfono. Hero acotado por columnas minmax, título flexible y acciones con wrap. Pantallas de PC de hasta 700px de alto usan una presentación de 420px.

Verificación local: build TypeScript/Vite aprobado, ESLint de componentes nuevos aprobado; tres pruebas del bloqueo de formularios, conexión/instalación, concurrencia, throttle y recuperación del error. Prueba de dos compilaciones reales en preview 5197: aviso aparecido, Más tarde dejó recordatorio, restauración y Actualizar ahora cargó `/assets/index-FjwKInYE.js` y retiró el aviso. No se simuló el estado de actualización.

Catálogo: Sushi filtró MAKITAN y Todos restauró la lista. Documento sin overflow horizontal en 320, 390, 768, 1024 y 1919px. Capturas locales en `output/mapbox-cart-20261012/pwa-update-mobile.png` y `categories-desktop.png` del workspace Robin's. Esta evidencia local no confirma publicación.

Publicación comprobada del aviso y categorías: `93b53ec` en `main`, Vercel `M2vuwxboHqBs9Be3oRZfDRQb8M6d` Ready; `estrella-eats.mx` cargó `/assets/index-CZ55lH15.js`. La pestaña que conservaba una compilación antigua necesitó cargar esta versión primero; no se afirma que un cliente sin el observador pueda recibir un aviso retroactivo.

En la entrega siguiente `3c51df8`, la línea gris móvil se ocultó conservando el carrusel. El diseño de información pública y el retorno al catálogo están descritos en [su registro](PUBLIC_INFO_DESIGN_20261012.md).
