import { chromium } from 'playwright';
import path from 'path';
const dir = path.dirname(new URL(import.meta.url).pathname);
const Q = +(process.env.Q ?? 1), N = +(process.env.N ?? 30);
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const ctx = await browser.newContext({ viewport: { width: 640, height: 360 } });
await ctx.addInitScript((q) => { localStorage.setItem('sp_settings', JSON.stringify({ quality: q })); }, Q);
const page = await ctx.newPage();
const errors = []; page.on('pageerror', (e) => errors.push(e.message)); page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 200)); });
await page.route('https://cdn.jsdelivr.net/npm/three@0.186.1/**', (route) => { const u = new URL(route.request().url()); route.fulfill({ path: path.join(dir, 'node_modules/three', u.pathname.replace('/npm/three@0.186.1/', '')), contentType: 'application/javascript' }); });
await page.route('https://fonts.googleapis.com/**', (r) => r.fulfill({ body: '', contentType: 'text/css' }));
await page.route('https://fonts.gstatic.com/**', (r) => r.abort());
await page.goto('http://127.0.0.1:8088/' + (process.env.FILE || 'index.html'));
await page.waitForFunction(() => window.__spReady, null, { timeout: 120000 });
await page.click('#soloButton');
const r = await page.evaluate(async (N) => {
  SP.P.hp = SP.P.maxHp = 1e9; SP.sim(4);
  // Freeze the natural spawner and place N zombies walking toward the player in the main trench.
  SP.G.toSpawn = 0; for (const z of [...SP.ZOMBIES]) z.destroy();
  const Zc = SP.ZOMBIES.constructor;
  for (let i = 0; i < N; i++) SP.spawnTestZombie(26 + (i % 15) * 2.1, 12.6 + ((i / 15) | 0) * 1.6 + Math.random() * 0.6);
  SP.P.pos.set(62, 0, 14); SP.P.yaw = Math.PI / 2; SP.P.pitch = -0.05; SP.sim(0.2);
  const T = (f) => { const t0 = performance.now(); f(); return performance.now() - t0; };
  for (let i = 0; i < 40; i++) { SP.G.update(1 / 60); SP.updatePlayer(1 / 60); } for (let i = 0; i < 3; i++) SP.renderFrame(i);
  let upd = 0, ren = 0; const F = 16;
  for (let i = 0; i < F; i++) { upd += T(() => { SP.G.update(1 / 60); SP.updatePlayer(1 / 60); }); ren += T(() => SP.renderFrame(i)); }
  const rr = SP.R.renderer; rr.info.autoReset = false; rr.info.reset(); rr.render(SP.R.scene, SP.R.camera); const calls = rr.info.render.calls, tris = rr.info.render.triangles; rr.info.autoReset = true;
  return { zombies: SP.ZOMBIES.filter((z) => z.alive).length, updateMs: +(upd / F).toFixed(2), renderMs: +(ren / F).toFixed(1), calls, tris };
}, N);
console.log(JSON.stringify(r), 'errors', errors.length, errors.slice(0, 3));
await browser.close();
