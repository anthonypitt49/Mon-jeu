// Armes murales : chaque arme d'une carte photographiée de face et de biais (gauche, droite), pour vérifier qu'elle est dans
// le sens de son contour à la craie et que le contour ne clignote pas selon l'angle (il doit rester devant le mur).
// Usage : node armesmur.mjs <carte> [qualité=2] (env DIST=1.8 : distance au mur en m) ; images dans shots/armesmur_<carte>_<n>.jpg (une par arme). Affiche ERRORS n.
import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';
const dir = path.dirname(new URL(import.meta.url).pathname), id = process.argv[2] || 'cite', q = +(process.argv[3] ?? 2);
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
const urls = await page.evaluate((DIST) => {
  const { G, P, R, WORLD } = SP; P.hp = P.maxHp = 1e9; G.toSpawn = 0; for (const z of [...SP.ZOMBIES]) z.destroy();
  const out = [];
  for (const wb of WORLD.wallBuys) {
    const g = wb.group.position, d = wb.face, cw = 640, ch = 360, mc = document.createElement('canvas'); mc.width = cw * 3; mc.height = ch; const c2 = mc.getContext('2d');
    // d pointe vers le mur ; le joueur se tient à DIST devant, de face puis décalé de 1,4 m de chaque côté.
    [-1.4, 0, 1.4].forEach((k, n) => {
      P.pos.set(g.x - d[0] * DIST + d[1] * k * DIST / 1.8, 0, g.z - d[1] * DIST - d[0] * k * DIST / 1.8); P.vel.set(0, 0, 0);
      const dx = g.x - P.pos.x, dz = g.z - P.pos.z; P.yaw = Math.atan2(-dx, -dz); P.pitch = Math.atan2(g.y - 1.65, Math.hypot(dx, dz)); SP.updatePlayer(0.016); P.pos.y = 0;
      P.yaw = Math.atan2(-dx, -dz); P.pitch = Math.atan2(g.y - 1.65, Math.hypot(dx, dz));
      for (let i = 0; i < 3; i++) SP.renderFrame(0.016);
      c2.drawImage(R.renderer.domElement, n * cw, 0, cw, ch);
      c2.fillStyle = '#000a'; c2.fillRect(n * cw, 0, 300, 22); c2.fillStyle = '#ff0'; c2.font = '15px monospace'; c2.fillText(`${wb.weapon} ${['gauche', 'face', 'droite'][n]}`, n * cw + 5, 16);
    });
    out.push(mc.toDataURL('image/jpeg', 0.85));
  }
  return out;
}, +(process.env.DIST || 1.8));
fs.mkdirSync(path.join(dir, 'shots'), { recursive: true });
urls.forEach((u, i) => fs.writeFileSync(path.join(dir, 'shots', `armesmur_${id}_${i}.jpg`), Buffer.from(u.split(',')[1], 'base64')));
for (const e of errors) console.log('[pageerror]', e);
console.log(`${urls.length} armes : shots/armesmur_${id}_*.jpg ; ERRORS ${errors.length}`);
await browser.close();
