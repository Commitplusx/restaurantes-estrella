import { activatePush, decodeVapid, withDeadline } from '../src/lib/pushActivation.ts';
function assert(value:unknown):asserts value { if(!value)throw new Error('Expected condition'); }
async function rejects(task:Promise<unknown>,message:string){try{await task;}catch(error:unknown){assert(error instanceof Error&&error.message.includes(message));return;}throw new Error('Expected rejection');}
function stop():never{throw new Error('Unexpected phase');}
Deno.test('permission request starts synchronously from click, ahead of worker readiness',async()=>{
 const steps:string[]=[];
 const task=activatePush({permission:()=>{steps.push('native-request');return Promise.resolve('granted');},ready:()=>{steps.push('worker');return Promise.resolve('active');},subscribe:()=>Promise.resolve('endpoint'),save:()=>Promise.resolve(),phase:phase=>{steps.push(phase);}});
 assert(steps.join(',')==='permission,native-request');await task;
 assert(steps.indexOf('native-request')<steps.indexOf('worker'));
});
Deno.test('denied and dismissed native prompts do not subscribe or report success',async()=>{
 for(const permission of ['denied','default'] as const) await rejects(activatePush({permission:()=>Promise.resolve(permission),ready:stop,subscribe:stop,save:stop,phase:()=>undefined}),permission==='denied'?'bloqueó':'No activaste');
});
Deno.test('pending native permission releases UI through a bounded failure',async()=>{
 await rejects(activatePush({permission:()=>new Promise<NotificationPermission>(()=>undefined),ready:stop,subscribe:stop,save:stop,phase:()=>undefined,timeout:3}),'Revisa el permiso');
});
Deno.test('missing worker stops before subscription and durable save',async()=>{
 await rejects(activatePush({permission:()=>Promise.resolve('granted'),ready:()=>new Promise<string>(()=>undefined),subscribe:stop,save:stop,phase:()=>undefined,timeout:3}),'preparar');
});
Deno.test('hanging push provider stops before saving',async()=>{
 await rejects(activatePush({permission:()=>Promise.resolve('granted'),ready:()=>Promise.resolve('worker'),subscribe:()=>new Promise<string>(()=>undefined),save:stop,phase:()=>undefined,timeout:3}),'tardó demasiado');
});
Deno.test('saving error remains an error, rather than hiding the prompt as successful',async()=>{
 await rejects(activatePush({permission:()=>Promise.resolve('granted'),ready:()=>Promise.resolve('worker'),subscribe:()=>Promise.resolve('endpoint'),save:()=>Promise.reject(new Error('save failed')),phase:()=>undefined}),'save failed');
});
Deno.test('a hanging save has a deadline',async()=>{
 await rejects(activatePush({permission:()=>Promise.resolve('granted'),ready:()=>Promise.resolve('worker'),subscribe:()=>Promise.resolve('endpoint'),save:()=>new Promise<void>(()=>undefined),phase:()=>undefined,timeout:3}),'guardar');
});
Deno.test('activation succeeds only after durable save acknowledgement',async()=>{
 let saved=false;await activatePush({permission:()=>Promise.resolve('granted'),ready:()=>Promise.resolve('worker'),subscribe:()=>Promise.resolve('endpoint'),save:()=>{saved=true;return Promise.resolve();},phase:()=>undefined});assert(saved);
});
Deno.test('cancelling native prompt stops remaining phases even when browser later grants',async()=>{
 const controller=new AbortController();let grant:((permission:NotificationPermission)=>void)|undefined;
 const pending=new Promise<NotificationPermission>(resolve=>{grant=resolve;});
 const task=activatePush({permission:()=>pending,ready:stop,subscribe:stop,save:stop,phase:()=>undefined,signal:controller.signal});
 controller.abort();await rejects(task,'cancelada');grant?.('granted');await Promise.resolve();
});
Deno.test('cancellation while waiting for worker never reaches subscribe',async()=>{
 const controller=new AbortController();const task=activatePush({permission:()=>Promise.resolve('granted'),ready:()=>new Promise<string>(()=>undefined),subscribe:stop,save:stop,phase:phase=>{if(phase==='worker')controller.abort();},signal:controller.signal});
 await rejects(task,'abort');
});
Deno.test('invalid public configuration is explicit and never treated as enabled',()=>{
 for(const key of ['','bad key','YWJj']){let failed=false;try{decodeVapid(key);}catch{failed=true;}assert(failed);}
 const bytes=new Uint8Array(65);bytes[0]=4;const key=btoa(String.fromCharCode(...bytes)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');assert(decodeVapid(key).length===65);
});
Deno.test('deadline cleanup also works for an already aborted request',async()=>{
 const controller=new AbortController();controller.abort();await rejects(withDeadline(new Promise<string>(()=>undefined),1000,'timeout',controller.signal),'cancelada');
});
