// Co-op entre cartes : l'hôte joue la Cité, l'invité arrive depuis Poste 7 → rechargement automatique puis ralliement.
import { chromium } from 'playwright';
import path from 'path';
const dir = path.dirname(new URL(import.meta.url).pathname);
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--disable-features=WebRtcHideLocalIpsWithMdns', '--allow-loopback-in-peer-connection'] });
const mk = async (tag, hash) => {
  const ctx = await browser.newContext({ viewport: { width: 640, height: 360 } });
  await ctx.addInitScript(() => { localStorage.setItem('sp_settings', JSON.stringify({ quality: 0 })); });
  const page = await ctx.newPage(); page.errors = [];
  page.on('pageerror', (e) => page.errors.push(`[${tag} pageerror] ` + e.message + '\n' + e.stack));
  page.on('console', (m) => { if (m.type() === 'error') page.errors.push(`[${tag} console] ` + m.text().slice(0, 200)); });
  await page.route('https://cdn.jsdelivr.net/npm/three@0.186.1/**', (route) => { const u = new URL(route.request().url()); route.fulfill({ path: path.join(dir, 'node_modules/three', u.pathname.replace('/npm/three@0.186.1/', '')), contentType: 'application/javascript' }); });
  await page.route('https://cdn.jsdelivr.net/npm/peerjs@1.5.5/**', (route) => route.fulfill({ path: path.join(dir, 'node_modules/peerjs/dist/peerjs.min.js'), contentType: 'application/javascript' }));
  await page.route('https://fonts.googleapis.com/**', (r) => r.fulfill({ body: '', contentType: 'text/css' }));
  await page.route('https://fonts.gstatic.com/**', (r) => r.abort());
  await page.goto('file://' + path.join(dir, 'index.html') + '?peer=127.0.0.1:9000' + hash);
  await page.waitForFunction(() => window.__spReady, null, { timeout: 120000 });
  return page;
};
const host = await mk('host', '#carte=cite'), guest = await mk('guest', '');
const log = (...a) => console.log(...a);
log('maps', await host.evaluate(() => SP.MAP_ID()), await guest.evaluate(() => SP.MAP_ID()));
await host.click('#joinButton'); await host.fill('#playerName', 'Hote'); await host.click('#joinSubmit');
await host.waitForFunction(() => SP.NET.active, null, { timeout: 20000 });
const code = await host.evaluate(() => SP.NET.code); log('code', code);
await guest.click('#joinButton'); await guest.fill('#playerName', 'Invite'); await guest.fill('#sessionCode', code); await guest.click('#joinSubmit');
// L'invité recharge la page sur la carte de l'hôte, puis rejoint tout seul.
await guest.waitForFunction(() => location.hash.includes('carte=cite') || window.SP?.MAP_ID?.() === 'cite', null, { timeout: 30000 }).catch(() => {});
await guest.waitForLoadState('load');
await guest.waitForFunction(() => window.__spReady && SP.MAP_ID() === 'cite', null, { timeout: 120000 });
log('guest reloaded on', await guest.evaluate(() => SP.MAP_ID()), 'hash', await guest.evaluate(() => location.hash));
await host.waitForFunction(() => SP.NET.lobby.length === 2, null, { timeout: 40000 });
log('lobby', await host.evaluate(() => SP.NET.lobby.map((p) => p.name)), 'guest active', await guest.evaluate(() => SP.NET.active));
await host.click('#startCoop');
await guest.waitForFunction(() => SP.G.mode === 'playing', null, { timeout: 20000 });
const tick = async (sec) => { for (let i = 0; i < sec * 4; i++) { await Promise.all([host.evaluate(() => SP.sim(0.25)), guest.evaluate(() => SP.sim(0.25))]); await host.waitForTimeout(60); } };
await host.evaluate(() => { SP.P.hp = SP.P.maxHp = 1e6; }); await guest.evaluate(() => { SP.P.hp = SP.P.maxHp = 1e6; });
await tick(12);
log('host', JSON.stringify(await host.evaluate(() => ({ r: SP.G.round, z: SP.ZOMBIES.filter((z) => z.alive).length, perks: SP.WORLD.perks.filter((p) => p.landed).map((p) => p.key) }))));
log('guest', JSON.stringify(await guest.evaluate(() => ({ r: SP.G.round, z: SP.ZOMBIES.filter((z) => z.alive).length, perks: SP.WORLD.perks.filter((p) => p.landed).map((p) => p.key), visible: SP.WORLD.perks.filter((p) => p.group.visible).length }))));
// Tête de mannequin abattue par l'invité → synchronisée.
await guest.evaluate(() => SP.G.interact(SP.P.id, 'shot', 'mh:2')); await tick(2);
log('heads host', await host.evaluate(() => SP.WORLD.citeHeads.map((h) => (h.shot ? 1 : 0)).join('')), 'guest', await guest.evaluate(() => SP.WORLD.citeHeads.map((h) => (h.shot ? 1 : 0)).join('')));
log('ERRORS', host.errors.length, guest.errors.length); for (const e of [...host.errors, ...guest.errors].filter((e) => !e.includes('WebSocket')).slice(0, 8)) log(e.slice(0, 500));
await browser.close();
