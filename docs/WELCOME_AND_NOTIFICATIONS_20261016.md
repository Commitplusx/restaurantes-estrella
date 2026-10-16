# Bienvenida de clientes y notificaciones — 16 de octubre de 2026

## Alcance y estado

La bienvenida de clientes adopta el estilo de la web existente en móvil y PC. La activación de notificaciones deja de depender de esperas indefinidas y muestra permiso, preparación, suscripción, guardado, error y éxito como estados distintos. Privacidad y push comparten una presentación y esperan su turno después de la bienvenida.

Esta es una extensión ordinaria de la identidad observada: blanco, Outfit, tinta oscura, naranja Estrella y fotografía existente. `PRODUCT.md`, `DESIGN.md` y `.impeccable/design.json` se conservan; los contratos nuevos viven en sus briefs de superficie. No se creó una identidad global ni se sustituyeron los activos raster.

| Superficie | Estado de esta entrega al documentar |
| --- | --- |
| Bienvenida, avisos de privacidad y activación push | Publicados en `main` y comprobados en los módulos de `estrella-eats.mx`; recibo abajo |
| Supabase y servicio de envío push | Se utiliza el contrato existente de `push_subscriptions`; sin migración ni despliegue de backend en esta entrega |
| Entrega de una notificación a un teléfono | No comprobada |

Una compilación aprobada, una captura local o el permiso del navegador no prueban publicación ni entrega push. El recibo siguiente acredita publicación del código; la activación real documentada abajo sigue siendo de localhost y no acredita recepción física.

## Recibo de publicación

El commit funcional `cd946f97d87634ba16e2400cb7e8f18dc72957ba` se subió a `main` de `Commitplusx/restaurantes-estrella`. GitHub/Vercel confirmó `success` para [7VQgNU3Nw22THqvwyEWKGWkVKxF4](https://vercel.com/deiffs-projects/restaurantes-estrella/7VQgNU3Nw22THqvwyEWKGWkVKxF4). A las `2026-10-16T15:35:04.135Z`, la lectura HTTPS sin caché de `https://estrella-eats.mx` devolvió `/assets/index-CwPca5Zf.js` y `PublicLandingPage-Ul6nW4as.js`, con bienvenida, estados de activación y sin rutas de vista previa DEV. Evidencia privada: `web-publication.json` y `public-ui-assets.json`. Un commit documental posterior puede cambiar los identificadores del bundle sin alterar el código funcional revisado.

## Uso y continuidad visual

En la primera visita a la home, la bienvenida presenta dos pasos: **Comida de Comitán. A tu puerta.** y **Tu antojo. Así de fácil.** El segundo explica explorar, elegir domicilio/recogida y confirmar con el código de WhatsApp. **Cómo pedir** avanza; **Ver restaurantes** completa la bienvenida y devuelve la home existente. Los indicadores permiten elegir paso, la flecha vuelve al primero y **Omitir** está disponible en ambos. No se crea una ruta paralela de compra ni se prometen tiempos o beneficios nuevos.

PC utiliza un panel blanco de máximo 1120px con texto y fotografía en dos columnas. Hasta 760px pasa a pantalla completa con la foto arriba. Cabecera y acciones permanecen fuera del área central desplazable; en ventanas bajas el contenido puede desplazarse dentro del diálogo. Por debajo de 420px el progreso ocupa su propia fila para conservar el espacio de los botones. Se consideran safe areas.

El logo `/estrella-circle.png` y la foto `/desktop/comitan-table.webp` se reutilizan sin editar. La foto tiene texto alternativo y un fallback de icono si no carga. Los antiguos artes con texto y vídeo de onboarding ya no participan en este flujo.

Tras la bienvenida se presenta el aviso de privacidad y después el de push, según sus preferencias. Los avisos usan una superficie blanca compacta, controles de tinta, foco naranja y posición inferior derecha, con márgenes adaptados a móvil y desplazamiento interno en poca altura. No son diálogos modales ni bloquean el pedido. **Entendido** recuerda el aviso de privacidad; su cierre solo lo oculta durante ese montaje.

## Causa y contrato de activación push

La ruta anterior esperaba operaciones del service worker y de suscripción sin plazo y no pedía explícitamente el permiso al comienzo del clic. Un fallo de guardado podía registrarse solo en consola y cerrar el aviso. Ese código explica las vías por las que la interfaz podía permanecer en **Activando…** o dar una impresión de éxito incompleta; no constituye una reproducción en cada navegador físico.

La ruta vigente sigue siendo `PushNotificationSetup` → `activatePush` → permiso nativo → service worker listo → suscripción → `push_subscriptions`:

- Valida la clave pública VAPID y llama a `Notification.requestPermission()` dentro del clic, antes del primer `await` de activación. No registra un segundo service worker manual para eludir el existente.
- El permiso tiene un plazo de 20 segundos; preparación, suscripción y guardado tienen 10 segundos por fase. Un límite global de 45 segundos termina la activación completa. Las consultas auxiliares de suscripción y sesión tienen cinco segundos.
- **Cancelar**, cerrar el aviso o desmontarlo aborta la espera y evita avanzar a las fases siguientes. Las promesas nativas de permiso y suscripción no pueden abortarse: se comparten mientras estén pendientes, también en reintentos, para evitar solicitudes simultáneas duplicadas. Una respuesta nativa tardía no comunica éxito tras cancelar.
- Reutiliza la suscripción existente; si hace falta, crea una con `userVisibleOnly`. Conserva el `user_id` de la sesión o `null` para una visita anónima.
- Solo muestra **Notificaciones activadas** después del acuse de guardado. Un duplicado `23505` requiere comprobar que el endpoint ya existe; cualquier otro error mantiene un fallo visible y ofrece **Reintentar**. No hay reintentos automáticos sin límite.
- La identidad local de una activación guardada depende de endpoint, usuario y clave pública. Al montar, compara esa identidad con la suscripción y sesión actuales; una diferencia vuelve a ofrecer activación. Este control local no comprueba en cada carga la existencia remota del registro.

La interfaz distingue permiso bloqueado, permiso no aceptado, configuración inválida, espera agotada y fallo de conexión/guardado. **Ahora no** y el cierre previo al éxito guardan `push_prompt_dismissed=true`; **Listo** cierra el éxito sin convertirlo en un rechazo. La elegibilidad requiere contexto seguro y soporte de Service Worker, PushManager y Notification; un permiso ya denegado no vuelve a provocar el aviso nativo.

El texto confirma que este navegador puede recibir avisos y conserva el tracker como vía para consultar el pedido. No asegura que el servidor haya enviado una notificación ni que un teléfono la haya recibido.

## Accesibilidad, preferencias y cola

La bienvenida se monta en un portal de `document.body` con `role="dialog"`, nombre y `aria-modal`. Al abrir toma el foco, vuelve `inert` el contenido de `#root` y bloquea el scroll del cuerpo compensando la barra. Al cerrar restaura el estado previo y el foco si el elemento sigue conectado. Tab/Shift+Tab circulan por sus controles, flechas izquierda/derecha cambian de paso y Escape completa/omite la bienvenida. El paso actual utiliza `aria-current="step"` y un contador con anuncio cortés.

Los avisos exponen un nombre accesible. Un único `role="status"` persistente anuncia fase, error o éxito de push; la copia visual del feedback se excluye del árbol accesible para no duplicar anuncios. Los botones tienen foco visible; activar queda deshabilitado durante la operación, y cancelar sigue disponible. La bienvenida elimina su desplazamiento y transiciones bajo `prefers-reduced-motion`; el aviso reduce su entrada y detiene el spinner.

`NoticeProvider` elige una sola superficie registrada, con prioridades bienvenida 100, privacidad 20 y push 10. Al desaparecer la actual se libera el siguiente aviso. Esto coordina estas tres superficies; no certifica una cola global de todos los overlays heredados de la aplicación.

`noticePreferences.ts` centraliza lectura y escritura de `estrella_onboarding_done`, `cookies_accepted`, `push_prompt_dismissed` y `push_subscription_identity`. Si el almacenamiento local falla, mantiene la elección en memoria para ese contexto y emite una advertencia sin datos del cliente; no promete persistencia tras recargar en ese caso. No se documentan endpoints ni valores de suscripción reales.

## Archivos y vistas de revisión

| Archivo | Responsabilidad |
| --- | --- |
| `src/components/OnboardingFlow.tsx` y `.css` | Dos pasos, presentación responsive, teclado, foco, inert y finalización |
| `src/components/PushNotificationSetup.tsx` | Integración nativa/Supabase y contenido de estados del aviso |
| `src/lib/pushActivation.ts` | Contrato tipado de fases, validación VAPID, plazos y cancelación |
| `src/components/NoticeCenter.tsx` y `.css` | Proveedor de cola y superficie común de avisos |
| `src/hooks/useNoticeSlot.ts`, `src/lib/noticeQueue.ts` | Registro, elegibilidad y selección del aviso visible |
| `src/lib/noticePreferences.ts` | Preferencias con respaldo de memoria cuando falla localStorage |
| `src/components/CookieBanner.tsx` | Privacidad integrada en la misma cola y estilo |
| `src/App.tsx`, `src/pages/PublicLandingPage.tsx` | Proveedor, rutas DEV y lectura de preferencia de bienvenida |
| `src/dev/NoticeDesignPreview.tsx`, `src/dev/WelcomeDesignPreview.tsx` | Vistas locales de revisión |
| `tests/pushActivation_test.ts` | Pruebas tipadas de los contratos de activación |

`/avisos` y `/bienvenida` solo se registran con `import.meta.env.DEV`. `/avisos` permite revisar ocho estados de presentación —privacidad, push, permiso, worker, suscripción, guardado, error y éxito— sin pedir permiso ni guardar suscripciones; no prueba activación real. `/bienvenida` monta el componente real y permite reabrirlo, por lo que completar escribe la preferencia de bienvenida del navegador local.

## Verificación y límites

El build final TypeScript/Vite y ESLint de los módulos nuevos aprobaron tras la corrección del anuncio de éxito. Las 12 pruebas Deno con comprobación de tipos cubren orden síncrono del permiso, rechazo/cierre, esperas agotadas de permiso/worker/proveedor/guardado, error al guardar, éxito posterior al guardado, cancelación de permiso y worker, VAPID inválida y limpieza con señal ya abortada. Son pruebas del contrato inyectado; no sustituyen al navegador ni verifican entrega remota.

La revisión local real confirmó avanzar, volver, omitir, reabrir, wrap de Tab desde el último control a **Omitir**, Escape, restauración del DOM y continuación de la cola. Se comprobó `#root.inert` mientras estaba abierta la bienvenida. Ancho del documento y viewport coincidieron en 322, 1024 y 1440px, sin desbordamiento horizontal. En 1024×600 el diálogo quedó en x/y 12px, con 1000×576px y pie hasta y=588px.

Una activación real en localhost alcanzó **Notificaciones activadas** después del guardado existente. No se envió una notificación de prueba. No se probó entrega en teléfono, lector de pantalla físico ni comportamiento de Safari/iOS físico.

Capturas vigentes en `C:/Users/Kaleb/.codex/private-backups/promotion-rules-20261016/`:

- `welcome-desktop.png`, `welcome-desktop-step2.png`: bienvenida real, 1440×875.
- `welcome-mobile.png`, `welcome-mobile-step2.png`: bienvenida real, 322×844.
- `push-desktop-real.png`: activación real de localhost, 1440×875.
- `push-mobile.png`: presentación de la fase de permiso en la vista DEV, 322×844; es una muestra de UI, no una activación móvil.

Las dos capturas móviles iniciales inválidas fueron sustituidas por las de viewport real. El finish reviewer pidió corregir el anuncio de éxito y esas capturas; tras ambos cambios devolvió **ship** para el alcance revisado. Ese veredicto no acredita publicación ni los dispositivos/pruebas expresamente pendientes.
