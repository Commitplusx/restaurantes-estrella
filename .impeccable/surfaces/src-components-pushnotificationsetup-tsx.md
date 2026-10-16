---
version: 1
slug: "src-components-pushnotificationsetup-tsx"
primary_target: "src/components/PushNotificationSetup.tsx"
related_targets: ["src/components/NoticeCenter.tsx","src/components/NoticeCenter.css","src/components/CookieBanner.tsx","src/hooks/useNoticeSlot.ts","src/lib/noticeQueue.ts","src/lib/noticePreferences.ts","src/lib/pushActivation.ts","src/App.tsx","src/dev/NoticeDesignPreview.tsx","tests/pushActivation_test.ts"]
---

# Avisos y activación de notificaciones

## Scope and visitor mode

Operate. Permitir activar notificaciones en móvil/PC con estados y salida claros; integrar privacidad y push en una cola después de la bienvenida. Extensión ordinaria de blanco, Outfit, tinta y naranja de la web. Conservar DESIGN.md y sidecar; no crear un nuevo sistema visual ni un servicio de envío.

## Direction contract

THESIS: El cliente sabe qué está esperando el navegador y solo ve éxito después del guardado de la suscripción.

OWN-WORLD: Aviso blanco compacto con icono de marca, título legible, explicación directa, botón principal de tinta y secundario gris. Foco naranja, controles de al menos 44px, borde redondeado y sombra discreta. Reutiliza la identidad existente sin incorporar activos raster nuevos.

STORY: Activar → confirmar permiso → preparar navegador → conectar suscripción → guardar → Listo. Error visible con Reintentar; Ahora no, Cancelar y cerrar permiten salir. El tracker sigue disponible para consultar el pedido; no prometer entrega de mensajes sin comprobarla.

FIRST VIEWPORT: Aviso al pie a la derecha, hasta 380px de ancho, con márgenes móviles/safe areas y desplazamiento interno para ventanas bajas. Es un aside nombrado, no un modal. La cola muestra una sola de estas superficies: bienvenida 100, privacidad 20, push 10. No afirmar que todos los overlays heredados pertenecen a esta cola.

FORM: Extensión del estilo web solicitada por el usuario junto con la reparación de «Activando…». Privacidad comparte el mismo NoticeSurface y conserva su enlace legal.

SIGNATURE INTERACTION: Permiso nativo solicitado desde el clic antes del primer await. Progreso por fases con plazos, límite global de 45s, cancelación y promesas nativas compartidas durante reintentos. Un role=status persistente anuncia fase, error y éxito sin duplicar la copia visual. Reduced motion reduce la entrada y detiene el spinner.

FINISH: Doce pruebas Deno tipadas, ESLint de módulos nuevos y build final aprobados. Activación real en localhost llegó al éxito; captura móvil de permiso pertenece a la vista DEV y solo prueba presentación. Finish reviewer devolvió ship después de corregir anuncio de éxito y capturas móviles. Sin envío push de prueba, entrega en teléfono, lector de pantalla físico ni Safari/iOS físico comprobados. Publicación pendiente de evidencia separada.

## Runtime contract

La ruta previa podía esperar worker/proveedor indefinidamente y cerrar el aviso pese a un error al guardar. La ruta vigente valida VAPID, aplica plazos de 20s al permiso y 10s a worker/suscripción/guardado, más cinco segundos a consultas auxiliares y 45s globales. Cancelar/desmontar aborta las esperas y detiene las fases posteriores. El permiso y subscribe nativos pendientes se comparten porque no son abortables; una respuesta tardía tras cancelar no comunica éxito. No hay retry automático sin límite ni registro paralelo de worker.

`push_subscriptions` conserva el contrato existente con user_id de sesión o null. Éxito requiere acuse de insert o comprobación del endpoint tras duplicado 23505. La identidad local vincula endpoint/usuario/clave pública; al montar se compara con suscripción y sesión actuales. No es una comprobación remota continua. No registrar endpoints, claves ni datos completos en informes.

Preferencias centralizadas con memoria si localStorage falla. `push_prompt_dismissed` se guarda al descartar/cancelar antes del éxito; Listo solo cierra. Soporte nativo, contexto seguro y permiso no denegado condicionan la elegibilidad. Privacidad guarda cookies_accepted con Entendido; cerrar solo oculta durante el montaje.

`/avisos` solo existe en DEV y reproduce privacidad, inicio, fases, error y éxito sin solicitar permisos ni guardar suscripciones. Documentación y evidencia vigente: `docs/WELCOME_AND_NOTIFICATIONS_20261016.md`.
