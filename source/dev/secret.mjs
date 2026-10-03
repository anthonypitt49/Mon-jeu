import { chromium } from 'playwright';
import path from 'path';
const dir = path.dirname(new URL(import.meta.url).pathname);
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] });
let tot = 0;
for (const id of ['poste7', 'cite', 'penitencier', 'filon']) {
  const ctx = await browser.newContext({ viewport: { width: 800, height: 450 } });
  await ctx.addInitScript(() => { localStorage.setItem('sp_settings', JSON.stringify({ quality: 0 })); });
  const page = await ctx.newPage(); const errors = []; page.on('pageerror', (e) => errors.push(e.message));
  await page.route('https://cdn.jsdelivr.net/npm/three@0.186.1/**', (route) => { const u = new URL(route.request().url()); route.fulfill({ path: path.join(dir, 'node_modules/three', u.pathname.replace('/npm/three@0.186.1/', '')), contentType: 'application/javascript' }); });
  await page.route('https://fonts.googleapis.com/**', (r) => r.fulfill({ body: '', contentType: 'text/css' }));
  await page.goto('http://127.0.0.1:8088/index.html#carte=' + id); await page.waitForFunction(() => window.__spReady, null, { timeout: 120000 });
  await page.evaluate(() => document.getElementById('soloButton').click());
  const r = await page.evaluate(() => {
    const { G, P } = SP; P.hp = P.maxHp = 1e9; G.me().points = 1e6; SP.sim(1); for (const d of SP.MAP.doors) G.interact(P.id, 'door', d.id); SP.sim(1);
    const out = { spots: SP.SECRET.meshes.map((g) => [+g.position.x.toFixed(1), +g.position.z.toFixed(1), SP.MAP.zone[Math.floor(g.position.z / 2) * SP.MAPW() + Math.floor(g.position.x / 2)]]), cands: [], song: 0, tips: [] };
    SP.Sfx.init?.(); const sg = SP.Sfx.song.bind(SP.Sfx); SP.Sfx.song = () => { out.song = sg(); return out.song; };
    SP.SECRET.meshes.forEach((g, i) => { P.pos.set(g.position.x + 0.5, 0, g.position.z); SP.sim(0.3); const c = SP.INTERACT_CUR(); out.cands.push(c && c.kind + ':' + c.holdTime); G.interact(P.id, 'secret', i); SP.sim(0.3); });
    out.state = SP.SECRET.got.join(''); localStorage.removeItem('sp_tips'); SP.sim(5); SP.tipsTick(); out.tips = document.getElementById('tip').className + ' | ' + document.getElementById('tip').textContent; out.banner = document.getElementById('bannerTitle').textContent; out.tipEl = document.getElementById('tip').textContent;
    return out;
  });
  console.log(id, JSON.stringify(r), 'errors', errors.length, errors.slice(0, 2)); tot += errors.length + (r.state === '111' && r.song > 40 ? 0 : 1);
  await ctx.close();
}
console.log('ERRORS', tot);
await browser.close();
