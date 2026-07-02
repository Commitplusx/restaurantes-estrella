import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../lib/supabase'
import type { MenuPromocion } from '../lib/supabase'
import { Store, Search, MapPin, Clock, Ticket, Loader2, Star, ChevronRight, ChevronLeft } from 'lucide-react'
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

const CATEGORIES = [
  { name: 'Hamburguesas', emoji: '🍔' },
  { name: 'Pizza', emoji: '🍕' },
  { name: 'Tacos', emoji: '🌮' },
  { name: 'Sushi', emoji: '🍣' },
  { name: 'Café', emoji: '☕' },
  { name: 'Postres', emoji: '🍰' },
  { name: 'Saludable', emoji: '🥗' },
  { name: 'Pollo', emoji: '🍗' },
  { name: 'Antojitos', emoji: '🌶️' },
  { name: 'Bebidas', emoji: '🥤' }
]

export function PublicLandingPage() {
  const [restaurantes, setRestaurantes] = useState<Restaurante[]>([])
  const [promosGlobales, setPromosGlobales] = useState<(MenuPromocion & { restaurantes: Restaurante })[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingPromos, setLoadingPromos] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [search, setSearch] = useState("")
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [page, setPage] = useState(0)
  const [hasMore, setHasMore] = useState(true)
  const [activeTab, setActiveTab] = useState<'todos' | 'cerca'>('todos')
  const [isScrolled, setIsScrolled] = useState(false)
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(null)
  const [locationLoading, setLocationLoading] = useState(false)
  const [currentPromoIndex, setCurrentPromoIndex] = useState(0)

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

  async function loadRestaurants(pageIndex: number) {
    if (pageIndex === 0) {
      const cached = sessionStorage.getItem('cache_restaurantes')
      if (cached) {
        setRestaurantes(JSON.parse(cached))
        setLoading(false)
      } else {
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
          const newIds = finalData.map(d => d.id)
          const combined = [...prev.filter(p => !newIds.includes(p.id)), ...finalData]
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

  const handleTabClick = (tab: 'todos' | 'cerca') => {
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

      {/* Header Pegajoso (Estilo Delivery App) */}
      <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${isScrolled ? 'bg-white shadow-sm' : 'bg-slate-50'} pt-3 md:pt-6 pb-2.5 md:pb-3 px-4 md:px-12 flex flex-col gap-2 md:gap-4`}>
        <div className="max-w-[1400px] mx-auto w-full flex justify-between items-center">
           <div className="flex flex-col cursor-pointer hover:opacity-80 transition-opacity" onClick={() => handleTabClick('cerca')}>
              <span className="text-[10px] md:text-[11px] font-bold text-orange-600 uppercase tracking-wide">Entregar ahora en</span>
              <div className="flex items-center gap-1 font-bold text-slate-800 text-[14px] md:text-[15px]">
                 <MapPin size={14} strokeWidth={2.5} className="text-slate-800"/> 
                 {userLocation ? "Tu Ubicación Actual" : "Comitán de Domínguez"} 
                 <ChevronRight size={14} className="text-slate-400"/>
              </div>
           </div>
           <div className="w-8 h-8 md:w-12 md:h-12 rounded-full bg-white flex items-center justify-center p-1 shadow-sm border border-slate-100">
             <img src="/logo.png" alt="Estrella Eats" className="w-full h-full object-contain" />
           </div>
        </div>
        
        {/* Barra de Búsqueda */}
        <div className="max-w-[1400px] mx-auto w-full relative group">
           <div className="absolute inset-y-0 left-3.5 flex items-center pointer-events-none">
             <Search className="text-slate-400 group-focus-within:text-orange-500 transition-colors" size={18} strokeWidth={2.5} />
           </div>
           <input 
             type="text" 
             placeholder="Restaurantes, platillos, antojos..."
             className="w-full bg-slate-100 hover:bg-slate-200/60 focus:bg-white border-2 border-transparent focus:border-orange-500 rounded-full py-2 md:py-3.5 pl-10 md:pl-12 pr-4 text-[13px] md:text-[15px] font-medium text-slate-900 placeholder:text-slate-500 outline-none transition-all shadow-sm"
             value={search}
             onChange={(e) => setSearch(e.target.value)}
           />
        </div>
      </header>

      <main className="pt-28 md:pt-44 max-w-[1400px] mx-auto px-4 md:px-12">
        
        {/* Carrusel de Categorías Rápido */}
        <div className="flex overflow-x-auto gap-2.5 md:gap-5 pb-2 pt-2 no-scrollbar -mx-4 px-4 md:mx-0 md:px-0">
          {CATEGORIES.map(c => (
             <button 
                key={c.name}
                onClick={() => setSelectedCategory(selectedCategory === c.name ? null : c.name)} 
                className="flex flex-col items-center gap-1.5 md:gap-2 min-w-[64px] md:min-w-[85px] group"
              >
                <div className={`w-14 h-14 md:w-20 md:h-20 rounded-[14px] md:rounded-2xl flex items-center justify-center text-[28px] md:text-[40px] shadow-[0_2px_10px_rgba(0,0,0,0.04)] border transition-all duration-300 ${selectedCategory === c.name ? 'bg-orange-50 border-orange-500 scale-105' : 'bg-white border-slate-100 group-hover:border-orange-200 group-hover:scale-105'}`}>
                  {c.emoji}
                </div>
                <span className={`text-[11px] md:text-[13px] font-bold ${selectedCategory === c.name ? 'text-orange-600' : 'text-slate-600'}`}>{c.name}</span>
             </button>
          ))}
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
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6 mt-4 md:mt-6">
            {[1,2,3,4,5,6,7,8,9,10].map(i => (
              <div key={i} className="flex flex-row sm:flex-col gap-3 sm:gap-0 animate-pulse bg-white sm:bg-transparent p-3 sm:p-0 rounded-2xl sm:rounded-none border border-slate-100 sm:border-none">
                <div className="w-24 sm:w-full shrink-0 aspect-[4/3] sm:aspect-video bg-slate-200 rounded-xl sm:rounded-[18px] sm:mb-3" />
                <div className="flex flex-col justify-center w-full">
                  <div className="w-3/4 h-4 bg-slate-200 rounded-md mb-2" />
                  <div className="w-1/2 h-3 bg-slate-200 rounded-md" />
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
          <motion.div 
            key={selectedCategory || search || activeTab}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 md:gap-6 mt-4 md:mt-6 pb-12"
          >
            {displayRestaurants.map(res => (
              <Link to={`/menu/${res.slug || res.id}`} key={res.id} className="flex flex-row sm:flex-col gap-3 sm:gap-0 group relative bg-white sm:bg-transparent p-2.5 sm:p-0 rounded-2xl sm:rounded-none shadow-sm sm:shadow-none border border-slate-100 sm:border-none">
                 {/* Imagen 16:9 en Desktop, 4:3 pequeño en Móvil */}
                 <div className="relative w-[110px] sm:w-full shrink-0 aspect-[4/3] sm:aspect-video rounded-xl sm:rounded-[18px] overflow-hidden bg-slate-100 sm:mb-2.5 shadow-none sm:shadow-[0_2px_15px_rgba(0,0,0,0.06)] border border-slate-100 isolate">
                    {res.foto_fachada_url ? (
                      <img src={res.foto_fachada_url} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out" alt={res.nombre} />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-orange-50"><Store size={24} className="text-orange-200 sm:w-10 sm:h-10" /></div>
                    )}
                    
                    {/* Badge de Tiempo */}
                    {estaAbierto(res) && (
                      <div className="absolute bottom-1 right-1 sm:bottom-3 sm:right-3 bg-white/95 backdrop-blur-md px-1.5 py-1 sm:px-2.5 sm:py-1.5 rounded-lg sm:rounded-xl shadow-sm text-[9px] sm:text-[12px] font-bold text-slate-900 flex items-center gap-0.5 sm:gap-1 z-10">
                         <Clock size={10} strokeWidth={3} className="text-[#FA4A0C] sm:w-3 sm:h-3"/> 25-35 min
                      </div>
                    )}

                    {/* Overlay Cerrado */}
                    {!estaAbierto(res) && (
                       <div className="absolute inset-0 bg-white/50 backdrop-blur-[2px] flex items-center justify-center z-20">
                          <span className="bg-slate-900 text-white text-[8px] sm:text-[11px] font-black uppercase tracking-[0.1em] sm:tracking-[0.15em] px-2 py-1 sm:px-4 sm:py-2 rounded-full shadow-lg">Cerrado</span>
                       </div>
                    )}
                 </div>
                 
                 {/* Info Header */}
                 <div className="flex flex-col sm:flex-row justify-center sm:justify-between items-start sm:items-start gap-1 sm:gap-2 sm:px-1 flex-1 min-w-0">
                    <div className="min-w-0 w-full">
                       <h3 className="font-bold text-[15px] sm:text-[16px] md:text-[17px] text-slate-900 leading-tight group-hover:text-[#FA4A0C] transition-colors truncate">
                         {res.nombre}
                       </h3>
                       <p className="text-slate-500 text-[11px] sm:text-[12px] font-medium mt-0.5 truncate">
                         {res.categorias?.[0] || 'Restaurante'} • Envío: $45
                       </p>
                    </div>
                    {/* Fake Rating */}
                    <div className="bg-slate-100 flex items-center justify-center px-1.5 py-0.5 sm:px-2 sm:py-1 rounded-full text-[10px] sm:text-[11px] font-black text-slate-700 shrink-0 gap-1 mt-1 sm:mt-0.5">
                      4.8 <Star size={10} className="fill-slate-700" />
                    </div>
                 </div>
              </Link>
            ))}
          </motion.div>
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
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center shadow-md">
              <Store className="w-4 h-4 text-white" />
            </div>
            <span className="text-xl font-black text-slate-900 tracking-tighter">
              Estrella<span className="text-[#FA4A0C]">Eats</span>
            </span>
          </div>
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mt-6">
            © {new Date().getFullYear()} Estrella Eats · Comitán de Domínguez
          </div>
        </div>
      </footer>
    </div>
  )
}
