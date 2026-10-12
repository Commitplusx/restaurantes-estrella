import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import { motion, useIsPresent } from 'framer-motion';

export default function MenuDetailsFrame({ children, onClose }: { children: ReactNode; onClose: () => void }) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  const isPresent = useIsPresent();
  useEffect(() => { closeRef.current = onClose; }, [onClose]);
  useEffect(() => {
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialogRef.current?.focus({ preventScroll: true });
    const handleKey = (event: KeyboardEvent) => {
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
      document.body.style.overflow = previousOverflow;
      if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true });
    };
  }, []);

  return (
    <motion.div className="menu-detail-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: .18 }} onClick={onClose} inert={!isPresent}>
      <motion.div ref={dialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="menu-detail-title" className="menu-detail-sheet"
        initial={{ y: 24, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 12, opacity: 0 }} transition={{ duration: .28, ease: [.22, 1, .36, 1] }} onClick={event => event.stopPropagation()}>
        {children}
      </motion.div>
    </motion.div>
  );
}
