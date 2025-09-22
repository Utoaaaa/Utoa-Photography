# Tasks: Admin 子系統缺頁面與缺端點補齊（Years / Collections / Uploads ＋ Images & Assets API）

**Input**: Design documents from `/Users/utoaaaa/檔案/Web app/Utoa-Photography/specs/003-admin-years-collections/`
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
 - [X] T001 [P] Add env docs and examples in README & CI (done) — verify `.env.local` and workflow env alignment
 - [X] T002 Configure test bypass guard in auth layer `src/lib/auth.ts` to honor `BYPASS_ACCESS_FOR_TESTS`
 - [X] T003 [P] Ensure D1 migrations cover fields (`collections.publish_note/version`, `collection_assets.text/slide_index`) in `prisma/migrations/*`
- [X] T004 Wire cache invalidation tags list in `src/app/api/revalidate/route.ts` (home/year/collection) per plan

## Phase 3.2: Tests First (TDD)
- [X] T005 [P] Contract test: POST `/api/images/direct-upload` in `tests/contract/test_image_upload.test.ts` (ensure BASE_URL from `TEST_API_URL`)
 - [X] T006 [P] Contract test: Assets CRUD `/api/assets` in `tests/contract/test_assets_post.ts` (create/list/update/delete)
 - [X] T007 [P] Contract test: Collection-Assets link/sort/remove in `tests/contract/test_collection_assets.ts`
 - [X] T008 [P] Contract test: Years CRUD in `tests/contract/test_years_*.ts` (get/post/put/delete) — align to routes
 - [X] T009 [P] Contract test: Collections CRUD/filters in `tests/contract/test_collections_*.ts`
 - [X] T010 [P] Integration test: Admin CMS flows in `tests/integration/test_admin_cms.ts`（data-testid 存在與可操作）
 - [X] T011 [P] Integration test: Image workflow in `tests/integration/test_image_workflow.ts`

## Phase 3.3: Core Implementation
- [X] T012 [P] Models: Year/Collection/Asset/CollectionAsset schema & Prisma client mapping in `prisma/schema.prisma`
- [ ] T013 Services: Validation rules (unique, publish required) in `src/lib/validation.ts`
- [ ] T014 Services: Audit logging util in `src/lib/utils.ts` or `src/lib/db.ts`
 - [X] T015 API: `POST /api/images/direct-upload` in `src/app/api/images/direct-upload/route.ts`（返回 {upload_url,image_id,form_data}）
 - [X] T016 API: `/api/assets` GET/POST in `src/app/api/assets/route.ts`
 - [X] T017 API: `/api/assets/[id]` PUT/DELETE in `src/app/api/assets/[id]/route.ts`
 - [X] T018 API: `/api/collections/[id]/assets` POST/PUT in `src/app/api/collections/[id]/assets/route.ts`
 - [X] T019 API: `/api/collections/[id]/assets/[assetId]` DELETE in `src/app/api/collections/[id]/assets/[assetId]/route.ts`
- [X] T020 Admin UI: `/admin/years` page `src/app/(admin)/years/page.tsx` with data-testid（建立/編輯/刪除/排序/錯誤訊息）
- [X] T021 Admin UI: `/admin/collections` page `src/app/(admin)/collections/page.tsx` with data-testid（篩選/建立/編輯/排序/導向）
- [X] T022 Admin UI: `/admin/uploads` page `src/app/(admin)/uploads/page.tsx` with data-testid（直傳/清單/編修/批次刪除/加入作品集）

## Phase 3.4: Integration
- [ ] T023 Connect endpoints to Prisma queries in `src/lib/db.ts` + `src/lib/queries/*`
- [ ] T024 Hook cache invalidation after writes（home/year/collection）
- [ ] T025 Ensure audit logs for create/update/delete/link/unlink/sort/publish in service calls
- [ ] T026 A11y checks: keyboard access, field-error, focus traps for dialogs

## Phase 3.5: Polish
- [ ] T027 [P] Unit tests for validation and unique constraints in `tests/unit/validation.test.ts`
- [ ] T028 [P] Unit tests for viewer interactions/dots mapping（若影響：`tests/unit/dotNavigation.test.tsx`）
- [ ] T029 Performance tuning: image sizes/srcset, preloading next/prev slide
- [ ] T030 [P] Docs updates: quickstart.md verify, README links to new feature quickstart
- [ ] T031 Remove duplication; ensure no-JS baseline fallback（link-based dots）
- [ ] T032 Run Lighthouse/HTML validator/link checker; fix regressions

## Dependencies
- Setup（T001–T004）→ 所有後續
- 測試（T005–T011）→ 對應實作（T012–T022）之前先落地且先失敗
- 模型（T012）→ 服務（T013–T014）→ 端點（T015–T019）→ UI（T020–T022）
- 整合（T023–T026）在核心完成後
- Polish（T027–T032）最後

## Parallel Example
```
# 合法並行範例：
Task: "T005 Contract test direct-upload"
Task: "T006 Contract test assets CRUD"
Task: "T007 Contract test collection-assets link/sort/remove"
Task: "T008 Contract test years CRUD"
Task: "T009 Contract test collections CRUD"
Task: "T010 Integration test admin CMS"
Task: "T011 Integration test image workflow"
```

## Notes
- [P] 任務代表不同檔案、無直接依賴，可平行執行。
- 嚴格遵循 TDD：先寫測試並確定失敗，再開發。
- 所有公開站點修改必符合憲法的靜態優先、可及性與效能預算。
