/* ═══════════════════ CARTE : LE PÉNITENCIER ═══════════════════
   Une prison fédérale sur un rocher au milieu d'une baie, une nuit d'orage. Le bloc cellulaire, les douches,
   le réfectoire, la cour de promenade, l'infirmerie, la direction et les quais d'où les morts sortent de l'eau.
   Particularités : le Geôlier (boss) cadenasse atouts et caisse ; un bouclier de fortune se construit
   avec trois pièces cachées dans la prison. */

const PEN = (() => {
  const OX = 5, OZ = 5, X = (lx) => (lx + OX) * TILE;
  return { OX, OZ, X, T: (lx, lz) => [lx + OX, lz + OZ] };
})();
const PEN_STATE = { boss: null, bossRounds: new Set(), bossT: 0, parts: [0, 0, 0], partLoc: [0, 0, 0], built: false, shieldRound: {} };
// Deux cachettes possibles par pièce du bouclier (mètres) ; l'hôte tire au sort en début de partie.
const PEN_PARTS = [
  { name: 'PLAQUE DE PORTE', spots: [[PEN.X(3) + 1, PEN.X(13) + 1.2], [PEN.X(19) + 1.6, PEN.X(20) + 1.2]] },
  { name: 'POIGNÉE', spots: [[PEN.X(46) + 1.2, PEN.X(15) + 1.4], [PEN.X(27) + 1, PEN.X(20) + 1.3]] },
  { name: 'SANGLES', spots: [[PEN.X(41) + 1, PEN.X(1) + 1], [PEN.X(21) + 1, PEN.X(27) + 1]] },
];

MAPS.penitencier = {
  id: 'penitencier', name: 'LE PÉNITENCIER', sub: 'Île-prison, nuit d\'orage',
  objName: 'Évasion tentée, vedette défendue',
  powerParts: [{ name: 'FUSIBLE', kind: 'fuse', zones: [1, 2] }, { name: 'MANIVELLE', kind: 'crank', zones: [3, 4] }, { name: 'BIDON DE GAZOLE', kind: 'fuel', zones: [6] }],
  intro: ['LE PÉNITENCIER', 'Île-prison, baie des Tempêtes', '31 décembre 1933 — 23 h 07'],
  desc: "Un rocher battu par la tempête, une prison que personne n'a quittée. Les morts sortent de la baie. Le Geôlier fait sa ronde.",
  card: ['#0e1a24', '#4f6a80'],
  info: { eyebrow: 'LA BAIE · NUIT D\'ORAGE', tagline: 'Personne ne quitte le rocher. Pas même les morts.', stat: ['DISTANCE DU RIVAGE', '2,4 km'] },
  loading: 'VERROUILLAGE DES CELLULES…',
  art(x, w, h) {
    const g = x.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#05080d'); g.addColorStop(0.55, '#1a2833'); g.addColorStop(0.62, '#0b1218'); g.addColorStop(1, '#05080b'); x.fillStyle = g; x.fillRect(0, 0, w, h);
    x.strokeStyle = '#e8f2ff'; x.lineWidth = 2.5; x.beginPath(); x.moveTo(w * 0.72, 0); x.lineTo(w * 0.68, h * 0.18); x.lineTo(w * 0.74, h * 0.24); x.lineTo(w * 0.7, h * 0.42); x.stroke();
    x.strokeStyle = '#b8403a'; x.lineWidth = 3; x.beginPath(); x.moveTo(0, h * 0.5); x.quadraticCurveTo(w * 0.12, h * 0.62, w * 0.24, h * 0.44); x.stroke(); x.fillStyle = '#b8403a'; x.fillRect(w * 0.23, h * 0.3, 5, h * 0.3);
    x.fillStyle = '#1c2228'; x.beginPath(); x.moveTo(w * 0.2, h * 0.64); x.lineTo(w * 0.3, h * 0.5); x.lineTo(w * 0.8, h * 0.5); x.lineTo(w * 0.92, h * 0.64); x.fill();
    x.fillStyle = '#2c343c'; x.fillRect(w * 0.35, h * 0.38, w * 0.4, h * 0.13); x.fillStyle = '#ffd08a'; for (let i = 0; i < 9; i++) x.fillRect(w * 0.37 + i * 20, h * 0.43, 5, 7);
    x.fillStyle = '#cfd8e0'; x.fillRect(w * 0.86, h * 0.34, 7, h * 0.18); x.fillStyle = 'rgba(255,240,190,.25)'; x.beginPath(); x.moveTo(w * 0.87, h * 0.35); x.lineTo(w, h * 0.28); x.lineTo(w, h * 0.42); x.fill();
    x.strokeStyle = 'rgba(160,190,220,.35)'; x.lineWidth = 1; for (let i = 0; i < 70; i++) { const a = (i * 97) % w, b = (i * 53) % h; x.beginPath(); x.moveTo(a, b); x.lineTo(a - 3, b + 12); x.stroke(); }
  },
  w: 58, d: 40, flat: true, ceil: 4.0, wallH: 5.0,
  zones: ['Bloc cellulaire', 'Douches', 'Réfectoire', 'Cour de promenade', 'Infirmerie', 'Direction', 'Quais'],
  styles: ['corridor', 'cell', 'shower', 'mess', 'yard', 'infirm', 'office', 'dock', 'wall'],
  styleDefs: [
    { floor: ['slab', 0x8e8e88], ceil: ['concrete', 0x8a8a84] }, { floor: ['slab', 0x7e7e78], ceil: ['concrete', 0x8a8a84] }, { floor: ['tileWall', 0xc8d4d0], ceil: ['concrete', 0x9a9a94] },
    { floor: ['slab', 0x9a968e], ceil: ['concrete', 0x8e8a84] }, { floor: ['slab', 0x86847e] }, { floor: ['tileWall', 0xcfe0d6], ceil: ['plaster', 0xdfe6e0] },
    { floor: 'parquet', ceil: ['plaster', 0xe6dccb] }, { floor: ['planks', 0x8a7a66] },
    { block: ['stone', 0xb0aca4], blockIn: ['cellPaint', 0xffffff], blockTop: ['concrete', 0x8a8a84] },
  ],
  roofTex: ['concrete', 0x7a7a74], ceilTex: ['concrete', 0x8a8a84], wallMat: 'concrete', baseboard: null,
  decals: { grime: 0.85, splash: 0.4, under: 0.6, crack: 0.3, stain: 0.25, mold: 0.25, scuff: 0.2, blood: 0.12, graffiti: 0.06, graffitiCell: 'scratch',
    floor: { corridor: [['leak', 0.12, 1.4], ['crack', 0.18, 1.6], ['dirt', 0.15, 1.2]], cell: [['dirt', 0.3, 1], ['blood', 0.08, 1]], shower: [['leak', 0.4, 1.2], ['mold', 0.2, 1]], mess: [['dirt', 0.25, 1.2], ['stain', 0.1, 1]], yard: [['crack', 0.3, 1.8], ['leak', 0.25, 1.8]], infirm: [['blood', 0.15, 1.2], ['drag', 0.08, 1.6]], office: [['scuff', 0.1, 1]], dock: [['leak', 0.3, 1.6], ['oil', 0.15, 1.4]] } },
  scatter: [{ kind: 'pebble', styles: ['yard'], n: 2, color: 0x6a6a66 }, { kind: 'paper', styles: ['corridor', 'office', 'mess', 'cell'], n: 0.3, color: 0xd8d4c8 }, { kind: 'chip', styles: ['corridor', 'yard', 'cell'], n: 0.8, color: 0x8a8a84 }, { kind: 'rock', ground: [0.5, 8], n: 0.15, color: 0x5a5e58, shadow: true }, { kind: 'tuft', styles: ['yard'], n: 1.2, color: 0x4a5a3a }],
  details: { fascia: ['concrete', 0x7a7a74], plinth: ['concrete', 0x5e605c], crown: ['concrete', 0x6a6e68] },
  blockH: () => 5.0, blockMat: () => 'concrete',
  walls: [
    { key: 'stone', h: 5.0, out: ['stone', 0xc8c4bc], in: ['cellPaint', 0xffffff], wire: true, mat: 'concrete' },
    { key: 'stoneWin', look: 'window', h: 5.0, out: ['stone', 0xc8c4bc], in: ['cellPaint', 0xffffff], trim: ['concrete', 0x6a6a64], lit: 0xffc27a, bars: true, mat: 'concrete' },
    { key: 'cellWall', h: 3.0, out: ['cellPaint', 0xffffff], in: ['cellPaint', 0xffffff], mat: 'concrete' },
    { key: 'bars', look: 'bars', h: 3.0, see: true, mat: 'metal' },
    { key: 'shower', h: 5.0, out: ['stone', 0xb0aca4], in: ['tileWall', 0xdfe8e4], mat: 'concrete' },
    { key: 'yardWall', h: 5.5, out: ['stone', 0xa6a29a], in: ['stone', 0xa6a29a], wire: true, mat: 'concrete' },
    { key: 'office', h: 5.0, out: ['stone', 0xb0aca4], in: ['westPlank', 0xb89068], mat: 'wood' },
    { key: 'officeIn', h: 4.0, out: ['westPlank', 0xb89068], in: ['westPlank', 0xb89068], mat: 'wood' },
    { key: 'infirmIn', h: 4.0, out: ['plaster', 0xe0e8e2], in: ['plaster', 0xe0e8e2], mat: 'concrete' },
    { key: 'rail', look: 'rail', h: 1.1, see: true, mat: 'wood' },
    { key: 'chain', look: 'chain', h: 3.2, see: true, mat: 'metal' },
  ],
  boundary(x, z) {
    const st = this.styles[MAP.style[ti(x, z)]];
    if (st === 'yard') return 'yardWall'; if (st === 'dock') return 'rail'; if (st === 'shower') return 'shower'; if (st === 'office') return 'office';
    return (x * 7 + z * 3) % 4 === 0 ? 'stoneWin' : 'stone';
  },
  grid(A) {
    const { OX: ox, OZ: oz } = PEN;
    const F = (a, b, c, d, zone, st, roof) => A.floor(a + ox, b + oz, c + ox, d + oz, zone, st, roof);
    const B = (a, b, c, d) => A.block(a + ox, b + oz, c + ox, d + oz, 'wall');
    const H = (z, a, b, k) => A.hwall(z + oz, a + ox, b + ox, k), V = (x, a, b, k) => A.vwall(x + ox, a + oz, b + oz, k);
    const D = (x, z, c, k, l) => A.door(x + ox, z + oz, c, k, l), Rp = (x, z, look, inw) => A.ramp(x + ox, z + oz, look, inw);
    // ── Zone 0 : bloc cellulaire (couloir central, cellules nord et sud).
    F(10, 10, 33, 12, 0, 'corridor', 1);
    const northCells = [], southCells = [];
    for (let x = 11; x <= 32; x++) { if (![16, 22, 28].includes(x)) northCells.push(x); if (![14, 22, 29].includes(x)) southCells.push(x); }
    F(10, 9, 10, 9, 0, 'corridor', 1); F(33, 9, 33, 9, 0, 'corridor', 1); F(10, 13, 10, 13, 0, 'corridor', 1); F(33, 13, 33, 13, 0, 'corridor', 1);
    for (const x of [16, 22, 28]) F(x, 9, x, 9, 0, 'corridor', 1);
    for (const x of [14, 22, 29]) F(x, 13, x, 13, 0, 'corridor', 1);
    for (const x of northCells) F(x, 9, x, 9, 0, 'cell', 1);
    for (const x of southCells) F(x, 13, x, 13, 0, 'cell', 1);
    // ── Zone 1 : douches. Zone 2 : réfectoire. Zone 3 : cour + passage. Zone 4 : infirmerie. Zone 5 : direction. Zone 6 : quais + chemin de ronde.
    F(2, 9, 8, 13, 1, 'shower', 1);
    F(35, 8, 46, 16, 2, 'mess', 1);
    F(18, 0, 42, 4, 3, 'yard'); F(40, 5, 40, 6, 3, 'yard');
    F(10, 15, 19, 21, 4, 'infirm', 1);
    F(25, 15, 37, 21, 5, 'office', 1);
    F(18, 23, 44, 29, 6, 'dock'); F(45, 18, 45, 29, 6, 'dock');
    // Murs épais : ouest et est du bloc, rangée sud (vers l'infirmerie et la direction).
    B(9, 9, 9, 13); B(34, 9, 34, 13); B(10, 14, 33, 14);
    // Cellules : cloisons, grilles (les cellules « ouvertes » servent d'alcôves).
    const open = new Set(['n12', 'n19', 'n25', 'n31', 's17', 's26', 's32']);
    for (const [row, cells, fz] of [['n', northCells, 10], ['s', southCells, 13]]) {
      const cz = row === 'n' ? 9 : 13;
      for (const x of cells) { V(x, cz, cz, 'cellWall'); V(x + 1, cz, cz, 'cellWall'); if (!open.has(row + x)) H(fz, x, x, 'bars'); }
    }
    // Douches ↔ bloc, bloc ↔ réfectoire, bloc ↔ infirmerie / direction, direction ↔ quais, réfectoire ↔ cour / chemin de ronde.
    D(9, 11, 750, 'bars', 'Douches'); D(34, 11, 1000, 'bars', 'Réfectoire');
    D(14, 14, 1000, 'steel', 'Infirmerie'); D(29, 14, 1250, 'steel', 'Direction');
    V(40, 5, 7, 'yardWall'); V(41, 5, 7, 'yardWall'); D(40, 7, 1250, 'bars', 'Cour de promenade');
    V(31, 22, 22, 'stone'); V(32, 22, 22, 'stone'); D(31, 22, 1500, 'debris', 'Quais');
    D(45, 17, 1250, 'bars', 'Chemin de ronde');
    // Cloisons intérieures.
    V(30, 15, 17, 'officeIn'); V(30, 19, 21, 'officeIn'); H(19, 31, 33, 'officeIn'); H(19, 35, 37, 'officeIn');
    V(16, 15, 16, 'infirmIn'); H(19, 10, 11, 'infirmIn'); H(19, 13, 15, 'infirmIn');
    H(10, 36, 37, 'stone'); H(10, 39, 45, 'stone'); // passe-plats de la cuisine du réfectoire
    // Barricades : fenêtres (bloc, douches, réfectoire, infirmerie, direction), brèches de la cour, accès depuis l'eau.
    for (const [x, z] of [[16, 8], [22, 8], [28, 8], [1, 10], [1, 12], [5, 8], [47, 10], [47, 14], [37, 7], [38, 17], [9, 17], [9, 20], [15, 22], [24, 18], [38, 19]]) Rp(x, z, 'window');
    Rp(22, 14, 'window', 'n');
    for (const [x, z] of [[24, -1], [34, -1], [17, 2], [43, 2]]) Rp(x, z, 'gap');
    for (const [x, z] of [[22, 30], [30, 30], [38, 30], [17, 26], [46, 25]]) Rp(x, z, 'slope');
  },
  spots: (() => {
    const T = PEN.T, xz = ([x, z]) => ({ x, z });
    return {
      start: T(21, 11), startYaw: -Math.PI / 2,
      coopStarts: [T(20, 11), T(22, 11), T(20, 12), T(22, 12)],
      wallBuys: [
        { weapon: 'bolt', ...xz(T(19, 9)), wall: 'n' }, { weapon: 'shotgun', ...xz(T(2, 11)), wall: 'w' },
        { weapon: 'smg', ...xz(T(46, 12)), wall: 'e' }, { weapon: 'carbine', ...xz(T(30, 0)), wall: 'n' }, { weapon: 'revolver', ...xz(T(25, 16)), wall: 'w' },
      ],
      perks: [
        { perk: 'revive', ...xz(T(12, 9)), wall: 'n' }, { perk: 'armor', ...xz(T(41, 16)), wall: 's' }, { perk: 'sprint', ...xz(T(18, 3)), wall: 'w' },
        { perk: 'reload', ...xz(T(19, 18)), wall: 'e' }, { perk: 'rof', ...xz(T(44, 23)), wall: 'e' },
        { perk: 'mule', ...xz(T(17, 13)), wall: 's' }, { perk: 'cherry', ...xz(T(8, 9)), wall: 'e' },
      ],
      power: { ...xz(T(37, 20)), wall: 'e' },
      generator: { x: PEN.X(34) + 1, z: PEN.X(20) + 1.2, ry: 0 },
      box: [{ ...xz(T(25, 9)), wall: 'n' }, { ...xz(T(46, 9)), wall: 'e' }, { ...xz(T(33, 4)), wall: 's' }, { ...xz(T(10, 21)), wall: 's' }, { ...xz(T(26, 29)), wall: 's' }],
      bench: { ...xz(T(43, 29)), wall: 's' },
      shieldTable: { ...xz(T(5, 13)), wall: 's' },
    };
  })(),
  env: {
    fog: 0x1c2832, fogDensity: 0.017, stormFog: 0.028, exposure: 1.5,
    sky: { zen: [0.008, 0.011, 0.018], disk: [0.8, 0.85, 0.95], diskSize: 0.9994, halo: [0.12, 0.16, 0.22], cloudA: [0.04, 0.05, 0.065], cloudB: [0.14, 0.17, 0.21], stars: 0, ridge: 0.7, glow: [0.26, 0.15, 0.07], cover: 1.35, flash: [0.85, 0.92, 1.0] },
    sunDir: [0.35, 0.55, 0.76], sunColor: 0xa8bce0, sunI: 1.3, hemi: [0x7a8aa4, 0x2a2a28], bounce: 0x5e605a, hemiOut: 1.35, hemiIn: 0.95, envOut: 0.85, envIn: 0.6,
    envMap: { low: [0.05, 0.055, 0.06], mid: [0.22, 0.27, 0.34], high: [0.08, 0.1, 0.13], glowDir: [-0.9, 0.05, 0.3], glow: [0.5, 0.3, 0.12] },
    precip: 'rain', snow: 0, tint: [0.9, 1.0, 1.1], frost: false, flares: false, wind: 1.3, flashLight: 1.6,
    flashes: { min: 5, max: 14, a0: -Math.PI, a1: Math.PI, thunder: true, power: 1.6, decay: 3.5, storm: 1 },
    storm: { title: 'TEMPÊTE SUR LA BAIE', sub: 'Des trombes d\'eau. Ils courent.' },
    burst: [0.28, 0.3, 0.3], sounds: ['rain', 'waves'],
  },
  ground: { tex: ['rock', 0x8a8e86], c0: [0.9, 0.92, 0.9], c1: [0.6, 0.62, 0.6], pad: 110 },
  water: { y: -0.75, color: 0x0a161c, rough: 0.1, metal: 0.6, speed: 0.01 },
  // L'île : un plateau rocheux autour des bâtiments, qui plonge dans la baie ; les quais sont sur pilotis.
  surfH(x, z) {
    const x0 = 10, x1 = 110, z0 = 2, z1 = 55, dx = Math.max(x0 - x, 0, x - x1), dz = Math.max(z0 - z, 0, z - z1), d = Math.hypot(dx, dz) + (fbm(x * 0.08, z * 0.08, 2) - 0.5) * 3;
    if (d <= 0) return (fbm(x * 0.2, z * 0.2, 2) - 0.5) * 0.12;
    return -Math.min(4.5, d * 0.5) + (fbm(x * 0.15, z * 0.15, 2) - 0.5) * 0.6;
  },
  groundMat: 'concrete', floorMat: () => 'concrete', ceilMat: 'concrete',
  stepSurface(st) { const s = this.styles[st]; return s === 'office' || s === 'dock' ? 'wood' : 'concrete'; },
  lights(pl) {
    const X = PEN.X;
    pl('block1', 0xffd89a, 20, 20, X(15), 3.4, X(11)); pl('block2', 0xffd89a, 20, 20, X(27), 3.4, X(11));
    pl('mess', 0xffd8a0, 22, 22, X(40), 3.4, X(12)); pl('yard', 0xdfeaff, 380, 75, X(30), 11, X(-2));
    pl('infirm', 0xcff0e0, 14, 15, X(14), 3.3, X(18)); pl('warden', 0xffc080, 14, 15, X(27), 3.3, X(18));
    pl('docks', 0xff9a40, 24, 20, X(31), 4.5, X(26));
  },
  onPower(on) {
    const L = R.lights;
    for (const k of ['block1', 'block2', 'mess', 'infirm']) { L[k].color.set(on ? 0xe6eeff : 0xffd89a); L[k].userData.base = on ? 34 : 20; L[k].intensity = L[k].userData.base; }
    L.yard.intensity = L.yard.userData.base = on ? 520 : 380;
  },
  menu(t) {
    const a = t * 0.03 - 0.6, cx = PEN.X(26), cz = PEN.X(14);
    return [cx + Math.cos(a) * 62, 16 + Math.sin(t * 0.1) * 1.5, cz + Math.sin(a) * 46, cx, 3, cz];
  },
  menuZombies: { n: 5, x: [30, 90], z: [70, 74], bounds: [30, 90] },
  decor() { penDecor(); },
  ambience(S, dt) {
    S._amb = (S._amb || 5) - dt; if (S._amb > 0) return; S._amb = 6 + Math.random() * 10;
    const r = Math.random(); if (r < 0.35) S.foghorn(); else if (r < 0.6) S.gull(); else if (r < 0.8) S.howl();
  },
  hooks: {
    reset() { penReset(); },
    host(dt) { penHost(dt); },
    visuals(dt) { penVisuals(dt); },
    apply(type, d) { return penApply(type, d); },
    interact(pid, kind, id) { return penInteract(pid, kind, id); },
    candidates(cand, px, pz) { penCandidates(cand, px, pz); },
    state() { return { pl: PEN_STATE.partLoc.join(''), pt: PEN_STATE.parts.join(''), b: PEN_STATE.built ? 1 : 0, ms: PEN_STATE.ms, ks: PEN_STATE.keyState, kp: PEN_STATE.keyPos, bp: +PEN_STATE.boatP.toFixed(1) }; },
    mission() { return penMission(); },
    spawnFactor() { return PEN_STATE.ms === 3 ? 0.5 : 1; },
    reconcile(s) { penReconcile(s); },
    bossThink(z, dt) { penBossThink(z, dt); },
    bossDown(z, pid) { penBossDown(z, pid); },
    objective() { return PEN_STATE.ms >= 4 ? 1 : 0; },
    pingLabels(near) { PEN_PARTS.forEach((p, i) => { if (!PEN_STATE.parts[i] && WORLD.penParts) { const m = WORLD.penParts[i]; near(m.position.x, m.position.z, p.name); } }); if (WORLD.shieldTable) near(WORLD.shieldTable.pos.x, WORLD.shieldTable.pos.z, 'ÉTABLI DE FORTUNE'); },
  },
};

/* ─── Règles : le Geôlier, le bouclier de fortune ─── */
function penReset() {
  PEN_STATE.boss = null; PEN_STATE.bossRounds = new Set(); PEN_STATE.bossT = 0; PEN_STATE.bossKills = 0; PEN_STATE.parts = [0, 0, 0]; PEN_STATE.built = false; PEN_STATE.shieldRound = {};
  Object.assign(PEN_STATE, { ms: 0, keyState: 0, keyPos: null, boatP: 0, summoned: false }); penMissionVisualReset();
  PEN_STATE.partLoc = PEN_PARTS.map(() => (Math.random() < 0.5 ? 0 : 1));
  P.shield = 0; penPlaceParts();
  if (WORLD.shieldTable) WORLD.shieldTable.shield.visible = false;
}
function penPlaceParts() {
  (WORLD.penParts || []).forEach((m, i) => { const [x, z] = PEN_PARTS[i].spots[PEN_STATE.partLoc[i]]; m.position.set(x, m.userData.y, z); m.visible = !PEN_STATE.parts[i]; });
}
function penHost(dt) {
  // Le Geôlier à la 5e manche puis toutes les 5 manches, un quart d'heure après le début de la manche.
  const n = G.round;
  penMissionHost(dt);
  // La mission appelle le Geôlier plus tôt : dès la 3e manche une fois le bouclier prêt.
  const summon = PEN_STATE.ms === 1 && PEN_STATE.keyState === 0 && n >= 3 && !PEN_STATE.summoned && G.toSpawn > 0;
  if ((summon || (n >= 5 && n % 5 === 0 && !PEN_STATE.bossRounds.has(n))) && !(PEN_STATE.boss && PEN_STATE.boss.alive)) {
    PEN_STATE.bossT += dt;
    if (PEN_STATE.bossT > 12) {
      PEN_STATE.bossT = 0; PEN_STATE.bossRounds.add(n); if (summon) PEN_STATE.summoned = true;
      const cands = MAP.barricades.filter((b) => MAP.zoneActive[b.zone] && b.spawns.length); const b = pick(cands.length ? cands : MAP.barricades);
      const [sx, sz] = b.spawns[b.spawns.length - 1], x = tcx(sx), z = tcx(sz);
      const hp = Math.round((G.zHp || 1000) * 14 + 3500 * Math.max(1, G.players.size));
      const zb = new Zombie({ x, z, y: surfH(x, z), kind: 'warden', hp, round: n, yaw: Math.atan2(-b.dir[0], -b.dir[1]) });
      zb.locks = 0; PEN_STATE.boss = zb; G.toSpawn += 0; G.emit('boss', { id: zb.id });
    }
  } else PEN_STATE.bossT = 0;
}
// Le Geôlier pose un cadenas sur les machines et la caisse qu'il croise (trois au plus par passage).
function penBossThink(z, dt) {
  if (z.remote) return;
  z.lockT = (z.lockT || 0) - dt; if (z.lockT > 0 || (z.locks || 0) >= 3) return; z.lockT = 0.5;
  for (const p of WORLD.perks) if (!p.locked && Math.hypot(p.pos.x - z.pos.x, p.pos.z - z.pos.z) < 2.4) { z.locks = (z.locks || 0) + 1; G.emit('lock', { id: 'p:' + p.key }); Sfx.zombie(z.pos, 'scream', 0.5); return; }
  const s = WORLD.boxSpots[G.box.loc]; if (s && !G.box.locked && G.box.state === 'idle' && Math.hypot(s.pos.x - z.pos.x, s.pos.z - z.pos.z) < 2.6) { z.locks = (z.locks || 0) + 1; G.emit('lock', { id: 'b' }); }
}
function penBossDown(z, pid) {
  G.emit('bossdown', { x: +z.pos.x.toFixed(1), z: +z.pos.z.toFixed(1) }); PEN_STATE.bossKills = (PEN_STATE.bossKills || 0) + 1;
  for (const [id] of G.players) G.addPoints(id, 500, false);
  G.spawnDrop('maxammo', z.pos, true); G.spawnDrop(pick(['instakill', 'double']), _v1.set(z.pos.x + 1.4, 0, z.pos.z), true);
  if (PEN_STATE.keyState === 0) { const [kx, kz] = reachSpot(z.pos.x, z.pos.z); G.emit('pkeys', { s: 1, p: [+kx.toFixed(2), +kz.toFixed(2)] }); } // il lâche son trousseau (toujours dans une zone praticable)
}
function penApply(type, d) {
  if (type === 'boss') { const z = ZOMBIES.find((q) => q.id === d.id); Sfx.siren(); R.flash = 2.2; Sfx.thunder?.(0.2); UI.message('LE GEÔLIER EST LÀ', 'Il cadenasse les machines et la caisse. Visez le corps : son casque arrête les balles.'); if (z) PEN_STATE.boss = z; return true; }
  if (type === 'bossdown') { UI.message('LE GEÔLIER EST TOMBÉ', '+500 pour tout le monde.'); Sfx.jingle([0, 3, 7, 12, 15], 330, 'sawtooth', 0.12); PEN_STATE.boss = null; return true; }
  if (type === 'part') { PEN_STATE.parts[d.i] = 1; if (WORLD.penParts) WORLD.penParts[d.i].visible = false; Sfx.pickup(); const n = PEN_STATE.parts.filter(Boolean).length; UI.message(`${PEN_PARTS[d.i].name} TROUVÉE`, n < 3 ? `Pièces du bouclier : ${n} / 3` : "Toutes les pièces : assemblez le bouclier à l'établi des douches."); return true; }
  if (type === 'built') { PEN_STATE.built = true; if (WORLD.shieldTable) WORLD.shieldTable.shield.visible = true; Sfx.hammer?.(WORLD.shieldTable?.pos || P.pos); Sfx.jingle([0, 7, 12], 392); UI.message('BOUCLIER ASSEMBLÉ', "Chacun peut en prendre un à l'établi."); return true; }
  if (type === 'pkeys' || type === 'pms') { penMissionApply(type, d); return true; }
  if (type === 'shield') { if (d.pid === P.id) { P.shield = P.shieldMax = 1500; UI.message('BOUCLIER DE FORTUNE', 'Il encaisse les trois quarts des coups jusqu\'à se briser.'); Sfx.buy(); } return true; }
  return false;
}
function penInteract(pid, kind, id) {
  if (kind === 'pkey') { if (PEN_STATE.keyState === 1) G.emit('pkeys', { s: 2, who: G.players.get(pid)?.name || '' }); return true; }
  if (kind === 'pboat') { if (PEN_STATE.ms === 2) G.emit('pms', { ms: 3, bp: 0 }); return true; }
  if (kind === 'part') { const i = +id; if (PEN_STATE.parts[i]) return true; G.emit('part', { i }); return true; }
  if (kind === 'build') { if (PEN_STATE.built || PEN_STATE.parts.some((v) => !v)) { G.tell(pid, 'deny'); return true; } G.emit('built', {}); return true; }
  if (kind === 'takeShield') {
    const last = PEN_STATE.shieldRound[pid]; if (!PEN_STATE.built || (last !== undefined && G.round - last < 2)) { G.tell(pid, 'deny'); return true; }
    if (!G.pay(pid, 500)) return true; PEN_STATE.shieldRound[pid] = G.round; G.emit('shield', { pid }); return true;
  }
  return false;
}
function penCandidates(cand, px, pz) {
  penMissionCandidates(cand, px, pz);
  (WORLD.penParts || []).forEach((m, i) => { if (!PEN_STATE.parts[i] && m.visible) cand(Math.hypot(px - m.position.x, pz - m.position.z), { kind: 'part', id: i, text: `Ramasser : ${PEN_PARTS[i].name} (bouclier)`, range: 1.6 }); });
  const T = WORLD.shieldTable; if (!T) return;
  const d = Math.hypot(px - T.pos.x, pz - T.pos.z), n = PEN_STATE.parts.filter(Boolean).length;
  if (!PEN_STATE.built) cand(d, n < 3 ? { kind: 'info', text: `Établi de fortune — pièces du bouclier : ${n} / 3`, range: 1.8, deny: true } : { kind: 'build', text: 'Assembler le bouclier de fortune', range: 1.8 });
  else if (P.shield > 0) cand(d, { kind: 'info', text: `Bouclier en main (${Math.round((P.shield / (P.shieldMax || 1500)) * 100)} %)`, range: 1.8 });
  else cand(d, { kind: 'takeShield', text: 'Prendre un bouclier de fortune', cost: 500, range: 1.8 });
}
function penReconcile(s) {
  if (!s) return;
  if (typeof s.pl === 'string' && s.pl.length === 3) { const pl = s.pl.split('').map(Number); if (pl.join('') !== PEN_STATE.partLoc.join('')) { PEN_STATE.partLoc = pl; penPlaceParts(); } }
  if (typeof s.pt === 'string') s.pt.split('').forEach((c, i) => { if (c === '1' && !PEN_STATE.parts[i]) { PEN_STATE.parts[i] = 1; if (WORLD.penParts) WORLD.penParts[i].visible = false; } });
  if (s.b && !PEN_STATE.built) { PEN_STATE.built = true; if (WORLD.shieldTable) WORLD.shieldTable.shield.visible = true; }
  if (typeof s.ks === 'number' && s.ks !== PEN_STATE.keyState) penMissionApply('pkeys', { s: s.ks, p: s.kp }, true);
  if (typeof s.ms === 'number' && s.ms !== PEN_STATE.ms) penMissionApply('pms', { ms: s.ms, bp: s.bp }, true); else if (typeof s.bp === 'number' && Math.abs(s.bp - PEN_STATE.boatP) > 2) PEN_STATE.boatP = s.bp;
}
function penVisuals(dt) {
  // Invités : l'annonce du Geôlier peut précéder son apparition dans l'instantané ; on le retrouve dès qu'il est là.
  if (!G.authority && !(PEN_STATE.boss && PEN_STATE.boss.alive)) PEN_STATE.boss = ZOMBIES.find((z) => z.alive && z.kind === 'warden') || null;
  if (WORLD.penParts) for (const m of WORLD.penParts) if (m.visible) { m.rotation.y += dt * 1.2; m.position.y = m.userData.y + Math.sin(G.time * 2 + m.position.x) * 0.05; }
  if (WORLD.beacons) for (const b of WORLD.beacons) b.m.visible = Math.sin(G.time * 2.4 + b.ph) > 0.2;
  if (WORLD.lighthouse) WORLD.lighthouse.rotation.y += dt * 0.55;
  penMissionVisuals(dt);
}

/* ─── Mission « L'évasion » : bouclier → clés du Geôlier → vedette → tenir → le rocher garde tout le monde ─── */
const PEN_BOAT_TIME = 60, PEN_BOAT_R = 9;
function penMissionHost(dt) {
  const S = PEN_STATE;
  if (S.ms === 0 && S.built) G.emit('pms', { ms: 1 });
  if (S.ms === 1 && S.keyState === 2) G.emit('pms', { ms: 2 });
  if (S.ms === 3) {
    const b = WORLD.penBoat; let near = false; if (b) for (const [, p] of G.players) if (!p.down && !p.dead && Math.hypot(p.pos.x - b.dock.x, p.pos.z - b.dock.z) < PEN_BOAT_R) near = true;
    S.boatP = near ? Math.min(PEN_BOAT_TIME, S.boatP + dt) : Math.max(0, S.boatP - dt * 0.6);
    G.toSpawn = Math.max(G.toSpawn, 5 + G.players.size * 2); if (G.breakT > 0) G.breakT = Math.max(G.breakT, 2);
    if (S.boatP >= PEN_BOAT_TIME) { G.emit('pms', { ms: 4 }); for (const [pid] of G.players) G.addPoints(pid, 3000, false); }
    else { S.syncT = (S.syncT || 0) - dt; if (S.syncT <= 0) { S.syncT = 0.6; G.netEvent('pms', { ms: 3, bp: +S.boatP.toFixed(1) }); } }
  }
}
function penMissionApply(type, d, quiet) {
  const S = PEN_STATE;
  if (type === 'pkeys') {
    const prev = S.keyState; S.keyState = d.s; if (d.p) S.keyPos = d.p;
    if (!WORLD.penKeys) { const g = new THREE.Group(); g.userData.dynamic = true; R.scene.add(g); KIT.c(g, 0, 0, 0, 0.12, 0.12, 0.02, MATS.brass, 14).rotation.x = Math.PI / 2; for (let i = 0; i < 3; i++) { const k = KIT.b(g, 0.08 + i * 0.03, -0.12, 0, 0.025, 0.2, 0.01, MATS.brass); k.rotation.z = -0.3 + i * 0.3; } KIT.glow(g, 0, 0, 0, 0xffd070, 1.2, 0.6); WORLD.penKeys = g; }
    WORLD.penKeys.visible = S.keyState === 1; if (S.keyPos) WORLD.penKeys.position.set(S.keyPos[0], groundAt(S.keyPos[0], S.keyPos[1]) + 0.6, S.keyPos[1]);
    if (!quiet && S.keyState === 1 && prev === 0) UI.message('LE TROUSSEAU DU GEÔLIER', 'Ramassez ses clés.');
    if (!quiet && S.keyState === 2 && prev !== 2) { UI.message('CLÉS DU GEÔLIER', `${d.who ? d.who + ' · ' : ''}le hangar des quais est à vous`); Sfx.pickup(); }
  } else {
    const prev = S.ms; S.ms = d.ms; if (d.bp !== undefined) S.boatP = d.bp; else if (d.ms === 3 && prev !== 3) S.boatP = 0;
    if (!quiet && prev !== S.ms) {
      if (S.ms === 1) UI.message("L'ÉVASION", 'Le bouclier est prêt. Il vous faut les clés du Geôlier.');
      if (S.ms === 2) UI.message("L'ÉVASION", 'Préparez la vedette amarrée au sud des quais.');
      if (S.ms === 3) { UI.message('LE MOTEUR CHAUFFE', 'Tenez les quais autour de la vedette !'); Sfx.generatorStart?.(WORLD.penBoat?.dock || P.pos); }
      if (S.ms === 4) penBoatDoom();
    }
  }
  UI.objective();
}
// La vedette largue les amarres… et la foudre la frappe : personne ne quitte le rocher.
function penBoatDoom() {
  const b = WORLD.penBoat; Sfx.jingle([0, 3, 7, 12, 15, 19], 330, 'sawtooth', 0.12); UI.banner?.("PERSONNE NE QUITTE LE ROCHER", "+3000 points · la vedette a sombré"); if (!b) return;
  b.leave = 0.0001;
}
function penMissionVisualReset() { const b = WORLD.penBoat; if (b) { b.leave = 0; b.g.position.copy(b.home); b.g.rotation.set(0, 0.06, 0); b.g.visible = true; } if (WORLD.penKeys) WORLD.penKeys.visible = false; }
function penMissionVisuals(dt) {
  const S = PEN_STATE, b = WORLD.penBoat;
  if (WORLD.penKeys && WORLD.penKeys.visible) WORLD.penKeys.rotation.y += dt * 1.5;
  if (S.ms === 3 && !G.authority) S.boatP = Math.min(PEN_BOAT_TIME, S.boatP + dt * 0.5);
  if (S.ms === 3 && b && Math.random() < dt * 4) FX.soft.spawn(b.g.position.x - 2.4, 2.2, b.g.position.z, rand(-0.2, 0.2), rand(0.8, 1.4), rand(-0.2, 0.2), rand(1.5, 2.5), rand(0.3, 0.5), 0.3, 0.3, 0.32, 0.5, -0.1, 1.4, 1.0);
  if (b && b.leave > 0) {
    b.leave += dt; const t = b.leave;
    if (t < 4) b.g.position.z = b.home.z + t * t * 1.2;
    else if (b.leave - dt < 4) { R.flash = 2.5; Sfx.thunder?.(0); fxExplosion(_v1.set(b.g.position.x, 1, b.g.position.z), 6); }
    else { b.g.position.y = b.home.y - (t - 4) * 0.5; b.g.rotation.z = Math.min(0.8, (t - 4) * 0.2); if (t > 10) b.g.visible = false; }
  }
}
function penMissionCandidates(cand, px, pz) {
  const S = PEN_STATE;
  if (S.keyState === 1 && WORLD.penKeys) cand(Math.hypot(px - WORLD.penKeys.position.x, pz - WORLD.penKeys.position.z), { kind: 'pkey', text: 'Ramasser les clés du Geôlier', range: 1.6 });
  const b = WORLD.penBoat; if (!b) return; const d = Math.hypot(px - b.dock.x, pz - b.dock.z);
  if (S.ms === 2) cand(d, { kind: 'pboat', text: 'Maintenir pour préparer la vedette', range: 2.4, hold: true, holdTime: 4 });
  else if (S.ms === 3) cand(d, { kind: 'info', text: `Le moteur chauffe : ${Math.round((S.boatP / PEN_BOAT_TIME) * 100)} %`, range: 3 });
  else if (S.ms < 2) cand(d, { kind: 'info', text: S.keyState === 2 ? 'Vedette amarrée' : 'Vedette amarrée — il faut les clés du Geôlier', range: 2.4, deny: S.keyState !== 2 });
}
function penMission() {
  const S = PEN_STATE, n = S.parts.filter(Boolean).length;
  const T = WORLD.shieldTable, b = WORLD.penBoat, dock = b ? [b.dock.x, 1.2, b.dock.z] : null;
  if (S.ms === 0) return n < 3 ? { title: "L'ÉVASION", line: `Fabriquer le bouclier : trouver les pièces (${n}/3)`, sub: PEN_PARTS.map((p, i) => `${S.parts[i] ? '✔' : '○'} ${p.name}`).join('   ·   ') } : { title: "L'ÉVASION", line: "Assembler le bouclier à l'établi des douches", sub: '', at: T ? [T.pos.x, 1.4, T.pos.z] : null };
  if (S.ms === 1) { if (S.keyState === 1) return { title: "L'ÉVASION", line: 'Ramasser les clés du Geôlier', sub: 'Là où il est tombé', at: S.keyPos ? [S.keyPos[0], 1, S.keyPos[1]] : null }; if (S.boss && S.boss.alive) return { title: "L'ÉVASION", line: 'Abattre le Geôlier et prendre ses clés', sub: 'Visez le corps : son casque arrête les balles' }; return { title: "L'ÉVASION", line: 'Attirer le Geôlier et prendre ses clés', sub: G.round < 3 ? 'Il fera sa ronde dès la 3e manche' : 'Il arrive pendant la manche' }; }
  if (S.ms === 2) return { title: "L'ÉVASION", line: 'Préparer la vedette amarrée au sud des quais', sub: 'Maintenir E au bord du quai', at: dock };
  if (S.ms === 3) return { title: "L'ÉVASION", line: `Défendre la vedette — restez à moins de ${PEN_BOAT_R} m`, bar: S.boatP / PEN_BOAT_TIME, at: dock };
  return null;
}
