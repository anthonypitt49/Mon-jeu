// Relais public sur le port 443 : connexion, latence et débit avec un trafic de partie (deux salles du même code dans la
// page : A publie 30 messages/s de 1,5 à 4 Ko pendant 20 s, B les reçoit). Usage : node relais443.mjs [url du relais]
// (le conteneur passe par un mandataire qui réécrit les certificats : --ignore-certificate-errors, tests seulement)
import { chromium } from 'playwright';
import path from 'path';
const dir = path.dirname(new URL(import.meta.url).pathname);
const url = process.argv[2] || 'wss://iot.coreflux.cloud:443/mqtt';
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--ignore-certificate-errors'] });
const ctx = await browser.newContext({ viewport: { width: 640, height: 360 } });
await ctx.addInitScript(() => { localStorage.setItem('sp_settings', JSON.stringify({ quality: 0 })); });
const page = await ctx.newPage(); const errors = []; page.on('pageerror', (e) => errors.push(e.message));
await page.route('https://cdn.jsdelivr.net/npm/three@0.186.1/**', (route) => { const u = new URL(route.request().url()); route.fulfill({ path: path.join(dir, 'node_modules/three', u.pathname.replace('/npm/three@0.186.1/', '')), contentType: 'application/javascript' }); });
await page.route('https://fonts.googleapis.com/**', (r) => r.fulfill({ body: '', contentType: 'text/css' }));
await page.route('https://fonts.gstatic.com/**', (r) => r.abort());
await page.goto((process.env.WEB || 'http://127.0.0.1:8088') + '/index.html?relay=' + encodeURIComponent(url) + '#carte=cite');
await page.waitForFunction(() => window.__spReady, null, { timeout: 400000 });
const r = await page.evaluate(async () => {
  const { RELAY } = SP, t0 = performance.now();
  const a = await RELAY.open('testA' + Math.random().toString(36).slice(2, 6), null, 0, 9000);
  const tA = performance.now() - t0;
  const b = (await RELAY.open('testB' + Math.random().toString(36).slice(2, 6), a.code, 0, 9000)).room;
  const lat = []; let got = 0, bytes = 0;
  b.on('c', (m) => { got++; lat.push(performance.now() - m.data.t); bytes += JSON.stringify(m.data).length; });
  await new Promise((r) => setTimeout(r, 500));
  let sent = 0; const pad = 'x'.repeat(1500);
  await new Promise((res) => { const iv = setInterval(() => { for (let k = 0; k < 3; k++) { a.room.emit('c', { t: performance.now(), n: sent++, p: pad + (k ? pad : '') }); } if (sent >= 600) { clearInterval(iv); setTimeout(res, 3000); } }, 100); });
  lat.sort((x, y) => x - y);
  a.room.leave(); b.leave();
  return { connexion_ms: Math.round(tA), code: a.code, envoyes: sent, recus: got, ko_recus: Math.round(bytes / 1024), latence_mediane: Math.round(lat[lat.length >> 1] || -1), latence_p95: Math.round(lat[Math.floor(lat.length * 0.95)] || -1) };
});
console.log(url, JSON.stringify(r));
console.log('ERRORS', errors.length, errors.slice(0, 3));
await browser.close();
