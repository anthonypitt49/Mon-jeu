// Missions de carte de bout en bout : chaque étape, le bandeau d'objectif, les erreurs.
import { chromium } from 'playwright';
import path from 'path';
const dir = path.dirname(new URL(import.meta.url).pathname);
const mapId = process.argv[2] || 'cite';
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const ctx = await browser.newContext({ viewport: { width: 960, height: 540 } });
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
const obj = () => ev(() => { SP.UI.objective(); return ['objectiveTitle', 'objectiveText', 'objectiveSub', 'objectiveNext'].map((i) => document.getElementById(i).textContent).join(' | '); });
const shot = (n) => page.screenshot({ path: path.join(dir, 'shots', `mission_${mapId}_${n}.png`) });
// Joueur invulnérable, riche, toutes les portes ouvertes, courant rétabli d'office (testé ailleurs).
await ev(() => { SP.P.hp = SP.P.maxHp = 1e7; SP.G.me().points = 200000; SP.sim(2); });
log('obj-depart', await obj());
await ev(() => { for (const d of SP.MAP.doors) SP.G.interact(SP.P.id, 'door', d.id); SP.G.interact(SP.P.id, 'power'); SP.sim(1); });
// Tue les infectés proches pendant une simulation (le joueur ne doit pas être submergé).
await ev(() => { window.simKill = (sec, r = 6) => { for (let t = 0; t < sec; t += 0.25) { SP.sim(0.25); for (const z of SP.ZOMBIES) if (z.alive && z.state !== 'rise' && !z.boss && z.pos.distanceTo(SP.P.pos) < r) SP.G.applyDamage(z, 1e6, SP.P.id, { dir: new SP.THREE.Vector3(1, 0, 0) }); } }; });
log('obj-courant', await obj());

if (mapId === 'cite') {
  const n = await ev(() => SP.WORLD.citeHeads.length); log('tetes', n);
  for (let i = 0; i < n; i++) await ev((i) => { SP.G.interact(SP.P.id, 'shot', 'mh:' + i); SP.sim(0.2); }, i);
  await ev(() => SP.sim(0.5)); log('apres-tetes', JSON.stringify(await ev(() => ({ ms: SP.CITE().ms }))), await obj());
  const r = await ev(() => { const r = SP.WORLD.citeRadio; SP.P.pos.set(r.pos.x + 0.9, 0, r.pos.z); SP.sim(0.3); const c = SP.INTERACT_CUR(); return { c: c && c.kind + ' ' + c.holdTime + ' ' + c.text, pos: [r.pos.x.toFixed(1), r.pos.z.toFixed(1)] }; });
  log('radio', JSON.stringify(r)); await shot('radio');
  await ev(() => { SP.G.interact(SP.P.id, 'cradio'); SP.sim(0.3); }); log('alerte', JSON.stringify(await ev(() => ({ ms: SP.CITE().ms, at: SP.CITE().alertT.toFixed(1), toSpawn: SP.G.toSpawn }))), await obj());
  await ev(() => simKill(30)); log('alerte-30s', JSON.stringify(await ev(() => ({ ms: SP.CITE().ms, at: SP.CITE().alertT.toFixed(1), alive: SP.ZOMBIES.filter((z) => z.alive).length }))), await obj()); await shot('alerte');
  await ev(() => simKill(32)); log('fin', JSON.stringify(await ev(() => ({ ms: SP.CITE().ms, pts: SP.G.me().points, obj: SP.M().objective?.() }))), await obj());
}

if (mapId === 'penitencier') {
  await ev(() => { for (let i = 0; i < 3; i++) SP.G.interact(SP.P.id, 'part', i); SP.sim(0.3); }); log('pieces', await obj());
  await ev(() => { SP.G.interact(SP.P.id, 'build'); SP.sim(0.5); }); log('bouclier', JSON.stringify(await ev(() => ({ ms: SP.PEN().ms, round: SP.G.round }))), await obj());
  // Avance jusqu'à la 3e manche.
  await ev(() => { while (SP.G.round < 3) { for (const z of SP.ZOMBIES) if (z.alive) SP.G.applyDamage(z, 1e7, SP.P.id, { dir: new SP.THREE.Vector3(1, 0, 0) }); SP.G.toSpawn = 0; SP.sim(1); } });
  log('manche3', JSON.stringify(await ev(() => ({ round: SP.G.round, toSpawn: SP.G.toSpawn }))), await obj());
  await ev(() => simKill(16)); const b = await ev(() => { const b = SP.PEN().boss; return { boss: !!(b && b.alive), sum: SP.PEN().summoned }; }); log('geolier', JSON.stringify(b), await obj());
  await ev(() => { const z = SP.PEN().boss; if (z) SP.G.applyDamage(z, 1e8, SP.P.id, { dir: new SP.THREE.Vector3(1, 0, 0) }); SP.sim(0.5); });
  const k = await ev(() => ({ ks: SP.PEN().keyState, kp: SP.PEN().keyPos })); log('cles', JSON.stringify(k), await obj());
  if (k.kp) { const c = await ev((kp) => { SP.P.pos.set(kp[0] + 0.5, 0, kp[1]); SP.sim(0.3); const c = SP.INTERACT_CUR(); SP.G.interact(SP.P.id, 'pkey'); SP.sim(0.3); return { c: c && c.kind, ks: SP.PEN().keyState, ms: SP.PEN().ms }; }, k.kp); log('ramasse', JSON.stringify(c), await obj()); }
  const v = await ev(() => { const b = SP.WORLD.penBoat; SP.P.pos.set(b.dock.x, 0, b.dock.z); SP.sim(0.3); const c = SP.INTERACT_CUR(); SP.G.interact(SP.P.id, 'pboat'); SP.sim(0.3); return { c: c && c.kind + ' ' + c.holdTime, ms: SP.PEN().ms, dock: [b.dock.x.toFixed(1), b.dock.z.toFixed(1)] }; });
  log('vedette', JSON.stringify(v), await obj()); await shot('vedette');
  await ev(() => { const s = SP.MAP.spots?.start || [25, 16]; SP.P.pos.set(s[0] * 2 + 1, 0, s[1] * 2 + 1); simKill(5); }); log('loin', JSON.stringify(await ev(() => ({ bp: SP.PEN().boatP.toFixed(1) }))));
  await ev(() => { const b = SP.WORLD.penBoat; for (let t = 0; t < 70 && SP.PEN().ms === 3; t += 0.5) { SP.P.pos.set(b.dock.x, 0, b.dock.z); simKill(0.5); } }); log('fin', JSON.stringify(await ev(() => ({ ms: SP.PEN().ms, bp: SP.PEN().boatP.toFixed(1), obj: SP.M().objective?.() }))), await obj());
  await ev(() => SP.sim(6)); await shot('naufrage');
}

if (mapId === 'filon') {
  const st = () => ev(() => { const S = SP.FIL(); return { ms: S.ms, freed: S.freed, fed: S.fed, rb: S.rubble.join(''), gold: S.gold.join(''), allyT: S.allyT.toFixed(0) }; });
  await ev(() => SP.sim(0.5)); log('libre', JSON.stringify(await st()), await obj());
  await ev(() => { const c = SP.WORLD.candyShop; SP.P.pos.set(c.pos.x, 0, c.pos.z); SP.G.interact(SP.P.id, 'candy'); SP.sim(0.3); const g = SP.FIL().giant; SP.P.pos.set(g.pos.x + 1.5, 0, g.pos.z); SP.sim(0.2); SP.G.interact(SP.P.id, 'feed'); SP.sim(0.3); });
  log('nourri', JSON.stringify(await st()), await obj());
  const spots = await ev(() => SP.WORLD.filRubble.map((r) => [+r.pos.x.toFixed(1), +r.pos.z.toFixed(1)])); log('eboulis', JSON.stringify(spots));
  for (let i = 0; i < spots.length; i++) {
    // Mène le Colosse : le joueur avance vers l'éboulis par petits pas, le Colosse suit.
    const r = await ev(([i, s]) => { const S = SP.FIL(), g = S.giant; if (S.allyT < 15) { S.candy[SP.P.id] = false; SP.G.interact(SP.P.id, 'candy'); SP.G.interact(SP.P.id, 'feed'); SP.sim(0.2); }
      const p0 = SP.P.pos.clone(); let t = 0; for (; t < 60 && !S.rubble[i]; t += 0.25) { const k = Math.min(1, t / 12); SP.P.pos.set(p0.x + (s[0] + 1.6 - p0.x) * k, 0, p0.z + (s[1] - p0.z) * k); simKill(0.25, 8); if (S.allyT < 5) { S.candy[SP.P.id] = false; SP.G.interact(SP.P.id, 'candy'); SP.G.interact(SP.P.id, 'feed'); } }
      SP.sim(0.8); const nug = SP.WORLD.filRubble[i].nug.visible; SP.P.pos.set(s[0] + 0.5, 0, s[1]); SP.sim(0.2); const c = SP.INTERACT_CUR(); SP.G.interact(SP.P.id, 'fgold', i); SP.sim(0.2);
      return { t, gd: Math.hypot(g.pos.x - s[0], g.pos.z - s[1]).toFixed(1), nug, c: c && c.kind, rb: S.rubble.join(''), gold: S.gold.join('') }; }, [i, spots[i]]);
    log('eboulis', i, JSON.stringify(r), await obj());
    if (i === 0) await shot('eboulis');
  }
  const v = await ev(() => { const d = SP.MAP.doors.find((q) => q.label === 'La chambre forte'); const x = d.x * 2 + 1, z = d.z * 2 + 1; SP.P.pos.set(x + 1, 0, z); SP.sim(0.3); const c = SP.INTERACT_CUR(); SP.G.interact(SP.P.id, 'fvault'); SP.sim(0.5); return { open: d.open, c: c && c.kind + ' ' + c.text, ms: SP.FIL().ms, obj: SP.M().objective?.() }; });
  log('chambre-forte', JSON.stringify(v), await obj());
}
await ev(() => SP.sim(1));
log('ERRORS', errors.length); errors.slice(0, 10).forEach((e) => log(e));
await browser.close();
