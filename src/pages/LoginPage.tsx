import { useState } from 'react'
import { motion } from 'framer-motion'
import { supabase } from '../lib/supabase'
import { Store, Lock, AlertCircle, Loader2, CheckCircle2 } from 'lucide-react'

export function LoginPage() {
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  const containerVariants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.1 } }
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 30 },
    show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 300, damping: 25 } }
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (phone.length < 10) {
      setError('Ingresa un número válido de 10 dígitos.')
      return
    }
    
    setLoading(true)
    setError('')
    
    // Autocompleta el correo en base al número
    const email = `aliado_${phone}@app-estrella.shop`
    
    const { error: err } = await supabase.auth.signInWithPassword({ email, password })
    if (err) {
      setError('Credenciales incorrectas o acceso denegado.')
      setLoading(false)
    } else {
      setSuccess(true)
      setTimeout(() => setLoading(false), 1000)
    }
  }

  return (
    <div className="mesh-bg flex items-center justify-center min-h-screen p-4 overflow-hidden relative">
      
      {/* Elementos decorativos flotantes de fondo */}
      <motion.div 
        animate={{ y: [0, -20, 0], rotate: [0, 5, 0] }} 
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        className="absolute top-1/4 left-1/4 w-64 h-64 bg-[#FF7A6A]/20 rounded-full blur-3xl pointer-events-none"
      />
      <motion.div 
        animate={{ y: [0, 30, 0], rotate: [0, -5, 0] }} 
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut", delay: 1 }}
        className="absolute bottom-1/4 right-1/4 w-72 h-72 bg-[#FF6B5B]/20 rounded-full blur-3xl pointer-events-none"
      />

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="w-full max-w-[400px] z-10"
      >
        {/* Logo y Encabezado */}
        <motion.div variants={itemVariants} className="text-center mb-8">
          <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-[#FFA08A] to-[#FF6B5B] flex items-center justify-center mx-auto mb-5 shadow-[0_8px_32px_rgba(255,107,91,0.4)] relative">
            <div className="absolute inset-0 bg-white/20 rounded-3xl backdrop-blur-[2px]" />
            <Store size={36} color="white" className="relative z-10" />
          </div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight mb-2">
            Portal Negocios
          </h1>
          <p className="text-slate-600 font-medium">
            Estrella Delivery — Panel de Control
          </p>
        </motion.div>

        {/* Tarjeta Glassmorphism */}
        <motion.div variants={itemVariants} className="bg-white/80 backdrop-blur-xl rounded-[32px] p-8 relative overflow-hidden shadow-[0_10px_40px_rgba(0,0,0,0.04)] border border-white">
          {/* Brillo diagonal interno */}
          <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-white/40 to-transparent pointer-events-none" />
          
          <form onSubmit={handleLogin} className="flex flex-col gap-5 relative z-10">
            <motion.div variants={itemVariants} className="field flex flex-col gap-1.5">
              <label className="text-sm font-bold text-slate-700">Número de Teléfono</label>
              <div className="relative group">
                <input
                  type="tel" 
                  value={phone} 
                  onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  placeholder="123 456 7890" 
                  required
                  className="w-full pl-4 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:border-[#FF7A6A] focus:ring-4 focus:ring-[#FF7A6A]/10 outline-none transition-all font-medium text-slate-800"
                />
              </div>
            </motion.div>
            
            <motion.div variants={itemVariants} className="field flex flex-col gap-1.5">
              <label className="text-sm font-bold text-slate-700">Contraseña</label>
              <div className="relative group">
                <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#FF7A6A] transition-colors" />
                <input
                  type="password" 
                  value={password} 
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••" 
                  required 
                  className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:border-[#FF7A6A] focus:ring-4 focus:ring-[#FF7A6A]/10 outline-none transition-all font-medium text-slate-800 tracking-widest"
                />
              </div>
            </motion.div>

            {error && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="flex items-center gap-2 text-red-500 text-sm font-semibold bg-[#FFF0EE] p-3 rounded-xl border border-red-100">
                <AlertCircle size={18} className="shrink-0" />
                {error}
              </motion.div>
            )}

            <motion.button 
              variants={itemVariants}
              whileTap={{ scale: 0.97 }}
              type="submit" 
              className={`w-full py-4 text-base font-bold rounded-2xl text-white transition-all shadow-lg flex items-center justify-center gap-2 mt-2 ${success ? 'bg-emerald-500 shadow-emerald-500/30' : 'bg-[#FF7A6A] hover:bg-[#ff6250] shadow-[#FF7A6A]/30'}`}
              disabled={loading || success} 
            >
              {success ? (
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="flex items-center gap-2">
                  <CheckCircle2 size={22} />
                  ¡Bienvenido!
                </motion.div>
              ) : loading ? (
                <>
                  <Loader2 size={22} className="animate-spin" />
                  Conectando...
                </>
              ) : (
                'Acceder al Portal'
              )}
            </motion.button>
          </form>
        </motion.div>

        <motion.p variants={itemVariants} className="text-center text-slate-500 text-sm mt-8 font-medium">
          ¿Problemas de acceso? <br/>Contacta a soporte de Estrella Delivery.
        </motion.p>
      </motion.div>
    </div>
  )
}

