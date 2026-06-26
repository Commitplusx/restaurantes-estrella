import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, ChefHat, Truck, Package, XCircle, ChevronRight } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';

export function FloatingOrderTracker() {
  const [orderId, setOrderId] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const checkOrder = () => {
      const storedId = localStorage.getItem('est_active_order');
      if (storedId !== orderId) {
        setOrderId(storedId);
      }
    };

    // Check on mount and every 3 seconds to catch changes if modified elsewhere
    checkOrder();
    const interval = setInterval(checkOrder, 3000);
    return () => clearInterval(interval);
  }, [orderId]);

  useEffect(() => {
    if (!orderId) return;

    let channel: any;

    const fetchStatus = async () => {
      const { data, error } = await supabase
        .from('pedidos')
        .select('estado')
        .eq('id', orderId)
        .single();
        
      if (!error && data) {
        setStatus(data.estado);
        if (['entregado', 'cancelado', 'rechazado'].includes(data.estado)) {
          localStorage.removeItem('est_active_order');
          setOrderId(null);
        }
      }
    };

    fetchStatus();

    channel = supabase.channel(`floating-tracker-${orderId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'pedidos', filter: `id=eq.${orderId}` },
        (payload) => {
          setStatus(payload.new.estado);
          if (['entregado', 'cancelado', 'rechazado'].includes(payload.new.estado)) {
            localStorage.removeItem('est_active_order');
            setOrderId(null);
          } else {
             // Animar al cambiar de estado
             setIsExpanded(true);
             setTimeout(() => setIsExpanded(false), 4000);
          }
        }
      )
      .subscribe();

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, [orderId]);

  // No mostrar en la página de success (porque ahí ya está el tracker completo)
  // IMPORTANTE: Esto debe ir DESPUÉS de todos los hooks para no romper React.
  if (location.pathname === '/success') return null;

  if (!orderId || !status) return null;

  // Determine icon and color based on status
  let Icon = Clock;
  let text = 'Pendiente';
  let color = 'bg-emerald-500';
  let pulse = true;

  if (['pendiente', 'pagado', 'asignado'].includes(status)) {
    Icon = Clock;
    text = 'Pedido Recibido';
  } else if (['en_cocina', 'listo_para_recoger', 'recibido', 'preparando'].includes(status)) {
    Icon = ChefHat;
    text = 'En Preparación';
    color = 'bg-orange-500';
  } else if (status === 'en_camino') {
    Icon = Truck;
    text = 'En Camino';
    color = 'bg-blue-500';
  } else if (status === 'entregado') {
    Icon = Package;
    text = 'Entregado';
    color = 'bg-green-500';
    pulse = false;
  } else if (['cancelado', 'rechazado'].includes(status)) {
    Icon = XCircle;
    text = 'Cancelado';
    color = 'bg-red-500';
    pulse = false;
  }

  const handleClick = () => {
    navigate(`/success?pedido=${orderId}`);
  };

  return (
    <AnimatePresence>
      <motion.div
        key="floating-tracker"
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0, scale: 0.5 }}
        transition={{ type: 'spring', stiffness: 260, damping: 20 }}
        className="fixed bottom-6 right-6 z-50 flex items-center justify-end"
      >
        <button
          onClick={handleClick}
          onMouseEnter={() => setIsExpanded(true)}
          onMouseLeave={() => setIsExpanded(false)}
          className={`flex items-center group relative shadow-2xl rounded-full ${color} text-white p-3 md:p-4 transition-all duration-300 transform hover:scale-105 active:scale-95`}
        >
          {/* Pulso para llamar la atención */}
          {pulse && (
            <span className="absolute inset-0 rounded-full animate-ping opacity-20 bg-white" />
          )}
          
          <motion.div
            key={status} // Key ensures the icon animates when it changes
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 200, damping: 15 }}
            className="relative z-10"
          >
            <Icon className="w-6 h-6 md:w-7 md:h-7" />
          </motion.div>

          <AnimatePresence>
            {isExpanded && (
              <motion.div
                initial={{ width: 0, opacity: 0, marginLeft: 0 }}
                animate={{ width: 'auto', opacity: 1, marginLeft: 12 }}
                exit={{ width: 0, opacity: 0, marginLeft: 0 }}
                className="overflow-hidden whitespace-nowrap flex items-center pr-2"
              >
                <span className="font-bold text-sm md:text-base">{text}</span>
                <ChevronRight className="w-4 h-4 ml-1 opacity-70" />
              </motion.div>
            )}
          </AnimatePresence>
        </button>
      </motion.div>
    </AnimatePresence>
  );
}
