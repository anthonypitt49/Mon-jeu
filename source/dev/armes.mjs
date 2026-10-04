// Planche de contrôle des armes : profil gauche, vue de trois quarts, en main (hanche) et en visée, pour chaque arme.
// usage : node armes.mjs [pistol,revolver,…,knife,nade] [up] → shots/armes_<arme>.png (up : version améliorée).
import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';
const dir = path.dirname(new URL(import.meta.url).pathname);
const keys = (process.argv[2] || 'pistol,revolver,bolt,sniper,shotgun,smg,carbine,ar,lmg,launcher,raygun,cryo').split(',');
const up = process.argv[3] === 'up';
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const ctx = await browser.newContext({ viewport: { width: 960, height: 540 } });
await ctx.addInitScript(() => localStorage.setItem('sp_settings', JSON.stringify({ quality: 2 })));
const page = await ctx.newPage(); const errors = [];
page.on('pageerror', (e) => errors.push('[pageerror] ' + e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push('[console] ' + m.text().slice(0, 300)); });
await page.route('https://cdn.jsdelivr.net/npm/three@0.186.1/**', (route) => { const u = new URL(route.request().url()); route.fulfill({ path: path.join(dir, 'node_modules/three', u.pathname.replace('/npm/three@0.186.1/', '')), contentType: 'application/javascript' }); });
await page.route('https://cdn.jsdelivr.net/npm/n8ao@2.0.1/**', (route) => route.fulfill({ path: path.join(dir, 'node_modules/n8ao/dist/N8AO.js'), contentType: 'application/javascript' }));
await page.route('https://fonts.googleapis.com/**', (r) => r.fulfill({ body: '', contentType: 'text/css' }));
await page.route('https://fonts.gstatic.com/**', (r) => r.abort());
await page.goto('http://127.0.0.1:8088/index.html#carte=poste7');
await page.waitForFunction(() => window.__spReady, null, { timeout: 180000 });
fs.mkdirSync(path.join(dir, 'shots'), { recursive: true });
for (const key of keys) {
  const res = await page.evaluate(({ key, up }) => {
    const { THREE, R } = SP, r = R.renderer, cvs = r.domElement, W = cvs.width, H = cvs.height, shots = [];
    // Couteau et grenade : mêmes vues (pas de ligne de visée propre).
    const build = key === 'knife' ? () => ({ root: SP.buildKnife(), sightY: 0.07, len: 0.3 }) : key === 'nade' ? () => ({ root: SP.buildGrenadeModel(true), sightY: 0.05, len: 0.1 }) : (h) => SP.buildGunModel(key, up, h);
    const lights = (s) => { s.add(new THREE.HemisphereLight(0x9fb6d4, 0x2b2622, 1.1)); const k = new THREE.DirectionalLight(0xb4ccff, 0.9); k.position.set(-1, 2, 1); s.add(k); s.environment = R.viewScene.environment; s.environmentIntensity = 1.3; };
    const shot = (scene, cam, bg) => { r.setRenderTarget(null); r.setClearColor(bg, 1); r.clear(); r.render(scene, cam); shots.push(cvs.toDataURL('image/png')); };
    const info = {};
    // 1. Profil gauche (orthographique), 2. trois quarts avant-gauche.
    { const s = new THREE.Scene(); lights(s); const parts = build(false), m = parts.root; s.add(m);
      const box = new THREE.Box3().setFromObject(m), c = box.getCenter(new THREE.Vector3()), sz = box.getSize(new THREE.Vector3());
      let n = 0; m.traverse((o) => { if (o.isMesh) n++; }); info.meshes = n; info.size = sz.toArray().map((v) => +v.toFixed(3)); info.sightY = parts.sightY; info.len = parts.len;
      const hh = Math.max(sz.y, sz.z * H / W) * 0.56, cam = new THREE.OrthographicCamera(-hh * W / H, hh * W / H, hh, -hh, 0.01, 10);
      cam.position.set(c.x - 2, c.y, c.z); cam.lookAt(c); shot(s, cam, 0x39424a);
      const p = new THREE.PerspectiveCamera(30, W / H, 0.01, 10), dist = Math.max(sz.z, sz.y) * 1.9; p.position.set(c.x - dist * 0.55, c.y + dist * 0.35, c.z - dist * 0.75); p.lookAt(c); shot(s, p, 0x39424a); }
    // 3. En main, à la hanche ; 4. en visée (mêmes positions que updateViewmodel).
    for (const ads of [false, true]) {
      const s = new THREE.Scene(); lights(s); const parts = build(true), m = parts.root; s.add(m); SP.clipViewmodel(m);
      if (!ads) m.position.set(0.17, -0.2 - (parts.sightY - 0.07) * 0.5, -0.4 + Math.max(0, parts.len - 0.5) * 0.25);
      else m.position.set(0, -parts.sightY, -0.26 + Math.max(0, parts.len - 0.5) * 0.12);
      if (!ads) { let n = 0; m.traverse((o) => { if (o.isMesh) n++; }); info.meshesHands = n; }
      const cam = new THREE.PerspectiveCamera(56, W / H, 0.01, 10); shot(s, cam, 0x56606a);
    }
    return { shots, info };
  }, { key, up });
  // Planche 2 × 2.
  const sheet = await page.evaluate(async (shots) => {
    const imgs = await Promise.all(shots.map((u) => new Promise((ok) => { const i = new Image(); i.onload = () => ok(i); i.src = u; })));
    const w = 640, h = 360, c = document.createElement('canvas'); c.width = w * 2; c.height = h * 2; const x = c.getContext('2d');
    imgs.forEach((im, i) => x.drawImage(im, (i % 2) * w, Math.floor(i / 2) * h, w, h));
    return c.toDataURL('image/png');
  }, res.shots);
  const f = path.join(dir, 'shots', `armes_${key}${up ? '_up' : ''}.png`);
  fs.writeFileSync(f, Buffer.from(sheet.split(',')[1], 'base64'));
  console.log(key, JSON.stringify(res.info), '→', path.relative(dir, f));
}
console.log('ERRORS:', errors.length); errors.slice(0, 10).forEach((e) => console.log(e));
await browser.close();
