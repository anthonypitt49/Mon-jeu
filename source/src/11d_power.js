/* ═══════════════════ RÉTABLIR LE COURANT (toutes les cartes) ═══════════════════
   1. Trouver les trois pièces du générateur, cachées dans des zones différentes (tirées au sort à chaque partie).
   2. Les installer (maintenir E au générateur).
   3. Lancer le moteur (maintenir E).
   4. Tenir la position près du générateur pendant la montée en régime : les infectés affluent.
   L'hôte décide ; les camarades reçoivent l'état par l'événement « pwr » et dans l'état du monde. */

const PWR = { stage: 0, tiles: [-1, -1, -1], got: [0, 0, 0], prog: 0, need: 45, stall: 0 };
const PWR_RADIUS = 8;
const PWR_DEFAULT = [{ name: "BIDON D'ESSENCE", kind: 'fuel', zones: [1, 2] }, { name: 'FUSIBLE', kind: 'fuse', zones: [3, 4] }, { name: "BOBINE D'ALLUMAGE", kind: 'coil', zones: [5, 6] }];
const pwrParts = () => M.powerParts || PWR_DEFAULT;

/* ─── Objets des pièces (lueur dorée, rotation lente) ─── */
function buildPowerParts() {
  WORLD.pwrParts = pwrParts().map((p) => {
    const g = new THREE.Group(); g.userData.dynamic = true; g.visible = false; R.scene.add(g); const k = kitMats();
    if (p.kind === 'fuel') { mesh(boxG(0.34, 0.44, 0.16), KIT.m(0xb82a1e, { rough: 0.45, metal: 0.4 }), 0, 0.22, 0, 0, g); mesh(boxG(0.18, 0.06, 0.06), MATS.iron, 0.04, 0.47, 0, 0, g); mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.08, 8), MATS.brass, -0.11, 0.48, 0, 0, g); }
    else if (p.kind === 'fuse') { mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.26, 12), KIT.m(0xe8e2d4, { rough: 0.3 }), 0, 0.12, 0, 0, g).rotation.z = Math.PI / 2; for (const s of [-1, 1]) mesh(new THREE.CylinderGeometry(0.068, 0.068, 0.05, 12), MATS.brass, s * 0.14, 0.12, 0, 0, g).rotation.z = Math.PI / 2; }
    else if (p.kind === 'coil') { mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.26, 16), KIT.m(0xb86a2e, { rough: 0.35, metal: 0.8 }), 0, 0.14, 0, 0, g); mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.34, 8), MATS.iron, 0, 0.14, 0, 0, g); }
    else if (p.kind === 'belt') { mesh(new THREE.TorusGeometry(0.2, 0.03, 6, 20), KIT.m(0x3a2618, { rough: 0.8 }), 0, 0.05, 0, 0, g).rotation.x = Math.PI / 2; mesh(new THREE.TorusGeometry(0.16, 0.025, 6, 20), KIT.m(0x4a3220, { rough: 0.8 }), 0.06, 0.1, 0, 0, g).rotation.x = Math.PI / 2 - 0.3; }
    else { mesh(boxG(0.3, 0.2, 0.2), MATS.olive, 0, 0.1, 0, 0, g); mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.3, 10), MATS.iron, 0.2, 0.12, 0, 0, g).rotation.z = Math.PI / 2; }
    const glow = KIT.glow(g, 0, 0.25, 0, 0xffd070, 1.1, 0.55);
    return { g, glow };
  });
}
// Choix des cachettes : un carreau praticable, dégagé, loin des barricades et des portes, dans les zones de la pièce.
function pwrPickTiles() {
  const used = new Set(), out = [];
  const clear = (x, z) => { const cx = tcx(x), cz = tcx(z); for (const b of MAP.props) if (!b.off && b.x0 < cx + 0.75 && b.x1 > cx - 0.75 && b.z0 < cz + 0.75 && b.z1 > cz - 0.75) return false; for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const t = tType(x + dx, z + dz); if (t === T_RAMP || t === T_DOOR) return false; } return true; };
  const ps = SPOTS.power, pd = (x, z) => Math.hypot(x - ps.x, z - ps.z);
  // Repli si les zones prévues n'offrent aucune cachette : toute zone à ouvrir, puis n'importe quel sol (une pièce introuvable bloquerait le courant).
  const scan = (ok) => { const c = []; for (let z = 0; z < MAP_D; z++) for (let x = 0; x < MAP_W; x++) { const i = ti(x, z); if (MAP.type[i] === T_FLOOR && !used.has(i) && ok(MAP.zone[i], x, z)) c.push(i); } return c; };
  for (const p of pwrParts()) {
    let c = scan((zn, x, z) => p.zones.includes(zn) && pd(x, z) >= 3 && clear(x, z));
    if (!c.length) c = scan((zn, x, z) => zn > 0 && pd(x, z) >= 3 && clear(x, z));
    if (!c.length) c = scan((zn, x, z) => pd(x, z) >= 2);
    const i = c.length ? c[(Math.random() * c.length) | 0] : -1; out.push(i); if (i >= 0) used.add(i);
  }
  return out;
}
const pwrState = () => ({ s: PWR.stage, t: PWR.tiles, g: PWR.got, p: +PWR.prog.toFixed(1) });
function pwrReset() { Object.assign(PWR, { stage: 0, tiles: [-1, -1, -1], got: [0, 0, 0], prog: 0, stall: 0, picked: false }); pwrVisuals(0); }
function pwrApply(d, quiet) {
  const prev = PWR.stage; if (!d) return;
  PWR.stage = d.s ?? PWR.stage; if (d.t) PWR.tiles = d.t; if (d.g) PWR.got = d.g; if (d.p !== undefined) PWR.prog = d.p;
  (WORLD.pwrParts || []).forEach((w, i) => { const ti0 = PWR.tiles[i]; w.g.visible = PWR.stage === 0 && ti0 >= 0 && !PWR.got[i]; if (ti0 >= 0) { const x = (ti0 % MAP_W) * TILE + TILE / 2, z = Math.floor(ti0 / MAP_W) * TILE + TILE / 2; w.g.position.set(x + 0.3, groundAt(x, z) + 0.02, z - 0.25); } });
  if (quiet) return;
  if (PWR.stage === 1 && prev === 0) { UI.message('PIÈCES RÉUNIES', 'Installez-les au générateur.'); Sfx.jingle?.([0, 4, 7, 12], 330, 'triangle', 0.1); }
  if (PWR.stage === 2 && prev === 1) UI.message('GÉNÉRATEUR PRÊT', 'Lancez le moteur.');
  if (PWR.stage === 3 && prev === 2) { UI.message('MONTÉE EN RÉGIME', `Restez près du générateur : ils arrivent !`); Sfx.generatorStart?.(WORLD.power.pos); FX.shake = Math.max(FX.shake, 0.25); }
}
/* ─── Hôte ─── */
function pwrHost(dt) {
  if (G.power) return;
  if (PWR.stage === 0 && PWR.tiles.some((t) => t < 0) && G.round >= 1 && !PWR.picked) { PWR.picked = true; PWR.tiles = pwrPickTiles(); G.emit('pwr', pwrState()); }
  if (PWR.stage !== 3) return;
  // Montée en régime : seulement si un soldat reste près du générateur ; sinon le moteur s'essouffle.
  const g = WORLD.power.pos; let near = false;
  for (const [, p] of G.players) if (!p.down && !p.dead && Math.hypot(p.pos.x - g.x, p.pos.z - g.z) < PWR_RADIUS) near = true;
  PWR.prog = near ? Math.min(PWR.need, PWR.prog + dt) : Math.max(0, PWR.prog - dt * 0.6);
  G.toSpawn = Math.max(G.toSpawn, 3 + G.players.size * 2); if (G.breakT > 0) G.breakT = Math.max(G.breakT, 2);
  if (PWR.prog >= PWR.need) { G.emit('pwr', Object.assign(pwrState(), { s: 4 })); G.emit('power', {}); for (const [pid] of G.players) G.addPoints(pid, 500, false); return; }
  PWR.syncT = (PWR.syncT || 0) - dt; if (PWR.syncT <= 0) { PWR.syncT = 0.5; G.netEvent('pwr', pwrState()); }
}
function pwrInteract(pid, kind, id) {
  if (G.power) return false;
  // L'état change par l'événement (appliqué aussi chez l'hôte) : messages et sons pour tout le monde.
  if (kind === 'ppart') { if (PWR.stage !== 0 || PWR.got[id] || PWR.tiles[id] < 0) return true; const g = PWR.got.slice(); g[id] = 1; G.emit('pwr', Object.assign(pwrState(), { g, s: g.every(Boolean) ? 1 : 0, k: id, who: G.players.get(pid)?.name || '' })); return true; }
  if (kind === 'pinst') { if (PWR.stage === 1) G.emit('pwr', Object.assign(pwrState(), { s: 2 })); return true; }
  if (kind === 'pstart') { if (PWR.stage === 2) G.emit('pwr', Object.assign(pwrState(), { s: 3, p: 0 })); return true; }
  return false;
}
// Pendant la montée en régime, les infectés arrivent plus vite.
const pwrSpawnFactor = () => (PWR.stage === 3 && !G.power ? 0.5 : 1);
/* ─── Tous ─── */
function pwrVisuals(dt) {
  const t = G.time;
  for (const w of WORLD.pwrParts || []) if (w.g.visible) { w.g.rotation.y += dt * 0.8; w.glow.material.opacity = 0.4 + Math.sin(t * 3) * 0.2; }
  if (PWR.stage === 3 && !G.power && WORLD.power) { WORLD.power.lamp.color.set(Math.sin(t * 10) > 0 ? 0xffaa22 : 0x553300); if (Math.random() < dt * 6) FX.soft.spawn(WORLD.power.pos.x + rand(-0.4, 0.4), 2.2, WORLD.power.pos.z + rand(-0.4, 0.4), rand(-0.2, 0.2), rand(0.6, 1.2), rand(-0.2, 0.2), rand(1.5, 2.5), rand(0.3, 0.6), 0.25, 0.24, 0.23, 0.5, -0.1, 1.4, 1.0); if (!G.authority && PWR.prog < PWR.need) PWR.prog = Math.min(PWR.need, PWR.prog + dt * 0.5); }
}
function pwrCandidates(cand, px, pz) {
  if (G.power) return;
  const g = WORLD.power.pos, d = Math.hypot(px - g.x, pz - g.z), n = PWR.got.filter(Boolean).length;
  if (PWR.stage === 0) cand(d, { kind: 'info', text: `Générateur en panne — pièces trouvées : ${n}/3`, range: 1.9, deny: true });
  else if (PWR.stage === 1) cand(d, { kind: 'pinst', text: 'Maintenir pour installer les pièces', range: 1.9, hold: true, holdTime: 2.5 });
  else if (PWR.stage === 2) cand(d, { kind: 'pstart', text: 'Maintenir pour lancer le moteur', range: 1.9, hold: true, holdTime: 2.0 });
  else if (PWR.stage === 3) cand(d, { kind: 'info', text: `Montée en régime : ${Math.round((PWR.prog / PWR.need) * 100)} %`, range: 2.5 });
  if (PWR.stage === 0) pwrParts().forEach((p, i) => { const w = WORLD.pwrParts?.[i]; if (!w || !w.g.visible) return; cand(Math.hypot(px - w.g.position.x, pz - w.g.position.z), { kind: 'ppart', id: i, text: `Ramasser : ${p.name.toLowerCase()}`, range: 1.4 }); });
}
// Ligne d'objectif (bandeau du haut) tant que le courant n'est pas rétabli.
function pwrObjective() {
  if (G.power) return null;
  const parts = pwrParts(), n = PWR.got.filter(Boolean).length;
  if (PWR.stage === 0) return { title: 'RÉTABLIR LE COURANT', line: `Trouver les pièces du générateur (${n}/3)`, sub: parts.map((p, i) => `${PWR.got[i] ? '✔' : '○'} ${p.name}`).join('   ·   '), hint: pwrHint() };
  const at = [WORLD.power.pos.x, 1.8, WORLD.power.pos.z];
  if (PWR.stage === 1) return { title: 'RÉTABLIR LE COURANT', line: 'Installer les pièces au générateur', sub: ZONE_NAMES[MAP.zone[ti(SPOTS.power.x, SPOTS.power.z)]] || '', at };
  if (PWR.stage === 2) return { title: 'RÉTABLIR LE COURANT', line: 'Lancer le moteur du générateur (maintenir E)', sub: '', at };
  if (PWR.stage === 3) return { title: 'DÉFENDRE LE GÉNÉRATEUR', line: `Restez à moins de ${PWR_RADIUS} m pendant la montée en régime`, bar: PWR.prog / PWR.need, at };
  return null;
}
// Zones où chercher encore (aide légère : le nom de la zone de la pièce la plus proche non trouvée).
function pwrHint() {
  const z = []; PWR.tiles.forEach((t, i) => { if (t >= 0 && !PWR.got[i]) z.push(ZONE_NAMES[MAP.zone[t]]); });
  return z.length ? 'Cherchez : ' + [...new Set(z)].join(', ') : '';
}
