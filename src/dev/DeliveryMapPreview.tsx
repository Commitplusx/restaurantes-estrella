import { useState } from 'react';
import DeliveryLocationPicker from '../components/DeliveryLocationPicker';
import type { DeliveryLocation } from '../lib/deliveryLocation';

export default function DeliveryMapPreview() {
  const [open, setOpen] = useState(true);
  const [selected, setSelected] = useState<DeliveryLocation | null>(null);
  const sample = new URLSearchParams(window.location.search).get('punto') === 'centro';
  return <main className="p-8">
    <h1>Mapa de entrega · vista local</h1>
    <p>Prueba el GPS y el autocompletado sin crear pedidos.</p>
    <button type="button" className="min-h-11 underline" onClick={() => setOpen(true)}>Volver a abrir el mapa</button>
    {selected && <p>Dirección elegida en esta vista: {selected.address}</p>}
    {sample && open && <span className="fixed top-1 left-1 z-[300] bg-white text-xs px-2 py-1 rounded">Prueba: pin de ejemplo en el centro de Comitán</span>}
    {open && <DeliveryLocationPicker initialLocation={selected || (sample ? { lat: 16.2516, lng: -92.1332, address: '' } : null)} restaurantLocation={null}
      onClose={() => setOpen(false)} onConfirm={location => { setSelected(location); setOpen(false); }} />}
  </main>;
}
