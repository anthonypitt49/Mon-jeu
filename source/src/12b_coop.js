/* ═══════════════════ CONFORT CO-OP : marqueurs (Q) et caméra spectateur ═══════════════════ */

const PING_COLORS = ['#9ce8ff', '#ffc857', '#9dff8a', '#ff9ad5'];
const PINGS = new Map(); // un marqueur par soldat : id → { el, x, y, z, zid, t, label }
const _pa = new THREE.Vector3(), _pb = new THREE.Vector3(), _pc = new THREE.Vector3(), _pd = new THREE.Vector3();
let pingCd = 0;
function playerColor(pid) { const order = [...G.players.keys()].sort(); return PING_COLORS[Math.max(0, order.indexOf(pid)) % PING_COLORS.length]; }

// Ce que l'on vise : un infecté, un objet utile à proximité, ou simplement un endroit.
function doPing() {
  if (G.mode !== 'playing' || pingCd > 0) return; pingCd = 0.45;
  const cam = R.camera, o = _pa.copy(cam.position), d = _pb.set(0, 0, -1).applyQuaternion(cam.quaternion);
  const zh = rayZombies(o, d, 70)[0], wh = rayWorld(o, d, 70), wd = wh ? wh.dist : 70;
  let x, y, z, zid = -1, label;
  if (zh && zh.dist < wd) { const h = zh.z.headPos(_pc); zid = zh.z.id; label = zh.z.brute ? 'COLOSSE' : 'INFECTÉ'; x = h.x; y = h.y + 0.35; z = h.z; }
  else { const t = Math.max(0.6, wd - 0.25); x = o.x + d.x * t; y = o.y + d.y * t; z = o.z + d.z * t; label = pingLabel(x, z) || (wh ? 'ICI' : 'LÀ-BAS'); y = Math.max(y, 0.4); }
  const a = [+x.toFixed(2), +y.toFixed(2), +z.toFixed(2), zid, label];
  addPing(P.id, a);
  if (G.authority) mapHook('ping', P.id, x, z); // l'hôte (ou le solo) : un signalement peut guider un tir (mortier…)
  if (NET.active) { if (NET.isHost) NET.broadcast('ping', [P.id, ...a]); else NET.send('ping', a); }
}
function pingLabel(x, z) {
  let best = null, bd = 2.6;
  const near = (px, pz, text) => { const d = Math.hypot(px - x, pz - z); if (d < bd) { bd = d; best = text; } };
  const sp = WORLD.boxSpots[G.box.loc]; if (sp && G.box.state !== 'moving') near(sp.pos.x, sp.pos.z, 'CAISSE');
  for (const p of WORLD.perks) near(p.pos.x, p.pos.z, PERKS[p.key].name);
  for (const wb of WORLD.wallBuys) near(wb.pos.x, wb.pos.z, WEAPONS[wb.weapon].name);
  for (const dr of MAP.doors) if (!dr.open) near(tcx(dr.x), tcx(dr.z), 'PASSAGE');
  for (const b of MAP.barricades) if (MAP.zoneActive[b.zone]) near(b.center.x, b.center.z, b.planks < 6 ? 'BARRICADE' : 'BARRICADE');
  if (!G.power) near(WORLD.power.pos.x, WORLD.power.pos.z, 'COURANT');
  near(WORLD.bench.pos.x, WORLD.bench.pos.z, 'ÉTABLI');
  (WORLD.traps || []).forEach((w) => near(w.pos.x, w.pos.z, 'BARBELÉS'));
  if (MAP_ID === 'poste7' && QUEST.stage >= 1 && QUEST.stage < 6) near(RADIO_POS.x, RADIO_POS.z, 'RADIO');
  mapHook('pingLabels', near);
  if (WORLD.mortar) near(WORLD.mortar.pos.x, WORLD.mortar.pos.z, 'MORTIER');
  for (const dp of G.drops) near(dp.g.position.x, dp.g.position.z, DROP_TYPES[dp.type].name);
  return best;
}
function addPing(pid, a) {
  if (!Array.isArray(a) || !$('pings')) return;
  let p = PINGS.get(pid);
  if (!p) { const el = document.createElement('div'); el.className = 'ping'; el.innerHTML = '<i></i><b></b><small></small>'; $('pings').appendChild(el); p = { el, b: el.children[1], s: el.children[2] }; PINGS.set(pid, p); }
  Object.assign(p, { x: +a[0] || 0, y: +a[1] || 0, z: +a[2] || 0, zid: Number.isInteger(a[3]) ? a[3] : -1, t: 8, dist: -1, who: pid === P.id ? '' : (G.players.get(pid)?.name || '') });
  p.el.style.setProperty('--c', playerColor(pid));
  p.b.textContent = String(a[4] || 'ICI').slice(0, 24);
  p.el.classList.remove('pop'); void p.el.offsetWidth; p.el.classList.add('pop');
  Sfx.ping(pid === P.id);
}
function clearPings() { for (const p of PINGS.values()) p.el.remove(); PINGS.clear(); }
// Projection des marqueurs à l'écran (collés au bord quand ils sont hors champ).
function updatePings(dt) {
  pingCd = Math.max(0, pingCd - dt);
  if (!PINGS.size) return;
  if (G.mode === 'menu') { clearPings(); return; }
  const cam = R.camera, W = innerWidth, H = innerHeight, m = 36;
  for (const [pid, p] of PINGS) {
    p.t -= dt;
    if (p.zid >= 0) { const z = ZOMBIES.find((q) => q.id === p.zid); if (z && z.alive) { z.headPos(_pd); p.x = _pd.x; p.y = _pd.y + 0.35; p.z = _pd.z; } else if (p.t > 0.6) p.t = 0.6; }
    if (p.t <= 0) { p.el.remove(); PINGS.delete(pid); continue; }
    _pd.set(p.x, p.y, p.z); const dist = Math.round(_pd.distanceTo(cam.position));
    _pd.project(cam);
    let sx = (_pd.x * 0.5 + 0.5) * W, sy = (-_pd.y * 0.5 + 0.5) * H, off = false;
    if (_pd.z > 1) { sx = W - sx; sy = H - m; off = true; } // derrière soi
    if (sx < m || sx > W - m || sy < m || sy > H - m) off = true;
    p.el.style.transform = `translate(${clamp(sx, m, W - m).toFixed(1)}px,${clamp(sy, m, H - m).toFixed(1)}px)`;
    p.el.style.opacity = Math.min(1, p.t / 0.6).toFixed(2);
    if (p.off !== off) { p.off = off; p.el.classList.toggle('off', off); }
    if (p.dist !== dist) { p.dist = dist; p.s.textContent = `${p.who ? p.who + ' · ' : ''}${dist} m`; }
  }
}

// Repère doré de l'objectif en cours (posé par le bandeau d'objectif) ; masqué de près et hors partie.
const OBJM = { el: null, at: null, dist: -1, off: null };
function updateObjMarker() {
  if (!OBJM.el) { OBJM.el = document.createElement('div'); OBJM.el.className = 'ping obj'; OBJM.el.innerHTML = '<i></i><b>OBJECTIF</b><small></small>'; $('pings').appendChild(OBJM.el); }
  const a = OBJM.at, live = G.mode === 'playing' && a && !P.dead;
  const d = live ? Math.hypot(a[0] - P.pos.x, a[2] - P.pos.z) : 0;
  if (!live || d < 3) { OBJM.el.style.display = 'none'; return; }
  OBJM.el.style.display = '';
  const cam = R.camera, W = innerWidth, H = innerHeight, m = 36;
  _pd.set(a[0], a[1], a[2]); _pd.project(cam);
  let sx = (_pd.x * 0.5 + 0.5) * W, sy = (-_pd.y * 0.5 + 0.5) * H, off = false;
  // Dans le dos : au milieu du bord gauche ou droit (côté où tourner), loin du bandeau et des compteurs du bas.
  if (_pd.z > 1) { sx = W - sx < W / 2 ? m : W - m; sy = H * 0.5; off = true; }
  if (sx < m || sx > W - m || sy < m || sy > H - m) off = true;
  OBJM.el.style.transform = `translate(${clamp(sx, m, W - m).toFixed(1)}px,${clamp(sy, Math.min(170, H * 0.3), H - Math.min(150, H * 0.3)).toFixed(1)}px)`;
  if (OBJM.off !== off) { OBJM.off = off; OBJM.el.classList.toggle('off', off); }
  const dm = Math.round(d); if (OBJM.dist !== dm) { OBJM.dist = dm; OBJM.el.lastChild.textContent = `${dm} m`; }
}

/* ─── Mort en co-op : on suit un camarade (clic ou Espace pour changer) ─── */
const SPEC = { target: null, idx: 0, d: 3.2, shown: null };
function updateSpectator(dt) {
  const list = [...G.players.values()].filter((r) => !r.isLocal && !r.dead && r.avatar).sort((a, b) => (a.id < b.id ? -1 : 1));
  if (!list.length) { spectateLabel(null); return false; }
  if (INPUT.firePressed || INPUT.jumpPressed) SPEC.idx++;
  INPUT.firePressed = INPUT.jumpPressed = INPUT.interactPressed = false;
  const r = list[SPEC.idx % list.length], av = r.avatar, cam = R.camera;
  const fresh = SPEC.target !== r.id;
  if (fresh) { SPEC.target = r.id; P.yaw = av.yaw; P.pitch = -0.22; UI.downed(false); UI.prompt(null, 0); UI.progress(-1); }
  P.pitch = clamp(P.pitch, -1.1, 0.7);
  // Pivot au-dessus de l'épaule droite, recul limité par les parois de la tranchée.
  const head = _pa.set(av.pos.x, av.pos.y + (r.flags & 1 ? 1.2 : 1.62), av.pos.z);
  const right = _pb.set(Math.cos(P.yaw), 0, -Math.sin(P.yaw));
  const hs = rayWorld(head, right, 0.55), side = hs ? Math.max(0, hs.dist - 0.2) : 0.45;
  const piv = head.addScaledVector(right, side);
  const cp = Math.cos(P.pitch), back = _pc.set(Math.sin(P.yaw) * cp, -Math.sin(P.pitch), Math.cos(P.yaw) * cp);
  const hb = rayWorld(piv, back, 3.6), want = hb ? Math.max(0.35, hb.dist - 0.25) : 3.2;
  SPEC.d = fresh || want < SPEC.d ? want : damp(SPEC.d, want, 4, dt);
  cam.position.copy(piv).addScaledVector(back, SPEC.d);
  cam.rotation.set(P.pitch, P.yaw, 0);
  if (Math.abs(cam.fov - settings.fov) > 0.05) { cam.fov = settings.fov; cam.updateProjectionMatrix(); updateParticleScale(); }
  R.lights.torch.intensity = r.flags & 64 ? 5.5 : 0;
  if (VM.root) VM.root.visible = false; $('scope').style.opacity = 0;
  const roofed = MAP.roof[ti(tileOf(av.pos.x), tileOf(av.pos.z))], L = R.lights;
  L.hemi.intensity = damp(L.hemi.intensity, (roofed ? 0.25 : 0.7) + R.flash * 0.6, 2, dt); R.vHemi.intensity = L.hemi.intensity * 1.1;
  const snap = 60 / Q.shadowSize || 0.1, cx = Math.round(av.pos.x / snap) * snap, cz = Math.round(av.pos.z / snap) * snap;
  L.moon.target.position.set(cx, 0, cz); L.moon.position.set(cx + MOON_DIR.x * 60, MOON_DIR.y * 60, cz + MOON_DIR.z * 60);
  Sfx.setListener(cam);
  spectateLabel(r);
  return true;
}
function spectateLabel(r) {
  const el = $('spectate'); if (!el) return;
  if (!r) { if (SPEC.shown !== null) { SPEC.shown = null; el.classList.add('hidden'); document.body.classList.remove('spectating'); } return; }
  if (SPEC.shown !== r.id) { SPEC.shown = r.id; $('spectateName').textContent = r.name; el.classList.remove('hidden'); document.body.classList.add('spectating'); }
}
