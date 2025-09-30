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
- **稽核日誌查詢**: `GET /api/audit?entity_type=year&entity_id=2024` (支援時間過濾、分頁)
- **清理預覽**: `GET /api/audit/cleanup-preview` (查看 180 天外的日誌,不執行刪除)

## Troubleshooting
- 401/403：確認 `BYPASS_ACCESS_FOR_TESTS=true`（本地/CI 測試），或 Cloudflare Access 設定。
- 409 刪除衝突：先移除 `collection_assets` 關聯再刪除資產。
- 排序不生效：確認 body 結構（assetIds 或 items[ {assetId, order_index} ]）。
- **稽核日誌查詢失敗**: 確認 Prisma migration `20250930125007_add_audit_logs` 已執行,檢查 `audit_logs` 表是否存在。

## Audit System (New in T063)

### 查詢操作記錄
```bash
# 查詢特定 Year 的所有操作
curl "http://localhost:3000/api/audit?entity_type=year&entity_id=2024"

# 查詢最近 7 天的刪除操作
curl "http://localhost:3000/api/audit?action=delete&from=$(date -u -v-7d +%Y-%m-%dT%H:%M:%SZ)"

# 分頁查詢 (每頁 50 筆,跳過前 100 筆)
curl "http://localhost:3000/api/audit?limit=50&offset=100"
```

### 預覽待清理日誌
```bash
# 查看超過 180 天的日誌 (不執行刪除)
curl "http://localhost:3000/api/audit/cleanup-preview"
# 回傳: { count, cutoff_date, oldest_log_date, preview: [...] }
```

### 程式化記錄操作
```typescript
import { logAudit } from '@/lib/db';

// 記錄 Year 建立操作
await logAudit({
  actor: 'user_123',
  entity_type: 'year',
  entity_id: '2024',
  action: 'create',
  meta: { label: '2024' }
});
```

**完整文件**: 參閱 `AUDIT_API_USAGE.md`
