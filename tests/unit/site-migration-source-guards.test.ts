import fs from 'node:fs';
import path from 'node:path';

const APP_ROUTE_ROOT = path.resolve(process.cwd(), 'src/app');
const SITE_ROUTE_ROOT = path.join(APP_ROUTE_ROOT, '(site)');
const PUBLIC_DEMO_ROUTE_ROOT = path.join(APP_ROUTE_ROOT, 'homepage-animated-demo');
const ARCHIVED_DEMO_ROUTE_ROOT = path.join(APP_ROUTE_ROOT, '_homepage-animated-demo');
const expectedArchivedDemoFiles = [
  'page.tsx',
  'layout.tsx',
  'demo-data.ts',
  path.join('_components', 'DemoArchiveStyles.tsx'),
  path.join('[year]', '[location]', 'page.tsx'),
  path.join('[year]', '[location]', '[collection]', 'page.tsx'),
];
const forbiddenDemoTokens = [
  'demoYears',
  'demo-data',
  'getDemoLocation',
  'getDemoCollection',
  'coverClassName',
  '/homepage-animated-demo',
];

function collectRouteFiles(directory: string): string[] {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const absolutePath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      return collectRouteFiles(absolutePath);
    }

    if (!entry.isFile() || !/\.(tsx|ts)$/.test(entry.name)) {
      return [];
    }

    return [absolutePath];
  });
}

describe('site migration source guards', () => {
  it('keeps the animated demo archived outside public App Router routes', () => {
    expect(fs.existsSync(PUBLIC_DEMO_ROUTE_ROOT)).toBe(false);
    expect(path.basename(ARCHIVED_DEMO_ROUTE_ROOT)).toMatch(/^_/);
    expect(fs.existsSync(ARCHIVED_DEMO_ROUTE_ROOT)).toBe(true);

    const missingArchivedFiles = expectedArchivedDemoFiles.filter(
      (filePath) => !fs.existsSync(path.join(ARCHIVED_DEMO_ROUTE_ROOT, filePath)),
    );

    expect(missingArchivedFiles).toEqual([]);
  });

  it('keeps production site routes isolated from animated demo static data', () => {
    const offenders = collectRouteFiles(SITE_ROUTE_ROOT).flatMap((filePath) => {
      const source = fs.readFileSync(filePath, 'utf8');
      const matchingTokens = forbiddenDemoTokens.filter((token) => source.includes(token));

      return matchingTokens.map((token) => `${path.relative(process.cwd(), filePath)} imports or references ${token}`);
    });

    expect(offenders).toEqual([]);
  });
});
