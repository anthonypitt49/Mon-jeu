/* ═══════════════════ CO-OP EN LIGNE (2 à 4 joueurs) ═══════════════════
   L'hôte fait tourner la partie (infectés, manches, achats) ; les invités envoient leurs positions,
   leurs tirs et leurs demandes, et reçoivent l'état du monde plusieurs fois par seconde.
   Transports : le salon intégré de Claude quand la page est ouverte sur claude.ai ; ailleurs, des relais
   publics (comme le jeu de F1) doublés d'une liaison directe quand elle passe ; en dernier recours, PeerJS. */

const KINDS = ['walker', 'jogger', 'runner', 'sprinter', 'brute', 'crawler', 'frost', 'screamer', 'warden'];
const ZSTATE = ['move', 'rise', 'attack', 'tear', 'frozen'];
const PAGES_URL = 'https://anthonypitt49.github.io/Mon-jeu/';
const NET = {
  active: false, isHost: false, peer: null, conns: new Map(), host: null, code: '', lobby: [], snapT: 0, psT: 0, lib: null,
  transport: null, roomNs: null, room: null, peerOf: new Map(), heard: new Map(), hitQ: [], snapN: 0, lastHost: 0, lobbyT: 0,
  // Relève de l'hôte : chaque départ d'hôte ouvre une nouvelle « époque » ; le joueur restant au plus petit identifiant reprend la partie.
  epoch: 0, hostId: null, migrating: false, skip: new Set(), oldHost: null, oldName: '', kaT: 0, codePeer: null,
  // Temps « éveillé » (vt) : avance au plus de 0,6 s par tour de surveillance, donc une page figée ou très lente
  // ne prend pas son propre sommeil pour un silence des autres.
  vt: 0, hostVt: 0, lastWatch: 0,
  via: null, links: new Map(), // transport de la partie en cours ('room', 'relay', 'peer') et liaisons directes
  heardHost() { this.lastHost = performance.now(); this.hostVt = this.vt; },
  // Quel transport est disponible ici ? 'room' (claude.ai), 'relay' (web ouvert) ou 'none'.
  detect() {
    if (this._detect) return this._detect;
    const cl = window.claude;
    if (!cl || typeof cl.use !== 'function') return (this._detect = Promise.resolve((this.transport = 'relay')));
    return (this._detect = cl.use('room').then((r) => { this.roomNs = r; return (this.transport = r ? 'room' : 'none'); }, () => (this.transport = 'none')));
  },
  get rate() { return this.via === 'room' || (this.via === 'relay' && !this.allDirect()) ? 10 : 15; },
  allDirect() { if (!this.conns.size) return false; for (const id of this.conns.keys()) if (!RTC.healthy(this.links.get(id))) return false; return true; },
  viaLabel() { return this.via === 'relay' ? `relais ${RELAY_NAMES[this.room?.k] || ''}`.trim() : this.via === 'room' ? 'salon Claude' : this.via === 'peer' ? 'connexion directe' : ''; },
  linkLabel(id) { if (this.via !== 'relay') return ''; const L = this.isHost ? this.links.get(id) : id === P.id ? this.links.get('host') : null; return L === null ? '' : RTC.healthy(L) ? ' · DIRECT' : ' · RELAIS'; },
  peerOptions() {
    const q = new URLSearchParams(location.search).get('peer'); // ex. ?peer=127.0.0.1:9000 pour un serveur de signalisation privé
    if (!q) return { debug: 0 };
    const [host, port] = q.split(':'); return { host, port: +port || 9000, path: '/', secure: location.protocol === 'https:' && host !== 'localhost', debug: 0 };
  },
  loadLib() {
    if (window.Peer) return Promise.resolve(window.Peer);
    if (this.lib) return this.lib;
    this.lib = new Promise((res, rej) => {
      const s = document.createElement('script'); s.src = 'https://cdn.jsdelivr.net/npm/peerjs@1.5.5/dist/peerjs.min.js';
      s.onload = () => (window.Peer ? res(window.Peer) : rej(new Error('peerjs'))); s.onerror = () => { this.lib = null; rej(new Error('peerjs')); };
      document.head.appendChild(s);
    });
    return this.lib;
  },
  makeCode() { return RELAY.codeFor(RELAY_G_ROOM); },
  makeId() { return 'j' + Math.random().toString(36).slice(2, 10); },
  peerId(code) { return 'snowfall-protocol-' + code.toLowerCase(); },
  roomName(code) { return 'sp-' + code.toLowerCase(); },
  async ready() {
    const t = await this.detect();
    if (t === 'none') throw new Error(`Sur claude.ai, le co-op demande d'être connecté à Claude et invité par e-mail par le propriétaire de la page (rôle Contributeur). Sinon, jouez en co-op sur ${PAGES_URL}`);
    return t;
  },
  roomError(e) {
    const c = e && e.code;
    if (c === 'not_permitted') return new Error("Votre accès à cette page ne permet pas le co-op : demandez au propriétaire de vous inviter avec le rôle Contributeur.");
    if (c === 'limit_reached') return new Error('Trop de salons ouverts pour le moment. Réessayez dans un instant.');
    return new Error('Le salon de jeu ne répond pas. Réessayez dans un instant.');
  },
  get inGame() { return G.mode === 'playing' || G.mode === 'paused'; },

  /* ─── Salon Claude : deux sujets, 'c' (vers l'hôte) et 'h' (de l'hôte) ─── */
  bindRoom(r) { r.on('c', (m) => this.onRoomC(m)); r.on('h', (m) => this.onRoomH(m)); r.on('w', (m) => this.onRoomW(m)); },
  // Relais : un joueur coupé net (onglet fermé, réseau perdu) est annoncé tout de suite par le relais.
  onRoomW(msg) {
    if (!this.active || msg.sameTab) return; const id = msg.peer;
    if (this.isHost) { if (this.conns.has(id)) this.dropPeer(id); }
    else if (id === this.hostId) this.lostHost('bye');
  },
  onRoomC(msg) {
    if (msg.sameTab || !this.active) return; const d = msg.data; if (!d || typeof d.f !== 'string' || !Array.isArray(d.m) || d.f === P.id) return;
    if (!this.isHost) { // un camarade nous désigne comme nouvel hôte alors que l'hôte se tait : on prend le relais
      if (d.h === P.id && (d.e | 0) > this.epoch && this.inGame && this.vt - this.hostVt > 1500) this.lostHost('elu');
      if (!this.isHost) return;
    }
    this.peerOf.set(d.f, msg.peer); this.heard.set(d.f, this.vt);
    if (!this.conns.has(d.f)) {
      if (d.m[0] !== 'hello') { this.sendTo(d.f, 'who', 0); return; } // revenu après une coupure : on redemande qui c'est
      if (this.conns.size >= MAX_PLAYERS - 1) { this.sendTo(d.f, 'full', 0); return; }
      this.conns.set(d.f, { peer: d.f, open: true });
    }
    this.onHostMsg({ peer: d.f }, d.m);
  },
  onRoomH(msg) {
    if (msg.sameTab) return; const d = msg.data; if (!d || !Array.isArray(d.m)) return;
    const e = d.e | 0;
    if (this.isHost) { if (this.active && d.h && d.h !== P.id && (e > this.epoch || (e === this.epoch && d.h < P.id))) this.stepDown(d.h, e); return; }
    if (d.to && d.to !== P.id) return; if (d.x && d.x === P.id) return; if (Array.isArray(d.t) && !d.t.includes(P.id)) return;
    if (this.joinWait) { this.hostId = d.h || null; this.epoch = e; this.joinWait(d.m); if (!this.active) return; }
    else if (!this.active) return;
    if (d.h && d.h !== this.hostId) {
      if (e > this.epoch || (e === this.epoch && this.hostId && d.h < this.hostId)) this.adoptHost(d.h, e);
      else if (this.migrating && d.h === this.oldHost) this.cancelMigration(d.h, e); // fausse alerte : l'hôte est toujours là
      else return; // ancien hôte ou autre candidat : ignoré
    } else if (e < this.epoch) return;
    if (this.migrating) this.migrationDone();
    this.hostLabel = msg.peer; this.heardHost();
    this.onClientMsg(d.m);
  },

  /* ─── Héberger ─── */
  // Ordre : un relais public (partout, y compris sur claude.ai : les deux liens peuvent alors jouer ensemble),
  // puis le salon Claude, puis la connexion directe PeerJS.
  async hostGame(name) {
    await this.detect();
    this.leave(true); this.epoch = 0; this.hostNote = '';
    P.id = this.makeId(); P.name = name;
    // Deux essais sur les quatre relais à la fois : un relais lent au premier contact ne doit pas faire basculer la partie en connexion directe.
    for (let a = 0; a < (this.roomNs ? 1 : 2); a++) {
      try {
        if (a) UI.joinStatus("Aucun relais n'a répondu, nouvel essai…");
        const { room, code } = await RELAY.open(P.id, null, null, this.roomNs ? 6000 : 8000);
        this.room = room; this.code = code; this.via = 'relay'; room.onDown = () => this.relayDown();
        this.active = true; this.isHost = true; this.hostId = P.id; this.lobby = [{ id: P.id, name }];
        this.hostNote = `Relais ${RELAY_NAMES[room.k]}`;
        this.bindRoom(room); UI.lobby();
        return this.code;
      } catch { /* aucun relais joignable depuis ce réseau */ }
    }
    if (this.roomNs) {
      this.code = this.makeCode();
      let r; try { r = await this.roomNs.join(this.roomName(this.code)); } catch (e) { throw this.roomError(e); }
      this.room = r; this.via = 'room'; this.active = true; this.isHost = true; this.hostId = P.id; this.lobby = [{ id: P.id, name }];
      this.hostNote = 'Salon Claude (vos amis doivent aussi jouer sur claude.ai)';
      this.bindRoom(r); UI.lobby();
      return this.code;
    }
    if (window.claude) throw new Error(`Aucun moyen de jouer en co-op depuis cette page. Jouez en co-op sur ${PAGES_URL}`);
    this.hostNote = 'Relais injoignables depuis ce réseau : connexion directe (vos amis doivent être sur le même réseau)';
    return this.hostPeer(name);
  },
  async hostPeer(name) {
    const Peer = await this.loadLib();
    this.code = RELAY.codeFor(RELAY_G_PEER); this.via = 'peer';
    return new Promise((res, rej) => {
      const peer = this.peer = new Peer(this.peerId(this.code), this.peerOptions());
      peer.on('open', () => { this.active = true; this.isHost = true; P.id = peer.id; P.name = name; this.hostId = P.id; this.lobby = [{ id: P.id, name }]; UI.lobby(); this.retryRelays(); res(this.code); });
      peer.on('connection', (c) => this.accept(c));
      peer.on('error', (e) => { if (e.type === 'unavailable-id') { peer.destroy(); this.hostPeer(name).then(res, rej); } else if (!this.active) { UI.netError(e); rej(e); } });
      peer.on('disconnected', () => { try { peer.reconnect(); } catch { /* ignoré */ } });
    });
  },
  // Partie en connexion directe (aucun relais au départ) : tant que personne n'a rejoint, on retente les relais
  // toutes les 12 s ; dès qu'un relais répond, la partie y passe avec un nouveau code, joignable de partout.
  retryRelays() {
    clearInterval(this.relayRetry); if (this.roomNs) return;
    let busy = false;
    this.relayRetry = setInterval(() => {
      if (!this.active || !this.isHost || this.via !== 'peer' || this.lobby.length > 1 || G.mode !== 'menu') { if (!this.active || this.via !== 'peer') clearInterval(this.relayRetry); return; }
      if (busy) return; busy = true;
      RELAY.open(P.id, null, null, 8000).then(({ room, code }) => {
        busy = false;
        if (!this.active || !this.isHost || this.via !== 'peer' || this.lobby.length > 1 || G.mode !== 'menu') { room.leave(); return; }
        clearInterval(this.relayRetry); try { this.peer.destroy(); } catch { /* détruit */ } this.peer = null; this.conns.clear();
        this.room = room; this.code = code; this.via = 'relay'; room.onDown = () => this.relayDown(); this.hostNote = `Relais ${RELAY_NAMES[room.k]}`;
        this.bindRoom(room); this.relayFound = true; UI.lobby(); Sfx.jingle?.([0, 7, 12], 523, 'triangle', 0.08);
      }, () => { busy = false; });
    }, 12000);
  },
  // Connexions entrantes (hôte, ou futur hôte en cas de relève).
  accept(c) {
    if (this.isHost && this.conns.size >= MAX_PLAYERS - 1) { c.on('open', () => { c.send(['full', 0]); setTimeout(() => c.close(), 300); }); return; }
    const reg = () => this.conns.set(c.peer, c);
    if (c.open) reg(); else c.on('open', reg);
    c.on('data', (m) => {
      if (!Array.isArray(m)) return;
      if (!this.isHost) {
        if (m[0] !== 'hello' || !this.active || !this.inGame) return;
        if (this.vt - this.hostVt > 1500) this.lostHost('elu'); // on nous désigne et l'hôte se tait : on prend le relais
        if (!this.isHost) { try { c.send(['hostok', this.hostId]); } catch { /* perdu */ } return; } // l'hôte répond encore chez nous
      }
      // Camarade retiré pour silence (page figée pendant un chargement) mais liaison toujours ouverte : on le réinscrit
      // et on lui redemande qui il est, comme sur les relais ; sinon il resterait bloqué sur « Connexion… ».
      if (this.isHost && this.active && !this.conns.has(c.peer) && c.open) {
        if (this.conns.size >= MAX_PLAYERS - 1) return;
        this.conns.set(c.peer, c); if (m[0] !== 'hello') { this.heard.set(c.peer, this.vt); try { c.send(['who', 0]); } catch { /* perdu */ } return; }
      }
      this.heard.set(c.peer, this.vt); this.onHostMsg(c, m);
    });
    c.on('close', () => this.dropPeer(c.peer, c));
    c.on('error', () => this.dropPeer(c.peer, c));
  },
  dropPeer(id, c) {
    if (!this.conns.has(id) || (c && this.conns.get(id) !== c)) return;
    this.conns.delete(id); RTC.close(this.links.get(id)); this.links.delete(id); if (!this.isHost) return;
    this.lobby = this.lobby.filter((p) => p.id !== id);
    const r = G.players.get(id); if (r) { UI.message(`${r.name} A QUITTÉ LA PARTIE`, ''); G.removePlayer(id); }
    this.broadcast('lobby', this.lobby); UI.lobby();
  },

  /* ─── Rejoindre ─── */
  // On cherche la partie par tous les chemins à la fois (les trois relais, le salon Claude, la connexion directe)
  // et on garde le premier qui obtient une réponse de l'hôte : peu importe comment l'hôte a ouvert sa partie.
  async joinGame(code, name) {
    await this.detect();
    this.leave(true);
    this.epoch = 0; this.hostId = null; code = String(code || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (code.length < 5) throw new Error("Entrez le code à 6 caractères affiché chez l'hôte.");
    P.id = this.makeId(); P.name = name; this.code = code;
    const g = RELAY.groupOf(code), probes = [], all = RELAYS.map((_, i) => i); this.relayReach = 0;
    for (const k of g >= 0 && g < RELAYS.length ? [g, ...all.filter((q) => q !== g)] : all) probes.push(this.probeRoom('relay', code, name, k));
    if (this.roomNs) probes.push(this.probeRoom('room', code, name));
    if (!window.claude) probes.push(this.probePeer(code, name));
    let win;
    try { win = await firstReady(probes, 14000); }
    finally { for (const p of probes) if (p !== win) p.cancel(); }
    if (win.full) { win.cancel(); throw new Error('La partie est complète (4 joueurs).'); }
    this.adopt(win);
  },
  // Une tentative par chemin : elle se connecte, dit bonjour et attend le premier message de l'hôte.
  probeRoom(kind, code, name, k) {
    const pr = { kind, k, dead: false, cleanup: [] };
    pr.cancel = () => { pr.dead = true; for (const f of pr.cleanup.splice(0)) { try { f(); } catch { /* fermé */ } } };
    pr.ready = new Promise((res, rej) => {
      const open = kind === 'room' ? this.roomNs.join(this.roomName(code)).catch((e) => { throw this.roomError(e); }) : RELAY.open(P.id, code, k).then((o) => o.room);
      open.then((r) => {
        pr.r = r; pr.cleanup.push(() => r.leave()); if (kind === 'relay') this.relayReach++;
        if (pr.dead) { r.leave(); return rej(new Error('annulé')); }
        const off = r.on('h', (msg) => {
          const d = msg.data; if (msg.sameTab || !d || !Array.isArray(d.m) || pr.first) return;
          if (d.to && d.to !== P.id) return; if (Array.isArray(d.t) && !d.t.includes(P.id)) return; if (d.x && d.x === P.id) return;
          pr.first = d; pr.full = d.m[0] === 'full'; clearInterval(hello); res(pr);
        });
        if (typeof off === 'function') pr.cleanup.push(off);
        const say = () => { if (!pr.dead && !pr.first) r.emit('c', { f: P.id, e: 0, m: ['hello', { name, v: GAME_VERSION }] }).catch((e) => { if (e && e.code === 'not_permitted') rej(this.roomError(e)); }); };
        say(); const hello = setInterval(say, 1500); pr.cleanup.push(() => clearInterval(hello));
      }, rej);
    });
    return pr;
  },
  probePeer(code, name) {
    const pr = { kind: 'peer', dead: false, cleanup: [] };
    pr.cancel = () => { pr.dead = true; for (const f of pr.cleanup.splice(0)) { try { f(); } catch { /* fermé */ } } };
    pr.ready = this.loadLib().then((Peer) => new Promise((res, rej) => {
      if (pr.dead) return rej(new Error('annulé'));
      const peer = new Peer(P.id, this.peerOptions()); pr.peer = peer; pr.cleanup.push(() => peer.destroy());
      peer.on('open', () => {
        if (pr.c) return; // simple reconnexion au serveur de signalisation
        const c = pr.c = peer.connect(this.peerId(code), { reliable: true, serialization: 'json', metadata: { name } });
        c.on('open', () => c.send(['hello', { name, v: GAME_VERSION }]));
        c.on('data', (m) => { if (!pr.first && Array.isArray(m)) { pr.first = m; pr.full = m[0] === 'full'; res(pr); } });
      });
      peer.on('error', (e) => { if (!pr.first) rej(new Error(e.type || 'peer')); });
    }));
    return pr;
  },
  // Le chemin gagnant devient la connexion de la partie.
  adopt(pr) {
    if (pr.kind === 'peer') {
      const peer = this.peer = pr.peer, c = this.host = pr.c; this.via = 'peer';
      pr.cleanup.length = 0; // on garde la connexion
      this.hostId = this.peerId(this.code);
      this.bindHostConn(c);
      peer.on('connection', (q) => this.accept(q));
      peer.on('disconnected', () => { try { peer.reconnect(); } catch { /* ignoré */ } });
      peer.on('error', (e) => { if (this.active && e.type === 'peer-unavailable' && this.migrating) this.nextCandidate(); });
      this.active = true; this.isHost = false; this.heardHost();
      this.onClientMsg(pr.first);
      return;
    }
    const r = this.room = pr.r, d = pr.first; this.via = pr.kind;
    pr.cleanup.length = 0; // on garde le salon ouvert
    if (pr.kind === 'relay') r.onDown = () => this.relayDown();
    this.hostId = d.h || null; this.epoch = d.e | 0; this.hostLabel = null;
    this.bindRoom(r);
    this.active = true; this.isHost = false; this.heardHost();
    this.onClientMsg(d.m);
    setTimeout(() => this.rtcStart(), 400);
  },
  bindHostConn(c) {
    c.on('data', (m) => {
      if (this.isHost && this.active && c === this.staleHost && Array.isArray(m)) { this.staleHostMsg(c, m); return; }
      if (this.isHost || !this.active) return;
      if (c === this.oldConn && this.migrating) this.cancelMigration(this.oldHost, this.oldEpoch); // fausse alerte : l'ancien hôte parle encore
      if (this.host !== c || !Array.isArray(m)) return;
      if (m[0] === 'hostok' && this.migrating) { this.backToOldHost(); return; }
      this.heardHost(); if (this.migrating) this.migrationDone(); this.onClientMsg(m);
    });
    c.on('close', () => { if (c === this.staleHost) { this.staleHost = null; return; } if (c === this.oldConn) { this.oldConn = null; return; } if (this.active && this.host === c && !this.isHost) this.lostHost('close'); });
    c.on('error', () => {});
  },

  /* ─── Relève de l'hôte ─── */
  lostHost(why) {
    if (!this.active || this.isHost) return;
    if (!this.inGame) { this.hostGone(); return; }
    if (this.migrating) return;
    this.rtcCloseAll();
    this.oldHost = this.hostId; this.oldEpoch = this.epoch; this.epoch++; this.skip = new Set([this.oldHost]);
    const r = G.players.get(this.oldHost); this.oldName = r?.name || "L'HÔTE";
    if (r) G.removePlayer(this.oldHost);
    // Connexion gardée ouverte (sauf départ annoncé) : si l'hôte se manifeste encore, c'était une fausse alerte.
    this.oldConn = why === 'close' || why === 'bye' ? null : this.host; this.host = null;
    this.elect();
  },
  elect() {
    const ids = [...G.players.keys()].filter((id) => !this.skip.has(id)).sort();
    const nh = ids[0] || P.id;
    if (nh === P.id) { this.becomeHost(); return; }
    this.hostId = nh; this.migrating = true; this.migrateDeadline = this.vt + 9000; this.kaT = 0;
    UI.message(`${this.oldName} A QUITTÉ LA PARTIE`, `${G.players.get(nh)?.name || 'Un camarade'} reprend la direction…`);
    if (this.peer) this.connectTo(nh); else this.send('hello', { name: P.name, v: GAME_VERSION });
  },
  nextCandidate() {
    const id = this.hostId; this.skip.add(id); if (this.host && this.host !== this.oldConn) { try { this.host.close(); } catch { /* fermé */ } } this.host = null;
    if (G.players.has(id)) G.removePlayer(id);
    this.elect();
  },
  connectTo(id) {
    const c = this.peer.connect(id, { reliable: true, serialization: 'json', metadata: { name: P.name } });
    this.host = c; this.bindHostConn(c);
    c.on('open', () => { if (this.host === c) c.send(['hello', { name: P.name, v: GAME_VERSION }]); });
  },
  adoptHost(h, e) {
    if (!this.migrating && this.hostId && this.hostId !== h && G.players.has(this.hostId)) { this.oldName = G.players.get(this.hostId).name; G.removePlayer(this.hostId); }
    this.epoch = e; this.hostId = h; this.migrating = false; this.rtcCloseAll();
    this.send('hello', { name: P.name, v: GAME_VERSION }); this.localAction('inv'); setTimeout(() => this.rtcStart(), 800);
    UI.message(`${G.players.get(h)?.name || 'UN CAMARADE'} DIRIGE LA PARTIE`, '');
  },
  cancelMigration(h, e) {
    if (this.peer) { if (this.host && this.host !== this.oldConn) { try { this.host.close(); } catch { /* fermé */ } } this.host = this.oldConn; this.oldConn = null; }
    this.epoch = e; this.hostId = h; this.migrating = false; this.heardHost(); this.send('hello', { name: P.name, v: GAME_VERSION });
  },
  // Le candidat nous dit que l'hôte répond encore chez lui : on se reconnecte à l'hôte.
  backToOldHost() {
    if (this.oldConn?.open) { this.cancelMigration(this.oldHost, this.oldEpoch); return; }
    if (this.host) { try { this.host.close(); } catch { /* fermé */ } }
    this.skip = new Set(); this.epoch = this.oldEpoch; this.hostId = this.oldHost; this.migrateDeadline = this.vt + 9000;
    this.connectTo(this.oldHost);
  },
  dropOld() { if (this.oldConn) { const c = this.oldConn; this.oldConn = null; try { c.close(); } catch { /* fermé */ } } },
  migrationDone() {
    this.migrating = false; this.dropOld(); this.localAction('inv'); this.send('hello', { name: P.name, v: GAME_VERSION }); setTimeout(() => this.rtcStart(), 800);
    UI.message(`${G.players.get(this.hostId)?.name || 'UN CAMARADE'} DIRIGE LA PARTIE`, 'La partie continue.');
  },
  becomeHost() {
    // Connexion directe : la liaison de l'ancien hôte reste ouverte ; s'il n'était que figé et se remet à parler, on lui dit de se retirer.
    if (this.peer && this.oldConn?.open) { this.staleHost = this.oldConn; this.oldConn = null; }
    this.isHost = true; this.migrating = false; this.hostId = P.id; this.heard.clear(); this.snapT = 0; this.snapN = 0; this.dropOld(); this.rtcCloseAll();
    if (this.room) this.conns.clear();
    this.lobby = [{ id: P.id, name: P.name }, ...[...G.players.values()].filter((p) => !p.isLocal).map((p) => ({ id: p.id, name: p.name }))];
    takeOverWorld();
    if (this.peer) this.claimCode();
    UI.message(`${this.oldName} A QUITTÉ LA PARTIE`, 'Vous dirigez maintenant la partie.'); UI.team();
  },
  // Ancien hôte revenu sur sa liaison directe : tant qu'il se croit hôte, on lui annonce la nouvelle époque ;
  // quand il dit bonjour, il devient un camarade comme un autre.
  staleHostMsg(c, m) {
    if (m[0] === 'hello') { this.staleHost = null; this.accept(c); this.heard.set(c.peer, this.vt); this.onHostMsg(c, m); return; }
    const now = performance.now(); if (now - (this.staleT || 0) < 1500) return; this.staleT = now;
    try { c.send(['newhost', { h: P.id, e: this.epoch }]); } catch { /* perdu */ }
  },
  peerStepDown(c, h, e) {
    this.isHost = false; G.authority = false; this.epoch = e; this.hostId = h; this.migrating = false;
    for (const [id, k] of this.conns) if (k !== c) { try { k.close(); } catch { /* fermé */ } } // les autres ont déjà rejoint le nouvel hôte
    this.conns.clear(); this.heard.clear(); this.rtcCloseAll(); this.host = c; this.bindHostConn(c); this.heardHost();
    for (const z of ZOMBIES) if (z.alive) { z.remote = true; z.net.buf = []; z.lastSeen = performance.now(); }
    try { c.send(['hello', { name: P.name, v: GAME_VERSION }]); } catch { /* perdu */ }
    this.localAction('inv');
    UI.message('LIAISON RÉTABLIE', `${G.players.get(h)?.name || 'Un camarade'} dirige désormais la partie.`);
  },
  // L'ancien hôte revient après une coupure (salon Claude) : il redevient simple camarade.
  stepDown(h, e) {
    this.isHost = false; G.authority = false; this.epoch = e; this.hostId = h; this.migrating = false; this.conns.clear(); this.heardHost(); this.rtcCloseAll(); setTimeout(() => this.rtcStart(), 800);
    for (const z of ZOMBIES) if (z.alive) { z.remote = true; z.net.buf = []; z.lastSeen = performance.now(); }
    this.send('hello', { name: P.name, v: GAME_VERSION }); this.localAction('inv');
    UI.message('LIAISON RÉTABLIE', `${G.players.get(h)?.name || 'Un camarade'} dirige désormais la partie.`);
  },
  // Web ouvert : le nouvel hôte reprend aussi le code de la partie, pour que d'autres puissent encore la rejoindre.
  claimCode(tries = 0) {
    if (!this.active || !this.isHost || !window.Peer || this.codePeer || tries > 24) return;
    const cp = new window.Peer(this.peerId(this.code), this.peerOptions()); this.codePeer = cp;
    cp.on('connection', (c) => this.accept(c));
    cp.on('error', (e) => { if (this.codePeer === cp) this.codePeer = null; try { cp.destroy(); } catch { /* détruit */ } if (e.type === 'unavailable-id') setTimeout(() => this.claimCode(tries + 1), 5000); });
  },
  /* ─── Liaisons directes (relais) ─── */
  rtcStart() {
    if (this.via !== 'relay' || this.isHost || !this.active || this.migrating || !RTC.ok()) return;
    let L = this.links.get('host'); if (!L || L.hostId !== this.hostId) { RTC.close(L); this.links.set('host', (L = { tries: 0, hostId: this.hostId })); }
    if (RTC.healthy(L) || L.gaveUp || (L.pc && performance.now() - L.startAt < 10000)) return;
    if (L.tries >= 3) { L.gaveUp = true; UI.lobby(); return; }
    L.tries++;
    const pc = RTC.make(L, true, (k, v) => this.send(k, v), (m) => { if (!this.isHost && this.active && !this.migrating && this.links.get('host') === L) { this.heardHost(); this.onClientMsg(m); } });
    if (!pc) return;
    L.onFail = () => this.rtcRetry(L);
    pc.createOffer().then((o) => pc.setLocalDescription(o)).then(() => { if (L.pc === pc) this.send('rtc', { n: L.n, sdp: { type: pc.localDescription.type, sdp: pc.localDescription.sdp } }); }).catch(() => this.rtcRetry(L));
    L.timer = setTimeout(() => { if (L.pc === pc && !L.open) this.rtcRetry(L); }, 10000);
  },
  rtcRetry(L) { if (this.links.get('host') !== L) return; RTC.close(L); setTimeout(() => this.rtcStart(), 3000); },
  rtcAnswer(pid, d) {
    let L = this.links.get(pid); if (!L) this.links.set(pid, (L = {}));
    RTC.make(L, false, (k, v) => this.sendTo(pid, k, v), (m) => { if (this.isHost && this.active && this.links.get(pid) === L) { this.heard.set(pid, this.vt); this.onHostMsg({ peer: pid }, m); } }, d.n);
    RTC.remote(L, 'rtc', d, (ans) => this.sendTo(pid, 'rtc', ans));
  },
  rtcCloseAll() { for (const L of this.links.values()) RTC.close(L); this.links.clear(); },
  // Relais définitivement perdu (après plusieurs reconnexions) : on continue seul.
  relayDown() {
    if (!this.active) return;
    if (!this.inGame) { this.hostGone(); UI.joinStatus('La connexion au relais de jeu est perdue. Réessayez.', true); return; }
    this.rtcCloseAll();
    if (this.isHost) { for (const id of [...this.conns.keys()]) this.dropPeer(id); }
    else { for (const id of [...G.players.keys()]) if (id !== P.id) G.removePlayer(id); this.oldName = 'LE RELAIS'; this.becomeHost(); }
    UI.message('LIAISON PERDUE', 'Plus de contact avec vos camarades : vous continuez seul.');
  },
  hostGone() {
    if (!this.active) return;
    const inLobby = G.mode === 'menu';
    this.leave(true);
    if (inLobby) { UI.lobby(); $('joinPanel').classList.remove('hidden'); UI.joinStatus("L'hôte a fermé la partie. Créez-en une ou entrez un autre code.", true); }
    else UI.netStatus();
  },
  leave(silent) {
    if (this.room) { if (this.isHost && this.active) this.broadcast('bye', 0); else if (this.active) this.send('bye', 0); const r = this.room; this.room = null; setTimeout(() => { try { r.leave(); } catch { /* fermé */ } }, 150); }
    if (this.host) { try { this.host.close(); } catch { /* fermé */ } }
    if (this.peer) for (const c of this.conns.values()) { try { if (this.isHost) c.send(['bye', 0]); c.close(); } catch { /* fermé */ } }
    this.conns.clear(); this.peerOf.clear(); this.heard.clear(); this.host = null; this.hitQ = []; this.joinWait = null;
    if (this.peer) { try { this.peer.destroy(); } catch { /* détruit */ } }
    if (this.codePeer) { try { this.codePeer.destroy(); } catch { /* détruit */ } }
    clearInterval(this.relayRetry); this.relayFound = false;
    if (this.staleHost) { try { this.staleHost.close(); } catch { /* fermé */ } this.staleHost = null; }
    this.peer = null; this.codePeer = null; this.active = false; this.isHost = false; this.lobby = []; this.code = ''; this.boardSent = false;
    this.migrating = false; this.hostId = null; this.epoch = 0; this.rtcCloseAll(); this.via = null; this.verWarn = '';
    P.id = 'me';
    if (!silent) UI.lobby();
  },
  send(type, data) {
    if (!this.active || this.isHost) return;
    if (this.via === 'relay' && RTC.send(this.links.get('host'), [type, data])) return;
    if (this.room) { this.room.emit('c', { f: P.id, e: this.epoch, h: this.hostId, m: [type, data] }).catch(() => {}); return; }
    try { if (this.host?.open) this.host.send([type, data]); } catch { /* perdu */ }
  },
  broadcast(type, data, except) {
    if (!this.active || !this.isHost) return;
    if (this.room) {
      // Le signal de présence part toujours sur le salon, même sans camarade inscrit : un ancien hôte qui revient
      // après un gel l'entend, voit l'époque plus récente et se retire (sinon chacun resterait hôte de sa partie).
      const all = type === 'bye' || type === 'ka';
      if (!this.conns.size && !all) return;
      let t = null; // camarades à joindre par le relais (les autres l'ont reçu par leur liaison directe)
      if (this.via === 'relay' && this.links.size && !all) {
        t = []; for (const id of this.conns.keys()) if (id !== except && !RTC.send(this.links.get(id), [type, data])) t.push(id);
        if (!t.length) return;
      }
      this.room.emit('h', { to: null, x: except || null, t, e: this.epoch, h: P.id, m: [type, data] }).catch(() => {});
      return;
    }
    for (const [id, c] of this.conns) if (id !== except && c.open) { try { c.send([type, data]); } catch { /* perdu */ } }
  },
  sendTo(pid, type, data) {
    if (this.via === 'relay' && RTC.send(this.links.get(pid), [type, data])) return;
    if (this.room) { this.room.emit('h', { to: pid, e: this.epoch, h: P.id, m: [type, data] }).catch(() => {}); return; }
    const c = this.conns.get(pid); if (c && c.open) { try { c.send([type, data]); } catch { /* perdu */ } }
  },
  queueHit(h) { this.hitQ.push(h); if (this.hitQ.length >= 12) this.flushHits(); },
  flushHits() { if (!this.hitQ.length) return; this.send('hits', this.hitQ); this.hitQ = []; },

  /* ─── Hôte ─── */
  startCoop() {
    const players = this.lobby.map((p) => ({ id: p.id, name: p.name }));
    this.broadcast('start', { players, hid: P.id, diff: settings.diff });
    beginGame({ solo: players.length <= 1, authority: true, players, diff: settings.diff });
  },
  onHostMsg(c, [type, d]) {
    const pid = c.peer, rec = G.players.get(pid);
    switch (type) {
      case 'newhost': if (this.peer && d && (d.e | 0) > this.epoch && d.h === pid) this.peerStepDown(c, d.h, d.e | 0); break;
      case 'hello': {
        const name = String(d?.name || 'SOLDAT').slice(0, 12).toUpperCase();
        if (d?.v !== GAME_VERSION && !rec) this.sendTo(pid, 'ver', GAME_VERSION);
        this.sendTo(pid, 'map', MAP_ID); // l'invité doit jouer sur la même carte
        if (!this.lobby.some((p) => p.id === pid)) this.lobby.push({ id: pid, name });
        this.broadcast('lobby', this.lobby); UI.lobby();
        if ((G.mode === 'playing' || G.mode === 'paused') && !G.players.has(pid)) { // arrivée en cours de partie
          G.addPlayer(pid, name, false);
          this.sendTo(pid, 'start', { players: [...G.players.values()].map((p) => ({ id: p.id, name: p.name })), state: this.worldState(), hid: P.id, diff: G.diff });
          UI.message(`${name} REJOINT LE FRONT`, ''); UI.team();
        }
        break;
      }
      case 'ps': if (rec) { rec.net = rec.net || []; rec.net.push({ t: performance.now(), x: d[0], y: d[1], z: d[2], yaw: d[3], pitch: d[4] }); if (rec.net.length > 8) rec.net.shift(); rec.pos.set(d[0], d[1], d[2]); rec.yaw = d[3]; rec.pitch = d[4]; rec.flags = d[5]; rec.weaponKey = d[6]; rec.acc = d[7]; rec.down = !!(d[5] & 8); noteShots(rec, d[8], d[9]); } break;
      case 'hit': this.applyHit(pid, d); break;
      case 'hits': if (Array.isArray(d)) for (const h of d.slice(0, 40)) this.applyHit(pid, h); break;
      case 'act': G.interact(pid, d[0], d[1]); break;
      case 'down': if (rec) { rec.down = true; rec.downs = (rec.downs || 0) + 1; G.emit('down', { pid }); } break;
      case 'dead': if (rec) G.emit('dead', { pid }); break;
      case 'alive': if (rec) G.emit('alive', { pid }); break;
      case 'nade': this.broadcast('nade', [pid, d[0], d[1]], pid); spawnGrenade(new THREE.Vector3(...d[0]), new THREE.Vector3(...d[1]), pid); break;
      case 'inv': if (rec) rec.inv = d; break;
      case 'board': if (Array.isArray(d)) { BOARD.merge(d.slice(0, 20)); this.broadcast('board', BOARD.top(20)); } break;
      case 'reviving': if (d[0] === P.id) P.reviving = !!d[1]; else this.sendTo(d[0], 'reviving', [d[1]]); break;
      case 'bye': this.dropPeer(pid); break;
      case 'rtc': if (this.via === 'relay' && RTC.ok() && d && d.sdp && this.conns.has(pid)) this.rtcAnswer(pid, d); break;
      case 'ice': RTC.remote(this.links.get(pid), 'ice', d); break;
      case 'ping': if (rec && Array.isArray(d) && performance.now() - (rec.pingT || 0) > 300) { rec.pingT = performance.now(); const a = d.slice(0, 5); addPing(pid, a); this.broadcast('ping', [pid, ...a], pid); mapHook('ping', pid, +a[0] || 0, +a[2] || 0); } break;
    }
  },
  applyHit(pid, d) { if (!Array.isArray(d)) return; const z = ZOMBIES.find((q) => q.id === d[0]); if (z) G.applyDamage(z, clamp(+d[1] || 0, 0, 5000), pid, { head: !!d[2], explosive: !!d[3], melee: !!d[4], freeze: !!d[5], dir: new THREE.Vector3(+d[6] || 0, 0, +d[7] || 1), crawl: !!d[8] }); },
  worldState() {
    return { q: questState(), sc: secretState(), pw: pwrState(), mx: mapHook('state'), lk: lockList(), round: G.round, power: G.power, doors: MAP.doors.filter((q) => q.open).map((q) => q.id), planks: MAP.barricades.map((b) => b.planks), box: { loc: G.box.loc, state: 'idle' }, blizzard: G.blizzard };
  },
  // Surveillance sur minuterie (elle continue quand l'onglet passe en arrière-plan) : signes de vie, silences, relève.
  watch() {
    if (!this.active) { this.lastWatch = 0; return; }
    const now = performance.now(), game = this.inGame;
    this.vt += Math.min(600, this.lastWatch ? now - this.lastWatch : 250); this.lastWatch = now;
    this.kaT -= 0.25;
    if (this.kaT <= 0) {
      this.kaT = this.migrating ? 1 : 2;
      if (this.isHost) this.broadcast('ka', 0); else if (this.migrating) this.send('hello', { name: P.name, v: GAME_VERSION }); else this.send('ka', 0);
    }
    if (this.isHost) {
      const lim = game ? (this.room ? 12000 : 20000) : 45000;
      for (const [id, t] of [...this.heard]) if (this.vt - t > lim) { this.heard.delete(id); this.dropPeer(id); }
      // Soldat connu mais jamais revenu vers nous (après une relève) : retiré au bout de 15 s.
      if (game) for (const id of [...G.players.keys()]) {
        if (id === P.id || this.conns.has(id)) { this.orphans?.delete(id); continue; }
        (this.orphans ||= new Map()); if (!this.orphans.has(id)) this.orphans.set(id, this.vt);
        else if (this.vt - this.orphans.get(id) > 15000) { this.orphans.delete(id); const r = G.players.get(id); G.removePlayer(id); if (r) UI.message(`${r.name} A QUITTÉ LA PARTIE`, ''); }
      }
    } else if (this.migrating) { if (this.vt > this.migrateDeadline) this.nextCandidate(); }
    else if (this.vt - this.hostVt > (game ? (this.room ? 8000 : 10000) : 45000)) this.lostHost('silence');
  },
  hostTick(dt) {
    if (!this.active || !this.isHost || !this.conns.size) return;
    this.snapT -= dt; if (this.snapT > 0) return; this.snapT = 1 / this.rate; this.snapN++;
    const zs = [];
    for (const z of ZOMBIES) { if (!z.alive) continue; zs.push([z.id, KINDS.indexOf(z.kind), z.variant, Math.round(z.pos.x * 100), Math.round(z.pos.y * 100), Math.round(z.pos.z * 100), Math.round(z.yaw * 100), Math.max(0, ZSTATE.indexOf(z.state)), Math.round(Math.hypot(z.vel.x, z.vel.z) * 10), Math.max(0, Math.round(z.hp)), z.crawl ? 1 : 0]); }
    const ps = [...G.players.values()].map((p) => [p.id, +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2), +(p.isLocal ? P.yaw : p.yaw).toFixed(2), +(p.isLocal ? P.pitch : p.pitch || 0).toFixed(2), p.isLocal ? localFlags() : p.flags, p.isLocal ? (curW()?.key || 'knife') : p.weaponKey, p.points, p.kills, p.name, p.isLocal ? (P.shotN || 0) : (p.shotN || 0), p.isLocal ? (P.shotSnd || '') : (p.shotSnd || '')]);
    const base = { p: ps, pu: [+G.pu.instakill.toFixed(1), +G.pu.double.toFixed(1), +G.pu.firesale.toFixed(1)], bt: +G.bench.t.toFixed(1) };
    const fx = mapHook('fast'); if (fx !== undefined) base.fx = fx; // personnages propres à la carte (géant…)
    // Toutes les secondes : état complet du secteur (rattrape un message perdu).
    if (this.snapN % this.rate === 0) base.ws = { d: MAP.doors.map((q) => (q.open ? 1 : 0)).join(''), k: MAP.barricades.map((b) => b.planks).join(''), w: G.power ? 1 : 0, r: G.round, b: G.box.loc, bs: G.box.state, bn: G.bench.state, dr: G.drops.map((q) => q.id), q: questState(), sc: secretState(), tr: TRAPS.map((t) => [+t.active.toFixed(0), +t.cool.toFixed(0)]), pw: pwrState(), h: P.id, g: G.gid, rs: [G.toSpawn, +Math.max(0, G.breakT).toFixed(1)], sp: [+SUPPORT.t.toFixed(0), +SUPPORT.cool.toFixed(0), SUPPORT.owner], mx: mapHook('state'), lk: lockList() };
    // Messages de 4 Ko maximum dans le salon Claude : on découpe la liste des infectés.
    const chunk = this.via === 'peer' || (this.via === 'relay' && this.allDirect()) ? 999 : 28;
    for (let i = 0; i === 0 || i < zs.length; i += chunk) this.broadcast('snap', Object.assign(i === 0 ? base : { p: [] }, { z: zs.slice(i, i + chunk) }));
  },

  /* ─── Invité ─── */
  onClientMsg([type, d]) {
    switch (type) {
      case 'lobby': this.lobby = Array.isArray(d) ? d : []; UI.lobby(); if (!this.boardSent) { this.boardSent = true; this.send('board', BOARD.top(20)); } break;
      case 'board': if (Array.isArray(d)) BOARD.merge(d.slice(0, 20)); break;
      case 'full': UI.joinStatus('La partie est complète (4 joueurs).', true); this.leave(true); break;
      case 'start': if (d.hid) this.hostId = d.hid; if (G.mode === 'playing' && G.players.has(P.id)) break; beginGame({ solo: false, authority: false, players: d.players, diff: d.diff }); if (d.state) applyWorldState(d.state); break;
      case 'ev': if (G.mode === 'playing' || G.mode === 'paused' || d[0] === 'gameover') G.applyEvent(d[0], d[1]); break;
      case 'snap': if (G.mode === 'playing' || G.mode === 'paused') applySnapshot(d); break;
      case 'hurt': localHurt(d[0], { x: d[1], z: d[2] }); break;
      case 'tell': if (d[0] === 'deny') { Sfx.deny(); UI.flashPrompt(); } else if (d[0] === 'buy') Sfx.buy(); break;
      case 'nade': spawnGrenade(new THREE.Vector3(...d[1]), new THREE.Vector3(...d[2]), d[0]); break;
      case 'reviving': P.reviving = !!d[0]; break;
      case 'who': this.send('hello', { name: P.name, v: GAME_VERSION }); break;
      case 'map':
        if (typeof d !== 'string' || d === MAP_ID || this.switching) break;
        if (!MAPS[d]) { this.verWarn = "L'hôte joue sur une carte que votre version du jeu ne connaît pas : rechargez la page (Ctrl+F5)."; UI.lobby(); break; }
        this.switching = true; UI.joinStatus(`L'hôte joue sur ${MAPS[d].name} : chargement de la carte…`);
        { const code = this.code, name = P.name; this.leave(true); switchMap(d, { rejoindre: code, nom: name }); }
        break;
      case 'bye': this.lostHost('bye'); break;
      case 'ver': this.verWarn = `Attention : l'hôte a la version ${String(d).slice(0, 8)} du jeu et vous la ${GAME_VERSION}. Rechargez la page (Ctrl+F5) chez celui qui a la plus ancienne.`; UI.lobby(); break;
      case 'rtc': case 'ice': RTC.remote(this.links.get('host'), type, d); break;
      case 'ping': if (Array.isArray(d) && d[0] !== P.id) addPing(d[0], d.slice(1, 6)); break;
    }
  },
  clientTick(dt) {
    if (!this.active || this.isHost || G.mode !== 'playing') return;
    this.psT -= dt; if (this.psT > 0) return; this.psT = 1 / (this.via === 'peer' || RTC.healthy(this.links.get('host')) ? 20 : 10);
    this.flushHits();
    this.send('ps', [+P.pos.x.toFixed(2), +P.pos.y.toFixed(2), +P.pos.z.toFixed(2), +P.yaw.toFixed(3), +P.pitch.toFixed(3), localFlags(), curW()?.key || 'knife', P.stats.shots ? Math.round((P.stats.hits / P.stats.shots) * 100) : 0, P.shotN || 0, P.shotSnd || '']);
  },
  localGrenade(o, v) { if (!this.active) return; const d = [[+o.x.toFixed(2), +o.y.toFixed(2), +o.z.toFixed(2)], [+v.x.toFixed(2), +v.y.toFixed(2), +v.z.toFixed(2)]]; if (this.isHost) this.broadcast('nade', [P.id, ...d]); else this.send('nade', d); },
  localAction(kind) { if (!this.active) return; if (kind === 'inv' && !this.isHost) this.send('inv', P.weapons.map((w) => [w.key, w.up])); if (kind === 'alive') { if (this.isHost) G.emit('alive', { pid: P.id }); else this.send('alive', []); } },
};
// Pourquoi la partie est introuvable : le premier caractère du code dit par où l'hôte est passé.
function joinFailText(code) {
  const g = RELAY.groupOf(code), head = `Aucune partie trouvée avec le code ${code}.`;
  if (g === RELAY_G_PEER) return `${head} Ce code est celui d'une partie en connexion directe : l'hôte n'a joint aucun relais public, donc seuls les joueurs de son réseau Wi-Fi peuvent entrer. L'hôte doit attendre le nouveau code proposé dans son salon (nouvel essai toutes les 12 s), ou quitter le salon et recréer la partie.`;
  if (g === RELAY_G_ROOM) return `${head} Ce code est celui d'une partie hébergée dans la page claude.ai : elle ne se rejoint que depuis cette même page. Pour jouer entre amis, hébergez et rejoignez depuis ${PAGES_URL}`;
  if (!NET.relayReach && !window.claude) return `${head} Aucun relais public ne répond depuis votre réseau (pare-feu, VPN, bloqueur de publicités ou réseau d'école ?). Essayez un autre réseau, par exemple un partage de connexion 4G.`;
  return `${head} Vérifiez le code (il change si l'hôte recrée la partie) et que vous avez tous les deux la version ${GAME_VERSION} (affichée en bas du menu ; sinon Ctrl+F5).`;
}
// Première tentative qui aboutit ; sinon l'erreur la plus parlante (partie complète, accès refusé…).
function firstReady(probes, timeout) {
  return new Promise((res, rej) => {
    let left = probes.length, done = false; const errs = [];
    const fail = () => {
      const special = errs.find((e) => e && e.message && !/^(annulé|relay|peer|peer-unavailable|network|server-error|socket-error|socket-closed|unavailable-id|browser-incompatible)$/.test(e.message));
      rej(special || new Error(joinFailText(NET.code)));
    };
    const to = setTimeout(() => { if (!done) { done = true; fail(); } }, timeout);
    for (const p of probes) p.ready.then((w) => { if (done) { p.cancel(); return; } done = true; clearTimeout(to); res(w); }, (e) => { errs.push(e); if (--left === 0 && !done) { done = true; clearTimeout(to); fail(); } });
  });
}
// Tirs des camarades : le compteur de tirs voyage avec leur position.
function noteShots(rec, n, snd) {
  if (typeof n !== 'number') return;
  if (rec.shotN === undefined) { rec.shotN = n; return; }
  if (n > rec.shotN) { rec.shotN = n; rec.shotSnd = snd; remoteShot(rec.id, [rec.pos.x, rec.pos.y + 1.4, rec.pos.z, 0, 0, 0, snd || 'pistol']); }
}
function localFlags() { return (P.crouch > 0.5 ? 1 : 0) | (P.sprint ? 2 : 0) | (P.ads > 0.5 ? 4 : 0) | (P.down ? 8 : 0) | (P.dead ? 16 : 0) | (P.reload ? 32 : 0) | (P.torch ? 64 : 0); }
function applyWorldState(s) {
  // Étapes indépendantes : une erreur dans l'une (état d'une carte, par exemple) n'empêche plus d'appliquer les suivantes.
  const step = (f) => { try { f(); } catch (e) { console.error(e); } };
  step(() => { for (const id of s.doors || []) { const d = MAP.doors[id]; if (!d) continue; d.open = true; d.anim = 1; d.group.visible = false; } refreshZones(); });
  step(() => (s.planks || []).forEach((n, i) => { const b = MAP.barricades[i]; if (!b) return; b.planks = n; for (let k = 0; k < 6; k++) { b.plankShown[k] = k < n; b.plankAnim[k] = 0.999; } }));
  step(() => { if (s.power) { G.power = true; setPowerVisuals(true, true); Sfx.hum(WORLD.generator ? WORLD.generator.group.position : WORLD.power.pos); } });
  step(() => { if (s.q && MAP_ID === 'poste7') questApply('quest', s.q); });
  step(() => { if (s.pw) pwrApply(s.pw, true); });
  step(() => secretReconcile(s.sc));
  step(() => { if (s.mx !== undefined) mapHook('reconcile', s.mx, true); });
  step(() => { if (Array.isArray(s.lk)) syncLocks(s.lk); });
  G.round = s.round; UI.round(s.round); step(() => { if (s.box) placeBox(s.box.loc); }); G.blizzard = s.blizzard; WEATHER.target = s.blizzard ? 1 : 0;
}
function applySnapshot(d) {
  const now = performance.now(), seen = new Set();
  for (const a of d.z) {
    const [id, k, v, x, y, z, yaw, st, sp, hp, cr] = a; seen.add(id);
    let q = ZOMBIES.find((o) => o.id === id);
    if (!q) q = new Zombie({ id, kind: KINDS[k], variant: v, x: x / 100, y: y / 100, z: z / 100, yaw: yaw / 100, hp, remote: true, state: ZSTATE[st] === 'rise' ? 'rise' : 'move', round: G.round });
    if (!q.alive) continue;
    q.net.buf.push({ t: now, x: x / 100, y: y / 100, z: z / 100, yaw: yaw / 100 }); if (q.net.buf.length > 6) q.net.buf.shift();
    const s = ZSTATE[st]; if (s !== 'frozen' && q.state !== 'frozen') { if (s === 'attack' && q.state !== 'attack') { q.attackT = 0; Sfx.zombie(q.pos, 'attack', q.brute ? 0.7 : 1); } q.state = s; }
    q.net.speed = sp / 10; q.netHp = hp; q.lastSeen = now; q.crawl = !!cr;
  }
  for (const z of [...ZOMBIES]) if (z.remote && z.alive && !seen.has(z.id) && now - (z.lastSeen || now) > 1500) z.destroy();
  if (!d.p || !d.p.length) return; // fragment supplémentaire : infectés seulement
  // Les soldats absents de la liste de l'hôte sont partis : on retire leur silhouette.
  const ids = new Set(d.p.map((a) => a[0])); for (const id of [...G.players.keys()]) if (id !== P.id && !ids.has(id)) G.removePlayer(id);
  for (const a of d.p) {
    const [id, x, y, z, yaw, pitch, flags, wk, pts, kills, name, sn, snd] = a;
    if (id === P.id) { const me = G.me(); if (me && me.points !== pts) { const delta = pts - me.points; me.points = pts; UI.points(pts, delta); } if (me) me.kills = kills; continue; }
    let r = G.players.get(id); if (!r) r = G.addPlayer(id, String(name).slice(0, 12), false);
    r.net = r.net || []; r.net.push({ t: now, x, y, z, yaw, pitch }); if (r.net.length > 8) r.net.shift();
    r.pos.set(x, y, z); r.flags = flags; r.weaponKey = wk; r.points = pts; r.kills = kills; r.down = !!(flags & 8); r.dead = !!(flags & 16);
    noteShots(r, sn, snd);
  }
  if (d.fx !== undefined) mapHook('fastApply', d.fx);
  if (d.pu) { G.pu.instakill = d.pu[0]; G.pu.double = d.pu[1]; G.pu.firesale = d.pu[2] || 0; }
  if (d.bt !== undefined) G.bench.t = d.bt;
  if (d.ws) reconcileWorld(d.ws);
  UI.team();
}
// Rattrapage : si un message de l'hôte s'est perdu, l'état complet remet tout d'aplomb.
function reconcileWorld(w) {
  String(w.d).split('').forEach((c, i) => { const dr = MAP.doors[i]; if (dr && c === '1' && !dr.open) G.applyEvent('door', { id: i }); });
  String(w.k).split('').forEach((c, i) => {
    const b = MAP.barricades[i], n = +c; if (!b || b.planks === n) return;
    b.planks = n; for (let k = 0; k < 6; k++) { const show = k < n; if (b.plankShown[k] !== show) { b.plankShown[k] = show; b.plankAnim[k] = 0.999; } }
  });
  if (w.w && !G.power) G.applyEvent('power', {});
  if (w.r && w.r !== G.round) { G.round = w.r; UI.round(w.r); }
  if (w.b !== undefined && w.b !== G.box.loc && G.box.state === 'idle') placeBox(w.b);
  // Un message de la caisse ou de l'établi s'est perdu : on revient au repos comme l'hôte.
  if (w.bs === 'idle' && G.box.state !== 'idle' && G.box.state !== 'closing') { if ((NET.boxOff = (NET.boxOff || 0) + 1) >= 2) { NET.boxOff = 0; applyBoxState({ state: 'idle', loc: w.b }); } } else NET.boxOff = 0;
  if (w.bn === 'idle' && G.bench.state !== 'idle') { if ((NET.benchOff = (NET.benchOff || 0) + 1) >= 2) { NET.benchOff = 0; applyBenchState({ state: 'idle' }); } } else NET.benchOff = 0;
  if (w.q && (w.q.s !== QUEST.stage || w.q.tk?.join() !== QUEST.taken.join())) questApply('quest', w.q);
  if (Array.isArray(w.tr)) w.tr.forEach(([a, c], i) => { const t = TRAPS[i]; if (t && Math.abs(t.active - a) > 2) t.active = a; if (t && Math.abs(t.cool - c) > 2) t.cool = c; });
  if (Array.isArray(w.dr)) for (const dp of [...G.drops]) if (!w.dr.includes(dp.id)) G.applyEvent('take', { id: dp.id, gone: 1 });
  if (w.g) G.gid = String(w.g).slice(0, 24);
  if (Array.isArray(w.sp)) { if (Math.abs(SUPPORT.t - w.sp[0]) > 2) SUPPORT.t = +w.sp[0] || 0; if (Math.abs(SUPPORT.cool - w.sp[1]) > 2) SUPPORT.cool = +w.sp[1] || 0; SUPPORT.owner = w.sp[2] ?? null; }
  if (Array.isArray(w.rs)) G.netRs = w.rs;
  if (typeof w.sc === 'string' && w.sc !== secretState()) secretReconcile(w.sc);
  if (w.pw && (w.pw.s !== PWR.stage || w.pw.g?.join() !== PWR.got.join() || w.pw.t?.join() !== PWR.tiles.join() || Math.abs((w.pw.p || 0) - PWR.prog) > 2)) pwrApply(w.pw, true);
  if (w.mx !== undefined) mapHook('reconcile', w.mx, false);
  if (Array.isArray(w.lk)) syncLocks(w.lk);
  if (w.h && !NET.migrating) NET.hostId = w.h;
}
// Relève : le nouvel hôte prend la main sur les infectés et l'état de la manche qu'il recevait jusque-là.
function takeOverWorld() {
  G.authority = true;
  let maxId = 0;
  for (const z of ZOMBIES) {
    maxId = Math.max(maxId, z.id);
    if (!z.remote) continue; z.remote = false;
    if (!z.alive) continue;
    z.hp = z.maxHp = Math.max(1, z.netHp ?? z.hp); z.vel.set(0, 0, 0); z.lastPos.copy(z.pos); z.stuckT = 0; z.farT = 0; z.barricade = null;
    if (z.state === 'attack' || z.state === 'tear') z.state = 'move';
    else if (z.state === 'rise') z.t = z.rise * 1.4;
    else if (z.state === 'frozen') z.frozenT = 0.6;
  }
  zombieSeq = Math.max(zombieSeq, maxId + 100);
  for (const d of G.drops) G.dropSeq = Math.max(G.dropSeq, d.id + 50);
  const rs = G.netRs || [];
  Object.assign(G, G.roundParams(Math.max(1, G.round)));
  G.toSpawn = rs[0] ?? 0; G.breakT = rs[1] ?? 0; G.spawnT = 1; G.overT = 0; G.flowT = 0;
  if (G.round === 0 && G.breakT <= 0) G.breakT = 3;
  const bx = G.box; if (bx.state !== 'idle') bx.t = bx.state === 'rolling' || bx.state === 'offer' ? Math.max(0.5, bx.clientT || 1) : 1;
  if (QUEST.stage === 5) QUEST.prevToSpawn = 0;
  for (const t of TRAPS) if (t.active > 0 && !G.players.has(t.owner)) t.owner = P.id;
  mapHook('takeOver');
}
function netZombieInterp(z, dt) {
  if (z.state === 'rise') { z.rise = Math.min(1, z.rise + dt / 1.2); if (z.rise >= 1) z.state = 'move'; }
  if (z.state === 'attack') { z.attackT = Math.min(1, z.attackT + dt); }
  const b = z.net.buf; if (!b.length) return;
  const rt = performance.now() - 110;
  let a = b[0], c = b[b.length - 1];
  for (let i = 0; i < b.length - 1; i++) if (b[i].t <= rt && b[i + 1].t >= rt) { a = b[i]; c = b[i + 1]; break; }
  const k = c.t > a.t ? clamp((rt - a.t) / (c.t - a.t), 0, 1) : 1;
  z.pos.set(lerp(a.x, c.x, k), lerp(a.y, c.y, k), lerp(a.z, c.z, k)); z.yaw = a.yaw + angDiff(a.yaw, c.yaw) * k;
}
function remoteShot(pid, d) {
  const r = G.players.get(pid); const pos = _v1.set(d[0], d[1], d[2]);
  Sfx.gun(d[6], pos, false);
  if (r?.avatar) r.avatar.flash = 0.05;
  // Rayonneur d'un camarade : on trace son trait vert dans la direction où il vise.
  if (d[6] === 'ray' && r) {
    const yaw = r.yaw || 0, pitch = r.pitch || 0, o = new THREE.Vector3(r.pos.x, r.pos.y + 1.45, r.pos.z);
    const dir = new THREE.Vector3(-Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), -Math.cos(yaw) * Math.cos(pitch));
    const h = rayWorld(o, dir, 60), end = h ? h.point.clone() : o.clone().addScaledVector(dir, 60);
    fxRay(o.clone().addScaledVector(dir, 0.7), end, false);
  }
  const L = R.lights.muzzle; if (L.intensity === 0) { L.position.copy(pos); L.intensity = 30; setTimeout(() => { if (!VM.flashT || VM.flashT <= 0) L.intensity = 0; }, 50); }
}

/* ─── Camarades (avatars des autres joueurs) ─── */
class Avatar {
  constructor(rec) {
    this.rec = rec; const rig = makeRig(ZV.soldier, SOLDIER_MATS); this.holder = rig.holder; this.bones = rig.bones; R.scene.add(this.holder);
    this.phase = 0; this.t = 0; this.flash = 0; this.gunKey = null;
    const tag = textTexture(256, 64, (x) => { x.font = font(40, 800); x.textAlign = 'center'; x.fillStyle = '#9ce8ff'; x.shadowColor = '#000'; x.shadowBlur = 6; x.fillText(rec.name, 128, 44); });
    this.tag = new THREE.Sprite(new THREE.SpriteMaterial({ map: tag, depthTest: false, transparent: true, sizeAttenuation: false })); this.tag.scale.set(0.14, 0.035, 1); this.tag.position.y = 2.15; this.tag.renderOrder = 20; this.holder.add(this.tag);
    this.muz = new THREE.Sprite(new THREE.SpriteMaterial({ map: TEX.sprites.muzzle, blending: THREE.AdditiveBlending, depthWrite: false })); this.muz.scale.set(0.5, 0.5, 1); this.muz.visible = false; R.scene.add(this.muz);
    this.pos = rec.pos.clone(); this.yaw = 0;
  }
  setGun(key) {
    if (this.gun) this.bones[BN.chest].remove(this.gun);
    this.gunKey = key; if (!WEAPONS[key]) { this.gun = null; return; }
    const m = buildGunModel(key, false, false); this.gun = m.root; this.gunParts = m;
    this.gun.position.set(-0.12, 0.02, 0.26); this.gun.rotation.set(0, Math.PI, 0); this.bones[BN.chest].add(this.gun);
  }
  update(dt) {
    const r = this.rec, b = r.net; this.t += dt;
    if (r.weaponKey !== this.gunKey) this.setGun(r.weaponKey);
    let tx = r.pos.x, ty = r.pos.y, tz = r.pos.z, tyaw = r.yaw, tp = r.pitch || 0;
    if (b && b.length > 1) { const rt = performance.now() - 110; let a = b[0], c = b[b.length - 1]; for (let i = 0; i < b.length - 1; i++) if (b[i].t <= rt && b[i + 1].t >= rt) { a = b[i]; c = b[i + 1]; break; } const k = c.t > a.t ? clamp((rt - a.t) / (c.t - a.t), 0, 1) : 1; tx = lerp(a.x, c.x, k); ty = lerp(a.y, c.y, k); tz = lerp(a.z, c.z, k); tyaw = a.yaw + angDiff(a.yaw, c.yaw) * k; tp = lerp(a.pitch, c.pitch, k); }
    const spd = Math.hypot(tx - this.pos.x, tz - this.pos.z) / Math.max(dt, 1e-3);
    this.pos.set(tx, ty, tz); this.yaw = tyaw;
    this.phase += spd / 1.4 * Math.PI * dt;
    const h = this.holder; h.visible = !r.dead; h.position.copy(this.pos); h.rotation.set(0, this.yaw + Math.PI, 0);
    const down = r.down;
    poseBody(this.bones, { phase: this.phase, run: (r.flags & 2) ? 0.6 : 0, lean: 0.04, reach: 0, attack: 0, tear: 0, crawl: false, rise: 1, headTilt: 0, t: this.t, limp: 0, hold: true, aim: tp, crouch: (r.flags & 1) ? 1 : 0, moving: clamp(spd / 2.5, 0, 1), jaw: 0 });
    if (down) { h.rotation.x = -1.3; h.position.y += 0.2; }
    if (this.flash > 0 && this.gunParts) { this.flash -= dt; this.muz.visible = true; this.gunParts.muzzle.getWorldPosition(this.muz.position); this.muz.material.rotation = rand(TAU); } else this.muz.visible = false;
  }
  destroy() { R.scene.remove(this.holder); R.scene.remove(this.muz); }
}

function lockList() { const l = WORLD.perks.filter((p) => p.locked).map((p) => 'p:' + p.key); if (G.box.locked) l.push('b'); return l; }
function syncLocks(l) { for (const p of WORLD.perks) { const on = l.includes('p:' + p.key); if (!!p.locked !== on) setLock('p:' + p.key, on); } const b = l.includes('b'); if (!!G.box.locked !== b) setLock('b', b); }
