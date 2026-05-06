import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import type { Restaurante, MenuCategoria, MenuItem } from '../lib/supabase'
import { Store, ArrowLeft, Plus, Minus, ShoppingBag, MessageCircle, AlertCircle, Loader2 } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

export function PublicMenuView() {
  const { id } = useParams()
  const [restaurante, setRestaurante] = useState<Restaurante | null>(null)
  const [categorias, setCategorias] = useState<MenuCategoria[]>([])
  const [items, setItems] = useState<MenuItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Estado del carrito
  const [carrito, setCarrito] = useState<{item: MenuItem, cantidad: number}[]>([])
  const [showCheckout, setShowCheckout] = useState(false)
  const [clienteNombre, setClienteNombre] = useState('')
  const [clienteTel, setClienteTel] = useState('')
  const [procesando, setProcesando] = useState(false)

  useEffect(() => {
    async function load() {
      if (!id) return
      
      const { data: rest, error: restError } = await supabase
        .from('restaurantes')
        .select('*')
        .eq('id', id)
        .single()

      if (restError || !rest) {
        setError('Restaurante no encontrado.')
        setLoading(false)
        return
      }

      setRestaurante(rest)

      const [ { data: cats }, { data: prods } ] = await Promise.all([
        supabase.from('menu_categorias').select('*').eq('restaurante_id', id).eq('activa', true).order('orden'),
        supabase.from('menu_items').select('*').eq('restaurante_id', id).eq('disponible', true).order('orden')
      ])

      setCategorias(cats || [])
      setItems(prods || [])
      setLoading(false)
    }
    load()
  }, [id])

  // Funciones del Carrito
  const addToCart = (item: MenuItem) => {
    setCarrito(prev => {
      const exist = prev.find(p => p.item.id === item.id)
      if (exist) {
        return prev.map(p => p.item.id === item.id ? { ...p, cantidad: p.cantidad + 1 } : p)
      }
      return [...prev, { item, cantidad: 1 }]
    })
  }

  const removeFromCart = (itemId: string) => {
    setCarrito(prev => {
      const exist = prev.find(p => p.item.id === itemId)
      if (exist && exist.cantidad === 1) {
        return prev.filter(p => p.item.id !== itemId)
      }
      return prev.map(p => p.item.id === itemId ? { ...p, cantidad: p.cantidad - 1 } : p)
    })
  }

  const getCantidad = (itemId: string) => {
    return carrito.find(p => p.item.id === itemId)?.cantidad || 0
  }

  const subtotal = carrito.reduce((sum, p) => sum + (p.item.precio * p.cantidad), 0)

  // Enviar Pedido (Intercepción + WhatsApp)
  const handlePedir = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!restaurante || carrito.length === 0) return
    if (!clienteNombre.trim() || !clienteTel.trim()) {
      alert("Por favor ingresa tu nombre y WhatsApp para continuar.")
      return
    }

    setProcesando(true)

    const ticketId = Math.random().toString(36).substring(2, 8).toUpperCase()
    
    const pedidoDetalles = carrito.map(p => `${p.cantidad}x ${p.item.nombre} ($${p.item.precio * p.cantidad})`).join('\n')
    const totalPedido = subtotal

    // 1. INTERCEPCIÓN SILENCIOSA: Guardar en la base de datos de supabase
    try {
      // Guardamos en la tabla de pedidos, con un status especial o usamos description para guardar el detalle
      await supabase.from('pedidos').insert([{
        cliente_tel: clienteTel,
        cliente_nombre: clienteNombre,
        restaurante: restaurante.nombre,
        descripcion: pedidoDetalles,
        estado: 'asignado',
        wb_message_id: ticketId // Usamos el ticketId como identificador único
      }])
    } catch (err) {
      console.warn("Intercepción db fallida, pero se continuará:", err)
    }

    // 2. ENVÍO POR WHATSAPP AL RESTAURANTE
    const mensaje = `¡Hola *${restaurante.nombre}*! 👋\nSoy *${clienteNombre}* y quiero hacer el siguiente pedido:\n\n${pedidoDetalles}\n\n*Total a pagar: $${totalPedido}*\n\n_(Ticket Web: #${ticketId})_`
    
    // Obtener teléfono del restaurante
    let telefonoDestino = restaurante.telefono
    if (!telefonoDestino) {
      // Fallback si no tiene teléfono (que no debería pasar porque se lo exigimos en el perfil)
      telefonoDestino = "529631234567"
    }
    
    const waUrl = `https://wa.me/${telefonoDestino.replace(/\D/g, '')}?text=${encodeURIComponent(mensaje)}`
    
    setProcesando(false)
    setShowCheckout(false)
    setCarrito([])
    
    window.open(waUrl, '_blank')
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <Loader2 className="animate-spin text-brand w-10 h-10" />
    </div>
  )

  if (error || !restaurante) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 px-4 text-center">
      <AlertCircle className="w-16 h-16 text-red-400 mb-4" />
      <h2 className="text-2xl font-bold text-slate-800 mb-2">Restaurante no disponible</h2>
      <p className="text-slate-500 mb-6">{error || 'El menú que buscas no existe o fue desactivado.'}</p>
      <Link to="/" className="btn-primary">Volver al Directorio</Link>
    </div>
  )

  return (
    <div className="min-h-screen bg-slate-50 pb-24 relative">
      {/* HEADER COVER */}
      <div className="h-64 relative bg-slate-800">
        {restaurante.foto_fachada_url ? (
          <img src={restaurante.foto_fachada_url} alt={restaurante.nombre} className="w-full h-full object-cover opacity-60" />
        ) : (
          <div className="w-full h-full flex items-center justify-center opacity-30">
            <Store className="w-20 h-20 text-white" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 to-transparent" />
        
        <div className="absolute top-4 left-4 z-10">
          <Link to="/" className="w-10 h-10 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center text-white hover:bg-white/30 transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
        </div>

        <div className="absolute bottom-6 left-6 right-6 z-10 text-white">
          <h1 className="text-3xl md:text-4xl font-black mb-2 shadow-sm">{restaurante.nombre}</h1>
          {restaurante.categorias && restaurante.categorias.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {restaurante.categorias.map(cat => (
                <span key={cat} className="text-xs font-bold uppercase tracking-wider bg-brand/90 px-2 py-1 rounded-md text-white backdrop-blur-sm">
                  {cat}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* MENÚ CONTENT */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        {categorias.length === 0 ? (
          <div className="text-center py-20">
            <Store className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-slate-600">Menú en preparación</h3>
            <p className="text-slate-500">Este restaurante aún no ha publicado platillos.</p>
          </div>
        ) : (
          categorias.map(cat => {
            const catItems = items.filter(i => i.categoria_id === cat.id)
            if (catItems.length === 0) return null
            
            return (
              <div key={cat.id} className="mb-10">
                <h2 className="text-2xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                  <span className="text-3xl">{cat.emoji}</span> {cat.nombre}
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {catItems.map(item => {
                    const cant = getCantidad(item.id)
                    return (
                      <div key={item.id} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex gap-4 hover:border-brand/50 transition-colors">
                        <div className="flex-1 flex flex-col justify-between">
                          <div>
                            <h3 className="font-bold text-slate-800 text-lg leading-tight mb-1">{item.nombre}</h3>
                            {item.descripcion && (
                              <p className="text-sm text-slate-500 line-clamp-2 mb-2">{item.descripcion}</p>
                            )}
                          </div>
                          <div className="font-black text-brand text-lg">
                            ${item.precio.toFixed(2)}
                          </div>
                        </div>

                        <div className="flex flex-col items-end justify-between">
                          {item.foto_url ? (
                            <img src={item.foto_url} alt={item.nombre} className="w-20 h-20 rounded-xl object-cover shadow-sm bg-slate-100" />
                          ) : (
                            <div className="w-20 h-20 rounded-xl bg-slate-100 flex items-center justify-center">
                              <Store className="w-8 h-8 text-slate-300" />
                            </div>
                          )}

                          <div className="mt-3">
                            {cant > 0 ? (
                              <div className="flex items-center gap-3 bg-slate-100 rounded-full px-2 py-1 shadow-inner">
                                <button onClick={() => removeFromCart(item.id)} className="w-7 h-7 bg-white rounded-full flex items-center justify-center text-slate-600 shadow-sm hover:text-brand transition-colors">
                                  <Minus size={16} />
                                </button>
                                <span className="font-bold text-slate-800 w-3 text-center">{cant}</span>
                                <button onClick={() => addToCart(item)} className="w-7 h-7 bg-brand rounded-full flex items-center justify-center text-white shadow-sm hover:bg-orange-600 transition-colors">
                                  <Plus size={16} />
                                </button>
                              </div>
                            ) : (
                              <button onClick={() => addToCart(item)} className="bg-slate-100 hover:bg-brand hover:text-white text-slate-700 text-sm font-bold px-4 py-2 rounded-full transition-colors flex items-center gap-1 shadow-sm">
                                <Plus size={16} /> Agregar
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
          })
        )}
      </div>

      {/* CART FLOATING BAR */}
      <AnimatePresence>
        {carrito.length > 0 && !showCheckout && (
          <motion.div 
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-6 left-0 right-0 z-40 px-4 pointer-events-none flex justify-center"
          >
            <div className="pointer-events-auto w-full max-w-md bg-brand text-white rounded-2xl shadow-2xl p-4 flex items-center justify-between cursor-pointer hover:bg-orange-600 transition-colors" onClick={() => setShowCheckout(true)}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center relative">
                  <ShoppingBag size={20} />
                  <span className="absolute -top-1 -right-1 bg-slate-900 text-white text-[10px] font-black w-5 h-5 flex items-center justify-center rounded-full">
                    {carrito.reduce((s,p) => s + p.cantidad, 0)}
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="font-bold text-sm">Ver Carrito</span>
                  <span className="text-xs text-white/80 font-medium">Haz clic para finalizar</span>
                </div>
              </div>
              <div className="font-black text-xl">
                ${subtotal.toFixed(2)}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* CHECKOUT MODAL */}
      <AnimatePresence>
        {showCheckout && (
          <>
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowCheckout(false)}
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50"
            />
            <motion.div 
              initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-3xl max-h-[85vh] flex flex-col shadow-2xl"
            >
              <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                <h3 className="text-xl font-black text-slate-800 flex items-center gap-2">
                  <ShoppingBag className="text-brand" /> Tu Pedido
                </h3>
                <button onClick={() => setShowCheckout(false)} className="w-8 h-8 bg-slate-100 text-slate-500 rounded-full flex items-center justify-center hover:bg-slate-200">
                  <Minus size={16} />
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-4">
                <div className="space-y-4 mb-6">
                  {carrito.map(p => (
                    <div key={p.item.id} className="flex justify-between items-center text-sm border-b border-slate-50 pb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-brand bg-orange-50 px-2 py-0.5 rounded text-xs">{p.cantidad}x</span>
                        <span className="font-medium text-slate-700">{p.item.nombre}</span>
                      </div>
                      <span className="font-bold text-slate-800">${(p.item.precio * p.cantidad).toFixed(2)}</span>
                    </div>
                  ))}
                </div>

                <div className="bg-slate-50 p-4 rounded-xl space-y-4 mb-6">
                  <h4 className="font-bold text-slate-700 text-sm">Información de Contacto</h4>
                  <div>
                    <input 
                      type="text" placeholder="Tu Nombre completo" required value={clienteNombre} onChange={e=>setClienteNombre(e.target.value)}
                      className="w-full p-3 rounded-lg border border-slate-200 focus:border-brand outline-none text-sm bg-white mb-3"
                    />
                    <input 
                      type="tel" placeholder="Tu WhatsApp (10 dígitos)" required value={clienteTel} onChange={e=>setClienteTel(e.target.value)}
                      className="w-full p-3 rounded-lg border border-slate-200 focus:border-brand outline-none text-sm bg-white"
                    />
                  </div>
                </div>
              </div>

              <div className="p-4 bg-white border-t border-slate-100 pb-safe">
                <div className="flex justify-between items-center mb-4 px-2">
                  <span className="text-slate-500 font-medium">Total a pagar</span>
                  <span className="text-2xl font-black text-slate-800">${subtotal.toFixed(2)}</span>
                </div>
                <form onSubmit={handlePedir}>
                  <button type="submit" disabled={procesando} className="w-full py-4 bg-[#25D366] hover:bg-[#1DA851] text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-green-500/20 transition-colors">
                    {procesando ? <Loader2 className="animate-spin" /> : <MessageCircle />}
                    {procesando ? 'Procesando...' : 'Pedir por WhatsApp'}
                  </button>
                </form>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

    </div>
  )
}
