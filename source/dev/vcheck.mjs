import { chromium } from 'playwright';
import path from 'path';
const dir = path.dirname(new URL(import.meta.url).pathname);
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const ctx = await browser.newContext({ viewport: { width: 640, height: 360 } });
await ctx.addInitScript(() => { localStorage.setItem('sp_settings', JSON.stringify({ quality: 0 })); });
const C = await ctx.newPage(); const errs = []; C.on('pageerror', (e) => errs.push(e.message));
await C.route('https://cdn.jsdelivr.net/npm/three@0.186.1/**', (route) => { const u = new URL(route.request().url()); route.fulfill({ path: path.join(dir, 'node_modules/three', u.pathname.replace('/npm/three@0.186.1/', '')), contentType: 'application/javascript' }); });
await C.route('https://fonts.googleapis.com/**', (r) => r.fulfill({ body: '', contentType: 'text/css' }));
await C.route('https://fonts.gstatic.com/**', (r) => r.abort());
let hits = 0; await C.route('**/version.json*', (r) => { hits++; r.fulfill({ body: '{"v":"9.9"}', contentType: 'application/json' }); });
C.on('framenavigated', (f) => { if (f === C.mainFrame()) console.log('navigation ->', f.url()); });
await C.goto('http://127.0.0.1:8088/index.html?vcheck=1');
await C.waitForURL(/v=9\.9/, { timeout: 180000 }).catch((e) => console.log('pas de redirection', e.message.slice(0, 80)));
await C.waitForTimeout(3000);
console.log('version.json demandé', hits, 'fois ; url finale', C.url(), 'erreurs', errs);
// Deuxième chargement déjà en ?v=9.9 : pas de boucle.
await browser.close();
