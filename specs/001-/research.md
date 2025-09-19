# Research: 個人攝影作品展示網站技術選型

## 技術架構決策

### Decision: Next.js 14 App Router + Cloudflare Workers
**Rationale**: 
- App Router 提供強大的 SSR 與 Edge 快取整合能力
- Route groups 可完美分離前台 (site) 與後台 (admin) 邏輯
- Cloudflare Workers 提供全球邊緣運算，延遲最低
- OpenNext adapter 可將 Next.js 部署至 Workers 環境

**Alternatives considered**:
- **Nuxt.js**: Vue 生態系，但團隊 React 經驗較豐富
- **SvelteKit**: 效能優異但生態系相對較小
- **Pure Static (Astro/Gatsby)**: 無法滿足動態 CMS 需求

### Decision: Cloudflare D1 Database
**Rationale**:
- SQLite 相容性，易於開發與測試
- 與 Workers 深度整合，無需額外配置
- 自動備份與邊緣分散
- 成本效益高，適合中小型應用

**Alternatives considered**:
- **PlanetScale**: MySQL 相容，但複雜度較高
- **Supabase**: PostgreSQL 功能豐富，但與 Cloudflare 整合較複雜
- **Local SQLite**: 無法滿足生產環境分散式需求

### Decision: Cloudflare Images for 媒體儲存
**Rationale**:
- Direct Creator Upload 支援前端直傳，減少伺服器負載
- 自動 Variants 生成多尺寸與格式轉換 (AVIF/WebP)
- 全球 CDN 分發，載入速度最佳
- 與 Workers 生態系完美整合

**Alternatives considered**:
- **AWS S3 + CloudFront**: 功能強大但設定複雜
- **Vercel Blob**: 簡單易用但供應商鎖定風險較高
- **Cloudinary**: 專業媒體處理但成本較高

## 動畫與互動技術選型

### Decision: Lenis + GSAP 組合
**Rationale**:
- Lenis 提供順滑的慣性滾動體驗，符合高品質攝影網站期望
- GSAP 負責精細的進場動畫與微互動
- 兩者可橋接合作，避免衝突
- 支援 `prefers-reduced-motion` 自動降級

**Alternatives considered**:
- **Framer Motion**: React 原生，但滾動控制能力較弱
- **純 CSS animations**: 效能好但表現力有限
- **AOS (Animate On Scroll)**: 簡單但不夠精緻

## 設計系統決策

### Decision: Tailwind CSS + shadcn/ui 基底
**Rationale**:
- Tailwind 的 design tokens 系統適合建立一致的視覺語言
- shadcn/ui 提供無樣式元件基底，可客製化為極簡風格
- 響應式 utilities 可簡化斷點管理
- 與 TypeScript 整合良好

**Alternatives considered**:
- **Styled Components**: CSS-in-JS 靈活但 bundle size 較大
- **CSS Modules**: 作用域隔離好但缺乏 design system
- **Pure CSS**: 最小依賴但維護成本高

## 資料建模決策

### Decision: 階層式年份 → 作品集 → 照片架構
**Rationale**:
- 符合攝影師時間軸整理習慣
- 支援靈活的排序系統 (lexicographical ordering)
- Collection Template 系統可支援未來版型擴展
- 正規化設計避免資料重複

**Schema核心**:
```sql
years: id, label, order_index, status
collections: id, year_id, slug, title, template_id, status, order_index  
assets: id(images_id), alt, caption, metadata_json
collection_assets: collection_id, asset_id, order_index
```

### Decision: 可分割排序系統
**Rationale**:
- 避免大量重排的效能問題
- 支援拖拉排序的即時更新
- 可使用字串排序或分數排序實現

## 效能最佳化策略

### Decision: SSR + Edge Caching 混合策略
**Rationale**:
- 首次載入採 SSR 確保 SEO 與 Core Web Vitals
- 邊緣快取確保後續訪問的靜態級效能
- 精準快取失效 (tag-based) 確保內容即時性

### Decision: 漸進式圖片載入策略
**Rationale**:
- `loading="lazy"` 用於 fold 以下圖片
- Intersection Observer 控制點點條同步
- 多尺寸 `srcset` 根據裝置優化
- AVIF/WebP fallback 確保最佳壓縮比

## 無障礙與相容性決策

### Decision: 鍵盤導覽優先設計
**Rationale**:
- 年份方框、作品集清單、點點條均支援 Tab 導覽
- 明確的 focus styles 與 ARIA 標記
- 確保無 JavaScript 環境下基本功能可用

### Decision: 動畫降級系統
**Rationale**:
- 偵測 `prefers-reduced-motion` 自動關閉動畫
- Lenis 在低效能裝置自動降級為原生滾動
- 提供動畫開關讓用戶手動控制

## 部署與維運決策

### Decision: GitHub Actions + Wrangler 自動化部署
**Rationale**:
- OpenNext build 產生 Cloudflare 相容產出
- 自動 D1 migration 與回滾機制
- 預覽部署支援 PR 審查

### Decision: 多環境快取策略
**Rationale**:
- 開發環境關閉快取確保即時性
- 預覽環境短期快取支援測試
- 生產環境長期快取搭配 tag-based 失效

## 未解決問題與後續研究

1. **圖片 EXIF 處理**: 考慮是否在 Worker 中解析或使用 Queue 異步處理
2. **搜尋功能**: 評估 Cloudflare 全文搜尋能力或整合第三方服務
3. **分析追蹤**: Cloudflare Analytics vs Google Analytics 權衡
4. **國際化**: 未來多語言支援的架構預留

## 研究結論

技術選型已充分考慮效能、開發體驗、維運成本與擴展性。Cloudflare 生態系提供完整解決方案，Next.js App Router 確保開發效率，整體架構可滿足項目需求並預留未來成長空間。