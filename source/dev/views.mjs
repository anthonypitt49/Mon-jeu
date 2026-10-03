import { chromium } from 'playwright';
import path from 'path';
const dir = path.dirname(new URL(import.meta.url).pathname);
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await (await browser.newContext({ viewport: { width: 960, height: 540 } })).newPage(); const errors = []; page.on('pageerror', (e) => errors.push(e.message));
await page.addInitScript(() => localStorage.setItem('sp_settings', JSON.stringify({ quality: +(new URLSearchParams(location.search).get('q') ?? 2) })));
await page.route('https://cdn.jsdelivr.net/npm/three@0.186.1/**', (route) => { const u = new URL(route.request().url()); route.fulfill({ path: path.join(dir, 'node_modules/three', u.pathname.replace('/npm/three@0.186.1/', '')), contentType: 'application/javascript' }); });
await page.route('https://fonts.googleapis.com/**', (r) => r.fulfill({ body: '', contentType: 'text/css' }));
await page.route('https://fonts.gstatic.com/**', (r) => r.abort());
await page.goto('http://127.0.0.1:8088/index.html?q=2'); await page.waitForFunction(() => window.__spReady, null, { timeout: 180000 });
await page.evaluate(() => document.getElementById('soloButton').click());
const views = JSON.parse(process.env.VIEWS || '[[53,10,0.1,0,"bay2"],[20,14,1.57,0,"front"],[62,40,0,0,"support"],[20,48,-2.2,0,"yard"],[18,30,1.2,0,"bunker"],[40,14,0,0.35,"nomansland"]]');
for (const [x, z, yaw, pitch, name] of views) {
  await page.evaluate(([x, z, yaw, pitch]) => { SP.P.hp = SP.P.maxHp = 1e9; SP.G.power = true; SP.P.pos.set(x, 0, z); SP.P.yaw = yaw; SP.P.pitch = pitch; SP.sim(0.3); SP.renderFrame(1); SP.renderFrame(2); }, [x, z, yaw, pitch]);
  await page.screenshot({ path: path.join(dir, `shots/90_${name}.png`) });
}
console.log('errors', errors); await browser.close();
