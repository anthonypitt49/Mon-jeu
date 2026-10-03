import { chromium } from 'playwright';
import path from 'path';
const dir = path.dirname(new URL(import.meta.url).pathname);
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
for (const [name, vp] of [['phone_land', { width: 844, height: 390 }], ['phone_port', { width: 390, height: 844 }]]) {
  const ctx = await browser.newContext({ viewport: vp, hasTouch: true, isMobile: true, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errors = []; page.on('pageerror', (e) => errors.push(e.message));
  await page.route('https://cdn.jsdelivr.net/npm/three@0.186.1/**', (route) => { const u = new URL(route.request().url()); route.fulfill({ path: path.join(dir, 'node_modules/three', u.pathname.replace('/npm/three@0.186.1/', '')), contentType: 'application/javascript' }); });
  await page.route('https://fonts.googleapis.com/**', (r) => r.fulfill({ body: '', contentType: 'text/css' }));
  await page.route('https://fonts.gstatic.com/**', (r) => r.abort());
  await page.goto('file://' + path.join(dir, 'index.html'));
  await page.waitForFunction(() => window.__spReady, null, { timeout: 120000 });
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(dir, `shots/40_${name}_menu.png`) });
  const scroll = await page.evaluate(() => [document.documentElement.scrollWidth, innerWidth, document.getElementById('intro').scrollHeight, innerHeight]);
  await page.tap('#soloButton');
  await page.evaluate(() => { SP.sim(6); SP.renderFrame(1); });
  await page.screenshot({ path: path.join(dir, `shots/41_${name}_hud.png`) });
  console.log(name, 'touch', await page.evaluate(() => document.body.classList.contains('touch')), 'scroll', JSON.stringify(scroll), 'quality', await page.evaluate(() => SP.settings.quality), 'errors', errors.length, errors.slice(0, 3));
  await ctx.close();
}
await browser.close();
