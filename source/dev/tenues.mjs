// Tenues des soldats selon la carte (OUTFIT, charCoat) : les quatre coéquipiers côte à côte, de face et de dos, arme en
// main. Planche dans dev/shots/tenues_<carte>.jpg. usage : node tenues.mjs [carte=poste7] [qualité=2]
import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';
const dir = path.dirname(new URL(import.meta.url).pathname);
const id = process.argv[2] || 'poste7', q = +(process.argv[3] ?? 2);
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const ctx = await browser.newContext({ viewport: { width: 800, height: 450 } });
await ctx.addInitScript((q) => { localStorage.setItem('sp_settings', JSON.stringify({ quality: q })); }, q);
const page = await ctx.newPage(); const errors = [];
page.on('pageerror', (e) => errors.push('[pageerror] ' + e.message));
await page.route('https://cdn.jsdelivr.net/npm/three@0.186.1/**', (route) => { const u = new URL(route.request().url()); route.fulfill({ path: path.join(dir, 'node_modules/three', u.pathname.replace('/npm/three@0.186.1/', '')), contentType: 'application/javascript' }); });
await page.route('https://cdn.jsdelivr.net/npm/n8ao@2.0.1/**', (route) => route.fulfill({ path: path.join(dir, 'node_modules/n8ao/dist/N8AO.js'), contentType: 'application/javascript' }));
await page.route('https://fonts.googleapis.com/**', (r) => r.fulfill({ body: '', contentType: 'text/css' }));
await page.route('https://fonts.gstatic.com/**', (r) => r.abort());
await page.goto((process.env.WEB || 'http://127.0.0.1:8088') + '/index.html#carte=' + id, { timeout: 300000 });
await page.waitForFunction(() => window.__spReady, null, { timeout: 400000 });
await page.evaluate(() => document.querySelector('#soloButton').click());
await page.waitForTimeout(1500);
await page.evaluate(() => {
  const { G, P } = SP; P.hp = P.maxHp = 1e9; G.breakT = 1e9; G.toSpawn = 0; for (const z of [...SP.ZOMBIES]) z.destroy();
  const guns = ['carbine', 'smg', 'ar', 'shotgun'];
  for (let i = 0; i < 4; i++) { const r = G.addPlayer('t' + i, 'SOLDAT ' + (i + 1), false); r.soldier = i; r.weaponKey = guns[i]; }
});
await page.waitForFunction(() => SP.SREAL.state !== 'loading' && SP.SREAL.state !== 'off', null, { timeout: 180000 });
const url = await page.evaluate(() => {
  const { G, P, R } = SP; document.getElementById('hud').classList.add('hidden');
  const M = SP.MAP, W = SP.MAPW(); let best = 0; for (let i = 0; i < M.edge.length; i++) if (M.edge[i] > M.edge[best] && !M.roof[i]) best = i;
  const cx = ((best % W) + 0.5) * 2, cz = (((best / W) | 0) + 0.5) * 2, y0 = SP.groundAt(cx, cz);
  P.pos.set(cx + 40, y0, cz + 40); SP.updatePlayer(0.016);
  const recs = [...G.players.values()].filter((q) => !q.isLocal);
  recs.forEach((r, i) => { r.pos.set(cx - 1.65 + i * 1.1, y0, cz); r.yaw = 0; r.pitch = 0; r.flags = 0; r.net = null; });
  for (let k = 0; k < 40; k++) { for (const r of recs) if (r.avatar) r.avatar.fireT = 3; G.update(1 / 30); }
  R.camera.fov = 40; R.camera.updateProjectionMatrix(); R.viewScene.visible = false;
  const cw = 800, ch = 450, mc = document.createElement('canvas'); mc.width = cw * 2; mc.height = ch; const c2 = mc.getContext('2d');
  [[0.6, 1.5, -4.6], [-0.6, 1.6, 4.6]].forEach(([dx, dy, dz], i) => { R.camera.position.set(cx + dx, y0 + dy, cz + dz); R.camera.lookAt(cx, y0 + 1.05, cz); R.viewScene.visible = false; SP.renderFrame(1 / 30); c2.drawImage(R.renderer.domElement, i * cw, 0, cw, ch); });
  return mc.toDataURL('image/jpeg', 0.86);
});
fs.mkdirSync(path.join(dir, 'shots'), { recursive: true });
fs.writeFileSync(path.join(dir, 'shots', `tenues_${id}.jpg`), Buffer.from(url.split(',')[1], 'base64'));
console.log('planche', path.join(dir, 'shots', `tenues_${id}.jpg`), 'ERRORS', errors.length, errors.slice(0, 3));
await browser.close();
