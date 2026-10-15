import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, ArrowLeft, ArrowRight, Expand, LocateFixed, MapPin, Sparkle, Store, X } from 'lucide-react';
import type { GeoJSONSource, LngLatBounds, Map as MapboxMap, Marker } from 'mapbox-gl';
import type { FeatureCollection, Point } from 'geojson';
import 'mapbox-gl/dist/mapbox-gl.css';
import './EatsMap.css';
import { applyEatsMapTheme, createEatsMarker, createRestaurantMarker } from '../lib/eatsMapTheme';
import { isDeliveryCoordinates, isPublicMapboxToken } from '../lib/deliveryLocation';
import type { DeliveryCoordinates } from '../lib/deliveryLocation';

export interface RestaurantMapPoint {
  id: string;
  nombre: string;
  slug?: string;
  lat?: number;
  lng?: number;
  foto_fachada_url?: string;
  categorias?: string[];
  direccion?: string;
  isOpen: boolean;
}
interface RestaurantMapProps {
  restaurants: RestaurantMapPoint[];
  userLocation: DeliveryCoordinates | null;
  locationLoading: boolean;
  onLocate: () => void;
  onShowList: () => void;
}
function mapPadding(container: HTMLDivElement | null) {
  const height = container?.clientHeight || 700;
  return (container?.clientWidth || 390) >= 768
    ? { top: 120, left: 390, right: 80, bottom: 80 }
    : { top: 140, left: 65, right: 65, bottom: Math.min(310, height * .4) };
}
function RestaurantLogo({ restaurant }: { restaurant: RestaurantMapPoint }) {
  const [failedImage, setFailedImage] = useState<string | null>(null);
  return <span className="eats-discovery-logo">
    {restaurant.foto_fachada_url && failedImage !== restaurant.foto_fachada_url
      ? <img src={restaurant.foto_fachada_url} alt="" loading="lazy" onError={() => setFailedImage(restaurant.foto_fachada_url || null)} />
      : <Store size={25} aria-hidden="true" />}
  </span>;
}
export default function RestaurantMap({ restaurants, userLocation, locationLoading, onLocate, onShowList }: RestaurantMapProps) {
  const container = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<MapboxMap | null>(null);
  const bounds = useRef<LngLatBounds | null>(null);
  const markerButtons = useRef(new Map<string, HTMLButtonElement>());
  const token = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN?.trim() || '';
  const configured = isPublicMapboxToken(token);
  const [state, setState] = useState<'loading' | 'ready' | 'failed'>(configured ? 'loading' : 'failed');
  const [attempt, setAttempt] = useState(0);
  const [openOnly, setOpenOnly] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selectedMarker = useRef<string | null>(null);
  const [groupIds, setGroupIds] = useState<string[] | null>(null);
  const [groupError, setGroupError] = useState(false);
  const visibleRestaurants = useMemo(() => restaurants.filter(restaurant => !openOnly || restaurant.isOpen), [restaurants, openOnly]);
  const listedRestaurants = groupIds ? visibleRestaurants.filter(restaurant => groupIds.includes(restaurant.id)) : visibleRestaurants;
  const selected = visibleRestaurants.find(restaurant => restaurant.id === selectedId);
  const mappedCount = visibleRestaurants.filter(isDeliveryCoordinates).length;
  const data = useRef({ restaurants: visibleRestaurants, userLocation });
  const paint = useRef<(() => void) | null>(null);
  const selectRestaurant = useCallback((restaurant: RestaurantMapPoint) => {
    setSelectedId(restaurant.id);
    if (!isDeliveryCoordinates(restaurant)) return;
    mapInstance.current?.easeTo({ center: [restaurant.lng, restaurant.lat], zoom: 17, padding: mapPadding(container.current), duration: 550 });
  }, []);
  const frameAll = useCallback(() => {
    setSelectedId(null);
    setGroupIds(null);
    if (bounds.current && !bounds.current.isEmpty()) mapInstance.current?.fitBounds(bounds.current, { padding: mapPadding(container.current), maxZoom: 14, duration: 550 });
  }, []);
  useEffect(() => { data.current = { restaurants: visibleRestaurants, userLocation }; paint.current?.(); }, [visibleRestaurants, userLocation]);
  useEffect(() => { selectedMarker.current = selectedId; markerButtons.current.forEach((button, id) => button.setAttribute('aria-pressed', String(id === selectedId))); }, [selectedId, visibleRestaurants]);
  useEffect(() => {
    if (!isPublicMapboxToken(token)) return;
    let disposed = false;
    let map: MapboxMap | null = null;
    let loaded = false;
    let resize: ResizeObserver | null = null;
    let framedPoints = '';
    let userMarker: Marker | null = null;
    const markers = new Map<string, Marker>();
    const buttons = markerButtons.current;
    const sourceId = 'eats-discovery-restaurants';
    const timeout = setTimeout(() => { if (!disposed) setState('failed'); }, 12_000);
    void import('mapbox-gl').then(sdk => {
      if (disposed || !container.current) return;
      map = new sdk.Map({ container: container.current, accessToken: token,
        style: 'mapbox://styles/mapbox/light-v11', center: [-92.1332, 16.2516], zoom: 13 });
      mapInstance.current = map;
      const syncMarkers = () => {
        if (!map || !loaded || !map.isSourceLoaded(sourceId)) return;
        const current = new Set<string>();
        for (const feature of map.querySourceFeatures(sourceId)) {
          if (feature.geometry.type !== 'Point') continue;
          const [lng, lat] = feature.geometry.coordinates;
          if (typeof lng !== 'number' || typeof lat !== 'number') continue;
          const position: [number, number] = [lng, lat];
          if (!map.getBounds()?.contains(position)) continue;
          const properties: unknown = feature.properties;
          if (!properties || typeof properties !== 'object') continue;
          const clusterId = 'cluster_id' in properties ? properties.cluster_id : null;
          const count = 'point_count' in properties ? properties.point_count : null;
          const restaurantId = 'restaurant_id' in properties ? properties.restaurant_id : null;
          const cluster = typeof clusterId === 'number' && typeof count === 'number';
          const id = cluster ? 'group:' + clusterId : typeof restaurantId === 'string' ? restaurantId : null;
          if (!id || current.has(id)) continue;
          current.add(id);
          if (markers.has(id)) continue;
          let button: HTMLButtonElement;
          if (cluster) {
            button = document.createElement('button');
            button.type = 'button'; button.className = 'eats-map-cluster';
            button.setAttribute('aria-label', `Ver ${count} restaurantes cercanos`);
            const total = document.createElement('strong'); total.textContent = String(count);
            const label = document.createElement('span'); label.textContent = 'lugares';
            button.append(total, label);
            button.onclick = event => {
              event.stopPropagation();
              const source = map?.getSource<GeoJSONSource>(sourceId);
              if (!source) return;
              setSelectedId(null); setGroupError(false);
              source.getClusterLeaves(clusterId, data.current.restaurants.length, 0, (error, leaves) => {
                if (disposed) return;
                if (error || !leaves) { setGroupError(true); return; }
                const ids: string[] = [];
                for (const leaf of leaves) {
                  const value: unknown = leaf.properties;
                  if (value && typeof value === 'object' && 'restaurant_id' in value && typeof value.restaurant_id === 'string') ids.push(value.restaurant_id);
                }
                setGroupIds(ids);
              });
              source.getClusterExpansionZoom(clusterId, (error, zoom) => {
                if (disposed) return;
                if (error || typeof zoom !== 'number') { setGroupError(true); return; }
                map?.easeTo({ center: position, zoom: Math.min(zoom, 18), padding: mapPadding(container.current), duration: 500 });
              });
            };
          } else {
            const restaurant = data.current.restaurants.find(item => item.id === restaurantId);
            if (!restaurant) continue;
            button = createRestaurantMarker(restaurant);
            button.setAttribute('aria-pressed', String(restaurant.id === selectedMarker.current));
            button.onclick = event => { event.stopPropagation(); selectRestaurant(restaurant); };
            buttons.set(restaurant.id, button);
          }
          markers.set(id, new sdk.Marker({ element: button, anchor: 'center' }).setLngLat(position).addTo(map));
          // Mapbox assigns role=img to custom markers; these markers are controls.
          button.setAttribute('role', 'button');
        }
        markers.forEach((marker, id) => {
          if (!current.has(id)) { marker.remove(); markers.delete(id); buttons.delete(id); }
        });
      };
      paint.current = () => {
        if (!map || !loaded) return;
        const source = map.getSource<GeoJSONSource>(sourceId);
        if (!source) return;
        const collection: FeatureCollection<Point, { restaurant_id: string }> = { type: 'FeatureCollection', features: [] };
        const nextBounds = new sdk.LngLatBounds();
        const points: string[] = [];
        for (const restaurant of data.current.restaurants) {
          if (!isDeliveryCoordinates(restaurant)) continue;
          const point: [number, number] = [restaurant.lng, restaurant.lat];
          collection.features.push({ type: 'Feature', properties: { restaurant_id: restaurant.id }, geometry: { type: 'Point', coordinates: point } });
          nextBounds.extend(point); points.push(restaurant.id + ':' + point.join(','));
        }
        source.setData(collection);
        userMarker?.remove(); userMarker = null;
        if (isDeliveryCoordinates(data.current.userLocation)) {
          const point: [number, number] = [data.current.userLocation.lng, data.current.userLocation.lat];
          userMarker = new sdk.Marker({ element: createEatsMarker('destination', 'Estás aquí') }).setLngLat(point).addTo(map);
          nextBounds.extend(point); points.push(point.join(','));
        }
        bounds.current = nextBounds;
        const signature = points.join('|');
        if (!nextBounds.isEmpty() && signature !== framedPoints) {
          framedPoints = signature;
          map.fitBounds(nextBounds, { padding: mapPadding(container.current), maxZoom: 14, duration: 0 });
        }
      };
      map.on('load', () => {
        clearTimeout(timeout);
        if (disposed || !map) return;
        loaded = true;
        applyEatsMapTheme(map, 'neutral');
        map.addSource(sourceId, { type: 'geojson', data: { type: 'FeatureCollection', features: [] }, cluster: true, clusterRadius: 90, clusterMaxZoom: 19, maxzoom: 20 });
        map.addLayer({ id: sourceId + '-index', type: 'circle', source: sourceId, paint: { 'circle-radius': 0, 'circle-opacity': 0 } });
        map.on('render', syncMarkers);
        setState('ready'); paint.current?.();
      });
      map.on('error', () => { clearTimeout(timeout); if (!disposed) setState('failed'); });
      let previousWidth = container.current.clientWidth;
      let previousHeight = container.current.clientHeight;
      resize = new ResizeObserver(() => {
        map?.resize();
        const width = container.current?.clientWidth || 0;
        const height = container.current?.clientHeight || 0;
        const layoutChanged = Math.abs(width - previousWidth) > 1 || Math.abs(height - previousHeight) > 64;
        if (map && loaded && layoutChanged && bounds.current && !bounds.current.isEmpty()) {
          const selectedRestaurant = data.current.restaurants.find(restaurant => restaurant.id === selectedMarker.current);
          if (isDeliveryCoordinates(selectedRestaurant)) {
            map.easeTo({ center: [selectedRestaurant.lng, selectedRestaurant.lat], padding: mapPadding(container.current), duration: 0 });
          } else {
            map.fitBounds(bounds.current, { padding: mapPadding(container.current), maxZoom: 14, duration: 0 });
          }
        }
        previousWidth = width;
        previousHeight = height;
      });
      resize.observe(container.current);
    }).catch(() => { clearTimeout(timeout); if (!disposed) setState('failed'); });
    return () => {
      disposed = true; clearTimeout(timeout); resize?.disconnect(); markers.forEach(marker => marker.remove());
      userMarker?.remove(); buttons.clear(); map?.remove(); mapInstance.current = null; bounds.current = null; paint.current = null;
    };
  }, [token, attempt, selectRestaurant]);
  return <div className="eats-map-surface eats-discovery" aria-label="Restaurantes en el mapa">
    <div className="eats-discovery-canvas" ref={container} />
    {state !== 'ready' && <div className="eats-discovery-fallback" role="status">
      <AlertCircle size={28} aria-hidden="true" />
      <p>{state === 'loading' ? 'Buscando tu próximo antojo…' : 'El mapa no está disponible. Los menús siguen aquí abajo.'}</p>
      {state === 'failed' && configured && <button type="button" onClick={() => { setState('loading'); setAttempt(value => value + 1); }}>Reintentar mapa</button>}
      <button type="button" onClick={onShowList}>Volver a restaurantes</button>
    </div>}
    <header className="eats-discovery-header">
      <button type="button" className="eats-map-control" onClick={onShowList} aria-label="Volver a restaurantes"><ArrowLeft size={21} /></button>
      <div><h1>Explora Comitán<Sparkle size={17} fill="currentColor" aria-hidden="true" /></h1><p>Tu próximo antojo está cerca.</p></div>
      <img src="/estrella-circle.png" alt="Estrella Eats" />
    </header>
    <div className="eats-discovery-controls">
      <button type="button" className="eats-map-control" disabled={locationLoading} onClick={onLocate} aria-label="Usar mi ubicación"><LocateFixed size={21} className={locationLoading ? 'eats-location-pending' : ''} /></button>
      <button type="button" className="eats-map-control" disabled={state !== 'ready' || mappedCount === 0} onClick={frameAll} aria-label="Ver todos en el mapa"><Expand size={20} /></button>
    </div>
    <section className="eats-discovery-tray" aria-label="Elegir restaurante">
      <div className="eats-discovery-tray-heading"><div><h2>{groupIds ? "En esta zona" : "Restaurantes cerca"}</h2><p><MapPin size={13} aria-hidden="true" />{mappedCount} lugares en el mapa</p></div>
        <div className="eats-map-filters" aria-label="Filtrar restaurantes">
          <button type="button" aria-pressed={!openOnly} onClick={() => { setOpenOnly(false); setGroupIds(null); setSelectedId(null); }}>Todos</button>
          <button type="button" aria-pressed={openOnly} onClick={() => { setOpenOnly(true); setGroupIds(null); setSelectedId(null); }}>Abiertos</button>
        </div>
      </div>
      {groupError && <p className="eats-map-empty" role="status">No pudimos ampliar ese grupo. Puedes elegir el restaurante en la lista.</p>}
      {groupIds && !selected && <button type="button" className="eats-map-show-all" onClick={() => setGroupIds(null)}>Ver todos los restaurantes</button>}
      {selected ? <article className="eats-map-selected" key={selected.id}>
        <button type="button" className="eats-selected-close" onClick={() => setSelectedId(null)} aria-label="Cerrar selección"><X size={18} /></button>
        <div className="eats-map-selected-info"><RestaurantLogo restaurant={selected} /><div><h3>{selected.nombre}</h3><p>{selected.categorias?.join(' · ') || 'Restaurante local'}</p><span className={selected.isOpen ? 'eats-open-status' : 'eats-closed-status'}>{selected.isOpen ? 'Abierto ahora' : 'Cerrado por ahora'}</span></div></div>
        {selected.direccion && !/^GPS:/i.test(selected.direccion) && <p className="eats-map-address"><MapPin size={15} aria-hidden="true" />{selected.direccion}</p>}
        <Link className="eats-map-menu-link" to={'/menu/' + encodeURIComponent(selected.slug || selected.id)}>Ver menú<ArrowRight size={19} aria-hidden="true" /></Link>
      </article> : listedRestaurants.length > 0 ? <div className="eats-map-restaurant-list" aria-label="Restaurantes disponibles">
        {listedRestaurants.map(restaurant => <button type="button" className="eats-map-restaurant" key={restaurant.id} onClick={() => selectRestaurant(restaurant)}>
          <RestaurantLogo restaurant={restaurant} />
          <span><strong>{restaurant.nombre}</strong><span>{restaurant.categorias?.[0] || 'Restaurante local'}</span><span className={restaurant.isOpen ? 'eats-open-status' : 'eats-closed-status'}>{restaurant.isOpen ? 'Abierto ahora' : 'Cerrado'}</span></span>
          <ArrowRight size={17} aria-hidden="true" />
        </button>)}
      </div> : <p className="eats-map-empty">Por ahora no hay restaurantes abiertos. Puedes explorar sus menús en “Todos”.</p>}
    </section>
  </div>;
}
