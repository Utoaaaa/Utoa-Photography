import { ValidationError } from './errors';
import type { PrismaClient } from '@prisma/client';

export interface ValidationRule {
  field: string;
  type: 'string' | 'number' | 'boolean' | 'uuid' | 'url' | 'email';
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: RegExp;
  enum?: string[];
}

export function validateData(data: any, rules: ValidationRule[]): void {
  for (const rule of rules) {
    const value = data[rule.field];

    // Check if required field is missing
    if (rule.required && (value === undefined || value === null || value === '')) {
      throw new ValidationError(`${rule.field} is required`);
    }

    // Skip validation if field is not required and value is empty
    if (!rule.required && (value === undefined || value === null || value === '')) {
      continue;
    }

    // Type validation
    switch (rule.type) {
      case 'string':
        if (typeof value !== 'string') {
          throw new ValidationError(`${rule.field} must be a string`);
        }
        break;

      case 'number':
        if (typeof value !== 'number' || isNaN(value)) {
          throw new ValidationError(`${rule.field} must be a valid number`);
        }
        break;

      case 'boolean':
        if (typeof value !== 'boolean') {
          throw new ValidationError(`${rule.field} must be a boolean`);
        }
        break;

      case 'uuid':
        if (typeof value !== 'string' || !isValidUUID(value)) {
          throw new ValidationError(`${rule.field} must be a valid UUID`);
        }
        break;

      case 'url':
        if (typeof value !== 'string' || !isValidURL(value)) {
          throw new ValidationError(`${rule.field} must be a valid URL`);
        }
        break;

      case 'email':
        if (typeof value !== 'string' || !isValidEmail(value)) {
          throw new ValidationError(`${rule.field} must be a valid email`);
        }
        break;
    }

    // String-specific validations
    if (rule.type === 'string' && typeof value === 'string') {
      if (rule.minLength && value.length < rule.minLength) {
        throw new ValidationError(`${rule.field} must be at least ${rule.minLength} characters long`);
      }

      if (rule.maxLength && value.length > rule.maxLength) {
        throw new ValidationError(`${rule.field} must be no more than ${rule.maxLength} characters long`);
      }

      if (rule.pattern && !rule.pattern.test(value)) {
        throw new ValidationError(`${rule.field} format is invalid`);
      }

      if (rule.enum && !rule.enum.includes(value)) {
        throw new ValidationError(`${rule.field} must be one of: ${rule.enum.join(', ')}`);
      }
    }

    // Number-specific validations
    if (rule.type === 'number' && typeof value === 'number') {
      if (rule.min !== undefined && value < rule.min) {
        throw new ValidationError(`${rule.field} must be at least ${rule.min}`);
      }

      if (rule.max !== undefined && value > rule.max) {
        throw new ValidationError(`${rule.field} must be no more than ${rule.max}`);
      }
    }
  }
}

function isValidUUID(value: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(value);
}

function isValidURL(value: string): boolean {
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}

function isValidEmail(value: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(value);
}

// Validation rule helpers
export const ValidationRules = {
  uuid: (field: string, required = true): ValidationRule => ({
    field,
    type: 'uuid',
    required,
  }),

  string: (field: string, required = true, minLength?: number, maxLength?: number): ValidationRule => ({
    field,
    type: 'string',
    required,
    minLength,
    maxLength,
  }),

  slug: (field: string, required = true): ValidationRule => ({
    field,
    type: 'string',
    required,
    pattern: /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    minLength: 1,
    maxLength: 100,
  }),

  status: (field: string, required = true, values: string[] = ['draft', 'published']): ValidationRule => ({
    field,
    type: 'string',
    required,
    enum: values,
  }),

  url: (field: string, required = true): ValidationRule => ({
    field,
    type: 'url',
    required,
  }),

  orderIndex: (field: string, required = true): ValidationRule => ({
    field,
    type: 'string',
    required,
    pattern: /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$|^[0-9a-zA-Z-]+$/,
  }),
} as const;

// Domain-specific validation helpers (T013)

// Ensure Year.label is unique. Optionally exclude an existing record by id (for updates).
export async function assertYearLabelUnique(
  prisma: PrismaClient,
  label: string,
  excludeId?: string
) {
  const found = await prisma.year.findFirst({
    where: excludeId
      ? { label, NOT: { id: excludeId } }
      : { label },
    select: { id: true },
  });
  if (found) {
    throw new ValidationError(`year label must be unique`);
  }
}

// Ensure Collection.slug is unique within the same year.
export async function assertCollectionSlugUnique(
  prisma: PrismaClient,
  yearId: string,
  slug: string,
  excludeId?: string
) {
  const found = await prisma.collection.findFirst({
    where: excludeId
      ? { year_id: yearId, slug, NOT: { id: excludeId } }
      : { year_id: yearId, slug },
    select: { id: true },
  });
  if (found) {
    throw new ValidationError(`collection slug must be unique within the year`);
  }
}

// Require fields when publishing an entity
export function requirePublishFields(
  entity: 'collection' | 'year' | 'asset',
  data: Record<string, any>,
  fields: string[]
) {
  const missing = fields.filter((f) => data[f] === undefined || data[f] === null || data[f] === '');
  if (missing.length > 0) {
    throw new ValidationError(`${entity} publish requires: ${missing.join(', ')}`);
  }
}