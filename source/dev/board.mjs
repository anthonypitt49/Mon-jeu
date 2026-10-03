import { chromium } from 'playwright';
import path from 'path';
const dir = path.dirname(new URL(import.meta.url).pathname);
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const mk = async () => {
  const ctx = await browser.newContext({ viewport: { width: 900, height: 560 } });
  await ctx.addInitScript(() => { if (!localStorage.getItem('sp_settings')) localStorage.setItem('sp_settings', JSON.stringify({ quality: 0 })); });
  const page = await ctx.newPage(); page.errors = [];
  page.on('pageerror', (e) => page.errors.push(e.message)); page.on('console', (m) => { if (m.type() === 'error') page.errors.push(m.text().slice(0, 200)); });
  await page.route('https://cdn.jsdelivr.net/npm/three@0.186.1/**', (route) => { const u = new URL(route.request().url()); route.fulfill({ path: path.join(dir, 'node_modules/three', u.pathname.replace('/npm/three@0.186.1/', '')), contentType: 'application/javascript' }); });
  await page.route('https://fonts.googleapis.com/**', (r) => r.fulfill({ body: '', contentType: 'text/css' }));
  await page.route('https://fonts.gstatic.com/**', (r) => r.abort());
  await page.goto('http://127.0.0.1:8088/index.html'); await page.waitForFunction(() => window.__spReady, null, { timeout: 120000 });
  return page;
};
const a = await mk();
// Two solo games that end.
for (let k = 0; k < 2; k++) {
  await a.evaluate((k) => { SP.settings.name = k ? 'ANTHONY' : 'ANTHONY'; }, k);
  await a.click('#soloButton');
  await a.evaluate((k) => { SP.P.name = 'ANTHONY'; SP.G.me().name = 'ANTHONY'; SP.sim(5); SP.P.stats.kills = 7 + k * 10; SP.G.me().kills = 7 + k * 10; SP.G.round = 3 + k * 2; SP.P.hp = 1; SP.P.perks.clear(); SP.G.damagePlayer(SP.G.me(), 50, { pos: SP.P.pos }); SP.sim(4); }, k);
  console.log('game over', await a.evaluate(() => [SP.G.mode, document.getElementById('goRank').textContent]));
  await a.evaluate(() => document.exitPointerLock?.()); await a.click('#goMenuButton');
}
await a.click('#boardButton'); await a.waitForTimeout(300);
await a.screenshot({ path: path.join(dir, 'shots/70_board.png') });
await a.click('#boardCopy'); const code = await a.evaluate(() => document.getElementById('boardCode').value);
console.log('code', code.slice(0, 40) + '…', code.length);
const aErr = a.errors.slice(); await a.context().close();
const b = await mk();
await b.click('#boardButton'); await b.fill('#boardCode', code); await b.click('#boardImport');
console.log('import', await b.evaluate(() => [document.getElementById('boardMsg').textContent, SP.BOARD.list.map((e) => `${e.name} r${e.round} k${e.kills}`)]));
await b.fill('#boardCode', 'nimporte quoi'); await b.click('#boardImport'); console.log('bad', await b.evaluate(() => document.getElementById('boardMsg').textContent));
console.log('errors', aErr.length + b.errors.length, [...aErr, ...b.errors].slice(0, 5));
await browser.close();
