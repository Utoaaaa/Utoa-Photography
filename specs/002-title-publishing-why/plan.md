
# Implementation Plan: 個人攝影網站 — 後台發布頁面（Publishing）＋首頁與作品集呈現修改

**Branch**: `002-title-publishing-why` | **Date**: 2025-09-20 | **Spec**: `/Users/utoaaaa/檔案/Web app/Utoa-Photography/specs/002-title-publishing-why/spec.md`
**Input**: Feature specification from `/Users/utoaaaa/檔案/Web app/Utoa-Photography/specs/002-title-publishing-why/spec.md`

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
本次增補聚焦三面向：
- 後台 Publishing：單一頁面完成草稿審查、預覽、SEO/OG 設定、發布/下架、版本備註、快取失效與版本紀錄。
- 首頁：左上角品牌「utoa」縮小且靠左上；右側呈現低密度幾何相機圖樣（行動版降級）。
- 作品集詳頁：改為「一銀幕一張圖＋對應文字」，支援滑動/鍵盤/點點條切換，保留麵包屑與可及性要求。

技術策略（研究結論預覽）：
- 公開站點維持「靜態優先」交付；前台頁面以預先產出資料驅動（JSON/MD 內容）生成靜態頁，圖片用多格式與延遲載入。
- 後台 Publishing 分離為「私有發布工具」：可為本地 CLI/工作流或私有 Worker（僅後台使用），負責寫入版本與資產中繼資料，最終以 PR/部署觸發靜態站點重建與 CDN 失效。此為對憲法 I 原則的有限偏離並記錄於 Complexity Tracking。

## Technical Context
**Language/Version**: TypeScript 5.2+  
**Primary Dependencies**: Next.js 14 (App Router), Tailwind CSS, shadcn/ui, GSAP, Lenis  
**Storage**: 內容以靜態檔（JSON/MD）為主；私有發布工具可使用 Cloudflare D1 作為中繼/審稿儲存（非公開站點依賴）  
**Media**: Cloudflare Images（Direct Upload，產生多變體）  
**Testing**: Jest、React Testing Library、Playwright（結合 Lighthouse CI 與 HTML 驗證）  
**Target Platform**: 靜態網站（CDN），私有工具可部署於 Cloudflare Workers（僅後台）  
**Project Type**: web（前台靜態、後台私有工具）  
**Performance Goals**: LCP ≤ 2.5s、INP ≤ 200ms、CLS ≤ 0.1；Lighthouse 各分數 ≥ 90  
**Constraints**: 總 JS ≤ 150KB、總 CSS ≤ 50KB（gzip）；無 JS 也可瀏覽核心內容與導覽  
**Scale/Scope**: 單作者、單語系；作品集數十個、每集數十張圖

## Constitution Check
*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

對照憲法 v1.0.0：
- I. Static-First（非協商）：公開站點必須可純靜態交付。→ 設計採「前台靜態、後台分離」：
   - 公開頁面（首頁/年份/作品集）皆由靜態建置產生。
   - 後台 Publishing 作為私有工具（本地 CLI 或私有 Worker），不屬公開站點核心，不違反公開站點的靜態要求。此分離需在文件與部署流程中明確標示。
- II. 可及性與效能預算：維持並在詳頁的新視圖中預載鄰近 1–2 張、懸停/焦點明確、ARIA 完整。
- III. 漸進式增強與無 JS 基線：
   - 前台：單銀幕視圖在無 JS 時以每張獨立錨點/分页連結方式瀏覽，點點條退化為連結清單。
   - 後台：屬私有工具，不受公開站點基線限制，但仍應可漸進增強與可存取。
- IV. 測試與 CI Gates：需加入 Lighthouse CI、HTML 驗證、Link 檢查與資產預算檢查。
- V. 版本與可觀測性：發布版本以版本號（collections.version）與部署標籤追蹤；提供回滾簡化。

初始 GATE 評估：
- 公開站點：PASS（靜態交付）
- 後台工具：受控偏離（需在 Complexity Tracking 記錄並提供替代方案比較）

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

**Structure Decision**: Option 2（Web application）
- 公開站點：現有 `src/app/(site)` 保持；建置輸出純靜態。
- 私有後台工具：若採 Worker/CLI，源碼可置於 `tools/publishing/`（不影響公開站點構建）。

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

**Output**: data-model.md, /contracts/*, quickstart.md, agent-specific file

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
| 私有後台（非純靜態） | 需要即時預覽、編輯、版本與資產管理 | 純 Git CMS 難以提供影像直傳與即時預覽；用 PR 流程延遲較高 |


## Progress Tracking
*This checklist is updated during execution flow*

**Phase Status**:
- [x] Phase 0: Research complete (/plan command)
- [x] Phase 1: Design complete (/plan command)
- [ ] Phase 2: Task planning complete (/plan command - describe approach only)
- [ ] Phase 3: Tasks generated (/tasks command)
- [ ] Phase 4: Implementation complete
- [ ] Phase 5: Validation passed

**Gate Status**:
- [x] Initial Constitution Check: PASS（公開站點）/ Documented deviation（後台）
- [x] Post-Design Constitution Check: PASS
- [x] All NEEDS CLARIFICATION resolved（以預設值落實，可覆議）
- [x] Complexity deviations documented

---
*Based on Constitution v1.0.0 - See `.specify/memory/constitution.md`*
