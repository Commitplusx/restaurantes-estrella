import { useState } from 'react'
import { motion } from 'framer-motion'
import { supabase } from '../lib/supabase'
import { UtensilsCrossed, Mail, Lock, AlertCircle, Loader2, CheckCircle2 } from 'lucide-react'

export function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  const containerVariants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.1 } }
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 300, damping: 24 } }
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { error: err } = await supabase.auth.signInWithPassword({ email, password })
    if (err) {
      setError('Correo o contraseña incorrectos.')
      setLoading(false)
    } else {
      setSuccess(true)
      // The redirect is handled automatically by App.tsx detecting the session,
      // but we let the button show the success state briefly.
      setTimeout(() => setLoading(false), 1000)
    }
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '1rem', background: 'radial-gradient(ellipse at top, #fff7ed 0%, #f8fafc 60%)'
    }}>
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="show"
        style={{ width: '100%', maxWidth: 380 }}
      >
        {/* Logo */}
        <motion.div variants={itemVariants} style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{
            width: 64, height: 64, borderRadius: 18, background: 'linear-gradient(135deg,#f97316,#fb923c)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem',
            boxShadow: '0 8px 32px rgba(249,115,22,0.4)'
          }}>
            <UtensilsCrossed size={30} color="white" />
          </div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a' }}>
            Portal Restaurantes
          </h1>
          <p style={{ color: '#64748b', fontSize: '0.875rem', marginTop: 4 }}>
            Estrella Delivery — Gestiona tu menú
          </p>
        </motion.div>

        {/* Form */}
        <motion.div variants={itemVariants} className="card" style={{ padding: '1.75rem' }}>
          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <motion.div variants={itemVariants} className="field">
              <label>Correo electrónico</label>
              <div style={{ position: 'relative' }}>
                <Mail size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
                <input
                  type="email" value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="restaurante@correo.com" required
                  style={{ paddingLeft: 36 }}
                />
              </div>
            </motion.div>

            <motion.div variants={itemVariants} className="field">
              <label>Contraseña</label>
              <div style={{ position: 'relative' }}>
                <Lock size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
                <input
                  type="password" value={password} onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••" required style={{ paddingLeft: 36 }}
                />
              </div>
            </motion.div>

            {error && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#ef4444', fontSize: '0.85rem',
                            background: 'rgba(239,68,68,0.1)', padding: '0.6rem 0.9rem', borderRadius: 10 }}>
                <AlertCircle size={15} />
                {error}
              </div>
            )}

            <motion.button 
              variants={itemVariants}
              whileTap={{ scale: 0.96 }}
              type="submit" 
              className="btn btn-primary" 
              disabled={loading || success} 
              style={{ 
                marginTop: 4, padding: '0.75rem',
                backgroundColor: success ? 'var(--success)' : 'var(--brand)'
              }}
            >
              {success ? (
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="flex items-center gap-2">
                  <CheckCircle2 size={18} />
                  ¡Bienvenido!
                </motion.div>
              ) : loading ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Entrando...
                </>
              ) : 'Iniciar sesión'}
            </motion.button>
          </form>
        </motion.div>

        <motion.p variants={itemVariants} style={{ textAlign: 'center', color: '#64748b', fontSize: '0.78rem', marginTop: '1.25rem' }}>
          ¿No tienes acceso? Contacta a Estrella Delivery.
        </motion.p>
      </motion.div>
    </div>
  )
}
