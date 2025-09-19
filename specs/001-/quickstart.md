# 快速開始指南：攝影作品展示網站

## 概述
這是一個專為攝影師設計的作品展示網站，採用三層式年表導覽（首頁 → 年份 → 作品集），強調極簡留白美學搭配相機元素的幾何設計。

## 技術架構
- **前端**: Next.js 14 App Router + Tailwind CSS + GSAP + Lenis
- **後端**: Next.js API Routes 運行於 Cloudflare Workers
- **資料庫**: Cloudflare D1 (SQLite)
- **媒體儲存**: Cloudflare Images
- **部署**: Cloudflare Workers (via OpenNext)

## 快速設置

### 1. 環境準備
```bash
# 克隆專案
git clone <repository-url>
cd utoa-photography

# 安裝依賴
npm install

# 設置環境變數
cp .env.example .env.local
```

### 2. 必要環境變數
```env
# Cloudflare
CLOUDFLARE_ACCOUNT_ID=your_account_id
CLOUDFLARE_API_TOKEN=your_api_token
CLOUDFLARE_IMAGES_API_TOKEN=your_images_token

# D1 Database
DATABASE_URL=your_d1_database_url
DATABASE_ID=your_d1_database_id

# Next.js
NEXTAUTH_SECRET=your_nextauth_secret
NEXTAUTH_URL=http://localhost:3000

# Cloudflare Access (Admin 保護)
CLOUDFLARE_ACCESS_AUD=your_access_aud
```

### 3. 資料庫初始化
```bash
# 執行 D1 Migration
npm run db:migrate

# 載入測試資料 (可選)
npm run db:seed
```

### 4. 本地開發
```bash
# 啟動開發伺服器
npm run dev

# 平行執行 Tailwind CSS 監控
npm run dev:css
```

## 核心功能驗證

### 前台功能測試

#### 1. 首頁年表導覽
```bash
# 造訪首頁
curl http://localhost:3000/

# 預期結果：
# ✅ Hero 區顯示站名與幾何圖樣
# ✅ 年份方框網格按時間排序
# ✅ 響應式佈局在不同螢幕尺寸正常
```

#### 2. 年份頁作品集瀏覽
```bash
# 造訪年份頁
curl http://localhost:3000/2024

# 預期結果：
# ✅ 左側幾何圖樣，右側作品集列表
# ✅ 作品集按排序顯示，包含標題與摘要
# ✅ 點擊進入作品集詳頁
```

#### 3. 作品集詳頁體驗
```bash
# 造訪作品集頁
curl http://localhost:3000/2024/spring-collection

# 預期結果：
# ✅ 頂部滿版區：左標題右幾何圖樣
# ✅ 內容區：左圖置中右文描述
# ✅ 右側點點條顯示每張照片
# ✅ 點點條點擊切換照片，高亮同步
# ✅ 麵包屑導覽：2024 / Spring Collection
```

### 後台管理測試

#### 1. 存取管理介面
```bash
# 造訪後台（需要 Cloudflare Access 認證）
curl -H "Cf-Access-Jwt-Assertion: $JWT_TOKEN" \
     http://localhost:3000/admin

# 預期結果：
# ✅ 成功進入管理介面
# ✅ 顯示年份、作品集管理選項
```

#### 2. 年份管理
```bash
# 創建新年份
curl -X POST http://localhost:3000/api/years \
     -H "Content-Type: application/json" \
     -d '{"label": "2025", "status": "draft"}'

# 預期結果：
# ✅ 回傳新年份物件含 ID
# ✅ 年份出現在管理列表
```

#### 3. 圖片上傳流程
```bash
# 請求上傳憑證
curl -X POST http://localhost:3000/api/images/direct-upload \
     -H "Content-Type: application/json" \
     -d '{"filename": "photo.jpg", "content_type": "image/jpeg"}'

# 預期結果：
# ✅ 回傳 upload_url 與 image_id
# ✅ 可使用憑證直傳 Cloudflare Images
```

#### 4. 作品集與照片管理
```bash
# 創建作品集
curl -X POST http://localhost:3000/api/years/uuid/collections \
     -H "Content-Type: application/json" \
     -d '{
       "slug": "summer-vibes",
       "title": "Summer Vibes",
       "summary": "夏日氛圍作品集"
     }'

# 加入照片到作品集
curl -X POST http://localhost:3000/api/collections/uuid/assets \
     -H "Content-Type: application/json" \
     -d '{"asset_ids": ["image_id_1", "image_id_2"]}'

# 預期結果：
# ✅ 作品集建立成功
# ✅ 照片關聯建立，顯示於前台
```

## 效能驗證

### Core Web Vitals 檢查
```bash
# 執行 Lighthouse CI
npm run lighthouse

# 預期指標：
# ✅ Performance Score ≥ 90
# ✅ LCP ≤ 2.5s
# ✅ INP ≤ 200ms  
# ✅ CLS ≤ 0.1
```

### 動畫與互動測試
```bash
# 啟動開發伺服器並造訪頁面
npm run dev

# 手動驗證：
# ✅ Lenis 滾動順滑，無卡頓
# ✅ 點點條點擊平滑跳轉
# ✅ GSAP 進場動畫自然
# ✅ prefers-reduced-motion 降級正常
```

## 無障礙驗證

### 鍵盤導覽測試
```bash
# 使用 Tab 鍵遍歷頁面元素
# ✅ 年份方框可聚焦且可用 Enter 激活
# ✅ 作品集列表支援鍵盤導覽
# ✅ 點點條可用方向鍵操作
# ✅ 焦點樣式清晰可見
```

### 螢幕閱讀器相容性
```bash
# 檢查 HTML 語意標記
# ✅ 圖片含有意義的 alt 文字
# ✅ 標題結構層次正確 (h1, h2, h3)
# ✅ ARIA 標記適當使用
# ✅ 麵包屑具備導覽語意
```

## 部署驗證

### 建置測試
```bash
# 執行 OpenNext 建置
npm run build

# 預期結果：
# ✅ 建置成功，無錯誤
# ✅ 生成 Cloudflare Workers 相容輸出
# ✅ 靜態資源正確 hash 命名
```

### Workers 部署
```bash
# 部署到 Cloudflare Workers
wrangler deploy

# 部署後驗證：
# ✅ 所有路由正常回應
# ✅ 資料庫連線成功
# ✅ 圖片上傳與顯示正常
# ✅ 快取策略生效
```

## 常見問題排除

### 圖片無法顯示
1. 檢查 Cloudflare Images API token 是否正確
2. 確認 image_id 格式正確
3. 檢查 CORS 設定是否允許網域

### 後台無法存取
1. 確認 Cloudflare Access 設定正確
2. 檢查 JWT token 是否有效
3. 驗證 `/admin` 路由保護是否啟用

### 動畫效能問題
1. 檢查 `prefers-reduced-motion` 設定
2. 確認 GSAP 與 Lenis 無衝突
3. 使用 Performance tab 分析 FPS

### 快取不一致
1. 檢查快取 tag 設定是否正確
2. 確認 revalidate API 正常運作
3. 驗證 D1 與邊緣快取同步

## 下一步

完成基本功能驗證後，可以：

1. **內容填充**: 使用後台上傳真實攝影作品
2. **SEO 優化**: 設定每個頁面的中繼資料
3. **效能調校**: 根據 Lighthouse 報告進行最佳化
4. **監控設置**: 配置錯誤追蹤與效能監控
5. **備份策略**: 設定 D1 資料庫定期備份

這個快速開始指南確保您能在最短時間內驗證系統核心功能，並為正式上線做好準備。