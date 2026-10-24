import { useState, useEffect, useRef } from 'react';
import { Bell, Check, Loader2, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { NoticeSurface } from './NoticeCenter';
import { useNoticeSlot } from '../hooks/useNoticeSlot';
import { readPreference, writePreference } from '../lib/noticePreferences';
import { activatePush, decodeVapid, PushActivationError, withDeadline } from '../lib/pushActivation';
import type { PushPhase } from '../lib/pushActivation';

const key = import.meta.env.VITE_VAPID_PUBLIC_KEY?.trim() || '';
const phases: Record<PushPhase, string> = {
  permission: 'Confirma el permiso del navegador.', worker: 'Preparando este navegador…',
  subscription: 'Conectando las notificaciones…', saving: 'Guardando tu preferencia…',
};
// Keep unresolved browser operations across retries: their native promises cannot be aborted.
let permissionRequest: Promise<NotificationPermission> | null = null;
let subscriptionRequest: Promise<PushSubscription> | null = null;
function permissionFromClick(): Promise<NotificationPermission> {
  if (Notification.permission !== 'default') return Promise.resolve(Notification.permission);
  if (!permissionRequest) {
    permissionRequest = Notification.requestPermission();
    void permissionRequest.finally(() => { permissionRequest = null; }).catch(() => undefined);
  }
  return permissionRequest;
}
async function ensureSubscription(registration: ServiceWorkerRegistration, signal: AbortSignal): Promise<PushSubscription> {
  const existing = await withDeadline(registration.pushManager.getSubscription(), 5_000, 'No pudimos consultar las notificaciones de este navegador.', signal);
  signal.throwIfAborted();
  if (existing) return existing;
  if (!subscriptionRequest) {
    subscriptionRequest = registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: decodeVapid(key) });
    void subscriptionRequest.finally(() => { subscriptionRequest = null; }).catch(() => undefined);
  }
  return subscriptionRequest;
}
async function saveSubscription(subscription: PushSubscription, signal: AbortSignal): Promise<void> {
  const { data, error: authError } = await withDeadline(supabase.auth.getSession(), 5_000, 'No pudimos comprobar tu sesión. Vuelve a intentarlo.', signal);
  if (authError) throw new PushActivationError('No pudimos comprobar tu sesión. Vuelve a intentarlo.');
  const identity = JSON.stringify([subscription.endpoint, data.session?.user.id ?? null, key]);
  if (readPreference('push_subscription_identity') === identity) return;
  signal.throwIfAborted();
  const { error } = await supabase.from('push_subscriptions').insert({ user_id: data.session?.user.id ?? null, subscription: subscription.toJSON() }).abortSignal(signal);
  if (error) {
    // A duplicate is only successful when the existing endpoint can actually be verified.
    if (error.code !== '23505') throw new PushActivationError('Tenemos un problema de conexión. El permiso está listo, pero falta guardar la activación.');
    const existing = await supabase.rpc('storefront_has_push_subscription', {p_subscription: subscription.toJSON()}).abortSignal(signal);
    if (existing.error || existing.data !== true) throw new PushActivationError('No pudimos comprobar la activación anterior. Vuelve a intentarlo.');
  }
  signal.throwIfAborted();
  writePreference('push_subscription_identity', identity);
}

export function PushNotificationSetup() {
  const [visible, setVisible] = useState(() => 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window && window.isSecureContext
    && Notification.permission !== 'denied' && readPreference('push_prompt_dismissed') !== 'true'
    && !(Notification.permission === 'granted' && readPreference('push_subscription_identity')));
  const [phase, setPhase] = useState<PushPhase | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const running = useRef(false);
  const activation = useRef<AbortController | null>(null);
  const alive = useRef(false);
  const shown = useNoticeSlot('push', visible, 10);
  useEffect(() => {
    alive.current = true;
    if ('serviceWorker' in navigator && 'Notification' in window && Notification.permission === 'granted'
      && readPreference('push_subscription_identity') && readPreference('push_prompt_dismissed') !== 'true') {
      const checkSaved = async () => {
        try {
          const registration = await withDeadline(navigator.serviceWorker.getRegistration(), 5_000, 'Browser unavailable');
          const subscription = registration ? await withDeadline(registration.pushManager.getSubscription(), 5_000, 'Browser unavailable') : null;
          const { data, error: sessionError } = await withDeadline(supabase.auth.getSession(), 5_000, 'Session unavailable');
          if (sessionError) throw new Error('Session unavailable');
          const identity = subscription ? JSON.stringify([subscription.endpoint, data.session?.user.id ?? null, key]) : '';
          if (alive.current && identity !== readPreference('push_subscription_identity')) setVisible(true);
        } catch { if (alive.current) { setVisible(true); setError('No pudimos comprobar tus notificaciones. Puedes reintentar sin perder tu pedido.'); } }
      };
      void checkSaved();
    }
    return () => { alive.current = false; activation.current?.abort(); };
  }, []);

  const activate = async () => {
    if (running.current) return;
    running.current = true; setError(''); setPhase('permission');
    const controller = new AbortController();
    activation.current = controller;
    // Bound the complete operation as well as each individual phase.
    const timer = setTimeout(() => controller.abort(new PushActivationError('La activación tardó demasiado. Puedes volver a intentarlo.')), 45_000);
    try {
      decodeVapid(key);
      // Request permission synchronously within the customer's click, before any await.
      await activatePush({ permission: permissionFromClick, ready: () => navigator.serviceWorker.ready, subscribe: registration => ensureSubscription(registration, controller.signal),
        save: subscription => saveSubscription(subscription, controller.signal), signal: controller.signal,
        phase: value => { if (alive.current && !controller.signal.aborted) setPhase(value); } });
      if (alive.current && !controller.signal.aborted) setSuccess(true);
    } catch (cause: unknown) {
      if (alive.current && (!controller.signal.aborted || controller.signal.reason instanceof PushActivationError)) setError(cause instanceof PushActivationError ? cause.message : controller.signal.reason instanceof PushActivationError ? controller.signal.reason.message : 'No pudimos activar las notificaciones. Puedes reintentar y seguir tu pedido aquí.');
      console.warn('push_activation_failed', { kind: cause instanceof Error ? cause.name : 'unknown' });
    } finally { clearTimeout(timer); controller.abort(); running.current = false; activation.current = null; if (alive.current) setPhase(null); }
  };
  const dismiss = () => { activation.current?.abort(); writePreference('push_prompt_dismissed', 'true'); setVisible(false); };
  if (!shown) return null;
  return <PushNoticeContent phase={phase} error={error} success={success} activate={() => void activate()} dismiss={success ? () => setVisible(false) : dismiss} />;
}
export function PushNoticeContent({ phase, error, success, activate, dismiss }: {
  phase: PushPhase | null; error: string; success: boolean; activate: () => void; dismiss: () => void;
}) {
  return <NoticeSurface label="Notificaciones de Estrella Eats">
    <p className="sr-only" role="status" aria-live="polite" aria-atomic="true">{success ? 'Notificaciones activadas. Este navegador ya puede recibir avisos de Estrella Eats.' : error || (phase ? phases[phase] : '')}</p>
    <div className="eats-notice-heading">{success ? <Check size={22} aria-hidden="true" /> : <Bell size={22} aria-hidden="true" />}<h2>{success ? 'Notificaciones activadas' : 'Activa tus notificaciones'}</h2></div>
    <p>{success ? 'Este navegador ya puede recibir avisos de Estrella Eats.' : 'Recibe avisos y promociones en este navegador. También puedes seguir tu pedido en la web.'}</p>
    {(phase || error) && <div className="eats-notice-feedback" data-error={Boolean(error)} aria-hidden="true"><p>{error || (phase && phases[phase])}</p></div>}
    <div className="eats-notice-actions">
      <button className="eats-notice-primary" disabled={Boolean(phase)} onClick={success ? dismiss : activate}>
        {phase && <Loader2 size={16} className="eats-notice-spinner" aria-hidden="true" />}{success ? 'Listo' : phase ? 'Activando…' : error ? 'Reintentar' : 'Activar notificaciones'}
      </button>
      {!success && <button className="eats-notice-secondary" onClick={dismiss}>{phase ? 'Cancelar' : 'Ahora no'}</button>}
    </div>
    <button className="eats-notice-close" aria-label="Cerrar aviso de notificaciones" onClick={dismiss}><X size={18} aria-hidden="true" /></button>
  </NoticeSurface>;
}
