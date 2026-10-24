import { ArrowDown, ArrowUpRight, MapPin, Search, ShoppingBag, Sparkles, Utensils, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { useIsDesktop } from '../hooks/useIsDesktop';
import { MobileLandingCarousel } from './MobileLandingCarousel';
import type { LandingBanner } from '../lib/landingBanner';
import './desktopLanding.css';
import { ParallaxMedia } from './ParallaxMedia';
import { useSiteMotion } from '../hooks/useSiteMotion';

interface DesktopLandingHeaderProps {
  search: string;
  onSearch: (value: string) => void;
  deliveryType: string;
  onDeliveryType: (value: 'domicilio' | 'recoger') => void;
  address: string;
  onLocation: () => void;
  onExplore: () => void;
  activeOrderId: string | null;
}

export function DesktopLandingHeader({ search, onSearch, deliveryType, onDeliveryType, address, onLocation, onExplore, activeOrderId }: DesktopLandingHeaderProps) {
  return (
    <header className="eats-desktop-header">
      <div className="eats-desktop-header-inner">
        <Link to="/" className="eats-wordmark" aria-label="Estrella Eats, inicio">
          <img src="/estrella-icon-192.png" alt="" width="42" height="42" />
          <span>estrella<span className="eats-wordmark-accent">eats</span><span className="eats-wordmark-dot">.</span></span>
        </Link>
        <button type="button" className="eats-header-location" onClick={onLocation} title={address || 'Comitán de Domínguez'} aria-label="Elegir ubicación">
          <MapPin size={17} aria-hidden="true" />
          <span><small>{address ? 'Tu ubicación' : 'Elige dónde pedir'}</small>{address ? address.split(',')[0] : 'Comitán de Domínguez'}</span>
        </button>
        <div className="eats-delivery-switch" role="group" aria-label="Modalidad del pedido">
          <button type="button" aria-pressed={deliveryType === 'domicilio'} onClick={() => onDeliveryType('domicilio')}>A domicilio</button>
          <button type="button" aria-pressed={deliveryType === 'recoger'} onClick={() => onDeliveryType('recoger')}>Para llevar</button>
        </div>
        <form className="eats-header-search" role="search" onSubmit={event => { event.preventDefault(); onExplore(); }}>
          <Search size={18} aria-hidden="true" />
          <input type="search" enterKeyHint="search" aria-label="Buscar restaurantes o comida" placeholder="Buscar comida o restaurantes" value={search} onChange={event => onSearch(event.target.value)} />
          {search && <button type="button" aria-label="Limpiar búsqueda" onClick={() => onSearch('')}><X size={18} aria-hidden="true" /></button>}
        </form>
        <Link to="/beneficios" className="eats-header-benefits" aria-label="Beneficios"><Sparkles size={18} aria-hidden="true" /><span>Beneficios</span></Link>
        <Link to={activeOrderId ? `/success?pedido=${activeOrderId}` : '/menu/global/carrito'} className="eats-header-cart" aria-label={activeOrderId ? 'Ver pedido activo' : 'Carrito'}><ShoppingBag size={19} aria-hidden="true" /><span>{activeOrderId ? 'Mi pedido' : 'Carrito'}</span></Link>
      </div>
    </header>
  );
}

interface DesktopLandingHeroProps {
  onExplore: () => void;
  deliveryType: string;
  banners: LandingBanner[];
}

export function DesktopLandingHero({ onExplore, deliveryType, banners }: DesktopLandingHeroProps) {
  const isDesktop = useIsDesktop(1024);
  const ref = useRef<HTMLElement>(null);
  const { enabled } = useSiteMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start 15%', 'end start'] });
  const photoY = useTransform(scrollYProgress, [0, 1], [-54, 54]);
  const photoScale = useTransform(scrollYProgress, [0, 1], [1.015, 1.09]);
  const copyY = useTransform(scrollYProgress, [0, 1], [0, -60]);
  const captionY = useTransform(scrollYProgress, [0, 1], [0, -76]);
  const sealY = useTransform(scrollYProgress, [0, 1], [0, -95]);
  const sealRotate = useTransform(scrollYProgress, [0, 1], [12, -24]);
  return (
    <section ref={ref} className="eats-desktop-hero" aria-labelledby="desktop-hero-title">
      <motion.div className="eats-hero-copy-depth" style={{ y: enabled ? copyY : 0 }}>
      <div className="eats-hero-copy">
        <div className="eats-eyebrow"><span />ESTRELLA EATS EN COMITÁN</div>
        <h1 id="desktop-hero-title">Comida de<br />Comitán.<br /><span>{deliveryType === 'recoger' ? 'Para llevar.' : 'A tu puerta.'}</span><svg className="eats-title-star" viewBox="0 0 48 48" aria-hidden="true"><path d="M24 0 29 18 48 24 29 29 24 48 18 29 0 24 18 18Z" fill="currentColor" /></svg></h1>
        <p>Pide en tus restaurantes de siempre<br />{' '}o prueba uno nuevo. A domicilio o para recoger.</p>
        <div className="eats-hero-actions">
          <button type="button" onClick={onExplore} aria-controls="eats-desktop-categories" className="eats-explore-button">Ver restaurantes<ArrowUpRight size={21} aria-hidden="true" /></button>
          <Link to="/beneficios" className="eats-hero-benefits">Ver mis beneficios<ArrowUpRight size={17} aria-hidden="true" /></Link>
        </div>
        <div className="eats-hero-footnote"><Utensils size={17} aria-hidden="true" /><span>Consulta el menú y el horario de cada restaurante.</span></div>
      </div>
      </motion.div>
      <div className="eats-hero-visual">
        {isDesktop ? <>
        <motion.div className="eats-hero-photo-depth" initial={enabled ? { clipPath: 'inset(5% 0 0 8% round 24px)' } : false} animate={{ clipPath: 'inset(0% 0 0 0% round 24px)' }} transition={{ duration: .8, ease: [.16, 1, .3, 1] }}><motion.div className="eats-hero-photo-plane" style={{ y: enabled ? photoY : 0, scale: enabled ? photoScale : 1 }}><ParallaxMedia depth={12} cinematic>
          <img className="eats-hero-photo" src="/desktop/comitan-table-900.webp" srcSet="/desktop/comitan-table-480.webp 480w, /desktop/comitan-table-900.webp 900w" sizes="(max-width: 639px) 100vw, 50vw" alt="Una mesa con tacos, hamburguesa y papas para compartir" width="900" height="1125" fetchPriority="high" />
        </ParallaxMedia></motion.div></motion.div>
        <motion.div className="eats-photo-caption" style={{ y: enabled ? captionY : 0, rotate: -3 }}><span>¿QUÉ VAS A PEDIR?</span><strong>¿Tacos o<br />hamburguesa?</strong><ArrowDown size={23} aria-hidden="true" /></motion.div>
        <motion.div className="eats-local-seal" style={{ y: enabled ? sealY : 0, rotate: enabled ? sealRotate : 12 }} aria-hidden="true"><svg viewBox="0 0 100 100"><defs><path id="eats-seal-path" d="M50 50m-35 0a35 35 0 1 1 70 0a35 35 0 1 1-70 0" /></defs><text><textPath href="#eats-seal-path">COMITÁN · ESTRELLA EATS · </textPath></text></svg><span>✦</span></motion.div>
        </> : <MobileLandingCarousel banners={banners} />}
      </div>
    </section>
  );
}
