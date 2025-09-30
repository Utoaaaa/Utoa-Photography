<!--
Sync Impact Report
- Version change: 1.0.0 → 1.1.0
- Modified principles:
	• II. Accessibility & Performance Budgets (clarified budgets wording)
	• IV. Testing & CI Gates (added mechanized guards reference)
- Added sections/principles:
	• VI. Browser/SSR Safety & Optional Chaining Ban (new core principle)
	• Technical & Security Constraints: zero top-level side effects, dynamic 3P loading
- Removed sections: None
- Templates requiring updates:
	• .specify/templates/plan-template.md → ✅ aligned (Constitution Check pulls new gates)
	• .specify/templates/spec-template.md → ✅ aligned (no change required)
	• .specify/templates/tasks-template.md → ✅ aligned (no change required)
	• .specify/templates/agent-file-template.md → ✅ aligned (no agent-specific conflicts)
	• README.md → ⚠ pending (summarize coding standards + CI commands)
- Repo sync actions in this change:
	• eslint.config.mjs → ✅ add no-restricted-syntax to forbid optional call
	• package.json → ✅ add CI grep checks and quick scan script
	• src/lib/utils.ts → ✅ add isBrowser(), shouldReduceMotion()
	• src/lib/gsap-loader.ts → ✅ add dynamic loader with single registration
- Follow-up TODOs:
	• TODO(RATIFICATION_DATE): Provide original adoption date
	• Consider adding a pre-push hook to run CI grep locally
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
- Mechanized guards MUST enforce coding standards (see Development Workflow).

### V. Versioning, URLs, and Observability
Changes MUST be tracked and rollbacks MUST be straightforward.
- Semantic Versioning: MAJOR for breaking URL/path or structure changes,
	MINOR for new pages/sections, PATCH for content/style fixes.
- URLs MUST be stable; removed/renamed pages MUST provide 301 redirects and a
	usable 404 page.
- Releases MUST be tagged (`vX.Y.Z`) and linked to the deploy. Build logs and
	artifacts SHOULD be retained for auditability.

### VI. Browser/SSR Safety & Optional Chaining Ban
Runtime safety across RSC/SSR and browsers is NON-NEGOTIABLE.
- Optional calls are FORBIDDEN: `fn?.()`, `obj?.method(...)`. Use explicit guards:
	- `if (typeof fn === 'function') fn(a, b)`
	- `const m = obj && (obj as any).method; if (typeof m === 'function') m.call(obj, a)`
- Cleanup MUST also guard: `if (ctx && typeof ctx.revert === 'function') ctx.revert()`
	and `if (typeof cleanup === 'function') cleanup()`.
- Zero top-level side effects: do NOT touch `window`/`document`/`matchMedia`/
	`ResizeObserver` at module scope; no third-party init or event binding at
	module scope.
- Browser-only logic MUST run inside `useEffect` or after dynamic load.
- Provide guards:
	- `const isBrowser = () => typeof window !== 'undefined'`
	- `function shouldReduceMotion() { if (!isBrowser()) return false; const mm = window.matchMedia; if (typeof mm !== 'function') return false; const q = mm('(prefers-reduced-motion: reduce)'); return !!(q && q.matches === true); }`
- Third-party modules MUST be dynamically loaded with loose resolution and
	register once (e.g., GSAP `registerPlugin` only once) using runtime
	capability checks.
- Do NOT destructure DOM methods then call; e.g., use `window.matchMedia(...)`
	only after checking `typeof window.matchMedia === 'function'`.
- RSC/SSR boundaries: Client components place effects only in `useEffect`.
	Server components MUST NOT import files with top-level side effects (e.g.,
	animation loaders or direct browser API access).

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
- Third-party dynamic loading: perform imports inside guarded functions; ensure
	single-registration patterns and runtime capability checks.

## Development Workflow & Quality Gates

- Branching & review: Feature branches with at least one reviewer approval.
- Pre-commit: Formatting and linting configured per repository (HTML/CSS/JS).
- Lint guards: ESLint must forbid optional calls via `no-restricted-syntax`:
	- `CallExpression[optional=true]` → error "禁用可選呼叫 ?.()（會被轉成 .call()）"
	- `OptionalCallExpression` → error "禁用可選呼叫 ?.()"
- CI steps (required): build → HTML validation → link check → Lighthouse CI →
	asset budget checks → preview deploy → optional-call grep checks. Any failure
	blocks merge.
- CI grep checks (blocking):
	- `git grep -nE "\?\.\(" -- src && echo "Found optional call, fail" && exit 1`
	- `git grep -nE "\?\.[a-zA-Z_$][\w$]*\s*\(" -- src && echo "Found optional method call, fail" && exit 1`
- Startup quick scan (diagnostic): `rg -n "\.call\(" .next/static/chunks/app --no-ignore`.
- Release: Tag `vX.Y.Z`, update changelog summary, store Lighthouse results and
	deploy URL. Ensure rollback to last successful release is one click/command.

## Governance

This Constitution supersedes other practices for this project. Amendments
require a pull request describing the change, impact analysis (including URL
stability and redirects), proposed version bump, and any migration steps.
Compliance MUST be verified in PR reviews, and violations MUST include a
documented justification and follow-up plan.

**Version**: 1.1.0 | **Ratified**: TODO(RATIFICATION_DATE) | **Last Amended**: 2025-09-24