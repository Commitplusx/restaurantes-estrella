import { useCallback, useContext, useLayoutEffect, useMemo, useRef, type ReactNode, type PointerEvent } from 'react';
import { motion, useMotionValue, useSpring, useTransform, useScroll, useVelocity, type MotionValue } from 'framer-motion';
import { useSiteMotion } from '../hooks/useSiteMotion';
import { ScrollDepthContext } from '../lib/scrollDepth';
import { cinematicTravel, mediaTravelBudget, mediaViewportProgress } from '../lib/scrollGeometry';
import type { MediaLayout, ScrollSectionLayout } from '../lib/scrollGeometry';

const SETTLE = { stiffness: 180, damping: 30, mass: .65 };
interface RegisteredMedia { bounds: MotionValue<MediaLayout>; visible: MotionValue<boolean> }

// Layout offsets exclude visual transforms, so scroll feedback cannot change its own measurement.
function layoutTop(element: HTMLElement): number {
  let top = 0;
  let current: HTMLElement | null = element;
  while (current) { top += current.offsetTop; current = current.offsetParent instanceof HTMLElement ? current.offsetParent : null; }
  return top;
}

/** Only the visual layer moves; its parent link/button remains a stable target. */
export function ParallaxMedia({ children, className = '', depth = 6, foreground, cinematic = false }: {
  children: ReactNode; className?: string; depth?: number; foreground?: ReactNode; cinematic?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const { enabled } = useSiteMotion();
  const pointerX = useMotionValue(0), pointerY = useMotionValue(0);
  const x = useSpring(pointerX, SETTLE);
  const y = useSpring(pointerY, SETTLE);
  const group = useContext(ScrollDepthContext);
  const neutral = useMotionValue(.5);
  const progress = group?.progress ?? neutral;
  const bounds = useMotionValue<MediaLayout>({ top: 0, width: 0, height: 0 });
  const visible = useMotionValue(false);
  const local = group?.local;
  const budget = useTransform(bounds, value => mediaTravelBudget(value, group?.distance ?? 0, depth));
  // Framer discovers dependencies during render. Read every source before gating
  // visibility, otherwise initially offscreen media never subscribes to scrolling.
  const scrollTarget = useTransform(() => {
    const current = progress.get(), section = local?.layout.get(), frame = bounds.get(), allowance = budget.get();
    const active = local?.active.get(), inView = visible.get();
    if (local && section) return active && inView ? cinematicTravel(mediaViewportProgress(current, section, frame), allowance.travel) : 0;
    return (Math.max(0, Math.min(1, current)) - .5) * 2 * (group?.distance ?? 0);
  });
  const scrollY = useSpring(scrollTarget, SETTLE);
  const mediaY = useTransform(() => {
    const scroll = scrollY.get(), immediate = scrollTarget.get(), pointer = y.get(), allowance = budget.get();
    const active = local?.active.get(), inView = visible.get();
    return local ? active && inView ? scroll + Math.max(-allowance.pointer, Math.min(allowance.pointer, pointer)) : 0 : pointer + immediate;
  });
  const mediaX = useTransform(() => {
    const pointer = x.get(), allowance = budget.get(), active = local?.active.get(), inView = visible.get();
    return local ? active && inView ? Math.max(-allowance.pointer, Math.min(allowance.pointer, pointer)) : 0 : pointer;
  });
  const foregroundX = useTransform(mediaX, value => value * -.5);
  const foregroundY = useTransform(mediaY, value => value * -.5);
  const rotateX = useTransform(mediaY, value => local ? 0 : value * -.12);
  const rotateY = useTransform(mediaX, value => value * (local ? .35 : .12));
  const leanTarget = useTransform(() => {
    const speed = local?.velocity.get() ?? 0, active = local?.active.get(), inView = visible.get();
    return local && active && inView && Number.isFinite(speed) ? Math.max(-.3, Math.min(.3, speed / -2400)) : 0;
  });
  const lean = useSpring(leanTarget, SETTLE);
  const paddingX = useTransform(budget, value => local ? value.insetX : 0);
  const paddingY = useTransform(budget, value => local ? value.insetY : 0);
  const willChange = useTransform(() => {
    const active = local?.active.get(), inView = visible.get();
    return local && active && inView ? 'transform' : 'auto';
  });
  useLayoutEffect(() => {
    if (!local || !ref.current) return;
    return local.register(ref.current, bounds, visible);
  }, [local, bounds, visible]);
  const move = (event: PointerEvent<HTMLDivElement>) => {
    if (!enabled || event.pointerType !== 'mouse') return;
    const bounds = event.currentTarget.getBoundingClientRect();
    if (!bounds.width || !bounds.height) return;
    pointerX.set(Math.max(-depth, Math.min(depth, ((event.clientX - bounds.left) / bounds.width * 2 - 1) * depth)));
    pointerY.set(Math.max(-depth, Math.min(depth, ((event.clientY - bounds.top) / bounds.height * 2 - 1) * depth)));
  };
  const reset = () => { pointerX.set(0); pointerY.set(0); };
  return <div ref={ref} className={`eats-parallax-media ${className}`} data-cinematic={cinematic || undefined} data-local-depth={Boolean(local) || undefined} onPointerMove={move} onPointerLeave={reset} onPointerCancel={reset}>
    <motion.div className="eats-parallax-media-layer" style={{ x: enabled ? mediaX : 0, y: enabled ? mediaY : 0, rotate: enabled ? lean : 0, rotateX: enabled && cinematic ? rotateX : 0, rotateY: enabled && cinematic ? rotateY : 0, paddingInline: paddingX, paddingBlock: paddingY, willChange }}>{children}</motion.div>
    {foreground && <motion.div className="eats-parallax-foreground" style={{ x: enabled ? foregroundX : 0, y: enabled ? foregroundY : 0 }}>{foreground}</motion.div>}
  </div>;
}

/** A catalogue section shares its scroll progress across all visual layers. */
export function ScrollDepthGroup({ children, className = '', distance = 10, local = false }: { children: ReactNode; className?: string; distance?: number; local?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress, scrollY } = useScroll({ target: ref, offset: ['start end', 'end start'] });
  const velocity = useVelocity(scrollY);
  const layout = useMotionValue<ScrollSectionLayout>({ height: 0, viewport: 0 });
  const active = useMotionValue(true);
  const registry = useRef(new Map<HTMLDivElement, RegisteredMedia>());
  const observers = useRef<{ resize: ResizeObserver; intersection: IntersectionObserver } | null>(null);
  const measure = useCallback((element: HTMLDivElement, registration: RegisteredMedia) => {
    if (!ref.current) return;
    registration.bounds.set({ top: layoutTop(element) - layoutTop(ref.current), width: element.offsetWidth, height: element.offsetHeight });
  }, []);
  const register = useCallback((element: HTMLDivElement, bounds: MotionValue<MediaLayout>, visible: MotionValue<boolean>) => {
    const registration = { bounds, visible };
    registry.current.set(element, registration);
    measure(element, registration);
    observers.current?.resize.observe(element);
    observers.current?.intersection.observe(element);
    return () => { registry.current.delete(element); observers.current?.resize.unobserve(element); observers.current?.intersection.unobserve(element); visible.set(false); };
  }, [measure]);
  useLayoutEffect(() => {
    const element = ref.current;
    if (!local || !element) return;
    const publish = () => {
      layout.set({ height: element.clientHeight, viewport: document.documentElement.clientHeight || window.innerHeight });
      registry.current.forEach((registration, media) => measure(media, registration));
    };
    const intersection = new IntersectionObserver(entries => {
      for (const entry of entries) {
        if (entry.target instanceof HTMLDivElement) registry.current.get(entry.target)?.visible.set(entry.isIntersecting);
      }
    }, { rootMargin: '120px 0px', threshold: 0 });
    const resize = new ResizeObserver(publish);
    observers.current = { resize, intersection };
    resize.observe(element);
    resize.observe(document.documentElement);
    registry.current.forEach((_registration, media) => { resize.observe(media); intersection.observe(media); });
    const visibility = () => { active.set(!document.hidden); if (!document.hidden) publish(); };
    visibility(); publish();
    window.addEventListener('resize', publish, { passive: true });
    document.addEventListener('visibilitychange', visibility);
    return () => { resize.disconnect(); intersection.disconnect(); observers.current = null; window.removeEventListener('resize', publish); document.removeEventListener('visibilitychange', visibility); };
  }, [local, layout, active, measure]);
  const context = useMemo(() => ({ progress: scrollYProgress, distance, ...(local ? { local: { layout, active, velocity, register } } : {}) }), [scrollYProgress, distance, local, layout, active, velocity, register]);
  return <ScrollDepthContext.Provider value={context}><div ref={ref} className={`eats-scroll-depth-group ${className}`}>{children}</div></ScrollDepthContext.Provider>;
}

/** The whole visual card has a slower plane; it settles with scrolling, with no animation loop. */
export function ScrollLayer({ children, className = '', distance = 36, tilt = 1 }: { children: ReactNode; className?: string; distance?: number; tilt?: number }) {
  const group = useContext(ScrollDepthContext);
  const neutral = useMotionValue(.5);
  const progress = group?.progress ?? neutral;
  const { enabled } = useSiteMotion();
  const y = useTransform(progress, [.12, .88], [distance, -distance]);
  const rotate = useTransform(progress, [.12, .88], [-tilt, tilt]);
  return <motion.div className={`eats-scroll-card-layer ${className}`} style={{ y: enabled ? y : 0, rotate: enabled ? rotate : 0 }}>{children}</motion.div>;
}

/** One scroll subscription for the hero, rather than one for every catalogue card. */
export function ScrollDepth({ children, className = '' }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const { enabled } = useSiteMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] });
  const y = useTransform(scrollYProgress, [0, 1], [-16, 16]);
  return <div ref={ref} className={className}><motion.div className="eats-scroll-depth-layer" style={{ y: enabled ? y : 0 }}>{children}</motion.div></div>;
}
