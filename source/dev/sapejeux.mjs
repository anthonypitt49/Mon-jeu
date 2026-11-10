// Poste 7, la Sape : camouflet (exploseur en haut de la descente) et wagonnet (descente jusqu'à la carrière), joués en solo.
// On vérifie que le camouflet tue les infectés de la galerie et épargne ceux de la carrière, que le wagonnet emmène le
// joueur jusqu'au heurtoir en fauchant ceux de la voie, puis remonte à vide. Captures : shots/sapejeux_*.png.
// usage : node sapejeux.mjs
import { chromium } from 'playwright';
import path from 'path';
const dir = path.dirname(new URL(import.meta.url).pathname);
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const ctx = await browser.newContext({ viewport: { width: 900, height: 506 } });
await ctx.addInitScript(() => { localStorage.setItem('sp_settings', JSON.stringify({ quality: 1 })); });
const page = await ctx.newPage(); const errors = [];
page.on('pageerror', (e) => errors.push('[pageerror] ' + e.message + '\n' + (e.stack || '').slice(0, 500)));
page.on('console', (m) => { if (m.type() === 'error' && !/favicon|Failed to load resource/.test(m.text())) errors.push('[console] ' + m.text().slice(0, 300)); });
await page.route('https://cdn.jsdelivr.net/npm/three@0.186.1/**', (route) => { const u = new URL(route.request().url()); route.fulfill({ path: path.join(dir, 'node_modules/three', u.pathname.replace('/npm/three@0.186.1/', '')), contentType: 'application/javascript' }); });
await page.route('https://cdn.jsdelivr.net/npm/n8ao@2.0.1/**', (route) => route.fulfill({ path: path.join(dir, 'node_modules/n8ao/dist/N8AO.js'), contentType: 'application/javascript' }));
await page.route('https://fonts.googleapis.com/**', (r) => r.fulfill({ body: '', contentType: 'text/css' }));
await page.route('https://fonts.gstatic.com/**', (r) => r.abort());
await page.goto((process.env.WEB || 'http://127.0.0.1:8088') + '/index.html?nozreal#carte=poste7', { timeout: 300000 });
await page.waitForFunction(() => window.__spReady, null, { timeout: 400000 });
await page.evaluate(() => document.getElementById('soloButton').click());
await page.waitForTimeout(500);
const ev = (f, a) => page.evaluate(f, a); const log = (...a) => console.log(...a);
const shot = async (n, cam) => { await ev((cam) => { if (cam) { SP.P.yaw = cam[0]; SP.P.pitch = cam[1]; } SP.renderFrame(performance.now() / 1000); }, cam); await page.screenshot({ path: path.join(dir, 'shots', 'sapejeux_' + n + '.png'), timeout: 180000 }); };
// Portes ouvertes, points, pas de manche qui avance ; le joueur invincible.
await ev(() => { const { G, P, MAP } = SP; P.hp = P.maxHp = 1e9; G.me().points = 90000; for (const d of MAP.doors) if (!d.open) G.applyEvent('door', { id: d.id }); G.breakT = 1e9; G.toSpawn = 0; for (const z of [...SP.ZOMBIES]) z.destroy(); SP.sim(0.5); P.torch = false; });
const spawn = (list) => ev((list) => list.map(([x, z]) => { const zb = SP.spawnTestZombie(x, z); zb.hp = 150; zb.speed = 0; return zb.id; }), list);
const alive = (ids) => ev((ids) => ids.map((id) => { const z = SP.ZOMBIES.find((q) => q.id === id); return z && z.alive ? `${z.pos.x.toFixed(1)},${z.pos.y.toFixed(2)},${z.pos.z.toFixed(1)}` : 'mort'; }), ids);
const act = (x, z) => ev(([x, z]) => { const { P, INPUT } = SP; P.pos.set(x, SP.groundAt(x, z), z); P.vel.set(0, 0, 0); SP.sim(0.1); const prompt = document.getElementById('prompt').textContent; INPUT.interactPressed = true; SP.sim(0.1); return prompt; }, [x, z]);
const hold = (s) => ev((s) => { for (let t = 0; t < s; t += 0.1) { SP.ZOMBIES.forEach((z) => { if (z.alive) z.speed = 0; }); SP.sim(0.1); } }, s);

// 1. Camouflet : trois infectés dans la galerie (descente, galerie ouest), un dans la carrière.
let ids = await spawn([[63, 66], [63, 70.5], [57, 73], [52, 73], [44, 75.5]]);
await hold(0.6); log('avant', JSON.stringify(await alive(ids)));
log('exploseur :', await act(62.95, 61.2), '· points', await ev(() => SP.G.me().points));
await shot('01_camouflet', [-Math.PI / 2 + 0.3, -0.25]);
await hold(1.2); log('après 1,3 s', JSON.stringify(await alive(ids)), '· recharge', await ev(() => Math.round(SP.SJ?.cam.cool ?? -1)));
await hold(0.3); await shot('02_souffle', [Math.PI, -0.1]);
log('exploseur en recharge :', await act(62.95, 61.2));
await ev(() => { for (const z of [...SP.ZOMBIES]) z.destroy(); });

// 2. Wagonnet : deux infectés sur la voie, un à côté (hors voie, dans la carrière).
ids = await spawn([[63, 68.5], [55, 73], [44.5, 70.5]]);
await hold(0.4);
log('wagonnet :', await act(63, 61.6), '· trajet', await ev(() => [SP.SJ.wag.state, !!SP.P.ride]));
const track = [];
for (let k = 0; k < 75; k++) {
  const r = await ev(() => { SP.sim(0.1); return [SP.SJ.wag.t.toFixed(1), SP.P.pos.x.toFixed(2), SP.P.pos.y.toFixed(2), SP.P.pos.z.toFixed(2), !!SP.P.ride, SP.P.crouch.toFixed(2)]; });
  if (k % 6 === 0) track.push(r.join(' '));
  if (k === 17) await shot('03_descente', [Math.PI, -0.15]);
  if (k === 42) await shot('04_galerie', [Math.PI / 2, -0.08]);
}
log('trajet (t x y z en selle accroupi) :\n  ' + track.join('\n  '));
log('infectés', JSON.stringify(await alive(ids)), '· arrivée', await ev(() => [SP.SJ.wag.state, SP.P.pos.x.toFixed(2), SP.P.pos.z.toFixed(2), SP.groundAt(SP.P.pos.x, SP.P.pos.z).toFixed(2), SP.P.pos.y.toFixed(2)]));
await shot('05_arrivee', [-Math.PI / 2 - 0.4, -0.1]);
log('remonter tout de suite :', await act(63, 61.6));
await hold(16); log('retour', await ev(() => [SP.SJ.wag.state, SP.WORLD.sjWag.position.toArray().map((v) => +v.toFixed(2)).join()]));
log('ERRORS', errors.length); for (const e of errors.slice(0, 10)) log(e);
await browser.close();
