// Nouveautés façon CoD : Rayonneur, 3e arme, Œil de lynx, Décharge, Braderie, Sang infecté, Prime, marques de manche, intro, robot.
import { chromium } from 'playwright';
import path from 'path';
const dir = path.dirname(new URL(import.meta.url).pathname);
const mapId = process.argv[2] || 'poste7';
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const ctx = await browser.newContext({ viewport: { width: 800, height: 450 } });
await ctx.addInitScript(() => { localStorage.setItem('sp_settings', JSON.stringify({ quality: 1 })); });
const page = await ctx.newPage(); const errors = [];
page.on('pageerror', (e) => errors.push('[pageerror] ' + e.message + '\n' + e.stack));
page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errors.push('[console] ' + m.text().slice(0, 300)); });
await page.route('https://cdn.jsdelivr.net/npm/three@0.186.1/**', (route) => { const u = new URL(route.request().url()); route.fulfill({ path: path.join(dir, 'node_modules/three', u.pathname.replace('/npm/three@0.186.1/', '')), contentType: 'application/javascript' }); });
await page.route('https://fonts.googleapis.com/**', (r) => r.fulfill({ body: '', contentType: 'text/css' }));
await page.route('https://fonts.gstatic.com/**', (r) => r.abort());
await page.goto('http://127.0.0.1:8088/index.html#carte=' + mapId); await page.waitForFunction(() => window.__spReady, null, { timeout: 120000 });
await page.evaluate(() => document.getElementById('soloButton').click());
const ev = (f, a) => page.evaluate(f, a);
const log = (...a) => console.log(...a);
await ev(() => {
  SP.P.hp = SP.P.maxHp = 1e6; SP.G.me().points = 99999;
  // Place n infectés devant le joueur, en ligne de mire, sur une case praticable.
  window.lineUp = (n, dist = 7, gap = 0.7) => {
    const zs = SP.ZOMBIES.filter((z) => z.alive).slice(0, n); const P = SP.P;
    const fx = -Math.sin(P.yaw), fz = -Math.cos(P.yaw);
    zs.forEach((z, i) => { z.pos.set(P.pos.x + fx * dist + fz * (i - (n - 1) / 2) * gap, P.pos.y, P.pos.z + fz * dist - fx * (i - (n - 1) / 2) * gap); z.state = 'move'; z.rise = 1; z.vel.set(0, 0, 0); z.updateHitboxes(); });
    return zs.length;
  };
  window.aimAt = (z, part = 1) => { z.updateHitboxes(); const c = SP.R.camera.position, h = z.hit[part].c; const dx = h.x - c.x, dy = h.y - c.y, dz = h.z - c.z; SP.P.yaw = Math.atan2(-dx, -dz); SP.P.pitch = Math.atan2(dy, Math.hypot(dx, dz)); SP.P.rec.p = SP.P.rec.y = 0; SP.P.bloom = 0; };
  // Cherche une direction dégagée sur 10 m depuis la position du joueur.
  window.faceOpen = () => { const P = SP.P; let best = 0, by = 0; for (let a = 0; a < 16; a++) { const yaw = a / 16 * Math.PI * 2; const o = SP.R.camera.position.clone(), d = new SP.THREE.Vector3(-Math.sin(yaw), 0, -Math.cos(yaw)); const h = SP.rayWorld ? SP.rayWorld(o, d, 14) : null; const L = h ? h.dist : 14; if (L > best) { best = L; by = yaw; } } P.yaw = by; P.pitch = 0; return best; };
});
await ev(() => SP.sim(9));
log('intro', JSON.stringify(await ev(() => ({ html: document.getElementById('locIntro').textContent, round: document.getElementById('roundNo').innerHTML.slice(0, 40) }))));
await page.waitForTimeout(3500);
log('intro2', JSON.stringify(await ev(() => document.getElementById('locIntro').textContent)));
log('perks', JSON.stringify(await ev(() => SP.WORLD.perks.map((p) => p.key))));
log('open', await ev(() => faceOpen()));
// Rayonneur : un tir, éclaboussure sur les voisins.
log('raygun', JSON.stringify(await ev(() => {
  SP.grantWeapon('raygun', false); SP.sim(0.6);
  const n = lineUp(4, 7, 0.8); SP.sim(0.05); const zs = SP.ZOMBIES.filter((z) => z.alive).slice(0, 4); const hp0 = zs.map((z) => z.hp);
  aimAt(zs[1], 1); SP.sim(0.02); const k0 = SP.P.stats.kills; SP.INPUT.firePressed = true; SP.INPUT.fire = true; SP.sim(0.05); SP.INPUT.fire = false; SP.sim(0.3);
  return { n, cur: SP.P.weapons[SP.P.slot].key, kills: SP.P.stats.kills - k0, hp0, hp1: zs.map((z) => (z.alive ? Math.round(z.hp) : 'mort')), mag: SP.P.weapons[SP.P.slot].mag, hp: SP.P.hp };
})));
// Troisième arme : refusée sans l'atout, acceptée avec.
log('mule', JSON.stringify(await ev(() => {
  SP.sim(1); const P = SP.P; P.weapons = [{ key: 'pistol', up: false, mag: 12, reserve: 60 }, { key: 'smg', up: false, mag: 32, reserve: 100 }]; P.slot = 0;
  SP.grantWeapon('shotgun', false); SP.sim(0.6); const a = P.weapons.map((w) => w.key).join(',');
  P.perks.add('mule'); SP.UI.perks(); SP.grantWeapon('carbine', false); SP.sim(0.6); const b = P.weapons.map((w) => w.key).join(',');
  SP.switchWeapon(0); SP.sim(0.5); const s0 = P.slot; SP.switchWeapon(2); SP.sim(0.5); const s2 = P.slot;
  window.dispatchEvent(new WheelEvent('wheel', { deltaY: 100 })); SP.sim(0.5);
  return { without: a, withMule: b, s0, s2, slot3Btn: !document.getElementById('slot3').classList.contains('hidden') };
})));
// Œil de lynx : dégâts à la tête ×1,3 au pistolet.
log('deadshot', JSON.stringify(await ev(() => {
  const P = SP.P; P.weapons = [{ key: 'pistol', up: false, mag: 12, reserve: 60 }]; P.slot = 0; SP.sim(0.6); SP.G.pu.instakill = 0;
  const shot = () => { faceOpen(); lineUp(1, 5); SP.sim(0.05); const z = SP.ZOMBIES.find((q) => q.alive); z.hp = z.maxHp = 1e5; aimAt(z, 0); SP.sim(0.02); SP.INPUT.firePressed = true; SP.sim(0.05); SP.sim(0.3); return 1e5 - z.hp; };
  const a = shot(), a2 = shot(), a3 = shot(); P.perks.add('deadshot'); const b = shot();
  return { sans: [a, a2, a3].map(Math.round), avec: Math.round(b), sw: P.switchT, slot: P.slot, cd: +P.fireCd.toFixed(2) };
})));
// Décharge : recharger chargeur vide près des infectés.
log('cherry', JSON.stringify(await ev(() => {
  const P = SP.P; P.perks.add('cherry'); P.weapons = [{ key: 'smg', up: false, mag: 0, reserve: 100 }]; P.slot = 0; SP.sim(0.6);
  const zs = SP.ZOMBIES.filter((z) => z.alive).slice(0, 3); zs.forEach((z, i) => { z.pos.set(P.pos.x + Math.cos(i * 2) * 1.8, P.pos.y, P.pos.z + Math.sin(i * 2) * 1.8); z.hp = 300; z.state = 'move'; z.rise = 1; });
  const k0 = P.stats.kills; SP.tryReload(); SP.sim(0.2);
  const k1 = P.stats.kills - k0; SP.sim(2.5); P.weapons[0].mag = 0; SP.tryReload(); // délai de recharge de la décharge
  return { kills: k1, cd: +(P.cherryCd - SP.G.time).toFixed(1) };
})));
// Nouveaux bonus.
for (const t of ['bonus', 'firesale', 'zblood']) log('drop', t, JSON.stringify(await ev(async (t) => {
  const pts0 = SP.G.me().points; SP.G.spawnDrop(t, SP.P.pos.clone().setX(SP.P.pos.x + 0.3), true); SP.sim(0.5); await new Promise((r) => setTimeout(r, 900)); SP.sim(0.3);
  const cand = []; return { pts: SP.G.me().points - pts0, pu: SP.G.pu, zb: +SP.P.zbloodT.toFixed(1), meZb: +(SP.G.me().zb - SP.G.time || 0).toFixed(1), hud: document.getElementById('powerups').textContent };
}, t)));
// Sang infecté : les infectés n'attaquent plus.
log('zblood', JSON.stringify(await ev(() => {
  const P = SP.P; const hp0 = P.hp; const zs = SP.ZOMBIES.filter((z) => z.alive).slice(0, 3); zs.forEach((z) => { z.pos.set(P.pos.x + 1, P.pos.y, P.pos.z); z.state = 'move'; z.rise = 1; });
  SP.sim(3); const tgt = zs.map((z) => (z.target ? 'cible' : 'aucune'));
  return { dmg: hp0 - P.hp, tgt };
})));
// Braderie : la caisse coûte 10.
log('firesale', JSON.stringify(await ev(() => { const pts0 = SP.G.me().points; SP.G.box.state = 'idle'; SP.G.interact(SP.P.id, 'box'); return { paid: pts0 - SP.G.me().points, state: SP.G.box.state }; })));
// Marques de manche.
log('tally', JSON.stringify(await ev(() => { const out = []; for (const n of [1, 3, 5, 6]) { SP.UI.round(n); out.push(document.getElementById('roundNo').innerHTML.includes('svg') ? 'craie' + n : document.getElementById('roundNo').textContent); } return out; })));
// Robot (Poste 7) : présent et en marche.
log('robot', JSON.stringify(await ev(() => { const r = window.ROBOT || null; return SP.MAP_ID() === 'poste7' ? { x: +(SP.ROBOT().g?.position.x || 0).toFixed(1) } : 'autre carte'; })));
log('ERRORS:', errors.length); errors.slice(0, 20).forEach((e) => log(e));
await browser.close();
