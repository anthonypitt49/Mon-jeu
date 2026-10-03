import { chromium } from 'playwright';
import path from 'path';
const dir = path.dirname(new URL(import.meta.url).pathname);
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const ctx = await browser.newContext({ viewport: { width: 800, height: 450 } });
await ctx.addInitScript(() => { localStorage.setItem('sp_settings', JSON.stringify({ quality: 0 })); });
const page = await ctx.newPage(); const errors = []; page.on('pageerror', (e) => errors.push(e.message));
await page.route('https://cdn.jsdelivr.net/npm/three@0.186.1/**', (route) => { const u = new URL(route.request().url()); route.fulfill({ path: path.join(dir, 'node_modules/three', u.pathname.replace('/npm/three@0.186.1/', '')), contentType: 'application/javascript' }); });
await page.route('https://fonts.googleapis.com/**', (r) => r.fulfill({ body: '', contentType: 'text/css' }));
await page.route('https://fonts.gstatic.com/**', (r) => r.abort());
await page.goto('http://127.0.0.1:8088/' + (process.env.FILE || 'index.html') + (process.env.MAPID ? '#carte=' + process.env.MAPID : '')); await page.waitForFunction(() => window.__spReady, null, { timeout: 120000 });
await page.evaluate(() => document.getElementById('soloButton').click());
const res = await page.evaluate(() => {
  const { G, P, MAP, ZOMBIES } = SP; P.hp = P.maxHp = 1e9; SP.sim(0.5); G.toSpawn = 0; G.breakT = 1e9; G.round = 3;
  for (const d of MAP.doors) G.applyEvent('door', { id: d.id });
  const out = [];
  for (const b of MAP.barricades) {
    for (const z of [...ZOMBIES]) z.destroy();
    for (const o of MAP.barricades) o.planks = o === b ? 0 : 6;
    // Joueur 4 carreaux à l'intérieur, dans la tranchée.
    let [ix, iz] = b.inner; for (let k = 0; k < 3; k++) { const nx = ix - b.dir[0], nz = iz - b.dir[1]; if (SP.MAP.type[nz * SP.MAPW() + nx] === 1) { ix = nx; iz = nz; } }
    P.pos.set(ix * 2 + 1, 0, iz * 2 + 1); G.flowT = 0;
    const zs = [];
    for (let k = 0; k < 5; k++) { const [sx, sz] = b.spawns[k % b.spawns.length] || b.outer; const z = SP.spawnTestZombie(sx * 2 + 1 + (k - 2) * 0.3, sz * 2 + 1 + (k % 2) * 0.3); z.speed = k === 4 ? 4 : 1.05; z.rise = 1; z.state = 'move'; zs.push(z); }
    const reachedAt = zs.map(() => -1);
    for (let t = 0; t < 30; t += 0.05) { G.update(0.05); P.pos.set(ix * 2 + 1, 0, iz * 2 + 1); zs.forEach((z, k) => { const tx = Math.floor(z.pos.x / 2), tz = Math.floor(z.pos.z / 2); if (reachedAt[k] < 0 && MAP.type[tz * SP.MAPW() + tx] === 1) reachedAt[k] = +t.toFixed(1); }); if (reachedAt.every((r) => r >= 0)) break; }
    out.push({ id: b.id, x: b.x, z: b.z, all: reachedAt.every((r) => r >= 0), reachedAt: reachedAt.join(','), stuck: zs.filter((z, k) => reachedAt[k] < 0).map((z) => `${z.pos.x.toFixed(1)},${z.pos.z.toFixed(1)}`).join(' ') });
  }
  return out;
});
for (const r of res) console.log(JSON.stringify(r));
console.log('errors', errors);
await browser.close();
