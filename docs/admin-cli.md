# Admin CLI

`tools/admin-cli` is a local TypeScript CLI for importing and updating photography data. Metadata and hierarchy changes go through the same protected admin APIs used by the dashboard; large image bytes can be uploaded directly to R2 from the CLI to keep the website Worker out of the hot path.

## Scope

- create year, location, collection
- upload assets and update asset metadata
- attach assets to a collection
- reorder imported assets when `order_index` is provided
- set collection cover from one imported asset
- update collection `captured_at`

## Hard limits

- no delete operations
- no detach or unlink operations
- `captured_at` is manual only; the CLI never auto-fills it from EXIF
- AI is not part of the website runtime; the CLI is the only automation surface

## Run the CLI

```bash
npm run admin-cli -- help
```

## Commands

Create a starter plan from a folder:

```bash
npm run admin-cli -- init-plan ./imports/kyoto-2024 \
  --year 2024 \
  --location-name Kyoto \
  --location-slug kyoto-24 \
  --collection-title "Kyoto in Autumn"
```

Validate a plan:

```bash
npm run admin-cli -- validate-plan ./.utoa/plans/kyoto-in-autumn.json
```

Apply a plan:

```bash
npm run admin-cli -- apply ./.utoa/plans/kyoto-in-autumn.json \
  --base-url https://utoa.studio \
  --upload-mode auto
```

Inspect a run state file:

```bash
npm run admin-cli -- status ./.utoa/runs/run_20260316_101500.json
```

## Authentication

The CLI expects a Cloudflare Access token.

- first choice: `--token <cf-access-token>`
- second choice: `CF_ACCESS_TOKEN` or `UTOA_CF_ACCESS_TOKEN`
- fallback: `cloudflared access token -app=<base-url>`

Before using the fallback, log in once:

```bash
cloudflared access login https://admin-api.example.com
```

## Upload modes

`apply` accepts `--upload-mode auto|direct-r2|admin-api`.

- `auto` (default): use direct R2 upload when R2 S3 credentials are configured, otherwise fall back to the admin API upload endpoint.
- `direct-r2`: require direct R2 upload and fail fast when credentials are missing.
- `admin-api`: force the legacy upload endpoint, which sends multipart image bytes through the website Worker.

Direct R2 mode needs:

```bash
export CF_ACCOUNT_ID="..."
export R2_ACCESS_KEY_ID="..."
export R2_SECRET_ACCESS_KEY="..."
# Optional overrides:
export UTOA_R2_BUCKET="utoa-photography-assets"
export UTOA_R2_PUBLIC_BASE_ORIGIN="https://images.utoa.studio"
export UTOA_R2_OBJECT_PREFIX="images"
export UTOA_R2_VARIANT_EXT="webp"
```

In direct R2 mode the CLI writes `images/<id>/original.<ext>` to R2, fetches
`/cdn-cgi/image/.../original.<ext>` from the public image origin, and writes
`thumb`, `medium`, and `large` variants back to R2. This avoids parsing large
multipart uploads and running variant generation inside the website Worker.
Only set `UTOA_ADMIN_CLI_SKIP_VARIANTS=true` for recovery/debug runs where
missing thumbnails are acceptable.

## Plan format

```json
{
  "version": 1,
  "baseUrl": "https://admin-api.example.com",
  "constraints": {
    "allowDelete": false,
    "allowDetach": false,
    "allowAutoCapturedAt": false
  },
  "year": {
    "label": "2024",
    "status": "draft"
  },
  "location": {
    "name": "Kyoto",
    "slug": "kyoto-24"
  },
  "collection": {
    "slug": "kyoto-in-autumn",
    "title": "Kyoto in Autumn",
    "status": "draft",
    "captured_at": "2024-11-18"
  },
  "assets": [
    {
      "file": "../../imports/kyoto-2024/IMG_1024.jpg",
      "title": "Fushimi Inari at Dusk",
      "alt": "Torii gates at Fushimi Inari",
      "caption": "Late afternoon light on the shrine path.",
      "description": "A quiet path through the shrine gates in warm autumn light.",
      "photographer": "Utoa",
      "location": "Kyoto, Japan",
      "tags": "kyoto, shrine, autumn",
      "metadata_json": {
        "sourceFilename": "IMG_1024.jpg"
      },
      "is_cover": true
    }
  ]
}
```

## Apply behavior

The executor is idempotent enough for repeated local use:

- it resolves year by `label`
- it resolves location by `slug` inside that year
- it resolves collection by `slug` inside that year
- it derives a stable asset id from the local file content when `assets[].id` is missing
- it updates asset and collection metadata after creation so reruns keep data aligned
- it writes run state files to `.utoa/runs`

## Current limitations

- no AI parsing yet; plans are authored manually or scaffolded with `init-plan`
- no resume command yet; rerun `apply` with the same plan instead
