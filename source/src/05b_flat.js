/* ═══════════════════ CARTES DE PLAIN-PIED : sols, murs, bâtiments, fenêtres barricadées ═══════════════════
   Les matières sont peintes à la demande (seules celles de la carte chargée coûtent du temps au démarrage). */

const FT = {};
// Texture peinte au pixel (avec relief), mise en cache par nom.
function ftex(key) {
  if (FT[key]) return FT[key];
  const S = Math.min(512, Q.texSize), n = (u, v, f, o = 4) => tfbm(u * f, v * f, f, o);
  const def = FLAT_TEX[key]; if (!def) throw new Error('texture inconnue : ' + key);
  const p = def.canvas ? def.canvas(S, n) : paint(S, (u, v, x, y) => def.px(u, v, n, x, y, S));
  if (def.post) def.post(p.ctx, S);
  const t = matSet(p, def.relief ?? 2);
  if (def.alpha) { t.map = toTex(p.canvas); t.map.premultiplyAlpha = false; }
  return (FT[key] = t);
}
// Peinture sur toile 2D, relief tiré de la luminosité.
function canvasPaint(S, draw) {
  const c = makeCanvas(S), ctx = c.getContext('2d'); draw(ctx, S);
  const d = ctx.getImageData(0, 0, S, S).data, height = new Float32Array(S * S);
  for (let i = 0; i < S * S; i++) height[i] = (d[i * 4] * 0.3 + d[i * 4 + 1] * 0.55 + d[i * 4 + 2] * 0.15) / 255;
  return { canvas: c, ctx, height, size: S };
}
const FLAT_TEX = {
  // Brique rouge : rangs décalés, joints de mortier, briques de teintes variées. (1 m de côté)
  brick: { relief: 3, px(u, v, n) {
    const rows = 13, r = Math.floor(v * rows), fv = v * rows - r, cols = 4.5, fu0 = u * cols + (r % 2) * 0.5, c = Math.floor(fu0), fu = fu0 - c;
    const mortar = fv < 0.13 || fu < 0.045; const h = hash2(c + r * 17, r), g = n(u, v, 16, 3);
    if (mortar) { const m = 0.55 + g * 0.1; return [m, m * 0.96, m * 0.9, 0.1]; }
    const w = 0.42 + h * 0.18 + g * 0.12 - (hash2(c * 3, r * 7) > 0.9 ? 0.12 : 0);
    return [w * 1.25, w * 0.55, w * 0.42, 0.6 + g * 0.3];
  } },
  // Bardage à clins (blanc cassé, teinté par le matériau). (2 m)
  siding: { relief: 4, px(u, v, n) {
    const rows = 12, r = Math.floor(v * rows), fv = v * rows - r, g = n(u * 0.3, v * 4, 8, 3), streak = tnoise(u * 90, v * 4, 90);
    const shade = 0.72 + fv * 0.28 - (fv < 0.08 ? 0.35 : 0), dirt = Math.max(0, n(u, v, 3, 3) - 0.55) * 0.5;
    const w = (0.9 + g * 0.08 + streak * 0.03 - dirt) * shade;
    return [w, w, w * 0.98, fv * 0.8 + g * 0.2];
  } },
  // Enduit intérieur (teinté). (2 m)
  plaster: { relief: 1, px(u, v, n) { const g = n(u, v, 6, 3), f = n(u + 3, v, 30, 2); const w = 0.86 + g * 0.08 + f * 0.04 - Math.max(0, 0.08 - v) * 2; return [w, w, w, g * 0.5 + f * 0.5]; } },
  // Papier peint années 50 : étoiles atomiques et losanges. (1,2 m)
  wallpaper: { relief: 0.6, canvas(S) { return canvasPaint(S, (x) => {
    x.fillStyle = '#e9e0c8'; x.fillRect(0, 0, S, S);
    const k = S / 4; x.strokeStyle = 'rgba(120,90,60,.35)'; x.lineWidth = S / 180;
    for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) {
      const cx = i * k + (j % 2) * k / 2 + k / 4, cy = j * k + k / 2;
      x.beginPath(); x.moveTo(cx, cy - k * 0.3); x.lineTo(cx + k * 0.2, cy); x.lineTo(cx, cy + k * 0.3); x.lineTo(cx - k * 0.2, cy); x.closePath(); x.stroke();
      x.fillStyle = 'rgba(190,110,70,.45)'; for (let a = 0; a < 8; a++) { x.save(); x.translate(cx + k * 0.5, cy + k * 0.05); x.rotate((a / 8) * TAU); x.fillRect(0, -S / 400, k * 0.12, S / 200); x.restore(); }
    }
    for (let i = 0; i < 900; i++) { x.fillStyle = `rgba(80,60,40,${rng() * 0.05})`; x.fillRect(rng() * S, rng() * S, 3, 3); }
  }); } },
  // Blocs de pierre (pénitencier). (2 m)
  stone: { relief: 3, px(u, v, n) {
    const rows = 5, r = Math.floor(v * rows), fv = v * rows - r, cols = 3, fu0 = u * cols + (r % 2) * 0.5 + hash2(r, 3) * 0.2, c = Math.floor(fu0), fu = fu0 - c;
    const joint = fv < 0.05 || fu < 0.025, g = n(u, v, 10, 4), h = hash2(c, r * 13);
    if (joint) return [0.22, 0.22, 0.23, 0.05];
    const w = 0.4 + h * 0.1 + g * 0.2 - Math.max(0, n(u, v * 0.3, 4, 2) - 0.6) * 0.4;
    return [w * 0.98, w * 0.97, w * 0.95, 0.5 + g * 0.5];
  } },
  // Béton peint en deux tons (bas vert-de-gris, haut crème) : v = hauteur sur 3 m.
  cellPaint: { relief: 1.5, px(u, v, n) {
    const y = (1 - v) * 3, g = n(u, v, 8, 3), chip = Math.max(0, n(u, v, 18, 3) - 0.68) * 3;
    const low = y < 1.25, band = Math.abs(y - 1.25) < 0.04;
    let c = low ? [0.3, 0.38, 0.33] : [0.78, 0.74, 0.62];
    if (band) c = [0.14, 0.16, 0.14];
    const w = 0.88 + g * 0.18, grime = Math.max(0, 0.5 - y) * 0.5;
    return [lerp(c[0] * w, 0.45, chip) - grime * 0.2, lerp(c[1] * w, 0.44, chip) - grime * 0.2, lerp(c[2] * w, 0.42, chip) - grime * 0.2, 0.6 - chip * 0.4 + g * 0.2];
  } },
  // Roche de caverne. (4 m)
  rock: { relief: 4, px(u, v, n) {
    const b = n(u, v, 4, 5), c = n(u + 5, v * 2, 10, 4), st = tnoise(u * 24, v * 24, 24);
    const strata = Math.sin(v * TAU * 7 + b * 5) * 0.5 + 0.5, w = 0.26 + b * 0.2 + c * 0.1 + strata * 0.05;
    return [w * 1.1, w * 0.95, w * 0.8, b * 0.6 + c * 0.3 + (st > 0.8 ? 0.2 : 0)];
  } },
  // Planches verticales délavées (Far West). (2 m)
  westPlank: { relief: 3, px(u, v, n) {
    const cols = 9, c = Math.floor(u * cols), fu = u * cols - c, gap = fu < 0.04, g = n(u * 3 + hash2(c, 1), v * 0.4, 8, 3), streak = tnoise(u * 120, v * 3, 120);
    if (gap) return [0.05, 0.04, 0.03, 0];
    const w = 0.3 + hash2(c, 5) * 0.12 + g * 0.16 + streak * 0.06, nail = Math.abs(v - 0.1) < 0.008 && Math.abs(fu - 0.5) < 0.04 ? 1 : 0;
    return nail ? [0.1, 0.09, 0.08, 0.2] : [w * 1.05, w * 0.88, w * 0.7, 0.55 + g * 0.3];
  } },
  // Carrelage mural blanc (douches, cuisine). (1 m)
  tileWall: { relief: 2, px(u, v, n) { const k = 8, fu = (u * k) % 1, fv = (v * k) % 1, j = fu < 0.05 || fv < 0.05, g = n(u, v, 6, 2); if (j) return [0.42, 0.42, 0.4, 0.1]; const w = 0.84 + g * 0.08 - hash2(Math.floor(u * k), Math.floor(v * k)) * 0.06; return [w, w, w * 0.98, 0.7]; } },
  // Damier noir et blanc (sol de cuisine, de salle). (1 m)
  checker: { relief: 1, px(u, v, n) { const k = 4, a = (Math.floor(u * k) + Math.floor(v * k)) % 2, g = n(u, v, 8, 3), fu = (u * k) % 1, fv = (v * k) % 1, j = fu < 0.02 || fv < 0.02; const w = a ? 0.82 + g * 0.08 : 0.12 + g * 0.06; return j ? [0.35, 0.35, 0.33, 0.2] : [w, w, w * 0.97, 0.6]; } },
  // Asphalte : granulats, rustines. (4 m)
  asphalt: { relief: 2.5, px(u, v, n) { const g = n(u, v, 16, 4), s = hash2(u * 5000, v * 5000), patch = n(u, v, 3, 2) > 0.6 ? 0.04 : 0; const w = 0.17 + g * 0.08 + (s > 0.93 ? 0.1 : 0) - patch; return [w, w, w * 1.03, g * 0.6 + (s > 0.93 ? 0.4 : 0)]; } },
  // Dalles de trottoir. (2 m)
  sidewalk: { relief: 2, px(u, v, n) { const k = 2, fu = (u * k) % 1, fv = (v * k) % 1, j = fu < 0.012 || fv < 0.012, g = n(u, v, 12, 3), crack = Math.abs(n(u, v, 5, 3) - 0.5) < 0.006 ? 1 : 0; const w = 0.62 + g * 0.1 - crack * 0.25; return j ? [0.35, 0.34, 0.32, 0] : [w, w * 0.98, w * 0.94, 0.6 + g * 0.3]; } },
  // Gazon synthétique (fibres). (2 m)
  lawn: { relief: 1.5, px(u, v, n, x, y, S) { const f = hash2(x * 7 + 1, y * 13 + 7), g = n(u, v, 6, 3); const w = 0.3 + g * 0.12 + f * 0.15; return [w * 0.35, w * 1.1, w * 0.3, f]; } },
  // Sable du désert, ridé par le vent. (6 m)
  sand: { relief: 2, px(u, v, n) { const g = n(u, v, 8, 4), rip = Math.sin((u + g * 0.3) * TAU * 14) * 0.5 + 0.5, s = hash2(u * 3000, v * 3000); const w = 0.72 + g * 0.12 + rip * 0.04 + (s > 0.97 ? -0.15 : 0); return [w * 1.02, w * 0.84, w * 0.62, rip * 0.4 + g * 0.6]; } },
  // Parquet. (2 m)
  parquet: { relief: 2, px(u, v, n) { const rows = 10, r = Math.floor(v * rows), fv = v * rows - r, off = hash2(r, 2), fu0 = u * 2 + off, c = Math.floor(fu0), fu = fu0 - c, j = fv < 0.05 || fu < 0.01, g = n(u * 0.4 + off, v * 6, 8, 3), streak = tnoise(u * 60 + off * 9, v * 40, 60); if (j) return [0.1, 0.06, 0.04, 0]; const w = 0.36 + hash2(c, r) * 0.1 + g * 0.1 + streak * 0.05; return [w * 1.08, w * 0.74, w * 0.46, 0.6 + g * 0.3]; } },
  // Terre battue. (4 m)
  dirt: { relief: 3, px(u, v, n) { const b = n(u, v, 6, 4), c = n(u + 2, v, 22, 3), st = hash2(u * 4000, v * 4000); const w = 0.28 + b * 0.14 + c * 0.06 + (st > 0.96 ? 0.12 : 0); return [w * 1.1, w * 0.9, w * 0.68, b * 0.6 + c * 0.4]; } },
  // Béton lisse et taché (sol de prison, quais). (3 m)
  slab: { relief: 1.5, px(u, v, n) { const g = n(u, v, 5, 4), s = n(u + 4, v, 20, 3), k = 1.5, j = (u * k) % 1 < 0.008 || (v * k) % 1 < 0.008, wet = Math.max(0, n(u, v, 3, 3) - 0.55) * 1.4; const w = 0.44 + g * 0.1 + s * 0.05 - wet * 0.12 - (j ? 0.12 : 0); return [w, w * 1.01, w * 1.02, 0.5 + s * 0.3 - (j ? 0.3 : 0)]; } },
  // Bardeaux de toiture (teintés). (2 m)
  shingle: { relief: 4, px(u, v, n) { const rows = 10, r = Math.floor(v * rows), fv = v * rows - r, cols = 6, fu0 = u * cols + (r % 2) * 0.5, c = Math.floor(fu0), fu = fu0 - c, g = n(u, v, 10, 3); const w = (0.5 + hash2(c, r) * 0.15 + g * 0.12) * (0.6 + fv * 0.4) * (fu < 0.03 ? 0.5 : 1); return [w, w, w, fv]; } },
  // Grillage (canal alpha). (1 m)
  chain: { alpha: true, relief: 0.5, canvas(S) { return canvasPaint(S, (x) => {
    x.clearRect(0, 0, S, S); x.strokeStyle = 'rgba(170,175,180,1)'; x.lineWidth = Math.max(1.5, S / 110);
    const k = S / 8; for (let i = -8; i < 16; i++) { x.beginPath(); x.moveTo(i * k, 0); x.lineTo(i * k + S, S); x.stroke(); x.beginPath(); x.moveTo(i * k, S); x.lineTo(i * k + S, 0); x.stroke(); }
  }); } },
};
const FMATS = {};
// Matière d'une carte de plain-pied : clé de texture + teinte ; échelle UV en mètres par répétition.
const FLAT_SCALE = { brick: 1, siding: 2, plaster: 2, wallpaper: 1.2, stone: 2.4, cellPaint: 3, rock: 4, westPlank: 2, tileWall: 1, checker: 1, asphalt: 4, sidewalk: 2, lawn: 2, sand: 6, parquet: 2, dirt: 4, slab: 3, shingle: 2, chain: 1 };
// o.vc : couleurs par sommet (géométries construites ici) ; sans, pour les objets et les lots instanciés.
function fmat(key, color = 0xffffff, o = {}) {
  const vc = !!o.vc, k = `${key}_${color}_${o.rough ?? ''}_${o.metal ?? ''}_${o.side ?? ''}_${vc}_${o.snow ?? ''}`;
  if (FMATS[k]) return FMATS[k];
  let m;
  if (key === 'concrete') m = stdMat({ map: TEX.concrete.map, normalMap: TEX.concrete.normalMap, roughness: o.rough ?? 0.93, color, vertexColors: vc }, o.snow || 0);
  else if (key === 'metal') m = stdMat({ map: TEX.metal.map, normalMap: TEX.metal.normalMap, roughness: o.rough ?? 0.7, metalness: o.metal ?? 0.3, color, vertexColors: vc }, o.snow || 0);
  else if (key === 'planks') m = stdMat({ map: TEX.planks.map, normalMap: TEX.planks.normalMap, roughness: o.rough ?? 0.85, color, vertexColors: vc }, o.snow || 0);
  else if (key === 'plain') m = stdMat({ roughness: o.rough ?? 0.8, metalness: o.metal ?? 0, color, vertexColors: vc, map: TEX.grime.map }, o.snow || 0);
  else {
    const t = ftex(key);
    m = stdMat({ map: t.map, normalMap: t.normalMap, roughness: o.rough ?? 0.9, metalness: o.metal ?? 0, color, vertexColors: vc, alphaTest: FLAT_TEX[key].alpha ? 0.5 : 0, side: o.side ?? THREE.FrontSide }, o.snow || 0);
  }
  m.userData.scale = FLAT_SCALE[key] || 2; m.name = key + ':' + color.toString(16);
  return (FMATS[k] = m);
}
// Matière à couleurs par sommet pour les murs et sols construits ici (spec = 'clé' ou ['clé', teinte]).
const fv = (spec) => { const [k, c] = Array.isArray(spec) ? spec : [spec, 0xffffff]; return fmat(k, c, { vc: true }); };

/* ─── Géométrie : quadrilatères orientés, UV en coordonnées du monde ─── */
class QB {
  constructor(mat) { this.mat = mat; this.p = []; this.n = []; this.u = []; this.c = []; this.i = []; }
  // Quadrilatère (4 coins dans l'ordre du contour), normale imposée, uv par coin, couleur (AO) par coin.
  quad(P, N, UV, C) {
    const b = this.p.length / 3;
    for (let k = 0; k < 4; k++) { this.p.push(P[k][0], P[k][1], P[k][2]); this.n.push(N[0], N[1], N[2]); this.u.push(UV[k][0], UV[k][1]); const c = C ? C[k] : 1; this.c.push(c, c, c); }
    // Sens des triangles selon la normale voulue.
    const ax = P[1][0] - P[0][0], ay = P[1][1] - P[0][1], az = P[1][2] - P[0][2], bx = P[2][0] - P[0][0], by = P[2][1] - P[0][1], bz = P[2][2] - P[0][2];
    const cx = ay * bz - az * by, cy = az * bx - ax * bz, cz = ax * by - ay * bx;
    if (cx * N[0] + cy * N[1] + cz * N[2] >= 0) this.i.push(b, b + 1, b + 2, b, b + 2, b + 3); else this.i.push(b, b + 2, b + 1, b, b + 3, b + 2);
  }
  // Pan vertical le long d'un axe : de (x0,z0) à (x1,z1), de y0 à y1, face tournée vers n (normale horizontale).
  wall(x0, z0, x1, z1, y0, y1, nx, nz, ao = true) {
    const s = this.mat.userData.scale || 2, alongX = Math.abs(x1 - x0) > Math.abs(z1 - z0);
    const U = (x, z) => (alongX ? x : z) / s * (alongX ? (nz > 0 ? 1 : -1) : (nx < 0 ? 1 : -1));
    const a0 = ao ? 0.62 + 0.38 * smooth(clamp(y0 / 1.2, 0, 1)) : 1, a1 = ao ? 0.62 + 0.38 * smooth(clamp(y1 / 1.2, 0, 1)) : 1;
    this.quad([[x0, y0, z0], [x1, y0, z1], [x1, y1, z1], [x0, y1, z0]], [nx, 0, nz], [[U(x0, z0), y0 / s], [U(x1, z1), y0 / s], [U(x1, z1), y1 / s], [U(x0, z0), y1 / s]], [a0, a0, a1, a1]);
  }
  // Pan horizontal (sol, plafond, dessus de mur).
  flat(x0, z0, x1, z1, y, up = 1, C) {
    const s = this.mat.userData.scale || 2;
    this.quad([[x0, y, z0], [x1, y, z0], [x1, y, z1], [x0, y, z1]], [0, up, 0], [[x0 / s, z0 / s], [x1 / s, z0 / s], [x1 / s, z1 / s], [x0 / s, z1 / s]], C);
  }
  build(shadow = true, parent = R.scene) {
    if (!this.i.length) return null;
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.p, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(this.n, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(this.u, 2)); g.setAttribute('color', new THREE.Float32BufferAttribute(this.c, 3)); g.setIndex(this.i);
    const m = new THREE.Mesh(g, this.mat); m.castShadow = shadow; m.receiveShadow = true; parent.add(m); return m;
  }
}
const QBS = new Map();
const qb = (mat) => { if (!QBS.has(mat)) QBS.set(mat, new QB(mat)); return QBS.get(mat); };

/* ─── Construction d'une carte de plain-pied ─── */
function buildFlatWorld() {
  QBS.clear();
  const T = TILE, E = EDGE_T, CH = ceilH(), SD = M.styleDefs || [];
  const sd = (i) => SD[MAP.style[i]] || SD[0] || {};
  const isOpen = (x, z) => { const t = tType(x, z); return t === T_FLOOR || t === T_DOOR; };
  const roofAt = (x, z) => inMap(x, z) && MAP.roof[ti(x, z)] && MAP.type[ti(x, z)] !== T_SOLID;
  // Sol extérieur.
  buildFlatTerrain();
  // Sols praticables, par style.
  for (let z = 0; z < MAP_D; z++) for (let x = 0; x < MAP_W; x++) {
    const t = tType(x, z); if (t !== T_FLOOR && t !== T_DOOR) continue;
    const i = ti(x, z), st = sd(i), mat = fv(st.floor || 'slab'), q = qb(mat), x0 = x * T, z0 = z * T;
    // Ombre de contact le long des murs.
    const wallN = (dx, dz) => { const a = x + dx, b = z + dz; const tt = tType(a, b); return tt === T_BLOCK || tt === T_SOLID || tt === T_RAMP || (MAP.hasEdges && edgeWall(x, z, a, b) && !(wallDef(edgeWall(x, z, a, b)).see)); };
    const w = [wallN(-1, 0), wallN(1, 0), wallN(0, -1), wallN(0, 1)];
    const ao = (s, v) => { let m = 0; if (w[0]) m = Math.max(m, 1 - clamp(s * 3.2, 0, 1)); if (w[1]) m = Math.max(m, 1 - clamp((1 - s) * 3.2, 0, 1)); if (w[2]) m = Math.max(m, 1 - clamp(v * 3.2, 0, 1)); if (w[3]) m = Math.max(m, 1 - clamp((1 - v) * 3.2, 0, 1)); return 1 - m * 0.4; };
    for (let a = 0; a < 2; a++) for (let b = 0; b < 2; b++) { const s0 = a / 2, s1 = (a + 1) / 2, v0 = b / 2, v1 = (b + 1) / 2; q.flat(x0 + s0 * T, z0 + v0 * T, x0 + s1 * T, z0 + v1 * T, 0.004, 1, [ao(s0, v0), ao(s1, v0), ao(s1, v1), ao(s0, v1)]); }
    // Plafond et dalle de toit.
    if (MAP.roof[i]) {
      const ch = st.ceilH || CH;
      qb(fv(st.ceil || M.ceilTex || 'plaster')).flat(x0, z0, x0 + T, z0 + T, ch, -1);
      if (!st.noSlab) qb(fv(st.roof || M.roofTex || 'concrete')).flat(x0 - 0.02, z0 - 0.02, x0 + T + 0.02, z0 + T + 0.02, ch + 0.35, 1);
    }
  }
  // Murs pleins (carreaux T_BLOCK).
  for (let z = 0; z < MAP_D; z++) for (let x = 0; x < MAP_W; x++) {
    if (tType(x, z) !== T_BLOCK) continue;
    const i = ti(x, z), st = sd(i), h = blockH(i), x0 = x * T, z0 = z * T;
    const mat = fv(st.block || 'concrete'), q = qb(mat);
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const a = x + dx, b = z + dz; if (inMap(a, b) && MAP.type[ti(a, b)] === T_BLOCK) continue;
      const inside = roofAt(a, b), fmatIn = inside && st.blockIn ? fv(st.blockIn) : mat;
      const y0 = inMap(a, b) && MAP.type[ti(a, b)] === T_SOLID ? Math.min(0, surfH(tcx(a), tcx(b))) - 0.3 : 0;
      const top = inside ? Math.min(h, roomCeil(a, b)) : h;
      if (st.rough) { roughFace(qb(fmatIn), x, z, dx, dz, y0, h, st.rough); continue; }
      if (dx) { const X = dx > 0 ? x0 + T : x0; qb(fmatIn).wall(X, z0, X, z0 + T, y0, top, dx, 0); if (top < h) q.wall(X, z0, X, z0 + T, top, h, dx, 0, false); }
      else { const Z = dz > 0 ? z0 + T : z0; qb(fmatIn).wall(x0, Z, x0 + T, Z, y0, top, 0, dz); if (top < h) q.wall(x0, Z, x0 + T, Z, top, h, 0, dz, false); }
    }
    if (st.rough) roughTop(qb(fv(st.blockTop || st.block || 'concrete')), x, z, h, st.rough); else qb(fv(st.blockTop || st.block || 'concrete')).flat(x0, z0, x0 + T, z0 + T, h, 1);
  }
  // Murs fins, clôtures et barreaux.
  const bars = [], chainSegs = [], posts = [], pickets = [], rails = [];
  for (let z = 0; z < MAP_D; z++) for (let x = 0; x < MAP_W; x++) {
    const i = ti(x, z), w = MAP.ew[i]; if (!w) continue;
    for (let bit = 0; bit < 2; bit++) {
      if (!(w & (1 << bit))) continue;
      const K = wallDef(MAP.ek[i * 2 + bit]);
      const ax = x, az = z, bx = bit ? x : x + 1, bz = bit ? z + 1 : z; // de part et d'autre
      // Segment : bord est → x = (x+1)T, z ∈ [zT, (z+1)T] ; bord sud → z = (z+1)T, x ∈ [xT, (x+1)T].
      const X0 = bit ? x * T : (x + 1) * T, Z0 = bit ? (z + 1) * T : z * T, X1 = bit ? (x + 1) * T : X0, Z1 = bit ? Z0 : (z + 1) * T;
      const look = K.look || 'solid';
      if (look === 'solid' || look === 'window') flatSolidWall(K, X0, Z0, X1, Z1, bit, ax, az, bx, bz, roofAt(ax, az), roofAt(bx, bz));
      else if (look === 'bars') bars.push([X0, Z0, X1, Z1, K]);
      else if (look === 'chain') chainSegs.push([X0, Z0, X1, Z1, K]);
      else if (look === 'picket') pickets.push([X0, Z0, X1, Z1, K]);
      else if (look === 'rail') rails.push([X0, Z0, X1, Z1, K]);
      if (look !== 'solid' && look !== 'window') { posts.push([X0, Z0, K]); posts.push([X1, Z1, K]); }
    }
  }
  buildFences(bars, chainSegs, pickets, rails, posts);
  flatDetails();
  buildFlatRamps();
  for (const q of QBS.values()) q.build(true);
  QBS.clear();
  flatWindowExtras();
  // Plan d'eau (baie, rivière souterraine…).
  if (M.water) buildWater();
  // Plaine lointaine.
  const F = M.env.far; if (F) { const far = new THREE.Mesh(new THREE.RingGeometry(F.r0 || 110, 800, 64, 1), stdMat({ color: F.color, roughness: 1 })); far.rotation.x = -Math.PI / 2; far.position.set(F.cx, F.y, F.cz); R.scene.add(far); }
}

// Mur plein entre deux carreaux : face intérieure (pièce couverte) et extérieure, dessus, et fenêtre décorative éventuelle.
function flatSolidWall(K, X0, Z0, X1, Z1, bit, ax, az, bx, bz, roofA, roofB) {
  const E = EDGE_T, CH = ceilH();
  const h = Math.max(K.h || 3, roofA ? roomCeil(ax, az) + 0.35 : 0, roofB ? roomCeil(bx, bz) + 0.35 : 0), y0 = K.y0 || 0;
  const matOut = fv(K.out || 'concrete'), matIn = K.in ? fv(K.in) : matOut;
  const mA = roofA ? matIn : matOut, mB = roofB ? matIn : matOut;
  // Côté A (ouest ou nord) et côté B (est ou sud) ; les segments débordent de l'épaisseur pour fermer les angles.
  const win = K.look === 'window' ? { s0: 0.45, s1: 1.55, y0: 0.95, y1: 2.15 } : null;
  const pieces = win ? [[0, win.s0, y0, h], [win.s1, 2, y0, h], [win.s0, win.s1, y0, win.y0], [win.s0, win.s1, win.y1, h]] : [[0, 2, y0, h]];
  // Plinthes côté pièce couverte.
  if (M.baseboard) { const bb = qb(fv(M.baseboard)); for (const [side, roofed] of [[-1, roofA], [1, roofB]]) { if (!roofed) continue; const o = E + 0.012; if (bit === 0) bb.wall(X0 + side * o, Z0, X0 + side * o, Z0 + 2, 0, 0.11, side, 0, false); else bb.wall(X0, Z0 + side * o, X0 + 2, Z0 + side * o, 0, 0.11, 0, side, false); } }
  for (const [s0, s1, py0, py1] of pieces) {
    const a0 = s0 === 0 ? -E : s0, a1 = s1 === 2 ? 2 + E : s1;
    if (bit === 0) { // mur nord-sud en x = X0
      const za = Z0 + a0, zb = Z0 + a1;
      qb(mA).wall(X0 - E, za, X0 - E, zb, py0, py1, -1, 0, py0 < 0.1); qb(mB).wall(X0 + E, za, X0 + E, zb, py0, py1, 1, 0, py0 < 0.1);
    } else {
      const xa = X0 + a0, xb = X0 + a1;
      qb(mA).wall(xa, Z0 - E, xb, Z0 - E, py0, py1, 0, -1, py0 < 0.1); qb(mB).wall(xa, Z0 + E, xb, Z0 + E, py0, py1, 0, 1, py0 < 0.1);
    }
  }
  // Dessus du mur.
  const top = qb(roofA || roofB ? fv(M.roofTex || 'concrete') : matOut);
  if (bit === 0) top.flat(X0 - E, Z0 - E, X0 + E, Z1 + E, h, 1); else top.flat(X0 - E, Z0 - E, X1 + E, Z0 + E, h, 1);
  if (win) { // embrasure, encadrement en saillie, croisillons, appui, rideaux et vitre
    const trim = qb(fv(K.trim || ['planks', 0xd8d0c0]));
    const s0 = win.s0, s1 = win.s1, wy0 = win.y0, wy1 = win.y1;
    if (bit === 0) {
      trim.flat(X0 - E - 0.05, Z0 + s0, X0 + E + 0.05, Z0 + s1, wy0, 1); trim.flat(X0 - E, Z0 + s0, X0 + E, Z0 + s1, wy1, -1);
      trim.wall(X0 - E, Z0 + s0, X0 + E, Z0 + s0, wy0, wy1, 0, 1, false); trim.wall(X0 - E, Z0 + s1, X0 + E, Z0 + s1, wy0, wy1, 0, -1, false);
    } else {
      trim.flat(X0 + s0, Z0 - E - 0.05, X0 + s1, Z0 + E + 0.05, wy0, 1); trim.flat(X0 + s0, Z0 - E, X0 + s1, Z0 + E, wy1, -1);
      trim.wall(X0 + s0, Z0 - E, X0 + s0, Z0 + E, wy0, wy1, 1, 0, false); trim.wall(X0 + s1, Z0 - E, X0 + s1, Z0 + E, wy0, wy1, -1, 0, false);
    }
    // a = position le long du mur, n = décalage perpendiculaire à la ligne du mur.
    const boxIn = (qq, a0, a1, by0, by1, n0, n1) => (bit === 0 ? qbBox(qq, X0 + n0, by0, Z0 + a0, X0 + n1, by1, Z0 + a1) : qbBox(qq, X0 + a0, by0, Z0 + n0, X0 + a1, by1, Z0 + n1)), box = (...a) => boxIn(trim, ...a);
    for (const side of [-1, 1]) {
      const n0 = Math.min(side * E, side * (E + 0.035)), n1 = Math.max(side * E, side * (E + 0.035)), fw = 0.08;
      box(s0 - fw, s0, wy0 - fw, wy1 + fw, n0, n1); box(s1, s1 + fw, wy0 - fw, wy1 + fw, n0, n1);
      box(s0, s1, wy1, wy1 + fw, n0, n1); box(s0, s1, wy0 - fw, wy0, n0, n1);
      if (side < 0 ? !roofA : !roofB) box(s0 - 0.13, s1 + 0.13, wy0 - 0.13, wy0 - 0.06, Math.min(side * E, side * (E + 0.1)), Math.max(side * E, side * (E + 0.1))); // appui saillant côté rue
    }
    // Croisillons : un meneau et une traverse (sauf vitrail ou barreaux).
    if (!K.stained && !K.bars) { const cm = (s0 + s1) / 2, ym = wy0 + (wy1 - wy0) * 0.58, t = 0.022; box(cm - t, cm + t, wy0, wy1, -0.028, 0.028); box(s0, s1, ym - t, ym + t, -0.028, 0.028); }
    // Barreaux de prison scellés dans l'embrasure.
    if (K.bars) { for (let k = 1; k < 9; k++) { const a = s0 + (s1 - s0) * k / 9; FLAT_BARS.push([bit === 0 ? [X0 + 0.04, (wy0 + wy1) / 2, Z0 + a] : [X0 + a, (wy0 + wy1) / 2, Z0 + 0.04], wy1 - wy0]); } box(s0, s1, wy0 + (wy1 - wy0) * 0.5 - 0.02, wy0 + (wy1 - wy0) * 0.5 + 0.02, 0.01, 0.07); }
    // Volets ouverts contre la façade, côté rue.
    if (K.shutter) for (const side of [-1, 1]) {
      if (side < 0 ? roofA : roofB) continue; const sq = qb(fv(['planks', K.shutter])), n0 = Math.min(side * (E + 0.04), side * (E + 0.075)), n1 = Math.max(side * (E + 0.04), side * (E + 0.075)), sw = (s1 - s0) / 2;
      for (const [a0, a1] of [[s0 - 0.1 - sw, s0 - 0.1], [s1 + 0.1, s1 + 0.1 + sw]]) { boxIn(sq, a0, a1, wy0 - 0.05, wy1 + 0.05, n0, n1); for (let k = 0; k < 6; k++) { const yy = wy0 + (wy1 - wy0) * (k + 0.5) / 6; if (bit === 0) qbBox(sq, X0 + (side < 0 ? n0 - 0.012 : n1), yy - 0.035, Z0 + a0 + 0.05, X0 + (side < 0 ? n0 : n1 + 0.012), yy + 0.035, Z0 + a1 - 0.05); else qbBox(sq, X0 + a0 + 0.05, yy - 0.035, Z0 + (side < 0 ? n0 - 0.012 : n1), X0 + a1 - 0.05, yy + 0.035, Z0 + (side < 0 ? n0 : n1 + 0.012)); } }
    }
    // Jardinière fleurie sous la fenêtre, côté rue.
    if (K.flowers) for (const side of [-1, 1]) { if (side < 0 ? roofA : roofB) continue; const n0 = Math.min(side * E, side * (E + 0.22)), n1 = Math.max(side * E, side * (E + 0.22)); box(s0 - 0.05, s1 + 0.05, wy0 - 0.34, wy0 - 0.14, n0, n1); FLAT_FLOWERS.push([bit, X0, Z0, s0, s1, wy0 - 0.12, side * (E + 0.11)]); }
    // Rideaux et tringle du côté intérieur.
    if (M.curtain) for (const [side, roofed] of [[-1, roofA], [1, roofB]]) {
      if (!roofed) continue; const cq = qb(fv(M.curtain)), o = E + 0.06;
      for (const [c0, c1] of [[s0 - 0.28, s0 + 0.12], [s1 - 0.12, s1 + 0.28]]) {
        if (bit === 0) cq.wall(X0 + side * o, Z0 + c0, X0 + side * o, Z0 + c1, wy0 - 0.35, wy1 + 0.18, side, 0, false); else cq.wall(X0 + c0, Z0 + side * o, X0 + c1, Z0 + side * o, wy0 - 0.35, wy1 + 0.18, 0, side, false);
      }
    }
    // Vitre : une face par côté. Fenêtre éclairée : lumineuse vue de la rue, vitre de nuit vue de l'intérieur.
    const cx = bit === 0 ? X0 : X0 + (s0 + s1) / 2, cz = bit === 0 ? Z0 + (s0 + s1) / 2 : Z0, hw = (s1 - s0) / 2;
    for (const sgn of [-1, 1]) {
      const roofed = sgn < 0 ? roofA : roofB, inside = roofed && roofA !== roofB;
      const glass = qb(K.stained ? flatStained(inside) : K.lit ? (inside ? flatGlassNight() : flatGlassLit(K.lit)) : flatGlass());
      if (bit === 0) glass.quad([[cx, wy0, cz - hw], [cx, wy0, cz + hw], [cx, wy1, cz + hw], [cx, wy1, cz - hw]], [sgn, 0, 0], [[0, 0], [1, 0], [1, 1], [0, 1]]);
      else glass.quad([[cx - hw, wy0, cz], [cx + hw, wy0, cz], [cx + hw, wy1, cz], [cx - hw, wy1, cz]], [0, 0, sgn], [[0, 0], [1, 0], [1, 1], [0, 1]]);
    }
  }
}
// Pavé (six faces) dans un lot de quadrilatères : moulures, encadrements, bandeaux.
function qbBox(q, x0, y0, z0, x1, y1, z1) {
  q.wall(x1, z0, x1, z1, y0, y1, 1, 0, false); q.wall(x0, z0, x0, z1, y0, y1, -1, 0, false);
  q.wall(x0, z1, x1, z1, y0, y1, 0, 1, false); q.wall(x0, z0, x1, z0, y0, y1, 0, -1, false);
  q.flat(x0, z0, x1, z1, y1, 1); q.flat(x0, z0, x1, z1, y0, -1);
}
// Vitrail : losanges de couleur sertis de plomb, plus lumineux vu du dehors (cierges allumés dedans).
const _stained = {};
function flatStained(inside) {
  if (_stained[inside]) return _stained[inside];
  const tex = _stained.tex ||= textTexture(256, 512, (x, w, h) => { const r = mulberry32(5), cols = ['#8a1e1e', '#1e3a8a', '#c8a020', '#2a6a3a', '#6a2a7a', '#b85a1a']; x.fillStyle = '#111'; x.fillRect(0, 0, w, h); const k = 42; for (let j = -1; j < h / k + 1; j++) for (let i = -1; i < w / k + 1; i++) { const cx = i * k + (j % 2) * k / 2, cy = j * k * 0.9; x.fillStyle = cols[(r() * cols.length) | 0]; x.beginPath(); x.moveTo(cx, cy - k * 0.55); x.lineTo(cx + k / 2 - 3, cy); x.lineTo(cx, cy + k * 0.55); x.lineTo(cx - k / 2 + 3, cy); x.closePath(); x.fill(); } x.strokeStyle = '#151210'; x.lineWidth = 7; x.beginPath(); x.arc(w / 2, h * 0.3, w * 0.28, 0, TAU); x.stroke(); x.beginPath(); x.moveTo(w / 2, 0); x.lineTo(w / 2, h); x.stroke(); });
  return (_stained[inside] = Object.assign(new THREE.MeshStandardMaterial({ map: tex, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: inside ? 0.25 : 0.9, roughness: 0.3, vertexColors: true, name: 'vitrail' }), { userData: { scale: 1 } }));
}
const FLAT_BARS = [], FLAT_FLOWERS = [];
// Barreaux et fleurs des fenêtres : lots instanciés construits après les murs.
function flatWindowExtras() {
  if (FLAT_BARS.length) { const b = new Batch(new THREE.CylinderGeometry(0.016, 0.016, 1, 6), MATS.iron); for (const [[x, y, z], h] of FLAT_BARS) b.add(x, y, z, 0, 0, 0, 1, h + 0.06, 1); b.build(); }
  if (FLAT_FLOWERS.length) {
    const fl = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.07, 0), stdMat({ color: 0xffffff, roughness: 0.8 }), FLAT_FLOWERS.length * 7), leaf = new Batch(new THREE.IcosahedronGeometry(0.1, 0), fmat('plain', 0x3f6a2e, { rough: 0.9 })); let n = 0; const cols = [0xd8344a, 0xf2d24a, 0xf2f0ea, 0xe86ab0, 0x7a5ad8], c = new THREE.Color();
    for (const [bit, X0, Z0, s0, s1, y, off] of FLAT_FLOWERS) for (let k = 0; k < 7; k++) { const a = s0 + (s1 - s0) * (k + 0.5) / 7, px = bit === 0 ? X0 + off : X0 + a, pz = bit === 0 ? Z0 + a : Z0 + off; leaf.add(px, y + 0.02, pz, rand(TAU), 0, 0, 1.3, 0.8, 1.3); fl.setMatrixAt(n, _m1.compose(_v1.set(px + rand(-0.05, 0.05), y + 0.1 + rand(0, 0.05), pz + rand(-0.05, 0.05)), _q1.identity(), _v2.setScalar(rand(0.7, 1.1)))); fl.setColorAt(n++, c.setHex(cols[(Math.random() * cols.length) | 0])); }
    fl.count = n; fl.instanceMatrix.needsUpdate = true; fl.instanceColor.needsUpdate = true; R.scene.add(fl); leaf.build();
  }
  FLAT_BARS.length = 0; FLAT_FLOWERS.length = 0;
}
let _flatGlass = null;
function flatGlass() { return (_flatGlass ||= Object.assign(new THREE.MeshStandardMaterial({ color: 0x7d96a2, roughness: 0.05, metalness: 0.55, transparent: true, opacity: 0.4, depthWrite: false, vertexColors: true, name: 'verre' }), { userData: { scale: 1 } })); }
let _nightGlass = null;
// Vitre vue de l'intérieur la nuit : sombre et réfléchissante.
function flatGlassNight() { return (_nightGlass ||= Object.assign(new THREE.MeshStandardMaterial({ color: 0x0d171d, roughness: 0.07, metalness: 0.7, vertexColors: true, name: 'verreNuit' }), { userData: { scale: 1 } })); }
const _litGlass = {};
function flatGlassLit(c) { return (_litGlass[c] ||= Object.assign(new THREE.MeshStandardMaterial({ color: 0x302418, emissive: c, emissiveIntensity: 0.55, roughness: 0.2, metalness: 0.3, vertexColors: true }), { userData: { scale: 1 } })); }

/* ─── Finitions automatiques : bords de toit fermés, débords, bouts de murs, linteaux, soubassements, corniches ───
   M.details (facultatif) : { eaves: profondeur du débord, gutter: couleur de gouttière, fascia: matière de la planche de rive,
   plinth: matière du soubassement extérieur, crown: matière de la corniche intérieure, header: true pour les linteaux }. */
function flatDetails() {
  const T = TILE, E = EDGE_T, D = M.details || {}, SD = M.styleDefs || [];
  const sd = (x, z) => SD[MAP.style[ti(x, z)]] || {};
  const tt = (x, z) => (inMap(x, z) ? MAP.type[ti(x, z)] : T_SOLID);
  const roofed = (x, z) => inMap(x, z) && MAP.roof[ti(x, z)] && tt(x, z) !== T_SOLID && tt(x, z) !== T_BLOCK;
  const solidK = (k) => k && !wallDef(k).see;
  const fascia = fv(D.fascia || M.roofTex || 'concrete'), gutters = D.gutter ? new Batch(new THREE.CylinderGeometry(0.055, 0.055, 1, 8, 1, true), fmat('plain', D.gutter, { rough: 0.5, metal: 0.4 })) : null;
  const wallH = (K, ax, az, bx, bz) => Math.max(K.h || 3, roofed(ax, az) ? roomCeil(ax, az) + 0.35 : 0, roofed(bx, bz) ? roomCeil(bx, bz) + 0.35 : 0);
  // 1 et 2. Bords de toit : face de rive là où le toit s'arrête sans mur ; débord au-dessus des murs extérieurs.
  for (let z = 0; z < MAP_D; z++) for (let x = 0; x < MAP_W; x++) {
    if (!roofed(x, z) || sd(x, z).noSlab) continue;
    const ch = roomCeil(x, z), x0 = x * T, z0 = z * T;
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const a = x + dx, b = z + dz;
      if ((roofed(a, b) && !sd(a, b).noSlab && roomCeil(a, b) === ch) || tt(a, b) === T_BLOCK) continue;
      const k = edgeWall(x, z, a, b);
      // le long du bord : de s0 à s1 (on prolonge aux angles du toit)
      const ext = (px, pz) => !(roofed(px, pz) && !sd(px, pz).noSlab);
      if (solidK(k)) {
        if (!D.eaves || roofed(a, b) || wallH(wallDef(k), x, z, a, b) > ch + 0.36) continue;
        const dep = D.eaves, lo = ext(x - dz, z - dx) ? -dep : 0, hi = ext(x + dz, z + dx) ? dep : 0, y0 = ch + 0.27, y1 = ch + 0.4 + (dx ? 0 : 0.004);
        const top = qb(fv(sd(x, z).roof || M.roofTex || 'concrete'));
        if (dx) { const X = dx > 0 ? x0 + T : x0, xa = Math.min(X, X + dx * dep), xb = Math.max(X, X + dx * dep); top.flat(xa, z0 + lo, xb, z0 + T + hi, y1, 1); qbBox(qb(fascia), xa, y0, z0 + lo, xb, y1 - 0.01, z0 + T + hi); if (gutters) gutters.add(X + dx * (dep + 0.03), y0 + 0.02, z0 + T / 2 + (lo + hi) / 2, 0, Math.PI / 2, 0, 1, T + hi - lo, 1); }
        else { const Z = dz > 0 ? z0 + T : z0, za = Math.min(Z, Z + dz * dep), zb = Math.max(Z, Z + dz * dep); top.flat(x0 + lo, za, x0 + T + hi, zb, y1, 1); qbBox(qb(fascia), x0 + lo, y0, za, x0 + T + hi, y1 - 0.01, zb); if (gutters) gutters.add(x0 + T / 2 + (lo + hi) / 2, y0 + 0.02, Z + dz * (dep + 0.03), Math.PI / 2, Math.PI / 2, 0, 1, T + hi - lo, 1); }
        continue;
      }
      // Rive ouverte (auvent, galerie couverte, préau) : on ferme l'épaisseur entre plafond et toit, avec une planche de rive.
      const y0 = ch - 0.14, y1 = ch + 0.37;
      if (dx) { const X = dx > 0 ? x0 + T + 0.02 : x0 - 0.02; qbBox(qb(fascia), Math.min(X, X + dx * 0.05), y0, z0 - 0.02, Math.max(X, X + dx * 0.05), y1, z0 + T + 0.02); }
      else { const Z = dz > 0 ? z0 + T + 0.02 : z0 - 0.02; qbBox(qb(fascia), x0 - 0.02, y0, Math.min(Z, Z + dz * 0.05), x0 + T + 0.02, y1, Math.max(Z, Z + dz * 0.05)); }
    }
  }
  if (gutters) gutters.build();
  // 3. Bouts de murs libres (passage, fin de cloison) : on ferme l'épaisseur du mur.
  const deg = (vx, vz) => {
    let n = 0;
    for (const [ex, ez, bit] of [[vx - 1, vz - 1, 0], [vx - 1, vz, 0], [vx - 1, vz - 1, 1], [vx, vz - 1, 1]]) if (inMap(ex, ez) && (MAP.ew[ti(ex, ez)] & (1 << bit))) n++;
    for (const [tx, tz] of [[vx - 1, vz - 1], [vx, vz - 1], [vx - 1, vz], [vx, vz]]) { const t = tt(tx, tz); if (inMap(tx, tz) && (t === T_BLOCK || t === T_RAMP || t === T_DOOR)) n += 2; }
    return n;
  };
  for (let z = 0; z < MAP_D; z++) for (let x = 0; x < MAP_W; x++) {
    const w = MAP.ew[ti(x, z)]; if (!w) continue;
    for (let bit = 0; bit < 2; bit++) {
      if (!(w & (1 << bit))) continue; const k = MAP.ek[ti(x, z) * 2 + bit], K = wallDef(k); if (K.see) continue;
      const ax = x, az = z, bx = bit ? x : x + 1, bz = bit ? z + 1 : z, h = wallH(K, ax, az, bx, bz), y0 = K.y0 || 0, q = qb(fv(K.out || 'concrete'));
      if (bit === 0) { const X = (x + 1) * T; if (deg(x + 1, z) === 1) q.wall(X - E, z * T - E, X + E, z * T - E, y0, h, 0, -1); if (deg(x + 1, z + 1) === 1) q.wall(X - E, (z + 1) * T + E, X + E, (z + 1) * T + E, y0, h, 0, 1); }
      else { const Z = (z + 1) * T; if (deg(x, z + 1) === 1) q.wall(x * T - E, Z - E, x * T - E, Z + E, y0, h, -1, 0); if (deg(x + 1, z + 1) === 1) q.wall((x + 1) * T + E, Z - E, (x + 1) * T + E, Z + E, y0, h, 1, 0); }
      // 5. Soubassement côté extérieur, corniche côté pièce.
      for (const [side, tx, tz] of [[-1, ax, az], [1, bx, bz]]) {
        const roof = roofed(tx, tz), mat = roof ? D.crown : D.plinth; if (!mat || !isFloorish(tx, tz) && tt(tx, tz) !== T_SOLID) continue;
        const qq = qb(fv(mat)), o0 = side * E, o1 = side * (E + (roof ? 0.035 : 0.03)), n0 = Math.min(o0, o1), n1 = Math.max(o0, o1);
        const yy0 = roof ? roomCeil(tx, tz) - 0.11 : -0.05, yy1 = roof ? roomCeil(tx, tz) : 0.34;
        if (bit === 0) qbBox(qq, (x + 1) * T + n0, yy0, z * T - E, (x + 1) * T + n1, yy1, (z + 1) * T + E); else qbBox(qq, x * T - E, yy0, (z + 1) * T + n0, (x + 1) * T + E, yy1, (z + 1) * T + n1);
        // Lambris et cimaise dans les pièces (sous les fenêtres comprises).
        if (roof && D.wainscot) { const wq = qb(fv(D.wainscot)), wh = D.wainscotH || 0.95; for (const [y0w, y1w, dep] of [[0.11, wh, 0.018], [wh, wh + 0.06, 0.04]]) { const m0 = Math.min(side * E, side * (E + dep)), m1 = Math.max(side * E, side * (E + dep)); if (bit === 0) qbBox(wq, (x + 1) * T + m0, y0w, z * T - E, (x + 1) * T + m1, y1w, (z + 1) * T + E); else qbBox(wq, x * T - E, y0w, (z + 1) * T + m0, (x + 1) * T + E, y1w, (z + 1) * T + m1); } }
      }
    }
  }
  // 6. Barbelés en accordéon au sommet des murs d'enceinte (K.wire).
  { const wb = new Batch((() => { const g = helixGeo(2.02, 0.26, 9); g.rotateZ(Math.PI / 2); return g; })(), MATS.iron, false), br = new Batch(boxG(0.04, 0.5, 0.04), MATS.iron);
    for (let z = 0; z < MAP_D; z++) for (let x = 0; x < MAP_W; x++) { const w = MAP.ew[ti(x, z)]; if (!w) continue; for (let bit = 0; bit < 2; bit++) { if (!(w & (1 << bit))) continue; const K = wallDef(MAP.ek[ti(x, z) * 2 + bit]); if (!K.wire) continue; const h = wallH(K, x, z, bit ? x : x + 1, bit ? z + 1 : z); if (bit === 0) { wb.add((x + 1) * T, h + 0.3, z * T + 1, Math.PI / 2); br.add((x + 1) * T, h + 0.2, z * T + 0.05); } else { wb.add(x * T + 1, h + 0.3, (z + 1) * T, 0); br.add(x * T + 0.05, h + 0.2, (z + 1) * T); } } }
    wb.build(); br.build(); }
  // 4. Linteaux au-dessus des passages ouverts entre deux pièces couvertes (une brèche d'un carreau dans une cloison).
  if (D.header !== false) for (let z = 0; z < MAP_D; z++) for (let x = 0; x < MAP_W; x++) for (const bit of [0, 1]) {
    const ax = x, az = z, bx = bit ? x : x + 1, bz = bit ? z + 1 : z;
    if (!inMap(bx, bz) || tt(ax, az) !== T_FLOOR || tt(bx, bz) !== T_FLOOR || !roofed(ax, az) || !roofed(bx, bz) || edgeWall(ax, az, bx, bz)) continue;
    const px = bit ? 1 : 0, pz = bit ? 0 : 1; // le long de la ligne
    const kA = edgeWall(ax - px, az - pz, bx - px, bz - pz), kB = edgeWall(ax + px, az + pz, bx + px, bz + pz);
    const side = (k, tx, tz) => solidK(k) || tt(tx, tz) === T_BLOCK;
    if (!side(kA, ax - px, az - pz) || !side(kB, ax + px, az + pz)) continue;
    const K = wallDef(solidK(kA) ? kA : kB), ch = Math.min(roomCeil(ax, az), roomCeil(bx, bz)), hy = 2.3; if (ch - hy < 0.2) continue;
    const mIn = fv(K.in || K.out || 'plaster'), q = qb(mIn);
    if (bit === 0) { const X = (x + 1) * T; q.wall(X - E, z * T, X - E, (z + 1) * T, hy, ch, -1, 0, false); q.wall(X + E, z * T, X + E, (z + 1) * T, hy, ch, 1, 0, false); q.flat(X - E, z * T, X + E, (z + 1) * T, hy, -1); }
    else { const Z = (z + 1) * T; q.wall(x * T, Z - E, (x + 1) * T, Z - E, hy, ch, 0, -1, false); q.wall(x * T, Z + E, (x + 1) * T, Z + E, hy, ch, 0, 1, false); q.flat(x * T, Z - E, (x + 1) * T, Z + E, hy, -1); }
  }
}

// Clôtures, grillages, barreaux : lots instanciés (un appel de dessin par sorte).
function buildFences(bars, chains, pickets, rails, posts) {
  if (bars.length) {
    const rod = new Batch(new THREE.CylinderGeometry(0.018, 0.018, 1, 6), MATS.iron), flatb = new Batch(boxG(1, 0.06, 0.03), MATS.iron);
    for (const [X0, Z0, X1, Z1, K] of bars) {
      const h = K.h || 3, L = Math.hypot(X1 - X0, Z1 - Z0), n = Math.round(L / 0.13), alongX = Math.abs(X1 - X0) > 0.1;
      for (let k = 0; k <= n; k++) { const t = k / n; rod.add(lerp(X0, X1, t), h / 2, lerp(Z0, Z1, t), 0, 0, 0, 1, h, 1); }
      for (const y of [0.12, 1.1, h - 0.1]) flatb.add((X0 + X1) / 2, y, (Z0 + Z1) / 2, alongX ? 0 : Math.PI / 2, 0, 0, L + 0.03, 1, 1);
    }
    rod.build(); flatb.build();
  }
  if (chains.length) {
    const mat = fmat('chain', 0xffffff, { side: THREE.DoubleSide, rough: 0.5, metal: 0.6, vc: true }); const q = new QB(mat); mat.userData.scale = 1;
    const railB = new Batch(new THREE.CylinderGeometry(0.025, 0.025, 1, 6), MATS.iron);
    for (const [X0, Z0, X1, Z1, K] of chains) {
      const h = K.h || 2.2, alongX = Math.abs(X1 - X0) > 0.1;
      q.wall(X0, Z0, X1, Z1, 0.04, h - 0.05, alongX ? 0 : 1, alongX ? 1 : 0, false);
      railB.add((X0 + X1) / 2, h - 0.03, (Z0 + Z1) / 2, alongX ? 0 : Math.PI / 2, 0, Math.PI / 2, 1, TILE, 1);
    }
    const m = q.build(false); if (m) m.renderOrder = 1; railB.build();
  }
  if (pickets.length) {
    const bd = new Batch(boxG(0.09, 1, 0.025), fmat('plain', 0xf4f1e8)), rl = new Batch(boxG(1, 0.07, 0.03), fmat('plain', 0xeceae0));
    for (const [X0, Z0, X1, Z1, K] of pickets) {
      const h = K.h || 1.1, alongX = Math.abs(X1 - X0) > 0.1;
      for (let k = 0; k < 13; k++) { const t = (k + 0.5) / 13; bd.add(lerp(X0, X1, t), h / 2, lerp(Z0, Z1, t), alongX ? 0 : Math.PI / 2, 0, 0, 1, h, 1); }
      for (const y of [0.3, h - 0.25]) rl.add((X0 + X1) / 2, y, (Z0 + Z1) / 2, alongX ? 0 : Math.PI / 2, 0, 0, TILE, 1, 1);
    }
    bd.build(); rl.build();
  }
  if (rails.length) {
    const rl = new Batch(boxG(1, 0.12, 0.06), MATS.post);
    for (const [X0, Z0, X1, Z1, K] of rails) { const alongX = Math.abs(X1 - X0) > 0.1; for (const y of [0.45, 0.95, (K.h || 1.3) - 0.1]) rl.add((X0 + X1) / 2, y, (Z0 + Z1) / 2, alongX ? 0 : Math.PI / 2, 0, rand(-0.04, 0.04), TILE + 0.1, 1, 1); }
    rl.build();
  }
  if (posts.length) {
    const seen = new Set(), pb = new Batch(boxG(0.1, 1, 0.1), MATS.iron), wb = new Batch(boxG(0.12, 1, 0.12), MATS.post);
    for (const [x, z, K] of posts) { const k = `${x}_${z}`; if (seen.has(k)) continue; seen.add(k); const h = (K.h || 2) + (K.look === 'chain' ? 0.08 : 0.05); (K.look === 'rail' || K.look === 'picket' ? wb : pb).add(x, h / 2, z, 0, 0, 0, 1, h, 1); }
    pb.build(); wb.build();
  }
}

// Sol extérieur (sable, roche, terre…) avec relief lointain ; trous sous le sol praticable.
function buildFlatTerrain() {
  const G = M.ground || {}, pad = G.pad ?? 70, S = 2;
  const x0 = -pad, x1 = MAP_W * TILE + pad, z0 = -pad, z1 = MAP_D * TILE + pad, nx = Math.round((x1 - x0) / S), nz = Math.round((z1 - z0) / S);
  const mat = fv(G.tex || 'sand'); mat.userData.scale = FLAT_SCALE[G.tex || 'sand'] || 4;
  const gb = new GB(), sc = mat.userData.scale, c0 = G.c0 || [1, 1, 1], c1 = G.c1 || [0.8, 0.8, 0.8];
  for (let j = 0; j <= nz; j++) for (let i = 0; i <= nx; i++) {
    const x = x0 + i * S, z = z0 + j * S, h = surfH(x, z), k = smooth(clamp((fbm(x * 0.05 + 3, z * 0.05, 3) - 0.35) * 2, 0, 1));
    gb.p.push(x, h, z); gb.u.push(x / sc, z / sc); gb.n.push(0, 1, 0); gb.c.push(lerp(c0[0], c1[0], k), lerp(c0[1], c1[1], k), lerp(c0[2], c1[2], k));
  }
  for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) {
    const tx = tileOf(x0 + (i + 0.5) * S), tz = tileOf(z0 + (j + 0.5) * S);
    if (inMap(tx, tz)) { const t = MAP.type[ti(tx, tz)]; if (t === T_FLOOR || t === T_DOOR || t === T_BLOCK) continue; }
    const a = j * (nx + 1) + i, b = a + 1, c = a + nx + 1, d = c + 1;
    gb.i.push(a, c, b, b, c, d);
  }
  const m = mesh(gb.geo(), mat, 0, 0, 0, 0, R.scene, false); m.name = 'terrain'; m.receiveShadow = true;
}

// Barricades de plain-pied : fenêtre à l'appui (murs), passage dans une clôture ou brèche.
function buildFlatRamps() {
  const plank = boxG(1.8, 0.2, 0.05), uv = plank.attributes.uv; for (let k = 0; k < uv.count; k++) uv.setY(k, uv.getY(k) / 6 + 0.02);
  WORLD.planks = new THREE.InstancedMesh(plank, MATS.planks, Math.max(1, MAP.barricades.length * 6)); WORLD.planks.castShadow = true; WORLD.planks.receiveShadow = true;
  const posts = new Batch(boxG(0.14, 1, 0.14), MATS.post), trimB = new Batch(boxG(1, 1, 1), MATS.post); let slopeGB = null;
  const E = EDGE_T, CH = ceilH();
  for (const b of MAP.barricades) {
    const cx = tcx(b.x), cz = tcx(b.z), [dx, dz] = b.dir, px = -dz, pz = dx;
    const ix = cx - dx * (TILE / 2), iz = cz - dz * (TILE / 2); // bord intérieur (ligne du mur)
    const win = b.look === 'window';
    b.center = new THREE.Vector3(ix + dx * 0.12, win ? 1.45 : 1.1, iz + dz * 0.12); b.perp = [px, pz];
    // Murs autour de l'ouverture : on reprend la matière du mur voisin dans l'alignement.
    if (win) {
      let K = null; const [nx, nz] = b.inner;
      for (const s of [1, -1]) { const k = edgeWall(b.x + px * s, b.z + pz * s, nx + px * s, nz + pz * s); if (k && !wallDef(k).see) { K = wallDef(k); break; } }
      const lateralBlock = [1, -1].map((s) => tType(b.x + px * s, b.z + pz * s) === T_BLOCK);
      let matOut, matIn, h;
      if (K) { matOut = fv(K.out || 'concrete'); matIn = K.in ? fv(K.in) : matOut; h = Math.max(K.h || 3, MAP.roof[ti(nx, nz)] ? roomCeil(nx, nz) + 0.35 : 0); }
      else { const st = (M.styleDefs || [])[MAP.style[ti(b.x + px, b.z + pz)]] || {}; matOut = fv(st.block || 'concrete'); matIn = matOut; h = lateralBlock.some(Boolean) ? blockH(ti(b.x + px, b.z + pz)) : 3; }
      const inRoof = MAP.roof[ti(nx, nz)], mIn = inRoof ? matIn : matOut;
      const o0 = 0.15, o1 = 1.85, y0 = SILL_H, y1 = 2.25;
      // Pièces du mur (vues de l'intérieur et de l'extérieur) sur la ligne du bord intérieur.
      const seg = (a0, a1, py0, py1) => {
        const A = (a) => [ix + px * (a - 1), iz + pz * (a - 1)];
        const [xa, za] = A(a0), [xb, zb] = A(a1);
        qb(mIn).wall(xa - dx * E, za - dz * E, xb - dx * E, zb - dz * E, py0, py1, -dx, -dz, py0 < 0.1);
        qb(matOut).wall(xa + dx * E, za + dz * E, xb + dx * E, zb + dz * E, py0, py1, dx, dz, py0 < 0.1);
      };
      seg(-E, 2 + E, 0, y0); seg(-E, 2 + E, y1, h); seg(-E, o0, y0, y1); seg(o1, 2 + E, y0, y1);
      const topM = qb(inRoof ? fv(M.roofTex || 'concrete') : matOut);
      { const xa = ix - px * (1 + E), za = iz - pz * (1 + E), xb = ix + px * (1 + E), zb = iz + pz * (1 + E); topM.flat(Math.min(xa, xb) - Math.abs(dx) * E, Math.min(za, zb) - Math.abs(dz) * E, Math.max(xa, xb) + Math.abs(dx) * E, Math.max(za, zb) + Math.abs(dz) * E, h, 1); }
      // Appui, linteau et montants en bois.
      const ry = Math.atan2(px, pz) - Math.PI / 2;
      trimB.add(ix + dx * 0.04, y0 + 0.03, iz + dz * 0.04, ry, 0, 0, 1.75, 0.07, 0.3);
      trimB.add(ix, y1 - 0.04, iz, ry, 0, 0, 1.75, 0.09, 0.22);
      for (const o of [o0, o1]) trimB.add(ix + px * (o - 1), (y0 + y1) / 2, iz + pz * (o - 1), ry, 0, 0, 0.08, y1 - y0, 0.24);
      // Sous l'appui côté extérieur : un rebord de terre/gravats pour que l'enjambement se lise.
    } else {
      // Poteaux à la hauteur de la clôture voisine (grillage haut, rambarde basse…).
      let fh = 0; for (const s2 of [1, -1]) { const k = edgeWall(b.x + px * s2, b.z + pz * s2, b.inner[0] + px * s2, b.inner[1] + pz * s2); if (k) fh = Math.max(fh, wallDef(k).h || 0); }
      b.postH = fh ? clamp(fh + 0.1, 1.2, 2.4) : 2.3;
      for (const o of [-0.98, 0.98]) posts.add(ix + dx * 0.05 + px * o, b.postH / 2, iz + dz * 0.05 + pz * o, 0, 0, 0, 1, b.postH, 1);
      // Accès en pente : passerelle de planches qui descend vers l'eau ou la rive.
      if (b.look === 'slope') {
        const gb = slopeGB ||= new GB();
        gb.grid(3, 6, (s, v) => { const lat = (s - 0.5) * (TILE - 0.2), x = cx + px * lat + dx * (v - 0.5) * TILE, z = cz + pz * lat + dz * (v - 0.5) * TILE, y = smooth(clamp((v - 0.15) / 0.85, 0, 1)) * b.outH + 0.03; return { p: [x, y, z], uv: [(s + v * 3) * 0.5, v * 3], c: [0.8, 0.8, 0.8] }; });
        fixWinding(gb);
      }
    }
    b.plankM = [];
    const top = win ? 2.08 : Math.min(1.92, (b.postH || 2.3) - 0.12), ang = [0.16, -0.12, 0.22, -0.26, 0.06, -0.18], hs = win ? [0.85, 1.1, 1.35, 1.6, 1.85, 2.08] : [0, 1, 2, 3, 4, 5].map((k) => 0.3 + (top - 0.3) * k / 5);
    const ry = Math.atan2(px, pz) - Math.PI / 2;
    for (let k = 0; k < 6; k++) {
      _e1.set(0, ry, ang[k] * (win ? 0.6 : 1) + rand(-0.04, 0.04), 'YXZ'); _q1.setFromEuler(_e1);
      const off = win ? -0.14 - (k % 2) * 0.03 : (k % 2 ? 0.05 : -0.02);
      const m = new THREE.Matrix4().compose(_v1.set(ix - dx * off, hs[k], iz - dz * off), _q1, _v2.set(1, 1, 1));
      b.plankM.push(m); WORLD.planks.setMatrixAt(b.id * 6 + k, m);
    }
    b.plankAnim = new Array(6).fill(1); b.plankShown = new Array(6).fill(true);
  }
  WORLD.planks.instanceMatrix.setUsage(THREE.DynamicDrawUsage); R.scene.add(WORLD.planks);
  posts.build(); trimB.build();
  if (slopeGB) mesh(slopeGB.geo(), MATS.boards, 0, 0, 0, 0, R.scene, true);
}

// Eau : plan réfléchissant dont la carte de relief défile (houle).
function buildWater() {
  const W = M.water, S = 256;
  const p = paint(S, (u, v) => { const h = tfbm(u * 6, v * 6, 6, 4) * 0.7 + tfbm(u * 17 + 3, v * 17, 17, 2) * 0.3; return [0.5, 0.5, 0.5, h]; });
  const nm = normalFromHeight(p.height, S, 3); nm.repeat.set(90, 90);
  const mat = new THREE.MeshStandardMaterial({ color: W.color, roughness: W.rough ?? 0.12, metalness: W.metal ?? 0.55, normalMap: nm, normalScale: new THREE.Vector2(0.9, 0.9), transparent: !!W.opacity, opacity: W.opacity || 1 });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(1600, 1600, 1, 1), mat); m.rotation.x = -Math.PI / 2; m.position.set(MAP_W, W.y, MAP_D); m.receiveShadow = true; R.scene.add(m);
  WORLD.water = { mat, nm, speed: W.speed ?? 0.012 };
}

// Paroi rocheuse bosselée : face de carreau subdivisée, déplacée le long de la normale (bruit continu d'un carreau à l'autre).
function roughFace(q, tx, tz, dx, dz, y0, y1, amp) {
  const T = TILE, nu = 3, nv = Math.max(3, Math.round((y1 - y0) / 0.9)), sc = q.mat.userData.scale || 4;
  const X = dx > 0 ? (tx + 1) * T : dx < 0 ? tx * T : null, Z = dz > 0 ? (tz + 1) * T : dz < 0 ? tz * T : null;
  const P = (s, v) => { const px = X ?? tx * T + s * T, pz = Z ?? tz * T + s * T, py = y0 + v * (y1 - y0); const edge = Math.min(v * 4, 1) * Math.min((1 - v) * 3 + 0.2, 1); const d = (fbm(px * 0.45 + py * 0.3, pz * 0.45 - py * 0.2, 3) - 0.5) * 2 * amp * edge; return [px + dx * d, py, pz + dz * d]; };
  for (let j = 0; j < nv; j++) for (let i = 0; i < nu; i++) {
    const a = P(i / nu, j / nv), b = P((i + 1) / nu, j / nv), c = P((i + 1) / nu, (j + 1) / nv), d = P(i / nu, (j + 1) / nv);
    const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2], vx = d[0] - a[0], vy = d[1] - a[1], vz = d[2] - a[2];
    let n = [uy * vz - uz * vy, uz * vx - ux * vz, ux * vy - uy * vx]; const l = Math.hypot(...n) || 1; n = n.map((v) => v / l); if (n[0] * dx + n[2] * dz < 0) n = n.map((v) => -v);
    const U = (p) => (dx ? p[2] : p[0]) / sc, V = (p) => p[1] / sc, ao = (p) => 0.6 + 0.4 * smooth(clamp((p[1] - y0) / 1.5, 0, 1));
    q.quad([a, b, c, d], n, [[U(a), V(a)], [U(b), V(b)], [U(c), V(c)], [U(d), V(d)]], [ao(a), ao(b), ao(c), ao(d)]);
  }
}
function roughTop(q, tx, tz, h, amp) {
  const T = TILE, sc = q.mat.userData.scale || 4, P = (s, v) => { const px = tx * T + s * T, pz = tz * T + v * T; return [px, h + (fbm(px * 0.3, pz * 0.3, 2) - 0.3) * amp * 2, pz]; };
  for (let j = 0; j < 2; j++) for (let i = 0; i < 2; i++) { const a = P(i / 2, j / 2), b = P((i + 1) / 2, j / 2), c = P((i + 1) / 2, (j + 1) / 2), d = P(i / 2, (j + 1) / 2); q.quad([a, b, c, d], [0, 1, 0], [a, b, c, d].map((p) => [p[0] / sc, p[2] / sc])); }
}
