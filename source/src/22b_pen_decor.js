/* ═══════════════════ LE PÉNITENCIER : DÉCOR ═══════════════════ */

function penDecor() {
  const X = PEN.X, k = kitMats(), L = R.lights;
  rng = mulberry32(1934);
  // Familles photo (OBJ_FAM) : acier des lits, étagères et dessus de tables, fer noir (coursives, bittes, ferrures, coffre-fort),
  // toile des matelas et draps, laine grise des couvertures, porcelaine des cellules, tôle peinte (bouclier, grue), cuir (sangles,
  // fauteuil du directeur), bois brut (établi, pilotis, citernes), bois peint (vedette, guérites des miradors).
  const steel = k.steel, dark = fmat('fonte', 0x2a2c2e, { rough: 0.6, metal: 0.5 }), sheet = fmat('toile', 0xe6e2d8, { rough: 1 }), rust = MATS.rust;
  const wool = fmat('tissu', 0x6a6a64, { rough: 1 }), china = fmat('email', 0xe8e8e2, { rough: 0.3 }), plate = fmat('tole', 0x6a6e70, { rough: 0.4, metal: 0.8 }), strap = fmat('cuir', 0x5a3a22, { rough: 0.8 });

  /* ── Bloc cellulaire : mobilier des cellules, coursives, lampes ── */
  const cellFurn = (x, z, face) => { // face : +1 = cellule au nord (on regarde vers le sud), -1 = au sud
    const g = KIT.g(x, z, face > 0 ? 0 : Math.PI);
    KIT.b(g, -0.62, 0.42, 0, 0.7, 0.06, 1.8, steel); KIT.b(g, -0.62, 0.5, 0, 0.66, 0.1, 1.7, sheet); KIT.b(g, -0.62, 0.565, 0.2, 0.68, 0.03, 1.25, wool); // couchette de fer, matelas de toile, couverture de laine grise
    for (const [a, b] of [[-0.95, -0.85], [-0.3, -0.85], [-0.95, 0.85], [-0.3, 0.85]]) KIT.b(g, a, 0.21, b, 0.04, 0.42, 0.04, steel);
    KIT.c(g, 0.62, 0.2, -0.72, 0.17, 0.14, 0.4, china, 10); // cuvette
    KIT.b(g, 0.7, 0.85, -0.2, 0.34, 0.1, 0.3, china); // lavabo
    KIT.b(g, 0.55, 1.6, -0.86, 0.8, 0.04, 0.2, steel); /* tablette d'acier peint, comme à Alcatraz */ for (let i = 0; i < 4; i++) KIT.b(g, 0.3 + i * 0.12, 1.72, -0.86, 0.08, 0.22, 0.16, KIT.m([0x7a2a22, 0x2a4a6a, 0x5a5a3a, 0x3a2a4a][i]), 0, false);
  };
  const CZ = { n: 9, s: 13 };
  for (let x = 11; x <= 32; x++) {
    if (![16, 22, 28, 12, 19, 25, 31].includes(x)) cellFurn(X(x) + 1, X(CZ.n) + 1, 1);
    if (![14, 22, 29, 17, 26, 32].includes(x)) cellFurn(X(x) + 1, X(CZ.s) + 1, -1);
  }
  // Coursives de l'étage (décor) : planchers et garde-corps le long des deux rangées de cellules.
  for (const [z, s] of [[X(10) + 0.4, 1], [X(13) - 0.4, -1]]) {
    const g = KIT.g(0, 0); KIT.b(g, (X(10) + X(34)) / 2, 3.05, z, X(34) - X(10), 0.1, 0.9, dark);
    const rail = new Batch(boxG(0.05, 1.0, 0.05), dark); for (let x = X(10) + 0.3; x < X(34); x += 1.5) rail.add(x, 3.55, z + s * 0.42); rail.build();
    KIT.b(g, (X(10) + X(34)) / 2, 4.02, z + s * 0.42, X(34) - X(10), 0.06, 0.06, dark); KIT.b(g, (X(10) + X(34)) / 2, 3.6, z + s * 0.42, X(34) - X(10), 0.04, 0.04, dark);
  }
  for (const x of [X(13), X(19), X(25), X(31)]) WORLD.powerLamps.push(hangingLamp(x, 3.6, X(11) + 1, MATS.bulbRed));
  for (const [x, z, ry, lines] of [[X(10) + 0.1, X(11) + 1, Math.PI / 2, ['BLOC B', 'SILENCE']], [X(34) - 0.1, X(11) + 1, -Math.PI / 2, ['RÉFECTOIRE →', 'EN RANG']]]) { const s = mesh(new THREE.PlaneGeometry(1.4, 0.6), new THREE.MeshStandardMaterial({ map: woodSign(lines, { w: 256, h: 110, bg: '#1d2a22', color: '#e8e2c8' }), roughness: 0.7 }), x, 3.1, z, ry, R.scene, false); }

  /* ── Douches : collecteur au mur, une colonne par pomme (robinet à croisillon, col de cygne), bondes en fonte ── */
  // Pièce : x 14-28, z 28-38. Pommes sur les murs nord et sud seulement : le mur ouest porte deux fenêtres et l'arme murale,
  // la fenêtre nord est en x 20-22, l'établi du bouclier contre le mur sud en x 20-22, l'atout contre le mur est (z 28-30).
  { const brass = fmat('laiton', 0x9a7a3a, { rough: 0.45, metal: 0.8 }), pipeM = fmat('fonte', 0x5a5e5a, { rough: 0.5, metal: 0.6 }), x0 = X(2), x1 = X(9), z0 = X(9), z1 = X(14), off = EDGE_T + 0.07, yM = 2.45;
    const pipe = new Batch(new THREE.CylinderGeometry(1, 1, 1, 8), pipeM), joint = new Batch(new THREE.SphereGeometry(1, 8, 6), pipeM), clamp_ = new Batch(boxG(0.05, 0.1, 0.12), dark);
    const run = (ax, az, bx, bz, y, r) => { const L = Math.hypot(bx - ax, bz - az); pipe.add((ax + bx) / 2, y, (az + bz) / 2, Math.atan2(bx - ax, bz - az), Math.PI / 2, 0, r, L, r); }; // tuyau horizontal de a à b
    // Collecteur : murs nord, ouest et sud (il passe au-dessus des fenêtres et de l'arme), descente depuis le plafond au nord-est.
    run(x0 + off, z0 + off, x1 - 1.6, z0 + off, yM, 0.04); run(x0 + off, z0 + off, x0 + off, z1 - off, yM, 0.04); run(x0 + off, z1 - off, x1 - 0.3, z1 - off, yM, 0.04);
    for (const [x, z] of [[x0 + off, z0 + off], [x0 + off, z1 - off], [x1 - 1.6, z0 + off]]) joint.add(x, yM, z, 0, 0, 0, 0.055, 0.055, 0.055);
    pipe.add(x1 - 1.6, (yM + 4) / 2, z0 + off, 0, 0, 0, 0.04, 4 - yM, 0.04);
    { const w = mesh(new THREE.TorusGeometry(0.11, 0.015, 6, 16), MATS.rust, x1 - 1.6, 3.1, z0 + off + 0.09, 0, R.scene, false); KIT.c(R.scene, x1 - 1.6, 3.1, z0 + off + 0.045, 0.02, 0.02, 0.09, dark, 6, false).rotation.x = Math.PI / 2; } // vanne d'arrêt à volant
    for (let x = x0 + 1; x < x1 - 1; x += 1.6) for (const z of [z0 + EDGE_T + 0.025, z1 - EDGE_T - 0.025]) clamp_.add(x, yM, z);
    for (let z = z0 + 1; z < z1 - 1; z += 1.6) clamp_.add(x0 + EDGE_T + 0.025, yM, z, Math.PI / 2);
    const heads = [15.4, 16.9, 18.4, 23.6, 25.1].flatMap((x) => [[x, 1], [x, -1]]); // [x, sens : 1 = mur nord, -1 = mur sud]
    const q = new QB(decalAtlas());
    for (const [x, s] of heads) {
      const zw = s > 0 ? z0 + off : z1 - off, g = KIT.g(x, zw, s > 0 ? 0 : Math.PI);
      pipe.add(x, (1.05 + yM) / 2, zw, 0, 0, 0, 0.022, yM - 1.05, 0.022); // colonne
      KIT.c(g, 0, 1.12, 0.05, 0.035, 0.035, 0.1, brass, 10, false).rotation.x = Math.PI / 2; // corps du robinet
      for (const a of [0, Math.PI / 2]) { const h = KIT.b(g, 0, 1.12, 0.11, 0.16, 0.018, 0.018, brass, 0, false); h.rotation.z = a; } // croisillon
      const arm = KIT.c(g, 0, 2.2, 0.16, 0.016, 0.016, 0.32, pipeM, 6, false); arm.rotation.x = Math.PI / 2; // col
      const head = KIT.c(g, 0, 2.16, 0.33, 0.03, 0.075, 0.07, brass, 12, false); head.rotation.x = -0.45; // pomme, inclinée vers la pièce
      decal(q, 'rust', x, 1.75, s > 0 ? z0 + EDGE_T : z1 - EDGE_T, 0, 0, s, 0.32, 1.1, 0, 0.9); // coulure de rouille sous le col
      decal(q, 'leak', x + rand(-0.15, 0.15), 0.006, zw + s * 0.65, 0, 1, 0, rand(1.1, 1.5), rand(1.1, 1.5), rand(TAU), 1); // sol mouillé sous la pomme
    }
    const m = q.build(false); if (m) { m.renderOrder = 2; m.userData.dynamic = true; }
    pipe.build(); joint.build(); clamp_.build();
    // Bondes en fonte ajourée sur l'axe de la pièce.
    { const grate = textTexture(128, 128, (c) => { c.clearRect(0, 0, 128, 128); c.fillStyle = '#2a2826'; c.beginPath(); c.arc(64, 64, 62, 0, TAU); c.fill(); c.fillStyle = '#060606'; for (let i = 0; i < 4; i++) c.fillRect(30, 30 + i * 18, 68, 8); c.strokeStyle = '#4a4640'; c.lineWidth = 6; c.beginPath(); c.arc(64, 64, 58, 0, TAU); c.stroke(); }, { repeat: false });
      const gm = new THREE.MeshStandardMaterial({ map: grate, transparent: true, alphaTest: 0.5, roughness: 0.55, metalness: 0.6 });
      for (let i = 0; i < 4; i++) { const d = mesh(new THREE.CircleGeometry(0.15, 16), gm, X(4) + i * 2.4, 0.01, X(11) + 1, 0, R.scene, false); d.rotation.x = -Math.PI / 2; } }
    // Bancs à lattes (sans dossier) et patère à serviettes contre le mur est, au sud de la porte du bloc (z 32-34).
    const slats = fmat('boisBrut', 0x7a5a3e);
    for (const [bx, bz] of [[X(6), X(12) + 0.5], [X(6), X(10) + 0.5]]) { const b = KIT.g(bx, bz, 0); for (let i = 0; i < 3; i++) KIT.b(b, 0, 0.44, -0.12 + i * 0.12, 2.0, 0.04, 0.1, slats); for (const sx of [-0.85, 0.85]) KIT.b(b, sx, 0.21, 0, 0.06, 0.42, 0.36, dark); KIT.b(b, 0, 0.12, 0, 1.7, 0.04, 0.04, dark); KIT.solid(b, 2.0, 0.4, 0.46, 'wood'); }
    { const g = KIT.g(x1 - 0.03, X(13), -Math.PI / 2), towel = [fmat('toile', 0xd8d2c2, { rough: 1 }), fmat('toile', 0xa8a294, { rough: 1 })];
      KIT.b(g, 0, 1.72, 0, 2.4, 0.09, 0.03, fmat('boisPeint', 0x5a5e4a)); for (let i = 0; i < 5; i++) { KIT.c(g, -1.0 + i * 0.5, 1.72, 0.05, 0.012, 0.012, 0.08, brass, 6, false).rotation.x = Math.PI / 2; if (i % 2 === 0 || i === 3) { const t = KIT.b(g, -1.0 + i * 0.5, 1.4, 0.05, 0.34, 0.6, 0.02, towel[i % 2]); t.rotation.z = rand(-0.05, 0.05); } } }
    // Lampe-cage au plafond, sur la lumière des douches.
    { const g = KIT.g(X(5) + 1, X(11) + 1, 0, roomCeil(tileOf(X(5) + 1), tileOf(X(11) + 1))); KIT.c(g, 0, -0.2, 0, 0.012, 0.012, 0.4, dark, 6, false); KIT.c(g, 0, -0.42, 0, 0.06, 0.08, 0.06, dark, 10, false); KIT.s(g, 0, -0.52, 0, 0.065, KM.bulb, 1, 1.2, 1);
      for (let i = 0; i < 4; i++) { const a = (i / 4) * TAU; KIT.b(g, Math.cos(a) * 0.085, -0.53, Math.sin(a) * 0.085, 0.008, 0.18, 0.008, dark, 0, false); } KIT.glow(g, 0, -0.52, 0, 0xffe2b0, 1.2, 0.6); } }
  // Établi de fortune (bouclier).
  { const s = wallSpot(SPOTS.shieldTable, 0.5), g = KIT.g(s.x, s.z, s.yaw); g.userData.dynamic = true;
    KIT.b(g, 0, 0.9, 0, 1.9, 0.1, 0.9, fmat('boisBrut', 0x4e3526)); /* planche brute tachée d'huile */ for (const [a, b] of [[-0.85, -0.38], [0.85, -0.38], [-0.85, 0.38], [0.85, 0.38]]) KIT.b(g, a, 0.45, b, 0.08, 0.9, 0.08, dark);
    KIT.b(g, -0.6, 1.05, 0.2, 0.3, 0.22, 0.2, MATS.iron); KIT.b(g, 0.5, 1.0, -0.2, 0.5, 0.1, 0.3, rust);
    const sh = new THREE.Group(); sh.position.set(0.1, 1.02, 0); sh.rotation.x = -Math.PI / 2 + 0.25; g.add(sh);
    KIT.b(sh, 0, 0, 0, 0.8, 1.1, 0.05, plate); KIT.b(sh, 0, 0.25, 0.03, 0.5, 0.08, 0.02, strap); /* la sangle est la pièce SANGLES ramassée */
    for (let i = 0; i < 6; i++) KIT.c(sh, -0.3 + (i % 3) * 0.3, i < 3 ? 0.45 : -0.45, 0.06, 0.02, 0.03, 0.08, rust, 6).rotation.x = Math.PI / 2;
    sh.visible = false; colliderBox(s.x, s.z, 1.9, 0.9, s.yaw, 1.0, 'wood');
    const sign = mesh(new THREE.PlaneGeometry(1.2, 0.4), new THREE.MeshStandardMaterial({ map: woodSign(['ÉTABLI DE FORTUNE', 'BOUCLIER · 3 PIÈCES'], { w: 512, h: 170 }), roughness: 0.9 }), 0, 1.75, -0.42, 0, g, false);
    WORLD.shieldTable = { pos: new THREE.Vector3(s.x, 1, s.z), shield: sh }; }
  // Pièces du bouclier (lueur dorée pour qu'on les repère).
  WORLD.penParts = PEN_PARTS.map((p, i) => {
    const g = new THREE.Group(); g.userData.dynamic = true; g.userData.y = 0.9; R.scene.add(g);
    if (i === 0) KIT.b(g, 0, 0, 0, 0.6, 0.8, 0.04, plate);
    else if (i === 1) { KIT.b(g, 0, 0, 0, 0.3, 0.06, 0.06, k.chrome); KIT.b(g, -0.13, -0.08, 0, 0.05, 0.16, 0.05, k.chrome); KIT.b(g, 0.13, -0.08, 0, 0.05, 0.16, 0.05, k.chrome); }
    else for (let j = 0; j < 3; j++) { const b = KIT.b(g, 0, j * 0.06, 0, 0.7, 0.03, 0.08, strap); b.rotation.y = j * 0.5; }
    KIT.glow(g, 0, 0, 0, 0xffd070, 0.9, 0.5);
    return g;
  });
  penPlaceParts();

  /* ── Réfectoire ── */
  for (let r = 0; r < 3; r++) for (let c = 0; c < 2; c++) {
    const x = X(37) + 1 + c * 9, z = X(11) + 0.5 + r * 3.4, g = kTable(x, z, 0, 5, 0.9, 0.76, fmat('acier', 0x8a8a82, { rough: 0.5, metal: 0.4 })); /* plateau de zinc terni */
    for (const s of [-1, 1]) { const b = KIT.g(x, z + s * 0.75, 0); KIT.b(b, 0, 0.44, 0, 5, 0.06, 0.32, k.wood); KIT.b(b, -2.2, 0.22, 0, 0.06, 0.44, 0.3, steel); KIT.b(b, 2.2, 0.22, 0, 0.06, 0.44, 0.3, steel); }
    for (let t = 0; t < 4; t++) KIT.b(R.scene, x - 1.8 + t * 1.2, 0.8, z + (t % 2 ? 0.2 : -0.2), 0.36, 0.02, 0.26, steel, rand(-0.2, 0.2), false);
  }
  { const g = KIT.g(X(41), X(9) + 1.3, 0); KIT.b(g, 0, 0.5, 0, 6, 1.0, 0.7, steel); KIT.b(g, 0, 1.02, 0, 6.1, 0.05, 0.8, fmat('acier', 0xb8bcc0, { rough: 0.3, metal: 0.8 })); /* dessus de Monel ou de zinc */ for (let i = 0; i < 5; i++) KIT.c(g, -2.4 + i * 1.2, 1.15, 0, 0.18, 0.16, 0.22, steel, 12); KIT.solid(g, 6, 0.7, 1.05, 'metal'); }
  kStove(X(36) + 0.6, X(8) + 0.4, 0); kStove(X(38) + 0.4, X(8) + 0.4, 0); kShelf(X(44), X(8) + 0.3, 0, 1.8, 2);
  for (const [x, z] of [[X(38), X(12)], [X(43), X(12)], [X(38), X(15)], [X(43), X(15)]]) { const g = KIT.g(x, z, 0, 3.4); KIT.c(g, 0, 0.3, 0, 0.012, 0.012, 0.6, dark, 4); KIT.s(g, 0, 0, 0, 0.14, fmat('olive', 0x7a8a6a, { rough: 0.5, metal: 0.5 }), 1, 1.3, 1); } // grenades lacrymogènes (tôle peinte olive)
  { const clock = textTexture(128, 128, (c) => { c.fillStyle = '#e8e4d8'; c.beginPath(); c.arc(64, 64, 60, 0, TAU); c.fill(); c.strokeStyle = '#222'; c.lineWidth = 5; c.stroke(); for (let i = 0; i < 12; i++) { const a = (i / 12) * TAU; c.fillStyle = '#222'; c.fillRect(64 + Math.cos(a) * 48 - 2, 64 + Math.sin(a) * 48 - 2, 4, 4); } c.lineWidth = 4; c.beginPath(); c.moveTo(64, 64); c.lineTo(64, 24); c.moveTo(64, 64); c.lineTo(92, 70); c.stroke(); });
    mesh(new THREE.CircleGeometry(0.4, 24), new THREE.MeshStandardMaterial({ map: clock, roughness: 0.5 }), X(47) - 0.1, 2.8, X(12), -Math.PI / 2, R.scene, false); }
  // Poutres de béton sous le plafond (de la cloison de la cuisine, z 30, au mur sud, z 44 ; x 88-102, là où la cloison est pleine).
  { const ch = roomCeil(tileOf(X(42)), tileOf(X(12))), beam = fmat('concrete', 0xa8a498); for (const x of [89.5, 95.5, 101]) KIT.b(R.scene, x, ch - 0.2, (X(10) + X(17)) / 2, 0.32, 0.4, X(17) - X(10) - 2 * EDGE_T, beam); }
  // Suspensions émaillées au-dessus des tables, gobelets en fer-blanc, marmites sur les fourneaux, tableau du menu.
  { const ch = roomCeil(tileOf(X(42)), tileOf(X(12))), shade = fmat('email', 0x2e4a3a, { rough: 0.4, side: THREE.DoubleSide }), cups = new Batch(new THREE.CylinderGeometry(0.042, 0.036, 0.1, 10), fmat('galva', 0xb8bcbe, { rough: 0.5, metal: 0.6 }));
    for (let r = 0; r < 3; r++) for (let c = 0; c < 2; c++) {
      const x = X(37) + 1 + c * 9, z = X(11) + 0.5 + r * 3.4, g = KIT.g(x, z, 0, 3.0);
      KIT.c(g, 0, (ch - 3.0) / 2, 0, 0.008, 0.008, ch - 3.0, dark, 4, false); mesh(new THREE.ConeGeometry(0.26, 0.16, 18, 1, true), shade, 0, -0.02, 0, 0, g, false);
      KIT.s(g, 0, -0.1, 0, 0.055, KM.bulb); KIT.glow(g, 0, -0.14, 0, 0xffd9a0, 1.1, 0.55);
      for (let i = 0; i < 6; i++) if (rng() < 0.75) cups.add(x - 2 + i * 0.8 + (rng() - 0.5) * 0.2, 0.81, z + (i % 2 ? 0.3 : -0.3), rng() * TAU);
    }
    cups.build();
    for (const sx of [X(36) + 0.6, X(38) + 0.4]) { const g = KIT.g(sx, X(8) + 0.45, 0); KIT.c(g, 0, 1.12, 0, 0.24, 0.22, 0.32, MATS.iron, 16); KIT.c(g, 0, 1.29, 0, 0.25, 0.25, 0.03, MATS.iron, 16, false); } // marmites de fonte
    mesh(new THREE.PlaneGeometry(1.4, 0.8), new THREE.MeshStandardMaterial({ map: woodSign(['MENU DU JOUR', 'SOUPE · PAIN · CAFÉ', 'SILENCE AU RÉFECTOIRE'], { w: 512, h: 290, bg: '#1d2a22', color: '#e8e2c8' }), roughness: 0.8 }), X(35) + 0.02, 1.9, X(13), Math.PI / 2, R.scene, false); }

  /* ── Infirmerie ── */
  for (let i = 0; i < 3; i++) { const g = KIT.g(X(11) + 1.1 + i * 2.4, X(20) + 1.1, 0); KIT.b(g, 0, 0.55, 0, 0.9, 0.08, 1.9, steel); KIT.b(g, 0, 0.64, 0, 0.86, 0.12, 1.85, sheet); KIT.b(g, 0, 0.72, -0.7, 0.6, 0.1, 0.3, sheet); KIT.b(g, 0, 0.8, -0.95, 0.9, 0.9, 0.04, steel); for (const [a, b] of [[-0.42, -0.9], [0.42, -0.9], [-0.42, 0.9], [0.42, 0.9]]) KIT.b(g, a, 0.27, b, 0.04, 0.55, 0.04, steel); KIT.solid(g, 0.9, 1.9, 0.9, 'metal'); }
  for (let i = 0; i < 2; i++) { const g = KIT.g(X(11) + 2.3 + i * 2.4, X(20) + 1.1, 0); KIT.b(g, 0, 1.0, 0, 0.03, 1.9, 1.7, sheet); for (const s of [-1, 1]) { KIT.b(g, 0, 0.99, s * 0.87, 0.04, 1.98, 0.04, steel); KIT.b(g, 0, 0.02, s * 0.87, 0.4, 0.04, 0.05, steel); } } // paravents : toile tendue sur deux montants d'acier à patins
  { const g = KIT.g(X(17), X(16) + 1, 0); KIT.c(g, 0, 1.0, 0, 0.02, 0.02, 2.0, steel, 6); KIT.s(g, 0, 2.05, 0, 0.3, KIT.m(0xe8e8e2), 1, 0.4, 1); KIT.glow(g, 0, 1.95, 0, 0xe8fff4, 1.1, 0.35); }
  kShelf(X(10) + 0.3, X(16), Math.PI / 2, 1.6, 2); kTable(X(18) + 0.2, X(17) + 1, Math.PI / 2, 1.6, 0.8, 0.9, steel);
  // Armoire à pharmacie vitrée (mur ouest), lavabo (mur nord, à l'écart de la porte du bloc en x 38-40), chariot à instruments, croix rouge.
  { const g = KIT.g(X(10) + 0.26, X(18) + 1.1, Math.PI / 2) /* entre la fenêtre (z 44-46) et la cloison de la salle (z 48) */, enamel = fmat('email', 0xeceee8, { rough: 0.35 }), vials = [fmat('email', 0x6a3a1a, { rough: 0.15 }), fmat('email', 0x2a4a7a, { rough: 0.15 }), fmat('email', 0xd8d8d0, { rough: 0.2 })];
    KIT.b(g, 0, 0.95, 0, 1.0, 1.9, 0.4, enamel); KIT.b(g, 0, 1.15, 0.205, 0.9, 1.3, 0.01, k.glass, 0, false);
    for (let s = 0; s < 3; s++) { KIT.b(g, 0, 0.62 + s * 0.42, 0.02, 0.92, 0.02, 0.34, enamel, 0, false); for (let i = 0; i < 7; i++) if (rng() < 0.8) KIT.c(g, -0.38 + i * 0.12, 0.7 + s * 0.42, 0.02 + (rng() - 0.5) * 0.12, 0.03, 0.035, 0.14, vials[(rng() * 3) | 0], 8, false); }
    KIT.solid(g, 1.0, 0.4, 1.9, 'metal'); }
  kSink(X(15) + 1.5, X(15) + 0.25, 0);
  { const g = KIT.g(X(15) + 0.4, X(19) + 1.4, 0.3); for (const y of [0.35, 0.85]) KIT.b(g, 0, y, 0, 0.7, 0.03, 0.45, steel); for (const [a, b] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { KIT.b(g, a * 0.33, 0.45, b * 0.2, 0.025, 0.85, 0.025, steel); KIT.s(g, a * 0.33, 0.04, b * 0.2, 0.035, MATS.iron); }
    KIT.b(g, -0.12, 0.9, 0, 0.3, 0.04, 0.2, k.chrome, 0.2, false); KIT.c(g, 0.18, 0.92, 0.05, 0.05, 0.05, 0.1, fmat('email', 0x6a3a1a, { rough: 0.15 }), 8, false); KIT.solid(g, 0.7, 0.45, 0.9, 'metal'); }
  { const cross = textTexture(128, 128, (c) => { c.fillStyle = '#ece8dc'; c.fillRect(0, 0, 128, 128); c.fillStyle = '#b82a22'; c.fillRect(48, 16, 32, 96); c.fillRect(16, 48, 96, 32); });
    mesh(new THREE.PlaneGeometry(0.5, 0.5), new THREE.MeshStandardMaterial({ map: cross, roughness: 0.7 }), X(16) + 0.1, 2.4, X(15) + 1, Math.PI / 2, R.scene, false); }

  /* ── Direction : bureau du directeur et archives ── */
  kRug(X(27) + 1, X(18), 0, 5, 3.4, 0x5a1e1e);
  kTable(X(27) + 1, X(17) + 1, 0, 2.2, 1.0, 0.78, k.woodDark);
  // Fauteuil du directeur : assise et dossier de cuir, pieds de chêne (kChair met une seule matière partout, pieds compris).
  // (derrière le bureau, face à la porte nord, l'assise glissée sous le plateau)
  { const g = KIT.g(X(27) + 1, X(17) + 1.9, Math.PI), cuir = fmat('cuir', 0x9b2e2a, { rough: 0.95 }); KIT.b(g, 0, 0.45, 0, 0.44, 0.05, 0.44, cuir); KIT.b(g, 0, 0.72, -0.2, 0.44, 0.5, 0.04, cuir);
    for (const [a, b] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) KIT.b(g, a * 0.19, 0.22, b * 0.19, 0.04, 0.44, 0.04, k.woodDark); }
  { const g = KIT.g(X(28), X(17) + 1.1, 0); KIT.b(g, 0, 0.84, 0, 0.4, 0.14, 0.3, dark); } // machine à écrire
  { const g = KIT.g(X(27) + 0.2, X(17) + 0.75, 0.2), brass = fmat('laiton', 0x9a7a3a, { rough: 0.45, metal: 0.8 }); /* lampe de bureau à abat-jour vert */ KIT.c(g, 0, 0.79, 0, 0.08, 0.09, 0.03, brass, 12, false); KIT.c(g, 0, 0.95, 0, 0.012, 0.012, 0.32, brass, 6, false);
    const sh = KIT.c(g, 0, 1.12, 0.06, 0.07, 0.07, 0.3, new THREE.MeshStandardMaterial({ color: 0x1e5a32, emissive: 0x1e5a32, emissiveIntensity: 0.6, roughness: 0.3 }), 14, false); sh.rotation.z = Math.PI / 2; sh.scale.set(1, 1, 0.6); KIT.glow(g, 0, 1.06, 0.06, 0xffd9a0, 0.7, 0.45); }
  for (let i = 0; i < 3; i++) kShelf(X(25) + 0.3, X(19) + i * 1.8, Math.PI / 2, 1.6, 2.2, true);
  { const g = KIT.g(X(28) + 0.6, X(15) + 0.5, 0); /* contre le mur nord, à l'écart de la porte (x 68-70) */ KIT.b(g, 0, 0.6, 0, 0.9, 1.2, 0.7, fmat('fonte', 0x2a2e30, { rough: 0.4, metal: 0.7 })); KIT.c(g, 0.1, 0.75, 0.36, 0.12, 0.12, 0.03, k.chrome, 16).rotation.x = Math.PI / 2; KIT.solid(g, 0.9, 0.7, 1.2, 'metal'); } // coffre-fort
  kFrame(X(25) + 0.1, 2.2, X(16) + 1, Math.PI / 2, 0.8, 1.0, 1); kFrame(X(27) + 1, 2.3, X(15) + 0.1, 0, 1.0, 0.8, 3);
  { const mapTex = textTexture(512, 320, (c) => { c.fillStyle = '#d8ceb0'; c.fillRect(0, 0, 512, 320); c.fillStyle = '#6a8aa0'; c.fillRect(0, 0, 512, 320); c.fillStyle = '#c8bc98'; c.beginPath(); c.ellipse(256, 160, 180, 100, 0.1, 0, TAU); c.fill(); c.fillStyle = '#6a5a4a'; for (let i = 0; i < 7; i++) c.fillRect(150 + i * 34, 120 + (i % 3) * 30, 26, 18); c.fillStyle = '#2a2a2a'; c.font = font(30); c.fillText('LE ROCHER — PLAN DU PÉNITENCIER', 60, 40); });
    mesh(new THREE.PlaneGeometry(2.2, 1.4), new THREE.MeshStandardMaterial({ map: mapTex, roughness: 0.9 }), X(30) - 0.1, 2.1, X(20) + 1, -Math.PI / 2, R.scene, false); }
  for (let i = 0; i < 4; i++) kShelf(X(32) + 1.75 + i * 1.7, X(21) + 1.7, Math.PI, 1.5, 2.2, false); // (à 1 m de la porte des quais, x 72-74)

  /* ── Quais : pilotis, bittes d'amarrage, bateau, grue, lampadaires ── */
  { const pil = new Batch(new THREE.CylinderGeometry(0.18, 0.2, 1, 8), fmat('boisBrut', 0x4a3a2a)); /* pieux ronds créosotés : bois brut, pas les planches du quai */
    for (let x = X(18); x <= X(45); x += 2) for (const z of [X(23), X(30)]) pil.add(x, -1.6, z, 0, 0, 0, 1, 3.8, 1);
    for (let z = X(23); z <= X(30); z += 2) { pil.add(X(18), -1.6, z, 0, 0, 0, 1, 3.8, 1); pil.add(X(45), -1.6, z, 0, 0, 0, 1, 3.8, 1); }
    for (let z = X(18); z <= X(23); z += 2) { pil.add(X(45), -1.6, z, 0, 0, 0, 1, 3.8, 1); pil.add(X(46), -1.6, z, 0, 0, 0, 1, 3.8, 1); }
    pil.build(); }
  for (const x of [X(24), X(32), X(40)]) { const g = KIT.g(x, X(30) - 0.35, 0); KIT.c(g, 0, 0.3, 0, 0.16, 0.2, 0.6, dark, 10); KIT.c(g, 0, 0.62, 0, 0.22, 0.2, 0.08, dark, 10); colliderBox(x, X(30) - 0.35, 0.45, 0.45, 0, 0.7, 'metal'); }
  for (const [x, z] of [[X(20), X(24) + 0.8], [X(20) + 0.9, X(24) + 0.7], [X(34), X(28) + 1.2], [X(42), X(24) + 1]]) crate(x, z, rand(-0.3, 0.3));
  barrel(X(28), X(24) + 0.6, MATS.rust); barrel(X(28) + 0.7, X(24) + 0.5, MATS.olive); barrel(X(36), X(29) + 1.3, MATS.rust, true);
  for (const [x, z, ry] of [[X(18) + 0.2, X(28) + 1, Math.PI / 2], [X(46) - 0.2, X(27) + 1, -Math.PI / 2]]) { const b = mesh(new THREE.TorusGeometry(0.32, 0.08, 8, 20), fmat('toile', 0xe8601a, { rough: 0.6 }), x, 1.2, z, ry, R.scene, false); } /* bouées : liège gainé de toile peinte, pendues aux rambardes ouest du quai et est du chemin de ronde, entre deux poteaux */
  // Vedette amarrée au sud.
  { const g = KIT.g(X(33), X(32) + 0.6, 0.06, -0.55), hullM = fmat('boisPeint', 0x2e3a44, { rough: 0.5 }), deck = fmat('planks', 0x9a8466); /* coque bordée en bois peint gris marine ; pont : planches du quai */ g.userData.dynamic = true; WORLD.penBoat = { g, home: g.position.clone(), dock: new THREE.Vector3(X(33), 1, X(30) - 0.6) };
    const hull = new THREE.CylinderGeometry(1.4, 1.1, 10, 16, 1, false, 0, Math.PI); hull.rotateZ(Math.PI / 2); hull.rotateX(Math.PI / 2); hull.scale(1, 0.7, 1);
    const hm = mesh(hull, hullM, 0, 0.6, 0, 0, g); KIT.b(g, 0, 0.62, 0, 9.4, 0.08, 2.4, deck); KIT.b(g, -1.2, 1.5, 0, 3, 1.7, 2.0, fmat('boisPeint', 0xd8d4c8, { rough: 0.6 })); KIT.b(g, -1.2, 2.4, 0, 3.3, 0.1, 2.2, hullM);
    KIT.b(g, 0.35, 1.7, 0, 0.02, 0.6, 1.6, k.glass, 0, false); const m = KIT.c(g, -2.4, 3.2, 0, 0.05, 0.05, 1.6, steel, 6);
    colliderBox(X(33), X(32) + 0.6, 10, 2.8, 0.06, 2.5, 'wood'); } /* coque en bois : son et éclats de bois */
  // Grue de quai.
  { const g = KIT.g(X(43), X(29) + 1.2, -0.7), ym = fmat('tole', 0xb8912a, { rough: 0.5, metal: 0.5 }); /* acier riveté peint ocre */ KIT.b(g, 0, 3, 0, 0.5, 6, 0.5, ym); const jib = KIT.b(g, 2.8, 5.8, 0, 6, 0.35, 0.35, ym); jib.rotation.z = 0.25; KIT.c(g, 5.3, 4.2, 0, 0.01, 0.01, 2.8, dark, 4); KIT.b(g, 5.3, 2.8, 0, 0.4, 0.3, 0.4, dark); colliderBox(X(43), X(29) + 1.2, 0.6, 0.6, 0, 6, 'metal'); }
  { const lp = kLampPost(X(31), X(23) + 0.3, Math.PI / 2, L.docks); }
  kSign(X(18) + 0.4, X(23) + 0.4, Math.PI / 2, ['ACCOSTAGE', 'INTERDIT'], '#b83a2a', '#f2eee4');

  /* ── Cour de promenade : gradins, lignes, projecteur ── */
  { const steps = fmat('concrete', 0xa8a49c); // gradins en quatre tronçons : les brèches nord de la cour et l'arme murale (carabine, x 70-72) restent dégagées
    for (const [a, b] of [[X(20), X(24) - 0.3], [X(25) + 0.3, X(30) - 0.3], [X(31) + 0.3, X(34) - 0.3], [X(35) + 0.3, X(39)]]) {
      for (let i = 0; i < 3; i++) KIT.b(R.scene, (a + b) / 2, 0.22 + i * 0.4, X(0) + 1.55 - i * 0.6, b - a, 0.44 + i * 0.8, 0.6, steps); // la marche la plus haute contre le mur
      // Une boîte par marche ; la deuxième compte 1,5 m (et non 1,24) : sauté de la première, on monte au plus à 1,48 m (pieds à 1,18 m
      // plus la marche de 0,3 m), on ne se perche donc pas hors de portée des infectés (ils frappent jusqu'à 1,2 m de dénivelé).
      collider(a, X(0) + 1.25, b, X(0) + 1.85, 0.44, 'concrete'); collider(a, X(0) + 0.65, b, X(0) + 1.25, 1.5, 'concrete'); collider(a, X(0), b, X(0) + 0.65, 2.04, 'concrete');
    } }
  // Terrain de balle au mur peint au sol (rectangle, ligne médiane, lignes de service, rond central), peinture écaillée.
  { const tex = textTexture(256, 32, (c) => { c.clearRect(0, 0, 256, 32); for (let x = 0; x < 256; x += 2) { const n = tfbm(x / 64, 1.3, 4, 3); if (n < 0.4) continue; c.fillStyle = `rgba(226,222,208,${clamp((n - 0.4) * 3.2, 0, 0.8)})`; c.fillRect(x, 5 + rng() * 3, 2, 22 - rng() * 5); } });
    const paint = new THREE.MeshStandardMaterial({ map: tex, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2, roughness: 0.85 });
    const strip = (x0, z0, x1, z1) => { const L = Math.hypot(x1 - x0, z1 - z0), g = new THREE.PlaneGeometry(L, 0.1), uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setX(i, uv.getX(i) * L / 2 + rng()); const m = mesh(g, paint, (x0 + x1) / 2, 0.012, (z0 + z1) / 2, 0, R.scene, false); m.rotation.set(-Math.PI / 2, 0, Math.atan2(-(z1 - z0), x1 - x0)); m.renderOrder = 2; };
    const a = 61, b = 79, c = 13.8, d = 18.8; strip(a, c, b, c); strip(a, d, b, d); strip(a, c, a, d); strip(b, c, b, d); strip(70, c, 70, d); strip(64.5, c, 64.5, d); strip(75.5, c, 75.5, d);
    const ring = mesh(new THREE.RingGeometry(1.45, 1.55, 48), paint, 70, 0.012, (c + d) / 2, 0, R.scene, false); ring.rotation.x = -Math.PI / 2; ring.renderOrder = 2; }
  kBench(X(36), X(4) + 1, Math.PI); kBench(X(24), X(4) + 1, Math.PI);

  /* ── Toits : citernes, conduits, cheminée ── */
  const roofY = ceilH() + 0.35;
  for (const [x, z] of [[X(20), X(11)], [X(40), X(12)], [X(30), X(18)]]) { const g = KIT.g(x, z, 0, roofY); for (const [a, b] of [[-0.8, -0.8], [0.8, -0.8], [-0.8, 0.8], [0.8, 0.8]]) KIT.b(g, a, 0.8, b, 0.12, 1.6, 0.12, dark); KIT.c(g, 0, 2.4, 0, 1.2, 1.2, 1.8, fmat('boisBrut', 0x6a5a48), 16); /* citerne en douelles de bois brut */ KIT.c(g, 0, 3.4, 0, 0.1, 1.3, 0.4, dark, 16); }
  for (let i = 0; i < 6; i++) { const g = KIT.g(X(12) + i * 3.6, X(12), 0, roofY); KIT.b(g, 0, 0.35, 0, 0.8, 0.7, 0.8, dark); }
  { const g = KIT.g(X(45), X(9), 0, roofY); KIT.b(g, 0, 3, 0, 1.2, 6, 1.2, fmat('brick', 0x9a8a80)); }

  /* ── Miradors ── */
  WORLD.beams = WORLD.beams || [];
  const beamMat = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false, uniforms: { uInt: { value: 0.1 } },
    vertexShader: 'varying float vT; varying vec3 vN; varying vec3 vV; void main(){ vT = uv.y; vN = normalize(normalMatrix * normal); vec4 mv = modelViewMatrix * vec4(position, 1.0); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }',
    fragmentShader: 'uniform float uInt; varying float vT; varying vec3 vN; varying vec3 vV; void main(){ float f = pow(abs(dot(vN, vV)), 1.6); gl_FragColor = vec4(vec3(0.85, 0.92, 1.0), pow(vT, 1.8) * f * uInt); }' });
  for (const [x, z, ph] of [[X(43) + 1, X(-1), 0], [X(16), X(31), 2]]) {
    const g = KIT.g(x, z, 0, surfH(x, z)); for (const [a, b] of [[-1.3, -1.3], [1.3, -1.3], [-1.3, 1.3], [1.3, 1.3]]) KIT.b(g, a, 4.5, b, 0.3, 9, 0.3, fmat('concrete', 0x9a968e));
    KIT.b(g, 0, 9.3, 0, 3.6, 0.3, 3.6, fmat('concrete', 0x9a968e)); KIT.b(g, 0, 10.4, 0, 3.2, 1.9, 3.2, fmat('boisPeint', 0x3a3e40, { rough: 0.7 })); /* guérite en planches peintes */ KIT.b(g, 0, 11.45, 0, 3.8, 0.2, 3.8, dark);
    const head = new THREE.Group(); head.userData.dynamic = true; head.position.set(0, 11.9, 0); g.add(head);
    const cone = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 6, 60, 20, 1, true), beamMat); cone.geometry.translate(0, -30, 0); cone.geometry.rotateX(-Math.PI / 2); head.add(cone);
    mesh(new THREE.CylinderGeometry(0.45, 0.35, 0.7, 14), dark, 0, 0, 0, 0, head).rotation.x = Math.PI / 2;
    WORLD.beams.push({ head, ph });
  }
  penFar(beamMat);
  penDetails();
}

// Au loin : rochers du rivage, phare, pont suspendu, ville de l'autre côté de la baie.
function penFar(beamMat) {
  const k = kitMats(), rock = fmat('rock', 0x5a5e58);
  { const parts = [], r = mulberry32(3);
    // Un rocher dont l'emprise touche un carreau praticable (quais, chemin de ronde, accès des infectés) est enfoncé sous le plancher.
    const nearFloor = (x, z, s) => { for (let tz = tileOf(z - s); tz <= tileOf(z + s); tz++) for (let tx = tileOf(x - s); tx <= tileOf(x + s); tx++) if (inMap(tx, tz) && MAP.edge[ti(tx, tz)] === 0 && Math.hypot(clamp(x, tx * TILE, tx * TILE + TILE) - x, clamp(z, tz * TILE, tz * TILE + TILE) - z) < s) return true; return false; };
    for (let i = 0; i < 90; i++) { const a = r() * TAU, rx = 60 + r() * 14, rz = 34 + r() * 10, x = 60 + Math.cos(a) * rx, z = 28 + Math.sin(a) * rz; const s = 1 + r() * 2.6, sy = 0.6 + r() * 0.5, ry = r() * TAU; /* (tirages dans le même ordre qu'avant) */
      const y = nearFloor(x, z, s) ? Math.min(surfH(x, z) + s * 0.2, -0.1 - s * sy) : surfH(x, z) + s * 0.2;
      const g = boulderGeo(s, i * 1.7); g.scale(1, sy, 1); g.rotateY(ry); g.translate(x, y, z); parts.push(g); } /* (rochers arrondis : les polyèdres à grosses facettes faisaient carton-pâte) */
    mesh(mergeGeometries(parts), rock, 0, 0, 0, 0, R.scene, true); }
  // Phare sur son îlot.
  { const g = KIT.g(190, 140, 0, -1), white = fmat('plaster', 0xe8e4da); const isl = mesh(new THREE.CylinderGeometry(14, 22, 5, 14), rock, 0, 0, 0, 0, g);
    KIT.c(g, 0, 12, 0, 2.4, 3.2, 20, white, 16); KIT.c(g, 0, 22.4, 0, 3.6, 3.6, 0.4, fmat('fonte', 0x2a2a2a, { rough: 0.8 })); /* galerie en fonte noire */ KIT.c(g, 0, 23.6, 0, 2.2, 2.2, 2.4, new THREE.MeshStandardMaterial({ color: 0xfff4d0, emissive: 0xffe6a0, emissiveIntensity: 1.5 }), 16); KIT.c(g, 0, 25.4, 0, 0.3, 2.6, 1.4, fmat('tole', 0x7a2a22, { rough: 0.8 }), 16); /* coupole de fer peint en rouge */
    const rot = new THREE.Group(); rot.userData.dynamic = true; rot.position.set(0, 23.6, 0); g.add(rot);
    for (const s of [1, -1]) { const c = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 14, 220, 20, 1, true), beamMat.clone()); c.material.uniforms.uInt.value = 0.16; c.geometry.translate(0, -110, 0); c.geometry.rotateX(-Math.PI / 2 * s); rot.add(c); }
    WORLD.lighthouse = rot; }
  // Pont suspendu rouge (silhouette dans la brume, feux de balisage).
  { const red = new THREE.MeshStandardMaterial({ color: 0x5a1e18, roughness: 0.7, fog: false }), g = KIT.g(-260, -170, 0.75);
    for (const zz of [-170, 170]) for (const s of [-1, 1]) { const t = mesh(boxG(3, 120, 3), red, s * 9, 55, zz, 0, g, false); }
    for (const zz of [-170, 170]) for (const y of [40, 80, 110]) mesh(boxG(20, 3, 3), red, 0, y, zz, 0, g, false);
    mesh(boxG(26, 3, 700), red, 0, 28, 0, 0, g, false);
    const cable = []; for (const s of [-1, 1]) for (let i = 0; i < 40; i++) { const z0 = -350 + i * 17.5, z1 = z0 + 17.5, y = (z) => { const a = Math.abs(z); return a < 170 ? 32 + 80 * (a / 170) ** 2 : 112 - (a - 170) / 180 * 80; }; cable.push(s * 9, y(z0), z0, s * 9, y(z1), z1); if (i % 2 === 0) cable.push(s * 9, y(z0), z0, s * 9, 29, z0); }
    const cg = new THREE.BufferGeometry(); cg.setAttribute('position', new THREE.Float32BufferAttribute(cable, 3)); const lines = new THREE.LineSegments(cg, new THREE.LineBasicMaterial({ color: 0x3a1410, fog: false })); g.add(lines);
    WORLD.beacons = [];
    for (const zz of [-170, 170]) for (const s of [-1, 1]) { const b = new THREE.Sprite(new THREE.SpriteMaterial({ map: TEX.sprites.glow, color: 0xff2a1a, blending: THREE.AdditiveBlending, depthWrite: false, fog: false })); b.scale.set(10, 10, 1); b.position.set(s * 9, 117, zz); g.add(b); WORLD.beacons.push({ m: b, ph: zz * 0.01 + s }); }
    g.traverse((o) => { o.frustumCulled = false; }); }
  // Ville de l'autre côté de la baie : façades éclairées.
  { const tex = textTexture(1024, 256, (c) => { c.fillStyle = '#05080c'; c.fillRect(0, 0, 1024, 256); const r = mulberry32(12); for (let i = 0; i < 2600; i++) { if (r() < 0.55) continue; c.fillStyle = r() < 0.8 ? `rgba(255,${190 + r() * 50},${110 + r() * 60},${0.5 + r() * 0.5})` : 'rgba(180,210,255,.8)'; c.fillRect(r() * 1024, r() * 256, 3, 4); } });
    const mat = new THREE.MeshBasicMaterial({ map: tex, fog: false, color: 0x8a8a8a }), parts = [], r = mulberry32(44);
    for (let i = 0; i < 70; i++) { const a = -0.3 + (i / 70) * 2.2, d = 520 + r() * 80, w = 14 + r() * 30, h = 12 + r() * (i % 9 === 0 ? 90 : 45); const g = new THREE.BoxGeometry(w, h, w * 0.8); const uv = g.attributes.uv; const u0 = r(); for (let j = 0; j < uv.count; j++) { uv.setX(j, u0 + uv.getX(j) * w / 400); uv.setY(j, uv.getY(j) * h / 120); } g.rotateY(-a); g.translate(60 + Math.cos(a) * d, h / 2 - 6, 30 - Math.sin(a) * d); parts.push(g.toNonIndexed()); }
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping; const m = mesh(mergeGeometries(parts), mat, 0, 0, 0, 0, R.scene, false); m.frustumCulled = false; }
}

/* ─── Finitions du Pénitencier : conduites, lampes grillagées, numéros de cellule, panneaux ─── */
function penDetails() {
  // Fer noir des colliers et des cages (même matière que les coursives) ; conduites en fonte peinte (la fonte garde la teinte du jeu).
  const X = PEN.X, k = kitMats(), dark = fmat('fonte', 0x2a2c2e, { rough: 0.6, metal: 0.5 }), pipeM = fmat('fonte', 0x5a5e5a, { rough: 0.5, metal: 0.6 });
  // Conduites au plafond du couloir des cellules, avec colliers.
  { const p = new Batch(new THREE.CylinderGeometry(1, 1, 1, 8), pipeM), cl = new Batch(boxG(0.06, 0.16, 0.3), dark);
    for (const [z, r] of [[X(11) + 0.4, 0.09], [X(11) + 0.7, 0.06], [X(12) + 1.4, 0.07]]) p.add((X(10) + X(34)) / 2, 3.78, z, 0, 0, Math.PI / 2, r, X(34) - X(10), r);
    for (let x = X(10) + 1; x < X(34); x += 2.5) cl.add(x, 3.85, X(11) + 0.55); p.build(); cl.build(); }
  // Lampes grillagées le long des couloirs et sur les façades.
  const caged = (x, y, z, ry, col = 0xffe2b0) => { const g = KIT.g(x, z, ry, y); KIT.b(g, 0, 0, 0, 0.2, 0.06, 0.08, dark); KIT.s(g, 0, -0.08, 0.06, 0.07, KM.bulb, 1, 1.2, 1); for (let i = 0; i < 4; i++) { const b = KIT.b(g, -0.06 + (i % 2) * 0.12, -0.08, 0.02 + (i > 1 ? 0.08 : 0), 0.01, 0.18, 0.01, dark, 0, false); } KIT.glow(g, 0, -0.08, 0.08, col, 0.9, 0.7); };
  for (let x = X(12); x < X(34); x += 4) { caged(x, 2.7, X(10) + 0.12, 0); caged(x + 2, 2.7, X(13) - 0.12, Math.PI); }
  // Quais : sur les façades sud de l'infirmerie et de la direction (z 54), tournées vers les quais ; ni sur les fenêtres ni sur la porte (x 72-74).
  for (const x of [X(16) + 1, X(19), X(26), X(29), X(34), X(37)]) caged(x, 3.2, X(22) + 0.12, 0, 0xffb070);
  // Numéros peints au-dessus des cellules.
  { const atlas = textTexture(512, 256, (c) => { c.fillStyle = 'rgba(0,0,0,0)'; c.clearRect(0, 0, 512, 256); c.font = font(52); c.textAlign = 'center'; c.textBaseline = 'middle'; for (let i = 0; i < 32; i++) { const cx = (i % 8) * 64 + 32, cy = ((i / 8) | 0) * 64 + 32; c.fillStyle = '#e8e2c8'; c.fillText(String(i + 1).padStart(2, '0'), cx, cy); } }, { repeat: false });
    const mat = new THREE.MeshStandardMaterial({ map: atlas, transparent: true, roughness: 0.8, depthWrite: false }); let n = 0;
    for (let x = 11; x <= 32; x++) for (const [z, ry] of [[X(10) + 0.13, 0], [X(13) - 0.13, Math.PI]]) { if (n >= 32) break; const geo = new THREE.PlaneGeometry(0.42, 0.42), uv = geo.attributes.uv, i = n++; for (let j = 0; j < uv.count; j++) { uv.setX(j, ((i % 8) + uv.getX(j)) / 8); uv.setY(j, 1 - (((i / 8) | 0) + 1 - uv.getY(j)) / 4); } mesh(geo, mat, X(x) + 1, 3.25, z, ry, R.scene, false); } }
  // Panneaux d'avertissement : façade de l'infirmerie face aux quais, mur nord de la cour (au-dessus des gradins), mur du réfectoire qui le sépare de la direction.
  for (const [x, y, z, ry, lines] of [[X(18) + 1, 2.4, X(22) + 0.1, 0, ['ZONE INTERDITE', 'LES GARDES TIRENT']], [X(36), 3.0, X(0) + 0.1, 0, ['DÉFENSE D\'APPROCHER', 'DU MUR']], [X(37) + 1, 2.4, X(17) - 0.1, Math.PI, ['DIRECTION', 'ACCÈS RÉSERVÉ']] /* (à côté de la porte réfectoire ↔ direction, sur le mur plein) */]) mesh(new THREE.PlaneGeometry(1.5, 0.6), new THREE.MeshStandardMaterial({ map: woodSign(lines, { w: 512, h: 200, bg: '#b83a2a', color: '#f2eee4' }), roughness: 0.6 }), x, y, z, ry, R.scene, false);
}
