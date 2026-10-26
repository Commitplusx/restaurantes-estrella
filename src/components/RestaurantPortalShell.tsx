import {useEffect,useRef,useState} from 'react';
import type {ReactNode} from 'react';
import {ArrowUpRight,BellRing,ChevronDown,LayoutDashboard,LogOut,MapPin,MoreHorizontal,Package,Store,Tag,Ticket,Truck,Utensils,X} from 'lucide-react';
import type {Restaurante} from '../lib/supabase';
import {branchLabel,restaurantMenuPath} from '../lib/restaurantBranches';
import {availablePortalSections,mobilePortalTabs,portalSections} from '../lib/portalNavigation';
import type {PortalTab} from '../lib/portalNavigation';
import {BrandLogo} from './BrandLogo';
import '../pages/restaurantPortal.css';
import '../pages/restaurantPortalEats.css';

const icons={dashboard:LayoutDashboard,pedidos:BellRing,envios:Truck,productos:Utensils,combos:Package,promos:Tag,cupones:Ticket,sucursales:Store,perfil:Store};
const tourIds={dashboard:'dashboard',pedidos:'pedidos',envios:'envios',productos:'platillos',combos:'combos',promos:'promos',cupones:'cupones',sucursales:'sucursales',perfil:'perfil'};

export function RestaurantPortalShell({restaurant,operatingRestaurant,branches,activeTab,onNavigate,onSelectBranch,onLogout,deliveryEnabled,audioUnlocked,onEnableAudio,children}:{
 restaurant:Restaurante;operatingRestaurant:Restaurante;branches:Restaurante[];activeTab:PortalTab;
 onNavigate:(tab:PortalTab)=>void;onSelectBranch:(id:string)=>void;onLogout:()=>Promise<void>;
 deliveryEnabled:boolean;audioUnlocked:boolean;onEnableAudio:()=>void;children:ReactNode;
}) {
 const [moreOpen,setMoreOpen]=useState(false);
 const menuRef=useRef<HTMLDialogElement>(null);
 const contentRef=useRef<HTMLElement>(null);
 const isBranch=Boolean(restaurant.matriz_id);
 const sections=availablePortalSections(isBranch,deliveryEnabled);
 const mobileTabs=mobilePortalTabs(isBranch,deliveryEnabled);
 const section=portalSections.find(item=>item.id===activeTab)??portalSections[0];
 const locations=[restaurant,...branches];
 const navigate=(tab:PortalTab)=>{setMoreOpen(false);onNavigate(tab);};
 useEffect(()=>{
  const menu=menuRef.current;if(!menu)return;
  if(moreOpen&&!menu.open)menu.showModal();else if(!moreOpen&&menu.open)menu.close();
 },[moreOpen]);
 useEffect(()=>{contentRef.current?.scrollTo({top:0,behavior:'auto'});},[activeTab]);

 return <div className="restaurant-portal restaurant-portal--eats">
  <aside className="restaurant-portal__sidebar" aria-label="Menú del restaurante">
   <div className="restaurant-portal__brand"><BrandLogo/><p>Para restaurantes</p></div>
   <div className="portal-identity"><span className="portal-identity__mark">{restaurant.logo_url?<img src={restaurant.logo_url} alt=""/>:<Store size={21}/>}</span><div><strong>{restaurant.nombre}</strong><span>{isBranch?branchLabel(restaurant):'Cuenta principal'}</span></div></div>
   <nav className="portal-sections" aria-label="Secciones del portal">
    {(['operate','menu','settings'] as const).map(group=><div className="portal-sections__group" key={group}>
     {group!=='operate'&&<p>{group==='menu'?'Tu menú':'Tu negocio'}</p>}
     {sections.filter(item=>item.group===group).map(item=>{const Icon=icons[item.id];return <button key={item.id} id={`desktop-tour-${tourIds[item.id]}`} type="button" className={`restaurant-portal__nav-button${activeTab===item.id?' is-active':''}`} aria-current={activeTab===item.id?'page':undefined} onClick={()=>navigate(item.id)}><Icon size={19}/><span>{item.label}</span>{item.id==='sucursales'&&branches.length>0&&<small>{locations.length}</small>}</button>;})}
    </div>)}
   </nav>
   <div className="restaurant-portal__sidebar-spacer"/>
   <a className="portal-public-link" href={restaurantMenuPath(operatingRestaurant)} target="_blank" rel="noopener noreferrer">Ver mi menú <ArrowUpRight size={17}/></a>
   <button type="button" onClick={()=>void onLogout()} className="restaurant-portal__logout"><LogOut size={17}/>Cerrar sesión</button>
  </aside>

  <div className="restaurant-portal__main">
   <header id="tour-welcome" className="restaurant-portal__header">
    <div className="portal-mobile-brand"><BrandLogo/></div>
    <div className="restaurant-portal__page-heading"><h1>{section.label}</h1><p>{section.description}</p></div>
    <div className="portal-location-control">
     <MapPin size={18} aria-hidden="true"/>
     <div><label htmlFor={locations.length>1&&activeTab!=='pedidos'&&activeTab!=='sucursales'?'portal-branch':undefined}>{activeTab==='sucursales'?'Cuenta principal':activeTab==='pedidos'?'Pedidos de':'Sucursal que administras'}</label>
      {activeTab==='sucursales'?<strong>{locations.length} {locations.length===1?'ubicación':'ubicaciones'}</strong>:activeTab==='pedidos'&&branches.length>0?<strong>Todas tus sucursales</strong>:locations.length>1?<div className="portal-location-control__select"><select id="portal-branch" value={operatingRestaurant.id} onChange={event=>onSelectBranch(event.target.value)}>{locations.map(branch=><option value={branch.id} key={branch.id}>{branchLabel(branch)}{branch.activo?'':' · Pausada'}</option>)}</select><ChevronDown size={16} aria-hidden="true"/></div>:<strong>{branchLabel(operatingRestaurant)}</strong>}
     </div>
    </div>
   </header>
   {!audioUnlocked&&<div className="portal-sound-permission"><BellRing size={18}/><p>Activa el sonido para enterarte cuando llegue un pedido.</p><button type="button" onClick={event=>{event.stopPropagation();onEnableAudio();}}>Activar sonido</button></div>}
   <main ref={contentRef} className="restaurant-portal__content-scroll" id="portal-content">
    <div className="restaurant-portal__content">
     <div className="portal-mobile-heading"><h1>{section.label}</h1><p>{section.description}</p></div>
     {children}
    </div>
   </main>
  </div>

  <nav className="restaurant-portal__mobile-nav" aria-label="Navegación del restaurante">
   {mobileTabs.map(tab=>{const Icon=icons[tab],item=portalSections.find(entry=>entry.id===tab);return <button key={tab} id={`mobile-tour-${tourIds[tab]}`} type="button" onClick={()=>navigate(tab)} aria-current={activeTab===tab?'page':undefined} className={`restaurant-portal__mobile-nav-button${activeTab===tab?' is-active':''}`}><Icon size={21}/><span>{tab==='envios'?'Envíos':item?.label}</span></button>;})}
   <button type="button" id="mobile-tour-more" aria-haspopup="dialog" aria-expanded={moreOpen} onClick={()=>setMoreOpen(true)} className={`restaurant-portal__mobile-nav-button${!mobileTabs.includes(activeTab)?' is-active':''}`}><MoreHorizontal size={22}/><span>Más</span></button>
  </nav>
  <dialog ref={menuRef} className="portal-more-menu" aria-labelledby="portal-more-title" onCancel={()=>setMoreOpen(false)} onClose={()=>setMoreOpen(false)}>
   <header><div><h2 id="portal-more-title">Tu restaurante</h2><p>{restaurant.nombre}</p></div><button type="button" aria-label="Cerrar menú" onClick={()=>setMoreOpen(false)}><X size={21}/></button></header>
   <nav aria-label="Todas las secciones">{sections.map(item=>{const Icon=icons[item.id];return <button type="button" key={item.id} aria-current={activeTab===item.id?'page':undefined} onClick={()=>navigate(item.id)}><Icon size={20}/><span>{item.label}</span></button>;})}</nav>
   <a href={restaurantMenuPath(operatingRestaurant)} target="_blank" rel="noopener noreferrer">Ver mi menú<ArrowUpRight size={18}/></a>
   <button type="button" className="portal-more-menu__logout" onClick={()=>void onLogout()}><LogOut size={18}/>Cerrar sesión</button>
  </dialog>
 </div>;
}
