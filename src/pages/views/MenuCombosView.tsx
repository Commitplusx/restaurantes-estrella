import { useState, useEffect } from 'react'
import { Plus, Edit2, Trash2, Image as ImageIcon, Loader2, Package, X, Settings2 } from 'lucide-react'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { BottomSheet } from '../../components/BottomSheet'
import { OpcionesEditor } from '../../components/OpcionesEditor'
import { supabase, subirFoto } from '../../lib/supabase'
import type { Restaurante, MenuCombo } from '../../lib/supabase'

export function MenuCombosView({ restaurante }: { restaurante: Restaurante }) {
  const [combos, setCombos] = useState<MenuCombo[]>([])
  const [loading, setLoading] = useState(true)

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<Partial<MenuCombo>>({})
  const [saving, setSaving] = useState(false)
  const [isEditingOptions, setIsEditingOptions] = useState(false)
  const [incluyeInput, setIncluyeInput] = useState('')
  const [uploadingImage, setUploadingImage] = useState(false)
  const [itemToDelete, setItemToDelete] = useState<string | null>(null)
  const [errorModal, setErrorModal] = useState<string | null>(null)

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    
    setUploadingImage(true)
    const fileExt = file.name.split('.').pop()
    const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`
    const filePath = `${restaurante.id}/combos/${fileName}`
    
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
      .channel(`admin:combos:${restaurante.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'menu_combos', filter: `restaurante_id=eq.${restaurante.id}` }, () => {
        loadData()
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [restaurante.id])

  async function loadData() {
    setLoading(true)
    const { data } = await supabase.from('menu_combos').select('*').eq('restaurante_id', restaurante.id).order('created_at', { ascending: false })
    setCombos(data || [])
    setLoading(false)
  }

  const handleOpenModal = (item?: MenuCombo) => {
    if (item) {
      setEditingItem(item)
      setIncluyeInput(item.incluye?.join(', ') || '')
    } else {
      setEditingItem({ restaurante_id: restaurante.id, disponible: true, precio: 0, incluye: [], aplica_subsidio: false, opciones: [] })
      setIncluyeInput('')
    }
    setIsModalOpen(true)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    
    // Validar grupos de opciones
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

    const arrayIncluye = incluyeInput.split(',').map(s => s.trim()).filter(Boolean)
    const payload = { ...editingItem, restaurante_id: restaurante.id, incluye: arrayIncluye }
    
    if (payload.id) {
      const { error } = await supabase.from('menu_combos').update(payload).eq('id', payload.id)
      if (error) { setErrorModal('Error al guardar: ' + error.message); setSaving(false); return }
    } else {
      const { error } = await supabase.from('menu_combos').insert(payload)
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
    const idToDelete = itemToDelete
    setItemToDelete(null) // hide modal early
    const { error } = await supabase.from('menu_combos').delete().eq('id', idToDelete)
    if (error) {
      setErrorModal('Error al eliminar: ' + error.message)
    }
    await loadData()
  }

  const toggleDisponible = async (item: MenuCombo) => {
    const newVal = !item.disponible
    // Optimistic UI
    setCombos(combos.map(i => i.id === item.id ? { ...i, disponible: newVal } : i))
    
    const { error } = await supabase.from('menu_combos').update({ disponible: newVal }).eq('id', item.id)
    if (error) {
      // Rollback
      setCombos(combos.map(i => i.id === item.id ? { ...i, disponible: item.disponible } : i))
      setErrorModal('Error al cambiar disponibilidad: ' + error.message)
    }
  }

  if (loading) return (
    <div className="flex justify-center items-center py-20 text-brand">
      <Loader2 size={32} className="animate-spin" />
    </div>
  )

  return (
    <div className="pb-24">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-10 gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-black text-slate-800 mb-2 tracking-tight">Paquetes / Combos</h1>
          <p className="text-slate-500 font-medium">Agrupa productos a un mejor precio.</p>
        </div>
        <button 
          className="w-full sm:w-auto px-6 py-3 bg-[#FF7A6A] hover:bg-[#ff6250] text-white font-bold rounded-2xl shadow-lg shadow-[#FF7A6A]/30 transition-all active:scale-[0.98] flex items-center justify-center gap-2 group" 
          onClick={() => handleOpenModal()}
        >
          <Plus size={20} className="group-hover:rotate-90 transition-transform" /> 
          Crear Combo
        </button>
      </div>

      {combos.length === 0 ? (
        <div className="bg-white rounded-[32px] border border-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.02)] text-center py-20 px-6">
          <div className="w-20 h-20 bg-[#FFF0EE] rounded-[24px] flex items-center justify-center mx-auto mb-6 shadow-sm">
            <Package className="text-[#FF7A6A]" size={32} />
          </div>
          <h3 className="text-2xl font-black text-slate-800 mb-2">Aún no tienes combos</h3>
          <p className="text-slate-500 font-medium mb-8 max-w-sm mx-auto">No tienes combos activos. Los combos son excelentes para subir el ticket promedio.</p>
          <button 
            className="px-8 py-3 bg-[#FF7A6A] hover:bg-[#ff6250] text-white font-bold rounded-xl shadow-lg shadow-[#FF7A6A]/30 transition-all active:scale-[0.98]" 
            onClick={() => handleOpenModal()}
          >
            Crear Primer Combo
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {combos.map(combo => (
            <div key={combo.id} className="bg-white rounded-[24px] border border-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.02)] hover:shadow-lg hover:shadow-[#FF7A6A]/10 transition-all p-5 flex flex-col sm:flex-row gap-4 group">
              
              <div className="w-full sm:w-32 h-40 sm:h-32 rounded-[16px] bg-[#FFF0EE] shrink-0 flex items-center justify-center overflow-hidden border border-slate-50">
                {combo.foto_url ? (
                  <img src={combo.foto_url} alt={combo.nombre} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                ) : (
                  <ImageIcon size={32} className="text-[#FF7A6A]/40" />
                )}
              </div>
              
              <div className="flex-1 flex flex-col justify-center">
                <h3 className="m-0 mb-1 text-lg font-black text-slate-800 tracking-tight">{combo.nombre}</h3>
                <p className="m-0 mb-3 text-sm text-slate-500 font-medium line-clamp-2">{combo.descripcion}</p>
                <div className="flex flex-wrap gap-1.5 mb-auto">
                  {combo.incluye?.map((inc, i) => (
                    <span key={i} className="px-2 py-1 bg-slate-50 text-slate-500 rounded-lg text-xs font-bold border border-slate-100">{inc}</span>
                  ))}
                </div>
                <div className="flex items-center justify-between mt-3">
                  <p className="m-0 font-black text-[#FF7A6A] text-xl">${Number(combo.precio).toFixed(2)}</p>
                  
                  <div className="flex items-center gap-3 border-l border-slate-100 pl-4">
                    <label className="toggle mr-1">
                      <input type="checkbox" checked={combo.disponible} onChange={() => toggleDisponible(combo)} />
                      <span className="toggle-slider"></span>
                    </label>
                    <button className="p-2.5 text-slate-400 hover:text-blue-500 hover:bg-[#FFF0EE] rounded-xl transition-colors" onClick={() => handleOpenModal(combo)}>
                      <Edit2 size={16} />
                    </button>
                    <button className="p-2.5 text-slate-400 hover:text-red-500 hover:bg-[#FFF0EE] rounded-xl transition-colors" onClick={() => handleDelete(combo.id)}>
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal CRUD (BottomSheet) */}
      <BottomSheet 
        isOpen={isModalOpen} 
        onClose={() => {
          setIsModalOpen(false)
          setIsEditingOptions(false)
        }}
        title={isEditingOptions ? '' : (editingItem.id ? 'Editar Combo' : 'Nuevo Combo')}
      >
        {isEditingOptions ? (
          <OpcionesEditor
            opciones={editingItem.opciones || []}
            onChange={(ops) => setEditingItem({ ...editingItem, opciones: ops })}
            onClose={() => setIsEditingOptions(false)}
          />
        ) : (
        <form onSubmit={handleSave} className="flex flex-col gap-5">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Nombre del combo *</label>
            <input required type="text" className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:border-emerald-500 outline-none transition-colors text-slate-800 font-medium" value={editingItem.nombre || ''} onChange={e => setEditingItem({...editingItem, nombre: e.target.value})} placeholder="Ej. Paquete Familiar" />
          </div>
          
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Descripción</label>
            <textarea className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:border-emerald-500 outline-none transition-colors text-slate-800 font-medium min-h-[80px]" value={editingItem.descripcion || ''} onChange={e => setEditingItem({...editingItem, descripcion: e.target.value})} placeholder="Ideal para 4 personas..." />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Elementos incluidos *</label>
            <input required type="text" className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:border-emerald-500 outline-none transition-colors text-slate-800 font-medium" value={incluyeInput} onChange={e => setIncluyeInput(e.target.value)} placeholder="Ej. 2 Pizzas, 1 Refresco, 1 Helado" />
            <span className="text-[10px] font-bold text-slate-400 mt-1 uppercase">Escribe los items separados por una coma (,).</span>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Precio del combo ($) *</label>
            <input required type="number" step="0.01" min="0" className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:border-emerald-500 outline-none transition-colors text-slate-800 font-medium" value={editingItem.precio || 0} onChange={e => setEditingItem({...editingItem, precio: parseFloat(e.target.value)})} />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Foto del Combo (Opcional)</label>
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
                  className="w-full text-sm text-slate-500 file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-black file:uppercase file:tracking-wider file:bg-emerald-100 file:text-emerald-700 hover:file:bg-emerald-200 cursor-pointer transition-colors"
                />
                {uploadingImage && <p className="text-xs text-emerald-500 mt-2 font-bold flex items-center gap-1.5"><Loader2 size={12} className="animate-spin" /> Comprimiendo y subiendo...</p>}
              </div>
            </div>
          </div>

          <div className="flex items-start gap-3 mt-4 bg-blue-50/50 border border-blue-200 p-5 rounded-2xl shadow-sm">
            <input type="checkbox" id="subsidioCombo" checked={editingItem.aplica_subsidio ?? false} onChange={e => setEditingItem({...editingItem, aplica_subsidio: e.target.checked})} className="w-5 h-5 accent-blue-600 rounded cursor-pointer mt-0.5" />
            <label htmlFor="subsidioCombo" className="m-0 cursor-pointer flex flex-col">
              <span className="text-[15px] font-black text-blue-900">Aplicar Subsidio de Envío ($8.00)</span>
              <span className="text-[13px] font-medium text-blue-800/90 mt-1.5 leading-relaxed">
                Si esta casilla <strong className="text-blue-900">está marcada</strong>, el sistema le descontará automáticamente $8.00 al costo de envío del cliente por cada vez que agregue este combo al carrito.
              </span>
              <div className="mt-3 bg-white/60 p-3 rounded-lg border border-blue-100 text-[12px] text-blue-900">
                ⚠️ <b>IMPORTANTE:</b> Al marcar esto, tú como restaurante debes sumarle manualmente <b>$8.00</b> al Precio de Venta que ingresaste arriba para recuperar ese dinero. Si lo desmarcas, el cliente pagará su envío completo y tu precio se queda intacto.
              </div>
            </label>
          </div>

          {/* Opciones y Modificadores */}
          <div className="mt-6 border-t border-slate-100 pt-6">
            <div className="flex items-center justify-between mb-2">
              <div>
                <h3 className="font-black text-slate-800">Opciones y Extras</h3>
                <p className="text-xs text-slate-500 mt-1">Configura Variantes o Extras para este combo.</p>
              </div>
            </div>
            
            <button
              type="button"
              onClick={() => setIsEditingOptions(true)}
              className="w-full mt-2 py-4 px-4 bg-white border border-slate-200 hover:border-emerald-300 hover:bg-emerald-50 rounded-xl shadow-sm transition-all flex items-center justify-between group"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Settings2 size={20} />
                </div>
                <div className="text-left">
                  <span className="block font-bold text-slate-700">Configurar Opciones</span>
                  <span className="block text-xs text-slate-500">
                    {(editingItem.opciones?.length || 0)} {editingItem.opciones?.length === 1 ? 'grupo configurado' : 'grupos configurados'}
                  </span>
                </div>
              </div>
              <span className="text-emerald-600 font-bold text-sm">Editar</span>
            </button>
          </div>

          <button type="submit" className="w-full mt-4 py-4 rounded-xl font-black text-white text-lg bg-slate-900 hover:bg-emerald-500 shadow-xl shadow-slate-900/20 hover:shadow-emerald-500/30 transition-all flex items-center justify-center gap-2 active:scale-[0.98]" disabled={saving}>
            {saving ? (
              <>
                <Loader2 size={20} className="animate-spin" />
                Guardando Combo...
              </>
            ) : 'Guardar Combo'}
          </button>
        </form>
        )}
      </BottomSheet>

      <ConfirmDialog 
        isOpen={!!itemToDelete} 
        title="Eliminar Combo" 
        message="¿Estás seguro de que deseas eliminar este paquete/combo? Esta acción no se puede deshacer." 
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
