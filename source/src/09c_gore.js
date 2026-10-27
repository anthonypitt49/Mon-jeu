/* ═══════════════════ GORE : membres arrachés, moignons, morceaux qui volent (façon Black Ops 2) ═══════════════════
   L'hôte décide (dégâts cumulés sur un membre, mort par explosion, tir appuyé sur un membre) et prévient les invités
   (événement « zlimb »). Un membre arraché : son os est réduit à rien (le maillage se replie sur l'articulation), un
   moignon sanglant prend sa place et gicle quelques instants ; sur un corps réaliste, le vrai membre part en l'air
   (copie du modèle dont tout le reste est replié). Une jambe perdue fait ramper l'infecté. */

const GORE = { gibs: [], bits: [], capGeo: null, capMat: null, recent: [] };
// Membre : os procédural → [os qu'il emporte, rayon du moignon].
const LIMBS = {
  [BN.uArmL]: [[BN.fArmL, BN.handL], 0.055], [BN.fArmL]: [[BN.handL], 0.045], [BN.uArmR]: [[BN.fArmR, BN.handR], 0.055], [BN.fArmR]: [[BN.handR], 0.045],
  [BN.thighL]: [[BN.shinL, BN.footL], 0.08], [BN.shinL]: [[BN.footL], 0.06], [BN.thighR]: [[BN.shinR, BN.footR], 0.08], [BN.shinR]: [[BN.footR], 0.06], [BN.head]: [[BN.jaw], 0.065],
};
const LEGS = new Set([BN.thighL, BN.shinL, BN.thighR, BN.shinR]);
const ZR_NAME = Object.fromEntries(ZR_MAP);

function goreAssets() {
  if (GORE.capGeo) return;
  // Moignon : chair à vif bosselée, rouge sombre et mouillée.
  const g = new THREE.SphereGeometry(1, 12, 9), p = g.attributes.position;
  for (let i = 0; i < p.count; i++) { const k = 0.82 + 0.3 * vnoise(p.getX(i) * 3 + 5, p.getY(i) * 3 + p.getZ(i) * 2); p.setXYZ(i, p.getX(i) * k, p.getY(i) * k * 0.7, p.getZ(i) * k); }
  g.computeVertexNormals(); GORE.capGeo = g;
  // Chair photographiée (TextureCan, CC0, assombrie) : les textures existent tout de suite (même shader avant et après
  // leur chargement, pas de compilation tardive).
  const tl = new THREE.TextureLoader(), tx = (f, srgb) => { const t = tl.load('assets/gore/' + f); t.wrapS = t.wrapT = THREE.RepeatWrapping; if (srgb) t.colorSpace = THREE.SRGBColorSpace; return t; };
  GORE.capMat = new THREE.MeshStandardMaterial({ color: 0xc8a0a0, map: tx('chair_c.jpg', true), normalMap: tx('chair_n.jpg'), roughness: 0.3, metalness: 0.05, emissive: 0x100000 });
}

// Arrache le membre bi (os procédural). dir : sens du coup (le morceau part avec). Renvoie false si déjà parti.
function zSever(z, bi, dir) {
  if (!LIMBS[bi]) return false;
  z.severed ||= new Set();
  if (z.severed.has(bi)) return false;
  for (const a of z.severed) if (LIMBS[a][0].includes(bi)) return false; // déjà emporté avec un os plus haut
  goreAssets();
  const [kids, r] = LIMBS[bi]; z.severed.add(bi);
  for (const h of z.hit) if (h.bone === bi || kids.includes(h.bone)) h.off = true;
  const rb = z.real ? z.real.bones[ZR_NAME[bi]] : z.bones[bi]; if (!rb) return false;
  z.holder.updateMatrixWorld(true);
  const joint = rb.getWorldPosition(new THREE.Vector3()), d = dir ? _v3.set(dir.x, 0.4, dir.z).normalize().clone() : new THREE.Vector3(0, 1, 0);
  if (z.real && bi !== BN.head) goreGib(z, ZR_NAME[bi], d);
  rb.scale.setScalar(0.001);
  if (bi === BN.head) { z.headless = true; fleshBurst(joint, d, 10); } // (tête qui éclate : éclats de chair, comme chez BO2)
  const cap = new THREE.Mesh(GORE.capGeo, GORE.capMat); cap.position.copy(rb.position); cap.scale.setScalar(r / (z.real ? z.real.tpl.k : 1)); cap.rotation.set(rand(TAU), rand(TAU), 0);
  rb.parent.add(cap);
  (z.spurts ||= []).push({ cap, t: rand(1.2, 2.2), acc: 0 });
  fxBlood(joint, d, 1.6);
  Sfx.flesh(joint, true);
  if (LEGS.has(bi) && z.alive && !z.crawl) { z.crawl = true; z.speed = ZSPEED.crawler; if (!SPECIAL_HINTS[z.kind]) z.kind = 'crawler'; }
  return true;
}

// Sang qui gicle des moignons (appelé à chaque image de l'infecté, vivant ou à terre).
function goreTick(z, dt) {
  if (!z.spurts) return;
  for (const s of z.spurts) {
    if (s.t <= 0) continue; s.t -= dt; s.acc += dt;
    if (s.acc < 0.09) continue; s.acc = 0;
    s.cap.getWorldPosition(_v1); fxBlood(_v1, _v2.set(rand(-0.3, 0.3), 1, rand(-0.3, 0.3)), 0.22 * Math.min(1, s.t + 0.3));
  }
}

// Décision de l'hôte, coup non mortel, règles de BO2 : un bras peut partir dès qu'un coup retire au moins 10 % de la vie
// qui restait (ni le pistolet de départ ni le couteau ; une chance sur deux) ; les jambes seulement à la mort ou dans une
// explosion ; au plus 3 arrachages par demi-seconde sur toute la carte.
function goreOnHit(z, dmg, info) {
  const b = info.bone; if (b == null || !LIMBS[b] || b === BN.head || LEGS.has(b) || info.explosive || info.melee || z.brute || z.boss) return [];
  if (info.weapon === 'pistol' || dmg < (z.hp + dmg) * 0.1 || Math.random() > 0.5) return [];
  const now = performance.now(); GORE.recent = GORE.recent.filter((t) => now - t < 500);
  if (GORE.recent.length >= 3) return [];
  GORE.recent.push(now); return [b];
}
// Couvre-chef (os « hat » des modèles MakeHuman : casque Adrian, casquette, chapeau) qui saute sur un tir à la tête non
// mortel : l'os est replié et une copie du chapeau s'envole, vers le haut.
function zHat(z, dir) {
  const b = z.real?.bones.hat; if (!b || z.hatOff) return false;
  z.hatOff = true; goreGib(z, 'hat', new THREE.Vector3(dir.x * 0.6, 1.6, dir.z * 0.6), true); b.scale.setScalar(0.001);
  return true;
}
// Éclats de chair : petits morceaux qui volent, rebondissent et restent quelques secondes au sol (24 au plus, recyclés).
function fleshBurst(p, dir, n) {
  goreAssets();
  for (let i = 0; i < n; i++) {
    let c = GORE.bits.find((q) => q.life <= 0);
    if (!c) {
      if (GORE.bits.length >= 24) c = GORE.bits.reduce((a, q) => (a.life < q.life ? a : q));
      else { const m = new THREE.Mesh(GORE.capGeo, GORE.capMat); R.scene.add(m); c = { m, v: new THREE.Vector3(), w: new THREE.Vector3(), life: 0, rest: false }; GORE.bits.push(c); }
    }
    c.m.visible = true; c.m.position.copy(p); c.m.scale.set(rand(0.018, 0.04), rand(0.014, 0.03), rand(0.018, 0.036)); c.m.rotation.set(rand(TAU), rand(TAU), 0);
    c.v.set(dir.x * rand(0.5, 2.5) + rand(-1.8, 1.8), rand(1.8, 4.2), dir.z * rand(0.5, 2.5) + rand(-1.8, 1.8)); c.w.set(rand(-14, 14), rand(-14, 14), rand(-14, 14));
    c.life = rand(4, 7); c.rest = false;
  }
}
// Décision de l'hôte, coup mortel : une explosion démembre, un tir appuyé emporte le membre touché.
function goreOnKill(z, dmg, info) {
  const out = [];
  if (info.explosive) {
    const k = z.brute || z.boss ? 0.5 : 1;
    for (const [up, fore] of [[BN.uArmL, BN.fArmL], [BN.uArmR, BN.fArmR], [BN.thighL, BN.shinL], [BN.thighR, BN.shinR]]) if (Math.random() < 0.5 * k) out.push(Math.random() < 0.5 ? up : fore);
    if (!info.head && Math.random() < 0.2 * k) out.push(BN.head);
  } else if (info.bone != null && LIMBS[info.bone] && info.bone !== BN.head && !info.melee && dmg >= 45 && Math.random() < 0.65) out.push(info.bone);
  return out;
}

// Morceau qui vole : copie du modèle dans la pose du moment, dont tout est replié sauf le membre emporté.
function goreGib(z, name, dir, hat = false) {
  while (GORE.gibs.length >= 10) goreDrop(GORE.gibs[0]);
  const src = z.real, inst = zrealInstance(src.tpl);
  for (const n in inst.bones) { const a = inst.bones[n], b = src.bones[n]; a.position.copy(b.position); a.quaternion.copy(b.quaternion); a.scale.copy(b.scale); }
  const holder = new THREE.Group(); holder.add(inst.root);
  src.root.updateMatrixWorld(true); src.root.parent.matrixWorld.decompose(holder.position, holder.quaternion, holder.scale);
  R.scene.add(holder); holder.updateMatrixWorld(true);
  const b = inst.bones[name], Td = b.matrixWorld.clone(), H0 = holder.matrixWorld.clone();
  inst.bones[src.tpl.order[0]].scale.setScalar(1e-4); b.scale.multiplyScalar(1e4);
  holder.updateMatrixWorld(true);
  const H = Td.clone().multiply(b.matrixWorld.clone().invert()).multiply(H0); // le membre reste où il était
  const pivot = new THREE.Group(); pivot.position.setFromMatrixPosition(Td); R.scene.add(pivot); pivot.updateMatrixWorld(true);
  pivot.matrixWorld.clone().invert().multiply(H).decompose(holder.position, holder.quaternion, holder.scale); pivot.add(holder);
  if (!hat) { const cap = new THREE.Mesh(GORE.capGeo, GORE.capMat); cap.scale.setScalar(LIMBS[ZR_IDX[name]][1] / src.tpl.k * 0.9); b.add(cap); }
  inst.mesh.castShadow = true;
  const g = hat ? { pivot, inst, life: 10, v: new THREE.Vector3(dir.x + rand(-0.5, 0.5), rand(3, 4.2), dir.z + rand(-0.5, 0.5)), w: new THREE.Vector3(rand(-6, 6), rand(-3, 3), rand(-6, 6)), rest: false, bleed: -1e9, hat }
    : { pivot, inst, life: 8, v: new THREE.Vector3(dir.x * rand(2, 4) + rand(-1, 1), rand(2.5, 4.5), dir.z * rand(2, 4) + rand(-1, 1)), w: new THREE.Vector3(rand(-9, 9), rand(-9, 9), rand(-9, 9)), rest: false, bleed: 0 };
  GORE.gibs.push(g);
}
function goreDrop(g) { R.scene.remove(g.pivot); g.inst.mesh.skeleton.dispose(); GORE.gibs.splice(GORE.gibs.indexOf(g), 1); }
const _gq = new THREE.Quaternion(), _ge = new THREE.Euler();
function goreUpdate(dt) {
  for (const g of [...GORE.gibs]) {
    g.life -= dt; if (g.life <= 0) { goreDrop(g); continue; }
    const p = g.pivot.position;
    if (!g.rest) {
      g.v.y -= 9.8 * dt; p.addScaledVector(g.v, dt);
      g.pivot.quaternion.premultiply(_gq.setFromEuler(_ge.set(g.w.x * dt, g.w.y * dt, g.w.z * dt)));
      g.bleed += dt; if (g.bleed > 0.06) { g.bleed = 0; fxBlood(p, _v2.set(0, 0.3, 0), 0.12); }
      const floor = groundAt(p.x, p.z) + 0.05;
      if (p.y < floor) {
        p.y = floor;
        if (g.v.y < -1.5) { g.v.y *= -0.25; g.v.x *= 0.45; g.v.z *= 0.45; g.w.multiplyScalar(0.4); if (!g.hat) { Sfx.flesh(p, false); addDecal('blood', _v1.set(p.x, floor - 0.015, p.z), _v2.set(0, 1, 0), rand(0.2, 0.35), 60); } }
        else { g.rest = true; }
      }
    } else if (g.life < 1.5) p.y -= dt * 0.08; // s'enfonce avant de disparaître
  }
  for (const c of GORE.bits) {
    if (c.life <= 0) continue;
    c.life -= dt; const m = c.m, p = m.position;
    if (c.life <= 0) { m.visible = false; continue; }
    if (!c.rest) {
      c.v.y -= 9.8 * dt; p.addScaledVector(c.v, dt); m.rotation.x += c.w.x * dt; m.rotation.y += c.w.y * dt; m.rotation.z += c.w.z * dt;
      const floor = groundAt(p.x, p.z) + 0.012;
      if (p.y < floor) { p.y = floor; if (c.v.y < -1.2) { c.v.y *= -0.3; c.v.x *= 0.5; c.v.z *= 0.5; c.w.multiplyScalar(0.5); } else c.rest = true; }
    } else if (c.life < 1) m.scale.multiplyScalar(1 - dt * 1.5); // se résorbe avant de disparaître
  }
}
