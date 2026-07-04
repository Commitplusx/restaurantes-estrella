import { useState, useEffect } from 'react';
import { Download, X } from 'lucide-react';

export function InstallPWA() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Detectar si es iOS
    const isIosDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    // Detectar si ya está instalada (en modo standalone)
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone;
    
    if (isIosDevice && !isStandalone) {
      setIsIOS(true);
      // Mostrar sugerencia de iOS después de unos segundos
      setTimeout(() => setShowPrompt(true), 3000);
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setShowPrompt(false);
      }
      setDeferredPrompt(null);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
  };

  if (!showPrompt) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 bg-white rounded-2xl shadow-2xl p-4 border border-orange-100 flex items-center justify-between animate-in slide-in-from-bottom-5">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center shrink-0">
          <img src="/estrella-circle.png" alt="App" className="w-8 h-8" />
        </div>
        <div className="flex flex-col">
          <span className="font-bold text-slate-800 text-sm">Instalar Estrella Eats</span>
          {isIOS ? (
            <span className="text-xs text-slate-500 leading-tight">
              Toca Compartir y luego "Añadir a inicio"
            </span>
          ) : (
            <span className="text-xs text-slate-500 leading-tight">
              Pide rápido desde tu inicio
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2">
        {!isIOS && (
          <button 
            onClick={handleInstallClick}
            className="bg-orange-500 text-white px-3 py-1.5 rounded-lg text-sm font-bold flex items-center gap-1 hover:bg-orange-600 active:scale-95 transition-all"
          >
            <Download size={16} />
            Instalar
          </button>
        )}
        <button 
          onClick={handleDismiss}
          className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
        >
          <X size={18} />
        </button>
      </div>
    </div>
  );
}
