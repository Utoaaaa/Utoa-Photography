# 🚨 照片無法顯示 - 立即修復步驟

## 問題診斷

您的照片顯示頁面返回 404 錯誤,原因是:
- 圖片路由 `/images/[id]/[variant]` 沒有正確部署到 Cloudflare Workers

## ✅ 立即修復 (3 步驟)

### 步驟 1: 確認您的部署方式

您提到使用 **GitHub 連接 Cloudflare 部署**。請確認:

**選項 A: 使用 GitHub Actions (推薦)**
- 查看 `.github/workflows/deploy-staging.yml` 檔案
- 每次 push 到 `main` 分支會自動部署

**選項 B: Cloudflare Dashboard 手動連接**
- 在 Cloudflare Dashboard 設置了 GitHub 連接
- Cloudflare 自動拉取並建置

### 步驟 2: 重新觸發正確的部署

#### 如果使用 GitHub Actions:

```bash
# 觸發重新部署
git commit --allow-empty -m "fix: 重新建置以修復圖片路由"
git push origin main
```

然後:
1. 前往 GitHub Repository > Actions
2. 查看 "Deploy Staging (Cloudflare Workers)" workflow
3. 確認所有步驟都成功 ✅
4. 特別注意 "Build (OpenNext for Cloudflare)" 這一步

#### 如果使用 Cloudflare Dashboard:

⚠️ **重要**: Cloudflare Pages 的自動建置可能使用了錯誤的命令!

**正確的建置設定應該是**:
```
建置命令: npx @opennextjs/cloudflare@latest build
輸出目錄: .open-next/worker
Framework preset: None
```

如果設置不正確,請:
1. 前往 Cloudflare Dashboard > Workers & Pages
2. 選擇您的專案
3. Settings > Builds & deployments
4. 更新建置設定
5. 觸發重新部署

### 步驟 3: 驗證修復

部署完成後,測試以下 URL:

```bash
# 1. 測試首頁
open https://utoa.studio/

# 2. 測試照片頁面 (根據您的實際路徑調整)
open https://utoa.studio/2024/hsinchu/123

# 3. 測試圖片路由 (打開開發者工具查看)
# 圖片應該從類似這樣的 URL 載入:
# https://utoa.studio/images/YOUR_IMAGE_ID/medium
```

---

## 🔍 詳細檢查

如果照片仍然無法顯示:

### 1. 檢查 GitHub Actions 日誌

```bash
# 查看最新的 workflow 執行
# 前往: https://github.com/Utoaaaa/Utoa-Photography/actions
```

確認以下步驟都成功:
- ✅ Install dependencies
- ✅ Build (OpenNext for Cloudflare)
- ✅ Deploy to staging (workers.dev)

### 2. 檢查 Cloudflare Workers 日誌

```bash
# 在本地執行 (需要先安裝 wrangler)
npx wrangler tail --env production

# 或者在 Cloudflare Dashboard:
# Workers & Pages > 您的專案 > Logs
```

訪問照片頁面,查看是否有錯誤日誌。

### 3. 檢查 R2 Bucket 圖片

```bash
# 列出 R2 bucket 中的圖片
npx wrangler r2 object list utoa-photography-assets --env production | head -20

# 應該看到類似:
# images/abc123/medium.webp
# images/abc123/thumb.webp
# images/xyz789/medium.webp
```

如果沒有看到圖片,說明圖片沒有正確上傳到 R2。

### 4. 測試圖片路由

打開瀏覽器開發者工具 (F12),然後:

1. 訪問照片頁面
2. 切換到 Network 標籤
3. 篩選 Images
4. 查看失敗的圖片請求
5. 檢查 Request URL 和 Status Code

**預期**:
- Request URL: `https://utoa.studio/images/{id}/medium`
- Status: `200 OK`
- Content-Type: `image/webp` 或 `image/jpeg`

**實際 (問題)**:
- Status: `404 Not Found`

---

## 🎯 根本原因分析

### 為什麼會發生這個問題?

1. **部署流程不完整**
   - 只執行了 `npm run build` (Next.js 建置)
   - 沒有執行 `npm run opennext` (OpenNext 適配層建置)
   - 導致動態路由沒有正確部署到 Cloudflare Workers

2. **建置命令錯誤**
   - 如果使用 Cloudflare Dashboard 自動建置
   - 可能使用了錯誤的建置命令
   - 應該使用 `npx @opennextjs/cloudflare@latest build`

3. **Worker 配置問題**
   - `.open-next/worker.js` 沒有正確生成
   - 或 `wrangler.toml` 的 `main` 指向錯誤

---

## 📋 完整的建置流程

正確的建置流程應該是:

```bash
# 1. 安裝依賴
npm ci

# 2. Next.js 建置
npm run build
# 生成 .next/ 目錄

# 3. OpenNext 建置 (關鍵!)
npm run opennext
# 生成 .open-next/ 目錄
# 包含 worker.js 和 server-functions/

# 4. 部署到 Cloudflare
wrangler deploy --env production
```

### 檢查建置產物

```bash
# 應該看到這些檔案:
ls -la .open-next/
# - worker.js (Worker 入口點)
# - server-functions/default/index.mjs (Next.js handler)
# - assets/ (靜態資源)

# 檢查 worker.js 是否存在
cat .open-next/worker.js | head -20
```

---

## 🔧 緊急修復 (本地手動部署)

如果 GitHub Actions 有問題,可以本地手動部署:

```bash
# 1. 確保環境正確
node --version  # 應該是 v20.x
npm --version

# 2. 完整建置
npm ci
npm run build
npm run opennext

# 3. 檢查建置產物
ls -la .open-next/worker.js
# 應該存在且不為空

# 4. 部署 (需要 Cloudflare API Token)
npx wrangler deploy --env production
```

---

## ✅ 成功指標

部署成功後,您應該看到:

1. **GitHub Actions**:
   - ✅ All checks passed

2. **照片頁面**:
   - ✅ 照片正常顯示
   - ✅ 無 404 錯誤

3. **開發者工具 Network 標籤**:
   - ✅ `/images/{id}/medium` 返回 200
   - ✅ Content-Type: image/webp

4. **Cloudflare Dashboard**:
   - ✅ Worker 顯示為 "Deployed"
   - ✅ 無錯誤日誌

---

## 🆘 仍然無法解決?

如果執行上述步驟後照片仍然無法顯示,請提供:

1. GitHub Actions 的完整日誌
2. Cloudflare Workers 的錯誤日誌
3. 瀏覽器開發者工具中失敗的圖片請求 URL
4. 您使用的具體部署方式 (GitHub Actions / Cloudflare Dashboard)

---

## 📚 相關文件

- [完整部署指南](./docs/CLOUDFLARE_DEPLOYMENT.md)
- [架構文件](./docs/ARCHITECTURE.md)
- [開發模式指南](./docs/DEV_MODE_GUIDE.md)
