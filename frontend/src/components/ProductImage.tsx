import type { ImgHTMLAttributes } from 'react';

import hairFallback from '@/assets/category-hair.webp';
import perfumeFallback from '@/assets/category-perfume.webp';
import skincareFallback from '@/assets/category-skincare.webp';
import { cn } from '@/lib/utils';

const trustedImageHosts = [
  'amazonaws.com',
  'anexos.tiny.com.br',
  'cdn.shopify.com',
  'images.tcdn.com.br',
  'susercontent.com',
  'mlstatic.com',
  'media-amazon.com',
  'cloudinary.com',
  'vtexassets.com',
  'awsli.com.br',
  'simplo7.net',
  'bigcommerce.com',
  'magazord.com.br',
];

const matchesTrustedHost = (hostname: string) =>
  trustedImageHosts.some((host) => hostname === host || hostname.endsWith(`.${host}`));

export const safeProductImageUrl = (value: string | null) => {
  if (!value) return null;

  try {
    const url = new URL(value);
    if (!['http:', 'https:'].includes(url.protocol) || !matchesTrustedHost(url.hostname)) return null;
    url.protocol = 'https:';
    return url.toString();
  } catch {
    return null;
  }
};

export const categoryFallback = (category: string | null, name = '') => {
  const value = `${category ?? ''} ${name}`.toLocaleLowerCase('pt-BR');
  if (value.includes('perfume') || value.includes('fragrância')) return perfumeFallback;
  if (value.includes('skin') || value.includes('pele')) return skincareFallback;
  return hairFallback;
};

type ProductImageProps = Omit<ImgHTMLAttributes<HTMLImageElement>, 'src'> & {
  imageUrl: string | null;
  category: string | null;
  productName: string;
};

export const ProductImage = ({
  imageUrl,
  category,
  productName,
  className,
  alt = '',
  ...props
}: ProductImageProps) => {
  const fallback = categoryFallback(category, productName);
  const source = safeProductImageUrl(imageUrl) ?? fallback;

  return (
    <img
      {...props}
      src={source}
      alt={alt}
      className={cn('bg-zinc-100 object-cover dark:bg-zinc-900', className)}
      referrerPolicy="no-referrer"
      onError={(event) => {
        if (event.currentTarget.src !== fallback) event.currentTarget.src = fallback;
      }}
    />
  );
};
