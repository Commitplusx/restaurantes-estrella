import { Link } from 'react-router-dom'
import { ChevronLeft, FileText, CheckCircle2, Store, UserCheck, ShoppingBag, Star, AlertTriangle, RefreshCw, Mail } from 'lucide-react'
import { motion, Variants } from 'framer-motion'

export function TermsPage() {
  const sections = [
    {
      id: 1,
      title: 'Aceptación de los Términos',
      icon: <CheckCircle2 size={24} className="text-orange-500" />,
      content: 'Al acceder y utilizar la plataforma Estrella Eats (en adelante "La Plataforma"), usted acepta estar sujeto a estos Términos y Condiciones. Si no está de acuerdo con alguna parte de los términos, no podrá utilizar nuestros servicios.'
    },
    {
      id: 2,
      title: 'Descripción del Servicio',
      icon: <Store size={24} className="text-blue-500" />,
      content: 'Estrella Eats funciona como una plataforma tecnológica que conecta a usuarios consumidores con restaurantes locales, permitiendo la visualización de menús, realización de pedidos, y un sistema de recompensas (Programa de Lealtad). La Plataforma actúa únicamente como intermediario tecnológico.'
    },
    {
      id: 3,
      title: 'Cuentas de Usuario',
      icon: <UserCheck size={24} className="text-green-500" />,
      bullets: [
        'Para utilizar ciertas funciones, debe registrarse utilizando un número de teléfono celular válido.',
        'Usted es responsable de mantener la confidencialidad de su cuenta y contraseña (OTP o método de autenticación).',
        'La Plataforma se reserva el derecho de suspender o cancelar cuentas que violen estos términos, realicen pedidos falsos o incurran en comportamientos fraudulentos.'
      ]
    },
    {
      id: 4,
      title: 'Pedidos y Entregas',
      icon: <ShoppingBag size={24} className="text-purple-500" />,
      bullets: [
        'Disponibilidad: Todos los pedidos están sujetos a la disponibilidad del restaurante y a sus horarios de operación.',
        'Precios: Los precios mostrados en La Plataforma incluyen impuestos aplicables, pero pueden no incluir los costos de envío.',
        'Tiempos: Los tiempos de entrega son estimados y pueden variar debido a factores externos (tráfico, clima, saturación del restaurante).',
        'Cancelaciones: El restaurante se reserva el derecho de cancelar un pedido si los artículos no están disponibles. No se realizará ningún cargo al cliente.'
      ]
    },
    {
      id: 5,
      title: 'Programa de Lealtad (Estrellas)',
      icon: <Star size={24} className="text-yellow-500 fill-yellow-500/20" />,
      content: 'La Plataforma ofrece un programa de lealtad donde los usuarios pueden acumular puntos ("Estrellas") por sus compras:',
      bullets: [
        'Las Estrellas no tienen valor monetario en efectivo y no pueden ser intercambiadas por dinero.',
        'La tasa de acumulación y redención de Estrellas puede ser modificada por La Plataforma en cualquier momento sin previo aviso.',
        'Las Estrellas están vinculadas a la cuenta del usuario y son intransferibles.'
      ]
    },
    {
      id: 6,
      title: 'Responsabilidad',
      icon: <AlertTriangle size={24} className="text-red-500" />,
      content: 'La preparación de los alimentos, su calidad y el cumplimiento de las normas de salubridad son responsabilidad exclusiva de cada restaurante asociado. Estrella Eats no se hace responsable por problemas de salud, alergias o cualquier daño derivado del consumo de los alimentos adquiridos a través de la plataforma.'
    },
    {
      id: 7,
      title: 'Modificaciones',
      icon: <RefreshCw size={24} className="text-teal-500" />,
      content: 'Nos reservamos el derecho de modificar o reemplazar estos Términos en cualquier momento. El uso continuo de la plataforma después de cualquier cambio constituye su aceptación de los nuevos Términos.'
    },
    {
      id: 8,
      title: 'Contacto',
      icon: <Mail size={24} className="text-slate-500" />,
      content: 'Si tiene alguna pregunta sobre estos Términos, por favor contacte a nuestro equipo de soporte técnico a través de los canales oficiales.'
    }
  ]

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  }

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] relative overflow-hidden pb-24">
      {/* Background Decorators */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-[1200px] h-[600px] bg-gradient-to-b from-orange-500/5 to-transparent pointer-events-none rounded-full blur-3xl" />
      
      <div className="max-w-[900px] mx-auto px-6 pt-12 md:pt-20 relative z-10">
        
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-16"
        >
          <Link to="/" className="inline-flex items-center text-slate-400 hover:text-orange-500 font-bold transition-colors mb-8 bg-white/50 px-4 py-2 rounded-full border border-slate-200/50 backdrop-blur-md">
            <ChevronLeft size={18} className="mr-1" />
            Regresar al inicio
          </Link>
          
          <div className="flex flex-col md:flex-row md:items-center gap-6">
            <div className="w-16 h-16 bg-white rounded-3xl flex items-center justify-center text-orange-500 shrink-0 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 rotate-3">
              <FileText size={32} />
            </div>
            <div>
              <h1 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight mb-2">Términos y Condiciones</h1>
              <p className="text-slate-500 font-medium flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-green-500 inline-block animate-pulse"></span>
                Vigentes a partir de Julio 2026
              </p>
            </div>
          </div>
        </motion.div>

        {/* Content Grid */}
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="grid gap-6"
        >
          {sections.map((section) => (
            <motion.div 
              key={section.id}
              variants={itemVariants}
              className="bg-white rounded-[32px] p-8 md:p-10 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 transition-all hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] group"
            >
              <div className="flex items-start gap-5">
                <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center shrink-0 border border-slate-100 group-hover:scale-110 transition-transform duration-300">
                  {section.icon}
                </div>
                <div className="flex-1 pt-1">
                  <h2 className="text-xl md:text-2xl font-black text-slate-900 mb-4">{section.id}. {section.title}</h2>
                  
                  {section.content && (
                    <p className="text-slate-600 text-[15px] md:text-[16px] leading-relaxed mb-4 last:mb-0">
                      {section.content}
                    </p>
                  )}

                  {section.bullets && (
                    <ul className="space-y-3">
                      {section.bullets.map((bullet, idx) => (
                        <li key={idx} className="flex items-start gap-3">
                          <span className="w-1.5 h-1.5 rounded-full bg-orange-400 shrink-0 mt-2.5"></span>
                          <span className="text-slate-600 text-[15px] md:text-[16px] leading-relaxed">{bullet}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Footer Note */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="mt-16 text-center text-slate-400 text-sm font-medium"
        >
          © {new Date().getFullYear()} Estrella Eats. Todos los derechos reservados.
        </motion.div>
      </div>
    </div>
  )
}
