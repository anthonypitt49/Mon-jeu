/* ═══════════════════ LE FILON MAUDIT : DÉCOR ═══════════════════ */

function filDecor() {
  const X = FIL.X, k = kitMats(), L = R.lights;
  rng = mulberry32(1880);
  // Familles photo (OBJ_FAM) : bois brut (étais, traverses, poteaux, barres d'attache, chariot, abreuvoir, tonneaux, couchettes),
  // noyer verni de meuble (bar, tabourets, tables, chaises, piano, râtelier, comptoir de la banque, étagères, chaire, bancs de l'église),
  // velours (rideaux de scène, parement d'autel), toile (bâche, sacs, paillasses), rouille (wagonnet), fonte (rails, ferrures).
  // Les planches de la carte ('planks', photo du trottoir) restent aux corniches des bâtiments, à la scène et à la charpente de l'église.
  // walnut et walnutLight sont les mêmes matières que KM.woodDark et KM.wood (même clé de cache) : pieds des tables compris.
  const timber = fmat('boisBrut', 0x4e3526), boards = fmat('boisBrut', 0x8a6446), walnut = fmat('meuble', 0x4e3526), walnutLight = fmat('meuble', 0x8a6446), trim = fmat('planks', 0x4e3526);
  const iron = MATS.iron, glassJar = new THREE.MeshStandardMaterial({ color: 0xd8e8f0, roughness: 0.05, metalness: 0.1, transparent: true, opacity: 0.35, depthWrite: false });
  // kShelf, kSign et kLamp (06b_kit.js) codent leur matière en dur (acier, chrome des années 1950) : on la remplace après coup.
  const swap = (g, from, to) => { if (g) g.traverse((o) => { if (o.material === from) o.material = to; }); return g; };
  // Générateur et tableau électrique : leur matière du Filon (fonte noire, coffret de noyer) est choisie dans 06_props.js
  // (machinePaint et MAP_ID), plus rien à remplacer ici.

  /* ── Galerie de mine : rails, étais, wagonnet, lanternes, dynamite ── */
  { const rail = new Batch(boxG(1, 0.08, 0.07), iron), sleeper = new Batch(boxG(1.6, 0.1, 0.22), timber);
    for (let x = X(33); x < X(47); x += 0.8) sleeper.add(x, 0.05, X(19) + 1, Math.PI / 2 + rand(-0.05, 0.05));
    for (const o of [-0.5, 0.5]) rail.add((X(33) + X(47)) / 2, 0.13, X(19) + 1 + o, 0, 0, 0, X(47) - X(33), 1, 1);
    rail.build(); sleeper.build();
    const post = new Batch(boxG(0.28, 1, 0.28), timber), beam = new Batch(boxG(0.3, 0.3, 1), timber);
    for (let x = X(37) + 1.5; x < X(47); x += 3.5) { for (const z of [X(18) + 0.25, X(22) - 0.25]) post.add(x, 1.6, z, 0, 0, rand(-0.04, 0.04), 1, 3.2, 1); beam.add(x, 3.25, X(20), 0, 0, 0, 1, 1, X(22) - X(18)); }
    post.build(); beam.build();
    for (let x = X(38); x < X(47); x += 5) hangingLamp(x, 2.7, X(20), MATS.bulbWarm);
    const cart = KIT.g(X(44), X(19) + 1, Math.PI / 2); KIT.b(cart, 0, 0.75, 0, 1.1, 0.7, 1.7, MATS.rust); /* caisse de tôle rivetée rouillée ; roues en fonte */ KIT.b(cart, 0, 1.12, 0, 1.0, 0.15, 1.6, fmat('rock', 0x6a5a48));
    for (const [a, b] of [[-0.45, -0.6], [0.45, -0.6], [-0.45, 0.6], [0.45, 0.6]]) KIT.c(cart, a, 0.25, b, 0.2, 0.2, 0.08, iron, 12).rotation.z = Math.PI / 2;
    KIT.solid(cart, 1.2, 1.8, 1.3, 'metal');
    for (let i = 0; i < 3; i++) crate(X(38) + 0.6 + i * 0.9, X(21) + 1.4, rand(-0.2, 0.2));
    const tnt = KIT.g(X(38) + 1.5, X(21) + 1.4, 0, 0.55); for (let i = 0; i < 6; i++) KIT.c(tnt, -0.2 + (i % 3) * 0.2, 0.08, -0.08 + Math.floor(i / 3) * 0.16, 0.05, 0.05, 0.3, KIT.m(0xb8301e), 8, false).rotation.z = Math.PI / 2;
    swap(kSign(X(37) + 0.6, X(18) + 0.5, Math.PI / 2, ['MINE DU FILON', 'DANGER — ÉBOULEMENTS'], '#3a2a1a', '#e8c890', 2.4), k.steel, timber); /* piquet de bois brut, pas un poteau d'acier */ }

  /* ── Grand-rue : poteaux des trottoirs couverts, frontons, abreuvoir, chariot, lanternes ── */
  { const post = new Batch(boxG(0.18, 1, 0.18), timber); /* poteaux équarris : le fil suit le poteau (la photo du trottoir le mettrait en travers) */
    for (let x = X(6) + 0.4; x < X(36); x += 3.6) { post.add(x, 1.7, X(18) - 0.12, 0, 0, 0, 1, 3.4, 1); post.add(x, 1.7, X(22) + 0.12, 0, 0, 0, 1, 3.4, 1); colliderBox(x, X(18) - 0.12, 0.2, 0.2, 0, 3.4, 'wood'); colliderBox(x, X(22) + 0.12, 0.2, 0.2, 0, 3.4, 'wood'); }
    post.build(); }
  // Frontons à l'ancienne, avec enseigne peinte.
  const front = (x0, x1, z, dir, h, color, lines, signBg, signFg) => {
    const g = KIT.g((x0 + x1) / 2, z, dir > 0 ? 0 : Math.PI), w = x1 - x0, m = fmat('westPlank', color);
    KIT.b(g, 0, 4.2 + h / 2, 0, w, h, 0.2, m); KIT.b(g, 0, 4.2 + h + 0.1, 0, w + 0.3, 0.2, 0.4, trim);
    const sg = mesh(new THREE.PlaneGeometry(w * 0.8, h * 0.6), new THREE.MeshStandardMaterial({ map: woodSign(lines, { w: 512, h: 160, bg: signBg, color: signFg }), roughness: 0.8 }), 0, 4.2 + h * 0.5, 0.12, 0, g, false);
  };
  front(X(7), X(17), X(17) - 0.1, 1, 2.8, 0xb85a42, ['SALOON', 'LA PÉPITE D\'OR'], '#6a1e14', '#f2d68a');
  front(X(18), X(25), X(17) - 0.1, 1, 2.2, 0xb08a60, ['MAGASIN GÉNÉRAL', 'FRIANDISES · OUTILS'], '#2a3a4a', '#f2eee4');
  front(X(26), X(34), X(17) - 0.1, 1, 2.0, 0xd8b8a0, ['BANQUE DU FILON'], '#1e2a1e', '#e8d890');
  front(X(7), X(14), X(23) + 0.1, -1, 1.8, 0xb08a60, ['SHÉRIF', 'PRISON'], '#3a2a1a', '#e8e2c8');
  { const g = KIT.g(X(5) + 3, X(19) + 1, 0); } // (le bout ouest est un éboulis)
  for (const [x, z] of [[X(12), X(19) + 1], [X(28), X(20) + 1]]) { const g = KIT.g(x, z, 0); KIT.b(g, 0, 1.7, 0, 0.16, 3.4, 0.16, timber); KIT.b(g, 0.35, 3.3, 0, 0.8, 0.1, 0.1, timber); const lamp = KIT.g(0.7, 0, 0, 2.95, g); KIT.b(lamp, 0, 0, 0, 0.26, 0.36, 0.26, iron); KIT.glow(lamp, 0, 0, 0, 0xffa040, 1.8, 0.8); colliderBox(x, z, 0.3, 0.3, 0, 3.4, 'wood'); }
  if (L.lanternW) L.lanternW.position.set(X(12) + 0.7, 2.9, X(19) + 1); if (L.lanternE) L.lanternE.position.set(X(28) + 0.7, 2.9, X(20) + 1);
  { const g = KIT.g(X(15), X(21) + 1, 0); KIT.b(g, 0, 0.35, 0, 2.2, 0.7, 0.7, boards); KIT.b(g, 0, 0.66, 0, 2.0, 0.02, 0.5, fmat('plain', 0x3a5a6a, { rough: 0.1, metal: 0.3 })); KIT.solid(g, 2.2, 0.7, 0.7); } // abreuvoir (planches brutes ; l'eau garde sa teinte unie)
  for (const x of [X(9), X(24), X(31)]) { const g = KIT.g(x, X(21) + 1.5, 0); for (const s of [-0.9, 0.9]) KIT.b(g, s, 0.55, 0, 0.14, 1.1, 0.14, timber); KIT.b(g, 0, 1.0, 0, 2.0, 0.12, 0.12, timber); KIT.solid(g, 2.0, 0.2, 1.1); } // barres d'attache
  // Chariot bâché renversé en travers de la rue.
  { const g = KIT.g(X(20) + 1, X(18) + 1.4, 0.2), canvas = fmat('toile', 0xe0d6bc, { rough: 1, side: THREE.DoubleSide }); /* bâche de grosse toile écrue */
    KIT.b(g, 0, 0.9, 0, 3.6, 0.2, 1.6, boards); for (const s of [-1, 1]) KIT.b(g, 0, 1.2, s * 0.78, 3.6, 0.5, 0.06, boards);
    const hood = mesh(new THREE.CylinderGeometry(0.95, 0.95, 3.4, 16, 1, true, -Math.PI / 2, Math.PI), canvas, 0, 1.4, 0, 0, g); hood.rotation.z = Math.PI / 2;
    for (const [a, b] of [[-1.3, -0.9], [1.3, -0.9], [-1.3, 0.9]]) { const w = KIT.c(g, a, 0.55, b, 0.55, 0.55, 0.1, timber, 14); w.rotation.x = Math.PI / 2; }
    const wb = KIT.c(g, 1.6, 0.2, 1.4, 0.55, 0.55, 0.1, timber, 14); wb.rotation.z = 1.2; KIT.solid(g, 3.8, 1.8, 2.2, 'wood'); }
  // Tonneaux de chêne brut cerclés de fer. meterUV couche le fil le long du plus grand côté de la pièce, ici le tour (1,8 m
  // contre 0,88 m de haut) : les douelles seraient horizontales. On pose donc les UV en mètres ici, sans échange, douelles debout.
  { const oak = fmat('boisBrut', 0x7a5236), staves = { userData: { mu: true, scale: oak.userData.scale } };
    for (const [x, z] of [[X(8), X(21) + 1.5], [X(26), X(18) + 0.5], [X(33), X(21) + 1.4], [X(33) + 0.8, X(21) + 1.5]]) { const b = barrel(x, z, oak); b.geometry = meterUV(b.geometry, staves, 1, 1, 1, x, z); } }
  for (const [x, z] of [[X(32) + 0.4, X(18) + 0.6], [X(32) + 1.2, X(18) + 0.4]]) { const g = KIT.g(x, z, rand(TAU)); KIT.b(g, 0, 0.35, 0, 1.0, 0.7, 0.6, fmat('foin', 0xc8a84a, { rough: 1 })); KIT.solid(g, 1.0, 0.6, 0.7); } // bottes de foin
  { const posters = textTexture(512, 256, (c) => { for (let i = 0; i < 2; i++) { const x0 = i * 256; c.fillStyle = '#e8d8b0'; c.fillRect(x0, 0, 256, 256); c.fillStyle = '#2a1a0a'; c.textAlign = 'center'; c.font = font(44); c.fillText('RECHERCHÉ', x0 + 128, 50); c.fillStyle = '#6a5a4a'; c.fillRect(x0 + 68, 70, 120, 110); c.fillStyle = '#2a1a0a'; c.font = font(30, 700); c.fillText(i ? '500 $' : 'MORT OU VIF', x0 + 128, 222); } });
    for (const [x, z, ry, cell] of [[X(18) + 0.9, X(17) - 0.02, Math.PI, 0], [X(8) + 0.6, X(23) + 0.02, 0, 1], [X(33) + 1.2, X(17) - 0.02, Math.PI, 1]]) { const geo = new THREE.PlaneGeometry(0.6, 0.6), uv = geo.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setX(i, (cell + uv.getX(i)) / 2); mesh(geo, new THREE.MeshStandardMaterial({ map: posters, roughness: 0.95 }), x, 1.6, z, ry, R.scene, false); } }
  // Éboulis du bout ouest (rochers).
  // UV en mètres sur chaque bloc AVANT la fusion (la géométrie fusionnée perd ses paramètres).
  { const parts = [], rubble = fmat('rock', 0x8a7866); for (let i = 0; i < 26; i++) { const s = srand(0.4, 1.3), g = new THREE.DodecahedronGeometry(s, 0); g.translate(X(5) + srand(-1.5, 1.8), s * 0.5 + srand(0, 1.8), X(16) + srand(0, 16)); parts.push(meterUV(g, rubble, 1, 1, 1, i * 3.7, i * 1.3)); } mesh(mergeGeometries(parts), rubble, 0, 0, 0, 0, R.scene, true); }

  /* ── Saloon ── */
  { const g = KIT.g(X(15) + 1.2, X(13) + 1, Math.PI / 2); KIT.b(g, 0, 0.55, 0, 4.2, 1.1, 0.7, walnut); KIT.b(g, 0, 1.12, 0, 4.4, 0.06, 0.8, fmat('meuble', 0x6a3e22)); /* comptoir et dessus de noyer verni (les portes peintes ont leur propre matière) */ KIT.solid(g, 4.2, 0.7, 1.15); }
  { const g = KIT.g(X(16) + 1.7, X(13) + 1, -Math.PI / 2); KIT.b(g, 0, 1.6, 0, 4.2, 2.4, 0.35, walnut); for (let s = 0; s < 3; s++) for (let i = 0; i < 12; i++) KIT.c(g, -1.9 + i * 0.34, 1.0 + s * 0.6, 0.12, 0.05, 0.05, 0.28, KIT.m([0x3a6a2a, 0x7a3a1a, 0xc8a84a, 0x2a2a4a][(i + s) % 4], { rough: 0.15 }), 8, false); }
  for (let i = 0; i < 4; i++) { const g = KIT.g(X(14) + 0.3, X(12) + 0.8 + i * 1.1, 0); KIT.c(g, 0, 0.35, 0, 0.18, 0.18, 0.05, walnut, 10); KIT.c(g, 0, 0.18, 0, 0.03, 0.03, 0.36, iron, 6); }
  for (const [x, z] of [[X(8) + 1, X(13) + 1], [X(10) + 1, X(15)], [X(12) + 0.5, X(13)]]) { kTable(x, z, 0, 1.1, 1.1, 0.78, walnutLight); for (let a = 0; a < 3; a++) { const r = a * 2.1 + 0.4; kChair(x + Math.cos(r) * 0.85, z + Math.sin(r) * 0.85, -r - Math.PI / 2, walnut); } }
  { const g = KIT.g(X(7) + 0.5, X(15) + 0.8, Math.PI / 2); KIT.b(g, 0, 0.65, 0, 1.6, 1.3, 0.6, fmat('meuble', 0x2a1a12, { rough: 0.4 })); /* caisse de piano droit en noyer verni ; touches d'ivoire en teinte unie */ KIT.b(g, 0, 0.92, 0.32, 1.4, 0.08, 0.1, fmat('plain', 0xeae4d4)); KIT.solid(g, 1.6, 0.6, 1.3); } // piano
  { const stage = KIT.g(X(12), X(10), 0); KIT.b(stage, 0, 0.08, 0, 8, 0.16, 5.6, fmat('planks', 0x6a4028)); /* plancher de scène : planches de la carte */ const red = fmat('velours', 0x8a1a1a, { rough: 1, side: THREE.DoubleSide }); /* rideaux de velours bordeaux */ for (const s of [-1, 1]) KIT.b(stage, s * 3.3, 1.8, 2.7, 1.6, 3.4, 0.05, red); KIT.b(stage, 0, 3.2, 2.7, 8, 0.5, 0.05, red); }
  { const ch = KIT.g(X(11) + 1, X(13) + 1, 0, 3.0); KIT.c(ch, 0, 0, 0, 0.9, 0.9, 0.06, iron, 20); for (let i = 0; i < 8; i++) { const a = (i / 8) * TAU; KIT.c(ch, Math.cos(a) * 0.8, 0.12, Math.sin(a) * 0.8, 0.03, 0.03, 0.2, fmat('plain', 0xf2eee0), 6, false); KIT.glow(ch, Math.cos(a) * 0.8, 0.3, Math.sin(a) * 0.8, 0xffb060, 0.5, 0.7); } }

  /* ── Magasin général et comptoir de friandises ── */
  // Rayonnages en bois (pas d'étagères d'acier en 1880) ; boîtes de conserve en fer-blanc inchangées.
  swap(kShelf(X(24) + 1.7, X(11), -Math.PI / 2, 1.8, 2.2), k.steel, walnutLight); swap(kShelf(X(24) + 1.7, X(13) + 0.5, -Math.PI / 2, 1.8, 2.2), k.steel, walnutLight); swap(kShelf(X(20), X(10) + 0.3, 0, 1.8, 2.2), k.steel, walnutLight);
  for (let i = 0; i < 5; i++) { const g = KIT.g(X(21) + i * 0.7, X(15) + 0.5, rand(-0.3, 0.3)); KIT.b(g, 0, 0.4, 0, 0.55, 0.8, 0.4, fmat('toile', 0xd8ccb0, { rough: 1 })); } /* sacs de farine et de grain en toile */
  { const s = wallSpot(SPOTS.candy, 0.55), g = KIT.g(s.x, s.z, s.yaw);
    KIT.b(g, 0, 0.5, 0, 2.2, 1.0, 0.7, fmat('boisPeint', 0xd84a6a, { rough: 0.5 })); /* comptoir de bois peint en rose (couleur gardée : c'est l'objectif) */ KIT.b(g, 0, 1.02, 0, 2.3, 0.05, 0.8, fmat('marbre', 0xf2eee4, { rough: 0.3 })); /* dessus de marbre blanc : aucune famille, teinte unie */
    const cols = [0xff4a6a, 0x4ad8ff, 0xffd84a, 0x7aff6a, 0xc84aff, 0xff9a3a];
    for (let i = 0; i < 6; i++) { const x = -0.9 + i * 0.36; KIT.c(g, x, 1.3, 0, 0.13, 0.13, 0.46, glassJar, 14, false); for (let j = 0; j < 5; j++) KIT.s(g, x + rand(-0.06, 0.06), 1.12 + j * 0.07, rand(-0.06, 0.06), 0.045, KIT.m(cols[(i + j) % 6], { rough: 0.25 })); }
    const sign = mesh(new THREE.PlaneGeometry(1.6, 0.45), new THREE.MeshStandardMaterial({ map: woodSign(['BONBONS · 1000', 'LE COLOSSE EN RAFFOLE'], { w: 512, h: 150, bg: '#d84a6a', color: '#fff4e0' }), roughness: 0.7 }), 0, 2.0, -0.3, 0, g, false);
    KIT.solid(g, 2.2, 0.7, 1.05); WORLD.candyShop = { pos: new THREE.Vector3(s.x, 1, s.z) }; }

  /* ── Banque : guichets à barreaux, chambre forte ── */
  { const s = wallSpot(SPOTS.bank, 0.8), g = KIT.g(s.x, s.z, s.yaw);
    KIT.b(g, 0, 0.55, 0, 5.2, 1.1, 0.6, walnut); KIT.b(g, 0, 1.12, 0, 5.3, 0.06, 0.7, fmat('meuble', 0xa07050)); /* plateau de noyer verni, pas un parquet */
    for (let i = 0; i < 34; i++) { const x = -2.5 + i * 0.15; if (Math.abs(x + 1.2) < 0.3 || Math.abs(x - 1.2) < 0.3) continue; KIT.c(g, x, 1.65, 0, 0.012, 0.012, 1.0, MATS.brass, 6, false); }
    KIT.b(g, 0, 2.17, 0, 5.2, 0.06, 0.08, MATS.brass);
    for (const x of [-1.2, 1.2]) { const lab = mesh(new THREE.PlaneGeometry(0.9, 0.3), new THREE.MeshStandardMaterial({ map: woodSign([x < 0 ? 'DÉPÔTS' : 'RETRAITS'], { w: 256, h: 80, bg: '#1e2a1e', color: '#e8d890' }), roughness: 0.7 }), x, 2.3, 0.02, 0, g, false); }
    KIT.solid(g, 5.2, 0.6, 2.2);
    g.updateMatrixWorld(true);
    WORLD.bankDesk = { pos: new THREE.Vector3(s.x, 1, s.z), dep: new THREE.Vector3(-1.2, 0, 0.9).applyMatrix4(g.matrixWorld), wd: new THREE.Vector3(1.2, 0, 0.9).applyMatrix4(g.matrixWorld) }; }
  { const d = MAP.doors.find((q) => q.label === 'La chambre forte'); if (d) { const g = KIT.g(tcx(d.x) - 1.1, tcx(d.z) - 0.2, 0); const disc = KIT.c(g, 0, 1.3, 0, 1.2, 1.2, 0.3, fmat('acier', 0x5a5e60, { rough: 0.7, metal: 0.8 }), 28); /* acier sombre de coffre-fort, et non plus la tôle ondulée dessinée */ disc.rotation.x = Math.PI / 2; disc.rotation.z = 0.4; for (let i = 0; i < 6; i++) { const sp = KIT.b(g, 0, 1.3, 0.2, 0.08, 1.8, 0.06, MATS.brass); sp.rotation.z = (i / 6) * Math.PI; } } }
  kTable(X(27), X(11) + 0.5, 0, 1.6, 0.8, 0.78, walnut);
  swap(swap(kLamp(X(26) + 0.4, X(10) + 0.4, 0), k.chrome, MATS.brass), k.black, iron); /* lampe à pied en laiton sur socle de fonte, pas le lampadaire chromé des années 1950 */
  WORLD.bulbs = []; for (const x of [X(27), X(29), X(32)]) { const b = hangingLamp(x, 3.0, X(14), MATS.bulbWarm); WORLD.bulbs.push(b.glow); }

  /* ── Prison du shérif ── */
  kTable(X(9), X(24) + 1, 0, 1.8, 0.9, 0.78, walnut); kChair(X(9), X(24) + 0.2, 0, walnut);
  { const g = KIT.g(X(13) + 1.7, X(24) + 0.5, -Math.PI / 2); KIT.b(g, 0, 1.2, 0, 1.4, 1.6, 0.12, walnut); /* râtelier */ for (let i = 0; i < 4; i++) { const r = KIT.b(g, -0.45 + i * 0.3, 1.2, 0.1, 0.05, 1.2, 0.06, iron); r.rotation.z = 0.05; } }
  for (const x of [X(11) + 0.5, X(12) + 1.2]) { const g = KIT.g(x, X(29) + 1.4, 0); KIT.b(g, 0, 0.4, 0, 0.8, 0.08, 1.9, timber); KIT.b(g, 0, 0.48, 0, 0.76, 0.1, 1.8, fmat('toile', 0x8a7a5a, { rough: 1 })); /* couchette de planches brutes, paillasse de toile */ KIT.solid(g, 0.8, 1.9, 0.5); }

  /* ── Église ── */
  for (let r = 0; r < 6; r++) for (const s of [-1, 1]) { const g = KIT.g(X(27) + 1 + s * 2.6, X(25) + r * 1.4, 0); KIT.b(g, 0, 0.45, 0, 3.6, 0.08, 0.45, walnutLight); KIT.b(g, 0, 0.8, -0.2, 3.6, 0.6, 0.06, walnutLight); for (const e of [-1.7, 1.7]) KIT.b(g, e, 0.4, 0, 0.08, 0.8, 0.45, walnut); KIT.solid(g, 3.6, 0.5, 0.9); }
  { const g = KIT.g(X(27) + 1, X(32) + 1, 0); KIT.b(g, 0, 0.5, 0, 2.4, 1.0, 1.0, fmat('boisPeint', 0xe8e0cc)); /* autel de planches peintes en crème */ KIT.b(g, 0, 1.02, 0, 2.6, 0.05, 1.1, fmat('velours', 0x7a1a1a, { rough: 1 })); /* parement de velours rouge */ KIT.b(g, 0, 2.6, 0.45, 0.12, 1.8, 0.1, fmat('plain', 0xc8a84a, { rough: 0.3, metal: 0.8 })); KIT.b(g, 0, 3.0, 0.45, 0.8, 0.12, 0.1, fmat('plain', 0xc8a84a, { rough: 0.3, metal: 0.8 })); for (let i = 0; i < 6; i++) { KIT.c(g, -1 + i * 0.4, 1.2, 0, 0.03, 0.03, 0.3, fmat('plain', 0xf2eee0), 6, false); KIT.glow(g, -1 + i * 0.4, 1.42, 0, 0xffb060, 0.35, 0.8); } KIT.solid(g, 2.4, 1.0, 1.05); }
  // Toitures : église (clocher), magasin, prison ; les autres ont un toit plat derrière leur fronton.
  kGable(X(22), X(23), X(33), X(34), 5.35, 3.4, fv(['shingle', 0x5a4a3e]), 0.5, fv(['westPlank', 0xe8e0cc]));
  { const g = KIT.g(X(27) + 1, X(23) + 1.6, 0, 5.35), w = fmat('westPlank', 0xe8e0cc); KIT.b(g, 0, 2.2, 0, 2.6, 4.4, 2.6, w); KIT.b(g, 0, 4.5, 0, 2.9, 0.2, 2.9, trim); const sp = mesh(new THREE.ConeGeometry(2.1, 4.5, 4), fmat('shingle', 0x5a4a3e), 0, 6.8, 0, Math.PI / 4, g); const bell = KIT.c(g, 0, 3.3, 0, 0.3, 0.6, 0.7, MATS.brass, 14); KIT.b(g, 0, 9.2, 0, 0.1, 1.2, 0.1, fmat('plain', 0xc8a84a, { metal: 0.8 })); KIT.b(g, 0, 9.4, 0, 0.6, 0.1, 0.1, fmat('plain', 0xc8a84a, { metal: 0.8 })); }
  kGable(X(18), X(10), X(25), X(17), 4.55, 1.6, fv(['westPlank', 0x6a5a48]), 0.3, fv(['westPlank', 0xb08a60]));
  kGable(X(7), X(23), X(14), X(30), 4.55, 1.6, fv(['westPlank', 0x6a5a48]), 0.3, fv(['westPlank', 0xb08a60]));

  filCave();
  filDetails();
}

// La caverne : voûte bosselée percée d'un puits de lune, stalactites, parois, stalagmites.
function filCave() {
  const X = FIL.X, rock = fmat('rock', 0x6e5e4e, { vc: true }), rockV = fmat('rock', 0x7a6a58);
  const W = MAP_W * TILE, D = MAP_D * TILE, hx = X(22) + 1, hz = X(19) + 1, hr = 8.5;
  // Voûte : grille déplacée, trou circulaire au-dessus de la rue.
  { const gb = new GB(), S = 3, x0 = -24, x1 = W + 24, z0 = -24, z1 = D + 24, nx = Math.round((x1 - x0) / S), nz = Math.round((z1 - z0) / S);
    const H = (x, z) => 14.5 + (fbm(x * 0.04, z * 0.04, 3) - 0.5) * 7 + (fbm(x * 0.15, z * 0.15, 2) - 0.5) * 1.6 - Math.max(0, 1 - Math.hypot(x - W / 2, z - D / 2) / 90) * 0;
    for (let j = 0; j <= nz; j++) for (let i = 0; i <= nx; i++) { const x = x0 + i * S, z = z0 + j * S, y = H(x, z), c = 0.7 + fbm(x * 0.1, z * 0.1, 2) * 0.3; gb.p.push(x, y, z); gb.u.push(x / 5, z / 5); gb.n.push(0, -1, 0); gb.c.push(c, c * 0.95, c * 0.9); }
    for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) { const cx = x0 + (i + 0.5) * S, cz = z0 + (j + 0.5) * S; if (Math.hypot(cx - hx, cz - hz) < hr) continue; const a = j * (nx + 1) + i, b = a + 1, c = a + nx + 1, d = c + 1; gb.i.push(a, b, c, b, d, c); }
    const m = mesh(gb.geo(), rock, 0, 0, 0, 0, R.scene, true); m.material.side = THREE.DoubleSide;
    // Stalactites.
    const parts = [], r = mulberry32(9);
    for (let i = 0; i < 140; i++) { const x = x0 + r() * (x1 - x0), z = z0 + r() * (z1 - z0); if (Math.hypot(x - hx, z - hz) < hr + 2) continue; const h = 1.2 + r() * 4, g = new THREE.ConeGeometry(0.25 + r() * 0.6, h, 6); g.rotateX(Math.PI); g.translate(x, H(x, z) - h / 2 + 0.3, z); parts.push(meterUV(g, rockV, 1, 1, 1, x, z).toNonIndexed()); } /* UV en mètres avant la fusion */
    mesh(mergeGeometries(parts), rockV, 0, 0, 0, 0, R.scene, true); }
  // Parois de la caverne tout autour.
  { const gb = new GB(), pts = [], S = 4, pad = 14;
    const ring = [[-pad, -pad], [W + pad, -pad], [W + pad, D + pad], [-pad, D + pad], [-pad, -pad]];
    for (let s = 0; s < 4; s++) { const [ax, az] = ring[s], [bx, bz] = ring[s + 1], len = Math.hypot(bx - ax, bz - az), n = Math.round(len / S); for (let i = 0; i < n; i++) pts.push([ax + (bx - ax) * i / n, az + (bz - az) * i / n]); }
    const nv = 8, cx = W / 2, cz = D / 2;
    gb.grid(pts.length, nv, (s, v) => { const idx = Math.min(pts.length - 1, Math.round(s * pts.length)) % pts.length, [px, pz] = pts[idx], y = -2 + v * 20, dx = cx - px, dz = cz - pz, dl = Math.hypot(dx, dz) || 1, push = (fbm(px * 0.08 + y * 0.1, pz * 0.08, 3) - 0.5) * 9 + Math.sin(v * Math.PI) * 3; return { p: [px + (dx / dl) * push, y, pz + (dz / dl) * push], uv: [(px + pz) / 5, y / 5], c: [0.6 + v * 0.3, 0.55 + v * 0.3, 0.5 + v * 0.28] }; });
    const m = mesh(gb.geo(), rock, 0, 0, 0, 0, R.scene, true); m.material.side = THREE.DoubleSide; }
  // Stalagmites et blocs sur le sol extérieur, loin des barricades.
  { const parts = [], r = mulberry32(31);
    for (let i = 0; i < 90; i++) { const x = r() * W, z = r() * D; if (edgeAt(x, z) < 4.5) continue; const h = 1 + r() * 4.5, g = r() < 0.6 ? new THREE.ConeGeometry(0.4 + r() * 0.8, h, 7) : new THREE.DodecahedronGeometry(0.6 + r() * 1.2, 0); if (g.type === 'ConeGeometry') g.translate(0, h / 2, 0); g.translate(x, surfH(x, z) - 0.1, z); const gm = meterUV(g, rockV, 1, 1, 1, x, z); parts.push(gm.index ? gm.toNonIndexed() : gm); } /* UV en mètres avant la fusion */
    if (parts.length) mesh(mergeGeometries(parts), rockV, 0, 0, 0, 0, R.scene, true); }
  // Puits de lumière lunaire (cône additif, poussière en suspension).
  { const mat = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false, uniforms: { uTime: { value: 0 } },
      vertexShader: 'varying vec2 vUv; varying vec3 vN; varying vec3 vV; void main(){ vUv = uv; vN = normalize(normalMatrix * normal); vec4 mv = modelViewMatrix * vec4(position, 1.0); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }',
      fragmentShader: 'uniform float uTime; varying vec2 vUv; varying vec3 vN; varying vec3 vV; void main(){ float f = pow(abs(dot(vN, vV)), 2.0); float n = 0.75 + 0.25 * sin(vUv.x * 40.0 + uTime * 0.6) * sin(vUv.y * 12.0 - uTime * 0.3); gl_FragColor = vec4(vec3(0.6, 0.72, 1.0), f * n * 0.09 * smoothstep(0.0, 0.3, vUv.y)); }' });
    const c = new THREE.Mesh(new THREE.CylinderGeometry(hr - 1, hr + 1.5, 17, 28, 1, true), mat); c.position.set(hx, 7.5, hz); c.renderOrder = 6; R.scene.add(c); WORLD.shaft = c; }
}

/* ─── Finitions du Filon : église habitée, filons d'or, cristaux, lanternes ─── */
function filDetails() {
  // Chaire en noyer verni (famille 'meuble') ; la charpente de l'église garde les planches de la carte ; or et cire en teinte unie.
  const X = FIL.X, walnut = fmat('meuble', 0x4e3526), beam = fmat('planks', 0x5a3e28), gold = fmat('plain', 0xc8a84a, { rough: 0.3, metal: 0.8 }), wax = fmat('plain', 0xf2eee0);
  // Église : charpente apparente, deux lustres à bougies, tapis d'allée, chaire, croix, bénitier, chandeliers.
  { const cx = X(27) + 1, z0 = X(23), z1 = X(34), y = 4.95, tr = new Batch(boxG(0.22, 0.3, 1), beam);
    for (let z = z0 + 1.6; z < z1; z += 2.4) { tr.add(cx, y - 0.15, z, Math.PI / 2, 0, 0, 1, 1, X(33) - X(22) - 0.2); for (const s of [-1, 1]) { const b = tr.add(cx + s * 5.2, y - 0.75, z, Math.PI / 2, 0, s * 0.85, 1, 1, 1.6); } }
    tr.add(cx, y - 0.15, (z0 + z1) / 2, 0, 0, 0, 1, 1, z1 - z0 - 0.2); tr.build();
    for (const z of [X(26), X(30)]) { const ch = KIT.g(cx, z, 0, 3.7); KIT.c(ch, 0, 1.0, 0, 0.015, 0.015, 2.0, MATS.iron, 4, false); KIT.c(ch, 0, 0, 0, 0.75, 0.75, 0.05, MATS.iron, 18); for (let i = 0; i < 10; i++) { const a = (i / 10) * TAU; KIT.c(ch, Math.cos(a) * 0.72, 0.1, Math.sin(a) * 0.72, 0.025, 0.025, 0.16, wax, 6, false); KIT.glow(ch, Math.cos(a) * 0.72, 0.26, Math.sin(a) * 0.72, 0xffb050, 0.42, 0.85); } }
    kRug(cx, (X(24) + X(32)) / 2, 0, 1.3, X(32) - X(24), 0x7a1a1a);
    { const p = KIT.g(X(25) + 0.6, X(31) + 0.6, 0.6); KIT.c(p, 0, 0.55, 0, 0.35, 0.42, 1.1, walnut, 8); KIT.b(p, 0, 1.15, 0.1, 0.6, 0.06, 0.45, walnut); KIT.solid(p, 0.8, 0.8, 1.1); }
    { const c = KIT.g(cx, X(33) + 1.8, 0); KIT.b(c, 0, 3.3, 0, 0.16, 1.6, 0.08, gold); KIT.b(c, 0, 3.6, 0, 0.9, 0.14, 0.08, gold); KIT.glow(c, 0, 3.4, 0.1, 0xffd080, 1.6, 0.35); }
    for (const s of [-1, 1]) { const st = KIT.g(cx + s * 1.6, X(32) + 1.2, 0); KIT.c(st, 0, 0.6, 0, 0.03, 0.08, 1.2, gold, 8); KIT.c(st, 0, 1.25, 0, 0.035, 0.035, 0.22, wax, 6, false); KIT.glow(st, 0, 1.42, 0, 0xffb050, 0.55, 0.9); }
    { const f = KIT.g(cx + 2.4, X(23) + 1.4, 0); KIT.c(f, 0, 0.45, 0, 0.12, 0.18, 0.9, fmat('stone', 0xb8b0a4), 10); KIT.c(f, 0, 0.95, 0, 0.32, 0.18, 0.16, fmat('stone', 0xb8b0a4), 12); KIT.solid(f, 0.6, 0.6, 1.0, 'concrete'); }
  }
  // Galerie de mine : filons d'or qui luisent dans la roche, minerai dans le wagonnet, pics et pelles.
  { const goldGlow = new THREE.MeshStandardMaterial({ color: 0x9a7a2a, emissive: 0xd8a030, emissiveIntensity: 0.28, roughness: 0.35, metalness: 0.9 }), vein = new Batch(new THREE.DodecahedronGeometry(0.05, 0), goldGlow, false);
    for (let i = 0; i < 22; i++) { const x = X(37) + rand(0.4, X(47) - X(37) - 0.4), side = Math.random() < 0.5 ? X(18) - 0.02 : X(22) + 0.02, y = rand(0.8, 2.6), n = 3 + (Math.random() * 3) | 0, a = rand(-0.6, 0.6); for (let j = 0; j < n; j++) vein.add(x + Math.cos(a) * j * 0.07, y + Math.sin(a) * j * 0.07, side, rand(TAU), rand(TAU), 0, rand(0.5, 1), rand(0.5, 1), 0.6); }
    vein.build();
    const cartOre = new Batch(new THREE.DodecahedronGeometry(0.13, 0), goldGlow); for (let i = 0; i < 9; i++) cartOre.add(X(44) + rand(-0.4, 0.4), 1.24, X(19) + 1 + rand(-0.6, 0.6), rand(TAU), rand(TAU)); cartOre.build();
    for (const [x, ry] of [[X(40) + 0.4, 0.3], [X(45) + 1, -0.4]]) { const t = KIT.g(x, X(22) - 0.35, ry); const h = KIT.b(t, 0, 0.75, 0, 0.05, 1.5, 0.05, fmat('meuble', 0x9a7a5a)); /* manche de frêne poli par les mains */ h.rotation.z = 0.2; const hd = KIT.b(t, 0.15, 1.45, 0, 0.6, 0.06, 0.06, MATS.iron); hd.rotation.z = 0.2; }
  }
  // Cristaux de la caverne : touches de couleur froide le long des parois, hors du jeu.
  { const cm = new THREE.MeshStandardMaterial({ color: 0x6a8aff, emissive: 0x3a5aff, emissiveIntensity: 0.9, roughness: 0.15, metalness: 0.2, transparent: true, opacity: 0.85 }), cr = new Batch(new THREE.OctahedronGeometry(0.3, 0), cm, false), W = MAP_W * TILE, D = MAP_D * TILE, glows = KIT.g(0, 0);
    let placed = 0; for (let i = 0; i < 400 && placed < 26; i++) { const x = rand(-6, W + 6), z = rand(-6, D + 6), e = edgeAt(x, z); if (e < 3 || e > 9) continue; const y = surfH(x, z); for (let j = 0; j < 7; j++) cr.add(x + rand(-0.5, 0.5), y + rand(0, 0.4), z + rand(-0.5, 0.5), rand(TAU), rand(-0.5, 0.5), rand(-0.5, 0.5), rand(0.5, 1), rand(1.2, 3.2), rand(0.5, 1)); if (placed % 3 === 0) KIT.glow(glows, x, y + 0.8, z, 0x5a7aff, 3.2, 0.5); placed++; }
    cr.build(); }
  // Lanternes suspendues aux auvents des trottoirs.
  for (let x = X(8); x < X(35); x += 7.2) for (const z of [X(18) - 0.6, X(22) + 0.6]) { const l = KIT.g(x, z, 0, 3.0); KIT.c(l, 0, 0.2, 0, 0.012, 0.012, 0.4, MATS.iron, 4, false); KIT.b(l, 0, -0.1, 0, 0.18, 0.26, 0.18, MATS.iron); KIT.glow(l, 0, -0.1, 0, 0xffa040, 1.2, 0.85); }
}
