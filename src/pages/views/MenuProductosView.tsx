import { useState, useEffect } from 'react'
import { Plus, Edit2, Trash2, Image as ImageIcon, X, Loader2, Utensils, Clock } from 'lucide-react'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { BottomSheet } from '../../components/BottomSheet'
import { supabase, subirFoto } from '../../lib/supabase'
import type { Restaurante, MenuItem, MenuCategoria } from '../../lib/supabase'
import { motion } from 'framer-motion'
import type { Variants } from 'framer-motion'

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.08 }
  }
}

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 15, scale: 0.98 },
  show: { opacity: 1, y: 0, scale: 1, transition: { type: 'spring', stiffness: 400, damping: 25 } }
}

export function MenuProductosView({ restaurante }: { restaurante: Restaurante }) {
  const [items, setItems] = useState<MenuItem[]>([])
  const [categorias, setCategorias] = useState<MenuCategoria[]>([])
  const [loading, setLoading] = useState(true)
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<Partial<MenuItem>>({})
  const [saving, setSaving] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [itemToDelete, setItemToDelete] = useState<string | null>(null)
  const [errorModal, setErrorModal] = useState<string | null>(null)

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    
    setUploadingImage(true)
    const fileExt = file.name.split('.').pop()
    const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`
    const filePath = `${restaurante.id}/productos/${fileName}`
    
    const url = await subirFoto(file, filePath)
    if (url) {
      setEditingItem(prev => ({...prev, foto_url: url}))
    } else {
      setErrorModal('Hubo un error al subir la foto. Intenta de nuevo.')
    }
    setUploadingImage(false)
  }

  useEffect(() => {
    loadData()
  }, [restaurante.id])

  useEffect(() => {
    const channel = supabase
      .channel(`admin:items:${restaurante.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'menu_items', filter: `restaurante_id=eq.${restaurante.id}` }, () => {
        loadData()
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'menu_categorias', filter: `restaurante_id=eq.${restaurante.id}` }, () => {
        loadData()
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [restaurante.id])

  async function loadData() {
    setLoading(true)
    const [ { data: cats }, { data: prods } ] = await Promise.all([
      supabase.from('menu_categorias').select('*').eq('restaurante_id', restaurante.id).order('orden'),
      supabase.from('menu_items').select('*').eq('restaurante_id', restaurante.id).order('orden')
    ])
    setCategorias(cats || [])

    // Auto-reset agotado_hoy: si el platillo tiene agotado_hasta pasado, lo limpiamos
    // Bug 5 fix: usar hora local México (UTC-6) en lugar de UTC del servidor
    const todayMx = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Mexico_City' })).toISOString().split('T')[0]
    const toReset = (prods || []).filter(p =>
      p.agotado_hoy &&
      p.agotado_hasta &&
      p.agotado_hasta.split('T')[0] < todayMx
    )
    
    let finalProds = prods ? [...prods] : []

    if (toReset.length > 0) {
      await supabase.from('menu_items')
        .update({ agotado_hoy: false, agotado_hasta: null })
        .in('id', toReset.map(p => p.id))
      // Actualizar los objetos localmente pero en finalProds
      finalProds = finalProds.map(p => {
        if (toReset.find(r => r.id === p.id)) {
          return { ...p, agotado_hoy: false, agotado_hasta: null }
        }
        return p
      })
    }

    setItems(finalProds)
    setLoading(false)
  }

  const handleOpenModal = (item?: MenuItem) => {
    if (item) {
      setEditingItem(item)
    } else {
      setEditingItem({ 
        restaurante_id: restaurante.id, 
        disponible: true, 
        precio: 0, 
        aplica_subsidio: true,
        categoria_id: categorias.length > 0 ? categorias[0].id : undefined
      })
    }
    setIsModalOpen(true)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    // Bug 1 fix: validar que el precio sea un número válido mayor a 0
    const precioFinal = parseFloat(String(editingItem.precio))
    if (isNaN(precioFinal) || precioFinal < 0) {
      setErrorModal('El precio no es válido. Escribe un número mayor o igual a 0.')
      setSaving(false)
      return
    }

    // Bug 4 fix: validar que el horario tenga sentido (inicio < fin)
    if (editingItem.hora_inicio_disponible && editingItem.hora_fin_disponible) {
      if (editingItem.hora_inicio_disponible >= editingItem.hora_fin_disponible) {
        setErrorModal('El horario "Desde" debe ser menor que el horario "Hasta". El sistema aún no soporta horarios que cruzan la medianoche.')
        setSaving(false)
        return
      }
    }
    if ((editingItem.hora_inicio_disponible && !editingItem.hora_fin_disponible) ||
        (!editingItem.hora_inicio_disponible && editingItem.hora_fin_disponible)) {
      setErrorModal('Si configuras un horario de disponibilidad, debes indicar tanto la hora de inicio como la hora de fin.')
      setSaving(false)
      return
    }

    // Bug 3 fix: validar que los grupos de opciones no estén vacíos
    const opciones = editingItem.opciones || []
    for (let g = 0; g < opciones.length; g++) {
      const grupo = opciones[g]
      if (!grupo.titulo?.trim()) {
        setErrorModal(`El Grupo de Opciones #${g + 1} no tiene nombre. Ponle un nombre o elimínalo.`)
        setSaving(false)
        return
      }
      if (grupo.opciones.length === 0) {
        setErrorModal(`El grupo "${grupo.titulo}" no tiene ninguna opción. Agrega al menos una o elimina el grupo.`)
        setSaving(false)
        return
      }
      for (let o = 0; o < grupo.opciones.length; o++) {
        if (!grupo.opciones[o].nombre?.trim()) {
          setErrorModal(`Una opción del grupo "${grupo.titulo}" no tiene nombre. Rellénala o elimínala.`)
          setSaving(false)
          return
        }
      }
    }
    
    // Si no hay categorías, creamos una por defecto
    let catId = editingItem.categoria_id
    if (!catId && categorias.length === 0) {
      const { data: newCat } = await supabase.from('menu_categorias').insert({ restaurante_id: restaurante.id, nombre: 'Menú Principal' }).select().single()
      if (newCat) {
        setCategorias([newCat])
        catId = newCat.id
      }
    } else if (!catId && categorias.length > 0) {
      catId = categorias[0].id
    }

    const payload = { ...editingItem, precio: precioFinal, restaurante_id: restaurante.id, categoria_id: catId }
    
    if (payload.id) {
      const { error } = await supabase.from('menu_items').update(payload).eq('id', payload.id)
      if (error) { setErrorModal('Error al guardar: ' + error.message); setSaving(false); return }
    } else {
      const { error } = await supabase.from('menu_items').insert(payload)
      if (error) { setErrorModal('Error al crear: ' + error.message); setSaving(false); return }
    }
    
    await loadData()
    setSaving(false)
    setIsModalOpen(false)
  }

  const handleDelete = async (id: string) => {
    setItemToDelete(id)
  }

  const confirmDelete = async () => {
    if (!itemToDelete) return
    // Bug 2 fix: eliminar la foto del storage antes de borrar el registro
    const itemToRemove = items.find(i => i.id === itemToDelete)
    if (itemToRemove?.foto_url) {
      try {
        // La URL tiene el formato: .../storage/v1/object/public/BUCKET/PATH
        const url = new URL(itemToRemove.foto_url)
        const parts = url.pathname.split('/object/public/')
        if (parts.length === 2) {
          const [bucket, ...rest] = parts[1].split('/')
          const filePath = rest.join('/')
          await supabase.storage.from(bucket).remove([filePath])
        }
      } catch {
        // No bloqueamos la eliminación del producto si la foto falla
        console.warn('No se pudo eliminar la foto del storage')
      }
    }
    await supabase.from('menu_items').delete().eq('id', itemToDelete)
    await loadData()
    setItemToDelete(null)
  }

  const toggleDisponible = async (item: MenuItem) => {
    const newVal = !item.disponible
    // Optimistic UI
    setItems(items.map(i => i.id === item.id ? { ...i, disponible: newVal } : i))
    const { error } = await supabase.from('menu_items').update({ disponible: newVal }).eq('id', item.id)
    if (error) {
      // Rollback
      setItems(items.map(i => i.id === item.id ? { ...i, disponible: item.disponible } : i))
      setErrorModal('Error al cambiar disponibilidad: ' + error.message)
    }
  }

  const handleToggleAgotado = async (item: MenuItem) => {
    const newVal = !item.agotado_hoy
    // Si se marca como agotado, guardar el fin del día de hoy para que mañana se limpie solo
    const endOfToday = newVal ? new Date(new Date().toISOString().split('T')[0] + 'T23:59:59').toISOString() : null
    
    // Optimistic UI
    setItems(prev => prev.map(i => i.id === item.id ? {...i, agotado_hoy: newVal, agotado_hasta: endOfToday} : i))
    
    const { error } = await supabase.from('menu_items').update({
      agotado_hoy: newVal,
      agotado_hasta: endOfToday
    }).eq('id', item.id)
    
    if (error) {
      // Rollback
      setItems(prev => prev.map(i => i.id === item.id ? {...i, agotado_hoy: item.agotado_hoy, agotado_hasta: item.agotado_hasta} : i))
      setErrorModal('Error al cambiar estado de agotado: ' + error.message)
    }
  }

  if (loading) return (
    <div className="pb-24">
      <div className="mb-10">
        <div className="shimmer h-10 w-48 mb-3 rounded-xl" />
        <div className="shimmer h-5 w-64 rounded-lg" />
      </div>
      <div className="flex flex-col gap-10">
        {[1, 2].map(i => (
          <div key={i}>
            <div className="shimmer h-8 w-40 mb-5 rounded-xl" />
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              {[1, 2, 3, 4].map(j => (
                <div key={j} className="h-[130px] bg-white rounded-[24px] border border-slate-100 flex p-4 gap-4 shadow-sm">
                  <div className="w-24 h-24 rounded-[16px] shimmer shrink-0" />
                  <div className="flex-1 py-1 flex flex-col">
                    <div className="shimmer h-5 w-3/4 rounded-lg mb-2" />
                    <div className="shimmer h-3 w-full rounded-md mb-1.5" />
                    <div className="shimmer h-3 w-5/6 rounded-md mb-auto" />
                    <div className="shimmer h-5 w-16 rounded-lg mt-2" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )

  return (
    <div className="pb-24">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-10 gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-black text-slate-800 mb-2 tracking-tight">Platillos</h1>
          <p className="text-slate-500 font-medium">Gestiona tu menú principal.</p>
        </div>
        <motion.button 
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.95 }}
          className="w-full sm:w-auto px-6 py-3 bg-[#FF7A6A] hover:bg-[#ff6250] text-white font-bold rounded-2xl shadow-lg shadow-[#FF7A6A]/30 transition-colors flex items-center justify-center gap-2 group" 
          onClick={() => handleOpenModal()}
        >
          <Plus size={20} className="group-hover:rotate-90 transition-transform" /> 
          Agregar Platillo
        </motion.button>
      </div>

      {categorias.length === 0 && items.length === 0 ? (
        <div className="bg-white rounded-[32px] border border-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.02)] text-center py-20 px-6">
          <div className="w-20 h-20 bg-[#FFF0EE] rounded-[24px] flex items-center justify-center mx-auto mb-6 shadow-sm">
            <Utensils className="text-[#FF7A6A]" size={32} />
          </div>
          <h3 className="text-2xl font-black text-slate-800 mb-2">Aún no tienes platillos</h3>
          <p className="text-slate-500 font-medium mb-8">Agrega tu primer producto para empezar a vender.</p>
          <motion.button 
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.95 }}
            className="px-8 py-3 bg-[#FF7A6A] hover:bg-[#ff6250] text-white font-bold rounded-xl shadow-lg shadow-[#FF7A6A]/30 transition-colors" 
            onClick={() => handleOpenModal()}
          >
            Crear Platillo
          </motion.button>
        </div>
      ) : (
        <div className="flex flex-col gap-10">
          {categorias.map(cat => {
            const catItems = items.filter(i => i.categoria_id === cat.id)
            return (
              <div key={cat.id} className="relative">
                <h3 className="text-xl font-black mb-5 flex items-center gap-3 text-slate-800">
                  <span className="p-2 bg-[#FFF0EE] rounded-xl text-lg shadow-sm">{cat.emoji}</span> 
                  {cat.nombre}
                </h3>
                
                <motion.div variants={containerVariants} initial="hidden" animate="show" className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                  {catItems.length === 0 && <p className="text-slate-400 text-sm italic py-4">No hay platillos en esta categoría.</p>}
                  {catItems.map(item => (
                    <motion.div variants={itemVariants} key={item.id} className="bg-white rounded-[24px] border border-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.02)] hover:shadow-lg hover:shadow-[#FF7A6A]/10 transition-shadow p-4 flex gap-4 group">
                      
                      <div className="w-24 h-24 rounded-[16px] bg-[#FFF0EE] shrink-0 flex items-center justify-center overflow-hidden border border-slate-50">
                        {item.foto_url ? (
                          <img src={item.foto_url} alt={item.nombre} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                        ) : (
                          <ImageIcon size={28} className="text-[#FF7A6A]/40" />
                        )}
                      </div>
                      
                      <div className="flex-1 flex flex-col justify-center min-w-0 py-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="m-0 text-base font-bold text-slate-800 truncate">{item.nombre}</h4>
                          {item.es_popular && <span className="px-2 py-0.5 rounded-full bg-[#FFF0EE] text-[#FF7A6A] text-[9px] font-black uppercase tracking-wider">Popular</span>}
                        </div>
                        <p className="text-xs text-slate-500 line-clamp-2 leading-snug mb-auto font-medium">
                          {item.descripcion}
                        </p>
                        <p className="m-0 font-black text-[#FF7A6A] text-lg mt-1">${Number(item.precio).toFixed(2)}</p>
                      </div>
                      
                      <div className="flex flex-col items-end gap-3 justify-between shrink-0 pl-2 border-l border-slate-50">
                        <label className="toggle">
                          <input type="checkbox" checked={item.disponible} onChange={() => toggleDisponible(item)} />
                          <span className="toggle-slider"></span>
                        </label>
                        <button
                          onClick={() => handleToggleAgotado(item)}
                          title={item.agotado_hoy ? 'Marcar como disponible' : 'Marcar como agotado hoy'}
                          className={`p-2 rounded-[12px] transition-colors text-xs font-bold ${
                            item.agotado_hoy
                              ? 'bg-red-50 text-red-500 hover:bg-red-100'
                              : 'text-slate-400 hover:text-amber-500 hover:bg-amber-50'
                          }`}
                        >
                          {item.agotado_hoy ? '🔴' : '🟢'}
                        </button>
                        <div className="flex flex-col sm:flex-row gap-1">
                          <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} className="p-2 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-[12px] transition-colors" onClick={() => handleOpenModal(item)}>
                            <Edit2 size={16} />
                          </motion.button>
                          <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-[12px] transition-colors" onClick={() => handleDelete(item.id)}>
                            <Trash2 size={16} />
                          </motion.button>
                        </div>
                      </div>
                      
                    </motion.div>
                  ))}
                </motion.div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal CRUD (BottomSheet) */}
      <BottomSheet 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)}
        title={editingItem.id ? 'Editar Platillo' : 'Nuevo Platillo'}
      >
        <form onSubmit={handleSave} className="flex flex-col gap-5">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Nombre del platillo *</label>
            <input required type="text" className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:border-orange-500 outline-none transition-colors text-slate-800 font-medium" value={editingItem.nombre || ''} onChange={e => setEditingItem({...editingItem, nombre: e.target.value})} placeholder="Ej. Hamburguesa Doble" />
            <p className="text-[11px] text-slate-400 font-medium leading-tight">Escribe el nombre claro y sin abreviaturas. <span className="text-slate-500 font-bold">Ej. Frappé de Moka</span></p>
          </div>
          
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Descripción</label>
            <textarea className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:border-orange-500 outline-none transition-colors text-slate-800 font-medium min-h-[100px]" value={editingItem.descripcion || ''} onChange={e => setEditingItem({...editingItem, descripcion: e.target.value})} placeholder="Ingredientes, preparación..." />
            <p className="text-[11px] text-slate-400 font-medium leading-tight">💡 <span className="text-orange-500 font-bold">Tip de ventas:</span> Describe los ingredientes para que se escuche antojable. Los clientes compran más cuando saben qué incluye.</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Precio ($) *</label>
              <input required type="number" step="0.01" min="0" className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:border-orange-500 outline-none transition-colors text-slate-800 font-medium" value={editingItem.precio || 0} onChange={e => setEditingItem({...editingItem, precio: parseFloat(e.target.value)})} />
              <p className="text-[10px] text-slate-400 font-medium leading-tight mt-0.5">Si tiene varios tamaños, pon el precio del tamaño más chico aquí.</p>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Categoría</label>
              <select className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:border-orange-500 outline-none transition-colors text-slate-800 font-medium" value={editingItem.categoria_id || ''} onChange={e => setEditingItem({...editingItem, categoria_id: e.target.value})}>
                {categorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                {categorias.length === 0 && <option value="">Sin categoría (Crea una primero)</option>}
              </select>
            </div>
          </div>

          {/* Horario de Disponibilidad */}
          <div className="flex flex-col gap-2 bg-blue-50/50 border border-blue-100 rounded-2xl p-4">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
              <Clock size={14} className="text-blue-400" /> Disponible solo en horario (opcional)
            </label>
            <p className="text-[11px] text-slate-400 font-medium">Deja vacío si está disponible siempre. Ejemplo: desayunos solo de 8:00 a 12:00.</p>
            <div className="flex gap-3 items-center">
              <div className="flex-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Desde</label>
                <input type="time" className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white text-sm font-medium mt-1"
                  value={editingItem.hora_inicio_disponible || ''}
                  onChange={e => setEditingItem({...editingItem, hora_inicio_disponible: e.target.value || null})} />
              </div>
              <div className="flex-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Hasta</label>
                <input type="time" className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white text-sm font-medium mt-1"
                  value={editingItem.hora_fin_disponible || ''}
                  onChange={e => setEditingItem({...editingItem, hora_fin_disponible: e.target.value || null})} />
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Foto del Platillo (Opcional)</label>
            <div className="flex items-center gap-4 p-4 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50">
              {editingItem.foto_url ? (
                <img src={editingItem.foto_url} alt="Vista previa" className="w-16 h-16 rounded-xl object-cover shadow-sm shrink-0" />
              ) : (
                <div className="w-16 h-16 rounded-xl bg-slate-200 flex items-center justify-center shrink-0">
                  <ImageIcon size={24} className="text-slate-400" />
                </div>
              )}
              <div className="flex-1">
                <input 
                  type="file" 
                  accept="image/jpeg, image/png, image/webp"
                  onChange={handleImageUpload}
                  disabled={uploadingImage}
                  className="w-full text-sm text-slate-500 file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-black file:uppercase file:tracking-wider file:bg-orange-100 file:text-orange-600 hover:file:bg-orange-200 cursor-pointer transition-colors"
                />
                {uploadingImage && <p className="text-xs text-orange-500 mt-2 font-bold flex items-center gap-1.5"><Loader2 size={12} className="animate-spin" /> Comprimiendo y subiendo...</p>}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 mt-4 bg-orange-50 p-4 rounded-xl">
            <input type="checkbox" id="pop" checked={editingItem.es_popular || false} onChange={e => setEditingItem({...editingItem, es_popular: e.target.checked})} className="w-5 h-5 accent-orange-500 rounded cursor-pointer" />
            <label htmlFor="pop" className="m-0 cursor-pointer text-sm font-bold text-orange-900">Destacar como "Más Popular"</label>
          </div>

          <div className="flex items-start gap-3 mt-4 bg-blue-50/50 border border-blue-200 p-5 rounded-2xl shadow-sm">
            <input type="checkbox" id="subsidio" checked={editingItem.aplica_subsidio ?? true} onChange={e => setEditingItem({...editingItem, aplica_subsidio: e.target.checked})} className="w-5 h-5 accent-blue-600 rounded cursor-pointer mt-0.5" />
            <label htmlFor="subsidio" className="m-0 cursor-pointer flex flex-col">
              <span className="text-[15px] font-black text-blue-900">Aplicar Subsidio de Envío ($8.00)</span>
              <span className="text-[13px] font-medium text-blue-800/90 mt-1.5 leading-relaxed">
                Si esta casilla <strong className="text-blue-900">está marcada</strong>, el sistema le descontará automáticamente $8.00 al costo de envío del cliente por cada unidad de este producto que agregue al carrito.
              </span>
              <div className="mt-3 bg-white/60 p-3 rounded-lg border border-blue-100 text-[12px] text-blue-900">
                ⚠️ <b>IMPORTANTE:</b> Al marcar esto, tú como restaurante debes sumarle manualmente <b>$8.00</b> al Precio de Venta que ingresaste arriba para recuperar ese dinero. Si lo desmarcas, el cliente pagará su envío completo y tu precio se queda intacto.
              </div>
            </label>
          </div>

          {/* Opciones y Modificadores */}
          <div className="mt-6 border-t border-slate-100 pt-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-black text-slate-800">Opciones y Extras</h3>
              <button type="button" onClick={() => setEditingItem({
                ...editingItem,
                opciones: [...(editingItem.opciones || []), { titulo: '', requerido: false, maximo_selecciones: 1, opciones: [] }]
              })} className="text-xs font-bold bg-slate-100 text-slate-600 px-3 py-1.5 rounded-lg hover:bg-slate-200 transition-colors flex items-center gap-1">
                <Plus size={14} /> Añadir Grupo
              </button>
            </div>
            
            <div className="bg-orange-50/50 border border-orange-100 rounded-xl p-3 mb-4 flex gap-2 items-start">
              <div className="text-orange-400 mt-0.5">💡</div>
              <p className="text-xs text-slate-600 leading-relaxed font-medium">
                Usa <strong className="text-orange-600">Variantes</strong> si el cliente debe elegir forzosamente un tamaño o tipo (Ej. Chico, Mediano). Usa <strong className="text-emerald-600">Extras</strong> si quieres cobrar por ingredientes adicionales (Ej. Extra Queso +$15).
              </p>
            </div>
            
            <div className="space-y-4">
              {(editingItem.opciones || []).map((grupo, gIndex) => (
                <div key={gIndex} className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1 space-y-3">
                      <input type="text" placeholder="Ej. Elige tu tamaño" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-bold" value={grupo.titulo} onChange={e => {
                        const newOpciones = [...(editingItem.opciones || [])];
                        newOpciones[gIndex].titulo = e.target.value;
                        setEditingItem({ ...editingItem, opciones: newOpciones });
                      }} />
                      <div className="flex flex-col sm:flex-row gap-2 bg-slate-200/50 p-1.5 rounded-xl w-full">
                        <button
                          type="button"
                          onClick={() => {
                            const newOpciones = [...(editingItem.opciones || [])];
                            newOpciones[gIndex].requerido = true;
                            newOpciones[gIndex].maximo_selecciones = 1;
                            setEditingItem({ ...editingItem, opciones: newOpciones });
                          }}
                          className={`flex-1 sm:flex-none px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${
                            grupo.requerido && grupo.maximo_selecciones === 1
                              ? 'bg-white text-orange-600 shadow-sm'
                              : 'text-slate-500 hover:text-slate-700'
                          }`}
                        >
                          ◉ Variantes (Debe elegir 1)
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const newOpciones = [...(editingItem.opciones || [])];
                            newOpciones[gIndex].requerido = false;
                            newOpciones[gIndex].maximo_selecciones = 10;
                            setEditingItem({ ...editingItem, opciones: newOpciones });
                          }}
                          className={`flex-1 sm:flex-none px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${
                            !grupo.requerido && grupo.maximo_selecciones > 1
                              ? 'bg-white text-emerald-600 shadow-sm'
                              : 'text-slate-500 hover:text-slate-700'
                          }`}
                        >
                          ☑ Extras (Opcional, varios)
                        </button>
                      </div>
                    </div>
                    <button type="button" onClick={() => {
                      const newOpciones = [...(editingItem.opciones || [])];
                      newOpciones.splice(gIndex, 1);
                      setEditingItem({ ...editingItem, opciones: newOpciones });
                    }} className="p-1.5 text-slate-400 hover:text-red-500 ml-2">
                      <Trash2 size={16} />
                    </button>
                  </div>

                  <div className="space-y-2 pl-4 border-l-2 border-orange-200">
                    {grupo.opciones.map((opc, oIndex) => (
                      <div key={oIndex} className="flex gap-2 items-center">
                        <input type="text" placeholder="Ej. Grande" className="flex-1 px-3 py-1.5 border border-slate-200 rounded-lg text-sm" value={opc.nombre} onChange={e => {
                          const newOpciones = [...(editingItem.opciones || [])];
                          newOpciones[gIndex].opciones[oIndex].nombre = e.target.value;
                          setEditingItem({ ...editingItem, opciones: newOpciones });
                        }} />
                        <div className="flex items-center gap-1">
                          <span className="text-slate-400 text-sm">+$</span>
                          <input type="number" min="0" placeholder="0" className="w-20 px-3 py-1.5 border border-slate-200 rounded-lg text-sm" value={opc.precio_extra} onChange={e => {
                            const newOpciones = [...(editingItem.opciones || [])];
                            newOpciones[gIndex].opciones[oIndex].precio_extra = parseFloat(e.target.value) || 0;
                            setEditingItem({ ...editingItem, opciones: newOpciones });
                          }} />
                        </div>
                        <button type="button" onClick={() => {
                          const newOpciones = [...(editingItem.opciones || [])];
                          newOpciones[gIndex].opciones.splice(oIndex, 1);
                          setEditingItem({ ...editingItem, opciones: newOpciones });
                        }} className="p-1.5 text-slate-400 hover:text-red-500">
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                    <button type="button" onClick={() => {
                      const newOpciones = [...(editingItem.opciones || [])];
                      newOpciones[gIndex].opciones.push({ nombre: '', precio_extra: 0 });
                      setEditingItem({ ...editingItem, opciones: newOpciones });
                    }} className="text-xs font-bold text-orange-500 hover:text-orange-600 mt-2 flex items-center gap-1">
                      <Plus size={12} /> Añadir opción
                    </button>
                  </div>
                </div>
              ))}
              {(!editingItem.opciones || editingItem.opciones.length === 0) && (
                <p className="text-sm text-slate-400 italic">No hay opciones extra configuradas para este platillo.</p>
              )}
            </div>
          </div>

          <button type="submit" className="w-full mt-4 py-4 rounded-xl font-black text-white text-lg bg-slate-900 hover:bg-orange-500 shadow-xl shadow-slate-900/20 hover:shadow-orange-500/30 transition-all flex items-center justify-center gap-2 active:scale-[0.98]" disabled={saving}>
            {saving ? (
              <>
                <Loader2 size={20} className="animate-spin" />
                Guardando Platillo...
              </>
            ) : 'Guardar Platillo'}
          </button>
        </form>
      </BottomSheet>

      <ConfirmDialog 
        isOpen={!!itemToDelete} 
        title="Eliminar Platillo" 
        message="¿Estás seguro de que deseas eliminar este platillo? Esta acción no se puede deshacer." 
        onConfirm={confirmDelete} 
        onCancel={() => setItemToDelete(null)} 
      />

      <ConfirmDialog 
        isOpen={!!errorModal} 
        title="Oops, algo salió mal" 
        message={errorModal || ''} 
        onConfirm={() => setErrorModal(null)} 
        onCancel={() => setErrorModal(null)} 
        confirmText="Entendido" 
        showCancel={false}
        isDanger={false}
      />
    </div>
  )
}
