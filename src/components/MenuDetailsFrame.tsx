import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import { motion, useIsPresent } from 'framer-motion';

const activeDialogs: HTMLDivElement[] = [];
let originalOverflow = '';

export default function MenuDetailsFrame({ children, onClose, productKey, variant = 'product', titleId = 'menu-detail-title' }: {
  children: ReactNode; onClose: () => void; productKey?: string; variant?: 'product' | 'options' | 'confirm'; titleId?: string;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  const isPresent = useIsPresent();
  useEffect(() => { closeRef.current = onClose; }, [onClose]);
  useEffect(() => {
    if (!isPresent) return;
    const dialog = dialogRef.current;
    if (!dialog) return;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    if (activeDialogs.length === 0) originalOverflow = document.body.style.overflow;
    activeDialogs.push(dialog);
    document.body.style.overflow = 'hidden';
    (dialog.querySelector<HTMLElement>('[data-dialog-initial-focus]') || dialog).focus({ preventScroll: true });
    const handleKey = (event: KeyboardEvent) => {
      if (activeDialogs[activeDialogs.length - 1] !== dialog) return;
      if (event.key === 'Escape') {
        event.preventDefault();
        closeRef.current();
      }
      if (event.key !== 'Tab' || !dialogRef.current) return;
      const elements = Array.from(dialogRef.current.querySelectorAll<HTMLElement>('button:not(:disabled), a[href], input:not(:disabled), [tabindex="0"]'))
        .filter(element => element.getClientRects().length > 0);
      const first = elements[0];
      const last = elements[elements.length - 1];
      if (!first || !last) { event.preventDefault(); dialogRef.current.focus(); return; }
      if (event.shiftKey && (document.activeElement === first || document.activeElement === dialogRef.current)) {
        event.preventDefault(); last.focus();
      } else if (!event.shiftKey && (document.activeElement === last || !dialogRef.current.contains(document.activeElement))) {
        event.preventDefault(); first.focus();
      }
    };
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('keydown', handleKey);
      const index = activeDialogs.indexOf(dialog);
      if (index !== -1) activeDialogs.splice(index, 1);
      if (activeDialogs.length === 0) document.body.style.overflow = originalOverflow;
      if (previousFocus?.isConnected && !previousFocus.closest('[inert]')) previousFocus.focus({ preventScroll: true });
    };
  }, [isPresent]);

  return (
    <motion.div className={`menu-detail-backdrop menu-detail-backdrop--${variant}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: .18 }} onClick={onClose} inert={!isPresent}>
      <motion.div ref={dialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby={titleId} className={`menu-detail-sheet menu-detail-sheet--${variant}`} data-product-motion-dialog data-product-motion-key={productKey}
        initial={{ y: 24, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 12, opacity: 0 }} transition={{ duration: .28, ease: [.22, 1, .36, 1] }} onClick={event => event.stopPropagation()}>
        {children}
      </motion.div>
    </motion.div>
  );
}
