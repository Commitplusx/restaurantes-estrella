import { useState, useEffect, Suspense, lazy } from 'react'
import { supabase } from './lib/supabase'
import { FloatingOrderTracker } from './components/FloatingOrderTracker'
import { InstallPWA } from './components/InstallPWA'
import { OfflineBanner } from './components/OfflineBanner'
import type { Session } from '@supabase/supabase-js'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'

// Wrapper para evitar pantalla blanca cuando un chunk (JS viejo) falla al cargar (común en SPAs tras un deploy)
const lazyWithRetry = (componentImport: () => Promise<any>) =>
  lazy(async () => {
    const pageHasAlreadyBeenForceRefreshed = JSON.parse(
      window.sessionStorage.getItem('page-has-been-force-refreshed') || 'false'
    );

    try {
      const component = await componentImport();
      window.sessionStorage.setItem('page-has-been-force-refreshed', 'false');
      return component;
    } catch (error) {
      if (!pageHasAlreadyBeenForceRefreshed) {
        window.sessionStorage.setItem('page-has-been-force-refreshed', 'true');
        window.location.reload();
        return new Promise(() => {}); // Pausar ejecución mientras recarga
      }
      throw error;
    }
  });

// Lazy loading de las vistas para hacer Code Splitting con auto-recarga
const LoginPage = lazyWithRetry(() => import('./pages/LoginPage').then(module => ({ default: module.LoginPage })))
const PortalPage = lazyWithRetry(() => import('./pages/PortalPage').then(module => ({ default: module.PortalPage })))
const PublicLandingPage = lazyWithRetry(() => import('./pages/PublicLandingPage').then(module => ({ default: module.PublicLandingPage })))
const PublicMenuView = lazyWithRetry(() => import('./pages/PublicMenuView').then(module => ({ default: module.PublicMenuView })))
const CartPage = lazyWithRetry(() => import('./pages/CartPage').then(module => ({ default: module.default })))
const SuccessPage = lazyWithRetry(() => import('./pages/SuccessPage').then(module => ({ default: module.SuccessPage })))
const TrackerPage = lazyWithRetry(() => import('./pages/TrackerPage').then(module => ({ default: module.TrackerPage })))
const BeneficiosPage = lazyWithRetry(() => import('./pages/BeneficiosPage').then(module => ({ default: module.BeneficiosPage })))
const PrivacyPage = lazyWithRetry(() => import('./pages/PrivacyPage').then(module => ({ default: module.PrivacyPage })))
const TermsPage = lazyWithRetry(() => import('./pages/TermsPage').then(module => ({ default: module.TermsPage })))

import { CookieBanner } from './components/CookieBanner'
import { PushNotificationSetup } from './components/PushNotificationSetup'

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

  // Visitor tracking
  useEffect(() => {
    const trackVisit = async () => {
      const isTracked = sessionStorage.getItem('visitTracked');
      if (!isTracked) {
        try {
          const plataforma = window.navigator.userAgent.toLowerCase().includes('mobi') ? 'mobile' : 'web';
          await supabase.from('app_visitas').insert([{ plataforma }]);
          sessionStorage.setItem('visitTracked', 'true');
        } catch (e) {
          console.error('Error tracking visit:', e);
        }
      }
    };
    trackVisit();
  }, []);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
    </div>
  );
  return (
    <BrowserRouter>
      <OfflineBanner />
      <CookieBanner />
      <FloatingOrderTracker />
      <PushNotificationSetup />
      <Suspense fallback={
        <div className="min-h-screen flex items-center justify-center bg-slate-50">
          <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      }>
        <Routes>
          <Route path="/" element={isPartnerDomain ? <Navigate to="/login" replace /> : <PublicLandingPage />} />
          <Route path="/beneficios" element={isPartnerDomain ? <Navigate to="/login" replace /> : <BeneficiosPage />} />
          <Route path="/privacidad" element={<PrivacyPage />} />
          <Route path="/terminos" element={<TermsPage />} />
          <Route path="/menu/:id" element={<PublicMenuView />} />
          <Route path="/menu/:id/carrito" element={<CartPage />} />
          <Route path="/success" element={<SuccessPage />} />
          <Route path="/tracker" element={<TrackerPage />} />
          <Route path="/login" element={session ? <Navigate to="/portal" replace /> : <LoginPage />} />
          <Route path="/portal/pedidos/:pedidoId" element={session ? <PortalPage initialTab="pedidos" /> : <Navigate to="/login" replace />} />
          <Route path="/portal/*" element={session ? <PortalPage /> : <Navigate to="/login" replace />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
      <InstallPWA />
    </BrowserRouter>
  )
}
