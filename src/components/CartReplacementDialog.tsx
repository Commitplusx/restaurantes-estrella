import { useRef } from 'react';
import { ArrowRight, ShoppingBag, X } from 'lucide-react';
import type { CartItem } from '../types';
import MenuDetailsFrame from './MenuDetailsFrame';
import './MenuChoices.css';

export default function CartReplacementDialog({ product, restaurantName, count, onCancel, onConfirm }: {
  product: CartItem; restaurantName: string; count: number; onCancel: () => void; onConfirm: () => void;
}) {
  const committed = useRef(false);
  return <MenuDetailsFrame variant="confirm" titleId="cart-replacement-title" productKey={`${product.tipo}:${product.id}`} onClose={onCancel}>
    <div className="cart-replacement-heading"><span className="cart-replacement-icon"><ShoppingBag size={24} /></span>
      <button type="button" className="menu-choice-close" aria-label="Conservar mi pedido y cerrar" onClick={onCancel}><X size={21} /></button></div>
    <h2 id="cart-replacement-title">¿Empezamos otro pedido?</h2>
    <p className="cart-replacement-description">Tienes {count === 1 ? 'un producto guardado' : `${count} productos guardados`} en tu carrito. Para pedir aquí, reemplazaremos esa selección.</p>
    <div className="cart-replacement-product">
      {product.foto_url ? <img src={product.foto_url} alt="" /> : <ShoppingBag size={25} />}
      <div><strong>{restaurantName}</strong><span>1 × {product.nombre}</span>
        {!!product.opcionesSeleccionadas?.length && <small>{product.opcionesSeleccionadas.map(option => option.opcion).join(' · ')}</small>}</div>
    </div>
    <p className="cart-replacement-note">Esto sólo cambia tu carrito. Los pedidos que ya enviaste siguen igual.</p>
    <div className="cart-replacement-actions">
      <button type="button" className="menu-choice-primary" onClick={() => { if (!committed.current) { committed.current = true; onConfirm(); } }}>Empezar nuevo pedido <ArrowRight size={19} /></button>
      <button type="button" className="menu-choice-secondary" data-dialog-initial-focus onClick={onCancel}>Conservar mi pedido</button>
    </div>
  </MenuDetailsFrame>;
}
