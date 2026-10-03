import { chromium } from 'playwright';
import path from 'path';
const dir = path.dirname(new URL(import.meta.url).pathname);
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--disable-features=WebRtcHideLocalIpsWithMdns', '--allow-loopback-in-peer-connection'] });
const mk = async (tag) => {
  const ctx = await browser.newContext({ viewport: { width: 640, height: 360 } });
  await ctx.addInitScript(() => { localStorage.setItem('sp_settings', JSON.stringify({ quality: 0 })); });
  const page = await ctx.newPage();
  page.errors = [];
  page.on('pageerror', (e) => page.errors.push(`[${tag} pageerror] ` + e.message + '\n' + e.stack));
  page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') page.errors.push(`[${tag} console] ` + m.text().slice(0, 300)); });
  await page.route('https://cdn.jsdelivr.net/npm/three@0.186.1/**', (route) => { const u = new URL(route.request().url()); route.fulfill({ path: path.join(dir, 'node_modules/three', u.pathname.replace('/npm/three@0.186.1/', '')), contentType: 'application/javascript' }); });
  await page.route('https://cdn.jsdelivr.net/npm/peerjs@1.5.5/**', (route) => route.fulfill({ path: path.join(dir, 'node_modules/peerjs/dist/peerjs.min.js'), contentType: 'application/javascript' }));
  await page.route('https://fonts.googleapis.com/**', (r) => r.fulfill({ body: '', contentType: 'text/css' }));
  await page.route('https://fonts.gstatic.com/**', (r) => r.abort());
  await page.goto('file://' + path.join(dir, 'index.html') + '?peer=127.0.0.1:9000');
  await page.waitForFunction(() => window.__spReady, null, { timeout: 120000 });
  return page;
};
const host = await mk('host'), guest = await mk('guest');
const log = (...a) => console.log(...a);
// Host creates a game.
await host.click('#joinButton'); await host.fill('#playerName', 'Hote'); await host.click('#joinSubmit');
await host.waitForFunction(() => SP.NET.active, null, { timeout: 20000 });
const code = await host.evaluate(() => SP.NET.code); log('code', code);
await guest.click('#joinButton'); await guest.fill('#playerName', 'Invite'); await guest.fill('#sessionCode', code); await guest.click('#joinSubmit');
await host.waitForFunction(() => SP.NET.lobby.length === 2, null, { timeout: 30000 });
log('lobby host', await host.evaluate(() => document.getElementById('lobbyList').textContent), '| guest', await guest.evaluate(() => document.getElementById('lobbyList').textContent));
await host.click('#startCoop');
await guest.waitForFunction(() => SP.G.mode === 'playing', null, { timeout: 20000 });
log('both playing', await host.evaluate(() => [SP.G.mode, SP.G.players.size, SP.G.solo]), await guest.evaluate(() => [SP.G.mode, SP.G.players.size, SP.G.authority]));
// Run both for a few seconds (real time: the network needs wall-clock time).
const tick = async (sec) => { for (let i = 0; i < sec * 4; i++) { await Promise.all([host.evaluate(() => SP.sim(0.25)), guest.evaluate(() => SP.sim(0.25))]); await host.waitForTimeout(60); } };
await host.evaluate(() => { SP.P.hp = SP.P.maxHp = 1e6; }); await guest.evaluate(() => { SP.P.hp = SP.P.maxHp = 1e6; });
await tick(8);
log('host', JSON.stringify(await host.evaluate(() => ({ r: SP.G.round, z: SP.ZOMBIES.filter((z) => z.alive).length, players: [...SP.G.players.values()].map((p) => [p.name, +p.pos.x.toFixed(1), +p.pos.z.toFixed(1)]) }))));
log('guest', JSON.stringify(await guest.evaluate(() => ({ r: SP.G.round, z: SP.ZOMBIES.filter((z) => z.alive).length, remote: SP.ZOMBIES.every((z) => z.remote), players: [...SP.G.players.values()].map((p) => [p.name, +p.pos.x.toFixed(1), +p.pos.z.toFixed(1)]) }))));
// Guest moves: host must see it.
await guest.evaluate(() => { SP.P.pos.set(30, 0, 14); SP.sim(0.1); });
await tick(1.5);
log('host sees guest at', JSON.stringify(await host.evaluate(() => [...SP.G.players.values()].filter((p) => !p.isLocal).map((p) => [+p.pos.x.toFixed(1), +p.pos.z.toFixed(1)]))));
// Guest shoots zombies: host brings its zombies in front of the guest (in the trench).
await tick(6);
await guest.evaluate(() => { SP.P.pos.set(36, 0, 14.5); SP.sim(0.1); });
await tick(1);
await host.evaluate(() => { let i = 0; for (const z of SP.ZOMBIES) if (z.alive) { z.pos.set(42 + i * 1.2, 0, 13.6 + (i % 2)); z.state = 'move'; z.rise = 1; z.vel.set(0, 0, 0); i++; } SP.G.me().points; const g = [...SP.G.players.values()].find((p) => !p.isLocal); g.points = 5000; SP.NET.sendTo(g.id, 'pts', [5000, 0]); });
await tick(1);
const g = await guest.evaluate(async () => { let shots = 0; for (let i = 0; i < 12; i++) { const z = SP.ZOMBIES.filter((q) => q.alive && q.state !== 'rise').sort((a, b) => a.pos.distanceTo(SP.P.pos) - b.pos.distanceTo(SP.P.pos))[0]; if (!z) break; z.updateHitboxes(); const c = SP.R.camera.position, h = z.hit[0].c; const dx = h.x - c.x, dy = h.y - c.y, dz = h.z - c.z; SP.P.yaw = Math.atan2(-dx, -dz); SP.P.pitch = Math.atan2(dy, Math.hypot(dx, dz)); SP.P.rec.p = SP.P.rec.y = 0; SP.P.bloom = 0; SP.sim(0.05); SP.INPUT.firePressed = true; SP.sim(0.3); shots++; await new Promise((r) => setTimeout(r, 120)); } return { shots, hits: SP.P.stats.hits }; });
await tick(2);
log('guest shooting', JSON.stringify(g), 'host kills per player', JSON.stringify(await host.evaluate(() => [...SP.G.players.values()].map((p) => [p.name, p.kills, p.points]))), 'guest points', await guest.evaluate(() => SP.G.me().points));
// Guest buys door 1 (750).
await guest.evaluate(() => { SP.G.me().points; SP.P.pos.set(19, 0, 15.3); SP.P.yaw = Math.PI; SP.sim(0.1); SP.INPUT.interactPressed = true; SP.sim(0.1); });
await tick(1.5);
log('door after guest buy: host', JSON.stringify(await host.evaluate(() => SP.MAP.doors.map((d) => d.open))), 'guest', JSON.stringify(await guest.evaluate(() => [SP.MAP.doors.map((d) => d.open), SP.G.me().points])));
// Host down, guest revives.
await host.evaluate(() => { SP.P.hp = 1; SP.P.maxHp = 100; SP.G.damagePlayer(SP.G.me(), 50, { pos: SP.P.pos }); SP.P.pos.set(40, 0, 14); SP.sim(0.1); });
await tick(1);
log('host down?', await host.evaluate(() => SP.P.down), 'guest sees', await guest.evaluate(() => [...SP.G.players.values()].filter((p) => !p.isLocal).map((p) => p.down)));
await guest.evaluate(() => { SP.P.pos.set(41, 0, 14.4); SP.sim(0.1); SP.INPUT.interactHeld = true; });
for (let i = 0; i < 16; i++) { await Promise.all([host.evaluate(() => SP.sim(0.25)), guest.evaluate(() => SP.sim(0.25))]); await host.waitForTimeout(40); }
await guest.evaluate(() => { SP.INPUT.interactHeld = false; });
await tick(1);
log('host revived?', await host.evaluate(() => !SP.P.down));
await host.evaluate(() => SP.renderFrame(1)); await host.screenshot({ path: path.join(dir, 'shots/30_coop_host.png') });
await guest.evaluate(() => { SP.P.yaw = Math.PI / 2; SP.P.pitch = 0; SP.sim(0.1); SP.renderFrame(1); }); await guest.screenshot({ path: path.join(dir, 'shots/31_coop_guest.png') });
// Fin de partie en co-op : chaque navigateur enregistre les deux soldats, sans doublon, avec le même identifiant de partie.
await guest.evaluate(() => { SP.BOARD.merge([{ id: 'ancien:1', name: 'VIEUX', round: 2, kills: 3, heads: 0, points: 900, date: Date.now() - 3 * 86400000 }]); });
for (const p of [host, guest]) await p.evaluate(() => { SP.P.hp = 1; SP.P.maxHp = 100; SP.P.perks.clear(); SP.G.damagePlayer(SP.G.me(), 500, { pos: SP.P.pos }); });
await tick(1); for (const p of [host, guest]) await p.evaluate(() => { SP.P.bleed = 0; }); await tick(4);
log('gameover', await host.evaluate(() => SP.G.mode), await guest.evaluate(() => SP.G.mode));
// Nouvelle partie : l'échange de classements au salon suivant.
log('boards', JSON.stringify(await host.evaluate(() => SP.BOARD.list.map((e) => `${e.name}/${e.mode}/${e.id.split(':')[0].slice(-4)}`))), JSON.stringify(await guest.evaluate(() => SP.BOARD.list.map((e) => `${e.name}/${e.mode}/${e.id.split(':')[0].slice(-4)}`))));
await guest.evaluate(() => SP.NET.send('board', SP.BOARD.top(20))); await tick(1.5);
log('host board after exchange', JSON.stringify(await host.evaluate(() => SP.BOARD.list.map((e) => e.name))));
log('ERRORS host', host.errors.length, 'guest', guest.errors.length); [...host.errors, ...guest.errors].slice(0, 20).forEach((e) => log(e));
await browser.close();
