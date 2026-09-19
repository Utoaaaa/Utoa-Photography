// Run against an isolated fixture app (never a production origin).
// Fixture setup and test-only authentication are documented in docs/seo-independent-fields.md.
import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { chromium } from '@playwright/test';

const origin = process.env.SEO_QA_ORIGIN || 'http://127.0.0.1:3039';
if (new URL(origin).hostname !== '127.0.0.1') throw new Error('Only isolated loopback QA is allowed');
const output = process.env.SEO_QA_OUTPUT || '/tmp/utoa-seo-evidence';
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless:true, executablePath: process.env.E2E_CHROME_EXECUTABLE_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' });
const context = await browser.newContext({ viewport:{width:1440,height:1000}, reducedMotion:'reduce', extraHTTPHeaders:{'x-seo-qa':'isolated-fixture'} });
const fixtureImage = await readFile(new URL('../fixtures/images/test-landscape.png', import.meta.url));
await context.route('**/images/qa-image/**', route => route.fulfill({ contentType:'image/png',body:fixtureImage }));
const page = await context.newPage();
const ui = await context.newPage();
const errors = [];
page.on('pageerror', error => errors.push(error.message));
ui.on('pageerror', error => errors.push(error.message));
const results = [];
async function capture(path, filename) {
  await page.goto(origin+path, {waitUntil:'networkidle'});
  await page.locator('main').waitFor();
  await page.addStyleTag({content:'*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important} .animated-exposure-field{visibility:hidden!important} .animated-reveal{opacity:1!important;transform:none!important}'});
  await page.waitForTimeout(1500);
  await page.screenshot({path:`${output}/${filename}.png`,fullPage:true,animations:'disabled'});
  return page.locator('main').innerText();
}
try {
  await ui.goto(origin+'/admin/seo', {waitUntil:'networkidle'});
  await ui.getByLabel('SEO 標題', {exact:true}).waitFor();
  for (const [type,id,path] of [['homepage','homepage','/'],['location','qa-location','/2026/coast'],['collection','qa-collection','/2026/coast/light']]) {
    await context.request.put(`${origin}/api/admin/seo/${type}/${id}`, {data:{title:null,description:null,og_asset_id:null}});
    await ui.reload({waitUntil:'networkidle'});
    await ui.getByLabel('選擇頁面').selectOption(`${type}/${id}`);
    await ui.getByLabel('SEO 標題',{exact:true}).waitFor();
    const before = await capture(path,`${type}-before`);
    const originalTitle = await page.title();
    const title = `${type} 搜尋專用標題`;
    const description = `${type} 搜尋專用描述，不能出現在公開頁面正文。`;
    await ui.getByLabel('SEO 標題',{exact:true}).fill(title);
    await ui.getByLabel('SEO 描述',{exact:true}).fill(description);
    await ui.getByLabel('分享封面',{exact:true}).selectOption('qa-image');
    assert.match(await ui.getByTestId('seo-search-preview').innerText(),new RegExp(title));
    assert.match(await ui.getByTestId('seo-share-preview').innerText(),new RegExp(description));
    await ui.getByRole('button',{name:'儲存 SEO 設定',exact:true}).click();
    await ui.getByText('SEO 設定已儲存。頁面展示內容保持不變。',{exact:true}).waitFor();
    const after = await capture(path,`${type}-after`);
    assert.equal(after,before,`${type} visible text changed`);
    assert.ok(!after.includes(title) && !after.includes(description));
    assert.equal(await page.title(),title);
    for (const [selector,expected] of [
      ['meta[name="description"]',description],['meta[property="og:title"]',title],
      ['meta[property="og:description"]',description],['meta[name="twitter:title"]',title],
      ['meta[name="twitter:description"]',description],
      ['meta[property="og:image"]',`${origin}/images/qa-image/large`],
      ['meta[name="twitter:image"]',`${origin}/images/qa-image/large`],
    ]) { assert.equal(await page.locator(selector).getAttribute('content'),expected,selector); }
    assert.equal(new URL(await page.locator('link[rel="canonical"]').getAttribute('href')).href,new URL(origin+path).href);
    const response = await context.request.get(origin+path,{headers:{'user-agent':'Twitterbot/1.0'}});
    const html = await response.text();
    assert.equal(response.status(),200);
    assert.ok(html.includes(`<title>${title}</title>`));
    assert.ok(html.includes(`content="${description}"`));
    await writeFile(`${output}/${type}-metadata.html`,html);
    await ui.reload({waitUntil:'networkidle'});
    await ui.getByLabel('選擇頁面').selectOption(`${type}/${id}`);
    await ui.getByLabel('SEO 標題',{exact:true}).waitFor();
    // Wait for the selected entity's request to finish, rather than relying on a stale field.
    await ui.waitForFunction(value => document.querySelector('#seo-title')?.value === value,title);
    assert.equal(await ui.getByLabel('SEO 描述',{exact:true}).inputValue(),description);
    await ui.screenshot({path:`${output}/${type}-editor-desktop.png`,fullPage:true});
    await ui.setViewportSize({width:390,height:844});
    await ui.screenshot({path:`${output}/${type}-editor-mobile.png`,fullPage:true});
    assert.equal(await ui.evaluate(() => document.documentElement.scrollWidth <= innerWidth),true);
    await ui.setViewportSize({width:1440,height:1000});
    // Clear values, persist, and confirm both metadata fallback and visible text.
    await ui.getByLabel('SEO 標題',{exact:true}).fill('');
    await ui.getByLabel('SEO 描述',{exact:true}).fill('');
    await ui.getByLabel('分享封面',{exact:true}).selectOption('');
    await ui.getByRole('button',{name:'儲存 SEO 設定',exact:true}).click();
    await ui.getByText('SEO 設定已儲存。頁面展示內容保持不變。',{exact:true}).waitFor();
    await page.reload({waitUntil:'networkidle'});
    assert.equal(await page.title(),originalTitle);
    assert.equal(await page.locator('main').innerText(),before);
    results.push({type,visibleTextUnchanged:true,metadata:true,botHTML:true,preview:true,persisted:true,clearRestoresDefaults:true,mobileNoOverflow:true});
  }
  assert.deepEqual(errors,[]);
  await writeFile(`${output}/result.json`,JSON.stringify({results,pageErrors:errors},null,2));
  console.log(JSON.stringify({output,results,pageErrors:errors},null,2));
} finally { await browser.close(); }
