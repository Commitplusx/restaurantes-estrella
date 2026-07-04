import { useState, useEffect } from 'react';
import { X } from 'lucide-react';

export function InstallPWA() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

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

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      if (currentScrollY > lastScrollY && currentScrollY > 50) {
        setIsVisible(false); // Ocultar al hacer scroll hacia abajo
      } else {
        setIsVisible(true);  // Mostrar al hacer scroll hacia arriba
      }
      setLastScrollY(currentScrollY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY]);

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
    <div 
      className={`fixed bottom-4 left-4 right-4 md:left-1/2 md:w-auto md:-translate-x-1/2 z-[100] bg-white/80 backdrop-blur-xl rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] p-2.5 border border-white/40 flex items-center justify-between gap-4 transition-all duration-500 ease-out ${
        isVisible ? 'translate-y-0 opacity-100' : 'translate-y-[150%] opacity-0'
      }`}
    >
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 bg-slate-50 rounded-2xl flex items-center justify-center shrink-0 border border-slate-100/50 shadow-sm">
          <img src="/estrella-circle.png" alt="App" className="w-7 h-7" />
        </div>
        <div className="flex flex-col">
          <span className="font-bold text-slate-800 text-[13px] leading-tight">¿Antojo? 🍔</span>
          <span className="text-[11px] text-slate-500 leading-tight">
            {isIOS ? 'Toca Compartir y "Añadir a inicio" 📲' : 'Instala la app y pide en segundos ✨'}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {!isIOS && (
          <button 
            onClick={handleInstallClick}
            className="bg-orange-500 text-white px-3.5 py-2 rounded-xl text-xs font-bold hover:bg-orange-600 transition-colors shadow-md shadow-orange-500/20"
          >
            Instalar
          </button>
        )}
        <button 
          onClick={handleDismiss}
          className="p-2 text-slate-400 hover:text-slate-700 bg-slate-50 hover:bg-slate-100 rounded-full transition-colors"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
