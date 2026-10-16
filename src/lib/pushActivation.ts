export type PushPhase = 'permission' | 'worker' | 'subscription' | 'saving';
export class PushActivationError extends Error {}

export function decodeVapid(value: string): Uint8Array<ArrayBuffer> {
  try {
    if (!/^[A-Za-z0-9_-]+$/.test(value)) throw new Error('invalid');
    const raw = atob(value.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - value.length % 4) % 4));
    const bytes = Uint8Array.from(raw, char => char.charCodeAt(0));
    if (bytes.length !== 65 || bytes[0] !== 4) throw new Error('invalid');
    return bytes;
  } catch { throw new PushActivationError('Las notificaciones no están configuradas. Puedes seguir tu pedido aquí.'); }
}

export async function withDeadline<T>(task: PromiseLike<T>, ms: number, message: string, signal?: AbortSignal): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let cancel: (() => void) | undefined;
  try {
    return await Promise.race([Promise.resolve(task), new Promise<never>((_resolve, reject) => {
      cancel = () => reject(new DOMException('Activación cancelada.', 'AbortError'));
      if (signal?.aborted) { cancel(); return; }
      signal?.addEventListener('abort', cancel, { once: true });
      timer = setTimeout(() => reject(new PushActivationError(message)), ms);
    })]);
  } finally { clearTimeout(timer); if (cancel) signal?.removeEventListener('abort', cancel); }
}

export interface PushActivationPorts<Worker, Subscription> {
  permission: () => Promise<NotificationPermission>;
  ready: () => PromiseLike<Worker>;
  subscribe: (registration: Worker) => PromiseLike<Subscription>;
  save: (subscription: Subscription) => PromiseLike<void>;
  phase: (phase: PushPhase) => void;
  timeout?: number;
  signal?: AbortSignal;
}
export async function activatePush<Worker, Subscription>(ports: PushActivationPorts<Worker, Subscription>): Promise<void> {
  const timeout = ports.timeout ?? 10_000;
  ports.signal?.throwIfAborted();
  ports.phase('permission');
  // Calling the browser here, before the first await, preserves the click gesture.
  const permission = await withDeadline(ports.permission(), timeout * 2, 'Revisa el permiso junto a la dirección del navegador y vuelve a intentarlo.', ports.signal);
  if (permission !== 'granted') throw new PushActivationError(permission === 'denied'
    ? 'El navegador bloqueó las notificaciones. Puedes permitirlas desde el candado de la dirección.'
    : 'No activaste el permiso. Puedes intentarlo cuando quieras.');
  ports.phase('worker');
  ports.signal?.throwIfAborted();
  const registration = await withDeadline(ports.ready(), timeout, 'No pudimos preparar las notificaciones. Reintenta o actualiza la página.', ports.signal);
  ports.phase('subscription');
  ports.signal?.throwIfAborted();
  const subscription = await withDeadline(ports.subscribe(registration), timeout, 'El navegador tardó demasiado. Puedes reintentar sin duplicar tu suscripción.', ports.signal);
  ports.phase('saving');
  ports.signal?.throwIfAborted();
  await withDeadline(ports.save(subscription), timeout, 'No pudimos guardar la activación. Reintenta cuando vuelva la conexión.', ports.signal);
}
