type Status = 'published' | 'draft' | 'review';

export type DemoYear = {
  id: string;
  label: string;
  status: Extract<Status, 'published' | 'draft'>;
  locations: number;
  collections: number;
  assets: number;
  updatedAt: string;
};

export type DemoLocation = {
  id: string;
  name: string;
  slug: string;
  summary: string;
  coverAssetId: string | null;
  status: Status;
};

export type DemoCollection = {
  id: string;
  title: string;
  slug: string;
  summary: string;
  locationId: string;
  status: Status;
  capturedAt: string;
  coverAssetId: string | null;
  assetIds: string[];
};

export type DemoAsset = {
  id: string;
  title: string;
  locationId: string;
  alt: string;
  description: string;
  status: Status;
  ratio: string;
  tone: string;
  variants: Array<'T' | 'M' | 'L'>;
  selected?: boolean;
  imageSrc?: string;
  width?: number;
  height?: number;
};

export type DemoWorkspace = {
  locations: DemoLocation[];
  collections: DemoCollection[];
  assets: DemoAsset[];
};
