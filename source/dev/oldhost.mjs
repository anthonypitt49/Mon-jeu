// Hôte sur l'ancienne version (en cache), invité sur la nouvelle ; puis mise à jour automatique.
import { chromium } from 'playwright';
import path from 'path';
const dir = path.dirname(new URL(import.meta.url).pathname);
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--disable-features=WebRtcHideLocalIpsWithMdns', '--allow-loopback-in-peer-connection'] });
const mk = async (tag, url) => {
  const ctx = await browser.newContext({ viewport: { width: 640, height: 360 } });
  await ctx.addInitScript(() => { localStorage.setItem('sp_settings', JSON.stringify({ quality: 0 })); });
  const page = await ctx.newPage(); page.errors = [];
  page.on('pageerror', (e) => page.errors.push(`[${tag}] ` + e.message));
  await page.route('https://cdn.jsdelivr.net/npm/three@0.186.1/**', (route) => { const u = new URL(route.request().url()); route.fulfill({ path: path.join(dir, 'node_modules/three', u.pathname.replace('/npm/three@0.186.1/', '')), contentType: 'application/javascript' }); });
  await page.route('https://cdn.jsdelivr.net/npm/peerjs@1.5.5/**', (route) => route.fulfill({ path: path.join(dir, 'node_modules/peerjs/dist/peerjs.min.js'), contentType: 'application/javascript' }));
  await page.route('https://fonts.googleapis.com/**', (r) => r.fulfill({ body: '', contentType: 'text/css' }));
  await page.route('https://fonts.gstatic.com/**', (r) => r.abort());
  await page.goto(url); await page.waitForFunction(() => window.__spReady, null, { timeout: 120000 });
  return page;
};
const joinUI = (p, name, c) => p.evaluate(([name, c]) => { document.getElementById('joinButton').click(); document.getElementById('playerName').value = name; document.getElementById('sessionCode').value = c; document.getElementById('joinSubmit').click(); }, [name, c]);
const H = await mk('ancien hôte', 'file://' + path.join(dir, 'index_prev.html') + '?peer=127.0.0.1:9000');
const A = await mk('nouvel invité', 'http://127.0.0.1:8088/index.html?peer=127.0.0.1:9000&relay=ws://127.0.0.1:8883');
await joinUI(H, 'Hote', ''); await H.waitForFunction(() => SP.NET.active, null, { timeout: 30000 });
const code = await H.evaluate(() => SP.NET.code); console.log('code ancien hôte', code);
const t0 = Date.now(); await joinUI(A, 'Ami', code);
await A.waitForFunction(() => SP.NET.active || /Aucune|impossible/i.test(document.getElementById('joinStatus').textContent), null, { timeout: 40000 });
console.log('invité', ((Date.now() - t0) / 1000).toFixed(1), 's', JSON.stringify(await A.evaluate(() => [SP.NET.active, SP.NET.via, SP.NET.lobby.map((p) => p.name), document.getElementById('joinStatus').textContent])));
console.log('hôte voit', JSON.stringify(await H.evaluate(() => SP.NET.lobby.map((p) => p.name))));
// Mauvais code : message clair.
const B = await mk('invité 2', 'http://127.0.0.1:8088/index.html?peer=127.0.0.1:9000&relay=ws://127.0.0.1:8883');
const t1 = Date.now(); await joinUI(B, 'Autre', 'ZZZZZZ');
await B.waitForFunction(() => /Aucune|impossible/i.test(document.getElementById('joinStatus').textContent), null, { timeout: 40000 });
console.log('mauvais code', ((Date.now() - t1) / 1000).toFixed(1), 's :', await B.evaluate(() => document.getElementById('joinStatus').textContent));
// Mise à jour automatique : version.json annonce 9.9.
const C = await (await browser.newContext()).newPage();
await C.route('https://cdn.jsdelivr.net/npm/three@0.186.1/**', (route) => { const u = new URL(route.request().url()); route.fulfill({ path: path.join(dir, 'node_modules/three', u.pathname.replace('/npm/three@0.186.1/', '')), contentType: 'application/javascript' }); });
await C.route('https://fonts.googleapis.com/**', (r) => r.fulfill({ body: '', contentType: 'text/css' }));
await C.route('**/version.json*', (r) => r.fulfill({ body: '{"v":"9.9"}', contentType: 'application/json' }));
await C.goto('http://127.0.0.1:8088/index.html?vcheck=1'); await C.waitForURL(/v=9\.9/, { timeout: 120000 }).catch(() => {});
console.log('mise à jour ->', C.url());
console.log('erreurs', [...H.errors, ...A.errors, ...B.errors]);
await browser.close();
