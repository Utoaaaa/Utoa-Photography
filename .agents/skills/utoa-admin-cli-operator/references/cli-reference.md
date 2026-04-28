# CLI Reference

## Checklist

- use `tools/admin-cli`
- keep actions additive or updatable only
- never delete, remove, detach, unlink, or clear via CLI
- set `collection.captured_at` only when the user gives the value
- validate the plan before apply
- use `https://utoa.studio` as production `--base-url`
- use `https://utoa.studio/admin` only for Cloudflare Access login/token

## Commands

```bash
npm run admin-cli -- init-plan <directory> --year <year> --collection-title "Title"
npm run admin-cli -- validate-plan <plan.json>
export UTOA_CF_ACCESS_TOKEN="$(cloudflared access token -app=https://utoa.studio/admin)"
npm run admin-cli -- apply <plan.json> --base-url https://utoa.studio
npm run admin-cli -- status <run-state.json>
```

## Plan fields to watch

- `baseUrl`: production API base URL; use `https://utoa.studio`, not `/admin`
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

## Production caveats

- Keep the import as `draft` for smoke tests.
- Prefer env tokens over `--token`; npm can echo command-line tokens.
- Re-run the same plan after partial failure; the CLI resolves existing year/location/collection by label/slug and stable asset IDs.
- If production apply fails on collection creation or asset creation, read `references/troubleshooting.md` before changing data.

## If the user asks for delete-like behavior

Reply with the equivalent of:

"This CLI does not support delete/remove/detach actions. Please do that manually in the admin UI, then I can help with the remaining plan or metadata updates."
