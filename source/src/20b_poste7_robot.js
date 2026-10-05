/* ═══════════════════ POSTE 7 — LE GÉANT D'ACIER (silhouette au loin, dans le brouillard) ═══════════════════ */

const ROBOT = { g: null, mats: [], legs: [], t: 40, dir: 1, phase: 0, lastSin: 0, eye: null, beam: null, body: null, arms: [] };

function buildRobot() {
  const g = new THREE.Group(); g.userData.dynamic = true; R.scene.add(g); ROBOT.g = g; // animé : jamais fondu dans le décor statique
  // Matière « silhouette » : non brouillardée, teinte recalculée à chaque image à partir du brouillard.
  const mat = new THREE.MeshBasicMaterial({ color: 0x0e141b, fog: false }), dark = mat; // une seule matière : une silhouette, peu d'appels de dessin
  ROBOT.mats = [[mat, 0.55]];
  const box = (w, h, d, m, x, y, z, parent) => { const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); o.position.set(x, y, z); o.castShadow = o.receiveShadow = false; o.frustumCulled = true; parent.add(o); return o; };
  const cyl = (r0, r1, h, m, x, y, z, parent, seg = 10) => { const o = new THREE.Mesh(new THREE.CylinderGeometry(r0, r1, h, seg), m); o.position.set(x, y, z); parent.add(o); return o; };
  const body = new THREE.Group(); body.position.y = 21; g.add(body); ROBOT.body = body;
  // Bassin, torse en caisson riveté, cheminées dorsales.
  box(8, 3, 5, dark, 0, 0, 0, body);
  box(11, 11, 8, mat, 0, 7.5, 0, body);
  box(13, 3, 9, dark, 0, 12.5, 0, body);
  box(7, 5, 1, dark, 0, 7, 4.4, body);
  cyl(0.9, 1.1, 8, dark, -3, 15, -3.2, body); cyl(0.9, 1.1, 9, dark, 2.6, 15.5, -3.2, body);
  // Tête : cabine de commandement et œil-projecteur.
  const head = new THREE.Group(); head.position.set(0, 16, 1.5); body.add(head);
  box(5, 3.6, 4.6, mat, 0, 0, 0, head); box(5.6, 0.8, 5.2, dark, 0, 2.1, 0, head);
  const eye = new THREE.Sprite(new THREE.SpriteMaterial({ map: TEX.sprites.glow, color: 0xffa24a, blending: THREE.AdditiveBlending, depthWrite: false, fog: false, transparent: true }));
  eye.scale.set(9, 9, 1); eye.position.set(0, 0.2, 2.6); head.add(eye); ROBOT.eye = eye;
  // Faisceau du projecteur : cône additif très léger qui balaie le sol.
  const beamGeo = new THREE.CylinderGeometry(0.6, 9, 60, 20, 1, true); beamGeo.translate(0, -30, 0); beamGeo.rotateX(-Math.PI / 2);
  const fade = textTexture(8, 128, (x, w, h) => { const gr = x.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#fff'); gr.addColorStop(0.35, '#555'); gr.addColorStop(1, '#000'); x.fillStyle = gr; x.fillRect(0, 0, w, h); });
  const beam = new THREE.Mesh(beamGeo, new THREE.MeshBasicMaterial({ color: 0xffc080, alphaMap: fade, transparent: true, opacity: 0.1, blending: THREE.AdditiveBlending, depthWrite: false, fog: false, side: THREE.DoubleSide }));
  beam.position.set(0, 0, 2.4); head.add(beam); ROBOT.beam = beam; ROBOT.head = head;
  // Bras : épaule, bras, avant-bras-canon.
  for (const s of [-1, 1]) {
    const arm = new THREE.Group(); arm.position.set(s * 7.2, 11, 0); body.add(arm);
    box(3.2, 3.2, 3.6, dark, 0, 0, 0, arm);
    box(2, 10, 2, mat, 0, -6, 0, arm);
    const fore = new THREE.Group(); fore.position.set(0, -11, 0); arm.add(fore);
    box(2.6, 9, 2.6, mat, 0, -4.5, 0, fore); cyl(0.7, 0.7, 4, dark, 0, -10, 0.4, fore, 8);
    ROBOT.arms.push({ arm, fore, s });
  }
  // Jambes : cuisse, genou, tibia, pied.
  for (const s of [-1, 1]) {
    const hip = new THREE.Group(); hip.position.set(s * 3, 21, 0); g.add(hip);
    box(2.6, 11, 2.6, mat, 0, -5.5, 0, hip);
    const knee = new THREE.Group(); knee.position.set(0, -11, 0); hip.add(knee);
    box(3.2, 2.4, 3.2, dark, 0, 0, 0, knee);
    box(2.2, 10, 2.2, mat, 0, -5.2, 0, knee);
    box(4.5, 1.4, 7, dark, 0, -10.2, 1.2, knee);
    ROBOT.legs.push({ hip, knee, s });
  }
  for (const o of [body, head, ...ROBOT.arms.flatMap((a) => [a.arm, a.fore]), ...ROBOT.legs.flatMap((l) => [l.hip, l.knee])]) mergeGroup(o);
  g.scale.setScalar(1.45); g.rotation.y = Math.PI / 2; ROBOT.t = 40; ROBOT.dir = 1; ROBOT.phase = 0; ROBOT.lastSin = 0;
}

// Marche le long de l'horizon nord, fait demi-tour au bout, fait trembler le sol à chaque pas.
function robotAnim(dt, time) {
  const r = ROBOT; if (!r.g) return;
  const X0 = -170, X1 = 250, Z = -118, speed = 3.4, stride = 14.5;
  r.t += dt * speed * r.dir;
  if (r.t > X1 - X0) { r.t = X1 - X0; r.dir = -1; } else if (r.t < 0) { r.t = 0; r.dir = 1; }
  r.phase += dt * speed / stride * Math.PI;
  const ph = r.phase, sn = Math.sin(ph);
  const x = X0 + r.t, bob = Math.abs(sn) * 0.9;
  r.g.position.set(x, WALL_H - 1.5 - bob * 0.2, Z + Math.sin(r.t * 0.01) * 6);
  r.g.rotation.y = damp(r.g.rotation.y, r.dir > 0 ? Math.PI / 2 : -Math.PI / 2, 0.4, dt);
  for (const L of r.legs) {
    const s = L.s * sn;
    L.hip.rotation.x = -s * 0.42; L.knee.rotation.x = Math.max(0, s) * 0.55 + 0.05;
  }
  r.body.position.y = 21 + bob * 0.6; r.body.rotation.z = sn * 0.03; r.body.rotation.y = Math.sin(ph * 0.5) * 0.04;
  for (const A of r.arms) { A.arm.rotation.x = A.s * sn * 0.22; A.fore.rotation.x = -0.35 - Math.abs(sn) * 0.1; }
  r.head.rotation.y = Math.sin(time * 0.21 + r.t * 0.02) * 0.5; r.head.rotation.x = 0.42 + Math.sin(time * 0.13) * 0.08;
  // Teinte : un peu plus sombre que le brouillard ; disparaît dans la tempête.
  const fc = R.scene.fog.color, bl = WEATHER.blizzard || 0;
  for (const [m, k] of r.mats) m.color.copy(fc).multiplyScalar(lerp(k, 1, bl));
  r.eye.material.opacity = (0.85 + Math.sin(time * 7) * 0.08) * (1 - bl * 0.8);
  r.beam.material.opacity = 0.1 * (1 - bl);
  // Pas : grondement sourd et léger tremblement si l'on est assez près.
  if (Math.sign(sn) !== Math.sign(r.lastSin) && r.lastSin !== 0) {
    const d = Math.hypot(R.camera.position.x - x, R.camera.position.z - Z);
    if (d < 320) { const k = 1 - d / 320; Sfx.stomp?.(k, clamp((x - R.camera.position.x) / 120, -1, 1)); if (G.mode === 'playing') FX.shake = Math.max(FX.shake, 0.06 * k); }
  }
  r.lastSin = sn;
}

/* ─── No man's land : char losange abattu, canon de campagne à l'arrière ─── */
function buildPoste7Extras() {
  // Plaques d'acier rivetées peintes du char et du canon : peinture militaire écaillée (famille olive, teinte gardée).
  const steel = fmat('olive', 0x4a4a3e, { rough: 0.8, metal: 0.15, snow: 0.8 }), rust = MATS.rust, dark = MATS.char;
  // Char : deux flancs losanges (chenilles), caisse centrale, tourelles latérales, canons.
  { const x = 62, z = -12, y = surfH(x, z) - 0.6, g = new THREE.Group(); g.position.set(x, y, z); g.rotation.set(0.06, -0.5, 0.1); R.scene.add(g);
    const side = new THREE.Shape(); side.moveTo(-4, 0.6); side.lineTo(-2.6, 0); side.lineTo(2.6, 0); side.lineTo(4.2, 1.6); side.lineTo(3.9, 2.5); side.lineTo(-2.2, 2.5); side.closePath();
    for (const s of [-1, 1]) { mesh(vExtrude(side, 0.62, 0.04, 4), steel, 0, 0, s * 1.35, 0, g); const tr = new Batch(boxG(0.3, 0.06, 0.66), rust); for (let i = 0; i < 26; i++) { const t = i / 26, px = lerp(-2.6, 2.6, t); tr.add(px, 0.01, s * 1.35); } tr.build(g);
      const sp = mesh(boxG(1.4, 1.0, 0.7), steel, 0.2, 1.4, s * 1.95, 0, g); const gun = mesh(new THREE.CylinderGeometry(0.07, 0.07, 1.4, 8), dark, 0.9, 1.45, s * 2.2, 0, g); gun.rotation.z = Math.PI / 2 + s * 0.2; }
    mesh(boxG(5.2, 1.7, 2.1), steel, 0.2, 1.5, 0, 0, g); mesh(boxG(1.4, 0.7, 1.4), steel, 1.6, 2.65, 0, 0, g);
    for (let i = 0; i < 6; i++) mesh(boxG(0.06, 0.06, 2.1), rust, -2 + i * 0.8, 2.37, 0, 0, g);
    WORLD.fires.push({ x: x + 0.5, y: y + 2.4, z, size: 0.6, rate: 0.06, t: 0, smoke: 0.12 }); }
  // Canon de campagne : roues à rayons, bouclier, fût, flèche.
  { const x = 34, z = 68, y = surfH(x, z), g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = 0.15; R.scene.add(g);
    // Roues à rayons et flèche de l'affût : bois brut grisé par les intempéries (famille boisBrut, clarté gardée).
    const wood = fmat('boisBrut', 0x5a4632, { rough: 0.9, snow: 0.8 });
    for (const s of [-1, 1]) { const w = mesh(new THREE.TorusGeometry(0.62, 0.05, 6, 20), wood, 0, 0.67, s * 0.85, 0, g); for (let i = 0; i < 6; i++) { const sp = mesh(boxG(0.04, 1.2, 0.04), wood, 0, 0.67, s * 0.85, 0, g); sp.rotation.z = (i / 6) * Math.PI; } }
    mesh(new THREE.CylinderGeometry(0.06, 0.06, 1.9, 8), steel, 0, 0.67, 0, 0, g).rotation.x = Math.PI / 2;
    const sh = mesh(boxG(0.06, 1.1, 1.6), steel, 0.25, 1.0, 0, 0, g); sh.rotation.z = -0.15;
    const barrel = mesh(new THREE.CylinderGeometry(0.075, 0.1, 2.4, 10), steel, 1.3, 1.05, 0, 0, g); barrel.rotation.z = Math.PI / 2 - 0.18;
    const trail = mesh(boxG(2.6, 0.14, 0.2), wood, -1.4, 0.4, 0, 0, g); trail.rotation.z = 0.24;
    for (let i = 0; i < 5; i++) mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.4, 8), MATS.brass, -0.6 + (i % 3) * 0.15, 0.2, 1.4 + ((i / 3) | 0) * 0.15, 0, g).rotation.z = Math.PI / 2;
    for (let i = 0; i < 3; i++) crate(x - 2 + i * 0.85, z + 1.6, 0.2 + i * 0.1, 1, surfH(x - 2 + i * 0.85, z + 1.6)); }
}
