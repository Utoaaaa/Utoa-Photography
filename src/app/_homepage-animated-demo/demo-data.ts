export type DemoPhoto = {
  id: string;
  title: string;
  caption?: string | null;
  frame: string;
  aspect: 'wide' | 'portrait' | 'square' | 'detail';
  width: number;
  height: number;
  coverClassName: string;
};

export type DemoCollection = {
  id: string;
  slug: string;
  title: string;
  summary: string;
  capturedAt: string;
  coverClassName: string;
  photos: DemoPhoto[];
};

export type DemoLocationDetail = {
  year: string;
  slug: string;
  name: string;
  region: string;
  summary: string;
  coverClassName: string;
  collections: DemoCollection[];
};

export const taipeiDemoLocation: DemoLocationDetail = {
  year: '2025',
  slug: 'taipei-25',
  name: 'Taipei',
  region: 'Northern Taiwan',
  summary: 'Neon rain, station glass, night markets, and alleys staged as a fast city exposure.',
  coverClassName: 'demo-cover-taipei',
  collections: [
    {
      id: 'night-platform-sequence',
      slug: 'night-platform-sequence',
      title: 'Night Platform Sequence',
      summary: 'Train glass, blue signage, and commuters cut into a compact nocturnal rhythm.',
      capturedAt: '2025 / 03 / 14',
      coverClassName: 'demo-cover-seoul',
      photos: [
        { id: 'np-01', title: 'Blue platform edge', caption: 'First frame after the rain stopped.', frame: '01', aspect: 'wide', width: 3000, height: 2000, coverClassName: 'demo-cover-seoul' },
        { id: 'np-02', title: 'Window reflection', caption: 'Faces and signage folded into one pane.', frame: '02', aspect: 'portrait', width: 2000, height: 3000, coverClassName: 'demo-cover-taipei' },
        { id: 'np-03', title: 'Signal amber', caption: 'A short pause before the next train.', frame: '03', aspect: 'wide', width: 3000, height: 2000, coverClassName: 'demo-cover-tainan' },
        { id: 'np-04', title: 'Last carriage', caption: 'Motion blur leaving the platform.', frame: '04', aspect: 'portrait', width: 2000, height: 3000, coverClassName: 'demo-cover-kinmen' },
      ],
    },
    {
      id: 'alley-light-study',
      slug: 'alley-light-study',
      title: 'Alley Light Study',
      summary: 'Small storefronts, wet pavement, and signs compressed into a tight walk.',
      capturedAt: '2025 / 03 / 16',
      coverClassName: 'demo-cover-taipei',
      photos: [
        { id: 'al-01', title: 'Red awning', caption: 'A narrow frame under warm plastic light.', frame: '01', aspect: 'portrait', width: 2000, height: 3000, coverClassName: 'demo-cover-taipei' },
        { id: 'al-02', title: 'Corner scooter', caption: 'Chrome highlights against deep shadow.', frame: '02', aspect: 'wide', width: 3000, height: 2000, coverClassName: 'demo-cover-seoul' },
        { id: 'al-03', title: 'Open kitchen', caption: 'Steam and fluorescent green at midnight.', frame: '03', aspect: 'wide', width: 3000, height: 2000, coverClassName: 'demo-cover-kyoto' },
      ],
    },
    {
      id: 'morning-market-roll',
      slug: 'morning-market-roll',
      title: 'Morning Market Roll',
      summary: 'A brighter roll of vendors, tiled counters, soft smoke, and early heat.',
      capturedAt: '2025 / 03 / 18',
      coverClassName: 'demo-cover-tainan',
      photos: [
        { id: 'mm-01', title: 'Tin roof glare', caption: 'Hard morning light bouncing across metal.', frame: '01', aspect: 'wide', width: 3000, height: 2000, coverClassName: 'demo-cover-tainan' },
        { id: 'mm-02', title: 'Hands at counter', caption: 'Fast gestures held in a still frame.', frame: '02', aspect: 'portrait', width: 2000, height: 3000, coverClassName: 'demo-cover-kinmen' },
        { id: 'mm-03', title: 'Yellow wall', caption: 'A warm block of color between stalls.', frame: '03', aspect: 'portrait', width: 2000, height: 3000, coverClassName: 'demo-cover-yilan' },
      ],
    },
  ],
};

const demoLocationShells: Omit<DemoLocationDetail, 'collections'>[] = [
  taipeiDemoLocation,
  {
    year: '2025',
    slug: 'kyoto-25',
    name: 'Kyoto',
    region: 'Kansai, Japan',
    summary: 'Temple shadows, paper screens, and slow street corners arranged as collection studies.',
    coverClassName: 'demo-cover-kyoto',
  },
  {
    year: '2025',
    slug: 'seoul-25',
    name: 'Seoul',
    region: 'South Korea',
    summary: 'Chrome, concrete, and blue-hour pedestrian routes translated into animated archive boards.',
    coverClassName: 'demo-cover-seoul',
  },
  {
    year: '2024',
    slug: 'kinmen-24',
    name: 'Kinmen',
    region: 'Taiwan Strait',
    summary: 'Wind-worn walls, ferry light, and pale stone details from the island route.',
    coverClassName: 'demo-cover-kinmen',
  },
  {
    year: '2024',
    slug: 'tainan-24',
    name: 'Tainan',
    region: 'Southern Taiwan',
    summary: 'Market color, old signage, and heavy afternoon heat compressed into one walk.',
    coverClassName: 'demo-cover-tainan',
  },
  {
    year: '2023',
    slug: 'yilan-23',
    name: 'Yilan',
    region: 'Northeastern Taiwan',
    summary: 'Mist, field edges, and low cloud cover observed through a restrained palette.',
    coverClassName: 'demo-cover-yilan',
  },
];

export function getDemoLocation(year: string, location: string) {
  const shell = demoLocationShells.find((item) => item.year === year && item.slug === location);

  if (shell) {
    return {
      ...shell,
      collections: taipeiDemoLocation.collections,
    };
  }

  return null;
}

export function getDemoCollection(year: string, location: string, collection: string) {
  const demoLocation = getDemoLocation(year, location);

  if (!demoLocation) {
    return null;
  }

  const demoCollection = demoLocation.collections.find((item) => item.slug === collection);

  if (!demoCollection) {
    return null;
  }

  return { location: demoLocation, collection: demoCollection };
}

export function buildDemoLocationHref(year: string, location: string) {
  return `/homepage-animated-demo/${encodeURIComponent(year)}/${encodeURIComponent(location)}`;
}

export function buildDemoCollectionHref(year: string, location: string, collection: string) {
  return `${buildDemoLocationHref(year, location)}/${encodeURIComponent(collection)}`;
}
