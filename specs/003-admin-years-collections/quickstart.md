# Quickstart: Admin 子系統與 API 最小契約

Branch: 003-admin-years-collections | Date: 2025-09-21

## Prerequisites
- Node.js 20+
- Cloudflare Wrangler CLI
- D1 本地或遠端資料庫可用

## Environment
Create `.env.local` (development) and set in CI:
- `TEST_API_URL` → 直傳端點基底（供 test_image_upload.test.ts）
- `TEST_API_BASE` → 一般 API 基底（/api，供 test_assets_post.ts）
- `BYPASS_ACCESS_FOR_TESTS=true` → 測試跳過 Access 驗證

## Install & Build
```bash
npm install
npm run db:migrate
npm run build
```

## Run Tests
```bash
npm run test:unit
npm run test:integration
npm run test:contract
```

## Common Flows
- 直傳：取得 `/api/images/direct-upload` → 使用 uploadURL 上傳 → `/api/assets` 建立記錄
- 關聯：`POST /api/collections/{id}/assets`；重排：`PUT /api/collections/{id}/assets`

## Troubleshooting
- 401/403：確認 `BYPASS_ACCESS_FOR_TESTS=true`（本地/CI 測試），或 Cloudflare Access 設定。
- 409 刪除衝突：先移除 `collection_assets` 關聯再刪除資產。
- 排序不生效：確認 body 結構（assetIds 或 items[ {assetId, order_index} ]）。
