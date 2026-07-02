import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../lib/supabase'
import type { MenuPromocion } from '../lib/supabase'
import { Store, Search, MapPin, Clock, Ticket, Loader2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'

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

export function PublicLandingPage() {
  const [restaurantes, setRestaurantes] = useState<Restaurante[]>([])
  const [promosGlobales, setPromosGlobales] = useState<(MenuPromocion & { restaurantes: Restaurante })[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingPromos, setLoadingPromos] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [search, setSearch] = useState("")
  const [page, setPage] = useState(0)
  const [hasMore, setHasMore] = useState(true)
  const [activeTab, setActiveTab] = useState<'todos' | 'cerca' | 'promos'>('todos')
  const [isScrolled, setIsScrolled] = useState(false)
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(null)
  const [locationLoading, setLocationLoading] = useState(false)
  const PAGE_SIZE = 8 // Cargamos de 8 en 8

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20)
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  async function loadRestaurants(pageIndex: number) {
    // SWR Cache: Mostrar datos instantáneos si existen
    if (pageIndex === 0) {
      const cached = sessionStorage.getItem('cache_restaurantes')
      if (cached) {
        setRestaurantes(JSON.parse(cached))
        setLoading(false) // Ya tenemos algo que mostrar, no bloqueamos la UI
      } else {
        setLoading(true)
      }
    } else {
      setLoadingMore(true)
    }

    // ⚡ Optimizacion: Hacemos una sola peticion en background.
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
        // Guardamos en caché para la próxima vez
        sessionStorage.setItem('cache_restaurantes', JSON.stringify(finalData))
      } else {
        setRestaurantes(prev => {
          const newIds = finalData.map(d => d.id)
          const combined = [...prev.filter(p => !newIds.includes(p.id)), ...finalData]
          // Actualizamos el caché también al cargar más
          sessionStorage.setItem('cache_restaurantes', JSON.stringify(combined))
          return combined
        })
      }
    }
    
    setLoading(false)
    setLoadingMore(false)
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
        // Expiration date check
        if (p.fecha_fin) {
          const endDateStr = p.fecha_fin.includes('T') ? p.fecha_fin : `${p.fecha_fin}T23:59:59`;
          if (new Date(endDateStr) < new Date()) return false;
        }
        // Application day check
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

    // Realtime para actualizar la lista de restaurantes en vivo
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

  const filteredRestaurants = useMemo(() => 
    restaurantes.filter(r => 
      r.nombre.toLowerCase().includes(search.toLowerCase()) || 
      (r.categorias && r.categorias.some(c => c.toLowerCase().includes(search.toLowerCase())))
    ),
  [search, restaurantes]);

  const estaAbierto = (res: Restaurante) => {
    if (res.horarios) {
      const dias = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado']
      const hoy = new Date()
      const diaString = dias[hoy.getDay()]
      const horarioHoy = res.horarios[diaString]
      if (horarioHoy && horarioHoy.activo) {
        const horaLocal = hoy.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })
        if (horarioHoy.abre <= horarioHoy.cierra) {
          return horaLocal >= horarioHoy.abre && horaLocal <= horarioHoy.cierra
        } else {
          return horaLocal >= horarioHoy.abre || horaLocal <= horarioHoy.cierra
        }
      }
      return false
    }

    if (!res.hora_apertura || !res.hora_cierre) return false;
    const ahora = new Date();
    const horaLocal = ahora.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
    if (res.hora_apertura <= res.hora_cierre) {
      return horaLocal >= res.hora_apertura && horaLocal <= res.hora_cierre;
    } else {
      return horaLocal >= res.hora_apertura || horaLocal <= res.hora_cierre;
    }
  }

  function calculaDistancia(lat1: number, lon1: number, lat2: number, lon2: number) {
    const R = 6371; // Radio de la Tierra en km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  const handleTabClick = (tab: 'todos' | 'cerca' | 'promos') => {
    if (tab === 'cerca' && !userLocation) {
      setLocationLoading(true);
      if ("geolocation" in navigator) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
            setActiveTab('cerca');
            setLocationLoading(false);
          },
          (err) => {
            console.error("Error obteniendo ubicación:", err);
            alert("No pudimos obtener tu ubicación GPS. Por favor actívala en tu navegador.");
            setActiveTab('cerca');
            setLocationLoading(false);
          },
          { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
        );
      } else {
        alert("Tu navegador no soporta geolocalización.");
        setLocationLoading(false);
      }
    } else {
      setActiveTab(tab);
    }
  }

  // Cerca de ti: Filtra a max 2km y ordena por distancia si hay GPS
  const restaurantesCerca = useMemo(() => {
    let result = [...filteredRestaurants];
    
    if (userLocation) {
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
      result.sort((a, b) => {
        const aAbierto = estaAbierto(a) ? 1 : 0;
        const bAbierto = estaAbierto(b) ? 1 : 0;
        return bAbierto - aAbierto;
      });
    }
    
    return result;
  }, [filteredRestaurants, userLocation]);

  const filteredPromos = useMemo(() => 
    promosGlobales.filter(p => 
      p.titulo.toLowerCase().includes(search.toLowerCase()) || 
      (p.restaurantes?.nombre || '').toLowerCase().includes(search.toLowerCase())
    ),
  [search, promosGlobales]);

  return (
    <div className="min-h-screen bg-[#F6F6F9] text-slate-900 selection:bg-orange-100 font-sans pb-20">

      {/* Navbar Minimalista */}
      <header className={`fixed top-0 left-0 right-0 z-50 h-16 md:h-20 flex justify-between items-center px-6 md:px-12 transition-all duration-300 ${isScrolled ? 'bg-white/95 backdrop-blur-md shadow-sm border-b border-slate-100' : 'bg-transparent border-b border-transparent'}`}>
        <AnimatePresence>
          {isScrolled && (
            <motion.div 
              initial={{ opacity: 0, x: -10 }} 
              animate={{ opacity: 1, x: 0 }} 
              exit={{ opacity: 0, x: -10 }}
              className="flex items-center gap-3"
            >
              <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-slate-50 flex items-center justify-center overflow-hidden shrink-0 border border-slate-100 p-1.5 shadow-sm">
                <img src="/logo.png" alt="Estrella Eats" className="w-full h-full object-contain" />
              </div>
              <div>
                <h2 className="font-black text-slate-900 text-[15px] md:text-[17px] leading-tight tracking-tight">Estrella Eats</h2>
                <div className="flex items-center gap-1 mt-0.5">
                  <span className="text-[10px] md:text-[11px] font-bold text-slate-500">Comida a domicilio</span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      <main className="px-6 md:px-12 max-w-[1400px] mx-auto mt-6 pt-28 md:pt-36">

        {/* Hero Section (Clean Dribbble Style) */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="mb-10 max-w-2xl"
        >
          <img src="/logo.png" className="w-24 h-24 md:w-32 md:h-32 object-contain mb-6 drop-shadow-lg transform -rotate-2 hover:rotate-0 transition-transform" alt="Estrella Eats" />
          <h1 className="text-3xl md:text-5xl font-extrabold text-slate-900 mb-6 leading-tight tracking-tight">
            La mejor comida, <br/>
            <span className="text-orange-500">hasta tu puerta.</span>
          </h1>
          
          <div className="relative w-full max-w-md shadow-sm rounded-full bg-white group hover:shadow-md transition-shadow">
            <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-orange-500 transition-colors" size={20} />
            <input 
              type="text" 
              placeholder="¿Qué buscas hoy?"
              className="w-full bg-transparent border-none rounded-full py-4 pl-14 pr-6 text-[17px] text-slate-900 placeholder:text-slate-400 outline-none focus:ring-4 focus:ring-orange-500/10 transition-all font-semibold"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </motion.div>

        {/* Section Header / Floating Tabs */}
        <div className="flex flex-wrap gap-3 mb-6 pb-2 pt-2">
          <button 
            onClick={() => setActiveTab('todos')}
            className={`px-6 py-3 rounded-full text-[15px] font-bold transition-all whitespace-nowrap flex items-center gap-2 ${activeTab === 'todos' ? 'bg-white text-slate-900 shadow-[0_4px_20px_rgb(0,0,0,0.08)] scale-105 border border-transparent' : 'bg-slate-200/50 text-slate-500 hover:bg-slate-200 border border-transparent'}`}
          >
            <Store size={18} /> Todos los comercios
          </button>
          <button 
            onClick={() => handleTabClick('cerca')}
            className={`px-6 py-3 rounded-full text-[15px] font-bold transition-all whitespace-nowrap flex items-center gap-2 ${activeTab === 'cerca' ? 'bg-white text-slate-900 shadow-[0_4px_20px_rgb(0,0,0,0.08)] scale-105 border border-transparent' : 'bg-slate-200/50 text-slate-500 hover:bg-slate-200 border border-transparent'}`}
          >
            {locationLoading ? <Loader2 size={18} className="animate-spin" /> : <MapPin size={18} />} Cerca de ti
          </button>
          <button 
            onClick={() => setActiveTab('promos')}
            className={`px-6 py-3 rounded-full text-[15px] font-bold transition-all whitespace-nowrap flex items-center gap-2 ${activeTab === 'promos' ? 'bg-[#FA4A0C] text-white shadow-[0_4px_20px_rgba(250,74,12,0.3)] scale-105 border border-transparent' : 'bg-[#FA4A0C]/10 text-[#FA4A0C] hover:bg-[#FA4A0C]/20 border border-transparent'}`}
          >
            <Ticket size={18} /> Promociones
          </button>
        </div>

        {/* Main Content Area */}
        {activeTab === 'promos' ? (
          loadingPromos ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mt-10">
              {[1, 2, 3, 4, 5, 6].map(i => (
                <div key={i} className="bg-white rounded-[32px] p-4 flex gap-4 items-center shadow-sm">
                  <div className="w-28 h-28 rounded-[24px] bg-slate-200 animate-pulse shrink-0" />
                  <div className="flex-1">
                    <div className="w-3/4 h-5 bg-slate-200 animate-pulse rounded-md mb-2" />
                    <div className="w-full h-4 bg-slate-200 animate-pulse rounded-md mb-3" />
                    <div className="w-1/2 h-6 bg-slate-200 animate-pulse rounded-md" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredPromos.length === 0 ? (
            <div className="text-center py-20 mt-10">
              <Ticket className="w-16 h-16 text-slate-200 mx-auto mb-4" />
              <h3 className="text-2xl font-bold text-slate-700">Sin promociones</h3>
              <p className="text-slate-500 mt-2">No encontramos promociones activas por ahora.</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mt-10 pb-12">
              {filteredPromos.map((promo, index) => (
                <motion.div
                  key={promo.id}
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.05, type: 'spring', bounce: 0.4 }}
                >
                  <Link 
                    to={`/menu/${promo.restaurantes?.slug || promo.restaurantes?.id}?tab=promos`}
                    className="bg-white/80 backdrop-blur-sm p-4 rounded-[32px] shadow-[0_8px_30px_rgb(0,0,0,0.03)] hover:shadow-[0_20px_40px_-15px_rgba(250,74,12,0.15)] hover:-translate-y-1 transition-all flex gap-5 items-center group border border-white hover:border-[#FA4A0C]/30 relative overflow-hidden h-full"
                  >
                    <div className="w-28 h-28 rounded-[24px] overflow-hidden bg-slate-50 shrink-0 relative">
                      {promo.foto_url ? (
                        <img src={promo.foto_url} loading="lazy" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out" alt={promo.titulo} />
                      ) : promo.restaurantes?.foto_fachada_url ? (
                        <img src={promo.restaurantes.foto_fachada_url} loading="lazy" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out" alt={promo.restaurantes?.nombre} />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-orange-50 text-orange-300"><Ticket size={32} /></div>
                      )}
                      <div className="absolute top-2 left-2 bg-[#FA4A0C] text-white text-[10px] font-black uppercase px-2 py-1 rounded-full shadow-md">
                        Promo
                      </div>
                    </div>
                    <div className="flex-1 py-1 flex flex-col h-full">
                      <p className="text-[11px] font-bold text-slate-400 mb-1 flex items-center gap-1 line-clamp-1 uppercase tracking-wider"><Store size={10}/> {promo.restaurantes?.nombre}</p>
                      <h4 className="font-extrabold text-slate-900 text-[16px] leading-tight mb-2 line-clamp-2">{promo.titulo}</h4>
                      <div className="flex items-center gap-2 mt-auto">
                        <span className="text-[#FA4A0C] font-black text-[22px] tracking-tight">${promo.precio_especial?.toFixed(2)}</span>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
          )
        ) : (
          /* Render Todos or Cerca */
          loading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-x-4 md:gap-x-8 gap-y-16 md:gap-y-20 mt-20 pb-12">
              {[1,2,3,4,5,6].map(i => (
                <div key={i} className="bg-white/50 rounded-[30px] pt-[65px] md:pt-[75px] pb-8 px-3 md:px-5 flex flex-col items-center relative shadow-sm">
                  <div className="absolute -top-14 w-[120px] h-[120px] rounded-full bg-slate-200 animate-pulse border-[6px] border-[#F6F6F9]" />
                  <div className="w-3/4 h-6 bg-slate-200 animate-pulse rounded-md mb-3" />
                  <div className="w-1/2 h-4 bg-slate-200 animate-pulse rounded-md" />
                </div>
              ))}
            </div>
          ) : filteredRestaurants.length === 0 ? (
            <div className="text-center py-20 mt-10">
              <h3 className="text-2xl font-bold text-slate-700">Sin resultados</h3>
              <p className="text-slate-500 mt-2">Prueba con otra búsqueda.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-x-4 md:gap-x-8 gap-y-16 md:gap-y-20 mt-20 pb-12">
              {(activeTab === 'cerca' ? restaurantesCerca : filteredRestaurants).map((res, index) => (
                <motion.div
                  key={res.id}
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.05, type: 'spring', bounce: 0.4 }}
                >
                  <Link 
                    to={`/menu/${res.slug || res.id}`}
                    className="group relative bg-white/80 backdrop-blur-sm rounded-[30px] shadow-[0_8px_30px_rgb(0,0,0,0.03)] hover:shadow-[0_20px_40px_-15px_rgba(250,74,12,0.15)] transition-all duration-300 pt-[65px] md:pt-[75px] pb-8 px-3 md:px-5 flex flex-col items-center text-center border border-white hover:border-orange-50/50"
                  >
                    {/* Plato flotante circular */}
                    <div className="absolute -top-14 w-[110px] h-[110px] md:w-[130px] md:h-[130px] rounded-full overflow-hidden shadow-[0_15px_35px_-5px_rgba(0,0,0,0.15)] border-[5px] md:border-[6px] border-[#F6F6F9] group-hover:border-white bg-white group-hover:-translate-y-3 transition-all duration-500">
                      {res.foto_fachada_url ? (
                        <img 
                          src={res.foto_fachada_url} 
                          alt={res.nombre} 
                          loading="lazy"
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out" 
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-orange-50 to-orange-100">
                          <Store className="w-10 h-10 text-orange-300" />
                        </div>
                      )}
                      
                      {/* Overlay oscurecido levemente si está cerrado */}
                      {!estaAbierto(res) && (
                         <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-[2px] flex items-center justify-center transition-all">
                            <span className="text-white text-[10px] md:text-xs font-black tracking-[0.2em] uppercase">Cerrado</span>
                         </div>
                      )}
                    </div>
                    
                    {/* Info */}
                    <h3 className="text-[18px] md:text-[26px] font-brother font-normal text-slate-800 mb-1 leading-tight line-clamp-2 text-balance group-hover:text-[#FA4A0C] transition-colors tracking-widest mt-2 uppercase">
                      {res.nombre}
                    </h3>
                    <p className="text-[#FA4A0C] font-bold text-[13px] md:text-[15px] mt-1 opacity-90 mb-3">
                      {res.categorias?.[0] || 'Restaurante'}
                    </p>
                    
                    {/* Fake distance/time for "Cerca de ti" */}
                    {activeTab === 'cerca' && estaAbierto(res) && (
                      <div className="mt-auto bg-slate-100 text-slate-500 text-[11px] font-bold px-3 py-1.5 rounded-full flex items-center gap-1">
                        <Clock size={12} /> 15-20 min
                      </div>
                    )}
                  </Link>
                </motion.div>
              ))}
            </div>
          )
        )}

        {/* Load More Button (Only for Todos/Cerca) */}
        {activeTab !== 'promos' && hasMore && !loading && filteredRestaurants.length > 0 && (
          <div className="flex justify-center mt-4 pb-12">
            <button 
              onClick={handleLoadMore}
              disabled={loadingMore}
              className="px-8 py-3 bg-slate-900 text-white rounded-xl font-bold shadow-xl shadow-slate-200 hover:bg-orange-500 hover:shadow-orange-200 transition-all disabled:opacity-50 flex items-center gap-2"
            >
              {loadingMore ? 'Cargando...' : 'Cargar más restaurantes'}
            </button>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-100 py-16 px-10">
        <div className="max-w-[1400px] mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="text-center md:text-left">
            <div className="flex items-center gap-2 mb-3 justify-center md:justify-start">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center shadow">
                <Store className="w-3.5 h-3.5 text-white" />
              </div>
              <span className="text-lg font-black text-slate-800 tracking-tighter">
                Estrella<span className="text-orange-500">Eats</span>
              </span>
            </div>
            <p className="text-slate-400 text-sm font-medium">La mejor selección gastronómica de Comitán.</p>
          </div>
          <div className="flex gap-12">
            <div className="flex flex-col gap-3">
              <p className="text-xs font-black uppercase tracking-widest text-slate-900">Ayuda</p>
              <a href="#" className="text-sm text-slate-400 hover:text-orange-500 transition-colors">Soporte 24/7</a>
              <a href="#" className="text-sm text-slate-400 hover:text-orange-500 transition-colors">Seguridad</a>
            </div>
            <div className="flex flex-col gap-3">
              <p className="text-xs font-black uppercase tracking-widest text-slate-900">Legal</p>
              <a href="#" className="text-sm text-slate-400 hover:text-orange-500 transition-colors">Privacidad</a>
              <a href="#" className="text-sm text-slate-400 hover:text-orange-500 transition-colors">Términos</a>
            </div>
          </div>
        </div>
        <div className="max-w-[1400px] mx-auto mt-12 pt-8 border-t border-slate-50 text-center text-[10px] font-bold text-slate-300 uppercase tracking-widest">
          © {new Date().getFullYear()} Estrella Eats · Comitán de Domínguez, Chiapas
        </div>
      </footer>
    </div>
  )
}
