import { Star, Heart, ShieldCheck, Wallet, Percent, TrendingUp, ArrowUpRight } from 'lucide-react';
import { PublicInfoLayout, PublicInfoLink } from '../components/PublicInfoLayout';

const beneficios = [
  { icon: Percent, titulo: 'Precios Reales', descripcion: 'En Estrella Eats encuentras los mismos precios que en el menú físico. Sin tarifas ocultas ni platillos inflados.' },
  { icon: Wallet, titulo: 'Billetera VIP', descripcion: 'Cada pedido suma saldo real a tu cuenta. Úsalo para cubrir tus envíos o pagar tus próximos antojos.' },
  { icon: TrendingUp, titulo: 'Promos Exclusivas', descripcion: 'Descuentos y combos únicos directamente de tus restaurantes favoritos, pensados especialmente para ti.' },
  { icon: Heart, titulo: 'Apoyo Local', descripcion: 'Cada pedido impulsa a emprendedores y repartidores de tu comunidad, fortaleciendo nuestra economía.' },
  { icon: ShieldCheck, titulo: 'Atención Cercana', descripcion: 'Olvídate de las respuestas automáticas. Nuestro equipo te atiende personalmente por WhatsApp.' },
  { icon: Star, titulo: 'Invita y Gana', descripcion: 'Comparte tu código VIP con amigos y ambos recibirán beneficios inmediatos en sus cuentas.' },
];

export function BeneficiosPage() {
  return <PublicInfoLayout>
    <div className="info-intro benefits-intro">
      <h1>Pedir aquí tiene<br />sus ventajas.</h1>
      <p>Conoce las opciones y beneficios de Estrella Eats antes de hacer tu próximo pedido.</p>
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
