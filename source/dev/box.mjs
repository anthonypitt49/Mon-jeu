import { chromium } from 'playwright';
import path from 'path';
const dir = path.dirname(new URL(import.meta.url).pathname);
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await (await browser.newContext({ viewport: { width: 800, height: 450 } })).newPage(); const errors = []; page.on('pageerror', (e) => errors.push(e.message));
await page.addInitScript(() => localStorage.setItem('sp_settings', JSON.stringify({ quality: 0 })));
await page.route('https://cdn.jsdelivr.net/npm/three@0.186.1/**', (route) => { const u = new URL(route.request().url()); route.fulfill({ path: path.join(dir, 'node_modules/three', u.pathname.replace('/npm/three@0.186.1/', '')), contentType: 'application/javascript' }); });
await page.route('https://fonts.googleapis.com/**', (r) => r.fulfill({ body: '', contentType: 'text/css' }));
await page.route('https://fonts.gstatic.com/**', (r) => r.abort());
await page.goto('http://127.0.0.1:8088/' + (process.env.FILE || 'index.html')); await page.waitForFunction(() => window.__spReady, null, { timeout: 120000 });
await page.evaluate(() => document.getElementById('soloButton').click());
const r = await page.evaluate(() => {
  const { G, P } = SP, W = window.SP.WORLD || null;
  const kids = () => SP.G.box && SP.boxSpots().map((s) => s.group.children.length).join(',');
  P.hp = P.maxHp = 1e9; SP.sim(0.5); const base = kids(); const out = { base };
  // 1. Tirage en cours puis fin de partie et nouvelle partie.
  G.me().points = 99999; G.interact(P.id, 'box'); SP.sim(2); out.rolling = kids();
  SP.backToMenu(); document.getElementById('soloButton').click(); SP.sim(0.5); out.afterRestart = kids();
  // 2. Tirage vide : la caisse part ailleurs.
  G.me().points = 99999; G.box.uses = 10; const rnd = Math.random; Math.random = () => 0.01; G.interact(P.id, 'box'); Math.random = rnd; SP.sim(4.4); out.moving = G.box.state + ':' + kids(); SP.sim(3.5); out.moved = G.box.state + '@' + G.box.loc + ':' + kids();
  // 3. Tirage normal, offre non prise (délai), fermeture.
  G.box.uses = 0; G.interact(P.id, 'box'); SP.sim(4.4); out.offer = G.box.state + ':' + kids(); SP.sim(10.5); out.closed = G.box.state + ':' + kids();
  return out;
});
console.log(JSON.stringify(r), 'errors', errors);
await browser.close();
