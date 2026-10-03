import { chromium } from 'playwright';
import path from 'path';
const dir = path.dirname(new URL(import.meta.url).pathname);
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await (await browser.newContext({ viewport: { width: 960, height: 540 } })).newPage(); const errors = []; page.on('pageerror', (e) => errors.push(e.message)); page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 200)); });
await page.addInitScript(() => localStorage.setItem('sp_settings', JSON.stringify({ quality: 2 })));
await page.route('https://cdn.jsdelivr.net/npm/three@0.186.1/**', (route) => { const u = new URL(route.request().url()); route.fulfill({ path: path.join(dir, 'node_modules/three', u.pathname.replace('/npm/three@0.186.1/', '')), contentType: 'application/javascript' }); });
await page.route('https://cdn.jsdelivr.net/npm/n8ao@2.0.1/**', (route) => route.fulfill({ path: path.join(dir, 'node_modules/n8ao/dist/N8AO.js'), contentType: 'application/javascript' }));
await page.route('https://fonts.googleapis.com/**', (r) => r.fulfill({ body: '', contentType: 'text/css' }));
await page.route('https://fonts.gstatic.com/**', (r) => r.abort());
await page.goto('http://127.0.0.1:8088/index.html'); await page.waitForFunction(() => window.__spReady, null, { timeout: 180000 });
await page.evaluate(() => document.getElementById('soloButton').click());
await page.waitForFunction(() => SP.PHOTO.state !== 'loading', null, { timeout: 240000 }); // photos du Poste 7 envoyées à la carte graphique (lent en rendu logiciel)
const log = (...a) => console.log(...a);
// Portes du cratère.
log('doors', await page.evaluate(() => { const { G, P, MAP } = SP; P.hp = P.maxHp = 1e9; SP.sim(0.5); G.me().points = 99999; const out = []; for (const d of MAP.doors.filter((q) => q.label === 'Le Cratère')) { P.pos.set(d.x * 2 + 1, 0, d.z * 2 + 1 + (d.z === 8 ? -1.2 : 1.2)); SP.sim(0.1); SP.INPUT.interactPressed = true; SP.sim(0.2); out.push(d.open); } return [out, MAP.zoneActive]; }));
// Vue du cratère.
for (const [x, z, yaw, name] of [[40, 26.5, -2.3, 'crater1'], [52, 38, 0.8, 'crater2']]) {
  await page.evaluate(([x, z, yaw]) => { SP.P.pos.set(x, 0, z); SP.P.yaw = yaw; SP.P.pitch = -0.08; SP.sim(0.3); SP.renderFrame(1); SP.renderFrame(2); }, [x, z, yaw]);
  await page.screenshot({ path: path.join(dir, `shots/91_${name}.png`) });
}
// Contournement de l'épave : infecté d'un côté, joueur de l'autre.
log('slide', await page.evaluate(() => { const { G, P } = SP; G.toSpawn = 0; G.breakT = 1e9; for (const z of [...SP.ZOMBIES]) z.destroy(); P.pos.set(45.5, 0, 36.5); const res = []; for (const [x, z] of [[45.5, 27], [42, 26.5], [49, 26.8]]) { const zb = SP.spawnTestZombie(x, z); zb.speed = 2.2; zb.rise = 1; zb.state = 'move'; let t = 0; for (; t < 20; t += 0.05) { G.update(0.05); P.pos.set(45.5, 0, 36.5); if (zb.pos.distanceTo(P.pos) < 1.6 || zb.state === 'attack') break; } res.push(+t.toFixed(1)); zb.destroy(); } return res; }));
// Mortier : achat, signalement sur un groupe d'infectés.
log('mortar', await page.evaluate(async () => { const { G, P } = SP; P.pos.set(52.5, 0, 27); P.yaw = -Math.PI / 2; SP.sim(0.2); const prompt = document.getElementById('prompt').textContent; SP.INPUT.interactPressed = true; SP.sim(0.1); const zs = []; for (let i = 0; i < 6; i++) { const z = SP.spawnTestZombie(44 + (i % 3), 26 + (i / 3 | 0)); z.hp = 900; z.rise = 1; zs.push(z); } for (const z of zs) z.updateHitboxes(); P.pos.set(52.5, 0, 34); P.yaw = Math.atan2(-(45 - 52.5), -(26.5 - 34)); P.pitch = -0.12; SP.sim(0.1); SP.pingNow(); const t0 = performance.now(); await new Promise((r) => setTimeout(r, 2800)); SP.sim(0.2); return { prompt, support: [SP.SUPPORT_T(), SP.G.me().points], dead: zs.filter((z) => !z.alive).length, hud: document.getElementById('powerups').textContent }; }));
// Givreux et Hurleur.
log('specials', await page.evaluate(() => { const { G, P } = SP; G.round = 14; G.zHp = G.roundParams(14).zHp; const kinds = {}; for (let i = 0; i < 400; i++) { const k = G.zombieKind(); kinds[k] = (kinds[k] || 0) + 1; }
  P.pos.set(46, 0, 38); P.hp = P.maxHp = 100; const f = new SP.Zombie({ x: 47.5, z: 38, y: 0, kind: 'frost', hp: 10, state: 'move', round: 14 }); f.rise = 1; SP.sim(0.1); G.applyDamage(f, 100, P.id, { dir: new SP.THREE.Vector3(1, 0, 0) }); SP.sim(0.1); const frost = [P.frostT.toFixed(1), P.hp, SP.G.frostSlow, document.getElementById('message').textContent];
  const s = new SP.Zombie({ x: 40, z: 30, y: 0, kind: 'screamer', hp: 5000, state: 'move', round: 14 }); s.rise = 1; const w = SP.spawnTestZombie(41, 31); w.rise = 1; P.pos.set(40, 0, 36); s.screamT = 0.01; SP.sim(0.3); return { kinds, frost, scream: [s.screaming?.toFixed(1), w.rage?.toFixed(1)], hint: document.getElementById('message').textContent }; }));
await page.evaluate(() => { SP.renderFrame(3); }); await page.screenshot({ path: path.join(dir, 'shots/92_specials.png') });
log('errors', errors);
await browser.close();
