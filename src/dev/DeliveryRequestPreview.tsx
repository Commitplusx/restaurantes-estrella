import { useState } from 'react';
import { BrandLogo } from '../components/BrandLogo';
import { EnviosView } from '../pages/views/EnviosView';
import type { DeliveryCapability, RestaurantDeliveryApi, RestaurantDeliveryQuote, RestaurantDeliveryReceipt } from '../lib/restaurantDelivery';
import { DeliverySubmissionError } from '../lib/restaurantDelivery';
import '../pages/restaurantPortal.css';
import {latLngToCell} from 'h3-js';
const branches=['Belisario','Itaes','San Agustín'];
const id=(n:number)=>'00000000-0000-4000-8000-'+String(n).padStart(12,'0');
let quote:RestaurantDeliveryQuote|null=null;
const receipts:RestaurantDeliveryReceipt[]=[];
const branchReceipts=new Map<string,string>();
let clockOffset=0;
type PreviewResponse='success'|'lost'|'rejected';
let previewResponse:PreviewResponse='success';
const previewNow=()=>Date.now()+clockOffset;
const api:RestaurantDeliveryApi={
 async quote(input){
  const pin=input.source==='pin';let destination=input.destination;
  if(pin&&input.mapsUrl&&destination.lat!==null)throw new Error('Elige un pin o pega un enlace, sin combinar ambos.');
  if(pin&&input.mapsUrl){const match=input.mapsUrl.match(/[?&](?:q|query)=(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/);if(!match)throw new Error('En la demostración usa https://maps.google.com/?q=16.25,-92.13 o elige el punto en el mapa.');destination={lat:Number(match[1]),lng:Number(match[2]),address:'Ubicación de prueba compartida en Maps'};}
  const fee=pin?60:input.shippingPrice?.trim().toLowerCase()==='cincuenta pesos'?50:Number(input.shippingPrice);
  const food=Number(input.foodTotal),contribution=input.restaurantContribution===undefined?Math.min(15,fee):Number(input.restaurantContribution);
  if(!Number.isFinite(fee)||fee<=0||!Number.isFinite(food)||food<0||!Number.isFinite(contribution)||contribution<0||contribution>fee)throw new Error('En esta vista de prueba escribe importes numéricos o “cincuenta pesos” para el envío.');
  const index=Number(input.restaurantId.slice(-1))-1;
  quote={id:input.id,restaurantId:input.restaurantId,destination,origin:{id:input.restaurantId,name:'Pollo Robin’s',branch:branches[index]??branches[0],address:'Dirección de ejemplo · Comitán',lat:16.25,lng:-92.13},fee,food,restaurantContribution:contribution,customerShipping:fee-contribution,customerToCollect:food+fee-contribution,restaurantSettlement:food-contribution,pricing:pin?'h3':'manual',locationSource:pin?'pin':'address',h3Index:pin&&destination.lat!==null&&destination.lng!==null?latLngToCell(destination.lat,destination.lng,10):null,expiresAt:new Date(previewNow()+300000).toISOString()};
  return quote;
 },
 async create(requestId,intent){
  if(!quote||quote.id!==intent.quoteId)throw new Error('Revisa otra vez los importes de la demostración.');
  const existing=receipts.find(row=>row.requestId===requestId);if(existing)return existing;
  if(previewResponse==='rejected')throw new DeliverySubmissionError('La solicitud de prueba fue rechazada. No se guardó ningún envío.',false);
  const row:RestaurantDeliveryReceipt={...quote,requestId,orderId:crypto.randomUUID(),state:'buscando_repartidor',total:quote.customerToCollect,trackingKey:crypto.randomUUID(),incident:null,pickupPin:'0042',createdAt:new Date().toISOString()};
  branchReceipts.set(row.requestId,quote.restaurantId);receipts.unshift(row);
  if(previewResponse==='lost')throw new DeliverySubmissionError('La respuesta de prueba se perdió después de guardar. Comprueba la solicitud sin crear otra.',true);
  return row;
 },
 async result(key){return receipts.find(row=>row.requestId===key)??null;},
 async recent(restaurantId){return receipts.filter(row=>branchReceipts.get(row.requestId)===restaurantId).slice(0,20);},
};
export default function DeliveryRequestPreview(){
 const[index,setIndex]=useState(0);
 const[clockMinutes,setClockMinutes]=useState(0);
 const[response,setResponse]=useState<PreviewResponse>('success');
 const capability:Extract<DeliveryCapability,{enabled:true}>={enabled:true,pricing:'location',defaultContribution:15,origin:{id:id(index+1),name:'Pollo Robin’s',branch:branches[index],address:'Dirección de ejemplo · Comitán',lat:16.25,lng:-92.13}};
 return <div className="restaurant-portal"><aside className="restaurant-portal__sidebar"><div className="restaurant-portal__brand"><BrandLogo/></div><p>Panel para restaurantes</p><button type="button" className="restaurant-portal__nav-button is-active">Solicitar envío</button><p>Vista de diseño local</p></aside><div className="restaurant-portal__main"><header className="restaurant-portal__header"><h1>Solicitar envío</h1><span>Pollo Robin’s</span></header><main className="restaurant-portal__content-scroll"><div className="restaurant-portal__content"><p role="note" style={{marginBottom:18}}>Demostración local. No se crean pedidos ni se buscan repartidores reales.</p><button type="button" onClick={()=>{clockOffset+=360000;setClockMinutes(clockMinutes+6);}}>Avanzar reloj de prueba 6 minutos</button><small> Reloj de demostración: +{clockMinutes} min.</small><label className="portal-branch-picker">Respuesta de prueba <select value={response} onChange={event=>{const value=event.target.value;if(value==='success'||value==='lost'||value==='rejected'){previewResponse=value;setResponse(value);}}}><option value="success">Confirmación correcta</option><option value="lost">Respuesta perdida después de guardar</option><option value="rejected">Rechazo sin guardar</option></select></label><label className="portal-branch-picker">Sucursal de ejemplo <select value={index} onChange={event=>setIndex(Number(event.target.value))}>{branches.map((branch,i)=><option key={branch} value={i}>{branch}</option>)}</select></label><EnviosView key={index} capability={capability} api={api} now={previewNow}/></div></main></div></div>;
}
