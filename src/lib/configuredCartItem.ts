import type { CartItem, CartItemOption } from '../types';
import { validateOptionSelection } from './menuOptions';
import type { OpcionGrupo, OptionSelection } from './menuOptions';

export type ConfigurableProduct = Omit<CartItem, 'cartItemId' | 'opcionesSeleccionadas'>;

export function configuredCartItem(product: ConfigurableProduct, groups: OpcionGrupo[], selection: OptionSelection): CartItem {
  if (!product.id || !product.nombre.trim() || !Number.isFinite(product.precio) || product.precio < 0) {
    throw new Error('El precio de este producto cambió. Cierra y vuelve a abrirlo.');
  }
  const error = validateOptionSelection(groups, selection);
  if (error) throw new Error(error);
  const options: CartItemOption[] = groups.flatMap(group => group.opciones
    .filter(option => selection[group.titulo]?.[option.nombre])
    .map(option => ({ grupo_id: group.id || group.titulo, grupo: group.titulo,
      opcion_id: option.id || option.nombre, opcion: option.nombre, precio_extra: option.precio_extra ?? 0,
      ...(option.menu_item_id ? { menu_item_id: option.menu_item_id } : {}),
    })));
  if (options.some(option => !Number.isFinite(option.precio_extra) || option.precio_extra < 0)) {
    throw new Error('El precio de una opción cambió. Cierra y vuelve a abrir el producto.');
  }
  const price = product.precio + options.reduce((sum, option) => sum + option.precio_extra, 0);
  if (!Number.isFinite(price)) throw new Error('No pudimos calcular el precio. Vuelve a abrir el producto.');
  return { ...product, cartItemId: product.id + '_' + options.map(option => `${option.grupo}:${option.menu_item_id || option.opcion}`).sort().join('_'),
    precio: price, opcionesSeleccionadas: options };
}
