import type { Metadata } from "next";
import "./globals.css";
import LoaderClient from "./loader-client";
import { SmoothScroll } from "@/components/SmoothScroll";
import { SmoothScrollProvider } from "@/components/providers/SmoothScrollProvider";

export const metadata: Metadata = {
  title: "UTOA Photography",
  description: "Capturing Moments, Creating Stories",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-Hant">
      <head>
        {/* Preload self-hosted CJK serif fonts for faster first paint */}
        <link
          rel="preload"
          as="font"
          href="/fonts/noto-serif-tc/NotoSerifTC-Regular.ttf"
          type="font/ttf"
          crossOrigin="anonymous"
        />
        <link
          rel="preload"
          as="font"
          href="/fonts/noto-serif-tc/NotoSerifTC-SemiBold.ttf"
          type="font/ttf"
          crossOrigin="anonymous"
        />
      </head>
      <body
        className={`antialiased`}
        style={{ overscrollBehaviorX: 'auto' }}
      >
        <SmoothScrollProvider>
          {/* 啟用平滑滾動（Lenis） */}
          <SmoothScroll />

          {/* 全螢幕前導 Loader - 只在首次載入顯示 */}
          <LoaderClient />
          {children}
        </SmoothScrollProvider>
      </body>
    </html>
  );
}
