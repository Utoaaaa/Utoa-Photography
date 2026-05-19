import { buildSiteMenuItemsFromNavData } from '../../src/lib/site-menu';
import type { YearNavEntry } from '../../src/lib/year-location';

const navData: YearNavEntry[] = [
  {
    id: 'draft-year',
    label: '2023',
    orderIndex: '003',
    status: 'draft',
    locations: [
      {
        id: 'draft-location',
        slug: 'hidden-23',
        name: 'Hidden',
        orderIndex: '001',
      },
    ],
  },
  {
    id: 'year-2025',
    label: '2025 Spring',
    orderIndex: '002',
    status: 'published',
    locations: [
      {
        id: 'location-kyoto',
        slug: 'kyoto-25',
        name: 'Kyoto',
        orderIndex: '002',
      },
      {
        id: 'location-taipei',
        slug: 'taipei-25',
        name: 'Taipei',
        orderIndex: '001',
      },
    ],
  },
  {
    id: 'year-2024',
    label: '2024',
    orderIndex: '001',
    status: 'published',
    locations: [],
  },
];

describe('site menu helpers', () => {
  it('builds production menu hrefs from published nav data', () => {
    expect(buildSiteMenuItemsFromNavData(navData).map((item) => item.link)).toEqual([
      '/',
      '/#year-2024',
      '/#year-2025-Spring',
      '/2025%20Spring/taipei-25',
      '/2025%20Spring/kyoto-25',
    ]);
  });

  it('builds classic menu hrefs with the classic base path', () => {
    expect(buildSiteMenuItemsFromNavData(navData, '/classic').map((item) => item.link)).toEqual([
      '/classic',
      '/classic#year-2024',
      '/classic#year-2025-Spring',
      '/classic/2025%20Spring/taipei-25',
      '/classic/2025%20Spring/kyoto-25',
    ]);
  });

  it('marks each year first location for menu hierarchy styling', () => {
    expect(buildSiteMenuItemsFromNavData(navData).map((item) => item.variant)).toEqual([
      'home',
      'year',
      'year',
      'location-first',
      'location',
    ]);
  });
});
