#!/usr/bin/env node
/*
  Simple performance probe:
  - Hits PERF_BASE_URL (default http://localhost:3022)/ path multiple times
  - Measures end-to-end time to fetch and fully read body
  - Outputs JSON report to test-results/perf/report.json
  - Fails (exit 1) if p95 >= threshold (PERF_P95_THRESHOLD_MS, default 400)
*/

const fs = require('fs');
const path = require('path');

const BASE = process.env.PERF_BASE_URL || 'http://localhost:3022';
// Comma-separated list of paths; default to only homepage to avoid auth/dynamic params
const URLS = (process.env.PERF_URLS || '/').split(',').map(s => s.trim()).filter(Boolean);
const REQUESTS_PER_URL = Number(process.env.PERF_REQUESTS_PER_URL || 30);
const WARMUP = Number(process.env.PERF_WARMUP || 3);
const THRESHOLD = Number(process.env.PERF_P95_THRESHOLD_MS || 400);

function hrtimeMs(startNs, endNs) {
  return Number((endNs - startNs) / 1000000n);
}

async function probeOnce(fullUrl) {
  const start = process.hrtime.bigint();
  const res = await fetch(fullUrl, { cache: 'no-store' });
  // Consume body to completion to approximate total time
  // Avoid throwing on non-2xx; still measure time
  try { await res.arrayBuffer(); } catch (_) {}
  const end = process.hrtime.bigint();
  return hrtimeMs(start, end);
}

function percentile(arr, p) {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const idx = Math.max(0, Math.min(sorted.length - 1, Math.floor(p * sorted.length) - 1));
  return sorted[idx];
}

async function main() {
  const all = [];
  for (const pathPart of URLS) {
    const target = new URL(pathPart.startsWith('/') ? pathPart : `/${pathPart}`, BASE).toString();
    const samples = [];
    // Warmup
    for (let i = 0; i < WARMUP; i++) {
      await probeOnce(target);
    }
    for (let i = 0; i < REQUESTS_PER_URL; i++) {
      const ms = await probeOnce(target);
      samples.push(ms);
    }
    all.push({ url: target, samples });
  }

  // Aggregate p95 across all samples
  const flat = all.flatMap(x => x.samples);
  const p50 = percentile(flat, 0.50);
  const p95 = percentile(flat, 0.95);
  const p99 = percentile(flat, 0.99);

  const report = {
    base: BASE,
    urls: URLS,
    totalSamples: flat.length,
    thresholdMs: THRESHOLD,
    stats: { p50, p95, p99 },
    byUrl: all.map(({ url, samples }) => ({ url, count: samples.length, p50: percentile(samples, 0.50), p95: percentile(samples, 0.95), p99: percentile(samples, 0.99) })),
    timestamp: new Date().toISOString(),
  };

  const outDir = path.join(process.cwd(), 'test-results', 'perf');
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, 'report.json'), JSON.stringify(report, null, 2));

  const pass = p95 < THRESHOLD;
  if (!pass) {
    console.error(`Perf gate failed: p95=${p95}ms >= ${THRESHOLD}ms`);
    process.exit(1);
  } else {
    console.log(`Perf gate OK: p95=${p95}ms < ${THRESHOLD}ms`);
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
