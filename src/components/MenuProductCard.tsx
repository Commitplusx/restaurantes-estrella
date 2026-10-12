import { useState } from 'react';
import { Plus, Utensils } from 'lucide-react';

export interface MenuProductCardProps {
  name: string;
  description?: string | null;
  image?: string | null;
  price: number | null;
  badge?: string;
  includes?: string[];
  unavailable?: string;
  quantity?: number;
  customizable?: boolean;
  onDetails: () => void;
  onAdd: () => void;
}

export default function MenuProductCard({
  name, description, image, price, badge, includes, unavailable,
  quantity = 0, customizable = false, onDetails, onAdd,
}: MenuProductCardProps) {
  const [failedSource, setFailedSource] = useState<string | null>(null);
  const validPrice = typeof price === 'number' && Number.isFinite(price) && price >= 0;
  return (
    <article className="menu-product" data-unavailable={Boolean(unavailable)}>
      <button type="button" className="menu-product-details" onClick={onDetails} aria-label={`Ver ${name}`}>
        <div className="menu-product-photo">
          {image && image !== failedSource ? <img src={image} alt="" loading="lazy" decoding="async" onError={() => setFailedSource(image)} />
            : <Utensils size={32} strokeWidth={1.4} aria-hidden="true" />}
          {badge && <span className="menu-product-badge">{badge}</span>}
        </div>
        <div className="menu-product-copy">
          <h3>{name}</h3>
          {description && <p>{description}</p>}
          {includes?.length ? <p className="menu-product-includes">{includes.slice(0, 2).join(' · ')}{includes.length > 2 ? ` · +${includes.length - 2} más` : ''}</p> : null}
          <span className="menu-product-price">{validPrice ? `$${price.toFixed(2)}` : 'Precio no disponible'}</span>
        </div>
      </button>
      <div className="menu-product-action">
        <span>{unavailable || (quantity > 0 ? `${quantity} en tu carrito` : customizable ? 'Elige tus opciones' : 'Agregar al pedido')}</span>
        <button type="button" onClick={onAdd} disabled={Boolean(unavailable) || !validPrice} aria-label={customizable ? `Elegir opciones de ${name}` : `Agregar ${name}`}>
          <Plus size={19} aria-hidden="true" />
        </button>
      </div>
    </article>
  );
}
