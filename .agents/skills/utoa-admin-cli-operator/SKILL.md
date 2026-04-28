---
name: utoa-admin-cli-operator
description: Generate, review, edit, and apply `tools/admin-cli` plan JSON files for this project. Use when asked to import or organize photos through the local admin CLI, set collection `captured_at`, prepare metadata, or run safe CLI-assisted admin ingestion. Never use this skill for website AI runtime work, delete/remove requests, or detach/unlink requests.
---

# Utoa Admin CLI Operator

## Overview

Use this skill to prepare and operate the local admin CLI workflow for photo ingestion. Work through `tools/admin-cli`, keep all actions additive or updatable, and refuse any delete or detach request.

## Workflow

1. Read `references/cli-reference.md` and `docs/admin-cli.md`.
2. If the user needs a new import plan, create or edit a plan JSON instead of inventing ad hoc commands.
3. Validate these rules before any apply:
   - never add delete operations
   - never add detach or unlink behavior
   - only set `collection.captured_at` when the user explicitly provides it
   - keep AI outside the website runtime; this skill is only for local CLI workflows
4. Prefer this command order:
   - `npm run admin-cli -- init-plan ...`
   - edit the generated plan JSON
   - `npm run admin-cli -- validate-plan <plan.json>`
   - resolve Cloudflare Access token for `https://utoa.studio/admin`
   - `npm run admin-cli -- apply <plan.json> --base-url https://utoa.studio`
5. After apply, inspect the generated run state with `npm run admin-cli -- status <run-state.json>`.
6. Verify production D1 read-only counts for the created draft year/location/collection/assets when operating on production.

## Production Access Notes

- Use API base URL `https://utoa.studio`, not `https://www.utoa.studio` and not `https://utoa.studio/admin`.
- Use Access app URL `https://utoa.studio/admin` only for `cloudflared access login/token`.
- Prefer `UTOA_CF_ACCESS_TOKEN` env over `--token` so tokens do not appear in npm command output.
- Treat pasted Access JWTs as sensitive; do not echo, store, or commit them.

## Plan Rules

- Always keep `constraints.allowDelete = false`
- Always keep `constraints.allowDetach = false`
- Always keep `constraints.allowAutoCapturedAt = false`
- Treat `captured_at` as manual input only; leave it `null` or omitted unless the user gives a date
- Use project-relative file paths that make sense from the plan file location
- Mark at most one asset as `is_cover: true`
- Keep cover assets attached to the collection

## Refusal Rules

- If the user asks to delete photos, collections, locations, or years, do not translate that into CLI actions. State that deletion must be done manually in the admin UI.
- If the user asks to remove an asset from a collection or clear a location assignment, do not emulate it through the CLI.
- Do not suggest wiring AI into the website runtime for this workflow.

## Useful Outputs

- A ready-to-run plan JSON
- A short checklist of missing values, especially `captured_at`, `baseUrl`, and metadata fields
- Exact CLI commands for `validate-plan`, `apply`, and `status`
- A note of any production fixes/deploys required before retrying apply

## References

- Read `references/cli-reference.md` for the checklist and field summary.
- Read `references/troubleshooting.md` when Access login, apply, D1, R2, or deploy fails.
- Read `docs/admin-cli.md` for the full project documentation when you need exact command usage or plan examples.
