import { useState, useEffect, useRef, type CSSProperties } from 'react';
import { motion, AnimatePresence, type Variants } from 'framer-motion';
import { ArrowRight } from 'lucide-react';

interface OnboardingFlowProps {
  onComplete: () => void;
}

type Slide =
  | { id: string; type: 'image'; ratio: number; src: string; alt: string; title: string; description: string }
  | { id: string; type: 'video'; ratio: number; src: string; poster: string; alt: string; title: string; description: string };

// Cada slide ya trae su texto dentro del arte (para móvil).
// `title` y `description` solo se muestran en el panel izquierdo de desktop.
// `ratio` = ancho/alto del arte, para que en desktop el marco encaje exacto.
const SLIDES: Slide[] = [
  {
    id: 'delivery',
    type: 'image',
    ratio: 818 / 1024,
    src: '/onboarding/delivery.jpg',
    alt: 'Estrella Eats: contamos con delivery',
    title: 'Tus restaurantes favoritos, en tu puerta',
    description: 'Pide a domicilio o para llevar y recibe tu comida en minutos.',
  },
  {
    id: 'pedir',
    type: 'video',
    ratio: 1080 / 1920,
    src: '/onboarding/pedir.mp4',
    poster: '/onboarding/pedir-poster.jpg',
    alt: 'Te entregamos de tu restaurante favorito. Descubre lo fácil que es pedir.',
    title: 'Pedir es así de fácil',
    description: 'Elige, pide y sigue tu entrega. Pide 5 veces y el sexto envío va por nuestra cuenta.',
  },
];

// Alto del marco del arte en desktop (el ancho se calcula a partir de este valor)
const DESKTOP_H = 'min(80vh,780px)';

function SlideMedia({ slide }: { slide: Slide }) {
  const videoRef = useRef<HTMLVideoElement>(null);

  // iOS/Safari a veces ignora autoPlay: forzamos play() al montar el slide.
  useEffect(() => {
    if (slide.type === 'video') {
      videoRef.current?.play().catch(() => {});
    }
  }, [slide]);

  if (slide.type === 'video') {
    return (
      <video
        ref={videoRef}
        src={slide.src}
        poster={slide.poster}
        aria-label={slide.alt}
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        className="absolute inset-0 w-full h-full object-cover pointer-events-none select-none"
      />
    );
  }

  // Imagen 4:5: en móvil se muestra completa (contain) sobre una copia difuminada de sí misma
  // para que no se recorte el texto ni queden bandas vacías en pantallas largas.
  // En desktop el marco tiene su misma proporción, así que el difuminado no se nota.
  return (
    <div className="absolute inset-0 bg-[#ee5a2c] pointer-events-none select-none">
      <img
        src={slide.src}
        alt=""
        aria-hidden="true"
        className="absolute inset-0 w-full h-full object-cover scale-125 blur-2xl"
      />
      <img
        src={slide.src}
        alt={slide.alt}
        decoding="async"
        draggable={false}
        className="relative w-full h-full object-contain"
      />
    </div>
  );
}

export function OnboardingFlow({ onComplete }: OnboardingFlowProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState(1);
  const isLast = currentIndex === SLIDES.length - 1;
  const slide = SLIDES[currentIndex];
  const overlayRef = useRef<HTMLDivElement>(null);

  // Bloqueo total de la página mientras el onboarding está abierto:
  // - html/body sin scroll y body en position:fixed (iOS Safari ignora solo overflow:hidden)
  // - se compensa el ancho de la scrollbar en desktop para que el layout no brinque
  // - rueda del mouse y touchmove se anulan (passive:false para poder hacer preventDefault)
  // Al cerrar se restaura todo, incluida la posición de scroll original.
  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const scrollY = window.scrollY;
    const scrollbarW = window.innerWidth - html.clientWidth;

    const prev = {
      htmlOverflow: html.style.overflow,
      overflow: body.style.overflow,
      position: body.style.position,
      top: body.style.top,
      left: body.style.left,
      right: body.style.right,
      width: body.style.width,
      paddingRight: body.style.paddingRight,
    };

    html.style.overflow = 'hidden';
    body.style.overflow = 'hidden';
    body.style.position = 'fixed';
    body.style.top = `-${scrollY}px`;
    body.style.left = '0';
    body.style.right = '0';
    body.style.width = '100%';
    if (scrollbarW > 0) body.style.paddingRight = `${scrollbarW}px`;

    const block = (e: Event) => e.preventDefault();
    const overlay = overlayRef.current;
    overlay?.addEventListener('wheel', block, { passive: false });
    overlay?.addEventListener('touchmove', block, { passive: false });

    return () => {
      overlay?.removeEventListener('wheel', block);
      overlay?.removeEventListener('touchmove', block);

      html.style.overflow = prev.htmlOverflow;
      body.style.overflow = prev.overflow;
      body.style.position = prev.position;
      body.style.top = prev.top;
      body.style.left = prev.left;
      body.style.right = prev.right;
      body.style.width = prev.width;
      body.style.paddingRight = prev.paddingRight;
      window.scrollTo(0, scrollY);
    };
  }, []);

  // Precarga de assets para que el cambio de slide sea instantáneo
  useEffect(() => {
    SLIDES.forEach((s) => {
      const img = new Image();
      img.src = s.type === 'video' ? s.poster : s.src;
      if (s.type === 'video') fetch(s.src).catch(() => {});
    });
  }, []);

  const handleComplete = () => {
    localStorage.setItem('estrella_onboarding_done', 'true');
    onComplete();
  };

  const goTo = (idx: number) => {
    if (idx === currentIndex || idx < 0 || idx >= SLIDES.length) return;
    setDirection(idx > currentIndex ? 1 : -1);
    setCurrentIndex(idx);
  };

  const nextSlide = () => {
    if (isLast) handleComplete();
    else goTo(currentIndex + 1);
  };

  // Navegación con teclado (desktop). Las teclas que normalmente scrollean la página se bloquean.
  useEffect(() => {
    const SCROLL_KEYS = ['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' ', 'Spacebar'];
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') goTo(currentIndex + 1);
      else if (e.key === 'ArrowLeft') goTo(currentIndex - 1);

      const onButton = (e.target as HTMLElement | null)?.tagName === 'BUTTON';
      // Dejamos que Espacio siga activando un botón enfocado; el resto de teclas de scroll se anulan.
      if (SCROLL_KEYS.includes(e.key) && !(onButton && (e.key === ' ' || e.key === 'Spacebar'))) {
        e.preventDefault();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIndex]);

  const slideVariants: Variants = {
    enter: (dir: number) => ({ x: dir > 0 ? 60 : -60, opacity: 0 }),
    center: {
      x: 0,
      opacity: 1,
      transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] as const },
    },
    exit: (dir: number) => ({
      x: dir > 0 ? -60 : 60,
      opacity: 0,
      transition: { duration: 0.25, ease: [0.22, 1, 0.36, 1] as const },
    }),
  };

  return (
    <motion.div
      ref={overlayRef}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className="fixed inset-0 z-[100] flex items-center justify-center overflow-hidden overscroll-none touch-none select-none bg-white font-sans"
    >
      {/* Móvil: pantalla completa (media arriba + footer). Desktop (md+): pantalla dividida, texto | arte */}
      <div
        style={{ '--ratio': slide.ratio, '--h': DESKTOP_H } as CSSProperties}
        className="relative flex flex-col w-full max-w-[460px] h-full bg-white md:flex-row md:max-w-none"
      >

        {/* ───────── DESKTOP: panel izquierdo (estilo Uber Eats: blanco, negro y grises) ───────── */}
        <div className="hidden md:flex md:order-1 md:flex-col md:justify-between md:w-[46%] lg:w-[42%] md:shrink-0 px-14 lg:px-24 py-10 bg-white">
          {/* Marca */}
          <div className="flex items-center gap-2.5">
            <img src="/estrella-circle.png" alt="" className="w-9 h-9 object-contain" />
            <span className="text-[22px] font-bold tracking-tight text-black">Estrella Eats</span>
          </div>

          {/* Contenido */}
          <div className="flex flex-col">
            {/* Progreso segmentado */}
            <div className="flex gap-2 w-36 mb-10" role="tablist" aria-label="Progreso">
              {SLIDES.map((s, idx) => (
                <button
                  key={s.id}
                  role="tab"
                  aria-selected={idx === currentIndex}
                  aria-label={`Ir al paso ${idx + 1}`}
                  onClick={() => goTo(idx)}
                  className="group flex-1 py-2"
                >
                  <span
                    className={`block h-[3px] rounded-full transition-colors duration-300 ${
                      idx === currentIndex ? 'bg-black' : 'bg-[#e2e2e2] group-hover:bg-[#c4c4c4]'
                    }`}
                  />
                </button>
              ))}
            </div>

            <motion.div
              key={slide.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
              className="min-h-[220px]"
            >
              <h2 className="text-[48px] lg:text-[60px] leading-[1.05] font-bold tracking-[-0.03em] text-black max-w-[560px]">
                {slide.title}
              </h2>
              <p className="mt-5 text-[18px] leading-[1.5] text-[#545454] max-w-[460px]">
                {slide.description}
              </p>
            </motion.div>

            <div className="mt-10 flex items-center gap-3">
              <button
                onClick={nextSlide}
                className="h-14 px-8 rounded-full bg-black hover:bg-[#333] text-white text-[16px] font-medium flex items-center gap-2 transition-colors active:scale-[0.98]"
              >
                {isLast ? (
                  'Comenzar a explorar'
                ) : (
                  <>
                    Siguiente <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </button>

              <button
                onClick={handleComplete}
                aria-hidden={isLast}
                tabIndex={isLast ? -1 : 0}
                className={`h-14 px-8 rounded-full bg-[#eeeeee] hover:bg-[#e2e2e2] text-black text-[16px] font-medium transition-all active:scale-[0.98] ${
                  isLast ? 'opacity-0 pointer-events-none' : 'opacity-100'
                }`}
              >
                Omitir
              </button>
            </div>
          </div>

          <p className="text-[13px] text-[#6b6b6b]">© {new Date().getFullYear()} Estrella Eats</p>
        </div>

        {/* Móvil: este wrapper es transparente (contents). Desktop: panel derecho gris claro con el arte centrado */}
        <div className="contents md:flex md:order-2 md:flex-1 md:items-center md:justify-center md:bg-[#f6f6f6]">
          {/* Área de media (imagen / video) */}
          <div
            className="relative flex-1 min-h-0 overflow-hidden
                       md:flex-none md:h-[var(--h)] md:w-[calc(var(--h)*var(--ratio))] md:rounded-[24px] md:transition-[width] md:duration-500 md:ease-out"
          >
            <AnimatePresence initial={false} custom={direction} mode="wait">
              <motion.div
                key={slide.id}
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                className="absolute inset-0"
              >
                <SlideMedia slide={slide} />
              </motion.div>
            </AnimatePresence>

            {/* Botón Omitir en móvil (se oculta en el último slide) */}
            <button
              onClick={handleComplete}
              aria-hidden={isLast}
              tabIndex={isLast ? -1 : 0}
              className={`md:hidden absolute top-4 right-4 z-20 px-4 py-2 rounded-full bg-white/85 backdrop-blur-md text-[13px] font-bold text-slate-700 shadow-[0_2px_12px_rgba(0,0,0,0.12)] active:scale-95 transition-all duration-300 ${
                isLast ? 'opacity-0 pointer-events-none' : 'opacity-100'
              }`}
            >
              Omitir
            </button>
          </div>
        </div>

        {/* Footer solo móvil: paginación + acción principal */}
        <div className="md:hidden shrink-0 flex flex-col items-center gap-5 px-6 pt-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] bg-white">
          <div className="flex gap-2" role="tablist" aria-label="Progreso">
            {SLIDES.map((s, idx) => (
              <button
                key={s.id}
                role="tab"
                aria-selected={idx === currentIndex}
                aria-label={`Ir al paso ${idx + 1}`}
                onClick={() => goTo(idx)}
                className={`h-2 rounded-full transition-all duration-300 ${
                  idx === currentIndex ? 'w-8 bg-[#FA4A0C]' : 'w-2 bg-slate-200 hover:bg-slate-300'
                }`}
              />
            ))}
          </div>

          <button
            onClick={nextSlide}
            className="w-full h-14 bg-[#FA4A0C] hover:bg-[#e8420a] text-white rounded-full font-bold text-lg flex items-center justify-center gap-2 active:scale-95 transition-all shadow-[0_8px_24px_rgba(250,74,12,0.35)]"
          >
            {isLast ? (
              'Comenzar a explorar'
            ) : (
              <>
                Siguiente <ArrowRight className="w-5 h-5 ml-1" />
              </>
            )}
          </button>
        </div>
      </div>
    </motion.div>
  );
}
