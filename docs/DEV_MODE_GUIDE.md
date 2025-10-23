# 開發模式指南

## 本地開發環境限制

本專案使用 Cloudflare 服務（D1 資料庫和 R2 儲存），在本地開發時有兩種模式：

### 模式 1: `npm run dev` (快速開發模式)

**優點:**
- 啟動快速
- 熱重載效能好
- 適合前端開發和 UI 調整

**限制:**
- ⚠️ Cloudflare R2 儲存不可用（圖片無法載入）
- ⚠️ Cloudflare D1 資料庫不可用（某些 API 路由會失敗）
- 圖片路由 (`/images/[id]/[variant]`) 會返回 503 錯誤和提示訊息

**使用時機:**
- 開發不需要圖片或資料庫的功能
- 前端 UI/UX 調整
- 樣式和動畫開發

### 模式 2: `npm run dev:worker` (完整功能模式)

**優點:**
- ✅ 完整的 Cloudflare 綁定支援
- ✅ R2 儲存可用
- ✅ D1 資料庫可用
- 與生產環境行為一致

**限制:**
- 啟動較慢
- 需要先執行 `npm run opennext` 建構

**使用時機:**
- 測試圖片上傳和顯示
- 測試需要資料庫的功能
- 準備部署前的完整測試

**執行步驟:**
```bash
# 1. 建構 OpenNext
npm run opennext

# 2. 使用 Wrangler 啟動開發伺服器
npm run dev:worker
```

## 錯誤訊息說明

### 圖片載入失敗 (503 錯誤)

如果在 `npm run dev` 模式下看到以下錯誤：

```
[cloudflare] Context not available in dev mode. Use "npm run dev:worker" for full Cloudflare bindings.
[images] R2 bucket not configured in dev mode
GET /images/xxx/cover 503
```

**原因:** 本地開發環境沒有 Cloudflare R2 綁定

**解決方案:**
1. 使用 `npm run dev:worker` 進行開發
2. 或者在開發時使用佔位圖片
3. 部署到 staging 環境進行測試

### D1 資料庫不可用

如果 API 路由返回 "D1 binding missing" 錯誤：

**解決方案:**
- 使用 `npm run dev:worker` 模式
- 確保 `wrangler.toml` 中已正確配置 D1 綁定

## 部署環境

在 Cloudflare Pages 上部署後，所有功能都會正常運作，因為生產環境有完整的 Cloudflare 綁定。

### Staging 環境
```bash
npm run deploy:staging
```

### Production 環境
```bash
npm run deploy
```

## 技術細節

本專案使用 `@opennextjs/cloudflare` 來橋接 Next.js 和 Cloudflare Workers。

在開發模式下，我們實現了優雅的降級處理：
- 嘗試獲取 Cloudflare 上下文
- 如果失敗且在開發環境，返回友好的錯誤訊息
- 在生產環境，拋出錯誤以確保問題被發現

相關程式碼：
- `src/lib/cloudflare.ts` - Cloudflare 上下文輔助函數
- `src/app/images/[id]/[variant]/route.ts` - 圖片服務路由
- `src/app/api/uploads/r2/route.ts` - R2 上傳 API
