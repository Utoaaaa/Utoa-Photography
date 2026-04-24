export type DraftStatus = 'draft' | 'published';

export interface CliConstraints {
  allowDelete?: false;
  allowDetach?: false;
  allowAutoCapturedAt?: false;
}

export interface YearPlan {
  label: string;
  status?: DraftStatus;
  order_index?: string;
}

export interface LocationPlan {
  name: string;
  slug: string;
  summary?: string | null;
  order_index?: string;
}

export interface CollectionPlan {
  slug: string;
  title: string;
  summary?: string | null;
  status?: DraftStatus;
  order_index?: string;
  captured_at?: string | null;
}

export interface AssetPlan {
  file: string;
  id?: string;
  alt?: string;
  caption?: string | null;
  description?: string | null;
  title?: string | null;
  photographer?: string | null;
  location?: string | null;
  tags?: string | null;
  metadata_json?: Record<string, unknown> | null;
  width?: number;
  height?: number;
  attach?: boolean;
  order_index?: string;
  is_cover?: boolean;
}

export interface AdminCliPlan {
  version: 1;
  baseUrl?: string;
  constraints?: CliConstraints;
  year: YearPlan;
  location?: LocationPlan;
  collection: CollectionPlan;
  assets: AssetPlan[];
}

export interface YearRecord {
  id: string;
  label: string;
  order_index?: string;
  status?: string;
}

export interface LocationRecord {
  id: string;
  yearId?: string;
  year_id?: string;
  name: string;
  slug: string;
  summary?: string | null;
  orderIndex?: string;
  order_index?: string;
}

export interface CollectionRecord {
  id: string;
  year_id: string;
  location_id?: string | null;
  slug: string;
  title: string;
  summary?: string | null;
  status?: string;
  order_index?: string;
  captured_at?: string | null;
  cover_asset_id?: string | null;
}

export interface AssetRecord {
  id: string;
  alt: string;
  caption?: string | null;
  description?: string | null;
  title?: string | null;
  photographer?: string | null;
  location?: string | null;
  tags?: string | null;
  width: number;
  height: number;
  metadata_json?: unknown;
  location_folder_id?: string | null;
}

export interface CollectionDetail extends CollectionRecord {
  assets?: Array<AssetRecord & { order_index: string }>;
}

export interface RunAssetState {
  file: string;
  absoluteFilePath: string;
  assetId?: string;
  width?: number;
  height?: number;
  uploaded?: boolean;
  assetCreated?: boolean;
  attached?: boolean;
  updatedAt: string;
  message?: string;
}

export interface RunState {
  version: 1;
  runId: string;
  status: 'running' | 'completed' | 'failed';
  startedAt: string;
  finishedAt?: string;
  planPath: string;
  baseUrl: string;
  yearId?: string;
  locationId?: string;
  collectionId?: string;
  coverAssetId?: string;
  assets: RunAssetState[];
  steps: string[];
  error?: string;
}
