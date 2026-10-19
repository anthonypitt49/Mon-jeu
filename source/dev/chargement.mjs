// Écran de chargement à l'œil : captures de la page entière pendant le chargement, à l'accueil, puis au lancement d'une
// partie (carton de la carte), une fois en jeu, puis au choix d'une autre carte (image de cette carte). Usage : node chargement.mjs <carte> [qualité=2] ; shots/chargement_<carte>.jpg.
import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';
const dir = path.dirname(new URL(import.meta.url).pathname), id = process.argv[2] || 'poste7', q = +(process.argv[3] ?? 2);
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
await ctx.addInitScript((q) => localStorage.setItem('sp_settings', JSON.stringify({ quality: q })), q);
const page = await ctx.newPage(); const errors = []; page.on('pageerror', (e) => errors.push(e.message));
await page.route('https://cdn.jsdelivr.net/npm/three@0.186.1/**', (route) => { const u = new URL(route.request().url()); route.fulfill({ path: path.join(dir, 'node_modules/three', u.pathname.replace('/npm/three@0.186.1/', '')), contentType: 'application/javascript' }); });
await page.route('https://cdn.jsdelivr.net/npm/n8ao@2.0.1/**', (route) => route.fulfill({ path: path.join(dir, 'node_modules/n8ao/dist/N8AO.js'), contentType: 'application/javascript' }));
await page.route('https://fonts.googleapis.com/**', (r) => r.fulfill({ body: '', contentType: 'text/css' }));
await page.route('https://fonts.gstatic.com/**', (r) => r.abort());
const shots = [];
const snap = async (label) => shots.push([label, await page.screenshot({ type: 'jpeg', quality: 80 })]);
await page.goto((process.env.WEB || 'http://127.0.0.1:8088') + '/index.html#carte=' + id);
await page.waitForTimeout(4000); await snap('chargement (4 s)');
await page.waitForFunction(() => /TEXTURES|LEVÉE|OMBRAGE|PRÉPARATION/.test(document.getElementById('loaderStep')?.textContent || ''), null, { timeout: 200000 }).catch(() => {}); await snap('chargement (' + (await page.$eval('#loaderStep', (e) => e.textContent)) + ')');
await page.waitForFunction(() => window.__spReady, null, { timeout: 400000 }); await page.waitForTimeout(1500); await snap('accueil');
await page.evaluate(() => document.getElementById('soloButton').click()); await page.waitForTimeout(250); await snap('lancement (carton)');
await page.waitForTimeout(2500); await snap('en jeu');
// Choix d'une autre carte (comme switchMap) : l'écran de chargement montre cette carte, pas l'image commune.
const other = id === 'filon' ? 'cite' : 'filon';
await page.evaluate((o) => { sessionStorage.setItem('sp_loadMap', o); sessionStorage.setItem('sp_loadMapName', SP.MAPS[o].name); location.hash = 'carte=' + o; location.reload(); }, other);
await page.waitForTimeout(9000); await snap('choix de la carte ' + other);
const html = `<body style="margin:0;background:#000;display:grid;grid-template-columns:1fr 1fr;gap:4px">${shots.map(([l, b]) => `<div style="position:relative"><img style="width:100%;display:block" src="data:image/jpeg;base64,${b.toString('base64')}"><b style="position:absolute;left:0;top:0;background:#000a;color:#ff0;font:15px monospace;padding:2px 6px">${l}</b></div>`).join('')}</body>`;
const p2 = await ctx.newPage(); await p2.setViewportSize({ width: 1280, height: 720 * Math.ceil(shots.length / 2) / 2 + 8 }); await p2.setContent(html); await p2.waitForTimeout(300);
fs.mkdirSync(path.join(dir, 'shots'), { recursive: true }); await p2.screenshot({ path: path.join(dir, 'shots', `chargement_${id}.jpg`), type: 'jpeg', quality: 80, fullPage: true });
for (const e of errors) console.log('[pageerror]', e);
console.log(`shots/chargement_${id}.jpg ; ERRORS ${errors.length}`);
await browser.close();
