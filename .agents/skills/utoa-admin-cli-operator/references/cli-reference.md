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
npm run admin-cli -- apply <plan.json> --base-url https://utoa.studio --upload-mode auto
npm run admin-cli -- status <run-state.json>
```

## Upload mode

Use the default `--upload-mode auto` for production imports. It uploads image bytes
directly to R2 through the S3-compatible API when these env vars are available:

- `CF_ACCOUNT_ID` or `CLOUDFLARE_ACCOUNT_ID`
- `R2_ACCESS_KEY_ID`
- `R2_SECRET_ACCESS_KEY`
- optional: `UTOA_R2_BUCKET` or `R2_BUCKET` (defaults to `utoa-photography-assets`)
- optional: `UTOA_R2_PUBLIC_BASE_ORIGIN` (defaults to `https://images.utoa.studio`)
- optional: `UTOA_R2_OBJECT_PREFIX` (defaults to `images`)
- optional: `UTOA_R2_VARIANT_EXT` (defaults to `webp`)

Direct R2 mode also pre-generates `thumb`, `medium`, and `large` variants through
Cloudflare Image Resizing and writes them to R2, keeping original upload bytes and
variant generation out of the website Worker. Use `--upload-mode direct-r2` to
require this path, or `--upload-mode admin-api` to force the legacy website API
upload path. Only set `UTOA_ADMIN_CLI_SKIP_VARIANTS=true` for recovery/debug
runs where missing thumbnails are acceptable.

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
- Prefer direct R2 upload for large CLI imports; the admin API fallback still sends
  multipart image bytes through the website Worker.
- Re-run the same plan after partial failure; the CLI resolves existing year/location/collection by label/slug and stable asset IDs.
- If production apply fails on collection creation or asset creation, read `references/troubleshooting.md` before changing data.

## If the user asks for delete-like behavior

Reply with the equivalent of:

"This CLI does not support delete/remove/detach actions. Please do that manually in the admin UI, then I can help with the remaining plan or metadata updates."
