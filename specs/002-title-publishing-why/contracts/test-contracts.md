# Contract Tests Plan (Publishing API)

Tests (to be implemented):

- GET `/publishing/collections` returns summaries with checklist status and supports `year`, `status` filters. [fail-first]
- GET `/publishing/collections/{id}` returns slides with `text`, `alt`, `slide_index` and SEO.
- PATCH `/publishing/collections/{id}/assets/{assetId}` updates `text`/`alt`/`slide_index` and persists.
- PUT `/publishing/collections/{id}/seo` saves SEO `title`/`description` and optional `ogImageAssetId`.
- POST `/publishing/collections/{id}/publish` increments `version`, sets `published_at`, writes `note`, triggers cache invalidation for home/year/collection, logs audit.
- POST `/publishing/collections/{id}/unpublish` sets status `draft`, writes `note`, triggers invalidation, logs audit.
- GET `/publishing/collections/{id}/versions?limit=10` returns latest N version entries.
