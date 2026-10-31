import type { Metadata } from 'next';
import { Noto_Serif_TC } from 'next/font/google';
import './globals.css';
import { getSiteUrl, getSiteUrlMetadataBase } from '@/lib/site-url';

const utoaSerif = Noto_Serif_TC({
  subsets: ['latin'],
  weight: ['300', '400', '600', '700'],
  display: 'swap',
  variable: '--font-utoa-serif',
});

const SITE_URL = getSiteUrl();
const OG_IMAGE_PATH = '/assets/og-camera.svg';

export const metadata: Metadata = {
  metadataBase: getSiteUrlMetadataBase(),
  title: 'UTOA Photography',
  description: 'Moments In Focus',
  openGraph: {
    title: 'UTOA Photography',
    description: 'Moments In Focus',
    url: SITE_URL,
    siteName: 'UTOA Photography',
    type: 'website',
    images: [
      {
        url: OG_IMAGE_PATH,
        width: 980,
        height: 901,
        alt: 'UTOA camera wireframe illustration',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'UTOA Photography',
    description: 'Moments In Focus',
    images: [OG_IMAGE_PATH],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-Hant">
      <body className={`${utoaSerif.variable} antialiased`} style={{ overscrollBehaviorX: 'auto' }}>
        {/* 平滑滾動與前導 Loader 由前台 layout 的 SiteProviders 掛載，後台不載入 */}
        {children}
      </body>
    </html>
  );
}
