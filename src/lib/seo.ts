import type { Metadata } from 'next';

interface SEOData {
  title: string;
  description: string;
  images?: {
    url: string;
    width: number;
    height: number;
    alt: string;
  }[];
  url?: string;
  type?: 'website' | 'article';
  publishedTime?: string;
  modifiedTime?: string;
}

export function generateSEOMetadata(data: SEOData): Metadata {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://utoa.studio';
  const fallbackImage = {
    url: `${baseUrl}/assets/og-camera.svg`,
    width: 980,
    height: 901,
    alt: 'UTOA camera wireframe illustration',
  };

  type SEOImage = NonNullable<SEOData['images']>[number];
  const normalizeImage = (img: SEOImage) => ({
    url: img.url.startsWith('http') ? img.url : `${baseUrl}${img.url}`,
    width: img.width,
    height: img.height,
    alt: img.alt,
  });

  const ogImages =
    Array.isArray(data.images) && data.images.length > 0
      ? data.images.map(normalizeImage)
      : [fallbackImage];
  
  return {
    title: data.title,
    description: data.description,
    
    // Open Graph
    openGraph: {
      title: data.title,
      description: data.description,
      url: data.url ? `${baseUrl}${data.url}` : baseUrl,
      siteName: 'UTOA Photography',
      type: data.type || 'website',
      images: ogImages,
      ...(data.publishedTime && { publishedTime: data.publishedTime }),
      ...(data.modifiedTime && { modifiedTime: data.modifiedTime }),
    },
    
    // Twitter Card
    twitter: {
      card: 'summary_large_image',
      title: data.title,
      description: data.description,
      creator: '@utoa_photo',
      images: ogImages.length > 0 ? ogImages[0].url : '',
    },
    
    // Additional meta tags
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-video-preview': -1,
        'max-image-preview': 'large',
        'max-snippet': -1,
      },
    },
    
    // Verification tags (add your verification codes)
    verification: {
      google: process.env.GOOGLE_VERIFICATION,
      yandex: process.env.YANDEX_VERIFICATION,
      yahoo: process.env.YAHOO_VERIFICATION,
    },
  };
}

export function generateStructuredData(type: 'website' | 'collection' | 'imageGallery', data: any) {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://utoa.studio';
  
  switch (type) {
    case 'website':
      return {
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        name: 'UTOA Photography',
        description: 'Moments In Focus',
        url: baseUrl,
        author: {
          '@type': 'Person',
          name: 'UTOA',
        },
        sameAs: [
          // Add social media URLs
        ],
      };
      
    case 'collection':
      return {
        '@context': 'https://schema.org',
        '@type': 'PhotographCollection',
        name: data.title,
        description: data.description,
        url: `${baseUrl}${data.url}`,
        author: {
          '@type': 'Person',
          name: 'UTOA',
        },
        datePublished: data.publishedAt,
        ...(data.coverImage && {
          image: {
            '@type': 'ImageObject',
            url: data.coverImage.url,
            width: data.coverImage.width,
            height: data.coverImage.height,
            caption: data.coverImage.alt,
          },
        }),
      };
      
    case 'imageGallery':
      return {
        '@context': 'https://schema.org',
        '@type': 'ImageGallery',
        name: data.title,
        description: data.description,
        url: `${baseUrl}${data.url}`,
        author: {
          '@type': 'Person',
          name: 'UTOA',
        },
        associatedMedia: data.images.map((image: any) => ({
          '@type': 'ImageObject',
          contentUrl: image.url,
          width: image.width,
          height: image.height,
          caption: image.caption || image.alt,
        })),
      };
      
    default:
      return null;
  }
}

export function generateSitemap() {
  // This would typically be generated from your data
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://utoa.studio';
  
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${baseUrl}</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <priority>1.0</priority>
  </url>
</urlset>`;
}
