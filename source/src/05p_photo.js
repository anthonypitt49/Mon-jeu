/* ═══════════════════ TEXTURES PHOTO ET ÉCLAIRAGE D'AMBIANCE (HDRI) ═══════════════════
   Ressources CC0 (Poly Haven) servies à côté du jeu, dans assets/<carte>/ (voir source/tools/fetch_assets.py).
   Le jeu démarre avec ses textures dessinées, puis les remplace d'un coup quand toutes les photos sont arrivées.
   En cas d'échec (hors ligne, page ouverte en local, ?nophoto), il garde simplement les siennes. */

const PHOTO = { state: 'off', ms: 0, bytes: 0, files: 0, err: '' };
// Matière du jeu → texture photo. uv : mètres couverts par une unité de coordonnée de texture (u, v) ;
// rot : grain du bois tourné d'un quart de tour (poteaux) ; ns : intensité du relief.
// Cartes de plain-pied (ft) : la clé est la texture dessinée de la carte (FLAT_TEX), remplacée partout où elle sert,
// à la même échelle (FLAT_SCALE) et avec la même teinte ; detail : on garde le motif dessiné (papier peint, peinture
// des cellules) et on ne prend à la photo que son relief et sa rugosité.
const PHOTO_SETS = {
  poste7: {
    earth: { set: 'mudwall', uv: [2.2, 2.2] },
    concrete: { set: 'concrete', uv: [2.2, 2.2], ns: 0.8 },
    concreteOut: { set: 'concrete', uv: [2.2, 2.2], ns: 0.8 },
    planks: { set: 'planks', uv: [2, 1.75] },
    boards: { set: 'planks', uv: [2, 2] },
    post: { set: 'planks', uv: [0.13, 2.8], rot: true },
    duck: { set: 'planks', uv: [0.95, 0.11] },
    sandbag: { set: 'burlap', uv: [0.6, 0.36], ns: 1.4, tm: 0.55 }, // toile de sac grossière : trame plus large que le tissu photographié
    metal: { set: 'tin', uv: [2, 1.8] },
    floor: { blend: ['snow', 'mudfloor'], uv: [3, 3] },
    snow: { blend: ['snow', 'mudfloor'], uv: [4, 4] },
  },
  cite: {
    asphalt: { ft: 1, set: 'asphalt' }, sidewalk: { ft: 1, set: 'sidewalk' }, sand: { ft: 1, set: 'desert', tint: [0.98, 0.84, 0.68] }, // lac asséché ocre, pas une croûte de sel
    lawn: { ft: 1, set: 'grass', tint: [0.82, 1.12, 0.62] }, // pelouses arrosées du village témoin : plus vertes que l'herbe photographiée
    siding: { ft: 1, set: 'plaster', detail: true, ns: 0.5 }, // clins dessinés (leurs ombres franches font la maison), grain de peinture photographié
    shingle: { ft: 1, set: 'shingle' }, brick: { ft: 1, set: 'brick' }, plaster: { ft: 1, set: 'plaster' }, parquet: { ft: 1, set: 'parquet' },
    checker: { ft: 1, set: 'checker' }, slab: { ft: 1, set: 'garage' }, tileWall: { ft: 1, set: 'tiles' }, concrete: { ft: 1, set: 'concrete' },
    planks: { ft: 1, set: 'wood' }, rock: { ft: 1, set: 'rock' }, wallpaper: { ft: 1, set: 'paper', detail: true, ns: 0.6 },
  },
  penitencier: {
    stone: { ft: 1, set: 'stone' }, rock: { ft: 1, set: 'rock' }, slab: { ft: 1, set: 'floor' }, tileWall: { ft: 1, set: 'tiles' },
    planks: { ft: 1, set: 'pier' }, westPlank: { ft: 1, set: 'panel' }, parquet: { ft: 1, set: 'parquet' }, plaster: { ft: 1, set: 'plaster' },
    cellPaint: { ft: 1, set: 'paint', detail: true, ns: 1.2 }, concrete: { ft: 1, set: 'concrete' },
  },
  filon: {
    westPlank: { ft: 1, set: 'boards' }, dirt: { ft: 1, set: 'dirt' }, rock: { ft: 1, set: 'rock' }, planks: { ft: 1, set: 'walk' },
    parquet: { ft: 1, set: 'floor' }, brick: { ft: 1, set: 'brick' }, plaster: { ft: 1, set: 'plaster' }, checker: { ft: 1, set: 'checker' },
    shingle: { ft: 1, set: 'shingle' }, stone: { ft: 1, set: 'stone' }, victorian: { ft: 1, set: 'paper', detail: true, ns: 0.6 },
  },
};

// Luminance moyenne (linéaire) d'une image, sur une vignette 16 × 16.
function texLum(img) {
  try {
    const c = makeCanvas(16), x = c.getContext('2d'); x.drawImage(img, 0, 0, 16, 16);
    const d = x.getImageData(0, 0, 16, 16).data; let s = 0;
    const lin = (v) => { v /= 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
    for (let i = 0; i < d.length; i += 4) s += 0.2126 * lin(d[i]) + 0.7152 * lin(d[i + 1]) + 0.0722 * lin(d[i + 2]);
    return s / 256;
  } catch { return 0; }
}

// En qualité « bas » (téléphones), versions allégées des photos (512 px) : quatre fois moins de mémoire vidéo.
function photoWanted() {
  return !!PHOTO_SETS[MAP_ID] && location.protocol !== 'file:' && !/nophoto/.test(location.search);
}

// Ombrage d'ambiance : module chargé seulement quand le réglage le demande ; en cas d'échec, le jeu s'en passe.
async function aoStart() {
  if (!Q.ao || R.N8AOPass || !PHOTO_SETS[MAP_ID] || /noao/.test(location.search)) return; // seulement sur les cartes en textures photo
  try { R.N8AOPass = (await import('n8ao')).N8AOPass; buildComposer(); PHOTO.ao = Q.ao; } catch (e) { PHOTO.ao = 'failed: ' + (e?.message || e); }
}

async function photoStart() {
  if (!photoWanted() || PHOTO.state !== 'off') return;
  PHOTO.state = 'loading'; const t0 = performance.now(), base = `assets/${MAP_ID}/`;
  try {
    const man = await (await fetch(base + 'manifest.json', { cache: 'force-cache' })).json();
    const aniso = Math.min(8, R.renderer.capabilities.getMaxAnisotropy());
    // Décodage des JPEG hors du fil principal (createImageBitmap) ; Safari, qui ignore le retournement demandé, garde le chargeur classique.
    const safari = /Safari/.test(navigator.userAgent) && !/Chrome|Chromium|Edg/.test(navigator.userAgent);
    const bmp = typeof createImageBitmap === 'function' && !safari ? new THREE.ImageBitmapLoader().setOptions({ imageOrientation: 'flipY', premultiplyAlpha: 'none', colorSpaceConversion: 'none' }) : null;
    const tl = new THREE.TextureLoader();
    const load = (url) => (bmp ? bmp.loadAsync(url).then((b) => { const t = new THREE.Texture(b); t.flipY = false; t.needsUpdate = true; return t; }) : tl.loadAsync(url));
    const tex = {}, jobs = [], lite = Q.texSize < 512 || /photolite/.test(location.search); PHOTO.lite = lite;
    for (const [key, e] of Object.entries(man)) {
      if (key === 'env') continue;
      for (const m of e.maps) jobs.push(load(`${base}${key}_${m}${lite && e.s ? '_s' : ''}.jpg`).then((t) => {
        t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = aniso; t.colorSpace = m === 'c' ? THREE.SRGBColorSpace : THREE.NoColorSpace;
        (tex[key] ||= {})[m] = t; PHOTO.files++;
      }));
    }
    const env = man.env ? photoEnv(base, man.env).catch((e) => { PHOTO.err = 'env: ' + (e?.message || e); }) : null; // échec isolé : on garde le ciel calculé
    await Promise.all(jobs);
    // Envoi à la carte graphique une texture par image, puis une matière par image : pas d'à-coup en pleine partie
    // (tout basculer d'un coup figeait l'écran le temps de recompiler une douzaine de matières).
    for (const set of Object.values(tex)) for (const t of Object.values(set)) { R.renderer.initTexture(t); await photoFrame(); }
    await photoApply(man, tex);
    if (env) await env;
    PHOTO.state = 'on';
  } catch (e) { PHOTO.state = 'failed'; PHOTO.err = String(e?.message || e); }
  PHOTO.ms = Math.round(performance.now() - t0);
  try { PHOTO.bytes = performance.getEntriesByType('resource').filter((r) => r.name.includes('/assets/')).reduce((s, r) => s + (r.encodedBodySize || r.transferSize || 0), 0); } catch { /* sans mesure */ }
}

// Pièces répétées (planches, tôles, sacs, poteaux, lattes) : chaque exemplaire lit la texture à un endroit différent,
// sinon le même nœud du bois ou la même tache de boue reviendrait sur chacun.
function photoJitter(m) {
  if (m.userData.jit) return; m.userData.jit = 1;
  const prev = m.onBeforeCompile, key = m.customProgramCacheKey?.() || '';
  m.onBeforeCompile = (sh, r) => {
    if (prev) prev.call(m, sh, r);
    sh.vertexShader = sh.vertexShader.replace('#include <uv_vertex>', `#include <uv_vertex>
      #ifdef USE_INSTANCING
        vec2 pjit = fract(vec2(instanceMatrix[3].x * 0.731 + instanceMatrix[3].y * 2.17, instanceMatrix[3].z * 0.613 + instanceMatrix[3].x * 0.291) * 1.37);
        #ifdef USE_MAP
          vMapUv += pjit;
        #endif
        #ifdef USE_NORMALMAP
          vNormalMapUv += pjit;
        #endif
        #ifdef USE_ROUGHNESSMAP
          vRoughnessMapUv += pjit;
        #endif
      #endif`);
  };
  m.customProgramCacheKey = () => key + '|jit';
}

// Une texture recadrée pour une matière : même image (et même copie en mémoire vidéo), répétition propre.
function photoTex(t, rx, ry, rot) {
  const c = t.clone(); c.repeat.set(rx, ry); if (rot) { c.rotation = Math.PI / 2; c.center.set(0.5, 0.5); } c.needsUpdate = true; return c;
}

const photoFrame = () => new Promise((res) => { const t = setTimeout(res, 120); requestAnimationFrame(() => { clearTimeout(t); res(); }); });
async function photoApply(man, tex) {
  const spec = PHOTO_SETS[MAP_ID], done = new Set();
  // Les fusions du décor ont pu cloner une matière (teintes par sommet) : on retrouve toutes les copies par leur nom.
  const all = {}; R.scene.traverse((o) => { if (!o.material) return; for (const m of Array.isArray(o.material) ? o.material : [o.material]) if (m.userData.photo) (all[m.userData.photo] ||= new Set()).add(m); });
  for (const [name, s] of Object.entries(spec)) {
    if (s.ft) { if (await photoFlat(name, s, man, tex)) done.add(name); continue; }
    const base = MATS[name]; if (!base) continue;
    const mats = all[name] || new Set(); mats.add(base);
    await photoFrame();
    if (s.blend) { if (photoBlend(mats, s, man, tex, base)) done.add(name); continue; }
    const t = tex[s.set], e = man[s.set]; if (!t || !t.c) continue;
    // Même luminosité moyenne qu'avant : l'éclairage de la carte a été réglé pour les textures dessinées.
    const old = base.map?.image ? texLum(base.map.image) * (0.2126 * base.color.r + 0.7152 * base.color.g + 0.0722 * base.color.b) : e.lum;
    const k = clamp(old / Math.max(1e-4, e.lum), 0.45, 2.4);
    const tm = s.tm || e.m, rx = s.uv[0] / tm, ry = s.uv[1] / tm;
    const map = photoTex(t.c, rx, ry, s.rot), nrm = t.n ? photoTex(t.n, rx, ry, s.rot) : null, rgh = t.r ? photoTex(t.r, rx, ry, s.rot) : null;
    for (const m of mats) {
      m.map = map; if (nrm) { m.normalMap = nrm; m.normalScale.set(s.ns || 1, s.ns || 1); }
      if (rgh) { m.roughnessMap = rgh; m.roughness = 1; }
      if (m.vertexColors && !base.vertexColors) m.color.set(0xffffff); // copie teintée par sommet : la teinte reste dans les sommets
      else m.color.setScalar(k);
      photoJitter(m);
      m.needsUpdate = true; done.add(name);
    }
  }
  PHOTO.done = [...done];
}

// Carte de plain-pied : une texture dessinée (FLAT_TEX) remplacée dans toutes ses matières (teintes et copies
// fusionnées comprises), à la même échelle ; même luminosité moyenne qu'avant, la teinte de chaque matière est gardée.
async function photoFlat(key, s, man, tex) {
  const t = tex[s.set], e = man[s.set]; if (!t || (!t.c && !s.detail)) return false;
  const mats = new Set(Object.values(FMATS).filter((m) => m.userData.ftex === key));
  R.scene.traverse((o) => { if (o.material) for (const m of Array.isArray(o.material) ? o.material : [o.material]) if (m.userData.ftex === key) mats.add(m); });
  if (!mats.size) return false; // texture absente de la carte : erreur de PHOTO_SETS (signalée par dev/photo.mjs)
  await photoFrame();
  const r = (FLAT_SCALE[key] || 2) / (s.tm || e.m);
  const map = !s.detail && t.c ? photoTex(t.c, r, r, s.rot) : null, nrm = t.n ? photoTex(t.n, r, r, s.rot) : null, rgh = t.r ? photoTex(t.r, r, r, s.rot) : null;
  const first = [...mats].find((m) => m.map?.image), old = first ? texLum(first.map.image) : e.lum, k = clamp(old / Math.max(1e-4, e.lum), 0.45, 2.4);
  for (const m of mats) {
    if (m.userData.photoDone) continue; m.userData.photoDone = 1;
    if (map) { m.map = map; m.color.multiplyScalar(k); if (s.tint) { m.color.r *= s.tint[0]; m.color.g *= s.tint[1]; m.color.b *= s.tint[2]; } }
    if (nrm) { m.normalMap = nrm; m.normalScale.set(s.ns || 1, s.ns || 1); }
    if (rgh) { m.roughnessMap = rgh; m.roughness = 1; }
    m.needsUpdate = true;
  }
  return true;
}

// Sol des tranchées et terrain : neige et boue photo mélangées selon la couleur des sommets (blanc = neige, brun = boue),
// avec un relief qui s'adoucit sous la neige.
function photoBlend(mats, s, man, tex, base) {
  const [sn, md] = s.blend, ts = tex[sn], tm = tex[md], es = man[sn], em = man[md]; if (!ts?.c || !tm?.c) return false;
  const rs = s.uv[0] / es.m, rm = s.uv[0] / em.m;
  const snowMap = photoTex(ts.c, rs, rs), mudMap = photoTex(tm.c, rs, rs), mudN = tm.n ? photoTex(tm.n, rs, rs) : null, mudR = tm.r ? photoTex(tm.r, rs, rs) : null;
  const old = base.map?.image ? texLum(base.map.image) : es.lum;
  const uni = { uMud: { value: mudMap }, uMudR: { value: mudR }, uMudK: { value: rm / rs }, uSnowK: { value: clamp(old * 0.92 / es.lum, 0.6, 2.4) }, uMudTint: { value: clamp(old * 0.26 / em.lum, 0.5, 2.4) } }; // boue d'avant : texture × teinte des sommets (≈ 0,26)
  for (const m of mats) {
    m.map = snowMap; if (mudN) { m.normalMap = mudN; m.normalScale.set(1, 1); } m.roughness = 1; m.color.set(0xffffff);
    m.onBeforeCompile = (sh) => {
      Object.assign(sh.uniforms, uni);
      sh.fragmentShader = sh.fragmentShader
        .replace('#include <common>', '#include <common>\nuniform sampler2D uMud; uniform sampler2D uMudR; uniform float uMudK, uSnowK, uMudTint;')
        .replace('#include <map_fragment>', `
          vec2 pbUv = vMapUv * uMudK;
          float pbN = texture2D(uMud, pbUv * 0.137).g - 0.5;
          float snowK = smoothstep(0.22, 0.78, clamp((vColor.r - 0.3) / 0.6, 0.0, 1.0) + pbN * 0.35);
          vec3 pbSnow = texture2D(map, vMapUv).rgb * uSnowK, pbMud = texture2D(uMud, pbUv).rgb * uMudTint;
          diffuseColor.rgb *= mix(pbMud, pbSnow, snowK);`)
        .replace('#include <color_fragment>', '')
        .replace('#include <roughnessmap_fragment>', `float roughnessFactor = mix(texture2D(uMudR, pbUv).g, 0.86, snowK);`)
        .replace('mapN.xy *= normalScale;', 'mapN.xy *= normalScale * (1.0 - 0.8 * snowK);')
        .replace('vec3 mapN = texture2D( normalMap, vNormalMapUv ).xyz', 'vec3 mapN = texture2D( normalMap, vNormalMapUv * uMudK ).xyz');
    };
    m.customProgramCacheKey = () => 'photoBlend';
    m.needsUpdate = true;
  }
  (PHOTO.blend ||= []).push(s.blend.join('+'));
  return true;
}

// Éclairage d'ambiance photographié (ciel nocturne couvert) : même intensité moyenne que le ciel calculé qu'il remplace.
async function photoEnv(base, e) {
  // env.json : image RGBE (comme un .hdr) en base64 ; décodée en demi-flottants, ligne du haut en dernier (convention WebGL).
  const j = await (await fetch(base + 'env.json', { cache: 'force-cache' })).json(), W = j.w, H = j.h, src = Uint8Array.from(atob(j.rgbe), (ch) => ch.charCodeAt(0));
  const px = new Uint16Array(W * H * 4), h = THREE.DataUtils.toHalfFloat;
  // Ciel tourné pour que son point le plus lumineux (az, noté par fetch_assets.py) tombe dans la direction du soleil du jeu
  // (convention des cartes équirectangulaires de three.js : u = atan2(z, x) / 2π + 0,5).
  const sh = typeof e.az === 'number' ? Math.round(((Math.atan2(MOON_DIR.z, MOON_DIR.x) / TAU + 0.5) - e.az) * W) : 0; PHOTO.envShift = sh;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = (y * W + x) * 4, o = ((H - 1 - y) * W + (((x + sh) % W) + W) % W) * 4, ex = src[i + 3], f = ex ? 2 ** (ex - 136) : 0;
    px[o] = h((src[i] + 0.5) * f); px[o + 1] = h((src[i + 1] + 0.5) * f); px[o + 2] = h((src[i + 2] + 0.5) * f); px[o + 3] = h(1);
  }
  const hdr = new THREE.DataTexture(px, W, H, THREE.RGBAFormat, THREE.HalfFloatType);
  hdr.colorSpace = THREE.LinearSRGBColorSpace; hdr.minFilter = hdr.magFilter = THREE.LinearFilter; hdr.mapping = THREE.EquirectangularReflectionMapping; hdr.needsUpdate = true;
  const pm = new THREE.PMREMGenerator(R.renderer), rt = pm.fromEquirectangular(hdr); pm.dispose(); hdr.dispose();
  R.scene.environment = rt.texture; R.viewScene.environment = rt.texture;
  R.envK = clamp(envProcLum() / Math.max(1e-5, e.lum), 0.05, 20); R.viewScene.environmentIntensity = 1.3 * R.envK;
  PHOTO.env = +R.envK.toFixed(3);
}
// Luminance moyenne du ciel calculé de buildEnvironment (même formule, intégrée sur la sphère).
function envProcLum() {
  const E = M.env.envMap, sd = MOON_DIR, gd = new THREE.Vector3(...E.glowDir).normalize(), sc = new THREE.Color(M.env.sunColor);
  const ss = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  let s = 0; const N = 1200;
  for (let i = 0; i < N; i++) {
    const y = 1 - 2 * (i + 0.5) / N, r = Math.sqrt(1 - y * y), a = i * 2.39996, d = [Math.cos(a) * r, y, Math.sin(a) * r];
    const c = [0, 1, 2].map((k) => { let v = lerp(E.low[k], E.mid[k], ss(-0.25, 0.08, y)); v = lerp(v, E.high[k], ss(0.1, 0.9, y)); return v; });
    const m = Math.max(0, d[0] * sd.x + d[1] * sd.y + d[2] * sd.z) ** 64 * 3, g = Math.max(0, d[0] * gd.x + d[1] * gd.y + d[2] * gd.z) ** 12 * 0.6;
    const col = [c[0] + sc.r * 0.95 * m + E.glow[0] * g, c[1] + sc.g * 0.95 * m + E.glow[1] * g, c[2] + sc.b * m + E.glow[2] * g];
    s += 0.2126 * col[0] + 0.7152 * col[1] + 0.0722 * col[2];
  }
  return s / N;
}
