import { LegalDocument, type LegalSection } from '../components/PublicInfoLayout'

export function TermsPage() {
  const sections: readonly LegalSection[] = [
    {
      id: 1,
      title: 'Aceptación de los Términos',
      content: 'Al acceder y utilizar la plataforma Estrella Eats (en adelante "La Plataforma"), usted acepta estar sujeto a estos Términos y Condiciones. Si no está de acuerdo con alguna parte de los términos, no podrá utilizar nuestros servicios.'
    },
    {
      id: 2,
      title: 'Descripción del Servicio',
      content: 'Estrella Eats funciona como una plataforma tecnológica que conecta a usuarios consumidores con restaurantes locales, permitiendo la visualización de menús, realización de pedidos, y un sistema de recompensas (Programa de Lealtad). La Plataforma actúa únicamente como intermediario tecnológico.'
    },
    {
      id: 3,
      title: 'Cuentas de Usuario',
      bullets: [
        'Para utilizar ciertas funciones, debe registrarse utilizando un número de teléfono celular válido.',
        'Usted es responsable de mantener la confidencialidad de su cuenta y contraseña (OTP o método de autenticación).',
        'La Plataforma se reserva el derecho de suspender o cancelar cuentas que violen estos términos, realicen pedidos falsos o incurran en comportamientos fraudulentos.'
      ]
    },
    {
      id: 4,
      title: 'Pedidos y Entregas',
      bullets: [
        'Disponibilidad: Todos los pedidos están sujetos a la disponibilidad del restaurante y a sus horarios de operación.',
        'Precios: Los precios mostrados en La Plataforma incluyen impuestos aplicables, pero pueden no incluir los costos de envío.',
        'Tiempos: Los tiempos de entrega son estimados y pueden variar debido a factores externos (tráfico, clima, saturación del restaurante).',
        'Cancelaciones: El restaurante se reserva el derecho de cancelar un pedido si los artículos no están disponibles. No se realizará ningún cargo al cliente.'
      ]
    },
    {
      id: 5,
      title: 'Pagos en Línea, Reembolsos y Contracargos',
      content: 'Estrella Eats actúa únicamente como un intermediario tecnológico. Los pagos realizados mediante tarjetas de crédito o débito son procesados directamente por la pasarela de Mercado Pago. Al utilizar este método de pago, usted acepta que:',
      bullets: [
        'Responsabilidad de Reembolsos: Cualquier solicitud de reembolso por productos en mal estado, faltantes o demoras extremas deberá gestionarse de forma directa y exclusiva con el Restaurante que preparó la comida. Estrella Eats no emite reembolsos desde sus propios fondos.',
        'Contracargos y Fraude: El riesgo de fraude por contracargos bancarios (chargebacks) es asumido en su totalidad por el Restaurante asociado que recibe los fondos de la venta. Estrella Eats no ofrece seguro contra fraudes financieros.',
        'Disponibilidad del Servicio: Estrella Eats no se hace responsable por transacciones fallidas, cobros duplicados o caídas del sistema imputables a Mercado Pago o a la institución bancaria del usuario.'
      ]
    },
    {
      id: 6,
      title: 'Programa de Lealtad (Estrellas)',
      content: 'La Plataforma ofrece un programa de lealtad donde los usuarios pueden acumular puntos ("Estrellas") por sus compras:',
      bullets: [
        'Las Estrellas no tienen valor monetario en efectivo y no pueden ser intercambiadas por dinero.',
        'La tasa de acumulación y redención de Estrellas puede ser modificada por La Plataforma en cualquier momento sin previo aviso.',
        'Las Estrellas están vinculadas a la cuenta del usuario y son intransferibles.'
      ]
    },
    {
      id: 7,
      title: 'Responsabilidad',
      content: 'La preparación de los alimentos, su calidad y el cumplimiento de las normas de salubridad son responsabilidad exclusiva de cada restaurante asociado. Estrella Eats no se hace responsable por problemas de salud, alergias o cualquier daño derivado del consumo de los alimentos adquiridos a través de la plataforma.'
    },
    {
      id: 8,
      title: 'Modificaciones',
      content: 'Nos reservamos el derecho de modificar o reemplazar estos Términos en cualquier momento. El uso continuo de la plataforma después de cualquier cambio constituye su aceptación de los nuevos Términos.'
    },
    {
      id: 9,
      title: 'Contacto',
      content: 'Si tiene alguna pregunta sobre estos Términos, por favor contacte a nuestro equipo de soporte técnico a través de los canales oficiales.'
    }
  ]

  return <LegalDocument
    title="Términos y Condiciones"
    description="Consulta las condiciones de uso de Estrella Eats, los pedidos y las entregas."
    effective="Vigentes a partir de julio de 2026"
    sections={sections}
  />;
}
