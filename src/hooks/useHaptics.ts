import { useCallback } from 'react';

export function useHaptics() {
  /**
   * Dispara una vibración sutil, ideal para botones, teclados o acciones pequeñas.
   */
  const vibrateLight = useCallback(() => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      // 50ms es un tap sutil en Android
      try { navigator.vibrate(40); } catch(e) {}
    }
  }, []);

  /**
   * Dispara una vibración de éxito (ej. al completar una compra o agregar al carrito).
   */
  const vibrateSuccess = useCallback(() => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      // Dos vibraciones rápidas
      try { navigator.vibrate([40, 60, 40]); } catch(e) {}
    }
  }, []);

  /**
   * Dispara una vibración de error.
   */
  const vibrateError = useCallback(() => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      // Tres vibraciones más largas
      try { navigator.vibrate([100, 50, 100, 50, 100]); } catch(e) {}
    }
  }, []);

  return {
    vibrateLight,
    vibrateSuccess,
    vibrateError
  };
}
