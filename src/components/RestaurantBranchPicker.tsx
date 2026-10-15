import { useEffect, useRef, useState } from 'react'
import { MapPin, Store, X, Check } from 'lucide-react'
import type { Restaurante } from '../lib/supabase'
import { branchLabel } from '../lib/restaurantBranches'
import './RestaurantBranchPicker.css'

export default function RestaurantBranchPicker({ branches, selectedId, cartCount, onChoose, onClose, isOpen }: {
  branches: Restaurante[]; selectedId: string; cartCount: number
  onChoose: (branch: Restaurante) => void; onClose: () => void; isOpen: (branch: Restaurante) => boolean
}) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const confirmButtonRef = useRef<HTMLButtonElement>(null)
  const [pending, setPending] = useState<Restaurante | null>(null)
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
    {pending ? <div className="branch-picker-confirm"><h3>Cambiar a {branchLabel(pending)}</h3><p>Tu pedido tiene {cartCount} productos. Al cambiar de sucursal empezarás un pedido nuevo.</p><div><button ref={confirmButtonRef} type="button" onClick={() => setPending(null)}>Conservar mi pedido</button><button type="button" onClick={() => onChoose(pending)}>Cambiar sucursal</button></div></div>
      : <div className="branch-picker-list">{branches.map(branch => <button key={branch.id} type="button" aria-pressed={branch.id === selectedId} onClick={() => {
        if (branch.id === selectedId) onClose()
        else if (cartCount > 0) setPending(branch)
        else onChoose(branch)
      }}><Store size={23} /><div><strong>{branchLabel(branch)}</strong><span><MapPin size={14} />{branch.direccion || 'Consulta la ubicación en su menú'}</span><small data-open={isOpen(branch)}>{isOpen(branch) ? 'Abierta ahora' : 'Cerrada ahora'}</small></div>{branch.id === selectedId && <Check size={20} />}</button>)}</div>}
  </dialog>
}
