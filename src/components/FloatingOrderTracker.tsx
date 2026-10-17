import { useEffect, useState } from 'react';
import { useOrderTracking } from '../hooks/useOrderTracking';
import { trackingLink } from '../lib/trackingAccess';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, ChefHat, Truck, Package, XCircle, ChevronRight, MapPin } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';

export function FloatingOrderTracker() {
  const [orderId, setOrderId] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const tracking = useOrderTracking(['/tracker','/success'].includes(location.pathname) ? null : orderId);
  const status = tracking.pedido?.estado ?? null;
  const restaurantName = tracking.restaurante?.nombre ?? tracking.pedido?.restaurante ?? 'Estrella Eats';
  const restaurantLogo = tracking.restaurante?.logo_url ?? '/logo.png';
  useEffect(() => {
    const check = () => { try { setOrderId(localStorage.getItem('est_active_order')); } catch { setOrderId(null); } };
    check();
    const timer = window.setInterval(check, 3000);
    window.addEventListener('storage', check);
    return () => { window.clearInterval(timer); window.removeEventListener('storage', check); };
  }, []);
  useEffect(() => {
    if (!status) return;
    if (['entregado','cancelado','rechazado'].includes(status)) {
      try { localStorage.removeItem('est_active_order'); } catch { /* Receipt remains accessible by its private link. */ }
      return;
    }
    if (!isExpanded) return;
    const timer = window.setTimeout(() => setIsExpanded(false), 5000);
    return () => window.clearTimeout(timer);
  }, [status, isExpanded]);

  if (location.pathname === '/success') return null;
  if (!orderId || !status || ['entregado','cancelado','rechazado'].includes(status)) return null;

  // Determine icon, text, colors, and progress
  let Icon = Clock;
  let text = 'Pendiente';
  let color = 'text-emerald-500';
  let bgColor = 'bg-emerald-500';
  let progress = 25; // 25%

  if (['pendiente', 'pagado', 'asignado'].includes(status)) {
    Icon = Clock;
    text = 'Pedido Confirmado';
    progress = 25;
  } else if (['en_cocina', 'listo_para_recoger', 'recibido', 'preparando'].includes(status)) {
    Icon = ChefHat;
    text = 'Preparando Orden';
    color = 'text-orange-500';
    bgColor = 'bg-orange-500';
    progress = 60;
  } else if (status === 'en_camino') {
    Icon = Truck;
    text = 'En Camino';
    color = 'text-blue-500';
    bgColor = 'bg-blue-500';
    progress = 90;
  } else if (status === 'entregado') {
    Icon = Package;
    text = 'Entregado';
    color = 'text-green-500';
    bgColor = 'bg-green-500';
    progress = 100;
  } else if (['cancelado', 'rechazado'].includes(status)) {
    Icon = XCircle;
    text = 'Cancelado';
    color = 'text-red-500';
    bgColor = 'bg-red-500';
    progress = 100;
  }

  const radius = 22;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <AnimatePresence>
      <motion.div
        drag
        dragConstraints={{ left: -20, right: 20, top: -500, bottom: 20 }}
        dragElastic={0.1}
        key="floating-tracker-container"
        initial={{ y: 150, opacity: 0, scale: 0.8 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: 150, opacity: 0, scale: 0.5 }}
        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        className="fixed bottom-6 right-4 md:right-8 z-50 flex flex-col items-end"
        style={{ touchAction: 'none' }} // Previene interferencias de scroll al arrastrar
      >
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.9 }}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              className="mb-4 w-64 bg-white/80 backdrop-blur-xl border border-white/40 shadow-[0_8px_30px_rgb(0,0,0,0.12)] rounded-3xl overflow-hidden p-4 origin-bottom-right"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 rounded-full bg-white border border-slate-100 flex items-center justify-center text-white shadow-sm overflow-hidden shrink-0">
                  <img src={restaurantLogo} alt="Logo" className="w-full h-full object-cover" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-800 text-sm leading-tight">{text}</h4>
                  <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                    <MapPin className="w-3 h-3" />
                    {restaurantName}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => navigate(trackingLink('/tracker', orderId))}
                className={`w-full py-2.5 rounded-xl text-white font-bold text-xs flex items-center justify-center gap-1 shadow-md transition-all active:scale-95 ${bgColor}`}
              >
                Ver Ticket Completo
                <ChevronRight className="w-4 h-4" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <motion.button
          onClick={() => setIsExpanded(!isExpanded)}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="relative bg-white/90 backdrop-blur-md shadow-2xl rounded-full p-2 cursor-pointer flex items-center justify-center border border-white/40"
        >
          {/* Aro de progreso SVG */}
          <svg className="w-16 h-16 transform -rotate-90" viewBox="0 0 50 50">
            <circle
              className="text-slate-100"
              strokeWidth="4"
              stroke="currentColor"
              fill="transparent"
              r={radius}
              cx="25"
              cy="25"
            />
            <motion.circle
              className={color}
              strokeWidth="4"
              strokeDasharray={circumference}
              initial={{ strokeDashoffset: circumference }}
              animate={{ strokeDashoffset }}
              transition={{ duration: 1, ease: "easeOut" }}
              strokeLinecap="round"
              stroke="currentColor"
              fill="transparent"
              r={radius}
              cx="25"
              cy="25"
            />
          </svg>

          {/* Icono Interior */}
          <div className={`absolute inset-0 m-auto w-10 h-10 rounded-full ${bgColor} flex items-center justify-center text-white shadow-inner`}>
             <motion.div
               key={status} 
               initial={{ scale: 0, rotate: -180 }}
               animate={{ scale: 1, rotate: 0 }}
               transition={{ type: 'spring', stiffness: 200, damping: 15 }}
             >
               <Icon className="w-5 h-5" />
             </motion.div>
          </div>
          
          {/* Indicador de notificación */}
          {!isExpanded && (
            <span className="absolute top-0 right-0 w-4 h-4 bg-red-500 border-2 border-white rounded-full animate-pulse" />
          )}
        </motion.button>
      </motion.div>
    </AnimatePresence>
  );
}
