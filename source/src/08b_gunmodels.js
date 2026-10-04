/* ═══════════════════ ARMES : MODÈLES DÉTAILLÉS ═══════════════════
   Armes d'époque aux cotes réelles (mètres), dessinées en code : pièces taillées dans un profil de côté extrudé aux arêtes
   arrondies, canons et barillets tournés, matières peintes au démarrage (acier bruni et usé, acier phosphaté, noyer verni,
   bakélite quadrillée, aluminium, cuir des gants, laine des manches). Mains gantées dont les doigts enserrent la poignée.
   Repère : canon vers -Z, origine à la poignée, y vers le haut ; « d » = distance vers l'avant (z = -d).
   Les pièces fixes sont fusionnées par matière à la fin : une arme = une dizaine d'appels de dessin. */

/* ─── Matières ─── */
function gunMaterials() {
  const S = clamp(Q.texSize, 256, 512);
  const tex = (p, k, o) => { const t = toTex(p.canvas, o); t.userData = { k }; return t; };
  // Noyer verni : le fil court le long de la pièce (u), veines ondulées, pores.
  const woodP = paint(S, (u, v, x, y) => {
    const warp = tfbm(u * 4, v * 4, 4, 3), low = tfbm(u * 2 + 5, v * 2, 2, 2);
    const lines = 0.5 + 0.5 * Math.sin(TAU * (v * 22 + warp * 0.7)), streak = hash2(11, y >> 1) * 0.6 + hash2(5, y) * 0.4;
    const pore = hash2(x >> 2, y) > 0.96 ? 1 : 0;
    const k = 0.72 + lines ** 3 * 0.22 + streak * 0.16 + low * 0.22 - pore * 0.12;
    return [0.33 * k, 0.185 * k, 0.105 * k, lines * 0.25 + streak * 0.2 - pore * 0.15];
  });
  // Acier bruni : bleu-noir, brossé dans la longueur, usé jusqu'au métal par endroits.
  const blueP = paint(S, (u, v, x, y) => {
    const brush = hash2(7, y) * 0.5 + hash2(Math.floor(x / 9), y) * 0.5, wear = smooth(clamp((tfbm(u * 8, v * 8, 8, 4) - 0.67) * 5, 0, 1)) * 0.35;
    const b = 0.19 + brush * 0.04;
    return [lerp(b * 0.9, 0.5, wear), lerp(b, 0.5, wear), lerp(b * 1.2, 0.5, wear), brush * 0.3];
  });
  const blueR = paint(S, (u, v, x, y) => { const wear = smooth(clamp((tfbm(u * 8, v * 8, 8, 4) - 0.64) * 5, 0, 1)); const r = 0.28 + hash2(3, y) * 0.1 + tfbm(u * 12, v * 12, 12, 2) * 0.12 - wear * 0.1; return [r, r, r, 0]; });
  // Acier phosphaté : gris-vert mat, grené.
  const parkP = paint(S, (u, v, x, y) => { const g = hash2(x, y) * 0.05 + tfbm(u * 10, v * 10, 10, 3) * 0.06; return [0.15 + g, 0.155 + g, 0.145 + g, g * 4]; });
  // Grain clair pour les métaux teintés par leur couleur (laiton, aluminium).
  const lightP = paint(S, (u, v, x, y) => { const g = 0.84 + hash2(x, y) * 0.06 + tfbm(u * 8, v * 8, 8, 3) * 0.12; return [g, g, g, g]; });
  // Bakélite quadrillée : pointes de diamant (relief), brun très sombre.
  const bakeP = paint(S, (u, v) => {
    const a = (u + v) * 24 % 1, b = ((u - v) * 24 % 1 + 1) % 1, h = Math.min(0.5 - Math.abs(a - 0.5), 0.5 - Math.abs(b - 0.5)) * 2;
    const c = 0.1 + tfbm(u * 6, v * 6, 6, 2) * 0.05;
    return [c * 1.25, c * 0.8, c * 0.55, h];
  });
  // Cuir des gants : brun, plis et grain.
  const leatherP = paint(S, (u, v) => {
    const w = tfbm(u * 6, v * 6, 6, 4), gr = tnoise(u * 64, v * 64, 64);
    const c = 0.16 + w * 0.12;
    return [c * 1.3, c * 0.88, c * 0.56, w * 0.6 + gr * 0.4];
  });
  // Tôle perforée (pare-chaleur du fusil de tranchée) : trous oblongs en quinconce.
  const holesP = paint(S, (u, v) => {
    const row = Math.floor(v * 8), x = (u * 4 + (row % 2) * 0.5) % 1, y = v * 8 % 1;
    const inHole = ((x - 0.5) / 0.32) ** 2 + ((y - 0.5) / 0.3) ** 2 < 1;
    return [inHole ? 0 : 1, inHole ? 0 : 1, inHole ? 0 : 1, 0];
  });
  const mk = (o, k) => { const m = new THREE.MeshStandardMaterial(o); m.userData.uvk = k; return m; };
  GM.blued = mk({ color: 0xffffff, map: tex(blueP, 9), roughnessMap: tex(blueR, 9, { srgb: false }), normalMap: normalFromHeight(blueP.height, S, 0.6), normalScale: new THREE.Vector2(0.25, 0.25), metalness: 1, roughness: 1 }, 9);
  GM.park = mk({ color: 0xffffff, map: tex(parkP, 10), normalMap: normalFromHeight(parkP.height, S, 1), normalScale: new THREE.Vector2(0.3, 0.3), metalness: 0.55, roughness: 0.68 }, 10);
  GM.wood = mk({ color: 0xffffff, map: tex(woodP, 3.5), normalMap: normalFromHeight(woodP.height, S, 0.8), normalScale: new THREE.Vector2(0.2, 0.2), metalness: 0, roughness: 0.45 }, 3.5);
  GM.bake = mk({ color: 0xffffff, map: tex(bakeP, 16), normalMap: normalFromHeight(bakeP.height, S, 3), metalness: 0.05, roughness: 0.48 }, 16);
  GM.alu = mk({ color: 0x8e9296, map: tex(lightP, 6), metalness: 0.9, roughness: 0.45 }, 6);
  GM.polish = mk({ color: 0xc4cad0, map: tex(lightP, 8), metalness: 1, roughness: 0.22 }, 8);
  GM.iron = mk({ color: 0x5c5b3e, map: tex(lightP, 6), metalness: 0.25, roughness: 0.78 }, 6);
  GM.bore = mk({ color: 0x050505, roughness: 0.6, metalness: 0.4 }, 1);
  GM.brass = mk({ color: 0xc9a25a, metalness: 1, roughness: 0.32, map: tex(lightP, 6) }, 6);
  GM.holes = mk({ color: 0xffffff, map: GM.blued.map, alphaMap: tex(holesP, 1, { srgb: false }), alphaTest: 0.5, side: THREE.DoubleSide, metalness: 1, roughness: 0.4 }, 1);
  GM.glove = mk({ color: 0xffffff, map: tex(leatherP, 9), normalMap: normalFromHeight(leatherP.height, S, 2), metalness: 0, roughness: 0.62 }, 9);
  GM.sleeve = mk({ color: 0x6b6648, roughness: 0.95, map: TEX.cloth.map, normalMap: TEX.cloth.normalMap }, 6);
  GM.lens = mk({ color: 0x1a2a3a, roughness: 0.04, metalness: 0.9 }, 1);
  GM.cryoGlass = mk({ color: 0x9fe8ff, emissive: 0x33b8ff, emissiveIntensity: 1.6, roughness: 0.1, transparent: true, opacity: 0.85 }, 1);
  // Arme améliorée : givre veiné de lumière bleue à la place de l'acier et du bois.
  const veins = paint(256, (u, v) => { const a = Math.abs(tfbm(u * 6, v * 6, 6, 4) - 0.5), b = Math.abs(tfbm(u * 14 + 3, v * 14, 14, 3) - 0.5); const k = Math.max(smooth(clamp(1 - a * 14, 0, 1)), smooth(clamp(1 - b * 18, 0, 1)) * 0.6); return [k * 0.55, k * 0.85, k, k]; });
  const vt = toTex(veins.canvas);
  const camo = paint(256, (u, v) => { const n1 = tfbm(u * 5, v * 5, 5, 4); const w = 0.62 + n1 * 0.3; return [w * 0.78, w * 0.88, w, n1]; });
  GM.frost = mk({ color: 0xc2d6e4, roughness: 0.28, metalness: 0.82, map: toTex(camo.canvas), emissive: 0x4ab8ff, emissiveMap: vt, emissiveIntensity: 1.4 }, 5);
  GM.frostWood = mk({ color: 0xe6f2fa, roughness: 0.35, metalness: 0.15, map: GM.wood.map, emissive: 0x4ab8ff, emissiveMap: vt, emissiveIntensity: 1.1 }, 3.5);
  // Anciens noms (couteau, grenade, rayonneur, cryo).
  GM.steel = GM.blued; GM.dark = GM.park;
}

/* ─── Boîte à outils de modélisation ─── */
// Un atelier par arme : chaque pièce est rangée dans `p` (le corps de l'arme par défaut, ou une pièce mobile).
function gunKit(root, up) {
  const swap = (m) => (!up ? m : m === GM.blued || m === GM.park || m === GM.alu ? GM.frost : m === GM.wood || m === GM.bake ? GM.frostWood : m);
  const uv = (geo, k) => { const a = geo.attributes.uv; if (a && k !== 1) for (let i = 0; i < a.count; i++) a.setXY(i, a.getX(i) * k, a.getY(i) * k); return geo; };
  const put = (geo, m, p = root) => { m = swap(m); const o = new THREE.Mesh(geo, m); p.add(o); return o; };
  const K = {
    // Profil de côté [[d, y], …] extrudé sur l'épaisseur w (centré en x), arêtes arrondies (bev).
    pr(pts, w, m, { x = 0, bev = 0.0015, p } = {}) {
      const sh = new THREE.Shape(pts.map(([d, y]) => new THREE.Vector2(d, y)));
      const b = Math.min(bev, w * 0.3), geo = new THREE.ExtrudeGeometry(sh, { depth: Math.max(0.0002, w - 2 * b), bevelEnabled: b > 0, bevelThickness: b, bevelSize: b * 0.8, bevelSegments: 2, curveSegments: 6 });
      geo.translate(0, 0, -(w - 2 * b) / 2); geo.rotateY(Math.PI / 2); geo.translate(x, 0, 0);
      return put(uv(geo, swap(m).userData.uvk ?? 1), m, p);
    },
    // Pièce tournée autour de l'axe du canon : [[d, rayon], …] ; axe à (x, y).
    lt(pts, m, { x = 0, y = 0, seg = 18, p } = {}) {
      const geo = new THREE.LatheGeometry(pts.map(([d, r]) => new THREE.Vector2(Math.max(r, 1e-4), d)), seg);
      geo.rotateX(-Math.PI / 2); geo.translate(x, y, 0);
      return put(uv(geo, 2), m, p);
    },
    // Tube le long du canon, de d0 à d1 (r2 : rayon à l'avant).
    cy(r, d0, d1, m, { x = 0, y = 0, r2 = r, seg = 16, open = false, a0 = 0, a = TAU, p } = {}) {
      const geo = new THREE.CylinderGeometry(r2, r, Math.abs(d1 - d0), seg, 1, open, a0, a); geo.rotateX(-Math.PI / 2); geo.translate(x, y, -(d0 + d1) / 2);
      return put(geo, m, p);
    },
    // Pavé aux arêtes arrondies, de d0 à d1.
    bx(w, h, d0, d1, m, { x = 0, y = 0, bev = 0.001, p } = {}) { return K.pr([[d0, y - h / 2], [d1, y - h / 2], [d1, y + h / 2], [d0, y + h / 2]], w, m, { x, bev, p }); },
    // Arc dans le plan de côté (pontet, anneau) : centre (d, y), angles depuis l'avant (0) vers le haut (π/2).
    ar(R, r, a0, a1, m, { d = 0, y = 0, x = 0, p } = {}) {
      const geo = new THREE.TorusGeometry(R, r, 6, 20, a1 - a0); geo.rotateZ(a0); geo.rotateY(Math.PI / 2); geo.translate(x, y, -d);
      return put(geo, m, p);
    },
    sp(r, m, { d = 0, y = 0, x = 0, s = [1, 1, 1], p } = {}) { const geo = new THREE.SphereGeometry(r, 12, 8); geo.scale(...s); geo.translate(x, y, -d); return put(geo, m, p); },
    // Cylindre entre deux points (goupilles, vis, leviers).
    rod(a, b, r, m, { p, seg = 8, r2 = r } = {}) {
      const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b), dir = B.clone().sub(A), len = dir.length();
      const geo = new THREE.CylinderGeometry(r2, r, len, seg); geo.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize())); geo.translate((A.x + B.x) / 2, (A.y + B.y) / 2, (A.z + B.z) / 2);
      return put(geo, m, p);
    },
    // Rainures fines d'une glissière ou d'un garde-main.
    ribs(n, w, h, d0, step, m, { x = 0, y = 0, t = 0.0012, p } = {}) { for (let i = 0; i < n; i++) K.bx(w, h, d0 + i * step, d0 + i * step + t, m, { x, y, bev: 0, p }); },
    // Cylindre vertical (chargeur camembert, tourelles) de y0 à y1.
    vc(r, y0, y1, m, { d = 0, x = 0, seg = 24, r2 = r, p } = {}) { const geo = new THREE.CylinderGeometry(r2, r, y1 - y0, seg); geo.translate(x, (y0 + y1) / 2, -d); return put(geo, m, p); },
    // Anneau face à l'avant (dioptre, frettes autour du canon).
    ring(R, r, m, { d = 0, y = 0, x = 0, p } = {}) { const geo = new THREE.TorusGeometry(R, r, 6, 20); geo.translate(x, y, -d); return put(geo, m, p); },
    // Profil courbe : bords avant et arrière en courbes de Bézier (chargeur cintré).
    curve(front, back, w, m, o = {}) {
      const q = (a, c, b, n = 10) => Array.from({ length: n + 1 }, (_, i) => { const t = i / n; return [(1 - t) ** 2 * a[0] + 2 * (1 - t) * t * c[0] + t * t * b[0], (1 - t) ** 2 * a[1] + 2 * (1 - t) * t * c[1] + t * t * b[1]]; });
      return K.pr([...q(...front), ...q(...back).reverse()], w, m, o);
    },
    up,
    group(d = 0, y = 0, x = 0, p = root) { const g = new THREE.Group(); g.position.set(x, y, -d); p.add(g); return g; },
  };
  return K;
}
// Fusionne par matière les pièces fixes d'un groupe, sous-groupes compris, sauf les pièces mobiles (skip).
function gunMerge(g, skip = new Set()) {
  g.updateMatrixWorld(true);
  const inv = g.matrixWorld.clone().invert(), byMat = new Map();
  const walk = (o) => { for (const c of [...o.children]) { if (skip.has(c) || c.userData.keep) continue; if (c.isMesh) { const l = byMat.get(c.material) || []; l.push(c); byMat.set(c.material, l); } else walk(c); } };
  walk(g);
  for (const [m, list] of byMat) {
    if (list.length < 2 && list[0].parent === g) continue;
    const geos = list.map((o) => {
      const q = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone(), mx = inv.clone().multiply(o.matrixWorld); q.applyMatrix4(mx);
      for (const k of Object.keys(q.attributes)) if (!['position', 'normal', 'uv'].includes(k)) q.deleteAttribute(k);
      if (mx.determinant() < 0) for (const a of Object.values(q.attributes)) { const n = a.itemSize, arr = a.array; for (let t = 0; t < a.count; t += 3) for (let c = 0; c < n; c++) { const i1 = (t + 1) * n + c, i2 = (t + 2) * n + c, tmp = arr[i1]; arr[i1] = arr[i2]; arr[i2] = tmp; } } // miroir : on retourne les triangles
      q.clearGroups(); return q;
    });
    const merged = mergeGeometries(geos); if (!merged) continue;
    for (const o of list) { o.parent.remove(o); o.geometry.dispose(); }
    g.add(new THREE.Mesh(merged, m));
  }
  // Sous-groupes vidés par la fusion.
  const prune = (o) => { for (const c of [...o.children]) { if (skip.has(c) || c.isMesh || c.isObject3D && c.type !== 'Group') continue; prune(c); if (!c.children.length) o.remove(c); } };
  prune(g);
}

/* ─── Mains gantées ─── */
// Capsule entre deux points (phalanges, pouce).
function gkFinger(K, pts, r, p) { for (let i = 0; i < pts.length - 1; i++) K.rod(pts[i], pts[i + 1], r * (1 - i * 0.06), GM.glove, { p, seg: 8 }); for (let i = 0; i < pts.length; i++) K.sp(r * (1 - Math.max(0, i - 1) * 0.06), GM.glove, { x: pts[i][0], y: pts[i][1], d: -pts[i][2], p }); }
// Poignet, manchette du gant et manche de capote, du poignet vers l'épaule (direction dans le repère de l'arme).
function gkArm(K, wrist, dir, p, len = 0.5) {
  const A = new THREE.Vector3(...wrist), D = new THREE.Vector3(...dir).normalize(), B = A.clone().addScaledVector(D, 0.07), C = A.clone().addScaledVector(D, len);
  K.rod(A.toArray(), B.toArray(), 0.03, GM.glove, { p, seg: 12, r2: 0.036 });
  K.rod(B.clone().addScaledVector(D, -0.012).toArray(), C.toArray(), 0.044, GM.sleeve, { p, seg: 14, r2: 0.056 });
  K.rod(B.clone().addScaledVector(D, -0.014).toArray(), B.clone().addScaledVector(D, 0.02).toArray(), 0.047, GM.sleeve, { p, seg: 14 }); // revers de la manche
}
// Main qui enserre une poignée inclinée : point haut de la poignée (d, y), inclinaison ang (le bas part vers l'arrière),
// rayon d'enroulement R (demi-profondeur de la poignée + doigt), aplatissement sx (largeur / profondeur).
// trig : l'index va sur la détente ; cup : main gauche en coupe par-dessus la droite (pistolet à deux mains).
function gkGripHand(K, root, o) {
  const { d, y, ang = 0.3, R = 0.034, sx = 0.72, top = 0.012, n = 3, trig = true, thumb = true, cup = false, mirror = false, arm = [0.25, -0.5, 1] } = o;
  const h = new THREE.Group(); h.position.set(0, y, -d); h.rotation.x = -ang; if (mirror) h.scale.x = -1; root.add(h);
  const rr = cup ? R + 0.0125 : R, x0 = cup || mirror ? -1 : 1;
  for (let i = 0; i < n; i++) {
    const fy = -top - i * 0.021 - (cup ? 0.008 : 0), r = (cup ? 0.92 : 0.96) * ([0.0098, 0.0095, 0.009, 0.0082][i + (n < 4 ? 1 : 0)] || 0.0085);
    const a0 = cup ? -0.35 : -0.3, a1 = cup ? Math.PI + 0.1 : Math.PI + 0.35;
    const geo = new THREE.TorusGeometry(rr, r, 7, 16, a1 - a0); geo.rotateX(-Math.PI / 2); geo.rotateY(a0); geo.scale(sx, 1, 1); geo.translate(0, fy, 0);
    const f = new THREE.Mesh(geo, GM.glove); h.add(f);
    const tip = [Math.cos(a1) * rr * sx, fy, -Math.sin(a1) * rr], kn = [Math.cos(a0) * rr * sx, fy, -Math.sin(a0) * rr];
    K.sp(r * 1.02, GM.glove, { x: tip[0], y: tip[1], d: -tip[2], p: h }); K.sp(r * 1.06, GM.glove, { x: kn[0], y: kn[1], d: -kn[2], p: h });
  }
  if (!cup) {
    // Dos de la main (à droite de la poignée), naissance du pouce à l'arrière, pouce le long du flanc gauche.
    K.sp(0.05, GM.glove, { x: R * sx * 0.85, y: -top - 0.028, d: -R * 0.35, s: [0.4, 1.05, 1.0], p: h });
    K.sp(0.017, GM.glove, { x: 0.003, y: -0.006, d: -R * 0.8, s: [1.0, 0.85, 1.25], p: h });
    if (thumb) gkFinger(K, [[-R * sx * 0.55, 0.004, R * 0.75], [-R * sx - 0.004, 0.012, R * 0.05], [-R * sx - 0.004, 0.017, -R * 0.75], [-R * sx - 0.002, 0.019, -R * 1.35]], 0.0105, h);
    if (trig) gkFinger(K, [[R * sx * 0.95, -top + 0.024, -R * 0.15], [0.01, -top + 0.024, -R - 0.012], [0.0, -top + 0.012, -R - 0.03], [-0.004, -top + 0.002, -R - 0.03]], 0.0094, h);
  } else {
    // Paume gauche contre les doigts droits, pouce gauche vers l'avant sous la culasse.
    K.sp(0.042, GM.glove, { x: -rr * sx * 0.9, y: -top - 0.03, d: -R * 0.15, s: [0.38, 1.0, 1.0], p: h });
    gkFinger(K, [[-rr * sx * 0.9, -top + 0.004, R * 0.5], [-R * sx - 0.012, -top + 0.016, -R * 0.4], [-R * sx - 0.01, -top + 0.02, -R * 1.25], [-R * sx - 0.008, -top + 0.022, -R * 1.9]], 0.0105, h);
  }
  h.updateMatrix();
  const wrist = new THREE.Vector3((cup ? -1 : 1) * R * sx * 0.3, -top - 0.06, R * 0.75).applyMatrix4(h.matrix); void x0;
  gkArm(K, wrist.toArray(), arm, root);
  return h;
}
// Main d'appui sous un garde-main horizontal : paume dessous, doigts remontant le flanc droit, pouce à gauche.
function gkForeHand(K, root, o) {
  const { d, y, R = 0.03, sx = 0.85, arm = [-0.3, -0.55, 1] } = o;
  const h = new THREE.Group(); h.position.set(0, y, -d); root.add(h);
  const a0 = -Math.PI / 2 - 0.35, a1 = 0.55;
  for (let i = 0; i < 4; i++) {
    const r = [0.0096, 0.0098, 0.0094, 0.0084][i], z = (i - 1.5) * -0.021 - 0.012;
    const geo = new THREE.TorusGeometry(R, r, 7, 14, a1 - a0); geo.rotateZ(a0); geo.scale(sx, 1, 1); geo.translate(0, 0, z);
    h.add(new THREE.Mesh(geo, GM.glove));
    K.sp(r, GM.glove, { x: Math.cos(a1) * R * sx, y: Math.sin(a1) * R, d: -z, p: h });
  }
  K.sp(0.05, GM.glove, { x: -R * sx * 0.25, y: -R - 0.006, d: 0.018, s: [0.95, 0.38, 1.15], p: h });
  gkFinger(K, [[-R * sx * 0.8, -R * 0.6, 0.045], [-R * sx - 0.006, -0.004, 0.0], [-R * sx - 0.005, 0.004, -0.04]], 0.0105, h);
  gkArm(K, [-R * 0.4, y - R - 0.02, -d + 0.07], arm, root);
  return h;
}

/* ─── Les armes ─── */
// Chaque modèle renvoie ses repères : bouche (muzzle : [d, y]), éjection, ligne de visée (sightY), poignée et garde-main pour les mains.
const GUN_MODELS = {
  // Colt M1911 : glissière à stries arrière, chien à anneau, plaquettes quadrillées, pontet, arrêtoir et sûreté à gauche.
  pistol(K, parts) {
    const { blued: st, park: pk, bake: bk, bore } = GM, slide = K.group(); parts.slide = slide;
    K.pr([[-0.055, 0.036], [0.16, 0.036], [0.16, 0.0625], [0.155, 0.066], [-0.05, 0.066], [-0.055, 0.0625]], 0.022, st, { p: slide, bev: 0.0018 });
    K.ribs(9, 0.0232, 0.021, -0.05, 0.0034, pk, { y: 0.051, p: slide });
    K.pr([[0.146, 0.066], [0.156, 0.066], [0.1545, 0.0735], [0.149, 0.0735]], 0.003, st, { p: slide, bev: 0.0004 });
    for (const x of [-0.0055, 0.0055]) K.bx(0.007, 0.0075, -0.043, -0.034, st, { x, y: 0.0695, p: slide });
    K.lt([[0.155, 0.0], [0.155, 0.0108], [0.1655, 0.0108], [0.1655, 0.0046], [0.162, 0.0046]], st, { y: 0.052, p: slide });
    K.cy(0.0046, 0.162, 0.1652, bore, { y: 0.052, p: slide });
    // Carcasse, cache-poussière, bouchon de ressort.
    K.pr([[-0.058, 0.02], [0.156, 0.02], [0.156, 0.0365], [-0.058, 0.0365]], 0.0205, st, { bev: 0.0012 });
    K.cy(0.0055, 0.154, 0.1605, st, { y: 0.039 });
    // Crosse : carcasse avec queue de castor, plaquettes de bakélite quadrillée, vis.
    K.pr([[0.004, 0.021], [-0.029, -0.086], [-0.034, -0.09], [-0.08, -0.09], [-0.083, -0.084], [-0.067, -0.02], [-0.058, 0.01], [-0.068, 0.026], [-0.062, 0.035], [-0.05, 0.031], [-0.03, 0.021]], 0.0235, st, { bev: 0.0018 });
    K.pr([[-0.003, 0.012], [-0.03, -0.078], [-0.073, -0.078], [-0.059, -0.004], [-0.05, 0.012]], 0.031, bk, { bev: 0.0028 });
    for (const [d, yy] of [[-0.021, 0.004], [-0.047, -0.066]]) for (const x of [-0.0158, 0.0158]) K.rod([x * 1.02, yy, -d], [x * 1.12, yy, -d], 0.0032, st);
    // Pontet, détente, chien, arrêtoir de culasse et sûreté (flanc gauche).
    K.ar(0.0265, 0.0032, Math.PI, TAU, st, { d: 0.03, y: 0.0215 });
    K.pr([[0.014, 0.019], [0.023, 0.019], [0.021, 0.004], [0.016, 0.004]], 0.006, st, { bev: 0.0008 });
    K.pr([[-0.057, 0.044], [-0.05, 0.044], [-0.053, 0.06], [-0.063, 0.072], [-0.069, 0.069], [-0.061, 0.056]], 0.008, st, { bev: 0.001 });
    K.pr([[0.012, 0.03], [0.046, 0.0305], [0.048, 0.036], [0.012, 0.0365]], 0.003, st, { x: -0.0118, bev: 0.0005 });
    K.rod([-0.0118, 0.0265, -0.044], [-0.0145, 0.0265, -0.044], 0.003, st);
    K.pr([[-0.042, 0.032], [-0.017, 0.0335], [-0.015, 0.0385], [-0.041, 0.039]], 0.003, st, { x: -0.0118, bev: 0.0005 });
    // Chargeur (semelle visible, corps caché dans la crosse).
    const mag = K.group(); parts.mag = mag;
    K.pr([[-0.006, 0.018], [-0.034, -0.084], [-0.074, -0.084], [-0.048, 0.018]], 0.021, pk, { p: mag, bev: 0.0005 });
    K.bx(0.0225, 0.005, -0.081, -0.032, st, { y: -0.0915, p: mag, bev: 0.0012 });
    return { muzzle: [0.168, 0.052], eject: [0.065, 0.06, 0.012], sightY: 0.0735,
      hands: (root) => { gkGripHand(K, root, { d: -0.026, y: 0.017, ang: 0.31, R: 0.034, sx: 0.74, arm: [0.28, -0.42, 1] }); gkGripHand(K, root, { d: -0.026, y: 0.017, ang: 0.31, R: 0.034, sx: 0.74, cup: true, n: 3, arm: [-0.45, -0.4, 1] }); } };
  },
  // Webley Mk VI : revolver à brisure, barillet à six chambres cannelé, canon à bande, crosse en bec d'oiseau.
  revolver(K, parts) {
    const { blued: st, bake: bk, bore } = GM;
    K.cy(0.0094, 0.03, 0.205, st, { y: 0.05 }); K.bx(0.0075, 0.0065, 0.03, 0.205, st, { y: 0.0598, bev: 0.0015 });
    K.lt([[0.198, 0], [0.198, 0.0102], [0.207, 0.0102], [0.207, 0.0042], [0.204, 0.0042]], st, { y: 0.05 }); K.cy(0.0042, 0.204, 0.2065, bore, { y: 0.05 });
    K.pr([[0.188, 0.063], [0.203, 0.063], [0.201, 0.0745], [0.192, 0.0745]], 0.004, st, { bev: 0.0006 });
    K.pr([[0.028, 0.034], [0.095, 0.04], [0.095, 0.046], [0.028, 0.046]], 0.011, st, { bev: 0.0015 }); // gaine d'extracteur
    // Carcasse autour du barillet : sous-garde, pont, bouclier arrière, montant avant.
    K.pr([[-0.03, 0.02], [0.034, 0.02], [0.034, 0.03], [-0.03, 0.03]], 0.022, st, { bev: 0.0015 });
    K.pr([[-0.022, 0.0675], [0.034, 0.0675], [0.034, 0.0745], [-0.022, 0.0765]], 0.013, st, { bev: 0.0015 });
    K.pr([[-0.03, 0.02], [-0.019, 0.02], [-0.019, 0.0765], [-0.034, 0.072]], 0.034, st, { bev: 0.002 });
    K.pr([[0.026, 0.02], [0.034, 0.02], [0.036, 0.0745], [0.026, 0.0745]], 0.03, st, { bev: 0.002 });
    K.bx(0.004, 0.012, -0.03, -0.018, st, { x: -0.0175, y: 0.069 }); // verrou de brisure
    const cyl = K.group(0, 0.0365); parts.cyl = cyl;
    K.lt([[-0.019, 0], [-0.019, 0.0195], [-0.017, 0.0215], [0.024, 0.0215], [0.026, 0.0198], [0.026, 0]], st, { p: cyl, seg: 24 });
    for (let k = 0; k < 6; k++) { const a = k * Math.PI / 3 + Math.PI / 6, c = Math.cos(a), s = Math.sin(a); K.rod([c * 0.0205, s * 0.0205, 0.01], [c * 0.0205, s * 0.0205, -0.016], 0.0032, bore, { p: cyl, seg: 6 }); }
    for (let k = 0; k < 6; k++) { const a = k * Math.PI / 3 + Math.PI / 2; K.cy(0.0048, 0.0258, 0.0262, bore, { x: Math.cos(a) * 0.0135, y: Math.sin(a) * 0.0135, p: cyl, seg: 10 }); }
    K.pr([[-0.03, 0.058], [-0.022, 0.058], [-0.029, 0.077], [-0.047, 0.086], [-0.05, 0.081], [-0.036, 0.069]], 0.008, st, { bev: 0.001 }); // chien
    K.pr([[0.0, 0.021], [-0.012, -0.04], [-0.016, -0.075], [-0.032, -0.088], [-0.058, -0.082], [-0.062, -0.06], [-0.052, -0.02], [-0.052, 0.02], [-0.04, 0.03]], 0.022, st, { bev: 0.0018 });
    K.pr([[-0.006, 0.012], [-0.016, -0.045], [-0.022, -0.074], [-0.034, -0.08], [-0.052, -0.075], [-0.055, -0.058], [-0.046, -0.02], [-0.044, 0.012]], 0.031, bk, { bev: 0.0028 });
    K.ring(0.007, 0.0016, st, { d: -0.045, y: -0.094 });
    K.ar(0.02, 0.003, Math.PI, TAU, st, { d: 0.018, y: 0.021 });
    K.pr([[0.008, 0.02], [0.015, 0.02], [0.011, 0.006], [0.005, 0.004]], 0.005, st, { bev: 0.0008 });
    return { muzzle: [0.207, 0.05], eject: [0.0, 0.05, 0.02], sightY: 0.0745,
      hands: (root) => { gkGripHand(K, root, { d: -0.026, y: 0.018, ang: 0.42, R: 0.033, sx: 0.74, arm: [0.28, -0.42, 1] }); gkGripHand(K, root, { d: -0.026, y: 0.018, ang: 0.42, R: 0.033, sx: 0.74, cup: true, arm: [-0.45, -0.4, 1] }); } };
  },
  // Mauser Kar98k : crosse et garde-main en noyer, boîtier et canon bleuis, hausse à curseur, embouchoir, culasse à levier coudé.
  bolt(K, parts, sniper = false) {
    const { blued: st, wood: wd, bore } = GM;
    K.pr([[-0.405, -0.11], [-0.2, -0.075], [-0.07, -0.05], [-0.032, -0.074], [0.0, -0.068], [0.03, -0.03], [0.12, -0.026], [0.22, -0.012], [0.5, 0.014], [0.53, 0.026], [0.53, 0.045], [0.17, 0.04], [0.13, 0.033], [-0.035, 0.033], [-0.06, 0.022], [-0.2, 0.026], [-0.395, 0.028]], 0.044, wd, { bev: 0.006 });
    K.pr([[0.17, 0.054], [0.45, 0.052], [0.45, 0.061], [0.2, 0.065], [0.17, 0.063]], 0.03, wd, { bev: 0.004 });
    K.pr([[-0.407, -0.112], [-0.396, 0.03], [-0.389, 0.03], [-0.4, -0.112]], 0.047, st, { bev: 0.002 });
    K.lt([[-0.035, 0], [-0.035, 0.0145], [-0.03, 0.0165], [0.125, 0.0165], [0.13, 0.0178], [0.17, 0.0178], [0.172, 0.014], [0.172, 0]], st, { y: 0.045 });
    K.lt([[0.17, 0], [0.17, 0.0135], [0.21, 0.0125], [0.3, 0.0115], [0.4, 0.0105], [0.55, 0.0095], [0.74, 0.0088], [0.745, 0.0076], [0.745, 0]], st, { y: 0.045 });
    K.cy(0.0042, 0.743, 0.7455, bore, { y: 0.045 });
    K.lt([[0.7, 0], [0.7, 0.0118], [0.728, 0.0118], [0.728, 0]], st, { y: 0.045 });
    K.pr([[0.711, 0.0555], [0.723, 0.0555], [0.7215, 0.066], [0.714, 0.066]], 0.0025, st, { bev: 0.0004 });
    K.pr([[0.215, 0.056], [0.26, 0.056], [0.26, 0.0605], [0.215, 0.0635]], 0.016, st, { bev: 0.001 });
    for (const x of [-0.0035, 0.0035]) K.bx(0.0045, 0.0055, 0.218, 0.224, st, { x, y: 0.0635 });
    K.bx(0.046, 0.034, 0.515, 0.535, st, { y: 0.031, bev: 0.002 }); K.bx(0.047, 0.04, 0.42, 0.432, st, { y: 0.033, bev: 0.002 });
    K.cy(0.004, 0.535, 0.548, st, { y: 0.03 }); K.bx(0.008, 0.006, 0.535, 0.562, st, { y: 0.026 });
    K.ring(0.012, 0.002, st, { d: 0.426, y: 0.006 }); K.ring(0.012, 0.002, st, { d: -0.33, y: -0.098 });
    K.bx(0.024, 0.006, 0.02, 0.12, st, { y: -0.028, bev: 0.0015 });
    K.ar(0.022, 0.0032, Math.PI, TAU, st, { d: 0.012, y: -0.024 });
    K.pr([[0.004, -0.024], [0.012, -0.024], [0.009, -0.04], [0.003, -0.041]], 0.005, st, { bev: 0.0008 });
    const bolt = K.group(0, 0.045); parts.bolt = bolt;
    K.lt([[-0.035, 0], [-0.035, 0.0128], [-0.072, 0.0128], [-0.082, 0.0095], [-0.087, 0]], st, { p: bolt });
    K.bx(0.004, 0.012, -0.07, -0.058, st, { y: 0.017, p: bolt });
    parts.boltHandle = K.rod([0.012, 0, 0.01], [0.05, -0.026, 0.016], 0.0045, st, { p: bolt }); K.sp(0.0105, st, { x: 0.052, y: -0.028, d: -0.016, p: bolt });
    let sightY = 0.066;
    if (sniper) {
      K.lt([[-0.095, 0], [-0.095, 0.0195], [-0.055, 0.0195], [-0.04, 0.0128], [0.15, 0.0128], [0.17, 0.0215], [0.215, 0.0215], [0.215, 0]], st, { y: 0.108, seg: 24 });
      K.cy(0.017, -0.0955, -0.0945, GM.lens, { y: 0.108 }); K.cy(0.0195, 0.2145, 0.2155, GM.lens, { y: 0.108 });
      K.vc(0.0085, 0.118, 0.13, st, { d: 0.06 }); K.rod([0.012, 0.108, -0.06], [0.024, 0.108, -0.06], 0.0085, st, { seg: 12 });
      for (const d of [-0.02, 0.13]) { K.lt([[d - 0.006, 0], [d - 0.006, 0.0148], [d + 0.006, 0.0148], [d + 0.006, 0]], st, { y: 0.108 }); K.bx(0.014, 0.034, d - 0.006, d + 0.006, st, { y: 0.083 }); }
      sightY = 0.108;
    }
    return { muzzle: [0.745, 0.045], eject: [0.0, 0.06, 0.02], sightY,
      hands: (root) => { gkGripHand(K, root, { d: -0.035, y: 0.008, ang: 0.62, R: 0.032, sx: 0.88, top: 0.016, arm: [0.3, -0.45, 1] }); gkForeHand(K, root, { d: 0.33, y: 0.028, R: 0.036, sx: 0.72 }); } };
  },
  sniper(K, parts) { return GUN_MODELS.bolt(K, parts, true); },
  // Winchester 1897 « trench gun » : chien extérieur, pompe en noyer rainuré, tube magasin, pare-chaleur perforé.
  shotgun(K, parts) {
    const { blued: st, wood: wd, bore } = GM;
    K.pr([[-0.372, -0.105], [-0.2, -0.065], [-0.05, -0.035], [0.0, -0.022], [0.0, 0.045], [-0.03, 0.042], [-0.1, 0.03], [-0.35, 0.034], [-0.362, 0.032]], 0.042, wd, { bev: 0.006 });
    K.pr([[-0.374, -0.107], [-0.364, 0.034], [-0.358, 0.034], [-0.368, -0.107]], 0.045, st, { bev: 0.002 });
    K.pr([[0.0, -0.022], [0.165, -0.012], [0.17, 0.0], [0.17, 0.06], [0.16, 0.064], [0.02, 0.064], [0.0, 0.058]], 0.038, st, { bev: 0.003 });
    K.pr([[-0.005, 0.048], [0.008, 0.05], [0.004, 0.07], [-0.008, 0.078], [-0.012, 0.074], [-0.004, 0.062]], 0.009, st, { bev: 0.001 });
    K.ar(0.021, 0.0032, Math.PI, TAU, st, { d: 0.035, y: -0.02 });
    K.pr([[0.026, -0.02], [0.034, -0.02], [0.031, -0.036], [0.025, -0.037]], 0.005, st, { bev: 0.0008 });
    K.lt([[0.17, 0], [0.17, 0.0118], [0.67, 0.0106], [0.678, 0.0106], [0.678, 0]], st, { y: 0.045 }); K.cy(0.0092, 0.676, 0.6785, bore, { y: 0.045 });
    K.sp(0.0028, GM.brass, { d: 0.672, y: 0.058 });
    K.cy(0.0105, 0.17, 0.6, st, { y: 0.0175 }); K.lt([[0.598, 0], [0.598, 0.0112], [0.606, 0.0105], [0.606, 0]], st, { y: 0.0175 });
    K.pr([[0.6, 0.004], [0.662, 0.004], [0.662, 0.058], [0.6, 0.058]], 0.024, st, { bev: 0.003 }); // tenon de baïonnette
    const sh = K.cy(0.0178, 0.19, 0.59, GM.holes, { y: 0.045, open: true, a0: -1.95, a: 3.9, seg: 24 }), uvA = sh.geometry.attributes.uv;
    for (let i = 0; i < uvA.count; i++) uvA.setXY(i, uvA.getX(i) * 1.3, uvA.getY(i) * 4.2);
    for (const d of [0.188, 0.59]) K.lt([[d - 0.005, 0], [d - 0.005, 0.0192], [d + 0.005, 0.0192], [d + 0.005, 0]], st, { y: 0.045 });
    const pump = K.group(0, 0.0175); parts.pump = pump;
    const pts = [[0.25, 0], [0.25, 0.0175]]; for (let i = 0; i < 12; i++) { const d = 0.255 + i * 0.012; pts.push([d, 0.0205], [d + 0.008, 0.0205], [d + 0.009, 0.0188], [d + 0.011, 0.0188]); } pts.push([0.4, 0.0175], [0.4, 0]);
    K.lt(pts, wd, { p: pump, seg: 18 });
    K.bx(0.003, 0.006, 0.17, 0.25, st, { x: -0.0165, y: 0.004, p: pump });
    return { muzzle: [0.678, 0.045], eject: [0.11, 0.055, 0.02], sightY: 0.062,
      hands: (root) => { gkGripHand(K, root, { d: -0.035, y: 0.012, ang: 0.42, R: 0.032, sx: 0.9, arm: [0.3, -0.45, 1] }); gkForeHand(K, parts.pump, { d: 0.325, y: 0, R: 0.031, sx: 0.95 }); } };
  },
  // Thompson M1921 : canon à ailettes, compensateur Cutts, poignées et crosse en noyer, chargeur droit de 30.
  smg(K, parts) {
    const { blued: st, park: pk, wood: wd, bore } = GM;
    K.pr([[-0.07, 0.005], [0.2, 0.005], [0.2, 0.058], [0.19, 0.064], [-0.06, 0.064], [-0.07, 0.055]], 0.034, st, { bev: 0.0035 });
    K.pr([[-0.055, -0.012], [0.095, -0.012], [0.095, 0.006], [-0.055, 0.006]], 0.03, st, { bev: 0.002 });
    const fins = [[0.2, 0], [0.2, 0.0108]]; for (let i = 0; i < 17; i++) { const d = 0.205 + i * 0.0068; fins.push([d, 0.0108], [d, 0.0175], [d + 0.0022, 0.0175], [d + 0.0022, 0.0108]); } fins.push([0.33, 0.0105], [0.398, 0.0095], [0.398, 0]);
    K.lt(fins, st, { y: 0.032, seg: 20 });
    K.lt([[0.395, 0], [0.395, 0.0128], [0.465, 0.0128], [0.465, 0.0058], [0.46, 0.0058]], st, { y: 0.032 }); K.cy(0.0058, 0.458, 0.4655, bore, { y: 0.032 });
    for (let i = 0; i < 4; i++) K.bx(0.012, 0.002, 0.405 + i * 0.012, 0.411 + i * 0.012, bore, { y: 0.0448, bev: 0 });
    K.pr([[0.438, 0.044], [0.456, 0.044], [0.455, 0.068], [0.441, 0.068]], 0.0025, st, { bev: 0.0004 });
    K.bx(0.016, 0.006, -0.048, -0.022, st, { y: 0.067 }); for (const x of [-0.0045, 0.0045]) K.bx(0.0035, 0.007, -0.042, -0.035, st, { x, y: 0.0705 });
    K.rod([0, 0.064, -0.1], [0, 0.07, -0.1], 0.003, st); K.sp(0.0062, st, { d: 0.1, y: 0.072, s: [1, 0.8, 1] });
    K.pr([[-0.05, -0.012], [-0.012, -0.012], [-0.028, -0.06], [-0.038, -0.095], [-0.068, -0.097], [-0.071, -0.085], [-0.058, -0.05]], 0.03, wd, { bev: 0.005 });
    K.pr([[-0.07, 0.055], [-0.07, 0.0], [-0.12, -0.02], [-0.36, -0.07], [-0.375, -0.068], [-0.385, 0.035], [-0.36, 0.04], [-0.12, 0.045]], 0.04, wd, { bev: 0.006 });
    K.pr([[-0.387, -0.072], [-0.383, 0.037], [-0.377, 0.037], [-0.381, -0.072]], 0.042, st, { bev: 0.0015 });
    K.pr([[0.215, 0.004], [0.256, 0.004], [0.252, -0.02], [0.259, -0.035], [0.252, -0.05], [0.259, -0.066], [0.25, -0.088], [0.217, -0.088], [0.221, -0.05]], 0.032, wd, { bev: 0.006 });
    K.bx(0.02, 0.016, 0.212, 0.258, st, { y: 0.012 });
    K.ar(0.02, 0.003, Math.PI, TAU, st, { d: 0.03, y: -0.012 }); K.pr([[0.022, -0.012], [0.03, -0.012], [0.027, -0.027], [0.021, -0.028]], 0.005, st);
    K.bx(0.032, 0.02, 0.05, 0.094, st, { y: -0.018 });
    const mag = K.group(); parts.mag = mag;
    K.pr([[0.055, -0.02], [0.088, -0.02], [0.088, -0.2], [0.055, -0.2]], 0.024, pk, { p: mag, bev: 0.0025 });
    return { muzzle: [0.466, 0.032], eject: [0.1, 0.05, 0.02], sightY: 0.074,
      hands: (root) => { gkGripHand(K, root, { d: -0.032, y: -0.014, ang: 0.38, R: 0.03, sx: 0.84, arm: [0.3, -0.45, 1] }); gkGripHand(K, root, { d: 0.236, y: -0.002, ang: 0.08, R: 0.027, sx: 0.88, trig: false, n: 4, mirror: true, top: 0.016, arm: [-0.42, -0.45, 1] }); } };
  },
  // Carabine M1 : monobloc en noyer et garde-main, acier phosphaté, hausse à œilleton, guidon à oreilles, chargeur de 15.
  carbine(K, parts) {
    const { park: pk, wood: wd, bore } = GM;
    K.pr([[-0.335, -0.098], [-0.15, -0.066], [-0.06, -0.058], [-0.032, -0.066], [-0.002, -0.06], [0.03, -0.022], [0.1, -0.014], [0.25, -0.006], [0.335, 0.012], [0.335, 0.036], [0.15, 0.036], [0.13, 0.03], [0.0, 0.03], [-0.04, 0.022], [-0.12, 0.028], [-0.325, 0.03]], 0.04, wd, { bev: 0.006 });
    K.pr([[-0.337, -0.1], [-0.327, 0.032], [-0.321, 0.032], [-0.331, -0.1]], 0.043, pk, { bev: 0.0015 });
    K.pr([[0.135, 0.05], [0.3, 0.05], [0.3, 0.0585], [0.14, 0.06]], 0.028, wd, { bev: 0.004 });
    K.lt([[-0.03, 0], [-0.03, 0.0132], [0.13, 0.0132], [0.135, 0.011], [0.135, 0]], pk, { y: 0.04 });
    K.lt([[0.135, 0], [0.135, 0.0095], [0.47, 0.0085], [0.472, 0.0072], [0.472, 0]], pk, { y: 0.04 }); K.cy(0.004, 0.47, 0.4725, bore, { y: 0.04 });
    K.lt([[0.44, 0], [0.44, 0.0112], [0.462, 0.0112], [0.462, 0]], pk, { y: 0.04 });
    for (const x of [-0.0065, 0.0065]) K.bx(0.003, 0.015, 0.445, 0.457, pk, { x, y: 0.058 });
    K.pr([[0.446, 0.05], [0.456, 0.05], [0.4555, 0.0625], [0.4475, 0.0625]], 0.0025, pk, { bev: 0.0004 });
    K.bx(0.016, 0.006, -0.012, 0.012, pk, { y: 0.054 }); K.ring(0.0045, 0.0016, pk, { d: 0.0, y: 0.0625 }); K.bx(0.003, 0.004, -0.002, 0.002, pk, { y: 0.0575 });
    K.bx(0.033, 0.042, 0.3, 0.315, pk, { y: 0.034, bev: 0.002 });
    K.ar(0.02, 0.003, Math.PI, TAU, pk, { d: 0.03, y: -0.012 }); K.pr([[0.022, -0.012], [0.03, -0.012], [0.027, -0.027], [0.021, -0.028]], 0.005, pk);
    const mag = K.group(); parts.mag = mag;
    K.pr([[0.055, -0.012], [0.09, -0.012], [0.088, -0.086], [0.058, -0.086]], 0.022, pk, { p: mag, bev: 0.002 });
    return { muzzle: [0.472, 0.04], eject: [0.1, 0.055, 0.02], sightY: 0.0625,
      hands: (root) => { gkGripHand(K, root, { d: -0.035, y: 0.01, ang: 0.55, R: 0.031, sx: 0.85, top: 0.016, arm: [0.3, -0.45, 1] }); gkForeHand(K, root, { d: 0.235, y: 0.027, R: 0.033, sx: 0.72 }); } };
  },
  // AK-47 (type 3, boîtier usiné) : crosse, poignée et garde-mains en bois, chargeur cintré de 30, frein de bouche en biseau.
  ar(K, parts) {
    const { blued: st, park: pk, wood: wd, bore } = GM;
    K.pr([[-0.02, 0.005], [0.235, 0.005], [0.235, 0.05], [0.225, 0.054], [-0.015, 0.054], [-0.02, 0.05]], 0.03, st, { bev: 0.002 });
    K.pr([[-0.026, 0.049], [0.212, 0.049], [0.212, 0.06], [0.0, 0.062], [-0.026, 0.058]], 0.026, st, { bev: 0.004 });
    K.bx(0.001, 0.012, 0.06, 0.14, bore, { x: -0.0152, y: 0.026, bev: 0 });
    K.pr([[0.235, 0.05], [0.27, 0.05], [0.27, 0.06], [0.235, 0.064]], 0.022, st, { bev: 0.0015 });
    K.pr([[0.24, 0.064], [0.284, 0.0625], [0.284, 0.0655], [0.24, 0.0685]], 0.012, st, { bev: 0.0008 });
    K.pr([[0.27, 0.052], [0.43, 0.052], [0.43, 0.067], [0.28, 0.07], [0.27, 0.066]], 0.026, wd, { bev: 0.004 });
    K.pr([[0.235, 0.004], [0.4, 0.008], [0.405, 0.014], [0.405, 0.049], [0.235, 0.049]], 0.038, wd, { bev: 0.006 });
    K.bx(0.04, 0.05, 0.405, 0.415, st, { y: 0.031, bev: 0.002 });
    K.lt([[0.415, 0], [0.415, 0.0092], [0.53, 0.0088], [0.53, 0]], st, { y: 0.04 });
    K.pr([[0.43, 0.032], [0.452, 0.032], [0.452, 0.073], [0.436, 0.071]], 0.02, st, { bev: 0.002 }); K.cy(0.007, 0.4, 0.44, st, { y: 0.061 });
    K.pr([[0.505, 0.03], [0.53, 0.03], [0.53, 0.05], [0.505, 0.05]], 0.018, st, { bev: 0.002 });
    for (const x of [-0.0068, 0.0068]) K.bx(0.0025, 0.022, 0.51, 0.522, st, { x, y: 0.06 });
    K.bx(0.003, 0.018, 0.513, 0.518, st, { y: 0.0595, bev: 0.0004 });
    K.lt([[0.528, 0], [0.528, 0.0112], [0.565, 0.0112], [0.565, 0.0055], [0.56, 0.0055]], st, { y: 0.04 }); K.cy(0.0055, 0.558, 0.5655, bore, { y: 0.04 });
    K.cy(0.003, 0.405, 0.525, st, { y: 0.024 });
    K.pr([[0.0, 0.005], [0.03, 0.005], [0.022, -0.03], [0.012, -0.09], [-0.018, -0.092], [-0.02, -0.08], [-0.008, -0.03]], 0.03, wd, { bev: 0.006 });
    K.pr([[-0.02, 0.05], [-0.02, 0.005], [-0.06, -0.015], [-0.36, -0.062], [-0.37, -0.06], [-0.376, 0.026], [-0.36, 0.031], [-0.08, 0.04]], 0.038, wd, { bev: 0.006 });
    K.pr([[-0.378, -0.064], [-0.373, 0.028], [-0.366, 0.028], [-0.371, -0.064]], 0.04, st, { bev: 0.0015 });
    K.pr([[0.02, 0.005], [0.066, 0.005], [0.066, -0.016], [0.05, -0.018], [0.02, -0.006]], 0.004, st, { x: 0, bev: 0.0006 });
    K.pr([[0.034, 0.004], [0.042, 0.004], [0.039, -0.012], [0.033, -0.013]], 0.005, st);
    K.sp(0.006, st, { x: 0.024, y: 0.045, d: 0.18 });
    const mag = K.group(); parts.mag = mag;
    K.curve([[0.112, 0.006], [0.118, -0.1], [0.172, -0.172]], [[0.074, 0.006], [0.078, -0.095], [0.132, -0.168]], 0.026, pk, { p: mag, bev: 0.002 });
    return { muzzle: [0.566, 0.04], eject: [0.15, 0.05, 0.02], sightY: 0.0685,
      hands: (root) => { gkGripHand(K, root, { d: 0.012, y: -0.004, ang: 0.32, R: 0.031, sx: 0.82, arm: [0.3, -0.45, 1] }); gkForeHand(K, root, { d: 0.33, y: 0.028, R: 0.034, sx: 0.78 }); } };
  },
  // Lewis : manchon de refroidissement en aluminium, chargeur camembert, poignée et crosse en noyer, hausse haute.
  lmg(K, parts) {
    const { blued: st, park: pk, wood: wd, alu, bore } = GM;
    K.pr([[-0.08, 0.0], [0.14, 0.0], [0.14, 0.07], [-0.07, 0.07], [-0.08, 0.06]], 0.042, st, { bev: 0.003 });
    K.lt([[0.14, 0], [0.14, 0.046], [0.17, 0.05], [0.52, 0.05], [0.56, 0.036], [0.66, 0.021], [0.68, 0.019], [0.68, 0]], alu, { y: 0.045, seg: 28 });
    for (let k = 0; k < 6; k++) K.lt([[0.2 + k * 0.055, 0], [0.2 + k * 0.055, 0.0512], [0.206 + k * 0.055, 0.0512], [0.206 + k * 0.055, 0]], alu, { y: 0.045, seg: 28 });
    K.lt([[0.678, 0], [0.678, 0.011], [0.7, 0.0105], [0.7, 0]], st, { y: 0.045 }); K.cy(0.005, 0.698, 0.7005, bore, { y: 0.045 });
    K.pr([[0.6, 0.065], [0.62, 0.062], [0.62, 0.122], [0.612, 0.124]], 0.004, st, { bev: 0.0006 });
    K.pr([[-0.08, 0.07], [-0.064, 0.07], [-0.067, 0.122], [-0.077, 0.122]], 0.012, st, { bev: 0.001 });
    for (const x of [-0.004, 0.004]) K.bx(0.004, 0.005, -0.076, -0.068, st, { x, y: 0.1235 });
    const pan = K.group(0.03); parts.pan = pan;
    K.vc(0.088, 0.072, 0.098, pk, { p: pan, seg: 36 }); K.vc(0.086, 0.098, 0.102, pk, { p: pan, seg: 36, r2: 0.036 });
    for (let k = 0; k < 12; k++) { const a = k * Math.PI / 6; K.rod([Math.cos(a) * 0.028, 0.0995, Math.sin(a) * 0.028], [Math.cos(a) * 0.084, 0.0995, Math.sin(a) * 0.084], 0.0024, st, { p: pan, seg: 6 }); }
    K.vc(0.016, 0.098, 0.108, st, { p: pan });
    K.pr([[-0.06, 0.0], [-0.03, 0.0], [-0.038, -0.035], [-0.046, -0.09], [-0.076, -0.092], [-0.078, -0.08], [-0.066, -0.035]], 0.03, wd, { bev: 0.006 });
    K.pr([[-0.08, 0.06], [-0.08, 0.0], [-0.12, -0.02], [-0.42, -0.075], [-0.43, -0.07], [-0.435, 0.04], [-0.41, 0.045], [-0.12, 0.05]], 0.04, wd, { bev: 0.006 });
    K.pr([[-0.437, -0.077], [-0.432, 0.042], [-0.425, 0.042], [-0.43, -0.077]], 0.042, st, { bev: 0.0015 });
    K.ar(0.02, 0.003, Math.PI, TAU, st, { d: -0.012, y: 0.0 }); K.pr([[-0.02, 0.0], [-0.012, 0.0], [-0.015, -0.016], [-0.021, -0.017]], 0.005, st);
    return { muzzle: [0.7, 0.045], eject: [0.06, 0.04, 0.025], sightY: 0.124,
      hands: (root) => { gkGripHand(K, root, { d: -0.048, y: -0.002, ang: 0.3, R: 0.031, sx: 0.84, arm: [0.3, -0.45, 1] }); gkForeHand(K, root, { d: 0.3, y: 0.045, R: 0.06, sx: 1, arm: [-0.35, -0.55, 1] }); } };
  },
  // Lance-grenades à un coup (type M79) : gros canon phosphaté, crosse et garde-main en noyer, hausse à cadre relevée.
  launcher(K, parts) {
    const { park: pk, wood: wd, bore } = GM;
    K.pr([[-0.33, -0.092], [-0.15, -0.056], [-0.05, -0.036], [-0.042, -0.076], [-0.012, -0.08], [0.01, -0.022], [0.03, 0.0], [0.03, 0.06], [-0.02, 0.055], [-0.31, 0.032], [-0.325, 0.03]], 0.042, wd, { bev: 0.006 });
    K.pr([[-0.345, -0.094], [-0.338, 0.032], [-0.325, 0.032], [-0.332, -0.094]], 0.046, bore, { bev: 0.004 });
    K.pr([[0.03, 0.0], [0.11, 0.0], [0.11, 0.068], [0.03, 0.068]], 0.05, pk, { bev: 0.004 });
    K.lt([[0.11, 0], [0.11, 0.026], [0.42, 0.026], [0.425, 0.024], [0.425, 0.02], [0.415, 0.02], [0.415, 0]], pk, { y: 0.04, seg: 24 }); K.cy(0.02, 0.41, 0.4155, bore, { y: 0.04 });
    K.pr([[0.11, 0.004], [0.32, 0.004], [0.33, 0.012], [0.33, 0.028], [0.11, 0.028]], 0.044, wd, { bev: 0.006 });
    K.pr([[0.13, 0.066], [0.15, 0.066], [0.148, 0.1], [0.132, 0.1]], 0.026, pk, { bev: 0.001 }); K.bx(0.028, 0.018, 0.135, 0.145, bore, { y: 0.085, bev: 0 });
    for (const x of [-0.004, 0.004]) K.bx(0.004, 0.005, 0.135, 0.143, pk, { x, y: 0.1 });
    K.pr([[0.395, 0.064], [0.405, 0.064], [0.404, 0.1], [0.398, 0.1]], 0.003, pk, { bev: 0.0004 });
    K.ar(0.02, 0.003, Math.PI, TAU, pk, { d: 0.02, y: -0.004 }); K.pr([[0.012, -0.004], [0.02, -0.004], [0.017, -0.02], [0.011, -0.021]], 0.005, pk);
    return { muzzle: [0.425, 0.04], eject: [0.11, 0.06, 0.02], sightY: 0.1,
      hands: (root) => { gkGripHand(K, root, { d: -0.026, y: -0.006, ang: 0.45, R: 0.031, sx: 0.84, arm: [0.3, -0.45, 1] }); gkForeHand(K, root, { d: 0.24, y: 0.02, R: 0.035, sx: 0.8 }); } };
  },
  // Rayonneur : arme d'un autre monde, laissée stylisée (corps tourné rouge, anneaux lumineux, émetteur).
  raygun(K, parts) {
    const red = K.up ? GM.frost : (GM.rayRed ||= Object.assign(new THREE.MeshStandardMaterial({ color: 0xb82a22, roughness: 0.32, metalness: 0.6 }), { userData: { uvk: 1 } }));
    const glow = GM.rayGlow ||= new THREE.MeshStandardMaterial({ color: 0x40ff80, emissive: 0x30ff70, emissiveIntensity: 1.6, roughness: 0.3 });
    K.lt([[-0.05, 0], [-0.05, 0.028], [-0.03, 0.046], [0.04, 0.046], [0.12, 0.03], [0.17, 0.02], [0.2, 0.017], [0.2, 0]], red, { y: 0.045, seg: 24 });
    for (let k = 0; k < 3; k++) K.ring(0.047 - k * 0.006, 0.0085, glow, { d: -0.005 + k * 0.05, y: 0.045 });
    K.lt([[0.2, 0], [0.2, 0.012], [0.235, 0.02], [0.25, 0.03], [0.255, 0.03], [0.255, 0]], GM.blued, { y: 0.045 }); K.cy(0.022, 0.253, 0.2555, GM.bore, { y: 0.045 });
    K.pr([[-0.035, 0.07], [0.06, 0.07], [0.09, 0.085], [-0.03, 0.09]], 0.008, red, { bev: 0.002 });
    for (const x of [-0.004, 0.004]) K.bx(0.0035, 0.02, -0.032, -0.024, GM.blued, { x, y: 0.098 });
    K.pr([[0.072, 0.08], [0.084, 0.084], [0.083, 0.108], [0.076, 0.108]], 0.003, GM.blued, { bev: 0.0004 });
    K.pr([[0.0, 0.015], [0.03, 0.015], [0.018, -0.03], [0.005, -0.08], [-0.03, -0.082], [-0.028, -0.06], [-0.012, -0.02]], 0.03, GM.park, { bev: 0.005 });
    K.ar(0.018, 0.003, Math.PI, TAU, GM.blued, { d: 0.035, y: 0.012 });
    return { muzzle: [0.256, 0.045], eject: [0.0, 0.05, 0.02], sightY: 0.108, glowMat: glow,
      hands: (root) => { gkGripHand(K, root, { d: -0.012, y: 0.012, ang: 0.35, R: 0.031, sx: 0.84, arm: [0.28, -0.42, 1] }); gkGripHand(K, root, { d: -0.012, y: 0.012, ang: 0.35, R: 0.031, sx: 0.84, cup: true, arm: [-0.45, -0.4, 1] }); } };
  },
  // Prototype cryo : corps en laiton, réservoir de verre lumineux, serpentins de cuivre, canon court.
  cryo(K, parts) {
    const { blued: st, park: pk, brass } = GM, body = K.up ? GM.frost : brass;
    K.lt([[-0.07, 0], [-0.07, 0.03], [-0.05, 0.042], [0.12, 0.042], [0.15, 0.03], [0.17, 0.024], [0.17, 0]], body, { y: 0.03, seg: 24 });
    K.lt([[0.17, 0], [0.17, 0.016], [0.42, 0.014], [0.45, 0.02], [0.47, 0.02], [0.47, 0]], st, { y: 0.03 }); K.cy(0.012, 0.468, 0.4705, GM.bore, { y: 0.03 });
    for (let k = 0; k < 6; k++) K.ring(0.019, 0.004, brass, { d: 0.22 + k * 0.035, y: 0.03 });
    K.cy(0.026, -0.04, 0.12, GM.cryoGlass, { y: 0.09, seg: 20 }); for (const d of [-0.045, 0.125]) K.lt([[d - 0.006, 0], [d - 0.006, 0.03], [d + 0.006, 0.03], [d + 0.006, 0]], brass, { y: 0.09 });
    K.bx(0.01, 0.03, -0.02, 0.0, brass, { y: 0.07 }); K.bx(0.01, 0.03, 0.09, 0.11, brass, { y: 0.07 });
    K.pr([[0.0, 0.0], [0.03, 0.0], [0.02, -0.035], [0.008, -0.088], [-0.026, -0.09], [-0.026, -0.072], [-0.012, -0.03]], 0.03, pk, { bev: 0.005 });
    K.pr([[-0.07, 0.05], [-0.07, 0.0], [-0.11, -0.02], [-0.3, -0.06], [-0.31, 0.03], [-0.12, 0.05]], 0.036, pk, { bev: 0.005 });
    K.ar(0.019, 0.003, Math.PI, TAU, st, { d: 0.035, y: 0.0 });
    K.pr([[0.12, 0.124], [0.135, 0.124], [0.134, 0.136], [0.122, 0.136]], 0.003, st, { bev: 0.0004 });
    return { muzzle: [0.47, 0.03], eject: [0.0, 0.05, 0.02], sightY: 0.136, glowMat: GM.cryoGlass,
      hands: (root) => { gkGripHand(K, root, { d: 0.01, y: -0.006, ang: 0.35, R: 0.031, sx: 0.84, arm: [0.3, -0.45, 1] }); gkForeHand(K, root, { d: 0.3, y: 0.03, R: 0.03, sx: 0.9 }); } };
  },
};

// Construit une arme du nouvel atelier ; même contrat que buildGunModel (pièces mobiles et repères).
function buildDetailedGun(key, upgraded, withHands) {
  const g = new THREE.Group(), parts = { root: g }, K = gunKit(g, upgraded);
  const r = GUN_MODELS[key](K, parts);
  if (withHands && r.hands) r.hands(g);
  const moving = new Set(['mag', 'bolt', 'pump', 'slide', 'cyl', 'pan'].map((k) => parts[k]).filter(Boolean));
  for (const p of moving) gunMerge(p);
  gunMerge(g, moving);
  const muzzle = new THREE.Object3D(); muzzle.position.set(0, r.muzzle[1], -r.muzzle[0]); g.add(muzzle); parts.muzzle = muzzle;
  const eject = new THREE.Object3D(); eject.position.set(r.eject[2] ?? 0.03, r.eject[1], -r.eject[0]); g.add(eject); parts.eject = eject;
  parts.sightY = r.sightY; parts.len = r.muzzle[0];
  if (r.glowMat) g.traverse((o) => { if (o.isMesh && o.material === r.glowMat) parts.glow = o; });
  g.traverse((o) => { if (o.isMesh) { o.castShadow = !withHands; o.receiveShadow = !withHands; } });
  return parts;
}

/* ─── Couteau de tranchée Mark I et grenade Mills (vue subjective, et grenade lancée) ─── */
function buildKnife() {
  const g = new THREE.Group(), K = gunKit(g, false);
  K.pr([[0.045, -0.011], [0.15, -0.0085], [0.215, 0.0], [0.15, 0.0085], [0.045, 0.011]], 0.0045, GM.polish, { bev: 0.0016 }); // lame en losange, double tranchant
  K.bx(0.024, 0.032, 0.038, 0.047, GM.brass, { y: -0.004, bev: 0.0015 });
  const pts = [[-0.07, 0], [-0.07, 0.0118]]; for (let i = 0; i < 9; i++) { const d = -0.066 + i * 0.012; pts.push([d, 0.0128], [d + 0.008, 0.0128], [d + 0.009, 0.0116], [d + 0.011, 0.0116]); } pts.push([0.038, 0.0118], [0.038, 0]);
  K.lt(pts, GM.wood, { seg: 14 });
  K.lt([[-0.086, 0], [-0.086, 0.0085], [-0.078, 0.012], [-0.07, 0.012], [-0.07, 0]], GM.brass, { seg: 8 }); // écrou du pommeau
  const bow = new THREE.TorusGeometry(0.058, 0.0038, 6, 20, Math.PI); bow.rotateZ(Math.PI); bow.scale(1, 0.5, 1); bow.rotateY(Math.PI / 2); bow.translate(0, -0.011, 0.018);
  g.add(new THREE.Mesh(bow, GM.brass)); // poing américain
  gkForeHand(K, g, { d: -0.02, y: 0, R: 0.0225, sx: 0.95, arm: [0.32, -0.5, 1] });
  gunMerge(g);
  return g;
}
function buildGrenadeModel(hand) {
  const g = new THREE.Group(), K = gunKit(g, false), V = (r, y) => new THREE.Vector2(r, y);
  const prof = [[0, -0.045], [0.012, -0.044], [0.022, -0.038], [0.029, -0.025], [0.031, -0.005], [0.029, 0.015], [0.023, 0.03], [0.014, 0.04], [0.01, 0.045], [0, 0.045]];
  g.add(new THREE.Mesh(new THREE.LatheGeometry(prof.map(([r, y]) => V(r, y)), 16), GM.iron));
  // Quadrillage de fonte : sillons horizontaux et méridiens.
  for (const [y, r] of [[-0.03, 0.0275], [-0.015, 0.0305], [0, 0.031], [0.015, 0.0295], [0.03, 0.0235]]) { const t = new THREE.TorusGeometry(r, 0.0018, 4, 20); t.rotateX(Math.PI / 2); t.translate(0, y, 0); g.add(new THREE.Mesh(t, GM.bore)); }
  for (let k = 0; k < 6; k++) { const t = new THREE.TorusGeometry(0.03, 0.0018, 4, 14, Math.PI); t.rotateZ(-Math.PI / 2); t.scale(1, 1.3, 1); t.rotateY(k * Math.PI / 6); g.add(new THREE.Mesh(t, GM.bore)); }
  K.vc(0.009, 0.044, 0.054, GM.brass, { seg: 10 }); K.vc(0.011, -0.05, -0.043, GM.brass, { seg: 10 });
  K.rod([0.008, 0.054, 0], [0.032, 0.046, 0], 0.0032, GM.iron); K.rod([0.032, 0.046, 0], [0.034, -0.005, 0], 0.0032, GM.iron); // levier
  const ring = new THREE.TorusGeometry(0.011, 0.0014, 4, 14); ring.rotateY(Math.PI / 2); ring.translate(-0.01, 0.06, 0); g.add(new THREE.Mesh(ring, GM.polish)); // goupille
  if (hand) gkGripHand(K, g, { d: 0.0, y: 0.02, ang: 0.0, R: 0.039, sx: 1, n: 4, trig: false, thumb: false, mirror: true, top: 0.0, arm: [-0.2, -0.6, 1] });
  gunMerge(g);
  return g;
}
