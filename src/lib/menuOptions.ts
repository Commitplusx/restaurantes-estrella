export interface OpcionItem {
  id?: string;
  nombre: string;
  precio_extra: number;
  menu_item_id?: string;
}

export interface OpcionGrupo {
  id?: string;
  titulo: string;
  requerido: boolean;
  maximo_selecciones: number;
  opciones: OpcionItem[];
}

export interface MenuOptionProduct {
  id: string;
  restaurante_id: string;
  nombre: string;
  precio: number;
  disponible: boolean;
  agotado_hoy?: boolean;
  activo?: boolean;
}

export type OptionSelection = Record<string, Record<string, boolean>>;

export function parseMenuOptionProducts(value: unknown, restaurantId: string): MenuOptionProduct[] {
  if (!Array.isArray(value)) throw new Error('No se pudo leer el menú del restaurante.');
  return value.map((row: unknown) => {
    if (typeof row !== 'object' || row === null
      || !('id' in row) || typeof row.id !== 'string'
      || !('restaurante_id' in row) || row.restaurante_id !== restaurantId
      || !('nombre' in row) || typeof row.nombre !== 'string' || !row.nombre.trim()
      || !('precio' in row) || typeof row.precio !== 'number' || !Number.isFinite(row.precio) || row.precio < 0
      || !('disponible' in row) || typeof row.disponible !== 'boolean') {
      throw new Error('El menú contiene un producto inválido. Recarga antes de continuar.');
    }
    return { id: row.id, restaurante_id: restaurantId, nombre: row.nombre, precio: row.precio, disponible: row.disponible,
      ...('agotado_hoy' in row && typeof row.agotado_hoy === 'boolean' ? { agotado_hoy: row.agotado_hoy } : {}),
      ...('activo' in row && typeof row.activo === 'boolean' ? { activo: row.activo } : {}),
    };
  });
}

export function optionFromMenu(product: MenuOptionProduct): OpcionItem {
  return { menu_item_id: product.id, nombre: product.nombre, precio_extra: 0 };
}

export function validateOptionGroups(groups: OpcionGrupo[], products?: MenuOptionProduct[], restaurantId?: string): string | null {
  const titles = new Set<string>();
  for (const [index, group] of groups.entries()) {
    if (!group.titulo.trim()) return `El grupo ${index + 1} necesita un nombre.`;
    if (titles.has(group.titulo.trim())) return 'Cada grupo debe tener un nombre distinto.';
    titles.add(group.titulo.trim());
    if (!group.opciones.length) return `Agrega al menos una opción a “${group.titulo}”.`;
    if (!Number.isInteger(group.maximo_selecciones) || group.maximo_selecciones < 1) return `Revisa el límite de “${group.titulo}”.`;
    const names = new Set<string>();
    const references = new Set<string>();
    for (const option of group.opciones) {
      if (!option.nombre.trim() || names.has(option.nombre.trim())) return `Las opciones de “${group.titulo}” necesitan nombres distintos.`;
      names.add(option.nombre.trim());
      if (!Number.isFinite(option.precio_extra) || option.precio_extra < 0) return `Revisa el precio de “${option.nombre}”.`;
      if (option.menu_item_id) {
        const product = products?.find(item => item.id === option.menu_item_id && item.restaurante_id === restaurantId);
        if (!product) return `“${option.nombre}” ya no pertenece a este menú. Vuelve a seleccionarlo.`;
        if (references.has(option.menu_item_id)) return `“${option.nombre}” está repetido en el mismo grupo.`;
        references.add(option.menu_item_id);
        if (option.nombre !== product.nombre) return `Actualiza “${option.nombre}” desde el menú antes de guardar.`;
      }
    }
  }
  return null;
}

export function availableOptionGroups(groups: OpcionGrupo[], products: MenuOptionProduct[], restaurantId: string): OpcionGrupo[] {
  const availableIds = new Set(products.filter(product => product.restaurante_id === restaurantId && product.disponible && !product.agotado_hoy && product.activo !== false).map(product => product.id));
  return groups.map(group => ({ ...group, opciones: group.opciones.filter(option => !option.menu_item_id || availableIds.has(option.menu_item_id)) }));
}

export function validateOptionSelection(groups: OpcionGrupo[], selections: OptionSelection): string | null {
  for (const group of groups) {
    const chosen = Object.entries(selections[group.titulo] || {}).filter(([, selected]) => selected).map(([name]) => name);
    if (chosen.some(name => !group.opciones.some(option => option.nombre === name))) return `Una selección de “${group.titulo}” ya no está disponible.`;
    if (group.requerido && chosen.length === 0) return `Elige una opción en “${group.titulo}”.`;
    if (chosen.length > group.maximo_selecciones) return `Revisa las selecciones de “${group.titulo}”.`;
  }
  if (Object.keys(selections).some(title => !groups.some(group => group.titulo === title))) return 'Las opciones cambiaron. Vuelve a elegir los productos.';
  return null;
}
