export type PortalTab = 'dashboard'|'pedidos'|'envios'|'productos'|'combos'|'promos'|'cupones'|'sucursales'|'perfil';
export const portalSections: ReadonlyArray<{id:PortalTab;label:string;description:string;group:'operate'|'menu'|'settings'}> = [
 {id:'dashboard',label:'Inicio',description:'Tu restaurante, al día.',group:'operate'},
 {id:'pedidos',label:'Pedidos',description:'Recibe, prepara y entrega cada pedido.',group:'operate'},
 {id:'envios',label:'Solicitar envío',description:'De tu sucursal a la puerta del cliente.',group:'operate'},
 {id:'productos',label:'Platillos',description:'Lo que tus clientes pueden pedir.',group:'menu'},
 {id:'combos',label:'Combos',description:'Productos que van mejor juntos.',group:'menu'},
 {id:'promos',label:'Promociones',description:'Tus ofertas, con sus propias reglas.',group:'menu'},
 {id:'cupones',label:'Cupones',description:'Descuentos para compartir.',group:'menu'},
 {id:'sucursales',label:'Sucursales',description:'Una marca, un acceso para cada ubicación.',group:'settings'},
 {id:'perfil',label:'Perfil del negocio',description:'Información, ubicación y horarios.',group:'settings'},
];
export function availablePortalSections(isBranch:boolean,deliveryEnabled:boolean) {
 return portalSections.filter(item=>(item.id!=='sucursales'||!isBranch)&&(item.id!=='envios'||deliveryEnabled));
}
export function mobilePortalTabs(isBranch:boolean,deliveryEnabled:boolean):PortalTab[] {
 return ['dashboard','pedidos',deliveryEnabled?'envios':'productos',!isBranch?'sucursales':deliveryEnabled?'productos':'promos'];
}
