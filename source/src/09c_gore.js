/* ═══════════════════ GORE : membres arrachés, moignons, morceaux qui volent (façon Black Ops 2) ═══════════════════
   L'hôte décide (dégâts cumulés sur un membre, mort par explosion, tir appuyé sur un membre) et prévient les invités
   (événement « zlimb »). Un membre arraché : son os est réduit à rien (le maillage se replie sur l'articulation), un
   moignon sanglant prend sa place et gicle quelques instants ; sur un corps réaliste, le vrai membre part en l'air
   (copie du modèle dont tout le reste est replié). Une jambe perdue fait ramper l'infecté. */

const GORE = { gibs: [], capGeo: null, capMat: null };
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
  GORE.capMat = new THREE.MeshStandardMaterial({ color: 0x5a0808, roughness: 0.28, metalness: 0.05, emissive: 0x120000 });
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

// Décision de l'hôte, coup non mortel : dégâts cumulés sur un membre.
function goreOnHit(z, dmg, info) {
  const b = info.bone; if (b == null || !LIMBS[b] || b === BN.head || info.explosive || info.melee || z.brute || z.boss) return [];
  z.limbDmg ||= {}; const t = (z.limbDmg[b] = (z.limbDmg[b] || 0) + dmg);
  return t >= Math.max(60, z.maxHp * (LEGS.has(b) ? 0.5 : 0.38)) ? [b] : [];
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
function goreGib(z, name, dir) {
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
  const cap = new THREE.Mesh(GORE.capGeo, GORE.capMat); cap.scale.setScalar(LIMBS[ZR_IDX[name]][1] / src.tpl.k * 0.9); b.add(cap);
  inst.mesh.castShadow = true;
  const g = { pivot, inst, life: 8, v: new THREE.Vector3(dir.x * rand(2, 4) + rand(-1, 1), rand(2.5, 4.5), dir.z * rand(2, 4) + rand(-1, 1)), w: new THREE.Vector3(rand(-9, 9), rand(-9, 9), rand(-9, 9)), rest: false, bleed: 0 };
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
        if (g.v.y < -1.5) { g.v.y *= -0.25; g.v.x *= 0.45; g.v.z *= 0.45; g.w.multiplyScalar(0.4); Sfx.flesh(p, false); addDecal('blood', _v1.set(p.x, floor - 0.015, p.z), _v2.set(0, 1, 0), rand(0.2, 0.35), 60); }
        else { g.rest = true; }
      }
    } else if (g.life < 1.5) p.y -= dt * 0.08; // s'enfonce avant de disparaître
  }
}
