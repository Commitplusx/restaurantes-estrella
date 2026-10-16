import { useContext, useRef, type ReactNode, type PointerEvent } from 'react';
import { motion, useMotionValue, useSpring, useTransform, useScroll } from 'framer-motion';
import { useSiteMotion } from '../hooks/useSiteMotion';
import { ScrollDepthContext } from '../lib/scrollDepth';

/** Only the visual layer moves; its parent link/button remains a stable target. */
export function ParallaxMedia({ children, className = '', depth = 6, foreground, cinematic = false }: {
  children: ReactNode; className?: string; depth?: number; foreground?: ReactNode; cinematic?: boolean;
}) {
  const { enabled } = useSiteMotion();
  const pointerX = useMotionValue(0), pointerY = useMotionValue(0);
  const x = useSpring(pointerX, { stiffness: 130, damping: 25 });
  const y = useSpring(pointerY, { stiffness: 130, damping: 25 });
  const group = useContext(ScrollDepthContext);
  const neutral = useMotionValue(.5);
  const progress = group?.progress ?? neutral;
  const mediaY = useTransform(() => y.get() + (Math.max(0, Math.min(1, progress.get())) - .5) * 2 * (group?.distance ?? 0));
  const foregroundX = useTransform(x, value => value * -.5);
  const foregroundY = useTransform(mediaY, value => value * -.5);
  const rotateX = useTransform(y, value => value * -.12);
  const rotateY = useTransform(x, value => value * .12);
  const move = (event: PointerEvent<HTMLDivElement>) => {
    if (!enabled || event.pointerType !== 'mouse') return;
    const bounds = event.currentTarget.getBoundingClientRect();
    pointerX.set(Math.max(-depth, Math.min(depth, ((event.clientX - bounds.left) / bounds.width * 2 - 1) * depth)));
    pointerY.set(Math.max(-depth, Math.min(depth, ((event.clientY - bounds.top) / bounds.height * 2 - 1) * depth)));
  };
  const reset = () => { pointerX.set(0); pointerY.set(0); };
  return <div className={`eats-parallax-media ${className}`} data-cinematic={cinematic || undefined} onPointerMove={move} onPointerLeave={reset}>
    <motion.div className="eats-parallax-media-layer" style={{ x: enabled ? x : 0, y: enabled ? mediaY : 0, rotateX: enabled && cinematic ? rotateX : 0, rotateY: enabled && cinematic ? rotateY : 0 }}>{children}</motion.div>
    {foreground && <motion.div className="eats-parallax-foreground" style={{ x: enabled ? foregroundX : 0, y: enabled ? foregroundY : 0 }}>{foreground}</motion.div>}
  </div>;
}

/** A catalogue section shares its scroll progress across all visual layers. */
export function ScrollDepthGroup({ children, className = '', distance = 10 }: { children: ReactNode; className?: string; distance?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] });
  return <ScrollDepthContext.Provider value={{ progress: scrollYProgress, distance }}><div ref={ref} className={`eats-scroll-depth-group ${className}`}>{children}</div></ScrollDepthContext.Provider>;
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
