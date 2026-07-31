import { useState, useEffect, useMemo, useRef } from 'react'
import { supabase } from '../lib/supabase'
import type { MenuPromocion } from '../lib/supabase'
import { Store, Search, MapPin, Clock, Ticket, Loader2, Star, ChevronRight, ChevronLeft, Heart, ChevronDown, Bell, SlidersHorizontal, Package, ChefHat, Truck, User, ShoppingCart } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useLoadScript, GoogleMap, OverlayView } from '@react-google-maps/api';
import { OnboardingFlow } from '../components/OnboardingFlow';
import { BottomNav } from '../components/BottomNav';
import { SearchView } from '../components/SearchView';

const LIBRARIES: ("places" | "geometry" | "drawing" | "visualization")[] = ["places"];

const MAP_STYLES = [
  { elementType: 'geometry', stylers: [{ color: '#f5f5f5' }] },
  { elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#616161' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#f5f5f5' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#ffffff' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#dadada' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#c9c9c9' }] },
];
interface Restaurante {
  id: string
  nombre: string
  telefono: string
  direccion?: string
  foto_fachada_url?: string
  hora_apertura?: string
  hora_cierre?: string
  horarios?: any
  categorias?: string[]
  slug?: string
  activo?: boolean
  lat?: number
  lng?: number
}


// Bottom Sheet draggable para la vista del mapa
function MapBottomSheet({ nearbyRestaurants, estaAbierto }: { nearbyRestaurants: any[], estaAbierto: (r: any) => boolean }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const touchStartY = useRef(0);

  return (
    <div
      className={`absolute left-0 right-0 z-10 bg-white rounded-t-3xl shadow-[0_-8px_30px_rgba(0,0,0,0.12)] transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] ${
        isExpanded ? 'bottom-0 max-h-[70vh]' : 'bottom-20'
      }`}
      onTouchStart={e => { touchStartY.current = e.touches[0].clientY; }}
      onTouchEnd={e => {
        const dy = touchStartY.current - e.changedTouches[0].clientY;
        if (dy > 40) setIsExpanded(true);
        if (dy < -40) setIsExpanded(false);
      }}
    >
      {/* Handle */}
      <div
        className="w-full flex flex-col items-center pt-3 pb-2 cursor-pointer"
        onClick={() => setIsExpanded(v => !v)}
      >
        <div className="w-10 h-1 bg-slate-200 rounded-full mb-2" />
        <div className="flex items-center justify-between w-full px-5">
          <p className="font-black text-slate-900 text-[15px]">Cerca de ti 📍</p>
          <span className="text-[11px] font-bold text-slate-400">{nearbyRestaurants.length} restaurantes</span>
        </div>
      </div>

      {/* Lista horizontal (siempre visible, scroll) */}
      <div className={`overflow-y-auto transition-all duration-500 ${
        isExpanded ? 'max-h-[55vh]' : 'max-h-[110px]'
      }`}>
        {/* Scroll horizontal de cards */}
        <div className="flex gap-3 overflow-x-auto px-5 pb-4 no-scrollbar snap-x">
          {nearbyRestaurants.map(res => (
            <Link
              key={res.id}
              to={`/menu/${res.slug || res.id}`}
              className="shrink-0 w-28 snap-start flex flex-col gap-1.5 active:scale-95 transition-transform"
            >
              <div className="w-full h-20 rounded-xl overflow-hidden bg-slate-100">
                {res.foto_fachada_url
                  ? <img src={res.foto_fachada_url} className="w-full h-full object-cover" alt={res.nombre} />
                  : <div className="w-full h-full flex items-center justify-center"><Store size={20} className="text-slate-300" /></div>
                }
              </div>
              <p className="font-bold text-[11px] text-slate-800 truncate leading-tight">{res.nombre}</p>
              <p className={`text-[10px] font-semibold ${estaAbierto(res) ? 'text-emerald-500' : 'text-slate-400'}`}>
                {estaAbierto(res) ? '● Abierto' : '● Cerrado'}
              </p>
            </Link>
          ))}
        </div>

        {/* Lista vertical cuando está expandido */}
        {isExpanded && (
          <div className="px-5 pb-24 mt-2 flex flex-col gap-3">
            {nearbyRestaurants.map(res => (
              <Link
                key={`v-${res.id}`}
                to={`/menu/${res.slug || res.id}`}
                className="flex gap-3 items-center py-2 border-b border-slate-50 active:bg-slate-50 rounded-xl px-1 transition-colors"
              >
                <div className="w-14 h-14 rounded-xl overflow-hidden bg-slate-100 shrink-0">
                  {res.foto_fachada_url
                    ? <img src={res.foto_fachada_url} className="w-full h-full object-cover" alt={res.nombre} />
                    : <div className="w-full h-full flex items-center justify-center"><Store size={16} className="text-slate-300" /></div>
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-slate-900 text-[13px] truncate">{res.nombre}</p>
                  <p className="text-[11px] text-slate-500 truncate">{res.categorias?.[0] || 'Restaurante'} · 25-35 min</p>
                </div>
                <span className={`text-[10px] font-bold px-2 py-1 rounded-full shrink-0 ${
                  estaAbierto(res) ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-400'
                }`}>{estaAbierto(res) ? 'Abierto' : 'Cerrado'}</span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

const EMOJI_MAP_DATA: Record<string, string> = {
  'Hamburguesas': '🍔',
  'Pizza': '🍕',
  'Tacos': '🌮',
  'Sushi': '🍣',
  'Café': '☕',
  'Postres': '🍰',
  'Saludable': '🥗',
  'Pollo': '🍗',
  'Antojitos': '🌶️',
  'Bebidas': '🥤',
  'Mariscos': '🦐',
  'Carnes': '🥩',
  'Snacks': '🍟',
  'Desayunos': '🍳',
  'Comida China': '🥡',
  'Alitas': '🔥',
  'Comida Corrida': '🍲'
}

const EMOJI_MAP = EMOJI_MAP_DATA;

function RestaurantCardSkeleton({ horizontal = false }: { horizontal?: boolean }) {
  return (
    <div className={`flex flex-col group relative bg-white sm:bg-transparent md:bg-white md:p-3 md:rounded-[24px] md:border md:border-slate-100 shadow-[0_2px_12px_rgba(0,0,0,0.03)] sm:shadow-none border border-slate-100 sm:border-none p-3 sm:p-0 gap-2 sm:gap-3 animate-pulse`}>
      <div className={`relative mx-auto md:mx-0 shrink-0 aspect-square md:aspect-[4/3] md:w-full rounded-[24px] overflow-hidden bg-slate-200 shadow-sm border border-slate-100 ${horizontal ? 'w-[100px]' : 'w-[90px] sm:w-[160px]'}`}></div>
      <div className={`flex flex-col items-center md:items-start gap-2 sm:px-1 flex-1 w-full text-center md:text-left ${horizontal ? 'mt-1' : ''}`}>
        <div className="w-3/4 md:w-full h-3 sm:h-4 bg-slate-200 rounded-full"></div>
        <div className="w-1/2 md:w-2/3 h-2 sm:h-3 bg-slate-200 rounded-full"></div>
      </div>
    </div>
  )
}

function RestaurantCard({ res, isFav, toggleFav, userLocation, estaAbierto, calculaDistancia, horizontal = false, globalDeliveryType = 'domicilio' }: any) {
  const isAbierto = estaAbierto(res);
  let distanceStr = '';
  let costoStr = globalDeliveryType === 'recoger' ? 'Para llevar' : 'Envío: $45';
  
  if (globalDeliveryType !== 'recoger' && userLocation && res.lat && res.lng) {
    const dist = calculaDistancia(userLocation.lat, userLocation.lng, res.lat, res.lng);
    distanceStr = dist < 1 ? '< 1 km' : `${dist.toFixed(1)} km`;
    if (dist <= 1.5) {
      costoStr = 'Envío Gratis 🏍️';
    } else {
      const calcCost = Math.round(15 + (dist * 10));
      costoStr = `Envío: $${calcCost}`;
    }
  }

  // Si horizontal es true, forzamos un ancho en móvil, si no, ocupa todo el ancho.
  // En desktop, la tarjeta siempre tendrá un layout estandar (vertical block, landscape image).
  return (
    <Link to={`/menu/${res.slug || res.id}`} className={`flex flex-col group relative bg-white sm:bg-transparent md:hover:bg-white md:p-2 md:rounded-[16px] transition-all duration-300 md:border md:border-transparent md:hover:border-slate-100 md:hover:shadow-[0_8px_30px_rgba(0,0,0,0.06)] shadow-[0_2px_12px_rgba(0,0,0,0.03)] sm:shadow-none border border-slate-100 sm:border-none p-3 sm:p-0 gap-2 sm:gap-3 rounded-2xl sm:rounded-none ${horizontal ? 'w-[140px] sm:w-[180px] md:w-full' : 'w-full'}`}>
       
       <div className={`relative mx-auto md:mx-0 shrink-0 aspect-[4/3] md:aspect-[16/9] w-full rounded-[16px] overflow-hidden bg-slate-100 shadow-sm border border-slate-100/50 isolate`}>
          {res.foto_fachada_url ? (
            <img 
              src={res.foto_fachada_url} 
              loading="lazy" 
              className="relative w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out z-10" 
              alt={res.nombre} 
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-slate-50"><Store size={32} className="text-slate-300" /></div>
          )}
          
          <motion.button 
            onClick={(e: any) => toggleFav(e, res.id)}
            whileTap={{ scale: 0.8 }}
            className="absolute top-2 right-2 md:top-3 md:right-3 w-8 h-8 bg-white/90 backdrop-blur-md rounded-full shadow-sm flex items-center justify-center z-30 transition-colors hover:bg-white"
          >
            <motion.div
              initial={false}
              animate={{ scale: isFav ? [1, 1.3, 1] : 1 }}
              transition={{ duration: 0.3 }}
            >
              <Heart size={16} className={`${isFav ? 'fill-red-500 text-red-500' : 'text-slate-400'}`} />
            </motion.div>
          </motion.button>

          {/* Badge de Promoción Opcional (Mockup Uber Eats) */}
          {res.etiqueta_zona === 'verde' && globalDeliveryType !== 'recoger' && (
             <div className="absolute top-2 md:top-3 left-2 md:left-3 bg-[#1D4ED8] text-white text-[10px] md:text-[11px] font-bold px-2 py-1 rounded-full shadow-md z-20">
               Envío Gratis
             </div>
          )}

          {/* Badge de Tiempo */}
          {isAbierto ? (
            <div className="absolute bottom-2 md:bottom-3 right-2 md:right-3 bg-white/95 backdrop-blur-md px-2 py-1 rounded-full shadow-sm text-[10px] md:text-[12px] font-bold text-slate-900 flex items-center gap-1 z-20">
               25-35 min
            </div>
          ) : (
            <div className="absolute inset-0 bg-white/50 backdrop-blur-[2px] flex items-center justify-center z-20">
              <span className="bg-slate-900 text-white text-[10px] md:text-[12px] font-black uppercase tracking-widest px-4 py-2 rounded-full shadow-lg">Cerrado</span>
            </div>
          )}
       </div>
       
       {/* Info Header */}
       <div className="flex flex-col items-start gap-0.5 sm:px-1 flex-1 min-w-0 w-full mt-1 md:mt-2">
          <div className="flex w-full items-center justify-between gap-2">
            <h3 className="font-bold text-[14px] md:text-[16px] text-slate-900 leading-tight group-hover:text-[#1D4ED8] transition-colors truncate">
              {res.nombre}
            </h3>
            <div className="flex items-center gap-1 bg-slate-100/80 px-1.5 py-0.5 rounded-full text-[11px] md:text-[12px] font-bold text-slate-700 shrink-0">
              4.8 <Star size={10} className="fill-slate-700 text-slate-700" />
            </div>
          </div>
          
          <p className={`text-slate-500 text-[11px] md:text-[13px] font-medium truncate w-full flex items-center gap-1.5`}>
            <span>{costoStr}</span>
            {distanceStr && (
              <>
                <span className="text-slate-300">•</span>
                <span>{distanceStr}</span>
              </>
            )}
            {res.categorias && res.categorias.length > 0 && (
              <>
                <span className="text-slate-300">•</span>
                <span>{res.categorias[0]}</span>
              </>
            )}
          </p>
       </div>
    </Link>
  )
}


export function PublicLandingPage() {
  const { isLoaded: isGoogleMapsLoaded } = useLoadScript({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '',
    libraries: LIBRARIES
  });

  const [showOnboarding, setShowOnboarding] = useState(() => !localStorage.getItem('estrella_onboarding_done'))
  const [restaurantes, setRestaurantes] = useState<Restaurante[]>([])
  const [promosGlobales, setPromosGlobales] = useState<(MenuPromocion & { restaurantes: Restaurante })[]>([])
  const [heroBanners, setHeroBanners] = useState<any[]>([])
  const [currentBannerIndex, setCurrentBannerIndex] = useState(0)
  const [activeCategories, setActiveCategories] = useState<{name: string, emoji: string}[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingPromos, setLoadingPromos] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [search, setSearch] = useState("")
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [page, setPage] = useState(0)
  const [hasMore, setHasMore] = useState(true)
  const [activeTab, setActiveTab] = useState<'todos' | 'cerca'>('todos')
  const [isScrolled, setIsScrolled] = useState(false)
  const [showHeader, setShowHeader] = useState(true)
  const [lastScrollY, setLastScrollY] = useState(0)
  const [showNotifications, setShowNotifications] = useState(false)
  const observerTarget = useRef(null)
  
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(() => {
    const saved = sessionStorage.getItem('est_ubicacion')
    return saved ? JSON.parse(saved) : null
  })
  const [userAddress, setUserAddress] = useState<string>(() => sessionStorage.getItem('est_direccion') || '')
  const [locationLoading, setLocationLoading] = useState(false)
  const [currentPromoIndex, setCurrentPromoIndex] = useState(0)
  const [activeOrderId, setActiveOrderId] = useState<string | null>(() => localStorage.getItem('est_active_order'))
  const [activeOrderStatus, setActiveOrderStatus] = useState<string | null>(null)
  const navigate = useNavigate()

  const [activeNavTab, setActiveNavTab] = useState('home')
  const [globalDeliveryType, setGlobalDeliveryType] = useState<'domicilio'|'recoger'>(() => {
    return (sessionStorage.getItem('est_delivery_type') as any) || 'domicilio';
  });
  const [cuponesGlobales, setCuponesGlobales] = useState<any[]>([])

  useEffect(() => {
    const fetchCupones = async () => {
      const { data } = await supabase
        .from('cupones_plataforma')
        .select('*')
        .eq('activo', true)
        .order('created_at', { ascending: false });
      
      if (data) {
        const validCupones = data.filter(c => {
          if (c.fecha_fin && new Date(`${c.fecha_fin}T23:59:59`) < new Date()) return false;
          if (c.uso_maximo && c.usos_actuales >= c.uso_maximo) return false;
          return true;
        });
        setCuponesGlobales(validCupones);
      }
    };
    fetchCupones();
  }, []);
  
  // Prevenir scroll de la página cuando la tab de ubicación está abierta
  useEffect(() => {
    if (activeNavTab === 'location') {
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.width = '100%';
    } else {
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.width = '';
    }
    return () => {
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.width = '';
    };
  }, [activeNavTab]);

  useEffect(() => {
    const checkOrder = () => {
      const storedId = localStorage.getItem('est_active_order');
      if (storedId !== activeOrderId) {
        setActiveOrderId(storedId);
      }
    };
    checkOrder();
    const interval = setInterval(checkOrder, 3000);
    return () => clearInterval(interval);
  }, [activeOrderId]);

  useEffect(() => {
    if (!activeOrderId) {
      setActiveOrderStatus(null);
      return;
    }
    const fetchStatus = async () => {
      const { data } = await supabase.from('pedidos').select('estado').eq('id', activeOrderId).single();
      if (data) setActiveOrderStatus(data.estado);
    };
    fetchStatus();

    const channel = supabase.channel(`landing-tracker-${activeOrderId}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'pedidos', filter: `id=eq.${activeOrderId}` }, (payload) => {
         setActiveOrderStatus(payload.new.estado);
      }).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [activeOrderId]);
  const [favorites, setFavorites] = useState<string[]>(() => {
    const saved = localStorage.getItem('est_favorites')
    return saved ? JSON.parse(saved) : []
  })

  const toggleFavorite = (e: React.MouseEvent, id: string) => {
    e.preventDefault()
    e.stopPropagation()
    setFavorites(prev => {
      const isFav = prev.includes(id)
      const newFavs = isFav ? prev.filter(f => f !== id) : [...prev, id]
      localStorage.setItem('est_favorites', JSON.stringify(newFavs))
      return newFavs
    })
  }

  useEffect(() => {
    if (promosGlobales.length === 0) return;
    const interval = setInterval(() => {
      setCurrentPromoIndex((prev) => (prev + 1) % promosGlobales.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [promosGlobales]);

  const nextPromo = () => setCurrentPromoIndex((prev) => (prev + 1) % promosGlobales.length);
  const prevPromo = () => setCurrentPromoIndex((prev) => (prev - 1 + promosGlobales.length) % promosGlobales.length);

  const PAGE_SIZE = 8

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      setIsScrolled(currentScrollY > 10);
      
      if (currentScrollY > lastScrollY && currentScrollY > 100) {
        // Scrolling down
        setShowHeader(false);
      } else if (currentScrollY < lastScrollY) {
        // Scrolling up
        setShowHeader(true);
      }
      setLastScrollY(currentScrollY);
    };
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [lastScrollY])

  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && hasMore && !loading && !loadingMore) {
          handleLoadMore();
        }
      },
      { threshold: 0.1 }
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => {
      if (observerTarget.current) {
        observer.unobserve(observerTarget.current);
      }
    };
  }, [observerTarget, hasMore, loading, loadingMore, page]);

  useEffect(() => {
    async function loadCats() {
      const { data } = await supabase.from('restaurantes').select('categorias').eq('activo', true)
      if (data) {
        const unique = new Set<string>()
        data.forEach(r => {
          if (r.categorias && Array.isArray(r.categorias)) {
            r.categorias.forEach((c: string) => unique.add(c))
          }
        })
        const catArray = Array.from(unique).sort().map(name => ({
          name,
          emoji: EMOJI_MAP[name] || '🍽️'
        }))
        setActiveCategories(catArray)
      }
    }
    loadCats()
  }, [])

  async function loadRestaurants(pageIndex: number) {
    try {
      if (pageIndex === 0) {
        try {
          const cached = sessionStorage.getItem('cache_restaurantes')
          if (cached) {
            setRestaurantes(JSON.parse(cached))
            setLoading(false)
          } else {
            setLoading(true)
          }
        } catch (e) {
          sessionStorage.removeItem('cache_restaurantes')
          setLoading(true)
        }
      } else {
        setLoadingMore(true)
      }

      let query = supabase
        .from('restaurantes')
        .select('id, nombre, telefono, direccion, foto_fachada_url, hora_apertura, hora_cierre, horarios, categorias, slug, lat, lng')
        .eq('activo', true)
        .is('matriz_id', null)
        .order('nombre')
        .range(pageIndex * PAGE_SIZE, (pageIndex + 1) * PAGE_SIZE - 1)

      const { data, error } = await query.eq('perfil_completo', true)
      let finalData = data;
      if (error && error.code === '42703') { 
          const { data: fallbackData } = await supabase
            .from('restaurantes')
            .select('id, nombre, telefono, direccion, foto_fachada_url, hora_apertura, hora_cierre, horarios, categorias, slug, lat, lng')
            .eq('activo', true)
            .is('matriz_id', null)
            .order('nombre')
            .range(pageIndex * PAGE_SIZE, (pageIndex + 1) * PAGE_SIZE - 1)
          finalData = fallbackData;
      } else if (error) {
         console.error("Error fetching restaurants:", error)
      }
      
      if (finalData) {
        if (finalData.length < PAGE_SIZE) setHasMore(false)
        if (pageIndex === 0) {
          setRestaurantes(finalData)
          sessionStorage.setItem('cache_restaurantes', JSON.stringify(finalData))
        } else {
          setRestaurantes(prev => {
            const newIds = finalData!.map(d => d.id)
            const combined = [...prev.filter(p => !newIds.includes(p.id)), ...finalData!]
            sessionStorage.setItem('cache_restaurantes', JSON.stringify(combined))
            return combined
          })
        }
      }
    } catch (err) {
      console.error("Exception in loadRestaurants:", err)
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }

  async function loadPromos() {
    setLoadingPromos(true)
    const { data } = await supabase
      .from('menu_promociones')
      .select('*, restaurantes(id, nombre, slug, foto_fachada_url)')
      .eq('activa', true)
      
    if (data) {
      const currentDay = ['dom', 'lun', 'mar', 'mie', 'jue', 'vie', 'sab'][new Date().getDay()];
      const validPromos = data.filter(p => {
        if (p.fecha_fin) {
          const endDateStr = p.fecha_fin.includes('T') ? p.fecha_fin : `${p.fecha_fin}T23:59:59`;
          if (new Date(endDateStr) < new Date()) return false;
        }
        if (p.dias_aplicacion && p.dias_aplicacion.length > 0 && !p.dias_aplicacion.includes(currentDay)) {
          return false;
        }
        return true;
      })
      setPromosGlobales(validPromos as any)
    }
    setLoadingPromos(false)
  }

  async function loadBanners() {
    try {
      const { data } = await supabase.from('app_banners').select('*').eq('activo', true).order('orden', { ascending: true }).order('creado_en', { ascending: false }).limit(5);
      if (data) setHeroBanners(data);
    } catch (e) {
      console.error(e);
    }
  }

  useEffect(() => {
    loadRestaurants(0)
    loadPromos()
    loadBanners()
  }, [])

  useEffect(() => {
    if (heroBanners.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentBannerIndex(prev => (prev + 1) % heroBanners.length);
    }, 4500);
    return () => clearInterval(interval);
  }, [heroBanners]);

  // Auto-geocode si hay ubicación pero no hay dirección guardada
  useEffect(() => {
    if (isGoogleMapsLoaded && userLocation && !userAddress && window.google && window.google.maps) {
      const geocoder = new window.google.maps.Geocoder();
      geocoder.geocode({ location: userLocation }, (results, status) => {
        if (status === 'OK' && results && results.length > 0) {
          let colonia = '';
          for (let i = 0; i < results.length; i++) {
            const sublocalityInfo = results[i].address_components.find((c: any) => 
              c.types.includes('sublocality') || c.types.includes('sublocality_level_1') || c.types.includes('neighborhood')
            );
            if (sublocalityInfo) {
              colonia = sublocalityInfo.long_name;
              break;
            }
          }
          if (!colonia) colonia = results[0].formatted_address.split(',')[0];
          setUserAddress(colonia);
          sessionStorage.setItem('est_direccion', colonia);
        }
      });
    }
  }, [isGoogleMapsLoaded, userLocation, userAddress])

  useEffect(() => {
    const channel = supabase
      .channel('public:landing_restaurantes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'restaurantes' }, (payload) => {
        if (payload.eventType === 'UPDATE') {
          const updatedRest = payload.new as Restaurante
          setRestaurantes(prev => {
            if (!updatedRest.activo) {
              return prev.filter(r => r.id !== updatedRest.id)
            }
            const exists = prev.some(r => r.id === updatedRest.id)
            if (exists) {
              return prev.map(r => r.id === updatedRest.id ? { ...r, ...updatedRest } : r)
            }
            return [updatedRest, ...prev]
          })
        } else if (payload.eventType === 'INSERT') {
          const newRest = payload.new as Restaurante
          if (newRest.activo) {
            setRestaurantes(prev => [newRest, ...prev])
          }
        } else if (payload.eventType === 'DELETE') {
          setRestaurantes(prev => prev.filter(r => r.id !== payload.old.id))
        }
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  const handleLoadMore = () => {
    const nextPage = page + 1
    setPage(nextPage)
    loadRestaurants(nextPage)
  }

  const estaAbierto = (res: Restaurante) => {
    const toMinutes = (timeStr: string): number => {
      if (!timeStr) return 0;
      const [h, m] = timeStr.split(':').map(Number)
      return (h || 0) * 60 + (m || 0)
    }
    const nowMinutes = () => {
      const d = new Date()
      return d.getHours() * 60 + d.getMinutes()
    }
    const isOpenRange = (abre: string, cierra: string): boolean => {
      const now = nowMinutes()
      const a = toMinutes(abre)
      const c = toMinutes(cierra)
      if (a <= c) return now >= a && now <= c
      return now >= a || now <= c
    }

    if (res.horarios) {
      const dias = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado']
      const diaString = dias[new Date().getDay()]
      const horarioHoy = res.horarios[diaString as keyof typeof res.horarios]
      if (horarioHoy && horarioHoy.activo) {
        return isOpenRange(horarioHoy.abre, horarioHoy.cierra)
      }
      return false
    }

    if (!res.hora_apertura || !res.hora_cierre) return false;
    return isOpenRange(res.hora_apertura, res.hora_cierre)
  }

  function calculaDistancia(lat1: number, lon1: number, lat2: number, lon2: number) {
    const R = 6371; 
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  const requestLocation = (onComplete?: () => void) => {
    setLocationLoading(true);
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          setUserLocation({ lat, lng });
          sessionStorage.setItem('est_ubicacion', JSON.stringify({ lat, lng }));
          
          // Geocoding to get neighborhood
          if (window.google && window.google.maps) {
            const geocoder = new window.google.maps.Geocoder();
            geocoder.geocode({ location: { lat, lng } }, (results, status) => {
              if (status === 'OK' && results && results.length > 0) {
                let colonia = '';
                for (let i = 0; i < results.length; i++) {
                  const addressComponents = results[i].address_components;
                  const sublocalityInfo = addressComponents.find((c: any) => 
                    c.types.includes('sublocality') || 
                    c.types.includes('sublocality_level_1') || 
                    c.types.includes('neighborhood')
                  );
                  if (sublocalityInfo) {
                    colonia = sublocalityInfo.long_name;
                    break;
                  }
                }
                if (!colonia) {
                  colonia = results[0].formatted_address.split(',')[0];
                }
                setUserAddress(colonia);
                sessionStorage.setItem('est_direccion', colonia);
              }
            });
          }

          setLocationLoading(false);
          if (onComplete) onComplete();
        },
        (err) => {
          console.error("Error obteniendo ubicación:", err);
          alert("No pudimos obtener tu ubicación GPS. Por favor actívala en tu navegador.");
          setLocationLoading(false);
          if (onComplete) onComplete();
        },
        { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
      );
    } else {
      alert("Tu navegador no soporta geolocalización.");
      setLocationLoading(false);
      if (onComplete) onComplete();
    }
  }

  const handleTabClick = (tab: 'todos' | 'cerca') => {
    if (tab === 'cerca' && !userLocation) {
      requestLocation(() => setActiveTab('cerca'));
    } else {
      setActiveTab(tab);
    }
  }

  // Filtrado final
  const displayRestaurants = useMemo(() => {
    let result = [...restaurantes];

    // Helper de normalización
    const normalize = (text: string) => text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

    // Búsqueda de texto
    if (search.trim() !== '') {
      const searchNormalized = normalize(search);
      result = result.filter(r => 
        normalize(r.nombre).includes(searchNormalized) || 
        (r.categorias && r.categorias.some(c => normalize(c).includes(searchNormalized)))
      );
    }

    // Filtro por categoría seleccionada
    if (selectedCategory) {
      const catLower = selectedCategory.toLowerCase();
      const searchTerms = [catLower];
      if (catLower === 'tacos') searchTerms.push('taque');
      if (catLower === 'pizza') searchTerms.push('pizz');
      if (catLower === 'hamburguesas') searchTerms.push('hamburg');
      if (catLower === 'postres') searchTerms.push('dulce', 'helado', 'postre', 'crepa');
      if (catLower === 'saludable') searchTerms.push('ensalada', 'fit', 'sano', 'vegan');
      if (catLower === 'bebidas') searchTerms.push('cafe', 'café', 'jugo', 'licuado', 'frappe');
      if (catLower === 'antojitos') searchTerms.push('mexican', 'torta', 'tamal');

      result = result.filter(r => 
        r.categorias && r.categorias.some(c => 
          searchTerms.some(term => c.toLowerCase().includes(term))
        )
      );
    }
    
    // Tab "Cerca"
    if (activeTab === 'cerca' && userLocation) {
      result = result.filter(r => {
        if (!r.lat || !r.lng) return false;
        const dist = calculaDistancia(userLocation.lat, userLocation.lng, r.lat, r.lng);
        return dist <= 2; // Máximo 2 kilómetros
      });
      
      result.sort((a, b) => {
        const distA = calculaDistancia(userLocation.lat, userLocation.lng, a.lat!, a.lng!);
        const distB = calculaDistancia(userLocation.lat, userLocation.lng, b.lat!, b.lng!);
        return distA - distB;
      });
    } else {
      // Orden por defecto: Abiertos primero
      result.sort((a, b) => {
        const aAbierto = estaAbierto(a) ? 1 : 0;
        const bAbierto = estaAbierto(b) ? 1 : 0;
        return bAbierto - aAbierto;
      });
    }
    
    return result;
  }, [restaurantes, search, selectedCategory, activeTab, userLocation]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans pb-20 selection:bg-blue-100">
      <AnimatePresence>
        {showOnboarding && <OnboardingFlow onComplete={() => setShowOnboarding(false)} />}
      </AnimatePresence>
      {/* Header Pegajoso Premium (Estilo Delivery App) */}
      <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${isScrolled ? 'bg-white shadow-[0_4px_20px_rgba(0,0,0,0.04)]' : 'bg-slate-50'} ${!showHeader ? '-translate-y-full' : 'translate-y-0'} pt-4 md:py-4 px-4 md:px-12 flex flex-col gap-3 md:gap-2 ${activeNavTab === 'location' ? 'max-md:hidden' : ''}`}>
        <div className="max-w-[1400px] mx-auto w-full flex flex-col md:flex-row md:items-center justify-between gap-3 md:gap-8">
           
           {/* Top Row (Address + Action) */}
           <div className="flex justify-between items-center md:w-auto w-full">
              {/* Desktop Logo (Left) */}
              <div className="hidden md:flex items-center gap-2 mr-2 cursor-pointer" onClick={() => window.scrollTo(0,0)}>
                 <img src="/estrella-circle.png" alt="Estrella Eats" className="w-10 h-10 object-contain" />
                 <span className="text-xl font-black text-slate-900 tracking-tighter hidden lg:block">
                   Estrella<span className="text-[#1D4ED8]">Eats</span>
                 </span>
              </div>

              {/* Delivery Toggle Desktop */}
              <div className="hidden lg:flex items-center bg-slate-100 rounded-full p-1 mr-4">
                 <button 
                   onClick={() => {
                     setGlobalDeliveryType('domicilio');
                     sessionStorage.setItem('est_delivery_type', 'domicilio');
                   }}
                   className={`px-4 py-1.5 rounded-full text-[13px] font-bold transition-all ${globalDeliveryType === 'domicilio' ? 'bg-white shadow-[0_2px_8px_rgba(0,0,0,0.08)] text-black' : 'text-slate-500 hover:text-slate-800'}`}
                 >
                   Entrega
                 </button>
                 <button 
                   onClick={() => {
                     setGlobalDeliveryType('recoger');
                     sessionStorage.setItem('est_delivery_type', 'recoger');
                   }}
                   className={`px-4 py-1.5 rounded-full text-[13px] font-bold transition-all ${globalDeliveryType === 'recoger' ? 'bg-white shadow-[0_2px_8px_rgba(0,0,0,0.08)] text-black' : 'text-slate-500 hover:text-slate-800'}`}
                 >
                   Para llevar
                 </button>
              </div>

              {/* Address Picker Premium */}
              <div className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity bg-white md:bg-transparent pl-1.5 pr-4 py-1.5 md:p-0 rounded-full md:rounded-none shadow-sm md:shadow-none border border-slate-100 md:border-transparent flex-1 md:flex-none" onClick={() => requestLocation()}>
                 <div className="w-9 h-9 rounded-full bg-slate-100 md:bg-transparent md:w-auto md:h-auto flex items-center justify-center shrink-0">
                    <MapPin size={18} strokeWidth={2.5} className="text-[#1D4ED8] md:text-slate-800"/>
                 </div>
                 <div className="flex flex-col min-w-0">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-[1px] md:hidden">Entregar en</span>
                    <div className="flex items-center gap-1">
                       <span className="font-bold text-slate-800 text-[13px] md:text-[15px] md:underline md:underline-offset-4 decoration-2 truncate max-w-[180px] md:max-w-[250px] leading-none">
                         {locationLoading ? "Buscando..." : (userAddress ? userAddress.split(',')[0] : (userLocation ? "Ubicación actual" : "Comitán de Domínguez"))}
                       </span>
                       {locationLoading ? <Loader2 size={13} className="animate-spin text-[#1D4ED8] shrink-0"/> : <span className="hidden md:flex text-slate-800 text-[13px] font-bold ml-1">• Ahora <ChevronDown size={14} strokeWidth={3} className="text-slate-800 shrink-0 ml-0.5"/></span>}
                    </div>
                 </div>
              </div>

              {/* Mobile Notification Bell (Right) */}
              <div className="relative">
                 <div 
                   className="w-11 h-11 flex md:hidden items-center justify-center bg-white rounded-full shadow-sm border border-slate-100 ml-3 shrink-0 relative cursor-pointer"
                   onClick={() => setShowNotifications(!showNotifications)}
                 >
                    <Bell size={20} className="text-slate-700" />
                    <div className="absolute top-2.5 right-2.5 w-2.5 h-2.5 bg-[#1D4ED8] rounded-full border-2 border-white"></div>
                 </div>

                 {/* Notifications Dropdown */}
                 <AnimatePresence>
                   {showNotifications && (
                     <motion.div 
                       initial={{ opacity: 0, y: 10, scale: 0.95 }}
                       animate={{ opacity: 1, y: 0, scale: 1 }}
                       exit={{ opacity: 0, y: 10, scale: 0.95 }}
                       className="absolute top-[52px] right-0 w-[280px] bg-white rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.12)] border border-slate-100 overflow-hidden z-50 origin-top-right md:hidden"
                     >
                       <div className="p-4 border-b border-slate-50 bg-slate-50/50">
                         <h3 className="font-bold text-slate-800">Notificaciones</h3>
                       </div>
                       <div className="p-5 flex flex-col items-center justify-center text-center gap-2">
                         {activeOrderId ? (
                           (() => {
                             let NotifIcon = Package;
                             let statusTitle = 'Tienes un pedido activo';
                             let statusDesc = 'Tu pedido está siendo procesado.';
                             let colorClass = 'text-emerald-500';
                             let bgClass = 'bg-emerald-50';

                             if (['pendiente', 'pagado', 'asignado'].includes(activeOrderStatus || '')) {
                               NotifIcon = Clock;
                               statusTitle = 'Pedido Confirmado';
                               statusDesc = 'El restaurante ha recibido tu orden.';
                               colorClass = 'text-emerald-500';
                               bgClass = 'bg-emerald-50';
                             } else if (['en_cocina', 'listo_para_recoger', 'recibido', 'preparando'].includes(activeOrderStatus || '')) {
                               NotifIcon = ChefHat;
                               statusTitle = 'Preparando Orden';
                               statusDesc = 'El restaurante está cocinando tu comida.';
                               colorClass = 'text-[#1D4ED8]';
                               bgClass = 'bg-blue-50';
                             } else if (activeOrderStatus === 'en_camino') {
                               NotifIcon = Truck;
                               statusTitle = '¡Va en camino!';
                               statusDesc = 'Tu repartidor se dirige hacia ti.';
                               colorClass = 'text-blue-500';
                               bgClass = 'bg-blue-50';
                             }

                             return (
                               <>
                                 <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-1 ${bgClass}`}>
                                   <NotifIcon size={24} className={colorClass} />
                                 </div>
                                 <p className="text-[13px] font-bold text-slate-800">{statusTitle}</p>
                                 <p className="text-[12px] text-slate-500 leading-relaxed">{statusDesc}</p>
                                 <button 
                                   onClick={() => navigate(`/success?pedido=${activeOrderId}`)}
                                   className="mt-3 w-full py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-bold text-sm shadow-md shadow-emerald-200 transition-colors"
                                 >
                                   Seguir Pedido
                                 </button>
                               </>
                             );
                           })()
                         ) : cuponesGlobales.length > 0 ? (
                            <div className="flex flex-col gap-2 w-full text-left">
                              <p className="text-[13px] font-bold text-slate-700 mb-1 text-center">Promociones para ti</p>
                              {cuponesGlobales.map(cupon => (
                                <div 
                                  key={cupon.id} 
                                  onClick={() => {
                                    navigator.clipboard.writeText(cupon.codigo);
                                  }}
                                  className="bg-orange-50/50 hover:bg-orange-50 transition-colors rounded-xl p-3 border border-orange-100 flex flex-col items-start relative overflow-hidden cursor-pointer group"
                                >
                                  <div className="absolute -right-3 -bottom-3 opacity-[0.07] text-orange-600 group-hover:scale-110 group-hover:-rotate-12 transition-transform duration-300">
                                    <Ticket size={56} />
                                  </div>
                                  <div className="flex items-center gap-1.5 mb-1 relative z-10">
                                    <Ticket size={14} className="text-orange-500" />
                                    <span className="font-black text-orange-600 tracking-tight text-[13px]">{cupon.codigo}</span>
                                  </div>
                                  <p className="text-[12px] font-bold text-slate-700 relative z-10">
                                    {cupon.tipo === 'porcentaje' ? `${cupon.valor}% de descuento en tu pedido` : 
                                     cupon.tipo === 'envio_fijo' ? `Costo de envío especial a $${cupon.valor}` : 
                                     `$${cupon.valor} MXN de descuento en tu pedido`}
                                  </p>
                                  <p className="text-[10px] text-slate-500 mt-1 relative z-10 font-medium">
                                    {cupon.descripcion || 'Toca para copiar este código'}
                                  </p>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <>
                              <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mb-1">
                                <Bell size={24} className="text-slate-400 opacity-50" />
                              </div>
                              <p className="text-[13px] font-bold text-slate-700">No hay notificaciones nuevas</p>
                              <p className="text-[12px] text-slate-500 leading-relaxed">Aquí te avisaremos sobre el estado de tus pedidos y promociones exclusivas.</p>
                            </>
                         )}
                       </div>
                       <div className="p-3 bg-slate-50 border-t border-slate-100">
                         <button 
                           onClick={() => setShowNotifications(false)}
                           className="w-full py-2 bg-white rounded-xl text-[13px] font-bold text-slate-700 border border-slate-200 active:bg-slate-50"
                         >
                           Cerrar
                         </button>
                       </div>
                     </motion.div>
                   )}
                 </AnimatePresence>
              </div>
           </div>
           
           {/* Barra de Búsqueda Premium */}
           <div className={`relative group flex-1 w-full md:max-w-2xl flex items-center gap-2 ${activeNavTab === 'search' ? 'hidden' : 'flex'}`}>
              <div className="relative flex-1">
                 <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                   <Search className="text-slate-400 group-focus-within:text-[#1D4ED8] transition-colors" size={18} strokeWidth={2.5} />
                 </div>
                 <input 
                   type="text" 
                   placeholder="Restaurantes, platillos, antojos..."
                   className="w-full bg-white hover:bg-slate-50 focus:bg-white border border-slate-100 focus:border-[#1D4ED8] rounded-full py-3 pl-12 pr-4 text-[14px] md:text-[15px] font-medium text-slate-900 placeholder:text-slate-400 outline-none transition-all shadow-[0_2px_12px_rgba(0,0,0,0.03)]"
                   value={search}
                   onChange={(e) => setSearch(e.target.value)}
                 />
              </div>
              
              {/* Botón Beneficios (Desktop) */}
              <Link 
                to="/beneficios" 
                className="hidden md:flex h-12 items-center gap-2 px-6 bg-gradient-to-r from-[#1D4ED8] to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-full font-bold shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all"
              >
                <Star size={18} className="fill-white" />
                <span>Beneficios VIP</span>
              </Link>

              {/* Botón Beneficios (Mobile) */}
              <Link 
                to="/beneficios" 
                className="w-12 h-12 shrink-0 bg-gradient-to-r from-[#1D4ED8] to-blue-700 rounded-full flex items-center justify-center shadow-[0_2px_12px_rgba(0,0,0,0.03)] text-white hover:-translate-y-0.5 transition-all md:hidden"
              >
                <Star size={20} className="fill-white" />
              </Link>

              <button className="w-12 h-12 shrink-0 bg-white rounded-full flex items-center justify-center border border-slate-100 shadow-[0_2px_12px_rgba(0,0,0,0.03)] text-slate-600 hover:border-[#1D4ED8] hover:text-[#1D4ED8] transition-colors md:hidden">
                 <SlidersHorizontal size={20} strokeWidth={2.5} />
              </button>
           </div>

           {/* Desktop Action Buttons (Login, Cart) */}
           <div className="hidden md:flex items-center gap-3 shrink-0">
              <button 
                onClick={() => navigate('/cart')} 
                className="h-12 px-6 flex items-center gap-2 bg-[#1D4ED8] hover:bg-blue-700 text-white rounded-full font-bold transition-colors shadow-md hover:shadow-lg hover:-translate-y-0.5"
              >
                <ShoppingCart size={18} className="fill-white" />
                <span>Carrito</span>
              </button>
           </div>
        </div>
      </header>

      <main className="pt-[140px] md:pt-32 max-w-[1400px] mx-auto px-4 md:px-12">
        <div className="md:grid md:grid-cols-[220px_1fr] md:gap-8 md:mt-4 items-start">
           
           {/* Desktop Sidebar */}
           <div className="hidden md:flex flex-col sticky top-[100px] gap-6 pr-4 max-h-[calc(100vh-120px)] overflow-y-auto pb-10 custom-scrollbar">
              <div className="flex flex-col gap-1">
                 <h2 className="text-[18px] font-black tracking-tight mb-2 px-2">Categorías</h2>
                 <button 
                   onClick={() => setSelectedCategory(null)}
                   className={`flex items-center gap-3 w-full p-2.5 rounded-xl font-bold text-[15px] transition-colors ${!selectedCategory ? 'bg-slate-100 text-black' : 'text-slate-600 hover:bg-slate-50'}`}
                 >
                   <span className="w-8 h-8 flex items-center justify-center bg-white rounded-full shadow-sm text-lg">🏠</span>
                   Inicio
                 </button>
                 {activeCategories.map(c => (
                   <button 
                     key={c.name}
                     onClick={() => setSelectedCategory(c.name)}
                     className={`flex items-center gap-3 w-full p-2.5 rounded-xl font-bold text-[15px] transition-colors ${selectedCategory === c.name ? 'bg-slate-100 text-black' : 'text-slate-600 hover:bg-slate-50'}`}
                   >
                     <span className="w-8 h-8 flex items-center justify-center bg-white rounded-full shadow-sm text-lg">{c.emoji}</span>
                     {c.name}
                   </button>
                 ))}
              </div>
           </div>

           {/* Main Content Column */}
           <div className="w-full min-w-0">
        
        {/* Banner/Hero Space */}
        {heroBanners.length > 0 && (
          <div className="relative mb-6 w-full rounded-[24px] overflow-hidden shadow-lg shadow-blue-900/10 bg-slate-100">
            <div 
              className="flex w-full transition-transform duration-700 ease-in-out"
              style={{ transform: `translateX(-${currentBannerIndex * 100}%)` }}
            >
              {heroBanners.map((banner, idx) => {
                const isDyn = banner.imagen_url === 'dynamic-gradient';
                const isActive = idx === currentBannerIndex;
                
                return (
                  <div 
                    key={banner.id}
                    onClick={() => {
                       const url = banner.link_url;
                       if (url) {
                         if (url.startsWith('http')) window.location.href = url;
                         else navigate(url);
                       }
                    }}
                    className={`w-full shrink-0 relative flex justify-center ${banner.link_url ? 'cursor-pointer' : ''}`}
                  >
                     {!isDyn ? (
                       <img 
                         src={banner.imagen_url} 
                         alt={banner.titulo || "Promoción"} 
                         className="w-full h-auto max-h-[200px] md:max-h-[320px] lg:max-h-[360px] object-contain block"
                       />
                     ) : (
                       <div className="w-full aspect-[21/9] bg-gradient-to-br from-indigo-500 via-purple-600 to-blue-700 p-6 md:p-10 flex items-center justify-center relative">
                         <div className={`relative z-10 w-full text-center transition-all duration-700 ${isActive ? 'scale-100 opacity-100' : 'scale-95 opacity-50'}`}>
                           <h2 className="text-white text-xl md:text-3xl font-black mb-1 md:mb-2 leading-tight drop-shadow-md" dangerouslySetInnerHTML={{ __html: banner.titulo.replace(/\n/g, '<br/>') }}></h2>
                           {banner.subtitulo && <p className="text-blue-100 text-[12px] md:text-sm font-medium drop-shadow-md">{banner.subtitulo}</p>}
                         </div>
                         <div className="absolute inset-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-30 mix-blend-overlay pointer-events-none"></div>
                       </div>
                     )}
                  </div>
                );
              })}
            </div>
            
            {/* Carousel Indicators */}
            {heroBanners.length > 1 && (
              <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-2 z-20 pointer-events-none">
                {heroBanners.map((_, idx) => (
                  <div 
                    key={idx} 
                    className={`h-2 rounded-full transition-all duration-500 ${idx === currentBannerIndex ? 'bg-white w-6 opacity-100 shadow-md' : 'bg-white/50 w-2 opacity-60'}`}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Carrusel de Categorías (Móvil) */}
        <div className="md:hidden -mx-4 px-4 mb-6">
          <div className="flex overflow-x-auto gap-2.5 md:gap-4 pb-4 pt-2 no-scrollbar max-w-[1400px] mx-auto">
            {activeCategories.map(c => (
               <button 
                  key={c.name}
                  onClick={() => setSelectedCategory(selectedCategory === c.name ? null : c.name)} 
                  className="flex flex-col items-center gap-1.5 md:gap-2 min-w-[64px] md:min-w-[80px] group"
                >
                  <div className={`w-14 h-14 md:w-16 md:h-16 rounded-[14px] md:rounded-2xl flex items-center justify-center text-[28px] md:text-[32px] shadow-[0_2px_10px_rgba(0,0,0,0.04)] border transition-all duration-300 ${selectedCategory === c.name ? 'bg-blue-50 border-[#1D4ED8] scale-105' : 'bg-white border-slate-100 group-hover:border-blue-200 group-hover:scale-105'}`}>
                    {c.emoji}
                  </div>
                  <span className={`text-[11px] md:text-[12px] font-bold ${selectedCategory === c.name ? 'text-[#1D4ED8]' : 'text-slate-600'}`}>{c.name}</span>
               </button>
            ))}
          </div>
        </div>

        {/* Carrusel de Promociones Animado (Si existen) */}
        {!loadingPromos && promosGlobales.length > 0 && (
          <div className="mt-8 md:mt-10 mb-2">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">Ofertas para ti</h2>
              <div className="flex items-center gap-4">
                {/* Indicadores */}
                <div className="hidden sm:flex gap-1.5">
                  {promosGlobales.map((_, i) => (
                    <div key={i} className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${i === currentPromoIndex ? 'bg-[#1D4ED8] w-4' : 'bg-slate-300'}`} />
                  ))}
                </div>
                {/* Flechas */}
                <div className="flex items-center gap-2">
                  <button onClick={prevPromo} className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-blue-50 hover:text-[#1D4ED8] transition-colors">
                    <ChevronLeft size={18} />
                  </button>
                  <button onClick={nextPromo} className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-blue-50 hover:text-[#1D4ED8] transition-colors">
                    <ChevronRight size={18} />
                  </button>
                </div>
              </div>
            </div>
            
            <div className="relative w-full h-[110px] md:h-[130px]">
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentPromoIndex}
                  initial={{ opacity: 0, x: 20, filter: 'blur(2px)' }}
                  animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
                  exit={{ opacity: 0, x: -20, filter: 'blur(2px)' }}
                  transition={{ duration: 0.25, ease: "easeOut" }}
                  className="absolute inset-0"
                  drag="x"
                  dragConstraints={{ left: 0, right: 0 }}
                  dragElastic={0.2}
                  onDragEnd={(_, { offset }) => {
                    if (offset.x < -50) {
                      nextPromo();
                    } else if (offset.x > 50) {
                      prevPromo();
                    }
                  }}
                >
                  {(() => {
                    const promo = promosGlobales[currentPromoIndex];
                    return (
                      <Link 
                        to={`/menu/${promo.restaurantes.slug || promo.restaurantes.id}?tab=promos`} 
                        className="w-full h-full bg-white rounded-[20px] p-3 md:p-4 flex gap-4 md:gap-6 shadow-[0_4px_20px_rgba(0,0,0,0.03)] border border-slate-100 hover:border-blue-200 transition-colors group"
                      >
                        <div className="w-[86px] h-[86px] md:w-[98px] md:h-[98px] rounded-[14px] overflow-hidden bg-slate-50 shrink-0 relative shadow-sm">
                           {promo.foto_url ? (
                             <img src={promo.foto_url} loading="lazy" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" alt={promo.titulo} />
                           ) : (
                             <div className="w-full h-full flex items-center justify-center bg-blue-50 text-[#1D4ED8]"><Ticket size={24} /></div>
                           )}
                           <div className="absolute top-1.5 left-1.5 bg-[#1D4ED8] text-white text-[9px] font-black uppercase px-2 py-0.5 rounded shadow-sm">
                             Promo
                           </div>
                        </div>
                        <div className="flex-1 py-1 flex flex-col justify-center min-w-0">
                           <p className="text-[10px] md:text-[11px] font-bold text-slate-400 mb-1 flex items-center gap-1 uppercase tracking-wider truncate">
                             <Store size={10}/> {promo.restaurantes?.nombre}
                           </p>
                           <h4 className="font-black text-slate-900 text-[15px] md:text-[18px] leading-tight mb-1 md:mb-2 line-clamp-2">{promo.titulo}</h4>
                           <div className="mt-auto">
                             <span className="text-[#1D4ED8] font-black text-[16px] md:text-[20px] tracking-tight">${promo.precio_especial?.toFixed(2)}</span>
                           </div>
                        </div>
                        <div className="hidden sm:flex shrink-0 items-center justify-center pr-2">
                           <button 
                             onClick={(e) => { e.preventDefault(); e.stopPropagation(); nextPromo(); }}
                             className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 hover:bg-blue-50 hover:text-[#1D4ED8] transition-colors z-10 relative"
                           >
                              <ChevronRight size={20} />
                           </button>
                        </div>
                      </Link>
                    )
                  })()}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        )}

        {/* Toggles de Sección */}
        <div className="mt-8 md:mt-10 mb-6 flex items-center gap-6 border-b border-slate-200">
           <button 
             onClick={() => setActiveTab('todos')} 
             className={`pb-3 text-[17px] font-bold border-b-2 transition-colors relative top-[1px] ${activeTab === 'todos' ? 'border-slate-900 text-slate-900' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
           >
             Nuestra Selección
           </button>
           <button 
             onClick={() => handleTabClick('cerca')} 
             className={`pb-3 text-[17px] font-bold border-b-2 transition-colors relative top-[1px] flex items-center gap-2 ${activeTab === 'cerca' ? 'border-slate-900 text-slate-900' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
           >
             {locationLoading ? <Loader2 className="animate-spin" size={16}/> : null} Cerca de mí
           </button>
        </div>

        {/* Grid de Restaurantes */}
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-6 mt-4 md:mt-6">
            {[1,2,3,4,5,6,7,8,9,10].map(i => (
              <RestaurantCardSkeleton key={i} />
            ))}
          </div>
        ) : displayRestaurants.length === 0 ? (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center pt-8 pb-16 sm:py-24 bg-white rounded-[32px] border border-slate-100 shadow-[0_2px_20px_rgba(0,0,0,0.02)] mt-0 sm:mt-6 px-4 relative z-10"
          >
            <h3 className="text-2xl sm:text-3xl font-black text-slate-800 tracking-tight">¡Uy, qué vacío!</h3>
            <p className="text-slate-500 mt-3 text-[14px] sm:text-[16px] max-w-sm sm:max-w-md mx-auto leading-relaxed">
              No encontramos restaurantes con este filtro. Pero no te quedes con hambre, tenemos muchísimas opciones deliciosas para ti.
            </p>
            <button 
              onClick={() => { setSearch(''); setSelectedCategory(null); }}
              className="mt-8 px-8 py-3.5 bg-[#FA4A0C] text-white font-black text-[14px] sm:text-[15px] tracking-wide uppercase rounded-full hover:bg-[#ff551b] shadow-lg shadow-orange-500/30 transition-all hover:scale-105 active:scale-95"
            >
              Ver todos los restaurantes
            </button>
          </motion.div>
        ) : (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="flex flex-col gap-10 mt-4 md:mt-6 pb-12"
          >
            
            {/* Sección: Favoritos */}
            {favorites.length > 0 && !search && !selectedCategory && activeTab === 'todos' && (
              <section>
                <h2 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight mb-4 px-2">Tus Favoritos ❤️</h2>
                <div className="flex overflow-x-auto gap-4 pb-4 px-2 no-scrollbar snap-x">
                  {displayRestaurants.filter(r => favorites.includes(r.id)).map(res => (
                    <motion.div key={res.id} whileInView={{ opacity: 1, x: 0 }} initial={{ opacity: 0, x: 20 }} viewport={{ once: true }} className="snap-start shrink-0 w-[140px] sm:w-[180px]">
                      <RestaurantCard res={res} isFav={favorites.includes(res.id)} toggleFav={toggleFavorite} userLocation={userLocation} estaAbierto={estaAbierto} calculaDistancia={calculaDistancia} horizontal globalDeliveryType={globalDeliveryType} />
                    </motion.div>
                  ))}
                </div>
              </section>
            )}

            {/* Sección: Populares (Simulado) */}
            {!search && !selectedCategory && activeTab === 'todos' && displayRestaurants.length > 4 && (
              <section>
                <h2 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight mb-4 px-2">Populares 🔥</h2>
                <div className="flex overflow-x-auto gap-4 pb-4 px-2 no-scrollbar snap-x">
                  {displayRestaurants.slice(0, 8).map(res => (
                    <motion.div key={res.id} whileInView={{ opacity: 1, x: 0 }} initial={{ opacity: 0, x: 20 }} viewport={{ once: true }} className="snap-start shrink-0 w-[140px] sm:w-[180px]">
                      <RestaurantCard res={res} isFav={favorites.includes(res.id)} toggleFav={toggleFavorite} userLocation={userLocation} estaAbierto={estaAbierto} calculaDistancia={calculaDistancia} horizontal globalDeliveryType={globalDeliveryType} />
                    </motion.div>
                  ))}
                </div>
              </section>
            )}

            {/* Sección: Todos los Restaurantes */}
            <section>
              {(!search && !selectedCategory && activeTab === 'todos') && (
                <h2 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight mb-4 px-2">Todos los Restaurantes</h2>
              )}
              <motion.div 
                key={selectedCategory || search || activeTab}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, ease: "easeOut" }}
                className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 md:gap-6"
              >
                {displayRestaurants.map(res => (
                  <motion.div key={res.id} whileInView={{ opacity: 1, y: 0 }} initial={{ opacity: 0, y: 20 }} viewport={{ once: true, margin: "0px 0px -50px 0px" }}>
                    <RestaurantCard res={res} isFav={favorites.includes(res.id)} toggleFav={toggleFavorite} userLocation={userLocation} estaAbierto={estaAbierto} calculaDistancia={calculaDistancia} globalDeliveryType={globalDeliveryType} />
                  </motion.div>
                ))}
              </motion.div>
            </section>

          </motion.div>
        )}

        {/* Cargar más e Infinite Scroll */}
        {hasMore && !loading && displayRestaurants.length > 0 && (
          <div className="flex justify-center mt-8 pb-20" ref={observerTarget}>
            {loadingMore ? (
              <div className="flex flex-col items-center gap-2">
                <Loader2 size={24} className="animate-spin text-orange-500" />
                <span className="text-sm font-bold text-slate-500">Cargando más deliciosas opciones...</span>
              </div>
            ) : null}
          </div>
        )}
           </div>
        </div>
      </main>

      {/* Footer Minimalista */}
      <footer className="bg-white border-t border-slate-100 py-12 px-6">
        <div className="max-w-[1400px] mx-auto text-center">
          <div className="flex items-center gap-2 mb-4 justify-center">
            <span className="text-xl font-black text-slate-900 tracking-tighter">
              Estrella<span className="text-[#FA4A0C]">Eats</span>
            </span>
          </div>
          
          <div className="mt-6 mb-6 flex justify-center">
            <img src="/estrella-circle.png" alt="Sello Estrella" className="w-24 h-24 object-contain" />
          </div>

          <div className="flex items-center justify-center gap-4 text-sm font-medium text-slate-500 mb-6">
            <Link to="/terminos" className="hover:text-orange-500 transition-colors">Términos y Condiciones</Link>
            <span>•</span>
            <Link to="/privacidad" className="hover:text-orange-500 transition-colors">Aviso de Privacidad</Link>
          </div>

          <div className="text-sm text-slate-400 font-medium">
            © {new Date().getFullYear()} Estrella Eats • Comitán de Domínguez
          </div>
        </div>
      </footer>

      {/* ── VISTA MAPA (tab Ubicación, solo móvil) ── */}
      <AnimatePresence>
        {activeNavTab === 'location' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.2 }}
            className="md:hidden fixed inset-0 z-30 bg-slate-100 origin-bottom"
          >
            {/* Mapa — ocupa TODA la pantalla */}
            <div className="absolute inset-0">
              {isGoogleMapsLoaded ? (
                <GoogleMap
                  mapContainerStyle={{ width: '100%', height: '100%' }}
                  zoom={14}
                  center={userLocation || { lat: 16.2516, lng: -92.1332 }}
                  options={{ disableDefaultUI: true, gestureHandling: 'greedy', styles: MAP_STYLES }}
                >
                  {restaurantes.filter(r => r.lat && r.lng).map(res => (
                    <OverlayView key={res.id} position={{ lat: Number(res.lat), lng: Number(res.lng) }} mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}>
                      <Link to={`/menu/${res.slug || res.id}`} className="absolute -translate-x-1/2 -translate-y-full flex flex-col items-center">
                        <div className="w-9 h-9 rounded-full border-2 border-white shadow-lg overflow-hidden bg-white">
                          {res.foto_fachada_url
                            ? <img src={res.foto_fachada_url} className="w-full h-full object-cover" alt={res.nombre} />
                            : <div className="w-full h-full bg-red-500 flex items-center justify-center"><Store size={13} className="text-white" /></div>
                          }
                        </div>
                        <div className="w-1.5 h-1.5 bg-slate-800 rounded-full mt-0.5 shadow" />
                      </Link>
                    </OverlayView>
                  ))}
                  {userLocation && (
                    <OverlayView position={userLocation} mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}>
                      <div className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-none">
                        <div className="w-4 h-4 bg-blue-600 rounded-full border-2 border-white shadow-lg" />
                        <div className="absolute inset-0 bg-blue-400 rounded-full animate-ping opacity-40" />
                      </div>
                    </OverlayView>
                  )}
                </GoogleMap>
              ) : (
                <div className="w-full h-full flex items-center justify-center"><Loader2 size={32} className="animate-spin text-slate-400" /></div>
              )}
            </div>

            {/* Botón GPS */}
            <button onClick={() => requestLocation()} className="absolute right-4 top-36 z-10 w-11 h-11 bg-white rounded-full shadow-lg border border-slate-100 flex items-center justify-center active:scale-95 transition-transform">
              {locationLoading ? <Loader2 size={17} className="animate-spin text-blue-600" /> : <MapPin size={17} className="text-slate-700" />}
            </button>

            {/* Bottom Sheet draggable */}
            <MapBottomSheet
              nearbyRestaurants={(userLocation
                ? [...restaurantes.filter(r => r.lat && r.lng)].sort((a, b) =>
                    calculaDistancia(userLocation.lat, userLocation.lng, Number(a.lat), Number(a.lng)) -
                    calculaDistancia(userLocation.lat, userLocation.lng, Number(b.lat), Number(b.lng))
                  )
                : restaurantes
              ).slice(0, 10)}
              estaAbierto={estaAbierto}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── VISTA BÚSQUEDA (tab Buscar, solo móvil) ── */}
      <AnimatePresence>
        {activeNavTab === 'search' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.2 }}
            className="md:hidden fixed inset-0 z-30 origin-bottom"
          >
            <SearchView restaurantes={restaurantes} estaAbierto={estaAbierto} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom Nav Flotante importado */}
      <BottomNav 
        activeNavTab={activeNavTab} 
        setActiveNavTab={setActiveNavTab} 
        activeOrderId={activeOrderId} 
      />
    </div>
  )
}
