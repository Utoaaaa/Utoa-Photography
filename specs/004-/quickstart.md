# Quickstart — 首頁年份地點階層改版

## Prerequisites
- Node.js 20+
- SQLite (bundled) — ensure `DATABASE_URL="file:./prisma/dev.db"`
- Prisma CLI (`npx prisma`)

## Setup Steps
1. **Install dependencies**
   ```bash
   npm install
   ```
2. **Apply migrations & generate Prisma client**
   ```bash
   npx prisma migrate dev --name add_locations_layer
   npx prisma generate
   ```
3. **Seed development data**
   ```bash
   npm run db:seed
   ```
   The seed creates:
   - 2+ years each with ≥2 locations (`english-name-YY` slugs)
   - Collections already linked to locations
4. **Start development server**
   ```bash
   npm run dev
   ```
5. **Run automated checks**
   ```bash
   npm run lint
   npm run test:unit
   npm run test:integration
   npm run test:contract
   npm run lighthouse
   ```

## Feature Verification
- Visit `/` and confirm the year carousel toggles location cards without client fetch.
- Navigate to `/[year]/[location]` and ensure collection grids match seed data.
- In Admin, assign collections via the new unified view; publishing without location should be blocked.
- Inspect generated `public/data/year-location.json` (or loader output) to verify static build content.

## Deployment Notes
- Use `npm run opennext` then deploy artifacts to Cloudflare per repo workflow.
- Validate link checker (`npm run ci:link-check`) reports 0 references to `/[year]/[collection]`.
- Monitor 404 logs for two weeks post-release to confirm no legacy URLs remain.
