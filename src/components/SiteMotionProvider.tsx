import { useEffect, useState, type ReactNode } from 'react';
import { MotionConfig, useReducedMotion } from 'framer-motion';
import { Pause, Play } from 'lucide-react';
import { SiteMotionContext } from '../lib/siteMotion';
import { readPreference, writePreference } from '../lib/noticePreferences';
import './siteMotion.css';

export function SiteMotionProvider({ children }: { children: ReactNode }) {
  const systemReduced = useReducedMotion();
  const [choice, setChoice] = useState<'full' | 'reduced' | 'system'>(() => {
    if (import.meta.env.DEV) return 'full';
    const saved = readPreference('eats_motion_preference');
    return saved === 'full' || saved === 'reduced' ? saved : 'system';
  });
  const enabled = choice === 'system' ? !systemReduced : choice === 'full';
  const toggle = () => {
    const next = enabled ? 'reduced' : 'full';
    setChoice(next);
    if (!import.meta.env.DEV) writePreference('eats_motion_preference', next);
  };
  useEffect(() => {
    const previous = document.body.dataset.eatsMotion;
    document.body.dataset.eatsMotion = enabled ? 'full' : 'reduced';
    return () => { if (previous) document.body.dataset.eatsMotion = previous; else delete document.body.dataset.eatsMotion; };
  }, [enabled]);
  return <SiteMotionContext.Provider value={{ enabled, toggle }}>
    <MotionConfig reducedMotion={enabled ? 'never' : 'always'}>{children}</MotionConfig>
    {import.meta.env.DEV && <button type="button" className="eats-motion-preview-control" onClick={toggle} aria-pressed={enabled} aria-label={enabled ? 'Reducir animaciones de la vista local' : 'Activar animaciones de la vista local'}>{enabled ? <Pause size={14} aria-hidden="true" /> : <Play size={14} aria-hidden="true" />}<span>Movimiento {enabled ? 'activado' : 'reducido'}</span></button>}
  </SiteMotionContext.Provider>;
}
