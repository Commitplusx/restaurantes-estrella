import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useCartStore } from '../store/useCartStore';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ChevronLeft, Plus, Minus, X, CheckCircle2, AlertCircle, 
  Loader2, MapPin, LocateFixed, Store, Ticket, Star, ShieldCheck,
  ShoppingBag, ArrowRight, Info, Gift
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
  if (!src) return <div className={`bg-slate-100 flex items-center justify-center ${className || ''}`}><Store size={24} className="text-slate-300"/></div>;
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
  const [verificandoPin, setVerificandoPin] = useState(false);
  const [pinAutorizado, setPinAutorizado] = useState(false);
  const [pinSeguridad, setPinSeguridad] = useState<string | null>(null);
  // Bug fix: Re-check loyalty if tel already loaded from sessionStorage on mount
  const [didInitLoyalty, setDidInitLoyalty] = useState(false);

  // Hooks de cálculo
  const { costoEnvioBase, fueraDeCobertura, calculandoEnvio } = useDeliveryCalculation(ubicacionGPS, tipoEntrega || 'tienda');

  const showToast = (title: string, message: string, type: 'success' | 'error' | 'loading' = 'success') => {
    setToastMsg({ title, message, type });
    if (type !== 'loading') {
      setTimeout(() => setToastMsg(null), 3000);
    }
  };

  // useEffect para est_carrito eliminado: ahora es manejado por Zustand

  // useEffect para est_carrito eliminado: ahora es manejado por Zustand

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
            setDraftDireccion(results[0].formatted_address);
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
            originUrl: window.location.origin
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
    <div className="min-h-screen flex items-center justify-center bg-[#FAFAFA]">
      <Loader2 size={48} className="animate-spin text-[#FA4A0C]" />
    </div>
  );

  // === ESTADO VACÍO PREMIUM ===
  if (carrito.length === 0) {
    return (
      <div className="min-h-screen bg-[#FAFAFA] flex flex-col font-sans text-slate-900">
        <header className="bg-white px-4 py-4 border-b border-slate-100 flex items-center shadow-sm sticky top-0 z-50">
          <button onClick={() => navigate(`/menu/${id}`)} className="p-2 bg-slate-50 rounded-full mr-3 hover:bg-slate-100 transition-colors">
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
            className="w-full bg-gradient-to-r from-[#FA4A0C] to-[#ff6a36] text-white py-4 rounded-2xl font-black text-lg shadow-xl shadow-orange-500/25 flex items-center justify-center gap-2 group"
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
    if (checkoutStep === 2) return 'Continuar a Entrega';
    if (checkoutStep === 3) return 'Ir a Método de Pago';
    if (procesando) return 'Procesando...';
    return 'Confirmar Pedido';
  };

  const isStepValid = () => {
    if (checkoutStep === 1) return true;
    if (checkoutStep === 2) return clienteTel.replace(/\D/g, '').length === 10 && clienteNombre.trim().length > 0;
    if (checkoutStep === 3) return tipoEntrega === 'tienda' || (tipoEntrega === 'domicilio' && ubicacionGPS && !fueraDeCobertura);
    if (checkoutStep === 4) return metodoPago !== null;
    if (checkoutStep === 5) return true;
    return false;
  };

  return (
    <div className="fixed inset-0 bg-white flex flex-col font-sans text-slate-900 overflow-hidden">
      {/* HEADER FIJO CON STEPPER */}
      <header className="bg-white/80 backdrop-blur-md px-4 py-3 border-b border-slate-100 shadow-sm sticky top-0 z-50 flex items-center gap-2">
        <button 
          onClick={() => {
            if (checkoutStep > 1) {
              setCheckoutStep(checkoutStep - 1);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            } else {
              navigate(`/menu/${id}`);
            }
          }} 
          className="p-2 bg-slate-50 rounded-full hover:bg-slate-100 transition-colors shrink-0"
        >
          <ChevronLeft size={20} className="text-slate-700" />
        </button>
        
        <div className="flex-1 max-w-[200px] mx-auto">
          {checkoutStep === 5 ? (
            <div className="text-center font-black text-[17px] text-slate-800 tracking-tight">Confirma tu pedido</div>
          ) : (
            <div className="flex items-center justify-between relative">
              {/* Progress bar background */}
              <div className="absolute left-0 right-0 h-1 bg-slate-100 rounded-full top-1/2 -translate-y-1/2 z-0" />
              
              {/* Active progress bar */}
              <div 
                 className="absolute left-0 h-1 bg-gradient-to-r from-[#FA4A0C] to-[#ff6a36] rounded-full top-1/2 -translate-y-1/2 z-0 transition-all duration-500 ease-out" 
                 style={{ width: `${((checkoutStep - 1) / 4) * 100}%` }}
              />

              {[1, 2, 3, 4, 5].map(step => (
                <div key={step} className="relative z-10 flex flex-col items-center gap-1">
                  <div 
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold transition-all duration-300 ${
                      checkoutStep > step 
                        ? 'bg-green-500 text-white shadow-md shadow-green-500/30' 
                        : checkoutStep === step 
                          ? 'bg-[#FA4A0C] text-white shadow-md shadow-orange-500/30 scale-110' 
                          : 'bg-white text-slate-300 border-2 border-slate-100'
                    }`}
                  >
                    {checkoutStep > step ? <CheckCircle2 size={14} strokeWidth={3} /> : step}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        
        <div className="w-9 shrink-0"></div>
      </header>

      <main className="flex-1 overflow-y-auto p-4 w-full relative">
        <div className="max-w-lg mx-auto pb-32">
          <AnimatePresence mode="wait">
          
          {/* PASO 1: RESUMEN DEL PEDIDO */}
          {checkoutStep === 1 && (
            <motion.div key="step1" initial={{ x: 50, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -50, opacity: 0 }} className="space-y-6">
              
              <div className="px-2 space-y-4 divide-y divide-slate-100">
                <div className="flex justify-between items-center pb-2">
                  <h3 className="font-black text-lg">Tu Pedido</h3>
                  <span className="bg-orange-50 text-[#FA4A0C] font-bold text-xs px-3 py-1 rounded-full">{carrito.length} items</span>
                </div>
                {carrito.map((p, i) => (
                  <div key={i} className="flex gap-4 pt-4 first:pt-0">
                    <div className="w-20 h-20 rounded-2xl overflow-hidden shrink-0 shadow-sm border border-slate-50">
                      <LazyImage src={p.item.foto_url} alt={p.item.nombre} />
                    </div>
                    <div className="flex-1 flex flex-col justify-between py-1">
                      <div>
                        <div className="flex justify-between items-start">
                          <h4 className="font-bold text-sm text-slate-800 leading-tight pr-2">{p.item.nombre}</h4>
                          <span className="font-black text-sm">${(p.item.precio * p.cantidad).toFixed(2)}</span>
                        </div>
                        {p.item.opcionesSeleccionadas && p.item.opcionesSeleccionadas.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1.5">
                            {p.item.opcionesSeleccionadas.map((o, idx) => (
                              <span key={idx} className="bg-slate-50 border border-slate-100 text-slate-500 text-[10px] px-2 py-0.5 rounded-md font-medium">
                                {o.opcion}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-3 w-max bg-slate-50 border border-slate-100 rounded-full px-2 py-1">
                        <button onClick={() => removeFromCart(p.item.cartItemId)} className="p-1 hover:text-[#FA4A0C] transition-colors"><Minus size={14} strokeWidth={3}/></button>
                        <span className="font-bold text-sm w-4 text-center">{p.cantidad}</span>
                        <button onClick={() => addToCart(p.item)} className="p-1 hover:text-[#FA4A0C] transition-colors"><Plus size={14} strokeWidth={3}/></button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* BANNER ESTRELLA EATS */}
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mx-2 mt-4 bg-gradient-to-r from-orange-50 to-orange-100/50 border border-orange-100/80 rounded-2xl p-3.5 flex items-center gap-3.5 shadow-sm"
              >
                <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shrink-0 shadow-sm border border-orange-50">
                  <span className="text-xl">🛵</span>
                </div>
                <div>
                  <h4 className="font-black text-[#FA4A0C] text-[13px] leading-tight tracking-tight">Estrella Eats te lo lleva</h4>
                  <p className="text-[11px] text-orange-900/60 font-medium leading-tight mt-0.5">Rápido y calientito hasta tu puerta</p>
                </div>
              </motion.div>


              {/* WIDGET DE LEALTAD EN PASO 1 - si ya verificó tel en esta sesión */}
              {didInitLoyalty && datosCliente && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`rounded-3xl p-4 border flex items-center gap-3 ${
                    datosCliente.envios_gratis > 0 || datosCliente.puntos >= 6
                      ? 'bg-gradient-to-r from-orange-50 to-amber-50 border-orange-200'
                      : 'bg-blue-50 border-blue-100'
                  }`}
                >
                  <div className={`w-10 h-10 rounded-2xl flex items-center justify-center text-xl shrink-0 ${
                    datosCliente.envios_gratis > 0 || datosCliente.puntos >= 6 ? 'bg-orange-100' : 'bg-blue-100'
                  }`}>
                    {datosCliente.envios_gratis > 0 || datosCliente.puntos >= 6 ? '🎁' : '⭐'}
                  </div>
                  <div className="flex-1 min-w-0">
                    {datosCliente.envios_gratis > 0 || datosCliente.puntos >= 6 ? (
                      <>
                        <p className="text-xs font-black text-orange-900">Cliente Estrella {datosCliente.nombre ? `· ${datosCliente.nombre}` : ''}</p>
                        <p className="text-[11px] text-orange-700 font-medium">Sigue al paso 3 para desbloquear tu envío gratis 🚀</p>
                      </>
                    ) : (
                      <>
                        <p className="text-xs font-black text-blue-900">Tu lealtad te premia</p>
                        <div className="flex items-center gap-1.5 mt-1">
                          {[...Array(6)].map((_, i) => (
                            <div key={i} className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                              i < datosCliente.puntos
                                ? 'bg-blue-500 border-blue-500'
                                : 'bg-white border-blue-200'
                            }`}>
                              {i < datosCliente.puntos && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                            </div>
                          ))}
                          <span className="text-[10px] font-bold text-blue-600 ml-1">{datosCliente.puntos}/6</span>
                        </div>
                      </>
                    )}
                  </div>
                </motion.div>
              )}

              <div className="px-2 mt-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-orange-500/5 rounded-bl-full pointer-events-none"></div>
                <h4 className="font-bold text-sm mb-3 flex items-center gap-2 relative z-10"><Ticket size={16} className="text-[#FA4A0C]"/> ¿Tienes un cupón promocional?</h4>
                <div className="flex gap-2 relative z-10">
                  <input type="text" placeholder="CÓDIGO" value={cuponCliente} onChange={e => {setCuponCliente(e.target.value.toUpperCase()); setCuponValido(false); setDescuento(0)}} className="flex-1 bg-white border border-slate-200 shadow-inner rounded-xl px-4 py-3 text-sm font-bold uppercase outline-none focus:border-[#FA4A0C] focus:ring-2 focus:ring-orange-500/10 transition-all" disabled={validandoCupon} />
                  <button onClick={validarCuponBtn} disabled={validandoCupon || !cuponCliente.trim()} className="bg-slate-900 text-white px-5 py-3 rounded-xl text-sm font-bold hover:bg-slate-800 transition-colors disabled:opacity-50 shadow-md">
                    {validandoCupon ? <Loader2 className="w-5 h-5 animate-spin"/> : 'Aplicar'}
                  </button>
                </div>
                <AnimatePresence>
                  {cuponValido && (
                    <motion.p initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="text-green-600 text-xs font-bold mt-3 flex items-center gap-1 bg-green-50 p-2 rounded-lg border border-green-100">
                      <CheckCircle2 size={14}/> Cupón aplicado con éxito. Ahorras ${descuento.toFixed(2)}
                    </motion.p>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          )}

          {/* PASO 2: DATOS DEL CLIENTE */}
          {checkoutStep === 2 && (
            <motion.div key="step2" initial={{ x: 50, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -50, opacity: 0 }} className="space-y-5">
              <div className="mb-6 px-2">
                <div className="flex items-center gap-3 mb-6">
                   <div className="w-12 h-12 bg-blue-50/80 rounded-full flex items-center justify-center"><Info size={22} className="text-blue-500" /></div>
                   <div>
                     <h3 className="font-black text-xl leading-tight">Tus Datos</h3>
                     <p className="text-[13px] text-slate-500 font-medium">Para contactarte sobre tu pedido</p>
                   </div>
                </div>
                
                <div className="space-y-5">
                  <div>
                    <label className="block text-[12px] font-bold text-slate-400 uppercase tracking-widest mb-2 pl-1">Tu Nombre Completo</label>
                    <input type="text" value={clienteNombre} onChange={(e) => setClienteNombre(e.target.value)} placeholder="Ej. Juan Pérez" className="w-full bg-slate-100/80 border-0 rounded-2xl px-5 py-4 text-[15px] outline-none focus:bg-orange-50 focus:ring-2 focus:ring-[#FA4A0C]/20 transition-all font-bold text-slate-800 shadow-inner" />
                  </div>
                  <div>
                    <label className="block text-[12px] font-bold text-slate-400 uppercase tracking-widest mb-2 pl-1">
                      Teléfono (WhatsApp)
                    </label>
                    <div className="relative">
                      <span className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-[15px]">+52</span>
                      <input type="tel" value={clienteTel} onChange={(e) => {setClienteTel(e.target.value); setTelError(false);}} placeholder="123 456 7890" maxLength={10} className={`w-full pl-14 bg-slate-100/80 border-0 ${telError ? 'focus:bg-red-50 focus:ring-red-400/20' : 'focus:bg-orange-50 focus:ring-[#FA4A0C]/20'} focus:ring-2 rounded-2xl px-5 py-4 outline-none transition-all font-bold tracking-wide text-[16px] text-slate-800 shadow-inner`} />
                    </div>
                    {telError && <p className="text-red-500 text-xs mt-1.5 pl-1 flex items-center gap-1"><AlertCircle size={12}/> Ingresa 10 dígitos válidos</p>}

                    
                    {/* Estado: verificando */}
                    <AnimatePresence mode="wait">
                      {!telError && clienteTel.replace(/\D/g, '').length === 10 && checkingLoyalty && (
                        <motion.div
                          key="checking"
                          initial={{ opacity: 0, y: -6 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -6 }}
                          className="mt-3 p-4 rounded-xl border border-orange-200 bg-orange-50 flex items-center gap-3"
                        >
                          <div className="w-9 h-9 rounded-full bg-white border border-orange-200 flex items-center justify-center shrink-0 shadow-sm">
                            <Loader2 size={20} className="animate-spin text-[#FA4A0C]" />
                          </div>
                          <div>
                            <p className="text-sm font-black text-orange-900">Verificando tu lealtad...</p>
                            <p className="text-[11px] text-orange-600 font-medium mt-0.5">Buscando tus beneficios de Cliente Estrella</p>
                          </div>
                        </motion.div>
                      )}

                      {/* Estado: resultado */}
                      {!telError && clienteTel.replace(/\D/g, '').length === 10 && !checkingLoyalty && didInitLoyalty && (
                        <motion.div
                          key="result"
                          initial={{ opacity: 0, scale: 0.97, y: -6 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          exit={{ opacity: 0, y: -6 }}
                          transition={{ type: 'spring', stiffness: 300, damping: 24 }}
                          className={`mt-3 p-4 rounded-xl border flex items-start gap-3 ${
                            (datosCliente?.envios_gratis || 0) > 0 || (datosCliente?.puntos || 0) >= 6
                              ? 'bg-orange-50 border-orange-200'
                              : 'bg-blue-50 border-blue-200'
                          }`}
                        >
                          {(datosCliente?.envios_gratis || 0) > 0 || (datosCliente?.puntos || 0) >= 6 ? (
                            <>
                              <div className="w-9 h-9 rounded-full bg-orange-100 border border-orange-200 flex items-center justify-center shrink-0 text-xl shadow-sm">🎁</div>
                              <div>
                                <p className="text-sm font-black text-orange-900">¡Tienes una sorpresa!</p>
                                <p className="text-[12px] text-orange-700 font-medium mt-0.5 leading-snug">Por ser Cliente Estrella, sigue al siguiente paso para ver tu beneficio especial.</p>
                              </div>
                            </>
                          ) : (
                            <>
                              <div className="w-9 h-9 rounded-full bg-blue-100 border border-blue-200 flex items-center justify-center shrink-0 text-xl shadow-sm">🛵</div>
                              <div>
                                <p className="text-sm font-black text-blue-900">¡Tu 6to envío es GRATIS!</p>
                                <p className="text-[12px] text-blue-700 font-medium mt-0.5">
                                  Llevas <span className="font-black bg-blue-100 px-1.5 py-0.5 rounded text-blue-900">{datosCliente?.puntos || 0} de 6</span> pedidos. ¡Sigue ordenando!
                                </p>
                              </div>
                            </>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* PASO 3: ENTREGA Y MAPA */}
          {checkoutStep === 3 && (
            <motion.div key="step3" initial={{ x: 50, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -50, opacity: 0 }} className="space-y-5">
              <div className="px-2 mt-6">
                {(!ubicacionGPS || tipoEntrega !== 'domicilio') && (
                  <>
                    <h3 className="font-black text-xl mb-4">¿Cómo quieres recibirlo?</h3>
                    <div className="flex gap-3">
                      <button onClick={() => setTipoEntrega('domicilio')} className={`flex-1 py-5 rounded-3xl border-0 font-bold flex flex-col items-center gap-2 transition-all shadow-inner ${tipoEntrega === 'domicilio' ? 'bg-[#FA4A0C]/10 text-[#FA4A0C] ring-2 ring-[#FA4A0C]/30' : 'bg-slate-100/80 text-slate-500 hover:bg-slate-100'}`}>
                        <span className="text-3xl mb-1">🛵</span> <span className="text-[15px]">A Domicilio</span>
                      </button>
                      <button onClick={() => setTipoEntrega('tienda')} className={`flex-1 py-5 rounded-3xl border-0 font-bold flex flex-col items-center gap-2 transition-all shadow-inner ${tipoEntrega === 'tienda' ? 'bg-[#FA4A0C]/10 text-[#FA4A0C] ring-2 ring-[#FA4A0C]/30' : 'bg-slate-100/80 text-slate-500 hover:bg-slate-100'}`}>
                        <span className="text-3xl mb-1">🏪</span> <span className="text-[15px]">En Tienda</span>
                      </button>
                    </div>
                  </>
                )}
                  <AnimatePresence>
                  {tipoEntrega === 'domicilio' && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className={ubicacionGPS ? "mt-0" : "mt-6"}>
                      {ubicacionGPS ? (
                        <div className="mb-6 mt-2">
                          <div className="flex justify-between items-center mb-3">
                            <div className="flex items-center gap-2">
                              <MapPin size={22} className="text-[#FA4A0C] shrink-0" />
                              <span className="font-black text-slate-800 text-[15px] whitespace-nowrap">Entregar en</span>
                              {costoEnvio === 0 && <span className="bg-green-100 text-green-700 px-1.5 py-0.5 rounded text-[10px] font-bold flex items-center gap-1 ml-1"><Star size={10} className="fill-green-700"/> ¡GRATIS!</span>}
                            </div>
                            <button onClick={() => setIsMapModalOpen(true)} className="text-[#FA4A0C] text-[13px] font-bold hover:underline transition-colors shrink-0">Cambiar</button>
                          </div>
                          
                          <p className="text-[14px] text-slate-600 mb-4 leading-relaxed pl-7">{direccionEntrega}</p>
                          
                          <div className="mt-2 pl-7 relative">
                            {costoEnvio === 0 ? (
                              <label className="text-[13px] font-bold text-[#FA4A0C] mb-2 flex items-center gap-1.5"><Gift size={16} /> ¡Envío GRATIS! Ayúdanos con una referencia.</label>
                            ) : (
                              <label className="text-[13px] font-bold text-slate-500 mb-2 block">Referencia para encontrar tu casa (Opcional)</label>
                            )}
                            <textarea rows={2} value={direccionReferencias} onChange={(e) => setDireccionReferencias(e.target.value)} placeholder="Ej. Casa verde, portón negro..." className="w-full bg-slate-100/80 border-0 rounded-2xl px-5 py-4 text-[15px] outline-none focus:bg-orange-50 focus:ring-2 focus:ring-[#FA4A0C]/20 transition-all resize-none text-slate-800 placeholder:text-slate-400 shadow-inner" />
                          </div>

                        </div>
                      ) : (
                        <button onClick={() => setIsMapModalOpen(true)} className="w-full bg-slate-900 text-white py-5 rounded-[24px] font-bold text-[16px] flex items-center justify-center gap-2.5 hover:bg-slate-800 transition-colors shadow-xl mb-4 mt-6">
                          <MapPin size={20}/> Indicar en el mapa dónde entregar
                        </button>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* VIP LEALTAD WIDGET EN PASO 3 (Siempre visible aquí) */}
                {datosCliente && !calculandoEnvio && (tipoEntrega === 'tienda' || ubicacionGPS) && (
                  <div className="mt-6 mb-2 bg-gradient-to-br from-amber-50 to-orange-50 rounded-[24px] p-4 shadow-sm overflow-hidden relative">
                    <div className="absolute -right-4 -top-4 text-amber-200/40 transform rotate-12 pointer-events-none"><Star size={80} fill="currentColor" /></div>
                    {datosCliente.es_vip ? (
                      <div className="relative z-10 flex items-center justify-between">
                        <div>
                          <h4 className="font-black text-amber-900 flex items-center gap-1 text-sm"><Star size={14} className="text-amber-500 fill-amber-500"/> Cliente VIP</h4>
                          <p className="text-[10px] text-amber-800 mt-0.5 font-medium">Saldo: <b className="text-amber-900">${datosCliente.saldo.toFixed(2)}</b></p>
                        </div>
                        {!usarSaldoVip ? (
                          <button onClick={() => setUsarSaldoVip(true)} className="bg-amber-500 hover:bg-amber-600 transition-colors text-white px-3 py-1.5 rounded-lg font-bold text-[11px] shadow-md">Usar Saldo</button>
                        ) : (
                          <motion.div initial={{ opacity: 0, width: 0 }} animate={{ opacity: 1, width: 'auto' }} className="flex gap-2">
                             <input type="number" value={montoSaldoVip} onChange={e => setMontoSaldoVip(e.target.value)} placeholder="$0.00" className="w-16 bg-white border border-amber-200 focus:border-amber-400 focus:ring-2 focus:ring-amber-500/20 rounded-lg px-2 py-1 text-[11px] font-bold outline-none transition-all" />
                             <input type="password" value={pinVip} onChange={e => { setPinVip(e.target.value.replace(/\D/g, '')); setPinError(false); }} maxLength={4} placeholder="PIN" className={`w-12 bg-white border ${pinError ? 'border-red-400 focus:ring-red-400/20' : 'border-amber-200 focus:border-amber-400 focus:ring-amber-500/20'} focus:ring-2 rounded-lg px-2 py-1 text-[11px] text-center font-black tracking-widest outline-none transition-all`} />
                             <button onClick={handlePinVerify} disabled={verificandoPin || pinVip.length < 4} className="bg-amber-900 text-white rounded-lg px-2 text-[11px] font-bold shadow-md hover:bg-amber-950 transition-colors disabled:opacity-50 flex justify-center items-center">
                               {verificandoPin ? <Loader2 size={12} className="animate-spin" /> : 'OK'}
                             </button>
                          </motion.div>
                        )}
                      </div>
                    ) : (
                      costoEnvioCalculado > 0 && (datosCliente.envios_gratis > 0 || datosCliente.puntos >= 6) && (
                        <div className="flex justify-between items-center relative z-10">
                           <div>
                             <h4 className="font-black text-amber-900 flex items-center gap-1.5 text-[13px] leading-none">🎁 Envío Gratis</h4>
                             <p className="text-[10px] text-amber-800 mt-1 font-medium leading-none">Tu recompensa estrella</p>
                           </div>
                           <label className="relative inline-flex items-center cursor-pointer scale-90 origin-right">
                            <input type="checkbox" className="sr-only peer" checked={usarBeneficioNormal} onChange={e => setUsarBeneficioNormal(e.target.checked)}/>
                            <div className="w-11 h-6 bg-amber-200/50 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-amber-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-amber-200 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
                           </label>
                        </div>
                      )
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* PASO 4: MÉTODO DE PAGO */}
          {checkoutStep === 4 && (
            <motion.div key="step4" initial={{ x: 50, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -50, opacity: 0 }} className="space-y-5">
               <div className="px-2 mt-6">
                <h3 className="font-black text-lg mb-4">¿Cómo vas a pagar?</h3>
                 <div className="space-y-3">
                   <button onClick={() => setMetodoPago('efectivo')} className={`w-full py-5 px-5 rounded-2xl border-2 font-bold flex items-center gap-4 transition-all ${metodoPago === 'efectivo' ? 'border-green-500 bg-green-50 shadow-sm' : 'border-slate-100 hover:border-slate-200 hover:bg-slate-50'}`}>
                     <span className="text-3xl bg-white rounded-full p-1 shadow-sm">💵</span>
                     <span className="flex-1 text-left text-[15px]">Efectivo al recibir</span>
                     {metodoPago === 'efectivo' && <CheckCircle2 size={20} className="text-green-500" />}
                   </button>
                   
                   <AnimatePresence>
                     {metodoPago === 'efectivo' && (
                       <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="px-2 pb-2">
                         <div className="bg-green-50/50 p-4 rounded-xl border border-green-100">
                           <label className="text-xs font-bold text-green-800 mb-2 block uppercase tracking-wide">¿Con qué billete pagas?</label>
                           <input type="number" placeholder={`Ej. ${Math.ceil(total / 100) * 100}`} value={montoEfectivo} onChange={e => setMontoEfectivo(e.target.value)} className="w-full bg-white border border-green-200 rounded-xl px-4 py-3 outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20 font-black text-lg shadow-sm transition-all" />
                           <p className="text-[10px] text-green-600 mt-2">Para llevarte el cambio exacto.</p>
                         </div>
                       </motion.div>
                     )}
                   </AnimatePresence>

                   {restaurante?.acepta_pago_online && (
                     <button onClick={() => setMetodoPago('en_linea')} className={`w-full py-5 px-5 rounded-2xl border-2 font-bold flex items-center gap-4 transition-all ${metodoPago === 'en_linea' ? 'border-[#FA4A0C] bg-[#FA4A0C]/5 shadow-sm' : 'border-slate-100 hover:border-slate-200 hover:bg-slate-50'}`}>
                       <span className="text-3xl bg-white rounded-full p-1 shadow-sm">💳</span>
                       <div className="flex-1 text-left">
                         <span className="block text-[15px]">Pago en Línea</span>
                         <span className="block text-[11px] text-slate-500 font-medium">Tarjeta o Mercado Pago</span>
                       </div>
                       {metodoPago === 'en_linea' && <CheckCircle2 size={20} className="text-[#FA4A0C]" />}
                     </button>
                   )}
                 </div>
               </div>
            </motion.div>
          )}
          {/* PASO 5: REVISIÓN FINAL */}
          {checkoutStep === 5 && (
            <motion.div key="step5" initial={{ x: 50, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -50, opacity: 0 }} className="space-y-6">
              <div className="px-2">
                <div className="flex items-center gap-3 mb-4">
                   <div className="w-10 h-10 bg-green-50/80 rounded-full flex items-center justify-center"><CheckCircle2 size={20} className="text-green-500" /></div>
                   <div>
                     <h3 className="font-black text-lg leading-tight">Revisión Final</h3>
                   </div>
                </div>

                <div className="bg-slate-50/80 border border-slate-100 rounded-[24px] p-5 space-y-4">
                  {/* Tu Pedido */}
                  <div className="flex justify-between items-center">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Tu Pedido</p>
                    <p className="text-sm font-bold text-slate-800">{carrito.length} artículos</p>
                  </div>
                  
                  {/* Entrega */}
                  <div className="border-t border-slate-200/60 pt-4 flex justify-between items-center gap-4">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest shrink-0">{tipoEntrega === 'domicilio' ? 'Domicilio' : 'Tienda'}</p>
                    <p className="text-[13px] font-bold text-slate-800 line-clamp-1 text-right">{tipoEntrega === 'domicilio' ? direccionEntrega : 'Recoger en local'}</p>
                  </div>
                  
                  {/* Pago */}
                  <div className="border-t border-slate-200/60 pt-4 flex justify-between items-center">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest shrink-0">Pago</p>
                    <p className="text-[13px] font-bold text-slate-800 text-right">
                      {metodoPago === 'efectivo' ? `Efectivo ${montoEfectivo ? '($' + montoEfectivo + ')' : ''}` : 'En Línea'}
                    </p>
                  </div>

                  {/* Totals */}
                  <div className="border-t-2 border-dashed border-slate-200 pt-4 space-y-2">
                    <div className="flex justify-between text-[13px] text-slate-500 font-medium">
                      <span>Subtotal</span><span className="font-bold text-slate-700">${subtotal.toFixed(2)}</span>
                    </div>
                    {descuentoTotal > 0 && (
                      <div className="flex justify-between text-[13px] text-green-500 font-medium">
                        <span>Descuento</span><span className="font-bold">-${descuentoTotal.toFixed(2)}</span>
                      </div>
                    )}
                    {tipoEntrega === 'domicilio' && (
                      <div className="flex justify-between text-[13px] text-slate-500 font-medium items-center">
                        <span>Envío</span>
                        <span className="font-bold text-slate-800">{calculandoEnvio ? <Loader2 size={10} className="animate-spin inline" /> : costoEnvioFinal === 0 ? <span className="text-green-500">GRATIS</span> : `+$${costoEnvioFinal.toFixed(2)}`}</span>
                      </div>
                    )}
                    
                    <div className="flex justify-between items-end pt-3 mt-1 border-t border-slate-200/60">
                      <span className="font-black text-slate-800 text-[16px]">Total</span>
                      <motion.span
                        key={Math.round(displayTotal)}
                        className="font-black text-[28px] text-[#FA4A0C] leading-none tabular-nums"
                      >
                        ${displayTotal.toFixed(2)}
                      </motion.span>
                    </div>
                  </div>
                </div>
                
                {ahorroTotal > 0 && (
                  <div className="flex items-center justify-center gap-1.5 mt-3 text-[11px] font-bold text-green-600 bg-green-50 py-1.5 rounded-full mx-auto w-max px-3 border border-green-100">
                    <Star size={12} className="fill-green-600" /> ¡Ahorraste ${ahorroTotal.toFixed(2)}!
                  </div>
                )}
              </div>
            </motion.div>
          )}

        </AnimatePresence>
        
        {/* BOTÓN DE NAVEGACIÓN FIJO (Ocupa poco espacio) */}
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/95 backdrop-blur-md border-t border-slate-100 z-40 shadow-[0_-10px_30px_rgba(0,0,0,0.05)]">
          <div className="max-w-lg mx-auto">
          {checkoutStep < 5 ? (
            <button 
              onClick={() => {
                if (checkoutStep === 2 && (clienteTel.replace(/\D/g, '').length !== 10 || !clienteNombre.trim())) {
                  setTelError(clienteTel.replace(/\D/g, '').length !== 10);
                  showToast('Error', 'Completa tus datos correctamente', 'error');
                  return;
                }
                if (checkoutStep === 3 && (!tipoEntrega || (tipoEntrega === 'domicilio' && (!direccionEntrega || fueraDeCobertura)))) {
                  showToast('Error', 'Completa los datos de entrega', 'error');
                  return;
                }
                if (checkoutStep === 4 && metodoPago === 'efectivo') {
                  const montoInt = parseFloat(montoEfectivo || '0');
                  if (montoInt < total) {
                    showToast('Error', `El monto debe ser mayor o igual al total ($${total.toFixed(2)})`, 'error');
                    return;
                  }
                }
                setCheckoutStep(checkoutStep + 1);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              disabled={!isStepValid() || checkingLoyalty}
              className="w-full bg-gradient-to-r from-slate-900 to-slate-800 text-white py-4 rounded-[20px] font-black text-lg active:scale-[0.98] transition-all disabled:opacity-50 disabled:active:scale-100 shadow-xl shadow-slate-900/20"
            >
              {checkingLoyalty && checkoutStep === 2 ? 'Verificando...' : getBotonText()}
            </button>
          ) : (
            <button 
              onClick={handlePedir}
              disabled={procesando || !metodoPago}
              className="w-full bg-gradient-to-r from-[#FA4A0C] to-[#ff6a36] text-white py-4 rounded-[20px] font-black text-lg active:scale-[0.98] transition-all disabled:opacity-50 disabled:active:scale-100 shadow-xl shadow-orange-500/30 flex items-center justify-center gap-2"
            >
              {procesando ? <Loader2 size={24} className="animate-spin" /> : '¡Confirmar y Pedir!'}
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
                <button onClick={obtenerUbicacionGPS} className="w-12 h-12 bg-white rounded-full shadow-lg flex items-center justify-center text-slate-700 hover:text-[#FA4A0C] transition-colors">
                  {buscandoGPS ? <Loader2 className="animate-spin" /> : <LocateFixed size={20} />}
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
                    <MapPin className="text-[#FA4A0C] w-12 h-12 fill-[#FA4A0C]" />
                    <div className="w-4 h-1 bg-black/20 rounded-full mx-auto mt-1 blur-[1px]"></div>
                  </div>
                </div>
              ) : (
                <div className="w-full h-full flex items-center justify-center"><Loader2 className="animate-spin text-[#FA4A0C] w-10 h-10"/></div>
              )}
            </div>
            <div className="p-5 bg-white z-20 shadow-[0_-10px_20px_rgba(0,0,0,0.05)] rounded-t-[32px] relative -mt-4">
              <button onClick={handleConfirmarUbicacion} disabled={!draftUbicacion && !ubicacionGPS} className="w-full bg-gradient-to-r from-[#FA4A0C] to-[#ff6a36] text-white py-4 rounded-2xl font-black text-lg disabled:opacity-50 shadow-xl shadow-orange-500/30 active:scale-[0.98] transition-all">
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
              <div className="w-20 h-20 bg-orange-50 rounded-full flex items-center justify-center mx-auto mb-5">
                <ShieldCheck size={40} className="text-[#FA4A0C]" />
              </div>
              <h3 className="font-black text-xl mb-2 text-slate-800">Verifica tu pedido</h3>
              <p className="text-sm text-slate-500 mb-6 font-medium">Ingresa el PIN de 4 dígitos enviado a tu WhatsApp al número <b className="text-slate-700">{clienteTel}</b></p>
              <input type="text" value={otpCode} onChange={e => setOtpCode(e.target.value.replace(/\D/g, ''))} maxLength={4} autoFocus className="w-full bg-slate-50 text-center text-3xl font-black tracking-[0.5em] py-4 rounded-2xl outline-none border border-slate-200 focus:border-[#FA4A0C] focus:ring-4 ring-orange-500/10 mb-6 transition-all text-slate-800" />
              <button onClick={handleVerifyOtp} disabled={otpCode.length < 4 || verificandoOtp} className="w-full bg-gradient-to-r from-[#FA4A0C] to-[#ff6a36] text-white font-black py-4 rounded-2xl disabled:opacity-50 shadow-xl shadow-orange-500/30 flex items-center justify-center gap-2">
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
