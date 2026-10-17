import { useEffect, useRef, useState } from 'react';
import { Plus, Utensils } from 'lucide-react';
import { motion, useAnimationControls } from 'framer-motion';
import { ParallaxMedia } from './ParallaxMedia';
import { AnimatedCount } from './AnimatedCount';
import { useSiteMotion } from '../hooks/useSiteMotion';
import { SITE_EASE } from '../lib/siteMotion';

export interface MenuProductCardProps {
  productKey: string;
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
  productKey, name, description, image, price, badge, includes, unavailable,
  quantity = 0, customizable = false, onDetails, onAdd,
}: MenuProductCardProps) {
  const [failedSource, setFailedSource] = useState<string | null>(null);
  const { enabled } = useSiteMotion();
  const controls = useAnimationControls();
  const previousQuantity = useRef(quantity);
  useEffect(() => {
    if (quantity > previousQuantity.current && enabled) {
      void controls.start({ scale: [1, 1.018, 1], transition: { duration: .36, ease: SITE_EASE } });
    }
    previousQuantity.current = quantity;
  }, [quantity, enabled, controls]);
  const validPrice = typeof price === 'number' && Number.isFinite(price) && price >= 0;
  return (
    <motion.article className="menu-product" data-product-motion-key={productKey} data-unavailable={Boolean(unavailable)} animate={controls}>
      <button type="button" className="menu-product-details" onClick={onDetails} aria-label={`Ver ${name}`}>
        <div className="menu-product-photo" data-product-motion-photo>
          {image && image !== failedSource ? <ParallaxMedia depth={5}><img src={image} alt="" loading="lazy" decoding="async" onError={() => setFailedSource(image)} /></ParallaxMedia>
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
        <span>{unavailable || (quantity > 0 ? <><AnimatedCount value={quantity} /> en tu carrito</> : customizable ? 'Elige tus opciones' : 'Agregar al pedido')}</span>
        <motion.button type="button" whileTap={{ scale: enabled ? .9 : 1 }} onClick={onAdd} disabled={Boolean(unavailable) || !validPrice} aria-label={customizable ? `Elegir opciones de ${name}` : `Agregar ${name}`}>
          <Plus size={19} aria-hidden="true" />
        </motion.button>
      </div>
    </motion.article>
  );
}
