/* ═══════════════════ LE CRATÈRE : épave du biplan et soutien d'artillerie ═══════════════════
   Zone ouverte au centre du secteur. Le biplan abattu forme un obstacle autour duquel on peut
   tourner avec une horde aux trousses ; le téléphone de campagne transforme vos signalements (Q)
   en tirs de mortier pendant 20 secondes. */

const SUPPORT = { owner: null, t: 0, cool: 0, cd: 0, cost: 2500, time: 20, coolTime: 75 };

function buildCraterProps() {
  // Entoilage d'avion de 1917 : toile de lin enduite kaki (famille toile, teinte gardée), pas un drap de laine.
  const fabric = fmat('toile', 0x6f6a4c, { rough: 0.92, snow: 0.7 });
  // Avant calciné autour du moteur rotatif : capot et toile brûlés (famille rouille, clarté presque noire gardée).
  const burnt = fmat('rouille', 0x2a2520, { rough: 0.95, snow: 0.5 });
  const roundel = new THREE.MeshStandardMaterial({ roughness: 0.9, transparent: true, map: textTexture(128, 128, (x) => { [['#2a3f8f', 60], ['#e8e4d8', 42], ['#b0282a', 22]].forEach(([c, r]) => { x.fillStyle = c; x.beginPath(); x.arc(64, 64, r, 0, TAU); x.fill(); }); }) });
  const fy = (x, z) => (M.floorH ? M.floorH(x, z) : 0);
  const g = new THREE.Group(); g.position.set(45.4, fy(45.4, 31.6), 31.6); R.scene.add(g);
  const body = new THREE.Group(); body.position.y = 0.62; body.rotation.set(0.08, 0, -0.14); g.add(body); // nez planté vers +x
  // Fuselage effilé vers la queue.
  const fus = boxG(5.8, 1.0, 0.95), pa = fus.attributes.position;
  for (let i = 0; i < pa.count; i++) { const x = pa.getX(i), k = x < 0 ? lerp(1, 0.32, clamp(-x / 2.9, 0, 1)) : 1; pa.setY(i, pa.getY(i) * k + (x < 0 ? -x * 0.05 : 0)); pa.setZ(i, pa.getZ(i) * k); }
  fus.computeVertexNormals();
  mesh(fus, fabric, -0.5, 0, 0, 0, body);
  mesh(boxG(1.3, 1.02, 0.97), burnt, 1.7, 0, 0, 0, body); // avant calciné
  mesh(boxG(0.7, 0.3, 0.6), MATS.char, -0.1, 0.6, 0, 0, body); // habitacle
  const cowl = mesh(new THREE.CylinderGeometry(0.5, 0.56, 0.7, 14), MATS.iron, 2.55, 0, 0, 0, body); cowl.rotation.z = Math.PI / 2;
  for (const [a, l] of [[0.3, 1.25], [0.3 + Math.PI, 0.55]]) { const b = mesh(boxG(0.06, l, 0.16), rawPost(), 2.95, Math.cos(a) * l * 0.5, Math.sin(a) * l * 0.5, 0, body); b.rotation.x = a; } // hélice (une pale cassée)
  // Ailes arrachées à l'impact : l'inférieure gît à plat dans la neige (on marche dessus),
  // la moitié de l'aile supérieure est restée appuyée contre la paroi est du cratère.
  { const w = new THREE.Group(); w.position.set(45.0, fy(45.0, 36.2) - 0.12, 36.2); w.rotation.order = "YXZ"; w.rotation.y = 0.35; w.rotation.x = -0.125; // couchée dans la pente R.scene.add(w);
    mesh(boxG(1.35, 0.08, 8.2), fabric, 0, 0, 0, 0, w, false);
    for (const z of [-3.2, 3.2]) { const r = mesh(new THREE.PlaneGeometry(0.9, 0.9), roundel, 0, 0.05, z, 0, w, false); r.rotation.x = -Math.PI / 2; } }
  { const w = new THREE.Group(); w.position.set(53.25, 0, 30.3); R.scene.add(w);
    const p = mesh(boxG(4.4, 0.1, 1.4), fabric, 0, 0, 0, 0, w); p.rotation.set(0, Math.PI / 2, 1.15); p.position.set(0.2, 0.95, 0);
    const r = mesh(new THREE.PlaneGeometry(0.9, 0.9), roundel, 0, 0, 0, 0, w); r.position.set(0.14, 1.2, 1.1); r.rotation.set(0, -Math.PI / 2 + 0.42, 0);
    for (const z of [-1.4, 1.4]) mesh(boxG(0.06, 1.4, 0.06), rawPost(), 0.45, 0.7, z, 0, w);
    collider(52.55, 28.1, 54, 32.5, 1.9, 'wood'); } // plaquée contre la paroi : aucun recoin où rester coincé
  mesh(boxG(0.95, 0.9, 0.06), fabric, -3.25, 0.5, 0, 0, body); // dérive
  mesh(boxG(0.8, 0.06, 2.4), fabric, -3.2, 0.12, 0, 0, body); // empennage
  const wheel = mesh(new THREE.TorusGeometry(0.34, 0.08, 8, 18), MATS.iron, 0, 0, 0, 0, g); wheel.position.set(3.4, 0.1, 1.9); wheel.rotation.x = Math.PI / 2 - 0.2; // roue arrachée
  // Obstacles (boîtes le long du fuselage et de l'aile basse, en coordonnées du monde).
  g.updateMatrixWorld(true);
  // Un seul bloc convexe (fuselage, moteur, dérive) : les infectés en font le tour sans se coincer.
  collider(45.4 - 3.45, 31.6 - 0.55, 45.4 + 3.05, 31.6 + 0.55, 1.5 + fy(45.4, 31.6), 'wood');
  // Le moteur brûle encore.
  const fire = _v1.set(2.45, 0.35, 0).applyMatrix4(body.matrixWorld);
  WORLD.fires.push({ x: fire.x, y: fire.y, z: fire.z, size: 0.9, rate: 0.04, t: 0, smoke: 0.1 });
  // Débris épars.
  crate(40.4, 26.2, 0.4); crate(51.6, 37.4, -0.3, 0.9); barrel(41.2, 38.2, MATS.rust, true);
  // Téléphone de campagne (soutien d'artillerie).
  const s = wallSpot(SPOTS.mortar, 0.42), t = new THREE.Group(); t.position.set(s.x, 0, s.z); t.rotation.y = s.yaw; R.scene.add(t);
  mesh(boxG(0.8, 0.55, 0.55), MATS.crate, 0, 0.275, 0.05, 0, t); colliderBox(s.x, s.z, 0.8, 0.6, s.yaw, 0.55, 'wood');
  mesh(boxG(0.34, 0.24, 0.22), rawPost(), -0.12, 0.67, 0.05, 0, t); // coffret de bois du téléphone
  const hs = mesh(boxG(0.26, 0.05, 0.06), MATS.iron, -0.12, 0.8, 0.05, 0, t); hs.rotation.z = 0.1;
  const reel = mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.18, 14), MATS.olive, 0.22, 0.66, 0.05, 0, t); reel.rotation.x = Math.PI / 2;
  const lampMat = new THREE.MeshBasicMaterial({ color: 0x44ff66 }); mesh(new THREE.SphereGeometry(0.025, 8, 6), lampMat, -0.02, 0.72, -0.07, 0, t, false);
  const sign = mesh(new THREE.PlaneGeometry(0.62, 0.34), new THREE.MeshStandardMaterial({ map: woodSign(['ARTILLERIE', `${SUPPORT.cost} · MORTIER`], { w: 256, h: 140, bg: '#3d4a2a', color: '#e8e2c8' }), roughness: 0.8 }), 0, 1.45, -0.02, 0, t);
  sign.rotation.y = 0;
  WORLD.mortar = { pos: new THREE.Vector3(s.x, 1, s.z), lampMat };
  signPost(47.5, 38.6, Math.PI, ['LE CRATÈRE', 'MORTIER →']);
}

/* ─── Hôte ─── */
function supportReset() { Object.assign(SUPPORT, { owner: null, t: 0, cool: 0, cd: 0 }); }
function supportHost(dt) {
  if (SUPPORT.t > 0) { SUPPORT.t = Math.max(0, SUPPORT.t - dt); if (SUPPORT.t === 0) G.emit('mortarend', {}); }
  else if (SUPPORT.cool > 0) SUPPORT.cool = Math.max(0, SUPPORT.cool - dt);
  SUPPORT.cd = Math.max(0, SUPPORT.cd - dt);
}
function supportInteract(pid) {
  if (SUPPORT.t > 0 || SUPPORT.cool > 0) return G.tell(pid, 'deny');
  if (G.pay(pid, SUPPORT.cost)) G.emit('mortar', { pid, t: SUPPORT.time });
}
// Un signalement du soldat qui a appelé le mortier devient une cible (trois obus autour du point).
function supportPing(pid, x, z) {
  if (!G.authority || SUPPORT.t <= 0 || SUPPORT.owner !== pid || SUPPORT.cd > 0) return;
  if (MAP.roof[ti(clamp(tileOf(x), 0, MAP_W - 1), clamp(tileOf(z), 0, MAP_D - 1))]) { G.tell(pid, 'deny'); return; }
  SUPPORT.cd = 2.4;
  for (let k = 0; k < 3; k++) {
    const sx = x + rand(-2.2, 2.2), sz = z + rand(-2.2, 2.2), d = 1.2 + k * 0.45;
    G.emit('shell', { x: +sx.toFixed(2), z: +sz.toFixed(2), d });
    setTimeout(() => shellImpact(sx, sz, pid), d * 1000);
  }
}
function shellImpact(x, z, pid) {
  if (!G.authority || !(G.mode === 'playing' || G.mode === 'paused')) return;
  const p = _v3.set(x, groundAt(x, z), z), dmg = Math.max(3000, (G.zHp || 150) * 1.6);
  for (const zb of [...ZOMBIES]) {
    if (!zb.alive) continue; const d = Math.hypot(zb.pos.x - x, zb.pos.z - z); if (d > 5) continue;
    G.applyDamage(zb, dmg * (1 - d / 5) + 200, pid, { explosive: true, dir: new THREE.Vector3(zb.pos.x - x, 0, zb.pos.z - z).normalize(), crawl: d > 2.5 && Math.random() < 0.5 });
  }
  for (const [, pl] of G.players) { if (pl.down || pl.dead) continue; const d = Math.hypot(pl.pos.x - x, pl.pos.z - z); if (d < 3.2) G.damagePlayer(pl, Math.round(45 * (1 - d / 3.2)), { pos: p.clone() }); }
}

/* ─── Tous les joueurs ─── */
function supportApply(type, d) {
  if (type === 'mortar') {
    SUPPORT.owner = d.pid; SUPPORT.t = d.t; SUPPORT.cool = 0; Sfx.radio(WORLD.mortar.pos, 0.8);
    if (d.pid === P.id) { UI.message('MORTIER EN LIGNE', 'Signalez vos cibles (Q) pendant 20 secondes. Pas sous un abri.'); UI.subtitle('Batterie à l\'écoute. Donnez-nous des coordonnées.', true); }
    else UI.message('SOUTIEN D\'ARTILLERIE', `${G.players.get(d.pid)?.name || 'Un camarade'} dirige le mortier`);
    return true;
  }
  if (type === 'mortarend') { SUPPORT.t = 0; SUPPORT.owner = null; SUPPORT.cool = SUPPORT.coolTime; UI.subtitle('Batterie à court d\'obus. Terminé.', true); return true; }
  if (type === 'shell') {
    const p = new THREE.Vector3(d.x, 0, d.z); p.y = groundAt(d.x, d.z);
    Sfx.shellWhistle(p, d.d);
    setTimeout(() => { if (G.mode === 'menu') return; fxExplosion(_v3.set(p.x, p.y, p.z), 4.5); }, d.d * 1000);
    return true;
  }
  return false;
}
function supportVisuals(dt) {
  if (!G.authority) { if (SUPPORT.t > 0) SUPPORT.t = Math.max(0, SUPPORT.t - dt); else if (SUPPORT.cool > 0) SUPPORT.cool = Math.max(0, SUPPORT.cool - dt); }
  if (WORLD.mortar) WORLD.mortar.lampMat.color.set(SUPPORT.t > 0 ? (Math.sin(G.time * 10) > 0 ? 0xffd040 : 0x302000) : SUPPORT.cool > 0 ? 0xff5020 : 0x44ff66);
}
function supportCandidates(cand, px, pz) {
  if (!MAP.zoneActive[4] || !WORLD.mortar) return;
  const d = Math.hypot(px - WORLD.mortar.pos.x, pz - WORLD.mortar.pos.z);
  if (SUPPORT.t > 0) cand(d, { kind: 'info', text: SUPPORT.owner === P.id ? `Mortier en ligne — signalez vos cibles (Q) · ${Math.ceil(SUPPORT.t)} s` : `Mortier dirigé par ${G.players.get(SUPPORT.owner)?.name || 'un camarade'}`, range: 1.8 });
  else if (SUPPORT.cool > 0) cand(d, { kind: 'info', text: `Batterie en rechargement (${Math.ceil(SUPPORT.cool)} s)`, range: 1.8, deny: true });
  else cand(d, { kind: 'mortar', text: "Appeler le soutien d'artillerie (mortier, 20 s)", cost: SUPPORT.cost, range: 1.8 });
}
