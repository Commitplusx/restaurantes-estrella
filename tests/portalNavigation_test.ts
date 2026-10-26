import {deepStrictEqual as equal} from 'node:assert/strict';
import {availablePortalSections,mobilePortalTabs} from '../src/lib/portalNavigation.ts';
Deno.test('primary account can always reach branches on mobile and desktop',()=>{
 for(const delivery of [false,true]){
  equal(availablePortalSections(false,delivery).some(item=>item.id==='sucursales'),true);
  equal(mobilePortalTabs(false,delivery).includes('sucursales'),true);
 }
});
Deno.test('branch accounts do not get sibling management and shipping needs entitlement',()=>{
 for(const branch of [false,true])for(const delivery of [false,true]){
  const tabs=availablePortalSections(branch,delivery).map(item=>item.id),mobile=mobilePortalTabs(branch,delivery);
  equal(tabs.includes('sucursales'),!branch);equal(tabs.includes('envios'),delivery);
  equal(mobile.length,4);equal(new Set(mobile).size,4);equal(mobile.every(tab=>tabs.includes(tab)),true);
 }
});
