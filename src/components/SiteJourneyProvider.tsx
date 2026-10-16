import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useSiteMotion } from '../hooks/useSiteMotion';
import { SiteJourneyContext, visibleJourneyBounds, type JourneyBounds, type RestaurantDeparture } from '../lib/siteJourney';
import { SITE_EASE } from '../lib/siteMotion';

interface RestaurantJourney extends RestaurantDeparture { key: number; destination: JourneyBounds | null }
interface ProductJourney { key: number; image: string; origin: JourneyBounds; destination: JourneyBounds; expiresAt: number }

export function SiteJourneyProvider({ children }: { children: ReactNode }) {
  const { enabled } = useSiteMotion();
  const sequence = useRef(0);
  const [restaurant, setRestaurant] = useState<RestaurantJourney | null>(null);
  const [products, setProducts] = useState<ProductJourney[]>([]);
  const departRestaurant = useCallback((departure: RestaurantDeparture) => {
    if (enabled) setRestaurant({ ...departure, key: ++sequence.current, destination: null });
  }, [enabled]);
  const arriveRestaurant = useCallback((id: string, destination: JourneyBounds) => {
    setRestaurant(current => current?.id === id && !current.destination ? { ...current, destination } : current);
  }, []);
  const addProduct = useCallback((image: string, origin: JourneyBounds) => {
    if (!enabled) return;
    const target = document.querySelector('[data-cart-motion-target]');
    const destination = target && visibleJourneyBounds(target);
    if (!destination) return;
    const flight = { key: ++sequence.current, image, origin, destination, expiresAt: Date.now() + 1200 };
    setProducts(current => [...current.slice(-2), flight]);
  }, [enabled]);
  const journeyKey = restaurant?.key;
  useEffect(() => {
    if (journeyKey === undefined) return;
    // Navigation never waits for media/data. A slow or abandoned route expires the visual only.
    const timeout = window.setTimeout(() => setRestaurant(current => current?.key === journeyKey ? null : current), 1500);
    return () => window.clearTimeout(timeout);
  }, [journeyKey]);
  useEffect(() => {
    if (!products.length) return;
    const timeout = window.setTimeout(() => setProducts(current => current.filter(product => product.expiresAt > Date.now())),
      Math.max(0, Math.min(...products.map(product => product.expiresAt)) - Date.now()));
    return () => window.clearTimeout(timeout);
  }, [products]);
  const incomingRestaurantId = enabled ? restaurant?.id ?? null : null;
  const context = useMemo(() => ({ incomingRestaurantId, departRestaurant, arriveRestaurant, addProduct }), [incomingRestaurantId, departRestaurant, arriveRestaurant, addProduct]);
  return <SiteJourneyContext.Provider value={context}>
    {children}
    {createPortal(<div className="eats-journey-layer" aria-hidden="true">
      <AnimatePresence onExitComplete={() => { if (!enabled) { setRestaurant(null); setProducts([]); } }}>
        {enabled && restaurant && <motion.div key={restaurant.key} className="eats-restaurant-journey"
          style={{ left: restaurant.bounds.left, top: restaurant.bounds.top, width: restaurant.bounds.width, height: restaurant.bounds.height }}
          initial={{ opacity: 1 }}
          animate={restaurant.destination ? {
            x: restaurant.destination.left + restaurant.destination.width / 2 - restaurant.bounds.left - restaurant.bounds.width / 2,
            y: restaurant.destination.top + restaurant.destination.height / 2 - restaurant.bounds.top - restaurant.bounds.height / 2,
            scale: Math.min(restaurant.destination.width / restaurant.bounds.width, restaurant.destination.height / restaurant.bounds.height),
            opacity: [1, 1, 0],
          } : { opacity: 1 }}
          exit={{ opacity: 0 }} transition={{ duration: .54, ease: SITE_EASE, opacity: { times: [0, .8, 1], duration: .54 } }}
          onAnimationComplete={() => { if (restaurant.destination) setRestaurant(current => current?.key === restaurant.key ? null : current); }}>
          <img src={restaurant.image} alt="" onError={() => setRestaurant(current => current?.key === restaurant.key ? null : current)} />
        </motion.div>}
        {enabled && products.map(product => {
          const startX = product.origin.left + product.origin.width / 2 - 36;
          const startY = product.origin.top + product.origin.height / 2 - 36;
          const endX = product.destination.left + product.destination.width / 2 - 36;
          const endY = product.destination.top + product.destination.height / 2 - 36;
          return <motion.div key={product.key} className="eats-product-journey"
            initial={{ x: startX, y: startY, scale: 1, opacity: 1 }}
            animate={{ x: [startX, (startX + endX) / 2, endX], y: [startY, Math.max(12, Math.min(startY, endY) - 56), endY], scale: [1, .82, .18], opacity: [1, 1, 0], rotate: [0, -8, 0] }}
            transition={{ duration: .62, ease: SITE_EASE, times: [0, .45, 1] }}
            onAnimationComplete={() => setProducts(current => current.filter(entry => entry.key !== product.key))}>
            <img src={product.image} alt="" onError={() => setProducts(current => current.filter(entry => entry.key !== product.key))} />
          </motion.div>;
        })}
      </AnimatePresence>
    </div>, document.body)}
  </SiteJourneyContext.Provider>;
}
