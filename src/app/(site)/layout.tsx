import type { Metadata } from 'next';
import MenuWrapper from '@/components/ui/MenuWrapper';
import type { StaggeredMenuItem } from '@/components/ui/StaggeredMenu';
import { loadYearLocationData } from '@/lib/year-location';

async function buildMenuItems(): Promise<StaggeredMenuItem[]> {
  const items: StaggeredMenuItem[] = [
    {
      label: 'Home',
      ariaLabel: '前往首頁',
      link: '/',
      variant: 'home',
    },
  ];

  try {
    const data = await loadYearLocationData();
    const publishedYears = (data.years ?? [])
      .filter((year) => year.status === 'published')
      .sort((a, b) => a.orderIndex.localeCompare(b.orderIndex));

    publishedYears.forEach((year) => {
      const anchorId = encodeURIComponent(year.label.replace(/\s+/g, '-'));
      items.push({
        label: year.label,
        ariaLabel: `前往 ${year.label} 年的作品集區塊`,
        link: `/#year-${anchorId}`,
        variant: 'year',
      });

  const orderedLocations = [...(year.locations ?? [])].sort((a, b) => a.orderIndex.localeCompare(b.orderIndex));

      orderedLocations.forEach((location, index) => {
        const encodedYear = encodeURIComponent(year.label);
        const encodedLocation = encodeURIComponent(location.slug);
        items.push({
          label: location.name,
          ariaLabel: `瀏覽 ${location.name} 地點`,
          link: `/${encodedYear}/${encodedLocation}`,
          variant: index === 0 ? 'location-first' : 'location',
        });
      });
    });
  } catch (error) {
    console.error('Failed to build menu items from year-location data:', error);
  }

  return items;
}

export const metadata: Metadata = {
  title: 'UTOA Photography',
  description: '攝影作品集 - 捕捉生活中的美好瞬間',
};

export default async function SiteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const menuItems = await buildMenuItems();

  return (
    <>
      <MenuWrapper menuItems={menuItems} />
      {children}
    </>
  );
}