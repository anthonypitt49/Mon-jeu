// Échantillons des matières d'objets (familles OBJ_FAM) sous l'éclairage d'une carte : pour chaque famille, un cube
// de 0,6 m et un cylindre avec la vraie matière du jeu (photo comprise), posés devant la caméra ; 6 par planche.
// usage : node matieres.mjs <carte> [qualité=2] [familles, ex. foin,marbre] ; env Q='nophoto' pour la version dessinée.
import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';
const dir = path.dirname(new URL(import.meta.url).pathname);
const id = process.argv[2] || 'cite', q = +(process.argv[3] ?? 2), only = process.argv[4] ? process.argv[4].split(',') : null;
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
await ctx.addInitScript((q) => { localStorage.setItem('sp_settings', JSON.stringify({ quality: q })); }, q);
const page = await ctx.newPage(); const errors = [];
page.on('pageerror', (e) => errors.push('[pageerror] ' + e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push('[console] ' + m.text().slice(0, 300)); });
await page.route('https://cdn.jsdelivr.net/npm/three@0.186.1/**', (route) => { const u = new URL(route.request().url()); route.fulfill({ path: path.join(dir, 'node_modules/three', u.pathname.replace('/npm/three@0.186.1/', '')), contentType: 'application/javascript' }); });
await page.route('https://cdn.jsdelivr.net/npm/n8ao@2.0.1/**', (route) => route.fulfill({ path: path.join(dir, 'node_modules/n8ao/dist/N8AO.js'), contentType: 'application/javascript' }));
await page.route('https://fonts.googleapis.com/**', (r) => r.fulfill({ body: '', contentType: 'text/css' }));
await page.route('https://fonts.gstatic.com/**', (r) => r.abort());
await page.goto('http://127.0.0.1:8088/index.html?' + (process.env.Q || '') + '#carte=' + id);
await page.waitForFunction(() => window.__spReady, null, { timeout: 180000 });
await page.waitForFunction(() => SP.PHOTO.state !== 'loading', null, { timeout: 400000, polling: 1000 }); // au menu : plus rapide qu'en pleine partie
await page.evaluate(() => document.querySelector('#soloButton').click());
await page.waitForTimeout(1500);
// Une matière par famille présente sur la carte (la première trouvée dans la scène).
const fams = await page.evaluate((only) => {
  const { G, P, R } = SP; P.hp = P.maxHp = 1e9; G.breakT = 1e9; G.toSpawn = 0; for (const z of [...SP.ZOMBIES]) z.destroy();
  R.viewScene.visible = false; document.getElementById('hud').classList.add('hidden');
  const found = new Map();
  R.scene.traverse((o) => { for (const m of [].concat(o.material || [])) { const f = m?.userData.ftex; if (f && !found.has(f) && (!only || only.includes(f)) && SP.PHOTO_SETS[SP.MAP_ID()]?.[f]?.set?.startsWith('objets/')) found.set(f, m); } });
  window.__fam = found; return [...found.keys()];
}, only);
console.log('familles', fams.length, fams.join(' '));
fs.mkdirSync(path.join(dir, 'shots'), { recursive: true });
for (let k = 0; k < fams.length; k += 6) {
  const url = await page.evaluate((list) => {
    const { P, R, THREE } = SP; const cw = 640, ch = 360, mc = document.createElement('canvas'); mc.width = cw * 3; mc.height = ch * 2; const c2 = mc.getContext('2d');
    SP.G.mode = 'playing'; P.vel.set(0, 0, 0); P.pitch = -0.32; SP.updatePlayer(0.016);
    const fx = -Math.sin(P.yaw), fz = -Math.cos(P.yaw), y0 = P.pos.y;
    list.forEach((f, i) => {
      const m = window.__fam.get(f), g = new THREE.Group();
      const geos = [new THREE.BoxGeometry(0.6, 0.6, 0.6), new THREE.CylinderGeometry(0.3, 0.3, 0.8, 24)];
      if (m.vertexColors) for (const q of geos) q.setAttribute('color', new THREE.Float32BufferAttribute(new Array(q.attributes.position.count * 3).fill(1), 3)); // (sinon, sommets noirs)
      const box = new THREE.Mesh(geos[0], m), cyl = new THREE.Mesh(geos[1], m);
      box.position.set(-0.45, 0.3, 0); box.rotation.y = 0.6; cyl.position.set(0.45, 0.4, 0); g.add(box, cyl);
      g.position.set(P.pos.x + fx * 1.9, y0, P.pos.z + fz * 1.9); // (P.pos : les pieds) g.rotation.y = P.yaw;
      SP.meterize(g); R.scene.add(g);
      SP.renderFrame(1); c2.drawImage(R.renderer.domElement, (i % 3) * cw, ((i / 3) | 0) * ch, cw, ch);
      R.scene.remove(g);
      c2.fillStyle = '#000a'; c2.fillRect((i % 3) * cw, ((i / 3) | 0) * ch, 170, 22); c2.fillStyle = '#ff0'; c2.font = '15px monospace'; c2.fillText(f, (i % 3) * cw + 5, ((i / 3) | 0) * ch + 16);
    });
    return mc.toDataURL('image/jpeg', 0.85);
  }, fams.slice(k, k + 6));
  const f = path.join(dir, 'shots', `matieres_${id}_${k / 6}.jpg`);
  fs.writeFileSync(f, Buffer.from(url.split(',')[1], 'base64')); console.log('→', path.relative(dir, f));
}
console.log('ERRORS', errors.length); for (const e of errors.slice(0, 10)) console.log(e);
await browser.close();
