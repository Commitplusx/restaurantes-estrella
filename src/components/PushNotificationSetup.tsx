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
      if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        return;
      }

      // 2. Si ya lo rechazó o ya lo cerramos, no molestar por un tiempo
      if (localStorage.getItem('push_prompt_dismissed') === 'true') {
        return;
      }

      // 3. Verificar permiso actual
      if (Notification.permission === 'granted') {
        // Ya tiene permiso, asegurarnos de que la suscripción está en la base de datos
        await subscribeUser(true); // true = modo silencioso (sin UI)
        return;
      }

      if (Notification.permission === 'denied') {
        return;
      }

      // 4. Mostrar el prompt amigable si no ha interactuado
      setTimeout(() => setShowPrompt(true), 5000); // Mostrar después de 5 seg
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

      const registration = await navigator.serviceWorker.ready;
      
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

      // Guardar en Supabase
      const { error } = await supabase.from('push_subscriptions').insert([{
        user_id: userId,
        subscription: subscription
      }]);

      if (error && error.code !== '23505') { // Ignorar error si ya existe (clave única)
        console.error("Error guardando suscripción:", error);
      }

      if (!silent) setShowPrompt(false);
    } catch (error) {
      console.error('Error suscribiendo a notificaciones push:', error);
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
    <div className="fixed top-4 left-4 right-4 md:left-1/2 md:w-auto md:-translate-x-1/2 z-[110] bg-white rounded-2xl shadow-xl p-4 border border-slate-100 flex items-start gap-4 animate-in fade-in slide-in-from-top-4 duration-500">
      <div className="w-10 h-10 bg-orange-100 text-orange-500 rounded-full flex items-center justify-center shrink-0">
        <Bell size={20} />
      </div>
      <div className="flex-1 pt-1">
        <h4 className="font-bold text-slate-800 text-sm">Activa las notificaciones</h4>
        <p className="text-xs text-slate-500 mt-1">
          Entérate al instante de promociones exclusivas, cupones y el estado de tu pedido.
        </p>
        <div className="flex items-center gap-3 mt-3">
          <button
            onClick={() => subscribeUser(false)}
            disabled={isSubscribing}
            className="bg-orange-500 text-white px-4 py-1.5 rounded-lg text-xs font-bold hover:bg-orange-600 transition-colors disabled:opacity-50"
          >
            {isSubscribing ? 'Activando...' : 'Activar ahora'}
          </button>
          <button
            onClick={handleDismiss}
            className="text-slate-400 hover:text-slate-600 text-xs font-medium"
          >
            Quizás luego
          </button>
        </div>
      </div>
      <button 
        onClick={handleDismiss}
        className="text-slate-300 hover:text-slate-500 p-1"
      >
        <X size={16} />
      </button>
    </div>
  );
}
