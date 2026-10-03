/* ═══════════════════ CARTE : LE FILON MAUDIT ═══════════════════
   Une ville minière du Far West engloutie par un effondrement, au fond d'une caverne éclairée par des lanternes
   et par la lune qui passe par le trou du plafond. Galerie de mine, grand-rue, saloon, magasin général,
   banque, prison du shérif, église.
   Particularités : le Colosse, un géant enfermé dans la prison, devient votre allié pour un temps si vous lui
   apportez des bonbons ; la banque garde vos points d'une partie à l'autre. */

const FIL = (() => { const OX = 4, OZ = 4, X = (lx) => (lx + OX) * TILE; return { OX, OZ, X, T: (lx, lz) => [lx + OX, lz + OZ] }; })();
const FIL_STATE = { giant: null, candy: {}, ally: null, allyT: 0, freed: false, ms: 0, rubble: [0, 0, 0], gold: [0, 0, 0], fed: false };

MAPS.filon = {
  id: 'filon', name: 'FILON MAUDIT', sub: 'Ville minière engloutie, 1880',
  objName: 'Le trésor du Filon',
  powerParts: [{ name: 'COURROIE DE CUIR', kind: 'belt', zones: [2, 3] }, { name: 'BIDON DE PÉTROLE', kind: 'fuel', zones: [5] }, { name: 'BOBINE DE CUIVRE', kind: 'coil', zones: [6] }],
  intro: ['FILON MAUDIT', 'Ville minière engloutie, 182 m sous terre', '2 juin 1880 — heure inconnue'],
  desc: "Une ville du Far West avalée par la terre. Un saloon, une banque, une église… et un géant enfermé chez le shérif qui adore les bonbons.",
  card: ['#2a1a10', '#b07a3e'],
  info: { eyebrow: 'SOUS LA MONTAGNE · NUIT SANS FIN', tagline: "L'or est resté au fond. Les mineurs aussi.", stat: ['PROFONDEUR', '182 m'] },
  loading: 'ALLUMAGE DES LANTERNES…',
  art(x, w, h) {
    const g = x.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#0d0906'); g.addColorStop(0.6, '#2a1a0e'); g.addColorStop(1, '#120c08'); x.fillStyle = g; x.fillRect(0, 0, w, h);
    x.fillStyle = 'rgba(170,200,255,.18)'; x.beginPath(); x.moveTo(w * 0.52, 0); x.lineTo(w * 0.62, 0); x.lineTo(w * 0.8, h * 0.8); x.lineTo(w * 0.42, h * 0.8); x.fill();
    for (let i = 0; i < 9; i++) { x.fillStyle = '#1a120b'; x.beginPath(); const cx = (i / 8) * w; x.moveTo(cx - 14, 0); x.lineTo(cx, 30 + (i % 3) * 18); x.lineTo(cx + 14, 0); x.fill(); }
    for (const [cx, cw, ch, col] of [[w * 0.2, 90, 70, '#5a3a22'], [w * 0.48, 70, 58, '#6a4a2a'], [w * 0.74, 96, 76, '#4a3020']]) { x.fillStyle = col; x.fillRect(cx - cw / 2, h * 0.8 - ch, cw, ch); x.fillRect(cx - cw / 2 - 6, h * 0.8 - ch - 16, cw + 12, 18); x.fillStyle = '#ffc070'; x.fillRect(cx - 20, h * 0.8 - ch + 18, 12, 16); x.fillRect(cx + 8, h * 0.8 - ch + 18, 12, 16); }
    x.fillStyle = '#ffb050'; for (const cx of [w * 0.1, w * 0.36, w * 0.62, w * 0.9]) { x.beginPath(); x.arc(cx, h * 0.62, 5, 0, TAU); x.fill(); }
    x.fillStyle = '#0e0a07'; x.fillRect(0, h * 0.8, w, h * 0.2);
  },
  w: 56, d: 44, flat: true, ceil: 3.4, wallH: 6.5,
  zones: ['La galerie', 'La grand-rue', 'Le saloon', 'Le magasin général', 'La banque', 'La prison du shérif', "L'église"],
  styles: ['mine', 'street', 'walk', 'saloon', 'store', 'bank', 'jail', 'church', 'rock'],
  styleDefs: [
    { floor: ['dirt', 0x9a8a78], ceil: ['rock', 0x7a6a5a], roof: ['rock', 0x6a5a4a], noSlab: true }, { floor: ['dirt', 0xb09a80] }, { floor: ['planks', 0x9a7a58], ceil: ['planks', 0x7a5a3a], roof: ['westPlank', 0x8a6a4a] },
    { floor: ['parquet', 0xb08a60], ceil: ['planks', 0x6a4a2e] }, { floor: ['planks', 0xa08060], ceil: ['planks', 0x7a5a3a] }, { floor: ['checker', 0xd8d0c0], ceil: ['plaster', 0xd8ccb0] },
    { floor: ['planks', 0x8a7a6a], ceil: ['planks', 0x6a5a4a] }, { floor: ['parquet', 0x9a7a5a], ceil: ['planks', 0x8a6a4a], ceilH: 5.0 },
    { block: ['rock', 0x9a8470], blockTop: ['rock', 0x7a6a58], rough: 0.55 },
  ],
  roofTex: ['westPlank', 0x7a5a3a], ceilTex: ['planks', 0x6a4a2e], wallMat: 'wood', baseboard: ['planks', 0x3a2618],
  decals: { grime: 0.6, splash: 0.5, under: 0.3, crack: 0.1, stain: 0.12, mold: 0.08, scuff: 0.15, blood: 0.05,
    floor: { street: [['dirt', 0.3, 1.8]], walk: [['scuff', 0.15, 1]], saloon: [['stain', 0.2, 1], ['scuff', 0.15, 1]], mine: [['dirt', 0.3, 1.6]], store: [['dirt', 0.12, 1]], jail: [['dirt', 0.2, 1], ['blood', 0.08, 1]] } },
  scatter: [{ kind: 'straw', styles: ['street'], n: 2, color: 0xc8a868 }, { kind: 'pebble', styles: ['street', 'mine'], n: 3, color: 0x7a6a58 }, { kind: 'clod', styles: ['street', 'mine'], n: 1, color: 0x6a5a48 }, { kind: 'rock', ground: [0.5, 6], n: 0.25, color: 0x6a5a4a, shadow: true }, { kind: 'paper', styles: ['street', 'walk'], n: 0.15, color: 0xd8c8a0 }],
  details: { fascia: ['planks', 0x5a3e28], plinth: ['stone', 0x6e665c], crown: ['planks', 0x4a3220], wainscot: ['planks', 0x6a4a30] },
  blockH: () => 6.5, blockMat: () => 'earth',
  walls: [
    { key: 'plank', h: 4.2, out: ['westPlank', 0xb08a60], in: ['westPlank', 0x9a7a58], mat: 'wood' },
    { key: 'plankWin', look: 'window', h: 4.2, out: ['westPlank', 0xb08a60], in: ['westPlank', 0x9a7a58], trim: ['planks', 0x5a3a22], lit: 0xffb060, shutter: 0x5a3e28, mat: 'wood' },
    { key: 'red', h: 4.2, out: ['westPlank', 0xb85a42], in: ['wallpaper', 0xb89a7a], mat: 'wood' },
    { key: 'redWin', look: 'window', h: 4.2, out: ['westPlank', 0xb85a42], in: ['wallpaper', 0xb89a7a], trim: ['planks', 0xe8d8b0], lit: 0xffb060, shutter: 0x3a2a1a, mat: 'wood' },
    { key: 'brick', h: 4.6, out: ['brick', 0xd8b8a0], in: ['plaster', 0xd8ccb0], mat: 'concrete' },
    { key: 'brickWin', look: 'window', h: 4.6, out: ['brick', 0xd8b8a0], in: ['plaster', 0xd8ccb0], trim: ['planks', 0x3a2a1a], lit: 0xffc27a, bars: true, mat: 'concrete' },
    { key: 'white', h: 5.0, out: ['westPlank', 0xe8e0cc], in: ['plaster', 0xe0d4bc], mat: 'wood' },
    { key: 'whiteWin', look: 'window', h: 5.0, out: ['westPlank', 0xe8e0cc], in: ['plaster', 0xe0d4bc], trim: ['planks', 0x3a2a1a], lit: 0xff9a50, stained: true, mat: 'wood' },
    { key: 'inner', h: 3.4, out: ['westPlank', 0x8a6a4a], in: ['westPlank', 0x8a6a4a], mat: 'wood' },
    { key: 'bars', look: 'bars', h: 3.4, see: true, mat: 'metal' },
    { key: 'rail', look: 'rail', h: 1.1, see: true, mat: 'wood' },
  ],
  boundary(x, z) {
    const st = this.styles[MAP.style[ti(x, z)]], w = (x * 5 + z * 3) % 3 === 0;
    if (st === 'saloon') return w ? 'redWin' : 'red'; if (st === 'bank') return w ? 'brickWin' : 'brick'; if (st === 'church') return w ? 'whiteWin' : 'white';
    if (st === 'store' || st === 'jail') return w ? 'plankWin' : 'plank';
    return 'rail';
  },
  grid(A) {
    const { OX: ox, OZ: oz } = FIL;
    const F = (a, b, c, d, zone, st, roof) => A.floor(a + ox, b + oz, c + ox, d + oz, zone, st, roof);
    const B = (a, b, c, d) => A.block(a + ox, b + oz, c + ox, d + oz, 'rock');
    const H = (z, a, b, k) => A.hwall(z + oz, a + ox, b + ox, k), V = (x, a, b, k) => A.vwall(x + ox, a + oz, b + oz, k);
    const D = (x, z, c, k, l) => A.door(x + ox, z + oz, c, k, l), Rp = (x, z, look, inw) => A.ramp(x + ox, z + oz, look, inw);
    // ── Zone 0 : galerie de mine (départ), taillée dans le roc.
    F(37, 18, 46, 21, 0, 'mine', 1); B(37, 17, 47, 17); B(37, 22, 47, 22); B(47, 18, 47, 21);
    // ── Zone 1 : grand-rue (terre battue) et trottoirs de planches couverts.
    F(6, 18, 35, 21, 1, 'street'); F(6, 17, 35, 17, 1, 'walk', 1); F(6, 22, 35, 22, 1, 'walk', 1);
    B(5, 16, 5, 23); B(36, 16, 36, 17); B(36, 22, 36, 23); B(36, 18, 36, 21); // éboulis aux deux bouts
    // ── Bâtiments au nord : saloon, magasin général, banque. Au sud : prison, église.
    F(7, 9, 16, 16, 2, 'saloon', 1); F(18, 10, 24, 16, 3, 'store', 1); F(26, 10, 33, 16, 4, 'bank', 1);
    F(7, 23, 13, 29, 5, 'jail', 1); F(22, 23, 32, 33, 6, 'church', 1);
    // Façades côté rue (avec entrée en retrait) et cloisons intérieures.
    H(17, 7, 10, 'red'); H(17, 12, 16, 'red'); H(17, 9, 9, 'redWin'); H(17, 13, 13, 'redWin'); H(17, 15, 15, 'redWin');
    V(11, 16, 16, 'red'); V(12, 16, 16, 'red');
    H(17, 18, 20, 'plankWin'); H(17, 22, 24, 'plankWin'); V(21, 16, 16, 'plank'); V(22, 16, 16, 'plank');
    H(17, 26, 28, 'brickWin'); H(17, 30, 33, 'brickWin'); H(17, 27, 27, 'brick'); H(17, 31, 31, 'brick'); V(29, 16, 16, 'brick'); V(30, 16, 16, 'brick');
    H(23, 7, 9, 'plankWin'); H(23, 11, 13, 'plankWin'); V(10, 23, 23, 'plank'); V(11, 23, 23, 'plank');
    H(23, 22, 26, 'whiteWin'); H(23, 28, 32, 'whiteWin'); H(23, 24, 24, 'white'); H(23, 30, 30, 'white'); V(27, 23, 23, 'white'); V(28, 23, 23, 'white');
    // Saloon : scène au fond. Banque : chambre forte. Prison : cellules (le Colosse dort dans la grande).
    H(12, 7, 9, 'inner'); H(12, 11, 16, 'inner');
    H(13, 30, 30, 'brick'); H(13, 32, 33, 'brick'); V(30, 10, 12, 'brick'); V(31, 13, 13, 'brick'); V(32, 13, 13, 'brick');
    H(27, 7, 7, 'bars'); V(8, 27, 27, 'bars'); H(27, 10, 13, 'bars'); V(9, 27, 29, 'inner'); V(10, 27, 29, 'inner');
    // Passages : effondrement vers la rue, portes des bâtiments.
    D(36, 19, 750, 'rubble', 'La grand-rue');
    D(11, 16, 1000, 'wood', 'Le saloon'); D(21, 16, 750, 'wood', 'Le magasin général'); D(29, 16, 1250, 'wood', 'La banque');
    D(10, 23, 1000, 'wood', 'La prison du shérif'); D(27, 23, 1250, 'wood', "L'église");
    D(31, 13, 1000, 'steel', 'La chambre forte');
    FIL_STATE.cageDoor = D(8, 27, 1000, 'bars', 'Libérer le Colosse');
    for (const d of MAP.doors) if (d.kind === 'wood') d.color = 0x6a3e22;
    // Barricades : brèches dans le roc (galerie, éboulis), ruelles, fenêtres.
    for (const [x, z] of [[41, 17], [44, 22], [47, 19], [5, 18], [5, 21]]) Rp(x, z, 'gap', x === 41 ? 's' : x === 44 ? 'n' : x === 47 ? 'w' : 'e');
    for (const [x, z, w] of [[17, 16, 's'], [25, 16, 's'], [16, 23, 'n'], [19, 23, 'n'], [34, 16, 's'], [34, 23, 'n']]) Rp(x, z, 'fence', w);
    for (const [x, z] of [[6, 11], [6, 14], [10, 8], [14, 8], [21, 9], [28, 9], [34, 14], [6, 26], [14, 26], [33, 28], [27, 34], [21, 30]]) Rp(x, z, 'window');
  },
  spots: (() => {
    const T = FIL.T, xz = ([x, z]) => ({ x, z });
    return {
      start: T(42, 19), startYaw: Math.PI / 2,
      coopStarts: [T(42, 19), T(42, 20), T(44, 19), T(44, 20)],
      wallBuys: [
        { weapon: 'bolt', ...xz(T(20, 17)), wall: 'n' }, { weapon: 'shotgun', ...xz(T(7, 13)), wall: 'w' },
        { weapon: 'smg', ...xz(T(39, 18)), wall: 'n' }, { weapon: 'carbine', ...xz(T(22, 28)), wall: 'w' }, { weapon: 'revolver', ...xz(T(13, 25)), wall: 'e' },
      ],
      perks: [
        { perk: 'revive', ...xz(T(46, 20)), wall: 'e' }, { perk: 'armor', ...xz(T(16, 14)), wall: 'e' }, { perk: 'sprint', ...xz(T(24, 12)), wall: 'e' },
        { perk: 'reload', ...xz(T(26, 15)), wall: 'w' }, { perk: 'rof', ...xz(T(7, 24)), wall: 'w' },
        { perk: 'mule', ...xz(T(7, 10)), wall: 'w' }, { perk: 'cherry', ...xz(T(32, 25)), wall: 'e' },
      ],
      power: { ...xz(T(33, 11)), wall: 'e' },
      generator: { x: FIL.X(31) + 1, z: FIL.X(10) + 1, ry: 0 },
      box: [{ ...xz(T(12, 9)), wall: 'n' }, { ...xz(T(18, 11)), wall: 'w' }, { ...xz(T(32, 32)), wall: 'e' }, { ...xz(T(45, 21)), wall: 's' }, { ...xz(T(26, 12)), wall: 'w' }],
      bench: { ...xz(T(27, 32)), wall: 's' },
      candy: { ...xz(T(18, 14)), wall: 'w' },
      bank: { ...xz(T(28, 14)), wall: 'n' },
      cage: T(8, 28), giantIdle: T(20, 19),
    };
  })(),
  env: {
    fog: 0x33261b, fogDensity: 0.019, stormFog: 0.03, exposure: 1.65,
    sky: { zen: [0.01, 0.015, 0.035], disk: [5, 5.2, 5.6], diskSize: 0.9994, halo: [0.3, 0.38, 0.55], cloudA: [0.03, 0.035, 0.05], cloudB: [0.12, 0.14, 0.2], stars: 1.4, ridge: 0, glow: [0, 0, 0], cover: 0.4, flash: [1, 0.8, 0.6] },
    sunDir: [0.18, 0.95, 0.24], sunColor: 0xa8c0f0, sunI: 2.2, hemi: [0xb89066, 0x3a2a1a], bounce: 0x7a5a40, hemiOut: 1.25, hemiIn: 1.05, envOut: 0.75, envIn: 0.62,
    envMap: { low: [0.08, 0.06, 0.04], mid: [0.26, 0.18, 0.11], high: [0.1, 0.08, 0.06], glowDir: [0, 1, 0], glow: [0.2, 0.25, 0.35] },
    precip: 'dust', snow: 0, tint: [1.06, 1.0, 0.9], frost: false, flares: false, wind: 0.15,
    storm: { title: 'ÉBOULEMENT', sub: 'La caverne tremble. Ils courent.' },
    burst: [0.45, 0.36, 0.26], sounds: ['rumble'],
  },
  ground: { tex: ['dirt', 0x8a7a68], c0: [0.9, 0.86, 0.8], c1: [0.6, 0.54, 0.48], pad: 40 },
  surfH(x, z) { const e = edgeAt(x, z), m = smooth(clamp((e - 4) / 6, 0, 1)); return m <= 0 ? 0 : ((fbm(x * 0.06, z * 0.06, 3) - 0.3) * 5) * m; },
  groundMat: 'earth', floorMat: () => 'wood', ceilMat: 'wood',
  stepSurface(st) { const s = this.styles[st]; return s === 'street' || s === 'mine' ? 'snow' : s === 'bank' ? 'concrete' : 'wood'; },
  lights(pl) {
    const X = FIL.X;
    pl('lanternW', 0xffa040, 42, 22, X(12), 3.0, X(19) + 1); pl('lanternE', 0xffa040, 42, 22, X(28), 3.0, X(20) + 1);
    pl('saloon', 0xffb060, 34, 18, X(11) + 1, 2.9, X(12)); pl('church', 0xffa860, 34, 20, X(27) + 1, 4.2, X(27)); pl('church2', 0xffb070, 22, 12, X(27) + 1, 2.6, X(32));
    pl('mine', 0xffa040, 36, 18, X(43), 2.6, X(19) + 1); pl('mine2', 0xffa040, 30, 16, X(38), 2.6, X(20)); pl('bank', 0xffd090, 14, 14, X(29), 3.0, X(12));
    if (settings.quality >= 1) pl('jail', 0xffa050, 14, 13, X(10), 2.9, X(25));
  },
  onPower(on) {
    const L = R.lights; L.bank.intensity = L.bank.userData.base = on ? 26 : 14;
    if (WORLD.bulbs) for (const b of WORLD.bulbs) b.material.opacity = on ? 0.8 : 0.1;
  },
  menu(t) { const a = t * 0.04, cx = FIL.X(22), cz = FIL.X(19); return [cx + Math.cos(a) * 18, 7 + Math.sin(t * 0.12) * 0.8, cz + Math.sin(a) * 11, cx - Math.cos(a) * 6, 3, cz - Math.sin(a) * 4]; },
  menuZombies: { n: 3, x: [16, 60], z: [42, 43], bounds: [16, 64] },
  decor() { filDecor(); },
  ambience(S, dt) {
    S._amb = (S._amb || 3) - dt; if (S._amb > 0) return; S._amb = 1.5 + Math.random() * 5;
    const r = Math.random(); if (r < 0.55) S.drip(_v1.set(P.pos.x + rand(-8, 8), 6, P.pos.z + rand(-8, 8))); else if (r < 0.7) S.howl(); else if (r < 0.8) S.artillery();
  },
  hooks: {
    reset() { filReset(); },
    host(dt) { filHost(dt); },
    visuals(dt) { filVisuals(dt); },
    apply(type, d) { return filApply(type, d); },
    interact(pid, kind, id) { return filInteract(pid, kind, id); },
    candidates(cand, px, pz) { filCandidates(cand, px, pz); },
    state() { return { f: FIL_STATE.freed ? 1 : 0, a: FIL_STATE.ally, t: +FIL_STATE.allyT.toFixed(0), c: Object.keys(FIL_STATE.candy).filter((k) => FIL_STATE.candy[k]), ms: FIL_STATE.ms, rb: FIL_STATE.rubble.join(''), gp: FIL_STATE.gold.join('') }; },
    mission() { return filMission(); },
    reconcile(s) { filReconcile(s); },
    fast() { const g = FIL_STATE.giant; return g ? [+g.pos.x.toFixed(2), +g.pos.z.toFixed(2), +g.yaw.toFixed(2), g.state === 'slam' ? 1 : 0] : undefined; },
    fastApply(a) { filFastApply(a); },
    objective() { return FIL_STATE.ms >= 4 ? 1 : 0; },
    pingLabels(near) { const g = FIL_STATE.giant; if (g) near(g.pos.x, g.pos.z, 'LE COLOSSE'); const c = WORLD.candyShop; if (c) near(c.pos.x, c.pos.z, 'BONBONS'); const b = WORLD.bankDesk; if (b) near(b.pos.x, b.pos.z, 'BANQUE'); },
  },
};
