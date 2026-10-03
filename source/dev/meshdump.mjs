import { chromium } from 'playwright';
import path from 'path';
const dir = path.dirname(new URL(import.meta.url).pathname);
const mapId = process.argv[2] || 'cite';
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const ctx = await browser.newContext({ viewport: { width: 800, height: 450 } });
await ctx.addInitScript(() => { localStorage.setItem('sp_settings', JSON.stringify({ quality: 1 })); });
const page = await ctx.newPage();
await page.route('https://cdn.jsdelivr.net/npm/three@0.186.1/**', (route) => { const u = new URL(route.request().url()); route.fulfill({ path: path.join(dir, 'node_modules/three', u.pathname.replace('/npm/three@0.186.1/', '')), contentType: 'application/javascript' }); });
await page.route('https://fonts.googleapis.com/**', (r) => r.fulfill({ body: '', contentType: 'text/css' }));
await page.route('https://fonts.gstatic.com/**', (r) => r.abort());
await page.goto('http://127.0.0.1:8088/index.html#carte=' + mapId); await page.waitForFunction(() => window.__spReady, null, { timeout: 120000 });
const res = await page.evaluate(() => {
  const cats = {};
  SP.R.scene.traverse((o) => {
    if (!o.isMesh && !o.isSprite && !o.isPoints && !o.isLine) return;
    let top = o; const chain = []; while (top.parent && top.parent !== SP.R.scene) { top = top.parent; }
    const dyn = (() => { for (let p = o; p; p = p.parent) if (p.userData.dynamic) return 'dyn'; return 'stat'; })();
    const k = `${o.type}|${dyn}|${o.isInstancedMesh ? 'inst' : ''}|${o.geometry?.attributes?.color ? 'vc' : ''}|top:${top === o ? 'self' : top.type + top.children.length}`;
    cats[k] = (cats[k] || 0) + 1;
  });
  const mats = {};
  for (const o of SP.R.scene.children) if (o.isMesh && !o.isInstancedMesh && !o.geometry.attributes.color) { const m = o.material, k = `${m.type} c=${m.color?.getHexString()} map=${m.map ? (m.map.image?.width || '?') : '-'} em=${m.emissive?.getHexString() || ''} sh=${o.castShadow} v=${o.geometry.attributes.position.count}`; mats[k] = (mats[k] || 0) + 1; }
  return Object.entries(cats).sort((a, b) => b[1] - a[1]).slice(0, 12).concat([['---', 0]], Object.entries(mats).sort((a, b) => b[1] - a[1]).slice(0, 200));
});
for (const [k, n] of res) console.log(n, k);
await browser.close();
