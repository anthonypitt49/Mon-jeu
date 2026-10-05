/* ═══════════════════ DÉCOR : machines, mobilier, no man's land ═══════════════════ */

const PERKS = {
  armor: { name: 'SANG-FROID', short: 'SF', color: '#e0474c', cost: 2500, desc: '+150 points de vie : encaissez bien plus de coups', notes: [0, 3, 7, 12, 10, 7, 12, 15] , base: 330 },
  reload: { name: 'MAIN LESTE', short: 'ML', color: '#7fdc6a', cost: 3000, desc: 'Rechargement deux fois plus rapide', notes: [0, 2, 4, 7, 9, 12, 16, 19], base: 392 },
  rof: { name: 'DOUBLE DÉTENTE', short: 'DD', color: '#f2a33a', cost: 2000, desc: 'Cadence de tir +33 %', notes: [7, 7, 12, 7, 5, 4, 5, 7], base: 349 },
  sprint: { name: 'PAS DE LOUP', short: 'PL', color: '#5fb4ff', cost: 2000, desc: 'Sprint illimité et plus rapide', notes: [0, 5, 9, 12, 9, 5, 7, 12], base: 440 },
  revive: { name: 'SECOND SOUFFLE', short: 'SS', color: '#b8f3ff', cost: 500, coopCost: 1500, desc: 'Solo : se relever seul · Co-op : relever 2× plus vite', notes: [0, 4, 7, 11, 12, null, 12, 19], base: 523 },
  mule: { name: 'TROISIÈME ARME', short: 'TA', color: '#3fd0b4', cost: 4000, desc: 'Portez une troisième arme (touche 3)', notes: [0, 7, 5, 7, 12, 11, 12, 16], base: 294 },
  deadshot: { name: 'ŒIL DE LYNX', short: 'OL', color: '#d8b46a', cost: 1500, desc: 'Tir plus précis, tirs à la tête plus meurtriers', notes: [0, 0, 7, 0, 5, 3, 0, 12], base: 220 },
  cherry: { name: 'DÉCHARGE', short: 'DC', color: '#ff5a9a', cost: 2000, desc: 'Recharger libère une décharge électrique autour de vous', notes: [12, 7, 12, 7, 15, 12, 19, 24], base: 330 },
};

// Bois des objets (établi, tables, couchettes, râtelier, poteaux indicateurs, brancard, touret, téléphone, hélice) :
// bois brut scié photographié (famille boisBrut, 05b_flat.js), UV en mètres. Planches : clarté de MATS.planks (blanc) ;
// montants et poteaux : celle de MATS.post. Les charpentes (tours des projecteurs, poteaux télégraphiques, chevaux de
// frise, poteau du mur de tranchée) gardent MATS.planks / MATS.post, les planches de tranchée photographiées de la carte.
const rawWood = () => fmat('boisBrut', 0xffffff, { rough: 0.88, snow: 1 });
const rawPost = () => fmat('boisBrut', 0x8a7a68, { rough: 0.9, snow: 1 });
// Peinture des machines communes (moteur de l'établi, générateur) : vert olive militaire en 1917, 1933 et 1957.
// Au Filon de 1880, la peinture militaire n'existe pas encore : fonte noire (même matière que la fonte de la trousse).
const machinePaint = () => (MAP_ID === 'filon' ? fmat('fonte', 0x232325, { rough: 0.6, metal: 0.5 }) : MATS.olive);

function buildInteractables() {
  // Machines d'atouts : armoires de campagne avec enseigne lumineuse.
  for (const s of SPOTS.perks) {
    const P = PERKS[s.perk], w = wallSpot(s, 0.42), g = new THREE.Group();
    g.position.set(w.x, 0, w.z); g.rotation.y = w.yaw; R.scene.add(g);
    if (M.perkDrop) g.userData.dynamic = true; // machines parachutées : elles bougent, on ne les fond pas dans le décor
    const col = new THREE.Color(P.color);
    // Caisson en tôle peinte de la couleur de l'atout (famille tole : la photo garde la teinte, code couleur intact).
    const body = fmat('tole', col.clone().multiplyScalar(0.35).getHex(), { rough: 0.5, metal: 0.55, snow: 0.5 });
    mesh(boxG(0.92, 1.85, 0.66), body, 0, 0.925, 0, 0, g);
    mesh(boxG(0.98, 0.08, 0.72), MATS.iron, 0, 1.89, 0, 0, g);
    mesh(boxG(0.98, 0.12, 0.72), MATS.iron, 0, 0.06, 0, 0, g);
    const signMat = new THREE.MeshStandardMaterial({ map: perkSign(P.name, P.color, s.perk === 'revive' ? `${P.cost}/${P.coopCost}` : P.cost), emissive: 0xffffff, emissiveMap: null, emissiveIntensity: 0.06, roughness: 0.4 });
    signMat.emissiveMap = signMat.map;
    const sign = mesh(new THREE.PlaneGeometry(0.84, 0.42), signMat, 0, 1.58, 0.335, 0, g, false);
    const glass = mesh(new THREE.PlaneGeometry(0.62, 0.66), new THREE.MeshStandardMaterial({ color: 0x0a1418, roughness: 0.05, metalness: 0.4, transparent: true, opacity: 0.55 }), 0, 0.98, 0.334, 0, g, false);
    const bottleMat = new THREE.MeshStandardMaterial({ color: col, emissive: col, emissiveIntensity: 0.05, roughness: 0.2 });
    for (let r = 0; r < 2; r++) for (let k = 0; k < 4; k++) mesh(new THREE.CylinderGeometry(0.045, 0.05, 0.22, 10), bottleMat, -0.22 + k * 0.145, 0.8 + r * 0.32, 0.18, 0, g, false);
    mesh(boxG(0.4, 0.12, 0.08), MATS.iron, 0, 0.42, 0.34, 0, g);
    const bulb = new THREE.Sprite(new THREE.SpriteMaterial({ map: TEX.sprites.glow, color: col, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0 }));
    bulb.scale.set(1.4, 1.4, 1); bulb.position.set(0, 2.05, 0.1); g.add(bulb);
    colliderBox(w.x, w.z, 0.92, 0.66, w.yaw, 1.9, 'metal');
    if (M.perkDrop) mergeGroup(g);
    WORLD.perks.push({ key: s.perk, pos: new THREE.Vector3(w.x, 1, w.z), face: w.face, sign: signMat, bottles: bottleMat, bulb, group: g, needsPower: s.perk !== 'revive' });
  }
  // Armes murales : silhouette à la craie + arme accrochée (ajoutée par le module armes).
  for (const s of SPOTS.wallBuys) {
    const w = wallSpot(s, 0.06), g = new THREE.Group(); g.position.set(w.x, 1.35, w.z); g.rotation.y = w.yaw; R.scene.add(g);
    WORLD.wallBuys.push({ weapon: s.weapon, pos: new THREE.Vector3(w.x, 1.3, w.z), face: w.face, group: g });
  }
  // Caisses de ravitaillement (emplacements possibles).
  WORLD.boxSpots = SPOTS.box.map((s, idx) => {
    const w = wallSpot(s, 0.42), g = new THREE.Group(); g.userData.dynamic = true; g.position.set(w.x, 0, w.z); g.rotation.y = w.yaw; R.scene.add(g);
    const base = mesh(boxG(1.5, 0.62, 0.72), MATS.crate, 0, 0.31, 0, 0, g);
    const lidPivot = new THREE.Group(); lidPivot.position.set(0, 0.62, -0.36); g.add(lidPivot);
    const lid = mesh(boxG(1.52, 0.1, 0.74), MATS.crate, 0, 0.05, 0.37, 0, lidPivot);
    const label = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 0.34), new THREE.MeshStandardMaterial({ map: woodSign(['RAVITAILLEMENT', '950 · ARME ALÉATOIRE'], { w: 512, h: 160, bg: '#3d3022', color: '#e8dfc6' }), roughness: 0.9 }));
    label.position.set(0, 0.34, 0.365); g.add(label);
    for (const o of [-0.68, 0.68]) mesh(boxG(0.06, 0.64, 0.76), MATS.iron, o, 0.32, 0, 0, g);
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: TEX.sprites.glow, color: 0x7fffd0, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0 }));
    glow.scale.set(1.6, 1.6, 1); glow.position.set(0, 1.0, 0); g.add(glow);
    // Fusée éclairante verte plantée à côté (signale la caisse active).
    const flare = mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.5, 8), MATS.rust, 0.85, 0.25, 0.1, 0, g);
    const beacon = new THREE.Sprite(new THREE.SpriteMaterial({ map: TEX.sprites.glow, color: 0x6dffb0, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0 }));
    beacon.scale.set(0.9, 0.9, 1); beacon.position.set(0.85, 0.55, 0.1); g.add(beacon);
    colliderBox(w.x, w.z, 1.5, 0.72, w.yaw, 0.7, 'wood');
    return { idx, pos: new THREE.Vector3(w.x, 0.9, w.z), face: w.face, group: g, lid: lidPivot, glow, beacon, flare, yaw: w.yaw, label };
  });
  // Établi d'armurier.
  { const s = SPOTS.bench, w = wallSpot(s, 0.5), g = new THREE.Group(); g.userData.dynamic = true; g.position.set(w.x, 0, w.z); g.rotation.y = w.yaw; R.scene.add(g);
    mesh(boxG(1.9, 0.1, 0.9), rawWood(), 0, 0.9, 0, 0, g);
    for (const [a, b] of [[-0.85, -0.38], [0.85, -0.38], [-0.85, 0.38], [0.85, 0.38]]) mesh(boxG(0.1, 0.9, 0.1), rawPost(), a, 0.45, b, 0, g);
    mesh(boxG(1.8, 0.06, 0.8), rawWood(), 0, 0.25, 0, 0, g);
    mesh(boxG(0.3, 0.22, 0.2), MATS.iron, -0.6, 1.06, 0.2, 0, g); // étau
    const wheel = mesh(new THREE.CylinderGeometry(0.26, 0.26, 0.06, 24), stdMat({ color: 0x6b6258, roughness: 0.95, map: TEX.concrete.map }), 0.55, 1.28, -0.1, 0, g); wheel.rotation.x = Math.PI / 2;
    mesh(boxG(0.2, 0.3, 0.2), machinePaint(), 0.55, 1.03, -0.1, 0, g);
    const tank = mesh(new THREE.CylinderGeometry(0.22, 0.22, 1.3, 16), machinePaint(), -0.2, 1.6, -0.3, 0, g);
    const coilMat = new THREE.MeshStandardMaterial({ color: 0x3aa8ff, emissive: 0x3ab8ff, emissiveIntensity: 0.02, roughness: 0.3 });
    for (let k = 0; k < 5; k++) { const c = mesh(new THREE.TorusGeometry(0.24, 0.018, 6, 24), coilMat, -0.2, 1.1 + k * 0.22, -0.3, 0, g, false); c.rotation.x = Math.PI / 2; }
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 0.4), new THREE.MeshStandardMaterial({ map: woodSign(['ÉTABLI D\'ARMURIER', 'AMÉLIORATION · 5000'], { w: 512, h: 190 }), roughness: 0.9 }));
    sign.position.set(0.3, 1.85, -0.4); g.add(sign);
    const lamp = new THREE.Sprite(new THREE.SpriteMaterial({ map: TEX.sprites.glow, color: 0x55c8ff, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0 }));
    lamp.scale.set(1.6, 1.6, 1); lamp.position.set(-0.2, 1.6, -0.1); g.add(lamp);
    const anchor = new THREE.Group(); anchor.position.set(0.1, 1.15, 0.12); g.add(anchor);
    colliderBox(w.x, w.z, 1.9, 0.9, w.yaw, 1.0, 'wood');
    WORLD.bench = { pos: new THREE.Vector3(w.x, 1, w.z), face: w.face, group: g, wheel, coil: coilMat, lamp, anchor };
    WORLD.spin.push({ obj: wheel, axis: 'y', speed: 0, key: 'bench' });
  }
  // Tableau électrique et générateur.
  { const s = SPOTS.power, w = wallSpot(s, 0.12), g = new THREE.Group(); g.userData.dynamic = true; g.position.set(w.x, 0, w.z); g.rotation.y = w.yaw; R.scene.add(g);
    // Armoire en tôle vert olive ; au Filon de 1880, coffret de noyer verni (tableaux de l'époque : bois et ardoise).
    mesh(boxG(1.0, 1.3, 0.2), MAP_ID === 'filon' ? fmat('meuble', 0x4e3526) : MATS.olive, 0, 1.35, 0, 0, g);
    const warn = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.3), new THREE.MeshStandardMaterial({ map: woodSign(['COURANT', 'GÉNÉRATEUR'], { w: 512, h: 170, bg: '#b8871c', color: '#1a1408' }), roughness: 0.7 }));
    warn.position.set(0, 2.15, 0.11); g.add(warn);
    for (let k = 0; k < 3; k++) { const gauge = mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.04, 20), stdMat({ color: 0xe8e2cf, roughness: 0.4 }), -0.3 + k * 0.3, 1.72, 0.11, 0, g, false); gauge.rotation.x = Math.PI / 2; }
    const pivot = new THREE.Group(); pivot.position.set(0.25, 1.2, 0.14); g.add(pivot);
    mesh(boxG(0.06, 0.5, 0.06), MATS.iron, 0, 0.25, 0, 0, pivot);
    mesh(new THREE.SphereGeometry(0.06, 12, 8), new THREE.MeshStandardMaterial({ color: 0xb01010, roughness: 0.4 }), 0, 0.5, 0, 0, pivot);
    pivot.rotation.x = 2.5;
    const lampMat = new THREE.MeshBasicMaterial({ color: 0x551010 });
    mesh(new THREE.SphereGeometry(0.05, 10, 8), lampMat, -0.3, 1.0, 0.11, 0, g, false);
    WORLD.power = { pos: new THREE.Vector3(w.x, 1.2, w.z), face: w.face, lever: pivot, lamp: lampMat };
  }
  if (SPOTS.generator) { const gx = SPOTS.generator.x, gz = SPOTS.generator.z, g = new THREE.Group(); g.userData.dynamic = true; g.position.set(gx, 0, gz); g.rotation.y = SPOTS.generator.ry || 0; R.scene.add(g);
    mesh(boxG(2.6, 0.25, 1.3), MATS.iron, 0, 0.13, 0, 0, g);
    mesh(boxG(1.7, 1.0, 1.0), machinePaint(), -0.25, 0.75, 0, 0, g);
    for (let k = 0; k < 4; k++) { mesh(boxG(0.3, 0.35, 0.34), machinePaint(), -0.85 + k * 0.4, 1.4, 0, 0, g); mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.3, 8), MATS.brass, -0.85 + k * 0.4, 1.72, 0.08, 0, g); }
    const fly = mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.14, 28), MATS.iron, 0.95, 0.75, 0, 0, g); fly.rotation.z = Math.PI / 2;
    for (let k = 0; k < 4; k++) { const sp = mesh(boxG(0.03, 1.0, 0.06), MATS.rust, 0, 0, 0, 0, fly); sp.rotation.y = (k / 4) * Math.PI; }
    const pipe = mesh(new THREE.CylinderGeometry(0.07, 0.07, 1.9, 10), MATS.rust, -1.0, 1.9, -0.35, 0, g);
    colliderBox(gx, gz, 2.7, 1.4, g.rotation.y, 1.6, 'metal');
    g.updateMatrixWorld(true);
    WORLD.generator = { group: g, fly, exhaust: new THREE.Vector3(-1.0, 2.9, -0.35).applyMatrix4(g.matrixWorld) };
    WORLD.spin.push({ obj: fly, axis: 'y', speed: 0, key: 'gen' });
  }
}

/* ─── Mobilier et détails ─── */
function crate(x, z, ry = 0, s = 1, y = 0) { const m = mesh(boxG(0.8 * s, 0.55 * s, 0.55 * s), MATS.crate, x, y + 0.275 * s, z, ry); if (y === 0) colliderBox(x, z, 0.8 * s, 0.55 * s, ry, 0.55 * s, 'wood'); return m; }
function barrel(x, z, mat = MATS.olive, tipped = false) {
  const m = mesh(new THREE.CylinderGeometry(0.29, 0.29, 0.88, 18), mat, x, tipped ? 0.29 : 0.44, z, rand(TAU));
  if (tipped) { m.rotation.z = Math.PI / 2; } else collider(x - 0.3, z - 0.3, x + 0.3, z + 0.3, 0.9, 'metal');
  for (const y of [-0.3, 0.3]) { const r = mesh(new THREE.TorusGeometry(0.295, 0.015, 6, 20), MATS.iron, 0, y, 0, 0, m, false); r.rotation.x = Math.PI / 2; }
  return m;
}
function poster(x, y, z, ry, title, sub, tone) { const p = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.7), new THREE.MeshStandardMaterial({ map: posterTexture(title, sub, tone), roughness: 0.95 })); p.position.set(x, y, z); p.rotation.y = ry; p.rotation.z = rand(-0.04, 0.04); R.scene.add(p); }
function signPost(x, z, ry, lines) {
  mesh(boxG(0.1, 2.0, 0.1), rawPost(), x, 1.0, z, ry);
  const s = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 0.4), new THREE.MeshStandardMaterial({ map: woodSign(lines, { w: 512, h: 190 }), roughness: 0.9, side: THREE.DoubleSide }));
  s.position.set(x, 1.75, z); s.rotation.y = ry; s.rotation.z = rand(-0.06, 0.06); s.castShadow = true; R.scene.add(s);
}
function hangingLamp(x, y, z, bulbMat, parent = R.scene) {
  const g = new THREE.Group(); g.userData.dynamic = true; g.position.set(x, y, z); parent.add(g);
  mesh(new THREE.CylinderGeometry(0.005, 0.005, 0.35, 4), MATS.iron, 0, 0.17, 0, 0, g, false);
  mesh(new THREE.ConeGeometry(0.18, 0.14, 16, 1, true), stdMat({ color: 0x31352f, metalness: 0.6, roughness: 0.5, side: THREE.DoubleSide }), 0, 0, 0, 0, g, false);
  const b = mesh(new THREE.SphereGeometry(0.055, 12, 8), bulbMat, 0, -0.05, 0, 0, g, false);
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: TEX.sprites.glow, color: bulbMat.color, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.8 }));
  glow.scale.set(0.9, 0.9, 1); glow.position.y = -0.06; g.add(glow);
  return { g, bulb: b, glow };
}
// Brasero : seau de tôle percé, rouillé et noirci par le feu (famille rouille ; ce n'est pas de la tôle ondulée).
function brazier(x, z) {
  const d = mesh(new THREE.CylinderGeometry(0.3, 0.27, 0.8, 16, 1, true), fmat('rouille', 0x3a2a20, { rough: 0.8, metal: 0.4, side: THREE.DoubleSide }), x, 0.4, z);
  collider(x - 0.32, z - 0.32, x + 0.32, z + 0.32, 0.9, 'metal');
  const coals = mesh(new THREE.CircleGeometry(0.28, 16), new THREE.MeshBasicMaterial({ color: 0xff5a1a }), x, 0.72, z, 0, R.scene, false); coals.rotation.x = -Math.PI / 2;
  WORLD.fires.push({ x, y: 0.8, z, size: 0.55, rate: 0.05, t: 0, smoke: 0.25, light: R.lights.brazier });
}

function buildProps() {
  const L = R.lights;
  // ── Zone A : première ligne ──
  brazier(44.2, 15.2);
  crate(15.4, 15.3, 0.1); crate(15.5, 15.3, -0.2, 0.9, 0.55); crate(16.3, 15.35, 0.3, 0.8);
  crate(60.6, 15.2, -0.15); barrel(62, 15.5, MATS.rust); barrel(62.3, 14.8, MATS.olive, true);
  // Banquette de tir et mitrailleuse en alvéole 2.
  // (banquette interrompue devant la barricade de l'alvéole : les infectés doivent pouvoir descendre)
  mesh(boxG(3.5, 0.45, 0.7), rawWood(), 50.05, 0.225, 8.35); collider(48.3, 8, 51.8, 8.7, 0.45, 'wood');
  mesh(boxG(3.5, 0.45, 0.7), rawWood(), 55.95, 0.225, 8.35); collider(54.2, 8, 57.7, 8.7, 0.45, 'wood');
  mesh(boxG(3.6, 0.45, 0.7), rawWood(), 29.8, 0.225, 8.35); collider(28.0, 8, 31.6, 8.7, 0.45, 'wood'); // dégagé de la sortie de la barricade voisine
  { const g = new THREE.Group(); g.position.set(56.7, 0.45, 8.4); R.scene.add(g);
    for (const a of [0, 2.1, 4.2]) { const leg = mesh(boxG(0.04, 0.9, 0.04), MATS.iron, Math.sin(a) * 0.25, 0.4, Math.cos(a) * 0.25, 0, g); leg.rotation.x = Math.cos(a) * 0.4; leg.rotation.z = -Math.sin(a) * 0.4; }
    const gun = new THREE.Group(); gun.position.set(0, 0.95, 0); gun.rotation.set(0.08, 0.1, 0); g.add(gun);
    mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.9, 12), MATS.olive, 0, 0, -0.3, 0, gun).rotation.x = Math.PI / 2;
    mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.6, 8), MATS.iron, 0, 0.02, -0.95, 0, gun).rotation.x = Math.PI / 2;
    mesh(boxG(0.14, 0.18, 0.5), MATS.iron, 0, 0.02, 0.28, 0, gun);
    mesh(boxG(0.3, 0.06, 0.02), MATS.olive, 0, 0.15, -0.1, 0, gun); }
  // Périscope, râtelier, casques et caisses de munitions.
  mesh(boxG(0.14, 1.2, 0.1), MATS.olive, 40, 2.1, 12.1);
  { const rack = new THREE.Group(); rack.position.set(35, 0, 15.75); R.scene.add(rack);
    mesh(boxG(1.4, 0.08, 0.2), rawPost(), 0, 0.3, 0, 0, rack); mesh(boxG(1.4, 0.08, 0.2), rawPost(), 0, 1.2, 0, 0, rack);
    for (let k = 0; k < 4; k++) { const r = mesh(boxG(0.05, 1.2, 0.07), rawPost(), -0.5 + k * 0.33, 0.75, -0.08, 0, rack); r.rotation.z = rand(-0.08, 0.08); } }
  for (const [x, z] of [[20, 12.4], [37, 15.6], [57, 13], [48, 15.6]]) { const h = mesh(new THREE.SphereGeometry(0.17, 12, 8, 0, TAU, 0, Math.PI / 2), MATS.olive, x, 0.03, z, rand(TAU)); h.rotation.x = rand(-0.4, 0.4); }
  for (const [x, z] of [[31, 15.6], [33, 15.5], [66, 12.6]]) mesh(boxG(0.4, 0.22, 0.2), MATS.olive, x, 0.11, z, rand(-0.3, 0.3));
  signPost(22.4, 15.3, 0, ['← POSTE DE CDT', 'NE PAS STATIONNER']);
  signPost(59.6, 15.3, 0, ['SOUTIEN EST →', '1ère LIGNE']);
  mesh(boxG(0.1, WALL_H + 0.4, 0.1), MATS.post, 24.6, (WALL_H + 0.4) / 2, 12.25);
  hangingLamp(25, 2.05, 12.7, MATS.bulbWarm);
  // Ligne téléphonique le long du mur sud.
  { const pts = []; for (let x = 12; x < 68; x += 4) { const a = [x, 2.15, 15.86], b = [x + 4, 2.15, 15.86]; for (let k = 0; k < 6; k++) { const t0 = k / 6, t1 = (k + 1) / 6; pts.push(lerp(a[0], b[0], t0), 2.15 - Math.sin(t0 * Math.PI) * 0.18, 15.86, lerp(a[0], b[0], t1), 2.15 - Math.sin(t1 * Math.PI) * 0.18, 15.86); } }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3)); R.scene.add(new THREE.LineSegments(g, MATS.wire)); }

  // ── Zone B : poste de commandement ──
  { const t = new THREE.Group(); t.position.set(19, 0, 31.2); R.scene.add(t);
    mesh(boxG(2.4, 0.08, 1.3), rawWood(), 0, 0.88, 0, 0, t);
    for (const [a, b] of [[-1.1, -0.55], [1.1, -0.55], [-1.1, 0.55], [1.1, 0.55]]) mesh(boxG(0.08, 0.86, 0.08), rawPost(), a, 0.43, b, 0, t);
    const map = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 1.2), new THREE.MeshStandardMaterial({ map: tableMapTexture(), roughness: 0.95 })); map.rotation.x = -Math.PI / 2; map.position.y = 0.925; map.rotation.z = 0.04; t.add(map);
    mesh(new THREE.CylinderGeometry(0.05, 0.06, 0.12, 10), MATS.brass, 0.7, 0.99, 0.3, 0, t);
    colliderBox(19, 31.2, 2.4, 1.3, 0, 0.95, 'wood'); }
  WORLD.bunkerLamp = hangingLamp(18.5, 2.2, 30.5, MATS.bulbRed);
  WORLD.bunkerLamp2 = hangingLamp(22.6, 2.2, 35.4, MATS.bulbRed);
  WORLD.powerLamps.push(WORLD.bunkerLamp, WORLD.bunkerLamp2);
  { const d = new THREE.Group(); d.position.set(11.1, 0, 28.6); d.rotation.y = Math.PI / 2; R.scene.add(d);
    mesh(boxG(1.4, 0.06, 0.65), rawWood(), 0, 0.78, 0, 0, d); mesh(boxG(1.3, 0.76, 0.6), rawPost(), 0, 0.38, 0, 0, d);
    mesh(boxG(0.7, 0.42, 0.4), MATS.olive, -0.2, 1.02, 0, 0, d);
    for (let k = 0; k < 4; k++) { const b = mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.02, 8), new THREE.MeshBasicMaterial({ color: k % 2 ? 0x55ff66 : 0xffaa22 }), -0.45 + k * 0.1, 1.1, 0.21, 0, d, false); b.rotation.x = Math.PI / 2; b.userData.dynamic = true; WORLD.blink.push({ m: b, rate: 0.5 + k * 0.7 }); }
    colliderBox(11.1, 28.6, 0.65, 1.4, 0, 1.2, 'wood'); }
  { // Couchettes : planches brutes et couvertures militaires en drap de laine (famille tissu, teinte de MATS.cloth)
    const b = new THREE.Group(); b.position.set(24.2, 0, 37.1); R.scene.add(b);
    const blanket = fmat('tissu', 0x5d5a44, { rough: 0.95, snow: 0.9 });
    for (const y of [0.45, 1.35]) { mesh(boxG(2.0, 0.08, 0.85), rawWood(), 0, y, 0, 0, b); mesh(boxG(1.9, 0.14, 0.78), blanket, 0, y + 0.1, 0, 0, b); }
    for (const [a, c] of [[-0.98, -0.4], [0.98, -0.4], [-0.98, 0.4], [0.98, 0.4]]) mesh(boxG(0.08, 1.9, 0.08), rawPost(), a, 0.95, c, 0, b);
    collider(23.2, 36.65, 25.2, 38, 1.9, 'wood'); }
  { // Poêle et tuyau
    mesh(new THREE.CylinderGeometry(0.26, 0.3, 0.7, 16), MATS.iron, 10.6, 0.35, 34.6); mesh(new THREE.CylinderGeometry(0.06, 0.06, 2.2, 10), MATS.iron, 10.6, 1.8, 34.6);
    const glow = mesh(new THREE.PlaneGeometry(0.16, 0.1), new THREE.MeshBasicMaterial({ color: 0xff6a20 }), 10.6, 0.3, 34.9, 0, R.scene, false); glow.rotation.y = 0;
    collider(10.3, 34.3, 10.9, 34.9, 0.8, 'metal');
    if (L.bunker2) { L.bunker2.color.set(0xff7a30); L.bunker2.intensity = L.bunker2.userData.base = 3.5; L.bunker2.position.set(11.2, 0.6, 34.8); L.bunker2.distance = 7; }
    WORLD.fires.push({ x: 10.6, y: WALL_H + 0.8, z: 34.6, size: 0, rate: 0.35, t: 0, smoke: 0.6 }); // fumée de la cheminée au-dessus du bunker
    mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.8, 10), MATS.iron, 10.6, WALL_H + 0.35, 34.6); }
  poster(16, 1.5, 26.05, 0, 'SILENCE', 'L\'ENNEMI\nÉCOUTE', '#c9b48a');
  poster(21, 1.45, 26.05, 0, 'TENIR', 'CHAQUE MÈTRE\nCOMPTE', '#b9a37c');
  poster(27.95, 1.5, 33, -Math.PI / 2, 'MASQUE', 'TOUJOURS\nÀ PORTÉE', '#a8b08a');
  crate(27.2, 37.3, 0.2); crate(26.6, 37.35, -0.1, 0.8, 0.55);
  for (let k = 0; k < 3; k++) mesh(new THREE.SphereGeometry(0.12, 10, 8), MATS.olive, 12 + k * 0.4, 1.7, 26.15);

  // ── Zone C : dépôt du générateur ──
  { mesh(new THREE.CylinderGeometry(0.1, 0.12, 4.6, 10), MATS.iron, 21, 2.3, 44.5); collider(20.85, 44.35, 21.15, 44.65, 4.6, 'metal');
    const head = new THREE.Group(); head.userData.dynamic = true; head.position.set(21, 4.4, 44.9); R.scene.add(head);
    mesh(new THREE.CylinderGeometry(0.28, 0.2, 0.35, 16), MATS.iron, 0, 0, 0, 0, head).rotation.x = 1.2;
    const lens = mesh(new THREE.CircleGeometry(0.24, 20), MATS.glassOff, 0, -0.1, 0.16, 0, head, false); lens.rotation.x = 1.2 - Math.PI / 2 + Math.PI;
    WORLD.floodLens = lens; }
  WORLD.shedLamp = hangingLamp(13.5, 2.25, 52.5, MATS.bulbRed); WORLD.powerLamps.push(WORLD.shedLamp);
  barrel(17.2, 55.2, MATS.rust); barrel(17.8, 54.6, MATS.rust); barrel(11, 50.8); barrel(30.6, 44.8, MATS.olive, true);
  crate(28.2, 55.4, 0.1); crate(29, 55.3, -0.2, 0.9); crate(28.5, 55.4, 0.4, 0.8, 0.55);
  { const reel = mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.5, 18), rawWood(), 28.5, 0.5, 49, 0); reel.rotation.x = Math.PI / 2; collider(28, 48.75, 29, 49.25, 1, 'wood'); }
  signPost(28.8, 45, Math.PI, ['DÉPÔT', 'DANGER — HAUTE TENSION']);

  // ── Zone D : soutien est et sape ──
  WORLD.dugoutLamp = hangingLamp(68, 2.2, 38, MATS.bulbWarm);
  crate(60.6, 30, 0.2); crate(63.4, 44, -0.1); barrel(60.5, 36.5, MATS.olive);
  { const s = new THREE.Group(); s.position.set(63.3, 0, 31.9); R.scene.add(s);
    for (const o of [-0.25, 0.25]) mesh(boxG(0.05, 0.05, 2.1), rawPost(), o, 0.3, 0, 0, s); mesh(boxG(0.5, 0.03, 1.8), MATS.cloth, 0, 0.33, 0, 0, s);
    collider(63.0, 30.8, 63.6, 33.0, 0.4, 'wood'); }
  signPost(61, 26.6, 0, ['SOUTIEN EST', 'SAPE →']);
  poster(64.05, 1.5, 39, Math.PI / 2, 'VIGILANCE', 'LA NUIT\nNE DORT PAS', '#c2b089');
}

/* ─── No man's land et arrière ─── */
function buildOutside() {
  const outside = (x, z) => edgeAt(x, z) > 2.2;
  // Arbres morts (fusionnés en une seule géométrie).
  const parts = [];
  for (let k = 0; k < 60; k++) {
    let x, z, tries = 0; do { x = srand(-40, 120); z = srand(-50, 112); tries++; } while (!outside(x, z) && tries < 20);
    const y = surfH(x, z) - 0.2, h = srand(4, 11), r = srand(0.16, 0.34), lean = srand(-0.12, 0.12);
    const trunk = new THREE.CylinderGeometry(r * 0.35, r, h, 7, 4); trunk.translate(0, h / 2, 0);
    const pa = trunk.attributes.position; for (let i = 0; i < pa.count; i++) { const yy = pa.getY(i); pa.setX(i, pa.getX(i) + lean * yy + Math.sin(yy * 1.3 + k) * 0.08); }
    const g = [trunk]; let sy = 1;
    if (srng() > 0.25) for (let b = 0; b < 3 + (srng() * 4 | 0); b++) {
      const bl = srand(1, 3), br = r * 0.3, by = srand(h * 0.35, h * 0.9), ba = srand(TAU);
      const bg = new THREE.CylinderGeometry(br * 0.3, br, bl, 5); bg.translate(0, bl / 2, 0); bg.rotateZ(srand(0.6, 1.2)); bg.rotateY(ba); bg.translate(lean * by, by, 0); g.push(bg);
    } else { trunk.scale(1, 0.4, 1); sy = 0.4; } // souche éclatée
    // Écorce photographiée : UV en mètres posées pièce par pièce AVANT la fusion (qui perd les paramètres des cylindres) ;
    // souche écrasée en hauteur (sy) ; chaque arbre et chaque branche lit la photo à un endroit différent.
    const tree = mergeGeometries(g.map((q, i) => meterUV(q, MATS.bark, 1, i ? 1 : sy, 1, x + i * 3.1, z + i * 1.7).toNonIndexed()));
    tree.rotateY(srand(TAU)); tree.translate(x, y, z); parts.push(tree);
  }
  mesh(mergeGeometries(parts), MATS.bark, 0, 0, 0, 0, R.scene, true);

  // Réseaux de barbelés et chevaux de frise.
  const posts = new Batch(boxG(0.07, 1.3, 0.07), MATS.iron), wire = [], coils = new Batch(helixGeo(4, 0.42, 16), MATS.wireMesh, false), frise = [];
  for (const row of [-5, -11, -19]) for (let x = -34; x < 118; x += 3.2) {
    const zz = row + Math.sin(x * 0.3) * 1.2 + srand(-0.4, 0.4); if (!outside(x, zz)) continue;
    const y = surfH(x, zz); posts.add(x, y + 0.55, zz, srand(TAU), srand(-0.1, 0.1), srand(-0.15, 0.15));
    const nx = x + 3.2, nz = row + Math.sin(nx * 0.3) * 1.2; if (!outside(nx, nz)) continue; const ny = surfH(nx, nz);
    for (const hh of [0.35, 0.7, 1.05]) for (let s = 0; s < 4; s++) { const t0 = s / 4, t1 = (s + 1) / 4; wire.push(lerp(x, nx, t0), lerp(y, ny, t0) + hh - Math.sin(t0 * Math.PI) * 0.15, lerp(zz, nz, t0), lerp(x, nx, t1), lerp(y, ny, t1) + hh - Math.sin(t1 * Math.PI) * 0.15, lerp(zz, nz, t1)); }
    if (srng() < 0.35) coils.add(x + 1.6, y + 0.35, zz + 0.9, 0, 0, Math.PI / 2 + srand(-0.1, 0.1));
  }
  for (let k = 0; k < 26; k++) {
    const x = srand(-30, 110), z = srand(-45, -2); if (!outside(x, z)) continue; const y = surfH(x, z), ry = srand(TAU);
    const beam = new THREE.CylinderGeometry(0.06, 0.06, 3, 6); beam.rotateZ(Math.PI / 2);
    const gs = [beam]; for (let s = 0; s < 3; s++) for (const a of [0.7, -0.7]) { const l = new THREE.CylinderGeometry(0.045, 0.045, 1.6, 5); l.rotateZ(a); l.translate(-1.2 + s * 1.2, 0, 0); gs.push(l); }
    const m = mergeGeometries(gs.map((q) => q.toNonIndexed())); m.rotateY(ry); m.translate(x, y + 0.55, z); frise.push(m);
  }
  posts.build(); coils.build();
  if (frise.length) mesh(mergeGeometries(frise), MATS.post, 0, 0, 0, 0, R.scene, true);
  { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(wire, 3)); R.scene.add(new THREE.LineSegments(g, MATS.wire)); }

  // Épave de camion en feu.
  { const x = 46, z = -16, y = surfH(x, z), g = new THREE.Group(); g.position.set(x, y, z); g.rotation.set(0.05, 0.6, -0.12); R.scene.add(g);
    mesh(boxG(2.2, 0.35, 6), MATS.char, 0, 0.7, 0, 0, g); mesh(boxG(2.1, 1.5, 1.8), MATS.char, 0, 1.55, -2.1, 0, g);
    mesh(boxG(2.2, 0.08, 3.8), MATS.rust, 0, 1.2, 0.9, 0, g);
    for (const [a, b] of [[-1.1, -2], [1.1, -2], [-1.1, 1.6], [1.1, 1.6]]) { const w = mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.3, 16), MATS.char, a, 0.45, b, 0, g); w.rotation.z = Math.PI / 2; }
    for (let k = 0; k < 5; k++) { const r = mesh(boxG(0.06, 1.4, 0.06), MATS.rust, 1.05 * (k % 2 ? 1 : -1), 1.9, -0.4 + k * 0.7, 0, g); r.rotation.x = srand(-0.3, 0.3); }
    WORLD.fires.push({ x, y: y + 1.6, z: z + 0.5, size: 1.6, rate: 0.02, t: 0, smoke: 0.08, light: R.lights.wreck, big: true }); }
  // Ferme en ruine et clocher lointain.
  { const x = 104, z = -12, y = surfH(x, z) - 0.3, g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = 0.4; R.scene.add(g);
    const wallP = [[0, 0, 12, 4.2, 0.5], [0, 8, 12, 2.6, 0.5], [-6, 4, 0.5, 3.4, 8], [6, 4, 0.5, 4.8, 8]];
    for (const [a, b, w, h, d] of wallP) mesh(boxG(w, h, d), MATS.stone, a, h / 2, b, 0, g);
    for (let k = 0; k < 6; k++) { const r = mesh(boxG(0.25, 0.25, 9), MATS.char, -5 + k * 2, 4.4 + srand(-0.4, 0.3), 4, 0, g); r.rotation.x = srand(-0.35, 0.35); r.rotation.z = srand(-0.2, 0.2); } }
  { const x = -32, z = -46, y = surfH(x, z) - 0.5, g = new THREE.Group(); g.position.set(x, y, z); R.scene.add(g);
    mesh(boxG(4, 16, 4), MATS.stone, 0, 8, 0, 0, g); const spire = mesh(new THREE.ConeGeometry(2.9, 7, 4), MATS.char, 0, 19, 0, Math.PI / 4, g); spire.rotation.z = 0.25;
    mesh(boxG(9, 7, 14), MATS.stone, 0, 3.5, 9, 0, g); }
  // Tours de projecteurs à l'arrière (faisceaux balayant le ciel).
  const beamMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false,
    uniforms: { uInt: { value: 0.12 } },
    vertexShader: 'varying float vT; varying vec3 vN; varying vec3 vV; void main(){ vT = uv.y; vN = normalize(normalMatrix * normal); vec4 mv = modelViewMatrix * vec4(position, 1.0); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }',
    fragmentShader: 'uniform float uInt; varying float vT; varying vec3 vN; varying vec3 vV; void main(){ float f = pow(abs(dot(vN, vV)), 1.6); gl_FragColor = vec4(vec3(0.85, 0.92, 1.0), pow(vT, 1.8) * f * uInt); }',
  });
  for (const [x, z, ph] of [[8, 84, 0], [80, 90, 2.4]]) {
    const y = surfH(x, z), g = new THREE.Group(); g.position.set(x, y, z); R.scene.add(g);
    for (const [a, b] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { const leg = mesh(boxG(0.18, 11, 0.18), MATS.post, a * 1.1, 5.5, b * 1.1, 0, g); leg.rotation.x = -b * 0.05; leg.rotation.z = a * 0.05; }
    mesh(boxG(3, 0.2, 3), MATS.planks, 0, 11, 0, 0, g);
    const head = new THREE.Group(); head.userData.dynamic = true; head.position.set(0, 11.7, 0); g.add(head);
    mesh(new THREE.CylinderGeometry(0.5, 0.4, 0.8, 16), MATS.iron, 0, 0, 0, 0, head).rotation.x = Math.PI / 2;
    const cone = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 9, 150, 24, 1, true), beamMat); // étroit à la lampe, large au loin
    cone.geometry.translate(0, -75, 0); cone.geometry.rotateX(-Math.PI / 2); cone.position.z = 0; head.add(cone);
    WORLD.beams.push({ head, ph });
  }
  // Poteaux télégraphiques le long de la route arrière.
  { const lines = [], poles = new Batch(new THREE.CylinderGeometry(0.1, 0.13, 7, 7), MATS.post), bars = new Batch(boxG(1.4, 0.1, 0.1), MATS.post);
    let prev = null;
    for (let x = -40; x <= 124; x += 11) { const z = 74 + Math.sin(x * 0.05) * 3, y = surfH(x, z); const lean = srand(-0.08, 0.08); poles.add(x, y + 3.3, z, 0, 0, lean); bars.add(x + lean * 6.5, y + 6.4, z, 0, 0, lean);
      if (prev) for (const o of [-0.55, 0.55]) for (let s = 0; s < 6; s++) { const t0 = s / 6, t1 = (s + 1) / 6; lines.push(lerp(prev[0], x, t0) + o, lerp(prev[1], y + 6.5, t0) - Math.sin(t0 * Math.PI) * 0.6, lerp(prev[2], z, t0), lerp(prev[0], x, t1) + o, lerp(prev[1], y + 6.5, t1) - Math.sin(t1 * Math.PI) * 0.6, lerp(prev[2], z, t1)); }
      prev = [x, y + 6.5, z]; }
    poles.build(); bars.build(); const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(lines, 3)); R.scene.add(new THREE.LineSegments(g, MATS.wire)); }
  // Flaques gelées dans les cratères.
  for (const c of CRATERS) { if (srng() > 0.5 || c.r < 3) continue; const ice = new THREE.Mesh(new THREE.CircleGeometry(c.r * 0.45, 20), MATS.ice); ice.rotation.x = -Math.PI / 2; ice.position.set(c.x, surfH(c.x, c.z) + 0.04, c.z); ice.receiveShadow = true; R.scene.add(ice); }
  // Sacs de sable sur le toit du bunker (vus de l'extérieur) et tôle du hangar.
  { const bags = new Batch(sandbagGeo(), MATS.sandbag); for (let k = 0; k < 60; k++) bags.add(srand(10.5, 27.5), WALL_H + 0.1, srand(26.5, 37.5), srand(TAU)); bags.build(); }
}
const srng = () => rng();
