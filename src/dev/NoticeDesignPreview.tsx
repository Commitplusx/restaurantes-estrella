import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useNoticeSlot } from '../hooks/useNoticeSlot';
import { PrivacyNoticeContent } from '../components/CookieBanner';
import { PushNoticeContent } from '../components/PushNotificationSetup';
import type { PushPhase } from '../lib/pushActivation';

const states = ['privacy', 'push', 'permission', 'worker', 'subscription', 'saving', 'error', 'success'] as const;
type State = typeof states[number];
function isState(value: string): value is State { return states.some(state => state === value); }
export default function NoticeDesignPreview() {
  const [state, setState] = useState<State>('privacy');
  const [visible, setVisible] = useState(true);
  const shown = useNoticeSlot('notice-design', visible, 100);
  const phase: PushPhase | null = state === 'permission' || state === 'worker' || state === 'subscription' || state === 'saving' ? state : null;
  return <main className="min-h-screen bg-[#f9f7f2] p-6 text-[#1d1d1f]">
    <div className="max-w-xl mx-auto py-12"><h1 className="text-3xl font-semibold mb-4">Avisos de Estrella Eats</h1>
      <p className="mb-6">Vista local de diseño. Los estados son ejemplos: no pide permisos ni guarda suscripciones.</p>
      <label className="flex flex-col gap-2">Aviso y estado<select aria-label="Aviso de ejemplo" className="p-3 bg-white rounded-xl" value={state} onChange={event => { if (isState(event.target.value)) { setState(event.target.value); setVisible(true); } }}>
        {states.map(value => <option key={value} value={value}>{value}</option>)}
      </select></label>
      <button className="min-h-11 underline mt-4" onClick={() => setVisible(true)}>Mostrar aviso</button>
      <div className="mt-6"><Link to="/tracker?vista=diseno&estado=en_camino" className="min-h-11 underline">Ver tracker</Link></div>
    </div>
    {shown && (state === 'privacy' ? <PrivacyNoticeContent accept={() => { setState('push'); }} dismiss={() => setVisible(false)} />
      : <PushNoticeContent phase={phase} error={state === 'error' ? 'Tenemos un problema de conexión. El permiso está listo, pero falta guardar la activación.' : ''}
        success={state === 'success'} activate={() => setState('permission')} dismiss={() => setVisible(false)} />)}
  </main>;
}
