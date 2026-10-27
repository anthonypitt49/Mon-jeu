// Gore façon BO2 : un infecté réaliste à chapeau (p7_a par défaut) face à la caméra ; tir à la tête non mortel (le casque
// saute), tir au bras (arraché, une chance sur deux : on insiste), tir à la tête qui laisse ≤ 10 % (la tête éclate,
// éclats de chair), puis il marche sans tête jusqu'à mourir (20 %/s). Planche dans dev/shots/gore_<modèle>.jpg.
// usage : node gore.mjs [modèle=p7_a] [qualité=2]
import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';
const dir = path.dirname(new URL(import.meta.url).pathname);
const mid = process.argv[2] || 'p7_a', q = +(process.argv[3] ?? 2);
const id = { p7: 'poste7', ci: 'cite', pe: 'penitencier', fi: 'filon' }[mid.slice(0, 2)] || 'cite';
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
const res = await page.evaluate(async (mid) => {
  const { G, P, R, ZREAL, THREE } = SP; P.hp = P.maxHp = 1e9; P.breathT = 1e9; G.breakT = 1e9; G.toSpawn = 0; for (const z of [...SP.ZOMBIES]) z.destroy();
  document.getElementById('hud').classList.add('hidden'); R.viewScene.visible = false;
  const M = SP.MAP, W = SP.MAPW(); let best = 0; for (let i = 0; i < M.edge.length; i++) if (M.edge[i] > M.edge[best] && !M.roof[i]) best = i;
  const cx = ((best % W) + 0.5) * 2, cz = (((best / W) | 0) + 0.5) * 2; P.yaw = 0; P.pos.set(cx, SP.groundAt(cx, cz + 3.2), cz + 3.2); P.pitch = -0.05; SP.updatePlayer(0.016);
  const t = ZREAL.tpl[mid]; if (!t) return { err: 'modèle absent ' + mid };
  const zb = SP.spawnTestZombie(cx, cz, ZREAL.list.includes(t) ? 'walker' : 'brute'); zb.rise = 1; zb.state = 'move'; zb.yaw = 0; zb.maxHp = zb.hp = 1000;
  if (zb.real) { zb.holder.remove(zb.real.root); zb.real = null; } zb.variant = ZREAL.list.indexOf(t); zb.useReal();
  const dirv = new THREE.Vector3(0, 0, -1), out = { hat: !!zb.real.bones.hat };
  const cw = 640, ch = 360, mc = document.createElement('canvas'); mc.width = cw * 3; mc.height = ch * 2; const c2 = mc.getContext('2d');
  const step = (s) => { for (let i = 0; i < s * 30; i++) { zb.vel.set(0, 0, 0.4); zb.think?.(1 / 30, G); zb.syncMesh(1 / 30); SP.FX && 0; } };
  const C = new THREE.Vector3(), aim = () => { zb.holder.updateMatrixWorld(true); C.copy(zb.pos); const f = zb.yaw; R.camera.position.set(C.x + Math.sin(f) * 2.6 + 0.6, C.y + 1.55, C.z + Math.cos(f) * 2.6); R.camera.lookAt(C.x, C.y + 1.0, C.z); };
  const snap = (i, label) => { aim(); SP.renderFrame(1 / 30); c2.drawImage(R.renderer.domElement, (i % 3) * cw, ((i / 3) | 0) * ch, cw, ch); c2.fillStyle = '#000a'; c2.fillRect((i % 3) * cw, ((i / 3) | 0) * ch, 330, 22); c2.fillStyle = '#ff0'; c2.font = '15px monospace'; c2.fillText(label, (i % 3) * cw + 5, ((i / 3) | 0) * ch + 16); };
  const sim = (s) => SP.sim(s, 1 / 30);
  step(0.5); snap(0, mid + ' : avant');
  G.hitZombie(zb, 30, P.id, { head: true, dir: dirv, weapon: 'smg' }); out.hatOff = !!zb.hatOff; sim(0.35); snap(1, 'tir à la tête : le chapeau saute');
  let n = 0; while (!zb.severed?.size && n++ < 12) G.hitZombie(zb, 150, P.id, { bone: 7 /* (BN.uArmL) */, part: 'limb', dir: dirv, weapon: 'smg' });
  out.armTries = n; out.severed = [...(zb.severed || [])]; sim(0.4); snap(2, 'bras arraché (essais : ' + n + ')');
  zb.hp = zb.maxHp * 0.12; G.hitZombie(zb, zb.maxHp * 0.05, P.id, { head: true, dir: dirv, weapon: 'smg' }); out.headless = zb.headless; out.aliveAfterHead = zb.alive;
  sim(0.25); snap(3, 'la tête éclate : éclats de chair');
  sim(1.2); out.aliveAfter1s = zb.alive; snap(4, 'il marche sans tête');
  sim(6); out.deadAfter7s = !zb.alive; snap(5, 'mort au bout de quelques secondes');
  out.url = mc.toDataURL('image/jpeg', 0.85); return out;
}, mid);
if (res.err) { console.log(res.err); process.exit(1); }
fs.mkdirSync(path.join(dir, 'shots'), { recursive: true });
fs.writeFileSync(path.join(dir, 'shots', `gore_${mid}.jpg`), Buffer.from(res.url.split(',')[1], 'base64')); delete res.url;
console.log(JSON.stringify(res));
console.log('ERRORS', errors.length); for (const e of errors.slice(0, 10)) console.log(e);
await browser.close();
