export type CartItemOption = {
  opcion_id: string;
  opcion: string;
  grupo_id: string;
  grupo: string;
  precio_extra: number;
};

export type CartItem = {
  cartItemId?: string;
  id: string;
  nombre: string;
  precio: number;
  tipo: 'item' | 'combo' | 'promo';
  foto_url?: string;
  opcionesSeleccionadas?: CartItemOption[];
  aplica_subsidio?: boolean;
};

export type CheckoutStep = 1 | 2 | 3 | 4;
export type DeliveryType = 'domicilio' | 'tienda' | null;
