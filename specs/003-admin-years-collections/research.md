# Research: Admin 子系統缺頁面與缺端點補齊

Date: 2025-09-21 | Branch: 003-admin-years-collections

## Unknowns → Decisions

1) 測試/CI 環境變數（TEST_API_URL、TEST_API_BASE、BYPASS_ACCESS_FOR_TESTS）
- Decision: 採用這三項作為最低必要；README 與 CI 皆需設定。
- Rationale: 測試檔使用它們決定直傳與一般 API 基底；避免測試跳過/失敗。
- Alternatives: 以固定常數寫死 → 放棄，會限制環境、且與多環境衝突。

2) 權限策略（Cloudflare Access vs. 測試略過）
- Decision: Admin 群組與寫入 API 受 Access；本地/CI 設 `BYPASS_ACCESS_FOR_TESTS=true` 時略過驗權。
- Rationale: 兼顧安全與可測；測試情境免外部依賴。
- Alternatives: Mock Access → 減少接近實際情境；或完全無保護 → 不安全。

3) D1 schema 欄位補充與 migration
- Decision: 補 `collections.publish_note TEXT NULL, version INTEGER DEFAULT 1`；`collection_assets.text TEXT NULL, slide_index INTEGER 可替代 order_index (擇一)`。
- Rationale: 符合版本與幻燈片文本需求；避免雙重排序欄位衝突。
- Alternatives: 僅保留 order_index → 仍可，但 slide 語意較直觀；此處可映射同一欄位。

4) 快取失效策略
- Decision: 以標籤 `home`、`year:{YYYY}`、`collection:{ID}` 標記；寫入後觸發失效（可用 KV/Cache API + revalidate endpoint）。
- Rationale: 精準失效，降低全站重繪；與現有 `src/app/api/revalidate/route.ts` 能力對齊。
- Alternatives: 全站清快取 → 成本過高；時間到期被動刷新 → 延遲更新。

5) API 契約最小集
- Decision: 僅實作測試所需：direct-upload、assets CRUD、collection-assets 關聯/排序/移除。
- Rationale: 聚焦使既有測試全綠。
- Alternatives: 擴增過多欄位/過於通用 → 增加複雜度並延誤交付。

## Best Practices
- A11y：提供鍵盤等價操作；表單錯誤以可見描述顯示；對話框 focus trap。
- 圖片：限定預載 1–2 張、設定容器尺寸避免 CLS、尊重 prefers-reduced-motion。
- 排序：提供拖拉與上下移動兩種；鍵盤用上下移動。
- 稽核：寫入操作記錄 who/action/time/entity+summary。

## Integrations
- Cloudflare Images：使用 direct creator upload；失敗提供明確錯誤訊息。
- OpenNext + Wrangler：Workers 上部署，D1/migrations 以 CI 驗證 dry-run 再應用。

## Open Questions（已解）
- 測試環境變數命名與來源：以本文件與 quickstart.md 規範，CI 同步設定。
- 刪除資產與既有關聯：本輪以「移除關聯」為主；刪除本體需無關聯。
