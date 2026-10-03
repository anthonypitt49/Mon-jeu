/* ═══════════════════ MOTEUR DE CARTE ═══════════════════
   Chaque carte (fichiers 20_map_*.js) décrit sa grille de carreaux de 2 m, ses points d'intérêt, son ambiance et son décor.
   Deux familles : « tranchées » (le sol des joueurs est creusé, les infectés descendent des rampes) et
   « plain-pied » (tout est au niveau du sol : bâtiments, murs fins, clôtures, fenêtres barricadées). */

const MAPS = {};
let M = null, MAP_ID = 'poste7';
let MAP_W = 40, MAP_D = 32;
const T_SOLID = 0, T_FLOOR = 1, T_DOOR = 2, T_RAMP = 3, T_BLOCK = 4;
const C_SURF = 0, C_TRENCH = 1, C_RAMP = 2, C_BLOCK = 3; // classes de déplacement des infectés
let ZONE_NAMES = [];
const STYLE_TRENCH = 0, STYLE_BUNKER = 1, STYLE_DUGOUT = 2, STYLE_YARD = 3, STYLE_CRATER = 4; // styles des tranchées (Poste 7)

const MAP = { doors: [], barricades: [], zoneActive: [], props: [], hasEdges: false };
let SPOTS = null;
const ti = (x, z) => z * MAP_W + x;
const inMap = (x, z) => x >= 0 && z >= 0 && x < MAP_W && z < MAP_D;
const tileOf = (w) => Math.floor(w / TILE);
const tcx = (x) => x * TILE + TILE / 2; // centre d'un carreau en mètres

// Carte choisie : lien (#carte=… ou ?carte=…), puis dernier choix mémorisé.
function chooseMap() {
  const hp = new URLSearchParams(location.hash.slice(1)), sp = new URLSearchParams(location.search);
  const want = hp.get('carte') || sp.get('carte') || store.get('map', 'poste7');
  MAP_ID = MAPS[want] ? want : 'poste7';
  M = MAPS[MAP_ID];
}
function allocMap(w, d) {
  MAP_W = w; MAP_D = d; const n = w * d;
  Object.assign(MAP, {
    type: new Uint8Array(n), zone: new Int8Array(n).fill(-1), roof: new Uint8Array(n), style: new Uint8Array(n),
    doorAt: new Int16Array(n).fill(-1), rampAt: new Int16Array(n).fill(-1),
    edge: new Float32Array(n), // distance (en carreaux) au sol praticable le plus proche
    ew: new Uint8Array(n), // murs fins : bit 0 = bord est, bit 1 = bord sud
    ek: new Uint8Array(n * 2), // nature de ces murs (indice dans M.walls + 1)
    doors: [], barricades: [], props: [], hasEdges: false,
  });
  FLOW.dist = new Int32Array(n).fill(-1);
}

// Construit la grille à partir de la description de la carte.
function buildMap() {
  chooseMap();
  allocMap(M.w, M.d);
  ZONE_NAMES = M.zones.slice();
  MAP.zoneActive = ZONE_NAMES.map((_, i) => i === 0);
  const styleIdx = (s) => (typeof s === 'number' ? s : Math.max(0, (M.styles || []).indexOf(s)));
  const wallIdx = (k) => { const i = (M.walls || []).findIndex((w) => w.key === k); if (i < 0) throw new Error('mur inconnu : ' + k); return i + 1; };
  const api = {
    floor(x0, z0, x1, z1, zone, style = 0, roof = 0) {
      for (let z = z0; z <= z1; z++) for (let x = x0; x <= x1; x++) { const i = ti(x, z); MAP.type[i] = T_FLOOR; MAP.zone[i] = zone; MAP.style[i] = styleIdx(style); MAP.roof[i] = roof ? 1 : 0; }
    },
    block(x0, z0, x1, z1, style = 0) {
      for (let z = z0; z <= z1; z++) for (let x = x0; x <= x1; x++) { const i = ti(x, z); MAP.type[i] = T_BLOCK; MAP.zone[i] = -1; MAP.style[i] = styleIdx(style); }
    },
    clear(x0, z0, x1, z1, style = 0) { // retour à l'extérieur (terrain des infectés)
      for (let z = z0; z <= z1; z++) for (let x = x0; x <= x1; x++) { const i = ti(x, z); MAP.type[i] = T_SOLID; MAP.zone[i] = -1; MAP.roof[i] = 0; MAP.style[i] = styleIdx(style); }
    },
    // Murs fins le long des bords de carreaux : hwall = bord nord de la rangée z (entre z-1 et z), vwall = bord ouest de la colonne x.
    hwall(z, x0, x1, kind) { const k = kind ? wallIdx(kind) : 0; for (let x = x0; x <= x1; x++) setEdge(x, z - 1, 1, k); },
    vwall(x, z0, z1, kind) { const k = kind ? wallIdx(kind) : 0; for (let z = z0; z <= z1; z++) setEdge(x - 1, z, 0, k); },
    // Contour d'un rectangle de carreaux (murs à l'extérieur du rectangle).
    box(x0, z0, x1, z1, kind) { api.hwall(z0, x0, x1, kind); api.hwall(z1 + 1, x0, x1, kind); api.vwall(x0, z0, z1, kind); api.vwall(x1 + 1, z0, z1, kind); },
    door(x, z, cost, kind, label) {
      const id = MAP.doors.length, i = ti(x, z);
      MAP.type[i] = T_DOOR; MAP.doorAt[i] = id;
      const nb = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([dx, dz]) => [x + dx, z + dz]).filter(([a, b]) => inMap(a, b) && MAP.type[ti(a, b)] === T_FLOOR && !edgeWall(x, z, a, b));
      const zones = [...new Set(nb.map(([a, b]) => MAP.zone[ti(a, b)]))];
      const axis = nb.length && nb[0][0] !== x ? 'x' : 'z'; // axe de passage
      MAP.doors.push({ id, x, z, cost, kind, label, open: false, zones, axis, anim: 0 });
      return id;
    },
    ramp(x, z, look, inward) {
      const id = MAP.barricades.length, i = ti(x, z);
      const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
      // L'intérieur : le sol praticable voisin qui n'est pas derrière un mur fin (ou la direction imposée).
      const inn = inward ? WALL_DIR[inward] : dirs.find(([dx, dz]) => inMap(x + dx, z + dz) && MAP.type[ti(x + dx, z + dz)] === T_FLOOR && !edgeWall(x, z, x + dx, z + dz));
      if (!inn) throw new Error(`barricade (${x}, ${z}) sans sol intérieur`);
      const out = [-inn[0], -inn[1]];
      MAP.type[i] = T_RAMP; MAP.rampAt[i] = id;
      const zone = MAP.zone[ti(x + inn[0], z + inn[1])];
      MAP.barricades.push({ id, x, z, dir: out, inner: [x + inn[0], z + inn[1]], outer: [x + out[0], z + out[1]], zone, planks: 6, spawns: [], cap: 0, look: look || (M.flat ? 'window' : 'ramp') });
      return id;
    },
  };
  M.grid(api);
  for (const d of MAP.doors) { const i = ti(d.x, d.z); MAP.zone[i] = d.zones[0] ?? 0; MAP.style[i] = MAP.style[ti(d.x + (d.axis === 'x' ? 1 : 0), d.z + (d.axis === 'z' ? 1 : 0))]; }
  // Points d'apparition des infectés : dehors, dans l'axe de la barricade.
  for (const b of MAP.barricades) {
    for (let k = 1; k <= 4; k++) { const sx = b.x + b.dir[0] * k, sz = b.z + b.dir[1] * k; if (inMap(sx, sz) && MAP.type[ti(sx, sz)] === T_SOLID && !edgeWall(sx - b.dir[0], sz - b.dir[1], sx, sz)) b.spawns.push([sx, sz]); else break; }
    if (!b.spawns.length) throw new Error(`barricade ${b.id} (${b.x}, ${b.z}) sans point d'apparition`);
  }
  // Plain-pied : clôture automatique entre le sol des joueurs et l'extérieur (sauf aux barricades).
  if (M.flat) for (let z = 0; z < MAP_D; z++) for (let x = 0; x < MAP_W; x++) {
    const t = MAP.type[ti(x, z)]; if (t !== T_FLOOR && t !== T_DOOR) continue;
    for (const [dx, dz, e] of [[1, 0, 0], [0, 1, 1], [-1, 0, 0], [0, -1, 1]]) {
      const a = x + dx, b = z + dz; if (!inMap(a, b) || MAP.type[ti(a, b)] !== T_SOLID || edgeWall(x, z, a, b)) continue;
      const kind = M.boundary ? M.boundary(x, z, dx, dz) : 'fence'; if (!kind) continue;
      if (dx > 0 || dz > 0) setEdge(x, z, e, wallIdx(kind)); else setEdge(a, b, e, wallIdx(kind));
    }
  }
  MAP.hasEdges = MAP.ew.some((v) => v);
  // Distance au sol praticable (pour aplanir le terrain près des bords).
  const q = []; MAP.edge.fill(99);
  for (let i = 0; i < MAP.type.length; i++) if (MAP.type[i] !== T_SOLID && MAP.type[i] !== T_BLOCK) { MAP.edge[i] = 0; q.push(i); }
  for (let h = 0; h < q.length; h++) {
    const i = q[h], x = i % MAP_W, z = (i / MAP_W) | 0;
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const a = x + dx, b = z + dz; if (!inMap(a, b)) continue; const j = ti(a, b); if (MAP.edge[j] > MAP.edge[i] + 1) { MAP.edge[j] = MAP.edge[i] + 1; q.push(j); } }
  }
  SPOTS = M.spots;
  M.setup?.();
  // Accès en pente (rive, eau) : hauteur du terrain au bord extérieur.
  for (const b of MAP.barricades) if (b.look === 'slope') b.outH = surfH(tcx(b.x) + b.dir[0] * TILE / 2, tcx(b.z) + b.dir[1] * TILE / 2);
}
function setEdge(x, z, bit, kind) {
  if (!inMap(x, z)) return; const i = ti(x, z);
  if (kind) { MAP.ew[i] |= 1 << bit; MAP.ek[i * 2 + bit] = kind; } else { MAP.ew[i] &= ~(1 << bit); MAP.ek[i * 2 + bit] = 0; }
}
// Mur fin entre deux carreaux voisins (orthogonaux) : nature + 1, ou 0.
function edgeWall(ax, az, bx, bz) {
  let x, z, bit;
  if (bx === ax + 1 && bz === az) { x = ax; z = az; bit = 0; } else if (bx === ax - 1 && bz === az) { x = bx; z = bz; bit = 0; }
  else if (bz === az + 1 && bx === ax) { x = ax; z = az; bit = 1; } else if (bz === az - 1 && bx === ax) { x = bx; z = bz; bit = 1; }
  else return 0;
  if (!inMap(x, z)) return 0;
  return MAP.ek[ti(x, z) * 2 + bit];
}
// Passage bloqué par des murs fins (diagonale : les deux chemins en L sont coupés).
function edgeBlocked(ax, az, bx, bz) {
  if (!MAP.hasEdges) return false;
  if (ax === bx || az === bz) return !!edgeWall(ax, az, bx, bz);
  return (!!edgeWall(ax, az, bx, az) || !!edgeWall(bx, az, bx, bz)) && (!!edgeWall(ax, az, ax, bz) || !!edgeWall(ax, bz, bx, bz));
}
const wallDef = (k) => M.walls[k - 1];

/* ─── Points d'intérêt ─── */
const WALL_DIR = { n: [0, -1], s: [0, 1], e: [1, 0], w: [-1, 0] };
// Position au pied d'un mur : centre du carreau décalé vers le mur.
function wallSpot(s, inset = 0.45) {
  const d = WALL_DIR[s.wall];
  return { x: tcx(s.x) + d[0] * (TILE / 2 - inset), z: tcx(s.z) + d[1] * (TILE / 2 - inset), yaw: Math.atan2(d[0], d[1]) + Math.PI, face: d };
}

/* ─── Requêtes sur la grille ─── */
const tType = (x, z) => (inMap(x, z) ? MAP.type[ti(x, z)] : T_SOLID);
// Point atteignable le plus proche (case praticable d'une zone ouverte) : objets lâchés derrière une barricade.
function reachSpot(x, z) {
  const ok = (a, b) => isTrench(a, b) && MAP.zoneActive[MAP.zone[ti(a, b)]], tx = tileOf(x), tz = tileOf(z);
  if (ok(tx, tz)) return [x, z];
  let best = null, bd = 1e9;
  for (let r = 1; r <= 12 && !best; r++) for (let b = tz - r; b <= tz + r; b++) for (let a = tx - r; a <= tx + r; a++) {
    if (Math.max(Math.abs(a - tx), Math.abs(b - tz)) !== r || !ok(a, b)) continue;
    const d = Math.hypot(tcx(a) - x, tcx(b) - z); if (d < bd) { bd = d; best = [tcx(a), tcx(b)]; }
  }
  return best || [x, z];
}
function isTrench(x, z) { if (!inMap(x, z)) return false; const i = ti(x, z), t = MAP.type[i]; return t === T_FLOOR || (t === T_DOOR && MAP.doors[MAP.doorAt[i]].open); }
function tClass(x, z) {
  if (!inMap(x, z)) return C_BLOCK;
  const i = ti(x, z), t = MAP.type[i];
  if (t === T_SOLID) return C_SURF; if (t === T_FLOOR) return C_TRENCH; if (t === T_RAMP) return C_RAMP; if (t === T_BLOCK) return C_BLOCK;
  return MAP.doors[MAP.doorAt[i]].open ? C_TRENCH : C_BLOCK;
}
// Passage orthogonal d'un carreau à l'autre pour un infecté.
function zStep(ax, az, bx, bz, planksMatter) {
  const ca = tClass(ax, az), cb = tClass(bx, bz);
  if (ca === C_BLOCK || cb === C_BLOCK) return false;
  if (MAP.hasEdges && edgeWall(ax, az, bx, bz)) return false;
  if (ca === cb) return ca !== C_RAMP;
  if (ca === C_RAMP) { const r = MAP.barricades[MAP.rampAt[ti(ax, az)]]; if (bx === r.outer[0] && bz === r.outer[1]) return true; if (bx === r.inner[0] && bz === r.inner[1]) return !planksMatter || r.planks <= 0; return false; }
  if (cb === C_RAMP) { const r = MAP.barricades[MAP.rampAt[ti(bx, bz)]]; if (ax === r.outer[0] && az === r.outer[1]) return true; if (ax === r.inner[0] && az === r.inner[1]) return !planksMatter || r.planks <= 0; return false; }
  return false;
}
function zBlocked(cx, cz, tx, tz) {
  if (tx === cx && tz === cz) return false;
  if (!inMap(tx, tz)) return true;
  if (tx === cx || tz === cz) return !zStep(cx, cz, tx, tz, true);
  const cc = tClass(cx, cz), ct = tClass(tx, tz);
  return cc === C_RAMP || ct !== cc || edgeBlocked(cx, cz, tx, tz);
}
const pBlocked = (cx, cz, tx, tz) => !isTrench(tx, tz);

// Hauteur du sol pour un infecté selon sa classe.
function rampT(r, x, z) {
  const ox = tcx(r.x) - r.dir[0] * TILE / 2, oz = tcx(r.z) - r.dir[1] * TILE / 2; // bord intérieur
  return clamp(((x - ox) * r.dir[0] + (z - oz) * r.dir[1]) / TILE, 0, 1);
}
// Plain-pied : l'infecté enjambe l'appui de la fenêtre, juste devant le bord intérieur.
const SILL_H = 0.62;
function sillH(r, t) { return r.look === 'window' ? SILL_H * smooth(clamp(1 - Math.abs(t - 0.1) / 0.2, 0, 1)) : 0; }
function groundAt(x, z) {
  const tx = tileOf(x), tz = tileOf(z), c = tClass(tx, tz);
  if (c === C_TRENCH) return M.floorH ? M.floorH(x, z) : 0;
  if (c === C_RAMP) { const r = MAP.barricades[MAP.rampAt[ti(tx, tz)]], t = rampT(r, x, z); return M.flat ? (r.look === 'slope' ? smooth(clamp((t - 0.15) / 0.85, 0, 1)) * r.outH : sillH(r, t)) : smooth(t) * WALL_H; }
  return surfH(x, z);
}

/* ─── Relief extérieur ─── */
const CRATERS = [];
function edgeAt(x, z) {
  const fx = x / TILE - 0.5, fz = z / TILE - 0.5, x0 = Math.floor(fx), z0 = Math.floor(fz), u = fx - x0, v = fz - z0;
  const e = (a, b) => { if (!inMap(a, b)) { const cx = clamp(a, 0, MAP_W - 1), cz = clamp(b, 0, MAP_D - 1); return MAP.edge[ti(cx, cz)] + Math.hypot(a - cx, b - cz); } return MAP.edge[ti(a, b)]; };
  return lerp(lerp(e(x0, z0), e(x0 + 1, z0), u), lerp(e(x0, z0 + 1), e(x0 + 1, z0 + 1), u), v);
}
function surfH(x, z) {
  if (M.flat) return M.surfH ? M.surfH(x, z) : 0;
  const e = edgeAt(x, z), m = smooth(clamp((e - 0.9) / 2.2, 0, 1));
  if (m <= 0) return WALL_H;
  const out = Math.max(0, Math.max(-x, x - MAP_W * TILE, -z, z - MAP_D * TILE));
  const amp = 0.35 + clamp(out / 40, 0, 1) * 3.2;
  let h = (fbm(x * 0.045, z * 0.045, 3) - 0.5) * 2 * amp + (fbm(x * 0.21, z * 0.21, 2) - 0.5) * 0.25;
  for (const c of CRATERS) {
    const d = Math.hypot(x - c.x, z - c.z) / c.r; if (d > 1.5) continue;
    h += d < 1 ? -c.d * (1 - d * d) : c.d * 0.35 * Math.sin((d - 1) * Math.PI * 2) * (1.5 - d) * 2;
  }
  return WALL_H + h * m;
}
// Hauteur des murs pleins (T_BLOCK) et des plafonds.
const blockH = (i) => (M.blockH ? M.blockH(MAP.style[i]) : M.flat ? (M.wallH || 3.6) : WALL_H + 0.4);
const ceilH = () => (M.flat ? M.ceil || 3.0 : WALL_H);
// Hauteur sous plafond d'une pièce : le style peut la relever (nef d'église, entrepôt…).
const roomCeil = (tx, tz) => { if (!M.flat || !inMap(tx, tz)) return ceilH(); const sd = (M.styleDefs || [])[MAP.style[ti(tx, tz)]]; return (sd && sd.ceilH) || ceilH(); };

/* ─── Collisions cercle / grille / obstacles ─── */
function collideCircle(p, r, blockedFn) {
  for (let it = 0; it < 2; it++) {
    const cx = tileOf(p.x), cz = tileOf(p.z);
    for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) {
      const tx = cx + dx, tz = cz + dz;
      if (!blockedFn(cx, cz, tx, tz)) continue;
      const x0 = tx * TILE, z0 = tz * TILE;
      const qx = clamp(p.x, x0, x0 + TILE), qz = clamp(p.z, z0, z0 + TILE);
      let ddx = p.x - qx, ddz = p.z - qz; const d2 = ddx * ddx + ddz * ddz;
      if (d2 < r * r) {
        if (d2 > 1e-9) { const d = Math.sqrt(d2), k = (r - d) / d; p.x += ddx * k; p.z += ddz * k; }
        else { // centre dans le carreau : on repousse vers le centre d'origine
          ddx = tcx(cx) - p.x; ddz = tcx(cz) - p.z; const d = Math.hypot(ddx, ddz) || 1; p.x += (ddx / d) * 0.05; p.z += (ddz / d) * 0.05;
        }
      }
    }
    if (MAP.hasEdges) collideEdges(p, r);
  }
}
// Murs fins : segments épais de 0,16 m le long des bords de carreaux.
const EDGE_T = 0.08;
function collideEdges(p, r) {
  const cx = tileOf(p.x), cz = tileOf(p.z);
  for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) {
    const tx = cx + dx, tz = cz + dz; if (!inMap(tx, tz)) continue; const i = ti(tx, tz), w = MAP.ew[i]; if (!w) continue;
    for (let bit = 0; bit < 2; bit++) {
      if (!(w & (1 << bit))) continue;
      // Bord est : x = (tx+1)·T, z ∈ [tz·T, (tz+1)·T] ; bord sud : z = (tz+1)·T, x ∈ [tx·T, (tx+1)·T].
      const x0 = bit === 0 ? (tx + 1) * TILE - EDGE_T : tx * TILE - EDGE_T, x1 = bit === 0 ? (tx + 1) * TILE + EDGE_T : (tx + 1) * TILE + EDGE_T;
      const z0 = bit === 0 ? tz * TILE - EDGE_T : (tz + 1) * TILE - EDGE_T, z1 = bit === 0 ? (tz + 1) * TILE + EDGE_T : (tz + 1) * TILE + EDGE_T;
      const qx = clamp(p.x, x0, x1), qz = clamp(p.z, z0, z1), ddx = p.x - qx, ddz = p.z - qz, d2 = ddx * ddx + ddz * ddz;
      if (d2 >= r * r) continue;
      if (d2 > 1e-9) { const d = Math.sqrt(d2), k = (r - d) / d; p.x += ddx * k; p.z += ddz * k; }
      else if (bit === 0) p.x = p.x < (tx + 1) * TILE ? x0 - r : x1 + r; else p.z = p.z < (tz + 1) * TILE ? z0 - r : z1 + r;
    }
  }
}
function collideProps(p, r, y = 0, step = 0, out) {
  let hit = false;
  for (const b of MAP.props) {
    if (b.off || y + step >= b.y1 || y + 1.6 < (b.y0 || 0)) continue;
    const qx = clamp(p.x, b.x0, b.x1), qz = clamp(p.z, b.z0, b.z1), dx = p.x - qx, dz = p.z - qz, d2 = dx * dx + dz * dz;
    if (d2 < r * r) {
      hit = true; const bx = p.x, bz = p.z;
      if (d2 > 1e-9) { const d = Math.sqrt(d2), k = (r - d) / d; p.x += dx * k; p.z += dz * k; }
      else { const ex = Math.min(p.x - b.x0, b.x1 - p.x), ez = Math.min(p.z - b.z0, b.z1 - p.z); if (ex < ez) p.x = p.x - b.x0 < b.x1 - p.x ? b.x0 - r : b.x1 + r; else p.z = p.z - b.z0 < b.z1 - p.z ? b.z0 - r : b.z1 + r; }
      if (out) { out.x += p.x - bx; out.z += p.z - bz; }
    }
  }
  return hit;
}

/* ─── Champ de flux (Dijkstra multi-sources) vers les joueurs ─── */
const FLOW = { dist: new Int32Array(1).fill(-1), t: 0 };
const NB8 = [[1, 0, 10], [-1, 0, 10], [0, 1, 10], [0, -1, 10], [1, 1, 14], [1, -1, 14], [-1, 1, 14], [-1, -1, 14]];
function computeFlow(sources) {
  const dist = FLOW.dist; dist.fill(-1);
  const heap = []; // [coût, index]
  const push = (c, i) => { heap.push([c, i]); let k = heap.length - 1; while (k > 0) { const p = (k - 1) >> 1; if (heap[p][0] <= heap[k][0]) break; [heap[p], heap[k]] = [heap[k], heap[p]]; k = p; } };
  const pop = () => { const top = heap[0], last = heap.pop(); if (heap.length) { heap[0] = last; let k = 0; for (;;) { const l = 2 * k + 1, r = l + 1; let m = k; if (l < heap.length && heap[l][0] < heap[m][0]) m = l; if (r < heap.length && heap[r][0] < heap[m][0]) m = r; if (m === k) break; [heap[m], heap[k]] = [heap[k], heap[m]]; k = m; } } return top; };
  for (const [x, z] of sources) { if (!inMap(x, z)) continue; const i = ti(x, z); if (dist[i] !== 0) { dist[i] = 0; push(0, i); } }
  while (heap.length) {
    const [c, i] = pop(); if (c > dist[i] && dist[i] !== -1) continue;
    const x = i % MAP_W, z = (i / MAP_W) | 0;
    for (const [dx, dz, w] of NB8) {
      const a = x + dx, b = z + dz; if (!inMap(a, b)) continue;
      if (dx && dz) { if (zBlocked(x, z, a, b) || zBlocked(x, z, a, z) || zBlocked(x, z, x, b)) continue; }
      else if (!zStep(a, b, x, z, false)) continue; // l'infecté marche de (a,b) vers (x,z)
      const j = ti(a, b), nc = c + w;
      if (dist[j] === -1 || nc < dist[j]) { dist[j] = nc; push(nc, j); }
    }
  }
}
// Ligne de vue au sol sur la grille pour une classe donnée (poursuite directe).
function gridClear(ax, az, bx, bz, cls) {
  const dx = bx - ax, dz = bz - az, len = Math.hypot(dx, dz), steps = Math.ceil(len / 0.35);
  let px = tileOf(ax), pz = tileOf(az);
  for (let k = 1; k <= steps; k++) {
    const t = k / steps, x = ax + dx * t, z = az + dz * t;
    for (const [ox, oz] of [[0.25, 0.25], [-0.25, 0.25], [0.25, -0.25], [-0.25, -0.25]]) if (tClass(tileOf(x + ox), tileOf(z + oz)) !== cls) return false;
    if (MAP.hasEdges) { const nx = tileOf(x), nz = tileOf(z); if ((nx !== px || nz !== pz) && edgeBlocked(px, pz, nx, nz)) return false; px = nx; pz = nz; }
  }
  return true;
}

/* ─── Lancer de rayon dans le monde (balles, grenades, vue) ─── */
// phys : les clôtures et barreaux arrêtent les corps et les objets, pas les balles.
function solidAt(x, y, z, phys) {
  const tx = tileOf(x), tz = tileOf(z);
  if (!inMap(tx, tz)) return y < surfH(x, z) ? (M.groundMat || 'earth') : null;
  const i = ti(tx, tz), t = MAP.type[i];
  if (MAP.hasEdges && MAP.ew.length) { const m = edgeSolid(x, y, z, tx, tz, phys); if (m) return m; }
  if (M.flat) {
    if (t === T_SOLID) return y < surfH(x, z) ? (M.groundMat || 'earth') : null;
    if (t === T_BLOCK) return y < blockH(i) ? (M.blockMat ? M.blockMat(MAP.style[i]) : 'concrete') : null;
    if (t === T_RAMP) {
      const r = MAP.barricades[MAP.rampAt[i]], rt = rampT(r, x, z);
      if (r.look === 'slope') return y < smooth(clamp((rt - 0.15) / 0.85, 0, 1)) * r.outH - 0.02 ? (M.groundMat || 'earth') : null;
      if (y < sillH(r, rt) - 0.02 || y < 0) return 'wood';
      if (r.look === 'window' && rt < 0.08 && (y < SILL_H || y > 2.25) && y < ceilH() + 0.3) return M.wallMat || 'concrete';
      return null;
    }
    if (t === T_DOOR) { const d = MAP.doors[MAP.doorAt[i]]; if (!d.open && y < WALL_H && y >= 0) return doorMat(d); if (d.lintel && y > WALL_H - 0.05 && y < d.lintel) return M.wallMat || 'concrete'; }
    if (y < 0) return M.floorMat ? M.floorMat(MAP.style[i]) : 'concrete';
    if (MAP.roof[i]) { const ch = roomCeil(tx, tz); if (y > ch - 0.05 && y < ch + 0.4) return M.ceilMat || 'wood'; }
    return null;
  }
  if (t === T_SOLID) return y < WALL_H + (MAP.edge[i] > 1 ? surfH(x, z) - WALL_H : 0) ? (MAP.style[i] === STYLE_BUNKER ? 'concrete' : 'earth') : null;
  if (t === T_BLOCK) return y < blockH(i) ? 'concrete' : null;
  if (t === T_RAMP) { const r = MAP.barricades[MAP.rampAt[i]]; return y < smooth(rampT(r, x, z)) * WALL_H - 0.02 ? 'earth' : null; }
  if (t === T_DOOR && !MAP.doors[MAP.doorAt[i]].open) return y < WALL_H ? doorMat(MAP.doors[MAP.doorAt[i]]) : null;
  if (y < (M.floorH ? M.floorH(x, z) : 0)) return MAP.style[i] === STYLE_BUNKER ? 'concrete' : MAP.style[i] === STYLE_CRATER ? 'earth' : 'wood';
  if (MAP.roof[i] && y > WALL_H - 0.12 && y < WALL_H + 0.5) return MAP.style[i] === STYLE_BUNKER ? 'concrete' : 'metal';
  return null;
}
const doorMat = (d) => (d.kind === 'steel' || d.kind === 'bars' ? 'metal' : d.kind === 'rubble' ? 'concrete' : 'wood');
function edgeSolid(x, y, z, tx, tz, phys) {
  const fx = x - tx * TILE, fz = z - tz * TILE, T = EDGE_T + 0.02;
  const test = (ax, az, bx, bz) => { const k = edgeWall(ax, az, bx, bz); if (!k) return null; const w = wallDef(k); if (y >= w.h || y < (w.y0 || 0) || (w.see && !phys)) return null; return w.mat || 'concrete'; };
  let m = null;
  if (fx > TILE - T) m = test(tx, tz, tx + 1, tz); if (!m && fx < T) m = test(tx - 1, tz, tx, tz);
  if (!m && fz > TILE - T) m = test(tx, tz, tx, tz + 1); if (!m && fz < T) m = test(tx, tz - 1, tx, tz);
  return m;
}
const _rh = { dist: 0, point: new THREE.Vector3(), normal: new THREE.Vector3(), mat: null, prop: null };
function rayWorld(o, d, maxDist) {
  const step = 0.1; let prev = 0;
  for (let s = step; s <= maxDist; s += step) {
    const x = o.x + d.x * s, y = o.y + d.y * s, z = o.z + d.z * s;
    const m = solidAt(x, y, z);
    if (m) {
      let lo = prev, hi = s; // affinage dichotomique
      for (let k = 0; k < 6; k++) { const mid = (lo + hi) / 2; if (solidAt(o.x + d.x * mid, o.y + d.y * mid, o.z + d.z * mid)) hi = mid; else lo = mid; }
      const px = o.x + d.x * lo, py = o.y + d.y * lo, pz = o.z + d.z * lo, hx = o.x + d.x * hi, hy = o.y + d.y * hi, hz = o.z + d.z * hi;
      _rh.dist = lo; _rh.point.set(px, py, pz); _rh.mat = m; _rh.prop = null;
      // Normale : l'axe qu'il suffit de « reculer » pour sortir de la matière (murs fins compris).
      const fx = !solidAt(px, hy, hz), fz = !solidAt(hx, hy, pz), fy = !solidAt(hx, py, hz);
      let ax = -1, av = -1;
      if (fx && Math.abs(d.x) > av) { ax = 0; av = Math.abs(d.x); }
      if (fz && Math.abs(d.z) > av) { ax = 2; av = Math.abs(d.z); }
      if (fy && Math.abs(d.y) > av) { ax = 1; av = Math.abs(d.y); }
      if (ax === 0 || (ax < 0 && tileOf(px) !== tileOf(hx))) _rh.normal.set(-Math.sign(d.x), 0, 0);
      else if (ax === 2 || (ax < 0 && tileOf(pz) !== tileOf(hz))) _rh.normal.set(0, 0, -Math.sign(d.z));
      else _rh.normal.set(0, py > hy ? 1 : -1, 0);
      return rayProps(o, d, lo) || _rh;
    }
    prev = s;
  }
  return rayProps(o, d, maxDist);
}
function rayProps(o, d, maxDist) {
  let best = null, bd = maxDist;
  for (const b of MAP.props) {
    if (b.off || b.noRay) continue;
    let t0 = 0, t1 = bd, nAxis = -1, nSign = 0;
    const lo = [b.x0, b.y0 || 0, b.z0], hi = [b.x1, b.y1, b.z1], oo = [o.x, o.y, o.z], dd = [d.x, d.y, d.z];
    let ok = true;
    for (let a = 0; a < 3; a++) {
      if (Math.abs(dd[a]) < 1e-8) { if (oo[a] < lo[a] || oo[a] > hi[a]) { ok = false; break; } continue; }
      let ta = (lo[a] - oo[a]) / dd[a], tb = (hi[a] - oo[a]) / dd[a], s = -1; if (ta > tb) { [ta, tb] = [tb, ta]; s = 1; }
      if (ta > t0) { t0 = ta; nAxis = a; nSign = s; } t1 = Math.min(t1, tb); if (t0 > t1) { ok = false; break; }
    }
    if (ok && t0 > 0 && t0 < bd) { bd = t0; best = b; best._n = [nAxis, nSign]; }
  }
  if (!best) return null;
  _rh.dist = bd; _rh.point.set(o.x + d.x * bd, o.y + d.y * bd, o.z + d.z * bd); _rh.mat = best.mat || 'wood'; _rh.prop = best;
  _rh.normal.set(0, 0, 0); if (best._n[0] >= 0) _rh.normal.setComponent(best._n[0], best._n[1]);
  return _rh;
}
// Hauteur d'appui (caisses, banquettes) sous un cercle.
function propSupport(p, r, y, step) {
  let g = M.floorH ? M.floorH(p.x, p.z) : 0;
  for (const b of MAP.props) { if (b.off || b.y1 > y + step || b.y1 <= g) continue; if (p.x + r * 0.5 < b.x0 || p.x - r * 0.5 > b.x1 || p.z + r * 0.5 < b.z0 || p.z - r * 0.5 > b.z1) continue; g = b.y1; }
  return g;
}
function lineClear(a, b) { _v3.subVectors(b, a); const L = _v3.length(); if (L < 0.01) return true; _v3.divideScalar(L); const h = rayWorld(a, _v3, L); return !h; }

// Zones actives (atteignables depuis la zone de départ par des portes ouvertes).
function refreshZones() {
  const act = ZONE_NAMES.map((_, i) => i === 0); let changed = true;
  while (changed) { changed = false; for (const d of MAP.doors) if (d.open && d.zones.some((z) => act[z])) for (const z of d.zones) if (!act[z]) { act[z] = true; changed = true; } }
  MAP.zoneActive = act;
}
// Accroches de carte (règles propres à chaque carte).
const mapHook = (name, ...a) => (M && M.hooks && M.hooks[name] ? M.hooks[name](...a) : undefined);
