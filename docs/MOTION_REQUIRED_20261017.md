# Movimiento completo obligatorio — 17 de octubre de 2026

Kaleb reiteró que las animaciones forman parte fija de la web. El cambio estaba preparado en el workspace local, pero `main` conservaba el selector. Esta entrega incorpora exclusivamente esa política sobre `e95a9d6`, conservando las correcciones de seguimiento y carrito.

`SiteMotionProvider` usa un valor estable e inmutable con movimiento habilitado y `MotionConfig reducedMotion="never"`. Establece el estado del documento antes del primer pintado. No consulta ni guarda `eats_motion_preference`: una elección antigua del navegador ya no puede apagar las escenas. La preferencia del dispositivo no cambia; esta web presenta las animaciones completas por la petición expresa del propietario.

Se retira `MotionPreferenceButton` y sus entradas de home, menú, beneficios y documentos legales. También desaparecen el selector de la bienvenida, el control flotante local y sus estilos. Login, mapa de dirección y avisos reutilizan la misma política, sin un segundo selector. Se retiran las excepciones CSS y de scroll que anulaban el movimiento por preferencia del sistema. Contenido, navegación, foco, reglas de compra y fórmulas de parallax existentes se conservan; el trabajo fuera de pantalla/oculto mantiene sus límites anteriores. No se añade una dependencia.

## Comprobación

- TypeScript y build Vite/PWA aprobados; ESLint de provider/contexto, bienvenida, avisos, información pública y recibo aprobado.
- 35 regresiones tipadas de acceso a seguimiento, canales compartidos, conservación del carrito, estados, promociones y notificaciones aprobadas.
- Búsqueda sobre las fuentes sin restos del componente eliminado, selector, persistencia de preferencia o rutas CSS/JS que apagan el movimiento. `git diff --check` aprobado.
- Detector Impeccable ejecutado una vez: 344 avisos de escala/paleta y tres hallazgos en estilos heredados fuera del cambio (color de home, bounce del menú y borde de cocina). No se modificaron esas decisiones ni se presenta el proyecto entero como normalizado.
- No hay revisión visual nueva: el control del navegador devuelve «Local browser use is disabled in Work settings». La compilación no demuestra FPS, scroll físico ni que la PWA del usuario ya esté actualizada.

Se sube a GitHub `main` para que Kaleb revise Vercel. Comprobar la versión nueva en móvil/PC, footer, bienvenida, agregar al carrito, cambio de sucursal y regreso al catálogo. Si se sirve una versión anterior, el push no prueba que el dominio ya esté actualizado. No se modificó el backend.
