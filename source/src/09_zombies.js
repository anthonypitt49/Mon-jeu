/* ═══════════════════ INFECTÉS : corps organiques, animation procédurale, chutes physiques, IA ═══════════════════
   Les corps sont « sculptés » par anneaux successifs (torse, bras, jambes) et déformés par un squelette
   de 20 os avec des poids lissés aux articulations. À la mort, une poupée de chiffon physique prend le relais. */

// Squelette : position de repos (monde) et parent. Le personnage regarde vers +Z, sa gauche est +X.
const BN = { hips: 0, spine: 1, chest: 2, neck: 3, head: 4, jaw: 5, clavL: 6, uArmL: 7, fArmL: 8, handL: 9, clavR: 10, uArmR: 11, fArmR: 12, handR: 13, thighL: 14, shinL: 15, footL: 16, thighR: 17, shinR: 18, footR: 19 };
const BONE_DEF = [
  [0, 0.98, 0, -1], [0, 1.1, -0.01, 0], [0, 1.32, -0.015, 1], [0, 1.54, -0.005, 2], [0, 1.65, 0.015, 3], [0, 1.64, 0.035, 4],
  [0.035, 1.49, 0.02, 2], [0.19, 1.46, -0.01, 6], [0.205, 1.18, -0.015, 7], [0.21, 0.93, 0, 8],
  [-0.035, 1.49, 0.02, 2], [-0.19, 1.46, -0.01, 10], [-0.205, 1.18, -0.015, 11], [-0.21, 0.93, 0, 12],
  [0.095, 0.93, 0, 0], [0.1, 0.5, 0.01, 14], [0.1, 0.085, -0.02, 15],
  [-0.095, 0.93, 0, 0], [-0.1, 0.5, 0.01, 17], [-0.1, 0.085, -0.02, 18],
];
const ZV = {}; // géométries par variante
let ZMAT, ZMAT_SKIN, ZMAT_FROZEN, ZEYE_GEO, SOLDIER_MATS;

/* ─── Constructeur de corps : anneaux lissés, pondération par os, deux matériaux (tissu, peau) ─── */
class BodyBuilder {
  constructor(detail) { this.d = detail; this.p = []; this.n = []; this.uv = []; this.c = []; this.si = []; this.sw = []; this.groups = [[], []]; this.count = 0; }
  vert(x, y, z, nx, ny, nz, u, v, col, w) {
    this.p.push(x, y, z); this.n.push(nx, ny, nz); this.uv.push(u, v); this.c.push(col[0], col[1], col[2]);
    const ws = w.slice(0, 4); while (ws.length < 4) ws.push([0, 0]);
    const tot = ws.reduce((s, q) => s + q[1], 0) || 1;
    ws.forEach(([b, wt]) => { this.si.push(b); this.sw.push(wt / tot); });
    return this.count++;
  }
  // Anneaux : { c:[x,y,z], rx, rz, w:[[os,poids]...], col, p (exposant de super-ellipse), cut (tissu déchiré → peau) }
  loft(rings, segs, matFn, { closeStart = false, closeEnd = false, uScale = 2, noise = 0 } = {}) {
    const frames = rings.map((r, i) => {
      const a = rings[Math.max(0, i - 1)].c, b = rings[Math.min(rings.length - 1, i + 1)].c;
      const t = _v1.set(b[0] - a[0], b[1] - a[1], b[2] - a[2]).normalize().clone();
      const ref = Math.abs(t.z) > 0.9 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(0, 0, 1);
      const s = new THREE.Vector3().crossVectors(ref, t).normalize(), f = new THREE.Vector3().crossVectors(t, s).normalize();
      return { t, s, f };
    });
    let len = 0; const base = this.count, per = segs + 1;
    rings.forEach((r, i) => {
      if (i > 0) { const q = rings[i - 1].c; len += Math.hypot(r.c[0] - q[0], r.c[1] - q[1], r.c[2] - q[2]); }
      const { s, f } = frames[i], pe = r.p || 2;
      for (let k = 0; k <= segs; k++) {
        const a = (k / segs) * TAU, ca = Math.cos(a), sa = Math.sin(a);
        const ex = Math.sign(ca) * Math.pow(Math.abs(ca), 2 / pe), ez = Math.sign(sa) * Math.pow(Math.abs(sa), 2 / pe);
        const bump = noise ? 1 + (vnoise(r.c[1] * 30 + k * 0.7, i * 1.3 + r.c[0] * 20) - 0.5) * noise : 1;
        const x = r.c[0] + (s.x * ex * r.rx + f.x * ez * r.rz) * bump, y = r.c[1] + (s.y * ex * r.rx + f.y * ez * r.rz) * bump, z = r.c[2] + (s.z * ex * r.rx + f.z * ez * r.rz) * bump;
        const nn = _v2.set(s.x * ca / r.rx + f.x * sa / r.rz, s.y * ca / r.rx + f.y * sa / r.rz, s.z * ca / r.rx + f.z * sa / r.rz).normalize();
        const col = typeof r.col === 'function' ? r.col(a, x, y, z) : r.col;
        this.vert(x, y, z, nn.x, nn.y, nn.z, (k / segs) * uScale * (r.rx + r.rz) * 3, len * 2, col, r.w);
      }
    });
    // Sens des faces : vers l'extérieur.
    const P = this.p, i0 = base * 3, i1 = (base + 1) * 3, i2 = (base + per) * 3;
    const e1 = [P[i2] - P[i0], P[i2 + 1] - P[i0 + 1], P[i2 + 2] - P[i0 + 2]], e2 = [P[i1] - P[i0], P[i1 + 1] - P[i0 + 1], P[i1 + 2] - P[i0 + 2]];
    const cr = [e1[1] * e2[2] - e1[2] * e2[1], e1[2] * e2[0] - e1[0] * e2[2], e1[0] * e2[1] - e1[1] * e2[0]];
    const out = [P[i0] - rings[0].c[0], P[i0 + 1] - rings[0].c[1], P[i0 + 2] - rings[0].c[2]];
    const flip = cr[0] * out[0] + cr[1] * out[1] + cr[2] * out[2] < 0;
    for (let i = 0; i < rings.length - 1; i++) for (let k = 0; k < segs; k++) {
      const a = base + i * per + k, b = a + 1, c = a + per, d = c + 1, g = this.groups[matFn ? matFn(i, k, segs) : 0];
      if (flip) g.push(a, b, c, b, d, c); else g.push(a, c, b, b, c, d);
    }
    const cap = (ri, dir) => {
      const r = rings[ri], ctr = this.vert(r.c[0], r.c[1], r.c[2], frames[ri].t.x * dir, frames[ri].t.y * dir, frames[ri].t.z * dir, 0.5, 0.5, typeof r.col === 'function' ? r.col(0, ...r.c) : r.col, r.w), g = this.groups[matFn ? matFn(Math.max(0, ri - 1), 0, segs) : 0];
      for (let k = 0; k < segs; k++) { const a = base + ri * per + k, b = a + 1; if ((dir > 0) !== flip) g.push(ctr, a, b); else g.push(ctr, b, a); }
    };
    if (closeStart) cap(0, -1); if (closeEnd) cap(rings.length - 1, 1);
  }
  // Géométrie Three.js existante, entièrement liée à un os (ou fonction de poids par sommet).
  add(geo, mat, col, w, m) {
    geo = geo.index ? geo : geo; const g = geo.clone(); if (m) g.applyMatrix4(m);
    const pa = g.attributes.position, na = g.attributes.normal, ua = g.attributes.uv, base = this.count;
    for (let i = 0; i < pa.count; i++) {
      const x = pa.getX(i), y = pa.getY(i), z = pa.getZ(i);
      this.vert(x, y, z, na.getX(i), na.getY(i), na.getZ(i), ua ? ua.getX(i) : 0, ua ? ua.getY(i) : 0, typeof col === 'function' ? col(x, y, z) : col, typeof w === 'function' ? w(x, y, z) : w);
    }
    const idx = g.index ? Array.from(g.index.array) : [...Array(pa.count).keys()];
    const grp = this.groups[mat]; for (const i of idx) grp.push(base + i);
  }
  geo() {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.p, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(this.n, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(this.uv, 2)); g.setAttribute('color', new THREE.Float32BufferAttribute(this.c, 3));
    g.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(this.si, 4)); g.setAttribute('skinWeight', new THREE.Float32BufferAttribute(this.sw, 4));
    const idx = [...this.groups[0], ...this.groups[1]]; g.setIndex(idx);
    // Part de peau par sommet (1 = peau, 0 = tissu) : un seul matériau, un seul appel de dessin.
    const sk = new Float32Array(this.count), tot = new Float32Array(this.count);
    for (const i of this.groups[0]) tot[i]++;
    for (const i of this.groups[1]) { tot[i]++; sk[i]++; }
    for (let i = 0; i < this.count; i++) sk[i] = tot[i] ? sk[i] / tot[i] : 0;
    g.setAttribute('aSkin', new THREE.BufferAttribute(sk, 1));
    g.computeBoundingSphere();
    return g;
  }
}
const mat4 = (x, y, z, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1) => new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)), new THREE.Vector3(sx, sy, sz));
const blendW = (y, y0, y1, a, b) => { const k = smooth(clamp((y - y0) / (y1 - y0), 0, 1)); return [[a, 1 - k], [b, k]]; };
const gauss = (x, y, z, cx, cy, cz, s) => Math.exp(-((x - cx) ** 2 + (y - cy) ** 2 + (z - cz) ** 2) / (s * s));

function buildBody(o) {
  const hi = settings.quality >= 1, B = new BodyBuilder(hi), rnd = o.rnd, bulk = o.bulk || 1;
  const segT = hi ? 16 : 10, segL = hi ? 10 : 7, segF = hi ? 5 : 4;
  const coat = o.coat, dark = coat.map((v) => v * 0.55), skin = o.skin, trous = o.trousers || coat.map((v) => v * 0.85), puttee = o.puttee || [0.36, 0.33, 0.26], leather = [0.2, 0.13, 0.08], boot = [0.1, 0.08, 0.07];
  const hunch = o.soldier ? 0 : 0.05;
  const shade = (c, k) => [c[0] * k, c[1] * k, c[2] * k];
  const clothCol = (base) => (a, x, y, z) => {
    let k = 0.86 + vnoise(x * 18 + 3, y * 18 + z * 11) * 0.28;
    let c = shade(base, k);
    if (o.blood && y > 1.05 && y < 1.5 && z > 0.02 && vnoise(x * 7 + 11, y * 7) > 0.52) c = [0.22 + k * 0.05, 0.035, 0.035];
    if (o.frostCoat && y > 1.4 && vnoise(x * 14, z * 14 + 5) > 0.62) c = [0.62, 0.66, 0.7];
    return c;
  };
  // ── Torse ──
  const tor = [[0.8, 0.14, 0.105], [0.88, 0.16, 0.115], [0.96, 0.17, 0.12], [1.04, 0.158, 0.112], [1.12, 0.152, 0.108], [1.2, 0.16, 0.112], [1.28, 0.172, 0.12], [1.36, 0.185, 0.125], [1.43, 0.192, 0.122], [1.49, 0.18, 0.11], [1.535, 0.12, 0.085], [1.565, 0.07, 0.065]];
  const torW = (y) => (y < 0.98 ? [[BN.hips, 1]] : y < 1.1 ? blendW(y, 0.98, 1.1, BN.hips, BN.spine) : y < 1.22 ? [[BN.spine, 1]] : y < 1.32 ? blendW(y, 1.22, 1.32, BN.spine, BN.chest) : y < 1.52 ? [[BN.chest, 1]] : blendW(y, 1.52, 1.57, BN.chest, BN.neck));
  B.loft(tor.map(([y, rx, rz]) => ({ c: [0, y, 0.01 - Math.max(0, y - 1.25) * hunch * 0.6], rx: rx * bulk, rz: rz * bulk * (o.soldier ? 1 : 0.96), p: 2.6, w: torW(y), col: y > 1.0 && y < 1.045 ? leather : clothCol(coat) })), segT,
    o.ribs ? (i, k, n) => (i >= 4 && i <= 6 && k > n * 0.18 && k < n * 0.36 ? 1 : 0) : null, { noise: o.soldier ? 0.03 : 0.06 });
  // Cou
  B.loft([[1.53, 0.058], [1.6, 0.052], [1.68, 0.05]].map(([y, r]) => ({ c: [0, y, 0.01], rx: r * bulk, rz: r * bulk, w: y < 1.56 ? blendW(y, 1.5, 1.58, BN.chest, BN.neck) : blendW(y, 1.58, 1.68, BN.neck, BN.head), col: skin })), segL, () => 1);
  // Col de la capote
  B.loft([[1.5, 0.12, 0.1], [1.56, 0.1, 0.09], [1.6, 0.09, 0.085]].map(([y, rx, rz]) => ({ c: [0, y, 0.0], rx: rx * bulk, rz: rz * bulk, w: [[BN.chest, 0.6], [BN.neck, 0.4]], col: shade(coat, 0.8) })), segT, null);
  // ── Tête sculptée ──
  const hs = [0.095, 0.118, 0.106], hc = [0, 1.745, 0.022];
  const hg = new THREE.SphereGeometry(1, hi ? 22 : 14, hi ? 16 : 10), hp = hg.attributes.position;
  const sock = [];
  for (let i = 0; i < hp.count; i++) {
    let x = hp.getX(i), y = hp.getY(i), z = hp.getZ(i);
    if (z > 0.25) z *= 0.9 + (1 - z) * 0.1;
    if (z < 0 && y > -0.2) { z *= 1.06; y *= 1.02; }
    let push = 0.07 * (gauss(x, y, z, 0.36, 0.3, 0.9, 0.22) + gauss(x, y, z, -0.36, 0.3, 0.9, 0.22)); // arcades
    const eye = gauss(x, y, z, 0.34, 0.1, 0.95, 0.2) + gauss(x, y, z, -0.34, 0.1, 0.95, 0.2);
    push -= 0.16 * eye; // orbites creuses
    push += (o.noNose ? -0.06 : 0.13) * gauss(x * 2.2, y, z, 0, -0.05, 1, 0.24); // nez
    push += 0.05 * (gauss(x, y, z, 0.62, -0.1, 0.75, 0.25) + gauss(x, y, z, -0.62, -0.1, 0.75, 0.25)); // pommettes
    push -= (o.soldier ? 0.03 : 0.08) * (gauss(x, y, z, 0.5, -0.38, 0.75, 0.22) + gauss(x, y, z, -0.5, -0.38, 0.75, 0.22)); // joues creusées
    push -= 0.07 * gauss(x * 1.5, y, z, 0, -0.45, 0.95, 0.18); // bouche
    push += 0.04 * gauss(x * 1.6, y, z, 0, -0.78, 0.75, 0.2); // menton
    const L = 1 + push; hp.setXYZ(i, x * L, y * L, z * L); sock.push(eye);
  }
  hg.computeVertexNormals();
  const headCol = (i) => (x, y, z) => {
    const lx = (x - hc[0]) / hs[0], ly = (y - hc[1]) / hs[1], lz = (z - hc[2]) / hs[2];
    let c = shade(skin, 0.85 + vnoise(lx * 5 + 7, ly * 5 + lz * 3) * 0.3);
    const e = gauss(lx, ly, lz, 0.34, 0.1, 0.95, 0.3) + gauss(lx, ly, lz, -0.34, 0.1, 0.95, 0.3);
    c = [lerp(c[0], 0.12, clamp(e, 0, 1) * 0.85), lerp(c[1], 0.07, clamp(e, 0, 1) * 0.85), lerp(c[2], 0.1, clamp(e, 0, 1) * 0.85)];
    const m = gauss(lx * 1.4, ly, lz, 0, -0.45, 0.95, 0.2); c = [lerp(c[0], 0.25, m), lerp(c[1], 0.05, m), lerp(c[2], 0.06, m)];
    if (o.hair && ly > 0.15 && lz < 0.75) { const h = vnoise(lx * 9, lz * 9 + 3) > 0.35 ? 1 : 0.4; c = [lerp(c[0], 0.08, h * 0.9), lerp(c[1], 0.07, h * 0.9), lerp(c[2], 0.06, h * 0.9)]; }
    return c;
  };
  const headW = (x, y, z) => { const ly = (y - hc[1]) / hs[1], lz = (z - hc[2]) / hs[2]; if (lz < -0.1) return [[BN.head, 1]]; const k = smooth(clamp((-0.3 - ly) / 0.18, 0, 1)); return k > 0 ? [[BN.head, 1 - k], [BN.jaw, k]] : [[BN.head, 1]]; };
  B.add(hg, 1, headCol(), headW, mat4(hc[0], hc[1], hc[2], 0, 0, 0, hs[0] * bulk, hs[1] * bulk, hs[2] * bulk));
  // Oreilles, dents, intérieur de bouche
  for (const s of [-1, 1]) B.add(new THREE.SphereGeometry(1, 6, 5), 1, shade(skin, 0.8), [[BN.head, 1]], mat4(s * 0.094 * bulk, 1.748, 0.0, 0, 0, 0, 0.012, 0.03, 0.02));
  const mouthZ = hc[2] + hs[2] * 0.86;
  B.add(new THREE.SphereGeometry(1, 8, 6), 1, [0.08, 0.02, 0.02], [[BN.head, 0.5], [BN.jaw, 0.5]], mat4(0, 1.69, mouthZ - 0.03, 0, 0, 0, 0.03, 0.02, 0.025));
  const tooth = new THREE.BoxGeometry(0.009, 0.013, 0.006);
  for (let k = -3; k <= 3; k++) {
    if (!o.soldier && rnd() < 0.25) continue;
    const ang = k * 0.24, tx = Math.sin(ang) * 0.026, tz = mouthZ - 0.012 - (1 - Math.cos(ang)) * 0.03;
    B.add(tooth, 1, [0.62, 0.58, 0.45], [[BN.head, 1]], mat4(tx, 1.7, tz, 0, ang, 0));
    B.add(tooth, 1, [0.58, 0.54, 0.42], [[BN.jaw, 1]], mat4(tx * 0.9, 1.678, tz - 0.004, 0, ang, 0));
  }
  // Coiffes
  const helmC = o.helmetCol || [0.24, 0.26, 0.2];
  const chip = (x, y, z) => (vnoise(x * 60, z * 60 + y * 30) > 0.72 ? [0.36, 0.33, 0.28] : shade(helmC, 0.9 + vnoise(x * 20, z * 20) * 0.2));
  if (o.helmet) {
    B.add(new THREE.SphereGeometry(0.128, hi ? 18 : 10, hi ? 7 : 4, 0, TAU, 0, Math.PI / 2), 0, chip, [[BN.head, 1]], mat4(0, 1.785, 0.012, -0.1, 0, 0, bulk, 0.82 * bulk, 1.06 * bulk));
    B.add(new THREE.CylinderGeometry(0.165, 0.17, 0.012, hi ? 22 : 12), 0, chip, [[BN.head, 1]], mat4(0, 1.788, 0.012, -0.1, 0, 0, bulk, 1, 1.05 * bulk));
    B.add(new THREE.TorusGeometry(0.1, 0.004, 4, 16, Math.PI), 0, leather, [[BN.head, 0.6], [BN.jaw, 0.4]], mat4(0, 1.75, 0.03, 0, Math.PI / 2, Math.PI, 1.02, 1.05, 1));
  } else if (o.cap) {
    B.add(new THREE.CylinderGeometry(0.108, 0.1, 0.075, 14), 0, o.capCol || [0.36, 0.12, 0.12], [[BN.head, 1]], mat4(0, 1.83, 0.005, -0.15, 0, 0));
    B.add(new THREE.BoxGeometry(0.12, 0.008, 0.06), 0, [0.08, 0.07, 0.06], [[BN.head, 1]], mat4(0, 1.8, 0.11, 0.25, 0, 0));
  }
  if (o.gasmask) {
    B.add(new THREE.SphereGeometry(0.11, 14, 10, -Math.PI / 2, Math.PI, 0.35 * Math.PI, 0.55 * Math.PI), 0, [0.25, 0.25, 0.2], [[BN.head, 0.7], [BN.jaw, 0.3]], mat4(0, 1.72, 0.03, 0, Math.PI / 2, 0, 1.02, 1.05, 1.15));
    for (const s of [-1, 1]) { B.add(new THREE.TorusGeometry(0.024, 0.006, 6, 14), 0, [0.2, 0.18, 0.14], [[BN.head, 1]], mat4(s * 0.036, 1.764, 0.108)); B.add(new THREE.CircleGeometry(0.022, 12), 1, [0.05, 0.02, 0.02], [[BN.head, 1]], mat4(s * 0.036, 1.764, 0.109)); }
    B.add(new THREE.CylinderGeometry(0.03, 0.034, 0.07, 12), 0, [0.3, 0.3, 0.26], [[BN.jaw, 1]], mat4(0, 1.645, 0.12, 0.6, 0, 0));
  }
  // ── Bras et mains ──
  for (const sd of [1, -1]) {
    const cl = sd > 0 ? BN.clavL : BN.clavR, ua = sd > 0 ? BN.uArmL : BN.uArmR, fa = sd > 0 ? BN.fArmL : BN.fArmR, ha = sd > 0 ? BN.handL : BN.handR;
    if (o.armless && sd < 0) { B.add(new THREE.SphereGeometry(0.06, 8, 6), 1, [0.3, 0.05, 0.05], [[ua, 1]], mat4(sd * 0.2 * bulk, 1.42, -0.01)); continue; }
    const X = (x) => sd * x * (bulk > 1 ? 1.08 : 1);
    const sleeveEnd = o.tornSleeves ? 1.14 : 0.97;
    const armR = [
      [X(0.165), 1.5, -0.01, 0.062, 0.06, [[cl, 0.5], [ua, 0.5]]], [X(0.19), 1.46, -0.01, 0.064, 0.06, [[cl, 0.25], [ua, 0.75]]],
      [X(0.198), 1.38, -0.012, 0.058, 0.055, [[ua, 1]]], [X(0.201), 1.29, -0.012, 0.053, 0.05, [[ua, 1]]],
      [X(0.204), 1.21, -0.014, 0.047, 0.046, [[ua, 0.85], [fa, 0.15]]], [X(0.205), 1.18, -0.015, 0.045, 0.046, [[ua, 0.5], [fa, 0.5]]],
      [X(0.206), 1.14, -0.014, 0.046, 0.045, [[ua, 0.15], [fa, 0.85]]], [X(0.207), 1.07, -0.012, 0.047, 0.042, [[fa, 1]]],
      [X(0.209), 0.99, -0.006, 0.039, 0.034, [[fa, 1]]], [X(0.21), 0.95, 0, 0.032, 0.028, [[fa, 0.5], [ha, 0.5]]],
    ];
    B.loft(armR.map(([x, y, z, rx, rz, w]) => ({ c: [x, y, z], rx: rx * bulk, rz: rz * bulk, w, col: y > sleeveEnd ? clothCol(coat) : skin })), segL,
      (i) => (armR[i][1] > sleeveEnd ? 0 : 1), { noise: 0.05 });
    if (!o.tornSleeves) B.loft([[sleeveEnd + 0.015, 0.05], [sleeveEnd - 0.01, 0.05]].map(([y, r]) => ({ c: [X(0.209), y, -0.006], rx: r * bulk, rz: r * 0.9 * bulk, w: [[fa, 1]], col: shade(coat, 0.75) })), segL, null);
    // Main : paume et doigts recourbés (griffes pour les infectés).
    const glove = o.gloves ? [0.14, 0.12, 0.1] : skin;
    const palm = [[0.95, 0.018, 0.036], [0.91, 0.02, 0.042], [0.875, 0.017, 0.04]];
    B.loft(palm.map(([y, rx, rz]) => ({ c: [X(0.21), y, 0.004], rx: rx * bulk, rz: rz * bulk, w: [[ha, 1]], col: glove })), segF + 2, () => 1, { closeEnd: true });
    for (let f = 0; f < 4; f++) {
      const fz = -0.027 + f * 0.018, curl = o.soldier ? 0.4 : 0.9, fl = [0.036, 0.04, 0.038, 0.03][f];
      const pts = [0, 1, 2, 3].map((k) => { const t = k / 3, ang = t * curl; return [X(0.21 - Math.sin(ang) * 0.02 * t), 0.875 - Math.sin((Math.PI / 2) * t) * fl * (1 - ang * 0.2), fz + (sd > 0 ? 0 : 0)]; });
      B.loft(pts.map((pp, k) => ({ c: pp, rx: 0.0085 * (1 - k * 0.12) * bulk, rz: 0.0085 * (1 - k * 0.12) * bulk, w: [[ha, 1]], col: k === 3 && !o.gloves ? [0.18, 0.14, 0.12] : glove })), segF, () => 1, { closeEnd: true });
    }
    B.loft([[X(0.2), 0.92, 0.038], [X(0.193), 0.895, 0.052], [X(0.188), 0.875, 0.06]].map((pp, k) => ({ c: pp, rx: 0.01 * bulk, rz: 0.01 * bulk, w: [[ha, 1]], col: glove })), segF, () => 1, { closeEnd: true });
  }
  // ── Jambes, bandes molletières, brodequins ──
  for (const sd of [1, -1]) {
    const th = sd > 0 ? BN.thighL : BN.thighR, sh = sd > 0 ? BN.shinL : BN.shinR, ft = sd > 0 ? BN.footL : BN.footR, X = (x) => sd * x;
    const legR = [
      [0.99, 0.09, 0.095, [[BN.hips, 0.6], [th, 0.4]]], [0.9, 0.088, 0.09, [[th, 1]]], [0.78, 0.08, 0.082, [[th, 1]]], [0.64, 0.066, 0.07, [[th, 1]]],
      [0.54, 0.058, 0.06, [[th, 0.8], [sh, 0.2]]], [0.5, 0.056, 0.058, [[th, 0.5], [sh, 0.5]]], [0.46, 0.055, 0.057, [[th, 0.15], [sh, 0.85]]],
      [0.38, 0.056, 0.062, [[sh, 1]]], [0.26, 0.047, 0.05, [[sh, 1]]], [0.14, 0.04, 0.042, [[sh, 1]]], [0.09, 0.037, 0.038, [[sh, 0.5], [ft, 0.5]]],
    ];
    const legCol = (y) => (a, x, yy, z) => (y > 0.36 ? clothCol(trous)(a, x, yy, z) : shade(puttee, 0.85 + 0.2 * (Math.sin(yy * 180 + a * 1.5) > 0 ? 1 : 0.6)));
    B.loft(legR.map(([y, rx, rz, w]) => ({ c: [X(0.097 + (0.99 - y) * 0.004), y, y < 0.46 && y > 0.3 ? -0.006 : 0.004], rx: rx * bulk, rz: rz * bulk, w, col: legCol(y) })), segL, null, { noise: 0.04 });
    const bootR = [[-0.075, 0.05, 0.042, 0.045], [-0.02, 0.055, 0.047, 0.05], [0.06, 0.045, 0.047, 0.04], [0.13, 0.038, 0.043, 0.03], [0.155, 0.036, 0.034, 0.024]];
    B.loft(bootR.map(([z, y, rx, rz]) => ({ c: [X(0.1), y, z], rx: rx * bulk, rz, p: 3, w: [[ft, 1]], col: boot })), segL, null, { closeStart: true, closeEnd: true });
  }
  // ── Pans de capote : ils suivent les cuisses ──
  if (o.skirt !== false) {
    const sk = [[1.06, 0.175, 0.13], [0.96, 0.2, 0.145], [0.84, 0.22, 0.16], [0.72, 0.235, 0.172], [0.6, 0.25, 0.18]];
    const hemY = 0.52 + (o.soldier ? 0.1 : 0);
    const skirtRings = sk.map(([y, rx, rz], i) => ({ c: [0, i === sk.length - 1 ? hemY : y, 0.005], rx: rx * bulk, rz: rz * bulk, p: 2.2, w: [[BN.hips, 1]], col: clothCol(coat) }));
    const before = B.count;
    B.loft(skirtRings, segT, null);
    // Poids : le bas du manteau accompagne la jambe de son côté ; ourlet déchiré.
    for (let v = before; v < B.count; v++) {
      const x = B.p[v * 3], y = B.p[v * 3 + 1];
      const k = smooth(clamp((0.98 - y) / 0.4, 0, 1)), side = x >= 0 ? BN.thighL : BN.thighR, other = x >= 0 ? BN.thighR : BN.thighL, mid = 1 - Math.min(1, Math.abs(x) / 0.12);
      const wSide = k * (1 - mid * 0.5), wOther = k * mid * 0.5;
      B.si.splice(v * 4, 4, BN.hips, side, other, 0); B.sw.splice(v * 4, 4, 1 - k, wSide, wOther, 0);
      if (y < 0.62) { const tear = o.soldier ? 0.02 : 0.1; B.p[v * 3 + 1] = y + vnoise(v * 0.9, 3.3) * tear + (!o.soldier && vnoise(v * 0.37, 8.1) > 0.7 ? 0.12 : 0); }
    }
  }
  // Ceinturon, cartouchières, gourde, sac.
  for (const s of [-1, 1]) B.add(new THREE.BoxGeometry(0.075, 0.07, 0.04), 0, leather, [[BN.hips, 0.5], [BN.spine, 0.5]], mat4(s * 0.085 * bulk, 1.02, 0.12 * bulk));
  B.add(new THREE.CylinderGeometry(0.04, 0.04, 0.12, 10), 0, [0.3, 0.3, 0.26], [[BN.hips, 1]], mat4(-0.17 * bulk, 0.96, 0.02, 0, 0, 0.15));
  if (o.straps) for (const s of [-1, 1]) B.add(new THREE.BoxGeometry(0.035, 0.52, 0.012), 0, leather, [[BN.chest, 0.7], [BN.spine, 0.3]], mat4(s * 0.06, 1.27, 0.128 * bulk, 0.05, 0, s * 0.33));
  if (o.pack) { B.add(new THREE.BoxGeometry(0.28, 0.3, 0.13), 0, [0.52, 0.52, 0.48], [[BN.chest, 1]], mat4(0, 1.32, -0.2)); B.add(new THREE.CylinderGeometry(0.05, 0.05, 0.3, 10), 0, [0.38, 0.36, 0.3], [[BN.chest, 1]], mat4(0, 1.5, -0.19, 0, 0, Math.PI / 2)); }
  if (o.armor) {
    B.add(new THREE.SphereGeometry(0.22, 12, 8, -0.6, 1.2 + Math.PI / 2 - 0.2, 0.25 * Math.PI, 0.45 * Math.PI), 0, [0.2, 0.2, 0.19], [[BN.chest, 1]], mat4(0, 1.32, 0.02, 0, 0, 0, 1.25, 1.3, 0.85));
    for (const s of [-1, 1]) B.add(new THREE.SphereGeometry(0.09, 10, 6, 0, TAU, 0, Math.PI / 2), 0, [0.22, 0.22, 0.2], [[s > 0 ? BN.uArmL : BN.uArmR, 1]], mat4(s * 0.23, 1.47, -0.01, 0, 0, -s * 0.5, 1, 0.7, 1));
  }
  return B.geo();
}

// Matériau unique tissu + peau : la texture et la rugosité suivent l'attribut aSkin.
function bodyMaterial(snow) {
  const m = snowify(new THREE.MeshStandardMaterial({ vertexColors: true, map: TEX.cloth.map, normalMap: TEX.cloth.normalMap, normalScale: new THREE.Vector2(0.8, 0.8), roughness: 0.92 }), snow);
  const snowCompile = m.onBeforeCompile;
  m.onBeforeCompile = (sh, r) => {
    snowCompile(sh, r);
    sh.uniforms.uSkinMap = { value: TEX.skin.map }; sh.uniforms.uSkinNormal = { value: TEX.skin.normalMap };
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute float aSkin; varying float vSkin;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvSkin = aSkin;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying float vSkin; uniform sampler2D uSkinMap; uniform sampler2D uSkinNormal;')
      .replace('#include <map_fragment>', '#ifdef USE_MAP\n  diffuseColor *= mix(texture2D(map, vMapUv), texture2D(uSkinMap, vMapUv), vSkin);\n#endif')
      .replace('#include <normal_fragment_maps>', THREE.ShaderChunk.normal_fragment_maps.split('texture2D( normalMap, vNormalMapUv )').join('mix(texture2D( normalMap, vNormalMapUv ), texture2D( uSkinNormal, vNormalMapUv ), vSkin)'))
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = mix(roughnessFactor, 0.66, vSkin);')
      .replace('float snowF = smoothstep', 'float snowF = (1.0 - vSkin * 0.7) * smoothstep');
  };
  m.customProgramCacheKey = () => 'snowify-skin';
  return m;
}
function buildZombieAssets() {
  // Peau : marbrures, veines, gerçures.
  const skinTex = paint(Q.texSize / 2, (u, v) => {
    const m = tfbm(u * 6, v * 6, 6, 4), vein = Math.abs(tfbm(u * 9 + 2, v * 9, 9, 3) - 0.5) < 0.02 ? 1 : 0, pore = hash2(u * 997, v * 991) > 0.93 ? 1 : 0;
    const bruise = smooth(clamp((tfbm(u * 3 + 5, v * 3, 3, 3) - 0.55) * 4, 0, 1)), rot = smooth(clamp((tfbm(u * 4, v * 4 + 7, 4, 3) - 0.6) * 5, 0, 1));
    const w = 0.66 + m * 0.42 - vein * 0.3 - pore * 0.06;
    return [w * (1 - vein * 0.25) * (1 - bruise * 0.25) * (1 - rot * 0.2), w * (1 - vein * 0.4) * (1 - bruise * 0.35) * (1 - rot * 0.05), w * (1 + vein * 0.1) * (1 - bruise * 0.1) * (1 - rot * 0.35), m * 0.5 + vein * 0.45 - pore * 0.2 - rot * 0.2];
  });
  TEX.skin = matSet(skinTex, 3);
  ZMAT = bodyMaterial(0.16);
  ZMAT_FROZEN = new THREE.MeshStandardMaterial({ color: 0xcfeaff, roughness: 0.12, metalness: 0.25, emissive: 0x2a6fb0, emissiveIntensity: 0.45, normalMap: TEX.snow.normalMap });
  SOLDIER_MATS = bodyMaterial(0.05);
  const eyes = [new THREE.SphereGeometry(0.011, 6, 4), new THREE.SphereGeometry(0.011, 6, 4)]; eyes[0].translate(0.034, 0.1, 0.088); eyes[1].translate(-0.034, 0.1, 0.088);
  ZEYE_GEO = mergeGeometries(eyes);
  const r = mulberry32(99);
  const coats = [[0.2, 0.21, 0.17], [0.25, 0.23, 0.18], [0.16, 0.18, 0.21], [0.23, 0.19, 0.14], [0.3, 0.3, 0.27], [0.17, 0.16, 0.13]];
  const sk = () => [0.42 + r() * 0.07, 0.45 + r() * 0.05, 0.5 + r() * 0.05];
  ZV.list = [
    buildBody({ rnd: r, coat: coats[0], skin: sk(), helmet: true, straps: true, blood: true }),
    buildBody({ rnd: r, coat: coats[1], skin: sk(), hair: true, tornSleeves: true, ribs: true }),
    buildBody({ rnd: r, coat: coats[2], skin: sk(), helmet: true, frostCoat: true, noNose: true }),
    buildBody({ rnd: r, coat: coats[3], skin: sk(), cap: true, straps: true }),
    buildBody({ rnd: r, coat: coats[4], skin: sk(), hair: true, armless: true, blood: true }),
    buildBody({ rnd: r, coat: coats[5], skin: sk(), helmet: true, gasmask: true, tornSleeves: true }),
  ];
  ZV.brute = buildBody({ rnd: r, coat: [0.13, 0.13, 0.12], skin: [0.38, 0.42, 0.48], helmet: true, gasmask: true, armor: true, blood: true, bulk: 1.22, straps: true });
  ZV.soldier = buildBody({ rnd: r, soldier: true, coat: [0.66, 0.68, 0.67], trousers: [0.6, 0.62, 0.6], puttee: [0.55, 0.56, 0.52], skin: [0.8, 0.66, 0.56], helmet: true, helmetCol: [0.78, 0.8, 0.8], gloves: true, straps: true, pack: true, hair: true, skirt: true });
}

/* ─── Squelette et rig ─── */
const BIND_DIR = {}; // direction de repos de certains os (pour la poupée de chiffon)
function makeRig(geo, mat) {
  const bones = BONE_DEF.map(([x, y, z, p]) => { const b = new THREE.Bone(); if (p < 0) b.position.set(x, y, z); else { const q = BONE_DEF[p]; b.position.set(x - q[0], y - q[1], z - q[2]); } return b; });
  BONE_DEF.forEach(([, , , p], i) => { if (p >= 0) bones[p].add(bones[i]); });
  const mesh = new THREE.SkinnedMesh(geo, mat);
  mesh.add(bones[0]); mesh.updateMatrixWorld(true);
  mesh.bind(new THREE.Skeleton(bones));
  mesh.castShadow = true; mesh.receiveShadow = true; mesh.frustumCulled = false;
  const holder = new THREE.Group(); holder.add(mesh);
  return { holder, mesh, bones };
}
const boneW = (i) => new THREE.Vector3(BONE_DEF[i][0], BONE_DEF[i][1], BONE_DEF[i][2]);

/* ─── Pose procédurale ─── */
function poseBody(b, p) {
  // p : { phase, run, lean, reach, attack, tear, crawl, rise, headTilt, t, limp, hold, moving, jaw, fl, aim, crouch }
  const s = Math.sin(p.phase), c = Math.cos(p.phase), mv = p.moving ?? 1, run = p.run;
  const A = lerp(0.4, 0.95, run) * mv;
  for (const q of b) q.rotation.set(0, 0, 0);
  b[BN.hips].position.set(Math.sin(p.phase) * 0.018 * mv, 0.98 - Math.abs(c) * 0.035 * mv - run * 0.07 - (p.crouch || 0) * 0.26, 0);
  b[BN.hips].rotation.set(0, s * 0.13 * mv, c * 0.06 * mv * (1 + p.limp));
  b[BN.spine].rotation.set(p.lean + run * 0.25, -s * 0.09 * mv, -c * 0.03 * mv);
  b[BN.chest].rotation.set(0.06 + run * 0.1, -s * 0.06 * mv, 0);
  b[BN.neck].rotation.set(-0.05 - run * 0.15, 0, 0);
  b[BN.head].rotation.set(-0.12 + Math.sin(p.t * 1.7) * 0.05 - run * 0.2, Math.sin(p.t * 0.9) * 0.18, p.headTilt + Math.sin(p.t * 1.1) * 0.05);
  b[BN.jaw].rotation.x = p.jaw ?? 0.12;
  // Jambes : balancement, genou, pied qui déroule.
  const kneeL = Math.max(0, Math.sin(p.phase + 1.35)) * (0.55 + run * 0.9) * mv + 0.06, kneeR = Math.max(0, -Math.sin(p.phase - 1.8)) * (0.55 + run * 0.9) * mv + 0.06;
  b[BN.thighL].rotation.set(-s * A - 0.04, 0, 0.03); b[BN.thighR].rotation.set(s * A * (1 - p.limp * 0.55) - 0.04, 0, -0.03);
  b[BN.shinL].rotation.x = kneeL; b[BN.shinR].rotation.x = kneeR * (1 - p.limp * 0.4);
  b[BN.footL].rotation.x = -kneeL * 0.35 + s * 0.2 * mv; b[BN.footR].rotation.x = -kneeR * 0.35 - s * 0.2 * mv + p.limp * 0.35;
  if (p.crouch) { const k = p.crouch; b[BN.thighL].rotation.x -= 1.1 * k; b[BN.thighR].rotation.x -= 1.1 * k; b[BN.shinL].rotation.x += 1.7 * k; b[BN.shinR].rotation.x += 1.7 * k; b[BN.footL].rotation.x -= 0.5 * k; b[BN.footR].rotation.x -= 0.5 * k; b[BN.spine].rotation.x += 0.3 * k; }
  // Bras.
  if (p.hold) { // soldat : fusil tenu à deux mains
    const aim = p.aim || 0;
    b[BN.spine].rotation.x += -aim * 0.3; b[BN.chest].rotation.x += -aim * 0.25; b[BN.head].rotation.x = -aim * 0.4 - 0.05;
    b[BN.uArmR].rotation.set(-0.95, 0, 0.35); b[BN.fArmR].rotation.x = -1.35; b[BN.handR].rotation.x = 0.2;
    b[BN.uArmL].rotation.set(-1.25, 0.2, -0.5); b[BN.fArmL].rotation.x = -0.7; b[BN.clavL].rotation.y = 0.2;
  } else if (run > 0.5 && !p.reach) {
    b[BN.uArmL].rotation.set(s * 0.95 - 0.3, 0, 0.14); b[BN.uArmR].rotation.set(-s * 0.95 - 0.3, 0, -0.14);
    b[BN.fArmL].rotation.x = -1.35 + s * 0.2; b[BN.fArmR].rotation.x = -1.35 - s * 0.2;
    b[BN.handL].rotation.x = 0.3; b[BN.handR].rotation.x = 0.3;
  } else {
    const r = p.reach ?? 1;
    b[BN.clavL].rotation.set(-0.1 * r, 0.1 * r, 0.06 * r); b[BN.clavR].rotation.set(-0.1 * r, -0.1 * r, -0.06 * r);
    b[BN.uArmL].rotation.set(lerp(s * 0.28, -1.28 + s * 0.12, r), 0, 0.12 + Math.sin(p.t * 1.3) * 0.06);
    b[BN.uArmR].rotation.set(lerp(-s * 0.28, -1.18 - s * 0.12, r), 0, -0.12 - Math.sin(p.t * 1.1) * 0.06);
    b[BN.fArmL].rotation.x = -0.3 - Math.sin(p.t * 2 + 1) * 0.12; b[BN.fArmR].rotation.x = -0.22 - Math.sin(p.t * 1.8) * 0.1;
    b[BN.handL].rotation.set(0.45 * r + 0.1, 0, 0.1); b[BN.handR].rotation.set(0.4 * r + 0.1, 0, -0.1);
  }
  if (p.attack > 0) { // lacération à deux bras, buste qui plonge, mâchoire ouverte
    const a = p.attack, sw = Math.sin(Math.min(1, a * 1.4) * Math.PI);
    b[BN.uArmL].rotation.x = lerp(-2.3, -0.4, a); b[BN.uArmR].rotation.x = lerp(-0.4, -2.3, a); b[BN.fArmL].rotation.x = -0.5; b[BN.fArmR].rotation.x = -0.5;
    b[BN.spine].rotation.x += sw * 0.35; b[BN.chest].rotation.y = (a - 0.5) * 0.8; b[BN.jaw].rotation.x = 0.45 * sw + 0.1;
  }
  if (p.tear > 0) { const k = Math.sin(p.t * 7); b[BN.uArmL].rotation.x = -1.6 + k * 0.45; b[BN.uArmR].rotation.x = -1.6 - k * 0.45; b[BN.fArmL].rotation.x = -0.9 + k * 0.3; b[BN.fArmR].rotation.x = -0.9 - k * 0.3; b[BN.spine].rotation.x += 0.25; b[BN.jaw].rotation.x = 0.3; }
  if (p.crawl) {
    b[BN.hips].position.y = 0.26; b[BN.hips].rotation.x = 1.25; b[BN.spine].rotation.x = 0.15; b[BN.chest].rotation.x = 0.05; b[BN.neck].rotation.x = -0.6; b[BN.head].rotation.x = -0.6;
    b[BN.uArmL].rotation.x = -2.5 + s * 0.6; b[BN.uArmR].rotation.x = -2.5 - s * 0.6; b[BN.fArmL].rotation.x = -0.4 - Math.max(0, s) * 0.6; b[BN.fArmR].rotation.x = -0.4 - Math.max(0, -s) * 0.6;
    b[BN.thighL].rotation.x = 0.3 + s * 0.1; b[BN.thighR].rotation.x = 0.35 - s * 0.1; b[BN.shinL].rotation.x = 0.2; b[BN.shinR].rotation.x = 0.4;
  }
  if (p.rise < 1) { const k = 1 - p.rise; b[BN.spine].rotation.x += k * 0.8; b[BN.uArmL].rotation.x = -2.4 + Math.sin(p.t * 9) * 0.5; b[BN.uArmR].rotation.x = -2.2 - Math.sin(p.t * 9) * 0.5; b[BN.jaw].rotation.x = 0.35; }
  if (p.fl) { b[BN.spine].rotation.x += p.fl.x; b[BN.chest].rotation.y += p.fl.y; b[BN.head].rotation.x += p.fl.h; b[BN.head].rotation.z += p.fl.y * 0.6; }
}

/* ─── Poupée de chiffon (Verlet) ─── */
const RAG_PTS = [[BN.hips, 0, 0], [BN.chest, 0.12, 0], [BN.neck, 0, 0], [BN.head, 0.21, 0], [BN.uArmL, 0, 0], [BN.fArmL, 0, 0], [BN.handL, -0.08, 0], [BN.uArmR, 0, 0], [BN.fArmR, 0, 0], [BN.handR, -0.08, 0], [BN.thighL, 0, 0], [BN.shinL, 0, 0], [BN.footL, 0, 0], [BN.thighR, 0, 0], [BN.shinR, 0, 0], [BN.footR, 0, 0]];
const RAG_LINKS = [[0, 1, 1], [1, 2, 1], [2, 3, 1], [1, 4, 1], [4, 5, 1], [5, 6, 1], [1, 7, 1], [7, 8, 1], [8, 9, 1], [0, 10, 1], [10, 11, 1], [11, 12, 1], [0, 13, 1], [13, 14, 1], [14, 15, 1],
  [4, 7, 1], [10, 13, 1], [4, 0, 0.9], [7, 0, 0.9], [10, 1, 0.9], [13, 1, 0.9], [2, 4, 0.8], [2, 7, 0.8], [3, 1, 0.6]];
const RAG_MIN = [[4, 6, 0.16], [7, 9, 0.16], [10, 12, 0.32], [13, 15, 0.32], [3, 0, 0.5], [6, 0, 0.12], [9, 0, 0.12], [12, 1, 0.5], [15, 1, 0.5]];
class Ragdoll {
  constructor(z, impulse, hitPart, explosive) {
    this.z = z; const s = z.scale;
    z.holder.updateMatrixWorld(true);
    this.p = RAG_PTS.map(([bi, oy]) => new THREE.Vector3(0, oy, 0).applyMatrix4(z.bones[bi].matrixWorld));
    this.q = this.p.map((v) => v.clone());
    this.len = RAG_LINKS.map(([a, b]) => this.p[a].distanceTo(this.p[b]));
    // Mort crédible : les jambes lâchent (bassin qui tombe, genoux vers l'avant), le buste bascule
    // vers l'avant (élan) ou vers l'arrière (tête touchée) ; une balle ne projette pas un corps.
    const dt = 1 / 60, v0 = new THREE.Vector3(z.vel.x, 0, z.vel.z).multiplyScalar(explosive ? 0.15 : 0.3);
    const focus = hitPart === 'head' ? [3, 2] : hitPart === 'limb' ? [11, 14, 5, 8] : [1, 0, 2];
    const fwd = new THREE.Vector3(Math.sin(z.yaw), 0, Math.cos(z.yaw));
    const shot = new THREE.Vector3(impulse.x, 0, impulse.z); if (shot.lengthSq() > 1e-6) shot.normalize(); else shot.copy(fwd).negate();
    const fall = hitPart === 'head' || Math.random() < 0.4 ? shot : fwd;
    this.p.forEach((pt, i) => {
      const v = v0.clone();
      if (explosive) { v.addScaledVector(impulse, 0.85 + Math.random() * 0.3); v.x += rand(-0.4, 0.4); v.z += rand(-0.4, 0.4); }
      else {
        v.addScaledVector(impulse, focus.includes(i) ? 1 : 0.2);
        if (i === 0) v.y -= 0.7;
        else if (i === 11 || i === 14) { v.addScaledVector(fwd, 0.9); v.y -= 0.3; }
        else if (i <= 3) { v.addScaledVector(fall, 0.55 + i * 0.12); v.y -= 0.25; }
      }
      this.q[i].copy(pt).addScaledVector(v, -dt);
    });
    this.sleepT = 0; this.asleep = false; this.age = 0;
    this.baseY = 0; // enfoncement final dans la neige
    // Le porteur passe à l'identité : les os sont pilotés en coordonnées monde.
    z.holder.position.set(0, 0, 0); z.holder.rotation.set(0, 0, 0); z.holder.updateMatrixWorld(true);
    this.s = s;
  }
  collide(pt, prev) {
    const r = 0.07;
    if (!solidAt(pt.x, pt.y - r, pt.z)) return false;
    // Sol (plancher, rampe, surface) : on se pose dessus avec frottement ; mur : retour horizontal.
    const g = groundAt(pt.x, pt.z);
    if (g + r - pt.y < 0.5 && !solidAt(pt.x, g + r + 0.02, pt.z)) {
      pt.y = g + r; const vy = pt.y - prev.y;
      prev.y = Math.abs(vy) < 0.012 ? pt.y : pt.y + vy * 0.2;
      prev.x = lerp(prev.x, pt.x, 0.8); prev.z = lerp(prev.z, pt.z, 0.8); // frottement : un corps ne glisse pas sur le sol
    } else { pt.x = prev.x; pt.z = prev.z; }
    return true;
  }
  step(dt) {
    if (this.asleep) return;
    this.age += dt;
    const n = Math.min(3, Math.max(1, Math.ceil(dt / (1 / 90)))), h = dt / n;
    for (let s = 0; s < n; s++) {
      for (let i = 0; i < this.p.length; i++) {
        const p = this.p[i], q = this.q[i];
        const vx = (p.x - q.x) * 0.985, vy = (p.y - q.y) * 0.985, vz = (p.z - q.z) * 0.985;
        q.copy(p); p.x += vx; p.y += vy - 9.8 * h * h; p.z += vz;
      }
      for (let it = 0; it < 6; it++) {
        RAG_LINKS.forEach(([a, b, k], li) => {
          const pa = this.p[a], pb = this.p[b], dx = pb.x - pa.x, dy = pb.y - pa.y, dz = pb.z - pa.z, d = Math.hypot(dx, dy, dz) || 1e-6, diff = ((d - this.len[li]) / d) * 0.5 * k;
          pa.x += dx * diff; pa.y += dy * diff; pa.z += dz * diff; pb.x -= dx * diff; pb.y -= dy * diff; pb.z -= dz * diff;
        });
        for (const [a, b, m] of RAG_MIN) {
          const pa = this.p[a], pb = this.p[b], dx = pb.x - pa.x, dy = pb.y - pa.y, dz = pb.z - pa.z, d = Math.hypot(dx, dy, dz) || 1e-6;
          if (d >= m * this.s) continue; const diff = ((d - m * this.s) / d) * 0.5; pa.x += dx * diff; pa.y += dy * diff; pa.z += dz * diff; pb.x -= dx * diff; pb.y -= dy * diff; pb.z -= dz * diff;
        }
        for (let i = 0; i < this.p.length; i++) this.collide(this.p[i], this.q[i]);
      }
    }
    let maxV = 0; for (let i = 0; i < this.p.length; i++) maxV = Math.max(maxV, this.p[i].distanceTo(this.q[i]) / h);
    if (maxV < 0.14 && this.age > 0.8) { this.sleepT += dt; if (this.sleepT > 0.5) this.asleep = true; } else this.sleepT = 0;
    this.apply();
  }
  // Traduit les points en rotations d'os.
  apply() {
    const z = this.z, b = z.bones, P = this.p, s = this.s;
    const basis = (up, right) => { const u = up.clone().normalize(), r = right.clone().addScaledVector(u, -right.dot(u)).normalize(), f = new THREE.Vector3().crossVectors(r, u); return new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(r, u, f)); };
    const W = [];
    const hipsQ = basis(_v1.subVectors(P[1], P[0]), _v2.subVectors(P[10], P[13]));
    b[BN.hips].position.set(P[0].x / s, (P[0].y + this.baseY) / s, P[0].z / s); b[BN.hips].quaternion.copy(hipsQ); W[BN.hips] = hipsQ;
    b[BN.spine].quaternion.identity(); W[BN.spine] = hipsQ;
    const chestQ = basis(_v1.subVectors(P[2], P[1]), _v2.subVectors(P[4], P[7]));
    b[BN.chest].quaternion.copy(hipsQ.clone().invert().multiply(chestQ)); W[BN.chest] = chestQ;
    b[BN.neck].quaternion.identity(); W[BN.neck] = chestQ;
    const aim = (bi, parentQ, from, to, bindFrom, bindTo) => {
      const d = _v3.subVectors(to, from).normalize().applyQuaternion(parentQ.clone().invert());
      const bd = new THREE.Vector3().subVectors(bindTo, bindFrom).normalize();
      const lq = new THREE.Quaternion().setFromUnitVectors(bd, d); b[bi].quaternion.copy(lq); return parentQ.clone().multiply(lq);
    };
    W[BN.head] = aim(BN.head, W[BN.neck], P[2], P[3], boneW(BN.neck), boneW(BN.head).add(_v1.set(0, 0.21, 0)));
    b[BN.jaw].rotation.set(0.35, 0, 0);
    for (const [cl, ua, fa, ha, sh, el, wr] of [[BN.clavL, BN.uArmL, BN.fArmL, BN.handL, 4, 5, 6], [BN.clavR, BN.uArmR, BN.fArmR, BN.handR, 7, 8, 9]]) {
      b[cl].quaternion.identity();
      const wu = aim(ua, W[BN.chest], P[sh], P[el], boneW(ua), boneW(fa));
      aim(fa, wu, P[el], P[wr], boneW(fa), boneW(ha).add(_v1.set(0, -0.08, 0)));
      b[ha].rotation.set(0.5, 0, 0);
    }
    for (const [th, sh, ft, hp, kn, an] of [[BN.thighL, BN.shinL, BN.footL, 10, 11, 12], [BN.thighR, BN.shinR, BN.footR, 13, 14, 15]]) {
      const wt = aim(th, W[BN.hips], P[hp], P[kn], boneW(th), boneW(sh));
      aim(sh, wt, P[kn], P[an], boneW(sh), boneW(ft));
      b[ft].rotation.set(0.6, 0, 0);
    }
  }
}
const ZOMBIES = [];
let zombieSeq = 1;
const ZSPEED = { walker: 1.05, jogger: 2.3, runner: 3.9, sprinter: 5.0, brute: 1.5, crawler: 0.7, frost: 1.3, screamer: 2.2, warden: 1.9 };
// Infectés spéciaux : conseil affiché la première fois qu'on en croise un.
const SPECIAL_HINTS = {
  frost: ['UN GIVREUX', "Il éclate en glace à sa mort : abattez-le à distance."],
  screamer: ['UN HURLEUR', 'Son cri affole les infectés autour de lui : abattez-le en priorité.'],
};
let ZFROST_GEO = null, ZFROST_MAT = null;
const _zp = new THREE.Vector3();
function frostCrystals() {
  if (!ZFROST_GEO) {
    const r = mulberry32(5), parts = [];
    for (let k = 0; k < 7; k++) { const c = new THREE.ConeGeometry(0.035 + r() * 0.03, 0.16 + r() * 0.18, 5); c.translate(0, 0.1, 0); c.rotateX((r() - 0.5) * 1.6 - 0.5); c.rotateZ((r() - 0.5) * 1.4); c.translate((r() - 0.5) * 0.12, 0, (r() - 0.5) * 0.08); parts.push(c.toNonIndexed()); }
    ZFROST_GEO = mergeGeometries(parts);
    ZFROST_MAT = new THREE.MeshStandardMaterial({ color: 0xb8ecff, emissive: 0x2a8cff, emissiveIntensity: 0.9, roughness: 0.12, metalness: 0.15 });
  }
  return new THREE.Mesh(ZFROST_GEO, ZFROST_MAT);
}

class Zombie {
  constructor(o) {
    this.id = o.id ?? zombieSeq++;
    this.kind = o.kind || 'walker';
    this.variant = o.variant ?? (Math.random() * ZV.list.length) | 0;
    this.boss = this.kind === 'warden'; this.brute = this.kind === 'brute' || this.boss; this.helmet = this.boss;
    const geo = this.brute ? ZV.brute : ZV.list[this.variant % ZV.list.length];
    const rig = makeRig(geo, ZMAT);
    this.holder = rig.holder; this.mesh = rig.mesh; this.bones = rig.bones;
    this.scale = this.boss ? 1.45 : this.brute ? 1.12 : this.kind === 'screamer' ? 1.1 : rand(0.93, 1.07);
    this.holder.scale.setScalar(this.scale);
    const eyeMat = new THREE.MeshBasicMaterial({ color: this.boss ? 0xff1a08 : this.brute ? 0xff3a2a : this.kind === 'frost' ? 0xaaf6ff : this.kind === 'screamer' ? 0xff40e0 : (o.round >= 12 ? 0x7fd8ff : 0xffb040) });
    this.eyes = new THREE.Mesh(ZEYE_GEO, eyeMat); this.bones[BN.head].add(this.eyes);
    this.eyes.position.set(-BONE_DEF[BN.head][0], 1.745 - BONE_DEF[BN.head][1] - 0.1 + 0.012, 0.022 - BONE_DEF[BN.head][2]);
    // Givreux : cristaux de glace sur le dos et les épaules (position donnée en repère du modèle, relative à l'os).
    if (this.kind === 'frost') for (const [b, x, y, z, s] of [[BN.chest, 0, 1.42, -0.15, 1.2], [BN.clavL, 0.17, 1.5, -0.06, 0.8], [BN.clavR, -0.17, 1.5, -0.06, 0.8], [BN.spine, 0.05, 1.18, -0.14, 0.9]]) { const c = frostCrystals(); c.position.set(x - BONE_DEF[b][0], y - BONE_DEF[b][1], z - BONE_DEF[b][2]); c.scale.setScalar(s); this.bones[b].add(c); }
    // Geôlier : matraque au poing et trousseau de clés à la ceinture.
    if (this.boss) {
      const bat = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.04, 0.75, 8), MATS.char); bat.position.set(0, -0.1, 0.12); bat.rotation.x = 1.25; this.bones[BN.handR].add(bat);
      const keys = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.012, 6, 14), MATS.brass); keys.position.set(0.18 - BONE_DEF[BN.hips][0], 0.98 - BONE_DEF[BN.hips][1], 0.05 - BONE_DEF[BN.hips][2]); keys.rotation.y = 1.2; this.bones[BN.hips].add(keys);
    }
    R.scene.add(this.holder);
    if (ZREAL.state === 'on') this.useReal();
    this.pos = new THREE.Vector3(o.x, o.y ?? 0, o.z); this.yaw = o.yaw ?? 0;
    this.maxHp = this.hp = o.hp ?? 150; this.speed = (ZSPEED[this.kind] || 1) * rand(0.9, 1.1);
    this.state = o.state || 'rise'; this.t = 0; this.phase = rand(TAU); this.time = rand(10);
    this.headTilt = rand(-0.3, 0.3); this.limp = Math.random() < 0.3 ? rand(0.2, 0.6) : 0; this.lean = rand(0.1, 0.32);
    this.crawl = this.kind === 'crawler'; this.rise = this.state === 'rise' ? 0 : 1;
    this.attackT = 0; this.tearT = 0; this.groanT = rand(1, 5); this.stuckT = 0; this.lastPos = this.pos.clone(); this.farT = 0;
    this.vel = new THREE.Vector3(); this.headless = false; this.frozenT = 0; this.fl = { x: 0, y: 0, h: 0 }; this.jawT = 0;
    this.remote = !!o.remote; this.net = { buf: [] }; this.lodAcc = 0; this.shadowT = 0;
    this.hit = [ // sphères de collision : [os, décalage le long de l'os, rayon, partie]
      [BN.head, 0.09, 0.125, 'head'], [BN.chest, 0.1, 0.22, 'body'], [BN.spine, 0.06, 0.2, 'body'], [BN.hips, -0.02, 0.19, 'body'],
      [BN.thighL, -0.2, 0.1, 'limb'], [BN.thighR, -0.2, 0.1, 'limb'], [BN.shinL, -0.2, 0.085, 'limb'], [BN.shinR, -0.2, 0.085, 'limb'],
      [BN.uArmL, -0.14, 0.075, 'limb'], [BN.uArmR, -0.14, 0.075, 'limb'], [BN.fArmL, -0.12, 0.065, 'limb'], [BN.fArmR, -0.12, 0.065, 'limb'],
    ].map((h) => ({ bone: h[0], oy: h[1], r: h[2] * this.scale, part: h[3], c: new THREE.Vector3() }));
    if (this.rise < 1) { fxSnowBurst(_v1.set(this.pos.x, this.pos.y + 0.2, this.pos.z)); Sfx.zombie(this.pos, 'groan', this.brute ? 0.7 : 1); }
    this.syncMesh(0);
    ZOMBIES.push(this);
    const hint = SPECIAL_HINTS[this.kind];
    if (hint && G.mode === 'playing' && G.seen && !G.seen.has(this.kind)) { G.seen.add(this.kind); UI.message(hint[0], hint[1]); }
  }
  get alive() { return this.state !== 'dead' && this.state !== 'gone'; }
  headPos(out) { return out.set(this.pos.x, this.pos.y + (this.crawl ? 0.5 : 1.75 * this.scale), this.pos.z); }
  // Recul à l'impact (retour visuel immédiat).
  flinch(dir, part) {
    const lx = Math.sin(-this.yaw) * dir.z + Math.cos(this.yaw) * dir.x, lz = Math.cos(this.yaw) * dir.z + Math.sin(this.yaw) * dir.x;
    const k = part === 'head' ? 0.35 : part === 'limb' ? 0.12 : 0.22;
    this.fl.x = clamp(this.fl.x - lz * k, -0.6, 0.6); this.fl.y = clamp(this.fl.y + lx * k, -0.6, 0.6); if (part === 'head') this.fl.h = clamp(this.fl.h - 0.5, -0.8, 0.8);
  }
  think(dt, G) {
    this.t += dt; this.time += dt;
    if (this.state === 'dead') return;
    if (this.rage > 0) this.rage -= dt;
    if (this.state === 'frozen') { this.frozenT -= dt; if (this.frozenT <= 0) G.shatterZombie(this); return; }
    if (this.state === 'rise') { this.rise = Math.min(1, this.t / (this.kind === 'runner' || this.kind === 'sprinter' ? 0.9 : 1.4)); if (this.rise >= 1) { this.state = 'move'; this.t = 0; } return; }
    // Cible : joueur vivant le plus proche.
    let tgt = null, best = 1e9;
    for (const p of G.players.values()) { if (p.down || p.dead || !p.pos || p.zb > G.time) continue; const d = (p.pos.x - this.pos.x) ** 2 + (p.pos.z - this.pos.z) ** 2; if (d < best) { best = d; tgt = p; } }
    this.target = tgt;
    const tx = tileOf(this.pos.x), tz = tileOf(this.pos.z), cls = tClass(tx, tz);
    this.groanT -= dt; if (this.groanT <= 0) { this.groanT = rand(3, 9); if (tgt && best < 900) { Sfx.zombie(this.pos, this.speed > 3 && Math.random() < 0.6 ? 'scream' : 'groan', this.brute ? 0.65 : rand(0.85, 1.15)); } }
    // Hurleur : s'arrête pour hurler, ce qui affole les infectés à moins de 10 m pendant 5 s.
    if (this.kind === 'screamer' && this.state === 'move') {
      if (this.screaming > 0) { this.screaming -= dt; this.vel.multiplyScalar(Math.exp(-8 * dt)); return; }
      this.screamT = (this.screamT ?? rand(2, 4)) - dt;
      if (this.screamT <= 0 && tgt && best < 20 * 20) { this.screamT = rand(7, 10); this.screaming = 1.2; G.emit('scream', { id: this.id }); for (const o of ZOMBIES) if (o !== this && o.alive && o.pos.distanceToSquared(this.pos) < 100) o.rage = 5; return; }
    }
    if (this.state === 'attack') {
      this.attackT += dt / (this.speed > 3 ? 0.75 : 1.0);
      if (!this.didHit && this.attackT > 0.45) { this.didHit = true; if (tgt && Math.sqrt(best) < 1.7 && Math.abs(tgt.pos.y - this.pos.y) < 1.3) G.damagePlayer(tgt, Math.round(DIFF().hit * (this.boss ? 2.2 : this.brute ? 1.8 : 1)), this); Sfx.whoosh(this.pos, 0.3); }
      if (this.attackT >= 1) { this.state = this.barricade && this.barricade.planks > 0 ? 'tear' : 'move'; this.attackT = 0; }
      return;
    }
    const ramp = cls === C_RAMP ? MAP.barricades[MAP.rampAt[ti(tx, tz)]] : null;
    if (this.state === 'tear') {
      const b = this.barricade;
      if (!b || b.planks <= 0) { this.state = 'move'; this.tearT = 0; }
      else {
        this.yaw = damp(this.yaw, Math.atan2(-b.dir[0], -b.dir[1]), 8, dt);
        if (tgt && Math.sqrt(best) < 1.9 && Math.abs(tgt.pos.y - this.pos.y) < 1.4) { this.state = 'attack'; this.attackT = 0; this.didHit = false; Sfx.zombie(this.pos, 'attack'); return; }
        this.tearT += dt; if (this.tearT > (this.speed > 3 ? 0.85 : 1.35)) { this.tearT = 0; G.removePlank(b, this); }
        return;
      }
    }
    // ─ Déplacement ─
    let dx = 0, dz = 0;
    const tp = tgt ? tgt.pos : null;
    if (tp && cls === C_TRENCH && tClass(tileOf(tp.x), tileOf(tp.z)) === C_TRENCH && best < 16 * 16 && gridClear(this.pos.x, this.pos.z, tp.x, tp.z, C_TRENCH)) { dx = tp.x - this.pos.x; dz = tp.z - this.pos.z; }
    else {
      const here = FLOW.dist[ti(tx, tz)];
      let bx = -1, bz = -1, bd = here < 0 ? 1e9 : here;
      for (const [ox, oz] of NB8) {
        const nx = tx + ox, nz = tz + oz; if (!inMap(nx, nz)) continue; const d = FLOW.dist[ti(nx, nz)]; if (d < 0 || d >= bd) continue;
        if (ox && oz) { if (zBlocked(tx, tz, nx, nz) || zBlocked(tx, tz, nx, tz) || zBlocked(tx, tz, tx, nz)) continue; }
        else if (!zStep(tx, tz, nx, nz, false)) continue;
        bd = d; bx = nx; bz = nz;
      }
      if (bx >= 0) {
        // Barricade encore debout : on s'arrête contre les planches.
        if (ramp && bx === ramp.inner[0] && bz === ramp.inner[1] && ramp.planks > 0) {
          const edge = rampT(ramp, this.pos.x, this.pos.z);
          if (edge < 0.32) { this.state = 'tear'; this.barricade = ramp; this.tearT = 0; return; }
          dx = tcx(ramp.x) - ramp.dir[0] * 0.8 - this.pos.x; dz = tcx(ramp.z) - ramp.dir[1] * 0.8 - this.pos.z;
        } else {
          let ax = tcx(bx), az = tcx(bz);
          // Regard vers l'avant : vise le carreau suivant si la voie est libre.
          const d2 = FLOW.dist[ti(bx, bz)];
          for (const [ox, oz] of NB8) { const nx = bx + ox, nz = bz + oz; if (!inMap(nx, nz)) continue; const dd = FLOW.dist[ti(nx, nz)]; if (dd >= 0 && dd < d2 - 12 && tClass(nx, nz) === cls && cls !== C_RAMP && gridClear(this.pos.x, this.pos.z, tcx(nx), tcx(nz), cls)) { ax = lerp(ax, tcx(nx), 0.6); az = lerp(az, tcx(nz), 0.6); break; } }
          dx = ax - this.pos.x; dz = az - this.pos.z;
        }
      } else if (tp && here === 0) { dx = tp.x - this.pos.x; dz = tp.z - this.pos.z; }
    }
    const L = Math.hypot(dx, dz);
    let spd = this.speed * (this.rage > 0 ? 1.4 : 1) * (G.blizzard ? 1.1 : 1) * (this.boss && this.hp < this.maxHp * 0.5 ? 1.6 : 1) * (this.stun > 0 ? 0.2 : 1);
    if (this.stun > 0) this.stun -= dt;
    if (this.boss) mapHook('bossThink', this, dt);
    if (L > 0.001) { dx /= L; dz /= L; } else spd = 0;
    // Contournement d'un obstacle heurté (caisse, épave) : on longe son bord un court instant.
    if (this.slideT > 0) { this.slideT -= dt; dx = dx * 0.3 + this.slide.x; dz = dz * 0.3 + this.slide.z; const l2 = Math.hypot(dx, dz) || 1; dx /= l2; dz /= l2; }
    // Séparation entre infectés.
    let sx = 0, sz = 0;
    const bucket = G.zHash;
    for (let oz = -1; oz <= 1; oz++) for (let ox = -1; ox <= 1; ox++) { const arr = bucket.get((tz + oz) * MAP_W + tx + ox); if (!arr) continue; for (const o of arr) { if (o === this || !o.alive) continue; const ex = this.pos.x - o.pos.x, ez = this.pos.z - o.pos.z, d2 = ex * ex + ez * ez; if (d2 < 0.55 && d2 > 1e-5) { const d = Math.sqrt(d2); sx += (ex / d) * (0.75 - d); sz += (ez / d) * (0.75 - d); } } }
    const tvx = dx * spd + sx * 2.2, tvz = dz * spd + sz * 2.2;
    this.vel.x = damp(this.vel.x, tvx, 6, dt); this.vel.z = damp(this.vel.z, tvz, 6, dt);
    this.pos.x += this.vel.x * dt; this.pos.z += this.vel.z * dt;
    collideCircle(this.pos, 0.3 * Math.min(1.1, this.scale), zBlocked);
    if (tClass(tileOf(this.pos.x), tileOf(this.pos.z)) === C_TRENCH) { _zp.set(0, 0, 0); if (collideProps(this.pos, 0.3, this.pos.y, 0, _zp)) this.slideAround(_zp, tgt); }
    this.pos.y = groundAt(this.pos.x, this.pos.z);
    const mv = Math.hypot(this.vel.x, this.vel.z);
    if (mv > 0.15) this.yaw += angDiff(this.yaw, Math.atan2(this.vel.x, this.vel.z)) * Math.min(1, dt * 7);
    // Attaque au contact.
    if (tgt && best < 1.35 * 1.35 * (this.brute ? 1.3 : 1) && Math.abs(tgt.pos.y - this.pos.y) < 1.2) { this.state = 'attack'; this.attackT = 0; this.didHit = false; Sfx.zombie(this.pos, 'attack', this.brute ? 0.7 : 1); }
    // Anti-blocage et laisse.
    this.stuckT += dt;
    if (this.stuckT > 3) { const moved = this.pos.distanceTo(this.lastPos); this.lastPos.copy(this.pos); this.stuckT = 0; this.stuck = moved < 0.6 ? (this.stuck || 0) + 1 : 0; if (this.stuck >= 4) G.respawnZombie(this); }
    const fd = FLOW.dist[ti(tileOf(this.pos.x), tileOf(this.pos.z))];
    if (fd > 520 || fd < 0) { this.farT += dt; if (this.farT > 14) G.respawnZombie(this); } else this.farT = 0;
  }
  // Poussé hors d'un obstacle : on retire la composante qui fonce dedans et, si l'on bute de face,
  // on choisit un côté (celui de la cible) pour en faire le tour.
  slideAround(push, tgt) {
    const L = Math.hypot(push.x, push.z); if (L < 1e-5) return;
    const nx = push.x / L, nz = push.z / L, into = -(this.vel.x * nx + this.vel.z * nz);
    if (into > 0) { this.vel.x += nx * into; this.vel.z += nz * into; }
    if (this.slideT > 0) return;
    const tan = Math.hypot(this.vel.x, this.vel.z);
    if (tan < this.speed * 0.45) {
      let sx = -nz, sz = nx;
      // Même côté que la dernière fois si l'on bute encore sur le même obstacle (pas d'hésitation).
      let side;
      if (this.slideAt && this.time - this.slideAt < 2.5 && this.slide) side = this.slide.x * sx + this.slide.z * sz;
      else { const ref = tgt ? tgt.pos : null; side = ref ? (ref.x - this.pos.x) * sx + (ref.z - this.pos.z) * sz : 0; if (Math.abs(side) < 0.3) side = this.id % 2 ? 1 : -1; }
      if (side < 0) { sx = -sx; sz = -sz; }
      this.slideAt = this.time;
      (this.slide ||= new THREE.Vector3()).set(sx, 0, sz); this.slideT = 0.7;
    }
  }
  // Animation et placement du modèle (hôte et invités), avec niveau de détail selon la distance.
  syncMesh(dt) {
    const h = this.holder;
    if (this.state === 'dead') { this.animateDeath(dt); return; }
    const spd = this.remote ? this.net.speed || 0 : Math.hypot(this.vel.x, this.vel.z);
    this.time += this.remote ? dt : 0;
    const stride = this.crawl ? 0.7 : this.speed > 3 ? 1.9 : 1.15;
    this.phase += (spd / stride) * Math.PI * dt;
    h.position.set(this.pos.x, this.pos.y - (1 - smooth(this.rise)) * 1.7, this.pos.z);
    h.rotation.set(0, this.yaw, 0);
    if (this.state === 'frozen') return;
    // Recul : ressort amorti.
    const kd = Math.exp(-9 * dt); this.fl.x *= kd; this.fl.y *= kd; this.fl.h *= kd;
    goreTick(this, dt);
    // Détail selon la distance : pose moins souvent au loin, ombre seulement de près.
    const cam = R.camera.position, dx = this.pos.x - cam.x, dz = this.pos.z - cam.z, d2 = dx * dx + dz * dz;
    this.shadowT -= dt; if (this.shadowT <= 0) { this.shadowT = 0.4 + Math.random() * 0.2; (this.real?.mesh || this.mesh).castShadow = d2 < 26 * 26; }
    this.lodAcc += dt; const every = d2 > 70 * 70 ? 0.25 : d2 > 38 * 38 ? 0.066 : 0;
    if (this.lodAcc < every) return; this.lodAcc = 0;
    this.jawT += dt;
    const run = clamp((this.speed - 1.3) / 2.5, 0, 1);
    if (this.screaming > 0 && this.remote) this.screaming -= dt;
    const scream = this.screaming > 0 ? Math.sin(Math.min(1, this.screaming / 1.2) * Math.PI) : 0;
    poseBody(this.bones, { phase: this.phase, run: this.brute ? 0 : run, lean: this.lean + (this.brute ? 0.1 : 0) - scream * 0.25, reach: this.speed > 3 || scream ? 0 : 1, attack: this.state === 'attack' ? this.attackT : 0, tear: this.state === 'tear' ? 1 : 0, crawl: this.crawl, rise: this.rise, headTilt: this.headTilt - scream * 0.5, t: this.time, limp: this.limp, moving: clamp(spd / Math.max(0.5, this.speed * 0.6), 0, 1), jaw: scream ? 0.2 + scream * 0.5 : 0.1 + Math.max(0, Math.sin(this.jawT * 2.3 + this.id)) * 0.18, fl: this.fl });
    if (this.headless) this.bones[BN.head].scale.setScalar(0.001);
    if (this.real) zrealPose(this);
  }
  // Corps réaliste (09b_zreal.js) à la place du corps procédural, qui reste invisible et continue de bouger.
  useReal() {
    const t = this.boss ? ZREAL.boss : this.brute ? ZREAL.brute : ZREAL.list[this.variant % ZREAL.list.length]; if (!t) return;
    this.real = zrealInstance(t); this.holder.add(this.real.root); this.mesh.visible = false;
    this.real.bones.head.add(this.eyes); this.eyes.geometry = t.eyeGeo; this.eyes.position.set(0, 0, 0);
    if (this.state === 'frozen') this.real.mesh.material = ZMAT_FROZEN;
    zrealPose(this);
  }
  updateHitboxes() {
    this.holder.updateMatrixWorld(true);
    for (const h of this.hit) { const b = this.bones[h.bone]; h.c.set(0, h.oy, 0).applyMatrix4(b.matrixWorld); }
  }
  die(o) {
    this.state = 'dead'; this.t = 0;
    // Copie privée : les effets (sang…) réutilisent les vecteurs temporaires partagés.
    const dir = (o.dir ? new THREE.Vector3(o.dir.x, 0, o.dir.z) : new THREE.Vector3(-Math.sin(this.yaw), 0, -Math.cos(this.yaw))).normalize();
    if (o.head) { this.headless = true; this.headPos(_v2); fxBlood(_v2, _v3.set(0, 1, 0), 2.2); }
    this.eyes.visible = false;
    (this.real?.mesh || this.mesh).castShadow = true;
    // Impulsion : balle (dans l'axe du tir), explosion (projection), corps-à-corps.
    const strength = o.explosive ? rand(2.2, 3.4) : o.melee ? rand(0.8, 1.2) : o.head ? rand(0.5, 0.9) : rand(0.35, 0.75);
    const impulse = dir.clone().multiplyScalar(strength); if (o.explosive) impulse.y += rand(1.6, 2.8);
    // Squelette physique calculé tête en place (une tête réduite à rien rendait le corps instable), puis tête retirée.
    this.bones[BN.head].scale.setScalar(1);
    this.syncPoseForDeath();
    this.rag = new Ragdoll(this, impulse, o.head ? 'head' : o.part || 'body', !!o.explosive);
    if (this.headless) { this.bones[BN.head].scale.setScalar(0.001); zSever(this, BN.head, dir); } // tête éclatée : moignon du cou qui gicle
    this.limbs = true;
    if (Math.random() < 0.7) Sfx.zombie(this.pos, 'attack', 0.8);
  }
  syncPoseForDeath() { this.holder.position.set(this.pos.x, this.pos.y, this.pos.z); this.holder.rotation.set(0, this.yaw, 0); }
  animateDeath(dt) {
    this.t += dt;
    if (!this.limbs) { if (this.t > 9) this.destroy(); return; } // éclaté en glace : rien à animer
    if (this.rag) {
      // Le corps s'est posé : le sang commence à s'étaler dessous (plus large pour les gros gabarits).
      if (!this.pooled && this.t > 1.1) { this.pooled = true; const P = this.rag.p, k = this.headless ? 0.8 : 0.4; /* sous le torse ; vers le cou si la tête a sauté */ bloodPool(lerp(P[0].x, P[2].x, k), lerp(P[0].z, P[2].z, k), rand(0.75, 1.15) * Math.min(1.6, this.scale) * (this.headless ? 1.2 : 1)); }
      const cam = R.camera.position;
      if (this.rag.age < 4 || cam.distanceToSquared(this.rag.p[0]) < 900) this.rag.step(Math.min(dt, 1 / 30));
      if (this.t > 6) { this.rag.baseY -= dt * 0.22; this.rag.apply(); }
      if (this.real) zrealPose(this);
      goreTick(this, dt);
    }
    if (this.t > 9) this.destroy();
  }
  freeze(t) { this.state = 'frozen'; this.frozenT = t; this.mesh.material = ZMAT_FROZEN; if (this.real) this.real.mesh.material = ZMAT_FROZEN; this.eyes.visible = false; Sfx.freeze(this.pos); }
  destroy() { this.state = 'gone'; R.scene.remove(this.holder); this.mesh.skeleton.dispose(); this.real?.mesh.skeleton.dispose(); this.eyes.material.dispose(); const i = ZOMBIES.indexOf(this); if (i >= 0) ZOMBIES.splice(i, 1); }
}

// Rayon contre les infectés : renvoie les touches triées jusqu'à maxDist.
function rayZombies(o, d, maxDist) {
  const hits = [];
  for (const z of ZOMBIES) {
    if (!z.alive || z.state === 'rise' && z.rise < 0.35) continue;
    const cx = z.pos.x - o.x, cz = z.pos.z - o.z, t0 = cx * d.x + cz * d.z; // pré-filtre horizontal
    if (t0 < -1 || t0 > maxDist + 1) continue;
    let bestT = 1e9, bestPart = null, bestBone = null;
    for (const h of z.hit) {
      if (h.off) continue; // membre arraché
      const lx = h.c.x - o.x, ly = h.c.y - o.y, lz = h.c.z - o.z, t = lx * d.x + ly * d.y + lz * d.z;
      if (t < 0) continue; const d2 = lx * lx + ly * ly + lz * lz - t * t, r2 = h.r * h.r;
      if (d2 > r2) continue; const th = t - Math.sqrt(r2 - d2);
      if (th < bestT - (h.part === 'head' ? 0.05 : 0)) { bestT = th; bestPart = h.part; bestBone = h.bone; }
    }
    if (bestPart && bestT < maxDist) hits.push({ z, dist: bestT, part: bestPart, bone: bestBone });
  }
  return hits.sort((a, b) => a.dist - b.dist);
}
