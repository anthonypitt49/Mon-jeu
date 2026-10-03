/* ═══════════════════ RENDU : moteur, ciel, lumières, neige, post-traitement ═══════════════════ */

const R = { lights: {}, pr: 1, fpsAvg: 60, lowT: 0, highT: 0, flash: 0, exposure: 1 };
const FOG_COLOR = new THREE.Color(0x19232e);
const MOON_DIR = new THREE.Vector3(-0.45, 0.62, -0.64).normalize();

// Neige sur les faces tournées vers le ciel : injection dans les matériaux standards.
const SNOW_UNI = { value: 1 };
function snowify(mat, amount = 1) {
  mat.userData.snow = amount;
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.uSnowAmt = { value: amount }; sh.uniforms.uSnowGlobal = SNOW_UNI;
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vSnowN; varying vec3 vSnowP;')
      .replace('#include <fog_vertex>', `#include <fog_vertex>
        vSnowN = normalize(transpose(mat3(viewMatrix)) * transformedNormal);
        vec4 snowWp = vec4(transformed, 1.0);
        #ifdef USE_INSTANCING
          snowWp = instanceMatrix * snowWp;
        #endif
        vSnowP = (modelMatrix * snowWp).xyz;`);
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>
        varying vec3 vSnowN; varying vec3 vSnowP; uniform float uSnowAmt; uniform float uSnowGlobal;
        float snH(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233))) * 43758.5453); }
        float snN(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f); return mix(mix(snH(i), snH(i+vec2(1.,0.)), f.x), mix(snH(i+vec2(0.,1.)), snH(i+vec2(1.,1.)), f.x), f.y); }`)
      .replace('#include <color_fragment>', `#include <color_fragment>
        float snowNz = snN(vSnowP.xz * 3.1 + vSnowP.y) * 0.6 + snN(vSnowP.xz * 13.0) * 0.4;
        float snowF = smoothstep(0.42, 0.78, vSnowN.y + (snowNz - 0.5) * 0.5) * uSnowAmt * uSnowGlobal;
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.84, 0.88, 0.95), snowF);`)
      .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
        roughnessFactor = mix(roughnessFactor, 0.82, snowF);`);
  };
  mat.customProgramCacheKey = () => 'snowify';
  return mat;
}
function stdMat(o, snow = 0) { const m = new THREE.MeshStandardMaterial(o); return snow ? snowify(m, snow) : m; }

function initRenderer() {
  const canvas = $('game');
  const renderer = R.renderer = new THREE.WebGLRenderer({ canvas, antialias: settings.quality >= 1 && !Q.bloom, powerPreference: 'high-performance', stencil: false });
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.15;
  renderer.shadowMap.enabled = Q.shadows; renderer.shadowMap.type = THREE.PCFShadowMap;
  const E = M.env; FOG_COLOR.set(E.fog); MOON_DIR.set(...E.sunDir).normalize(); renderer.toneMappingExposure = E.exposure || 1.15;
  SNOW_UNI.value = E.snow ?? 0;
  R.scene = new THREE.Scene(); R.scene.fog = new THREE.FogExp2(FOG_COLOR.getHex(), E.fogDensity); R.scene.background = FOG_COLOR.clone();
  R.camera = new THREE.PerspectiveCamera(settings.fov, 16 / 9, 0.05, 700); R.camera.rotation.order = 'YXZ';
  R.scene.add(R.camera);
  R.viewScene = new THREE.Scene();
  R.viewCam = new THREE.PerspectiveCamera(56, 16 / 9, 0.01, 10);
  buildViewLights();
  buildEnvironment();
  buildComposer();
  window.addEventListener('resize', resize); resize();
}
// Éclairage d'ambiance par image (reflets des métaux, lumière du ciel nocturne).
function buildEnvironment() {
  const pm = new THREE.PMREMGenerator(R.renderer), env = new THREE.Scene(), E = M.env.envMap, v3 = (a) => `vec3(${a.map((x) => (+x).toFixed(3)).join(',')})`;
  const sd = MOON_DIR, gd = new THREE.Vector3(...E.glowDir).normalize(), sc = new THREE.Color(M.env.sunColor);
  env.add(new THREE.Mesh(new THREE.SphereGeometry(10, 32, 16), new THREE.ShaderMaterial({ side: THREE.BackSide,
    vertexShader: 'varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `varying vec3 vP; void main(){ vec3 d = normalize(vP); float h = d.y; vec3 c = mix(${v3(E.low)}, ${v3(E.mid)}, smoothstep(-0.25, 0.08, h)); c = mix(c, ${v3(E.high)}, smoothstep(0.1, 0.9, h)); c += ${v3([sc.r * 0.95, sc.g * 0.95, sc.b])} * pow(max(dot(d, ${v3([sd.x, sd.y, sd.z])}), 0.0), 64.0) * 3.0; c += ${v3(E.glow)} * pow(max(dot(d, ${v3([gd.x, gd.y, gd.z])}), 0.0), 12.0) * 0.6; gl_FragColor = vec4(c, 1.0); }` })));
  const rt = pm.fromScene(env, 0.03);
  R.scene.environment = rt.texture; R.scene.environmentIntensity = M.env.envOut;
  R.viewScene.environment = rt.texture; R.viewScene.environmentIntensity = 1.3;
  pm.dispose();
}
function buildComposer() {
  const renderer = R.renderer;
  if (R.composer) { R.composer.dispose?.(); R.composer = null; }
  if (!Q.bloom && !Q.grain) return;
  const c = R.composer = new EffectComposer(renderer);
  c.addPass(new RenderPass(R.scene, R.camera));
  const vp = new RenderPass(R.viewScene, R.viewCam); vp.clear = false; vp.clearDepth = true; c.addPass(vp);
  if (Q.bloom) {
    R.bloom = new UnrealBloomPass(new THREE.Vector2(512, 512), 0.5, 0.55, 0.9); c.addPass(R.bloom);
    // Un seul pixel invalide (NaN) suffit, sur certaines cartes graphiques, à noircir tout l'écran une fois étalé par le halo : on le neutralise à l'entrée.
    const hp = R.bloom.materialHighPassFilter;
    hp.fragmentShader = hp.fragmentShader.replace('vec4 texel = texture2D( tDiffuse, vUv );', 'vec4 texel = texture2D( tDiffuse, vUv ); texel = (any(isnan(texel)) || any(isinf(texel))) ? vec4(0.0) : min(texel, vec4(64.0));');
    hp.needsUpdate = true;
  } else R.bloom = null;
  R.final = new ShaderPass({
    uniforms: { tDiffuse: { value: null }, uTime: { value: 0 }, uGrain: { value: Q.grain ? 1 : 0 }, uVig: { value: 0.75 }, uDamage: { value: 0 }, uAberr: { value: 0 }, uTint: { value: new THREE.Vector3(...(M.env.tint || [1, 1, 1])) } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `uniform sampler2D tDiffuse; uniform float uTime, uGrain, uVig, uDamage, uAberr; uniform vec3 uTint; varying vec2 vUv;
      void main(){
        vec2 c = vUv - 0.5; float ab = 0.0007 + uAberr * 0.006;
        vec3 col = vec3(texture2D(tDiffuse, vUv + c * ab).r, texture2D(tDiffuse, vUv).g, texture2D(tDiffuse, vUv - c * ab).b);
        if (any(isnan(col)) || any(isinf(col))) col = vec3(0.0);
        float l = dot(col, vec3(0.2126, 0.7152, 0.0722));
        col = mix(col, col * uTint, 1.0 - smoothstep(0.0, 0.5, l));
        col = mix(vec3(l), col, 0.86);
        float v = smoothstep(0.9, 0.22, length(c * vec2(1.15, 1.0)));
        col *= mix(1.0, v, uVig);
        col = mix(col, col * vec3(1.5, 0.35, 0.3) + vec3(0.06, 0.0, 0.0), uDamage * smoothstep(0.15, 0.75, length(c) * 1.5));
        float g = fract(sin(dot(vUv * vec2(1733.0, 977.0) + fract(uTime) * 91.0, vec2(12.9898, 78.233))) * 43758.5453);
        col += (g - 0.5) * uGrain * (0.015 + 0.05 * (1.0 - smoothstep(0.0, 0.4, l)));
        gl_FragColor = vec4(max(col, 0.0), 1.0);
      }`,
  });
  c.addPass(R.final);
  c.addPass(new OutputPass());
  resize();
}
function resize() {
  const w = innerWidth, h = innerHeight, pr = Math.min(devicePixelRatio || 1, Q.pr) * (R.dynScale || 1);
  R.pr = pr; R.renderer.setPixelRatio(pr); R.renderer.setSize(w, h, false);
  R.camera.aspect = R.viewCam.aspect = w / h; R.camera.updateProjectionMatrix(); R.viewCam.updateProjectionMatrix();
  if (R.composer) { R.composer.setPixelRatio(pr); R.composer.setSize(w, h); }
  if (R.bloom) R.bloom.resolution.set(w * pr * 0.5, h * pr * 0.5);
}
function renderFrame(time) {
  if (R.final) { R.final.uniforms.uTime.value = time; }
  if (GLOWB.length) syncGlows();
  if (R.composer) R.composer.render();
  else { const r = R.renderer; r.autoClear = false; r.clear(); r.render(R.scene, R.camera); r.clearDepth(); r.render(R.viewScene, R.viewCam); }
}
// Résolution dynamique : garde le jeu fluide sur les machines modestes.
// Appelée AVANT le rendu de l'image : redimensionner le canevas l'efface, et l'effacer après le rendu
// affichait une image noire à chaque ajustement (les « flashs noirs » des machines autour de 40-55 img/s).
// Les ajustements sont espacés, et on ne remonte la définition que si elle n'a pas dû baisser depuis 45 s.
function dynamicResolution(dt) {
  if (dt <= 0) return; R.fpsAvg = lerp(R.fpsAvg, 1 / dt, 0.05);
  R.dynCd = Math.max(0, (R.dynCd || 0) - dt);
  if (G.mode !== 'playing' || R.dynCd > 0) { R.lowT = 0; R.highT = 0; return; }
  const s = R.dynScale || 1, now = performance.now();
  if (R.fpsAvg < 40) { R.lowT += dt; R.highT = 0; if (R.lowT > 3 && s > 0.56) { R.dynScale = Math.max(0.55, s * 0.85); R.lowT = 0; R.dynCd = 4; R.lastDown = now; resize(); } }
  else if (R.fpsAvg > 58) { R.highT += dt; R.lowT = 0; if (R.highT > 10 && s < 1 && now - (R.lastDown || 0) > 45000) { R.dynScale = Math.min(1, s * 1.1); R.highT = 0; R.dynCd = 4; resize(); } }
  else { R.lowT = 0; R.highT = 0; }
}

/* ─── Lumières ─── */
function buildLights() {
  const L = R.lights, scene = R.scene, E = M.env;
  L.hemi = new THREE.HemisphereLight(E.hemi[0], E.hemi[1], E.hemiOut); scene.add(L.hemi);
  L.moon = new THREE.DirectionalLight(E.sunColor, E.sunI);
  L.moon.position.copy(MOON_DIR).multiplyScalar(60);
  if (Q.shadows) {
    L.moon.castShadow = true; const s = L.moon.shadow; s.mapSize.set(Q.shadowSize, Q.shadowSize);
    const e = 30; Object.assign(s.camera, { left: -e, right: e, top: e, bottom: -e, near: 1, far: 160 }); s.camera.updateProjectionMatrix();
    s.bias = -0.0004; s.normalBias = 0.04; s.radius = 2.5;
  }
  scene.add(L.moon); scene.add(L.moon.target);
  // Lampe torche du soldat.
  L.torch = new THREE.SpotLight(0xfff1dc, 0, 30, 0.55, 0.7, 1.7);
  if (Q.flashShadow) { L.torch.castShadow = true; L.torch.shadow.mapSize.set(settings.quality >= 3 ? 1024 : 512, settings.quality >= 3 ? 1024 : 512); L.torch.shadow.bias = -0.0008; L.torch.shadow.camera.near = 0.3; }
  R.camera.add(L.torch); L.torch.position.set(0.25, -0.2, 0.1); R.camera.add(L.torch.target); L.torch.target.position.set(0.1, -0.1, -10);
  // Sources ponctuelles fixes (créées une fois : pas de recompilation des shaders en jeu).
  const pl = (name, color, intensity, dist, x, y, z) => { const l = new THREE.PointLight(color, intensity, dist, 2); l.position.set(x, y, z); l.userData.base = intensity; scene.add(l); L[name] = l; return l; };
  pl('muzzle', 0xffc27a, 0, 12, 0, -50, 0);
  pl('blast', 0xffa050, 0, 26, 0, -50, 0);
  pl('flare', 0xffe2d6, 0, 140, 0, -50, 0);
  // Lampes de carte : jamais au-dessus du plafond de la pièce (elles n'éclaireraient que le toit).
  M.lights((name, color, intensity, dist, x, y, z) => {
    if (M.flat) { const tx = tileOf(x), tz = tileOf(z); if (inMap(tx, tz) && MAP.roof[ti(tx, tz)] && MAP.type[ti(tx, tz)] !== T_SOLID) y = Math.min(y, roomCeil(tx, tz) - 0.3); }
    return pl(name, color, intensity, dist, x, y, z);
  });
}
function buildViewLights() {
  const v = R.viewScene;
  R.vHemi = new THREE.HemisphereLight(0x9fb6d4, 0x2b2622, 1.1); v.add(R.vHemi);
  R.vKey = new THREE.DirectionalLight(0xb4ccff, 0.9); R.vKey.position.set(-1, 2, 1); v.add(R.vKey);
  R.vMuzzle = new THREE.PointLight(0xffc27a, 0, 3, 2); R.vMuzzle.position.set(0.1, 0, -0.8); v.add(R.vMuzzle);
  R.vFill = new THREE.PointLight(0xffa860, 0, 4, 2); R.vFill.position.set(0.6, 0.3, 0.2); v.add(R.vFill);
}

/* ─── Ciel nocturne : dégradé, étoiles, nuages, lune, crêtes lointaines, lueurs d'artillerie ─── */
function buildSky() {
  const K = M.env.sky;
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { uTime: { value: 0 }, uMoon: { value: MOON_DIR }, uFlash: { value: 0 }, uFlashDir: { value: new THREE.Vector2(0, -1) }, uFog: { value: FOG_COLOR }, uStorm: { value: 0.45 },
      uZen: { value: new THREE.Vector3(...K.zen) }, uDisk: { value: new THREE.Vector3(...K.disk) }, uDiskSize: { value: K.diskSize }, uHalo: { value: new THREE.Vector3(...K.halo) },
      uCloudA: { value: new THREE.Vector3(...K.cloudA) }, uCloudB: { value: new THREE.Vector3(...K.cloudB) }, uStars: { value: K.stars }, uRidge: { value: K.ridge }, uGlow: { value: new THREE.Vector3(...K.glow) }, uCover: { value: K.cover }, uFlashCol: { value: new THREE.Vector3(...K.flash) } },
    vertexShader: 'varying vec3 vDir; void main(){ vDir = normalize(position); vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0); gl_Position = p.xyww; }',
    fragmentShader: `uniform float uTime, uFlash, uStorm, uDiskSize, uStars, uRidge, uCover; uniform vec3 uMoon, uFog, uZen, uDisk, uHalo, uCloudA, uCloudB, uGlow, uFlashCol; uniform vec2 uFlashDir; varying vec3 vDir;
      float h1(vec3 p){ return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453); }
      float h2(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
      float n2(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f); return mix(mix(h2(i), h2(i+vec2(1,0)), f.x), mix(h2(i+vec2(0,1)), h2(i+vec2(1,1)), f.x), f.y); }
      float fb(vec2 p){ float s = 0.0, a = 0.5; for (int i = 0; i < 5; i++){ s += n2(p) * a; p *= 2.03; a *= 0.5; } return s; }
      void main(){
        vec3 d = normalize(vDir); float h = d.y;
        vec3 col = mix(uFog, uZen, smoothstep(-0.02, 0.5, h));
        // lueur d'horizon du côté de l'astre (couchant)
        vec2 hz = normalize(d.xz + 1e-4), mz = normalize(uMoon.xz + 1e-4);
        col += uGlow * pow(max(dot(hz, mz), 0.0), 3.0) * exp(-max(h, 0.0) * 5.0);
        // étoiles
        vec3 sp = d * 420.0; float s = h1(floor(sp));
        float star = step(0.9982, s) * smoothstep(0.04, 0.3, h) * (0.6 + 0.4 * sin(uTime * (2.0 + s * 9.0) + s * 60.0));
        col += vec3(0.75, 0.82, 1.0) * star * uStars;
        // lune et halo
        float md = max(dot(d, uMoon), 0.0);
        col += uDisk * smoothstep(uDiskSize, uDiskSize + (1.0 - uDiskSize) * 0.45, md);
        col += uHalo * (pow(md, 60.0) * 0.35 + pow(md, 6.0) * 0.06);
        // nuages
        vec2 cp = d.xz / (max(h, 0.0) + 0.18) * 1.3 + vec2(uTime * 0.006, uTime * 0.002);
        float c = fb(cp); float dens = smoothstep(0.42 - uStorm * 0.25, 0.85, c) * smoothstep(-0.02, 0.12, h) * uCover;
        vec3 cloud = mix(uCloudA, uCloudB, pow(md, 4.0) * 0.8 + c * 0.2);
        float fl = uFlash * pow(max(dot(normalize(d.xz + 1e-4), uFlashDir), 0.0), 3.0) * exp(-max(h, 0.0) * 5.0);
        cloud += uFlashCol * fl * 1.4;
        col = mix(col, cloud, dens * 0.92);
        col += uFlashCol * vec3(1.0, 0.9, 0.85) * fl * 0.25;
        // crêtes montagneuses à l'horizon
        float az = atan(d.z, d.x);
        float ridge = 0.035 + fb(vec2(az * 3.0, 1.7)) * 0.07 + fb(vec2(az * 11.0, 5.3)) * 0.02;
        col = mix(col, uFog * 0.62, smoothstep(ridge + 0.004, ridge - 0.004, h) * smoothstep(-0.05, 0.0, h) * uRidge);
        col = mix(col, uFog, smoothstep(0.02, -0.08, h));
        gl_FragColor = vec4(col, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
  const sky = new THREE.Mesh(new THREE.SphereGeometry(600, 32, 16), mat);
  sky.renderOrder = -10; sky.frustumCulled = false;
  R.scene.add(sky); R.sky = sky;
}

/* ─── Précipitations : neige, pluie, cendres ou poussière (particules sur GPU, enveloppant la caméra) ─── */
const PRECIP = {
  snow: { n: 1, color: [0.93, 0.96, 1.0], fall: 1, size: 1, opacity: 0.9, sway: 0.5, streak: 0 },
  rain: { n: 1.3, color: [0.62, 0.68, 0.76], fall: 9, size: 1.5, opacity: 0.55, sway: 0.05, streak: 1 },
  ash: { n: 0.6, color: [0.62, 0.55, 0.5], fall: 0.35, size: 0.8, opacity: 0.8, sway: 0.8, streak: 0 },
  dust: { n: 0.45, color: [1.0, 0.82, 0.55], fall: -0.02, size: 0.55, opacity: 0.5, sway: 0.35, streak: 0 },
};
function buildSnow() {
  const kind = M.env.precip; if (!kind) { R.snow = null; return; }
  const K = PRECIP[kind], N = Math.round(Q.snow * K.n), B = [46, 26, 46];
  const pos = new Float32Array(N * 3), rnd = new Float32Array(N);
  for (let i = 0; i < N; i++) { pos[i * 3] = Math.random() * B[0]; pos[i * 3 + 1] = Math.random() * B[1]; pos[i * 3 + 2] = Math.random() * B[2]; rnd[i] = Math.random(); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('aRand', new THREE.BufferAttribute(rnd, 1));
  // Masque des toits : rien ne tombe dans les abris.
  const roof = new Uint8Array(MAP_W * MAP_D); for (let i = 0; i < roof.length; i++) roof[i] = MAP.roof[i] || MAP.type[i] === T_BLOCK ? 255 : 0;
  const roofTex = new THREE.DataTexture(roof, MAP_W, MAP_D, THREE.RedFormat, THREE.UnsignedByteType); roofTex.needsUpdate = true;
  const mat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, fog: false,
    uniforms: { uTime: { value: 0 }, uCam: { value: new THREE.Vector3() }, uWind: { value: new THREE.Vector3(0.8, 0, 0.4) }, uRoof: { value: roofTex }, uMap: { value: new THREE.Vector2(MAP_W * TILE, MAP_D * TILE) }, uTex: { value: TEX.sprites.flake }, uOpacity: { value: K.opacity }, uSize: { value: K.size }, uFall: { value: 1 }, uPR: { value: 1 }, uColor: { value: new THREE.Vector3(...K.color) } },
    vertexShader: `uniform float uTime, uSize, uFall, uPR; uniform vec3 uCam, uWind; uniform sampler2D uRoof; uniform vec2 uMap; attribute float aRand; varying float vA;
      void main(){
        vec3 B = vec3(${B[0]}.0, ${B[1]}.0, ${B[2]}.0);
        vec3 p = position;
        p.y -= uTime * (${K.fall.toFixed(2)} * (0.9 + aRand * 0.8)) * uFall ${kind === 'dust' ? '+ sin(uTime * (0.3 + aRand * 0.4) + aRand * 50.0) * 0.6' : ''};
        p.x += uTime * uWind.x * (0.7 + aRand * 0.6) + sin(uTime * (0.6 + aRand) + aRand * 40.0) * ${K.sway.toFixed(2)};
        p.z += uTime * uWind.z * (0.7 + aRand * 0.6) + cos(uTime * (0.5 + aRand) + aRand * 27.0) * ${K.sway.toFixed(2)};
        p = mod(p - uCam + B * 0.5, B) - B * 0.5 + uCam;
        vec2 ruv = p.xz / uMap;
        float roofed = (ruv.x > 0.0 && ruv.y > 0.0 && ruv.x < 1.0 && ruv.y < 1.0) ? texture2D(uRoof, ruv).r : 0.0;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        float dist = -mv.z;
        vA = (1.0 - roofed * step(p.y, ${(ceilH() + 0.3).toFixed(2)})) * smoothstep(24.0, 8.0, dist) * smoothstep(0.15, 0.9, dist);
        gl_PointSize = uSize * uPR * (0.5 + aRand * 1.1) * 26.0 / max(dist, 0.1);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: `uniform sampler2D uTex; uniform float uOpacity; uniform vec3 uColor; varying float vA; void main(){
      ${K.streak ? 'vec2 q = gl_PointCoord - 0.5; float a = smoothstep(0.06, 0.0, abs(q.x)) * smoothstep(0.5, 0.2, abs(q.y));' : 'float a = texture2D(uTex, gl_PointCoord).a;'}
      gl_FragColor = vec4(uColor, a * vA * uOpacity); if (gl_FragColor.a < 0.01) discard; }`,
  });
  const pts = new THREE.Points(g, mat); pts.frustumCulled = false; pts.renderOrder = 5;
  R.scene.add(pts); R.snow = pts;
}

/* ─── Météo : vent, rafales, tempête ─── */
const WEATHER = { blizzard: 0, target: 0, gust: 0, windA: 0.6 };
function updateWeather(dt, time) {
  WEATHER.blizzard = damp(WEATHER.blizzard, WEATHER.target, 0.35, dt);
  const b = WEATHER.blizzard, gust = Math.max(0, fbm(time * 0.1, 7.7, 2) - 0.45) * 2.2, E = M.env;
  WEATHER.windA += (fbm(time * 0.02, 1.3, 2) - 0.5) * dt * 0.2;
  const ws = (0.7 + gust * 2 + b * 7) * (E.wind ?? 1);
  if (R.snow) {
    const u = R.snow.material.uniforms, K = PRECIP[E.precip];
    u.uTime.value = time; u.uCam.value.copy(R.camera.position);
    u.uWind.value.set(Math.cos(WEATHER.windA) * ws, 0, Math.sin(WEATHER.windA) * ws);
    u.uFall.value = 1 + b * 0.8; u.uOpacity.value = K.opacity * (0.85 + b * 0.3); u.uPR.value = R.pr;
  }
  R.scene.fog.density = E.fogDensity + b * E.stormFog;
  R.sky.material.uniforms.uStorm.value = 0.45 + b * 0.5;
  Sfx.setWind(clamp((gust * 0.4 + b) * (E.wind ?? 1), 0, 1.4));
}
