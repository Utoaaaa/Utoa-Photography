import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

export const root = fileURLToPath(new URL('../../', import.meta.url));
const require = createRequire(import.meta.url);

// Execute current TypeScript handlers, with real Next Response/JWT validation and
// isolated storage/cache boundaries. Never load .env or connect to a database.
export function sourceLoader({ env, jose, effects = [], overrides = {} }) {
  const modules = new Map();
  const blocked = name => new Proxy(function () {
    effects.push(name);
    throw new Error(`Unexpected side effect: ${name}`);
  }, {
    get(_target, prop) {
      if (prop === '__esModule') return true;
      return blocked(`${name}.${String(prop)}`);
    },
  });
  const isolated = new Set([
    '@/lib/db', '@/lib/cloudflare', '@/lib/d1-queries', '@/lib/cache',
    '@/lib/d1/location-service', '@/lib/d1/collection-service',
    '@/lib/prisma/location-service', '@/lib/prisma/collection-service',
    '@/lib/queries/audit', '@/lib/queries/years', '@/lib/queries/collections',
    '@/lib/r2-assets', '@/lib/r2-variants', '@/lib/viewer/collection', 'next/cache',
  ]);
  function load(file) {
    file = path.resolve(root, file);
    if (modules.has(file)) return modules.get(file).exports;
    const loadedModule = { exports: {} };
    modules.set(file, loadedModule);
    const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
      compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, esModuleInterop: true },
      fileName: file,
    }).outputText;
    function localRequire(name) {
      if (Object.hasOwn(overrides, name)) return overrides[name];
      if (name === 'jose') return jose;
      if (isolated.has(name)) return blocked(name);
      if (name.startsWith('@/') || name.startsWith('.')) {
        const resolved = name.startsWith('@/') ? path.join(root, 'src', name.slice(2)) : path.resolve(path.dirname(file), name);
        return load(`${resolved}.ts`);
      }
      if (['next/server', 'zod', 'clsx', 'tailwind-merge', 'crypto', 'node:crypto'].includes(name)) return require(name);
      throw new Error(`Unapproved dependency in security test: ${name}`);
    }
    vm.runInNewContext(code, {
      module: loadedModule, exports: loadedModule.exports, require: localRequire, process: { env },
      URL, Request, Response, Headers, File, TextEncoder, TextDecoder, atob, btoa,
      crypto: globalThis.crypto, setTimeout, clearTimeout,
      console: { log() {}, warn() {}, error() {} },
      fetch: blocked('fetch'),
    }, { filename: file });
    return loadedModule.exports;
  }
  return load;
}

export function routeFiles(dir = path.join(root, 'src/app/api')) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const p = path.join(dir, entry.name);
    return entry.isDirectory() ? routeFiles(p) : entry.name === 'route.ts' ? [p] : [];
  });
}
