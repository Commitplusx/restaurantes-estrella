import { useState } from 'react';
import { Star, Camera } from 'lucide-react';
import { Link } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';

export function FlyerGeneratorPage() {
  const [restaurantName, setRestaurantName] = useState('Mi Restaurante');
  const [promoText, setPromoText] = useState('¡ENVÍO GRATIS en tu primer pedido!');
  const [bgImage, setBgImage] = useState('https://images.unsplash.com/photo-1550547660-d9450f859349?ixlib=rb-4.0.3&auto=format&fit=crop&w=1080&q=80');
  
  // Nuevas Opciones
  const [colorStyle, setColorStyle] = useState<'dark' | 'orange' | 'purple' | 'light'>('dark');
  const [restaurantLogo, setRestaurantLogo] = useState<string | null>(null);
  const [estrellaLogo, setEstrellaLogo] = useState<string | null>(null);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>, setLogo: (url: string) => void) => {
    if (e.target.files && e.target.files[0]) {
      const url = URL.createObjectURL(e.target.files[0]);
      setLogo(url);
    }
  }

  const getOverlayStyle = () => {
    switch (colorStyle) {
      case 'dark': return 'linear-gradient(to bottom, rgba(0,0,0,0.3), rgba(0,0,0,0.85))';
      case 'orange': return 'linear-gradient(to bottom, rgba(250,74,12,0.4), rgba(250,74,12,0.9))';
      case 'purple': return 'linear-gradient(to bottom, rgba(147,51,234,0.4), rgba(76,29,149,0.9))';
      case 'light': return 'linear-gradient(to bottom, rgba(255,255,255,0.5), rgba(255,255,255,0.95))';
      default: return 'linear-gradient(to bottom, rgba(0,0,0,0.3), rgba(0,0,0,0.85))';
    }
  }

  const getTextColorClass = () => {
    return colorStyle === 'light' ? 'text-slate-900' : 'text-white';
  }
  const getSubTextColorClass = () => {
    return colorStyle === 'light' ? 'text-slate-600' : 'text-slate-200';
  }

  // El tamaño óptimo para Instagram es 1080x1080 (1:1 aspect ratio)
  // Aquí lo mostramos escalado pero manteniendo la proporción cuadrada.
  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-12 font-sans flex flex-col md:flex-row gap-12">
      
      {/* Panel de Control (Izquierda) */}
      <div className="w-full md:w-1/3 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <div className="flex items-center gap-2 mb-8 text-slate-900">
          <Star className="text-[#FA4A0C] fill-[#FA4A0C]" />
          <h1 className="text-xl font-black">Estrella Eats - Flyer Gen</h1>
        </div>

        <div className="space-y-6">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">Nombre del Restaurante</label>
            <input 
              type="text" 
              value={restaurantName}
              onChange={(e) => setRestaurantName(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 font-medium focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">Texto de Promoción (Opcional)</label>
            <input 
              type="text" 
              value={promoText}
              onChange={(e) => setPromoText(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 font-medium focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">URL de Imagen de Fondo (Comida)</label>
            <input 
              type="text" 
              value={bgImage}
              onChange={(e) => setBgImage(e.target.value)}
              placeholder="https://ejemplo.com/hamburguesa.jpg"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 font-medium focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
            />
            <p className="text-xs text-slate-500 mt-2">Pon el link de una foto apetitosa de su comida, preferiblemente oscura o le bajaremos el brillo automático.</p>
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">Color del Diseño</label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              <button onClick={() => setColorStyle('dark')} className={`py-2 px-3 rounded-lg text-xs font-bold transition-all border-2 ${colorStyle === 'dark' ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'}`}>Oscuro</button>
              <button onClick={() => setColorStyle('orange')} className={`py-2 px-3 rounded-lg text-xs font-bold transition-all border-2 ${colorStyle === 'orange' ? 'border-[#FA4A0C] bg-[#FA4A0C] text-white' : 'border-slate-200 bg-white text-slate-600 hover:border-[#FA4A0C]/50'}`}>Naranja</button>
              <button onClick={() => setColorStyle('purple')} className={`py-2 px-3 rounded-lg text-xs font-bold transition-all border-2 ${colorStyle === 'purple' ? 'border-purple-600 bg-purple-600 text-white' : 'border-slate-200 bg-white text-slate-600 hover:border-purple-300'}`}>Neón</button>
              <button onClick={() => setColorStyle('light')} className={`py-2 px-3 rounded-lg text-xs font-bold transition-all border-2 ${colorStyle === 'light' ? 'border-slate-400 bg-slate-100 text-slate-900' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'}`}>Cristal</button>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block text-sm font-bold text-slate-700 mb-2">Logo Restaurante</label>
              <label className="flex items-center justify-center w-full h-12 px-4 transition bg-slate-50 border-2 border-slate-200 border-dashed rounded-xl appearance-none cursor-pointer hover:border-orange-500 focus:outline-none">
                <span className="flex items-center space-x-2">
                  <Camera className="w-5 h-5 text-slate-400" />
                  <span className="font-medium text-slate-600 text-sm">{restaurantLogo ? 'Cambiar' : 'Subir Logo'}</span>
                </span>
                <input type="file" accept="image/*" className="hidden" onChange={(e) => handleLogoUpload(e, setRestaurantLogo)} />
              </label>
            </div>
            
            <div className="flex-1">
              <label className="block text-sm font-bold text-slate-700 mb-2">Logo Estrella Eats</label>
              <label className="flex items-center justify-center w-full h-12 px-4 transition bg-slate-50 border-2 border-slate-200 border-dashed rounded-xl appearance-none cursor-pointer hover:border-orange-500 focus:outline-none">
                <span className="flex items-center space-x-2">
                  <Star className="w-5 h-5 text-slate-400" />
                  <span className="font-medium text-slate-600 text-sm">{estrellaLogo ? 'Cambiar' : 'Subir Custom'}</span>
                </span>
                <input type="file" accept="image/*" className="hidden" onChange={(e) => handleLogoUpload(e, setEstrellaLogo)} />
              </label>
            </div>
          </div>

          <hr className="border-slate-100" />

          <div className="bg-orange-50 rounded-xl p-4 text-sm text-orange-800">
            <strong>Instrucciones:</strong> Modifica los datos arriba. Cuando el flyer de la derecha se vea perfecto, tómale una captura de pantalla cuadrada desde tu celular o computadora y mándasela al restaurante para que la publiquen en su Facebook/Instagram.
          </div>
          
          <div className="flex flex-col gap-2">
            <button onClick={() => { setRestaurantLogo(null); setEstrellaLogo(null); setColorStyle('dark'); }} className="text-xs text-slate-500 hover:text-slate-900 text-center underline font-bold mt-2">Limpiar logos y resetear</button>
            <Link to="/" className="block text-center text-sm font-bold text-slate-500 hover:text-slate-900 mt-2">
              Volver al inicio
            </Link>
          </div>
        </div>
      </div>

      {/* Área de Previsualización (Derecha) */}
      <div className="w-full md:w-2/3 flex flex-col items-center justify-center bg-slate-200/50 rounded-2xl p-6 border-2 border-dashed border-slate-300">
        <h2 className="text-slate-500 font-bold mb-4 uppercase tracking-widest text-sm flex items-center gap-2">
          <Camera size={16} /> Previsualización (1080x1080)
        </h2>
        
        {/* CONTENEDOR DEL FLYER (Mantener siempre cuadrado) */}
        <div 
          className="relative w-full max-w-[500px] aspect-square bg-slate-900 rounded-sm shadow-2xl overflow-hidden flex flex-col items-center justify-center text-center p-8 transition-all duration-500"
          style={{
            backgroundImage: `${getOverlayStyle()}, url(${bgImage})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center'
          }}
        >
          {/* Logo Estrella Eats Flotante */}
          <div className={`absolute top-6 left-6 backdrop-blur-md border rounded-full px-4 py-2 flex items-center gap-2 ${colorStyle === 'light' ? 'bg-black/5 border-black/10' : 'bg-white/10 border-white/20'}`}>
            {estrellaLogo ? (
              <img src={estrellaLogo} alt="Estrella Eats" className="w-6 h-6 object-contain" />
            ) : (
              <Star size={16} className={`${colorStyle === 'light' ? 'text-[#FA4A0C] fill-[#FA4A0C]' : 'text-[#FA4A0C] fill-[#FA4A0C]'}`} />
            )}
            <span className={`${getTextColorClass()} font-bold text-sm tracking-tight`}>Estrella Eats</span>
          </div>

          {/* Badge Nuevo */}
          <div className="inline-block bg-[#FA4A0C] text-white text-xs font-black px-3 py-1 rounded-full uppercase tracking-widest mb-6 shadow-lg animate-pulse mt-12">
            ¡YA ESTAMOS EN LA APP!
          </div>

          {/* Logo del Restaurante (Si se subió) */}
          {restaurantLogo && (
            <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl sm:rounded-3xl overflow-hidden bg-white shadow-2xl mb-4 border-4 border-white/20">
              <img src={restaurantLogo} alt="Restaurante" className="w-full h-full object-cover" />
            </div>
          )}

          {/* Título Principal */}
          <h3 className={`text-3xl sm:text-4xl md:text-5xl font-black ${getTextColorClass()} mb-2 leading-[1.1] drop-shadow-lg`}>
            {restaurantName}
          </h3>
          <p className={`text-lg sm:text-xl ${getSubTextColorClass()} font-medium mb-8`}>
            a domicilio en minutos.
          </p>

          {/* Promo Box */}
          {promoText && (
            <div className={`backdrop-blur-md border rounded-2xl p-4 w-full max-w-sm mx-auto mb-8 transform -rotate-1 ${colorStyle === 'light' ? 'bg-black/5 border-black/10 shadow-sm' : 'bg-white/10 border-white/20 shadow-lg'}`}>
              <p className={`${colorStyle === 'light' ? 'text-orange-600' : 'text-yellow-400'} font-black text-lg md:text-xl`}>{promoText}</p>
              <p className={`${getTextColorClass()} text-sm mt-1`}>Escaneando el código QR</p>
            </div>
          )}

          {/* Footer del flyer (QR Real) */}
          <div className={`mt-auto pt-6 flex items-center justify-between w-full border-t ${colorStyle === 'light' ? 'border-black/10' : 'border-white/20'}`}>
            <div className="text-left">
              <p className={`${getTextColorClass()} font-bold text-lg leading-none mb-1`}>Sin tarifas ocultas.</p>
              <p className={`${getSubTextColorClass()} text-sm`}>Pide por WhatsApp, rápido y seguro.</p>
            </div>
            <div className="w-16 h-16 bg-white rounded-lg flex items-center justify-center p-1">
              <QRCodeSVG 
                value="https://estrella-eats.mx" 
                size={56} 
                level="M"
                includeMargin={false}
              />
            </div>
          </div>
        </div>
        
      </div>
    </div>
  );
}
