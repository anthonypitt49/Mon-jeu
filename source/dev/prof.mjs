import { chromium } from 'playwright';
import path from 'path';
const dir = path.dirname(new URL(import.meta.url).pathname);
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const ctx = await browser.newContext({ viewport: { width: 640, height: 360 } });
await ctx.addInitScript(() => { localStorage.setItem('sp_settings', JSON.stringify({ quality: 1 })); });
const page = await ctx.newPage();
await page.route('https://cdn.jsdelivr.net/npm/three@0.186.1/**', (route) => { const u = new URL(route.request().url()); route.fulfill({ path: path.join(dir, 'node_modules/three', u.pathname.replace('/npm/three@0.186.1/', '')), contentType: 'application/javascript' }); });
await page.route('https://fonts.googleapis.com/**', (r) => r.fulfill({ body: '', contentType: 'text/css' }));
await page.route('https://fonts.gstatic.com/**', (r) => r.abort());
await page.goto('http://127.0.0.1:8088/' + (process.env.FILE || 'index.html'));
await page.waitForFunction(() => window.__spReady, null, { timeout: 120000 });
await page.click('#soloButton');
const r = await page.evaluate(() => {
  SP.P.hp = SP.P.maxHp = 1e9; SP.sim(4);
  SP.G.toSpawn = 0; for (const z of [...SP.ZOMBIES]) z.destroy();
  for (let i = 0; i < 30; i++) SP.spawnTestZombie(26 + (i % 15) * 2.1, 12.6 + ((i / 15) | 0) * 1.6 + Math.random() * 0.6);
  SP.P.pos.set(62, 0, 14); SP.P.yaw = Math.PI / 2; SP.sim(0.5);
  const Z = SP.ZOMBIES; const T = (f) => { const t0 = performance.now(); f(); return performance.now() - t0; };
  const F = 60; const acc = { think: 0, sync: 0, hit: 0, total: 0, player: 0 };
  for (let i = 0; i < F; i++) {
    acc.think += T(() => { for (const z of Z) if (!z.remote) z.think(1 / 60, SP.G); });
    acc.sync += T(() => { for (const z of Z) z.syncMesh(1 / 60); });
    acc.hit += T(() => { for (const z of Z) if (z.alive) z.updateHitboxes(); });
    acc.total += T(() => SP.G.update(1 / 60));
    acc.player += T(() => SP.updatePlayer(1 / 60));
  }
  for (const k in acc) acc[k] = +(acc[k] / F).toFixed(3);
  return acc;
});
console.log(process.env.FILE || 'index.html', JSON.stringify(r));
await browser.close();
