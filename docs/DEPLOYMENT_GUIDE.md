# 部署指南

## 🚀 生產環境部署方案

### 靜態輸出前置作業

部署前建議執行自動化檢查；若需要離線備份也可以同步匯出資料樹與站點地圖快照：

```bash
npm run generate:sitemap
npm run ci:link-check
npm run lighthouse
```

若需要快照備援，可額外執行 `npm run generate:data:year-location` 將年份 / 地點 / 作品集資料輸出為 JSON；前台現已直接透過 Prisma 讀取資料庫，因此未匯出時也會即時呈現最新狀態。正式站點的 `/sitemap.xml` 由 App Router runtime 產生，會直接讀取目前公開資料；`npm run generate:sitemap` 只輸出 `public/sitemap-static.xml`，用於離線檢查或快照備援。

### 方案一：Cloudflare Access（推薦）

#### 優點
- 企業級身份驗證
- 支援多種身份提供商（Google, GitHub, Email OTP 等）
- 自動注入身份驗證 headers
- 無需修改前端代碼
- 免費方案支援最多 50 個用戶

#### 設置步驟

1. **在 Cloudflare Dashboard 創建 Access 應用程式**
   ```
   1. 前往 Cloudflare Dashboard > Zero Trust > Access > Applications
   2. 點擊 "Add an application" > "Self-hosted"
   3. 設置應用程式：
      - Application name: UTOA Photography Admin
      - Session Duration: 24 hours
      - Application domain: your-domain.com
   ```

2. **配置保護路徑**
   ```
   保護以下路徑：
   - /admin
   - /admin/*
   ```

3. **設置身份驗證策略**
   ```
   Policy name: Admin Access
   Action: Allow
   
   Include:
   - Emails: your-email@example.com（你的管理員 email）
   
   或使用 Email domain:
   - Email domain: yourdomain.com（允許整個網域）
   ```

4. **環境變數設置**
   ```bash
   # .env.production
   NODE_ENV=production
   BYPASS_ACCESS_FOR_TESTS=false  # 生產環境必須設為 false
   ADMIN_EMAILS=your-email@example.com,another-admin@example.com
   ```

5. **部署後測試**
   ```
   1. 訪問 https://your-domain.com/admin
   2. 會自動跳轉到 Cloudflare Access 登入頁面
   3. 登入後可以正常使用所有功能
   ```

---

### 方案二：簡單 Token 驗證（適合快速部署）

如果你想要更簡單的方案，可以用環境變數中的固定 token。

#### 修改代碼

創建一個新的輔助函數：

```typescript
// src/lib/simple-auth.ts
export function validateSimpleToken(request: Request): boolean {
  const bypass = process.env.BYPASS_ACCESS_FOR_TESTS === 'true' || 
                 process.env.NODE_ENV === 'development';
  
  if (bypass) return true;
  
  // 從環境變數讀取 API token
  const validToken = process.env.API_TOKEN;
  if (!validToken) {
    console.warn('API_TOKEN not set in production');
    return false;
  }
  
  const auth = request.headers.get('authorization');
  if (!auth || !auth.startsWith('Bearer ')) {
    return false;
  }
  
  const token = auth.split(' ')[1];
  return token === validToken;
}
```

#### 前端發送請求時帶上 token

```typescript
// 在前端代碼中（例如 admin/collections/page.tsx）
const response = await fetch('/api/collections', {
  method: 'PUT',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${process.env.NEXT_PUBLIC_API_TOKEN}`
  },
  body: JSON.stringify(data)
});
```

#### 環境變數設置

```bash
# .env.production
NODE_ENV=production
API_TOKEN=your-super-secret-token-here-generate-a-long-random-string
NEXT_PUBLIC_API_TOKEN=your-super-secret-token-here-generate-a-long-random-string
```

**生成安全的 token：**
```bash
# 在終端機執行
openssl rand -base64 32
# 或
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

---

## 📦 部署平台選擇

### Vercel（推薦）

```bash
# 安裝 Vercel CLI
npm i -g vercel

# 部署
vercel

# 設置環境變數
vercel env add NODE_ENV production
vercel env add DATABASE_URL your-database-url
```

### Cloudflare Pages

```bash
# 使用 Wrangler
npm run deploy

# 或
wrangler pages deploy
```

### 自託管（VPS/Docker）

```bash
# 1. 建置專案
npm run build

# 2. 啟動
NODE_ENV=production npm start
```

---

## 🔐 安全檢查清單

部署前請確認：

- [ ] `BYPASS_ACCESS_FOR_TESTS` 設為 `false`
- [ ] `NODE_ENV` 設為 `production`
- [ ] 資料庫使用生產環境的 URL
- [ ] API tokens 不要 commit 到 Git
- [ ] 啟用 HTTPS
- [ ] 設置 CORS 政策（如果需要）
- [ ] 檢查所有環境變數都已設置
- [ ] 新增或調整的地點 slug 符合 `^[a-z0-9-]+-[0-9]{2}$`，以維持路由一致性

---

## 🧪 部署後測試

1. **測試身份驗證**
   ```bash
   # 未登入應該被拒絕
   curl https://your-domain.com/admin
   # 應該返回 401 或重定向到登入頁
   ```

2. **測試 API**
   ```bash
   # 測試需要身份驗證的 API
   curl -X PUT https://your-domain.com/api/years/[id] \
     -H "Authorization: Bearer your-token" \
     -H "Content-Type: application/json" \
     -d '{"label":"2025"}'
   ```

3. **測試前台**
   ```bash
   # 前台應該可以正常訪問
   curl https://your-domain.com/2024
   ```

4. **檢視 Lighthouse 結果**
   部署完成後可下載 `test-results/lighthouse` 目錄內的報告（JSON 與 HTML），確認核心網路指標是否落在專案既定的警示門檻（LCP ≦ 3.5s、無重大可及性錯誤）。

---

## 🐛 常見問題

### Q: 部署後出現 401 錯誤
A: 檢查：
1. 環境變數是否正確設置
2. Cloudflare Access 是否正確配置
3. Token 是否正確傳遞

### Q: 開發環境和生產環境切換
A: 使用不同的 `.env` 檔案：
- `.env.local` - 本地開發
- `.env.production` - 生產環境

### Q: 如何添加新的管理員
A: 
- 方案一：在 Cloudflare Access 添加新的 email
- 方案二：更新 `ADMIN_EMAILS` 環境變數

---

## 📚 相關文件

- [Cloudflare Access 文件](https://developers.cloudflare.com/cloudflare-one/applications/)
- [Next.js 部署文件](https://nextjs.org/docs/deployment)
- [環境變數最佳實踐](https://nextjs.org/docs/basic-features/environment-variables)
