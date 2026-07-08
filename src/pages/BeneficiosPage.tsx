import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Star, Heart, ShieldCheck, ChevronLeft, Wallet, Percent, TrendingUp } from 'lucide-react'

export function BeneficiosPage() {
  const beneficios = [
    {
      icon: <Percent className="w-6 h-6 text-slate-700" />,
      titulo: "Precios Reales",
      descripcion: "En Estrella Eats encuentras los mismos precios que en el menú físico. Sin tarifas ocultas ni platillos inflados."
    },
    {
      icon: <Wallet className="w-6 h-6 text-slate-700" />,
      titulo: "Billetera VIP",
      descripcion: "Cada pedido suma saldo real a tu cuenta. Úsalo para cubrir tus envíos o pagar tus próximos antojos."
    },
    {
      icon: <TrendingUp className="w-6 h-6 text-slate-700" />,
      titulo: "Promos Exclusivas",
      descripcion: "Descuentos y combos únicos directamente de tus restaurantes favoritos, pensados especialmente para ti."
    },
    {
      icon: <Heart className="w-6 h-6 text-slate-700" />,
      titulo: "Apoyo Local",
      descripcion: "Cada pedido impulsa a emprendedores y repartidores de tu comunidad, fortaleciendo nuestra economía."
    },
    {
      icon: <ShieldCheck className="w-6 h-6 text-slate-700" />,
      titulo: "Atención Cercana",
      descripcion: "Olvídate de las respuestas automáticas. Nuestro equipo te atiende personalmente por WhatsApp."
    },
    {
      icon: <Star className="w-6 h-6 text-slate-700" />,
      titulo: "Invita y Gana",
      descripcion: "Comparte tu código VIP con amigos y ambos recibirán beneficios inmediatos en sus cuentas."
    }
  ]

  return (
    <div className="min-h-screen bg-white flex flex-col font-sans">
      {/* Cabecera Ultra Limpia */}
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md">
        <div className="max-w-5xl mx-auto px-6 h-20 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 text-slate-400 hover:text-slate-900 transition-colors">
            <ChevronLeft size={20} />
            <span className="font-medium text-sm">Volver</span>
          </Link>
          <div className="font-black text-lg tracking-tight text-slate-900">
            Estrella <span className="text-[#FA4A0C]">Eats</span>
          </div>
          <div className="w-16" />
        </div>
      </header>

      <main className="flex-1 w-full max-w-5xl mx-auto px-6 py-12 md:py-24">
        {/* Encabezado Principal */}
        <div className="max-w-3xl mx-auto text-center mb-24">
          <motion.h1 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl md:text-5xl lg:text-6xl font-black text-slate-900 tracking-tight leading-[1.1] mb-6"
          >
            Tu comida al precio real. <br />
            <span className="text-slate-400">Paga lo justo.</span>
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="text-lg md:text-xl text-slate-500 font-medium leading-relaxed max-w-2xl mx-auto"
          >
            Diseñamos una plataforma sin comisiones abusivas. Los restaurantes ganan lo que merecen, y tú acumulas dinero real en cada pedido.
          </motion.p>
        </div>

        {/* Cuadrícula de Beneficios Limpia */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-y-16 gap-x-12 mb-32">
          {beneficios.map((ben, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.05 }}
              className="flex flex-col items-center text-center group"
            >
              <div className="w-14 h-14 rounded-2xl bg-slate-50 flex items-center justify-center mb-6 group-hover:bg-orange-50 group-hover:text-[#FA4A0C] transition-colors duration-300">
                <div className="group-hover:text-[#FA4A0C] transition-colors duration-300">
                  {ben.icon}
                </div>
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">{ben.titulo}</h3>
              <p className="text-slate-500 leading-relaxed text-sm md:text-base">
                {ben.descripcion}
              </p>
            </motion.div>
          ))}
        </div>

        {/* Llamado a la Acción */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.98 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="text-center bg-slate-50 rounded-[2rem] py-16 px-6"
        >
          <h2 className="text-2xl md:text-3xl font-black text-slate-900 mb-4 tracking-tight">
            ¿Listo para tu primer pedido?
          </h2>
          <p className="text-slate-500 mb-10 max-w-md mx-auto">
            Explora los restaurantes de tu ciudad y descubre los beneficios de Estrella Eats.
          </p>
          <Link
            to="/"
            className="inline-flex items-center justify-center bg-slate-900 hover:bg-black text-white font-semibold text-base px-8 py-4 rounded-full transition-transform active:scale-95"
          >
            Ver Restaurantes Disponibles
          </Link>
        </motion.div>
      </main>
      
      <footer className="py-12 text-center text-slate-400 text-sm font-medium">
        <p>© {new Date().getFullYear()} Estrella Eats.</p>
      </footer>
    </div>
  )
}
