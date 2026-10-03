/* ═══════════════════ EFFETS : particules, impacts, douilles, feux, fusées éclairantes ═══════════════════ */

class Particles {
  constructor(max, tex, additive) {
    this.max = max; this.n = 0; this.cursor = 0;
    this.pos = new Float32Array(max * 3); this.col = new Float32Array(max * 3); this.size = new Float32Array(max); this.alpha = new Float32Array(max);
    this.vel = new Float32Array(max * 3); this.life = new Float32Array(max); this.maxLife = new Float32Array(max); this.grav = new Float32Array(max); this.drag = new Float32Array(max); this.grow = new Float32Array(max); this.a0 = new Float32Array(max);
    for (let i = 0; i < max; i++) this.pos[i * 3 + 1] = -999;
    const g = this.geo = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('color', new THREE.BufferAttribute(this.col, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('aSize', new THREE.BufferAttribute(this.size, 1).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('aAlpha', new THREE.BufferAttribute(this.alpha, 1).setUsage(THREE.DynamicDrawUsage));
    this.mat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending, fog: false,
      uniforms: { uTex: { value: tex }, uScale: { value: 600 }, uFogC: { value: FOG_COLOR }, uFogD: { value: 0.03 } },
      vertexShader: `attribute float aSize; attribute float aAlpha; attribute vec3 color; uniform float uScale, uFogD; varying vec3 vC; varying float vA; varying float vF;
        void main(){ vec4 mv = modelViewMatrix * vec4(position, 1.0); float d = -mv.z; gl_PointSize = aSize * uScale / max(d, 0.05); vC = color; vA = aAlpha; vF = 1.0 - exp(-uFogD * uFogD * d * d); gl_Position = projectionMatrix * mv; }`,
      fragmentShader: `uniform sampler2D uTex; uniform vec3 uFogC; varying vec3 vC; varying float vA; varying float vF;
        void main(){ vec4 t = texture2D(uTex, gl_PointCoord); float a = t.a * vA; if (a < 0.004) discard; ${additive ? 'gl_FragColor = vec4(vC * t.rgb * (1.0 - vF), a);' : 'gl_FragColor = vec4(mix(vC * t.rgb, uFogC, vF), a);'} }`,
    });
    this.points = new THREE.Points(g, this.mat); this.points.frustumCulled = false; this.points.renderOrder = additive ? 8 : 6;
    R.scene.add(this.points);
  }
  spawn(x, y, z, vx, vy, vz, life, size, r, g, b, alpha = 1, grav = 0, drag = 0, grow = 0) {
    const i = this.cursor; this.cursor = (this.cursor + 1) % this.max;
    const k = i * 3; this.pos[k] = x; this.pos[k + 1] = y; this.pos[k + 2] = z; this.vel[k] = vx; this.vel[k + 1] = vy; this.vel[k + 2] = vz;
    this.col[k] = r; this.col[k + 1] = g; this.col[k + 2] = b; this.size[i] = size; this.alpha[i] = alpha; this.a0[i] = alpha;
    this.life[i] = life; this.maxLife[i] = life; this.grav[i] = grav; this.drag[i] = drag; this.grow[i] = grow;
  }
  update(dt) {
    const { pos, vel, life, maxLife, alpha, a0, size, grav, drag, grow } = this;
    for (let i = 0; i < this.max; i++) {
      if (life[i] <= 0) { if (alpha[i] !== 0) { alpha[i] = 0; pos[i * 3 + 1] = -999; } continue; }
      life[i] -= dt; const k = i * 3, dr = 1 - drag[i] * dt;
      vel[k] *= dr; vel[k + 1] = vel[k + 1] * dr - grav[i] * dt; vel[k + 2] *= dr;
      pos[k] += vel[k] * dt; pos[k + 1] += vel[k + 1] * dt; pos[k + 2] += vel[k + 2] * dt;
      size[i] += grow[i] * dt;
      const t = life[i] / maxLife[i]; alpha[i] = a0[i] * Math.min(1, t * 3) * (life[i] > 0 ? 1 : 0);
    }
    const a = this.geo.attributes; a.position.needsUpdate = a.aAlpha.needsUpdate = a.aSize.needsUpdate = a.color.needsUpdate = true;
  }
}

const FX = { shake: 0, decals: [], decalIdx: 0, casings: [], tracers: [], flare: { t: 25, active: false }, flashT: 12 };
function initFX() {
  FX.soft = new Particles(settings.quality >= 2 ? 1800 : 900, TEX.sprites.smoke, false);
  FX.glow = new Particles(settings.quality >= 2 ? 1200 : 600, TEX.sprites.spark, true);
  // Décalcomanies (sang, impacts, brûlures).
  const dm = (tex, rough) => new THREE.MeshStandardMaterial({ map: tex, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4, roughness: rough });
  FX.decalMats = { blood: dm(TEX.sprites.blood, 0.35), hole: dm(TEX.sprites.hole, 0.9), scorch: dm(TEX.sprites.scorch, 1), spatter: dm(TEX.sprites.spatter, 0.3) };
  FX.decalMats.blood.color.set(0x8c8c8c); FX.decalMats.spatter.color.set(0xa0a0a0); // sang épais, plus sombre qu'en gouttelettes
  // Empreintes : réserve à part (elles ne chassent ni le sang ni les impacts), teinte selon le sol de la carte.
  const pm = dm(TEX.sprites.print, 1); pm.color.set(MAP_ID === 'filon' ? 0x24180f : 0x1a2232); pm.opacity = MAP_ID === 'filon' ? 0.6 : 0.85;
  FX.prints = []; FX.printIdx = 0;
  for (let i = 0; i < (settings.quality >= 2 ? 48 : 24); i++) { const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), pm); m.visible = false; m.renderOrder = 2; m.userData.dynamic = true; R.scene.add(m); FX.prints.push({ m, life: 0 }); }
  const pg = new THREE.PlaneGeometry(1, 1);
  // « dynamic » : sans ce drapeau, la fusion des objets fixes (lancée juste après) les avalait, et plus aucun impact, sang ni brûlure ne s'affichait.
  for (let i = 0; i < Q.decals; i++) { const m = new THREE.Mesh(pg, FX.decalMats.hole); m.visible = false; m.renderOrder = 2; m.receiveShadow = true; m.userData.dynamic = true; R.scene.add(m); FX.decals.push({ m, life: 0 }); }
  // Douilles.
  FX.casingMesh = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.006, 0.006, 0.028, 6), MATS.brass, 48); FX.casingMesh.frustumCulled = false; FX.casingMesh.castShadow = false; R.scene.add(FX.casingMesh);
  for (let i = 0; i < 48; i++) { FX.casings.push({ p: new THREE.Vector3(0, -99, 0), v: new THREE.Vector3(), r: new THREE.Euler(), w: new THREE.Vector3(), life: 0 }); FX.casingMesh.setMatrixAt(i, _m1.makeTranslation(0, -99, 0)); }
  FX.casingIdx = 0;
  // Traçantes.
  const tm = new THREE.MeshBasicMaterial({ color: 0xffd9a0, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
  for (let i = 0; i < 16; i++) { const m = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.02, 1), tm.clone()); m.visible = false; m.userData.dynamic = true; R.scene.add(m); FX.tracers.push({ m, life: 0 }); }
  // Fusée éclairante.
  FX.flare.sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: TEX.sprites.glow, color: 0xffe6d0, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
  FX.flare.sprite.scale.set(6, 6, 1); FX.flare.sprite.visible = false; R.scene.add(FX.flare.sprite);
  // Flammes (billboards additifs).
  for (const f of WORLD.fires) if (f.size > 0) {
    f.sprites = [];
    for (let k = 0; k < (f.big ? 5 : 3); k++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: TEX.sprites.flame, color: 0xffffff, blending: THREE.AdditiveBlending, depthWrite: false })); s.center.set(0.5, 0.1); R.scene.add(s); f.sprites.push({ s, ph: Math.random() * 10, ox: rand(-0.3, 0.3) * f.size, oz: rand(-0.3, 0.3) * f.size }); }
  }
  updateParticleScale();
}
function updateParticleScale() {
  const h = R.renderer.domElement.height, s = h / (2 * Math.tan(THREE.MathUtils.degToRad(R.camera.fov) / 2));
  if (FX.soft) { FX.soft.mat.uniforms.uScale.value = s; FX.glow.mat.uniforms.uScale.value = s; }
}

/* ─── Générateurs d'effets ─── */
function fxBlood(p, dir, amount = 1, frozen = false) {
  const n = (8 + amount * 10) | 0;
  for (let i = 0; i < n; i++) {
    const s = rand(1, 4.5) * amount;
    const c = frozen ? [0.75, 0.88, 1] : [rand(0.28, 0.45), 0.015, 0.02];
    FX.soft.spawn(p.x, p.y, p.z, dir.x * s + rand(-1.4, 1.4), dir.y * s + rand(-0.5, 2), dir.z * s + rand(-1.4, 1.4), rand(0.35, 0.9), rand(0.03, 0.09), c[0], c[1], c[2], 0.95, 9, 1.5, 0.05);
  }
  FX.soft.spawn(p.x, p.y, p.z, dir.x * 0.4, 0.2, dir.z * 0.4, 0.5, 0.25 * amount, frozen ? 0.8 : 0.35, frozen ? 0.9 : 0.02, frozen ? 1 : 0.03, 0.5, 0, 2, 0.5);
  if (Math.random() < 0.45 * amount) {
    // Gouttes projetées au sol dans l'axe du tir (la vraie flaque se forme sous le corps, voir bloodPool).
    const k = rand(0.4, 1.6), gx = p.x + dir.x * k, gz = p.z + dir.z * k, gy = groundAt(gx, gz);
    addDecal(frozen ? 'hole' : 'blood', _v1.set(gx, gy + 0.035, gz), _v2.set(0, 1, 0), rand(0.22, 0.5) * Math.min(1.4, amount), 90);
  }
}
function fxImpact(p, n, mat) {
  const col = mat === 'wood' ? [0.35, 0.26, 0.17] : mat === 'metal' ? [0.4, 0.4, 0.42] : mat === 'concrete' ? [0.55, 0.55, 0.56] : [0.42, 0.36, 0.3];
  const snowy = mat === 'earth' && n.y > 0.5;
  for (let i = 0; i < 7; i++) FX.soft.spawn(p.x, p.y, p.z, n.x * rand(0.5, 2.5) + rand(-0.6, 0.6), n.y * rand(0.5, 2.5) + rand(0, 1.2), n.z * rand(0.5, 2.5) + rand(-0.6, 0.6), rand(0.3, 0.7), rand(0.02, 0.05), snowy ? 0.9 : col[0], snowy ? 0.92 : col[1], snowy ? 0.96 : col[2], 1, 8, 1);
  FX.soft.spawn(p.x + n.x * 0.05, p.y + n.y * 0.05, p.z + n.z * 0.05, n.x * 0.5, 0.25, n.z * 0.5, rand(0.35, 0.65), 0.1, snowy ? 0.85 : col[0] * 1.15, snowy ? 0.88 : col[1] * 1.15, snowy ? 0.92 : col[2] * 1.15, 0.38, 0, 2.2, 0.4);
  if (mat === 'metal' || mat === 'concrete') for (let i = 0; i < 6; i++) FX.glow.spawn(p.x, p.y, p.z, n.x * rand(1, 5) + rand(-2, 2), n.y * rand(1, 4) + rand(0, 3), n.z * rand(1, 5) + rand(-2, 2), rand(0.1, 0.3), 0.04, 1, 0.75, 0.4, 1, 12, 0.5);
  addDecal('hole', p, n, rand(0.07, 0.12), 40);
  Sfx.impact(p, mat);
}
// Poudre sans fumée : une bouffée légère, poussée à 50 cm devant l'arme pour ne pas voiler la visée.
function fxMuzzleSmoke(p, dir, heavy = false) {
  if (!heavy && Math.random() < 0.5) return;
  FX.soft.spawn(p.x + dir.x * 0.5, p.y + dir.y * 0.5, p.z + dir.z * 0.5, dir.x * rand(0.6, 1.4) + rand(-0.15, 0.15), rand(0.15, 0.45), dir.z * rand(0.6, 1.4) + rand(-0.15, 0.15), rand(0.35, 0.7), 0.06, 0.62, 0.62, 0.64, heavy ? 0.2 : 0.11, -0.2, 1.6, 0.35);
}
function fxExplosion(p, radius = 5) {
  for (let i = 0; i < 40; i++) { const a = rand(TAU), e = rand(-0.2, 1), s = rand(2, 9); FX.glow.spawn(p.x, p.y + 0.2, p.z, Math.cos(a) * s * (1 - Math.abs(e) * 0.5), e * s + 2, Math.sin(a) * s * (1 - Math.abs(e) * 0.5), rand(0.15, 0.45), rand(0.3, 0.9), 1, rand(0.45, 0.8), 0.25, 1, 2, 3, 1.5); }
  for (let i = 0; i < 26; i++) FX.soft.spawn(p.x + rand(-1, 1), p.y + rand(0, 1.5), p.z + rand(-1, 1), rand(-1.5, 1.5), rand(0.5, 3), rand(-1.5, 1.5), rand(1.5, 3.5), rand(0.6, 1.4), 0.18, 0.17, 0.16, 0.7, -0.3, 1.2, 1.6);
  for (let i = 0; i < 30; i++) FX.soft.spawn(p.x, p.y + 0.2, p.z, rand(-5, 5), rand(3, 10), rand(-5, 5), rand(0.8, 1.6), rand(0.04, 0.1), 0.3, 0.25, 0.2, 1, 14, 0.3);
  for (let i = 0; i < 20; i++) FX.glow.spawn(p.x, p.y + 0.2, p.z, rand(-8, 8), rand(2, 12), rand(-8, 8), rand(0.5, 1.4), 0.05, 1, 0.7, 0.3, 1, 12, 0.2);
  addDecal('scorch', _v1.set(p.x, groundAt(p.x, p.z) + 0.03, p.z), _v2.set(0, 1, 0), radius * 0.7, 120);
  const L = R.lights.blast; L.color.setHex(0xffa050); L.position.set(p.x, p.y + 1.2, p.z); L.intensity = 260; FX.blastI = 260; FX.blastD = 0.35; FX.blastT = 0.35;
  shakeAt(p, 1.2, radius * 3.2);
  Sfx.explosion(p);
}
// Gerbe de sol (neige, sable, poussière selon la carte).
function fxSnowBurst(p, n = 22) {
  const c = M.env.burst || [0.9, 0.93, 0.98];
  for (let i = 0; i < n; i++) FX.soft.spawn(p.x + rand(-0.5, 0.5), p.y + rand(0, 0.4), p.z + rand(-0.5, 0.5), rand(-1.2, 1.2), rand(1, 4), rand(-1.2, 1.2), rand(0.6, 1.4), rand(0.08, 0.22), c[0], c[1], c[2], 0.9, 7, 1.2, 0.3);
}
function fxIce(p) {
  for (let i = 0; i < 30; i++) FX.glow.spawn(p.x + rand(-0.3, 0.3), p.y + rand(-0.6, 0.6), p.z + rand(-0.3, 0.3), rand(-4, 4), rand(0, 5), rand(-4, 4), rand(0.4, 1), rand(0.04, 0.1), 0.55, 0.85, 1, 1, 12, 0.6);
  for (let i = 0; i < 16; i++) FX.soft.spawn(p.x, p.y, p.z, rand(-2, 2), rand(0, 2), rand(-2, 2), rand(0.8, 1.6), rand(0.15, 0.35), 0.8, 0.9, 1, 0.6, 0.5, 1.5, 0.4);
}
function fxSparks(p, n = 4, dir) {
  for (let i = 0; i < n; i++) FX.glow.spawn(p.x, p.y, p.z, (dir ? dir.x : 0) * 3 + rand(-2, 2), rand(0.5, 3), (dir ? dir.z : 0) * 3 + rand(-2, 2), rand(0.2, 0.5), 0.03, 1, 0.8, 0.4, 1, 10, 0.3);
}
function fxBreath(cam) {
  cam.getWorldDirection(_v1);
  const x = cam.position.x + _v1.x * 0.35, y = cam.position.y - 0.12, z = cam.position.z + _v1.z * 0.35;
  for (let i = 0; i < 6; i++) FX.soft.spawn(x + rand(-0.03, 0.03), y, z + rand(-0.03, 0.03), _v1.x * rand(0.3, 0.7) + rand(-0.1, 0.1), rand(0.05, 0.2), _v1.z * rand(0.3, 0.7) + rand(-0.1, 0.1), rand(0.8, 1.4), 0.06, 0.92, 0.95, 1, 0.16, -0.05, 1.4, 0.18);
}
function addDecal(type, p, n, size, life, rot = rand(TAU)) {
  const d = FX.decals[FX.decalIdx]; FX.decalIdx = (FX.decalIdx + 1) % FX.decals.length;
  if (!d) return null;
  d.m.material = FX.decalMats[type]; d.m.visible = true; d.life = life; d.maxLife = life; d.grow = null;
  d.m.position.copy(p).addScaledVector(n, 0.012);
  _v3.copy(p).add(n); d.m.lookAt(_v3); d.m.rotateZ(rot); d.m.scale.set(size, size, 1);
  return d;
}
// Un obstacle disparaît (porte ouverte, éboulis dégagé, machine déplacée) : ses impacts et éclaboussures partent avec lui
// au lieu de flotter dans le vide. Le sang au sol reste.
function decalsOff(x0, z0, x1, z1, m = 0.08) {
  for (const d of FX.decals || []) if (d.life > 0) { const p = d.m.position; if (p.y > 0.12 && p.x > x0 - m && p.x < x1 + m && p.z > z0 - m && p.z < z1 + m) { d.life = 0; d.m.visible = false; } }
}
const decalsOffObj = (o) => { if (!o) return; const b = new THREE.Box3().setFromObject(o); if (!b.isEmpty()) decalsOff(b.min.x, b.min.z, b.max.x, b.max.z); };
// Flaque sous un corps : s'étale en quelques secondes (le sang s'écoule), puis reste après que le corps a disparu.
function bloodPool(x, z, size) {
  const d = addDecal('blood', _v1.set(x, groundAt(x, z) + 0.036, z), _v2.set(0, 1, 0), 0.1, 75);
  if (d) d.grow = { t: 0, T: rand(5, 8), to: size };
}
// Empreinte de pas (neige, terre battue) : alternée gauche/droite, orientée dans le sens de la marche.
function addPrint(x, z, yaw, side) {
  const d = FX.prints && FX.prints[FX.printIdx]; if (!d) return; FX.printIdx = (FX.printIdx + 1) % FX.prints.length;
  const px = x + Math.cos(yaw) * 0.11 * side, pz = z - Math.sin(yaw) * 0.11 * side;
  d.m.position.set(px, groundAt(px, pz) + 0.035, pz); /* au-dessus des bosses du sol (±2 cm) : l'écart ne se voit pas à hauteur d'yeux */ d.m.rotation.set(-Math.PI / 2, 0, yaw + rand(-0.08, 0.08)); d.m.scale.set(0.14, 0.32, 1); d.m.visible = true; d.life = 40;
}
function spawnCasing(p, dir, right, shell) {
  const c = FX.casings[FX.casingIdx]; FX.casingIdx = (FX.casingIdx + 1) % FX.casings.length;
  c.p.copy(p); c.v.copy(right).multiplyScalar(rand(1.5, 2.6)).addScaledVector(dir, rand(-0.3, 0.3)); c.v.y += rand(1.2, 2.2);
  c.w.set(rand(-20, 20), rand(-20, 20), rand(-20, 20)); c.life = 3.5; c.shell = shell; c.bounced = 0;
  // Hauteur du tireur au-dessus du terrain (caisse, toit, passerelle) : les douilles tombent à ses pieds, relief compris.
  const fh = (x, z) => (M.floorH ? M.floorH(x, z) : 0); c.dh = Math.max(0, propSupport(P.pos, 0.3, P.pos.y + 0.05, 0.3) - fh(P.pos.x, P.pos.z));
}
// Sol sous une douille : relief de la carte, et caillebotis des boyaux du Poste 7 (bande d'un mètre au centre, dessus à 11 cm).
function casingFloor(x, z) {
  let y = M.floorH ? M.floorH(x, z) : 0;
  if (MAP_ID === 'poste7') {
    const tx = tileOf(x), tz = tileOf(z);
    if (inMap(tx, tz) && (MAP.style[ti(tx, tz)] === STYLE_TRENCH || tType(tx, tz) === T_DOOR) && Math.min(Math.abs(x - tcx(tx)), Math.abs(z - tcx(tz))) < 0.45) y = Math.max(y, 0.112);
  }
  return y;
}
function fireTracer(from, to, col = 0xffd9a0, w = 1, life = 0.05, full = false) {
  const t = FX.tracers.find((q) => q.life <= 0); if (!t) return;
  const len = from.distanceTo(to); t.m.position.copy(from).lerp(to, 0.5); t.m.lookAt(to); t.m.scale.set(w, w, full ? len : Math.min(len, 14)); t.m.visible = true; t.life = t.max = life; t.m.material.opacity = 0.9; t.m.material.color.setHex(col);
}
// Décharge : anneau d'éclairs bleus autour du soldat.
function fxShockRing(p, rad) {
  const y = p.y + 0.4;
  for (let i = 0; i < 46; i++) { const a = rand(TAU), r = rand(0.3, rad); FX.glow.spawn(p.x + Math.cos(a) * r, y + rand(0, 1.2), p.z + Math.sin(a) * r, Math.cos(a) * rand(1, 4), rand(0.5, 3), Math.sin(a) * rand(1, 4), rand(0.15, 0.4), rand(0.04, 0.12), 0.55, 0.75, 1, 1, 4, 0.6); }
  for (let i = 0; i < 12; i++) { const a = i / 12 * TAU; FX.soft.spawn(p.x + Math.cos(a) * rad * 0.7, y, p.z + Math.sin(a) * rad * 0.7, Math.cos(a) * 3, 0.4, Math.sin(a) * 3, 0.5, rand(0.3, 0.5), 0.5, 0.7, 1, 0.6, -0.1, 1.4, 0.8); }
  const L = R.lights.blast; L.color.setHex(0x70a8ff); L.position.set(p.x, y + 0.8, p.z); FX.blastI = 90; FX.blastD = 0.25; FX.blastT = 0.25; L.intensity = 90;
}
// Rayonneur : trait vert, gerbe d'énergie et lueur à l'impact.
function fxRay(from, to, up) {
  const col = up ? 0xff5a40 : 0x5dff6a, c = up ? [1, 0.4, 0.3] : [0.4, 1, 0.45];
  fireTracer(from, to, col, 4.5, 0.12, true);
  for (let i = 0; i < 18; i++) FX.glow.spawn(to.x, to.y, to.z, rand(-3.5, 3.5), rand(-1, 4), rand(-3.5, 3.5), rand(0.25, 0.6), rand(0.05, 0.14), c[0], c[1], c[2], 1, 6, 0.8);
  for (let i = 0; i < 6; i++) FX.soft.spawn(to.x, to.y, to.z, rand(-1, 1), rand(0.2, 1.2), rand(-1, 1), rand(0.5, 0.9), rand(0.3, 0.6), c[0] * 0.8, c[1] * 0.8, c[2] * 0.8, 0.5, -0.2, 1.5, 0.8);
  const L = R.lights.blast; L.color.setHex(col); L.position.copy(to); L.position.y += 0.4; FX.blastI = 70; FX.blastD = 0.2; FX.blastT = 0.2; L.intensity = 70;
}
function shakeAt(p, amt, radius) { const d = R.camera.position.distanceTo(p); FX.shake = Math.max(FX.shake, amt * clamp(1 - d / radius, 0, 1)); }

function updateFX(dt, time) {
  FX.soft.update(dt); FX.glow.update(dt);
  const fogD = R.scene.fog.density; FX.soft.mat.uniforms.uFogD.value = fogD; FX.glow.mat.uniforms.uFogD.value = fogD;
  for (const d of FX.decals) if (d.life > 0) {
    d.life -= dt; if (d.life <= 0) { d.m.visible = false; continue; }
    if (d.grow) { const g = d.grow; g.t += dt; const s = 0.1 + (g.to - 0.1) * (1 - (1 - Math.min(1, g.t / g.T)) ** 2.5); d.m.scale.set(s, s, 1); if (g.t >= g.T) d.grow = null; }
    else if (d.life < 5) d.m.scale.multiplyScalar(1 - dt * 0.1);
  }
  for (const d of FX.prints || []) if (d.life > 0) { d.life -= dt; if (d.life <= 0) d.m.visible = false; else if (d.life < 6) d.m.scale.multiplyScalar(1 - dt * 0.12); }
  // Douilles : chute, rebonds, tintement.
  for (let i = 0; i < FX.casings.length; i++) {
    const c = FX.casings[i]; if (c.life <= 0) continue;
    c.life -= dt; c.v.y -= 9.8 * dt; c.p.addScaledVector(c.v, dt);
    const floorY = casingFloor(c.p.x, c.p.z) + (c.dh || 0) + (c.shell ? 0.015 : 0.007); // couchée, pas en lévitation
    if (c.p.y < floorY) { c.p.y = floorY; if (c.v.y < -0.6 && c.bounced < 2) { c.v.y *= -0.35; c.v.x *= 0.5; c.v.z *= 0.5; c.bounced++; if (c.bounced === 1) Sfx.casing(c.p, c.shell); } else { c.v.set(0, 0, 0); c.w.set(0, 0, 0); c.r.x = Math.PI / 2; c.r.y = 0; } }
    c.r.x += c.w.x * dt; c.r.y += c.w.y * dt; c.r.z += c.w.z * dt;
    _q1.setFromEuler(c.r); _m1.compose(c.p, _q1, _v2.set(c.shell ? 2.4 : 1, c.shell ? 1.9 : 1, c.shell ? 2.4 : 1));
    if (c.life <= 0) _m1.makeTranslation(0, -99, 0);
    FX.casingMesh.setMatrixAt(i, _m1);
  }
  FX.casingMesh.instanceMatrix.needsUpdate = true;
  for (const t of FX.tracers) if (t.life > 0) { t.life -= dt; t.m.material.opacity = Math.max(0, t.life / (t.max || 0.05)) * 0.9; if (t.life <= 0) t.m.visible = false; }
  // Lumière d'explosion.
  if (FX.blastT > 0) { FX.blastT -= dt; R.lights.blast.intensity = Math.max(0, FX.blastT / (FX.blastD || 0.35)) * (FX.blastI || 260); }
  // Feux : flammes, braises, fumée, lumière vacillante.
  for (const f of WORLD.fires) {
    f.t += dt;
    const fl = 0.75 + fbm(time * 4 + f.x, f.z, 2) * 0.5;
    if (f.light) f.light.intensity = f.light.userData.base * fl;
    if (f.sprites) for (const s of f.sprites) { const k = 0.8 + Math.sin(time * 9 + s.ph) * 0.15 + fbm(time * 3 + s.ph, 1, 2) * 0.3; s.s.position.set(f.x + s.ox, f.y - 0.25 * f.size, f.z + s.oz); s.s.scale.set(f.size * 0.9 * k, f.size * 1.6 * k, 1); }
    if (f.size > 0 && Math.random() < dt * 30 * f.size) FX.glow.spawn(f.x + rand(-0.2, 0.2) * f.size, f.y, f.z + rand(-0.2, 0.2) * f.size, rand(-0.3, 0.3), rand(1, 2.5), rand(-0.3, 0.3), rand(0.6, 1.4), 0.03, 1, 0.6, 0.2, 1, -0.5, 0.5);
    if (f.smoke && Math.random() < dt / f.rate) FX.soft.spawn(f.x + rand(-0.2, 0.2), f.y + (f.size > 0 ? f.size : 0), f.z + rand(-0.2, 0.2), rand(-0.2, 0.2) + 0.3, rand(0.6, 1.4), rand(-0.2, 0.2), rand(3, 6), f.big ? 1.2 : 0.35, 0.12, 0.12, 0.13, f.big ? 0.5 : 0.35, -0.12, 0.3, f.big ? 1.2 : 0.5);
  }
  // Projecteurs.
  for (const b of WORLD.beams) { b.head.rotation.y = Math.PI + Math.sin(time * 0.17 + b.ph) * 0.95; b.head.rotation.x = 0.28 + Math.sin(time * 0.11 + b.ph * 2) * 0.12; }
  // Fusées éclairantes au-dessus du no man's land.
  const F = FX.flare;
  if (M.env.flares) {
    F.t -= dt;
    if (!F.active && F.t <= 0) { F.active = true; F.life = 0; F.x = rand(0, 80); F.z = rand(-40, -8); F.red = Math.random() < 0.3; F.sprite.material.color.set(F.red ? 0xff7a66 : 0xffeede); R.lights.flare.color.set(F.red ? 0xff6a50 : 0xffe8d8); F.sprite.visible = true; }
    if (F.active) {
      F.life += dt; const up = Math.min(1, F.life / 2.2), y = F.life < 2.2 ? lerp(WALL_H, 48, smooth(up)) : 48 - (F.life - 2.2) * 1.4;
      F.sprite.position.set(F.x + F.life * 0.4, y, F.z); R.lights.flare.position.copy(F.sprite.position);
      const on = F.life > 2 ? clamp(1 - (F.life - 26) / 3, 0, 1) : 0.2, flick = 0.85 + Math.random() * 0.15;
      R.lights.flare.intensity = on * flick * 3200; F.sprite.material.opacity = Math.max(0.15, on) * flick;
      if (Math.random() < dt * 8) FX.soft.spawn(F.sprite.position.x, y, F.z, 0, 0.1, 0, 4, 0.8, 0.5, 0.5, 0.52, 0.2 * on, 0, 0.1, 0.4);
      if (F.life > 29) { F.active = false; F.sprite.visible = false; R.lights.flare.intensity = 0; F.t = rand(35, 80); }
    }
  }
  // Lueurs d'artillerie sur l'horizon.
  // (artillerie à Poste 7, éclairs d'orage ailleurs : réglés par la carte)
  const FL = M.env.flashes;
  if (FL) {
    FX.flashT -= dt * (1 + WEATHER.blizzard * (FL.storm || 0));
    if (FX.flashT <= 0) { FX.flashT = rand(FL.min, FL.max); R.flash = FL.power || 1; const a = rand(FL.a0, FL.a1); R.sky.material.uniforms.uFlashDir.value.set(Math.cos(a), Math.sin(a)); if (FL.thunder) Sfx.thunder?.(rand(0.6, 2.6)); }
  }
  R.flash = Math.max(0, R.flash - dt * (FL?.decay || 1.6)); R.sky.material.uniforms.uFlash.value = R.flash * (0.6 + Math.random() * 0.4);
  R.sky.material.uniforms.uTime.value = time;
  if (WORLD.water) { WORLD.water.nm.offset.x += dt * WORLD.water.speed; WORLD.water.nm.offset.y += dt * WORLD.water.speed * 0.6; }
  // Objets clignotants et rotatifs.
  for (const b of WORLD.blink) b.m.visible = Math.sin(time * b.rate * TAU) > 0;
  for (const s of WORLD.spin) s.obj.rotation[s.axis] += s.speed * dt;
  FX.shake = Math.max(0, FX.shake - dt * 2.2);
}
