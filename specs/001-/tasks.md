# Tasks: 個人攝影作品展示網站

**Input**: Design documents from `/Users/utoaaaa/檔案/Web app/Utoa Photography/specs/001-/`
**Prerequisites**: plan.md ✓, research.md ✓, data-model.md ✓, contracts/ ✓

## Execution Flow (main)
```
1. Loaded plan.md: Next.js 14 App Router + TypeScript, Cloudflare Workers + D1
2. Loaded design documents:
   → data-model.md: 5 entities (Years, Collections, Assets, CollectionAssets, SEOMetadata)
   → contracts/: OpenAPI spec with 13 endpoints, contract testing strategy
   → research.md: Tech decisions (GSAP+Lenis, Tailwind+shadcn/ui, Cloudflare stack)
   → quickstart.md: 3-tier validation scenarios
3. Generated 58 tasks across 5 phases
4. Applied TDD ordering: tests before implementation
5. Marked [P] for parallel execution (different files, no dependencies)
6. SUCCESS: tasks ready for execution
```

## Format: `[ID] [P?] Description`
- **[P]**: Can run in parallel (different files, no dependencies)
- Include exact file paths in descriptions

## Path Conventions
**Project Structure**: Next.js App Router with route groups
- **Frontend/Backend**: `app/` (route groups), `lib/` (utilities), `components/`
- **Database**: `prisma/schema.prisma`, `lib/db.ts`
- **Tests**: `__tests__/` at component level, `tests/` at root

## Phase 3.1: Setup & Infrastructure (8 tasks)
- [x] T001 Create Next.js 14 App Router project structure with TypeScript
- [x] T002 [P] Install and configure Tailwind CSS + shadcn/ui dependencies
- [x] T003 [P] Setup GSAP + Lenis animation libraries
- [x] T004 [P] Configure ESLint, Prettier, and TypeScript strict mode
- [x] T005 Setup Cloudflare D1 database connection and Prisma ORM
- [x] T006 [P] Configure Cloudflare Images integration and Direct Upload
- [x] T007 [P] Setup OpenNext adapter for Cloudflare Workers deployment
- [x] T008 Create route groups (site) and (admin) with basic layout structure

## Phase 3.2: Tests First (TDD) ⚠️ MUST COMPLETE BEFORE 3.3
**CRITICAL: These tests MUST be written and MUST FAIL before ANY implementation**

### Contract Tests (13 tasks)
- [x] T009 [P] Contract test GET /api/years in `tests/contract/test_years_get.ts`
- [x] T010 [P] Contract test POST /api/years in `tests/contract/test_years_post.ts`
- [x] T011 [P] Contract test PUT /api/years/{id} in `tests/contract/test_years_put.ts`
- [x] T012 [P] Contract test DELETE /api/years/{id} in `tests/contract/test_years_delete.ts`
- [x] T013 [P] Contract test GET /api/years/{year_id}/collections in `tests/contract/test_collections_get.ts`
- [x] T014 [P] Contract test POST /api/years/{year_id}/collections in `tests/contract/test_collections_post.ts`
- [x] T015 [P] Contract test GET /api/collections/{id} in `tests/contract/test_collection_detail.ts`
- [x] T016 [P] Contract test PUT /api/collections/{id} in `tests/contract/test_collection_update.ts`
- [x] T017 [P] Contract test DELETE /api/collections/{id} in `tests/contract/test_collection_delete.ts`
- [x] T018 [P] Contract test POST /api/images/direct-upload in `tests/contract/test_image_upload.ts`
- [x] T019 [P] Contract test POST /api/assets in `tests/contract/test_assets_post.ts`
- [x] T020 [P] Contract test POST /api/collections/{id}/assets in `tests/contract/test_collection_assets.ts`
- [x] T021 [P] Contract test POST /api/revalidate in `tests/contract/test_revalidate.ts`

### Integration Tests (6 tasks)
- [x] T022 [P] Homepage year timeline navigation test in `tests/integration/test_homepage_navigation.ts`
- [x] T023 [P] Year page collection browsing test in `tests/integration/test_year_page.ts`
- [x] T024 [P] Collection detail photo viewer test in `tests/integration/test_collection_viewer.ts`
- [x] T025 [P] Admin content management flow test in `tests/integration/test_admin_cms.ts`
- [x] T026 [P] Image upload and association test in `tests/integration/test_image_workflow.ts`
- [x] T027 [P] Cache invalidation and revalidation test in `tests/integration/test_cache_strategy.ts`

## Phase 3.3: Database & Models (6 tasks)
**ONLY after tests are failing**
- [x] T028 [P] Create Prisma schema for Years model in `prisma/schema.prisma`
- [x] T029 [P] Create Prisma schema for Collections model in `prisma/schema.prisma`
- [x] T030 [P] Create Prisma schema for Assets model in `prisma/schema.prisma`
- [x] T031 [P] Create Prisma schema for CollectionAssets model in `prisma/schema.prisma`
- [x] T032 [P] Create Prisma schema for SEOMetadata model in `prisma/schema.prisma`
- [x] T033 Create database migrations and seed data in `prisma/migrations/`

## Phase 3.4: API Implementation (13 tasks)
- [x] T034 GET /api/years endpoint in `app/api/years/route.ts`
- [x] T035 POST /api/years endpoint in `app/api/years/route.ts`
- [x] T036 PUT /api/years/[year_id] endpoint in `app/api/years/[year_id]/route.ts`
- [x] T037 DELETE /api/years/[year_id] endpoint in `app/api/years/[year_id]/route.ts`
- [x] T038 GET /api/years/[year_id]/collections endpoint in `app/api/years/[year_id]/collections/route.ts`
- [x] T039 POST /api/years/[year_id]/collections endpoint in `app/api/years/[year_id]/collections/route.ts`
- [x] T040 GET /api/collections/[collection_id] endpoint in `app/api/collections/[collection_id]/route.ts`
- [x] T041 PUT /api/collections/[collection_id] endpoint in `app/api/collections/[collection_id]/route.ts`
- [x] T042 DELETE /api/collections/[collection_id] endpoint in `app/api/collections/[collection_id]/route.ts`
- [x] T043 POST /api/images/direct-upload endpoint in `app/api/images/direct-upload/route.ts`
- [x] T044 POST /api/assets endpoint in `app/api/assets/route.ts`
- [x] T045 POST /api/collections/[collection_id]/assets endpoint in `app/api/collections/[collection_id]/assets/route.ts`
- [x] T046 POST /api/revalidate endpoint in `app/api/revalidate/route.ts`

## Phase 3.5: Frontend Components (12 tasks)
- [x] T047 [P] Homepage year grid component in `app/(site)/page.tsx`
- [x] T048 [P] Year page layout with collections list in `app/(site)/[year]/page.tsx`
- [x] T049 [P] Collection detail page with photo viewer in `app/(site)/[year]/[collection]/page.tsx`
- [x] T050 [P] YearGrid component with hover animations in `components/ui/YearGrid.tsx`
- [x] T051 [P] CollectionList component with responsive layout in `components/ui/CollectionList.tsx`
- [x] T052 [P] PhotoViewer component with aspect ratio handling in `components/ui/PhotoViewer.tsx`
- [x] T053 [P] DotNavigation component with scroll sync in `components/ui/DotNavigation.tsx`
- [x] T054 [P] Breadcrumb navigation component in `components/ui/Breadcrumb.tsx`
- [x] T055 [P] Admin dashboard layout in `app/(admin)/page.tsx`
- [x] T056 [P] Admin year management interface in `app/(admin)/years/page.tsx`
- [x] T057 [P] Admin collection management interface in `app/(admin)/collections/page.tsx`
- [x] T058 [P] Admin image upload interface in `app/(admin)/uploads/page.tsx`

## Phase 3.6: Animation & Interaction (5 tasks)
- [x] T059 Setup Lenis smooth scrolling in `lib/animations/lenis.ts`
- [x] T060 [P] GSAP entrance animations for year boxes in `components/ui/YearGrid.tsx`
- [x] T061 [P] Photo viewer scroll sync with dot navigation in `components/ui/PhotoViewer.tsx`
- [x] T062 [P] Implement prefers-reduced-motion fallbacks in `lib/animations/utils.ts`
- [x] T063 Add keyboard navigation support for all interactive elements

## Phase 3.7: Integration & Middleware (4 tasks)
- [x] T064 Connect API endpoints to Prisma database models
- [x] T065 Implement Cloudflare Access authentication middleware
- [x] T066 Setup cache strategy with tag-based invalidation
- [x] T067 Add error handling and logging throughout application

## Phase 3.8: Polish & Performance (6 tasks)
- [x] T068 [P] Add SEO metadata and Open Graph tags in `app/layout.tsx`
- [x] T069 [P] Implement image optimization with Cloudflare Images variants
- [x] T070 [P] Add loading states and error boundaries
- [x] T071 [P] Performance optimization: lazy loading, prefetching
- [x] T072 [P] Accessibility audit: ARIA labels, keyboard navigation, screen reader support
- [x] T073 Run Lighthouse CI and Core Web Vitals validation

## Dependencies
### Critical Path
- Setup (T001-T008) before all other phases
- Tests (T009-T027) before implementation (T028-T067)
- Database models (T028-T033) before API implementation (T034-T046)
- API endpoints before frontend components that consume them
- Core components before animation integration
- Implementation before polish (T068-T073)

### Parallel Execution Blocks
```
Block 1 - Setup:
T002, T003, T004, T006, T007 (parallel after T001)

Block 2 - Contract Tests:
T009-T021 (all parallel, different files)

Block 3 - Integration Tests:
T022-T027 (all parallel, different files)

Block 4 - Database Models:
T028-T032 (parallel, same file but different sections)

Block 5 - Frontend Components:
T047-T058 (all parallel, different files)

Block 6 - Animation Features:
T060, T061, T062 (parallel after T059)

Block 7 - Polish Phase:
T068-T072 (all parallel, different concerns)
```

## Parallel Example
```bash
# Launch contract tests together:
Task: "Contract test GET /api/years in tests/contract/test_years_get.ts"
Task: "Contract test POST /api/years in tests/contract/test_years_post.ts"
Task: "Contract test PUT /api/years/{id} in tests/contract/test_years_put.ts"
Task: "Contract test DELETE /api/years/{id} in tests/contract/test_years_delete.ts"

# Launch frontend components together:
Task: "YearGrid component with hover animations in components/ui/YearGrid.tsx"
Task: "CollectionList component with responsive layout in components/ui/CollectionList.tsx"
Task: "PhotoViewer component with aspect ratio handling in components/ui/PhotoViewer.tsx"
Task: "DotNavigation component with scroll sync in components/ui/DotNavigation.tsx"
```

## Task Generation Summary
Generated from available documents:
- **13 Contract Tests** from OpenAPI spec endpoints
- **6 Integration Tests** from quickstart.md scenarios  
- **5 Database Models** from data-model.md entities
- **13 API Implementations** matching contract tests
- **12 Frontend Components** for 3-tier navigation architecture
- **5 Animation Tasks** from GSAP + Lenis requirements
- **4 Integration Tasks** for Cloudflare services
- **6 Polish Tasks** for performance and accessibility

## Validation Checklist ✓
- [x] All 13 contracts have corresponding tests (T009-T021)
- [x] All 5 entities have model tasks (T028-T032)  
- [x] All tests come before implementation (Phase 3.2 before 3.3+)
- [x] Parallel tasks truly independent (different files)
- [x] Each task specifies exact file path
- [x] No task modifies same file as another [P] task
- [x] TDD approach: failing tests before implementation
- [x] Dependencies clearly mapped and sequenced

## Notes
- [P] tasks = different files, no dependencies
- Verify all contract tests fail before implementing endpoints
- Admin routes protected by Cloudflare Access authentication
- Cache invalidation strategy implemented with tag-based approach
- Responsive design with mobile-first approach
- WCAG 2.1 AA compliance for accessibility