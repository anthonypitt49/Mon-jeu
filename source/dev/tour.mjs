// Tournée visuelle : n points répartis sur le sol praticable, 4 directions par point, assemblées en mosaïque JPEG.
// usage : node tour.mjs <carte> [qualité=2] [points=10] [préfixe=tour] ['[[tx,tz],...]' points imposés]
import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';
const dir = path.dirname(new URL(import.meta.url).pathname);
const id = process.argv[2] || 'cite', q = +(process.argv[3] ?? 2), N = +(process.argv[4] ?? 10), pre = process.argv[5] || 'tour';
const forced = process.argv[6] ? JSON.parse(process.argv[6]) : null;
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
await ctx.addInitScript((q) => { localStorage.setItem('sp_settings', JSON.stringify({ quality: q })); }, q);
const page = await ctx.newPage(); const errors = [];
page.on('pageerror', (e) => errors.push('[pageerror] ' + e.message));
page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errors.push('[console] ' + m.text().slice(0, 300)); });
await page.route('https://cdn.jsdelivr.net/npm/three@0.186.1/**', (route) => { const u = new URL(route.request().url()); route.fulfill({ path: path.join(dir, 'node_modules/three', u.pathname.replace('/npm/three@0.186.1/', '')), contentType: 'application/javascript' }); });
await page.route('https://fonts.googleapis.com/**', (r) => r.fulfill({ body: '', contentType: 'text/css' }));
await page.route('https://fonts.gstatic.com/**', (r) => r.abort());
await page.goto('file://' + path.join(dir, 'index.html') + '#carte=' + id);
await page.waitForFunction(() => window.__spReady, null, { timeout: 180000 });
await page.evaluate(() => document.querySelector('#soloButton').click());
await page.waitForTimeout(400);
const pts = await page.evaluate(([N, forced]) => {
  const { G, P, R } = SP; P.hp = P.maxHp = 1e9; G.breakT = 1e9; G.toSpawn = 0; for (const z of [...SP.ZOMBIES]) z.destroy();
  SP.sim(0.2); for (const z of [...SP.ZOMBIES]) z.destroy();
  R.viewScene.visible = false; document.getElementById('hud').classList.add('hidden');
  if (forced) return forced;
  const W = SP.MAPW(), D = SP.MAP.type.length / W, tiles = [];
  for (let z = 0; z < D; z++) for (let x = 0; x < W; x++) if (SP.MAP.type[z * W + x] === 1) tiles.push([x, z]);
  // Échantillonnage du point le plus éloigné.
  const out = [tiles[(tiles.length / 2) | 0]];
  while (out.length < Math.min(N, tiles.length)) { let best = null, bd = -1; for (const t of tiles) { let d = 1e9; for (const o of out) d = Math.min(d, Math.hypot(t[0] - o[0], t[1] - o[1])); if (d > bd) { bd = d; best = t; } } out.push(best); }
  return out;
}, [N, forced]);
fs.mkdirSync(path.join(dir, 'shots'), { recursive: true });
for (let k = 0; k < pts.length; k++) {
  const url = await page.evaluate(([tx, tz]) => {
    const { P, R } = SP; const cw = 640, ch = 360, mc = document.createElement('canvas'); mc.width = cw * 2; mc.height = ch * 2; const c2 = mc.getContext('2d');
    const yaws = [0, Math.PI / 2, Math.PI, -Math.PI / 2], names = ['N', 'O', 'S', 'E'];
    yaws.forEach((yaw, i) => {
      SP.G.mode = 'playing'; P.pos.set(tx * 2 + 1, 0, tz * 2 + 1); P.vel.set(0, 0, 0); P.yaw = yaw; P.pitch = 0.05; SP.updatePlayer(0.016); P.pos.set(tx * 2 + 1, P.pos.y, tz * 2 + 1); SP.updatePlayer(0.016);
      SP.renderFrame(1); c2.drawImage(R.renderer.domElement, (i % 2) * cw, ((i / 2) | 0) * ch, cw, ch);
      c2.fillStyle = '#000a'; c2.fillRect((i % 2) * cw, ((i / 2) | 0) * ch, 120, 22); c2.fillStyle = '#ff0'; c2.font = '15px monospace'; c2.fillText(`${tx},${tz} ${names[i]}`, (i % 2) * cw + 5, ((i / 2) | 0) * ch + 16);
    });
    return mc.toDataURL('image/jpeg', 0.82);
  }, pts[k]);
  fs.writeFileSync(path.join(dir, 'shots', `${pre}_${id}_${k}.jpg`), Buffer.from(url.split(',')[1], 'base64'));
  console.log('point', k, JSON.stringify(pts[k]));
}
console.log('ERRORS', errors.length); for (const e of errors.slice(0, 10)) console.log(e);
await browser.close();
