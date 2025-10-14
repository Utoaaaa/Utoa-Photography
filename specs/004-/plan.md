# Implementation Plan: 首頁年份地點階層改版

**Branch**: `004-` | **Date**: 2025-10-10 | **Spec**: [`specs/004-/spec.md`](./spec.md)
**Input**: Feature specification from `/specs/004-/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

從首頁導覽到 collections 導入年份 → 地點 → 集合的固定層級，移除舊有雙層網址並確保後台維運流程一次完成。計畫以 Next.js App Router 靜態輸出結合 Prisma schema 擴充（新增 `Location` 與 `collection.location_id`）實作，並同步改寫首頁、地點詳情與後台管理介面。

## Technical Context

<!--
  ACTION REQUIRED: Replace the content in this section with the technical details
  for the project. The structure here is presented in advisory capacity to guide
  the iteration process.
-->

**Language/Version**: TypeScript 5.x, React 19, Next.js 15 App Router  
**Primary Dependencies**: Prisma 6.16、Next.js App Router、Tailwind、GSAP/Lenis（需評估是否影響首頁）  
**Storage**: SQLite（Prisma `sqlite` datasource；部署仍走靜態 seed）  
**Testing**: Jest（unit/integration）、Playwright（e2e）、contract tests、Lighthouse/Linkinator CI  
**Target Platform**: 靜態輸出部署至 Cloudflare（OpenNext build → CDN）
**Project Type**: 單一 Next.js web 專案（`src/app`）  
**Performance Goals**: 符合 Constitution LCP ≤ 2.5s、JS ≤ 150KB、CSS ≤ 50KB，同步達成 SC-002  
**Constraints**: 無 SSR、禁止 optional call、0 top-level side effects、前台需無 JS 仍可瀏覽  
**Scale/Scope**: 首頁與單一地點頁、後台年份/地點/collection 管理路徑、Prisma schema 與 seed 更新

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **Static-First Delivery**: 方案維持 Next.js 靜態輸出（`npm run opennext`），所有地點/年份資料由 build-time Prisma 查詢後嵌入頁面或 JSON。待確認：後台 CRUD 仍透過現有 API（需確保無 server side runtime）。
- **Accessibility & Performance Budgets**: 首頁新增地點卡片需控制資產大小（懸浮動畫視情況改用 CSS，避免額外 JS）。需驗證 lazy load 與 images responsive。
- **Progressive Enhancement**: 年份/地點切換必須在無 JS 下仍可連結到對應 anchor 或分頁（考慮 server-rendered卡片 + anchor 链接）。
- **Testing & CI Gates**: 需新增單元/整合測試覆蓋新的 Prisma 關聯與前後台流程，CI 仍會執行（無違規）。
- **Versioning & URLs**: URL 變更屬重大改動，需記錄變更並更新 sitemap；本計畫將移除舊路徑，需於部署前確保全部靜態連結更新完成。
- **Browser Safety & Optional Chaining Ban**: 更新 React 組件時遵守既有 guard pattern，新增 hook 時避免可選呼叫。

**Post-Design Recheck (Phase 1)**: 研究與設計已確立純靜態資料匯出流程、Prisma schema 更新與後台阻擋未指派 collection 的驗證；未有 Constitution 違規，僅需在實作時確保首頁動畫不超過 JS 預算並持續監控舊連結 404。所有核心 gates 標示為 ✅。

## Project Structure

### Documentation (this feature)

```
specs/[###-feature]/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)
<!--
  ACTION REQUIRED: Replace the placeholder tree below with the concrete layout
  for this feature. Delete unused options and expand the chosen structure with
  real paths (e.g., apps/admin, packages/something). The delivered plan must
  not include Option labels.
-->

```
src/
├── app/
│   ├── (site)/home/...          # 首頁與地點展示（實際路徑待確認）
│   ├── (site)/[year]/[location]/page.tsx
│   └── (admin)/...              # 後台年份/collection 管理 UI
├── components/                  # UI 組件、卡片、導航
├── lib/                         # 資料讀取、型別、utility
└── data/ or loaders/            # 若需新增靜態資料抓取層

prisma/
├── schema.prisma                # 新增 Location 模型與關聯
└── seed.ts                      # 更新預設資料

tests/
├── unit/                        # Prisma service 與 helper 測試
├── integration/                 # API route / 前台整合測試
└── contract/                    # (必要時) 更新 contracts
```

**Structure Decision**: 延續單一 Next.js 專案結構；本次將觸及 `src/app` 前後台頁面、共用 `src/components`、`src/lib` 資料讀取層，以及 `prisma/` schema 與 seed。測試維持於 `tests/unit`、`tests/integration`，視需要補 Playwright 覆蓋地點導覽。

## Complexity Tracking

*Fill ONLY if Constitution Check has violations that must be justified*

無需填寫（本計畫無 Constitution 違規）。
