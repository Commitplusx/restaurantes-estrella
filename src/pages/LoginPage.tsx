import { useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { supabase } from '../lib/supabase'
import { AlertCircle, ArrowUpRight, CheckCircle2, Eye, EyeOff, Loader2, LockKeyhole, PackageCheck, Star, Utensils } from 'lucide-react'
import './restaurantLogin.css'
import { restaurantLoginEmail } from '../lib/restaurantLogin'

export function LoginPage() {
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')
  const reduceMotion = useReducedMotion()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (loading || success) return

    const emailToUse = restaurantLoginEmail(phone)
    if (!emailToUse) {
      setError('Ingresa un número válido de 10 dígitos o un correo electrónico.')
      return
    }

    setLoading(true)
    setError('')

    const { error: err } = await supabase.auth.signInWithPassword({ email: emailToUse, password })
    if (err) {
      if (err.message === 'Invalid login credentials') {
        setError('No pudimos validar esos datos. Revisa tu correo o teléfono y contraseña.')
      } else {
        setError('No se pudo iniciar sesión en este momento. Inténtalo de nuevo.')
      }
      setLoading(false)
    } else {
      setSuccess(true)
      setTimeout(() => setLoading(false), 1000)
    }
  }

  return (
    <main className="restaurant-login">
      <div className="restaurant-login__layout">
        <section className="restaurant-login__intro" aria-label="Portal para restaurantes">
          <div className="restaurant-login__brand" aria-label="Estrella Eats, acceso para restaurantes">
            <span className="restaurant-login__brand-mark" aria-hidden="true"><Star size={21} fill="currentColor" /></span>
            <span className="restaurant-login__brand-name">Estrella<span>Eats</span></span>
          </div>

          <div className="restaurant-login__message">
            <p className="restaurant-login__eyebrow"><span /> PORTAL PARA RESTAURANTES</p>
            <h1>Tu restaurante,<br /><span>siempre en marcha.</span></h1>
            <p className="restaurant-login__lead">
              Organiza tus pedidos, actualiza tu menú y atiende a tus clientes desde un solo lugar.
            </p>
          </div>

          <div className="restaurant-login__features" aria-label="Herramientas del portal">
            <div className="restaurant-login__feature">
              <span className="restaurant-login__feature-icon"><PackageCheck size={18} /></span>
              <span><strong>Pedidos en tiempo real</strong><small>Ten cada orden a la vista.</small></span>
            </div>
            <div className="restaurant-login__feature">
              <span className="restaurant-login__feature-icon"><Utensils size={18} /></span>
              <span><strong>Tu menú bajo control</strong><small>Precios y disponibilidad, al día.</small></span>
            </div>
          </div>

          <div className="restaurant-login__decor" aria-hidden="true">
            <span className="restaurant-login__decor-star restaurant-login__decor-star--one">✳</span>
            <span className="restaurant-login__decor-star restaurant-login__decor-star--two">✦</span>
          </div>
        </section>

        <section className="restaurant-login__form-side" aria-labelledby="restaurant-login-title">
          <motion.div
            className="restaurant-login__card"
            initial={reduceMotion ? false : { opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: reduceMotion ? 0 : 0.35, ease: 'easeOut' }}
          >
            <div className="restaurant-login__card-mark" aria-hidden="true"><LockKeyhole size={19} /></div>
            <p className="restaurant-login__card-eyebrow">ACCESO DE SOCIO</p>
            <h2 id="restaurant-login-title">Qué gusto verte.</h2>
            <p className="restaurant-login__card-copy">Entra para continuar con la operación de tu restaurante.</p>

            <form onSubmit={handleLogin} className="restaurant-login__form">
              <div className="restaurant-login__field">
                <label htmlFor="restaurant-login-identity">Correo o teléfono</label>
                <input
                  id="restaurant-login-identity"
                  type="text"
                  inputMode="text"
                  autoComplete="username"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  placeholder="Ej. tu@restaurante.com o 9631539156"
                  required
                  aria-invalid={error ? 'true' : 'false'}
                  aria-describedby={error ? 'restaurant-login-error' : undefined}
                />
              </div>

              <div className="restaurant-login__field">
                <label htmlFor="restaurant-login-password">Contraseña</label>
                <div className="restaurant-login__password-wrap">
                  <LockKeyhole className="restaurant-login__password-icon" size={18} aria-hidden="true" />
                  <input
                    id="restaurant-login-password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Escribe tu contraseña"
                    required
                    aria-invalid={error ? 'true' : 'false'}
                    aria-describedby={error ? 'restaurant-login-error' : undefined}
                  />
                  <button
                    type="button"
                    className="restaurant-login__password-toggle"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                    aria-pressed={showPassword}
                  >
                    {showPassword ? <EyeOff size={19} /> : <Eye size={19} />}
                  </button>
                </div>
              </div>

              {error && (
                <motion.div
                  id="restaurant-login-error"
                  role="alert"
                  className="restaurant-login__error"
                  initial={reduceMotion ? false : { opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <AlertCircle size={18} aria-hidden="true" />
                  <span>{error}</span>
                </motion.div>
              )}

              <motion.button
                whileTap={reduceMotion ? undefined : { scale: 0.99 }}
                type="submit"
                className={`restaurant-login__submit${success ? ' is-success' : ''}`}
                disabled={loading || success}
              >
                {success ? (
                  <><CheckCircle2 size={20} aria-hidden="true" /> Bienvenido</>
                ) : loading ? (
                  <><Loader2 size={20} className="restaurant-login__spinner" aria-hidden="true" /> Verificando acceso…</>
                ) : (
                  <>Entrar al panel <ArrowUpRight size={19} aria-hidden="true" /></>
                )}
              </motion.button>
            </form>

            <div className="restaurant-login__help">
              <span>¿Problemas para entrar?</span>
              <a href="https://wa.me/529631539156" target="_blank" rel="noreferrer">Contacta a soporte <ArrowUpRight size={14} aria-hidden="true" /></a>
            </div>
          </motion.div>
          <p className="restaurant-login__footnote">Un espacio para que tu restaurante siga creciendo.</p>
        </section>
      </div>
    </main>
  )
}
