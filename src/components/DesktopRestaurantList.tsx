import { useState, useEffect, useRef, useCallback, useId, type MouseEvent, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Heart, ChevronLeft, ChevronRight, Store } from 'lucide-react';
import './desktopRestaurantList.css';
import { ParallaxMedia, ScrollLayer } from './ParallaxMedia';

/**
 * Catálogo compacto de escritorio y tablet, con fotos completas y densidad
 * adaptable al espacio disponible. La lista de teléfono tiene su propia vista.
 */

interface DesktopRes {
  id: string;
  nombre: string;
  telefono: string;
  slug?: string;
  foto_fachada_url?: string;
  categorias?: string[];
  lat?: number;
  lng?: number;
  etiqueta_zona?: string;
}

interface UserLocation {
  lat: number;
  lng: number;
}

interface CardProps {
  res: DesktopRes;
  isFav: boolean;
  toggleFav: (e: MouseEvent<HTMLButtonElement>, id: string) => void;
  userLocation: UserLocation | null;
  estaAbierto: (r: DesktopRes) => boolean;
  calculaDistancia: (lat1: number, lng1: number, lat2: number, lng2: number) => number;
  globalDeliveryType: string;
}

function DesktopRestaurantCard({
  res,
  isFav,
  toggleFav,
  userLocation,
  estaAbierto,
  calculaDistancia,
  globalDeliveryType,
}: CardProps) {
  const isAbierto = estaAbierto(res);
  const recoger = globalDeliveryType === 'recoger';
  const [failedImage, setFailedImage] = useState<string | null>(null);

  // Misma lógica de costo/distancia que la tarjeta original
  let costo = recoger ? 'Para llevar' : 'Envío $45';
  let distancia = '';
  if (!recoger && userLocation && res.lat && res.lng) {
    const dist = calculaDistancia(userLocation.lat, userLocation.lng, res.lat, res.lng);
    distancia = dist < 1 ? '< 1 km' : `${dist.toFixed(1)} km`;
    costo = dist <= 1.5 ? 'Envío gratis' : `Envío $${Math.round(15 + dist * 10)}`;
  }

  const categoria = res.categorias?.[0] || 'Restaurante';
  const esGratis = res.etiqueta_zona === 'verde' && !recoger;

  return (
    <article className="desktop-restaurant-card" data-open={isAbierto}>
    <Link to={`/menu/${res.slug || res.id}`} className="desktop-restaurant-link" aria-label={`Ver menú de ${res.nombre}`}>
      {/* Foto */}
      <div className="desktop-restaurant-photo">
        {res.foto_fachada_url && res.foto_fachada_url !== failedImage ? (
            <ParallaxMedia depth={4}><img
              src={res.foto_fachada_url}
              alt=""
              loading="lazy"
              decoding="async"
              onError={() => setFailedImage(res.foto_fachada_url || null)}
            /></ParallaxMedia>
        ) : (
          <div className="desktop-restaurant-placeholder">
            <Store size={28} strokeWidth={1.5} aria-hidden="true" />
          </div>
        )}

        {esGratis && isAbierto && (
          <span className="desktop-restaurant-badge desktop-restaurant-badge-free">
            Envío gratis
          </span>
        )}

        {!isAbierto && (
            <span className="desktop-restaurant-badge">
              Cerrado
            </span>
        )}
      </div>

      {/* Info */}
      <div className="desktop-restaurant-info">
        <div className="min-w-0">
          <h3>
            {res.nombre}
          </h3>
          <p className="desktop-restaurant-delivery">
            {isAbierto ? `${costo} · 25–35 min` : 'Cerrado por ahora'}
          </p>
          <p className="desktop-restaurant-category">
            {categoria}
            {distancia && ` · ${distancia}`}
          </p>
        </div>
        <span className="desktop-restaurant-rating">
          4.8
        </span>
      </div>
    </Link>
    <button type="button" className="desktop-restaurant-favorite" aria-pressed={isFav}
      aria-label={`${isFav ? 'Quitar de favoritos' : 'Agregar a favoritos'}: ${res.nombre}`}
      onClick={event => toggleFav(event, res.id)}>
      <Heart size={18} strokeWidth={1.8} aria-hidden="true" />
    </button>
    </article>
  );
}

/** Fila con título y flechas de scroll (como los carruseles de Uber Eats). */
function DesktopRow({ title, children }: { title: string; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(false);
  const headingId = useId();

  const update = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    setCanLeft(el.scrollLeft > 4);
    setCanRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }, []);

  useEffect(() => {
    update();
  }, [children, update]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, [update]);

  const scroll = (dir: 1 | -1) => {
    const el = ref.current;
    if (!el) return;
    el.scrollBy({ left: dir * el.clientWidth * 0.8,
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  };

  return (
    <section aria-labelledby={headingId}>
      <div className="desktop-directory-heading">
        <h2 id={headingId}>{title}</h2>
        <div className="desktop-directory-controls">
          <button type="button" aria-label={`Anterior en ${title}`} disabled={!canLeft} onClick={() => scroll(-1)}>
            <ChevronLeft size={20} />
          </button>
          <button type="button" aria-label={`Siguiente en ${title}`} disabled={!canRight} onClick={() => scroll(1)}>
            <ChevronRight size={20} />
          </button>
        </div>
      </div>
      <div
        ref={ref}
        onScroll={update}
        tabIndex={0}
        aria-label={`Restaurantes en ${title}`}
        className="desktop-directory-rail"
      >
        {children}
      </div>
    </section>
  );
}

interface ListProps {
  restaurants: DesktopRes[];
  favorites: string[];
  toggleFav: (e: MouseEvent<HTMLButtonElement>, id: string) => void;
  userLocation: UserLocation | null;
  estaAbierto: (r: DesktopRes) => boolean;
  calculaDistancia: (lat1: number, lng1: number, lat2: number, lng2: number) => number;
  globalDeliveryType: string;
  search: string;
  selectedCategory: string | null;
  activeTab: string;
}

export function DesktopRestaurantList({
  restaurants,
  favorites,
  toggleFav,
  userLocation,
  estaAbierto,
  calculaDistancia,
  globalDeliveryType,
  search,
  selectedCategory,
  activeTab,
}: ListProps) {
  const sinFiltros = !search && !selectedCategory && activeTab === 'todos';
  const favs = restaurants.filter((r) => favorites.includes(r.id));

  const titulo = selectedCategory
    ? selectedCategory
    : search
      ? `Resultados para “${search}”`
      : activeTab === 'cerca'
        ? 'Cerca de ti'
        : 'Todos los restaurantes';

  const renderCard = (res: DesktopRes) => (
    <DesktopRestaurantCard
      res={res}
      isFav={favorites.includes(res.id)}
      toggleFav={toggleFav}
      userLocation={userLocation}
      estaAbierto={estaAbierto}
      calculaDistancia={calculaDistancia}
      globalDeliveryType={globalDeliveryType}
    />
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      className="desktop-restaurant-list"
    >
      {sinFiltros && favs.length > 0 && (
        <DesktopRow title="Tus favoritos">
          {favs.map((res) => (
            <div key={res.id} className="desktop-directory-slide">
              {renderCard(res)}
            </div>
          ))}
        </DesktopRow>
      )}

      {sinFiltros && restaurants.length > 4 && (
        <DesktopRow title="Para empezar">
          {restaurants.slice(0, 8).map((res) => (
            <div key={res.id} className="desktop-directory-slide">
              {renderCard(res)}
            </div>
          ))}
        </DesktopRow>
      )}

      <section>
        <div className="desktop-directory-heading"><h2>{titulo}</h2></div>
        <div
          key={selectedCategory || search || activeTab}
          className="desktop-directory-grid"
        >
          {restaurants.map((res, index) => (
            <ScrollLayer key={res.id} distance={24 + index % 3 * 10} tilt={.45}>{renderCard(res)}</ScrollLayer>
          ))}
        </div>
      </section>
    </motion.div>
  );
}

/** Skeleton de carga para desktop (planos, sin sombras). */
export function DesktopRestaurantSkeletons() {
  return (
    <div className="desktop-directory-grid desktop-directory-loading" aria-label="Cargando restaurantes" aria-busy="true">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="animate-pulse">
          <div className="desktop-restaurant-photo bg-[#eeeeee]" />
          <div className="pt-3 flex flex-col gap-2">
            <div className="h-4 w-2/3 rounded bg-[#eeeeee]" />
            <div className="h-3.5 w-1/2 rounded bg-[#f3f3f3]" />
          </div>
        </div>
      ))}
    </div>
  );
}
