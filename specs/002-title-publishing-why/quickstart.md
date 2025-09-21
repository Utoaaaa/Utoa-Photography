# Quickstart: Publishing Flow & Single-Screen Viewer

## Prerequisites
- Node 18+, pnpm/npm
- Access to private publishing tool (CLI/Worker) with credentials
- Cloudflare Images account for asset hosting

## Steps
1. Draft assets and metadata in private tool (create collection, upload images).
2. Edit per-image `alt` and `text`; set SEO title/description; choose optional OG image.
3. Preview single-screen viewer: slide switch via swipe/keys/dot nav; verify ARIA labels and reduced-motion.
4. Publish with note → version+1, published_at set → triggers static site rebuild and CDN invalidation for home/year/collection pages.
5. Verify on live: OG preview correct; LCP/INP/CLS within budgets.

## Testing
- Run contract tests for private API; integration tests for homepage navigation and collection viewer.
- Lighthouse CI and HTML validation must pass on preview deploy before merge.
