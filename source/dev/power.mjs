// Partie simulée sur une carte : manches, portes, courant, atouts, caisse, établi, règles propres à la carte.
import { chromium } from 'playwright';
import path from 'path';
const dir = path.dirname(new URL(import.meta.url).pathname);
const mapId = process.argv[2] || 'cite';
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const ctx = await browser.newContext({ viewport: { width: 800, height: 450 } });
await ctx.addInitScript(() => { localStorage.setItem('sp_settings', JSON.stringify({ quality: 1 })); });
const page = await ctx.newPage(); const errors = [];
page.on('pageerror', (e) => errors.push('[pageerror] ' + e.message + '\n' + e.stack));
page.on('console', (m) => { if (m.type() === 'error') errors.push('[console] ' + m.text().slice(0, 300)); });
await page.route('https://cdn.jsdelivr.net/npm/three@0.186.1/**', (route) => { const u = new URL(route.request().url()); route.fulfill({ path: path.join(dir, 'node_modules/three', u.pathname.replace('/npm/three@0.186.1/', '')), contentType: 'application/javascript' }); });
await page.route('https://fonts.googleapis.com/**', (r) => r.fulfill({ body: '', contentType: 'text/css' }));
await page.route('https://fonts.gstatic.com/**', (r) => r.abort());
await page.goto('http://127.0.0.1:8088/index.html#carte=' + mapId); await page.waitForFunction(() => window.__spReady, null, { timeout: 120000 });
await page.evaluate(() => document.getElementById('soloButton').click());
const ev = (f, a) => page.evaluate(f, a);
const log = (...a) => console.log(...a);
const obj = () => ev(() => [document.getElementById('objectiveTitle').textContent, document.getElementById('objectiveText').textContent, document.getElementById('objectiveSub').textContent].join(' | '));
await ev(() => { SP.P.hp = SP.P.maxHp = 1e7; SP.G.me().points = 200000; for (const d of SP.MAP.doors) SP.G.interact(SP.P.id, 'door', d.id); SP.sim(4); });
log('obj0', await obj());
log('tiles', JSON.stringify(await ev(() => ({ s: SP.PWR.stage, t: SP.PWR.tiles, zones: SP.PWR.tiles.map((t) => SP.MAP.zone[t]), names: SP.pwrParts().map((p) => p.name) }))));
for (let i = 0; i < 3; i++) {
  const r = await ev((i) => { const w = SP.WORLD.pwrParts[i]; const p = w.g.position; SP.P.pos.set(p.x - 0.4, 0, p.z + 0.3); SP.sim(0.3); const c = SP.INTERACT_CUR(); SP.G.interact(SP.P.id, 'ppart', i); SP.sim(0.3); return { vis: w.g.visible, cand: c && c.kind + ':' + c.text, got: SP.PWR.got.join(''), s: SP.PWR.stage }; }, i);
  log('part', i, JSON.stringify(r), await obj());
}
log('gen', JSON.stringify(await ev(() => { const g = SP.WORLD.power.pos; SP.P.pos.set(g.x + SP.WORLD.power.face[0] * -1.0, 0, g.z + SP.WORLD.power.face[1] * -1.0); SP.sim(0.3); const c1 = SP.INTERACT_CUR(); SP.G.interact(SP.P.id, 'pinst'); SP.sim(0.2); const c2 = SP.INTERACT_CUR(); SP.G.interact(SP.P.id, 'pstart'); SP.sim(0.2); return { c1: c1 && c1.kind + ' ' + c1.holdTime, c2: c2 && c2.kind, s: SP.PWR.stage, power: SP.G.power }; })), await obj());
log('defend-away', JSON.stringify(await ev(() => { const g = SP.WORLD.power.pos; SP.P.pos.set(g.x + 30, 0, g.z + 30); SP.sim(5); return { p: SP.PWR.prog.toFixed(1), toSpawn: SP.G.toSpawn }; })));
log('defend-near', JSON.stringify(await ev(() => { const g = SP.WORLD.power.pos; let kills = 0; for (let t = 0; t < 50; t += 0.25) { SP.P.pos.set(g.x - SP.WORLD.power.face[0] * 1.2, 0, g.z - SP.WORLD.power.face[1] * 1.2); SP.sim(0.25); for (const z of SP.ZOMBIES) if (z.alive && z.state !== 'rise' && z.pos.distanceTo(SP.P.pos) < 5) { SP.G.applyDamage(z, 1e6, SP.P.id, { dir: new SP.THREE.Vector3(1, 0, 0) }); kills++; } if (SP.G.power) break; } return { p: SP.PWR.prog.toFixed(1), s: SP.PWR.stage, power: SP.G.power, kills, pts: SP.G.me().points }; })), await obj());
await ev(() => SP.sim(2)); log('after', await obj());
log('ERRORS', errors.length); errors.slice(0, 10).forEach((e) => log(e));
await browser.close();
