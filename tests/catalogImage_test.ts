import { catalogImageUrl } from '../src/lib/catalogImage.ts';
const project = 'https://catalogue.supabase.co';
const original = project + '/storage/v1/object/public/menu-fotos/logo.webp';
function assert(value: unknown): asserts value { if (!value) throw new Error('Expected condition'); }
Deno.test('catalogue images use bounded shared variants without cropping or removing version parameters', () => {
  const card = new URL(catalogImageUrl(original + '?v=42', project));
  assert(card.pathname === '/storage/v1/render/image/public/menu-fotos/logo.webp');
  assert(card.searchParams.get('width') === '480' && card.searchParams.get('height') === '480');
  assert(card.searchParams.get('resize') === 'contain' && card.searchParams.get('quality') === '82');
  assert(card.searchParams.get('v') === '42');
  const banner = new URL(catalogImageUrl(original.replace('menu-fotos', 'publicidad'), project, 'banner'));
  assert(banner.searchParams.get('width') === '960' && banner.searchParams.get('height') === '600');
  assert(new URL(catalogImageUrl(original, project, 'product')).searchParams.get('width') === '900');
});
Deno.test('private, signed, foreign, non-HTTPS and non-catalogue image URLs are never rewritten', () => {
  const unchanged = [
    '/categorias/pollo.webp', 'dynamic-gradient', 'not a URL',
    original.replace('catalogue.supabase.co', 'other.supabase.co'),
    original.replace('https:', 'http:'),
    original.replace('/public/', '/sign/') + '?token=private',
    original + '?token=private', original.replace('menu-fotos', 'customer-files'),
    original.replace('https://', 'https://user:password@'),
  ];
  for (const source of unchanged) assert(catalogImageUrl(source, project) === source);
});
