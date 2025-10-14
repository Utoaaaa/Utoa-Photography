# Data Model — 首頁年份地點階層改版

## Overview

The redesign introduces an explicit `Location` entity nested under `Year` and links existing `Collection` records to a single location. The schema continues to target Prisma + SQLite and remains static-friendly for build-time data export.

## Entities

### Year (existing)
- **Fields**
  - `id: String @id @default(uuid())`
  - `label: String` — display label (e.g., "2024").
  - `order_index: String` — lexicographic ordering key.
  - `status: YearStatus` — `draft` | `published`.
  - `created_at: DateTime @default(now())`
  - `updated_at: DateTime @updatedAt`
- **Relationships**
  - `locations: Location[]` — new one-to-many link.
  - `collections: Collection[]` — retained for backward compatibility.
- **Constraints/Notes**
  - Existing indexes stay unchanged.
  - Publishing workflow unaffected; location availability inherits year status.

### Location (new)
- **Fields**
  - `id: String @id @default(uuid())`
  - `year_id: String`
  - `slug: String` — unique per year; format `english-name-YY` (lowercase, hyphenated, year suffix).
  - `name: String`
  - `summary: String?`
  - `cover_asset_id: String?`
  - `order_index: String` — stringified sortable key.
  - `created_at: DateTime @default(now())`
  - `updated_at: DateTime @updatedAt`
- **Relationships**
  - `year: Year @relation(fields: [year_id], references: [id], onDelete: Cascade)`
  - `collections: Collection[]`
- **Indexes/Constraints**
  - `@@unique([year_id, slug])` — enforce unique slug within a year.
  - `@@index([year_id, order_index])` — ordering queries.
  - `slug` validated against regex `^[a-z0-9-]+-[0-9]{2}$`.

### Collection (modified)
- **New Field**
  - `location_id: String?` — nullable for drafts; must be non-null for published status.
- **Updated Relationships**
  - `location: Location? @relation(fields: [location_id], references: [id], onDelete: SetNull)` — keeps history if location deleted; publish guard prevents null in production.
- **Constraints**
  - Add `@@index([location_id])` for assignment lookups.
  - Publication workflow enforces `location_id` presence before status `published` or `published_at` set.

## Derived Data for Static Build

- Build script constructs nested structure `{ year: { label, slug }, locations: [{ name, slug, summary, cover, collections: [...] }] }` from Prisma.
- JSON exported to `public/data/year-location.json` (or equivalent loader) for reuse by React components.
- Ensure seeds populate: at least one year with ≥ 2 locations and each location ≥ 1 collection.

## Validation Rules

- `Location.slug` must follow `english-location-YY`; admin UI provides live validation.
- Before publishing a collection, enforce: `collection.location_id != null` and `collection.year_id` matches linked location.
- Deleting a location allowed only if all associated collections are reassigned or moved to another location.

## Migration Considerations

1. Create `Location` table and add `location_id` column to `Collection` with temporary null default.
2. Backfill: assign existing collections into placeholder locations per year (e.g., `unassigned-YY`), then prompt admins to reassign before publish.
3. Update Prisma client generation and regenerate types.
4. Adjust seed data to create sample locations/collections consistent with new constraints.
