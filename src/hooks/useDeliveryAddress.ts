import {useEffect,useState} from 'react';
import {requestAddresses,uniqueCertainAddress} from '../lib/deliveryLocation';
import type {DeliveryCoordinates,AddressResult} from '../lib/deliveryLocation';
const config={accessToken:import.meta.env.VITE_MAPBOX_ACCESS_TOKEN?.trim()||'',permanentGeocoding:import.meta.env.VITE_MAPBOX_PERMANENT_GEOCODING==='true'};
interface Lookup {query:string;point:AddressResult|null;busy:boolean}
export function useDeliveryAddress(address:string,origin:DeliveryCoordinates|null,enabled:boolean){
 const query=address.trim();const lat=origin?.lat,lng=origin?.lng;
 const[state,setState]=useState<Lookup>({query:'',point:null,busy:false});
 useEffect(()=>{
  if(!enabled||query.length<8||query.length>210||lat===undefined||lng===undefined||!config.permanentGeocoding)return;
  const controller=new AbortController();
  const timer=window.setTimeout(()=>{
   setState({query,point:null,busy:true});
   void requestAddresses(config,{query:query+', Comitán de Domínguez, Chiapas',proximity:{lat,lng}},controller.signal)
    .then(rows=>{if(!controller.signal.aborted)setState({query,point:uniqueCertainAddress(rows),busy:false});})
    .catch(()=>{if(!controller.signal.aborted)setState({query,point:null,busy:false});});
  },900);
  return()=>{controller.abort();window.clearTimeout(timer);};
 },[query,lat,lng,enabled]);
 const eligible=enabled&&query.length>=8&&query.length<=210&&lat!==undefined&&lng!==undefined&&config.permanentGeocoding;
 return {point:eligible&&state.query===query?state.point:null,busy:eligible&&(state.query!==query||state.busy)};
}
