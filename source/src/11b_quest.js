/* ═══════════════════ OBJECTIF CACHÉ « AUBE BLANCHE » ET BARBELÉS ÉLECTRIFIÉS ═══════════════════
   Après le retour du courant, la radio du poste de commandement grésille. Réparer l'émetteur
   (3 lampes cachées), calibrer la fréquence puis tenir 90 s déclenche un barrage d'artillerie. */

const QUEST = { stage: 0, spots: [], taken: [], calib: 0, hold: 0, lineT: 12, holdStart: 0, prevToSpawn: 0, done: false };
const QUEST_NAMES = ['', 'Écouter la radio du poste de commandement', "Trouver les lampes d'émetteur", 'Installer les lampes dans la radio', 'Calibrer la fréquence (maintenir E sur la radio)', 'Tenir jusqu\'au barrage d\'artillerie', 'Opération Aube Blanche accomplie'];
const TUBE_SPOTS = [
  [55.1, 0.5, 8.35, 0], [16.2, 1.12, 15.3, 0], // tranchée de première ligne (banquette, caisses)
  [24.2, 1.52, 37.1, 1], [26.9, 0.58, 37.3, 1], // poste de commandement (couchette, caisse)
  [17.5, 0.92, 55.2, 2], [28.5, 1.02, 49, 2], // dépôt (fût, touret)
  [60.6, 0.58, 30, 3], [63.4, 0.58, 44, 3], // soutien est (caisses)
];
const RADIO_POS = new THREE.Vector3(11.3, 1.0, 28.6);
const TRAPS = [
  { id: 0, tiles: [[9, 10], [9, 11]], sw: { x: 9, z: 9, wall: 'w' }, cost: 1000, active: 0, cool: 0, zone: 1 },
  { id: 1, tiles: [[22, 24], [23, 24], [24, 24]], sw: { x: 21, z: 24, wall: 'n' }, cost: 1000, active: 0, cool: 0, zone: 3 },
];
const TRAP_TIME = 25, TRAP_COOL = 45;

/* ─── Décor : lampes d'émetteur, barbelés, boîtiers ─── */
function buildQuestProps() {
  const glass = new THREE.MeshStandardMaterial({ color: 0xd8e6ea, roughness: 0.05, metalness: 0.1, transparent: true, opacity: 0.55 });
  const fil = new THREE.MeshBasicMaterial({ color: 0xffa040 });
  WORLD.tubes = TUBE_SPOTS.map(([x, y, z]) => {
    const g = new THREE.Group(); g.position.set(x, y, z); g.visible = false; g.userData.dynamic = true; R.scene.add(g);
    mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.03, 12), MATS.iron, 0, 0.015, 0, 0, g, false);
    mesh(new THREE.CylinderGeometry(0.028, 0.03, 0.11, 12), glass, 0, 0.085, 0, 0, g, false);
    mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.06, 6), fil, 0, 0.08, 0, 0, g, false);
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: TEX.sprites.glow, color: 0xffa050, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.8 }));
    glow.scale.set(0.45, 0.45, 1); glow.position.y = 0.09; g.add(glow);
    return { g, glow };
  });
  const rl = new THREE.Sprite(new THREE.SpriteMaterial({ map: TEX.sprites.glow, color: 0x55ff77, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0 }));
  rl.scale.set(0.5, 0.5, 1); rl.position.set(RADIO_POS.x + 0.1, 1.28, RADIO_POS.z); R.scene.add(rl); WORLD.radioLamp = rl;
  // Barbelés électrifiables.
  WORLD.traps = TRAPS.map((t) => {
    const mat = new THREE.MeshStandardMaterial({ color: 0x2a2a2a, roughness: 0.4, metalness: 0.8, emissive: 0x3ab8ff, emissiveIntensity: 0 });
    const g = new THREE.Group(); g.userData.dynamic = true; R.scene.add(g);
    for (const [tx, tz] of t.tiles) {
      const axisX = !isTrench(tx, tz - 1) || !isTrench(tx, tz + 1); // le boyau court selon X
      const cx = tcx(tx), cz = tcx(tz);
      for (const o of [-0.78, 0.78]) { const c = new THREE.Mesh(helixGeo(TILE, 0.22, 8), mat); c.position.set(cx + (axisX ? 0 : o), 0.24, cz + (axisX ? o : 0)); c.rotation.set(axisX ? 0 : Math.PI / 2, 0, axisX ? Math.PI / 2 : 0); g.add(c); }
      for (const h of [0.35, 0.7]) { const w = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, TILE * 0.95, 4), mat); w.position.set(cx, h, cz); w.rotation.set(axisX ? Math.PI / 2 : 0, 0, axisX ? 0 : Math.PI / 2); g.add(w); }
    }
    const s = wallSpot(t.sw, 0.1), box = new THREE.Group(); box.position.set(s.x, 0, s.z); box.rotation.y = s.yaw; box.userData.dynamic = true; R.scene.add(box);
    mesh(boxG(0.4, 0.55, 0.14), MATS.olive, 0, 1.3, 0, 0, box);
    const warn = new THREE.Mesh(new THREE.PlaneGeometry(0.36, 0.2), new THREE.MeshStandardMaterial({ map: woodSign(['DANGER', `${t.cost} · COURANT`], { w: 256, h: 140, bg: '#b8871c', color: '#1a1408' }), roughness: 0.7 }));
    warn.position.set(0, 1.72, 0.08); box.add(warn);
    const lampMat = new THREE.MeshBasicMaterial({ color: 0x551010 }); mesh(new THREE.SphereGeometry(0.03, 8, 6), lampMat, 0.12, 1.45, 0.08, 0, box, false);
    return { mat, g, lampMat, pos: new THREE.Vector3(s.x, 1.2, s.z), buzzT: 0 };
  });
}

/* ─── Hôte ─── */
function questReset() {
  Object.assign(QUEST, { stage: 0, spots: [], taken: [], calib: 0, hold: 0, lineT: 12, done: false });
  for (const t of WORLD.tubes || []) t.g.visible = false;
  for (const t of TRAPS) { t.active = 0; t.cool = 0; }
  UI.objective && UI.objective();
}
function questState() { return { s: QUEST.stage, sp: QUEST.spots, tk: QUEST.taken, c: +QUEST.calib.toFixed(1), h: +QUEST.hold.toFixed(1) }; }
function questHost(dt) {
  if (QUEST.stage === 0 && G.power) {
    // Trois lampes : une en première ligne, une au poste ou au dépôt, une en soutien ou au dépôt.
    const byZone = (zs) => TUBE_SPOTS.map((s, i) => [s, i]).filter(([s]) => zs.includes(s[3])).map(([, i]) => i);
    const pickOne = (arr, not) => { const a = arr.filter((i) => !not.includes(i)); return a[(Math.random() * a.length) | 0]; };
    const a = pickOne(byZone([0]), []), b = pickOne(byZone([1, 2]), [a]), c = pickOne(byZone([3, 2]), [a, b]);
    QUEST.spots = [a, b, c]; QUEST.taken = [0, 0, 0];
    G.emit('quest', Object.assign(questState(), { s: 1 }));
  }
  if (QUEST.stage === 1) { QUEST.lineT -= dt; if (QUEST.lineT <= 0) { QUEST.lineT = 26; G.emit('qline', { k: 'call' }); } }
  if (QUEST.stage === 5) {
    QUEST.hold -= dt; G.toSpawn = Math.max(G.toSpawn, 6);
    if (QUEST.hold <= 30 && QUEST.hold + dt > 30) G.emit('qline', { k: 'thirty' });
    if (QUEST.hold <= 0) { G.emit('quest', Object.assign(questState(), { s: 6 })); G.emit('barrage', {}); G.toSpawn = QUEST.prevToSpawn; for (const [pid] of G.players) G.addPoints(pid, 3000, false); }
    else if (Math.random() < dt * 0.4) G.netEvent('qtick', { h: +QUEST.hold.toFixed(0) });
  }
  // Barbelés : minuteries et électrocution.
  for (const t of TRAPS) {
    if (t.cool > 0) t.cool = Math.max(0, t.cool - dt);
    if (t.active <= 0) continue;
    t.active = Math.max(0, t.active - dt); if (t.active === 0) t.cool = TRAP_COOL;
    for (const z of ZOMBIES) { if (!z.alive || z.state === 'rise') continue; const tx = tileOf(z.pos.x), tz = tileOf(z.pos.z); if (t.tiles.some(([a, b]) => a === tx && b === tz)) { z.hp = 0; G.killZombie(z, t.owner || P.id, { dir: new THREE.Vector3(rand(-1, 1), 0, rand(-1, 1)), shock: true, noPoints: true }); G.emit('zap', { x: +z.pos.x.toFixed(1), z: +z.pos.z.toFixed(1) }); } }
    t.hurtT = (t.hurtT || 0) - dt;
    if (t.hurtT <= 0) { t.hurtT = 0.5; for (const [, p] of G.players) { if (p.down || p.dead) continue; const tx = tileOf(p.pos.x), tz = tileOf(p.pos.z); if (t.tiles.some(([a, b]) => a === tx && b === tz)) G.damagePlayer(p, 20, { pos: p.pos.clone().add(_v1.set(0.3, 0, 0)) }); } }
  }
}
function questInteract(pid, kind, id) {
  if (kind === 'radio') {
    if (QUEST.stage === 1) { G.emit('quest', Object.assign(questState(), { s: 2 })); G.emit('qline', { k: 'listen' }); }
    else if (QUEST.stage === 3) { G.emit('quest', Object.assign(questState(), { s: 4 })); G.emit('qline', { k: 'install' }); }
  } else if (kind === 'tube') {
    const i = QUEST.spots.indexOf(id); if (QUEST.stage !== 2 || i < 0 || QUEST.taken[i]) return;
    QUEST.taken[i] = 1; const n = QUEST.taken.filter(Boolean).length;
    G.emit('quest', Object.assign(questState(), { s: n >= 3 ? 3 : 2 })); G.emit('qline', { k: 'tube', n });
  } else if (kind === 'calib') {
    if (QUEST.stage !== 4) return;
    const p = G.players.get(pid); if (!p || G.time - (p.calibT ?? -1) < 0.18) return;
    const gain = clamp(G.time - (p.calibT ?? G.time - 0.25), 0, 0.3); p.calibT = G.time;
    QUEST.calib = Math.min(20, QUEST.calib + gain);
    if (QUEST.calib >= 20) { QUEST.hold = 90; QUEST.prevToSpawn = G.toSpawn; G.emit('quest', Object.assign(questState(), { s: 5, h: 90 })); G.emit('qline', { k: 'hold' }); }
    else if (Math.round(QUEST.calib * 4) % 4 === 0) G.netEvent('quest', questState());
  } else if (kind === 'trap') {
    const t = TRAPS[id]; if (!t || !G.power) return G.tell(pid, 'deny');
    if (t.active > 0 || t.cool > 0) return G.tell(pid, 'deny');
    if (G.pay(pid, t.cost)) { t.active = TRAP_TIME; t.owner = pid; G.emit('trap', { id, t: TRAP_TIME }); }
  }
}
// Pendant la calibration et l'attente, les infectés affluent.
function questSpawnFactor() { return QUEST.stage === 4 ? 0.6 : QUEST.stage === 5 ? 0.45 : 1; }

/* ─── Tous les joueurs ─── */
const QLINES = {
  call: ['…Poste 7… ici Aurore… répondez…', '…Aurore appelle Poste 7… vous m\'entendez ?…', '…Poste 7… signal faible… répondez…'],
  listen: ["Aurore à Poste 7 : votre émetteur est hors service. Trouvez trois lampes de rechange dans le secteur. À vous."],
  install: ['Lampes en place. Calibrez la fréquence : restez sur le cadran. Ils vont entendre le signal.'],
  hold: ['Coordonnées reçues. Barrage d\'artillerie dans 90 secondes. Tenez la position !'],
  thirty: ['Trente secondes. Mettez-vous à couvert.'],
  done: ['Secteur tenu. Beau travail, Poste 7. Terminé.'],
};
function questApply(type, d) {
  if (type === 'quest') {
    const prev = QUEST.stage;
    QUEST.stage = d.s; QUEST.spots = d.sp || QUEST.spots; QUEST.taken = d.tk || QUEST.taken; QUEST.calib = d.c ?? QUEST.calib; if (d.h !== undefined) QUEST.hold = d.h;
    (WORLD.tubes || []).forEach((t, i) => { /* lampes : Poste 7 seulement */ const k = QUEST.spots.indexOf(i); t.g.visible = QUEST.stage === 2 && k >= 0 && !QUEST.taken[k]; });
    if (d.s === 2 && prev < 2) UI.message('OBJECTIF SECRET', "Réparez l'émetteur radio du poste de commandement.");
    if (d.s === 6 && prev < 6) { QUEST.done = true; Sfx.jingle([0, 4, 7, 12, 16, 19, 24], 392, 'triangle', 0.14); UI.banner('OPÉRATION AUBE BLANCHE ACCOMPLIE', '+3000 points · le secteur tient bon'); UI.subtitle(QLINES.done[0]); }
    UI.objective();
  } else if (type === 'qline') {
    const arr = QLINES[d.k]; let text = arr ? arr[(Math.random() * arr.length) | 0] : '';
    if (d.k === 'tube') text = `Lampe d'émetteur récupérée (${d.n}/3).`;
    Sfx.radio(RADIO_POS, d.k === 'call' ? 1 : 0.6); UI.subtitle(text, d.k !== 'tube');
  } else if (type === 'qtick') { QUEST.hold = d.h; UI.objective(); }
  else if (type === 'trap') { const t = TRAPS[d.id]; t.active = d.t; t.cool = 0; Sfx.zapStart(WORLD.traps[d.id].pos); UI.message('BARBELÉS SOUS TENSION', `${d.t} secondes — ne vous en approchez pas`); }
  else if (type === 'zap') { const p = _v1.set(d.x, 1, d.z); fxSparks(p, 14); for (let i = 0; i < 6; i++) FX.glow.spawn(d.x + rand(-0.3, 0.3), rand(0.3, 1.6), d.z + rand(-0.3, 0.3), rand(-2, 2), rand(0, 2), rand(-2, 2), rand(0.15, 0.35), 0.12, 0.5, 0.8, 1, 1, 0, 1, 0.5); Sfx.zap(p); }
  else if (type === 'barrage') barrageFX();
}
function questVisuals(dt) {
  const t = G.time;
  for (const tb of WORLD.tubes) if (tb.g.visible) { tb.glow.material.opacity = 0.55 + Math.sin(t * 4) * 0.25; tb.g.rotation.y += dt * 0.6; }
  WORLD.radioLamp.material.opacity = QUEST.stage >= 1 && QUEST.stage < 6 ? (Math.sin(t * (QUEST.stage === 4 ? 12 : 3)) > 0 ? 0.9 : 0.15) : 0;
  TRAPS.forEach((tr, i) => {
    const w = WORLD.traps[i];
    if (tr.active > 0) { tr.active = Math.max(0, tr.active - (G.authority ? 0 : dt)); w.mat.emissiveIntensity = Math.random() < 0.7 ? 1.5 + Math.random() * 2 : 0.2; w.lampMat.color.set(0x3ab8ff); if (Math.random() < dt * 25) { const [tx, tz] = tr.tiles[(Math.random() * tr.tiles.length) | 0]; fxSparks(_v1.set(tcx(tx) + rand(-0.9, 0.9), rand(0.2, 0.75), tcx(tz) + rand(-0.9, 0.9)), 3); } w.buzzT -= dt; if (w.buzzT <= 0) { w.buzzT = 0.45; Sfx.buzz(w.pos); } }
    else { w.mat.emissiveIntensity = 0; w.lampMat.color.set(G.power ? (tr.cool > 0 ? 0xffaa22 : 0x44ff66) : 0x551010); if (!G.authority && tr.cool > 0) tr.cool = Math.max(0, tr.cool - dt); }
  });
}
function barrageFX() {
  UI.subtitle('Feu !', true); Sfx.artillery(); FX.shake = Math.max(FX.shake, 0.6);
  for (let i = 0; i < 14; i++) setTimeout(() => {
    const x = rand(4, 76), z = rand(-30, 2); fxExplosion(_v3.set(x, surfH(x, z), z), 5);
    if (i === 13 && G.authority) { for (const zb of [...ZOMBIES]) if (zb.alive) { zb.die({ explosive: true, dir: _v1.set(rand(-1, 1), 0, rand(-1, 1)) }); G.emit('zdie', { id: zb.id, h: 0, e: 1, dx: 0, dz: 1 }, true); } G.alive = 0; }
  }, 400 + i * 260);
  const fl = $('flashWhite'); setTimeout(() => { fl.style.transition = 'none'; fl.style.opacity = 0.5; requestAnimationFrame(() => { fl.style.transition = 'opacity 1.6s'; fl.style.opacity = 0; }); }, 3800);
}

/* ─── Interactions proposées au joueur local ─── */
function questCandidates(cand, px, pz) {
  if (QUEST.stage >= 1 && QUEST.stage <= 4) {
    const d = Math.hypot(px - RADIO_POS.x, pz - RADIO_POS.z);
    if (QUEST.stage === 1) cand(d, { kind: 'radio', text: 'Écouter la radio', range: 1.9 });
    else if (QUEST.stage === 2) cand(d, { kind: 'info', text: `Émetteur en panne — lampes trouvées : ${QUEST.taken.filter(Boolean).length}/3`, range: 1.9 });
    else if (QUEST.stage === 3) cand(d, { kind: 'radio', text: 'Installer les lampes dans la radio', range: 1.9 });
    else if (QUEST.stage === 4) cand(d, { kind: 'calib', text: `Maintenir pour calibrer la fréquence (${Math.round((QUEST.calib / 20) * 100)} %)`, range: 1.9, hold: true });
  }
  if (QUEST.stage === 2) QUEST.spots.forEach((si, k) => { if (QUEST.taken[k]) return; const s = TUBE_SPOTS[si]; cand(Math.hypot(px - s[0], pz - s[2]), { kind: 'tube', id: si, text: "Ramasser la lampe d'émetteur", range: 1.5 }); });
  TRAPS.forEach((t, i) => {
    if (!MAP.zoneActive[t.zone]) return; const w = WORLD.traps[i], d = Math.hypot(px - w.pos.x, pz - w.pos.z);
    if (!G.power) cand(d, { kind: 'info', text: 'Barbelés électrifiés — il faut du courant', range: 1.6, deny: true });
    else if (t.active > 0) cand(d, { kind: 'info', text: `Barbelés sous tension (${Math.ceil(t.active)} s)`, range: 1.6 });
    else if (t.cool > 0) cand(d, { kind: 'info', text: `Barbelés en recharge (${Math.ceil(t.cool)} s)`, range: 1.6, deny: true });
    else cand(d, { kind: 'trap', id: i, text: 'Électrifier les barbelés', cost: t.cost, range: 1.6 });
  });
}

// Ligne de mission de Poste 7 pour le bandeau d'objectif.
function questObjective() {
  if (MAP_ID !== 'poste7') return null; const s = QUEST.stage;
  if (!s || s >= 6) return null;
  const o = { title: 'OPÉRATION AUBE BLANCHE', line: QUEST_NAMES[s], sub: '' };
  if (s === 1) o.sub = 'La radio du poste de commandement grésille';
  if (s === 2) { o.line += ` (${QUEST.taken.filter(Boolean).length}/3)`; o.sub = 'Une en première ligne, une au poste ou au dépôt, une en soutien ou au dépôt'; }
  if (s === 3) o.sub = 'Poste de commandement';
  if (s === 4) o.bar = QUEST.calib / 20;
  if (s === 5) { o.line += ` — ${Math.max(0, Math.ceil(QUEST.hold))} s`; o.bar = 1 - QUEST.hold / 90; }
  if (s !== 2) o.at = [RADIO_POS.x, 1.4, RADIO_POS.z];
  return o;
}
