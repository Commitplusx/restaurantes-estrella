import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Loader2, Phone, MessageCircle, Navigation, MapPin, Store, Home, Bike, ChevronDown, CheckCircle, Clock, ChevronUp } from 'lucide-react';
import { useJsApiLoader, GoogleMap, OverlayView, Polyline } from '@react-google-maps/api';
import { motion, AnimatePresence } from 'framer-motion';
import { useLottie } from 'lottie-react';
import cookingAnimation from '../assets/Cooking.json';

const CookingAnimation = () => {
  const { View } = useLottie({ animationData: cookingAnimation, loop: true });
  return <>{View}</>;
};

const mapContainerStyle = {
  width: '100%',
  height: '100%'
};

export function TrackerPage() {
  const [searchParams] = useSearchParams();
  const pedidoId = searchParams.get('pedido');
  
  const [pedido, setPedido] = useState<any>(null);
  const [repartidor, setRepartidor] = useState<any>(null);
  const [restaurante, setRestaurante] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Bottom Sheet state
  const [isExpanded, setIsExpanded] = useState(false);
  const touchStartY = useRef(0);

  // Advanced feature states
  const [directions, setDirections] = useState<google.maps.DirectionsResult | null>(null);
  const [eta, setEta] = useState<string | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  // Load Google Maps
  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '',
  });

  const fetchRepartidor = async (repId: string) => {
    const { data: repData } = await supabase
      .from('repartidores')
      .select('*')
      .or(`id.eq.${repId},user_id.eq.${repId}`)
      .maybeSingle();
    
    if (repData) {
      setRepartidor(repData);
      return repData;
    }
    return null;
  };

  useEffect(() => {
    if (!pedidoId) return;

    let orderChannel: any = null;
    let driverChannel: any = null;

    const subscribeToDriver = (repId: string) => {
      if (driverChannel) supabase.removeChannel(driverChannel);
      
      driverChannel = supabase.channel(`driver-tracker-${repId}-${Date.now()}`)
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'repartidores', filter: `id=eq.${repId}` },
          (payload) => {
            setRepartidor((prev: any) => prev ? {
              ...prev,
              lat: payload.new.lat,
              lng: payload.new.lng
            } : prev);
          }
        ).subscribe();
    };

    const fetchInitialData = async () => {
      // Fetch pedido (Soporta UUID largo o ID corto de 6 caracteres)
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(pedidoId);
      
      let query = supabase.from('pedidos').select('*');
      if (isUUID) {
        query = query.eq('id', pedidoId);
      } else {
        query = query.eq('wb_message_id', pedidoId);
      }
      
      const { data: orderData } = await query.single();
        
      if (orderData) {
        setPedido(orderData);
        
        // Fetch restaurante
        if (orderData.restaurante) {
          const { data: restData } = await supabase
            .from('restaurantes')
            .select('*')
            .ilike('nombre', orderData.restaurante)
            .single();
          if (restData) setRestaurante(restData);
        }

        // Fetch repartidor if assigned
        if (orderData.repartidor_id) {
          fetchRepartidor(orderData.repartidor_id).then(repData => {
            if (repData && repData.id) {
              subscribeToDriver(repData.id);
            }
          });
        }

        // Subscribirse al estado del pedido
        orderChannel = supabase.channel(`order-tracker-${orderData.id}-${Date.now()}`)
          .on(
            'postgres_changes',
            { event: 'UPDATE', schema: 'public', table: 'pedidos', filter: `id=eq.${orderData.id}` },
            (payload) => {
              setPedido((prev: any) => ({ ...prev, ...payload.new }));
              
              // Si el repartidor se asignó o cambió
              if (payload.new.repartidor_id) {
                fetchRepartidor(payload.new.repartidor_id).then(repData => {
                  if (repData && repData.id) {
                    subscribeToDriver(repData.id);
                  }
                });
              }
            }
          ).subscribe();
          
        setLoading(false);
      } else {
        setLoading(false); // No se encontró el pedido
      }
    };

    fetchInitialData();

    return () => {
      if (orderChannel) supabase.removeChannel(orderChannel);
      if (driverChannel) supabase.removeChannel(driverChannel);
    };
  }, [pedidoId]);

  // Coordenadas base
  const defaultCenter = useMemo(() => ({ lat: 16.2516, lng: -92.1332 }), []); // Comitán por defecto
  
  const restaurantLocation = useMemo(() => restaurante?.lat && restaurante?.lng 
    ? { lat: Number(restaurante.lat), lng: Number(restaurante.lng) } 
    : null, [restaurante?.lat, restaurante?.lng]);
  
  const driverLocation = useMemo(() => repartidor?.lat && repartidor?.lng
    ? { lat: Number(repartidor.lat), lng: Number(repartidor.lng) }
    : null, [repartidor?.lat, repartidor?.lng]);

  const clientLocation = useMemo(() => pedido?.lat && pedido?.lng
    ? { lat: Number(pedido.lat), lng: Number(pedido.lng) }
    : null, [pedido?.lat, pedido?.lng]);

  const mapRef = useRef<google.maps.Map | null>(null);

  const fitMapToBounds = useCallback(() => {
    if (!mapRef.current || !window.google?.maps) return;
    
    const bounds = new window.google.maps.LatLngBounds();
    let count = 0;
    
    if (restaurantLocation) { bounds.extend(restaurantLocation); count++; }
    if (clientLocation) { bounds.extend(clientLocation); count++; }
    if (driverLocation) { bounds.extend(driverLocation); count++; }
    
    if (count > 1) {
      // Usar un padding inferior para compensar el bottom sheet
      mapRef.current.fitBounds(bounds, { top: 80, right: 80, bottom: window.innerWidth < 768 ? 320 : 80, left: window.innerWidth < 768 ? 80 : 400 });
    } else if (count === 1) {
      mapRef.current.setZoom(14);
      mapRef.current.setCenter(driverLocation || restaurantLocation || clientLocation || defaultCenter);
    }
  }, [restaurantLocation, clientLocation, driverLocation, defaultCenter]);

  useEffect(() => {
    fitMapToBounds();
  }, [fitMapToBounds]);

  const lastDirectionsFetch = useRef<number>(0);

  useEffect(() => {
    if (pedido?.estado === 'en_camino' && driverLocation && clientLocation && isLoaded && window.google) {
      const now = Date.now();
      // Throttle: Solo pedir la ruta azul a Google Maps cada 30 segundos
      if (now - lastDirectionsFetch.current < 30000) return;
      lastDirectionsFetch.current = now;

      const directionsService = new window.google.maps.DirectionsService();
      directionsService.route(
        {
          origin: driverLocation,
          destination: clientLocation,
          travelMode: window.google.maps.TravelMode.DRIVING,
        },
        (result, status) => {
          if (status === window.google.maps.DirectionsStatus.OK && result) {
            setDirections(result);
            if (result.routes[0]?.legs[0]?.duration?.text) {
              setEta(result.routes[0].legs[0].duration.text);
            }
          }
        }
      );
    } else if (pedido?.estado !== 'en_camino') {
      setDirections(null);
      setEta(null);
      lastDirectionsFetch.current = 0;
    }
  }, [pedido?.estado, driverLocation?.lat, driverLocation?.lng, clientLocation?.lat, clientLocation?.lng, isLoaded]);

  if (!pedidoId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <p className="text-slate-500 font-medium">ID de pedido inválido.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  const mapStyles = [
    { elementType: 'geometry', stylers: [{ color: '#f5f5f5' }] },
    { elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
    { elementType: 'labels.text.fill', stylers: [{ color: '#616161' }] },
    { elementType: 'labels.text.stroke', stylers: [{ color: '#f5f5f5' }] },
    { featureType: 'administrative.land_parcel', elementType: 'labels.text.fill', stylers: [{ color: '#bdbdbd' }] },
    { featureType: 'poi', elementType: 'geometry', stylers: [{ color: '#eeeeee' }] },
    { featureType: 'poi', elementType: 'labels.text.fill', stylers: [{ color: '#757575' }] },
    { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#ffffff' }] },
    { featureType: 'road.arterial', elementType: 'labels.text.fill', stylers: [{ color: '#757575' }] },
    { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#dadada' }] },
    { featureType: 'road.highway', elementType: 'labels.text.fill', stylers: [{ color: '#616161' }] },
    { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#c9c9c9' }] },
    { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#9e9e9e' }] },
  ];

  let currentStep = 1;
  if (pedido?.estado === 'entregado') currentStep = 4;
  else if (pedido?.estado === 'en_camino') currentStep = 3;
  else if (pedido?.estado && pedido?.estado !== 'cancelado') currentStep = 2;

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="h-[100dvh] w-full flex flex-col md:flex-row bg-slate-50 overflow-hidden font-sans relative"
    >
      
      {/* MAPA (Fondo en móvil / Izquierda en Desktop) */}
      <div className="w-full h-full md:w-2/3 bg-slate-200 absolute md:relative inset-0 md:inset-auto z-0">
        {loadError && (
          <div className="absolute inset-0 flex items-center justify-center text-red-500 bg-red-50">
            Error cargando mapa.
          </div>
        )}
        {!isLoaded && !loadError && (
          <div className="absolute inset-0 flex flex-col gap-2 items-center justify-center bg-slate-100 text-slate-400">
            <MapPin className="w-8 h-8 animate-bounce" />
            <span className="text-sm font-medium">Cargando mapa...</span>
          </div>
        )}
        {isLoaded && (
          <GoogleMap
            mapContainerStyle={mapContainerStyle}
            zoom={13}
            center={defaultCenter}
            onLoad={(map) => {
              mapRef.current = map;
              fitMapToBounds();
            }}
            options={{
              disableDefaultUI: true,
              zoomControl: true,
              maxZoom: 14, // Limita el zoom máximo de forma nativa para evitar que fitBounds haga zoom extremo
              styles: mapStyles
            }}
          >
            {/* Ruta (Polyline) */}
            {directions && directions.routes[0]?.overview_path && (
              <Polyline
                path={directions.routes[0].overview_path}
                options={{
                  strokeColor: '#3b82f6',
                  strokeWeight: 6,
                  strokeOpacity: 0.8,
                }}
              />
            )}

            {/* Marcador Restaurante */}
            {restaurantLocation && (
              <OverlayView
                position={restaurantLocation}
                mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
              >
                <motion.div 
                  initial={{ scale: 0, y: 20 }}
                  animate={{ scale: 1, y: 0 }}
                  transition={{ type: "spring", stiffness: 300, damping: 20, delay: 0.2 }}
                  className="absolute -translate-x-1/2 -translate-y-full pb-1"
                >
                  <div className="relative">
                    <div className="w-12 h-12 bg-white rounded-full shadow-xl border-4 border-orange-500 overflow-hidden flex items-center justify-center relative z-10">
                      {restaurante?.logo_url ? (
                        <img src={restaurante.logo_url} className="w-full h-full object-cover" alt="Restaurante" />
                      ) : (
                        <Store className="w-6 h-6 text-orange-500" />
                      )}
                    </div>
                    {/* Flechita del pin */}
                    <div className="w-4 h-4 bg-orange-500 absolute -bottom-1.5 left-1/2 -translate-x-1/2 rotate-45 rounded-sm z-0"></div>
                  </div>
                </motion.div>
              </OverlayView>
            )}

            {/* Marcador Cliente */}
            {clientLocation && (
              <OverlayView
                position={clientLocation}
                mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
              >
                <motion.div 
                  initial={{ scale: 0, y: 20 }}
                  animate={{ scale: 1, y: 0 }}
                  transition={{ type: "spring", stiffness: 300, damping: 20, delay: 0.4 }}
                  className="absolute -translate-x-1/2 -translate-y-full pb-1"
                >
                  <div className="relative">
                    <div className="w-12 h-12 bg-emerald-500 rounded-full shadow-xl border-4 border-white flex items-center justify-center relative z-10">
                      <Home className="w-6 h-6 text-white" />
                    </div>
                    {/* Flechita del pin */}
                    <div className="w-4 h-4 bg-white absolute -bottom-1.5 left-1/2 -translate-x-1/2 rotate-45 rounded-sm z-0 shadow-sm"></div>
                  </div>
                </motion.div>
              </OverlayView>
            )}

            {/* Marcador Repartidor (Moto) */}
            {driverLocation && (
              <OverlayView
                position={driverLocation}
                mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
              >
                <motion.div 
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 400, damping: 25, delay: 0.6 }}
                  className="absolute -translate-x-1/2 -translate-y-1/2"
                >
                  <div className="relative">
                    <div className="w-14 h-14 bg-slate-800 rounded-full shadow-2xl border-4 border-white flex items-center justify-center z-10 relative">
                      <Bike className="w-7 h-7 text-white" />
                    </div>
                    {/* Efecto de pulso para la moto */}
                    <div className="absolute inset-0 bg-slate-800 rounded-full animate-ping opacity-20 z-0"></div>
                  </div>
                </motion.div>
              </OverlayView>
            )}
          </GoogleMap>
        )}
      </div>

      {/* Floating Status Pill (Mobile Only - visible when sheet is collapsed) */}
      <AnimatePresence>
        {!isExpanded && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="absolute top-4 left-4 right-4 md:hidden z-10 flex justify-center pointer-events-none"
          >
            <div className="bg-white px-5 py-2.5 rounded-full shadow-lg border border-slate-100 flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${pedido?.estado === 'cancelado' ? 'bg-red-500' : pedido?.estado === 'entregado' ? 'bg-emerald-500' : pedido?.estado === 'en_camino' ? 'bg-blue-500' : 'bg-orange-500 animate-pulse'}`} />
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
        className={`w-full bg-white shadow-[0_-15px_40px_rgba(0,0,0,0.12)] md:shadow-[-10px_0_30px_rgba(0,0,0,0.05)] z-20 flex flex-col absolute bottom-0 md:relative rounded-t-[32px] md:rounded-none h-[90vh] md:h-full md:w-1/3 transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] md:translate-y-0 ${isExpanded ? 'translate-y-0' : 'translate-y-[55vh]'}`}
      >
        
        {/* Mobile Drag Handle */}
        <div 
          className="w-full flex justify-center items-center pt-4 pb-3 md:hidden shrink-0 cursor-pointer active:bg-slate-50 transition-colors rounded-t-[32px] relative"
          onClick={() => setIsExpanded(!isExpanded)}
          onTouchStart={(e) => { touchStartY.current = e.touches[0].clientY; }}
          onTouchEnd={(e) => {
            const touchEndY = e.changedTouches[0].clientY;
            if (touchStartY.current - touchEndY > 30) setIsExpanded(true); // Deslizó arriba
            if (touchEndY - touchStartY.current > 30) setIsExpanded(false); // Deslizó abajo
          }}
        >
          <div className="w-12 h-1.5 bg-slate-200 rounded-full" />
          <div className="absolute right-6 bg-slate-50 p-1 rounded-full">
            {isExpanded ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronUp className="w-4 h-4 text-slate-400" />}
          </div>
        </div>

        {/* Content (Scrollable) */}
        <div className={`flex-1 p-5 md:p-6 custom-scrollbar ${isExpanded ? 'overflow-y-auto' : 'overflow-hidden md:overflow-y-auto'}`}>
          
          <div className="flex items-center justify-between mb-6 md:mt-2">
            <div className="flex items-center gap-4">
              <div className={`w-14 h-14 rounded-full flex items-center justify-center shrink-0 shadow-md ${
                pedido?.estado === 'en_camino' ? 'bg-blue-600 text-white shadow-blue-500/20' : 
                pedido?.estado === 'entregado' ? 'bg-emerald-500 text-white shadow-emerald-500/20' : 
                pedido?.estado === 'cancelado' ? 'bg-red-500 text-white shadow-red-500/20' :
                'bg-slate-100 border border-slate-200'
              }`}>
                {pedido?.estado === 'en_camino' ? (
                  <Navigation className="w-6 h-6" />
                ) : pedido?.estado === 'entregado' ? (
                  <MapPin className="w-6 h-6" />
                ) : pedido?.estado === 'cancelado' ? (
                  <Navigation className="w-6 h-6" />
                ) : restaurante?.logo_url ? (
                  <img src={restaurante.logo_url} className="w-full h-full object-cover rounded-full" />
                ) : (
                  <span className="text-xl font-black text-slate-400">{pedido?.restaurante?.[0]}</span>
                )}
              </div>
              <div>
                <h2 className="text-lg font-black text-slate-800 leading-tight line-clamp-1 uppercase">
                  {pedido?.estado === 'en_camino' ? 'TU ORDEN VA EN CAMINO' : 
                   pedido?.estado === 'entregado' ? 'PEDIDO ENTREGADO' : 
                   pedido?.estado === 'cancelado' ? 'PEDIDO CANCELADO' : pedido?.restaurante}
                </h2>
                <div className="flex items-center gap-2 mt-1">
                  <p className="text-[12px] font-bold text-slate-400">
                    {pedido?.estado === 'en_camino' ? 'Nos vemos pronto' : 
                     pedido?.estado === 'entregado' ? '¡Disfruta tu comida!' : 
                     pedido?.estado === 'cancelado' ? 'Este viaje terminó' : 'Está preparando tu pedido'}
                  </p>
                  
                  {pedido?.estado === 'en_camino' && eta && (
                    <span className="text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full flex items-center gap-1 text-[10px] font-bold border border-blue-100 shadow-sm">
                      <Clock className="w-3 h-3" />
                      Llega en {eta}
                    </span>
                  )}
                </div>
              </div>
            </div>
            
            {/* Lottie Animation next to header when preparing */}
            {pedido?.estado !== 'cancelado' && pedido?.estado !== 'en_camino' && pedido?.estado !== 'entregado' && (
              <div className="w-16 h-16 shrink-0 mr-1">
                <CookingAnimation />
              </div>
            )}
          </div>

          {/* Timeline Progress */}
          {pedido?.estado !== 'cancelado' && (
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
              <div className="flex justify-between mt-2 px-1">
                <span className={`text-[10px] font-bold ${currentStep >= 1 ? 'text-emerald-600' : 'text-slate-400'}`}>Recibido</span>
                <span className={`text-[10px] font-bold ${currentStep >= 2 ? 'text-emerald-600' : 'text-slate-400'}`}>Preparando</span>
                <span className={`text-[10px] font-bold ${currentStep >= 3 ? 'text-emerald-600' : 'text-slate-400'}`}>En camino</span>
                <span className={`text-[10px] font-bold ${currentStep >= 4 ? 'text-emerald-600' : 'text-slate-400'}`}>Entregado</span>
              </div>
            </div>
          )}

          {/* End Timeline Progress */}
          
          {/* Order Details Toggle */}
          <div className="mt-4 bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-sm">
            <button 
              onClick={() => setShowDetails(!showDetails)}
              className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors"
            >
              <span className="text-sm font-bold text-slate-700">Ver detalles del pedido</span>
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
                  <div className="pt-3 border-t border-slate-100 text-sm text-slate-600 whitespace-pre-wrap font-medium">
                    {pedido?.descripcion || 'No hay detalles disponibles.'}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          
          {repartidor && (
             <div className="mt-6 md:mt-8 bg-white border border-slate-100 rounded-2xl p-4 shadow-sm">
               <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Tu Repartidor</h4>
               <div className="flex items-center gap-3">
                 <div className="w-12 h-12 rounded-full bg-slate-100 overflow-hidden shrink-0 border border-slate-200">
                    <img src={`https://api.dicebear.com/7.x/initials/svg?seed=${repartidor.nombre}&backgroundColor=1e293b`} className="w-full h-full" />
                 </div>
                 <div>
                   <p className="font-black text-slate-800 leading-tight">{repartidor.nombre}</p>
                   <p className="text-[11px] font-bold text-slate-400 mt-0.5">ASIGNADO A TU ORDEN</p>
                 </div>
               </div>
             </div>
          )}

        </div>

        {/* Action Buttons (Fijo abajo) */}
        <div className="p-4 md:p-6 border-t border-slate-100 bg-white grid grid-cols-2 gap-3 shrink-0">
          <a 
            href={repartidor?.telefono ? `https://wa.me/52${repartidor.telefono}?text=Hola,%20soy%20el%20cliente%20del%20pedido%20${pedidoId?.split('-')[0]}` : '#'}
            target="_blank"
            rel="noopener noreferrer"
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
        </div>
      </motion.div>
    </motion.div>
  );
}
