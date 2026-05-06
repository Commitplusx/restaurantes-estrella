import { useState, useEffect } from 'react'
import { supabase } from './lib/supabase'
import { LoginPage } from './pages/LoginPage'
import { PortalPage } from './pages/PortalPage'
import { PublicLandingPage } from './pages/PublicLandingPage'
import { PublicMenuView } from './pages/PublicMenuView'
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
    <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f8fafc' }}>
      <div style={{ width: 40, height: 40, border: '3px solid #e2e8f0', borderTopColor: '#f97316', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<PublicLandingPage />} />
        <Route path="/menu/:id" element={<PublicMenuView />} />
        <Route path="/login" element={session ? <Navigate to="/portal" replace /> : <LoginPage />} />
        <Route path="/portal/*" element={session ? <PortalPage /> : <Navigate to="/login" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
