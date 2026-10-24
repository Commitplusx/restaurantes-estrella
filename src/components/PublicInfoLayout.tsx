import { createContext, useContext, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { Link, useLocation, useNavigate, type LinkProps } from 'react-router-dom';
import { ArrowLeft, ArrowUpRight } from 'lucide-react';
import './publicInfo.css';
import { useSiteMotion } from '../hooks/useSiteMotion';
import { BrandLogo } from './BrandLogo';

const InfoNavigation = createContext<((to: string) => void) | null>(null);

export function PublicInfoLink({ to, onClick, ...props }: Omit<LinkProps, 'to'> & { to: string }) {
  const transition = useContext(InfoNavigation);
  return <Link {...props} to={to} onClick={event => {
    onClick?.(event);
    if (!transition || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.altKey || event.shiftKey || (props.target && props.target !== '_self') || props.reloadDocument || props.download) return;
    event.preventDefault();
    transition(to);
  }} />;
}

export function PublicInfoLayout({ children }: { children: ReactNode }) {
  const { pathname, hash } = useLocation();
  const navigate = useNavigate();
  const { enabled } = useSiteMotion();
  const [leaving, setLeaving] = useState<'home' | 'document' | null>(null);
  const departure = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (departure.current !== null) clearTimeout(departure.current);
    departure.current = null;
  }, [pathname]);
  const transition = (to: string) => {
    if (departure.current !== null || to === `${pathname}${hash}`) return;
    const go = () => {
      departure.current = null;
      setLeaving(null);
      navigate(to, { state: { publicInfoReturn: true } });
    };
    if (!enabled) {
      go();
      return;
    }
    setLeaving(to.startsWith('/#') || to === '/' ? 'home' : 'document');
    departure.current = setTimeout(go, 190);
  };
  useLayoutEffect(() => {
    if (!hash) {
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
      document.getElementById('info-content')?.focus({ preventScroll: true });
    }
    else {
      const section = document.getElementById(hash.slice(1));
      section?.scrollIntoView({ block: 'start', behavior: 'instant' });
      section?.focus({ preventScroll: true });
    }
  }, [pathname, hash]);
  return <InfoNavigation.Provider value={transition}><div className="public-info-page" data-leaving={leaving || undefined} aria-busy={leaving !== null}>
    <a className="info-skip-link" href="#info-content">Ir al contenido</a>
    <header className="info-header">
      <div className="info-header-inner">
        <PublicInfoLink to="/" className="info-back"><ArrowLeft size={18} aria-hidden="true" /><span>Inicio</span></PublicInfoLink>
        <PublicInfoLink to="/" className="info-brand" aria-label="Estrella Eats, ir al inicio"><BrandLogo /></PublicInfoLink>
        <PublicInfoLink to="/#eats-desktop-categories" className="info-restaurants">Ver restaurantes<ArrowUpRight size={17} aria-hidden="true" /></PublicInfoLink>
      </div>
    </header>
    <main id="info-content" tabIndex={-1} className="info-main">{children}</main>
    <footer className="info-footer">
      <PublicInfoLink to="/" className="info-footer-brand"><BrandLogo /></PublicInfoLink>
      <nav aria-label="Información de Estrella Eats">
        <PublicInfoLink to="/beneficios" aria-current={pathname === '/beneficios' ? 'page' : undefined}>Beneficios</PublicInfoLink>
        <PublicInfoLink to="/terminos" aria-current={pathname === '/terminos' ? 'page' : undefined}>Términos y condiciones</PublicInfoLink>
        <PublicInfoLink to="/privacidad" aria-current={pathname === '/privacidad' ? 'page' : undefined}>Aviso de privacidad</PublicInfoLink>
      </nav>
      <p>© {new Date().getFullYear()} Estrella Eats.</p>
    </footer>
  </div></InfoNavigation.Provider>;
}

export interface LegalSection {
  id: number;
  title: string;
  content?: string;
  bullets?: readonly string[];
}

export function LegalDocument({ title, description, effective, sections }: {
  title: string;
  description: string;
  effective: string;
  sections: readonly LegalSection[];
}) {
  return <PublicInfoLayout>
    <div className="info-intro legal-intro">
      <h1>{title}</h1>
      <p>{description}</p>
      <span className="legal-effective">{effective}</span>
    </div>
    <div className="legal-layout">
      <nav className="legal-index" aria-label="Índice del documento">
        <h2>En este documento</h2>
        <ol>{sections.map(section => <li key={section.id}><a href={`#seccion-${section.id}`}>{section.title}</a></li>)}</ol>
      </nav>
      <div className="legal-sections">
        {sections.map(section => <section id={`seccion-${section.id}`} key={section.id} className="legal-section" aria-labelledby={`titulo-${section.id}`} tabIndex={-1}>
          <h2 id={`titulo-${section.id}`}>{section.id}. {section.title}</h2>
          {section.content && <p>{section.content}</p>}
          {section.bullets && <ul>{section.bullets.map(bullet => <li key={bullet}>{bullet}</li>)}</ul>}
        </section>)}
        <a href="#info-content" className="legal-top">Volver al principio ↑</a>
      </div>
    </div>
  </PublicInfoLayout>;
}
