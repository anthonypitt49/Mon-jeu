/* ═══════════════════ CARTE : SECTEUR NORD, POSTE AVANCÉ 7 ═══════════════════
   Tranchées enneigées de 1917. Grille de 40 × 32 carreaux de 2 m ; le nord (z petit) est le no man's land.
   Zones : A tranchée de première ligne · B poste de commandement · C dépôt du générateur · D tranchée de soutien · E le Cratère. */

MAPS.poste7 = {
  id: 'poste7', name: 'POSTE 7', sub: 'Secteur nord, hiver 1917',
  objName: 'Opération Aube Blanche accomplie',
  powerParts: [{ name: "BIDON D'ESSENCE", kind: 'fuel', zones: [0] }, { name: 'MAGNÉTO', kind: 'coil', zones: [1, 3] }, { name: 'COURROIE', kind: 'belt', zones: [4] }],
  intro: ['POSTE 7', 'Secteur nord, front gelé', '14 janvier 1917 — 03 h 12'],
  desc: 'Tranchées gelées, bunker de commandement, cratère du biplan abattu. La radio attend un opérateur.',
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
  w: 40, d: 32, flat: false,
  zones: ['Tranchée de première ligne', 'Poste de commandement', 'Dépôt du générateur', 'Tranchée de soutien', 'Le Cratère'],
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
    door(9, 8, 750, 'gate', 'Poste de commandement');
    door(9, 19, 1000, 'steel', 'Dépôt du générateur');
    door(31, 8, 1000, 'gate', 'Tranchée de soutien');
    door(16, 24, 1250, 'gate', 'Liaison dépôt ↔ soutien');
    door(23, 8, 1500, 'gate', 'Le Cratère');
    door(26, 23, 1250, 'gate', 'Le Cratère');
    [[13, 3], [26, 3], [5, 6], [34, 7], [4, 15], [14, 17], [4, 23], [12, 28], [32, 14], [29, 16], [31, 28], [34, 21], [18, 14], [25, 11], [27, 17], [20, 20]].forEach(([x, z]) => ramp(x, z));
  },
  spots: {
    start: [20, 7], startYaw: 0,
    coopStarts: [[20, 7], [22, 7], [18, 7], [24, 7]],
    wallBuys: [
      { weapon: 'bolt', x: 17, z: 7, wall: 's' },
      { weapon: 'shotgun', x: 13, z: 14, wall: 'e' },
      { weapon: 'smg', x: 13, z: 22, wall: 'n' },
      { weapon: 'carbine', x: 30, z: 21, wall: 'w' },
    ],
    perks: [
      { perk: 'sprint', x: 32, z: 6, wall: 'n' },
      { perk: 'armor', x: 6, z: 18, wall: 's' },
      { perk: 'revive', x: 12, z: 13, wall: 'n' },
      { perk: 'reload', x: 15, z: 25, wall: 'e' },
      { perk: 'rof', x: 31, z: 26, wall: 'e' },
      { perk: 'mule', x: 19, z: 15, wall: 'w' },
      { perk: 'deadshot', x: 28, z: 4, wall: 'n' },
    ],
    power: { x: 5, z: 26, wall: 'w' },
    generator: { x: 14.6, z: 53.4, ry: 0 },
    box: [{ x: 12, z: 4, wall: 'n' }, { x: 33, z: 17, wall: 'n' }, { x: 10, z: 27, wall: 's' }, { x: 19, z: 18, wall: 'w' }],
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
    far: { color: 0xc9d4de, y: WALL_H - 1.4, cx: 40, cz: 30 },
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
    }
  },
  roofPosts: [[14, 30], [24, 30], [14, 34], [24, 34], [67, 37], [11, 51.5], [17, 51.5]],
  decor() { buildProps(); buildCraterProps(); buildOutside(); buildQuestProps(); buildRobot(); buildPoste7Extras(); },
  scatter: [{ kind: 'clod', styles: [0, 3, 4], n: 1.2, color: 0xe8eef4 }, { kind: 'chip', styles: [0, 4], n: 0.6, color: 0x4a3a2a }, { kind: 'clod', styles: [4], n: 7, color: 0x5a4a3a, scale: [0.8, 2.2] }, { kind: 'rock', ground: [1.2, 12], n: 0.2, color: 0x6a6a66, shadow: true, snow: 1 }],
  // Fond du Cratère en cuvette (≈ 1 m au centre), à niveau le long des parois et des passages.
  floorH(x, z) { const d = Math.hypot(x - 46, z - 32); if (d >= 7.4) return 0; const k = 1 - d / 7.4; return -1.05 * k * k * (3 - 2 * k) + (fbm(x * 0.7, z * 0.7, 2) - 0.5) * 0.12 * k; },
  anim(dt, time) { robotAnim(dt, time); },
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
    reset() { questReset(); supportReset(); },
    host(dt) { questHost(dt); supportHost(dt); },
    visuals(dt) { questVisuals(dt); supportVisuals(dt); },
    apply(type, d) { return supportApply(type, d) || questApply(type, d); },
    interact(pid, kind, id) { if (kind === 'radio' || kind === 'tube' || kind === 'calib' || kind === 'trap') { questInteract(pid, kind, id); return true; } if (kind === 'mortar') { supportInteract(pid); return true; } return false; },
    candidates(cand, px, pz) { questCandidates(cand, px, pz); supportCandidates(cand, px, pz); },
    spawnFactor() { return questSpawnFactor(); },
    ping(pid, x, z) { supportPing(pid, x, z); },
  },
};
