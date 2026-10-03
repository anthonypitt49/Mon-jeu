import { chromium } from 'playwright';
import path from 'path';
const dir = path.dirname(new URL(import.meta.url).pathname);
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await (await browser.newContext({ viewport: { width: 960, height: 540 } })).newPage(); const errors = []; page.on('pageerror', (e) => errors.push(e.message));
await page.addInitScript(() => localStorage.setItem('sp_settings', JSON.stringify({ quality: 1 })));
await page.route('https://cdn.jsdelivr.net/npm/three@0.186.1/**', (route) => { const u = new URL(route.request().url()); route.fulfill({ path: path.join(dir, 'node_modules/three', u.pathname.replace('/npm/three@0.186.1/', '')), contentType: 'application/javascript' }); });
await page.route('https://fonts.googleapis.com/**', (r) => r.fulfill({ body: '', contentType: 'text/css' }));
await page.route('https://fonts.gstatic.com/**', (r) => r.abort());
await page.goto('http://127.0.0.1:8088/' + (process.env.FILE || 'index.html')); await page.waitForFunction(() => window.__spReady, null, { timeout: 180000 });
await page.evaluate(() => document.getElementById('soloButton').click());
const kinds = [['corps', {}], ['tête', { head: true }], ['couteau', { melee: true }], ['explosion', { explosive: true }], ['sprinteur', {}, 5]];
const out = await page.evaluate((kinds) => {
  const { G, P } = SP; P.hp = P.maxHp = 1e9; SP.sim(0.5); G.toSpawn = 0; G.breakT = 1e9; for (const z of [...SP.ZOMBIES]) z.destroy();
  const res = [];
  for (const [name, info, spd] of kinds) {
    let travel = 0, peak = 0, rest = 0;
    for (let n = 0; n < 6; n++) {
      const z = SP.spawnTestZombie(40 + n * 2.5, 14); z.rise = 1; z.state = 'move'; z.yaw = Math.PI / 2 + Math.PI; // face au joueur (vers -x)
      if (spd) { z.vel.set(-spd, 0, 0); } else z.vel.set(-0.9, 0, 0);
      SP.sim(0.05);
      const p0 = z.pos.clone(); z.die(Object.assign({ dir: new SP.THREE.Vector3(1, 0, 0) }, info));
      let t = 0; for (; t < 4; t += 1 / 60) { z.animateDeath(1 / 60); const h = z.rag.p[0]; peak = Math.max(peak, h.y); }
      const h = z.rag.p[0]; travel = Math.max(travel, Math.hypot(h.x - p0.x, h.z - p0.z)); rest = Math.max(rest, h.y);
      z.destroy();
    }
    res.push(`${name}: déplacement max ${travel.toFixed(2)} m, bassin au plus haut ${peak.toFixed(2)} m, au repos ${rest.toFixed(2)} m`);
  }
  return res;
}, kinds);
console.log(out.join('\n'));
// Images d'une mort par balle (0,15 s, 0,5 s, 1,5 s).
await page.evaluate(() => { const { G, P } = SP; for (const z of [...SP.ZOMBIES]) z.destroy(); P.pos.set(36, 0, 14.5); P.yaw = Math.PI / 2; P.pitch = -0.1; SP.sim(0.1); window.__dz = SP.spawnTestZombie(33, 14.3); window.__dz.rise = 1; window.__dz.yaw = -Math.PI / 2; window.__dz.vel.set(1, 0, 0); SP.sim(0.05); window.__dz.die({ dir: new SP.THREE.Vector3(-1, 0, 0) }); });
for (const [t, n] of [[0.15, 'a'], [0.35, 'b'], [1.0, 'c']]) { await page.evaluate((t) => { const z = window.__dz; const target = t; while ((z.__t || 0) < target) { z.animateDeath(1 / 60); z.__t = (z.__t || 0) + 1 / 60; } SP.renderFrame(1); SP.renderFrame(2); }, t); await page.screenshot({ path: path.join(dir, `shots/95_death_${n}.png`) }); }
console.log('erreurs', errors); await browser.close();
