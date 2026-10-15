import type { Map as MapboxMap } from 'mapbox-gl';

// Preserve street data, readable place names and provider attribution.
export function applyEatsMapTheme(map: MapboxMap, theme: 'warm' | 'neutral' = 'warm'): void {
  const neutral = theme === 'neutral';
  for (const layer of map.getStyle().layers ?? []) {
    const name = layer.id.toLowerCase();
    if (layer.type === 'background') map.setPaintProperty(layer.id, 'background-color', neutral ? '#f1f2f1' : '#faf1df');
    if (layer.type === 'fill') {
      if (name.includes('water')) map.setPaintProperty(layer.id, 'fill-color', neutral ? '#d3dce1' : '#acd9e3');
      else if (name.includes('park') || name.includes('national')) map.setPaintProperty(layer.id, 'fill-color', neutral ? '#dde3dd' : '#bcd6a3');
      else if (name.includes('building')) map.setPaintProperty(layer.id, 'fill-color', neutral ? '#e0e2df' : '#e4d3bb');
      else if (name.includes('landuse') || name === 'land') map.setPaintProperty(layer.id, 'fill-color', [
        'match', ['get', 'class'], ['park', 'grass', 'wood', 'scrub', 'cemetery'], neutral ? '#e0e6df' : '#c4dcae',
        ['hospital', 'school', 'college'], neutral ? '#e4e5e3' : '#f0d8c7', ['industrial'], neutral ? '#e2e4e4' : '#e5dfd0', neutral ? '#eceeeb' : '#f5ead5',
      ]);
    }
    if (layer.type === 'line' && name.includes('road') && !name.includes('label')) {
      const color = name.includes('case') ? (neutral ? '#d4d8d5' : '#e0c8a7')
        : name.includes('motorway') || name.includes('trunk') ? (neutral ? '#d9dcda' : '#eda967') : (neutral ? '#ffffff' : '#fffdf7');
      map.setPaintProperty(layer.id, 'line-color', color);
    }
    if (layer.type === 'symbol' && layer.layout?.['text-field']) {
      map.setPaintProperty(layer.id, 'text-color', neutral ? '#666d70' : name.includes('water') ? '#347583' : name.includes('park') ? '#406e37' : '#65553f');
      map.setPaintProperty(layer.id, 'text-halo-color', neutral ? '#f9faf8' : '#fffaf0');
    }
  }
}

export type EatsMarkerRole = 'origin' | 'destination' | 'driver';
const markerLabels: Record<EatsMarkerRole, string> = {
  origin: 'Restaurante', destination: 'Tu entrega', driver: 'Repartidor',
};
const markerPaths: Record<EatsMarkerRole, string[]> = {
  origin: ['M3 10h18l-2-7H5l-2 7Z', 'M3 10a3 3 0 0 0 6 0 3 3 0 0 0 6 0 3 3 0 0 0 6 0', 'M5 13v8h14v-8', 'M10 21v-6h4v6'],
  destination: ['M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0Z', 'M12 7a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z'],
  driver: ['M5.5 12a4.5 4.5 0 1 0 0 9 4.5 4.5 0 0 0 0-9Z', 'M18.5 12a4.5 4.5 0 1 0 0 9 4.5 4.5 0 0 0 0-9Z', 'M15 6h2l3 11', 'M5.5 16.5 10 8l5 8.5h-9.5', 'M8.5 8H12'],
};

export function createEatsMarker(role: EatsMarkerRole, labelText = markerLabels[role]): HTMLButtonElement {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = `eats-map-marker eats-map-marker--${role}`;
  button.setAttribute('aria-label', labelText);
  const face = document.createElement('span');
  face.className = 'eats-map-marker-face';
  const icon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  icon.setAttribute('viewBox', '0 0 24 24');
  icon.setAttribute('fill', 'none');
  icon.setAttribute('stroke', 'currentColor');
  icon.setAttribute('stroke-width', '1.8');
  icon.setAttribute('stroke-linecap', 'round');
  icon.setAttribute('stroke-linejoin', 'round');
  icon.setAttribute('aria-hidden', 'true');
  for (const d of markerPaths[role]) {
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', d);
    icon.append(path);
  }
  face.append(icon);
  const label = document.createElement('span');
  label.className = 'eats-map-marker-label';
  label.textContent = labelText;
  button.append(face, label);
  return button;
}

export function createRestaurantMarker(restaurant: { nombre: string; foto_fachada_url?: string; isOpen: boolean }): HTMLButtonElement {
  const button = createEatsMarker('origin', restaurant.nombre);
  button.classList.add('eats-restaurant-pin');
  button.setAttribute('aria-label', `${restaurant.nombre}, ${restaurant.isOpen ? 'abierto ahora' : 'cerrado por ahora'}`);
  button.setAttribute('aria-pressed', 'false');
  const face = button.querySelector('.eats-map-marker-face');
  if (face && restaurant.foto_fachada_url) {
    try {
      const url = new URL(restaurant.foto_fachada_url, document.baseURI);
      if (url.protocol === 'https:' || url.protocol === 'http:') {
        const image = document.createElement('img');
        image.alt = '';
        image.decoding = 'async';
        image.src = url.href;
        image.onerror = () => image.remove();
        face.append(image);
      }
    } catch { /* The store icon remains available for an invalid image URL. */ }
  }
  const status = document.createElement('span');
  status.className = `eats-pin-status${restaurant.isOpen ? ' eats-pin-status--open' : ''}`;
  status.setAttribute('aria-hidden', 'true');
  face?.append(status);
  return button;
}
