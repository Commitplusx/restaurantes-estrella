import { assertEquals, assertThrows } from 'jsr:@std/assert'
import { oneRestaurantPerBrand, parseCatalogRows } from '../src/lib/catalogRequest.ts'
import { branchLabel, branchRpcArguments, parseRestaurantBranches, publicRestaurantFamily, restaurantMenuPath, cartRestaurantOrigin, requiresNewBranchCart } from '../src/lib/restaurantBranches.ts'
const parent = '00000000-0000-4000-8000-000000000001'
const child = '00000000-0000-4000-8000-000000000002'
const root = {id:parent,nombre:'Marca QA',telefono:'0000000001',activo:true,direccion:'Calle de prueba 1',perfil_completo:true,matriz_id:null}

Deno.test('catalog has one brand and keeps an active branch when the principal is absent', () => {
  const locations=parseCatalogRows([root,{...root,id:child,matriz_id:parent}])
  assertEquals(oneRestaurantPerBrand(locations).map(r=>r.id),[parent])
  assertEquals(oneRestaurantPerBrand(locations.slice(1)).map(r=>r.id),[child])
})

Deno.test('legacy carts without a known origin require confirmation before mixing locations', () => {
  const unknownOrigin = cartRestaurantOrigin(null,null)
  assertEquals(unknownOrigin,null)
  assertEquals(requiresNewBranchCart(2,unknownOrigin,parent),true)
  assertEquals(requiresNewBranchCart(0,unknownOrigin,parent),false)
  assertEquals(cartRestaurantOrigin(null,child),child)
  assertEquals(cartRestaurantOrigin(parent,child),parent)
  assertEquals(cartRestaurantOrigin('invalid','global'),null)
  assertEquals(requiresNewBranchCart(2,child,parent),true)
  assertEquals(requiresNewBranchCart(2,parent,parent),false)
})

Deno.test('one public family includes only ready active locations from the same brand', () => {
  const rows = parseRestaurantBranches([root,
    {...root,id:child,matriz_id:parent,nombre_sucursal:'Centro'},
    {...root,id:'00000000-0000-4000-8000-000000000003',matriz_id:parent,activo:false},
    {...root,id:'00000000-0000-4000-8000-000000000004',matriz_id:parent,perfil_completo:false},
    {...root,id:'00000000-0000-4000-8000-000000000005'},
  ])
  assertEquals(publicRestaurantFamily(rows,parent).map(r=>r.id),[parent,child])
  assertEquals(branchLabel(rows[1]),'Centro')
})
Deno.test('branch URLs preserve the actual location instead of redirecting to the root', () => {
  const branch = parseRestaurantBranches([{...root,id:child,matriz_id:parent,slug:'marca-centro'}])[0]
  assertEquals(restaurantMenuPath(branch),'/menu/marca-centro')
  assertEquals(restaurantMenuPath({...branch,slug:undefined}),`/menu/${child}`)
})
Deno.test('external branch records are validated before use', () => {
  for (const value of [null,{},[null],[{...root,id:'invalid'}],[{...root,matriz_id:'invalid'}],[{...root,activo:'yes'}]]) {
    assertThrows(()=>parseRestaurantBranches(value))
  }
})
Deno.test('branch writes keep a stable identity and accept valid zero coordinates', () => {
  const draft={id:child,name:' Centro ',phone:'+52 000 000 0002',address:' Calle QA 1 ',lat:'0',lng:'0',active:false}
  const args=branchRpcArguments(parent,draft)
  assertEquals(args.p_branch,child)
  assertEquals(args.p_phone,'0000000002')
  assertEquals(args.p_lat,0)
  assertEquals(args,branchRpcArguments(parent,draft))
  for(const patch of [{lat:''},{lat:'NaN'},{lat:'91'},{lng:'-181'},{phone:'12'},{name:'A'},{address:'A'}]) {
    assertThrows(()=>branchRpcArguments(parent,{...draft,...patch}))
  }
})
