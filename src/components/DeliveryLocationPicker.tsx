import { useEffect, useRef, useState } from 'react';
import type { Map as MapboxMap } from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { motion } from 'framer-motion';
import { AlertCircle, ChevronLeft, Loader2, LocateFixed, MapPin, Search, X } from 'lucide-react';
import {
  AddressLookupError, canConfirmLocation, isDeliveryCoordinates, isPublicMapboxToken, requestAddresses,
} from '../lib/deliveryLocation';
import type { AddressResult, DeliveryCoordinates, DeliveryLocation, MapboxAddressConfig } from '../lib/deliveryLocation';

interface Props {
  initialLocation: DeliveryLocation | null;
  restaurantLocation: DeliveryCoordinates | null;
  onConfirm: (location: DeliveryLocation) => void;
  onClose: () => void;
}

const config: MapboxAddressConfig = {
  accessToken: import.meta.env.VITE_MAPBOX_ACCESS_TOKEN?.trim() || '',
  permanentGeocoding: import.meta.env.VITE_MAPBOX_PERMANENT_GEOCODING === 'true',
};
const hasToken = isPublicMapboxToken(config.accessToken);
const canSearch = hasToken && config.permanentGeocoding;
const defaultCenter: DeliveryCoordinates = { lat: 16.2516, lng: -92.1332 };

export default function DeliveryLocationPicker({ initialLocation, restaurantLocation, onConfirm, onClose }: Props) {
  const [point, setPoint] = useState<DeliveryCoordinates | null>(initialLocation);
  const [address, setAddress] = useState(initialLocation?.address || '');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<AddressResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [locating, setLocating] = useState(false);
  const [message, setMessage] = useState('');
  const [mapState, setMapState] = useState<'loading' | 'ready' | 'failed' | 'unconfigured'>(hasToken ? 'loading' : 'unconfigured');
  const [mapAttempt, setMapAttempt] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapboxMap | null>(null);
  const firstCenterRef = useRef(initialLocation || restaurantLocation || defaultCenter);
  const manualAddressRef = useRef(false);
  const controllerRef = useRef<AbortController | null>(null);
  const sequenceRef = useRef(0);
  const gpsSequenceRef = useRef(0);
  const liveRef = useRef(true);
  const closeRef = useRef(onClose);

  function cancelRequests() {
    sequenceRef.current += 1;
    gpsSequenceRef.current += 1;
    controllerRef.current?.abort();
    controllerRef.current = null;
    setSearching(false);
    setLocating(false);
  }

  function choosePoint(next: DeliveryCoordinates, resultAddress?: string) {
    if (!isDeliveryCoordinates(next)) return;
    cancelRequests();
    setPoint({ lat: next.lat, lng: next.lng });
    setResults([]);
    setMessage('');
    if (resultAddress) {
      manualAddressRef.current = false;
      setAddress(resultAddress);
    } else if (!manualAddressRef.current) {
      setAddress('');
    }
  }
  const choosePointRef = useRef(choosePoint);
  useEffect(() => {
    closeRef.current = onClose;
    choosePointRef.current = choosePoint;
  });

  useEffect(() => {
    liveRef.current = true;
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialogRef.current?.focus();
    const keyboard = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        closeRef.current();
      }
      if (event.key !== 'Tab') return;
      const controls = Array.from(dialogRef.current?.querySelectorAll<HTMLElement>(
        'button:not(:disabled), input:not(:disabled), textarea:not(:disabled), a[href], [tabindex="0"]',
      ) || []).filter(element => element.getClientRects().length > 0);
      const first = controls[0];
      const last = controls[controls.length - 1];
      if (event.shiftKey && (document.activeElement === first || document.activeElement === dialogRef.current)) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && (document.activeElement === last || document.activeElement === dialogRef.current)) {
        event.preventDefault();
        first?.focus();
      }
    };
    document.addEventListener('keydown', keyboard);
    return () => {
      liveRef.current = false;
      sequenceRef.current += 1;
      gpsSequenceRef.current += 1;
      controllerRef.current?.abort();
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', keyboard);
      opener?.focus();
    };
  }, []);

  useEffect(() => {
    if (!hasToken || !containerRef.current) return;
    let disposed = false;
    let failed = false;
    let instance: MapboxMap | null = null;
    let resizeObserver: ResizeObserver | null = null;
    let userMoved = false;
    const fail = (phase: 'timeout' | 'browser' | 'provider' | 'initialization', error?: unknown) => {
      if (disposed || failed) return;
      failed = true;
      setMapState('failed');
      console.warn('delivery_map_failed', phase, error instanceof Error ? error.name : 'map_unavailable');
    };
    const timeout = setTimeout(() => fail('timeout'), 12000);
    void import('mapbox-gl').then(({ default: mapboxgl }) => {
      if (disposed || failed || !containerRef.current) return;
      if (!mapboxgl.supported()) { fail('browser'); return; }
      const center = firstCenterRef.current;
      instance = new mapboxgl.Map({
        container: containerRef.current,
        accessToken: config.accessToken,
        style: import.meta.env.VITE_MAPBOX_STYLE_URL || 'mapbox://styles/mapbox/streets-v12',
        center: [center.lng, center.lat],
        zoom: 16,
        maxZoom: 19,
        pitchWithRotate: false,
        dragRotate: false,
        touchPitch: false,
        attributionControl: true,
      });
      mapRef.current = instance;
      instance.touchZoomRotate.disableRotation();
      instance.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'top-right');
      instance.on('load', () => {
        clearTimeout(timeout);
        if (!disposed && !failed) setMapState('ready');
        instance?.resize();
      });
      instance.on('error', event => fail('provider', event.error));
      instance.on('movestart', event => {
        if (event.originalEvent && ['mousedown', 'mousemove', 'mouseup', 'wheel', 'touchstart', 'touchmove',
          'touchend', 'keydown', 'keyup', 'click', 'dblclick', 'pointerdown', 'pointermove', 'pointerup']
          .includes(event.originalEvent.type)) userMoved = true;
      });
      instance.on('moveend', () => {
        if (!userMoved || failed || disposed || !instance) return;
        userMoved = false;
        const next = instance.getCenter();
        choosePointRef.current({ lat: next.lat, lng: next.lng });
      });
      instance.on('click', event => {
        if (!failed && !disposed) choosePointRef.current({ lat: event.lngLat.lat, lng: event.lngLat.lng });
      });
      resizeObserver = new ResizeObserver(() => instance?.resize());
      resizeObserver.observe(containerRef.current);
    }).catch(error => fail('initialization', error));
    return () => {
      disposed = true;
      clearTimeout(timeout);
      resizeObserver?.disconnect();
      instance?.remove();
      mapRef.current = null;
    };
  }, [mapAttempt]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !point || mapState !== 'ready') return;
    const current = map.getCenter();
    if (Math.abs(current.lat - point.lat) < 0.0000001 && Math.abs(current.lng - point.lng) < 0.0000001) return;
    map.easeTo({ center: [point.lng, point.lat], zoom: Math.max(map.getZoom(), 16),
      duration: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 350 });
  }, [point, mapState]);

  async function lookup(reverse = false) {
    if (!canSearch || (reverse && !point)) return;
    cancelRequests();
    const sequence = sequenceRef.current;
    const controller = new AbortController();
    controllerRef.current = controller;
    setMessage('');
    setResults([]);
    setSearching(true);
    try {
      const request = reverse && point ? { point } : { query, proximity: point || restaurantLocation || defaultCenter };
      const found = await requestAddresses(config, request, controller.signal);
      if (!liveRef.current || sequence !== sequenceRef.current) return;
      if (found.length === 0) {
        setMessage('No encontramos esa dirección. Ajusta el pin y escribe la calle y número.');
      } else if (reverse) {
        manualAddressRef.current = false;
        setAddress(found[0].address);
      } else {
        setResults(found);
      }
    } catch (error: unknown) {
      if (!liveRef.current || sequence !== sequenceRef.current) return;
      setMessage(error instanceof AddressLookupError ? error.message
        : 'No pudimos consultar la dirección. Intenta de nuevo o escríbela debajo.');
    } finally {
      if (liveRef.current && sequence === sequenceRef.current) setSearching(false);
    }
  }

  function locate() {
    cancelRequests();
    setMessage('');
    if (!navigator.geolocation) {
      setMessage('Este navegador no permite usar el GPS. Elige el punto en el mapa.');
      return;
    }
    const sequence = gpsSequenceRef.current;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(position => {
      if (!liveRef.current || sequence !== gpsSequenceRef.current) return;
      setLocating(false);
      const next = { lat: position.coords.latitude, lng: position.coords.longitude };
      if (!isDeliveryCoordinates(next) || !Number.isFinite(position.coords.accuracy) || position.coords.accuracy > 100) {
        setMessage('El GPS no fue suficientemente preciso. Elige el punto de entrega en el mapa.');
        return;
      }
      choosePoint(next);
    }, error => {
      if (!liveRef.current || sequence !== gpsSequenceRef.current) return;
      setLocating(false);
      setMessage(error.code === 1 ? 'El GPS está bloqueado. Permite la ubicación o elige el punto en el mapa.'
        : 'No pudimos obtener tu ubicación. Elige el punto de entrega en el mapa.');
    }, { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 });
  }

  function confirm() {
    if (!canConfirmLocation(point, address) || !point || searching || locating) return;
    onConfirm({ lat: point.lat, lng: point.lng, address: address.trim() });
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[200] lg:bg-slate-900/60 lg:flex lg:items-center lg:justify-center"
      onClick={event => { if (event.target === event.currentTarget) onClose(); }}>
      <motion.div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="delivery-location-title" tabIndex={-1}
        initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 28, stiffness: 220 }}
        className="fixed inset-0 h-[100dvh] bg-slate-100 flex flex-col outline-none lg:static lg:inset-auto lg:w-[960px] lg:h-[640px] lg:max-h-[90dvh] lg:rounded-3xl lg:overflow-hidden lg:shadow-2xl lg:flex-row">
        <div className="flex-1 min-h-[180px] relative overflow-hidden">
          <div ref={containerRef} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} aria-label="Mapa del punto de entrega" />
          <div className="lg:hidden absolute top-0 left-0 right-16 z-20 flex items-center gap-3 px-4 pt-[max(16px,env(safe-area-inset-top))] pb-4 pointer-events-none">
            <button onClick={onClose} aria-label="Cerrar ubicación" className="pointer-events-auto w-11 h-11 bg-white rounded-full flex items-center justify-center shadow-md focus-visible:ring-2 focus-visible:ring-blue-600">
              <ChevronLeft size={22} className="text-slate-800" />
            </button>
            <span className="font-bold text-[17px] text-slate-900 bg-white/95 rounded-lg px-3 py-2">Elige tu ubicación</span>
          </div>
          {mapState === 'ready' && <>
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-full z-10 pointer-events-none flex flex-col items-center" aria-hidden="true">
              <div className="w-12 h-12 bg-[#1D4ED8] rounded-full flex items-center justify-center shadow-lg border-4 border-white"><MapPin size={24} className="text-white" /></div>
              <div className="w-[3px] h-4 bg-[#1D4ED8] rounded-full -mt-0.5" />
            </div>
            {!point && <p className="absolute top-1/2 mt-6 left-1/2 -translate-x-1/2 bg-white text-slate-800 rounded-lg px-3 py-2 text-sm shadow-sm whitespace-nowrap pointer-events-none">Mueve el mapa hasta tu puerta</p>}
          </>}
          {mapState !== 'ready' && <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-slate-100 px-8 text-center" role="status">
            {mapState === 'loading' ? <><Loader2 className="animate-spin text-blue-700" size={32} /><p className="text-slate-700">Cargando el mapa…</p></>
              : <><AlertCircle className="text-slate-600" size={28} /><p className="text-slate-800 font-semibold">El mapa no está disponible</p><p className="text-sm text-slate-600 max-w-xs">Puedes usar tu GPS y escribir la dirección de entrega.</p>
                {mapState === 'failed' && <button onClick={() => { firstCenterRef.current = point || restaurantLocation || defaultCenter; setMapState('loading'); setMapAttempt(value => value + 1); }} className="min-h-11 px-4 font-semibold text-blue-700 underline focus-visible:ring-2 focus-visible:ring-blue-600">Reintentar mapa</button>}
              </>}
          </div>}
          <button onClick={locate} disabled={locating} aria-label="Usar mi ubicación GPS"
            className="absolute bottom-12 right-4 z-20 w-12 h-12 bg-[#1D4ED8] text-white rounded-full shadow-lg flex items-center justify-center disabled:opacity-60 focus-visible:ring-4 focus-visible:ring-blue-300">
            {locating ? <Loader2 size={22} className="animate-spin" /> : <LocateFixed size={22} />}
          </button>
        </div>
        <div className="bg-white lg:w-[360px] rounded-t-3xl lg:rounded-none p-5 pb-[max(20px,env(safe-area-inset-bottom))] flex flex-col min-h-0 max-h-[62dvh] lg:max-h-none">
          <div className="flex items-center justify-between gap-3 mb-4">
            <h2 id="delivery-location-title" className="font-bold text-lg text-slate-900">¿Dónde te lo entregamos?</h2>
            <button onClick={onClose} aria-label="Cerrar selector de ubicación" className="w-11 h-11 shrink-0 bg-slate-100 rounded-full flex items-center justify-center focus-visible:ring-2 focus-visible:ring-blue-600"><X size={18} /></button>
          </div>
          <div className="overflow-y-auto min-h-0 flex-1 space-y-4 pr-1">
            {canSearch && <div>
              <label htmlFor="delivery-address-search" className="block text-sm font-semibold text-slate-800 mb-2">Buscar calle y número</label>
              <form onSubmit={event => { event.preventDefault(); void lookup(); }} className="flex gap-2">
                <input id="delivery-address-search" value={query} maxLength={256} placeholder="Ej. 1a Calle Sur, Comitán" autoComplete="off"
                  onChange={event => { cancelRequests(); setQuery(event.target.value); setResults([]); setMessage(''); }}
                  className="min-w-0 flex-1 rounded-xl bg-slate-100 px-3 py-3 text-base text-slate-900 placeholder:text-slate-500 outline-none focus:ring-2 focus:ring-blue-600" />
                <button type="submit" disabled={searching || query.trim().length < 3} aria-label="Buscar dirección" className="w-12 shrink-0 rounded-xl bg-blue-700 text-white flex items-center justify-center disabled:opacity-40 focus-visible:ring-4 focus-visible:ring-blue-300">
                  {searching ? <Loader2 size={20} className="animate-spin" /> : <Search size={20} />}
                </button>
              </form>
              {results.length > 0 && <ul aria-label="Direcciones encontradas" className="mt-2 divide-y divide-slate-200">
                {results.map(result => <li key={result.id}><button onClick={() => choosePoint(result, result.address)} className="text-left w-full min-h-12 py-3 text-sm text-slate-800 hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-blue-600">{result.address}</button></li>)}
              </ul>}
            </div>}
            <div>
              <label htmlFor="delivery-street-address" className="block text-sm font-semibold text-slate-800 mb-2">Calle, número y colonia</label>
              <textarea id="delivery-street-address" rows={2} value={address} maxLength={300} autoComplete="street-address" placeholder="Escribe la dirección de tu puerta"
                onChange={event => { cancelRequests(); manualAddressRef.current = true; setAddress(event.target.value); setMessage(''); }}
                className="w-full resize-none rounded-xl bg-slate-100 px-3 py-3 text-base text-slate-900 placeholder:text-slate-500 outline-none focus:ring-2 focus:ring-blue-600" />
              {canSearch && point && <button onClick={() => void lookup(true)} disabled={searching} className="min-h-11 text-sm font-semibold text-blue-700 underline disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-blue-600">Consultar dirección del pin</button>}
            </div>
            <p className="text-sm text-slate-600">{point ? 'Revisa que el pin esté en tu puerta y que la dirección coincida.' : 'Toca el mapa, muévelo hasta tu puerta o usa el botón de GPS.'}</p>
            {point && <p className="text-xs text-slate-500 tabular-nums">Punto seleccionado: {point.lat.toFixed(5)}, {point.lng.toFixed(5)}</p>}
            {message && <p role="alert" className="text-sm text-red-700 leading-relaxed">{message}</p>}
          </div>
          <button onClick={confirm} disabled={!canConfirmLocation(point, address) || searching || locating}
            className="mt-4 w-full bg-[#1D4ED8] text-white min-h-14 py-4 rounded-xl font-bold text-base disabled:opacity-40 hover:bg-blue-700 transition-colors focus-visible:ring-4 focus-visible:ring-blue-300">Confirmar ubicación</button>
        </div>
      </motion.div>
    </motion.div>
  );
}
