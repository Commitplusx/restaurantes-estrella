import { useState } from 'react';
import { Link } from 'react-router-dom';
import { X, Cookie } from 'lucide-react';
import { NoticeSurface } from './NoticeCenter';
import { useNoticeSlot } from '../hooks/useNoticeSlot';
import { readPreference, writePreference } from '../lib/noticePreferences';

export function CookieBanner() {
  const [visible, setVisible] = useState(() => readPreference('cookies_accepted') !== 'true');
  const shown = useNoticeSlot('privacy', visible, 20);
  if (!shown) return null;
  return <PrivacyNoticeContent accept={() => { writePreference('cookies_accepted', 'true'); setVisible(false); }} dismiss={() => setVisible(false)} />;
}
export function PrivacyNoticeContent({ accept, dismiss }: { accept: () => void; dismiss: () => void }) {
  return <NoticeSurface label="Tu privacidad">
    <div className="eats-notice-heading"><Cookie size={22} aria-hidden="true" /><h2>Guardamos tu carrito</h2></div>
    <p>Usamos cookies para recordar tu carrito y tus preferencias. Puedes consultar nuestro <Link to="/privacidad">aviso de privacidad</Link>.</p>
    <div className="eats-notice-actions"><button className="eats-notice-primary" onClick={accept}>Entendido</button></div>
    <button className="eats-notice-close" aria-label="Cerrar aviso de privacidad" onClick={dismiss}><X size={18} aria-hidden="true" /></button>
  </NoticeSurface>;
}
