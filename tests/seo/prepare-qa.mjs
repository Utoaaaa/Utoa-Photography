// Creates a throwaway copy, synthetic data and fixture auth; never edits the working app or its DB.
import { cp, mkdtemp, readFile, writeFile, symlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { DatabaseSync } from 'node:sqlite';

const root = fileURLToPath(new URL('../../', import.meta.url));
const dir = await mkdtemp(join(tmpdir(), 'utoa-seo-qa-'));
for (const name of ['src','public','package.json','tsconfig.json','next-env.d.ts','postcss.config.mjs']) {
  await cp(join(root,name),join(dir,name),{recursive:true});
}
await symlink(join(root,'node_modules'),join(dir,'node_modules'),'dir');
await writeFile(join(dir,'next.config.mjs'), `export default { devIndicators:false, outputFileTracingRoot:${JSON.stringify(root)} };\n`);
await writeFile(join(dir,'src/lib/auth.ts'), `import { NextResponse } from 'next/server';
export function isAdminRoute(path: string) { return path.startsWith('/admin') || path.startsWith('/api/admin'); }
export async function adminAuthError(request: Request) {
  return request.headers.get('x-seo-qa') === 'isolated-fixture' ? null : NextResponse.json({error:'Unauthorized'}, {status:401});
}
`);
const layoutPath = join(dir,'src/app/layout.tsx');
let layout = (await readFile(layoutPath,'utf8')).replace("import { Noto_Serif_TC } from 'next/font/google';", "import localFont from 'next/font/local';");
layout = layout.replace(/const utoaSerif = Noto_Serif_TC\([\s\S]*?\n\}\);/, "const utoaSerif = localFont({src:'../../public/fonts/noto-serif-tc/NotoSerifTC-Regular.ttf',variable:'--font-utoa-serif',display:'swap'});");
await writeFile(layoutPath,layout);
const sql = execFileSync(join(root,'node_modules/.bin/prisma'),['migrate','diff','--from-empty','--to-schema-datamodel',join(root,'prisma/schema.prisma'),'--script'],{cwd:root,encoding:'utf8'});
const db = new DatabaseSync(join(dir,'qa.db'));
try {
  db.exec(sql);
  db.exec(`
    INSERT INTO years(id,label,order_index,status,updated_at) VALUES('qa-year','2026','1','published','2026-09-19T00:00:00.000Z');
    INSERT INTO locations(id,year_id,slug,name,summary,order_index,updated_at)
      VALUES('qa-location','qa-year','coast','海岸','原本的地點簡介，保持顯示。','1','2026-09-19T00:00:00.000Z');
    INSERT INTO collections(id,year_id,location_id,slug,title,summary,status,order_index,updated_at)
      VALUES('qa-collection','qa-year','qa-location','light','海邊的光','原本的作品簡介，保持顯示。','published','1','2026-09-19T00:00:00.000Z');
    INSERT INTO assets(id,alt,width,height,updated_at) VALUES('qa-image','海岸影像測試圖',1600,900,'2026-09-19T00:00:00.000Z');
    INSERT INTO collection_assets(collection_id,asset_id,order_index) VALUES('qa-collection','qa-image','1');
  `);
} finally { db.close(); }
console.log(`Isolated fixture: ${dir}`);
console.log('Start only on loopback, using the fixture directory as cwd:');
console.log(`DATABASE_URL='file:${dir}/qa.db' NEXT_PUBLIC_SITE_URL=http://127.0.0.1:3039 ./node_modules/.bin/next dev --hostname 127.0.0.1 --port 3039`);
console.log('Then, from the original repo: node tests/seo/verify-browser.mjs');
