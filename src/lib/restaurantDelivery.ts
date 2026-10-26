export interface DeliveryDestination {lat:number|null;lng:number|null;address:string}
export interface DeliveryOrigin { id: string; name: string; branch: string; address: string; lat: number | null; lng: number | null }
export type DeliveryCapability = { enabled: false } | { enabled: true; origin: DeliveryOrigin; defaultContribution: number; pricing: 'manual'|'location' };
export interface DeliveryBreakdown { fee:number; food:number; restaurantContribution:number; customerShipping:number; restaurantSettlement:number }
export interface RestaurantDeliveryQuote extends DeliveryBreakdown { id: string; restaurantId: string; destination: DeliveryDestination; origin: DeliveryOrigin; customerToCollect:number; expiresAt: string; pricing:'manual'|'h3';locationSource:'address'|'pin';h3Index:string|null }
export interface RestaurantDeliveryQuoteInput {id:string;restaurantId:string;source?:'pin'|'address';destination:DeliveryDestination;mapsUrl?:string;shippingPrice?:string;foodTotal:string;restaurantContribution?:string}
export interface RestaurantDeliveryIntent { quoteId: string; name: string; phone: string; description: string; references: string; preparationMinutes: number }
export interface RestaurantDeliveryReceipt extends DeliveryBreakdown { requestId: string; orderId: string; state: string; total: number; createdAt: string; trackingKey: string; incident: string | null }
export interface RestaurantDeliveryApi {
  quote(input: RestaurantDeliveryQuoteInput): Promise<RestaurantDeliveryQuote>;
  create(requestId: string, intent: RestaurantDeliveryIntent): Promise<RestaurantDeliveryReceipt>;
  result(requestId: string): Promise<RestaurantDeliveryReceipt | null>;
  recent(restaurantId: string): Promise<RestaurantDeliveryReceipt[]>;
}
export class DeliverySubmissionError extends Error {readonly uncertain:boolean;readonly conflict:boolean;constructor(message:string,uncertain:boolean,conflict=false){super(message);this.uncertain=uncertain;this.conflict=conflict;}}
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
function object(value: unknown): Record<string,unknown> { if(!value || typeof value!=='object' || Array.isArray(value))throw new Error('No pudimos comprobar los datos del envío.');return value as Record<string,unknown>; }
function text(value: unknown, max=300): string { if(typeof value!=='string'||value.length>max)throw new Error('No pudimos comprobar los datos del envío.');return value; }
function uuid(value: unknown): string { const result=text(value,36);if(!UUID.test(result))throw new Error('No pudimos comprobar la referencia del envío.');return result; }
function number(value: unknown, max: number): number { if(typeof value!=='number'||!Number.isFinite(value)||value<0||value>max||Math.abs(value*100-Math.round(value*100))>0.000001)throw new Error('No pudimos comprobar el importe del envío.');return value; }
function timestamp(value: unknown): string { const result=text(value,64);if(!Number.isFinite(Date.parse(result)))throw new Error('No pudimos comprobar la fecha del envío.');return result; }
function coordinate(value: unknown,max:number):number {if(typeof value!=='number'||!Number.isFinite(value)||Math.abs(value)>max)throw new Error('No pudimos comprobar la ubicación del envío.');return value;}
function origin(value: unknown):DeliveryOrigin {const row=object(value);return{id:uuid(row.id),name:text(row.name),branch:text(row.branch),address:text(row.address),lat:row.lat===null?null:coordinate(row.lat,90),lng:row.lng===null?null:coordinate(row.lng,180)};}
function breakdown(row:Record<string,unknown>,total:unknown):DeliveryBreakdown {
 const fee=number(row.fee,10000),food=number(row.food,100000),restaurantContribution=number(row.restaurantContribution,10000),customerShipping=number(row.customerShipping,10000),settlement=row.restaurantSettlement;
 if(typeof settlement!=='number'||!Number.isFinite(settlement)||Math.abs(settlement)>100000||restaurantContribution>fee||Math.round((customerShipping+restaurantContribution)*100)!==Math.round(fee*100)||Math.round((food-restaurantContribution)*100)!==Math.round(settlement*100)||Math.round((food+customerShipping)*100)!==Math.round(number(total,110000)*100))throw new Error('Los importes del envío no coinciden. Vuelve a revisar el resumen.');
 return{fee,food,restaurantContribution,customerShipping,restaurantSettlement:settlement};
}
export function parseDeliveryCapability(value:unknown):DeliveryCapability {const row=object(value);if(row.enabled===false)return{enabled:false};if(row.enabled!==true||row.pricing!=='manual'&&row.pricing!=='location')throw new Error('No pudimos comprobar el acceso a envíos.');return{enabled:true,origin:origin(row.origin),pricing:row.pricing,defaultContribution:number(row.defaultContribution,10000)};}
export function parseRestaurantDeliveryQuote(value:unknown):RestaurantDeliveryQuote {
 const row=object(value),point=object(row.destination),pin=row.pricing==='h3';
 if(row.pricing!=='manual'&&!pin||row.locationSource!==(pin?'pin':'address')
  ||(pin?typeof row.h3Index!=='string'||!/^8a[0-9a-f]{13}$/.test(row.h3Index):row.h3Index!==null)
  ||(point.lat===null)!==(point.lng===null)||pin&&point.lat===null)throw new Error('No pudimos comprobar cómo se fijó la tarifa.');
 const restaurantId=uuid(row.restaurantId),branch=origin(row.origin);
 if(branch.id!==restaurantId)throw new Error('La ubicación de origen no coincide con la sucursal.');
 return{id:uuid(row.id),restaurantId,origin:branch,destination:{lat:point.lat===null?null:coordinate(point.lat,90),lng:point.lng===null?null:coordinate(point.lng,180),address:text(point.address)},...breakdown(row,row.customerToCollect),customerToCollect:number(row.customerToCollect,110000),pricing:pin?'h3':'manual',locationSource:pin?'pin':'address',h3Index:pin?text(row.h3Index,15):null,expiresAt:timestamp(row.expiresAt)};
}
export function parseRestaurantDeliveryReceipt(value:unknown):RestaurantDeliveryReceipt {const row=object(value),state=text(row.state,40);if(!['buscando_repartidor','ofrecido','asignado','recibido','en_camino','entregado','cancelado'].includes(state))throw new Error('No pudimos comprobar el estado del servicio.');return{requestId:uuid(row.requestId),orderId:uuid(row.orderId),state,...breakdown(row,row.total),total:number(row.total,110000),createdAt:timestamp(row.createdAt),trackingKey:uuid(row.trackingKey),incident:row.incident===null?null:text(row.incident,120)};}
export function parseDeliveryReceipts(value:unknown):RestaurantDeliveryReceipt[]{if(!Array.isArray(value)||value.length>20)throw new Error('No pudimos comprobar los envíos recientes.');return value.map(parseRestaurantDeliveryReceipt);}
export function normalizeDeliveryPhone(value:string):string {const digits=value.replace(/\D/g,'');if(!/^(?:52|521)?\d{10}$/.test(digits))throw new Error('Escribe el teléfono del cliente con 10 dígitos.');return digits.slice(-10);}
export function foodAmount(value:string):number {if(!/^\d{1,6}(?:\.\d{1,2})?$/.test(value.trim()))throw new Error('Escribe el importe de comida con hasta dos decimales.');return number(Number(value),100000);}
export const deliveryStateLabel:Record<string,string>={buscando_repartidor:'Buscando repartidor',ofrecido:'Esperando respuesta del repartidor',asignado:'Repartidor asignado',recibido:'En recolección',en_camino:'En camino',entregado:'Entregado',cancelado:'Cancelado'};
