import { useState, useEffect } from 'react'

import { supabase } from '../../lib/supabase'
import type { Restaurante } from '../../lib/supabase'
import { Save, Store, Clock, Image as ImageIcon, Loader2 } from 'lucide-react'

// Categorías comunes para restaurantes
const CATEGORIAS_COMUNES = [
  'Hamburguesas', 'Pizzas', 'Sushi', 'Tacos', 'Alitas', 
  'Mariscos', 'Postres', 'Desayunos', 'Bebidas', 'Saludable',
  'Comida China', 'Antojitos'
]

export function PerfilView({ restaurante }: { restaurante: Restaurante }) {
  // Estado local para los campos
  const [formData, setFormData] = useState({
    foto_fachada_url: restaurante.foto_fachada_url || '',
    hora_apertura: restaurante.hora_apertura || '09:00:00',
    hora_cierre: restaurante.hora_cierre || '22:00:00',
    categorias: restaurante.categorias || []
  })
  
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)

  // Actualizar el estado si el prop cambia
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setFormData({
      foto_fachada_url: restaurante.foto_fachada_url || '',
      hora_apertura: restaurante.hora_apertura || '09:00:00',
      hora_cierre: restaurante.hora_cierre || '22:00:00',
      categorias: restaurante.categorias || []
    })
  }, [restaurante])

  const toggleCategoria = (cat: string) => {
    setFormData(prev => {
      const current = prev.categorias || []
      if (current.includes(cat)) {
        return { ...prev, categorias: current.filter((c: string) => c !== cat) }
      } else {
        if (current.length >= 3) return prev // Limitar a 3 categorías
        return { ...prev, categorias: [...current, cat] }
      }
    })
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      if (!e.target.files || e.target.files.length === 0) return
      
      const file = e.target.files[0]
      const fileExt = file.name.split('.').pop()
      const fileName = `${restaurante.id}-${Math.random()}.${fileExt}`
      const filePath = `fachadas/${fileName}`

      setUploadingImage(true)

      // Subir archivo al bucket 'restaurantes'
      const { error: uploadError } = await supabase.storage
        .from('restaurantes')
        .upload(filePath, file, { upsert: true })

      if (uploadError) throw uploadError

      // Obtener URL pública
      const { data } = supabase.storage
        .from('restaurantes')
        .getPublicUrl(filePath)

      setFormData(prev => ({ ...prev, foto_fachada_url: data.publicUrl }))
    } catch (error) {
      console.error('Error al subir imagen:', error)
      alert('Hubo un error al subir la imagen. Asegúrate de que pesa menos de 5MB.')
    } finally {
      setUploadingImage(false)
    }
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setSuccess(false)

    const { error } = await supabase
      .from('restaurantes')
      .update({
        foto_fachada_url: formData.foto_fachada_url,
        hora_apertura: formData.hora_apertura,
        hora_cierre: formData.hora_cierre,
        categorias: formData.categorias
      })
      .eq('id', restaurante.id)

    setSaving(false)
    if (!error) {
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } else {
      console.error(error)
      alert("Hubo un error al guardar los cambios.")
    }
  }

  return (
    <div className="pb-24">
      <div className="mb-8">
        <h1 className="text-3xl font-black text-slate-800 mb-2">Mi Perfil</h1>
        <p className="text-muted">Configura la información pública de tu restaurante.</p>
      </div>

      <div className="max-w-2xl">
        <form onSubmit={handleSave} className="space-y-6">
          
          {/* FOTO DE PORTADA */}
          <div className="card p-6 border-l-4 border-l-brand">
            <h2 className="text-lg font-bold flex items-center gap-2 mb-4">
              <ImageIcon className="text-brand" size={20} />
              Foto de Portada
            </h2>
            
            <div className="flex flex-col sm:flex-row gap-6 items-start">
              <div className="w-full sm:w-48 h-32 rounded-xl bg-slate-100 border-2 border-dashed border-slate-300 flex items-center justify-center overflow-hidden shrink-0">
                {formData.foto_fachada_url ? (
                  <img src={formData.foto_fachada_url} alt="Portada" className="w-full h-full object-cover" />
                ) : (
                  <Store className="text-slate-300" size={32} />
                )}
              </div>
              
              <div className="flex-1 w-full space-y-3">
                <label className="text-sm font-semibold text-slate-700">Sube una foto desde tu dispositivo</label>
                
                <div className="flex items-center gap-4">
                  <label className={`btn btn-ghost cursor-pointer ${uploadingImage ? 'opacity-50 pointer-events-none' : ''}`}>
                    {uploadingImage ? <Loader2 className="animate-spin" size={18} /> : <ImageIcon size={18} />}
                    {uploadingImage ? 'Subiendo...' : 'Seleccionar Foto'}
                    <input 
                      type="file" 
                      accept="image/*"
                      onChange={handleImageUpload}
                      disabled={uploadingImage}
                      className="hidden"
                    />
                  </label>
                  
                  {formData.foto_fachada_url && (
                    <button 
                      type="button"
                      onClick={() => setFormData({...formData, foto_fachada_url: ''})}
                      className="text-xs text-red-500 hover:text-red-700 underline font-medium"
                    >
                      Quitar foto
                    </button>
                  )}
                </div>

                <p className="text-xs text-slate-500">
                  Esta es la foto que los clientes verán en el directorio público. Usa una foto atractiva de tu fachada o tu mejor platillo.
                </p>
              </div>
            </div>
          </div>

          {/* HORARIOS */}
          <div className="card p-6">
            <h2 className="text-lg font-bold flex items-center gap-2 mb-4">
              <Clock className="text-blue-500" size={20} />
              Horarios de Atención
            </h2>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-semibold text-slate-700 block mb-1">Hora de Apertura</label>
                <input 
                  type="time" 
                  required
                  value={formData.hora_apertura}
                  onChange={e => setFormData({...formData, hora_apertura: e.target.value})}
                  className="w-full p-2 border border-slate-200 rounded-lg focus:border-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="text-sm font-semibold text-slate-700 block mb-1">Hora de Cierre</label>
                <input 
                  type="time" 
                  required
                  value={formData.hora_cierre}
                  onChange={e => setFormData({...formData, hora_cierre: e.target.value})}
                  className="w-full p-2 border border-slate-200 rounded-lg focus:border-blue-500 outline-none"
                />
              </div>
            </div>
            <p className="text-xs text-slate-500 mt-3">
              Usamos este horario para mostrar a los clientes si tu negocio está "Abierto Ahora".
            </p>
          </div>

          {/* CATEGORÍAS */}
          <div className="card p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold">Categorías</h2>
              <span className="text-xs font-semibold px-2 py-1 bg-slate-100 text-slate-600 rounded-full">
                {formData.categorias?.length || 0} / 3
              </span>
            </div>
            <p className="text-sm text-slate-600 mb-4">
              Selecciona hasta 3 categorías que mejor describan tu menú. Esto ayudará a los clientes a encontrarte más rápido.
            </p>
            
            <div className="flex flex-wrap gap-2">
              {CATEGORIAS_COMUNES.map(cat => {
                const isSelected = formData.categorias?.includes(cat);
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => toggleCategoria(cat)}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                      isSelected 
                        ? 'bg-brand text-white shadow-md scale-105' 
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {cat}
                  </button>
                )
              })}
            </div>
          </div>

          {/* GUARDAR */}
          <div className="pt-4">
            <button 
              type="submit" 
              disabled={saving}
              className={`w-full sm:w-auto px-8 py-3 rounded-xl font-bold text-white transition-all flex items-center justify-center gap-2 ${
                success ? 'bg-green-500 shadow-lg shadow-green-500/30' : 'bg-brand hover:bg-orange-600 shadow-lg shadow-orange-500/30'
              }`}
            >
              {saving ? (
                <><Loader2 className="animate-spin" size={20} /> Guardando...</>
              ) : success ? (
                <><Save size={20} /> ¡Guardado Exitosamente!</>
              ) : (
                <><Save size={20} /> Guardar Cambios</>
              )}
            </button>
          </div>

        </form>
      </div>
    </div>
  )
}
