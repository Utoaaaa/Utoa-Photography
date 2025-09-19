
# Implementation Plan: 個人攝影作品展示網站（首頁年表式導覽＋作品集模板＋極簡留白風）

**Branch**: `001-` | **Date**: 2025年9月19日 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/Users/utoaaaa/檔案/Web app/Utoa Photography/specs/001-/spec.md`

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
個人攝影作品展示網站，採用三層式導覽架構（首頁年表 → 年份頁 → 作品集詳頁），重視極簡留白美學搭配相機幾何元素。技術策略為 Next.js App Router + Cloudflare Workers + D1，以 SSR 與邊緣快取確保效能，並採用 Direct Upload 與 Images 服務提供優化的媒體交付體驗。

## Technical Context
**Language/Version**: TypeScript 5.2+, Node.js 18+  
**Primary Dependencies**: Next.js 14+ (App Router), React 18+, Tailwind CSS, Prisma ORM, GSAP, Lenis  
**Storage**: Cloudflare D1 (SQLite), Cloudflare Images (媒體儲存)  
**Testing**: Jest, React Testing Library, Playwright (E2E), Lighthouse CI  
**Target Platform**: Cloudflare Workers (via OpenNext adapter)  
**Project Type**: web - Next.js 全棧應用含前後台  
**Performance Goals**: LCP ≤ 2.5s, INP ≤ 200ms, CLS ≤ 0.1, 首頁→年份 CTR ≥ 35%  
**Constraints**: 靜態優先部署, Edge-first 快取策略, 響應式設計, WCAG 2.1 AA 相容  
**Scale/Scope**: 預計 50+ 年份, 500+ 作品集, 5000+ 照片, 支援月流量 10K+ 訪客

## Constitution Check
*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### ⚠️ Constitutional Conflicts Identified

**I. Static-First Delivery (NON-NEGOTIABLE)**  
❌ **VIOLATION**: 技術選型採用 Cloudflare Workers (SSR) + D1 Database，無法產生純靜態檔案
- 需要伺服器端執行與資料庫查詢
- Admin 功能需要動態後端 API  
- 圖片上傳需要 Direct Upload token 生成

**Justification Required**: 此功能本質上需要動態內容管理系統
- **核心需求**: Admin 用戶需要即時上傳、編輯、發布內容
- **資料複雜性**: 年份、作品集、照片的關聯與排序需要結構化資料庫
- **媒體處理**: 需要 Cloudflare Images 的動態變形與最佳化

**Mitigation Strategy**:
- 前台採用 SSR with Edge Caching，最大程度減少伺服器負載
- 發布內容後觸發邊緣快取更新，提供近似靜態的訪客體驗  
- 未來可考慮 ISG (Incremental Static Generation) 混合策略

**II-V. Other Principles**: ✅ COMPLIANT
- Performance budgets: 設定明確的 Core Web Vitals 目標
- Progressive enhancement: 基礎導覽功能可無 JS 運作
- Testing gates: 整合 Lighthouse CI 與自動化測試
- Versioning: 採用語意化版本控制

### ✅ Post-Design Constitution Re-Check
經過 Phase 1 設計後重新檢視：
- **效能預算**: API contracts 設定回應時間限制
- **漸進增強**: quickstart.md 驗證無 JS 基本功能
- **測試閘門**: contract tests 涵蓋所有 API 端點
- **可觀測性**: 快取策略與錯誤處理機制明確

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

**Structure Decision**: Option 2 (Web application) - Next.js 全棧專案，採用 route groups 分離 (site) 與 (admin)

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
- Load `.specify/templates/tasks-template.md` as base structure
- Generate TDD-ordered tasks from Phase 1 artifacts:
  - Each API endpoint in contracts/ → contract test task [P]
  - Each data model entity → model creation task [P]
  - Each UI component in quickstart → component test task
  - Integration scenarios from user stories → E2E test tasks
- Implementation tasks to make all tests pass

**Ordering Strategy**:
- **Red Phase**: All failing tests first (contracts, models, components)
- **Green Phase**: Implementation to pass tests (TDD cycle)
- **Refactor Phase**: Optimization and polish tasks
- Mark [P] for parallel execution when files are independent

**Estimated Task Categories**:
1. **Setup & Infrastructure** (5-8 tasks): DB schema, API routing, auth
2. **Contract Tests** (8-12 tasks): All API endpoints from OpenAPI spec
3. **Data Layer** (6-10 tasks): Models, queries, migrations  
4. **UI Components** (10-15 tasks): Pages, components, animations
5. **Integration** (5-8 tasks): E2E flows, cache validation
6. **Polish** (3-5 tasks): SEO, performance, A11y validation

**Total Estimated**: 37-58 numbered, dependency-ordered tasks

**Key Dependencies Identified**:
- Database schema → Model implementations
- Contract tests → API implementations  
- Core components → Animation integration
- Basic flows → Performance optimization

**IMPORTANT**: Phase 2 execution (creating tasks.md) is handled by the `/tasks` command

## Phase 3+: Future Implementation
*These phases are beyond the scope of the /plan command*

**Phase 3**: Task execution (/tasks command creates tasks.md)  
**Phase 4**: Implementation (execute tasks.md following constitutional principles)  
**Phase 5**: Validation (run tests, execute quickstart.md, performance validation)

## Complexity Tracking
*Fill ONLY if Constitution Check has violations that must be justified*

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| Dynamic SSR + Database | Admin CMS 功能必須即時更新發布內容 | 靜態檔案無法支援動態內容管理與即時圖片上傳 |
| Server-side execution | 圖片處理、排序、發布狀態需要後端邏輯 | JAMstack 生成器無法滿足即時編輯需求 |


## Progress Tracking
*This checklist is updated during execution flow*

**Phase Status**:
- [x] Phase 0: Research complete (/plan command)
- [x] Phase 1: Design complete (/plan command)
- [x] Phase 2: Task planning complete (/plan command - describe approach only)
- [ ] Phase 3: Tasks generated (/tasks command)
- [ ] Phase 4: Implementation complete
- [ ] Phase 5: Validation passed

**Gate Status**:
- [x] Initial Constitution Check: PASS (with documented violations)
- [x] Post-Design Constitution Check: PASS
- [x] All NEEDS CLARIFICATION resolved
- [x] Complexity deviations documented

**Artifacts Generated**:
- [x] research.md - Technical decisions and alternatives analysis
- [x] data-model.md - Entity definitions and relationships  
- [x] contracts/api-spec.yaml - OpenAPI specification
- [x] contracts/test-contracts.md - Contract testing strategy
- [x] quickstart.md - Setup and validation guide
- [x] .github/copilot-instructions.md - Updated agent context

---
*Based on Constitution v1.0.0 - See `.specify/memory/constitution.md`*
