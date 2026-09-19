# Independent SEO fields

The admin dashboard and live workspace link to `/admin/seo`. Homepage, location, and collection pages have independent SEO title, description, and share-image controls. Search and social metadata use the same title/description; the editor previews both.

## Data and display boundary

- Store only `seo_metadata.title`, `description`, and `og_asset_id`, keyed by entity type and ID. Writes never update `collections.title/summary/cover_asset_id`, location display fields, asset captions, or public React component props.
- Empty/whitespace values normalize to null. Each public page keeps its original title/description fallback and default camera image when the independent field is unset.
- `generateMetadata` reads SEO separately from the visible page data. HTML title, description, Open Graph, Twitter cards and canonical are output through Next metadata. SEO text is not rendered as hidden body content.
- Canonical URLs remain derived from the real route, not an editable SEO field.
- Asset options show the latest 100 assets plus the current selection. The chosen share image does not replace the visible cover. Missing image references fall back to the default image.
- Authenticated admin GET/PUT routes validate target existence, reject unknown input keys and invalid assets, and use bound SQL parameters. The SEO write and audit record are transactional. The saved target path is revalidated; cache errors return an explicit saved-with-warning result.
- Existing `Collection.seo_title/seo_description/seo_keywords` columns are not used or migrated by this feature. `seo_metadata` is the source of truth for this editor.

## Schema and deployment

The existing `seo_metadata` table already contains all required columns. The Prisma `SEOEntityType` enum gains `location`; SQLite/D1 stores it as TEXT without a CHECK constraint, so this adds no SQL migration. Run `npx prisma generate` with the updated schema before building (already done locally). No production database writes or deployment were performed.

## Validation — 2026-09-19

- `node --test tests/seo/*.test.mjs`: 5 passed. Real SQLite executes the D1 statement/batch interface; tests cover all 3 entity types, independent persistence, metadata, null/reset semantics, input validation, nonexistent targets/assets, canonical path revalidation, and transaction rollback.
- `npm run test:security`: 362 passed, including the added protected routes. Two initial local-server tests were blocked by sandbox socket permissions; the permitted rerun passed.
- `npx tsc --noEmit`: passed.
- ESLint on all new application code and the three modified public routes: passed.
- Existing site migration guards: 2 passed.
- `npm run build`: passed after allowing the existing Google Fonts download. Existing `jose` Edge Runtime warnings remain; this change does not modify authentication.
- Real Next dev + Prisma + Chrome, isolated fixture database: homepage, location and collection editing/saving/reloading/reset passed. DOM metadata and Twitterbot HTML match SEO values; main visible text is identical before/after. No browser page errors. Editor checked at 1440px and 390px, no horizontal overflow.
- Screenshots compared before/after SEO changes: collection pixel-identical; homepage 425 differing pixels and location 119, in illustration/gradient areas (under 0.02% of each image). Main text is identical on all three; no public visual components were edited. Tests suppress CSS motion and use local copies of the existing font plus a synthetic test image, so these are local fixture evidence, not production screenshots.
- Share preview is an in-app simulation and metadata verification, not a claim of live social-platform cache refresh.

Evidence: [browser assertions](seo/2026-09-19/result.json), [pixel comparison](seo/2026-09-19/visual-comparison.json), [desktop editor](seo/2026-09-19/collection-editor-desktop.png), [mobile editor](seo/2026-09-19/collection-editor-mobile.png), [public before](seo/2026-09-19/collection-before.png), [public after](seo/2026-09-19/collection-after.png).

## Reproduce browser QA

1. Run `node tests/seo/prepare-qa.mjs`. It creates a new temporary copy of `src/public`, a fresh SQLite fixture, and prints a loopback-only server command. It does not copy environment/credential files or use `prisma/dev.db`.
2. Run the printed Next dev command from that temporary directory. Its synthetic auth exists only in that copy. Never deploy the copy or expose its server to a network.
3. From this repository run `node tests/seo/verify-browser.mjs`. Optional variables: `SEO_QA_ORIGIN` (127.0.0.1 only), `SEO_QA_OUTPUT`, `E2E_CHROME_EXECUTABLE_PATH`. Screenshots and bot HTML default to `/tmp/utoa-seo-evidence`.
4. Stop the fixture server when finished.
