import { useState, useEffect } from 'react'
import { Plus, Edit2, Trash2, Calendar, Image as ImageIcon, X, Loader2 } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import type { Restaurante, MenuPromocion } from '../../lib/supabase'

export function MenuPromosView({ restaurante }: { restaurante: Restaurante }) {
  const [promos, setPromos] = useState<MenuPromocion[]>([])
  const [loading, setLoading] = useState(true)

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<Partial<MenuPromocion>>({})
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    loadData()
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
      setEditingItem({ restaurante_id: restaurante.id, activa: true })
    }
    setIsModalOpen(true)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    
    const payload = { ...editingItem, restaurante_id: restaurante.id }
    
    if (payload.id) {
      await supabase.from('menu_promociones').update(payload).eq('id', payload.id)
    } else {
      await supabase.from('menu_promociones').insert(payload)
    }
    
    await loadData()
    setSaving(false)
    setIsModalOpen(false)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('¿Seguro que deseas eliminar esta promoción?')) return
    await supabase.from('menu_promociones').delete().eq('id', id)
    await loadData()
  }

  const toggleActiva = async (item: MenuPromocion) => {
    const newVal = !item.activa
    setPromos(promos.map(i => i.id === item.id ? { ...i, activa: newVal } : i))
    await supabase.from('menu_promociones').update({ activa: newVal }).eq('id', item.id)
  }

  if (loading) return <div className="text-muted text-center py-10">Cargando promociones...</div>

  return (
    <div className="pb-24">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-black m-0">Promociones Especiales</h1>
          <p className="text-muted m-0">Ofertas temporales para atraer clientes.</p>
        </div>
        <button className="btn btn-primary w-full sm:w-auto" onClick={() => handleOpenModal()}>
          <Plus size={18} /> Nueva Promoción
        </button>
      </div>

      {promos.length === 0 ? (
        <div className="card text-center py-12 px-4">
          <p className="text-muted mb-6">Aumenta tus ventas lanzando una promoción especial (ej. 2x1 los Jueves).</p>
          <button className="btn btn-primary" onClick={() => handleOpenModal()}>Crear Promoción</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {promos.map(promo => (
            <div key={promo.id} className="card flex flex-col sm:flex-row gap-4 p-4 border-l-4 border-l-danger hover:border-r hover:border-y hover:border-r-orange-500/30 hover:border-y-orange-500/30 transition-colors">
              <div className="w-full sm:w-24 h-40 sm:h-24 rounded-xl bg-surface2 shrink-0 flex items-center justify-center overflow-hidden border border-border">
                {promo.foto_url ? (
                  <img src={promo.foto_url} alt={promo.titulo} className="w-full h-full object-cover" />
                ) : (
                  <ImageIcon size={32} className="text-muted" />
                )}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="badge badge-red shrink-0">PROMO</span>
                  <h3 className="m-0 text-lg font-bold">{promo.titulo}</h3>
                </div>
                <p className="m-0 mb-2 text-sm text-muted">{promo.descripcion}</p>
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                  <p className="m-0 font-black text-danger text-lg">${Number(promo.precio_especial).toFixed(2)}</p>
                  {promo.fecha_fin && (
                    <span className="flex items-center gap-1 text-xs text-orange-400 font-medium">
                      <Calendar size={14} /> Válido hasta {new Date(promo.fecha_fin).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-between border-t border-border sm:border-0 pt-4 sm:pt-0 mt-4 sm:mt-0">
                <label className="toggle">
                  <input type="checkbox" checked={promo.activa} onChange={() => toggleActiva(promo)} />
                  <span className="toggle-slider"></span>
                </label>
                <div className="flex gap-2">
                  <button className="btn btn-ghost p-2" onClick={() => handleOpenModal(promo)}><Edit2 size={16} /></button>
                  <button className="btn btn-danger p-2" onClick={() => handleDelete(promo.id)}><Trash2 size={16} /></button>
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
              <h2 className="text-xl font-bold m-0">{editingItem.id ? 'Editar Promoción' : 'Nueva Promoción'}</h2>
              <button className="btn btn-ghost p-1 rounded-full border-0" onClick={() => setIsModalOpen(false)}>
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSave} className="flex flex-col gap-4">
              <div className="field">
                <label>Título de la promoción *</label>
                <input required type="text" value={editingItem.titulo || ''} onChange={e => setEditingItem({...editingItem, titulo: e.target.value})} placeholder="Ej. 2x1 en Hamburguesas" />
              </div>
              
              <div className="field">
                <label>Descripción</label>
                <textarea value={editingItem.descripcion || ''} onChange={e => setEditingItem({...editingItem, descripcion: e.target.value})} placeholder="Válido solo en consumo en restaurante..." />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="field">
                  <label>Precio Especial ($) *</label>
                  <input required type="number" step="0.01" min="0" value={editingItem.precio_especial || 0} onChange={e => setEditingItem({...editingItem, precio_especial: parseFloat(e.target.value)})} />
                </div>
                <div className="field">
                  <label>Fecha Límite (Opcional)</label>
                  <input type="date" value={editingItem.fecha_fin || ''} onChange={e => setEditingItem({...editingItem, fecha_fin: e.target.value})} />
                </div>
              </div>

              <div className="field">
                <label>URL de la Foto (Opcional)</label>
                <input type="url" value={editingItem.foto_url || ''} onChange={e => setEditingItem({...editingItem, foto_url: e.target.value})} placeholder="https://..." />
              </div>

              <button type="submit" className="btn btn-primary mt-4 py-3" disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Guardando...
                  </>
                ) : 'Guardar Promoción'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
