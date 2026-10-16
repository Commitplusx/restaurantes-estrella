import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { ArrowLeft, ArrowRight, MapPin, ShoppingBag, Utensils, Route } from 'lucide-react';
import { useNoticeSlot } from '../hooks/useNoticeSlot';
import { writePreference } from '../lib/noticePreferences';
import './OnboardingFlow.css';

interface OnboardingFlowProps { onComplete: () => void }
const HOW_TO_ORDER = [
  { Icon: Utensils, title: 'Encuentra tu antojo', text: 'Explora restaurantes, consulta su menú y arma tu pedido.' },
  { Icon: ShoppingBag, title: 'Elige cómo recibirlo', text: 'A domicilio o para recoger. Revisa el total antes de confirmar.' },
  { Icon: Route, title: 'Sigue tu pedido', text: 'Confirma con el código que recibes por WhatsApp y consulta el seguimiento.' },
];

export function OnboardingFlow({ onComplete }: OnboardingFlowProps) {
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1);
  const [imageFailed, setImageFailed] = useState(false);
  const reduced = useReducedMotion();
  const dialog = useRef<HTMLDivElement>(null);
  const completeCallback = useRef(onComplete);
  const shown = useNoticeSlot('onboarding', true, 100);
  useEffect(() => { completeCallback.current = onComplete; }, [onComplete]);
  const complete = useCallback(() => {
    writePreference('estrella_onboarding_done', 'true');
    completeCallback.current();
  }, []);
  const goTo = useCallback((next: number) => {
    if (next < 0 || next > 1 || next === step) return;
    setDirection(next > step ? 1 : -1);
    setStep(next);
  }, [step]);

  useEffect(() => {
    if (!shown) return;
    const body = document.body;
    const root = document.getElementById('root');
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previous = { overflow: body.style.overflow, padding: body.style.paddingRight, rootInert: root?.inert ?? false };
    const scrollbar = window.innerWidth - document.documentElement.clientWidth;
    body.style.overflow = 'hidden';
    if (scrollbar > 0) body.style.paddingRight = `${scrollbar}px`;
    if (root) root.inert = true;
    dialog.current?.focus({ preventScroll: true });
    return () => {
      body.style.overflow = previous.overflow;
      body.style.paddingRight = previous.padding;
      if (root) root.inert = previous.rootInert;
      if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true });
    };
  }, [shown]);

  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') { event.preventDefault(); complete(); return; }
    if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
      event.preventDefault(); goTo(step + (event.key === 'ArrowRight' ? 1 : -1)); return;
    }
    if (event.key !== 'Tab') return;
    const focusable = [...(dialog.current?.querySelectorAll<HTMLElement>('button:not(:disabled), a[href], [tabindex="0"]') ?? [])];
    const first = focusable[0], last = focusable[focusable.length - 1];
    if (!first || !last) return;
    const active = document.activeElement;
    if (!focusable.some(element => element === active) || (event.shiftKey && active === first) || (!event.shiftKey && active === last)) {
      event.preventDefault(); (event.shiftKey ? last : first).focus();
    }
  };
  if (!shown) return null;
  return createPortal(
    <motion.div className="eats-welcome-backdrop" initial={{ opacity: .95 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: reduced ? 0 : .2 }}>
      <div ref={dialog} role="dialog" aria-modal="true" aria-label="Bienvenido a Estrella Eats" tabIndex={-1} className="eats-welcome" onKeyDown={onKeyDown}>
        <header className="eats-welcome-header">
          <div className="eats-welcome-brand"><img src="/estrella-circle.png" alt="" width="38" height="38" /><span>estrella<span>eats.</span></span></div>
          <button type="button" onClick={complete}>Omitir<ArrowRight size={16} aria-hidden="true" /></button>
        </header>
        <div className="eats-welcome-body">
          <div className="eats-welcome-copy">
            <AnimatePresence mode="wait" initial={false} custom={direction}>
              <motion.div key={step} className="eats-welcome-scene" custom={direction}
                initial={{ opacity: .4, x: reduced ? 0 : direction * 22 }} animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: reduced ? 0 : direction * -14 }} transition={{ duration: reduced ? 0 : .24, ease: [.16, 1, .3, 1] }}>
                {step === 0 ? <>
                  <h1>Comida de<br />Comitán.<br /><span>A tu puerta.</span></h1>
                  <p className="eats-welcome-description">Tus restaurantes de siempre y nuevos antojos por descubrir. Pide a domicilio o pasa a recoger.</p>
                  <div className="eats-welcome-location"><MapPin size={17} aria-hidden="true" /><span>Hecho para pedir en Comitán.</span></div>
                </> : <>
                  <h1 className="eats-welcome-how-title">Tu antojo.<br /><span>Así de fácil.</span></h1>
                  <ol className="eats-welcome-steps">{HOW_TO_ORDER.map(({ Icon, title, text }) => <li key={title}>
                    <Icon size={23} strokeWidth={1.6} aria-hidden="true" /><div><h2>{title}</h2><p>{text}</p></div>
                  </li>)}</ol>
                </>}
              </motion.div>
            </AnimatePresence>
          </div>
          <div className="eats-welcome-media" data-step={step}>
            {!imageFailed ? <img src="/desktop/comitan-table.webp" alt="Tacos, hamburguesa y papas para compartir" width="900" height="1125" onError={() => setImageFailed(true)} />
              : <Utensils size={80} strokeWidth={1} aria-hidden="true" />}
            <div className="eats-welcome-caption"><span>Hoy se antoja</span><strong>Comer rico.<br />Pedir fácil.</strong></div>
          </div>
        </div>
        <footer className="eats-welcome-footer">
          <div className="eats-welcome-progress" aria-label="Pasos de bienvenida">
            {[0, 1].map(index => <button key={index} type="button" onClick={() => goTo(index)} aria-label={`Ir al paso ${index + 1}`} aria-current={step === index ? 'step' : undefined}><span /></button>)}
            <span aria-live="polite">{step + 1} de 2</span>
          </div>
          <div className="eats-welcome-actions">
            {step === 1 && <button type="button" className="eats-welcome-back" onClick={() => goTo(0)} aria-label="Volver al primer paso"><ArrowLeft size={20} aria-hidden="true" /></button>}
            <button type="button" className="eats-welcome-primary" onClick={step === 0 ? () => goTo(1) : complete}>{step === 0 ? 'Cómo pedir' : 'Ver restaurantes'}<ArrowRight size={20} aria-hidden="true" /></button>
          </div>
        </footer>
      </div>
    </motion.div>, document.body,
  );
}
