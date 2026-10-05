// Textures photo : tournée visuelle servie en HTTP (les photos ne se chargent pas en file://), après chargement des photos.
// usage : node photo.mjs <carte> [qualité=2] [préfixe=photo] ['[[tx,tz],...]' points] ; env Q='nophoto' pour la version dessinée.
// env CHECK=1 : vérification seule, sans tournée (photos appliquées à toutes les matières prévues, version allégée en qualité « bas »).
import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';
const dir = path.dirname(new URL(import.meta.url).pathname);
const id = process.argv[2] || 'poste7', q = +(process.argv[3] ?? 2), N = 4, pre = process.argv[4] || 'photo';
const forced = process.argv[5] ? JSON.parse(process.argv[5]) : null;
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
await ctx.addInitScript((q) => { localStorage.setItem('sp_settings', JSON.stringify({ quality: q })); }, q);
const page = await ctx.newPage(); const errors = [];
page.on('pageerror', (e) => errors.push('[pageerror] ' + e.message));
page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errors.push('[console] ' + m.text().slice(0, 300)); });
await page.route('https://cdn.jsdelivr.net/npm/three@0.186.1/**', (route) => { const u = new URL(route.request().url()); route.fulfill({ path: path.join(dir, 'node_modules/three', u.pathname.replace('/npm/three@0.186.1/', '')), contentType: 'application/javascript' }); });
await page.route('https://cdn.jsdelivr.net/npm/n8ao@2.0.1/**', (route) => route.fulfill({ path: path.join(dir, 'node_modules/n8ao/dist/N8AO.js'), contentType: 'application/javascript' }));
await page.route('https://fonts.googleapis.com/**', (r) => r.fulfill({ body: '', contentType: 'text/css' }));
await page.route('https://fonts.gstatic.com/**', (r) => r.abort());
await page.goto('http://127.0.0.1:8088/index.html?' + (process.env.Q || '') + '#carte=' + id);
await page.waitForFunction(() => window.__spReady, null, { timeout: 180000 });
await page.waitForFunction(() => ['on', 'failed', 'off'].includes(SP.PHOTO.state) && (SP.PHOTO.state !== 'off' || /nophoto/.test(location.search) || SP.settings.quality < 1), null, { timeout: 400000, polling: 1000 }); // rendu logiciel : jusqu'à 2 min et plus
await page.waitForTimeout(1500);
const ph = await page.evaluate(() => ({ ...SP.PHOTO, aoPass: !!SP.R.ao, want: Object.keys(SP.PHOTO_SETS[SP.MAP_ID()] || {}) }));
console.log('PHOTO', JSON.stringify(ph));
if (!/nophoto/.test(process.env.Q || '')) {
  if (ph.state !== 'on') errors.push(`[photo] état ${ph.state} ${ph.err || ''}`);
  // (familles d'objets absentes de la carte : rien à poser)
  const missing = ph.want.filter((k) => !(ph.done || []).includes(k) && !(ph.absent || []).includes(k)); if (missing.length) errors.push('[photo] matières sans photo : ' + missing.join(', '));
  if (!!ph.lite !== (q === 0)) errors.push(`[photo] version allégée ${ph.lite} en qualité ${q}`);
}
if (process.env.CHECK) { console.log('ERRORS', errors.length); for (const e of errors.slice(0, 10)) console.log(e); await browser.close(); process.exit(0); }
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
  const url = await page.evaluate(([tx, tz, cyaw, cpitch]) => {
    const close = cyaw != null; /* [x, z, cap, inclinaison] en mètres : vue rapprochée */
    const { P, R } = SP; const cw = 640, ch = 360, mc = document.createElement('canvas'); mc.width = cw * 2; mc.height = ch * 2; const c2 = mc.getContext('2d');
    const yaws = [0, Math.PI / 2, Math.PI, -Math.PI / 2], names = ['N', 'O', 'S', 'E'];
    yaws.forEach((yaw, i) => { yaw = yaw;
      const px = close ? tx : tx * 2 + 1, pz = close ? tz : tz * 2 + 1; if (close) yaw = cyaw + [0, 0.5, -0.5, Math.PI][i];
      SP.G.mode = 'playing'; P.pos.set(px, 0, pz); P.vel.set(0, 0, 0); P.yaw = yaw; P.pitch = close ? cpitch : 0.05; SP.updatePlayer(0.016); P.pos.set(px, P.pos.y, pz); SP.updatePlayer(0.016);
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
