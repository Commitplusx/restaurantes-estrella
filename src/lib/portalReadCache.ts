/** Short-lived, bounded in-memory reads. No credentials or customer data in storage. */
export function createPortalReadCache<T>(ttlMs=20000,maxEntries=16,now=Date.now){
 const entries=new Map<string,{value?:T;expires:number;pending?:Promise<T>}>();
 return {
  clear(){entries.clear();},
  invalidate(key:string){entries.delete(key);},
  read(key:string,load:()=>Promise<T>):Promise<T>{
   const current=entries.get(key);
   if(current?.pending)return current.pending;
   if(current&&current.value!==undefined&&current.expires>now())return Promise.resolve(current.value);
   const entry:{value?:T;expires:number;pending?:Promise<T>}={expires:0};
   const pending=Promise.resolve().then(load).then(value=>{
    if(entries.get(key)===entry){entry.value=value;entry.expires=now()+ttlMs;entry.pending=undefined;}
    return value;
   },(error:unknown)=>{if(entries.get(key)===entry)entries.delete(key);throw error;});
   entry.pending=pending;entries.delete(key);entries.set(key,entry);
   while(entries.size>maxEntries){const oldest=entries.keys().next().value;if(oldest===undefined)break;entries.delete(oldest);}
   return pending;
  },
 };
}
