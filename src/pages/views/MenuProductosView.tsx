import { useState, useEffect } from 'react'
import { Plus, Edit2, Trash2, Image as ImageIcon, X, Loader2 } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import type { Restaurante, MenuItem, MenuCategoria } from '../../lib/supabase'

export function MenuProductosView({ restaurante }: { restaurante: Restaurante }) {
  const [items, setItems] = useState<MenuItem[]>([])
  const [categorias, setCategorias] = useState<MenuCategoria[]>([])
  const [loading, setLoading] = useState(true)
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<Partial<MenuItem>>({})
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    loadData()
  }, [restaurante.id])

  async function loadData() {
    setLoading(true)
    const [ { data: cats }, { data: prods } ] = await Promise.all([
      supabase.from('menu_categorias').select('*').eq('restaurante_id', restaurante.id).order('orden'),
      supabase.from('menu_items').select('*').eq('restaurante_id', restaurante.id).order('orden')
    ])
    setCategorias(cats || [])
    setItems(prods || [])
    setLoading(false)
  }

  const handleOpenModal = (item?: MenuItem) => {
    if (item) {
      setEditingItem(item)
    } else {
      setEditingItem({ restaurante_id: restaurante.id, disponible: true, precio: 0 })
    }
    setIsModalOpen(true)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    
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

    const payload = { ...editingItem, restaurante_id: restaurante.id, categoria_id: catId }
    
    if (payload.id) {
      const { error } = await supabase.from('menu_items').update(payload).eq('id', payload.id)
      if (error) { alert('Error al guardar: ' + error.message); setSaving(false); return }
    } else {
      const { error } = await supabase.from('menu_items').insert(payload)
      if (error) { alert('Error al crear: ' + error.message); setSaving(false); return }
    }
    
    await loadData()
    setSaving(false)
    setIsModalOpen(false)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('¿Seguro que deseas eliminar este platillo?')) return
    await supabase.from('menu_items').delete().eq('id', id)
    await loadData()
  }

  const toggleDisponible = async (item: MenuItem) => {
    const newVal = !item.disponible
    setItems(items.map(i => i.id === item.id ? { ...i, disponible: newVal } : i))
    await supabase.from('menu_items').update({ disponible: newVal }).eq('id', item.id)
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
          <h1 className="text-2xl font-black m-0">Platillos</h1>
          <p className="text-muted m-0">Gestiona tu menú principal.</p>
        </div>
        <button className="btn btn-primary w-full sm:w-auto" onClick={() => handleOpenModal()}>
          <Plus size={18} /> Agregar Platillo
        </button>
      </div>

      {categorias.length === 0 && items.length === 0 ? (
        <div className="card text-center py-12 px-4">
          <h3 className="text-xl font-bold">Aún no tienes platillos</h3>
          <p className="text-muted mb-6">Agrega tu primer producto para empezar a vender.</p>
          <button className="btn btn-primary" onClick={() => handleOpenModal()}>Crear Platillo</button>
        </div>
      ) : (
        <div className="flex flex-col gap-8">
          {categorias.map(cat => {
            const catItems = items.filter(i => i.categoria_id === cat.id)
            return (
              <div key={cat.id}>
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                  <span>{cat.emoji}</span> {cat.nombre}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {catItems.length === 0 && <p className="text-muted text-sm">No hay platillos en esta categoría.</p>}
                  {catItems.map(item => (
                    <div key={item.id} className="card flex items-center gap-4 p-4 hover:border-orange-500/30 transition-colors">
                      <div className="w-20 h-20 rounded-xl bg-surface2 shrink-0 flex items-center justify-center overflow-hidden border border-border">
                        {item.foto_url ? (
                          <img src={item.foto_url} alt={item.nombre} className="w-full h-full object-cover" />
                        ) : (
                          <ImageIcon size={24} className="text-muted" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="m-0 text-base font-bold truncate">{item.nombre}</h4>
                          {item.es_popular && <span className="badge badge-orange">Popular</span>}
                        </div>
                        <p className="m-1 text-sm text-muted line-clamp-2 leading-tight">
                          {item.descripcion}
                        </p>
                        <p className="m-0 font-black text-brand">${Number(item.precio).toFixed(2)}</p>
                      </div>
                      <div className="flex flex-col items-end gap-3 h-full justify-between">
                        <label className="toggle">
                          <input type="checkbox" checked={item.disponible} onChange={() => toggleDisponible(item)} />
                          <span className="toggle-slider"></span>
                        </label>
                        <div className="flex gap-2">
                          <button className="btn btn-ghost p-2" onClick={() => handleOpenModal(item)}><Edit2 size={16} /></button>
                          <button className="btn btn-danger p-2" onClick={() => handleDelete(item.id)}><Trash2 size={16} /></button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal CRUD */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold m-0">{editingItem.id ? 'Editar Platillo' : 'Nuevo Platillo'}</h2>
              <button className="btn btn-ghost p-1 rounded-full border-0" onClick={() => setIsModalOpen(false)}>
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSave} className="flex flex-col gap-4">
              <div className="field">
                <label>Nombre del platillo *</label>
                <input required type="text" value={editingItem.nombre || ''} onChange={e => setEditingItem({...editingItem, nombre: e.target.value})} placeholder="Ej. Hamburguesa Doble" />
              </div>
              
              <div className="field">
                <label>Descripción</label>
                <textarea value={editingItem.descripcion || ''} onChange={e => setEditingItem({...editingItem, descripcion: e.target.value})} placeholder="Ingredientes, preparación..." />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="field">
                  <label>Precio ($) *</label>
                  <input required type="number" step="0.01" min="0" value={editingItem.precio || 0} onChange={e => setEditingItem({...editingItem, precio: parseFloat(e.target.value)})} />
                </div>
                <div className="field">
                  <label>Categoría</label>
                  <select value={editingItem.categoria_id || ''} onChange={e => setEditingItem({...editingItem, categoria_id: e.target.value})}>
                    {categorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                    {categorias.length === 0 && <option value="">Automática</option>}
                  </select>
                </div>
              </div>

              <div className="field">
                <label>URL de la Foto (Opcional por ahora)</label>
                <input type="url" value={editingItem.foto_url || ''} onChange={e => setEditingItem({...editingItem, foto_url: e.target.value})} placeholder="https://..." />
              </div>

              <div className="flex items-center gap-2 mt-2">
                <input type="checkbox" id="pop" checked={editingItem.es_popular || false} onChange={e => setEditingItem({...editingItem, es_popular: e.target.checked})} className="w-auto" />
                <label htmlFor="pop" className="m-0 cursor-pointer text-sm">Marcar como "Popular"</label>
              </div>

              <button type="submit" className="btn btn-primary mt-4 py-3" disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Guardando...
                  </>
                ) : 'Guardar Platillo'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
