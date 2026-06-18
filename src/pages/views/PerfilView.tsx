import { useState, useEffect } from 'react'

import { supabase, subirFoto } from '../../lib/supabase'
import type { Restaurante } from '../../lib/supabase'
import { Save, Store, Clock, Image as ImageIcon, Loader2, Lock, AlertCircle } from 'lucide-react'

// Categorías comunes para restaurantes
const CATEGORIAS_COMUNES = [
  'Hamburguesas', 'Pizzas', 'Sushi', 'Tacos', 'Alitas', 
  'Mariscos', 'Postres', 'Desayunos', 'Bebidas', 'Saludable',
  'Comida China', 'Antojitos'
]

export function PerfilView({ restaurante, onUpdate }: { restaurante: Restaurante, onUpdate?: () => void }) {
  // Estado local para los campos
  const [formData, setFormData] = useState({
    nombre: restaurante.nombre || '',
    telefono: restaurante.telefono || '',
    foto_fachada_url: restaurante.foto_fachada_url || '',
    hora_apertura: restaurante.hora_apertura || '09:00:00',
    hora_cierre: restaurante.hora_cierre || '22:00:00',
    categorias: restaurante.categorias || []
  })
  
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)

  // Estado para la contraseña
  const [newPassword, setNewPassword] = useState('')
  const [changingPassword, setChangingPassword] = useState(false)
  const [passwordMsg, setPasswordMsg] = useState({ type: '', text: '' })

  // Actualizar el estado si el prop cambia
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setFormData({
      nombre: restaurante.nombre || '',
      telefono: restaurante.telefono || '',
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

      const url = await subirFoto(file, filePath)
      
      if (url) {
        setFormData(prev => ({ ...prev, foto_fachada_url: url }))
      } else {
        throw new Error("No se pudo obtener la URL de la imagen")
      }
    } catch (error) {
      console.error('Error al subir imagen:', error)
      alert('Hubo un error al subir la imagen. Asegúrate de que pesa menos de 5MB.')
    } finally {
      setUploadingImage(false)
    }
  }

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      setPasswordMsg({ type: 'error', text: 'La contraseña debe tener al menos 6 caracteres' });
      return;
    }
    setChangingPassword(true);
    setPasswordMsg({ type: '', text: '' });
    
    const { error } = await supabase.auth.updateUser({
      password: newPassword
    });

    if (error) {
      setPasswordMsg({ type: 'error', text: error.message });
    } else {
      setPasswordMsg({ type: 'success', text: 'Contraseña actualizada exitosamente' });
      setNewPassword('');
    }
    setChangingPassword(false);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setSuccess(false)

    const { error } = await supabase
      .from('restaurantes')
      .update({
        nombre: formData.nombre,
        telefono: formData.telefono,
        foto_fachada_url: formData.foto_fachada_url,
        hora_apertura: formData.hora_apertura,
        hora_cierre: formData.hora_cierre,
        categorias: formData.categorias
      })
      .eq('id', restaurante.id)

    setSaving(false)
    if (!error) {
      setSuccess(true)
      if (onUpdate) onUpdate()
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

      <div className="max-w-3xl">
        <form onSubmit={handleSave} className="space-y-8">
          
          {/* INFORMACIÓN BÁSICA */}
          <div className="bg-white p-6 md:p-8 rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
            <h2 className="text-lg font-bold flex items-center gap-2 mb-4">
              <Store className="text-orange-500" size={20} />
              Información Básica
            </h2>
            
            <div className="space-y-4">
              <div>
                <label className="text-sm font-semibold text-slate-700 block mb-1">Nombre del Restaurante</label>
                <input 
                  type="text" 
                  required
                  value={formData.nombre}
                  onChange={e => setFormData({...formData, nombre: e.target.value})}
                  className="w-full p-2 border border-slate-200 rounded-lg focus:border-brand outline-none"
                  placeholder="Ej. Tacos El Paisa"
                />
              </div>
              <div>
                <label className="text-sm font-semibold text-slate-700 block mb-1">Teléfono (WhatsApp para recibir pedidos)</label>
                <input 
                  type="tel" 
                  required
                  value={formData.telefono}
                  onChange={e => setFormData({...formData, telefono: e.target.value})}
                  className="w-full p-2 border border-slate-200 rounded-lg focus:border-brand outline-none"
                  placeholder="Ej. 9631234567"
                />
                <p className="text-xs text-slate-500 mt-1">Este es el número al que los clientes enviarán sus pedidos directamente.</p>
              </div>
            </div>
          </div>
          
          {/* FOTO DE PORTADA */}
          <div className="bg-white p-6 md:p-8 rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-1.5 h-full bg-gradient-to-b from-orange-400 to-red-500 rounded-l-[2rem]"></div>
            <h2 className="text-xl font-black flex items-center gap-3 mb-6 text-slate-800">
              <div className="p-2 bg-orange-50 rounded-xl"><ImageIcon className="text-orange-500" size={20} /></div>
              Foto de Portada
            </h2>
            
            <div className="flex flex-col sm:flex-row gap-8 items-start">
              <div className="w-full sm:w-56 h-36 rounded-2xl bg-slate-50 border-2 border-dashed border-slate-200 flex items-center justify-center overflow-hidden shrink-0 group-hover:border-orange-300 transition-colors">
                {formData.foto_fachada_url ? (
                  <img src={formData.foto_fachada_url} alt="Portada" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                ) : (
                  <Store className="text-slate-300 group-hover:text-orange-200 transition-colors" size={40} />
                )}
              </div>
              
              <div className="flex-1 w-full space-y-3">
                <label className="text-sm font-semibold text-slate-700">Sube una foto desde tu dispositivo</label>
                
                <div className="flex flex-wrap items-center gap-4">
                  <label className={`px-5 py-2.5 bg-slate-900 hover:bg-orange-500 text-white text-sm font-bold rounded-xl cursor-pointer transition-all flex items-center gap-2 shadow-lg shadow-slate-200 hover:shadow-orange-200 ${uploadingImage ? 'opacity-50 pointer-events-none' : ''}`}>
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
                  Esta es la foto que los clientes verán en tu perfil. Usa una foto atractiva de tu fachada o tu mejor platillo.
                </p>
              </div>
            </div>
          </div>

          {/* HORARIOS */}
          <div className="bg-white p-6 md:p-8 rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
            <h2 className="text-xl font-black flex items-center gap-3 mb-6 text-slate-800">
              <div className="p-2 bg-blue-50 rounded-xl"><Clock className="text-blue-500" size={20} /></div>
              Horarios de Atención
            </h2>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
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
          <div className="bg-white p-6 md:p-8 rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-black text-slate-800">Categorías</h2>
              <span className="text-xs font-black px-3 py-1 bg-slate-100 text-slate-500 rounded-full">
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
                    className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all border ${
                      isSelected 
                        ? 'bg-orange-500 text-white border-orange-500 shadow-lg shadow-orange-500/20 scale-105' 
                        : 'bg-white text-slate-500 border-slate-200 hover:border-orange-300 hover:text-slate-800'
                    }`}
                  >
                    {cat}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="pt-6 pb-12">
            <button 
              type="submit" 
              disabled={saving}
              className={`w-full px-8 py-4 rounded-2xl font-black text-white text-lg transition-all flex items-center justify-center gap-3 active:scale-[0.98] ${
                success ? 'bg-emerald-500 shadow-xl shadow-emerald-500/30' : 'bg-slate-900 hover:bg-orange-500 shadow-xl shadow-slate-900/20 hover:shadow-orange-500/30'
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
        
        {/* SEGURIDAD - Cambiar Contraseña */}
        <div className="mt-8 bg-white p-6 md:p-8 rounded-[2rem] border border-slate-100 shadow-sm">
          <h2 className="text-xl font-black flex items-center gap-3 mb-6 text-slate-800">
            <div className="p-2 bg-red-50 rounded-xl"><Lock className="text-red-500" size={20} /></div>
            Seguridad
          </h2>
          <form onSubmit={handlePasswordChange} className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="password"
                placeholder="Nueva Contraseña (min. 6 caracteres)"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                required
                className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:border-[#FF7A6A] focus:ring-4 focus:ring-[#FF7A6A]/10 outline-none transition-all font-medium text-slate-800 tracking-widest"
              />
            </div>
            <button 
              type="submit" 
              disabled={changingPassword}
              className={`px-8 py-3.5 rounded-2xl font-bold text-white transition-all active:scale-[0.98] flex items-center justify-center gap-2 ${
                passwordMsg.type === 'success' ? 'bg-emerald-500 shadow-lg shadow-emerald-500/30' : 'bg-slate-900 hover:bg-slate-800 shadow-lg shadow-slate-900/20'
              }`}
            >
              {changingPassword ? <Loader2 className="animate-spin" size={18} /> : 'Actualizar'}
            </button>
          </form>
          {passwordMsg.text && (
            <div className={`mt-4 p-3 rounded-xl flex items-center gap-2 text-sm font-semibold ${
              passwordMsg.type === 'error' ? 'bg-[#FFF0EE] text-red-500 border border-red-100' : 'bg-emerald-50 text-emerald-600 border border-emerald-100'
            }`}>
              <AlertCircle size={18} className="shrink-0" />
              {passwordMsg.text}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
