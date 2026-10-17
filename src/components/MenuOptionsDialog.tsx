import { useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, Check, CircleAlert, Pencil, ShoppingBag, X } from 'lucide-react';
import type { CartItem } from '../types';
import type { OpcionGrupo, OpcionItem, OptionSelection } from '../lib/menuOptions';
import { configuredCartItem } from '../lib/configuredCartItem';
import type { ConfigurableProduct } from '../lib/configuredCartItem';
import { SITE_EASE } from '../lib/siteMotion';
import MenuDetailsFrame from './MenuDetailsFrame';
import './MenuChoices.css';

export default function MenuOptionsDialog({ product, groups, onAdd, onClose }: {
  product: ConfigurableProduct; groups: OpcionGrupo[]; onAdd: (item: CartItem) => void; onClose: () => void;
}) {
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1);
  const [selection, setSelection] = useState<OptionSelection>({});
  const [error, setError] = useState('');
  const submitted = useRef(false);
  const content = useRef<HTMLDivElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const reviewing = step >= groups.length;
  const group = groups[step];
  const chosen = group ? selection[group.titulo] || {} : {};
  const chosenCount = Object.values(chosen).filter(Boolean).length;
  const extras = groups.reduce((sum, current) => sum + current.opciones.reduce((subtotal, option) => subtotal + (selection[current.titulo]?.[option.nombre] ? option.precio_extra || 0 : 0), 0), 0);
  const total = product.precio + extras;
  const validPrice = Number.isFinite(total) && total >= 0;
  const canContinue = validPrice && groups.length > 0 && (!group || !group.requerido || chosenCount > 0);
  function go(next: number) { setError(''); setDirection(next < step ? -1 : 1); setStep(next); }
  function toggle(option: OpcionItem) {
    if (!group) return;
    setError('');
    if (!chosen[option.nombre] && chosenCount >= group.maximo_selecciones && group.maximo_selecciones !== 1) {
      setError(`Puedes elegir hasta ${group.maximo_selecciones}. Quita una opción para cambiarla.`); return;
    }
    setSelection(previous => {
      const current = { ...previous[group.titulo] };
      if (group.maximo_selecciones === 1) return { ...previous, [group.titulo]: !group.requerido && current[option.nombre] ? {} : { [option.nombre]: true } };
      if (!current[option.nombre] && Object.values(current).filter(Boolean).length >= group.maximo_selecciones) return previous;
      if (current[option.nombre]) delete current[option.nombre]; else current[option.nombre] = true;
      return { ...previous, [group.titulo]: current };
    });
  }
  function finish() {
    if (submitted.current) return;
    try {
      const item = configuredCartItem(product, groups, selection);
      submitted.current = true;
      onAdd(item);
    } catch (failure: unknown) {
      submitted.current = false;
      setError(failure instanceof Error ? failure.message : 'Revisa tus opciones e inténtalo de nuevo.');
    }
  }
  return <MenuDetailsFrame variant="options" titleId="menu-options-title" productKey={`${product.tipo}:${product.id}`} onClose={onClose}>
    <button type="button" className="menu-choice-close" aria-label="Cerrar opciones del producto" onClick={onClose}><X size={21} /></button>
    <aside className="menu-options-product">
      <div className="menu-options-photo">{product.foto_url ? <img src={product.foto_url} alt="" /> : <ShoppingBag size={35} />}</div>
      <div className="menu-options-product-copy"><h2 id="menu-options-title">{product.nombre}</h2><p>Hazlo a tu gusto.</p><strong>{Number.isFinite(product.precio) ? `$${product.precio.toFixed(2)}` : 'Precio no disponible'} <span>precio base</span></strong></div>
    </aside>
    <div className="menu-options-main">
      <div className="menu-options-progress"><span>{reviewing ? 'Tu selección' : `Paso ${step + 1} de ${groups.length}`}</span><span>{reviewing ? 'Revisa antes de agregar' : 'Personaliza tu pedido'}</span>
        <div role="progressbar" aria-label="Progreso de opciones" aria-valuemin={0} aria-valuemax={groups.length + 1} aria-valuenow={Math.min(step + 1, groups.length + 1)}><motion.span initial={false} animate={{ scaleX: (step + 1) / (groups.length + 1) }} transition={{ duration: .32, ease: SITE_EASE }} /></div>
      </div>
      <div className="menu-options-scroll" ref={content}>
        <AnimatePresence mode="wait" custom={direction}>
          <motion.section key={step} custom={direction} variants={{ enter: (value: number) => ({ opacity: .3, x: value * 20 }), center: { opacity: 1, x: 0 }, leave: (value: number) => ({ opacity: 0, x: value * -12 }) }} initial="enter" animate="center" exit="leave" transition={{ duration: .22, ease: SITE_EASE }} onAnimationComplete={() => { content.current?.scrollTo({ top: 0 }); heading.current?.focus({ preventScroll: true }); }}>
            <div className="menu-options-step-title"><h3 ref={heading} tabIndex={-1}>{reviewing ? 'Así queda tu pedido' : group?.titulo || 'Opciones no disponibles'}</h3>
              {!reviewing && group && <span data-complete={chosenCount > 0}>{chosenCount > 0 ? <><Check size={13} />Listo</> : group.requerido ? 'Obligatorio' : 'Opcional'}</span>}</div>
            {!reviewing && group && <p className="menu-options-instruction">{group.maximo_selecciones === 1 ? group.requerido ? 'Elige una opción para continuar.' : 'Elige una opción o continúa sin extra.' : `Elige ${group.requerido ? 'de 1 a' : 'hasta'} ${group.maximo_selecciones} opciones. ${chosenCount} seleccionadas.`}</p>}
            {!groups.length && <p role="alert">Las opciones cambiaron. Cierra este producto y vuelve a abrirlo.</p>}
            {group && !reviewing && <div className="menu-options-list" role="group" aria-label={group.titulo}>
              {!group.opciones.length && <p role="alert">Estas opciones no están disponibles ahora. Elige otro producto.</p>}
              {group.opciones.map(option => <motion.button key={option.id || option.menu_item_id || option.nombre} type="button" aria-pressed={!!chosen[option.nombre]} onClick={() => toggle(option)} whileTap={{ scale: .985 }} className="menu-option-choice">
                <span className="menu-option-indicator" data-radio={group.maximo_selecciones === 1} aria-hidden="true">{chosen[option.nombre] && <Check size={14} strokeWidth={2.5} />}</span>
                <span className="menu-option-name">{option.nombre}</span><span className="menu-option-price">{option.precio_extra > 0 ? `+$${option.precio_extra.toFixed(2)}` : 'Incluido'}</span>
              </motion.button>)}
            </div>}
            {reviewing && <div className="menu-options-review">{groups.map((current, index) => <div key={current.id || current.titulo}><div><strong>{current.titulo}</strong><p>{current.opciones.filter(option => selection[current.titulo]?.[option.nombre]).map(option => option.nombre).join(' · ') || 'Sin extra'}</p></div><button type="button" aria-label={`Editar ${current.titulo}`} onClick={() => go(index)}><Pencil size={17} /></button></div>)}</div>}
          </motion.section>
        </AnimatePresence>
        {error && <p className="menu-options-error" role="alert"><CircleAlert size={17} />{error}</p>}
        {!validPrice && <p className="menu-options-error" role="alert">El precio cambió. Cierra y vuelve a abrir este producto.</p>}
      </div>
      <footer className="menu-options-footer"><div className="menu-options-total"><span>{reviewing ? 'Total del producto' : 'Tu producto'}</span><strong>{validPrice ? `$${total.toFixed(2)}` : 'No disponible'}</strong></div>
        <div className="menu-options-actions">{step > 0 && <button type="button" className="menu-choice-back" aria-label="Volver al paso anterior" onClick={() => go(step - 1)}><ArrowLeft size={20} /></button>}
          <motion.button type="button" className="menu-choice-primary" disabled={!canContinue} whileTap={{ scale: .985 }} onClick={() => reviewing ? finish() : go(step + 1)}>{reviewing ? <><ShoppingBag size={19} />Agregar a mi pedido</> : <>Continuar<ArrowRight size={19} /></>}</motion.button>
        </div>
      </footer>
    </div>
  </MenuDetailsFrame>;
}
