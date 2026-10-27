// Soldats joués (09e_soldats.js) : un coéquipier factice par modèle de assets/soldats, arme en main, face à la caméra,
// à l'arrêt, en marche et accroupi, plus les bras en vue subjective du joueur. Planche dans dev/shots/soldats.jpg.
// usage : node soldats.mjs [carte=cite] [qualité=2]
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
page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errors.push('[console] ' + m.text().slice(0, 300)); });
await page.route('https://cdn.jsdelivr.net/npm/three@0.186.1/**', (route) => { const u = new URL(route.request().url()); route.fulfill({ path: path.join(dir, 'node_modules/three', u.pathname.replace('/npm/three@0.186.1/', '')), contentType: 'application/javascript' }); });
await page.route('https://cdn.jsdelivr.net/npm/n8ao@2.0.1/**', (route) => route.fulfill({ path: path.join(dir, 'node_modules/n8ao/dist/N8AO.js'), contentType: 'application/javascript' }));
await page.route('https://fonts.googleapis.com/**', (r) => r.fulfill({ body: '', contentType: 'text/css' }));
await page.route('https://fonts.gstatic.com/**', (r) => r.abort());
await page.goto((process.env.WEB || 'http://127.0.0.1:8088') + '/index.html#carte=' + id);
await page.waitForFunction(() => window.__spReady, null, { timeout: 240000 });
await page.evaluate(() => document.querySelector('#soloButton').click());
await page.waitForTimeout(1500);
const n = await page.evaluate(() => {
  const { G, P } = SP; P.hp = P.maxHp = 1e9; G.breakT = 1e9; G.toSpawn = 0; for (const z of [...SP.ZOMBIES]) z.destroy();
  const keys = Object.keys(SP.WEAPONS).filter((k) => k !== 'pistol' && k !== 'knife');
  return SP.SOLDATS.map((s, i) => { const r = G.addPlayer('essai' + i, 'SOLDAT ' + (i + 1), false); r.soldier = i; r.weaponKey = keys[(i * 3) % keys.length]; return s[0]; }).length;
});
const t0 = Date.now();
await page.waitForFunction(() => SP.SREAL.state !== 'loading' && SP.SREAL.state !== 'off', null, { timeout: 120000 });
const loadMs = Date.now() - t0;
const res = await page.evaluate(async ([process_env_profil, process_env_bras]) => {
  const { G, P, R, THREE } = SP; document.getElementById('hud').classList.add('hidden');
  const out = { state: SP.SREAL.state, err: SP.SREAL.err, tpl: Object.keys(SP.SREAL.tpl) };
  const M = SP.MAP, W = SP.MAPW(); let best = 0; for (let i = 0; i < M.edge.length; i++) if (M.edge[i] > M.edge[best] && !M.roof[i]) best = i; // (case la plus dégagée)
  const cx = ((best % W) + 0.5) * 2, cz = (((best / W) | 0) + 0.5) * 2; P.yaw = 0; P.pos.set(cx, SP.groundAt(cx, cz + 3.2), cz + 3.2); P.pitch = -0.05; SP.updatePlayer(0.016);
  const recs = [...G.players.values()].filter((r) => !r.isLocal);
  const cw = 640, ch = 360, mc = document.createElement('canvas'); mc.width = cw * 3; mc.height = ch * 2; const c2 = mc.getContext('2d');
  // Chaque soldat seul, face à la caméra (yaw du joueur : π = regard vers +z), à 3,2 m ; vue de trois quarts.
  const place = (r, x, z, yaw, flags = 0) => { r.pos.set(x, SP.groundAt(x, z), z); r.yaw = yaw; r.pitch = 0; r.flags = flags; r.net = null; };
  const shot = (i, label, view) => { R.viewScene.visible = !!view; SP.renderFrame(1 / 30); c2.drawImage(R.renderer.domElement, (i % 3) * cw, ((i / 3) | 0) * ch, cw, ch); c2.fillStyle = '#000a'; c2.fillRect((i % 3) * cw, ((i / 3) | 0) * ch, 330, 22); c2.fillStyle = '#ff0'; c2.font = '15px monospace'; c2.fillText(label, (i % 3) * cw + 5, ((i / 3) | 0) * ch + 16); };
  out.real = [];
  for (let i = 0; i < recs.length && i < 5; i++) {
    recs.forEach((r, j) => place(r, cx - 1.2 + (j === i ? 0 : 50), cz, Math.PI + 0.5));
    for (let k = 0; k < 10; k++) G.update(1 / 30);
    out.real.push(!!recs[i].avatar.real);
    const y = recs[i].pos.y; R.camera.position.set(cx - 0.4, y + 1.4, cz + 2.0); R.camera.lookAt(cx - 1.2, y + 1.0, cz);
    shot(i, (recs[i].avatar.real?.tpl.id || 'procédural') + ' / ' + recs[i].weaponKey);
  }
  if (process_env_profil) { // (PROFIL=1 : de profil, modèle réel puis corps procédural du même coéquipier)
    const r = recs[0], a = r.avatar; let k = 0;
    for (const real of [true, false]) for (const side of [1, -1]) {
      recs.forEach((q, j) => place(q, cx - 1.2 + (j === 0 ? 0 : 50), cz, Math.PI + 0.5)); for (let f = 0; f < 6; f++) G.update(1 / 30);
      a.real.root.visible = real; a.mesh.material = real ? SP.SR_HIDE : a.procMat;
      const y = r.pos.y; R.camera.position.set(cx - 1.2 + side * 2.2, y + 1.3, cz + 0.4); R.camera.lookAt(cx - 1.2, y + 1.1, cz);
      shot(k++, (real ? a.real.tpl.id : 'procédural') + (side > 0 ? ' gauche' : ' droite'));
    }
    a.real.root.visible = true; a.mesh.material = SP.SR_HIDE;
  }
  // Bras en vue subjective (couleurs du soldat 0 : celui du joueur en solo).
  SP.grantWeapon('carbine'); P.yaw = Math.PI; P.pitch = -0.1; SP.soldierArms(+(process_env_bras || 0)); R.viewScene.visible = true; for (let f = 0; f < 20; f++) SP.updatePlayer(1 / 30);
  shot(5, 'vue subjective (soldat ' + (+(process_env_bras || 0) + 1) + ')', true);
  out.url = mc.toDataURL('image/jpeg', 0.85); return out;
}, [!!process.env.PROFIL, process.env.BRAS]);
fs.mkdirSync(path.join(dir, 'shots'), { recursive: true });
fs.writeFileSync(path.join(dir, 'shots', 'soldats.jpg'), Buffer.from(res.url.split(',')[1], 'base64')); delete res.url;
console.log(JSON.stringify({ n, loadMs, ...res }));
console.log('ERRORS', errors.length); for (const e of errors.slice(0, 10)) console.log(e);
await browser.close();
