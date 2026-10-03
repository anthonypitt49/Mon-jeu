// Co-op sans relais : l'hôte passe en connexion directe et le dit, retente les relais et bascule dès qu'un relais répond ;
// l'invité reçoit un message qui nomme la vraie cause.
import { chromium } from 'playwright';
import path from 'path';
const dir = path.dirname(new URL(import.meta.url).pathname);
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--allow-loopback-in-peer-connection'] });
const log = (...a) => console.log(...a);
const mk = async (q) => {
  const ctx = await browser.newContext({ viewport: { width: 640, height: 360 } });
  await ctx.addInitScript(() => { localStorage.setItem('sp_settings', JSON.stringify({ quality: 0 })); });
  const page = await ctx.newPage(); page.errors = [];
  page.on('pageerror', (e) => page.errors.push(e.message));
  await page.route('https://cdn.jsdelivr.net/npm/three@0.186.1/**', (route) => { const u = new URL(route.request().url()); route.fulfill({ path: path.join(dir, 'node_modules/three', u.pathname.replace('/npm/three@0.186.1/', '')), contentType: 'application/javascript' }); });
  await page.route('https://cdn.jsdelivr.net/npm/peerjs@1.5.5/**', (route) => route.fulfill({ path: path.join(dir, 'node_modules/peerjs/dist/peerjs.min.js'), contentType: 'application/javascript' }));
  await page.route('https://fonts.googleapis.com/**', (r) => r.fulfill({ body: '', contentType: 'text/css' }));
  await page.goto('http://127.0.0.1:8088/index.html?' + q); await page.waitForFunction(() => window.__spReady, null, { timeout: 120000 });
  return page;
};
const DEAD = 'relay=ws://127.0.0.1:1&peer=127.0.0.1:9000';
const host = await mk(DEAD);
const t0 = Date.now();
await host.click('#joinButton'); await host.fill('#playerName', 'Hote'); await host.click('#joinSubmit');
await host.waitForFunction(() => SP.NET.active, null, { timeout: 40000 });
const h1 = await host.evaluate(() => ({ code: SP.NET.code, group: SP.RELAY.groupOf(SP.NET.code), via: SP.NET.via, warn: document.getElementById('lobbyStatus').classList.contains('warn'), status: document.getElementById('lobbyStatus').textContent }));
log('hote-sans-relais', ((Date.now() - t0) / 1000).toFixed(1) + 's', JSON.stringify(h1));
// Messages côté invité (relais morts) selon le code.
const g1 = await mk(DEAD);
for (const code of [h1.code.replace(/^./, '2'), 'X' + h1.code.slice(1), 'A' + h1.code.slice(1)]) {
  await g1.evaluate(() => { document.getElementById('joinButton').click(); });
  const r = await g1.evaluate(async (code) => { try { await SP.NET.joinGame(code, 'Invite'); return 'REJOINT ?!'; } catch (e) { return e.message; } }, code);
  log('invite', code, '→', r);
}
log('code-direct', await g1.evaluate(() => SP.joinFailText('7ABCDE')));
// Les relais reviennent : l'hôte doit basculer tout seul, avec un nouveau code.
await host.evaluate(() => { for (let i = 0; i < SP.RELAYS.length; i++) SP.RELAYS[i] = 'ws://127.0.0.1:8883'; });
await host.waitForFunction(() => SP.NET.via === 'relay', null, { timeout: 40000 });
const h2 = await host.evaluate(() => ({ code: SP.NET.code, group: SP.RELAY.groupOf(SP.NET.code), via: SP.NET.via, warn: document.getElementById('lobbyStatus').classList.contains('warn'), status: document.getElementById('lobbyStatus').textContent }));
log('hote-bascule', JSON.stringify(h2));
const g2 = await mk('relay=ws://127.0.0.1:8883&peer=127.0.0.1:9000');
const j = await g2.evaluate(async (code) => { try { await SP.NET.joinGame(code, 'Invite'); return 'ok ' + SP.NET.via; } catch (e) { return 'ECHEC ' + e.message; } }, h2.code);
await host.waitForTimeout(1500);
log('invite-rejoint', j, 'salon', JSON.stringify(await host.evaluate(() => SP.NET.lobby.map((p) => p.name))));
log('ERRORS', host.errors.length, g1.errors.length, g2.errors.length, [...host.errors, ...g1.errors, ...g2.errors].slice(0, 4));
await browser.close();
