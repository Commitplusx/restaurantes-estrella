import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react'
import { Plus, Store, MapPin, Phone, Loader2, Pencil, ArrowUpRight, KeyRound } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import type { Restaurante } from '../../lib/supabase'
import { branchLabel, branchRpcArguments, parseRestaurantBranches, RESTAURANT_PUBLIC_FIELDS, restaurantMenuPath } from '../../lib/restaurantBranches'
import type { BranchDraft } from '../../lib/restaurantBranches'
import { parseBranchCredentials } from '../../lib/restaurantLogin'
import type { BranchCredentials } from '../../lib/restaurantLogin'
import BranchAccessNotice from '../../components/BranchAccessNotice'
import './SucursalesView.css'

const LocationPicker = lazy(() => import('../../components/DeliveryLocationPicker'))

export function SucursalesView({ restaurante, onManage, onSaved }: {
  restaurante: Restaurante; onManage?: (restaurant: Restaurante) => void; onSaved?: () => void
}) {
  const [branches, setBranches] = useState<Restaurante[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [draft, setDraft] = useState<BranchDraft | null>(null)
  const [saving, setSaving] = useState(false)
  const [mapOpen, setMapOpen] = useState(false)
  const [notice, setNotice] = useState('')
  const [credentials,setCredentials] = useState<BranchCredentials | null>(null)
  const [accessBusy,setAccessBusy] = useState<string | null>(null)
  const accessInFlight = useRef(false)
  const saveInFlight = useRef(false)
  const request = useRef(0)
  const lifecycle = useRef(0)
  const formRef = useRef<HTMLElement>(null)

  const loadBranches = useCallback(async () => {
    const current = ++request.current
    return Promise.resolve(supabase.from('restaurantes').select(RESTAURANT_PUBLIC_FIELDS)
        .eq('matriz_id', restaurante.id).order('nombre_sucursal').limit(101)
        .abortSignal(AbortSignal.timeout(10000)).returns<unknown>())
      .then(({data, error}) => {
      if (error) throw error
      const parsed = parseRestaurantBranches(data)
      if (current === request.current) { setBranches(parsed); setError('') }
    }).catch(() => {
      if (current === request.current) setError('No pudimos cargar tus sucursales. Reintenta para actualizar la lista.')
    }).finally(() => {
      if (current === request.current) setLoading(false)
    })
  }, [restaurante.id])

  useEffect(() => { void loadBranches(); return () => { request.current += 1 } }, [loadBranches])
  useEffect(() => { lifecycle.current += 1; return () => { lifecycle.current += 1 } }, [])
  const draftId = draft?.id
  useEffect(() => { if (draftId) formRef.current?.querySelector('input')?.focus() }, [draftId])

  function edit(branch?: Restaurante) {
    setError(''); setNotice('')
    setDraft({ id: branch?.id || crypto.randomUUID(), name: branch?.nombre_sucursal || '', phone: branch?.telefono || '',
      address: branch?.direccion || '', lat: branch?.lat?.toString() || '', lng: branch?.lng?.toString() || '', active: branch?.activo ?? false })
  }

  async function generateAccess(branchId: string,rotate=false) {
    if (accessInFlight.current) return
    if (rotate && !window.confirm('¿Generar una contraseña nueva para esta sucursal? La anterior dejará de funcionar para iniciar sesión.')) return
    accessInFlight.current = true
    const generation = lifecycle.current
    setAccessBusy(branchId); setError(''); setCredentials(null)
    try {
      const {data,error} = await supabase.functions.invoke('branch-access',{
        body:{parent_id:restaurante.id,branch_id:branchId,action:rotate?'rotate':'create'},
        signal:AbortSignal.timeout(55000),
      })
      if (generation!==lifecycle.current) return
      if (error) {
        const context: unknown = 'context' in error ? error.context : null
        if (context instanceof Response) {
          const failure: unknown = await context.json().catch(()=>null)
          if (typeof failure==='object' && failure!==null && 'error' in failure && typeof failure.error==='string') throw new Error(failure.error)
        }
        throw new Error('La sucursal está guardada, pero no pudimos confirmar su acceso. Reintenta desde el botón Acceso.')
      }
      const parsed=parseBranchCredentials(data,branchId)
      setCredentials(parsed)
    } catch (failure: unknown) {
      if (generation===lifecycle.current) setError(failure instanceof Error?failure.message:'No pudimos confirmar el acceso de la sucursal.')
    } finally {
      accessInFlight.current=false
      if (generation===lifecycle.current) setAccessBusy(null)
    }
  }

  async function save(event: React.FormEvent) {
    event.preventDefault()
    if (!draft || saveInFlight.current) return
    saveInFlight.current = true; setSaving(true); setError('')
    const generation = lifecycle.current
    const newBranch = !branches.some(branch=>branch.id===draft.id)
    try {
      const { data, error } = await supabase.rpc('restaurant_upsert_branch', branchRpcArguments(restaurante.id, draft))
        .abortSignal(AbortSignal.timeout(15000)).returns<unknown>()
      if (generation !== lifecycle.current) return
      if (error) {
        if (error.code === 'PGRST202') throw new Error('Falta habilitar el soporte de sucursales en el servidor. Tu formulario se conserva.')
        if (error.code === '23505') throw new Error('Ese nombre o teléfono ya está registrado. Revisa los datos de la sucursal.')
        if (error.code === '42501' || error.code === '22023') throw new Error(error.message)
        throw new Error('No pudimos confirmar el guardado. Reintenta con este mismo formulario.')
      }
      if (typeof data !== 'object' || data === null || !('id' in data) || data.id !== draft.id) throw new Error('El servidor no confirmó la sucursal. Reintenta con este mismo formulario.')
      setDraft(null); setNotice('Sucursal guardada. Administra su menú y horarios desde el selector del panel.')
      await loadBranches(); onSaved?.()
      if (newBranch && generation===lifecycle.current) await generateAccess(draft.id)
    } catch (failure: unknown) {
      if (generation === lifecycle.current) setError(failure instanceof Error ? failure.message : 'No pudimos guardar la sucursal.')
    } finally { saveInFlight.current = false; if (generation === lifecycle.current) setSaving(false) }
  }

  const update = (patch: Partial<BranchDraft>) => setDraft(current => current ? { ...current, ...patch } : null)
  const selectedPoint = draft && draft.lat.trim() && draft.lng.trim() && Number.isFinite(Number(draft.lat)) && Number.isFinite(Number(draft.lng))
    ? { lat: Number(draft.lat), lng: Number(draft.lng), address: draft.address } : null

  return <section className="restaurant-branches" aria-labelledby="branches-title">
    <header className="restaurant-branches__heading"><div><h3 id="branches-title">Una marca. Todas tus sucursales.</h3><p>Administra cada ubicación de {restaurante.nombre} con su propio menú, horarios y pedidos.</p></div><button type="button" className="branch-button branch-button--primary" onClick={() => edit()} disabled={saving}><Plus size={18} /> Nueva sucursal</button></header>
    {error && <div className="restaurant-branches__error" role="alert">{error}{!draft && <button type="button" onClick={() => { setLoading(true); void loadBranches() }}>Reintentar</button>}</div>}
    {notice && <p role="status" className="restaurant-branches__notice">{notice}</p>}
    {accessBusy && <p role="status" className="branch-access__loading"><Loader2 className="animate-spin" size={18} />Preparando acceso de la sucursal…</p>}
    {credentials && <BranchAccessNotice key={`${credentials.branchId}:${credentials.status}`} credentials={credentials} busy={Boolean(accessBusy)} onClose={()=>setCredentials(null)} onRotate={()=>void generateAccess(credentials.branchId,true)} />}
    {draft && <section ref={formRef} className="branch-editor" aria-labelledby="branch-editor-title">
      <h4 id="branch-editor-title">{branches.some(b => b.id === draft.id) ? 'Editar sucursal' : 'Nueva sucursal'}</h4>
      <form onSubmit={save}>
        <fieldset disabled={saving}>
          <div className="branch-editor__grid">
            <label>Nombre de la sucursal<input required minLength={2} maxLength={80} value={draft.name} onChange={e => update({name:e.target.value})} placeholder="Ej. Centro o Belisario" /></label>
            <label>Teléfono de esta sucursal<input required inputMode="tel" autoComplete="tel" maxLength={20} value={draft.phone} onChange={e => update({phone:e.target.value})} placeholder="10 dígitos" /><small>Usa un teléfono distinto al de las otras sucursales.</small></label>
            <label className="branch-editor__wide">Calle, número y colonia<textarea required minLength={5} maxLength={300} value={draft.address} onChange={e => update({address:e.target.value})} rows={2} /></label>
            <label>Latitud<input required inputMode="decimal" value={draft.lat} onChange={e => update({lat:e.target.value})} placeholder="16.2516" /></label>
            <label>Longitud<input required inputMode="decimal" value={draft.lng} onChange={e => update({lng:e.target.value})} placeholder="-92.1332" /></label>
          </div>
          <button type="button" className="branch-button" onClick={() => setMapOpen(true)}><MapPin size={17} /> Marcar ubicación en el mapa</button>
          <label className="branch-editor__check"><input type="checkbox" checked={draft.active} onChange={e => update({active:e.target.checked})} /> Mostrar esta sucursal a los clientes</label>
          <p className="branch-editor__hint">La marca, imágenes y horarios iniciales se toman de la principal. Después configura su menú y revisa el perfil antes de activarla.</p>
        </fieldset>
        <div className="branch-editor__actions"><button type="button" className="branch-button" disabled={saving} onClick={() => setDraft(null)}>Cancelar</button><button type="submit" className="branch-button branch-button--primary" disabled={saving}>{saving && <Loader2 className="animate-spin" size={17} />}{saving ? 'Guardando…' : 'Guardar sucursal'}</button></div>
      </form>
    </section>}
    <div className="branch-list" aria-busy={loading}>
      <BranchLocations locations={[restaurante, ...branches]} primaryId={restaurante.id} saving={saving || Boolean(accessBusy)} onManage={branch => onManage?.(branch)} onEdit={edit} onAccess={branch=>void generateAccess(branch.id)} />
      {loading && <p role="status" className="branch-list__empty"><Loader2 className="animate-spin" size={20} /> Cargando sucursales…</p>}
      {!loading && !error && branches.length === 0 && <p className="branch-list__empty">Aquí aparecerán tus próximas sucursales. La principal ya está disponible arriba.</p>}
    </div>
    {mapOpen && draft && <Suspense fallback={<p role="status">Cargando mapa…</p>}><LocationPicker purpose="restaurant" initialLocation={selectedPoint} restaurantLocation={null} onClose={() => setMapOpen(false)} onConfirm={point => {update({lat:String(point.lat),lng:String(point.lng),address:point.address});setMapOpen(false)}} /></Suspense>}
  </section>
}

export function BranchLocations({ locations, primaryId, saving, onManage, onEdit, onAccess }: { locations: Restaurante[]; primaryId: string; saving: boolean; onManage: (branch: Restaurante) => void; onEdit: (branch: Restaurante) => void; onAccess?: (branch: Restaurante) => void }) {
  return <>
      {locations.map(branch => <article key={branch.id} className="branch-row">
        <div className="branch-row__icon"><Store size={24} /></div>
        <div className="branch-row__copy"><div className="branch-row__title"><h4>{branchLabel(branch)}</h4><span data-active={branch.activo}>{branch.activo ? 'Activa' : 'Pausada'}</span>{branch.id === primaryId && <small>Principal</small>}</div><p><MapPin size={15} />{branch.direccion || 'Completa la dirección en el perfil'}</p><p><Phone size={15} />{branch.telefono}</p></div>
        <div className="branch-row__actions"><button type="button" className="branch-button" onClick={() => onManage(branch)}>Administrar</button>{branch.id !== primaryId && <><button type="button" className="branch-button" onClick={() => onEdit(branch)} disabled={saving}><Pencil size={15} />Editar</button>{onAccess && <button type="button" className="branch-button" onClick={()=>onAccess(branch)} disabled={saving}><KeyRound size={15} />Acceso</button>}</>}<a href={restaurantMenuPath(branch)} target="_blank" rel="noreferrer" className="branch-button" aria-label={`Ver menú de ${branchLabel(branch)}`}><ArrowUpRight size={17} /></a></div>
      </article>)}
  </>
}
