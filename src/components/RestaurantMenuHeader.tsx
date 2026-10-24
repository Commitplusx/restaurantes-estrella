import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ChevronLeft, Store } from 'lucide-react';
import { SITE_EASE } from '../lib/siteMotion';
import { CatalogImage } from './CatalogImage';

interface HeaderRestaurant { id: string; nombre: string; nombre_sucursal?: string | null; foto_fachada_url?: string | null; logo_url?: string | null }

/** One intersection boundary replaces per-scroll React updates for the menu identity. */
export default function RestaurantMenuHeader({ restaurant, hasCart, fromSearch }: {
  restaurant: HeaderRestaurant; hasCart: boolean; fromSearch: boolean;
}) {
  const header = useRef<HTMLElement>(null);
  const [compact, setCompact] = useState(false);
  const [failedImage, setFailedImage] = useState<string | null>(null);
  const image = restaurant.foto_fachada_url || restaurant.logo_url;
  useEffect(() => {
    const bar = header.current;
    const page = bar?.closest<HTMLElement>('.restaurant-menu-page');
    const identity = page?.querySelector('.menu-identity');
    if (!bar || !page || !identity) return;
    let intersection: IntersectionObserver | null = null;
    let previousHeight = -1;
    const measure = () => {
      const height = Math.ceil(bar.getBoundingClientRect().height);
      if (height === previousHeight) return;
      previousHeight = height;
      page.style.setProperty('--menu-sticky-header-height', `${height}px`);
      intersection?.disconnect();
      intersection = new IntersectionObserver(([entry]) => {
        setCompact(entry.boundingClientRect.bottom <= height + 1);
      }, { rootMargin: `-${height}px 0px 0px`, threshold: [0, 1] });
      intersection.observe(identity);
    };
    measure();
    const resize = new ResizeObserver(measure);
    resize.observe(bar);
    return () => { resize.disconnect(); intersection?.disconnect(); page.style.removeProperty('--menu-sticky-header-height'); };
  }, [restaurant.id]);
  return <header ref={header} className="menu-topbar" data-compact={compact}>
    <div className="menu-topbar-inner" data-has-cart={hasCart}>
      <Link to="/" state={fromSearch ? { activeNavTab: 'search' } : undefined} className="menu-back" aria-label="Volver a los restaurantes"><ChevronLeft size={20} aria-hidden="true" /></Link>
      <div className="menu-header-identity">
        <motion.div className="menu-header-brand-plane" animate={{ opacity: compact ? 0 : 1, y: compact ? -8 : 0 }} transition={{ duration: .22, ease: SITE_EASE }} inert={compact} aria-hidden={compact}>
          <Link to="/" className="menu-brand" aria-label="Estrella Eats, inicio"><img src="/estrella-icon-192.png" alt="" width="32" height="32" /><span>Estrella<span>Eats</span></span></Link>
        </motion.div>
        <motion.div className="menu-header-restaurant-plane" initial={false} animate={{ opacity: compact ? 1 : 0, y: compact ? 0 : 8 }} transition={{ duration: .26, ease: SITE_EASE }} inert={!compact} aria-hidden={!compact}>
          <span className="menu-header-photo">
            {image && failedImage !== image ? <CatalogImage src={image} loading="eager" alt="" data-restaurant-motion-origin={restaurant.id} onError={() => setFailedImage(image)} /> : <Store size={20} aria-hidden="true" />}
          </span>
          <span className="menu-header-name"><strong>{restaurant.nombre}</strong><small>{restaurant.nombre_sucursal || 'Menú del restaurante'}</small></span>
        </motion.div>
      </div>
      {!hasCart && <span className="menu-topbar-label">Elige tu antojo</span>}
    </div>
  </header>;
}
