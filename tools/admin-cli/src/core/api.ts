import fs from 'node:fs/promises';
import path from 'node:path';

import type {
  AssetRecord,
  CollectionDetail,
  CollectionRecord,
  DraftStatus,
  LocationRecord,
  YearRecord,
} from '../types';
import { detectMimeType } from './files';

type JsonValue = Record<string, unknown> | Array<unknown> | string | number | boolean | null;

export class AdminApiClient {
  private readonly baseUrl: string;
  private readonly accessToken: string;

  constructor(baseUrl: string, accessToken: string) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.accessToken = accessToken;
  }

  private buildUrl(pathname: string): string {
    return `${this.baseUrl}${pathname}`;
  }

  private async request<T>(pathname: string, init?: RequestInit): Promise<T> {
    const response = await fetch(this.buildUrl(pathname), {
      ...init,
      headers: {
        'cf-access-token': this.accessToken,
        'user-agent': 'utoa-admin-cli/0.1.0',
        ...(init?.headers ?? {}),
      },
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`API ${response.status} ${pathname}: ${text}`);
    }

    if (response.status === 204) {
      return undefined as T;
    }

    return response.json() as Promise<T>;
  }

  getJson<T>(pathname: string): Promise<T> {
    return this.request<T>(pathname, { method: 'GET' });
  }

  postJson<T>(pathname: string, body: JsonValue): Promise<T> {
    return this.request<T>(pathname, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
  }

  putJson<T>(pathname: string, body: JsonValue): Promise<T> {
    return this.request<T>(pathname, {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
  }

  async uploadOriginal(filePath: string, imageId: string): Promise<{ image_id: string }> {
    const buffer = await fs.readFile(filePath);
    const form = new FormData();
    const mimeType = detectMimeType(filePath);
    const filename = path.basename(filePath);
    const file = new File([new Uint8Array(buffer)], filename, { type: mimeType });
    form.append('file', file);

    return this.request<{ image_id: string }>(
      `/api/admin/uploads/r2?image_id=${encodeURIComponent(imageId)}`,
      {
        method: 'POST',
        body: form,
      }
    );
  }

  listYears(): Promise<YearRecord[]> {
    return this.getJson<YearRecord[]>('/api/admin/years?status=all&order=asc');
  }

  createYear(payload: {
    label: string;
    status: DraftStatus;
    order_index?: string;
  }): Promise<YearRecord> {
    return this.postJson<YearRecord>('/api/admin/years', payload);
  }

  listLocations(yearId: string): Promise<LocationRecord[]> {
    return this.getJson<LocationRecord[]>(
      `/api/admin/years/${encodeURIComponent(yearId)}/locations`
    );
  }

  createLocation(
    yearId: string,
    payload: { name: string; slug: string; summary?: string | null; order_index?: string }
  ): Promise<LocationRecord> {
    return this.postJson<LocationRecord>(
      `/api/admin/years/${encodeURIComponent(yearId)}/locations`,
      payload
    );
  }

  listCollections(yearId: string): Promise<CollectionRecord[]> {
    return this.getJson<CollectionRecord[]>(
      `/api/admin/years/${encodeURIComponent(yearId)}/collections?status=all`
    );
  }

  createCollection(
    yearId: string,
    payload: {
      slug: string;
      title: string;
      summary?: string | null;
      status: DraftStatus;
      order_index?: string;
      location_id?: string;
      captured_at?: string | null;
    }
  ): Promise<CollectionRecord> {
    return this.postJson<CollectionRecord>(
      `/api/admin/years/${encodeURIComponent(yearId)}/collections`,
      payload
    );
  }

  updateCollection(
    collectionId: string,
    payload: {
      slug?: string;
      title?: string;
      summary?: string | null;
      status?: DraftStatus;
      order_index?: string;
      cover_asset_id?: string | null;
      captured_at?: string | null;
    }
  ): Promise<CollectionRecord> {
    return this.putJson<CollectionRecord>(
      `/api/admin/collections/${encodeURIComponent(collectionId)}`,
      payload
    );
  }

  assignCollectionLocation(collectionId: string, locationId: string): Promise<CollectionRecord> {
    return this.postJson<CollectionRecord>(
      `/api/admin/collections/${encodeURIComponent(collectionId)}/location`,
      {
        locationId,
      }
    );
  }

  createAsset(payload: {
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
    metadata_json?: Record<string, unknown> | null;
    location_id?: string;
  }): Promise<AssetRecord> {
    return this.postJson<AssetRecord>('/api/admin/assets', payload);
  }

  updateAsset(
    assetId: string,
    payload: {
      alt?: string;
      caption?: string | null;
      description?: string | null;
      title?: string | null;
      photographer?: string | null;
      location?: string | null;
      tags?: string | null;
      width?: number;
      height?: number;
      metadata_json?: Record<string, unknown> | null;
      location_id?: string;
    }
  ): Promise<AssetRecord> {
    return this.putJson<AssetRecord>(`/api/admin/assets/${encodeURIComponent(assetId)}`, payload);
  }

  attachAssets(collectionId: string, assetIds: string[]): Promise<Array<{ asset_id: string }>> {
    return this.postJson<Array<{ asset_id: string }>>(
      `/api/admin/collections/${encodeURIComponent(collectionId)}/assets`,
      { asset_ids: assetIds }
    );
  }

  reorderAssets(
    collectionId: string,
    reorder: Array<{ asset_id: string; order_index: string }>
  ): Promise<{ success: true }> {
    return this.putJson<{ success: true }>(
      `/api/admin/collections/${encodeURIComponent(collectionId)}/assets`,
      { reorder }
    );
  }

  getCollection(collectionId: string, includeAssets = false): Promise<CollectionDetail> {
    return this.getJson<CollectionDetail>(
      `/api/admin/collections/${encodeURIComponent(collectionId)}${includeAssets ? '?include_assets=true' : ''}`
    );
  }
}
