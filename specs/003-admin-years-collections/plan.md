# Implementation Plan: Admin 子系統缺頁面與缺端點補齊（Years / Collections / Uploads ＋ Images & Assets API）

**Branch**: `003-admin-years-collections` | **Date**: 2025-09-21 | **Spec**: `/Users/utoaaaa/檔案/Web app/Utoa-Photography/specs/003-admin-years-collections/spec.md`
**Input**: Feature specification from `/specs/003-admin-years-collections/spec.md`

## Execution Flow (/plan command scope)
```
1. Load feature spec from Input path
   → If not found: ERROR "No feature spec at {path}"
2. Fill Technical Context (scan for NEEDS CLARIFICATION)
   → Detect Project Type from context (web=frontend+backend, mobile=app+api)
   → Set Structure Decision based on project type
3. Fill the Constitution Check section based on the content of the constitution document.
4. Evaluate Constitution Check section below
   → If violations exist: Document in Complexity Tracking
   → If no justification possible: ERROR "Simplify approach first"
   → Update Progress Tracking: Initial Constitution Check
5. Execute Phase 0 → research.md
   → If NEEDS CLARIFICATION remain: ERROR "Resolve unknowns"
6. Execute Phase 1 → contracts, data-model.md, quickstart.md, agent-specific template file
7. Re-evaluate Constitution Check section
   → If new violations: Refactor design, return to Phase 1
   → Update Progress Tracking: Post-Design Constitution Check
8. Plan Phase 2 → Describe task generation approach (DO NOT create tasks.md)
9. STOP - Ready for /tasks command
```

**IMPORTANT**: The /plan command STOPS at step 7. Phases 2-4 are executed by other commands:
- Phase 2: /tasks command creates tasks.md
- Phase 3-4: Implementation execution (manual or via tools)

## Summary
本功能的主要目標是補齊三個 Admin 子頁（`/admin/years`、`/admin/collections`、`/admin/uploads`）與三組公開 API（`/api/images/direct-upload`、`/api/assets`、`/api/collections/:id/assets`），以讓既有測試（`test_admin_cms.ts`、`test_image_upload.test.ts`、`test_image_workflow.ts`、`test_assets_post.ts`）全部通過，並確保內容寫入可觸發前台快取失效。部署採 OpenNext → Cloudflare Workers，資料儲存於 D1；權限以 Cloudflare Access 保護 Admin 與寫入 API，測試時可用環境變數略過驗證。

## Technical Context
**Language/Version**: TypeScript, Next.js 15.x, React 19.x  
**Primary Dependencies**: Next.js App Router, OpenNext, Wrangler, Prisma (D1 驅動), shadcn-ui（UI 範式，僅做指引）、Lenis、GSAP（僅動效）  
**Storage**: Cloudflare D1（years, collections, assets, collection_assets 等）  
**Testing**: Jest（unit/integration/contract）、Playwright（e2e，若啟用）  
**Target Platform**: Cloudflare Workers（Edge）、CDN 靜態發佈（public site）  
**Project Type**: web（前後端同 repo；App Router + Route Handlers）  
**Performance Goals**: 後台主要操作平均回應 < 400ms（不含上傳）；前台維持憲法之 Lighthouse 與 CWV 門檻  
**Constraints**: 靜態優先（前台無需伺服端運行）、可及性與資產預算；Admin 與寫入 API 經 Access 保護；客戶端不暴露機密  
**Scale/Scope**: 個人網站管理，資料量中小型，並以穩定 CI 驗證為目標

## Constitution Check
根據 `.specify/memory/constitution.md`：
- I. Static-First Delivery（非談判）：前台公開頁面維持可純靜態輸出與 CDN 佈署；本次新增之 Admin 與寫入 API 屬「非核心（private/admin）」能力，僅於 Workers 執行，不影響前台靜態原則。
- II. A11y & Performance Budgets：Admin UI 提供鍵盤操作、清晰錯誤；前台圖片與樣式維持預算與 LCP/CLS 目標。
- III. Progressive Enhancement & No-JS Baseline：前台核心內容與導覽在無 JS 仍可用；Admin 介面以增強為主但須提供可及性替代（排序可上下移動）。
- IV. Testing & CI Gates：保留 HTML 驗證、Lighthouse、連結檢查與資產預算；本輪著重讓現有測試綠燈。
- V. Versioning, URLs, Observability：不破壞現有公開 URL；寫入操作記錄於稽核；快取失效具可觀測性。

結論：存在「私有動態能力」對 Static-First 的例外，但僅限 Admin/API 域，且不影響公開站點的靜態輸出。記載於 Complexity Tracking 以示化解方案與邊界；狀態：可接受並通過初始檢查（附帶說明）。

## Project Structure

**Structure Decision**: Option 1（單一專案，維持現有 `src/` 與 `tests/` 結構；Admin 與 API 走 App Router 群組與 Route Handlers）

### Documentation (this feature)
```
specs/003-admin-years-collections/
├── plan.md              # This file (/plan command output)
├── research.md          # Phase 0 output (/plan command)
├── data-model.md        # Phase 1 output (/plan command)
├── quickstart.md        # Phase 1 output (/plan command)
├── contracts/           # Phase 1 output (/plan command)
└── tasks.md             # Phase 2 output (/tasks command - NOT created by /plan)
```

## Phase 0: Outline & Research
1) Unknowns 解題與選型彙整將寫至 `research.md`，含：
- 測試/CI 環境變數來源與命名（TEST_API_URL、TEST_API_BASE、BYPASS_ACCESS_FOR_TESTS）
- 路由與權限邊界（Admin 與寫入 API 經 Access；本地/CI 可 bypass）
- D1 欄位補充與 migration 策略（collections.publish_note/version；collection_assets.text/slide_index）
- 快取失效標籤策略與重試/告警面向
2) 研究輸出包含「決策/理由/替代方案」。

## Phase 1: Design & Contracts
1) `data-model.md`：根據規格整理 Year、Collection、Asset、CollectionAsset、AuditLog 欄位與關係、唯一性規則與檢核。
2) `contracts/`：以 OpenAPI（YAML）描述最小契約：
   - POST `/api/images/direct-upload`
   - `/api/assets`（GET, POST）、`/api/assets/{id}`（PUT, DELETE）
   - `/api/collections/{id}/assets`（POST, PUT）、`/api/collections/{id}/assets/{assetId}`（DELETE）
   - 通用錯誤格式 `{ error: string }`、最小資源結構與分頁回應
3) `quickstart.md`：本地/CI 環境設定、啟動、執行測試與常見錯誤排除。
4) 代理檔更新：執行 `.specify/scripts/bash/update-agent-context.sh copilot` 增量記錄技術關鍵字。

## Phase 2: Task Planning Approach
（僅描述，不生成檔案）
- 來源：contracts、data-model、quickstart 的具體設計
- 策略：
  - 每個契約 → 對應 contract 測試任務 [P]
  - 每個實體 → 模型/查詢層任務 [P]
  - 每個使用者故事 → 整合測試任務
  - 依 TDD 與依賴順序（模型 → 服務 → API/UI）展開
  - 約 25–30 項任務，並標注可平行者

## Complexity Tracking
| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| Admin/API 需 Workers 動態執行（違反 Strict Static-Only） | 後台管理、直傳與資料寫入屬非公開核心，但必須存在 | 僅用純靜態無法支援上傳、排序、刪除；將其標註為私有域、以 Access 保護並與前台靜態分離 |

## Progress Tracking

**Phase Status**:
- [x] Phase 0: Research complete (/plan command)
- [x] Phase 1: Design complete (/plan command)
- [ ] Phase 2: Task planning complete (/plan command - describe approach only)
- [ ] Phase 3: Tasks generated (/tasks command)
- [ ] Phase 4: Implementation complete
- [ ] Phase 5: Validation passed

**Gate Status**:
- [x] Initial Constitution Check: PASS
- [x] Post-Design Constitution Check: PASS
- [x] All NEEDS CLARIFICATION resolved
- [x] Complexity deviations documented

---
*Based on Constitution v1.0.0 - See `.specify/memory/constitution.md`*


# Implementation Plan: [FEATURE]

**Branch**: `[###-feature-name]` | **Date**: [DATE] | **Spec**: [link]
**Input**: Feature specification from `/specs/[###-feature-name]/spec.md`

## Execution Flow (/plan command scope)
```
1. Load feature spec from Input path
   → If not found: ERROR "No feature spec at {path}"
2. Fill Technical Context (scan for NEEDS CLARIFICATION)
   → Detect Project Type from context (web=frontend+backend, mobile=app+api)
   → Set Structure Decision based on project type
3. Fill the Constitution Check section based on the content of the constitution document.
4. Evaluate Constitution Check section below
   → If violations exist: Document in Complexity Tracking
   → If no justification possible: ERROR "Simplify approach first"
   → Update Progress Tracking: Initial Constitution Check
5. Execute Phase 0 → research.md
   → If NEEDS CLARIFICATION remain: ERROR "Resolve unknowns"
6. Execute Phase 1 → contracts, data-model.md, quickstart.md, agent-specific template file (e.g., `CLAUDE.md` for Claude Code, `.github/copilot-instructions.md` for GitHub Copilot, `GEMINI.md` for Gemini CLI, `QWEN.md` for Qwen Code or `AGENTS.md` for opencode).
7. Re-evaluate Constitution Check section
   → If new violations: Refactor design, return to Phase 1
   → Update Progress Tracking: Post-Design Constitution Check
8. Plan Phase 2 → Describe task generation approach (DO NOT create tasks.md)
9. STOP - Ready for /tasks command
```

**IMPORTANT**: The /plan command STOPS at step 7. Phases 2-4 are executed by other commands:
- Phase 2: /tasks command creates tasks.md
- Phase 3-4: Implementation execution (manual or via tools)

## Summary
[Extract from feature spec: primary requirement + technical approach from research]

## Technical Context
**Language/Version**: [e.g., Python 3.11, Swift 5.9, Rust 1.75 or NEEDS CLARIFICATION]  
**Primary Dependencies**: [e.g., FastAPI, UIKit, LLVM or NEEDS CLARIFICATION]  
**Storage**: [if applicable, e.g., PostgreSQL, CoreData, files or N/A]  
**Testing**: [e.g., pytest, XCTest, cargo test or NEEDS CLARIFICATION]  
**Target Platform**: [e.g., Linux server, iOS 15+, WASM or NEEDS CLARIFICATION]
**Project Type**: [single/web/mobile - determines source structure]  
**Performance Goals**: [domain-specific, e.g., 1000 req/s, 10k lines/sec, 60 fps or NEEDS CLARIFICATION]  
**Constraints**: [domain-specific, e.g., <200ms p95, <100MB memory, offline-capable or NEEDS CLARIFICATION]  
**Scale/Scope**: [domain-specific, e.g., 10k users, 1M LOC, 50 screens or NEEDS CLARIFICATION]

## Constitution Check
*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

[Gates determined based on constitution file]

## Project Structure

### Documentation (this feature)
```
specs/[###-feature]/
├── plan.md              # This file (/plan command output)
├── research.md          # Phase 0 output (/plan command)
├── data-model.md        # Phase 1 output (/plan command)
├── quickstart.md        # Phase 1 output (/plan command)
├── contracts/           # Phase 1 output (/plan command)
└── tasks.md             # Phase 2 output (/tasks command - NOT created by /plan)
```

### Source Code (repository root)
```
# Option 1: Single project (DEFAULT)
src/
├── models/
├── services/
├── cli/
└── lib/

tests/
├── contract/
├── integration/
└── unit/

# Option 2: Web application (when "frontend" + "backend" detected)
backend/
├── src/
│   ├── models/
│   ├── services/
│   └── api/
└── tests/

frontend/
├── src/
│   ├── components/
│   ├── pages/
│   └── services/
└── tests/

# Option 3: Mobile + API (when "iOS/Android" detected)
api/
└── [same as backend above]

ios/ or android/
└── [platform-specific structure]
```

**Structure Decision**: [DEFAULT to Option 1 unless Technical Context indicates web/mobile app]

## Phase 0: Outline & Research
1. **Extract unknowns from Technical Context** above:
   - For each NEEDS CLARIFICATION → research task
   - For each dependency → best practices task
   - For each integration → patterns task

2. **Generate and dispatch research agents**:
   ```
   For each unknown in Technical Context:
     Task: "Research {unknown} for {feature context}"
   For each technology choice:
     Task: "Find best practices for {tech} in {domain}"
   ```

3. **Consolidate findings** in `research.md` using format:
   - Decision: [what was chosen]
   - Rationale: [why chosen]
   - Alternatives considered: [what else evaluated]

**Output**: research.md with all NEEDS CLARIFICATION resolved

## Phase 1: Design & Contracts
*Prerequisites: research.md complete*

1. **Extract entities from feature spec** → `data-model.md`:
   - Entity name, fields, relationships
   - Validation rules from requirements
   - State transitions if applicable

2. **Generate API contracts** from functional requirements:
   - For each user action → endpoint
   - Use standard REST/GraphQL patterns
   - Output OpenAPI/GraphQL schema to `/contracts/`

3. **Generate contract tests** from contracts:
   - One test file per endpoint
   - Assert request/response schemas
   - Tests must fail (no implementation yet)

4. **Extract test scenarios** from user stories:
   - Each story → integration test scenario
   - Quickstart test = story validation steps

5. **Update agent file incrementally** (O(1) operation):
   - Run `.specify/scripts/bash/update-agent-context.sh copilot` for your AI assistant
   - If exists: Add only NEW tech from current plan
   - Preserve manual additions between markers
   - Update recent changes (keep last 3)
   - Keep under 150 lines for token efficiency
   - Output to repository root

**Output**: data-model.md, /contracts/*, failing tests, quickstart.md, agent-specific file

## Phase 2: Task Planning Approach
*This section describes what the /tasks command will do - DO NOT execute during /plan*

**Task Generation Strategy**:
- Load `.specify/templates/tasks-template.md` as base
- Generate tasks from Phase 1 design docs (contracts, data model, quickstart)
- Each contract → contract test task [P]
- Each entity → model creation task [P] 
- Each user story → integration test task
- Implementation tasks to make tests pass

**Ordering Strategy**:
- TDD order: Tests before implementation 
- Dependency order: Models before services before UI
- Mark [P] for parallel execution (independent files)

**Estimated Output**: 25-30 numbered, ordered tasks in tasks.md

**IMPORTANT**: This phase is executed by the /tasks command, NOT by /plan

## Phase 3+: Future Implementation
*These phases are beyond the scope of the /plan command*

**Phase 3**: Task execution (/tasks command creates tasks.md)  
**Phase 4**: Implementation (execute tasks.md following constitutional principles)  
**Phase 5**: Validation (run tests, execute quickstart.md, performance validation)

## Complexity Tracking
*Fill ONLY if Constitution Check has violations that must be justified*

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| [e.g., 4th project] | [current need] | [why 3 projects insufficient] |
| [e.g., Repository pattern] | [specific problem] | [why direct DB access insufficient] |


## Progress Tracking
*This checklist is updated during execution flow*

**Phase Status**:
- [ ] Phase 0: Research complete (/plan command)
- [ ] Phase 1: Design complete (/plan command)
- [ ] Phase 2: Task planning complete (/plan command - describe approach only)
- [ ] Phase 3: Tasks generated (/tasks command)
- [ ] Phase 4: Implementation complete
- [ ] Phase 5: Validation passed

**Gate Status**:
- [ ] Initial Constitution Check: PASS
- [ ] Post-Design Constitution Check: PASS
- [ ] All NEEDS CLARIFICATION resolved
- [ ] Complexity deviations documented

---
*Based on Constitution v1.0.0 - See `.specify/memory/constitution.md`*
