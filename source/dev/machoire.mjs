// Mâchoire des infectés réalistes : un infecté (modèle au choix) face à la caméra à 1,1 m, bouche fermée, à moitié et
// grande ouverte (hurlement), puis de trois quarts grande ouverte ; planche dans dev/shots/machoire_<modèle>.jpg.
// usage : node machoire.mjs [modèle=pe_a] [qualité=2] (la carte est celle de l'époque du modèle) ; GRIS=1 : forme seule
import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';
const dir = path.dirname(new URL(import.meta.url).pathname);
const mid = process.argv[2] || 'pe_a', q = +(process.argv[3] ?? 2);
const id = { p7: 'poste7', ci: 'cite', pe: 'penitencier', fi: 'filon' }[mid.slice(0, 2)];
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
await page.waitForFunction(() => SP.ZREAL.state !== 'loading' && SP.ZREAL.state !== 'off', null, { timeout: 120000 });
await page.waitForTimeout(1000);
const url = await page.evaluate(async ([mid, GRIS]) => {
  const { G, P, R, ZREAL } = SP; P.hp = P.maxHp = 1e9; P.breathT = 1e9; G.breakT = 1e9; G.toSpawn = 0; for (const z of [...SP.ZOMBIES]) z.destroy();
  document.getElementById('hud').classList.add('hidden'); R.viewScene.visible = false;
  P.pitch = 0.04; SP.updatePlayer(0.016);
  { const E = SP.M().env, L = R.lights, roofed = !!SP.MAP.roof[SP.tileOf(P.pos.z) * SP.MAPW() + SP.tileOf(P.pos.x)]; L.hemi.intensity = roofed ? E.hemiIn : E.hemiOut; R.scene.environmentIntensity = (roofed ? E.envIn : E.envOut) * (R.envK || 1); }
  const fx = -Math.sin(P.yaw), fz = -Math.cos(P.yaw), x = P.pos.x + fx * 1.1, z = P.pos.z + fz * 1.1;
  const zb = SP.spawnTestZombie(x, z, 'walker'); zb.rise = 1; zb.state = 'move'; zb.vel.set(0, 0, 0); zb.yaw = Math.atan2(P.pos.x - x, P.pos.z - z);
  const t = ZREAL.tpl[mid]; if (!t) return 'modèle absent : ' + mid + ' (état ' + ZREAL.state + ')';
  if (zb.real) { zb.holder.remove(zb.real.root); zb.real = null; } zb.variant = ZREAL.list.indexOf(t); zb.useReal();
  if (GRIS) zb.real.mesh.material = new SP.THREE.MeshStandardMaterial({ color: 0x9a9a9a, roughness: 0.7, side: SP.THREE.DoubleSide }); // (GRIS=1 : forme seule, sans la peinture)
  const cw = 640, ch = 360, mc = document.createElement('canvas'); mc.width = cw * 2; mc.height = ch * 2; const c2 = mc.getContext('2d');
  const pose = (s) => { for (let i = 0; i < 20; i++) { zb.screaming = s; zb.jawT = 1.4; zb.syncMesh(1 / 30); } };
  // Caméra à 0,9 m devant la tête, un peu en dessous, cadrée serrée (l'infecté se voûte à l'arrêt).
  const H = new SP.THREE.Vector3(), cam = (a) => { zb.holder.updateMatrixWorld(true); zb.real.bones.head.getWorldPosition(H); H.y += 0.06; const yw = zb.yaw + a; R.camera.position.set(H.x + Math.sin(yw) * 0.9, H.y - 0.12, H.z + Math.cos(yw) * 0.9); R.camera.lookAt(H); R.camera.fov = 24; R.camera.updateProjectionMatrix(); };
  const snap = (i, label, a = 0) => { cam(a); SP.renderFrame(1); c2.drawImage(R.renderer.domElement, (i % 2) * cw, ((i / 2) | 0) * ch, cw, ch); c2.fillStyle = '#000a'; c2.fillRect((i % 2) * cw, ((i / 2) | 0) * ch, 300, 22); c2.fillStyle = '#ff0'; c2.font = '15px monospace'; c2.fillText(label, (i % 2) * cw + 5, ((i / 2) | 0) * ch + 16); };
  pose(0); snap(0, mid + ' : fermée (0,1 rad)');
  pose(0.2); snap(1, 'moitié (0,45 rad)');
  pose(0.6); snap(2, 'grande ouverte (0,7 rad)');
  snap(3, 'trois quarts, grande ouverte', 0.9);
  return mc.toDataURL('image/jpeg', 0.85);
}, [mid, !!process.env.GRIS]);
if (!url.startsWith('data:')) { console.log(url); process.exit(1); }
fs.mkdirSync(path.join(dir, 'shots'), { recursive: true });
fs.writeFileSync(path.join(dir, 'shots', `machoire_${mid}${process.env.GRIS ? '_gris' : ''}.jpg`), Buffer.from(url.split(',')[1], 'base64'));
console.log('ERRORS', errors.length); for (const e of errors.slice(0, 10)) console.log(e);
await browser.close();
