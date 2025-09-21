# Data Model: Publishing + Single-Screen Collection View

## Entities

### Collection
- id: string
- year_id: string
- title: string
- status: enum(draft|published)
- publish_note: string (nullable)
- version: integer (>=1, increments on publish)
- published_at: datetime (nullable)
- seo_title: string
- seo_description: string
- og_image_asset_id: string (nullable)

### CollectionAsset
- id: string
- collection_id: string
- image_id: string
- alt: string (required to publish)
- text: string (nullable, markdown allowed)
- slide_index: integer (>=0, unique per collection)

### AuditLog
- id: string
- who: string
- action: enum(publish|unpublish|edit)
- entity: string (e.g., collection/{id})
- payload_json: json
- created_at: datetime

## Rules & Constraints
- Publish requires: all images have `alt`; SEO title+description present.
- slide_index defines display order; stable and gapless sequence is recommended.
- Version increments per publish; unpublish does not increment version.
- Audit every change: publish/unpublish/seo update/asset field changes.

## Derived Views
- CollectionSummary: { id, title, year, draftCount, checklistStatus }
- CollectionDetail: { id, title, seo, slides[{assetId,url,alt,text,slide_index}] }
