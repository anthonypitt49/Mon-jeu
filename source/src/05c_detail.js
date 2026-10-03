/* ═══════════════════ DÉTAILS DE SURFACE : semis au sol et salissures ═══════════════════
   Semis : touffes d'herbe, cailloux, feuilles, papiers, gravats… instanciés (un appel de dessin par sorte).
   Salissures : coulures, taches d'eau, fissures, suie, mousse, huile, sang… peintes dans un atlas et collées
   en quadrilatères sur les murs et les sols (un seul appel de dessin pour toute la carte). */

/* ─── Semis ─── */
const ni = (g) => (g.index ? g.toNonIndexed() : g);
function scatterGeo(kind) {
  const parts = [];
  const tint = (g, top, bot) => { const p = g.attributes.position, c = []; let y0 = Infinity, y1 = -Infinity; for (let i = 0; i < p.count; i++) { y0 = Math.min(y0, p.getY(i)); y1 = Math.max(y1, p.getY(i)); } for (let i = 0; i < p.count; i++) { const k = (p.getY(i) - y0) / Math.max(1e-3, y1 - y0); c.push(lerp(bot, top, k), lerp(bot, top, k), lerp(bot, top, k)); } g.setAttribute('color', new THREE.Float32BufferAttribute(c, 3)); return g; };
  if (kind === 'tuft') { // brins effilés, penchés vers l'extérieur
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * TAU + rand(-0.3, 0.3), h = rand(0.14, 0.3), w = rand(0.012, 0.022), lean = rand(0.25, 0.6);
      const g = new THREE.BufferGeometry(), ox = Math.cos(a), oz = Math.sin(a), b = rand(0, 0.04);
      g.setAttribute('position', new THREE.Float32BufferAttribute([ox * b - oz * w, 0, oz * b + ox * w, ox * b + oz * w, 0, oz * b - ox * w, ox * (b + h * lean), h, oz * (b + h * lean)], 3));
      g.setAttribute('normal', new THREE.Float32BufferAttribute([0, 1, 0, 0, 1, 0, 0, 1, 0], 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 1, 0, 0.5, 1], 2));
      parts.push(tint(g, 1.25, 0.45));
    }
    return mergeGeometries(parts);
  }
  if (kind === 'scrub') { // buisson sec du désert : brindilles
    for (let i = 0; i < 9; i++) { const g = new THREE.CylinderGeometry(0.004, 0.012, rand(0.25, 0.5), 3); g.translate(0, 0.17, 0); g.rotateZ(rand(-0.9, 0.9)); g.rotateY(rand(TAU)); parts.push(tint(ni(g), 1.1, 0.6)); }
    const s = new THREE.IcosahedronGeometry(0.16, 0); s.scale(1, 0.6, 1); s.translate(0, 0.18, 0); parts.push(tint(ni(s), 1, 0.7));
    return mergeGeometries(parts);
  }
  if (kind === 'pebble' || kind === 'rock' || kind === 'clod') { const g = new THREE.DodecahedronGeometry(kind === 'rock' ? 0.22 : kind === 'clod' ? 0.12 : 0.05, 0); g.scale(1, kind === 'clod' ? 0.55 : 0.6, 1.2); g.translate(0, kind === 'rock' ? 0.05 : 0.01, 0); return tint(ni(g), 1.05, 0.75); }
  if (kind === 'leaf' || kind === 'paper' || kind === 'straw') {
    const [w, d] = kind === 'leaf' ? [0.07, 0.05] : kind === 'paper' ? [0.21, 0.29] : [0.5, 0.012];
    const g = new THREE.PlaneGeometry(w, d, 2, 1); g.rotateX(-Math.PI / 2); const p = g.attributes.position; for (let i = 0; i < p.count; i++) p.setY(i, 0.006 + Math.abs(p.getX(i)) * (kind === 'paper' ? 0.15 : 0.3) * (kind === 'straw' ? 0 : 1));
    return tint(ni(g), 1, kind === 'paper' ? 0.85 : 0.9);
  }
  if (kind === 'chip') { const g = new THREE.BoxGeometry(0.09, 0.03, 0.06); return tint(ni(g), 1, 0.8); }
  if (kind === 'bones') { for (let i = 0; i < 3; i++) { const g = new THREE.CylinderGeometry(0.015, 0.015, rand(0.18, 0.32), 5); g.rotateZ(Math.PI / 2); g.rotateY(rand(TAU)); g.translate(rand(-0.08, 0.08), 0.015, rand(-0.08, 0.08)); parts.push(tint(ni(g), 1, 0.85)); } return mergeGeometries(parts); }
  throw new Error('semis inconnu : ' + kind);
}
// spec : { kind, color, n (par carreau), styles: [...] (sol praticable) | ground: [e0, e1] (terrain, distance au jeu en carreaux),
//          scale: [min, max], jitter (variation de teinte), shadow }
function scatterAll(list) {
  if (!list || !list.length) return;
  const T = TILE, W = MAP_W * T, D = MAP_D * T, styles = M.styles || [];
  for (const sp of list) {
    const geo = scatterGeo(sp.kind), mat = KM['scat' + sp.kind + sp.color] ||= stdMat({ color: 0xffffff, roughness: sp.kind === 'paper' ? 0.8 : 0.95, vertexColors: true, side: sp.kind === 'tuft' || sp.kind === 'leaf' || sp.kind === 'paper' ? THREE.DoubleSide : THREE.FrontSide }, sp.snow || 0);
    const pts = [], base = new THREE.Color(sp.color), [s0, s1] = sp.scale || [0.8, 1.25], jit = sp.jitter ?? 0.18;
    const add = (x, y, z) => pts.push([x, y, z]);
    if (sp.styles) for (let z = 0; z < MAP_D; z++) for (let x = 0; x < MAP_W; x++) {
      const t = MAP.type[ti(x, z)]; if (t !== T_FLOOR) continue; if (!sp.styles.includes(styles[MAP.style[ti(x, z)]] ?? MAP.style[ti(x, z)])) continue;
      if (sp.open && MAP.roof[ti(x, z)]) continue;
      const n = Math.floor(sp.n) + (Math.random() < sp.n % 1 ? 1 : 0);
      for (let k = 0; k < n; k++) { const px = x * T + rand(0.08, T - 0.08), pz = z * T + rand(0.08, T - 0.08); add(px, groundAt(px, pz), pz); }
    }
    if (sp.ground) { const [e0, e1] = sp.ground, area = (W + 2 * e1 * T) * (D + 2 * e1 * T), tries = Math.round(area / 4 * sp.n);
      for (let k = 0; k < tries; k++) { const px = rand(-e1 * T, W + e1 * T), pz = rand(-e1 * T, D + e1 * T), e = edgeAt(px, pz); if (e < e0 || e > e1) continue; const tx = tileOf(px), tz = tileOf(pz); if (inMap(tx, tz) && MAP.type[ti(tx, tz)] !== T_SOLID) continue; add(px, surfH(px, pz), pz); } }
    if (!pts.length) continue;
    // Qualité basse : moins d'éléments semés (le sol reste habillé) ; puis découpage en zones de 32 m (culling).
    const dens = [0.5, 0.75, 1, 1][clamp(settings.quality | 0, 0, 3)];
    const keep = dens < 1 ? pts.filter(() => Math.random() < dens) : pts;
    const tris = (geo.index ? geo.index.count : geo.attributes.position.count) / 3, cells = new Map();
    for (const p of keep) { const k = keep.length * tris > 15000 ? Math.floor(p[0] / 32) + ',' + Math.floor(p[2] / 32) : '0'; if (!cells.has(k)) cells.set(k, []); cells.get(k).push(p); }
    for (const cpts of cells.values()) scatterMesh(sp, geo, mat, cpts, s0, s1, base, jit);
  }
}
function scatterMesh(sp, geo, mat, pts, s0, s1, base, jit) {
  {
    const im = new THREE.InstancedMesh(geo, mat, pts.length), c = new THREE.Color();
    pts.forEach(([x, y, z], i) => {
      const s = rand(s0, s1); _e1.set(sp.kind === 'rock' || sp.kind === 'pebble' || sp.kind === 'clod' || sp.kind === 'chip' ? rand(-0.3, 0.3) : 0, rand(TAU), 0, 'YXZ'); _q1.setFromEuler(_e1);
      im.setMatrixAt(i, _m1.compose(_v1.set(x, y, z), _q1, _v2.set(s, s * (sp.kind === 'tuft' ? rand(0.8, 1.4) : 1), s)));
      const v = 1 + rand(-jit, jit); c.copy(base).multiplyScalar(v); if (sp.hue) c.offsetHSL(rand(-sp.hue, sp.hue), 0, 0); im.setColorAt(i, c);
    });
    im.instanceMatrix.needsUpdate = true; if (im.instanceColor) im.instanceColor.needsUpdate = true;
    im.castShadow = !!sp.shadow; im.receiveShadow = true; im.computeBoundingSphere(); im.userData.dynamic = true; R.scene.add(im);
  }
}

/* ─── Salissures ─── */
const DECAL_CELLS = { grime: 0, stain: 1, crack: 2, soot: 3, mold: 4, rust: 5, oil: 6, splash: 7, scuff: 8, blood: 9, scratch: 10, graffiti: 11, leak: 12, flake: 13, dirt: 14, drag: 15 };
let _decalAtlas = null;
function decalAtlas() {
  if (_decalAtlas) return _decalAtlas;
  const S = 1024, C = S / 4, c = makeCanvas(S), x = c.getContext('2d'), r = mulberry32(77);
  const cell = (i, fn) => { x.save(); x.translate((i % 4) * C, ((i / 4) | 0) * C); x.beginPath(); x.rect(0, 0, C, C); x.clip(); fn(x, C, r); x.restore(); };
  const blot = (cx, cy, rad, col, a, n = 26) => { for (let k = 0; k < n; k++) { const ang = r() * TAU, d = r() * rad * 0.6, rr = rad * (0.25 + r() * 0.45); const g = x.createRadialGradient(cx + Math.cos(ang) * d, cy + Math.sin(ang) * d, 0, cx + Math.cos(ang) * d, cy + Math.sin(ang) * d, rr); g.addColorStop(0, `rgba(${col},${a})`); g.addColorStop(1, `rgba(${col},0)`); x.fillStyle = g; x.fillRect(0, 0, C, C); } };
  // 0 coulures depuis le bas (bande de crasse + traînées verticales)
  cell(0, (x, C) => { const g = x.createLinearGradient(0, C, 0, 0); g.addColorStop(0, 'rgba(30,24,18,.75)'); g.addColorStop(0.35, 'rgba(30,24,18,.3)'); g.addColorStop(1, 'rgba(30,24,18,0)'); x.fillStyle = g; x.fillRect(0, 0, C, C); for (let k = 0; k < 40; k++) { const px = r() * C, h = C * (0.2 + r() * 0.7), w = 1 + r() * 4; const gg = x.createLinearGradient(0, C, 0, C - h); gg.addColorStop(0, 'rgba(25,20,15,.5)'); gg.addColorStop(1, 'rgba(25,20,15,0)'); x.fillStyle = gg; x.fillRect(px, C - h, w, h); } });
  // 1 tache d'eau : auréole aux bords plus sombres
  cell(1, (x, C) => { blot(C / 2, C / 2, C * 0.42, '60,50,35', 0.18, 30); x.strokeStyle = 'rgba(70,55,35,.35)'; x.lineWidth = 3; x.beginPath(); for (let a = 0; a <= TAU + 0.01; a += 0.15) { const rr = C * (0.36 + Math.sin(a * 5 + 1) * 0.04 + r() * 0.03); const px = C / 2 + Math.cos(a) * rr, py = C / 2 + Math.sin(a) * rr; a ? x.lineTo(px, py) : x.moveTo(px, py); } x.stroke(); });
  // 2 fissure ramifiée
  cell(2, (x, C) => { x.strokeStyle = 'rgba(20,18,16,.85)'; const crack = (px, py, a, len, w) => { if (len < 6 || w < 0.4) return; x.lineWidth = w; x.beginPath(); x.moveTo(px, py); let cx = px, cy = py; const steps = 6; for (let i = 0; i < steps; i++) { a += (r() - 0.5) * 0.9; cx += Math.cos(a) * len / steps; cy += Math.sin(a) * len / steps; x.lineTo(cx, cy); if (r() < 0.25) crack(cx, cy, a + (r() < 0.5 ? 0.8 : -0.8), len * 0.5, w * 0.6); } x.stroke(); }; crack(C * 0.1, C * 0.5, 0, C * 0.85, 2.6); });
  // 3 suie radiale
  cell(3, (x, C) => blot(C / 2, C / 2, C * 0.5, '12,10,9', 0.35, 34));
  // 4 moisissure : mouchetures vert sombre
  cell(4, (x, C) => { blot(C / 2, C * 0.4, C * 0.4, '40,52,30', 0.14, 18); for (let k = 0; k < 900; k++) { const a = r() * TAU, d = Math.pow(r(), 0.6) * C * 0.45; x.fillStyle = `rgba(${30 + r() * 20},${45 + r() * 25},${25 + r() * 10},${0.15 + r() * 0.35})`; x.fillRect(C / 2 + Math.cos(a) * d, C * 0.4 + Math.sin(a) * d, 1 + r() * 3, 1 + r() * 3); } });
  // 5 coulure de rouille depuis le haut
  cell(5, (x, C) => { for (let k = 0; k < 26; k++) { const px = C * 0.3 + r() * C * 0.4, h = C * (0.3 + r() * 0.65), w = 1 + r() * 5; const g = x.createLinearGradient(0, 0, 0, h); g.addColorStop(0, 'rgba(120,58,22,.75)'); g.addColorStop(1, 'rgba(120,58,22,0)'); x.fillStyle = g; x.fillRect(px, 0, w, h); } blot(C / 2, C * 0.08, C * 0.2, '110,52,20', 0.4, 10); });
  // 6 tache d'huile
  cell(6, (x, C) => { blot(C / 2, C / 2, C * 0.45, '8,8,10', 0.32, 30); blot(C / 2, C / 2, C * 0.22, '4,4,6', 0.4, 12); });
  // 7 éclaboussures de boue (bas)
  cell(7, (x, C) => { for (let k = 0; k < 220; k++) { const px = r() * C, py = C - Math.pow(r(), 2) * C * 0.8, s = 1 + r() * 6 * (py / C); x.fillStyle = `rgba(45,34,24,${0.2 + r() * 0.5})`; x.beginPath(); x.arc(px, py, s, 0, TAU); x.fill(); } });
  // 8 traces de pas et éraflures
  cell(8, (x, C) => { for (let k = 0; k < 7; k++) { x.save(); x.translate(C * 0.15 + k * C * 0.11, C * (0.3 + (k % 2) * 0.35)); x.rotate(-0.2 + r() * 0.4); x.fillStyle = 'rgba(40,32,24,.35)'; x.beginPath(); x.ellipse(0, 0, 9, 18, 0, 0, TAU); x.fill(); x.beginPath(); x.ellipse(0, 24, 8, 8, 0, 0, TAU); x.fill(); x.restore(); } });
  // 9 traînée de sang séché
  cell(9, (x, C) => { blot(C * 0.35, C * 0.5, C * 0.28, '70,8,6', 0.45, 18); for (let k = 0; k < 18; k++) { x.strokeStyle = `rgba(80,10,8,${0.25 + r() * 0.3})`; x.lineWidth = 2 + r() * 5; x.beginPath(); x.moveTo(C * 0.3, C * (0.35 + r() * 0.3)); x.bezierCurveTo(C * 0.5, C * (0.3 + r() * 0.4), C * 0.7, C * (0.3 + r() * 0.4), C * (0.75 + r() * 0.2), C * (0.4 + r() * 0.2)); x.stroke(); } for (let k = 0; k < 80; k++) { x.fillStyle = 'rgba(90,10,8,.6)'; x.beginPath(); x.arc(r() * C, r() * C, r() * 3, 0, TAU); x.fill(); } });
  // 10 marques de jours (bâtons gravés)
  cell(10, (x, C) => { x.strokeStyle = 'rgba(230,226,215,.55)'; x.lineWidth = 2.5; for (let g = 0; g < 6; g++) { const ox = C * 0.08 + (g % 3) * C * 0.3, oy = C * 0.15 + ((g / 3) | 0) * C * 0.42; for (let k = 0; k < 4; k++) { x.beginPath(); x.moveTo(ox + k * 12 + r() * 2, oy); x.lineTo(ox + k * 12 + r() * 3, oy + C * 0.25); x.stroke(); } x.beginPath(); x.moveTo(ox - 6, oy + C * 0.2); x.lineTo(ox + 48, oy + C * 0.05); x.stroke(); } });
  // 11 griffonnages
  cell(11, (x, C) => { x.strokeStyle = 'rgba(25,25,28,.6)'; x.lineWidth = 3; x.lineCap = 'round'; for (let k = 0; k < 5; k++) { x.beginPath(); let px = C * 0.1 + r() * C * 0.2, py = C * (0.2 + k * 0.15); x.moveTo(px, py); for (let i = 0; i < 12; i++) { px += 6 + r() * 14; py += (r() - 0.5) * 16; x.lineTo(px, py); } x.stroke(); } });
  // 12 fuite : flaque sombre et brillante
  cell(12, (x, C) => { blot(C / 2, C / 2, C * 0.46, '16,18,20', 0.4, 26); });
  // 13 peinture écaillée
  cell(13, (x, C) => { for (let k = 0; k < 60; k++) { x.fillStyle = `rgba(${60 + r() * 30},${55 + r() * 25},${50 + r() * 20},${0.35 + r() * 0.4})`; x.beginPath(); const px = C / 2 + (r() - 0.5) * C * 0.8, py = C / 2 + (r() - 0.5) * C * 0.8; x.moveTo(px, py); for (let i = 0; i < 5; i++) x.lineTo(px + (r() - 0.5) * 26, py + (r() - 0.5) * 20); x.fill(); } });
  // 14 terre (salissure diffuse)
  cell(14, (x, C) => blot(C / 2, C / 2, C * 0.48, '50,40,28', 0.16, 40));
  // 15 traînée (quelqu'un a été traîné)
  cell(15, (x, C) => { for (let k = 0; k < 10; k++) { x.strokeStyle = `rgba(60,12,8,${0.15 + r() * 0.25})`; x.lineWidth = 4 + r() * 10; x.beginPath(); x.moveTo(C * 0.05, C * (0.4 + r() * 0.2)); x.lineTo(C * 0.95, C * (0.42 + r() * 0.16)); x.stroke(); } });
  const tex = toTex(c, { repeat: false }); tex.premultiplyAlpha = false;
  _decalAtlas = new THREE.MeshStandardMaterial({ map: tex, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3, roughness: 0.85, vertexColors: true, name: 'salissures' });
  _decalAtlas.userData.scale = 1;
  return _decalAtlas;
}
// Colle une salissure (cellule de l'atlas) centrée en (x,y,z) sur une surface de normale n.
function decal(q, cell, x, y, z, nx, ny, nz, w, h, rot = 0, tint = 1) {
  const ci = typeof cell === 'number' ? cell : DECAL_CELLS[cell];
  const u0 = (ci % 4) / 4 + 0.002, v1 = 1 - ((ci / 4) | 0) / 4 - 0.002, u1 = u0 + 0.246, v0 = v1 - 0.246;
  // repère tangent : « haut » = +y pour les murs, -z pour les sols
  let ux = 0, uy = 1, uz = 0; if (Math.abs(ny) > 0.7) { ux = 0; uy = 0; uz = -1; }
  let rx = uy * nz - uz * ny, ry = uz * nx - ux * nz, rz = ux * ny - uy * nx; const rl = Math.hypot(rx, ry, rz) || 1; rx /= rl; ry /= rl; rz /= rl;
  if (rot) { const c = Math.cos(rot), s = Math.sin(rot); const ax = rx * c + ux * s, ay = ry * c + uy * s, az = rz * c + uz * s, bx = -rx * s + ux * c, by = -ry * s + uy * c, bz = -rz * s + uz * c; rx = ax; ry = ay; rz = az; ux = bx; uy = by; uz = bz; }
  const o = 0.006, cx = x + nx * o, cy = y + ny * o, cz = z + nz * o, hw = w / 2, hh = h / 2;
  const P = (a, b) => [cx + rx * a + ux * b, cy + ry * a + uy * b, cz + rz * a + uz * b];
  q.quad([P(-hw, -hh), P(hw, -hh), P(hw, hh), P(-hw, hh)], [nx, ny, nz], [[u0, v0], [u1, v0], [u1, v1], [u0, v1]], [tint, tint, tint, tint]);
}
// Passe automatique sur une carte de plain-pied, réglée par M.decals :
// { grime, under, crack, mold, scuff, floor: { style: [[cellule, probabilité, taille], …] }, blood }
function flatDecals() {
  const cfg = M.decals; if (!cfg) return;
  const q = new QB(decalAtlas()), T = TILE, E = EDGE_T, styles = M.styles || [];
  const roofed = (x, z) => inMap(x, z) && MAP.roof[ti(x, z)] && MAP.type[ti(x, z)] !== T_SOLID && MAP.type[ti(x, z)] !== T_BLOCK;
  const open = (x, z) => inMap(x, z) && (MAP.type[ti(x, z)] === T_FLOOR || MAP.type[ti(x, z)] === T_DOOR);
  // Murs fins pleins.
  for (let z = 0; z < MAP_D; z++) for (let x = 0; x < MAP_W; x++) {
    const w = MAP.ew[ti(x, z)]; if (!w) continue;
    for (let bit = 0; bit < 2; bit++) {
      if (!(w & (1 << bit))) continue; const K = wallDef(MAP.ek[ti(x, z) * 2 + bit]); if (K.see) continue;
      const sides = [[-1, x, z], [1, bit ? x : x + 1, bit ? z + 1 : z]];
      for (const [s, tx, tz] of sides) {
        if (!open(tx, tz) && !(inMap(tx, tz) && MAP.type[ti(tx, tz)] === T_SOLID)) continue;
        const inside = roofed(tx, tz), along = rand(0.35, 1.65);
        const px = bit === 0 ? (x + 1) * T + s * (E + 0.001) : x * T + along, pz = bit === 0 ? z * T + along : (z + 1) * T + s * (E + 0.001), nx = bit === 0 ? s : 0, nz = bit === 0 ? 0 : s;
        const cx = bit === 0 ? px : x * T + 1, cz = bit === 0 ? z * T + 1 : pz; // centre du segment
        if (!inside && cfg.grime && Math.random() < cfg.grime) decal(q, 'grime', cx, 0.45, cz, nx, 0, nz, 2.05, 0.9 + rand(0, 0.5), 0, rand(0.75, 1));
        if (!inside && cfg.splash && Math.random() < cfg.splash) decal(q, 'splash', px, 0.3, pz, nx, 0, nz, rand(1, 1.6), 0.6, 0, 1);
        if (K.look === 'window' && !inside && cfg.under && Math.random() < cfg.under) decal(q, Math.random() < 0.5 ? 'rust' : 'stain', cx, 0.62, cz, nx, 0, nz, 1.0, 0.7, 0, 0.9);
        if (inside && cfg.crack && Math.random() < cfg.crack) decal(q, 'crack', px, rand(0.8, 2.2), pz, nx, 0, nz, rand(0.6, 1.2), rand(0.6, 1.1), rand(-0.6, 0.6), 1);
        if (inside && cfg.mold && Math.random() < cfg.mold) decal(q, 'mold', px, roomCeil(tx, tz) - 0.45, pz, nx, 0, nz, rand(0.7, 1.3), 0.8, 0, 1);
        if (inside && cfg.stain && Math.random() < cfg.stain) decal(q, 'stain', px, rand(1.2, 2.2), pz, nx, 0, nz, rand(0.5, 0.9), rand(0.5, 0.9), rand(TAU), 1);
        if (inside && cfg.scuff && Math.random() < cfg.scuff) decal(q, 'flake', px, rand(0.3, 1.4), pz, nx, 0, nz, rand(0.4, 0.8), rand(0.3, 0.6), rand(TAU), 1);
        if (cfg.graffiti && Math.random() < cfg.graffiti) decal(q, cfg.graffitiCell || 'graffiti', px, rand(1.1, 1.8), pz, nx, 0, nz, rand(0.6, 0.9), rand(0.4, 0.6), rand(-0.15, 0.15), 1);
        if (cfg.blood && Math.random() < cfg.blood * 0.5) decal(q, 'blood', px, rand(0.5, 1.6), pz, nx, 0, nz, rand(0.6, 1.0), rand(0.5, 0.9), rand(TAU), 1);
      }
    }
  }
  // Faces de blocs pleins vers l'extérieur ou une pièce.
  for (let z = 0; z < MAP_D; z++) for (let x = 0; x < MAP_W; x++) {
    if (MAP.type[ti(x, z)] !== T_BLOCK) continue;
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const a = x + dx, b = z + dz; if (!open(a, b)) continue; const inside = roofed(a, b);
      const px = dx > 0 ? (x + 1) * T + 0.001 : dx < 0 ? x * T - 0.001 : x * T + 1, pz = dz > 0 ? (z + 1) * T + 0.001 : dz < 0 ? z * T - 0.001 : z * T + 1;
      if (!inside && cfg.grime && Math.random() < cfg.grime) decal(q, 'grime', px, 0.45, pz, dx, 0, dz, 2.05, 1.1, 0, 0.9);
      if (inside && cfg.crack && Math.random() < cfg.crack) decal(q, 'crack', px, rand(0.8, 2.2), pz, dx, 0, dz, 1, 0.9, rand(-0.6, 0.6), 1);
    }
  }
  // Sols.
  if (cfg.floor) for (let z = 0; z < MAP_D; z++) for (let x = 0; x < MAP_W; x++) {
    if (MAP.type[ti(x, z)] !== T_FLOOR) continue; const list = cfg.floor[styles[MAP.style[ti(x, z)]]]; if (!list) continue;
    for (const [cell, p, size = 1.2] of list) if (Math.random() < p) { const px = x * T + rand(0.4, 1.6), pz = z * T + rand(0.4, 1.6); decal(q, cell, px, groundAt(px, pz) + 0.004, pz, 0, 1, 0, size * rand(0.7, 1.3), size * rand(0.7, 1.3), rand(TAU), 1); }
  }
  const m = q.build(false); if (m) { m.renderOrder = 2; m.userData.dynamic = true; }
}
