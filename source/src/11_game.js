/* ═══════════════════ RÈGLES DE LA PARTIE (autorité : hôte ou solo) ═══════════════════ */

const DROP_TYPES = {
  maxammo: { name: 'MUNITIONS MAX', icon: 'ammo' },
  instakill: { name: 'MORT SUBITE', icon: 'skull', timed: 30 },
  double: { name: 'POINTS DOUBLES', icon: 'x2', timed: 30 },
  nuke: { name: "FRAPPE D'ARTILLERIE", icon: 'shell' },
  carpenter: { name: 'BARRICADES', icon: 'hammer' },
  firesale: { name: 'BRADERIE', icon: 'tag', timed: 30, sub: 'La caisse ne coûte que 10 points pendant 30 s.' },
  zblood: { name: 'SANG INFECTÉ', icon: 'drop', timed: 20 },
  bonus: { name: 'PRIME', icon: 'coin', sub: '+500 points pour chaque soldat.' },
};
const DROP_TEX = {};
function dropTexture(type) {
  if (DROP_TEX[type]) return DROP_TEX[type];
  return (DROP_TEX[type] = textTexture(128, 128, (x) => {
    x.translate(64, 64); x.strokeStyle = '#dfffe8'; x.fillStyle = '#dfffe8'; x.lineWidth = 7; x.lineJoin = 'round'; x.shadowColor = '#3dff7a'; x.shadowBlur = 14;
    const ic = DROP_TYPES[type].icon;
    if (ic === 'ammo') { x.strokeRect(-40, -18, 80, 44); for (let k = 0; k < 4; k++) { x.beginPath(); x.moveTo(-28 + k * 18, -18); x.lineTo(-28 + k * 18, -40); x.arc(-24 + k * 18, -40, 4, Math.PI, 0); x.lineTo(-20 + k * 18, -18); x.fill(); } }
    else if (ic === 'skull') { x.beginPath(); x.arc(0, -8, 34, Math.PI * 0.85, Math.PI * 2.15); x.lineTo(20, 30); x.lineTo(-20, 30); x.closePath(); x.fill(); x.globalCompositeOperation = 'destination-out'; x.beginPath(); x.arc(-13, -6, 9, 0, TAU); x.arc(13, -6, 9, 0, TAU); x.fill(); x.fillRect(-12, 18, 5, 12); x.fillRect(-2, 18, 5, 12); x.fillRect(8, 18, 5, 12); }
    else if (ic === 'x2') { x.font = font(84); x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('×2', 0, 4); }
    else if (ic === 'shell') { x.beginPath(); x.moveTo(-16, 40); x.lineTo(-16, -14); x.quadraticCurveTo(0, -50, 16, -14); x.lineTo(16, 40); x.closePath(); x.fill(); x.fillStyle = '#123'; x.fillRect(-16, 20, 32, 5); }
    else if (ic === 'hammer') { x.rotate(-0.6); x.fillRect(-6, -10, 12, 58); x.fillRect(-30, -30, 60, 22); }
    else if (ic === 'tag') { x.rotate(-0.5); x.beginPath(); x.moveTo(-40, -20); x.lineTo(18, -20); x.lineTo(42, 0); x.lineTo(18, 20); x.lineTo(-40, 20); x.closePath(); x.fill(); x.globalCompositeOperation = 'destination-out'; x.beginPath(); x.arc(20, 0, 6, 0, TAU); x.fill(); x.font = font(30); x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('10', -12, 2); }
    else if (ic === 'drop') { x.beginPath(); x.moveTo(0, -46); x.bezierCurveTo(22, -12, 34, 4, 34, 18); x.arc(0, 18, 34, 0, Math.PI); x.bezierCurveTo(-34, 4, -22, -12, 0, -46); x.fill(); x.globalCompositeOperation = 'destination-out'; x.beginPath(); x.arc(-12, 20, 7, 0, TAU); x.arc(12, 20, 7, 0, TAU); x.fill(); }
    else if (ic === 'coin') { x.beginPath(); x.arc(0, 0, 40, 0, TAU); x.stroke(); x.font = font(46); x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('+', 0, 3); }
  }));
}

const G = {
  mode: 'menu', time: 0, solo: true, authority: true, players: new Map(), round: 0, zHash: new Map(),
  reset() {
    // Objets de la caisse, de l'établi et bonus au sol d'une partie précédente : on les retire vraiment de la scène.
    if (this.box?.display?.obj) this.box.display.obj.removeFromParent();
    if (this.bench?.display) this.bench.display.removeFromParent();
    for (const d of this.drops || []) d.g.removeFromParent();
    this.round = 0; this.toSpawn = 0; this.alive = 0; this.spawnT = 0; this.breakT = 0; this.killsSinceDrop = 0; this.dropsRound = 0; this.lastDrop = null;
    this.power = false; this.pu = { instakill: 0, double: 0, firesale: 0 }; P.zbloodT = 0; this.drops = []; this.dropSeq = 1; this.flowT = 0; this.netT = 0; this.overT = 0; this.started = 0;
    this.box = { loc: 0, state: 'idle', t: 0, key: null, buyer: null, uses: 0, display: null };
    for (const p of WORLD.perks) if (p.locked) setLock('p:' + p.key, false); setLock('b', false);
    this.bench = { state: 'idle', t: 0, key: null, owner: null, display: null };
    this.blizzard = false; this.deathCam = 0; WEATHER.target = 0;
    for (const d of MAP.doors) { d.open = false; d.anim = 0; d.leaf.position.set(0, 0, 0); d.leaf.rotation.set(0, 0, 0); d.group.visible = true; }
    refreshZones();
    for (const b of MAP.barricades) { b.planks = 6; b.cap = 0; for (let k = 0; k < 6; k++) { b.plankShown[k] = true; b.plankAnim[k] = 1; WORLD.planks.setMatrixAt(b.id * 6 + k, b.plankM[k]); } }
    WORLD.planks.instanceMatrix.needsUpdate = true;
    while (ZOMBIES.length) ZOMBIES[0].destroy();
    while (PROJ.length) { R.scene.remove(PROJ.pop().m); }
    setPowerVisuals(false, true);
    placeBox(0);
    pwrReset(); secretReset();
    mapHook('reset');
    Sfx.stopHum();
  },
  addPlayer(id, name, isLocal) {
    const rec = { id, name, isLocal, pos: isLocal ? P.pos : new THREE.Vector3(tcx(SPOTS.start[0]), 0, tcx(SPOTS.start[1])), yaw: 0, pitch: 0, points: 500, kills: 0, heads: 0, downs: 0, shots: 0, hits: 0, perks: new Set(), down: false, dead: false, repairPts: 0, weaponKey: 'pistol', flags: 0 };
    const gh = this.ghosts?.get(id); if (gh) { Object.assign(rec, gh); this.ghosts.delete(id); } // retour après une coupure : on retrouve ses points
    this.players.set(id, rec); if (!isLocal) rec.avatar = new Avatar(rec);
    return rec;
  },
  removePlayer(id) {
    const r = this.players.get(id); if (!r) return;
    if (r.avatar) r.avatar.destroy(); this.players.delete(id);
    if (this.mode === 'playing' || this.mode === 'paused') (this.ghosts ||= new Map()).set(id, { points: r.points, kills: r.kills, heads: r.heads, downs: r.downs, perks: r.perks });
    UI.team();
  },
  me() { return this.players.get(P.id); },

  /* ─── Démarrage ─── */
  start({ solo = true, authority = true, players = null, diff = null } = {}) {
    this.diff = clamp(diff ?? settings.diff ?? 1, 0, 3) | 0;
    this.solo = solo; this.authority = authority; this.mode = 'playing'; this.time = 0; this.gid = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    this.reset();
    for (const [, r] of this.players) if (!r.isLocal) r.avatar?.destroy();
    this.players.clear(); this.ghosts = new Map(); this.netRs = null; this.seen = new Set(); SPEC.target = null; clearPings();
    const me = this.addPlayer(P.id, P.name, true);
    if (players) players.forEach((p) => { if (p.id !== P.id) this.addPlayer(p.id, p.name, false); });
    const order = [...this.players.keys()].sort(), idx = Math.max(0, order.indexOf(P.id));
    resetLocalPlayer(SPOTS.coopStarts[idx % SPOTS.coopStarts.length]);
    me.points = 500;
    UI.enterGame(); UI.points(500, 0); UI.team();
    if (this.authority) { this.breakT = 3.5; this.round = 0; }
    Sfx.setPad(0.6);
  },

  /* ─── Boucle (hôte) ─── */
  update(dt) {
    this.time += dt;
    const me = this.me(); if (me) { me.pos = P.pos; me.yaw = P.yaw; me.down = P.down; me.dead = P.dead; me.weaponKey = curW()?.key || 'knife'; }
    // Table de hachage spatiale (séparation des infectés).
    this.zHash.clear();
    for (const z of ZOMBIES) { if (!z.alive) continue; const k = tileOf(z.pos.z) * MAP_W + tileOf(z.pos.x); let a = this.zHash.get(k); if (!a) this.zHash.set(k, (a = [])); a.push(z); }
    if (this.authority) this.hostUpdate(dt);
    for (const z of ZOMBIES) {
      if (z.remote) { netZombieInterp(z, dt); if (z.alive) { z.groanT -= dt; if (z.groanT <= 0) { z.groanT = rand(3, 9); if (z.pos.distanceTo(P.pos) < 30) Sfx.zombie(z.pos, z.speed > 3 && Math.random() < 0.6 ? 'scream' : 'groan', z.brute ? 0.65 : rand(0.85, 1.15)); } } }
      z.syncMesh(dt); if (z.alive) z.updateHitboxes();
    }
    updateProjectiles(dt);
    this.updateDrops(dt);
    this.updateDoorsAnim(dt); this.updatePlanksAnim(dt); this.updateBoxBench(dt); pwrVisuals(dt); secretVisuals(); mapHook('visuals', dt);
    for (const [, r] of this.players) if (r.avatar) r.avatar.update(dt);
    if (this.pu.instakill > 0) this.pu.instakill = Math.max(0, this.pu.instakill - dt);
    if (this.pu.double > 0) this.pu.double = Math.max(0, this.pu.double - dt);
    if (this.pu.firesale > 0) this.pu.firesale = Math.max(0, this.pu.firesale - dt);
    if (P.zbloodT > 0) P.zbloodT = Math.max(0, P.zbloodT - dt);
    if (this.deathCam > 0) { this.deathCam = Math.min(0.5, this.deathCam + dt * 0.3); }
    UI.powerups();
  },
  hostUpdate(dt) {
    this.flowT -= dt;
    if (this.flowT <= 0) {
      this.flowT = 0.25;
      const src = []; for (const [, p] of this.players) if (!p.down && !p.dead && p.pos && !(p.zb > this.time)) src.push([tileOf(p.pos.x), tileOf(p.pos.z)]);
      if (src.length) computeFlow(src);
    }
    for (const z of [...ZOMBIES]) if (!z.remote) z.think(dt, this);
    this.alive = ZOMBIES.filter((z) => z.alive).length;
    // Manches.
    if (this.breakT > 0) { this.breakT -= dt; if (this.breakT <= 0) this.startRound(this.round + 1); }
    else if (this.round > 0) {
      this.spawnT -= dt;
      if (this.toSpawn > 0 && this.alive < this.maxAlive && this.spawnT <= 0) { if (this.spawnZombie()) { this.toSpawn--; this.spawnT = this.spawnGap * (mapHook('spawnFactor') ?? 1) * pwrSpawnFactor(); } else this.spawnT = 0.5; }
      if (this.toSpawn <= 0 && this.alive === 0 && this.overT <= 0) this.endRound();
    }
    pwrHost(dt);
    mapHook('host', dt);
    // Boîte et établi.
    const bx = this.box; if (bx.state !== 'idle') { bx.t -= dt; if (bx.t <= 0) this.boxNext(); }
    const bn = this.bench; if (bn.state === 'working' || bn.state === 'ready') { bn.t -= dt; if (bn.t <= 0) { if (bn.state === 'working') this.emit('bench', { state: 'ready', key: bn.key, owner: bn.owner, t: 20 }); else this.emit('bench', { state: 'idle' }); } }
    // Fin de partie.
    const ps = [...this.players.values()];
    if (this.overT > 0) { this.overT -= dt; if (this.overT <= 0) this.gameOver(); }
    else if (ps.length && ps.every((p) => p.down || p.dead) && !(this.solo && P.selfRevive > 0)) { this.overT = this.solo ? 2.6 : 2.2; }
    NET.hostTick(dt);
  },
  startRound(n) {
    const np = Math.max(1, this.players.size);
    const blizzard = n >= 6 && n % 6 === 0;
    const base = n <= 5 ? [8, 11, 15, 20, 26][n - 1] : Math.min(220, Math.round(26 + (n - 5) * 4.8));
    this.toSpawn = Math.round(base * (1 + 0.6 * (np - 1)) * (blizzard ? 0.65 : 1) * DIFF().count);
    Object.assign(this, this.roundParams(n, blizzard));
    this.spawnT = 1.5; this.dropsRound = 0;
    for (const [, p] of this.players) p.repairPts = 0;
    this.emit('round', { n, blizzard });
  },
  roundParams(n, blizzard = this.blizzard) {
    const np = Math.max(1, this.players.size);
    return { maxAlive: Math.min(38, 26 + (np - 1) * 4), spawnGap: Math.max(0.32, 1.9 * Math.pow(0.93, n)) / (blizzard ? 1.6 : 1) / DIFF().spawn, zHp: Math.round(zombieHp(n) * DIFF().zhp) };
  },
  endRound() { this.breakT = this.blizzard ? 12 : 10; this.emit('rend', { n: this.round }); if (this.blizzard) this.spawnDrop('maxammo', this.lastKillPos || P.pos, true); },
  zombieKind() {
    // Manche « effective » : la difficulté avance l'arrivée des coureurs et des spéciaux.
    const n = this.round + DIFF().early;
    if (this.blizzard) return Math.random() < 0.5 ? 'runner' : 'sprinter';
    const brutes = ZOMBIES.filter((z) => z.alive && z.brute).length;
    if (n >= 5 && brutes < 1 + Math.floor(this.players.size / 2) + (n >= 15 ? 1 : 0) && Math.random() < 0.04) return 'brute';
    // Infectés spéciaux : le Givreux dès la manche 6, le Hurleur dès la 9 (un seul à la fois).
    if (n >= 6 && ZOMBIES.filter((z) => z.alive && z.kind === 'frost').length < (n >= 12 ? 2 : 1) && Math.random() < 0.06) return 'frost';
    if (n >= 9 && !ZOMBIES.some((z) => z.alive && z.kind === 'screamer') && Math.random() < 0.045) return 'screamer';
    const r = Math.random(), run = clamp((n - 2) * 0.13, 0, 0.85), sprint = clamp((n - 9) * 0.08, 0, 0.5), jog = clamp((n - 0.5) * 0.25, 0, 0.65);
    if (r < sprint) return 'sprinter'; if (r < run) return 'runner'; if (r < run + jog * (1 - run)) return 'jogger'; return 'walker';
  },
  spawnZombie(existing) {
    // Carte ouverte : une partie des infectés sort de terre dans les zones ouvertes, loin des joueurs.
    const gs = SPOTS.groundSpawns;
    if (gs && gs.length && Math.random() < 0.35) {
      const ok = gs.filter(([x, z]) => { const i = ti(x, z); if (!MAP.zoneActive[MAP.zone[i]] || FLOW.dist[i] < 0) return false; for (const [, p] of this.players) if (p.pos && Math.hypot(p.pos.x - tcx(x), p.pos.z - tcx(z)) < 11) return false; return true; });
      if (ok.length) {
        const [sx, sz] = pick(ok), x = tcx(sx) + rand(-0.6, 0.6), z = tcx(sz) + rand(-0.6, 0.6);
        if (existing) { existing.pos.set(x, 0, z); existing.state = 'rise'; existing.rise = 0; existing.t = 0; existing.stuck = 0; existing.farT = 0; existing.vel.set(0, 0, 0); fxSnowBurst(existing.pos); return true; }
        const kind = this.zombieKind(), hp = Math.round(this.zHp * (kind === 'brute' ? 6 : kind === 'crawler' ? 0.8 : kind === 'frost' ? 1.3 : kind === 'screamer' ? 1.6 : 1));
        new Zombie({ x, z, y: 0, kind, hp, round: this.round, yaw: rand(TAU) });
        return true;
      }
    }
    // Points d'apparition : barricades des zones actives, pondérées par la proximité des joueurs.
    const cands = [];
    for (const b of MAP.barricades) {
      if (!MAP.zoneActive[b.zone] || !b.spawns.length) continue;
      const d = FLOW.dist[ti(b.inner[0], b.inner[1])]; if (d < 0) continue;
      cands.push({ b, w: 1 / (1 + d / 60) });
    }
    if (!cands.length) return false;
    let r = Math.random() * cands.reduce((s, c) => s + c.w, 0), b = cands[0].b;
    for (const c of cands) { r -= c.w; if (r <= 0) { b = c.b; break; } }
    const [sx, sz] = b.spawns[(Math.random() * b.spawns.length) | 0];
    const x = tcx(sx) + rand(-0.7, 0.7), z = tcx(sz) + rand(-0.7, 0.7);
    if (existing) { existing.pos.set(x, surfH(x, z), z); existing.state = 'rise'; existing.rise = 0; existing.t = 0; existing.stuck = 0; existing.farT = 0; existing.vel.set(0, 0, 0); fxSnowBurst(existing.pos); return true; }
    const kind = this.zombieKind();
    const hp = Math.round(this.zHp * (kind === 'brute' ? 6 : kind === 'crawler' ? 0.8 : kind === 'frost' ? 1.3 : kind === 'screamer' ? 1.6 : 1));
    new Zombie({ x, z, y: surfH(x, z), kind, hp, round: this.round, yaw: Math.atan2(-b.dir[0], -b.dir[1]) });
    return true;
  },
  respawnZombie(z) { if (z.alive) this.spawnZombie(z); },

  /* ─── Dégâts ─── */
  hitZombie(z, dmg, pid, info) {
    if (!z || !z.alive) return false;
    if (!this.authority) { NET.queueHit([z.id, Math.round(dmg), info.head ? 1 : 0, info.explosive ? 1 : 0, info.melee ? 1 : 0, info.freeze ? 1 : 0, +(info.dir?.x || 0).toFixed(2), +(info.dir?.z || 0).toFixed(2), info.crawl ? 1 : 0]); return dmg >= (z.netHp ?? 1e9) || info.freeze; }
    return this.applyDamage(z, dmg, pid, info);
  },
  applyDamage(z, dmg, pid, info) {
    if (!z.alive) return false;
    const p = this.players.get(pid);
    if (info.freeze) {
      if (z.state === 'frozen') return false;
      if (this.round <= 30 || z.hp <= dmg * 3) { z.killer = pid; z.freeze(1.2); this.emit('zfreeze', { id: z.id }, true); return true; }
    }
    if (z.state === 'frozen') { z.killer = pid; this.shatterZombie(z); return true; }
    if (z.boss && info.head && z.helmet) dmg *= 0.4; // casque : les tirs à la tête ricochent
    if (this.pu.instakill > 0 && !z.brute && !z.boss) dmg = z.hp;
    z.hp -= dmg;
    if (z.hp <= 0) { info.dmg = dmg; this.killZombie(z, pid, info); return true; }
    this.addPoints(pid, 10, true);
    this.gore(z, goreOnHit(z, dmg, info), info.dir);
    // Jambes emportées par l'explosion : l'infecté rampe (zSever le fait ramper, ici et chez les invités).
    if (info.explosive && info.crawl && !z.brute && !z.crawl) this.gore(z, Math.random() < 0.5 ? [BN.shinL, BN.shinR] : [Math.random() < 0.5 ? BN.thighL : BN.thighR], info.dir);
    return false;
  },
  killZombie(z, pid, info) {
    const p = this.players.get(pid);
    const pts = (info.melee ? 130 : info.head ? 100 : 60) + (SPECIAL_HINTS[z.kind] ? 50 : 0);
    if (!info.noPoints) this.addPoints(pid, pts + (info.explosive ? 10 : 0), true);
    if (p) { p.kills++; if (info.head) p.heads++; }
    if (pid === P.id) { P.stats.kills++; if (info.head) P.stats.heads++; }
    const d = info.dir || _v1.set(0, 0, 1);
    z.die({ head: !!info.head, part: info.part, dir: d, explosive: !!info.explosive, melee: !!info.melee });
    this.emit('zdie', { id: z.id, h: info.head ? 1 : 0, e: info.explosive ? 1 : 0, m: info.melee ? 1 : 0, dx: +d.x.toFixed(2), dz: +d.z.toFixed(2) }, true);
    this.gore(z, goreOnKill(z, info.dmg || 0, info), d);
    this.alive = Math.max(0, this.alive - 1); this.killsSinceDrop++;
    this.lastKillPos = z.pos.clone();
    if (z.kind === 'frost') this.frostBurst(z.pos);
    this.maybeDrop(z);
    if (z.boss) mapHook('bossDown', z, pid);
  },
  // Membres arrachés (09c_gore.js) : appliqués ici et chez les invités.
  gore(z, bones, dir) {
    if (!bones.length) return;
    const d = dir || _v1.set(0, 0, 1); for (const b of bones) zSever(z, b, d);
    this.emit('zlimb', { id: z.id, b: bones, dx: +d.x.toFixed(2), dz: +d.z.toFixed(2) }, true);
  },
  // Givreux abattu : éclat de glace qui blesse et ralentit les soldats trop proches.
  frostBurst(p) {
    this.emit('frostburst', { x: +p.x.toFixed(2), z: +p.z.toFixed(2) });
    for (const [, pl] of this.players) { if (pl.down || pl.dead) continue; const d = Math.hypot(pl.pos.x - p.x, pl.pos.z - p.z); if (d < 3.6) this.damagePlayer(pl, Math.round(18 + 22 * (1 - d / 3.6)), { pos: p.clone() }); }
  },
  shatterZombie(z) {
    if (!z.alive) return; const pid = z.killer || P.id;
    this.addPoints(pid, 100, true); const p = this.players.get(pid); if (p) p.kills++; if (pid === P.id) P.stats.kills++;
    z.state = 'dead'; z.holder.visible = false; z.t = 8.5; fxIce(z.headPos(_v1).setY(z.pos.y + 1)); Sfx.shatter(z.pos);
    this.emit('zshatter', { id: z.id }, true); if (z.kind === 'frost') this.frostBurst(z.pos);
    this.alive = Math.max(0, this.alive - 1); this.killsSinceDrop++; this.lastKillPos = z.pos.clone();
    this.maybeDrop(z);
  },
  damagePlayer(p, amt, z) {
    if (p.isLocal) localHurt(p.perks && P.perks.has('armor') ? amt : amt, z.pos);
    else NET.sendTo(p.id, 'hurt', [amt, +z.pos.x.toFixed(2), +z.pos.z.toFixed(2)]);
  },
  addPoints(pid, n, earned) {
    const p = this.players.get(pid); if (!p) return;
    const d = earned && this.pu.double > 0 ? n * 2 : n;
    p.points = Math.max(0, p.points + d);
    if (pid === P.id) UI.points(p.points, d);
    UI.team();
  },
  pay(pid, cost) { const p = this.players.get(pid); if (!p || p.points < cost) { this.tell(pid, 'deny'); return false; } p.points -= cost; if (pid === P.id) { UI.points(p.points, -cost); Sfx.buy(); } else NET.sendTo(pid, 'tell', ['buy']); UI.team(); return true; },
  tell(pid, what) { if (pid === P.id) { if (what === 'deny') { Sfx.deny(); UI.flashPrompt(); } } else NET.sendTo(pid, 'tell', [what]); },

  /* ─── Barricades ─── */
  removePlank(b, z) {
    if (b.planks <= 0) return; b.planks--; this.emit('plank', { b: b.id, n: b.planks, d: -1 });
  },
  repair(pid, bid) {
    const b = MAP.barricades[bid], p = this.players.get(pid); if (!b || !p || b.planks >= 6) return;
    b.planks++; this.emit('plank', { b: b.id, n: b.planks, d: 1 });
    if (p.repairPts < 500) { p.repairPts += 10; this.addPoints(pid, 10, true); }
  },

  /* ─── Interactions (validées par l'hôte) ─── */
  interact(pid, kind, id) {
    if (!this.authority) { NET.send('act', [kind, id]); return; }
    const p = this.players.get(pid); if (!p) return;
    if (kind === 'door') { const d = MAP.doors[id]; if (!d || d.open) return; if (this.pay(pid, d.cost)) this.emit('door', { id }); }
    else if (kind === 'power') { if (!this.power) this.emit('power', {}); }
    else if (kind === 'perk') {
      const def = PERKS[id], wp = WORLD.perks.find((q) => q.key === id);
      if (wp.locked || (wp.needsPower && !this.power && !(id === 'revive' && this.solo))) return this.tell(pid, 'deny');
      if (p.perks.has(id) || p.perks.size >= 4) return this.tell(pid, 'deny');
      if (id === 'revive' && this.solo && (p.reviveBuys || 0) >= 3) return this.tell(pid, 'deny');
      const cost = id === 'revive' && !this.solo ? def.coopCost : def.cost;
      if (this.pay(pid, cost)) { p.perks.add(id); if (id === 'revive') p.reviveBuys = (p.reviveBuys || 0) + 1; this.emit('perk', { pid, key: id }); }
    }
    else if (kind === 'wall') {
      const wb = WORLD.wallBuys[id], w = WEAPONS[wb.weapon]; const has = p.isLocal ? P.weapons.find((q) => q.key === wb.weapon) : (p.inv || []).find((q) => q[0] === wb.weapon);
      if (has) { const up = p.isLocal ? has.up : has[1]; if (this.pay(pid, ammoCost(wb.weapon, up))) this.emit('ammo', { pid, key: wb.weapon }); }
      else if (this.pay(pid, w.cost)) this.emit('grant', { pid, key: wb.weapon, up: false });
    }
    else if (kind === 'box') {
      const bx = this.box;
      if (bx.state === 'idle') { if (bx.locked) return this.tell(pid, 'deny'); const price = boxPrice(); if (this.pay(pid, price)) { bx.uses++; bx.paid = price; const inv = p.isLocal ? P.weapons.map((q) => q.key) : (p.inv || []).map((q) => q[0]); const key = rollBoxWeapon(inv); const empty = !this.pu.firesale && bx.uses >= 4 && Math.random() < 0.22; this.emit('box', { state: 'rolling', loc: bx.loc, key: empty ? null : key, buyer: pid, t: 4.2, empty }); } }
      else if (bx.state === 'offer' && bx.buyer === pid) { this.emit('grant', { pid, key: bx.key, up: false }); this.emit('box', { state: 'closing', loc: bx.loc, t: 0.8 }); }
    }
    else if (kind === 'bench') {
      const bn = this.bench;
      if (!this.power) return this.tell(pid, 'deny');
      if (bn.state === 'idle') { const cur = p.isLocal ? curW() : null, key = p.isLocal ? cur?.key : id; const up = p.isLocal ? cur?.up : false; if (!key || key === 'knife' || up) return this.tell(pid, 'deny'); if (this.pay(pid, 5000)) this.emit('bench', { state: 'working', key, owner: pid, t: 4.6 }); }
      else if (bn.state === 'ready' && bn.owner === pid) { this.emit('grant', { pid, key: bn.key, up: true }); this.emit('bench', { state: 'idle' }); }
    }
    else if (kind === 'repair') this.repair(pid, id);
    else if (kind === 'unlock') { if (this.pay(pid, 2000)) this.emit('unlock', { id }); }
    else if (pwrInteract(pid, kind, id)) { /* courant en plusieurs étapes */ }
    else if (secretInteract(pid, kind, id)) { /* disques cachés */ }
    else if (mapHook('interact', pid, kind, id)) { /* règle propre à la carte */ }
    else if (kind === 'revive') { const t = this.players.get(id); if (t && t.down) this.emit('revived', { pid: id }); }
  },
  boxNext() {
    const bx = this.box;
    if (bx.state === 'rolling') { if (bx.empty) { this.addPoints(bx.buyer, bx.paid ?? 950, false); const nl = (bx.loc + 1 + ((Math.random() * (WORLD.boxSpots.length - 1)) | 0)) % WORLD.boxSpots.length; this.emit('box', { state: 'moving', loc: bx.loc, next: nl, t: 3.2 }); } else this.emit('box', { state: 'offer', loc: bx.loc, key: bx.key, buyer: bx.buyer, t: 9 }); }
    else if (bx.state === 'offer') this.emit('box', { state: 'closing', loc: bx.loc, t: 0.8 });
    else if (bx.state === 'moving') this.emit('box', { state: 'idle', loc: bx.next, uses: 0 });
    else this.emit('box', { state: 'idle', loc: bx.loc });
  },

  /* ─── Bonus lâchés par les infectés ─── */
  maybeDrop(z) {
    if (this.dropsRound >= 4) return;
    const tx = tileOf(z.pos.x), tz = tileOf(z.pos.z); if (tClass(tx, tz) !== C_TRENCH) return;
    if (Math.random() < 0.024 || this.killsSinceDrop > 55) {
      const opts = ['maxammo', 'instakill', 'double', 'nuke', 'double', 'instakill', 'maxammo'];
      if (MAP.barricades.some((b) => MAP.zoneActive[b.zone] && b.planks < 4)) opts.push('carpenter', 'carpenter');
      if (this.round >= 3) opts.push('bonus'); if (this.round >= 5 && !this.box.locked && this.box.state === 'idle') opts.push('firesale'); if (this.round >= 4) opts.push('zblood');
      let type; do { type = pick(opts); } while (type === this.lastDrop && Math.random() < 0.8);
      this.spawnDrop(type, z.pos);
    }
  },
  spawnDrop(type, pos, force) {
    const tx = tileOf(pos.x), tz = tileOf(pos.z); if (!force && tClass(tx, tz) !== C_TRENCH) return;
    const [x, z] = force ? reachSpot(pos.x, pos.z) : [pos.x, pos.z];
    this.dropsRound++; this.killsSinceDrop = 0; this.lastDrop = type;
    this.emit('drop', { id: this.dropSeq++, type, x: +x.toFixed(2), z: +z.toFixed(2) });
  },
  updateDrops(dt) {
    for (let i = this.drops.length - 1; i >= 0; i--) {
      const d = this.drops[i]; d.life -= dt;
      d.g.position.y = 0.95 + Math.sin(this.time * 2.5 + d.id) * 0.12; d.icon.material.rotation = Math.sin(this.time * 1.5) * 0.15;
      d.g.visible = d.life > 6 || Math.sin(d.life * (d.life < 3 ? 22 : 10)) > -0.2;
      if (Math.random() < dt * 14) FX.glow.spawn(d.g.position.x + rand(-0.3, 0.3), d.g.position.y - 0.3, d.g.position.z + rand(-0.3, 0.3), 0, rand(0.3, 0.9), 0, rand(0.5, 1), 0.05, 0.35, 1, 0.5, 1, -0.2, 0.2);
      if (this.authority) {
        for (const [pid, p] of this.players) { if (p.down || p.dead) continue; if (Math.hypot(p.pos.x - d.g.position.x, p.pos.z - d.g.position.z) < 1.3) { this.emit('take', { id: d.id, type: d.type, pid }); break; } }
        if (d.life <= 0 && this.drops.includes(d)) this.emit('take', { id: d.id, gone: 1 });
      }
    }
  },

  /* ─── Événements (appliqués chez tous les joueurs) ─── */
  emit(type, data, noLocal) { if (!noLocal) this.applyEvent(type, data); if (NET.active && this.authority) NET.broadcast('ev', [type, data]); },
  netEvent(type, data) { if (NET.active && this.authority) NET.broadcast('ev', [type, data]); },
  applyEvent(type, d) {
    switch (type) {
      case 'round': {
        this.round = d.n; this.blizzard = d.blizzard; WEATHER.target = d.blizzard ? 1 : 0;
        UI.round(d.n); Sfx.roundStart(d.n);
        UI.message(d.blizzard ? `MANCHE ${d.n} — ${M.env.storm.title}` : `MANCHE ${d.n}`, d.blizzard ? M.env.storm.sub : d.n === 1 ? 'Tenez les barricades. Réparez-les avec E.' : '');
        if (d.n > 1) { P.grenades = Math.min(4, P.grenades + 2); UI.grenades(); }
        if (P.dead) { // retour au front : on garde ses armes, chargeur plein et au moins la moitié des munitions
          P.dead = false; P.down = false; P.hp = P.maxHp;
          if (P.lastStand) { const i = P.weapons.indexOf(P.lastStand); if (i >= 0) P.weapons.splice(i, 1); P.lastStand = null; }
          if (!P.weapons.length) P.weapons = [{ key: 'pistol', up: false, mag: 12, reserve: 60 }];
          for (const w of P.weapons) { const S = wstat(w.key, w.up); w.mag = S.mag; w.reserve = Math.max(w.reserve, Math.round(S.reserve / 2)); }
          P.slot = 0; P.reload = null; setViewmodel(P.weapons[0].key, P.weapons[0].up); UI.ammo();
          const s = SPOTS.start; P.pos.set(tcx(s[0]), 0, tcx(s[1])); UI.downed(false); NET.localAction('alive'); NET.localAction('inv');
        }
        break;
      }
      case 'rend': Sfx.roundEnd(); UI.message('MANCHE TERMINÉE', 'Profitez du répit pour vous réarmer.'); if (this.blizzard) WEATHER.target = 0; break;
      case 'door': {
        const dr = MAP.doors[d.id]; dr.open = true; dr.anim = 0.0001; decalsOffObj(dr.group); refreshZones(); Sfx.door(_v1.set(tcx(dr.x), 1.2, tcx(dr.z)));
        const newly = dr.zones.map((z) => ZONE_NAMES[z]); UI.message('PASSAGE OUVERT', newly.join(' ↔ '));
        this.flowT = 0; break;
      }
      case 'power': this.power = true; PWR.stage = 4; pwrApply({ s: 4 }, true); setPowerVisuals(true); UI.message('LE COURANT EST RÉTABLI', 'Atouts et établi d\'armurier en service.'); UI.objective(); break;
      case 'secret': secretApply(d); break;
      case 'pwr': { // message de la pièce d'abord : « PIÈCES RÉUNIES » (la consigne suivante) doit rester affiché
        if (d.k !== undefined && !PWR.got[d.k]) { const n = (d.g || PWR.got).filter(Boolean).length; UI.message(`${pwrParts()[d.k].name}`, `${d.who ? d.who + ' · ' : ''}pièce ${n}/3`); Sfx.pickup(); }
        pwrApply(d); UI.objective(); break; }
      case 'plank': {
        const b = MAP.barricades[d.b]; b.planks = d.n;
        const k = d.d < 0 ? d.n : d.n - 1; // planche concernée
        if (d.d < 0) { b.plankShown[k] = false; b.plankAnim[k] = 0; Sfx.plankRip(b.center); fxSparks(b.center, 0); for (let i = 0; i < 6; i++) FX.soft.spawn(b.center.x, b.center.y, b.center.z, rand(-1, 1), rand(0, 2), rand(-1, 1), 0.6, 0.04, 0.4, 0.3, 0.2, 1, 9, 1); }
        else { b.plankShown[k] = true; b.plankAnim[k] = 0; Sfx.hammer(b.center); }
        break;
      }
      case 'perk': {
        const rec = this.players.get(d.pid); if (rec) rec.perks.add(d.key);
        if (d.pid === P.id) { P.perks.add(d.key); if (d.key === 'armor') { P.maxHp = DIFF().hp + 150; P.hp = P.maxHp; } const def = PERKS[d.key]; Sfx.jingle(def.notes, def.base); UI.perks(); UI.message(def.name, def.desc); }
        break;
      }
      case 'grant': if (d.pid === P.id) grantWeapon(d.key, d.up); else { const r = this.players.get(d.pid); if (r) { r.inv = r.inv || []; r.weaponKey = d.key; } } break;
      case 'ammo': if (d.pid === P.id) { const w = P.weapons.find((q) => q.key === d.key); if (w) { const S = wstat(w.key, w.up); w.reserve = S.reserve; w.mag = S.mag; UI.ammo(); } } break;
      case 'box': applyBoxState(d); break;
      case 'bench': applyBenchState(d); break;
      case 'drop': {
        const g = new THREE.Group(); g.position.set(d.x, 1, d.z); R.scene.add(g);
        const icon = new THREE.Sprite(new THREE.SpriteMaterial({ map: dropTexture(d.type), depthWrite: false, transparent: true })); icon.scale.set(0.75, 0.75, 1); g.add(icon);
        const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: TEX.sprites.glow, color: 0x3dff7a, blending: THREE.AdditiveBlending, depthWrite: false })); halo.scale.set(2.2, 2.2, 1); g.add(halo);
        this.drops.push({ id: d.id, type: d.type, g, icon, life: 26 }); Sfx.sparkle(g.position); break;
      }
      case 'take': {
        const i = this.drops.findIndex((q) => q.id === d.id); if (i < 0) break; const dr = this.drops[i]; R.scene.remove(dr.g); this.drops.splice(i, 1);
        if (d.gone) break;
        Sfx.pickup(); const def = DROP_TYPES[d.type]; UI.message(def.name, def.sub || '');
        if (d.type === 'maxammo') { for (const w of P.weapons) { const S = wstat(w.key, w.up); w.reserve = S.reserve; } P.grenades = 4; UI.ammo(); UI.grenades(); }
        else if (d.type === 'instakill') this.pu.instakill = 30;
        else if (d.type === 'double') this.pu.double = 30;
        else if (d.type === 'firesale') { this.pu.firesale = 30; Sfx.jingle?.([0, 4, 7, 12, 7, 12, 16, 19], 392); }
        else if (d.type === 'zblood') { const r = this.players.get(d.pid); if (r) r.zb = this.time + 20; if (d.pid === P.id) { P.zbloodT = 20; UI.message('SANG INFECTÉ', 'Les infectés ne vous voient plus pendant 20 s.'); } }
        else if (d.type === 'bonus') { if (this.authority) for (const [pid] of this.players) this.addPoints(pid, 500, false); }
        else if (d.type === 'nuke') nukeFX(this.authority);
        else if (d.type === 'carpenter') { for (const b of MAP.barricades) if (b.planks < 6) { for (let k = b.planks; k < 6; k++) { b.plankShown[k] = true; b.plankAnim[k] = -k * 0.15; } b.planks = 6; } Sfx.hammer(P.pos); if (this.authority) for (const [pid] of this.players) this.addPoints(pid, 200, false); }
        break;
      }
      case 'zdie': { const z = ZOMBIES.find((q) => q.id === d.id); if (z && z.alive) z.die({ head: !!d.h, explosive: !!d.e, melee: !!d.m, dir: _v1.set(d.dx, 0, d.dz) }); break; }
      case 'zfreeze': { const z = ZOMBIES.find((q) => q.id === d.id); if (z && z.alive) z.freeze(1.2); break; }
      case 'zshatter': { const z = ZOMBIES.find((q) => q.id === d.id); if (z && z.state !== 'dead') { z.state = 'dead'; z.holder.visible = false; z.t = 8.5; fxIce(_v1.set(z.pos.x, z.pos.y + 1, z.pos.z)); Sfx.shatter(z.pos); } break; }
      case 'zlimb': { const z = ZOMBIES.find((q) => q.id === d.id); if (z) for (const b of d.b) zSever(z, b, _v1.set(d.dx, 0, d.dz)); break; }
      case 'zcrawl': { const z = ZOMBIES.find((q) => q.id === d.id); if (z) { z.crawl = true; z.speed = ZSPEED.crawler; } break; }
      case 'zv': { const z = ZOMBIES.find((q) => q.id === d[0]); if (z && z.remote) Sfx.zombie(z.pos, d[1] ? 'scream' : 'groan'); break; }
      case 'za': { const z = ZOMBIES.find((q) => q.id === d[0]); if (z && z.remote) { z.state = 'attack'; z.attackT = 0; Sfx.zombie(z.pos, 'attack'); } break; }
      case 'down': { const r = this.players.get(d.pid); if (r) r.down = true; if (d.pid !== P.id) UI.message(`${r?.name || 'UN CAMARADE'} EST À TERRE`, 'Maintenez E près de lui pour le relever.'); UI.team(); break; }
      case 'revived': { const r = this.players.get(d.pid); if (r) r.down = false; if (d.pid === P.id && P.down) { standUp(); UI.downed(false); UI.message('RELEVÉ', ''); } UI.team(); break; }
      case 'dead': { const r = this.players.get(d.pid); if (r) { r.dead = true; r.down = false; } UI.team(); break; }
      case 'alive': { const r = this.players.get(d.pid); if (r) { r.dead = false; r.down = false; } UI.team(); break; }
      case 'gameover': showGameOver(d); break;
      case 'lock': setLock(d.id, true); break;
      case 'unlock': setLock(d.id, false); Sfx.zap?.(P.pos); UI.message('CADENAS BRISÉ', ''); break;
      case 'scream': { const z = ZOMBIES.find((q) => q.id === d.id); if (z) { z.screaming = 1.2; Sfx.zombie(z.pos, 'scream', 0.55); Sfx.zombie(z.pos, 'scream', 0.8); fxSnowBurst(_v1.set(z.pos.x, z.pos.y + 0.2, z.pos.z), 30); if (z.pos.distanceTo(P.pos) < 14) FX.shake = Math.max(FX.shake, 0.15); } break; }
      case 'frostburst': {
        const p = _v1.set(d.x, groundAt(d.x, d.z) + 1, d.z); fxIce(p); fxIce(_v2.set(d.x, p.y - 0.5, d.z)); fxSnowBurst(p, 30); Sfx.shatter(p);
        if (!P.down && !P.dead && Math.hypot(P.pos.x - d.x, P.pos.z - d.z) < 3.8) { P.frostT = 3.2; UI.message('GELÉ', 'Vous êtes ralenti un instant.'); }
        break;
      }
      default: mapHook('apply', type, d);
    }
  },

  /* ─── Joueur local à terre ─── */
  localDown() {
    UI.downed(true, this.solo ? (P.selfRevive > 0 ? 'Second Souffle… vous vous relevez' : '') : 'Un camarade peut vous relever');
    if (this.solo && P.selfRevive <= 0) { this.deathCam = 0.01; }
    if (this.authority) this.emit('down', { pid: P.id }); else NET.send('down', []);
  },
  localRevived(self) { standUp(); P.perks.delete('revive'); const me = this.me(); if (me) me.perks.delete('revive'); UI.perks(); UI.downed(false); UI.message('SECOND SOUFFLE', 'Vous vous relevez.'); if (this.authority) this.emit('revived', { pid: P.id }); },
  localBledOut() { P.dead = true; P.down = false; UI.downed(true, 'Vous reviendrez à la prochaine manche'); if (this.authority) this.emit('dead', { pid: P.id }); else NET.send('dead', []); },

  gameOver() {
    const stats = [...this.players.values()].map((p) => ({ name: p.name, id: p.id, points: p.points, kills: p.kills, heads: p.heads, downs: p.isLocal ? P.stats.downs : p.downs, acc: p.isLocal ? (P.stats.shots ? Math.round((P.stats.hits / P.stats.shots) * 100) : 0) : p.acc ?? null }));
    this.emit('gameover', { round: Math.max(0, this.round), stats, gid: this.gid, obj: mapHook('objective') ?? (QUEST.done ? 1 : 0), date: Date.now(), map: MAP_ID });
  },

  /* ─── Animations partagées ─── */
  updateDoorsAnim(dt) {
    for (const d of MAP.doors) {
      if (!d.open || d.anim >= 1) continue;
      d.anim = Math.min(1, d.anim + dt / 1.3); const k = smooth(d.anim);
      if (d.kind === 'steel' || d.kind === 'bars') d.leaf.position.x = k * 2.0;
      else if (d.kind === 'debris' || d.kind === 'rubble') { d.leaf.position.y = -k * 2.8; d.leaf.rotation.z = k * 0.12; }
      else if (d.kind === 'wood') { const a = k * 1.62; d.leaf.rotation.y = a; d.leaf.position.x = -0.96 + 0.96 * Math.cos(a); d.leaf.position.z = -0.96 * Math.sin(a); }
      else { d.leaf.position.y = k * 3.2; d.leaf.rotation.z = k * 0.5; d.leaf.position.x = k * 0.6; }
      if (d.anim >= 1 && d.kind !== 'wood') d.group.visible = false;
      if (Math.random() < dt * 20) FX.soft.spawn(tcx(d.x) + rand(-1, 1), rand(0, 2), tcx(d.z) + rand(-1, 1), rand(-0.5, 0.5), rand(0, 1), rand(-0.5, 0.5), 1.2, 0.3, 0.8, 0.82, 0.86, 0.4, 0, 1, 0.5);
    }
  },
  updatePlanksAnim(dt) {
    let dirty = false;
    for (const b of MAP.barricades) for (let k = 0; k < 6; k++) {
      if (b.plankAnim[k] >= 1) continue;
      b.plankAnim[k] = Math.min(1, b.plankAnim[k] + dt / 0.45); dirty = true;
      const t = Math.max(0, b.plankAnim[k]), base = b.plankM[k];
      if (b.plankShown[k]) { // la planche revient se clouer
        const k2 = smooth(t); _m1.copy(base); base.decompose(_v1, _q1, _v2); _v1.x += b.dir[0] * (1 - k2) * 1.2; _v1.z += b.dir[1] * (1 - k2) * 1.2; _v1.y += (1 - k2) * 0.6; _m1.compose(_v1, _q1, _v2);
      } else { // arrachée : part vers l'extérieur et tombe
        base.decompose(_v1, _q1, _v2); _v1.x += b.dir[0] * t * 1.8; _v1.z += b.dir[1] * t * 1.8; _v1.y += Math.sin(t * Math.PI) * 0.6 - t * 0.6 + t * WALL_H * 0.5;
        _e1.set(t * 2.5, t * 1.4, t * 3); _q1.multiply(new THREE.Quaternion().setFromEuler(_e1)); _v2.setScalar(t >= 1 ? 0.0001 : 1); _m1.compose(_v1, _q1, _v2);
      }
      WORLD.planks.setMatrixAt(b.id * 6 + k, _m1);
    }
    if (dirty) WORLD.planks.instanceMatrix.needsUpdate = true;
  },
  updateBoxBench(dt) {
    const bx = this.box, spot = WORLD.boxSpots[bx.loc];
    bx.visT = (bx.visT || 0) + dt;
    for (const s of WORLD.boxSpots) { const active = s === spot && bx.state !== 'moving'; s.beacon.material.opacity = active ? 0.7 + Math.sin(this.time * 6) * 0.3 : 0; s.glow.material.opacity = active && bx.state !== 'idle' ? 0.35 : active ? 0.1 : 0; if (active && Math.random() < dt * 10) FX.glow.spawn(s.group.position.x + s.face[0] * -0.3, 0.6, s.group.position.z + s.face[1] * -0.3, rand(-0.2, 0.2), rand(0.4, 1.2), rand(-0.2, 0.2), 1, 0.05, 0.4, 1, 0.7, 1, -0.3, 0.2); }
    // Couvercle.
    const open = bx.state === 'rolling' || bx.state === 'offer';
    spot.lid.rotation.x = damp(spot.lid.rotation.x, open ? -1.6 : 0, 7, dt);
    if (bx.display) {
      const dp = bx.display;
      if (bx.state === 'rolling') { dp.cycleT -= dt; if (dp.cycleT <= 0) { dp.cycleT = lerp(0.08, 0.35, 1 - bx.clientT / 4.2); setBoxDisplay(bx.empty && bx.clientT < 0.6 ? 'skull' : pick(Object.keys(WEAPONS).filter((k) => k !== 'pistol'))); } bx.clientT = Math.max(0, (bx.clientT ?? 4.2) - dt); dp.obj.position.y = lerp(0.7, 1.35, 1 - bx.clientT / 4.2); }
      if (dp.obj) { dp.obj.rotation.y = bx.state === 'offer' ? Math.sin(this.time) * 0.3 : 0; if (bx.state === 'offer') dp.obj.position.y = 1.35 + Math.sin(this.time * 2) * 0.03 - Math.max(0, 3 - bx.clientT) * 0.12; if (bx.state === 'offer') bx.clientT = Math.max(0, bx.clientT - dt); }
    }
    if (bx.state === 'moving') { bx.clientT = (bx.clientT || 0) + dt; spot.group.position.y = Math.max(0, (bx.clientT - 1) * 6); if (Math.random() < dt * 30) fxSnowBurst(_v1.set(spot.group.position.x, spot.group.position.y + 0.3, spot.group.position.z), 2); }
    // Établi.
    const bn = this.bench, bw = WORLD.bench;
    const spin = WORLD.spin.find((s) => s.key === 'bench'); spin.speed = damp(spin.speed, bn.state === 'working' ? 30 : 0, 3, dt);
    bw.lamp.material.opacity = this.power ? (bn.state === 'working' ? 0.9 + Math.random() * 0.1 : 0.55) : 0;
    bw.coil.emissiveIntensity = this.power ? (bn.state === 'working' ? 2.5 + Math.sin(this.time * 20) : 1.1) : 0.02;
    if (bn.state === 'working' && Math.random() < dt * 40) { const wp = bw.wheel.getWorldPosition(_v1); fxSparks(wp, 2, _v2.set(bw.face[0] * -1, 0, bw.face[1] * -1)); }
    if (bn.display) { bn.display.rotation.z = bn.state === 'working' ? Math.sin(this.time * 30) * 0.02 : 0; }
    // Générateur.
    const gs = WORLD.spin.find((s) => s.key === 'gen'); if (gs) gs.speed = damp(gs.speed, this.power ? 14 : 0, 0.8, dt);
    if (WORLD.generator && this.power && Math.random() < dt * 6) { const e = WORLD.generator.exhaust; FX.soft.spawn(e.x, e.y, e.z, rand(-0.1, 0.1), rand(0.8, 1.4), rand(-0.1, 0.1), 2.5, 0.2, 0.25, 0.25, 0.27, 0.45, -0.1, 0.5, 0.4); }
    // Enseignes des atouts.
    for (const p of WORLD.perks) { const on = this.power || !p.needsPower; const f = on ? 1.1 + Math.sin(this.time * 3 + p.pos.x) * 0.08 + (Math.random() < 0.003 ? -0.8 : 0) : 0.05; p.sign.emissiveIntensity = f; p.bottles.emissiveIntensity = on ? 0.9 : 0.05; p.bulb.material.opacity = on ? 0.55 * f : 0; }
  },
};

/* ─── Fonctions de partie partagées ─── */
// Résistance des infectés : +100 par manche jusqu'à la 9e, puis ×1,09 jusqu'à la 20e et ×1,05 ensuite
// (la courbe ×1,10 d'origine transformait les manches 25+ en éponges à balles : ~40 tirs par infecté).
function boxPrice() { return G.pu.firesale > 0 ? 10 : 950; }
function zombieHp(n) { return n < 10 ? 150 + 100 * (n - 1) : Math.round(950 * Math.pow(1.09, Math.min(n, 20) - 9) * Math.pow(1.05, Math.max(0, n - 20))); }
function rollBoxWeapon(inv) {
  const pool = [];
  for (const [k, w] of Object.entries(WEAPONS)) { if (k === 'pistol' || inv.includes(k)) continue; const wt = w.weight ?? 1; for (let i = 0; i < Math.round(wt * 10); i++) pool.push(k); }
  return pick(pool);
}
function grantWeapon(key, up) {
  const S = wstat(key, up), entry = { key, up, mag: S.mag, reserve: S.reserve };
  const have = P.weapons.findIndex((w) => w.key === key);
  if (have >= 0) { P.weapons[have] = entry; P.slot = have; }
  else if (P.weapons.length < maxWeapons()) { P.weapons.push(entry); P.slot = P.weapons.length - 1; }
  else P.weapons[P.slot] = entry;
  P.reload = null; setViewmodel(key, up); UI.ammo();
  UI.message(S.name, up ? 'Arme améliorée' : '');
  NET.localAction('inv');
}
function setBoxDisplay(key) {
  const bx = G.box, spot = WORLD.boxSpots[bx.loc];
  if (bx.display?.obj) bx.display.obj.removeFromParent(); // retiré de là où il est vraiment, même si la caisse a changé de place
  let obj;
  if (key === 'skull') { obj = new THREE.Sprite(new THREE.SpriteMaterial({ map: dropTexture('instakill'), color: 0x9fe8ff, depthWrite: false })); obj.scale.set(0.6, 0.6, 1); }
  else obj = gunShow(key, false, 'box');
  obj.position.set(0, 0.8, 0); spot.group.add(obj);
  bx.display = Object.assign(bx.display || { cycleT: 0 }, { obj, key });
}
function clearBoxDisplay() { const bx = G.box; if (bx.display?.obj) bx.display.obj.removeFromParent(); bx.display = null; }
function applyBoxState(d) {
  const bx = G.box;
  if (d.state === 'idle' || d.state === 'closing' || d.state === 'rolling') clearBoxDisplay();
  if (d.loc !== undefined && d.loc !== bx.loc && d.state === 'idle') placeBox(d.loc);
  bx.state = d.state; bx.t = d.t ?? 0; bx.clientT = d.t ?? 0;
  if (d.buyer !== undefined) bx.buyer = d.buyer; if (d.key !== undefined) bx.key = d.key; if (d.empty !== undefined) bx.empty = d.empty; if (d.next !== undefined) bx.next = d.next; if (d.uses !== undefined) bx.uses = d.uses;
  const spot = WORLD.boxSpots[bx.loc];
  if (d.state === 'rolling') { bx.display = { cycleT: 0 }; setBoxDisplay('bolt'); Sfx.musicBox(spot.group.position); }
  else if (d.state === 'offer') { setBoxDisplay(bx.key); bx.clientT = d.t; }
  else if (d.state === 'moving') { if (bx.display?.obj) setBoxDisplay('skull'); Sfx.eerie(spot.group.position); UI.message('LA CAISSE SE DÉPLACE', 'Points remboursés. Cherchez la fusée verte.'); bx.clientT = 0; }
  else if (d.state === 'closing' || d.state === 'idle') clearBoxDisplay();
}
function placeBox(loc) {
  for (const s of WORLD.boxSpots) { s.group.position.y = 0; s.lid.rotation.x = 0; s.group.visible = true; s.label.visible = s.idx === loc; }
  G.box.loc = loc;
}
function applyBenchState(d) {
  const bn = G.bench, bw = WORLD.bench;
  bn.state = d.state; bn.t = d.t ?? 0; if (d.key !== undefined) bn.key = d.key; if (d.owner !== undefined) bn.owner = d.owner;
  if (bn.display) { bn.display.removeFromParent(); bn.display = null; }
  if (d.state === 'working') {
    bn.display = gunShow(bn.key, false, 'bench'); bw.anchor.add(bn.display); Sfx.grind(bw.pos, 4.4);
    if (d.owner === P.id) { const i = P.weapons.findIndex((w) => w.key === bn.key); if (i >= 0) { P.weapons.splice(i, 1); P.slot = 0; P.reload = null; if (P.weapons.length) { const w = curW(); setViewmodel(w.key, w.up); } else { if (VM.root) VM.root.visible = false; VM.key = null; UI.weapon(); } } }
  } else if (d.state === 'ready') { bn.display = gunShow(bn.key, true, 'bench'); bw.anchor.add(bn.display); Sfx.jingle([0, 7, 12, 16, 19], 392, 'sine', 0.1); }
}
function setPowerVisuals(on, silent) {
  for (const lamp of WORLD.powerLamps) { lamp.bulb.material = on ? MATS.bulbWarm : MATS.bulbRed; lamp.glow.material.color.set(on ? 0xffd9a0 : 0xff3a22); }
  M.onPower?.(on, silent);
  WORLD.power.lever.rotation.x = on ? 0.6 : 2.5; WORLD.power.lamp.color.set(on ? 0x44ff66 : 0x551010);
  if (on && !silent) { Sfx.generatorStart((WORLD.generator ? WORLD.generator.group : WORLD.power).position || WORLD.power.pos); FX.shake = Math.max(FX.shake, 0.3); }
}
function nukeFX(authority) {
  const fl = $('flashWhite'); fl.style.transition = 'none'; fl.style.opacity = 0.95; requestAnimationFrame(() => { fl.style.transition = 'opacity 2.2s'; fl.style.opacity = 0; });
  Sfx.explosion(P.pos, 1.4); FX.shake = 1.2;
  for (let i = 0; i < 6; i++) setTimeout(() => { const a = rand(TAU), r = rand(8, 22); const x = P.pos.x + Math.cos(a) * r, z = P.pos.z + Math.sin(a) * r; fxExplosion(_v3.set(x, surfH(x, z), z), 4); }, 200 + i * 220);
  if (authority) setTimeout(() => { for (const z of [...ZOMBIES]) if (z.alive) { z.die({ explosive: true, dir: _v1.set(rand(-1, 1), 0, rand(-1, 1)) }); G.emit('zdie', { id: z.id, h: 0, e: 1, dx: 0, dz: 1 }, true); G.alive--; } G.alive = 0; for (const [pid] of G.players) G.addPoints(pid, 400, false); }, 900);
}

/* ─── Interactions locales : détection et invite ─── */
const INTERACT = { cur: null, repairT: 0, reviveT: 0 };
function updateInteraction(dt) {
  if (G.mode !== 'playing') return;
  const me = G.me(); const pts = me ? me.points : 0;
  const px = P.pos.x, pz = P.pos.z;
  let best = null, bd = 1e9;
  // Seuls les objets à portée concourent ; une simple information cède la place à une action proche.
  const cand = (d, obj) => { if (d > obj.range) return; const s = d + (obj.kind === 'info' ? 0.6 : 0); if (s < bd) { bd = s; best = obj; } };
  if (!P.down && !P.dead) {
    for (const d of MAP.doors) if (!d.open) cand(Math.hypot(px - tcx(d.x), pz - tcx(d.z)) - 0.2, { kind: 'door', id: d.id, text: `Ouvrir le passage — ${d.label}`, cost: d.cost, range: 2.1 });
    for (const b of MAP.barricades) if (b.planks < 6 && MAP.zoneActive[b.zone]) cand(Math.hypot(px - b.center.x, pz - b.center.z), { kind: 'repair', id: b.id, text: 'Maintenir pour réparer la barricade', range: 2.1, hold: true });
    WORLD.wallBuys.forEach((wb, i) => { const w = WEAPONS[wb.weapon], has = P.weapons.find((q) => q.key === wb.weapon); cand(Math.hypot(px - wb.pos.x, pz - wb.pos.z), has ? { kind: 'wall', id: i, text: `Munitions — ${has.up ? w.up.name : w.name}`, cost: ammoCost(wb.weapon, has.up), range: 1.7 } : { kind: 'wall', id: i, text: `Acheter ${w.name}`, cost: w.cost, range: 1.7 }); });
    for (const p of WORLD.perks) if (p.locked) cand(Math.hypot(px - p.pos.x, pz - p.pos.z), { kind: 'unlock', id: 'p:' + p.key, text: `Briser le cadenas du Geôlier — ${PERKS[p.key].name}`, cost: 2000, range: 1.7 });
    for (const p of WORLD.perks) { if (p.locked) continue; const def = PERKS[p.key]; const cost = p.key === 'revive' && !G.solo ? def.coopCost : def.cost; const needP = p.needsPower && !G.power && !(p.key === 'revive' && G.solo); cand(Math.hypot(px - p.pos.x, pz - p.pos.z), P.perks.has(p.key) ? { kind: 'info', text: `${def.name} — déjà actif`, range: 1.7 } : needP ? { kind: 'info', text: `${def.name} — il faut rétablir le courant`, range: 1.7, deny: true } : { kind: 'perk', id: p.key, text: `${def.name} — ${def.desc}`, cost, range: 1.7 }); }
    pwrCandidates(cand, px, pz); secretCandidates(cand, px, pz);
    const bx = G.box, spot = WORLD.boxSpots[bx.loc];
    { const d = Math.hypot(px - spot.pos.x, pz - spot.pos.z);
      if (bx.state === 'idle' && bx.locked) cand(d, { kind: 'unlock', id: 'b', text: 'Briser le cadenas du Geôlier — caisse', cost: 2000, range: 1.9 });
      else if (bx.state === 'idle') cand(d, { kind: 'box', text: G.pu.firesale > 0 ? 'Caisse de ravitaillement — BRADERIE !' : 'Caisse de ravitaillement — arme aléatoire', cost: boxPrice(), range: 1.9 });
      else if (bx.state === 'offer' && bx.buyer === P.id) cand(d, { kind: 'box', text: `Prendre : ${WEAPONS[bx.key]?.name || ''}`, range: 1.9 }); }
    { const bn = G.bench, bw = WORLD.bench, d = Math.hypot(px - bw.pos.x, pz - bw.pos.z), cw = curW();
      if (!G.power) cand(d, { kind: 'info', text: "Établi d'armurier — il faut du courant", range: 1.9, deny: true });
      else if (bn.state === 'idle') cand(d, cw && !cw.up ? { kind: 'bench', id: cw.key, text: `Améliorer ${WEAPONS[cw.key].name}`, cost: 5000, range: 1.9 } : { kind: 'info', text: 'Arme déjà améliorée', range: 1.9 });
      else if (bn.state === 'ready' && bn.owner === P.id) cand(d, { kind: 'bench', text: `Récupérer ${WEAPONS[bn.key].up.name} (${Math.ceil(bn.t)} s)`, range: 1.9 });
      else if (bn.state === 'working') cand(d, { kind: 'info', text: 'Amélioration en cours…', range: 1.9 }); }
    mapHook('candidates', cand, px, pz);
    for (const [id, r] of G.players) if (!r.isLocal && r.down && !r.dead) cand(Math.hypot(px - r.pos.x, pz - r.pos.z), { kind: 'revive', id, text: `Maintenir pour relever ${r.name}`, range: 1.8, hold: true });
  }
  INTERACT.cur = best;
  UI.prompt(best, pts);
  const held = key('KeyE') || INPUT.interactHeld, pressed = INPUT.interactPressed; INPUT.interactPressed = false;
  if (!best) { INTERACT.reviveT = 0; INTERACT.holdT = 0; UI.progress(-1); P.revivingOther = false; return; }
  if (best.holdTime) { // action à maintenir (installer, lancer le moteur…)
    if (held) { INTERACT.holdT = (INTERACT.holdT || 0) + dt; UI.progress(INTERACT.holdT / best.holdTime); if (INTERACT.holdT >= best.holdTime) { INTERACT.holdT = 0; UI.progress(-1); G.interact(P.id, best.kind, best.id); } } else { INTERACT.holdT = 0; UI.progress(-1); }
    return;
  }
  if (best.kind === 'repair') { if (held) { INTERACT.repairT -= dt; if (INTERACT.repairT <= 0) { INTERACT.repairT = 0.55; G.interact(P.id, 'repair', best.id); } } else INTERACT.repairT = 0; }
  else if (best.kind === 'calib') { if (held) { INTERACT.calibT = (INTERACT.calibT || 0) - dt; UI.progress(QUEST.calib / 20); if (INTERACT.calibT <= 0) { INTERACT.calibT = 0.25; G.interact(P.id, 'calib'); } } else UI.progress(-1); }
  else if (best.kind === 'revive') {
    if (held) { const need = P.perks.has('revive') ? 1.6 : 3.2; INTERACT.reviveT += dt; UI.progress(INTERACT.reviveT / need); if (!P.revivingOther) { P.revivingOther = true; NET.send('reviving', [best.id, 1]); } if (INTERACT.reviveT >= need) { INTERACT.reviveT = 0; UI.progress(-1); G.interact(P.id, 'revive', best.id); P.revivingOther = false; } }
    else { if (P.revivingOther) NET.send('reviving', [best.id, 0]); P.revivingOther = false; INTERACT.reviveT = 0; UI.progress(-1); }
  }
  else if (pressed && best.kind !== 'info') {
    if (best.cost && pts < best.cost) { Sfx.deny(); UI.flashPrompt(); return; }
    G.interact(P.id, best.kind, best.id);
  } else if (pressed && best.deny) { Sfx.deny(); UI.flashPrompt(); }
}

/* ─── Fin de partie ─── */
function showGameOver(d) {
  G.mode = 'gameover'; document.exitPointerLock?.();
  const bk = MAP_ID === 'poste7' ? 'best' : 'best_' + MAP_ID, best = store.get(bk, { round: 0, kills: 0 });
  const myStats = d.stats.find((s) => s.id === P.id) || d.stats[0];
  const isRecord = d.round > (best.round || 0);
  if (isRecord || (d.round === best.round && myStats && myStats.kills > best.kills)) store.set(bk, { round: d.round, kills: myStats ? myStats.kills : 0 });
  const rank = BOARD.record(Object.assign({}, d, { stats: d.stats.map((s) => Object.assign({}, s, { dev: s.id === P.id ? DEVICE_ID : undefined })) }));
  UI.gameOver(d, isRecord);
  $('goRank').textContent = rank ? `Place au classement des camarades : ${rank}${rank === 1 ? 'ʳᵉ' : 'ᵉ'}` : '';
  Sfx.gameOver(); Sfx.setPad(0.2);
}

/* ─── Cadenas (posés par le Geôlier du Pénitencier) ─── */
let PADLOCK_GEO = null;
function padlockMesh() {
  if (!PADLOCK_GEO) {
    const body = new THREE.BoxGeometry(0.2, 0.18, 0.08), shackle = new THREE.TorusGeometry(0.07, 0.018, 6, 14, Math.PI); shackle.translate(0, 0.09, 0);
    const chain = []; for (let i = 0; i < 6; i++) { const l = new THREE.TorusGeometry(0.035, 0.01, 4, 8); l.rotateY(i % 2 ? Math.PI / 2 : 0); l.translate(-0.4 + i * 0.16 - (i > 2 ? 0 : 0), 0.14 - Math.abs(i - 2.5) * 0.03, 0); chain.push(l.toNonIndexed()); }
    PADLOCK_GEO = mergeGeometries([body.toNonIndexed(), shackle.toNonIndexed(), ...chain]);
  }
  return new THREE.Mesh(PADLOCK_GEO, MATS.brass);
}
function setLock(id, on) {
  let host = null, pos = null;
  if (id === 'b') { G.box.locked = on; const s = WORLD.boxSpots[G.box.loc]; host = s?.group; pos = [0, 0.45, 0.4]; }
  else { const p = WORLD.perks.find((q) => 'p:' + q.key === id); if (!p) return; p.locked = on; host = p.group; pos = [0, 1.05, 0.38]; }
  WORLD.locks ||= {};
  if (WORLD.locks[id]) { WORLD.locks[id].removeFromParent(); delete WORLD.locks[id]; }
  if (on && host) { const m = padlockMesh(); m.position.set(...pos); host.add(m); WORLD.locks[id] = m; }
}
