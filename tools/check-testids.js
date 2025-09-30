#!/usr/bin/env node
/*
  Simple data-testid naming validator.
  Enforces kebab-case with 2-4 segments: <domain>-<action>-<target>(-<suffix>?)
  Allowed chars: [a-z0-9-].
  Reports any attribute values that don't match or are too generic (e.g., just "button").
*/

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'src');

const TESTID_REGEX = /data-testid\s*=\s*(["'`])([^"'`]+)\1/g;
const NAME_RULE = /^[a-z0-9]+(?:-[a-z0-9]+){1,4}$/; // allow 2-5 segments
const GENERIC = new Set(['button','input','div','span','row','item','link','icon','text','label']);
const ALLOW_SINGLE = new Set(['brand','breadcrumb']);

let total = 0;
let bad = 0;
const offenders = [];

function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    if (e.name.startsWith('.') || e.name === 'node_modules' || e.name === '.next') continue;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) walk(full);
    else if (/\.(tsx?|jsx?)$/.test(e.name)) {
      const text = fs.readFileSync(full, 'utf8');
      let m;
      while ((m = TESTID_REGEX.exec(text))) {
        total++;
        const val = m[2];
        if ((ALLOW_SINGLE.has(val)) || NAME_RULE.test(val)) {
          // ok
        } else if (GENERIC.has(val)) {
          bad++;
          offenders.push({ file: full, value: val });
        } else {
          bad++;
          offenders.push({ file: full, value: val });
        }
      }
    }
  }
}

if (fs.existsSync(SRC)) walk(SRC);

if (bad > 0) {
  console.error(`data-testid validation failed: ${bad}/${total} invalid`);
  for (const o of offenders) console.error(`${o.file}: ${o.value}`);
  process.exit(1);
} else {
  console.log(`data-testid validation passed: ${total} checked`);
}
