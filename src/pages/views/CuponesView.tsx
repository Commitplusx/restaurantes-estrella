import { useState, useEffect, useRef } from 'react'
import { Plus, Trash2, Ticket, ToggleLeft, ToggleRight, Calendar, Loader2, Copy, Check } from 'lucide-react'
import { BottomSheet } from '../../components/BottomSheet'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { supabase } from '../../lib/supabase'
import type { Restaurante } from '../../lib/supabase'

interface CuponRestaurante {
  id: string
  restaurante_id: string
  codigo: string
  tipo: 'porcentaje' | 'monto_fijo'
  valor: number
  uso_maximo: number | null
  usos_actuales: number
  activo: boolean
  fecha_fin: string | null
  created_at: string
}

const defaultForm = {
  codigo: '',
  tipo: 'porcentaje' as 'porcentaje' | 'monto_fijo',
  valor: '',
  uso_maximo: '',
  fecha_fin: '',
}

export function CuponesView({ restaurante }: { restaurante: Restaurante }) {
  const [cupones, setCupones] = useState<CuponRestaurante[]>([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [form, setForm] = useState(defaultForm)
  const [saving, setSaving] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [toastMsg, setToastMsg] = useState<{ text: string; ok: boolean } | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  
  const toastTimeout = useRef<number | null>(null)
  const copyTimeout = useRef<number | null>(null)

  useEffect(() => {
    return () => {
      if (toastTimeout.current) clearTimeout(toastTimeout.current)
      if (copyTimeout.current) clearTimeout(copyTimeout.current)
    }
  }, [])

  useEffect(() => {
    loadCupones()
  }, [restaurante.id])

  useEffect(() => {
    const channel = supabase
      .channel(`admin:cupones:${restaurante.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'cupones_restaurante', filter: `restaurante_id=eq.${restaurante.id}` }, () => {
        loadCupones()
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [restaurante.id])

  const showToast = (text: string, ok = true) => {
    setToastMsg({ text, ok })
    if (toastTimeout.current) clearTimeout(toastTimeout.current)
    toastTimeout.current = window.setTimeout(() => setToastMsg(null), 3500)
  }

  async function loadCupones() {
    setLoading(true)
    const { data } = await supabase
      .from('cupones_restaurante')
      .select('*')
      .eq('restaurante_id', restaurante.id)
      .order('created_at', { ascending: false })
    setCupones(data || [])
    setLoading(false)
  }

  const handleOpenModal = () => {
    setForm(defaultForm)
    setIsModalOpen(true)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    const numValor = parseFloat(form.valor)
    if (!form.codigo.trim() || !form.valor || isNaN(numValor) || numValor <= 0) return
    setSaving(true)

    const payload = {
      restaurante_id: restaurante.id,
      codigo: form.codigo.trim().toUpperCase(),
      tipo: form.tipo,
      valor: parseFloat(form.valor),
      // 0 o vacío = ilimitado (null). Solo guardar número si es > 0
      uso_maximo: form.uso_maximo && parseInt(form.uso_maximo) > 0 ? parseInt(form.uso_maximo) : null,
      fecha_fin: form.fecha_fin || null,
      activo: true,
      usos_actuales: 0,
    }

    const { error } = await supabase.from('cupones_restaurante').insert(payload)
    setSaving(false)

    if (error) {
      showToast(error.message.includes('unique') ? 'Ese código ya existe' : 'Error al crear el cupón', false)
    } else {
      showToast('¡Cupón creado exitosamente!')
      setIsModalOpen(false)
      loadCupones()
    }
  }

  const handleToggle = async (cupon: CuponRestaurante) => {
    // Optimistic UI update
    setCupones(prev => prev.map(c => c.id === cupon.id ? { ...c, activo: !c.activo } : c))
    
    const { error } = await supabase
      .from('cupones_restaurante')
      .update({ activo: !cupon.activo })
      .eq('id', cupon.id)
      
    if (error) {
      // Rollback on error
      setCupones(prev => prev.map(c => c.id === cupon.id ? { ...c, activo: cupon.activo } : c))
      showToast('Error al cambiar estado del cupón', false)
    }
  }

  const handleDelete = async () => {
    if (!deleteId) return
    const idToDelete = deleteId
    setDeleteId(null) // hide modal early
    
    const { error } = await supabase.from('cupones_restaurante').delete().eq('id', idToDelete)
    if (error) {
      showToast('Error al eliminar cupón', false)
    } else {
      showToast('Cupón eliminado')
      loadCupones()
    }
  }

  const handleCopy = (codigo: string, id: string) => {
    navigator.clipboard.writeText(codigo)
    setCopiedId(id)
    if (copyTimeout.current) clearTimeout(copyTimeout.current)
    copyTimeout.current = window.setTimeout(() => setCopiedId(null), 2000)
  }

  const isExpired = (fecha_fin: string | null) => {
    if (!fecha_fin) return false
    // Agrega T23:59:59-06:00 para que expire al final del día en hora México
    const endOfDay = new Date(`${fecha_fin}T23:59:59-06:00`)
    return endOfDay < new Date()
  }

  return (
    <div className="pb-10">
      {/* Toast */}
      {toastMsg && (
        <div className={`fixed top-6 left-1/2 -translate-x-1/2 z-[2000] px-5 py-3 rounded-2xl shadow-xl text-sm font-bold flex items-center gap-2 transition-all ${toastMsg.ok ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'}`}>
          {toastMsg.text}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-black text-slate-800 flex items-center gap-2">
            <span className="w-10 h-10 rounded-2xl bg-[#FFF0EE] flex items-center justify-center">
              <Ticket size={20} className="text-[#FF7A6A]" />
            </span>
            Cupones de Descuento
          </h2>
          <p className="text-sm text-slate-400 mt-1 ml-12">Crea y gestiona códigos de descuento para tus clientes</p>
        </div>
        <button
          onClick={handleOpenModal}
          className="flex items-center gap-2 px-5 py-3 bg-[#FF7A6A] hover:bg-[#FF6B5B] text-white font-bold rounded-[16px] shadow-lg shadow-[#FF7A6A]/30 transition-all hover:scale-[1.02] active:scale-[0.98] text-sm"
        >
          <Plus size={18} />
          Crear Cupón
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center h-48">
          <Loader2 className="animate-spin text-[#FF7A6A] w-10 h-10" />
        </div>
      ) : cupones.length === 0 ? (
        <div className="bg-gradient-to-br from-[#FFF8F7] to-[#FFF0EE] border border-[#FFD4CE] rounded-[24px] p-12 text-center">
          <div className="w-16 h-16 rounded-3xl bg-white border border-[#FFD4CE] flex items-center justify-center mx-auto mb-4 shadow-sm">
            <Ticket size={28} className="text-[#FF7A6A]" />
          </div>
          <h3 className="text-lg font-black text-slate-700 mb-1">Sin cupones todavía</h3>
          <p className="text-slate-400 text-sm mb-5">Crea tu primer cupón y compártelo con tus clientes.</p>
          <button
            onClick={handleOpenModal}
            className="px-6 py-3 bg-[#FF7A6A] hover:bg-[#FF6B5B] text-white font-bold rounded-[14px] shadow-lg shadow-[#FF7A6A]/25 transition-all text-sm"
          >
            + Crear primer cupón
          </button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {cupones.map(cupon => {
            const expired = isExpired(cupon.fecha_fin)
            const agotado = cupon.uso_maximo !== null && cupon.usos_actuales >= cupon.uso_maximo
            const statusLabel = !cupon.activo ? 'Inactivo' : expired ? 'Expirado' : agotado ? 'Agotado' : 'Activo'
            const statusColor = !cupon.activo ? 'bg-slate-100 text-slate-500' : expired || agotado ? 'bg-red-100 text-red-600' : 'bg-emerald-100 text-emerald-600'

            return (
              <div
                key={cupon.id}
                className={`bg-white border rounded-[24px] p-5 shadow-sm hover:shadow-md transition-all relative overflow-hidden ${
                  !cupon.activo || expired || agotado ? 'border-slate-100 opacity-75' : 'border-slate-100 hover:border-[#FFD4CE]'
                }`}
              >
                {/* Decorative pattern */}
                <div className="absolute -right-4 -top-4 w-24 h-24 rounded-full bg-[#FFF0EE] opacity-60" />
                <div className="absolute -right-1 -bottom-3 w-14 h-14 rounded-full bg-[#FFF8F7] opacity-80" />

                <div className="relative z-10">
                  {/* Top row: code + status */}
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleCopy(cupon.codigo, cupon.id)}
                        title="Copiar código"
                        className="flex items-center gap-2 px-3 py-1.5 bg-slate-900 text-white rounded-[10px] font-mono font-black text-sm hover:bg-slate-700 transition-colors group"
                      >
                        {cupon.codigo}
                        {copiedId === cupon.id
                          ? <Check size={13} className="text-emerald-400" />
                          : <Copy size={13} className="opacity-50 group-hover:opacity-100 transition-opacity" />
                        }
                      </button>
                    </div>
                    <span className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full ${statusColor}`}>
                      {statusLabel}
                    </span>
                  </div>

                  {/* Discount value */}
                  <div className="mb-3">
                    <span className="text-3xl font-black text-slate-800">
                      {cupon.tipo === 'porcentaje' ? `${cupon.valor}%` : `$${cupon.valor.toFixed(2)}`}
                    </span>
                    <span className="text-sm text-slate-400 ml-1.5 font-medium">
                      {cupon.tipo === 'porcentaje' ? 'de descuento' : 'de descuento fijo'}
                    </span>
                  </div>

                  {/* Meta info */}
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-400 font-medium mb-4">
                    <span>
                      Usos: <span className="font-bold text-slate-600">{cupon.usos_actuales}</span>
                      {cupon.uso_maximo !== null && (
                        <> / <span className="font-bold text-slate-600">{cupon.uso_maximo}</span></>
                      )}
                      {cupon.uso_maximo === null && <span className="ml-1">(ilimitados)</span>}
                    </span>
                    {cupon.fecha_fin && (
                      <span className="flex items-center gap-1">
                        <Calendar size={11} />
                        Vence: <span className={`font-bold ml-0.5 ${expired ? 'text-red-500' : 'text-slate-600'}`}>
                          {new Date(`${cupon.fecha_fin}T12:00:00`).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </span>
                      </span>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-between border-t border-slate-50 pt-3">
                    <button
                      onClick={() => handleToggle(cupon)}
                      className={`flex items-center gap-1.5 text-xs font-bold transition-colors ${cupon.activo ? 'text-emerald-600 hover:text-emerald-700' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                      {cupon.activo
                        ? <ToggleRight size={20} className="text-emerald-500" />
                        : <ToggleLeft size={20} />
                      }
                      {cupon.activo ? 'Activo' : 'Inactivo'}
                    </button>
                    <button
                      onClick={() => setDeleteId(cupon.id)}
                      className="p-2 rounded-xl text-slate-300 hover:text-red-500 hover:bg-red-50 transition-all"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Create BottomSheet */}
      <BottomSheet isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Crear Cupón de Descuento">
        <form onSubmit={handleSave} className="flex flex-col gap-5">
          {/* Código */}
          <div>
            <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">
              Código del cupón
            </label>
            <input
              type="text"
              required
              placeholder="Ej: JUEVESLOCO"
              value={form.codigo}
              onChange={e => setForm(f => ({ ...f, codigo: e.target.value.toUpperCase().replace(/\s/g, '') }))}
              className="w-full border border-slate-200 rounded-[14px] px-4 py-3 text-sm font-mono font-black uppercase outline-none focus:border-[#FF7A6A] focus:ring-2 focus:ring-[#FF7A6A]/20 transition-all bg-slate-50 tracking-wider"
              maxLength={20}
            />
            <p className="text-[11px] text-slate-400 mt-1">Solo letras y números, sin espacios.</p>
          </div>

          {/* Tipo */}
          <div>
            <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">
              Tipo de descuento
            </label>
            <div className="grid grid-cols-2 gap-3">
              {([['porcentaje', '% Descuento', '%'], ['monto_fijo', '$ Monto Fijo', '$']] as const).map(([val, label, icon]) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setForm(f => ({ ...f, tipo: val }))}
                  className={`flex items-center justify-center gap-2 py-3.5 rounded-[14px] border-2 text-sm font-bold transition-all ${
                    form.tipo === val
                      ? 'border-[#FF7A6A] bg-[#FFF0EE] text-[#FF7A6A]'
                      : 'border-slate-200 text-slate-500 hover:border-slate-300'
                  }`}
                >
                  <span className="text-lg font-black">{icon}</span>
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Valor */}
          <div>
            <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">
              Valor {form.tipo === 'porcentaje' ? '(%)' : '($)'}
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">
                {form.tipo === 'porcentaje' ? '%' : '$'}
              </span>
              <input
                type="number"
                required
                min="0.01"
                step="0.01"
                max={form.tipo === 'porcentaje' ? 100 : undefined}
                placeholder={form.tipo === 'porcentaje' ? '10' : '50.00'}
                value={form.valor}
                onChange={e => setForm(f => ({ ...f, valor: e.target.value }))}
                className="w-full border border-slate-200 rounded-[14px] px-4 py-3 pl-9 text-sm font-bold outline-none focus:border-[#FF7A6A] focus:ring-2 focus:ring-[#FF7A6A]/20 transition-all bg-slate-50"
              />
            </div>
          </div>

          {/* Usos máximos */}
          <div>
            <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">
              Usos máximos <span className="text-slate-300 font-medium normal-case">(0 = ilimitado)</span>
            </label>
            <input
              type="number"
              min="0"
              step="1"
              placeholder="0"
              value={form.uso_maximo}
              onChange={e => setForm(f => ({ ...f, uso_maximo: e.target.value }))}
              className="w-full border border-slate-200 rounded-[14px] px-4 py-3 text-sm font-bold outline-none focus:border-[#FF7A6A] focus:ring-2 focus:ring-[#FF7A6A]/20 transition-all bg-slate-50"
            />
          </div>

          {/* Fecha de expiración */}
          <div>
            <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">
              Fecha de expiración <span className="text-slate-300 font-medium normal-case">(opcional)</span>
            </label>
            <input
              type="date"
              value={form.fecha_fin}
              min={new Date().toISOString().split('T')[0]}
              onChange={e => setForm(f => ({ ...f, fecha_fin: e.target.value }))}
              className="w-full border border-slate-200 rounded-[14px] px-4 py-3 text-sm font-bold outline-none focus:border-[#FF7A6A] focus:ring-2 focus:ring-[#FF7A6A]/20 transition-all bg-slate-50 text-slate-600"
            />
          </div>

          {/* Preview */}
          {form.codigo && form.valor && (
            <div className="bg-gradient-to-br from-[#FFF0EE] to-[#FFF8F7] border border-[#FFD4CE] rounded-[18px] p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-[12px] bg-[#FF7A6A] flex items-center justify-center shrink-0">
                <Ticket size={18} className="text-white" />
              </div>
              <div>
                <p className="text-xs text-slate-400 font-medium">Vista previa</p>
                <p className="font-black text-slate-800 text-sm">
                  <span className="font-mono bg-slate-900 text-white px-2 py-0.5 rounded-md text-xs mr-1">{form.codigo || '—'}</span>
                  → {form.tipo === 'porcentaje' ? `${form.valor}% off` : `$${parseFloat(form.valor || '0').toFixed(2)} off`}
                </p>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={saving || !form.codigo.trim() || !form.valor}
            className="w-full py-4 bg-[#FF7A6A] hover:bg-[#FF6B5B] disabled:opacity-50 text-white font-black rounded-[16px] transition-all shadow-lg shadow-[#FF7A6A]/30 flex items-center justify-center gap-2 text-sm"
          >
            {saving ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} />}
            {saving ? 'Creando...' : 'Crear Cupón'}
          </button>
        </form>
      </BottomSheet>

      {/* Confirm Delete */}
      <ConfirmDialog
        isOpen={!!deleteId}
        onCancel={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="¿Eliminar cupón?"
        message="Esta acción no se puede deshacer. Los cupones ya usados no se verán afectados."
        confirmText="Sí, eliminar"
      />
    </div>
  )
}
