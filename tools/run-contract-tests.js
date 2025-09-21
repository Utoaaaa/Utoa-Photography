#!/usr/bin/env node
const { spawn } = require('child_process');

if (!process.env.TEST_API_URL) {
  console.log('Skipping contract tests: TEST_API_URL is not set.');
  process.exit(0);
}

const args = [
  'jest',
  '--silent',
  '--env=node',
  '--setupFilesAfterEnv=./jest.setup.contract.ts',
  '--',
  'tests/contract',
];

const child = spawn(process.platform === 'win32' ? 'npx.cmd' : 'npx', args, {
  stdio: 'inherit',
  env: process.env,
});

child.on('exit', (code) => process.exit(code));
