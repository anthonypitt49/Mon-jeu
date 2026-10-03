/* ═══════════════════ TEXTURES PROCÉDURALES ═══════════════════
   Aucune image externe : chaque matière est peinte au démarrage, avec sa carte de relief. */

function makeCanvas(w, h = w) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
function toTex(canvas, { srgb = true, repeat = true, aniso = true } = {}) {
  const t = new THREE.CanvasTexture(canvas);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  if (aniso) t.anisotropy = 8;
  t.needsUpdate = true;
  return t;
}
// Remplit une texture pixel par pixel ; fn(u, v, x, y) → [r, g, b, hauteur] (0..1).
function paint(size, fn) {
  const c = makeCanvas(size), ctx = c.getContext('2d'), img = ctx.createImageData(size, size), d = img.data;
  const height = new Float32Array(size * size);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const r = fn(x / size, y / size, x, y), i = (y * size + x) * 4;
    d[i] = clamp(r[0], 0, 1) * 255; d[i + 1] = clamp(r[1], 0, 1) * 255; d[i + 2] = clamp(r[2], 0, 1) * 255; d[i + 3] = 255;
    height[y * size + x] = r[3] ?? 0.5;
  }
  ctx.putImageData(img, 0, 0);
  return { canvas: c, ctx, height, size };
}
function normalFromHeight(height, size, strength = 2) {
  const c = makeCanvas(size), ctx = c.getContext('2d'), img = ctx.createImageData(size, size), d = img.data;
  const H = (x, y) => height[((y + size) % size) * size + ((x + size) % size)];
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const dx = (H(x + 1, y) - H(x - 1, y)) * strength, dy = (H(x, y + 1) - H(x, y - 1)) * strength;
    const l = Math.hypot(dx, dy, 1), i = (y * size + x) * 4;
    d[i] = (-dx / l * 0.5 + 0.5) * 255; d[i + 1] = (dy / l * 0.5 + 0.5) * 255; d[i + 2] = (1 / l * 0.5 + 0.5) * 255; d[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  return toTex(c, { srgb: false });
}
function matSet(p, strength) { return { map: toTex(p.canvas), normalMap: normalFromHeight(p.height, p.size, strength) }; }

const TEX = {};
function buildTextures() {
  const S = Q.texSize, P = 4; // période du bruit
  const n = (u, v, f, o = 4) => tfbm(u * f, v * f, f, o);

  // Terre gelée des parois : mottes, cailloux, racines et givre.
  TEX.earth = matSet(paint(S, (u, v) => {
    const b = n(u, v, 6), m = n(u + 0.3, v, 24, 3), st = tnoise(u * 40, v * 40, 40);
    const stone = st > 0.78 ? (st - 0.78) * 4 : 0;
    const frost = Math.max(0, n(u, v + 0.5, 12, 3) - 0.7) * 1.4 + (hash2(u * 9999, v * 7777) > 0.992 ? 0.25 : 0);
    let r = 0.26 + b * 0.18 + m * 0.06, g = 0.205 + b * 0.14 + m * 0.05, bl = 0.16 + b * 0.1 + m * 0.04;
    r = lerp(r, 0.42, stone); g = lerp(g, 0.4, stone); bl = lerp(bl, 0.38, stone);
    r = lerp(r, 0.85, frost); g = lerp(g, 0.9, frost); bl = lerp(bl, 0.97, frost);
    return [r, g, bl, b * 0.7 + m * 0.3 + stone * 0.5];
  }), 3);

  // Planches de coffrage horizontales, grisées par le froid.
  TEX.planks = matSet(paint(S, (u, v) => {
    const rows = 6, row = Math.floor(v * rows), fv = v * rows - row;
    const tint = hash2(row, 7), shift = hash2(row, 3);
    const grain = n(u * 0.5 + shift, v * 6, 8, 3), streak = tnoise(u * 3 + shift * 10, v * 90, 90);
    const gap = fv < 0.05 || fv > 0.96 ? 1 : 0;
    const knotD = Math.hypot((u * 6 + shift * 6) % 1 - 0.5, (fv - 0.5) * 1.3);
    const knot = knotD < 0.07 ? 1 - knotD / 0.07 : 0;
    const nail = (Math.abs(((u + shift) * 3) % 1 - 0.04) < 0.012 && Math.abs(fv - 0.5) < 0.05) ? 1 : 0;
    let w = 0.3 + tint * 0.14 + grain * 0.16 + streak * 0.06 - knot * 0.14;
    const frost = Math.max(0, fv - 0.8) * 1.4 * (0.5 + n(u, v, 16, 2));
    let r = w * 1.02, g = w * 0.9, b = w * 0.78;
    r = lerp(r, 0.8, frost); g = lerp(g, 0.86, frost); b = lerp(b, 0.92, frost);
    if (gap) { r *= 0.25; g *= 0.25; b *= 0.25; }
    if (nail) { r = 0.12; g = 0.1; b = 0.09; }
    return [r, g, b, gap ? 0 : 0.6 + grain * 0.25 + streak * 0.1 - knot * 0.2];
  }), 2.5);

  // Toile de jute des sacs de sable.
  TEX.burlap = matSet(paint(S, (u, v) => {
    const wv = (Math.sin(u * S * 0.9) * 0.5 + 0.5) * (Math.sin(v * S * 0.9 + 1.5) * 0.5 + 0.5);
    const d = n(u, v, 5), s = n(u + 2, v, 18, 2);
    const w = 0.34 + d * 0.16 + wv * 0.08 - s * 0.05;
    return [w * 1.08, w * 0.98, w * 0.78, wv * 0.6 + d * 0.4];
  }), 2);

  // Neige compacte, légèrement bleutée, avec paillettes.
  TEX.snow = matSet(paint(S, (u, v) => {
    const b = n(u, v, 4), f = n(u + 0.5, v, 20, 3);
    const sp = hash2(u * 5311, v * 7919) > 0.992 ? 0.12 : 0;
    const w = 0.82 + b * 0.1 + f * 0.05 + sp;
    return [w * 0.95, w * 0.97, w * 1.02, b * 0.6 + f * 0.4];
  }), 1.4);

  // Béton banché : taches, lignes de coffrage, fissures.
  const conc = paint(S, (u, v) => {
    const b = n(u, v, 5), s = n(u + 3, v, 22, 3), pit = hash2(u * 3571, v * 2791) > 0.985 ? 1 : 0;
    const board = Math.abs(((v * 4) % 1) - 0.5) > 0.485 ? 1 : 0;
    const stain = Math.max(0, n(u, v * 0.3, 3, 3) - 0.55) * 1.6 * smooth(clamp(v * 1.2, 0, 1));
    let w = 0.46 + b * 0.12 + s * 0.06 - stain * 0.18 - board * 0.08 - pit * 0.2;
    return [w * 0.98, w, w * 1.02, 0.5 + s * 0.3 - pit * 0.4 - board * 0.3];
  });
  { const ctx = conc.ctx; ctx.strokeStyle = 'rgba(20,20,22,.55)'; ctx.lineWidth = Math.max(1, S / 400);
    for (let k = 0; k < 7; k++) { let x = rng() * S, y = rng() * S; ctx.beginPath(); ctx.moveTo(x, y); for (let j = 0; j < 14; j++) { x += (rng() - 0.5) * S * 0.06; y += rng() * S * 0.03; ctx.lineTo(x, y); } ctx.stroke(); } }
  TEX.concrete = matSet(conc, 2);

  // Tôle ondulée rouillée : l'ondulation est portée par la carte de relief.
  TEX.metal = matSet(paint(S, (u, v) => {
    const wave = Math.sin(u * TAU * 24) * 0.5 + 0.5;
    const rust = smooth(clamp((n(u, v, 4) - 0.45) * 3.5, 0, 1)), streak = tnoise(u * 60, v * 2, 60);
    const base = 0.33 + n(u, v, 10, 2) * 0.08;
    let r = base, g = base * 1.01, b = base * 1.03;
    r = lerp(r, 0.34 + streak * 0.08, rust); g = lerp(g, 0.22 + streak * 0.04, rust); b = lerp(b, 0.15, rust);
    return [r, g, b, wave];
  }), 6);

  // Caisse en bois vertical.
  const crate = paint(S, (u, v) => {
    const cols = 5, col = Math.floor(u * cols), fu = u * cols - col;
    const g = n(u * 8, v * 0.6 + hash2(col, 1), 6, 3), gap = fu < 0.03 ? 1 : 0;
    const w = 0.36 + hash2(col, 9) * 0.1 + g * 0.14;
    return gap ? [0.07, 0.06, 0.05, 0] : [w * 0.95, w * 0.88, w * 0.66, 0.6 + g * 0.3];
  });
  TEX.crateBase = crate;
  TEX.crate = matSet(crate, 2);

  // Détail neutre (usure) pour les corps et les accessoires.
  TEX.grime = matSet(paint(S / 2, (u, v) => {
    const a = n(u, v, 6), b = n(u + 1, v, 24, 2);
    const w = 0.72 + a * 0.22 + b * 0.1;
    return [w, w, w, a * 0.6 + b * 0.4];
  }), 2.5);

  // Toile d'uniforme (drap de laine).
  TEX.cloth = matSet(paint(S / 2, (u, v) => {
    const t = (Math.sin((u + v) * S * 1.2) * 0.5 + 0.5) * 0.5 + (Math.sin((u - v) * S * 1.2) * 0.5 + 0.5) * 0.5;
    const d = n(u, v, 5, 3), fold = n(u * 0.6, v * 2, 4, 2);
    const w = 0.7 + d * 0.2 + t * 0.08 - fold * 0.12;
    return [w, w, w, t * 0.4 + fold * 0.6];
  }), 2.5);

  TEX.sprites = buildSprites();
}

/* ─── Sprites et décalcomanies (dégradés canvas, rapides) ─── */
function radial(size, stops) {
  const c = makeCanvas(size), x = c.getContext('2d'), g = x.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  stops.forEach(([o, col]) => g.addColorStop(o, col)); x.fillStyle = g; x.fillRect(0, 0, size, size); return c;
}
function buildSprites() {
  const T = {};
  T.glow = toTex(radial(128, [[0, 'rgba(255,255,255,1)'], [0.25, 'rgba(255,255,255,.55)'], [1, 'rgba(255,255,255,0)']]), { repeat: false });
  T.flake = toTex(radial(32, [[0, 'rgba(255,255,255,1)'], [0.45, 'rgba(255,255,255,.75)'], [1, 'rgba(255,255,255,0)']]), { repeat: false });
  // Fumée : bouffée bruitée.
  { const s = 128, c = makeCanvas(s), x = c.getContext('2d'), img = x.createImageData(s, s);
    for (let j = 0; j < s; j++) for (let i = 0; i < s; i++) {
      const dx = i / s - 0.5, dy = j / s - 0.5, r = Math.hypot(dx, dy) * 2, nn = fbm(i / 18, j / 18, 4);
      const a = clamp((1 - r) * 1.4, 0, 1) * clamp(nn * 1.6 - 0.25, 0, 1), k = (j * s + i) * 4;
      img.data[k] = img.data[k + 1] = img.data[k + 2] = 235; img.data[k + 3] = a * 255;
    }
    x.putImageData(img, 0, 0); T.smoke = toTex(c, { repeat: false }); }
  T.spark = toTex(radial(32, [[0, 'rgba(255,250,220,1)'], [0.3, 'rgba(255,190,90,.9)'], [1, 'rgba(255,120,20,0)']]), { repeat: false });
  // Flamme en goutte.
  { const c = makeCanvas(64, 128), x = c.getContext('2d');
    const g = x.createRadialGradient(32, 92, 2, 32, 80, 60); g.addColorStop(0, 'rgba(255,255,220,1)'); g.addColorStop(0.2, 'rgba(255,200,80,.95)'); g.addColorStop(0.5, 'rgba(255,90,20,.6)'); g.addColorStop(1, 'rgba(120,20,0,0)');
    x.fillStyle = g; x.beginPath(); x.moveTo(32, 4); x.bezierCurveTo(60, 50, 62, 120, 32, 124); x.bezierCurveTo(2, 120, 4, 50, 32, 4); x.fill();
    T.flame = toTex(c, { repeat: false }); }
  // Éclair de bouche : étoile irrégulière.
  { const s = 128, c = makeCanvas(s), x = c.getContext('2d'); x.translate(s / 2, s / 2);
    for (let k = 0; k < 9; k++) { const a = (k / 9) * TAU + rng() * 0.3, L = s * (0.28 + rng() * 0.22);
      const g = x.createLinearGradient(0, 0, Math.cos(a) * L, Math.sin(a) * L); g.addColorStop(0, 'rgba(255,245,200,1)'); g.addColorStop(1, 'rgba(255,150,40,0)');
      x.fillStyle = g; x.beginPath(); x.moveTo(Math.cos(a + 1.4) * 7, Math.sin(a + 1.4) * 7); x.lineTo(Math.cos(a) * L, Math.sin(a) * L); x.lineTo(Math.cos(a - 1.4) * 7, Math.sin(a - 1.4) * 7); x.fill(); }
    const g = x.createRadialGradient(0, 0, 0, 0, 0, s * 0.22); g.addColorStop(0, 'rgba(255,255,240,1)'); g.addColorStop(1, 'rgba(255,190,80,0)'); x.fillStyle = g; x.fillRect(-s / 2, -s / 2, s, s);
    T.muzzle = toTex(c, { repeat: false }); }
  // Sang sur la neige.
  { const s = 128, c = makeCanvas(s), x = c.getContext('2d');
    for (let k = 0; k < 16; k++) { const r = 6 + rng() * 22, a = rng() * TAU, d = rng() * 26; x.fillStyle = `rgba(${90 + rng() * 40},${4 + rng() * 8},${6 + rng() * 6},${0.55 + rng() * 0.4})`; x.beginPath(); x.ellipse(64 + Math.cos(a) * d, 64 + Math.sin(a) * d, r, r * (0.6 + rng() * 0.4), rng() * 3, 0, TAU); x.fill(); }
    for (let k = 0; k < 40; k++) { const a = rng() * TAU, d = 30 + rng() * 32; x.fillStyle = 'rgba(110,8,10,.8)'; x.beginPath(); x.arc(64 + Math.cos(a) * d, 64 + Math.sin(a) * d, 0.8 + rng() * 2.4, 0, TAU); x.fill(); }
    T.blood = toTex(c, { repeat: false }); }
  // Impact de balle.
  { const s = 64, c = makeCanvas(s), x = c.getContext('2d');
    let g = x.createRadialGradient(32, 32, 0, 32, 32, 30); g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(0.18, 'rgba(10,8,6,.95)'); g.addColorStop(0.35, 'rgba(40,30,25,.5)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = g; x.fillRect(0, 0, s, s); x.strokeStyle = 'rgba(15,12,10,.6)'; x.lineWidth = 1;
    for (let k = 0; k < 6; k++) { const a = rng() * TAU; x.beginPath(); x.moveTo(32, 32); x.lineTo(32 + Math.cos(a) * (10 + rng() * 14), 32 + Math.sin(a) * (10 + rng() * 14)); x.stroke(); }
    T.hole = toTex(c, { repeat: false }); }
  // Éclaboussure murale : gerbe de gouttelettes vers le haut de l'impact, coulures vers le bas (le bas de la texture = le sol).
  { const s = 128, c = makeCanvas(s), x = c.getContext('2d'), col = () => `rgba(${70 + rng() * 45},${3 + rng() * 6},${5 + rng() * 5},`;
    for (let k = 0; k < 7; k++) { x.fillStyle = col() + (0.75 + rng() * 0.2) + ')'; x.beginPath(); x.ellipse(64 + (rng() - 0.5) * 18, 60 + (rng() - 0.5) * 14, 5 + rng() * 9, 4 + rng() * 7, rng() * TAU, 0, TAU); x.fill(); }
    for (let k = 0; k < 70; k++) { const a = rng() * TAU, d = 10 + rng() * 48 * (0.4 + 0.6 * Math.abs(Math.cos(a))), r = 0.6 + rng() * 2.6; x.fillStyle = col() + (0.6 + rng() * 0.35) + ')'; x.beginPath(); x.ellipse(64 + Math.cos(a) * d, 60 + Math.sin(a) * d * 0.8, r * 1.8, r, a, 0, TAU); x.fill(); }
    for (let k = 0; k < 5; k++) { const x0 = 50 + rng() * 28, y0 = 60 + rng() * 8, L = 18 + rng() * 44, w = 1.4 + rng() * 2; x.fillStyle = col() + '0.8)'; x.fillRect(x0 - w / 2, y0, w, L); x.beginPath(); x.ellipse(x0, y0 + L, w * 0.9, w * 1.3, 0, 0, TAU); x.fill(); }
    T.spatter = toTex(c, { repeat: false }); }
  // Empreinte de semelle (talon et avant-pied), en gris neutre : teintée selon le sol.
  { const s = 64, c = makeCanvas(s, 128), x = c.getContext('2d');
    x.fillStyle = 'rgba(255,255,255,.85)'; x.beginPath(); x.ellipse(32, 38, 20, 30, 0, 0, TAU); x.fill(); x.beginPath(); x.ellipse(32, 98, 16, 20, 0, 0, TAU); x.fill();
    x.globalCompositeOperation = 'destination-out'; x.fillStyle = 'rgba(0,0,0,.45)'; for (let k = 0; k < 7; k++) x.fillRect(14, 18 + k * 7, 36, 2.5); for (let k = 0; k < 4; k++) x.fillRect(18, 86 + k * 7, 28, 2.5);
    T.print = toTex(c, { repeat: false }); }
  T.scorch = toTex(radial(128, [[0, 'rgba(10,8,6,.95)'], [0.45, 'rgba(25,20,16,.7)'], [1, 'rgba(0,0,0,0)']]), { repeat: false });
  return T;
}

// Givre aux bords de l'écran : dendrites de glace (image CSS).
function frostOverlayURL() {
  const W = 1024, H = 576, c = makeCanvas(W, H), x = c.getContext('2d');
  const r = mulberry32(42);
  x.lineCap = 'round';
  const branch = (px, py, a, len, w, depth) => {
    if (depth <= 0 || len < 3) return;
    const nx = px + Math.cos(a) * len, ny = py + Math.sin(a) * len;
    x.strokeStyle = `rgba(225,245,255,${0.10 + depth * 0.05})`; x.lineWidth = w; x.beginPath(); x.moveTo(px, py); x.lineTo(nx, ny); x.stroke();
    branch(nx, ny, a + (r() - 0.5) * 0.5, len * 0.8, w * 0.75, depth - 1);
    if (r() < 0.8) branch(nx, ny, a + 1.05 + (r() - 0.5) * 0.3, len * 0.5, w * 0.6, depth - 2);
    if (r() < 0.8) branch(nx, ny, a - 1.05 + (r() - 0.5) * 0.3, len * 0.5, w * 0.6, depth - 2);
  };
  for (let k = 0; k < 110; k++) {
    const side = k % 4; let px, py, a;
    if (side === 0) { px = r() * W; py = 0; a = Math.PI / 2; } else if (side === 1) { px = r() * W; py = H; a = -Math.PI / 2; }
    else if (side === 2) { px = 0; py = r() * H; a = 0; } else { px = W; py = r() * H; a = Math.PI; }
    branch(px, py, a + (r() - 0.5) * 1.2, 18 + r() * 34, 2.2, 6);
  }
  const g = x.createRadialGradient(W / 2, H / 2, H * 0.32, W / 2, H / 2, W * 0.62);
  g.addColorStop(0, 'rgba(200,235,255,0)'); g.addColorStop(1, 'rgba(200,235,255,.35)');
  x.fillStyle = g; x.fillRect(0, 0, W, H);
  return c.toDataURL('image/png');
}

/* ─── Panneaux, affiches et inscriptions ─── */
function textTexture(w, h, draw, opts) { const c = makeCanvas(w, h), x = c.getContext('2d'); draw(x, w, h); return toTex(c, Object.assign({ repeat: false }, opts)); }
const STENCIL = '900 1px "Big Shoulders Display", "Arial Black", Impact, sans-serif';
const font = (px, weight = 900) => STENCIL.replace('900 1px', `${weight} ${px}px`);
function woodSign(lines, { w = 512, h = 256, color = '#f1ead8', bg = '#4a3a2a' } = {}) {
  return textTexture(w, h, (x) => {
    x.fillStyle = bg; x.fillRect(0, 0, w, h);
    for (let i = 0; i < 40; i++) { x.fillStyle = `rgba(0,0,0,${rng() * 0.12})`; x.fillRect(0, rng() * h, w, 1 + rng() * 3); }
    x.strokeStyle = 'rgba(0,0,0,.5)'; x.lineWidth = 8; x.strokeRect(4, 4, w - 8, h - 8);
    x.fillStyle = color; x.textAlign = 'center'; x.textBaseline = 'middle';
    const lh = h / (lines.length + 0.6);
    lines.forEach((l, i) => { x.font = font(Math.min(lh * 0.8, (w * 1.6) / Math.max(4, l.length))); x.globalAlpha = 0.92; x.fillText(l, w / 2, lh * (i + 0.8)); });
    x.globalAlpha = 1;
  });
}
function perkSign(name, color, cost) {
  return textTexture(512, 256, (x, w, h) => {
    const g = x.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#0d1216'); g.addColorStop(1, '#040607'); x.fillStyle = g; x.fillRect(0, 0, w, h);
    x.strokeStyle = color; x.lineWidth = 10; x.strokeRect(12, 12, w - 24, h - 24);
    x.shadowColor = color; x.shadowBlur = 30; x.fillStyle = color; x.textAlign = 'center'; x.textBaseline = 'middle';
    let fs = 88; x.font = font(fs); while (fs > 40 && x.measureText(name).width > w - 64) { fs -= 4; x.font = font(fs); } x.fillText(name, w / 2, h * 0.44);
    x.shadowBlur = 0; x.fillStyle = '#e8f6ff'; x.font = font(40, 700); x.fillText(cost + ' PTS', w / 2, h * 0.78);
  });
}
function chalkOutline(profile, label, cost) {
  return textTexture(512, 256, (x, w, h) => {
    x.strokeStyle = 'rgba(245,245,240,.85)'; x.lineWidth = 5; x.lineJoin = 'round'; x.setLineDash([14, 4, 6, 3]);
    x.beginPath(); profile.forEach(([px, py], i) => { const X = 40 + px * (w - 80), Y = 36 + py * (h - 110); i ? x.lineTo(X, Y) : x.moveTo(X, Y); }); x.closePath(); x.stroke();
    x.setLineDash([]); x.fillStyle = 'rgba(245,245,240,.85)'; x.textAlign = 'center'; x.font = font(38, 800);
    x.fillText(`${label} · ${cost}`, w / 2, h - 26);
  });
}
function tableMapTexture() {
  return textTexture(1024, 768, (x, w, h) => {
    x.fillStyle = '#d9cfb4'; x.fillRect(0, 0, w, h);
    for (let i = 0; i < 3000; i++) { x.fillStyle = `rgba(90,70,40,${rng() * 0.06})`; x.fillRect(rng() * w, rng() * h, 2 + rng() * 8, 2 + rng() * 8); }
    x.strokeStyle = 'rgba(80,110,130,.25)'; x.lineWidth = 1; for (let i = 0; i < w; i += 48) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i, h); x.stroke(); } for (let i = 0; i < h; i += 48) { x.beginPath(); x.moveTo(0, i); x.lineTo(w, i); x.stroke(); }
    x.strokeStyle = '#3b2a1a'; x.lineWidth = 7; x.beginPath(); x.moveTo(60, 240); for (let i = 0; i < 12; i++) x.lineTo(60 + i * 80, 240 + (i % 2 ? 40 : 0)); x.stroke();
    x.strokeStyle = '#a3261d'; x.lineWidth = 5; x.setLineDash([16, 10]); x.beginPath(); x.moveTo(40, 120); for (let i = 0; i < 12; i++) x.lineTo(40 + i * 85, 110 + Math.sin(i) * 30); x.stroke(); x.setLineDash([]);
    x.fillStyle = '#2c2116'; x.font = font(44); x.fillText('SECTEUR NORD — POSTE AVANCÉ 7', 60, 70);
    x.font = font(30, 700); x.fillText('1ère LIGNE', 80, 300); x.fillText('DÉPÔT GÉNÉRATEUR', 120, 620); x.fillText('SOUTIEN EST', 760, 520);
    x.fillStyle = '#a3261d'; x.fillText('ZONE INFECTÉE', 620, 150);
    x.beginPath(); x.arc(300, 640, 26, 0, TAU); x.strokeStyle = '#a3261d'; x.lineWidth = 4; x.stroke();
  });
}
function posterTexture(title, sub, tone) {
  return textTexture(256, 360, (x, w, h) => {
    x.fillStyle = tone; x.fillRect(0, 0, w, h);
    for (let i = 0; i < 800; i++) { x.fillStyle = `rgba(0,0,0,${rng() * 0.08})`; x.fillRect(rng() * w, rng() * h, 3, 3); }
    x.fillStyle = '#1b1510'; x.textAlign = 'center'; x.font = font(52); x.fillText(title, w / 2, 110);
    x.font = font(22, 700); sub.split('\n').forEach((l, i) => x.fillText(l, w / 2, 170 + i * 28));
    x.strokeStyle = '#1b1510'; x.lineWidth = 6; x.strokeRect(14, 14, w - 28, h - 28);
  });
}
