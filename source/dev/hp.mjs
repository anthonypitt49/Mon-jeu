import { chromium } from 'playwright';
import path from 'path';
const dir = path.dirname(new URL(import.meta.url).pathname);
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const out = [];
for (const diff of [0, 1, 2]) {
  const page = await (await browser.newContext({ viewport: { width: 480, height: 270 } })).newPage(); const errors = []; page.on('pageerror', (e) => errors.push(e.message));
  await page.addInitScript((d) => localStorage.setItem('sp_settings', JSON.stringify({ quality: 0, diff: d })), diff);
  await page.route('https://cdn.jsdelivr.net/npm/three@0.186.1/**', (route) => { const u = new URL(route.request().url()); route.fulfill({ path: path.join(dir, 'node_modules/three', u.pathname.replace('/npm/three@0.186.1/', '')), contentType: 'application/javascript' }); });
  await page.route('https://fonts.googleapis.com/**', (r) => r.fulfill({ body: '', contentType: 'text/css' }));
  await page.route('https://fonts.gstatic.com/**', (r) => r.abort());
  await page.goto('http://127.0.0.1:8088/index.html'); await page.waitForFunction(() => window.__spReady, null, { timeout: 180000 });
  await page.evaluate(() => document.getElementById('soloButton').click());
  out.push(await page.evaluate(() => {
    const { G, P } = SP; SP.sim(0.3); G.toSpawn = 0; G.breakT = 1e9; for (const z of [...SP.ZOMBIES]) z.destroy();
    const hp0 = P.hp; let hits = 0;
    const z = SP.spawnTestZombie(P.pos.x + 1.0, P.pos.z); z.rise = 1; z.state = 'move';
    for (let t = 0; t < 30 && !P.down; t += 0.05) { const before = P.hp; P.regenT = 99; SP.sim(0.05); if (P.hp < before) hits++; }
    const zhp = G.roundParams(10).zHp;
    return `${SP.G.diff}: vie ${hp0}, coups avant d'être à terre ${hits}${P.down ? '' : ' (pas à terre)'}, PV infecté manche 10 : ${zhp}`;
  }) + (errors.length ? ' erreurs ' + errors.join(' | ') : ''));
  await page.context().close();
}
console.log(out.join('\n')); await browser.close();
