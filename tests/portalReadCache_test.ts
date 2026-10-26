import {deepStrictEqual as equal} from 'node:assert/strict';
import {createPortalReadCache} from '../src/lib/portalReadCache.ts';
Deno.test('portal reads coalesce, expire quickly and never share restaurant keys',async()=>{
 let clock=0,calls=0;const cache=createPortalReadCache<number>(20,2,()=>clock);
 const load=()=>Promise.resolve(++calls);
 equal(await Promise.all([cache.read('one',load),cache.read('one',load)]),[1,1]);
 equal(await cache.read('two',load),2);equal(await cache.read('one',load),1);
 clock=21;equal(await cache.read('one',load),3);
 cache.clear();equal(await cache.read('one',load),4);
});
Deno.test('failure is not cached and invalidated work cannot replace a later value',async()=>{
 const cache=createPortalReadCache<number>();
 try{await cache.read('branch',()=>Promise.reject(new Error('fixture')));}catch(error:unknown){if(!(error instanceof Error)||error.message!=='fixture')throw error;}
 equal(await cache.read('branch',()=>Promise.resolve(2)),2);
 cache.invalidate('branch');let release:(value:number)=>void=()=>{throw new Error('Not started');};
 const first=cache.read('branch',()=>new Promise<number>(resolve=>{release=resolve;}));await Promise.resolve();
 cache.invalidate('branch');equal(await cache.read('branch',()=>Promise.resolve(3)),3);
 release(1);await first;equal(await cache.read('branch',()=>Promise.resolve(4)),3);
});
Deno.test('portal cache evicts old keys instead of growing without bound',async()=>{
 const cache=createPortalReadCache<number>(20,2,()=>0);
 for(const key of['one','two','three'])await cache.read(key,()=>Promise.resolve(1));
 equal(await cache.read('one',()=>Promise.resolve(2)),2);
});
