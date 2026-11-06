/* ═══════════════════ POSTE 7 : LA SAPE — CATHÉDRALE DE CRAIE, PUITS DE LUMIÈRE ═══════════════════
   Inspiré des carrières de craie de 1914-1918 : la carrière Wellington d'Arras (creusée par les tunneliers néo-zélandais,
   noms et dessins gravés dans la roche) et les carrières de Confrécourt (chapelle, autel et statues taillés par les
   soldats). La galerie boisée descend du boyau de la tranchée de soutien et débouche dans une carrière : à l'ouest, le
   chœur et la chapelle de sainte Barbe (patronne des sapeurs et des mineurs), avec ses cierges et la liste des morts
   gravée ; un grand escalier ; la nef sous une voûte de 5 m, quatre piliers tournés autour de la croisée où tombent la
   lune et la neige par un puits d'aération ; le mur d'ammonal au nord ; la voie du wagonnet à l'est. En surface, le puits
   débouche au sommet d'un terril de craie coiffé d'un treuil. Sol et voûte : p7Floor, p7Vault (20_map_poste7.js).
   Jeu (camouflet, wagonnet) : 20d_poste7_jeux.js. */

const SAPE = {
  pillars: [[40, 72], [40, 78], [44, 72], [44, 78]], // aux coins des carreaux : les infectés passent par le milieu
  altar: [34.9, 71.6], // autel (contre la paroi ouest, face à la nef)
  cartEnd: 46.6, // heurtoir de la voie, dans la carrière
  lamps: [[40.3, 74.9], [46.2, 74.2], [42, 69.5], [45.5, 80.6]], // lampes pendues à la voûte de la nef (à 3 m des piliers)
  niches: [[38.6, 'n'], [36.2, 'n'], [35.6, 's'], [39.6, 's'], [43.2, 's'], [45.4, 's'], [70.6, 'e'], [78.8, 'e']], // bougies dans la paroi
};
let P7_SM = null;
// Lumière des lampes, des cierges et du puits cuite dans les sommets de la craie (attribut aGlow, ajouté comme lumière propre
// de la roche et multiplié par uGlowK, qui vacille avec les lampes) : des flaques de lumière chaude dans la carrière sans
// une lumière de plus dans la scène (chaque lumière coûte sur tous les objets de la carte).
const SAPE_GLOW = { k: { value: 1 }, lights: [] };
function sapeGlowMat(m) {
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uGlowK = SAPE_GLOW.k;
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute vec3 aGlow;\nvarying vec3 vGlow;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvGlow = aGlow;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform float uGlowK;\nvarying vec3 vGlow;').replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance += vGlow * diffuseColor.rgb * uGlowK;');
  };
  m.customProgramCacheKey = () => 'sapeglow';
  return m;
}
// Lampes de la carrière pour la lumière cuite : position, couleur, force, portée (m), décroissance.
function sapeLights() {
  const L = (SAPE_GLOW.lights = []), add = (x, y, z, c, k, R, f = 0.15) => L.push({ p: [x, y, z], c, k, R, f });
  const warm = [1, 0.6, 0.28], candle = [1, 0.52, 0.2], moon = [0.4, 0.52, 0.85];
  for (const [x, z] of SAPE.lamps) add(x, p7Vault(x, z) - 0.62, z, warm, 0.9, 9);
  add(49.5, roofAt(49.5, 73) - 0.4, 73, warm, 0.7, 5.5); // lampe de la galerie, vue par l'entrée
  add(SAPE.altar[0] + 0.3, floorAt(SAPE.altar[0], SAPE.altar[1]) + 1.45, SAPE.altar[1], candle, 0.75, 6.5, 0.3); // cierges de l'autel
  for (const n of SAPE.niches) { const q = sapeNiche(n); add(q.x + q.nx * 0.12, q.y + 0.12, q.z + q.nz * 0.12, candle, 0.28, 2.4, 1.1); }
  add(45.6, floorAt(45.6, 70.2) + 1.05, 70.2, warm, 0.4, 3.6, 0.6); // lampe à carbure du poste d'écoute
  add(46.2, floorAt(46.2, 79.6) + 0.95, 79.6, [1, 0.1, 0.04], 0.35, 2.8, 0.8); // voyant rouge de l'exploseur
  add(P7_SHAFT[0], floorAt(P7_SHAFT[0], P7_SHAFT[1]) + 0.7, P7_SHAFT[1], moon, 0.6, 6.5, 0.2); add(P7_SHAFT[0], 1.7, P7_SHAFT[1], moon, 0.5, 3.4, 0.4); // clair de lune du puits
}
// Bougie d'une niche : position sur la paroi (n, s : à z 68 ou 82 ; e : à x 48), normale vers la salle, rotation.
function sapeNiche([a, w]) {
  const x = w === 'e' ? 47.97 : a, z = w === 'n' ? 68.03 : w === 's' ? 81.97 : a, nx = w === 'e' ? -1 : 0, nz = w === 'n' ? 1 : w === 's' ? -1 : 0;
  return { x, z, nx, nz, ry: w === 'e' ? -Math.PI / 2 : w === 'n' ? 0 : Math.PI, y: floorAt(x + nx * 0.4, z + nz * 0.4) + 1.5 };
}
function sapeBake(geo) {
  const pa = geo.attributes.position, no = geo.attributes.normal, n = pa.count, a = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const x = pa.getX(i), y = pa.getY(i), z = pa.getZ(i), nx = no.getX(i), ny = no.getY(i), nz = no.getZ(i); let r = 0, g = 0, b = 0;
    for (const L of SAPE_GLOW.lights) {
      const dx = L.p[0] - x, dy = L.p[1] - y, dz = L.p[2] - z, d = Math.hypot(dx, dy, dz); if (d > L.R) continue;
      const de = Math.max(d, 0.9), lam = Math.max(0, (dx * nx + dy * ny + dz * nz) / (d || 1)) * 0.85 + 0.15, w = ((1 - d / L.R) ** 2 / (1 + de * de * L.f)) * L.k * lam; // (pas de point brûlé contre la lampe)
      r += L.c[0] * w; g += L.c[1] * w; b += L.c[2] * w;
    }
    a[i * 3] = r; a[i * 3 + 1] = g; a[i * 3 + 2] = b;
  }
  geo.setAttribute('aGlow', new THREE.BufferAttribute(a, 3)); return geo;
}
// Matières de la Sape : sous terre, pas de neige sur les objets.
function sapeMats() {
  return (P7_SM ||= {
    chalk: sapeGlowMat(fmat('craie', 0xd9d0be, { vc: true, rough: 0.93 })), // parois et piliers (ombre et lumière cuites)
    chalkV: sapeGlowMat(fmat('craieV', 0xd2c9b6, { vc: true, rough: 0.95 })), // voûte et sol
    chalkP: fmat('craie', 0xdcd4c4, { rough: 0.92 }), // pièces taillées : autel, statue
    steps: fmat('craieV', 0xe2dacb, { vc: true, rough: 0.9 }), // marches (ombre par face)
    wood: fmat('boisBrut', 0x9a8a72, { rough: 0.9 }), dark: fmat('boisBrut', 0x5a4c3c, { rough: 0.92 }),
    crate: stdMat({ map: TEX.crate.map, normalMap: TEX.crate.normalMap, roughness: 0.86 }),
    rope: fmat('jute', 0x8c7852, { rough: 1 }), canvas: fmat('toile', 0x857a5e, { rough: 0.95, side: THREE.DoubleSide }),
    tin: fmat('tole', 0x5f6852, { rough: 0.6, metal: 0.5 }), brass: MATS.brass, iron: MATS.iron,
    wax: stdMat({ color: 0xf0e6cc, roughness: 0.55, emissive: 0x3a2008, emissiveIntensity: 0.35 }),
    bag: fmat('jute', 0x8a7a5a, { rough: 1 }),
  });
}

function buildSape() {
  const SM = sapeMats(), gb = new GB(), gv = new GB(), flames = (WORLD.sapeFlames = []);
  WORLD.sapeLamps = [];
  sapeLights(); sapeGallery(SM);
  // Parois de la carrière (x 34 à 48, z 68 à 82) et du tunnel de la porte de la cave (x 32 à 34, z 76 à 78). Zones lisses :
  // inscriptions et gravures ; trous : niche de la statue.
  const fz = (a, y) => [a - 0.75, a + 0.75, y - 0.5, y + 0.55], F = (x, z) => p7Floor(x, z);
  const graf = [ // [paroi, position, hauteur au-dessus du sol, texte, largeur]
    ['n', 41.2, 1.55, 'ON LES AURA !', 1.3], ['n', 47.0, 1.25, 'CLASSE 17\nVIVE LA QUILLE', 1.1], ['s', 39.4, 1.6, 'Cpl LUCIEN\nGIRAUD\n3e Cie\n1916', 0.9],
    ['s', 41.6, 1.35, '♥ MARIE ♥\nR.L.', 0.8], ['s', 46.2, 1.5, 'NOËL 1916\nPensez à nous', 1.1], ['n', 38.3, 1.6, 'TUNNELIERS\nN.-Z. 1917', 1.0],
    ['e', 69.6, 1.35, 'GALERIE 7 →\nCHAMBRE DE CHARGE', 1.2], ['e', 80.2, 1.4, 'Sap. A. PICARD\nde Péronne', 1.0],
  ];
  const flats = { n: [], s: [], w: [], e: [] };
  for (const [w, a, h] of graf) { const fy = w === 'n' ? F(a, 68.4) : w === 's' ? F(a, 81.6) : F(47.6, a); flats[w].push(fz(a, fy + h)); }
  // Niche de sainte Barbe au-dessus de l'autel (z, rayon, bas et haut en y absolu : de 1,25 à 2,55 m au-dessus du chœur).
  const niche = { z: SAPE.altar[1], r: 0.62, y0: F(34.4, SAPE.altar[1]) + 1.25, y1: F(34.4, SAPE.altar[1]) + 2.55 };
  flats.w.push([79.2, 81.6, -0.45, 1.5], [niche.z - 1.75, niche.z + 1.75, niche.y0 - 0.6, niche.y1 + 0.5]); // liste des morts ; tour de la niche
  flats.s.push([42.6, 45.4, -1.75, -0.65]); // chiffre IV de la quête
  // Bougies des niches : paroi lisse autour, suie au-dessus de la flamme.
  const soot = { n: [], s: [], w: [], e: [] };
  for (const n of SAPE.niches) { const q = sapeNiche(n); flats[n[1]].push([n[0] - 0.42, n[0] + 0.42, q.y - 0.35, q.y + 0.55]); soot[n[1]].push([n[0], q.y + 0.1]); }
  const hole = [niche.z - niche.r - 0.2, niche.z + niche.r + 0.2, niche.y0 - 0.15, niche.y1 + 0.05]; // (couvert par le cadre de la niche)
  craieWall(gb, { ax: 'x', at: 68, a0: 34, a1: 48, n: 1, flats: flats.n, soot: soot.n });
  craieWall(gb, { ax: 'x', at: 82, a0: 34, a1: 48, n: -1, flats: flats.s, soot: soot.s });
  craieWall(gb, { ax: 'z', at: 34, a0: 68, a1: 76, n: 1, flats: flats.w, holes: [hole] });
  craieWall(gb, { ax: 'z', at: 34, a0: 78, a1: 82, n: 1, flats: flats.w });
  craieWall(gb, { ax: 'z', at: 48, a0: 68, a1: 72, n: -1, flats: flats.e, soot: soot.e });
  craieWall(gb, { ax: 'z', at: 48, a0: 74, a1: 82, n: -1, flats: flats.e, soot: soot.e });
  craieWall(gb, { ax: 'z', at: 48, a0: 72, a1: 74, n: -1, yb: () => roofAt(48.6, 73) + 0.16 }); // linteau au-dessus de la galerie
  craieWall(gb, { ax: 'x', at: 76, a0: 32, a1: 34, n: 1 }); craieWall(gb, { ax: 'x', at: 78, a0: 32, a1: 34, n: -1 }); // tunnel de la cave
  craieVault(gv); craieFloor(gv);
  mesh(sapeBake(gb.geo(true)), SM.chalk, 0, 0, 0, 0, R.scene, true); mesh(sapeBake(gv.geo(true)), SM.chalkV, 0, 0, 0, 0, R.scene, true);
  // Gravures (planches à texte, posées sur les zones lisses).
  for (const [w, a, h, txt, wd] of graf) {
    const at = w === 'n' ? [a, 68.012, Math.PI * 0] : w === 's' ? [a, 81.988, Math.PI] : [47.988, a, -Math.PI / 2];
    const fy = w === 'n' ? F(a, 68.4) : w === 's' ? F(a, 81.6) : F(47.6, a);
    carving(txt, wd, at[0], fy + h, at[1], at[2], 0.95);
  }
  sapePillars(SM); sapeStairs(SM); sapeChapel(SM, flames, niche); sapeMemorial(SM); sapeAmmonal(SM); sapeNave(SM, flames); sapeShaft(SM); sapeSurface(SM);
}

// Paroi taillée dans la craie le long d'un bord de la carrière, du sol (lu 0,4 m à l'intérieur) à la voûte, repoussée vers
// la roche (jamais vers la salle : le joueur ne s'y cogne pas) par des bosses et des facettes de pic ; lisse aux zones
// gravées, percée aux niches. ax 'x' : paroi à z = at, le long de x ; 'z' : paroi à x = at. n : sens de la salle.
function craieWall(gb, o) {
  const { ax, at, a0, a1, n, flats = [], holes = [], yb, soot = [] } = o;
  const len = a1 - a0, nu = Math.max(2, Math.round(len / 0.25)), nv = 24, base = gb.p.length / 3;
  const nx = ax === 'x' ? 0 : n, nz = ax === 'x' ? n : 0, ys = [];
  for (let j = 0; j <= nv; j++) for (let i = 0; i <= nu; i++) {
    const a = a0 + (len * i) / nu, t = j / nv, px = ax === 'x' ? a : at, pz = ax === 'x' ? at : a, qx = px + nx * 0.4, qz = pz + nz * 0.4;
    const f0 = yb ? yb(a) - 0.16 : floorAt(qx, qz) - 0.18, r0 = roofAt(qx, qz) + 0.14, y = lerp(f0, r0, t);
    const ends = smooth(clamp((a - a0) / 0.5, 0, 1)) * smooth(clamp((a1 - a) / 0.5, 0, 1)); // (coins et bords d'ouverture : nets)
    let d = (0.05 + Math.max(0, fbm(a * 0.75 + at * 0.37, y * 0.9 + at, 3) - 0.28) * 0.42 + Math.abs(Math.sin(a * 2.3 + y * 1.7 + fbm(a * 3, y * 3, 2) * 3)) * 0.045) * ends;
    d += Math.pow(t, 3) * 0.22 * ends;
    for (const [b0, b1, c0, c1] of flats) { const k = Math.min(smooth(clamp((a - b0) / 0.25, 0, 1)), smooth(clamp((b1 - a) / 0.25, 0, 1)), smooth(clamp((y - c0) / 0.2, 0, 1)), smooth(clamp((c1 - y) / 0.2, 0, 1))); d = lerp(d, 0.008, k); }
    let ao = 0.48 + 0.52 * smooth(clamp(t * 4.5, 0, 1)) - 0.16 * smooth(clamp((t - 0.8) / 0.2, 0, 1));
    for (const [sa, sy] of soot) if (y > sy - 0.1) ao *= 1 - 0.62 * Math.exp(-(((a - sa) / (0.13 + (y - sy) * 0.25)) ** 2) - ((y - sy - 0.3) / 0.38) ** 2); // suie des bougies
    const dirt = 1 - 0.12 * (1 - smooth(clamp(t * 6, 0, 1))); // terre éclaboussée au pied
    gb.p.push(px - nx * d, y, pz - nz * d); gb.u.push(a / 3, y / 3); gb.c.push(ao, ao * 0.975 * dirt, ao * 0.95 * dirt * dirt); gb.n.push(nx, 0, nz); ys.push(y);
  }
  const flip = ax === 'x' ? n > 0 : n < 0;
  for (let j = 0; j < nv; j++) for (let i = 0; i < nu; i++) {
    const ia = base + j * (nu + 1) + i, ib = ia + 1, ic = ia + nu + 1, id = ic + 1, am = a0 + (len * (i + 0.5)) / nu, ym = (ys[ia - base] + ys[id - base]) / 2;
    if (holes.some(([b0, b1, c0, c1]) => am > b0 && am < b1 && ym > c0 && ym < c1)) continue;
    if (flip) gb.i.push(ia, ib, ic, ib, id, ic); else gb.i.push(ia, ic, ib, ib, ic, id);
  }
}
// Voûte : un seul quadrillage de 25 cm sous p7Vault (bosses vers la roche), percé du puits ; plafond du tunnel de la cave.
function craieVault(gb) {
  const sh = P7_SHAFT;
  const part = (x0, x1, z0, z1, fn) => {
    const nx = Math.round((x1 - x0) / 0.25), nz = Math.round((z1 - z0) / 0.25), base = gb.p.length / 3;
    for (let j = 0; j <= nz; j++) for (let i = 0; i <= nx; i++) {
      const x = x0 + ((x1 - x0) * i) / nx, z = z0 + ((z1 - z0) * j) / nz, y = fn(x, z) + Math.max(0, fbm(x * 0.8, z * 0.8, 3) - 0.35) * 0.3 + fbm(x * 3.1, z * 3.1, 2) * 0.04;
      const dsh = Math.hypot(x - sh[0], z - sh[1]);
      let ao = 0.55 + 0.45 * smooth(clamp((y + 0.6) / 2.9, 0, 1)) + 0.25 * smooth(clamp(1 - (dsh - sh[2]) / 1.8, 0, 1));
      for (const [lx, lz] of SAPE.lamps) ao *= 1 - 0.5 * Math.exp(-((x - lx) ** 2 + (z - lz) ** 2) / 0.35); // suie des lampes
      gb.p.push(x, y, z); gb.u.push(x / 3, z / 3); gb.c.push(Math.min(1, ao), Math.min(1, ao * 0.99), Math.min(1, ao * 0.97)); gb.n.push(0, -1, 0);
    }
    for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) {
      const ia = base + j * (nx + 1) + i, ib = ia + 1, ic = ia + nx + 1, id = ic + 1;
      const cx = x0 + ((x1 - x0) * (i + 0.5)) / nx, cz = z0 + ((z1 - z0) * (j + 0.5)) / nz;
      if (Math.hypot(cx - sh[0], cz - sh[1]) < sh[2] - 0.05) continue;
      gb.i.push(ia, ib, ic, ib, id, ic);
    }
  };
  part(33.75, 48.25, 67.75, 82.25, (x, z) => p7Vault(clamp(x, 34.05, 47.95), clamp(z, 68.05, 81.95)));
  part(31.75, 34.25, 75.75, 78.25, (x, z) => roofAt(clamp(x, 32.05, 33.95), clamp(z, 76.05, 77.95)));
}
// Sol de la carrière : craie piétinée, plus sombre et terreuse sur les passages, ombrée le long des parois ; il passe sous
// les parois (repoussées dans la roche) et plonge sous les marches du grand escalier (sol affiché : MAPS.poste7.floorVis).
function craieFloor(gb) {
  const fvis = MAPS.poste7.floorVis, paths = [[48.6, 73, 44, 74.6], [44, 74.6, 40.4, 75], [40.4, 75, 37, 75.3], [37, 75.3, 35.3, 77], [35.3, 77, 32, 77], [42, 75, 45.4, 70.9], [42, 75, 46, 78.9], [37.2, 74.2, 35.7, 72.4]];
  const segD = (x, z, [ax, az, bx, bz]) => { const dx = bx - ax, dz = bz - az, t = clamp(((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz), 0, 1); return Math.hypot(x - ax - dx * t, z - az - dz * t); };
  const part = (x0, x1, z0, z1, inner, hf, skip) => {
    const nx = Math.round((x1 - x0) / 0.25), nz = Math.round((z1 - z0) / 0.25), base = gb.p.length / 3;
    for (let j = 0; j <= nz; j++) for (let i = 0; i <= nx; i++) {
      const x = x0 + ((x1 - x0) * i) / nx, z = z0 + ((z1 - z0) * j) / nz, y = hf(x, z) + (fbm(x * 2, z * 2, 2) - 0.5) * 0.04;
      const wd = Math.min(x - inner[0], inner[1] - x, z - inner[2], inner[3] - z), ao = 0.58 + 0.42 * smooth(clamp(wd / 0.9, 0, 1));
      let pd = 9; for (const sg of paths) pd = Math.min(pd, segD(x, z, sg));
      const tr = (1 - smooth(clamp((pd - 0.3) / 1.4, 0, 1))) * clamp(0.45 + fbm(x * 1.3, z * 1.3, 3) * 0.7, 0, 1), dust = 0.9 + (fbm(x * 0.7 + 4, z * 0.7, 3) - 0.5) * 0.2;
      gb.p.push(x, y, z); gb.u.push(x / 3, z / 3); gb.n.push(0, 1, 0);
      gb.c.push(lerp(dust, 0.55, tr) * ao, lerp(dust * 0.98, 0.5, tr) * ao, lerp(dust * 0.93, 0.43, tr) * ao);
    }
    for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) {
      const ia = base + j * (nx + 1) + i, ib = ia + 1, ic = ia + nx + 1, id = ic + 1;
      if (skip && skip(x0 + ((x1 - x0) * (i + 0.5)) / nx, z0 + ((z1 - z0) * (j + 0.5)) / nz)) continue;
      gb.i.push(ia, ic, ib, ib, ic, id);
    }
  };
  // (le sol de la galerie à l'est et celui du tunnel à l'ouest ne sont pas doublés)
  part(33.5, 48.5, 67.5, 82.5, [34, 48, 68, 82], (x, z) => fvis(clamp(x, 34.05, 47.95), clamp(z, 68.05, 81.95)), (x, z) => (x > 48 && z > 72 && z < 74) || (x < 34 && z > 76 && z < 78));
  part(32, 34, 75.5, 78.5, [-99, 99, 76, 78], (x, z) => p7Floor(x, clamp(z, 76.05, 77.95)));
}
// Inscription gravée dans la craie : lettres creusées (ombre en haut, lumière en bas), sur une planche transparente.
function carving(text, w, x, y, z, ry, op = 1, parent = R.scene) {
  const lines = text.split('\n'), h = Math.max(0.28, lines.length * 0.2 + 0.08) * (w / 1.1);
  const tex = textTexture(512, Math.round(512 * (h / w)), (c, W, H) => {
    c.clearRect(0, 0, W, H); const fs = Math.min(H / (lines.length + 0.6), W / Math.max(...lines.map((l) => l.length)) * 1.75);
    c.font = `700 ${fs}px "Times New Roman", serif`; c.textAlign = 'center'; c.textBaseline = 'middle';
    lines.forEach((l, i) => { const yy = H / 2 + (i - (lines.length - 1) / 2) * fs * 1.08;
      c.fillStyle = 'rgba(255,252,240,0.55)'; c.fillText(l, W / 2 + 2, yy + 3); c.fillStyle = 'rgba(70,62,52,0.92)'; c.fillText(l, W / 2, yy); c.fillStyle = 'rgba(30,26,22,0.5)'; c.fillText(l, W / 2 - 1, yy - 2); });
  });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: tex, transparent: true, alphaTest: 0.06, depthWrite: false, roughness: 0.95, opacity: op, polygonOffset: true, polygonOffsetFactor: -2 }));
  m.position.set(x, y, z); m.rotation.y = ry; m.receiveShadow = true; parent.add(m); return m;
}

/* ─── La galerie : cadres de mine, gaine d'aération, câbles, lampes ─── */
function sapeGallery(SM) {
  signPost(62.4, 59, 0, ['LA SAPE', 'DÉFENSE DE FUMER']);
  const caps = new Batch(boxG(1.9, 0.16, 0.18), SM.wood), legs = new Batch(boxG(0.16, 1, 0.16), SM.wood), pipe = [];
  // Cadres tous les 1,3 m : chapeau et deux montants calés contre les parois (descente nord-sud, puis galerie est-ouest).
  const frame = (x, z, alongX) => {
    const f = floorAt(x, z), r = roofAt(x, z); caps.add(x, r - 0.09, z, alongX ? Math.PI / 2 : 0);
    for (const o of [-0.86, 0.86]) { const qx = x + (alongX ? 0 : o), qz = z + (alongX ? o : 0); legs.add(qx, (f + r - 0.18) / 2, qz, 0, 0, 0, 1, r - 0.18 - f, 1); }
  };
  for (let z = 62.7; z < 71.6; z += 1.3) frame(63, z, false);
  for (let x = 61.6; x > 48.4; x -= 1.3) frame(x, 73, true);
  caps.build(); legs.build();
  // Gaine d'aération en toile sous le plafond, le long de la paroi (du haut de la descente à la carrière).
  const duct = [[62.25, 61.6], [62.25, 72.2], [61.6, 72.3], [48.2, 72.3]];
  for (let k = 0; k < duct.length - 1; k++) {
    const [ax, az] = duct[k], [bx, bz] = duct[k + 1], L = Math.hypot(bx - ax, bz - az), n = Math.max(1, Math.round(L / 1.3));
    for (let s = 0; s < n; s++) { const t0 = s / n, t1 = (s + 1) / n, x0 = lerp(ax, bx, t0), z0 = lerp(az, bz, t0), x1 = lerp(ax, bx, t1), z1 = lerp(az, bz, t1);
      const y0 = roofAt(x0, z0) - 0.3 - Math.sin(t0 * Math.PI) * 0.02, y1 = roofAt(x1, z1) - 0.3;
      const c = new THREE.CylinderGeometry(0.13, 0.13, Math.hypot(x1 - x0, y1 - y0, z1 - z0), 10, 1, true); c.rotateX(Math.PI / 2);
      c.lookAt(new THREE.Vector3(x1 - x0, y1 - y0, z1 - z0)); c.translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2); pipe.push(c.toNonIndexed()); }
  }
  mesh(mergeGeometries(pipe), SM.canvas, 0, 0, 0, 0, R.scene, true);
  // Câble de mise à feu et ligne téléphonique accrochés à la paroi opposée.
  const wire = []; const cab = [[63.8, 61.4], [63.8, 72.2], [63, 73.75], [48, 73.75]];
  for (let k = 0; k < cab.length - 1; k++) { const [ax, az] = cab[k], [bx, bz] = cab[k + 1], n = Math.max(2, Math.round(Math.hypot(bx - ax, bz - az) / 0.6));
    for (let s = 0; s < n; s++) for (const dy of [0, -0.07]) { const t0 = s / n, t1 = (s + 1) / n, sag = (t) => Math.sin(((t * n) % 1) * Math.PI) * 0.05;
      wire.push(lerp(ax, bx, t0), roofAt(lerp(ax, bx, t0), lerp(az, bz, t0)) - 0.45 + dy - sag(t0), lerp(az, bz, t0), lerp(ax, bx, t1), roofAt(lerp(ax, bx, t1), lerp(az, bz, t1)) - 0.45 + dy - sag(t1 - 1e-4), lerp(az, bz, t1)); } }
  { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(wire, 3)); R.scene.add(new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color: 0x1a1612 }))); }
  // Lampes pendues aux cadres (la poussière de la quête tombe autour d'elles).
  for (const [x, z] of [[63, 63.5], [63, 68.5], [60, 73], [54, 73], [49.5, 73]]) WORLD.sapeLamps.push(hangingLamp(x, roofAt(x, z) - 0.32, z, MATS.bulbWarm));
  // Panneaux.
  { const s = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.32), new THREE.MeshStandardMaterial({ map: woodSign(['GALERIE 7', 'SILENCE'], { w: 256, h: 120 }), roughness: 0.9 }));
    s.position.set(62.03, floorAt(62.03, 64) + 1.55, 64); s.rotation.y = Math.PI / 2; R.scene.add(s); }
  poster(63.97, floorAt(63.97, 70) + 1.4, 70, -Math.PI / 2, 'SILENCE', 'ILS CREUSENT\nAUSSI', '#b9a37c');
}

/* ─── Piliers tournés : la roche laissée en place, plan carré aux angles abattus, pied évasé, ouverts en éventail sous la voûte ─── */
function sapePillars(SM) {
  const parts = [];
  for (const [x, z] of SAPE.pillars) {
    const f = floorAt(x, z) - 0.2, r = p7Vault(x, z) + 0.6, h = r - f, g = new THREE.CylinderGeometry(1, 1, h, 18, 24, true);
    const pa = g.attributes.position, col = [], rot = hash2(x * 7, z * 3) * TAU, seed = x * 0.37 + z * 0.61;
    for (let i = 0; i < pa.count; i++) {
      const vx = pa.getX(i), vy = pa.getY(i), vz = pa.getZ(i), t = (vy + h / 2) / h, a = Math.atan2(vz, vx) + rot, ca = Math.cos(a), sa = Math.sin(a);
      const sq = Math.pow(1 / Math.max(Math.abs(ca), Math.abs(sa)), 0.5); // plan carré aux angles abattus
      const prof = 0.7 + 0.2 * Math.pow(1 - t, 6) + 1.35 * Math.pow(t, 3.2);
      const bump = (fbm(ca * 1.2 + seed + t * 2.4, sa * 1.2 + t * 1.3, 3) - 0.5) * 0.3 + (fbm(ca * 4 + seed, sa * 4 + t * 9, 2) - 0.5) * 0.07;
      const k = prof * sq + bump; pa.setXYZ(i, vx * k, vy, vz * k);
      const ao = 0.52 + 0.48 * smooth(clamp(t * 5, 0, 1)) - 0.2 * smooth(clamp((t - 0.8) / 0.2, 0, 1)), dirt = 1 - 0.14 * (1 - smooth(clamp(t * 7, 0, 1)));
      col.push(ao, ao * 0.975 * dirt, ao * 0.95 * dirt * dirt);
    }
    g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.translate(x, f + h / 2, z); g.computeVertexNormals();
    const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 5.2 / 3, (pa.getY(i)) / 3);
    parts.push(g.toNonIndexed());
    MAP.props.push({ x0: x - 0.72, x1: x + 0.72, z0: z - 0.72, z1: z + 0.72, y0: f, y1: r, mat: 'concrete', rad: 0.72 });
  }
  mesh(sapeBake(mergeGeometries(parts)), SM.chalk, 0, 0, 0, 0, R.scene, true);
}

/* ─── Grand escalier taillé entre le chœur et la nef (marches dessinées une à une ; on marche sur une pente : P7_STAIRS) ─── */
function sapeStairs(SM) {
  const { x0, x1, n, rise } = P7_STAIRS, run = (x1 - x0) / n, top0 = -0.8, L = 14.8; // (les bouts entrent dans la roche)
  const box = boxG(1, 1, L), no = box.attributes.normal, cols = [];
  for (let i = 0; i < no.count; i++) { const c = no.getY(i) > 0.5 ? 0.97 : Math.abs(no.getX(i)) > 0.5 ? 0.68 : 0.5; cols.push(c, c * 0.98, c * 0.94); } // dessus clair, contremarche dans l'ombre
  box.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
  const steps = new Batch(box, SM.steps);
  steps.add(x0 - 0.16, top0 + 0.025 - 0.5, 75, 0, 0, 0, 0.34, 1, 1); // bord du chœur (le sol affiché plonge dessous)
  for (let k = 1; k <= n; k++) steps.add(x0 + run * (k - 0.5), top0 - rise * k - 0.5, 75, rand(-0.002, 0.002), 0, 0, run + 0.02, 1, 1);
  steps.build();
  // Nez des marches usés et blanchis par les pas (une arête claire, plus visible dans la pénombre).
  const nose = new Batch(boxG(0.05, 0.03, L - 1.2), stdMat({ color: 0xfaf8f2, roughness: 0.9 }), false);
  for (let k = 0; k <= n; k++) nose.add(x0 + run * k - 0.02, top0 - rise * k + (k ? 0 : 0.025) - 0.012, 75);
  nose.build();
}

/* ─── Chapelle de sainte Barbe : autel, niche et statue, cierges, croix, fanion, bancs ─── */
function sapeChapel(SM, flames, niche) {
  const [ax, az] = SAPE.altar, f = floorAt(ax, az);
  // Autel taillé dans un bloc de craie (deux marches, table, gradin), devant gravé, nappe ; chandeliers, cierges et bougies.
  { const g = p7g(ax, az, Math.PI / 2);
    mesh(boxG(2.3, 0.14, 1.3), SM.chalkP, 0, 0.07, 0.15, 0, g); mesh(boxG(2.05, 0.14, 1.05), SM.chalkP, 0, 0.21, 0.08, 0, g);
    mesh(boxG(1.8, 0.82, 0.62), SM.chalkP, 0, 0.69, 0, 0, g); mesh(boxG(1.95, 0.07, 0.72), SM.chalkP, 0, 1.135, 0, 0, g);
    mesh(boxG(1.2, 0.18, 0.22), SM.chalkP, 0, 1.26, -0.2, 0, g); // gradin des cierges
    const lin = mesh(new THREE.PlaneGeometry(1.7, 0.42), stdMat({ color: 0xf2eee4, roughness: 0.9, side: THREE.DoubleSide }), 0, 1.0, 0.315, 0, g); lin.rotation.x = 0.04; // nappe
    carving('✠ SAINTE BARBE ✠\nPRIEZ POUR NOUS', 1.3, 0, 0.62, 0.312, 0, 1, g);
    for (const s of [-0.75, 0.75]) { mesh(new THREE.CylinderGeometry(0.03, 0.07, 0.42, 10), SM.brass, s, 1.38, -0.12, 0, g); candle(g, s, 1.59, -0.12, 0.25, flames); }
    for (let k = 0; k < 5; k++) candle(g, -0.44 + k * 0.22, 1.35, -0.2, 0.12 + (k % 2) * 0.08, flames);
    for (let k = 0; k < 9; k++) candle(g, -0.9 + k * 0.22 + rand(-0.04, 0.04), 1.17, 0.18 + rand(-0.06, 0.06), rand(0.05, 0.13), flames); // bougies collées sur l'autel
    MAP.props.push(propBox({ y0: f, y1: f + 1.17, mat: 'concrete' }, ax + 0.05, az, 0.75, 1.95, 0));
  }
  // Niche (paroi ouest, au-dessus de l'autel) : coquille voûtée creusée dans la roche, cadre de craie dressée un peu en
  // saillie (il couvre le bord du trou de la paroi), moulure en arc, appui ; la statue de sainte Barbe dedans.
  const { z: nz, r: nr, y0, y1 } = niche, hc = y1 - y0 - nr;
  { const g = new THREE.Group(); g.position.set(34, 0, nz); R.scene.add(g);
    const sh = new THREE.CylinderGeometry(nr, nr, hc, 18, 1, true, Math.PI, Math.PI); sh.translate(0, y0 + hc / 2, 0);
    const top = new THREE.SphereGeometry(nr, 18, 8, -Math.PI / 2, Math.PI, 0, Math.PI / 2); top.translate(0, y1 - nr, 0);
    const bot = new THREE.CircleGeometry(nr, 18, Math.PI / 2, Math.PI); bot.rotateX(-Math.PI / 2); bot.translate(0, y0, 0);
    const shell = mergeGeometries([sh.toNonIndexed(), top.toNonIndexed(), bot.toNonIndexed()]); shell.scale(0.62, 1, 1);
    { const uv = shell.attributes.uv, pa = shell.attributes.position; for (let i = 0; i < uv.count; i++) uv.setXY(i, pa.getZ(i) / 3, (pa.getY(i) + pa.getX(i) * 0.6) / 3); }
    mesh(shell, stdMat({ map: ftex('craie').map, normalMap: ftex('craie').normalMap, color: 0xd2cbbb, roughness: 0.95, side: THREE.DoubleSide }), 0, 0, 0, 0, g, true);
    const W = nr + 0.35, sp = new THREE.Shape(); sp.moveTo(-W, y0 - 0.3); sp.lineTo(W, y0 - 0.3); sp.lineTo(W, y1 + 0.15); sp.lineTo(-W, y1 + 0.15); sp.closePath();
    const ho = new THREE.Path(); ho.moveTo(-nr, y0); ho.lineTo(-nr, y1 - nr); ho.absarc(0, y1 - nr, nr, Math.PI, 0, true); ho.lineTo(nr, y0); ho.closePath(); sp.holes.push(ho);
    const pg = new THREE.ExtrudeGeometry(sp, { depth: 0.04, bevelEnabled: false, curveSegments: 18 }); pg.rotateY(Math.PI / 2); pg.translate(-0.01, 0, 0);
    { const uv = pg.attributes.uv, pa = pg.attributes.position; for (let i = 0; i < uv.count; i++) uv.setXY(i, pa.getZ(i) / 3, pa.getY(i) / 3); }
    mesh(pg, SM.chalkP, 0, 0, 0, 0, g, true);
    const R2 = nr + 0.03, pts = [new THREE.Vector3(0.035, y0 - 0.02, -R2), new THREE.Vector3(0.035, y1 - nr, -R2)];
    for (let k = 1; k < 12; k++) { const a = Math.PI - (k / 12) * Math.PI; pts.push(new THREE.Vector3(0.035, y1 - nr + Math.sin(a) * R2, Math.cos(a) * R2)); }
    pts.push(new THREE.Vector3(0.035, y1 - nr, R2), new THREE.Vector3(0.035, y0 - 0.02, R2));
    mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, false, 'centripetal'), 48, 0.035, 6, false), SM.chalkP, 0, 0, 0, 0, g, true);
    mesh(boxG(0.18, 0.07, 2 * nr + 0.26), SM.chalkP, 0.07, y0 - 0.035, 0, 0, g); // appui
    sainteBarbe(g, -0.13, y0, 0, SM);
  }
  // Croix de bois clouée à gauche de la niche, fanion tricolore épinglé à droite.
  { const g = new THREE.Group(); g.position.set(34.03, y0 + 0.3, nz - nr - 0.62); g.rotation.y = Math.PI / 2; R.scene.add(g);
    mesh(boxG(0.06, 0.8, 0.035), SM.dark, 0, 0, 0.018, 0, g); mesh(boxG(0.44, 0.06, 0.035), SM.dark, 0, 0.17, 0.018, 0, g); }
  { const fl = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.28), new THREE.MeshStandardMaterial({ map: flagTexture(), roughness: 0.9, transparent: true, alphaTest: 0.1 }));
    fl.position.set(34.02, y0 + 0.5, nz + nr + 0.6); fl.rotation.set(0, Math.PI / 2, 0.06); R.scene.add(fl); }
  // Bancs de fortune (planches sur caisses d'ammonal vides) devant l'autel, de part et d'autre de l'allée.
  for (const [bx, bz] of [[36.4, 70.4], [36.4, 72.9]]) { const g = p7g(bx, bz, 0); for (const s of [-0.55, 0.55]) mesh(boxG(0.36, 0.42, 0.3), SM.crate, 0, 0.21, s, 0, g);
    mesh(boxG(0.32, 0.05, 1.7), SM.wood, 0, 0.445, 0, 0, g); MAP.props.push(propBox({ y0: floorAt(bx, bz), y1: floorAt(bx, bz) + 0.47, mat: 'wood' }, bx, bz, 0.36, 1.7, 0)); }
}
// Sainte Barbe, taillée dans la craie : longue robe, manteau, couronne, palme et sa tour (son attribut).
function sainteBarbe(g, x, y, z, SM) {
  const s = new THREE.Group(); s.position.set(x, y, z); s.rotation.y = Math.PI / 2; g.add(s);
  const robe = new THREE.LatheGeometry([[0, 0], [0.2, 0], [0.19, 0.05], [0.16, 0.5], [0.13, 0.82], [0.12, 0.9], [0.0, 0.92]].map(([r, h]) => new THREE.Vector2(r, h)), 16);
  mesh(robe, SM.chalkP, 0, 0, 0, 0, s); mesh(new THREE.SphereGeometry(0.075, 12, 10), SM.chalkP, 0, 1.0, 0.01, 0, s);
  mesh(new THREE.CylinderGeometry(0.06, 0.065, 0.05, 10), SM.chalkP, 0, 1.08, 0, 0, s); // couronne
  const mant = new THREE.CylinderGeometry(0.13, 0.21, 0.75, 14, 1, true, 0.6, Math.PI * 2 - 1.2); mesh(mant, SM.chalkP, 0, 0.5, -0.01, 0, s);
  const tower = new THREE.Group(); tower.position.set(-0.2, 0, 0.06); s.add(tower);
  mesh(boxG(0.1, 0.42, 0.1), SM.chalkP, 0, 0.21, 0, 0, tower); for (const yy of [0.25, 0.33]) mesh(boxG(0.03, 0.04, 0.105), stdMat({ color: 0x3a342c, roughness: 1 }), 0.005, yy, 0, 0, tower);
  const palm = new THREE.ConeGeometry(0.03, 0.42, 6); palm.scale(1, 1, 0.3); const pm = mesh(palm, SM.chalkP, 0.15, 0.82, 0.08, 0, s); pm.rotation.z = -0.35;
}
// Cierge : cylindre de cire et flamme (lueur additive qui vacille : sapeAnim).
function candle(parent, x, y, z, h, flames) {
  const SM = sapeMats(), r = h > 0.2 ? 0.024 : 0.016;
  mesh(new THREE.CylinderGeometry(r, r * 1.08, h, 8), SM.wax, x, y + h / 2, z, 0, parent, false);
  const fl = new THREE.Sprite(new THREE.SpriteMaterial({ map: TEX.sprites.glow, color: 0xffb35a, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.9 }));
  fl.scale.set(0.09, 0.15, 1); fl.position.set(x, y + h + 0.045, z); parent.add(fl);
  flames.push({ s: fl, k: Math.random() * 10, b: fl.scale.y });
}

/* ─── Liste des morts gravée (chœur, paroi ouest au sud de la porte) ─── */
function sapeMemorial() {
  const f = floorAt(34.5, 80.4);
  carving('À NOS CAMARADES\nDU 7e GÉNIE\nMORTS SOUS LA TERRE', 2.1, 34.012, f + 1.75, 80.4, Math.PI / 2);
  carving('Cne A. DELORME\nSgt J. LEROUX\nCpl P. MARTIN\nSap. E. GIRAUD\nSap. L. DUVAL\nSap. H. NOËL', 1.15, 34.012, f + 0.95, 80.4, Math.PI / 2);
}

/* ─── Mur d'ammonal (chambre de charge, nord de la nef) et câbles de mise à feu vers l'exploseur ─── */
function sapeAmmonal(SM) {
  const lab = new THREE.MeshStandardMaterial({ map: woodSign(['AMMONAL', '⚠'], { w: 128, h: 64, bg: '#6a5a3a', color: '#f4e8c0' }), roughness: 0.9 });
  const box = mergeGeometries([boxG(0.48, 0.3, 0.32).toNonIndexed()]), cr = new Batch(box, SM.crate), tins = new Batch(new THREE.CylinderGeometry(0.11, 0.11, 0.3, 10), SM.tin);
  const labels = new Batch(new THREE.PlaneGeometry(0.3, 0.15), lab, false);
  for (let x = 40.1; x < 47.2; x += 0.5) {
    const f = floorAt(x, 68.9), rows = x < 41 ? 2 : 4 - ((x * 7) % 2 > 1 ? 1 : 0);
    for (let r = 0; r < rows; r++) for (const dz of [68.35, 68.72]) { cr.add(x + rand(-0.02, 0.02), f + 0.15 + r * 0.3, dz, rand(-0.04, 0.04)); if (dz > 68.5) labels.add(x, f + 0.15 + r * 0.3, dz + 0.163, 0); }
    if (Math.random() < 0.5) tins.add(x + rand(-0.1, 0.1), f + 0.15 + rows * 0.3, 68.55, rand(TAU));
  }
  cr.build(); tins.build(); labels.build();
  MAP.props.push({ x0: 39.85, x1: 47.3, z0: 68, z1: 68.92, y0: -3, y1: floorAt(42, 68.9) + 1.25, mat: 'wood' });
  // Câbles rouge et noir posés au sol, du mur d'ammonal à l'exploseur (sud-est de la nef).
  const pts = [[44.5, 69.1], [45.1, 70.9], [45.2, 72.4], [45.5, 74.4], [45.6, 76.2], [45.9, 78.1], [46.2, 79.4]];
  for (const [dx, col] of [[0, 0x5a1810], [0.045, 0x1c1a18]]) {
    const c = new THREE.CatmullRomCurve3(pts.map(([x, z], k) => new THREE.Vector3(x + dx + Math.sin(k * 2.1) * 0.06, floorAt(x, z) + 0.015, z)));
    mesh(new THREE.TubeGeometry(c, 60, 0.011, 5, false), stdMat({ color: col, roughness: 0.6 }), 0, 0, 0, 0, R.scene, false);
  }
}

/* ─── La nef : poste d'écoute, exploseur, voie et heurtoir du wagonnet, outils, bougies dans les niches ─── */
function sapeNave(SM, flames) {
  // Poste d'écoute (quête : géophone) : table, deux disques de géophone en laiton reliés au casque, carnet, lampe à carbure.
  { const g = p7g(45.6, 70.2, 0);
    mesh(boxG(1.2, 0.06, 0.6), SM.wood, 0, 0.8, 0, 0, g); for (const [a, b] of [[-0.55, -0.25], [0.55, -0.25], [-0.55, 0.25], [0.55, 0.25]]) mesh(boxG(0.06, 0.8, 0.06), SM.dark, a, 0.4, b, 0, g);
    for (const s of [-0.28, -0.08]) { mesh(new THREE.CylinderGeometry(0.075, 0.08, 0.05, 16), SM.brass, s, 0.855, 0.05, 0, g); }
    mesh(new THREE.TorusGeometry(0.09, 0.012, 6, 16), SM.iron, 0.25, 0.85, 0, 0, g).rotation.x = Math.PI / 2; mesh(boxG(0.22, 0.02, 0.3), stdMat({ color: 0xe8dfc4, roughness: 0.9 }), 0.0, 0.84, -0.12, 0.2, g);
    MAP.props.push(propBox({ y0: floorAt(45.6, 70.2), y1: floorAt(45.6, 70.2) + 0.9, mat: 'wood' }, 45.6, 70.2, 1.2, 0.6, 0)); }
  // Exploseur à poignée (quête : mise à feu), sur une caisse.
  { const g = p7g(46.2, 79.6, -Math.PI / 2); WORLD.sapeDetonator = g;
    mesh(boxG(0.55, 0.36, 0.42), SM.crate, 0, 0.18, 0, 0, g); mesh(boxG(0.32, 0.26, 0.24), SM.dark, 0, 0.49, 0, 0, g);
    mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.42, 8), SM.iron, 0, 0.8, 0, 0, g); mesh(boxG(0.3, 0.04, 0.04), SM.iron, 0, 1.0, 0, 0, g);
    for (const s of [-0.08, 0.08]) mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.04, 8), SM.brass, s, 0.64, 0.13, 0, g);
    MAP.props.push(propBox({ y0: floorAt(46.2, 79.6), y1: floorAt(46.2, 79.6) + 0.75, mat: 'wood' }, 46.2, 79.6, 0.42, 0.55, 0)); }
  // Voie du wagonnet : rails jusqu'au heurtoir de bois, dans la carrière.
  { const rails = new Batch(boxG(0.06, 0.08, 0.5), SM.iron), sl = new Batch(boxG(0.9, 0.06, 0.16), SM.dark);
    for (let x = 47.8; x > SAPE.cartEnd - 0.2; x -= 0.5) { const y = floorAt(x, 73); for (const o of [-0.3, 0.3]) rails.add(x - 0.25, y + 0.06, 73 + o, Math.PI / 2); if (Math.round(x * 2) % 2 === 0) sl.add(x, y + 0.02, 73, Math.PI / 2 + rand(-0.05, 0.05)); }
    rails.build(); sl.build();
    const g = p7g(SAPE.cartEnd - 0.35, 73, 0); mesh(boxG(0.25, 0.4, 1.0), SM.dark, 0, 0.2, 0, 0, g); mesh(boxG(0.3, 0.25, 0.25), SM.wood, 0.05, 0.35, -0.35, 0, g); mesh(boxG(0.3, 0.25, 0.25), SM.wood, 0.05, 0.35, 0.35, 0, g); }
  // Outils, seaux, étais de réserve, brouette, cantine.
  { const g = p7g(47.1, 80.9, 0.3); for (const o of [-0.3, 0, 0.3]) { const t = mesh(boxG(0.05, 1.4, 0.04), SM.wood, o, 0.68, 0, 0, g); t.rotation.z = o * 0.3; } }
  for (const [x, z] of [[46.6, 76.3], [41.5, 81.1], [38.8, 80.9]]) { const g = p7g(x, z, rand(TAU)); mesh(new THREE.CylinderGeometry(0.15, 0.12, 0.3, 12, 1, true), SM.tin, 0, 0.15, 0, 0, g); }
  { const sb = new Batch(boxG(2.4, 0.16, 0.16), SM.wood); for (let k = 0; k < 5; k++) sb.add(41.2 + (k % 2) * 0.2, floorAt(41.2, 81.3) + 0.08 + (k >> 1) * 0.16, 81.25 - (k % 2) * 0.17, Math.PI / 2 + rand(-0.03, 0.03)); sb.build();
    MAP.props.push({ x0: 40, x1: 42.4, z0: 80.95, z1: 81.6, y0: -3, y1: floorAt(41, 81) + 0.5, mat: 'wood' }); }
  // Petites niches creusées dans les parois de la nef, une bougie dans chacune.
  for (const n of SAPE.niches) {
    const q = sapeNiche(n), g = new THREE.Group(); g.position.set(q.x, q.y, q.z); g.rotation.y = q.ry; R.scene.add(g);
    mesh(boxG(0.3, 0.035, 0.16), SM.chalkP, 0, 0, 0.06, 0, g); candle(g, 0, 0.02, 0.07, rand(0.06, 0.12), flames);
    for (let k = 0; k < 3; k++) mesh(new THREE.CylinderGeometry(0.03, 0.035, 0.012, 8), SM.wax, rand(-0.12, 0.12), 0.024, rand(0.03, 0.11), 0, g, false); // coulures de cire
  }
  // Lampes pendues à la voûte de la nef (la poussière tombe aussi autour d'elles), lampe à carbure du poste d'écoute,
  // voyant rouge de l'exploseur.
  for (const [x, z] of SAPE.lamps) WORLD.sapeLamps.push(hangingLamp(x, p7Vault(x, z) - 0.55, z, MATS.bulbWarm));
  { const g = p7g(45.95, 70.25, 0.3); mesh(new THREE.CylinderGeometry(0.045, 0.055, 0.16, 10), SM.brass, 0, 0.91, 0, 0, g); mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.06, 6), SM.iron, 0.03, 1.02, 0, 0, g);
    const fl = new THREE.Sprite(new THREE.SpriteMaterial({ map: TEX.sprites.glow, color: 0xfff0d0, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.85 })); fl.scale.set(0.22, 0.22, 1); fl.position.set(0.03, 1.07, 0); g.add(fl); }
  { const fl = new THREE.Sprite(new THREE.SpriteMaterial({ map: TEX.sprites.glow, color: 0xff2a10, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.9 })); fl.scale.set(0.18, 0.18, 1); fl.position.set(46.2 + 0.1, floorAt(46.2, 79.6) + 0.66, 79.6 - 0.12); R.scene.add(fl); WORLD.sapeRed = fl; }
}

/* ─── Le puits de lumière : cheminée boisée, corde et seau, faisceau de lune, flocons qui tombent dans le noir ─── */
function sapeShaft(SM) {
  const [x, z, r] = P7_SHAFT, top = WALL_H + 1.35, bot = 2.05, fN = floorAt(x, z);
  // Cheminée : craie puis cadres de bois carrés empilés jusqu'au terril.
  { const c = new THREE.CylinderGeometry(r, r + 0.05, top - bot, 18, 4, true); c.translate(0, (top + bot) / 2, 0);
    mesh(c, stdMat({ map: ftex('craie').map, normalMap: ftex('craie').normalMap, color: 0xbab3a4, roughness: 0.95, side: THREE.BackSide }), x, 0, z, 0, R.scene, true);
    const cribs = new Batch(boxG(2.3, 0.16, 0.16), SM.dark); for (let y = WALL_H - 0.1; y < top; y += 0.42) { cribs.add(x, y, z - 1.08, 0); cribs.add(x, y, z + 1.08, 0); cribs.add(x - 1.08, y + 0.08, z, Math.PI / 2); cribs.add(x + 1.08, y + 0.08, z, Math.PI / 2); } cribs.build(); }
  // Corde du treuil et seau qui pend dans le faisceau (il tourne lentement : visuals).
  { const L = top + 2.2 - (fN + 1.1); const rope = mesh(new THREE.CylinderGeometry(0.012, 0.012, L, 5), SM.rope, x + 0.12, fN + 1.1 + L / 2, z, 0, R.scene, false);
    const b = new THREE.Group(); b.position.set(x + 0.12, fN + 1.1, z); R.scene.add(b);
    mesh(new THREE.CylinderGeometry(0.2, 0.16, 0.34, 14, 1, true), stdMat({ color: 0x5a4632, roughness: 0.85, side: THREE.DoubleSide }), 0, -0.2, 0, 0, b);
    mesh(new THREE.TorusGeometry(0.2, 0.012, 5, 16, Math.PI), SM.iron, 0, -0.03, 0, 0, b); WORLD.sapeBucket = b; void rope; }
  // Faisceau de lune (volume additif plus dense au cœur, qui faiblit vers le sol) et tache de lumière au fond.
  { const h = top - fN, cone = new THREE.CylinderGeometry(r * 0.92, r * 1.45, h, 24, 1, true); cone.translate(0, fN + h / 2, 0);
    const mat = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false,
      uniforms: { uTime: { value: 0 }, uTop: { value: top }, uBot: { value: fN }, uK: { value: 1 } },
      vertexShader: 'varying vec3 vW; varying vec3 vN; void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; vN = normalize(mat3(modelMatrix) * normal); gl_Position = projectionMatrix * viewMatrix * w; }',
      fragmentShader: `uniform float uTime, uTop, uBot, uK; varying vec3 vW; varying vec3 vN;
        float h(vec3 p){ return fract(sin(dot(p, vec3(12.9898, 78.233, 37.719))) * 43758.5453); }
        float n3(vec3 p){ vec3 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(mix(h(i), h(i + vec3(1,0,0)), f.x), mix(h(i + vec3(0,1,0)), h(i + vec3(1,1,0)), f.x), f.y), mix(mix(h(i + vec3(0,0,1)), h(i + vec3(1,0,1)), f.x), mix(h(i + vec3(0,1,1)), h(i + vec3(1,1,1)), f.x), f.y), f.z); }
        void main(){ vec3 V = normalize(cameraPosition - vW); float face = abs(dot(normalize(vN), V)); float t = clamp((vW.y - uBot) / (uTop - uBot), 0.0, 1.0);
          float dust = 0.65 + 0.35 * n3(vW * 2.2 + vec3(0.0, -uTime * 0.25, uTime * 0.07));
          float a = pow(face, 2.0) * (0.05 + 0.2 * t) * dust * smoothstep(0.0, 0.3, t) * uK;
          gl_FragColor = vec4(vec3(0.62, 0.72, 0.95) * a, 1.0); }` });
    const beam = new THREE.Mesh(cone, mat); beam.position.set(x, 0, z); beam.renderOrder = 7; beam.frustumCulled = false; R.scene.add(beam); WORLD.sapeBeam = beam;
    const pool = new THREE.Mesh(new THREE.CircleGeometry(r * 1.9, 32), new THREE.MeshBasicMaterial({ map: TEX.sprites.glow, color: 0x6f86b8, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0.55, fog: false }));
    pool.rotation.x = -Math.PI / 2; pool.position.set(x, fN + 0.04, z); R.scene.add(pool); WORLD.sapePool = pool;
    // Petit tas de neige tombée par le puits, au milieu de la nef.
    const sn = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 8, 0, TAU, 0, Math.PI / 2), stdMat({ color: 0xd4dce6, roughness: 0.92, map: TEX.snow.map, normalMap: TEX.snow.normalMap })); sn.scale.set(0.9, 0.12, 0.8); sn.position.set(x - 0.1, fN - 0.02, z + 0.1); sn.receiveShadow = true; R.scene.add(sn); }
}

/* ─── En surface : terril de craie au-dessus de la carrière, treuil à bras sur le puits ─── */
function sapeSurface(SM) {
  const [x, z, r] = P7_SHAFT, top = WALL_H + 1.35;
  // Plaine enneigée au-dessus de la carrière et du tunnel (la voûte est juste dessous), percée du puits.
  { const gb = new GB(), x0 = 31.6, x1 = 48.4, z0 = 65.6, z1 = 84.4, nx = 42, nz = 47, base = 0;
    for (let j = 0; j <= nz; j++) for (let i = 0; i <= nx; i++) {
      const px = lerp(x0, x1, i / nx), pz = lerp(z0, z1, j / nz), d = Math.hypot(px - x, pz - z);
      const heap = d < 6.2 ? (top - WALL_H + 0.02) * Math.pow(smooth(clamp((6.2 - d) / 5.0, 0, 1)), 1.3) : 0; // terril
      const y = WALL_H + heap + (fbm(px * 0.6, pz * 0.6, 3) - 0.5) * 0.14 * (0.3 + heap), snow = heap > 0.05 ? 0.55 + fbm(px * 2, pz * 2, 2) * 0.5 : 1;
      gb.p.push(px, d < r + 0.04 ? top : y, pz); gb.u.push(px / 3, pz / 3); gb.c.push(lerp(0.78, 0.95, snow), lerp(0.75, 0.96, snow), lerp(0.68, 1, snow)); gb.n.push(0, 1, 0);
    }
    for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) { const ia = base + j * (nx + 1) + i, ib = ia + 1, ic = ia + nx + 1, id = ic + 1;
      const cx = lerp(x0, x1, (i + 0.5) / nx), cz = lerp(z0, z1, (j + 0.5) / nz); if (Math.hypot(cx - x, cz - z) < r) continue; gb.i.push(ia, ic, ib, ib, ic, id); }
    mesh(gb.geo(true), fv('craie'), 0, 0, 0, 0, R.scene, true); }
  // Treuil à bras : deux chevalets, tambour, manivelles, corde.
  { const g = new THREE.Group(); g.position.set(x, top, z); R.scene.add(g); const W = fmat('boisBrut', 0x7a6a56, { rough: 0.9, snow: 1 });
    for (const s of [-1.25, 1.25]) for (const a of [-0.42, 0.42]) { const l = mesh(boxG(0.12, 1.9, 0.12), W, s, 0.85, a * 0.9, 0, g); l.rotation.x = a; }
    const drum = mesh(new THREE.CylinderGeometry(0.16, 0.16, 2.3, 12), W, 0, 1.62, 0, 0, g); drum.rotation.z = Math.PI / 2;
    for (const s of [-1.35, 1.35]) { mesh(boxG(0.05, 0.42, 0.05), MATS.iron, s, 1.45, 0.18, 0, g); mesh(boxG(0.05, 0.05, 0.28), MATS.iron, s * 1.04, 1.27, 0.3, 0, g); }
    mesh(boxG(2.6, 0.1, 0.1), W, 0, 0.12, 1.0, 0, g); mesh(boxG(2.6, 0.1, 0.1), W, 0, 0.12, -1.0, 0, g);
    const fence = new Batch(boxG(0.08, 0.9, 0.08), W); for (let k = 0; k < 8; k++) { const a = (k / 8) * TAU + 0.3; fence.add(x + Math.cos(a) * (r + 0.55), top + 0.3, z + Math.sin(a) * (r + 0.55), rand(TAU), rand(-0.1, 0.1)); } fence.build(); }
}

// Animation de la Sape (tous les postes) : cierges qui vacillent, seau qui tourne, poussière et flocons dans le faisceau.
function sapeAnim(dt, time) {
  const F = WORLD.sapeFlames; if (!F) return;
  const near = Math.hypot(P.pos.x - 41, P.pos.z - 75) < 26 && P.pos.y < 1.5;
  if (near) for (const f of F) { const k = 0.82 + 0.18 * Math.sin(time * 9 + f.k) * Math.sin(time * 5.3 + f.k * 2); f.s.scale.y = f.b * k; f.s.material.opacity = 0.75 + 0.2 * k; }
  if (WORLD.sapeBucket) WORLD.sapeBucket.rotation.y += dt * 0.25;
  if (WORLD.sapeBeam) WORLD.sapeBeam.material.uniforms.uTime.value = time;
  if (R.lights.mine) R.lights.mine.userData.flick = 0.85 + 0.15 * Math.sin(time * 8.3) * Math.sin(time * 3.1);
  const ev = AUBE_FX.flick > 0 || (QUEST.stage === 13 && QUEST.fuse > 0); // (géophone, explosion, mise à feu : 11f_aube.js)
  SAPE_GLOW.k.value = ev && Math.random() < 0.4 ? 0.2 : 0.97 + 0.03 * Math.sin(time * 6.1) * Math.sin(time * 2.3);
  if (WORLD.sapeRed) WORLD.sapeRed.material.opacity = Math.sin(time * 3) > -0.2 ? 0.9 : 0.25;
  // Flocons qui descendent dans le faisceau (seulement quand on est dans la carrière ou au-dessus).
  if (near && Math.random() < dt * 14) { const [x, z] = P7_SHAFT, a = rand(TAU), rr = Math.sqrt(Math.random()) * 0.85;
    FX.glow.spawn(x + Math.cos(a) * rr, 2.1, z + Math.sin(a) * rr, rand(-0.08, 0.08), -rand(0.45, 0.7), rand(-0.08, 0.08), rand(6, 8.5), rand(0.02, 0.035), 0.85, 0.9, 1, 0.55, 0, 0.05, 0); }
}
