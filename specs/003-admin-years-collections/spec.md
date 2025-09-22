# Feature Specification: Admin 子系統缺頁面與缺端點補齊（Years / Collections / Uploads ＋ Images & Assets API）

**Feature Branch**: `003-admin-years-collections`  
**Created**: 2025-09-21  
**Status**: Draft  
**Input**: User description: "Admin 子系統缺頁面與缺端點補齊（Years / Collections / Uploads ＋ Images & Assets API）— 讓既有整合/契約測試可跑通；建立最小可用（MVP）管理頁面 Years、Collections、Uploads，並提供對應 API；對齊測試所需可觀測性與設定。"

## Execution Flow (main)
```
1. Parse user description from Input
	→ If empty: ERROR "No feature description provided"
2. Extract key concepts from description
	→ Identify: actors, actions, data, constraints
3. For each unclear aspect:
	→ Mark with [NEEDS CLARIFICATION: specific question]
4. Fill User Scenarios & Testing section
	→ If no clear user flow: ERROR "Cannot determine user scenarios"
5. Generate Functional Requirements
	→ Each requirement must be testable
	→ Mark ambiguous requirements
6. Identify Key Entities (if data involved)
7. Run Review Checklist
	→ If any [NEEDS CLARIFICATION]: WARN "Spec has uncertainties"
	→ If implementation details found: ERROR "Remove tech details"
8. Return: SUCCESS (spec ready for planning)
```

---

## ⚡ Quick Guidelines
- ✅ Focus on WHAT users need and WHY
- ❌ Avoid HOW to implement (no tech stack, APIs, code structure)
- 👥 Written for business stakeholders, not developers

### Section Requirements
- Mandatory sections: Must be completed for every feature
- Optional sections: Include only when relevant to the feature
- When a section doesn't apply, remove it entirely (don't leave as "N/A")

### For AI Generation
When creating this spec from a user prompt:
1. Mark all ambiguities: Use [NEEDS CLARIFICATION: specific question] for any assumption you'd need to make
2. Don't guess: If the prompt doesn't specify something (e.g., "login system" without auth method), mark it
3. Think like a tester: Every vague requirement should fail the "testable and unambiguous" checklist item
4. Common underspecified areas:
	- User types and permissions
	- Data retention/deletion policies  
	- Performance targets and scale
	- Error handling behaviors
	- Integration requirements
	- Security/compliance needs

---

## User Scenarios & Testing (mandatory)

### Primary User Story
作為系統的管理者（Admin），我可以使用後台最小可用（MVP）介面來：
- 管理年份（建立、編輯、刪除、排序），以維持首頁與作品集的年度架構。
- 管理作品集（依年份篩選、建立、編輯、排序），並進入照片管理流程。
- 以直傳方式上傳圖片、維護資產詮釋資料（alt、caption），以及批次操作（刪除、加入作品集）。
同時，系統需提供對外可自動化驗證的行為，使既有的整合/契約測試能穩定通過。

### Acceptance Scenarios
1. Given 管理者進入「年份管理」畫面，When 建立一個尚未存在的年份（YYYY）、設定狀態與排序，Then 顯示成功訊息且列表顯示於正確序位；若輸入重複年份，Then 顯示欄位錯誤提示。
2. Given 某年份底下已有作品集，When 管理者嘗試刪除該年份並於確認對話框中確認，Then 系統阻擋刪除並顯示錯誤訊息（不得破壞資料一致性）。
3. Given 管理者於年份或作品集列表完成排序（拖拉或上下移動），When 重新整理頁面，Then 顯示順序與先前一致（已持久化）。
4. Given 管理者在作品集管理建立或編輯資料，When 設定狀態為「已發布」但缺少必要欄位，Then 系統拒絕儲存並提示需補齊；When 必要欄位齊備，Then 儲存成功。
5. Given 管理者選擇特定年份篩選條件，When 於作品集列表套用篩選，Then 僅顯示屬於該年份的作品集。
6. Given 管理者於上傳區選擇檔案，When 取得一次性直傳授權並完成上傳，Then 顯示上傳成功提示且新資產出現在資產清單。
7. Given 資產清單顯示多筆資產，When 管理者就地編修 alt/caption 並儲存，Then 變更被保存且立即可見；When 勾選多筆執行批次刪除並確認，Then 被選資產被移除並顯示進度至完成。
8. Given 管理者在資產卡片上選擇加入某作品集，When 加入並查看該作品集資產清單，Then 可見該資產；When 調整該作品集內資產順序，Then 後續查詢順序維持一致。
9. Given 任一寫入操作（發布狀態變更、排序、內容更新）成功，When 變更涉及首頁、年份頁或作品集頁，Then 系統標記相關頁面快取失效以利前台更新。
10. Given 未授權使用者嘗試執行寫入行為，When 發出請求，Then 系統拒絕並回應未授權/禁止存取。

### Edge Cases
- 重複年份或重複作品集代稱：阻擋並提供明確錯誤，且不寫入任何變更。
- 仍被引用的資產：刪除本體前需評估影響；本輪可僅移除與作品集的關聯，避免破壞其他引用。
- 大檔/網路不穩上傳：直傳授權逾時或失敗時，顯示可理解的錯誤並可重試。
- 僅鍵盤操作情境：排序需提供替代操作（上/下移動），確保可及性。
- 快取一致性：連續多次排序或發布切換後，使用者再次載入前台仍能看到一致的順序與狀態。
- 安全：未授權或權限不足的寫入一律被拒絕，且不洩漏內部實作細節。

## Requirements (mandatory)

### Functional Requirements
- FR-001: 系統必須提供「年份管理」功能，包含建立、編輯、刪除與排序，並在刪除前提供使用者確認。
- FR-002: 系統必須提供「作品集管理」功能，可依年份篩選、建立、編輯與排序；發布狀態切換需符合必要欄位檢核。
- FR-003: 系統必須提供「上傳與資產管理」功能，支援檔案直傳、就地編修詮釋資料（alt、caption）、多選與批次刪除，以及將資產加入指定作品集。
- FR-004: 系統必須提供可程式化整合介面，支援取得一次性上傳授權、資產的建立/查詢/更新/刪除、以及在作品集中新增/移除/重排資產等操作（不暴露內部實作細節）。
- FR-005: 所有寫入操作（含關聯與排序）完成後，查詢結果必須反映最新狀態與順序；與前台相關的變更需觸發對應頁面的快取失效事件。
- FR-006: 系統必須確保唯一性規則（例如年份唯一、作品集代稱唯一），在違反時提供可理解的錯誤訊息並阻擋寫入。
- FR-007: 系統必須提供存取控制，只有管理者可進行寫入；未授權請求應清楚回應未授權/禁止存取。
- FR-008: 系統必須具備可觀測性與可測試性，UI 元素需可被穩定識別以支持自動化測試；整合端需具可設定的端點/基底設定以利測試環境接入。
- FR-009: 系統必須記錄寫入操作以利稽核（至少保留操作者、動作、時間、實體）。
- FR-010: 系統必須符合可及性基準：所有可點擊元素可用鍵盤操作；表單錯誤具明確提示；動態排序提供鍵盤替代路徑。
- FR-011: 系統應達成效能目標：主要管理操作平均回應時間 < 400ms（不含大檔上傳流程）。
- FR-012: 系統應提供測試/CI 所需之環境設定項，以避免測試跳過與波動；至少包含 `TEST_API_URL`、`TEST_API_BASE`、`BYPASS_ACCESS_FOR_TESTS`，並在本地與 CI 皆可設定。

### Key Entities
- Year（年份）：代表作品所屬年份；核心屬性含標籤（YYYY）、狀態（草稿/發布）、排序序位；與 Collection 為一對多。
- Collection（作品集）：代表同主題照片集合；核心屬性含代稱（唯一）、標題、摘要、狀態、排序、封面資產；屬於某一個 Year，且與 Asset 透過關聯具排序。
- Asset（資產）：代表一張已上傳的圖片與其詮釋資料；核心屬性含對應媒體服務的識別、尺寸與可選擇之 EXIF 資訊。
- CollectionAsset（關聯）：連結 Collection 與 Asset，並保存該資產在作品集內的排序位置；移除關聯不等同刪除資產本體。
- AuditLog（稽核紀錄）：保存誰在何時對何實體進行了何種動作，用於追跡與合規。

---

## Review & Acceptance Checklist
GATE: Automated checks run during main() execution

### Content Quality
- [x] No implementation details (languages, frameworks, APIs)
- [x] Focused on user value and business needs
- [x] Written for non-technical stakeholders
- [x] All mandatory sections completed

### Requirement Completeness
- [x] No [NEEDS CLARIFICATION] markers remain
- [x] Requirements are testable and unambiguous  
- [x] Success criteria are measurable
- [x] Scope is clearly bounded
- [x] Dependencies and assumptions identified

---

## Execution Status
Updated by main() during processing

- [x] User description parsed
- [x] Key concepts extracted
- [x] Ambiguities marked
- [x] User scenarios defined
- [x] Requirements generated
- [x] Entities identified
- [x] Review checklist passed

