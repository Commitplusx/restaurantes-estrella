import { useState, useEffect } from 'react'
import { Plus, Edit2, Trash2, Calendar, Image as ImageIcon, Loader2, Tag, Settings2 } from 'lucide-react'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { BottomSheet } from '../../components/BottomSheet'
import { OpcionesEditor } from '../../components/OpcionesEditor'
import { supabase, subirFoto } from '../../lib/supabase'
import type { Restaurante, MenuPromocion } from '../../lib/supabase'

const DIAS_SEMANA = [
  { id: 'lun', label: 'Lun' },
  { id: 'mar', label: 'Mar' },
  { id: 'mie', label: 'Mié' },
  { id: 'jue', label: 'Jue' },
  { id: 'vie', label: 'Vie' },
  { id: 'sab', label: 'Sáb' },
  { id: 'dom', label: 'Dom' },
]

export function MenuPromosView({ restaurante }: { restaurante: Restaurante }) {
  const [promos, setPromos] = useState<MenuPromocion[]>([])
  const [loading, setLoading] = useState(true)

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<Partial<MenuPromocion>>({})
  const [saving, setSaving] = useState(false)
  const [isEditingOptions, setIsEditingOptions] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [itemToDelete, setItemToDelete] = useState<string | null>(null)
  const [errorModal, setErrorModal] = useState<string | null>(null)

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    
    setUploadingImage(true)
    const fileExt = file.name.split('.').pop()
    const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`
    const filePath = `${restaurante.id}/promos/${fileName}`
    
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
      .channel(`admin:promos:${restaurante.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'menu_promociones', filter: `restaurante_id=eq.${restaurante.id}` }, () => {
        loadData()
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [restaurante.id])

  async function loadData() {
    setLoading(true)
    const { data } = await supabase.from('menu_promociones').select('*').eq('restaurante_id', restaurante.id).order('created_at', { ascending: false })
    setPromos(data || [])
    setLoading(false)
  }

  const handleOpenModal = (item?: MenuPromocion) => {
    if (item) {
      setEditingItem(item)
    } else {
      setEditingItem({ restaurante_id: restaurante.id, activa: true, aplica_subsidio: false, dias_aplicacion: DIAS_SEMANA.map(d => d.id) })
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

    const payload = { ...editingItem, restaurante_id: restaurante.id }
    
    if (payload.id) {
      const { error } = await supabase.from('menu_promociones').update(payload).eq('id', payload.id)
      if (error) { setErrorModal('Error al guardar: ' + error.message); setSaving(false); return }
    } else {
      const { error } = await supabase.from('menu_promociones').insert(payload)
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
    const { error } = await supabase.from('menu_promociones').delete().eq('id', idToDelete)
    if (error) {
      setErrorModal('Error al eliminar: ' + error.message)
    }
    await loadData()
  }

  const toggleActiva = async (item: MenuPromocion) => {
    const newVal = !item.activa
    // Optimistic UI
    setPromos(promos.map(i => i.id === item.id ? { ...i, activa: newVal } : i))
    
    const { error } = await supabase.from('menu_promociones').update({ activa: newVal }).eq('id', item.id)
    if (error) {
      // Rollback
      setPromos(promos.map(i => i.id === item.id ? { ...i, activa: item.activa } : i))
      setErrorModal('Error al cambiar disponibilidad: ' + error.message)
    }
  }

  if (loading) return <div className="text-muted text-center py-10">Cargando promociones...</div>

  return (
    <div className="pb-24">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-10 gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-black text-slate-800 mb-2 tracking-tight">Promociones</h1>
          <p className="text-slate-500 font-medium">Ofertas temporales para atraer clientes.</p>
        </div>
        <button 
          className="w-full sm:w-auto px-6 py-3 bg-[#FF7A6A] hover:bg-[#ff6250] text-white font-bold rounded-2xl shadow-lg shadow-[#FF7A6A]/30 transition-all active:scale-[0.98] flex items-center justify-center gap-2 group" 
          onClick={() => handleOpenModal()}
        >
          <Plus size={20} className="group-hover:rotate-90 transition-transform" /> 
          Nueva Promoción
        </button>
      </div>

      {promos.length === 0 ? (
        <div className="bg-white rounded-[32px] border border-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.02)] text-center py-20 px-6">
          <div className="w-20 h-20 bg-[#FFF0EE] rounded-[24px] flex items-center justify-center mx-auto mb-6 shadow-sm">
            <Tag className="text-[#FF7A6A]" size={32} />
          </div>
          <h3 className="text-2xl font-black text-slate-800 mb-2">Sin Promociones</h3>
          <p className="text-slate-500 font-medium mb-8 max-w-sm mx-auto">Aumenta tus ventas lanzando una promoción especial (ej. 2x1 los Jueves).</p>
          <button 
            className="px-8 py-3 bg-[#FF7A6A] hover:bg-[#ff6250] text-white font-bold rounded-xl shadow-lg shadow-[#FF7A6A]/30 transition-all active:scale-[0.98]" 
            onClick={() => handleOpenModal()}
          >
            Crear Promoción
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {promos.map(promo => (
            <div key={promo.id} className="bg-white rounded-[24px] border border-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.02)] hover:shadow-lg hover:shadow-[#FF7A6A]/10 transition-all p-5 flex flex-col sm:flex-row gap-4 group relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1.5 h-full bg-gradient-to-b from-[#FF7A6A] to-[#FFA08A]"></div>
              
              <div className="w-full sm:w-32 h-40 sm:h-32 rounded-[16px] bg-[#FFF0EE] shrink-0 flex items-center justify-center overflow-hidden border border-slate-50">
                {promo.foto_url ? (
                  <img src={promo.foto_url} alt={promo.titulo} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                ) : (
                  <ImageIcon size={32} className="text-[#FF7A6A]/40" />
                )}
              </div>
              
              <div className="flex-1 flex flex-col justify-center min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="px-2 py-0.5 rounded-full bg-[#FFF0EE] text-[#FF7A6A] text-[9px] font-black uppercase tracking-wider shrink-0">PROMO</span>
                  <h3 className="m-0 text-lg font-black text-slate-800 tracking-tight truncate">{promo.titulo}</h3>
                </div>
                <p className="m-0 mb-auto text-sm text-slate-500 font-medium line-clamp-2">{promo.descripcion}</p>
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 mt-3">
                  <p className="m-0 font-black text-[#FF7A6A] text-xl">${Number(promo.precio_especial).toFixed(2)}</p>
                  {promo.fecha_fin && (
                    <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#FFF0EE] text-[#FF7A6A] text-[10px] font-bold uppercase tracking-wider border border-[#FFF0EE]">
                      <Calendar size={12} /> Válido hasta {new Date(promo.fecha_fin).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </div>
              
              <div className="flex sm:flex-col items-center sm:items-end justify-between border-t border-slate-100 sm:border-0 pt-4 sm:pt-0 mt-4 sm:mt-0 sm:pl-4 sm:border-l shrink-0">
                <label className="toggle">
                  <input type="checkbox" checked={promo.activa} onChange={() => toggleActiva(promo)} />
                  <span className="toggle-slider"></span>
                </label>
                <div className="flex flex-row gap-1">
                  <button className="p-2.5 text-slate-400 hover:text-blue-500 hover:bg-[#FFF0EE] rounded-xl transition-colors" onClick={() => handleOpenModal(promo)}>
                    <Edit2 size={16} />
                  </button>
                  <button className="p-2.5 text-slate-400 hover:text-red-500 hover:bg-[#FFF0EE] rounded-xl transition-colors" onClick={() => handleDelete(promo.id)}>
                    <Trash2 size={16} />
                  </button>
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
        title={isEditingOptions ? '' : (editingItem.id ? 'Editar Promoción' : 'Nueva Promoción')}
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
            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Título de la promoción *</label>
            <input required type="text" className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:border-blue-500 outline-none transition-colors text-slate-800 font-medium" value={editingItem.titulo || ''} onChange={e => setEditingItem({...editingItem, titulo: e.target.value})} placeholder="Ej. 2x1 en Hamburguesas" />
          </div>
          
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Descripción</label>
            <textarea className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:border-blue-500 outline-none transition-colors text-slate-800 font-medium min-h-[80px]" value={editingItem.descripcion || ''} onChange={e => setEditingItem({...editingItem, descripcion: e.target.value})} placeholder="Válido solo en consumo en restaurante..." />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Precio Especial ($) *</label>
              <input required type="number" step="0.01" min="0" className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:border-blue-500 outline-none transition-colors text-slate-800 font-medium" value={editingItem.precio_especial || 0} onChange={e => setEditingItem({...editingItem, precio_especial: parseFloat(e.target.value)})} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Fecha Límite (Opcional)</label>
              <input type="date" className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:border-blue-500 outline-none transition-colors text-slate-800 font-medium" value={editingItem.fecha_fin || ''} onChange={e => setEditingItem({...editingItem, fecha_fin: e.target.value})} />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Días de aplicación *</label>
            <div className="flex flex-wrap gap-2">
              {DIAS_SEMANA.map(dia => {
                // If dias_aplicacion is undefined, it means all days apply (for legacy promos)
                const currentDias = editingItem.dias_aplicacion || DIAS_SEMANA.map(d => d.id);
                const isSelected = currentDias.includes(dia.id);
                return (
                  <button
                    key={dia.id}
                    type="button"
                    onClick={() => {
                      let newDias;
                      if (currentDias.includes(dia.id)) {
                        newDias = currentDias.filter(d => d !== dia.id)
                      } else {
                        newDias = [...currentDias, dia.id]
                      }
                      setEditingItem({...editingItem, dias_aplicacion: newDias})
                    }}
                    className={`px-3 py-1.5 rounded-lg text-sm font-bold transition-all ${isSelected ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'}`}
                  >
                    {dia.label}
                  </button>
                )
              })}
            </div>
            {editingItem.dias_aplicacion?.length === 0 && (
              <p className="text-xs text-red-500">Debes seleccionar al menos un día.</p>
            )}
          </div>

          <div className="flex items-start gap-3 mt-2 bg-blue-50/50 border border-blue-200 p-5 rounded-2xl shadow-sm">
            <input type="checkbox" id="subsidioPromo" checked={editingItem.aplica_subsidio ?? false} onChange={e => setEditingItem({...editingItem, aplica_subsidio: e.target.checked})} className="w-5 h-5 accent-blue-600 rounded cursor-pointer mt-0.5" />
            <label htmlFor="subsidioPromo" className="m-0 cursor-pointer flex flex-col">
              <span className="text-[15px] font-black text-blue-900">Aplicar Subsidio de Envío ($8.00)</span>
              <span className="text-[13px] font-medium text-blue-800/90 mt-1.5 leading-relaxed">
                Si esta casilla <strong className="text-blue-900">está marcada</strong>, el sistema le descontará automáticamente $8.00 al costo de envío del cliente por cada vez que agregue esta promoción al carrito.
              </span>
              <div className="mt-3 bg-white/60 p-3 rounded-lg border border-blue-100 text-[12px] text-blue-900">
                ⚠️ <b>IMPORTANTE:</b> Al marcar esto, tú como restaurante debes sumarle manualmente <b>$8.00</b> al Precio Especial que ingresaste arriba para recuperar ese dinero. Si lo desmarcas, el cliente pagará su envío completo y tu precio se queda intacto.
              </div>
            </label>
          </div>

          {/* Opciones y Modificadores */}
          <div className="mt-6 border-t border-slate-100 pt-6">
            <div className="flex items-center justify-between mb-2">
              <div>
                <h3 className="font-black text-slate-800">Opciones y Extras</h3>
                <p className="text-xs text-slate-500 mt-1">Configura Variantes o Extras para esta promoción.</p>
              </div>
            </div>
            
            <button
              type="button"
              onClick={() => setIsEditingOptions(true)}
              className="w-full mt-2 py-4 px-4 bg-white border border-slate-200 hover:border-blue-300 hover:bg-blue-50 rounded-xl shadow-sm transition-all flex items-center justify-between group"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Settings2 size={20} />
                </div>
                <div className="text-left">
                  <span className="block font-bold text-slate-700">Configurar Opciones</span>
                  <span className="block text-xs text-slate-500">
                    {(editingItem.opciones?.length || 0)} {editingItem.opciones?.length === 1 ? 'grupo configurado' : 'grupos configurados'}
                  </span>
                </div>
              </div>
              <span className="text-blue-600 font-bold text-sm">Editar</span>
            </button>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Foto de la Promoción (Opcional)</label>
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
                  accept="image/jpeg"
                  onChange={handleImageUpload}
                  disabled={uploadingImage}
                  className="w-full text-sm text-slate-500 file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-black file:uppercase file:tracking-wider file:bg-blue-100 file:text-blue-700 hover:file:bg-blue-200 cursor-pointer transition-colors"
                />
                {uploadingImage && <p className="text-xs text-blue-500 mt-2 font-bold flex items-center gap-1.5"><Loader2 size={12} className="animate-spin" /> Comprimiendo y subiendo...</p>}
              </div>
            </div>
          </div>

          <button type="submit" className="w-full mt-4 py-4 rounded-xl font-black text-white text-lg bg-slate-900 hover:bg-blue-500 shadow-xl shadow-slate-900/20 hover:shadow-blue-500/30 transition-all flex items-center justify-center gap-2 active:scale-[0.98]" disabled={saving || editingItem.dias_aplicacion?.length === 0}>
            {saving ? (
              <>
                <Loader2 size={20} className="animate-spin" />
                Guardando Promoción...
              </>
            ) : 'Guardar Promoción'}
          </button>
        </form>
        )}
      </BottomSheet>

      <ConfirmDialog 
        isOpen={!!itemToDelete} 
        title="Eliminar Promoción" 
        message="¿Estás seguro de que deseas eliminar esta promoción? Esta acción no se puede deshacer." 
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
