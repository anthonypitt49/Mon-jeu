import { chromium } from 'playwright';
import path from 'path';
const dir = path.dirname(new URL(import.meta.url).pathname);
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const ctx = await browser.newContext({ viewport: { width: 800, height: 450 } });
await ctx.addInitScript(() => { localStorage.setItem('sp_settings', JSON.stringify({ quality: 1 })); });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push('[pageerror] ' + e.message + '\n' + e.stack));
page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errors.push('[console] ' + m.text().slice(0, 400)); });
await page.route('https://cdn.jsdelivr.net/npm/three@0.186.1/**', (route) => { const u = new URL(route.request().url()); route.fulfill({ path: path.join(dir, 'node_modules/three', u.pathname.replace('/npm/three@0.186.1/', '')), contentType: 'application/javascript' }); });
await page.route('https://fonts.googleapis.com/**', (r) => r.fulfill({ body: '', contentType: 'text/css' }));
await page.route('https://fonts.gstatic.com/**', (r) => r.abort());
await page.goto('file://' + path.join(dir, 'index.html'));
await page.waitForFunction(() => window.__spReady, null, { timeout: 120000 });
await page.click('#soloButton');
const ev = (f, a) => page.evaluate(f, a);
const log = (...a) => console.log(...a);
// Helper in page: aim at nearest zombie torso and fire n times.
await ev(() => {
  window.aimFire = (n, part = 1, hold = 0.35) => { let shots = 0; for (let i = 0; i < n; i++) { const z = SP.ZOMBIES.filter((q) => q.alive && q.state !== 'rise' && q.pos.y < 1).sort((a, b) => a.pos.distanceTo(SP.P.pos) - b.pos.distanceTo(SP.P.pos))[0]; if (!z) { SP.sim(0.5); continue; } z.updateHitboxes(); const c = SP.R.camera.position, h = z.hit[part].c; const dx = h.x - c.x, dy = h.y - c.y, dz = h.z - c.z; SP.P.yaw = Math.atan2(-dx, -dz); SP.P.pitch = Math.atan2(dy, Math.hypot(dx, dz)); SP.P.rec.p = SP.P.rec.y = 0; SP.P.bloom = 0; SP.sim(0.05); SP.INPUT.firePressed = true; SP.INPUT.fire = true; SP.sim(hold); SP.INPUT.fire = false; shots++; } return shots; };
  window.bringZombies = (k = 4) => { let i = 0; for (const z of SP.ZOMBIES) if (z.alive && i < k) { z.pos.set(SP.P.pos.x + 5 + i * 0.8, 0, SP.P.pos.z - 0.6 + (i % 2) * 1.2); z.state = 'move'; z.rise = 1; z.vel.set(0, 0, 0); i++; } SP.sim(0.05); return i; };
  SP.P.hp = SP.P.maxHp = 1e6; SP.G.me().points = 99999;
});
await ev(() => SP.sim(8));
for (const w of ['revolver', 'bolt']) {
  const r = await ev((w) => { SP.grantWeapon(w, false); SP.sim(0.6); bringZombies(3); const k0 = SP.P.stats.kills; const s = aimFire(6, 0); return { w, cur: SP.P.weapons[SP.P.slot].key, kills: SP.P.stats.kills - k0, shots: s, mag: SP.P.weapons[SP.P.slot].mag }; }, w);
  log(JSON.stringify(r));
  await ev(() => { if (SP.ZOMBIES.filter((z) => z.alive).length < 3) SP.sim(6); });
}
log('launcher', JSON.stringify(await ev(() => { SP.grantWeapon('launcher', false); SP.sim(0.6); bringZombies(4); const k0 = SP.P.stats.kills; aimFire(1, 3, 1.2); SP.sim(1); return { kills: SP.P.stats.kills - k0, proj: SP.PROJ.length }; })));
log('cryo', JSON.stringify(await ev(() => { SP.grantWeapon('cryo', true); SP.sim(0.6); bringZombies(4); const k0 = SP.P.stats.kills; aimFire(1, 1, 0.3); const frozen = SP.ZOMBIES.filter((z) => z.state === 'frozen').length; SP.sim(2); return { frozen, kills: SP.P.stats.kills - k0 }; })));
log('grenade', JSON.stringify(await ev(() => { SP.sim(5); bringZombies(4); SP.P.yaw = -Math.PI / 2; SP.P.pitch = 0; const k0 = SP.P.stats.kills; const g0 = SP.P.grenades; SP.throwGrenade(); SP.sim(4); return { g0, g1: SP.P.grenades, kills: SP.P.stats.kills - k0 }; })));
log('knife', JSON.stringify(await ev(() => { SP.sim(3); const z = SP.ZOMBIES.find((q) => q.alive); if (!z) return 'nozombie'; z.pos.set(SP.P.pos.x - Math.sin(SP.P.yaw) * 1.2, 0, SP.P.pos.z - Math.cos(SP.P.yaw) * 1.2); z.state = 'move'; z.rise = 1; const hp0 = z.hp; SP.knife(); SP.sim(0.6); return { hp0, hp1: z.hp, alive: z.alive }; })));
for (const t of ['double', 'instakill', 'maxammo', 'carpenter', 'nuke']) log('drop', t, JSON.stringify(await ev(async (t) => { SP.G.spawnDrop(t, SP.P.pos.clone().setX(SP.P.pos.x + 0.3), true); SP.sim(0.5); await new Promise((r) => setTimeout(r, 1300)); SP.sim(1); return { drops: SP.G.drops.length, pu: SP.G.pu, alive: SP.ZOMBIES.filter((z) => z.alive).length, pts: SP.G.me().points }; }, t)));
log('blizzard', JSON.stringify(await ev(() => { for (const z of [...SP.ZOMBIES]) z.destroy(); SP.G.startRound(6); SP.sim(6); return { r: SP.G.round, bl: SP.G.blizzard, w: SP.WEATHER.target, kinds: SP.ZOMBIES.map((z) => z.kind) }; })));
log('round9', JSON.stringify(await ev(() => { for (const z of [...SP.ZOMBIES]) z.destroy(); SP.G.startRound(9); let brutes = 0; for (let i = 0; i < 400; i++) if (SP.G.zombieKind() === 'brute') brutes++; SP.sim(8); return { hp: SP.G.zHp, toSpawn: SP.G.toSpawn, brutesPer400: brutes, kinds: [...new Set(SP.ZOMBIES.map((z) => z.kind))] }; })));
log('pause/menu', JSON.stringify(await ev(() => { SP.pauseGame(); const a = SP.G.mode; SP.resumeGame(); const b = SP.G.mode; SP.backToMenu(); const c = SP.G.mode; return { a, b, c, zombies: SP.ZOMBIES.length }; })));
await page.waitForTimeout(300); await ev(() => document.exitPointerLock()); await page.waitForTimeout(300);
await page.click('#soloButton');
log('restart', JSON.stringify(await ev(() => { SP.sim(6); return { mode: SP.G.mode, r: SP.G.round, pts: SP.G.me().points, w: SP.P.weapons.map((w) => w.key), doors: SP.MAP.doors.map((d) => d.open), power: SP.G.power }; })));
log('quality', JSON.stringify(await ev(() => { for (const q of [0, 3, 1]) { SP.settings.quality = q; SP.applyQuality(); SP.renderFrame(1); } return 'ok'; })));
log('ERRORS:', errors.length); errors.slice(0, 20).forEach((e) => log(e));
await browser.close();
