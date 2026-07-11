import { useState, useEffect } from 'react'
import { supabase, subirFoto } from '../../lib/supabase'
import type { Restaurante, HorariosRestaurante, HorarioDia } from '../../lib/supabase'
import { Save, Store, Clock, Image as ImageIcon, Loader2, Lock, AlertCircle, CheckCircle2, Eye, EyeOff } from 'lucide-react'

const CATEGORIAS_COMUNES = [
  'Hamburguesas', 'Pizzas', 'Sushi', 'Tacos', 'Alitas', 'Pollo',
  'Mariscos', 'Postres', 'Desayunos', 'Bebidas', 'Saludable',
  'Comida China', 'Antojitos'
]

const DIAS_SEMANA: { key: keyof HorariosRestaurante; label: string }[] = [
  { key: 'lunes',     label: 'Lunes' },
  { key: 'martes',    label: 'Martes' },
  { key: 'miercoles', label: 'Miércoles' },
  { key: 'jueves',    label: 'Jueves' },
  { key: 'viernes',   label: 'Viernes' },
  { key: 'sabado',    label: 'Sábado' },
  { key: 'domingo',   label: 'Domingo' },
]

const DEFAULT_DIA: HorarioDia = { abre: '09:00', cierra: '22:00', activo: false }

function initHorarios(existing?: HorariosRestaurante): HorariosRestaurante {
  const result: HorariosRestaurante = {}
  for (const { key } of DIAS_SEMANA) {
    result[key] = existing?.[key]
      ? { ...DEFAULT_DIA, ...existing[key] }
      : { ...DEFAULT_DIA }
  }
  return result
}

function calcularPasosFaltantes(restaurante: Restaurante): string[] {
  const pasos: string[] = []
  if (!restaurante.foto_fachada_url) pasos.push('Foto de portada')
  if (!restaurante.categorias || restaurante.categorias.length === 0) pasos.push('Al menos 1 categoría')
  const h = restaurante.horarios
  const tieneHorario = h && DIAS_SEMANA.some(d => h[d.key]?.activo)
  if (!tieneHorario) pasos.push('Horario de al menos 1 día')
  return pasos
}

export function PerfilView({ restaurante, onUpdate }: { restaurante: Restaurante; onUpdate?: () => void }) {
  const [formData, setFormData] = useState({
    nombre: restaurante.nombre || '',
    telefono: restaurante.telefono || '',
    descripcion_corta: restaurante.descripcion_corta || '',
    foto_fachada_url: restaurante.foto_fachada_url || '',
    categorias: restaurante.categorias || [] as string[],
    acepta_pago_online: restaurante.acepta_pago_online || false,
  })
  const [horarios, setHorarios] = useState<HorariosRestaurante>(() => initHorarios(restaurante.horarios))

  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [changingPassword, setChangingPassword] = useState(false)
  const [passwordMsg, setPasswordMsg] = useState({ type: '', text: '' })
  const [showPassword, setShowPassword] = useState(false)
  const [loadingStripe, setLoadingStripe] = useState(false)
  const [errorGuardar, setErrorGuardar] = useState<string | null>(null)

  const handleMPConnect = async () => {
    try {
      setLoadingStripe(true)
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/mercadopago-onboarding`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ restaurante_id: restaurante.id })
      })
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      } else {
        alert(data.error || 'Error al conectar con Mercado Pago')
      }
    } catch (error) {
      console.error(error)
      alert('Error inesperado')
    } finally {
      setLoadingStripe(false)
    }
  }

  // Recalcular si el prop cambia (ej. onUpdate)
  useEffect(() => {
    setFormData({
      nombre: restaurante.nombre || '',
      telefono: restaurante.telefono || '',
      descripcion_corta: restaurante.descripcion_corta || '',
      foto_fachada_url: restaurante.foto_fachada_url || '',
      categorias: restaurante.categorias || [],
      acepta_pago_online: Boolean(restaurante.acepta_pago_online),
    })
    setHorarios(initHorarios(restaurante.horarios))
  }, [restaurante])

  const pasosFaltantes = calcularPasosFaltantes({
    ...restaurante,
    ...formData,
    horarios,
  })
  const perfilCompleto = pasosFaltantes.length === 0

  const toggleCategoria = (cat: string) => {
    setFormData(prev => {
      const current = prev.categorias || []
      if (current.includes(cat)) return { ...prev, categorias: current.filter(c => c !== cat) }
      if (current.length >= 3) return prev
      return { ...prev, categorias: [...current, cat] }
    })
  }

  const updateHorario = (dia: keyof HorariosRestaurante, field: keyof HorarioDia, value: string | boolean) => {
    setHorarios(prev => ({
      ...prev,
      [dia]: { ...prev[dia]!, [field]: value }
    }))
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      const file = e.target.files?.[0]
      if (!file) return
      setUploadingImage(true)
      const fileExt = file.name.split('.').pop()
      const filePath = `fachadas/${restaurante.id}-${Date.now()}.${fileExt}`
      const url = await subirFoto(file, filePath)
      if (url) setFormData(prev => ({ ...prev, foto_fachada_url: url }))
      else alert('Error al subir la imagen. Intenta de nuevo.')
    } catch {
      alert('Error al subir la imagen.')
    } finally {
      setUploadingImage(false)
    }
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setSuccess(false)
    setErrorGuardar(null)

    // Validar que los horarios de cierre sean mayores a los de apertura
    for (const { key, label } of DIAS_SEMANA) {
      const dia = horarios[key]
      if (dia?.activo && dia.abre && dia.cierra && dia.abre >= dia.cierra) {
        setErrorGuardar(`Error en el día ${label}: La hora de cierre debe ser posterior a la de apertura.`)
        setSaving(false)
        return
      }
    }

    const { error } = await supabase
      .from('restaurantes')
      .update({
        nombre: formData.nombre,
        telefono: formData.telefono,
        descripcion_corta: formData.descripcion_corta,
        foto_fachada_url: formData.foto_fachada_url,
        categorias: formData.categorias,
        acepta_pago_online: formData.acepta_pago_online,
        horarios: horarios,
        // Mantener legados compatibles con PublicMenuView
        hora_apertura: horarios.lunes?.activo ? horarios.lunes.abre : (horarios.viernes?.activo ? horarios.viernes.abre : null),
        hora_cierre:   horarios.lunes?.activo ? horarios.lunes.cierra : (horarios.viernes?.activo ? horarios.viernes.cierra : null),
      })
      .eq('id', restaurante.id)

    setSaving(false)
    if (!error) {
      setSuccess(true)
      if (onUpdate) onUpdate()
      setTimeout(() => setSuccess(false), 3500)
    } else {
      console.error(error)
      setErrorGuardar('Hubo un error al guardar los cambios: ' + error.message)
    }
  }

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault()
    if (newPassword.length < 6) {
      setPasswordMsg({ type: 'error', text: 'La contraseña debe tener al menos 6 caracteres' })
      return
    }
    setChangingPassword(true)
    setPasswordMsg({ type: '', text: '' })
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    if (error) setPasswordMsg({ type: 'error', text: error.message })
    else { setPasswordMsg({ type: 'success', text: '¡Contraseña actualizada exitosamente!' }); setNewPassword('') }
    setChangingPassword(false)
  }

  return (
    <div className="pb-24">
      <div className="mb-8">
        <h1 className="text-3xl font-black text-slate-800 mb-2">Mi Perfil</h1>
        <p className="text-slate-500">Configura la información pública de tu restaurante.</p>
      </div>

      {/* ── Banner de estado de visibilidad ── */}
      <div className={`mb-8 p-5 rounded-[2rem] border flex items-start gap-4 ${perfilCompleto ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200'}`}>
        <div className={`p-2.5 rounded-xl shrink-0 ${perfilCompleto ? 'bg-emerald-100' : 'bg-amber-100'}`}>
          {perfilCompleto
            ? <CheckCircle2 className="text-emerald-600" size={22} />
            : <AlertCircle className="text-amber-600" size={22} />
          }
        </div>
        <div className="flex-1">
          <p className={`font-black text-base ${perfilCompleto ? 'text-emerald-800' : 'text-amber-800'}`}>
            {perfilCompleto ? '¡Tu negocio es visible públicamente!' : 'Tu negocio está oculto del público'}
          </p>
          {perfilCompleto
            ? <p className="text-emerald-700 text-sm mt-1">Los clientes pueden encontrarte en la web. ¡Perfecto!</p>
            : (
              <div className="mt-2">
                <p className="text-amber-700 text-sm mb-2">Completa estos pasos para aparecer en el listado:</p>
                <ul className="space-y-1">
                  {pasosFaltantes.map(paso => (
                    <li key={paso} className="text-amber-700 text-sm font-semibold flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                      {paso}
                    </li>
                  ))}
                </ul>
              </div>
            )
          }
        </div>
      </div>

      <div className="max-w-3xl">
        <form onSubmit={handleSave} className="space-y-8">

          {/* PAGOS (MERCADO PAGO) */}
          <div className="bg-white p-6 md:p-8 rounded-[2rem] border border-[#009EE3]/20 shadow-sm">
            <h2 className="text-lg font-black flex items-center gap-2 mb-2">
              <span className="text-[#009EE3]">🤝</span>
              Pagos con Mercado Pago
            </h2>
            <p className="text-sm text-slate-500 mb-6">Vincula tu cuenta de Mercado Pago para recibir el dinero de tus ventas directamente y al instante.</p>
            <div className="flex flex-col sm:flex-row items-center justify-between bg-slate-50 p-5 rounded-2xl border border-slate-200">
              <div>
                <p className="font-bold text-slate-800">
                  {restaurante.mp_access_token ? 'Cuenta Vinculada' : 'Cuenta No Vinculada'}
                </p>
                <p className="text-xs text-slate-500 mt-1 mb-3">
                  {restaurante.mp_access_token ? 'Ya puedes recibir pagos con tarjeta y SPEI directamente.' : 'Los clientes solo podrán pagar en efectivo o al cajero general por ahora.'}
                </p>
                
                {restaurante.mp_access_token && (
                  <label className="flex items-center gap-3 bg-white p-3 rounded-xl border border-slate-200 cursor-pointer hover:border-blue-400 transition-colors w-max">
                    <div className="relative inline-block w-10 h-6">
                      <input 
                        type="checkbox" 
                        className="peer opacity-0 w-0 h-0" 
                        checked={formData.acepta_pago_online}
                        onChange={(e) => setFormData({...formData, acepta_pago_online: e.target.checked})}
                      />
                      <span className="absolute cursor-pointer top-0 left-0 right-0 bottom-0 bg-slate-300 rounded-full duration-300 peer-checked:bg-[#009EE3] before:absolute before:content-[''] before:h-4 before:w-4 before:left-1 before:bottom-1 before:bg-white before:rounded-full before:duration-300 peer-checked:before:translate-x-4"></span>
                    </div>
                    <span className="text-sm font-bold text-slate-700">Aceptar Pagos en Línea</span>
                  </label>
                )}
              </div>
              <button
                type="button"
                onClick={handleMPConnect}
                disabled={loadingStripe}
                className={`mt-4 sm:mt-0 px-6 py-2.5 rounded-xl font-bold text-sm text-white transition-all flex items-center justify-center gap-2 ${loadingStripe ? 'bg-slate-400' : 'bg-[#009EE3] hover:bg-[#0089C5]'}`}
              >
                {loadingStripe && <Loader2 className="animate-spin" size={16} />}
                {restaurante.mp_access_token ? 'Volver a Vincular' : 'Vincular Mercado Pago'}
              </button>
            </div>
          </div>
          <div className="bg-white p-6 md:p-8 rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
            <h2 className="text-lg font-black flex items-center gap-2 mb-6">
              <Store className="text-orange-500" size={20} />
              Información Básica
            </h2>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-semibold text-slate-700 block mb-1">Nombre del Restaurante</label>
                <input
                  type="text" required
                  value={formData.nombre}
                  onChange={e => setFormData({ ...formData, nombre: e.target.value })}
                  className="w-full p-3 border border-slate-200 rounded-xl focus:border-orange-400 outline-none transition-colors"
                  placeholder="Ej. Tacos El Paisa"
                />
              </div>
              <div>
                <label className="text-sm font-semibold text-slate-700 block mb-1">Teléfono (WhatsApp para recibir pedidos)</label>
                <input
                  type="tel" required
                  value={formData.telefono}
                  onChange={e => setFormData({ ...formData, telefono: e.target.value })}
                  className="w-full p-3 border border-slate-200 rounded-xl focus:border-orange-400 outline-none transition-colors"
                  placeholder="Ej. 9631234567"
                />
                <p className="text-xs text-slate-500 mt-1">Este número recibirá los pedidos por WhatsApp.</p>
              </div>
              <div>
                <label className="text-sm font-semibold text-slate-700 block mb-1">Descripción Corta <span className="text-slate-400 font-normal">(opcional)</span></label>
                <input
                  type="text"
                  maxLength={80}
                  value={formData.descripcion_corta}
                  onChange={e => setFormData({ ...formData, descripcion_corta: e.target.value })}
                  className="w-full p-3 border border-slate-200 rounded-xl focus:border-orange-400 outline-none transition-colors"
                  placeholder="Ej. Los mejores tacos de la ciudad desde 2010"
                />
                <p className="text-xs text-slate-400 mt-1">{formData.descripcion_corta.length}/80 caracteres</p>
              </div>
            </div>
          </div>

          {/* FOTO DE PORTADA */}
          <div className="bg-white p-6 md:p-8 rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
            <h2 className="text-lg font-black flex items-center gap-2 mb-6">
              <ImageIcon className="text-orange-500" size={20} />
              Foto de Portada <span className="text-red-500 text-sm font-black ml-1">*requerida</span>
            </h2>
            <div className="flex flex-col sm:flex-row gap-6 items-start">
              <div className="w-full sm:w-52 h-36 rounded-2xl bg-slate-50 border-2 border-dashed border-slate-200 flex items-center justify-center overflow-hidden shrink-0">
                {formData.foto_fachada_url
                  ? <img src={formData.foto_fachada_url} alt="Portada" className="w-full h-full object-cover" />
                  : <Store className="text-slate-300" size={40} />
                }
              </div>
              <div className="flex-1 space-y-3">
                <label className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm cursor-pointer transition-all ${uploadingImage ? 'bg-slate-200 text-slate-400 pointer-events-none' : 'bg-slate-900 hover:bg-orange-500 text-white shadow-lg'}`}>
                  {uploadingImage ? <Loader2 className="animate-spin" size={16} /> : <ImageIcon size={16} />}
                  {uploadingImage ? 'Subiendo...' : 'Seleccionar Foto'}
                  <input type="file" accept="image/jpeg, image/png, image/webp" onChange={handleImageUpload} disabled={uploadingImage} className="hidden" />
                </label>
                {formData.foto_fachada_url && (
                  <button type="button" onClick={() => setFormData({ ...formData, foto_fachada_url: '' })} className="block text-xs text-red-500 hover:underline font-semibold">
                    Quitar foto
                  </button>
                )}
                <p className="text-xs text-slate-500">Usa una foto atractiva de tu fachada o tu mejor platillo. Se comprime automáticamente.</p>
              </div>
            </div>
          </div>

          {/* HORARIOS POR DÍA */}
          <div className="bg-white p-6 md:p-8 rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
            <h2 className="text-lg font-black flex items-center gap-2 mb-2">
              <Clock className="text-blue-500" size={20} />
              Horarios de Atención <span className="text-red-500 text-sm font-black ml-1">*requeridos</span>
            </h2>
            <p className="text-sm text-slate-500 mb-6">Activa los días que atiendes y configura el horario de cada uno.</p>

            <div className="space-y-3">
              {DIAS_SEMANA.map(({ key, label }) => {
                const dia = horarios[key] ?? { ...DEFAULT_DIA }
                return (
                  <div key={key} className={`flex flex-col sm:flex-row sm:items-center gap-3 p-4 rounded-2xl border transition-all ${dia.activo ? 'bg-blue-50 border-blue-200' : 'bg-slate-50 border-slate-100'}`}>
                    {/* Toggle día activo */}
                    <label className="flex items-center gap-3 min-w-[130px] cursor-pointer select-none">
                      <div
                        onClick={() => updateHorario(key, 'activo', !dia.activo)}
                        className={`relative w-11 h-6 rounded-full transition-all cursor-pointer ${dia.activo ? 'bg-blue-500' : 'bg-slate-300'}`}
                      >
                        <div className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${dia.activo ? 'translate-x-5' : ''}`} />
                      </div>
                      <span className={`text-sm font-bold ${dia.activo ? 'text-blue-800' : 'text-slate-400'}`}>{label}</span>
                    </label>

                    {/* Inputs de hora (solo si está activo) */}
                    {dia.activo ? (
                      <div className="flex items-center gap-3 flex-wrap">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-slate-500">Abre</span>
                          <input
                            type="time" required
                            value={dia.abre}
                            onChange={e => updateHorario(key, 'abre', e.target.value)}
                            className="p-2 border border-blue-200 rounded-lg text-sm focus:border-blue-400 outline-none bg-white font-semibold text-slate-700"
                          />
                        </div>
                        <span className="text-slate-400 font-bold">–</span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-slate-500">Cierra</span>
                          <input
                            type="time" required
                            value={dia.cierra}
                            onChange={e => updateHorario(key, 'cierra', e.target.value)}
                            className="p-2 border border-blue-200 rounded-lg text-sm focus:border-blue-400 outline-none bg-white font-semibold text-slate-700"
                          />
                        </div>
                      </div>
                    ) : (
                      <span className="text-xs text-slate-400 font-semibold">Cerrado este día</span>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* CATEGORÍAS */}
          <div className="bg-white p-6 md:p-8 rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-black flex items-center gap-2">
                <span className="text-orange-500">🏷️</span>
                Categorías <span className="text-red-500 text-sm font-black ml-1">*requeridas</span>
              </h2>
              <span className="text-xs font-black px-3 py-1 bg-slate-100 text-slate-500 rounded-full">
                {formData.categorias?.length || 0} / 3
              </span>
            </div>
            <p className="text-sm text-slate-500 mb-4">Selecciona hasta 3 categorías que mejor describan tu menú.</p>
            <div className="flex flex-wrap gap-2">
              {CATEGORIAS_COMUNES.map(cat => {
                const isSelected = formData.categorias?.includes(cat)
                return (
                  <button
                    key={cat} type="button"
                    onClick={() => toggleCategoria(cat)}
                    className={`px-4 py-2 rounded-xl text-sm font-bold transition-all border ${isSelected
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

          {/* BOTÓN GUARDAR */}
          <div className="pt-2 pb-4">
            <button
              type="submit"
              disabled={saving}
              className={`w-full px-8 py-4 rounded-2xl font-black text-white text-lg transition-all flex items-center justify-center gap-3 active:scale-[0.98] ${success ? 'bg-emerald-500 shadow-xl shadow-emerald-500/30' : 'bg-slate-900 hover:bg-orange-500 shadow-xl shadow-slate-900/20 hover:shadow-orange-500/30'}`}
            >
              {saving
                ? <><Loader2 className="animate-spin" size={20} /> Guardando...</>
                : success
                  ? <><CheckCircle2 size={20} /> ¡Guardado Exitosamente!</>
                  : <><Save size={20} /> Guardar Cambios</>
              }
            </button>
            {!perfilCompleto && (
              <p className="text-center text-sm text-amber-600 font-semibold mt-3">
                ⚠️ Completa los campos marcados para aparecer en el listado público.
              </p>
            )}
            {errorGuardar && (
              <div className="mt-4 p-4 rounded-xl bg-red-50 text-red-600 border border-red-100 flex items-center gap-2 text-sm font-bold">
                <AlertCircle size={18} />
                {errorGuardar}
              </div>
            )}
          </div>
        </form>

        {/* SEGURIDAD */}
        <div className="mt-8 bg-white p-6 md:p-8 rounded-[2rem] border border-slate-100 shadow-sm">
          <h2 className="text-lg font-black flex items-center gap-3 mb-6 text-slate-800">
            <div className="p-2 bg-red-50 rounded-xl"><Lock className="text-red-500" size={20} /></div>
            Seguridad
          </h2>
          <form onSubmit={handlePasswordChange} className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Nueva contraseña (mín. 6 caracteres)"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                required
                className="w-full pl-11 pr-11 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:border-red-300 focus:ring-4 focus:ring-red-500/10 outline-none transition-all font-medium text-slate-800"
              />
              <button type="button" onClick={() => setShowPassword(v => !v)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            <button
              type="submit"
              disabled={changingPassword}
              className={`px-8 py-3.5 rounded-2xl font-bold text-white transition-all flex items-center justify-center gap-2 ${passwordMsg.type === 'success' ? 'bg-emerald-500' : 'bg-slate-900 hover:bg-slate-800'}`}
            >
              {changingPassword ? <Loader2 className="animate-spin" size={18} /> : 'Actualizar'}
            </button>
          </form>
          {passwordMsg.text && (
            <div className={`mt-4 p-3 rounded-xl flex items-center gap-2 text-sm font-semibold ${passwordMsg.type === 'error' ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-emerald-50 text-emerald-600 border border-emerald-100'}`}>
              <AlertCircle size={16} className="shrink-0" />
              {passwordMsg.text}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
