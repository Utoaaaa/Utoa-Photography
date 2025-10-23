export type CreateLocationDraft = {
  name?: unknown;
  slug?: unknown;
  summary?: unknown;
  coverAssetId?: unknown;
  orderIndex?: unknown;
};

export type UpdateLocationDraft = CreateLocationDraft;

export type LocationServiceErrorCode =
  | 'VALIDATION'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'HAS_COLLECTIONS';

export class LocationServiceError extends Error {
  code: LocationServiceErrorCode;
  field?: string;

  constructor(code: LocationServiceErrorCode, message: string, field?: string) {
    super(message);
    this.name = 'LocationServiceError';
    this.code = code;
    this.field = field;
  }
}

export function isLocationServiceError(error: unknown): error is LocationServiceError {
  return error instanceof LocationServiceError;
}

export const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const LOCATION_UUID_REGEX = UUID_REGEX;
