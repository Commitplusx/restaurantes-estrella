import { useState, useMemo, useRef } from 'react';
import { Search, ChevronRight, Store, Star, Clock, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence, useScroll, useMotionValue, useMotionValueEvent } from 'framer-motion';

interface SearchViewProps {
  restaurantes: any[];
  estaAbierto: (r: any) => boolean;
  activeCategories?: any[];
}

export function SearchView({ restaurantes, estaAbierto, activeCategories = [] }: SearchViewProps) {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredRestaurantes = useMemo(() => {
    if (!searchTerm.trim()) return [];
    
    const normalize = (text: string) => text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    const searchNormalized = normalize(searchTerm);

    return restaurantes.filter(r => 
      normalize(r.nombre).includes(searchNormalized) ||
      r.tags?.some((tag: string) => normalize(tag).includes(searchNormalized)) ||
      r.categorias?.some((c: string) => normalize(c).includes(searchNormalized))
    );
  }, [restaurantes, searchTerm]);

  const scrollRef = useRef<HTMLDivElement>(null);
  const { scrollY } = useScroll({ container: scrollRef });
  const headerY = useMotionValue(0);

  useMotionValueEvent(scrollY, "change", (latest) => {
    const previous = scrollY.getPrevious() || 0;
    const delta = latest - previous;
    
    if (latest < 50) {
      headerY.set(0);
    } else {
      const currentY = headerY.get();
      // El header mide aprox 120px. Limitamos entre -120 y 0.
      const newY = Math.max(Math.min(currentY - delta, 0), -120);
      headerY.set(newY);
    }
  });

  return (
    <div 
      ref={scrollRef}
      className="absolute inset-0 bg-slate-50 overflow-y-auto overscroll-contain pb-32 px-4 h-[100dvh]"
    >
      {/* Header y Buscador */}
      <motion.div 
        style={{ y: headerY }}
        className="sticky top-0 z-20 bg-slate-50 pt-[80px] pb-4 px-1"
      >
        <div className="flex items-center gap-3 mb-4">
          <AnimatePresence>
            {searchTerm.trim() && (
              <motion.button 
                initial={{ opacity: 0, scale: 0.8, width: 0 }}
                animate={{ opacity: 1, scale: 1, width: '40px' }}
                exit={{ opacity: 0, scale: 0.8, width: 0 }}
                onClick={() => setSearchTerm('')}
                className="h-10 bg-white rounded-full flex items-center justify-center shadow-sm text-slate-800 active:scale-95 transition-transform shrink-0"
              >
                <ArrowLeft size={22} />
              </motion.button>
            )}
          </AnimatePresence>
          <h2 className="text-2xl font-black text-slate-800">
            {searchTerm.trim() ? 'Resultados' : 'Buscar'}
          </h2>
        </div>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <Search size={20} className="text-slate-400" />
          </div>
          <input
            type="text"
            placeholder="Restaurantes, platillos, antojos..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-white border-none rounded-2xl py-4 pl-12 pr-4 text-slate-800 font-medium placeholder:text-slate-400 focus:ring-2 focus:ring-orange-500 shadow-sm transition-shadow outline-none"
          />
        </div>
      </motion.div>

      {/* Estado Inicial: Categorías */}
      {!searchTerm.trim() && activeCategories.length > 0 && (
        <div className="mt-2 px-1">
          <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4">Categorías Populares</h3>
          <div className="flex flex-col gap-3">
            {activeCategories.map((cat, index) => (
              <motion.button
                key={cat.name}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
                onClick={() => setSearchTerm(cat.name)}
                className="bg-white rounded-[20px] flex items-center shadow-sm border border-slate-100 active:scale-[0.98] transition-transform overflow-hidden relative group p-3 gap-4"
              >
                <div className="w-[60px] h-[60px] rounded-[14px] overflow-hidden shrink-0 bg-slate-50 border border-slate-100">
                  <img src={cat.image} alt={cat.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                </div>
                <span className="font-bold text-slate-800 text-[16px] flex-1 text-left">{cat.name}</span>
                <ChevronRight size={20} className="text-slate-300 mr-2 group-hover:translate-x-1 transition-transform" />
              </motion.button>
            ))}
          </div>
        </div>
      )}

      {/* Resultados de búsqueda */}
      {searchTerm.trim() && (
        <div className="mt-4 flex flex-col gap-3 px-1">
          <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-2">
            Resultados ({filteredRestaurantes.length})
          </h3>
          
          <AnimatePresence mode="popLayout">
          {filteredRestaurantes.length > 0 ? (
            filteredRestaurantes.map((res, index) => (
              <motion.div
                key={res.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
              >
                <Link
                  to={`/menu/${res.slug || res.id}`}
                  state={{ fromSearch: true }}
                  className="bg-white p-3 rounded-2xl flex gap-4 items-center shadow-sm border border-slate-100 active:scale-[0.98] transition-transform"
                >
                  <div className="w-16 h-16 rounded-xl bg-slate-100 overflow-hidden shrink-0 relative">
                    {res.foto_fachada_url ? (
                      <img 
                        src={res.foto_fachada_url} 
                        alt={res.nombre} 
                        className="w-full h-full object-cover" 
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                          (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                        }}
                      />
                    ) : null}
                    <div className={`w-full h-full flex items-center justify-center bg-orange-100 ${res.foto_fachada_url ? 'hidden' : ''}`}>
                      <Store size={20} className="text-orange-500" />
                    </div>
                    {!estaAbierto(res) && (
                      <div className="absolute inset-0 bg-black/60 backdrop-blur-[1px] flex items-center justify-center">
                        <span className="text-[9px] font-bold text-white tracking-wider px-1 text-center leading-tight">CERRADO</span>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-slate-800 text-base truncate pr-2">{res.nombre}</h4>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="flex items-center gap-1 text-[11px] font-bold text-amber-500 bg-amber-50 px-1.5 py-0.5 rounded-md">
                        <Star size={10} className="fill-amber-500" />
                        <span>{res.rating || '4.5'}</span>
                      </div>
                      {res.tiempo_preparacion && (
                        <div className="flex items-center gap-1 text-[11px] font-semibold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded-md">
                          <Clock size={10} />
                          <span>{res.tiempo_preparacion} min</span>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center shrink-0">
                    <ChevronRight size={16} className="text-slate-400" />
                  </div>
                </Link>
              </motion.div>
            ))
          ) : (
            <div className="py-12 flex flex-col items-center justify-center text-center">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                <Search size={24} className="text-slate-400" />
              </div>
              <p className="text-slate-500 font-medium">No encontramos restaurantes para "{searchTerm}"</p>
              <button 
                onClick={() => setSearchTerm('')}
                className="mt-4 text-orange-500 font-bold text-sm"
              >
                Limpiar búsqueda
              </button>
            </div>
          )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
