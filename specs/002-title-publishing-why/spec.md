# Feature Specification: 個人攝影網站 — 後台發布頁面（Publishing）＋首頁與作品集呈現修改

**Feature Branch**: `002-title-publishing-why`  
**Created**: 2025-09-20  
**Status**: Draft（2025-10 後台發布頁面已下線，文件僅供歷史參考）  
**Input**: User description: "給站主一個單一入口完成：審查草稿、預覽、設定 SEO/OG、發布/下架、版本備份與快取更新。首頁視覺微調：左上角低調品牌（「utoa」字樣小一點且偏左上）、右側持續使用幾何相機圖樣。作品集詳頁改為「一銀幕一張圖＋對應文字」，滑動或點擊才切換下一張，讓閱讀節奏更專注。範圍：後台 Publishing Page（新）：集中管理草稿 → 預覽 → 發布／下架；可設定 SEO/OG、發布備註、快取失效；含變更紀錄。首頁（修改）：左上角：品牌字樣「utoa」縮小並靠左上定位（不喧賓奪主）。右側：延續「幾何相機圖樣 Geometric / Grid-first」，密度節制。其餘年表區塊維持原規格。作品集詳頁（修改）：內容區採「一銀幕一張圖片＋右側（或下方）該張的文字敘述」。以滑動／鍵盤／點擊「點點條」逐張切換；每張圖均有對應文字欄位。仍保留頂部滿版（左標題／右幾何圖樣）與麵包屑（年份 / 作品集）。Out of Scope：多語、多作者、審稿工作流（assign/review），僅單人發布。排程發佈（可於下輪擴充）。影片長片與 RAW 檔在站內預覽。資訊結構：後台：/admin/publishing（新）首頁：/（修改品牌與右側圖樣區）作品集詳頁：/{year}/{collection}（修改為一銀幕一張圖＋對應文字）。Content Model：collections 新增：publish_note、version；collection_assets 新增：text、slide_index；audit_logs：who, action(publish/unpublish/edit), entity(collection/id), payload_json, created_at。工作流程：A. 後台 Publishing Page（草稿清單、預覽、檢查清單、設定 SEO/OG、發布、快取失效、下架、版本與變更紀錄）；B. 首頁（品牌與圖樣）；C. 作品集詳頁（單銀幕視圖）。User Stories/AC、Non-Functional、Success Metrics 見詳述。"

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
作為站主（Admin），我希望在單一「Publishing」頁面完成草稿審查、預覽、SEO/OG 設定與發布/下架，並在發布後自動精準地讓前台快取失效，確保訪客即刻看到正確版本。

### Acceptance Scenarios
1. Given 存在多個草稿作品集，When 進入 /admin/publishing，Then 我能看到依年份分組的作品集清單，含標題、年份、草稿張數與檢查清單狀態，並可依年份/狀態篩選。
2. Given 我點入某作品集，When 在後台預覽視圖切換圖片，Then 行為與前台一致（滑動/鍵盤/點點條），點點條同步，尊重 prefers-reduced-motion。
3. Given 我在後台調整每張圖片的文字與 alt，When 修改完成，Then 變更即時保存；若缺少必要 alt 或 SEO 欄位，發布按鈕不可用並顯示原因。
4. Given 我設定 SEO/OG（標題、描述、OG 圖），When 儲存，Then 預覽能顯示預期標題/描述與 OG 圖。
5. Given 我準備發布，When 點擊發布並填入發布備註，Then 系統將 status 設為 published、寫入 published_at、version 自動 +1、保存 publish_note，同時觸發首頁/年份/作品集之快取失效並顯示成功提示。
6. Given 已發布的作品集，When 我選擇下架並填入備註，Then status 變更為 draft、記錄變更並觸發快取失效，顯示成功提示。
7. Given 過往版本存在，When 我在 Publishing 頁查看版本紀錄，Then 我能看到最近 N 次（如 10）版本，含 version、note、時間、操作人，並可展開差異摘要（至少顯示張數或順序變更）。
8. Given 首頁視覺要求，When 我在前台瀏覽首頁，Then 左上角品牌「utoa」縮小並靠左上且不遮擋導覽；右側呈現密度低的幾何相機圖樣；行動版可降級或隱藏圖樣。
9. Given 作品集詳頁視圖，When 我左右切換或使用點點條，Then 一次僅顯示一張圖與對應文字；點點條與螢幕閱讀器敘述同步；行動端改上下排版；麵包屑可用以返回上層。

### Edge Cases
- 草稿作品集中存在無圖片或僅 1 張圖片：仍可預覽與發布；檢查清單僅針對實際存在的圖片。
- 圖片缺少 alt 或 SEO 必填未填：發布按鈕不可用，明確列出缺漏項目。
- 快取失效 API 失敗：自動重試限定次數，最終失敗時在後台提示並保留可重試動作。
- OG 圖未選：可發布但在檢查清單顯示建議補齊（非必要時）。
- 點點條超過可視高度：可滾動並維持鍵盤可達性。

## Requirements (mandatory)

### Functional Requirements
- FR-001: 系統必須提供「Publishing」頁面顯示草稿作品集清單，支援依年份與檢查狀態篩選。
- FR-002: 系統必須提供後台即時預覽，行為與前台單銀幕視圖一致（滑動/鍵盤/點點條，同步 active 狀態）。
- FR-003: 系統必須允許編輯每張圖片的對應文字（可空）與 alt，並在變更時即時保存。
- FR-004: 系統必須提供 SEO/OG 欄位（標題、描述、OG 圖選擇）設定與預覽顯示。
- FR-005: 系統必須在發布時將作品集狀態標記為 published、寫入 published_at、將 version 遞增 1，並保存 publish_note。
- FR-006: 系統必須在發布與下架時執行精準快取失效（首頁、年份頁、該作品集頁）。
- FR-007: 系統必須提供版本與變更紀錄列表，顯示最近 N 次（如 10）發布資訊與差異摘要（至少張數/順序變更）。
- FR-008: 首頁必須呈現縮小且靠左上的「utoa」品牌字樣，右側呈現低密度幾何相機圖樣；行動版可降級/隱藏圖樣且不干擾導覽。
- FR-009: 作品集詳頁必須以「一銀幕一張圖＋對應文字」呈現，支援滑動、鍵盤、點點條切換；桌機兩欄、行動上下排版；保留麵包屑。
- FR-010: 點點條必須鍵盤可操作並具有 ARIA 標記，螢幕閱讀器可朗讀「第 N 張／共 M 張」。
- FR-011: 系統必須記錄所有發布/下架/SEO 變更至稽核日誌（audit_logs）。
- FR-012: 檢查清單必須在發布前驗證必填欄位（至少圖片 alt、SEO 必填）並阻擋發布，列出缺漏項目。
- FR-013: 單銀幕視圖必須預載相鄰 1～2 張，並延遲載入其他圖片以控制 CLS 與效能。

不明確或需澄清事項：
- FR-014: 最近 N 次版本的 N 具體值為多少？[NEEDS CLARIFICATION]
- FR-015: SEO 必填欄位的最小集合是否為「標題＋描述」？OG 圖是否必填？[NEEDS CLARIFICATION]
- FR-016: 行動版「幾何相機圖樣」的降級策略（完全隱藏或透明度/尺寸減少）？[NEEDS CLARIFICATION]
- FR-017: 點點條最大張數與分段策略（超長集合時的可用性）？[NEEDS CLARIFICATION]
- FR-018: 版本差異摘要是否需顯示每張圖片文字的差異，或僅顯示張數/順序變更？[NEEDS CLARIFICATION]

### Key Entities (include if feature involves data)
- Collections：新增屬性 publish_note（文字）、version（遞增整數）；狀態包含 draft/published；具 published_at。
- CollectionAssets：每張照片具 text（可空、可 Markdown/Richtext）與 slide_index（顯示順序，等同 order）。
- AuditLogs：記錄 who、action（publish/unpublish/edit）、entity（collection/id）、payload_json、created_at。

---

## Review & Acceptance Checklist
GATE: Automated checks run during main() execution

### Content Quality
- [ ] No implementation details (languages, frameworks, APIs)
- [ ] Focused on user value and business needs
- [ ] Written for non-technical stakeholders
- [ ] All mandatory sections completed

### Requirement Completeness
- [ ] No [NEEDS CLARIFICATION] markers remain
- [ ] Requirements are testable and unambiguous  
- [ ] Success criteria are measurable
- [ ] Scope is clearly bounded
- [ ] Dependencies and assumptions identified

---

## Execution Status
Updated by main() during processing

- [x] User description parsed
- [x] Key concepts extracted
- [x] Ambiguities marked
- [x] User scenarios defined
- [x] Requirements generated
- [x] Entities identified
- [ ] Review checklist passed

---
