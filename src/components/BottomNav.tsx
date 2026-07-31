import { Home, MapPin, Search, ShoppingCart } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

interface BottomNavProps {
  activeNavTab: string;
  setActiveNavTab: (tab: string) => void;
  activeOrderId: string | null;
}

export function BottomNav({ activeNavTab, setActiveNavTab, activeOrderId }: BottomNavProps) {
  const navigate = useNavigate();

  const navItems = [
    { id: 'home', icon: Home, label: 'Inicio' },
    { id: 'location', icon: MapPin, label: 'Ubicación' },
    { id: 'search', icon: Search, label: 'Buscar' },
    { id: 'cart', icon: ShoppingCart, label: 'Carrito' }
  ];

  return (
    <>
      {/* Soft gradient fade at the bottom to blend with content */}
      <div className="md:hidden fixed bottom-0 left-0 w-full h-32 bg-gradient-to-t from-slate-50 via-slate-50/80 to-transparent pointer-events-none z-40"></div>

      {/* Ultra-premium floating dock (Slimmer Width) */}
      <nav className="md:hidden fixed bottom-6 left-1/2 -translate-x-1/2 w-max z-50">
        <div className="bg-white/90 backdrop-blur-2xl rounded-full p-1 px-3 flex items-center gap-3 justify-center shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-white/60">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeNavTab === item.id;
            
            return (
              <button
                key={item.id}
                onClick={() => {
                  if (item.id === 'cart') {
                    if (activeOrderId) {
                      navigate(`/success?pedido=${activeOrderId}`);
                    } else {
                      navigate('/menu/global/carrito');
                    }
                    return;
                  }
                  setActiveNavTab(item.id);
                }}
                className="relative flex items-center justify-center w-12 h-12 outline-none group"
                aria-label={item.label}
              >
                {/* Sliding Background Circle */}
                {isActive && (
                  <motion.div
                    layoutId="bottomNavHighlight"
                    className="absolute inset-0 bg-black rounded-full"
                    transition={{ type: "spring", stiffness: 500, damping: 35 }}
                  />
                )}

                <div className="flex items-center justify-center shrink-0 relative z-10">
                  <motion.div
                    initial={false}
                    animate={{ scale: isActive ? 1.05 : 1 }}
                    transition={{ type: "spring", stiffness: 400, damping: 25 }}
                  >
                    <Icon
                      size={20}
                      strokeWidth={isActive ? 2.5 : 2.5}
                      className={`transition-colors duration-300 ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-600'}`}
                    />
                    {/* Notification dot for Cart */}
                    {item.id === 'cart' && activeOrderId && (
                      <span className={`absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white box-content shadow-sm ${isActive ? 'bg-green-400' : 'bg-red-500'}`}></span>
                    )}
                  </motion.div>
                </div>
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
}
