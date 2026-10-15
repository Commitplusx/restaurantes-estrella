import { useState } from 'react'
import { Copy, Eye, EyeOff, KeyRound, X } from 'lucide-react'
import type { BranchCredentials } from '../lib/restaurantLogin'

export default function BranchAccessNotice({ credentials, onClose, onRotate, busy }: {
  credentials: BranchCredentials; onClose: () => void; onRotate: () => void; busy: boolean
}) {
  const [visible,setVisible]=useState(false)
  const [message,setMessage]=useState('')
  async function copy() {
    if (credentials.status!=='generated') return
    try { await navigator.clipboard.writeText(`Número: ${credentials.phone}\nContraseña: ${credentials.password}`); setMessage('Acceso copiado.') }
    catch { setVisible(true); setMessage('No pudimos copiarlo. Selecciona el número y la contraseña para copiarlos.') }
  }
  return <section className="branch-access" aria-labelledby="branch-access-title">
    <header><h4 id="branch-access-title"><KeyRound size={19} />{credentials.status==='generated'?'Acceso de la sucursal listo':'Esta sucursal ya tiene acceso'}</h4><button type="button" onClick={onClose} aria-label="Cerrar datos de acceso"><X size={20} /></button></header>
    <p>Entra en <a href="/login" target="_blank" rel="noreferrer">el panel de restaurantes</a> con este número. El acceso corresponde únicamente a esta sucursal.</p>
    <label>Número para iniciar sesión<input readOnly value={credentials.phone} autoComplete="off" /></label>
    {credentials.status==='generated' ? <>
      <label>Contraseña generada<div className="branch-access__password"><input readOnly value={credentials.password} type={visible?'text':'password'} autoComplete="off" spellCheck={false} /><button type="button" onClick={()=>setVisible(!visible)} aria-label={visible?'Ocultar contraseña':'Mostrar contraseña'}>{visible?<EyeOff size={19}/>:<Eye size={19}/>}</button></div></label>
      <p>Guárdala ahora. Al cerrar este aviso, podrás generar otra desde la cuenta principal.</p>
      <button type="button" className="branch-button branch-button--primary" onClick={()=>void copy()}><Copy size={17} />Copiar acceso</button>
    </> : <p>Si necesitas otra contraseña, puedes generar una nueva. La anterior dejará de funcionar para iniciar sesión.</p>}
    {credentials.status==='exists' && <button type="button" className="branch-button" disabled={busy} onClick={onRotate}>Generar nueva contraseña</button>}
    {message && <p role="status">{message}</p>}
  </section>
}
