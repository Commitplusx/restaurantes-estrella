import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import * as h3 from 'h3-js';
import type { DeliveryType } from '../types';

interface UbicacionGPS {
  lat: number;
  lng: number;
}

export function useDeliveryCalculation(ubicacionGPS: UbicacionGPS | null, tipoEntrega: DeliveryType) {
  const [costoEnvioBase, setCostoEnvioBase] = useState(0);
  const [fueraDeCobertura, setFueraDeCobertura] = useState(false);
  const [calculandoEnvio, setCalculandoEnvio] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function calcularEnvio() {
      if (tipoEntrega !== 'domicilio' || !ubicacionGPS) {
        setCostoEnvioBase(0);
        setFueraDeCobertura(false);
        setCalculandoEnvio(false);
        return;
      }

      setCalculandoEnvio(true);
      setFueraDeCobertura(false);
      try {
        const hexIndex = h3.latLngToCell(ubicacionGPS.lat, ubicacionGPS.lng, 10);
        

        if (!isMounted) return;

        const { data, error } = await supabase
          .from('h3_zonas')
          .select('precio, nombre')
          .eq('h3_index', hexIndex)
          .maybeSingle();
          
        if (!isMounted) return;

        if (error) throw error;
        if (data && Number.isFinite(Number(data.precio)) && Number(data.precio) >= 0) {
          setCostoEnvioBase(Number(data.precio));
        } else {
          setCostoEnvioBase(0);
          setFueraDeCobertura(true);
        }
      } catch (err) {
        if (!isMounted) return;
        setCostoEnvioBase(0);
        setFueraDeCobertura(true);
        console.error("delivery_quote_failed", err instanceof Error ? err.name : "request_failed");
      } finally {
        if (isMounted) {
          setCalculandoEnvio(false);
        }
      }
    }
    
    calcularEnvio();

    return () => {
      isMounted = false;
    };
  }, [ubicacionGPS, tipoEntrega]);

  return {
    costoEnvioBase,
    fueraDeCobertura,
    calculandoEnvio
  };
}
