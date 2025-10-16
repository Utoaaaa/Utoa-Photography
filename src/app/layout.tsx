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
      <body
        className={`antialiased`}
        style={{ overscrollBehaviorX: 'auto' }}
      >
        <SmoothScrollProvider>
          {/* 暫停平滑滾動以排除佈局/捲動問題 */}
          {/* <SmoothScroll /> */}

          {/* 全螢幕前導 Loader - 只在首次載入顯示 */}
          <LoaderClient />
          {children}
        </SmoothScrollProvider>
      </body>
    </html>
  );
}
