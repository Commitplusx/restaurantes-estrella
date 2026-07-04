import { useState, useEffect, useRef } from 'react'
import { supabase } from '../../lib/supabase'
import type { Restaurante } from '../../lib/supabase'
import {
  Utensils, Package, Tag, Loader2, Power, Download,
  ShoppingBag, DollarSign, ChevronDown, Clock, RefreshCw
} from 'lucide-react'
import QRCode from 'qrcode'
import { motion, AnimatePresence } from 'framer-motion'
import { AnimatedCounter } from '../../components/AnimatedCounter'

// ── Types ────────────────────────────────────────────────────────────
interface PedidoRow {
  created_at: string
  total: number
  estado: string
}

interface SalesStats {
  weeklyData: number[]   // last 7 days, index 0 = oldest
  weeklyLabels: string[] // day labels
  monthTotal: number
  todayOrders: number
}

// ── Helpers ──────────────────────────────────────────────────────────
function startOf30DaysAgo(): string {
  const d = new Date()
  d.setDate(d.getDate() - 30)
  d.setHours(0, 0, 0, 0)
  return d.toISOString()
}

function startOfToday(): Date {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d
}

function startOfMonth(): Date {
  const d = new Date()
  d.setDate(1)
  d.setHours(0, 0, 0, 0)
  return d
}

function formatCountdown(ms: number): string {
  if (ms <= 0) return '0:00'
  const totalSec = Math.floor(ms / 1000)
  const h = Math.floor(totalSec / 3600)
  const m = Math.floor((totalSec % 3600) / 60)
  const s = totalSec % 60
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return `${m}:${String(s).padStart(2, '0')}`
}

const DAY_NAMES = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']

// ── Component ─────────────────────────────────────────────────────────
export function DashboardView({ restaurante }: { restaurante: Restaurante }) {
  const [stats, setStats] = useState({ platillos: 0, combos: 0, promos: 0 })
  const [loading, setLoading] = useState(true)
  const [isActive, setIsActive] = useState(restaurante.activo)
  const [toggling, setToggling] = useState(false)
  const [qrDataUrl, setQrDataUrl] = useState<string>('')

  // ── Panic button state ────────────────────────────────────────────
  const [showPauseMenu, setShowPauseMenu] = useState(false)
  const [pauseUntil, setPauseUntil] = useState<number | null>(null)   // epoch ms
  const [countdown, setCountdown] = useState<string>('')
  const pauseMenuRef = useRef<HTMLDivElement>(null)
  const pauseKey = `pausa_hasta_${restaurante.id}`

  // ── Sales stats state ─────────────────────────────────────────────
  const [salesStats, setSalesStats] = useState<SalesStats | null>(null)
  const [salesEmpty, setSalesEmpty] = useState(false)
  const [salesLoading, setSalesLoading] = useState(true)

  // ── Realtime alert state ──────────────────────────────────────────
  const [nuevoPedidoAlert, setNuevoPedidoAlert] = useState(false)

  // ── Close pause-menu on outside click ────────────────────────────
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (pauseMenuRef.current && !pauseMenuRef.current.contains(e.target as Node)) {
        setShowPauseMenu(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  // ── Init: check localStorage pause timestamp ──────────────────────
  useEffect(() => {
    const stored = localStorage.getItem(pauseKey)
    if (stored) {
      const ts = parseInt(stored, 10)
      if (ts > Date.now()) {
        setPauseUntil(ts)
      } else {
        // Expired → reactivate in Supabase
        localStorage.removeItem(pauseKey)
        if (!restaurante.activo) {
          supabase.from('restaurantes').update({ activo: true }).eq('id', restaurante.id).then(() => {
            setIsActive(true)
          })
        }
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Countdown ticker ─────────────────────────────────────────────
  useEffect(() => {
    let isMounted = true
    if (!pauseUntil) { setCountdown(''); return }

    const tick = () => {
      const remaining = pauseUntil - Date.now()
      if (remaining <= 0) {
        if (isMounted) setCountdown('')
        if (isMounted) setPauseUntil(null)
        localStorage.removeItem(pauseKey)
        // Reactivate
        supabase.from('restaurantes').update({ activo: true }).eq('id', restaurante.id).then(() => {
          if (isMounted) setIsActive(true)
        })
      } else {
        if (isMounted) setCountdown(formatCountdown(remaining))
      }
    }

    tick()
    const id = setInterval(tick, 1000)
    return () => {
      isMounted = false
      clearInterval(id)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pauseUntil])

  // ── Pause helpers ─────────────────────────────────────────────────
  const pauseFor = async (minutes: number | null) => {
    setShowPauseMenu(false)
    setToggling(true)
    const { error } = await supabase
      .from('restaurantes')
      .update({ activo: false })
      .eq('id', restaurante.id)

    if (!error) {
      setIsActive(false)
      if (minutes !== null) {
        const until = Date.now() + minutes * 60 * 1000
        localStorage.setItem(pauseKey, String(until))
        setPauseUntil(until)
      } else {
        localStorage.removeItem(pauseKey)
        setPauseUntil(null)
      }
    } else {
      console.error(error)
      alert('Error al cambiar estado operativo')
    }
    setToggling(false)
  }

  const reopenNow = async () => {
    setShowPauseMenu(false)
    setToggling(true)
    const { error } = await supabase
      .from('restaurantes')
      .update({ activo: true })
      .eq('id', restaurante.id)

    if (!error) {
      setIsActive(true)
      localStorage.removeItem(pauseKey)
      setPauseUntil(null)
    } else {
      console.error(error)
      alert('Error al reabrir')
    }
    setToggling(false)
  }

  // ── QR generation ────────────────────────────────────────────────
  useEffect(() => {
    async function generateQR() {
      try {
        const url = `https://estrella-eats.mx/menu/${restaurante.slug || restaurante.id}`
        const dataUrl = await QRCode.toDataURL(url, {
          width: 800,
          margin: 2,
          color: { dark: '#000000', light: '#ffffff' },
          errorCorrectionLevel: 'H',
        })
        setQrDataUrl(dataUrl)
      } catch (err) {
        console.error('Error generando QR:', err)
      }
    }
    generateQR()
  }, [restaurante.id])

  // ── Menu stats (platillos / combos / promos) ──────────────────────
  const loadStats = async () => {
    const [
      { count: platillos, error: e1 },
      { count: combos, error: e2 },
      { count: promos, error: e3 }
    ] = await Promise.all([
      supabase.from('menu_items').select('*', { count: 'exact', head: true }).eq('restaurante_id', restaurante.id),
      supabase.from('menu_combos').select('*', { count: 'exact', head: true }).eq('restaurante_id', restaurante.id),
      supabase.from('menu_promociones').select('*', { count: 'exact', head: true }).eq('restaurante_id', restaurante.id)
    ])

    if (e1 || e2 || e3) console.error('Error cargando stats:', e1 || e2 || e3)
    setStats({ platillos: platillos || 0, combos: combos || 0, promos: promos || 0 })
    setLoading(false)
  }

  useEffect(() => {
    loadStats()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restaurante.id])

  // ── Real sales stats ─────────────────────────────────────────────
  const loadSales = async () => {
    setSalesLoading(true)

    // Try with restaurante_id first
    let { data, error } = await supabase
      .from('pedidos')
      .select('created_at, total, estado')
      .eq('restaurante_id', restaurante.id)
      .gte('created_at', startOf30DaysAgo())

    // Fallback: if restaurante_id column doesn't exist (error code 42703) try tipo_pedido
    if (error && (error.code === '42703' || error.message?.includes('restaurante_id'))) {
      const res = await supabase
        .from('pedidos')
        .select('created_at, total, estado')
        .eq('tipo_pedido', 'restaurante_delivery')
        .gte('created_at', startOf30DaysAgo())
      data = res.data
      error = res.error
    }

    if (error || !data || data.length === 0) {
      setSalesEmpty(true)
      setSalesLoading(false)
      return
    }

    const rows = data as PedidoRow[]

    // Weekly data: last 7 days
    const today = startOfToday()
    const weeklyData: number[] = Array(7).fill(0)
    const weeklyLabels: string[] = []

    for (let i = 6; i >= 0; i--) {
      const d = new Date(today)
      d.setDate(d.getDate() - i)
      weeklyLabels.push(DAY_NAMES[d.getDay()])
    }

    for (const row of rows) {
      if (row.estado === 'cancelado' || row.estado === 'rechazado') continue
      const rowDate = new Date(row.created_at)
      rowDate.setHours(0, 0, 0, 0)
      const diffDays = Math.floor((today.getTime() - rowDate.getTime()) / 86400000)
      if (diffDays >= 0 && diffDays <= 6) {
        weeklyData[6 - diffDays] += Number(row.total) || 0
      }
    }

    // Month total
    const monthStart = startOfMonth()
    const monthTotal = rows
      .filter(r => new Date(r.created_at) >= monthStart && r.estado !== 'cancelado' && r.estado !== 'rechazado')
      .reduce((acc, r) => acc + (Number(r.total) || 0), 0)

    // Today orders
    const todayOrders = rows.filter(r => new Date(r.created_at) >= today && r.estado !== 'cancelado' && r.estado !== 'rechazado').length

    setSalesStats({ weeklyData, weeklyLabels, monthTotal, todayOrders })
    setSalesEmpty(false)
    setSalesLoading(false)
  }

  useEffect(() => {
    loadSales()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restaurante.id])

  // ── Realtime: pedidos (live sales stats + new-order alert) ────────
  useEffect(() => {
    let alertTimeout: number
    const channel = supabase
      .channel(`dashboard:pedidos:${restaurante.id}`)
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'pedidos', filter: `restaurante_id=eq.${restaurante.id}` },
        () => {
          setNuevoPedidoAlert(true)
          clearTimeout(alertTimeout)
          alertTimeout = window.setTimeout(() => setNuevoPedidoAlert(false), 4000)
          loadSales()
        }
      )
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'pedidos', filter: `restaurante_id=eq.${restaurante.id}` },
        () => { loadSales() }
      )
      .on('postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'pedidos', filter: `restaurante_id=eq.${restaurante.id}` },
        () => { loadSales() }
      )
      .subscribe()
    return () => {
      clearTimeout(alertTimeout)
      supabase.removeChannel(channel)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restaurante.id])

  // ── Realtime: menu items/combos/promos (tarjetas de conteo) ───────
  useEffect(() => {
    const channel = supabase
      .channel(`dashboard:menu:${restaurante.id}`)
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'menu_items', filter: `restaurante_id=eq.${restaurante.id}` },
        () => { loadStats() }
      )
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'menu_combos', filter: `restaurante_id=eq.${restaurante.id}` },
        () => { loadStats() }
      )
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'menu_promociones', filter: `restaurante_id=eq.${restaurante.id}` },
        () => { loadStats() }
      )
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restaurante.id])

  // ── Download QR ───────────────────────────────────────────────────
  const handleDownloadQR = () => {
    if (!qrDataUrl) { alert('El QR aún se está generando'); return }
    const link = document.createElement('a')
    link.href = qrDataUrl
    link.download = `QR_${restaurante.nombre.replace(/\s+/g, '_')}.png`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // ── Bar chart normalization ───────────────────────────────────────
  const barMax = salesStats ? Math.max(...salesStats.weeklyData, 1) : 1
  const normalizedBars = salesStats
    ? salesStats.weeklyData.map(v => Math.round((v / barMax) * 100))
    : []

  // ── Render ────────────────────────────────────────────────────────
  return (
    <div className="pb-8 flex flex-col gap-8">

      {/* ── Notificación de nuevo pedido en tiempo real ── */}
      <AnimatePresence>
        {nuevoPedidoAlert && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-emerald-500 text-white px-5 py-3 rounded-2xl shadow-xl font-bold text-sm flex items-center gap-2"
          >
            <ShoppingBag size={16} /> ¡Nuevo pedido recibido!
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Encabezado & Panic Button ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tight">
            ¡Hola, <span className="text-[#FF7A6A]">{restaurante.nombre}</span>! 👋
          </h1>
          <p className="text-slate-500 text-sm font-medium mt-1">
            Información General y métricas de tu negocio
          </p>
        </div>

        {/* Tarjeta de Estado Operativo */}
        <div className="relative" ref={pauseMenuRef}>
          <div className="bg-white rounded-[20px] p-4 flex items-center gap-4 shadow-[0_4px_12px_rgba(0,0,0,0.03)] border border-slate-100">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-500 ${isActive ? 'bg-[#FF7A6A] text-white shadow-md shadow-[#FF7A6A]/30' : 'bg-slate-100 text-slate-400'}`}>
              <Power size={22} className={toggling ? 'animate-pulse' : ''} />
            </div>
            <div className="pr-2">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Estado</p>
              <p className={`text-sm font-black ${isActive ? 'text-[#FF7A6A]' : 'text-slate-500'}`}>
                {isActive ? 'Local Abierto' : 'Pausado'}
              </p>
              {!isActive && countdown && (
                <p className="text-[11px] font-bold text-amber-500 flex items-center gap-1 mt-0.5">
                  <Clock size={11} /> Reabre en {countdown}
                </p>
              )}
            </div>

            {/* Dropdown trigger button */}
            <button
              onClick={() => !toggling && setShowPauseMenu(v => !v)}
              disabled={toggling}
              className={`flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                isActive
                  ? 'bg-[#FF7A6A] hover:bg-[#ff6755] text-white'
                  : 'bg-slate-200 hover:bg-slate-300 text-slate-600'
              }`}
            >
              {toggling ? <Loader2 size={14} className="animate-spin" /> : <ChevronDown size={14} className={`transition-transform ${showPauseMenu ? 'rotate-180' : ''}`} />}
              {isActive ? 'Pausar' : 'Menú'}
            </button>
          </div>

          {/* Dropdown Menu */}
          <AnimatePresence>
            {showPauseMenu && (
              <motion.div
                initial={{ opacity: 0, y: -8, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.96 }}
                transition={{ duration: 0.15 }}
                className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.12)] border border-slate-100 overflow-hidden z-50"
              >
                {isActive ? (
                  <>
                    <p className="px-4 pt-3 pb-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">Pausar local</p>
                    {[
                      { label: '⏱ Pausar 30 min', minutes: 30 },
                      { label: '⏰ Pausar 1 hora', minutes: 60 },
                      { label: '🔒 Pausar hasta que yo lo reactive', minutes: null },
                    ].map(opt => (
                      <button
                        key={opt.label}
                        onClick={() => pauseFor(opt.minutes)}
                        className="w-full text-left px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-[#FFF0EE] hover:text-[#FF7A6A] transition-colors"
                      >
                        {opt.label}
                      </button>
                    ))}
                  </>
                ) : (
                  <button
                    onClick={reopenNow}
                    className="w-full text-left px-4 py-3.5 text-sm font-bold text-[#FF7A6A] hover:bg-[#FFF0EE] transition-colors flex items-center gap-2"
                  >
                    <RefreshCw size={14} /> Reabrir ahora
                  </button>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* ── Tarjetas de Métricas (Top Row) ── */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
          {[...Array(5)].map((_, i) => <div key={i} className="shimmer h-32 rounded-[24px]" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
          {/* Platillos */}
          <motion.div whileHover={{ y: -4, scale: 1.01 }} transition={{ type: 'spring', stiffness: 400, damping: 25 }} className="bg-[#FFF0EE] rounded-[24px] p-6 flex justify-between items-center shadow-[0_4px_20px_rgba(255,122,106,0.05)] border border-white/50">
            <div>
              <p className="text-sm font-bold text-slate-600 mb-2">Platillos</p>
              <h3 className="text-4xl font-black text-[#FF7A6A]"><AnimatedCounter to={stats.platillos} /></h3>
            </div>
            <div className="text-[#FF7A6A]/30"><Utensils size={48} strokeWidth={1.5} /></div>
          </motion.div>

          {/* Combos */}
          <motion.div whileHover={{ y: -4, scale: 1.01 }} transition={{ type: 'spring', stiffness: 400, damping: 25 }} className="bg-[#FFF0EE] rounded-[24px] p-6 flex justify-between items-center shadow-[0_4px_20px_rgba(255,122,106,0.05)] border border-white/50">
            <div>
              <p className="text-sm font-bold text-slate-600 mb-2">Combos Armados</p>
              <h3 className="text-4xl font-black text-[#FF7A6A]"><AnimatedCounter to={stats.combos} /></h3>
            </div>
            <div className="text-[#FF7A6A]/30"><Package size={48} strokeWidth={1.5} /></div>
          </motion.div>

          {/* Promos */}
          <motion.div whileHover={{ y: -4, scale: 1.01 }} transition={{ type: 'spring', stiffness: 400, damping: 25 }} className="bg-[#FFF0EE] rounded-[24px] p-6 flex justify-between items-center shadow-[0_4px_20px_rgba(255,122,106,0.05)] border border-white/50">
            <div>
              <p className="text-sm font-bold text-slate-600 mb-2">Promociones</p>
              <h3 className="text-4xl font-black text-[#FF7A6A]"><AnimatedCounter to={stats.promos} /></h3>
            </div>
            <div className="text-[#FF7A6A]/30"><Tag size={48} strokeWidth={1.5} /></div>
          </motion.div>

          {/* Pedidos Hoy */}
          <motion.div whileHover={{ y: -4, scale: 1.01 }} transition={{ type: 'spring', stiffness: 400, damping: 25 }} className="bg-[#FFF0EE] rounded-[24px] p-6 flex justify-between items-center shadow-[0_4px_20px_rgba(255,122,106,0.05)] border border-white/50">
            <div>
              <p className="text-sm font-bold text-slate-600 mb-2">Pedidos Hoy</p>
              <h3 className="text-4xl font-black text-[#FF7A6A]">
                {salesLoading ? <Loader2 size={28} className="animate-spin text-[#FF7A6A]/40" /> : <AnimatedCounter to={salesStats?.todayOrders ?? 0} />}
              </h3>
            </div>
            <div className="text-[#FF7A6A]/30"><ShoppingBag size={48} strokeWidth={1.5} /></div>
          </motion.div>

          {/* Ventas del Mes */}
          <motion.div whileHover={{ y: -4, scale: 1.01 }} transition={{ type: 'spring', stiffness: 400, damping: 25 }} className="bg-[#FFF0EE] rounded-[24px] p-6 flex justify-between items-center shadow-[0_4px_20px_rgba(255,122,106,0.05)] border border-white/50">
            <div>
              <p className="text-sm font-bold text-slate-600 mb-2">Ventas del Mes</p>
              <h3 className="text-2xl font-black text-[#FF7A6A]">
                {salesLoading
                  ? <Loader2 size={28} className="animate-spin text-[#FF7A6A]/40" />
                  : `$${(salesStats?.monthTotal ?? 0).toFixed(2)}`}
              </h3>
            </div>
            <div className="text-[#FF7A6A]/30"><DollarSign size={48} strokeWidth={1.5} /></div>
          </motion.div>
        </div>
      )}

      {/* ── Grid Inferior (Gráfico & Menú Público) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-2">

        {/* Left Column: Real Bar Chart */}
        <div className="lg:col-span-2 bg-white rounded-[24px] border border-slate-100 p-6 flex flex-col shadow-[0_4px_20px_rgba(0,0,0,0.02)]">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h3 className="text-lg font-black text-slate-800">Ventas de la Semana</h3>
              <p className="text-xs font-bold text-slate-400 mt-1 uppercase tracking-widest">
                {salesStats
                  ? `Total del mes: $${salesStats.monthTotal.toFixed(2)}`
                  : new Date().toLocaleString('es-MX', { month: 'long', year: 'numeric' })}
              </p>
            </div>
            <div className="flex bg-[#F2F2F2] rounded-full p-1">
              <span className="bg-[#FF7A6A] text-white rounded-full px-4 py-1 text-xs font-bold shadow-sm">7 días</span>
            </div>
          </div>

          {/* Chart area */}
          {salesLoading ? (
            <div className="flex-1 flex items-center justify-center h-[200px]">
              <Loader2 className="animate-spin text-[#FF7A6A]/40 w-10 h-10" />
            </div>
          ) : salesEmpty ? (
            <div className="flex-1 flex flex-col items-center justify-center h-[200px] gap-3 text-center px-6">
              <span className="text-4xl">📊</span>
              <p className="text-sm font-semibold text-slate-500 leading-snug">
                Aún no tienes pedidos registrados.<br />
                <span className="text-[#FF7A6A]">¡Comparte tu menú para empezar!</span>
              </p>
            </div>
          ) : (
            <div className="flex flex-col flex-1">
              {/* Bars */}
              <div className="flex items-end justify-between h-[200px] gap-2 md:gap-3 mt-auto pt-4 border-t border-slate-50">
                {normalizedBars.map((val, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1">
                    <div
                      className={`w-full rounded-t-lg transition-all duration-500 hover:opacity-80 ${i === normalizedBars.length - 1 ? 'bg-[#FF7A6A]' : 'bg-[#FFF0EE]'}`}
                      style={{ height: `${Math.max(val, 4)}%` }}
                      title={`$${salesStats!.weeklyData[i].toFixed(2)}`}
                    />
                  </div>
                ))}
              </div>
              {/* Day labels */}
              <div className="flex justify-between mt-2 gap-2 md:gap-3">
                {salesStats!.weeklyLabels.map((label, i) => (
                  <div key={i} className="flex-1 text-center text-[10px] font-bold text-slate-400 uppercase">
                    {label}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Public Menu Widget */}
        <div className="bg-white rounded-[24px] border border-slate-100 p-6 shadow-[0_4px_20px_rgba(0,0,0,0.02)] flex flex-col">
          <div className="bg-[#FFF0EE] text-[#FF7A6A] rounded-2xl py-3 text-center font-black text-sm mb-6">
            Código QR de tu Menú
          </div>

          <div className="flex flex-col items-center flex-1">
            <div className="bg-white p-2 rounded-2xl shadow-sm border border-slate-100 mb-4 flex items-center justify-center min-h-[144px] min-w-[144px]">
              {qrDataUrl ? (
                <img src={qrDataUrl} alt="QR Code" className="w-32 h-32 rounded-xl" />
              ) : (
                <Loader2 className="animate-spin text-slate-300 w-8 h-8" />
              )}
            </div>

            <p className="text-sm font-medium text-slate-500 text-center mb-6 px-4">
              Tus clientes pueden escanear este código desde sus mesas para ver tu menú en sus celulares.
            </p>

            <div className="mt-auto w-full flex flex-col gap-3">
              <button
                onClick={handleDownloadQR}
                className="w-full bg-[#FF7A6A] hover:bg-[#ff6755] text-white font-bold py-3.5 rounded-2xl transition-colors text-sm flex items-center justify-center gap-2"
              >
                <Download size={18} />
                Descargar QR HD
              </button>

              <button
                className="w-full bg-[#F8F9FA] hover:bg-[#F0F2F5] text-slate-700 font-bold py-3.5 rounded-2xl transition-colors text-sm border border-slate-200"
                onClick={() => window.open(`https://estrella-eats.mx/menu/${restaurante.slug || restaurante.id}`, '_blank')}
              >
                Ver enlace del menú
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
