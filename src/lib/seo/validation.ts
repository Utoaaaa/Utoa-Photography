import { z } from 'zod';

export const seoTargetSchema = z.object({
  entityType: z.enum(['homepage', 'location', 'collection']),
  entityId: z.string().min(1).max(200),
}).refine(value => value.entityType !== 'homepage' || value.entityId === 'homepage');

const nullableText = (max: number) => z.string().trim().max(max).nullable()
  .transform(value => value || null);
// Full replacement of only SEO fields. Visible content and canonical URLs cannot be written here.
export const seoFieldsSchema = z.object({
  title: nullableText(200),
  description: nullableText(500),
  og_asset_id: nullableText(200),
}).strict();
