import { Home, MapPin, Search, ShoppingCart } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

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
      {/* Degradado detrás del nav */}
      <div className="md:hidden fixed bottom-0 left-0 w-full h-28 bg-gradient-to-t from-white via-white/90 to-transparent pointer-events-none z-40"></div>

      {/* Bottom Nav Flotante - Solo móvil */}
      <nav className="md:hidden fixed bottom-1.5 left-1/2 -translate-x-1/2 w-[92%] max-w-sm z-50">
        <div className="bg-white rounded-full p-1.5 flex items-center justify-between shadow-[0_4px_25px_rgb(0,0,0,0.15)] border border-gray-100">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeNavTab === item.id;
            const isSearch = item.id === 'search';
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
                className={`relative flex items-center justify-center transition-all duration-300 outline-none ${
                  isSearch
                    ? `flex-1 h-12 rounded-full border mx-1 shadow-sm ${isActive ? 'border-black bg-gray-50' : 'border-gray-200 bg-white hover:bg-gray-50'}`
                    : `w-12 h-12 rounded-full flex-shrink-0 ${isActive ? 'bg-gray-100' : 'bg-transparent hover:bg-gray-50'}`
                }`}
                aria-label={item.label}
              >
                <Icon
                  size={22}
                  strokeWidth={isActive ? 2 : 1.5}
                  className={isActive ? 'text-black' : 'text-gray-500'}
                  fill={isActive && !isSearch ? 'currentColor' : 'none'}
                />
                {isSearch && (
                  <span className={`ml-2 text-sm font-medium ${isActive ? 'text-black' : 'text-gray-600'}`}>
                    Buscar
                  </span>
                )}
                {item.id === 'cart' && activeOrderId && (
                  <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-[#05a559] text-white text-[10px] font-bold flex items-center justify-center rounded-full border-2 border-white box-content">
                    1
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
}
