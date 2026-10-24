import { useSiteMotion } from '../hooks/useSiteMotion';
import { useNoticeSlot } from '../hooks/useNoticeSlot';
import { useEffect, useRef, useState } from 'react';
import type { Map as MapboxMap } from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { motion } from 'framer-motion';
import { AlertCircle, Loader2, LocateFixed, MapPin, Search, X, ArrowRight, Check } from 'lucide-react';
import { applyEatsMapTheme } from '../lib/eatsMapTheme';
import { AddressLookupSession } from '../lib/addressLookupSession';
import './EatsMap.css';
import './DeliveryLocationPicker.css';
import {
  AddressLookupError, canConfirmLocation, isDeliveryCoordinates, isPublicMapboxToken,
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
  // Reserve the notice queue while this explicit modal is open.
  useNoticeSlot('delivery-location', true, 200);
  const isRestaurant = purpose === 'restaurant';
  const { enabled } = useSiteMotion();
  const reducedMotion = !enabled;
  const [point, setPoint] = useState<DeliveryCoordinates | null>(initialLocation);
  const [address, setAddress] = useState(initialLocation?.address || '');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<AddressResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [resolvingAddress, setResolvingAddress] = useState(false);
  const [locating, setLocating] = useState(false);
  const [message, setMessage] = useState('');
  const [mapState, setMapState] = useState<'loading' | 'ready' | 'failed' | 'unconfigured'>(hasToken ? 'loading' : 'unconfigured');
  const [mapAttempt, setMapAttempt] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapboxMap | null>(null);
  const selectedPointRef = useRef<DeliveryCoordinates | null>(initialLocation);
  const firstCenterRef = useRef(initialLocation || restaurantLocation || defaultCenter);
  const lookupSessionRef = useRef<AddressLookupSession | null>(null);
  if (!lookupSessionRef.current) lookupSessionRef.current = new AddressLookupSession(config);
  const initialLookupRef = useRef(initialLocation && !initialLocation.address.trim() ? initialLocation : null);
  const gpsSequenceRef = useRef(0);
  const liveRef = useRef(true);
  const closeRef = useRef(onClose);

  function cancelRequests() {
    gpsSequenceRef.current += 1;
    lookupSessionRef.current?.cancel();
    setSearching(false);
    setResolvingAddress(false);
    setLocating(false);
  }

  function choosePoint(next: DeliveryCoordinates, resultAddress?: string) {
    if (!isDeliveryCoordinates(next)) return;
    cancelRequests();
    selectedPointRef.current = { lat: next.lat, lng: next.lng };
    setPoint({ lat: next.lat, lng: next.lng });
    setResults([]);
    setMessage('');
    setAddress(resultAddress || '');
    if (!resultAddress && canSearch) lookup(true, next, 450);
  }
  const choosePointRef = useRef(choosePoint);
  useEffect(() => {
    closeRef.current = onClose;
    choosePointRef.current = choosePoint;
  });

  useEffect(() => {
    liveRef.current = true;
    if (initialLookupRef.current) choosePointRef.current(initialLookupRef.current);
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
      gpsSequenceRef.current += 1;
      lookupSessionRef.current?.cancel();
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
        style: 'mapbox://styles/mapbox/light-v11',
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
        if (instance && !disposed && !failed) applyEatsMapTheme(instance, 'gray');
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
        const selected = selectedPointRef.current;
        if (selected && Math.abs(selected.lat - next.lat) < .0000001 && Math.abs(selected.lng - next.lng) < .0000001) return;
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
      duration: 350 });
  }, [point, mapState]);

  function lookup(reverse = false, selectedPoint = point, delay = 0) {
    if (!canSearch || (reverse && !selectedPoint)) return;
    cancelRequests();
    setMessage('');
    setResults([]);
    setSearching(!reverse);
    setResolvingAddress(reverse);
    const request = reverse && selectedPoint ? { point: selectedPoint } : { query, proximity: selectedPoint || restaurantLocation || defaultCenter };
    lookupSessionRef.current?.lookup(request, {
      result: found => {
        setSearching(false);
        setResolvingAddress(false);
        if (found.length === 0) setMessage(reverse ? 'No encontramos la calle de este punto. Puedes ajustar el pin o escribir la dirección.' : 'No encontramos esa dirección. Prueba con otra calle o elige un punto en el mapa.');
        else if (reverse) setAddress(found[0].address);
        else setResults(found);
      },
      error: (error: unknown) => {
        setSearching(false);
        setResolvingAddress(false);
        setMessage(error instanceof AddressLookupError ? error.message
          : 'No pudimos consultar la dirección. Intenta de nuevo o escríbela debajo.');
      },
    }, delay);
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
    if (!canConfirmLocation(point, address) || !point || searching || resolvingAddress || locating) return;
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
          <div className="delivery-map-heading"><MapPin size={17} aria-hidden="true" /><span>{isRestaurant ? 'Marca la entrada de tu sucursal' : 'Pon el pin en tu puerta'}</span></div>
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
          <p className="delivery-location-intro">{canSearch ? 'Usa tu ubicación o mueve el pin. Completamos la dirección por ti.' : 'Elige el punto en el mapa y escribe la dirección.'}</p>
          <div className="delivery-location-fields">
            <div className="delivery-field">
              <label htmlFor="delivery-street-address">{isRestaurant ? 'Dirección del local' : 'Dirección de entrega'}</label>
              <textarea id="delivery-street-address" rows={3} value={address} maxLength={300} autoComplete="street-address" placeholder={canSearch ? 'Aquí aparecerá la dirección del pin' : 'Calle, número y colonia'} aria-describedby="delivery-address-help"
                onChange={event => { cancelRequests(); setAddress(event.target.value); setMessage(''); }} />
              <p id="delivery-address-help" className="delivery-address-help">{canSearch ? 'Revisa el número y agrega referencias si hace falta.' : 'Escribe calle, número y colonia.'}</p>
              {resolvingAddress && <p className="delivery-address-loading" role="status"><Loader2 size={16} className="delivery-spinner" aria-hidden="true" />Buscando la calle de este punto…</p>}
              {canSearch && point && !address && !resolvingAddress && <button type="button" onClick={() => lookup(true)} className="delivery-pin-address"><MapPin size={15} aria-hidden="true" />Volver a buscar la calle</button>}
            </div>
            {canSearch && <details className="delivery-address-alternative">
              <summary>¿Buscas otra dirección?</summary>
              <div className="delivery-field">
              <label htmlFor="delivery-address-search">Busca tu dirección</label>
              <form onSubmit={event => { event.preventDefault(); lookup(); }} className="delivery-search">
                <Search size={18} aria-hidden="true" />
                <input id="delivery-address-search" value={query} maxLength={256} placeholder="Calle, número o colonia" autoComplete="off"
                  onChange={event => { cancelRequests(); setQuery(event.target.value); setResults([]); setMessage(''); }} />
                <button type="submit" disabled={searching || query.trim().length < 3} aria-label="Buscar dirección">{searching ? <Loader2 size={19} className="delivery-spinner" /> : <ArrowRight size={19} />}</button>
              </form>
              {results.length > 0 && <ul aria-label="Direcciones encontradas" className="delivery-search-results">
                {results.map(result => <li key={result.id}><button onClick={() => choosePoint(result, result.address)}><MapPin size={17} aria-hidden="true" /><span>{result.address}</span></button></li>)}
              </ul>}
              </div>
            </details>}
            <div className="delivery-point-state" role="status" data-selected={canConfirmLocation(point, address) && !resolvingAddress}>{canConfirmLocation(point, address) && !resolvingAddress ? <Check size={17} aria-hidden="true" /> : <MapPin size={17} aria-hidden="true" />}<span>{resolvingAddress ? 'Ya tenemos el punto. Estamos buscando la dirección.' : canConfirmLocation(point, address) ? 'Dirección lista. Revisa el pin antes de confirmar.' : point ? 'Punto elegido. Falta completar la dirección.' : 'Usa tu ubicación o elige un punto en el mapa.'}</span></div>
            {message && <p role="alert" className="delivery-location-error">{message}</p>}
          </div>
          <div className="delivery-confirm-area"><button onClick={confirm} disabled={!canConfirmLocation(point, address) || searching || resolvingAddress || locating} className="delivery-location-confirm"><span>Confirmar ubicación</span><ArrowRight size={20} /></button></div>
        </div>
      </motion.div>
    </motion.div>
  );
}
