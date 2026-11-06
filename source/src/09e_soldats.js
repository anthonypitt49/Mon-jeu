/* ═══════════════════ SOLDATS : les personnages joués (modèles importés, assets/soldats/) ═══════════════════
   En coopération, chaque coéquipier prend le corps d'un soldat moderne (source/tools/import_modeles.py, même squelette
   que les infectés réalistes) : le squelette procédural de makeRig reste celui qu'on pose, caché, et le modèle le recopie
   (zrealPose, comme les infectés). Téléchargés à l'arrivée du premier coéquipier : rien à charger en solo.
   Chaque joueur a son soldat (rang dans la liste de l'hôte, rec.soldier) ; les couleurs de ses manches et de ses gants
   habillent les bras vus en vue subjective. */
const SOLDATS = [ // [modèle, manches, gants] (couleurs dominantes de sa tenue ; le premier est celui du joueur seul)
  ['s_s1', 0x4f5a3a, 0x2c2a27], ['s_mark', 0x4b4c3c, 0x34302b], ['s_a1', 0xa08b64, 0x5e5040], ['s_russe', 0x5c6a48, 0x2c2a27]];
const SREAL = { state: 'off', err: '', tpl: {} };
const SR_HIDE = new THREE.MeshBasicMaterial({ visible: false }); // corps procédural caché ; ses os restent (l'arme y est fixée)

async function srealStart() {
  if (!zrealWanted() || SREAL.state !== 'off') return;
  SREAL.state = 'loading'; const base = 'assets/soldats/';
  try {
    const man = await (await fetch(base + 'manifest.json', { cache: 'force-cache' })).json();
    const [{ GLTFLoader }, SU] = await Promise.all([import('three/addons/loaders/GLTFLoader.js'), import('three/addons/utils/SkeletonUtils.js')]);
    ZREAL.clone ||= SU.clone;
    const gl = new GLTFLoader();
    await Promise.all(Object.keys(man.chars).map(async (id) => { const g = await zrealLoad(gl, base, id); SREAL.tpl[id] = zrealTemplate(g.scene, zrealMaterial(g.scene, 0), man.chars[id]); soldierGrip(SREAL.tpl[id]); }));
    // Shaders et textures préparés hors de l'écran avant la première apparition (pas de saccade quand un soldat surgit).
    const g = new THREE.Group(), inst = Object.values(SREAL.tpl).map((t) => zrealInstance(t)); for (const i of inst) g.add(i.root);
    g.position.set(0, -500, 0); R.scene.add(g);
    for (const t of Object.values(SREAL.tpl)) for (const k of ['map', 'normalMap', 'alphaMap']) if (t.mesh.material[k]) R.renderer.initTexture(t.mesh.material[k]);
    await R.renderer.compileAsync(g, R.camera, R.scene).catch(() => {}); R.scene.remove(g); for (const i of inst) i.mesh.skeleton.dispose();
    SREAL.state = 'on';
  } catch (e) { SREAL.state = 'failed'; SREAL.err = String(e?.message || e); }
}
// Doigts refermés sur l'arme : os de doigts de Character Creator (CC_Base_…) ou de Mixamo (mixamorig:…) ; les soldats
// MakeHuman n'en ont pas. Axe de flexion calculé sur la main au repos (ligne des jointures, côté de la paume donné par le
// pouce) : il ne dépend pas de l'orientation propre à chaque logiciel.
function soldierGrip(tpl) {
  const B = {}; tpl.scene.traverse((o) => { if (o.isBone) B[o.name] = o; }); tpl.scene.updateMatrixWorld(true);
  const W = (b) => b.getWorldPosition(new THREE.Vector3());
  for (const [side, S] of [['L', 'Left'], ['R', 'Right']]) {
    const nm = (f, k) => B[`CC_Base_${side}_${f === 'Middle' ? 'Mid' : f}${k}`] || B[`mixamorig:${S}Hand${f}${k}`];
    const i1 = nm('Index', 1), p1 = nm('Pinky', 1) || nm('Ring', 1), m1 = nm('Middle', 1), m2 = nm('Middle', 2), t1 = nm('Thumb', 1);
    if (!i1 || !p1 || !m1 || !m2) continue;
    const kn = W(i1).sub(W(p1)).normalize(), fd = W(m2).sub(W(m1)).normalize(), pn = new THREE.Vector3().crossVectors(fd, kn).normalize();
    if (t1 && pn.dot(W(t1).sub(W(i1).add(W(p1)).multiplyScalar(0.5))) < 0) pn.negate();
    const axis = new THREE.Vector3().crossVectors(fd, pn).normalize(); // tourner les doigts vers la paume
    const todo = [];
    for (const f of ['Index', 'Middle', 'Ring', 'Pinky', 'Thumb']) for (let k = 1; k <= 3; k++) {
      const b = nm(f, k); if (!b) continue;
      // (index droit sur la détente : moins replié ; pouce : un peu)
      const a = f === 'Thumb' ? 0.3 : f === 'Index' && side === 'R' ? [0.45, 0.5, 0.3][k - 1] : [0.95, 1.0, 0.75][k - 1];
      todo.push([b, axis.clone().applyQuaternion(b.getWorldQuaternion(new THREE.Quaternion()).invert()), a]);
    }
    for (const [b, al, a] of todo) b.quaternion.multiply(new THREE.Quaternion().setFromAxisAngle(al, a));
  }
  tpl.scene.updateMatrixWorld(true);
}
function soldierTpl(i) { const s = SOLDATS[(i | 0) % SOLDATS.length]; return SREAL.tpl[s[0]] || Object.values(SREAL.tpl)[(i | 0) % Object.keys(SREAL.tpl).length]; }
// Bras en vue subjective aux couleurs du soldat du joueur (manches et gants : matières partagées par toutes les armes).
function soldierArms(i) {
  const s = SOLDATS[(i | 0) % SOLDATS.length]; if (!GM.sleeve) return;
  GM.sleeve.color.setHex(s[1]); GM.glove.color.setHex(s[2]); for (const [m, src] of VM.arms) m.color.copy(src.color); // (armes en main déjà construites : copies)
}

/* ─── Arme d'un coéquipier : crosse à l'épaule, bras tendus jusqu'aux prises ───
   L'arme a son propre repère dans le porteur (holder) : crosse au creux de l'épaule droite (point suivi sur l'os du torse,
   qui respire et balance avec le pas), canon dans la direction du regard quand le soldat vise ou tire, incliné vers le sol
   en marche (« prêt bas »), plus bas encore à la course. Pistolet : bras tendus, arme devant la poitrine. Les mains vont
   aux poignets relevés sur le modèle de l'arme (ceux de la vue subjective, 08b_gunmodels.js) par cinématique inverse : sur
   le squelette procédural, puis corrigée sur le squelette du modèle, dont les bras n'ont pas tout à fait la même longueur. */
const SH_POCKET = new THREE.Vector3(-0.135, 0.105, 0.125); // creux de l'épaule droite (repère de l'os du torse)
const SH_PISTOL = new THREE.Vector3(-0.035, 0.07, 0.43); // pistolet : poignée devant la poitrine
const _sh = { f: new THREE.Vector3(), u: new THREE.Vector3(), r: new THREE.Vector3(), p: new THREE.Vector3(), m: new THREE.Matrix4(), wr: new THREE.Vector3(), wl: new THREE.Vector3(), t: new THREE.Vector3(), pole: new THREE.Vector3() };
const _ik2 = { A: new THREE.Vector3(), B: new THREE.Vector3(), C: new THREE.Vector3(), D: new THREE.Vector3(), E: new THREE.Vector3(), P: new THREE.Vector3(), o: new THREE.Vector3(), d: new THREE.Vector3(), e: new THREE.Vector3(), q: new THREE.Quaternion(), q2: new THREE.Quaternion() };

// Mesures d'une arme pour la tenir : bout de la crosse (le plus loin derrière la poignée) et sa hauteur, poignets des deux mains.
function soldierGunInfo(parts) {
  const root = parts.root; root.updateMatrixWorld(true);
  const v = new THREE.Vector3(), pts = [];
  root.traverse((o) => { if (!o.isMesh) return; const pos = o.geometry.attributes.position, st = Math.max(1, (pos.count / 4000) | 0); for (let i = 0; i < pos.count; i += st) pts.push(v.fromBufferAttribute(pos, i).applyMatrix4(o.matrixWorld).toArray()); });
  let zMax = -1; for (const p of pts) zMax = Math.max(zMax, p[2]);
  let ys = 0, n = 0; for (const p of pts) if (p[2] > zMax - 0.045) { ys += p[1]; n++; }
  const holds = parts.holds || [], g = holds.find((h) => h.k === 'grip') || holds[0], f = holds.find((h) => h !== g);
  const wrist = (h, def) => (h ? h.w.clone().applyMatrix4(h.p && h.p !== root ? h.p.matrixWorld : new THREE.Matrix4()) : def);
  // (main gauche en coupe sous la droite, pistolet à deux mains : son poignet vient de la gauche, un peu plus bas)
  if (f && f.k === 'cup') { const w = wrist(f); w.x -= 0.055; w.y -= 0.012; w.z -= 0.01; f.w = w; f.p = root; }
  const pistol = zMax < 0.1;
  return { pistol, butt: zMax - 0.012, buttY: n ? ys / n : 0, wristR: wrist(g, new THREE.Vector3(0.012, -0.08, 0.04)), wristL: wrist(f, new THREE.Vector3(-0.02, -0.06, -0.25)) };
}
// Tourne un os (repère monde) pour que la direction os → from devienne os → to.
function boneAim(bone, from, to) {
  const { o, d, e, q, q2 } = _ik2;
  bone.getWorldPosition(o); d.subVectors(from, o).normalize(); e.subVectors(to, o).normalize();
  q.setFromUnitVectors(d, e); bone.getWorldQuaternion(q2); q2.premultiply(q);
  bone.parent.getWorldQuaternion(q).invert(); bone.quaternion.copy(q.multiply(q2)); bone.updateMatrixWorld(true);
}
// Bras à deux os, repère monde : le poignet (os main) va en T, coude du côté du pôle.
function ik2(up, lo, hand, T, pole) {
  const { A, B, C, D, E, P } = _ik2;
  up.getWorldPosition(A); lo.getWorldPosition(B); hand.getWorldPosition(C);
  const L1 = A.distanceTo(B), L2 = B.distanceTo(C);
  D.subVectors(T, A); const dist = clamp(D.length(), Math.abs(L1 - L2) + 0.01, L1 + L2 - 0.005); D.normalize();
  const a = (L1 * L1 - L2 * L2 + dist * dist) / (2 * dist), h = Math.sqrt(Math.max(0, L1 * L1 - a * a));
  P.copy(pole).addScaledVector(D, -pole.dot(D)).normalize();
  E.copy(A).addScaledVector(D, a).addScaledVector(P, h);
  boneAim(up, B, E);
  hand.getWorldPosition(C); P.copy(A).addScaledVector(D, dist);
  boneAim(lo, C, P);
}
// Pose de l'arme et des bras (après poseBody, avant zrealPose) ; rend les poignets visés (monde) pour soldierRealIK.
function soldierHold(av, dt, aim) {
  const gun = av.gun, gi = av.gunInfo; if (!gun || !gi) return false;
  const fl = av.rec.flags | 0, b = av.bones, S = _sh;
  av.fireT = Math.max(0, (av.fireT || 0) - dt); av.kick = Math.max(0, (av.kick || 0) - dt * 9);
  // Visée ou tir récent : prêt à tirer ; course : canon bas ; sinon « prêt bas ».
  av.ready = damp(av.ready ?? 1, (fl & 4) || av.fireT > 0 ? 1 : (fl & 2) ? -0.7 : 0, 7, dt);
  const rd = clamp(av.ready, 0, 1), run = clamp(-av.ready / 0.7, 0, 1), t = av.t;
  const pitch = lerp(-0.42, clamp(aim, -1.1, 1.1), rd) - run * 0.3 + Math.sin(t * 1.7) * 0.012 + av.kick * 0.09 - ((fl & 32) ? 0.35 : 0);
  const yawo = lerp(0.3, 0.035, rd) + run * 0.12 + Math.sin(t * 1.1) * 0.01;
  av.holder.updateMatrixWorld(true);
  S.p.copy(gi.pistol ? SH_PISTOL : SH_POCKET).applyMatrix4(b[BN.chest].matrixWorld); av.holder.worldToLocal(S.p);
  S.f.set(Math.sin(yawo) * Math.cos(pitch), Math.sin(pitch), Math.cos(yawo) * Math.cos(pitch));
  S.r.crossVectors(S.f, S.u.set(0, 1, 0)).normalize(); S.u.crossVectors(S.r, S.f);
  if (fl & 32) S.r.applyAxisAngle(S.f, -0.5), S.u.applyAxisAngle(S.f, -0.5); // rechargement : arme couchée sur le flanc
  gun.quaternion.setFromRotationMatrix(S.m.makeBasis(S.r, S.u, S.t.copy(S.f).negate()));
  if (gi.pistol) gun.position.copy(S.p);
  else gun.position.copy(S.p).addScaledVector(S.f, gi.butt - av.kick * 0.035).addScaledVector(S.u, -gi.buttY);
  gun.updateMatrixWorld(true);
  S.wr.copy(gi.wristR).applyMatrix4(gun.matrixWorld); S.wl.copy(gi.wristL).applyMatrix4(gun.matrixWorld);
  // Squelette procédural (corps de repli, et point de départ du modèle) : cibles dans le repère du torse.
  const ch = b[BN.chest]; armIK(b, BN.clavR, ch.worldToLocal(S.t.copy(S.wr)), -1); armIK(b, BN.clavL, ch.worldToLocal(S.t.copy(S.wl)), 1);
  b[BN.handR].rotation.set(0.15, 0, 0); b[BN.handL].rotation.set(0.2, 0, 0);
  return true;
}
// Correction sur le squelette du modèle (après zrealPose) : poignets exactement aux prises, coudes vers le bas et l'extérieur.
function soldierRealIK(av) {
  const rr = av.real, B = rr && rr.bones; if (!B || !B.upperarm_r || !B.upperarm_l) return;
  rr.root.updateMatrixWorld(true); const hq = av.holder.quaternion;
  ik2(B.upperarm_r, B.lowerarm_r, B.hand_r, _sh.wr, _sh.pole.set(-0.75, -1, -0.35).applyQuaternion(hq));
  ik2(B.upperarm_l, B.lowerarm_l, B.hand_l, _sh.wl, _sh.pole.set(0.65, -1, -0.1).applyQuaternion(hq));
}

// Buée de la respiration par grand froid (cartes enneigées) : une bouffée toutes les 3 s environ, plus vite à la course.
// (Les infectés, eux, ne respirent pas.)
function soldierBreath(av, dt) {
  if (M.env.precip !== 'snow' || !av.holder.visible) return;
  av.breathT = (av.breathT ?? Math.random() * 3) - dt * ((av.rec.flags & 2) ? 1.8 : 1); if (av.breathT > 0) return;
  av.breathT = rand(2.6, 3.6);
  const h = av.bones[BN.head], p = _sh.t.set(0, 0.02, 0.13).applyMatrix4(h.matrixWorld), d = _sh.f.set(0, 0, 1).transformDirection(h.matrixWorld);
  for (let i = 0; i < 4; i++) FX.soft.spawn(p.x + rand(-0.02, 0.02), p.y + rand(-0.02, 0.02), p.z + rand(-0.02, 0.02), d.x * rand(0.25, 0.5) + rand(-0.05, 0.05), d.y * 0.3 + rand(0.02, 0.1), d.z * rand(0.25, 0.5) + rand(-0.05, 0.05), rand(1.1, 1.8), 0.05, 0.86, 0.9, 0.95, 0.17, -0.04, 1.2, 0.28);
}
