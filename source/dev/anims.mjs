// Animations des infectés vues de profil : quatre infectés sur place (marche, marche rapide, course, sprint) et un qui
// attaque, pose recalculée sans les déplacer ; planche de 6 instants dans dev/shots/anims_<carte>.jpg.
// usage : node anims.mjs <carte> [qualité=2] ; env NOANIM=1 : animation procédurale (comparaison) ; FRONT=1 : tous de face ;
// GAITS=1 : les cinq démarches des marcheurs (Quaternius, 100STYLE Zombie, Drunk, DragLeftLeg, course zombie) à leur vitesse ;
// MODELE=<id> : tous avec ce modèle réaliste (essai d'un modèle importé), MODELE=a,b,c,d,e : un par infecté ;
// OUVERT=1 : à l'endroit le plus dégagé.
import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';
const dir = path.dirname(new URL(import.meta.url).pathname);
const id = process.argv[2] || 'penitencier', q = +(process.argv[3] ?? 2), pre = (process.env.NOANIM ? 'anims_proc' : 'anims') + (process.env.GAITS ? '_demarches' : '') + (process.env.MODELE ? '_' + process.env.MODELE : '') + (process.env.FRONT ? '_face' : '');
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
await page.goto((process.env.WEB || 'http://127.0.0.1:8088') + '/index.html?' + (process.env.NOANIM ? 'noanim' : '') + '#carte=' + id);
await page.waitForFunction(() => window.__spReady, null, { timeout: 240000 });
await page.evaluate(() => document.querySelector('#soloButton').click());
if (process.env.MODELE) await page.waitForFunction(() => SP.ZREAL.state !== 'loading' && SP.ZREAL.state !== 'off', null, { timeout: 120000 });
await page.waitForTimeout(1500);
const url = await page.evaluate(async ([FRONT, GAITS, MODELE, OUVERT]) => {
  const { G, P, R } = SP; P.hp = P.maxHp = 1e9; P.breathT = 1e9; G.breakT = 1e9; G.toSpawn = 0; for (const z of [...SP.ZOMBIES]) z.destroy();
  document.getElementById('hud').classList.add('hidden'); R.viewScene.visible = false; P.pitch = -0.08;
  if (OUVERT) { // (OUVERT=1 : au milieu de l'endroit le plus dégagé de la carte, loin des murs)
    const M = SP.MAP, W = SP.MAPW(); let best = 0; for (let i = 0; i < M.edge.length; i++) if (M.edge[i] > M.edge[best] && !M.roof[i]) best = i;
    const t = 2.0, cx = ((best % W) + 0.5) * t, cz = (((best / W) | 0) + 0.5) * t; P.yaw = 0; P.pos.set(cx, SP.groundAt(cx, cz + 3.1) , cz + 3.1);
  }
  SP.updatePlayer(0.016);
  const fx = -Math.sin(P.yaw), fz = -Math.cos(P.yaw), rx = Math.cos(P.yaw), rz = -Math.sin(P.yaw);
  // [sorte, vitesse imposée, décalage latéral] : de profil, la tête vers la droite de l'image.
  const set = GAITS ? [['walk', 1, 0.9], ['zwalk', 0.72, 0], ['drunk', 1, 0.5], ['drag', 0.66, 0.8], ['zrun', 1, 0]].map((g, i) => ['walker', 1.05 * g[1], -1.8 + i * 0.9, g])
    : [['walker', 1.1, -1.8], ['jogger', 2.3, -0.9], ['runner', 3.9, 0], ['sprinter', 7.0, 0.9], ['walker', 0, 1.8]];
  let zsIdx = 0;
  const zs = set.map(([k, v, s, g]) => { const x = P.pos.x + fx * 3.1 + rx * s, z = P.pos.z + fz * 3.1 + rz * s; const zb = SP.spawnTestZombie(x, z, k); zb.yaw = P.yaw - Math.PI / 2; zb.rise = 1; zb.state = 'move'; zb.v = v;
    if (g) { zb.gait = [g[0], 0, g[1], g[2]]; zb.speed = v; }
    const ML = MODELE.split(','), mid = ML.length > 1 ? ML[zsIdx++ % ML.length] : MODELE; // (MODELE=a,b,c : un modèle par infecté)
    if (mid && SP.ZREAL.tpl[mid]) { const MODELE = mid; const t = SP.ZREAL.tpl[MODELE]; if (zb.real) { zb.holder.remove(zb.real.root); zb.real = null; } zb.variant = SP.ZREAL.list.indexOf(t); zb.useReal(); } // (MODELE=id : tous avec ce modèle)
    return zb; });
  const atk = GAITS ? null : zs[4]; if (atk) atk.yaw = P.yaw; // (l'attaquant face à la caméra : il regarde vers (sin yaw, cos yaw))
  if (FRONT) for (const z of zs) z.yaw = P.yaw; // (FRONT=1 : tous de face)
  const step = (dt) => { for (const z of zs) { const yw = z.yaw; z.vel.set(Math.sin(yw) * z.v, 0, Math.cos(yw) * z.v); if (z === atk) { z.state = 'attack'; z.attackT = (z.attackT + dt) % 1; } z.syncMesh(dt); } };
  for (let i = 0; i < 30; i++) step(1 / 30);
  const cw = 640, ch = 360, mc = document.createElement('canvas'); mc.width = cw * 3; mc.height = ch * 2; const c2 = mc.getContext('2d');
  for (let k = 0; k < 6; k++) {
    if (k) for (let i = 0; i < 5; i++) step(1 / 30);
    SP.renderFrame(1); c2.drawImage(R.renderer.domElement, (k % 3) * cw, ((k / 3) | 0) * ch, cw, ch);
    c2.fillStyle = '#000a'; c2.fillRect((k % 3) * cw, ((k / 3) | 0) * ch, 470, 22); c2.fillStyle = '#ff0'; c2.font = '14px monospace';
    c2.fillText(`t=${(k / 6).toFixed(2)} s · ` + (GAITS ? 'quaternius · zombie · ivre · traîne · course z.' : 'marche · rapide · course · sprint · attaque'), (k % 3) * cw + 5, ((k / 3) | 0) * ch + 16);
  }
  return mc.toDataURL('image/jpeg', 0.85);
}, [!!process.env.FRONT, !!process.env.GAITS, process.env.MODELE || '', !!process.env.OUVERT]);
fs.mkdirSync(path.join(dir, 'shots'), { recursive: true });
fs.writeFileSync(path.join(dir, 'shots', `${pre}_${id}.jpg`), Buffer.from(url.split(',')[1], 'base64'));
console.log('ERRORS', errors.length); for (const e of errors.slice(0, 10)) console.log(e);
await browser.close();
