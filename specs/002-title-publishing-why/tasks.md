# Tasks: 個人攝影網站 — 後台發布頁面（Publishing）＋首頁與作品集呈現修改

> 🗃️ 2025-10 更新：Publishing 相關頁面、API、測試與 tools/publishing 已下線，本任務清單僅保留歷史紀錄。

**Input**: Design documents from `/Users/utoaaaa/檔案/Web app/Utoa-Photography/specs/002-title-publishing-why/`
**Prerequisites**: plan.md (required), research.md, data-model.md, contracts/

## Execution Flow (main)
```
1. Load plan.md from feature directory
2. Load optional design documents (data-model, contracts, research, quickstart)
3. Generate tasks by category (Setup → Tests → Core → Integration → Polish)
4. Apply task rules (parallel [P], TDD ordering)
5. Number tasks sequentially (T001, T002...)
6. Generate dependency graph and parallel examples
7. Return: SUCCESS (tasks ready for execution)
```

## Phase 3.1: Setup
- [x] T001 Create private tool workspace `tools/publishing/` with README explaining scope and separation from public site。（2025-10 清理後目錄已移除）
- [x] T002 Initialize publishing tool (Worker/CLI) scaffold in `tools/publishing/` with TypeScript, ESM, linting, tsconfig。（2025-10 清理後目錄已移除）
- [x] T003 [P] Add CI gates: Lighthouse CI config, HTML validator, link checker, asset budget checks in `.github/workflows/` and project scripts.
- [x] T004 Configure env and secrets strategy (no secrets in client): `.env.example`, Wrangler/D1 config in `wrangler.toml` for private endpoints only.

## Phase 3.2: Tests First (TDD)
- [x] T005 [P] Contract test List drafts → map to OpenAPI `contracts/api-spec.yaml#/paths/~1publishing~1collections/get` in `tests/contract/test_collections_get.ts`.
- [x] T006 [P] Contract test Collection detail preview → `.../collections/{id}` in `tests/contract/test_publishing_collection_detail.ts`.
- [x] T007 [P] Contract test Update asset fields → `.../assets/{assetId}` in `tests/contract/test_publishing_asset_update.ts`.
- [x] T008 [P] Contract test Set SEO → `.../{id}/seo` in `tests/contract/test_publishing_seo.ts`.
- [x] T009 [P] Contract test Publish → `.../{id}/publish` in `tests/contract/test_publishing_publish.ts`（2025-10 移除）。
- [x] T010 [P] Contract test Unpublish → `.../{id}/unpublish` in `tests/contract/test_publishing_publish.ts`（2025-10 移除）。
- [x] T011 [P] Contract test Versions list → `.../{id}/versions` in `tests/contract/test_publishing_versions.ts`（2025-10 移除）。
- [x] T012 [P] Integration test: Homepage brand + geometric pattern a11y/visibility in `tests/integration/test_homepage_navigation.test.ts` (extend existing).
- [x] T013 [P] Integration test: Single-screen viewer interactions (swipe/keys/dots) and ARIA in `tests/integration/test_collection_viewer.ts`.
- [x] T014 [P] Integration test: Publishing flow (disable publish when SEO/alt missing; success triggers cache invalidation stubs) in `tests/integration/test_admin_cms.ts`。

## Phase 3.3: Core Implementation
- [x] T015 [P] Data models: extend schema for `publish_note`, `version`, `published_at`, `seo_title`, `seo_description`, `og_image_asset_id` in `prisma/schema.prisma` and migrations。
- [x] T016 [P] Data models: add `text`, `slide_index` fields to `collection_assets` in `prisma/schema.prisma`。
- [x] T017 Service: implement checklist validation (SEO required fields, image alts) in `src/lib/validation.ts`。
- [x] T018 Service: implement cache precise invalidation entry points in `src/app/api/revalidate/route.ts`（accept ids: home/year/collection）。
- [x] T019 Service: implement audit logging function in `src/lib/db.ts` or `src/lib/utils.ts` to write `audit_logs`.
- [x] T020 Endpoint: `GET /admin/publishing/collections` list with filters in `src/app/api/collections/route.ts` (or new private path under `/api/admin/` inside `src/app/api/`)。
- [x] T021 Endpoint: `GET /admin/publishing/collections/{id}` detail in `src/app/api/collections/[collection_id]/route.ts`。
- [x] T022 Endpoint: `PATCH /admin/publishing/collections/{id}/assets/{assetId}` in `src/app/api/collections/[collection_id]/assets/route.ts`。
- [x] T023 Endpoint: `PUT /admin/publishing/collections/{id}/seo` in `src/app/api/collections/[collection_id]/route.ts`（idempotent SEO write）。
- [x] T024 Endpoint: `POST /admin/publishing/collections/{id}/publish` increments version + note + published_at + revalidate in `src/app/api/collections/[collection_id]/route.ts`。
- [x] T025 Endpoint: `POST /admin/publishing/collections/{id}/unpublish` set draft + note + revalidate in same route。
- [x] T026 UI (site): Homepage brand size/position + right-side geometric pattern updates in `src/app/(site)/layout.tsx` 和樣式 `src/app/globals.css`。
- [x] T027 UI (site): Single-screen viewer with dots/ARIA/keyboard/swipe in `src/components/ui/PhotoViewer.tsx`（尊重 prefers-reduced-motion；預載相鄰 1–2 張）。
- [x] T028 UI (admin): New `/admin/publishing` page list + filters + checklist in `src/app/admin/page.tsx` 或新頁 `src/app/admin/publishing/page.tsx`。
- [x] T029 UI (admin): Preview detail pane with slide viewer同步於 `src/components/ui/PhotoViewer.tsx` 可重用行為。
- [x] T030 UI (admin): SEO/OG form + validations + disable publish when invalid；顯示版本與變更紀錄。

## Phase 3.4: Integration
- [x] T031 Wire endpoints to services and models with Prisma in `src/lib/db.ts` + query helpers in `src/lib/queries/*`。
- [x] T032 Hook publish/unpublish to `revalidate` precise invalidation targets（home/year/collection）。
- [x] T033 Ensure `audit_logs` writes on publish/unpublish/edit/seo update。
- [x] T034 Add a11y audits: ARIA roles, focus order, keyboard navigation for dots/breadcrumbs。

## Phase 3.5: Polish
- [x] T035 [P] Unit tests for checklist validation and dot navigation logic in `tests/unit/test_validation.ts`、`tests/unit/test_viewer.ts`。
 - [x] T036 Performance tuning: image `sizes/srcset` correctness, LCP budget, preloading next/prev slide in viewer。
 - [x] T037 [P] Update docs: add feature quickstart link in root README, and describe private tool separation。
 - [x] T038 Remove duplication and ensure no-js baseline works（dots→links fallback）。
 - [x] T039 Run Lighthouse CI + HTML validator + link checker on preview deploy；fix regressions。

## Dependencies
- Setup (T001–T004) → 所有後續
- 測試（T005–T014）必先於對應實作（T015+）之前落地並處於失敗狀態
- 模型（T015–T016）→ 服務（T017–T019）→ 端點（T020–T025）→ UI（T026–T030）
- 整合（T031–T034）在核心完成後
- Polish（T035–T039）最後

## Parallel Example
```
# 可同時啟動的 contract/integration 測試任務：
Task: "T005 Contract test collections list"  
Task: "T006 Contract test collection detail"  
Task: "T007 Contract test update asset"  
Task: "T008 Contract test set SEO"  
Task: "T009 Contract test publish"  
Task: "T010 Contract test unpublish"  
Task: "T011 Contract test versions list"  
Task: "T012 Integration test homepage brand & pattern"  
Task: "T013 Integration test single-screen viewer"  
Task: "T014 Integration test publishing flow"
```

## Notes
- [P] 任務代表不同檔案、無直接依賴，可平行執行。
- 嚴格遵循 TDD：先寫測試並確定失敗，再開發。
- 所有公開站點修改必符合憲法的靜態優先、可及性與效能預算。
