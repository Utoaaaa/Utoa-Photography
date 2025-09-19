<!--
Sync Impact Report
- Version change: N/A → 1.0.0
- Modified principles:
	• I. Static-First Delivery (NON-NEGOTIABLE)
	• II. Accessibility & Performance Budgets
	• III. Progressive Enhancement & No-JS Baseline
	• IV. Testing & CI Gates
	• V. Versioning, URLs, and Observability
- Added sections:
	• Technical & Security Constraints
	• Development Workflow & Quality Gates
- Removed sections: None
- Templates requiring updates:
	• .specify/templates/plan-template.md → ✅ aligned (Constitution Check gates map to budgets/static-only rule)
	• .specify/templates/spec-template.md → ✅ aligned (testable requirements focus)
	• .specify/templates/tasks-template.md → ✅ aligned (TDD and categories unchanged)
	• .specify/templates/agent-file-template.md → ✅ aligned (no agent-specific conflicts)
	• README.md → ⚠ pending (add quickstart + principles summary)
- Follow-up TODOs:
	• TODO(RATIFICATION_DATE): Provide original adoption date
	• ⚠ Create CI configs later: Lighthouse CI, HTML validation, link checker
-->

# Utoa Photography Constitution

## Core Principles

### I. Static-First Delivery (NON-NEGOTIABLE)
The site MUST be deployable as static files to a CDN without any custom
server or runtime. Build outputs MUST be self-contained.
- Build MUST produce a single `dist/` (or equivalent) folder of static assets.
- No server-side execution, databases, or custom APIs are allowed for core
	features. Third-party APIs MAY be used from the client only when safe.
- Caching policy: HTML SHOULD be cacheable with short TTL and revalidation;
	static assets (CSS/JS/images/fonts) MUST use content hashes and
	`Cache-Control: public, max-age=31536000, immutable`.

### II. Accessibility & Performance Budgets
Pages MUST meet measurable quality thresholds on representative routes
(home, gallery/listing, detail/contact pages) using mobile emulation.
- Lighthouse scores: Performance ≥ 90, Accessibility ≥ 90, Best Practices ≥ 90,
	SEO ≥ 90.
- Core Web Vitals: CLS ≤ 0.1, LCP ≤ 2.5s on 4x CPU throttling, 1.6Mbps.
- Asset budgets (gzipped): total JS ≤ 150KB, total CSS ≤ 50KB.
- Images MUST be responsive (`srcset`/sizes), modern formats (AVIF/WEBP) when
	supported, and lazy-loaded when not above the fold.
- Critical CSS MAY be inlined up to ~10KB; all non-critical JS MUST be
	deferred or loaded asynchronously.

### III. Progressive Enhancement & No-JS Baseline
Core content and navigation MUST work without JavaScript.
- Primary navigation, text content, images, contact information/forms MUST be
	accessible with JS disabled (serverless/host-native form handlers acceptable).
- Client-side routing frameworks (SPA) are NOT allowed unless justified in the
	plan with a Constitution Check pass documenting necessity and trade-offs.
- Enhancements SHOULD not block content rendering; failures of JS MUST degrade
	gracefully without breaking navigation or core flows.

### IV. Testing & CI Gates
Every pull request MUST pass automated quality gates before merge.
- HTML validation and link checking MUST report zero errors on the built site.
- Lighthouse CI MUST enforce the budgets and thresholds defined above.
- Image and asset lints MUST fail the build if budgets are exceeded (by type).
- Preview deploys per PR MUST be produced for reviewer validation.

### V. Versioning, URLs, and Observability
Changes MUST be tracked and rollbacks MUST be straightforward.
- Semantic Versioning: MAJOR for breaking URL/path or structure changes,
	MINOR for new pages/sections, PATCH for content/style fixes.
- URLs MUST be stable; removed/renamed pages MUST provide 301 redirects and a
	usable 404 page.
- Releases MUST be tagged (`vX.Y.Z`) and linked to the deploy. Build logs and
	artifacts SHOULD be retained for auditability.

## Technical & Security Constraints

- Technology stack: HTML5, CSS3, optional vanilla JS. Any build tooling used
	MUST output static assets only (e.g., no server adapters). No secrets may be
	required at runtime in the client.
- Hosting: CDN-backed static hosting with HTTPS enforced. HTTP requests MUST
	redirect to HTTPS.
- Security headers (via host config): HSTS, `X-Content-Type-Options: nosniff`,
	`Referrer-Policy: no-referrer-when-downgrade` (or stricter), and a CSP that
	restricts scripts and styles to trusted origins. Third-party embeds MUST be
	explicitly allowed in CSP and justified.
- Data handling: No PII is stored in the client beyond session memory.
	Contact forms SHOULD use host-provided/serverless handlers or vetted
	third-party services; API keys MUST NOT be embedded as secrets.
- Assets: Images MUST be optimized, responsive, and sized for targets; fonts
	SHOULD use modern formats with `font-display: swap`.

## Development Workflow & Quality Gates

- Branching & review: Feature branches with at least one reviewer approval.
- Pre-commit: Formatting and linting configured per repository (HTML/CSS/JS).
- CI steps (required): build → HTML validation → link check → Lighthouse CI →
	asset budget checks → preview deploy. Any failure blocks merge.
- Release: Tag `vX.Y.Z`, update changelog summary, store Lighthouse results and
	deploy URL. Ensure rollback to last successful release is one click/command.

## Governance

This Constitution supersedes other practices for this project. Amendments
require a pull request describing the change, impact analysis (including URL
stability and redirects), proposed version bump, and any migration steps.
Compliance MUST be verified in PR reviews, and violations MUST include a
documented justification and follow-up plan.

**Version**: 1.0.0 | **Ratified**: TODO(RATIFICATION_DATE) | **Last Amended**: 2025-09-19
# [PROJECT_NAME] Constitution
<!-- Example: Spec Constitution, TaskFlow Constitution, etc. -->

## Core Principles

### [PRINCIPLE_1_NAME]
<!-- Example: I. Library-First -->
[PRINCIPLE_1_DESCRIPTION]
<!-- Example: Every feature starts as a standalone library; Libraries must be self-contained, independently testable, documented; Clear purpose required - no organizational-only libraries -->

### [PRINCIPLE_2_NAME]
<!-- Example: II. CLI Interface -->
[PRINCIPLE_2_DESCRIPTION]
<!-- Example: Every library exposes functionality via CLI; Text in/out protocol: stdin/args → stdout, errors → stderr; Support JSON + human-readable formats -->

### [PRINCIPLE_3_NAME]
<!-- Example: III. Test-First (NON-NEGOTIABLE) -->
[PRINCIPLE_3_DESCRIPTION]
<!-- Example: TDD mandatory: Tests written → User approved → Tests fail → Then implement; Red-Green-Refactor cycle strictly enforced -->

### [PRINCIPLE_4_NAME]
<!-- Example: IV. Integration Testing -->
[PRINCIPLE_4_DESCRIPTION]
<!-- Example: Focus areas requiring integration tests: New library contract tests, Contract changes, Inter-service communication, Shared schemas -->

### [PRINCIPLE_5_NAME]
<!-- Example: V. Observability, VI. Versioning & Breaking Changes, VII. Simplicity -->
[PRINCIPLE_5_DESCRIPTION]
<!-- Example: Text I/O ensures debuggability; Structured logging required; Or: MAJOR.MINOR.BUILD format; Or: Start simple, YAGNI principles -->

## [SECTION_2_NAME]
<!-- Example: Additional Constraints, Security Requirements, Performance Standards, etc. -->

[SECTION_2_CONTENT]
<!-- Example: Technology stack requirements, compliance standards, deployment policies, etc. -->

## [SECTION_3_NAME]
<!-- Example: Development Workflow, Review Process, Quality Gates, etc. -->

[SECTION_3_CONTENT]
<!-- Example: Code review requirements, testing gates, deployment approval process, etc. -->

## Governance
<!-- Example: Constitution supersedes all other practices; Amendments require documentation, approval, migration plan -->

[GOVERNANCE_RULES]
<!-- Example: All PRs/reviews must verify compliance; Complexity must be justified; Use [GUIDANCE_FILE] for runtime development guidance -->

**Version**: [CONSTITUTION_VERSION] | **Ratified**: [RATIFICATION_DATE] | **Last Amended**: [LAST_AMENDED_DATE]
<!-- Example: Version: 2.1.1 | Ratified: 2025-06-13 | Last Amended: 2025-07-16 -->