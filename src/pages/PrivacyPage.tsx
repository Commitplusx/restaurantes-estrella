import { LegalDocument, type LegalSection } from '../components/PublicInfoLayout'

export function PrivacyPage() {
  const sections: readonly LegalSection[] = [
    {
      id: 1,
      title: 'Identidad y domicilio del Responsable',
      content: 'Estrella Eats (en adelante "La Plataforma"), con operaciones principales en Comitán de Domínguez, Chiapas, México, es el responsable del uso y protección de sus datos personales, y al respecto le informamos lo siguiente.'
    },
    {
      id: 2,
      title: 'Fines de uso de sus datos personales',
      content: 'Los datos personales que recabamos de usted, los utilizaremos para las siguientes finalidades necesarias:',
      bullets: [
        'Creación y gestión de su cuenta de usuario.',
        'Procesamiento, envío y entrega de sus pedidos de comida.',
        'Asignación, gestión y redención de puntos en nuestro Programa de Lealtad.',
        'Comunicación sobre el estado de sus pedidos y soporte al cliente.'
      ]
    },
    {
      id: 3,
      title: 'Datos personales requeridos',
      content: 'Para llevar a cabo las finalidades descritas, utilizaremos los siguientes datos personales:',
      bullets: [
        'Nombre completo.',
        'Número de teléfono celular (usado para inicio de sesión y contacto logístico).',
        'Dirección de entrega (incluyendo coordenadas GPS para optimizar las rutas).',
        'Historial de pedidos y preferencias de navegación dentro de la app.'
      ]
    },
    {
      id: 4,
      title: 'Procesamiento de Pagos en Línea',
      content: 'Al realizar transacciones en línea, los pagos son procesados de forma segura a través de nuestro socio comercial, Mercado Pago. Estrella Eats declara que:',
      bullets: [
        'NUNCA almacena, procesa ni tiene acceso a la información sensible de su tarjeta (como el PAN, CVV o fecha de vencimiento).',
        'Toda la información de su tarjeta de crédito o débito es ingresada directamente en la pasarela de Mercado Pago, la cual opera bajo sus propias estrictas políticas de privacidad y seguridad.',
        'Solo retenemos "metadatos" de la transacción (monto, fecha y números de recibo) exclusivamente para historial, conciliación y soporte técnico.'
      ]
    },
    {
      id: 5,
      title: 'Uso de Cookies y Rastreo',
      content: 'En nuestra página web utilizamos cookies o tecnologías similares. Estas nos permiten brindarle una experiencia fluida al mantener su sesión activa, guardar artículos en su carrito y recordar sus preferencias. Usted puede deshabilitar estas tecnologías desde su navegador, aunque algunas funciones podrían dejar de operar correctamente.'
    },
    {
      id: 6,
      title: 'Derechos ARCO (Acceso, Rectificación, Cancelación u Oposición)',
      content: 'Usted tiene derecho a conocer qué datos tenemos y cómo los usamos (Acceso); solicitar la corrección de información inexacta (Rectificación); pedir su eliminación de nuestros registros (Cancelación); o negarse a un uso específico (Oposición).',
      bullets: [
        'Para ejercer estos derechos, debe contactar a nuestro equipo de soporte mediante los canales oficiales.',
        'Procesaremos su solicitud en los tiempos estipulados por la ley aplicable.'
      ]
    },
    {
      id: 7,
      title: 'Cambios al Aviso de Privacidad',
      content: 'Este aviso puede sufrir modificaciones por requerimientos legales o cambios en nuestras prácticas. Nos comprometemos a mantenerlo informado publicando las versiones actualizadas en esta misma sección de la plataforma web.'
    }
  ]

  return <LegalDocument
    title="Aviso de Privacidad"
    description="Consulta cómo se utilizan y protegen tus datos en Estrella Eats."
    effective="Vigente a partir de julio de 2026"
    sections={sections}
  />;
}
