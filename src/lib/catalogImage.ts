export type CatalogImageSize = 'card' | 'banner';
const SIZES = { card: [480, 480], banner: [960, 600] } as const;

/** Two shared variants, public catalogue buckets only; never rewrite signed/private URLs. */
export function catalogImageUrl(source: string, projectUrl: string, size: CatalogImageSize = 'card'): string {
  try {
    const url = new URL(source);
    const project = new URL(projectUrl);
    const prefix = '/storage/v1/object/public/';
    if (url.origin !== project.origin || url.protocol !== 'https:' || url.username || url.password
      || !url.pathname.startsWith(prefix) || url.searchParams.has('token')) return source;
    const bucket = url.pathname.slice(prefix.length).split('/')[0];
    if (!['menu-fotos', 'publicidad'].includes(bucket)) return source;
    const [width, height] = SIZES[size];
    url.pathname = url.pathname.replace(prefix, '/storage/v1/render/image/public/');
    url.searchParams.set('width', String(width));
    url.searchParams.set('height', String(height));
    url.searchParams.set('resize', 'contain');
    url.searchParams.set('quality', '82');
    return url.href;
  } catch { return source; }
}
