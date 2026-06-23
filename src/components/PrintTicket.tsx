import type { Restaurante } from '../lib/supabase'

interface TicketItem {
  nombre: string
  cantidad: number
  precio: number
  opciones?: string
}

interface PrintTicketProps {
  restaurante: Restaurante
  pedido: {
    id: string
    clienteNombre: string
    clienteTel?: string
    clienteDireccion?: string
    items: TicketItem[]
    subtotal: number
    descuento?: number
    total: number
    notas?: string
    created_at?: string
    tipo?: string
  }
}

export function PrintTicket({ restaurante, pedido }: PrintTicketProps) {
  const fecha = pedido.created_at
    ? new Date(pedido.created_at).toLocaleString('es-MX', { timeZone: 'America/Mexico_City', dateStyle: 'short', timeStyle: 'short' })
    : new Date().toLocaleString('es-MX', { timeZone: 'America/Mexico_City', dateStyle: 'short', timeStyle: 'short' })

  return (
    <div id="print-ticket" className="hidden print:block font-mono text-sm w-full max-w-[300px] mx-auto p-2">
      {/* Header */}
      <div className="text-center mb-3 border-b-2 border-dashed border-black pb-3">
        {restaurante.logo_url && (
          <img src={restaurante.logo_url} alt="Logo" className="w-16 h-16 object-contain mx-auto mb-2" />
        )}
        <p className="font-bold text-lg uppercase tracking-wider">{restaurante.nombre}</p>
        {restaurante.telefono && <p className="text-xs">Tel: {restaurante.telefono}</p>}
        {restaurante.direccion && <p className="text-xs">{restaurante.direccion}</p>}
      </div>

      {/* Datos del pedido */}
      <div className="border-b border-dashed border-black pb-2 mb-2">
        <p className="text-xs"><strong>Pedido #:</strong> {pedido.id.slice(-8).toUpperCase()}</p>
        <p className="text-xs"><strong>Fecha:</strong> {fecha}</p>
        {pedido.tipo && <p className="text-xs"><strong>Tipo:</strong> {pedido.tipo === 'restaurante_delivery' ? 'Delivery' : pedido.tipo}</p>}
      </div>

      {/* Cliente */}
      <div className="border-b border-dashed border-black pb-2 mb-2">
        <p className="text-xs font-bold uppercase">Cliente</p>
        <p className="text-xs">{pedido.clienteNombre}</p>
        {pedido.clienteTel && <p className="text-xs">Tel: {pedido.clienteTel}</p>}
        {pedido.clienteDireccion && <p className="text-xs">Dir: {pedido.clienteDireccion}</p>}
      </div>

      {/* Items */}
      <div className="border-b border-dashed border-black pb-2 mb-2">
        <p className="text-xs font-bold uppercase mb-1">Productos</p>
        {pedido.items.map((item, i) => (
          <div key={i} className="mb-1">
            <div className="flex justify-between">
              <span className="text-xs">{item.cantidad}x {item.nombre}</span>
              <span className="text-xs">${(item.precio * item.cantidad).toFixed(2)}</span>
            </div>
            {item.opciones && (
              <p className="text-[10px] text-gray-600 ml-3">{item.opciones}</p>
            )}
          </div>
        ))}
      </div>

      {/* Totales */}
      <div className="border-b border-dashed border-black pb-2 mb-2">
        <div className="flex justify-between text-xs">
          <span>Subtotal</span>
          <span>${pedido.subtotal.toFixed(2)}</span>
        </div>
        {pedido.descuento && pedido.descuento > 0 && (
          <div className="flex justify-between text-xs text-green-700">
            <span>Descuento</span>
            <span>-${pedido.descuento.toFixed(2)}</span>
          </div>
        )}
        <div className="flex justify-between font-bold text-sm mt-1">
          <span>TOTAL</span>
          <span>${pedido.total.toFixed(2)}</span>
        </div>
      </div>

      {/* Notas */}
      {pedido.notas && (
        <div className="border-b border-dashed border-black pb-2 mb-2">
          <p className="text-xs font-bold uppercase">Notas</p>
          <p className="text-xs">{pedido.notas}</p>
        </div>
      )}

      {/* Footer */}
      <div className="text-center mt-3">
        <p className="text-xs">¡Gracias por su preferencia!</p>
        <p className="text-[10px] text-gray-500 mt-1">Powered by Estrella Delivery</p>
      </div>
    </div>
  )
}

/**
 * Util para imprimir un ticket desde cualquier componente.
 * Llama a window.print() que activa el CSS @media print.
 */
export function printTicket() {
  window.print()
}
