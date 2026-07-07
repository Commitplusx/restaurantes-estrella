import { useState, useEffect } from 'react'
import { X, Cookie } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

export function CookieBanner() {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const hasAccepted = localStorage.getItem('cookies_accepted')
    if (!hasAccepted) {
      const timer = setTimeout(() => setIsVisible(true), 1500)
      return () => clearTimeout(timer)
    }
  }, [])

  const acceptCookies = () => {
    localStorage.setItem('cookies_accepted', 'true')
    setIsVisible(false)
  }

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div 
          initial={{ y: 100, opacity: 0, scale: 0.9 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: 100, opacity: 0, scale: 0.9 }}
          transition={{ type: "spring", bounce: 0.4, duration: 0.6 }}
          className="fixed bottom-4 left-4 right-4 md:left-auto md:right-8 md:w-[420px] bg-white/80 backdrop-blur-xl border border-white/50 text-slate-800 rounded-3xl p-6 shadow-[0_20px_40px_rgba(0,0,0,0.1)] z-[9999]"
        >
          <div className="flex gap-4 items-start">
            <div className="w-12 h-12 bg-orange-100 rounded-2xl flex items-center justify-center shrink-0 shadow-inner">
              <Cookie size={24} className="text-orange-500 drop-shadow-sm" />
            </div>
            <div className="flex-1">
              <h3 className="font-black text-slate-900 mb-1.5 text-lg">Tu Privacidad</h3>
              <p className="text-slate-500 text-sm leading-relaxed mb-5 font-medium">
                Utilizamos cookies para recordar tu carrito y brindarte una experiencia mágica. Al continuar, aceptas nuestra política.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={acceptCookies}
                  className="flex-1 bg-slate-900 hover:bg-slate-800 text-white font-bold py-2.5 rounded-xl transition-all shadow-lg shadow-slate-900/20 active:scale-95 text-sm"
                >
                  Entendido
                </button>
                <button
                  onClick={() => setIsVisible(false)}
                  className="w-10 h-10 flex items-center justify-center bg-slate-100 hover:bg-slate-200 text-slate-400 hover:text-slate-600 rounded-xl transition-all active:scale-95"
                >
                  <X size={18} strokeWidth={2.5} />
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
