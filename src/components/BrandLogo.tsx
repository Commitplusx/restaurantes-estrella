import './BrandLogo.css';

export function BrandLogo({ variant = 'wordmark', className = '', decorative = false }: {
  variant?: 'wordmark' | 'mark';
  className?: string;
  decorative?: boolean;
}) {
  const mark = variant === 'mark';
  return <span className={`eats-brand-logo${mark ? ' eats-brand-logo--mark' : ''} ${className}`}>
    <img className="eats-brand-logo-image" src={mark ? '/brand/estrella-mark-v2-192.png' : '/brand/estrella-eats-v2-360.webp'}
      srcSet={mark ? undefined : '/brand/estrella-eats-v2-360.webp 360w, /brand/estrella-eats-v2-720.webp 720w'}
      sizes={mark ? undefined : '(max-width: 640px) 160px, 188px'} width={mark ? 192 : 360} height={mark ? 192 : 120}
      alt={decorative ? '' : 'Estrella Eats'} decoding="async" />
  </span>;
}
