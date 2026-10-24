import { CatalogImage } from './CatalogImage';
import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent, type ReactNode } from 'react';
import { ArrowUpRight, ChevronLeft, ChevronRight, Pause, Play, ImageOff } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { LandingBanner } from '../lib/landingBanner';
import { carouselMove, carouselPosition, startCarouselTransition, finishCarouselTransition, type CarouselSlide as Slide, type CarouselDirection as Direction, type CarouselSelection as Selection } from '../lib/landingCarousel';
import { useSiteMotion } from '../hooks/useSiteMotion';
import { ParallaxMedia } from './ParallaxMedia';
import { motion, useScroll, useTransform, type Variants } from 'framer-motion';
import './MobileLandingCarousel.css';

const ARRIVAL = [.16, 1, .3, 1] as const;
const cardMotion: Variants = {
  enter: (direction: Direction) => ({ x: `${direction * 100}%` }),
  center: { x: '0%', transition: { duration: .58, ease: ARRIVAL } },
  leave: (direction: Direction) => ({ x: `${direction * -100}%`, transition: { duration: .46, ease: [.4, 0, .6, 1] } }),
};
const artworkMotion: Variants = {
  enter: (direction: Direction) => ({ x: `${direction * -4}%`, scale: .9, opacity: .78 }),
  center: { x: '0%', scale: 1, opacity: 1, transition: { duration: .66, ease: ARRIVAL } },
  leave: (direction: Direction) => ({ x: `${direction * 3}%`, scale: .94, opacity: .65, transition: { duration: .46, ease: ARRIVAL } }),
};
const copyMotion: Variants = {
  enter: (direction: Direction) => ({ x: direction * 28, y: 6, opacity: .15 }),
  center: { x: 0, y: 0, opacity: 1, transition: { duration: .52, delay: .045, ease: ARRIVAL } },
  leave: (direction: Direction) => ({ x: direction * -22, y: -3, opacity: 0, transition: { duration: .24, ease: ARRIVAL } }),
};
const plainText = (value: string) => value.replace(/<[^>]*>/g, '').trim();

function MotionSlide({ slide, active, animated, direction, label, finish, children }: {
  slide: Slide; active: boolean; animated: boolean; direction: Direction; label: string; finish: () => void; children: ReactNode;
}) {
  return <motion.div className="eats-carousel-slide" data-active={active} custom={direction} variants={cardMotion}
    initial={animated ? 'enter' : false} animate={active ? 'center' : 'leave'}
    onAnimationComplete={definition => { if (active && definition === 'center') finish(); }}
    role="group" aria-roledescription="diapositiva" aria-label={label} aria-hidden={!active} inert={!active} data-banner-id={slide.key}>
    {children}
  </motion.div>;
}

function CampaignArtwork({ banner, active, direction }: { banner: LandingBanner; active: boolean; direction: Direction }) {
  const [failedSource, setFailedSource] = useState<string | null>(null);
  const [loadedSource, setLoadedSource] = useState<string | null>(null);
  const textOnly = banner.imagen_url === 'dynamic-gradient';
  const failed = failedSource === banner.imagen_url;
  return <div className="eats-banner-artwork" data-ready={textOnly || failed || loadedSource === banner.imagen_url}>
    <motion.div className="eats-banner-art-layer" custom={direction} variants={artworkMotion}>
    {textOnly || failed ? <div className="eats-carousel-message">
      {failed && <><ImageOff size={24} aria-hidden="true" /><span className="eats-banner-image-error">No pudimos cargar la imagen</span></>}
      <strong>{plainText(banner.titulo)}</strong>{banner.subtitulo && <p>{plainText(banner.subtitulo)}</p>}
    </div> : <CatalogImage variant="banner" src={banner.imagen_url} alt={plainText(banner.titulo) || 'Promoción de Estrella Eats'}
      draggable={false} loading="eager" fetchPriority={active ? 'high' : 'low'}
      onLoad={() => setLoadedSource(banner.imagen_url)} onError={() => setFailedSource(banner.imagen_url)} />}
    </motion.div>
  </div>;
}

export function MobileLandingCarousel({ banners }: { banners: LandingBanner[] }) {
  const [selection, setSelection] = useState<Selection>({ key: null, direction: 1, previous: null, revision: 0 });
  const [paused, setPaused] = useState(false);
  const [inView, setInView] = useState(true);
  const [visible, setVisible] = useState(() => document.visibilityState === 'visible');
  const { enabled } = useSiteMotion();
  const carousel = useRef<HTMLDivElement>(null);
  const restoreCardFocus = useRef(false);
  const { scrollYProgress } = useScroll({ target: carousel, offset: ['start end', 'end start'] });
  const photoY = useTransform(scrollYProgress, [0, 1], [-26, 26]);
  const photoScale = useTransform(scrollYProgress, [0, 1], [1.015, 1.055]);
  const captionY = useTransform(scrollYProgress, [0, 1], [8, -12]);
  const gesture = useRef<{ x: number; y: number } | null>(null);
  const suppressClick = useRef(false);
  const rotationIntent = useRef<boolean | null>(null);
  const slides = useMemo<Slide[]>(() => [...banners.map(banner => ({ key: `banner:${banner.id}`, banner })), { key: 'discovery' }], [banners]);
  const keys = useMemo(() => slides.map(slide => slide.key), [slides]);
  const count = slides.length;
  const activeIndex = carouselPosition(keys, selection.key);
  const activeKey = keys[activeIndex];
  const activeSlide = slides[activeIndex];
  const nextSlide = slides[(activeIndex + 1) % count];
  const rotating = count > 1 && enabled && !paused && inView && visible;
  const advance = useCallback((direction: Direction) => {
    const next = carouselMove(keys, activeIndex, direction);
    if (!next || next === activeKey) return;
    // A new gesture replaces the previous outgoing plane, rather than queuing
    // more copies/images. Existing keys retain their current animation values.
    const focused = document.activeElement;
    if (focused instanceof HTMLElement && carousel.current?.querySelector('[data-active="true"]')?.contains(focused)) restoreCardFocus.current = true;
    setSelection(previous => startCarouselTransition(previous, activeSlide, next, direction));
  }, [keys, activeIndex, activeKey, activeSlide]);
  const finish = (revision: number) => setSelection(current => finishCarouselTransition(current, revision));
  useEffect(() => {
    if (!restoreCardFocus.current) return;
    restoreCardFocus.current = false;
    carousel.current?.querySelector<HTMLAnchorElement>('.eats-carousel-slide[data-active="true"] a')?.focus({ preventScroll: true });
  }, [activeKey]);

  useEffect(() => {
    const element = carousel.current;
    if (!element) return;
    const observer = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), { threshold: 0.25 });
    observer.observe(element);
    const visibility = () => setVisible(document.visibilityState === 'visible');
    document.addEventListener('visibilitychange', visibility);
    return () => { observer.disconnect(); document.removeEventListener('visibilitychange', visibility); };
  }, []);

  useEffect(() => {
    if (!rotating) return;
    const timer = window.setTimeout(() => advance(1), 6500);
    return () => window.clearTimeout(timer);
  }, [rotating, advance]);

  const select = (direction: Direction) => {
    setPaused(true);
    advance(direction);
  };
  const finishGesture = (event: PointerEvent<HTMLDivElement>) => {
    const start = gesture.current;
    gesture.current = null;
    if (!start) return;
    const dx = event.clientX - start.x, dy = event.clientY - start.y;
    if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy) * 1.2) {
      suppressClick.current = true;
      select(dx < 0 ? 1 : -1);
    }
  };

  const slideContent = (slide: Slide, active: boolean, preview = false) => {
    const banner = slide.banner;
    const link = banner?.link_url && /^(?:\/(?!\/)|https?:\/\/)/.test(banner.link_url) ? banner.link_url : null;
    const content = banner ? <>
      <CampaignArtwork banner={banner} active={active} direction={selection.direction} />
      <motion.div className="eats-banner-caption" variants={copyMotion} custom={selection.direction}><div><strong>{plainText(banner.titulo) || 'Promoción de Estrella Eats'}</strong>
        {(banner.subtitulo || link) && <span>{banner.subtitulo ? plainText(banner.subtitulo) : 'Ver promoción'}</span>}</div>
        {link && <span className="eats-banner-action" aria-hidden="true"><ArrowUpRight size={20} /></span>}
      </motion.div>
    </> : <><div className="eats-banner-discovery">
      <motion.div className="eats-banner-art-layer" variants={artworkMotion} custom={selection.direction}>
        <motion.div className="eats-carousel-photo-plane" style={{ y: enabled && !preview ? photoY : 0, scale: enabled && !preview ? photoScale : 1 }}><ParallaxMedia depth={7} cinematic>
          <img className="eats-carousel-table" src="/desktop/comitan-table-900.webp" srcSet="/desktop/comitan-table-480.webp 480w, /desktop/comitan-table-900.webp 900w" sizes="(max-width: 639px) 100vw, 50vw"
            alt="Una mesa con tacos, hamburguesa y papas para compartir" width="900" height="1125" loading="eager" fetchPriority={active ? 'high' : 'low'} draggable={false} />
        </ParallaxMedia></motion.div>
      </motion.div>
      <motion.div className="eats-carousel-discovery-foreground" variants={copyMotion} custom={selection.direction}>
        <motion.div className="eats-carousel-discovery-copy" style={{ y: enabled && !preview ? captionY : 0 }}><strong>¿Tacos o<br />hamburguesa?</strong></motion.div>
      </motion.div>
    </div><motion.div className="eats-banner-caption" variants={copyMotion} custom={selection.direction}><div><strong>¿Hoy qué comemos?</strong><span>Pide a casa o pasa a recoger.</span></div></motion.div></>;
    return link ? <Link className="eats-banner-card" to={link} draggable={false} tabIndex={active ? 0 : -1}>{content}</Link> : <div className="eats-banner-card">{content}</div>;
  };
  const transitionSlides = selection.previous && selection.previous.key !== activeKey ? [selection.previous, activeSlide] : [activeSlide];

  return <div ref={carousel} className="eats-mobile-carousel" data-motion={enabled ? 'full' : 'reduced'} data-multiple={count > 1}
    role="region" aria-roledescription="carrusel" aria-label="Promociones de Estrella Eats"
    onFocusCapture={() => setPaused(true)} onPointerEnter={event => { if (event.pointerType === 'mouse') setPaused(true); }}
    onKeyDown={event => {
      if (count > 1 && (event.key === 'ArrowLeft' || event.key === 'ArrowRight')) {
        event.preventDefault(); select(event.key === 'ArrowRight' ? 1 : -1);
      }
    }}>
    <div className="eats-carousel-window" onPointerDown={event => {
      if (!event.isPrimary || event.button !== 0) return;
      gesture.current = { x: event.clientX, y: event.clientY }; suppressClick.current = false;
    }} onPointerMove={event => {
      const start = gesture.current;
      if (start && Math.abs(event.clientX - start.x) > 8 && Math.abs(event.clientX - start.x) > Math.abs(event.clientY - start.y)) event.currentTarget.setPointerCapture(event.pointerId);
    }} onPointerUp={finishGesture} onPointerCancel={() => { gesture.current = null; }} onClickCapture={event => {
      if (suppressClick.current) { event.preventDefault(); event.stopPropagation(); suppressClick.current = false; }
    }}>
      <div className="eats-carousel-stage">
        {count > 1 && <motion.div key={`peek:${nextSlide.key}`} className="eats-carousel-peek" initial={false} animate={{ opacity: selection.previous ? 0 : 1 }}
          transition={{ duration: .15 }} aria-hidden="true" inert>{slideContent(nextSlide, false, true)}</motion.div>}
        {transitionSlides.map(slide => <MotionSlide key={slide.key} slide={slide} active={slide.key === activeKey} animated={enabled && selection.previous !== null}
          direction={selection.direction} label={`${activeIndex + 1} de ${count}: ${slide.banner ? plainText(slide.banner.titulo) : 'Estrella Eats'}`}
          finish={() => finish(selection.revision)}>{slideContent(slide, slide.key === activeKey)}</MotionSlide>)}
      </div>
    </div>
    {count > 1 && <div className="eats-carousel-controls">
      <span className="eats-carousel-position" aria-live={paused ? 'polite' : 'off'} aria-atomic="true"><span className="sr-only">Banner </span><strong>{String(activeIndex + 1).padStart(2, '0')}</strong><span aria-hidden="true"> / </span><span className="sr-only"> de </span>{String(count).padStart(2, '0')}</span>
      <div className="eats-carousel-progress" aria-hidden="true">{slides.map((slide, position) => <span key={slide.key} data-active={position === activeIndex}><i key={`${slide.key}:${activeKey}:${rotating}`} data-rotating={rotating} /></span>)}</div>
      <div className="eats-carousel-buttons">
        <button type="button" aria-label="Banner anterior" onClick={() => select(-1)}><ChevronLeft size={18} aria-hidden="true" /></button>
        <button type="button" aria-label={paused ? 'Reanudar banners' : 'Pausar banners'} onPointerDown={() => { rotationIntent.current = !paused; }} onPointerCancel={() => { rotationIntent.current = null; }}
          onClick={event => { setPaused(event.detail > 0 && rotationIntent.current !== null ? rotationIntent.current : !paused); rotationIntent.current = null; }}>
          {paused ? <Play size={14} aria-hidden="true" /> : <Pause size={14} aria-hidden="true" />}
        </button>
        <button type="button" aria-label="Banner siguiente" onClick={() => select(1)}><ChevronRight size={18} aria-hidden="true" /></button>
      </div>
    </div>}
    {count === 1 && <div className="eats-carousel-controls" aria-hidden="true" />}
  </div>;
}
