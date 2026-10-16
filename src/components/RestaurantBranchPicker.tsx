import { useEffect, useRef, useState } from 'react'
import { MapPin, Store, X, Check } from 'lucide-react'
import type { Restaurante } from '../lib/supabase'
import { branchLabel } from '../lib/restaurantBranches'
import './RestaurantBranchPicker.css'
import { motion } from 'framer-motion'
import { useSiteMotion } from '../hooks/useSiteMotion'
import { SITE_EASE } from '../lib/siteMotion'

export default function RestaurantBranchPicker({ branches, selectedId, cartCount, onChoose, onClose, isOpen }: {
  branches: Restaurante[]; selectedId: string; cartCount: number
  onChoose: (branch: Restaurante) => void; onClose: () => void; isOpen: (branch: Restaurante) => boolean
}) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const confirmButtonRef = useRef<HTMLButtonElement>(null)
  const [pending, setPending] = useState<Restaurante | null>(null)
  const { enabled } = useSiteMotion()
  useEffect(() => {
    const dialog = dialogRef.current
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    dialog?.showModal()
    return () => { dialog?.close(); document.body.style.overflow = overflow; opener?.focus() }
  }, [])
  useEffect(() => {
    if (pending) confirmButtonRef.current?.focus()
    else dialogRef.current?.querySelector<HTMLButtonElement>('[aria-pressed="true"]')?.focus()
  }, [pending])
  return <dialog ref={dialogRef} className="restaurant-branch-dialog" aria-labelledby="branch-picker-title" onCancel={event => { event.preventDefault(); onClose() }}>
    <header><div><h2 id="branch-picker-title">Elige tu sucursal</h2><p>El menú y la entrega corresponden a la ubicación que elijas.</p></div><button type="button" onClick={onClose} aria-label="Cerrar sucursales"><X size={21} /></button></header>
    {pending ? <motion.div key="confirm" className="branch-picker-confirm" initial={{ opacity: .4, x: enabled ? 24 : 0 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: enabled ? .36 : .1, ease: SITE_EASE }}><h3>Cambiar a {branchLabel(pending)}</h3><p>Tu pedido tiene {cartCount} productos. Al cambiar de sucursal empezarás un pedido nuevo.</p><div><button ref={confirmButtonRef} type="button" onClick={() => setPending(null)}>Conservar mi pedido</button><button type="button" onClick={() => onChoose(pending)}>Cambiar sucursal</button></div></motion.div>
      : <motion.div key="list" className="branch-picker-list" initial={{ opacity: .4, x: enabled ? -16 : 0 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: enabled ? .32 : .1, ease: SITE_EASE }}>{branches.map((branch, index) => <motion.button key={branch.id} type="button" initial={{ opacity: .5, y: enabled ? 12 : 0 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: enabled ? .36 : .1, delay: enabled ? Math.min(index * .045, .135) : 0, ease: SITE_EASE }} whileTap={{ scale: enabled ? .985 : 1 }} aria-pressed={branch.id === selectedId} onClick={() => {
        if (branch.id === selectedId) onClose()
        else if (cartCount > 0) setPending(branch)
        else onChoose(branch)
      }}><Store size={23} /><div><strong>{branchLabel(branch)}</strong><span><MapPin size={14} />{branch.direccion || 'Consulta la ubicación en su menú'}</span><small data-open={isOpen(branch)}>{isOpen(branch) ? 'Abierta ahora' : 'Cerrada ahora'}</small></div>{branch.id === selectedId && <Check size={20} />}</motion.button>)}</motion.div>}
  </dialog>
}
