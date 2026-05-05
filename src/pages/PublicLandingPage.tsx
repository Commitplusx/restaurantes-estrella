import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { motion } from 'framer-motion'
import { Clock, Star, Store, ArrowRight, Phone } from 'lucide-react'
import { Link } from 'react-router-dom'

interface Restaurante {
  id: string
  nombre: string
  foto_fachada_url: string
  hora_apertura: string
  hora_cierre: string
  telefono: string
}

export function PublicLandingPage() {
  const [restaurantes, setRestaurantes] = useState<Restaurante[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data, error } = await supabase
        .from('restaurantes')
        .select('id, nombre, foto_fachada_url, hora_apertura, hora_cierre, telefono')
        .eq('activo', true)
        .order('nombre')
      
      if (!error && data) setRestaurantes(data)
      setLoading(false)
    }
    load()
  }, [])

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Navbar */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center">
              <Store className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-xl text-slate-800 tracking-tight">Estrella<span className="text-orange-500">Delivery</span></span>
          </div>
          <Link to="/login" className="text-sm font-medium text-slate-600 hover:text-orange-500 transition-colors bg-slate-100 hover:bg-orange-50 px-4 py-2 rounded-full">
            Acceso a Socios
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <section className="bg-white border-b border-slate-100 py-16 lg:py-24 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-orange-50 rounded-full blur-3xl opacity-50 -translate-y-1/2 translate-x-1/2" />
        <div className="max-w-6xl mx-auto px-4 relative z-10 text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <span className="inline-block py-1 px-3 rounded-full bg-orange-100 text-orange-600 text-xs font-bold tracking-wider uppercase mb-4">
              La mejor selección
            </span>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-slate-900 tracking-tight mb-6 leading-tight">
              Tus restaurantes favoritos, <br className="hidden md:block"/> a un clic de distancia.
            </h1>
            <p className="text-lg text-slate-600 mb-8 max-w-2xl mx-auto">
              Descubre los comercios asociados a Estrella Delivery. Apoyamos el comercio local con entregas rápidas y seguras.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Grid de Restaurantes */}
      <section className="max-w-6xl mx-auto px-4 py-16">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-bold text-slate-800">Comercios Asociados</h2>
          <span className="text-sm text-slate-500 font-medium">{restaurantes.length} disponibles</span>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1,2,3,4,5,6].map(i => (
              <div key={i} className="bg-white rounded-2xl h-72 animate-pulse border border-slate-100 shadow-sm" />
            ))}
          </div>
        ) : restaurantes.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-3xl border border-slate-200 shadow-sm">
            <Store className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-slate-700">Aún no hay restaurantes</h3>
            <p className="text-slate-500">Pronto se añadirán nuevos comercios asociados.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {restaurantes.map((rest, index) => (
              <motion.div 
                initial={{ opacity: 0, y: 20 }} 
                animate={{ opacity: 1, y: 0 }} 
                transition={{ duration: 0.4, delay: index * 0.05 }}
                key={rest.id} 
                className="bg-white rounded-2xl overflow-hidden border border-slate-200 shadow-sm hover:shadow-xl transition-all duration-300 group flex flex-col"
              >
                <div className="h-48 relative overflow-hidden bg-slate-100">
                  {rest.foto_fachada_url ? (
                    <img 
                      src={rest.foto_fachada_url} 
                      alt={rest.nombre} 
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" 
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-slate-100">
                      <Store className="w-12 h-12 text-slate-300" />
                    </div>
                  )}
                  <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm px-2.5 py-1 rounded-full flex items-center gap-1 shadow-sm">
                    <Star className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500" />
                    <span className="text-xs font-bold text-slate-700">4.9</span>
                  </div>
                </div>
                
                <div className="p-5 flex flex-col flex-grow">
                  <h3 className="font-bold text-xl text-slate-800 mb-3 group-hover:text-orange-500 transition-colors line-clamp-1">{rest.nombre}</h3>
                  
                  <div className="space-y-2 mb-4 flex-grow">
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <Clock className="w-4 h-4 text-orange-500" />
                      <span>{rest.hora_apertura?.slice(0,5) || '09:00'} - {rest.hora_cierre?.slice(0,5) || '22:00'}</span>
                    </div>
                    {rest.telefono && (
                      <div className="flex items-center gap-2 text-sm text-slate-600">
                        <Phone className="w-4 h-4 text-green-500" />
                        <span>{rest.telefono}</span>
                      </div>
                    )}
                  </div>
                  
                  <a 
                    href="https://wa.me/529631234567" // Acá deberías poner el tel del admin o el link al portal del cliente
                    target="_blank" rel="noreferrer"
                    className="w-full flex items-center justify-center gap-2 py-2.5 bg-slate-50 text-slate-700 font-semibold rounded-xl hover:bg-orange-50 hover:text-orange-600 transition-colors border border-slate-200 hover:border-orange-200"
                  >
                    Ver Menú y Pedir
                    <ArrowRight className="w-4 h-4" />
                  </a>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </section>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-12">
        <div className="max-w-6xl mx-auto px-4 text-center">
          <div className="flex items-center justify-center gap-2 mb-6">
            <Store className="w-5 h-5 text-slate-400" />
            <span className="font-bold text-lg text-slate-400 tracking-tight">Estrella<span className="text-slate-300">Delivery</span></span>
          </div>
          <p className="text-slate-500 text-sm">© {new Date().getFullYear()} Estrella Delivery. Todos los derechos reservados.</p>
        </div>
      </footer>
    </div>
  )
}
