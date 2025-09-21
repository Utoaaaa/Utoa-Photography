# Research: 個人攝影網站 — Publishing + 首頁/作品集視圖

## Unknowns and Decisions
- N (版本列表數量)：預設 10。
- SEO 必填：標題、描述；OG 圖為建議（非必填）。
- 行動版幾何圖樣降級：預設隱藏（≥md 顯示，<md 隱藏）。
- 點點條大量張數：可滾動容器，提供 `aria-setsize` 與 `aria-posinset`，鍵盤可跳到指定索引；>40 張時分段群組。
- 差異摘要粒度：先顯示張數/順序/SEO 標題描述變更；文字欄位細節以「變更多筆」摘要。

## Best Practices
- 單銀幕視圖效能：
  - 預載相鄰 1–2 張（prefetch/link rel=preload 或 Intersection Observer 預加載）。
  - 圖片以 AVIF/WebP 優先，設置 `sizes` 與 `srcset`，lazy 其他。
  - 動效尊重 `prefers-reduced-motion`，不影響可及性焦點。
- 可及性：
  - 點點條使用 button/anchor，`role="tablist"` 或 `listbox` 皆可；提供朗讀「第 N 張／共 M 張」。
  - 麵包屑使用 `nav aria-label="Breadcrumb"`。
- 快取策略：
  - 靜態前台：改動後觸發整站或標籤化區塊重建；CDN 失效精準到首頁、年份、作品集頁。

## Alternatives Considered
- 純 Git CMS 流程（PR 編輯 JSON/MD）：
  - 優點：完全靜態、最符合憲法。
  - 缺點：缺少即時預覽、影像直傳體驗差、發布流延遲。
- 完全動態後台直出前台：
  - 優點：最彈性。
  - 缺點：違反憲法 I 靜態優先，拒絕。

## Rationale
採「前台靜態 + 私有後台工具」分離，兼顧體驗與憲法要求；公開站點完全靜態化，後台不影響使用者瀏覽。
