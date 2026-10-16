import { AnimatePresence, motion, useIsPresent } from 'framer-motion';
import { useSiteMotion } from '../hooks/useSiteMotion';
import { SITE_EASE } from '../lib/siteMotion';
function CountValue({ value, enabled }: { value: number | string; enabled: boolean }) {
  const present = useIsPresent();
  return <motion.span aria-hidden={!present || undefined} initial={{ y: enabled ? 10 : 0, opacity: .25, scale: enabled ? .8 : 1 }} animate={{ y: 0, opacity: 1, scale: 1 }} exit={{ y: enabled ? -8 : 0, opacity: 0 }} transition={{ duration: enabled ? .3 : .1, ease: SITE_EASE }}>{value}</motion.span>;
}
export function AnimatedCount({ value }: { value: number }) {
  const { enabled } = useSiteMotion();
  return <span className="eats-animated-count"><AnimatePresence initial={false}><CountValue key={value} value={value} enabled={enabled} /></AnimatePresence></span>;
}
export function AnimatedMoney({ value }: { value: number }) {
  const { enabled } = useSiteMotion();
  return <span className="eats-animated-count"><AnimatePresence initial={false}><CountValue key={value} value={`$${value.toFixed(2)}`} enabled={enabled} /></AnimatePresence></span>;
}
