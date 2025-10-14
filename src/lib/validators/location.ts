export const LOCATION_SLUG_REGEX = /^[a-z0-9-]+-[0-9]{2}$/;

export class LocationValidationError extends Error {
  field?: string;

  constructor(message: string, field?: string) {
    super(message);
    this.name = 'LocationValidationError';
    this.field = field;
  }
}

function normaliseString(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function normaliseLocationName(value: unknown): string {
  const normalised = normaliseString(value);
  if (!normalised) {
    throw new LocationValidationError('請輸入地點名稱。', 'name');
  }
  return normalised;
}

export function normaliseOptionalField(value: unknown): string | null {
  const normalised = normaliseString(value);
  return normalised ?? null;
}

export function normaliseSlug(value: unknown): string {
  const normalised = normaliseString(value)?.toLowerCase() ?? '';
  if (!normalised) {
    throw new LocationValidationError('請輸入地點 slug。', 'slug');
  }
  if (!LOCATION_SLUG_REGEX.test(normalised)) {
    throw new LocationValidationError('Slug 需為小寫英數與短橫線，並以年份後兩碼結尾，例如 kyoto-24。', 'slug');
  }
  return normalised;
}

export function parseOrderIndex(value: unknown, { required }: { required: boolean }): string | null {
  if (value === undefined) {
    return null;
  }

  if (value === null) {
    if (required) {
      throw new LocationValidationError('排序值不可為空白。', 'orderIndex');
    }
    return null;
  }

  if (typeof value !== 'string') {
    throw new LocationValidationError('排序值不可為空白。', 'orderIndex');
  }

  const trimmed = value.trim();
  if (!trimmed) {
    if (required) {
      throw new LocationValidationError('排序值不可為空白。', 'orderIndex');
    }
    return null;
  }

  return trimmed;
}
