// Relève de l'hôte, pings et spectateur. Usage : node migrate.mjs peer|room
import { chromium } from 'playwright';
import path from 'path';
const dir = path.dirname(new URL(import.meta.url).pathname);
const MODE = process.argv[2] || 'peer';
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--disable-features=WebRtcHideLocalIpsWithMdns', '--allow-loopback-in-peer-connection'] });
let shared = null;
const mk = async (tag) => {
  const ctx = MODE === 'room' ? (shared ||= await browser.newContext({ viewport: { width: 640, height: 360 } })) : await browser.newContext({ viewport: { width: 640, height: 360 } });
  if (MODE.startsWith('relay')) ctx.__relay = 1;
  if (!ctx.__init) { ctx.__init = 1; await ctx.addInitScript(() => { localStorage.setItem('sp_settings', JSON.stringify({ quality: 0 })); }); if (MODE === 'room') await ctx.addInitScript({ path: path.join(dir, 'mockroom.js') }); }
  const page = await ctx.newPage(); page.tag = tag; page.errors = [];
  page.on('pageerror', (e) => page.errors.push(`[${tag} pageerror] ` + e.message + '\n' + e.stack));
  page.on('console', (m) => { if (m.type() === 'error') page.errors.push(`[${tag} console] ` + m.text().slice(0, 300)); });
  await page.route('https://cdn.jsdelivr.net/npm/three@0.186.1/**', (route) => { const u = new URL(route.request().url()); route.fulfill({ path: path.join(dir, 'node_modules/three', u.pathname.replace('/npm/three@0.186.1/', '')), contentType: 'application/javascript' }); });
  await page.route('https://cdn.jsdelivr.net/npm/peerjs@1.5.5/**', (route) => route.fulfill({ path: path.join(dir, 'node_modules/peerjs/dist/peerjs.min.js'), contentType: 'application/javascript' }));
  await page.route('https://fonts.googleapis.com/**', (r) => r.fulfill({ body: '', contentType: 'text/css' }));
  await page.route('https://fonts.gstatic.com/**', (r) => r.abort());
  await page.goto(MODE === 'room' ? 'http://127.0.0.1:8088/index.html' : MODE.startsWith('relay') ? 'http://127.0.0.1:8088/index.html?relay=' + (MODE === 'relaydead' ? 'ws://127.0.0.1:1' : 'ws://127.0.0.1:8883') + (MODE === 'relaynortc' ? '&nortc=1' : '') + (MODE === 'relaydead' ? '&peer=127.0.0.1:9000' : '') : 'file://' + path.join(dir, 'index.html') + '?peer=127.0.0.1:9000');
  await page.waitForFunction(() => window.__spReady, null, { timeout: 120000 });
  return page;
};
const log = (...a) => console.log(...a);
const H = await mk('H'), A = await mk('A'), B = await mk('B');
let pages = [H, A, B];
const allErr = [];
const joinUI = (p, name, c) => p.evaluate(([name, c]) => { document.getElementById('joinButton').click(); document.getElementById('playerName').value = name; document.getElementById('sessionCode').value = c; document.getElementById('joinSubmit').click(); }, [name, c]);
await joinUI(H, 'Hote', '');
await H.waitForFunction(() => SP.NET.active, null, { timeout: 20000 });
const code = await H.evaluate(() => SP.NET.code); log(MODE, 'code', code);
for (const [p, n] of [[A, 'Alpha'], [B, 'Bravo']]) await joinUI(p, n, code);
await H.waitForFunction(() => SP.NET.lobby.length === 3, null, { timeout: 30000 });
// Salon : attente prolongée (le code partagé met du temps à arriver) — personne ne doit être éjecté.
await H.waitForTimeout(16000);
log('lobby after 16 s', await A.evaluate(() => [SP.NET.active, SP.NET.lobby.length]), await B.evaluate(() => [SP.NET.active, SP.NET.lobby.length]));
await H.evaluate(() => document.getElementById('startCoop').click());
await A.waitForFunction(() => SP.G.mode === 'playing', null, { timeout: 20000 }); await B.waitForFunction(() => SP.G.mode === 'playing', null, { timeout: 20000 });
const tick = async (sec) => { for (let i = 0; i < sec * 4; i++) { await Promise.all(pages.map((p) => p.evaluate(() => SP.sim(0.25)))); await pages[0].waitForTimeout(50); } };
for (const p of pages) await p.evaluate(() => { SP.P.hp = SP.P.maxHp = 1e6; });
await tick(9);
const st = (p) => p.evaluate(() => ({ via: SP.NET.via, links: [...SP.NET.links.entries()].map(([k, L]) => k.slice(0, 4) + ':' + (SP.RTC.healthy(L) ? 'D' : 'r')).join(' '), id: SP.P.id, host: SP.NET.isHost, hostId: SP.NET.hostId, mig: SP.NET.migrating, ep: SP.NET.epoch, auth: SP.G.authority, round: SP.G.round, toSpawn: SP.G.toSpawn, alive: SP.ZOMBIES.filter((z) => z.alive).length, remote: SP.ZOMBIES.filter((z) => z.alive && z.remote).length, players: [...SP.G.players.values()].map((r) => r.name + ':' + r.points).join(','), gid: SP.G.gid, mode: SP.G.mode, msg: document.getElementById('message').textContent }));
log('before', JSON.stringify(await st(H)), '\n       ', JSON.stringify(await st(A)), '\n       ', JSON.stringify(await st(B)));
// Ping d'Alpha vu par Bravo et par l'hôte.
await A.evaluate(() => { SP.pingNow(); });
await tick(1);
log('ping seen', await B.evaluate(() => [...SP.PINGS.keys()].length), await H.evaluate(() => [...SP.PINGS.keys()].length), await B.evaluate(() => document.querySelector('#pings .ping b')?.textContent));

/* 1. L'hôte ferme son onglet. */
allErr.push(...H.errors);
await H.close({ runBeforeUnload: true }); pages = [A, B];
const t0 = Date.now();
for (let i = 0; i < 40; i++) { await tick(0.5); const s = await Promise.all(pages.map(st)); if (s.some((q) => q.host) && s.every((q) => !q.mig && q.hostId === s.find((x) => x.host).id)) break; }
log('migrated in', ((Date.now() - t0) / 1000).toFixed(1), 's');
let sa = await st(A), sb = await st(B); log('after  ', JSON.stringify(sa), '\n       ', JSON.stringify(sb));
const NH = sa.host ? A : B, OT = sa.host ? B : A;
// La partie continue : l'invité restant tire, l'hôte compte les éliminations et les manches avancent.
await tick(6);
const before = await NH.evaluate(() => [...SP.G.players.values()].map((p) => p.kills));
await OT.evaluate(async () => { for (let i = 0; i < 10; i++) { const z = SP.ZOMBIES.filter((q) => q.alive && q.state !== 'rise')[0]; if (!z) break; z.updateHitboxes(); SP.G.hitZombie(z, 99999, SP.P.id, { head: true, dir: new SP.THREE.Vector3(0, 0, 1) }); SP.NET.flushHits(); await new Promise((r) => setTimeout(r, 150)); } });
await tick(4);
log('kills before/after (new host view)', JSON.stringify(before), JSON.stringify(await NH.evaluate(() => [...SP.G.players.values()].map((p) => p.name + ':' + p.kills))));
log('later  ', JSON.stringify(await st(NH)), '\n       ', JSON.stringify(await st(OT)));
// Un nouveau venu rejoint avec le même code après la relève.
if (process.env.JOIN) {
  log('code claimed', await NH.evaluate(() => [!!SP.NET.codePeer, SP.NET.codePeer?.open]));
  const D = await mk('D'); await joinUI(D, 'Delta', code);
  await D.waitForFunction(() => SP.G.mode === 'playing', null, { timeout: 30000 }).catch(() => {});
  pages = [NH, OT, D]; await tick(3);
  log('late joiner', JSON.stringify(await st(D)), 'host sees', await NH.evaluate(() => [...SP.G.players.values()].map((p) => p.name).join(',')));
  allErr.push(...D.errors); await D.close(); pages = [NH, OT]; await tick(2);
}
// Spectateur : l'invité meurt, sa caméra suit le nouvel hôte.
await OT.evaluate(() => { SP.G.localBledOut(); });
await tick(1.5);
log('spectate', JSON.stringify(await OT.evaluate(() => ({ target: SP.SPEC.target, shown: !document.getElementById('spectate').classList.contains('hidden'), name: document.getElementById('spectateName').textContent, camDist: +SP.R.camera.position.distanceTo(SP.P.pos).toFixed(1) }))));
await OT.screenshot({ path: path.join(dir, `shots/80_spectate_${MODE}.png`) });
await OT.evaluate(() => { SP.INPUT.firePressed = true; }); await tick(0.5);

/* 2. Le nouvel hôte disparaît brutalement (plantage) : le dernier soldat reprend seul. */
allErr.push(...NH.errors);
if (MODE !== 'room') await NH.context().close(); else await NH.close();
pages = [OT];
const t1 = Date.now();
for (let i = 0; i < 80; i++) { await tick(0.5); if ((await st(OT)).host) break; }
log('crash takeover in', ((Date.now() - t1) / 1000).toFixed(1), 's', JSON.stringify(await st(OT)));
await tick(5);
log('alone  ', JSON.stringify(await st(OT)));
allErr.push(...OT.errors);
log('errors', allErr.length, allErr.slice(0, 6));
await browser.close();
