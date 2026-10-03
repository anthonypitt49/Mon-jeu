// Co-op à TROIS (relais local) : deux invités mènent courant et mission de la Cité, l'hôte part en pleine alerte,
// un des invités reprend, l'autre le suit ; on compare l'état des trois (puis des deux) à chaque étape.
import { chromium } from 'playwright';
import path from 'path';
const dir = path.dirname(new URL(import.meta.url).pathname);
const MAPID = process.argv[2] || 'cite';
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--allow-loopback-in-peer-connection', '--disable-features=WebRtcHideLocalIpsWithMdns'] });
const mk = async (tag) => {
  const ctx = await browser.newContext({ viewport: { width: 480, height: 270 } });
  await ctx.addInitScript(() => { localStorage.setItem('sp_settings', JSON.stringify({ quality: 0 })); const ce = console.error.bind(console); console.error = (...a) => ce(...a.map((x) => (x && x.stack ? x.stack : x))); });
  const page = await ctx.newPage(); page.errors = []; page.tag = tag;
  page.on('pageerror', (e) => page.errors.push(`[${tag} pageerror] ` + e.message + '\n' + e.stack));
  page.on('console', (m) => { if (m.type() === 'error') page.errors.push(`[${tag} console] ` + m.text().slice(0, 600)); });
  await page.route('https://cdn.jsdelivr.net/npm/three@0.186.1/**', (route) => { const u = new URL(route.request().url()); route.fulfill({ path: path.join(dir, 'node_modules/three', u.pathname.replace('/npm/three@0.186.1/', '')), contentType: 'application/javascript' }); });
  await page.route('https://cdn.jsdelivr.net/npm/peerjs@1.5.5/**', (route) => route.fulfill({ path: path.join(dir, 'node_modules/peerjs/dist/peerjs.min.js'), contentType: 'application/javascript' }));
  await page.route('https://fonts.googleapis.com/**', (r) => r.fulfill({ body: '', contentType: 'text/css' }));
  await page.goto('http://127.0.0.1:8088/index.html?' + (process.env.Q || 'relay=ws://127.0.0.1:8883&nortc=1') + '#carte=' + MAPID);
  await page.waitForFunction(() => window.__spReady, null, { timeout: 180000 });
  return page;
};
const log = (...a) => console.log(...a);
let bad = 0;
const ui = (page, name, codeVal) => page.evaluate(([n, c]) => { document.getElementById('joinButton').click(); document.getElementById('playerName').value = n; document.getElementById('sessionCode').value = c; document.getElementById('joinSubmit').click(); }, [name, codeVal]);
const host = await mk('H'), g1 = await mk('A'), g2 = await mk('B');
await ui(host, 'Hote', ''); await host.waitForFunction(() => SP.NET.active, null, { timeout: 40000 });
const code = await host.evaluate(() => SP.NET.code);
await ui(g1, 'Alpha', code); await ui(g2, 'Bravo', code);
await host.waitForFunction(() => SP.NET.lobby.length === 3, null, { timeout: 60000 });
await host.evaluate(() => document.getElementById('startCoop').click());
for (const g of [g1, g2]) await g.waitForFunction(() => SP.G.mode === 'playing', null, { timeout: 60000 });
let pages = [host, g1, g2];
log('carte', MAPID, 'joueurs', JSON.stringify(await Promise.all(pages.map((p) => p.evaluate(() => SP.G.players.size)))));
const defKill = () => { window.killNear = (r = 6) => { for (const z of SP.ZOMBIES) if (z.alive && z.state !== 'rise' && !z.boss) for (const [, p] of SP.G.players) if (z.pos.distanceTo(p.pos) < r) { SP.G.applyDamage(z, 1e7, SP.P.id, { dir: new SP.THREE.Vector3(1, 0, 0) }); break; } }; };
for (const p of pages) await p.evaluate(defKill);
const tick = async (sec) => { for (let i = 0; i < sec * 4; i++) { await Promise.all(pages.map((p) => p.evaluate(() => { SP.P.hp = SP.P.maxHp = 1e6; SP.sim(0.25); if (SP.G.authority) killNear(); }))); await pages[0].waitForTimeout(20); } };
const same = async (label, f) => { const r = await Promise.all(pages.map((p) => p.evaluate(f))); const ok = r.every((v) => JSON.stringify(v) === JSON.stringify(r[0])); if (!ok) bad++; log((ok ? 'OK   ' : 'ÉCART') + ' ' + label, JSON.stringify(r[0]), ok ? '' : '≠ ' + JSON.stringify(r.slice(1))); return r; };
const at = (p, x, z) => p.evaluate(([x, z]) => { SP.P.pos.set(x, 0, z); SP.P.vel.set(0, 0, 0); }, [x, z]);
const act = (p, k, i) => p.evaluate(([k, i]) => SP.G.interact(SP.P.id, k, i), [k, i]);
const ids = await Promise.all(pages.map((p) => p.evaluate(() => SP.P.id)));
await host.evaluate((ids) => { SP.G.me().points = 300000; for (const id of ids) if (SP.G.players.get(id)) SP.G.players.get(id).points = 300000; }, ids);
await tick(3);
for (let k = 0, n = await host.evaluate(() => SP.MAP.doors.length); k < n; k++) { await act(host, 'door', k); await tick(0.5); }
await same('portes', () => SP.MAP.doors.map((d) => (d.open ? 1 : 0)).join(''));
// Alpha ramasse deux pièces, Bravo la troisième et lance le générateur ; tous deux le défendent.
for (const [p, i] of [[g1, 0], [g1, 1], [g2, 2]]) { const w = await p.evaluate((i) => { const g = SP.WORLD.pwrParts[i].g; return [g.position.x, g.position.z]; }, i); await at(p, w[0] - 0.3, w[1]); await tick(0.5); await act(p, 'ppart', i); await tick(0.5); }
await same('pièces', () => [SP.PWR.stage, SP.PWR.got.join('')]);
const gen = await g2.evaluate(() => { const g = SP.WORLD.power.pos, f = SP.WORLD.power.face; return [g.x - f[0] * 1.1, g.z - f[1] * 1.1]; });
await at(g2, gen[0], gen[1]); await tick(0.5); await act(g2, 'pinst'); await tick(0.5); await act(g2, 'pstart'); await tick(0.5);
for (let t = 0; t < 70 && !(await host.evaluate(() => SP.G.power)); t += 2) { await at(g1, gen[0] + 1, gen[1]); await at(g2, gen[0], gen[1]); await tick(2); }
await same('courant', () => SP.G.power);
if (MAPID === 'cite') {
  const n = await g1.evaluate(() => SP.WORLD.citeHeads.length);
  for (let i = 0; i < n; i++) { await act(i % 2 ? g2 : g1, 'shot', 'mh:' + i); await tick(0.25); }
  await tick(1.5);
  await same('mannequins + étape', () => [SP.CITE().heads.map(Number).join(''), SP.CITE().ms]);
  const r = await g1.evaluate(() => [SP.WORLD.citeRadio.pos.x, SP.WORLD.citeRadio.pos.z]);
  await at(g1, r[0] + 0.9, r[1]); await tick(0.5); await act(g1, 'cradio'); await tick(2);
  await same('alerte lancée', () => SP.CITE().ms);
  await tick(10);
}
// L'hôte ferme son onglet en pleine alerte : un des deux invités reprend, l'autre le suit.
await host.context().close(); pages = [g1, g2];
for (let i = 0; i < 40; i++) { await tick(0.5); const r = await Promise.all(pages.map((p) => p.evaluate(() => [SP.G.authority, SP.NET.migrating]))); if (r.filter((x) => x[0]).length === 1 && !r.some((x) => x[1])) break; }
const roles = await Promise.all(pages.map((p) => p.evaluate(() => ({ auth: SP.G.authority, host: SP.NET.hostId, players: SP.G.players.size, ep: SP.NET.epoch }))));
const one = roles.filter((r) => r.auth).length === 1 && roles[0].host === roles[1].host; if (!one) bad++;
log((one ? 'OK   ' : 'ÉCART') + ' relève à trois → un seul hôte', JSON.stringify(roles));
await tick(8); // le départ d'un joueur en connexion directe peut mettre quelques secondes à être signalé
await same('joueurs restants', () => SP.G.players.size);
if (MAPID === 'cite') {
  for (let t = 0; t < 80 && (await g1.evaluate(() => SP.CITE().ms)) === 2; t += 2) await tick(2);
  await same('alerte terminée après la relève', () => SP.CITE().ms);
}
await same('manche', () => SP.G.round);
const errs = [host, g1, g2].flatMap((p) => p.errors).filter((e) => !e.includes('WebSocket'));
log('ÉCARTS', bad, 'ERRORS', errs.length); errs.slice(0, 6).forEach((e) => log(e.slice(0, 900)));
await browser.close();
