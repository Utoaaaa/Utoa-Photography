import type { Metadata } from 'next';
import MenuWrapper from '@/components/ui/MenuWrapper';
import { SiteProviders } from '@/components/providers/SiteProviders';
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
    <SiteProviders>
      {children}
      <MenuWrapper menuItems={menuItems} />
    </SiteProviders>
  );
}
