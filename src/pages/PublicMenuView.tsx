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
  X,
  Ticket,
  CheckCircle2
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

export type OpcionSeleccionada = {
  grupo: string;
  opcion: string;
  precio_extra: number;
}

export type CartItem = {
  id: string;
  nombre: string;
  precio: number;
  tipo: 'item' | 'combo' | 'promo';
  opcionesSeleccionadas?: OpcionSeleccionada[];
  cartItemId: string;
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
  const [carrito, setCarrito] = useState<{ item: CartItem & { foto_url?: string }, cantidad: number }[]>([])
  const [isCartOpen, setIsCartOpen] = useState(false)
  const [clienteNombre, setClienteNombre] = useState('')
  const [clienteTel, setClienteTel] = useState('')
  const [cuponCliente, setCuponCliente] = useState('')
  const [telError, setTelError] = useState(false)
  const [procesando, setProcesando] = useState(false)
  const [toastMsg, setToastMsg] = useState<{ title: string, message?: string, type?: 'success' | 'error' } | null>(null)

  // Estado para validación de cupones
  const [validandoCupon, setValidandoCupon] = useState(false)
  const [cuponValido, setCuponValido] = useState(false)
  const [descuento, setDescuento] = useState(0)

  // Estado del modal de opciones de producto
  const [selectedItemForOptions, setSelectedItemForOptions] = useState<MenuItem | null>(null)
  const [selectedOptionsState, setSelectedOptionsState] = useState<Record<string, Record<string, boolean>>>({})

  const showToast = (title: string, message?: string, type: 'success' | 'error' = 'success') => {
    setToastMsg({ title, message, type })
    setTimeout(() => setToastMsg(null), 3500)
  }

  const validarCuponBtn = async () => {
    if (!cuponCliente.trim()) return
    setValidandoCupon(true)

    try {
      const { data, error } = await supabase.rpc('validar_cupon_publico', { p_codigo: cuponCliente })

      if (error || !data?.ok) {
        showToast('Cupón Inválido', data?.error || 'El cupón no es válido o ya expiró', 'error')
        setCuponValido(false)
        setDescuento(0)
      } else {
        showToast('Cupón Aplicado', `¡Se descontarán $${data.monto.toFixed(2)} de tu orden!`, 'success')
        setCuponValido(true)
        setDescuento(data.monto)
      }
    } catch (err) {
      showToast('Error', 'Hubo un error de conexión', 'error')
    } finally {
      setValidandoCupon(false)
    }
  }

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

      const [{ data: cats }, { data: prods }, { data: cmbs }, { data: prms }] = await Promise.all([
        supabase.from('menu_categorias').select('*').eq('restaurante_id', id).order('orden'),
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

        // Bug #3: auto-select best available tab
        const hasItems = (prods || []).length > 0
        const hasCombos = (cmbs || []).length > 0
        const hasValidPromos = validPromos.length > 0
        if (!hasItems && hasCombos) setActiveTab('combos')
        else if (!hasItems && !hasCombos && hasValidPromos) setActiveTab('promos')
        else setActiveTab('menu')
      }
    }

    load()

    return () => {
      isMounted = false
    }
  }, [id])

  const addToCart = (product: CartItem & { foto_url?: string }) => {
    setCarrito(prev => {
      const exist = prev.find(p => p.item.cartItemId === product.cartItemId)
      if (exist) {
        return prev.map(p => p.item.cartItemId === product.cartItemId ? { ...p, cantidad: p.cantidad + 1 } : p)
      }
      return [...prev, { item: product, cantidad: 1 }]
    })
  }

  const removeFromCart = (cartItemId: string) => {
    setCarrito(prev => {
      const exist = prev.find(p => p.item.cartItemId === cartItemId)
      if (exist && exist.cantidad === 1) {
        return prev.filter(p => p.item.cartItemId !== cartItemId)
      }
      return prev
        .map(p => p.item.cartItemId === cartItemId ? { ...p, cantidad: p.cantidad - 1 } : p)
        .filter(p => p.cantidad > 0)
    })
  }

  const getCantidadTotal = (productId: string, tipo: 'item' | 'combo' | 'promo') => {
    return carrito.filter(p => p.item.id === productId && p.item.tipo === tipo).reduce((sum, p) => sum + p.cantidad, 0)
  }

  const subtotal = carrito.reduce((sum, p) => sum + (p.item.precio * p.cantidad), 0)
  const cartCount = carrito.reduce((sum, p) => sum + p.cantidad, 0)

  const total = Math.max(0, subtotal - descuento)

  // Bug #5: reset fields when closing cart without ordering
  const closeCart = () => {
    setIsCartOpen(false)
    setTelError(false)
  }

  const handlePedir = async () => {
    if (!restaurante || carrito.length === 0) return
    if (!clienteNombre.trim()) {
      showToast('Falta el nombre', 'Por favor ingresa tu nombre para continuar', 'error')
      return
    }
    // Bug #1: proper phone validation
    const telLimpio = clienteTel.replace(/\D/g, '')
    if (telLimpio.length < 10) {
      setTelError(true)
      return
    }
    setTelError(false)

    setProcesando(true)
    const ticketId = Math.random().toString(36).substring(2, 8).toUpperCase()
    const pedidoDetalles = carrito.map(p => {
      const tag = p.item.tipo === 'combo' ? '[COMBO] ' : p.item.tipo === 'promo' ? '[PROMO] ' : ''
      let optionsStr = ''
      if (p.item.opcionesSeleccionadas && p.item.opcionesSeleccionadas.length > 0) {
        optionsStr = '\n  └ ' + p.item.opcionesSeleccionadas.map(o => `+ ${o.opcion}`).join(', ')
      }
      return `${p.cantidad}x ${tag}${p.item.nombre} ($${(p.item.precio * p.cantidad).toFixed(2)})${optionsStr}`
    }).join('\n')

    try {
      await supabase.from('pedidos').insert([{
        cliente_tel: telLimpio,
        cliente_nombre: clienteNombre.trim(),
        restaurante: restaurante.nombre,
        descripcion: pedidoDetalles,
        estado: 'asignado',
        wb_message_id: ticketId
      }])
    } catch (err) { console.warn('Intercepción db fallida:', err) }

    const textoCupon = cuponValido ? `\n🎁 *Cupón aplicado:* ${cuponCliente.trim()} (-$${descuento.toFixed(2)})` : cuponCliente.trim() ? `\n🎟️ *Cupón a canjear:* ${cuponCliente.trim()}` : ''
    const mensaje = `¡Hola *${restaurante.nombre}*! 👋\nSoy *${clienteNombre.trim()}* y quiero hacer el siguiente pedido:\n\n${pedidoDetalles}\n\n*Subtotal:* $${subtotal.toFixed(2)}${textoCupon}\n*Total a pagar: $${total.toFixed(2)}*\n\n_(Ticket Web: #${ticketId})_`

    // se envia el mensaje al restaurante
    const numeroRestaurante = restaurante.telefono ? restaurante.telefono.replace(/\D/g, '') : ''
    const waUrl = `https://wa.me/${numeroRestaurante}?text=${encodeURIComponent(mensaje)}`

    setProcesando(false)
    setIsCartOpen(false)
    setCarrito([])
    setClienteNombre('')
    setClienteTel('')
    setCuponCliente('')
    setCuponValido(false)
    setDescuento(0)
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

      {/* TOPBAR */}
      <header className="sticky top-0 bg-white/80 backdrop-blur-xl z-50 border-b border-slate-50/50 py-3 px-4 md:px-10 flex items-center gap-3 shadow-sm">
        <Link
          to="/"
          className="p-2 bg-slate-100 hover:bg-orange-500 hover:text-white text-slate-500 rounded-xl transition-all shrink-0"
        >
          <ChevronLeft size={20} />
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-base md:text-lg font-black text-slate-900 truncate">{restaurante.nombre}</h1>
          <p className="text-[11px] text-slate-400 font-medium hidden sm:flex items-center gap-1">
            <MapPin size={11} /> {restaurante.direccion || 'Comitán, Chiapas'}
          </p>
        </div>
        {/* Carrito: visible en header en todo momento */}
        <button
          onClick={() => setIsCartOpen(true)}
          className="flex items-center gap-2 bg-orange-500 text-white px-4 py-2 rounded-xl font-bold shadow-lg shadow-orange-100 hover:bg-orange-600 transition-all relative text-sm"
        >
          <ShoppingBag size={16} />
          <span className="hidden sm:inline">Carrito</span>
          {cartCount > 0 && (
            <span className="bg-slate-900 text-white text-[10px] font-black w-5 h-5 flex items-center justify-center rounded-full ml-0.5">
              {cartCount}
            </span>
          )}
        </button>
      </header>

      <div className="max-w-[1400px] mx-auto px-4 py-4 md:p-12">

        {/* INFO DEL RESTAURANTE — compacto en móvil, sidebar en desktop */}

        {/* MOBILE: tarjeta horizontal compacta */}
        <div className="lg:hidden mb-4">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-3 flex items-center gap-3">
            {/* Foto pequeña */}
            <div className="w-14 h-14 rounded-xl overflow-hidden bg-orange-50 shrink-0 flex items-center justify-center">
              {restaurante.foto_fachada_url ? (
                <img src={restaurante.foto_fachada_url} className="w-full h-full object-contain" alt={restaurante.nombre} />
              ) : (
                <Store size={22} className="text-orange-300" />
              )}
            </div>
            {/* Info */}
            <div className="flex-1 min-w-0">
              <p className="font-black text-slate-900 text-sm truncate">{restaurante.nombre}</p>
              <p className="text-[11px] text-slate-400 truncate">{restaurante.direccion || 'Comitán, Chiapas'}</p>
              <p className="text-[11px] text-orange-500 font-bold">
                {restaurante.hora_apertura?.slice(0, 5)} – {restaurante.hora_cierre?.slice(0, 5)}
              </p>
            </div>
            {/* Categorias */}
            {restaurante.categorias?.[0] && (
              <span className="text-[9px] font-black uppercase tracking-wider bg-orange-50 text-orange-500 px-2 py-1 rounded-full border border-orange-100 shrink-0">
                {restaurante.categorias[0]}
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-8">

          {/* SIDEBAR INFO — solo visible en desktop */}
          <div className="hidden lg:block lg:w-1/3">
            <div className="sticky top-24 space-y-6">
              <div className="bg-white rounded-[2.5rem] overflow-hidden border border-slate-100 shadow-sm">
                {/* Foto del restaurante */}
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
                        <p className="font-bold text-sm text-slate-700">{restaurante.hora_apertura?.slice(0, 5)} - {restaurante.hora_cierre?.slice(0, 5)}</p>
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
          <div className="w-full lg:w-2/3">

            {/* TABS DE NAVEGACIÓN */}
            {(combos.length > 0 || promos.length > 0) && (
              <div className="flex gap-2 mb-6 p-1.5 bg-white rounded-2xl border border-slate-100 shadow-sm w-fit max-w-full overflow-x-auto">
                <button
                  onClick={() => setActiveTab('menu')}
                  className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === 'menu'
                    ? 'bg-slate-900 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-700'
                    }`}
                >
                  🍽️ Menú
                </button>
                {combos.length > 0 && (
                  <button
                    onClick={() => setActiveTab('combos')}
                    className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === 'combos'
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
                    className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === 'promos'
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
                    <motion.div
                      key={cat.id}
                      className="mb-12"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4 }}
                    >
                      <h3 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-3">
                        <span className="w-1.5 h-6 bg-orange-500 rounded-full" />
                        {cat.emoji} {cat.nombre}
                      </h3>
                      <div className="grid gap-4">
                        {catItems.map(item => {
                          const cartItem = { id: item.id, nombre: item.nombre, precio: item.precio, tipo: 'item' as const, foto_url: item.foto_url || undefined }
                          const cantTotal = getCantidadTotal(item.id, 'item')
                          return (
                            <div key={item.id} className="bg-white p-4 rounded-3xl border border-slate-50 hover:border-orange-100 transition-all flex gap-6 items-center group shadow-sm hover:shadow-md">
                              <div className="w-24 h-24 md:w-28 md:h-28 rounded-2xl overflow-hidden bg-slate-50 shrink-0 cursor-pointer" onClick={() => {
                                if (item.opciones && item.opciones.length > 0) {
                                  setSelectedItemForOptions(item)
                                  setSelectedOptionsState({})
                                } else {
                                  addToCart({ ...cartItem, cartItemId: item.id })
                                }
                              }}>
                                {item.foto_url ? (
                                  <img src={item.foto_url} loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition-transform" alt={item.nombre} />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-slate-200"><Store size={32} /></div>
                                )}
                              </div>
                              <div className="flex-1">
                                <div className="flex justify-between items-start mb-1 cursor-pointer" onClick={() => {
                                  if (item.opciones && item.opciones.length > 0) {
                                    setSelectedItemForOptions(item)
                                    setSelectedOptionsState({})
                                  } else {
                                    addToCart({ ...cartItem, cartItemId: item.id })
                                  }
                                }}>
                                  <h4 className="font-bold text-slate-900 text-lg">{item.nombre}</h4>
                                  <span className="text-orange-600 font-black text-lg">${item.precio.toFixed(2)}</span>
                                </div>
                                <p className="text-slate-400 text-xs md:text-sm mb-4 line-clamp-2 leading-relaxed">{item.descripcion}</p>
                                <div className="flex justify-between items-center">
                                  {item.opciones && item.opciones.length > 0 ? (
                                    <button
                                      onClick={() => {
                                        setSelectedItemForOptions(item)
                                        setSelectedOptionsState({})
                                      }}
                                      className="bg-slate-100 hover:bg-orange-50 text-slate-700 hover:text-orange-600 font-bold text-xs px-6 py-2.5 rounded-xl transition-all flex items-center gap-2"
                                    >
                                      Opciones {cantTotal > 0 && <span className="bg-orange-500 text-white px-1.5 py-0.5 rounded-md text-[10px]">{cantTotal}</span>}
                                    </button>
                                  ) : cantTotal > 0 ? (
                                    <div className="flex items-center gap-3 bg-slate-50 rounded-xl px-2 py-1 border border-slate-100">
                                      <button onClick={() => removeFromCart(item.id)} className="p-1.5 bg-white rounded-lg text-slate-400 hover:text-orange-600"><Minus size={14} /></button>
                                      <span className="font-bold text-sm w-4 text-center">{cantTotal}</span>
                                      <button onClick={() => addToCart({ ...cartItem, cartItemId: item.id })} className="p-1.5 bg-orange-500 rounded-lg text-white"><Plus size={14} /></button>
                                    </div>
                                  ) : (
                                    <button
                                      onClick={() => addToCart({ ...cartItem, cartItemId: item.id })}
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
                    </motion.div>
                  )
                })}
              </div>
            )}

            {/* Empty state for menu tab */}
            {activeTab === 'menu' && items.length === 0 && !loading && (
              <div className="text-center py-16 text-slate-400">
                <Store size={40} className="mx-auto mb-3 opacity-30" />
                <p className="font-bold">Este restaurante aún no tiene platillos publicados</p>
              </div>
            )}

            {/* COMBOS TAB */}
            {activeTab === 'combos' && (
              <div className="grid gap-6">
                {combos.map(combo => {
                  const cartItem = { id: combo.id, nombre: combo.nombre, precio: combo.precio, tipo: 'combo' as const, foto_url: combo.foto_url || undefined, cartItemId: combo.id }
                  const cantTotal = getCantidadTotal(combo.id, 'combo')
                  return (
                    <motion.div
                      key={combo.id}
                      className="bg-white p-5 rounded-[2rem] border border-orange-100 shadow-sm flex flex-col md:flex-row gap-6 items-center group relative"
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.3 }}
                    >
                      <div className="w-full md:w-36 h-36 rounded-2xl overflow-hidden bg-slate-50 shrink-0">
                        {combo.foto_url ? (
                          <img src={combo.foto_url} loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" alt={combo.nombre} />
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
                        <div className="flex items-center justify-between mt-2 w-full">
                          <span className="text-orange-600 font-black text-2xl">${combo.precio.toFixed(2)}</span>
                          <div>
                            {cantTotal > 0 ? (
                              <div className="flex items-center gap-3 bg-slate-100 rounded-xl px-2 py-1">
                                <button onClick={() => removeFromCart(combo.id)} className="p-1.5 bg-white rounded-lg text-slate-400 hover:text-orange-600"><Minus size={14} /></button>
                                <span className="font-bold text-sm w-4 text-center">{cantTotal}</span>
                                <button onClick={() => addToCart(cartItem)} className="p-1.5 bg-orange-500 rounded-lg text-white"><Plus size={14} /></button>
                              </div>
                            ) : (
                              <button onClick={() => addToCart(cartItem)} className="bg-slate-900 hover:bg-orange-500 text-white font-bold text-xs px-6 py-2.5 rounded-xl transition-all">Añadir</button>
                            )}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )
                })}
              </div>
            )}

            {/* PROMOS TAB */}
            {activeTab === 'promos' && (
              <div className="grid gap-6">
                {promos.map(promo => {
                  const cartItem = { id: promo.id, nombre: promo.titulo, precio: promo.precio_especial || 0, tipo: 'promo' as const, foto_url: promo.foto_url || undefined, cartItemId: promo.id }
                  const cantTotal = getCantidadTotal(promo.id, 'promo')
                  return (
                    <motion.div
                      key={promo.id}
                      className="bg-white p-5 rounded-[2rem] border border-red-100 shadow-sm flex flex-col md:flex-row gap-6 items-center group relative overflow-hidden"
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.3 }}
                    >
                      <div className="absolute top-0 right-0 bg-red-500 text-white text-[10px] font-black px-4 py-1.5 rounded-bl-2xl uppercase tracking-widest">Oferta</div>
                      <div className="w-full md:w-36 h-36 rounded-2xl overflow-hidden bg-slate-50 shrink-0">
                        {promo.foto_url ? (
                          <img src={promo.foto_url} loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" alt={promo.titulo} />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-slate-200"><Flame size={40} /></div>
                        )}
                      </div>
                      <div className="flex-1 text-center md:text-left">
                        <h4 className="font-bold text-slate-900 text-xl mb-1">{promo.titulo}</h4>
                        <p className="text-slate-400 text-sm mb-4 line-clamp-2">{promo.descripcion}</p>
                        <div className="flex items-center justify-between mt-2 w-full">
                          <span className="text-red-500 font-black text-2xl">${promo.precio_especial?.toFixed(2)}</span>
                          <div>
                            {cantTotal > 0 ? (
                              <div className="flex items-center gap-3 bg-slate-100 rounded-xl px-2 py-1">
                                <button onClick={() => removeFromCart(promo.id)} className="p-1.5 bg-white rounded-lg text-slate-400 hover:text-red-600"><Minus size={14} /></button>
                                <span className="font-bold text-sm w-4 text-center">{cantTotal}</span>
                                <button onClick={() => addToCart(cartItem)} className="p-1.5 bg-red-500 rounded-lg text-white"><Plus size={14} /></button>
                              </div>
                            ) : (
                              <button onClick={() => addToCart(cartItem)} className="bg-slate-900 hover:bg-orange-500 text-white font-bold text-xs px-6 py-2.5 rounded-xl transition-all">Añadir</button>
                            )}
                          </div>
                        </div>
                      </div>
                    </motion.div>
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
              <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-white">
                <h2 className="text-xl font-black flex items-center gap-3">
                  Tu Carrito <span className="text-sm font-black bg-orange-500 text-white px-2.5 py-0.5 rounded-lg">{cartCount}</span>
                </h2>
                <button onClick={closeCart} className="p-2 hover:bg-slate-100 rounded-xl transition-colors text-slate-500">
                  <X size={22} />
                </button>
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
                    <div key={p.item.id + p.item.tipo} className="flex gap-3 items-center">
                      {/* Bug #4: show product image if available */}
                      <div className="w-14 h-14 rounded-xl bg-slate-50 overflow-hidden shrink-0 border border-slate-100 flex items-center justify-center">
                        {p.item.foto_url ? (
                          <img src={p.item.foto_url} className="w-full h-full object-cover" alt={p.item.nombre} />
                        ) : (
                          <Store size={20} className="text-slate-300" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start mb-1">
                          <h4 className="font-bold text-slate-800 text-sm truncate pr-2">{p.item.nombre}</h4>
                          <span className="font-black text-orange-600 text-sm shrink-0">${(p.item.precio * p.cantidad).toFixed(2)}</span>
                        </div>
                        {p.item.opcionesSeleccionadas && p.item.opcionesSeleccionadas.length > 0 && (
                          <div className="text-[11px] text-slate-500 mb-1 leading-tight">
                            {p.item.opcionesSeleccionadas.map(o => o.opcion).join(', ')}
                          </div>
                        )}
                        <div className="flex items-center gap-2 mt-1.5">
                          <button onClick={() => removeFromCart(p.item.cartItemId)} className="p-1.5 bg-slate-100 hover:bg-red-50 rounded-lg text-slate-400 hover:text-red-500 transition-colors"><Minus size={13} /></button>
                          <span className="font-black text-sm w-5 text-center">{p.cantidad}</span>
                          <button onClick={() => addToCart(p.item)} className="p-1.5 bg-slate-100 hover:bg-orange-50 rounded-lg text-slate-400 hover:text-orange-500 transition-colors"><Plus size={13} /></button>
                          <span className="text-[11px] text-slate-400 ml-1">${p.item.precio.toFixed(2)} c/u</span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {carrito.length > 0 && (
                <div className="p-6 bg-white border-t border-slate-100 space-y-4">
                  <div className="space-y-3">
                    <input
                      type="text"
                      placeholder="Tu nombre completo *"
                      value={clienteNombre}
                      onChange={e => setClienteNombre(e.target.value)}
                      className="w-full p-3.5 rounded-2xl border border-slate-200 focus:border-orange-500 outline-none text-sm bg-slate-50"
                    />
                    <div>
                      <input
                        type="tel"
                        placeholder="WhatsApp (10 dígitos) *"
                        value={clienteTel}
                        onChange={e => { setClienteTel(e.target.value); setTelError(false) }}
                        className={`w-full p-3.5 rounded-2xl border outline-none text-sm bg-slate-50 transition-colors ${telError
                          ? 'border-red-400 focus:border-red-500 bg-red-50'
                          : 'border-slate-200 focus:border-orange-500'
                          }`}
                      />
                      {telError && <p className="text-red-500 text-xs mt-1 ml-1">Ingresa un número válido de 10 dígitos</p>}
                    </div>

                    {/* CUPÓN DE DESCUENTO */}
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Ticket size={16} className={`${cuponValido ? 'text-green-500' : 'text-orange-400'}`} />
                      </div>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="¿Tienes cupón? Ingrésalo"
                          value={cuponCliente}
                          onChange={e => {
                            setCuponCliente(e.target.value.toUpperCase());
                            if (cuponValido) { setCuponValido(false); setDescuento(0); }
                          }}
                          disabled={validandoCupon}
                          className={`w-full pl-9 p-3.5 rounded-2xl border outline-none text-sm uppercase placeholder:normal-case font-mono transition-colors ${cuponValido ? 'border-green-400 bg-green-50/50 text-green-700' : 'border-orange-100 focus:border-orange-500 bg-orange-50/30'}`}
                        />
                        <button
                          onClick={validarCuponBtn}
                          disabled={!cuponCliente || validandoCupon || cuponValido}
                          className="bg-slate-900 text-white px-4 rounded-xl font-bold text-sm disabled:opacity-50 transition-colors hover:bg-orange-600 flex items-center gap-2 shrink-0"
                        >
                          {validandoCupon ? <Loader2 size={16} className="animate-spin" /> : 'Aplicar'}
                        </button>
                      </div>
                      {cuponValido && (
                        <p className="text-xs font-bold text-green-600 mt-1 ml-1">✓ Cupón verificado (-${descuento.toFixed(2)})</p>
                      )}
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-100">
                    <div className="flex justify-between items-center text-slate-500 mb-2 text-sm font-bold">
                      <span>Subtotal</span>
                      <span className="text-slate-900">${subtotal.toFixed(2)}</span>
                    </div>
                    {descuento > 0 && (
                      <div className="flex justify-between items-center text-green-600 mb-3 text-sm font-bold">
                        <span className="flex items-center gap-1"><Ticket size={14} /> Descuento</span>
                        <span>-${descuento.toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex justify-between items-center text-slate-900 font-black text-xl mb-4 pt-3 border-t border-slate-100">
                      <span>Total</span>
                      <span className="text-orange-600">${total.toFixed(2)}</span>
                    </div>
                    <button
                      onClick={handlePedir}
                      disabled={procesando}
                      className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white font-black py-4 rounded-2xl shadow-lg shadow-orange-100 transition-all flex items-center justify-center gap-3 active:scale-95"
                    >
                      {procesando ? <Loader2 className="animate-spin" size={20} /> : <MessageCircle size={20} />}
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
            className="w-full bg-orange-500 text-white py-4 rounded-2xl font-black shadow-2xl flex items-center justify-between px-6"
          >
            <div className="flex items-center gap-3">
              <ShoppingBag />
              <span>Ver Carrito ({cartCount})</span>
            </div>
            <span>${subtotal.toFixed(2)}</span>
          </button>
        </div>
      )}

      {/* MODAL DE OPCIONES DE PRODUCTO */}
      <AnimatePresence>
        {selectedItemForOptions && (
          <div className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center p-0 sm:p-4">
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
              onClick={() => setSelectedItemForOptions(null)}
            />
            <motion.div
              initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="relative w-full sm:max-w-lg bg-white sm:rounded-[2.5rem] rounded-t-[2.5rem] shadow-2xl flex flex-col max-h-[90vh] overflow-hidden"
            >
              <div className="relative w-full h-48 bg-slate-100 shrink-0">
                {selectedItemForOptions.foto_url ? (
                  <img src={selectedItemForOptions.foto_url} className="w-full h-full object-cover" alt={selectedItemForOptions.nombre} />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-300"><Store size={48} /></div>
                )}
                <button onClick={() => setSelectedItemForOptions(null)} className="absolute top-4 right-4 p-2 bg-black/30 backdrop-blur-md text-white rounded-full hover:bg-black/50 transition-colors">
                  <X size={20} />
                </button>
              </div>
              <div className="p-6 shrink-0 border-b border-slate-100">
                <h3 className="text-2xl font-black text-slate-900">{selectedItemForOptions.nombre}</h3>
                <p className="text-slate-500 text-sm mt-1">{selectedItemForOptions.descripcion}</p>
              </div>
              
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {(selectedItemForOptions.opciones || []).map((grupo, gIdx) => {
                  const seleccionados = selectedOptionsState[grupo.titulo] || {};
                  const countSelected = Object.values(seleccionados).filter(Boolean).length;
                  
                  return (
                    <div key={gIdx}>
                      <div className="flex justify-between items-baseline mb-3">
                        <h4 className="font-bold text-slate-800 text-lg">{grupo.titulo}</h4>
                        {grupo.requerido && countSelected === 0 ? (
                          <span className="text-[10px] font-black uppercase tracking-widest bg-red-50 text-red-500 px-2 py-1 rounded-md">Requerido</span>
                        ) : grupo.maximo_selecciones > 1 ? (
                          <span className="text-[11px] text-slate-400 font-bold">Máx {grupo.maximo_selecciones}</span>
                        ) : null}
                      </div>
                      
                      <div className="space-y-2">
                        {grupo.opciones.map((opc, oIdx) => {
                          const isSelected = !!seleccionados[opc.nombre];
                          
                          const toggleOpcion = () => {
                            setSelectedOptionsState(prev => {
                              const groupState = { ...(prev[grupo.titulo] || {}) };
                              if (grupo.maximo_selecciones === 1) {
                                // Radio behavior
                                return { ...prev, [grupo.titulo]: { [opc.nombre]: true } }
                              } else {
                                // Checkbox behavior
                                if (isSelected) {
                                  delete groupState[opc.nombre];
                                } else {
                                  if (Object.values(groupState).filter(Boolean).length >= grupo.maximo_selecciones) return prev; // Limit reached
                                  groupState[opc.nombre] = true;
                                }
                                return { ...prev, [grupo.titulo]: groupState }
                              }
                            });
                          };

                          return (
                            <label key={oIdx} className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${isSelected ? 'border-orange-500 bg-orange-50/30' : 'border-slate-200 hover:border-slate-300'}`}>
                              <div className="flex items-center gap-3">
                                <div className="relative flex items-center justify-center">
                                  <input 
                                    type={grupo.maximo_selecciones === 1 ? 'radio' : 'checkbox'} 
                                    checked={isSelected}
                                    onChange={toggleOpcion}
                                    className="w-5 h-5 accent-orange-500 cursor-pointer"
                                  />
                                </div>
                                <span className={`text-sm font-bold ${isSelected ? 'text-slate-900' : 'text-slate-600'}`}>{opc.nombre}</span>
                              </div>
                              {opc.precio_extra > 0 && <span className="text-sm font-bold text-slate-500">+${(opc.precio_extra).toFixed(2)}</span>}
                            </label>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
              </div>
              
              <div className="p-6 border-t border-slate-100 bg-white shrink-0">
                <button
                  onClick={() => {
                    // Validar requeridos
                    const faltanRequeridos = (selectedItemForOptions.opciones || []).some(g => {
                      if (!g.requerido) return false;
                      const sel = selectedOptionsState[g.titulo] || {};
                      return Object.values(sel).filter(Boolean).length === 0;
                    });

                    if (faltanRequeridos) {
                      showToast('Faltan opciones', 'Por favor selecciona las opciones requeridas', 'error');
                      return;
                    }

                    // Calcular precio total y armar opciones
                    let precioExtra = 0;
                    const opcionesSel: OpcionSeleccionada[] = [];
                    
                    (selectedItemForOptions.opciones || []).forEach(g => {
                      g.opciones.forEach(o => {
                        if (selectedOptionsState[g.titulo]?.[o.nombre]) {
                          precioExtra += o.precio_extra;
                          opcionesSel.push({ grupo: g.titulo, opcion: o.nombre, precio_extra: o.precio_extra });
                        }
                      });
                    });

                    const hashId = selectedItemForOptions.id + '_' + opcionesSel.map(o => o.opcion).sort().join('_');
                    
                    const itemToAdd: CartItem = {
                      id: selectedItemForOptions.id,
                      cartItemId: hashId,
                      nombre: selectedItemForOptions.nombre,
                      precio: selectedItemForOptions.precio + precioExtra,
                      tipo: 'item',
                      opcionesSeleccionadas: opcionesSel
                    };
                    
                    addToCart({ ...itemToAdd, foto_url: selectedItemForOptions.foto_url || undefined });
                    setSelectedItemForOptions(null);
                    showToast('Agregado', `${selectedItemForOptions.nombre} añadido al carrito`);
                  }}
                  className="w-full bg-slate-900 hover:bg-orange-500 text-white font-black py-4 rounded-2xl shadow-lg transition-colors flex items-center justify-between px-6"
                >
                  <span>Añadir al Carrito</span>
                  <span>${(
                    selectedItemForOptions.precio + 
                    (selectedItemForOptions.opciones || []).reduce((sum, g) => {
                      return sum + g.opciones.reduce((s2, o) => {
                        return s2 + (selectedOptionsState[g.titulo]?.[o.nombre] ? o.precio_extra : 0);
                      }, 0);
                    }, 0)
                  ).toFixed(2)}</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* TOAST NOTIFICATION */}
      <AnimatePresence>
        {toastMsg && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="fixed bottom-24 md:bottom-10 left-1/2 -translate-x-1/2 z-[200]"
          >
            <div className={`flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-2xl shadow-slate-200/50 border font-medium ${toastMsg.type === 'error' ? 'bg-red-50 border-red-100 text-red-800' : 'bg-slate-900 border-slate-800 text-white'
              }`}>
              {toastMsg.type === 'error' ? <AlertCircle size={20} className="text-red-500" /> : <CheckCircle2 size={20} className="text-emerald-400" />}
              <div>
                <p className="text-sm font-bold">{toastMsg.title}</p>
                {toastMsg.message && <p className="text-xs opacity-80">{toastMsg.message}</p>}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  )
}
