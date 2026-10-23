// Yeux des infectés de loin : quatre infectés réalistes face à la caméra à 5, 10, 15 et 20 m, de nuit, puis la même scène
// vue de près ; planche dans dev/shots/yeux_<carte>.jpg (quatre vues). Page en 640 × 360 (mémoire du rendu logiciel).
// usage : node yeux.mjs <carte> [qualité=2] [x z cap] (point de vue en mètres ; par défaut le départ de la carte)
import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';
const dir = path.dirname(new URL(import.meta.url).pathname);
const id = process.argv[2] || 'penitencier', q = +(process.argv[3] ?? 2), at = process.argv[4] ? process.argv.slice(4, 7).map(Number) : null;
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const ctx = await browser.newContext({ viewport: { width: 640, height: 360 } });
await ctx.addInitScript((q) => { localStorage.setItem('sp_settings', JSON.stringify({ quality: q })); }, q);
const page = await ctx.newPage(); const errors = [];
page.on('pageerror', (e) => errors.push('[pageerror] ' + e.message));
page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errors.push('[console] ' + m.text().slice(0, 300)); });
await page.route('https://cdn.jsdelivr.net/npm/three@0.186.1/**', (route) => { const u = new URL(route.request().url()); route.fulfill({ path: path.join(dir, 'node_modules/three', u.pathname.replace('/npm/three@0.186.1/', '')), contentType: 'application/javascript' }); });
await page.route('https://cdn.jsdelivr.net/npm/n8ao@2.0.1/**', (route) => route.fulfill({ path: path.join(dir, 'node_modules/n8ao/dist/N8AO.js'), contentType: 'application/javascript' }));
await page.route('https://fonts.googleapis.com/**', (r) => r.fulfill({ body: '', contentType: 'text/css' }));
await page.route('https://fonts.gstatic.com/**', (r) => r.abort());
await page.goto((process.env.WEB || 'http://127.0.0.1:8088') + '/index.html#carte=' + id);
await page.waitForFunction(() => window.__spReady, null, { timeout: 240000 });
await page.evaluate(() => document.querySelector('#soloButton').click());
await page.waitForTimeout(1500);
const url = await page.evaluate(async (at) => {
  const { G, P, R } = SP; P.hp = P.maxHp = 1e9; P.breathT = 1e9; G.breakT = 1e9; G.toSpawn = 0; for (const z of [...SP.ZOMBIES]) z.destroy();
  document.getElementById('hud').classList.add('hidden'); R.viewScene.visible = false;
  if (at) { P.pos.set(at[0], 0, at[1]); P.yaw = at[2]; }
  P.pitch = 0.02; SP.updatePlayer(0.016); P.pos.y = SP.groundAt(P.pos.x, P.pos.z) + 1.0; SP.updatePlayer(0.016);
  { const E = SP.M().env, L = R.lights, roofed = !!SP.MAP.roof[SP.tileOf(P.pos.z) * SP.MAPW() + SP.tileOf(P.pos.x)]; L.hemi.intensity = roofed ? E.hemiIn : E.hemiOut; R.scene.environmentIntensity = (roofed ? E.envIn : E.envOut) * (R.envK || 1); }
  const fx = -Math.sin(P.yaw), fz = -Math.cos(P.yaw), rx = Math.cos(P.yaw), rz = -Math.sin(P.yaw);
  const zs = [[5, -0.8], [10, 0.6], [15, -0.4], [20, 0.8]].map(([f, s]) => { const x = P.pos.x + fx * f + rx * s, z = P.pos.z + fz * f + rz * s; const zb = SP.spawnTestZombie(x, z, 'walker'); zb.yaw = Math.atan2(P.pos.x - x, P.pos.z - z); return zb; });
  for (let t = 0; t < 1.2; t += 1 / 30) { SP.sim(1 / 30); for (const z of zs) z.vel.multiplyScalar(0); }
  const cw = 640, ch = 360, mc = document.createElement('canvas'); mc.width = cw * 2; mc.height = ch * 2; const c2 = mc.getContext('2d');
  const snap = (i, label) => { SP.renderFrame(1); c2.drawImage(R.renderer.domElement, (i % 2) * cw, ((i / 2) | 0) * ch, cw, ch); c2.fillStyle = '#000a'; c2.fillRect((i % 2) * cw, ((i / 2) | 0) * ch, 260, 22); c2.fillStyle = '#ff0'; c2.font = '15px monospace'; c2.fillText(label, (i % 2) * cw + 5, ((i / 2) | 0) * ch + 16); };
  snap(0, '5, 10, 15, 20 m');
  R.camera.fov = 20; R.camera.updateProjectionMatrix(); snap(1, 'zoom ×3 (15 et 20 m)'); R.camera.fov = SP.settings.fov; R.camera.updateProjectionMatrix();
  const x0 = P.pos.x, z0 = P.pos.z, y0 = P.yaw;
  P.pos.x = x0 + fx * 3.6; P.pos.z = z0 + fz * 3.6; SP.updatePlayer(0.016); snap(2, 'de près (1,4 m)');
  P.pos.x = x0 + fx * 7.5; P.pos.z = z0 + fz * 7.5; P.yaw = y0 + Math.PI; SP.updatePlayer(0.016); snap(3, 'de dos (les yeux doivent être cachés)');
  return mc.toDataURL('image/jpeg', 0.85);
}, at);
fs.mkdirSync(path.join(dir, 'shots'), { recursive: true });
fs.writeFileSync(path.join(dir, 'shots', `yeux_${id}.jpg`), Buffer.from(url.split(',')[1], 'base64'));
console.log('ERRORS', errors.length); for (const e of errors.slice(0, 10)) console.log(e);
await browser.close();
