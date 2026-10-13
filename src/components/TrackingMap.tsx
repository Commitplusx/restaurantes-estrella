import { useEffect, useRef, useState } from 'react';
import type { Map as MapboxMap, Marker, GeoJSONSource } from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { MapPin } from 'lucide-react';
import { isPublicMapboxToken } from '../lib/deliveryLocation';
import type { DeliveryCoordinates } from '../lib/deliveryLocation';
import type {TrackingRoute} from '../lib/trackingRoute';
import './TrackingMap.css';

export default function TrackingMap({origin,destination,driver,route}: {origin: DeliveryCoordinates | null; destination: DeliveryCoordinates | null; driver: DeliveryCoordinates | null; route: TrackingRoute | null}) {
  const token = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN?.trim() || '';
  const [state,setState] = useState<'loading' | 'ready' | 'failed'>(isPublicMapboxToken(token) ? 'loading' : 'failed');
  const [attempt,setAttempt] = useState(0);
  const container = useRef<HTMLDivElement>(null), instance = useRef<MapboxMap | null>(null);
  const markers = useRef<Marker[]>([]);
  const points = useRef({origin,destination,driver});
  const renderPoints = useRef<(() => void) | null>(null);
  const fit = useRef<(() => void) | null>(null);
  useEffect(() => {
    points.current = {origin,destination,driver};
    if (state === 'ready') renderPoints.current?.();
  },[origin,destination,driver,state]);
  useEffect(() => {
    if (!isPublicMapboxToken(token)) return;
    let disposed = false, failed = false;
    let map: MapboxMap | null = null, resize: ResizeObserver | null = null;
    const fail = (phase: 'timeout' | 'browser' | 'provider' | 'initialization', cause?: unknown) => {
      if (!disposed && !failed) {
        failed = true; setState('failed');
        console.warn('tracking_map_unavailable', {phase,error:cause instanceof Error ? cause.name : 'map_unavailable'});
      }
    };
    const timeout = window.setTimeout(() => fail('timeout'),12000);
    void import('mapbox-gl').then(({default: mapbox}) => {
      if (disposed || failed || !container.current) return;
      if (!mapbox.supported()) {fail('browser'); return;}
      const center = points.current.origin || points.current.destination || {lat:16.2516,lng:-92.1332};
      map = new mapbox.Map({container:container.current,accessToken:token,style:import.meta.env.VITE_MAPBOX_STYLE_URL || 'mapbox://styles/mapbox/streets-v12',center:[center.lng,center.lat],zoom:14,dragRotate:false,pitchWithRotate:false});
      instance.current = map; map.addControl(new mapbox.NavigationControl({showCompass:false}),'top-right');
      const paint = () => {
        markers.current.forEach(marker => marker.remove()); markers.current = [];
        for (const [key,point] of Object.entries(points.current)) if (point && map) {
          const label = key === 'origin' ? 'Restaurante o recogida' : key === 'destination' ? 'Entrega' : 'Repartidor';
          const marker = new mapbox.Marker({color:key === 'origin' ? '#bd3818' : key === 'destination' ? '#16805c' : '#1d1d1f'})
            .setLngLat([point.lng,point.lat]).setPopup(new mapbox.Popup().setText(label)).addTo(map);
          marker.getElement().setAttribute('aria-label',label); markers.current.push(marker);
        }
      };
      const frame = () => {
        const visible = Object.values(points.current).filter((point): point is DeliveryCoordinates => point !== null);
        if (!map || !visible.length) return;
        const bounds = new mapbox.LngLatBounds(); visible.forEach(point => bounds.extend([point.lng,point.lat]));
        const height = container.current?.clientHeight || 400;
        const width = container.current?.clientWidth || 400;
        const horizontal = Math.min(55, width / 6);
        map.fitBounds(bounds,{padding:{top:Math.min(70,height/5),right:horizontal,left:horizontal,bottom:innerWidth<768?Math.min(height*.42,340):Math.min(60,height/5)},maxZoom:15,duration:0});
      };
      renderPoints.current = paint; fit.current = frame;
      map.on('load',() => {window.clearTimeout(timeout); if (disposed || failed) return; setState('ready'); paint(); frame();});
      map.on('error',event => fail('provider',event.error));
      resize = new ResizeObserver(() => map?.resize()); resize.observe(container.current);
    }).catch(error => fail('initialization',error));
    return () => {disposed = true; window.clearTimeout(timeout); resize?.disconnect(); markers.current.forEach(marker => marker.remove()); markers.current = []; map?.remove(); instance.current = null; renderPoints.current = null; fit.current = null;};
  },[token,attempt]);
  useEffect(() => {
    const map = instance.current;
    if (state !== 'ready' || !map) return;
    const data = {type:'FeatureCollection' as const,features:route ? [{type:'Feature' as const,properties:{},geometry:route.geometry}] : []};
    const source = map.getSource<GeoJSONSource>('tracking-route');
    if (source) source.setData(data);
    else {
      map.addSource('tracking-route',{type:'geojson',data});
      map.addLayer({id:'tracking-route',type:'line',source:'tracking-route',layout:{'line-join':'round','line-cap':'round'},paint:{'line-color':'#bd3818','line-width':5}});
    }
  },[route,state,attempt]);
  return <div className="tracking-map absolute inset-0"><div ref={container} className="tracking-map-canvas" aria-label="Mapa de seguimiento" />
    {state !== 'ready' && <div role="status" aria-live="polite" className="absolute inset-0 bg-slate-100 flex flex-col items-center justify-start pt-20 md:justify-center md:pt-0 px-6 text-center gap-3">
      <MapPin size={28} aria-hidden="true" /><p className="font-semibold">{state === 'loading' ? 'Cargando ubicaciones…' : 'El mapa no está disponible por ahora.'}</p>
      {state === 'failed' && <><p className="text-sm text-slate-600 max-w-sm">Puedes seguir consultando el estado y los detalles de tu pedido.</p>
        <button className="min-h-11 underline underline-offset-4" onClick={() => {setState('loading');setAttempt(value => value+1);}}>Reintentar mapa</button></>}
    </div>}
    {state === 'ready' && <button className="absolute top-4 left-4 bg-white rounded-xl px-4 min-h-11 shadow-sm font-medium" onClick={() => fit.current?.()}>Ver ubicaciones</button>}
  </div>;
}
