import { useLayoutEffect, useRef, useState } from 'react';
import { Clock, MapPin, Store, ChevronDown } from 'lucide-react';
import type { Restaurante, HorariosRestaurante } from '../lib/supabase';
import { motion } from 'framer-motion';
import { useSiteMotion } from '../hooks/useSiteMotion';
import { SITE_EASE } from '../lib/siteMotion';
import { useSiteJourney } from '../hooks/useSiteJourney';
import { visibleJourneyBounds } from '../lib/siteJourney';

const weekdays: (keyof HorariosRestaurante)[] = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];

export default function RestaurantMenuIdentity({ restaurant, open, hasBranches, onBranches }: {
  restaurant: Restaurante;
  open: boolean;
  hasBranches: boolean;
  onBranches: () => void;
}) {
  const [failedImage, setFailedImage] = useState<string | null>(null);
  const { enabled } = useSiteMotion();
  const { arriveRestaurant, incomingRestaurantId } = useSiteJourney();
  const identityImage = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const bounds = identityImage.current && visibleJourneyBounds(identityImage.current);
    if (bounds) arriveRestaurant(restaurant.id, bounds);
  }, [restaurant.id, arriveRestaurant]);
  const image = restaurant.foto_fachada_url || restaurant.logo_url;
  const today = restaurant.horarios?.[weekdays[new Date().getDay()]];
  const opening = today?.activo ? today.abre : restaurant.hora_apertura?.slice(0, 5);
  const closing = today?.activo ? today.cierra : restaurant.hora_cierre?.slice(0, 5);
  const coordinates = typeof restaurant.lat === 'number' && Number.isFinite(restaurant.lat)
    && typeof restaurant.lng === 'number' && Number.isFinite(restaurant.lng);
  const mapLink = coordinates ? `https://www.google.com/maps/search/?api=1&query=${restaurant.lat},${restaurant.lng}`
    : restaurant.maps_url || (restaurant.direccion?.startsWith('http') ? restaurant.direccion
      : restaurant.direccion ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(restaurant.direccion.replace('GPS: ', ''))}` : null);
  const addressLabel = restaurant.direccion && !restaurant.direccion.startsWith('http') && !restaurant.direccion.startsWith('GPS:')
    ? restaurant.direccion : 'Ver ubicación';

  return (
    <motion.section key={restaurant.id} className="menu-identity" aria-labelledby="restaurant-menu-title" initial={{ opacity: incomingRestaurantId === restaurant.id ? 1 : .55, x: enabled && incomingRestaurantId !== restaurant.id ? 24 : 0 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: enabled ? .45 : .1, ease: SITE_EASE }}>
      <div ref={identityImage} className="menu-identity-image">
        {image && failedImage !== image ? <img src={image} alt="" data-restaurant-motion-origin={restaurant.id} onError={() => setFailedImage(image)} /> : <Store size={32} aria-hidden="true" />}
      </div>
      <div className="menu-identity-copy">
        <div className="menu-identity-title"><h1 id="restaurant-menu-title">{restaurant.nombre}</h1><span className="menu-open-state" data-open={open}>{open ? 'Abierto' : 'Cerrado'}</span></div>
        <p className="menu-restaurant-categories">{restaurant.categorias?.join(' · ') || 'Restaurante'}</p>
        {(restaurant.matriz_id || hasBranches) && <p className="menu-restaurant-categories"><MapPin size={15} aria-hidden="true" /> {restaurant.nombre_sucursal || 'Sucursal principal'}</p>}
        {restaurant.descripcion_corta && <p className="menu-restaurant-description">{restaurant.descripcion_corta}</p>}
        <div className="menu-identity-meta">
          {opening && closing && <span><Clock size={16} aria-hidden="true" /> {opening} – {closing}</span>}
          {mapLink && <a href={mapLink} target="_blank" rel="noopener noreferrer"><MapPin size={16} aria-hidden="true" /> {addressLabel}</a>}
        </div>
      </div>
      {hasBranches && <button type="button" className="menu-branch-button" onClick={onBranches}>Cambiar sucursal <ChevronDown size={16} aria-hidden="true" /></button>}
    </motion.section>
  );
}
