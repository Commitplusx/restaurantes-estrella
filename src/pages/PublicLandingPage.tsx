import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../lib/supabase'
import { Star, Store, ArrowRight, Search, Filter } from 'lucide-react'
import { Link } from 'react-router-dom'

interface Restaurante {
  id: string
  nombre: string
  telefono: string
  direccion?: string
  foto_fachada_url?: string
  hora_apertura?: string
  hora_cierre?: string
  categorias?: string[]
}

export function PublicLandingPage() {
  const [restaurantes, setRestaurantes] = useState<Restaurante[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")

  useEffect(() => {
    async function load() {
      const { data, error } = await supabase
        .from('restaurantes')
        .select('id, nombre, telefono, direccion, foto_fachada_url, hora_apertura, hora_cierre, categorias')
        .eq('activo', true)
        .order('nombre')
      
      if (error) console.error("Error fetching restaurants:", error)
      if (data) setRestaurantes(data)
      setLoading(false)
    }
    load()
  }, [])

  const filteredRestaurants = useMemo(() => 
    restaurantes.filter(r => 
      r.nombre.toLowerCase().includes(search.toLowerCase()) || 
      (r.categorias && r.categorias.some(c => c.toLowerCase().includes(search.toLowerCase())))
    ),
  [search, restaurantes]);

  const estaAbierto = (apertura?: string, cierre?: string) => {
    if (!apertura || !cierre) return false;
    const ahora = new Date();
    const horaLocal = ahora.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
    if (apertura <= cierre) {
      return horaLocal >= apertura && horaLocal <= cierre;
    } else {
      return horaLocal >= apertura || horaLocal <= cierre;
    }
  }

  return (
    <div className="min-h-screen bg-[#FAFAFA] text-slate-900 selection:bg-orange-100">

      {/* Navbar */}
      <header className="sticky top-0 bg-white/80 backdrop-blur-xl z-50 border-b border-slate-50/50 py-5 px-6 md:px-10 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center shadow-lg shadow-orange-200">
            <Store className="w-4 h-4 text-white" />
          </div>
          <span className="font-black text-xl text-slate-800 tracking-tighter">
            Estrella<span className="text-orange-500">Delivery</span>
          </span>
        </div>
        <Link to="/login" className="text-sm font-bold text-slate-500 hover:text-orange-500 transition-colors bg-slate-100/50 hover:bg-orange-50 px-4 py-2 rounded-xl">
          Acceso Socios
        </Link>
      </header>

      <main className="p-6 md:p-12 max-w-[1400px] mx-auto min-h-screen">

        {/* Hero Section */}
        <div className="relative rounded-[2.5rem] bg-slate-900 h-[360px] overflow-hidden mb-12 flex items-center px-8 md:px-12">
          <img 
            src="https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&q=80&w=1200" 
            className="absolute inset-0 w-full h-full object-cover opacity-40"
            alt="Hero Estrella Delivery"
          />
          {/* Gradient overlay con color de marca */}
          <div className="absolute inset-0 bg-gradient-to-r from-slate-900/80 via-slate-900/40 to-transparent" />
          <div className="relative z-10 max-w-xl">
            <span className="bg-gradient-to-r from-orange-500 to-red-500 text-white text-[10px] font-black uppercase tracking-[0.2em] px-3 py-1 rounded-full mb-4 inline-block shadow-lg shadow-orange-500/30">
              ⭐ Estrella Delivery
            </span>
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-6 leading-tight">
              Tus favoritos, <br/>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-red-400">
                donde quieras.
              </span>
            </h1>
            <div className="relative max-w-md">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                type="text" 
                placeholder="¿Qué restaurante buscas hoy?"
                className="w-full bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl py-4 pl-12 pr-6 text-white placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-orange-500 transition-all"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Section Header */}
        <div className="flex flex-col md:flex-row justify-between items-end mb-8 gap-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Comercios Asociados</h2>
            <p className="text-slate-500 text-sm mt-1">
              Descubre lo mejor de Comitán · {restaurantes.length} disponibles
            </p>
          </div>
          <div className="flex gap-2">
            <button className="px-4 py-2 rounded-xl bg-white border border-slate-100 text-sm font-bold text-orange-500 shadow-sm">
              Todos
            </button>
            <button className="px-4 py-2 rounded-xl bg-white border border-slate-100 text-sm font-bold text-slate-400 hover:border-orange-400 transition-all">
              <Filter size={16} />
            </button>
          </div>
        </div>

        {/* Restaurants Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[1,2,3,4,5,6].map(i => (
              <div key={i} className="bg-white rounded-[2rem] h-72 animate-pulse border border-slate-100 shadow-sm" />
            ))}
          </div>
        ) : filteredRestaurants.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-[2.5rem] border border-slate-100 shadow-sm">
            <Store className="w-16 h-16 text-slate-200 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-slate-700">Sin resultados</h3>
            <p className="text-slate-500">Prueba con otra búsqueda o categoría.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 pb-12">
            {filteredRestaurants.map((res) => (
              <Link 
                to={`/menu/${res.id}`}
                key={res.id} 
                className="group cursor-pointer bg-white rounded-[2rem] border border-slate-100 overflow-hidden hover:border-orange-100 hover:shadow-2xl hover:shadow-orange-500/5 transition-all duration-500 flex flex-col"
              >
                <div className="relative h-52 overflow-hidden bg-slate-100">
                  {res.foto_fachada_url ? (
                    <img 
                      src={res.foto_fachada_url} 
                      alt={res.nombre} 
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" 
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-orange-50 to-orange-100">
                      <Store className="w-12 h-12 text-orange-200" />
                    </div>
                  )}
                  
                  {/* Badge Abierto/Cerrado */}
                  <div className={`absolute top-4 left-4 px-3 py-1.5 rounded-full flex items-center gap-1.5 shadow-md text-[10px] font-black uppercase tracking-widest backdrop-blur-md border border-white/20 ${estaAbierto(res.hora_apertura, res.hora_cierre) ? 'bg-green-500 text-white' : 'bg-slate-800/90 text-white'}`}>
                    <div className={`w-1.5 h-1.5 rounded-full ${estaAbierto(res.hora_apertura, res.hora_cierre) ? 'bg-white animate-pulse' : 'bg-red-400'}`} />
                    {estaAbierto(res.hora_apertura, res.hora_cierre) ? 'Abierto' : 'Cerrado'}
                  </div>
                </div>
                
                <div className="p-7 flex flex-col flex-grow">
                  <h3 className="text-xl font-bold text-slate-900 mb-1 group-hover:text-orange-500 transition-colors line-clamp-1">
                    {res.nombre}
                  </h3>
                  <p className="text-slate-400 text-[10px] mb-4 font-bold uppercase tracking-[0.1em]">
                    {res.categorias?.[0] || 'Restaurante'} · {res.hora_apertura?.slice(0,5)} - {res.hora_cierre?.slice(0,5)}
                  </p>
                  
                  {/* Categorías extra */}
                  {res.categorias && res.categorias.length > 1 && (
                    <div className="flex flex-wrap gap-1.5 mb-4">
                      {res.categorias.slice(1).map(cat => (
                        <span key={cat} className="text-[10px] font-bold bg-orange-50 text-orange-500 px-2 py-0.5 rounded-full border border-orange-100">
                          {cat}
                        </span>
                      ))}
                    </div>
                  )}
                  
                  <div className="flex items-center justify-between pt-5 border-t border-slate-50 mt-auto">
                    <span className="text-sm font-bold text-orange-500 flex items-center gap-1">
                      <Star size={13} className="fill-orange-500" />
                      Más pedido
                    </span>
                    <div className="w-9 h-9 bg-slate-50 rounded-xl flex items-center justify-center text-slate-300 group-hover:bg-gradient-to-br group-hover:from-orange-500 group-hover:to-red-500 group-hover:text-white transition-all transform group-hover:translate-x-0.5">
                      <ArrowRight size={18} />
                    </div>
                  </div>
                </div>
              </Link>
            ))}
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
                Estrella<span className="text-orange-500">Delivery</span>
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
          © {new Date().getFullYear()} Estrella Delivery · Comitán de Domínguez, Chiapas
        </div>
      </footer>
    </div>
  )
}
