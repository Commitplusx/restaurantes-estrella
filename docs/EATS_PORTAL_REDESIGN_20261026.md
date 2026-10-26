# Portal de restaurantes y acceso a sucursales — publicación autorizada

## Causa de la ausencia

Los botones de Sucursales estaban dentro de comentarios «Oculto temporalmente» tanto en la navegación de escritorio como en la móvil de `PortalPage.tsx`. El gestor y las RPC ya existían. No era necesario crear otra tabla, duplicar sucursales, cambiar su número ni generar otro acceso para hacer visible la sección.

La principal ve Sucursales aunque no tenga ubicaciones adicionales. Un operador de sucursal conserva su acceso con teléfono y contraseña, su ubicación propia y los límites del servidor. Menú, promociones, perfil y envíos usan la sucursal elegida; el monitor de cocina mantiene explícitamente los pedidos de todas las ubicaciones administradas por la principal.

## Rediseño

`RestaurantPortalShell` es el componente real de presentación compartido por el portal y la vista local; `PortalPage` conserva autorización, carga, alertas, suscripciones, selección y componentes de negocio existentes.

- Escritorio: identidad del negocio, navegación agrupada, selección activa en negro, acceso visible a sucursales y enlace al menú público.
- Cabecera: sucursal actual siempre identificada; en pedidos aclara Todas tus sucursales y en gestión muestra el número de ubicaciones. La selección no cambia el algoritmo de asignación ni el aislamiento de PostgreSQL.
- Móvil: cuatro accesos relevantes y Más. La principal tiene Sucursales directamente; Envíos aparece si el servidor verificó la habilitación. El diálogo nativo contiene todos los accesos restantes y cerrar sesión, con Escape y enfoque propios del navegador.
- Inicio: resumen compacto con datos reales, estado del local, ventas y QR conservados. Platillos, combos, promociones, cupones y perfil comparten gris/blanco/tinta/naranja, controles y radios. No se modifican sus reglas de guardado, descuentos o precios.
- Los pedidos siguen montados entre pestañas y las alarmas no cambian. Se mantienen los cambios de PIN/avisos/performance publicados antes de este rediseño.

## Validación y estado

Compilación TypeScript/Vite aprobada; 46 pruebas Deno con comprobación de tipos de navegación, sucursales, login, caché/cola, PIN/cobros, cocina y promociones. ESLint del componente, navegación, preview y PortalPage limpio. Comparación de ocho archivos heredados contra `579cf5c` sin nuevos hallazgos; once hallazgos anteriores conservados. Detector del shell sin hallazgos. Ruta de demostración `/portal-diseno` excluida del build de producción por `import.meta.env.DEV`; reutiliza el shell y la lista pura de sucursales con datos sintéticos, sin llamadas de escritura.

**Publicación autorizada.** El 26 de octubre Kaleb pidió subir este candidato a GitHub. Se publica exclusivamente la lista revisada a main, conservando respaldos y hashes, y se comprueba el despliegue real por estado de Vercel y módulos públicos. La comparación del código normaliza sólo nombres de módulos, índices generados de precarga Vite y token público Mapbox. La revisión visual móvil/escritorio sigue pendiente; no se atribuyen a este rediseño las capturas de PIN anteriores. No se generaron servicios, accesos ni contraseñas reales. Backend, APK y worker permanecen iguales.

La evidencia privada de esta publicación queda en la raíz operativa `.codex-tmp/eats-portal-redesign-release-20261026/`: respaldo, manifiesto de fuentes/build, recibo GitHub, estado de Vercel y comparación pública. No subir credenciales ni evidencia privada en bloque.

Checkout: `C:/Users/Kaleb/.codex/tmp/eats-db-privacy-20261017`, sobre main `579cf5c0eda353141705363326fde3270f0c7b84`. El servidor local existente puede mostrar `/portal-diseno`; el portal autenticado sigue en `/portal`.
