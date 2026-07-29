import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Gift, ShieldCheck, ChefHat, ArrowRight } from 'lucide-react';

interface OnboardingFlowProps {
  onComplete: () => void;
}

const SLIDES = [
  {
    id: 'welcome',
    emoji: '🍔',
    title: 'Tu Comida. Rápida.',
    description: 'Los mejores restaurantes de la ciudad, directo a tu puerta en minutos.',
  },
  {
    id: 'loyalty',
    emoji: '🎁',
    title: 'Programa VIP',
    description: 'Acumula envíos. Pide 5 veces y el sexto envío va por nuestra cuenta.',
  },
  {
    id: 'fair',
    emoji: '🤝',
    title: 'Sin Sorpresas',
    description: 'Pagas el precio justo del restaurante. Sin tarifas infladas ni cargos ocultos.',
  },
  {
    id: 'ready',
    emoji: '✨',
    title: '¿Comenzamos?',
    description: 'Descubre los sabores que tenemos para ti hoy.',
  }
];

export function OnboardingFlow({ onComplete }: OnboardingFlowProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState(1); 

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  const nextSlide = () => {
    if (currentIndex === SLIDES.length - 1) {
      handleComplete();
    } else {
      setDirection(1);
      setCurrentIndex((prev) => prev + 1);
    }
  };

  const handleComplete = () => {
    localStorage.setItem('estrella_onboarding_done', 'true');
    onComplete();
  };

  const slideVariants = {
    enter: (dir: number) => ({
      x: dir > 0 ? 100 : -100,
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
      transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] }
    },
    exit: (dir: number) => ({
      x: dir < 0 ? 100 : -100,
      opacity: 0,
      transition: { duration: 0.3, ease: [0.22, 1, 0.36, 1] }
    })
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="fixed inset-0 z-[100] flex flex-col bg-white font-sans"
    >
      
      {/* Botón Omitir (Arriba a la derecha) */}
      <div className="absolute top-0 right-0 p-6 md:p-10 z-50">
        <button 
          onClick={handleComplete}
          className="text-[15px] font-bold text-slate-400 hover:text-slate-900 transition-colors"
        >
          Omitir
        </button>
      </div>

      {/* Área Central (Ícono + Textos) */}
      <div className="flex-1 relative flex items-center justify-center overflow-hidden w-full max-w-2xl mx-auto">
        <AnimatePresence initial={false} custom={direction} mode="wait">
          <motion.div
            key={currentIndex}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            className="absolute inset-0 flex flex-col items-center justify-center px-8"
          >
            {/* Emoji Enorme Estilo Apple */}
            <div className="mb-8 md:mb-12 select-none">
              <span className="text-[120px] md:text-[160px] leading-none drop-shadow-md inline-block">
                {SLIDES[currentIndex].emoji}
              </span>
            </div>

            {/* Título Extra Grande */}
            <h2 className="text-4xl md:text-5xl font-black text-slate-900 text-center mb-4 tracking-tight leading-tight">
              {SLIDES[currentIndex].title}
            </h2>

            {/* Descripción Minimalista */}
            <p className="text-[17px] md:text-xl text-slate-500 font-medium text-center max-w-sm md:max-w-md leading-relaxed">
              {SLIDES[currentIndex].description}
            </p>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Footer (Puntos + Botón Principal) */}
      <div className="w-full flex flex-col items-center pb-12 pt-4 px-6 max-w-md mx-auto z-20 gap-8">
        
        {/* Puntos (Paginación) */}
        <div className="flex gap-2">
          {SLIDES.map((_, idx) => (
            <div 
              key={idx}
              className={`h-2 rounded-full transition-all duration-300 ${
                idx === currentIndex 
                  ? 'w-8 bg-slate-900' 
                  : 'w-2 bg-slate-200'
              }`}
            />
          ))}
        </div>

        {/* Botón de Acción Principal */}
        <button
          onClick={nextSlide}
          className="w-full h-14 md:h-16 bg-slate-900 hover:bg-slate-800 text-white rounded-full font-bold text-lg flex items-center justify-center gap-2 active:scale-95 transition-all shadow-lg"
        >
          {currentIndex === SLIDES.length - 1 ? (
            'Comenzar a explorar'
          ) : (
            <>Siguiente <ArrowRight className="w-5 h-5 ml-1" /></>
          )}
        </button>
      </div>

    </motion.div>
  );
}
