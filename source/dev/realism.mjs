// Démonstration de réalisme : tirs sur un infecté (sang, réactions, mort), puis sur un mur (impacts) ; captures à chaque étape.
import { chromium } from 'playwright';
import path from 'path';
const dir = path.dirname(new URL(import.meta.url).pathname);
const mapId = process.argv[2] || 'cite', q = +(process.argv[3] ?? 2), tag = process.argv[4] || '';
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const ctx = await browser.newContext({ viewport: { width: 960, height: 540 } });
await ctx.addInitScript((q) => { localStorage.setItem('sp_settings', JSON.stringify({ quality: q })); localStorage.setItem('sp_tips', JSON.stringify({ repair: 1, objective: 1, power: 1, ping: 1, perks: 1, box: 1, down: 1 })); }, q);
const page = await ctx.newPage(); const errors = []; page.on('pageerror', (e) => errors.push(e.message));
await page.route('https://cdn.jsdelivr.net/npm/three@0.186.1/**', (route) => { const u = new URL(route.request().url()); route.fulfill({ path: path.join(dir, 'node_modules/three', u.pathname.replace('/npm/three@0.186.1/', '')), contentType: 'application/javascript' }); });
await page.route('https://fonts.googleapis.com/**', (r) => r.fulfill({ body: '', contentType: 'text/css' }));
await page.goto('http://127.0.0.1:8088/index.html#carte=' + mapId); await page.waitForFunction(() => window.__spReady, null, { timeout: 120000 });
await page.evaluate(() => document.getElementById('soloButton').click());
const shot = async (n) => { await page.evaluate(() => { SP.renderFrame(1); }); await page.waitForTimeout(200); await page.screenshot({ path: path.join(dir, 'shots', `real_${mapId}${tag}_${n}.png`) }); };
await page.evaluate(() => {
  const { G, P } = SP; P.hp = P.maxHp = 1e9; G.toSpawn = 0; G.breakT = 1e9; SP.sim(6); for (const z of [...SP.ZOMBIES]) z.destroy(); document.getElementById('locIntro')?.remove?.();
  SP.grantWeapon?.('ar', false);
  // Cherche un mur à 3–7 m devant (rayon horizontal à hauteur d'œil).
  const c = SP.R.camera.position; let best = null;
  for (let k = 0; k < 24 && !best; k++) { const yaw = P.yaw + k * Math.PI * 2 / 24, d = new SP.THREE.Vector3(-Math.sin(yaw), 0, -Math.cos(yaw)); const w = SP.rayWorld(c.clone(), d, 9); if (w && w.dist > 2.5 && w.dist < 9 && Math.abs(w.normal.y) < 0.3) best = { yaw, d, w }; }
  window.__wall = best; if (!best) return;
  P.yaw = best.yaw; P.pitch = 0; SP.sim(0.05);
  const zd = best.w.dist - 1.2; window.__z = SP.spawnTestZombie(P.pos.x + best.d.x * zd, P.pos.z + best.d.z * zd); window.__z.rise = 1; window.__z.hp = window.__z.maxHp = 200; window.__z.vel.set(0, 0, 0); window.__z.state = 'idle'; SP.sim(2.2);
  window.aim = (part) => { const z = window.__z; z.updateHitboxes(); const c = SP.R.camera.position, h = z.hit[part].c; const dx = h.x - c.x, dy = h.y - c.y, dz = h.z - c.z; P.yaw = Math.atan2(-dx, -dz); P.pitch = Math.atan2(dy, Math.hypot(dx, dz)); P.rec.p = P.rec.y = 0; P.bloom = 0; SP.sim(0.02); };
  window.fire = (hold = 0.08) => { SP.INPUT.firePressed = true; SP.INPUT.fire = true; SP.sim(hold); SP.INPUT.fire = false; };
});
console.log('mur', JSON.stringify(await page.evaluate(() => window.__wall ? { dist: +window.__wall.w.dist.toFixed(2), mat: window.__wall.w.mat } : null)));
await page.evaluate(() => { if (!window.__z) return; const w = window.__wall, zd = w.w.dist - 1.0; for (let i = 0; i < 4 && window.__z.alive; i++) { window.__z.pos.set(SP.P.pos.x + w.d.x * zd, window.__z.pos.y, SP.P.pos.z + w.d.z * zd); window.__z.vel.set(0, 0, 0); aim(1); fire(); SP.sim(0.12); } if (window.__z.alive) SP.G.applyDamage(window.__z, 1e6, SP.P.id, { dir: w.d.clone() }); SP.sim(2.2); SP.P.yaw = w.yaw; SP.P.pitch = 0.02; SP.sim(0.05); });
await shot('1_eclaboussure');
console.log('décalques', JSON.stringify(await page.evaluate(() => { const r = {}; for (const d of SP.FX.decals) if (d.m.visible) { const k = Object.entries(SP.FX.decalMats).find(([, m]) => m === d.m.material)?.[0]; r[k] = (r[k] || 0) + 1; } return r; })));
await page.evaluate(() => { const { P } = SP; P.yaw += 0.35; P.pitch = 0; SP.INPUT.firePressed = true; SP.INPUT.fire = true; for (let t = 0; t < 1; t += 0.05) { P.rec.p = P.rec.y = 0; SP.sim(0.05); } SP.INPUT.fire = false; SP.sim(0.05); });
await shot('2_rafale');
await page.evaluate(() => { SP.sim(6); });
await shot('3_impacts');
// Flaque sous le corps : on s'approche et on regarde le sol.
console.log('flaque', JSON.stringify(await page.evaluate(() => {
  const bl = SP.FX.decals.filter((d) => d.m.visible && d.m.material === SP.FX.decalMats.blood && new SP.THREE.Vector3(0, 0, 1).applyQuaternion(d.m.quaternion).y > 0.9).sort((a, b) => b.m.scale.x - a.m.scale.x)[0]; if (!bl) return null;
  const p = bl.m.position, { P } = SP, dx = P.pos.x - p.x, dz = P.pos.z - p.z, L = Math.hypot(dx, dz) || 1; P.pos.set(p.x + dx / L * 2.2, P.pos.y, p.z + dz / L * 2.2); P.yaw = Math.atan2(dx, dz); P.pitch = -0.6; SP.sim(0.05);
  return { size: +bl.m.scale.x.toFixed(2), y: +p.y.toFixed(3), at: [+p.x.toFixed(1), +p.z.toFixed(1)], me: [+P.pos.x.toFixed(1), +P.pos.z.toFixed(1)] };
})));
await shot('6_flaque');
if (mapId === 'poste7' || mapId === 'filon') {
  await page.evaluate(() => { const { P } = SP; P.yaw += Math.PI; SP.INPUT.keys.add('KeyW'); SP.sim(3); SP.INPUT.keys.delete('KeyW'); SP.sim(0.2); P.yaw += Math.PI; P.pitch = -0.75; SP.sim(0.05); });
  await page.evaluate(() => { SP.P.torch = false; SP.sim(0.1); });
  await shot('4_empreintes');
  await page.evaluate(() => { SP.P.torch = true; SP.sim(0.1); });
  await shot('5_lampe_neige');
  console.log('empreintes visibles', await page.evaluate(() => SP.FX.prints.filter((d) => d.m.visible).length));
}
console.log(mapId, 'erreurs', errors.length, errors.slice(0, 3), JSON.stringify(await page.evaluate(() => ({ alive: window.__z?.alive, weapon: SP.P.weapons[SP.P.slot]?.key }))));
await browser.close();
