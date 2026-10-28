// Poste 7, grande quête « Aube Blanche » (11b_quest.js + 11f_aube.js) jouée de bout en bout en solo : acte 1 abrégé,
// géophone, trois charges, tombes (20 âmes), plaque, puits, quatre chiffres, morse, mise à feu (60 s), le Sapeur, l'aube.
// Le joueur est déplacé à chaque poste et appuie (ou maintient) E comme en jeu ; les manches minimales sont forcées.
// Sortie : étape atteinte à chaque pas, textes affichés, captures dans shots/aube_*.png, erreurs de la page.
// usage : node aube.mjs
import { chromium } from 'playwright';
import path from 'path';
const dir = path.dirname(new URL(import.meta.url).pathname);
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const ctx = await browser.newContext({ viewport: { width: 900, height: 506 } });
await ctx.addInitScript(() => { localStorage.setItem('sp_settings', JSON.stringify({ quality: 1 })); });
const page = await ctx.newPage(); const errors = [];
page.on('pageerror', (e) => errors.push('[pageerror] ' + e.message + '\n' + (e.stack || '').slice(0, 500)));
page.on('console', (m) => { if (m.type() === 'error') errors.push('[console] ' + m.text().slice(0, 300)); });
await page.route('https://cdn.jsdelivr.net/npm/three@0.186.1/**', (route) => { const u = new URL(route.request().url()); route.fulfill({ path: path.join(dir, 'node_modules/three', u.pathname.replace('/npm/three@0.186.1/', '')), contentType: 'application/javascript' }); });
await page.route('https://fonts.googleapis.com/**', (r) => r.fulfill({ body: '', contentType: 'text/css' }));
await page.route('https://fonts.gstatic.com/**', (r) => r.abort());
await page.goto((process.env.WEB || 'http://127.0.0.1:8088') + '/index.html#carte=poste7');
await page.waitForFunction(() => window.__spReady, null, { timeout: 300000 });
await page.evaluate(() => document.getElementById('soloButton').click());
await page.waitForTimeout(500);
const ev = (f, a) => page.evaluate(f, a); const log = (...a) => console.log(...a);
const shot = async (n, cam) => { await ev((cam) => { if (cam) { SP.P.yaw = cam[0]; SP.P.pitch = cam[1]; } SP.sim(0.1); SP.renderFrame(performance.now() / 1000); }, cam); await page.screenshot({ path: path.join(dir, 'shots', 'aube_' + n + '.png'), timeout: 180000 }); };
// Se placer en (x, z), regarder vers yaw, appuyer sur E (ou maintenir `hold` secondes).
const act = (x, z, hold = 0) => ev(([x, z, hold]) => {
  const { P, INPUT } = SP; P.pos.set(x, SP.groundAt(x, z), z); P.vel.set(0, 0, 0);
  SP.sim(0.1); const prompt = document.getElementById('prompt').textContent;
  if (hold) { INPUT.interactHeld = true; for (let t = 0; t < hold; t += 0.1) { P.pos.x = x; P.pos.z = z; SP.sim(0.1); } INPUT.interactHeld = false; }
  else { INPUT.interactPressed = true; SP.sim(0.1); }
  SP.sim(0.1); return prompt;
}, [x, z, hold]);
const state = () => ev(() => { const Q = SP.QUEST; return `étape ${Q.stage} · objectif « ${document.getElementById('objectiveText')?.textContent} » · ${document.getElementById('objectiveSub')?.textContent || ''} · sous-titre « ${document.getElementById('subtitle')?.textContent.slice(0, 90)} »`; });
const A = await ev(() => SP.AUBE);

// Courant, portes ouvertes, acte 1 abrégé : lampes posées d'office, calibrage maintenu à la radio, fin du barrage.
await ev(() => {
  const { G, P, MAP } = SP; P.hp = P.maxHp = 1e9; G.me().points = 90000;
  for (const d of MAP.doors) if (!d.open) G.applyEvent('door', { id: d.id });
  G.applyEvent('power', {}); SP.sim(2); SP.G.emit('quest', { s: 4, sp: SP.QUEST.spots, tk: [1, 1, 1], c: 0 });
});
log('calibrage', await act(12.4, 28.6, 22), await ev(() => [SP.QUEST.stage, SP.QUEST.calib, SP.QUEST.hold]));
await ev(() => { Object.assign(SP.QUEST, { hold: 0.3, prevToSpawn: 0 }); SP.sim(1.5); });
log('barrage →', await state());
await ev(() => SP.sim(9)); log('  +9 s', await state());

// Acte 2 : géophone (tenir), puis trois charges.
log('géophone', await act(A.GEO[0], A.GEO[1] + 1.3, 1.5)); await shot('01_sape', [Math.PI, -0.05]);
log('  ', await act(A.GEO[0], A.GEO[1] + 1.3, 8)); log('  ', await state());
for (let i = 0; i < 3; i++) {
  log('charge', await act(A.PICK[0] + 1, A.PICK[1] + 1), await ev(() => SP.QUEST.carry.join()));
  const [x, z] = A.PLANT[i]; log('  pose', i, await act(x + 0.8, z + 0.8, 2.5), await ev(() => SP.QUEST.planted.join()));
}
log('  ', await state());

// Acte 3 : les tombes (manche 8), la plaque, le puits.
await ev(() => { SP.G.round = 8; });
await ev(() => { const { G, P, ZOMBIES } = SP; P.pos.set(26, 0, 70); for (const z of [...ZOMBIES]) z.destroy(); });
for (let k = 0; k < 20; k++) await ev((k) => { const { G, P } = SP; const z = SP.spawnTestZombie(27 + (k % 4), 69 + (k % 3)); z.hp = 0; G.killZombie(z, P.id, { dir: new SP.THREE.Vector3(0, 0, 1) }); SP.sim(0.15); }, k);
await ev(() => SP.sim(1.5)); await shot('02_tombes', [Math.PI / 2 + 0.3, -0.1]);
log('tombes', await state());
log('plaque', await act(A.TAG[0] + 1, A.TAG[1])); log('  ', await state());
log('puits', await act(A.WELL[0] + 1.2, A.WELL[1] + 0.8)); log('  ', await state(), 'code', await ev(() => SP.QUEST.code.join('')));

// Acte 4 : les chiffres, le morse (manche 11).
const marks = await ev(() => SP.AUBE.MARKS.map(([x, y, z, r]) => [x, z, r]));
log('murs derrière les chiffres', await ev(() => SP.WORLD.aubeMarks.map((m) => { const r = m.rotation.y, nx = Math.sin(r), nz = Math.cos(r), p = m.position; return [+p.x.toFixed(2), +p.y.toFixed(2), +p.z.toFixed(2), SP.solidAt(p.x - nx * 0.2, p.y, p.z - nz * 0.2) ? 'mur' : 'VIDE', SP.solidAt(p.x + nx * 0.3, p.y, p.z + nz * 0.3) ? 'BOUCHÉ' : 'libre'].join(' '); }).join(' | ')));
for (const [i, [x, z, r]] of marks.entries()) { const ox = -Math.sin(r) * 1.2, oz = -Math.cos(r) * 1.2; log('chiffre', i, await act(x - ox, z - oz)); if (i < 2) await shot('03_chiffre' + (i + 1), [r, 0]); }
log('  ', await state());
log('morse (manche 8)', await act(A.LAMP[0] - 1, A.LAMP[1] - 0.6, 1));
await ev(() => { SP.G.round = 11; });
log('morse', await act(A.LAMP[0] - 1, A.LAMP[1] - 0.6, 3)); await shot('04_morse', [-2.1, 0]);
log('  ', await act(A.LAMP[0] - 1, A.LAMP[1] - 0.6, 4.5)); log('  ', await state());
await page.waitForTimeout(2600); await ev(() => SP.sim(0.6)); await shot('05_fusees', [0.31, 0.3]);

// Finale : mise à feu (manche 13), le Sapeur, l'aube.
await ev(() => { SP.G.round = 13; });
log('exploseur', await act(A.DET[0] - 1, A.DET[1] - 1)); log('  ', await state());
await ev(() => { for (let t = 0; t < 30; t += 1) { SP.P.pos.set(42, SP.groundAt(42, 76), 76); SP.sim(1); } }); await shot('06_mise_a_feu', [Math.PI / 2, 0]);
log('  30 s', await state(), await ev(() => [SP.G.toSpawn, SP.ZOMBIES.filter((z) => z.alive).length]));
await ev(() => { for (let t = 0; t < 31; t += 1) { SP.P.pos.set(42, SP.groundAt(42, 76), 76); SP.sim(1); } });
log('  boum', await state(), await ev(() => SP.ZOMBIES.filter((z) => z.alive).length));
await ev(() => { SP.P.pos.set(46, SP.groundAt(46, 22), 22); SP.sim(5); });
const boss = await ev(() => { const b = SP.ZOMBIES.find((z) => z.id === SP.QUEST.bossId); return b && { kind: b.kind, hp: b.hp, x: +b.pos.x.toFixed(1), z: +b.pos.z.toFixed(1), y: +b.pos.y.toFixed(2), state: b.state }; });
log('Sapeur', JSON.stringify(boss), await state());
await page.waitForTimeout(3000); await ev(() => SP.sim(3)); await shot('07_sapeur', [Math.PI, -0.05]);
await ev(() => { SP.sim(6); }); log('  après 6 s', await ev(() => [SP.G.toSpawn, SP.ZOMBIES.filter((z) => z.alive).length, SP.P.hp]));
await ev(() => { const b = SP.ZOMBIES.find((z) => z.id === SP.QUEST.bossId); b.hp = 1; SP.G.hitZombie(b, 50, SP.P.id, { dir: new SP.THREE.Vector3(0, 0, 1), part: 'body' }); SP.sim(0.5); });
log('Sapeur abattu', await state(), await ev(() => [SP.G.me().points, [...SP.P.perks].join(), document.getElementById('bannerTitle')?.textContent]));
await ev(() => { SP.P.hp = SP.P.maxHp = 1e9; });
const calme = () => ev(() => { for (const z of [...SP.ZOMBIES]) z.destroy(); SP.G.toSpawn = 0; SP.G.breakT = 999; SP.P.hp = SP.P.maxHp = 1e9; SP.P.pos.set(62, 0, 14); });
await calme(); await ev(() => SP.sim(12)); await calme(); await page.waitForTimeout(2500); await shot('08_aube_mi', [-1.9, 0.12]);
await ev(() => SP.sim(16)); await calme(); await ev(() => SP.sim(1)); await page.waitForTimeout(2500); await shot('09_aube', [-1.9, 0.12]); await shot('09b_aube_ouest', [1.6, 0.1]);
log('aube', await ev(() => [SP.QUEST.dawn, SP.QUEST.done, SP.WEATHER.dim]));
// Nouvelle partie : la nuit revient.
await ev(() => { SP.G.reset?.(); SP.P.pos.set(62, 0, 14); SP.sim(0.5); }); await page.waitForTimeout(2500); await shot('10_nuit', [-1.9, 0.12]);
log('remise à zéro', await ev(() => [SP.QUEST.stage, SP.QUEST.dawn, SP.WEATHER.dim, SP.R.sky.material.uniforms.uZen.value.toArray().map((v) => +v.toFixed(3)).join()]));
log('ERRORS', errors.length); for (const e of errors.slice(0, 12)) log(e);
await browser.close();
