// Caisse de ravitaillement : film d'un tirage (couvercle, faisceau, défilement des armes, offre, redescente), en 6 vues.
// Usage : node caisse.mjs <carte> [qualité=2] ; image dans shots/caisse_<carte>.jpg. Attendu : armes dans la longueur de la caisse,
// lumière dans l'emprise de la caisse, colonne de lumière à la caisse fermée. Affiche ERRORS n (erreurs de la page).
import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';
const dir = path.dirname(new URL(import.meta.url).pathname), id = process.argv[2] || 'penitencier', q = +(process.argv[3] ?? 2);
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
await ctx.addInitScript((q) => localStorage.setItem('sp_settings', JSON.stringify({ quality: q })), q);
const page = await ctx.newPage(); const errors = []; page.on('pageerror', (e) => errors.push(e.message));
await page.route('https://cdn.jsdelivr.net/npm/three@0.186.1/**', (route) => { const u = new URL(route.request().url()); route.fulfill({ path: path.join(dir, 'node_modules/three', u.pathname.replace('/npm/three@0.186.1/', '')), contentType: 'application/javascript' }); });
await page.route('https://cdn.jsdelivr.net/npm/n8ao@2.0.1/**', (route) => route.fulfill({ path: path.join(dir, 'node_modules/n8ao/dist/N8AO.js'), contentType: 'application/javascript' }));
await page.route('https://fonts.googleapis.com/**', (r) => r.fulfill({ body: '', contentType: 'text/css' }));
await page.route('https://fonts.gstatic.com/**', (r) => r.abort());
await page.goto((process.env.WEB || 'http://127.0.0.1:8088') + '/index.html?nozreal' + (process.env.Q ? '&' + process.env.Q : '') + '#carte=' + id);
await page.waitForFunction(() => window.__spReady, null, { timeout: 180000 });
await page.waitForTimeout(q >= 1 ? 25000 : 1000); // photos
await page.evaluate(() => document.getElementById('soloButton').click()); await page.waitForTimeout(1500);
const url = await page.evaluate(() => {
  const { G, P, R } = SP; P.hp = P.maxHp = 1e9; G.toSpawn = 0; for (const z of [...SP.ZOMBIES]) z.destroy();
  const s = SP.boxSpots()[G.box.loc], g = s.group.position, d = s.face, cw = 640, ch = 360, mc = document.createElement('canvas'); mc.width = cw * 3; mc.height = ch * 2; const c2 = mc.getContext('2d');
  const cam = (k) => { P.pos.set(g.x - d[0] * 2.4 + d[1] * 0.9 * k, 0, g.z - d[1] * 2.4 - d[0] * 0.9 * k); P.vel.set(0, 0, 0); P.yaw = Math.atan2(d[0], d[1]) + Math.PI + Math.atan2(0.9 * k, 2.4) * 0; const dx = g.x - P.pos.x, dz = g.z - P.pos.z; P.yaw = Math.atan2(-dx, -dz); P.pitch = -0.22; SP.updatePlayer(0.016); P.pos.y = 0; };
  let n = 0; const shot = (label) => { for (let k = 0; k < 3; k++) SP.renderFrame(0.016); c2.drawImage(R.renderer.domElement, (n % 3) * cw, ((n / 3) | 0) * ch, cw, ch); c2.fillStyle = '#000a'; c2.fillRect((n % 3) * cw, ((n / 3) | 0) * ch, 470, 22); c2.fillStyle = '#ff0'; c2.font = '15px monospace'; c2.fillText(label + ' · ' + G.box.state + ' ' + (G.box.display?.key || '-') + ' L' + s.lightK.toFixed(2), (n % 3) * cw + 5, ((n / 3) | 0) * ch + 16); n++; };
  const step = (t) => { for (let i = 0; i < t * 60; i++) { SP.sim(1 / 60, 1 / 60); cam(n === 2 ? 1 : 0); } };
  G.mode = 'playing'; step(1); shot('fermée (colonne)');
  G.me().points = 99999; G.interact(P.id, 'box'); step(0.5); shot('tirage 0,5 s');
  step(1.2); shot('tirage 1,7 s (de biais)'); step(2.0); shot('tirage 3,7 s');
  step(1.5); shot('offre 1 s'); step(6.5); shot('offre 7,5 s (redescend)');
  return mc.toDataURL('image/jpeg', 0.85);
});
fs.mkdirSync(path.join(dir, 'shots'), { recursive: true });
fs.writeFileSync(path.join(dir, 'shots', `caisse_${id}.jpg`), Buffer.from(url.split(',')[1], 'base64'));
for (const e of errors) console.log('[pageerror]', e);
console.log(`shots/caisse_${id}.jpg ; ERRORS ${errors.length}`);
await browser.close();
