# Data Model: Admin Years/Collections/Uploads

Date: 2025-09-21 | Branch: 003-admin-years-collections

## Entities

### Year
- id (string/uuid)
- label (YYYY unique)
- status (Draft|Published)
- order_index (integer)
- created_at, updated_at

### Collection
- id (string/uuid)
- year_id (fk → Year)
- slug (string unique)
- title (string)
- summary (text)
- cover_asset_id (fk → Asset, nullable)
- status (Draft|Published)
- order_index (integer)
- publish_note (text, nullable)
- version (int, default 1)
- published_at (datetime, nullable)
- updated_at (datetime)

### Asset
- id (string/uuid)
- image_id (string) // 雲端圖片服務 id
- alt (string, nullable)
- caption (text, nullable)
- width, height (int, nullable)
- exif_json (json/text, nullable)
- created_at (datetime)

### CollectionAsset (association)
- collection_id (fk → Collection)
- asset_id (fk → Asset)
- order_index (int) // 或 slide_index (int)，二選一保留一種
- text (text, nullable)

### AuditLog
- id (uuid)
- actor (string) // 管理者識別
- action (string) // create/update/delete/publish/unpublish/sort/link/unlink
- entity_type (string) // year/collection/asset/collection_asset
- entity_id (string)
- created_at (datetime)
- metadata_json (json/text)

## Rules & Constraints
- Year.label unique；刪除前需無 collections 參考。
- Collection.slug unique；Published 需必填：slug/title/year_id（最小）。
- Asset 刪除需無 collection_assets 參考；否則先移除關聯。
- 關聯排序變更後，查詢順序需穩定且可再現。

## Derived Views
- 年份列表按 order_index 升序；同值時按 created_at。
- 指定年份的作品集列表按 order_index 升序。
- 作品集相片依關聯 order_index 升序。
