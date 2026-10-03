// Co-op hôte + invité (relais local) : l'INVITÉ rétablit le courant et mène la mission de la carte pendant que l'hôte reste loin.
// À chaque étape, l'état est comparé des deux côtés. Usage : node coopmission.mjs cite|penitencier|filon
import { chromium } from 'playwright';
import path from 'path';
const dir = path.dirname(new URL(import.meta.url).pathname);
const MAPID = process.argv[2] || 'cite';
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--allow-loopback-in-peer-connection', '--disable-features=WebRtcHideLocalIpsWithMdns'] });
const mk = async (tag) => {
  const ctx = await browser.newContext({ viewport: { width: 640, height: 360 } });
  await ctx.addInitScript(() => { localStorage.setItem('sp_settings', JSON.stringify({ quality: 0 })); });
  const page = await ctx.newPage(); page.errors = [];
  page.on('pageerror', (e) => page.errors.push(`[${tag} pageerror] ` + e.message + '\n' + e.stack));
  page.on('console', (m) => { if (m.type() === 'error') page.errors.push(`[${tag} console] ` + m.text().slice(0, 300)); });
  await page.route('https://cdn.jsdelivr.net/npm/three@0.186.1/**', (route) => { const u = new URL(route.request().url()); route.fulfill({ path: path.join(dir, 'node_modules/three', u.pathname.replace('/npm/three@0.186.1/', '')), contentType: 'application/javascript' }); });
  await page.route('https://cdn.jsdelivr.net/npm/peerjs@1.5.5/**', (route) => route.fulfill({ path: path.join(dir, 'node_modules/peerjs/dist/peerjs.min.js'), contentType: 'application/javascript' }));
  await page.route('https://fonts.googleapis.com/**', (r) => r.fulfill({ body: '', contentType: 'text/css' }));
  await page.goto('http://127.0.0.1:8088/index.html?' + (process.env.Q || 'relay=ws://127.0.0.1:8883&nortc=1') + '#carte=' + MAPID);
  await page.waitForFunction(() => window.__spReady, null, { timeout: 120000 });
  return page;
};
const host = await mk('host'), guest = await mk('guest');
const log = (...a) => console.log(...a);
let bad = 0;
const ui = (page, name, codeVal) => page.evaluate(([n, c]) => { document.getElementById('joinButton').click(); document.getElementById('playerName').value = n; document.getElementById('sessionCode').value = c; document.getElementById('joinSubmit').click(); }, [name, codeVal]);
await ui(host, 'Hote', '');
await host.waitForFunction(() => SP.NET.active, null, { timeout: 40000 });
const code = await host.evaluate(() => SP.NET.code);
await ui(guest, 'Invite', code);
await host.waitForFunction(() => SP.NET.lobby.length === 2, null, { timeout: 40000 });
await host.evaluate(() => document.getElementById('startCoop').click());
await guest.waitForFunction(() => SP.G.mode === 'playing', null, { timeout: 40000 });
log('carte', MAPID, 'code', code, 'via', await guest.evaluate(() => SP.NET.via));
const gid = await guest.evaluate(() => SP.P.id);
const trace = () => { const N = SP.NET; window.__net = []; for (const f of ['lostHost', 'relayDown', 'becomeHost', 'stepDown', 'adoptHost', 'hostGone', 'nextCandidate', 'cancelMigration']) { const o = N[f].bind(N); N[f] = (...a) => { window.__net.push([((performance.now() / 1000) | 0) + 's', f, JSON.stringify(a).slice(0, 60), 'vt-hostVt=' + ((N.vt - N.hostVt) | 0)]); return o(...a); }; } };
await host.evaluate(trace); await guest.evaluate(trace);
// Pas de 0,25 s des deux côtés ; l'hôte abat les infectés proches de n'importe quel soldat (les soldats sont invulnérables).
const defKill = () => { window.killNear = (r = 6) => { for (const z of SP.ZOMBIES) if (z.alive && z.state !== 'rise' && !z.boss) for (const [, p] of SP.G.players) if (z.pos.distanceTo(p.pos) < r) { SP.G.applyDamage(z, 1e7, SP.P.id, { dir: new SP.THREE.Vector3(1, 0, 0) }); break; } }; };
await host.evaluate(defKill); await guest.evaluate(defKill);
const tick = async (sec, kill = true) => { for (let i = 0; i < sec * 4; i++) { await Promise.all([host.evaluate((k) => { SP.P.hp = SP.P.maxHp = 1e6; SP.sim(0.25); if (k && SP.G.authority) killNear(); }, kill), guest.evaluate((k) => { SP.P.hp = SP.P.maxHp = 1e6; SP.sim(0.25); if (k && SP.G.authority) killNear(); }, kill)]); await host.waitForTimeout(30); } };
const authPage = async () => ((await guest.evaluate(() => SP.G.authority)) ? guest : host);
const both = async (f) => [await host.evaluate(f), await guest.evaluate(f)];
const same = async (label, f) => { const [h, g] = await both(f); const ok = JSON.stringify(h) === JSON.stringify(g); if (!ok) bad++; log((ok ? 'OK   ' : 'ÉCART') + ' ' + label, JSON.stringify(h), ok ? '' : '≠ invité ' + JSON.stringify(g)); return [h, g]; };
const objG = () => guest.evaluate(() => { SP.UI.objective(); return ['objectiveTitle', 'objectiveText'].map((i) => document.getElementById(i).textContent).join(' | '); });
// L'invité se place et agit (l'action passe par l'hôte).
const gAt = (x, z) => guest.evaluate(([x, z]) => { SP.P.pos.set(x, 0, z); SP.P.vel.set(0, 0, 0); }, [x, z]);
const gAct = (kind, id) => guest.evaluate(([k, i]) => { const c = SP.INTERACT_CUR(); SP.G.interact(SP.P.id, k, i); return c ? c.kind : null; }, [kind, id]);
await host.evaluate((gid) => { SP.P.hp = SP.P.maxHp = 1e6; SP.G.me().points = 300000; SP.G.players.get(gid).points = 300000; }, gid);
await tick(3);
// Portes ouvertes par l'hôte ; il part ensuite loin, au point de départ.
for (let k = 0, n = await host.evaluate(() => SP.MAP.doors.length); k < n; k++) { await host.evaluate((k) => SP.G.interact(SP.P.id, 'door', SP.MAP.doors[k].id), k); await tick(0.5); }
await same('portes', () => SP.MAP.doors.map((d) => (d.open ? 1 : 0)).join(''));
await same('cachettes', () => SP.PWR.tiles.join(','));

/* ─── Courant : l'invité ramasse les trois pièces, installe, lance, défend seul ─── */
for (let i = 0; i < 3; i++) {
  const p = await guest.evaluate((i) => { const g = SP.WORLD.pwrParts[i].g; return [g.position.x, g.position.z, g.visible]; }, i);
  await gAt(p[0] - 0.3, p[1] + 0.2); await tick(0.5);
  const c = await gAct('ppart', i); await tick(0.75);
  log('  pièce', i, 'visible chez l\'invité', p[2], 'invite proposé', c);
}
await same('pièces', () => [SP.PWR.stage, SP.PWR.got.join('')]);
const gen = await guest.evaluate(() => { const g = SP.WORLD.power.pos, f = SP.WORLD.power.face; return [g.x - f[0] * 1.1, g.z - f[1] * 1.1]; });
await gAt(gen[0], gen[1]); await tick(0.5);
log('  installer :', await gAct('pinst')); await tick(0.75);
log('  lancer :', await gAct('pstart')); await tick(0.75);
await same('étape générateur', () => SP.PWR.stage);
log('  bandeau invité :', await objG());
// Défense : l'hôte loin, l'invité près (la position de l'invité vient du réseau chez l'hôte).
const far = await host.evaluate(() => { const s = SP.MAP.spots?.start; return null; });
for (let t = 0; t < 70; t += 2) { await gAt(gen[0], gen[1]); await tick(2); const r = await guest.evaluate(() => [SP.G.authority, SP.NET.migrating, +SP.PWR.prog.toFixed(0)]); if (r[0] || r[1]) log('  ! invité', t, JSON.stringify(r)); if (await host.evaluate(() => SP.G.power)) break; }
await same('courant', () => SP.G.power);
log('  rôles (hôte / invité)', JSON.stringify(await both(() => [SP.G.authority, SP.NET.isHost, SP.NET.hostId, SP.NET.epoch, SP.NET.migrating])));
log('  progression (hôte / invité)', JSON.stringify(await both(() => +SP.PWR.prog.toFixed(1))));

if (process.env.FREEZE) {
  // L'hôte se fige 12 s : l'invité reprend la partie, l'ancien hôte doit se ranger derrière lui à son retour.
  await host.evaluate(() => { const t = performance.now(); while (performance.now() - t < 12000) { /* figé */ } });
  for (let i = 0; i < 12; i++) { await guest.evaluate(() => SP.sim(0.25)); await guest.waitForTimeout(250); }
  await tick(10);
  log('  rôles après le gel (ancien hôte / invité)', JSON.stringify(await both(() => [SP.G.authority, SP.NET.epoch, SP.G.players.size])));
}
/* ─── Mission de la carte, menée par l'invité ─── */
if (MAPID === 'cite') {
  const n = await guest.evaluate(() => SP.WORLD.citeHeads.length);
  for (let i = 0; i < n; i++) { await gAct('shot', 'mh:' + i); await tick(0.25); }
  await tick(1);
  await same('mannequins + étape', () => [SP.CITE().heads.map((b) => (b ? 1 : 0)).join(''), SP.CITE().ms]);
  const r = await guest.evaluate(() => [SP.WORLD.citeRadio.pos.x, SP.WORLD.citeRadio.pos.z]);
  await gAt(r[0] + 0.9, r[1]); await tick(0.5);
  log('  radio :', await gAct('cradio')); await tick(1);
  await same('alerte lancée', () => SP.CITE().ms);
  await tick(30); log('  compte à rebours (hôte / invité)', JSON.stringify(await both(() => Math.round(SP.CITE().alertT))), await objG());
  await tick(32);
  await same('alerte terminée', () => SP.CITE().ms);
}
if (MAPID === 'penitencier') {
  for (let i = 0; i < 3; i++) { const p = await guest.evaluate((i) => [SP.WORLD.penParts[i].position.x, SP.WORLD.penParts[i].position.z], i); await gAt(p[0] + 0.4, p[1]); await tick(0.5); log('  pièce bouclier', i, await gAct('part', i)); await tick(0.5); }
  const t = await guest.evaluate(() => [SP.WORLD.shieldTable.pos.x, SP.WORLD.shieldTable.pos.z]); await gAt(t[0] + 0.6, t[1]); await tick(0.5);
  log('  assembler :', await gAct('build')); await tick(1);
  await same('bouclier + étape', () => [SP.PEN().built, SP.PEN().ms]);
  // Manche 3 (l'hôte vide les manches).
  for (let k = 0; k < 40 && (await host.evaluate(() => SP.G.round)) < 3; k++) { await (await authPage()).evaluate(() => { for (const z of SP.ZOMBIES) if (z.alive) SP.G.applyDamage(z, 1e9, SP.P.id, { dir: new SP.THREE.Vector3(1, 0, 0) }); SP.G.toSpawn = 0; }); await tick(1); }
  for (let k = 0; k < 40 && !(await (await authPage()).evaluate(() => !!(SP.PEN().boss && SP.PEN().boss.alive))); k++) await tick(1);
  await tick(1.5); // l'instantané qui porte le Geôlier doit arriver chez l'invité
  await same('Geôlier présent', () => !!(SP.PEN().boss && SP.PEN().boss.alive));
  await (await authPage()).evaluate(() => { const z = SP.PEN().boss; if (z) SP.G.applyDamage(z, 1e9, SP.P.id, { dir: new SP.THREE.Vector3(1, 0, 0) }); }); await tick(1.5);
  const [kh] = await same('clés au sol', () => [SP.PEN().keyState, SP.PEN().keyPos]);
  if (kh[1]) { await gAt(kh[1][0] + 0.5, kh[1][1]); await tick(0.5); log('  clés :', await gAct('pkey')); await tick(1); }
  await same('clés + étape', () => [SP.PEN().keyState, SP.PEN().ms]);
  const d = await guest.evaluate(() => [SP.WORLD.penBoat.dock.x, SP.WORLD.penBoat.dock.z]); await gAt(d[0], d[1]); await tick(0.5);
  log('  vedette :', await gAct('pboat')); await tick(1);
  await same('défense vedette', () => SP.PEN().ms);
  for (let k = 0; k < 40 && (await host.evaluate(() => SP.PEN().ms)) === 3; k++) { await gAt(d[0], d[1]); await tick(2); }
  await same('évasion terminée', () => SP.PEN().ms);
}
if (MAPID === 'filon') {
  await same('Colosse libre + étape', () => [SP.FIL().freed, SP.FIL().ms]);
  const c = await guest.evaluate(() => [SP.WORLD.candyShop.pos.x, SP.WORLD.candyShop.pos.z]); await gAt(c[0], c[1]); await tick(0.5);
  log('  bonbons :', await gAct('candy')); await tick(1);
  const feed = async () => { const g = await guest.evaluate(() => [SP.FIL().giant.pos.x, SP.FIL().giant.pos.z]); await gAt(g[0] + 1.6, g[1]); await tick(0.5); const r = await gAct('feed'); await tick(1); return r; };
  log('  nourrir :', await feed());
  await same('allié + étape', () => [SP.FIL().ally, SP.FIL().ms]);
  const spots = await guest.evaluate(() => SP.WORLD.filRubble.map((r) => [r.pos.x, r.pos.z]));
  for (let i = 0; i < spots.length; i++) {
    // Comme un joueur : on (re)nourrit le Colosse si besoin, puis on marche vers l'éboulis en 10 s ; il suit et frappe.
    const [ally, at] = await (await authPage()).evaluate(() => [SP.FIL().ally, SP.FIL().allyT]);
    if (!ally || at < 15) { await gAt(c[0], c[1]); await tick(0.5); await guest.evaluate(() => SP.G.interact(SP.P.id, 'candy')); await tick(0.5); await feed(); }
    const p0 = await guest.evaluate(() => [SP.P.pos.x, SP.P.pos.z]);
    for (let t = 0; t < 30 && !(await (await authPage()).evaluate((i) => SP.FIL().rubble[i], i)); t++) { const k = Math.min(1, t / 10); await gAt(p0[0] + (spots[i][0] + 1.6 - p0[0]) * k, p0[1] + (spots[i][1] - p0[1]) * k); await tick(1); }
    await tick(1.5);
    await gAt(spots[i][0] + 0.5, spots[i][1]); await tick(0.5); log('  éboulis', i, 'pépite :', await gAct('fgold', i)); await tick(1);
  }
  await same('éboulis + or + étape', () => [SP.FIL().rubble.join(''), SP.FIL().gold.join(''), SP.FIL().ms]);
  const v = await guest.evaluate(() => { const d = SP.MAP.doors.find((q) => q.label === 'La chambre forte'); return [d.x * 2 + 1, d.z * 2 + 1]; });
  await gAt(v[0] + 1, v[1]); await tick(0.5); log('  chambre forte :', await gAct('fvault')); await tick(1);
  await same('trésor déposé', () => SP.FIL().ms);
}
const fin = await guest.evaluate((m) => (m === 'cite' ? SP.CITE().ms === 3 : m === 'penitencier' ? SP.PEN().ms === 4 : SP.FIL().ms === 4), MAPID);
if (!fin) bad++; log((fin ? 'OK   ' : 'ÉCART') + ' mission menée à terme');
log('bandeau final invité :', await objG());
log('RÉSEAU hôte', JSON.stringify(await host.evaluate(() => window.__net)), 'invité', JSON.stringify(await guest.evaluate(() => window.__net)));
const errs = [...host.errors, ...guest.errors].filter((e) => !e.includes('WebSocket'));
log('ÉCARTS', bad, 'ERRORS', errs.length); errs.slice(0, 8).forEach((e) => log(e.slice(0, 600)));
await browser.close();
