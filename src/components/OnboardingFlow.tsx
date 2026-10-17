import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence, useMotionValue, useSpring, useTransform } from 'framer-motion';
import type { Variants } from 'framer-motion';
import { ArrowLeft, ArrowRight, MapPin, ShoppingBag, Utensils, Route, Package, ChefHat } from 'lucide-react';
import { useNoticeSlot } from '../hooks/useNoticeSlot';
import { writePreference } from '../lib/noticePreferences';
import { useSiteMotion } from '../hooks/useSiteMotion';
import './OnboardingFlow.css';

interface OnboardingFlowProps { onComplete: () => void }
const ARRIVAL = [.16, 1, .3, 1] as const;
const WELCOME_STEPS = [0, 1, 2] as const;
const HOW_TO_ORDER = [
  { Icon: Utensils, title: 'Encuentra tu antojo', text: 'Explora restaurantes, consulta su menú y arma tu pedido.' },
  { Icon: ShoppingBag, title: 'Elige cómo recibirlo', text: 'A domicilio o para recoger. Revisa el total antes de confirmar.' },
  { Icon: Route, title: 'Revisa y confirma', text: 'Revisa tu selección y confirma con el código que recibes por WhatsApp.' },
];
const TRACK_ORDER = [
  { Icon: Package, title: 'Consulta tu selección', text: 'Vuelve a ver los detalles del pedido que confirmaste.' },
  { Icon: ChefHat, title: 'Revisa cómo va', text: 'Abre el seguimiento para consultar el estado de tu pedido.' },
  { Icon: MapPin, title: 'Recíbelo o pasa por él', text: 'Consulta la entrega o la recogida según lo que elegiste.' },
];

export function OnboardingFlow({ onComplete }: OnboardingFlowProps) {
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1);
  const [imageFailed, setImageFailed] = useState(false);
  const { enabled } = useSiteMotion();
  const reduced = !enabled;
  const pointerX = useMotionValue(0);
  const pointerY = useMotionValue(0);
  const smoothX = useSpring(pointerX, { stiffness: 115, damping: 24 });
  const smoothY = useSpring(pointerY, { stiffness: 115, damping: 24 });
  const photoX = useTransform(smoothX, [-1, 1], [-14, 14]);
  const photoY = useTransform(smoothY, [-1, 1], [-10, 10]);
  const captionX = useTransform(smoothX, [-1, 1], [8, -8]);
  const captionY = useTransform(smoothY, [-1, 1], [6, -6]);
  const dialog = useRef<HTMLDivElement>(null);
  const completeCallback = useRef(onComplete);
  const shown = useNoticeSlot('onboarding', true, 100);
  useEffect(() => { completeCallback.current = onComplete; }, [onComplete]);
  const complete = useCallback(() => {
    writePreference('estrella_onboarding_done', 'true');
    completeCallback.current();
  }, []);
  const goTo = useCallback((next: number) => {
    if (next < 0 || next >= WELCOME_STEPS.length || next === step) return;
    setDirection(next > step ? 1 : -1);
    setStep(next);
  }, [step]);
  const sceneMotion: Variants = {
    hidden: (travel: number) => ({ opacity: reduced ? .85 : 0, x: reduced ? 0 : travel * 48 }),
    visible: { opacity: 1, x: 0, transition: { duration: reduced ? .1 : .48, ease: ARRIVAL, staggerChildren: reduced ? 0 : .065 } },
    out: (travel: number) => ({ opacity: 0, x: reduced ? 0 : travel * -42, transition: { duration: reduced ? .08 : .18, ease: [.4, 0, 1, 1] } }),
  };
  const layerMotion: Variants = {
    hidden: { opacity: reduced ? .85 : 0, y: reduced ? 0 : 18 },
    visible: { opacity: 1, y: 0, transition: { duration: reduced ? .1 : .48, ease: ARRIVAL } },
  };
  const groupMotion: Variants = {
    hidden: {},
    visible: { transition: { staggerChildren: reduced ? 0 : .065 } },
  };
  const lineMotion: Variants = {
    hidden: (travel: number) => ({ y: reduced ? 0 : travel * 46, opacity: reduced ? .85 : 0 }),
    visible: { y: 0, opacity: 1, transition: { duration: reduced ? .1 : .52, ease: ARRIVAL } },
  };
  const movePointer = (event: React.PointerEvent<HTMLDivElement>) => {
    if (reduced || event.pointerType !== 'mouse') return;
    const bounds = event.currentTarget.getBoundingClientRect();
    pointerX.set(Math.max(-1, Math.min(1, (event.clientX - bounds.left) / bounds.width * 2 - 1)));
    pointerY.set(Math.max(-1, Math.min(1, (event.clientY - bounds.top) / bounds.height * 2 - 1)));
  };
  const restPointer = () => { pointerX.set(0); pointerY.set(0); };

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
          <div className="eats-welcome-header-actions">
            <button type="button" onClick={complete}>Omitir<ArrowRight size={16} aria-hidden="true" /></button>
          </div>
        </header>
        <div className="eats-welcome-body">
          <div className="eats-welcome-copy" data-direction={direction}>
            <AnimatePresence mode="wait" initial={false} custom={direction}>
              <motion.div key={step} className="eats-welcome-scene" custom={direction}
                variants={sceneMotion} initial="hidden" animate="visible" exit="out">
                {step === 0 ? <>
                  <motion.h1 variants={groupMotion}>{['Comida de', 'Comitán.', 'A tu puerta.'].map((line, index) => <span className="eats-welcome-line" key={line}><motion.span className={index === 2 ? 'eats-welcome-accent' : undefined} custom={direction} variants={lineMotion}>{line}</motion.span></span>)}</motion.h1>
                  <motion.p variants={layerMotion} className="eats-welcome-description">Tus restaurantes de siempre y nuevos antojos por descubrir. Pide a domicilio o pasa a recoger.</motion.p>
                  <motion.div variants={layerMotion} className="eats-welcome-location"><MapPin size={17} aria-hidden="true" /><span>Hecho para pedir en Comitán.</span></motion.div>
                </> : <>
                  <motion.h1 className="eats-welcome-how-title" variants={groupMotion}>{(step === 1 ? ['Tu antojo.', 'Así de fácil.'] : ['Tu pedido.', 'Siempre a la vista.']).map((line, index) => <span className="eats-welcome-line" key={line}><motion.span className={index === 1 ? 'eats-welcome-accent' : undefined} custom={direction} variants={lineMotion}>{line}</motion.span></span>)}</motion.h1>
                  <motion.ol variants={groupMotion} className="eats-welcome-steps">{(step === 1 ? HOW_TO_ORDER : TRACK_ORDER).map(({ Icon, title, text }) => <motion.li variants={layerMotion} key={title}>
                    <Icon size={23} strokeWidth={1.6} aria-hidden="true" /><div><h2>{title}</h2><p>{text}</p></div>
                  </motion.li>)}</motion.ol>
                </>}
              </motion.div>
            </AnimatePresence>
          </div>
          <div className="eats-welcome-media" data-step={step} onPointerMove={movePointer} onPointerLeave={restPointer}>
            {!imageFailed ? <motion.div className="eats-welcome-photo" initial={false} animate={{ x: reduced ? 0 : [8, -18, 6][step], y: reduced ? 0 : [5, -9, -16][step], scale: reduced ? 1 : [1, 1.08, 1.04][step] }} transition={{ duration: reduced ? .1 : .85, ease: ARRIVAL }}>
              <motion.img style={{ x: reduced ? 0 : photoX, y: reduced ? 0 : photoY }} src="/desktop/comitan-table.webp" alt="Tacos, hamburguesa y papas para compartir" width="900" height="1125" onError={() => setImageFailed(true)} />
            </motion.div>
              : <Utensils size={80} strokeWidth={1} aria-hidden="true" />}
            <motion.div className="eats-welcome-caption-depth" style={{ x: reduced ? 0 : captionX, y: reduced ? 0 : captionY }}>
              <motion.div className="eats-welcome-caption" initial={false} animate={{ x: reduced ? 0 : [0, 10, 3][step], y: reduced ? 0 : [0, -18, -6][step], rotate: reduced ? 0 : [0, -1.5, 1][step] }} transition={{ duration: reduced ? .1 : .62, ease: ARRIVAL }}><span>Hoy se antoja</span><strong>Comer rico.<br />Pedir fácil.</strong></motion.div>
            </motion.div>
          </div>
        </div>
        <footer className="eats-welcome-footer">
          <div className="eats-welcome-progress" aria-label="Pasos de bienvenida">
            {WELCOME_STEPS.map(index => <button key={index} type="button" onClick={() => goTo(index)} aria-label={`Ir al paso ${index + 1}`} aria-current={step === index ? 'step' : undefined}><motion.span initial={false} animate={{ scaleX: step === index ? 1 : .45 }} transition={{ duration: reduced ? .1 : .32, ease: ARRIVAL }} /></button>)}
            <span aria-live="polite">{step + 1} de {WELCOME_STEPS.length}</span>
          </div>
          <div className="eats-welcome-actions">
            {step > 0 && <button type="button" className="eats-welcome-back" onClick={() => goTo(step - 1)} aria-label="Volver al paso anterior"><ArrowLeft size={20} aria-hidden="true" /></button>}
            <motion.button type="button" className="eats-welcome-primary" whileTap={{ scale: reduced ? 1 : .975 }} onClick={step < WELCOME_STEPS.length - 1 ? () => goTo(step + 1) : complete}><AnimatePresence mode="wait" initial={false}><motion.span key={step} initial={{ opacity: 0, x: reduced ? 0 : direction * 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: reduced ? 0 : direction * -10 }} transition={{ duration: reduced ? .1 : .14 }}>{['Cómo pedir', 'Ver seguimiento', 'Ver restaurantes'][step]}</motion.span></AnimatePresence><ArrowRight size={20} aria-hidden="true" /></motion.button>
          </div>
        </footer>
      </div>
    </motion.div>, document.body,
  );
}
