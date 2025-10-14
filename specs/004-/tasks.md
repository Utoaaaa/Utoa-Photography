# Implementation Tasks: 首頁年份地點階層改版

**Branch**: `004-`  
**Source Docs**: [`spec.md`](./spec.md) · [`plan.md`](./plan.md) · [`data-model.md`](./data-model.md) · [`research.md`](./research.md) · [`contracts/`](./contracts/) · [`quickstart.md`](./quickstart.md)

---

## Phase 1 — Setup & Environment
Goal: Prepare tooling and validate local environment for hierarchy work.  
Completion Criteria: Prisma migration scaffolding verified locally; build toolchain ready.

- **T001** [X] — Confirm environment meets prerequisites (`Node 20`, Prisma CLI). Run `npm install` if needed.  
  Files: `package.json`
- **T002** [X] — Add feature branch context to project notes (if required).  
  Files: `README.md` *(optional documentation tweak)*

## Phase 2 — Foundational Schema & Seed Work
Goal: Introduce Location entity and connect collections; unblock all stories.  
Completion Criteria: Prisma schema updated, migrations applied, seed/test data aligned.

- **T003** [X] — Update `prisma/schema.prisma` with `Location` model, `Collection.location_id`, indexes, validations.  
  Files: `prisma/schema.prisma`
- **T004** [X] — Generate new Prisma migration (`prisma/migrations/20xx.../`). Ensure migration enforces schema additions.  
  Files: `prisma/migrations/*`
- **T005** [X] — Adjust Prisma seed to create sample years, locations, collections with valid slugs.  
  Files: `prisma/seed.ts`
- **T006** [X] — Update Prisma client generation artifacts. Run `npx prisma generate`.  
  Files: `node_modules/.prisma`, `.prisma` artifacts *(no commit expected)*

## Phase 3 — [Story US1, Priority P1] 首頁快速確認年份與地點
Goal: Static homepage shows per-year location cards with progressive enhancement.  
Independent Test: 切換年份時看到對應地點卡片（無 JS 仍可瀏覽）。

- **T007** [X] — [P] Extract build-time loader to export `{year → locations}` JSON (per research Decision 1).
  Files: `tools/year-location/generate-year-location.js`, `src/lib/year-location.ts`, `public/data/year-location.json`
- **T008** [X] — Update homepage data fetching (`src/app/(site)/page.tsx` or equivalent) to consume generated JSON statically.  
  Files: `src/app/(site)/page.tsx`, `src/lib/...`
- **T009** [X] — Implement location card UI components with slug-based links (`/[year]/[location]`).  
  Files: `src/components/LocationCard.tsx` (new)、`src/components/YearSwitcher.tsx`
- **T010** [X] — Ensure styles meet performance budgets (lazy images, minimal JS).  
  Files: `src/components/LocationCard.tsx`, CSS modules/Tailwind classes
- **T011** [X] — Add integration test ensuring homepage renders multiple years & locations with static data.  
  Files: `tests/integration/homepage.spec.ts`
- **Checkpoint P1** — Verify SC-001 progress (manual QA + test pass).

## Phase 4 — [Story US2, Priority P2] 地點詳情導向 Collections
Goal: Location detail page lists collections, handles empty states, routes from homepage.  
Independent Test: 點擊地點卡片進入詳情頁，看到 collection 清單或友善空畫面。

- **T012** [X] — [P] Scaffold `/[year]/[location]/page.tsx` route pulling data from static JSON / loader.  
  Files: `src/app/(site)/[year]/[location]/page.tsx`
- **T013** [X] — Implement collection grid component shared with existing views (if applicable).  
  Files: `src/components/CollectionGrid.tsx`
- **T014** [X] — Handle empty state messaging + back navigation per spec.  
  Files: `src/app/(site)/[year]/[location]/page.tsx`
- **T015** [X] — Update sitemap/build scripts to include `/[year]/[location]` pages only (remove legacy routes).  
  Files: `next.config.ts`, `scripts/generate-sitemap.ts`
- **T016** [X] — Add integration test covering navigation from homepage to location detail and empty state scenario.  
  Files: `tests/integration/location-page.test.tsx`
- **Checkpoint P2** — Validate SC-004 monitoring plan (link checker updated, 404 expectation set).

## Phase 5 — [Story US3, Priority P3] 管理者維護地點層級
Goal: Admin can CRUD locations, assign collections without leaving workflow; publishing guard enforced.  
Independent Test: 後台新增/排序地點、指派 collection、發布流程阻擋未指派地點。

### Admin UI & APIs
- **T017** [X] — Refactor admin year dashboard layout to include location pane.  
  Files: `src/app/(admin)/years/[yearId]/page.tsx`
- **T018** [X] — Implement location CRUD form using OpenAPI contract (`/api/admin/years/{yearId}/locations`).  
  - [X] Scaffold `LocationForm` UI component並接上前端狀態管理。  
  - [X] 建立 `GET/POST/PUT/DELETE` API route 與 Prisma service 連線。  
  - [X] 補齊 API error handling 與表單訊息整合測試。  
  Files: `src/app/(admin)/years/[yearId]/locations/Form.tsx`, `src/app/api/admin/years/[yearId]/locations/route.ts`
- **T019** [X] — [P] Implement reorder interaction + API for location order index.  
  - [X] 加入地點列表上下移按鈕與狀態處理。  
  - [X] 建立 `/api/admin/locations/{locationId}/reorder` 並重算排序索引。  
  - [X] 補齊單元測試驗證 API 與 UI 整合。  
  Files: `src/app/(admin)/years/[yearId]/locations/List.tsx`, `src/app/api/admin/locations/[locationId]/reorder/route.ts`
- **T020** [X] — Build collection assignment control hitting `/api/admin/collections/{collectionId}/location`.
  - [X] Implement assignment UI component and integrate with admin year workspace。
  - [X] Create API route to assign or unassign collections to locations。
  - [X] Add unit tests covering assignment UI and API behaviors。
  Files: `src/app/(admin)/collections/AssignLocation.tsx`, `src/app/api/admin/collections/[collectionId]/location/route.ts`
- **T021** [X] — Enforce publish guard in API: block publish when `location_id` null (per research Decision 2).  
  Files: `src/app/api/admin/collections/[collectionId]/publish/route.ts`

### Backend Logic
- **T022** [X] — Update Prisma services to handle location CRUD, validation, slug format enforcement.  
  Files: `src/lib/prisma/location-service.ts`, `src/lib/validators/location.ts`
- **T023** [X] — [P] Add unit tests for location service (CRUD + slug validation).  
  Files: `tests/unit/prisma/location-service.test.ts`
- **T024** [X] — Update collection service to ensure year/location consistency when assigning/moving.  
  Files: `src/lib/prisma/collection-service.ts`
- **T025** [X] — Add unit tests covering publish guard + reassignment edge cases.  
  Files: `tests/unit/prisma/collection-service.test.ts`

### Admin UX Polish
- **T026** [X] — Wire optimistic UI feedback and error toasts for admin actions.  
  Files: `src/components/admin/Toast.tsx`, `src/app/(admin)/...`
- **T027** [X] — Document admin workflow in handbook / Notion (optional).  
  Files: `docs/admin-workflow.md`
- **Checkpoint P3** — Conduct end-to-end sanity (manual or playwright) verifying CRUD + assignment + publish guard.

## Phase 6 — Cross-Cutting Polish & Monitoring
Goal: Finalize data outputs, update monitoring, ensure success metrics traceable.  
Completion Criteria: Static outputs clean, monitoring in place, docs updated.

- **T028** [X] — Regenerate sitemap and verify `npm run ci:link-check` passes (no `/[year]/[collection]`).  
  Files: `test-results/linkinator/report.json`
- **T029** [X] — Update documentation (README, DEPLOYMENT_GUIDE) summarizing new structure and slug format.  
  Files: `README.md`, `DEPLOYMENT_GUIDE.md`
- **T030** [X] — Configure analytics/monitoring to track 404 count for legacy URLs (Cloudflare dashboard note).  
  Files: `docs/monitoring.md`
- **T031** [X] — Final regression sweep: run `npm run test:unit`, `npm run test:integration`, `npm run ci:link-check`, `npm run lighthouse`.  
  Files: test results

---

## Dependencies & Story Order
1. Phase 2 must complete before any story (P1–P3) work.  
2. Story order: **US1 (P1)** → **US2 (P2)** → **US3 (P3)**.  
3. Cross-cutting polish (Phase 6) runs after all stories complete.

### Parallel Opportunities
- Within US1: T007 and T009 can run in parallel once schema ready.  
- Within US2: T012 and T013 can proceed concurrently; T016 waits for page + components.  
- Within US3: T019 and T020 parallel once base admin page (T017/T018) exists; service tests (T023/T025) parallel after service updates.

---

## Implementation Strategy
1. MVP = Deliver US1 (homepage hierarchy) first, leveraging static data loader.  
2. Extend to US2 for location details + navigation continuity.  
3. Complete admin tooling (US3) and polish/monitoring to prepare for launch.

---

## Task Counts
- **Total tasks**: 31
- **US1 tasks**: 5 (T007–T011)
- **US2 tasks**: 5 (T012–T016)
- **US3 tasks**: 11 (T017–T027)
- **Cross-cutting**: 4 (T028–T031)
- **Setup/Foundational**: 6 (T001–T006)

## Independent Test Criteria per Story
- **US1**: T011 integration test verifying homepage year/location cards without JS dependencies.
- **US2**: T016 ensures location detail navigation/empty states.  
- **US3**: Checkpoint P3 + unit tests (T023, T025) + API publish guard.

## Suggested MVP Scope
- Complete Phases 1–3 (through T011) to ship homepage hierarchy with static data while backend work continues.
