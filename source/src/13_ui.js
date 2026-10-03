/* ═══════════════════ INTERFACE : menus, HUD, écrans ═══════════════════ */

// Marques de craie des premières manches (bâtons, le cinquième en travers).
function tallySVG(n) {
  let d = ''; const jit = [0.6, -0.8, 0.4, -0.5];
  for (let i = 0; i < Math.min(n, 4); i++) { const x = 8 + i * 16; d += `M${x + jit[i]} 6 L${x - jit[i]} 58 `; }
  if (n >= 5) d += 'M0 46 L70 12';
  return `<svg viewBox="-4 0 78 64"><path d="${d}"/></svg>`;
}
const UI = {
  msgT: 0, shownPts: 500,
  init() {
    // Menu principal.
    $('soloButton').onclick = () => { Sfx.init(); NET.leave(true); beginGame({ solo: true, authority: true }); };
    $('joinButton').onclick = () => { Sfx.init(); checkVersion(); $('joinPanel').classList.toggle('hidden'); $('lobby').classList.add('hidden'); $('playerName').value = settings.name || ''; $('sessionCode').focus(); };
    $('joinPanel').onsubmit = async (e) => {
      e.preventDefault(); Sfx.init();
      const name = ($('playerName').value.trim() || 'SOLDAT').toUpperCase().slice(0, 12), code = $('sessionCode').value.trim().toUpperCase();
      settings.name = name; saveSettings();
      $('joinSubmit').disabled = true;
      try {
        if (!code) { this.joinStatus('Création de la partie…'); await NET.hostGame(name); $('joinPanel').classList.add('hidden'); $('lobby').classList.remove('hidden'); }
        else { this.joinStatus('Connexion à la partie ' + code + '…'); await NET.joinGame(code, name); $('joinPanel').classList.add('hidden'); $('lobby').classList.remove('hidden'); }
      } catch (err) { this.joinStatus(err?.message === 'peerjs' ? "Le module réseau n'a pas pu être chargé (connexion ?)." : (err?.message || 'Connexion impossible.'), true); this.netStatus(); }
      $('joinSubmit').disabled = false;
    };
    $('sessionCode').addEventListener('input', (e) => { e.target.value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''); });
    $('copyCode').onclick = () => { const c = NET.code; try { navigator.clipboard.writeText(c).then(() => { $('copyCode').textContent = 'Copié'; setTimeout(() => ($('copyCode').textContent = 'Copier'), 1500); }, () => {}); } catch { /* presse-papiers indisponible */ } };
    $('startCoop').onclick = () => { if (NET.isHost) NET.startCoop(); };
    $('leaveLobby').onclick = () => { NET.leave(); $('lobby').classList.add('hidden'); $('joinPanel').classList.remove('hidden'); this.joinStatus("Laissez le code vide pour héberger une nouvelle partie, ou entrez le code d'un ami pour le rejoindre."); };
    // Plein écran, options.
    $('fullscreenButton').onclick = () => toggleFullscreen();
    $('settingsButton').onclick = () => this.openSettings();
    $('pauseSettings').onclick = () => this.openSettings();
    $('settingsClose').onclick = () => { $('settings').classList.add('hidden'); };
    // Pause.
    $('resumeButton').onclick = () => resumeGame();
    $('menuButton').onclick = () => { NET.leave(true); backToMenu(); };
    const sl = $('sensitivitySlider'); sl.value = settings.sens; $('sensitivityValue').textContent = Math.round(settings.sens * 100) + '%';
    sl.oninput = () => { settings.sens = +sl.value; $('sensitivityValue').textContent = Math.round(settings.sens * 100) + '%'; saveSettings(); };
    // Fin de partie.
    $('retryButton').onclick = () => { $('gameover').classList.add('hidden'); if (NET.active && NET.isHost) NET.startCoop(); else if (!NET.active) beginGame({ solo: true, authority: true }); };
    $('goMenuButton').onclick = () => { NET.leave(true); backToMenu(); };
    addEventListener('keydown', (e) => { if (e.code === 'Escape' && G.mode === 'paused') { e.preventDefault(); resumeGame(); } });
    // Boussole.
    const strip = $('compassStrip'); let html = ''; const labels = { 0: 'N', 45: 'NE', 90: 'E', 135: 'SE', 180: 'S', 225: 'SO', 270: 'O', 315: 'NO' };
    for (let k = -2; k < 3; k++) for (let a = 0; a < 360; a += 15) html += `<span class="${labels[a] ? 'card' : ''}">${labels[a] || (a % 45 ? '·' : a)}</span>`;
    strip.innerHTML = html;
    // Record et givre.
    const best = store.get(MAP_ID === 'poste7' ? 'best' : 'best_' + MAP_ID, { round: 0, kills: 0 });
    $('bestRound').textContent = best.round ? `MANCHE ${best.round}` : '—'; $('bestKills').textContent = best.kills || '—';
    $('board').addEventListener('click', (e) => { if (e.target.id === 'board') $('board').classList.add('hidden'); });
    if (M.env.frost) $('frostEdge').style.backgroundImage = `url(${frostOverlayURL()})`; else $('frostEdge').style.display = 'none';
    // Carte.
    this.mapInfo();
    $('mapButton').onclick = $('mapCardButton').onclick = () => { Sfx.init(); this.openMaps(); };
    $('mapsClose').onclick = () => $('maps').classList.add('hidden');
    $('fps').classList.toggle('hidden', !settings.showFps);
    this.netStatus();
    addEventListener('online', () => this.netStatus()); addEventListener('offline', () => this.netStatus());
  },
  mapInfo() {
    const I = M.info || {};
    $('mapButtonName').textContent = M.name; $('mapCardName').textContent = M.name; $('mapCardDesc').textContent = M.desc;
    if (I.eyebrow) $('mapEyebrow').innerHTML = I.eyebrow; if (I.tagline) $('mapTagline').textContent = I.tagline;
    if (I.stat) { $('mapStatK').textContent = I.stat[0]; $('mapStatV').textContent = I.stat[1]; }
  },
  openMaps() {
    const list = $('mapList'); list.innerHTML = '';
    for (const id of MAP_ORDER) {
      const D = MAPS[id]; if (!D) continue;
      const best = BOARD.list.find((e) => (e.map || 'poste7') === id);
      const b = document.createElement('button'); b.type = 'button'; b.className = 'map-item' + (id === MAP_ID ? ' current' : '');
      b.style.setProperty('--bg', `linear-gradient(160deg, ${D.card[0]}, ${D.card[1]})`);
      const art = makeCanvas(420, 300); art.className = 'map-art'; try { D.art?.(art.getContext('2d'), 420, 300); } catch { /* décor facultatif */ }
      b.appendChild(art);
      b.insertAdjacentHTML('beforeend', `${id === MAP_ID ? '<span class="tag">CARTE ACTUELLE</span>' : ''}<b>${escapeHtml(D.name)}</b><i>${escapeHtml(D.sub)}</i><span>${escapeHtml(D.desc)}</span><em>${best ? `Record : manche ${best.round} · ${escapeHtml(best.name)}` : 'Aucune partie jouée'}</em>`);
      b.onclick = () => { if (id === MAP_ID) { $('maps').classList.add('hidden'); return; } switchMap(id); };
      list.appendChild(b);
    }
    $('maps').classList.remove('hidden');
  },
  netStatus() {
    const el = $('netStatus'), on = navigator.onLine !== false;
    el.className = 'header-status ' + (on ? 'online' : 'offline');
    const t = NET.transport;
    if (t === 'none') el.className = 'header-status';
    el.querySelector('span').textContent = (NET.active ? (NET.isHost ? `PARTIE HÉBERGÉE · ${NET.code}` : `CONNECTÉ · ${NET.code}`) : !on ? 'HORS LIGNE · SOLO UNIQUEMENT' : 'CO-OP EN LIGNE DISPONIBLE') + ` · V${GAME_VERSION}`;
  },
  joinStatus(t, err) { const s = $('joinStatus'); s.textContent = t; s.classList.toggle('error', !!err); },
  netError(e) { this.joinStatus('Erreur réseau : ' + (e?.type || 'inconnue') + '. Réessayez.', true); },
  lobby() {
    $('lobbyCode').textContent = NET.code || '------';
    $('lobbyList').innerHTML = NET.lobby.map((p, i) => `<li>${escapeHtml(p.name)} <span>${i === 0 ? 'HÔTE' : 'PRÊT'}${p.id === P.id ? ' · VOUS' : ''}${i === 0 ? '' : NET.linkLabel(p.id)}</span></li>`).join('');
    $('startCoop').classList.toggle('hidden', !NET.isHost);
    // L'hôte doit savoir tout de suite si ses amis pourront entrer : connexion directe et salon Claude ont leurs limites.
    const warn = NET.isHost && NET.via === 'peer' ? " ⚠ Aucun relais public n'a répondu depuis votre réseau : seuls les joueurs de votre Wi-Fi peuvent entrer avec ce code. Nouvel essai automatique toutes les 12 s — le code changera s'il réussit."
      : NET.isHost && NET.via === 'room' ? ' ⚠ Partie hébergée dans la page claude.ai : vos amis doivent ouvrir cette même page. Pour jouer avec n\'importe qui, hébergez depuis ' + PAGES_URL : '';
    const found = NET.isHost && NET.relayFound ? ` Relais trouvé : NOUVEAU CODE ${NET.code}.` : '';
    $('lobbyStatus').textContent = (NET.isHost ? `Partagez le code ${NET.code} avec vos amis (4 joueurs max). Lancez quand tout le monde est là.` : "En attente du lancement par l'hôte…") + found + ` Liaison : ${NET.viaLabel()} · version ${GAME_VERSION}.` + warn + (NET.verWarn ? ' ' + NET.verWarn : '');
    $('lobbyStatus').classList.toggle('warn', !!warn);
    if (!NET.active) $('lobby').classList.add('hidden');
    this.netStatus();
  },
  openSettings() {
    const s = $('settings'); s.classList.remove('hidden');
    const df = $('optDiff'); df.value = settings.diff; df.onchange = () => { settings.diff = +df.value; saveSettings(); };
    const q = $('optQuality'); q.value = settings.quality;
    const bind = (id, key, fmt, apply) => { const el = $(id), out = $(id + 'V'); el.value = settings[key]; out.textContent = fmt(settings[key]); el.oninput = () => { settings[key] = +el.value; out.textContent = fmt(settings[key]); saveSettings(); apply && apply(); }; };
    bind('optSens', 'sens', (v) => Math.round(v * 100) + '%', () => { $('sensitivitySlider').value = settings.sens; $('sensitivityValue').textContent = Math.round(settings.sens * 100) + '%'; });
    bind('optFov', 'fov', (v) => v + '°');
    bind('optVol', 'volume', (v) => Math.round(v * 100) + '%', () => Sfx.applyVolume());
    bind('optMusic', 'music', (v) => Math.round(v * 100) + '%', () => Sfx.applyVolume());
    $('optInvert').checked = settings.invertY; $('optInvert').onchange = (e) => { settings.invertY = e.target.checked; saveSettings(); };
    $('optFps').checked = settings.showFps; $('optFps').onchange = (e) => { settings.showFps = e.target.checked; saveSettings(); $('fps').classList.toggle('hidden', !settings.showFps); };
    q.onchange = () => { settings.quality = +q.value; saveSettings(); applyQuality(); };
  },

  enterGame() {
    document.body.classList.add('playing'); document.body.classList.toggle('coop', NET.active); spectateLabel(null);
    $('intro').classList.add('hidden'); $('pause').classList.add('hidden'); $('gameover').classList.add('hidden'); $('hud').classList.remove('hidden');
    $('roomCode').classList.toggle('hidden', !NET.active); $('roomCode').textContent = NET.active ? `PARTIE ${NET.code}` : '';
    $('team').classList.toggle('hidden', !NET.active);
    this.round(0); this.ammo(); this.grenades(); this.perks(); this.downed(false); this.progress(-1);
    this.locIntro(M.intro || [M.name, M.sub]);
  },
  // Lieu et date tapés à la machine en début de partie (façon rapport de mission).
  locIntro(lines) {
    const el = $('locIntro'); clearInterval(this._li); el.style.opacity = 1; el.innerHTML = '';
    const full = lines.join('\n'); let n = 0;
    this._li = setInterval(() => {
      if (G.mode === 'menu') { clearInterval(this._li); el.innerHTML = ''; return; }
      n++; const txt = full.slice(0, n).split('\n');
      el.innerHTML = txt.map((l, i) => (i === 0 ? `<b>${escapeHtml(l)}</b>` : escapeHtml(l))).join('\n') + (n < full.length ? '<span class="cur"></span>' : '');
      if (n >= full.length) { clearInterval(this._li); setTimeout(() => { el.style.opacity = 0; }, 3800); }
      if (n % 2 === 0 && full[n - 1] !== ' ') Sfx.click?.(2400 + Math.random() * 600, 0.05);
    }, 55);
  },
  round(n) { const el = $('round'); if (n >= 1 && n <= 5) $('roundNo').innerHTML = tallySVG(n); else $('roundNo').textContent = n > 0 ? n : '—'; el.classList.remove('flash'); void el.offsetWidth; if (n > 0) el.classList.add('flash'); },
  points(total, delta) {
    this.target = total;
    if (delta) { const s = document.createElement('span'); s.textContent = (delta > 0 ? '+' : '') + delta; if (delta < 0) s.className = 'neg'; $('popups').appendChild(s); setTimeout(() => s.remove(), 1000); }
  },
  weapon() {
    const w = curW(), el = $('weapon');
    if (!w) { el.textContent = 'COUTEAU'; el.classList.remove('upgraded'); $('ammo').innerHTML = '<span class="mag">—</span>'; return; }
    el.textContent = wstat(w.key, w.up).name; el.classList.toggle('upgraded', !!w.up); this.ammo();
  },
  ammo() {
    const w = curW(); if (!w) return; const S = wstat(w.key, w.up), el = $('ammo');
    el.innerHTML = `<span class="mag">${w.mag}</span> <span class="reserve">/ ${w.reserve}</span>`;
    el.classList.toggle('low', w.mag <= Math.ceil(S.mag * 0.25));
  },
  grenades() { $('grenades').innerHTML = '<i></i>'.repeat(Math.max(0, P.grenades)); },
  perks() { $('slot3')?.classList.toggle('hidden', !P.perks.has('mule')); $('perkIcons').innerHTML = [...P.perks].map((k) => `<span class="perk-icon" title="${PERKS[k].name}" style="color:${PERKS[k].color};background:${PERKS[k].color}55">${PERKS[k].short}</span>`).join(''); },
  prompt(obj, pts) {
    const el = $('prompt');
    if (!obj) { if (el.innerHTML) el.innerHTML = ''; return; }
    const cost = obj.cost ? ` [${obj.cost}]` : '';
    const html = obj.kind === 'info' ? escapeHtml(obj.text) : `<kbd>${IS_TOUCH ? 'E' : 'E'}</kbd>${escapeHtml(obj.text)}${cost}`;
    if (el.innerHTML !== html) el.innerHTML = html;
    el.classList.toggle('deny', !!obj.deny || (obj.cost && pts < obj.cost));
  },
  flashPrompt() { const el = $('prompt'); el.animate([{ transform: 'translateX(-50%) translateX(-6px)' }, { transform: 'translateX(-50%) translateX(6px)' }, { transform: 'translateX(-50%)' }], { duration: 220 }); },
  message(text, sub = '') {
    const el = $('message'); el.innerHTML = escapeHtml(text) + (sub ? `<small>${escapeHtml(sub)}</small>` : ''); el.classList.add('show'); this.msgT = 3.2;
  },
  subtitle(text, radio = true) {
    const el = $('subtitle'); el.innerHTML = (radio ? '<b>RADIO</b>' : '') + escapeHtml(text); el.classList.add('show');
    clearTimeout(this.subT); this.subT = setTimeout(() => el.classList.remove('show'), Math.max(4200, text.length * 70));
  },
  // Bandeau d'objectif (haut de l'écran) : courant → mission de la carte → survivre.
  objective() {
    const el = $('objective'); if (!el) return;
    const live = G.mode === 'playing' || G.mode === 'paused', pw = live && pwrObjective(), ms = live && (mapHook('mission') || questObjective());
    const o = live ? (pw || ms || { title: 'SURVIVRE', line: G.round > 0 ? `Manche ${G.round} — tenez la position` : 'Préparez-vous', sub: '' }) : null;
    OBJM.at = o && o.at ? o.at : null;
    if (!o) { el.classList.add('hidden'); return; }
    // Le courant passe d'abord, mais la mission de la carte reste visible en seconde ligne.
    const next = pw && ms ? `${ms.title} — ${ms.line}` : '';
    const key = [o.title, o.line, o.sub, o.hint, o.bar != null ? Math.round(o.bar * 100) : '', next].join('|');
    el.classList.remove('hidden'); if (el._k === key) return; el._k = key;
    if (el._title !== o.title) { el._title = o.title; el.classList.remove('pulse'); void el.offsetWidth; el.classList.add('pulse'); }
    $('objectiveTitle').textContent = o.title; $('objectiveText').textContent = o.line;
    $('objectiveSub').textContent = [o.sub, o.hint].filter(Boolean).join('   —   ');
    $('objectiveNext').textContent = next;
    const bar = $('objectiveBar'); bar.classList.toggle('hidden', o.bar == null); if (o.bar != null) bar.firstElementChild.style.transform = `scaleX(${clamp(o.bar, 0, 1)})`;
  },
  banner(title, sub) { $('bannerTitle').textContent = title; $('bannerSub').textContent = sub || ''; const b = $('banner'); b.classList.add('show'); clearTimeout(this.banT); this.banT = setTimeout(() => b.classList.remove('show'), 6500); },
  hitmarker(kill) { const h = $('hitmarker'); h.classList.remove('show', 'kill'); void h.offsetWidth; h.classList.add('show'); if (kill) h.classList.add('kill'); },
  damageDir(a) {
    const box = $('dmgdir'), i = document.createElement('i'); i.style.transform = `rotate(${a}rad)`; box.appendChild(i);
    requestAnimationFrame(() => { i.style.opacity = 1; setTimeout(() => { i.style.opacity = 0; setTimeout(() => i.remove(), 700); }, 500); });
  },
  progress(v) { const el = $('progress'); if (v < 0) { el.classList.add('hidden'); return; } el.classList.remove('hidden'); el.firstElementChild.style.transform = `scaleX(${clamp(v, 0, 1)})`; },
  downed(on, sub) { $('downed').classList.toggle('hidden', !on); if (sub !== undefined) $('downedSub').textContent = sub; },
  powerups() {
    const el = $('powerups'); let html = '';
    if (G.pu.instakill > 0) html += `<div class="${G.pu.instakill < 5 ? 'blink' : ''}"><b>☠</b>MORT SUBITE ${Math.ceil(G.pu.instakill)}</div>`;
    if (G.pu.double > 0) html += `<div class="${G.pu.double < 5 ? 'blink' : ''}"><b>×2</b>POINTS ${Math.ceil(G.pu.double)}</div>`;
    if (G.pu.firesale > 0) html += `<div class="${G.pu.firesale < 5 ? 'blink' : ''}"><b>%</b>BRADERIE ${Math.ceil(G.pu.firesale)}</div>`;
    if (P.zbloodT > 0) html += `<div class="${P.zbloodT < 5 ? 'blink' : ''}"><b>♦</b>SANG INFECTÉ ${Math.ceil(P.zbloodT)}</div>`;
    if (SUPPORT.t > 0) html += `<div class="mortar ${SUPPORT.t < 5 ? 'blink' : ''}"><b>✹</b>MORTIER ${Math.ceil(SUPPORT.t)}${SUPPORT.owner === P.id ? ' · Q' : ''}</div>`;
    if (el._h !== html) { el.innerHTML = html; el._h = html; }
  },
  team() {
    if (!NET.active) return;
    const el = $('team'), rows = [...G.players.values()].sort((a, b) => b.points - a.points);
    const html = rows.map((p) => `<div class="${p.isLocal ? 'me' : ''} ${p.down || p.dead ? 'down' : ''}"><span>${escapeHtml(p.name)}${p.down ? ' · À TERRE' : p.dead ? ' · HORS JEU' : ''}</span><b>${p.points}</b></div>`).join('');
    if (el._h !== html) { el.innerHTML = html; el._h = html; }
  },
  showTeam(on) { if (NET.active) $('team').style.transform = on ? 'scale(1.15)' : ''; },
  gameOver(d, record) {
    document.body.classList.remove('playing');
    $('hud').classList.add('hidden'); $('pause').classList.add('hidden'); $('gameover').classList.remove('hidden');
    $('goRounds').textContent = d.round; $('goRoundsWord').textContent = d.round > 1 ? 'manches' : 'manche';
    $('goStats').innerHTML = d.stats.map((s) => `<tr><td>${escapeHtml(s.name)}</td><td>${s.points}</td><td>${s.kills}</td><td>${s.heads}</td><td>${s.acc == null ? '—' : s.acc + ' %'}</td><td>${s.downs ?? 0}</td></tr>`).join('');
    const best = store.get(MAP_ID === 'poste7' ? 'best' : 'best_' + MAP_ID, { round: 0 });
    // Bilan des objectifs : mission de la carte (étoile au classement) et courant.
    const ms = mapHook('mission') || questObjective();
    $('goMission').innerHTML = (d.obj ? `<b>★ ${escapeHtml(M.objName || 'Mission accomplie')}</b>` : `Mission inachevée${ms ? ' : ' + escapeHtml(ms.line) : ''}`) + ` · courant ${G.power ? 'rétabli' : 'jamais rétabli'}`;
    $('goRecord').textContent = record ? 'NOUVEAU RECORD PERSONNEL' : `RECORD PERSONNEL : MANCHE ${best.round || d.round}`;
    $('retryButton').classList.toggle('hidden', NET.active && !NET.isHost);
    $('bestRound').textContent = `MANCHE ${Math.max(best.round || 0, d.round)}`;
  },
  // Mise à jour par image.
  tick(dt) {
    if (this.msgT > 0) { this.msgT -= dt; if (this.msgT <= 0) $('message').classList.remove('show'); }
    if (G.mode !== 'playing' && G.mode !== 'paused') return;
    // Compteur de points qui défile.
    if (this.target !== undefined && this.shownPts !== this.target) { const d = this.target - this.shownPts; this.shownPts += Math.sign(d) * Math.max(1, Math.ceil(Math.abs(d) * Math.min(1, dt * 10))); if (Math.abs(this.target - this.shownPts) < 1) this.shownPts = this.target; $('score').textContent = String(this.shownPts); }
    // Santé, endurance.
    const hpK = P.hp / P.maxHp; $('hpbar').firstElementChild.style.transform = `scaleX(${clamp(hpK, 0, 1)})`; $('hpbar').classList.toggle('low', hpK < 0.35);
    const sb = $('shieldbar'); if (sb) { sb.classList.toggle('hidden', !(P.shield > 0)); if (P.shield > 0) sb.firstElementChild.style.transform = `scaleX(${clamp(P.shield / (P.shieldMax || 1), 0, 1)})`; }
    $('stamina').firstElementChild.style.transform = `scaleX(${P.perks.has('sprint') ? 1 : P.stamina})`;
    const dmg = clamp((1 - hpK) * 1.2 + P.hurtT * 0.4, 0, 1) * (P.down ? 1 : 0.9);
    $('vignetteDmg').style.opacity = dmg.toFixed(2);
    $('zbloodFx').style.opacity = P.zbloodT > 0 ? (P.zbloodT < 3 ? 0.4 + 0.3 * Math.sin(G.time * 12) : 0.8) : 0;
    $('frostEdge').style.opacity = (0.35 + WEATHER.blizzard * 0.45 + (1 - hpK) * 0.25).toFixed(2);
    if (R.final) { R.final.uniforms.uDamage.value = dmg * 0.8; R.final.uniforms.uAberr.value = P.hurtT; }
    if (hpK < 0.35 && !P.down) { this.hbT = (this.hbT || 0) - dt; if (this.hbT <= 0) { this.hbT = 0.85; Sfx.heartbeat(); } }
    // Réticule dynamique.
    const S = curS(), spread = lerp(S.spread, S.ads, P.ads) * (1 + P.bloom) * (Math.hypot(P.vel.x, P.vel.z) > 1 ? 1.6 : 1);
    const px = 6 + spread * 380, ch = $('crosshair');
    ch.style.opacity = P.ads > 0.6 || P.sprint || !curW() ? 0 : 1;
    const [t, b, l, r] = ch.children; t.style.top = -(px + 9) + 'px'; b.style.top = px + 'px'; l.style.left = -(px + 9) + 'px'; r.style.left = px + 'px';
    // Boussole.
    const deg = ((-P.yaw * 180) / Math.PI % 360 + 360) % 360; $('compassStrip').style.transform = `translateX(${150 - 15 - (deg / 15) * 30 - 24 * 30 * 2}px)`;
    this.objT = (this.objT || 0) - dt; if (this.objT <= 0) { this.objT = 0.25; if (QUEST.stage === 5 && G.authority === false) QUEST.hold = Math.max(0, QUEST.hold - 0.25); this.objective(); tipsTick(); }
    if (settings.showFps) { this.fpsT = (this.fpsT || 0) - dt; if (this.fpsT <= 0) { this.fpsT = 0.5; $('fps').textContent = `${Math.round(R.fpsAvg)} IMG/S · ${Math.round((R.dynScale || 1) * 100)} %`; } }
  },
};
function escapeHtml(s) { return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]); }

/* ─── Transitions d'état ─── */
function beginGame(opts) {
  Sfx.init();
  $('joinPanel').classList.add('hidden'); $('lobby').classList.add('hidden');
  G.start(opts);
  UI.shownPts = 500; UI.target = 500; $('score').textContent = '500';
  if (!IS_TOUCH) requestLock();
  if (G.wantFullscreen && !document.fullscreenElement) toggleFullscreen(true);
  menuCam.active = false;
}
function pauseGame() {
  if (G.mode !== 'playing') return;
  G.mode = 'paused'; document.body.classList.remove('playing');
  $('pause').classList.remove('hidden');
  $('pauseNote').textContent = NET.active ? 'La partie continue pendant la pause en co-op. Échap pour reprendre.' : 'Échap pour reprendre — « Reprendre » remet aussi le plein écran.';
  INPUT.fire = false; INPUT.ads = false; INPUT.keys.clear();
  if (document.pointerLockElement) { G.ignoreUnlock = true; document.exitPointerLock(); }
}
function resumeGame() {
  if (G.mode !== 'paused') return;
  $('pause').classList.add('hidden'); $('settings').classList.add('hidden');
  G.mode = 'playing'; document.body.classList.add('playing');
  if (G.wantFullscreen && !document.fullscreenElement) toggleFullscreen(true);
  if (!IS_TOUCH) requestLock();
}
function backToMenu() {
  G.mode = 'menu'; document.body.classList.remove('playing');
  if (document.pointerLockElement) { G.ignoreUnlock = true; document.exitPointerLock(); }
  ['pause', 'gameover', 'hud', 'settings'].forEach((id) => $(id).classList.add('hidden'));
  $('intro').classList.remove('hidden');
  G.reset(); G.players.clear();
  if (VM.root) VM.root.visible = false;
  UI.downed(false); UI.netStatus(); UI.lobby();
  menuCam.active = true; spawnMenuZombies();
  Sfx.setPad(0.35); WEATHER.target = 0;
}
function toggleFullscreen(force) {
  const el = $('shell');
  if (document.fullscreenElement && !force) { G.wantFullscreen = false; document.exitFullscreen?.(); return; }
  G.wantFullscreen = true;
  const req = el.requestFullscreen || el.webkitRequestFullscreen; if (req) { try { const p = req.call(el, { navigationUI: 'hide' }); if (p && p.catch) p.catch(() => {}); } catch { /* refusé */ } }
}

// Ordre d'affichage des cartes et changement de carte (rechargement : chaque carte construit son propre monde).
const MAP_ORDER = ['poste7', 'cite', 'penitencier', 'filon'];
function switchMap(id, extra = {}) {
  if (!MAPS[id]) return;
  store.set('map', id);
  const hp = new URLSearchParams(); hp.set('carte', id); for (const [k, v] of Object.entries(extra)) hp.set(k, v);
  $('maps').classList.add('hidden'); $('soloButton').disabled = true; $('joinButton').disabled = true; $('mapButton').disabled = true;
  const l = $('loadingLine'); l.classList.remove('hidden'); l.querySelector('span').textContent = `CHARGEMENT : ${MAPS[id].name}…`;
  location.hash = hp.toString();
  setTimeout(() => location.reload(), 60);
}
// Après un changement de carte demandé par l'hôte : on rejoint tout seul la partie.
function autoJoin() {
  const hp = new URLSearchParams(location.hash.slice(1)), code = hp.get('rejoindre');
  if (!code) return;
  hp.delete('rejoindre'); const name = hp.get('nom'); hp.delete('nom');
  try { history.replaceState(null, '', location.pathname + location.search + (hp.toString() ? '#' + hp.toString() : '')); } catch { location.hash = hp.toString(); }
  $('joinPanel').classList.remove('hidden'); $('playerName').value = (name || settings.name || '').slice(0, 12); $('sessionCode').value = code.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
  UI.joinStatus(`Carte de l'hôte chargée (${M.name}). Connexion…`);
  setTimeout(() => $('joinPanel').requestSubmit ? $('joinPanel').requestSubmit() : $('joinSubmit').click(), 300);
}
