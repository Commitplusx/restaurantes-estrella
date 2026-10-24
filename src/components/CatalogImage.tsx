import { useState, type ImgHTMLAttributes } from 'react';
import { catalogImageUrl, type CatalogImageSize } from '../lib/catalogImage';

interface CatalogImageProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, 'src' | 'srcSet' | 'sizes'> {
  src: string;
  variant?: CatalogImageSize;
}

/** A failed transformation can try its original once, then the existing image error state. */
export function CatalogImage({ src, variant = 'card', onError, loading = 'lazy', decoding = 'async', ...props }: CatalogImageProps) {
  const optimized = catalogImageUrl(src, import.meta.env.VITE_SUPABASE_URL, variant);
  const [failedVariant, setFailedVariant] = useState<string | null>(null);
  const current = failedVariant === optimized ? src : optimized;
  const responsive = variant === 'product' && current !== src;
  return <img {...props} src={current} data-catalog-original={src}
    srcSet={responsive ? `${catalogImageUrl(src, import.meta.env.VITE_SUPABASE_URL, 'card')} 480w, ${optimized} 900w` : undefined}
    sizes={responsive ? '(max-width: 359px) 88px, (max-width: 639px) 112px, (max-width: 767px) calc(100vw - 40px), (max-width: 899px) 45vw, 440px' : undefined}
    loading={loading} decoding={decoding} onError={event => {
    if (current !== src) setFailedVariant(optimized);
    else onError?.(event);
  }} />;
}
