import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { CartItem, CheckoutStep, DeliveryType } from '../types'

interface CartStore {
  // Estado
  carrito: { item: CartItem; cantidad: number }[];
  isCartOpen: boolean;
  checkoutStep: CheckoutStep;
  tipoEntrega: DeliveryType;
  direccionEntrega: string;
  clienteNombre: string;
  clienteTel: string;
  metodoPago: string;
  cuponCliente: string;
  descuento: number;
  cuponValido: boolean;

  // Acciones
  setIsCartOpen: (isOpen: boolean) => void;
  setCheckoutStep: (step: CheckoutStep) => void;
  setTipoEntrega: (tipo: DeliveryType) => void;
  setDireccionEntrega: (direccion: string) => void;
  setClienteNombre: (nombre: string) => void;
  setClienteTel: (tel: string) => void;
  setMetodoPago: (metodo: string) => void;
  setCuponCliente: (cupon: string) => void;
  setDescuento: (descuento: number) => void;
  setCuponValido: (valido: boolean) => void;

  addToCart: (item: CartItem) => void;
  removeFromCart: (cartItemId?: string) => void;
  clearCart: () => void;
}

export const useCartStore = create<CartStore>()(
  persist(
    (set) => ({
      carrito: [],
      isCartOpen: false,
      checkoutStep: 1,
      tipoEntrega: null,
      direccionEntrega: '',
      clienteNombre: '',
      clienteTel: '',
      metodoPago: 'efectivo',
      cuponCliente: '',
      descuento: 0,
      cuponValido: false,

      setIsCartOpen: (isOpen) => set({ isCartOpen: isOpen }),
      setCheckoutStep: (step) => set({ checkoutStep: step }),
      setTipoEntrega: (tipo) => set({ tipoEntrega: tipo }),
      setDireccionEntrega: (direccion) => set({ direccionEntrega: direccion }),
      setClienteNombre: (nombre) => set({ clienteNombre: nombre }),
      setClienteTel: (tel) => set({ clienteTel: tel }),
      setMetodoPago: (metodo) => set({ metodoPago: metodo }),
      setCuponCliente: (cupon) => set({ cuponCliente: cupon }),
      setDescuento: (descuento) => set({ descuento: descuento }),
      setCuponValido: (valido) => set({ cuponValido: valido }),

      addToCart: (item) =>
        set((state) => {
          const itemKey = item.cartItemId || item.id;
          const existing = state.carrito.find((p) => (p.item.cartItemId || p.item.id) === itemKey);
          if (existing) {
            return {
              carrito: state.carrito.map((p) =>
                (p.item.cartItemId || p.item.id) === itemKey
                  ? { ...p, cantidad: p.cantidad + 1 }
                  : p
              ),
            };
          }
          return { carrito: [...state.carrito, { item, cantidad: 1 }] };
        }),

      removeFromCart: (cartItemId) =>
        set((state) => {
          if (!cartItemId) return state;
          const existing = state.carrito.find((p) => (p.item.cartItemId || p.item.id) === cartItemId);
          if (existing && existing.cantidad > 1) {
            return {
              carrito: state.carrito.map((p) =>
                (p.item.cartItemId || p.item.id) === cartItemId
                  ? { ...p, cantidad: p.cantidad - 1 }
                  : p
              ),
            };
          }
          return {
            carrito: state.carrito.filter((p) => (p.item.cartItemId || p.item.id) !== cartItemId),
            checkoutStep: state.carrito.length === 1 ? 1 : state.checkoutStep, // Regresar al paso 1 si se vacía
          };
        }),

      clearCart: () => set({ carrito: [], checkoutStep: 1, descuento: 0, cuponValido: false, cuponCliente: '' }),
    }),
    {
      name: 'estrella-cart-storage',
      partialize: (state) => ({
        carrito: state.carrito,
        checkoutStep: state.checkoutStep,
        tipoEntrega: state.tipoEntrega,
        direccionEntrega: state.direccionEntrega,
        clienteNombre: state.clienteNombre,
        clienteTel: state.clienteTel,
        metodoPago: state.metodoPago,
      }), // Solo persiste estos campos en localStorage
    }
  )
)
