import { useCallback, useState } from 'react';
import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { motion, useReducedMotion } from 'framer-motion';
import './NoticeCenter.css';
import { NoticeContext } from '../lib/noticeQueue';
export function NoticeProvider({ children }: { children: ReactNode }) {
  const [notices, setNotices] = useState<Record<string, number>>({});
  const register = useCallback((id: string, priority: number | null) => {
    setNotices(previous => {
      if (priority === null && !(id in previous) || priority === previous[id]) return previous;
      const next = { ...previous };
      if (priority === null) delete next[id]; else next[id] = priority;
      return next;
    });
  }, []);
  const current = Object.keys(notices).sort((a, b) => notices[b] - notices[a] || a.localeCompare(b))[0] ?? null;
  return <NoticeContext.Provider value={{ current, register }}>{children}</NoticeContext.Provider>;
}
export function NoticeSurface({ children, label }: { children: ReactNode; label: string }) {
  const reduced = useReducedMotion();
  return createPortal(<div className="eats-notice-dock">
    <motion.aside aria-label={label} className="eats-notice" initial={{ opacity: .85, y: reduced ? 0 : 12 }}
      animate={{ opacity: 1, y: 0 }} transition={{ duration: reduced ? .1 : .24, ease: [.16, 1, .3, 1] }}>{children}</motion.aside>
  </div>, document.body);
}
