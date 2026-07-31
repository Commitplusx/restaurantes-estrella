import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Search, ChevronRight, Store, Star, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';

interface SearchViewProps {
  restaurantes: any[];
  estaAbierto: (r: any) => boolean;
}

const CATEGORIAS = [
  { id: 'hamburguesas', nombre: 'Hamburguesas', emoji: '🍔' },
  { id: 'pizza', nombre: 'Pizza', emoji: '🍕' },
  { id: 'tacos', nombre: 'Tacos', emoji: '🌮' },
  { id: 'sushi', nombre: 'Sushi', emoji: '🍣' },
  { id: 'postres', nombre: 'Postres', emoji: '🍰' },
  { id: 'saludable', nombre: 'Saludable', emoji: '🥗' },
];

export function SearchView({ restaurantes, estaAbierto }: SearchViewProps) {
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

  return (
    <div className="absolute inset-0 bg-slate-50 overflow-y-auto pb-28 px-4">
      {/* Header y Buscador */}
      <div className="sticky top-0 z-10 bg-slate-50 pt-[80px] pb-4">
        <h2 className="text-2xl font-black text-slate-800 mb-4 px-1">Buscar</h2>
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
      </div>

      {/* Estado Inicial: Categorías */}
      {!searchTerm.trim() && (
        <div className="mt-6 px-1">
          <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4">Categorías Populares</h3>
          <div className="grid grid-cols-2 gap-3">
            {CATEGORIAS.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSearchTerm(cat.nombre)}
                className="bg-white p-4 rounded-2xl flex flex-col items-center justify-center gap-2 shadow-sm border border-slate-100 active:scale-95 transition-transform"
              >
                <span className="text-3xl">{cat.emoji}</span>
                <span className="font-semibold text-slate-700 text-sm">{cat.nombre}</span>
              </button>
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
          
          {filteredRestaurantes.length > 0 ? (
            filteredRestaurantes.map(res => (
              <Link
                key={res.id}
                to={`/menu/${res.slug || res.id}`}
                className="bg-white p-3 rounded-2xl flex gap-4 items-center shadow-sm border border-slate-100 active:scale-[0.98] transition-transform"
              >
                <div className="w-16 h-16 rounded-xl bg-slate-100 overflow-hidden shrink-0 relative">
                  {res.foto_fachada_url ? (
                    <img src={res.foto_fachada_url} alt={res.nombre} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-orange-100"><Store size={20} className="text-orange-500" /></div>
                  )}
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
        </div>
      )}
    </div>
  );
}
