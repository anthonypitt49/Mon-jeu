/* ═══════════════════ TROUSSE D'ACCESSOIRES (cartes de plain-pied) ═══════════════════
   Meubles, véhicules, mobilier urbain, mannequins, toits. Tout est posé en coordonnées du monde (x, z, orientation)
   et fusionné par matière à la fin de la construction. Les obstacles gênants reçoivent une boîte de collision. */

const KIT = {
  m: (c, o) => fmat('plain', c, o || {}),
  g(x, z, ry = 0, y = 0, parent = R.scene) { const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = ry; parent.add(g); return g; },
  b(g, x, y, z, w, h, d, mat, ry = 0, shadow = true) { return mesh(boxG(w, h, d), mat, x, y, z, ry, g, shadow); },
  c(g, x, y, z, r0, r1, h, mat, seg = 12, shadow = true) { return mesh(new THREE.CylinderGeometry(r0, r1, h, seg), mat, x, y, z, 0, g, shadow); },
  s(g, x, y, z, r, mat, sx = 1, sy = 1, sz = 1) { const m = mesh(new THREE.SphereGeometry(r, 14, 10), mat, x, y, z, 0, g); m.scale.set(sx, sy, sz); return m; },
  solid(g, w, d, h, mat = 'wood', ox = 0, oz = 0) { g.updateMatrixWorld(true); const p = new THREE.Vector3(ox, 0, oz).applyMatrix4(g.matrixWorld); colliderBox(p.x, p.z, w, d, g.rotation.y, h, mat); },
  glow(g, x, y, z, color, size = 1, opacity = 0.8) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: TEX.sprites.glow, color, blending: THREE.AdditiveBlending, depthWrite: false, opacity })); s.scale.set(size, size, 1); s.position.set(x, y, z); g.add(s); return s; },
};
const KM = {}; // matières partagées de la trousse
function kitMats() {
  if (KM.chrome) return KM;
  Object.assign(KM, {
    chrome: stdMat({ color: 0xd9dde2, roughness: 0.18, metalness: 1 }),
    rubber: stdMat({ color: 0x151515, roughness: 0.85 }),
    glass: new THREE.MeshStandardMaterial({ color: 0x1b252c, roughness: 0.05, metalness: 0.7, transparent: true, opacity: 0.55 }),
    wood: fmat('planks', 0x8a6446), woodDark: fmat('planks', 0x4e3526), woodLight: fmat('planks', 0xc49a6c),
    plastic: stdMat({ color: 0xe8d7c2, roughness: 0.35, metalness: 0.05 }),
    fabricRed: stdMat({ color: 0x9b2e2a, roughness: 0.95, map: TEX.cloth.map, normalMap: TEX.cloth.normalMap }),
    fabricTeal: stdMat({ color: 0x3d8a86, roughness: 0.95, map: TEX.cloth.map, normalMap: TEX.cloth.normalMap }),
    fabricMustard: stdMat({ color: 0xc79a2e, roughness: 0.95, map: TEX.cloth.map, normalMap: TEX.cloth.normalMap }),
    white: KIT.m(0xeeeae0), black: KIT.m(0x1b1b1d), grey: KIT.m(0x7a7a78), steel: stdMat({ color: 0x8c9196, roughness: 0.45, metalness: 0.8, map: TEX.grime.map }),
    screen: new THREE.MeshStandardMaterial({ color: 0x223028, emissive: 0x7fb8a8, emissiveIntensity: 0.25, roughness: 0.3 }),
    bulb: new THREE.MeshBasicMaterial({ color: 0xffe2b0 }),
  });
  return KM;
}

/* ─── Mobilier ─── */
function kSofa(x, z, ry, fab) {
  const k = kitMats(), g = KIT.g(x, z, ry), f = fab || k.fabricTeal;
  KIT.b(g, 0, 0.25, 0, 2.1, 0.3, 0.9, f); KIT.b(g, 0, 0.62, -0.36, 2.1, 0.62, 0.2, f);
  for (const s of [-1, 1]) KIT.b(g, s * 0.98, 0.45, 0, 0.16, 0.5, 0.9, f);
  for (const s of [-0.5, 0.5]) KIT.b(g, s, 0.44, 0.05, 0.94, 0.12, 0.7, f);
  for (const [a, b] of [[-0.95, -0.35], [0.95, -0.35], [-0.95, 0.35], [0.95, 0.35]]) KIT.c(g, a, 0.05, b, 0.025, 0.02, 0.1, k.woodDark, 6);
  KIT.solid(g, 2.1, 0.9, 0.8, 'wood'); return g;
}
function kArmchair(x, z, ry, fab) {
  const k = kitMats(), g = KIT.g(x, z, ry), f = fab || k.fabricMustard;
  KIT.b(g, 0, 0.25, 0, 0.85, 0.3, 0.85, f); KIT.b(g, 0, 0.65, -0.34, 0.85, 0.7, 0.18, f);
  for (const s of [-1, 1]) KIT.b(g, s * 0.36, 0.45, 0, 0.14, 0.45, 0.85, f);
  KIT.solid(g, 0.85, 0.85, 0.8, 'wood'); return g;
}
function kTable(x, z, ry, w = 1.6, d = 0.9, h = 0.76, top) {
  const k = kitMats(), g = KIT.g(x, z, ry), t = top || k.wood;
  KIT.b(g, 0, h - 0.03, 0, w, 0.06, d, t);
  for (const [a, b] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) KIT.b(g, a * (w / 2 - 0.08), (h - 0.06) / 2, b * (d / 2 - 0.08), 0.06, h - 0.06, 0.06, k.woodDark);
  KIT.solid(g, w, d, h, 'wood'); return g;
}
function kChair(x, z, ry, mat) {
  const k = kitMats(), g = KIT.g(x, z, ry), m = mat || k.woodDark;
  KIT.b(g, 0, 0.45, 0, 0.44, 0.05, 0.44, m); KIT.b(g, 0, 0.72, -0.2, 0.44, 0.5, 0.04, m);
  for (const [a, b] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) KIT.b(g, a * 0.19, 0.22, b * 0.19, 0.04, 0.44, 0.04, m);
  return g;
}
function kDining(x, z, ry) { const g = kTable(x, z, ry, 1.5, 0.9); const k = kitMats(); for (const [a, b, r] of [[-0.45, -0.7, 0], [0.45, -0.7, 0], [-0.45, 0.7, Math.PI], [0.45, 0.7, Math.PI]]) { const p = new THREE.Vector3(a, 0, b).applyAxisAngle(_v1.set(0, 1, 0), ry); kChair(x + p.x, z + p.z, ry + r + rand(-0.2, 0.2), k.fabricRed); } return g; }
function kCounter(x, z, ry, len = 3, color = 0xe9e4d6, top = 0xc23b3b) {
  const k = kitMats(), g = KIT.g(x, z, ry), body = KIT.m(color), tp = KIT.m(top, { rough: 0.35 });
  KIT.b(g, 0, 0.44, 0, len, 0.88, 0.62, body); KIT.b(g, 0, 0.91, 0.02, len + 0.04, 0.05, 0.68, tp);
  for (let i = 0; i < Math.floor(len / 0.6); i++) { KIT.b(g, -len / 2 + 0.3 + i * 0.6, 0.5, 0.315, 0.52, 0.7, 0.02, KIT.m(color * 0 + 0xdcd6c6)); KIT.b(g, -len / 2 + 0.3 + i * 0.6, 0.78, 0.33, 0.14, 0.02, 0.02, KM.chrome); }
  KIT.b(g, 0, 1.55, -0.2, len, 0.6, 0.34, body); // placards hauts
  KIT.solid(g, len, 0.66, 0.95, 'wood'); return g;
}
function kFridge(x, z, ry, color = 0xe8e2d0) {
  const k = kitMats(), g = KIT.g(x, z, ry), m = KIT.m(color, { rough: 0.3 });
  KIT.b(g, 0, 0.85, 0, 0.8, 1.7, 0.72, m); const top = KIT.c(g, 0, 1.7, 0, 0.4, 0.4, 0.72, m, 16); top.rotation.x = Math.PI / 2; top.scale.set(1, 1, 0.35);
  KIT.b(g, 0.3, 1.1, 0.37, 0.05, 0.4, 0.05, k.chrome); KIT.b(g, -0.1, 0.5, 0.37, 0.5, 0.03, 0.02, k.chrome);
  KIT.solid(g, 0.8, 0.72, 1.8, 'metal'); return g;
}
function kStove(x, z, ry) {
  const k = kitMats(), g = KIT.g(x, z, ry), m = KIT.m(0xf0ece2, { rough: 0.3 });
  KIT.b(g, 0, 0.45, 0, 0.9, 0.9, 0.65, m); KIT.b(g, 0, 0.93, 0.02, 0.92, 0.04, 0.68, k.black);
  for (const [a, b] of [[-0.22, -0.15], [0.22, -0.15], [-0.22, 0.15], [0.22, 0.15]]) KIT.c(g, a, 0.96, b, 0.1, 0.1, 0.02, k.steel, 12);
  KIT.b(g, 0, 1.2, -0.3, 0.9, 0.5, 0.06, m); KIT.b(g, 0, 0.45, 0.33, 0.7, 0.45, 0.02, k.black);
  KIT.solid(g, 0.9, 0.65, 0.95, 'metal'); return g;
}
function kTV(x, z, ry) {
  const k = kitMats(), g = KIT.g(x, z, ry);
  KIT.b(g, 0, 0.45, 0, 0.9, 0.7, 0.55, k.woodDark); KIT.b(g, 0, 0.5, 0.28, 0.52, 0.42, 0.02, k.screen);
  KIT.b(g, 0, 0.9, 0, 0.6, 0.06, 0.4, k.woodDark); for (const s of [-1, 1]) { const a = KIT.b(g, s * 0.12, 1.1, 0, 0.012, 0.45, 0.012, k.chrome); a.rotation.z = s * 0.45; }
  for (const s of [-1, 1]) KIT.c(g, s * 0.35, 0.05, 0, 0.03, 0.02, 0.1, k.woodDark, 6);
  KIT.solid(g, 0.9, 0.55, 0.9, 'wood'); return g;
}
function kLamp(x, z, ry, lit = true) {
  const k = kitMats(), g = KIT.g(x, z, ry);
  KIT.c(g, 0, 0.02, 0, 0.18, 0.2, 0.04, k.black); KIT.c(g, 0, 0.8, 0, 0.015, 0.015, 1.55, k.chrome, 6);
  const sh = mesh(new THREE.CylinderGeometry(0.16, 0.26, 0.3, 16, 1, true), KM['shade' + lit] ||= stdMat({ color: 0xf2e2bc, roughness: 0.8, side: THREE.DoubleSide, emissive: lit ? 0xffb060 : 0, emissiveIntensity: 0.35 }), 0, 1.6, 0, 0, g, false);
  if (lit) KIT.glow(g, 0, 1.58, 0, 0xffc890, 0.55, 0.35);
  return g;
}
function kBed(x, z, ry, fab) {
  const k = kitMats(), g = KIT.g(x, z, ry), f = fab || k.fabricRed;
  KIT.b(g, 0, 0.25, 0, 1.5, 0.3, 2.1, k.woodDark); KIT.b(g, 0, 0.48, 0.05, 1.45, 0.18, 1.95, k.white); KIT.b(g, 0, 0.56, 0.3, 1.47, 0.08, 1.4, f);
  KIT.b(g, 0, 0.62, -0.75, 1.2, 0.14, 0.35, k.white); KIT.b(g, 0, 0.75, -1.03, 1.55, 1.0, 0.07, k.woodDark);
  KIT.solid(g, 1.5, 2.1, 0.6, 'wood'); return g;
}
function kDresser(x, z, ry, w = 1.2) {
  const k = kitMats(), g = KIT.g(x, z, ry);
  KIT.b(g, 0, 0.5, 0, w, 1.0, 0.5, k.wood); for (let i = 0; i < 3; i++) { KIT.b(g, 0, 0.22 + i * 0.3, 0.255, w - 0.1, 0.24, 0.02, k.woodLight); KIT.b(g, 0, 0.22 + i * 0.3, 0.27, 0.16, 0.03, 0.03, KM.chrome); }
  KIT.solid(g, w, 0.5, 1.0, 'wood'); return g;
}
function kShelf(x, z, ry, w = 1.6, h = 2, items = true) {
  const k = kitMats(), g = KIT.g(x, z, ry);
  for (const s of [-1, 1]) KIT.b(g, s * w / 2, h / 2, 0, 0.05, h, 0.45, k.steel);
  const r = mulberry32((x * 13 + z * 7) | 0), cans = [0xc23b3b, 0x3b7ac2, 0xd6b23a, 0x6aa84f, 0xe8e2d0];
  for (let i = 0; i < 4; i++) {
    const y = 0.1 + i * (h - 0.2) / 3; KIT.b(g, 0, y, 0, w, 0.03, 0.45, k.steel);
    if (items && i < 3) for (let j = 0; j < 7; j++) if (r() > 0.25) { const c = KIT.c(g, -w / 2 + 0.15 + j * (w - 0.3) / 6, y + 0.08, (r() - 0.5) * 0.2, 0.05, 0.05, 0.14, KIT.m(cans[(r() * cans.length) | 0], { rough: 0.4 }), 8, false); }
  }
  KIT.solid(g, w, 0.45, h, 'metal'); return g;
}
function kRug(x, z, ry, w, d, color) { const g = KIT.g(x, z, ry); const m = mesh(new THREE.PlaneGeometry(w, d), stdMat({ color, roughness: 1, map: TEX.cloth.map }), 0, 0.012, 0, 0, g, false); m.rotation.x = -Math.PI / 2; m.receiveShadow = true; return g; }

/* ─── Véhicules ─── */
// Berline des années 50 : caisse galbée, ailerons, chromes, pneus à flancs blancs.
// Véhicules : voir 06c_vehicles.js.

/* ─── Salle de bains, cuisine, plantes ─── */
function kToilet(x, z, ry) { const g = KIT.g(x, z, ry), w = KIT.m(0xf0eee8, { rough: 0.25 }); KIT.c(g, 0, 0.2, 0.05, 0.16, 0.13, 0.4, w, 12); KIT.c(g, 0, 0.42, 0.08, 0.2, 0.2, 0.05, w, 14).scale.set(1, 1, 1.25); KIT.b(g, 0, 0.6, -0.2, 0.42, 0.36, 0.17, w); KIT.b(g, 0, 0.8, -0.2, 0.44, 0.04, 0.19, w); KIT.solid(g, 0.45, 0.65, 0.8, 'concrete'); return g; }
function kSink(x, z, ry, mirror = true) { const g = KIT.g(x, z, ry), w = KIT.m(0xf0eee8, { rough: 0.25 }), k = kitMats(); KIT.c(g, 0, 0.42, -0.05, 0.06, 0.09, 0.84, w, 10); KIT.b(g, 0, 0.86, 0, 0.55, 0.12, 0.42, w); KIT.b(g, 0, 0.93, -0.15, 0.04, 0.12, 0.04, k.chrome); if (mirror) { KIT.b(g, 0, 1.55, -0.2, 0.55, 0.7, 0.02, KIT.m(0xd8dde2, { rough: 0.02, metal: 1 }), 0, false); KIT.b(g, 0, 1.55, -0.205, 0.61, 0.76, 0.015, k.white, 0, false); } return g; }
function kUpperCab(x, z, ry, len = 3, color = 0xe9e4d6) { const g = KIT.g(x, z, ry, 1.6), m = KIT.m(color, { rough: 0.5 }), k = kitMats(); KIT.b(g, 0, 0.38, 0, len, 0.75, 0.35, m); for (let i = 0; i < Math.round(len / 0.6); i++) { const px = -len / 2 + 0.3 + i * 0.6; KIT.b(g, px, 0.38, 0.178, 0.56, 0.7, 0.01, KIT.m(color, { rough: 0.35 }), 0, false); KIT.b(g, px + 0.2, 0.2, 0.19, 0.02, 0.1, 0.02, k.chrome, 0, false); } return g; }
function kPlant(x, z, s = 1, pot = 0xb8643a) { const g = KIT.g(x, z, rand(TAU)); KIT.c(g, 0, 0.18 * s, 0, 0.17 * s, 0.13 * s, 0.36 * s, KIT.m(pot, { rough: 0.8 }), 10); const leaf = KIT.m(0x3f7a3a, { rough: 0.8 }); for (let i = 0; i < 7; i++) { const a = (i / 7) * TAU, l = KIT.b(g, Math.cos(a) * 0.12 * s, (0.55 + rand(0, 0.25)) * s, Math.sin(a) * 0.12 * s, 0.08 * s, 0.5 * s, 0.02 * s, leaf, -a, false); l.rotation.z = Math.cos(a) * 0.5; l.rotation.x = Math.sin(a) * 0.5; } return g; }
function kBookcase(x, z, ry, w = 1.2, h = 2) { const g = KIT.g(x, z, ry), wood = kitMats().woodDark; KIT.b(g, 0, h / 2, 0, w, h, 0.32, wood); const cols = [0x7a2a22, 0x2a4a6a, 0x5a5a3a, 0x3a2a4a, 0x8a6a3a, 0x2a5a3a]; for (let r = 0; r < 4; r++) for (let i = 0; i < Math.floor(w / 0.07) - 2; i++) { if (Math.random() < 0.12) continue; const bh = 0.22 + Math.random() * 0.1; KIT.b(g, -w / 2 + 0.1 + i * 0.07, 0.15 + r * (h / 4.2) + bh / 2, 0.05, 0.06, bh, 0.22, KIT.m(cols[(i * 7 + r * 3) % cols.length], { rough: 0.9 }), 0, false); } KIT.solid(g, w, 0.35, h); return g; }

/* ─── Mobilier urbain ─── */
function kLampPost(x, z, ry, light = null) {
  const k = kitMats(), g = KIT.g(x, z, ry), m = KIT.m(0x3c4148, { rough: 0.5, metal: 0.6 });
  KIT.c(g, 0, 2.7, 0, 0.07, 0.1, 5.4, m, 8); const arm = KIT.b(g, 0.5, 5.3, 0, 1.1, 0.06, 0.06, m);
  KIT.b(g, 1.0, 5.2, 0, 0.5, 0.12, 0.3, m); KIT.b(g, 1.0, 5.12, 0, 0.42, 0.04, 0.24, k.bulb, 0, false);
  const glow = KIT.glow(g, 1.0, 5.0, 0, 0xffc070, 2.2, 0.7);
  colliderBox(x, z, 0.24, 0.24, 0, 5.4, 'metal');
  if (light) { g.updateMatrixWorld(true); const p = new THREE.Vector3(1.0, 4.9, 0).applyMatrix4(g.matrixWorld); light.position.copy(p); }
  return { g, glow };
}
function kHydrant(x, z) { const g = KIT.g(x, z, rand(TAU)), m = KIT.m(0xc23a2a, { rough: 0.5 }); KIT.c(g, 0, 0.3, 0, 0.12, 0.14, 0.6, m, 10); KIT.s(g, 0, 0.6, 0, 0.13, m, 1, 0.7, 1); const n = KIT.c(g, 0, 0.42, 0, 0.05, 0.05, 0.4, m, 8); n.rotation.z = Math.PI / 2; colliderBox(x, z, 0.3, 0.3, 0, 0.7, 'metal'); return g; }
function kMailbox(x, z, ry, color = 0x2e5a8a) { const g = KIT.g(x, z, ry), m = KIT.m(color, { rough: 0.4 }); KIT.b(g, 0, 0.55, 0, 0.08, 1.1, 0.08, kitMats().woodDark); KIT.b(g, 0, 1.18, 0, 0.26, 0.24, 0.5, m); const f = KIT.b(g, 0.15, 1.3, 0.1, 0.02, 0.2, 0.06, KIT.m(0xc23a2a)); return g; }
function kTrash(x, z) { const g = KIT.g(x, z, rand(TAU)), m = kitMats().steel; KIT.c(g, 0, 0.45, 0, 0.28, 0.25, 0.9, m, 12); KIT.c(g, 0, 0.93, 0, 0.3, 0.3, 0.06, m, 12); colliderBox(x, z, 0.6, 0.6, 0, 0.95, 'metal'); return g; }
function kCone(x, z) { const g = KIT.g(x, z, rand(TAU)); KIT.b(g, 0, 0.02, 0, 0.36, 0.04, 0.36, KIT.m(0x1b1b1b)); KIT.c(g, 0, 0.3, 0, 0.03, 0.15, 0.56, KIT.m(0xff6a1a, { rough: 0.5 }), 10); return g; }
function kSign(x, z, ry, lines, bg = '#e8e2d0', color = '#1a1a1a', h = 2.2) { const g = KIT.g(x, z, ry); KIT.c(g, 0, h / 2, 0, 0.035, 0.035, h, kitMats().steel, 6); const s = mesh(new THREE.PlaneGeometry(0.9, 0.5), new THREE.MeshStandardMaterial({ map: woodSign(lines, { w: 256, h: 140, bg, color }), roughness: 0.6, side: THREE.DoubleSide }), 0, h, 0.04, 0, g, false); return g; }
function kStopSign(x, z, ry) { const g = KIT.g(x, z, ry); KIT.c(g, 0, 1.1, 0, 0.035, 0.035, 2.2, kitMats().steel, 6); const t = textTexture(128, 128, (c) => { c.fillStyle = '#b8261e'; c.beginPath(); for (let i = 0; i < 8; i++) { const a = (i / 8) * TAU + TAU / 16; c.lineTo(64 + Math.cos(a) * 62, 64 + Math.sin(a) * 62); } c.fill(); c.fillStyle = '#fff'; c.font = font(38); c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('STOP', 64, 66); }); const s = mesh(new THREE.CircleGeometry(0.34, 8), new THREE.MeshStandardMaterial({ map: t, roughness: 0.5, side: THREE.DoubleSide }), 0, 2.2, 0.04, 0, g, false); s.rotation.z = TAU / 16; return g; }
function kBench(x, z, ry) { const k = kitMats(), g = KIT.g(x, z, ry); for (let i = 0; i < 3; i++) KIT.b(g, 0, 0.45, -0.15 + i * 0.15, 1.6, 0.05, 0.12, k.wood); for (let i = 0; i < 2; i++) KIT.b(g, 0, 0.7 + i * 0.16, -0.26, 1.6, 0.1, 0.04, k.wood); for (const s of [-1, 1]) KIT.b(g, s * 0.7, 0.35, 0, 0.06, 0.7, 0.5, k.black); KIT.solid(g, 1.6, 0.55, 0.6, 'wood'); return g; }

/* ─── Jardins ─── */
function kSwing(x, z, ry) { const k = kitMats(), g = KIT.g(x, z, ry), m = KIT.m(0xb8372c, { rough: 0.5, metal: 0.4 });
  for (const s of [-1, 1]) for (const t of [-1, 1]) { const l = KIT.c(g, s * 1.3 + t * 0.35, 1.1, 0, 0.04, 0.04, 2.35, m, 6); l.rotation.z = -t * 0.3; }
  const bar = KIT.c(g, 0, 2.2, 0, 0.05, 0.05, 2.7, m, 8); bar.rotation.z = Math.PI / 2;
  for (const o of [-0.6, 0.5]) { for (const s of [-0.22, 0.22]) KIT.c(g, o + s, 1.45, 0, 0.008, 0.008, 1.5, k.steel, 4); KIT.b(g, o, 0.7, 0, 0.5, 0.04, 0.2, k.black); }
  colliderBox(x, z, 3.2, 0.5, ry, 2.2, 'metal'); return g; }
function kGrill(x, z, ry) { const k = kitMats(), g = KIT.g(x, z, ry); const b = KIT.s(g, 0, 0.8, 0, 0.3, k.black, 1, 0.6, 1); for (let i = 0; i < 3; i++) { const l = KIT.c(g, Math.cos(i * 2.1) * 0.18, 0.38, Math.sin(i * 2.1) * 0.18, 0.02, 0.02, 0.8, k.black, 6); l.rotation.z = Math.cos(i * 2.1) * 0.2; l.rotation.x = -Math.sin(i * 2.1) * 0.2; } KIT.c(g, 0, 1.0, 0, 0.3, 0.3, 0.02, k.steel, 14); colliderBox(x, z, 0.6, 0.6, 0, 1, 'metal'); return g; }
function kPicnic(x, z, ry) { const k = kitMats(), g = KIT.g(x, z, ry); KIT.b(g, 0, 0.75, 0, 1.8, 0.05, 0.8, k.woodLight); for (const s of [-1, 1]) { KIT.b(g, 0, 0.45, s * 0.65, 1.8, 0.05, 0.3, k.woodLight); for (const t of [-1, 1]) { const l = KIT.b(g, t * 0.7, 0.38, s * 0.3, 0.06, 0.8, 0.06, k.wood); l.rotation.x = s * 0.5; } } KIT.solid(g, 1.8, 1.6, 0.8, 'wood'); return g; }
function kDoghouse(x, z, ry, color = 0xb8372c) { const k = kitMats(), g = KIT.g(x, z, ry), m = fmat('siding', color); KIT.b(g, 0, 0.45, 0, 1.0, 0.9, 1.2, m); for (const s of [-1, 1]) { const r = KIT.b(g, s * 0.3, 1.12, 0, 0.72, 0.05, 1.3, KIT.m(0x4a3a30)); r.rotation.z = -s * 0.7; } KIT.b(g, 0, 0.35, 0.61, 0.45, 0.55, 0.02, k.black, 0, false); KIT.solid(g, 1.0, 1.2, 1.3, 'wood'); return g; }
function kClothesline(x, z, ry) { const k = kitMats(), g = KIT.g(x, z, ry); for (const s of [-1, 1]) { KIT.c(g, s * 2, 1.0, 0, 0.04, 0.04, 2.0, k.steel, 6); KIT.b(g, s * 2, 1.95, 0, 0.05, 0.05, 0.9, k.steel); } for (const o of [-0.3, 0.3]) KIT.b(g, 0, 1.93, o, 4, 0.01, 0.01, k.white, 0, false); const cols = [0xe8e2d0, 0x6fa8c8, 0xd77a8a, 0xe8d28a]; for (let i = 0; i < 5; i++) { const c = mesh(new THREE.PlaneGeometry(0.55, 0.7), stdMat({ color: cols[i % 4], roughness: 1, side: THREE.DoubleSide, map: TEX.cloth.map }), -1.5 + i * 0.75, 1.55, i % 2 ? 0.3 : -0.3, 0, g, true); c.rotation.z = rand(-0.05, 0.05); } return g; }
function kPool(x, z, r = 1.4) { const g = KIT.g(x, z, 0); const t = mesh(new THREE.TorusGeometry(r, 0.18, 10, 32), stdMat({ color: 0x5fb3d9, roughness: 0.4 }), 0, 0.18, 0, 0, g); t.rotation.x = Math.PI / 2; const w = mesh(new THREE.CircleGeometry(r, 32), new THREE.MeshStandardMaterial({ color: 0x3f8fae, roughness: 0.05, metalness: 0.3 }), 0, 0.2, 0, 0, g, false); w.rotation.x = -Math.PI / 2; colliderBox(x, z, r * 2, r * 2, 0, 0.36, 'wood'); return g; }
function kShrub(x, z, s = 1, color = 0x4f7a3a) { const g = KIT.g(x, z, rand(TAU)), m = fmat('plain', color, { rough: 1 }); for (let i = 0; i < 4; i++) KIT.s(g, rand(-0.3, 0.3) * s, (0.35 + rand(0, 0.25)) * s, rand(-0.3, 0.3) * s, 0.42 * s, m, 1, 0.8, 1); return g; }
function kTires(x, z, n = 3) { const g = KIT.g(x, z, rand(TAU)), k = kitMats(); for (let i = 0; i < n; i++) { const t = mesh(new THREE.TorusGeometry(0.34, 0.13, 8, 18), k.rubber, rand(-0.03, 0.03), 0.13 + i * 0.26, rand(-0.03, 0.03), 0, g); t.rotation.x = Math.PI / 2; } colliderBox(x, z, 0.95, 0.95, 0, n * 0.26, 'wood'); return g; }

/* ─── Mannequins : silhouettes lisses et sans visage (tête détachable) ─── */
let MANNE_MAT = null;
function kMannequin(x, z, ry, { pose = 'stand', cloth = null, y = 0, head = true } = {}) {
  MANNE_MAT ||= stdMat({ color: 0xe6d6c4, roughness: 0.32, metalness: 0.02 });
  const g = KIT.g(x, z, ry, y), M0 = MANNE_MAT, top = cloth ? (KM['cloth' + cloth] ||= stdMat({ color: cloth, roughness: 0.9, map: TEX.cloth.map })) : M0;
  const cap = (r, l) => new THREE.CapsuleGeometry(r, l, 4, 10);
  const part = (geo, mat, px, py, pz, rx = 0, rz = 0) => { const m = mesh(geo, mat, px, py, pz, 0, g); m.rotation.set(rx, 0, rz); return m; };
  const sit = pose === 'sit';
  const hipY = sit ? 0.5 : 0.95;
  part(cap(0.16, 0.34), top, 0, hipY + 0.42, 0).scale.set(1.15, 1, 0.75); // torse
  part(cap(0.14, 0.12), top, 0, hipY + 0.05, 0).scale.set(1.2, 1, 0.8); // bassin
  part(cap(0.05, 0.08), M0, 0, hipY + 0.8, 0); // cou
  // Jambes
  for (const s of [-1, 1]) {
    if (sit) { part(cap(0.07, 0.36), M0, s * 0.1, hipY, 0.25, Math.PI / 2); part(cap(0.06, 0.36), M0, s * 0.1, hipY - 0.25, 0.47); }
    else part(cap(0.07, 0.78), M0, s * 0.1, hipY - 0.47, 0, 0, s * 0.03);
  }
  // Bras
  for (const s of [-1, 1]) {
    const wave = pose === 'wave' && s > 0, point = pose === 'point' && s > 0;
    if (wave) part(cap(0.05, 0.62), M0, s * 0.34, hipY + 0.9, 0, 0, -0.25);
    else if (point) part(cap(0.05, 0.62), M0, s * 0.22, hipY + 0.6, 0.3, -Math.PI / 2 + 0.2, 0);
    else part(cap(0.05, 0.62), M0, s * 0.27, hipY + 0.3, 0, 0, s * 0.12);
  }
  let hd = null;
  if (head) { hd = mesh(new THREE.SphereGeometry(0.12, 16, 12), M0, 0, hipY + 1.0, 0, 0, g); hd.scale.set(0.9, 1.12, 1); hd.userData.dynamic = true; }
  if (!sit) KIT.c(g, 0, 0.02, 0.18, 0.2, 0.2, 0.03, kitMats().steel, 16); // socle
  colliderBox(x, z, 0.5, 0.5, 0, sit ? 1.3 : 1.9, 'wood');
  return { g, head: hd };
}

/* ─── Toitures ─── */
// Toit à deux pans au-dessus d'un rectangle (mètres), faîtage le long de l'axe le plus long.
function kGable(x0, z0, x1, z1, y0, rise, mat, over = 0.5, gableMat = null) {
  const alongX = x1 - x0 >= z1 - z0, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, L = (alongX ? x1 - x0 : z1 - z0) + over * 2, W = (alongX ? z1 - z0 : x1 - x0) / 2 + over;
  const slope = Math.hypot(W, rise), ang = Math.atan2(rise, W), s = mat.userData.scale || 2;
  const q = new QB(Object.assign(mat, {})); // pans
  for (const side of [-1, 1]) {
    // coin bas (avant-toit) et coin haut (faîtage)
    const P = alongX
      ? [[cx - L / 2, y0, cz + side * W], [cx + L / 2, y0, cz + side * W], [cx + L / 2, y0 + rise, cz], [cx - L / 2, y0 + rise, cz]]
      : [[cx + side * W, y0, cz - L / 2], [cx + side * W, y0, cz + L / 2], [cx, y0 + rise, cz + L / 2], [cx, y0 + rise, cz - L / 2]];
    const n = alongX ? [0, Math.cos(ang), side * Math.sin(ang)] : [side * Math.sin(ang), Math.cos(ang), 0];
    q.quad(P, n, [[0, 0], [L / s, 0], [L / s, slope / s], [0, slope / s]]);
    q.quad(P.map((p) => [p[0], p[1] - 0.12, p[2]]), n.map((v) => -v), [[0, 0], [L / s, 0], [L / s, slope / s], [0, slope / s]], [0.5, 0.5, 0.5, 0.5]);
  }
  q.build(true);
  // Pignons.
  if (gableMat) {
    const gq = new QB(gableMat), gs = gableMat.userData.scale || 2, Wi = W - over;
    for (const end of [-1, 1]) {
      const e = (alongX ? x1 - x0 : z1 - z0) / 2 * end;
      const tri = alongX ? [[cx + e, y0, cz - Wi], [cx + e, y0, cz + Wi], [cx + e, y0 + rise * (Wi / W), cz], [cx + e, y0 + rise * (Wi / W), cz]] : [[cx - Wi, y0, cz + e], [cx + Wi, y0, cz + e], [cx, y0 + rise * (Wi / W), cz + e], [cx, y0 + rise * (Wi / W), cz + e]];
      gq.quad(tri, alongX ? [end, 0, 0] : [0, 0, end], tri.map((p) => [(alongX ? p[2] : p[0]) / gs, p[1] / gs]));
    }
    gq.build(true);
  }
}
function kChimney(x, z, y0, h, mat) { const g = KIT.g(x, z, 0, y0); KIT.b(g, 0, h / 2, 0, 0.7, h, 0.7, mat); KIT.b(g, 0, h + 0.05, 0, 0.8, 0.1, 0.8, KIT.m(0x5a5048)); return g; }
function kAntenna(x, z, y0) { const g = KIT.g(x, z, rand(TAU), y0), m = kitMats().steel; KIT.c(g, 0, 1.2, 0, 0.025, 0.025, 2.4, m, 5); for (let i = 0; i < 5; i++) { const r = KIT.c(g, 0, 1.6 + i * 0.16, 0, 0.012, 0.012, 1.4 - i * 0.2, m, 4, false); r.rotation.z = Math.PI / 2; } return g; }

/* ─── Décoration intérieure : tableaux (une seule texture pour tous), plafonniers ─── */
let FRAME_MAT = null;
function kFrame(x, y, z, ry, w = 0.8, h = 0.6, cell = 0) {
  if (!FRAME_MAT) {
    const tex = textTexture(1024, 256, (c) => {
      const r = mulberry32(8), pal = [['#e8c26a', '#c2553a', '#2f5d7a', '#f1e6c8'], ['#9ccfa9', '#f2d57a', '#3a3a3a', '#e8e2d0'], ['#d77a8a', '#4a6a8a', '#f2eee4', '#2a2a2a'], ['#7a9a5a', '#c28a66', '#3a4a6a', '#f0e0c0']];
      for (let i = 0; i < 8; i++) {
        const x0 = i * 128, p = pal[i % 4]; c.fillStyle = p[3]; c.fillRect(x0, 0, 128, 256);
        if (i % 2) { c.fillStyle = p[2]; c.fillRect(x0, 150, 128, 106); c.fillStyle = p[0]; c.beginPath(); c.arc(x0 + 40 + r() * 40, 80, 26, 0, TAU); c.fill(); c.fillStyle = p[1]; c.beginPath(); c.moveTo(x0, 160); c.lineTo(x0 + 50, 90 + r() * 30); c.lineTo(x0 + 128, 170); c.fill(); }
        else for (let k = 0; k < 6; k++) { c.fillStyle = p[k % 3]; c.beginPath(); c.ellipse(x0 + 20 + r() * 88, 30 + r() * 196, 8 + r() * 26, 6 + r() * 20, r() * 3, 0, TAU); c.fill(); c.strokeStyle = p[2]; c.lineWidth = 3; c.beginPath(); c.moveTo(x0 + r() * 128, r() * 256); c.lineTo(x0 + r() * 128, r() * 256); c.stroke(); }
        c.strokeStyle = '#3b2a1a'; c.lineWidth = 10; c.strokeRect(x0 + 5, 5, 118, 246);
      }
    });
    FRAME_MAT = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.7 });
  }
  const geo = new THREE.PlaneGeometry(w, h), uv = geo.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setX(i, (cell % 8 + uv.getX(i)) / 8);
  const m = mesh(geo, FRAME_MAT, x, y, z, ry, R.scene, false); return m;
}
function kCeilLamp(x, z, y = 2.98, lit = true) {
  const g = KIT.g(x, z, 0, y), k = kitMats();
  const dome = mesh(new THREE.SphereGeometry(0.28, 16, 8, 0, TAU, 0, Math.PI / 2), KM.dome ||= new THREE.MeshStandardMaterial({ color: 0xf6ecd6, emissive: 0xffd9a0, emissiveIntensity: 0.9, roughness: 0.4 }), 0, -0.02, 0, 0, g, false); dome.rotation.x = Math.PI; dome.scale.y = 0.45;
  KIT.c(g, 0, -0.005, 0, 0.3, 0.3, 0.02, k.chrome, 16, false);
  if (lit) KIT.glow(g, 0, -0.12, 0, 0xffd9a0, 0.9, 0.25);
  return g;
}
