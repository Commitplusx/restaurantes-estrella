import { supabase } from './supabase';
import { DeliverySubmissionError,parseDeliveryCapability,parseDeliveryReceipts,parseRestaurantDeliveryQuote,parseRestaurantDeliveryReceipt } from './restaurantDelivery';
import type { RestaurantDeliveryApi } from './restaurantDelivery';
const deadline=()=>AbortSignal.timeout(12000);
export async function restaurantDeliveryCapability(restaurantId:string,signal:AbortSignal){
 const{data,error}=await supabase.rpc('eats_restaurant_delivery_capability',{p_restaurante_id:restaurantId}).abortSignal(signal).returns<unknown>();
 if(error)throw new Error('No pudimos comprobar el acceso a envíos.');return parseDeliveryCapability(data);
}
export const restaurantDeliveryApi:RestaurantDeliveryApi={
 async quote(input){
  const{data,error}=await supabase.functions.invoke<unknown>('restaurant-delivery-quote',{body:input,signal:AbortSignal.timeout(20000)});
  if(error){
   if('context'in error && error.context instanceof Response){
    const response=error.context;
    let message='No pudimos calcular el envío. Vuelve a intentarlo.';
    try{const body:unknown=await response.json();if(body&&typeof body==='object'&&'error'in body&&typeof body.error==='string'&&body.error.length<=300)message=body.error;}catch{ /* Keep an explicit error when the provider has no usable JSON. */ }
    throw new Error(message);
   }
   throw new Error('No pudimos calcular el envío. Revisa tu conexión y vuelve a intentarlo.');
  }
  return parseRestaurantDeliveryQuote(data);
 },
 async create(requestId,intent){const{data,error}=await supabase.rpc('eats_restaurant_delivery_create',{p_request_id:requestId,p_input:intent}).abortSignal(deadline()).returns<unknown>();if(error){const definite=['PT409','22023','42501','22P02'].includes(error.code);throw new DeliverySubmissionError(definite?error.message:'No pudimos confirmar el envío. Conservamos la referencia para consultarlo sin duplicarlo.',!definite,error.code==='PT409');}return parseRestaurantDeliveryReceipt(data,requestId);},
 async result(requestId){const{data,error}=await supabase.rpc('eats_restaurant_delivery_result',{p_request_id:requestId}).abortSignal(deadline()).returns<unknown>();if(error)throw new Error('No pudimos consultar el resultado. Vuelve a comprobar con la misma referencia.');return data===null?null:parseRestaurantDeliveryReceipt(data,requestId);},
 async recent(restaurantId){const{data,error}=await supabase.rpc('eats_restaurant_delivery_recent',{p_restaurante_id:restaurantId}).abortSignal(deadline()).returns<unknown>();if(error)throw new Error('No pudimos actualizar los envíos recientes.');return parseDeliveryReceipts(data);},
};
