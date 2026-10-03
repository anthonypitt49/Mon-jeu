// Co-op : un ami arrive en pleine mission (état complet reçu ?), puis l'hôte disparaît en pleine alerte (la mission continue ?).
// Usage : node coopjoin.mjs cite|penitencier   (env Q pour changer de chemin réseau)
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
const log = (...a) => console.log(...a);
let bad = 0;
const ui = (page, name, codeVal) => page.evaluate(([n, c]) => { document.getElementById('joinButton').click(); document.getElementById('playerName').value = n; document.getElementById('sessionCode').value = c; document.getElementById('joinSubmit').click(); }, [name, codeVal]);
const host = await mk('host');
await ui(host, 'Hote', '');
await host.waitForFunction(() => SP.NET.active, null, { timeout: 40000 });
const code = await host.evaluate(() => SP.NET.code);
await host.evaluate(() => document.getElementById('startCoop').click());
await host.waitForFunction(() => SP.G.mode === 'playing', null, { timeout: 20000 });
await host.evaluate(() => { window.killNear = (r = 6) => { for (const z of SP.ZOMBIES) if (z.alive && z.state !== 'rise' && !z.boss) for (const [, p] of SP.G.players) if (z.pos.distanceTo(p.pos) < r) { SP.G.applyDamage(z, 1e7, SP.P.id, { dir: new SP.THREE.Vector3(1, 0, 0) }); break; } }; });
// L'hôte, seul, rétablit le courant et avance la mission.
await host.evaluate(() => {
  SP.P.hp = SP.P.maxHp = 1e7; SP.G.me().points = 300000; SP.sim(2);
  for (const d of SP.MAP.doors) SP.G.interact(SP.P.id, 'door', d.id);
  for (let i = 0; i < 40 && SP.PWR.tiles.some((t) => t < 0); i++) SP.sim(0.5);
  for (let i = 0; i < 3; i++) SP.G.interact(SP.P.id, 'ppart', i);
  SP.G.interact(SP.P.id, 'pinst'); SP.G.interact(SP.P.id, 'pstart');
  const g = SP.WORLD.power.pos; for (let t = 0; t < 60 && !SP.G.power; t += 0.25) { SP.P.pos.set(g.x - SP.WORLD.power.face[0] * 1.1, 0, g.z - SP.WORLD.power.face[1] * 1.1); SP.sim(0.25); killNear(); }
});
if (MAPID === 'cite') await host.evaluate(() => { for (let i = 0; i < SP.WORLD.citeHeads.length; i++) SP.G.interact(SP.P.id, 'shot', 'mh:' + i); SP.sim(0.5); SP.G.interact(SP.P.id, 'cradio'); SP.sim(0.5); for (let t = 0; t < 15; t += 0.25) { SP.sim(0.25); killNear(); } });
if (MAPID === 'penitencier') await host.evaluate(() => { for (let i = 0; i < 3; i++) SP.G.interact(SP.P.id, 'part', i); SP.G.interact(SP.P.id, 'build'); SP.sim(0.5); SP.G.emit('pkeys', { s: 1, p: [SP.WORLD.penBoat.dock.x - 3, SP.WORLD.penBoat.dock.z - 3] }); SP.sim(0.5); });
log('hôte seul', JSON.stringify(await host.evaluate(() => ({ power: SP.G.power, pw: SP.PWR.stage, mx: SP.M().state?.() || null, round: SP.G.round }))));
// L'ami arrive en pleine partie.
const guest = await mk('guest');
await ui(guest, 'Invite', code);
await guest.waitForFunction(() => SP.G.mode === 'playing', null, { timeout: 60000 });
const tick = async (sec) => { for (let i = 0; i < sec * 4; i++) { await Promise.all([host.evaluate(() => { SP.sim(0.25); killNear(); }), guest.evaluate(() => { SP.P.hp = SP.P.maxHp = 1e6; SP.sim(0.25); })]); await host.waitForTimeout(30); } };
await tick(3);
const both = async (f) => [await host.evaluate(f), await guest.evaluate(f)];
const same = async (label, f) => { const [h, g] = await both(f); const ok = JSON.stringify(h) === JSON.stringify(g); if (!ok) bad++; log((ok ? 'OK   ' : 'ÉCART') + ' ' + label, JSON.stringify(h), ok ? '' : '≠ invité ' + JSON.stringify(g)); return [h, g]; };
await same('courant', () => [SP.G.power, SP.PWR.stage]);
await same('portes', () => SP.MAP.doors.map((d) => (d.open ? 1 : 0)).join(''));
await same('manche', () => SP.G.round);
if (MAPID === 'cite') { await same('mission', () => [SP.CITE().heads.map(Number).join(''), SP.CITE().ms]); log('  compte à rebours (hôte / invité)', JSON.stringify(await both(() => Math.round(SP.CITE().alertT)))); }
if (MAPID === 'penitencier') { await same('mission', () => [SP.PEN().built, SP.PEN().ms, SP.PEN().keyState, SP.PEN().parts.join('')]); log('  clés visibles chez l\'invité', await guest.evaluate(() => !!SP.WORLD.penKeys?.visible)); }
log('  bandeau invité', await guest.evaluate(() => { SP.UI.objective(); return document.getElementById('objectiveTitle').textContent + ' | ' + document.getElementById('objectiveText').textContent; }));
// L'hôte disparaît (onglet fermé) : l'invité reprend et la mission continue jusqu'au bout.
await host.context().close();
for (let i = 0; i < 24; i++) { await guest.evaluate(() => { SP.P.hp = SP.P.maxHp = 1e6; SP.sim(0.5); }); await guest.waitForTimeout(400); if (await guest.evaluate(() => SP.G.authority)) break; }
log('relève', JSON.stringify(await guest.evaluate(() => ({ auth: SP.G.authority, host: SP.NET.isHost, players: SP.G.players.size, round: SP.G.round }))));
await guest.evaluate(() => { window.killNear = (r = 6) => { for (const z of SP.ZOMBIES) if (z.alive && z.state !== 'rise' && !z.boss && z.pos.distanceTo(SP.P.pos) < r) SP.G.applyDamage(z, 1e7, SP.P.id, { dir: new SP.THREE.Vector3(1, 0, 0) }); }; });
if (MAPID === 'cite') { const r = await guest.evaluate(() => { for (let t = 0; t < 70 && SP.CITE().ms === 2; t += 0.25) { SP.P.hp = 1e6; SP.sim(0.25); killNear(); } return [SP.CITE().ms, Math.round(SP.CITE().alertT)]; }); log((r[0] === 3 ? 'OK   ' : 'ÉCART') + ' alerte menée à terme par le nouvel hôte', JSON.stringify(r)); if (r[0] !== 3) bad++; }
if (MAPID === 'penitencier') {
  const r = await guest.evaluate(() => { const k = SP.PEN().keyPos; SP.P.pos.set(k[0] + 0.5, 0, k[1]); SP.sim(0.3); SP.G.interact(SP.P.id, 'pkey'); SP.sim(0.5); const b = SP.WORLD.penBoat; SP.P.pos.set(b.dock.x, 0, b.dock.z); SP.sim(0.3); SP.G.interact(SP.P.id, 'pboat'); SP.sim(0.5); for (let t = 0; t < 80 && SP.PEN().ms === 3; t += 0.25) { SP.P.hp = 1e6; SP.P.pos.set(b.dock.x, 0, b.dock.z); SP.sim(0.25); killNear(); } return [SP.PEN().keyState, SP.PEN().ms]; });
  log((r[1] === 4 ? 'OK   ' : 'ÉCART') + ' évasion menée à terme par le nouvel hôte', JSON.stringify(r)); if (r[1] !== 4) bad++;
}
const errs = [...host.errors, ...guest.errors].filter((e) => !e.includes('WebSocket'));
log('ÉCARTS', bad, 'ERRORS', errs.length); errs.slice(0, 6).forEach((e) => log(e.slice(0, 500)));
await browser.close();
