import { useContext, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { NoticeContext } from '../lib/noticeQueue';
export function useNoticeSlot(id: string, visible: boolean, priority: number): boolean {
  const queue = useContext(NoticeContext);
  const { pathname } = useLocation();
  const eligible = visible && !(import.meta.env.DEV && pathname === '/avisos' && id !== 'notice-design');
  const register = queue?.register;
  useEffect(() => {
    register?.(id, eligible ? priority : null);
    return () => register?.(id, null);
  }, [id, eligible, priority, register]);
  return eligible && (!queue || queue.current === id);
}
