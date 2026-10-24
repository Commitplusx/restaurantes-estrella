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
  return <img {...props} src={current} loading={loading} decoding={decoding} onError={event => {
    if (current !== src) setFailedVariant(optimized);
    else onError?.(event);
  }} />;
}
