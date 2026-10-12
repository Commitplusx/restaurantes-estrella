import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import * as h3 from 'h3-js';
import type { DeliveryType } from '../types';
import { parseDeliveryPrice, quoteForLocation } from '../lib/deliveryQuote';
import type { DeliveryQuote } from '../lib/deliveryQuote';

interface UbicacionGPS {
  lat: number;
  lng: number;
}

export function useDeliveryCalculation(ubicacionGPS: UbicacionGPS | null, tipoEntrega: DeliveryType) {
  const [quote, setQuote] = useState<DeliveryQuote | null>(null);
  const requiresQuote = tipoEntrega === 'domicilio' && ubicacionGPS !== null;
  const quoteKey = requiresQuote ? `${ubicacionGPS.lat},${ubicacionGPS.lng}` : '';

  useEffect(() => {
    let isMounted = true;
    const controller = new AbortController();

    async function calcularEnvio() {
      if (tipoEntrega !== 'domicilio' || !ubicacionGPS) {
        return;
      }

      setQuote({ key: quoteKey, price: 0, outsideCoverage: false, loading: true });
      try {
        const hexIndex = h3.latLngToCell(ubicacionGPS.lat, ubicacionGPS.lng, 10);
        

        if (!isMounted) return;

        const { data, error } = await supabase
          .from('h3_zonas')
          .select('precio, nombre')
          .eq('h3_index', hexIndex)
          .abortSignal(AbortSignal.any([controller.signal, AbortSignal.timeout(8000)]))
          .maybeSingle();
          
        if (!isMounted) return;

        if (error) throw error;
        const price: unknown = data?.precio;
        const parsedPrice = parseDeliveryPrice(price);
        if (data && parsedPrice !== null) {
          setQuote({ key: quoteKey, price: parsedPrice, outsideCoverage: false, loading: false });
        } else {
          setQuote({ key: quoteKey, price: 0, outsideCoverage: true, loading: false });
        }
      } catch (err) {
        if (!isMounted) return;
        setQuote({ key: quoteKey, price: 0, outsideCoverage: true, loading: false });
        console.error("delivery_quote_failed", err instanceof Error ? err.name : "request_failed");
      }
    }
    
    calcularEnvio();

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, [ubicacionGPS, tipoEntrega, quoteKey]);

  return quoteForLocation(ubicacionGPS, tipoEntrega === 'domicilio', quote);
}
