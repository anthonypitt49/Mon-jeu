import { chromium } from 'playwright';
import path from 'path';
const dir = path.dirname(new URL(import.meta.url).pathname);
const out = path.join(dir, 'shots');
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const ctx = await browser.newContext({ viewport: { width: 1024, height: 576 } });
await ctx.addInitScript(() => { localStorage.setItem('sp_settings', JSON.stringify({ quality: +(new URLSearchParams(location.search).get('q') ?? 2) })); });
const page = await ctx.newPage();
const errors = [];
page.on('console', (m) => { if (['error', 'warning'].includes(m.type())) errors.push(`[${m.type()}] ${m.text()}`); });
page.on('pageerror', (e) => errors.push('[pageerror] ' + e.message + '\n' + e.stack));
await page.route('https://cdn.jsdelivr.net/npm/three@0.186.1/**', (route) => { const u = new URL(route.request().url()); route.fulfill({ path: path.join(dir, 'node_modules/three', u.pathname.replace('/npm/three@0.186.1/', '')), contentType: 'application/javascript' }); });
await page.route('https://fonts.googleapis.com/**', (r) => r.fulfill({ body: '', contentType: 'text/css' }));
await page.route('https://fonts.gstatic.com/**', (r) => r.abort());
await page.goto('file://' + path.join(dir, 'index.html') + '?q=2');
await page.waitForFunction(() => window.__spReady, null, { timeout: 120000 });
const ev = (f, a) => page.evaluate(f, a);
const shot = async (name) => { await ev(() => { for (let i = 0; i < 2; i++) SP.renderFrame(performance.now() / 1000); }); await page.screenshot({ path: path.join(out, name + '.png') }); };
await page.waitForTimeout(1500);
await shot('20_menu');
await page.click('#soloButton');
await ev(() => { SP.P.hp = 1e9; SP.P.maxHp = 1e9; SP.sim(4); });
// Wait for zombies to tear barricade in bay 1 (tile 13,3) and look at it from inside.
await ev(() => SP.sim(12));
await ev(() => { SP.P.pos.set(26.2, 0, 11.4); SP.P.yaw = 0.15; SP.P.pitch = 0.12; SP.P.torch = true; SP.sim(0.1); });
console.log('cam21', JSON.stringify(await ev(() => ({ c: SP.R.camera.position.toArray(), r: SP.R.camera.rotation.x, p: SP.P.pos.toArray(), v: SP.P.vel.toArray(), pitch: SP.P.pitch, rec: SP.P.rec, down: SP.P.down, land: SP.P.land }))));
await shot('21_barricade');
console.log(JSON.stringify(await ev(() => SP.ZOMBIES.map((z) => [z.kind, z.state, z.pos.x.toFixed(1), z.pos.y.toFixed(1), z.pos.z.toFixed(1)]))));
// Close-up: place a zombie in front of the player in the main trench.
await ev(() => { SP.P.pos.set(40, 0, 14.5); SP.P.yaw = -Math.PI / 2; SP.P.pitch = 0.05; for (const z of SP.ZOMBIES) if (z.alive) { z.pos.set(43.5 + Math.random() * 3, 0, 13.2 + Math.random() * 2); z.state = 'move'; z.rise = 1; } SP.sim(0.4); });
await shot('22_closeup'); if (process.env.QUICK) { await browser.close(); process.exit(0); }
await ev(() => { SP.grantWeapon('smg', false); SP.sim(0.8); SP.INPUT.fire = true; SP.sim(0.12); });
await shot('23_firing');
await ev(() => { SP.INPUT.fire = false; SP.sim(1.5); });
await shot('24_after');
console.log('calls', JSON.stringify(await ev(() => { const r = SP.R.renderer; r.info.autoReset = false; r.info.reset(); r.render(SP.R.scene, SP.R.camera); const i = { calls: r.info.render.calls, tris: r.info.render.triangles, geos: r.info.memory.geometries, tex: r.info.memory.textures, progs: r.info.programs.length }; r.info.autoReset = true; return i; })));
console.log('ERRORS:', errors.length); errors.slice(0, 20).forEach((e) => console.log(e));
await browser.close();
