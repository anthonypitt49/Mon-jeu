// Audit (garde-fou) : quels objets référencés par le jeu (WORLD, portes, barricades, FX…) perdent des maillages dans la fusion statique ?
import { chromium } from 'playwright';
import path from 'path';
const dir = path.dirname(new URL(import.meta.url).pathname);
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const probe = async (mapId, nomerge) => {
  const ctx = await browser.newContext({ viewport: { width: 480, height: 270 } });
  await ctx.addInitScript(() => localStorage.setItem('sp_settings', JSON.stringify({ quality: 2 })));
  const page = await ctx.newPage();
  await page.route('https://cdn.jsdelivr.net/npm/three@0.186.1/**', (route) => { const u = new URL(route.request().url()); route.fulfill({ path: path.join(dir, 'node_modules/three', u.pathname.replace('/npm/three@0.186.1/', '')), contentType: 'application/javascript' }); });
  await page.route('https://fonts.googleapis.com/**', (r) => r.fulfill({ body: '', contentType: 'text/css' }));
  await page.goto('http://127.0.0.1:8088/index.html?' + (nomerge ? 'nomerge=1' : '') + '#carte=' + mapId); await page.waitForFunction(() => window.__spReady, null, { timeout: 120000 });
  const r = await page.evaluate(() => {
    const out = {}, seen = new Set();
    const count = (o) => { let n = 0; o.traverse((c) => { if (c.isMesh) n++; }); return n; };
    const walk = (v, p, depth) => {
      if (!v || typeof v !== 'object' || seen.has(v) || depth > 4) return; seen.add(v);
      if (v.isObject3D) { if (!v.isScene) out[p] = count(v); return; }
      if (Array.isArray(v)) v.slice(0, 200).forEach((x, i) => walk(x, p + '[' + i + ']', depth + 1));
      else for (const k of Object.keys(v)) { if (k === 'parent' || k === 'children') continue; walk(v[k], p + '.' + k, depth + 1); }
    };
    walk(SP.WORLD, 'WORLD', 0); walk(SP.MAP.doors, 'doors', 0); walk(SP.MAP.barricades, 'barr', 0); walk(SP.FX, 'FX', 0); walk(SP.G.box, 'box', 0); walk(SP.SECRET, 'SECRET', 0); walk(SP.TRAPS, 'TRAPS', 0);
    return out;
  });
  await ctx.close(); return r;
};
let bad = 0;
for (const m of (process.argv[2] || 'poste7,cite,penitencier,filon').split(',')) {
  const a = await probe(m, true), b = await probe(m, false);
  const lost = Object.keys(a).filter((k) => a[k] > 0 && (b[k] ?? 0) < a[k]).map((k) => `${k} ${a[k]}→${b[k] ?? 'absent'}`);
  bad += lost.filter((l) => !l.startsWith('WORLD.wallBuys')).length; // armes murales : fixes, fusion voulue
  console.log(m, 'objets suivis', Object.keys(a).length, 'ayant perdu des maillages', lost.length); lost.slice(0, 60).forEach((l) => console.log('   ', l));
}
console.log('ÉCARTS', bad);
await browser.close();
