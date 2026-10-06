import { useState, useEffect, useRef, type MouseEvent, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Heart, ChevronLeft, ChevronRight } from 'lucide-react';

/**
 * Listado de restaurantes SOLO para desktop (md+), estilo Uber Eats:
 * tarjetas planas (foto grande con esquinas redondeadas + texto debajo), sin sombras,
 * carruseles con flechas y paleta blanco/negro/gris. En móvil se sigue usando el diseño original.
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
    <Link to={`/menu/${res.slug || res.id}`} className="group block outline-none">
      {/* Foto */}
      <div className="relative aspect-[16/10] rounded-xl overflow-hidden bg-[#f3f3f3]">
        {res.foto_fachada_url ? (
          <>
            <img
              src={res.foto_fachada_url}
              alt=""
              aria-hidden="true"
              className={`absolute inset-0 w-full h-full object-cover scale-110 blur-xl opacity-50 ${!isAbierto ? 'grayscale' : ''}`}
            />
            <img
              src={res.foto_fachada_url}
              alt={res.nombre}
              loading="lazy"
              className={`relative w-full h-full object-contain drop-shadow-sm ${!isAbierto ? 'grayscale' : ''}`}
            />
          </>
        ) : (
          <div className="w-full h-full flex items-center justify-center text-[#a8a8a8] text-[13px] font-medium">
            Sin foto
          </div>
        )}

        {/* Oscurecido sutil al pasar el mouse */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/[0.06] transition-colors duration-200" />

        {esGratis && isAbierto && (
          <span className="absolute bottom-3 left-3 bg-[#06C167] text-white text-[12px] font-medium px-2.5 py-1 rounded-md">
            Envío gratis
          </span>
        )}

        {!isAbierto && (
          <div className="absolute inset-0 bg-white/60 flex items-center justify-center">
            <span className="bg-black text-white text-[13px] font-medium px-3.5 py-1.5 rounded-full">
              Cerrado
            </span>
          </div>
        )}

        {/* Favorito */}
        <button
          type="button"
          aria-label={isFav ? 'Quitar de favoritos' : 'Agregar a favoritos'}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            toggleFav(e, res.id);
          }}
          className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white hover:bg-[#f3f3f3] flex items-center justify-center transition-colors"
        >
          <Heart
            size={16}
            strokeWidth={2}
            className={isFav ? 'fill-red-500 text-red-500' : 'text-black'}
          />
        </button>
      </div>

      {/* Info */}
      <div className="pt-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className={`text-[16px] leading-tight font-medium truncate ${isAbierto ? 'text-black' : 'text-[#6b6b6b]'}`}>
            {res.nombre}
          </h3>
          <p className="mt-1 text-[14px] leading-tight text-[#545454] truncate">
            {isAbierto ? `${costo} · 25–35 min` : 'Cerrado por ahora'}
          </p>
          <p className="mt-0.5 text-[14px] leading-tight text-[#6b6b6b] truncate">
            {categoria}
            {distancia && ` · ${distancia}`}
          </p>
        </div>
        <span className="shrink-0 h-7 min-w-[34px] px-2 rounded-full bg-[#f3f3f3] text-black text-[12px] font-medium flex items-center justify-center">
          4.8
        </span>
      </div>
    </Link>
  );
}

/** Fila con título y flechas de scroll (como los carruseles de Uber Eats). */
function DesktopRow({ title, children }: { title: string; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(false);

  const update = () => {
    const el = ref.current;
    if (!el) return;
    setCanLeft(el.scrollLeft > 4);
    setCanRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  };

  useEffect(() => {
    update();
  });

  useEffect(() => {
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  const scroll = (dir: 1 | -1) => {
    const el = ref.current;
    if (!el) return;
    el.scrollBy({ left: dir * el.clientWidth * 0.8, behavior: 'smooth' });
  };

  const arrowCls =
    'w-9 h-9 rounded-full bg-[#f3f3f3] hover:bg-[#e2e2e2] disabled:opacity-40 disabled:hover:bg-[#f3f3f3] disabled:cursor-default flex items-center justify-center text-black transition-colors';

  return (
    <section>
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-[24px] font-bold tracking-tight text-black">{title}</h2>
        <div className="flex items-center gap-2">
          <button type="button" aria-label="Anterior" disabled={!canLeft} onClick={() => scroll(-1)} className={arrowCls}>
            <ChevronLeft size={20} />
          </button>
          <button type="button" aria-label="Siguiente" disabled={!canRight} onClick={() => scroll(1)} className={arrowCls}>
            <ChevronRight size={20} />
          </button>
        </div>
      </div>
      <div
        ref={ref}
        onScroll={update}
        className="flex gap-6 overflow-x-auto no-scrollbar scroll-smooth snap-x"
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
      className="flex flex-col gap-12 mt-6 pb-12"
    >
      {sinFiltros && favs.length > 0 && (
        <DesktopRow title="Tus favoritos">
          {favs.map((res) => (
            <div key={res.id} className="w-[300px] shrink-0 snap-start">
              {renderCard(res)}
            </div>
          ))}
        </DesktopRow>
      )}

      {sinFiltros && restaurants.length > 4 && (
        <DesktopRow title="Para empezar">
          {restaurants.slice(0, 8).map((res) => (
            <div key={res.id} className="w-[300px] shrink-0 snap-start">
              {renderCard(res)}
            </div>
          ))}
        </DesktopRow>
      )}

      <section>
        <h2 className="text-[24px] font-bold tracking-tight text-black mb-5">{titulo}</h2>
        <div
          key={selectedCategory || search || activeTab}
          className="grid grid-cols-2 xl:grid-cols-3 gap-x-6 gap-y-10"
        >
          {restaurants.map((res) => (
            <div key={res.id}>{renderCard(res)}</div>
          ))}
        </div>
      </section>
    </motion.div>
  );
}

/** Skeleton de carga para desktop (planos, sin sombras). */
export function DesktopRestaurantSkeletons() {
  return (
    <div className="grid grid-cols-2 xl:grid-cols-3 gap-x-6 gap-y-10 mt-6">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="animate-pulse">
          <div className="aspect-[16/10] rounded-xl bg-[#eeeeee]" />
          <div className="pt-3 flex flex-col gap-2">
            <div className="h-4 w-2/3 rounded bg-[#eeeeee]" />
            <div className="h-3.5 w-1/2 rounded bg-[#f3f3f3]" />
          </div>
        </div>
      ))}
    </div>
  );
}
