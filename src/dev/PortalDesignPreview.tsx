import {useState} from 'react';
import {RestaurantPortalShell} from '../components/RestaurantPortalShell';
import {BranchLocations} from '../pages/views/SucursalesView';
import type {Restaurante} from '../lib/supabase';
import type {PortalTab} from '../lib/portalNavigation';
const id=(n:number)=>'00000000-0000-4000-8000-'+String(n).padStart(12,'0');
const primary:Restaurante={id:id(1),nombre:'Pollo Robin’s',nombre_sucursal:'Belisario',telefono:'0000000001',direccion:'Dirección de demostración · Belisario',activo:true,perfil_completo:true,matriz_id:null};
const branches:Restaurante[]=['Itaes','San Agustín'].map((name,index)=>({...primary,id:id(index+2),matriz_id:primary.id,nombre_sucursal:name,telefono:'000000000'+(index+2),direccion:`Dirección de demostración · ${name}`}));
export default function PortalDesignPreview(){
 const [activeTab,setTab]=useState<PortalTab>('sucursales'),[selected,setSelected]=useState(primary.id),[audio,setAudio]=useState(false),[notice,setNotice]=useState('');
 const operating=[primary,...branches].find(branch=>branch.id===selected)??primary;
 return <RestaurantPortalShell restaurant={primary} operatingRestaurant={operating} branches={branches} activeTab={activeTab} onNavigate={setTab} onSelectBranch={setSelected} onLogout={async()=>{setNotice('Demostración: no hay una sesión real que cerrar.');}} deliveryEnabled audioUnlocked={audio} onEnableAudio={()=>setAudio(true)}>
  <p role="note" className="portal-preview-notice">Demostración local. No se crean cuentas, pedidos ni envíos.</p>
  {notice&&<p role="status" className="portal-preview-notice">{notice}</p>}
  {activeTab==='sucursales'?<section className="restaurant-branches" aria-labelledby="branches-title"><header className="restaurant-branches__heading"><div><h3 id="branches-title">Tus sucursales</h3><p>Cada ubicación entra con su propio número. Desde la principal puedes administrar las tres.</p></div></header><div className="branch-list"><BranchLocations locations={[primary,...branches]} primaryId={primary.id} saving={false} onManage={branch=>{setSelected(branch.id);setTab('productos');}} onEdit={()=>setNotice('La edición es sólo una demostración. No se guardaron cambios.')} onAccess={()=>setNotice('Cada sucursal tiene su acceso propio. Esta vista no genera contraseñas.')}/></div></section>:<section className="restaurant-branches"><h3>{operating.nombre_sucursal}</h3><p className="portal-preview-notice">La navegación y el selector usan el mismo componente del portal real. Aquí no se consulta ni modifica el catálogo.</p><button type="button" className="branch-button" onClick={()=>setTab('sucursales')}>Ver sucursales</button>{activeTab==='envios'&&<a className="branch-button" href="/envios-diseno">Abrir formulario de demostración</a>}</section>}
 </RestaurantPortalShell>;
}
