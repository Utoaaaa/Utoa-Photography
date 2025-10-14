# Feature Specification: 首頁年份地點階層改版

**Feature Branch**: `004-`  
**Created**: 2025-10-10  
**Status**: Draft  
**Input**: User description: "首頁年份地點階層改版"

## Clarifications

### Session 2025-10-10

- Q: FR-004 需要採取哪種舊網址導向策略？ → A: 移除舊路徑，全採新層級
- Q: Location slug 應如何定義？ → A: 英文地名-年份後兩碼
- Q: 未指派地點的 collection 要怎麼處理？ → A: 先阻止發佈

## User Scenarios & Testing *(mandatory)*

### User Story 1 - 首頁快速確認年份與地點 (Priority: P1)

做為一般訪客，我希望在首頁立即看到可選的年份，並在同一視圖中看到該年份底下的地點卡片，以便快速找到感興趣的拍攝地點。

**Why this priority**: 這是對外訪客的第一個入口，決定了整體導覽體驗是否順暢，因此屬於最核心的價值交付。

**Independent Test**: 僅部署此功能時，測試者能透過首頁選擇不同年份並觀察到對應地點卡片切換，確認資訊正確呈現。

**Acceptance Scenarios**:

1. **Given** 首頁載入成功且存在多個年份資料，**When** 使用者點擊不同年份標題，**Then** 畫面顯示所選年份的地點卡片清單，並清楚標示地點名稱與摘要資訊。
2. **Given** 某年份僅有一個地點，**When** 該年份被選取，**Then** 系統仍顯示單一卡片並保留一致的版面與互動方式。

---

### User Story 2 - 地點詳情導向 Collections (Priority: P2)

做為瀏覽者，我希望在地點卡片中看到關鍵資訊並可點擊進入，進而查看該地點包含的作品集合（collections），協助我了解同一地點的不同拍攝主題。

**Why this priority**: 地點到 collections 的導流是新層級的主要目的，決定使用者是否能完成深入瀏覽。

**Independent Test**: 僅啟用此故事即可透過點擊卡片連至地點頁面，檢視該地點底下所有 collections 是否正確渲染。

**Acceptance Scenarios**:

1. **Given** 地點卡片顯示在首頁，**When** 使用者點擊「查看作品」或整個卡片，**Then** 系統導向新的地點頁面，列出該地點所有 collections，並保留回上一層的導覽。
2. **Given** 某地點暫無 collections，**When** 使用者進入該地點頁面，**Then** 系統顯示友善的空狀態訊息與返回入口。

---

### User Story 3 - 管理者維護地點層級 (Priority: P3)

做為站點管理者，我需要在後台建立、編輯、排序某年份底下的地點，並將 collections 指派或移動到指定地點，以確保前台呈現正確。

**Why this priority**: 沒有維運介面便無法長期維持資料正確性，是上線前後台必備能力，但可在前台功能穩定後再實作。

**Independent Test**: 僅實作此故事時，管理者可在後台完成地點新增/排序/刪除及 collections 指派，並透過 API 檢查資料變更已儲存。

**Acceptance Scenarios**:

1. **Given** 後台登入後並選擇某年份，**When** 管理者新增一個地點並設定摘要、封面與排序，**Then** 該地點立即出現在前台對應年份卡片列表中。
2. **Given** 某 collection 目前歸屬於地點 A，**When** 管理者在後台將其移動到地點 B，**Then** 前台地點頁面同步更新並避免重複顯示。

### Edge Cases

- 當某年份暫時沒有任何地點資料時，首頁應顯示「即將推出」或可新增提示，並避免顯示空白區塊。
- 當地點存在但沒有 collections 時，地點詳情頁需提供空狀態與返回入口，避免 404。
- 當資料載入失敗或 API 回傳格式錯誤時，前台需顯示錯誤訊息並允許重新整理；後台需阻止無效資料寫入。
- 若同一地點需跨年份共用，系統需定義是否允許共用或必須複製資料，並在後台給出清楚限制。

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: 前台首頁必須依年份顯示地點卡片清單，並支援年份切換或分段瀏覽。
- **FR-002**: 每個地點卡片必須呈現地點名稱、代表圖像或插圖、作品數量摘要與前往詳情的互動控件。
- **FR-003**: 地點詳情頁必須列出該地點下所有 collections，包含標題、摘要、封面縮圖、更新日期等關鍵資訊。
- **FR-004**: 站點 URL 與導覽改為唯一的 `/[year]/[location]/[collection]` 結構，舊有 `/[year]/[collection]` 路徑需下線並停止對外回應。
- **FR-005**: 後台必須提供地點 CRUD（建立、查看、更新、刪除）與排序功能，並允許管理者在單一連續流程內將 collections 指派到指定地點或在地點間搬移，避免跨頁跳轉造成體驗斷裂。
- **FR-006**: Location slug 需使用「英文地名-年份後兩碼」格式（例如 `kyoto-24`），同一年份內需唯一；若同一地點跨年份重複，年份碼需反映當年。
- **FR-007**: 系統必須於 API 層檢驗資料完整性（年份存在、地點唯一、collections 與地點關聯正確），若驗證失敗需回傳可本地化的錯誤訊息。
- **FR-008**: 若 collection 未指派地點，後台需阻止其發布（含草稿轉公開），並提供指派流程提示，確保前台不會出現未分類集。
- **FR-009**: 現有測試資料（seed）需更新，確保至少一個年份擁有兩個以上地點，每個地點至少含一個 collection，以便端對端測試。

### Key Entities *(include if feature involves data)*

- **Year**：現有年份實體，新增與 Location 的一對多關係；持續負責排序、狀態、顯示標籤。
- **Location**：新實體，描述某年份內的拍攝地點，包含名稱、摘要敘述、顯示順序、封面資產 ID、對應年份 ID。
- **Collection**：既有作品集合，將新增 `location_id` 以指向 Location；同時保留與年份的關聯以維持歷史資料相容。

### Assumptions

- 所有 collections 在發布前必須指派至某地點；草稿階段允許暫存但需在發布前完成指派。
- 地點僅在單一年份內使用（暫不支援跨年份共用）；若未來需要共享，將另行規劃。
- 現行 SEO 與 sitemap 規則可延伸到新的 URL 架構，無需另行調整搜尋策略。

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 首頁訪客在三次點擊內找到特定地點的 collections 的成功率達 95%，由可用性測試驗證。
- **SC-002**: 重新設計後的首頁載入時間（LCP）維持在 2.5 秒內（行動裝置模擬），不因新增層級而惡化核心指標。
- **SC-003**: 後台管理者在 5 分鐘內即可完成新增地點與指派三個 collections 的操作流程，並在首次嘗試即通過測試。
- **SC-004**: 上線後兩週內，監測報表顯示來自舊 `/[year]/[collection]` 連結的 404 次數為 0，確認所有對外連結與 sitemap 已更新為新層級。
