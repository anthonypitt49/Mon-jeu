/* ═══════════════════ POSTE 7 : « AUBE BLANCHE », LA GRANDE QUÊTE (version 7.1) ═══════════════════
   Suite de 11b_quest.js. Le barrage d'artillerie (étape 5) n'arrête rien : les morts remontent d'une sape allemande
   creusée sous le secteur. Étapes : 6 écouter au géophone de la chambre de mine · 7 porter trois charges d'ammonal sous
   la ferme, le Cratère et la plate-forme · 8 nourrir les tombes de la ferme (infectés abattus près d'elles) · 9 prendre
   la plaque d'identité de la tombe ouverte · 10 la jeter dans le puits · 11 relever les quatre chiffres apparus dans le
   secteur · 12 les envoyer en morse depuis le poste d'observation · 13 mise à feu (tenir 60 s) · 14 abattre le Sapeur,
   sorti du Cratère après l'explosion · 15 l'aube se lève (récompense). Manches minimales : 8 pour les tombes, 11 pour le
   morse, 13 pour la mise à feu (la quête dure environ une heure).
   L'hôte décide et diffuse l'état complet ('quest') et les effets ('aube') ; chaque poste joue les visuels et les sons. */

const AUBE = {
  GEO: [45.6, 70.2], PICK: [41.4, 69.2], PLANT: [[13.4, 69.5], [46, 32], [87, 36.5]], PLANT_NAMES: ['sous la ferme (près du puits)', 'au fond du Cratère', 'sous la plate-forme d\'observation'],
  GRAVE: [29.6, 71.5], TAG: [29.2, 73.8], WELL: [11.5, 69.5], LAMP: [90.4, 38.4], DET: [46.2, 79.6], CRATER: [46, 32],
  MARKS: [[41, 1.45, 12.12, 0], [10.12, 1.45, 33, Math.PI / 2], [38.06, 1.1, 34, Math.PI / 2], [44, null, 81.94, Math.PI]], // (paroi derrière chacun ; y null : sol de la chambre + 1,4)
  GATE: { 8: 8, 12: 11, 13: 13 }, SOULS: 20, LISTEN: 8, MORSE: 6, FUSE: 60,
};
const AUBE_NAMES = { 6: 'Écouter au géophone de la chambre de mine', 7: "Poser les charges d'ammonal", 8: 'Nourrir les tombes de la ferme', 9: "Prendre la plaque d'identité", 10: 'Jeter la plaque dans le puits', 11: 'Relever les quatre chiffres', 12: 'Envoyer le message en morse', 13: 'Mise à feu : tenir la chambre de mine', 14: 'Abattre le Sapeur', 15: 'L\'aube se lève' };
const AUBE_FX = { souls: [], dust: 0, flick: 0, morse: null, fuse: 0, sparks: 0, dawn0: null };
const MORSE_D = ['-----', '.----', '..---', '...--', '....-', '.....', '-....', '--...', '---..', '----.'];

/* ─── Décor propre à la quête ─── */
function buildAubeProps() {
  // Chiffres tracés à la craie luminescente (cachés jusqu'à l'étape 11).
  WORLD.aubeMarks = AUBE.MARKS.map(([x, y, z, ry], i) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.5), new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false, opacity: 0, map: aubeMarkTex(i, 0) }));
    m.position.set(x, y ?? floorAt(x, z) + 1.4, z); m.rotation.y = ry; m.visible = false; m.userData.dynamic = true; R.scene.add(m); return m;
  });
  // Emplacements des charges : terre fendue d'où monte de la poussière ; charge posée (caisse et lampe rouge).
  WORLD.aubePlants = AUBE.PLANT.map(([x, z]) => {
    const g = new THREE.Group(); g.position.set(x, floorAt(x, z), z); g.userData.dynamic = true; g.visible = false; R.scene.add(g);
    const crack = new THREE.Mesh(new THREE.CircleGeometry(0.7, 14), new THREE.MeshBasicMaterial({ color: 0x0c0907, transparent: true, opacity: 0.85, depthWrite: false })); crack.rotation.x = -Math.PI / 2; crack.position.y = 0.03; g.add(crack);
    const box = new THREE.Group(); box.visible = false; g.add(box);
    mesh(boxG(0.55, 0.38, 0.4), MATS.crate, 0, 0.19, 0, 0.3, box);
    const lamp = mesh(new THREE.SphereGeometry(0.04, 8, 6), new THREE.MeshBasicMaterial({ color: 0xff2010 }), 0, 0.42, 0, 0, box, false);
    return { g, box, lamp };
  });
  // Plaque d'identité sur la tombe ouverte, lampe de signalisation du poste d'observation.
  { const g = new THREE.Group(); g.position.set(AUBE.TAG[0], 0.25, AUBE.TAG[1]); g.visible = false; g.userData.dynamic = true; R.scene.add(g);
    mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.01, 16), MATS.brass, 0, 0, 0, 0, g, false).rotation.x = Math.PI / 2;
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: TEX.sprites.glow, color: 0x6aff7a, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.9 })); glow.scale.set(0.8, 0.8, 1); g.add(glow);
    WORLD.aubeTag = g; }
  { const [x, z] = AUBE.LAMP, y0 = floorAt(x, z), g = new THREE.Group(); g.position.set(x, y0, z); g.rotation.y = -0.6; R.scene.add(g);
    for (const a of [0.4, 2.5, 4.6]) { const leg = mesh(boxG(0.035, 1.1, 0.035), rawPost(), Math.sin(a) * 0.22, 0.5, Math.cos(a) * 0.22, 0, g); leg.rotation.x = -Math.cos(a) * 0.35; leg.rotation.z = Math.sin(a) * 0.35; }
    const head = new THREE.Group(); head.position.y = 1.1; head.rotation.x = -0.25; g.add(head);
    mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.42, 14), MATS.olive, 0, 0, 0, 0, head).rotation.x = Math.PI / 2;
    const lens = mesh(new THREE.CircleGeometry(0.14, 16), new THREE.MeshBasicMaterial({ color: 0x2a2a20 }), 0, 0, -0.215, Math.PI, head, false);
    const beam = new THREE.Sprite(new THREE.SpriteMaterial({ map: TEX.sprites.glow, color: 0xfff2c0, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0 })); beam.scale.set(2.4, 2.4, 1); beam.position.z = -0.3; head.add(beam);
    collider(x - 0.3, z - 0.3, x + 0.3, z + 0.3, y0 + 1.3, 'metal', y0);
    WORLD.aubeLamp = { lens, beam, pos: new THREE.Vector3(x, y0 + 1.1, z) }; }
}
function aubeMarkTex(i, d) {
  return textTexture(256, 180, (x, w, h) => {
    x.clearRect(0, 0, w, h); x.textAlign = 'center'; x.lineJoin = 'round';
    // (trait sombre sous la craie : lisible sur la terre claire comme sur les planches)
    for (const [f, y, t] of [['bold 52px serif', 62, ['I', 'II', 'III', 'IV'][i]], ['bold 92px serif', 160, String(d)]]) {
      x.font = f; x.shadowBlur = 0; x.strokeStyle = 'rgba(5,20,8,0.75)'; x.lineWidth = 10; x.strokeText(t, w / 2, y);
      x.fillStyle = 'rgba(160,255,160,1)'; x.shadowColor = '#4dff6a'; x.shadowBlur = 16; x.fillText(t, w / 2, y);
    }
  });
}

/* ─── État partagé ─── */
function aubeReset() {
  Object.assign(QUEST, { listen: 0, planted: [0, 0, 0], carry: [], souls: 0, tagBy: 0, code: [], found: [0, 0, 0, 0], morse: 0, fuse: 0, bossId: 0, bossT: 0, dawn: 0 });
  AUBE_FX.souls.forEach((s) => R.scene.remove(s.sp)); AUBE_FX.souls.length = 0; AUBE_FX.morse = null;
  if (AUBE_FX.dawn0) aubeDawn(0);
}
function aubeState() { const Q = QUEST; return { l: +(Q.listen || 0).toFixed(1), pl: Q.planted, cr: Q.carry, so: Q.souls, tg: Q.tagBy, cd: Q.code, fd: Q.found, mo: +(Q.morse || 0).toFixed(1), fu: +(Q.fuse || 0).toFixed(0), bo: Q.bossId }; }
function aubeSet(d) {
  const Q = QUEST;
  if (d.l !== undefined) Q.listen = d.l; if (d.pl) Q.planted = d.pl; if (d.cr) Q.carry = d.cr; if (d.so !== undefined) Q.souls = d.so; if (d.tg !== undefined) Q.tagBy = d.tg;
  if (d.cd) Q.code = d.cd; if (d.fd) Q.found = d.fd; if (d.mo !== undefined) Q.morse = d.mo; if (d.fu !== undefined) Q.fuse = d.fu; if (d.bo !== undefined) Q.bossId = d.bo;
}
// Action maintenue (calibrer, écouter, transmettre) : 0,25 s par message du joueur, jamais plus que le temps écoulé chez
// l'hôte ; la réserve (0,6 s) fait compter deux messages arrivés dans la même image (gigue du réseau en co-op).
function holdGain(p, key) {
  const now = G.time, last = p[key] ?? now - 0.25; p[key] = now;
  const r = Math.min(0.6, (p[key + 'R'] ?? 0.25) + Math.max(0, now - last)), g = Math.min(0.25, r); p[key + 'R'] = r - g; return g;
}
const aubeEmit = (s) => G.emit('quest', Object.assign(questState(), s !== undefined ? { s } : {}));
const aubeGate = (s) => G.round >= (AUBE.GATE[s] || 0);

/* ─── Hôte ─── */
function aubeHost(dt) {
  const Q = QUEST, s = Q.stage;
  if (s === 7) { // un porteur à terre lâche sa charge (elle retourne dans la chambre de mine)
    const keep = Q.carry.filter((pid) => { const p = G.players.get(pid); return p && !p.down && !p.dead; });
    if (keep.length !== Q.carry.length) { Q.carry = keep; aubeEmit(); }
  }
  if (s === 13 && Q.fuse > 0) {
    Q.fuse -= dt; G.toSpawn = Math.max(G.toSpawn, 8 + G.players.size * 2); // la manche ne finit pas pendant la mise à feu
    if (Q.fuse <= 0) {
      Q.fuse = 0; Q.bossT = 4.5; aubeEmit(14); G.emit('aube', { k: 'boom' });
      for (const zb of [...ZOMBIES]) if (zb.alive) { zb.die({ explosive: true, dir: _v1.set(rand(-1, 1), 0, rand(-1, 1)) }); G.emit('zdie', { id: zb.id, h: 0, e: 1, dx: 0, dz: 1 }, true); }
      G.alive = 0; G.toSpawn = 4 + 2 * G.players.size; G.spawnT = 7; // quelques renforts derrière le Sapeur
    } else if (Math.random() < dt * 0.5) aubeEmit();
  }
  if (s === 14 && !Q.bossId) {
    Q.bossT -= dt;
    if (Q.bossT <= 0) {
      const [x, z] = AUBE.CRATER, hp = Math.round((G.zHp || 1000) * 24 + 8000 * Math.max(1, G.players.size));
      const zb = new Zombie({ x, z, y: floorAt(x, z), kind: 'warden', hp, round: G.round, yaw: 0, state: 'rise' });
      zb.sapeur = true; Q.bossId = zb.id; aubeEmit(); G.emit('aube', { k: 'boss', id: zb.id });
    }
  }
  // Le Sapeur disparu sans passer par bossDown (brisé par le gel, par exemple) compte comme abattu.
  if (s === 14 && Q.bossId) { const b = ZOMBIES.find((z) => z.id === Q.bossId); if (!b || !b.alive) aubeBossDown(b); }
}
// Le Sapeur : il frappe le sol (secousse, la terre s'ouvre) et fait monter des renforts.
function aubeBossThink(z, dt) {
  if (z.remote || !(z.sapeur || z.id === QUEST.bossId)) return;
  z.stompT = (z.stompT ?? 4) - dt; if (z.stompT > 0) return; z.stompT = rand(5, 8);
  G.emit('aube', { k: 'stomp', x: +z.pos.x.toFixed(1), z: +z.pos.z.toFixed(1) }); G.toSpawn += 2;
}
function aubeBossDown(z) {
  if (QUEST.stage !== 14) return;
  const pos = z ? z.pos : _v2.set(AUBE.CRATER[0], floorAt(...AUBE.CRATER), AUBE.CRATER[1]);
  aubeEmit(15); G.emit('aube', { k: 'dawn' });
  for (const [pid, p] of G.players) {
    G.addPoints(pid, 5000, false);
    const free = Object.keys(PERKS).filter((k) => !p.perks.has(k)); if (free.length) G.emit('perk', { pid, key: pick(free) });
  }
  const at = pos.clone(); setTimeout(() => { if (G.mode === 'playing' && QUEST.stage === 15) G.spawnDrop('maxammo', at, true); }, 6500); // après le bandeau
}
// Infecté abattu près des tombes (étape 8) : son âme rejoint la croix.
function aubeKill(z) {
  const Q = QUEST; if (Q.stage !== 8 || !aubeGate(8)) return;
  if (Math.hypot(z.pos.x - AUBE.GRAVE[0], z.pos.z - AUBE.GRAVE[1]) > 9) return;
  Q.souls = Math.min(AUBE.SOULS, Q.souls + 1);
  G.emit('aube', { k: 'soul', x: +z.pos.x.toFixed(1), y: +(z.pos.y + 1.2).toFixed(1), z: +z.pos.z.toFixed(1) });
  if (Q.souls >= AUBE.SOULS) { aubeEmit(9); G.emit('aube', { k: 'grave' }); } else aubeEmit();
}
function aubeInteract(pid, kind, id) {
  const Q = QUEST, p = G.players.get(pid), s = Q.stage;
  if (kind === 'geo') {
    if (s !== 6 || !p) return true;
    Q.listen = Math.min(AUBE.LISTEN, Q.listen + holdGain(p, 'geoT'));
    if (Math.random() < 0.15) G.emit('aube', { k: 'rumble' });
    if (Q.listen >= AUBE.LISTEN) { aubeEmit(7); G.emit('qline', { k: 'geo' }); } else if (Math.round(Q.listen * 4) % 4 === 0) G.netEvent('quest', questState());
    return true;
  }
  if (kind === 'charge') { if (s === 7 && !Q.carry.includes(pid) && Q.planted.filter(Boolean).length + Q.carry.length < 3) { Q.carry = [...Q.carry, pid]; aubeEmit(); G.emit('qline', { k: 'carry' }); } return true; }
  if (kind === 'plant') {
    if (s !== 7 || !Q.carry.includes(pid) || Q.planted[id]) return true;
    Q.carry = Q.carry.filter((q) => q !== pid); Q.planted = Q.planted.map((v, i) => (i === id ? 1 : v));
    const n = Q.planted.filter(Boolean).length; G.emit('aube', { k: 'plant', id });
    if (n >= 3) { aubeEmit(8); G.emit('qline', { k: 'planted' }); } else { aubeEmit(); G.emit('qline', { k: 'plant', n }); }
    return true;
  }
  if (kind === 'tag') { if (s === 9) { Q.tagBy = pid; aubeEmit(10); G.emit('qline', { k: 'tag' }); } return true; }
  if (kind === 'well') {
    if (s !== 10 || Q.tagBy !== pid) return true;
    Q.tagBy = 0; Q.code = [0, 1, 2, 3].map(() => 1 + ((Math.random() * 9) | 0)); Q.found = [0, 0, 0, 0];
    aubeEmit(11); G.emit('aube', { k: 'well' }); G.emit('qline', { k: 'well' }); return true;
  }
  if (kind === 'digit') {
    if (s !== 11 || Q.found[id]) return true;
    Q.found = Q.found.map((v, i) => (i === id ? 1 : v)); const n = Q.found.filter(Boolean).length;
    aubeEmit(n >= 4 ? 12 : 11); G.emit('qline', { k: n >= 4 ? 'digits' : 'digit', n }); return true;
  }
  if (kind === 'morse') {
    if (s !== 12 || !aubeGate(12) || !p) return true;
    Q.morse = Math.min(AUBE.MORSE, Q.morse + holdGain(p, 'moT'));
    if (Q.morse >= AUBE.MORSE) { aubeEmit(13); Q.fuse = 0; G.emit('aube', { k: 'answer' }); G.emit('qline', { k: 'answer' }); }
    else { if (Math.round(Q.morse * 4) % 4 === 0) G.netEvent('quest', questState()); G.emit('aube', { k: 'blink' }); }
    return true;
  }
  if (kind === 'detonate') {
    if (s !== 13 || !aubeGate(13) || Q.fuse > 0) return true;
    Q.fuse = AUBE.FUSE; if (G.breakT > 0) G.breakT = Math.min(G.breakT, 1); // pendant la pause : la manche suivante part aussitôt
    aubeEmit(); G.emit('aube', { k: 'fuse' }); G.emit('qline', { k: 'fuse' }); return true;
  }
  return false;
}
function aubeSpawnFactor() { const s = QUEST.stage; return s === 6 ? 0.85 : s === 13 && QUEST.fuse > 0 ? 0.4 : 1; }

/* ─── Tous les postes : effets ─── */
const AUBE_LINES = {
  barrage: ["Aurore à Poste 7 : le barrage n'a rien arrêté. Ils remontent d'en dessous… Descendez dans la sape et écoutez.", "Aurore : écoutez au géophone de la chambre de mine. Ils creusent."],
  geo: ['On les entend creuser à trois endroits : sous la ferme, sous le Cratère, sous le poste d\'observation. Prenez l\'ammonal dans la chambre et minez-les.'],
  carry: ['Charge d\'ammonal en main. Doucement…'],
  plant: [''], planted: ["Les trois charges sont posées. Mais ce n'est pas assez… À la ferme, les tombes s'agitent."],
  tag: ['Une plaque d\'identité : « Capitaine A. Delorme, 7e génie ». Le puits…'],
  well: ['Des chiffres verts s\'allument dans le secteur. Relevez-les, puis transmettez-les depuis le poste d\'observation.'],
  digit: [''], digits: ['Les quatre chiffres sont relevés. Au poste d\'observation, la lampe de signalisation.'],
  answer: ['Trois fusées vertes au nord : l\'état-major a reçu. Branchez l\'exploseur dans la chambre de mine.'],
  fuse: ['Mise à feu dans soixante secondes ! Tenez la chambre !'],
};
function aubeLine(d) {
  const arr = AUBE_LINES[d.k]; if (!arr) return false;
  let t = arr[(Math.random() * arr.length) | 0];
  if (d.k === 'plant') t = `Charge posée (${d.n}/3).`; if (d.k === 'digit') t = `Chiffre relevé (${d.n}/4).`;
  Sfx.radio(RADIO_POS, 0.5); UI.subtitle(t, d.k !== 'plant' && d.k !== 'digit'); return true;
}
function aubeApplyFx(d) {
  const Q = QUEST;
  if (d.k === 'rumble') { FX.shake = Math.max(FX.shake, 0.18); AUBE_FX.dust = Math.max(AUBE_FX.dust, 1.2); AUBE_FX.flick = 1; Sfx.stomp?.(0.5, 0); }
  else if (d.k === 'plant') { const w = WORLD.aubePlants[d.id]; if (w) { w.box.visible = true; fxSparks(_v1.set(w.g.position.x, w.g.position.y + 0.4, w.g.position.z), 8); } Sfx.hammer(_v1); }
  else if (d.k === 'soul') { aubeSoul(d.x, d.y, d.z); }
  else if (d.k === 'grave') { const [x, z] = AUBE.TAG; fxSnowBurst(_v1.set(x, 0.3, z), 40); for (let i = 0; i < 30; i++) FX.glow.spawn(x + rand(-0.4, 0.4), rand(0.1, 0.6), z + rand(-0.3, 0.3), rand(-0.3, 0.3), rand(1.5, 4), rand(-0.3, 0.3), rand(1, 2), 0.2, 0.4, 1, 0.5, 0.9, -0.5, 0.3); Sfx.eerie(_v1.set(x, 1, z)); UI.message('LA TOMBE S\'OUVRE', 'Une plaque d\'identité brille dans la terre'); }
  else if (d.k === 'well') { const [x, z] = AUBE.WELL; for (let i = 0; i < 60; i++) FX.soft.spawn(x + rand(-0.6, 0.6), 0.5, z + rand(-0.6, 0.6), rand(-0.3, 0.3), rand(1, 3), rand(-0.3, 0.3), rand(2, 4), 0.7, 0.35, 0.9, 0.45, 0.5, -0.1, 0.3, 0.5); Sfx.eerie(_v1.set(x, 1, z)); Sfx.bell(0, 0.3); R.flash = Math.max(R.flash || 0, 0.8); UI.message('LE PUITS RÉPOND', 'Quatre chiffres verts s\'allument dans le secteur'); }
  else if (d.k === 'blink') { AUBE_FX.morse = AUBE_FX.morse || { t: 0, seq: aubeMorseSeq(Q.code) }; }
  else if (d.k === 'answer') { AUBE_FX.morse = null; for (let k = 0; k < 3; k++) setTimeout(() => aubeFlare(40 + k * 22, -38 - k * 5), 600 + k * 900); }
  else if (d.k === 'fuse') { AUBE_FX.fuse = 1; Sfx.siren(); UI.message('MISE À FEU', `${AUBE.FUSE} secondes — tenez la chambre de mine !`); }
  else if (d.k === 'boom') aubeBoom();
  else if (d.k === 'boss') { const z = ZOMBIES.find((q) => q.id === d.id); if (z) z.sapeur = true; Sfx.siren(); R.flash = 2.2; FX.shake = Math.max(FX.shake, 0.8); fxExplosion(_v1.set(AUBE.CRATER[0], floorAt(...AUBE.CRATER), AUBE.CRATER[1]), 6); UI.message('LE SAPEUR', 'Il sort du Cratère. Son casque arrête les balles : visez le corps.'); }
  else if (d.k === 'stomp') { shakeAt(_v1.set(d.x, 0, d.z), 0.7, 14); Sfx.stomp?.(1, 0); fxSnowBurst(_v1.set(d.x, floorAt(d.x, d.z) + 0.1, d.z), 30); }
  else if (d.k === 'dawn') { QUEST.done = true; Sfx.jingle([0, 4, 7, 12, 16, 19, 24, 28], 392, 'triangle', 0.16); UI.banner('L\'AUBE SE LÈVE', 'Opération Aube Blanche accomplie · +5000 points et un atout offert'); UI.subtitle(QLINES.done[0]); }
  return true;
}
function aubeMorseSeq(code) { const seq = []; for (const c of code || []) { for (const s of MORSE_D[c] || '') seq.push(s === '.' ? 0.18 : 0.5, 0.16); seq.push(0, 0.6); } return seq; }
// Fusée éclairante verte au loin (réponse de l'état-major).
function aubeFlare(x, z) {
  const y0 = surfH(x, z); Sfx.shellWhistle?.(_v1.set(x, y0 + 10, z), 0.8);
  for (let i = 0; i < 18; i++) FX.glow.spawn(x, y0 + 1 + i * 1.6, z, rand(-0.2, 0.2), rand(-0.5, 0.5), rand(-0.2, 0.2), 0.9, 1.1, 0.4, 1, 0.5, 0.9, 0, 0);
  setTimeout(() => { for (let i = 0; i < 40; i++) FX.glow.spawn(x, y0 + 30, z, rand(-4, 4), rand(-1, 4), rand(-4, 4), rand(2, 3.5), 1.6, 0.45, 1, 0.5, 1, 1.2, 0.4); R.flash = Math.max(R.flash || 0, 0.9); const u = R.sky.material.uniforms; u.uFlashCol.value.set(0.4, 1, 0.5); setTimeout(() => u.uFlashCol.value.set(...M.env.sky.flash), 1800); }, 900);
}
function aubeSoul(x, y, z) {
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: TEX.sprites.glow, color: 0x6aff7a, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.95 }));
  sp.scale.set(0.7, 0.7, 1); sp.position.set(x, y, z); R.scene.add(sp); AUBE_FX.souls.push({ sp, t: 0, a: new THREE.Vector3(x, y, z) }); Sfx.whoosh(sp.position, 0.25);
}
function aubeBoom() {
  UI.subtitle('…', false); Sfx.explosion(P.pos, 2.2); Sfx.artillery(); FX.shake = Math.max(FX.shake, 1.4); R.flash = 3;
  const fl = $('flashWhite'); fl.style.transition = 'none'; fl.style.opacity = 0.85; requestAnimationFrame(() => { fl.style.transition = 'opacity 2.4s'; fl.style.opacity = 0; });
  AUBE.PLANT.forEach(([x, z], i) => setTimeout(() => fxExplosion(_v3.set(x, floorAt(x, z), z), 7), 150 + i * 220));
  for (let i = 0; i < 12; i++) setTimeout(() => { const x = rand(0, 110), z = rand(-40, 2); fxExplosion(_v3.set(x, surfH(x, z), z), 6); }, 500 + i * 180);
  AUBE_FX.dust = 6; AUBE_FX.flick = 4;
  for (const w of WORLD.aubePlants) w.g.visible = false;
}
// Ciel de nuit → aube : couleurs du ciel, du brouillard et de la lune (devenue soleil levant), neige qui s'apaise.
function aubeDawn(k) {
  const E = M.env; if (MAP_ID !== 'poste7' || !R.sky) return;
  const u = R.sky.material.uniforms, L = R.lights;
  if (!AUBE_FX.dawn0) AUBE_FX.dawn0 = { zen: u.uZen.value.clone(), disk: u.uDisk.value.clone(), halo: u.uHalo.value.clone(), ca: u.uCloudA.value.clone(), cb: u.uCloudB.value.clone(), glow: u.uGlow.value.clone(), stars: u.uStars.value, fog: FOG_COLOR.clone(), moon: MOON_DIR.clone(), mc: L.moon.color.clone(), mi: L.moon.intensity, hs: L.hemi.color.clone(), hg: new THREE.Color(E.hemi[1]), ho: E.hemiOut, hn: E.hemiIn, fd: E.fogDensity, exp: R.renderer.toneMappingExposure };
  const A = AUBE_FX.dawn0, t = smooth(clamp(k, 0, 1));
  const V = (a, b) => new THREE.Vector3(...b).sub(a).multiplyScalar(t).add(a);
  u.uZen.value.copy(V(A.zen, [0.3, 0.33, 0.48])); u.uDisk.value.copy(V(A.disk, [7, 4.6, 2.6])); u.uHalo.value.copy(V(A.halo, [1.6, 0.8, 0.45]));
  u.uCloudA.value.copy(V(A.ca, [0.42, 0.34, 0.4])); u.uCloudB.value.copy(V(A.cb, [1.1, 0.72, 0.55])); u.uGlow.value.copy(V(A.glow, [1.4, 0.6, 0.32])); u.uStars.value = A.stars * (1 - t);
  FOG_COLOR.copy(A.fog).lerp(new THREE.Color(0x8e8686), t); R.scene.background.copy(FOG_COLOR); R.scene.fog.color.copy(FOG_COLOR);
  MOON_DIR.copy(A.moon).lerp(new THREE.Vector3(0.82, 0.2, 0.35), t).normalize(); // (la lumière suit MOON_DIR à chaque image)
  L.moon.color.copy(A.mc).lerp(new THREE.Color(0xffd6b0), t); L.moon.intensity = lerp(A.mi, 2.4, t);
  // (intensité et couleur du sol de l'ambiance : recalculées à chaque image depuis M.env et R.hemiG, 10_player.js)
  L.hemi.color.copy(A.hs).lerp(new THREE.Color(0xc4bcc0), t); (R.hemiG ||= new THREE.Color()).copy(A.hg).lerp(new THREE.Color(0x4a3c36), t);
  E.hemiOut = lerp(A.ho, A.ho * 1.8, t); E.hemiIn = lerp(A.hn, A.hn * 1.4, t);
  E.fogDensity = lerp(A.fd, A.fd * 0.45, t); WEATHER.dim = 1 - 0.85 * t; R.renderer.toneMappingExposure = lerp(A.exp, A.exp * 1.08, t);
}
function aubeVisuals(dt) {
  const Q = QUEST, t = G.time;
  // Âmes : elles montent puis filent vers la croix.
  for (let i = AUBE_FX.souls.length - 1; i >= 0; i--) {
    const s = AUBE_FX.souls[i]; s.t += dt; const k = clamp(s.t / 1.4, 0, 1), [gx, gz] = AUBE.GRAVE;
    s.sp.position.set(lerp(s.a.x, gx, smooth(k)), lerp(s.a.y, 1.4, k) + Math.sin(k * Math.PI) * 2, lerp(s.a.z, gz, smooth(k)));
    if (k >= 1) { R.scene.remove(s.sp); AUBE_FX.souls.splice(i, 1); FX.glow.spawn(gx, 1.3, gz, 0, 0.6, 0, 0.6, 0.5, 0.4, 1, 0.5, 1, 0, 0); }
  }
  // Poussière qui tombe des plafonds de la Sape, lampes qui vacillent (géophone, explosion, mise à feu).
  if (Q.stage === 6 && Q.listen > 0 && MAP.zoneActive[5] && Math.random() < dt * 0.4) { AUBE_FX.dust = Math.max(AUBE_FX.dust, 0.6); }
  if (AUBE_FX.dust > 0) {
    AUBE_FX.dust -= dt;
    for (let k = 0; k < 3; k++) if (Math.random() < 0.6) { const L = WORLD.sapeLamps[(Math.random() * WORLD.sapeLamps.length) | 0]; if (!L) break; const x = L.g.position.x + rand(-1.5, 1.5), z = L.g.position.z + rand(-1.5, 1.5), y = roofAt(x, z) - 0.05; FX.soft.spawn(x, y, z, rand(-0.1, 0.1), -rand(0.5, 1.2), rand(-0.1, 0.1), rand(1.2, 2), 0.25, 0.45, 0.4, 0.35, 0.6, 2, 0.3, 0.6); }
  }
  AUBE_FX.flick = Math.max(0, AUBE_FX.flick - dt);
  const fuse = Q.stage === 13 && Q.fuse > 0;
  if (WORLD.sapeLamps) for (const L of WORLD.sapeLamps) { const on = AUBE_FX.flick > 0 || fuse ? Math.random() > 0.35 : true; L.glow.material.opacity = on ? 0.8 : 0.1; }
  if (R.lights.mine) R.lights.mine.intensity = (AUBE_FX.flick > 0 || fuse) && Math.random() < 0.4 ? 1.5 : 7;
  // Charges posées : lampe rouge qui clignote ; emplacements visibles pendant l'étape 7.
  WORLD.aubePlants?.forEach((w, i) => { w.g.visible = Q.stage === 7 || (Q.stage >= 8 && Q.stage < 14 && Q.planted[i]); w.box.visible = !!Q.planted[i]; w.lamp.material.color.set(Math.sin(t * (fuse ? 14 : 4)) > 0 ? 0xff2010 : 0x300404); });
  if (Q.stage === 7) for (const [i, w] of (WORLD.aubePlants || []).entries()) if (!Q.planted[i] && Math.random() < dt * 3) FX.soft.spawn(w.g.position.x + rand(-0.4, 0.4), w.g.position.y + 0.05, w.g.position.z + rand(-0.4, 0.4), 0, rand(0.3, 0.8), 0, 1.5, 0.3, 0.5, 0.45, 0.4, 0.5, 0, 0.2, 0.4);
  // Plaque, chiffres, lampe de signalisation.
  if (WORLD.aubeTag) { WORLD.aubeTag.visible = Q.stage === 9; WORLD.aubeTag.rotation.y += dt * 2; }
  WORLD.aubeMarks?.forEach((m, i) => { const on = Q.stage >= 11 && Q.stage < 15 && Q.code.length; if (on && !m.userData.d) { m.material.map = aubeMarkTex(i, Q.code[i]); m.userData.d = Q.code[i]; } if (!on) m.userData.d = 0; m.visible = !!on; if (on) m.material.opacity = (Q.found[i] ? 0.55 : 0.85) + Math.sin(t * 3 + i) * 0.12; });
  if (WORLD.aubeLamp) {
    const mo = AUBE_FX.morse; let lit = 0;
    if (mo) { mo.t += dt; let acc = 0, on = false; for (let i = 0; i < mo.seq.length; i += 2) { const a = mo.seq[i], b = mo.seq[i + 1]; if (mo.t < acc + a) { on = a > 0; break; } acc += a; if (mo.t < acc + b) { on = false; break; } acc += b; } if (mo.t > acc + 0.5 && mo.t > 0.1 && !(Q.stage === 12)) AUBE_FX.morse = null; lit = on ? 1 : 0; if (on && !mo.on) Sfx.hitTick?.(); mo.on = on; if (mo.t > 8) mo.t = 0; }
    WORLD.aubeLamp.beam.material.opacity = lit; WORLD.aubeLamp.lens.material.color.set(lit ? 0xfff6d0 : 0x2a2a20);
  }
  // Mise à feu : étincelles qui courent le long de la galerie, de l'exploseur vers la sortie.
  if (fuse) { AUBE_FX.sparks += dt; const path = [[46.2, 79.6], [42, 75], [36, 73], [49, 73], [60, 73], [63, 68], [63, 62]]; const u = (AUBE_FX.sparks * 0.08) % 1, n = path.length - 1, f = u * n, j = Math.min(n - 1, f | 0), k = f - j; const x = lerp(path[j][0], path[j + 1][0], k), z = lerp(path[j][1], path[j + 1][1], k); fxSparks(_v1.set(x, floorAt(x, z) + 0.1, z), 2); }
  if (!G.authority && fuse) Q.fuse = Math.max(0.5, Q.fuse - dt); // décompte fluide chez les invités (l'hôte corrige)
  // Aube.
  if (Q.stage >= 15 && Q.dawn < 1) { Q.dawn = Math.min(1, Q.dawn + dt / 25); aubeDawn(Q.dawn); }
}

/* ─── Interactions proposées ─── */
function aubeCandidates(cand, px, pz) {
  const Q = QUEST, s = Q.stage, d = (a) => Math.hypot(px - a[0], pz - a[1]);
  if (s === 6) cand(d(AUBE.GEO), { kind: 'geo', text: `Maintenir pour écouter au géophone (${Math.round((Q.listen / AUBE.LISTEN) * 100)} %)`, range: 1.8, hold: true, tick: Q.listen / AUBE.LISTEN });
  if (s === 7) {
    const mine = Q.carry.includes(P.id);
    if (!mine && Q.planted.filter(Boolean).length + Q.carry.length < 3) cand(d(AUBE.PICK), { kind: 'charge', text: "Prendre une charge d'ammonal", range: 1.8 });
    if (mine) AUBE.PLANT.forEach((a, i) => { if (!Q.planted[i]) cand(d(a), { kind: 'plant', id: i, text: 'Maintenir pour poser la charge', range: 1.9, hold: true, holdTime: 2 }); });
  }
  if (s === 9) cand(d(AUBE.TAG), { kind: 'tag', text: "Prendre la plaque d'identité", range: 1.6 });
  if (s === 10 && Q.tagBy === P.id) cand(d(AUBE.WELL), { kind: 'well', text: 'Jeter la plaque dans le puits', range: 2 });
  if (s === 11) AUBE.MARKS.forEach(([x, , z], i) => { if (!Q.found[i]) cand(Math.hypot(px - x, pz - z), { kind: 'digit', id: i, text: `Relever le chiffre ${['I', 'II', 'III', 'IV'][i]} : ${Q.code[i]}`, range: 2.2 }); });
  if (s === 12) cand(d(AUBE.LAMP), aubeGate(12) ? { kind: 'morse', text: `Maintenir pour transmettre ${Q.code.join(' ')} en morse (${Math.round((Q.morse / AUBE.MORSE) * 100)} %)`, range: 1.8, hold: true, tick: Q.morse / AUBE.MORSE } : { kind: 'info', text: `Lampe de signalisation — attendez la manche ${AUBE.GATE[12]}`, range: 1.8, deny: true });
  if (s === 13 && !(Q.fuse > 0)) cand(d(AUBE.DET), aubeGate(13) ? { kind: 'detonate', text: "Brancher l'exploseur (mise à feu)", range: 1.8 } : { kind: 'info', text: `Exploseur — attendez la manche ${AUBE.GATE[13]}`, range: 1.8, deny: true });
}
function aubeObjective(s) {
  const Q = QUEST, o = { title: 'OPÉRATION AUBE BLANCHE', line: AUBE_NAMES[s], sub: '' }, at = (a, y) => [a[0], y ?? floorAt(a[0], a[1]) + 1.2, a[1]];
  const gate = AUBE.GATE[s]; if (gate && G.round < gate) o.hint = `à partir de la manche ${gate}`;
  if (s === 6) { o.sub = MAP.zoneActive[5] ? 'La Sape — poste d\'écoute de la chambre de mine' : 'Ouvrez la Sape (tranchée de soutien)'; o.bar = Q.listen / AUBE.LISTEN; o.at = at(AUBE.GEO); }
  if (s === 7) { const n = Q.planted.filter(Boolean).length; o.line += ` (${n}/3)`; const left = AUBE.PLANT_NAMES.filter((_, i) => !Q.planted[i]); o.sub = Q.carry.includes(P.id) ? 'Posez-la ' + left.join(', ') : "Caisses d'ammonal de la chambre de mine"; o.at = Q.carry.includes(P.id) ? null : at(AUBE.PICK); }
  if (s === 8) { o.line += ` (${Q.souls}/${AUBE.SOULS})`; o.sub = MAP.zoneActive[6] ? 'Abattez des infectés près des tombes de la ferme' : 'Ouvrez la Ferme de Bellevue (sud du dépôt)'; o.bar = Q.souls / AUBE.SOULS; o.at = at(AUBE.GRAVE, 1.4); }
  if (s === 9) o.at = at(AUBE.TAG, 0.6);
  if (s === 10) { o.sub = Q.tagBy === P.id ? 'Le puits de la ferme' : 'Un camarade la porte'; o.at = at(AUBE.WELL, 1.2); }
  if (s === 11) { o.line += ` (${Q.found.filter(Boolean).length}/4)`; o.sub = 'Tracés à la craie : première ligne, poste de commandement, Cratère, chambre de mine'; o.hint = Q.code.map((c, i) => (Q.found[i] ? c : '·')).join(' '); }
  if (s === 12) { o.sub = 'Lampe de signalisation du poste d\'observation'; o.bar = Q.morse / AUBE.MORSE; o.at = at(AUBE.LAMP); }
  if (s === 13) { if (Q.fuse > 0) { o.line = `Mise à feu — ${Math.ceil(Q.fuse)} s`; o.bar = 1 - Q.fuse / AUBE.FUSE; } else { o.sub = "Exploseur de la chambre de mine"; o.at = at(AUBE.DET); } }
  if (s === 14) { const b = ZOMBIES.find((z) => z.id === Q.bossId && z.alive); o.sub = b ? 'Son casque arrête les balles : visez le corps' : 'La terre tremble au Cratère…'; if (b) o.bar = b.hp / b.maxHp; }
  return s >= 15 ? null : o;
}
