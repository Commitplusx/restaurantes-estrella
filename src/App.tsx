import { useState, useEffect } from 'react'
import { supabase } from './lib/supabase'
import { LoginPage } from './pages/LoginPage'
import { PortalPage } from './pages/PortalPage'
import { PublicLandingPage } from './pages/PublicLandingPage'
import { PublicMenuView } from './pages/PublicMenuView'
import { SuccessPage } from './pages/SuccessPage'
import { FloatingOrderTracker } from './components/FloatingOrderTracker'
import type { Session } from '@supabase/supabase-js'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'

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
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
    </div>
  );

  const isPartnerDomain = window.location.hostname.includes('restaurantes-app') || window.location.hostname.includes('socio');

  return (
    <BrowserRouter>
      <FloatingOrderTracker />
      <Routes>
        <Route path="/" element={isPartnerDomain ? <Navigate to="/login" replace /> : <PublicLandingPage />} />
        <Route path="/menu/:id" element={<PublicMenuView />} />
        <Route path="/success" element={<SuccessPage />} />
        <Route path="/login" element={session ? <Navigate to="/portal" replace /> : <LoginPage />} />
        <Route path="/portal/*" element={session ? <PortalPage /> : <Navigate to="/login" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
