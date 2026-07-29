import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Bell, X } from 'lucide-react';

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY;

// Utilidad para convertir la clave VAPID
function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function PushNotificationSetup() {
  const [showPrompt, setShowPrompt] = useState(false);
  const [isSubscribing, setIsSubscribing] = useState(false);

  useEffect(() => {
    const checkSubscription = async () => {
      // 1. Verificar soporte
      if (!('serviceWorker' in navigator)) {
        console.log("No soporta Service Worker");
        return;
      }
      if (!('PushManager' in window)) {
        console.log("No soporta PushManager (Si estás en iPhone, DEBES instalarla primero con Agregar a Inicio)");
        return;
      }

      // 2. Si ya lo rechazó o ya lo cerramos, no molestar por un tiempo
      if (localStorage.getItem('push_prompt_dismissed') === 'true') {
        console.log("El prompt fue cerrado anteriormente (limpia localStorage para volver a verlo)");
        return;
      }

      // 3. Verificar permiso actual
      if (Notification.permission === 'granted') {
        console.log("Permiso ya concedido, suscribiendo silenciosamente...");
        await subscribeUser(true); // true = modo silencioso (sin UI)
        return;
      }

      if (Notification.permission === 'denied') {
        console.log("El usuario bloqueó las notificaciones en el navegador");
        return;
      }

      console.log("Mostrando prompt de notificaciones...");
      // 4. Mostrar el prompt amigable si no ha interactuado
      setTimeout(() => setShowPrompt(true), 1000); // Reducido a 1 segundo para pruebas

    };

    checkSubscription();
  }, []);

  const subscribeUser = async (silent = false) => {
    if (!VAPID_PUBLIC_KEY) {
      console.warn("Falta VITE_VAPID_PUBLIC_KEY en .env");
      return;
    }

    try {
      if (!silent) setIsSubscribing(true);

      let registration = await navigator.serviceWorker.getRegistration();
      
      if (!registration) {
        console.log("No se encontró Service Worker activo, registrando manualmente...");
        registration = await navigator.serviceWorker.register('/push-sw.js');
      }

      // Asegurarnos que esté activo
      if (!registration.active) {
         await navigator.serviceWorker.ready;
      }
      
      let subscription = await registration.pushManager.getSubscription();
      
      if (!subscription) {
        // Pedir permiso y suscribir
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
        });
      }

      // Obtener el usuario actual si está logueado
      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id || null;

      // Evitar guardar duplicados en cada recarga
      if (silent && localStorage.getItem('push_subscription_saved') === 'true') {
        return;
      }

      // Guardar en Supabase
      const { error } = await supabase.from('push_subscriptions').insert([{
        user_id: userId,
        subscription: subscription
      }]);

      if (!error || error.code === '23505') {
        localStorage.setItem('push_subscription_saved', 'true');
      }

      if (error && error.code !== '23505') { // Ignorar error si ya existe (clave única)
        console.error("Error guardando suscripción:", error);
      }

      if (!silent) setShowPrompt(false);
    } catch (error: any) {
      if (error.name === 'AbortError' || error.message?.includes('AbortError')) {
        console.warn('Suscripción push abortada (normal en local o navegadores sin soporte completo).');
      } else {
        console.error('Error suscribiendo a notificaciones push:', error);
      }
    } finally {
      if (!silent) setIsSubscribing(false);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem('push_prompt_dismissed', 'true');
  };

  if (!showPrompt) return null;

  return (
    <div className="fixed bottom-6 left-4 right-4 md:left-1/2 md:w-[400px] md:-translate-x-1/2 z-[110] bg-white text-slate-800 rounded-[20px] shadow-[0_20px_40px_-15px_rgba(0,0,0,0.15)] p-5 border border-slate-200 flex items-start gap-4 animate-in fade-in slide-in-from-bottom-8 duration-700 ease-out">
      <div className="w-12 h-12 bg-orange-50 text-orange-500 rounded-full flex items-center justify-center shrink-0 border border-orange-100">
        <Bell size={22} />
      </div>
      <div className="flex-1 pt-0.5">
        <h4 className="font-bold text-slate-900 text-[15px] tracking-tight">Activa las notificaciones</h4>
        <p className="text-[13px] text-slate-500 mt-1.5 leading-snug pr-2">
          Entérate al instante de promociones exclusivas, cupones y el estado de tu pedido.
        </p>
        <div className="flex items-center gap-4 mt-4">
          <button
            onClick={() => subscribeUser(false)}
            disabled={isSubscribing}
            className="bg-orange-500 text-white px-5 py-2 rounded-xl text-xs font-bold hover:bg-orange-600 transition-all active:scale-95 disabled:opacity-50 shadow-md shadow-orange-500/20"
          >
            {isSubscribing ? 'Activando...' : 'Activar ahora'}
          </button>
          <button
            onClick={handleDismiss}
            className="text-slate-400 hover:text-slate-600 text-xs font-semibold transition-colors"
          >
            Quizás luego
          </button>
        </div>
      </div>
      <button 
        onClick={handleDismiss}
        className="absolute top-4 right-4 text-slate-300 hover:text-slate-500 transition-colors p-1"
      >
        <X size={18} />
      </button>
    </div>
  );
}
