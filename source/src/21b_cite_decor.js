/* ═══════════════════ CITÉ ATOMIQUE : DÉCOR ═══════════════════ */

function citeDecor() {
  const X = CITE.X, k = kitMats(), L = R.lights;
  rng = mulberry32(1957);
  for (const p of WORLD.perks) p.col = MAP.props.find((b) => Math.abs((b.x0 + b.x1) / 2 - p.pos.x) < 0.05 && Math.abs((b.z0 + b.z1) / 2 - p.pos.z) < 0.05);
  const shingle = fv(['shingle', 0xb07a62]), shingleG = fv(['shingle', 0x7c8c9a]);

  /* ── Toitures, porches, cheminées ── */
  kGable(X(4), X(7), X(15), X(15), 3.35, 2.5, shingle, 0.55, fv(['siding', 0xf2d57a]));
  kGable(X(15), X(9), X(20), X(15), 3.35, 1.7, shingle, 0.45, fv(['siding', 0xf2d57a]));
  kGable(X(22), X(23), X(33), X(31), 3.35, 2.5, shingleG, 0.55, fv(['siding', 0xa6dbb8]));
  kGable(X(17), X(23), X(22), X(29), 3.35, 1.7, shingleG, 0.45, fv(['siding', 0xa6dbb8]));
  kChimney(X(6) + 1, X(9), 3.35, 4.0, fmat('brick', 0xffffff)); kChimney(X(30) + 1, X(29), 3.35, 4.0, fmat('brick', 0xffffff));
  kAntenna(X(12), X(11), 5.2); kAntenna(X(25), X(27), 5.2);
  const porch = (x0, z0, x1, z1, mat) => { const g = KIT.g(0, 0); KIT.b(g, (x0 + x1) / 2, 2.62, (z0 + z1) / 2, x1 - x0 + 0.6, 0.1, z1 - z0 + 0.5, mat); for (const [a, b] of [[x0 + 0.1, z1 - 0.1], [x1 - 0.1, z1 - 0.1], [x0 + 0.1, z0 + 0.1], [x1 - 0.1, z0 + 0.1]]) KIT.b(g, a, 1.3, b, 0.1, 2.6, 0.1, k.white); };
  porch(X(8), X(15), X(9), X(16), fmat('shingle', 0xb07a62)); porch(X(9), X(6), X(10), X(7), fmat('shingle', 0xb07a62));
  porch(X(26), X(22), X(27), X(23), fmat('shingle', 0x7c8c9a)); porch(X(28), X(31), X(29), X(32), fmat('shingle', 0x7c8c9a));
  // Portes de garage (façade côté rue).
  for (const [x0, x1, z, col, s] of [[X(15), X(20), X(15), 0xf6f2e6, 1], [X(17), X(22), X(23), 0xf6f2e6, -1]]) {
    const g = KIT.g((x0 + x1) / 2, z + s * 0.1); for (let i = 0; i < 4; i++) KIT.b(g, 0, 0.35 + i * 0.55, 0, x1 - x0 - 1.0, 0.5, 0.04, KIT.m(col, { rough: 0.5 }));
    for (let i = 0; i < 4; i++) KIT.b(g, -3 + i * 2, 1.85, s * 0.03, 1.2, 0.3, 0.02, k.glass, 0, false);
  }
  // Boîtes aux lettres, massifs, allées.
  kMailbox(X(7) + 0.4, X(16) + 0.4, 0, 0xc2443a); kMailbox(X(28) - 0.4, X(22) + 1.6, Math.PI, 0x2e6a8a);
  for (const x of [X(5), X(6) + 1, X(10) + 1, X(12), X(13) + 1]) kShrub(x, X(15) + 0.6, 0.8, 0x5a8a42);
  for (const x of [X(23), X(24), X(29) + 1, X(31)]) kShrub(x, X(23) - 0.6, 0.8, 0x4f7a3a);

  /* ── La rue ── */
  const line = fmat('plain', 0xe0b83a, { rough: 0.8 }), white = fmat('plain', 0xe8e4da, { rough: 0.8 });
  for (let x = X(2) + 1; x < X(34); x += 3.2) KIT.b(R.scene, x, 0.012, X(19), 1.6, 0.01, 0.14, line, 0, false);
  for (let i = 0; i < 6; i++) KIT.b(R.scene, X(27) + 0.4 + i * 0.55, 0.012, X(17) + 0.9, 0.3, 0.01, 1.6, white, 0, false); // passage piéton vers l'abri
  const curb = fmat('plain', 0xb8b2a6, { rough: 0.9 });
  for (const z of [X(17), X(21)]) KIT.b(R.scene, (X(2) + X(34)) / 2, 0.05, z, X(34) - X(2), 0.1, 0.18, curb, 0, false);
  const lw = kLampPost(X(10), X(16) + 0.35, -Math.PI / 2, L.lampW), le = kLampPost(X(31) + 1, X(21) + 1.65, Math.PI / 2, L.lampE);
  kLampPost(X(37) + 1, X(13) + 0.6, -Math.PI / 2);
  kHydrant(X(14) + 1, X(16) + 1.4); kHydrant(X(24), X(21) + 0.5);
  kTrash(X(21), X(16) + 0.6); kTrash(X(3), X(21) + 1.2);
  kStopSign(X(33) + 1.6, X(21) + 1.6, Math.PI);
  kSign(X(2) + 0.5, X(16) + 0.4, Math.PI / 2, ['ZONE D\'ESSAIS', 'ACCÈS INTERDIT'], '#e8d24a', '#1a1a1a');
  kBench(X(19) + 1, X(22) + 1.3, Math.PI);
  for (const [x, z] of [[X(4), X(18)], [X(4) + 0.8, X(19) + 1], [X(38), X(20)], [X(37) + 1, X(22) + 1.5], [X(30), X(17) + 0.4]]) kCone(x, z);
  // Car scolaire brûlé et camion de déménagement renversant ses meubles.
  kBus(X(22) + 0.6, X(17) + 1.9, 0.05, true);
  WORLD.fires.push({ x: X(25), y: 1.4, z: X(17) + 1.9, size: 0.9, rate: 0.05, t: 0, smoke: 0.12, light: L.busFire });
  if (L.busFire) L.busFire.position.set(X(25), 1.8, X(17) + 1.9);
  kTruck(X(12), X(20) + 0.2, Math.PI + 0.04);
  kSofa(X(5) + 1.5, X(19) + 0.8, 1.9, k.fabricRed); kArmchair(X(7) + 0.6, X(18) + 0.7, -0.6); crate(X(6) + 1.4, X(20) + 0.6, 0.4); crate(X(6) + 1.6, X(20) + 0.5, -0.2, 0.8, 0.55);
  kCar(X(37), X(17) + 1.4, 1.25, 0xc9d9df, true); kCar(X(17) + 1, X(12) + 1, Math.PI / 2, 0xd9636a); kCar(X(19) + 0.4, X(25) + 1, -Math.PI / 2 + 0.03, 0x6fb7c8);
  // Panneau POPULATION (décompte des morts), à l'entrée ouest.
  { const c = makeCanvas(512, 320), tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
    const g = KIT.g(X(1) + 0.4, X(15) + 1, Math.PI / 2); for (const s of [-1, 1]) KIT.b(g, s * 1.5, 1.6, 0, 0.14, 3.2, 0.14, k.woodDark);
    mesh(new THREE.PlaneGeometry(3.6, 2.25), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.8 }), 0, 2.6, 0.08, 0, g, false);
    const back = mesh(new THREE.PlaneGeometry(3.6, 2.25), k.woodDark, 0, 2.6, 0.06, Math.PI, g, false);
    g.userData.dynamic = true; WORLD.popSign = { canvas: c, tex }; drawPopSign(1954); }

  /* ── Maison jaune : intérieur ── */
  kSofa(X(6) + 1, X(13) + 1.2, Math.PI, k.fabricTeal); kArmchair(X(7) + 0.4, X(11) + 0.9, -0.4); kTV(X(6) + 1, X(10) + 0.55, 0);
  kTable(X(6) + 1, X(12) + 0.8, 0, 1.1, 0.55, 0.42, k.woodDark); kLamp(X(8) + 1.4, X(14) + 1.4, 0); kRug(X(6) + 1, X(12) + 0.6, 0, 3.2, 2.2, 0x8a3b32);
  kCounter(X(11) + 1, X(10) + 0.33, 0, 4.2); kFridge(X(14) + 1.4, X(10) + 0.4, 0); kStove(X(9) + 0.5, X(10) + 0.36, 0); kDining(X(11) + 1, X(13), 0);
  kBed(X(6), X(7) + 1.1, 0); kDresser(X(8) + 1.7, X(9) + 0.8, -Math.PI / 2);
  { const g = KIT.g(X(13) + 0.4, X(7) + 0.5, 0); KIT.b(g, 0, 0.3, 0, 1.6, 0.6, 0.75, k.white); KIT.b(g, 0, 0.58, 0, 1.45, 0.05, 0.62, fmat('plain', 0x9ad0e0, { rough: 0.1 })); KIT.solid(g, 1.6, 0.75, 0.6); } // baignoire
  for (const p of [[X(15) + 1.2, X(9) + 0.3], [X(18) + 0.6, X(9) + 0.3]]) kShelf(p[0], p[1], 0, 1.4, 1.9);
  kTires(X(19) + 1.4, X(14) + 1.3, 3);

  // Tableaux et plafonniers.
  kFrame(X(4) + 0.1, 1.6, X(12), Math.PI / 2, 0.8, 0.9, 0); kFrame(X(11), 1.7, X(10) + 0.1, 0, 0.6, 0.8, 1); kFrame(X(6), 1.7, X(7) + 0.1, 0, 0.9, 0.7, 2); kFrame(X(9) - 0.1, 1.6, X(13), -Math.PI / 2, 0.7, 0.9, 3);
  kFrame(X(22) + 0.1, 1.6, X(25), Math.PI / 2, 0.8, 0.9, 4); kFrame(X(25), 1.7, X(27) - 0.1, Math.PI, 0.9, 0.7, 5); kFrame(X(27) + 0.1, 1.6, X(29), Math.PI / 2, 0.6, 0.8, 6); kFrame(X(30), 1.7, X(23) + 0.1, 0, 0.7, 0.9, 7);
  for (const [x, z] of [[X(6) + 1, X(12) + 1], [X(12), X(12) + 1], [X(6) + 1, X(8) + 1], [X(12), X(8) + 1], [X(17) + 1, X(12)], [X(25), X(24) + 1], [X(30) + 1, X(24) + 1], [X(24), X(28) + 1], [X(30), X(28) + 1], [X(19), X(25) + 1]]) kCeilLamp(x, z);
  /* ── Maison verte : intérieur ── */
  kSofa(X(24), X(22) + 0.6 + 2.8, 0, k.fabricMustard); kTV(X(24), X(26) + 1.4, Math.PI); kArmchair(X(26) + 1.2, X(24) + 1, -Math.PI / 2); kRug(X(24), X(25), 0, 3, 2.4, 0x2f5a6a);
  kLamp(X(22) + 0.5, X(23) + 0.5, 0);
  kCounter(X(32) + 1.62, X(24) + 1, -Math.PI / 2, 3.6, 0xe6efe6, 0x2f7a6a); kFridge(X(30) + 1, X(23) + 0.42, 0, 0xe8e2d0); kDining(X(30), X(25) + 0.2, Math.PI / 2);
  kBed(X(24), X(30) + 0.9, Math.PI, k.fabricTeal); kDresser(X(22) + 0.3, X(28), Math.PI / 2);
  kShelf(X(31), X(30) + 1.7, Math.PI, 1.6, 1.9); { const g = KIT.g(X(28) + 1, X(30) + 1.4, Math.PI); KIT.b(g, 0, 0.45, 0, 0.8, 0.9, 0.7, k.white); KIT.c(g, 0, 0.6, 0.36, 0.22, 0.22, 0.02, k.glass, 16, false).rotation.x = Math.PI / 2; KIT.solid(g, 0.8, 0.7, 0.9, 'metal'); } // machine à laver
  kShelf(X(17) + 0.3, X(26) + 1, Math.PI / 2, 1.4, 1.9); kTires(X(20) + 1.4, X(27) + 1.4, 2);

  /* ── Finitions des intérieurs : placards hauts, salles de bains, plantes, bibliothèques ── */
  kUpperCab(X(11) + 1, X(10) + 0.2, 0, 4.0); kUpperCab(X(33) - 0.2, X(24) + 1, -Math.PI / 2, 3.4, 0xe6efe6);
  kToilet(X(10) + 0.5, X(7) + 0.35, 0); kSink(X(11) + 1.1, X(7) + 0.25, 0);
  kToilet(X(30) + 0.5, X(31) - 0.35, Math.PI); kSink(X(31) + 1.0, X(31) - 0.25, Math.PI);
  kPlant(X(4) + 0.5, X(14) + 1.5, 1.2); kPlant(X(22) + 0.5, X(26) + 1.5, 1.2); kPlant(X(14) + 1.5, X(14) + 1.5, 0.9, 0x3a6a8a); kPlant(X(32) + 1.5, X(26) + 1.5, 0.9, 0x3a6a8a);
  kBookcase(X(4) + 0.2, X(11), Math.PI / 2, 1.2, 2.0); kBookcase(X(27) - 0.2, X(25), -Math.PI / 2, 1.2, 2.0);
  /* ── Jardins ── */
  kSwing(X(5) + 1, X(1) + 1, 0); kGrill(X(13), X(4) + 1, 0); kPicnic(X(16), X(2) + 1, 0.1); kDoghouse(X(19) + 1, X(0) + 1.2, -0.3);
  kClothesline(X(12), X(1) + 0.6, 0); kPool(X(4) + 1, X(5), 1.3);
  kSwing(X(33), X(35) + 1, 0.2); kPool(X(22), X(34) + 1, 1.5); kClothesline(X(26), X(36) + 0.6, 0); kGrill(X(31) + 1, X(32) + 1, 0); kPicnic(X(20) + 1, X(36), Math.PI / 2);
  { const g = KIT.g(X(35), X(31) + 1.4, 0); KIT.b(g, 0, 1.1, 0, 2.2, 2.2, 1.8, fmat('planks', 0x9a6a4a)); KIT.b(g, 0, 2.3, 0, 2.5, 0.12, 2.1, fmat('shingle', 0x55606a)); KIT.solid(g, 2.2, 1.8, 2.3); } // cabanon
  for (let i = 0; i < 10; i++) kShrub(X(2) + srand(0, 36), X(0) + srand(-0.2, 0.2), srand(0.6, 1), 0x4f7a3a);

  /* ── Abri antiatomique ── */
  { const g = KIT.g(X(28) + 1, X(11) + 1.02, 0);
    const trefoil = textTexture(256, 256, (c) => { c.fillStyle = '#e8c21a'; c.fillRect(0, 0, 256, 256); c.fillStyle = '#111'; c.beginPath(); c.arc(128, 128, 20, 0, TAU); c.fill(); for (let i = 0; i < 3; i++) { const a = -Math.PI / 2 + i * TAU / 3; c.beginPath(); c.moveTo(128, 128); c.arc(128, 128, 100, a - 0.52, a + 0.52); c.closePath(); c.fill(); } c.fillStyle = '#e8c21a'; c.beginPath(); c.arc(128, 128, 30, 0, TAU); c.fill(); c.fillStyle = '#111'; c.beginPath(); c.arc(128, 128, 20, 0, TAU); c.fill(); });
    for (const s of [-1.35, 1.35]) mesh(new THREE.PlaneGeometry(0.6, 0.6), new THREE.MeshStandardMaterial({ map: trefoil, roughness: 0.6 }), s, 1.9, 0.02, 0, g, false);
    const sign = mesh(new THREE.PlaneGeometry(2.6, 0.5), new THREE.MeshStandardMaterial({ map: woodSign(['ABRI ANTIATOMIQUE'], { w: 512, h: 100, bg: '#222', color: '#e8c21a' }), roughness: 0.6 }), 0, 3.0, 0.02, 0, g, false); }
  for (const [x, z] of [[X(25), X(4)], [X(31), X(8)], [X(27), X(9)]]) { const g = KIT.g(x, z, 0, 3.35); KIT.c(g, 0, 0.6, 0, 0.16, 0.16, 1.2, k.steel, 10); KIT.c(g, 0, 1.25, 0, 0.3, 0.3, 0.1, k.steel, 10); }
  { const bags = new Batch(sandbagGeo(), fmat('plain', 0xb8a47e, { rough: 1 })); for (let x = X(24); x < X(28); x += 0.6) for (let r = 0; r < 3; r++) bags.add(x + (r % 2) * 0.3, 0.1 + r * 0.19, X(11) + 0.4, rand(-0.1, 0.1)); for (let x = X(29) + 0.3; x < X(33); x += 0.6) for (let r = 0; r < 3; r++) bags.add(x + (r % 2) * 0.3, 0.1 + r * 0.19, X(11) + 0.4, rand(-0.1, 0.1)); bags.build(); }
  // Dortoir, salle commune, générateur.
  for (const x of [X(29) + 0.9, X(31) + 0.9]) { const g = KIT.g(x, X(3) + 1.1, 0); for (const y of [0.45, 1.5]) { KIT.b(g, 0, y, 0, 1.0, 0.08, 2.0, k.steel); KIT.b(g, 0, y + 0.1, 0, 0.92, 0.12, 1.9, k.fabricTeal); } for (const [a, b] of [[-0.48, -0.95], [0.48, -0.95], [-0.48, 0.95], [0.48, 0.95]]) KIT.b(g, a, 1.0, b, 0.05, 2.0, 0.05, k.steel); KIT.solid(g, 1.0, 2.0, 2.0, 'metal'); }
  kShelf(X(24) + 0.3, X(8) + 1, Math.PI / 2, 1.8, 2.1); kShelf(X(24) + 0.3, X(10), Math.PI / 2, 1.8, 2.1); kTable(X(29), X(8) + 1.2, 0, 2.2, 1.0);
  for (const [x, z] of [[X(32) + 1.4, X(10) + 1.4], [X(32) + 0.7, X(10) + 1.5]]) barrel(x, z, fmat('plain', 0x3a5a7a, { rough: 0.5, metal: 0.4 }));
  { const g = KIT.g(X(29) - 0.4, X(8) + 1.2, 0); KIT.b(g, 0, 0.88, 0, 0.5, 0.28, 0.3, KIT.m(0x4a4a3a)); KIT.b(g, 0.15, 0.95, 0.16, 0.12, 0.1, 0.02, k.screen, 0, false); const lamp = new THREE.MeshBasicMaterial({ color: 0x401010 }); KIT.s(g, -0.15, 1.05, 0.16, 0.03, lamp); WORLD.citeRadio = { pos: new THREE.Vector3(X(29) - 0.4, 1, X(8) + 1.2), lamp }; } // poste radio d'urgence
  WORLD.powerLamps.push(hangingLamp(X(28), 2.75, X(9), MATS.bulbRed), hangingLamp(X(25) + 1, 2.75, X(5), MATS.bulbRed));

  /* ── Station-service ── */
  { const red = fmat('plain', 0xc23b3b, { rough: 0.5 }), pil = fmat('plain', 0xf2eee4, { rough: 0.6 });
    const g = KIT.g(0, 0), cw = X(9) - X(3) + 0.5, cd = X(29) - X(25) + 0.5, ccx = (X(3) + X(9)) / 2, ccz = (X(25) + X(29)) / 2;
    for (const [dx, dz, w, d] of [[0, -cd / 2, cw, 0.08], [0, cd / 2, cw, 0.08], [-cw / 2, 0, 0.08, cd], [cw / 2, 0, 0.08, cd]]) KIT.b(g, ccx + dx, 3.25, ccz + dz, w, 0.55, d, red, 0, true); // bandeau rouge de l'auvent
    for (const [x, z] of [[X(3) + 0.4, X(25) + 0.4], [X(9) - 0.4, X(25) + 0.4], [X(3) + 0.4, X(29) - 0.4], [X(9) - 0.4, X(29) - 0.4]]) { KIT.b(g, x, 1.5, z, 0.3, 3.0, 0.3, pil); colliderBox(x, z, 0.3, 0.3, 0, 3, 'concrete'); }
    WORLD.canopyGlow = [];
    for (const [x, z] of [[X(5), X(26)], [X(7), X(26)], [X(5), X(28)], [X(7), X(28)]]) { KIT.b(g, x, 2.97, z, 1.2, 0.04, 0.3, KM.bulb, 0, false); WORLD.canopyGlow.push(KIT.glow(g, x, 2.85, z, 0xe8f4ff, 2.2, 0)); }
    if (L.canopy) L.canopy.position.set(X(6), 2.7, X(27));
    for (const x of [X(5), X(7)]) { const p = KIT.g(x, X(27), 0); KIT.b(p, 0, 0.1, 0, 2.6, 0.2, 1.0, fmat('slab', 0xaaa59a)); for (const o of [-0.7, 0.7]) { KIT.b(p, o, 0.95, 0, 0.5, 1.5, 0.4, red); KIT.b(p, o, 1.85, 0, 0.44, 0.34, 0.34, fmat('plain', 0xf2eee4, { rough: 0.3 })); KIT.b(p, o, 1.1, 0.21, 0.3, 0.3, 0.02, k.screen, 0, false); const h = KIT.c(p, o + 0.2, 0.9, 0.2, 0.03, 0.03, 0.5, k.black, 6); h.rotation.x = 0.5; } KIT.solid(p, 2.6, 1.0, 2.0, 'metal'); }
    // Enseigne sur mât (s'allume avec le courant).
    const sg = KIT.g(X(2) + 1, X(23) + 0.6, 0); KIT.b(sg, 0, 3, 0, 0.3, 6, 0.3, pil);
    const signTex = textTexture(512, 512, (c) => { c.fillStyle = '#f2eee4'; c.beginPath(); c.arc(256, 256, 250, 0, TAU); c.fill(); c.fillStyle = '#c23b3b'; c.beginPath(); c.arc(256, 256, 226, 0, TAU); c.fill(); c.strokeStyle = '#f2eee4'; c.lineWidth = 12; for (let i = 0; i < 3; i++) { c.save(); c.translate(256, 230); c.rotate(i * Math.PI / 3); c.beginPath(); c.ellipse(0, 0, 150, 52, 0, 0, TAU); c.stroke(); c.restore(); } c.fillStyle = '#f2eee4'; c.beginPath(); c.arc(256, 230, 22, 0, TAU); c.fill(); c.font = font(92); c.textAlign = 'center'; c.fillText('URANIA', 256, 420); });
    const sm = new THREE.MeshStandardMaterial({ map: signTex, emissive: 0xffffff, emissiveMap: signTex, emissiveIntensity: 0.08, roughness: 0.4 });
    for (const s of [1, -1]) { const d = mesh(new THREE.CircleGeometry(1.6, 32), sm, 0, 6.6, s * 0.16, s > 0 ? 0 : Math.PI, sg, false); }
    KIT.c(sg, 0, 6.6, 0, 1.62, 1.62, 0.3, pil, 32).rotation.x = Math.PI / 2;
    WORLD.gasSign = { material: sm };
    colliderBox(X(2) + 1, X(23) + 0.6, 0.3, 0.3, 0, 6, 'concrete'); }
  { const g = KIT.g(X(12) + 1, X(26) + 1.2, Math.PI / 2); KIT.b(g, 0, 0.5, 0, 2.6, 1.0, 0.6, fmat('plain', 0xc23b3b, { rough: 0.4 })); KIT.b(g, 0, 1.02, 0, 2.7, 0.05, 0.7, fmat('plain', 0xf2eee4, { rough: 0.3 })); KIT.b(g, 0.7, 1.2, 0, 0.4, 0.3, 0.35, k.steel); KIT.solid(g, 2.6, 0.6, 1.05); } // comptoir
  kShelf(X(15) + 1.6, X(24) + 1.2, -Math.PI / 2, 1.6, 1.8); kShelf(X(13), X(28) + 1.6, Math.PI, 1.6, 1.8);
  for (let i = 0; i < 6; i++) barrel(X(10) + 0.5 + (i % 3) * 0.62, X(32) + 1.4 - Math.floor(i / 3) * 0.6, fmat('plain', [0xc23b3b, 0x2e6a8a, 0xe8c21a][i % 3], { rough: 0.5, metal: 0.4 }));
  kTires(X(15) + 1.3, X(29) + 0.7, 4); kCar(X(12) + 1.4, X(30) + 1.4, Math.PI / 2 + 0.05, 0x3a4a6a);

  /* ── Mannequins : les six marqués d'un foulard rouge, et leurs voisins ── */
  const scarf = stdMat({ color: 0xc81e1e, roughness: 0.8, map: TEX.cloth.map });
  WORLD.citeHeads = [];
  const quest = [[X(9) + 1.2, X(15) + 1.2, 0, 'stand'], [X(6) + 0.2, X(13) + 1.3, Math.PI, 'sit', 0.08], [X(32) + 0.9, X(25) + 1.2, -Math.PI / 2, 'point'], [X(29) + 0.9, X(3) + 0.8, Math.PI / 2, 'sit', 1.05], [X(34), X(36), -0.4, 'wave'], [X(13) + 0.2, X(26) + 1.2, Math.PI / 2, 'stand']];
  quest.forEach(([x, z, ry, pose, y = 0], i) => {
    const m = kMannequin(x, z, ry, { pose, y, cloth: [0x3a5a8a, 0x8a3a5a, 0x3a7a5a, 0x7a6a3a, 0x5a3a7a, 0x2a2a2a][i] });
    const hp = m.head.getWorldPosition(new THREE.Vector3());
    const sc = mesh(new THREE.TorusGeometry(0.075, 0.03, 6, 14), scarf, 0, m.head.position.y - 0.17, 0, 0, m.g, false); sc.rotation.x = Math.PI / 2;
    const col = { x0: hp.x - 0.14, x1: hp.x + 0.14, z0: hp.z - 0.14, z1: hp.z + 0.14, y0: hp.y - 0.15, y1: hp.y + 0.16, mat: 'wood', tag: 'mh:' + i };
    MAP.props.push(col);
    WORLD.citeHeads.push({ head: m.head, col, pos: hp, shot: false });
  });
  // Mannequins de décor (têtes fusionnées avec le reste).
  for (const [x, z, ry, pose, y = 0, cloth] of [[X(4) + 1, X(22) + 0.6, 0.4, 'stand', 0, 0x8a3a5a], [X(5) + 1, X(22) + 1.4, -0.3, 'wave', 0, 0x3a5a8a], [X(26) + 1.2, X(8) + 1.4, 0, 'sit', 0.35], [X(10) + 1, X(12) + 0.2, 0, 'sit', 0.05, 0x7a6a3a], [X(12) + 1, X(13) + 1.7, Math.PI, 'sit', 0.05],
    [X(24) + 1.4, X(23) + 0.9, Math.PI + 0.2, 'sit', 0.08, 0x3a7a5a], [X(3) + 1, X(33) + 1, 1.2, 'stand'], [X(29), X(36) + 1, 2.2, 'point', 0, 0x7a6a3a], [X(7) + 1.6, X(25) + 1.4, -1.2, 'stand', 0, 0x3a5a8a], [X(38), X(24) + 1.5, 2.8, 'stand'], [X(36) + 1, X(14) + 1, -2, 'wave', 0, 0x5a3a7a], [X(20) + 1.2, X(13), -Math.PI / 2, 'stand', 0, 0x2a2a2a]])
    { const m = kMannequin(x, z, ry, { pose, y, cloth }); m.head.userData.dynamic = false; }

  /* ── Au loin : désert, mesas, château d'eau, tour d'essai, gradins, pylônes, champignon atomique ── */
  citeFar();
}

function citeFar() {
  const k = kitMats(), rock = fmat('rock', 0xc28a66), rockDark = fmat('rock', 0x8a5a44);
  // Mesas : cylindres irréguliers aux flancs striés.
  const r = mulberry32(21);
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * TAU + r() * 0.4, d = 170 + r() * 110, x = 50 + Math.cos(a) * d, z = 48 + Math.sin(a) * d, rad = 18 + r() * 26, h = 14 + r() * 30;
    const geo = new THREE.CylinderGeometry(rad * (0.75 + r() * 0.2), rad, h, 18, 5), p = geo.attributes.position;
    for (let j = 0; j < p.count; j++) { const px = p.getX(j), py = p.getY(j), pz = p.getZ(j), an = Math.atan2(pz, px), n = 1 + (fbm(an * 3 + i, py * 0.1, 2) - 0.5) * 0.35; p.setX(j, px * n); p.setZ(j, pz * n); }
    geo.computeVertexNormals(); const m = mesh(geo, r() > 0.5 ? rock : rockDark, x, h / 2 - 1, z, r() * TAU, R.scene, false);
  }
  // Château d'eau.
  { const g = KIT.g(118, 8, 0), m = fmat('plain', 0xd8d2c4, { rough: 0.6, metal: 0.3 });
    for (const [a, b] of [[-2.2, -2.2], [2.2, -2.2], [-2.2, 2.2], [2.2, 2.2]]) { const l = KIT.b(g, a, 9, b, 0.3, 18, 0.3, k.steel); l.rotation.x = -b * 0.03; l.rotation.z = a * 0.03; }
    KIT.c(g, 0, 21, 0, 4.2, 4.2, 6, m, 24); const cap = KIT.c(g, 0, 25, 0, 0.3, 4.4, 2.2, m, 24);
    const lab = mesh(new THREE.CylinderGeometry(4.22, 4.22, 1.6, 24, 1, true, -0.9, 1.8), new THREE.MeshStandardMaterial({ map: woodSign(['CITÉ ATOMIQUE'], { w: 1024, h: 120, bg: '#d8d2c4', color: '#7a2a22' }), roughness: 0.6 }), 0, 21.4, 0, 0, g, false); lab.rotation.y = -Math.PI / 2 - 0.2; }
  // Tour d'essai métallique au nord.
  { const g = KIT.g(46, -150, 0);
    for (const [a, b] of [[-4, -4], [4, -4], [-4, 4], [4, 4]]) { const l = KIT.b(g, a * 0.6, 22, b * 0.6, 0.5, 44, 0.5, k.steel); l.rotation.x = -b * 0.05; l.rotation.z = a * 0.05; }
    for (let y = 4; y < 44; y += 6) for (const s of [-1, 1]) { KIT.b(g, 0, y, s * (4 - y * 0.03), 8 - y * 0.06, 0.25, 0.25, k.steel); KIT.b(g, s * (4 - y * 0.03), y, 0, 0.25, 0.25, 8 - y * 0.06, k.steel); }
    KIT.b(g, 0, 45, 0, 5, 3, 5, fmat('plain', 0x8a8a84)); }
  // Gradins des observateurs.
  { const g = KIT.g(150, 70, -1.2); for (let i = 0; i < 6; i++) KIT.b(g, 0, 0.5 + i * 0.6, i * 0.9, 18, 0.25, 0.9, fmat('planks', 0x9a8a70)); for (let i = 0; i < 4; i++) KIT.b(g, -8 + i * 5.3, 2, 2.5, 0.25, 4, 0.25, k.steel); }
  // Maisons témoins lointaines, carbonisées.
  for (const [x, z, ry] of [[-60, 20, 0.3], [-70, 70, -0.2], [140, -20, 1.1], [120, 120, 0.6], [30, 150, 0.1]]) {
    const g = KIT.g(x, z, ry), ch = fmat('plain', 0x2a2420, { rough: 1 });
    KIT.b(g, 0, 1.6, 0, 12, 3.2, 8, ch); const rf = KIT.b(g, 0, 4, 0, 12.5, 0.3, 6, ch); rf.rotation.z = 0.2; KIT.b(g, 4, 3.5, 2, 0.8, 3, 0.8, fmat('brick', 0x8a7a70));
  }
  // Pylônes électriques le long de la route vers l'ouest.
  { const lines = [], pole = new Batch(new THREE.CylinderGeometry(0.14, 0.2, 9, 7), MATS.post), bar = new Batch(boxG(2.4, 0.14, 0.14), MATS.post); let prev = null;
    for (let x = -120; x <= 10; x += 18) { const z = 38 + Math.sin(x * 0.03) * 2, y = surfH(x, z); pole.add(x, y + 4.4, z); bar.add(x, y + 8.4, z, Math.PI / 2); if (prev) for (const o of [-1, 1]) for (let s = 0; s < 6; s++) { const t0 = s / 6, t1 = (s + 1) / 6; lines.push(lerp(prev[0], x, t0), lerp(prev[1], y + 8.5, t0) - Math.sin(t0 * Math.PI) * 0.8, lerp(prev[2], z, t0) + o, lerp(prev[0], x, t1), lerp(prev[1], y + 8.5, t1) - Math.sin(t1 * Math.PI) * 0.8, lerp(prev[2], z, t1) + o); } prev = [x, y + 8.5, z]; }
    pole.build(); bar.build(); const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(lines, 3)); R.scene.add(new THREE.LineSegments(g, MATS.wire)); }
  // Clôture d'enceinte du site, avec panneaux.
  { const posts = new Batch(boxG(0.1, 2.2, 0.1), k.steel), wire = []; const cx = 50, cz = 48, rr = 64;
    for (let i = 0; i < 64; i++) { const a0 = (i / 64) * TAU, a1 = ((i + 1) / 64) * TAU, x0 = cx + Math.cos(a0) * rr * 1.1, z0 = cz + Math.sin(a0) * rr, x1 = cx + Math.cos(a1) * rr * 1.1, z1 = cz + Math.sin(a1) * rr; const y0 = surfH(x0, z0), y1 = surfH(x1, z1); posts.add(x0, y0 + 1.1, z0); for (const h of [0.5, 1.1, 1.7, 2.1]) wire.push(x0, y0 + h, z0, x1, y1 + h, z1); }
    posts.build(); const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(wire, 3)); R.scene.add(new THREE.LineSegments(g, MATS.wire)); }
  citeCloud();
}

// Champignon atomique au loin : pied et chapeau de fumée bouillonnante, cœur incandescent.
function citeCloud() {
  const mat = new THREE.ShaderMaterial({
    fog: false, transparent: true, depthWrite: false,
    uniforms: { uTime: { value: 0 }, uFog: { value: FOG_COLOR } },
    vertexShader: `uniform float uTime; varying vec3 vP; varying vec3 vN; varying float vH;
      float h3(vec3 p){ return fract(sin(dot(p, vec3(12.9, 78.2, 37.7))) * 43758.5); }
      float n3(vec3 p){ vec3 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f); return mix(mix(mix(h3(i), h3(i+vec3(1,0,0)), f.x), mix(h3(i+vec3(0,1,0)), h3(i+vec3(1,1,0)), f.x), f.y), mix(mix(h3(i+vec3(0,0,1)), h3(i+vec3(1,0,1)), f.x), mix(h3(i+vec3(0,1,1)), h3(i+vec3(1,1,1)), f.x), f.y), f.z); }
      void main(){ vec3 p = position; float t = uTime * 0.05; float d = n3(p * 0.035 + vec3(0.0, -t, t)) * 0.6 + n3(p * 0.09 + vec3(t, t * 0.5, 0.0)) * 0.4; p += normal * (d - 0.5) * 26.0; vP = p; vN = normalize(normalMatrix * normal); vH = position.y; gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0); }`,
    fragmentShader: `uniform float uTime; uniform vec3 uFog; varying vec3 vP; varying vec3 vN; varying float vH;
      void main(){ float rim = pow(1.0 - abs(vN.z), 1.5); float heat = smoothstep(260.0, 120.0, vH) * 0.55 + smoothstep(40.0, 0.0, abs(vH - 250.0)) * 0.25;
        vec3 smoke = mix(vec3(0.22, 0.14, 0.12), vec3(0.62, 0.4, 0.3), clamp(vN.y * 0.5 + 0.5, 0.0, 1.0));
        vec3 fire = vec3(1.0, 0.5, 0.18) * (1.6 + 0.4 * sin(uTime * 0.7 + vH * 0.03));
        vec3 c = mix(smoke, fire, heat * (0.55 + rim * 0.45));
        c = mix(c, uFog, 0.3);
        gl_FragColor = vec4(c, 0.93 - rim * 0.25); }`,
  });
  const g = new THREE.Group(); g.position.set(330, -8, -380); g.scale.setScalar(0.95); R.scene.add(g);
  const stem = new THREE.CylinderGeometry(24, 46, 230, 24, 12); stem.translate(0, 115, 0);
  const cap = new THREE.SphereGeometry(95, 32, 18); cap.scale(1.35, 0.62, 1.35); cap.translate(0, 265, 0);
  const ring = new THREE.TorusGeometry(80, 26, 12, 32); ring.rotateX(Math.PI / 2); ring.translate(0, 240, 0);
  const base = new THREE.SphereGeometry(80, 24, 12); base.scale(1.4, 0.35, 1.4); base.translate(0, 10, 0);
  for (const geo of [stem, cap, ring, base]) { const m = new THREE.Mesh(geo, mat); m.frustumCulled = false; m.renderOrder = -5; g.add(m); }
  WORLD.cloud = mat;
}
