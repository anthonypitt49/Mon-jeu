import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

/* Snowfall Protocol — tout le jeu tient dans ce fichier.
   Organisation : noyau → textures → audio → carte → monde → effets → armes → zombies
   → joueur → règles de partie → réseau co-op → interface → boucle principale. */

const $ = (id) => document.getElementById(id);
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = (t) => t * t * (3 - 2 * t);
const damp = (a, b, k, dt) => lerp(a, b, 1 - Math.exp(-k * dt));
const TAU = Math.PI * 2;
const angDiff = (a, b) => { let d = (b - a) % TAU; if (d > Math.PI) d -= TAU; if (d < -Math.PI) d += TAU; return d; };
const IS_TOUCH = matchMedia('(pointer: coarse)').matches || ('ontouchstart' in window && navigator.maxTouchPoints > 0);
if (IS_TOUCH) document.body.classList.add('touch');

// Générateur pseudo-aléatoire déterministe (le décor est identique pour tous les joueurs en co-op).
function mulberry32(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
let rng = mulberry32(1917);
const rand = (a = 1, b) => (b === undefined ? Math.random() * a : a + Math.random() * (b - a));
const srand = (a = 1, b) => (b === undefined ? rng() * a : a + rng() * (b - a));
const pick = (arr) => arr[(Math.random() * arr.length) | 0];
const hash2 = (x, z) => { let h = Math.imul(x | 0, 374761393) + Math.imul(z | 0, 668265263); h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };

// Bruit de valeur 2D lissé + fbm (textures, terrain).
function vnoise(x, y) {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const a = hash2(xi, yi), b = hash2(xi + 1, yi), c = hash2(xi, yi + 1), d = hash2(xi + 1, yi + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
function fbm(x, y, oct = 4) {
  let s = 0, amp = 0.5, f = 1, n = 0;
  for (let i = 0; i < oct; i++) { s += vnoise(x * f, y * f) * amp; n += amp; amp *= 0.5; f *= 2.03; }
  return s / n;
}
// Bruit périodique (textures sans couture).
function tnoise(x, y, p) {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const m = (n) => ((n % p) + p) % p;
  const a = hash2(m(xi), m(yi)), b = hash2(m(xi + 1), m(yi)), c = hash2(m(xi), m(yi + 1)), d = hash2(m(xi + 1), m(yi + 1));
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
function tfbm(x, y, p, oct = 4) {
  let s = 0, amp = 0.5, n = 0, f = 1;
  for (let i = 0; i < oct; i++) { s += tnoise(x * f, y * f, p * f) * amp; n += amp; amp *= 0.5; f *= 2; }
  return s / n;
}

/* ─── Réglages persistants ─── */
const store = {
  get(k, d) { try { const v = localStorage.getItem('sp_' + k); return v == null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem('sp_' + k, JSON.stringify(v)); } catch { /* stockage indisponible */ } },
};
const defaultQuality = IS_TOUCH ? 0 : 2;
const settings = Object.assign({ quality: defaultQuality, sens: 1, fov: 78, volume: 0.8, music: 0.5, invertY: false, showFps: false, name: '', diff: 1 }, store.get('settings', {}));
// Difficulté : points de vie du soldat, coup d'un infecté, résistance, nombre et cadence d'arrivée des infectés.
// « early » avance (ou recule) d'autant de manches l'arrivée des coureurs et des infectés spéciaux.
const DIFFS = [
  { name: 'Recrue', hp: 200, hit: 35, zhp: 0.8, spawn: 0.85, count: 0.85, early: -1, desc: 'Pour découvrir : beaucoup de vie, infectés moins résistants.' },
  { name: 'Régulier', hp: 150, hit: 40, zhp: 1, spawn: 1, count: 1, early: 0, desc: 'La difficulté prévue : quatre coups avant de tomber.' },
  { name: 'Vétéran', hp: 110, hit: 50, zhp: 1.15, spawn: 1.12, count: 1.1, early: 1, desc: 'Pour les habitués : trois coups et vous êtes à terre.' },
  { name: 'Cauchemar', hp: 110, hit: 50, zhp: 1.3, spawn: 1.25, count: 1.2, early: 3, desc: 'Coureurs dès la 2e manche, brutes blindées et Givreux très tôt, hordes denses.' },
];
const DIFF = () => DIFFS[typeof G !== 'undefined' && G.diff != null ? G.diff : clamp(settings.diff | 0, 0, 3)];
const saveSettings = () => store.set('settings', settings);
const QUALITY = [
  { name: 'bas', pr: 0.75, shadows: false, shadowSize: 0, bloom: false, snow: 1800, flashShadow: false, texSize: 256, grain: false, decals: 30 },
  { name: 'moyen', pr: 1, shadows: true, shadowSize: 1024, bloom: false, snow: 3500, flashShadow: false, texSize: 512, grain: true, decals: 60 },
  { name: 'eleve', pr: 1.25, shadows: true, shadowSize: 2048, bloom: true, snow: 6000, flashShadow: true, texSize: 512, grain: true, decals: 90 },
  { name: 'ultra', pr: 2, shadows: true, shadowSize: 4096, bloom: true, snow: 9000, flashShadow: true, texSize: 1024, grain: true, decals: 140 },
];
let Q = QUALITY[clamp(settings.quality | 0, 0, 3)];

/* ─── Constantes du monde ─── */
const TILE = 2;           // un carreau de carte = 2 m
const WALL_H = 2.5;       // profondeur des tranchées
const EYE = 1.62, EYE_CROUCH = 1.02, P_RADIUS = 0.34;
const GRAVITY = 15;
const MAX_PLAYERS = 4;
const GAME_VERSION = '4.5'; // à augmenter à chaque mise en ligne (voir version.json)

/* ─── Bus d'événements minimal ─── */
const bus = { h: {}, on(e, f) { (this.h[e] ||= []).push(f); }, emit(e, ...a) { (this.h[e] || []).forEach((f) => f(...a)); } };

// Objets temporaires réutilisés (évite les allocations par image).
const _v1 = new THREE.Vector3(), _v2 = new THREE.Vector3(), _v3 = new THREE.Vector3(), _q1 = new THREE.Quaternion(), _m1 = new THREE.Matrix4(), _e1 = new THREE.Euler(), _c1 = new THREE.Color();
