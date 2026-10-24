import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useSiteMotion } from '../hooks/useSiteMotion';
import { SiteJourneyContext, horizontalJourneyScroller, visibleJourneyBounds, type JourneyBounds, type RestaurantDeparture } from '../lib/siteJourney';
import { SITE_EASE } from '../lib/siteMotion';
import { useLocation } from 'react-router-dom';
import { useCartStore } from '../store/useCartStore';
import { addedCartProduct, journeyTransform, validJourneyBounds } from '../lib/journeyGeometry';

interface RestaurantJourney extends RestaurantDeparture { key: number; destination: JourneyBounds | null; direction: 'enter' | 'return' }
interface ProductJourney { key: number; image: string; origin: JourneyBounds; destination: JourneyBounds; expiresAt: number }
interface PendingProduct { key: number; image: string; origin: JourneyBounds; deadline: number }
const isMenuPath = (path: string) => /^\/menu\/[^/]+\/?$/.test(path);

function menuDeparture(): RestaurantDeparture | null {
  const images = Array.from(document.querySelectorAll<HTMLImageElement>('[data-restaurant-motion-origin]'));
  for (const image of images) {
    if (image.closest('[inert]') || !image.complete || !image.naturalWidth) continue;
    const bounds = visibleJourneyBounds(image);
    const id = image.dataset.restaurantMotionOrigin;
    if (bounds && id) return { id, image: image.currentSrc || image.src, bounds };
  }
  return null;
}

function productOrigin(key: string, image: string): { bounds: JourneyBounds; image: string } | null {
  // Decoration reuses media already loaded by the menu, never preloads another photo.
  const sources = Array.from(document.querySelectorAll<HTMLElement>('[data-product-motion-key]'));
  for (const source of sources.reverse()) {
    if (source.dataset.productMotionKey !== key || source.closest('[inert]')) continue;
    const photo = source.querySelector<HTMLImageElement>('[data-product-motion-photo] img, .menu-detail-photo img');
    if (!photo?.complete || !photo.naturalWidth || !(photo.getAttribute('src') === image || photo.currentSrc === image || photo.dataset.catalogOriginal === image)) continue;
    const active = document.activeElement;
    const focusOrigin = source.matches('[role="dialog"], [data-product-motion-dialog]') && active instanceof HTMLElement && source.contains(active) ? active : null;
    const bounds = visibleJourneyBounds(focusOrigin || source.querySelector('[data-product-motion-photo], .menu-detail-photo') || source);
    if (bounds) return { bounds, image: photo.currentSrc || photo.src };
  }
  return null;
}

export function SiteJourneyProvider({ children }: { children: ReactNode }) {
  const { enabled } = useSiteMotion();
  const location = useLocation();
  const path = useRef(location.pathname);
  const sequence = useRef(0);
  const returnSource = useRef<RestaurantDeparture | null>(null);
  const cataloguePosition = useRef<{ id: string; top: number; listing?: RestaurantDeparture['listing'] } | null>(null);
  const pending = useRef<PendingProduct[]>([]);
  const pendingFrame = useRef<number | null>(null);
  const receiptPulse = useRef<Animation | null>(null);
  const [trace, setTrace] = useState({ capture: 'none', route: 'none', completion: 'none' });
  const [restaurant, setRestaurant] = useState<RestaurantJourney | null>(null);
  const [products, setProducts] = useState<ProductJourney[]>([]);
  const departRestaurant = useCallback((departure: RestaurantDeparture) => {
    if (!enabled || document.hidden || !validJourneyBounds(departure.bounds)) return;
    cataloguePosition.current = { id: departure.id, top: window.scrollY, listing: departure.listing };
    setRestaurant({ ...departure, key: ++sequence.current, destination: null, direction: 'enter' });
  }, [enabled]);
  const arriveRestaurant = useCallback((id: string, destination: JourneyBounds) => {
    if (!validJourneyBounds(destination)) return;
    setRestaurant(current => current?.id === id && current.direction === 'enter' && !current.destination ? { ...current, destination } : current);
  }, []);
  const cancelPending = useCallback(() => {
    if (pendingFrame.current !== null) window.cancelAnimationFrame(pendingFrame.current);
    pendingFrame.current = null;
    pending.current = [];
  }, []);
  const addProduct = useCallback((image: string, origin: JourneyBounds) => {
    if (!enabled || document.hidden || !validJourneyBounds(origin)) return;
    pending.current = [...pending.current.slice(-2), { key: ++sequence.current, image, origin, deadline: Date.now() + 450 }];
    if (pendingFrame.current !== null) return;
    const flush = () => {
      pendingFrame.current = null;
      pending.current = pending.current.filter(product => product.deadline > Date.now());
      if (document.hidden || !pending.current.length) { pending.current = []; return; }
      const target = document.querySelector('[data-cart-motion-target]');
      const destination = target && visibleJourneyBounds(target);
      if (!destination) { pendingFrame.current = window.requestAnimationFrame(flush); return; }
      const flights = pending.current.map(product => ({ ...product, destination, expiresAt: Date.now() + 1100 }));
      pending.current = [];
      setProducts(current => [...current, ...flights].slice(-3));
    };
    // The first cart dock mounts in the same commit as its first product.
    pendingFrame.current = window.requestAnimationFrame(flush);
  }, [enabled]);
  useEffect(() => useCartStore.subscribe((next, previous) => {
    if (!enabled || !isMenuPath(path.current) || next.carrito === previous.carrito) return;
    const added = addedCartProduct(previous.carrito, next.carrito);
    if (!added) return;
    const origin = productOrigin(added.key, added.image);
    if (origin) addProduct(origin.image, origin.bounds);
  }), [enabled, addProduct]);
  useEffect(() => {
    const capture = () => {
      if (!isMenuPath(path.current)) return;
      returnSource.current = menuDeparture();
      const captured = Boolean(returnSource.current);
      if (import.meta.env.DEV) setTrace(current => ({ ...current, capture: captured ? 'ready' : 'missing' }));
    };
    const onClick = (event: MouseEvent) => {
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || !(event.target instanceof Element)) return;
      const link = event.target.closest<HTMLAnchorElement>('a[href]');
      if (link && link.origin === window.location.origin && link.pathname === '/' && link.target !== '_blank' && !link.download) capture();
    };
    document.addEventListener('click', onClick, true);
    window.addEventListener('popstate', capture);
    return () => { document.removeEventListener('click', onClick, true); window.removeEventListener('popstate', capture); };
  }, []);
  useLayoutEffect(() => {
    const previous = path.current;
    path.current = location.pathname;
    if (previous === location.pathname) return;
    cancelPending();
    const source = returnSource.current;
    const frame = window.requestAnimationFrame(() => {
      if (import.meta.env.DEV) setTrace(current => ({ ...current, route: `${previous} → ${location.pathname}` }));
      setProducts([]);
      if (enabled && location.pathname === '/' && isMenuPath(previous) && source) {
        if (import.meta.env.DEV) setTrace(current => ({ ...current, completion: 'return-started' }));
        setRestaurant({ ...source, key: ++sequence.current, destination: null, direction: 'return' });
      } else if (!isMenuPath(location.pathname) || previous !== '/') setRestaurant(null);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [location.key, location.pathname, enabled, cancelPending]);
  const journeyKey = restaurant?.key;
  const returningId = restaurant?.direction === 'return' ? restaurant.id : null;
  useEffect(() => {
    if (journeyKey === undefined) return;
    const timeout = window.setTimeout(() => setRestaurant(current => current?.key === journeyKey ? null : current), 1800);
    const cancel = () => {
      setRestaurant(current => current?.key === journeyKey ? null : current);
      if (returningId) cataloguePosition.current = null;
    };
    window.addEventListener('wheel', cancel, { passive: true });
    window.addEventListener('touchstart', cancel, { passive: true });
    window.addEventListener('pointerdown', cancel, { passive: true });
    window.addEventListener('keydown', cancel);
    return () => { window.clearTimeout(timeout); window.removeEventListener('wheel', cancel); window.removeEventListener('touchstart', cancel); window.removeEventListener('pointerdown', cancel); window.removeEventListener('keydown', cancel); };
  }, [journeyKey, returningId]);
  useEffect(() => {
    if (!returningId || journeyKey === undefined) return;
    let restored = false;
    let frame: number | null = null;
    const observer = new MutationObserver(() => { if (frame === null) frame = window.requestAnimationFrame(findDestination); });
    const findDestination = () => {
      frame = null;
      const position = cataloguePosition.current;
      const links = Array.from(document.querySelectorAll<HTMLAnchorElement>('[data-restaurant-motion-card]')).filter(link => link.dataset.restaurantMotionCard === returningId && (!position?.listing || link.dataset.restaurantMotionLayout === position.listing.layout));
      if (!links.length) return;
      if (!restored && position?.id === returningId) {
        restored = true;
        // Restore the catalogue once; input cancels the pending visual before a late restore.
        horizontalJourneyScroller(links[0])?.scrollTo({ left: position.listing?.railLeft || 0, behavior: 'instant' });
        window.scrollTo({ top: Math.min(position.top, Math.max(0, document.documentElement.scrollHeight - window.innerHeight)), behavior: 'instant' });
      }
      const destination = links.map(link => link.querySelector('img:not([aria-hidden="true"])'))
        .flatMap(image => { const bounds = image && visibleJourneyBounds(image); return bounds ? [bounds] : []; })
        .sort((a, b) => b.width * b.height - a.width * a.height)[0];
      if (!destination) return;
      observer.disconnect();
      cataloguePosition.current = null;
      returnSource.current = null;
      setRestaurant(current => current?.key === journeyKey ? { ...current, destination } : current);
    };
    observer.observe(document.getElementById('root') || document.body, { childList: true, subtree: true });
    frame = window.requestAnimationFrame(findDestination);
    return () => { observer.disconnect(); if (frame !== null) window.cancelAnimationFrame(frame); };
  }, [journeyKey, returningId]);
  useEffect(() => {
    const cancel = () => { cancelPending(); receiptPulse.current?.cancel(); cataloguePosition.current = null; returnSource.current = null; setRestaurant(null); setProducts([]); };
    const visibility = () => { if (document.hidden) cancel(); };
    window.addEventListener('resize', cancel);
    document.addEventListener('visibilitychange', visibility);
    return () => { window.removeEventListener('resize', cancel); document.removeEventListener('visibilitychange', visibility); cancelPending(); receiptPulse.current?.cancel(); };
  }, [cancelPending]);
  useEffect(() => {
    if (!products.length) return;
    const timeout = window.setTimeout(() => setProducts(current => current.filter(product => product.expiresAt > Date.now())),
      Math.max(0, Math.min(...products.map(product => product.expiresAt)) - Date.now()));
    return () => window.clearTimeout(timeout);
  }, [products]);
  const incomingRestaurantId = enabled ? restaurant?.id ?? null : null;
  const context = useMemo(() => ({ incomingRestaurantId, departRestaurant, arriveRestaurant, addProduct }), [incomingRestaurantId, departRestaurant, arriveRestaurant, addProduct]);
  const transform = restaurant?.destination && journeyTransform(restaurant.bounds, restaurant.destination);
  const photoStyle = restaurant ? { left: restaurant.bounds.left, top: restaurant.bounds.top, width: restaurant.bounds.width, height: restaurant.bounds.height } : {};
  const finishProduct = (key: number) => {
    setProducts(current => current.filter(product => product.key !== key));
    const icon = document.querySelector<HTMLElement>('[data-cart-motion-receipt]');
    if (icon && !document.hidden && typeof icon.animate === 'function') {
      receiptPulse.current?.cancel();
      receiptPulse.current = icon.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.2)' }, { transform: 'scale(1)' }], { duration: 280, easing: 'cubic-bezier(.16,1,.3,1)' });
    }
  };
  return <SiteJourneyContext.Provider value={context}>
    {children}
    {createPortal(<div className="eats-journey-layer" aria-hidden="true" data-capture={import.meta.env.DEV ? trace.capture : undefined} data-route={import.meta.env.DEV ? trace.route : undefined} data-completion={import.meta.env.DEV ? trace.completion : undefined}>
      <AnimatePresence>
        {enabled && restaurant && <motion.div key={restaurant.key} className="eats-restaurant-journey-group" data-journey-direction={restaurant.direction} exit={{ opacity: 0 }} transition={{ duration: .08 }}>
          <motion.div className="eats-restaurant-journey" style={photoStyle} initial={{ opacity: 1 }}
            animate={transform ? { x: transform.x, y: transform.y, scaleX: transform.scaleX, scaleY: transform.scaleY, opacity: [1, 1, 0] } : { opacity: 1 }}
            transition={{ duration: .46, ease: SITE_EASE, opacity: { times: [0, .82, 1], duration: .46 } }} />
          <motion.div className="eats-restaurant-journey-photo" style={photoStyle} initial={{ opacity: 1 }}
            animate={transform ? { x: transform.x, y: transform.y, scale: transform.photoScale, opacity: [1, 1, 0] } : { opacity: 1 }}
            transition={{ duration: .46, ease: SITE_EASE, opacity: { times: [0, .82, 1], duration: .46 } }}
            onAnimationComplete={() => { if (restaurant.destination) { if (import.meta.env.DEV) setTrace(current => ({ ...current, completion: `${restaurant.direction}-completed` })); setRestaurant(current => current?.key === restaurant.key ? null : current); } }}>
            <img src={restaurant.image} alt="" onError={() => setRestaurant(current => current?.key === restaurant.key ? null : current)} />
          </motion.div>
        </motion.div>}
        {enabled && products.map(product => {
          const startX = product.origin.left + product.origin.width / 2 - 32;
          const startY = product.origin.top + product.origin.height / 2 - 32;
          const endX = product.destination.left + product.destination.width / 2 - 32;
          const endY = product.destination.top + product.destination.height / 2 - 32;
          return <motion.div key={product.key} className="eats-product-journey"
            initial={{ x: startX, y: startY, scale: 1, opacity: 1 }}
            animate={{ x: [startX, (startX + endX) / 2, endX], y: [startY, Math.max(8, Math.min(startY, endY) - 48), endY], scale: [1, .8, .15], opacity: [1, 1, 0], rotate: [0, -7, 0] }}
            transition={{ duration: .58, ease: SITE_EASE, times: [0, .42, 1] }}
            onAnimationComplete={() => finishProduct(product.key)}>
            <img src={product.image} alt="" onError={() => setProducts(current => current.filter(entry => entry.key !== product.key))} />
          </motion.div>;
        })}
      </AnimatePresence>
    </div>, document.body)}
  </SiteJourneyContext.Provider>;
}
