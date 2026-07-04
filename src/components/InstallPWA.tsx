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
    <div className="fixed top-20 left-4 right-4 md:left-1/2 md:w-auto md:-translate-x-1/2 z-[100] bg-slate-900/95 backdrop-blur-md rounded-2xl shadow-xl p-2 border border-white/10 flex items-center justify-between gap-4 animate-in slide-in-from-top-5">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shrink-0">
          <img src="/estrella-circle.png" alt="App" className="w-7 h-7" />
        </div>
        <div className="flex flex-col">
          <span className="font-bold text-white text-sm leading-tight">Lleva a Estrella Eats contigo</span>
          <span className="text-[11px] text-slate-300 leading-tight">
            {isIOS ? 'Comparte y "Añadir a inicio"' : 'Pide a un toque y sin consumir espacio'}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-1.5">
        {!isIOS && (
          <button 
            onClick={handleInstallClick}
            className="bg-orange-500 text-white px-3 py-1.5 rounded-xl text-xs font-bold hover:bg-orange-600 transition-colors"
          >
            Instalar
          </button>
        )}
        <button 
          onClick={handleDismiss}
          className="p-2 text-slate-400 hover:text-white transition-colors"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
