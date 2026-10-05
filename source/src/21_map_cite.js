/* ═══════════════════ CARTE : CITÉ ATOMIQUE ═══════════════════
   Village témoin des années 50 planté dans le désert d'un site d'essais nucléaires, au crépuscule.
   Une rue en cul-de-sac, deux pavillons pastel face à face, leurs jardins, l'abri antiatomique et la station-service.
   Particularités : les machines d'atouts tombent du ciel au fil des manches ; six mannequins marqués d'un foulard
   rouge cachent un secret ; le panneau « POPULATION » décompte les morts. */

const CITE = (() => {
  const OX = 4, OZ = 4;
  const X = (lx) => (lx + OX) * TILE, CX = (lx) => (lx + OX) * TILE + TILE / 2; // bord et centre d'un carreau local
  return { OX, OZ, X, CX, T: (lx, lz) => [lx + OX, lz + OZ] };
})();
// Emplacements d'atterrissage des atouts (mètres, orientation de la façade).
const CITE_PADS = [[11, 18.2, 0], [24, 16.5, Math.PI], [36.5, 34.5, Math.PI / 2], [13.5, 5.5, 0], [30, 38.5, 0], [8.2, 25.4, -Math.PI / 2], [4.2, 32, Math.PI], [32.5, 11.5, Math.PI], [26.5, 35, 0]]
  .map(([lx, lz, yaw]) => ({ x: CITE.X(lx), z: CITE.X(lz), yaw }));
const CITE_STATE = { landed: [], heads: [], pop: 1954, lastPop: -1, dropT: 0, dropRound: 0, anims: [] };

MAPS.cite = {
  id: 'cite', name: 'CITÉ ATOMIQUE', sub: "Site d'essais, désert, 1957",
  objName: 'Alerte atomique surmontée',
  powerParts: [{ name: 'FUSIBLE', kind: 'fuse', zones: [1, 3] }, { name: "BIDON D'ESSENCE", kind: 'fuel', zones: [2, 4] }, { name: "BOBINE D'ALLUMAGE", kind: 'coil', zones: [6] }],
  intro: ['CITÉ ATOMIQUE', "Site d'essais nucléaires, désert", '17 octobre 1957 — 18 h 40'],
  desc: "Un village témoin construit pour être rasé. Deux pavillons, un abri, une station-service… et des mannequins qui regardent.",
  card: ['#5a2c2a', '#e0955a'],
  info: { eyebrow: "SITE D'ESSAIS · CRÉPUSCULE", tagline: 'La bombe est tombée. Les habitants, non.', stat: ['RADIATIONS', '312 rem'] },
  loading: 'MONTAGE DES PAVILLONS…',
  art(x, w, h) {
    const g = x.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#1f1a3a'); g.addColorStop(0.45, '#8a3f3a'); g.addColorStop(0.62, '#f09a52'); g.addColorStop(0.64, '#6b4a34'); g.addColorStop(1, '#2a1e18'); x.fillStyle = g; x.fillRect(0, 0, w, h);
    x.fillStyle = '#ffd08a'; x.beginPath(); x.arc(w * 0.18, h * 0.6, 20, Math.PI, 0); x.fill();
    // champignon atomique
    x.fillStyle = '#e9b27a'; x.fillRect(w * 0.7 - 10, h * 0.28, 20, h * 0.34); x.beginPath(); x.ellipse(w * 0.7, h * 0.26, 62, 32, 0, 0, TAU); x.fill();
    x.fillStyle = '#c4784a'; x.beginPath(); x.ellipse(w * 0.7, h * 0.3, 70, 14, 0, 0, TAU); x.fill();
    // pavillons
    for (const [cx, col] of [[w * 0.28, '#e8cf74'], [w * 0.62, '#9ccfa9']]) { x.fillStyle = col; x.fillRect(cx - 48, h * 0.66, 96, 44); x.fillStyle = '#5a3a30'; x.beginPath(); x.moveTo(cx - 58, h * 0.66); x.lineTo(cx, h * 0.54); x.lineTo(cx + 58, h * 0.66); x.fill(); x.fillStyle = '#ffcf7a'; x.fillRect(cx - 30, h * 0.72, 16, 12); x.fillRect(cx + 14, h * 0.72, 16, 12); }
    x.fillStyle = '#1b1614'; x.fillRect(0, h * 0.86, w, h * 0.14);
  },
  w: 50, d: 48, flat: true, ceil: 3.0, wallH: 3.6, perkDrop: true,
  zones: ['La rue', 'Maison jaune', 'Jardin jaune', 'Maison verte', 'Jardin vert', 'Abri antiatomique', 'Station-service'],
  styles: ['road', 'sidewalk', 'lawn', 'parquet', 'kitchen', 'carpet', 'garage', 'bunker', 'shop', 'forecourt', 'yard', 'bath'],
  styleDefs: [
    { floor: 'asphalt' }, { floor: ['sidewalk', 0xdcd6ca] }, { floor: ['lawn', 0xb4dc76] },
    { floor: 'parquet', ceil: ['plaster', 0xf3ecdc] }, { floor: 'checker', ceil: ['plaster', 0xf3ecdc] }, { floor: ['plaster', 0x9a5a58], ceil: ['plaster', 0xf3ecdc] },
    { floor: ['slab', 0xbdb8ae], ceil: ['planks', 0x9a8a70] }, { floor: ['slab', 0x8e8a80], ceil: ['concrete', 0x9a968c], roof: ['concrete', 0xa8a49a] },
    { floor: 'checker', ceil: ['plaster', 0xeae4d4] }, { floor: ['slab', 0xcfc8b8], ceil: ['plaster', 0xf6f3ea], roof: ['plaster', 0xf2eee4] }, { floor: ['lawn', 0x8cca5e] }, { floor: 'tileWall', ceil: ['plaster', 0xf3ecdc] },
  ],
  // Plinthes en bois verni (famille meuble) ; rideaux en toile de coton.
  roofTex: ['shingle', 0xb07a62], ceilTex: ['plaster', 0xf3ecdc], wallMat: 'wood', baseboard: ['meuble', 0x5a3a28], curtain: ['toile', 0xd8a86a],
  decals: { grime: 0.75, splash: 0.3, under: 0.5, crack: 0.1, stain: 0.03, scuff: 0.08, mold: 0.02, blood: 0.02,
    floor: { road: [['oil', 0.18, 1.6], ['crack', 0.15, 1.8]], sidewalk: [['crack', 0.15, 1.2], ['dirt', 0.1, 1.2]], kitchen: [['dirt', 0.1, 1]], parquet: [['scuff', 0.1, 1], ['blood', 0.04, 1.2]], garage: [['oil', 0.3, 1.4]], forecourt: [['oil', 0.35, 1.6]], shop: [['dirt', 0.15, 1]], bunker: [['leak', 0.15, 1.2], ['dirt', 0.2, 1.2]], carpet: [['stain', 0.08, 0.9]], bath: [['leak', 0.1, 0.8]] } },
  scatter: [{ kind: 'tuft', styles: ['lawn', 'yard'], n: 9, color: 0x6f9a4a, jitter: 0.25 }, { kind: 'leaf', styles: ['lawn', 'yard', 'sidewalk'], n: 1.5, color: 0x9a6a3a, hue: 0.03 }, { kind: 'paper', styles: ['road', 'sidewalk', 'forecourt'], n: 0.25, color: 0xd8d2c0 }, { kind: 'pebble', styles: ['road', 'forecourt'], n: 2, color: 0x7a746c },
    { kind: 'scrub', ground: [1.5, 14], n: 0.12, color: 0x8a7a52, shadow: true }, { kind: 'rock', ground: [1, 16], n: 0.08, color: 0xa87a5a, shadow: true }, { kind: 'pebble', ground: [0.8, 10], n: 1.2, color: 0xb08a6a }],
  details: { eaves: 0.45, gutter: 0xe0dcd2, fascia: ['plaster', 0xf2eee4], plinth: ['concrete', 0x8e887c], crown: ['plaster', 0xfbf7ee] },
  walls: [
    { key: 'yellow', h: 3.2, out: ['siding', 0xf2d57a], in: ['wallpaper', 0xf7eedb], mat: 'wood' },
    // Encadrements, croisillons, appuis et jardinières des fenêtres (trim) : menuiserie en bois peint.
    { key: 'yellowWin', look: 'window', h: 3.2, out: ['siding', 0xf2d57a], in: ['wallpaper', 0xf7eedb], trim: ['boisPeint', 0xf6f2e6], shutter: 0x2f5d7a, flowers: true, mat: 'wood' },
    { key: 'green', h: 3.2, out: ['siding', 0xa6dbb8], in: ['wallpaper', 0xe8f0e0], mat: 'wood' },
    { key: 'greenWin', look: 'window', h: 3.2, out: ['siding', 0xa6dbb8], in: ['wallpaper', 0xe8f0e0], trim: ['boisPeint', 0xf6f2e6], shutter: 0x9a3a2e, flowers: true, mat: 'wood' },
    { key: 'inner', h: 3.0, out: ['wallpaper', 0xefe6d2], in: ['wallpaper', 0xefe6d2], mat: 'wood' },
    { key: 'bunker', h: 3.4, out: ['concrete', 0xb5b0a4], in: ['concrete', 0x96918a], mat: 'concrete' },
    { key: 'bunkerIn', h: 3.0, out: ['concrete', 0x96918a], in: ['concrete', 0x96918a], mat: 'concrete' },
    { key: 'stucco', h: 3.4, out: ['plaster', 0xeee4c8], in: ['plaster', 0xdcd4bf], mat: 'concrete' },
    { key: 'stuccoWin', look: 'window', h: 3.4, out: ['plaster', 0xeee4c8], in: ['plaster', 0xdcd4bf], trim: ['boisPeint', 0xc23b3b], mat: 'concrete' },
    { key: 'picket', look: 'picket', h: 1.1, see: true, mat: 'wood' },
    { key: 'chain', look: 'chain', h: 2.3, see: true, mat: 'metal' },
    { key: 'rail', look: 'rail', h: 1.2, see: true, mat: 'wood' },
  ],
  // Clôtures automatiques entre le sol praticable et le désert.
  boundary(x, z) { const st = this.styles[MAP.style[ti(x, z)]]; return st === 'lawn' ? 'picket' : st === 'forecourt' ? 'rail' : 'chain'; },
  grid(A) {
    const { OX: ox, OZ: oz } = CITE;
    const F = (a, b, c, d, zone, st, roof) => A.floor(a + ox, b + oz, c + ox, d + oz, zone, st, roof);
    const H = (z, a, b, k) => A.hwall(z + oz, a + ox, b + ox, k), V = (x, a, b, k) => A.vwall(x + ox, a + oz, b + oz, k);
    const D = (x, z, c, k, l) => A.door(x + ox, z + oz, c, k, l), Rp = (x, z, look) => A.ramp(x + ox, z + oz, look);
    // ── Zone 0 : la rue, ses trottoirs et pelouses, le cul-de-sac et l'allée de l'abri.
    F(2, 15, 33, 15, 0, 'lawn'); F(2, 16, 33, 16, 0, 'sidewalk'); F(2, 17, 39, 20, 0, 'road'); F(2, 21, 33, 21, 0, 'sidewalk'); F(2, 22, 33, 22, 0, 'lawn');
    F(34, 13, 39, 24, 0, 'road'); F(28, 12, 28, 14, 0, 'sidewalk');
    // ── Zone 1 : maison jaune (salon, cuisine, chambre, salle de bains) et son garage.
    F(4, 10, 8, 14, 1, 'parquet', 1); F(9, 10, 14, 14, 1, 'kitchen', 1); F(4, 7, 8, 9, 1, 'carpet', 1); F(9, 7, 14, 9, 1, 'bath', 1); F(15, 9, 19, 14, 1, 'garage', 1);
    // ── Zone 2 : jardin jaune.
    F(2, 0, 20, 6, 2, 'yard');
    // ── Zone 3 : maison verte et son garage.
    F(22, 23, 27, 26, 3, 'parquet', 1); F(28, 23, 32, 26, 3, 'kitchen', 1); F(22, 27, 26, 30, 3, 'carpet', 1); F(27, 27, 32, 30, 3, 'bath', 1); F(17, 23, 21, 28, 3, 'garage', 1);
    // ── Zone 4 : jardin vert.
    F(18, 31, 36, 37, 4, 'yard');
    // ── Zone 5 : abri antiatomique (salle commune, salle du générateur, dortoir).
    F(24, 7, 32, 10, 5, 'bunker', 1); F(24, 3, 27, 6, 5, 'bunker', 1); F(28, 3, 32, 6, 5, 'bunker', 1);
    // ── Zone 6 : station-service (piste sous auvent, boutique, atelier).
    F(2, 24, 9, 29, 6, 'forecourt'); F(3, 25, 8, 28, 6, 'forecourt', 1); F(10, 24, 15, 28, 6, 'shop', 1); F(10, 29, 15, 32, 6, 'garage', 1);

    // Murs de la maison jaune.
    H(15, 4, 7, 'yellow'); H(15, 9, 19, 'yellow'); H(15, 5, 5, 'yellowWin'); H(15, 11, 11, 'yellowWin'); H(15, 13, 13, 'yellowWin');
    H(7, 4, 8, 'yellow'); H(7, 10, 14, 'yellow'); H(7, 5, 5, 'yellowWin'); H(7, 12, 12, 'yellowWin');
    V(4, 7, 7, 'yellow'); V(4, 9, 10, 'yellow'); V(4, 12, 14, 'yellow'); V(4, 13, 13, 'yellowWin');
    V(15, 7, 7, 'yellow'); H(9, 15, 19, 'yellow'); V(20, 9, 10, 'yellow'); V(20, 12, 14, 'yellow'); V(20, 13, 13, 'yellowWin');
    V(15, 9, 11, 'inner'); V(15, 13, 14, 'inner');
    H(10, 4, 5, 'inner'); H(10, 7, 11, 'inner'); H(10, 13, 14, 'inner'); V(9, 10, 11, 'inner'); V(9, 13, 14, 'inner'); V(9, 7, 9, 'inner');
    V(8, 15, 15, 'yellow'); V(9, 15, 15, 'yellow'); V(9, 6, 6, 'yellow'); V(10, 6, 6, 'yellow'); // porches
    // Murs de la maison verte.
    H(23, 17, 25, 'green'); H(23, 27, 32, 'green'); H(23, 23, 23, 'greenWin'); H(23, 29, 29, 'greenWin'); H(23, 31, 31, 'greenWin');
    H(31, 22, 27, 'green'); H(31, 29, 32, 'green'); H(31, 24, 24, 'greenWin'); H(31, 31, 31, 'greenWin');
    V(33, 23, 25, 'green'); V(33, 27, 28, 'green'); V(33, 30, 30, 'green'); V(33, 24, 24, 'greenWin');
    V(22, 29, 30, 'green'); V(17, 23, 28, 'green'); V(17, 25, 25, 'greenWin'); H(29, 17, 18, 'green'); H(29, 20, 21, 'green');
    V(22, 23, 24, 'inner'); V(22, 26, 28, 'inner');
    H(27, 22, 23, 'inner'); H(27, 25, 29, 'inner'); H(27, 31, 32, 'inner'); V(28, 23, 24, 'inner'); V(28, 26, 26, 'inner'); V(27, 27, 30, 'inner');
    V(26, 22, 22, 'green'); V(27, 22, 22, 'green'); V(28, 31, 31, 'green'); V(29, 31, 31, 'green');
    // Abri.
    H(3, 24, 27, 'bunker'); H(3, 29, 32, 'bunker'); H(11, 24, 27, 'bunker'); H(11, 29, 32, 'bunker');
    V(24, 3, 4, 'bunker'); V(24, 6, 10, 'bunker'); V(33, 3, 5, 'bunker'); V(33, 7, 10, 'bunker');
    V(28, 11, 11, 'bunker'); V(29, 11, 11, 'bunker');
    H(7, 24, 25, 'bunkerIn'); H(7, 27, 29, 'bunkerIn'); H(7, 31, 32, 'bunkerIn'); V(28, 3, 6, 'bunkerIn');
    // Station-service.
    H(24, 10, 15, 'stucco'); V(16, 24, 28, 'stucco'); V(10, 24, 25, 'stucco'); V(10, 27, 28, 'stucco'); V(10, 25, 25, 'stuccoWin'); V(10, 27, 27, 'stuccoWin'); H(24, 12, 12, 'stuccoWin'); H(24, 14, 14, 'stuccoWin');
    V(10, 29, 29, 'stucco'); V(10, 31, 32, 'stucco'); H(33, 10, 11, 'stucco'); H(33, 13, 15, 'stucco'); V(16, 29, 32, 'stucco');
    H(29, 10, 12, 'stucco'); H(29, 14, 15, 'stucco');

    // Passages.
    D(8, 15, 750, 'wood', 'Maison jaune'); D(9, 6, 1000, 'wood', 'Jardin jaune');
    D(26, 22, 750, 'wood', 'Maison verte'); D(28, 31, 1000, 'wood', 'Jardin vert');
    D(28, 11, 1250, 'steel', 'Abri antiatomique'); D(5, 23, 1000, 'debris', 'Station-service');
    for (const d of MAP.doors) if (d.kind === 'wood') d.color = /jaune/i.test(d.label) ? 0xb04a3a : 0x2f6a8a;

    // Barricades : trouées dans les grillages (rue, jardins, piste) et fenêtres (maisons, abri, atelier).
    for (const [x, z] of [[1, 17], [1, 20], [40, 16], [40, 21], [22, 14], [35, 12], [16, 23], [36, 25], [8, -1], [1, 3], [21, 2], [17, 34], [30, 38], [37, 33], [1, 26], [5, 30]]) Rp(x, z, 'fence');
    for (const [x, z] of [[3, 11], [3, 8], [20, 11], [15, 8], [33, 26], [33, 29], [19, 29], [23, 5], [33, 6], [28, 2], [12, 33]]) Rp(x, z, 'window');
  },
  spots: (() => {
    const T = CITE.T;
    return {
      start: T(20, 18), startYaw: -Math.PI / 2,
      coopStarts: [T(20, 18), T(20, 19), T(22, 18), T(22, 19)],
      wallBuys: [
        { weapon: 'bolt', ...xz(T(17, 15)), wall: 'n' },
        { weapon: 'shotgun', ...xz(T(14, 10)), wall: 'e' },
        { weapon: 'smg', ...xz(T(22, 24)), wall: 'w' },
        { weapon: 'carbine', ...xz(T(24, 9)), wall: 'w' },
        { weapon: 'revolver', ...xz(T(15, 25)), wall: 'e' },
      ],
      // Les machines d'atouts démarrent hors de la carte : elles tombent du ciel au fil des manches.
      perks: ['revive', 'armor', 'sprint', 'reload', 'rof', 'mule', 'deadshot'].map((perk, i) => ({ perk, x: 1 + i, z: 1, wall: 'n' })),
      power: { ...xz(T(24, 4)), wall: 'w' },
      generator: { x: CITE.X(26) + 0.6, z: CITE.X(4) + 1.2, ry: Math.PI / 2 },
      box: [{ ...xz(T(12, 22)), wall: 's' }, { ...xz(T(4, 13)), wall: 'w' }, { ...xz(T(32, 5)), wall: 'e' }, { ...xz(T(22, 29)), wall: 'w' }, { ...xz(T(15, 27)), wall: 'e' }],
      bench: { ...xz(T(15, 31)), wall: 'e' },
      groundSpawns: [T(5, 15), T(14, 16), T(31, 22), T(37, 18), T(37, 23), T(6, 2), T(16, 4), T(21, 35), T(33, 35), T(4, 27), T(26, 16)].map(([x, z]) => [x, z]),
    };
    function xz([x, z]) { return { x, z }; }
  })(),
  env: {
    fog: 0xb07a58, fogDensity: 0.0095, stormFog: 0.03, exposure: 1.22,
    sky: { zen: [0.07, 0.06, 0.2], disk: [9, 5.4, 2.6], diskSize: 0.9982, halo: [1.3, 0.6, 0.28], cloudA: [0.3, 0.17, 0.2], cloudB: [1.15, 0.6, 0.36], stars: 0.2, ridge: 1, glow: [1.25, 0.46, 0.16], cover: 0.6, flash: [1, 0.9, 0.7] },
    sunDir: [-0.8, 0.2, -0.3], sunColor: 0xffb070, sunI: 2.9, hemi: [0xc0a0b8, 0x7a5a3a], bounce: 0x9a7a5a, hemiOut: 1.15, hemiIn: 0.62, envOut: 0.85, envIn: 0.45,
    envMap: { low: [0.3, 0.2, 0.12], mid: [0.98, 0.62, 0.4], high: [0.24, 0.26, 0.5], glowDir: [-0.8, 0.2, -0.3], glow: [1.0, 0.55, 0.22] },
    precip: 'ash', snow: 0, tint: [1.05, 0.98, 0.9], frost: false, flares: false, wind: 0.5,
    storm: { title: 'RETOMBÉES', sub: 'Une pluie de cendres radioactives. Ils courent.' },
    burst: [0.7, 0.58, 0.44], flashLight: 0.2,
    far: { color: 0xa87a58, y: -0.5, cx: 50, cz: 48, r0: 160 },
  },
  ground: { tex: ['sand', 0xf2d6ae], c0: [1, 1, 1], c1: [0.86, 0.74, 0.62], pad: 90 },
  surfH(x, z) { const e = edgeAt(x, z), m = smooth(clamp((e - 6) / 10, 0, 1)); if (m <= 0) return 0; return ((fbm(x * 0.02, z * 0.02, 3) - 0.35) * 7 + (fbm(x * 0.09, z * 0.09, 2) - 0.5) * 0.8) * m; },
  groundMat: 'earth', floorMat: () => 'wood', ceilMat: 'wood',
  stepSurface(st) { const s = this.styles[st]; return s === 'parquet' || s === 'carpet' ? 'wood' : s === 'lawn' || s === 'yard' ? 'snow' : 'concrete'; },
  lights(pl) {
    pl('lampW', 0xffb060, 26, 20, 0, 5, 0); pl('lampE', 0xffb060, 26, 20, 0, 5, 0);
    pl('houseY', 0xffc080, 7, 12, CITE.X(9), 2.2, CITE.X(12)); pl('houseG', 0xffc080, 7, 12, CITE.X(27), 2.2, CITE.X(25));
    pl('shelter', 0xff2a18, 6, 14, CITE.X(28), 2.7, CITE.X(9)); pl('shelter2', 0xff2a18, 4, 10, CITE.X(25) + 1, 2.6, CITE.X(5));
    pl('canopy', 0xe8f4ff, 0, 22, CITE.X(6), 3.2, CITE.X(27));
    if (settings.quality >= 1) pl('busFire', 0xff7a2a, 30, 16, 0, 1.6, 0);
  },
  onPower(on) {
    const L = R.lights;
    L.shelter.color.set(on ? 0xfff0dc : 0xff2a18); L.shelter.intensity = L.shelter.userData.base = on ? 14 : 6;
    L.shelter2.color.set(on ? 0xfff0dc : 0xff2a18); L.shelter2.intensity = L.shelter2.userData.base = on ? 10 : 4;
    L.canopy.intensity = L.canopy.userData.base = on ? 40 : 0;
    if (WORLD.canopyGlow) for (const s of WORLD.canopyGlow) s.material.opacity = on ? 0.8 : 0;
    if (WORLD.gasSign) WORLD.gasSign.material.emissiveIntensity = on ? 1.2 : 0.08;
  },
  menu(t) {
    const a = t * 0.045 + 2.2, cx = CITE.X(20), cz = CITE.X(19);
    return [cx + Math.cos(a) * 26, 6.5 + Math.sin(t * 0.13) * 0.6, cz + Math.sin(a) * 20, cx + Math.cos(a + 2.4) * 8, 4.5, cz + Math.sin(a + 2.4) * 6];
  },
  menuZombies: { n: 6, x: [2, 10], z: [30, 60], axis: 'z', bounds: [20, 70] },
  decor() { citeDecor(); },
  ambience(S, dt) {
    S._amb = (S._amb || 6) - dt; if (S._amb > 0) return; S._amb = 7 + Math.random() * 12;
    const r = Math.random(); if (r < 0.3) S.siren?.(); else if (r < 0.6) S.howl(); else if (r < 0.8) S.artillery();
  },
  hooks: {
    reset() { citeReset(); },
    host(dt) { citeHost(dt); },
    visuals(dt) { citeVisuals(dt); },
    apply(type, d) { return citeApply(type, d); },
    interact(pid, kind, id) { if (kind === 'cradio') { citeRadioOn(pid); return true; } if (kind !== 'shot') return false; citeShot(pid, id); return true; },
    candidates(cand, px, pz) { citeMissionCandidates(cand, px, pz); },
    mission() { return citeMission(); },
    spawnFactor() { return CITE_STATE.ms === 2 ? 0.45 : 1; },
    state() { return { l: CITE_STATE.landed.map(([k, p]) => [k, p]), h: CITE_STATE.heads.map((b) => (b ? 1 : 0)).join(''), p: CITE_STATE.pop, ms: CITE_STATE.ms, at: +CITE_STATE.alertT.toFixed(0) }; },
    reconcile(s) { citeReconcile(s); },
    pingLabels(near) { for (const m of WORLD.citeHeads || []) if (!m.shot) near(m.pos.x, m.pos.z, 'MANNEQUIN'); },
    objective() { return CITE_STATE.ms >= 3 ? 1 : 0; },
  },
};

/* ─── Règles : atouts parachutés, mannequins, population ─── */
function citeReset() {
  Object.assign(CITE_STATE, { landed: [], heads: (WORLD.citeHeads || []).map(() => false), pop: 1954, lastPop: -1, dropT: 0, dropRound: 0, anims: [], ms: 0, alertT: 0, sirenT: 0 });
  for (const p of WORLD.perks) citeHidePerk(p);
  for (const m of WORLD.citeHeads || []) { m.shot = false; m.head.visible = true; m.col.off = false; }
}
function citeHidePerk(p) { decalsOffObj(p.group); p.group.visible = false; p.group.position.y = 0; p.pos.set(0, -100, 0); if (p.col) p.col.off = true; p.landed = false; }
// Place une machine sur un emplacement (avec ou sans chute).
function citeLandPerk(key, padIdx, animate) {
  const p = WORLD.perks.find((q) => q.key === key), pad = CITE_PADS[padIdx]; if (!p || !pad || p.landed) return;
  p.landed = true; if (!CITE_STATE.landed.some(([k]) => k === key)) CITE_STATE.landed.push([key, padIdx]);
  const face = [Math.sin(pad.yaw), Math.cos(pad.yaw)];
  p.group.position.set(pad.x, animate ? 48 : 0, pad.z); p.group.rotation.y = pad.yaw; p.group.visible = true;
  p.pos.set(pad.x, 1, pad.z); p.face = face;
  if (p.col) { const c = Math.abs(Math.cos(pad.yaw)), s = Math.abs(Math.sin(pad.yaw)), hw = (0.92 * c + 0.66 * s) / 2, hd = (0.92 * s + 0.66 * c) / 2; Object.assign(p.col, { x0: pad.x - hw, x1: pad.x + hw, z0: pad.z - hd, z1: pad.z + hd, off: !!animate }); }
  if (animate) { CITE_STATE.anims.push({ p, t: 0 }); Sfx.shellWhistle?.(_v1.set(pad.x, 0, pad.z), 1.2); }
}
function citeHost(dt) {
  citeMissionHost(dt);
  // Une machine d'atout par manche, de la 1re à la 5e (Second Souffle d'abord).
  if (G.round >= 1 && CITE_STATE.dropRound < G.round && CITE_STATE.landed.length < WORLD.perks.length) {
    CITE_STATE.dropT += dt;
    if (CITE_STATE.dropT > (G.round === 1 ? 6 : 4)) {
      CITE_STATE.dropT = 0; CITE_STATE.dropRound = G.round;
      const left = WORLD.perks.filter((p) => !p.landed).map((p) => p.key), key = left.includes('revive') ? 'revive' : pick(left);
      const used = new Set(CITE_STATE.landed.map(([, i]) => i)), free = CITE_PADS.map((_, i) => i).filter((i) => !used.has(i));
      // Emplacement libre, de préférence dans une zone déjà ouverte.
      const open = free.filter((i) => { const pd = CITE_PADS[i], t = ti(tileOf(pd.x), tileOf(pd.z)); return MAP.zoneActive[MAP.zone[t]]; });
      G.emit('pdrop', { k: key, p: pick(open.length ? open : free) });
    }
  }
}
function citeApply(type, d) {
  if (type === 'pdrop') { citeLandPerk(d.k, d.p, true); UI.message('RAVITAILLEMENT AÉRIEN', `${PERKS[d.k].name} vient de tomber du ciel.`); return true; }
  if (type === 'mhead') {
    const m = (WORLD.citeHeads || [])[d.i]; if (!m || m.shot) return true;
    m.shot = true; CITE_STATE.heads[d.i] = true; m.head.visible = false; m.col.off = true; decalsOff(m.col.x0, m.col.z0, m.col.x1, m.col.z1);
    const hp = m.pos; fxSparks(_v1.set(hp.x, hp.y, hp.z), 8); for (let i = 0; i < 10; i++) FX.soft.spawn(hp.x, hp.y, hp.z, rand(-1, 1), rand(0.5, 2), rand(-1, 1), 0.8, 0.06, 0.9, 0.85, 0.8, 0.8, 9, 0.8);
    Sfx.sparkle(hp);
    const n = CITE_STATE.heads.filter(Boolean).length;
    UI.message(n < CITE_STATE.heads.length ? `MANNEQUIN ${n} / ${CITE_STATE.heads.length}` : 'LES MANNEQUINS SE TAISENT', n < CITE_STATE.heads.length ? '' : 'Quelque chose attend à la station-service.');
    return true;
  }
  if (type === 'cms') { citeMissionApply(d); return true; }
  if (type === 'mreward') {
    Sfx.jingle([0, 4, 7, 12, 16, 19, 24], 392, 'triangle', 0.1);
    return true;
  }
  return false;
}
// Tir sur une tête de mannequin marquée (validé par l'hôte).
function citeShot(pid, tag) {
  const m = /^mh:(\d+)$/.exec(String(tag)); if (!m) return;
  const i = +m[1], h = (WORLD.citeHeads || [])[i]; if (!h || h.shot) return;
  G.emit('mhead', { i }); G.addPoints(pid, 100, true);
  if (CITE_STATE.heads.every(Boolean)) { G.emit('mreward', {}); const s = WORLD.boxSpots[4] || WORLD.boxSpots[0]; G.spawnDrop(pick(['double', 'instakill']), s.pos, true); G.spawnDrop('maxammo', _v1.set(s.pos.x + 1.2, 0, s.pos.z), true); }
}
function citeReconcile(s) {
  if (!s) return;
  if (Array.isArray(s.l)) for (const [k, p] of s.l) if (!WORLD.perks.find((q) => q.key === k)?.landed) citeLandPerk(k, p, false);
  if (typeof s.h === 'string') s.h.split('').forEach((c, i) => { if (c === '1' && !CITE_STATE.heads[i]) citeApply('mhead', { i }); });
  if (typeof s.p === 'number') CITE_STATE.pop = s.p;
  if (typeof s.ms === 'number' && s.ms !== CITE_STATE.ms) citeMissionApply({ ms: s.ms, at: s.at }, true); else if (typeof s.at === 'number' && Math.abs(s.at - CITE_STATE.alertT) > 2) CITE_STATE.alertT = s.at;
}
function citeVisuals(dt) {
  // Chute des machines.
  for (let i = CITE_STATE.anims.length - 1; i >= 0; i--) {
    const a = CITE_STATE.anims[i]; a.t += dt; const k = Math.min(1, a.t / 1.25), g = a.p.group;
    g.position.y = 48 * (1 - k * k); if (Math.random() < dt * 30) FX.glow.spawn(g.position.x + rand(-0.3, 0.3), g.position.y + 2.2, g.position.z + rand(-0.3, 0.3), 0, 1.5, 0, 0.6, 0.12, 1, 0.7, 0.3, 1, 0, 0.5);
    if (k >= 1) {
      CITE_STATE.anims.splice(i, 1); g.position.y = 0; if (a.p.col) a.p.col.off = false;
      fxSnowBurst(_v1.set(g.position.x, 0.2, g.position.z), 60); fxSparks(_v1.set(g.position.x, 0.4, g.position.z), 14); Sfx.explosion(g.position, 0.6);
      const d = g.position.distanceTo(P.pos); FX.shake = Math.max(FX.shake, clamp(1 - d / 30, 0, 0.7));
      // Joueur écrasé ? On l'écarte simplement.
      if (d < 1.2) { P.pos.x += (P.pos.x - g.position.x || 1) * 0.8; P.pos.z += (P.pos.z - g.position.z) * 0.8; }
    }
  }
  // Panneau « POPULATION » : décompte des morts de la partie.
  let kills = 0; for (const [, r] of G.players) kills += r.kills || 0;
  const pop = Math.max(0, 1954 - kills);
  CITE_STATE.pop = pop;
  if (pop !== CITE_STATE.lastPop && WORLD.popSign && (G.time - (WORLD.popSign.t || 0) > 0.4 || G.mode === 'menu')) {
    CITE_STATE.lastPop = pop; WORLD.popSign.t = G.time; drawPopSign(pop);
  }
  if (WORLD.cloud) { WORLD.cloud.uniforms.uTime.value += dt; }
  citeMissionVisuals(dt);
}
function drawPopSign(n) {
  const c = WORLD.popSign.canvas, x = c.getContext('2d'), w = c.width, h = c.height;
  x.fillStyle = '#f1e6c8'; x.fillRect(0, 0, w, h);
  x.strokeStyle = '#7a2a22'; x.lineWidth = 10; x.strokeRect(8, 8, w - 16, h - 16);
  x.fillStyle = '#7a2a22'; x.textAlign = 'center'; x.textBaseline = 'middle';
  x.font = font(64); x.fillText('CITÉ ATOMIQUE', w / 2, h * 0.24);
  x.font = font(34, 700); x.fillStyle = '#2b2a28'; x.fillText('POPULATION', w / 2, h * 0.5);
  x.font = font(96); x.fillStyle = n < 1000 ? '#b3261e' : '#1f3b52'; x.fillText(String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' '), w / 2, h * 0.76);
  WORLD.popSign.tex.needsUpdate = true;
}

/* ─── Mission « Alerte atomique » : mannequins → radio d'urgence → tenir 60 s ─── */
const CITE_ALERT = 60;
function citeMissionHost(dt) {
  const S = CITE_STATE;
  if (S.ms === 0 && S.heads.length && S.heads.every(Boolean)) G.emit('cms', { ms: 1 });
  if (S.ms === 2) {
    S.alertT -= dt; G.toSpawn = Math.max(G.toSpawn, 6 + G.players.size * 2); if (G.breakT > 0) G.breakT = Math.max(G.breakT, 2);
    if (S.alertT <= 0) { G.emit('cms', { ms: 3 }); for (const [pid] of G.players) G.addPoints(pid, 3000, false); const s = WORLD.boxSpots[0]; G.spawnDrop('maxammo', s.pos, true); }
    else { S.syncT = (S.syncT || 0) - dt; if (S.syncT <= 0) { S.syncT = 1; G.netEvent('cms', { ms: 2, at: +S.alertT.toFixed(0) }); } }
  }
}
function citeRadioOn(pid) { if (CITE_STATE.ms !== 1 || !G.power) return G.tell(pid, 'deny'); G.emit('cms', { ms: 2, at: CITE_ALERT }); }
function citeMissionApply(d, quiet) {
  const S = CITE_STATE, prev = S.ms; S.ms = d.ms; if (d.at !== undefined) S.alertT = d.at; else if (d.ms === 2 && prev !== 2) S.alertT = CITE_ALERT;
  if (quiet || prev === S.ms) return;
  if (S.ms === 1) { UI.message('LES MANNEQUINS SE TAISENT', "La radio d'urgence de l'abri s'allume…"); Sfx.radio?.(WORLD.citeRadio?.pos || P.pos, 0.8); }
  if (S.ms === 2) { UI.message('ALERTE ATOMIQUE', 'Survivez 60 secondes !'); Sfx.siren?.(); R.flash = Math.max(R.flash || 0, 1.2); }
  if (S.ms === 3) { UI.banner?.('ALERTE LEVÉE', '+3000 points · la Cité tient encore'); Sfx.jingle([0, 4, 7, 12, 16, 19, 24], 392, 'triangle', 0.14); }
  UI.objective();
}
function citeMissionVisuals(dt) {
  const S = CITE_STATE, r = WORLD.citeRadio; if (r) r.lamp.color.set(S.ms === 1 && G.power ? (Math.sin(G.time * 6) > 0 ? 0xff3020 : 0x401010) : S.ms >= 2 ? 0x30ff50 : 0x401010);
  if (S.ms === 2) {
    if (!G.authority) S.alertT = Math.max(0, S.alertT - dt);
    S.sirenT -= dt; if (S.sirenT <= 0) { S.sirenT = 7; Sfx.siren?.(); }
    if (Math.random() < dt * 0.25) { R.flash = Math.max(R.flash || 0, 0.6); Sfx.thunder?.(rand(0.2, 1.2)); }
    const L = R.lights; if (L.shelter) L.shelter.intensity = (Math.sin(G.time * 8) > 0 ? 16 : 3);
  }
}
function citeMissionCandidates(cand, px, pz) {
  const r = WORLD.citeRadio; if (!r || CITE_STATE.ms !== 1) return;
  const d = Math.hypot(px - r.pos.x, pz - r.pos.z);
  if (!G.power) cand(d, { kind: 'info', text: "Radio d'urgence — il faut du courant", range: 1.8, deny: true });
  else cand(d, { kind: 'cradio', text: "Maintenir pour lancer l'alerte par radio", range: 1.8, hold: true, holdTime: 3 });
}
function citeMission() {
  const S = CITE_STATE, n = S.heads.filter(Boolean).length;
  if (S.ms === 0) return { title: 'ALERTE ATOMIQUE', line: `Abattre les mannequins au foulard rouge (${n}/${S.heads.length || 6})`, sub: 'Visez la tête · maisons, jardins, abri, station-service' };
  const r = WORLD.citeRadio;
  if (S.ms === 1) return { title: 'ALERTE ATOMIQUE', line: "Lancer l'alerte avec la radio d'urgence", sub: G.power ? 'Abri antiatomique · maintenir E' : "Abri antiatomique · il faut d'abord du courant", at: r && G.power ? [r.pos.x, 1.4, r.pos.z] : null };
  if (S.ms === 2) return { title: 'ALERTE ATOMIQUE', line: `Survivre à l'alerte — ${Math.max(0, Math.ceil(S.alertT))} s`, bar: 1 - S.alertT / CITE_ALERT };
  return null;
}
