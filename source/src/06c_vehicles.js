/* ═══════════════════ VÉHICULES DES ANNÉES 50 ═══════════════════
   Silhouettes extrudées (profil latéral arrondi, passages de roue), vitres, chromes, phares, plaques.
   Variante « brûlée » : tôle carbonisée, vitres absentes, pneus fondus. Mêmes encombrements que l'ancienne version. */

// Profil latéral (x = longueur, y = hauteur) extrudé sur la largeur, arêtes arrondies.
function vExtrude(shape, width, bevel = 0.05, curve = 10) {
  const g = new THREE.ExtrudeGeometry(shape, { depth: Math.max(0.01, width - 2 * bevel), bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 2, curveSegments: curve });
  g.translate(0, 0, -(width - 2 * bevel) / 2); g.computeVertexNormals(); return g;
}
// Polygone + arcs de passage de roue (cx, rayon) sur le bas de caisse à la hauteur y0.
function vBodyShape(pts, arches, y0) {
  const s = new THREE.Shape(); s.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) s.lineTo(pts[i][0], pts[i][1]);
  // bas de caisse d'avant en arrière, avec les arches
  const sorted = arches.slice().sort((a, b) => b[0] - a[0]);
  for (const [cx, r] of sorted) { s.lineTo(cx + r, y0); s.absarc(cx, y0, r, 0, Math.PI, false); }
  s.closePath(); return s;
}
// Tôle calcinée : suie, cendre, rouille et lambeaux de la peinture d'origine ternie (1 motif pour ~3 m).
function burntMat(color) {
  const key = 'burnt' + color; if (KM[key]) return KM[key];
  const pc = new THREE.Color(color), n = (u, v, f, o = 4) => tfbm(u * f, v * f, f, o);
  const t = matSet(paint(256, (u, v) => {
    const rust = smooth(clamp((n(u, v, 5) - 0.44) * 3.2, 0, 1)), ash = smooth(clamp((n(u + 0.5, v + 0.2, 7) - 0.5) * 3, 0, 1));
    const left = smooth(clamp((n(u + 0.21, v + 0.7, 4) - 0.64) * 4, 0, 1)) * 0.8, soot = n(u, v * 3, 8, 3), pit = tnoise(u * 64, v * 64, 64), blister = tnoise(u * 24, v * 24, 24) > 0.8 ? 1 : 0;
    let r = 0.12, g = 0.105, b = 0.095;
    r = lerp(r, 0.37, rust); g = lerp(g, 0.19, rust); b = lerp(b, 0.1, rust);
    r = lerp(r, 0.52, ash * 0.7); g = lerp(g, 0.49, ash * 0.7); b = lerp(b, 0.45, ash * 0.7);
    r = lerp(r, pc.r * 0.62, left); g = lerp(g, pc.g * 0.58, left); b = lerp(b, pc.b * 0.5, left);
    const k = 1 - soot * 0.45 - pit * 0.08; r *= k; g *= k; b *= k;
    return [r, g, b, 0.3 + rust * 0.35 + left * 0.25 - blister * 0.2 + pit * 0.1];
  }), 3);
  for (const m of [t.map, t.normalMap]) m.repeat.set(0.33, 0.33);
  const m = stdMat({ color: 0xffffff, roughness: 0.9, metalness: 0.3, map: t.map, normalMap: t.normalMap });
  Object.assign(m.userData, { ftex: 'rouille', scale: 1 }); // photo : tôle rouillée, peinture partie au feu (05p_photo.js)
  return (KM[key] = m);
}
function vMats(color, burnt) {
  const k = kitMats();
  const paint = burnt ? burntMat(color) : (KM['car' + color] ||= fmat('tole', color, { rough: 0.32, metal: 0.45 })); // laque : grain et usure photographiés, brillant gardé
  return {
    paint, chrome: burnt ? (KM.burntTrim ||= KIT.m(0x2c2622, { rough: 0.8 })) : k.chrome, glass: burnt ? k.black : (KM.carGlass ||= new THREE.MeshStandardMaterial({ color: 0x182229, roughness: 0.04, metalness: 0.85, transparent: true, opacity: 0.72 })),
    tire: burnt ? (KM.burntTire ||= fmat('caoutchouc', 0x0e0d0c, { rough: 1 })) : k.rubber, white: burnt ? k.black : (KM.whitewall ||= KIT.m(0xece8de, { rough: 0.6 })),
    lamp: burnt ? k.black : (KM.headlamp ||= new THREE.MeshStandardMaterial({ color: 0xfff6e0, emissive: 0xffe8b0, emissiveIntensity: 0.25, roughness: 0.1 })),
    tail: burnt ? k.black : (KM.taillamp ||= new THREE.MeshStandardMaterial({ color: 0x8a0e0e, emissive: 0x5a0606, emissiveIntensity: 0.3, roughness: 0.2 })),
    seat: burnt ? k.black : (KM.carSeat ||= fmat('skai', 0x8a3a2e, { rough: 0.6 })), dark: k.black, // simili-cuir de sellerie
  };
}
function vWheel(g, x, y, z, r, w, V, side, hub = true) {
  const t = KIT.c(g, x, y, z, r, r, w, V.tire, 18); t.rotation.x = Math.PI / 2;
  if (hub) { const ww = KIT.c(g, x, y, z + side * w * 0.04, r * 0.68, r * 0.68, w * 1.02, V.white, 18, false); ww.rotation.x = Math.PI / 2; const h = KIT.c(g, x, y, z + side * w * 0.08, r * 0.4, r * 0.36, w * 1.04, V.chrome, 14, false); h.rotation.x = Math.PI / 2; }
}
function vPlate(g, x, y, z, ry, txt) {
  const m = KM['plate' + txt] ||= new THREE.MeshStandardMaterial({ map: woodSign([txt], { w: 256, h: 64, bg: '#e8d24a', color: '#1a1a1a' }), roughness: 0.5 });
  mesh(new THREE.PlaneGeometry(0.42, 0.12), m, x, y, z, ry, g, false);
}

/* ─── Berline 1955 (4,9 m) ─── */
function kCar(x, z, ry, color = 0x6fb7c8, burnt = false) {
  const g = KIT.g(x, z, ry), V = vMats(color, burnt), sink = burnt ? -0.12 : 0;
  const body = vBodyShape([[-2.42, 0.36], [-2.5, 0.62], [-2.46, 0.86], [-2.3, 0.98], [-1.25, 1.0], [0.95, 1.0], [2.2, 0.94], [2.46, 0.86], [2.5, 0.58], [2.44, 0.34]], [[1.5, 0.44], [-1.5, 0.44]], 0.3);
  const bm = mesh(vExtrude(body, 1.9, 0.07), V.paint, 0, 0.02 + sink, 0, 0, g);
  // Habitacle : montants peints, vitres en retrait.
  const cab = new THREE.Shape(); cab.moveTo(-1.32, 0); cab.lineTo(-0.92, 0.56); cab.quadraticCurveTo(-0.85, 0.6, -0.7, 0.6); cab.lineTo(0.3, 0.6); cab.quadraticCurveTo(0.45, 0.6, 0.5, 0.55); cab.lineTo(0.98, 0); cab.closePath();
  mesh(vExtrude(cab, 1.58, 0.05), V.paint, 0, 0.99 + sink, 0, 0, g);
  const win = new THREE.Shape(); win.moveTo(-1.16, 0.05); win.lineTo(-0.86, 0.5); win.lineTo(0.38, 0.5); win.lineTo(0.8, 0.05); win.closePath();
  for (const s of [-1, 1]) { const w = mesh(new THREE.ShapeGeometry(win), V.glass, 0, 0.99 + sink, s * 0.805, s > 0 ? 0 : Math.PI, g, false); if (s < 0) w.scale.x = -1; KIT.b(g, -0.25, 1.26 + sink, s * 0.81, 0.06, 0.48, 0.012, V.paint, 0, false); }
  const ws = KIT.b(g, 0.77, 1.31 + sink, 0, 0.02, 0.8, 1.42, V.glass, 0, false); ws.rotation.z = 0.77; const rw = KIT.b(g, -1.17, 1.3 + sink, 0, 0.02, 0.66, 1.4, V.glass, 0, false); rw.rotation.z = -0.62;
  // Sièges et volant, visibles derrière les vitres.
  if (!burnt) { for (const sx of [-0.85, 0.1]) { KIT.b(g, sx, 1.02, 0, 0.5, 0.18, 1.4, V.seat, 0, false); KIT.b(g, sx - 0.24, 1.3, 0, 0.12, 0.5, 1.4, V.seat, 0, false); } const sw = mesh(new THREE.TorusGeometry(0.17, 0.018, 6, 16), V.dark, 0.42, 1.24, 0.38, Math.PI / 2, g, false); sw.rotation.z = 0.5; }
  // Chromes : pare-chocs, calandre, enjoliveur latéral.
  for (const s of [-1, 1]) { const b = KIT.b(g, s * 2.52, 0.48 + sink, 0, 0.14, 0.16, 1.96, V.chrome); for (const e of [-1, 1]) KIT.s(g, s * 2.5, 0.48 + sink, e * 0.98, 0.09, V.chrome, 1, 0.9, 0.9); }
  KIT.b(g, 2.575, 0.68 + sink, 0, 0.05, 0.2, 1.1, V.dark, 0, false); for (let i = 0; i < 6; i++) KIT.b(g, 2.6, 0.68 + sink, -0.5 + i * 0.2, 0.03, 0.2, 0.03, V.chrome, 0, false);
  for (const s of [-1, 1]) KIT.b(g, 0.2, 0.74 + sink, s * 0.96, 3.6, 0.03, 0.01, V.chrome, 0, false);
  // Phares, feux, plaques.
  for (const s of [-1, 1]) { KIT.s(g, 2.53, 0.8 + sink, s * 0.7, 0.12, V.lamp, 0.4, 1, 1); KIT.b(g, -2.56, 0.78 + sink, s * 0.75, 0.04, 0.16, 0.24, V.tail, 0, false); }
  if (!burnt) { vPlate(g, 2.6, 0.46, 0, Math.PI / 2, '57-ATM'); vPlate(g, -2.6, 0.62, 0, -Math.PI / 2, '57-ATM'); }
  // Ailerons arrière.
  for (const s of [-1, 1]) { const f = new THREE.Shape(); f.moveTo(0, 0); f.lineTo(0.9, 0); f.lineTo(0.05, 0.22); f.closePath(); const fm = mesh(vExtrude(f, 0.06, 0.015), V.paint, -2.4, 0.96 + sink, s * 0.9, 0, g); }
  for (const [a, b] of [[1.5, 0.84], [-1.5, 0.84], [1.5, -0.84], [-1.5, -0.84]]) vWheel(g, a, burnt ? 0.28 : 0.36, b, burnt ? 0.3 : 0.36, 0.24, V, Math.sign(b), !burnt);
  KIT.solid(g, 5.0, 1.95, 1.6, 'metal'); return g;
}

/* ─── Car scolaire (11 m) ─── */
function kBus(x, z, ry, burnt = false) {
  const k = kitMats(), g = KIT.g(x, z, ry), V = vMats(0xe8a81e, burnt);
  const yellow = burnt ? V.paint : (KM.busYellow ||= fmat('tole', 0xe8a81e, { rough: 0.45, metal: 0.25 }));
  // Caisse : arrière droit, toit bombé, capot moteur à l'avant (x > 0).
  const box = vBodyShape([[-4.8, 0.45], [-4.82, 2.5], [-4.6, 2.86], [4.1, 2.86], [4.32, 2.5], [4.36, 1.5], [5.6, 1.42], [5.95, 1.1], [5.98, 0.5]], [[3.8, 0.56], [-3.2, 0.56]], 0.45);
  mesh(vExtrude(box, 2.44, 0.1), yellow, 0, 0, 0, 0, g);
  // Bandeau de vitres latérales, montants, bandes noires.
  for (const s of [-1, 1]) {
    KIT.b(g, -0.25, 2.1, s * 1.223, 8.5, 0.62, 0.02, V.glass, 0, false);
    for (let i = 0; i < 10; i++) KIT.b(g, -4.35 + i * 0.95, 2.1, s * 1.226, 0.1, 0.66, 0.03, yellow, 0, false);
    for (const y of [1.6, 1.25, 0.92]) KIT.b(g, 0.3, y, s * 1.226, 9.4, 0.07, 0.02, V.dark, 0, false);
    KIT.b(g, 4.7, 1.8, s * 1.0, 0.04, 0.3, 0.22, V.chrome, 0, false); // rétroviseurs
  }
  KIT.b(g, 4.46, 2.05, 0, 0.03, 0.66, 2.1, V.glass, 0, false); KIT.b(g, -4.935, 1.95, 0, 0.03, 0.75, 1.6, V.glass, 0, false); KIT.b(g, -4.94, 1.25, 0, 0.02, 1.2, 0.7, V.dark, 0, false); // pare-brise, lunette, sortie de secours
  KIT.b(g, 4.0, 1.4, 1.224, 0.8, 2.0, 0.02, V.glass, 0, false); // porte accordéon
  // Calandre, pare-chocs noir, phares, feux du toit.
  KIT.b(g, 6.09, 0.85, 0, 0.05, 0.45, 1.2, V.chrome, 0, false); KIT.b(g, 6.05, 0.55, 0, 0.16, 0.24, 2.4, V.dark);
  KIT.b(g, -4.9, 0.6, 0, 0.14, 0.22, 2.4, V.dark);
  for (const s of [-1, 1]) { KIT.s(g, 6.0, 1.15, s * 0.85, 0.13, V.lamp, 0.5, 1, 1); for (const px of [4.3, -4.75]) KIT.c(g, px, 2.98, s * 0.7, 0.1, 0.1, 0.06, burnt ? V.dark : (KM.busLamp ||= new THREE.MeshStandardMaterial({ color: 0xff7a2a, emissive: 0x8a2a0a, emissiveIntensity: 0.3 })), 10, false).rotation.z = Math.PI / 2; }
  if (!burnt) { const sign = mesh(new THREE.PlaneGeometry(2.4, 0.36), KM.busSign ||= new THREE.MeshStandardMaterial({ map: woodSign(['ÉCOLE'], { w: 512, h: 90, bg: '#e8a81e', color: '#111' }), roughness: 0.6 }), 4.47, 2.6, 0, Math.PI / 2, g, false); vPlate(g, -4.96, 0.85, 0, -Math.PI / 2, 'ÉCOLE 12'); }
  // Bras « STOP » et roues (jumelées à l'arrière).
  { const st = mesh(new THREE.CircleGeometry(0.22, 8), burnt ? V.dark : (KM.stopRed ||= KIT.m(0xb8241c, { rough: 0.5 })), 3.0, 1.75, -1.25, Math.PI, g, false); }
  for (const [a, s] of [[3.8, 1], [-3.2, 1], [3.8, -1], [-3.2, -1]]) vWheel(g, a, burnt ? 0.42 : 0.5, s * 1.12, burnt ? 0.42 : 0.5, 0.3, V, s, !burnt);
  if (burnt) {
    for (let i = 0; i < 5; i++) KIT.b(g, -4 + i * 1.8, 2.9, rand(-0.6, 0.6), 1.2, 0.04, 0.8, V.dark, rand(-0.3, 0.3), false); // tôle de toit gondolée
    // Carcasses de sièges derrière les vitres béantes, suie léchant la tôle au-dessus des fenêtres.
    const frame = KM.burntSeat ||= KIT.m(0x3a2c22, { rough: 0.9, metal: 0.4 });
    for (let i = 0; i < 8; i++) for (const s of [-1, 1]) { KIT.b(g, -3.9 + i * 0.95, 1.55, s * 0.72, 0.06, 0.7, 0.8, frame, rand(-0.2, 0.2), false); KIT.b(g, -3.7 + i * 0.95, 1.2, s * 0.72, 0.42, 0.05, 0.8, frame, 0, false); }
    const sootM = KM.sootStreak ||= new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.55, depthWrite: false, alphaMap: (TEX.sootA ||= textTexture(64, 128, (x, w, h) => { const gr = x.createLinearGradient(0, h, 0, 0); gr.addColorStop(0, '#fff'); gr.addColorStop(1, '#000'); x.fillStyle = gr; for (let i = 0; i < 9; i++) { const cx = rand(4, w - 4), cw = rand(5, 14); x.fillRect(cx - cw / 2, h * rand(0, 0.4), cw, h); } }, { srgb: false })) });
    for (let i = 0; i < 7; i++) for (const s of [-1, 1]) mesh(new THREE.PlaneGeometry(rand(0.6, 1.1), rand(0.35, 0.5)), sootM, -3.9 + i * 1.2 + rand(-0.2, 0.2), 2.62, s * 1.236, s > 0 ? 0 : Math.PI, g, false);
  }
  KIT.solid(g, 11.2, 2.5, 2.8, 'metal', 0.5, 0); return g;
}

/* ─── Camion de déménagement, hayon ouvert, chargement renversé (9,4 m) ─── */
function kTruck(x, z, ry, label = 'DÉMÉNAGEMENTS') {
  const k = kitMats(), g = KIT.g(x, z, ry), V = vMats(0x3e6e8e, false);
  const cab = KM.truckCab ||= fmat('tole', 0x3e6e8e, { rough: 0.38, metal: 0.4 });
  const boxM = KM.truckBox ||= fmat('tole', 0xe9e3d3, { rough: 0.65, metal: 0.15 });
  // Cabine arrondie et capot.
  const cs = vBodyShape([[2.55, 0.5], [2.55, 2.55], [2.75, 2.75], [3.7, 2.75], [4.0, 2.4], [4.25, 1.7], [5.15, 1.6], [5.35, 1.3], [5.38, 0.5]], [[4.3, 0.52]], 0.5);
  mesh(vExtrude(cs, 2.3, 0.1), cab, 0, 0, 0, 0, g);
  for (const s of [-1, 1]) { KIT.b(g, 3.3, 2.2, s * 1.152, 0.85, 0.55, 0.02, V.glass, 0, false); KIT.b(g, 4.45, 1.85, s * 1.25, 0.04, 0.32, 0.2, V.chrome, 0, false); }
  const ws = KIT.b(g, 4.06, 2.27, 0, 0.02, 0.9, 1.9, V.glass, 0, false); ws.rotation.z = 0.48;
  KIT.b(g, 5.36, 1.0, 0, 0.05, 0.5, 1.5, V.chrome, 0, false); for (let i = 0; i < 8; i++) KIT.b(g, 5.38, 1.0, -0.65 + i * 0.186, 0.03, 0.5, 0.04, V.dark, 0, false);
  KIT.b(g, 5.45, 0.55, 0, 0.18, 0.22, 2.36, V.chrome); for (const s of [-1, 1]) KIT.s(g, 5.3, 1.35, s * 0.85, 0.15, V.lamp, 0.5, 1, 1);
  // Caisse : nervures, bandeau, cadre arrière, portes ouvertes.
  KIT.b(g, -0.95, 2.0, 0, 6.6, 2.9, 2.5, boxM); KIT.b(g, -0.95, 0.42, 0, 6.6, 0.18, 2.3, V.dark);
  for (let i = 0; i <= 12; i++) for (const s of [-1, 1]) KIT.b(g, -4.2 + i * 0.54, 2.0, s * 1.262, 0.05, 2.8, 0.03, boxM, 0, false);
  for (const s of [-1, 1]) KIT.b(g, -0.95, 3.35, s * 1.262, 6.6, 0.12, 0.04, KIT.m(0x2f5d7a), 0, false);
  const lab = mesh(new THREE.PlaneGeometry(4.6, 0.9), KM['truckLab' + label] ||= new THREE.MeshStandardMaterial({ map: woodSign([label, 'SERVICE ATOMIQUE'], { w: 512, h: 110, bg: '#e9e3d3', color: '#2f5d7a' }), roughness: 0.7 }), -0.95, 2.2, 1.29, 0, g, false);
  const lab2 = lab.clone(); lab2.position.z = -1.29; lab2.rotation.y = Math.PI; g.add(lab2);
  for (const s of [-1, 1]) { KIT.b(g, -4.27, 2.0, s * 1.2, 0.1, 2.9, 0.12, V.chrome); const d = KIT.b(g, -4.3, 2.0, s * 1.95, 0.06, 2.8, 1.25, boxM); d.rotation.y = s * 0.15; } // vantaux grands ouverts
  KIT.b(g, -4.3, 3.42, 0, 0.12, 0.14, 2.5, V.chrome); KIT.b(g, -4.27, 2.0, 0, 0.02, 2.75, 2.3, V.dark, 0, false); // intérieur sombre
  const ramp = KIT.b(g, -5.3, 0.35, 0, 2.2, 0.06, 1.4, V.chrome); ramp.rotation.z = 0.32; // rampe de chargement
  for (const s of [-1, 1]) { KIT.b(g, -4.35, 0.75, s * 0.95, 0.04, 0.14, 0.24, V.tail, 0, false); KIT.b(g, -3.6, 0.45, s * 1.18, 0.4, 0.5, 0.02, V.dark, 0, false); } // feux, bavettes
  KIT.c(g, 1.6, 0.75, 1.05, 0.25, 0.25, 1.0, V.chrome, 14).rotation.z = Math.PI / 2; // réservoir
  for (const [a, s] of [[4.3, 1], [-2.8, 1], [4.3, -1], [-2.8, -1]]) vWheel(g, a, 0.52, s * 1.08, 0.52, 0.32, V, s, true);
  for (const s of [-1, 1]) vWheel(g, -2.8, 0.52, s * 0.78, 0.52, 0.28, V, s, false);
  vPlate(g, -4.36, 0.62, 0, -Math.PI / 2, 'TR-1957');
  KIT.solid(g, 9.4, 2.5, 3.4, 'metal', -0.2, 0); return g;
}
