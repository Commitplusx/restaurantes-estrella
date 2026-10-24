import { Star, Heart, ShieldCheck, Wallet, Percent, TrendingUp, ArrowUpRight } from 'lucide-react';
import { PublicInfoLayout, PublicInfoLink } from '../components/PublicInfoLayout';

const beneficios = [
  { icon: Percent, titulo: 'Precios del menú', descripcion: 'Los mismos precios que en el menú del restaurante, sin cargos ocultos ni aumentos en los platillos.' },
  { icon: Wallet, titulo: 'Billetera VIP', descripcion: 'Cada pedido suma saldo a tu cuenta. Puedes usarlo para pagar envíos o próximos pedidos.' },
  { icon: TrendingUp, titulo: 'Promociones', descripcion: 'Consulta los descuentos y combos que ofrece cada restaurante.' },
  { icon: Heart, titulo: 'Negocios de aquí', descripcion: 'Al pedir aquí, apoyas a restaurantes y repartidores de tu comunidad.' },
  { icon: ShieldCheck, titulo: 'Ayuda por WhatsApp', descripcion: 'Escríbenos si necesitas ayuda con tu pedido. Te atiende nuestro equipo.' },
  { icon: Star, titulo: 'Invita y gana', descripcion: 'Comparte tu código VIP con un amigo. Ambos reciben beneficios al momento.' },
];

export function BeneficiosPage() {
  return <PublicInfoLayout>
    <div className="info-intro benefits-intro">
      <h1>Pedir aquí tiene<br />sus ventajas.</h1>
      <p>Revisa las promociones y los beneficios que puedes usar al pedir.</p>
    </div>
    <div className="benefits-list">
      {beneficios.map(({ icon: Icon, titulo, descripcion }) => <section className="benefit-item" key={titulo}>
        <Icon size={24} strokeWidth={1.7} aria-hidden="true" />
        <div><h2>{titulo}</h2><p>{descripcion}</p></div>
      </section>)}
    </div>
    <section className="benefits-next" aria-labelledby="benefits-next-title">
      <div><h2 id="benefits-next-title">¿Qué se te antoja hoy?</h2><p>Encuentra un restaurante y consulta su menú.</p></div>
      <PublicInfoLink to="/#eats-desktop-categories" className="info-primary">Ver restaurantes<ArrowUpRight size={18} aria-hidden="true" /></PublicInfoLink>
    </section>
  </PublicInfoLayout>;
}
