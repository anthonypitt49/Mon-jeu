/* ═══════════════════ LE FILON MAUDIT : RÈGLES ═══════════════════
   Le Colosse : enfermé dans la prison du shérif. Libéré (1000), il attend dans la grand-rue.
   Avec des bonbons (1000, au comptoir du magasin général), il suit celui qui les lui donne pendant 40 s
   et écrase les infectés qui l'approchent. La banque garde des points d'une partie à l'autre. */

class Giant {
  constructor() {
    if (!ZV.giant) ZV.giant = buildBody({ rnd: mulberry32(7), coat: [0.32, 0.24, 0.16], skin: [0.6, 0.62, 0.54], hair: true, tornSleeves: true, straps: true, ribs: true, bulk: 1.45 });
    const rig = makeRig(ZV.giant, ZMAT);
    this.holder = rig.holder; this.mesh = rig.mesh; this.bones = rig.bones; this.scale = 2.2; this.holder.scale.setScalar(this.scale); R.scene.add(this.holder);
    const eyes = new THREE.Mesh(ZEYE_GEO, new THREE.MeshBasicMaterial({ color: 0xffe08a })); this.bones[BN.head].add(eyes); eyes.position.set(-BONE_DEF[BN.head][0], 1.745 - BONE_DEF[BN.head][1] - 0.1 + 0.012, 0.022 - BONE_DEF[BN.head][2]);
    // Chaînes brisées aux poignets.
    for (const b of [BN.handL, BN.handR]) { const c = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.018, 6, 12), MATS.iron); c.rotation.x = Math.PI / 2; this.bones[b].add(c); }
    this.pos = new THREE.Vector3(); this.yaw = 0; this.vel = new THREE.Vector3(); this.state = 'caged'; this.phase = 0; this.t = 0; this.slamT = 0; this.net = null;
    this.col = { x0: 0, x1: 0, z0: 0, z1: 0, y0: 0, y1: 3.6, mat: 'wood', noRay: true }; MAP.props.push(this.col);
  }
  place(x, z, yaw) { this.pos.set(x, 0, z); this.yaw = yaw; this.vel.set(0, 0, 0); }
  // Hôte : déplacement et coups.
  think(dt) {
    this.t += dt; const S = FIL_STATE;
    let tx = null, tz = null, spd = 0;
    if (this.state === 'caged') { const [cx, cz] = SPOTS.cage; tx = tcx(cx); tz = tcx(cz); spd = 0.6; }
    else if (S.ally && S.allyT > 0) {
      const o = G.players.get(S.ally); S.allyT -= dt;
      // Un infecté près de lui fonce sur son maître : il l'écrase, mais sans s'éloigner de plus de 8 m de celui qu'il suit.
      // Il ignore les infectés encore dehors (derrière une barricade) et abandonne une proie qu'il n'arrive pas à approcher.
      let best = null, bd = 7 * 7; for (const z of ZOMBIES) {
        if (!z.alive || z.state === 'rise' || (this.ignore && this.ignore.get(z.id) > this.t) || !isTrench(tileOf(z.pos.x), tileOf(z.pos.z))) continue;
        if (o && Math.hypot(z.pos.x - o.pos.x, z.pos.z - o.pos.z) > 8) continue;
        const d = (z.pos.x - this.pos.x) ** 2 + (z.pos.z - this.pos.z) ** 2; if (d < bd) { bd = d; best = z; }
      }
      if (best) {
        if (this.prey !== best.id) { this.prey = best.id; this.preyT = 0; this.preyD = bd; }
        this.preyT += dt; if (bd < this.preyD - 1) { this.preyD = bd; this.preyT = 0; }
        if (this.preyT > 3) { (this.ignore ||= new Map()).set(best.id, this.t + 6); this.prey = null; best = null; }
      }
      // Mission : un éboulis brillant à moins de 6 m de son maître ? il va lui-même le fracasser.
      let rock = null;
      if (S.ms === 2 && o && WORLD.filRubble) { let rd = 6; WORLD.filRubble.forEach((r, i) => { const d = Math.hypot(r.pos.x - o.pos.x, r.pos.z - o.pos.z); if (!S.rubble[i] && d < rd) { rd = d; rock = r; } }); }
      if (best) { tx = best.pos.x; tz = best.pos.z; spd = 3.2; } else if (rock) { tx = rock.pos.x; tz = rock.pos.z; spd = 2.6; } else if (o && !o.dead) { const d = Math.hypot(o.pos.x - this.pos.x, o.pos.z - this.pos.z); if (d > 3) { tx = o.pos.x; tz = o.pos.z; spd = Math.min(4, 1.5 + d * 0.3); } }
      this.slamT -= dt;
      if (this.slamT <= 0 && ZOMBIES.some((z) => z.alive && z.state !== 'rise' && z.pos.distanceToSquared(this.pos) < 3.4 * 3.4)) { this.slamT = 1.25; G.emit('gslam', { x: +this.pos.x.toFixed(2), z: +this.pos.z.toFixed(2) }); this.pend = 0.45; }
      if (this.pend !== undefined && this.pend !== null) { this.pend -= dt; if (this.pend <= 0) { this.pend = null; filSlamHit(this.pos.clone(), S.ally); } }
      if (S.allyT <= 0) { S.ally = null; G.emit('gbored', {}); }
    } else { const [ix, iz] = SPOTS.giantIdle; tx = tcx(ix); tz = tcx(iz); spd = 1.1; }
    let dx = 0, dz = 0;
    if (tx !== null) {
      dx = tx - this.pos.x; dz = tz - this.pos.z; const L = Math.hypot(dx, dz);
      if (L < 0.6) { dx = dz = 0; spd = 0; }
      else if (!gridClear(this.pos.x, this.pos.z, tx, tz, C_TRENCH) && this.state !== 'caged') {
        // Détour : chemin le plus court sur le sol praticable jusqu'à la cible (recalculé deux fois par seconde).
        const cx = tileOf(this.pos.x), cz = tileOf(this.pos.z), gx = tileOf(tx), gz = tileOf(tz);
        this.pathT = (this.pathT || 0) - dt;
        if (this.pathT <= 0 || this.pathGoal !== gx + ',' + gz) { this.pathT = 0.5; this.pathGoal = gx + ',' + gz; this.path = giantPath(gx, gz); }
        const P2 = this.path; let bx = -1, bz = -1, bd = P2 ? P2[ti(cx, cz)] : -1;
        // Diagonale seulement si les deux chemins en L sont libres (pas d'angle de cloison) ; en ligne droite s'il est coincé.
        const diagOk = (ox, oz) => this.unstick <= 0 && isTrench(cx + ox, cz) && isTrench(cx, cz + oz) && !edgeBlocked(cx, cz, cx + ox, cz) && !edgeBlocked(cx + ox, cz, cx + ox, cz + oz) && !edgeBlocked(cx, cz, cx, cz + oz) && !edgeBlocked(cx, cz + oz, cx + ox, cz + oz);
        if (P2 && bd >= 0) for (const [ox, oz] of NB8) { const nx = cx + ox, nz = cz + oz; if (!inMap(nx, nz)) continue; const d = P2[ti(nx, nz)]; if (d >= 0 && d < bd && !edgeBlocked(cx, cz, nx, nz) && (ox === 0 || oz === 0 || diagOk(ox, oz))) { bd = d; bx = nx; bz = nz; } }
        if (bx >= 0) { dx = tcx(bx) - this.pos.x; dz = tcx(bz) - this.pos.z; }
      }
      const l = Math.hypot(dx, dz) || 1; dx /= l; dz /= l;
    }
    if (this.slamT > 0.7) spd = 0; // il frappe : il s'arrête
    // Garde-fou : il veut avancer mais ne progresse plus depuis 1 s (accroché à un meuble ou un angle) → 2 s en ligne droite.
    this.unstick = (this.unstick || 0) - dt; this.progT = (this.progT || 0) + dt;
    if (this.progT > 1) { const moved = this.lastP ? Math.hypot(this.pos.x - this.lastP.x, this.pos.z - this.lastP.z) : 1; if (spd > 0.8 && moved < 0.3) this.unstick = 2; this.lastP = this.pos.clone(); this.progT = 0; }
    this.vel.x = damp(this.vel.x, dx * spd, 5, dt); this.vel.z = damp(this.vel.z, dz * spd, 5, dt);
    this.pos.x += this.vel.x * dt; this.pos.z += this.vel.z * dt;
    if (this.state !== 'caged') collideCircle(this.pos, 0.75, pBlocked);
    const mv = Math.hypot(this.vel.x, this.vel.z); if (mv > 0.2) this.yaw += angDiff(this.yaw, Math.atan2(this.vel.x, this.vel.z)) * Math.min(1, dt * 4);
    // Les soldats le contournent.
    Object.assign(this.col, { x0: this.pos.x - 0.6, x1: this.pos.x + 0.6, z0: this.pos.z - 0.6, z1: this.pos.z + 0.6 });
  }
  // Tous : interpolation (invités) et animation.
  animate(dt) {
    if (this.net) { const n = this.net; this.pos.x = damp(this.pos.x, n[0], 10, dt); this.pos.z = damp(this.pos.z, n[1], 10, dt); this.yaw += angDiff(this.yaw, n[2]) * Math.min(1, dt * 8); if (n[3] && !this.netSlam) { this.netSlam = true; } if (!n[3]) this.netSlam = false; Object.assign(this.col, { x0: this.pos.x - 0.6, x1: this.pos.x + 0.6, z0: this.pos.z - 0.6, z1: this.pos.z + 0.6 }); }
    const spd = this.net ? Math.hypot(this.net[0] - this.pos.x, this.net[1] - this.pos.z) * 4 : Math.hypot(this.vel.x, this.vel.z);
    this.phase += (spd / 2.4) * Math.PI * dt; this.t += this.net ? dt : 0;
    this.slamAnim = Math.max(0, (this.slamAnim || 0) - dt);
    this.holder.position.set(this.pos.x, 0, this.pos.z); this.holder.rotation.set(0, this.yaw, 0);
    poseBody(this.bones, { phase: this.phase, run: 0, lean: 0.22, reach: 0, attack: this.slamAnim > 0 ? 1 - this.slamAnim / 1.1 : 0, tear: 0, crawl: false, rise: 1, headTilt: Math.sin(this.t * 0.3) * 0.2, t: this.t, limp: 0.2, moving: clamp(spd / 1.5, 0, 1), jaw: 0.15 + Math.max(0, Math.sin(this.t * 1.3)) * 0.2, fl: { x: 0, y: 0, h: 0 } });
  }
}
// Coup du Colosse : tous les infectés dans un rayon de 3,2 m.
function filSlamHit(p, pid) {
  if (!G.authority || !(G.mode === 'playing' || G.mode === 'paused')) return;
  for (const z of [...ZOMBIES]) { if (!z.alive) continue; const d = Math.hypot(z.pos.x - p.x, z.pos.z - p.z); if (d < 3.2) G.applyDamage(z, z.boss ? 3000 : 1e7, pid || P.id, { explosive: true, dir: new THREE.Vector3(z.pos.x - p.x, 0, z.pos.z - p.z).normalize() }); }
}
function filReset() {
  if (!FIL_STATE.giant && ZV.list) FIL_STATE.giant = new Giant();
  Object.assign(FIL_STATE, { candy: {}, ally: null, allyT: 0, freed: false, ms: 0, rubble: [0, 0, 0], gold: [0, 0, 0], fed: false }); filMissionVisualReset();
  const g = FIL_STATE.giant; if (g) { g.state = 'caged'; g.net = null; const [cx, cz] = SPOTS.cage; g.place(tcx(cx), tcx(cz), 0); g.animate(0); }
}
function filHost(dt) {
  const g = FIL_STATE.giant;
  // Après une relève, le nouvel hôte simule le Colosse : on oublie la dernière position reçue, sinon l'animation l'y ramène sans cesse.
  if (g && g.net) { g.net = null; g.vel.set(0, 0, 0); }
  if (g) g.think(dt);
  // Grille de la cellule achetée : le Colosse sort.
  if (!FIL_STATE.freed && MAP.doors[FIL_STATE.cageDoor]?.open) G.emit('freed', {});
  filMissionHost(dt);
}
function filVisuals(dt) {
  const g = FIL_STATE.giant; if (g) { if (!G.authority && !g.net) { /* en attente d'état */ } g.animate(dt); }
  if (WORLD.shaft) WORLD.shaft.material.uniforms.uTime.value += dt;
  filMissionVisuals(dt);
}
function filApply(type, d) {
  const g = FIL_STATE.giant;
  if (type === 'freed') { FIL_STATE.freed = true; if (g) g.state = 'idle'; Sfx.zombie(g ? g.pos : P.pos, 'groan', 0.4); UI.message('LE COLOSSE EST LIBRE', 'Il attend dans la grand-rue. Il adore les bonbons du magasin général.'); return true; }
  if (type === 'candy') { FIL_STATE.candy[d.pid] = true; if (d.pid === P.id) { UI.message('BONBONS', 'Donnez-les au Colosse : il vous suivra et écrasera les infectés pendant 40 s.'); Sfx.pickup(); } return true; }
  if (type === 'feed') { FIL_STATE.candy[d.pid] = false; FIL_STATE.ally = d.pid; FIL_STATE.allyT = 40; FIL_STATE.fed = true; if (g) g.state = 'idle'; Sfx.jingle([0, 4, 7, 12], 262, 'triangle', 0.14); UI.message('LE COLOSSE VOUS SUIT', `${d.pid === P.id ? 'Il vous protège' : (G.players.get(d.pid)?.name || 'Un camarade') + ' a un allié'} pendant 40 secondes.`); return true; }
  if (type === 'gbored') { FIL_STATE.ally = null; FIL_STATE.allyT = 0; return true; }
  if (type === 'gslam') { if (g) g.slamAnim = 1.1; setTimeout(() => { const p = _v1.set(d.x, 0.2, d.z); fxSnowBurst(p, 50); Sfx.explosion(p, 0.5); const dd = Math.hypot(P.pos.x - d.x, P.pos.z - d.z); FX.shake = Math.max(FX.shake, clamp(1 - dd / 18, 0, 0.8)); }, 450); return true; }
  if (type === 'fms' || type === 'frock' || type === 'fgold') { filMissionApply(type, d); return true; }
  if (type === 'bank') { if (d.pid === P.id) { const bal = Math.max(0, (store.get('bank', 0) | 0) + d.d); store.set('bank', bal); UI.message(d.d > 0 ? 'DÉPÔT À LA BANQUE' : 'RETRAIT', `Solde : ${bal} points (conservés d'une partie à l'autre)`); Sfx.buy(); } return true; }
  return false;
}
function filInteract(pid, kind, id) {
  const g = FIL_STATE.giant;
  if (kind === 'candy') { if (FIL_STATE.candy[pid]) { G.tell(pid, 'deny'); return true; } if (G.pay(pid, 1000)) G.emit('candy', { pid }); return true; }
  if (kind === 'feed') { if (!FIL_STATE.candy[pid] || !FIL_STATE.freed || (FIL_STATE.ally && FIL_STATE.allyT > 0)) { G.tell(pid, 'deny'); return true; } G.emit('feed', { pid }); return true; }
  if (kind === 'fgold') { const i = +id; if (FIL_STATE.rubble[i] && !FIL_STATE.gold[i]) G.emit('fgold', { i, who: G.players.get(pid)?.name || '' }); return true; }
  if (kind === 'fvault') { if (FIL_STATE.ms === 3) { G.emit('fms', { ms: 4 }); for (const [p2] of G.players) G.addPoints(p2, 3000, false); } return true; }
  if (kind === 'bankDep') { if (G.pay(pid, 1000)) G.emit('bank', { pid, d: 1000 }); return true; }
  if (kind === 'bankWd') { G.addPoints(pid, 900, false); G.emit('bank', { pid, d: -1000 }); return true; }
  return false;
}
function filCandidates(cand, px, pz) {
  const g = FIL_STATE.giant, S = FIL_STATE;
  filMissionCandidates(cand, px, pz);
  if (g) {
    const d = Math.hypot(px - g.pos.x, pz - g.pos.z) - 0.8;
    if (!S.freed) { /* la grille de sa cellule s'achète comme une porte */ }
    else if (S.ally && S.allyT > 0) cand(d, { kind: 'info', text: `${S.ally === P.id ? 'Le Colosse vous suit' : 'Le Colosse suit ' + (G.players.get(S.ally)?.name || 'un camarade')} (${Math.ceil(S.allyT)} s)`, range: 3 });
    else if (S.candy[P.id]) cand(d, { kind: 'feed', text: 'Donner les bonbons au Colosse', range: 3.2 });
    else cand(d, { kind: 'info', text: 'Le Colosse a faim de bonbons (magasin général)', range: 3, deny: true });
  }
  const c = WORLD.candyShop; if (c) cand(Math.hypot(px - c.pos.x, pz - c.pos.z), S.candy[P.id] ? { kind: 'info', text: 'Vous avez déjà des bonbons', range: 1.8 } : { kind: 'candy', text: 'Acheter des bonbons (pour le Colosse)', cost: 1000, range: 1.8 });
  const b = WORLD.bankDesk; if (b) {
    const bal = store.get('bank', 0) | 0;
    cand(Math.hypot(px - b.dep.x, pz - b.dep.z), { kind: 'bankDep', text: `Déposer 1000 points à la banque (solde : ${bal})`, cost: 1000, range: 1.4 });
    cand(Math.hypot(px - b.wd.x, pz - b.wd.z), bal >= 1000 ? { kind: 'bankWd', text: `Retirer 900 points (1000 du solde, frais 100) — solde : ${bal}`, range: 1.4 } : { kind: 'info', text: `Retrait impossible : solde ${bal}`, range: 1.4, deny: true });
  }
}
function filReconcile(s) {
  if (!s) return;
  if (s.f && !FIL_STATE.freed) filApply('freed', {});
  FIL_STATE.ally = s.a ?? null; if (Math.abs(FIL_STATE.allyT - (s.t || 0)) > 2) FIL_STATE.allyT = s.t || 0;
  if (Array.isArray(s.c)) { FIL_STATE.candy = {}; for (const k of s.c) FIL_STATE.candy[k] = true; }
  if (typeof s.rb === 'string') s.rb.split('').forEach((c, i) => { if (c === '1' && !FIL_STATE.rubble[i]) filMissionApply('frock', { i }, true); });
  if (typeof s.gp === 'string') s.gp.split('').forEach((c, i) => { if (c === '1' && !FIL_STATE.gold[i]) filMissionApply('fgold', { i }, true); });
  if (typeof s.ms === 'number' && s.ms !== FIL_STATE.ms) filMissionApply('fms', { ms: s.ms }, true);
}
function filFastApply(a) {
  const g = FIL_STATE.giant; if (!g || !Array.isArray(a) || G.authority) return;
  if (!g.net) { g.pos.set(a[0], 0, a[1]); g.yaw = a[2]; }
  g.net = a;
}

// Distances (en pas) depuis la cible du Colosse, sur le sol praticable (portes ouvertes, murs fins respectés).
function giantPath(gx, gz) {
  if (!inMap(gx, gz)) return null;
  const dist = new Int16Array(MAP_W * MAP_D).fill(-1), q = [ti(gx, gz)]; dist[q[0]] = 0;
  for (let h = 0; h < q.length; h++) {
    const i = q[h], x = i % MAP_W, z = (i / MAP_W) | 0;
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const a = x + dx, b = z + dz; if (!inMap(a, b) || !isTrench(a, b) || edgeBlocked(x, z, a, b)) continue; const j = ti(a, b); if (dist[j] < 0) { dist[j] = dist[i] + 1; q.push(j); } }
  }
  return dist;
}

/* ─── Mission « Le trésor du Filon » : Colosse libéré → bonbons → trois éboulis brisés, trois pépites → chambre forte ─── */
const FIL_RUBBLE = [[8, 19], [41, 20], [22, 12]]; // carreaux locaux : grand-rue ouest, galerie de mine, magasin général
function filRubbleSpots() {
  return FIL_RUBBLE.map(([lx, lz]) => { let best = null, bd = 1e9; const [cx, cz] = FIL.T(lx, lz); for (let z = cz - 3; z <= cz + 3; z++) for (let x = cx - 3; x <= cx + 3; x++) { if (!inMap(x, z) || MAP.type[ti(x, z)] !== T_FLOOR) continue; const d = Math.hypot(x - cx, z - cz); if (d < bd) { bd = d; best = [x, z]; } } return best ? new THREE.Vector3(tcx(best[0]), 0, tcx(best[1])) : new THREE.Vector3(tcx(cx), 0, tcx(cz)); });
}
function filBuildMission() {
  if (WORLD.filRubble) return;
  // Madriers d'étai brisés en bois brut (famille 'boisBrut' : ils ne partagent plus la matière de la charpente de l'église) ;
  // pépites : lueur de jeu, sans photo.
  const rock = fmat('rock', 0x8a7866), plank = fmat('boisBrut', 0x5a3e28), gold = new THREE.MeshStandardMaterial({ color: 0xd8b040, emissive: 0xffb020, emissiveIntensity: 0.6, roughness: 0.3, metalness: 1 });
  WORLD.filRubble = filRubbleSpots().map((p) => {
    const g = new THREE.Group(); g.userData.dynamic = true; g.position.copy(p); R.scene.add(g);
    // Neuf cailloux fusionnés : un seul appel de dessin par éboulis. UV en mètres sur chaque caillou AVANT la fusion.
    const rocks = []; for (let i = 0; i < 9; i++) { const s = rand(0.25, 0.55), d = new THREE.DodecahedronGeometry(s, 0); d.rotateX(rand(TAU)); d.rotateY(rand(TAU)); d.translate(rand(-0.6, 0.6), s * 0.6 + (i > 5 ? 0.4 : 0), rand(-0.6, 0.6)); const dm = meterUV(d, rock, 1, 1, 1, p.x + i * 3.7, p.z + i * 1.3); rocks.push(dm.index ? dm.toNonIndexed() : dm); }
    mesh(mergeGeometries(rocks), rock, 0, 0, 0, 0, g);
    for (let i = 0; i < 2; i++) { const b = mesh(boxG(1.6, 0.14, 0.2), plank, rand(-0.3, 0.3), 0.5 + i * 0.25, rand(-0.3, 0.3), rand(TAU), g); b.rotation.z = rand(-0.5, 0.5); }
    meterize(g); // construit après le monde (remise à zéro de la partie) : UV en mètres des madriers
    const glint = KIT.glow(g, 0, 0.9, 0, 0xffc040, 0.6, 0.5);
    const col = { x0: p.x - 0.7, x1: p.x + 0.7, z0: p.z - 0.7, z1: p.z + 0.7, y0: 0, y1: 1.1, mat: 'concrete' }; MAP.props.push(col);
    const nug = new THREE.Group(); nug.userData.dynamic = true; nug.position.set(p.x, 0.25, p.z); nug.visible = false; R.scene.add(nug);
    for (let i = 0; i < 3; i++) mesh(new THREE.DodecahedronGeometry(rand(0.06, 0.1), 0), gold, rand(-0.08, 0.08), rand(0, 0.08), rand(-0.08, 0.08), rand(TAU), nug, false);
    KIT.glow(nug, 0, 0.05, 0, 0xffc040, 1.2, 0.7);
    return { g, glint, col, nug, pos: p };
  });
}
function filMissionVisualReset() { filBuildMission(); for (const r of WORLD.filRubble) { r.g.visible = true; r.col.off = false; r.nug.visible = false; } }
function filMissionHost(dt) {
  const S = FIL_STATE, g = S.giant;
  if (S.ms === 0 && S.freed) G.emit('fms', { ms: 1 });
  if (S.ms === 1 && S.fed) G.emit('fms', { ms: 2 });
  if (S.ms === 2) {
    // Le Colosse, quand il accompagne un soldat, fracasse l'éboulis qu'il frôle.
    if (g && S.ally && S.allyT > 0) WORLD.filRubble.forEach((r, i) => { if (!S.rubble[i] && Math.hypot(g.pos.x - r.pos.x, g.pos.z - r.pos.z) < 3.6) { G.emit('gslam', { x: +r.pos.x.toFixed(2), z: +r.pos.z.toFixed(2) }); G.emit('frock', { i }); g.slamT = 1.25; } });
    if (S.gold.every(Boolean)) G.emit('fms', { ms: 3 });
  }
}
function filMissionApply(type, d, quiet) {
  const S = FIL_STATE; filBuildMission();
  if (type === 'frock') { const r = WORLD.filRubble[d.i]; if (!r || S.rubble[d.i]) return; S.rubble[d.i] = 1; setTimeout(() => { decalsOffObj(r.g); r.g.visible = false; r.col.off = true; if (!S.gold[d.i]) r.nug.visible = true; if (!quiet) { fxSnowBurst(_v1.set(r.pos.x, 0.4, r.pos.z), 60); for (let k = 0; k < 14; k++) FX.glow.spawn(r.pos.x, 0.6, r.pos.z, rand(-3, 3), rand(1, 4), rand(-3, 3), rand(0.3, 0.7), 0.05, 1, 0.8, 0.3, 1, 9, 0.5); } }, quiet ? 0 : 450); if (!quiet) UI.message('ÉBOULIS BRISÉ', "De l'or brille dans les gravats !"); }
  else if (type === 'fgold') { S.gold[d.i] = 1; const r = WORLD.filRubble[d.i]; if (r) r.nug.visible = false; if (!quiet) { const n = S.gold.filter(Boolean).length; UI.message('PÉPITE', `${d.who ? d.who + ' · ' : ''}${n}/3`); Sfx.pickup(); } }
  else { const prev = S.ms; S.ms = d.ms; if (!quiet && prev !== S.ms) {
    if (S.ms === 1) UI.message('LE TRÉSOR DU FILON', 'Le Colosse est libre. Donnez-lui des bonbons du magasin général.');
    if (S.ms === 2) UI.message('LE TRÉSOR DU FILON', 'Menez-le jusqu\'aux éboulis qui brillent : il les brisera pour vous.');
    if (S.ms === 3) UI.message("TOUT L'OR EST À VOUS", 'Déposez-le dans la chambre forte de la banque.');
    if (S.ms === 4) { UI.banner?.('LE TRÉSOR DU FILON', '+3000 points · +2000 à la banque'); Sfx.jingle([0, 4, 7, 12, 16, 19, 24], 392, 'triangle', 0.14); store.set('bank', (store.get('bank', 0) | 0) + 2000); }
  } }
  UI.objective();
}
function filMissionVisuals(dt) {
  if (!WORLD.filRubble) return; const t = G.time;
  for (const r of WORLD.filRubble) { if (r.g.visible) r.glint.material.opacity = FIL_STATE.ms >= 2 ? 0.35 + Math.sin(t * 3 + r.pos.x) * 0.25 : 0.12; if (r.nug.visible) { r.nug.rotation.y += dt; r.nug.position.y = 0.25 + Math.sin(t * 2.5) * 0.05; } }
}
const filVaultPos = () => { const d = MAP.doors.find((q) => q.label === 'La chambre forte'); return d ? { d, x: tcx(d.x), z: tcx(d.z) } : null; };
function filMissionCandidates(cand, px, pz) {
  const S = FIL_STATE; if (!WORLD.filRubble) return;
  WORLD.filRubble.forEach((r, i) => { if (r.nug.visible) cand(Math.hypot(px - r.pos.x, pz - r.pos.z), { kind: 'fgold', id: i, text: "Ramasser la pépite d'or", range: 1.6 }); });
  if (S.ms === 3) { const v = filVaultPos(); if (v) cand(Math.hypot(px - v.x, pz - v.z) - 0.4, v.d.open ? { kind: 'fvault', text: "Maintenir pour déposer l'or dans la chambre forte", range: 2.4, hold: true, holdTime: 3 } : { kind: 'info', text: 'Chambre forte fermée — ouvrez-la', range: 2.4, deny: true }); }
}
function filMission() {
  const S = FIL_STATE, n = S.gold.filter(Boolean).length;
  const g = S.giant, shop = WORLD.candyShop, near = (list) => { let b = null, bd = 1e9; for (const p of list) { const d = Math.hypot(p[0] - P.pos.x, p[2] - P.pos.z); if (d < bd) { bd = d; b = p; } } return b; };
  const cage = MAP.doors[S.cageDoor], feedAt = S.candy[P.id] && g ? [g.pos.x, 3.2, g.pos.z] : shop ? [shop.pos.x, 1.4, shop.pos.z] : null;
  if (S.ms === 0) return { title: 'LE TRÉSOR DU FILON', line: 'Libérer le Colosse de la prison du shérif', sub: 'La grille de sa cellule s\'achète comme une porte', at: cage ? [tcx(cage.x), 1.6, tcx(cage.z)] : null };
  if (S.ms === 1) return { title: 'LE TRÉSOR DU FILON', line: 'Donner des bonbons au Colosse', sub: 'Comptoir du magasin général · 1000', at: feedAt };
  const nug = (WORLD.filRubble || []).filter((r) => r.nug.visible).map((r) => [r.pos.x, 0.8, r.pos.z]), rocks = (WORLD.filRubble || []).filter((r, i) => !S.rubble[i]).map((r) => [r.pos.x, 1.2, r.pos.z]);
  const following = S.ally && S.allyT > 0;
  if (S.ms === 2) return { at: nug.length ? near(nug) : following ? near(rocks) : feedAt, title: 'LE TRÉSOR DU FILON', line: `Guider le Colosse vers les éboulis, ramasser l'or (${n}/3)`, sub: S.ally && S.allyT > 0 ? `${S.ally === P.id ? 'Il vous suit' : 'Il suit ' + (G.players.get(S.ally)?.name || 'un camarade')} encore ${Math.ceil(S.allyT)} s` : 'Il ne suit personne : redonnez-lui des bonbons' };
  if (S.ms === 3) { const v = filVaultPos(); return { at: v ? [v.x, 1.4, v.z] : null, title: 'LE TRÉSOR DU FILON', line: "Déposer l'or dans la chambre forte de la banque", sub: v && !v.d.open ? 'Il faut d\'abord ouvrir la chambre forte' : 'Maintenir E devant la chambre forte' }; }
  return null;
}
