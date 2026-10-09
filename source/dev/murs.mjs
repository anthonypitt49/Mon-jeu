// Détecteur de MURS INVISIBLES : ce que vit le joueur (ses collisions exactes) comparé à ce qu'il voit (les maillages affichés).
// usage : node murs.mjs <carte> [captures=8]   (cartes : poste7, cite, penitencier, filon)
// env : Q=<qualité 0-3> (0 par défaut : captures plus rapides) ; PAS=0.5 (espacement des points, m) ; ECART=0.3 (m) ; MIN=2 (points d'un groupe compté) ;
//       GRAINE=1 (Math.random rejoué à l'identique : le décor tiré au hasard — orientation des bouches d'incendie, poubelles, pneus… — est le même
//       d'un passage à l'autre, pour comparer avant / après une correction ; GRAINE=0 : hasard du jeu) ;
//       TEMOIN=1 : contrôle de l'outil, ajoute en terrain dégagé une boîte de 1 × 1 m sans maillage et un carreau T_BLOCK sans mur :
//       les deux doivent ressortir (objet « temoin » à 0 % de couverture, limite_invisible).
// → results/murs_<carte>.json (groupes classés), shots/murs_<carte>_<n>.jpg (4 vues des groupes les plus graves, points rouges = pas bloqués),
//   résumé à l'écran et « ERRORS n » (n = erreurs de la page + groupes de murs invisibles d'au moins MIN points).
//
// Méthode (cf. 10_player.js) :
//  1. partie solo sans infectés, toutes les portes ouvertes (comme un camarade qui rejoint), objets non fusionnés (?nomerge) ;
//  2. sur chaque carreau praticable (isTrench), un point tous les PAS m, ramené là où le joueur peut se tenir (points dans une boîte écartés) ;
//     8 directions, pas de 0,45 m en 4 sous-pas avec exactement les collisions du joueur (collideCircle + pBlocked, puis collideProps
//     au niveau du sol avec marche de 0,3 m) ; avancée < 0,2 m dans la direction = pas bloqué ;
//  3. pas bloqué → rayons horizontaux (16 hauteurs de 0,1 à 1,6 m × 9 décalages sur la largeur du corps) contre les triangles visibles de la scène
//     + rayons verticaux sur la bande devant le corps (faces arrière ignorées comme à l'affichage ; sprites, particules, effets additifs, objets cachés et débris < 0,4 m exclus) ;
//     une marche de sol visible compte aussi. Rien de visible à moins de ECART m au-delà du contact → candidat mur invisible ;
//  4. source : boîte MAP.props (avec la fonction qui l'a créée, relevée par une pile d'appels à chaque MAP.props.push),
//     mur fin (MAP.ew), ou carreau voisin (limite_invisible pour T_SOLID / T_BLOCK, barricade, porte) ;
//  5. couverture de chaque boîte : grille de 0,2 m, rayon vertical dans la hauteur de la boîte, fraction des points où un maillage visible passe ;
//  6. regroupement par boîte (objet) ou par proximité < 1 m (autres sortes), classement par nombre de points, captures des plus graves.
import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';
const dir = path.dirname(new URL(import.meta.url).pathname);
const TEMOIN = !!+(process.env.TEMOIN || 0), id = process.argv[2] || 'cite', NSHOT = +(process.argv[3] ?? 8), q = +(process.env.Q ?? 0), seed = +(process.env.GRAINE ?? 1);
const PAS = +(process.env.PAS || 0.5), ECART = +(process.env.ECART || 0.3), MIN = +(process.env.MIN || 2);
const t0 = Date.now(); let page; const lap = async (s) => { const h = page ? await page.evaluate(() => performance.memory?.usedJSHeapSize || 0).catch(() => 0) : 0; console.log(`[${((Date.now() - t0) / 1000).toFixed(0)} s, ${(h / 1048576).toFixed(0)} Mo] ${s}`); };

// Correspondance ligne de index.html → fichier source (build.mjs : en-tête « // ─── NOM ─── » puis le fichier tel quel).
const srcDir = path.join(dir, '..', 'src'), parts = fs.readdirSync(srcDir).filter((f) => f.endsWith('.js')).sort();
const built = fs.readFileSync(path.join(dir, 'index.html'), 'utf8').split('\n'), heads = [];
built.forEach((l, i) => { const m = /^\/\/ ─+ (\S+) ─+$/.exec(l); if (m) heads.push(i + 1); });
const srcLines = {};
function srcOf(line) { // → [fichier, ligne] ou null
  let k = -1; for (let i = 0; i < heads.length; i++) if (heads[i] < line) k = i; else break;
  if (k < 0 || heads.length !== parts.length) return null;
  return [parts[k], line - heads[k]];
}
const srcText = (f, l) => ((srcLines[f] ||= fs.readFileSync(path.join(srcDir, f), 'utf8').split('\n'))[l - 1] || '');

const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
await ctx.addInitScript(([q, seed]) => {
  localStorage.setItem('sp_settings', JSON.stringify({ quality: q }));
  if (seed) { let a = seed >>> 0; Math.random = () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; } // mulberry32
  // Crochet de test : chaque boîte d'obstacle ajoutée à MAP.props garde la pile d'appels qui l'a créée.
  Error.stackTraceLimit = 40; window.__propSrc = new WeakMap(); let sp;
  const wrap = (a) => { const push = a.push; Object.defineProperty(a, 'push', { configurable: true, writable: true, value(...it) { const s = new Error().stack; for (const o of it) if (o && typeof o === 'object') window.__propSrc.set(o, s); return push.apply(this, it); } }); return a; };
  Object.defineProperty(window, 'SP', { configurable: true, get: () => sp, set(v) {
    sp = v; if (!v || !v.MAP || v.MAP.__hooked) return; let arr = wrap(v.MAP.props); Object.defineProperty(v.MAP, '__hooked', { value: true });
    Object.defineProperty(v.MAP, 'props', { configurable: true, enumerable: true, get: () => arr, set: (n) => { arr = Array.isArray(n) ? wrap(n) : n; } });
  } });
}, [q, seed]);
page = await ctx.newPage(); const errors = [];
page.on('pageerror', (e) => errors.push('[pageerror] ' + e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push('[console] ' + m.text().slice(0, 300)); });
await page.route('https://cdn.jsdelivr.net/npm/three@0.186.1/**', (route) => { const u = new URL(route.request().url()); route.fulfill({ path: path.join(dir, 'node_modules/three', u.pathname.replace('/npm/three@0.186.1/', '')), contentType: 'application/javascript' }); });
await page.route('https://cdn.jsdelivr.net/npm/n8ao@2.0.1/**', (route) => route.fulfill({ path: path.join(dir, 'node_modules/n8ao/dist/N8AO.js'), contentType: 'application/javascript' }));
await page.route('https://fonts.googleapis.com/**', (r) => r.fulfill({ body: '', contentType: 'text/css' }));
await page.route('https://fonts.gstatic.com/**', (r) => r.abort());
await page.goto('http://127.0.0.1:8088/index.html?nomerge&nophoto&nozreal&spots#carte=' + id);
await page.waitForFunction(() => window.__spReady, null, { timeout: 180000 });
await lap('carte chargée');
await page.evaluate(() => document.querySelector('#soloButton').click());
await page.waitForTimeout(1500);

// ─── 1. Partie solo sans infectés, portes ouvertes ───
await page.evaluate(() => {
  const { G, P, R, MAP } = SP; P.hp = P.maxHp = 1e9; G.breakT = 1e9; G.toSpawn = 0; for (const z of [...SP.ZOMBIES]) z.destroy();
  SP.sim(0.2); for (const z of [...SP.ZOMBIES]) z.destroy(); G.toSpawn = 0;
  for (const d of MAP.doors) { d.open = true; d.anim = 1; if (d.group) d.group.visible = false; } // comme 12_net.js pour un camarade qui rejoint
  R.viewScene.visible = false; document.getElementById('hud').classList.add('hidden');
});
if (TEMOIN) console.log('TEMOIN', JSON.stringify(await page.evaluate(() => {
  // Carreaux dégagés (3 × 3 praticables, sans mur fin ni boîte) les plus proches du départ.
  const { MAP, P } = SP, W = SP.MAPW(), D = MAP.type.length / W, ok = [];
  for (let z = 1; z < D - 1; z++) for (let x = 1; x < W - 1; x++) {
    let good = true; for (let b = -1; b <= 1 && good; b++) for (let a = -1; a <= 1; a++) if (!SP.isTrench(x + a, z + b) || MAP.ew[(z + b) * W + x + a]) good = false;
    if (good && !MAP.props.some((p) => p.x1 > x * 2 - 2 && p.x0 < x * 2 + 4 && p.z1 > z * 2 - 2 && p.z0 < z * 2 + 4)) ok.push([x, z, Math.hypot(x * 2 + 1 - P.pos.x, z * 2 + 1 - P.pos.z)]);
  }
  ok.sort((a, b) => a[2] - b[2]); const A = ok[0], B = ok.find((t) => Math.hypot(t[0] - A[0], t[1] - A[1]) >= 4); if (!A || !B) return null;
  MAP.props.push({ x0: A[0] * 2 + 0.5, x1: A[0] * 2 + 1.5, z0: A[1] * 2 + 0.5, z1: A[1] * 2 + 1.5, y0: 0, y1: 1.5, mat: 'temoin' });
  MAP.type[B[1] * W + B[0]] = 4; // T_BLOCK sans mur dessiné
  return { boite: [A[0] * 2 + 1, A[1] * 2 + 1], carreau: [B[0], B[1]] };
})));

// ─── Index des triangles visibles (grille de 1 m sur x, z) ───
const idx = await page.evaluate(() => {
  const { THREE, R, MAP } = SP, scene = R.scene, TILE = 2, W = SP.MAPW(), D = MAP.type.length / W;
  scene.updateMatrixWorld(true);
  const CELL = 1, GX0 = -6, GZ0 = -6, GW = Math.ceil((W * TILE + 12) / CELL), GD = Math.ceil((D * TILE + 12) / CELL), GX1 = GX0 + GW * CELL, GZ1 = GZ0 + GD * CELL;
  const skip = new Set([R.sky, R.snow, R.camera].filter(Boolean));
  const visChain = (o) => { for (let p = o; p; p = p.parent) if (!p.visible || skip.has(p)) return false; return true; }; // (userData.dynamic = non fusionné, pas invisible)
  const matOk = (m) => !!m && m.visible !== false && m.colorWrite !== false && m.blending !== THREE.AdditiveBlending && !(m.transparent && m.opacity < 0.15) && !m.isShadowMaterial && !m.isPointsMaterial && !m.isSpriteMaterial && !m.isLineBasicMaterial;
  const jobs = [], names = []; let NT = 0, nMesh = 0, nInst = 0;
  scene.traverse((o) => {
    if (!o.isMesh || o.isSkinnedMesh || !o.geometry?.attributes?.position || !visChain(o) || !o.layers.test(R.camera.layers)) return;
    const g = o.geometry, cnt = g.index ? g.index.count : g.attributes.position.count, ranges = [];
    if (Array.isArray(o.material)) { for (const gr of g.groups) { const m = o.material[gr.materialIndex]; if (matOk(m)) ranges.push([gr.start, Math.min(cnt, gr.start + gr.count), m.side]); } }
    else if (matOk(o.material)) ranges.push([g.drawRange.start, Math.min(cnt, g.drawRange.start + g.drawRange.count), o.material.side]);
    if (!ranges.length) return;
    const inst = o.isInstancedMesh ? o.count : 1; let nt = 0; for (const r of ranges) nt += Math.floor((r[1] - r[0]) / 3);
    const m0 = [].concat(o.material)[0], tag = (o.name || o.parent?.name || '') + ' ' + g.type.replace('Geometry', '') + ' ' + (m0?.userData?.ftex || m0?.name || m0?.type || '');
    jobs.push({ o, ranges, inst, oi: names.length }); names.push(tag.trim()); NT += nt * inst; nMesh++; if (o.isInstancedMesh) nInst++;
  });
  const T = new Float32Array(NT * 9), S = new Uint8Array(NT), O = new Int32Array(NT); let n = 0, small = 0;
  const m4 = new THREE.Matrix4(), mi = new THREE.Matrix4(), v = new THREE.Vector3(), bb = new THREE.Box3(), sz = new THREE.Vector3();
  for (const j of jobs) {
    const { o } = j, g = o.geometry, pos = g.attributes.position, ix = g.index; if (!g.boundingBox) g.computeBoundingBox();
    for (let k = 0; k < j.inst; k++) {
      m4.copy(o.matrixWorld); if (o.isInstancedMesh) { o.getMatrixAt(k, mi); m4.multiply(mi); }
      bb.copy(g.boundingBox).applyMatrix4(m4); bb.getSize(sz);
      if (Math.max(sz.x, sz.y, sz.z) < 0.4) { small++; continue; } // débris, touffes, cailloux : pas un mur
      if (bb.max.x < GX0 || bb.min.x > GX1 || bb.max.z < GZ0 || bb.min.z > GZ1 || bb.min.y > 6) continue;
      const flip = m4.determinant() < 0;
      for (const [s, e, side] of j.ranges) for (let t = s; t + 2 < e; t += 3) {
        for (let c = 0; c < 3; c++) { v.fromBufferAttribute(pos, ix ? ix.getX(t + c) : t + c).applyMatrix4(m4); const cc = flip && c ? 3 - c : c; T[n * 9 + cc * 3] = v.x; T[n * 9 + cc * 3 + 1] = v.y; T[n * 9 + cc * 3 + 2] = v.z; }
        S[n] = side; O[n] = j.oi; n++;
      }
    }
  }
  const cells = Array.from({ length: GW * GD }, () => []);
  for (let t = 0; t < n; t++) {
    const a = t * 9, minx = Math.min(T[a], T[a + 3], T[a + 6]), maxx = Math.max(T[a], T[a + 3], T[a + 6]), minz = Math.min(T[a + 2], T[a + 5], T[a + 8]), maxz = Math.max(T[a + 2], T[a + 5], T[a + 8]);
    if (maxx < GX0 || minx > GX1 || maxz < GZ0 || minz > GZ1) continue;
    const cx0 = Math.max(0, Math.floor((minx - GX0) / CELL)), cx1 = Math.min(GW - 1, Math.floor((maxx - GX0) / CELL)), cz0 = Math.max(0, Math.floor((minz - GZ0) / CELL)), cz1 = Math.min(GD - 1, Math.floor((maxz - GZ0) / CELL));
    for (let cz = cz0; cz <= cz1; cz++) for (let cx = cx0; cx <= cx1; cx++) cells[cz * GW + cx].push(t);
  }
  const stamp = new Uint32Array(n); let cur = 0;
  // Premier triangle touché par le segment o + d·t, t ∈ ]0, maxT] ; cull : faces arrière ignorées selon la matière (FrontSide/BackSide/DoubleSide).
  function ray(ox, oy, oz, dx, dy, dz, maxT, cull = true, any = false) {
    cur++; let best = maxT, bi = -1;
    const ex = ox + dx * maxT, ez = oz + dz * maxT;
    const cx0 = Math.max(0, Math.floor((Math.min(ox, ex) - GX0) / CELL)), cx1 = Math.min(GW - 1, Math.floor((Math.max(ox, ex) - GX0) / CELL));
    const cz0 = Math.max(0, Math.floor((Math.min(oz, ez) - GZ0) / CELL)), cz1 = Math.min(GD - 1, Math.floor((Math.max(oz, ez) - GZ0) / CELL));
    for (let cz = cz0; cz <= cz1; cz++) for (let cx = cx0; cx <= cx1; cx++) {
      const L = cells[cz * GW + cx];
      for (let k = 0; k < L.length; k++) {
        const t = L[k]; if (stamp[t] === cur) continue; stamp[t] = cur; const a = t * 9;
        const e1x = T[a + 3] - T[a], e1y = T[a + 4] - T[a + 1], e1z = T[a + 5] - T[a + 2], e2x = T[a + 6] - T[a], e2y = T[a + 7] - T[a + 1], e2z = T[a + 8] - T[a + 2];
        const px = dy * e2z - dz * e2y, py = dz * e2x - dx * e2z, pz = dx * e2y - dy * e2x, det = e1x * px + e1y * py + e1z * pz;
        if (Math.abs(det) < 1e-9) continue;
        if (cull) { const s = S[t]; if ((s === 0 && det < 0) || (s === 1 && det > 0)) continue; } // det > 0 : face avant
        const inv = 1 / det, sx = ox - T[a], sy = oy - T[a + 1], sz2 = oz - T[a + 2], u = (sx * px + sy * py + sz2 * pz) * inv; if (u < 0 || u > 1) continue;
        const qx = sy * e1z - sz2 * e1y, qy = sz2 * e1x - sx * e1z, qz = sx * e1y - sy * e1x, w = (dx * qx + dy * qy + dz * qz) * inv; if (w < 0 || u + w > 1) continue;
        const tt = (e2x * qx + e2y * qy + e2z * qz) * inv;
        if (tt > 1e-4 && tt < best) { best = tt; bi = t; if (any) return { t: best, o: O[bi] }; }
      }
    }
    return bi < 0 ? null : { t: best, o: O[bi] };
  }
  window.__MU = { ray, names };
  return { meshes: nMesh, instanced: nInst, tris: n, small, cells: GW * GD, entries: cells.reduce((a, c) => a + c.length, 0), NT };
});
await lap(`index : ${idx.meshes} maillages (${idx.instanced} instanciés), ${idx.tris} triangles visibles, ${idx.small} débris écartés ; ${idx.entries} entrées de grille, ${idx.NT} triangles réservés`);

// ─── 2-5. Pas du joueur, visibilité, sources, couverture ───
const A = await page.evaluate(([PAS, ECART]) => {
  const { MAP, P } = SP, MU = window.__MU, ray = MU.ray, M = SP.M(), TILE = 2, W = SP.MAPW(), D = MAP.type.length / W;
  const R0 = 0.34, STEP = 0.45, SUB = 4, EDGE_T = 0.08, HEIGHTS = [...Array(16)].map((_, i) => 0.1 + i * 0.1), LAT = [...Array(9)].map((_, i) => -0.3 + i * 0.075), DEPTHS = [0.02, 0.08, 0.15, 0.22, 0.3, 0.45, 0.6, 0.8, 1.0, 1.3, 1.6, 2.0, 2.5]; // pas de 7,5 cm : plus fin qu'un piquet de clôture (9 cm)
  const DIRS = [...Array(8)].map((_, i) => [Math.round(Math.cos((i * Math.PI) / 4) * 1e6) / 1e6, Math.round(Math.sin((i * Math.PI) / 4) * 1e6) / 1e6]);
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const live = (b, y) => !b.off && !(y + 0.3 >= b.y1 || y + 1.6 < (b.y0 || 0)); // mêmes conditions que collideProps
  const inBox = (x, z, y) => MAP.props.some((b) => live(b, y) && x > b.x0 && x < b.x1 && z > b.z0 && z < b.z1);
  const resolve = (p, y) => { SP.collideCircle(p, R0, SP.pBlocked); SP.collideProps(p, R0, y, 0.3); };
  const tmS = Date.now();
  // Points d'échantillon (là où le joueur peut se tenir).
  const pts = [], lat = new Map(), n = Math.round(TILE / PAS); let nTiles = 0, inside = 0, pushed = 0;
  for (let tz = 0; tz < D; tz++) for (let tx = 0; tx < W; tx++) {
    if (!SP.isTrench(tx, tz)) continue; nTiles++;
    for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
      const x = tx * TILE + (i + 0.5) * PAS, z = tz * TILE + (j + 0.5) * PAS, y = SP.groundAt(x, z);
      if (inBox(x, z, y)) { inside++; continue; }
      const p = { x, z }; resolve(p, y); resolve(p, y);
      if (Math.hypot(p.x - x, p.z - z) > 0.36 || !SP.isTrench(SP.tileOf(p.x), SP.tileOf(p.z))) { pushed++; continue; }
      const gi = tx * n + i, gj = tz * n + j; lat.set(gi + ',' + gj, pts.length);
      pts.push({ x: p.x, z: p.z, y, gi, gj, ok: 0 });
    }
  }
  // Pas de 0,45 m en sous-pas (un pas d'un coup traverserait les murs fins).
  const step = (p, d) => {
    const q = { x: p.x, z: p.z };
    for (let k = 0; k < SUB; k++) { q.x += (d[0] * STEP) / SUB; q.z += (d[1] * STEP) / SUB; resolve(q, SP.groundAt(q.x, q.z)); }
    if (!SP.isTrench(SP.tileOf(q.x), SP.tileOf(q.z))) { q.x = p.x; q.z = p.z; } // filet de sécurité du joueur : retour en arrière
    return q;
  };
  const front = (o) => Math.sqrt(R0 * R0 - o * o);
  // Quelque chose de visible devant le contact (à moins de lim m) ? Renvoie l'écart mesuré (m, Infinity sinon) et l'objet touché.
  function seen(q, d, gy, lim) {
    let best = Infinity, obj = -1;
    for (const h of HEIGHTS) for (const o of LAT) {
      const f = front(o), hit = ray(q.x - d[1] * o, gy + h, q.z + d[0] * o, d[0], 0, d[1], f + lim, true, lim < 1);
      if (hit && hit.t - f < best) { best = hit.t - f; obj = hit.o; if (lim < 1) return { gap: best, obj }; }
    }
    // Rayons verticaux sur la bande devant le corps (de 1,6 m jusqu'au sol) : dessus des planches, plateaux, dalles basses,
    // que des rayons horizontaux espacés de 10 cm peuvent manquer (assise de banc de 5 cm).
    for (const dd of DEPTHS) {
      if (dd > lim + 1e-6 || dd >= best) break;
      for (const o of LAT) {
        const f = front(o), hit = ray(q.x + d[0] * (f + dd) - d[1] * o, gy + 1.6, q.z + d[1] * (f + dd) + d[0] * o, 0, -1, 0, 1.55, true, true);
        if (hit) { best = dd; obj = hit.o; if (lim < 1) return { gap: best, obj }; break; }
      }
    }
    for (let t = 0.1; t <= R0 + lim + 1e-6; t += 0.1) if (SP.groundAt(q.x + d[0] * t, q.z + d[1] * t) > gy + 0.3) { if (t - R0 < best) { best = Math.max(0, t - R0); obj = -2; } break; } // marche de sol visible
    return { gap: best, obj };
  }
  // Ce qui arrête le joueur en q : boîte, mur fin ou carreau, le plus en face du mouvement.
  function sourceOf(q, d, y) {
    let best = null; const RR = R0 + 0.03;
    const consider = (s, x0, x1, z0, z1) => {
      const cx = clamp(q.x, x0, x1), cz = clamp(q.z, z0, z1), dx = q.x - cx, dz = q.z - cz, dist = Math.hypot(dx, dz); if (dist > RR) return;
      const face = dist > 1e-6 ? -(dx * d[0] + dz * d[1]) / dist : 1; if (face < 0.2) return;
      s.face = face; s.dist = dist; s.n = dist > 1e-6 ? [(cx - q.x) / dist, (cz - q.z) / dist] : d; if (!best || face > best.face + 0.05 || (Math.abs(face - best.face) <= 0.05 && dist < best.dist)) best = s;
    };
    MAP.props.forEach((b, i) => { if (live(b, y)) consider({ type: 'prop', i }, b.x0, b.x1, b.z0, b.z1); });
    const cx = SP.tileOf(q.x), cz = SP.tileOf(q.z);
    for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) {
      const tx = cx + dx, tz = cz + dz;
      if (SP.pBlocked(cx, cz, tx, tz)) consider({ type: 'tile', tx, tz, t: SP.inMap(tx, tz) ? MAP.type[tz * W + tx] : -1 }, tx * TILE, tx * TILE + TILE, tz * TILE, tz * TILE + TILE);
      if (!SP.inMap(tx, tz) || !MAP.hasEdges) continue; const w = MAP.ew[tz * W + tx];
      for (let bit = 0; bit < 2; bit++) {
        if (!(w & (1 << bit))) continue;
        const x0 = bit === 0 ? (tx + 1) * TILE - EDGE_T : tx * TILE - EDGE_T, x1 = (tx + 1) * TILE + EDGE_T, z0 = bit === 0 ? tz * TILE - EDGE_T : (tz + 1) * TILE - EDGE_T, z1 = (tz + 1) * TILE + EDGE_T;
        const k = MAP.ek[(tz * W + tx) * 2 + bit], wd = M.walls?.[k - 1];
        consider({ type: 'edge', tx, tz, bit, key: wd?.key || '?', h: wd?.h, see: !!wd?.see }, x0, x1, z0, z1);
      }
    }
    return best || { type: 'aucune' };
  }
  const cands = []; let nSteps = 0, nBlocked = 0, nVis = 0;
  pts.forEach((p, pi) => DIRS.forEach((d, di) => {
    nSteps++; const qq = step(p, d), disp = (qq.x - p.x) * d[0] + (qq.z - p.z) * d[1];
    if (disp >= 0.2) { p.ok |= 1 << di; return; }
    nBlocked++;
    // Visible devant ? depuis la position atteinte (dans la direction du pas, puis vers le point de contact : coin contourné),
    // puis depuis le départ (le joueur a pu glisser le long d'un objet visible avant d'être arrêté).
    const src = sourceOf(qq, d, p.y), lp = ECART + Math.max(0, disp);
    if (seen(qq, d, p.y, ECART).gap <= ECART || (src.n && src.n !== d && seen(qq, src.n, p.y, ECART).gap <= ECART) || seen(p, d, p.y, lp).gap <= lp) { nVis++; return; }
    const full = seen(qq, d, p.y, 2.5); delete src.n;
    cands.push({ pi, di, x: +qq.x.toFixed(3), z: +qq.z.toFixed(3), y: p.y, gap: full.gap === Infinity ? null : +full.gap.toFixed(2), obj: full.obj >= 0 ? MU.names[full.obj] : full.obj === -2 ? 'marche' : null, src });
  }));
  const tmSteps = Date.now() - tmS;
  // Points atteignables depuis la position de départ (pas libres entre points voisins).
  const reach = new Uint8Array(pts.length); {
    let s = 0, bd = 1e9; pts.forEach((p, i) => { const dd = Math.hypot(p.x - P.pos.x, p.z - P.pos.z); if (dd < bd) { bd = dd; s = i; } });
    const qu = [s]; reach[s] = 1;
    while (qu.length) { const a = qu.pop(), p = pts[a]; DIRS.forEach((d, di) => { if (!(p.ok & (1 << di))) return; const b = lat.get(p.gi + Math.round(d[0]) + ',' + (p.gj + Math.round(d[1]))); if (b != null && !reach[b]) { reach[b] = 1; qu.push(b); } }); }
  }
  // Couverture des boîtes : grille de 0,2 m, rayon vertical dans la hauteur de la boîte (toutes faces).
  const props = MAP.props.map((b, i) => {
    const w = b.x1 - b.x0, dd = b.z1 - b.z0, sx = Math.min(0.2, w / 5), sz = Math.min(0.2, dd / 5); let tot = 0, cov = 0;
    if (!b.off) for (let z = b.z0 + sz / 2; z < b.z1; z += sz) for (let x = b.x0 + sx / 2; x < b.x1; x += sx) {
      const lo = Math.max(b.y0 || 0, SP.groundAt(x, z) + 0.05), hi = b.y1 + 0.05; if (hi <= lo) continue; tot++;
      if (ray(x, hi, z, 0, -1, 0, hi - lo, false, true)) cov++;
    }
    return { i, x0: +b.x0.toFixed(3), x1: +b.x1.toFixed(3), z0: +b.z0.toFixed(3), z1: +b.z1.toFixed(3), y0: b.y0 || 0, y1: +b.y1.toFixed(3), mat: b.mat, off: !!b.off, cov: tot ? cov / tot : null, stack: window.__propSrc.get(b) || '' };
  });
  return {
    W, D, nTiles, inside, pushed, nPts: pts.length, nSteps, nBlocked, nVis, tmSteps, reach: [...reach].reduce((a, b) => a + b, 0),
    pts: pts.map((p, i) => [+p.x.toFixed(3), +p.z.toFixed(3), reach[i]]), cands, props, spots: SP.KIT.spots || [], spawn: [P.pos.x, P.pos.z],
    types: ['T_SOLID', 'T_FLOOR', 'T_DOOR', 'T_RAMP', 'T_BLOCK'],
  };
}, [PAS, ECART]);
await lap(`${A.nTiles} carreaux praticables, ${A.nPts} points (${A.inside} dans une boîte, ${A.pushed} écartés), ${A.nSteps} pas : ${A.nBlocked} bloqués dont ${A.nVis} devant du visible, ${A.cands.length} candidats (${(A.tmSteps / 1000).toFixed(1)} s) ; ${A.reach} points atteignables`);

// ─── Origine des boîtes (pile d'appels → fonction, fichier:ligne) ───
const SKIPFN = /^(collider|colliderBox|Object\.solid|solid|Array\.push|a\.push|push|Array\.forEach|forEach|Object\.value|value)$/;
function parseStack(st) {
  const fr = [];
  for (const l of st.split('\n').slice(1)) {
    const m = /^\s*at (?:(.+?) \()?(.*?):(\d+):(\d+)\)?\s*$/.exec(l); if (!m || !/index\.html/.test(m[2])) continue;
    const s = srcOf(+m[3]); if (s) fr.push({ fn: m[1] || '(anonyme)', file: s[0], line: s[1], col: +m[4] });
  }
  return fr;
}
const KITFN = new Set(A.spots.map((s) => s.fn));
for (const b of A.props) {
  const fr = parseStack(b.stack); delete b.stack;
  const kept = fr.filter((f) => !SKIPFN.test(f.fn));
  b.creee_par = kept.slice(0, 3).map((f) => `${f.fn} (${f.file}:${f.line})`).join(' ← ') || '?';
  b.fn = kept[0]?.fn || '?';
  // Appel d'origine : KIT.solid(g, w, d, h…) ou colliderBox(x, z, w, d, ry, h…) → dimensions de l'objet avant rotation.
  const k = fr.findIndex((f) => /solid$/.test(f.fn)), kb = fr.findIndex((f) => f.fn === 'colliderBox');
  b.via = k >= 0 ? 'KIT.solid' : kb >= 0 ? 'colliderBox' : 'collider';
  const call = k >= 0 ? fr[k + 1] : kb >= 0 ? fr[kb + 1] : null;
  if (call) {
    const txt = srcText(call.file, call.line).slice(Math.max(0, call.col - 30));
    const m = k >= 0 ? /KIT\.solid\(\s*\w+\s*,\s*([\d.]+)\s*,\s*([\d.]+)/.exec(txt) : /colliderBox\([^,]+,[^,]+,\s*([\d.]+)\s*,\s*([\d.]+)\s*,/.exec(txt);
    if (m) { b.w = +m[1]; b.d = +m[2]; }
  }
  // Orientation : objet de la trousse posé par KIT.g (?spots) le plus proche, de la même fonction.
  const cx = (b.x0 + b.x1) / 2, cz = (b.z0 + b.z1) / 2; let sp = null, sd = 1.0;
  for (const s of A.spots) { if (!KITFN.has(s.fn) || !fr.some((f) => f.fn === s.fn)) continue; const dd = Math.hypot(s.x - cx, s.z - cz); if (dd < sd) { sd = dd; sp = s; } }
  if (sp) { b.ry = +sp.ry.toFixed(3); b.objet = sp.fn; }
  const ang = b.ry != null ? Math.abs(Math.sin(2 * b.ry)) : 0, bw = b.x1 - b.x0, bdp = b.z1 - b.z0;
  const aligned = b.w != null && ((Math.abs(bw - b.w) < 0.02 && Math.abs(bdp - b.d) < 0.02) || (Math.abs(bw - b.d) < 0.02 && Math.abs(bdp - b.w) < 0.02));
  b.biais = b.via !== 'collider' && !aligned && (b.w != null || ang > 0.03); // tournée : la boîte englobante dépasse les dimensions demandées
  if (b.biais) {
    const c = Math.abs(Math.cos(b.ry || 0)), s = Math.abs(Math.sin(b.ry || 0)), hw = (b.x1 - b.x0) / 2, hd = (b.z1 - b.z0) / 2;
    if (b.w == null && Math.abs(c * c - s * s) > 0.2) { b.w = +((2 * hw * c - 2 * hd * s) / (c * c - s * s)).toFixed(2); b.d = +((2 * hd * c - 2 * hw * s) / (c * c - s * s)).toFixed(2); }
    b.angle = b.ry == null ? null : +((((b.ry * 180) / Math.PI) % 90 + 90) % 90).toFixed(0);
    if (b.w != null) b.surplus_m2 = +((b.x1 - b.x0) * (b.z1 - b.z0) - b.w * b.d).toFixed(2);
  }
}

// ─── 6. Regroupement ───
const TYPE_KIND = { 0: 'limite_invisible', 4: 'limite_invisible', 3: 'barricade', 2: 'porte', '-1': 'limite_invisible' };
const kindOf = (s) => (s.type === 'prop' ? 'objet' : s.type === 'edge' ? 'mur_fin' : s.type === 'tile' ? TYPE_KIND[s.t] || 'limite_invisible' : 'inconnu');
const groups = new Map();
// objets : une boîte = un groupe ; autres sortes : proximité < 1 m (union-find sur une grille de 1 m)
const others = A.cands.filter((c) => c.src.type !== 'prop'), par = others.map((_, i) => i), find = (i) => (par[i] === i ? i : (par[i] = find(par[i])));
{ const grid = new Map(); others.forEach((c, i) => { const k = Math.floor(c.x) + ',' + Math.floor(c.z); if (!grid.has(k)) grid.set(k, []); grid.get(k).push(i); });
  others.forEach((c, i) => { const gx = Math.floor(c.x), gz = Math.floor(c.z); for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) for (const j of grid.get(gx + a + ',' + (gz + b)) || []) if (j > i && kindOf(others[j].src) === kindOf(c.src) && Math.hypot(others[j].x - c.x, others[j].z - c.z) < 1) par[find(j)] = find(i); }); }
const oidx = new Map(others.map((c, i) => [c, i]));
for (const c of A.cands) {
  const kind = kindOf(c.src), key = c.src.type === 'prop' ? 'objet:' + c.src.i : kind + ':' + find(oidx.get(c));
  if (!groups.has(key)) groups.set(key, { key, kind, cands: [] }); groups.get(key).cands.push(c);
}
const DIRN = ['+x (est)', '+x+z', '+z (sud)', '-x+z', '-x (ouest)', '-x-z', '-z (nord)', '+x-z'];
const f2 = (v) => (v == null ? '?' : (+v).toFixed(2).replace('.', ','));
let G = [...groups.values()].map((g) => {
  const pis = new Set(g.cands.map((c) => c.pi)), n = g.cands.length;
  const x = g.cands.reduce((a, c) => a + c.x, 0) / n, z = g.cands.reduce((a, c) => a + c.z, 0) / n;
  const gaps = g.cands.map((c) => c.gap).filter((v) => v != null).sort((a, b) => a - b), rien = g.cands.filter((c) => c.gap == null).length;
  const dirs = {}; for (const c of g.cands) dirs[c.di] = (dirs[c.di] || 0) + 1; const di = +Object.entries(dirs).sort((a, b) => b[1] - a[1])[0][0];
  const reach = [...pis].some((pi) => A.pts[pi][2]);
  const out = { source: '', kind: g.kind, x: +x.toFixed(2), z: +z.toFixed(2), tuile: [Math.floor(x / 2), Math.floor(z / 2)], points: pis.size, pas: n, couverture: null, description: '',
    rien_visible: +(rien / n).toFixed(2), ecart_median_m: gaps.length ? gaps[gaps.length >> 1] : null, atteignable: reach, direction: DIRN[di], di,
    emprise: [+Math.min(...g.cands.map((c) => c.x)).toFixed(2), +Math.min(...g.cands.map((c) => c.z)).toFixed(2), +Math.max(...g.cands.map((c) => c.x)).toFixed(2), +Math.max(...g.cands.map((c) => c.z)).toFixed(2)],
    vu_devant: [...new Set(g.cands.map((c) => c.obj).filter(Boolean))].slice(0, 4),
    exemples: g.cands.slice(0, 6).map((c) => ({ x: c.x, z: c.z, dir: DIRN[c.di], ecart: c.gap })) };
  const s0 = g.cands[0].src;
  if (g.kind === 'objet') {
    const b = A.props[s0.i]; out.source = `MAP.props[${b.i}] ${b.fn}`; out.couverture = b.cov == null ? null : +b.cov.toFixed(2);
    out.boite = { x0: b.x0, x1: b.x1, z0: b.z0, z1: b.z1, y0: b.y0, y1: b.y1, mat: b.mat, creee_par: b.creee_par, via: b.via, objet: b.objet || null, ry: b.ry ?? null, w: b.w ?? null, d: b.d ?? null, biais: b.biais, angle: b.angle ?? null, surplus_m2: b.surplus_m2 ?? null };
    out.description = `Boîte n°${b.i} (${b.via}) créée par ${b.creee_par} : ${f2(b.x1 - b.x0)} × ${f2(b.z1 - b.z0)} m, h ${f2(b.y1)} m, ${b.mat} ; couverture visible ${b.cov == null ? '?' : Math.round(b.cov * 100) + ' %'}`
      + (b.biais ? ` ; objet tourné${b.angle != null ? ` de ${b.angle}°` : ''} : boîte englobante alignée sur les axes${b.w != null ? ` (${f2(b.w)} × ${f2(b.d)} m réels, ${f2(b.surplus_m2)} m² de trop)` : ''}` : '')
      + (b.cov != null && b.cov < 0.4 ? ' ; FAIBLE COUVERTURE (collision trop grande ou sans objet)' : '');
    out.cle = 'prop:' + b.i;
  } else if (g.kind === 'mur_fin') {
    const ed = [...new Map(g.cands.map((c) => [c.src.tx + ',' + c.src.tz + ',' + c.src.bit, c.src])).values()];
    out.source = `MAP.ew ${ed.slice(0, 4).map((e) => `(${e.tx},${e.tz}) bord ${e.bit ? 'sud' : 'est'}`).join(', ')}${ed.length > 4 ? '…' : ''}`;
    out.description = `Mur fin « ${s0.key} » (h ${f2(s0.h)} m${s0.see ? ', ajouré' : ''}) sur ${ed.length} bord(s) de carreau, sans maillage visible devant`;
    out.cle = 'ew:' + ed.map((e) => e.tx + ',' + e.tz + ',' + e.bit).sort()[0];
  } else if (g.kind === 'inconnu') {
    out.source = 'aucune source trouvée'; out.description = 'Pas bloqué sans boîte, mur fin ni carreau au contact (coincement entre plusieurs obstacles ?)'; out.cle = 'x:' + out.tuile;
  } else {
    const ts = [...new Map(g.cands.map((c) => [c.src.tx + ',' + c.src.tz, c.src])).values()];
    out.source = `carreaux ${ts.slice(0, 4).map((t) => `(${t.tx},${t.tz}) ${A.types[t.t] || 'hors carte'}`).join(', ')}${ts.length > 4 ? '…' : ''}`;
    out.description = g.kind === 'limite_invisible' ? `Limite de carte sans mur visible : ${ts.length} carreau(x) ${[...new Set(ts.map((t) => A.types[t.t] || 'hors carte'))].join('/')} au bord du sol praticable`
      : g.kind === 'barricade' ? `Barricade / fenêtre (T_RAMP) infranchissable par le joueur, sans rien de visible devant` : `Porte (T_DOOR) fermée sans maillage visible`;
    out.cle = g.kind + ':' + ts.map((t) => t.tx + ',' + t.tz).sort()[0];
  }
  // Point de vue : derrière le point du groupe le plus proche du centre, regard dans la direction bloquée.
  const d = [Math.cos((di * Math.PI) / 4), Math.sin((di * Math.PI) / 4)], rep = g.cands.filter((c) => c.di === di).sort((a, b) => Math.hypot(a.x - x, a.z - z) - Math.hypot(b.x - x, b.z - z))[0];
  out.vue_depuis = { x: rep.x, z: rep.z, d }; out.marques = g.cands.slice(0, 400).map((c) => [c.x, c.z, c.di]);
  return out;
});
G.sort((a, b) => b.points - a.points || b.pas - a.pas);
G.forEach((g, i) => (g.rang = i + 1));

// ─── Captures des groupes les plus graves (4 vues : [x, z, cap, inclinaison] comme photo.mjs) ───
fs.mkdirSync(path.join(dir, 'shots'), { recursive: true }); fs.mkdirSync(path.join(dir, 'results'), { recursive: true });
await page.evaluate(() => { delete window.__MU; }); // index des triangles libéré avant les rendus (le rendu logiciel occupe déjà près de 2 Go)
const shots = G.slice(0, NSHOT);
for (let k = 0; k < shots.length; k++) {
  const g = shots[k];
  const res = await page.evaluate(([g, label]) => {
    const { THREE, P, R, MAP } = SP, TILE = 2;
    const free = (x, z) => SP.isTrench(SP.tileOf(x), SP.tileOf(z)) && !MAP.props.some((b) => !b.off && b.y1 > 0.3 && x > b.x0 - 0.3 && x < b.x1 + 0.3 && z > b.z0 - 0.3 && z < b.z1 + 0.3);
    // Vue dégagée : pas de mur fin ni de carreau bloquant entre la caméra et le point (sinon on filmerait le mur).
    const W = SP.MAPW(), wall = (ax, az, bx, bz) => (bx > ax ? MAP.ew[az * W + ax] & 1 : bx < ax ? MAP.ew[az * W + bx] & 1 : bz > az ? MAP.ew[az * W + ax] & 2 : bz < az ? MAP.ew[bz * W + ax] & 2 : 0);
    const clear = (x0, z0, x1, z1) => { let px = SP.tileOf(x0), pz = SP.tileOf(z0); for (let t = 0; t <= 1.0001; t += 0.05) { const x = x0 + (x1 - x0) * t, z = z0 + (z1 - z0) * t, tx = SP.tileOf(x), tz = SP.tileOf(z); if (!SP.isTrench(tx, tz)) return false; if (tx !== px && wall(px, pz, tx, pz)) return false; if (tz !== pz && wall(tx, pz, tx, tz)) return false; px = tx; pz = tz; } return true; };
    const { x: rx, z: rz, d } = g.vue_depuis; let cx = rx, cz = rz;
    for (const back of [3.2, 2.6, 2.0, 1.4, 0.8, 0]) { const x = rx - d[0] * back, z = rz - d[1] * back; if ((free(x, z) && clear(x, z, rx, rz)) || back === 0) { cx = x; cz = z; break; } }
    const cap = Math.atan2(-d[0], -d[1]), incl = -0.32;
    // Marques : pas bloqués (pastille rouge + trait dans la direction), boîte d'obstacle en rouge.
    const mk = new THREE.Group(); R.scene.add(mk);
    const red = new THREE.MeshBasicMaterial({ color: 0xff1a1a }), lines = [], m4 = new THREE.Matrix4();
    const dots = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.08, 0.08, 0.05, 10), red, g.marques.length); mk.add(dots); // une seule pastille instanciée
    g.marques.forEach(([x, z, di], k) => { dots.setMatrixAt(k, m4.makeTranslation(x, SP.groundAt(x, z) + 0.05, z)); const a = (di * Math.PI) / 4; lines.push(x, 0.06, z, x + Math.cos(a) * 0.3, 0.06, z + Math.sin(a) * 0.3); });
    const lg = new THREE.BufferGeometry(); lg.setAttribute('position', new THREE.Float32BufferAttribute(lines, 3)); mk.add(new THREE.LineSegments(lg, new THREE.LineBasicMaterial({ color: 0xff1a1a })));
    if (g.boite) {
      const b = g.boite, bx = new THREE.BoxGeometry(b.x1 - b.x0, b.y1 - b.y0, b.z1 - b.z0), c = [(b.x0 + b.x1) / 2, (b.y0 + b.y1) / 2, (b.z0 + b.z1) / 2];
      const e = new THREE.LineSegments(new THREE.EdgesGeometry(bx), new THREE.LineBasicMaterial({ color: 0xff3030 })); e.position.set(...c); mk.add(e);
      const f = new THREE.Mesh(bx, new THREE.MeshBasicMaterial({ color: 0xff2020, transparent: true, opacity: 0.1, depthWrite: false })); f.position.set(...c); mk.add(f);
      // liseré au sol et montants aux coins (les traits WebGL ne font qu'un pixel)
      const W = b.x1 - b.x0, Dz = b.z1 - b.z0, rib = (x, z, w, d) => { const r = new THREE.Mesh(new THREE.BoxGeometry(w, 0.03, d), red); r.position.set(x, b.y0 + 0.03, z); mk.add(r); };
      rib(c[0], b.z0, W, 0.06); rib(c[0], b.z1, W, 0.06); rib(b.x0, c[2], 0.06, Dz); rib(b.x1, c[2], 0.06, Dz);
      for (const [x, z] of [[b.x0, b.z0], [b.x1, b.z0], [b.x0, b.z1], [b.x1, b.z1]]) { const r = new THREE.Mesh(new THREE.BoxGeometry(0.04, b.y1 - b.y0, 0.04), red); r.position.set(x, c[1], z); mk.add(r); }
    }
    const cw = 640, ch = 360, mc = document.createElement('canvas'); mc.width = cw * 2; mc.height = ch * 2; const c2 = mc.getContext('2d');
    // 3 vues comme photo.mjs (cap, cap ± 0,5) ; la 4e (au lieu de « derrière », qui ne montre pas l'obstacle) recule de 3 m de plus si possible.
    let fx = cx, fz = cz; for (const more of [3, 2, 1]) { const x = cx - d[0] * more, z = cz - d[1] * more; if (free(x, z) && clear(x, z, cx, cz)) { fx = x; fz = z; break; } }
    ['face', 'gauche', 'droite', 'recul'].forEach((nm, i) => {
      const yaw = cap + [0, 0.5, -0.5, 0][i], px = i === 3 ? fx : cx, pz = i === 3 ? fz : cz;
      SP.G.mode = 'playing'; P.pos.set(px, 0, pz); P.vel.set(0, 0, 0); P.yaw = yaw; P.pitch = i === 3 ? incl * 0.8 : incl; SP.updatePlayer(0.016); P.pos.set(px, P.pos.y, pz); SP.updatePlayer(0.016);
      SP.renderFrame(1); c2.drawImage(R.renderer.domElement, (i % 2) * cw, ((i / 2) | 0) * ch, cw, ch);
      c2.fillStyle = '#000b'; c2.fillRect((i % 2) * cw, ((i / 2) | 0) * ch, cw, 22); c2.fillStyle = '#ff0'; c2.font = '14px monospace'; c2.fillText(`${label} · ${nm}`, (i % 2) * cw + 5, ((i / 2) | 0) * ch + 16);
    });
    R.scene.remove(mk); mk.traverse((o) => { o.geometry?.dispose(); [].concat(o.material || []).forEach((m) => m.dispose()); }); dots.dispose();
    return { url: mc.toDataURL('image/jpeg', 0.84), vue: [+cx.toFixed(2), +cz.toFixed(2), +cap.toFixed(3), incl] };
  }, [g, `#${g.rang} ${g.kind} ${g.source.slice(0, 40)} · ${g.points} pts`]);
  const f = path.join(dir, 'shots', `murs_${id}_${k}.jpg`);
  fs.writeFileSync(f, Buffer.from(res.url.split(',')[1], 'base64')); g.vue = res.vue; g.capture = path.relative(dir, f);
}
if (shots.length) await lap(`${shots.length} captures → shots/murs_${id}_*.jpg`);

// ─── Rapport ───
const graves = G.filter((g) => g.points >= MIN && g.kind !== 'inconnu');
const parSorte = {}; for (const g of G) { const s = (parSorte[g.kind] ||= { groupes: 0, points: 0 }); s.groupes++; s.points += g.points; }
const tournees = A.props.filter((b) => b.biais), faibles = A.props.filter((b) => !b.off && b.cov != null && b.cov < 0.4);
const report = {
  carte: id, date: new Date().toISOString(), parametres: { graine: seed, qualite: q, pas_points_m: PAS, ecart_m: ECART, rayon_joueur: 0.34, pas_m: 0.45, bloque_si_avance_m: 0.2, hauteurs_rayons: '0,1 à 1,6 m par 0,1 m', decalages_rayons: '-0,3 à 0,3 m par 0,075 m', min_points: MIN },
  stats: { carreaux_praticables: A.nTiles, points: A.nPts, points_atteignables: A.reach, pas: A.nSteps, pas_bloques: A.nBlocked, bloques_visibles: A.nVis, candidats: A.cands.length, groupes: G.length, groupes_graves: graves.length, par_sorte: parSorte,
    maillages: idx.meshes, triangles: idx.tris, boites: A.props.length, boites_tournees: tournees.length, surplus_boites_tournees_m2: +tournees.reduce((a, b) => a + (b.surplus_m2 || 0), 0).toFixed(1), boites_faible_couverture: faibles.length },
  groupes: G.map(({ marques, vue_depuis, di, ...g }) => g),
  boites_tournees: tournees.map((b) => ({ i: b.i, objet: b.objet || b.fn, angle: b.angle, aabb: [+(b.x1 - b.x0).toFixed(2), +(b.z1 - b.z0).toFixed(2)], reel: b.w != null ? [b.w, b.d] : null, surplus_m2: b.surplus_m2 ?? null, couverture: b.cov == null ? null : +b.cov.toFixed(2), x: +((b.x0 + b.x1) / 2).toFixed(2), z: +((b.z0 + b.z1) / 2).toFixed(2), creee_par: b.creee_par })),
  boites_faible_couverture: faibles.sort((a, b) => a.cov - b.cov).map((b) => ({ i: b.i, couverture: +b.cov.toFixed(2), x: +((b.x0 + b.x1) / 2).toFixed(2), z: +((b.z0 + b.z1) / 2).toFixed(2), taille: [+(b.x1 - b.x0).toFixed(2), +(b.z1 - b.z0).toFixed(2), b.y1], mat: b.mat, biais: b.biais, angle: b.angle ?? null, creee_par: b.creee_par })),
  erreurs_page: errors,
};
const out = path.join(dir, 'results', `murs_${id}.json`); fs.writeFileSync(out, JSON.stringify(report, null, 1));
console.log(`\n=== MURS INVISIBLES · ${id} : ${G.length} groupes (${graves.length} d'au moins ${MIN} points), ${A.cands.length} pas bloqués sans rien de visible ===`);
console.log('par sorte :', Object.entries(parSorte).map(([k, v]) => `${k} ${v.groupes} groupes / ${v.points} pts`).join(' · '));
console.log(`boîtes : ${A.props.length}, dont ${tournees.length} tournées (boîte englobante : ${report.stats.surplus_boites_tournees_m2} m² bloqués en trop) et ${faibles.length} à faible couverture (< 40 %)`);
if (tournees.length) console.log('boîtes tournées (surplus) :', [...tournees].sort((a, b) => (b.surplus_m2 || 0) - (a.surplus_m2 || 0)).slice(0, 8).map((b) => `n°${b.i} ${b.objet || b.fn} ${b.angle ?? '?'}° +${f2(b.surplus_m2)} m²`).join(' · '));
for (const g of G.slice(0, 20)) console.log(`#${String(g.rang).padStart(2)} ${g.kind.padEnd(16)} ${String(g.points).padStart(3)} pts  (${f2(g.x)}, ${f2(g.z)}) carreau ${g.tuile}  ${g.description.slice(0, 170)}${g.atteignable ? '' : ' [inaccessible]'}`);
console.log('→', path.relative(dir, out));
console.log('ERRORS', errors.length + graves.length, `(page ${errors.length}, murs invisibles ${graves.length})`); for (const e of errors.slice(0, 10)) console.log(e);
await browser.close();
