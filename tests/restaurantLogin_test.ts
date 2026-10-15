import { assertEquals, assertThrows } from 'jsr:@std/assert'
import { parseBranchCredentials, restaurantLoginEmail } from '../src/lib/restaurantLogin.ts'
Deno.test('restaurant login normalizes local and international Mexican phone numbers',()=>{
  assertEquals(restaurantLoginEmail('0000000001'),'aliado_0000000001@app-estrella.shop')
  assertEquals(restaurantLoginEmail('+52 000 000 0001'),'aliado_0000000001@app-estrella.shop')
  assertEquals(restaurantLoginEmail(' Example@Example.com '),'example@example.com')
  assertEquals(restaurantLoginEmail('123'),null);assertEquals(restaurantLoginEmail('5200000000011'),null)
})
Deno.test('UI displays only server-confirmed credentials',()=>{
  assertEquals(parseBranchCredentials({status:'exists',phone:'0000000001'},'branch').status,'exists')
  for(const value of [null,{}, {status:'generated',phone:'0000000001',password:'short'}, {status:'generated',phone:'12',password:'x'.repeat(32)}]) assertThrows(()=>parseBranchCredentials(value,'branch'))
})
