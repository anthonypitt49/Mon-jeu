// Vues rapprochées des objets posés (meubles, véhicules, mobilier urbain) : une vue par sorte d'objet, 6 par planche.
// usage : node objets.mjs <carte> [qualité=2] [préfixe=objets] [sortes, ex. kSofa,kCar] ; env Q='nophoto' pour la version dessinée ;
// env FAM='foin,marbre' : une vue par famille de matière (OBJ_FAM), au lieu d'une par sorte d'objet.
// Les objets sont notés par KIT.g avec ?spots (06b_kit.js) ; caméra devant l'objet (son +z local), à hauteur d'œil.
import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';
const dir = path.dirname(new URL(import.meta.url).pathname);
const id = process.argv[2] || 'cite', q = +(process.argv[3] ?? 2), pre = process.argv[4] || 'objets', only = process.argv[5] ? process.argv[5].split(',') : null;
const fam = process.env.FAM ? process.env.FAM.split(',') : null; // FAM=foin,marbre : vues par famille de matière
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
await page.goto('http://127.0.0.1:8088/index.html?spots&' + (process.env.Q || '') + '#carte=' + id);
await page.waitForFunction(() => window.__spReady, null, { timeout: 180000 });
await page.waitForFunction(() => SP.PHOTO.state !== 'loading', null, { timeout: 400000, polling: 1000 }); // au menu : plus rapide qu'en pleine partie
await page.evaluate(() => document.querySelector('#soloButton').click());
await page.waitForTimeout(1500);
console.log('PHOTO', JSON.stringify(await page.evaluate(() => ({ state: SP.PHOTO.state, done: SP.PHOTO.done, lite: SP.PHOTO.lite, err: SP.PHOTO.err }))));
// Une vue par sorte d'objet (la première posée), distance selon la taille.
const DIST = { kCar: 5.5, kBus: 11, kTruck: 9, kLampPost: 4, kSwing: 4, kPicnic: 3.2, kBed: 3, kSofa: 3, kCounter: 3.2, kShelf: 3, kBookcase: 3, kPool: 4, kClothesline: 4, laiton: 1.2, marbre: 1.8 };
const spots = await page.evaluate(([only, fam, DIST]) => {
  const { G, P, R } = SP; P.hp = P.maxHp = 1e9; G.breakT = 1e9; G.toSpawn = 0; for (const z of [...SP.ZOMBIES]) z.destroy();
  R.viewScene.visible = false; document.getElementById('hud').classList.add('hidden');
  const seen = new Map();
  if (fam) { // FAM=foin,marbre : une vue par famille de matière (OBJ_FAM), devant une face verticale d'un objet qui la porte
    const v = new SP.THREE.Vector3(), n = new SP.THREE.Vector3(), m4 = new SP.THREE.Matrix4(), m3 = new SP.THREE.Matrix3();
    R.scene.updateMatrixWorld(true); const fall = {};
    for (const f of fam) R.scene.traverse((o) => {
      if (seen.has(f) || !o.geometry?.attributes.normal || ![].concat(o.material).some((m) => m?.userData.ftex === f)) return;
      const P = o.geometry.attributes.position, N = o.geometry.attributes.normal, d = DIST[f] || 2.3;
      m4.copy(o.matrixWorld); if (o.isInstancedMesh) { const mi = new SP.THREE.Matrix4(); o.getMatrixAt(0, mi); m4.multiply(mi); }
      m3.getNormalMatrix(m4);
      // face presque verticale dont le devant est un endroit où le joueur peut se tenir (pas le côté du mur)
      for (let i = 0, step = Math.max(1, (N.count / 400) | 0); i < N.count && !seen.has(f); i += step) {
        n.fromBufferAttribute(N, i).applyMatrix3(m3).normalize(); if (Math.abs(n.y) > 0.5) continue;
        v.fromBufferAttribute(P, i).applyMatrix4(m4); const ry = Math.atan2(n.x, n.z);
        const spot = { x: v.x, z: v.z, ry, y: 0, fn: f };
        if (SP.FLOWD(v.x + Math.sin(ry) * d, v.z + Math.cos(ry) * d) >= 0) seen.set(f, spot); else fall[f] ||= spot;
      }
    });
    for (const f of fam) if (!seen.has(f) && fall[f]) seen.set(f, fall[f]); // (rien d'accessible : première face venue)
    return [...seen.values()];
  }
  for (const s of SP.KIT.spots || []) { if (!s.fn || seen.has(s.fn) || /kGable|kChimney|kAntenna|kFrame|kCeilLamp|kRug|kSign/.test(s.fn)) continue; if (only && !only.includes(s.fn)) continue; seen.set(s.fn, s); }
  return [...seen.values()];
}, [only, fam, DIST]);
console.log('sortes', spots.length, spots.map((s) => `${s.fn}@${s.x.toFixed(1)},${s.z.toFixed(1)}`).join(' '));
fs.mkdirSync(path.join(dir, 'shots'), { recursive: true });
for (let k = 0; k < spots.length; k += 6) {
  const url = await page.evaluate(([list, DIST]) => {
    const { P, R } = SP; const cw = 640, ch = 360, mc = document.createElement('canvas'); mc.width = cw * 3; mc.height = ch * 2; const c2 = mc.getContext('2d');
    list.forEach((s, i) => {
      const d = DIST[s.fn] || 2.3, cx = s.x + Math.sin(s.ry) * d, cz = s.z + Math.cos(s.ry) * d;
      SP.G.mode = 'playing'; P.pos.set(cx, s.y || 0, cz); P.vel.set(0, 0, 0); P.yaw = s.ry; P.pitch = -Math.atan2(1.1, d) * 0.8; SP.updatePlayer(0.016); P.pos.set(cx, P.pos.y, cz); SP.updatePlayer(0.016);
      SP.renderFrame(1); c2.drawImage(R.renderer.domElement, (i % 3) * cw, ((i / 3) | 0) * ch, cw, ch);
      c2.fillStyle = '#000a'; c2.fillRect((i % 3) * cw, ((i / 3) | 0) * ch, 170, 22); c2.fillStyle = '#ff0'; c2.font = '15px monospace'; c2.fillText(s.fn, (i % 3) * cw + 5, ((i / 3) | 0) * ch + 16);
    });
    return mc.toDataURL('image/jpeg', 0.85);
  }, [spots.slice(k, k + 6), DIST]);
  const f = path.join(dir, 'shots', `${pre}_${id}_${k / 6}.jpg`);
  fs.writeFileSync(f, Buffer.from(url.split(',')[1], 'base64')); console.log('→', path.relative(dir, f));
}
console.log('ERRORS', errors.length); for (const e of errors.slice(0, 10)) console.log(e);
await browser.close();
