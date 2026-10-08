/* ═══════════════════ INFECTÉS RÉALISTES : modèles MakeHuman, un type par époque ═══════════════════
   Corps fabriqués hors du jeu (source/tools/make_zombies.py → assets/zombies/) : géométrie et squelette de 53 os en GLB,
   une seule texture par infecté (couleur, relief, découpe des cheveux). Ils ne s'animent pas eux-mêmes : le squelette
   procédural de 09_zombies.js (pose, recul, poupée de chiffon, sphères de tir) reste le seul à bouger, invisible, et
   chaque os du modèle recopie la rotation de son os procédural (« reciblage »).
   Graphismes « bas » (téléphones), ?nozreal ou échec du chargement : les corps procéduraux restent. */

const ZREAL = { state: 'off', err: '', ms: 0, tpl: {}, list: [], brute: null, boss: null, era: '' };
// Os procédural → os du modèle (squelette « game_engine » de MakeHuman).
const ZR_MAP = [[BN.hips, 'pelvis'], [BN.spine, 'spine_01'], [BN.chest, 'spine_03'], [BN.neck, 'neck_01'], [BN.head, 'head'],
  [BN.clavL, 'clavicle_l'], [BN.uArmL, 'upperarm_l'], [BN.fArmL, 'lowerarm_l'], [BN.handL, 'hand_l'],
  [BN.clavR, 'clavicle_r'], [BN.uArmR, 'upperarm_r'], [BN.fArmR, 'lowerarm_r'], [BN.handR, 'hand_r'],
  [BN.thighL, 'thigh_l'], [BN.shinL, 'calf_l'], [BN.footL, 'foot_l'], [BN.thighR, 'thigh_r'], [BN.shinR, 'calf_r'], [BN.footR, 'foot_r']];
// Direction de repos à aligner : [os procédural, son enfant, os du modèle, son enfant] (bras et jambes : le modèle est
// en « A », bras écartés ; le squelette procédural, bras le long du corps).
const ZR_ALIGN = { upperarm_l: [BN.uArmL, BN.fArmL, 'lowerarm_l'], lowerarm_l: [BN.fArmL, BN.handL, 'hand_l'], upperarm_r: [BN.uArmR, BN.fArmR, 'lowerarm_r'], lowerarm_r: [BN.fArmR, BN.handR, 'hand_r'],
  clavicle_l: [BN.clavL, BN.uArmL, 'upperarm_l'], clavicle_r: [BN.clavR, BN.uArmR, 'upperarm_r'], thigh_l: [BN.thighL, BN.shinL, 'calf_l'], calf_l: [BN.shinL, BN.footL, 'foot_l'],
  thigh_r: [BN.thighR, BN.shinR, 'calf_r'], calf_r: [BN.shinR, BN.footR, 'foot_r'] };
const ZR_SAME = { hand_l: 'lowerarm_l', hand_r: 'lowerarm_r', foot_l: 'calf_l', foot_r: 'calf_r' }; // poignet et cheville droits

function zrealWanted() { return settings.quality >= 1 && location.protocol !== 'file:' && !/nozreal/.test(location.search); } // (page ouverte en local : pas de fetch)
async function zrealStart() {
  if (!zrealWanted() || ZREAL.state !== 'off') return;
  ZREAL.state = 'loading'; const t0 = performance.now(), base = 'assets/zombies/';
  try {
    const man = await (await fetch(base + 'manifest.json', { cache: 'force-cache' })).json();
    const era = man.eras[MAP_ID]; ZREAL.era = era;
    const ids = Object.keys(man.chars).filter((k) => man.chars[k].era === era); if (!ids.length) throw new Error('aucun infecté pour ' + era);
    const [{ GLTFLoader }, SU] = await Promise.all([import('three/addons/loaders/GLTFLoader.js'), import('three/addons/utils/SkeletonUtils.js')]);
    ZREAL.clone = SU.clone;
    const gl = new GLTFLoader(), hi = settings.quality >= 2;
    await Promise.all(ids.map(async (id) => {
      const g = await gl.loadAsync(base + id + '.glb');
      let src = null; g.scene.traverse((o) => { if (o.isSkinnedMesh) src = o.material; });
      // Le GLB range la découpe (cheveux, cils) dans la case « occlusion » : elle redevient une découpe ici.
      const map = hi ? src.map : zrealHalf(src.map);
      const mat = snowify(new THREE.MeshStandardMaterial({ map, normalMap: src.normalMap, normalScale: new THREE.Vector2(0.9, 0.9), alphaMap: src.aoMap, alphaTest: 0.5, roughness: 0.8, side: THREE.DoubleSide }), 0.12);
      ZREAL.tpl[id] = zrealTemplate(g.scene, mat, man.chars[id]);
    }));
    ZREAL.list = ids.filter((k) => !man.chars[k].brute).map((k) => ZREAL.tpl[k]);
    ZREAL.brute = ZREAL.tpl[ids.find((k) => man.chars[k].brute)] || ZREAL.list[0];
    ZREAL.boss = ZREAL.tpl[ids.find((k) => man.chars[k].boss)] || ZREAL.brute;
    ZREAL.ms = Math.round(performance.now() - t0); ZREAL.state = 'on';
    for (const z of [...ZOMBIES]) if (z.alive && !z.real) z.useReal(); // les infectés déjà levés changent de corps
  } catch (e) { ZREAL.state = 'failed'; ZREAL.err = String(e?.message || e); }
}

// Graphismes « moyen » : couleur ramenée à 1024 px (moins de mémoire vidéo).
function zrealHalf(t) {
  const im = t.image, c = document.createElement('canvas'); c.width = (im.width / 2) | 0; c.height = (im.height / 2) | 0;
  c.getContext('2d').drawImage(im, 0, 0, c.width, c.height);
  const h = new THREE.CanvasTexture(c); h.flipY = t.flipY; h.colorSpace = t.colorSpace; h.wrapS = t.wrapS; h.wrapT = t.wrapT; t.dispose(); return h;
}
// Modèle chargé → gabarit : maillage, os par nom, et pour chaque os suivi la rotation qui le cale sur l'os procédural.
function zrealTemplate(scene, mat, info) {
  // Mains en griffe : phalanges repliées vers la paume (le modèle est livré doigts tendus).
  scene.traverse((o) => { if (o.isBone && /^(index|middle|ring|pinky)_0[123]_[lr]$/.test(o.name)) o.rotateX(0.38); else if (o.isBone && /^thumb_0[23]_[lr]$/.test(o.name)) o.rotateX(0.2); });
  scene.updateMatrixWorld(true);
  let mesh = null; scene.traverse((o) => { if (o.isSkinnedMesh) mesh = o; });
  mesh.material = mat; mesh.castShadow = true; mesh.receiveShadow = true; mesh.frustumCulled = false;
  const bones = {}; for (const b of mesh.skeleton.bones) bones[b.name] = b;
  const wq = (b) => b.getWorldQuaternion(new THREE.Quaternion()), wp = (b) => b.getWorldPosition(new THREE.Vector3());
  const K = {};
  for (const [bi, name] of ZR_MAP) {
    const b = bones[name]; if (!b) continue;
    const al = ZR_ALIGN[name] || ZR_ALIGN[ZR_SAME[name]];
    let a = new THREE.Quaternion();
    if (al) { const dp = boneW(al[1]).sub(boneW(al[0])).normalize(), dm = wp(bones[al[2]]).sub(wp(bones[ZR_SAME[name] || name])).normalize(); a.setFromUnitVectors(dm, dp); }
    K[name] = a.multiply(wq(b)); // rotation du modèle quand l'os procédural est au repos
  }
  const order = []; const walk = (b) => { order.push(b.name); for (const c of b.children) if (c.isBone) walk(c); };
  walk(mesh.skeleton.bones.find((b) => !b.parent?.isBone));
  // Taille : les yeux du modèle à la hauteur de ceux du squelette procédural (1,657 m), pour que les sphères de tir
  // (tête comprise) tombent sur le corps visible.
  const k = clamp(1.657 / info.eyes[0][1], 0.85, 1.25);
  const hipsOff = wp(bones.pelvis).multiplyScalar(k).sub(boneW(BN.hips)); // bassin du modèle (à l'échelle) − bassin procédural
  // Lueur des yeux : deux petites sphères juste devant les globes (fiche du modèle), dans le repère de l'os de la tête.
  const eyeGeo = mergeGeometries(info.eyes.map((e) => new THREE.SphereGeometry(0.0085, 8, 6).translate(...bones.head.worldToLocal(new THREE.Vector3(e[0], e[1], e[2] + 0.007)).toArray())));
  return { scene, mesh, K, order, hipsOff, info, eyeGeo, k, id: mesh.name };
}

// Instance : copie du gabarit (géométrie et matériau partagés, squelette propre).
function zrealInstance(tpl) {
  const root = ZREAL.clone(tpl.scene); let mesh = null; root.traverse((o) => { if (o.isSkinnedMesh) mesh = o; });
  const bones = {}; for (const b of mesh.skeleton.bones) bones[b.name] = b;
  root.scale.setScalar(tpl.k); root.updateMatrixWorld(true);
  // Repère fixe du corps → repère de l'os racine du modèle (le bassin s'y place) ; rotation du parent de cet os.
  const top = bones[tpl.order[0]], toTop = new THREE.Matrix4(), m = new THREE.Matrix4();
  for (let o = top; o && o !== root.parent; o = o.parent) toTop.premultiply(m.copy(o.matrix)); // racine → os racine (sans le porteur)
  const topQ = new THREE.Quaternion(); for (let o = top.parent; o && o !== root.parent; o = o.parent) topQ.premultiply(o.quaternion);
  return { root, mesh, bones, tpl, wq: {}, pq: BONE_DEF.map(() => new THREE.Quaternion()), fromTop: toTop.invert(), topQ };
}

const _zq = new THREE.Quaternion(), _zv = new THREE.Vector3(), _zv2 = new THREE.Vector3();
// Reciblage, entièrement dans le repère du corps (le porteur) : chaque os suivi prend la rotation de son os procédural
// (pose, recul ou poupée de chiffon), les autres suivent leur parent. Aucune matrice monde à recalculer.
function zrealPose(z) {
  const rr = z.real; if (!rr) return;
  const { tpl, bones, wq, pq } = rr, pb = z.bones;
  for (let i = 0; i < pb.length; i++) { const p = BONE_DEF[i][3]; if (p < 0) pq[i].copy(pb[i].quaternion); else pq[i].multiplyQuaternions(pq[p], pb[i].quaternion); }
  for (let j = 0; j < tpl.order.length; j++) {
    const name = tpl.order[j], b = bones[name], parentQ = j === 0 ? rr.topQ : wq[b.parent.name];
    const k = tpl.K[name], w = wq[name] || (wq[name] = new THREE.Quaternion());
    if (k) { w.multiplyQuaternions(pq[ZR_IDX[name]], k); b.quaternion.copy(parentQ).invert().multiply(w); }
    else w.multiplyQuaternions(parentQ, b.quaternion);
  }
  // Bassin : à la place du bassin procédural (décalage de repos tourné avec lui), exprimé dans le repère de l'os racine.
  _zv.copy(tpl.hipsOff).applyQuaternion(pq[BN.hips]).add(pb[BN.hips].position);
  bones.pelvis.position.copy(_zv.applyMatrix4(rr.fromTop));
}
const ZR_IDX = Object.fromEntries(ZR_MAP.map(([bi, n]) => [n, bi]));
