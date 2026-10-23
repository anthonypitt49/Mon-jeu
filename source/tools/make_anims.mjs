// Animations capturées des infectés : clips de la Universal Animation Library 1 et 2 de Quaternius (CC0, versions Standard
// gratuites), reciblés hors du jeu sur le squelette procédural de 20 os (BONE_DEF de src/09_zombies.js), puis écrits dans
// src/09d_zanims.js (rotations locales quantifiées, 30 images/s). Le jeu les joue sur ce squelette ; les corps réalistes
// le recopient déjà (zrealPose), les sphères de tir, le gore et la poupée de chiffon restent inchangés.
// usage : node source/tools/make_anims.mjs <dossier contenant UAL1_Standard.glb, UAL2_Standard.glb et leurs _RM.glb>
//         [dossier des BVH 100STYLE : Zombie_FW, Drunk_FW, DragLeftLeg_FW, Zombie_FR] [--liste]
// Téléchargement des packs : itch.io de Quaternius (Universal Animation Library 1 et 2, version Standard), voir
// source/tools/licences/quaternius_UAL.txt ; capture 100STYLE (CC-BY 4.0, crédit obligatoire) : tools/licences/100style.txt.
import * as THREE from '../dev/node_modules/three/build/three.module.js';
import { GLTFLoader } from '../dev/node_modules/three/examples/jsm/loaders/GLTFLoader.js';
import fs from 'fs';
import path from 'path';

const here = path.dirname(new URL(import.meta.url).pathname), srcDir = path.join(here, '..', 'src');
const dir = process.argv[2]; if (!dir) { console.error('usage : node make_anims.mjs <dossier UAL> [--liste]'); process.exit(1); }
const FPS = 30;

// Squelette procédural lu dans le jeu (une seule source de vérité).
const zsrc = fs.readFileSync(path.join(srcDir, '09_zombies.js'), 'utf8');
const BONE_DEF = eval(zsrc.match(/const BONE_DEF = (\[[\s\S]*?\n\]);/)[1]);
const BN = eval('(' + zsrc.match(/const BN = (\{[^}]*\})/)[1] + ')');

const load = (f) => { const b = fs.readFileSync(path.join(dir, f)); return new Promise((ok, ko) => new GLTFLoader().parse(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength), '', ok, ko)); };
const skinned = (root) => { let m = null; root.traverse((o) => { if (o.isSkinnedMesh && !m) m = o; }); return m; };

// Os procédural → os du mannequin UAL (noms du mannequin Unreal) ; enfant qui donne la direction de l'os (membres).
const MAP = { hips: 'pelvis', spine: 'spine_01', chest: 'spine_03', neck: 'neck_01', head: 'Head', clavL: 'clavicle_l', uArmL: 'upperarm_l', fArmL: 'lowerarm_l', handL: 'hand_l',
  clavR: 'clavicle_r', uArmR: 'upperarm_r', fArmR: 'lowerarm_r', handR: 'hand_r', thighL: 'thigh_l', shinL: 'calf_l', footL: 'foot_l', thighR: 'thigh_r', shinR: 'calf_r', footR: 'foot_r' };
const ALIGN = { clavL: 'uArmL', uArmL: 'fArmL', fArmL: 'handL', clavR: 'uArmR', uArmR: 'fArmR', fArmR: 'handR', thighL: 'shinL', shinL: 'footL', thighR: 'shinR', shinR: 'footR' };
const SAME = { handL: 'fArmL', handR: 'fArmR', footL: 'shinL', footR: 'shinR' }; // poignet et cheville : alignement de l'os parent

// Clips retenus : nom dans le jeu → [fichier, clip, boucle].
const CLIPS = {
  walk: ['UAL2_Standard.glb', 'Zombie_Walk_Fwd_Loop', true],
  idle: ['UAL2_Standard.glb', 'Zombie_Idle_Loop', true],
  scratch: ['UAL2_Standard.glb', 'Zombie_Scratch', false],
  jog: ['UAL1_Standard.glb', 'Jog_Fwd_Loop', true],
  sprint: ['UAL1_Standard.glb', 'Sprint_Loop', true],
};

const pdir = (i, j) => new THREE.Vector3(BONE_DEF[j][0] - BONE_DEF[i][0], BONE_DEF[j][1] - BONE_DEF[i][1], BONE_DEF[j][2] - BONE_DEF[i][2]).normalize();
const files = {};
async function source(f) {
  if (files[f]) return files[f];
  const g = await load(f), mesh = skinned(g.scene), B = Object.fromEntries(mesh.skeleton.bones.map((b) => [b.name, b]));
  g.scene.updateMatrixWorld(true);
  const wp = (b) => b.getWorldPosition(new THREE.Vector3()), wq = (b) => b.getWorldQuaternion(new THREE.Quaternion());
  // Le jeu regarde vers +Z, sa gauche est +X : demi-tour si le mannequin regarde de l'autre côté.
  const fix = new THREE.Quaternion(); if (wp(B.upperarm_l).x < 0) fix.setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI);
  const rest = {}, A = {};
  for (const [k, n] of Object.entries(MAP)) rest[k] = fix.clone().multiply(wq(B[n])).invert(); // inverse de la rotation de repos
  for (const [k, c] of Object.entries(ALIGN)) { const d = wp(B[MAP[c]]).sub(wp(B[MAP[k]])).applyQuaternion(fix).normalize(); A[k] = new THREE.Quaternion().setFromUnitVectors(pdir(BN[k], BN[c]), d); }
  for (const [k, p] of Object.entries(SAME)) A[k] = A[p];
  const pelvis0 = wp(B.pelvis).applyQuaternion(fix), scale = BONE_DEF[BN.hips][1] / pelvis0.y;
  return (files[f] = { g, B, fix, rest, A, pelvis0, scale, wp, wq });
}

if (process.argv.includes('--liste')) {
  for (const f of ['UAL1_Standard.glb', 'UAL2_Standard.glb']) { const s = await source(f); console.log(f, 'os', Object.keys(s.B).length, '| bassin', s.pelvis0.toArray().map((v) => v.toFixed(3)).join(' '), '| demi-tour', s.fix.y !== 0); for (const c of s.g.animations) console.log('  ', c.name, c.duration.toFixed(2) + ' s'); }
  process.exit(0);
}

// Vitesse au sol d'un clip de marche ou de course : déplacement de l'os racine dans la version _RM, ramené à notre échelle.
async function groundSpeed(f, name, scale) {
  const g = await load(f.replace('.glb', '_RM.glb')), clip = g.animations.find((c) => c.name === name); if (!clip) return 0;
  const mixer = new THREE.AnimationMixer(g.scene); mixer.clipAction(clip).play();
  const root = skinned(g.scene).skeleton.bones.find((b) => b.name === 'root') || skinned(g.scene).skeleton.bones[0];
  const at = (t) => { mixer.setTime(t); g.scene.updateMatrixWorld(true); return root.getWorldPosition(new THREE.Vector3()); };
  const a = at(0), b = at(clip.duration - 1e-4); return Math.hypot(b.x - a.x, b.z - a.z) / clip.duration * scale;
}

const out = { fps: FPS, bones: BONE_DEF.length, clips: {} };
const pq = BONE_DEF.map(() => new THREE.Quaternion()), tmp = new THREE.Quaternion(), hipsP = new THREE.Vector3();
// Écrit un clip : sample(fr) remplit pq (rotation du corps de chaque os) et hipsP (bassin, en mètres, à notre échelle).
// Boucle : l'image n (= retour au début) est aussi calculée, et l'écart entre elle et l'image 0 est réparti sur tout le
// cycle (correction croissante de 0 à 1) : plus d'à-coup à la couture, même quand la prise ne retombe pas pile.
function bake(key, n, sample, meta) {
  const NBo = BONE_DEF.length, last = meta.loop ? n : n - 1, L = [], P = [], prev = BONE_DEF.map(() => null);
  for (let fr = 0; fr <= last; fr++) {
    sample(fr); pq[BN.jaw].copy(pq[BN.head]); // (mâchoire : suit la tête, le jeu l'ouvre lui-même)
    L.push(BONE_DEF.map((d, i) => {
      const par = d[3], l = (par < 0 ? pq[i].clone() : pq[par].clone().invert().multiply(pq[i])).normalize();
      if (prev[i] && prev[i].dot(l) < 0) l.set(-l.x, -l.y, -l.z, -l.w); // continuité du signe (interpolation)
      return (prev[i] = l);
    }));
    P.push(hipsP.clone());
  }
  if (meta.loop) for (let fr = 1; fr < n; fr++) {
    const u = fr / n;
    for (let i = 0; i < NBo; i++) { const d = L[n][i].clone().invert().multiply(L[0][i]); L[fr][i].multiply(new THREE.Quaternion().slerp(d, u)).normalize(); }
    P[fr].addScaledVector(P[0].clone().sub(P[n]), u);
  }
  // Vitesse au sol mesurée sur nos pieds (la longueur de jambe change au reciblage) : avance du pied d'appui, médiane.
  const foot = (fr, fi) => { const m = new THREE.Matrix4(), M = [], v = new THREE.Vector3();
    for (let i = 0; i <= fi; i++) { const d = BONE_DEF[i], par = d[3]; v.set(...(par < 0 ? P[fr].toArray() : [d[0] - BONE_DEF[par][0], d[1] - BONE_DEF[par][1], d[2] - BONE_DEF[par][2]]));
      M[i] = par < 0 ? m.clone().compose(v, L[fr][i], new THREE.Vector3(1, 1, 1)) : M[par].clone().multiply(m.compose(v, L[fr][i], new THREE.Vector3(1, 1, 1))); }
    return new THREE.Vector3().setFromMatrixPosition(M[fi]); };
  if (meta.speed) {
    const F = [BN.footL, BN.footR].map((fi) => L.slice(0, n).map((_, fr) => foot(fr, fi))), low = Math.min(...F.flat().map((v) => v.y)), vs = [];
    for (const A of F) for (let fr = 0; fr < n; fr++) { const a = A[fr], b = A[(fr + 1) % n]; if (a.y < low + 0.015 && b.y < low + 0.015) vs.push((a.z - b.z) * FPS); }
    vs.sort((a, b) => a - b); const vf = vs.length >= 6 ? vs[vs.length >> 1] : 0;
    console.log('   vitesse des pieds', vf.toFixed(3), 'm/s (' + vs.length + ' mesures) ; annoncée', meta.speed);
    if (vf > meta.speed * 0.6 && vf < meta.speed * 1.4) meta.speed = +vf.toFixed(3);
  }
  const q = new Int16Array(n * NBo * 4), p = new Int16Array(n * 3);
  for (let fr = 0; fr < n; fr++) {
    for (let i = 0; i < NBo; i++) { const t = L[fr][i], o = (fr * NBo + i) * 4; q[o] = Math.round(t.x * 32767); q[o + 1] = Math.round(t.y * 32767); q[o + 2] = Math.round(t.z * 32767); q[o + 3] = Math.round(t.w * 32767); }
    p[fr * 3] = Math.round(P[fr].x * 1000); p[fr * 3 + 1] = Math.round(P[fr].y * 1000); p[fr * 3 + 2] = Math.round(P[fr].z * 1000);
  }
  out.clips[key] = { ...meta, n, q: Buffer.from(q.buffer).toString('base64'), p: Buffer.from(p.buffer).toString('base64') };
  console.log(key, '←', meta.src, n, 'images', meta.len.toFixed(2) + ' s', 'vitesse', meta.speed.toFixed(2) + ' m/s');
}

for (const [key, [f, name, loop]] of Object.entries(CLIPS)) {
  const s = await source(f), clip = s.g.animations.find((c) => c.name === name); if (!clip) throw new Error('clip absent : ' + name);
  const mixer = new THREE.AnimationMixer(s.g.scene); mixer.stopAllAction(); mixer.clipAction(clip).play();
  const n = Math.max(2, Math.round(clip.duration * FPS));
  const speed = loop && key !== 'idle' ? await groundSpeed(f, name, s.scale) : 0;
  bake(key, n, (fr) => {
    mixer.setTime(loop ? Math.min((fr / n) * clip.duration, clip.duration - 1e-4) : (fr / (n - 1)) * clip.duration); s.g.scene.updateMatrixWorld(true);
    // Rotation du corps de chaque os suivi : variation depuis le repos du mannequin, puis alignement des directions.
    for (const [k, nm] of Object.entries(MAP)) { const i = BN[k]; pq[i].copy(s.fix).multiply(s.wq(s.B[nm])).multiply(s.rest[k]); if (s.A[k]) pq[i].multiply(s.A[k]); }
    hipsP.copy(s.wp(s.B.pelvis).applyQuaternion(s.fix).sub(s.pelvis0).multiplyScalar(s.scale)); hipsP.y += BONE_DEF[BN.hips][1];
  }, { src: name, len: +clip.duration.toFixed(4), loop, speed: +speed.toFixed(3) });
}

/* ─── Capture de mouvement 100STYLE (Mason, Starke, Komura 2022, CC-BY 4.0) : longues prises à 60 images/s ───
   Dans chaque prise, on cherche un cycle de marche (deux pas) en ligne droite dont la fin retombe sur le début, on retire
   l'avance et le cap de l'acteur (le clip marche sur place, vers +Z), puis on recible comme pour Quaternius. */
const bvhDir = process.argv[3] && !process.argv[3].startsWith('--') ? process.argv[3] : null;
const BVH = { zwalk: 'Zombie_FW.bvh', drunk: 'Drunk_FW.bvh', drag: 'DragLeftLeg_FW.bvh', zrun: 'Zombie_FR.bvh' };
const BMAP = { hips: 'Hips', spine: 'Chest', chest: 'Chest4', neck: 'Neck', head: 'Head', clavL: 'LeftCollar', uArmL: 'LeftShoulder', fArmL: 'LeftElbow', handL: 'LeftWrist',
  clavR: 'RightCollar', uArmR: 'RightShoulder', fArmR: 'RightElbow', handR: 'RightWrist', thighL: 'LeftHip', shinL: 'LeftKnee', footL: 'LeftAnkle', thighR: 'RightHip', shinR: 'RightKnee', footR: 'RightAnkle' };
if (bvhDir) {
  const { BVHLoader } = await import('../dev/node_modules/three/examples/jsm/loaders/BVHLoader.js');
  for (const [key, file] of Object.entries(BVH)) {
    const res = new BVHLoader().parse(fs.readFileSync(path.join(bvhDir, file), 'utf8')), root = new THREE.Group(); root.add(res.skeleton.bones[0]); root.updateMatrixWorld(true);
    const B = Object.fromEntries(res.skeleton.bones.map((b) => [b.name, b])), wp = (b) => b.getWorldPosition(new THREE.Vector3()), wq = (b) => b.getWorldQuaternion(new THREE.Quaternion());
    // Repos (rotations nulles) : inverses des rotations, alignement des directions, longueur de jambe → échelle.
    const rest = {}, A = {};
    for (const [k, nm] of Object.entries(BMAP)) rest[k] = wq(B[nm]).invert();
    for (const [k, c] of Object.entries(ALIGN)) { const d = wp(B[BMAP[c]]).sub(wp(B[BMAP[k]])).normalize(); A[k] = new THREE.Quaternion().setFromUnitVectors(pdir(BN[k], BN[c]), d); }
    for (const [k, p] of Object.entries(SAME)) A[k] = A[p];
    const leg = wp(B.LeftHip).distanceTo(wp(B.LeftKnee)) + wp(B.LeftKnee).distanceTo(wp(B.LeftAnkle)), ours = (BONE_DEF[BN.thighL][1] - BONE_DEF[BN.shinL][1]) + (BONE_DEF[BN.shinL][1] - BONE_DEF[BN.footL][1]), scale = ours / leg;
    const mixer = new THREE.AnimationMixer(root); mixer.clipAction(res.clip).play();
    const N = Math.round(res.clip.duration * 60), at = (t) => { mixer.setTime(t); root.updateMatrixWorld(true); };
    // Toute la prise : bassin et chevilles (repère du bassin, sans cap) pour trouver le cycle.
    const H = [], F = [];
    for (let f = 0; f < N; f++) { at(f / 60); const h = wp(B.Hips); H.push(h); const yaw = new THREE.Euler().setFromQuaternion(wq(B.Hips), 'YXZ').y, inv = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), -yaw); F.push([...wp(B.LeftAnkle).sub(h).applyQuaternion(inv).toArray(), ...wp(B.RightAnkle).sub(h).applyQuaternion(inv).toArray()]); }
    const vel = (f, w = 15) => { const a = H[Math.max(0, f - w)], b = H[Math.min(N - 1, f + w)], dt = (Math.min(N - 1, f + w) - Math.max(0, f - w)) / 60; return [(b.x - a.x) / dt, (b.z - a.z) / dt]; };
    const sp = H.map((_, f) => Math.hypot(...vel(f))), med = [...sp].sort((a, b) => a - b)[N >> 1];
    let best = null;
    for (let f0 = 60; f0 < N - 300; f0 += 6) for (let T = 40; T <= 150; T += 2) {
      if (f0 + 2 * T >= N) break;
      let ok = true; for (let k = 0; k <= T && ok; k += 10) if (sp[f0 + k] < med * 0.75) ok = false; if (!ok) continue;
      const v0 = vel(f0), v1 = vel(f0 + T), turn = Math.abs(Math.atan2(Math.sin(Math.atan2(v1[0], v1[1]) - Math.atan2(v0[0], v0[1])), Math.cos(Math.atan2(v1[0], v1[1]) - Math.atan2(v0[0], v0[1]))));
      if (turn > 0.12) continue;
      let e = 0; for (let k = 0; k < T; k += 3) { const a = F[f0 + k], b = F[f0 + k + T]; for (let j = 0; j < 6; j++) e += (a[j] - b[j]) ** 2; }
      e /= T / 3; if (!best || e < best.e) best = { e, f0, T };
    }
    const { f0, T } = best, len = T / 60, n = Math.round(len * FPS), d = H[f0 + T].clone().sub(H[f0]), head = Math.atan2(d.x, d.z);
    const fix = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), -head), speed = Math.hypot(d.x, d.z) / len * scale;
    let fwdSign = 0;
    bake(key, n, (fr) => {
      const t = (f0 + (fr / n) * T) / 60; at(t);
      for (const [k, nm] of Object.entries(BMAP)) { const i = BN[k]; pq[i].copy(fix).multiply(wq(B[nm])).multiply(rest[k]); if (A[k]) pq[i].multiply(A[k]); }
      // Bassin : sans l'avance régulière (sur place), à notre échelle ; hauteur absolue (sol de la prise à 0).
      const h = wp(B.Hips).sub(H[f0]).applyQuaternion(fix); h.z -= (fr / n) * Math.hypot(d.x, d.z);
      hipsP.set(h.x * scale, wp(B.Hips).y * scale, h.z * scale);
      fwdSign += new THREE.Vector3(0, 0, 1).applyQuaternion(pq[BN.hips]).z;
    }, { src: '100STYLE ' + file.replace('.bvh', ''), len: +len.toFixed(4), loop: true, speed: +speed.toFixed(3) });
    if (fwdSign < 0) console.log('  attention :', key, 'le bassin regarde vers −Z');
    console.log('  cycle', f0, '+', T, 'images (60/s), écart de bouclage', best.e.toFixed(1), '| échelle', scale.toFixed(4));
  }
}

const js = `/* ═══════════════════ ANIMATIONS CAPTURÉES DES INFECTÉS (fichier généré : ne pas modifier à la main) ═══════════════════
   Généré par source/tools/make_anims.mjs : Universal Animation Library 1 et 2 de Quaternius (CC0 1.0, versions Standard)
   et capture de mouvement 100STYLE (Ian Mason, Sebastian Starke, Taku Komura, 2022, CC-BY 4.0 : styles Zombie, Drunk,
   DragLeftLeg), reciblées sur le squelette procédural de 20 os. Rotations locales quantifiées sur 16 bits, position du
   bassin en millimètres, ${FPS} images/s. */
const ZANIM_DATA = ${JSON.stringify(out)};
`;
fs.writeFileSync(path.join(srcDir, '09d_zanims.js'), js);
console.log('écrit src/09d_zanims.js', (js.length / 1024).toFixed(0) + ' Ko');
