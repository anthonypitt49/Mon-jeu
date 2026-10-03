// Partie simulée sur une carte : manches, portes, courant, atouts, caisse, établi, règles propres à la carte.
import { chromium } from 'playwright';
import path from 'path';
const dir = path.dirname(new URL(import.meta.url).pathname);
const mapId = process.argv[2] || 'cite';
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const ctx = await browser.newContext({ viewport: { width: 800, height: 450 } });
await ctx.addInitScript(() => { localStorage.setItem('sp_settings', JSON.stringify({ quality: 1 })); });
const page = await ctx.newPage(); const errors = [];
page.on('pageerror', (e) => errors.push('[pageerror] ' + e.message + '\n' + e.stack));
page.on('console', (m) => { if (m.type() === 'error') errors.push('[console] ' + m.text().slice(0, 300)); });
await page.route('https://cdn.jsdelivr.net/npm/three@0.186.1/**', (route) => { const u = new URL(route.request().url()); route.fulfill({ path: path.join(dir, 'node_modules/three', u.pathname.replace('/npm/three@0.186.1/', '')), contentType: 'application/javascript' }); });
await page.route('https://fonts.googleapis.com/**', (r) => r.fulfill({ body: '', contentType: 'text/css' }));
await page.route('https://fonts.gstatic.com/**', (r) => r.abort());
await page.goto('http://127.0.0.1:8088/index.html#carte=' + mapId); await page.waitForFunction(() => window.__spReady, null, { timeout: 120000 });
await page.evaluate(() => document.getElementById('soloButton').click());
const ev = (f, a) => page.evaluate(f, a);
const log = (...a) => console.log(...a);
await ev(() => { SP.P.hp = SP.P.maxHp = 1e7; SP.G.me().points = 200000; });
log('start', JSON.stringify(await ev(() => ({ map: SP.MAP_ID(), pos: SP.P.pos.toArray().map((v) => +v.toFixed(1)), zones: SP.MAP.zoneActive, perksVisible: SP.WORLD.perks.filter((p) => p.group.visible).length }))));
// Deux manches avec combat automatique (on tue ce qui approche).
const fight = (sec) => ev((sec) => { let killed = 0; for (let t = 0; t < sec; t += 0.1) { SP.sim(0.1); for (const z of SP.ZOMBIES) if (z.alive && z.state !== 'rise' && z.pos.distanceTo(SP.P.pos) < 6) { SP.G.applyDamage(z, 1e6, SP.P.id, { dir: new SP.THREE.Vector3(1, 0, 0) }); killed++; } } return { round: SP.G.round, killed, alive: SP.ZOMBIES.filter((z) => z.alive).length, toSpawn: SP.G.toSpawn, perks: SP.WORLD.perks.filter((p) => p.landed).map((p) => p.key) }; }, sec);
for (let i = 0; i < 4; i++) log('fight', JSON.stringify(await fight(25)));
// Ouvre tout, courant, achète un atout tombé, caisse, établi.
log('doors', JSON.stringify(await ev(() => { for (const d of SP.MAP.doors) SP.G.interact(SP.P.id, 'door', d.id); SP.sim(2); return { open: SP.MAP.doors.map((d) => d.open), zones: SP.MAP.zoneActive }; })));
log('power', JSON.stringify(await ev(() => { SP.G.interact(SP.P.id, 'power'); SP.sim(1); return SP.G.power; })));
log('perk', JSON.stringify(await ev(() => { const p = SP.WORLD.perks.find((q) => q.landed); if (!p) return 'aucun atout tombé'; SP.G.interact(SP.P.id, 'perk', p.key); SP.sim(0.5); return { key: p.key, has: SP.P.perks.has(p.key), pos: p.pos.toArray().map((v) => +v.toFixed(1)) }; })));
log('box', JSON.stringify(await ev(() => { SP.G.interact(SP.P.id, 'box'); SP.sim(5); const st = SP.G.box.state; SP.G.interact(SP.P.id, 'box'); SP.sim(1); return { st, after: SP.G.box.state, weps: SP.P.weapons.map((w) => w.key) }; })));
log('bench', JSON.stringify(await ev(() => { SP.P.slot = 0; SP.G.interact(SP.P.id, 'bench', SP.P.weapons[0].key); SP.sim(5); SP.G.interact(SP.P.id, 'bench'); SP.sim(1); return { weps: SP.P.weapons.map((w) => w.key + (w.up ? '+' : '')) }; })));
if (mapId === 'penitencier') {
  log('shield', JSON.stringify(await ev(() => { for (let i = 0; i < 3; i++) SP.G.interact(SP.P.id, 'part', i); SP.sim(0.3); SP.G.interact(SP.P.id, 'build'); SP.sim(0.3); SP.G.interact(SP.P.id, 'takeShield'); SP.sim(0.3); const s0 = SP.P.shield; SP.P.hp = SP.P.maxHp = 150; const hp0 = SP.P.hp; SP.G.damagePlayer(SP.G.me(), 40, { pos: SP.P.pos.clone().setX(SP.P.pos.x + 1) }); return { shield0: s0, shield1: SP.P.shield, hpLost: hp0 - SP.P.hp, state: SP.M().hooks.state() }; })));
  log('boss', JSON.stringify(await ev(() => { SP.P.hp = SP.P.maxHp = 1e7; for (const z of [...SP.ZOMBIES]) z.destroy(); SP.G.startRound(5); let boss = null; for (let t = 0; t < 20 && !boss; t += 0.25) { SP.sim(0.25); boss = SP.ZOMBIES.find((z) => z.kind === 'warden' && z.alive); } if (!boss) return 'pas de boss';
    const p = SP.WORLD.perks[1]; boss.pos.set(p.pos.x + 1, 0, p.pos.z + 1); SP.sim(1.2); const locked = SP.WORLD.perks.filter((q) => q.locked).map((q) => q.key);
    SP.G.interact(SP.P.id, 'unlock', 'p:' + p.key); SP.sim(0.3); const after = SP.WORLD.perks.filter((q) => q.locked).map((q) => q.key);
    const hp = boss.hp; SP.G.applyDamage(boss, 1e5, SP.P.id, { head: true, dir: new SP.THREE.Vector3(1, 0, 0) }); const headDmg = hp - boss.hp;
    SP.G.applyDamage(boss, 1e7, SP.P.id, { dir: new SP.THREE.Vector3(1, 0, 0) }); SP.sim(1);
    return { hp, headDmg, locked, after, bossAlive: boss.alive, drops: SP.G.drops.map((d) => d.type) }; })));
}
if (mapId === 'filon') {
  log('giant', JSON.stringify(await ev(async () => { const g = SP.FIL().giant; const cage = SP.MAP.doors.find((d) => d.label === 'Libérer le Colosse'); SP.G.interact(SP.P.id, 'door', cage.id); SP.sim(1); const freed = SP.FIL().freed;
    SP.G.interact(SP.P.id, 'candy'); SP.sim(0.2); const candy = !!SP.FIL().candy[SP.P.id];
    for (let t = 0; t < 30; t += 0.5) SP.sim(0.5); const gp = g.pos.clone(); SP.P.pos.set(gp.x + 1.5, 0, gp.z); SP.G.interact(SP.P.id, 'feed'); SP.sim(0.3);
    const ally = SP.FIL().ally === SP.P.id; for (const z of [...SP.ZOMBIES]) z.destroy(); const k0 = SP.P.stats.kills + SP.G.me().kills;
    for (let i = 0; i < 4; i++) { const z = SP.spawnTestZombie(g.pos.x + 2 + i * 0.3, g.pos.z + 0.5); z.hp = 500; z.maxHp = 500; z.rise = 1; z.state = 'move'; }
    SP.sim(1.5); await new Promise((r) => setTimeout(r, 700)); SP.sim(1.5); await new Promise((r) => setTimeout(r, 700)); const killed = SP.ZOMBIES.filter((z) => !z.alive).length;
    return { freed, candy, giantState: g.state, giantMoved: +gp.distanceTo(new SP.THREE.Vector3(0, 0, 0)).toFixed(1), ally, killed, allyT: +SP.FIL().allyT.toFixed(1) }; })));
  log('bank', JSON.stringify(await ev(() => { localStorage.removeItem('sp_bank'); const p0 = SP.G.me().points; SP.G.interact(SP.P.id, 'bankDep'); SP.G.interact(SP.P.id, 'bankDep'); SP.sim(0.2); const bal1 = JSON.parse(localStorage.getItem('sp_bank')); SP.G.interact(SP.P.id, 'bankWd'); SP.sim(0.2); return { spent: p0 - SP.G.me().points, bal1, bal2: JSON.parse(localStorage.getItem('sp_bank')) }; })));
}
log('rules', JSON.stringify(await ev(() => { const h = SP.WORLD.citeHeads || []; for (let i = 0; i < h.length; i++) SP.G.interact(SP.P.id, 'shot', 'mh:' + i); SP.sim(1); return { heads: h.map((q) => q.shot), drops: SP.G.drops.map((d) => d.type), state: SP.M().hooks.state?.() }; })));
for (let i = 0; i < 3; i++) log('fight', JSON.stringify(await fight(25)));
log('perf', JSON.stringify(await ev(() => { const r = SP.R.renderer; r.info.autoReset = false; r.info.reset(); SP.renderFrame(1); const o = { calls: r.info.render.calls, tris: r.info.render.triangles, geos: r.info.memory.geometries, tex: r.info.memory.textures, progs: r.info.programs.length }; r.info.autoReset = true; return o; })));
log('ERRORS', errors.length); for (const e of errors.slice(0, 10)) log(e.slice(0, 700));
await browser.close();
