// Caisse de ravitaillement : film d'un tirage (repos entrouverte, ouverture, lumière, défilement des armes, offre, redescente), en 8 vues.
// Usage : node caisse.mjs <carte> [qualité=2] ; image dans shots/caisse_<carte>.jpg. Attendu : armes dans la longueur de la caisse,
// lumière verte qui sort de la caisse sans monter au plafond, lueur par la fente au repos. Affiche ERRORS n (erreurs de la page).
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
  const s = SP.boxSpots()[G.box.loc], g = s.group.position, d = s.face, cw = 640, ch = 360, mc = document.createElement('canvas'); mc.width = cw * 4; mc.height = ch * 2; const c2 = mc.getContext('2d');
  let view = [0, 2.4]; // [décalage sur le côté, distance] ; d pointe vers le mur
  const cam = () => { const [k, D] = view; P.pos.set(g.x - d[0] * D + d[1] * 0.9 * k, 0, g.z - d[1] * D - d[0] * 0.9 * k); P.vel.set(0, 0, 0); const dx = g.x - P.pos.x, dz = g.z - P.pos.z; P.yaw = Math.atan2(-dx, -dz); P.pitch = Math.atan2(0.75 - 1.65, Math.hypot(dx, dz)); SP.updatePlayer(0.016); P.pos.y = 0; P.yaw = Math.atan2(-dx, -dz); P.pitch = Math.atan2(0.75 - 1.65, Math.hypot(dx, dz)); };
  let n = 0; const shot = (label) => { cam(); for (let k = 0; k < 3; k++) SP.renderFrame(0.016); const X = (n % 4) * cw, Y = ((n / 4) | 0) * ch; c2.drawImage(R.renderer.domElement, X, Y, cw, ch); c2.fillStyle = '#000a'; c2.fillRect(X, Y, 470, 22); c2.fillStyle = '#ff0'; c2.font = '15px monospace'; c2.fillText(label + ' · ' + G.box.state + ' ' + (G.box.display?.key || '-') + ' L' + s.lightK.toFixed(2), X + 5, Y + 16); n++; };
  const step = (t) => { for (let i = 0; i < t * 60; i++) { SP.sim(1 / 60, 1 / 60); cam(); } };
  G.mode = 'playing'; step(1.5); shot('repos (entrouverte)'); view = [0, 1.25]; shot('repos, de près');
  view = [0, 2.4]; G.me().points = 99999; G.interact(P.id, 'box'); step(0.5); shot('tirage 0,5 s');
  view = [1, 2.4]; step(1.2); shot('tirage 1,7 s (de biais)'); view = [0, 2.4]; step(2.0); shot('tirage 3,7 s');
  step(1.5); shot('offre 1 s'); view = [0, 1.4]; step(3); shot('offre 4 s, de près'); view = [0, 2.4]; step(3.5); shot('offre 7,5 s (redescend)');
  return mc.toDataURL('image/jpeg', 0.85);
});
fs.mkdirSync(path.join(dir, 'shots'), { recursive: true });
fs.writeFileSync(path.join(dir, 'shots', `caisse_${id}.jpg`), Buffer.from(url.split(',')[1], 'base64'));
for (const e of errors) console.log('[pageerror]', e);
console.log(`shots/caisse_${id}.jpg ; ERRORS ${errors.length}`);
await browser.close();
