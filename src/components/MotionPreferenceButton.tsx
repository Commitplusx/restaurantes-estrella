import { Pause, Play } from 'lucide-react';
import { useSiteMotion } from '../hooks/useSiteMotion';
export function MotionPreferenceButton() {
  const { enabled, toggle } = useSiteMotion();
  return <button type="button" className="eats-motion-setting" onClick={toggle} aria-pressed={enabled}>{enabled ? <Pause size={14} aria-hidden="true" /> : <Play size={14} aria-hidden="true" />}{enabled ? 'Reducir animaciones' : 'Activar animaciones'}</button>;
}
