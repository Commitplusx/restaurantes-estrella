import { useState, useEffect } from 'react'
import { supabase } from './lib/supabase'
import { LoginPage } from './pages/LoginPage'
import { PortalPage } from './pages/PortalPage'
import { PublicLandingPage } from './pages/PublicLandingPage'
import { PublicMenuView } from './pages/PublicMenuView'
import { SuccessPage } from './pages/SuccessPage'
import type { Session } from '@supabase/supabase-js'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { motion } from 'framer-motion'

export default function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => subscription.unsubscribe()
  }, [])

  if (loading) return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-orange-500/10 to-transparent" />
      
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="relative z-10 flex flex-col items-center"
      >
        <motion.div
          animate={{ 
            scale: [1, 1.05, 1],
            rotate: [0, 5, -5, 0]
          }}
          transition={{ 
            duration: 3,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="w-20 h-20 bg-gradient-to-tr from-orange-500 to-amber-400 rounded-[20px] flex items-center justify-center shadow-[0_0_40px_rgba(249,115,22,0.4)] mb-6"
        >
          <svg className="w-10 h-10 text-white drop-shadow-md" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
          </svg>
        </motion.div>

        <motion.h1 
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-2xl font-black text-white tracking-tight"
        >
          Estrella<span className="text-orange-500">Delivery</span>
        </motion.h1>
        
        <motion.div 
          initial={{ width: 0, opacity: 0 }}
          animate={{ width: 120, opacity: 1 }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut", repeatType: "mirror" }}
          className="h-1.5 bg-gradient-to-r from-orange-500 to-amber-400 mt-8 rounded-full shadow-[0_0_15px_rgba(249,115,22,0.5)]"
        />
      </motion.div>
    </div>
  )

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<PublicLandingPage />} />
        <Route path="/menu/:id" element={<PublicMenuView />} />
        <Route path="/success" element={<SuccessPage />} />
        <Route path="/login" element={session ? <Navigate to="/portal" replace /> : <LoginPage />} />
        <Route path="/portal/*" element={session ? <PortalPage /> : <Navigate to="/login" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
