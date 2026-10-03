import { chromium } from 'playwright';
import path from 'path';
const dir = path.dirname(new URL(import.meta.url).pathname);
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
for (const mapId of ['poste7', 'cite']) {
  const ctx = await browser.newContext({ viewport: { width: 640, height: 360 } });
  await ctx.addInitScript(() => { localStorage.setItem('sp_settings', JSON.stringify({ quality: 1 })); localStorage.setItem('sp_tips', JSON.stringify({ repair: 1, objective: 1, power: 1, ping: 1, perks: 1, box: 1, down: 1 })); });
  const page = await ctx.newPage(); const errors = []; page.on('pageerror', (e) => errors.push(e.message));
  await page.route('https://cdn.jsdelivr.net/npm/three@0.186.1/**', (route) => { const u = new URL(route.request().url()); route.fulfill({ path: path.join(dir, 'node_modules/three', u.pathname.replace('/npm/three@0.186.1/', '')), contentType: 'application/javascript' }); });
  await page.route('https://fonts.googleapis.com/**', (r) => r.fulfill({ body: '', contentType: 'text/css' }));
  await page.goto('http://127.0.0.1:8088/index.html#carte=' + mapId); await page.waitForFunction(() => window.__spReady, null, { timeout: 120000 });
  await page.evaluate(() => document.getElementById('soloButton').click());
  const r = await page.evaluate(() => {
    const { G, P } = SP; P.hp = P.maxHp = 1e9; G.toSpawn = 0; G.breakT = 1e9; SP.sim(5); for (const z of [...SP.ZOMBIES]) z.destroy();
    SP.grantWeapon('ar', false); SP.sim(0.6); SP.INPUT.firePressed = true; SP.INPUT.fire = true; for (let t = 0; t < 0.8; t += 0.05) { P.rec.p = P.rec.y = 0; SP.sim(0.05); } SP.INPUT.fire = false; SP.sim(2);
    const c = SP.FX.casings.filter((q) => q.life > 0); return { n: c.length, ys: c.slice(0, 8).map((q) => +q.p.y.toFixed(3)), flat: c.every((q) => Math.abs(q.r.x - Math.PI / 2) < 1e-6), feet: +P.pos.y.toFixed(2) };
  });
  console.log(mapId, JSON.stringify(r), 'erreurs', errors.length, errors.slice(0, 2)); await ctx.close();
}
await browser.close();
