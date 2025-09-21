# 專案架構總覽（高階 README 擴充）

此檔為 Utoa's Photography 的高階架構與主要檔案說明，方便快速了解專案現在的狀態與責任範圍。

## 概要
- 技術：Next.js (App Router) + TypeScript、Prisma（SQLite config）、Jest 測試、Cloudflare Images 支援跡象。
- 功能重點：依年份與作品集展示照片、後台管理 (admin)、影像直接上傳 API、publishing workflow（版本與發布歷史）、測試覆蓋（contract/integration/unit）。

## 快速啟動
```bash
npm install
npm run dev
npm test
```

## 高階檔案樹（重點）
- package.json / package-lock.json：依賴與啟動腳本
- README.md：專案總覽（已存在）
- ARCHITECTURE.md：本檔 — 高階架構說明
- tsconfig.json、.prettierrc、eslint.config.mjs、next.config.ts：TypeScript / 格式 / Next 設定
- prisma/
  - schema.prisma：資料模型（Year、Collection、Asset、CollectionAsset、PublishHistory、SEOMetadata 等）
  - migrations/：歷史遷移 SQL
  - seed.ts / seed.js：種子資料腳本
- src/
  - src/app/：Next.js App Router（包含 (site) 與 (admin) route group、layout、globals.css）
  - src/app/api/：API route handlers（years / collections / images / publishing / revalidate）
  - src/components/：UI 與 admin 元件
  - src/components/providers/：跨元件 providers（例如 SmoothScrollProvider）
  - src/components/ui/：共用 UI 元件（Breadcrumb、PhotoViewer、YearGrid 等）
  - src/lib/：共用邏輯（db.ts、queries、images、cache、auth、seo、utils、validation）
  - src/lib/queries/：封裝的 DB 查詢（collections.ts、years.ts 等）
- public/：靜態資源（svg、favicon 等）
- specs/：設計文件、API contract（api-spec.yaml）與任務規格
- tests/
  - tests/contract/：API 合約測試
  - tests/integration/：整合 / 流程測試
  - tests/unit/：單元測試
- tools/：專用工具或測試套件（tools/publishing）
- middleware.ts、wrangler.toml、lighthouserc.json：中介 / 部署 / 測試設定

## 主要檔案與用途（摘要）
- prisma/schema.prisma
  - 定義資料模型：Year、Collection（含 publishing 欄位）、Asset（Cloudflare Images id 為主鍵）、CollectionAsset、PublishHistory（snapshot）與 SEOMetadata。
  - 關注點：版本管理、publish history snapshot、索引（order_index）以維持排序。
- src/app/layout.tsx、globals.css
  - 全域 layout、字型與 CSS（RootLayout 設定、Google 字型）。
- src/app/(site)/
  - 公開網站頁面：年份頁、作品集頁、首頁等動態路由（例如 /[year]/[collection]）。
- src/app/(admin)/
  - 管理後台：上傳、管理 collections & assets、publishing 管理介面。
- src/app/api/*
  - REST/Route endpoints：years、collections、images (direct-upload)、publishing（publish/unpublish/versions/checklist）、revalidate。
  - 這些 route 檔負責輸入驗證、DB 操作、與 Cloudflare Images / 儲存互動。
- src/lib/db.ts
  - Prisma client 單例（避免多次建立），包含簡易的 audit logging（publish/unpublish 寫入 publish_history）與取得 audit trail 的 helper。
- src/lib/queries/collections.ts、years.ts
  - 封裝 DB 查詢並處理錯誤，部分查詢使用 Next 的 unstable_cache 與 cache tag（提高效能與 revalidate 管理）。
- tests/
  - contract tests 用於驗證 API 與規格一致；integration tests 驗證整體流程（publishing 與 image workflow）。

## 責任範圍快速對應（建議分工）
- 後端 / 資料層：prisma/、src/lib/db.ts、src/lib/queries/*、src/app/api/**
- 前端 / UI：src/app/(site)/**、src/components/**、layout / globals.css
- 後台 / 商業流程：src/app/(admin)/**、src/components/admin/**
- 測試 / 品質：tests/**、tools/run-contract-tests.js、tools/publishing/**
- 部署 / infra：next.config.ts、wrangler.toml、環境變數（DATABASE_URL、Cloudflare API keys）

## 維護與風險提示
- Prisma migrations：保持 migration 與 schema 同步；production DB 變更需謹慎。
- Publish workflow：PublishHistory snapshot 與 version 管理是關鍵，修改 schema 時注意相容性。
- 測試覆蓋：contract tests 顯示有 API 合約要求，新增 endpoint 或變更回傳需同步更新 contract tests。
- 環境變數與部署：Cloudflare Images 與可能的 Workers/Pages 部署需正確設置 wrangler.toml 與相關金鑰。

## 建議下一步（可由我代為執行）
1. 產生逐 endpoint 摘要：讀取 `src/app/api/**/route.ts` 並列出每個 endpoint 的行為與參數。  
2. 產生逐檔詳細說明：README 擴充的詳細版（每個關鍵檔案 5–15 行說明）。  
3. 在 Act mode 下執行：跑 unit/integration/contract tests，或啟動 dev server（需你允許我執行命令）。

---

檔案自動生成：此檔為自動產出，可直接提交到 repo 作為開發文檔補充。
