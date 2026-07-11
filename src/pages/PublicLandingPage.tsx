import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../lib/supabase'
import type { MenuPromocion } from '../lib/supabase'
import { Store, Search, MapPin, Clock, Ticket, Loader2, Star, ChevronRight, ChevronLeft, Heart, ChevronDown, Bell, SlidersHorizontal, Package, ChefHat, Truck } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useLoadScript } from '@react-google-maps/api';

const LIBRARIES: ("places" | "geometry" | "drawing" | "visualization")[] = ["places"];
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

const EMOJI_MAP: Record<string, string> = {
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

function RestaurantCard({ res, isFav, toggleFav, userLocation, estaAbierto, calculaDistancia, horizontal = false }: any) {
  const isAbierto = estaAbierto(res);
  let distanceStr = '';
  let costoStr = 'Envío: $45';
  
  if (userLocation && res.lat && res.lng) {
    const dist = calculaDistancia(userLocation.lat, userLocation.lng, res.lat, res.lng);
    distanceStr = dist < 1 ? '< 1 km' : `${dist.toFixed(1)} km`;
    if (dist <= 1.5) {
      costoStr = 'Envío Gratis 🏍️';
    } else {
      const calcCost = Math.round(15 + (dist * 10));
      costoStr = `Envío: $${calcCost}`;
    }
  }

  return (
    <Link to={`/menu/${res.slug || res.id}`} className={`flex flex-col group relative bg-white sm:bg-transparent rounded-2xl sm:rounded-none shadow-[0_2px_12px_rgba(0,0,0,0.03)] sm:shadow-none border border-slate-100 sm:border-none p-3 sm:p-0 gap-2 sm:gap-0`}>
       {/* Imagen Circular */}
       <div className={`relative mx-auto shrink-0 aspect-square rounded-full overflow-hidden bg-white sm:mb-3 shadow-sm border border-slate-100 isolate ${horizontal ? 'w-[100px]' : 'w-[90px] sm:w-[160px] md:w-[180px]'}`}>
          {res.foto_fachada_url ? (
            <img 
              src={res.foto_fachada_url} 
              loading="lazy" 
              className="relative w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out z-10" 
              alt={res.nombre} 
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-orange-50"><Store size={24} className="text-orange-200 sm:w-10 sm:h-10" /></div>
          )}
          
          <button 
            onClick={(e) => toggleFav(e, res.id)}
            className="absolute top-2 right-2 md:top-3 md:right-3 w-8 h-8 bg-white/90 backdrop-blur-md rounded-full shadow-md flex items-center justify-center z-30 transition-transform active:scale-90 hover:scale-110"
          >
            <Heart size={16} className={`${isFav ? 'fill-red-500 text-red-500' : 'text-slate-400'}`} />
          </button>

          {/* Badge de Tiempo */}
          {isAbierto && (
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-white/95 backdrop-blur-md px-2 py-1 rounded-full shadow-sm text-[9px] sm:text-[11px] font-bold text-slate-900 flex items-center gap-1 z-20 whitespace-nowrap">
               <Clock size={10} strokeWidth={3} className="text-[#FA4A0C]"/> 25-35 min
            </div>
          )}

          {/* Overlay Cerrado */}
          {!isAbierto && (
             <div className="absolute inset-0 bg-white/50 backdrop-blur-[2px] flex items-center justify-center z-20">
                <span className="bg-slate-900 text-white text-[8px] sm:text-[11px] font-black uppercase tracking-[0.1em] sm:tracking-[0.15em] px-2 py-1 sm:px-4 sm:py-2 rounded-full shadow-lg">Cerrado</span>
             </div>
          )}
       </div>
       
       {/* Info Header */}
       <div className={`flex flex-col items-center sm:items-center gap-1 sm:px-1 flex-1 min-w-0 text-center w-full ${horizontal ? 'mt-0' : 'mt-1 sm:mt-0'}`}>
          <div className="min-w-0 w-full flex flex-col items-center">
             <h3 className="font-bold text-[13px] sm:text-[15px] md:text-[16px] text-slate-900 leading-tight group-hover:text-[#FA4A0C] transition-colors truncate w-full px-2">
               {res.nombre}
             </h3>
             <p className={`text-slate-500 text-[10px] sm:text-[12px] font-medium mt-0.5 truncate w-full px-2 ${costoStr.includes('Gratis') ? 'text-green-600' : ''}`}>
               {res.categorias?.[0] || 'Restaurante'} • {costoStr} {distanceStr && `(${distanceStr})`}
             </p>
          </div>
          {/* Fake Rating */}
          <div className="bg-slate-50 border border-slate-100 flex items-center justify-center px-2 py-0.5 rounded-full text-[10px] sm:text-[11px] font-black text-slate-700 shrink-0 gap-1 mt-0.5">
            4.8 <Star size={10} className="fill-orange-400 text-orange-400" />
          </div>
       </div>
    </Link>
  )
}


export function PublicLandingPage() {
  const { isLoaded: isGoogleMapsLoaded } = useLoadScript({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '',
    libraries: LIBRARIES
  });

  const [restaurantes, setRestaurantes] = useState<Restaurante[]>([])
  const [promosGlobales, setPromosGlobales] = useState<(MenuPromocion & { restaurantes: Restaurante })[]>([])
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
  const [showNotifications, setShowNotifications] = useState(false)
  
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
    const handleScroll = () => setIsScrolled(window.scrollY > 10)
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

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
        .order('nombre')
        .range(pageIndex * PAGE_SIZE, (pageIndex + 1) * PAGE_SIZE - 1)

      const { data, error } = await query.eq('perfil_completo', true)
      let finalData = data;
      if (error && error.code === '42703') { 
          const { data: fallbackData } = await supabase
            .from('restaurantes')
            .select('id, nombre, telefono, direccion, foto_fachada_url, hora_apertura, hora_cierre, horarios, categorias, slug, lat, lng')
            .eq('activo', true)
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

  useEffect(() => {
    loadRestaurants(0)
    loadPromos()
  }, [])

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

    // Búsqueda de texto
    if (search.trim() !== '') {
      result = result.filter(r => 
        r.nombre.toLowerCase().includes(search.toLowerCase()) || 
        (r.categorias && r.categorias.some(c => c.toLowerCase().includes(search.toLowerCase())))
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
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans pb-20 selection:bg-orange-100">

      {/* Header Pegajoso Premium (Estilo Delivery App) */}
      <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${isScrolled ? 'bg-white shadow-[0_4px_20px_rgba(0,0,0,0.04)]' : 'bg-slate-50'} pt-4 md:py-4 px-4 md:px-12 flex flex-col gap-3 md:gap-2`}>
        <div className="max-w-[1400px] mx-auto w-full flex flex-col md:flex-row md:items-center justify-between gap-3 md:gap-8">
           
           {/* Top Row (Address + Action) */}
           <div className="flex justify-between items-center md:w-auto w-full">
              {/* Desktop Logo (Left) */}
              <div className="hidden md:flex items-center gap-2 mr-4 cursor-pointer" onClick={() => window.scrollTo(0,0)}>
                 <img src="/estrella-circle.png" alt="Estrella Eats" className="w-10 h-10 object-contain" />
                 <span className="text-xl font-black text-slate-900 tracking-tighter hidden lg:block">
                   Estrella<span className="text-[#FA4A0C]">Eats</span>
                 </span>
              </div>

              {/* Address Picker Premium */}
              <div className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity bg-white md:bg-transparent pl-1.5 pr-4 py-1.5 md:p-0 rounded-full md:rounded-none shadow-sm md:shadow-none border border-slate-100 md:border-transparent flex-1 md:flex-none" onClick={() => requestLocation()}>
                 <div className="w-9 h-9 rounded-full bg-orange-100 flex items-center justify-center shrink-0">
                    <MapPin size={18} strokeWidth={2.5} className="text-orange-600"/>
                 </div>
                 <div className="flex flex-col min-w-0">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-[1px]">Entregar en</span>
                    <div className="flex items-center gap-1">
                       <span className="font-bold text-slate-800 text-[13px] md:text-[15px] truncate max-w-[180px] md:max-w-[250px] leading-none">
                         {locationLoading ? "Buscando..." : (userAddress ? userAddress.split(',')[0] : (userLocation ? "Ubicación actual" : "Comitán de Domínguez"))}
                       </span>
                       {locationLoading ? <Loader2 size={13} className="animate-spin text-orange-500 shrink-0"/> : <ChevronDown size={14} strokeWidth={3} className="text-slate-800 shrink-0 ml-0.5"/>}
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
                    <div className="absolute top-2.5 right-2.5 w-2.5 h-2.5 bg-orange-500 rounded-full border-2 border-white"></div>
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
                               colorClass = 'text-orange-500';
                               bgClass = 'bg-orange-50';
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
                         ) : (
                           <>
                             <div className="w-12 h-12 bg-orange-50 rounded-full flex items-center justify-center mb-1">
                               <Bell size={24} className="text-orange-500 opacity-50" />
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
           <div className="relative group flex-1 w-full md:max-w-2xl flex items-center gap-2">
              <div className="relative flex-1">
                 <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                   <Search className="text-slate-400 group-focus-within:text-orange-500 transition-colors" size={18} strokeWidth={2.5} />
                 </div>
                 <input 
                   type="text" 
                   placeholder="Restaurantes, platillos, antojos..."
                   className="w-full bg-white hover:bg-slate-50 focus:bg-white border border-slate-100 focus:border-orange-500 rounded-full py-3 pl-12 pr-4 text-[14px] md:text-[15px] font-medium text-slate-900 placeholder:text-slate-400 outline-none transition-all shadow-[0_2px_12px_rgba(0,0,0,0.03)]"
                   value={search}
                   onChange={(e) => setSearch(e.target.value)}
                 />
              </div>
              
              {/* Botón Beneficios (Desktop) */}
              <Link 
                to="/beneficios" 
                className="hidden md:flex h-12 items-center gap-2 px-6 bg-gradient-to-r from-orange-500 to-[#FA4A0C] hover:from-orange-600 hover:to-orange-700 text-white rounded-full font-bold shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all"
              >
                <Star size={18} className="fill-white" />
                <span>Beneficios VIP</span>
              </Link>

              {/* Botón Beneficios (Mobile) */}
              <Link 
                to="/beneficios" 
                className="w-12 h-12 shrink-0 bg-gradient-to-r from-orange-500 to-[#FA4A0C] rounded-full flex items-center justify-center shadow-[0_2px_12px_rgba(0,0,0,0.03)] text-white hover:-translate-y-0.5 transition-all md:hidden"
              >
                <Star size={20} className="fill-white" />
              </Link>

              <button className="w-12 h-12 shrink-0 bg-white rounded-full flex items-center justify-center border border-slate-100 shadow-[0_2px_12px_rgba(0,0,0,0.03)] text-slate-600 hover:border-orange-500 hover:text-orange-500 transition-colors md:hidden">
                 <SlidersHorizontal size={20} strokeWidth={2.5} />
              </button>
           </div>

           {/* Desktop Empty Spacer for Balance */}
           <div className="hidden md:flex w-[200px] justify-end"></div>
        </div>
      </header>

      <main className="pt-[140px] md:pt-32 max-w-[1400px] mx-auto px-4 md:px-12">
        
        {/* Carrusel de Categorías (Solo Sticky en Desktop) */}
        <div className="md:sticky top-[128px] md:top-[80px] z-40 bg-slate-50 md:bg-slate-50/95 md:backdrop-blur-xl border-b border-slate-200/50 -mx-4 px-4 md:mx-0 md:px-0 shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
          <div className="flex overflow-x-auto gap-2.5 md:gap-4 pb-3 pt-3 no-scrollbar max-w-[1400px] mx-auto">
            {activeCategories.map(c => (
               <button 
                  key={c.name}
                  onClick={() => setSelectedCategory(selectedCategory === c.name ? null : c.name)} 
                  className="flex flex-col items-center gap-1.5 md:gap-2 min-w-[64px] md:min-w-[80px] group"
                >
                  <div className={`w-14 h-14 md:w-16 md:h-16 rounded-[14px] md:rounded-2xl flex items-center justify-center text-[28px] md:text-[32px] shadow-[0_2px_10px_rgba(0,0,0,0.04)] border transition-all duration-300 ${selectedCategory === c.name ? 'bg-orange-50 border-orange-500 scale-105' : 'bg-white border-slate-100 group-hover:border-orange-200 group-hover:scale-105'}`}>
                    {c.emoji}
                  </div>
                  <span className={`text-[11px] md:text-[12px] font-bold ${selectedCategory === c.name ? 'text-orange-600' : 'text-slate-600'}`}>{c.name}</span>
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
                    <div key={i} className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${i === currentPromoIndex ? 'bg-orange-500 w-4' : 'bg-slate-300'}`} />
                  ))}
                </div>
                {/* Flechas */}
                <div className="flex items-center gap-2">
                  <button onClick={prevPromo} className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-orange-50 hover:text-orange-500 transition-colors">
                    <ChevronLeft size={18} />
                  </button>
                  <button onClick={nextPromo} className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-orange-50 hover:text-orange-500 transition-colors">
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
                        className="w-full h-full bg-white rounded-[20px] p-3 md:p-4 flex gap-4 md:gap-6 shadow-[0_4px_20px_rgba(0,0,0,0.03)] border border-slate-100 hover:border-orange-200 transition-colors group"
                      >
                        <div className="w-[86px] h-[86px] md:w-[98px] md:h-[98px] rounded-[14px] overflow-hidden bg-slate-50 shrink-0 relative shadow-sm">
                           {promo.foto_url ? (
                             <img src={promo.foto_url} loading="lazy" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" alt={promo.titulo} />
                           ) : (
                             <div className="w-full h-full flex items-center justify-center bg-orange-50 text-orange-400"><Ticket size={24} /></div>
                           )}
                           <div className="absolute top-1.5 left-1.5 bg-[#FA4A0C] text-white text-[9px] font-black uppercase px-2 py-0.5 rounded shadow-sm">
                             Promo
                           </div>
                        </div>
                        <div className="flex-1 py-1 flex flex-col justify-center min-w-0">
                           <p className="text-[10px] md:text-[11px] font-bold text-slate-400 mb-1 flex items-center gap-1 uppercase tracking-wider truncate">
                             <Store size={10}/> {promo.restaurantes?.nombre}
                           </p>
                           <h4 className="font-black text-slate-900 text-[15px] md:text-[18px] leading-tight mb-1 md:mb-2 line-clamp-2">{promo.titulo}</h4>
                           <div className="mt-auto">
                             <span className="text-[#FA4A0C] font-black text-[16px] md:text-[20px] tracking-tight">${promo.precio_especial?.toFixed(2)}</span>
                           </div>
                        </div>
                        <div className="hidden sm:flex shrink-0 items-center justify-center pr-2">
                           <button 
                             onClick={(e) => { e.preventDefault(); e.stopPropagation(); nextPromo(); }}
                             className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 hover:bg-orange-50 hover:text-orange-500 transition-colors z-10 relative"
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
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6 mt-4 md:mt-6">
            {[1,2,3,4,5,6,7,8,9,10].map(i => (
              <div key={i} className="flex flex-col gap-3 sm:gap-0 animate-pulse bg-white sm:bg-transparent p-3 sm:p-0 rounded-2xl sm:rounded-none border border-slate-100 sm:border-none">
                <div className="w-[90px] sm:w-[160px] md:w-[180px] shrink-0 aspect-square mx-auto bg-slate-200 rounded-full sm:mb-3" />
                <div className="flex flex-col justify-center w-full items-center">
                  <div className="w-3/4 h-4 bg-slate-200 rounded-full mb-2" />
                  <div className="w-1/2 h-3 bg-slate-200 rounded-full" />
                </div>
              </div>
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
          <div className="flex flex-col gap-10 mt-4 md:mt-6 pb-12">
            
            {/* Sección: Favoritos */}
            {favorites.length > 0 && !search && !selectedCategory && activeTab === 'todos' && (
              <section>
                <h2 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight mb-4 px-2">Tus Favoritos ❤️</h2>
                <div className="flex overflow-x-auto gap-4 pb-4 px-2 no-scrollbar snap-x">
                  {displayRestaurants.filter(r => favorites.includes(r.id)).map(res => (
                    <motion.div key={res.id} whileInView={{ opacity: 1, x: 0 }} initial={{ opacity: 0, x: 20 }} viewport={{ once: true }} className="snap-start shrink-0 w-[140px] sm:w-[180px]">
                      <RestaurantCard res={res} isFav={favorites.includes(res.id)} toggleFav={toggleFavorite} userLocation={userLocation} estaAbierto={estaAbierto} calculaDistancia={calculaDistancia} horizontal />
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
                      <RestaurantCard res={res} isFav={favorites.includes(res.id)} toggleFav={toggleFavorite} userLocation={userLocation} estaAbierto={estaAbierto} calculaDistancia={calculaDistancia} horizontal />
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
                className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 md:gap-6"
              >
                {displayRestaurants.map(res => (
                  <motion.div key={res.id} whileInView={{ opacity: 1, y: 0 }} initial={{ opacity: 0, y: 20 }} viewport={{ once: true, margin: "0px 0px -50px 0px" }}>
                    <RestaurantCard res={res} isFav={favorites.includes(res.id)} toggleFav={toggleFavorite} userLocation={userLocation} estaAbierto={estaAbierto} calculaDistancia={calculaDistancia} />
                  </motion.div>
                ))}
              </motion.div>
            </section>

          </div>
        )}

        {/* Cargar más */}
        {hasMore && !loading && displayRestaurants.length > 0 && (
          <div className="flex justify-center mt-4 pb-20">
            <button 
              onClick={handleLoadMore}
              disabled={loadingMore}
              className="px-8 py-3.5 bg-slate-100 text-slate-800 rounded-full font-bold hover:bg-slate-200 transition-all disabled:opacity-50 text-[15px]"
            >
              {loadingMore ? 'Cargando más...' : 'Ver más comercios'}
            </button>
          </div>
        )}
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
    </div>
  )
}
