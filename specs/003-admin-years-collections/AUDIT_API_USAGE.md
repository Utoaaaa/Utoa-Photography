# Audit API 使用指南

本系統實作基於資料庫的稽核日誌 (Audit Log) 機制,符合 **FR-009** 資料保留政策 (≥180 天)。

---

## 📦 資料模型

### AuditLog (Prisma Schema)

```prisma
model AuditLog {
  id           String   @id @default(uuid())
  actor        String   // 執行者 ID (如 user ID 或 "system")
  actor_type   String   @default("user") // 執行者類型 ("user", "system", "api")
  entity_type  String   // 實體類型 (如 "year", "collection", "asset")
  entity_id    String   // 實體 ID
  action       String   // 操作類型 (如 "create", "update", "delete", "publish")
  timestamp    DateTime @default(now())
  meta         String?  // JSON 格式的額外資料 (如 change details)
  
  @@index([entity_type, entity_id])
  @@index([timestamp])
  @@map("audit_logs")
}
```

**索引策略**:
- `[entity_type, entity_id]`: 快速查詢特定實體的所有操作記錄
- `[timestamp]`: 支援時間範圍查詢與保留期清理

---

## 🔌 API 端點

### 1. 查詢稽核日誌 (GET /api/audit)

**描述**: 查詢稽核日誌,支援多維度過濾與分頁。

**請求參數** (Query String):

| 參數 | 類型 | 必填 | 說明 | 範例 |
|------|------|------|------|------|
| `entity_type` | string | 否 | 過濾實體類型 | `year`, `collection`, `asset` |
| `entity_id` | string | 否 | 過濾特定實體 ID | `550e8400-e29b-41d4-a716-446655440000` |
| `action` | string | 否 | 過濾操作類型 | `create`, `update`, `delete`, `publish` |
| `from` | ISO 8601 | 否 | 起始時間 (含) | `2025-01-01T00:00:00Z` |
| `to` | ISO 8601 | 否 | 結束時間 (不含) | `2025-12-31T23:59:59Z` |
| `limit` | number | 否 | 每頁筆數 (預設 100,最大 500) | `50` |
| `offset` | number | 否 | 跳過筆數 (預設 0) | `100` |

**回應格式** (JSON):

```json
{
  "data": [
    {
      "id": "log_abc123",
      "actor": "user_xyz",
      "actor_type": "user",
      "entity_type": "year",
      "entity_id": "2024",
      "action": "create",
      "timestamp": "2025-09-30T10:15:30Z",
      "meta": "{\"label\": \"2024\"}"
    }
  ],
  "pagination": {
    "limit": 100,
    "offset": 0,
    "total": 247,
    "has_more": true
  }
}
```

**使用範例**:

```typescript
// 1. 查詢特定 Year 的所有操作記錄
const response = await fetch('/api/audit?entity_type=year&entity_id=2024');
const { data } = await response.json();

// 2. 查詢最近 7 天的刪除操作
const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
const url = `/api/audit?action=delete&from=${sevenDaysAgo}`;
const response = await fetch(url);

// 3. 分頁查詢所有日誌
async function fetchAllLogs() {
  let offset = 0;
  const limit = 100;
  const allLogs = [];
  
  while (true) {
    const res = await fetch(`/api/audit?limit=${limit}&offset=${offset}`);
    const { data, pagination } = await res.json();
    allLogs.push(...data);
    
    if (!pagination.has_more) break;
    offset += limit;
  }
  
  return allLogs;
}
```

---

### 2. 預覽清理資料 (GET /api/audit/cleanup-preview)

**描述**: 預覽超過 180 天保留期的稽核日誌 (唯讀,不執行刪除)。

**請求參數**: 無

**回應格式** (JSON):

```json
{
  "retention_days": 180,
  "cutoff_date": "2025-04-03T12:30:45Z",
  "count": 523,
  "oldest_log_date": "2024-03-15T08:22:10Z",
  "preview": [
    {
      "id": "log_old_1",
      "entity_type": "collection",
      "entity_id": "col_abc",
      "action": "update",
      "timestamp": "2024-03-15T08:22:10Z"
    },
    {
      "id": "log_old_2",
      "entity_type": "year",
      "entity_id": "2023",
      "action": "create",
      "timestamp": "2024-03-16T09:15:30Z"
    }
    // ... (最多 10 筆樣本)
  ]
}
```

**欄位說明**:
- `retention_days`: 保留天數 (固定 180 天)
- `cutoff_date`: 截止日期 (此日期之前的日誌應清理)
- `count`: 待清理日誌總數
- `oldest_log_date`: 最舊日誌的時間戳記
- `preview`: 最多 10 筆樣本 (用於審核)

**使用範例**:

```typescript
// 檢查待清理日誌數量
const response = await fetch('/api/audit/cleanup-preview');
const { count, cutoff_date, preview } = await response.json();

console.log(`${count} logs older than ${cutoff_date} are eligible for cleanup`);
console.log('Sample logs:', preview);
```

---

## 🛠️ 程式化寫入日誌

### 使用 `logAudit` 函數

**位置**: `src/lib/db.ts`

**函數簽名**:

```typescript
async function logAudit(params: {
  actor: string;         // 執行者 ID
  actor_type?: string;   // 執行者類型 (預設 "user")
  entity_type: string;   // 實體類型
  entity_id: string;     // 實體 ID
  action: string;        // 操作類型
  meta?: Record<string, any>; // 額外資料 (自動 JSON 序列化)
}): Promise<void>
```

**使用範例**:

```typescript
import { logAudit } from '@/lib/db';

// 1. 記錄 Year 建立操作
await logAudit({
  actor: 'user_123',
  entity_type: 'year',
  entity_id: '2024',
  action: 'create',
  meta: { label: '2024' }
});

// 2. 記錄 Collection 刪除操作
await logAudit({
  actor: 'admin_456',
  entity_type: 'collection',
  entity_id: 'col_abc',
  action: 'delete',
  meta: { reason: 'duplicate entry', year_id: '2023' }
});

// 3. 記錄系統自動操作
await logAudit({
  actor: 'system',
  actor_type: 'system',
  entity_type: 'asset',
  entity_id: 'asset_xyz',
  action: 'auto_compress',
  meta: { original_size_kb: 5120, compressed_size_kb: 2048 }
});
```

**自動記錄位置**:
- ✅ **Years API** (`/api/years`, `/api/years/[id]`): POST, PUT, DELETE 操作已整合
- ✅ **Collections API** (`/api/collections`, `/api/collections/[id]`): POST, PUT, DELETE 操作已整合
- ✅ **Publishing API** (`/api/admin/publish`): Publish 操作已整合
- ⚠️ **Assets API**: 如需記錄上傳/刪除,需手動加入 `logAudit` 調用

---

## 🗑️ 資料保留與清理

### 保留政策 (FR-009)

- **保留期**: ≥180 天 (6 個月)
- **清理機制**: 手動觸發 (使用 `/api/audit/cleanup-preview` 預覽後執行)
- **隱私保護**: 
  - 不記錄個人敏感資料
  - `meta` 欄位僅包含業務相關變更資訊
  - 執行者 ID (`actor`) 去識別化 (如使用 UUID 而非電子郵件)

### 清理流程 (建議)

1. **定期預覽** (每月 1 日)
   ```bash
   curl https://your-domain.com/api/audit/cleanup-preview
   ```

2. **審核樣本**
   - 檢查 `preview` 欄位中的日誌樣本
   - 確認沒有意外包含重要資料

3. **執行清理** (需額外實作)
   ```sql
   -- 手動 SQL 清理 (在資料庫管理工具執行)
   DELETE FROM audit_logs 
   WHERE timestamp < datetime('now', '-180 days');
   ```

4. **驗證結果**
   ```bash
   curl https://your-domain.com/api/audit/cleanup-preview
   # 應回傳 count: 0
   ```

**⚠️ 注意**: 目前系統僅提供預覽 API,實際清理需手動執行 SQL 或建立 cron job。

---

## 📊 常見查詢範例

### 1. 查詢所有發布操作
```typescript
const publishLogs = await fetch('/api/audit?action=publish').then(r => r.json());
```

### 2. 查詢特定 Collection 的操作歷史
```typescript
const collectionHistory = await fetch(
  `/api/audit?entity_type=collection&entity_id=${collectionId}`
).then(r => r.json());
```

### 3. 查詢最近 30 天的刪除操作
```typescript
const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
const deletions = await fetch(
  `/api/audit?action=delete&from=${thirtyDaysAgo}`
).then(r => r.json());
```

### 4. 統計操作類型分布
```typescript
async function getActionStats() {
  const allLogs = await fetchAllLogs(); // 使用上方的分頁函數
  const stats = allLogs.reduce((acc, log) => {
    acc[log.action] = (acc[log.action] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  return stats;
}
// 範例輸出: { create: 150, update: 320, delete: 25, publish: 42 }
```

---

## ✅ 測試覆蓋

### 自動化測試 (T063)

**檔案**: `tests/integration/test_audit_retention.ts`

**測試案例** (7/7 通過):
1. ✅ Audit logs should persist write operations to the database
2. ✅ Query API should support time filtering (from and to params)
3. ✅ Cleanup preview should identify logs older than retention period (180 days)
4. ✅ Cleanup should respect retention period and not delete recent logs
5. ✅ Audit logs should not expose sensitive information
6. ✅ Query API should support pagination with limit and offset
7. ✅ Audit endpoints should validate required parameters

**執行測試**:
```bash
npx jest tests/integration/test_audit_retention.ts
```

---

## 🔐 安全性考量

1. **權限控制**: 
   - `/api/audit` 應加入管理員權限驗證 (目前未實作)
   - 建議整合 `src/lib/auth.ts` 的認證機制

2. **輸入驗證**:
   - ✅ 已驗證時間格式 (ISO 8601)
   - ✅ 已限制分頁參數 (limit ≤ 500)
   - ⚠️ 尚未驗證 SQL injection (Prisma 已防護)

3. **資料隱私**:
   - ✅ 不記錄密碼或 token
   - ✅ `meta` 欄位僅包含業務變更資訊
   - ⚠️ 建議定期審核 `actor` 欄位的去識別化程度

---

## 📚 相關資源

- **規格文件**: `specs/003-admin-years-collections/spec.md` (FR-009)
- **資料模型**: `prisma/schema.prisma` (AuditLog model)
- **Migration**: `prisma/migrations/20250930125007_add_audit_logs/migration.sql`
- **測試文件**: `tests/integration/test_audit_retention.ts`
- **實作文件**: `src/lib/db.ts` (logAudit function)

---

## 🔄 未來改進方向

1. **自動化清理**: 建立 cron job 定期執行清理
2. **權限管理**: 整合 Admin 認證機制到 Audit API
3. **匯出功能**: 提供 CSV/JSON 匯出功能
4. **即時通知**: 敏感操作 (如刪除) 發送警報
5. **視覺化儀表板**: 建立 Admin UI 查看稽核日誌統計圖表

---

**最後更新**: 2025-09-30  
**維護者**: Development Team  
**相關任務**: T063 (Audit log retention policy validation)
