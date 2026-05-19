import type { Metadata } from 'next';
import MenuWrapper from '@/components/ui/MenuWrapper';
import { buildSiteMenuItems } from '@/lib/site-menu';

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: true,
  },
};

export default async function ClassicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const menuItems = await buildSiteMenuItems('/classic');

  return (
    <>
      {children}
      <MenuWrapper menuItems={menuItems} />
    </>
  );
}
