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
    
    // Si ya lo cerró manualmente, no mostrar
    if (localStorage.getItem('install_prompt_dismissed') === 'true') {
      return;
    }
    
    if (isStandalone) {
      return; // Si ya está instalada, no hacemos nada más
    }

    if (isIosDevice) {
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
    localStorage.setItem('install_prompt_dismissed', 'true');
  };

  if (!showPrompt) return null;

  return (
    <>
      <div 
        className={`fixed bottom-10 left-4 right-4 md:left-1/2 md:w-auto md:-translate-x-1/2 z-[100] bg-white/90 backdrop-blur-xl rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] p-2.5 border border-white flex items-center justify-between gap-4 transition-all duration-500 ease-out ${
          isVisible ? 'translate-y-0 opacity-100' : 'translate-y-[150%] opacity-0'
        }`}
      >
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 bg-slate-50 rounded-2xl flex items-center justify-center shrink-0 border border-slate-100/50 shadow-sm">
            <img src="/estrella-circle.png" alt="App" className="w-7 h-7" />
          </div>
          <div className="flex flex-col pr-2">
            <span className="font-bold text-slate-800 text-[13px] leading-tight">Instala la App 📱</span>
            <span className="text-[11px] text-slate-500 leading-tight mt-0.5 max-w-[220px]">
              {isIOS ? (
                <>Toca el icono <span className="inline-block translate-y-0.5 text-blue-500 mx-0.5"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg></span> abajo y luego <b>"Añadir a inicio"</b></>
              ) : 'Instala la app y pide en segundos ✨'}
            </span>
          </div>
        </div>

        {!isIOS && (
          <div className="flex items-center gap-2 pr-1">
            <button 
              onClick={handleInstallClick}
              className="bg-orange-500 text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-orange-600 transition-colors shadow-md shadow-orange-500/20 whitespace-nowrap"
            >
              Instalar Ahora
            </button>
          </div>
        )}
        
        <button 
          onClick={handleDismiss}
          className="absolute -top-2 -right-2 w-7 h-7 bg-white rounded-full shadow-md border border-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-colors z-10"
        >
          <X size={14} strokeWidth={3} />
        </button>
      </div>
      
      {/* Flecha apuntando al botón de compartir en Safari */}
      {isIOS && isVisible && (
        <div className="fixed bottom-1 left-1/2 -translate-x-1/2 z-[100] animate-bounce text-blue-500 drop-shadow-md">
           <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14"/><path d="m19 12-7 7-7-7"/></svg>
        </div>
      )}
    </>
  );
}
