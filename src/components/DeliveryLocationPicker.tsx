import { useEffect, useRef, useState } from 'react';
import type { Map as MapboxMap } from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { motion, useReducedMotion } from 'framer-motion';
import { AlertCircle, Loader2, LocateFixed, MapPin, Search, X, ArrowRight, Check } from 'lucide-react';
import { applyEatsMapTheme } from '../lib/eatsMapTheme';
import './EatsMap.css';
import './DeliveryLocationPicker.css';
import {
  AddressLookupError, canConfirmLocation, isDeliveryCoordinates, isPublicMapboxToken, requestAddresses,
} from '../lib/deliveryLocation';
import type { AddressResult, DeliveryCoordinates, DeliveryLocation, MapboxAddressConfig } from '../lib/deliveryLocation';

interface Props {
  purpose?: 'delivery' | 'restaurant';
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

export default function DeliveryLocationPicker({ purpose = 'delivery', initialLocation, restaurantLocation, onConfirm, onClose }: Props) {
  const isRestaurant = purpose === 'restaurant';
  const reducedMotion = useReducedMotion();
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
        language: 'es',
        locale: { 'NavigationControl.ZoomIn': 'Acercar mapa', 'NavigationControl.ZoomOut': 'Alejar mapa' },
      });
      mapRef.current = instance;
      instance.touchZoomRotate.disableRotation();
      instance.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'top-right');
      instance.on('load', () => {
        clearTimeout(timeout);
        if (instance && !disposed && !failed) applyEatsMapTheme(instance);
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
      className="delivery-location-overlay"
      onClick={event => { if (event.target === event.currentTarget) onClose(); }}>
      <motion.div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="delivery-location-title" tabIndex={-1}
        initial={reducedMotion ? false : { y: 24, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={reducedMotion ? { opacity: 0 } : { y: 24, opacity: 0 }}
        transition={{ duration: reducedMotion ? 0 : 0.32, ease: [0.16, 1, 0.3, 1] }} className="delivery-location-dialog">
        <div className="delivery-location-map eats-map-surface">
          <div ref={containerRef} className="delivery-location-canvas" aria-label={isRestaurant ? 'Mapa de la sucursal' : 'Mapa del punto de entrega'} />
          <div className="delivery-map-heading"><MapPin size={17} aria-hidden="true" /><span>Elige dónde recibir tu pedido</span></div>
          {mapState === 'ready' && <>
            <div className="delivery-location-pin" aria-hidden="true"><span><MapPin size={27} /></span><i /><strong>{isRestaurant ? 'Tu sucursal' : 'Tu entrega'}</strong></div>
            <p className="delivery-map-hint">{point ? (isRestaurant ? 'Revisa que el pin esté en la entrada del local' : 'Revisa que el pin esté justo en tu puerta') : 'Mueve el mapa o toca la ubicación exacta'}</p>
          </>}
          {mapState !== 'ready' && <div className="delivery-map-message" role="status">
            {mapState === 'loading' ? <><Loader2 className="delivery-spinner" size={30} /><h3>Cargando tu mapa…</h3><p>{isRestaurant ? 'Ubica la entrada de tu sucursal.' : 'Ubica la puerta donde recibirás tu pedido.'}</p></>
              : <><AlertCircle size={30} /><h3>El mapa no está disponible</h3><p>Puedes usar tu GPS y escribir la dirección.</p>
                {mapState === 'failed' && <button onClick={() => { firstCenterRef.current = point || restaurantLocation || defaultCenter; setMapState('loading'); setMapAttempt(value => value + 1); }}>Reintentar mapa</button>}
              </>}
          </div>}
          <button onClick={locate} disabled={locating} aria-label="Usar mi ubicación GPS" className="delivery-gps">
            {locating ? <Loader2 size={19} className="delivery-spinner" /> : <LocateFixed size={19} />}<span>{locating ? 'Ubicando…' : 'Usar mi ubicación'}</span>
          </button>
        </div>
        <div className="delivery-location-panel">
          <div className="delivery-location-heading"><h2 id="delivery-location-title">{isRestaurant ? 'Ubica tu sucursal' : <>¿Dónde te lo <br />entregamos?</>}</h2><button onClick={onClose} aria-label="Cerrar selector de ubicación" className="delivery-location-close"><X size={20} /></button></div>
          <p className="delivery-location-intro">{isRestaurant ? 'Marca la entrada del local y escribe su dirección para que clientes y repartidores lo encuentren.' : 'Pon el pin en tu puerta y déjanos la dirección. Así será más fácil encontrarte.'}</p>
          <div className="delivery-location-fields">
            {canSearch && <div className="delivery-field">
              <label htmlFor="delivery-address-search">Busca tu dirección</label>
              <form onSubmit={event => { event.preventDefault(); void lookup(); }} className="delivery-search">
                <Search size={18} aria-hidden="true" />
                <input id="delivery-address-search" value={query} maxLength={256} placeholder="Calle, número o colonia" autoComplete="off"
                  onChange={event => { cancelRequests(); setQuery(event.target.value); setResults([]); setMessage(''); }} />
                <button type="submit" disabled={searching || query.trim().length < 3} aria-label="Buscar dirección">{searching ? <Loader2 size={19} className="delivery-spinner" /> : <ArrowRight size={19} />}</button>
              </form>
              {results.length > 0 && <ul aria-label="Direcciones encontradas" className="delivery-search-results">
                {results.map(result => <li key={result.id}><button onClick={() => choosePoint(result, result.address)}><MapPin size={17} aria-hidden="true" /><span>{result.address}</span></button></li>)}
              </ul>}
            </div>}
            <div className="delivery-field">
              <label htmlFor="delivery-street-address">Calle, número y colonia</label>
              <textarea id="delivery-street-address" rows={3} value={address} maxLength={300} autoComplete="street-address" placeholder="Ej. 1a Calle Sur #12, Centro"
                onChange={event => { cancelRequests(); manualAddressRef.current = true; setAddress(event.target.value); setMessage(''); }} />
              {canSearch && point && <button onClick={() => void lookup(true)} disabled={searching} className="delivery-pin-address"><MapPin size={15} />Usar la dirección de este pin</button>}
            </div>
            <div className="delivery-point-state" data-selected={Boolean(point)}>{point ? <Check size={17} aria-hidden="true" /> : <MapPin size={17} aria-hidden="true" />}<span>{point ? 'Punto de entrega elegido. Revisa la dirección.' : 'Falta elegir tu punto en el mapa.'}</span></div>
            {message && <p role="alert" className="delivery-location-error">{message}</p>}
          </div>
          <div className="delivery-confirm-area"><button onClick={confirm} disabled={!canConfirmLocation(point, address) || searching || locating} className="delivery-location-confirm"><span>Confirmar ubicación</span><ArrowRight size={20} /></button></div>
        </div>
      </motion.div>
    </motion.div>
  );
}
