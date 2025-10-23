# D1 直接查詢修復總結

## 問題診斷

在生產環境（Cloudflare Workers）中，Prisma 無法正常工作，錯誤訊息：
```
[unenv] fs.readdir is not implemented yet!
```

這是因為 Prisma 需要訪問文件系統來讀取 schema，但 Cloudflare Workers 環境不支持 Node.js 的 `fs` 模組。

## 解決方案

創建了直接使用 D1 SQL 查詢的輔助函數，在生產環境中繞過 Prisma。

### 新增文件

1. **`src/lib/d1-queries.ts`** - D1 直接查詢函數
   - `shouldUseD1Direct()` - 檢測是否應該使用 D1 直接查詢
   - `d1GetYears()` - 獲取年份列表
   - `d1CreateYear()` - 創建年份
   - `d1GetAssets()` - 獲取資產列表
   - `d1CreateAsset()` - 創建資產
   - `d1AssetExists()` - 檢查資產是否存在
   - `d1CreateAuditLog()` - 創建審計日誌

### 修改文件

1. **`src/app/api/years/route.ts`**
   - GET: 在生產環境使用 `d1GetYears()`，開發環境使用 Prisma
   - POST: 在生產環境使用 `d1CreateYear()`，開發環境使用 Prisma

2. **`src/app/api/assets/route.ts`**
   - GET: 在生產環境使用 `d1GetAssets()`，開發環境使用 Prisma
   - POST: 在生產環境使用 `d1CreateAsset()`，開發環境使用 Prisma

3. **`src/lib/db.ts`**
   - 更新為使用統一的 `getD1Database()` 函數

4. **`next.config.ts`**
   - 修正 CSP，允許 Cloudflare Insights 腳本

## 工作原理

```typescript
// 自動檢測環境並選擇正確的查詢方法
if (shouldUseD1Direct()) {
  // 生產環境：使用原生 D1 SQL 查詢
  years = await d1GetYears({ status, order });
} else {
  // 開發環境：使用 Prisma ORM
  years = await getYears({ status, order });
}
```

## 優勢

1. ✅ **生產環境**：使用原生 D1 SQL，避免 Prisma 的文件系統依賴
2. ✅ **開發環境**：繼續使用 Prisma，保持良好的開發體驗
3. ✅ **類型安全**：D1 查詢函數有完整的 TypeScript 類型定義
4. ✅ **向後兼容**：不影響現有的開發流程

## 部署步驟

```bash
# 1. 構建
npm run build

# 2. 打包為 OpenNext
npm run opennext

# 3. 部署到 Cloudflare
npm run deploy
```

## 測試

部署後：

1. **訪問診斷頁面**：`https://utoa.studio/admin/diagnostics`
   - 應該看到 Prisma Year Count 有值（不再是 undefined）
   - 不應該有 `fs.readdir` 錯誤

2. **測試年份 API**：
   - GET `https://utoa.studio/api/years` - 應該返回年份列表
   - POST `https://utoa.studio/api/admin/years` - 應該能創建新年份

3. **測試資產 API**：
   - GET `https://utoa.studio/api/admin/assets` - 應該返回資產列表
   - POST `https://utoa.studio/api/admin/assets` - 應該能創建新資產

## 後續優化

如果其他 API 路由也出現類似問題，可以使用相同的模式：

1. 在 `src/lib/d1-queries.ts` 中添加對應的 D1 查詢函數
2. 在 API 路由中使用 `shouldUseD1Direct()` 條件判斷
3. 生產環境使用 D1 直接查詢，開發環境使用 Prisma
