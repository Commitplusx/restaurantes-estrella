import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { ArrowRight, Check, CheckCircle2, ChevronRight, CircleX, Clock3, ExternalLink, Loader2, MapPin, RefreshCw, Store, Truck } from 'lucide-react';
import { motion } from 'framer-motion';
import { restaurantDeliveryApi } from '../../lib/restaurantDeliveryApi';
import { DeliverySubmissionError,deliveryStateLabel, normalizeDeliveryPhone } from '../../lib/restaurantDelivery';
import type { DeliveryCapability, RestaurantDeliveryApi, RestaurantDeliveryIntent, RestaurantDeliveryQuote, RestaurantDeliveryReceipt, DeliveryBreakdown } from '../../lib/restaurantDelivery';
import type { DeliveryLocation } from '../../lib/deliveryLocation';
import { trackingLink } from '../../lib/trackingAccess';
import './EnviosView.css';
import {useDeliveryAddress} from '../../hooks/useDeliveryAddress';

const DeliveryLocationPicker=lazy(()=>import('../../components/DeliveryLocationPicker'));
const money=(value:number)=>new Intl.NumberFormat('es-MX',{style:'currency',currency:'MXN'}).format(value);
const message=(error:unknown)=>error instanceof Error?error.message:'No pudimos completar la solicitud. Intenta de nuevo.';
const storageKey=(id:string)=>'eats_restaurant_delivery_pending_v1:'+id;
const validId=(value:string|null):value is string=>value!==null&&/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
function savedReference(id:string):string|null{try{const value=sessionStorage.getItem(storageKey(id));return validId(value)?value:null;}catch{return null;}}

function CostBreakdown({value}:{value:DeliveryBreakdown}){
 return <dl className="delivery-request__amounts">
  <div><dt>Comida pendiente de cobro</dt><dd>{money(value.food)}</dd></div>
  <div><dt>Envío completo</dt><dd>{money(value.fee)}</dd></div>
  <div className="delivery-request__contribution"><dt>Lo que pone Robin’s</dt><dd>− {money(value.restaurantContribution)}</dd></div>
  <div><dt>Envío que paga el cliente</dt><dd>{money(value.customerShipping)}</dd></div>
  <div className="delivery-request__customer-total"><dt>Cobrar al cliente</dt><dd>{money(value.food+value.customerShipping)}</dd></div>
 </dl>;
}
function Settlement({value}:{value:DeliveryBreakdown}){
 return <p className="delivery-request__settlement">{value.restaurantSettlement>=0
  ? <>A la sucursal le corresponden <strong>{money(value.restaurantSettlement)}</strong>. Su parte del envío ya está descontada.</>
  : <>La sucursal entrega <strong>{money(-value.restaurantSettlement)}</strong> al repartidor para completar el envío.</>}</p>;
}

export function EnviosView({capability,api=restaurantDeliveryApi,onOpenOrders,now=Date.now}: {
 capability:Extract<DeliveryCapability,{enabled:true}>;api?:RestaurantDeliveryApi;onOpenOrders?:()=>void;now?:()=>number;
}){
 const{origin,defaultContribution}=capability;
 const[pendingAtMount]=useState(()=>savedReference(origin.id));
 const[name,setName]=useState(''),[phone,setPhone]=useState(''),[description,setDescription]=useState(''),[references,setReferences]=useState('');
 const[food,setFood]=useState(''),[shipping,setShipping]=useState(''),[custom,setCustom]=useState(false),[contribution,setContribution]=useState(String(defaultContribution));
 const[preparation,setPreparation]=useState('15'),[destination,setDestination]=useState<DeliveryLocation|null>(null),[mapOpen,setMapOpen]=useState(false);
 const[source,setSource]=useState<'pin'|'address'>('pin'),[mapsUrl,setMapsUrl]=useState(''),[writtenAddress,setWrittenAddress]=useState('');
 const addressLookup=useDeliveryAddress(writtenAddress,origin.lat!==null&&origin.lng!==null?{lat:origin.lat,lng:origin.lng}:null,source==='address');
 const[quote,setQuote]=useState<RestaurantDeliveryQuote|null>(null),[receipt,setReceipt]=useState<RestaurantDeliveryReceipt|null>(null);
 const[busy,setBusy]=useState<'quote'|'create'|'recover'|null>(pendingAtMount?'recover':null),[error,setError]=useState(''),[uncertain,setUncertain]=useState(false);
 const[recent,setRecent]=useState<RestaurantDeliveryReceipt[]>([]),[recentError,setRecentError]=useState(''),[recentLoading,setRecentLoading]=useState(true);
 const live=useRef(true),running=useRef(false),recentRunning=useRef(false),requestId=useRef<string|null>(pendingAtMount),intentRef=useRef<RestaurantDeliveryIntent|null>(null);
 const errorRef=useRef<HTMLParagraphElement>(null);
 const reviewHeadingRef=useRef<HTMLHeadingElement>(null),confirmationHeadingRef=useRef<HTMLHeadingElement>(null);
 const quoteId=quote?.id,receiptId=receipt?.orderId;
 const originReady=typeof origin.lat==='number'&&typeof origin.lng==='number';
 const locked=busy!==null||uncertain;
 const resetQuote=()=>{setQuote(null);setError('');};

 const refreshRecent=useCallback(()=>{
  if(recentRunning.current)return Promise.resolve();recentRunning.current=true;
  return api.recent(origin.id).then(rows=>{if(live.current){setRecent(rows);setRecentError('');setReceipt(current=>current?rows.find(row=>row.orderId===current.orderId&&row.requestId===current.requestId)??current:null);}})
   .catch((failure:unknown)=>{if(live.current)setRecentError(message(failure));})
   .finally(()=>{recentRunning.current=false;if(live.current)setRecentLoading(false);});
 },[api,origin.id]);
 useEffect(()=>{
  live.current=true;void refreshRecent();
  const refresh=()=>{if(document.visibilityState==='visible')void refreshRecent();};
  const timer=window.setInterval(refresh,30000);window.addEventListener('focus',refresh);
  if(pendingAtMount)void api.result(pendingAtMount).then(found=>{if(live.current&&found){setReceipt(found);try{sessionStorage.removeItem(storageKey(origin.id));}catch{/* Visible receipt is retained in this tab. */}}}).catch((failure:unknown)=>{if(live.current){setError(message(failure));setUncertain(true);}}).finally(()=>{if(live.current)setBusy(null);});
  return()=>{live.current=false;window.clearInterval(timer);window.removeEventListener('focus',refresh);};
 },[api,origin.id,pendingAtMount,refreshRecent]);
 useEffect(()=>{if(error)errorRef.current?.focus();},[error]);
 useEffect(()=>{
  const heading=receiptId?confirmationHeadingRef.current:quoteId?reviewHeadingRef.current:null;
  heading?.scrollIntoView({block:'nearest'});
  heading?.focus({preventScroll:true});
 },[quoteId,receiptId]);

 function intent(quoteId:string):RestaurantDeliveryIntent{
  if(name.trim().length<2||name.length>100)throw new Error('Escribe el nombre del cliente.');
  const normalizedPhone=normalizeDeliveryPhone(phone);
  if(description.trim().length<3)throw new Error('Escribe qué se va a entregar.');
  const minutes=Number(preparation);
  if(!Number.isInteger(minutes)||minutes<0||minutes>120)throw new Error('Elige cuánto falta para que el pedido esté listo.');
  return{quoteId,name:name.trim(),phone:normalizedPhone,description:description.trim(),references:references.trim(),preparationMinutes:minutes};
 }
 async function review(event:FormEvent){
  event.preventDefault();if(running.current)return;
  try{
   intent(crypto.randomUUID());
   if(!originReady)throw new Error('La sucursal necesita una ubicación válida. Revísala en su perfil.');
   if(source==='pin'&&!destination&&!mapsUrl.trim())throw new Error('Pega el pin de Google Maps o elige el punto en el mapa.');
   if(source==='address'&&writtenAddress.trim().length<5)throw new Error('Copia la dirección que envió el cliente.');
   if(source==='address'&&addressLookup.busy)throw new Error('Estamos comprobando la dirección. Espera un momento.');
   if(!food.trim()||source==='address'&&!shipping.trim())throw new Error('Escribe la comida pendiente y el precio acordado del envío.');
   const point=source==='address'?{lat:addressLookup.point?.lat??null,lng:addressLookup.point?.lng??null,address:writtenAddress.trim()}:destination??{lat:null,lng:null,address:''};
   running.current=true;setBusy('quote');setError('');setQuote(null);
   const result=await api.quote({id:crypto.randomUUID(),restaurantId:origin.id,destination:point,source,foodTotal:food,...(source==='address'?{shippingPrice:shipping}:mapsUrl.trim()?{mapsUrl:mapsUrl.trim()}:{}),...(custom?{restaurantContribution:contribution}:{})});
   if(result.restaurantId!==origin.id||result.locationSource!==source||!(source==='pin'&&mapsUrl.trim())&&(result.destination.lat!==point.lat||result.destination.lng!==point.lng))throw new Error('El resumen no coincide con la sucursal o el destino. Vuelve a revisarlo.');
   if(live.current)setQuote(result);
  }catch(failure:unknown){if(live.current)setError(message(failure));}
  finally{running.current=false;if(live.current)setBusy(null);}
 }
 function saveReference(){
  const key=requestId.current??crypto.randomUUID();
  try{sessionStorage.setItem(storageKey(origin.id),key);if(sessionStorage.getItem(storageKey(origin.id))!==key)throw new Error('Storage unavailable');}
  catch{throw new Error('No pudimos conservar la referencia en este navegador. Permite el almacenamiento local antes de enviar.');}
  requestId.current=key;return key;
 }
 function confirmed(result:RestaurantDeliveryReceipt){
  if(!live.current)return;
  setReceipt(result);setUncertain(false);setError('');void refreshRecent();
  try{sessionStorage.removeItem(storageKey(origin.id));}catch{/* The receipt remains visible; replay is still idempotent. */}
 }
 async function recover(){
  if(running.current||!requestId.current)return;running.current=true;setBusy('recover');setError('');
  try{const found=await api.result(requestId.current);if(found)confirmed(found);else{if(!intentRef.current)setUncertain(false);setError(intentRef.current?'Aún no encontramos una confirmación. Reintenta el mismo envío; conservamos su referencia para evitar duplicados.':'Aún no encontramos una confirmación. Completa los datos; conservamos la referencia de esta solicitud.');}}
  catch(failure:unknown){if(live.current)setError(message(failure));}
  finally{running.current=false;if(live.current)setBusy(null);}
 }
 async function send(){
  if(running.current||!quote)return;
  let key:string;
  try{if(!uncertain&&Date.parse(quote.expiresAt)<=now()){setQuote(null);throw new Error('El resumen venció. Revisa otra vez los importes.');}key=saveReference();if(!uncertain)intentRef.current=intent(quote.id);if(!intentRef.current)throw new Error('Vuelve a revisar los datos del envío.');}
  catch(failure:unknown){setError(message(failure));return;}
  running.current=true;setBusy('create');setError('');
  try{const result=await api.create(key,intentRef.current);if(result.requestId!==key)throw new Error('La confirmación no corresponde a tu solicitud.');confirmed(result);}
  catch(failure:unknown){
   if(failure instanceof DeliverySubmissionError&&!failure.uncertain){
    if(failure.conflict){try{const found=await api.result(key);if(found){confirmed(found);return;}}catch{/* Keep the same reference and report the definite creation rejection. */}}
    if(live.current){setUncertain(false);setQuote(null);intentRef.current=null;setError(message(failure));}
   }else if(live.current){setUncertain(true);setError(message(failure));}
  }
  finally{running.current=false;if(live.current)setBusy(null);}
 }
 function newRequest(){
  requestId.current=null;intentRef.current=null;setReceipt(null);setQuote(null);setName('');setPhone('');setDescription('');setReferences('');setFood('');setShipping('');setDestination(null);setMapsUrl('');setWrittenAddress('');setSource('pin');setCustom(false);setContribution(String(defaultContribution));setPreparation('15');setError('');setUncertain(false);
 }

 return <section className="delivery-request">
  <header className="delivery-request__heading"><div><h2>¿Ya tienes un pedido para enviar?</h2><p>Captura los datos y solicita un repartidor de Estrella Eats.</p></div><Truck size={27} aria-hidden="true"/></header>
  <div className="delivery-request__origin"><Store size={21} aria-hidden="true"/><div><strong>{origin.name}{origin.branch?' · '+origin.branch:''}</strong><span>Recolectamos aquí · {origin.address||'Revisa la dirección de la sucursal'}</span></div><span className="delivery-request__origin-label">Sucursal de origen</span></div>
  {receipt?<motion.div className={'delivery-request__confirmation'+(receipt.state==='cancelado'?' is-cancelled':'')} role="region" aria-labelledby="delivery-confirmation-title" initial={{opacity:.6,y:8}} animate={{opacity:1,y:0}} transition={{duration:.2}}>
   {receipt.state==='cancelado'?<CircleX size={36} aria-hidden="true"/>:<CheckCircle2 size={36} aria-hidden="true"/>}
   <h3 id="delivery-confirmation-title" ref={confirmationHeadingRef} tabIndex={-1}>{receipt.state==='cancelado'?'Envío cancelado':receipt.state==='entregado'?'Envío entregado':'¡Envío solicitado!'}</h3>
   <p>{receipt.state==='cancelado'?'Este servicio está cancelado. Revisa el seguimiento para consultar los detalles.':receipt.state==='entregado'?'Este servicio ya terminó. Puedes consultar los detalles en el seguimiento.':'Tu pedido ya está guardado. Consulta el seguimiento para ver el avance del repartidor.'}</p>
   <div className="delivery-request__receipt"><div><span>Folio del envío</span><strong>#{receipt.orderId.replaceAll('-','').slice(-6).toUpperCase()}</strong></div><p role="status" aria-live="polite"><span aria-hidden="true"/>{deliveryStateLabel[receipt.state]}</p></div>
   {receipt.incident&&<p className="delivery-request__error" role="alert">El envío quedó registrado, pero necesita revisión. Consulta su estado antes de solicitar otro.</p>}
   <CostBreakdown value={receipt}/><Settlement value={receipt}/>
   <div className="delivery-request__actions"><a className="delivery-request__primary" href={trackingLink('/tracker',receipt.orderId,receipt.trackingKey)}>Ver seguimiento <ExternalLink size={17}/></a><button type="button" className="delivery-request__secondary" onClick={newRequest}>Solicitar otro envío</button></div>
  </motion.div>:<form onSubmit={review} className="delivery-request__layout">
   <div className="delivery-request__form">
    <fieldset disabled={locked}><legend>Cliente y destino</legend><div className="delivery-request__fields">
     <label>Nombre del cliente<input autoComplete="off" name="delivery-name" value={name} maxLength={100} required minLength={2} onChange={event=>{setName(event.target.value);resetQuote();}} placeholder="¿Quién recibe?"/></label>
     <label>WhatsApp del cliente<input autoComplete="off" name="delivery-phone" type="tel" inputMode="tel" value={phone} maxLength={20} required onChange={event=>{setPhone(event.target.value);resetQuote();}} placeholder="10 dígitos"/></label>
     <div className="delivery-request__destination delivery-request__wide"><span>Dirección de entrega</span>
      <div className="delivery-request__modes" role="radiogroup" aria-label="Cómo compartió la ubicación el cliente" onKeyDown={event=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;event.preventDefault();const next=event.key==='Home'?'pin':event.key==='End'?'address':source==='pin'?'address':'pin';setSource(next);resetQuote();event.currentTarget.querySelector<HTMLButtonElement>('[data-mode="'+next+'"]')?.focus();}}>
       <button type="button" role="radio" data-mode="pin" tabIndex={source==='pin'?0:-1} aria-checked={source==='pin'} onClick={()=>{setSource('pin');resetQuote();}}>Pin de Maps<small>Envío calculado por ubicación</small></button>
       <button type="button" role="radio" data-mode="address" tabIndex={source==='address'?0:-1} aria-checked={source==='address'} onClick={()=>{setSource('address');resetQuote();}}>Dirección escrita<small>Tú indicas el precio acordado</small></button>
      </div>
      {source==='pin'?<><label>Enlace que mandó el cliente<input type="url" value={mapsUrl} maxLength={2048} onChange={event=>{setMapsUrl(event.target.value);setDestination(null);resetQuote();}} placeholder="https://maps.app.goo.gl/…"/></label><span className="delivery-request__optional">O marca el punto en el mapa</span><button type="button" className={destination?'has-location':''} onClick={()=>setMapOpen(true)}><MapPin size={20} aria-hidden="true"/><span>{destination?destination.address:'Elegir pin en el mapa'}</span><ChevronRight size={18} aria-hidden="true"/></button></>
       :<><label>Dirección que envió el cliente<textarea value={writtenAddress} rows={3} maxLength={200} minLength={5} required onChange={event=>{setWrittenAddress(event.target.value);resetQuote();}} placeholder="Copia aquí calle, número, colonia y las referencias que te haya enviado"/></label><p className="delivery-request__location-status" role="status">{addressLookup.busy?'Estamos buscando la dirección…':addressLookup.point?'Encontramos una ubicación para navegar. El precio sigue siendo manual.':'Puedes copiarla tal cual. Si no encontramos un punto claro, el repartidor confirmará la ubicación con el cliente.'}</p></>}
     </div>
     <label className="delivery-request__wide">Referencias para encontrarlo <span className="delivery-request__optional">Opcional</span><textarea rows={2} value={references} maxLength={500} onChange={event=>{setReferences(event.target.value);resetQuote();}} placeholder="Color de la casa, entre calles o indicaciones de entrada"/></label>
    </div></fieldset>
    <fieldset disabled={locked}><legend>Lo que se va a entregar</legend><label>Detalle del pedido<textarea value={description} rows={3} maxLength={2000} required minLength={3} onChange={event=>{setDescription(event.target.value);resetQuote();}} placeholder="Por ejemplo: un pollo bañado y dos órdenes de papas"/></label><label>¿En cuánto está listo?<select value={preparation} onChange={event=>{setPreparation(event.target.value);resetQuote();}}><option value="0">Ya está listo para recoger</option>{[5,10,15,20,30,45,60,90,120].map(minutes=><option key={minutes} value={minutes}>{minutes} minutos</option>)}</select></label></fieldset>
    <fieldset disabled={locked}><legend>Importes de este envío</legend><div className="delivery-request__fields">
     <label>Comida pendiente de cobro<input value={food} onChange={event=>{setFood(event.target.value);resetQuote();}} maxLength={100} required placeholder="Ej. 200 pesos"/><small>Sólo la comida, sin envío ni descuentos por la aportación. Si ya está pagada, escribe 0.</small></label>
     {source==='address'?<label>Envío completo<input value={shipping} onChange={event=>{setShipping(event.target.value);resetQuote();}} maxLength={100} required placeholder="Ej. 50 o cincuenta pesos"/><small>El precio acordado para esta dirección.</small></label>:<div className="delivery-request__automatic"><MapPin size={21} aria-hidden="true"/><strong>Envío por ubicación</strong><p>Calcularemos el costo con el pin, antes de solicitar al repartidor.</p></div>}
    </div><div className="delivery-request__rule"><Check size={17} aria-hidden="true"/><p>Robin’s pone normalmente <strong>{money(defaultContribution)}</strong> del envío. El cliente paga el resto.</p><button type="button" onClick={()=>{setCustom(!custom);resetQuote();}}>{custom?'Usar regla habitual':'Cambiar para este envío'}</button></div>
    {custom&&<label>Lo que pone Robin’s en este envío<input value={contribution} onChange={event=>{setContribution(event.target.value);resetQuote();}} maxLength={100} required placeholder="Ej. 15 pesos"/><small>Puede cubrir una parte o el envío completo. Nunca más que su costo.</small></label>}
    </fieldset>
   </div>
   <aside className="delivery-request__review" aria-label="Resumen antes de solicitar">
    <h3 ref={reviewHeadingRef} tabIndex={-1}>{quote?'Confirma el envío':'Revisa el cobro'}</h3><p>{quote?'Todavía no hemos pedido al repartidor. Revisa el cobro y pulsa «Confirmar y solicitar repartidor».':'Primero calcularemos el cobro. Revisar los importes todavía no envía el pedido.'}</p>
    {quote?<><p className="delivery-request__pricing-label">{quote.pricing==='h3'?'Tarifa automática por pin':'Precio indicado por la sucursal'}</p><p className="delivery-request__quoted-address">{quote.destination.address}{quote.destination.lat===null&&<small>Sin pin confirmado. El repartidor verificará la ubicación con el cliente.</small>}</p><CostBreakdown value={quote}/><Settlement value={quote}/><p className="delivery-request__quote-validity"><Clock3 size={15} aria-hidden="true"/>Resumen válido por 5 minutos</p></>:<div className="delivery-request__review-empty"><Truck size={29} aria-hidden="true"/><p>Completa el formulario para revisar el cobro exacto.</p><span>Comida + parte del envío que paga el cliente.</span></div>}
    {error&&<p className="delivery-request__error" role="alert" ref={errorRef} tabIndex={-1}>{error}</p>}
    {uncertain?<div className="delivery-request__uncertain"><p>No envíes otra solicitud. Primero comprueba ésta o reinténtala con la misma referencia.</p><button type="button" className="delivery-request__secondary" disabled={busy!==null} onClick={()=>void recover()}>{busy==='recover'?<Loader2 className="animate-spin" size={17}/>:<RefreshCw size={17}/>}Comprobar solicitud</button>{quote&&<button type="button" className="delivery-request__primary" disabled={busy!==null} onClick={event=>{event.preventDefault();void send();}}>{busy==='create'?'Confirmando…':'Reintentar el mismo envío'}</button>}</div>
     :quote?<button key="send" type="button" className="delivery-request__primary" disabled={busy!==null} onClick={event=>{event.preventDefault();void send();}}>{busy==='create'?<><Loader2 size={17} className="animate-spin"/>Guardando tu solicitud…</>:<>Confirmar y solicitar repartidor <ArrowRight size={18}/></>}</button>
      :<button key="review" className="delivery-request__primary" disabled={busy!==null||!originReady||source==='address'&&addressLookup.busy} type="submit">{busy==='quote'?<><Loader2 size={17} className="animate-spin"/>Revisando importes…</>:<>Revisar importes <ArrowRight size={18}/></>}</button>}
    {!originReady&&<p className="delivery-request__error" role="alert">La sucursal necesita su ubicación. Revísala en el perfil antes de pedir un repartidor.</p>}
    <p className="delivery-request__cash-note">El cobro al cliente es en efectivo. Si cambias un importe o el destino, revisaremos el resumen otra vez.</p>
   </aside>
  </form>}
  <section className="delivery-request__recent" aria-label="Envíos recientes"><header><div><h3>Envíos de esta sucursal</h3><p>Los últimos 20 servicios de los últimos 30 días.</p></div><button type="button" className="delivery-request__refresh" onClick={()=>void refreshRecent()} aria-label="Actualizar envíos"><RefreshCw size={18}/></button></header>
   {recentError&&<p role="alert" className="delivery-request__error">{recentError} <button type="button" onClick={()=>void refreshRecent()}>Reintentar</button></p>}
   {recentLoading?<p role="status" className="delivery-request__empty">Consultando tus envíos…</p>:recent.length===0?<div className="delivery-request__empty"><Truck size={25} aria-hidden="true"/><p>Aquí verás los envíos que solicites desde este panel.</p></div>:<ul>{recent.map(row=><li key={row.orderId}><div><strong>#{row.orderId.replaceAll('-','').slice(-6).toUpperCase()}</strong><span>{new Intl.DateTimeFormat('es-MX',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'}).format(new Date(row.createdAt))}</span></div><div><span className="delivery-request__status">{deliveryStateLabel[row.state]}</span>{row.incident&&<small>El servicio necesita revisión. Consulta su estado.</small>}</div><div><span>Cobrar al cliente</span><strong>{money(row.total)}</strong></div><a href={trackingLink('/tracker',row.orderId,row.trackingKey)} aria-label={'Ver seguimiento del envío '+row.orderId.slice(-6)}>Ver <ArrowRight size={16}/></a></li>)}</ul>}
   {onOpenOrders&&<button type="button" className="delivery-request__orders-link" onClick={onOpenOrders}>Ir a pedidos activos <ChevronRight size={17}/></button>}
  </section>
  {mapOpen&&<Suspense fallback={<p role="status">Abriendo mapa…</p>}><DeliveryLocationPicker initialLocation={destination} restaurantLocation={originReady?{lat:origin.lat!,lng:origin.lng!}:null} onClose={()=>setMapOpen(false)} onConfirm={location=>{setDestination(location);setMapsUrl('');setSource('pin');setMapOpen(false);resetQuote();}}/></Suspense>}
 </section>;
}
