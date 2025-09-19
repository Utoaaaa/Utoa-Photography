# 合約測試規範

## API 合約測試 (Contract Tests)

### 年份管理測試
- `GET /api/years` - 驗證回應格式與年份列表排序
- `POST /api/years` - 驗證創建年份的必填欄位與格式
- `PUT /api/years/{id}` - 驗證更新操作與狀態轉換
- `DELETE /api/years/{id}` - 驗證刪除約束與級聯處理

### 作品集管理測試  
- `GET /api/years/{year_id}/collections` - 驗證作品集列表與篩選
- `POST /api/years/{year_id}/collections` - 驗證作品集創建與 slug 唯一性
- `GET /api/collections/{id}` - 驗證作品集詳情與關聯照片
- `PUT /api/collections/{id}` - 驗證作品集更新與發布流程

### 照片與資產測試
- `POST /api/images/direct-upload` - 驗證上傳憑證生成與格式
- `POST /api/assets` - 驗證資產記錄創建與元資料儲存
- `PUT /api/assets/{id}` - 驗證資產資訊更新
- `DELETE /api/assets/{id}` - 驗證刪除約束與參照完整性

### 作品集照片關聯測試
- `POST /api/collections/{id}/assets` - 驗證照片加入與排序
- `PUT /api/collections/{id}/assets` - 驗證重新排序操作
- `DELETE /api/collections/{id}/assets/{asset_id}` - 驗證照片移除

## 前端元件合約測試

### 頁面路由合約
- `/` - 首頁年份網格渲染與響應式佈局
- `/[year]` - 年份頁作品集列表與導覽
- `/[year]/[collection]` - 作品集詳頁與點點條同步

### 元件介面合約
- `YearGrid` - 年份方框點擊與鍵盤導覽
- `CollectionList` - 作品集清單響應式排版  
- `PhotoViewer` - 照片展示與縱橫比維持
- `DotNavigation` - 點點條互動與高亮同步
- `Breadcrumb` - 麵包屑導覽與可點擊性

### 動畫與互動合約
- Lenis 滾動行為與 `prefers-reduced-motion` 降級
- GSAP 進場動畫與錯誤恢復
- 點點條點擊跳轉與滾動同步
- 響應式斷點與佈局切換

## 資料層合約測試

### 資料庫查詢合約
- 年份列表查詢與排序（已發布狀態篩選）
- 作品集查詢與年份關聯（包含封面圖片）
- 照片查詢與作品集關聯（按排序索引）
- SEO 中繼資料查詢與實體關聯

### 快取層合約
- 快取鍵格式與命名規範
- 快取失效觸發與標籤管理
- SSR 與邊緣快取一致性
- 快取回退與錯誤處理

## 外部服務合約測試

### Cloudflare Images 整合
- Direct Upload 流程與憑證驗證
- 圖片變形 URL 生成與參數
- 圖片刪除與清理流程
- 錯誤處理與重試機制

### Cloudflare D1 整合  
- 資料庫連線與查詢執行
- Migration 腳本與版本管理
- 交易處理與回滾機制
- 效能監控與查詢最佳化

## 合約測試執行策略

### 測試環境設定
```typescript
// Contract test setup
const testClient = createAPIClient({
  baseURL: process.env.TEST_API_URL,
  auth: process.env.TEST_AUTH_TOKEN
});

const testDB = createTestDatabase({
  resetBetweenTests: true,
  seedData: './test-fixtures/'
});
```

### 測試資料準備
- 標準測試資料集：3 個年份、每年 2-5 個作品集、每個作品集 3-10 張照片
- 邊界測試案例：空年份、單張照片作品集、大量照片作品集
- 錯誤案例：無效 ID、重複 slug、缺少必填欄位

### 驗證標準
- 回應格式符合 OpenAPI 規範
- HTTP 狀態碼正確
- 錯誤訊息結構化且有意義
- 效能在可接受範圍（API < 500ms, 頁面 < 2s）

### CI/CD 整合
- 每次 PR 自動執行完整合約測試套件
- 合約測試失敗阻擋部署
- 生產環境部署後執行煙霧測試
- 定期執行完整回歸測試

這些合約測試確保系統各層級之間的介面穩定可靠，並在變更時及早發現不相容問題。