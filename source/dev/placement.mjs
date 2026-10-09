// Audit automatique du PLACEMENT DES OBJETS : flottants, enfoncés, dans un mur, superposés, passages bloqués, murs invisibles.
// usage : node placement.mjs <carte> → results/placement_<carte>.json, shots/placement_<carte>_<rang>.jpg (cas les plus graves),
//   résumé et « ERRORS n » (erreurs de la page). Une carte : 1 à 2 min sans captures, 20 à 40 s de plus par capture.
// env : SHOTS=n (captures des n premiers cas, 10 par défaut ; 0 = aucune) ; VOIR='motif' (captures en plus des cas dont le nom
//   ou les constats correspondent, ex. VOIR='kSink|fenêtre') ; Q='…' (paramètres d'URL en plus).
//
// Méthode (tout est mesuré dans la page, sur la scène construite) :
// - Chargement en ?spots&nomerge&nophoto&nozreal. La page servie est instrumentée à la volée (rien n'est changé dans src/) :
//   la fusion statique est sautée (?nomerge ne retient que la seconde : buildWorld fusionne déjà le décor) ; tout ce qui est
//   ajouté à la scène (maillage, lot, groupe) note la fonction qui l'a créé (userData.fnStack), comme KIT.spots le fait pour
//   les objets de la trousse (06b_kit.js, qui garde aussi le groupe lui-même) ; colliderBox note l'emprise réelle (rb) de
//   chaque boîte tournée dont il ne garde que la boîte englobante.
// - Objets audités : groupes de la trousse (KIT.spots), maillages, lots et groupes du décor (crate, barrel, sacs de sable,
//   décors de 06_props.js ou des fichiers de carte…), objets du jeu (caisses, établi, générateur, tableau, armes murales,
//   disques secrets, lampes suspendues). Le lointain (à plus de 10 m de la grille), l'architecture (murs, sols, clôtures,
//   fenêtres, portes) et les semis au sol (touffes, cailloux) ne sont pas audités (liste « non audités » du résumé).
// - Volume : chaque pièce (maillage) est tramée en colonnes verticales de 10 cm (entrée et sortie de la pièce sur la verticale
//   du centre de la colonne : intervalles exacts) et échantillonnée en surface tous les 5 cm (pièces minces : cadres, miroirs).
// - Contrôles :
//   · flottant : aucun point bas (bas de chaque colonne, sommets les plus bas de chaque pièce) à moins de 4 cm d'un appui
//     visible (triangle non vertical d'un autre objet ou de l'architecture, rayon vertical) ou du sol (groundAt) ; écartés :
//     objets faits pour être en hauteur, accrochés au plafond, à un mur ou à un objet posé (à moins de 15 cm, s'ils sont à
//     plus de 30 cm de tout appui : un fauteuil sans pieds contre une bibliothèque flotte quand même) ; mannequins assis :
//     rien sous le bassin ; végétation en boules à moins de 15 cm : information ;
//   · enfoncé : base à plus de 15 cm sous le sol, ou plus de la moitié du volume dessous ;
//   · dans un mur : points du volume dans un mur plein, un mur fin, une clôture, une barricade ou le plafond, au-delà de
//     15 % (50 % pour les objets fixés au mur, encastrés à moitié par construction), ou pièce cachée à 80 % dans le mur
//     (miroir…). Pièces pleines : centres des colonnes à plus de 5 cm sous la surface visible du mur (un dos de meuble enfoncé
//     de 3 cm ne se voit pas) ; pièces minces : points de surface à plus de 2 cm. Le trou des fenêtres décoratives (look
//     'window') est compté à part : ce qui s'y trouve se voit en travers de la vitre ;
//   · superposés : volume commun (intervalles des colonnes) de plus de 20 % du plus petit ; écartés : végétation entre elle,
//     mannequins assis volontairement (recouvrement de moins de 50 %), exemplaires d'un même lot ;
//   · passage bloqué : boîte de collision (MAP.props, celles qui arrêtent le joueur : y1 > 0,3 et y0 ≤ 1,6) sur une porte,
//     une barricade ou leur abord ; zones praticables coupées par les objets (dégagement sur une grille de 5 cm, chemin le
//     plus large depuis l'apparition du joueur, avec et sans les boîtes, rayon 0,34 m) puis vérifiées en jeu : le vrai
//     joueur (updatePlayer) essaie d'y entrer en suivant un chemin ; passages de moins de 0,8 m (moyen sous 0,72 m) ; points
//     d'apparition dans un obstacle ; éléments de jeu (portes, barricades, armes murales, caisses, établi, tableau, disques,
//     radio) hors de portée de toute position atteignable (rangés avec la zone coupée qui les contient) ;
//   · ouverture encombrée : objet (visible, avec ou sans boîte de collision) en travers d'une brèche d'un carreau dans un mur
//     (passage entre deux pièces, porte), entre 10 cm et 2,2 m de haut, à moins de 0,4 m de la ligne du mur, sur au moins 15 %
//     de la largeur ;
//   · fenêtre masquée : objet d'une pièce plaqué devant une fenêtre décorative, qui en cache au moins 25 % ;
//   · mur invisible : partie d'une boîte de collision au-dessus du sol praticable sans rien de visible entre 10 cm et
//     2 m (10 cm de tolérance), d'au moins 0,3 m² et 20 % de la boîte (ou 1 m²) ; boîte sans objet (collision orpheline) ;
//     pour les objets tournés, part hors de l'emprise réelle (colliderBox garde la boîte englobante alignée sur les axes) ;
//     mesure globale de cette piste dans rotBoxes et le résumé (excédent total, part au-dessus du sol praticable) ;
//   · traversable (information) : objet de plus de 60 cm sans boîte de collision, au sol praticable.
// - Gravité : 3 grave (bloque le jeu), 2 moyen (se voit ou gêne nettement), 1 léger, 0 information. Les cas (constats
//   regroupés par objet ou par zone ; même défaut sur plusieurs exemplaires d'un même modèle : un seul cas « ×n ») sont classés
//   par gravité puis ampleur ; captures à quatre vues : objet en jaune, boîtes de collision en rouge (pleines, pour voir les
//   murs invisibles), zone coupée en magenta.
import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';
const dir = path.dirname(new URL(import.meta.url).pathname);
const id = process.argv[2] || 'cite', NSHOTS = +(process.env.SHOTS ?? 10);
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
await ctx.addInitScript(() => { localStorage.setItem('sp_settings', JSON.stringify({ quality: 2 })); });
const page = await ctx.newPage(); const errors = [];
page.on('pageerror', (e) => errors.push('[pageerror] ' + e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push('[console] ' + m.text().slice(0, 300)); });
await page.route('https://cdn.jsdelivr.net/npm/three@0.186.1/**', (route) => { const u = new URL(route.request().url()); route.fulfill({ path: path.join(dir, 'node_modules/three', u.pathname.replace('/npm/three@0.186.1/', '')), contentType: 'application/javascript' }); });
await page.route('https://cdn.jsdelivr.net/npm/n8ao@2.0.1/**', (route) => route.fulfill({ path: path.join(dir, 'node_modules/n8ao/dist/N8AO.js'), contentType: 'application/javascript' }));
await page.route('https://fonts.googleapis.com/**', (r) => r.fulfill({ body: '', contentType: 'text/css' }));
await page.route('https://fonts.gstatic.com/**', (r) => r.abort());
// Instrumentation de la page servie (test seulement) : pas de fusion statique, nom de la fonction créatrice des maillages,
// lots et groupes ajoutés à la scène, emprise réelle des boîtes tournées (colliderBox ne garde que la boîte englobante).
const PATCHES = [
  ["import * as THREE from 'three';", "import * as THREE from 'three'; if (/spots/.test(location.search)) { const _add = THREE.Object3D.prototype.add; THREE.Object3D.prototype.add = function (...a) { if (this.isScene) for (const o of a) if (o && o.userData && !o.userData.fnStack) o.userData.fnStack = new Error().stack.split('\\n').slice(2, 7).map((l) => l.trim().split(' ')[1]); return _add.apply(this, a); }; }"],
  ['collider(x - hw, z - hd, x + hw, z + hd, h, mat); }', 'collider(x - hw, z - hd, x + hw, z + hd, h, mat); MAP.props[MAP.props.length - 1].rb = { x, z, w, d, ry }; }'],
  ['function mergeStatic() {', 'function mergeStatic() { if (/nomerge/.test(location.search)) return;'],
  ['const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.rotation.y = ry;', "const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.rotation.y = ry; if (KIT.spots && parent === R.scene) m.userData.fnStack = new Error().stack.split('\\n').slice(2, 6).map((l) => l.trim().split(' ')[1]);"],
  ['constructor(geo, mat, shadow = true) { this.geo = geo;', "constructor(geo, mat, shadow = true) { this.fnStack = new Error().stack.split('\\n').slice(2, 5).map((l) => l.trim().split(' ')[1]); this.geo = geo;"],
  ['parent.add(im); return im;', 'im.userData.fnStack = this.fnStack; parent.add(im); return im;'],
];
await page.route('http://127.0.0.1:8088/index.html*', async (route) => {
  const r = await route.fetch(); let body = await r.text();
  for (const [a, b] of PATCHES) { if (!body.includes(a)) errors.push('[instrumentation] motif introuvable dans index.html : ' + a.slice(0, 60)); body = body.replace(a, () => b); }
  route.fulfill({ response: r, body, headers: { ...r.headers(), 'content-type': 'text/html; charset=utf-8' } });
});
const t0 = Date.now();
await page.goto('http://127.0.0.1:8088/index.html?spots&nomerge&nophoto&nozreal' + (process.env.Q ? '&' + process.env.Q : '') + '#carte=' + id);
await page.waitForFunction(() => window.__spReady, null, { timeout: 180000 });
await page.evaluate(() => document.querySelector('#soloButton').click());
await page.waitForTimeout(1500);
await page.evaluate(() => { const { G, P, R } = SP; P.hp = P.maxHp = 1e9; G.breakT = 1e9; G.toSpawn = 0; for (const z of [...SP.ZOMBIES]) z.destroy(); R.viewScene.visible = false; document.getElementById('hud').classList.add('hidden'); });
console.log('carte', id, 'chargée en', ((Date.now() - t0) / 1000).toFixed(0), 's');

/* ═══════════════════ Analyse (dans la page) ═══════════════════ */
function pageAudit(opt) {
  const { R, THREE, KIT, MAP, WORLD, SECRET, P, G: GM, INPUT } = SP, Md = SP.M(), W = SP.MAPW(), D = MAP.type.length / W, TILE = 2, E = 0.08;
  const T_SOLID = 0, T_FLOOR = 1, T_DOOR = 2, T_RAMP = 3, T_BLOCK = 4, FLAT = !!Md.flat;
  const V = 0.1, MARGIN = opt.margin, t0 = performance.now(), timing = {};
  const lap = (k) => { timing[k] = Math.round(performance.now() - t0); };
  R.scene.updateMatrixWorld(true);
  const inMap = (x, z) => x >= 0 && z >= 0 && x < W && z < D;
  const tType = (x, z) => (inMap(x, z) ? MAP.type[z * W + x] : T_SOLID);
  const walkable = (x, z) => { const t = tType(x, z); return t === T_FLOOR || t === T_DOOR; };
  const tileOf = (v) => Math.floor(v / TILE);
  const ceilAt = (tx, tz) => { if (!FLAT) return 2.5; const sd = (Md.styleDefs || [])[MAP.style[tz * W + tx]]; return (sd && sd.ceilH) || Md.ceil || 3; };
  const roofed = (tx, tz) => inMap(tx, tz) && MAP.roof[tz * W + tx] && MAP.type[tz * W + tx] !== T_SOLID;
  const zoneName = (tx, tz) => { if (!inMap(tx, tz)) return 'hors carte'; const z = MAP.zone[tz * W + tx]; return z >= 0 ? Md.zones[z] : tType(tx, tz) === T_RAMP ? 'barricade' : 'extérieur'; };
  const r2 = (v) => Math.round(v * 100) / 100;
  const VEG = /kShrub|kPlant|kTree|scrub|arbre|Tree/;

  /* ─── Murs : même géométrie que solidAt (03_map.js), mais à l'épaisseur visible (EDGE_T) moins une tolérance ─── */
  function edgeK(ax, az, bx, bz) {
    let x, z, bit;
    if (bx === ax + 1 && bz === az) { x = ax; z = az; bit = 0; } else if (bx === ax - 1 && bz === az) { x = bx; z = bz; bit = 0; }
    else if (bz === az + 1 && bx === ax) { x = ax; z = az; bit = 1; } else if (bz === az - 1 && bx === ax) { x = bx; z = bz; bit = 1; } else return 0;
    return inMap(x, z) ? MAP.ek[(z * W + x) * 2 + bit] : 0;
  }
  // Mur fin à moins de T de la ligne du bord de carreau, à la hauteur y : sa définition (M.walls) ou null.
  // (w.hole : le point est dans le trou d'une fenêtre décorative, look 'window' : 0,45–1,55 m le long du carreau, 0,95–2,15 m
  // de haut, comme flatSolidWall ; on y voit au travers)
  const WIN = { s0: 0.45, s1: 1.55, y0: 0.95, y1: 2.15 };
  function edgeAt(x, y, z, T) {
    if (!MAP.hasEdges) return null;
    const tx = tileOf(x), tz = tileOf(z), fx = x - tx * TILE, fz = z - tz * TILE;
    const test = (ax, az, bx, bz, along) => { const k = edgeK(ax, az, bx, bz); if (!k) return null; const w = Md.walls[k - 1]; if (y >= w.h || y < (w.y0 || 0)) return null; return w.look === 'window' && along > WIN.s0 && along < WIN.s1 && y > WIN.y0 && y < WIN.y1 ? { ...w, hole: true } : w; };
    let w = null;
    if (fx > TILE - T) w = test(tx, tz, tx + 1, tz, fz); if (!w && fx < T) w = test(tx - 1, tz, tx, tz, fz);
    if (!w && fz > TILE - T) w = test(tx, tz, tx, tz + 1, fx); if (!w && fz < T) w = test(tx, tz - 1, tx, tz, fx);
    return w;
  }
  // Ce qui occupe le point : 'mur', 'fenêtre' (dans le trou d'une fenêtre : visible), 'clôture', 'barricade', 'plafond',
  // 'paroi' (tranchée) ou null (air, sol).
  function wallAt(x, y, z, TOL) {
    const w = edgeAt(x, y, z, E - TOL); if (w) return w.hole ? 'fenêtre' : w.see ? 'clôture' : 'mur';
    const tx = tileOf(x), tz = tileOf(z), t = tType(tx, tz);
    if (t === T_BLOCK) { for (const [a, b] of [[TOL, 0], [-TOL, 0], [0, TOL], [0, -TOL]]) if (tType(tileOf(x + a), tileOf(z + b)) !== T_BLOCK) return null; return SP.solidAt(x, y, z, true) ? 'mur' : null; }
    if (t === T_RAMP) return y > 0.05 && SP.solidAt(x, y, z, true) ? 'barricade' : null;
    if (t === T_FLOOR || t === T_DOOR) { if (roofed(tx, tz)) { const c = ceilAt(tx, tz); if (y > c + TOL && y < c + 0.35) return 'plafond'; } return null; }
    if (!FLAT && t === T_SOLID) { for (const [a, b] of [[TOL, 0], [-TOL, 0], [0, TOL], [0, -TOL]]) if (walkable(tileOf(x + a), tileOf(z + b))) return null; return y < SP.groundAt(x, z) - TOL ? 'paroi' : null; }
    return null;
  }
  // Un mur (plein, fin, paroi) à moins de d horizontalement du point : objet fixé au mur.
  function nearWall(x, y, z, d) {
    if (edgeAt(x, y, z, E + d)) return true;
    for (const [a, b] of [[d, 0], [-d, 0], [0, d], [0, -d]]) { const t = tType(tileOf(x + a), tileOf(z + b)); if (t === T_BLOCK && SP.solidAt(x + a, y, z + b, true)) return true; if (!FLAT && t === T_SOLID && y < SP.groundAt(x + a, z + b)) return true; }
    return false;
  }

  /* ─── Inventaire des objets ─── */
  const SKIP = /^(Object\.)?[bcsg]$|^mesh$|^Array\.|^http|^new$|^Batch\.|^<anonymous>|\.add$|^async$/;
  const fnName = (st) => (st || []).find((f) => f && !SKIP.test(f)) || null;
  // Architecture, terrain, semis, armes en main, infectés : pas audités. (Liste explicite : le décor du Poste 7 est posé par
  // buildProps, buildOutside, buildCraterProps, buildQuestProps, buildRobot, buildPoste7Extras, qui, eux, sont audités.)
  const ARCHI = /^(build(Doors|Fences|FlatRamps|FlatTerrain|FlatWorld|Ramps|Roofs|Sky|Terrain|Trenches|Water|World|Environment|Lights|Snow|Map|ZombieAssets|Body|Composer|ViewLights|Textures|Materials|Sprites|GunModel|DetailedGun|Knife|GrenadeModel)\b|flat|door|rough|qb|init|mount|scatter|decal|make|sky)/i;
  const visible = (o) => { for (let p = o; p; p = p.parent) if (!p.visible) return false; return true; };
  const isPart = (o) => (o.isMesh || o.isInstancedMesh) && !o.isSprite && o.geometry?.attributes?.position && visible(o) && !(o.material && !Array.isArray(o.material) && o.material.visible === false);
  const objs = [], owned = new Set();
  const addObj = (o) => { o.i = objs.length; objs.push(o); return o; };
  const partsOf = (root) => { const out = []; root.traverse((c) => { if (isPart(c) && !owned.has(c)) { out.push({ m: c }); owned.add(c); } }); return out; };
  // Trousse : un groupe par objet posé (KIT.g note la fonction qui l'a construit et garde le groupe).
  for (const s of KIT.spots || []) { if (!s.g || !s.g.parent || !visible(s.g)) continue; const parts = partsOf(s.g); if (parts.length) addObj({ name: s.fn || 'kit', kind: 'kit', parts, ry: s.ry, y: s.y }); }
  // Objets du jeu.
  const named = [];
  for (const p of WORLD.perks || []) named.push([p.group, 'atout ' + p.key]);
  for (const b of WORLD.boxSpots || []) named.push([b.group, 'caisse de ravitaillement']);
  if (WORLD.bench) named.push([WORLD.bench.group, "établi d'armurier"]);
  if (WORLD.generator) named.push([WORLD.generator.group, 'générateur']);
  if (WORLD.power?.lever) named.push([WORLD.power.lever.parent, 'tableau électrique']);
  for (const w of WORLD.wallBuys || []) named.push([w.group, 'arme murale ' + w.weapon]);
  for (const g of SECRET?.meshes || []) named.push([g, 'disque secret']);
  for (const l of WORLD.powerLamps || []) named.push([l.g, 'lampe suspendue']);
  for (const [g, n] of named) { if (!g || !g.parent || !visible(g)) continue; const parts = partsOf(g); if (parts.length) addObj({ name: n, kind: 'jeu', parts, ry: g.rotation.y, y: 0 }); }
  // Groupes posés directement dans la scène hors de la trousse (décors de 06_props.js, 22b_pen_decor.js…) : un objet par groupe.
  const unknown = {};
  for (const o of R.scene.children) {
    if (o.isMesh || o.isInstancedMesh || o.isPoints || o.isLine || !o.children.length || !visible(o)) continue;
    let free = 0; o.traverse((c) => { if (isPart(c) && !owned.has(c)) free++; }); if (!free) continue; // (déjà pris : trousse, objets du jeu)
    const fn = fnName(o.userData.fnStack);
    if (!fn || ARCHI.test(fn)) { const k = 'groupe ' + (fn || o.type); unknown[k] = (unknown[k] || 0) + 1; continue; }
    const parts = partsOf(o); if (parts.length) addObj({ name: fn, kind: 'groupe', parts, ry: o.rotation.y, y: o.position.y });
  }
  // Maillages et lots posés directement dans la scène par le décor (crate, barrel, kFrame, sacs de sable…).
  for (const o of R.scene.children) {
    if (!isPart(o) || owned.has(o)) continue;
    const fn = fnName(o.userData.fnStack);
    if (!fn || ARCHI.test(fn)) { const k = (o.isInstancedMesh ? 'lot ' : '') + (fn || o.geometry.type); unknown[k] = (unknown[k] || 0) + 1; continue; }
    owned.add(o);
    if (!o.isInstancedMesh) { addObj({ name: fn, kind: 'décor', parts: [{ m: o }], ry: o.rotation.y, y: 0 }); continue; }
    // Lot : exemplaires regroupés par voisinage (moins de 0,8 m), un objet par grappe.
    const n = o.count, pos = [], m4 = new THREE.Matrix4(), v = new THREE.Vector3();
    for (let k = 0; k < n; k++) { o.getMatrixAt(k, m4); v.setFromMatrixPosition(m4).applyMatrix4(o.matrixWorld); pos.push([v.x, v.y, v.z]); }
    const lab = new Int32Array(n).fill(-1); let nl = 0;
    for (let k = 0; k < n; k++) { if (lab[k] >= 0) continue; lab[k] = nl; const st = [k]; while (st.length) { const a = st.pop(); for (let b = 0; b < n; b++) if (lab[b] < 0 && Math.hypot(pos[a][0] - pos[b][0], pos[a][2] - pos[b][2]) < 0.8) { lab[b] = nl; st.push(b); } } nl++; }
    for (let c = 0; c < nl; c++) { const parts = []; for (let k = 0; k < n; k++) if (lab[k] === c) parts.push({ m: o, k }); addObj({ name: fn + ' (lot)', kind: 'lot', parts, ry: 0, y: 0, batch: true }); }
  }
  lap('inventaire');

  /* ─── Volume : colonnes de 10 cm (intervalles exacts) et points de surface ─── */
  const X0 = -MARGIN, Z0 = -MARGIN, Y0 = -3, NX = Math.ceil((W * TILE + 2 * MARGIN) / V), NZ = Math.ceil((D * TILE + 2 * MARGIN) / V), NY = 180;
  const vk = (ix, iy, iz) => (ix * NY + iy) * NZ + iz;
  const ixOf = (x) => Math.floor((x - X0) / V), iyOf = (y) => Math.floor((y - Y0) / V), izOf = (z) => Math.floor((z - Z0) / V);
  const ccx = (ck) => X0 + (Math.floor(ck / NZ) + 0.5) * V, ccz = (ck) => Z0 + (ck % NZ + 0.5) * V;
  const inGrid = (x, y, z) => x >= X0 && z >= Z0 && x < X0 + NX * V && z < Z0 + NZ * V && y >= Y0 && y < Y0 + NY * V;
  const A = new THREE.Vector3(), B = new THREE.Vector3(), C = new THREE.Vector3(), mw = new THREE.Matrix4(), mi = new THREE.Matrix4();
  const worldTris = (m, k, cb) => { // triangles monde d'une pièce (ou d'un exemplaire de lot)
    const g = m.geometry, pa = g.attributes.position, idx = g.index;
    mw.copy(m.matrixWorld); if (k !== undefined) { m.getMatrixAt(k, mi); mw.multiply(mi); }
    const nv = pa.count, wp = new Float32Array(nv * 3);
    for (let i = 0; i < nv; i++) { A.fromBufferAttribute(pa, i).applyMatrix4(mw); wp[i * 3] = A.x; wp[i * 3 + 1] = A.y; wp[i * 3 + 2] = A.z; }
    const nt = idx ? idx.count / 3 : nv / 3;
    for (let t = 0; t < nt; t++) { const ia = idx ? idx.getX(t * 3) : t * 3, ib = idx ? idx.getX(t * 3 + 1) : t * 3 + 1, ic = idx ? idx.getX(t * 3 + 2) : t * 3 + 2; cb(wp, ia * 3, ib * 3, ic * 3); }
    return wp;
  };
  function voxelize(o) {
    o.pc = []; o.surf = new Map(); o.low = []; o.pdesc = []; o.pthin = []; let minY = Infinity, maxY = -Infinity;
    const box = new THREE.Box3();
    o.parts.forEach((p, pi) => {
      const cols = new Map(), pb = new THREE.Box3();
      const wp = worldTris(p.m, p.k, (wp, a, b, c) => {
        A.set(wp[a], wp[a + 1], wp[a + 2]); B.set(wp[b], wp[b + 1], wp[b + 2]); C.set(wp[c], wp[c + 1], wp[c + 2]);
        // Surface : points réels tous les 5 cm (un par voxel de 10 cm).
        const L = Math.max(A.distanceTo(B), B.distanceTo(C), C.distanceTo(A)), n = Math.min(400, Math.max(1, Math.ceil(L / (V * 0.5))));
        for (let i = 0; i <= n; i++) for (let j = 0; j <= n - i; j++) {
          const u = i / n, w = j / n, x = A.x + (B.x - A.x) * u + (C.x - A.x) * w, y = A.y + (B.y - A.y) * u + (C.y - A.y) * w, z = A.z + (B.z - A.z) * u + (C.z - A.z) * w;
          if (!inGrid(x, y, z)) continue; const k = vk(ixOf(x), iyOf(y), izOf(z)); if (!o.surf.has(k)) o.surf.set(k, [x, y, z, pi]);
        }
        // Colonnes : entrée et sortie de la pièce sur la verticale du centre de chaque colonne.
        const d = (B.x - A.x) * (C.z - A.z) - (C.x - A.x) * (B.z - A.z); if (Math.abs(d) < 1e-9) return;
        const ix0 = Math.max(0, Math.ceil((Math.min(A.x, B.x, C.x) - X0) / V - 0.5)), ix1 = Math.min(NX - 1, Math.floor((Math.max(A.x, B.x, C.x) - X0) / V - 0.5));
        const iz0 = Math.max(0, Math.ceil((Math.min(A.z, B.z, C.z) - Z0) / V - 0.5)), iz1 = Math.min(NZ - 1, Math.floor((Math.max(A.z, B.z, C.z) - Z0) / V - 0.5));
        for (let ix = ix0; ix <= ix1; ix++) for (let iz = iz0; iz <= iz1; iz++) {
          const px = X0 + (ix + 0.5) * V, pz = Z0 + (iz + 0.5) * V;
          const u = ((px - A.x) * (C.z - A.z) - (C.x - A.x) * (pz - A.z)) / d, w = ((B.x - A.x) * (pz - A.z) - (px - A.x) * (B.z - A.z)) / d;
          if (u < -1e-6 || w < -1e-6 || u + w > 1 + 1e-6) continue;
          const y = A.y + (B.y - A.y) * u + (C.y - A.y) * w, ck = ix * NZ + iz, cc = cols.get(ck);
          if (cc) { if (y < cc[0]) cc[0] = y; if (y > cc[1]) cc[1] = y; } else cols.set(ck, [y, y]);
        }
      });
      for (let i = 0; i < wp.length; i += 3) { pb.expandByPoint(A.set(wp[i], wp[i + 1], wp[i + 2])); }
      box.union(pb); minY = Math.min(minY, pb.min.y); maxY = Math.max(maxY, pb.max.y);
      // Points bas de la pièce : sommets à moins de 2 cm de son bas (8 au plus).
      const low = []; for (let i = 0; i < wp.length; i += 3) if (wp[i + 1] < pb.min.y + 0.02) low.push([wp[i], wp[i + 1], wp[i + 2]]);
      for (let k = 0; k < low.length; k += Math.max(1, Math.floor(low.length / 8))) o.low.push(low[k]);
      o.pc.push(cols);
      const s = pb.getSize(new THREE.Vector3()); let pv = 0; for (const [, [a, b]] of cols) pv += (b - a) * V * V;
      o.pthin.push(Math.min(s.x, s.y, s.z) < 0.05 || pv < 0.0005); // pièce mince : miroir, cadre, planche, tôle
      o.pdesc.push(`${(p.m.geometry.type || '').replace('Geometry', '').toLowerCase() || 'pièce'} ${r2(s.x)} × ${r2(s.y)} × ${r2(s.z)} m à ${r2(pb.min.y)}–${r2(pb.max.y)} m`);
    });
    // Colonnes de l'objet : intervalles fusionnés de toutes ses pièces.
    o.cols = new Map(); o.vol = 0;
    for (const cols of o.pc) for (const [ck, iv] of cols) { const l = o.cols.get(ck); if (l) l.push([iv[0], iv[1]]); else o.cols.set(ck, [[iv[0], iv[1]]]); }
    for (const [ck, l] of o.cols) { l.sort((a, b) => a[0] - b[0]); const m = [l[0]]; for (let i = 1; i < l.length; i++) { const t = m[m.length - 1]; if (l[i][0] <= t[1]) t[1] = Math.max(t[1], l[i][1]); else m.push(l[i]); } o.cols.set(ck, m); for (const [a, b] of m) o.vol += (b - a) * V * V; }
    o.box = box; o.minY = minY; o.maxY = maxY; o.h = maxY - minY;
    const c = box.getCenter(new THREE.Vector3()), s = box.getSize(new THREE.Vector3()); o.c = [c.x, c.y, c.z]; o.size = [s.x, s.y, s.z];
    const tx = tileOf(c.x), tz = tileOf(c.z); o.tile = [tx, tz]; o.zone = zoneName(tx, tz);
    o.far = c.x < -MARGIN || c.z < -MARGIN || c.x > W * TILE + MARGIN || c.z > D * TILE + MARGIN;
    // Place par rapport au jeu : sur le sol praticable, aux abords (visible), ou loin.
    const ed = inMap(tx, tz) ? MAP.edge[tz * W + tx] : 99; o.where = walkable(tx, tz) ? 'jeu' : ed <= 2 ? 'abords' : 'loin';
  }
  for (const o of objs) voxelize(o);
  lap('volumes');
  const active = objs.filter((o) => !o.far);
  const flat = (o) => o.h < 0.05; // décalques et tapis : ni flottants, ni superposés

  /* ─── Appuis visibles : triangles non verticaux de la scène, rangés par cellule de 1 m, pour les rayons verticaux ─── */
  const ownerOf = new Map(); for (const o of objs) for (const p of o.parts) ownerOf.set(p.k === undefined ? p.m : p.m.uuid + ':' + p.k, o.i);
  const cellT = new Map(), TR = []; // TR : ax, ay, az, bx, by, bz, cx, cy, cz, propriétaire
  let nsup = 0;
  R.scene.traverse((m) => {
    if (!(m.isMesh || m.isInstancedMesh) || m.isSprite || !visible(m) || !m.geometry?.attributes?.position) return;
    if (m.isInstancedMesh && /^(scatter|init)|^$/.test(fnName(m.userData.fnStack) || '')) return; // semis au sol (touffes, cailloux), douilles : pas un appui
    if (m.material?.type === 'ShaderMaterial' || (m.material?.transparent && m.material.opacity < 0.05)) return;
    if (!m.geometry.boundingSphere) m.geometry.computeBoundingSphere();
    if (m.geometry.boundingSphere.radius > 700) return;
    nsup++;
    const n = m.isInstancedMesh ? m.count : 1;
    for (let k = 0; k < n; k++) {
      const own = ownerOf.get(m.isInstancedMesh ? m.uuid + ':' + k : m) ?? -1;
      worldTris(m, m.isInstancedMesh ? k : undefined, (wp, a, b, c) => {
        const ux = wp[b] - wp[a], uy = wp[b + 1] - wp[a + 1], uz = wp[b + 2] - wp[a + 2], vx = wp[c] - wp[a], vy = wp[c + 1] - wp[a + 1], vz = wp[c + 2] - wp[a + 2];
        const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx, nl = Math.hypot(nx, ny, nz); if (nl < 1e-12 || Math.abs(ny) / nl < 0.05) return;
        const x0 = Math.min(wp[a], wp[b], wp[c]), x1 = Math.max(wp[a], wp[b], wp[c]), z0 = Math.min(wp[a + 2], wp[b + 2], wp[c + 2]), z1 = Math.max(wp[a + 2], wp[b + 2], wp[c + 2]);
        if (x1 < X0 || z1 < Z0 || x0 > X0 + NX * V || z0 > Z0 + NZ * V) return;
        const ti = TR.length / 10; TR.push(wp[a], wp[a + 1], wp[a + 2], wp[b], wp[b + 1], wp[b + 2], wp[c], wp[c + 1], wp[c + 2], own);
        for (let cx = Math.floor(Math.max(x0, X0)); cx <= Math.floor(Math.min(x1, X0 + NX * V)); cx++) for (let cz = Math.floor(Math.max(z0, Z0)); cz <= Math.floor(Math.min(z1, Z0 + NZ * V)); cz++) { const key = cx * 100000 + cz; const l = cellT.get(key); if (l) l.push(ti); else cellT.set(key, [ti]); }
      });
    }
  });
  // Plus haute surface à la verticale de (x, z), au plus à yMax, hors de l'objet lui-même : [y, propriétaire] ou null.
  function surfBelow(x, z, yMax, self) {
    const l = cellT.get(Math.floor(x) * 100000 + Math.floor(z)); if (!l) return null;
    let best = -Infinity, who = -1;
    for (const t of l) {
      const o = t * 10, own = TR[o + 9]; if (own === self) continue;
      const ax = TR[o], az = TR[o + 2], bx = TR[o + 3], bz = TR[o + 5], cx = TR[o + 6], cz = TR[o + 8];
      const d = (bx - ax) * (cz - az) - (cx - ax) * (bz - az); if (Math.abs(d) < 1e-12) continue;
      const u = ((x - ax) * (cz - az) - (cx - ax) * (z - az)) / d, w = ((bx - ax) * (z - az) - (x - ax) * (bz - az)) / d;
      if (u < -1e-6 || w < -1e-6 || u + w > 1 + 1e-6) continue;
      const y = TR[o + 1] + (TR[o + 4] - TR[o + 1]) * u + (TR[o + 7] - TR[o + 1]) * w;
      if (y <= yMax && y > best) { best = y; who = own; }
    }
    return best > -Infinity ? [best, who] : null;
  }
  lap('appuis');

  /* ─── Contrôles par objet ─── */
  const F = []; // constats sans objet (zones, boîtes, points)
  // Faits pour être en hauteur ou au mur : tableaux, plafonniers, placards hauts, lampes suspendues, armes murales, tableau
  // électrique (le test « flottant » n'a pas de sens pour eux ; leur encastrement est jugé à 50 %).
  const HIGH = /kFrame|kCeilLamp|kUpperCab|lampe suspendue|arme murale|tableau électrique/;
  // Colonnes occupées par chaque objet (contacts, superpositions).
  const byCol = new Map();
  for (const o of active) { if (flat(o)) continue; for (const ck of o.cols.keys()) { const l = byCol.get(ck); if (l) l.push(o.i); else byCol.set(ck, [o.i]); } }
  // Appui sous un point : [écart, nom de l'appui].
  const supportGap = (o, x, y, z) => { const g = SP.groundAt(x, z), s = surfBelow(x, z, y + 0.06, o.i), up = s && s[0] > g; return [y - (up ? s[0] : g), up ? (s[1] >= 0 ? objs[s[1]].name : 'architecture') : 'sol']; };
  for (const o of active) {
    o.issues = [];
    const tx = o.tile[0], tz = o.tile[1];
    if (HIGH.test(o.name)) o.attached = 'fait pour être en hauteur ou au mur';
    else if (roofed(tx, tz) && o.maxY > ceilAt(tx, tz) - 0.15 && o.maxY < ceilAt(tx, tz) + 0.4 && o.minY > 0.5) o.attached = 'accroché au plafond'; // (pas ce qui est sur le toit)
    if (flat(o)) continue;
    // Flottant : aucun point bas (sommets bas des pièces, bas des colonnes) à moins de 4 cm d'un appui.
    const cand = o.low.slice();
    for (const [ck, l] of o.cols) cand.push([ccx(ck), l[0][0], ccz(ck)]);
    cand.sort((a, b) => a[1] - b[1]);
    const pick = cand.length > 400 ? cand.filter((_, k) => k < 200 || k % Math.ceil(cand.length / 200) === 0) : cand;
    let gap = Infinity, on = null;
    for (const [x, y, z] of pick) { const [g, w] = supportGap(o, x, y, z); if (g < gap) { gap = g; on = w; } if (gap <= 0.04) break; }
    o.gap = gap; o.on = on;
    // Planté dans une surface (pied d'antenne ou de cheminée enfoui dans le toit, panneau posé contre le soubassement d'un
    // mur) : au-dessus d'au moins 30 % des points de sa base (à 2 cm de son point le plus bas), une surface d'un autre objet
    // ou de l'architecture traverse l'objet ; il ne flotte pas. (La base seulement : une tête de lit qui croise l'appui
    // d'une fenêtre ne fait pas tenir un lit sans pieds.)
    if (gap > 0.04 && !o.attached && pick.length) {
      const base = pick.filter((p) => p[1] < pick[0][1] + 0.02).slice(0, 60); let n = 0, by = null;
      for (const [x, y, z] of base) { const s = surfBelow(x, z, o.maxY - 0.02, o.i); if (s && s[0] > y + 0.04 && s[0] > SP.groundAt(x, z) + 0.04) { n++; by = s[1]; } }
      if (n >= Math.max(1, 0.3 * base.length)) o.attached = 'planté dans ' + (by >= 0 ? objs[by].name : "l'architecture (toit, soubassement…)");
    }
    // Mannequin assis : quelque chose sous le bassin (colonnes à moins de 15 cm du centre de gravité).
    if (/kMannequin/.test(o.name) && o.y > 0) {
      let sx = 0, sz = 0, sv = 0; for (const [ck, l] of o.cols) { let v = 0; for (const [a, b] of l) v += b - a; sx += ccx(ck) * v; sz += ccz(ck) * v; sv += v; }
      const gx = sx / sv, gz = sz / sv; let sg = Infinity, son = null;
      for (const [ck, l] of o.cols) { if (Math.hypot(ccx(ck) - gx, ccz(ck) - gz) > 0.15) continue; const [g, w] = supportGap(o, ccx(ck), l[0][0], ccz(ck)); if (g < sg) { sg = g; son = w; } }
      if (sg > 0.12 && sg < Infinity) o.seat = { gap: sg, on: son };
    }
    // Enfoncé : base à plus de 15 cm sous le sol, ou plus de la moitié du volume dessous.
    let sink = -Infinity; for (const [x, y, z] of o.low) sink = Math.max(sink, SP.groundAt(x, z) - y);
    let under = 0; for (const [ck, l] of o.cols) { const g = SP.groundAt(ccx(ck), ccz(ck)) - 0.01; for (const [a, b] of l) under += Math.max(0, Math.min(b, g) - a) * V * V; }
    const fr = o.vol > 1e-4 ? under / o.vol : 0;
    if (sink > 0.15 || fr > 0.5) o.issues.push({ cat: 'enfoncé', grav: sink > 0.3 || fr > 0.5 ? 2 : 1, mag: Math.max(sink, fr), msg: `base ${Math.round(sink * 100)} cm sous le sol, ${Math.round(fr * 100)} % du volume dessous` });
  }
  // Flottants : sauf accrochés à un mur (moins de 15 cm), ou en contact avec un objet qui, lui, est posé (traverse sur un poteau…).
  const posed = (o) => o.attached || o.gap <= 0.04;
  for (let pass = 0; pass < 2; pass++) for (const o of active) {
    if (flat(o) || posed(o) || o.fl) continue;
    // (au mur ou à un autre objet : seulement à plus de 30 cm de tout appui ; un buisson ou un meuble qui flotte de 10 cm
    // contre un mur ou contre son voisin n'y est pas fixé : un fauteuil sans pieds contre une bibliothèque flotte quand même)
    let why = null; if (o.gap > 0.3 && !VEG.test(o.name)) for (const [, [x, y, z]] of o.surf) if (nearWall(x, y, z, 0.15)) { why = 'accroché au mur'; break; }
    if (!why && o.gap > 0.3) for (const [, [x, y, z]] of o.surf) { const l = byCol.get(ixOf(x) * NZ + izOf(z)); if (!l) continue; const j = l.find((j) => j !== o.i && posed(objs[j]) && objs[j].cols.get(ixOf(x) * NZ + izOf(z)).some(([a, b]) => y > a - 0.03 && y < b + 0.03)); if (j !== undefined) { why = 'fixé à ' + objs[j].name; break; } }
    if (why) o.attached = why; else if (pass === 1) o.fl = true;
  }
  for (const o of active) {
    if (o.seat) o.issues.push({ cat: 'flottant', grav: 2, mag: o.seat.gap, msg: `assis dans le vide : rien sous le bassin à moins de ${Math.round(o.seat.gap * 100)} cm (dessous : ${o.seat.on})` });
    // (végétation en boules à moins de 15 cm : le bas d'une sphère ne touche le sol qu'en un point, l'écart ne se voit pas
    // dans l'herbe : information seulement)
    else if (o.fl) o.issues.push({ cat: 'flottant', grav: VEG.test(o.name) && o.gap < 0.15 ? 0 : o.gap > 0.25 ? 2 : 1, mag: o.gap, msg: `flotte à ${Math.round(o.gap * 100)} cm au-dessus de : ${o.on}` });
  }
  // Dans un mur : points du volume (centres des colonnes des pièces pleines, à plus de 5 cm sous la surface du mur ;
  // points de surface des pièces minces — miroirs, cadres, planches —, à plus de 2 cm) dans un mur, une clôture, une barricade, le plafond.
  for (const o of active) {
    let n = 0; const hit = {}, perPart = {}, nPart = {};
    const test = (x, y, z, pi, tol) => { n++; nPart[pi] = (nPart[pi] || 0) + 1; let w = wallAt(x, y, z, tol); if (w === 'clôture' && VEG.test(o.name)) w = null; if (w) { hit[w] = (hit[w] || 0) + 1; if (w !== 'fenêtre') perPart[pi] = (perPart[pi] || 0) + 1; } };
    o.pc.forEach((cols, pi) => { if (o.pthin[pi]) return; for (const [ck, [y0, y1]] of cols) { const x = ccx(ck), z = ccz(ck); if (y1 - y0 < V) test(x, (y0 + y1) / 2, z, pi, 0.05); else for (let y = y0 + V / 2; y < y1; y += V) test(x, y, z, pi, 0.05); } });
    for (const [, [x, y, z, pi]] of o.surf) if (o.pthin[pi]) test(x, y, z, pi, 0.02);
    const tot = Object.values(hit).reduce((a, b) => a + b, 0), fr = n ? tot / n : 0; o.inWall = r2(fr);
    // Pièces cachées : au moins 80 % de leurs points dans le mur (un miroir, une porte de placard qui ne se voient plus).
    const hidden = Object.keys(perPart).filter((pi) => nPart[pi] >= 4 && perPart[pi] / nPart[pi] >= 0.8);
    const lim = o.attached ? 0.5 : 0.15;
    if (fr > lim || (hidden.length && !o.attached)) {
      const kinds = Object.entries(hit).sort((a, b) => b[1] - a[1]).map(([k, c]) => `${k} ${Math.round(c / n * 100)} %`).join(', ');
      const worst = Object.entries(perPart).sort((a, b) => b[1] - a[1]).slice(0, 2).map(([pi]) => o.pdesc[pi]).join(' ; ');
      const msg = hidden.length ? `${hidden.length} pièce(s) cachée(s) dans le mur (invisibles) : ${hidden.slice(0, 3).map((pi) => o.pdesc[pi]).join(' ; ')} — ${Math.round(fr * 100)} % des points de l'objet dans : ${kinds}`
        : `${Math.round(fr * 100)} % des points de l'objet dans : ${kinds}${hit.fenêtre ? ' (dans le trou de la fenêtre : il se voit en travers de la vitre)' : ''}${worst ? ' — surtout ' + worst : ''}`;
      o.issues.push({ cat: 'dans un mur', kind: hidden.length ? 'caché' : hit.fenêtre ? 'fenêtre' : '', grav: (fr > 0.4 || hidden.length) && !o.attached ? 2 : 1, mag: fr, msg });
    }
  }
  lap('flottants, murs');
  // Superposés : volume commun (intervalles des colonnes), plus de 20 % du plus petit.
  { const pair = new Map();
    for (const [ck, l] of byCol) {
      if (l.length < 2) continue;
      for (let a = 0; a < l.length; a++) for (let b = a + 1; b < l.length; b++) {
        const ia = objs[l[a]].cols.get(ck), ib = objs[l[b]].cols.get(ck); let s = 0;
        for (const [a0, a1] of ia) for (const [b0, b1] of ib) s += Math.max(0, Math.min(a1, b1) - Math.max(a0, b0));
        if (s > 0) { const key = Math.min(l[a], l[b]) + ':' + Math.max(l[a], l[b]); pair.set(key, (pair.get(key) || 0) + s * V * V); }
      }
    }
    for (const [key, vol] of pair) {
      const [a, b] = key.split(':').map(Number), oa = objs[a], ob = objs[b], [s, l] = oa.vol <= ob.vol ? [oa, ob] : [ob, oa];
      if (s.vol < 0.002) continue; const fr = vol / s.vol; if (fr <= 0.2) continue;
      if (oa.batch && ob.batch && oa.name === ob.name) continue; // exemplaires d'un même lot
      if (VEG.test(oa.name) && VEG.test(ob.name)) continue; // massifs : les buissons se mêlent
      if (/kMannequin/.test(s.name) && s.y > 0 && fr < 0.5) continue; // mannequin assis volontairement
      s.issues.push({ cat: 'superposés', grav: fr > 0.5 ? 2 : 1, mag: fr, other: l.i, msg: `${Math.round(fr * 100)} % de son volume (${r2(vol * 1000)} L) dans ${l.name} (${r2(l.c[0])}, ${r2(l.c[2])})` });
    }
  }
  lap('superposés');

  /* ─── Boîtes de collision ─── */
  const props = MAP.props.map((b, i) => ({ ...b, i })).filter((b) => !b.off);
  // Distance d'un point à l'emprise réelle d'une boîte tournée { x, z, w, d, ry } (w le long du x local, comme colliderBox).
  const rotDist = (rb, x, z) => { const c = Math.cos(rb.ry), s = Math.sin(rb.ry), dx = x - rb.x, dz = z - rb.z, lx = c * dx - s * dz, lz = s * dx + c * dz; return Math.hypot(Math.max(Math.abs(lx) - rb.w / 2, 0), Math.max(Math.abs(lz) - rb.d / 2, 0)); };
  const blocksPlayer = (b) => b.y1 > 0.3 && (b.y0 || 0) <= 1.6;
  // Colonnes visibles : niveaux de 10 cm de 0 à 3,2 m pour chaque colonne de 10 cm (objets non plats).
  const colMask = new Map(), lvl = (y) => (y < 0 || y > 3.2 ? 0 : 1 << Math.min(31, Math.floor(y / 0.1)));
  for (const o of active) {
    if (flat(o)) continue;
    for (const [ck, l] of o.cols) { let m = colMask.get(ck) || 0; for (const [a, b] of l) for (let y = Math.max(0, a); y <= Math.min(3.2, b) + 1e-6; y += 0.05) m |= lvl(Math.min(y, b)); colMask.set(ck, m); }
    for (const [, [x, y, z]] of o.surf) { const ck = ixOf(x) * NZ + izOf(z); colMask.set(ck, (colMask.get(ck) || 0) | lvl(y)); }
  }
  const levels = (y0, y1) => { let m = 0; for (let l = Math.max(1, Math.floor(y0 / 0.1)); l <= Math.min(19, Math.floor((y1 - 1e-6) / 0.1)); l++) m |= 1 << l; return m; };
  const boxOf = new Map();
  for (const b of props) {
    boxOf.set(b.i, b);
    // Propriétaire : l'objet qui a le plus de volume (ou de points de surface) dans la boîte.
    let best = -1, bn = 0;
    for (const o of active) {
      if (o.box.max.x < b.x0 || o.box.min.x > b.x1 || o.box.max.z < b.z0 || o.box.min.z > b.z1) continue;
      let n = 0;
      for (const [ck, l] of o.cols) { const x = ccx(ck), z = ccz(ck); if (x < b.x0 || x > b.x1 || z < b.z0 || z > b.z1) continue; for (const [a, c] of l) n += Math.max(0, Math.min(c, b.y1 + 0.1) - Math.max(a, (b.y0 || 0) - 0.1)) * 10; }
      for (const [, [x, y, z]] of o.surf) if (x >= b.x0 && x <= b.x1 && z >= b.z0 && z <= b.z1 && y <= b.y1 + 0.1) n += 0.2;
      if (n > bn) { bn = n; best = o.i; }
    }
    b.owner = best; if (best >= 0) (objs[best].boxes ||= []).push(b.i);
    // Boîte tournée (colliderBox, KIT.solid) : emprise réelle notée par l'instrumentation (rb) ; la boîte gardée est l'englobante.
    b.rot = !!b.rb && Math.abs(Math.sin(2 * b.rb.ry)) > 0.01;
    // Mur invisible : part de la boîte au-dessus du sol praticable sans rien de visible entre 10 cm et 2 m (tolérance 10 cm) ;
    // pour une boîte tournée, part de la boîte hors de l'emprise réelle (ce que la correction de colliderBox rendra au joueur).
    if (!blocksPlayer(b)) continue;
    const lv = levels(Math.max(0.1, b.y0 || 0), Math.min(2, b.y1)); let tot = 0, inv = 0;
    const seenAt = (ix, iz) => { for (let a = -1; a <= 1; a++) for (let c = -1; c <= 1; c++) if ((colMask.get((ix + a) * NZ + iz + c) || 0) & lv) return true; return false; };
    for (let ix = Math.max(0, ixOf(b.x0)); ix <= Math.min(NX - 1, ixOf(b.x1)); ix++) for (let iz = Math.max(0, izOf(b.z0)); iz <= Math.min(NZ - 1, izOf(b.z1)); iz++) {
      const x = X0 + (ix + 0.5) * V, z = Z0 + (iz + 0.5) * V; if (x < b.x0 || x > b.x1 || z < b.z0 || z > b.z1 || !walkable(tileOf(x), tileOf(z))) continue;
      tot++; if (!seenAt(ix, iz)) inv++;
    }
    b.walk = r2(tot * V * V); b.inv = r2(inv * V * V);
    // Excédent de la boîte englobante sur l'emprise réelle : échantillonnage exact de la boîte (pas de 4 cm au plus).
    if (b.rot) {
      const nx = Math.ceil((b.x1 - b.x0) / 0.04), nz = Math.ceil((b.z1 - b.z0) / 0.04), dx = (b.x1 - b.x0) / nx, dz = (b.z1 - b.z0) / nz; let out = 0, invOut = 0;
      for (let i = 0; i < nx; i++) for (let k = 0; k < nz; k++) {
        const x = b.x0 + (i + 0.5) * dx, z = b.z0 + (k + 0.5) * dz; if (!walkable(tileOf(x), tileOf(z)) || rotDist(b.rb, x, z) <= 0) continue;
        out++; if (!seenAt(ixOf(x), izOf(z))) invOut++;
      }
      b.out = r2(out * dx * dz); b.invOut = r2(invOut * dx * dz);
    }
  }
  const issuesOf = (b) => (b.owner >= 0 ? objs[b.owner].issues : null);
  const boxF = (b, f) => { const l = issuesOf(b); if (l) l.push(f); else F.push({ ...f, name: 'boîte n° ' + b.i, at: [r2((b.x0 + b.x1) / 2), r2(b.y1 / 2), r2((b.z0 + b.z1) / 2)], boxes: [b.i] }); };
  for (const b of props) {
    if (!blocksPlayer(b) || !(b.inv >= 0.3) || (b.inv / Math.max(0.01, b.walk) < 0.2 && b.inv < 1)) continue;
    const o = b.owner >= 0 ? objs[b.owner] : null, rot = b.rot;
    const deg = rot ? Math.round(((b.rb.ry * 180 / Math.PI) % 180 + 180) % 180) : 0;
    const msg = o ? `boîte de collision ${r2(b.x1 - b.x0)} × ${r2(b.z1 - b.z0)} m : ${b.inv} m² au-dessus du sol praticable sans rien de visible` + (rot ? ` — dont ${b.invOut} m² hors de l'emprise réelle ${r2(b.rb.w)} × ${r2(b.rb.d)} m (objet tourné de ${deg}° : colliderBox garde la boîte englobante alignée sur les axes)` : '')
      : `boîte de collision ${r2(b.x1 - b.x0)} × ${r2(b.z1 - b.z0)} × ${r2(b.y1)} m sans objet visible (${b.inv} m²)`;
    boxF(b, { cat: o ? 'mur invisible' : 'collision orpheline', grav: !o || b.inv >= 1 ? 2 : 1, mag: b.inv, box: b.i, rot, msg });
  }
  lap('murs invisibles');
  // Portes, barricades et leurs abords recouverts par une boîte qui arrête le joueur.
  const rectI = (a, b) => Math.max(0, Math.min(a[2], b[2]) - Math.max(a[0], b[0])) * Math.max(0, Math.min(a[3], b[3]) - Math.max(a[1], b[1]));
  const zonesP = [];
  for (const d of MAP.doors) {
    const x0 = d.x * TILE, z0 = d.z * TILE; zonesP.push({ kind: 'porte', label: `la porte « ${d.label} »`, r: [x0, z0, x0 + TILE, z0 + TILE], grav: 3 });
    for (const s of [-1, 1]) { const r = d.axis === 'x' ? (s < 0 ? [x0 - 0.8, z0, x0, z0 + TILE] : [x0 + TILE, z0, x0 + TILE + 0.8, z0 + TILE]) : (s < 0 ? [x0, z0 - 0.8, x0 + TILE, z0] : [x0, z0 + TILE, x0 + TILE, z0 + TILE + 0.8]); zonesP.push({ kind: 'abord', label: `l'abord de la porte « ${d.label} »`, r, grav: 2, frac: 0.25 }); }
  }
  for (const b of MAP.barricades) {
    const x0 = b.x * TILE, z0 = b.z * TILE; zonesP.push({ kind: 'barricade', label: `la barricade n° ${b.id}`, r: [x0, z0, x0 + TILE, z0 + TILE], grav: 3 });
    const dx = b.inner[0] - b.x, dz = b.inner[1] - b.z, r = dx > 0 ? [x0 + TILE, z0, x0 + TILE + 1, z0 + TILE] : dx < 0 ? [x0 - 1, z0, x0, z0 + TILE] : dz > 0 ? [x0, z0 + TILE, x0 + TILE, z0 + TILE + 1] : [x0, z0 - 1, x0 + TILE, z0];
    zonesP.push({ kind: 'abord', label: `l'abord de la barricade n° ${b.id} (réparation, entrée des infectés)`, r, grav: 2, frac: 0.25 });
  }
  for (const b of props) {
    if (!blocksPlayer(b)) continue; const br = [b.x0, b.z0, b.x1, b.z1];
    for (const zp of zonesP) {
      const a = rectI(br, zp.r), za = (zp.r[2] - zp.r[0]) * (zp.r[3] - zp.r[1]); if (a < 0.01 || (zp.frac && a / za < zp.frac)) continue;
      boxF(b, { cat: zp.kind === 'porte' ? 'porte obstruée' : zp.kind === 'barricade' ? 'barricade obstruée' : 'accès gêné', grav: zp.grav, mag: a, box: b.i, msg: `boîte de collision sur ${zp.label} (${r2(a)} m², ${Math.round(a / za * 100)} %)` });
    }
  }
  lap('portes');

  /* ─── Accessibilité : dégagement (distance au premier obstacle) et chemin le plus large depuis l'apparition ───
     Grille de 5 cm sur le sol praticable (portes supposées ouvertes). Dégagement d'une cellule : distance à la plus proche
     surface bloquante (carreau non praticable, mur fin, boîte de collision qui arrête le joueur), plafonnée à 0,5 m.
     Goulet d'une cellule : le plus grand rayon de joueur qui l'atteint depuis l'apparition (chemin le plus large) ;
     un passage de largeur L laisse passer un rayon L / 2. Avec et sans les boîtes : ce qui change vient des objets. */
  const G = 0.05, GX = Math.round(W * TILE / G), GZ = Math.round(D * TILE / G), N = GX * GZ, CAP = 0.5;
  const base = new Uint8Array(N);
  for (let gz = 0; gz < GZ; gz++) for (let gx = 0; gx < GX; gx++) base[gz * GX + gx] = walkable(Math.floor((gx + 0.5) * G / TILE), Math.floor((gz + 0.5) * G / TILE)) ? 1 : 0;
  const rects0 = [];
  for (let tz = 0; tz < D; tz++) for (let tx = 0; tx < W; tx++) { if (walkable(tx, tz)) continue; let nb = false; for (let a = -1; a <= 1; a++) for (let c = -1; c <= 1; c++) if (walkable(tx + a, tz + c)) nb = true; if (nb) rects0.push([tx * TILE, tz * TILE, tx * TILE + TILE, tz * TILE + TILE]); }
  for (let tz = 0; tz < D; tz++) for (let tx = 0; tx < W; tx++) { const w = MAP.ew[tz * W + tx]; if (w & 1) rects0.push([(tx + 1) * TILE - E, tz * TILE - E, (tx + 1) * TILE + E, (tz + 1) * TILE + E]); if (w & 2) rects0.push([tx * TILE - E, (tz + 1) * TILE - E, (tx + 1) * TILE + E, (tz + 1) * TILE + E]); }
  const pBoxes = props.filter(blocksPlayer);
  const boxDist = (b, x, z) => Math.hypot(Math.max(b.x0 - x, 0, x - b.x1), Math.max(b.z0 - z, 0, z - b.z1));
  function clearance(rects, from) {
    const cl = from ? from.slice() : new Float32Array(N); if (!from) for (let i = 0; i < N; i++) cl[i] = base[i] ? CAP : 0;
    for (const r of rects) {
      const [x0, z0, x1, z1] = r.x0 !== undefined ? [r.x0, r.z0, r.x1, r.z1] : r;
      const gx0 = Math.max(0, Math.floor((x0 - CAP) / G)), gx1 = Math.min(GX - 1, Math.floor((x1 + CAP) / G)), gz0 = Math.max(0, Math.floor((z0 - CAP) / G)), gz1 = Math.min(GZ - 1, Math.floor((z1 + CAP) / G));
      for (let gz = gz0; gz <= gz1; gz++) for (let gx = gx0; gx <= gx1; gx++) { const j = gz * GX + gx; if (!base[j]) continue; const x = (gx + 0.5) * G, z = (gz + 0.5) * G, d = Math.hypot(Math.max(x0 - x, 0, x - x1), Math.max(z0 - z, 0, z - z1)); if (d < cl[j]) cl[j] = d; }
    }
    return cl;
  }
  const NB8 = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];
  const st = Md.spots.start, stx = st[0] * TILE + 1, stz = st[1] * TILE + 1;
  function widest(cl) { // goulet depuis la cellule la plus dégagée à moins de 1,5 m de l'apparition (le joueur y est repoussé)
    let seed = -1, bs = -1;
    for (let gz = Math.floor((stz - 1.5) / G); gz <= Math.floor((stz + 1.5) / G); gz++) for (let gx = Math.floor((stx - 1.5) / G); gx <= Math.floor((stx + 1.5) / G); gx++) { const j = gz * GX + gx; if (j >= 0 && j < N && Math.hypot((gx + 0.5) * G - stx, (gz + 0.5) * G - stz) < 1.5 && cl[j] > bs) { bs = cl[j]; seed = j; } }
    const B = new Float32Array(N).fill(-1), bk = Array.from({ length: 52 }, () => []); if (seed < 0) return B;
    B[seed] = cl[seed]; bk[Math.floor(cl[seed] * 100)].push(seed);
    for (let q = 51; q >= 0; q--) { const l = bk[q]; while (l.length) { const i = l.pop(), b = B[i]; if (Math.floor(b * 100) !== q) continue; const gx = i % GX, gz = (i - gx) / GX; for (const [a, c] of NB8) { const x = gx + a, z = gz + c; if (x < 0 || z < 0 || x >= GX || z >= GZ) continue; const j = z * GX + x, nb = Math.min(b, cl[j]); if (nb > B[j] && nb > 0) { B[j] = nb; bk[Math.floor(nb * 100)].push(j); } } } }
    return B;
  }
  const PR = 0.34, PW = 0.4; // rayon du joueur ; demi-largeur d'un passage de 0,8 m
  const cl0 = clearance(rects0), clP = clearance(pBoxes, cl0), B0 = widest(cl0), BP = widest(clP);
  lap('dégagement');
  function comps(mask) {
    const lab = new Int32Array(N).fill(-1), out = [];
    for (let i = 0; i < N; i++) {
      if (!mask(i) || lab[i] >= 0) continue; const cells = [i]; lab[i] = out.length;
      for (let h = 0; h < cells.length; h++) { const j = cells[h], gx = j % GX, gz = (j - gx) / GX; for (const [a, c] of NB8) { const x = gx + a, z = gz + c; if (x < 0 || z < 0 || x >= GX || z >= GZ) continue; const k = z * GX + x; if (lab[k] < 0 && mask(k)) { lab[k] = out.length; cells.push(k); } } }
      out.push(cells);
    }
    return out;
  }
  const cxy = (j) => { const gx = j % GX; return [(gx + 0.5) * G, ((j - gx) / GX + 0.5) * G]; };
  // Boîtes en cause : celles qui bouchent (cellules dégagées sans les objets, à moins de r de la boîte) une cellule voisine de la zone et une voisine de la partie atteinte.
  function culprits(inC, reached, r) {
    const out = [];
    for (const b of pBoxes) {
      let tc = false, tr = false;
      for (let gz = Math.max(0, Math.floor((b.z0 - r) / G)); gz <= Math.min(GZ - 1, Math.floor((b.z1 + r) / G)) && !(tc && tr); gz++) for (let gx = Math.max(0, Math.floor((b.x0 - r) / G)); gx <= Math.min(GX - 1, Math.floor((b.x1 + r) / G)); gx++) {
        const j = gz * GX + gx; if (cl0[j] < r || boxDist(b, (gx + 0.5) * G, (gz + 0.5) * G) >= r) continue;
        for (const [a, c] of NB8) { const x = gx + a, z = gz + c; if (x < 0 || z < 0 || x >= GX || z >= GZ) continue; const k = z * GX + x; if (inC[k]) tc = true; if (reached(k)) tr = true; }
        if (tc && tr) break;
      }
      if (tc && tr) out.push(b.i);
    }
    return out;
  }
  const nameBoxes = (bs) => [...new Set(bs.map((i) => boxOf.get(i)?.owner).filter((i) => i >= 0).map((i) => objs[i].name))];
  // Entrée de la zone : chemin (cellules dégagées d'au moins rMin) depuis la partie atteinte jusqu'à la première cellule de la zone.
  function entry(inC, reached, rMin) {
    const prev = new Int32Array(N).fill(-2), q = new Int32Array(N); let h = 0, t = 0, hit = -1;
    for (let j = 0; j < N; j++) if (reached(j) && clP[j] >= rMin) { prev[j] = -1; q[t++] = j; }
    while (h < t && hit < 0) { const i = q[h++], gx = i % GX, gz = (i - gx) / GX; for (const [a, c] of NB8) { const x = gx + a, z = gz + c; if (x < 0 || z < 0 || x >= GX || z >= GZ) continue; const j = z * GX + x; if (prev[j] !== -2 || clP[j] < rMin) continue; prev[j] = i; if (inC[j]) { hit = j; break; } q[t++] = j; } }
    if (hit < 0) return null; const path = []; for (let j = hit; j >= 0; j = prev[j]) path.unshift(cxy(j)); return path;
  }
  // Essai en jeu : le vrai joueur (updatePlayer, collisions du jeu) suit le chemin vers la zone, 1,5 m avant son entrée.
  const doorsWas = MAP.doors.map((d) => d.open); for (const d of MAP.doors) d.open = true;
  function walkInto(inC, path) {
    if (!path) return { ok: false, why: 'aucun chemin, même pour un rayon de 0,2 m' };
    let k0 = 0; const end = path[path.length - 1]; for (let k = path.length - 1; k >= 0; k--) if (Math.hypot(path[k][0] - end[0], path[k][1] - end[1]) > 1.5) { k0 = k; break; }
    const way = path.slice(k0);
    P.pos.set(way[0][0], 0, way[0][1]); P.vel.set(0, 0, 0); GM.lastSafe = P.pos.clone(); P.down = false; P.dead = false; GM.mode = 'playing';
    let wi = 0, ok = false;
    for (let f = 0; f < 600 && !ok; f++) {
      while (wi < way.length - 1 && Math.hypot(way[wi][0] - P.pos.x, way[wi][1] - P.pos.z) < 0.3) wi++;
      const aim = way[Math.min(way.length - 1, wi + 3)], dx = aim[0] - P.pos.x, dz = aim[1] - P.pos.z; P.yaw = Math.atan2(-dx, -dz);
      INPUT.keys.add('KeyW'); SP.updatePlayer(0.016);
      const gi = Math.floor(P.pos.z / G) * GX + Math.floor(P.pos.x / G); if (inC[gi] || Math.hypot(end[0] - P.pos.x, end[1] - P.pos.z) < 0.2) ok = true;
    }
    INPUT.keys.delete('KeyW');
    return { ok, why: ok ? 'le joueur passe en se faufilant' : `le joueur reste bloqué en (${r2(P.pos.x)}, ${r2(P.pos.z)})` };
  }
  const reachedPlus = new Uint8Array(N); for (let i = 0; i < N; i++) if (BP[i] >= PR) reachedPlus[i] = 1; // atteint, plus les zones franchissables en se faufilant
  const cutZones = []; let nZone = 0;
  const zoneF = (cells, inC, path, f) => {
    let sx2 = 0, sz2 = 0; for (const j of cells) { const [x, z] = cxy(j); sx2 += x; sz2 += z; }
    const cx = sx2 / cells.length, cz = sz2 / cells.length, area = r2(cells.length * G * G), step = Math.max(1, Math.floor(cells.length / 400));
    const gate = path ? path[Math.max(0, path.length - 8)] : [cx, cz]; // goulet : 40 cm avant l'entrée de la zone
    const key = 'zone' + nZone++;
    F.push({ ...f, key, mag: area, name: `${zoneName(tileOf(cx), tileOf(cz))} (${r2(cx)}, ${r2(cz)})`, at: [r2(gate[0]), 0.5, r2(gate[1])], center: [r2(cx), r2(cz)], area, cells: cells.filter((_, k) => k % step === 0).map((j) => cxy(j).map(r2)) });
    return key;
  };
  const mk = (cells) => { const inC = new Uint8Array(N); for (const j of cells) inC[j] = 1; return inC; };
  const width = (cells) => { let m = 0; for (const j of cells) m = Math.max(m, BP[j]); return r2(2 * m); };
  // Zones coupées : le joueur y tient debout, il les atteignait sans les objets, plus avec (puis essai en jeu).
  for (const c of comps((i) => clP[i] >= PR && B0[i] >= PR && BP[i] < PR)) {
    if (c.length * G * G < 0.2) continue;
    const inC = mk(c), reached = (k) => BP[k] >= PR, bx = culprits(inC, reached, PR), names = nameBoxes(bx), path = entry(inC, reached, 0.2), w = walkInto(inC, path), area = r2(c.length * G * G), wd = width(c);
    if (w.ok) for (const j of c) reachedPlus[j] = 1;
    const key = zoneF(c, inC, path, { cat: w.ok ? 'passage étroit' : 'zone coupée', grav: w.ok ? 2 : 3, boxes: bx, width: wd, msg: (w.ok ? `${area} m² atteignables seulement en se faufilant par un passage de ${wd} m` : `${area} m² praticables mais inaccessibles à cause des objets (passage le plus large : ${wd} m)`) + ` ; essai en jeu : ${w.why}${names.length ? ' — en cause : ' + names.join(', ') : ''}` });
    if (!w.ok) cutZones.push({ inC, key });
  }
  // Passages de moins de 0,8 m : zones atteintes, mais plus avec 0,8 m de largeur alors qu'elles l'étaient sans les objets.
  // (moyen sous 0,72 m : le joueur, large de 0,68 m, frotte des deux côtés ; léger au-dessus)
  for (const c of comps((i) => clP[i] >= PW && B0[i] >= PW && BP[i] < PW && BP[i] >= PR)) {
    if (c.length * G * G < 0.2) continue;
    const inC = mk(c), reached = (k) => BP[k] >= PW, bx = culprits(inC, reached, PW), names = nameBoxes(bx), area = r2(c.length * G * G), wd = width(c);
    zoneF(c, inC, entry(inC, reached, PR), { cat: 'passage étroit', grav: area >= 2 && wd < 0.72 ? 2 : 1, boxes: bx, width: wd, msg: `${area} m² atteignables seulement par un passage de ${wd} m (moins de 0,8 m)${names.length ? ' — en cause : ' + names.join(', ') : ''}` });
  }
  let lostMap = 0; for (let i = 0; i < N; i++) if (cl0[i] >= PR && B0[i] < PR) lostMap++;
  // Points d'apparition des joueurs dans un obstacle.
  const seenStart = new Set();
  for (const [k, s] of [Md.spots.start, ...(Md.spots.coopStarts || [])].entries()) {
    const x = s[0] * TILE + 1, z = s[1] * TILE + 1; if (seenStart.has(x + ',' + z)) continue; seenStart.add(x + ',' + z);
    const hits = pBoxes.filter((b) => boxDist(b, x, z) < PR);
    // (boîte tournée : le joueur touche-t-il l'emprise réelle, ou seulement la boîte englobante ?)
    const onlyAabb = hits.length && hits.every((b) => b.rb && rotDist(b.rb, x, z) >= PR);
    if (hits.length) { const names = nameBoxes(hits.map((b) => b.i)); F.push({ cat: 'apparition gênée', key: 'apparition ' + hits.map((b) => b.i).join(','), grav: 2, mag: 1, name: k ? `départ co-op n° ${k}` : 'départ du joueur', at: [x, 0.9, z], boxes: hits.map((b) => b.i), msg: `${k ? `départ co-op n° ${k}` : 'départ du joueur'} (${x}, ${z}) dans la boîte de collision de ${names.join(', ') || 'boîte sans objet'} (repoussé au premier pas)${onlyAabb ? ' — seulement dans la boîte englobante de l\'objet tourné, pas dans son emprise réelle' : ''}` }); }
  }
  // Éléments de jeu hors de portée : aucune position atteignable à portée d'interaction (portées de 11_game.js).
  const uses = [];
  for (const w of WORLD.wallBuys || []) uses.push(['arme murale ' + w.weapon, w.pos, 1.7]);
  for (const b of WORLD.boxSpots || []) uses.push(['caisse de ravitaillement', b.pos, 1.9]);
  if (WORLD.bench) uses.push(["établi d'armurier", WORLD.bench.pos, 1.9]);
  if (WORLD.power) uses.push(['tableau électrique', WORLD.power.pos, 1.9]);
  for (const p of WORLD.perks || []) if (p.group.visible) uses.push(['atout ' + p.key, p.pos, 1.7]);
  for (const g of SECRET?.meshes || []) uses.push(['disque secret', g.position, 1.1]);
  for (const b of MAP.barricades) if (b.center) uses.push([`barricade n° ${b.id} (réparation)`, b.center, 2.1]);
  for (const d of MAP.doors) uses.push([`porte « ${d.label} »`, { x: d.x * TILE + 1, z: d.z * TILE + 1 }, 2.3]);
  if (WORLD.citeRadio) uses.push(["radio d'urgence", WORLD.citeRadio.pos, 1.8]);
  for (const [n, p, rg] of uses) {
    let best = Infinity, cut = null;
    for (let gx = Math.max(0, Math.floor((p.x - rg) / G)); gx <= Math.min(GX - 1, Math.floor((p.x + rg) / G)); gx++) for (let gz = Math.max(0, Math.floor((p.z - rg) / G)); gz <= Math.min(GZ - 1, Math.floor((p.z + rg) / G)); gz++) {
      const j = gz * GX + gx, d = Math.hypot((gx + 0.5) * G - p.x, (gz + 0.5) * G - p.z); if (reachedPlus[j]) best = Math.min(best, d); if (d <= rg && !cut) cut = cutZones.find((z) => z.inC[j]) || null;
    }
    // (dans une zone coupée : rangé avec elle, c'en est la conséquence ; les infectés butent aussi sur les boîtes de collision)
    if (best > rg) F.push({ cat: 'hors de portée', grav: 3, mag: 1, key: cut?.key, name: n, at: [r2(p.x), 1, r2(p.z)], boxes: [], msg: `${n} : aucune position atteignable à moins de ${rg} m (portée d'interaction) : ${best === Infinity ? 'rien autour' : 'la plus proche à ' + r2(best) + ' m'}${cut ? ' — dans la zone coupée' : ''}${cut && /barricade/.test(n) ? ' ; les infectés qui entrent par là butent eux aussi sur la boîte de collision qui ferme la zone' : ''}` });
  }
  MAP.doors.forEach((d, k) => { d.open = doorsWas[k]; });
  lap('accessibilité');
  // Objets traversables (information) : assez grands pour gêner, au sol praticable, sans boîte de collision.
  for (const o of active) {
    if (o.where !== 'jeu' || flat(o) || o.attached || o.minY > 0.3 || o.h < 0.6 || o.boxes?.length || /kMannequin|kShrub|kPlant|kLamp\b|kCone|lampe|disque|porch/.test(o.name)) continue;
    const area = o.cols.size * V * V; if (area < 0.15) continue;
    o.issues.push({ cat: 'traversable', grav: 0, mag: area, msg: `${r2(area)} m² au sol, ${r2(o.h)} m de haut, sans boîte de collision : le joueur passe au travers` });
  }
  // Ouvertures encombrées : objet (visible, avec ou sans boîte de collision) en travers d'une brèche d'un carreau dans un mur
  // (les deux bords voisins sur la même ligne sont des murs pleins ou des carreaux de mur : passage entre deux pièces, porte
  // d'entrée), entre 10 cm et 2,2 m de haut et à moins de 0,4 m de part et d'autre de la ligne du mur.
  const openings = [];
  { const solidEdge = (ax, az, bx, bz) => { const k = edgeK(ax, az, bx, bz); return !!k && !Md.walls[k - 1].see; };
    for (let tz = 0; tz < D && MAP.hasEdges; tz++) for (let tx = 0; tx < W; tx++) for (const bit of [0, 1]) {
      const ax = tx, az = tz, bx = bit ? tx : tx + 1, bz = bit ? tz + 1 : tz;
      if (!walkable(ax, az) || !walkable(bx, bz) || edgeK(ax, az, bx, bz)) continue;
      const px = bit ? 1 : 0, pz = bit ? 0 : 1; // le long de la ligne du mur
      const side = (s) => solidEdge(ax + s * px, az + s * pz, bx + s * px, bz + s * pz) || tType(ax + s * px, az + s * pz) === T_BLOCK || tType(bx + s * px, bz + s * pz) === T_BLOCK;
      if (!side(-1) || !side(1)) continue;
      const door = tType(ax, az) === T_DOOR || tType(bx, bz) === T_DOOR ? MAP.doors[MAP.doorAt[tType(ax, az) === T_DOOR ? az * W + ax : bz * W + bx]] : null;
      // bit 0 : ligne x = (tx + 1)·T, le long de z ; bit 1 : ligne z = (tz + 1)·T, le long de x
      const za = zoneName(ax, az), zb = zoneName(bx, bz), sa = (Md.styles || [])[MAP.style[az * W + ax]] || '?', sb = (Md.styles || [])[MAP.style[bz * W + bx]] || '?';
      const label = door ? `de la porte « ${door.label} »` : za !== zb ? `du passage entre ${za} et ${zb}` : `du passage ${sa === sb ? 'intérieur' : `${sa} – ${sb}`} (${za})`;
      openings.push({ alongX: !!bit, c: bit ? (tz + 1) * TILE : (tx + 1) * TILE, s0: (bit ? tx : tz) * TILE + E, s1: (bit ? tx + 1 : tz + 1) * TILE - E, label: label + ` en (${r2(bit ? tx * TILE + 1 : (tx + 1) * TILE)}, ${r2(bit ? (tz + 1) * TILE : tz * TILE + 1)})` });
    }
    const BAND = 0.4, NB = Math.round((TILE - 2 * E) / V);
    for (const op of openings) {
      const hits = new Map(); // objet → cases couvertes le long de l'ouverture
      const x0 = op.alongX ? op.s0 : op.c - BAND, x1 = op.alongX ? op.s1 : op.c + BAND, z0 = op.alongX ? op.c - BAND : op.s0, z1 = op.alongX ? op.c + BAND : op.s1;
      for (let ix = Math.max(0, ixOf(x0)); ix <= Math.min(NX - 1, ixOf(x1)); ix++) for (let iz = Math.max(0, izOf(z0)); iz <= Math.min(NZ - 1, izOf(z1)); iz++) {
        const ck = ix * NZ + iz, l = byCol.get(ck); if (!l) continue; const x = ccx(ck), z = ccz(ck); if (x < x0 || x > x1 || z < z0 || z > z1) continue;
        const s = op.alongX ? x : z, bin = Math.min(NB - 1, Math.max(0, Math.floor((s - op.s0) / V)));
        for (const j of l) {
          const o = objs[j]; if (o.attached && o.minY > 1.9) continue;
          const iv = o.cols.get(ck).filter(([a, b]) => b > 0.1 && a < 2.2); if (!iv.length) continue;
          let h = hits.get(j); if (!h) hits.set(j, (h = { bins: new Set(), y0: Infinity, y1: -Infinity })); h.bins.add(bin); for (const [a, b] of iv) { h.y0 = Math.min(h.y0, a); h.y1 = Math.max(h.y1, b); }
        }
      }
      for (const [j, h] of hits) {
        const fr = h.bins.size / NB; if (fr < 0.15) continue; const o = objs[j];
        o.issues.push({ cat: 'ouverture encombrée', grav: fr >= 0.4 ? 2 : 1, mag: fr, msg: `en travers ${op.label} : ${r2(h.bins.size * V)} m sur ${r2(NB * V)} m de large (${Math.round(fr * 100)} %), entre ${r2(Math.max(0.1, h.y0))} et ${r2(Math.min(2.2, h.y1))} m de haut${o.boxes?.length ? '' : ', sans boîte de collision'}` });
      }
    }
  }
  // Fenêtres masquées : objet d'une pièce couverte plaqué devant le trou d'une fenêtre décorative (à moins de 0,4 m du mur,
  // entre 0,95 et 2,15 m de haut) qui en cache au moins 25 % (points de surface de l'objet projetés sur la fenêtre).
  { const WB = 0.4, NA = Math.round((WIN.s1 - WIN.s0) / V), NH = Math.round((WIN.y1 - WIN.y0) / V);
    for (let tz = 0; tz < D && MAP.hasEdges; tz++) for (let tx = 0; tx < W; tx++) for (const bit of [0, 1]) {
      const k = MAP.ek[(tz * W + tx) * 2 + bit]; if (!k || Md.walls[k - 1].look !== 'window') continue;
      const ax = tx, az = tz, bx = bit ? tx : tx + 1, bz = bit ? tz + 1 : tz;
      const c = bit ? (tz + 1) * TILE : (tx + 1) * TILE, a0 = (bit ? tx : tz) * TILE + WIN.s0, a1 = (bit ? tx : tz) * TILE + WIN.s1;
      for (const [side, sx, sz] of [[-1, ax, az], [1, bx, bz]]) {
        if (!roofed(sx, sz) || !walkable(sx, sz)) continue; // côté pièce seulement
        const p0 = side < 0 ? c - E - WB : c + E - 0.01, p1 = side < 0 ? c - E + 0.01 : c + E + WB;
        const x0 = bit ? a0 : p0, x1 = bit ? a1 : p1, z0 = bit ? p0 : a0, z1 = bit ? p1 : a1;
        for (const o of active) {
          if (flat(o) || o.box.max.x < x0 || o.box.min.x > x1 || o.box.max.z < z0 || o.box.min.z > z1 || o.box.max.y < WIN.y0 || o.box.min.y > WIN.y1) continue;
          const bins = new Set();
          for (const [, [x, y, z]] of o.surf) { if (x < x0 || x > x1 || z < z0 || z > z1 || y <= WIN.y0 || y >= WIN.y1) continue; bins.add(Math.min(NA - 1, Math.floor(((bit ? x : z) - a0) / V)) * NH + Math.min(NH - 1, Math.floor((y - WIN.y0) / V))); }
          const fr = bins.size / (NA * NH); if (fr < 0.25) continue;
          o.issues.push({ cat: 'fenêtre masquée', grav: fr >= 0.6 ? 2 : 1, mag: fr, msg: `plaqué devant la fenêtre en (${r2(bit ? (a0 + a1) / 2 : c)}, ${r2(bit ? c : (a0 + a1) / 2)}) : en cache ${Math.round(fr * 100)} %` });
        }
      }
    }
  }
  lap('ouvertures');

  /* ─── Résultats ─── */
  const vis = { jeu: 1, abords: 0.7, loin: 0.4 };
  for (const o of active) for (const f of o.issues) F.push({ ...f, obj: o.i, name: o.name, at: [r2(o.c[0]), r2(o.c[1]), r2(o.c[2])], where: o.where, zone: o.zone, boxes: f.box !== undefined ? [f.box] : o.boxes || [] });
  const AREA = /zone coupée|passage étroit|mur invisible|collision orpheline/;
  for (const f of F) { f.where ||= 'jeu'; f.zone ||= zoneName(tileOf(f.at[0]), tileOf(f.at[2])); f.score = Math.round((f.grav * 100 + Math.min(99, f.mag * (AREA.test(f.cat) ? 10 : 100))) * (vis[f.where] || 1)); }
  F.sort((a, b) => b.score - a.score);
  // Cas : constats regroupés par objet (ou par zone : un élément de jeu hors de portée va avec la zone coupée qui le contient),
  // classés par le plus grave.
  const cases = new Map();
  for (const f of F) {
    const k = f.key || (f.obj !== undefined ? 'o' + f.obj : f.cat + f.at.join(','));
    if (!cases.has(k) || (f.cat === 'zone coupée' && cases.get(k).cat !== 'zone coupée')) cases.set(k, { ...(cases.get(k) || { boxes: new Set(), issues: [] }), name: f.name, cat: f.cat, at: f.at, zone: f.zone, where: f.where, score: Math.max(f.score, cases.get(k)?.score || 0), grav: Math.max(f.grav, cases.get(k)?.grav || 0), obj: f.obj });
    const c = cases.get(k); c.issues.push(f.cat + ' : ' + f.msg); for (const b of f.boxes || []) c.boxes.add(b); if (f.cells) c.cells = f.cells; if (f.other !== undefined) c.other = f.other;
    c.sig = (c.sig || []).concat([[f.cat + (f.kind ? '/' + f.kind : ''), f.mag, f.grav]]);
  }
  // Même défaut sur plusieurs exemplaires d'un même modèle (même sorte d'objet, mêmes constats, ampleurs à 2 cm ou 10 % près) :
  // un seul cas, c'est le modèle ou sa pose commune qu'il faut corriger (lit sans pieds, miroir de lavabo dans le mur…).
  const groups = [];
  for (const c of cases.values()) {
    if (c.obj === undefined || c.grav === 0) { groups.push([c]); continue; }
    const cats = c.sig.filter((s) => s[2] > 0).map((s) => s[0]).sort().join('|');
    const same = (g) => { const d = g[0]; if (d.name !== c.name || d.cats !== cats) return false; const a = d.sig.filter((s) => s[2] > 0).sort((p, q) => (p[0] < q[0] ? -1 : 1)), b = c.sig.filter((s) => s[2] > 0).sort((p, q) => (p[0] < q[0] ? -1 : 1)); return a.length === b.length && a.every((s, i) => Math.abs(s[1] - b[i][1]) <= Math.max(0.015, 0.05 * Math.abs(s[1]))); };
    c.cats = cats; const g = groups.find((g) => g[0].obj !== undefined && same(g)); if (g) g.push(c); else groups.push([c]);
  }
  const caseList = groups.map((g) => {
    const c = g.reduce((a, b) => (b.score > a.score ? b : a));
    const out = { ...c, boxes: [...new Set(g.flatMap((d) => [...d.boxes]))], count: g.length };
    if (g.length > 1) { out.name = `${c.name} ×${g.length}`; out.others = g.filter((d) => d !== c).map((d) => d.obj); out.issues = [...c.issues, `même défaut sur les ${g.length} exemplaires (${g.map((d) => `${d.at[0]}, ${d.at[2]}`).join(' ; ')}) : défaut du modèle ou de sa pose commune`]; }
    delete out.sig; delete out.cats; return out;
  }).filter((c) => c.grav > 0).sort((a, b) => b.score - a.score);
  // Mesure de la piste confirmée : boîtes englobantes des objets tournés (colliderBox, KIT.solid). Pour chacune : emprise réelle
  // (w × d), boîte gardée (englobante), excédent ; part de l'excédent au-dessus du sol praticable (murs invisibles rendus par
  // la correction) et part sans rien de visible.
  const rotBoxes = props.filter((b) => b.rot).map((b) => ({ box: b.i, obj: b.owner >= 0 ? objs[b.owner].name : null, deg: Math.round(((b.rb.ry * 180 / Math.PI) % 180 + 180) % 180), real: r2(b.rb.w * b.rb.d), aabb: r2((b.x1 - b.x0) * (b.z1 - b.z0)), excess: r2((b.x1 - b.x0) * (b.z1 - b.z0) - b.rb.w * b.rb.d), excessWalk: b.out ?? null, excessInvisible: b.invOut ?? null, blocks: blocksPlayer(b), at: [r2(b.rb.x), r2(b.rb.z)] })).sort((a, b) => (b.excessWalk || 0) - (a.excessWalk || 0));
  window.__PL = { objs, caseList }; // pour les captures
  const byCat = {}; for (const f of F) { byCat[f.cat] ||= [0, 0, 0, 0]; byCat[f.cat][f.grav]++; }
  const area = (f) => { let n = 0; for (let i = 0; i < N; i++) if (f(i)) n++; return r2(n * G * G); };
  return {
    map: SP.MAP_ID(), timing, counts: { objets: objs.length, audités: active.length, lointains: objs.length - active.length, boîtes: MAP.props.length, boîtesActives: props.length, maillagesAppuis: nsup, trianglesAppuis: TR.length / 10, nonAudités: unknown },
    accessibilité: { praticable: area((i) => cl0[i] >= PR), atteintSansObjets: area((i) => B0[i] >= PR), atteintAvecObjets: area((i) => BP[i] >= PR), atteintEnSeFaufilant: area((i) => reachedPlus[i]), largeurAuMoins08SansObjets: area((i) => B0[i] >= PW), largeurAuMoins08: area((i) => BP[i] >= PW), inaccessibleSansObjets: r2(lostMap * G * G) },
    ouvertures: openings.length,
    byCat, rotBoxes, findings: F.map(({ cells, ...f }) => f), cases: caseList.map(({ cells, ...c }) => c),
    objects: active.map((o) => ({ i: o.i, name: o.name, kind: o.kind, at: [r2(o.c[0]), r2(o.c[1]), r2(o.c[2])], size: o.size.map(r2), ry: r2(o.ry || 0), where: o.where, zone: o.zone, gap: o.gap === undefined || o.gap === Infinity ? null : r2(o.gap), on: o.on, attached: o.attached || null, inWall: o.inWall, vol: r2(o.vol * 1000), boxes: o.boxes || [] })),
  };
}

/* ═══════════════════ Captures : quatre vues autour d'un cas (dans la page) ═══════════════════ */
function pageShot([ci, label]) {
  const { P, R, THREE, MAP } = SP, c = window.__PL.caseList[ci], o = c.obj !== undefined ? window.__PL.objs[c.obj] : null;
  const TILE = 2, W = SP.MAPW(), D = MAP.type.length / W;
  const fx = c.at[0], fz = c.at[2], fy = o ? Math.min(1.4, Math.max(0.3, (o.minY + o.maxY) / 2)) : 0.5;
  const rad = o ? Math.min(4, Math.max(0.7, Math.hypot(o.size[0], o.size[2]) / 2)) : c.cells ? 2 : 1.2;
  // Repères : objet en jaune, boîtes de collision en rouge (pleines : les murs invisibles se voient), zone en magenta.
  const helpers = [], add = (h) => { R.scene.add(h); helpers.push(h); };
  if (o) add(new THREE.Box3Helper(o.box, 0xffe000));
  const boxes = new Set(c.boxes); MAP.props.forEach((b, i) => { if (!b.off && Math.abs((b.x0 + b.x1) / 2 - fx) < rad + 4 && Math.abs((b.z0 + b.z1) / 2 - fz) < rad + 4) boxes.add(i); });
  for (const i of boxes) {
    const b = MAP.props[i]; if (!b || b.off) continue; const mine = c.boxes.includes(i);
    add(new THREE.Box3Helper(new THREE.Box3(new THREE.Vector3(b.x0, b.y0 || 0, b.z0), new THREE.Vector3(b.x1, b.y1, b.z1)), mine ? 0xff2020 : 0xff8080));
    const m = new THREE.Mesh(new THREE.BoxGeometry(b.x1 - b.x0, b.y1 - (b.y0 || 0), b.z1 - b.z0), new THREE.MeshBasicMaterial({ color: 0xff2020, transparent: true, opacity: mine ? 0.13 : 0.06, depthWrite: false }));
    m.position.set((b.x0 + b.x1) / 2, ((b.y0 || 0) + b.y1) / 2, (b.z0 + b.z1) / 2); add(m);
  }
  if (c.cells) { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(c.cells.flatMap(([x, z]) => [x, 0.06, z]), 3)); add(new THREE.Points(g, new THREE.PointsMaterial({ color: 0xff00ff, size: 0.12 }))); }
  R.scene.updateMatrixWorld(true);
  // Ligne de vue : rien de plein (murs, plafonds, portes) entre l'œil et le point visé.
  const clear = (ax, ay, az, bx, by, bz) => { const L = Math.hypot(bx - ax, by - ay, bz - az), n = Math.ceil(L / 0.08); for (let k = 1; k < n - 2; k++) { const t = k / n, x = ax + (bx - ax) * t, y = ay + (by - ay) * t, z = az + (bz - az) * t; if (SP.solidAt(x, y, z, false) && y > SP.groundAt(x, z) + 0.05) return false; } return true; };
  // Quatre points de vue dégagés et aussi différents que possible (16 directions, plusieurs distances et hauteurs d'œil),
  // de préférence au sol praticable ; à défaut, vue plongeante de plus haut.
  const cands = [];
  for (let s = 0; s < 16; s++) for (const dist of [rad + 1.4, rad + 2.4, rad + 0.8, rad + 3.6]) for (const eye of [1.6, 2.4]) {
    const a = (s / 16) * Math.PI * 2, cx = fx + Math.sin(a) * dist, cz = fz + Math.cos(a) * dist, tx = Math.floor(cx / TILE), tz = Math.floor(cz / TILE);
    const inside = tx >= 0 && tz >= 0 && tx < W && tz < D && (MAP.type[tz * W + tx] === 1 || MAP.type[tz * W + tx] === 2);
    if (!clear(cx, eye, cz, fx, fy, fz)) continue;
    // ni dans un objet (boîte de collision), ni collé à un mur : la vue serait bouchée
    if (MAP.props.some((b) => !b.off && cx > b.x0 - 0.3 && cx < b.x1 + 0.3 && cz > b.z0 - 0.3 && cz < b.z1 + 0.3 && eye < b.y1 + 0.2 && eye > (b.y0 || 0) - 0.2)) continue;
    if ([[0.25, 0], [-0.25, 0], [0, 0.25], [0, -0.25]].some(([a, b]) => SP.solidAt(cx + a, eye, cz + b, false))) continue;
    cands.push({ a, cx, cz, eye, sc: (inside ? 2 : 0) + (eye < 2 ? 0.5 : 0) - Math.abs(dist - rad - 1.4) * 0.2 });
  }
  const angd = (p, q) => { const d = Math.abs(p - q) % (Math.PI * 2); return Math.min(d, Math.PI * 2 - d); };
  const views = [];
  while (views.length < 4 && cands.length) {
    let best = null, bv = -Infinity;
    for (const v of cands) { const sep = views.length ? Math.min(...views.map((w) => angd(w.a, v.a))) : Math.PI; const val = v.sc + Math.min(sep, Math.PI / 2) * 2; if (val > bv) { bv = val; best = v; } }
    views.push(best); cands.splice(cands.indexOf(best), 1);
  }
  while (views.length < 4) { const a = (views.length / 4) * Math.PI * 2 + 0.4; views.push({ a, cx: fx + Math.sin(a) * (rad + 1.5), cz: fz + Math.cos(a) * (rad + 1.5), eye: 3.2, sc: -9 }); }
  const dirName = (a) => ['sud', 'sud-est', 'est', 'nord-est', 'nord', 'nord-ouest', 'ouest', 'sud-ouest'][Math.round((((a % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2)) / (Math.PI / 4)) % 8]; // côté de la caméra (nord = −z)
  const cw = 640, ch = 360, mc = document.createElement('canvas'); mc.width = cw * 2; mc.height = ch * 2; const c2 = mc.getContext('2d');
  const cam = R.camera;
  views.forEach((v, i) => {
    SP.G.mode = 'playing'; P.pos.set(v.cx, 0, v.cz); P.vel.set(0, 0, 0); SP.updatePlayer(0.016);
    const dx = fx - v.cx, dz = fz - v.cz, yaw = Math.atan2(-dx, -dz), pitch = Math.atan2(fy - v.eye, Math.hypot(dx, dz));
    cam.position.set(v.cx, v.eye, v.cz); cam.rotation.set(pitch, yaw, 0); cam.updateMatrixWorld(true);
    SP.renderFrame(1); c2.drawImage(R.renderer.domElement, (i % 2) * cw, ((i / 2) | 0) * ch, cw, ch);
    c2.fillStyle = '#000b'; c2.fillRect((i % 2) * cw, ((i / 2) | 0) * ch, cw, 22); c2.fillStyle = v.sc < -5 ? '#f88' : '#ff0'; c2.font = '14px monospace';
    c2.fillText(`${label} depuis le ${dirName(v.a)}${v.sc < -5 ? ' (aucune vue dégagée)' : ''} · ${c.name} (${c.at[0]}, ${c.at[2]})`.slice(0, 84), (i % 2) * cw + 5, ((i / 2) | 0) * ch + 16);
  });
  const txt = c.issues.join(' | '), nl = Math.min(4, Math.ceil(txt.length / 175)); c2.fillStyle = '#000c'; c2.fillRect(0, ch * 2 - 6 - nl * 17, cw * 2, 6 + nl * 17); c2.fillStyle = '#fff'; c2.font = '13px monospace';
  for (let l = 0; l < nl; l++) c2.fillText(txt.slice(l * 175, (l + 1) * 175), 5, ch * 2 - 7 - (nl - 1 - l) * 17);
  for (const h of helpers) { R.scene.remove(h); h.geometry?.dispose(); }
  return mc.toDataURL('image/jpeg', 0.85);
}

const res = await page.evaluate(pageAudit, { margin: 10 });
fs.mkdirSync(path.join(dir, 'results'), { recursive: true }); fs.mkdirSync(path.join(dir, 'shots'), { recursive: true });
const out = path.join(dir, 'results', `placement_${id}.json`);
// Captures des cas les plus graves (et de ceux que VOIR désigne), nommées par le rang du cas. Un cas à moins de 1,5 m d'un
// cas déjà retenu (même endroit vu sous un autre angle : la télé de la zone coupée, placards de la même embrasure) est sauté.
// (les captures d'un passage précédent sont effacées : leurs numéros ne correspondraient plus aux cas)
for (const f of fs.readdirSync(path.join(dir, 'shots'))) if (f.startsWith(`placement_${id}_`) && f.endsWith('.jpg')) fs.unlinkSync(path.join(dir, 'shots', f));
const shots = [], pick = [];
for (let k = 0; k < res.cases.length && pick.length < NSHOTS; k++) { const a = res.cases[k].at; if (!pick.some((j) => Math.hypot(res.cases[j].at[0] - a[0], res.cases[j].at[2] - a[2]) < 1.5)) pick.push(k); }
if (process.env.VOIR) { const re = new RegExp(process.env.VOIR, 'i'); res.cases.forEach((c, k) => { if (!pick.includes(k) && re.test(c.name + ' ' + c.issues.join(' '))) pick.push(k); }); }
for (const k of pick) {
  const url = await page.evaluate(pageShot, [k, `n° ${k + 1}`]);
  const f = path.join(dir, 'shots', `placement_${id}_${k + 1}.jpg`); fs.writeFileSync(f, Buffer.from(url.split(',')[1], 'base64')); shots.push(path.relative(dir, f));
}
res.shots = shots; res.errors = errors;
fs.writeFileSync(out, JSON.stringify(res, null, 1));
// Résumé.
const GR = ['info', 'léger', 'moyen', 'grave'];
console.log(`objets audités ${res.counts.audités} (lointains ${res.counts.lointains}), boîtes de collision ${res.counts.boîtesActives}/${res.counts.boîtes}, appuis ${res.counts.maillagesAppuis} maillages / ${res.counts.trianglesAppuis} triangles`);
console.log('temps (ms) :', JSON.stringify(res.timing));
console.log('non audités (architecture, semis, sans nom) :', JSON.stringify(res.counts.nonAudités));
console.log('accessibilité (m²) :', JSON.stringify(res.accessibilité));
console.log('constats par catégorie [info, léger, moyen, grave] :'); for (const [k, v] of Object.entries(res.byCat)) console.log('  ', k.padEnd(20), v.join(' / '));
{ const rb = res.rotBoxes, sum = (k, l = rb) => l.reduce((a, b) => a + (b[k] || 0), 0).toFixed(1), bl = rb.filter((b) => b.blocks);
  console.log(`objets tournés (colliderBox garde la boîte englobante alignée sur les axes) : ${rb.length} boîtes, emprise réelle ${sum('real')} m², boîtes gardées ${sum('aabb')} m², excédent ${sum('excess')} m² ;`);
  console.log(`   dont ${sum('excessWalk', bl)} m² au-dessus du sol praticable (murs invisibles que la correction rendra), ${sum('excessInvisible', bl)} m² sans rien de visible ; les plus gros :`, bl.slice(0, 6).map((b) => `${b.obj} ${b.deg}° (${b.at.join(', ')}) ${b.excessWalk} m²`).join(' ; ')); }
console.log('cas les plus graves :');
res.cases.slice(0, 15).forEach((c, k) => console.log(`  ${String(k + 1).padStart(2)}. [${GR[c.grav]}] ${c.name} (${c.at[0]}, ${c.at[2]}) ${c.zone} — ${c.issues.join(' | ')}`.slice(0, 420)));
console.log('→', path.relative(dir, out), shots.length ? '+ ' + shots.length + ' captures' : '');
console.log('ERRORS', errors.length); for (const e of errors.slice(0, 10)) console.log(e);
await browser.close();
