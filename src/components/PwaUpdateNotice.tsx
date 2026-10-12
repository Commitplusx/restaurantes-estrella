import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { RefreshCw, X } from 'lucide-react';
import { createUpdateProbe, isUpdateBlocked } from '../lib/pwaUpdatePolicy';
import './pwaUpdateNotice.css';

export function PwaUpdateNotice() {
  const { pathname } = useLocation();
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);
  const [available, setAvailable] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const probeRef = useRef<(() => Promise<void>) | null>(null);
  const reloadRequested = useRef(false);
  // Observe the existing autoUpdate worker. An activated update does not reload
  // this page until the customer chooses the action below.
  useRegisterSW({
    onRegisteredSW(_url, worker) { setRegistration(worker || null); },
    onNeedReload() { setAvailable(true); setMinimized(false); },
    onRegisterError() { console.warn('[PWA] No se pudo observar la actualización.'); },
  });
  const blocked = isUpdateBlocked(pathname);

  useEffect(() => {
    if (!registration) return;
    const check = createUpdateProbe({
      update: () => registration.update(),
      eligible: () => navigator.onLine && document.visibilityState === 'visible',
      installing: () => registration.installing !== null,
      now: () => Date.now(),
      onError: () => console.warn('[PWA] No se pudo comprobar una nueva versión.'),
    });
    probeRef.current = check;
    const resume = () => { void check(); };
    const interval = setInterval(resume, 5 * 60_000);
    window.addEventListener('focus', resume);
    window.addEventListener('online', resume);
    document.addEventListener('visibilitychange', resume);
    resume();
    return () => {
      probeRef.current = null;
      clearInterval(interval);
      window.removeEventListener('focus', resume);
      window.removeEventListener('online', resume);
      document.removeEventListener('visibilitychange', resume);
    };
  }, [registration]);
  useEffect(() => { void probeRef.current?.(); }, [pathname]);

  const reload = () => {
    if (blocked || reloadRequested.current || !available) return;
    reloadRequested.current = true;
    window.location.reload();
  };
  if (!available) return null;
  if (minimized) return <button type="button" className="pwa-update-reminder" onClick={() => setMinimized(false)}>
    <RefreshCw size={17} aria-hidden="true" /> Nueva versión
  </button>;
  return (
    <aside className="pwa-update-notice" aria-label="Actualización de Estrella Eats">
      <div className="pwa-update-message" role="status">
        <RefreshCw size={20} aria-hidden="true" />
        <div><h2>Nueva versión disponible</h2><p>{blocked ? 'Vuelve al inicio cuando termines para actualizar.' : 'Actualiza Estrella Eats para ver las últimas mejoras.'}</p></div>
      </div>
      <div className="pwa-update-actions">
        <button type="button" onClick={reload} disabled={blocked}>Actualizar ahora</button>
        <button type="button" onClick={() => setMinimized(true)}>Más tarde</button>
      </div>
      <button type="button" className="pwa-update-close" aria-label="Recordar la actualización más tarde" onClick={() => setMinimized(true)}><X size={18} aria-hidden="true" /></button>
    </aside>
  );
}
