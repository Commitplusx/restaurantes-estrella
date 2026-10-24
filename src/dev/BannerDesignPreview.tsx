import { Link, useSearchParams } from 'react-router-dom';
import { MobileLandingCarousel } from '../components/MobileLandingCarousel';
import type { LandingBanner } from '../lib/landingBanner';
import { landingBanners } from '../lib/publicLandingCatalog';
import { usePublicResource } from '../hooks/usePublicResource';
import { useNoticeSlot } from '../hooks/useNoticeSlot';
import '../components/desktopLanding.css';

const samples: LandingBanner[] = [
  { id: 'sample-wide', titulo: 'Muestra horizontal', imagen_url: new URL('./banner-ratio.svg', import.meta.url).href, link_url: '/', subtitulo: 'Arte local, sin promoción comercial.' },
  { id: 'sample-portrait', titulo: 'Muestra vertical', imagen_url: '/desktop/comitan-table-900.webp', link_url: '/', subtitulo: 'La imagen se muestra completa.' },
  { id: 'sample-text', titulo: 'Tu anuncio aquí', imagen_url: 'dynamic-gradient', link_url: '/', subtitulo: 'Ejemplo local de banner sin fotografía.' },
  { id: 'sample-wide-two', titulo: 'Otra muestra horizontal', imagen_url: new URL('./banner-ratio.svg', import.meta.url).href, link_url: '/' },
  { id: 'sample-portrait-two', titulo: 'Un título largo para comprobar el espacio disponible en pantallas pequeñas', imagen_url: '/desktop/comitan-table-900.webp', link_url: '/' },
];
function RealBanners() {
  const query = usePublicResource(landingBanners);
  return <>{query.error && <p role="alert">No pudimos consultar los banners. <button onClick={query.refresh}>Reintentar</button></p>}
    <MobileLandingCarousel banners={query.data || []} /></>;
}
/** DEV only: inspect real campaigns or explicitly labelled samples without changing the catalogue. */
export default function BannerDesignPreview() {
  const [params] = useSearchParams();
  const mode = params.get('muestra');
  useNoticeSlot('banner-design', true, 1000);
  const demo = mode === 'varios' ? samples : mode === 'vertical' ? [samples[1]] : mode === 'texto' ? [samples[2]] : mode === 'vacio' ? [] : null;
  return <main className="eats-landing min-h-screen bg-white text-[#1d1d1f]"><div className="max-w-xl mx-auto px-5 py-7">
    <Link to="/" className="inline-flex min-h-11 items-center underline">Volver al inicio</Link>
    <h1 className="text-2xl font-bold mt-4">Banners · vista local</h1>
    <p className="text-sm text-[#515154] mt-2">Pruebas de formato. Las muestras no son promociones publicadas.</p>
    <nav aria-label="Escenario de banners" className="flex flex-wrap gap-x-4 mb-5 mt-3 text-sm underline">{[['Reales', ''], ['Varios', 'varios'], ['Vertical', 'vertical'], ['Texto', 'texto'], ['Sin banners', 'vacio']].map(([title, value]) => <Link className="min-h-11 inline-flex items-center" key={title} to={`/banners${value ? `?muestra=${value}` : ''}`}>{title}</Link>)}</nav>
    <div className="eats-hero-visual">{demo === null ? <RealBanners /> : <MobileLandingCarousel banners={demo} />}</div>
    <p className="text-sm text-[#515154] mt-6">Formato recomendado para nuevos artes: 1600 × 900 px. Conserva precios y textos alejados del borde.</p>
  </div></main>;
}
