/* ═══════════════════ CLASSEMENT DES CAMARADES (sans serveur) ═══════════════════
   Chaque navigateur garde ses résultats. Quand on joue ensemble, les classements se fusionnent
   automatiquement ; on peut aussi s'échanger un code de classement par message. */

const BOARD = {
  list: [], week: false,
  load() { const l = store.get('board', []); this.list = Array.isArray(l) ? l.map(clean).filter(Boolean) : []; this.sort(); },
  save() { store.set('board', this.list.slice(0, 60)); },
  sort() { this.list.sort((a, b) => b.round - a.round || b.kills - a.kills || b.points - a.points || a.date - b.date); this.list = this.list.slice(0, 60); },
  merge(entries) {
    let n = 0;
    for (const raw of entries || []) { const e = clean(raw); if (!e) continue; const i = this.list.findIndex((q) => q.id === e.id); if (i < 0) { this.list.push(e); n++; } }
    if (n) { this.sort(); this.save(); this.render(); }
    return n;
  },
  top(n = 20) { return this.list.slice(0, n); },
  best() { return this.list[0] || null; },
  // Résultat d'une partie : une ligne par soldat, identifiant stable pour éviter les doublons.
  record(d) {
    const names = d.stats.map((s) => s.name);
    const rows = d.stats.map((s) => ({ id: `${d.gid || 'solo' + Date.now()}:${s.id}`, name: s.name, round: d.round, kills: s.kills, heads: s.heads, points: s.points, obj: d.obj ? 1 : 0, mode: d.stats.length > 1 ? 'coop' : 'solo', mates: names.filter((x) => x !== s.name), date: d.date || Date.now(), dev: s.dev, map: d.map || MAP_ID }));
    this.merge(rows);
    const mine = rows.find((r) => r.id.endsWith(':' + P.id)) || rows[0];
    return mine ? this.list.findIndex((q) => q.id === mine.id) + 1 : 0;
  },
  encode() { const data = JSON.stringify(this.top(20).map((e) => [e.id, e.name, e.round, e.kills, e.heads, e.points, e.obj, e.mode === 'coop' ? 1 : 0, e.mates, Math.round(e.date / 60000), e.map || 'poste7'])); return 'SP1.' + btoa(unescape(encodeURIComponent(data))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); },
  decode(code) {
    const m = String(code || '').trim().match(/^SP1\.([A-Za-z0-9_-]+)$/); if (!m) return null;
    try { const arr = JSON.parse(decodeURIComponent(escape(atob(m[1].replace(/-/g, '+').replace(/_/g, '/'))))); return arr.map((a) => ({ id: a[0], name: a[1], round: a[2], kills: a[3], heads: a[4], points: a[5], obj: a[6], mode: a[7] ? 'coop' : 'solo', mates: a[8], date: a[9] * 60000, map: a[10] || 'poste7' })); } catch { return null; }
  },
  render() {
    const body = $('boardRows'); if (!body) return;
    const since = Date.now() - 7 * 86400000, rows = this.list.filter((e) => !this.week || e.date >= since).slice(0, 25);
    body.innerHTML = rows.length ? rows.map((e, i) => `<tr class="${e.dev === DEVICE_ID ? 'mine' : ''}"><td>${i + 1}</td><td>${escapeHtml(e.name)}${e.obj ? ` <i title="${escapeHtml(MAPS[e.map]?.objName || 'Objectif accompli')}">★</i>` : ''}<small>${escapeHtml(MAPS[e.map]?.name || 'POSTE 7')} · ${e.mode === 'coop' && e.mates.length ? 'avec ' + escapeHtml(e.mates.join(', ')) : 'solo'}</small></td><td>${e.round}</td><td>${e.kills}</td><td>${e.heads}</td><td>${fmtDate(e.date)}</td></tr>`).join('')
      : `<tr><td colspan="6" class="empty">${this.week ? 'Aucune partie cette semaine.' : 'Aucune partie enregistrée pour l\'instant. Jouez une partie : votre résultat apparaîtra ici.'}</td></tr>`;
    const wk = this.list.filter((e) => e.date >= since)[0];
    $('boardWeek').textContent = wk ? `${wk.name} — manche ${wk.round}, ${wk.kills} éliminations` : 'Personne encore cette semaine';
    const b = this.list.find((e) => (e.map || 'poste7') === MAP_ID); $('bestRound').textContent = b ? `MANCHE ${b.round}` : '—'; $('bestKills').textContent = b ? `${b.kills} · ${b.name}` : '—';
  },
};
const DEVICE_ID = (() => { let d = store.get('dev', null); if (!d) { d = Math.random().toString(36).slice(2, 10); store.set('dev', d); } return d; })();
function clean(e) {
  if (!e || typeof e !== 'object') return null;
  const n = (v, max) => clamp(Math.floor(+v || 0), 0, max);
  const name = String(e.name || 'SOLDAT').replace(/[^\p{L}\p{N} ._-]/gu, '').slice(0, 12).toUpperCase() || 'SOLDAT';
  const id = String(e.id || '').slice(0, 64); if (!id) return null;
  return { id, name, round: n(e.round, 999), kills: n(e.kills, 99999), heads: n(e.heads, 99999), points: n(e.points, 9999999), obj: e.obj ? 1 : 0, mode: e.mode === 'coop' ? 'coop' : 'solo', mates: (Array.isArray(e.mates) ? e.mates : []).slice(0, 3).map((m) => String(m).replace(/[^\p{L}\p{N} ._-]/gu, '').slice(0, 12).toUpperCase()), date: clamp(+e.date || Date.now(), 1.5e12, Date.now() + 86400000), dev: e.dev ? String(e.dev).slice(0, 12) : undefined, map: typeof e.map === 'string' && /^[a-z0-9]{2,16}$/.test(e.map) ? e.map : 'poste7' };
}
function fmtDate(t) { const d = (Date.now() - t) / 86400000; if (d < 1) return "aujourd'hui"; if (d < 2) return 'hier'; if (d < 7) return `il y a ${Math.floor(d)} j`; return new Date(t).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }); }

function initBoard() {
  BOARD.load();
  $('boardButton').onclick = () => { BOARD.render(); $('board').classList.remove('hidden'); };
  $('boardClose').onclick = () => $('board').classList.add('hidden');
  $('boardAll').onclick = () => { BOARD.week = false; $('boardAll').setAttribute('aria-pressed', 'true'); $('boardWeekBtn').setAttribute('aria-pressed', 'false'); BOARD.render(); };
  $('boardWeekBtn').onclick = () => { BOARD.week = true; $('boardWeekBtn').setAttribute('aria-pressed', 'true'); $('boardAll').setAttribute('aria-pressed', 'false'); BOARD.render(); };
  $('boardCopy').onclick = () => {
    const code = BOARD.encode(), ta = $('boardCode'); ta.value = code; ta.select();
    try { navigator.clipboard.writeText(code).then(() => { $('boardMsg').textContent = 'Code copié : envoyez-le à vos amis, ils le collent dans leur classement.'; }, () => { $('boardMsg').textContent = 'Code sélectionné : copiez-le (Ctrl+C) et envoyez-le à vos amis.'; }); } catch { $('boardMsg').textContent = 'Code sélectionné : copiez-le (Ctrl+C).'; }
  };
  $('boardImport').onclick = () => {
    const list = BOARD.decode($('boardCode').value);
    if (!list) { $('boardMsg').textContent = "Ce code n'est pas un code de classement Snowfall Protocol (il commence par SP1.)."; return; }
    const n = BOARD.merge(list); $('boardMsg').textContent = n ? `${n} résultat${n > 1 ? 's' : ''} ajouté${n > 1 ? 's' : ''} au classement.` : 'Ces résultats étaient déjà dans votre classement.';
  };
  BOARD.render();
}
