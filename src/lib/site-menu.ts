import type { StaggeredMenuItem } from '@/components/ui/StaggeredMenu';
import { buildHomeHref, buildLocationHref, buildYearHref } from '@/lib/site-paths';
import { loadYearLocationNavData, type YearNavEntry } from '@/lib/year-location';

export function buildSiteMenuItemsFromNavData(data: YearNavEntry[], basePath?: string): StaggeredMenuItem[] {
  const items: StaggeredMenuItem[] = [
    {
      label: 'Home',
      ariaLabel: '前往首頁',
      link: buildHomeHref(basePath),
      variant: 'home',
    },
  ];

  const publishedYears = [...data]
    .filter((year) => year.status === 'published')
    .sort((a, b) => a.orderIndex.localeCompare(b.orderIndex));

  publishedYears.forEach((year) => {
    items.push({
      label: year.label,
      ariaLabel: `前往 ${year.label} 年的作品集區塊`,
      link: buildYearHref(year.label, basePath),
      variant: 'year',
    });

    const orderedLocations = [...(year.locations ?? [])].sort((a, b) => a.orderIndex.localeCompare(b.orderIndex));

    orderedLocations.forEach((location, index) => {
      items.push({
        label: location.name,
        ariaLabel: `瀏覽 ${location.name} 地點`,
        link: buildLocationHref(year.label, location.slug, basePath),
        variant: index === 0 ? 'location-first' : 'location',
      });
    });
  });

  return items;
}

export async function buildSiteMenuItems(basePath?: string): Promise<StaggeredMenuItem[]> {
  try {
    return buildSiteMenuItemsFromNavData(await loadYearLocationNavData(), basePath);
  } catch (error) {
    console.error('Failed to build menu items from year-location data:', error);
    return buildSiteMenuItemsFromNavData([], basePath);
  }
}
