# Admin CLI Troubleshooting

## Known good production flow

1. Create a draft-only plan.

```bash
npm run admin-cli -- init-plan tests/test-import \
  --year 2026 \
  --location-name "CLI 測試地點" \
  --location-slug cli-test-26 \
  --collection-title "CLI Draft Test Import" \
  --collection-slug cli-draft-test-import \
  --base-url https://utoa.studio \
  --output .utoa/plans/cli-draft-test-import.json
```

2. Validate before apply.

```bash
npm run admin-cli -- validate-plan .utoa/plans/cli-draft-test-import.json
```

3. Get a Cloudflare Access token for the admin app, but apply against the site root.

```bash
cloudflared access login https://utoa.studio/admin
export UTOA_CF_ACCESS_TOKEN="$(cloudflared access token -app=https://utoa.studio/admin)"
npm run admin-cli -- apply .utoa/plans/cli-draft-test-import.json --base-url https://utoa.studio
```

4. Inspect the run state.

```bash
npm run admin-cli -- status .utoa/runs/<run-id>.json
```

## URL and token rules

- `--base-url` must be `https://utoa.studio` for production API calls.
- Do not use `https://www.utoa.studio`; production middleware redirects `www` to apex.
- Do not use `https://utoa.studio/admin` as `--base-url`; the CLI appends `/api/...`, so that would build wrong URLs.
- Use `https://utoa.studio/admin` as the Cloudflare Access app URL for `cloudflared access login` and `cloudflared access token -app=...`.
- Prefer `UTOA_CF_ACCESS_TOKEN` or `CF_ACCESS_TOKEN` env over `--token` to avoid printing JWTs in npm command output.

## Access token failure

If this appears:

```text
Unable to find token for provided application. Please run login command to generate token.
```

Run:

```bash
cloudflared access login https://utoa.studio/admin
cloudflared access token -app=https://utoa.studio/admin
```

If browser login times out, ask the user to run the two commands in their own terminal and provide the token only if needed. Never commit or write the token to a file.

## Apply partially succeeds then fails

The CLI is additive/updatable. Re-running the same plan is expected.

- If year/location/collection were created before failure, the next apply should resolve or update them by label/slug.
- If an original image uploaded to R2 before metadata creation failed, the rerun should reuse the same stable asset id.
- Inspect `.utoa/runs/<run-id>.json` before deciding what happened.

## `/api/admin/years/:yearId/collections` returns 500

Check `src/lib/d1/collection-service.ts` bind order. The D1 insert placeholders expect:

1. id
2. year id
3. slug
4. title
5. summary
6. captured_at
7. status
8. order_index
9. cover_asset_id
10. location_id
11. now
12. published_at

If this is wrong in production, fix it, run diagnostics/build, then deploy with the Cloudflare OpenNext builder.

## `/api/assets` returns 500 during CLI apply

The CLI should call admin asset endpoints:

- create: `/api/admin/assets`
- update: `/api/admin/assets/:asset_id`

Do not call `/api/assets` directly from the CLI. `/api/assets` also requires admin auth internally, but may not receive Cloudflare Access injected headers if the Access app only protects admin paths.

## Production deploy command

For this project, `wrangler.toml` expects `.open-next/worker.js`. Use the Cloudflare adapter build, not plain `open-next build`, when deploying:

```bash
npx @opennextjs/cloudflare@latest build
npx @opennextjs/cloudflare@latest deploy -e production
```

Plain `npm run opennext && wrangler deploy --env production` can fail with:

```text
The entry-point file at ".open-next/worker.js" was not found.
```

## Production verification

Use read-only D1 checks after apply:

```bash
npx wrangler d1 execute utoa-photography-db --env production --remote --command \
  "SELECT id,label,status FROM years WHERE label='2026';
   SELECT id,slug,name,year_id FROM locations WHERE slug='cli-test-26';
   SELECT id,slug,title,status,year_id,location_id,cover_asset_id,captured_at FROM collections WHERE slug='cli-draft-test-import';
   SELECT COUNT(*) AS attached FROM collection_assets WHERE collection_id='<collection-id>';"
```

Expected successful draft test shape:

- run state status: `completed`
- draft year exists
- draft location exists
- draft collection exists with `captured_at = null` unless explicitly set
- all assets have metadata rows and are attached to the collection
