import { Link } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { BrandLogo } from './BrandLogo';
import '../pages/PublicMenuView.css';
import './RestaurantMenuSkeleton.css';

/** Mirrors the real menu geometry; only the shared local brand is loaded. */
export default function RestaurantMenuSkeleton() {
  return <div className="restaurant-menu-page menu-loading-page" role="status" aria-label="Cargando el menú del restaurante" aria-busy="true">
    <header className="menu-topbar"><div className="menu-topbar-inner">
      <Link to="/" className="menu-back" aria-label="Volver a los restaurantes"><ChevronLeft size={20} aria-hidden="true" /></Link>
      <Link to="/" className="menu-brand" aria-label="Estrella Eats, inicio"><BrandLogo /></Link>
      <span className="menu-topbar-label">Cargando menú…</span>
    </div></header>
    <div className="menu-shell" aria-hidden="true">
      <div className="menu-identity">
        <span className="menu-identity-image menu-skeleton-fill" />
        <div className="menu-identity-copy menu-skeleton-copy">
          <span className="menu-skeleton-fill menu-skeleton-title" />
          <span className="menu-skeleton-fill menu-skeleton-subtitle" />
          <span className="menu-skeleton-fill menu-skeleton-meta" />
        </div>
      </div>
      <div className="menu-catalog-layout">
        <div className="menu-category-nav"><div className="menu-category-list">{[0, 1, 2, 3].map(index => <span key={index} className="menu-skeleton-fill menu-skeleton-category" />)}</div></div>
        <div className="menu-catalog-content">
          <div className="menu-catalog-heading menu-skeleton-copy"><span className="menu-skeleton-fill menu-skeleton-subtitle" /><span className="menu-skeleton-fill menu-skeleton-meta" /></div>
          <div className="menu-skeleton-grid">{[0, 1, 2, 3].map(index => <div key={index} className="menu-product menu-skeleton-card">
            <div className="menu-product-details"><span className="menu-product-photo menu-skeleton-fill" /><div className="menu-product-copy menu-skeleton-copy"><span className="menu-skeleton-fill menu-skeleton-subtitle" /><span className="menu-skeleton-fill menu-skeleton-description" /><span className="menu-skeleton-fill menu-skeleton-price" /></div></div>
            <div className="menu-product-action"><span className="menu-skeleton-fill menu-skeleton-meta" /><span className="menu-skeleton-fill menu-skeleton-add" /></div>
          </div>)}</div>
        </div>
      </div>
    </div>
  </div>;
}
