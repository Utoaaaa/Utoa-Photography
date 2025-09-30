import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'UTOA Photography',
  description: '攝影作品集 - 捕捉生活中的美好瞬間',
};

export default function SiteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}