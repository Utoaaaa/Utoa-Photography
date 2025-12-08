/**
 * Direct D1 database queries for Cloudflare Workers environment
 * Use these instead of Prisma in production to avoid fs.readdir issues
 */

import { getD1Database } from './cloudflare';

type YearStatus = 'draft' | 'published';

export interface Year {
  id: string;
  label: string;
  order_index: string;
  status: YearStatus;
  created_at: string;
  updated_at: string;
}

export interface Asset {
  id: string;
  alt: string;
  caption?: string;
  width: number;
  height: number;
  metadata_json?: string;
  location_folder_id?: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Check if we're in a Cloudflare Workers environment
 */
export function shouldUseD1Direct(): boolean {
  const isProd = process.env.NODE_ENV === 'production';
  const db = getD1Database();
  return isProd && !!db;
}

/**
 * Get all years with optional filtering
 */
export async function d1GetYears(params: { 
  status?: 'draft' | 'published' | 'all'; 
  order?: 'asc' | 'desc' 
} = {}): Promise<Year[]> {
  const db = getD1Database();
  if (!db) {
    throw new Error('D1 database not available');
  }

  const { status, order = 'desc' } = params;
  
  let query = 'SELECT * FROM years';
  const bindings: string[] = [];
  
  if (status && status !== 'all') {
    query += ' WHERE status = ?';
    bindings.push(status);
  }
  
  query += ` ORDER BY order_index ${order === 'asc' ? 'ASC' : 'DESC'}`;
  
  const stmt = bindings.length > 0 
    ? db.prepare(query).bind(...bindings)
    : db.prepare(query);
    
  const result = await stmt.all();
  return (result.results || []) as Year[];
}

/**
 * Get a single year by ID
 */
export async function d1GetYearById(id: string): Promise<Year | null> {
  const db = getD1Database();
  if (!db) {
    throw new Error('D1 database not available');
  }

  const result = await db.prepare('SELECT * FROM years WHERE id = ?').bind(id).first();
  return result as Year | null;
}

/**
 * Create a new year
 */
export async function d1CreateYear(data: {
  label: string;
  order_index: string;
  status: YearStatus;
}): Promise<Year> {
  const db = getD1Database();
  if (!db) {
    throw new Error('D1 database not available');
  }

  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  await db.prepare(
    'INSERT INTO years (id, label, order_index, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)'
  ).bind(id, data.label, data.order_index, data.status, now, now).run();

  const result = await db.prepare('SELECT * FROM years WHERE id = ?').bind(id).first();
  return result as Year;
}

/**
 * Get assets with pagination and filtering
 */
export async function d1GetAssets(params: {
  limit?: number;
  offset?: number;
  location_folder_id?: string | null;
  unassigned?: boolean;
}): Promise<{ data: Asset[]; total: number }> {
  const db = getD1Database();
  if (!db) {
    throw new Error('D1 database not available');
  }

  const { limit = 50, offset = 0, location_folder_id, unassigned } = params;

  let whereClause = '';
  const filterBindings: any[] = [];

  if (location_folder_id) {
    whereClause = ' WHERE location_folder_id = ?';
    filterBindings.push(location_folder_id);
  } else if (unassigned) {
    whereClause = ' WHERE location_folder_id IS NULL';
  }

  const countQuery = `SELECT COUNT(*) as count FROM assets${whereClause}`;
  const countStmt = filterBindings.length > 0
    ? db.prepare(countQuery).bind(...filterBindings)
    : db.prepare(countQuery);
  const countResult = await countStmt.first<{ count: number | string | null } | null>();
  const total =
    typeof countResult?.count === 'string'
      ? Number.parseInt(countResult.count, 10)
      : countResult?.count ?? 0;

  const rowsQuery = `SELECT * FROM assets${whereClause} ORDER BY created_at DESC LIMIT ? OFFSET ?`;
  const rowsStmt = db.prepare(rowsQuery).bind(...filterBindings, limit, offset);
  const rowsResult = await rowsStmt.all();
  const data = (rowsResult.results || []) as Asset[];

  return { data, total };
}

/**
 * Get a single asset by ID
 */
export async function d1GetAssetById(id: string): Promise<Asset | null> {
  const db = getD1Database();
  if (!db) {
    throw new Error('D1 database not available');
  }

  const result = await db.prepare('SELECT * FROM assets WHERE id = ?').bind(id).first();
  return result as Asset | null;
}

/**
 * Create a new asset
 */
export async function d1CreateAsset(data: {
  id: string;
  alt: string;
  caption?: string;
  width: number;
  height: number;
  metadata_json?: string | null;
  location_folder_id?: string | null;
}): Promise<Asset> {
  const db = getD1Database();
  if (!db) {
    throw new Error('D1 database not available');
  }

  const now = new Date().toISOString();

  await db.prepare(
    'INSERT INTO assets (id, alt, caption, width, height, metadata_json, location_folder_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
  ).bind(
    data.id,
    data.alt,
    data.caption || null,
    data.width,
    data.height,
    data.metadata_json || null,
    data.location_folder_id || null,
    now,
    now
  ).run();

  const result = await db.prepare('SELECT * FROM assets WHERE id = ?').bind(data.id).first();
  return result as Asset;
}

/**
 * Check if an asset exists
 */
export async function d1AssetExists(id: string): Promise<boolean> {
  const db = getD1Database();
  if (!db) {
    throw new Error('D1 database not available');
  }

  const result = await db.prepare('SELECT 1 FROM assets WHERE id = ? LIMIT 1').bind(id).first();
  return !!result;
}

/**
 * Get asset usage count (how many collections use it)
 */
export async function d1GetAssetUsageCount(assetId: string): Promise<number> {
  const db = getD1Database();
  if (!db) {
    throw new Error('D1 database not available');
  }

  const result = await db.prepare(
    'SELECT COUNT(*) as count FROM collection_assets WHERE asset_id = ?'
  ).bind(assetId).first() as { count: number } | null;
  
  return result?.count || 0;
}

/**
 * Create audit log entry
 */
export async function d1CreateAuditLog(data: {
  actor: string;
  actor_type: string;
  entity_type: string;
  entity_id: string;
  action: string;
  meta?: string;
}): Promise<void> {
  const db = getD1Database();
  if (!db) {
    throw new Error('D1 database not available');
  }

  const now = new Date().toISOString();

  await db.prepare(
    'INSERT INTO audit_logs (actor, actor_type, entity_type, entity_id, action, meta, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).bind(
    data.actor,
    data.actor_type,
    data.entity_type,
    data.entity_id,
    data.action,
    data.meta || null,
    now
  ).run();
}
