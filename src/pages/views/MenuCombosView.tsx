import { useState, useEffect } from 'react'
import { Plus, Edit2, Trash2, Image as ImageIcon, X, Loader2 } from 'lucide-react'
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
      alert('Hubo un error al subir la foto. Intenta de nuevo.')
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
      if (error) { alert('Error al guardar: ' + error.message); setSaving(false); return }
    } else {
      const { error } = await supabase.from('menu_combos').insert(payload)
      if (error) { alert('Error al crear: ' + error.message); setSaving(false); return }
    }
    
    await loadData()
    setSaving(false)
    setIsModalOpen(false)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('¿Seguro que deseas eliminar este combo?')) return
    await supabase.from('menu_combos').delete().eq('id', id)
    await loadData()
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-black m-0">Paquetes / Combos</h1>
          <p className="text-muted m-0">Agrupa productos a un mejor precio.</p>
        </div>
        <button className="btn btn-primary w-full sm:w-auto" onClick={() => handleOpenModal()}>
          <Plus size={18} /> Crear Combo
        </button>
      </div>

      {combos.length === 0 ? (
        <div className="card text-center py-12 px-4">
          <p className="text-muted mb-6">No tienes combos activos. Los combos son excelentes para subir el ticket promedio.</p>
          <button className="btn btn-primary" onClick={() => handleOpenModal()}>Crear Primer Combo</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {combos.map(combo => (
            <div key={combo.id} className="card flex flex-col sm:flex-row gap-4 p-4 hover:border-orange-500/30 transition-colors">
              <div className="w-full sm:w-28 h-40 sm:h-28 rounded-xl bg-surface2 shrink-0 flex items-center justify-center overflow-hidden border border-border">
                {combo.foto_url ? (
                  <img src={combo.foto_url} alt={combo.nombre} className="w-full h-full object-cover" />
                ) : (
                  <ImageIcon size={32} className="text-muted" />
                )}
              </div>
              <div className="flex-1">
                <h3 className="m-0 mb-1 text-lg font-bold">{combo.nombre}</h3>
                <p className="m-0 mb-2 text-sm text-muted">{combo.descripcion}</p>
                <div className="flex flex-wrap gap-1 mb-2">
                  {combo.incluye?.map((item, idx) => (
                    <span key={idx} className="badge badge-orange">{item}</span>
                  ))}
                </div>
                <p className="m-0 font-black text-brand text-lg">${Number(combo.precio).toFixed(2)}</p>
              </div>
              <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-between border-t border-border sm:border-0 pt-4 sm:pt-0 mt-4 sm:mt-0">
                <label className="toggle">
                  <input type="checkbox" checked={combo.disponible} onChange={() => toggleDisponible(combo)} />
                  <span className="toggle-slider"></span>
                </label>
                <div className="flex gap-2">
                  <button className="btn btn-ghost p-2" onClick={() => handleOpenModal(combo)}><Edit2 size={16} /></button>
                  <button className="btn btn-danger p-2" onClick={() => handleDelete(combo.id)}><Trash2 size={16} /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal CRUD */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold m-0">{editingItem.id ? 'Editar Combo' : 'Nuevo Combo'}</h2>
              <button className="btn btn-ghost p-1 rounded-full border-0" onClick={() => setIsModalOpen(false)}>
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSave} className="flex flex-col gap-4">
              <div className="field">
                <label>Nombre del combo *</label>
                <input required type="text" value={editingItem.nombre || ''} onChange={e => setEditingItem({...editingItem, nombre: e.target.value})} placeholder="Ej. Paquete Familiar" />
              </div>
              
              <div className="field">
                <label>Descripción</label>
                <textarea value={editingItem.descripcion || ''} onChange={e => setEditingItem({...editingItem, descripcion: e.target.value})} placeholder="Ideal para 4 personas..." />
              </div>

              <div className="field">
                <label>Elementos incluidos (separados por coma) *</label>
                <input required type="text" value={incluyeInput} onChange={e => setIncluyeInput(e.target.value)} placeholder="Ej. 2 Pizzas, 1 Refresco, 1 Helado" />
                <span className="text-[0.7rem] text-muted">Escribe los items separados por una coma (,).</span>
              </div>

              <div className="field">
                <label>Precio del combo ($) *</label>
                <input required type="number" step="0.01" min="0" value={editingItem.precio || 0} onChange={e => setEditingItem({...editingItem, precio: parseFloat(e.target.value)})} />
              </div>

              <div className="field">
                <label>Foto del Combo (Opcional)</label>
                <div className="flex items-center gap-4">
                  {editingItem.foto_url && (
                    <img src={editingItem.foto_url} alt="Vista previa" className="w-16 h-16 rounded-xl object-cover bg-slate-100 shrink-0" />
                  )}
                  <div className="flex-1">
                    <input 
                      type="file" 
                      accept="image/*"
                      onChange={handleImageUpload}
                      disabled={uploadingImage}
                      className="w-full text-sm text-slate-500 file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-bold file:bg-orange-50 file:text-orange-600 hover:file:bg-orange-100 cursor-pointer transition-colors"
                    />
                    {uploadingImage && <p className="text-xs text-orange-500 mt-2 font-bold flex items-center gap-1"><Loader2 size={12} className="animate-spin" /> Subiendo imagen...</p>}
                  </div>
                </div>
              </div>

              <button type="submit" className="btn btn-primary mt-4 py-3" disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Guardando...
                  </>
                ) : 'Guardar Combo'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
