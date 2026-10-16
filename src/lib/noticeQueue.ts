import { createContext } from 'react';
export interface NoticeQueue { current: string | null; register: (id: string, priority: number | null) => void }
export const NoticeContext = createContext<NoticeQueue | null>(null);
