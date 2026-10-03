/* ═══════════════════ SECRET MUSICAL ET ASTUCES ═══════════════════
   Trois disques cachés par carte (toujours aux mêmes endroits) : les trois écoutés, le morceau de la carte se joue pour tous.
   Astuces : une seule fois par joueur, au bon moment, pour ceux qui découvrent le jeu. */

const SECRET = { got: [0, 0, 0], spots: [], meshes: [] };
// Trois cachettes fixes par carte (graine tirée du nom de la carte), dans des zones différentes, sur un sol dégagé.
function secretSpots() {
  let h = 7; for (const c of MAP_ID) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  const rnd = mulberry32(h), out = [], zones = new Set();
  const clear = (x, z) => { const cx = tcx(x), cz = tcx(z); for (const b of MAP.props) if (!b.off && b.x0 < cx + 0.6 && b.x1 > cx - 0.6 && b.z0 < cz + 0.6 && b.z1 > cz - 0.6) return false; for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const t = tType(x + dx, z + dz); if (t === T_RAMP || t === T_DOOR) return false; } return true; };
  const cand = []; for (let z = 0; z < MAP_D; z++) for (let x = 0; x < MAP_W; x++) { const i = ti(x, z); if (MAP.type[i] === T_FLOOR && clear(x, z) && Math.hypot(x - SPOTS.start[0], z - SPOTS.start[1]) > 4) cand.push(i); }
  for (let tries = 0; tries < 400 && out.length < 3 && cand.length; tries++) {
    const i = cand[(rnd() * cand.length) | 0], zn = MAP.zone[i];
    if (zones.has(zn) && tries < 300) continue; zones.add(zn); out.push(i);
  }
  return out;
}
function buildSecret() {
  SECRET.spots = secretSpots();
  const vinyl = KIT.m(0x111111, { rough: 0.35, metal: 0.3 }), label = KIT.m(0xb03a2a, { rough: 0.6 });
  SECRET.meshes = SECRET.spots.map((t, k) => {
    const x = (t % MAP_W) * TILE + TILE / 2 + 0.55, z = Math.floor(t / MAP_W) * TILE + TILE / 2 - 0.4, g = new THREE.Group();
    g.userData.dynamic = true; g.position.set(x, groundAt(x, z) + 0.012, z); g.rotation.set(0, k * 1.7, 0); R.scene.add(g);
    const d = mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.012, 24), vinyl, 0, 0, 0, 0, g, false); d.rotation.z = 0.06;
    mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.014, 16), label, 0, 0.001, 0, 0, g, false);
    g.userData.glint = KIT.glow(g, 0.08, 0.05, 0.04, 0xfff4d8, 0.22, 0);
    return g;
  });
}
const secretState = () => SECRET.got.join('');
// Un reflet bref de temps en temps : un joueur attentif remarque le disque.
function secretVisuals() { const t = G.time; SECRET.meshes.forEach((g, i) => { const s = g.userData.glint; if (s && g.visible) s.material.opacity = Math.max(0, Math.sin(t * 1.3 + i * 2.1)) ** 24 * 0.9; }); }
function secretReset() { SECRET.got = [0, 0, 0]; for (const g of SECRET.meshes) g.visible = true; }
function secretApply(d, quiet) {
  const i = d.i; if (SECRET.got[i]) return; SECRET.got[i] = 1; const g = SECRET.meshes[i]; if (g) g.visible = false;
  if (quiet) return;
  const n = SECRET.got.filter(Boolean).length;
  if (g) Sfx.musicBox?.(g.position);
  if (n < 3) UI.message('♪', `Un vieux disque… ${n} / 3`);
  else { UI.banner('♪ ' + M.name.toUpperCase(), 'Les trois vieux disques sont réunis'); Sfx.song?.(); }
}
function secretInteract(pid, kind, id) {
  if (kind !== 'secret') return false;
  const i = id | 0; if (SECRET.got[i] === 0 && SECRET.meshes[i]) G.emit('secret', { i });
  return true;
}
function secretCandidates(cand, px, pz) {
  SECRET.meshes.forEach((g, i) => { if (!SECRET.got[i] && g.visible) cand(Math.hypot(px - g.position.x, pz - g.position.z), { kind: 'secret', id: i, text: 'Écouter le vieux disque', range: 1.1, hold: true, holdTime: 1.2 }); });
}
function secretReconcile(s) { if (typeof s === 'string') s.split('').forEach((c, i) => { if (c === '1' && !SECRET.got[i]) secretApply({ i }, true); }); }

/* ─── Astuces : une fois par joueur, au bon moment ─── */
const TIPS = {
  repair: 'Maintenez E près d\'une fenêtre pour la reclouer : chaque planche rapporte des points.',
  objective: 'Le bandeau en haut indique le but. Le repère doré OBJECTIF montre où aller.',
  power: 'Sans courant, pas d\'atouts ni d\'établi : les pièces du générateur sont dans les zones à ouvrir.',
  ping: 'En co-op, Q (ou PING) signale un infecté, un objet ou un endroit à vos camarades.',
  perks: 'Le courant est rétabli : les machines d\'atouts fonctionnent (quatre atouts au plus).',
  box: 'La caisse de ravitaillement donne une arme au hasard ; elle change parfois de place.',
  down: 'À terre ! Un camarade peut vous relever en maintenant E près de vous.',
};
const tipSeen = store.get('tips', {});
function tip(id) {
  if (tipSeen[id] || !TIPS[id] || G.mode !== 'playing') return;
  tipSeen[id] = 1; store.set('tips', tipSeen);
  const el = $('tip'); if (!el) return; el.textContent = TIPS[id]; el.classList.add('show');
  clearTimeout(tip.t); tip.t = setTimeout(() => el.classList.remove('show'), 7000);
}
// Déclencheurs (appelés quatre fois par seconde pendant la partie).
function tipsTick() {
  if (G.mode !== 'playing') return;
  if (G.round >= 1 && G.time > 4) tip('objective');
  if (MAP.barricades.some((b) => b.planks < 6 && MAP.zoneActive[b.zone] && Math.hypot(b.center.x - P.pos.x, b.center.z - P.pos.z) < 6)) tip('repair');
  if (G.round >= 2 && !G.power) tip('power');
  if (G.power) tip('perks');
  if (NET.active && G.time > 20) tip('ping');
  const bx = WORLD.boxSpots[G.box.loc]; if (bx && Math.hypot(bx.pos.x - P.pos.x, bx.pos.z - P.pos.z) < 5) tip('box');
  if (P.down && NET.active) tip('down');
}

/* ─── Le morceau (synthétisé) : ré mineur, 88 battements par minute, 16 mesures ─── */
Sfx.song = function () {
  if (!this.ready) return 0;
  const o = this.out(null, { gain: 0.55, verb: 0.32, bus: this.musicBus }), b = 60 / 88, D = 146.83;
  const prog = [[0, 3, 7], [-4, 0, 3], [3, 7, 10], [-2, 2, 5]]; // Rém, Si♭, Fa, Do
  const MEL = [
    [7, null, 5, 3, 2, 3, 5, null], [8, null, 7, 5, 3, null, 2, null], [3, 5, 7, 10, 12, null, 10, 7], [10, null, 12, 10, 7, null, 5, null],
    [12, null, 10, 7, 5, 7, 8, 7], [8, null, 12, 10, 8, 7, 5, null], [5, 7, 8, 10, 12, 15, 17, null], [14, null, 12, 10, 7, 5, 2, null],
  ];
  for (let bar = 0; bar < 16; bar++) {
    const t0 = 0.3 + bar * 4 * b, ch = prog[bar % 4], root = ch[0];
    for (let e = 0; e < 8; e++) this.tone(o, { type: 'triangle', f: (D / 2) * 2 ** (([0, 0, 7, 0, 12, 0, 7, 0][e] + root) / 12), d: b * 0.42, peak: 0.3, t: t0 + (e * b) / 2 });
    if (bar >= 2) for (const n of ch) this.tone(o, { type: 'sine', f: D * 2 ** (n / 12), a: 0.4, d: 4 * b - 0.4, peak: 0.06, t: t0 });
    for (let q = 0; q < 4; q++) {
      const tq = t0 + q * b;
      if (q % 2 === 0) this.tone(o, { type: 'sine', f: 120, f2: 42, a: 0.002, d: 0.22, peak: 0.55, t: tq });
      else if (bar >= 4) this.burst(o, { type: 'bandpass', f: 1800, q: 0.7, d: 0.14, peak: 0.3, t: tq });
      if (bar >= 8) for (const h of [0, 0.5]) this.burst(o, { type: 'highpass', f: 7000, q: 0.7, d: 0.04, peak: 0.1, t: tq + h * b });
    }
    if (bar >= 4 && bar < 15) MEL[(bar - 4) % 8].forEach((n, e) => { if (n == null) return; const f = 2 * D * 2 ** (n / 12), t = t0 + (e * b) / 2; this.tone(o, { type: 'square', f, d: b * 0.45, peak: 0.06, t }); this.tone(o, { type: 'triangle', f, d: b * 0.5, peak: 0.15, t }); });
  }
  const end = 0.3 + 16 * 4 * b; for (const n of [0, 3, 7, 12]) this.tone(o, { type: 'triangle', f: D * 2 ** (n / 12), a: 0.01, d: 2.5, peak: 0.14, t: end });
  return end + 2.5;
};
