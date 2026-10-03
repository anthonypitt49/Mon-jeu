import { chromium } from 'playwright';
import path from 'path';
const dir = path.dirname(new URL(import.meta.url).pathname);
const mapId = process.argv[2] || 'poste7', q = +(process.argv[3] ?? 1);
const views = JSON.parse(process.argv[4] || '[]');
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const ctx = await browser.newContext({ viewport: { width: 800, height: 450 } });
await ctx.addInitScript((q) => { localStorage.setItem('sp_settings', JSON.stringify({ quality: q })); }, q);
const page = await ctx.newPage(); const errors = []; page.on('pageerror', (e) => errors.push(e.message));
await page.route('https://cdn.jsdelivr.net/npm/three@0.186.1/**', (route) => { const u = new URL(route.request().url()); route.fulfill({ path: path.join(dir, 'node_modules/three', u.pathname.replace('/npm/three@0.186.1/', '')), contentType: 'application/javascript' }); });
await page.route('https://fonts.googleapis.com/**', (r) => r.fulfill({ body: '', contentType: 'text/css' }));
await page.route('https://fonts.gstatic.com/**', (r) => r.abort());
const t0 = Date.now();
await page.goto('http://127.0.0.1:8088/index.html#carte=' + mapId); await page.waitForFunction(() => window.__spReady, null, { timeout: 120000 });
const load = ((Date.now() - t0) / 1000).toFixed(1);
await page.evaluate(() => document.getElementById('soloButton').click());
const res = await page.evaluate((views) => {
  const r = SP.R.renderer, out = [];
  const vs = views.length ? views : [[SP.P.pos.x, 0, SP.P.pos.z, SP.P.yaw, 0], [SP.P.pos.x, 0, SP.P.pos.z, SP.P.yaw + Math.PI, 0]];
  for (const [x, y, z, yaw, pitch] of vs) { SP.P.pos.set(x, y, z); SP.P.yaw = yaw; SP.P.pitch = pitch; SP.updatePlayer(0.016); r.info.autoReset = false; r.info.reset(); SP.renderFrame(1); out.push({ calls: r.info.render.calls, tris: r.info.render.triangles }); r.info.autoReset = true; }
  return { views: out, geos: r.info.memory.geometries, tex: r.info.memory.textures, progs: r.info.programs.length, meshes: (() => { let n = 0; SP.R.scene.traverse((o) => { if (o.isMesh) n++; }); return n; })() };
}, views);
console.log(mapId, 'q' + q, 'load', load + 's', JSON.stringify(res), 'errors', errors.length);
await browser.close();
