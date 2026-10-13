import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Loader2, Phone, MessageCircle, Navigation, MapPin, ChevronDown, CheckCircle, ChevronUp, Package } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLottie } from 'lottie-react';
import cookingAnimation from '../assets/Cooking.json';
import { trackingPoint } from '../lib/orderTracking';
import { useOrderTracking } from '../hooks/useOrderTracking';
import TrackingMap from '../components/TrackingMap';
import {useTrackingRoute} from '../hooks/useTrackingRoute';
import './TrackerPage.css';

const CookingAnimation = () => {
  const { View } = useLottie({ animationData: cookingAnimation, loop: true });
  return <>{View}</>;
};

export function TrackerPage() {
  const [searchParams] = useSearchParams();
  const pedidoId = searchParams.get('pedido');
  const {pedido,repartidor,restaurante,loading,error,retry} = useOrderTracking(pedidoId);
  const [isExpanded,setIsExpanded] = useState(false);
  const [showDetails,setShowDetails] = useState(true);
  const restaurantLocation = trackingPoint(pedido?.tipo_pedido === 'mandadito' ? pedido : restaurante);
  const driverLocation = trackingPoint(repartidor);
  const clientLocation = trackingPoint(pedido?.tipo_pedido === 'mandadito'
    ? {lat:pedido.lat_entrega,lng:pedido.lng_entrega} : pedido);
  const route = useTrackingRoute(pedido?.estado === 'en_camino',driverLocation,clientLocation);
  if (loading) return <main className="min-h-[100dvh] flex items-center justify-center bg-slate-50 gap-3" role="status">
    <Loader2 size={24} className="animate-spin" aria-hidden="true" /> Consultando tu pedido…
  </main>;
  if (!pedido) return <main className="min-h-[100dvh] flex items-center justify-center bg-slate-50 p-6">
    <div className="max-w-md text-center"><h1 className="text-2xl font-semibold mb-3">Vamos a encontrar tu pedido.</h1>
      <p role="alert" className="text-slate-600">{error}</p><button className="mt-6 min-h-11 bg-slate-900 text-white rounded-xl px-6" onClick={retry}>Volver a consultar</button>
      <a className="block min-h-11 mt-3 underline" href="/">Ver restaurantes</a></div>
  </main>;

  // ── Detectar tipo de pedido ───────────────────────────────────────────────
  const esMandadito = pedido?.tipo_pedido === 'mandadito';
  const esRecogida = pedido?.tipo_pedido === 'tienda';
  const enCocina = pedido?.estado_cocina === 'en_cocina';
  const listoParaRecoger = pedido?.estado_cocina === 'listo_para_recoger';
  const esperandoRestaurante = !esMandadito && pedido?.estado === 'pendiente' && !enCocina && !listoParaRecoger;
  const cancelado = ['cancelado', 'rechazado'].includes(pedido?.estado);

  // Limpiar descripción para mandaditos multi-parada (eliminar JSON embebido de paradas)
  const descripcionLimpia = esMandadito
    ? (pedido?.descripcion || '').split('[DETALLES/PARADAS]')[0].trim()
    : pedido?.descripcion;

  let currentStep = 1;

  if (pedido?.estado === 'entregado') currentStep = 4;
  else if (pedido?.estado === 'en_camino') currentStep = 3;
  else if (esRecogida && listoParaRecoger) currentStep = 3;
  else if (!cancelado && (esMandadito || enCocina || listoParaRecoger)) currentStep = 2;

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      data-panel-expanded={isExpanded}
      className="order-tracker h-[100dvh] w-full flex flex-col md:flex-row bg-slate-50 overflow-hidden font-sans relative"
    >
      
      {/* MAPA (Fondo en móvil / Izquierda en Desktop) */}
      <div className="order-tracker-map w-full h-full md:w-auto md:flex-1 md:min-w-0 bg-slate-200 absolute md:relative inset-0 md:inset-auto z-0">
        <TrackingMap origin={restaurantLocation} destination={clientLocation} driver={driverLocation} route={route} />
      </div>

      {/* Floating Status Pill (Mobile Only - visible when sheet is collapsed) */}
      <AnimatePresence>
        {!isExpanded && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="absolute top-24 left-4 right-4 md:hidden z-10 flex justify-center pointer-events-none"
          >
            <div className="bg-white px-5 py-2.5 rounded-full shadow-lg border border-slate-100 flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${cancelado ? 'bg-red-500' : pedido?.estado === 'entregado' ? 'bg-emerald-500' : pedido?.estado === 'en_camino' ? 'bg-blue-500' : 'bg-orange-500 animate-pulse'}`} />
              <span className="text-sm font-bold text-slate-800">
                {pedido?.estado?.replace('_', ' ').toUpperCase() || 'PROCESANDO'}
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* PANEL LATERAL (Bottom Sheet en móvil / Derecha en Desktop) */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.2 }}
        className={`w-full bg-white shadow-[0_-15px_40px_rgba(0,0,0,0.12)] md:shadow-[-10px_0_30px_rgba(0,0,0,0.05)] z-20 flex flex-col absolute bottom-0 md:relative rounded-t-[32px] md:rounded-none h-[90dvh] md:h-full md:w-[380px] md:max-w-[48vw] transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] md:translate-y-0 ${isExpanded ? 'translate-y-0' : 'translate-y-[55dvh]'}`}
      >
        
        <button type="button" aria-expanded={isExpanded} aria-controls="tracking-details" aria-label={isExpanded ? 'Mostrar más mapa' : 'Mostrar detalles del pedido'}
          className="w-full flex justify-center items-center min-h-12 md:hidden shrink-0 rounded-t-[32px] relative"
          onClick={() => setIsExpanded(value => !value)}>
          <span className="text-sm font-medium">{isExpanded ? 'Mostrar más mapa' : 'Ver mi pedido'}</span>
          <span className="absolute right-6">{isExpanded ? <ChevronDown size={18} /> : <ChevronUp size={18} />}</span>
        </button>

        {/* Content (Scrollable) */}
        <div id="tracking-details" className={`flex-1 min-h-0 p-5 md:p-6 custom-scrollbar ${isExpanded ? 'overflow-y-auto' : 'overflow-hidden md:overflow-y-auto'}`}>
          
          {error && <div role="alert" className="mb-4 p-3 bg-orange-50 text-sm text-orange-950 rounded-xl"><p>{error}</p>
            <button className="min-h-11 underline" onClick={retry}>Actualizar estado</button></div>}
          <div className="flex items-center justify-between mb-6 md:mt-2">
            <div className="flex items-center gap-4">
              {/* Icono principal: adaptado según tipo de pedido y estado */}
              <div className={`w-14 h-14 rounded-full flex items-center justify-center shrink-0 shadow-md ${
                pedido?.estado === 'en_camino' ? 'bg-blue-600 text-white shadow-blue-500/20' : 
                pedido?.estado === 'entregado' ? 'bg-emerald-500 text-white shadow-emerald-500/20' : 
                cancelado ? 'bg-red-500 text-white shadow-red-500/20' :
                esMandadito ? 'bg-violet-600 text-white shadow-violet-500/20' :
                'bg-slate-100 border border-slate-200'
              }`}>
                {pedido?.estado === 'en_camino' ? (
                  <Navigation className="w-6 h-6" />
                ) : pedido?.estado === 'entregado' ? (
                  <MapPin className="w-6 h-6" />
                ) : cancelado ? (
                  <Navigation className="w-6 h-6" />
                ) : esMandadito ? (
                  <Package className="w-6 h-6" />
                ) : restaurante?.logo_url ? (
                  <img src={restaurante.logo_url} alt="" className="w-full h-full object-cover rounded-full" />
                ) : (
                  <span className="text-xl font-black text-slate-400">{pedido?.restaurante?.[0]}</span>
                )}
              </div>
              <div>
                {/* Título principal: diferenciado para mandaditos */}
                <h2 className="text-lg font-black text-slate-800 leading-tight line-clamp-1 uppercase">
                  {pedido?.estado === 'en_camino'
                    ? (esMandadito ? '🛵 TU PAQUETE VA EN CAMINO' : 'TU ORDEN VA EN CAMINO')
                    : pedido?.estado === 'entregado'
                    ? (esMandadito ? '📦 ¡PAQUETE ENTREGADO!' : 'PEDIDO ENTREGADO')
                    : cancelado
                    ? (pedido?.estado === 'rechazado' ? 'PEDIDO RECHAZADO' : 'PEDIDO CANCELADO')
                    : esMandadito
                    ? '📦 ENVÍO EN PROCESO'
                    : pedido?.restaurante}
                </h2>
                <div className="flex items-center gap-2 mt-1">
                  {/* Sub-texto: diferenciado para mandaditos */}
                  <p className="text-sm font-medium text-slate-600">
                    {pedido?.estado === 'en_camino'
                      ? (esMandadito ? 'Tu mensajero lleva el paquete' : 'Nos vemos pronto')
                      : pedido?.estado === 'entregado'
                      ? (esMandadito ? '¡Entregado con éxito!' : '¡Disfruta tu comida!')
                      : cancelado
                      ? 'Este viaje terminó'
                      : esMandadito
                      ? (repartidor ? 'Mensajero asignado' : 'Buscando mensajero...')
                      : esperandoRestaurante
                      ? 'Esperando aceptación del restaurante'
                      : listoParaRecoger
                      ? (esRecogida ? 'Tu pedido está listo para recoger' : 'Tu pedido está listo; esperamos al repartidor')
                      : enCocina
                      ? 'El restaurante está preparando tu pedido'
                      : 'Consultando el estado del pedido'}
                  </p>
                  

                </div>
              </div>
            </div>
            
            {/* Animación de cocina: solo para pedidos de restaurante en preparación */}
            {!esMandadito && enCocina && !cancelado && pedido?.estado !== 'en_camino' && pedido?.estado !== 'entregado' && (
              <div className="w-16 h-16 shrink-0 mr-1">
                <CookingAnimation />
              </div>
            )}

            {/* Para mandaditos esperando mensajero: icono pulsante */}
            {esMandadito && !cancelado && pedido?.estado !== 'en_camino' && pedido?.estado !== 'entregado' && (
              <div className="w-16 h-16 shrink-0 mr-1 flex items-center justify-center">
                <Package className="w-8 h-8 text-violet-600" aria-hidden="true" />
              </div>
            )}
          </div>


          {/* Timeline Progress */}
          {!cancelado && (
            <div className={`mb-2 mt-2 ${!isExpanded ? 'hidden md:block' : 'block'}`}>
              <div className="flex items-center justify-between relative">
                {/* Background Line */}
                <div className="absolute left-0 right-0 top-1/2 h-1 bg-slate-100 -z-10 -translate-y-1/2 rounded-full" />
                
                {/* Active Line */}
                <div 
                  className="absolute left-0 top-1/2 h-1 bg-emerald-500 -z-10 -translate-y-1/2 rounded-full transition-all duration-500"
                  style={{ width: `${((currentStep - 1) / 3) * 100}%` }}
                />

                {/* Steps */}
                {[1, 2, 3, 4].map((step) => (
                  <div key={step} className="flex flex-col items-center gap-2">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors duration-300 ${
                      step <= currentStep 
                        ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/20' 
                        : 'bg-white border-2 border-slate-200 text-slate-400'
                    }`}>
                      {step < currentStep ? <CheckCircle className="w-4 h-4" /> : step}
                    </div>
                  </div>
                ))}
              </div>
              {/* Etiquetas del timeline: "Recogiendo" para mandaditos, "Preparando" para restaurantes */}
              <div className="flex justify-between mt-2 px-1">
                <span className={`text-sm font-semibold ${currentStep >= 1 ? 'text-emerald-700' : 'text-slate-600'}`}>Recibido</span>
                <span className={`text-sm font-semibold ${currentStep >= 2 ? 'text-emerald-700' : 'text-slate-600'}`}>
                  {esMandadito ? 'Recogiendo' : 'Preparando'}
                </span>
                <span className={`text-sm font-semibold ${currentStep >= 3 ? 'text-emerald-700' : 'text-slate-600'}`}>{esRecogida ? 'Listo' : 'En camino'}</span>
                <span className={`text-sm font-semibold ${currentStep >= 4 ? 'text-emerald-700' : 'text-slate-600'}`}>Entregado</span>
              </div>
            </div>
          )}

          {/* End Timeline Progress */}
          
          {/* Order Details Toggle */}
          <div className={`mt-4 bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-sm ${isExpanded ? '' : 'hidden md:block'}`}>
            <button 
              onClick={() => {
                if (!showDetails) setIsExpanded(true);
                setShowDetails(!showDetails);
              }}
              className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors"
            >
              <span className="text-sm font-bold text-slate-700">
                {esMandadito ? 'Ver detalles del envío' : 'Ver detalles del pedido'}
              </span>
              {showDetails ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
            </button>
            <AnimatePresence>
              {showDetails && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="px-4 pb-4 overflow-hidden"
                >
                  {/* descripcionLimpia: para mandaditos elimina el JSON de paradas embebido */}
                  <div className="pt-3 border-t border-slate-100 text-sm text-slate-600 whitespace-pre-wrap font-medium">
                    {descripcionLimpia || 'No hay detalles disponibles.'}
                  </div>
                  {!esRecogida && !cancelado && pedido?.estado !== 'entregado' && typeof pedido?.pin_seguridad === 'string' && /^\d{4}$/.test(pedido.pin_seguridad) && (
                    <div className="pt-4 mt-4 border-t border-slate-100">
                      <p className="text-sm font-bold text-slate-700">PIN de entrega</p>
                      <p className="text-2xl font-bold tabular-nums text-slate-800">{pedido.pin_seguridad}</p>
                      <p className="text-sm text-slate-600">Dáselo al repartidor cuando recibas tu pedido.</p>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          
          {repartidor && (
             <div className={`mt-6 md:mt-8 bg-white border border-slate-100 rounded-2xl p-4 shadow-sm ${isExpanded ? '' : 'hidden md:block'}`}>
               <h4 className="text-sm font-semibold text-slate-600 mb-3">
                 {esMandadito ? 'Tu Mensajero' : 'Tu Repartidor'}
               </h4>
               <div className="flex items-center gap-3">
                 <div className="w-12 h-12 rounded-full bg-slate-100 overflow-hidden shrink-0 border border-slate-200">
                    <span aria-hidden="true" className="w-full h-full flex items-center justify-center font-semibold text-slate-800">{repartidor.nombre.split(/\s+/).filter(Boolean).slice(0,2).map(part => part[0]).join('')}</span>
                 </div>
                 <div>
                   <p className="font-black text-slate-800 leading-tight">{repartidor.nombre}</p>
                   <p className="text-sm text-slate-600 mt-0.5">
                     {esMandadito ? 'MENSAJERO ASIGNADO' : 'ASIGNADO A TU ORDEN'}
                   </p>
                 </div>
               </div>
             </div>
          )}


        </div>

        {/* Action Buttons (Fijo abajo) */}
        <div className={`p-4 md:p-6 border-t border-slate-100 bg-white grid-cols-2 gap-3 shrink-0 ${isExpanded ? 'grid' : 'hidden md:grid'}`}>
          {cancelado || pedido.estado === 'entregado' ? <a href="/" className="col-span-2 min-h-11 flex items-center justify-center rounded-xl bg-slate-900 text-white font-semibold">Ver restaurantes</a> : <>
          <a 
            href={repartidor?.telefono ? `https://wa.me/52${repartidor.telefono}?text=Hola,%20soy%20el%20cliente%20del%20pedido%20${pedidoId?.split('-')[0]}` : '#'}
            target="_blank"
            rel="noopener noreferrer"
            aria-disabled={!repartidor?.telefono}
            tabIndex={repartidor?.telefono ? 0 : -1}
            onClick={(e) => { if(!repartidor?.telefono) e.preventDefault(); }}
            className={`flex items-center justify-center gap-2 py-3.5 rounded-xl transition-all ${
              repartidor?.telefono 
                ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-600 font-bold active:scale-95' 
                : 'bg-slate-50 text-slate-400 cursor-not-allowed font-semibold'
            }`}
          >
            <MessageCircle className="w-5 h-5" />
            <span className="text-sm">WhatsApp</span>
          </a>
          
          <a 
            href={repartidor?.telefono ? `tel:${repartidor.telefono}` : '#'}
            aria-disabled={!repartidor?.telefono}
            tabIndex={repartidor?.telefono ? 0 : -1}
            onClick={(e) => { if(!repartidor?.telefono) e.preventDefault(); }}
            className={`flex items-center justify-center gap-2 py-3.5 rounded-xl transition-all ${
              repartidor?.telefono 
                ? 'bg-blue-50 hover:bg-blue-100 text-blue-600 font-bold active:scale-95' 
                : 'bg-slate-50 text-slate-400 cursor-not-allowed font-semibold'
            }`}
          >
            <Phone className="w-5 h-5" />
            <span className="text-sm">Llamar</span>
          </a>
          </>}
        </div>
      </motion.div>
    </motion.div>
  );
}
