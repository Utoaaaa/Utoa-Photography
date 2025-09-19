# Data Model: 攝影作品展示網站

## 核心實體定義

### Years (年份)
```typescript
interface Year {
  id: string;           // UUID
  label: string;        // e.g., "2024", "2023"
  order_index: string;  // Lexicographical sorting
  status: 'draft' | 'published';
  created_at: Date;
  updated_at: Date;
}
```

**驗證規則**:
- `label` 必填，通常為 YYYY 格式但允許自訂 (e.g., "2024 早春")
- `order_index` 使用可分割字串排序，預設為年份數字反向
- `status` 為 'draft' 時不在前台顯示

**狀態轉換**:
- Draft → Published: 管理員發布
- Published → Draft: 管理員隱藏 (保留資料)

### Collections (作品集)
```typescript
interface Collection {
  id: string;
  year_id: string;      // Foreign key to Years
  slug: string;         // URL-friendly identifier
  title: string;
  summary?: string;     // Optional short description
  cover_asset_id?: string; // Foreign key to Assets
  template_id?: string; // Future: different layout templates
  status: 'draft' | 'published';
  order_index: string;  // Within year ordering
  published_at?: Date;
  created_at: Date;
  updated_at: Date;
}
```

**驗證規則**:
- `slug` 在同一年份內必須唯一，用於 URL 生成
- `title` 必填，顯示於年份頁與作品集頁
- `cover_asset_id` 指向該作品集的代表圖片
- `order_index` 決定在年份頁中的排列順序

**關聯規則**:
- 每個 Collection 必須隸屬於一個 Year
- 刪除 Year 時，其下所有 Collection 需要處理策略 (級聯刪除或移動)

### Assets (資產/照片)
```typescript
interface Asset {
  id: string;           // Cloudflare Images image_id
  alt: string;          // Required for accessibility
  caption?: string;     // Optional photo description
  width: number;        // Original dimensions
  height: number;
  metadata_json?: any;  // EXIF, camera settings, etc.
  created_at: Date;
}
```

**驗證規則**:
- `id` 來自 Cloudflare Images，確保全域唯一
- `alt` 必填，支援螢幕閱讀器
- `width` 與 `height` 用於佈局計算，避免 CLS
- `metadata_json` 可儲存 EXIF、拍攝資訊等結構化資料

### CollectionAssets (作品集照片關聯)
```typescript
interface CollectionAsset {
  collection_id: string; // Foreign key to Collections
  asset_id: string;      // Foreign key to Assets
  order_index: string;   // Photo sequence within collection
  created_at: Date;
}
```

**功能目的**:
- 多對多關聯，同一張照片可屬於多個作品集
- `order_index` 決定照片在作品集中的順序，影響點點條排列
- 支援拖拉排序功能

### Templates (版型模板) - 可選
```typescript
interface Template {
  id: string;
  name: string;         // e.g., "標準兩欄", "全屏展示"
  description?: string;
  schema_json: any;     // Layout configuration
  created_at: Date;
  updated_at: Date;
}
```

**用途**:
- 未來支援多種作品集版型
- `schema_json` 定義版型所需的 slots 與參數
- V1 可先使用單一預設版型

### SEOMetadata (SEO 中繼資料) - 多型設計
```typescript
interface SEOMetadata {
  entity_type: 'year' | 'collection' | 'homepage';
  entity_id: string;    // Year/Collection ID, or 'homepage'
  title?: string;       // Custom page title
  description?: string; // Meta description
  og_asset_id?: string; // Open Graph image
  canonical_url?: string;
  updated_at: Date;
}
```

**設計理念**:
- 多型設計支援不同頁面類型的 SEO 設定
- 允許覆蓋預設的自動生成 SEO 資訊
- OG 圖片可指向 Assets 或外部連結

## 資料關聯圖

```
Years (1) ──→ (n) Collections (1) ──→ (n) CollectionAssets (n) ──→ (1) Assets
  │                │                                               ↗
  │                └─ cover_asset_id ──────────────────────────────┘
  │
  └─ SEOMetadata (1:1 optional)

Collections ─→ SEOMetadata (1:1 optional)
Assets ←─ SEOMetadata.og_asset_id (n:1 optional)
```

## 索引策略

### 效能關鍵索引
```sql
-- 首頁年份查詢
CREATE INDEX idx_years_published_order ON years(status, order_index) 
WHERE status = 'published';

-- 年份頁作品集查詢  
CREATE INDEX idx_collections_year_order ON collections(year_id, status, order_index)
WHERE status = 'published';

-- 作品集頁照片查詢
CREATE INDEX idx_collection_assets_order ON collection_assets(collection_id, order_index);

-- SEO 查詢
CREATE INDEX idx_seo_metadata_entity ON seo_metadata(entity_type, entity_id);

-- URL slug 查詢
CREATE UNIQUE INDEX idx_collections_year_slug ON collections(year_id, slug);
```

## 快取策略

### 查詢快取鍵設計
- `years:published` - 首頁年份列表
- `collections:year:{year_id}:published` - 年份頁作品集列表  
- `collection:{collection_id}:assets` - 作品集照片列表
- `seo:{entity_type}:{entity_id}` - SEO 中繼資料

### 失效策略
- 更新 Year 狀態 → 失效 `years:published`
- 更新 Collection → 失效 `collections:year:{year_id}:published` 與相關快取
- 重排 CollectionAssets → 失效 `collection:{collection_id}:assets`

## 資料遷移考量

### 排序索引更新
- 初始 `order_index` 可用數字字串 ("1.0", "2.0", ...)
- 插入新項目使用中位數算法 ("1.5" 介於 "1.0" 與 "2.0")
- 當精度不足時觸發重新索引

### 歷史資料處理
- Asset 刪除需考慮參照完整性
- Collection 狀態變更影響前台顯示
- 軟刪除 vs 硬刪除策略需明確定義

## 驗證與約束

### 業務規則驗證
- 發布的 Collection 必須至少包含一張照片
- Collection slug 在同一年份內唯一
- Assets 的 alt 文字長度限制 (1-200 字元)
- Year label 格式驗證 (建議 YYYY 但不強制)

### 資料完整性
- Year 刪除時的 Collection 處理策略
- Asset 被多個 Collection 使用時的刪除防護
- Template 變更時現有 Collection 的相容性檢查