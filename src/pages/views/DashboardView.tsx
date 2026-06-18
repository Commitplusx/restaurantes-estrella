import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import type { Restaurante } from '../../lib/supabase'
import { Activity, Utensils, Package, Tag, Loader2, Power, QrCode, Download } from 'lucide-react'
import QRCode from 'qrcode'

export function DashboardView({ restaurante }: { restaurante: Restaurante }) {
  const [stats, setStats] = useState({ platillos: 0, combos: 0, promos: 0 })
  const [loading, setLoading] = useState(true)
  const [isActive, setIsActive] = useState(restaurante.activo)
  const [toggling, setToggling] = useState(false)
  const [qrDataUrl, setQrDataUrl] = useState<string>('')

  const toggleStatus = async () => {
    if(toggling) return;
    setToggling(true)
    const newStatus = !isActive;
    
    const { error } = await supabase
      .from('restaurantes')
      .update({ activo: newStatus })
      .eq('id', restaurante.id)
      
    if (!error) {
      setIsActive(newStatus)
    } else {
      console.error(error)
      alert("Error al cambiar estado operativo")
    }
    setToggling(false)
  }

  const handleDownloadQR = () => {
    if (!qrDataUrl) {
      alert("El QR aún se está generando");
      return;
    }
    const link = document.createElement('a');
    link.href = qrDataUrl;
    link.download = `QR_${restaurante.nombre.replace(/\s+/g, '_')}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  useEffect(() => {
    async function generateQR() {
      try {
        const url = `https://restaurantes-app-estrella.shop/menu/${restaurante.slug || restaurante.id}`;
        const dataUrl = await QRCode.toDataURL(url, {
          width: 800,
          margin: 2,
          color: {
            dark: '#000000',
            light: '#ffffff',
          },
          errorCorrectionLevel: 'H',
        });
        setQrDataUrl(dataUrl);
      } catch (err) {
        console.error('Error generando QR:', err);
      }
    }
    generateQR();
  }, [restaurante.id]);

  useEffect(() => {
    async function loadStats() {
      const [
        { count: platillos },
        { count: combos },
        { count: promos }
      ] = await Promise.all([
        supabase.from('menu_items').select('*', { count: 'exact', head: true }).eq('restaurante_id', restaurante.id),
        supabase.from('menu_combos').select('*', { count: 'exact', head: true }).eq('restaurante_id', restaurante.id),
        supabase.from('menu_promociones').select('*', { count: 'exact', head: true }).eq('restaurante_id', restaurante.id)
      ])
      
      setStats({
        platillos: platillos || 0,
        combos: combos || 0,
        promos: promos || 0
      })
      setLoading(false)
    }
    loadStats()
  }, [restaurante.id])

  return (
    <div className="pb-8 flex flex-col gap-8">
      
      {/* ── Encabezado & Master Switch ── */}
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
        <div className="bg-white rounded-[20px] p-4 flex items-center gap-4 shadow-[0_4px_12px_rgba(0,0,0,0.03)] border border-slate-100">
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-500 ${isActive ? 'bg-[#FF7A6A] text-white shadow-md shadow-[#FF7A6A]/30' : 'bg-slate-100 text-slate-400'}`}>
            <Power size={22} className={toggling ? 'animate-pulse' : ''} />
          </div>
          <div className="pr-2">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Estado</p>
            <p className={`text-sm font-black ${isActive ? 'text-[#FF7A6A]' : 'text-slate-500'}`}>
              {isActive ? 'Local Abierto' : 'Pausado'}
            </p>
          </div>
          
          <button 
            onClick={toggleStatus}
            disabled={toggling}
            className={`relative w-14 h-8 rounded-full transition-all duration-300 cursor-pointer ${isActive ? 'bg-[#FF7A6A]' : 'bg-slate-200'}`}
          >
            <div className={`absolute top-1 w-6 h-6 bg-white rounded-full transition-all duration-300 shadow-sm ${isActive ? 'left-7' : 'left-1'} ${toggling ? 'scale-75 opacity-70' : 'scale-100'}`} />
          </button>
        </div>
      </div>

      {/* ── Tarjetas de Métricas (Top Row) ── */}
      {loading ? (
        <div className="flex justify-center py-24">
          <Loader2 size={44} className="animate-spin text-[#FF7A6A]" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-[#FFF0EE] rounded-[24px] p-6 flex justify-between items-center shadow-sm">
            <div>
              <p className="text-sm font-bold text-slate-600 mb-2">Platillos</p>
              <h3 className="text-4xl font-black text-[#FF7A6A]">{stats.platillos}</h3>
            </div>
            <div className="text-[#FF7A6A]/30">
              <Utensils size={48} strokeWidth={1.5} />
            </div>
          </div>

          <div className="bg-[#FFF0EE] rounded-[24px] p-6 flex justify-between items-center shadow-sm">
            <div>
              <p className="text-sm font-bold text-slate-600 mb-2">Combos Armados</p>
              <h3 className="text-4xl font-black text-[#FF7A6A]">{stats.combos}</h3>
            </div>
            <div className="text-[#FF7A6A]/30">
              <Package size={48} strokeWidth={1.5} />
            </div>
          </div>

          <div className="bg-[#FFF0EE] rounded-[24px] p-6 flex justify-between items-center shadow-sm">
            <div>
              <p className="text-sm font-bold text-slate-600 mb-2">Promociones</p>
              <h3 className="text-4xl font-black text-[#FF7A6A]">{stats.promos}</h3>
            </div>
            <div className="text-[#FF7A6A]/30">
              <Tag size={48} strokeWidth={1.5} />
            </div>
          </div>
        </div>
      )}

      {/* ── Grid Inferior (Gráfico & Menú Público) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-2">
        
        {/* Left Column: Fake Bar Chart */}
        <div className="lg:col-span-2 bg-white rounded-[24px] border border-slate-100 p-6 flex flex-col shadow-[0_4px_20px_rgba(0,0,0,0.02)]">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h3 className="text-lg font-black text-slate-800">Estadísticas del Menú</h3>
              <p className="text-xs font-bold text-slate-400 mt-1 uppercase tracking-widest">Actividad</p>
            </div>
            <div className="flex bg-[#F2F2F2] rounded-full p-1">
              <button className="bg-[#FF7A6A] text-white rounded-full px-4 py-1 text-xs font-bold shadow-sm">Mensual</button>
              <button className="text-slate-500 bg-transparent rounded-full px-4 py-1 text-xs font-bold">Anual</button>
            </div>
          </div>
          
          <div className="flex items-end justify-between h-[200px] gap-2 md:gap-4 mt-auto pt-4 border-t border-slate-50">
            {[40, 60, 30, 80, 50, 45, 90, 60, 70, 55, 100, 75].map((val, i) => (
              <div key={i} className={`w-full rounded-t-lg transition-all duration-300 hover:opacity-80 ${i === 10 ? 'bg-[#FF7A6A]' : 'bg-[#FFF0EE]'}`} style={{ height: `${val}%` }} />
            ))}
          </div>
        </div>

        {/* Right Column: Public Menu Widget */}
        <div className="bg-white rounded-[24px] border border-slate-100 p-6 shadow-[0_4px_20px_rgba(0,0,0,0.02)] flex flex-col">
          <div className="bg-[#FFF0EE] text-[#FF7A6A] rounded-2xl py-3 text-center font-black text-sm mb-6">
            Código QR de tu Menú
          </div>
          
          <div className="flex flex-col items-center flex-1">
            <div className="bg-white p-2 rounded-2xl shadow-sm border border-slate-100 mb-4 flex items-center justify-center min-h-[144px] min-w-[144px]">
              {qrDataUrl ? (
                <img 
                  src={qrDataUrl} 
                  alt="QR Code" 
                  className="w-32 h-32 rounded-xl"
                />
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
                onClick={() => window.open(`https://restaurantes-app-estrella.shop/menu/${restaurante.slug || restaurante.id}`, '_blank')}
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
