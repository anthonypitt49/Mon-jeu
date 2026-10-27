// Coopération réelle (hôte + invité, PeerJS local) avec les soldats modernes : chacun doit voir l'autre sous le même
// soldat que celui qu'il joue (rang donné par l'hôte), bras en vue subjective compris. Captures dans dev/shots/.
// usage : node coopsoldats.mjs [carte=cite] [qualité=1] (serveurs : sh servers.sh)
import { chromium } from 'playwright';
import path from 'path';
const dir = path.dirname(new URL(import.meta.url).pathname);
const id = process.argv[2] || 'cite', q = +(process.argv[3] ?? 1);
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--disable-features=WebRtcHideLocalIpsWithMdns', '--allow-loopback-in-peer-connection'] });
const mk = async (tag) => {
  const ctx = await browser.newContext({ viewport: { width: 640, height: 360 } });
  await ctx.addInitScript((q) => { localStorage.setItem('sp_settings', JSON.stringify({ quality: q })); }, q);
  const page = await ctx.newPage(); page.errors = [];
  page.on('pageerror', (e) => page.errors.push(`[${tag} pageerror] ` + e.message));
  page.on('console', (m) => { if ((m.type() === 'error' || m.type() === 'warning') && !/KHR_parallel_shader_compile/.test(m.text())) page.errors.push(`[${tag} console] ` + m.text().slice(0, 300)); });
  await page.route('https://cdn.jsdelivr.net/npm/three@0.186.1/**', (route) => { const u = new URL(route.request().url()); route.fulfill({ path: path.join(dir, 'node_modules/three', u.pathname.replace('/npm/three@0.186.1/', '')), contentType: 'application/javascript' }); });
  await page.route('https://cdn.jsdelivr.net/npm/peerjs@1.5.5/**', (route) => route.fulfill({ path: path.join(dir, 'node_modules/peerjs/dist/peerjs.min.js'), contentType: 'application/javascript' }));
  await page.route('https://cdn.jsdelivr.net/npm/n8ao@2.0.1/**', (route) => route.fulfill({ path: path.join(dir, 'node_modules/n8ao/dist/N8AO.js'), contentType: 'application/javascript' }));
  await page.route('https://fonts.googleapis.com/**', (r) => r.fulfill({ body: '', contentType: 'text/css' }));
  await page.route('https://fonts.gstatic.com/**', (r) => r.abort());
  await page.goto((process.env.WEB || 'http://127.0.0.1:8088') + '/index.html?peer=127.0.0.1:9000#carte=' + id);
  await page.waitForFunction(() => window.__spReady, null, { timeout: 900000 });
  return page;
};
const host = await mk('hôte'), guest = await mk('invité');
await host.click('#joinButton'); await host.fill('#playerName', 'Hote'); await host.click('#joinSubmit');
await host.waitForFunction(() => SP.NET.active, null, { timeout: 30000 });
const code = await host.evaluate(() => SP.NET.code);
await guest.click('#joinButton'); await guest.fill('#playerName', 'Invite'); await guest.fill('#sessionCode', code); await guest.click('#joinSubmit');
await host.waitForFunction(() => SP.NET.lobby.length === 2, null, { timeout: 30000 });
await host.click('#startCoop');
await guest.waitForFunction(() => SP.G.mode === 'playing', null, { timeout: 30000 });
const tick = async (sec) => { for (let i = 0; i < sec * 4; i++) { await Promise.all([host.evaluate(() => SP.sim(0.25)), guest.evaluate(() => SP.sim(0.25))]); await host.waitForTimeout(60); } };
for (const p of [host, guest]) await p.evaluate(() => { SP.P.hp = SP.P.maxHp = 1e6; SP.G.breakT = 1e9; });
await Promise.all([host, guest].map((p) => p.waitForFunction(() => SP.SREAL.state === 'on' || SP.SREAL.state === 'failed', null, { timeout: 180000 })));
// Face à face à 3 m, sur la case de départ.
await guest.evaluate(() => { SP.P.pos.x += 3; SP.P.yaw = Math.PI / 2; SP.sim(0.05); });
await host.evaluate(() => { SP.P.yaw = -Math.PI / 2; SP.sim(0.05); });
await tick(3);
const st = async (p) => p.evaluate(() => ({ etat: SP.SREAL.state, moi: SP.G.me().soldier, autres: [...SP.G.players.values()].filter((r) => !r.isLocal).map((r) => [r.name, r.soldier, r.avatar?.real?.tpl.id || 'procédural']) }));
const hs = await st(host), gs = await st(guest);
console.log('hôte', JSON.stringify(hs)); console.log('invité', JSON.stringify(gs));
console.log('cohérent', hs.autres[0]?.[1] === gs.moi && gs.autres[0]?.[1] === hs.moi && hs.moi !== gs.moi);
for (const [p, n] of [[host, 'hote'], [guest, 'invite']]) { await p.evaluate(() => { document.getElementById('hud')?.classList.add('hidden'); SP.renderFrame(1 / 30); }); await p.screenshot({ path: path.join(dir, `shots/coop_soldat_${n}.png`) }); }
console.log('ERRORS hôte', host.errors.length, 'invité', guest.errors.length); [...host.errors, ...guest.errors].slice(0, 12).forEach((e) => console.log(e));
await browser.close();
