import { useState, useEffect, Suspense, lazy } from 'react'
import { supabase } from './lib/supabase'
import { FloatingOrderTracker } from './components/FloatingOrderTracker'
import { InstallPWA } from './components/InstallPWA'
import type { Session } from '@supabase/supabase-js'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'

// Lazy loading de las vistas para hacer Code Splitting
const LoginPage = lazy(() => import('./pages/LoginPage').then(module => ({ default: module.LoginPage })))
const PortalPage = lazy(() => import('./pages/PortalPage').then(module => ({ default: module.PortalPage })))
const PublicLandingPage = lazy(() => import('./pages/PublicLandingPage').then(module => ({ default: module.PublicLandingPage })))
const PublicMenuView = lazy(() => import('./pages/PublicMenuView').then(module => ({ default: module.PublicMenuView })))
const SuccessPage = lazy(() => import('./pages/SuccessPage').then(module => ({ default: module.SuccessPage })))

export default function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Cambio dinámico del título de la pestaña según el dominio
    const isPartner = window.location.hostname.includes('restaurantes-app') || window.location.hostname.includes('socio');
    if (isPartner) {
      document.title = 'Portal Aliados | Estrella Eats';
    } else {
      document.title = 'Estrella Eats | Comida a Domicilio';
    }

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => subscription.unsubscribe()
  }, [])

  const isPartnerDomain = window.location.hostname.includes('restaurantes-app') || window.location.hostname.includes('socio');

  useEffect(() => {
    // Redirigir enlaces viejos de menús públicos al nuevo dominio .mx
    if (window.location.pathname.startsWith('/menu/') && window.location.hostname.includes('restaurantes-app')) {
      window.location.replace(`https://estrella-eats.mx${window.location.pathname}${window.location.search}`);
    }
  }, []);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
    </div>
  );
  return (
    <BrowserRouter>
      <FloatingOrderTracker />
      <Suspense fallback={
        <div className="min-h-screen flex items-center justify-center bg-slate-50">
          <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      }>
        <Routes>
          <Route path="/" element={isPartnerDomain ? <Navigate to="/login" replace /> : <PublicLandingPage />} />
          <Route path="/menu/:id" element={<PublicMenuView />} />
          <Route path="/success" element={<SuccessPage />} />
          <Route path="/login" element={session ? <Navigate to="/portal" replace /> : <LoginPage />} />
          <Route path="/portal/*" element={session ? <PortalPage /> : <Navigate to="/login" replace />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
      <InstallPWA />
    </BrowserRouter>
  )
}
