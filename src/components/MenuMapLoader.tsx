import type { ReactNode } from 'react';
import { useLoadScript, type Libraries } from '@react-google-maps/api';
const LIBRARIES: Libraries = ['places'];

function ActiveMapLoader({ apiKey, children }: { apiKey: string; children: (loaded: boolean) => ReactNode }) {
  const { isLoaded, loadError } = useLoadScript({ googleMapsApiKey: apiKey, libraries: LIBRARIES });
  return loadError ? <p role="status" className="p-6 text-slate-600">No pudimos cargar el mapa. Puedes cerrar esta ventana y volver a intentarlo.</p> : children(isLoaded);
}

/** The existing legacy map SDK starts only if its location dialog is actually opened. */
export default function MenuMapLoader({ children }: { children: (loaded: boolean) => ReactNode }) {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY?.trim();
  return apiKey ? <ActiveMapLoader apiKey={apiKey}>{children}</ActiveMapLoader>
    : <p role="status" className="p-6 text-slate-600">El mapa no está disponible en este momento.</p>;
}
