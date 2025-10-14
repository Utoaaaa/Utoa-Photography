# Research Notes: 首頁年份地點階層改版

## Decision 1: 資料產出與靜態化策略
- **Decision**: 於 build 階段使用 Prisma 從 SQLite 匯出年份→地點→集合結構，寫入 `public/data/year-location.json`（或 Next data loader）供首頁與地點頁靜態化；前台不依賴 runtime API。
- **Rationale**: 滿足 Constitution 的 Static-First 要求，避免併發查詢造成 LCP 惡化；資料量有限（年份/地點/collections < 500），可一次序列化。
- **Alternatives considered**:
  - **ISR/Runtime fetch**：違反 static-first，且需要 server runtime，淘汰。
  - **客端 fetch API**：會延後畫面與 SEO，且 JS 關閉時失效。

## Decision 2: Prisma schema 與遷移策略
- **Decision**: 新增 `Location` 模型（含 `id`, `year_id`, `slug`, `name`, `summary`, `cover_asset_id`, `order_index`, `created_at`, `updated_at`），`Collection` 增加 `location_id`（nullable 過渡，但發布前需非空），並建立複合唯一索引 `(year_id, slug)`、外鍵 `onDelete: SetNull`。以 `prisma migrate dev` 產出 migration，再手動產出部署腳本。
- **Rationale**: 滿足多對一需求，並保留舊資料安全遷移。允許暫存草稿無地點；發布檢查由應用程式負責。
- **Alternatives considered**:
  - **將 location 作為 enum/JSON**：缺乏排序與獨立 CRUD，無法滿足後台需求。
  - **允許跨年份共用同 id**：目前需求不需要，多對多會增加複雜度。

## Decision 3: 後台管理介面流程
- **Decision**: 整合年份 → 地點 → collections 於單頁（或分段 tab）流程：左列年份列表、中間地點排序區、右側 collections 指派區。操作完成後即時呼叫 Prisma API (`PATCH /api/admin/collections/:id`) 更新 `location_id`。
- **Rationale**: 與需求「一條路徑不要跳來跳去」一致，減少頁面跳轉與記憶負擔；可沿用現有 Admin shell。
- **Alternatives considered**:
  - **獨立地點管理頁 + collection 編輯頁**：造成 workflow 斷裂，被淘汰。
  - **拖放跨年份**：目前不支援跨年份地點，暫不提供。

## Decision 4: 舊 URL 下線與監控
- **Decision**: build 時產出 sitemap 僅含新結構，並搜尋全站連結更新。部署後透過 Cloudflare 分析與 `ci:link-check` 報表監測兩週，確保舊 `/[year]/[collection]` 不再出現。
- **Rationale**: Constitution 要求 URL 穩定與監控；需求明確表示移除舊路由。
- **Alternatives considered**:
  - **保留 301 轉址**：與使用者要求相違背。
  - **中介頁提示**：增加跳轉耗時，不符「一條路徑」。
