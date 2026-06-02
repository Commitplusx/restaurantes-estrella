import { useState, useEffect } from 'react'
import { Plus, Edit2, Trash2, Image as ImageIcon, X, Loader2, Package } from 'lucide-react'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { supabase, subirFoto } from '../../lib/supabase'
import type { Restaurante, MenuCombo } from '../../lib/supabase'

export function MenuCombosView({ restaurante }: { restaurante: Restaurante }) {
  const [combos, setCombos] = useState<MenuCombo[]>([])
  const [loading, setLoading] = useState(true)

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<Partial<MenuCombo>>({})
  const [saving, setSaving] = useState(false)
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
      setEditingItem({...editingItem, foto_url: url})
    } else {
      setErrorModal('Hubo un error al subir la foto. Intenta de nuevo.')
    }
    setUploadingImage(false)
  }

  useEffect(() => {
    loadData()
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
      setEditingItem({ restaurante_id: restaurante.id, disponible: true, precio: 0, incluye: [] })
      setIncluyeInput('')
    }
    setIsModalOpen(true)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    
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
    await supabase.from('menu_combos').delete().eq('id', itemToDelete)
    await loadData()
    setItemToDelete(null)
  }

  const toggleDisponible = async (item: MenuCombo) => {
    const newVal = !item.disponible
    setCombos(combos.map(i => i.id === item.id ? { ...i, disponible: newVal } : i))
    await supabase.from('menu_combos').update({ disponible: newVal }).eq('id', item.id)
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
          className="w-full sm:w-auto px-6 py-3.5 bg-slate-900 hover:bg-emerald-500 text-white font-bold rounded-2xl shadow-xl shadow-slate-200 hover:shadow-emerald-500/30 transition-all active:scale-[0.98] flex items-center justify-center gap-2 group" 
          onClick={() => handleOpenModal()}
        >
          <Plus size={20} className="group-hover:rotate-90 transition-transform" /> 
          Crear Combo
        </button>
      </div>

      {combos.length === 0 ? (
        <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm text-center py-20 px-6">
          <div className="w-20 h-20 bg-emerald-50 rounded-[1.5rem] flex items-center justify-center mx-auto mb-6">
            <Package className="text-emerald-400" size={32} />
          </div>
          <h3 className="text-2xl font-black text-slate-800 mb-2">Aún no tienes combos</h3>
          <p className="text-slate-500 font-medium mb-8 max-w-sm mx-auto">No tienes combos activos. Los combos son excelentes para subir el ticket promedio.</p>
          <button 
            className="px-8 py-3.5 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl shadow-lg shadow-emerald-500/30 transition-all active:scale-[0.98]" 
            onClick={() => handleOpenModal()}
          >
            Crear Primer Combo
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {combos.map(combo => (
            <div key={combo.id} className="bg-white rounded-[1.5rem] border border-slate-100 shadow-sm hover:shadow-xl hover:shadow-emerald-500/5 hover:border-emerald-200 transition-all p-5 flex flex-col sm:flex-row gap-5 group">
              
              <div className="w-full sm:w-32 h-40 sm:h-32 rounded-2xl bg-slate-50 shrink-0 flex items-center justify-center overflow-hidden border border-slate-100">
                {combo.foto_url ? (
                  <img src={combo.foto_url} alt={combo.nombre} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                ) : (
                  <ImageIcon size={32} className="text-slate-300" />
                )}
              </div>
              
              <div className="flex-1 flex flex-col justify-center">
                <h3 className="m-0 mb-1 text-lg font-black text-slate-800 tracking-tight">{combo.nombre}</h3>
                <p className="m-0 mb-3 text-sm text-slate-500 font-medium line-clamp-2">{combo.descripcion}</p>
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {combo.incluye?.map((item, idx) => (
                    <span key={idx} className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 text-[10px] font-black uppercase tracking-wider">{item}</span>
                  ))}
                </div>
                <p className="m-0 font-black text-emerald-500 text-xl">${Number(combo.precio).toFixed(2)}</p>
              </div>
              
              <div className="flex sm:flex-col items-center sm:items-end justify-between border-t border-slate-100 sm:border-0 pt-4 sm:pt-0 mt-4 sm:mt-0 sm:pl-2 sm:border-l shrink-0">
                <label className="toggle">
                  <input type="checkbox" checked={combo.disponible} onChange={() => toggleDisponible(combo)} />
                  <span className="toggle-slider"></span>
                </label>
                <div className="flex flex-row gap-1">
                  <button className="p-2 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors" onClick={() => handleOpenModal(combo)}>
                    <Edit2 size={16} />
                  </button>
                  <button className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors" onClick={() => handleDelete(combo.id)}>
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal CRUD */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white w-full sm:max-w-xl sm:rounded-[2.5rem] rounded-t-[2.5rem] max-h-[90vh] overflow-y-auto shadow-2xl p-6 sm:p-8">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-2xl font-black text-slate-800 tracking-tight">
                {editingItem.id ? 'Editar Combo' : 'Nuevo Combo'}
              </h2>
              <button className="p-2 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 transition-colors" onClick={() => setIsModalOpen(false)}>
                <X size={20} />
              </button>
            </div>
            
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
                      accept="image/*"
                      onChange={handleImageUpload}
                      disabled={uploadingImage}
                      className="w-full text-sm text-slate-500 file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-black file:uppercase file:tracking-wider file:bg-emerald-100 file:text-emerald-700 hover:file:bg-emerald-200 cursor-pointer transition-colors"
                    />
                    {uploadingImage && <p className="text-xs text-emerald-500 mt-2 font-bold flex items-center gap-1.5"><Loader2 size={12} className="animate-spin" /> Comprimiendo y subiendo...</p>}
                  </div>
                </div>
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
          </div>
        </div>
      )}

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
