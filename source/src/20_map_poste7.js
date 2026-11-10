/* ═══════════════════ CARTE : SECTEUR NORD, POSTE AVANCÉ 7 ═══════════════════
   Tranchées enneigées de 1917. Grille de 58 × 48 carreaux de 2 m ; le nord (z petit) est le no man's land.
   Zones : A tranchée de première ligne · B poste de commandement · C dépôt du générateur · D tranchée de soutien · E le Cratère
   · F la Sape (galerie de mine qui descend à −1,6 m, chambre de mine) · G la Ferme de Bellevue (grande cour à ciel ouvert)
   · H le Poste d'observation (plate-forme surélevée de 1,8 m). Décor des trois dernières : 20c_poste7_ext.js. */

// Sols de la carte (voir floorH) : cuvette du Cratère, Sape, carrière, ferme au niveau de la plaine, plate-forme.
const P7_SHAFT = [42, 75, 1.05]; // puits de lumière au sommet de la voûte, au milieu de la croisée des piliers (x, z, rayon)
// Grand escalier de la carrière : 8 contremarches de 25 cm (du chœur à −0,8 m à la nef à −2,8 m), 7 marches de 40 cm. On
// marche sur une pente droite qui passe au milieu des marches (±12 cm) ; le sol affiché (floorVis) passe sous les marches.
const P7_STAIRS = { x0: 37.2, x1: 40, n: 7, rise: 0.25 };
function p7Floor(x, z) {
  let h = 0; const d = Math.hypot(x - 46, z - 32);
  if (d < 7.4) { const k = 1 - d / 7.4; h = -1.05 * k * k * (3 - 2 * k) + (fbm(x * 0.7, z * 0.7, 2) - 0.5) * 0.12 * k; }
  if (x > 60.5 && x < 65.5 && z > 56 && z < 75) h = Math.min(h, -1.6 * smooth(clamp((z - 62) / 8, 0, 1)));
  if (z > 70.5 && z < 75.5 && x >= 47.5 && x < 65.5) h = Math.min(h, -1.6); // galerie ouest, jusqu'à la carrière
  if (z > 66 && z < 84 && x >= 33.95 && x < 47.5) { // carrière : chœur, escalier (pente droite, voir P7_STAIRS), nef, remontée
    const S = P7_STAIRS, run = (S.x1 - S.x0) / S.n, st = clamp((x - S.x0 + run / 2) / (run * (S.n + 1)), 0, 1), re = smooth(clamp((x - 44.5) / 3, 0, 1));
    h = -0.8 - S.rise * (S.n + 1) * st + 1.2 * re;
  }
  if (z > 75.5 && z < 78.5 && x > 27 && x < 33.95) h = 2.5 - 3.3 * smooth(clamp((x - 28) / 6, 0, 1)); // escalier de la cave
  if (x > 13.5 && x < 16.5 && z > 56 && z <= 64) h = WALL_H * smooth(clamp((z - 57.5) / 6.5, 0, 1)); // boyau de la ferme qui monte
  if (x > 5.95 && x < 32.05 && z > 63.95 && z < 88.05 && !(x > 28 && z > 74 && z < 80)) { // cour de la ferme, au niveau de la plaine
    h = WALL_H; const e = Math.hypot(x - 19.5, z - 70) / 3.2; if (e < 1) h -= 0.7 * (1 - e * e) * (1 - e * e); // trou d'obus (mare gelée)
  }
  if (x > 72 && x < 94 && z > 24 && z < 45) h = Math.max(h, 1.8 * smooth(clamp((x - 76.5) / 5, 0, 1)));
  return h;
}
// Voûte de la carrière : la plus haute (2,3 m, juste sous la plaine) au-dessus de la nef, plus basse vers les parois ; 2,9 m
// au-dessus du chœur, jamais moins de 2,1 m ; trou du puits de lumière (rien au-dessus : les balles et les grenades y passent).
function p7Vault(x, z) { const f = p7Floor(x, z), e2 = ((x - 42) / 7.6) ** 2 + ((z - 75) / 7.6) ** 2; return clamp(Math.max(2.3 - 1.75 * e2, f + 2.9 - Math.max(0, x - 37) * 2), f + 2.1, 2.3); }
function p7Roof(x, z) {
  if (!(z > 66 && z < 84 && x >= 31.9 && x < 48.05)) return undefined;
  if (x < 34) return Math.min(WALL_H - 0.08, p7Floor(x, z) + 2.45); // tunnel de la porte de la cave
  if (Math.hypot(x - P7_SHAFT[0], z - P7_SHAFT[1]) < P7_SHAFT[2]) return 50;
  return p7Vault(x, z);
}

// Interactions de la quête « Aube Blanche » (11b_quest.js et 11f_aube.js).
const P7_QUEST_KINDS = ['radio', 'tube', 'calib', 'trap', 'geo', 'charge', 'plant', 'tag', 'well', 'digit', 'morse', 'detonate'];

MAPS.poste7 = {
  id: 'poste7', name: 'POSTE 7', sub: 'Secteur nord, hiver 1917',
  objName: 'Opération Aube Blanche accomplie',
  powerParts: [{ name: "BIDON D'ESSENCE", kind: 'fuel', zones: [0] }, { name: 'MAGNÉTO', kind: 'coil', zones: [1, 3] }, { name: 'COURROIE', kind: 'belt', zones: [4] }],
  intro: ['POSTE 7', 'Secteur nord, front gelé', '14 janvier 1917 — 03 h 12'],
  desc: 'Tranchées gelées, bunker de commandement, cratère du biplan abattu, sape sous le no man\'s land, ferme en ruine. La radio attend un opérateur.',
  card: ['#24313d', '#8fa6bb'],
  info: { eyebrow: 'FRONT NORD · NUIT <span id="nightNo">01</span>', tagline: 'Les tranchées sont gelées. Les morts, non.', stat: ['TEMPÉRATURE', '−24 °C'] },
  loading: 'CREUSEMENT DES TRANCHÉES…',
  // Vignette du menu : nuit bleue, lune, ligne de tranchée et barbelés dans la neige.
  art(x, w, h) {
    const g = x.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#060d18'); g.addColorStop(0.62, '#1d2d3d'); g.addColorStop(1, '#0a1016'); x.fillStyle = g; x.fillRect(0, 0, w, h);
    x.fillStyle = '#e8f1ff'; x.beginPath(); x.arc(w * 0.78, h * 0.2, 14, 0, TAU); x.fill();
    const r = mulberry32(3); for (let i = 0; i < 60; i++) { x.fillStyle = `rgba(220,235,255,${r() * 0.7})`; x.fillRect(r() * w, r() * h * 0.5, 1.5, 1.5); }
    x.fillStyle = '#c9d6e2'; x.beginPath(); x.moveTo(0, h * 0.62); for (let i = 0; i <= 20; i++) x.lineTo((i / 20) * w, h * 0.62 + Math.sin(i * 1.7) * 5); x.lineTo(w, h); x.lineTo(0, h); x.fill();
    x.fillStyle = '#1b1612'; x.fillRect(0, h * 0.7, w, 16); x.fillStyle = '#8d7a60'; for (let i = 0; i < w; i += 22) x.fillRect(i, h * 0.68, 12, 6);
    x.strokeStyle = '#141a20'; x.lineWidth = 2; for (let i = 10; i < w; i += 46) { x.beginPath(); x.moveTo(i, h * 0.6); x.lineTo(i + 3, h * 0.5); x.stroke(); }
    x.beginPath(); for (let i = 10; i < w; i += 6) x.lineTo(i, h * 0.53 + Math.sin(i * 0.4) * 3); x.stroke();
  },
  w: 58, d: 48, flat: false,
  zones: ['Tranchée de première ligne', 'Poste de commandement', 'Dépôt du générateur', 'Tranchée de soutien', 'Le Cratère', 'La Sape', 'La Ferme de Bellevue', "Le Poste d'observation"],
  grid({ floor, door, ramp }) {
    // Zone A — tranchée de première ligne, avec deux alvéoles de tir au nord.
    floor(6, 6, 33, 7, 0);
    floor(11, 4, 15, 5, 0);
    floor(24, 4, 28, 5, 0);
    // Zone B — boyau puis bunker de commandement couvert.
    floor(9, 9, 9, 12, 1);
    floor(5, 13, 13, 18, 1, STYLE_BUNKER, 1);
    // Zone C — boyau puis cour du dépôt ; hangar du générateur couvert au sud-ouest.
    floor(9, 20, 9, 21, 2);
    floor(5, 22, 15, 27, 2, STYLE_YARD);
    floor(5, 25, 8, 27, 2, STYLE_YARD, 1);
    // Zone D — boyau est, tranchée de soutien nord-sud, abri (sape) couvert, liaison vers le dépôt.
    floor(31, 9, 31, 12, 3);
    floor(30, 13, 31, 27, 3);
    floor(32, 17, 35, 20, 3, STYLE_DUGOUT, 1);
    floor(17, 24, 29, 24, 3);
    // Zone E — le Cratère : grand entonnoir d'obus à ciel ouvert au centre du secteur.
    floor(19, 12, 26, 19, 4, STYLE_CRATER);
    floor(23, 9, 23, 11, 4);
    floor(26, 20, 26, 22, 4);
    // Zone F — la Sape : boyau au bout de la tranchée de soutien, galerie boisée qui descend (−1,6 m, voir floorH), puis
    // file vers l'ouest jusqu'à la chambre de mine.
    floor(31, 29, 31, 30, 5);
    floor(31, 31, 31, 35, 5, STYLE_SAPE, 1);
    floor(24, 36, 31, 36, 5, STYLE_SAPE, 1);
    // La chambre de mine est une carrière de craie : chœur à −0,8 m (chapelle), grand escalier, nef à −2,8 m sous une voûte
    // de 5 m percée d'un puits ; la porte de la galerie de la ferme (couverte) mène à l'escalier de la cave (20c_poste7_ext.js).
    floor(17, 34, 23, 40, 5, STYLE_CRAIE, 1);
    floor(16, 38, 16, 38, 5, STYLE_CRAIE, 1);
    // Zone G — la Ferme de Bellevue : boyau qui remonte de la cour du dépôt jusqu'au sol, grande cour de ferme au niveau de la
    // plaine, entourée de ses bâtiments ; à l'est, l'escalier de la cave (deux carreaux, entre deux ailes du logis) descend
    // vers la Sape.
    floor(7, 29, 7, 31, 6);
    floor(3, 32, 13, 43, 6, STYLE_FERME);
    floor(14, 32, 15, 36, 6, STYLE_FERME);
    floor(14, 40, 15, 43, 6, STYLE_FERME);
    floor(14, 38, 15, 38, 6, STYLE_FERME);
    // Zone H — le Poste d'observation : boyau derrière l'abri, rampe de terre qui monte, plate-forme surélevée.
    floor(37, 17, 40, 19, 7, STYLE_YARD);
    floor(41, 13, 45, 21, 7, STYLE_YARD);
    door(9, 8, 750, 'gate', 'Poste de commandement');
    door(9, 19, 1000, 'steel', 'Dépôt du générateur');
    door(31, 8, 1000, 'gate', 'Tranchée de soutien');
    door(16, 24, 1250, 'gate', 'Liaison dépôt ↔ soutien');
    door(23, 8, 1500, 'gate', 'Le Cratère');
    door(26, 23, 1250, 'gate', 'Le Cratère');
    door(31, 28, 1250, 'gate', 'La Sape');
    door(7, 28, 1000, 'gate', 'La Ferme de Bellevue');
    door(16, 38, 750, 'gate', 'Galerie de la ferme');
    door(36, 18, 1250, 'gate', "Le Poste d'observation");
    [[13, 3], [26, 3], [5, 6], [34, 7], [4, 15], [14, 17], [4, 23], [12, 28], [32, 14], [29, 16], [29, 22], [34, 21], [18, 14], [25, 11], [27, 17], [20, 20],
      [32, 30], // Sape (boyau d'entrée, avant la galerie couverte)
      [2, 35], [2, 41], [6, 44], [12, 44], [13, 31], [16, 42], // Ferme : on y entre de partout
      [46, 15], [46, 20], [43, 12], [43, 22], // Poste d'observation (rampes du sol de la plate-forme à la surface)
    ].forEach(([x, z]) => ramp(x, z));
  },
  spots: {
    start: [20, 7], startYaw: 0,
    coopStarts: [[20, 7], [22, 7], [18, 7], [24, 7]],
    wallBuys: [
      { weapon: 'bolt', x: 17, z: 7, wall: 's' },
      { weapon: 'shotgun', x: 13, z: 14, wall: 'e' },
      { weapon: 'smg', x: 13, z: 22, wall: 'n' },
      { weapon: 'carbine', x: 30, z: 21, wall: 'w' },
      { weapon: 'revolver', x: 5, z: 32, wall: 'n' }, // Ferme de Bellevue
    ],
    perks: [
      { perk: 'sprint', x: 32, z: 6, wall: 'n' },
      { perk: 'armor', x: 6, z: 18, wall: 's' },
      { perk: 'revive', x: 12, z: 13, wall: 'n' },
      { perk: 'reload', x: 15, z: 25, wall: 'e' },
      { perk: 'rof', x: 31, z: 26, wall: 'e' },
      { perk: 'mule', x: 19, z: 15, wall: 'w' },
      { perk: 'deadshot', x: 28, z: 5, wall: 'e' }, // fond de l'alvéole 2, dégagé de la banquette et de la mitrailleuse
    ],
    power: { x: 5, z: 26, wall: 'w' },
    generator: { x: 14.6, z: 53.4, ry: 0 },
    box: [{ x: 12, z: 4, wall: 'n' }, { x: 33, z: 17, wall: 'n' }, { x: 10, z: 27, wall: 's' }, { x: 19, z: 18, wall: 'w' }, { x: 3, z: 38, wall: 'w' }, { x: 45, z: 17, wall: 'e' }],
    mortar: { x: 26, z: 13, wall: 'e' },
    bench: { x: 35, z: 19, wall: 'e' },
  },
  setup() {
    // Relief du no man's land : entonnoirs d'obus.
    CRATERS.length = 0;
    const r = mulberry32(77);
    for (let k = 0; k < 46; k++) {
      const x = -60 + r() * 200, z = -70 + r() * 150;
      if (x > 4 && x < 76 && z > 4 && z < 60 && edgeAt(x, z) < 3.5) continue;
      CRATERS.push({ x, z, r: 2 + r() * 4.5, d: 0.5 + r() * 1.3 });
    }
  },
  env: {
    fog: 0x19232e, fogDensity: 0.03, stormFog: 0.06, exposure: 1.15,
    sky: { zen: [0.006, 0.011, 0.024], disk: [4.75, 4.85, 5], diskSize: 0.99955, halo: [0.35, 0.45, 0.65], cloudA: [0.05, 0.065, 0.085], cloudB: [0.2, 0.24, 0.3], stars: 1.6, ridge: 1, glow: [0, 0, 0], cover: 1, flash: [1, 0.62, 0.35] },
    sunDir: [-0.45, 0.62, -0.64], sunColor: 0xb4ccff, sunI: 1.35, hemi: [0x7d99bb, 0x2b2622], bounce: 0x4a4038, hemiOut: 0.7, hemiIn: 0.25, envOut: 0.55, envIn: 0.22,
    envMap: { low: [0.05, 0.05, 0.055], mid: [0.3, 0.36, 0.46], high: [0.07, 0.09, 0.14], glowDir: [0.3, 0.05, -0.95], glow: [1, 0.55, 0.25] },
    precip: 'snow', snow: 1, tint: [0.88, 1, 1.16], frost: true, flares: true, flashes: { min: 6, max: 18, a0: -2.6, a1: -0.5 },
    storm: { title: 'TEMPÊTE BLANCHE', sub: 'Visibilité nulle. Ils courent.' },
    far: { color: 0xc9d4de, y: WALL_H - 1.4, cx: 58, cz: 48, r0: 110 },
  },
  lights(pl) {
    pl('brazier', 0xff8a3a, 18, 16, 44.2, 1.1, 15.2);
    pl('bunker', 0xff2a18, 5, 16, 18.5, 2.15, 30.5);
    pl('yard', 0xdfeaff, 0, 30, 21, 4.4, 45.5);
    pl('wreck', 0xff7a2a, 60, 38, 46, WALL_H + 1.6, -16);
    if (settings.quality >= 1) {
      pl('shed', 0xff2a18, 3, 12, 13.5, 2.1, 52.5);
      pl('dugout', 0xffb060, 9, 12, 68, 2.0, 38);
      pl('lantern', 0xffb060, 7, 11, 25, 1.9, 13.4);
      pl('bunker2', 0xff2a18, 0, 12, 12, 2.15, 34);
      pl('mine', 0xffa850, 9, 15, 36.2, 0.6, 71.6); // cierges de la chapelle (carrière de la Sape)
      pl('farm', 0xff8a3a, 16, 20, 18, WALL_H + 1.2, 77); // feu de la Ferme de Bellevue
    }
  },
  roofPosts: [[14, 30], [24, 30], [14, 34], [24, 34], [67, 37], [11, 51.5], [17, 51.5]], // (carrière : piliers de craie, 20c_poste7_ext.js)
  decor() { buildProps(); buildCraterProps(); buildOutside(); buildQuestProps(); buildRobot(); buildPoste7Extras(); buildPoste7Expansion(); },
  // (plus de mottes à facettes, blanches ni brunes : la neige est dans le sol et le fond du Cratère est bosselé, voir buildTrenches)
  scatter: [{ kind: 'chip', styles: [0, 4], n: 0.6, color: 0x4a3a2a }, { kind: 'rock', ground: [1.2, 12], n: 0.2, color: 0x6a6a66, shadow: true, snow: 1 }],
  // Fond du Cratère en cuvette (≈ 1 m au centre), à niveau le long des parois et des passages.
  // Sape : la galerie descend de 1,6 m entre z 62 et 70 et file à l'ouest à cette profondeur ; la carrière (x 34 à 48) : chœur
  // à −0,8 m à l'ouest, grand escalier jusqu'à la nef à −2,8 m, remontée à −1,6 m vers la galerie à l'est. Ferme : la cour est
  // au niveau de la plaine (+2,5 m) ; son boyau monte depuis le dépôt (z 57,5 à 64) ; l'escalier de la cave descend de la
  // cour au chœur (x 28 à 34). Poste d'observation : la rampe de terre monte de 1,8 m entre x 76,5 et 81,5.
  floorH(x, z) { return p7Floor(x, z); },
  // Coin de la galerie de la Sape : plaque tournante du wagonnet à la place des rails droits (20e_poste7_jeux.js).
  trackSkip(x, z) { return x === 31 && z === 36; },
  // Sol affiché : sous les marches du grand escalier (dessinées à part), sinon le sol du jeu.
  // (la pente du jeu déborde d'une demi-marche de chaque côté : là, le sol affiché reste au niveau du chœur ou de la nef)
  floorVis(x, z) { const S = P7_STAIRS, hw = (S.x1 - S.x0) / S.n / 2; if (!(z > 66 && z < 84 && x > S.x0 - hw && x < S.x1 + hw)) return p7Floor(x, z); return x <= S.x0 ? -0.8 : x >= S.x1 ? -0.8 - S.rise * (S.n + 1) : -2.95; },
  // Voûte de la carrière (le reste : plafond par défaut, 2,45 m au-dessus du sol).
  roofH(x, z) { return p7Roof(x, z); },
  anim(dt, time) { robotAnim(dt, time); p7ExtAnim(dt, time); },
  onPower(on) {
    const L = R.lights;
    L.bunker.color.set(on ? 0xffc890 : 0xff2a18); L.bunker.intensity = L.bunker.userData.base = on ? 16 : 5;
    if (L.shed) { L.shed.color.set(on ? 0xffd2a0 : 0xff2a18); L.shed.intensity = L.shed.userData.base = on ? 10 : 3; }
    L.yard.intensity = on ? 60 : 0;
    WORLD.floodLens.material = on ? new THREE.MeshBasicMaterial({ color: 0xf2f6ff }) : MATS.glassOff;
  },
  // Caméra du menu : travelling le long de la première ligne, regard vers le no man's land.
  menu(t) {
    const x = 24 + 26 * (0.5 + 0.5 * Math.sin(t * 0.035 - 1.2)), y = 3.35 + Math.sin(t * 0.11) * 0.25, z = 18.2 + Math.sin(t * 0.05) * 0.6;
    return [x, y, z, x + 9 + Math.sin(t * 0.07) * 6, 2.2 + Math.sin(t * 0.09) * 0.8, z - 22];
  },
  menuZombies: { n: 4, x: [20, 64], z: [-2, 4.5], bounds: [14, 70] },
  hooks: {
    reset() { questReset(); supportReset(); sapeJeuxReset(); },
    host(dt) { questHost(dt); supportHost(dt); sapeJeuxHost(dt); },
    visuals(dt) { questVisuals(dt); supportVisuals(dt); sapeJeuxVisuals(dt); },
    apply(type, d) { return supportApply(type, d) || sapeJeuxApply(type, d) || questApply(type, d); },
    interact(pid, kind, id) { if (P7_QUEST_KINDS.includes(kind)) { questInteract(pid, kind, id); return true; } if (kind === 'mortar') { supportInteract(pid); return true; } if (kind === 'camouflet' || kind === 'wagon') { sapeJeuxInteract(pid, kind); return true; } return false; },
    kill(z) { aubeKill(z); },
    bossThink(z, dt) { aubeBossThink(z, dt); },
    bossDown(z) { aubeBossDown(z); },
    candidates(cand, px, pz) { questCandidates(cand, px, pz); supportCandidates(cand, px, pz); sapeJeuxCandidates(cand, px, pz); },
    spawnFactor() { return questSpawnFactor(); },
    ping(pid, x, z) { supportPing(pid, x, z); },
  },
};
