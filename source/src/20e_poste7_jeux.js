/* ═══════════════════ POSTE 7 : LA SAPE — CAMOUFLET ET WAGONNET ═══════════════════
   Le camouflet (guerre des mines : petite charge qui écrase une galerie sans crever la surface) : un exploseur en haut de
   la descente fait sauter la galerie boisée ; tout infecté dedans meurt (sans points), un joueur pris dedans est blessé.
   1000 points, 75 s de recharge, sans courant.
   Le wagonnet (caisse de bois sur la voie de 60) : on s'y assoit en haut de la descente (250 points), il dévale la pente,
   pivote sur la plaque tournante, file dans la galerie et s'arrête au heurtoir de la carrière ; les infectés sur la voie
   sont fauchés (points au passager). Le treuil le remonte à vide. L'hôte décide (paiement, morts) ; chaque poste anime. */

const SJ = {
  CAM: { x: 62.3, z: 59, cost: 1000, cool: 75, delay: 0.75 }, // (au nord du treuil : le boyau reste libre)
  WAG: { cost: 250, z0: 62.6, turn: [63, 73], x1: 47.1, t1: 2.6, tp: 0.7, t3: 3.6, wait: 6, back: 9 },
  cam: { cool: 0, fx: 0, owner: null, pend: -1 },
  wag: { state: 'idle', t: 0, pid: null }, // idle → ride → bottom → back → idle
};
const sjRideT = () => SJ.WAG.t1 + SJ.WAG.tp + SJ.WAG.t3;
// Zone du camouflet : la descente et la galerie ouest (pas la carrière ni le boyau d'entrée).
const sjInGallery = (x, z) => (x > 62 && x < 64 && z > 62 && z < 74) || (x > 48 && x < 64 && z > 72 && z < 74);

// Wagonnet au temps t du trajet aller (0 → sjRideT()) : position, hauteur des rails, cap, tangage, vitesse.
function sjWagPose(t) {
  const W = SJ.WAG, L1 = W.turn[1] - W.z0, L3 = W.turn[0] - W.x1, o = { x: 0, z: 0, y: 0, yaw: 0, pitch: 0, v: 0 };
  if (t < W.t1) { const u = clamp(t / W.t1, 0, 1); o.x = W.turn[0]; o.z = W.z0 + L1 * smooth(u); o.v = (L1 * 6 * u * (1 - u)) / W.t1; o.yaw = 0; }
  else if (t < W.t1 + W.tp) { const u = smooth((t - W.t1) / W.tp); o.x = W.turn[0]; o.z = W.turn[1]; o.yaw = -u * Math.PI / 2; }
  else { const u = clamp((t - W.t1 - W.tp) / W.t3, 0, 1); o.x = W.turn[0] - L3 * smooth(u); o.z = W.turn[1]; o.v = (L3 * 6 * u * (1 - u)) / W.t3; o.yaw = -Math.PI / 2; }
  o.y = floorAt(o.x, o.z) + 0.08;
  const fx = Math.sin(o.yaw), fz = Math.cos(o.yaw); // (sens de la marche)
  o.pitch = Math.atan2(floorAt(o.x + fx * 0.5, o.z + fz * 0.5) - floorAt(o.x - fx * 0.5, o.z - fz * 0.5), 1);
  return o;
}

/* ─── Décor ─── */
function buildSapeJeux() {
  const SM = sapeMats(), iron = MATS.iron, rust = fmat('rouille', 0x5a3a28, { rough: 0.75, metal: 0.4 });
  // Exploseur du camouflet : caisse, poignée en T, fils qui descendent dans la galerie, voyant, pancarte.
  { const { x, z } = SJ.CAM, g = p7g(x, z, Math.PI / 2); WORLD.sjCam = g;
    mesh(boxG(0.5, 0.5, 0.4), SM.crate, 0, 0.25, 0, 0, g); mesh(boxG(0.3, 0.24, 0.24), SM.dark, 0, 0.62, 0, 0, g);
    const h = new THREE.Group(); h.position.set(0, 0.74, 0); g.add(h); WORLD.sjPlunger = h;
    mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.36, 8), iron, 0, 0.18, 0, 0, h); mesh(boxG(0.32, 0.04, 0.04), iron, 0, 0.36, 0, 0, h);
    for (const s of [-0.07, 0.07]) mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.04, 8), SM.brass, s, 0.76, 0.12, 0, g);
    const lamp = new THREE.MeshBasicMaterial({ color: 0x44ff66 }); mesh(new THREE.SphereGeometry(0.024, 8, 6), lamp, 0.11, 0.75, -0.08, 0, g, false); WORLD.sjCamLamp = lamp;
    const sign = mesh(new THREE.PlaneGeometry(0.62, 0.32), new THREE.MeshStandardMaterial({ map: woodSign(['CAMOUFLET', `${SJ.CAM.cost} · GALERIE 7`], { w: 256, h: 132, bg: '#5a2a1e', color: '#f2e6c8' }), roughness: 0.85 }), 0, 1.25, -0.06, 0, g);
    sign.rotation.x = -0.08;
    p7Box(x, z, 0.4, 0.5, 0.9, Math.PI / 2, 'wood');
    const c = new THREE.CatmullRomCurve3([[x + 0.15, 0.5, z + 0.15], [x + 0.2, 0.04, z + 0.55], [62.12, 0.04, 61], [62.12, floorAt(62.1, 63.5) + 0.12, 63.5], [62.12, floorAt(62.1, 66) + 0.2, 66], [62.12, floorAt(62.1, 70) + 0.2, 70]].map((p) => new THREE.Vector3(...p)));
    mesh(new THREE.TubeGeometry(c, 40, 0.01, 5, false), stdMat({ color: 0x3a1610, roughness: 0.6 }), 0, 0, 0, 0, R.scene, false);
  }
  // Charges du camouflet : sacs de poudre serrés contre les étais, au fond de la galerie (on les voit en passant).
  { const bags = new Batch(new THREE.CylinderGeometry(0.14, 0.15, 0.36, 9), fmat('jute', 0x6e6248, { rough: 1 }));
    for (const [x, z] of [[62.25, 67.2], [62.25, 67.55], [56.6, 72.25], [56.95, 72.25], [51.4, 72.25]]) bags.add(x, floorAt(x, z) + 0.18, z, rand(TAU), rand(-0.1, 0.1), rand(-0.1, 0.1));
    bags.build(); }
  // Wagonnet : caisse de bois cerclée de fer sur quatre roues, et plaque tournante au coin de la galerie.
  { const g = new THREE.Group(); g.userData.dynamic = true; R.scene.add(g); WORLD.sjWag = g; const body = new THREE.Group(); g.add(body); WORLD.sjWagBody = body;
    const wood = fmat('boisBrut', 0x7a6650, { rough: 0.9 });
    mesh(boxG(0.8, 0.06, 1.2), wood, 0, 0.33, 0, 0, body);
    for (const s of [-0.39, 0.39]) { mesh(boxG(0.04, 0.46, 1.2), wood, s, 0.57, 0, 0, body); mesh(boxG(0.8, 0.46, 0.04), wood, 0, 0.57, s * 1.5, 0, body); }
    for (const [a, b] of [[-0.41, -0.61], [0.41, -0.61], [-0.41, 0.61], [0.41, 0.61]]) mesh(boxG(0.05, 0.5, 0.05), rust, a, 0.56, b, 0, body); // cornières
    for (const yy of [0.42, 0.74]) for (const s of [-0.415, 0.415]) mesh(boxG(0.012, 0.035, 1.22), rust, s, yy, 0, 0, body);
    mesh(boxG(0.7, 0.08, 0.08), iron, 0, 0.2, -0.63, 0, body); mesh(boxG(0.7, 0.08, 0.08), iron, 0, 0.2, 0.63, 0, body); // tampons
    for (const s of [-0.3, 0.3]) mesh(boxG(0.06, 0.1, 1.1), iron, s, 0.24, 0, 0, body); // longerons
    const wh = new THREE.CylinderGeometry(0.15, 0.15, 0.05, 14); wh.rotateZ(Math.PI / 2);
    WORLD.sjWheels = [];
    for (const [a, b] of [[-0.3, -0.36], [0.3, -0.36], [-0.3, 0.36], [0.3, 0.36]]) WORLD.sjWheels.push(mesh(wh, iron, a, 0.15, b, 0, body));
    for (const b of [-0.36, 0.36]) { const ax = mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.66, 6), iron, 0, 0.15, b, 0, body); ax.rotation.z = Math.PI / 2; }
    const lumps = new Batch(new THREE.DodecahedronGeometry(0.09, 0), SM.chalkP); for (let k = 0; k < 6; k++) lumps.add(rand(-0.28, 0.28), 0.4, rand(-0.45, 0.45), rand(TAU), rand(TAU)); lumps.build(body);
    // Lanterne accrochée à l'avant de la caisse (lueur seule, comme les lampes de la galerie).
    const lan = new THREE.Group(); lan.position.set(0, 0.86, 0.66); body.add(lan);
    mesh(new THREE.CylinderGeometry(0.06, 0.07, 0.16, 8), MATS.iron, 0, 0, 0, 0, lan, false); mesh(new THREE.TorusGeometry(0.05, 0.008, 4, 10, Math.PI), MATS.iron, 0, 0.1, 0, 0, lan, false);
    const gl = new THREE.Sprite(new THREE.SpriteMaterial({ map: TEX.sprites.glow, color: 0xffc070, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.85 })); gl.scale.set(0.55, 0.55, 1); lan.add(gl);
    sjPlaceWag(0);
  }
  { const [tx, tz] = SJ.WAG.turn, y = floorAt(tx, tz); // plaque tournante : disque de fonte, rails croisés
    const disc = mesh(new THREE.CylinderGeometry(0.78, 0.8, 0.06, 28), fmat('fonte', 0x2a2a2c, { rough: 0.65, metal: 0.5 }), tx, y + 0.03, tz, 0, R.scene, false); disc.receiveShadow = true;
    const r = new Batch(boxG(0.06, 0.04, 1.5), iron); for (const o of [-0.3, 0.3]) { r.add(tx + o, y + 0.08, tz, 0); r.add(tx, y + 0.08, tz + o, Math.PI / 2); }
    for (const o of [-0.3, 0.3]) { r.add(tx + o, y + 0.08, 72.1, 0, 0, 0, 1, 1, 0.14); r.add(62.1, y + 0.08, tz + o, Math.PI / 2, 0, 0, 1, 1, 0.14); } r.build(); }
  // Treuil du retour à vide, en haut de la descente (le câble suit la voie quand il tire).
  { const g = p7g(63.72, 60.4, Math.PI / 2), d = mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.8, 12), MATS.rust, 0, 0.55, 0, 0, g); d.rotation.z = Math.PI / 2; WORLD.sjDrum = d; // (contre la paroi est : le boyau reste libre)
    for (const s of [-0.48, 0.48]) mesh(boxG(0.08, 0.7, 0.4), SM.dark, s, 0.35, 0, 0, g);
    p7Box(63.72, 60.4, 1.05, 0.45, 0.8, Math.PI / 2, 'metal');
    const cg = new THREE.BufferGeometry(); cg.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(9), 3));
    const cable = new THREE.Line(cg, new THREE.LineBasicMaterial({ color: 0x1a1816 })); cable.frustumCulled = false; cable.visible = false; cable.userData.dynamic = true; R.scene.add(cable); WORLD.sjCable = cable; }
  signPost(63.85, 59.2, -Math.PI / 2, ['WAGONNET', 'ASSIS ! TÊTE BAISSÉE']);
}
// Place le wagonnet au temps t du trajet aller (le retour le parcourt à l'envers).
function sjPlaceWag(t) {
  const o = sjWagPose(t), g = WORLD.sjWag; if (!g) return o;
  g.position.set(o.x, o.y, o.z); g.rotation.set(0, o.yaw, 0); WORLD.sjWagBody.rotation.x = -o.pitch;
  return o;
}

/* ─── Hôte ─── */
function sapeJeuxReset() {
  Object.assign(SJ.cam, { cool: 0, fx: 0, owner: null, pend: -1 }); Object.assign(SJ.wag, { state: 'idle', t: 0, pid: null });
  if (P.ride?.sj) P.ride = null; sjPlaceWag(0);
}
function sapeJeuxHost(dt) {
  const C = SJ.cam;
  if (C.cool > 0) C.cool = Math.max(0, C.cool - dt);
  if (C.pend >= 0) { C.pend -= dt; if (C.pend < 0) sjCamBlast(C.owner); }
  // Wagonnet : les infectés sur la voie sont fauchés (devant et autour de la caisse, tant qu'elle roule).
  const W = SJ.wag;
  if (W.state === 'ride') {
    const o = sjWagPose(W.t); if (o.v < 1.2) return;
    const cx = o.x + Math.sin(o.yaw) * 0.35, cz = o.z + Math.cos(o.yaw) * 0.35; // (avant de la caisse)
    for (const zb of [...ZOMBIES]) {
      if (!zb.alive || zb.state === 'rise' || Math.abs(zb.pos.y - o.y) > 1.6 || Math.hypot(zb.pos.x - cx, zb.pos.z - cz) > 1.05) continue;
      const dir = new THREE.Vector3(Math.sin(o.yaw) * 2, 0.6, Math.cos(o.yaw) * 2).normalize();
      G.applyDamage(zb, zb.boss ? 400 : zb.brute ? zb.hp * 0.5 + 200 : 1e6, W.pid || P.id, { dir, melee: false, explosive: false });
    }
  }
}
function sjCamBlast(pid) {
  if (!G.authority || !(G.mode === 'playing' || G.mode === 'paused')) return;
  for (const zb of [...ZOMBIES]) {
    if (!zb.alive || zb.state === 'rise' || !sjInGallery(zb.pos.x, zb.pos.z) || zb.pos.y > 0.6) continue;
    const dir = new THREE.Vector3(rand(-1, 1), 1.2, rand(-1, 1)).normalize();
    if (zb.boss) G.applyDamage(zb, 1500, pid, { dir, explosive: true }); else { zb.hp = 0; G.killZombie(zb, pid, { dir, explosive: true, noPoints: true }); }
  }
  for (const [, pl] of G.players) { if (pl.down || pl.dead || !sjInGallery(pl.pos.x, pl.pos.z) || pl.pos.y > 0.6) continue; G.damagePlayer(pl, 40, { pos: pl.pos.clone().add(_v1.set(0, -0.5, 0)) }); }
}
function sapeJeuxInteract(pid, kind) {
  const p = G.players.get(pid); if (!p) return;
  if (kind === 'camouflet') {
    if (SJ.cam.cool > 0 || SJ.cam.pend >= 0) return G.tell(pid, 'deny');
    if (G.pay(pid, SJ.CAM.cost)) { SJ.cam.owner = pid; SJ.cam.pend = SJ.CAM.delay; SJ.cam.cool = SJ.CAM.cool; G.emit('camouflet', { pid, c: SJ.CAM.cool }); }
  } else if (kind === 'wagon') {
    if (SJ.wag.state !== 'idle' || Math.hypot(p.pos.x - SJ.WAG.turn[0], p.pos.z - SJ.WAG.z0) > 2.4) return G.tell(pid, 'deny');
    if (G.pay(pid, SJ.WAG.cost)) G.emit('wagon', { pid });
  }
}

/* ─── Tous les joueurs ─── */
function sapeJeuxApply(type, d) {
  if (type === 'camouflet') {
    SJ.cam.cool = d.c; SJ.cam.owner = d.pid; SJ.cam.fx = -SJ.CAM.delay; // (la poignée descend, puis la galerie saute)
    Sfx.click(900, 0.4);
    if (d.pid === P.id) UI.message('CAMOUFLET', 'La galerie va sauter !');
    return true;
  }
  if (type === 'wagon') {
    Object.assign(SJ.wag, { state: 'ride', t: 0, pid: d.pid }); Sfx.door?.(_v1.set(SJ.WAG.turn[0], 0, SJ.WAG.z0));
    if (d.pid === P.id) {
      P.ride = { sj: 1, crouch: 1,
        step() { if (SJ.wag.state !== 'ride' || SJ.wag.pid !== P.id) return false; const o = sjWagPose(SJ.wag.t); P.pos.set(o.x, o.y + 0.3, o.z); return SJ.wag.t < sjRideT() - 0.02; },
        end() { const o = sjWagPose(sjRideT()); P.pos.set(o.x, floorAt(o.x, o.z + 0.95), o.z + 0.95); }, // (on descend à côté de la caisse)
      };
      UI.subtitle('Tenez-vous ! Ça descend…', true);
    }
    return true;
  }
  return false;
}
function sapeJeuxVisuals(dt) {
  const C = SJ.cam, W = SJ.wag;
  if (!G.authority && C.cool > 0) C.cool = Math.max(0, C.cool - dt);
  // Camouflet : poignée enfoncée, puis souffle, poussière qui jaillit de la galerie, lampes qui vacillent, secousse.
  if (C.fx < 0) { C.fx += dt; if (WORLD.sjPlunger) WORLD.sjPlunger.position.y = 0.74 - 0.2 * smooth(clamp((C.fx + SJ.CAM.delay) / 0.3, 0, 1)); if (C.fx >= 0) sjCamFx(); }
  else if (C.fx > 0) {
    C.fx = Math.max(0, C.fx - dt);
    for (let k = 0; k < 6; k++) if (Math.random() < 0.7) { const u = Math.random(), [x, z] = u < 0.4 ? [63 + rand(-0.8, 0.8), 62 + u / 0.4 * 11] : [48 + (u - 0.4) / 0.6 * 15, 73 + rand(-0.8, 0.8)];
      FX.soft.spawn(x, floorAt(x, z) + rand(0.2, 2), z, rand(-0.6, 0.6), rand(0, 0.6), rand(-0.6, 0.6), rand(2, 3.5), rand(0.5, 0.9), 0.42, 0.38, 0.33, 0.55, 0, 0.6, 0.8); }
    if (C.fx > 1.6) for (let k = 0; k < 4; k++) FX.soft.spawn(63 + rand(-0.7, 0.7), floorAt(63, 61.8) + rand(0.3, 1.6), 61.6, rand(-0.5, 0.5), rand(1, 2.5), -rand(2, 4), rand(1.5, 2.5), rand(0.6, 1.1), 0.45, 0.4, 0.35, 0.6, 0, 0.9, 1.1);
  } else if (WORLD.sjPlunger && C.cool <= 0) WORLD.sjPlunger.position.y = damp(WORLD.sjPlunger.position.y, 0.74, 3, dt);
  if (WORLD.sjCamLamp) WORLD.sjCamLamp.color.set(C.fx !== 0 ? (Math.sin(G.time * 18) > 0 ? 0xffd040 : 0x302000) : C.cool > 0 ? 0xff3010 : 0x44ff66);
  // Wagonnet : aller, attente au heurtoir, retour à vide tiré par le treuil.
  if (W.state === 'ride') { W.t += dt; const o = sjPlaceWag(W.t); sjWheels(o.v, dt); if (W.t >= sjRideT()) { W.state = 'bottom'; W.t = 0; Sfx.impact?.(_v1.set(o.x, o.y + 0.4, o.z), 'wood'); shakeAt(_v1.set(o.x, o.y, o.z), 0.25, 6); } }
  else if (W.state === 'bottom') { W.t += dt; if (W.t >= SJ.WAG.wait) { W.state = 'back'; W.t = 0; } }
  else if (W.state === 'back') {
    W.t += dt; const rt = sjRideT() * (1 - clamp(W.t / SJ.WAG.back, 0, 1)), o = sjPlaceWag(rt); sjWheels(-sjRideT() / SJ.WAG.back * 3, dt);
    if (WORLD.sjDrum) WORLD.sjDrum.rotation.x -= dt * 6;
    if (W.t >= SJ.WAG.back) { W.state = 'idle'; W.t = 0; W.pid = null; sjPlaceWag(0); }
    sjCable(o);
  }
  if (WORLD.sjCable) WORLD.sjCable.visible = W.state === 'back';
}
function sjWheels(v, dt) { if (WORLD.sjWheels) for (const w of WORLD.sjWheels) w.rotation.x += (v * dt) / 0.15; }
// Câble du treuil : du tambour au coin de la galerie, puis jusqu'au wagonnet (le long de la voie).
function sjCable(o) {
  const a = WORLD.sjCable.geometry.attributes.position, [tx, tz] = SJ.WAG.turn, y0 = floorAt(63.72, 60.4) + 0.55, past = o.z > tz - 0.05 && o.x < tx - 0.05;
  a.setXYZ(0, 63.5, y0, 60.9); if (past) a.setXYZ(1, tx, floorAt(tx, tz) + 0.3, tz); else a.setXYZ(1, o.x, o.y + 0.3, o.z); a.setXYZ(2, o.x, o.y + 0.3, o.z); a.needsUpdate = true;
}
function sjCamFx() {
  const c = _v3.set(56, floorAt(56, 73) + 1, 73);
  Sfx.explosion(c, 1.6); Sfx.stomp?.(1, 0); shakeAt(c, 0.9, 32);
  SJ.cam.fx = 2.6; AUBE_FX.flick = Math.max(AUBE_FX.flick, 2.2); AUBE_FX.dust = Math.max(AUBE_FX.dust, 2.5);
  for (let k = 0; k < 14; k++) { const u = k / 13, x = u < 0.4 ? 63 : 48 + (u - 0.4) / 0.6 * 15, z = u < 0.4 ? 62 + u / 0.4 * 11 : 73; fxSparks(_v1.set(x, floorAt(x, z) + 1.2, z), 3); }
}
function sapeJeuxCandidates(cand, px, pz) {
  if (!MAP.zoneActive[5]) return;
  const C = SJ.cam, dC = Math.hypot(px - SJ.CAM.x, pz - SJ.CAM.z);
  if (C.fx !== 0) cand(dC, { kind: 'info', text: 'Camouflet : la galerie saute !', range: 1.8 });
  else if (C.cool > 0) cand(dC, { kind: 'info', text: `Camouflet en préparation (${Math.ceil(C.cool)} s)`, range: 1.8, deny: true });
  else cand(dC, { kind: 'camouflet', text: 'Camouflet : faire sauter la galerie (tue tout ce qui s\'y trouve)', cost: SJ.CAM.cost, range: 1.8 });
  const W = SJ.wag, dW = Math.hypot(px - SJ.WAG.turn[0], pz - SJ.WAG.z0);
  if (W.state === 'idle') cand(dW, { kind: 'wagon', text: 'Monter dans le wagonnet (descente jusqu\'à la carrière)', cost: SJ.WAG.cost, range: 1.7 });
  else if (W.state === 'back' || W.state === 'bottom') cand(dW, { kind: 'info', text: 'Wagonnet en bas — le treuil le remonte', range: 1.7, deny: true });
}
