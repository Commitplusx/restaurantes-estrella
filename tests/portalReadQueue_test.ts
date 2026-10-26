import {deepStrictEqual as equal, rejects} from 'node:assert/strict';
import {createPortalReadQueue} from '../src/lib/portalReadQueue.ts';

Deno.test('reconnect during an initial snapshot gets one later read, without concurrent duplicates',async()=>{
 const queue=createPortalReadQueue();let calls=0,active=0,maximum=0;
 let release:()=>void=()=>{throw new Error('Read did not start');};
 const first=queue.run('branch',async()=>{
  calls++;active++;maximum=Math.max(maximum,active);
  await new Promise<void>(resolve=>{release=resolve;});active--;
 });
 await Promise.resolve();
 const load=async()=>{calls++;active++;maximum=Math.max(maximum,active);active--;};
 const duplicate=queue.run('branch',load);
 const reconnect=queue.run('branch',load,true);
 const burst=queue.run('branch',load,true);
 equal(calls,1);release();await Promise.all([first,duplicate,reconnect,burst]);
 equal({calls,maximum},{calls:2,maximum:1});
});

Deno.test('read failures do not retry queued work; a later explicit request can recover',async()=>{
 const queue=createPortalReadQueue();let calls=0;
 const failed=queue.run('branch',()=>{calls++;throw new Error('fixture');});
 queue.run('branch',async()=>{calls++;},true);
 await rejects(failed,/fixture/);equal(calls,1);
 await queue.run('branch',async()=>{calls++;});equal(calls,2);
});

Deno.test('different branches never share a pending read',async()=>{
 const queue=createPortalReadQueue();const read:string[]=[];
 await Promise.all(['one','two'].map(key=>queue.run(key,async()=>{read.push(key);})));equal(read,['one','two']);
});

Deno.test('leaving the portal discards a queued follow-up',async()=>{
 const queue=createPortalReadQueue();let calls=0;
 let release:()=>void=()=>{throw new Error('Read did not start');};
 const first=queue.run('branch',async()=>{calls++;await new Promise<void>(resolve=>{release=resolve;});});
 await Promise.resolve();queue.run('branch',async()=>{calls++;},true);
 queue.clear();release();await first;equal(calls,1);
});
