import { CatalogImage } from './CatalogImage';
import { useEffect, useMemo, useRef, useState, type PointerEvent } from 'react';
import { ArrowUpRight, ChevronLeft, ChevronRight, Pause, Play, ImageOff } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { LandingBanner } from '../lib/landingBanner';
import { carouselMove, carouselPosition, prepareCarouselImage } from '../lib/landingCarousel';
import { useSiteMotion } from '../hooks/useSiteMotion';
import { ParallaxMedia } from './ParallaxMedia';
import { motion, useScroll, useTransform } from 'framer-motion';
import './MobileLandingCarousel.css';

type Slide = { key: string; banner: LandingBanner } | { key: 'discovery'; banner?: never };
const plainText = (value: string) => value.replace(/<[^>]*>/g, '').trim();

function CampaignArtwork({ banner, prepared, active }: { banner: LandingBanner; prepared: boolean; active: boolean }) {
  const [failedSource, setFailedSource] = useState<string | null>(null);
  const [loadedSource, setLoadedSource] = useState<string | null>(null);
  const textOnly = banner.imagen_url === 'dynamic-gradient';
  const failed = failedSource === banner.imagen_url;
  return <div className="eats-banner-artwork" data-ready={textOnly || failed || loadedSource === banner.imagen_url}>
    {textOnly || failed ? <div className="eats-carousel-message">
      {failed && <><ImageOff size={24} aria-hidden="true" /><span className="eats-banner-image-error">No pudimos cargar la imagen</span></>}
      <strong>{plainText(banner.titulo)}</strong>{banner.subtitulo && <p>{plainText(banner.subtitulo)}</p>}
    </div> : prepared ? <CatalogImage variant="banner" src={banner.imagen_url} alt={plainText(banner.titulo) || 'Promoción de Estrella Eats'}
      draggable={false} loading="eager" fetchPriority={active ? 'high' : 'low'}
      onLoad={() => setLoadedSource(banner.imagen_url)} onError={() => setFailedSource(banner.imagen_url)} /> : null}
  </div>;
}

export function MobileLandingCarousel({ banners }: { banners: LandingBanner[] }) {
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [paused, setPaused] = useState(false);
  const [inView, setInView] = useState(true);
  const [visible, setVisible] = useState(() => document.visibilityState === 'visible');
  const { enabled } = useSiteMotion();
  const carousel = useRef<HTMLDivElement>(null);
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
  const activeIndex = carouselPosition(keys, selectedKey);
  const activeKey = keys[activeIndex];
  const rotating = count > 1 && enabled && !paused && inView && visible;

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
    const timer = window.setTimeout(() => setSelectedKey(keys[(activeIndex + 1) % count]), 6500);
    return () => window.clearTimeout(timer);
  }, [rotating, activeKey, activeIndex, count, keys]);

  const select = (direction: number) => {
    setPaused(true);
    setSelectedKey(carouselMove(keys, activeIndex, direction));
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
      <div className="eats-carousel-track" style={{ transform: `translateX(calc(-${activeIndex} * (100% - ${count > 1 ? 16 : 0}px)))` }}>
        {slides.map((slide, position) => {
          const active = position === activeIndex;
          const prepared = prepareCarouselImage(position, activeIndex, count);
          const banner = slide.banner;
          const link = banner?.link_url && /^(?:\/(?!\/)|https?:\/\/)/.test(banner.link_url) ? banner.link_url : null;
          const content = banner ? <>
            <CampaignArtwork banner={banner} prepared={prepared} active={active} />
            <div className="eats-banner-caption"><div><strong>{plainText(banner.titulo) || 'Promoción de Estrella Eats'}</strong>
              {(banner.subtitulo || link) && <span>{banner.subtitulo ? plainText(banner.subtitulo) : 'Ver promoción'}</span>}</div>
              {link && <span className="eats-banner-action" aria-hidden="true"><ArrowUpRight size={20} /></span>}
            </div>
          </> : <><div className="eats-banner-discovery">
            {prepared && <motion.div className="eats-carousel-photo-plane" style={{ y: enabled ? photoY : 0, scale: enabled ? photoScale : 1 }}><ParallaxMedia depth={7} cinematic>
              <img className="eats-carousel-table" src="/desktop/comitan-table-900.webp" srcSet="/desktop/comitan-table-480.webp 480w, /desktop/comitan-table-900.webp 900w" sizes="(max-width: 639px) 100vw, 50vw"
                alt="Una mesa con tacos, hamburguesa y papas para compartir" width="900" height="1125" loading="eager" fetchPriority={active ? 'high' : 'low'} draggable={false} />
            </ParallaxMedia></motion.div>}
            <motion.div className="eats-carousel-discovery-copy" style={{ y: enabled ? captionY : 0 }}><strong>¿Tacos o<br />hamburguesa?</strong></motion.div>
          </div><div className="eats-banner-caption"><div><strong>Restaurantes de Comitán</strong><span>A domicilio o para recoger.</span></div></div></>;
          return <div key={slide.key} className="eats-carousel-slide" data-active={active} role="group" aria-roledescription="diapositiva"
            aria-label={`${position + 1} de ${count}: ${banner ? plainText(banner.titulo) : 'Estrella Eats'}`} aria-hidden={!active} inert={!active}>
            {link ? <Link className="eats-banner-card" to={link} draggable={false} tabIndex={active ? 0 : -1}>{content}</Link> : <div className="eats-banner-card">{content}</div>}
          </div>;
        })}
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
