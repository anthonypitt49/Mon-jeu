/* ═══════════════════ AUDIO ═══════════════════
   Sons générés en direct avec Web Audio, spatialisés en 3D. Quand les vrais sons (assets/sounds/) sont arrivés,
   ils prennent la place des sons synthétisés correspondants ; ceux-ci restent en secours. */

const Sfx = {
  ctx: null, ready: false, voices: 0,
  init() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    const ctx = this.ctx = new AC();
    this.master = ctx.createGain();
    const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -14; comp.knee.value = 10; comp.ratio.value = 5; comp.attack.value = 0.003; comp.release.value = 0.2;
    this.master.connect(comp); comp.connect(ctx.destination);
    this.sfx = ctx.createGain(); this.sfx.connect(this.master);
    this.musicBus = ctx.createGain(); this.musicBus.connect(this.master);
    this.ui = ctx.createGain(); this.ui.connect(this.master);
    // Réverbération : réponse impulsionnelle générée (bruit à décroissance exponentielle).
    const len = ctx.sampleRate * 2.6, ir = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) { const d = ir.getChannelData(ch); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3.2); }
    this.verb = ctx.createConvolver(); this.verb.buffer = ir;
    this.verbSend = ctx.createGain(); this.verbSend.gain.value = 0.2;
    this.verbSend.connect(this.verb); this.verb.connect(this.master);
    // Écho extérieur des détonations : un retour assourdi, plus ou moins lointain selon le terrain (désert, île, plaine, mine).
    const EC = { cite: [0.55, 0.2], penitencier: [0.34, 0.15], filon: [0.16, 0.1], poste7: [0.42, 0.15] }[MAP_ID] || [0.4, 0.15];
    this.echoSend = ctx.createGain(); this.echoSend.gain.value = 0;
    const dl = ctx.createDelay(1.5), lp = ctx.createBiquadFilter(), fb = ctx.createGain(), eg = ctx.createGain();
    dl.delayTime.value = EC[0]; lp.type = 'lowpass'; lp.frequency.value = 1100; fb.gain.value = 0.28; eg.gain.value = EC[1] / 0.15;
    this.echoSend.connect(dl); dl.connect(lp); lp.connect(eg); eg.connect(this.master); lp.connect(fb); fb.connect(dl);
    // Tampons de bruit.
    const nb = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate), nd = nb.getChannelData(0);
    for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
    this.noise = nb;
    const bb = ctx.createBuffer(2, ctx.sampleRate * 4, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) { const d = bb.getChannelData(ch); let last = 0; for (let i = 0; i < d.length; i++) { last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02; d[i] = last * 3.5; } }
    this.brown = bb;
    this.distCurve = new Float32Array(256).map((_, i) => { const x = i / 128 - 1; return Math.tanh(x * 3.2); });
    this.ready = true;
    this.applyVolume();
    this.startAmbience();
    this.loadBank();
  },
  applyVolume() { if (!this.ctx) return; this.master.gain.value = settings.volume; this.musicBus.gain.value = settings.music * 0.55; },
  now() { return this.ctx.currentTime; },
  setListener(cam) {
    if (!this.ready) return;
    const L = this.ctx.listener, p = cam.position; cam.getWorldDirection(_v1);
    if (L.positionX) {
      const t = this.ctx.currentTime;
      L.positionX.setTargetAtTime(p.x, t, 0.02); L.positionY.setTargetAtTime(p.y, t, 0.02); L.positionZ.setTargetAtTime(p.z, t, 0.02);
      L.forwardX.setTargetAtTime(_v1.x, t, 0.02); L.forwardY.setTargetAtTime(_v1.y, t, 0.02); L.forwardZ.setTargetAtTime(_v1.z, t, 0.02);
      L.upX.value = 0; L.upY.value = 1; L.upZ.value = 0;
    } else { L.setPosition(p.x, p.y, p.z); L.setOrientation(_v1.x, _v1.y, _v1.z, 0, 1, 0); }
  },
  setReverb(w, echo = 0) { if (!this.ready) return; this.verbSend.gain.setTargetAtTime(w, this.ctx.currentTime, 0.4); this.echoSend.gain.setTargetAtTime(echo, this.ctx.currentTime, 0.4); },
  // Sortie : spatialisée si une position est fournie.
  out(pos, { gain = 1, verb = 0.3, ref = 2.5, bus } = {}) {
    const ctx = this.ctx, g = ctx.createGain(); g.gain.value = gain;
    let head = g;
    if (pos) {
      const p = ctx.createPanner(); p.panningModel = 'equalpower'; p.distanceModel = 'inverse'; p.refDistance = ref; p.rolloffFactor = 1.3; p.maxDistance = 120;
      if (p.positionX) { p.positionX.value = pos.x; p.positionY.value = pos.y; p.positionZ.value = pos.z; } else p.setPosition(pos.x, pos.y, pos.z);
      g.connect(p); p.connect(bus || this.sfx); head = g;
      if (verb > 0) { const s = ctx.createGain(); s.gain.value = verb; p.connect(s); s.connect(this.verbSend); }
    } else {
      g.connect(bus || this.sfx);
      if (verb > 0) { const s = ctx.createGain(); s.gain.value = verb; g.connect(s); s.connect(this.verbSend); }
    }
    return head;
  },
  src(buf = this.noise, rate = 1, loop = false) { const s = this.ctx.createBufferSource(); s.buffer = buf; s.playbackRate.value = rate; s.loop = loop; s.start(this.ctx.currentTime, Math.random() * 1.5); return s; },
  filt(type, f, q = 1) { const b = this.ctx.createBiquadFilter(); b.type = type; b.frequency.value = f; b.Q.value = q; return b; },
  /* ─── Sons enregistrés (Freesound, CC0) ───
     Servis à côté du jeu dans assets/sounds/ (voir source/tools/keep_sounds.py) et chargés une fois le son démarré.
     Chaque fichier regroupe plusieurs prises (repères « cuts » du manifeste) : on en tire une au hasard, en variant un peu hauteur et volume.
     Tant qu'un son manque (page ouverte en local, hors ligne, navigateur qui ne lit pas l'OGG), sa version synthétisée joue. */
  bank: {}, bankInfo: { state: 'off', n: 0, failed: 0, ms: 0 },
  async loadBank() {
    const B = this.bankInfo;
    if (B.state !== 'off' || location.protocol === 'file:' || /nosamples/.test(location.search)) return;
    B.state = 'loading'; const t0 = performance.now(), base = 'assets/sounds/';
    try {
      const man = await (await fetch(base + 'manifest.json')).json();
      const res = await Promise.allSettled(Object.entries(man).map(async ([name, e]) => {
        const data = await (await fetch(base + name + '.ogg')).arrayBuffer();
        const buf = await new Promise((ok, ko) => this.ctx.decodeAudioData(data, ok, ko)); // forme à rappels : vieux Safari
        this.bank[name] = { buf, cuts: e.cuts, last: -1 };
      }));
      B.n = Object.keys(this.bank).length; B.failed = res.filter((r) => r.status === 'rejected').length; B.state = 'on';
      this.windSample();
    } catch (e) { B.state = 'failed'; B.err = String(e?.message || e); }
    B.ms = Math.round(performance.now() - t0);
  },
  // Joue une prise enregistrée et renvoie sa durée (s) ; 0 si le son manque : l'appelant joue alors sa version synthétisée.
  // to : sortie déjà prête (sinon out(pos, …)) ; cut : prise imposée (recharges, dans l'ordre) ; max : coupée en fondu au-delà (s).
  play(name, pos, { gain = 1, verb = 0.3, ref = 2.5, rate = 1, cut = -1, t = 0, max = 0, bus, to } = {}) {
    const b = this.ready && this.bank[name]; if (!b) return 0;
    const ctx = this.ctx, n = b.cuts.length;
    let k = cut >= 0 ? cut % n : (Math.random() * (b.last < 0 ? n : n - 1)) | 0;
    if (cut < 0 && b.last >= 0 && n > 1 && k >= b.last) k++; // jamais deux fois de suite la même prise
    b.last = k;
    const [c0, c1] = b.cuts[k], r = rate * (0.96 + Math.random() * 0.08), t0 = ctx.currentTime + t;
    const s = ctx.createBufferSource(), g = ctx.createGain(); s.buffer = b.buf; s.playbackRate.value = r; g.gain.value = 0.9 + Math.random() * 0.2;
    s.connect(g); g.connect(to || this.out(pos, { gain, verb, ref, bus }));
    let len = c1 - c0;
    if (max && len / r > max) { len = max * r; g.gain.setValueAtTime(g.gain.value, t0 + max * 0.6); g.gain.linearRampToValueAtTime(0.0001, t0 + max); }
    s.start(t0, c0, len);
    return len / r;
  },
  // Vent enregistré (Poste 7, le seul sous la neige) à la place du bruit filtré : setWind règle toujours sa force.
  windSample() {
    const b = this.bank.vent_neige; if (!b || !this.wind || this.wind.rec || MAP_ID !== 'poste7') return;
    const ctx = this.ctx, t = ctx.currentTime, [c0, c1] = b.cuts[0], s = ctx.createBufferSource(), g = ctx.createGain();
    s.buffer = b.buf; s.loop = true; s.loopStart = c0; s.loopEnd = c1;
    g.gain.value = 0.0001; s.connect(g); g.connect(this.wind.g); s.start(t, c0 + Math.random() * (c1 - c0));
    g.gain.setTargetAtTime(1, t, 1.2); this.wind.mix.gain.setTargetAtTime(0.0001, t, 1.2); // fondu de 3 s environ
    setTimeout(() => { try { this.wind.src.stop(); } catch { /* déjà arrêté */ } }, 6000);
    this.wind.rec = s;
  },
  env(g, t, a, d, peak = 1, sus = 0) { g.gain.cancelScheduledValues(t); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(Math.max(0.0001, sus), t + a + d); },
  // Brique : bruit filtré avec enveloppe.
  burst(dest, { type = 'bandpass', f = 1000, q = 1, a = 0.002, d = 0.1, peak = 1, rate = 1, sweep = 0, t = 0 } = {}) {
    const ctx = this.ctx, t0 = ctx.currentTime + t, s = this.ctx.createBufferSource(); s.buffer = this.noise; s.playbackRate.value = rate;
    const fl = this.filt(type, f, q), g = ctx.createGain();
    if (sweep) fl.frequency.exponentialRampToValueAtTime(Math.max(20, sweep), t0 + a + d);
    s.connect(fl); fl.connect(g); g.connect(dest); this.env(g, t0, a, d, peak);
    s.start(t0, Math.random() * 1.5); s.stop(t0 + a + d + 0.05);
  },
  tone(dest, { type = 'sine', f = 440, f2 = 0, a = 0.005, d = 0.2, peak = 0.5, t = 0, detune = 0 } = {}) {
    const ctx = this.ctx, t0 = ctx.currentTime + t, o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t0); o.detune.value = detune; if (f2) o.frequency.exponentialRampToValueAtTime(f2, t0 + a + d);
    o.connect(g); g.connect(dest); this.env(g, t0, a, d, peak); o.start(t0); o.stop(t0 + a + d + 0.05);
    return o;
  },

  /* ─── Armes ─── */
  gun(profile, pos, local) {
    if (!this.ready) return;
    if (profile === 'ray') { const o = this.out(local ? null : pos, { gain: local ? 0.45 : 0.6, verb: 0.35, ref: 6 }); this.tone(o, { type: 'square', f: 1900, f2: 260, a: 0.002, d: 0.22, peak: 0.35 }); this.tone(o, { type: 'sine', f: 900, f2: 120, a: 0.002, d: 0.28, peak: 0.5 }); this.burst(o, { type: 'highpass', f: 5000, d: 0.05, peak: 0.2 }); return; }
    const P = GUN_SOUNDS[profile] || GUN_SOUNDS.pistol;
    const o = this.out(local ? null : pos, { gain: local ? P.gain : P.gain * 1.4, verb: P.verb, ref: 6 });
    if (this.echoSend) { const e = this.ctx.createGain(); e.gain.value = local ? 0.15 : 0.1; o.connect(e); e.connect(this.echoSend); }
    if (P.rec && this.play(P.rec[0], null, { to: o, rate: P.rec[1] || 1, max: P.rec[2] || 0 })) return;
    this.burst(o, { type: 'bandpass', f: P.crack, q: 0.7, d: P.cd, peak: 1 });
    this.burst(o, { type: 'lowpass', f: P.body, q: 0.5, a: 0.003, d: P.bd, peak: 0.9, sweep: P.body * 0.3 });
    this.tone(o, { f: P.thump, f2: P.thump * 0.4, d: 0.18, peak: 0.8 });
    if (P.mech) this.burst(o, { type: 'highpass', f: 4000, d: 0.02, peak: 0.25, t: 0.03 });
    if (P.tail) this.burst(o, { type: 'lowpass', f: 500, a: 0.02, d: P.tail, peak: 0.25, t: 0.04 });
  },
  click(f = 3500, peak = 0.3, t = 0, pos) { if (!this.ready) return; const o = this.out(pos, { verb: 0.05 }); this.burst(o, { f, q: 3, d: 0.025, peak, t }); this.tone(o, { f: f * 0.6, d: 0.03, peak: peak * 0.3, t }); },
  // Recharges : chaque déclic joue la prise suivante de l'enregistrement (chargeur sorti, remis, culasse…), dans l'ordre.
  reloadSeq(kind, dur, pos) {
    if (!this.ready) return;
    const rec = { bolt: 'culasse', pump: 'pompe', mag: 'recharge_chargeur' }[kind];
    let k = 0; const s = (t, f, p) => { const c = k++; setTimeout(() => { if (!this.play(rec, pos, { cut: c, gain: p * 1.8, verb: 0.05 })) this.click(f, p, 0, pos); }, t * 1000); };
    if (kind === 'bolt') { s(0.05, 2400, 0.3); s(dur * 0.35, 1800, 0.4); s(dur * 0.8, 2600, 0.45); }
    else if (kind === 'shell') { s(0.02, 1400, 0.3); }
    else if (kind === 'pump') { s(0, 1500, 0.35); s(0.14, 1100, 0.4); }
    else { s(0.08, 2200, 0.3); s(dur * 0.15, 900, 0.2); s(dur * 0.62, 2800, 0.45); s(dur * 0.85, 3600, 0.35); }
  },
  dry() { this.click(4200, 0.25); },
  casing(pos, shell) {
    if (!this.ready || Math.random() < 0.3) return;
    if (this.play('douille', pos, { gain: 0.08, verb: 0.05, ref: 1, rate: shell ? 0.75 : 1, t: 0.25 })) return;
    const o = this.out(pos, { gain: 0.15, verb: 0.05, ref: 1 });
    const f = shell ? 900 : 3800 + Math.random() * 1600;
    this.tone(o, { f, d: 0.08, peak: 0.4, t: 0.25 }); this.tone(o, { f: f * 1.02, d: 0.05, peak: 0.25, t: 0.36 });
  },
  whoosh(pos, g = 0.3) { if (!this.ready) return; const o = this.out(pos, { gain: g, verb: 0.05 }); this.burst(o, { f: 700, q: 1.2, a: 0.04, d: 0.14, sweep: 2600, peak: 0.6 }); },

  /* ─── Impacts ─── */
  flesh(pos, head) {
    if (!this.ready || this.play('impact_chair', pos, { gain: head ? 0.55 : 0.42, verb: 0.1, rate: head ? 0.9 : 1 })) return;
    const o = this.out(pos, { gain: 0.5, verb: 0.1 });
    this.burst(o, { type: 'lowpass', f: 700, d: 0.09, peak: 0.8 }); this.tone(o, { f: 140, f2: 60, d: 0.1, peak: 0.5 });
    if (head) this.burst(o, { f: 1800, q: 2, d: 0.2, sweep: 350, peak: 0.6, t: 0.01 });
  },
  impact(pos, mat) {
    if (!this.ready || Math.random() < 0.5) return;
    if (this.play(mat === 'metal' ? 'impact_metal' : mat === 'wood' ? 'impact_bois' : 'impact_terre', pos, { gain: 0.2, verb: 0.1, ref: 1.5 })) return;
    const o = this.out(pos, { gain: 0.25, verb: 0.1, ref: 1.5 });
    if (mat === 'metal') { this.tone(o, { f: 2200 + Math.random() * 900, d: 0.18, peak: 0.3 }); this.burst(o, { type: 'highpass', f: 3000, d: 0.04, peak: 0.4 }); }
    else if (mat === 'wood') { this.burst(o, { f: 900, q: 2, d: 0.06, peak: 0.6 }); }
    else this.burst(o, { type: 'lowpass', f: 1400, d: 0.06, peak: 0.5 });
  },
  hitTick(kill) { if (!this.ready) return; const o = this.out(null, { gain: 0.25, verb: 0, bus: this.ui }); this.tone(o, { f: kill ? 1500 : 2600, d: 0.035, peak: 0.4 }); },

  /* ─── Pas ─── */
  step(surface, pos, loud = 1) {
    if (!this.ready) return;
    const rec = surface === 'wood' ? 'pas_bois' : surface === 'mud' ? 'pas_boue' : surface === 'snow' && MAP_ID === 'poste7' ? 'pas_neige' : ''; // ailleurs, « snow » = terre sèche
    if (rec && this.play(rec, pos, { gain: 0.15 * loud, verb: 0.05, ref: 1.5 })) return;
    const o = this.out(pos, { gain: 0.22 * loud, verb: 0.05, ref: 1.5 });
    if (surface === 'wood') { this.tone(o, { f: 130 + Math.random() * 40, d: 0.07, peak: 0.6 }); this.burst(o, { type: 'lowpass', f: 900, d: 0.05, peak: 0.4 }); }
    else if (surface === 'concrete') { this.burst(o, { type: 'highpass', f: 1800, d: 0.04, peak: 0.45 }); this.burst(o, { type: 'lowpass', f: 300, d: 0.04, peak: 0.35 }); }
    else { for (let i = 0; i < 4; i++) this.burst(o, { f: 1400 + Math.random() * 1600, q: 1.5, d: 0.03 + Math.random() * 0.04, peak: 0.3 + Math.random() * 0.3, t: i * 0.018 }); this.burst(o, { type: 'lowpass', f: 400, d: 0.07, peak: 0.3 }); }
  },

  /* ─── Voix des infectés ─── */
  zombie(pos, kind = 'groan', pitch = 1) {
    if (!this.ready || this.voices > 7) return;
    const rec = this.play(kind === 'scream' ? 'zombie_cri' : kind === 'attack' ? 'zombie_attaque' : 'zombie_grogne', pos, { gain: kind === 'scream' ? 0.45 : kind === 'attack' ? 0.36 : 0.3, verb: 0.25, ref: 2.2, rate: pitch, max: 3.5 });
    if (rec) { this.voices++; setTimeout(() => this.voices--, rec * 1000 + 60); return; }
    const ctx = this.ctx, t0 = ctx.currentTime, dur = kind === 'scream' ? 0.7 + Math.random() * 0.5 : kind === 'attack' ? 0.35 : 0.8 + Math.random() * 1.1;
    const o = this.out(pos, { gain: kind === 'scream' ? 0.45 : 0.32, verb: 0.25, ref: 2.2 });
    const osc = ctx.createOscillator(); osc.type = 'sawtooth';
    const f0 = (kind === 'scream' ? 190 + Math.random() * 110 : kind === 'attack' ? 120 + Math.random() * 40 : 62 + Math.random() * 55) * pitch;
    osc.frequency.setValueAtTime(f0, t0); osc.frequency.linearRampToValueAtTime(f0 * (0.7 + Math.random() * 0.5), t0 + dur);
    const vib = ctx.createOscillator(), vg = ctx.createGain(); vib.frequency.value = 4 + Math.random() * 6; vg.gain.value = f0 * 0.06; vib.connect(vg); vg.connect(osc.frequency);
    const ws = ctx.createWaveShaper(); ws.curve = this.distCurve;
    const vowels = [[400, 800], [700, 1150], [320, 780], [550, 1750]], vw = pick(vowels);
    const g = ctx.createGain(); g.gain.value = 0;
    const mix = ctx.createGain(); mix.gain.value = 1;
    vw.forEach((f, i) => { const bp = this.filt('bandpass', f, 6 + i * 3); osc.connect(bp); bp.connect(mix); });
    const breath = ctx.createBufferSource(); breath.buffer = this.noise; const bf = this.filt('bandpass', 900 * pitch, 1.2), bg = ctx.createGain(); bg.gain.value = 0.35;
    breath.connect(bf); bf.connect(bg); bg.connect(mix);
    mix.connect(ws); ws.connect(g); g.connect(o);
    // Enveloppe irrégulière (râles).
    const steps = 6; g.gain.setValueAtTime(0.0001, t0);
    for (let i = 1; i <= steps; i++) g.gain.linearRampToValueAtTime((i === steps ? 0.0001 : (0.25 + Math.random() * 0.75)) * (kind === 'scream' ? 0.9 : 0.7), t0 + (dur * i) / steps);
    osc.start(t0); vib.start(t0); breath.start(t0, Math.random()); osc.stop(t0 + dur + 0.05); vib.stop(t0 + dur + 0.05); breath.stop(t0 + dur + 0.05);
    this.voices++; setTimeout(() => this.voices--, dur * 1000 + 60);
  },

  /* ─── Barricades, portes, machines ─── */
  plankRip(pos) { if (!this.ready || this.play('planche_arrachee', pos, { gain: 0.5, verb: 0.2 })) return; const o = this.out(pos, { gain: 0.55, verb: 0.2 }); this.burst(o, { f: 850, q: 2.5, d: 0.16, peak: 0.9 }); this.burst(o, { f: 2400, q: 4, d: 0.05, peak: 0.5, t: 0.02 }); this.tone(o, { f: 95, f2: 55, d: 0.15, peak: 0.5 }); },
  hammer(pos) { if (!this.ready) return; if (this.bank.marteau_clou) { for (let i = 0; i < 3; i++) this.play('marteau_clou', pos, { gain: 0.32, verb: 0.2, t: i * 0.16 + Math.random() * 0.03 }); return; } const o = this.out(pos, { gain: 0.4, verb: 0.2 }); for (let i = 0; i < 3; i++) { this.tone(o, { f: 380 + i * 20, d: 0.05, peak: 0.6, t: i * 0.12 }); this.burst(o, { f: 2600, q: 2, d: 0.03, peak: 0.4, t: i * 0.12 }); } },
  buy() { if (!this.ready) return; const o = this.out(null, { gain: 0.35, verb: 0.15, bus: this.ui }); [1318, 1976].forEach((f, i) => { this.tone(o, { f, d: 0.5, peak: 0.35, t: i * 0.1 }); this.tone(o, { f: f * 2.01, d: 0.25, peak: 0.1, t: i * 0.1 }); }); },
  // Obus de mortier qui arrive : sifflement descendant pendant `dur` secondes.
  shellWhistle(pos, dur = 1.2) { if (!this.ready) return; const o = this.out(pos, { gain: 0.5, verb: 0.35 }); this.tone(o, { f: 2100, f2: 520, a: 0.15, d: dur, peak: 0.22 }); this.tone(o, { f: 2150, f2: 540, a: 0.2, d: dur, peak: 0.1, detune: 12 }); },
  ping(mine) { if (!this.ready) return; const o = this.out(null, { gain: 0.28, verb: 0.12, bus: this.ui }); const f = mine ? 1568 : 1175; this.tone(o, { f, d: 0.1, peak: 0.35 }); this.tone(o, { f: f * 1.5, d: 0.2, peak: 0.3, t: 0.075 }); },
  deny() { if (!this.ready) return; const o = this.out(null, { gain: 0.25, verb: 0, bus: this.ui }); const x = this.filt('lowpass', 700); x.connect(o); this.tone(x, { type: 'square', f: 105, d: 0.22, peak: 0.6 }); },
  door(pos) { if (!this.ready) return; const o = this.out(pos, { gain: 0.8, verb: 0.35, ref: 4 }); this.burst(o, { f: 300, q: 6, a: 0.05, d: 0.9, sweep: 900, peak: 0.5 }); this.tone(o, { f: 70, f2: 40, d: 0.5, peak: 0.8, t: 0.7 }); for (let i = 0; i < 8; i++) this.click(2000 + Math.random() * 3000, 0.2, 0.1 + Math.random() * 0.8, pos); },
  generatorStart(pos) {
    if (!this.ready) return; const ctx = this.ctx, t0 = ctx.currentTime;
    const o = this.out(pos, { gain: 0.9, verb: 0.3, ref: 5 });
    const osc = ctx.createOscillator(); osc.type = 'sawtooth'; osc.frequency.setValueAtTime(18, t0); osc.frequency.exponentialRampToValueAtTime(52, t0 + 2.8);
    const lp = this.filt('lowpass', 380, 2), am = ctx.createGain(), lfo = ctx.createOscillator(), lg = ctx.createGain();
    lfo.frequency.setValueAtTime(4, t0); lfo.frequency.exponentialRampToValueAtTime(26, t0 + 2.8); lg.gain.value = 0.5; am.gain.value = 0.5; lfo.connect(lg); lg.connect(am.gain);
    const g = ctx.createGain(); this.env(g, t0, 0.3, 3.2, 0.9, 0.001);
    osc.connect(lp); lp.connect(am); am.connect(g); g.connect(o); osc.start(t0); lfo.start(t0); osc.stop(t0 + 3.6); lfo.stop(t0 + 3.6);
    this.burst(o, { type: 'lowpass', f: 200, a: 0.01, d: 0.4, peak: 1 });
    setTimeout(() => this.hum(pos), 2600);
    setTimeout(() => this.siren(), 1800);
  },
  hum(pos) {
    if (!this.ready || this._hum) return; const ctx = this.ctx;
    const o = this.out(pos, { gain: 0.25, verb: 0.1, ref: 3 });
    const a = ctx.createOscillator(), b = ctx.createOscillator(); a.type = 'sawtooth'; b.type = 'square'; a.frequency.value = 50; b.frequency.value = 100;
    const lp = this.filt('lowpass', 260, 1), am = ctx.createGain(), lfo = ctx.createOscillator(), lg = ctx.createGain(); lfo.frequency.value = 25; lg.gain.value = 0.25; am.gain.value = 0.75; lfo.connect(lg); lg.connect(am.gain);
    const bg = ctx.createGain(); bg.gain.value = 0.12; b.connect(bg); bg.connect(lp); a.connect(lp); lp.connect(am); am.connect(o);
    a.start(); b.start(); lfo.start(); this._hum = [a, b, lfo];
  },
  stopHum() { if (this._hum) { this._hum.forEach((n) => { try { n.stop(); } catch { /* déjà arrêté */ } }); this._hum = null; } },
  siren() {
    if (!this.ready) return; const ctx = this.ctx, t0 = ctx.currentTime, o = this.out(null, { gain: 0.16, verb: 0.6 });
    const osc = ctx.createOscillator(); osc.type = 'triangle'; osc.frequency.setValueAtTime(300, t0);
    for (let i = 0; i < 3; i++) { osc.frequency.linearRampToValueAtTime(720, t0 + i * 2 + 1); osc.frequency.linearRampToValueAtTime(300, t0 + i * 2 + 2); }
    const g = ctx.createGain(); this.env(g, t0, 0.8, 5.5, 0.8, 0.001); osc.connect(g); g.connect(o); osc.start(t0); osc.stop(t0 + 6.5);
  },
  // Jingles d'atouts : mélodies originales, une par atout.
  jingle(notes, base = 440, wave = 'triangle', step = 0.13) {
    if (!this.ready) return; const o = this.out(null, { gain: 0.22, verb: 0.35, bus: this.musicBus });
    notes.forEach((n, i) => { if (n == null) return; const f = base * Math.pow(2, n / 12); this.tone(o, { type: wave, f, d: step * 1.6, peak: 0.5, t: i * step }); this.tone(o, { type: 'sine', f: f * 2, d: step, peak: 0.12, t: i * step }); });
  },
  musicBox(pos) {
    if (!this.ready) return; const o = this.out(pos, { gain: 0.3, verb: 0.4, ref: 3 });
    const scale = [0, 3, 7, 10, 12, 15, 19, 22];
    for (let i = 0; i < 22; i++) { const f = 660 * Math.pow(2, pick(scale) / 12); this.tone(o, { f, d: 0.35, peak: 0.25, t: i * 0.19 }); this.tone(o, { f: f * 3.01, d: 0.12, peak: 0.05, t: i * 0.19 }); }
  },
  eerie(pos) { if (!this.ready) return; const o = this.out(pos, { gain: 0.5, verb: 0.7, ref: 4 }); [110, 116.5, 164.8].forEach((f) => this.tone(o, { type: 'sawtooth', f, f2: f * 0.5, a: 0.4, d: 2.4, peak: 0.25 })); },
  bell(t = 0, g = 0.4) { if (!this.ready) return; const o = this.out(null, { gain: g, verb: 0.8, bus: this.musicBus }); [1, 2.76, 5.4, 8.93].forEach((m, i) => this.tone(o, { f: 98 * m, d: 3.2 - i * 0.6, peak: 0.5 / (i + 1), t })); },
  roundStart(n) {
    if (!this.ready) return; const o = this.out(null, { gain: 0.4, verb: 0.6, bus: this.musicBus }), ctx = this.ctx, t0 = ctx.currentTime;
    const lp = this.filt('lowpass', 200, 1); lp.frequency.linearRampToValueAtTime(900, t0 + 2.5); lp.frequency.linearRampToValueAtTime(150, t0 + 5); lp.connect(o);
    [55, 82.4, 110, 130.8].forEach((f, i) => { this.tone(lp, { type: 'sawtooth', f, a: 1.2, d: 4, peak: 0.35, detune: (i - 1.5) * 8 }); });
    for (let i = 0; i < Math.min(3, 1 + ((n - 1) % 3)); i++) this.bell(0.6 + i * 1.1, 0.35);
  },
  roundEnd() { if (!this.ready) return; const o = this.out(null, { gain: 0.3, verb: 0.6, bus: this.musicBus }); [220, 277.2, 329.6, 440].forEach((f, i) => this.tone(o, { type: 'sawtooth', f, a: 0.3, d: 2.2, peak: 0.2, t: i * 0.08 })); },
  gameOver() { if (!this.ready) return; const o = this.out(null, { gain: 0.5, verb: 0.9, bus: this.musicBus }); [110, 130.8, 164.8].forEach((f, i) => this.tone(o, { type: 'sawtooth', f, f2: f * 0.5, a: 0.2, d: 5, peak: 0.25, t: i * 0.15 })); this.bell(0.2, 0.6); },
  pickup() { this.jingle([0, 7, 12, 19], 523, 'sine', 0.08); },
  sparkle(pos) { if (!this.ready) return; const o = this.out(pos, { gain: 0.2, verb: 0.4 }); for (let i = 0; i < 6; i++) this.tone(o, { f: 1800 + Math.random() * 1800, d: 0.2, peak: 0.25, t: i * 0.05 }); },

  /* ─── Explosions et ambiance guerrière ─── */
  explosion(pos, big = 1) {
    if (!this.ready || this.play('explosion', pos, { gain: 1.1 * big, verb: 0.6, ref: 8, rate: 1.15 - 0.15 * big })) return;
    const o = this.out(pos, { gain: 1.1 * big, verb: 0.6, ref: 8 });
    this.burst(o, { type: 'lowpass', f: 3200, q: 0.4, a: 0.004, d: 1.3, sweep: 120, peak: 1 });
    this.tone(o, { f: 70, f2: 28, d: 0.7, peak: 1 });
    for (let i = 0; i < 10; i++) this.burst(o, { f: 1500 + Math.random() * 2500, q: 2, d: 0.03, peak: 0.25, t: 0.2 + Math.random() * 0.9 });
  },
  artillery() {
    if (!this.ready) return; const ctx = this.ctx, p = ctx.createStereoPanner(); p.pan.value = Math.random() * 2 - 1;
    const g = ctx.createGain(); g.gain.value = 0.35 + Math.random() * 0.35; g.connect(p); p.connect(this.sfx);
    if (this.play('artillerie_loin', null, { to: g, rate: 0.9 + Math.random() * 0.2 })) return;
    this.burst(g, { type: 'lowpass', f: 160, q: 0.7, a: 0.05, d: 2.4, peak: 1 });
    this.tone(g, { f: 42, f2: 25, a: 0.05, d: 1.3, peak: 0.7 });
  },
  // Pas du géant d'acier : grondement très grave, spatialisé en panoramique.
  stomp(k = 1, pan = 0) {
    if (!this.ready) return; const ctx = this.ctx, p = ctx.createStereoPanner(); p.pan.value = pan * 0.8;
    const g = ctx.createGain(); g.gain.value = 0.25 + 0.55 * k; g.connect(p); p.connect(this.sfx);
    this.tone(g, { f: 34, f2: 22, a: 0.02, d: 1.1, peak: 0.9 });
    this.burst(g, { type: 'lowpass', f: 120, q: 0.8, a: 0.01, d: 0.9, peak: 0.8 });
    this.burst(g, { type: 'bandpass', f: 900, q: 3, d: 0.25, peak: 0.12, t: 0.08 });
  },
  distantMG() {
    if (!this.ready) return; const ctx = this.ctx, p = ctx.createStereoPanner(); p.pan.value = Math.random() * 2 - 1;
    const g = ctx.createGain(); g.gain.value = 0.08; g.connect(p); p.connect(this.sfx);
    if (this.play('tir_lointain', null, { to: g, max: 3 })) return;
    const n = 5 + (Math.random() * 10) | 0; for (let i = 0; i < n; i++) this.burst(g, { type: 'bandpass', f: 600, q: 1, d: 0.08, peak: 1, t: i * 0.09 });
  },
  howl() {
    if (!this.ready) return; const ctx = this.ctx, t0 = ctx.currentTime, p = ctx.createStereoPanner(); p.pan.value = Math.random() * 1.6 - 0.8;
    const g = ctx.createGain(), s = ctx.createGain(); s.gain.value = 0.6; g.connect(p); p.connect(this.sfx); g.connect(s); s.connect(this.verbSend);
    const osc = ctx.createOscillator(); osc.type = 'sine'; osc.frequency.setValueAtTime(420, t0); osc.frequency.linearRampToValueAtTime(690, t0 + 0.8); osc.frequency.linearRampToValueAtTime(640, t0 + 2.2); osc.frequency.linearRampToValueAtTime(420, t0 + 3);
    const vib = ctx.createOscillator(), vg = ctx.createGain(); vib.frequency.value = 5.5; vg.gain.value = 8; vib.connect(vg); vg.connect(osc.frequency);
    this.env(g, t0, 0.6, 2.6, 0.07, 0.0001); osc.connect(g); osc.start(t0); vib.start(t0); osc.stop(t0 + 3.4); vib.stop(t0 + 3.4);
  },
  heartbeat() { if (!this.ready) return; const o = this.out(null, { gain: 0.5, verb: 0, bus: this.ui }); this.tone(o, { f: 58, f2: 40, d: 0.12, peak: 0.9 }); this.tone(o, { f: 52, f2: 38, d: 0.14, peak: 0.7, t: 0.22 }); },
  hurt(heavy) { if (!this.ready) return; const o = this.out(null, { gain: 0.5, verb: 0.05, bus: this.ui }); this.burst(o, { type: 'lowpass', f: 500, d: 0.18, peak: 1 }); this.tone(o, { f: 110, f2: 50, d: 0.2, peak: 0.6 }); if (heavy) this.tone(o, { f: 4100, a: 0.01, d: 2.4, peak: 0.07 }); },
  freeze(pos) { if (!this.ready) return; const o = this.out(pos, { gain: 0.4, verb: 0.4 }); for (let i = 0; i < 14; i++) this.tone(o, { f: 2400 + Math.random() * 4000, d: 0.08, peak: 0.2, t: Math.random() * 0.4 }); this.burst(o, { type: 'highpass', f: 3000, a: 0.05, d: 0.5, peak: 0.4 }); },
  shatter(pos) { if (!this.ready) return; const o = this.out(pos, { gain: 0.6, verb: 0.3 }); this.burst(o, { type: 'highpass', f: 2500, d: 0.35, peak: 1 }); for (let i = 0; i < 12; i++) this.tone(o, { f: 3000 + Math.random() * 5000, d: 0.12, peak: 0.25, t: Math.random() * 0.25 }); },
  grind(pos, dur = 4.5) { if (!this.ready) return; const ctx = this.ctx, t0 = ctx.currentTime, o = this.out(pos, { gain: 0.35, verb: 0.3 }); const s = this.src(this.noise, 1, true), bp = this.filt('bandpass', 3200, 3), g = ctx.createGain(); s.connect(bp); bp.connect(g); g.connect(o); this.env(g, t0, 0.2, dur, 0.6, 0.001); s.stop(t0 + dur + 0.3); for (let i = 0; i < 6; i++) this.tone(o, { f: 640, d: 0.08, peak: 0.4, t: 0.4 + i * 0.7 }); },

  radio(pos, level = 1) {
    if (!this.ready) return; const o = this.out(pos, { gain: 0.45 * level, verb: 0.2, ref: 3 });
    for (let i = 0; i < 6; i++) this.burst(o, { f: 1400 + Math.random() * 1600, q: 0.8, a: 0.02, d: 0.12 + Math.random() * 0.2, peak: 0.5, t: i * 0.16 + Math.random() * 0.05 });
    const morse = [1, 0, 1, 1, 0, 1]; let t = 1.1; for (const m of morse) { this.tone(o, { f: 760, a: 0.005, d: m ? 0.18 : 0.06, peak: 0.25, t }); t += m ? 0.26 : 0.14; }
  },
  zapStart(pos) { if (!this.ready) return; const o = this.out(pos, { gain: 0.6, verb: 0.2 }); this.burst(o, { type: 'highpass', f: 2500, a: 0.005, d: 0.4, peak: 1 }); this.tone(o, { type: 'square', f: 90, f2: 120, a: 0.01, d: 0.6, peak: 0.3 }); },
  buzz(pos) { if (!this.ready) return; const o = this.out(pos, { gain: 0.22, verb: 0.05, ref: 2 }); const x = this.filt('bandpass', 1800, 2); x.connect(o); this.tone(x, { type: 'sawtooth', f: 100 + Math.random() * 20, a: 0.01, d: 0.45, peak: 0.6 }); },
  zap(pos) { if (!this.ready) return; const o = this.out(pos, { gain: 0.55, verb: 0.2 }); for (let i = 0; i < 5; i++) this.burst(o, { type: 'highpass', f: 3000 + Math.random() * 3000, d: 0.04, peak: 0.8, t: i * 0.05 }); this.tone(o, { type: 'square', f: 60, a: 0.005, d: 0.3, peak: 0.4 }); },

  // Tonnerre : claquement proche puis roulement grave (le délai suit la distance de l'éclair).
  thunder(delay = 1) {
    if (!this.ready) return; const ctx = this.ctx, t0 = ctx.currentTime + delay, o = this.out(null, { gain: 0.9, verb: 0.8 });
    const s = this.src(this.brown, 0.6), lp = this.filt('lowpass', 900, 0.4), g = ctx.createGain(); s.connect(lp); lp.connect(g); g.connect(o);
    g.gain.setValueAtTime(0.0001, ctx.currentTime); g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(delay < 1 ? 1 : 0.6, t0 + 0.04); g.gain.exponentialRampToValueAtTime(0.35, t0 + 0.8); g.gain.exponentialRampToValueAtTime(0.0001, t0 + 5.5);
    lp.frequency.setValueAtTime(delay < 1 ? 2400 : 900, t0); lp.frequency.exponentialRampToValueAtTime(140, t0 + 4); s.stop(t0 + 6);
  },
  drip(pos) { if (!this.ready) return; const o = this.out(pos, { gain: 0.14, verb: 0.9, ref: 3 }); this.tone(o, { f: 1400 + Math.random() * 900, f2: 700, d: 0.09, peak: 0.5 }); },
  foghorn() { if (!this.ready) return; const o = this.out(null, { gain: 0.22, verb: 0.9 }); for (const f of [98, 147]) this.tone(o, { type: 'sawtooth', f, a: 0.6, d: 3.4, peak: 0.28 }); },
  gull() { if (!this.ready) return; const ctx = this.ctx, t0 = ctx.currentTime, o = this.out(null, { gain: 0.06, verb: 0.6 }); const osc = ctx.createOscillator(), g = ctx.createGain(); osc.type = 'triangle'; osc.frequency.setValueAtTime(1500, t0); osc.frequency.exponentialRampToValueAtTime(900, t0 + 0.35); this.env(g, t0, 0.02, 0.38, 0.8, 0.0001); osc.connect(g); g.connect(o); osc.start(t0); osc.stop(t0 + 0.5); },
  // Nappes propres à la carte : pluie, ressac, grondement souterrain.
  mapLayers() {
    const ctx = this.ctx, L = M.env.sounds || [];
    if (L.includes('rain')) { const s = this.src(this.noise, 1, true), hp = this.filt('highpass', 1400, 0.5), lp = this.filt('lowpass', 7000, 0.5), g = ctx.createGain(); g.gain.value = 0.07; s.connect(hp); hp.connect(lp); lp.connect(g); g.connect(this.sfx); }
    if (L.includes('waves')) { const s = this.src(this.brown, 1, true), lp = this.filt('lowpass', 520, 0.6), g = ctx.createGain(), lfo = ctx.createOscillator(), lg = ctx.createGain(); g.gain.value = 0.1; lfo.frequency.value = 0.09; lg.gain.value = 0.07; lfo.connect(lg); lg.connect(g.gain); lfo.start(); s.connect(lp); lp.connect(g); g.connect(this.sfx); }
    if (L.includes('rumble')) { const o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'sine'; o.frequency.value = 41; g.gain.value = 0.035; o.connect(g); g.connect(this.sfx); o.start(); }
  },

  /* ─── Nappes d'ambiance ─── */
  startAmbience() {
    const ctx = this.ctx;
    this.mapLayers();
    // Vent : bruit brun filtré, modulé lentement.
    const w = this.src(this.brown, 1, true), bp = this.filt('bandpass', 420, 0.7), mix = ctx.createGain(), g = ctx.createGain(); g.gain.value = 0.16;
    w.connect(bp); bp.connect(mix); mix.connect(g); g.connect(this.sfx); this.wind = { src: w, bp, mix, g };
    const w2 = this.src(this.noise, 0.5, true), hp = this.filt('bandpass', 2600, 2.5), g2 = ctx.createGain(); g2.gain.value = 0.012;
    w2.connect(hp); hp.connect(g2); g2.connect(this.sfx); this.whistle = { bp: hp, g: g2 };
    // Nappe musicale : accord mineur lent et désaccordé.
    const lp = this.filt('lowpass', 420, 0.8), mg = ctx.createGain(); mg.gain.value = 0.0; lp.connect(mg); mg.connect(this.musicBus);
    const oscs = [0, 1, 2].map((i) => { const o = ctx.createOscillator(); o.type = 'sawtooth'; o.detune.value = (i - 1) * 9; o.connect(lp); o.start(); return o; });
    const sub = ctx.createOscillator(); sub.type = 'sine'; const sg = ctx.createGain(); sg.gain.value = 0.5; sub.connect(sg); sg.connect(mg); sub.start();
    this.pad = { oscs, sub, lp, g: mg, idx: 0 };
    this.padChord(0);
  },
  padChord(i) {
    if (!this.pad) return; const chords = [[110, 130.8, 164.8], [98, 116.5, 146.8], [87.3, 110, 130.8], [103.8, 123.5, 155.6]];
    const c = chords[i % chords.length], t = this.ctx.currentTime;
    this.pad.oscs.forEach((o, k) => o.frequency.setTargetAtTime(c[k] * 0.5, t, 2.5)); this.pad.sub.frequency.setTargetAtTime(c[0] * 0.25, t, 2.5);
  },
  setPad(level) { if (this.pad) this.pad.g.gain.setTargetAtTime(level * 0.14, this.ctx.currentTime, 1.5); },
  setWind(strength) {
    if (!this.wind) return; const t = this.ctx.currentTime;
    this.wind.g.gain.setTargetAtTime(0.12 + strength * 0.3, t, 1); this.whistle.g.gain.setTargetAtTime(0.008 + strength * 0.05, t, 1);
  },
  tickAmbience(dt, time) {
    if (!this.ready || !this.wind) return;
    const t = this.ctx.currentTime;
    this.wind.bp.frequency.setTargetAtTime(300 + fbm(time * 0.08, 3.1, 2) * 700, t, 0.5);
    this.whistle.bp.frequency.setTargetAtTime(1800 + fbm(time * 0.13, 8.3, 2) * 2200, t, 0.5);
    if (M.ambience) M.ambience(this, dt);
    else {
      this._amb = (this._amb || 6) - dt;
      if (this._amb <= 0) {
        this._amb = 5 + Math.random() * 12; const r = Math.random();
        if (r < 0.45) this.artillery(); else if (r < 0.75) this.distantMG(); else if (r < 0.88) this.howl();
      }
    }
    this._padT = (this._padT || 0) + dt; if (this._padT > 9) { this._padT = 0; this.padChord(++this.pad.idx); }
  },
};

// Signatures sonores des armes : fréquence du claquement, corps, grave, queue ;
// rec : enregistrement qui les remplace quand il est chargé [son, hauteur, longueur max en s (armes automatiques)].
const GUN_SOUNDS = {
  pistol: { crack: 2600, cd: 0.05, body: 1800, bd: 0.14, thump: 110, tail: 0.35, gain: 0.55, verb: 0.35, mech: true, rec: ['tir_pistolet'] },
  revolver: { crack: 1900, cd: 0.08, body: 1300, bd: 0.28, thump: 80, tail: 0.6, gain: 0.8, verb: 0.45, rec: ['tir_pistolet', 0.82] },
  rifle: { crack: 2100, cd: 0.08, body: 1500, bd: 0.3, thump: 70, tail: 0.9, gain: 0.85, verb: 0.5, rec: ['tir_fusil'] },
  carbine: { crack: 2400, cd: 0.06, body: 1700, bd: 0.2, thump: 85, tail: 0.6, gain: 0.7, verb: 0.4, mech: true, rec: ['tir_fusil', 1.1] },
  smg: { crack: 3000, cd: 0.035, body: 2000, bd: 0.09, thump: 120, tail: 0.25, gain: 0.45, verb: 0.3, mech: true, rec: ['tir_auto', 1.12, 0.6] },
  ar: { crack: 2600, cd: 0.045, body: 1700, bd: 0.12, thump: 95, tail: 0.4, gain: 0.55, verb: 0.35, mech: true, rec: ['tir_auto', 1, 0.9] },
  lmg: { crack: 2200, cd: 0.05, body: 1400, bd: 0.16, thump: 75, tail: 0.5, gain: 0.65, verb: 0.4, rec: ['tir_auto', 0.9, 1] },
  shotgun: { crack: 1500, cd: 0.09, body: 900, bd: 0.35, thump: 60, tail: 0.8, gain: 0.95, verb: 0.5, rec: ['tir_pompe'] },
  sniper: { crack: 1800, cd: 0.1, body: 1200, bd: 0.4, thump: 55, tail: 1.3, gain: 1, verb: 0.6, rec: ['tir_fusil', 0.88] },
  launcher: { crack: 600, cd: 0.1, body: 500, bd: 0.2, thump: 90, tail: 0.3, gain: 0.6, verb: 0.3 },
  cryo: { crack: 5200, cd: 0.2, body: 3000, bd: 0.3, thump: 180, tail: 0.5, gain: 0.5, verb: 0.5 },
};
