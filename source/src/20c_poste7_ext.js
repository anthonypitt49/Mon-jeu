/* ═══════════════════ POSTE 7 : LA SAPE, LA FERME DE BELLEVUE, LE POSTE D'OBSERVATION ═══════════════════
   Agrandissement de la version 7.0 (grille et hauteurs du sol : 20_map_poste7.js ; parois, plafonds bas et rampes qui
   suivent le sol : 05_world.js). La Sape est une galerie de mine boisée qui descend sous le no man's land vers une chambre
   chargée d'explosifs ; la Ferme de Bellevue, une grande cour de ferme en ruine à ciel ouvert, où l'on entre de partout ;
   le Poste d'observation, une plate-forme de terre surélevée d'où l'on voit tout le secteur.
   Ruines de la ferme : des pans de mur isolés, jamais d'enclos (les infectés suivent la grille et glissent le long des
   obstacles : un recoin fermé les piégerait). */

function buildPoste7Expansion() { buildSape(); buildFerme(); buildObservation(); }

// Objet posé sur le sol réel (galerie qui descend, plate-forme) : groupe à la bonne hauteur.
function p7g(x, z, ry = 0) { const g = new THREE.Group(); g.position.set(x, floorAt(x, z), z); g.rotation.y = ry; R.scene.add(g); return g; }
const p7Box = (x, z, w, d, h, ry, mat, y0 = floorAt(x, z)) => MAP.props.push(propBox({ y0, y1: y0 + h, mat }, x, z, w, d, ry));
// Terre en tas (la matière des parois attend leurs couleurs de sommets : sans elles, elle sortirait noire).
let P7_DIRT = null; const p7Dirt = () => (P7_DIRT ||= stdMat({ color: 0x4a3c30, map: TEX.earth.map, normalMap: TEX.earth.normalMap, roughness: 1 }, 0.4));

/* ─── La Sape ─── */
function buildSape() {
  signPost(62.4, 59, 0, ['LA SAPE', 'DÉFENSE DE FUMER']);
  // Lampes pendues au plafond de la galerie et de la chambre (l'éclairage de la chambre : R.lights.mine).
  WORLD.sapeLamps = [[63, 63.5], [63, 68.5], [60, 73], [54, 73], [49, 73], [37.5, 71], [45, 71], [37.5, 80], [45, 80]]
    .map(([x, z]) => hangingLamp(x, roofAt(x, z) - 0.3, z, MATS.bulbWarm));
  // Wagonnet sur la voie, chargé de terre.
  { const g = p7g(56.5, 73, Math.PI / 2);
    mesh(boxG(0.9, 0.55, 1.3), MATS.rust, 0, 0.55, 0, 0, g); mesh(boxG(0.8, 0.12, 1.2), p7Dirt(), 0, 0.8, 0, 0, g);
    for (const [a, b] of [[-0.42, -0.45], [0.42, -0.45], [-0.42, 0.45], [0.42, 0.45]]) { const w = mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.06, 12), MATS.iron, a, 0.2, b, 0, g); w.rotation.z = Math.PI / 2; }
    p7Box(56.5, 73, 0.95, 1.35, 0.85, Math.PI / 2, 'metal'); }
  // Étais de bois en travers de la galerie (cadres de mine).
  for (const [x, z, a] of [[63, 65.5, 0], [63, 70.5, 0], [57.5, 73, 1], [51.5, 73, 1]]) {
    const r = roofAt(x, z), f = floorAt(x, z), g = p7g(x, z, a ? Math.PI / 2 : 0);
    mesh(boxG(2.1, 0.18, 0.2), rawPost(), 0, r - f - 0.1, 0, 0, g);
  }
  // Chambre de mine : caisses d'explosif (ammonal) contre les parois, touret de câble, exploseur, poste d'écoute.
  const amm = woodSign(['AMMONAL', '⚠ EXPLOSIF'], { w: 256, h: 128 });
  const ammMat = new THREE.MeshStandardMaterial({ map: amm, roughness: 0.9 });
  for (const [x, z, n] of [[35.3, 69.3, 3], [35.3, 74, 2], [47.2, 69.3, 3], [41, 69.2, 2]]) {
    const f = floorAt(x, z);
    for (let k = 0; k < n; k++) { const cx = x + (k % 2) * 0.85, cy = f + (k >> 1) * 0.55; crate(cx, z, 0, 1, cy); const lab = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.3), ammMat); lab.position.set(cx, cy + 0.3, z + 0.28); R.scene.add(lab); }
  }
  { const g = p7g(40.5, 81); const reel = mesh(new THREE.CylinderGeometry(0.45, 0.45, 0.5, 18), rawWood(), 0, 0.45, 0, 0, g); reel.rotation.x = Math.PI / 2; p7Box(40.5, 81, 0.9, 0.5, 0.9, 0, 'wood'); }
  { const g = p7g(46.2, 79.6, -Math.PI / 2); WORLD.sapeDetonator = g; // exploseur à poignée (la quête s'en servira)
    mesh(boxG(0.4, 0.32, 0.3), rawWood(), 0, 0.16, 0, 0, g); mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.45, 8), MATS.iron, 0, 0.5, 0, 0, g); mesh(boxG(0.36, 0.04, 0.04), MATS.iron, 0, 0.72, 0, 0, g);
    p7Box(46.2, 79.6, 0.4, 0.3, 0.75, 0, 'wood'); }
  { const g = p7g(45.6, 70.2); // poste d'écoute : table, géophone, casque
    mesh(boxG(1.2, 0.06, 0.6), rawWood(), 0, 0.8, 0, 0, g); for (const [a, b] of [[-0.55, -0.25], [0.55, -0.25], [-0.55, 0.25], [0.55, 0.25]]) mesh(boxG(0.06, 0.8, 0.06), rawPost(), a, 0.4, b, 0, g);
    mesh(new THREE.CylinderGeometry(0.1, 0.12, 0.12, 14), MATS.brass, -0.3, 0.89, 0, 0, g); mesh(new THREE.TorusGeometry(0.09, 0.015, 6, 16), MATS.iron, 0.2, 0.88, 0, 0, g).rotation.x = Math.PI / 2;
    p7Box(45.6, 70.2, 1.2, 0.6, 0.9, 0, 'wood'); }
  // Outils et seaux, éboulis de terre au fond.
  for (const [x, z] of [[36, 77], [42.5, 75.5], [47, 76.5]]) { const g = p7g(x, z, rand(TAU)); mesh(new THREE.CylinderGeometry(0.15, 0.12, 0.3, 12), MATS.iron, 0, 0.15, 0, 0, g); }
  for (const [x, z] of [[35.8, 81], [37, 81.4], [47.5, 81.3]]) { const g = p7g(x, z); const m = mesh(new THREE.SphereGeometry(0.6, 9, 6, 0, TAU, 0, Math.PI / 2), p7Dirt(), 0, 0, 0, rand(TAU), g); m.scale.set(1.3, 0.6, 1); p7Box(x, z, 1.2, 1.2, 0.35, 0, 'earth'); }
  { const g = p7g(33.2, 75.5, Math.PI / 2); for (const o of [-0.25, 0.25]) { const t = mesh(boxG(0.05, 1.3, 0.04), rawPost(), o, 0.65, 0, 0, g); t.rotation.z = o * 0.4; } } // pelles appuyées
  poster(41.5, floorAt(41.5, 82) + 1.5, 81.9, Math.PI, 'SILENCE', 'ILS CREUSENT\nAUSSI', '#b9a37c');
}

/* ─── La Ferme de Bellevue ─── */
function buildFerme() {
  const stone = MATS.stone, ch = MATS.char;
  // Pans de mur de la ferme incendiée (pierre), poutres calcinées. Isolés : aucun enclos où les infectés resteraient coincés.
  const wall = (x, z, w, d, h, ry = 0) => { mesh(boxG(w, h, d), stone, x, h / 2, z, ry); colliderBox(x, z, w, d, ry, h, 'concrete'); };
  wall(25.7, 72, 4.6, 0.55, 4.4);                 // pignon nord, porte arrachée
  { const m = mesh(boxG(1.1, 1.5, 0.56), stone, 25.7, 5.1, 72); m.rotation.z = 0.02; } // haut du pignon
  wall(22, 75.2, 0.55, 4.6, 3.1);                 // mur ouest (l'angle reste ouvert)
  wall(26.6, 80, 1.3, 1.3, 5.4);                  // cheminée restée debout
  wall(13, 79, 5.4, 0.5, 0.95);                   // muret effondré
  for (let k = 0; k < 6; k++) { const b = mesh(boxG(0.22, 0.22, 4.2), ch, 23 + k * 0.9 + rand(-0.2, 0.2), 0.35 + rand(0, 0.9), 76.5 + rand(-1, 1)); b.rotation.set(rand(-0.25, 0.25), rand(-0.6, 0.6), rand(-0.3, 0.3)); }
  for (const [x, z, s] of [[24.5, 78.5, 1.1], [28.2, 74.5, 0.8], [20.5, 82, 0.9]]) { const m = mesh(new THREE.SphereGeometry(1, 9, 6, 0, TAU, 0, Math.PI / 2), stone, x, 0, z, rand(TAU)); m.scale.set(s * 1.3, s * 0.45, s); colliderBox(x, z, s * 2, s * 1.6, 0, s * 0.4, 'concrete'); }
  // Puits.
  { const x = 11.5, z = 69.5;
    mesh(new THREE.CylinderGeometry(0.85, 0.9, 0.9, 18, 1, true), fmat('pierre', 0x7a7468, { rough: 1, side: THREE.DoubleSide }), x, 0.45, z); colliderCyl(x, z, 0.9, 0.9, 'concrete');
    const water = mesh(new THREE.CircleGeometry(0.8, 18), new THREE.MeshBasicMaterial({ color: 0x0a0d10 }), x, 0.35, z, 0, R.scene, false); water.rotation.x = -Math.PI / 2;
    for (const o of [-0.8, 0.8]) mesh(boxG(0.1, 1.9, 0.1), rawPost(), x + o, 1.3, z);
    mesh(boxG(1.9, 0.1, 0.1), rawPost(), x, 2.2, z); const roof = mesh(boxG(2.1, 0.06, 1.3), rawWood(), x, 2.4, z); roof.rotation.z = 0.06; }
  // Charrette renversée, bottes de foin, abreuvoir, tas de fumier gelé.
  { const g = p7g(27.4, 85, 0.5); const bed = mesh(boxG(1.4, 0.12, 2.6), rawWood(), 0, 0.55, 0, 0, g); bed.rotation.x = 0.25;
    for (const s of [-0.75, 0.75]) { const w = mesh(new THREE.TorusGeometry(0.55, 0.06, 6, 18), rawPost(), s, 0.55, 0.2, 0, g); w.rotation.y = Math.PI / 2; }
    mesh(boxG(0.08, 0.08, 2.2), rawPost(), 0, 0.3, -2.1, 0, g).rotation.x = -0.3; colliderBox(27.4, 85, 1.6, 2.8, 0.5, 1.1, 'wood'); }
  const hay = fmat('foin', 0xb39a5a, { rough: 1, snow: 0.6 });
  for (const [x, z, y, r] of [[8, 86, 0, 0.1], [9.25, 86.1, 0, -0.05], [8.6, 86, 0.5, 0.2], [30.5, 66.3, 0, 1.2]]) { mesh(boxG(1.2, 0.5, 0.55), hay, x, y + 0.25, z, r); if (!y) colliderBox(x, z, 1.2, 0.55, r, 0.5, 'wood'); }
  { mesh(boxG(2.2, 0.5, 0.6), rawWood(), 15.2, 0.25, 66.2); colliderBox(15.2, 66.2, 2.2, 0.6, 0, 0.5, 'wood'); const ice = mesh(boxG(2.05, 0.02, 0.45), stdMat({ color: 0xbfd2e0, roughness: 0.15 }), 15.2, 0.48, 66.2, 0, R.scene, false); void ice; }
  // Tombes fraîches à l'est de la cour (croix de bois, terre retournée) : d'où viennent-ils, à votre avis ?
  for (let k = 0; k < 4; k++) {
    const x = 29.6, z = 69 + k * 1.6;
    const m = mesh(new THREE.SphereGeometry(1, 8, 5, 0, TAU, 0, Math.PI / 2), p7Dirt(), x - 0.9, 0, z, 0); m.scale.set(1.1, 0.22, 0.45);
    const c = new THREE.Group(); c.position.set(x + 0.3, 0, z); c.rotation.z = rand(-0.15, 0.15); R.scene.add(c);
    mesh(boxG(0.08, 1.1, 0.08), rawPost(), 0, 0.55, 0, 0, c); mesh(boxG(0.08, 0.08, 0.55), rawPost(), 0, 0.82, 0, 0, c);
  }
  // Arbre mort au milieu de la cour, palissade brisée, feu dans un fût (lumière : R.lights.farm).
  { const t = new THREE.CylinderGeometry(0.12, 0.3, 6.5, 8, 3); t.translate(0, 3.25, 0); const m = mesh(t, MATS.bark, 17.5, -0.1, 82.5); m.rotation.z = 0.08; colliderCyl(17.5, 82.5, 0.3, 3, 'wood');
    for (let k = 0; k < 4; k++) { const b = new THREE.CylinderGeometry(0.03, 0.08, 1.8, 5); b.translate(0, 0.9, 0); const bm = mesh(b, MATS.bark, 17.5, 2.5 + k * 0.9, 82.5, k * 1.7); bm.rotation.z = 0.9 + rand(-0.2, 0.2); } }
  for (let k = 0; k < 7; k++) { const x = 6.8 + k * 1.1; if (k === 3) continue; const p = mesh(boxG(0.1, rand(0.7, 1.3), 0.1), rawPost(), x, 0.5, 74.5); p.rotation.z = rand(-0.25, 0.25); }
  { const x = 18, z = 76.8; mesh(new THREE.CylinderGeometry(0.29, 0.29, 0.88, 18), MATS.rust, x, 0.44, z); colliderCyl(x, z, 0.3, 0.9, 'metal');
    WORLD.fires.push({ x, y: 0.95, z, size: 0.6, rate: 0.05, t: 0, smoke: 0.3, light: R.lights.farm }); }
  crate(9.5, 65.2, 0.3); crate(10.3, 65.3, -0.1, 0.8); barrel(26.2, 66.4, MATS.rust); barrel(6.8, 80.2, MATS.olive, true);
  // Grange calcinée : la charpente seule, ouverte de tous côtés (poteaux, entraits, chevrons qui dépassent du sol).
  // (rien entre x 12 et 14 au sud : c'est devant la barricade)
  { for (const [x, z] of [[9.2, 82], [11.6, 82], [15.4, 82.2], [9.2, 87], [11.6, 87]]) { const h = rand(3.6, 4.6); const p = mesh(boxG(0.24, h, 0.24), MATS.char, x, h / 2, z); p.rotation.z = rand(-0.05, 0.05); colliderBox(x, z, 0.26, 0.26, 0, h, 'wood'); }
    for (const [z, w] of [[82, 6.4], [87, 2.6]]) { const b = mesh(boxG(w, 0.24, 0.24), MATS.char, 9.2 + w / 2 - 0.1, 3.7, z); b.rotation.z = rand(-0.04, 0.04); }
    for (let k = 0; k < 4; k++) { const r = mesh(boxG(0.16, 0.16, 5.6), MATS.char, 9.5 + k * 1.7, 4.3 + rand(-0.2, 0.2), 84.5); r.rotation.x = rand(-0.35, 0.35); r.rotation.y = rand(-0.08, 0.08); } }
  // Trou d'obus au milieu de la cour (le sol y descend : floorH) ; charrue, bois de chauffe contre le talus ouest.
  { const g = p7g(8.5, 77.3, 0.4); mesh(boxG(0.12, 0.12, 2.2), rawPost(), 0, 0.45, 0, 0, g).rotation.x = 0.35; const sh = mesh(boxG(0.5, 0.06, 0.6), MATS.iron, 0, 0.15, 0.9, 0, g); sh.rotation.x = -0.5;
    for (const s of [-0.35, 0.35]) mesh(boxG(0.06, 0.6, 0.06), rawPost(), s, 0.6, -0.7, 0, g); colliderBox(8.5, 77.3, 0.8, 2.2, 0.4, 0.8, 'wood'); }
  { for (let row = 0; row < 4; row++) for (let k = 0; k < 6; k++) { const l = mesh(new THREE.CylinderGeometry(0.11, 0.11, 1.1, 7), MATS.bark, 6.65, 0.12 + row * 0.21, 67 + k * 0.23 + (row % 2) * 0.11); l.rotation.x = Math.PI / 2; l.rotation.z = rand(-0.05, 0.05); }
    collider(6, 66.8, 7.3, 68.5, 0.9, 'wood'); }
  signPost(15.4, 61.2, 0, ['FERME DE BELLEVUE', '« ICI REPOSENT »']);
  poster(9.7, 1.5, 64.05, 0, 'RÉQUISITION', 'BÉTAIL ET\nFOURRAGE', '#b9a37c');
}

/* ─── Le Poste d'observation ─── */
function buildObservation() {
  const y0 = 1.8;
  // Mitrailleuse en batterie sur le parapet nord, pointée sur le no man's land.
  { const g = new THREE.Group(); g.position.set(89.6, y0, 27.2); R.scene.add(g); // (à l'écart de la rampe nord, x 86 à 88)
    for (const a of [1.05, 3.15, 5.25]) { const leg = mesh(boxG(0.04, 0.9, 0.04), MATS.iron, Math.sin(a) * 0.15, 0.4, Math.cos(a) * 0.15, 0, g); leg.rotation.x = -Math.cos(a) * 0.33; leg.rotation.z = Math.sin(a) * 0.33; }
    const gun = new THREE.Group(); gun.position.set(0, 0.95, 0); gun.rotation.set(-0.05, 0, 0); g.add(gun);
    mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.9, 12), MATS.olive, 0, 0, -0.3, 0, gun).rotation.x = Math.PI / 2;
    mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.6, 8), MATS.iron, 0, 0.02, -0.95, 0, gun).rotation.x = Math.PI / 2;
    mesh(boxG(0.14, 0.18, 0.5), MATS.iron, 0, 0.02, 0.28, 0, gun);
    collider(89.2, 26.9, 90, 27.6, y0 + 1.1, 'metal', y0); }
  // Lunette d'observation sur trépied, périscope, téléphone de campagne, caisses de fusées éclairantes.
  { const g = new THREE.Group(); g.position.set(84, y0, 28.2); g.rotation.y = 0.3; R.scene.add(g);
    for (const a of [0.5, 2.6, 4.7]) { const leg = mesh(boxG(0.03, 1.2, 0.03), rawPost(), Math.sin(a) * 0.2, 0.55, Math.cos(a) * 0.2, 0, g); leg.rotation.x = -Math.cos(a) * 0.3; leg.rotation.z = Math.sin(a) * 0.3; }
    const sc = mesh(new THREE.CylinderGeometry(0.05, 0.07, 0.7, 12), MATS.brass, 0, 1.2, -0.1, 0, g); sc.rotation.x = Math.PI / 2 - 0.1;
    collider(83.7, 27.9, 84.3, 28.5, y0 + 1.3, 'wood', y0); }
  mesh(boxG(0.14, 1.2, 0.1), MATS.olive, 90.5, y0 + 1.1, 26.5);
  { const g = new THREE.Group(); g.position.set(91.2, y0, 33); g.rotation.y = -Math.PI / 2; R.scene.add(g);
    mesh(boxG(0.7, 0.06, 0.5), rawWood(), 0, 0.75, 0, 0, g); mesh(boxG(0.6, 0.72, 0.42), rawPost(), 0, 0.36, 0, 0, g); mesh(boxG(0.3, 0.2, 0.22), MATS.olive, 0, 0.88, 0, 0, g);
    collider(90.9, 32.6, 91.5, 33.4, y0 + 1, 'wood', y0); }
  for (const [x, z, r] of [[83.2, 41.5, 0.1], [84.1, 41.6, -0.2], [83.6, 41.5, 0.3]]) crate(x, z, r, 0.85, y0 + (x === 83.6 ? 0.47 : 0));
  // Tour de guet en charpente au sud de la plate-forme (deux niveaux de plancher, échelle) et mât de pavillon.
  { const g = new THREE.Group(); g.position.set(88.5, y0, 40.5); R.scene.add(g);
    for (const [a, b] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) mesh(boxG(0.16, 5.2, 0.16), rawPost(), a, 2.6, b, 0, g);
    for (const h of [2.4, 4.4]) { mesh(boxG(2.4, 0.1, 2.4), rawWood(), 0, h, 0, 0, g); for (const s of [-1.15, 1.15]) { mesh(boxG(2.4, 0.06, 0.06), rawPost(), 0, h + 0.9, s, 0, g); mesh(boxG(0.06, 0.06, 2.4), rawPost(), s, h + 0.9, 0, 0, g); } }
    for (let k = 0; k < 10; k++) mesh(boxG(0.5, 0.05, 0.05), rawPost(), 0, 0.3 + k * 0.42, 1.15, 0, g);
    for (const s of [-0.25, 0.25]) mesh(boxG(0.05, 4.4, 0.05), rawPost(), s, 2.2, 1.15, 0, g);
    for (const [a, b] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) collider(88.5 + a - 0.1, 40.5 + b - 0.1, 88.5 + a + 0.1, 40.5 + b + 0.1, y0 + 5.2, 'wood', y0);
    WORLD.obsLamp = hangingLamp(0, 5.1, 0, MATS.bulbWarm, g); }
  { const x = 91.3, z = 37; mesh(new THREE.CylinderGeometry(0.04, 0.05, 7, 8), rawPost(), x, y0 + 3.5, z);
    const flag = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.8, 6, 1), new THREE.MeshStandardMaterial({ map: flagTexture(), roughness: 0.9, side: THREE.DoubleSide }));
    flag.position.set(x - 0.62, y0 + 6.5, z); flag.userData.dynamic = true; R.scene.add(flag); WORLD.obsFlag = flag; collider(x - 0.06, z - 0.06, x + 0.06, z + 0.06, y0 + 7, 'wood', y0); }
  // Bâche tendue sur quatre perches au-dessus des caisses (ouverte de tous côtés) ; sacs de sable autour de la mitrailleuse.
  { const tarp = new THREE.Mesh(new THREE.PlaneGeometry(3, 2.6, 6, 6), fmat('toile', 0x4d5040, { rough: 1, side: THREE.DoubleSide, snow: 1.2 }));
    const pa = tarp.geometry.attributes.position; for (let i = 0; i < pa.count; i++) pa.setZ(i, -Math.sin((pa.getX(i) / 3 + 0.5) * Math.PI) * 0.18); tarp.geometry.computeVertexNormals();
    tarp.rotation.x = -Math.PI / 2 + 0.08; tarp.position.set(84.3, y0 + 2.15, 40.2); tarp.castShadow = true; R.scene.add(tarp);
    for (const [a, b] of [[-1.4, -1.2], [1.4, -1.2], [-1.4, 1.2], [1.4, 1.2]]) { mesh(boxG(0.07, 2.2, 0.07), rawPost(), 84.3 + a, y0 + 1.1, 40.2 + b); collider(84.3 + a - 0.05, 40.2 + b - 0.05, 84.3 + a + 0.05, 40.2 + b + 0.05, y0 + 2.2, 'wood', y0); } }
  { const bag = sandbagGeo(), bags = new Batch(bag, MATS.sandbag);
    for (let k = 0; k < 9; k++) { const a = -1.2 + k * 0.3, x = 89.6 + Math.sin(a) * 1.15, z = 27.4 + Math.cos(a) * 1.15 - 1.15 + 1.3; for (let r = 0; r < 2; r++) bags.add(x, y0 + 0.1 + r * 0.19, z, a + Math.PI / 2 + rand(-0.1, 0.1)); }
    bags.build(); collider(88.3, 28.2, 90.9, 28.9, y0 + 0.4, 'earth', y0); }
  signPost(75.2, 35.4, 0, ["POSTE D'OBSERVATION", 'TÊTE BAISSÉE']);
}
// Drapeau tricolore, délavé et troué.
function flagTexture() {
  return textTexture(128, 84, (x, w, h) => { for (const [i, c] of ['#26407a', '#d9d4c4', '#a8302c'].entries()) { x.fillStyle = c; x.fillRect((i * w) / 3, 0, w / 3 + 1, h); }
    x.globalCompositeOperation = 'destination-out'; for (let k = 0; k < 7; k++) { x.beginPath(); x.arc(Math.random() * w, Math.random() * h, 2 + Math.random() * 5, 0, TAU); x.fill(); } });
}
// Le drapeau claque au vent (appelé par l'animation de la carte).
function p7ExtAnim(dt, time) {
  const f = WORLD.obsFlag; if (!f) return;
  const pa = f.geometry.attributes.position; for (let i = 0; i < pa.count; i++) { const u = (pa.getX(i) + 0.6) / 1.2; pa.setZ(i, Math.sin(time * 5 + u * 5) * 0.12 * u); } pa.needsUpdate = true;
}
