import type { Metadata } from 'next';
import { Noto_Serif_TC } from 'next/font/google';
import './globals.css';
import { SmoothScroll } from '@/components/SmoothScroll';
import { SmoothScrollProvider } from '@/components/providers/SmoothScrollProvider';
import { LoaderStateProvider } from '@/components/providers/LoaderStateProvider';
import LoaderClient from './loader-client';

const utoaSerif = Noto_Serif_TC({
  subsets: ['latin'],
  weight: ['300', '400', '600', '700'],
  display: 'swap',
  variable: '--font-utoa-serif',
});

const SITE_URL = 'https://utoa.studio';
const OG_IMAGE_PATH = '/assets/og-camera.svg';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
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
      <head></head>
      <body className={`${utoaSerif.variable} antialiased`} style={{ overscrollBehaviorX: 'auto' }}>
        <SmoothScrollProvider>
          <LoaderStateProvider>
            {/* 啟用平滑滾動（Lenis） */}
            <SmoothScroll />

            {/* 全螢幕前導 Loader - 只在首次載入顯示 */}
            <LoaderClient />
            {children}
          </LoaderStateProvider>
        </SmoothScrollProvider>
      </body>
    </html>
  );
}
