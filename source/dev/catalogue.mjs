// Catalogue des infectés réalistes d'une carte, pour choisir lesquels garder : chaque modèle numéroté, en pied et en
// gros plan, sous l'éclairage de la carte (costauds à leur taille de costaud). Planche dans dev/shots/catalogue_<carte>.jpg.
// usage : node catalogue.mjs <carte> [qualité=2]
import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';
const dir = path.dirname(new URL(import.meta.url).pathname);
const id = process.argv[2] || 'cite', q = +(process.argv[3] ?? 2);
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const ctx = await browser.newContext({ viewport: { width: 640, height: 360 } });
await ctx.addInitScript((q) => { localStorage.setItem('sp_settings', JSON.stringify({ quality: q })); }, q);
const page = await ctx.newPage(); const errors = [];
page.on('pageerror', (e) => errors.push('[pageerror] ' + e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push('[console] ' + m.text().slice(0, 300)); });
await page.route('https://cdn.jsdelivr.net/npm/three@0.186.1/**', (route) => { const u = new URL(route.request().url()); route.fulfill({ path: path.join(dir, 'node_modules/three', u.pathname.replace('/npm/three@0.186.1/', '')), contentType: 'application/javascript' }); });
await page.route('https://cdn.jsdelivr.net/npm/n8ao@2.0.1/**', (route) => route.fulfill({ path: path.join(dir, 'node_modules/n8ao/dist/N8AO.js'), contentType: 'application/javascript' }));
await page.route('https://fonts.googleapis.com/**', (r) => r.fulfill({ body: '', contentType: 'text/css' }));
await page.route('https://fonts.gstatic.com/**', (r) => r.abort());
await page.goto((process.env.WEB || 'http://127.0.0.1:8088') + '/index.html#carte=' + id);
await page.waitForFunction(() => window.__spReady, null, { timeout: 600000 });
await page.evaluate(() => document.querySelector('#soloButton').click());
await page.waitForFunction(() => SP.ZREAL.state !== 'loading' && SP.ZREAL.state !== 'off', null, { timeout: 300000 });
await page.waitForTimeout(1000);
const res = await page.evaluate(async () => {
  const { G, P, R, ZREAL } = SP; P.hp = P.maxHp = 1e9; P.breathT = 1e9; G.breakT = 1e9; G.toSpawn = 0; for (const z of [...SP.ZOMBIES]) z.destroy();
  document.getElementById('hud').classList.add('hidden'); R.viewScene.visible = false;
  const M = SP.MAP, W = SP.MAPW(); let best = 0; for (let i = 0; i < M.edge.length; i++) if (M.edge[i] > M.edge[best] && !M.roof[i]) best = i;
  const cx = ((best % W) + 0.5) * 2 - 1.2, cz = (((best / W) | 0) + 0.5) * 2; P.pos.set(cx + 40, P.pos.y, cz + 40); // (joueur loin : l'infecté reste sur place)
  const man = await (await fetch('assets/zombies/manifest.json')).json();
  const ids = Object.keys(ZREAL.tpl).sort((a, b) => (man.chars[a].brute || man.chars[a].boss) - (man.chars[b].brute || man.chars[b].boss) || (man.chars[a].glow === false) - (man.chars[b].glow === false) || a.localeCompare(b));
  const TW = 300, TH = 360, cols = 3, rows = Math.ceil(ids.length / cols), mc = document.createElement('canvas'); mc.width = TW * 2 * cols; mc.height = TH * rows; const c2 = mc.getContext('2d');
  c2.fillStyle = '#111'; c2.fillRect(0, 0, mc.width, mc.height);
  const cv = R.renderer.domElement, list = ZREAL.list, br = ZREAL.brute, bo = ZREAL.boss, out = [];
  ids.forEach((mid, n) => {
    const t = ZREAL.tpl[mid], info = man.chars[mid], big = info.brute || info.boss;
    ZREAL.list = [t]; ZREAL.brute = ZREAL.boss = t;
    const zb = SP.spawnTestZombie(cx, cz, big ? 'brute' : 'walker'); zb.rise = 1; zb.state = 'move'; zb.yaw = 0;
    if (zb.real) { zb.holder.remove(zb.real.root); zb.real = null; } zb.variant = 0; zb.useReal();
    for (let i = 0; i < 20; i++) { zb.vel.set(0, 0, 0.4); zb.think?.(1 / 30, G); zb.pos.set(cx, zb.pos.y, cz); zb.yaw = 0; zb.syncMesh(1 / 30); }
    // Milieu des yeux (repères posés sur l'os de la tête : suit la tête penchée).
    zb.holder.updateMatrixWorld(true); zb.eyes.geometry.computeBoundingSphere();
    const y = zb.pos.y, e = zb.eyes.geometry.boundingSphere.center.clone().applyMatrix4(zb.eyes.matrixWorld);
    const x0 = (n % cols) * TW * 2, y0 = ((n / cols) | 0) * TH;
    // En pied, puis gros plan du visage ; chaque vue recadrée au milieu de l'image.
    R.camera.position.set(cx + 0.3, y + 1.1 * zb.scale, cz + 2.15 * zb.scale); R.camera.lookAt(cx, y + 0.9 * zb.scale, cz); SP.renderFrame(1 / 30);
    c2.drawImage(cv, (cv.width - cv.width * TW / 640) / 2, 0, cv.width * TW / 640, cv.height, x0, y0, TW, TH);
    R.camera.position.set(e.x + 0.12, e.y - 0.1, e.z + 0.62 * zb.scale); R.camera.lookAt(e.x, e.y - 0.07, e.z); SP.renderFrame(1 / 30);
    c2.drawImage(cv, (cv.width - cv.width * TW / 640) / 2, 0, cv.width * TW / 640, cv.height, x0 + TW, y0, TW, TH);
    c2.strokeStyle = '#000'; c2.lineWidth = 4; c2.strokeRect(x0, y0, TW * 2, TH);
    c2.fillStyle = '#000c'; c2.fillRect(x0, y0, 250, 34); c2.fillStyle = '#ff0'; c2.font = 'bold 26px sans-serif';
    c2.fillText(`${n + 1}${info.boss ? ' (boss)' : info.brute ? ' (costaud)' : ''}`, x0 + 8, y0 + 26);
    out.push([n + 1, mid, info.boss ? 'boss' : info.brute ? 'costaud' : '', info.glow === false ? 'importé' : 'MakeHuman', (info.credit || '').split(',')[0]]);
    zb.destroy();
  });
  ZREAL.list = list; ZREAL.brute = br; ZREAL.boss = bo;
  return { out, url: mc.toDataURL('image/jpeg', 0.86) };
});
fs.mkdirSync(path.join(dir, 'shots'), { recursive: true });
fs.writeFileSync(path.join(dir, 'shots', `catalogue_${id}.jpg`), Buffer.from(res.url.split(',')[1], 'base64'));
for (const r of res.out) console.log(r.join(' | '));
console.log('ERRORS', errors.length); for (const e of errors.slice(0, 8)) console.log(e);
await browser.close();
