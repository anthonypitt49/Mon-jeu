// Coût d'affichage de points de vue fixes : appels de dessin, triangles et temps moyen d'une image (rendu logiciel : à
// comparer entre eux, pas au jeu sur une vraie carte graphique). Le joueur est posé sous la caméra (lumières, ombres).
// usage : node perfvues.mjs <carte> '<[[x, y, z, cibleX, cibleY, cibleZ, titre], …]>' [qualité=1]
import { chromium } from 'playwright';
import path from 'path';
const dir = path.dirname(new URL(import.meta.url).pathname);
const id = process.argv[2] || 'poste7', views = JSON.parse(process.argv[3] || '[]'), q = +(process.argv[4] ?? 1);
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const ctx = await browser.newContext({ viewport: { width: 640, height: 360 } });
await ctx.addInitScript((q) => { localStorage.setItem('sp_settings', JSON.stringify({ quality: q })); }, q);
const page = await ctx.newPage(); const errors = [];
page.on('pageerror', (e) => errors.push('[pageerror] ' + e.message));
page.on('console', (m) => { if (m.type() === 'error' && !/favicon|Failed to load resource/.test(m.text())) errors.push('[console] ' + m.text().slice(0, 200)); });
await page.route('https://cdn.jsdelivr.net/npm/three@0.186.1/**', (route) => { const u = new URL(route.request().url()); route.fulfill({ path: path.join(dir, 'node_modules/three', u.pathname.replace('/npm/three@0.186.1/', '')), contentType: 'application/javascript' }); });
await page.route('https://cdn.jsdelivr.net/npm/n8ao@2.0.1/**', (route) => route.fulfill({ path: path.join(dir, 'node_modules/n8ao/dist/N8AO.js'), contentType: 'application/javascript' }));
await page.route('https://fonts.googleapis.com/**', (r) => r.fulfill({ body: '', contentType: 'text/css' }));
await page.route('https://fonts.gstatic.com/**', (r) => r.abort());
await page.goto((process.env.WEB || 'http://127.0.0.1:8088') + '/index.html?nozreal#carte=' + id, { timeout: 300000 });
await page.waitForFunction(() => window.__spReady, null, { timeout: 400000 });
await page.evaluate(() => document.querySelector('#soloButton').click());
await page.waitForTimeout(1500);
const out = await page.evaluate(async (views) => {
  const { G, P, R } = SP; P.hp = P.maxHp = 1e9; G.breakT = 1e9; G.toSpawn = 0; for (const z of [...SP.ZOMBIES]) z.destroy(); P.torch = false;
  const res = [];
  for (const [x, y, z, tx, ty, tz, label = ''] of views) {
    for (let k = 0; k < 20; k++) { P.pos.set(x, SP.groundAt(x, z), z); P.vel.set(0, 0, 0); SP.sim(0.1); }
    G.mode = 'paused'; const cam = R.camera;
    const put = () => { cam.position.set(x, y, z); cam.lookAt(tx, ty, tz); cam.updateMatrixWorld(true); };
    put(); for (let i = 0; i < 3; i++) { SP.renderFrame(i); put(); }
    let ms = 0; const F = 12; for (let i = 0; i < F; i++) { put(); const t0 = performance.now(); SP.renderFrame(10 + i); ms += performance.now() - t0; }
    const rr = R.renderer; put(); rr.info.autoReset = false; rr.info.reset(); rr.render(R.scene, cam); const calls = rr.info.render.calls, tris = rr.info.render.triangles; rr.info.autoReset = true;
    res.push({ label, calls, tris, ms: +(ms / F).toFixed(1) }); G.mode = 'playing';
  }
  return res;
}, views);
for (const r of out) console.log(r.label.padEnd(26), 'appels', String(r.calls).padStart(4), '· triangles', String(r.tris).padStart(7), '· image', r.ms, 'ms');
console.log('ERRORS', errors.length); for (const e of errors.slice(0, 6)) console.log(e);
await browser.close();
