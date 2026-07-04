import { useState } from 'react'
import { Plus, Trash2, Loader2 } from 'lucide-react'
import { supabase } from '../lib/supabase'
import type { MenuCategoria } from '../lib/supabase'

interface CategoriasEditorProps {
  restauranteId: string;
  categorias: MenuCategoria[];
  onClose: () => void;
}

export function CategoriasEditor({ restauranteId, categorias, onClose }: CategoriasEditorProps) {
  const [nuevaCategoria, setNuevaCategoria] = useState('')
  const [nuevoEmoji, setNuevoEmoji] = useState('')
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!nuevaCategoria.trim()) return

    setSaving(true)
    setErrorMsg(null)
    
    const maxOrden = categorias.length > 0 ? Math.max(...categorias.map(c => c.orden || 0)) : 0
    
    const { error } = await supabase.from('menu_categorias').insert({
      restaurante_id: restauranteId,
      nombre: nuevaCategoria.trim(),
      emoji: nuevoEmoji.trim() || null,
      orden: maxOrden + 1
    })

    if (error) {
      setErrorMsg('Error al crear categoría: ' + error.message)
    } else {
      setNuevaCategoria('')
      setNuevoEmoji('')
    }
    setSaving(false)
  }

  const handleDelete = async (id: string) => {
    const { data: items } = await supabase.from('menu_items').select('id').eq('categoria_id', id).limit(1)
    if (items && items.length > 0) {
      setErrorMsg('No puedes borrar esta categoría porque aún tiene platillos asignados. Edita esos platillos para cambiarles la categoría primero.')
      return
    }

    setDeletingId(id)
    setErrorMsg(null)
    const { error } = await supabase.from('menu_categorias').delete().eq('id', id)
    if (error) {
      setErrorMsg('Error al borrar: ' + error.message)
    }
    setDeletingId(null)
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="text-sm text-slate-500 font-medium leading-relaxed">
        Organiza tu menú por secciones. Tus clientes podrán navegar más fácil entre tus productos.
      </div>

      {errorMsg && (
        <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg border border-red-100 font-medium">
          {errorMsg}
        </div>
      )}

      <form onSubmit={handleAdd} className="flex gap-2">
        <input 
          type="text" 
          placeholder="🍔"
          maxLength={2}
          value={nuevoEmoji}
          onChange={e => setNuevoEmoji(e.target.value)}
          className="w-14 px-3 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:border-blue-500 outline-none text-center text-xl"
        />
        <input 
          type="text" 
          required
          placeholder="Nombre (ej. Bebidas)"
          value={nuevaCategoria}
          onChange={e => setNuevaCategoria(e.target.value)}
          className="flex-1 px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:border-blue-500 outline-none font-medium text-slate-800"
        />
        <button 
          type="submit"
          disabled={saving || !nuevaCategoria.trim()}
          className="px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl font-bold transition-colors flex items-center justify-center shrink-0"
        >
          {saving ? <Loader2 size={20} className="animate-spin" /> : <Plus size={20} />}
        </button>
      </form>

      <div className="flex flex-col gap-2 max-h-[40vh] overflow-y-auto pr-2 no-scrollbar">
        {categorias.length === 0 ? (
          <div className="text-center py-8 text-slate-400 text-sm italic">
            No tienes categorías aún.
          </div>
        ) : (
          categorias.map(cat => (
            <div key={cat.id} className="flex items-center gap-3 bg-white border border-slate-100 p-3 rounded-xl shadow-sm">
              <div className="w-10 h-10 rounded-lg bg-slate-50 flex items-center justify-center text-xl shrink-0">
                {cat.emoji || '🍽️'}
              </div>
              <div className="flex-1 font-bold text-slate-700 truncate">
                {cat.nombre}
              </div>
              <button 
                type="button"
                onClick={() => handleDelete(cat.id)}
                disabled={deletingId === cat.id}
                className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors shrink-0"
              >
                {deletingId === cat.id ? <Loader2 size={18} className="animate-spin" /> : <Trash2 size={18} />}
              </button>
            </div>
          ))
        )}
      </div>

      <button 
        type="button"
        onClick={onClose}
        className="w-full py-4 mt-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors"
      >
        Cerrar
      </button>
    </div>
  )
}
