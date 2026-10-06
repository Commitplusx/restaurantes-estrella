import { useEffect, useRef, useState, type PointerEvent } from 'react';
import { ChevronLeft, ChevronRight, Pause, Play } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { LandingBanner } from '../lib/landingBanner';

export function MobileLandingCarousel({ banners }: { banners: LandingBanner[] }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [inView, setInView] = useState(true);
  const [reducedMotion, setReducedMotion] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const carousel = useRef<HTMLDivElement>(null);
  const gesture = useRef<{ x: number; y: number } | null>(null);
  const suppressClick = useRef(false);
  const rotationIntent = useRef<boolean | null>(null);
  const count = banners.length + 1;
  const activeIndex = index % count;

  useEffect(() => {
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReducedMotion(preference.matches);
    preference.addEventListener('change', update);
    return () => preference.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    const element = carousel.current;
    if (!element) return;
    const observer = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), { threshold: 0.25 });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (count < 2 || paused || reducedMotion || !inView) return;
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') setIndex(previous => (previous + 1) % count);
    }, 6000);
    return () => window.clearInterval(timer);
  }, [count, paused, reducedMotion, inView]);

  const select = (next: number) => {
    setPaused(true);
    setIndex((next + count) % count);
  };

  const finishGesture = (event: PointerEvent<HTMLDivElement>) => {
    const start = gesture.current;
    gesture.current = null;
    if (!start) return;
    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    if (Math.abs(dx) > 48 && Math.abs(dx) > Math.abs(dy) * 1.2) {
      suppressClick.current = true;
      select(activeIndex + (dx < 0 ? 1 : -1));
    }
  };

  return (
    <div ref={carousel} className="eats-mobile-carousel" role="region" aria-roledescription="carrusel" aria-label="Estrella Eats y promociones"
      onFocusCapture={() => setPaused(true)}
      onPointerEnter={event => { if (event.pointerType === 'mouse') setPaused(true); }}>
      <div className="eats-carousel-window"
        onPointerDown={event => {
          gesture.current = { x: event.clientX, y: event.clientY };
          suppressClick.current = false;
        }}
        onPointerMove={event => {
          const start = gesture.current;
          if (start && Math.abs(event.clientX - start.x) > 8 && Math.abs(event.clientX - start.x) > Math.abs(event.clientY - start.y)) {
            event.currentTarget.setPointerCapture(event.pointerId);
          }
        }}
        onPointerUp={finishGesture}
        onPointerCancel={() => { gesture.current = null; }}
        onClickCapture={event => {
          if (suppressClick.current) {
            event.preventDefault();
            event.stopPropagation();
            suppressClick.current = false;
          }
        }}>
        <div className="eats-carousel-track" style={{ transform: reducedMotion ? undefined : `translateX(-${activeIndex * 100}%)` }}>
          <div className="eats-carousel-slide" data-active={activeIndex === 0} role="group" aria-roledescription="diapositiva" aria-label={`1 de ${count}`} aria-hidden={activeIndex !== 0} inert={activeIndex !== 0}>
            <img className="eats-carousel-table" src="/desktop/comitan-table.webp" alt="Una mesa con tacos, hamburguesa y papas para compartir" width="900" height="1125" fetchPriority="high" draggable={false} />
            <div className="eats-photo-caption"><strong>¿Tacos o<br />hamburguesa?</strong></div>
          </div>
          {banners.map((banner, position) => {
            const link = banner.link_url && /^(?:\/(?!\/)|https?:\/\/)/.test(banner.link_url) ? banner.link_url : null;
            const content = banner.imagen_url === 'dynamic-gradient'
              ? <div className="eats-carousel-message"><strong>{banner.titulo.replace(/<[^>]*>/g, '')}</strong>{banner.subtitulo && <p>{banner.subtitulo}</p>}</div>
              : <img src={banner.imagen_url} alt={banner.titulo || 'Promoción de Estrella Eats'} draggable={false} loading="eager" />;
            return (
              <div key={banner.id} className="eats-carousel-slide" data-active={activeIndex === position + 1} role="group" aria-roledescription="diapositiva" aria-label={`${position + 2} de ${count}: ${banner.titulo}`} aria-hidden={activeIndex !== position + 1} inert={activeIndex !== position + 1}>
                {link
                  ? <Link to={link} tabIndex={activeIndex === position + 1 ? 0 : -1} draggable={false}>{content}</Link>
                  : content}
              </div>
            );
          })}
        </div>
      </div>
      {count > 1 && <div className="eats-carousel-controls">
        <div className="eats-carousel-pagination" role="group" aria-label="Elegir banner">
          {Array.from({ length: count }, (_, position) => <button key={position} type="button" aria-label={position === 0 ? 'Ver foto de Estrella Eats' : `Ver banner ${position}`} aria-pressed={activeIndex === position} onClick={() => select(position)}><span /></button>)}
        </div>
        <div className="eats-carousel-buttons">
          <button type="button" aria-label="Banner anterior" onClick={() => select(activeIndex - 1)}><ChevronLeft size={18} aria-hidden="true" /></button>
          {!reducedMotion && <button type="button" aria-label={paused ? 'Reanudar banners' : 'Pausar banners'}
            onPointerDown={() => { rotationIntent.current = !paused; }}
            onPointerCancel={() => { rotationIntent.current = null; }}
            onClick={event => {
              // Touch focus pauses the carousel before click; retain the action the user tapped.
              setPaused(event.detail > 0 && rotationIntent.current !== null ? rotationIntent.current : !paused);
              rotationIntent.current = null;
            }}>{paused ? <Play size={15} aria-hidden="true" /> : <Pause size={15} aria-hidden="true" />}</button>}
          <button type="button" aria-label="Banner siguiente" onClick={() => select(activeIndex + 1)}><ChevronRight size={18} aria-hidden="true" /></button>
        </div>
      </div>}
    </div>
  );
}
