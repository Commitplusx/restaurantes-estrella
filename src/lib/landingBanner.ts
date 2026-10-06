export interface LandingBanner {
  id: string;
  titulo: string;
  imagen_url: string;
  subtitulo?: string | null;
  link_url?: string | null;
}

export function isLandingBanner(value: unknown): value is LandingBanner {
  if (typeof value !== 'object' || value === null) return false;
  return 'id' in value && typeof value.id === 'string' && value.id.trim().length > 0
    && 'titulo' in value && typeof value.titulo === 'string'
    && 'imagen_url' in value && typeof value.imagen_url === 'string' && value.imagen_url.trim().length > 0
    && (!('subtitulo' in value) || value.subtitulo == null || typeof value.subtitulo === 'string')
    && (!('link_url' in value) || value.link_url == null || typeof value.link_url === 'string');
}
