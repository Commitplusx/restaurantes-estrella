import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Loader2, Phone, MessageCircle, Navigation, MapPin } from 'lucide-react';
import { useJsApiLoader, GoogleMap, Marker } from '@react-google-maps/api';

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

  // Load Google Maps
  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '',
  });

  useEffect(() => {
    if (!pedidoId) return;

    let isMounted = true;
    let orderChannel: any = null;
    let driverChannel: any = null;

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
        
      if (orderData && isMounted) {
        setPedido(orderData);
        
        // Fetch restaurante
        if (orderData.restaurante) {
          const { data: restData } = await supabase
            .from('restaurantes')
            .select('*')
            .ilike('nombre', orderData.restaurante)
            .single();
          if (isMounted) setRestaurante(restData);
        }

        // Fetch repartidor if assigned
        if (orderData.repartidor_id) {
          const { data: repData } = await supabase
            .from('repartidores')
            .select('*')
            .or(`id.eq.${orderData.repartidor_id},user_id.eq.${orderData.repartidor_id}`)
            .maybeSingle();
          if (isMounted) setRepartidor(repData);

          // Subscribirse a la ubicación en tiempo real del repartidor
          if (repData?.id) {
            driverChannel = supabase.channel(`driver-tracker-${repData.id}`)
              .on(
                'postgres_changes',
                { event: 'UPDATE', schema: 'public', table: 'repartidores', filter: `id=eq.${repData.id}` },
                (payload) => {
                  if (isMounted) {
                    setRepartidor((prev: any) => ({
                      ...prev,
                      lat: payload.new.lat,
                      lng: payload.new.lng
                    }));
                  }
                }
              ).subscribe();
          }
        }

        // Subscribirse al estado del pedido
        orderChannel = supabase.channel(`order-tracker-${orderData.id}`)
          .on(
            'postgres_changes',
            { event: 'UPDATE', schema: 'public', table: 'pedidos', filter: `id=eq.${orderData.id}` },
            (payload) => {
              if (isMounted) {
                setPedido((prev: any) => ({ ...prev, estado: payload.new.estado }));
                
                // Si el repartidor apenas se asignó en este update
                if (payload.new.repartidor_id && (!orderData.repartidor_id || orderData.repartidor_id !== payload.new.repartidor_id)) {
                  fetchRepartidor(payload.new.repartidor_id);
                }
              }
            }
          ).subscribe();
      }
      if (isMounted) setLoading(false);
    };

    const fetchRepartidor = async (repId: string) => {
       const { data: repData } = await supabase
         .from('repartidores')
         .select('*')
         .or(`id.eq.${repId},user_id.eq.${repId}`)
         .maybeSingle();
       if (isMounted && repData) {
         setRepartidor(repData);
       }
    };

    fetchInitialData();

    return () => {
      isMounted = false;
      if (orderChannel) supabase.removeChannel(orderChannel);
      if (driverChannel) supabase.removeChannel(driverChannel);
    };
  }, [pedidoId]);

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

  // Coordenadas base
  const defaultCenter = { lat: 16.2516, lng: -92.1332 }; // Comitán por defecto
  const restaurantLocation = restaurante?.lat && restaurante?.lng 
    ? { lat: Number(restaurante.lat), lng: Number(restaurante.lng) } 
    : defaultCenter;
  
  const driverLocation = repartidor?.lat && repartidor?.lng
    ? { lat: Number(repartidor.lat), lng: Number(repartidor.lng) }
    : null;

  // El mapa centra en el conductor si está en camino, sino en el restaurante
  const mapCenter = (pedido?.estado === 'en_camino' && driverLocation) ? driverLocation : restaurantLocation;

  return (
    <div className="h-[100dvh] w-full flex flex-col md:flex-row bg-slate-50 overflow-hidden font-sans relative">
      
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
            zoom={15}
            center={mapCenter}
            options={{
              disableDefaultUI: true,
              zoomControl: true,
              styles: [
                { featureType: "poi", elementType: "labels", stylers: [{ visibility: "off" }] }
              ]
            }}
          >
            {/* Marcador Restaurante */}
            <Marker 
              position={restaurantLocation}
              icon={{
                url: restaurante?.logo_url || 'https://cdn-icons-png.flaticon.com/512/3170/3170733.png',
                scaledSize: new window.google.maps.Size(40, 40)
              }}
            />

            {/* Marcador Repartidor (Moto) */}
            {driverLocation && (
              <Marker 
                position={driverLocation}
                icon={{
                  url: 'https://cdn-icons-png.flaticon.com/512/2983/2983804.png',
                  scaledSize: new window.google.maps.Size(48, 48)
                }}
                zIndex={100}
              />
            )}
          </GoogleMap>
        )}
      </div>

      {/* PANEL LATERAL (Bottom Sheet en móvil / Derecha en Desktop) */}
      <div className="w-full max-h-[55dvh] md:max-h-full md:h-full md:w-1/3 bg-white shadow-[0_-10px_40px_rgba(0,0,0,0.12)] md:shadow-[-10px_0_30px_rgba(0,0,0,0.05)] z-10 flex flex-col absolute bottom-0 md:relative rounded-t-[32px] md:rounded-none">
        
        {/* Mobile Drag Handle */}
        <div className="w-full flex justify-center pt-4 pb-2 md:hidden shrink-0">
          <div className="w-12 h-1.5 bg-slate-200 rounded-full" />
        </div>
        {/* Header (Fijo arriba) */}
        <div className="p-5 md:p-6 border-b border-slate-100 flex items-center justify-between shrink-0">
          <div>
            <h1 className="text-lg font-black text-slate-800 tracking-tight flex items-center gap-2">
              Estrella Eats
            </h1>
            <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest mt-0.5 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Seguimiento en vivo
            </p>
          </div>
          <span className="bg-slate-100 text-slate-600 px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider">
            {pedido?.estado?.replace('_', ' ') || 'Procesando'}
          </span>
        </div>

        {/* Content (Scrollable) */}
        <div className="flex-1 overflow-y-auto p-5 md:p-6 custom-scrollbar">
          
          <div className="flex items-center gap-4 mb-6">
            <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center overflow-hidden border border-slate-200 shrink-0 shadow-sm">
              {restaurante?.logo_url ? (
                <img src={restaurante.logo_url} className="w-full h-full object-cover" />
              ) : (
                <span className="text-xl font-black text-slate-400">{pedido?.restaurante?.[0]}</span>
              )}
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">PREPARANDO EN</p>
              <h2 className="text-lg font-black text-slate-800 leading-tight line-clamp-1">{pedido?.restaurante}</h2>
            </div>
          </div>

          <div className="bg-slate-50 p-6 md:p-8 rounded-[24px] border border-slate-100 flex flex-col items-center text-center shadow-sm">
            {pedido?.estado === 'cancelado' ? (
              <>
                <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-4">
                  <Navigation className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-black text-slate-800 mb-2">El viaje fue cancelado</h3>
                <p className="text-sm font-medium text-slate-500">Este pedido ya no está activo.</p>
              </>
            ) : pedido?.estado === 'en_camino' ? (
              <>
                <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mb-4 shadow-inner">
                  <Navigation className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-black text-slate-800 mb-2">Repartidor en camino</h3>
                <p className="text-sm font-medium text-slate-500">Prepárate para recibir tu orden en breve.</p>
              </>
            ) : pedido?.estado === 'entregado' ? (
              <>
                <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-4">
                  <MapPin className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-black text-slate-800 mb-2">Pedido entregado</h3>
                <p className="text-sm font-medium text-slate-500">¡Que disfrutes tu comida!</p>
              </>
            ) : (
              <>
                <div className="w-16 h-16 bg-orange-100 text-orange-500 rounded-full flex items-center justify-center mb-4 shadow-inner relative overflow-hidden">
                  <Loader2 className="w-8 h-8 animate-spin relative z-10" />
                </div>
                <h3 className="text-xl font-black text-slate-800 mb-2">Preparando pedido</h3>
                <p className="text-sm font-medium text-slate-500">El restaurante está cocinando.</p>
              </>
            )}
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
      </div>
    </div>
  );
}
