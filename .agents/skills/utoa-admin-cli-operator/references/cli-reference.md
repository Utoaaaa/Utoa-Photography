# CLI Reference

## Checklist

- use `tools/admin-cli`
- keep actions additive or updatable only
- never delete, remove, detach, unlink, or clear via CLI
- set `collection.captured_at` only when the user gives the value
- validate the plan before apply

## Commands

```bash
npm run admin-cli -- init-plan <directory> --year <year> --collection-title "Title"
npm run admin-cli -- validate-plan <plan.json>
npm run admin-cli -- apply <plan.json> --base-url <admin-base-url>
npm run admin-cli -- status <run-state.json>
```

## Plan fields to watch

- `baseUrl`: admin base URL protected by Cloudflare Access
- `constraints.allowDelete`: must stay `false`
- `constraints.allowDetach`: must stay `false`
- `constraints.allowAutoCapturedAt`: must stay `false`
- `collection.captured_at`: manual only
- `assets[].is_cover`: at most one `true`
- `assets[].attach`: do not set cover assets to `false`

## Asset metadata supported by the CLI

- `title`
- `alt`
- `caption`
- `description`
- `photographer`
- `location`
- `tags`
- `metadata_json`

## If the user asks for delete-like behavior

Reply with the equivalent of:

"This CLI does not support delete/remove/detach actions. Please do that manually in the admin UI, then I can help with the remaining plan or metadata updates."
