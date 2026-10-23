// Animations capturées des infectés : clips de la Universal Animation Library 1 et 2 de Quaternius (CC0, versions Standard
// gratuites), reciblés hors du jeu sur le squelette procédural de 20 os (BONE_DEF de src/09_zombies.js), puis écrits dans
// src/09d_zanims.js (rotations locales quantifiées, 30 images/s). Le jeu les joue sur ce squelette ; les corps réalistes
// le recopient déjà (zrealPose), les sphères de tir, le gore et la poupée de chiffon restent inchangés.
// usage : node source/tools/make_anims.mjs <dossier contenant UAL1_Standard.glb, UAL2_Standard.glb et leurs _RM.glb> [--liste]
// Téléchargement des packs : itch.io de Quaternius (Universal Animation Library 1 et 2, version Standard), voir
// source/tools/licences/quaternius_UAL.txt.
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
const pq = BONE_DEF.map(() => new THREE.Quaternion()), tmp = new THREE.Quaternion();
for (const [key, [f, name, loop]] of Object.entries(CLIPS)) {
  const s = await source(f), clip = s.g.animations.find((c) => c.name === name); if (!clip) throw new Error('clip absent : ' + name);
  const mixer = new THREE.AnimationMixer(s.g.scene); mixer.stopAllAction(); mixer.clipAction(clip).play();
  const n = Math.max(2, Math.round(clip.duration * FPS)), q = new Int16Array(n * BONE_DEF.length * 4), p = new Int16Array(n * 3);
  const prev = BONE_DEF.map(() => null);
  for (let fr = 0; fr < n; fr++) {
    mixer.setTime(loop ? (fr / n) * clip.duration : (fr / (n - 1)) * clip.duration); s.g.scene.updateMatrixWorld(true);
    // Rotation du corps de chaque os suivi : variation depuis le repos du mannequin, puis alignement des directions.
    for (const [k, nm] of Object.entries(MAP)) { const i = BN[k]; pq[i].copy(s.fix).multiply(s.wq(s.B[nm])).multiply(s.rest[k]); if (s.A[k]) pq[i].multiply(s.A[k]); }
    pq[BN.jaw].copy(pq[BN.head]); // (mâchoire : suit la tête, le jeu l'ouvre lui-même)
    for (let i = 0; i < BONE_DEF.length; i++) {
      const par = BONE_DEF[i][3]; tmp.copy(par < 0 ? pq[i] : pq[par].clone().invert().multiply(pq[i])).normalize();
      if (prev[i] && prev[i].dot(tmp) < 0) tmp.set(-tmp.x, -tmp.y, -tmp.z, -tmp.w); // continuité du signe (interpolation)
      prev[i] = tmp.clone(); const o = (fr * BONE_DEF.length + i) * 4;
      q[o] = Math.round(tmp.x * 32767); q[o + 1] = Math.round(tmp.y * 32767); q[o + 2] = Math.round(tmp.z * 32767); q[o + 3] = Math.round(tmp.w * 32767);
    }
    // Bassin : position du mannequin ramenée à notre échelle (en mm).
    const pv = s.wp(s.B.pelvis).applyQuaternion(s.fix).sub(s.pelvis0).multiplyScalar(s.scale);
    p[fr * 3] = Math.round(pv.x * 1000); p[fr * 3 + 1] = Math.round((BONE_DEF[BN.hips][1] + pv.y) * 1000); p[fr * 3 + 2] = Math.round(pv.z * 1000);
  }
  const speed = loop && key !== 'idle' ? await groundSpeed(f, name, s.scale) : 0;
  out.clips[key] = { src: name, n, len: +clip.duration.toFixed(4), loop, speed: +speed.toFixed(3), q: Buffer.from(q.buffer).toString('base64'), p: Buffer.from(p.buffer).toString('base64') };
  console.log(key, '←', name, n, 'images', clip.duration.toFixed(2) + ' s', 'vitesse', speed.toFixed(2) + ' m/s');
}
const js = `/* ═══════════════════ ANIMATIONS CAPTURÉES DES INFECTÉS (fichier généré : ne pas modifier à la main) ═══════════════════
   Généré par source/tools/make_anims.mjs à partir de la Universal Animation Library 1 et 2 de Quaternius (CC0 1.0,
   versions Standard), reciblée sur le squelette procédural de 20 os. Rotations locales quantifiées sur 16 bits,
   position du bassin en millimètres, ${FPS} images/s. */
const ZANIM_DATA = ${JSON.stringify(out)};
`;
fs.writeFileSync(path.join(srcDir, '09d_zanims.js'), js);
console.log('écrit src/09d_zanims.js', (js.length / 1024).toFixed(0) + ' Ko');
