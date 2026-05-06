import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import type { Restaurante, MenuCategoria, MenuItem, MenuCombo, MenuPromocion } from '../lib/supabase'
import { 
  Store, 
  Plus, 
  Minus, 
  ShoppingBag, 
  MessageCircle, 
  AlertCircle, 
  Loader2, 
  Star, 
  Flame,
  Clock,
  MapPin,
  ChevronLeft,
  X
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

export type CartItem = {
  id: string;
  nombre: string;
  precio: number;
  tipo: 'item' | 'combo' | 'promo';
}

export function PublicMenuView() {
  const { id } = useParams()
  const [restaurante, setRestaurante] = useState<Restaurante | null>(null)
  
  const [categorias, setCategorias] = useState<MenuCategoria[]>([])
  const [items, setItems] = useState<MenuItem[]>([])
  const [combos, setCombos] = useState<MenuCombo[]>([])
  const [promos, setPromos] = useState<MenuPromocion[]>([])
  
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'menu' | 'combos' | 'promos'>('menu')

  // Estado del carrito y drawer
  const [carrito, setCarrito] = useState<{item: CartItem, cantidad: number}[]>([])
  const [isCartOpen, setIsCartOpen] = useState(false)
  const [clienteNombre, setClienteNombre] = useState('')
  const [clienteTel, setClienteTel] = useState('')
  const [procesando, setProcesando] = useState(false)

  useEffect(() => {
    let isMounted = true

    async function load() {
      if (!id) return
      
      const { data: rest, error: restError } = await supabase
        .from('restaurantes')
        .select('*')
        .eq('id', id)
        .single()

      if (restError || !rest) {
        if (isMounted) {
          setError('Restaurante no encontrado.')
          setLoading(false)
        }
        return
      }

      if (isMounted) setRestaurante(rest)

      const [ { data: cats }, { data: prods }, { data: cmbs }, { data: prms } ] = await Promise.all([
        supabase.from('menu_categorias').select('*').eq('restaurante_id', id).eq('activa', true).order('orden'),
        supabase.from('menu_items').select('*').eq('restaurante_id', id).eq('disponible', true).order('orden'),
        supabase.from('menu_combos').select('*').eq('restaurante_id', id).eq('disponible', true),
        supabase.from('menu_promociones').select('*').eq('restaurante_id', id).eq('activa', true)
      ])

      if (isMounted) {
        setCategorias(cats || [])
        setItems(prods || [])
        setCombos(cmbs || [])
        const validPromos = (prms || []).filter(p => !p.fecha_fin || new Date(p.fecha_fin) >= new Date())
        setPromos(validPromos)
        setLoading(false)
      }
    }
    
    load()

    const channel = supabase.channel(`public-menu-${id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'menu_items', filter: `restaurante_id=eq.${id}` }, () => load())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'menu_categorias', filter: `restaurante_id=eq.${id}` }, () => load())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'menu_combos', filter: `restaurante_id=eq.${id}` }, () => load())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'menu_promociones', filter: `restaurante_id=eq.${id}` }, () => load())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'restaurantes', filter: `id=eq.${id}` }, () => load())
      .subscribe()

    return () => {
      isMounted = false
      supabase.removeChannel(channel)
    }
  }, [id])

  const addToCart = (product: CartItem) => {
    setCarrito(prev => {
      const exist = prev.find(p => p.item.id === product.id && p.item.tipo === product.tipo)
      if (exist) {
        return prev.map(p => p.item.id === product.id && p.item.tipo === product.tipo ? { ...p, cantidad: p.cantidad + 1 } : p)
      }
      return [...prev, { item: product, cantidad: 1 }]
    })
  }

  const removeFromCart = (productId: string, tipo: 'item' | 'combo' | 'promo') => {
    setCarrito(prev => {
      const exist = prev.find(p => p.item.id === productId && p.item.tipo === tipo)
      if (exist && exist.cantidad === 1) {
        return prev.filter(p => !(p.item.id === productId && p.item.tipo === tipo))
      }
      return prev
        .map(p => p.item.id === productId && p.item.tipo === tipo ? { ...p, cantidad: p.cantidad - 1 } : p)
        .filter(p => p.cantidad > 0)
    })
  }

  const getCantidad = (productId: string, tipo: 'item' | 'combo' | 'promo') => {
    return carrito.find(p => p.item.id === productId && p.item.tipo === tipo)?.cantidad || 0
  }

  const subtotal = carrito.reduce((sum, p) => sum + (p.item.precio * p.cantidad), 0)
  const cartCount = carrito.reduce((sum, p) => sum + p.cantidad, 0)

  const handlePedir = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!restaurante || carrito.length === 0) return
    if (!clienteNombre.trim() || !clienteTel.trim()) {
      alert("Por favor ingresa tu nombre y WhatsApp para continuar.")
      return
    }

    setProcesando(true)
    const ticketId = Math.random().toString(36).substring(2, 8).toUpperCase()
    const pedidoDetalles = carrito.map(p => {
      const tag = p.item.tipo === 'combo' ? '[COMBO] ' : p.item.tipo === 'promo' ? '[PROMO] ' : ''
      return `${p.cantidad}x ${tag}${p.item.nombre} ($${(p.item.precio * p.cantidad).toFixed(2)})`
    }).join('\n')

    try {
      await supabase.from('pedidos').insert([{
        cliente_tel: clienteTel,
        cliente_nombre: clienteNombre,
        restaurante: restaurante.nombre,
        descripcion: pedidoDetalles,
        estado: 'asignado',
        wb_message_id: ticketId
      }])
    } catch (err) { console.warn("Intercepción db fallida:", err) }

    const mensaje = `¡Hola *${restaurante.nombre}*! 👋\nSoy *${clienteNombre}* y quiero hacer el siguiente pedido:\n\n${pedidoDetalles}\n\n*Total a pagar: $${subtotal.toFixed(2)}*\n\n_(Ticket Web: #${ticketId})_`
    const telefonoDestino = restaurante.telefono || "529631234567"
    const waUrl = `https://wa.me/${telefonoDestino.replace(/\D/g, '')}?text=${encodeURIComponent(mensaje)}`
    
    setProcesando(false)
    setIsCartOpen(false)
    setCarrito([])
    window.open(waUrl, '_blank')
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-[#FAFAFA]">
      <Loader2 className="animate-spin text-orange-500 w-10 h-10" />
    </div>
  )

  if (error || !restaurante) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#FAFAFA] px-4 text-center">
      <AlertCircle className="w-16 h-16 text-red-400 mb-4" />
      <h2 className="text-2xl font-bold text-slate-800 mb-2">Restaurante no disponible</h2>
      <p className="text-slate-500 mb-6">{error || 'El menú que buscas no existe o fue desactivado.'}</p>
      <Link to="/" className="bg-orange-500 text-white px-8 py-3 rounded-2xl font-bold shadow-lg shadow-orange-200">Volver al Directorio</Link>
    </div>
  )

  return (
    <div className="min-h-screen bg-[#FAFAFA] text-slate-900 selection:bg-orange-100">

      {/* TOPBAR — solo con nombre, sin imagen fondo */}
      <header className="sticky top-0 bg-white/80 backdrop-blur-xl z-50 border-b border-slate-50/50 py-4 px-6 md:px-10 flex items-center gap-4 shadow-sm">
        <Link 
          to="/"
          className="p-2.5 bg-slate-100 hover:bg-orange-500 hover:text-white text-slate-500 rounded-xl transition-all"
        >
          <ChevronLeft size={20} />
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-black text-slate-900 truncate">{restaurante.nombre}</h1>
          <p className="text-xs text-slate-400 font-medium flex items-center gap-1">
            <MapPin size={12} /> {restaurante.direccion || 'Comitán, Chiapas'}
          </p>
        </div>
        {/* Botón carrito en header (desktop) */}
        <button
          onClick={() => setIsCartOpen(true)}
          className="hidden md:flex items-center gap-2 bg-orange-500 text-white px-5 py-2.5 rounded-xl font-bold shadow-lg shadow-orange-100 hover:bg-orange-600 transition-all relative"
        >
          <ShoppingBag size={18} />
          Carrito
          {cartCount > 0 && (
            <span className="absolute -top-2 -right-2 bg-slate-900 text-white text-[10px] font-black w-5 h-5 flex items-center justify-center rounded-full border-2 border-white">
              {cartCount}
            </span>
          )}
        </button>
      </header>

      <div className="max-w-[1400px] mx-auto p-6 md:p-12">
        <div className="flex flex-col lg:flex-row gap-12">
          
          {/* SIDEBAR INFO — foto del restaurante aquí */}
          <div className="lg:w-1/3">
            <div className="sticky top-28 space-y-6">
              <div className="bg-white rounded-[2.5rem] overflow-hidden border border-slate-100 shadow-sm">
                {/* Foto del restaurante en el sidebar — sin zoom exagerado */}
                <div className="h-48 w-full bg-slate-100 overflow-hidden flex items-center justify-center">
                  {restaurante.foto_fachada_url ? (
                    <img 
                      src={restaurante.foto_fachada_url} 
                      className="w-full h-full object-contain" 
                      alt={restaurante.nombre} 
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-orange-50 to-orange-100">
                      <Store size={48} className="text-orange-300" />
                    </div>
                  )}
                </div>

                <div className="p-8">
                  {/* Categorías del restaurante */}
                  {restaurante.categorias && restaurante.categorias.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-6">
                      {restaurante.categorias.map(cat => (
                        <span key={cat} className="text-[10px] font-black uppercase tracking-widest bg-orange-50 text-orange-600 px-3 py-1 rounded-full border border-orange-100">
                          {cat}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="space-y-5">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-orange-50 rounded-xl text-orange-500"><Clock size={18} /></div>
                      <div>
                        <p className="text-[10px] text-slate-400 font-black uppercase">Horario</p>
                        <p className="font-bold text-sm text-slate-700">{restaurante.hora_apertura?.slice(0,5)} - {restaurante.hora_cierre?.slice(0,5)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-amber-50 rounded-xl text-amber-500"><MapPin size={18} /></div>
                      <div>
                        <p className="text-[10px] text-slate-400 font-black uppercase">Ubicación</p>
                        <p className="font-bold text-sm text-slate-700">{restaurante.direccion || 'Comitán, Chiapas'}</p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-8 pt-8 border-t border-slate-50">
                    <button 
                      onClick={() => setIsCartOpen(true)}
                      className="w-full bg-slate-900 text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-3 hover:bg-orange-500 transition-all shadow-xl shadow-slate-100"
                    >
                      <ShoppingBag size={20} />
                      Ver Carrito ({cartCount})
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* MAIN MENU */}
          <div className="lg:w-2/3">
            
            {/* TABS DE NAVEGACIÓN */}
            {(combos.length > 0 || promos.length > 0) && (
              <div className="flex gap-2 mb-10 p-1.5 bg-white rounded-2xl border border-slate-100 shadow-sm w-fit">
                <button
                  onClick={() => setActiveTab('menu')}
                  className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${
                    activeTab === 'menu'
                      ? 'bg-slate-900 text-white shadow-md'
                      : 'text-slate-400 hover:text-slate-700'
                  }`}
                >
                  🍽️ Menú
                </button>
                {combos.length > 0 && (
                  <button
                    onClick={() => setActiveTab('combos')}
                    className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${
                      activeTab === 'combos'
                        ? 'bg-slate-900 text-white shadow-md'
                        : 'text-slate-400 hover:text-slate-700'
                    }`}
                  >
                    ⭐ Combos
                  </button>
                )}
                {promos.length > 0 && (
                  <button
                    onClick={() => setActiveTab('promos')}
                    className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${
                      activeTab === 'promos'
                        ? 'bg-orange-500 text-white shadow-md shadow-orange-100'
                        : 'text-slate-400 hover:text-slate-700'
                    }`}
                  >
                    🔥 Promos
                  </button>
                )}
              </div>
            )}

            {/* PRODUCT CATEGORIES (MENU TAB) */}
            {activeTab === 'menu' && (
              <div>
                {categorias.map(cat => {
                  const catItems = items.filter(i => i.categoria_id === cat.id)
                  if (catItems.length === 0) return null
                  return (
                    <div key={cat.id} className="mb-12">
                      <h3 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-3">
                        <span className="w-1.5 h-6 bg-orange-500 rounded-full" />
                        {cat.emoji} {cat.nombre}
                      </h3>
                      <div className="grid gap-4">
                        {catItems.map(item => {
                          const cartItem: CartItem = { id: item.id, nombre: item.nombre, precio: item.precio, tipo: 'item' }
                          const cant = getCantidad(item.id, 'item')
                          return (
                            <div key={item.id} className="bg-white p-4 rounded-3xl border border-slate-50 hover:border-orange-100 transition-all flex gap-6 items-center group shadow-sm hover:shadow-md">
                              <div className="w-24 h-24 md:w-28 md:h-28 rounded-2xl overflow-hidden bg-slate-50 shrink-0">
                                {item.foto_url ? (
                                  <img src={item.foto_url} className="w-full h-full object-cover group-hover:scale-105 transition-transform" alt={item.nombre} />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-slate-200"><Store size={32} /></div>
                                )}
                              </div>
                              <div className="flex-1">
                                <div className="flex justify-between items-start mb-1">
                                  <h4 className="font-bold text-slate-900 text-lg">{item.nombre}</h4>
                                  <span className="text-orange-600 font-black text-lg">${item.precio.toFixed(2)}</span>
                                </div>
                                <p className="text-slate-400 text-xs md:text-sm mb-4 line-clamp-2 leading-relaxed">{item.descripcion}</p>
                                <div className="flex justify-between items-center">
                                  {cant > 0 ? (
                                    <div className="flex items-center gap-3 bg-slate-50 rounded-xl px-2 py-1 border border-slate-100">
                                      <button onClick={() => removeFromCart(item.id, 'item')} className="p-1.5 bg-white rounded-lg text-slate-400 hover:text-orange-600"><Minus size={14} /></button>
                                      <span className="font-bold text-sm w-4 text-center">{cant}</span>
                                      <button onClick={() => addToCart(cartItem)} className="p-1.5 bg-orange-500 rounded-lg text-white"><Plus size={14} /></button>
                                    </div>
                                  ) : (
                                    <button 
                                      onClick={() => addToCart(cartItem)}
                                      className="bg-slate-900 hover:bg-orange-500 text-white font-bold text-xs px-6 py-2.5 rounded-xl transition-all flex items-center gap-2"
                                    >
                                      <Plus size={16} /> Añadir
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {/* COMBOS TAB */}
            {activeTab === 'combos' && (
              <div className="grid gap-6">
                {combos.map(combo => {
                  const cartItem: CartItem = { id: combo.id, nombre: combo.nombre, precio: combo.precio, tipo: 'combo' }
                  const cant = getCantidad(combo.id, 'combo')
                  return (
                    <div key={combo.id} className="bg-white p-5 rounded-[2rem] border border-orange-100 shadow-sm flex flex-col md:flex-row gap-6 items-center group relative">
                      <div className="w-full md:w-36 h-36 rounded-2xl overflow-hidden bg-slate-50 shrink-0">
                        {combo.foto_url ? (
                          <img src={combo.foto_url} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" alt={combo.nombre} />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-slate-200"><Star size={40} /></div>
                        )}
                      </div>
                      <div className="flex-1 text-center md:text-left">
                        <h4 className="font-bold text-slate-900 text-xl mb-1">{combo.nombre}</h4>
                        <p className="text-slate-400 text-sm mb-3">{combo.descripcion}</p>
                        <div className="flex flex-wrap gap-2 mb-4 justify-center md:justify-start">
                          {combo.incluye?.map((inc, i) => <span key={i} className="text-[10px] font-bold bg-slate-50 text-slate-500 px-2 py-1 rounded-md">✓ {inc}</span>)}
                        </div>
                        <div className="flex items-center justify-center md:justify-between">
                          <span className="text-orange-600 font-black text-2xl">${combo.precio.toFixed(2)}</span>
                          <div className="hidden md:block">
                            {cant > 0 ? (
                              <div className="flex items-center gap-3 bg-slate-100 rounded-xl px-2 py-1">
                                <button onClick={() => removeFromCart(combo.id, 'combo')} className="p-1.5 bg-white rounded-lg text-slate-400 hover:text-orange-600"><Minus size={14} /></button>
                                <span className="font-bold text-sm w-4 text-center">{cant}</span>
                                <button onClick={() => addToCart(cartItem)} className="p-1.5 bg-orange-500 rounded-lg text-white"><Plus size={14} /></button>
                              </div>
                            ) : (
                              <button onClick={() => addToCart(cartItem)} className="bg-slate-900 hover:bg-orange-500 text-white font-bold text-xs px-6 py-2.5 rounded-xl transition-all">Añadir</button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {/* PROMOS TAB */}
            {activeTab === 'promos' && (
              <div className="grid gap-6">
                {promos.map(promo => {
                  const cartItem: CartItem = { id: promo.id, nombre: promo.titulo, precio: promo.precio_especial || 0, tipo: 'promo' }
                  const cant = getCantidad(promo.id, 'promo')
                  return (
                    <div key={promo.id} className="bg-white p-5 rounded-[2rem] border border-red-100 shadow-sm flex flex-col md:flex-row gap-6 items-center group relative overflow-hidden">
                      <div className="absolute top-0 right-0 bg-red-500 text-white text-[10px] font-black px-4 py-1.5 rounded-bl-2xl uppercase tracking-widest">Oferta</div>
                      <div className="w-full md:w-36 h-36 rounded-2xl overflow-hidden bg-slate-50 shrink-0">
                        {promo.foto_url ? (
                          <img src={promo.foto_url} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" alt={promo.titulo} />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-slate-200"><Flame size={40} /></div>
                        )}
                      </div>
                      <div className="flex-1 text-center md:text-left">
                        <h4 className="font-bold text-slate-900 text-xl mb-1">{promo.titulo}</h4>
                        <p className="text-slate-400 text-sm mb-4 line-clamp-2">{promo.descripcion}</p>
                        <div className="flex items-center justify-center md:justify-between">
                          <span className="text-red-500 font-black text-2xl">${promo.precio_especial?.toFixed(2)}</span>
                          <div className="hidden md:block">
                            {cant > 0 ? (
                              <div className="flex items-center gap-3 bg-slate-100 rounded-xl px-2 py-1">
                                <button onClick={() => removeFromCart(promo.id, 'promo')} className="p-1.5 bg-white rounded-lg text-slate-400 hover:text-red-600"><Minus size={14} /></button>
                                <span className="font-bold text-sm w-4 text-center">{cant}</span>
                                <button onClick={() => addToCart(cartItem)} className="p-1.5 bg-red-500 rounded-lg text-white"><Plus size={14} /></button>
                              </div>
                            ) : (
                              <button onClick={() => addToCart(cartItem)} className="bg-slate-900 hover:bg-orange-500 text-white font-bold text-xs px-6 py-2.5 rounded-xl transition-all">Añadir</button>
                            )}
                          </div>
                        </div>
                        <div className="md:hidden mt-4">
                          <button onClick={() => addToCart(cartItem)} className="w-full bg-slate-900 text-white py-3 rounded-xl font-bold">Añadir al Carrito</button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* CARRITO DRAWER (RIGHT SIDE) */}
      <AnimatePresence>
        {isCartOpen && (
          <div className="fixed inset-0 z-[100] transition-opacity duration-500">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" 
              onClick={() => setIsCartOpen(false)} 
            />
            <motion.div 
              initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="absolute top-0 right-0 bottom-0 w-full max-w-md bg-white shadow-2xl flex flex-col"
            >
              <div className="p-8 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
                <h2 className="text-2xl font-bold flex items-center gap-3">
                  Tu Carrito <span className="text-sm font-black bg-orange-500 text-white px-2 py-0.5 rounded-md">{cartCount}</span>
                </h2>
                <button onClick={() => setIsCartOpen(false)} className="p-2 hover:bg-white rounded-xl transition-colors"><X size={24} /></button>
              </div>

              <div className="flex-1 overflow-y-auto p-8 space-y-6">
                {carrito.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center opacity-30">
                    <ShoppingBag size={64} className="mb-4" />
                    <p className="font-bold text-xl">Tu carrito está vacío</p>
                    <p className="text-sm">¡Agrega algo delicioso!</p>
                  </div>
                ) : (
                  carrito.map(p => (
                    <div key={p.item.id + p.item.tipo} className="flex gap-4 items-center animate-in fade-in slide-in-from-right-4">
                      <div className="w-16 h-16 rounded-xl bg-slate-50 overflow-hidden shrink-0 border border-slate-100 flex items-center justify-center">
                        <Store size={24} className="text-slate-200" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start mb-1">
                          <h4 className="font-bold text-slate-800 text-sm truncate">{p.item.nombre}</h4>
                          <span className="font-black text-orange-600 text-sm">${(p.item.precio * p.cantidad).toFixed(2)}</span>
                        </div>
                        <div className="flex items-center gap-3 mt-2">
                          <button onClick={() => removeFromCart(p.item.id, p.item.tipo)} className="p-1.5 bg-slate-50 hover:bg-orange-50 rounded-lg text-slate-400 hover:text-orange-600 transition-colors"><Minus size={14} /></button>
                          <span className="font-bold text-sm w-4 text-center">{p.cantidad}</span>
                          <button onClick={() => addToCart(p.item)} className="p-1.5 bg-slate-50 hover:bg-orange-50 rounded-lg text-slate-400 hover:text-orange-600 transition-colors"><Plus size={14} /></button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {carrito.length > 0 && (
                <div className="p-8 bg-slate-50 border-t border-slate-100 space-y-6">
                  <div className="space-y-4">
                    <input 
                      type="text" placeholder="Tu Nombre completo" value={clienteNombre} onChange={e=>setClienteNombre(e.target.value)}
                      className="w-full p-4 rounded-2xl border border-slate-200 focus:border-orange-500 outline-none text-sm bg-white shadow-sm"
                    />
                    <input 
                      type="tel" placeholder="WhatsApp (10 dígitos)" value={clienteTel} onChange={e=>setClienteTel(e.target.value)}
                      className="w-full p-4 rounded-2xl border border-slate-200 focus:border-orange-500 outline-none text-sm bg-white shadow-sm"
                    />
                  </div>
                  
                  <div className="pt-4 border-t border-slate-200">
                    <div className="flex justify-between items-center text-slate-900 font-black text-2xl mb-4">
                      <span>Total</span>
                      <span>${subtotal.toFixed(2)}</span>
                    </div>
                    <button 
                      onClick={handlePedir}
                      disabled={procesando}
                      className="w-full bg-orange-500 hover:bg-emerald-700 text-white font-black py-4 rounded-2xl shadow-xl shadow-orange-100 transition-all flex items-center justify-center gap-3 active:scale-95"
                    >
                      {procesando ? <Loader2 className="animate-spin" /> : <MessageCircle />}
                      {procesando ? 'Procesando...' : 'Confirmar por WhatsApp'}
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MOBILE FLOATING CART BUTTON */}
      {carrito.length > 0 && !isCartOpen && (
        <div className="fixed bottom-6 left-0 right-0 z-50 px-6 md:hidden">
          <button 
            onClick={() => setIsCartOpen(true)}
            className="w-full bg-emerald-600 text-white py-4 rounded-2xl font-black shadow-2xl flex items-center justify-between px-6"
          >
            <div className="flex items-center gap-3">
              <ShoppingBag />
              <span>Ver Carrito ({cartCount})</span>
            </div>
            <span>${subtotal.toFixed(2)}</span>
          </button>
        </div>
      )}

    </div>
  )
}
