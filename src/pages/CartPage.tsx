import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { cartRestaurantOrigin } from '../lib/restaurantBranches';
import { useCartStore } from '../store/useCartStore';
import { motion, AnimatePresence, MotionConfig } from 'framer-motion';
import { 
  Plus, Minus, X, CheckCircle2, AlertCircle,
  Loader2, MapPin, Star, ShieldCheck,
  ShoppingBag, ArrowRight, Gift, Utensils, User, Phone, CreditCard, Banknote, Bike, Store, Tag
} from 'lucide-react';
import DeliveryLocationPicker from '../components/DeliveryLocationPicker';
import { canConfirmLocation, isDeliveryCoordinates, readSavedCoordinates } from '../lib/deliveryLocation';
import type { DeliveryCoordinates, DeliveryLocation } from '../lib/deliveryLocation';
import { useDeliveryCalculation } from '../hooks/useDeliveryCalculation';
import { useCheckoutLoyalty } from '../hooks/useCheckoutLoyalty';
import { useFirstDeliveryCoupon } from '../hooks/useFirstDeliveryCoupon';
import { checkPromotionEligibility, usePromotionEligibility } from '../hooks/usePromotionEligibility';
import { firstDeliverySaving, isFirstDeliveryCode } from '../lib/firstDeliveryCoupon';
import { ACTIVE_ORDER_STATES } from '../utils/orderState';
import { CheckoutHeader, CheckoutAction } from '../components/CheckoutChrome';
import CheckoutStepScene from '../components/CheckoutStepScene';
import type { CheckoutStepDirection } from '../components/CheckoutStepScene';
import './CartPage.css';
import { AnimatedCount, AnimatedMoney } from '../components/AnimatedCount';

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
  menu_item_id?: string;
}

interface Restaurante {
  id: string;
  nombre: string;
  lat: number | null;
  lng: number | null;
  activo: boolean;
  acepta_pago_online: boolean;
  maps_url: string;
  foto_fachada_url: string;
}

const LazyImage = ({ src, alt, className }: { src?: string | null, alt?: string, className?: string }) => {
  const [loaded, setLoaded] = useState(false);
  const [failedSource, setFailedSource] = useState<string | null>(null);
  if (!src || failedSource === src) return <div className={`w-full h-full bg-slate-50/80 flex items-center justify-center ${className || ''}`}><Utensils size={28} className="text-slate-300" aria-hidden="true" /></div>;
  return (
    <div className={`relative overflow-hidden bg-slate-100 ${className || ''}`}>
      {!loaded && <div className="absolute inset-0 bg-slate-200 animate-pulse z-10" />}
      <img
        src={src}
        alt={alt || ''}
        loading="lazy"
        onLoad={() => setLoaded(true)}
        onError={() => setFailedSource(src)}
        className={`relative z-20 w-full h-full object-cover transition-opacity duration-500 ${loaded ? 'opacity-100' : 'opacity-0'}`}
      />
    </div>
  )
}

// Helper para scroll suave garantizado en todos los móviles (iOS Safari a veces ignora behavior: 'smooth')
const smoothScroll = (element: HTMLElement | null, target: number, duration: number) => {
  if (!element) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    element.scrollTop = target;
    return;
  }
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

  const [restaurante, setRestaurante] = useState<Restaurante | null>(null);
  const [loading, setLoading] = useState(true);
  const [restaurantError, setRestaurantError] = useState('');
  const [restaurantRetry, setRestaurantRetry] = useState(0);
  
  const carrito = useCartStore(state => state.carrito as { item: CartItem, cantidad: number }[]);
  const _clearCart = useCartStore(state => state.clearCart);

  const checkoutStep = useCartStore(state => state.checkoutStep);
  const setCheckoutStep = useCartStore(state => state.setCheckoutStep);
  const [stepDirection, setStepDirection] = useState<CheckoutStepDirection>(1);
  const [stepChanging, setStepChanging] = useState(false);
  const stepTransitionRef = useRef(false);

  const clienteNombre = useCartStore(state => state.clienteNombre);
  const setClienteNombre = useCartStore(state => state.setClienteNombre);
  
  const clienteTel = useCartStore(state => state.clienteTel);
  const setClienteTel = useCartStore(state => state.setClienteTel);

  const tipoEntrega = useCartStore(state => state.tipoEntrega);
  const setTipoEntrega = useCartStore(state => state.setTipoEntrega);
  const promotionIds = carrito.filter(line => line.item.tipo === 'promo').map(line => line.item.id);
  const promotionEligibility = usePromotionEligibility(restaurante?.id, promotionIds, tipoEntrega);
  
  const direccionEntrega = useCartStore(state => state.direccionEntrega);
  const setDireccionEntrega = useCartStore(state => state.setDireccionEntrega);
  
  const cuponCliente = useCartStore(state => state.cuponCliente);
  const setCuponCliente = useCartStore(state => state.setCuponCliente);
  
  const descuento = useCartStore(state => state.descuento);
  const setDescuento = useCartStore(state => state.setDescuento);
  
  const cuponValido = useCartStore(state => state.cuponValido);
  const setCuponValido = useCartStore(state => state.setCuponValido);
  const [couponOpen, setCouponOpen] = useState(cuponValido);
  
  const metodoPago = 'efectivo';
  const setMetodoPago = useCartStore(state => state.setMetodoPago);

  const [telError, setTelError] = useState(false);
  const { loyalty, retry: retryLoyalty } = useCheckoutLoyalty(clienteTel);
  const datosCliente = loyalty.status === 'found' ? loyalty.customer : null;
  const checkingLoyalty = loyalty.status === 'loading';

  const [ubicacionGPS, setUbicacionGPS] = useState<DeliveryCoordinates | null>(() =>
    readSavedCoordinates(sessionStorage.getItem('est_ubicacion')));
  
  const [direccionReferencias, setDireccionReferencias] = useState(() => sessionStorage.getItem('est_referencias') || '');
  
  const [isMapModalOpen, setIsMapModalOpen] = useState(false);
  
  const [cuponPlataformaIdManual, setCuponPlataformaIdManual] = useState<string | null>(null);
  const [validandoCupon, setValidandoCupon] = useState(false);
  const [costoEnvioFijoOverride, setCostoEnvioFijoOverride] = useState<number | null>(null);

  const [montoEfectivo, setMontoEfectivo] = useState('');
  const [procesando, setProcesando] = useState(false);
  
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [otpChallenge, setOtpChallenge] = useState<string | null>(null);
  const pendingCheckoutRef = useRef<{payload: ReturnType<typeof generarPayloadPedido>; carrito: {item: CartItem; cantidad: number}[]} | null>(null);
  useEffect(() => { setMetodoPago('efectivo'); }, [setMetodoPago]);
  const [otpCode, setOtpCode] = useState('');
  const [verificandoOtp, setVerificandoOtp] = useState(false);
  
  const [toastMsg, setToastMsg] = useState<{ title: string; message: string; type: 'success'|'error'|'loading' } | null>(null);
  
  const submittingRef = useRef(false);
  const [isExiting, setIsExiting] = useState(false);

  const [confettiActive, setConfettiActive] = useState(false);
  const prevIsFreeDelivery = useRef(false);

  // Generadores de IDs estables por sesión de pedido
  const idempotencyKeyRef = useRef<string | null>(null);
  const ticketIdRef = useRef<string | null>(null);

  // VIP
  const [usarBeneficioNormal, setUsarBeneficioNormal] = useState(false);
  const firstCoupon = useFirstDeliveryCoupon(cuponCliente, clienteTel, restaurante?.id, tipoEntrega);
  useEffect(() => {
    if (!firstCoupon.selected) return;
    setCuponValido(firstCoupon.eligible); setDescuento(0);
    setCostoEnvioFijoOverride(null); setCuponPlataformaIdManual(null); setUsarBeneficioNormal(false);
  }, [firstCoupon.selected, firstCoupon.eligible, setCuponValido, setDescuento]);

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

  // Sincronizar el estado del carrito (tienda vs domicilio) con la preferencia global del header
  useEffect(() => {
    const globalType = sessionStorage.getItem('est_delivery_type');
    if (globalType === 'recoger') {
      setTipoEntrega('tienda');
    } else if (globalType === 'domicilio') {
      setTipoEntrega('domicilio');
    }
  }, [setTipoEntrega]);

  useEffect(() => {
    if (ubicacionGPS) sessionStorage.setItem('est_ubicacion', JSON.stringify(ubicacionGPS));
    else sessionStorage.removeItem('est_ubicacion');
  }, [ubicacionGPS]);

  useEffect(() => {
    sessionStorage.setItem('est_referencias', direccionReferencias);
  }, [direccionReferencias]);

  // Cargar info del restaurante
  useEffect(() => {
    let current = true;
    const controller = new AbortController();
    const loadRestaurante = async () => {
      setLoading(true); setRestaurantError('');
      try {
        if (!id) throw new Error('No encontramos el restaurante. Vuelve al menú para elegir uno.');
        const cartOwner = cartRestaurantOrigin(useCartStore.getState().restaurantId, sessionStorage.getItem('est_carrito_restaurante'));
        if (id === 'global') {
          if (useCartStore.getState().carrito.length === 0) return;
          if (!cartOwner) throw new Error('Este pedido viene de una versión anterior y no podemos identificar su sucursal. Empieza un pedido nuevo para confirmar el menú y los precios actuales.');
          navigate(`/menu/${cartOwner}/carrito`, {replace:true});
          return;
        }
        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
        const query = supabase.from('restaurantes').select('id,nombre,nombre_sucursal,matriz_id,lat,lng,activo,foto_fachada_url');
        const {data, error} = await query.eq(isUUID ? 'id' : 'slug', id).limit(1)
          .abortSignal(AbortSignal.any([controller.signal, AbortSignal.timeout(10000)])).maybeSingle();
        if (!current) return;
        if (error) throw new Error('No pudimos cargar el restaurante. Revisa tu conexión e intenta de nuevo; tu carrito sigue aquí.');
        const raw: unknown = data;
        if (!raw || typeof raw !== 'object' || !('id' in raw) || typeof raw.id !== 'string' || !('nombre' in raw) || typeof raw.nombre !== 'string')
          throw new Error('No encontramos el restaurante. Vuelve al menú para elegir uno.');
        if (useCartStore.getState().carrito.length > 0 && cartOwner !== raw.id) throw new Error('Tu pedido pertenece a otra ubicación. Vuelve al menú de la sucursal donde lo empezaste.');
        if (cartOwner === raw.id) useCartStore.getState().setRestaurantId(raw.id);
        const branchName = 'nombre_sucursal' in raw && typeof raw.nombre_sucursal === 'string' ? raw.nombre_sucursal : '';
        setRestaurante({id: raw.id, nombre: branchName ? `${raw.nombre} · ${branchName}` : raw.nombre,
          lat: 'lat' in raw && typeof raw.lat === 'number' && Number.isFinite(raw.lat) ? raw.lat : null,
          lng: 'lng' in raw && typeof raw.lng === 'number' && Number.isFinite(raw.lng) ? raw.lng : null,
          activo: 'activo' in raw && raw.activo === true,
          foto_fachada_url: 'foto_fachada_url' in raw && typeof raw.foto_fachada_url === 'string' ? raw.foto_fachada_url : '', maps_url: '', acepta_pago_online: false});
      } catch (error: unknown) {
        if (current) setRestaurantError(error instanceof Error ? error.message : 'No pudimos cargar el restaurante. Intenta de nuevo.');
      } finally { if (current) setLoading(false); }
    };
    void loadRestaurante();
    return () => {current = false; controller.abort();};
  }, [id, restaurantRetry, navigate]);

  // Only the current phone's successful lookup may activate its benefit.
  useEffect(() => {
    setUsarBeneficioNormal(datosCliente?.deliveryBenefit===true);
  }, [datosCliente]);

  const _addToCart = useCartStore(state => state.addToCart);
  const addToCart = (product: CartItem) => _addToCart(product);

  const _removeFromCart = useCartStore(state => state.removeFromCart);
  const removeFromCart = (cartItemId: string) => _removeFromCart(cartItemId);

  const handleConfirmarUbicacion = (location: DeliveryLocation) => {
    if (!canConfirmLocation(location, location.address)) return;
    setUbicacionGPS({ lat: location.lat, lng: location.lng });
    setDireccionEntrega(location.address);
    setIsMapModalOpen(false);
  };

  const validarCuponBtn = async () => {
    if (!cuponCliente.trim()) return;
    if (isFirstDeliveryCode(cuponCliente)) { firstCoupon.retry(); return; }
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


  // CALCULOS DE SUBTOTAL Y ENVIO
  const subtotal = carrito.reduce((sum, p) => sum + (p.item.precio * p.cantidad), 0);
  const itemsSubsidio = carrito.filter(p => p.item.aplica_subsidio !== false && String(p.item.aplica_subsidio).toLowerCase() !== 'false');
  const cantidadSubsidio = itemsSubsidio.reduce((sum, p) => sum + p.cantidad, 0);
  const bolsaSubsidio = cantidadSubsidio * 8;
  
  // Solo aplicar el beneficio de envío gratis si ya establecieron su ubicación (para no arruinar la sorpresa en el resumen)
  const isFreeDelivery = !firstCoupon.selected && usarBeneficioNormal && datosCliente?.deliveryBenefit===true && ubicacionGPS !== null && tipoEntrega === 'domicilio';
  
  const tarifaBaseEnvio = tipoEntrega === 'tienda' ? 0 : datosCliente?.vipDeliveryFee ?? costoEnvioBase;
  const costoEnvioCalculado = tarifaBaseEnvio > 0 ? Math.max(0, tarifaBaseEnvio - bolsaSubsidio) : 0;
  const costoEnvio = isFreeDelivery ? 0 : costoEnvioCalculado;
  const descuentoVip = 0; // Checkout currently accepts cash only; wallet redemption has its authenticated route.

  // Cupon manual aplicado
  let descuentoTotal = !firstCoupon.selected && cuponValido && descuento > 0 ? descuento : 0;
  // Bug fix: Solo aplicar el override si es menor al costo calculado real (para que el cupón de envío no suba el precio)
  let costoEnvioFinal = (cuponValido && costoEnvioFijoOverride !== null && costoEnvioFijoOverride < costoEnvio) 
    ? costoEnvioFijoOverride 
    : costoEnvio;
  const ahorroEstrella = firstDeliverySaving(costoEnvio, firstCoupon.eligible);
  if (firstCoupon.selected) costoEnvioFinal = Math.round((costoEnvio - ahorroEstrella) * 100) / 100;
  const entregaConfirmada = tipoEntrega === 'tienda' || (tipoEntrega === 'domicilio' && canConfirmLocation(ubicacionGPS, direccionEntrega) && !fueraDeCobertura && !calculandoEnvio);
  const textoEnvio = !ubicacionGPS ? 'Por confirmar' : calculandoEnvio ? 'Calculando...' : fueraDeCobertura ? 'No disponible'
    : costoEnvioFinal === 0 ? 'Gratis' : `$${costoEnvioFinal.toFixed(2)}`;

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

  // Keep the amount derived from the cart; only its visual presentation animates.
  const previousCashTotal = useRef(total);
  useEffect(() => {
    if (previousCashTotal.current === total) return;
    previousCashTotal.current = total;
    if (montoEfectivo && parseFloat(montoEfectivo) < total) {
      setMontoEfectivo('');
    }
  }, [total, montoEfectivo]);

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
    
    if (!idempotencyKeyRef.current) {
      idempotencyKeyRef.current = sessionStorage.getItem('est_checkout_id') || crypto.randomUUID();
      sessionStorage.setItem('est_checkout_id', idempotencyKeyRef.current);
      ticketIdRef.current = Math.random().toString(36).substring(2, 8).toUpperCase();
    }

    return {
      cliente_tel: clienteTel.replace(/\D/g, ''),
      items: carrito,
      cliente_nombre: clienteNombre.trim(),
      restaurante: restaurante?.nombre || '',
      restaurante_id: restaurante?.id || null,
      restaurante_lat: restaurante?.lat || null,
      restaurante_lng: restaurante?.lng || null,
      descripcion: pedidoCompleto,
      direccion: tipoEntrega === 'domicilio' ? direccionEntrega : null,
      referencias_entrega: tipoEntrega === 'domicilio' && direccionReferencias.trim() ? direccionReferencias.trim() : null,
      lat: tipoEntrega === 'domicilio' && ubicacionGPS ? ubicacionGPS.lat : null,
      lng: tipoEntrega === 'domicilio' && ubicacionGPS ? ubicacionGPS.lng : null,
      estado: 'pendiente',
      estado_cocina: 'pendiente',
      metodo_pago: metodoPago,
      total: total,
      monto_efectivo: Number(montoEfectivo || total),
      precio_entrega: costoEnvioCalculado, // El pago real que recibirá el repartidor (incluso si costoEnvioFinal es 0 para el cliente)
      tipo_pedido: tipoEntrega === 'domicilio' ? 'domicilio' : 'tienda',
      pin_seguridad: null,
      pickup_pin: Math.floor(1000 + Math.random() * 9000).toString(), // Generamos un PIN anti-robo de 4 dígitos
      wb_message_id: ticketIdRef.current,
      idempotency_key: idempotencyKeyRef.current,
      cupon_plataforma_id: cuponPlataformaIdManual || null,
      descuento_plataforma: descuentoTotal + (costoEnvioCalculado - costoEnvioFinal), // Registramos que hubo un descuento en el envío si aplica
      cupon_cliente: cuponCliente || null,
      usar_saldo_vip: false,
      monto_saldo_vip: 0,
      pin_vip: null,
      usar_beneficio_fidelidad: !firstCoupon.selected && usarBeneficioNormal
    };
  };

  const checkoutRequest = async (body: Record<string, unknown>): Promise<Record<string, unknown>> => {
    const res = await fetch(import.meta.env.VITE_SUPABASE_URL + '/functions/v1/auth-otp', {
      method: 'POST',
      headers: {'Content-Type': 'application/json', Authorization: 'Bearer ' + import.meta.env.VITE_SUPABASE_ANON_KEY},
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(20000),
    });
    const raw: unknown = await res.json();
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new Error('Respuesta inválida. Vuelve a consultar.');
    const data = raw as Record<string, unknown>;
    if (!res.ok) throw new Error(typeof data.error === 'string' ? data.error : 'No pudimos completar la solicitud.');
    return data;
  };

  const handlePedir = async () => {
    if (!restaurante || !carrito.length || submittingRef.current) return;
    if (firstCoupon.selected && !firstCoupon.eligible) {
      showToast('Tu cupón Estrella', firstCoupon.message || 'Completa tus datos para comprobar el descuento.', 'error');
      return;
    }
    submittingRef.current = true;
    setProcesando(true);
    try {
      const phone = clienteTel.replace(/\D/g, '');
      if (!/^\d{10}$/.test(phone)) throw new Error('Escribe un teléfono de 10 dígitos.');
      const {data: active, error} = await supabase.from('pedidos').select('id, estado')
        .in('cliente_tel', [phone, '52' + phone, '521' + phone]).in('estado', [...ACTIVE_ORDER_STATES]).order('created_at', {ascending: false}).limit(1);
      if (error) throw new Error('No pudimos comprobar si ya tienes un pedido. Intenta de nuevo.');
      if (active?.length) {
        localStorage.setItem('est_active_order', active[0].id);
        sessionStorage.removeItem('est_checkout_id');
        idempotencyKeyRef.current = null;
        navigate('/success?pedido=' + active[0].id);
        return;
      }
      if (tipoEntrega === 'domicilio' && (!canConfirmLocation(ubicacionGPS, direccionEntrega) || fueraDeCobertura || calculandoEnvio)) throw new Error('Confirma una dirección y ubicación dentro de la cobertura y espera la cotización.');
      if (!tipoEntrega || !restaurante) throw new Error('Elige cómo recibir tu pedido.');
      const promotionIssues = await checkPromotionEligibility(restaurante.id, promotionIds, tipoEntrega);
      if (promotionIssues.length) {
        promotionEligibility.retry();
        throw new Error(promotionIssues.map(issue => `${issue.title}: ${issue.message}`).join(' '));
      }
      const payload = generarPayloadPedido();
      pendingCheckoutRef.current = {payload, carrito: structuredClone(carrito)};
      const data = await checkoutRequest({action: 'request-client-otp', telefono: phone, idempotency_key: payload.idempotency_key});
      if (typeof data.challenge_id !== 'string') throw new Error('No se recibió una verificación válida.');
      setOtpChallenge(data.challenge_id);
      setOtpCode('');
      setShowOtpModal(true);
    } catch (error: unknown) {
      showToast('No pudimos continuar', error instanceof Error ? error.message : 'Intenta de nuevo.', 'error');
    } finally {
      submittingRef.current = false;
      setProcesando(false);
    }
  };

  const handleVerifyOtp = async () => {
    const pending = pendingCheckoutRef.current;
    if (!/^\d{6}$/.test(otpCode) || !pending || !otpChallenge || submittingRef.current) return;
    submittingRef.current = true;
    setVerificandoOtp(true);
    try {
      const data = await checkoutRequest({action: 'verify-and-order', telefono: pending.payload.cliente_tel,
        codigo: otpCode, challenge_id: otpChallenge, payload: pending.payload, carrito: pending.carrito});
      const order = data.pedido;
      if (!order || typeof order !== 'object' || Array.isArray(order) || !('id' in order) || typeof order.id !== 'string') {
        throw new Error('No pudimos comprobar el pedido. Reintenta con el mismo código; no crees otro pedido.');
      }
      setShowOtpModal(false);
      _clearCart();
      for (const key of ['est_checkout_id','est_ubicacion','est_referencias']) sessionStorage.removeItem(key);
      pendingCheckoutRef.current = null;
      navigate('/success?pedido=' + encodeURIComponent(order.id));
    } catch (error: unknown) {
      showToast('Pedido sin confirmar', error instanceof Error ? error.message : 'Reintenta con el mismo código.', 'error');
    } finally {
      submittingRef.current = false;
      setVerificandoOtp(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100">
      <Loader2 size={48} className="animate-spin text-[#FA4A0C]" />
    </div>
  );

  if (restaurantError) return <div className="checkout-page"><main className="checkout-empty">
    <h1>Tu carrito sigue aquí.</h1><p role="alert">{restaurantError}</p>
    <button className="checkout-primary" onClick={() => setRestaurantRetry(value => value + 1)}>Volver a intentar</button>
    <button className="checkout-primary" onClick={() => {
      const origin = cartRestaurantOrigin(useCartStore.getState().restaurantId, sessionStorage.getItem('est_carrito_restaurante'));
      if (origin) navigate(`/menu/${origin}`);
      else { _clearCart(); navigate(id && id !== 'global' ? `/menu/${id}` : '/'); }
    }}>Volver al menú</button>
  </main></div>;
  // El carrito vacío conserva el mismo marco visual del checkout.
  if (carrito.length === 0) {
    const handleGoBack = () => {
      setIsExiting(true);
    };

    return (
      <MotionConfig>
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: isExiting ? 0 : 1, scale: isExiting ? 0.98 : 1 }}
        transition={{ duration: 0.25 }}
        onAnimationComplete={() => {
          if (isExiting) navigate(id === 'global' ? '/' : `/menu/${id}`);
        }}
        className="checkout-page"
      >
        <CheckoutHeader step={1} onBack={handleGoBack} />
        
        <main className="checkout-empty">
          <motion.div 
            initial={{ scale: 0.8, opacity: 0, y: 20 }} 
            animate={{ scale: 1, opacity: 1, y: 0 }} 
            transition={{ type: "spring", duration: 0.6 }}
            className="checkout-empty-icon"
          >
            <ShoppingBag size={46} strokeWidth={1.4} aria-hidden="true" />
          </motion.div>
          
          <motion.h2 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-3xl font-semibold tracking-tight mb-3"
          >
            Tu pedido empieza aquí.
          </motion.h2>
          
          <motion.p 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-slate-600 mb-8 leading-relaxed text-base"
          >
            Elige algo {id === 'global' ? 'de nuestros restaurantes' : `del menú de ${restaurante?.nombre || 'este restaurante'}`} y lo guardaremos en tu carrito.
          </motion.p>
          
          <motion.button 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleGoBack}
            className="checkout-primary"
          >
            {id === 'global' ? 'Ver restaurantes' : 'Ver el menú'}
            <ArrowRight size={20} aria-hidden="true" />
          </motion.button>
        </main>
      </motion.div>
      </MotionConfig>
    );
  }

  // Textos inteligentes por paso
  const getBotonText = () => {
    if (checkoutStep === 1) return 'Continuar con la entrega';
    if (checkoutStep === 2) {
      if (promotionEligibility.blocked) return promotionEligibility.status === 'loading' ? 'Revisando promociones...' : 'Revisa tus promociones';
      if (checkingLoyalty) return 'Verificando...';
      if (!clienteNombre.trim() || clienteTel.replace(/\D/g, '').length !== 10) return 'Faltan tus datos';
      if (!tipoEntrega) return 'Elige cómo recibirlo';
      if (tipoEntrega === 'domicilio' && (!canConfirmLocation(ubicacionGPS, direccionEntrega) || fueraDeCobertura)) return 'Confirma tu ubicación';
      return 'Continuar al pago';
    }
    if (checkoutStep === 3) {
      if (promotionEligibility.blocked) return promotionEligibility.status === 'loading' ? 'Revisando promociones...' : 'Revisa tus promociones';
      if (!metodoPago) return 'Selecciona cómo pagar';
      if (metodoPago === 'efectivo' && (!montoEfectivo || parseFloat(montoEfectivo) < total)) return 'Indica con cuánto pagas';
      return procesando ? 'Enviando código...' : 'Verificar y pedir';
    }
    return 'Confirmar Pedido';
  };

  const isStepValid = () => {
    if (checkoutStep === 1) return true;
    if (checkoutStep === 2) {
      const datosValidos = clienteTel.replace(/\D/g, '').length === 10 && clienteNombre.trim().length > 0;
      const entregaValida = tipoEntrega === 'tienda' || (tipoEntrega === 'domicilio' && canConfirmLocation(ubicacionGPS, direccionEntrega) && !fueraDeCobertura && !calculandoEnvio);
      return datosValidos && entregaValida && !promotionEligibility.blocked;
    }
    if (checkoutStep === 3) {
      const pagoValido = metodoPago !== null && (metodoPago !== 'efectivo' || parseFloat(montoEfectivo || '0') >= total);
      return pagoValido && entregaConfirmada && !promotionEligibility.blocked && clienteNombre.trim().length > 0 && /^\d{10}$/.test(clienteTel.replace(/\D/g, ''));
    }
    return false;
  };

  const changeStep = (nextStep: number, direction: CheckoutStepDirection) => {
    if (stepTransitionRef.current) return;
    stepTransitionRef.current = true;
    setStepChanging(true);
    setStepDirection(direction);
    setCheckoutStep(nextStep);
  };
  const handleStepExited = () => {
    const container = document.getElementById('cart-scroll-container');
    if (container) container.scrollTop = 0;
  };
  const handleStepEntered = () => {
    stepTransitionRef.current = false;
    setStepChanging(false);
    document.getElementById('checkout-title')?.focus({ preventScroll: true });
  };
  const handleContinue = () => {
    if (stepTransitionRef.current) return;
    if (checkoutStep === 3) { handlePedir(); return; }
    setTelError(false);
    if (checkoutStep === 2 && !isStepValid()) {
      if (promotionEligibility.blocked) {
        showToast('Revisa tus promociones', promotionEligibility.message || promotionEligibility.issues[0]?.message || 'Estamos comprobando las reglas. Espera un momento.', 'error');
        document.getElementById('promotion-cart-rules')?.scrollIntoView({ block: 'center', behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
        return;
      }
      const invalidContact = clienteTel.replace(/\D/g, '').length !== 10 || !clienteNombre.trim();
      setTelError(clienteTel.replace(/\D/g, '').length !== 10);
      showToast('Revisa tu pedido', invalidContact ? 'Completa tu nombre y teléfono.' : 'Confirma una dirección dentro de cobertura y espera la cotización.', 'error');
      const section = document.getElementById(invalidContact ? 'seccion-datos' : 'seccion-entrega');
      if (section) smoothScroll(document.getElementById('cart-scroll-container'), section.offsetTop - 24, 400);
      return;
    }
    changeStep(checkoutStep + 1, 1);
  };
  const actionDisabled = stepChanging || checkingLoyalty || procesando || (checkoutStep === 3 && !isStepValid());
  const actionNote = checkoutStep === 1 ? 'El envío se calcula al elegir tu dirección.'
    : checkoutStep === 2 ? 'Tu número de WhatsApp sirve para verificar el pedido.'
    : 'Antes de confirmar, recibirás un código por WhatsApp.';
  const orderQuantity = carrito.reduce((count, entry) => count + entry.cantidad, 0);

  return (
    <MotionConfig>
    <motion.div className="checkout-page" initial={{ opacity: 0 }} animate={{ opacity: isExiting ? 0 : 1 }} transition={{ duration: .24, ease: [.22, 1, .36, 1] }} onAnimationComplete={() => {
      if (isExiting) navigate(id === 'global' ? '/' : `/menu/${id}`);
    }}>
      <CheckoutHeader step={checkoutStep} backDisabled={stepChanging || isExiting} onBack={() => {
        if (checkoutStep > 1) {
          changeStep(checkoutStep - 1, -1);
        } else setIsExiting(true);
      }} />

      <main id="cart-scroll-container" className="checkout-scroll">
        <div>
          {/* Desktop 2-col layout */}
          <div className="checkout-layout">

          {/* LEFT COLUMN — checkout steps */}
          <div className="checkout-content">
          {promotionIds.length > 0 && promotionEligibility.blocked && (
            <section id="promotion-cart-rules" className="checkout-promotion-rules" aria-live="polite" aria-label="Reglas de tus promociones">
              <Tag size={20} aria-hidden="true" />
              <div>
                <h2>{promotionEligibility.status === 'loading' ? 'Estamos revisando tus promociones' : 'Tu promoción tiene condiciones'}</h2>
                {promotionEligibility.status === 'error' ? <><p>{promotionEligibility.message}</p><button type="button" onClick={promotionEligibility.retry}>Volver a comprobar</button></>
                  : promotionEligibility.status === 'loading' ? <p>Comprobamos la modalidad y la vigencia antes de continuar.</p>
                  : <><ul>{promotionEligibility.issues.map(issue => <li key={issue.id}><strong>{issue.title}</strong><span>{issue.message}</span></li>)}</ul>
                    <p>Puedes cambiar la entrega abajo o quitar estas promociones. Conservaremos el resto de tu pedido.</p>
                    <button type="button" onClick={() => {
                      const invalidIds = new Set(promotionEligibility.issues.map(issue => issue.id));
                      useCartStore.setState(state => ({ carrito: state.carrito.filter(line => line.item.tipo !== 'promo' || !invalidIds.has(line.item.id)) }));
                    }}>Quitar promociones que no aplican</button>
                    {checkoutStep !== 2 && <button type="button" onClick={() => changeStep(2, checkoutStep > 2 ? -1 : 1)}>Cambiar entrega</button>}
                  </>}
              </div>
            </section>
          )}
          <div className="checkout-step-viewport">
          <AnimatePresence mode="wait" initial={false} custom={stepDirection} onExitComplete={handleStepExited}>
          <CheckoutStepScene key={checkoutStep} step={checkoutStep} direction={stepDirection} onEntered={handleStepEntered}>
          <div className="checkout-intro">
            <p className="checkout-eyebrow">{restaurante?.nombre || 'Tu restaurante'} · Paso {checkoutStep} de 3</p>
            <h1 id="checkout-title" tabIndex={-1}>{checkoutStep === 1 ? 'Así va tu pedido.' : checkoutStep === 2 ? '¿Dónde lo recibes?' : 'Un último vistazo.'}</h1>
            <p>{checkoutStep === 1 ? 'Revisa tus productos. Todavía puedes agregar algo más.' : checkoutStep === 2 ? 'Dinos a nombre de quién va y cómo quieres recibirlo.' : 'Revisa los detalles y elige con cuánto vas a pagar.'}</p>
          </div>
          
          {/* ══════════════════════════════════════
              PASO 1 — Tu Carrito
          ══════════════════════════════════════ */}
          {checkoutStep === 1 && (
            <div className="pb-4">

              {/* Tarjeta: Lista de artículos */}
              <section className="checkout-panel" aria-label="Productos de tu pedido">
                <div className="checkout-panel-heading">
                  {restaurante?.foto_fachada_url && <img src={restaurante.foto_fachada_url} alt="" />}
                  <div><h2>{restaurante?.nombre || 'Tu restaurante'}</h2><p>{orderQuantity} {orderQuantity === 1 ? 'producto' : 'productos'} en tu pedido</p></div>
                </div>
                {carrito.map(p => (
                  <div key={p.item.cartItemId} className="checkout-item">
                    <div className="checkout-item-image">
                      <LazyImage src={p.item.foto_url} alt={p.item.nombre} />
                    </div>
                    <div className="min-w-0">
                      <div className="checkout-item-title">
                        <h3>{p.item.nombre}</h3>
                        <span className="checkout-item-price">${(p.item.precio * p.cantidad).toFixed(2)}</span>
                      </div>
                      {p.item.opcionesSeleccionadas && p.item.opcionesSeleccionadas.length > 0 && (
                        <p className="checkout-item-options">
                          {p.item.opcionesSeleccionadas.map(o => o.opcion).join(' · ')}
                        </p>
                      )}
                      <div className="checkout-quantity">
                        <button type="button" aria-label={'Reducir cantidad de ' + p.item.nombre} onClick={() => removeFromCart(p.item.cartItemId)}><Minus size={15} aria-hidden="true" /></button>
                        <span><AnimatedCount value={p.cantidad} /></span>
                        <button type="button" aria-label={'Aumentar cantidad de ' + p.item.nombre} onClick={() => addToCart(p.item)}><Plus size={15} aria-hidden="true" /></button>
                      </div>
                      <p className="checkout-item-unit">${p.item.precio.toFixed(2)} por producto</p>
                    </div>
                  </div>
                ))}

                <a className="checkout-add-more" href={id === 'global' ? '/' : `/menu/${id}`}><Plus size={16} aria-hidden="true" /> Agregar algo más</a>
              </section>

              {/* Tarjeta: Cupón */}
              <details className="checkout-panel checkout-coupon" open={couponOpen} onToggle={event => setCouponOpen(event.currentTarget.open)}>
                <summary><Tag size={17} aria-hidden="true" /> ¿Tienes un cupón? <Plus size={16} aria-hidden="true" /></summary>
                <div className="checkout-coupon-entry">
                  <input
                    aria-label="Código de cupón"
                    type="text"
                    placeholder="CÓDIGO"
                    value={cuponCliente}
                    onChange={e => { setCuponCliente(e.target.value.toUpperCase()); setCuponValido(false); setDescuento(0); setCostoEnvioFijoOverride(null); setCuponPlataformaIdManual(null); }}
                    disabled={validandoCupon}
                    className="uppercase"
                  />
                  <button onClick={validarCuponBtn} disabled={validandoCupon || firstCoupon.checking || !cuponCliente.trim()}>
                    {validandoCupon || firstCoupon.checking ? <Loader2 className="w-5 h-5 animate-spin"/> : firstCoupon.eligible ? 'Aplicado' : firstCoupon.failed ? 'Reintentar' : 'Aplicar'}
                  </button>
                </div>
                <AnimatePresence>
                  {firstCoupon.selected && <p role="status" aria-live="polite" className="mt-3 text-sm leading-relaxed">{firstCoupon.message}</p>}
                  {cuponValido && !firstCoupon.selected && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="mt-2 flex items-center gap-2 text-[13px] font-bold text-green-700 bg-green-50 px-3 py-2 rounded-xl">
                      <CheckCircle2 size={14} className="text-green-600 shrink-0"/> Cupón aplicado · Ahorras ${descuento.toFixed(2)}
                    </motion.div>
                  )}
                </AnimatePresence>
              </details>

            </div>
          )}

          {/* ══════════════════════════════════════
              PASO 2 — Entrega
          ══════════════════════════════════════ */}
          {checkoutStep === 2 && (
            <div className="pb-4 space-y-5">

              {/* Tus datos */}
              <section id="seccion-datos" className="checkout-section" aria-labelledby="checkout-contact-heading">
                <h2 id="checkout-contact-heading" className="checkout-kicker">A nombre de quién</h2>
                <div>
                  
                  {/* Nombre Input */}
                  <div className="checkout-field">
                    <label htmlFor="checkout-name" className="block mb-1">Nombre completo</label>
                    <input
                      id="checkout-name"
                      autoComplete="name"
                      required
                      type="text"
                      value={clienteNombre}
                      onChange={e => setClienteNombre(e.target.value)}
                      placeholder="Ej. Juan Pérez"
                      className="w-full bg-transparent outline-none text-[15px] font-bold text-slate-800 placeholder:text-slate-300 placeholder:font-medium"
                    />
                  </div>

                  {/* Teléfono Input */}
                  <div className="checkout-field">
                    <label htmlFor="checkout-phone" className="block mb-1">Teléfono</label>
                    <div className="flex items-center">
                      <span className="text-slate-400 font-bold text-[15px] mr-2">+52</span>
                      <input
                        id="checkout-phone"
                        autoComplete="tel-national"
                        inputMode="tel"
                        required
                        aria-invalid={telError}
                        aria-describedby={telError ? 'checkout-phone-error' : 'checkout-phone-help'}
                        type="tel"
                        value={clienteTel}
                        onChange={e => { setClienteTel(e.target.value); setTelError(false); }}
                        placeholder="10 dígitos"
                        maxLength={10}
                        className="w-full bg-transparent outline-none text-[15px] font-bold tracking-wide text-slate-800 placeholder:text-slate-300 placeholder:font-medium"
                      />
                    </div>
                    {telError ? <p id="checkout-phone-error" role="alert" className="checkout-input-error">Escribe un teléfono de 10 dígitos.</p>
                      : <p id="checkout-phone-help" className="checkout-field-help">Usa tu número de WhatsApp para recibir el código.</p>}
                  </div>

                  {/* Beneficios junto al teléfono, dentro del formulario */}
                  <AnimatePresence mode="wait">
                    {clienteTel.replace(/\D/g, '').length === 10 && checkingLoyalty && (
                      <motion.div key="checking" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="checkout-loyalty">
                        <div className="checkout-loyalty-content" role="status" aria-atomic="true">
                          <Loader2 size={20} className="checkout-loyalty-icon animate-spin" aria-hidden="true" />
                          <p className="checkout-loyalty-description">Buscando tus beneficios…</p>
                        </div>
                      </motion.div>
                    )}
                    {loyalty.status === 'found' && (
                      <motion.div key="result" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="checkout-loyalty">
                        <div className="checkout-loyalty-content" role="status" aria-atomic="true">
                          {datosCliente?.deliveryBenefit
                            ? <Gift size={20} className="checkout-loyalty-icon" aria-hidden="true" />
                            : <Star size={20} className="checkout-loyalty-icon" aria-hidden="true" />}
                          <div>
                            {datosCliente?.deliveryBenefit ? (
                              <>
                                <p className="checkout-loyalty-title">¡Tienes un beneficio!</p>
                                <p className="checkout-loyalty-description">Continúa para desbloquear tu envío gratis.</p>
                              </>
                            ) : (
                              <>
                                <p className="checkout-loyalty-title">Encontramos tu tarjeta Estrella</p>
                                <p className="checkout-loyalty-description">{datosCliente?.vipDeliveryFee!==null ? 'Tu tarifa de envío VIP se valida al confirmar tu WhatsApp.' : 'Consulta tus puntos y movimientos entrando a tu tarjeta.'}</p>
                              </>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    )}
                    {loyalty.status === 'not-found' && (
                      <motion.div key="new-customer" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="checkout-loyalty">
                        <div className="checkout-loyalty-content" role="status" aria-atomic="true">
                          <Star size={20} className="checkout-loyalty-icon" aria-hidden="true" />
                          <div>
                            <p className="checkout-loyalty-title">¡Qué gusto verte por aquí!</p>
                            <p className="checkout-loyalty-description">Aún no tienes beneficios con este número. Puedes seguir con tu pedido.</p>
                          </div>
                        </div>
                      </motion.div>
                    )}
                    {loyalty.status === 'error' && (
                      <motion.div key="loyalty-error" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="checkout-loyalty">
                        <div className="checkout-loyalty-content">
                          <AlertCircle size={20} className="checkout-loyalty-icon" aria-hidden="true" />
                          <div>
                            <div role="status" aria-atomic="true">
                              <p className="checkout-loyalty-title">No pudimos consultar tus beneficios</p>
                              <p className="checkout-loyalty-description">Reintenta para comprobar si tienes un beneficio de envío.</p>
                            </div>
                            <button type="button" onClick={retryLoyalty} className="checkout-loyalty-retry">Reintentar</button>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </section>

              {/* Tipo de entrega */}
              <section id="seccion-entrega" className="checkout-section" aria-label="Forma de entrega">
                {sessionStorage.getItem('est_delivery_type') !== 'recoger' ? (
                  <div>
                    <h2 className="checkout-kicker">¿Cómo lo recibes?</h2>
                    <div className="flex gap-2 mb-4">
                      <button type="button" onClick={() => setTipoEntrega('domicilio')} className="checkout-choice" aria-pressed={tipoEntrega === 'domicilio'}>
                        <Bike size={20} aria-hidden="true" />
                        <span>A domicilio</span>
                      </button>
                      <button type="button" onClick={() => setTipoEntrega('tienda')} className="checkout-choice" aria-pressed={tipoEntrega === 'tienda'}>
                        <Store size={20} aria-hidden="true" />
                        <span>Yo lo recojo</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="mb-4">
                    <h2 className="checkout-kicker">Recoger en sucursal</h2>
                    <p className="text-[13px] text-slate-500 font-medium">Pasarás al restaurante por tu pedido.</p>
                  </div>
                )}
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
                            <button onClick={() => setIsMapModalOpen(true)} className="checkout-location-edit shrink-0">Cambiar</button>
                          </div>
                          {entregaConfirmada && costoEnvio >= 0 && (
                            <div className="flex justify-between items-center px-1">
                              <span className="text-[13px] text-slate-400 font-medium">Costo de envío</span>
                              <span className="text-[13px] font-bold text-slate-800">{costoEnvioFinal === 0 ? <span className="text-green-600">GRATIS 🎉</span> : `$${costoEnvioFinal.toFixed(2)}`}</span>
                            </div>
                          )}
                          <textarea
                            aria-label="Referencias de entrega (opcional)"
                            rows={2}
                            value={direccionReferencias}
                            onChange={e => setDireccionReferencias(e.target.value)}
                            placeholder="Referencias (opcional) — casa verde, portón negro..."
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 resize-none text-slate-800"
                          />
                        </div>
                      ) : (
                        <button onClick={() => setIsMapModalOpen(true)} className="checkout-location">
                          <MapPin size={18} aria-hidden="true" /> Elegir dirección en el mapa
                        </button>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Widget lealtad envío gratis */}
                {datosCliente?.deliveryBenefit && !calculandoEnvio && tipoEntrega === 'domicilio' && ubicacionGPS && costoEnvioCalculado > 0 && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-4">
                    <button 
                      onClick={() => setUsarBeneficioNormal(!usarBeneficioNormal)}
                      disabled={firstCoupon.selected}
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

              </section>

            </div>
          )}

          {/* ══════════════════════════════════════
              PASO 3 — Pago
          ══════════════════════════════════════ */}
          {checkoutStep === 3 && (
            <div className="pb-4 space-y-5">

              {/* Método de pago */}
              <section className="checkout-section" aria-labelledby="checkout-payment-heading">
                <div className="checkout-payment-heading">
                  <Banknote size={24} aria-hidden="true" />
                  <div><h2 id="checkout-payment-heading">Efectivo al recibir</h2><p>{tipoEntrega === 'tienda' ? 'Pagas cuando recojas tu pedido.' : 'Pagas cuando llegue tu pedido.'}</p></div>
                </div>
                <div>

                  <AnimatePresence>
                    {metodoPago === 'efectivo' && (
                      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                        <div>
                          <p className="text-sm text-slate-600">¿Con cuánto vas a pagar?</p>
                          <div className="checkout-cash-options">
                            {smartDenominations.map((denom, idx) => (
                              <button type="button" key={idx} onClick={() => setMontoEfectivo(denom.toString())} aria-pressed={montoEfectivo === denom.toString()}>
                                ${denom.toFixed(0)}
                                {idx === 0 && <small>Exacto</small>}
                              </button>
                            ))}
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {montoEfectivo && Number(montoEfectivo) >= total && <p className="mt-4 text-sm text-slate-600">{Number(montoEfectivo) === total ? 'No necesitas cambio.' : `Tu cambio: $${(Number(montoEfectivo) - total).toFixed(2)}`}</p>}
                </div>
              </section>

              {/* ─── CARD RESUMEN TIPO RECIBO ─── */}
              <div className="checkout-receipt overflow-hidden">

                <div className="px-5 py-5 border-b border-slate-100">
                  <h2 className="checkout-kicker">Esto es lo que vas a pedir</h2>
                  <div className="space-y-4">
                    {carrito.map(entry => (
                      <div key={entry.item.cartItemId} className="checkout-summary-item">
                        <span>{entry.cantidad}×</span>
                        <div>{entry.item.nombre}{entry.item.opcionesSeleccionadas?.length ? <small>{entry.item.opcionesSeleccionadas.map(option => option.opcion).join(' · ')}</small> : null}</div>
                        <span>${(entry.item.precio * entry.cantidad).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Detalles financieros */}
                <div className="px-5 py-4 space-y-3.5 border-b-2 border-dashed border-slate-200/70">
                  <div className="flex justify-between items-center text-[14px]">
                    <span className="text-slate-500 font-semibold tracking-tight">Subtotal</span>
                    <span className="font-bold text-slate-800 tabular-nums">${subtotal.toFixed(2)}</span>
                  </div>
                  {descuentoTotal > 0 && (
                    <div className="flex justify-between items-center text-[14px]">
                      <span className="text-slate-500 font-semibold tracking-tight">Descuento</span>
                      <span className="font-bold text-emerald-600 tabular-nums bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100/50">−${descuentoTotal.toFixed(2)}</span>
                    </div>
                  )}
                  {tipoEntrega === 'domicilio' && (
                    <div className="flex justify-between items-center text-[14px]">
                      <span className="text-slate-500 font-semibold tracking-tight">Envío</span>
                      <span className="font-bold text-slate-800 tabular-nums">
                        {entregaConfirmada && costoEnvioFinal === 0
                            ? <span className="text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md uppercase tracking-wider text-[11px] border border-emerald-100/50">Gratis</span>
                            : textoEnvio
                        }
                      </span>
                    </div>
                  )}
                </div>

                {/* Total */}
                <div className="flex justify-between items-center px-5 py-6 border-b-2 border-dashed border-slate-200/70 bg-gradient-to-b from-white to-slate-50/50">
                  <span className="font-black text-[18px] text-slate-900 tracking-tight">Total</span>
                  <motion.span
                    key={total}
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="font-black text-[32px] text-[#FA4A0C] leading-none tabular-nums tracking-tighter drop-shadow-sm"
                  >
                    ${total.toFixed(2)}
                  </motion.span>
                </div>

                {/* Entregar a */}
                <div className="px-5 py-6 bg-white rounded-b-3xl">
                  <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 mb-4">Detalles de Entrega</h3>
                  <div className="flex flex-col gap-4">
                    {/* Nombre */}
                    <div className="flex justify-between items-center gap-4">
                      <div className="flex items-center gap-2.5 shrink-0">
                        <User className="w-[15px] h-[15px] text-slate-400" strokeWidth={2.5} />
                        <span className="text-[13px] text-slate-500 font-medium">Nombre</span>
                      </div>
                      <span className="bg-slate-100 text-slate-700 px-3 py-1 rounded-lg font-semibold text-[13px] capitalize">{clienteNombre}</span>
                    </div>

                    {/* Teléfono */}
                    <div className="flex justify-between items-center gap-4">
                      <div className="flex items-center gap-2.5 shrink-0">
                        <Phone className="w-[15px] h-[15px] text-slate-400" strokeWidth={2.5} />
                        <span className="text-[13px] text-slate-500 font-medium">Teléfono</span>
                      </div>
                      <span className="bg-slate-100 text-slate-700 px-3 py-1 rounded-lg font-semibold text-[13px] tabular-nums tracking-wide">{clienteTel}</span>
                    </div>

                    {/* Dirección */}
                    <div className="flex justify-between items-center gap-4">
                      <div className="flex items-center gap-2.5 shrink-0">
                        <MapPin className="w-[15px] h-[15px] text-slate-400" strokeWidth={2.5} />
                        <span className="text-[13px] text-slate-500 font-medium">Destino</span>
                      </div>
                      <span className="bg-slate-100 text-slate-700 px-3 py-1.5 rounded-lg font-semibold text-[13px] text-right leading-snug max-w-[65%]">{tipoEntrega === 'domicilio' ? direccionEntrega : 'Recoger en sucursal'}</span>
                    </div>

                    {/* Pago */}
                    <div className="flex justify-between items-center gap-4">
                      <div className="flex items-center gap-2.5 shrink-0">
                        {metodoPago === 'efectivo' ? <Banknote className="w-[15px] h-[15px] text-slate-400" strokeWidth={2.5} /> : <CreditCard className="w-[15px] h-[15px] text-slate-400" strokeWidth={2.5} />}
                        <span className="text-[13px] text-slate-500 font-medium">Pago</span>
                      </div>
                      <span className="bg-slate-100 text-slate-700 px-3 py-1 rounded-lg font-semibold text-[13px]">
                        {metodoPago === 'efectivo' ? `Efectivo${montoEfectivo ? ' ($' + montoEfectivo + ')' : ''}` : 'En Línea'}
                      </span>
                    </div>
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

            </div>
          )}


          </CheckoutStepScene>
        </AnimatePresence>
        </div>
        </div>
        {/* END LEFT COLUMN */}

        {/* RIGHT COLUMN — sticky order summary, desktop only */}
        <aside className="checkout-aside" aria-label="Resumen de tu pedido">
          <section className="checkout-panel checkout-summary">
            <h2>Resumen de tu pedido</h2>
            <p>{orderQuantity} {orderQuantity === 1 ? 'producto' : 'productos'} · {restaurante?.nombre}</p>
            <div className="checkout-summary-items">
              {carrito.map(p => (
                <div className="checkout-summary-item" key={p.item.cartItemId}>
                  <span>{p.cantidad}×</span>
                  <div>{p.item.nombre}{p.item.opcionesSeleccionadas?.length ? <small>{p.item.opcionesSeleccionadas.map(option => option.opcion).join(' · ')}</small> : null}</div>
                  <span>${(p.item.precio * p.cantidad).toFixed(2)}</span>
                </div>
              ))}
            </div>
            <div className="checkout-summary-totals">
              <div><span>Productos</span><span>${subtotal.toFixed(2)}</span></div>
              <div><span>{tipoEntrega === 'tienda' ? 'Recogida en sucursal' : 'Envío a domicilio'}</span><span>{tipoEntrega === 'tienda' ? 'Sin costo' : ahorroEstrella > 0 ? '$' + costoEnvio.toFixed(2) : textoEnvio}</span></div>
              {ahorroEstrella > 0 && <div><span>Estrella · ahorro en envío</span><span className="text-green-700">−${ahorroEstrella.toFixed(2)}</span></div>}
              {descuentoAplicable > 0 && <div><span>Descuento</span><span className="text-green-700">−${descuentoAplicable.toFixed(2)}</span></div>}
              <div className="checkout-grand-total"><span>{entregaConfirmada ? 'Total' : 'Productos, sin envío'}</span><AnimatedMoney value={total} /></div>
            </div>
            <CheckoutAction label={getBotonText()} onClick={handleContinue} disabled={actionDisabled} busy={procesando || checkingLoyalty} />
            <p className="checkout-action-note">{actionNote}</p>
          </section>
        </aside>
        {/* END RIGHT COLUMN */}

        </div>{/* end desktop grid */}
        </div>{/* end max-w-7xl */}

        {/* BOTÓN FIJO MOBILE ONLY */}
        <div className="checkout-mobile-bar">
          <div className="checkout-mobile-bar-inner">
            <div className="checkout-mobile-price"><span>{entregaConfirmada ? 'Total del pedido' : 'Productos, sin envío'}</span><strong><AnimatedMoney value={total} /></strong></div>
            <CheckoutAction label={getBotonText()} onClick={handleContinue} disabled={actionDisabled} busy={procesando || checkingLoyalty} />
          </div>
        </div>{/* END MOBILE BUTTON */}

      </main>

      {/* MAP MODAL */}
      <AnimatePresence>
        {isMapModalOpen && <DeliveryLocationPicker
          key="delivery-location"
          initialLocation={ubicacionGPS ? { ...ubicacionGPS, address: direccionEntrega } : null}
          restaurantLocation={isDeliveryCoordinates(restaurante) ? { lat: restaurante.lat, lng: restaurante.lng } : null}
          onConfirm={handleConfirmarUbicacion}
          onClose={() => setIsMapModalOpen(false)}
        />}
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
              <p className="text-sm text-slate-500 mb-6 font-medium">Ingresa el código de 6 dígitos enviado a tu WhatsApp al número <b className="text-slate-700">{clienteTel}</b></p>
              <input type="text" value={otpCode} onChange={e => setOtpCode(e.target.value.replace(/\D/g, ''))} maxLength={6} inputMode="numeric" autoComplete="one-time-code" aria-label="Código de WhatsApp" autoFocus className="w-full bg-slate-50 text-center text-3xl font-black tracking-[0.5em] py-4 rounded-2xl outline-none border border-slate-200 focus:border-[#1D4ED8] focus:ring-4 ring-blue-600/10 mb-6 transition-all text-slate-800" />
              <button onClick={handleVerifyOtp} disabled={otpCode.length !== 6 || verificandoOtp} className="w-full bg-[#1D4ED8] text-white font-black py-4 rounded-2xl disabled:opacity-50 shadow-lg shadow-blue-700/25 hover:bg-blue-700 flex items-center justify-center gap-2">
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
            <div role={toastMsg.type === 'error' ? 'alert' : 'status'} className="bg-slate-900/95 backdrop-blur-md text-white px-5 py-3.5 rounded-2xl shadow-2xl flex items-center gap-3 border border-slate-800">
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
          <div className="checkout-confetti fixed inset-0 pointer-events-none z-[100] flex items-center justify-center overflow-hidden">
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
    </motion.div>
    </MotionConfig>
  );
}
