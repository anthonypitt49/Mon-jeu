/* ═══════════════════ CONSTRUCTION DU MONDE ═══════════════════
   Tranchées étayées, bunker en béton, sape boisée, cour du générateur, no man's land. */

const WORLD = { perks: [], wallBuys: [], doors: [], box: null, bench: null, power: null, spin: [], blink: [], fires: [], beams: [], powerLamps: [] };
const MATS = {};

// Constructeur de géométrie (quadrillages déformables, couleurs par sommet).
class GB {
  constructor() { this.p = []; this.n = []; this.u = []; this.c = []; this.i = []; }
  // Grille : origine o, axes a (largeur) et b (hauteur), fn(s,t) → {p:[x,y,z], c:[r,g,b], uv:[u,v]}
  grid(nu, nv, fn) {
    const base = this.p.length / 3;
    for (let j = 0; j <= nv; j++) for (let i = 0; i <= nu; i++) {
      const r = fn(i / nu, j / nv); this.p.push(...r.p); this.u.push(...r.uv); this.c.push(...(r.c || [1, 1, 1])); this.n.push(...(r.n || [0, 1, 0]));
    }
    for (let j = 0; j < nv; j++) for (let i = 0; i < nu; i++) {
      const a = base + j * (nu + 1) + i, b = a + 1, c = a + nu + 1, d = c + 1;
      this.i.push(a, c, b, b, c, d);
    }
  }
  geo(normals = true) {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.p, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(this.u, 2));
    g.setAttribute('color', new THREE.Float32BufferAttribute(this.c, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(this.n, 3));
    g.setIndex(this.i);
    if (normals) g.computeVertexNormals();
    return g;
  }
}
// Lots instanciés : une matrice par occurrence, un seul appel de dessin.
class Batch {
  constructor(geo, mat, shadow = true) { this.geo = geo; this.mat = mat; this.m = []; this.shadow = shadow; }
  add(x, y, z, ry = 0, rx = 0, rz = 0, sx = 1, sy = 1, sz = 1) { _e1.set(rx, ry, rz, 'YXZ'); _q1.setFromEuler(_e1); this.m.push(new THREE.Matrix4().compose(_v1.set(x, y, z), _q1, _v2.set(sx, sy, sz))); return this.m.length - 1; }
  build(parent = R.scene) {
    if (!this.m.length) return null;
    this.geo = meterInstGeo(this.geo, this.mat); // UV en mètres à l'échelle de chaque exemplaire (photo)
    // Lots lourds (sacs de sable, barbelés…) : découpés en zones de 32 m, pour que la caméra et l'ombre ignorent ce qu'elles ne voient pas.
    const tris = (this.geo.index ? this.geo.index.count : this.geo.attributes.position.count) / 3;
    if (parent === R.scene && this.m.length * tris > 20000) {
      const cells = new Map();
      for (const m of this.m) { const k = Math.floor(m.elements[12] / 32) + ',' + Math.floor(m.elements[14] / 32); if (!cells.has(k)) cells.set(k, []); cells.get(k).push(m); }
      if (cells.size > 1) { let first = null; for (const list of cells.values()) { const im = this.inst(list, parent); first ||= im; } this.mesh = first; return first; }
    }
    return (this.mesh = this.inst(this.m, parent));
  }
  inst(list, parent) {
    const im = new THREE.InstancedMesh(this.geo, this.mat, list.length);
    list.forEach((m, k) => im.setMatrixAt(k, m)); im.instanceMatrix.needsUpdate = true;
    im.castShadow = this.shadow; im.receiveShadow = true; im.computeBoundingSphere(); parent.add(im); return im;
  }
}
function mesh(geo, mat, x = 0, y = 0, z = 0, ry = 0, parent = R.scene, shadow = true) {
  const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.rotation.y = ry; m.castShadow = shadow; m.receiveShadow = true; parent.add(m); return m;
}
const boxG = (w, h, d) => new THREE.BoxGeometry(w, h, d);

/* ─── UV en mètres pour les objets ───
   Les boîtes, cylindres et sphères de three.js ont des UV de 0 à 1 par face, quelle que soit leur taille : une photo
   y serait étirée sur un banc de 3 m et écrasée sur un pied de 6 cm. Pour les matières qui le demandent (celles de
   fmat, qui ont une clé de texture, ou userData.mu), chaque face reçoit la taille réelle qu'elle couvre, divisée par
   l'échelle de la matière (userData.scale, en mètres par unité d'UV) : la photo tombe à sa vraie taille, comme sur les
   murs. Le fil d'un bois suit la plus grande dimension de la pièce (grain dans PHOTO_SETS : 'u' si les planches de la
   photo sont couchées, 'v' si elles sont debout). Chaque pièce lit la photo à un endroit différent. */
const meterMat = (m) => !!m && !Array.isArray(m) && (m.userData.mu ?? !!m.userData.ftex);
const meterGrain = (m) => PHOTO_SETS[MAP_ID]?.[m.userData.ftex || m.userData.photo]?.grain || m.userData.grain || '';
// Pour chaque sommet : axes du repère local qui portent u et v (0 = x, 1 = y, 2 = z), coordonnées en mètres sans échelle,
// et taille de la face le long de u et de v (pour le sens du fil). Renvoie null si la géométrie n'est pas reconnue.
function meterBase(geo) {
  const t = geo.type, p = geo.parameters, pos = geo.attributes.position, nor = geo.attributes.normal, uv = geo.attributes.uv;
  if (t === 'ExtrudeGeometry' && uv && nor) { // carrosseries : UV déjà en mètres (coordonnées du profil), sans sens de fil
    const n = uv.count, z = new Uint8Array(n), o = new Uint8Array(n).fill(1), ex = new Float32Array(n * 2).fill(1);
    return { au: z, av: o, mu: Float32Array.from(uv.array), ex };
  }
  if (!p || !uv || !nor || /Extrude|Tube|Shape|Text|Edges|Wireframe/.test(t)) return null;
  const n = uv.count, au = new Uint8Array(n), av = new Uint8Array(n), mu = new Float32Array(n * 2), ex = new Float32Array(n * 2), cv = new Uint8Array(n);
  geo.computeBoundingBox(); const b = geo.boundingBox, size = [b.max.x - b.min.x, b.max.y - b.min.y, b.max.z - b.min.z];
  const P = [0, 0, 0];
  const proj = (i) => { // face plane : projection selon l'axe dominant de la normale
    const nx = Math.abs(nor.getX(i)), ny = Math.abs(nor.getY(i)), nz = Math.abs(nor.getZ(i));
    const [U, V] = nx >= ny && nx >= nz ? [2, 1] : ny >= nz ? [0, 2] : [0, 1];
    P[0] = pos.getX(i); P[1] = pos.getY(i); P[2] = pos.getZ(i);
    au[i] = U; av[i] = V; mu[i * 2] = P[U]; mu[i * 2 + 1] = P[V]; ex[i * 2] = size[U]; ex[i * 2 + 1] = size[V];
  };
  const curved = (i, cu, cl, U = 0, V = 1) => { au[i] = U; av[i] = V; cv[i] = 1; mu[i * 2] = uv.getX(i) * cu; mu[i * 2 + 1] = uv.getY(i) * cl; ex[i * 2] = cu; ex[i * 2 + 1] = cl; };
  if (t === 'CylinderGeometry' || t === 'ConeGeometry') {
    const r0 = p.radiusTop ?? 0, r1 = p.radiusBottom ?? p.radius, torso = (p.radialSegments + 1) * (p.heightSegments + 1);
    const circ = Math.PI * (r0 + r1) * (p.thetaLength ?? TAU) / TAU, slant = Math.hypot(p.height, r1 - r0);
    for (let i = 0; i < n; i++) if (i < torso) curved(i, circ, slant); else proj(i);
  } else if (t === 'SphereGeometry') {
    for (let i = 0; i < n; i++) curved(i, TAU * p.radius * (p.phiLength ?? TAU) / TAU, Math.PI * p.radius * (p.thetaLength ?? Math.PI) / Math.PI);
  } else if (t === 'TorusGeometry') {
    for (let i = 0; i < n; i++) curved(i, (p.arc ?? TAU) * p.radius, TAU * p.tube);
  } else if (t === 'CapsuleGeometry') {
    for (let i = 0; i < n; i++) curved(i, TAU * p.radius, (p.height ?? p.length) + Math.PI * p.radius);
  } else if (t === 'LatheGeometry') {
    let len = 0, rr = 0; for (let k = 1; k < p.points.length; k++) len += p.points[k].distanceTo(p.points[k - 1]);
    for (const q of p.points) rr += q.x / p.points.length;
    for (let i = 0; i < n; i++) curved(i, (p.phiLength ?? TAU) * rr, len);
  } else if (/Box|Plane|Circle|Ring|Polyhedron|Icosahedron|Dodecahedron|Octahedron|Tetrahedron/.test(t)) {
    for (let i = 0; i < n; i++) proj(i);
  } else return null;
  return { au, av, mu, ex, cv };
}
// Copie de la géométrie avec des UV en mètres, à l'échelle (sx, sy, sz) de l'objet ; (ox, oz) choisit l'endroit lu.
function meterUV(geo, mat, sx = 1, sy = 1, sz = 1, ox = 0, oz = 0) {
  if (geo.userData.mu || !meterMat(mat)) return geo;
  const B = meterBase(geo); if (!B) return geo;
  const g = geo.clone(); g.userData = { ...geo.userData, mu: 1 }; // (clone partage userData avec l'original : copie)
  const uv = g.attributes.uv, S = [sx, sy, sz], s = mat.userData.scale || 2, gr = meterGrain(mat);
  const du = hash2(ox * 13.1 + 7, oz * 7.7) * 5.3, dv = hash2(oz * 11.3, ox * 5.9 + 3) * 5.3; // endroit de la photo, propre à la pièce
  for (let i = 0; i < uv.count; i++) {
    const ku = S[B.au[i]], kv = S[B.av[i]];
    let u = B.mu[i * 2] * ku, v = B.mu[i * 2 + 1] * kv;
    const eu = B.ex[i * 2] * ku, ev = B.ex[i * 2 + 1] * kv;
    // Flanc d'un cylindre : le fil ne fait jamais le tour (douelles d'un tonneau, planches d'une citerne : debout).
    if ((gr === 'u' && ev > eu * 1.05) || (gr === 'v' && eu > ev * 1.05 && !B.cv?.[i])) { const w = u; u = v; v = w; }
    uv.setXY(i, u / s + du, v / s + dv);
  }
  uv.needsUpdate = true; return g;
}
// Mesh posé (fixe ou mobile, pas instancié) : UV en mètres à son échelle dans le monde, une seule fois.
function meterMesh(o) {
  if (!o.isMesh || o.isInstancedMesh || o.isSkinnedMesh || !o.geometry || o.geometry.userData.mu || !meterMat(o.material)) return;
  o.updateWorldMatrix(true, false); o.matrixWorld.decompose(_v1, _q1, _v2);
  const g = meterUV(o.geometry, o.material, Math.abs(_v2.x), Math.abs(_v2.y), Math.abs(_v2.z), _v1.x, _v1.z);
  if (g !== o.geometry) o.geometry = g;
}
// Objets créés après la construction du monde (éboulis de mission, pièces du courant…).
function meterize(root) { root.traverse(meterMesh); }
// Lot instancié : la géométrie est partagée et l'échelle change d'un exemplaire à l'autre. La géométrie garde ses mesures
// sans échelle et les axes de chaque face ; le nuanceur multiplie par l'échelle de l'exemplaire (meterInstHook).
function meterInstGeo(geo, mat) {
  if (geo.userData.mui || !meterMat(mat)) return geo;
  const B = meterBase(geo); if (!B) return geo;
  const g = geo.clone(), n = g.attributes.uv.count, a = new Float32Array(n * 2);
  for (let i = 0; i < n; i++) { a[i * 2] = B.au[i]; a[i * 2 + 1] = B.av[i]; }
  g.setAttribute('uv', new THREE.Float32BufferAttribute(B.mu, 2)); g.setAttribute('aMuAx', new THREE.Float32BufferAttribute(a, 2)); g.setAttribute('aMuEx', new THREE.Float32BufferAttribute(B.ex, 2));
  g.userData = { ...geo.userData, mui: 1, mu: 1 }; return g;
}
// Branché après la fusion (sinon la matière serait exclue de mergeStatic) et enchaîné avec la neige ; sans attribut
// aMuAx (exemplaire d'une autre géométrie), le nuanceur ne change rien.
function meterInstHook(m) {
  if (m.userData.muHook) return; m.userData.muHook = 1;
  const prev = m.onBeforeCompile, key = m.customProgramCacheKey?.() || '', s = (m.userData.scale || 2).toFixed(3), gr = meterGrain(m);
  m.onBeforeCompile = (sh, r) => {
    if (prev) prev.call(m, sh, r);
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\n#ifdef USE_INSTANCING\nattribute vec2 aMuAx; attribute vec2 aMuEx;\n#endif')
      .replace('#include <uv_vertex>', `#include <uv_vertex>
      #ifdef USE_INSTANCING
      if (aMuAx.x + aMuAx.y > 0.5) {
        vec3 isc = vec3(length(instanceMatrix[0].xyz), length(instanceMatrix[1].xyz), length(instanceMatrix[2].xyz));
        vec2 k = vec2(aMuAx.x < 0.5 ? isc.x : aMuAx.x < 1.5 ? isc.y : isc.z, aMuAx.y < 0.5 ? isc.x : aMuAx.y < 1.5 ? isc.y : isc.z);
        vec2 mm = uv * k, ee = aMuEx * k;
        ${gr === 'u' ? 'if (ee.y > ee.x * 1.05) mm = mm.yx;' : gr === 'v' ? 'if (ee.x > ee.y * 1.05) mm = mm.yx;' : ''}
        mm = mm / ${s} + fract(vec2(instanceMatrix[3].x * 0.731 + instanceMatrix[3].y * 2.17, instanceMatrix[3].z * 0.613 + instanceMatrix[3].x * 0.291) * 1.37) * 5.3;
        #ifdef USE_MAP
          vMapUv = (mapTransform * vec3(mm, 1.0)).xy;
        #endif
        #ifdef USE_NORMALMAP
          vNormalMapUv = (normalMapTransform * vec3(mm, 1.0)).xy;
        #endif
        #ifdef USE_ROUGHNESSMAP
          vRoughnessMapUv = (roughnessMapTransform * vec3(mm, 1.0)).xy;
        #endif
      }
      #endif`);
  };
  m.customProgramCacheKey = () => key + '|mu';
}
function collider(x0, z0, x1, z1, y1, mat = 'wood', y0 = 0) { MAP.props.push({ x0: Math.min(x0, x1), x1: Math.max(x0, x1), z0: Math.min(z0, z1), z1: Math.max(z0, z1), y0, y1, mat }); }
// Collision d'une boîte tournée autour de Y (approximée par son enveloppe).
function colliderBox(x, z, w, d, ry, h, mat) { const c = Math.abs(Math.cos(ry)), s = Math.abs(Math.sin(ry)); const hw = (w * c + d * s) / 2, hd = (w * s + d * c) / 2; collider(x - hw, z - hd, x + hw, z + hd, h, mat); }

// Sac de sable : boîte bombée.
function sandbagGeo() {
  const g = new THREE.BoxGeometry(0.62, 0.21, 0.36, 4, 1, 2), p = g.attributes.position;
  for (let k = 0; k < p.count; k++) {
    const x = p.getX(k) / 0.31, y = p.getY(k), z = p.getZ(k) / 0.18;
    const s = 1 - 0.55 * (Math.pow(Math.abs(x), 4) * 0.5 + Math.pow(Math.abs(z), 4) * 0.8);
    p.setY(k, y * Math.max(0.25, s)); p.setX(k, p.getX(k) * (1 - 0.08 * Math.abs(y) / 0.1)); p.setZ(k, p.getZ(k) * (1 - 0.05 * Math.abs(y) / 0.1));
  }
  g.computeVertexNormals(); return g;
}

function buildMaterials() {
  const rep = (t, x, y) => { const c = t.clone(); c.repeat.set(x, y); c.needsUpdate = true; return c; };
  MATS.earth = stdMat({ map: TEX.earth.map, normalMap: TEX.earth.normalMap, normalScale: new THREE.Vector2(1.2, 1.2), roughness: 0.96, vertexColors: true }, 0.25);
  MATS.planks = stdMat({ map: TEX.planks.map, normalMap: TEX.planks.normalMap, roughness: 0.88 }, 1);
  MATS.post = stdMat({ map: rep(TEX.planks.map, 0.25, 2), normalMap: TEX.planks.normalMap, roughness: 0.9, color: 0x8a7a68 }, 1);
  MATS.sandbag = stdMat({ map: TEX.burlap.map, normalMap: TEX.burlap.normalMap, roughness: 0.97, color: 0xc9bca0 }, 1.1);
  MATS.metal = stdMat({ map: TEX.metal.map, normalMap: TEX.metal.normalMap, normalScale: new THREE.Vector2(0.5, 0.5), roughness: 0.72, metalness: 0.25 }, 0.8);
  MATS.concrete = stdMat({ map: TEX.concrete.map, normalMap: TEX.concrete.normalMap, roughness: 0.93, vertexColors: true });
  MATS.concreteOut = stdMat({ map: TEX.concrete.map, normalMap: TEX.concrete.normalMap, roughness: 0.93 }, 1);
  MATS.floor = stdMat({ map: TEX.snow.map, normalMap: TEX.earth.normalMap, roughness: 0.78, vertexColors: true });
  MATS.duck = stdMat({ map: rep(TEX.planks.map, 0.3, 0.3), roughness: 0.85, color: 0x8a7a66 }, 0.3);
  MATS.boards = stdMat({ map: TEX.planks.map, normalMap: TEX.planks.normalMap, roughness: 0.8, vertexColors: true, color: 0xb8a58e });
  MATS.snow = stdMat({ map: TEX.snow.map, normalMap: TEX.snow.normalMap, normalScale: new THREE.Vector2(0.8, 0.8), roughness: 0.9, vertexColors: true });
  MATS.crate = stdMat({ map: TEX.crate.map, normalMap: TEX.crate.normalMap, roughness: 0.85 }, 1);
  MATS.iron = stdMat({ color: 0x2c2d2e, roughness: 0.55, metalness: 0.7, map: TEX.grime.map }, 0.6);
  MATS.olive = stdMat({ color: 0x4a5236, roughness: 0.6, metalness: 0.35, map: TEX.grime.map, normalMap: TEX.grime.normalMap }, 0.7);
  MATS.rust = stdMat({ color: 0x6b3b22, roughness: 0.8, metalness: 0.3, map: TEX.grime.map }, 0.8);
  MATS.bark = stdMat({ color: 0x2c2723, roughness: 0.95, map: TEX.grime.map, normalMap: TEX.earth.normalMap }, 1.2);
  MATS.char = stdMat({ color: 0x151312, roughness: 0.9, map: TEX.grime.map }, 0.8);
  MATS.cloth = stdMat({ color: 0x5d5a44, roughness: 0.95, map: TEX.cloth.map, normalMap: TEX.cloth.normalMap }, 0.9);
  // Nom de la matière, recopié dans les clones des fusions : les textures photo (05p_photo.js) les retrouvent tous.
  for (const k of Object.keys(PHOTO_SETS[MAP_ID] || {})) if (MATS[k]) MATS[k].userData.photo = k;
  // Matières communes des objets : famille photo (OBJ_FAM, 05b_flat.js), donc UV en mètres et photo de la famille.
  for (const [k, f] of [['iron', 'fonte'], ['rust', 'rouille'], ['olive', 'olive'], ['crate', 'boisBrut'], ['cloth', 'toile'], ['bark', 'ecorce']]) Object.assign(MATS[k].userData, { ftex: f, scale: OBJ_FAM[f][1] });
  MATS.olive.metalness = 0.1; // une peinture n'est pas un métal
  // Barricades et poteaux des cartes de plain-pied : bois brut photographié (le Poste 7 garde ses planches de tranchée).
  if (M.flat) for (const k of ['planks', 'post']) Object.assign(MATS[k].userData, { ftex: 'boisBrut', scale: OBJ_FAM.boisBrut[1] });
  MATS.wire = new THREE.LineBasicMaterial({ color: 0x191919 });
  MATS.wireMesh = stdMat({ color: 0x252525, roughness: 0.5, metalness: 0.8 });
  MATS.brass = stdMat({ color: 0xb58a3c, roughness: 0.35, metalness: 0.9 });
  MATS.glassOff = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.2, emissive: 0x000000 });
  MATS.bulbRed = new THREE.MeshBasicMaterial({ color: 0xff3a22 });
  MATS.bulbWarm = new THREE.MeshBasicMaterial({ color: 0xffd9a0 });
  MATS.stone = stdMat({ map: TEX.concrete.map, normalMap: TEX.concrete.normalMap, color: 0x8b8378, roughness: 0.95 }, 1);
  MATS.ice = new THREE.MeshStandardMaterial({ color: 0xbfd8ea, roughness: 0.08, metalness: 0.2, transparent: true, opacity: 0.85 });
  MATS.paper = new THREE.MeshStandardMaterial({ roughness: 0.9 });
  for (const k in MATS) MATS[k].name ||= k;
}

/* ─── Construction principale ─── */
function buildWorld() {
  rng = mulberry32(1917);
  buildMaterials();
  if (M.flat) buildFlatWorld();
  else { buildTerrain(); buildTrenches(); buildRoofs(); buildRamps(); }
  buildDoors();
  buildInteractables();
  buildPowerParts();
  buildSecret();
  M.decor();
  if (M.flat) flatDecals();
  scatterAll(M.scatter);
  checkBarricadeExits();
  mergeStatic();
}
// Fusionne les accessoires fixes : même texture et même finition → un seul appel de dessin, la teinte passe dans les sommets.
function mergeStatic() {
  R.scene.updateMatrixWorld(true);
  R.scene.traverse(meterMesh); // UV en mètres (photo), avant la fusion qui perd la taille de chaque pièce
  // Les petits objets (moins de ~22 cm) ne projettent plus d'ombre : invisible à l'œil, mais autant d'appels de dessin en moins.
  const _s = new THREE.Vector3();
  R.scene.traverse((o) => {
    if (!o.isMesh || o.isSkinnedMesh || !o.castShadow || !o.geometry) return;
    if (!o.geometry.boundingSphere) o.geometry.computeBoundingSphere();
    o.matrixWorld.decompose(_v1, _q1, _s);
    if (o.geometry.boundingSphere.radius * Math.max(_s.x, _s.y, _s.z) < 0.22 && !o.isInstancedMesh) o.castShadow = false;
  });
  const groups = new Map();
  const isDynamic = (o) => { for (let p = o; p; p = p.parent) if (p.userData.dynamic) return true; return false; };
  const own = (m, k) => Object.prototype.hasOwnProperty.call(m, k);
  const sig = (m) => m.type !== 'MeshStandardMaterial' || m.vertexColors || m.emissiveMap || (own(m, 'onBeforeCompile') && !m.userData.snow) ? 'u' + m.uuid
    : ['s', m.map?.uuid, m.normalMap?.uuid, m.roughness.toFixed(2), m.metalness.toFixed(2), m.emissive.getHexString(), m.emissiveIntensity.toFixed(2), m.transparent, m.opacity.toFixed(2), m.side, m.alphaTest, m.userData.snow || 0, m.depthWrite, m.userData.ftex || ''].join('|');
  R.scene.traverse((o) => {
    if (!o.isMesh || o.isInstancedMesh || o.isSkinnedMesh || Array.isArray(o.material) || isDynamic(o)) return;
    const g = o.geometry; if (g.attributes.color || !g.attributes.normal || !g.attributes.uv || g.attributes.position.count > 20000) return;
    const k = sig(o.material) + (o.castShadow ? '_s' : '_n') + (o.renderOrder || 0);
    if (!groups.has(k)) groups.set(k, { mat: o.material, cast: o.castShadow, list: [], colors: new Set() });
    const G = groups.get(k); G.list.push(o); G.colors.add(o.material.color ? o.material.color.getHex() : 0);
  });
  for (const { mat, cast, list, colors } of groups.values()) {
    if (list.length < 2) continue;
    const tint = colors.size > 1; // teintes différentes : couleur par sommet
    const geos = list.map((o) => {
      let g = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone();
      for (const n of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(n)) g.deleteAttribute(n);
      g.morphAttributes = {}; g.applyMatrix4(o.matrixWorld);
      if (tint) { const c = o.material.color, n = g.attributes.position.count, a = new Float32Array(n * 3); for (let i = 0; i < n; i++) { a[i * 3] = c.r; a[i * 3 + 1] = c.g; a[i * 3 + 2] = c.b; } g.setAttribute('color', new THREE.BufferAttribute(a, 3)); }
      return g;
    });
    const merged = mergeGeometries(geos); if (!merged) continue;
    let m2 = mat;
    if (tint) { m2 = mat.clone(); m2.color.set(0xffffff); m2.vertexColors = true; if (mat.userData.snow) snowify(m2, mat.userData.snow); }
    const m = new THREE.Mesh(merged, m2); m.castShadow = cast; m.receiveShadow = true; R.scene.add(m);
    for (const o of list) o.parent.remove(o);
  }
  R.scene.traverse((o) => { if (o.isInstancedMesh && o.geometry.attributes.aMuAx) meterInstHook(o.material); });
  batchGlows();
}

/* ─── Halos lumineux fixes : un seul appel de dessin pour tous ───
   Les halos d'origine restent dans la scène (calque masqué) : le code qui les fait vaciller, clignoter ou disparaître
   continue de les modifier, et le lot recopie leur état à chaque image. */
const GLOWB = [];
function batchGlows() {
  const isDyn = (o) => { for (let p = o; p; p = p.parent) if (p.userData.dynamic) return true; return false; };
  const list = [];
  R.scene.traverse((o) => { if (o.isSprite && !o.userData.glowB && o.material.map === TEX.sprites.glow && o.material.blending === THREE.AdditiveBlending && o.material.depthTest && o.material.sizeAttenuation && !o.material.rotation && o.center.x === 0.5 && o.center.y === 0.5 && !isDyn(o)) list.push(o); });
  if (list.length < 6) return;
  const base = new THREE.PlaneGeometry(1, 1), geo = new THREE.InstancedBufferGeometry(), n = list.length;
  geo.index = base.index; geo.setAttribute('position', base.attributes.position); geo.setAttribute('uv', base.attributes.uv);
  const off = new THREE.InstancedBufferAttribute(new Float32Array(n * 3), 3), col = new THREE.InstancedBufferAttribute(new Float32Array(n * 4), 4), sz = new THREE.InstancedBufferAttribute(new Float32Array(n * 2), 2);
  for (const a of [off, col, sz]) a.setUsage(THREE.DynamicDrawUsage);
  geo.setAttribute('aOff', off); geo.setAttribute('aCol', col); geo.setAttribute('aSize', sz); geo.instanceCount = n;
  const mat = new THREE.ShaderMaterial({
    uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, { map: { value: TEX.sprites.glow } }]),
    vertexShader: `attribute vec3 aOff; attribute vec4 aCol; attribute vec2 aSize; varying vec2 vUv; varying vec4 vCol;
      #include <fog_pars_vertex>
      void main() { vUv = uv; vCol = aCol; vec4 mvPosition = viewMatrix * vec4(aOff, 1.0); mvPosition.xy += position.xy * aSize; gl_Position = projectionMatrix * mvPosition;
        #include <fog_vertex>
      }`,
    fragmentShader: `uniform sampler2D map; varying vec2 vUv; varying vec4 vCol;
      #include <fog_pars_fragment>
      void main() { vec4 t = texture2D(map, vUv); gl_FragColor = vec4(t.rgb * vCol.rgb, t.a * vCol.a); if (gl_FragColor.a < 0.004) discard;
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
        #include <fog_fragment>
      }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: true,
  });
  const mesh = new THREE.Mesh(geo, mat); mesh.frustumCulled = false; mesh.renderOrder = 1; mesh.userData.dynamic = true; R.scene.add(mesh);
  for (const s of list) { s.userData.glowB = true; s.layers.set(31); }
  GLOWB.push({ mesh, list, off, col, sz });
  syncGlows();
}
const _gs = new THREE.Vector3();
function syncGlows() {
  for (const B of GLOWB) {
    const { list, off, col, sz } = B, o = off.array, c = col.array, z = sz.array;
    for (let i = 0; i < list.length; i++) {
      const s = list[i]; let vis = true; for (let p = s; p; p = p.parent) { if (!p.visible) { vis = false; break; } if (!p.parent && p !== R.scene) vis = false; }
      const e = s.matrixWorld.elements, m = s.material;
      o[i * 3] = e[12]; o[i * 3 + 1] = e[13]; o[i * 3 + 2] = e[14];
      z[i * 2] = Math.hypot(e[0], e[1], e[2]); z[i * 2 + 1] = Math.hypot(e[4], e[5], e[6]);
      c[i * 4] = m.color.r; c[i * 4 + 1] = m.color.g; c[i * 4 + 2] = m.color.b; c[i * 4 + 3] = vis && m.visible ? m.opacity : 0;
    }
    off.needsUpdate = col.needsUpdate = sz.needsUpdate = true;
  }
}

function buildTerrain() {
  const x0 = -44, x1 = 124, z0 = -56, z1 = 116, S = 1;
  const nx = (x1 - x0) / S, nz = (z1 - z0) / S;
  const gb = new GB(), mud = [0.34, 0.28, 0.23];
  const H = new Float32Array((nx + 1) * (nz + 1));
  for (let j = 0; j <= nz; j++) for (let i = 0; i <= nx; i++) H[j * (nx + 1) + i] = surfH(x0 + i * S, z0 + j * S);
  for (let j = 0; j <= nz; j++) for (let i = 0; i <= nx; i++) {
    const x = x0 + i * S, z = z0 + j * S, h = H[j * (nx + 1) + i];
    const e = edgeAt(x, z);
    const trodden = smooth(clamp((1.7 - e) / 1.1, 0, 1)) * 0.55;
    const patch = smooth(clamp((fbm(x * 0.07 + 11, z * 0.07, 3) - 0.6) * 6, 0, 1)) * 0.6;
    let cr = 0; for (const c of CRATERS) { const d = Math.hypot(x - c.x, z - c.z) / c.r; if (d < 1.2) cr = Math.max(cr, (1.2 - d) * 0.55); }
    const k = clamp(Math.max(trodden, patch, cr), 0, 0.85);
    const v = 0.92 + fbm(x * 0.3, z * 0.3, 2) * 0.1;
    gb.p.push(x, h, z); gb.u.push(x / 4, z / 4); gb.n.push(0, 1, 0);
    gb.c.push(lerp(v, mud[0], k), lerp(v, mud[1], k), lerp(v * 1.02, mud[2], k));
  }
  for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) {
    const cx = x0 + (i + 0.5) * S, cz = z0 + (j + 0.5) * S, tx = tileOf(cx), tz = tileOf(cz);
    if (inMap(tx, tz)) { const k = ti(tx, tz); if (MAP.type[k] !== T_SOLID && !MAP.roof[k]) continue; }
    const a = j * (nx + 1) + i, b = a + 1, c = a + nx + 1, d = c + 1;
    gb.i.push(a, c, b, b, c, d);
  }
  const m = mesh(gb.geo(), MATS.snow, 0, 0, 0, 0, R.scene, true);
  m.name = 'terrain';
  // Plaine lointaine sous le brouillard.
  const F = M.env.far;
  if (F) { const far = new THREE.Mesh(new THREE.RingGeometry(F.r0 || 92, 700, 64, 1), stdMat({ color: F.color, roughness: 1 })); far.rotation.x = -Math.PI / 2; far.position.set(F.cx, F.y, F.cz); R.scene.add(far); }
}

function faceDirs() { return [[1, 0], [-1, 0], [0, 1], [0, -1]]; }
function buildTrenches() {
  const wallEarth = new GB(), wallConc = new GB(), floorG = new GB(), boardG = new GB();
  const bag = sandbagGeo();
  const B = {
    bags: new Batch(bag, MATS.sandbag), posts: new Batch(boxG(0.13, 1, 0.13), MATS.post), panels: new Batch(boxG(2, 1, 0.05), MATS.planks),
    tin: new Batch(boxG(2, 1, 0.03), MATS.metal), slats: new Batch(boxG(0.95, 0.045, 0.11), MATS.duck), rails: new Batch(boxG(0.08, 0.07, 2), MATS.duck),
    wireProps: new Batch(boxG(0.05, 0.05, 0.05), MATS.iron, false),
  };
  const postKeys = new Set();
  const addPost = (x, z, h, y0 = 0) => { const k = `${x.toFixed(2)}_${z.toFixed(2)}`; if (postKeys.has(k)) return; postKeys.add(k); B.posts.add(x, y0 + h / 2, z, rand(-0.05, 0.05), rand(-0.02, 0.02), rand(-0.02, 0.02), 1, h, 1); };
  for (let z = 0; z < MAP_D; z++) for (let x = 0; x < MAP_W; x++) {
    const t = tType(x, z); if (t === T_SOLID) continue;
    const i = ti(x, z), style = MAP.style[i], roofed = MAP.roof[i];
    const ramp = t === T_RAMP ? MAP.barricades[MAP.rampAt[i]] : null;
    for (const [dx, dz] of faceDirs()) {
      if (tType(x + dx, z + dz) !== T_SOLID) continue;
      if (ramp && dx === ramp.dir[0] && dz === ramp.dir[1]) continue; // sortie de la rampe
      // Géométrie du mur
      const nX = -dx, nZ = -dz; // normale vers l'intérieur de la tranchée
      const ex = dx > 0 ? (x + 1) * TILE : dx < 0 ? x * TILE : null, ez = dz > 0 ? (z + 1) * TILE : dz < 0 ? z * TILE : null;
      const along = dx !== 0 ? [0, 0, 1] : [1, 0, 0];
      const sx = dx !== 0 ? ex : x * TILE, sz = dz !== 0 ? ez : z * TILE;
      const concrete = style === STYLE_BUNKER, top = roofed ? WALL_H - 0.08 : WALL_H;
      const gb = concrete ? wallConc : wallEarth;
      // Sens des indices pour que la face regarde vers la tranchée.
      const flip = (dx > 0) || (dz < 0);
      gb.grid(4, 5, (s0, v) => {
        const s = flip ? 1 - s0 : s0, px = sx + along[0] * s * TILE, pz = sz + along[2] * s * TILE, y = v * top;
        let disp = 0;
        if (!concrete) { const f = Math.sin(Math.PI * s) * Math.sin(Math.PI * v), amp = style === STYLE_CRATER ? 0.62 : 0.3; disp = (fbm(px * 0.9 + py3(y), pz * 0.9 + y, 3) - 0.5) * amp * f - v * 0.16 * Math.sqrt(Math.sin(Math.PI * s)); }
        const ao = concrete ? 0.62 + 0.38 * smooth(clamp(v * 3, 0, 1)) : 0.55 + 0.45 * smooth(clamp(v * 2.2, 0, 1));
        return { p: [px - nX * -disp, y, pz - nZ * -disp], uv: [(px + pz) / 2.2, y / 2.2], c: [ao, ao, ao] };
      });
      // Habillage
      const mx = sx + along[0] * TILE / 2 + nX * 0.05, mz = sz + along[2] * TILE / 2 + nZ * 0.05;
      const ry = dx !== 0 ? Math.PI / 2 : 0;
      const r = hash2(x * 7 + dx * 3, z * 13 + dz * 5);
      const c0x = sx + nX * 0.1, c0z = sz + nZ * 0.1, c1x = sx + along[0] * TILE + nX * 0.1, c1z = sz + along[2] * TILE + nZ * 0.1;
      if (style === STYLE_TRENCH || style === STYLE_YARD) {
        if (ramp) { /* flancs de rampe : terre nue */ }
        else if (r < 0.4) { B.panels.add(mx, 0.95, mz, ry + rand(-0.01, 0.01), rand(-0.03, 0.03), 0, 1, 1.75, 1); addPost(c0x, c0z, WALL_H + 0.3); addPost(c1x, c1z, WALL_H + 0.3); }
        else if (r < 0.65) { B.tin.add(mx + nX * 0.02, 0.95, mz + nZ * 0.02, ry, rand(-0.06, 0.02), rand(-0.02, 0.02), 1, 1.8, 1); addPost(c0x, c0z, WALL_H + 0.3); addPost(c1x, c1z, WALL_H + 0.3); }
        else if (r < 0.88) {
          const rows = style === STYLE_YARD ? 9 : 5;
          for (let row = 0; row < rows; row++) for (let k = 0; k < 3; k++) {
            const s = (k + 0.5 + (row % 2) * 0.5 - 0.25) / 3; if (s > 1) continue;
            B.bags.add(sx + along[0] * s * TILE + nX * 0.2, 0.1 + row * 0.19, sz + along[2] * s * TILE + nZ * 0.2, ry + rand(-0.08, 0.08), 0, rand(-0.05, 0.05), 1, 1, 1);
          }
        }
        // Parapet : deux rangs de sacs sur la lèvre.
        if (!roofed) for (let row = 0; row < 2; row++) for (let k = 0; k < 4; k++) {
          const s = (k + (row ? 0.5 : 0) + 0.1) / 3.6;
          B.bags.add(sx + along[0] * s * TILE - nX * 0.32, WALL_H + 0.09 + row * 0.18, sz + along[2] * s * TILE - nZ * 0.32, ry + rand(-0.12, 0.12), 0, rand(-0.05, 0.05), 1, 1, 1);
        }
      } else if (style === STYLE_DUGOUT) {
        B.panels.add(mx, 1.05, mz, ry, 0, 0, 1, 2.1, 1); addPost(c0x, c0z, top); addPost(c1x, c1z, top);
      } else if (style === STYLE_CRATER && !ramp && r < 0.22) {
        // Entonnoir d'obus : terre nue, quelques poutres arrachées plantées dans la paroi.
        B.posts.add(mx + nX * 0.25, 1.1, mz + nZ * 0.25, ry + rand(-0.4, 0.4), rand(-0.5, 0.5), rand(-0.3, 0.3), 1.3, 1.9, 1.3);
      }
    }
    // Sols
    if (t === T_RAMP) continue;
    const x0 = x * TILE, z0 = z * TILE;
    if (style === STYLE_BUNKER || style === STYLE_DUGOUT) {
      boardG.grid(2, 2, (s, v) => { const px = x0 + s * TILE, pz = z0 + v * TILE; const e = Math.min(s, 1 - s, v, 1 - v); const ao = 0.62 + 0.38 * smooth(clamp(e * 4, 0, 1)); return { p: [px, 0.01, pz], uv: [px / 2, pz / 2], c: [ao, ao, ao] }; });
    } else {
      floorG.grid(4, 4, (s, v) => {
        const px = x0 + s * TILE, pz = z0 + v * TILE;
        const nearWall = [[1, 0], [-1, 0], [0, 1], [0, -1]].reduce((m, [a, b]) => { if (tType(x + a, z + b) !== T_SOLID) return m; const d = a > 0 ? 1 - s : a < 0 ? s : b > 0 ? 1 - v : v; return Math.max(m, 1 - clamp(d * 3, 0, 1)); }, 0);
        const sn = clamp(nearWall * 0.55 + (fbm(px * 0.6, pz * 0.6, 3) - 0.58) * 1.6, 0, 0.85);
        const mud = [0.3, 0.25, 0.21], w = 0.88;
        const fh = M.floorH ? M.floorH(px, pz) : 0, sn2 = fh < -0.05 ? sn * 0.55 : sn; // fond de cratère : terre retournée
        return { p: [px, (fbm(px * 2, pz * 2, 2) - 0.5) * 0.04 + fh, pz], uv: [px / 3, pz / 3], c: [lerp(mud[0], w, sn2), lerp(mud[1], w, sn2), lerp(mud[2], w * 1.03, sn2)] };
      });
      if (style === STYLE_TRENCH || t === T_DOOR) {
        // Caillebotis dans l'axe du boyau.
        const ax = (isFloorish(x + 1, z) || isFloorish(x - 1, z)) && !(isFloorish(x, z + 1) && isFloorish(x, z - 1) && !(isFloorish(x + 1, z) && isFloorish(x - 1, z)));
        const cx = x0 + TILE / 2, cz = z0 + TILE / 2, rot = ax ? Math.PI / 2 : 0, jit = rand(-0.04, 0.04);
        for (const o of [-0.38, 0.38]) B.rails.add(cx + (ax ? 0 : o), 0.04, cz + (ax ? o : 0), rot + jit);
        for (let k = 0; k < 9; k++) { const o = -0.9 + k * 0.225; if (hash2(x * 31 + k, z * 17) < 0.05) continue; B.slats.add(cx + (ax ? o : 0), 0.09, cz + (ax ? 0 : o), rot + jit + rand(-0.03, 0.03)); }
      }
    }
  }
  mesh(wallEarth.geo(), MATS.earth, 0, 0, 0, 0, R.scene, true);
  mesh(wallConc.geo(), MATS.concrete, 0, 0, 0, 0, R.scene, true);
  mesh(floorG.geo(), MATS.floor, 0, 0, 0, 0, R.scene, false);
  mesh(boardG.geo(), MATS.boards, 0, 0, 0, 0, R.scene, false);
  Object.values(B).forEach((b) => b.build());
}
function py3(y) { return y * 0.7; }
function isFloorish(x, z) { const t = tType(x, z); return t === T_FLOOR || t === T_DOOR; }

function buildRoofs() {
  const ceilC = new GB(), ceilM = new GB();
  const beams = new Batch(boxG(0.22, 0.26, TILE), MATS.post), posts = new Batch(boxG(0.22, 1, 0.22), MATS.post);
  for (let z = 0; z < MAP_D; z++) for (let x = 0; x < MAP_W; x++) {
    const i = ti(x, z); if (!MAP.roof[i] || MAP.type[i] === T_SOLID) continue;
    const st = MAP.style[i], y = WALL_H - 0.08, x0 = x * TILE, z0 = z * TILE;
    const gb = st === STYLE_BUNKER ? ceilC : ceilM;
    // Le haut des parois de terre recule un peu : le plafond déborde au-dessus pour ne laisser aucun jour.
    const ov = (dx, dz) => (tType(x + dx, z + dz) === T_SOLID ? 0.3 : 0), ax0 = x0 - ov(-1, 0), ax1 = x0 + TILE + ov(1, 0), az0 = z0 - ov(0, -1), az1 = z0 + TILE + ov(0, 1);
    gb.grid(1, 1, (s, v) => { const px = lerp(ax1, ax0, s), pz = lerp(az0, az1, v); return { p: [px, y, pz], uv: [px / 2, pz / 2], c: [0.5, 0.5, 0.52], n: [0, -1, 0] }; });
    beams.add(x0 + TILE / 2, y - 0.13, z0 + TILE / 2, 0, 0, 0);
    // Linteau au-dessus des ouvertures vers les zones non couvertes.
    for (const [dx, dz] of faceDirs()) {
      const nx = x + dx, nz = z + dz; if (!inMap(nx, nz)) continue; const j = ti(nx, nz);
      if (MAP.type[j] !== T_SOLID && !MAP.roof[j]) beams.add(x0 + TILE / 2 + dx * (TILE / 2 - 0.1), y - 0.14, z0 + TILE / 2 + dz * (TILE / 2 - 0.1), dx !== 0 ? 0 : Math.PI / 2, 0, 0, 1, 1.2, 1);
    }
  }
  mesh(ceilC.geo(false), MATS.concrete, 0, 0, 0, 0, R.scene, true);
  const mm = MATS.metal.clone(); mm.side = THREE.DoubleSide; mm.userData = {};
  mesh(ceilM.geo(false), mm, 0, 0, 0, 0, R.scene, true);
  // Poteaux porteurs.
  (M.roofPosts || []).forEach(([x, z]) => { posts.add(x, (WALL_H - 0.1) / 2, z, 0, 0, 0, 1, WALL_H - 0.1, 1); collider(x - 0.14, z - 0.14, x + 0.14, z + 0.14, WALL_H, 'wood'); });
  beams.build(); posts.build();
}

function buildRamps() {
  const gb = new GB(), steps = new Batch(boxG(1.6, 0.06, 0.14), MATS.duck);
  const plank = boxG(1.95, 0.2, 0.05);
  // UV d'une seule planche dans la texture (1/6 de hauteur).
  const uv = plank.attributes.uv; for (let k = 0; k < uv.count; k++) uv.setY(k, uv.getY(k) / 6 + 0.02);
  WORLD.planks = new THREE.InstancedMesh(plank, MATS.planks, MAP.barricades.length * 6); WORLD.planks.castShadow = true; WORLD.planks.receiveShadow = true;
  const posts = new Batch(boxG(0.14, 1, 0.14), MATS.post);
  const wires = [];
  for (const b of MAP.barricades) {
    const cx = tcx(b.x), cz = tcx(b.z), [dx, dz] = b.dir, px = -dz, pz = dx; // perpendiculaire
    gb.grid(4, 8, (s, v) => {
      const lateral = (s - 0.5) * TILE, prog = v; // v = 0 bord intérieur → 1 bord extérieur
      const x = cx + px * lateral + dx * (prog - 0.5) * TILE, z = cz + pz * lateral + dz * (prog - 0.5) * TILE;
      const y = smooth(prog) * WALL_H + (v > 0 && v < 1 && s > 0 && s < 1 ? (fbm(x, z, 2) - 0.5) * 0.12 : 0);
      const snow = clamp(0.5 + prog * 0.5 - Math.abs(s - 0.5) * 0.4, 0, 1), m = [0.32, 0.26, 0.21];
      return { p: [x, y, z], uv: [x / 3, z / 3], c: [lerp(m[0], 0.9, snow), lerp(m[1], 0.92, snow), lerp(m[2], 0.96, snow)] };
    });
    // Le quadrillage doit regarder vers le haut : on inverse l'ordre si nécessaire.
    fixWinding(gb);
    for (let k = 1; k < 7; k++) { const prog = k / 7.5; steps.add(cx + dx * (prog - 0.5) * TILE, smooth(prog) * WALL_H + 0.02, cz + dz * (prog - 0.5) * TILE, Math.atan2(px, pz) + Math.PI / 2 + rand(-0.08, 0.08), 0, 0); }
    // Montants et planches de la barricade (bord intérieur).
    const ix = cx - dx * (TILE / 2 - 0.12), iz = cz - dz * (TILE / 2 - 0.12);
    b.center = new THREE.Vector3(ix, 1.1, iz); b.perp = [px, pz];
    for (const o of [-0.98, 0.98]) posts.add(ix + px * o, 1.15, iz + pz * o, 0, 0, 0, 1, 2.3, 1);
    b.plankM = [];
    const ang = [0.16, -0.12, 0.22, -0.26, 0.06, -0.18], hs = [0.3, 0.62, 0.95, 1.28, 1.6, 1.92];
    const ry = Math.atan2(px, pz) - Math.PI / 2;
    for (let k = 0; k < 6; k++) {
      _e1.set(0, ry, ang[k] + rand(-0.04, 0.04), 'YXZ'); _q1.setFromEuler(_e1);
      const m = new THREE.Matrix4().compose(_v1.set(ix + dx * (k % 2 ? 0.05 : -0.02), hs[k], iz + dz * (k % 2 ? 0.05 : -0.02)), _q1, _v2.set(1, 1, 1));
      b.plankM.push(m); WORLD.planks.setMatrixAt(b.id * 6 + k, m);
    }
    b.plankAnim = new Array(6).fill(1); b.plankShown = new Array(6).fill(true);
    // Barbelés de part et d'autre de la sortie.
    const ox = cx + dx * 1.3, oz = cz + dz * 1.3;
    for (let k = 0; k < 4; k++) { const y = WALL_H + 0.25 + (k % 2) * 0.25; wires.push(ox + px * -1.4, y, oz + pz * -1.4, ox + px * -0.6, y - 0.1, oz + pz * -0.6, ox + px * 0.6, y - 0.1, oz + pz * 0.6, ox + px * 1.4, y, oz + pz * 1.4); }
  }
  WORLD.planks.instanceMatrix.setUsage(THREE.DynamicDrawUsage); R.scene.add(WORLD.planks);
  mesh(gb.geo(), MATS.snow, 0, 0, 0, 0, R.scene, true);
  steps.build(); posts.build();
  const wg = new THREE.BufferGeometry(), wp = [];
  for (let k = 0; k < wires.length; k += 12) for (let s = 0; s < 3; s++) wp.push(wires[k + s * 3], wires[k + s * 3 + 1], wires[k + s * 3 + 2], wires[k + s * 3 + 3], wires[k + s * 3 + 4], wires[k + s * 3 + 5]);
  wg.setAttribute('position', new THREE.Float32BufferAttribute(wp, 3)); R.scene.add(new THREE.LineSegments(wg, MATS.wire));
}
// Les rampes sont générées dans des orientations variées : on force les faces vers le haut.
function fixWinding(gb) {
  const P = gb.p, I = gb.i;
  for (let k = gb._fixed || 0; k < I.length; k += 3) {
    const a = I[k] * 3, b = I[k + 1] * 3, c = I[k + 2] * 3;
    const ux = P[b] - P[a], uz = P[b + 2] - P[a + 2], vx = P[c] - P[a], vz = P[c + 2] - P[a + 2];
    if (uz * vx - ux * vz < 0) { const t = I[k + 1]; I[k + 1] = I[k + 2]; I[k + 2] = t; }
  }
  gb._fixed = I.length;
}

/* ─── Portes : grille de barbelés, porte blindée, décombres, grille de cellule, porte en bois, éboulis ─── */
function buildDoors() {
  for (const d of MAP.doors) {
    const g = new THREE.Group(), cx = tcx(d.x), cz = tcx(d.z); g.userData.dynamic = true;
    g.position.set(cx, 0, cz); g.rotation.y = d.axis === 'x' ? Math.PI / 2 : 0; R.scene.add(g);
    const leaf = new THREE.Group(); g.add(leaf);
    const H = WALL_H - 0.1;
    if (d.kind === 'steel') {
      const panel = mesh(boxG(1.96, H, 0.1), MATS.iron, 0, H / 2, 0, 0, leaf);
      for (let k = 0; k < 5; k++) mesh(boxG(1.9, 0.05, 0.12), MATS.rust, 0, 0.3 + k * 0.48, 0, 0, leaf);
      mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.05, 16), MATS.rust, 0.55, 1.2, 0.08, 0, leaf).rotation.x = Math.PI / 2;
      panel.userData.kind = 'steel';
    } else if (d.kind === 'bars') {
      // Grille de cellule : barreaux ronds, traverses plates, serrure.
      for (let k = 0; k < 15; k++) mesh(new THREE.CylinderGeometry(0.02, 0.02, H, 6), MATS.iron, -0.91 + k * 0.13, H / 2, 0, 0, leaf, false);
      for (const y of [0.1, 1.05, H - 0.06]) mesh(boxG(1.96, 0.07, 0.04), MATS.iron, 0, y, 0, 0, leaf);
      mesh(boxG(0.16, 0.26, 0.08), MATS.rust, 0.7, 1.05, 0.05, 0, leaf);
    } else if (d.kind === 'wood') {
      // Porte pleine à panneaux (pivote sur ses gonds à l'ouverture).
      const wm = fmat('boisPeint', d.color || 0x9a7a58); // porte peinte (photo : planches à la peinture usée)
      mesh(boxG(1.9, H, 0.07), wm, 0, H / 2, 0, 0, leaf);
      for (const [x, y, w, h] of [[-0.45, 0.62, 0.62, 0.8], [0.45, 0.62, 0.62, 0.8], [-0.45, 1.68, 0.62, 0.95], [0.45, 1.68, 0.62, 0.95]]) mesh(boxG(w, h, 0.1), wm, x, y, 0, 0, leaf);
      mesh(new THREE.SphereGeometry(0.045, 10, 8), MATS.brass, 0.78, 1.05, 0.07, 0, leaf, false); mesh(new THREE.SphereGeometry(0.045, 10, 8), MATS.brass, 0.78, 1.05, -0.07, 0, leaf, false);
    } else if (d.kind === 'debris' || d.kind === 'rubble') {
      // Amas de mobilier et de planches (ou de roches) qui bouche le passage.
      const r = mulberry32(d.id * 31 + 7);
      if (d.kind === 'rubble') {
        const rock = fmat('rock', d.color || 0x9a8a78);
        for (let k = 0; k < 14; k++) { const s = 0.35 + r() * 0.5, m = mesh(new THREE.DodecahedronGeometry(s, 0), rock, (r() - 0.5) * 1.7, s * 0.6 + (k > 8 ? 0.6 + r() * 0.7 : 0), (r() - 0.5) * 0.9, r() * TAU, leaf); m.rotation.x = r() * TAU; }
        for (let k = 0; k < 3; k++) { const b = mesh(boxG(0.2, 0.2, 2.2), MATS.post, (r() - 0.5) * 1.2, 0.5 + r() * 1.3, 0, 0, leaf); b.rotation.set(r() * 0.4, Math.PI / 2 + (r() - 0.5) * 0.6, (r() - 0.5) * 0.8); }
      } else {
        const wm = fmat('boisBrut', 0xa08a70), cloth = MATS.cloth;
        mesh(boxG(1.4, 0.08, 0.8), wm, -0.2, 0.9, 0.05, 0.1, leaf).rotation.z = 0.35; // table renversée
        for (const x of [-0.8, 0.4]) { const l = mesh(boxG(0.07, 0.8, 0.07), wm, x, 0.5, 0.3, 0, leaf); l.rotation.z = 0.35; }
        mesh(boxG(0.7, 1.2, 0.5), fmat('meuble', 0x6e5a44), 0.55, 0.6, -0.1, -0.2, leaf); // armoire
        for (let k = 0; k < 6; k++) { const b = mesh(boxG(1.8 + r() * 0.4, 0.16, 0.05), wm, (r() - 0.5) * 0.4, 0.3 + r() * 1.9, (r() - 0.5) * 0.3, (r() - 0.5) * 0.3, leaf); b.rotation.z = (r() - 0.5) * 1.1; }
        mesh(boxG(0.6, 0.5, 0.6), MATS.crate, -0.6, 0.25, -0.1, 0.4, leaf); mesh(boxG(0.8, 0.12, 0.7), cloth, 0.1, 1.55, 0.1, 0.3, leaf).rotation.z = -0.2;
        const ch = mesh(boxG(0.45, 0.06, 0.45), wm, -0.55, 1.35, 0.1, 0.5, leaf); ch.rotation.x = 1.1;
      }
    } else {
      // Cadre en bois, croisillons et barbelés.
      for (const o of [-0.92, 0.92]) mesh(boxG(0.14, 2.2, 0.14), MATS.post, o, 1.1, 0, 0, leaf);
      for (let k = 0; k < 4; k++) mesh(boxG(1.95, 0.18, 0.05), MATS.planks, 0, 0.35 + k * 0.52, 0.05, rand(-0.05, 0.05), leaf).rotation.z = rand(-0.08, 0.08);
      const x1 = mesh(boxG(2.4, 0.12, 0.06), MATS.post, 0, 1.1, -0.06, 0, leaf); x1.rotation.z = 0.78;
      const x2 = mesh(boxG(2.4, 0.12, 0.06), MATS.post, 0, 1.1, -0.06, 0, leaf); x2.rotation.z = -0.78;
      const coil = new THREE.Mesh(helixGeo(1.9, 0.32, 9), MATS.wireMesh); coil.position.set(0, 0.45, 0.25); coil.rotation.z = Math.PI / 2; leaf.add(coil);
    }
    // Pancarte avec le prix.
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.45), new THREE.MeshStandardMaterial({ map: woodSign([`${d.cost}`, d.label.toUpperCase()], { w: 512, h: 256 }), roughness: 0.9 }));
    const sz = d.kind === 'debris' || d.kind === 'rubble' ? 0.55 : 0.14;
    sign.position.set(0, d.kind === 'rubble' ? 1.9 : 1.55, sz); leaf.add(sign);
    const sign2 = sign.clone(); sign2.position.z = -sz; sign2.rotation.y = Math.PI; leaf.add(sign2);
    mergeGroup(leaf);
    d.group = g; d.leaf = leaf;
    if (M.flat) doorLintel(d);
    WORLD.doors.push(d);
  }
}
// Plain-pied : maçonnerie au-dessus du passage, jusqu'au haut des murs voisins.
function doorLintel(d) {
  const px = d.axis === 'x' ? 0 : 1, pz = d.axis === 'x' ? 1 : 0; // perpendiculaire au passage
  let top = 0, spec = null;
  for (const s of [1, -1]) {
    const a = d.x + px * s, b = d.z + pz * s, t = tType(a, b);
    if (t === T_BLOCK) { const i = ti(a, b); if (blockH(i) > top) { top = blockH(i); spec = ((M.styleDefs || [])[MAP.style[i]] || {}).block; } }
    const k = edgeWall(d.x, d.z, a, b); if (k) { const K = wallDef(k); if (!K.see) { const h = Math.max(K.h || 3, MAP.roof[ti(d.x, d.z)] ? ceilH() + 0.35 : 0); if (h > top) { top = h; spec = K.out; } } }
  }
  if (top <= WALL_H) return;
  d.lintel = top;
  const x0 = d.x * TILE, z0 = d.z * TILE, y0 = WALL_H - 0.05, q = new QB(fv(spec || 'concrete'));
  for (const [nx, nz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
    if ((d.axis === 'x') !== (nx !== 0)) continue; // faces tournées vers les deux zones
    if (nx) { const X = nx > 0 ? x0 + TILE : x0; q.wall(X, z0, X, z0 + TILE, y0, top, nx, 0, false); } else { const Z = nz > 0 ? z0 + TILE : z0; q.wall(x0, Z, x0 + TILE, Z, y0, top, 0, nz, false); }
  }
  q.flat(x0, z0, x0 + TILE, z0 + TILE, y0, -1); q.flat(x0, z0, x0 + TILE, z0 + TILE, top, 1);
  q.build(true);
}
// Regroupe les pièces d'un objet mobile par matériau (moins d'appels de dessin ; l'objet reste animable).
function mergeGroup(group) {
  const by = new Map();
  for (const o of [...group.children]) { if (!o.isMesh || Array.isArray(o.material) || o.children.length) continue; const k = o.material.uuid + (o.castShadow ? 's' : 'n'); if (!by.has(k)) by.set(k, []); by.get(k).push(o); }
  for (const list of by.values()) {
    if (list.length < 2) continue;
    const geos = list.map((o) => { o.updateMatrix(); o.geometry = meterUV(o.geometry, o.material, Math.abs(o.scale.x), Math.abs(o.scale.y), Math.abs(o.scale.z), group.position.x + o.position.x, group.position.z + o.position.z); const g = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone(); for (const n of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(n)) g.deleteAttribute(n); return g.applyMatrix4(o.matrix); });
    if (!geos.every((g) => g.attributes.uv && g.attributes.normal)) continue;
    const merged = mergeGeometries(geos); if (!merged) continue;
    const m = new THREE.Mesh(merged, list[0].material); m.castShadow = list[0].castShadow; m.receiveShadow = true; group.add(m);
    for (const o of list) group.remove(o);
  }
}
function helixGeo(len, r, turns) {
  // 14 segments par tour et une section triangulaire : un fil de 9 mm n'en demande pas plus (2,3 fois moins de triangles).
  const pts = []; const N = turns * 14;
  for (let k = 0; k <= N; k++) { const t = k / N, a = t * turns * TAU; pts.push(new THREE.Vector3(Math.cos(a) * r, t * len - len / 2, Math.sin(a) * r)); }
  return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), N, 0.009, 3, false);
}

// Garde-fou : aucun obstacle ne doit boucher l'arrivée d'une barricade côté intérieur (les infectés y resteraient coincés).
function checkBarricadeExits() {
  for (const b of MAP.barricades) {
    const [ix, iz] = b.inner, x0 = ix * TILE, z0 = iz * TILE, dx = b.dir[0], dz = b.dir[1];
    // Bande de 1,4 m derrière la barricade, sur la largeur du passage.
    const bx0 = dx ? (dx < 0 ? x0 + TILE - 1.4 : x0) : x0 + 0.2, bx1 = dx ? (dx < 0 ? x0 + TILE : x0 + 1.4) : x0 + TILE - 0.2;
    const bz0 = dz ? (dz < 0 ? z0 + TILE - 1.4 : z0) : z0 + 0.2, bz1 = dz ? (dz < 0 ? z0 + TILE : z0 + 1.4) : z0 + TILE - 0.2;
    for (const p of MAP.props) if (!p.off && !p.tag && p.y1 > 0.3 && p.x0 < bx1 && p.x1 > bx0 && p.z0 < bz1 && p.z1 > bz0) console.warn(`Obstacle devant la barricade ${b.id} (${b.x}, ${b.z})`, JSON.stringify(p));
  }
}
