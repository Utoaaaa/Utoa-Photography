#!/usr/bin/env node
const { spawn } = require('child_process');
const { fetch } = require('undici');

const API_URL = process.env.TEST_API_URL || 'http://localhost:3000';
const API_BASE = process.env.TEST_API_BASE || `${API_URL}/api`;

async function waitForServer(url, timeoutMs = 20000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(`${url}/api/years`, { method: 'GET' });
      if (res.ok || res.status === 200) return true;
    } catch (_) {}
    await new Promise((r) => setTimeout(r, 500));
  }
  return false;
}

let serverProc = null;
function killPort() {
  return new Promise((resolve) => {
    const killer = spawn(process.platform === 'win32' ? 'powershell.exe' : 'bash', [
      ...(process.platform === 'win32'
        ? ['-NoProfile', '-Command', 'Get-NetTCPConnection -LocalPort 3000 | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }']
        : ['-lc', 'lsof -ti :3000 | xargs -r kill']
      ),
    ], { stdio: 'ignore' });
    killer.on('exit', () => resolve());
  });
}

async function startServer({ bypass } = { bypass: false }) {
  if (serverProc) throw new Error('Server already running');
  await killPort();
  const env = { ...process.env };
  if (bypass) env.BYPASS_ACCESS_FOR_TESTS = 'true'; else delete env.BYPASS_ACCESS_FOR_TESTS;
  serverProc = spawn(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['run', 'dev', '--silent'], {
    env,
    stdio: 'ignore',
    detached: true,
  });
  return serverProc;
}

function stopServer() {
  if (!serverProc) return;
  try { process.kill(-serverProc.pid); } catch (_) {}
  serverProc = null;
}

function runJest(files, extraEnv = {}) {
  return new Promise((resolve) => {
    const args = [
      'jest',
      '--config=jest.contract.config.ts',
      '--runTestsByPath',
      ...files,
    ];
    const env = { ...process.env, TEST_API_URL: API_URL, TEST_API_BASE: API_BASE, ...extraEnv };
    const child = spawn(process.platform === 'win32' ? 'npx.cmd' : 'npx', args, { stdio: 'inherit', env });
    child.on('exit', (code) => resolve(code));
  });
}

(async () => {
  // Phase 1: strict auth (no bypass) for auth-sensitive suites
  const phase1 = [
    'tests/contract/test_years_post.test.ts',
    'tests/contract/test_years_put.test.ts',
    'tests/contract/test_image_upload.test.ts',
  ];
  await startServer({ bypass: false });
  const ready1 = await waitForServer(API_URL);
  if (!ready1) {
    console.error('Server failed to start (phase 1)');
    stopServer();
    process.exit(1);
  }
  const code1 = await runJest(phase1);
  stopServer();
  if (code1 !== 0) process.exit(code1);

  // Phase 2: bypass enabled for suites that create data without auth
  const phase2 = [
    'tests/contract/test_years_get.test.ts',
    'tests/contract/test_assets_post.ts',
    'tests/contract/test_collections_post.ts',
    'tests/contract/test_collection_assets.ts',
    'tests/contract/test_collection_detail.ts',
  ];
  await startServer({ bypass: true });
  const ready2 = await waitForServer(API_URL);
  if (!ready2) {
    console.error('Server failed to start (phase 2)');
    stopServer();
    process.exit(1);
  }
  const code2 = await runJest(phase2);
  stopServer();
  process.exit(code2);
})().catch((err) => {
  console.error(err);
  stopServer();
  process.exit(1);
});
