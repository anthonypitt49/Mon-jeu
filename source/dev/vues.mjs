// Vues fixes d'une carte, réunies sur une planche (le jeu ne reprend pas la main entre le placement de la caméra et la
// copie de l'image). usage : node vues.mjs <carte> '<vues>' [nom=vues] [qualité=2] [largeur=640]
// <vues> : JSON, liste de [x, y, z, cibleX, cibleY, cibleZ, (champ de vision=70), (titre), (joueur=0)]. joueur=1 : le joueur
// est d'abord posé au sol sous la caméra (lumière d'intérieur, ombres de la lune autour de lui), 3 s de jeu.
// WEB=http://127.0.0.1:<port> ; ZREAL=0 : sans infectés réalistes. Planche : dev/shots/<nom>.jpg
import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';
const dir = path.dirname(new URL(import.meta.url).pathname);
const id = process.argv[2] || 'poste7', views = JSON.parse(process.argv[3] || '[]'), name = process.argv[4] || 'vues', q = +(process.argv[5] ?? 2), W = +(process.argv[6] ?? 640);
const H = Math.round(W * 9 / 16), cols = views.length > 4 ? 3 : 2;
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const ctx = await browser.newContext({ viewport: { width: W, height: H } });
await ctx.addInitScript((q) => { localStorage.setItem('sp_settings', JSON.stringify({ quality: q })); }, q);
const page = await ctx.newPage(); const errors = [];
page.on('pageerror', (e) => errors.push('[pageerror] ' + e.message + '\n' + (e.stack || '').slice(0, 500)));
page.on('console', (m) => { if (m.type() === 'error' && !/favicon|Failed to load resource/.test(m.text())) errors.push('[console] ' + m.text().slice(0, 300)); });
await page.route('https://cdn.jsdelivr.net/npm/three@0.186.1/**', (route) => { const u = new URL(route.request().url()); route.fulfill({ path: path.join(dir, 'node_modules/three', u.pathname.replace('/npm/three@0.186.1/', '')), contentType: 'application/javascript' }); });
await page.route('https://cdn.jsdelivr.net/npm/n8ao@2.0.1/**', (route) => route.fulfill({ path: path.join(dir, 'node_modules/n8ao/dist/N8AO.js'), contentType: 'application/javascript' }));
await page.route('https://fonts.googleapis.com/**', (r) => r.fulfill({ body: '', contentType: 'text/css' }));
await page.route('https://fonts.gstatic.com/**', (r) => r.abort());
const t0 = Date.now();
await page.goto((process.env.WEB || 'http://127.0.0.1:8088') + '/index.html' + (process.env.ZREAL === '0' ? '?nozreal' : '') + '#carte=' + id, { timeout: 300000 });
await page.waitForFunction(() => window.__spReady, null, { timeout: 400000 });
await page.evaluate(() => document.querySelector('#soloButton').click());
await page.waitForTimeout(2500);
const res = await page.evaluate(async ([views, W, H, cols, torch]) => {
  const { G, P, R } = SP; P.hp = P.maxHp = 1e9; G.breakT = 1e9; G.toSpawn = 0; for (const z of [...SP.ZOMBIES]) z.destroy();
  if (window.__vuesPrep) window.__vuesPrep();
  if (!torch) P.torch = false; // (lampe du joueur éteinte : on regarde l'éclairage du décor ; TORCH=1 pour la garder)
  document.getElementById('hud').classList.add('hidden'); for (const e of document.querySelectorAll('#intro, .intro, #message, #banner')) e.style.display = 'none';
  SP.sim(0.5); G.mode = 'paused';
  const rows = Math.ceil(views.length / cols), mc = document.createElement('canvas'); mc.width = W * cols; mc.height = H * rows; const c2 = mc.getContext('2d');
  const cam = R.camera, out = [];
  for (let i = 0; i < views.length; i++) {
    const [x, y, z, tx, ty, tz, fov = 70, label = '', place = 0] = views[i];
    if (place) { G.mode = 'playing'; for (let k = 0; k < 30; k++) { P.pos.set(x, SP.groundAt(x, z), z); P.vel.set(0, 0, 0); SP.sim(0.1); } G.mode = 'paused'; }
    cam.position.set(x, y, z); cam.fov = fov; cam.updateProjectionMatrix(); cam.lookAt(tx, ty, tz); cam.updateMatrixWorld(true);
    R.viewScene.visible = false; SP.renderFrame(1 + i * 0.016); SP.renderFrame(1.016 + i * 0.016);
    const info = R.renderer.info.render; out.push([info.calls, info.triangles]);
    c2.drawImage(R.renderer.domElement, (i % cols) * W, ((i / cols) | 0) * H, W, H);
    if (label) { c2.fillStyle = '#000a'; c2.fillRect((i % cols) * W, ((i / cols) | 0) * H, 8 + label.length * 7.5, 20); c2.fillStyle = '#ff6'; c2.font = '13px monospace'; c2.fillText(label, (i % cols) * W + 5, ((i / cols) | 0) * H + 14); }
  }
  return { url: mc.toDataURL('image/jpeg', 0.86), out };
}, [views, W, H, cols, !!process.env.TORCH]);
fs.mkdirSync(path.join(dir, 'shots'), { recursive: true });
const file = path.join(dir, 'shots', name + '.jpg');
fs.writeFileSync(file, Buffer.from(res.url.split(',')[1], 'base64'));
console.log('planche', file, 'en', ((Date.now() - t0) / 1000).toFixed(0), 's ; appels/triangles', JSON.stringify(res.out));
console.log('ERRORS', errors.length); for (const e of errors.slice(0, 8)) console.log(e);
await browser.close();
