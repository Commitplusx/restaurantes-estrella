import { useState } from 'react'
import { motion } from 'framer-motion'
import { supabase } from '../lib/supabase'
import { Lock, AlertCircle, Loader2, CheckCircle2, Eye, EyeOff } from 'lucide-react'

export function LoginPage() {
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (loading || success) return
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
      if (err.message === 'Invalid login credentials') {
        setError('Teléfono o contraseña incorrectos.')
      } else {
        setError('Error al iniciar sesión: ' + err.message)
      }
      setLoading(false)
    } else {
      setSuccess(true)
      setTimeout(() => setLoading(false), 1000)
    }
  }

  return (
    <div className="flex min-h-screen bg-white">
      {/* Mitad Izquierda - Imagen (Oculta en móviles) */}
      <div className="hidden lg:flex w-1/2 relative bg-[#F73220] overflow-hidden items-center justify-center">
        <img 
          src="/login-cover.jpg" 
          alt="Restaurante Estrella Eats" 
          className="absolute inset-0 w-full h-full object-contain object-center scale-105"
        />
        {/* Capa oscura ultra sutil para que los blancos de la imagen resalten más */}
        <div className="absolute inset-0 bg-black/5"></div>

        {/* Efecto de difuminado (fade) hacia el formulario blanco */}
        <div className="absolute inset-y-0 right-0 w-48 bg-gradient-to-r from-transparent via-white/80 to-white z-10 pointer-events-none"></div>
      </div>

      {/* Mitad Derecha - Formulario Limpio */}
      <div className="w-full lg:w-1/2 flex flex-col justify-center items-center p-8 sm:p-12 xl:p-24 relative bg-white">
        
        {/* Resplandor sutil color corporativo en la esquina */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] bg-[#FF3B2F]/5 rounded-full blur-[100px]"></div>
        </div>

        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.7, ease: "easeOut" }}
          className="w-full max-w-[420px] relative z-10"
        >
          {/* 🌟 IMAGEN EXCLUSIVA PARA MÓVIL 🌟 */}
          <div className="lg:hidden w-full flex justify-center -mb-24 relative">
            <motion.div 
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 150 }}
              className="relative w-[300px] h-[300px] flex items-center justify-center mt-16"
            >
              {/* Resplandor corporativo detrás - Animado con pulso */}
              <motion.div 
                animate={{ scale: [1, 1.15, 1], opacity: [0.1, 0.25, 0.1] }}
                transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
                className="absolute inset-0 bg-[#FF3B2F] rounded-full blur-[50px]"
                style={{ willChange: 'transform, opacity' }}
              ></motion.div>
              
              <motion.img 
                src="/login-cover.png" 
                alt="Estrella Eats Aliados" 
                animate={{ y: [0, -12, 0] }}
                transition={{ repeat: Infinity, duration: 5, ease: "easeInOut" }}
                className="w-full h-full object-cover relative z-10"
                style={{
                  willChange: 'transform',
                  /* Esto hace que los bordes de la foto se desvanezcan hacia transparente de forma suave */
                  maskImage: 'radial-gradient(circle at center, black 45%, transparent 75%)',
                  WebkitMaskImage: 'radial-gradient(circle at center, black 45%, transparent 75%)'
                }}
              />
            </motion.div>
          </div>
          <div className="mb-12">
            <h1 className="text-[40px] leading-tight font-black text-zinc-900 tracking-tight mb-3">
              Bienvenido,<br/><span className="text-[#FF3B2F]">Aliado.</span>
            </h1>
            <p className="text-zinc-500 font-medium text-lg">
              Controla tus pedidos y menú en tiempo real.
            </p>
          </div>

          <form onSubmit={handleLogin} className="flex flex-col gap-6">
            <div className="field flex flex-col gap-2">
              <label className="text-sm font-bold text-zinc-800 uppercase tracking-wider">Número de Teléfono</label>
              <div className="relative group">
                <input
                  type="tel" 
                  value={phone} 
                  onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  placeholder="Ej. 963 153 9156" 
                  required
                  className="w-full pl-5 pr-5 py-4 bg-zinc-50 border-2 border-zinc-200 rounded-2xl focus:border-[#FF3B2F] focus:bg-white outline-none transition-all font-semibold text-zinc-800 text-lg placeholder:font-medium placeholder:text-zinc-400"
                />
              </div>
            </div>
            
            <div className="field flex flex-col gap-2">
              <label className="text-sm font-bold text-zinc-800 uppercase tracking-wider">Contraseña</label>
              <div className="relative group">
                <Lock size={22} className="absolute left-5 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-[#FF3B2F] transition-colors" />
                <input
                  type={showPassword ? "text" : "password"} 
                  value={password} 
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••" 
                  required 
                  className="w-full pl-14 pr-16 py-4 bg-zinc-50 border-2 border-zinc-200 rounded-2xl focus:border-[#FF3B2F] focus:bg-white outline-none transition-all font-black text-zinc-800 tracking-widest text-lg placeholder:tracking-normal placeholder:font-medium placeholder:text-zinc-400"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 transition-colors p-1"
                >
                  {showPassword ? <EyeOff size={22} /> : <Eye size={22} />}
                </button>
              </div>
            </div>

            {error && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="flex items-center gap-3 text-[#D92D20] text-sm font-bold bg-[#FEF3F2] p-4 rounded-xl border border-[#FDA29B]">
                <AlertCircle size={20} className="shrink-0" />
                {error}
              </motion.div>
            )}

            <motion.button 
              whileTap={{ scale: 0.98 }}
              type="submit" 
              className={`w-full py-4 text-lg font-bold rounded-2xl text-white transition-all flex items-center justify-center gap-2 mt-4 ${success ? 'bg-zinc-900' : 'bg-[#FF3B2F] hover:bg-[#E6352A] shadow-[0_8px_30px_rgba(255,59,47,0.3)] hover:shadow-[0_8px_40px_rgba(255,59,47,0.4)]'}`}
              disabled={loading || success} 
            >
              {success ? (
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="flex items-center gap-2">
                  <CheckCircle2 size={24} />
                  ¡Adelante!
                </motion.div>
              ) : loading ? (
                <>
                  <Loader2 size={24} className="animate-spin" />
                  Verificando...
                </>
              ) : (
                'Iniciar Sesión'
              )}
            </motion.button>
          </form>

          <p className="text-center text-zinc-400 text-sm mt-12 font-medium">
            ¿Problemas de acceso? <a href="https://wa.me/529631539156" target="_blank" rel="noreferrer" className="text-[#FF3B2F] hover:underline font-bold">Contacta al admin (963 153 9156)</a>
          </p>
        </motion.div>
      </div>
    </div>
  )
}
