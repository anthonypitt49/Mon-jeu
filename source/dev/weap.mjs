import { chromium } from 'playwright';
import path from 'path';
const dir = path.dirname(new URL(import.meta.url).pathname);
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await (await browser.newContext({ viewport: { width: 800, height: 450 } })).newPage(); const errors = []; page.on('pageerror', (e) => errors.push(e.message));
await page.addInitScript(() => localStorage.setItem('sp_settings', JSON.stringify({ quality: 0 })));
await page.route('https://cdn.jsdelivr.net/npm/three@0.186.1/**', (route) => { const u = new URL(route.request().url()); route.fulfill({ path: path.join(dir, 'node_modules/three', u.pathname.replace('/npm/three@0.186.1/', '')), contentType: 'application/javascript' }); });
await page.route('https://fonts.googleapis.com/**', (r) => r.fulfill({ body: '', contentType: 'text/css' }));
await page.route('https://fonts.gstatic.com/**', (r) => r.abort());
await page.goto('http://127.0.0.1:8088/index.html'); await page.waitForFunction(() => window.__spReady, null, { timeout: 120000 });
await page.evaluate(() => document.getElementById('soloButton').click());
const r = await page.evaluate(() => {
  const { G, P } = SP; SP.sim(0.5); const out = {};
  const inv = () => P.weapons.map((w) => `${w.key}${w.up ? '+' : ''}:${w.mag}/${w.reserve}`).join(' ') + ` slot${P.slot}`;
  P.weapons = [{ key: 'smg', up: false, mag: 32, reserve: 192 }, { key: 'shotgun', up: true, mag: 1, reserve: 3 }]; P.slot = 1; SP.switchWeapon(1);
  out.before = inv();
  // Solo, Second Souffle : à terre puis relevé seul.
  P.perks.add('revive'); G.me().perks.add('revive'); P.hp = 1; SP.G.damagePlayer(G.me(), 50, { pos: P.pos }); out.down = inv(); SP.sim(5); out.selfRevived = inv() + (P.down ? ' DOWN' : '');
  // Co-op : vidé de son sang puis retour à la manche suivante.
  G.solo = false; P.hp = 1; SP.G.damagePlayer(G.me(), 50, { pos: P.pos }); P.bleed = 0.1; SP.sim(0.5); out.dead = P.dead + ' ' + inv();
  G.applyEvent('round', { n: G.round + 1 }); out.respawn = inv() + (P.dead ? ' DEAD' : '');
  return out;
});
console.log(JSON.stringify(r, null, 1), 'errors', errors);
await browser.close();
