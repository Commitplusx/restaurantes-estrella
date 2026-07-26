import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useCartStore } from '../store/useCartStore';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ChevronLeft, Plus, Minus, X, CheckCircle2, AlertCircle, 
  Loader2, MapPin, LocateFixed, Star, ShieldCheck,
  ShoppingBag, ArrowRight, Gift, Utensils
} from 'lucide-react';
import { useLoadScript, GoogleMap } from '@react-google-maps/api';
import { useDeliveryCalculation } from '../hooks/useDeliveryCalculation';

// Interfaces
interface CartItem {
  id: string;
  cartItemId: string; 
  nombre: string;
  precio: number;
  tipo: 'item' | 'combo' | 'promo';
  opcionesSeleccionadas?: OpcionSeleccionada[];
  aplica_subsidio?: boolean;
  foto_url?: string;
}

interface OpcionSeleccionada {
  opcion_id: string;
  opcion: string;
  grupo_id: string;
  grupo: string;
  precio_extra: number;
}

interface Restaurante {
  id: string;
  nombre: string;
  lat: number;
  lng: number;
  activo: boolean;
  acepta_pago_online: boolean;
  maps_url: string;
  foto_fachada_url: string;
}

const LIBRARIES: ("places" | "geometry" | "drawing" | "visualization")[] = ["places"];

const PREMIUM_MAP_STYLE = [
  { "featureType": "all", "elementType": "geometry", "stylers": [{ "color": "#f5f5f5" }] },
  { "featureType": "poi.business", "stylers": [{ "visibility": "off" }] },
  { "featureType": "road", "elementType": "geometry", "stylers": [{ "color": "#ffffff" }] },
  { "featureType": "road.arterial", "elementType": "labels.icon", "stylers": [{ "visibility": "off" }] },
  { "featureType": "water", "elementType": "geometry", "stylers": [{ "color": "#c9c9c9" }] }
];

const LazyImage = ({ src, alt, className }: { src?: string | null, alt?: string, className?: string }) => {
  const [loaded, setLoaded] = useState(false);
  if (!src) return <div className={`w-full h-full bg-slate-50/80 flex items-center justify-center ${className || ''}`}><Utensils size={28} className="text-slate-300"/></div>;
  return (
    <div className={`relative overflow-hidden bg-slate-100 ${className || ''}`}>
      {!loaded && <div className="absolute inset-0 bg-slate-200 animate-pulse z-10" />}
      <img
        src={src}
        alt={alt || ''}
        loading="lazy"
        onLoad={() => setLoaded(true)}
        className={`relative z-20 w-full h-full object-cover transition-opacity duration-500 ${loaded ? 'opacity-100' : 'opacity-0'}`}
      />
    </div>
  )
}

// Helper para scroll suave garantizado en todos los móviles (iOS Safari a veces ignora behavior: 'smooth')
const smoothScroll = (element: HTMLElement | null, target: number, duration: number) => {
  if (!element) return;
  const start = element.scrollTop;
  const change = target - start;
  const startTime = performance.now();
  
  const easeInOutQuad = (t: number) => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
  
  const animateScroll = (currentTime: number) => {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    element.scrollTop = start + change * easeInOutQuad(progress);
    if (elapsed < duration) requestAnimationFrame(animateScroll);
  };
  requestAnimationFrame(animateScroll);
};

export default function CartPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { isLoaded: isGoogleMapsLoaded } = useLoadScript({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '',
    libraries: LIBRARIES
  });

  const [restaurante, setRestaurante] = useState<Restaurante | null>(null);
  const [loading, setLoading] = useState(true);
  
  const carrito = useCartStore(state => state.carrito as { item: CartItem, cantidad: number }[]);
  const _clearCart = useCartStore(state => state.clearCart);

  const checkoutStep = useCartStore(state => state.checkoutStep);
  const setCheckoutStep = useCartStore(state => state.setCheckoutStep);

  const clienteNombre = useCartStore(state => state.clienteNombre);
  const setClienteNombre = useCartStore(state => state.setClienteNombre);
  
  const clienteTel = useCartStore(state => state.clienteTel);
  const setClienteTel = useCartStore(state => state.setClienteTel);

  const tipoEntrega = useCartStore(state => state.tipoEntrega);
  const setTipoEntrega = useCartStore(state => state.setTipoEntrega);
  
  const direccionEntrega = useCartStore(state => state.direccionEntrega);
  const setDireccionEntrega = useCartStore(state => state.setDireccionEntrega);
  
  const cuponCliente = useCartStore(state => state.cuponCliente);
  const setCuponCliente = useCartStore(state => state.setCuponCliente);
  
  const descuento = useCartStore(state => state.descuento);
  const setDescuento = useCartStore(state => state.setDescuento);
  
  const cuponValido = useCartStore(state => state.cuponValido);
  const setCuponValido = useCartStore(state => state.setCuponValido);
  
  const metodoPago = useCartStore(state => state.metodoPago);
  const setMetodoPago = useCartStore(state => state.setMetodoPago);

  const [pinError, setPinError] = useState(false);
  const [telError, setTelError] = useState(false);
  const [datosCliente, setDatosCliente] = useState<any>(null);
  const [checkingLoyalty, setCheckingLoyalty] = useState(false);

  const [ubicacionGPS, setUbicacionGPS] = useState<{ lat: number; lng: number } | null>(() => {
    const saved = sessionStorage.getItem('est_ubicacion');
    return saved ? JSON.parse(saved) : null;
  });
  
  const [direccionReferencias, setDireccionReferencias] = useState(() => sessionStorage.getItem('est_referencias') || '');
  
  const [isMapModalOpen, setIsMapModalOpen] = useState(false);
  const [mapInstance, setMapInstance] = useState<google.maps.Map | null>(null);
  const [buscandoGPS, setBuscandoGPS] = useState(false);
  const [draftUbicacion, setDraftUbicacion] = useState<{lat: number, lng: number} | null>(null);
  const [draftDireccion, setDraftDireccion] = useState('');
  
  const [cuponPlataformaIdManual, setCuponPlataformaIdManual] = useState<string | null>(null);
  const [validandoCupon, setValidandoCupon] = useState(false);
  const [costoEnvioFijoOverride, setCostoEnvioFijoOverride] = useState<number | null>(null);

  const [montoEfectivo, setMontoEfectivo] = useState('');
  const [procesando, setProcesando] = useState(false);
  
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [verificandoOtp, setVerificandoOtp] = useState(false);
  
  const [toastMsg, setToastMsg] = useState<{ title: string; message: string; type: 'success'|'error'|'loading' } | null>(null);
  
  const submittingRef = useRef(false);
  const prevTotalRef = useRef(0);
  const [displayTotal, setDisplayTotal] = useState(0);
  const [confettiActive, setConfettiActive] = useState(false);
  const prevIsFreeDelivery = useRef(false);

  // VIP
  const [usarBeneficioNormal, setUsarBeneficioNormal] = useState(false);
  const [usarSaldoVip, setUsarSaldoVip] = useState(false);
  const [montoSaldoVip, setMontoSaldoVip] = useState('');
  const [pinVip, setPinVip] = useState('');
  const [pinSeguridad, setPinSeguridad] = useState('');
  const [verificandoPin, setVerificandoPin] = useState(false);
  const [pinAutorizado, setPinAutorizado] = useState(false);
  const [didInitLoyalty, setDidInitLoyalty] = useState(false);

  // Hooks de cálculo
  const { costoEnvioBase, fueraDeCobertura, calculandoEnvio } = useDeliveryCalculation(ubicacionGPS, tipoEntrega || 'tienda');

  const showToast = (title: string, message: string, type: 'success' | 'error' | 'loading' = 'success') => {
    setToastMsg({ title, message, type });
    if (type !== 'loading') {
      setTimeout(() => setToastMsg(null), 3000);
    }
  };

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const errorParam = searchParams.get('error');
    if (errorParam === 'pago_cancelado') {
      setTimeout(() => showToast('Pago Cancelado', 'No pudimos completar tu pago. Por favor intenta de nuevo.', 'error'), 500);
      searchParams.delete('error');
      const newUrl = window.location.pathname + (searchParams.toString() ? '?' + searchParams.toString() : '');
      window.history.replaceState({}, '', newUrl);
    } else if (errorParam === 'pago_pendiente') {
      setTimeout(() => showToast('Pago Pendiente', 'Tu pago está en revisión.', 'loading'), 500);
      searchParams.delete('error');
      const newUrl = window.location.pathname + (searchParams.toString() ? '?' + searchParams.toString() : '');
      window.history.replaceState({}, '', newUrl);
    }
    
    // Si el usuario tenía un paso guardado mayor a 3 (por la versión anterior), lo regresamos al 3
    if (checkoutStep > 3) {
      setCheckoutStep(3);
    }
  }, [checkoutStep, setCheckoutStep]);

  useEffect(() => {
    if (ubicacionGPS) sessionStorage.setItem('est_ubicacion', JSON.stringify(ubicacionGPS));
    else sessionStorage.removeItem('est_ubicacion');
  }, [ubicacionGPS]);

  useEffect(() => {
    sessionStorage.setItem('est_referencias', direccionReferencias);
  }, [direccionReferencias]);

  // Cargar info del restaurante
  useEffect(() => {
    const loadRestaurante = async () => {
      if (!id) return;
      
      const { data: sucursales } = await supabase.from('restaurantes').select('*');
      if (sucursales) {
        const found = sucursales.find(s => s.id === id || s.slug?.toLowerCase() === id.toLowerCase() || s.subdominio?.toLowerCase() === id.toLowerCase());
        if (found) {
          setRestaurante(found);
        }
      }
      setLoading(false);
    };
    loadRestaurante();
  }, [id]);

  // Checar Lealtad - con debounce 400ms, misma tabla/columnas que PublicMenuView
  useEffect(() => {
    const tel = clienteTel.replace(/\D/g, '');
    if (tel.length !== 10) {
      setDatosCliente(null);
      setUsarBeneficioNormal(false);
      setDidInitLoyalty(false);
      setCheckingLoyalty(false);
      return;
    }

    // Debounce: espera 400ms antes de hacer la query
    const debounceTimer = setTimeout(async () => {
      setCheckingLoyalty(true);
      setDidInitLoyalty(false);
      const startTime = Date.now();

      try {
        // Usar misma tabla y columnas que PublicMenuView.tsx (checkLoyaltyPoints)
        const { data, error } = await supabase
          .from('clientes')
          .select('puntos, rango, es_vip, saldo_billetera, envios_gratis_disponibles, nombre')
          .eq('telefono', tel)
          .single();

        if (!error && data) {
          const clienteNormalizado = {
            es_vip: data.es_vip || data.rango === 'vip',
            saldo: data.saldo_billetera || 0,
            puntos: data.puntos || 0,
            envios_gratis: data.envios_gratis_disponibles || 0,
            nombre: data.nombre || ''
          };
          setDatosCliente(clienteNormalizado);
          if ((clienteNormalizado.envios_gratis > 0 || clienteNormalizado.puntos >= 6) && checkoutStep <= 3) {
            setUsarBeneficioNormal(true);
          }
        } else {
          setDatosCliente(null);
          setUsarBeneficioNormal(false);
        }
      } catch (e) {
        setDatosCliente(null);
        setUsarBeneficioNormal(false);
      }

      // Mínimo 2 segundos de animación de verificando
      const elapsed = Date.now() - startTime;
      if (elapsed < 2000) {
        await new Promise(resolve => setTimeout(resolve, 2000 - elapsed));
      }
      setCheckingLoyalty(false);
      setDidInitLoyalty(true);
    }, 400);

    return () => clearTimeout(debounceTimer);
  }, [clienteTel]);

  const _addToCart = useCartStore(state => state.addToCart);
  const addToCart = (product: CartItem) => _addToCart(product);

  const _removeFromCart = useCartStore(state => state.removeFromCart);
  const removeFromCart = (cartItemId: string) => _removeFromCart(cartItemId);

  const obtenerUbicacionPorIP = async () => {
    const googleKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

    if (googleKey) {
      try {
        const res = await fetch(
          `https://www.googleapis.com/geolocation/v1/geolocate?key=${googleKey}`,
          { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}', signal: AbortSignal.timeout(6000) }
        );
        const data = await res.json();
        if (data.location?.lat && data.location?.lng) {
          let ciudad = 'Tu ubicación aproximada';
          try {
            const geoRes = await fetch(
              `https://maps.googleapis.com/maps/api/geocode/json?latlng=${data.location.lat},${data.location.lng}&key=${googleKey}&language=es`,
              { signal: AbortSignal.timeout(5000) }
            );
            const geoData = await geoRes.json();
            if (geoData.results?.[0]?.formatted_address) {
              ciudad = geoData.results[0].formatted_address;
            }
          } catch (_) { /* usar ciudad genérica */ }
          return { lat: data.location.lat, lng: data.location.lng, ciudad };
        }
      } catch (_) { /* continuar con el siguiente */ }
    }

    try {
      const res = await fetch('https://freeipapi.com/api/json', { signal: AbortSignal.timeout(5000) });
      const data = await res.json();
      if (data.latitude && data.longitude) {
        return { lat: data.latitude, lng: data.longitude, ciudad: `${data.cityName}, ${data.regionName}` };
      }
    } catch (_) { /* ignorar */ }

    return null;
  };

  const obtenerUbicacionGPS = () => {
    const TIMEOUT_GPS_MS = 8000;

    if (!('geolocation' in navigator)) {
      showToast('GPS no disponible', 'Escribe tu dirección manualmente en el campo de abajo 👇', 'error');
      return;
    }

    setBuscandoGPS(true);
    let yaResuelto = false;

    const timeoutId = setTimeout(async () => {
      if (yaResuelto) return;
      yaResuelto = true;
      const ipLoc = await obtenerUbicacionPorIP();
      if (ipLoc) {
        setDraftUbicacion({ lat: ipLoc.lat, lng: ipLoc.lng });
        setDraftDireccion(ipLoc.ciudad);
        
        if (!isMapModalOpen) {
           setUbicacionGPS({ lat: ipLoc.lat, lng: ipLoc.lng });
           setDireccionEntrega(ipLoc.ciudad);
        }
        
        if (mapInstance) {
          mapInstance.panTo({ lat: ipLoc.lat, lng: ipLoc.lng });
          mapInstance.setZoom(16);
        }
        showToast('Ubicación aproximada', `Detectamos que estás en ${ipLoc.ciudad}. Ajusta el pin si es necesario.`, 'success');
      } else {
        showToast(
          'No pudimos detectar tu ubicación',
          'Escribe tu dirección manualmente o arrastra el pin en el mapa 📍',
          'error'
        );
      }
      setBuscandoGPS(false);
    }, TIMEOUT_GPS_MS);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        if (yaResuelto) return;
        yaResuelto = true;
        clearTimeout(timeoutId);

        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        setDraftUbicacion({ lat, lng });
        
        if (mapInstance) {
          mapInstance.panTo({ lat, lng });
          mapInstance.setZoom(17);
        }

        if (window.google) {
          const geocoder = new window.google.maps.Geocoder();
          geocoder.geocode({ location: { lat, lng } }, (results, status) => {
            setBuscandoGPS(false);
            if (status === 'OK' && results && results[0]) {
              setDraftDireccion(results[0].formatted_address);
              if (!isMapModalOpen) {
                setUbicacionGPS({ lat, lng });
                setDireccionEntrega(results[0].formatted_address);
              }
            } else {
              setDraftDireccion(`Coordenadas: ${lat.toFixed(5)}, ${lng.toFixed(5)}`);
            }
          });
        } else {
          setBuscandoGPS(false);
        }
      },
      async (error) => {
        if (yaResuelto) return;
        yaResuelto = true;
        clearTimeout(timeoutId);

        const ipLoc = await obtenerUbicacionPorIP();
        if (ipLoc) {
          setDraftUbicacion({ lat: ipLoc.lat, lng: ipLoc.lng });
          setDraftDireccion(ipLoc.ciudad);
          
          if (!isMapModalOpen) {
            setUbicacionGPS({ lat: ipLoc.lat, lng: ipLoc.lng });
            setDireccionEntrega(ipLoc.ciudad);
          }

          if (mapInstance) {
            mapInstance.panTo({ lat: ipLoc.lat, lng: ipLoc.lng });
            mapInstance.setZoom(16);
          }
          const tituloToast = error.code === 1 ? 'Tu navegador bloqueó el GPS' : 'Ubicación aproximada por red';
          const msjToast = error.code === 1 
            ? `Por favor dale permisos o ajusta el pin manualmente. Te ubicamos en ${ipLoc.ciudad} por ahora.`
            : `No pudimos usar tu GPS. Te ubicamos en ${ipLoc.ciudad}. Ajusta el pin si es necesario.`;

          showToast(tituloToast, msjToast, error.code === 1 ? 'error' : 'success');
        } else {
          const mensajeError = error.code === 1
            ? 'Bloqueaste el GPS. Escribe tu dirección en el campo de abajo 👇'
            : error.code === 2
            ? 'GPS no disponible. Escribe tu dirección manualmente 👇'
            : 'GPS tardó demasiado. Escribe tu dirección manualmente 👇';
          showToast('No pudimos obtener tu ubicación', mensajeError, 'error');
        }
        setBuscandoGPS(false);
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
    );
  };

  const handleMapDragEnd = () => {
    if (mapInstance) {
      const center = mapInstance.getCenter();
      if (center) {
        const lat = center.lat();
        const lng = center.lng();
        setDraftUbicacion({ lat, lng });
        
        const geocoder = new window.google.maps.Geocoder();
        geocoder.geocode({ location: { lat, lng } }, (results, status) => {
          if (status === 'OK' && results && results.length > 0 && results[0]) {
            let route = '';
            let streetNumber = '';
            let neighborhood = '';

            // Buscar en todos los componentes para priorizar calle, número y colonia
            results[0].address_components.forEach((comp: any) => {
              if (comp.types.includes('route')) route = comp.short_name;
              if (comp.types.includes('street_number')) streetNumber = comp.long_name;
              if (comp.types.includes('sublocality') || comp.types.includes('neighborhood')) neighborhood = comp.long_name;
            });

            let customAddress = route ? `${route} ${streetNumber}`.trim() : '';
            if (neighborhood) customAddress = customAddress ? `${customAddress}, ${neighborhood}` : neighborhood;
            
            // Si por alguna razón Google no trae calle/colonia, usamos un trozo del formateado
            if (!customAddress) {
               const parts = results[0].formatted_address.split(',');
               customAddress = parts.length > 1 ? `${parts[0].trim()}, ${parts[1].trim()}` : results[0].formatted_address;
            }

            setDraftDireccion(customAddress);
          } else {
            setDraftDireccion(`Coordenadas: ${lat.toFixed(5)}, ${lng.toFixed(5)}`);
          }
        });
      }
    }
  };

  const handleConfirmarUbicacion = () => {
    if (draftUbicacion) {
      setUbicacionGPS(draftUbicacion);
      setDireccionEntrega(draftDireccion);
      setIsMapModalOpen(false);
    }
  };

  const validarCuponBtn = async () => {
    if (!cuponCliente.trim()) return;
    setValidandoCupon(true);
    setCuponValido(false);
    setDescuento(0);
    setCostoEnvioFijoOverride(null);
    setCuponPlataformaIdManual(null);

    const cp = cuponCliente.trim().toUpperCase();

    try {
      // Intentar primero con el RPC global/público (ideal para no batallar con RLS)
      const { data, error } = await supabase.rpc('validar_cupon_publico', { p_codigo: cp });

      if (!error && data?.ok) {
        if (data.tipo === 'envio_fijo') {
          setCostoEnvioFijoOverride(data.monto);
          setDescuento(0);
          showToast('Cupón Aplicado', `¡Envío a $${data.monto.toFixed(2)}!`, 'success');
        } else {
          showToast('Cupón Aplicado', `¡Se descontarán $${data.monto.toFixed(2)} de tu orden!`, 'success');
          setDescuento(data.monto);
          setCostoEnvioFijoOverride(null);
        }
        setCuponValido(true);
        return;
      }

      // Fallback: Si tenemos el restaurante, buscar en sus cupones propios
      if (restaurante?.id) {
        const { data: cuponPropio } = await supabase
          .from('cupones_restaurante')
          .select('*')
          .eq('restaurante_id', restaurante.id)
          .eq('codigo', cp)
          .eq('activo', true)
          .maybeSingle();

        if (cuponPropio) {
          if (cuponPropio.fecha_fin && new Date(cuponPropio.fecha_fin) < new Date()) {
            showToast('Cupón expirado', 'Este cupón ya no está disponible', 'error');
            return;
          }
          if (cuponPropio.uso_maximo && cuponPropio.usos_actuales >= cuponPropio.uso_maximo) {
            showToast('Cupón agotado', 'Este cupón ya alcanzó su límite de usos', 'error');
            return;
          }
          const subtotalActual = carrito.reduce((sum, p) => sum + (p.item.precio * p.cantidad), 0);
          if (cuponPropio.tipo === 'envio_fijo') {
            setCostoEnvioFijoOverride(cuponPropio.valor);
            setDescuento(0);
            showToast('¡Cupón Aplicado!', `Envío a $${cuponPropio.valor.toFixed(2)}`, 'success');
          } else {
            const descuentoCalculado = cuponPropio.tipo === 'porcentaje'
              ? subtotalActual * (cuponPropio.valor / 100)
              : cuponPropio.valor;
            const descuentoFinal = Math.min(descuentoCalculado, subtotalActual);
            setDescuento(descuentoFinal);
            setCostoEnvioFijoOverride(null);
            showToast('¡Cupón Aplicado!', `Descuento de $${descuentoFinal.toFixed(2)} aplicado`, 'success');
          }
          setCuponValido(true);
          return;
        }
      }

      // Buscar en cupones de plataforma como último recurso
      const { data: cuponPlat } = await supabase
        .from('cupones_plataforma')
        .select('*')
        .eq('codigo', cp)
        .eq('activo', true)
        .maybeSingle();
        
      if (cuponPlat) {
        if (cuponPlat.fecha_fin && new Date(`${cuponPlat.fecha_fin}T23:59:59`) < new Date()) {
          showToast('Cupón expirado', 'Este cupón global ya no está disponible', 'error');
          return;
        }
        if (cuponPlat.uso_maximo && cuponPlat.usos_actuales >= cuponPlat.uso_maximo) {
          showToast('Cupón agotado', 'Este cupón global ya alcanzó su límite de usos', 'error');
          return;
        }
        
        const subtotalActual = carrito.reduce((sum, p) => sum + (p.item.precio * p.cantidad), 0);
        let descuentoFinal = 0;
        
        if (cuponPlat.tipo === 'porcentaje') {
          descuentoFinal = subtotalActual * (cuponPlat.valor / 100);
          setCostoEnvioFijoOverride(null);
        } else if (cuponPlat.tipo === 'monto_fijo') {
          descuentoFinal = cuponPlat.valor;
          setCostoEnvioFijoOverride(null);
        } else if (cuponPlat.tipo === 'envio_fijo') {
          setCostoEnvioFijoOverride(cuponPlat.valor);
          descuentoFinal = 0;
        }
        
        setCuponValido(true);
        setDescuento(descuentoFinal);
        setCuponPlataformaIdManual(cuponPlat.id);
        showToast('¡Cupón de Plataforma Aplicado!', 'Descuento aplicado correctamente', 'success');
        return;
      }

      // Si nada funciona
      showToast('Cupón Inválido', 'El código ingresado no existe o expiró.', 'error');
    } catch(e) {
      showToast('Error', 'Hubo un error al validar el cupón.', 'error');
    } finally {
      setValidandoCupon(false);
    }
  };

  const handlePinVerify = async () => {
    setVerificandoPin(true);
    try {
      const edgeUrl = import.meta.env.VITE_SUPABASE_URL + '/functions/v1/auth-otp';
      const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      
      const res = await fetch(edgeUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${anonKey}` },
        body: JSON.stringify({ action: 'verify-vip-pin', telefono: clienteTel.replace(/\D/g, ''), pin: pinVip })
      });
      
      if (!res.ok) throw new Error('PIN Incorrecto');
      setPinAutorizado(true);
      setPinSeguridad(pinVip);
      setPinError(false);
    } catch (err) {
      setPinAutorizado(false);
      setPinError(true);
    } finally {
      setVerificandoPin(false);
    }
  };

  // CALCULOS DE SUBTOTAL Y ENVIO
  const subtotal = carrito.reduce((sum, p) => sum + (p.item.precio * p.cantidad), 0);
  const itemsSubsidio = carrito.filter(p => p.item.aplica_subsidio !== false && String(p.item.aplica_subsidio).toLowerCase() !== 'false');
  const cantidadSubsidio = itemsSubsidio.reduce((sum, p) => sum + p.cantidad, 0);
  const bolsaSubsidio = cantidadSubsidio * 8;
  
  // Solo aplicar el beneficio de envío gratis si ya establecieron su ubicación (para no arruinar la sorpresa en el resumen)
  const isFreeDelivery = usarBeneficioNormal && datosCliente && !datosCliente.es_vip && ubicacionGPS !== null && tipoEntrega === 'domicilio';
  
  const tarifaBaseEnvio = datosCliente?.es_vip ? (datosCliente.puntos < 26 ? 10 : 7) : costoEnvioBase;
  const costoEnvioCalculado = tarifaBaseEnvio > 0 ? Math.max(0, tarifaBaseEnvio - bolsaSubsidio) : 0;
  const costoEnvio = isFreeDelivery ? 0 : costoEnvioCalculado;
  const descuentoVip = (usarSaldoVip && datosCliente?.es_vip && pinAutorizado) ? Math.max(0, parseFloat(montoSaldoVip || '0')) : 0;

  // Cupon manual aplicado
  let descuentoTotal = cuponValido && descuento > 0 ? descuento : 0;
  // Bug fix: Solo aplicar el override si es menor al costo calculado real (para que el cupón de envío no suba el precio)
  let costoEnvioFinal = (cuponValido && costoEnvioFijoOverride !== null && costoEnvioFijoOverride < costoEnvio) 
    ? costoEnvioFijoOverride 
    : costoEnvio;

  const descuentoAplicable = (subtotal + costoEnvioFinal) > 0 ? Math.min(descuentoTotal + descuentoVip, subtotal + costoEnvioFinal) : 0;
  const rawTotal = Math.max(0, subtotal + costoEnvioFinal - descuentoAplicable);
  const total = Math.round(rawTotal * 100) / 100;

  const getSmartDenominations = (totalAmount: number) => {
    const exact = Math.ceil(totalAmount);
    let options = [exact];
    const next50 = Math.ceil(totalAmount / 50) * 50;
    if (next50 > exact) options.push(next50);
    const next100 = Math.ceil(totalAmount / 100) * 100;
    if (next100 > exact && !options.includes(next100)) options.push(next100);
    for (let bill of [200, 500, 1000]) {
      if (bill > totalAmount && !options.includes(bill) && options.length < 3) {
        options.push(bill);
      }
    }
    while (options.length < 3) {
       options.push(options[options.length - 1] + 100);
    }
    return options.slice(0, 3);
  };
  const smartDenominations = getSmartDenominations(total);

  // Ahorro total (para mostrar en la UI premium)
  const ahorroTotal = descuentoAplicable + (isFreeDelivery || (cuponValido && costoEnvioFijoOverride !== null) ? Math.max(0, costoEnvioBase - costoEnvioFinal) : 0);

  // Animar el total cuando cambia
  useEffect(() => {
    const from = prevTotalRef.current;
    const to = total;
    if (from === to) return;
    
    const duration = 400;
    const start = Date.now();
    const tick = () => {
      const elapsed = Date.now() - start;
      const progress = Math.min(elapsed / duration, 1);
      // easeOut cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayTotal(from + (to - from) * eased);
      if (progress < 1) requestAnimationFrame(tick);
      else { setDisplayTotal(to); prevTotalRef.current = to; }
    };
    requestAnimationFrame(tick);
  }, [total]);

  // Confetti cuando se desbloquea envío gratis
  useEffect(() => {
    if (isFreeDelivery && !prevIsFreeDelivery.current) {
      setConfettiActive(true);
      setTimeout(() => setConfettiActive(false), 3000);
    }
    prevIsFreeDelivery.current = isFreeDelivery;
  }, [isFreeDelivery]);

  const generarPayloadPedido = () => {
    const pedidoDetalles = carrito.map(p => {
      const tag = p.item.tipo === 'combo' ? '[COMBO] ' : p.item.tipo === 'promo' ? '[PROMO] ' : '';
      let optionsStr = '';
      if (p.item.opcionesSeleccionadas && p.item.opcionesSeleccionadas.length > 0) {
        optionsStr = '\n  └ ' + p.item.opcionesSeleccionadas.map(o => `+ ${o.opcion}`).join(', ');
      }
      return `${p.cantidad}x ${tag}${p.item.nombre} ($${(p.item.precio * p.cantidad).toFixed(2)})${optionsStr}`;
    }).join('\n');

    const detallesEntregaStr = tipoEntrega === 'domicilio' 
      ? `\n\n🛵 *Tipo de entrega:* A domicilio` + 
        `\n📍 *Dirección:* ${direccionEntrega}` + 
        (direccionReferencias.trim() ? `\n📝 *Referencias:* ${direccionReferencias}` : '') +
        (costoEnvioFinal > 0 ? `\n🚚 *Costo Envío:* $${costoEnvioFinal}` : '')
      : `\n\n🏪 *Tipo de entrega:* Recoger en tienda`;
      
    const montoPagaCon = metodoPago === 'efectivo' && montoEfectivo ? ` (Paga con: $${montoEfectivo})` : '';
    const notasPagoStr = `\n\n💳 *Método de Pago:* ${metodoPago === 'efectivo' ? `Efectivo al recibir${montoPagaCon}` : 'Pago en línea'}` +
                         (descuentoTotal > 0 ? `\n🏷️ *Descuento Aplicado:* -${descuentoTotal.toFixed(2)}` : '');
                         
    const pedidoCompleto = pedidoDetalles + detallesEntregaStr + notasPagoStr;
    
    return {
      cliente_tel: clienteTel.replace(/\D/g, ''),
      cliente_nombre: clienteNombre.trim(),
      restaurante: restaurante?.nombre || '',
      restaurante_id: restaurante?.id || null,
      descripcion: pedidoCompleto,
      direccion: tipoEntrega === 'domicilio' ? direccionEntrega : null,
      referencias_entrega: tipoEntrega === 'domicilio' && direccionReferencias.trim() ? direccionReferencias.trim() : null,
      lat: tipoEntrega === 'domicilio' && ubicacionGPS ? ubicacionGPS.lat : null,
      lng: tipoEntrega === 'domicilio' && ubicacionGPS ? ubicacionGPS.lng : null,
      estado: metodoPago === 'en_linea' ? 'pendiente_pago' : 'pendiente',
      estado_cocina: 'pendiente',
      metodo_pago: metodoPago,
      total: total,
      precio_entrega: costoEnvioCalculado, // El pago real que recibirá el repartidor (incluso si costoEnvioFinal es 0 para el cliente)
      tipo_pedido: tipoEntrega === 'domicilio' ? 'domicilio' : 'tienda',
      pin_seguridad: pinSeguridad,
      pickup_pin: Math.floor(1000 + Math.random() * 9000).toString(), // Generamos un PIN anti-robo de 4 dígitos
      wb_message_id: Math.random().toString(36).substring(2, 8).toUpperCase(),
      idempotency_key: crypto.randomUUID(),
      cupon_plataforma_id: cuponPlataformaIdManual || null,
      descuento_plataforma: descuentoTotal + (costoEnvioCalculado - costoEnvioFinal), // Registramos que hubo un descuento en el envío si aplica
      cupon_cliente: cuponCliente || null,
      usar_saldo_vip: usarSaldoVip,
      monto_saldo_vip: usarSaldoVip && montoSaldoVip ? Number(montoSaldoVip) : 0,
      pin_vip: pinVip || null,
      usar_beneficio_fidelidad: usarBeneficioNormal
    };
  };

  const handlePedir = async () => {
    if (!restaurante || carrito.length === 0) return;
    
    setProcesando(true);
    // SOFT-CHECK: Consultar la base de datos justo antes de pagar
    const { data: restData } = await supabase.from('restaurantes').select('activo, hora_apertura, hora_cierre, horarios').eq('id', restaurante.id).single();
    
    if (restData) {
      // Re-evaluar lógica de horarios o simplemente `activo`. Si el dashboard lo apaga, activo = false.
      if (!restData.activo) {
        showToast('Restaurante Cerrado', 'Lo sentimos, el restaurante acaba de pausar sus pedidos.', 'error');
        setProcesando(false);
        return;
      }
    }
    setProcesando(false);

    const isReturningCustomer = !!datosCliente;
    if (!isReturningCustomer && metodoPago === 'efectivo') {
      try {
        setProcesando(true);
        const edgeUrl = import.meta.env.VITE_SUPABASE_URL + '/functions/v1/auth-otp';
        const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
        const res = await fetch(edgeUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${anonKey}` },
          body: JSON.stringify({ action: 'request-client-otp', telefono: clienteTel.replace(/\D/g, '') })
        });
        if (!res.ok) throw new Error('No se pudo enviar el OTP');
        setShowOtpModal(true);
        setProcesando(false);
      } catch (err) {
        showToast('Error', 'No pudimos enviarte el código a WhatsApp. Intenta de nuevo o paga en línea.', 'error');
        setProcesando(false);
      }
      return;
    }
    
    await procesarOrden();
  };

  const procesarOrden = async () => {
    if (submittingRef.current) return;
    submittingRef.current = true;
    setProcesando(true);
    
    const payload = generarPayloadPedido();
    let pedidoCreadoId = '';
    
    try {
      const edgeUrl = import.meta.env.VITE_SUPABASE_URL + '/functions/v1/auth-otp';
      const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      const res = await fetch(edgeUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${anonKey}` },
        body: JSON.stringify({ 
          action: 'direct-order', 
          payload, 
          carrito 
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al crear pedido');
      pedidoCreadoId = data.pedido?.wb_message_id || 'desconocido';
    } catch (err: any) {    
      console.error('Error insertando en supabase:', err);
      if (err.details) console.error('Detalles:', err.details);
      
      alert(`Hubo un problema registrando el pedido: ${err.message}. Intenta nuevamente.`);
      submittingRef.current = false;
      setProcesando(false);
      return;
    }

    if (metodoPago === 'en_linea') {
      try {
        const edgeUrl = import.meta.env.VITE_SUPABASE_URL + '/functions/v1/mercadopago-checkout';
        const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
        
        const res = await fetch(edgeUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${anonKey}` },
          body: JSON.stringify({
            pedidoId: pedidoCreadoId,
            items: carrito,
            costo_envio: costoEnvioFinal,
            descuento: descuentoTotal,
            total: total,
            originUrl: window.location.origin,
            returnUrl: window.location.href
          })
        });
        
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Error Mercado Pago');
        
        if (data.url) {
          window.location.href = data.url;
          return;
        }
      } catch (err: any) {
        showToast('Error', err.message || 'No se pudo generar el pago', 'error');
        submittingRef.current = false;
        setProcesando(false);
        return;
      }
    } else {
      _clearCart();
      sessionStorage.clear();
      navigate(`/success?pedido=${pedidoCreadoId}&success=true`);
    }
  };

  const handleVerifyOtp = async () => {
    if (otpCode.length < 4) return;
    setVerificandoOtp(true);
    try {
      const payload = generarPayloadPedido();
      const edgeUrl = import.meta.env.VITE_SUPABASE_URL + '/functions/v1/auth-otp';
      const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      
      const res = await fetch(edgeUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${anonKey}` },
        body: JSON.stringify({ action: 'verify-and-order', telefono: clienteTel.replace(/\D/g, ''), codigo: otpCode, payload, carrito })
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Código incorrecto');
      
      setShowOtpModal(false);
      _clearCart();
      sessionStorage.clear();
      const wbMsgId = data.pedido?.wb_message_id || 'desconocido';
      navigate(`/success?pedido=${wbMsgId}&success=true`);
      
    } catch (err: any) {
      showToast('Código Incorrecto', err.message, 'error');
    } finally {
      setVerificandoOtp(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100">
      <Loader2 size={48} className="animate-spin text-[#FA4A0C]" />
    </div>
  );

  // === ESTADO VACÍO PREMIUM ===
  if (carrito.length === 0) {
    return (
      <div className="min-h-screen bg-slate-100 flex flex-col font-sans text-slate-900">
        <header className="bg-slate-100 px-4 pt-4 pb-3 flex items-center sticky top-0 z-50">
          <button onClick={() => navigate(`/menu/${id}`)} className="p-2 bg-white rounded-full mr-3 shadow-sm hover:bg-slate-50 transition-colors">
            <ChevronLeft size={20} className="text-slate-700" />
          </button>
          <h1 className="text-lg font-black text-slate-800">Carrito de Compras</h1>
        </header>
        
        <main className="flex-1 flex flex-col items-center justify-center p-6 text-center max-w-md mx-auto">
          <motion.div 
            initial={{ scale: 0.8, opacity: 0, y: 20 }} 
            animate={{ scale: 1, opacity: 1, y: 0 }} 
            transition={{ type: "spring", duration: 0.6 }}
            className="w-48 h-48 bg-gradient-to-br from-orange-50 to-red-50 rounded-full flex items-center justify-center mb-8 shadow-inner relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-white/40 backdrop-blur-3xl rounded-full"></div>
            <ShoppingBag size={80} className="text-orange-400 relative z-10" strokeWidth={1.5} />
            <motion.div 
               animate={{ y: [0, -10, 0] }} 
               transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
               className="absolute top-10 right-10 z-20 text-3xl"
            >
               💨
            </motion.div>
          </motion.div>
          
          <motion.h2 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-2xl font-black text-slate-800 mb-3"
          >
            Tu carrito está vacío
          </motion.h2>
          
          <motion.p 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-slate-500 mb-10 leading-relaxed text-sm px-4"
          >
            Aún no has agregado ningún antojo de <span className="font-bold text-slate-700">{restaurante?.nombre || 'este restaurante'}</span>. ¡Explora el menú y date un gusto!
          </motion.p>
          
          <motion.button 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => navigate(`/menu/${id}`)}
            className="w-full bg-[#1D4ED8] text-white py-4 rounded-2xl font-black text-lg shadow-xl shadow-blue-700/25 flex items-center justify-center gap-2 group"
          >
            Ver el Menú 
            <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
          </motion.button>
        </main>
      </div>
    );
  }

  // Textos inteligentes por paso
  const getBotonText = () => {
    if (checkoutStep === 1) return 'Confirmar Resumen';
    if (checkoutStep === 2) {
      if (checkingLoyalty) return 'Verificando...';
      if (!clienteNombre.trim() || clienteTel.replace(/\D/g, '').length !== 10) return 'Faltan tus datos';
      if (!tipoEntrega) return 'Elige cómo recibirlo';
      if (tipoEntrega === 'domicilio' && (!ubicacionGPS || fueraDeCobertura)) return 'Confirma tu ubicación';
      return 'Continuar a Entrega y Pago';
    }
    if (checkoutStep === 3) {
      if (!metodoPago) return 'Selecciona cómo pagar';
      if (metodoPago === 'efectivo' && (!montoEfectivo || parseFloat(montoEfectivo) < total)) return 'Indica con cuánto pagas';
      return procesando ? 'Procesando...' : '¡Confirmar y Pedir!';
    }
    return 'Confirmar Pedido';
  };

  const isStepValid = () => {
    if (checkoutStep === 1) return true;
    if (checkoutStep === 2) {
      const datosValidos = clienteTel.replace(/\D/g, '').length === 10 && clienteNombre.trim().length > 0;
      const entregaValida = tipoEntrega === 'tienda' || (tipoEntrega === 'domicilio' && ubicacionGPS && !fueraDeCobertura && !calculandoEnvio);
      return datosValidos && entregaValida;
    }
    if (checkoutStep === 3) {
      const pagoValido = metodoPago !== null && (metodoPago !== 'efectivo' || parseFloat(montoEfectivo || '0') >= total);
      return pagoValido;
    }
    return false;
  };

  return (
    <div className="fixed inset-0 bg-slate-100 flex flex-col font-sans text-slate-900 overflow-hidden">
      {/* HEADER NATIVO */}
      <header className="bg-slate-100 px-5 pt-4 pb-3 sticky top-0 z-50 flex items-center gap-4">
        <button 
          onClick={() => {
            if (checkoutStep > 1) {
              setCheckoutStep(checkoutStep - 1);
              smoothScroll(document.getElementById('cart-scroll-container'), 0, 400);
            } else {
              navigate(`/menu/${id}`);
            }
          }} 
          className="w-10 h-10 bg-white rounded-2xl flex items-center justify-center hover:bg-slate-50 shadow-sm transition-colors shrink-0"
        >
          <ChevronLeft size={20} className="text-slate-800" strokeWidth={3} />
        </button>
        
        <div className="flex-1">
          {checkoutStep === 1 && (
            <>
              <h1 className="font-black text-xl text-slate-800 leading-tight">Tu Carrito</h1>
              <p className="text-[12px] text-slate-500 font-medium">{carrito.length} {carrito.length === 1 ? 'artículo' : 'artículos'}</p>
            </>
          )}
          {checkoutStep === 2 && (
            <>
              <h1 className="font-black text-xl text-slate-800 leading-tight">Entrega</h1>
              <p className="text-[12px] text-slate-500 font-medium">¿Dónde te lo llevamos?</p>
            </>
          )}
          {checkoutStep === 3 && (
            <>
              <h1 className="font-black text-xl text-slate-800 leading-tight">Pago</h1>
              <p className="text-[12px] text-slate-500 font-medium">Casi listo para comer</p>
            </>
          )}
        </div>
        
        <div className="w-10 shrink-0"></div>
      </header>

      {/* BARRA DE PROGRESO */}
      <div className="w-full h-[3px] bg-slate-200 sticky top-[68px] z-50">
        <motion.div
          className="h-full bg-[#1D4ED8] rounded-full"
          initial={false}
          animate={{ width: checkoutStep === 1 ? '33%' : checkoutStep === 2 ? '66%' : '100%' }}
          transition={{ type: 'spring', stiffness: 200, damping: 30 }}
        />
      </div>

      <main id="cart-scroll-container" className="flex-1 overflow-y-auto p-4 w-full relative scroll-smooth">
        <div className="max-w-lg md:max-w-2xl mx-auto pb-32">
          <AnimatePresence mode="wait">
          
          {/* ══════════════════════════════════════
              PASO 1 — Tu Carrito
          ══════════════════════════════════════ */}
          {checkoutStep === 1 && (
            <motion.div key="step1" initial={{ x: 40, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -40, opacity: 0 }} className="pb-4 space-y-3">

              {/* Tarjeta: Lista de artículos */}
              <div className="bg-white rounded-3xl overflow-hidden shadow-[0_2px_12px_-4px_rgba(0,0,0,0.07)]">
                {carrito.map((p, i) => (
                  <div key={i} className="flex gap-4 px-4 py-4 border-b border-slate-100 last:border-0">
                    <div className="w-[68px] h-[68px] rounded-2xl overflow-hidden shrink-0 bg-slate-100">
                      <LazyImage src={p.item.foto_url} alt={p.item.nombre} />
                    </div>
                    <div className="flex-1 flex flex-col justify-between py-0.5">
                      <div className="flex justify-between items-start gap-2">
                        <h4 className="font-bold text-[15px] text-slate-800 leading-tight">{p.item.nombre}</h4>
                        <span className="font-black text-[15px] text-slate-900 shrink-0">${(p.item.precio * p.cantidad).toFixed(2)}</span>
                      </div>
                      {p.item.opcionesSeleccionadas && p.item.opcionesSeleccionadas.length > 0 && (
                        <p className="text-[11px] text-slate-400 font-medium mt-0.5 leading-snug">
                          {p.item.opcionesSeleccionadas.map(o => o.opcion).join(' · ')}
                        </p>
                      )}
                      <div className="flex items-center gap-3 mt-2 w-max bg-slate-100 rounded-full px-2 py-1.5">
                        <button onClick={() => removeFromCart(p.item.cartItemId)} className="w-6 h-6 flex items-center justify-center rounded-full bg-white shadow-sm hover:bg-slate-50 transition-colors"><Minus size={12} strokeWidth={3}/></button>
                        <span className="font-black text-sm w-5 text-center tabular-nums">{p.cantidad}</span>
                        <button onClick={() => addToCart(p.item)} className="w-6 h-6 flex items-center justify-center rounded-full bg-white shadow-sm hover:bg-slate-50 transition-colors"><Plus size={12} strokeWidth={3}/></button>
                      </div>
                    </div>
                  </div>
                ))}

                {/* Subtotal dentro de la tarjeta */}
                <div className="flex justify-between items-center px-4 py-3.5 bg-slate-50">
                  <span className="text-[13px] text-slate-500 font-medium">Subtotal</span>
                  <span className="font-black text-[17px] text-slate-900">${subtotal.toFixed(2)}</span>
                </div>
              </div>

              {/* Tarjeta: Cupón */}
              <div className="bg-white rounded-3xl overflow-hidden shadow-[0_2px_12px_-4px_rgba(0,0,0,0.07)] px-4 py-4">
                <span className="inline-block bg-[#1D4ED8] text-white text-[11px] font-black uppercase tracking-widest px-3 py-1 rounded-full mb-3">¿Tienes un cupón?</span>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="CÓDIGO"
                    value={cuponCliente}
                    onChange={e => { setCuponCliente(e.target.value.toUpperCase()); setCuponValido(false); setDescuento(0); }}
                    disabled={validandoCupon}
                    className="flex-1 bg-slate-100 rounded-2xl px-4 py-3 text-[15px] font-bold uppercase outline-none focus:bg-blue-50 focus:ring-2 focus:ring-blue-600/20 transition-all placeholder:text-slate-300"
                  />
                  <button onClick={validarCuponBtn} disabled={validandoCupon || !cuponCliente.trim()} className="bg-[#1D4ED8] text-white px-5 py-3 rounded-2xl text-[14px] font-bold hover:bg-blue-700 transition-colors disabled:opacity-40 shadow-sm shadow-blue-700/20">
                    {validandoCupon ? <Loader2 className="w-5 h-5 animate-spin"/> : 'Aplicar'}
                  </button>
                </div>
                <AnimatePresence>
                  {cuponValido && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="mt-2 flex items-center gap-2 text-[13px] font-bold text-green-700 bg-green-50 px-3 py-2 rounded-xl">
                      <CheckCircle2 size={14} className="text-green-600 shrink-0"/> Cupón aplicado · Ahorras ${descuento.toFixed(2)}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

            </motion.div>
          )}

          {/* ══════════════════════════════════════
              PASO 2 — Entrega
          ══════════════════════════════════════ */}
          {checkoutStep === 2 && (
            <motion.div key="step2" initial={{ x: 40, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -40, opacity: 0 }} className="pb-4 space-y-6">

              {/* Tus datos */}
              <div id="seccion-datos">
                <span className="inline-block bg-[#1D4ED8] text-white text-[11px] font-black uppercase tracking-widest px-3 py-1 rounded-full mb-3">Tus datos</span>
                <div className="bg-white rounded-3xl overflow-hidden shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] border border-slate-100/80">
                  
                  {/* Nombre Input */}
                  <div className="px-4 py-2.5 border-b border-slate-100/80 focus-within:bg-blue-50/30 transition-colors">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">Nombre completo</label>
                    <input
                      type="text"
                      value={clienteNombre}
                      onChange={e => setClienteNombre(e.target.value)}
                      placeholder="Ej. Juan Pérez"
                      className="w-full bg-transparent outline-none text-[15px] font-bold text-slate-800 placeholder:text-slate-300 placeholder:font-medium"
                    />
                  </div>

                  {/* Teléfono Input */}
                  <div className={`px-4 py-2.5 transition-colors ${telError ? 'bg-red-50/50' : 'focus-within:bg-blue-50/30'}`}>
                    <label className={`text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 mb-0.5 ${telError ? 'text-red-400' : 'text-slate-400'}`}>
                      Teléfono {telError && <span className="lowercase font-medium normal-case ml-1 flex items-center gap-0.5"><AlertCircle size={10}/> 10 dígitos</span>}
                    </label>
                    <div className="flex items-center">
                      <span className="text-slate-400 font-bold text-[15px] mr-2">+52</span>
                      <input
                        type="tel"
                        value={clienteTel}
                        onChange={e => { setClienteTel(e.target.value); setTelError(false); }}
                        placeholder="10 dígitos"
                        maxLength={10}
                        className="w-full bg-transparent outline-none text-[15px] font-bold tracking-wide text-slate-800 placeholder:text-slate-300 placeholder:font-medium"
                      />
                    </div>
                  </div>

                  {/* Estado lealtad integrado como footer de la tarjeta */}
                  <AnimatePresence mode="wait">
                    {clienteTel.replace(/\D/g, '').length === 10 && checkingLoyalty && (
                      <motion.div key="checking" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="border-t border-slate-100/80 bg-slate-50">
                        <div className="px-4 py-3 flex items-center gap-3">
                          <Loader2 size={16} className="animate-spin text-slate-400 shrink-0"/>
                          <p className="text-[12px] font-bold text-slate-500">Verificando tu historial...</p>
                        </div>
                      </motion.div>
                    )}
                    {clienteTel.replace(/\D/g, '').length === 10 && !checkingLoyalty && didInitLoyalty && (
                      <motion.div key="result" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className={`border-t border-slate-100/80 ${(datosCliente?.envios_gratis || 0) > 0 || (datosCliente?.puntos || 0) >= 6 ? 'bg-amber-50' : 'bg-slate-50'}`}>
                        <div className="px-4 py-3 flex items-center gap-3">
                          <span className="text-lg shrink-0">{(datosCliente?.envios_gratis || 0) > 0 || (datosCliente?.puntos || 0) >= 6 ? '🎁' : '⭐'}</span>
                          <div>
                            {(datosCliente?.envios_gratis || 0) > 0 || (datosCliente?.puntos || 0) >= 6 ? (
                              <>
                                <p className="text-[13px] font-black text-slate-800 leading-tight mb-0.5">¡Tienes un beneficio!</p>
                                <p className="text-[11px] text-slate-500 font-medium leading-tight">Continúa para desbloquear tu envío gratis</p>
                              </>
                            ) : (
                              <>
                                <p className="text-[13px] font-black text-slate-800 leading-tight mb-0.5">Llevas {datosCliente?.puntos || 0} de 6 pedidos</p>
                                <p className="text-[11px] text-slate-500 font-medium leading-tight">¡Al 6to pedido el envío es gratis!</p>
                              </>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              {/* Tipo de entrega */}
              <div id="seccion-entrega">
                <span className="inline-block bg-[#1D4ED8] text-white text-[11px] font-black uppercase tracking-widest px-3 py-1 rounded-full mb-3">¿Cómo lo recibes?</span>
                <div className="flex gap-2">
                  <button onClick={() => setTipoEntrega('domicilio')} className={`flex-1 py-3 px-2 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all ${tipoEntrega === 'domicilio' ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                    <span className="text-xl">🛵</span>
                    <span className="text-[13.5px]">A Domicilio</span>
                  </button>
                  <button onClick={() => setTipoEntrega('tienda')} className={`flex-1 py-3 px-2 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all ${tipoEntrega === 'tienda' ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                    <span className="text-xl">🏪</span>
                    <span className="text-[13.5px]">En Tienda</span>
                  </button>
                </div>

                <AnimatePresence>
                  {tipoEntrega === 'domicilio' && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                      {ubicacionGPS ? (
                        <div className="mt-4 space-y-3">
                          <div className="flex items-start justify-between gap-3 bg-slate-50 rounded-2xl px-4 py-3">
                            <div className="flex items-start gap-2 flex-1 min-w-0">
                              <MapPin size={16} className="text-black shrink-0 mt-0.5"/>
                              <p className="text-[13px] font-bold text-slate-800 leading-snug">{direccionEntrega}</p>
                            </div>
                            <button onClick={() => setIsMapModalOpen(true)} className="text-blue-600 text-[12px] font-bold shrink-0 hover:underline">Cambiar</button>
                          </div>
                          {!calculandoEnvio && costoEnvio >= 0 && (
                            <div className="flex justify-between items-center px-1">
                              <span className="text-[13px] text-slate-400 font-medium">Costo de envío</span>
                              <span className="text-[13px] font-bold text-slate-800">{costoEnvioFinal === 0 ? <span className="text-green-600">GRATIS 🎉</span> : `$${costoEnvioFinal.toFixed(2)}`}</span>
                            </div>
                          )}
                          <textarea
                            rows={2}
                            value={direccionReferencias}
                            onChange={e => setDireccionReferencias(e.target.value)}
                            placeholder="Referencias (opcional) — casa verde, portón negro..."
                            className="w-full bg-slate-100 rounded-2xl px-4 py-3 text-[14px] outline-none focus:bg-blue-50 focus:ring-2 focus:ring-blue-600/20 transition-all resize-none text-slate-800 placeholder:text-slate-300"
                          />
                        </div>
                      ) : (
                        <button onClick={() => setIsMapModalOpen(true)} className="mt-4 w-full bg-[#1D4ED8] text-white py-4 rounded-2xl font-bold text-[15px] flex items-center justify-center gap-2 hover:bg-blue-700 transition-colors shadow-sm shadow-blue-700/20">
                          <MapPin size={18}/> Indicar ubicación en el mapa
                        </button>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Widget lealtad envío gratis */}
                {datosCliente && !calculandoEnvio && (tipoEntrega === 'tienda' || ubicacionGPS) && !datosCliente.es_vip && costoEnvioCalculado > 0 && (datosCliente.envios_gratis > 0 || datosCliente.puntos >= 6) && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-4">
                    <button 
                      onClick={() => setUsarBeneficioNormal(!usarBeneficioNormal)}
                      className={`w-full flex items-center justify-between px-3 py-3 rounded-2xl transition-all text-left border-2 ${usarBeneficioNormal ? 'bg-green-50/50 border-green-500' : 'bg-white border-slate-100 hover:border-slate-200'}`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 flex items-center justify-center rounded-xl shrink-0 ${usarBeneficioNormal ? 'bg-green-100' : 'bg-amber-100'}`}>
                          {usarBeneficioNormal ? <CheckCircle2 size={20} className="text-green-600" /> : <Gift size={20} className="text-amber-600" />}
                        </div>
                        <div>
                          <p className={`text-[13px] font-black leading-tight mb-0.5 ${usarBeneficioNormal ? 'text-green-700' : 'text-slate-800'}`}>Envío Gratis disponible</p>
                          <p className={`text-[11px] font-medium leading-tight ${usarBeneficioNormal ? 'text-green-600/80' : 'text-slate-500'}`}>Recompensa cliente estrella</p>
                        </div>
                      </div>
                      <div className={`px-3 py-1.5 rounded-xl text-[11px] font-bold uppercase tracking-wider shrink-0 ${usarBeneficioNormal ? 'bg-green-600 text-white shadow-sm shadow-green-600/30' : 'bg-slate-100 text-slate-500'}`}>
                        {usarBeneficioNormal ? 'Aplicado' : 'Aplicar'}
                      </div>
                    </button>
                  </motion.div>
                )}

                {/* Widget VIP */}
                {datosCliente?.es_vip && (tipoEntrega === 'tienda' || ubicacionGPS) && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-4 flex items-center justify-between bg-slate-50 rounded-2xl px-4 py-3">
                    <div>
                      <p className="text-[13px] font-black text-slate-800 flex items-center gap-1"><Star size={13} className="fill-slate-800"/> Cliente VIP · Saldo ${datosCliente.saldo.toFixed(2)}</p>
                      <p className="text-[11px] text-slate-500 font-medium mt-0.5">Usa tu saldo para pagar</p>
                    </div>
                    {!usarSaldoVip ? (
                      <button onClick={() => setUsarSaldoVip(true)} className="bg-black text-white px-3 py-1.5 rounded-xl font-bold text-[11px]">Usar</button>
                    ) : (
                      <div className="flex gap-1.5">
                        <input type="number" value={montoSaldoVip} onChange={e => setMontoSaldoVip(e.target.value)} placeholder="$0" className="w-14 bg-white border border-slate-200 rounded-xl px-2 py-1 text-[11px] font-bold outline-none text-center"/>
                        <input type="password" value={pinVip} onChange={e => { setPinVip(e.target.value.replace(/\D/g, '')); setPinError(false); }} maxLength={4} placeholder="PIN" className={`w-12 bg-white border ${pinError ? 'border-red-400' : 'border-slate-200'} rounded-xl px-2 py-1 text-[11px] text-center font-black tracking-widest outline-none`}/>
                        <button onClick={handlePinVerify} disabled={verificandoPin || pinVip.length < 4} className="bg-black text-white rounded-xl px-2 text-[11px] font-bold disabled:opacity-50 flex items-center">
                          {verificandoPin ? <Loader2 size={10} className="animate-spin"/> : 'OK'}
                        </button>
                      </div>
                    )}
                  </motion.div>
                )}
              </div>

            </motion.div>
          )}

          {/* ══════════════════════════════════════
              PASO 3 — Pago
          ══════════════════════════════════════ */}
          {checkoutStep === 3 && (
            <motion.div key="step3" initial={{ x: 40, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -40, opacity: 0 }} className="pb-4 space-y-6">

              {/* Método de pago */}
              <div>
                <span className="inline-block bg-[#1D4ED8] text-white text-[11px] font-black uppercase tracking-widest px-3 py-1 rounded-full mb-3">Método de pago</span>
                <div className="bg-white rounded-3xl overflow-hidden shadow-[0_2px_12px_-4px_rgba(0,0,0,0.07)] space-y-0 divide-y divide-slate-100">

                  {/* Efectivo */}
                  <button onClick={() => setMetodoPago('efectivo')} className={`w-full py-4 px-5 font-bold flex items-center gap-4 transition-all first:rounded-t-3xl ${metodoPago === 'efectivo' ? 'bg-blue-50' : 'bg-white hover:bg-slate-50'}`}>
                    <div className={`w-10 h-10 rounded-2xl flex items-center justify-center text-xl shrink-0 ${metodoPago === 'efectivo' ? 'bg-blue-100' : 'bg-slate-100'}`}>💵</div>
                    <span className={`flex-1 text-left text-[15px] ${metodoPago === 'efectivo' ? 'text-[#1D4ED8]' : 'text-slate-700'}`}>Efectivo al recibir</span>
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${metodoPago === 'efectivo' ? 'border-[#1D4ED8] bg-[#1D4ED8]' : 'border-slate-300'}`}>
                      {metodoPago === 'efectivo' && <div className="w-2 h-2 rounded-full bg-white" />}
                    </div>
                  </button>

                  <AnimatePresence>
                    {metodoPago === 'efectivo' && (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden bg-blue-50">
                        <div className="px-5 pb-4 pt-1">
                          <p className="text-[11px] font-bold text-blue-400 uppercase tracking-widest mb-2">¿Con cuánto pagas?</p>
                          <div className="flex gap-2">
                            {smartDenominations.map((denom, idx) => (
                              <button key={idx} onClick={() => setMontoEfectivo(denom.toString())} className={`flex-1 py-3 rounded-2xl font-black text-[14px] transition-all border-2 ${montoEfectivo === denom.toString() ? 'bg-[#1D4ED8] border-[#1D4ED8] text-white shadow-md shadow-blue-700/20' : 'bg-white border-slate-200 text-slate-700 hover:border-blue-200'}`}>
                                ${denom.toFixed(0)}
                                {idx === 0 && <span className="block text-[9px] font-bold opacity-60 uppercase mt-0.5">Exacto</span>}
                              </button>
                            ))}
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {restaurante?.acepta_pago_online && (
                    <button onClick={() => setMetodoPago('en_linea')} className={`w-full py-4 px-5 font-bold flex items-center gap-4 transition-all last:rounded-b-3xl ${metodoPago === 'en_linea' ? 'bg-blue-50' : 'bg-white hover:bg-slate-50'}`}>
                      <div className={`w-10 h-10 rounded-2xl flex items-center justify-center text-xl shrink-0 ${metodoPago === 'en_linea' ? 'bg-blue-100' : 'bg-slate-100'}`}>💳</div>
                      <div className="flex-1 text-left">
                        <span className={`block text-[15px] ${metodoPago === 'en_linea' ? 'text-[#1D4ED8]' : 'text-slate-700'}`}>Pago en Línea</span>
                        <span className={`block text-[11px] font-medium ${metodoPago === 'en_linea' ? 'text-blue-400' : 'text-slate-400'}`}>Tarjeta o Mercado Pago</span>
                      </div>
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${metodoPago === 'en_linea' ? 'border-[#1D4ED8] bg-[#1D4ED8]' : 'border-slate-300'}`}>
                        {metodoPago === 'en_linea' && <div className="w-2 h-2 rounded-full bg-white" />}
                      </div>
                    </button>
                  )}
                </div>
              </div>

              {/* ─── CARD RESUMEN TIPO RECIBO ─── */}
              <div className="bg-slate-50 rounded-3xl overflow-hidden">

                {/* Primer artículo del pedido */}
                <div className="flex items-center gap-3 px-4 pt-4 pb-3 border-b border-slate-100/80">
                  <div className="w-12 h-12 rounded-xl bg-slate-200 overflow-hidden shrink-0">
                    <LazyImage src={carrito[0]?.item?.foto_url} alt={carrito[0]?.item?.nombre}/>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-[14px] text-slate-800 truncate">{carrito.length === 1 ? carrito[0].item.nombre : `${carrito[0].item.nombre} y ${carrito.length - 1} más`}</p>
                    <p className="text-[11px] text-slate-400 font-medium">{restaurante?.nombre} · {carrito.length} {carrito.length === 1 ? 'artículo' : 'artículos'}</p>
                  </div>
                </div>

                {/* Detalles financieros */}
                <div className="px-4 py-3 space-y-2.5 border-b border-slate-100/80">
                  <div className="flex justify-between text-[13px]">
                    <span className="text-slate-400 font-medium">Subtotal</span>
                    <span className="font-semibold text-slate-700">${subtotal.toFixed(2)}</span>
                  </div>
                  {descuentoTotal > 0 && (
                    <div className="flex justify-between text-[13px]">
                      <span className="text-slate-400 font-medium">Descuento</span>
                      <span className="font-semibold text-green-600">−${descuentoTotal.toFixed(2)}</span>
                    </div>
                  )}
                  {tipoEntrega === 'domicilio' && (
                    <div className="flex justify-between text-[13px]">
                      <span className="text-slate-400 font-medium">Envío</span>
                      <span className="font-semibold text-slate-700">
                        {calculandoEnvio
                          ? <Loader2 size={12} className="animate-spin inline"/>
                          : costoEnvioFinal === 0
                            ? <span className="text-green-600 font-bold">GRATIS</span>
                            : `$${costoEnvioFinal.toFixed(2)}`
                        }
                      </span>
                    </div>
                  )}
                </div>

                {/* Total */}
                <div className="flex justify-between items-center px-4 py-3.5 border-b border-slate-100/80">
                  <span className="font-black text-[15px] text-slate-800">Total</span>
                  <motion.span
                    key={Math.round(displayTotal)}
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="font-black text-[22px] text-green-600 leading-none tabular-nums"
                  >
                    ${displayTotal.toFixed(2)}
                  </motion.span>
                </div>

                {/* Entregar a */}
                <div className="px-4 py-3 space-y-2.5">
                  <div className="flex justify-between text-[13px]">
                    <span className="text-slate-400 font-medium">Nombre</span>
                    <span className="font-semibold text-slate-800 text-right">{clienteNombre}</span>
                  </div>
                  <div className="flex justify-between text-[13px]">
                    <span className="text-slate-400 font-medium">Teléfono</span>
                    <span className="font-semibold text-slate-800">{clienteTel}</span>
                  </div>
                  <div className="flex justify-between text-[13px] gap-4">
                    <span className="text-slate-400 font-medium shrink-0">Dirección</span>
                    <span className="font-semibold text-slate-800 text-right leading-snug">{tipoEntrega === 'domicilio' ? direccionEntrega : 'Recoger en sucursal'}</span>
                  </div>
                  <div className="flex justify-between text-[13px]">
                    <span className="text-slate-400 font-medium">Pago</span>
                    <span className="font-semibold text-slate-800">{metodoPago === 'efectivo' ? `Efectivo${montoEfectivo ? ' ($' + montoEfectivo + ')' : ''}` : 'En Línea'}</span>
                  </div>
                </div>
              </div>

              {/* Banner de ahorro */}
              {ahorroTotal > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-3 bg-gradient-to-r from-green-500 to-emerald-500 rounded-2xl px-5 py-3.5 shadow-lg shadow-green-500/20"
                >
                  <span className="text-2xl">🎉</span>
                  <div>
                    <p className="font-black text-white text-[14px] leading-tight">¡Ahorraste ${ahorroTotal.toFixed(2)}!</p>
                    <p className="text-white/75 text-[11px] font-medium leading-tight">En este pedido</p>
                  </div>
                </motion.div>
              )}

            </motion.div>
          )}


        </AnimatePresence>
        
        {/* BOTÓN DE NAVEGACIÓN FIJO */}
        <div className="fixed bottom-0 left-0 right-0 p-4 pb-6 bg-slate-100/95 backdrop-blur-md z-40">
          <div className="max-w-lg md:max-w-2xl mx-auto">
          {checkoutStep < 3 ? (
            <button 
              onClick={() => {
                if (checkoutStep === 2) {
                  if (clienteTel.replace(/\D/g, '').length !== 10 || !clienteNombre.trim()) {
                    setTelError(clienteTel.replace(/\D/g, '').length !== 10);
                    showToast('Error', 'Completa tus datos personales', 'error');
                    const el = document.getElementById('seccion-datos');
                    if (el) smoothScroll(document.getElementById('cart-scroll-container'), el.offsetTop - 80, 400);
                    return;
                  }
                  if (!tipoEntrega || (tipoEntrega === 'domicilio' && (!direccionEntrega || fueraDeCobertura))) {
                    showToast('Error', 'Revisa los datos de entrega', 'error');
                    const el = document.getElementById('seccion-entrega');
                    if (el) smoothScroll(document.getElementById('cart-scroll-container'), el.offsetTop - 80, 400);
                    return;
                  }
                }
                setCheckoutStep(checkoutStep + 1);
                smoothScroll(document.getElementById('cart-scroll-container'), 0, 400);
              }}
              disabled={checkingLoyalty}
              className={`w-full text-white py-4 rounded-2xl font-black text-[16px] active:scale-[0.98] transition-all disabled:opacity-50 shadow-lg ${
                !isStepValid()
                  ? 'bg-slate-400 shadow-none'
                  : 'bg-[#1D4ED8] shadow-blue-700/25 hover:bg-blue-700'
              }`}
            >
              {getBotonText()}
            </button>
          ) : (
            <button 
              onClick={() => {
                if (!metodoPago || (metodoPago === 'efectivo' && (!montoEfectivo || parseFloat(montoEfectivo) < total))) {
                  showToast('Error', 'Completa tu método de pago', 'error');
                  return;
                }
                handlePedir();
              }}
              disabled={procesando || !isStepValid()}
              className={`w-full py-4 rounded-2xl font-black text-[16px] active:scale-[0.98] transition-all shadow-lg flex items-center justify-center gap-2 ${
                !isStepValid()
                  ? 'bg-slate-300 text-slate-400 shadow-none'
                  : 'bg-[#1D4ED8] text-white shadow-blue-700/25 hover:bg-blue-700'
              } disabled:opacity-60`}
            >
              {procesando ? <Loader2 size={22} className="animate-spin text-white" /> : getBotonText()}
            </button>
          )}
          </div>
        </div>

        </div>
      </main>

      {/* MAP MODAL */}
      <AnimatePresence>
        {isMapModalOpen && (
          <motion.div initial={{ opacity: 0, y: '100%' }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: '100%' }} transition={{ type: "spring", damping: 25, stiffness: 200 }} className="fixed inset-0 z-[200] bg-white flex flex-col">
            <div className="flex items-center justify-between p-4 border-b bg-white z-20 shadow-sm">
              <button onClick={() => setIsMapModalOpen(false)} className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center hover:bg-slate-200 transition-colors"><X size={20} className="text-slate-700"/></button>
              <h2 className="font-black text-lg">Ubicación de entrega</h2>
              <div className="w-10"></div>
            </div>
            <div className="flex-1 relative bg-slate-50">
              <div className="absolute top-4 right-4 z-20">
                <button onClick={obtenerUbicacionGPS} className="w-12 h-12 bg-white rounded-full shadow-lg flex items-center justify-center text-slate-700 hover:text-black transition-colors relative">
                  {buscandoGPS ? <Loader2 className="animate-spin" /> : <LocateFixed size={20} />}
                  
                  {/* Tooltip Guía */}
                  {!ubicacionGPS && (
                    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.8, type: 'spring' }} className="absolute right-[calc(100%+12px)] top-1/2 -translate-y-1/2 bg-slate-900 text-white text-[11px] font-bold px-3 py-2 rounded-xl whitespace-nowrap pointer-events-none shadow-xl flex items-center">
                      Toca aquí para ubicarte 📍
                      <div className="absolute top-1/2 right-[-5px] -translate-y-1/2 border-y-4 border-y-transparent border-l-[6px] border-l-slate-900 w-0 h-0"></div>
                    </motion.div>
                  )}
                </button>
              </div>
              <div className="absolute top-4 left-4 right-20 z-20 pointer-events-none">
                <div className="bg-white/95 backdrop-blur-md px-4 py-3 rounded-2xl shadow-lg border border-slate-100 pointer-events-auto">
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Entregar en:</p>
                  <p className="text-sm font-bold text-slate-800 line-clamp-2 leading-tight">{draftDireccion || 'Mueve el mapa para ubicarte'}</p>
                </div>
              </div>
              {isGoogleMapsLoaded ? (
                <div className="w-full h-full relative">
                  <GoogleMap mapContainerStyle={{ width: '100%', height: '100%' }} center={draftUbicacion || ubicacionGPS || { lat: 16.2516, lng: -92.1332 }} zoom={17} onLoad={map => setMapInstance(map)} onDragEnd={handleMapDragEnd} options={{ disableDefaultUI: true, gestureHandling: 'greedy', styles: PREMIUM_MAP_STYLE }}>
                  </GoogleMap>
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-full z-10 pointer-events-none drop-shadow-xl">
                    <MapPin className="text-black w-12 h-12 fill-black" />
                    <div className="w-4 h-1 bg-black/20 rounded-full mx-auto mt-1 blur-[1px]"></div>
                  </div>
                </div>
              ) : (
                <div className="w-full h-full flex items-center justify-center"><Loader2 className="animate-spin text-[#FA4A0C] w-10 h-10"/></div>
              )}
            </div>
            <div className="p-5 bg-white z-20 shadow-[0_-10px_20px_rgba(0,0,0,0.05)] rounded-t-[32px] relative -mt-4">
              <button onClick={handleConfirmarUbicacion} disabled={!draftUbicacion && !ubicacionGPS} className="w-full bg-[#1D4ED8] text-white py-4 rounded-2xl font-black text-lg disabled:opacity-50 shadow-lg shadow-blue-700/25 hover:bg-blue-700 active:scale-[0.98] transition-all">
                Confirmar esta ubicación
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* OTP MODAL */}
      <AnimatePresence>
        {showOtpModal && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowOtpModal(false)} />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} className="relative bg-white rounded-[32px] p-8 max-w-sm w-full z-10 text-center shadow-2xl">
              <button onClick={() => setShowOtpModal(false)} className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center bg-slate-100 text-slate-500 rounded-full hover:bg-slate-200 transition-colors"><X size={16} strokeWidth={3} /></button>
              <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-5">
                <ShieldCheck size={40} className="text-black" />
              </div>
              <h3 className="font-black text-xl mb-2 text-slate-800">Verifica tu pedido</h3>
              <p className="text-sm text-slate-500 mb-6 font-medium">Ingresa el PIN de 4 dígitos enviado a tu WhatsApp al número <b className="text-slate-700">{clienteTel}</b></p>
              <input type="text" value={otpCode} onChange={e => setOtpCode(e.target.value.replace(/\D/g, ''))} maxLength={4} autoFocus className="w-full bg-slate-50 text-center text-3xl font-black tracking-[0.5em] py-4 rounded-2xl outline-none border border-slate-200 focus:border-[#1D4ED8] focus:ring-4 ring-blue-600/10 mb-6 transition-all text-slate-800" />
              <button onClick={handleVerifyOtp} disabled={otpCode.length < 4 || verificandoOtp} className="w-full bg-[#1D4ED8] text-white font-black py-4 rounded-2xl disabled:opacity-50 shadow-lg shadow-blue-700/25 hover:bg-blue-700 flex items-center justify-center gap-2">
                {verificandoOtp ? <Loader2 className="animate-spin" /> : 'Confirmar y Enviar'}
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* TOAST */}
      <AnimatePresence>
        {toastMsg && (
          <motion.div initial={{ y: -50, opacity: 0, scale: 0.9 }} animate={{ y: 0, opacity: 1, scale: 1 }} exit={{ y: -50, opacity: 0, scale: 0.9 }} className="fixed top-4 left-4 right-4 z-[400] flex justify-center">
            <div className="bg-slate-900/95 backdrop-blur-md text-white px-5 py-3.5 rounded-2xl shadow-2xl flex items-center gap-3 border border-slate-800">
              {toastMsg.type === 'error' ? <AlertCircle className="text-red-400" size={20} /> : <CheckCircle2 className="text-green-400" size={20} />}
              <div>
                <p className="font-bold text-sm leading-tight">{toastMsg.title}</p>
                <p className="text-[11px] text-slate-300 font-medium">{toastMsg.message}</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      {/* CONFETTI OVERLAY */}
      <AnimatePresence>
        {confettiActive && (
          <div className="fixed inset-0 pointer-events-none z-[100] flex items-center justify-center overflow-hidden">
            {[...Array(30)].map((_, i) => (
              <motion.div
                key={i}
                initial={{ 
                  opacity: 1, 
                  y: '100vh',
                  x: Math.random() * window.innerWidth,
                  scale: Math.random() * 1.5 + 0.5,
                  rotate: 0
                }}
                animate={{ 
                  opacity: 0, 
                  y: '-20vh',
                  x: Math.random() * window.innerWidth,
                  rotate: Math.random() * 720 - 360
                }}
                transition={{ 
                  duration: Math.random() * 2 + 1.5,
                  ease: "easeOut"
                }}
                className="absolute text-4xl"
              >
                {['🎉', '🎊', '🛵', '🎁', '✨', '🍕', '🍔'][Math.floor(Math.random() * 7)]}
              </motion.div>
            ))}
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
