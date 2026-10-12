import { useState } from 'react';
import { Clock, MapPin, Store, ChevronDown } from 'lucide-react';
import type { Restaurante, HorariosRestaurante } from '../lib/supabase';

const weekdays: (keyof HorariosRestaurante)[] = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];

export default function RestaurantMenuIdentity({ restaurant, open, hasBranches, onBranches }: {
  restaurant: Restaurante;
  open: boolean;
  hasBranches: boolean;
  onBranches: () => void;
}) {
  const [failedImage, setFailedImage] = useState<string | null>(null);
  const image = restaurant.logo_url || restaurant.foto_fachada_url;
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
    <section className="menu-identity" aria-labelledby="restaurant-menu-title">
      <div className="menu-identity-image">
        {image && failedImage !== image ? <img src={image} alt="" onError={() => setFailedImage(image)} /> : <Store size={32} aria-hidden="true" />}
      </div>
      <div className="menu-identity-copy">
        <div className="menu-identity-title"><h1 id="restaurant-menu-title">{restaurant.nombre}</h1><span className="menu-open-state" data-open={open}>{open ? 'Abierto' : 'Cerrado'}</span></div>
        <p className="menu-restaurant-categories">{restaurant.categorias?.join(' · ') || 'Restaurante'}</p>
        {restaurant.descripcion_corta && <p className="menu-restaurant-description">{restaurant.descripcion_corta}</p>}
        <div className="menu-identity-meta">
          {opening && closing && <span><Clock size={16} aria-hidden="true" /> {opening} – {closing}</span>}
          {mapLink && <a href={mapLink} target="_blank" rel="noopener noreferrer"><MapPin size={16} aria-hidden="true" /> {addressLabel}</a>}
        </div>
      </div>
      {hasBranches && <button type="button" className="menu-branch-button" onClick={onBranches}>Cambiar sucursal <ChevronDown size={16} aria-hidden="true" /></button>}
    </section>
  );
}
