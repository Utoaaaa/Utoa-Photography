# Monitoring Checklist

## 404 Tracking for Legacy Collection URLs

To confirm that deprecated `/[year]/[collection]` routes no longer receive traffic, configure a Cloudflare dashboard panel with the following settings:

1. **Open the Analytics → Traffic view** for the production zone.
2. **Add a custom filter** with the expression `http.request.uri.path matches "^/[0-9]{4}/[a-z0-9-]+$"` and response status `404`.
3. Save the panel as “Legacy collection 404s” and pin it to the overview dashboard.
4. Enable daily email summaries so anomalies are surfaced automatically.

> Tip: if additional debugging is needed, create a Logpush dataset targeting the same filter and forward it to Cloudflare R2 or BigQuery for historical analysis.

## Additional Signals

- **Successful location page hits**: filter `http.request.uri.path matches "^/[0-9]{4}/[a-z0-9-]+/[a-z0-9-]+$"` with status `200` to confirm the new hierarchy receives traffic.
- **Sitemap availability**: monitor `GET /sitemap.xml` response times and status codes.
- **Admin API health**: track 5xx counts on `/api/admin/*` endpoints using the same analytics tooling.
