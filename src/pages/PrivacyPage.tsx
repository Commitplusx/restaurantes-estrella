import { Link } from 'react-router-dom'
import { ChevronLeft, ShieldCheck, Building2, Target, Database, Cookie, Scale, RefreshCcw } from 'lucide-react'
import { motion, type Variants } from 'framer-motion'

export function PrivacyPage() {
  const sections = [
    {
      id: 1,
      title: 'Identidad y domicilio del Responsable',
      icon: <Building2 size={24} className="text-blue-500" />,
      content: 'Estrella Eats (en adelante "La Plataforma"), con operaciones principales en Comitán de Domínguez, Chiapas, México, es el responsable del uso y protección de sus datos personales, y al respecto le informamos lo siguiente.'
    },
    {
      id: 2,
      title: 'Fines de uso de sus datos personales',
      icon: <Target size={24} className="text-green-500" />,
      content: 'Los datos personales que recabamos de usted, los utilizaremos para las siguientes finalidades necesarias:',
      bullets: [
        'Creación y gestión de su cuenta de usuario.',
        'Procesamiento, envío y entrega de sus pedidos de comida.',
        'Asignación, gestión y redención de puntos en nuestro Programa de Lealtad.',
        'Comunicación sobre el estado de sus pedidos y soporte al cliente.'
      ]
    },
    {
      id: 3,
      title: 'Datos personales requeridos',
      icon: <Database size={24} className="text-purple-500" />,
      content: 'Para llevar a cabo las finalidades descritas, utilizaremos los siguientes datos personales:',
      bullets: [
        'Nombre completo.',
        'Número de teléfono celular (usado para inicio de sesión y contacto logístico).',
        'Dirección de entrega (incluyendo coordenadas GPS para optimizar las rutas).',
        'Historial de pedidos y preferencias de navegación dentro de la app.'
      ]
    },
    {
      id: 4,
      title: 'Uso de Cookies y Rastreo',
      icon: <Cookie size={24} className="text-orange-500" />,
      content: 'En nuestra página web utilizamos cookies o tecnologías similares. Estas nos permiten brindarle una experiencia fluida al mantener su sesión activa, guardar artículos en su carrito y recordar sus preferencias. Usted puede deshabilitar estas tecnologías desde su navegador, aunque algunas funciones podrían dejar de operar correctamente.'
    },
    {
      id: 5,
      title: 'Derechos ARCO (Acceso, Rectificación, Cancelación u Oposición)',
      icon: <Scale size={24} className="text-indigo-500" />,
      content: 'Usted tiene derecho a conocer qué datos tenemos y cómo los usamos (Acceso); solicitar la corrección de información inexacta (Rectificación); pedir su eliminación de nuestros registros (Cancelación); o negarse a un uso específico (Oposición).',
      bullets: [
        'Para ejercer estos derechos, debe contactar a nuestro equipo de soporte mediante los canales oficiales.',
        'Procesaremos su solicitud en los tiempos estipulados por la ley aplicable.'
      ]
    },
    {
      id: 6,
      title: 'Cambios al Aviso de Privacidad',
      icon: <RefreshCcw size={24} className="text-teal-500" />,
      content: 'Este aviso puede sufrir modificaciones por requerimientos legales o cambios en nuestras prácticas. Nos comprometemos a mantenerlo informado publicando las versiones actualizadas en esta misma sección de la plataforma web.'
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
            <div className="w-16 h-16 bg-white rounded-3xl flex items-center justify-center text-orange-500 shrink-0 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 -rotate-3">
              <ShieldCheck size={32} />
            </div>
            <div>
              <h1 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight mb-2">Aviso de Privacidad</h1>
              <p className="text-slate-500 font-medium flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-blue-500 inline-block animate-pulse"></span>
                Vigente a partir de Julio 2026
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
