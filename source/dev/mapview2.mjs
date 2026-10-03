// Charge une carte (#carte=ID), relève les erreurs, prend des captures depuis des points de vue [x, y, z, yaw, pitch].
import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';
const dir = path.dirname(new URL(import.meta.url).pathname);
const id = process.argv[2] || 'cite', q = +(process.argv[3] ?? 2);
const views = JSON.parse(process.argv[4] || "[]"); const pre = process.argv[5] || "";
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const ctx = await browser.newContext({ viewport: { width: 960, height: 540 } });
await ctx.addInitScript((q) => { localStorage.setItem('sp_settings', JSON.stringify({ quality: q })); }, q);
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push('[pageerror] ' + e.message + '\n' + e.stack));
page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errors.push('[console] ' + m.text().slice(0, 300)); });
await page.route('https://cdn.jsdelivr.net/npm/three@0.186.1/**', (route) => { const u = new URL(route.request().url()); route.fulfill({ path: path.join(dir, 'node_modules/three', u.pathname.replace('/npm/three@0.186.1/', '')), contentType: 'application/javascript' }); });
await page.route('https://fonts.googleapis.com/**', (r) => r.fulfill({ body: '', contentType: 'text/css' }));
await page.route('https://fonts.gstatic.com/**', (r) => r.abort());
const t0 = Date.now();
await page.goto('file://' + path.join(dir, 'index.html') + '#carte=' + id);
await page.waitForFunction(() => window.__spReady || document.querySelector('#loadingLine span')?.textContent.includes('Impossible'), null, { timeout: 180000 });
if (!(await page.evaluate(() => !!window.__spReady))) { console.log('ÉCHEC', await page.evaluate(() => document.body.innerText.slice(0, 400))); for (const e of errors.slice(0, 8)) console.log(e.slice(0, 900)); process.exit(1); }
console.log('ready in', ((Date.now() - t0) / 1000).toFixed(1), 's', 'map', await page.evaluate(() => SP.MAP_ID()));
fs.mkdirSync(path.join(dir, 'shots'), { recursive: true });
await page.waitForTimeout(800);
await page.screenshot({ path: path.join(dir, 'shots', `${id}_menu.png`) });
const info = await page.evaluate(() => { const r = SP.R.renderer; SP.renderFrame(0); return { calls: r.info.render.calls, tris: r.info.render.triangles, geos: r.info.memory.geometries, tex: r.info.memory.textures, doors: SP.MAP.doors.length, bars: SP.MAP.barricades.length, props: SP.MAP.props.length }; });
console.log('menu render', JSON.stringify(info));
await page.evaluate(() => { document.querySelector('#soloButton').click(); });
await page.waitForTimeout(500);
await page.evaluate(() => { SP.P.hp = SP.P.maxHp = 1e6; SP.sim(1); });
if (pre) await page.evaluate(pre);
for (let i = 0; i < views.length; i++) {
  await page.evaluate(([x, y, z, yaw, pitch, tx, ty, tz]) => {
    SP.G.mode = 'playing'; for (const zb of [...SP.ZOMBIES]) zb.destroy?.();
    if (tx !== undefined) { SP.G.mode = 'paused'; const c = SP.R.camera; c.position.set(x, y, z); c.fov = 70; c.updateProjectionMatrix(); c.lookAt(tx, ty, tz); const md = SP.R.lights.moon, dv = md.position.clone().sub(md.target.position).normalize(); md.target.position.set(tx, 0, tz); md.position.copy(md.target.position).addScaledVector(dv, 60); md.target.updateMatrixWorld(); document.getElementById('hud').classList.add('hidden'); }
    else { SP.P.pos.set(x, y, z); SP.P.yaw = yaw; SP.P.pitch = pitch || 0; SP.P.vel.set(0, 0, 0); SP.updatePlayer(0.016); SP.P.pos.set(x, y, z); SP.updatePlayer(0.016); document.getElementById('hud').classList.remove('hidden'); }
    SP.renderFrame(1); }, views[i]);
  await page.waitForTimeout(250);
  const st = await page.evaluate(() => { const r = SP.R.renderer; return { calls: r.info.render.calls, tris: r.info.render.triangles }; });
  await page.screenshot({ path: path.join(dir, 'shots', `${id}_w${i}.png`) });
  console.log('view', i, JSON.stringify(st));
}
console.log('ERRORS', errors.length); for (const e of errors.slice(0, 12)) console.log(e.slice(0, 600));
await browser.close();
