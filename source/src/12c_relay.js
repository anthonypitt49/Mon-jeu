/* ═══════════════════ RELAIS PUBLICS ET LIAISONS DIRECTES (co-op sur n'importe quel réseau) ═══════════════════
   Même méthode que le jeu de F1 : trois relais publics gratuits (MQTT sur WebSocket) trouvent la partie et
   transportent tout ce qu'il faut, que l'on soit à la maison, à l'école ou en 4G, sans serveur à nous.
   Quand les deux ordinateurs arrivent à se parler directement (WebRTC), les positions et les infectés passent
   par ce chemin plus court ; le relais reprend la main dès que la liaison directe se tait. */

const RELAY_ALPHA = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const RELAYS = (() => {
  const q = new URLSearchParams(location.search).get('relay'); // tests : ?relay=ws://127.0.0.1:8883
  // Le 4e relais écoute sur le port 443, celui du web : il passe les pare-feu qui bloquent les ports 8081, 8084 et 8884.
  return q ? [q, q, q, q] : ['wss://test.mosquitto.org:8081', 'wss://broker.emqx.io:8084/mqtt', 'wss://broker.hivemq.com:8884/mqtt', 'wss://mqtt.eclipseprojects.io:443/mqtt'];
})();
const RELAY_ROOT = 'snowfall-protocol/v1/';
const RELAY_NAMES = ['Mosquitto', 'EMQX', 'HiveMQ', 'Eclipse'];
// Premier caractère du code : relais 0 à 3 (5 lettres chacun), salon Claude (6 lettres), connexion directe PeerJS (6 lettres).
const RELAY_G_ROOM = 4, RELAY_G_PEER = 5;
const RTC_ICE = [{ urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] }, { urls: 'stun:stun.cloudflare.com:3478' }];

// Petit client MQTT 3.1.1 (QoS 0) : connexion, abonnement, publication, maintien en vie.
function mqttOpen(url, id, will, onMsg, onDown) {
  const enc = new TextEncoder(), dec = new TextDecoder();
  const cli = { ready: false, dead: false, ws: null, onReady: null, lastIn: Date.now(), pingT: 0 };
  const lenBytes = (n) => { const o = []; do { let x = n % 128; n = Math.floor(n / 128); if (n > 0) x |= 128; o.push(x); } while (n > 0); return o; };
  const mstr = (s) => { const b = enc.encode(s), o = new Uint8Array(2 + b.length); o[0] = (b.length >> 8) & 255; o[1] = b.length & 255; o.set(b, 2); return o; };
  const pack = (head, parts) => { let len = 0; for (const q of parts) len += q.length; const L = lenBytes(len), out = new Uint8Array(1 + L.length + len); out[0] = head; out.set(L, 1); let o = 1 + L.length; for (const q of parts) { out.set(q, o); o += q.length; } return out; };
  const send = (b) => { if (cli.ws && cli.ws.readyState === 1) { try { cli.ws.send(b); } catch { /* perdu */ } } };
  let buf = new Uint8Array(0);
  const handle = (type, body) => {
    cli.lastIn = Date.now();
    const t = type >> 4;
    if (t === 2) { if (body.length > 1 && body[1] === 0) { cli.ready = true; cli.onReady && cli.onReady(); } else cli.fail('refused'); }
    else if (t === 3) { const qos = (type >> 1) & 3, tl = (body[0] << 8) | body[1]; const topic = dec.decode(body.subarray(2, 2 + tl)); let o = 2 + tl; if (qos > 0) o += 2; try { onMsg(topic, dec.decode(body.subarray(o))); } catch (e) { console.error(e); } }
  };
  const feed = (chunk) => {
    const nb = new Uint8Array(buf.length + chunk.length); nb.set(buf, 0); nb.set(chunk, buf.length); buf = nb;
    for (;;) {
      if (buf.length < 2) return;
      let mul = 1, len = 0, i = 1, b;
      do { if (i >= buf.length) return; b = buf[i++]; len += (b & 127) * mul; mul *= 128; } while ((b & 128) && i < 5);
      if (buf.length < i + len) return;
      const type = buf[0], body = buf.slice(i, i + len); buf = buf.slice(i + len); handle(type, body);
    }
  };
  cli.fail = (why) => { if (cli.dead) return; cli.dead = true; clearInterval(cli.pingT); try { cli.ws && cli.ws.close(); } catch { /* fermé */ } onDown && onDown(why); };
  cli.publish = (topic, str) => send(pack(0x30, [mstr(topic), enc.encode(str)]));
  cli.subscribe = (topics) => { const pid = 1 + ((Math.random() * 65000) | 0), parts = [new Uint8Array([pid >> 8, pid & 255])]; for (const tp of topics) { parts.push(mstr(tp)); parts.push(new Uint8Array([0])); } send(pack(0x82, parts)); };
  cli.close = () => { if (cli.dead) return; send(new Uint8Array([0xe0, 0])); cli.dead = true; clearInterval(cli.pingT); setTimeout(() => { try { cli.ws.close(); } catch { /* fermé */ } }, 120); };
  try { cli.ws = new WebSocket(url, ['mqtt']); } catch { setTimeout(() => cli.fail('ws'), 0); return cli; }
  cli.ws.binaryType = 'arraybuffer';
  cli.ws.onopen = () => {
    let flags = 0x02; const parts = [new Uint8Array([0, 4, 77, 81, 84, 84, 4]), null, new Uint8Array([0, 60]), mstr(id)];
    if (will) { flags |= 0x04; parts.push(mstr(will.topic)); const wp = enc.encode(will.payload); parts.push(new Uint8Array([(wp.length >> 8) & 255, wp.length & 255])); parts.push(wp); }
    parts[1] = new Uint8Array([flags]); send(pack(0x10, parts));
    cli.pingT = setInterval(() => { send(new Uint8Array([0xc0, 0])); if (Date.now() - cli.lastIn > 90000) cli.fail('silence'); }, 20000);
  };
  cli.ws.onmessage = (e) => feed(new Uint8Array(e.data));
  cli.ws.onerror = () => cli.fail('error');
  cli.ws.onclose = () => cli.fail('closed');
  return cli;
}

const RELAY = {
  // Le premier caractère du code désigne le chemin choisi par l'hôte (voir RELAY_G_ROOM, RELAY_G_PEER).
  groupOf(code) { const i = RELAY_ALPHA.indexOf(String(code || '')[0]); return i < 0 ? -1 : i < 20 ? Math.floor(i / 5) : i < 26 ? RELAY_G_ROOM : RELAY_G_PEER; },
  codeFor(k) { const [a, n] = k < RELAY_G_ROOM ? [k * 5, 5] : k === RELAY_G_ROOM ? [20, 6] : [26, 6]; let s = RELAY_ALPHA[a + ((Math.random() * n) | 0)]; for (let i = 0; i < 5; i++) s += RELAY_ALPHA[(Math.random() * RELAY_ALPHA.length) | 0]; return s; },
  // Ouvre la salle du code donné, ou une nouvelle salle sur le premier relais qui répond. Même interface que le salon Claude.
  // `k` impose un relais précis (recherche d'une partie sur chacun des trois).
  open(id, code, k = null, timeout = 9000) {
    const order = k != null ? [k] : code ? [this.groupOf(code)] : RELAYS.map((_, i) => i);
    return new Promise((res, rej) => {
      if (!order.every((q) => RELAYS[q])) { rej(new Error('relay')); return; }
      let done = false, failed = 0; const tries = [];
      const to = setTimeout(() => { if (done) return; done = true; tries.forEach((c) => c.close()); rej(new Error('relay')); }, timeout);
      for (const k of order) {
        const cd = code || this.codeFor(k), room = relayRoom(RELAY_ROOT + cd.toLowerCase() + '/', id, k);
        const cli = room.connect(() => { if (!done && ++failed >= order.length) { done = true; clearTimeout(to); rej(new Error('relay')); } });
        cli.onReady = () => { if (done) { cli.close(); return; } done = true; clearTimeout(to); tries.forEach((o) => o !== cli && o.close()); room.ready(cli); res({ room, code: cd }); };
        tries.push(cli);
      }
    });
  },
};
function relayRoom(base, id, k) {
  const handlers = {};
  const room = {
    cli: null, live: false, onDown: null, k, retries: 0,
    connect(onFail) {
      const cli = mqttOpen(RELAYS[k], id + Math.random().toString(36).slice(2, 7), { topic: base + 'w', payload: JSON.stringify({ s: id, d: 0 }) },
        (topic, payload) => { if (room.cli === cli) room.deliver(topic, payload); },
        () => { if (room.cli === cli && room.live) room.lost(); else if (!room.cli && onFail) onFail(); });
      return cli;
    },
    ready(cli) { room.cli = cli; room.live = true; room.retries = 0; cli.subscribe([base + 'c', base + 'h', base + 'w']); },
    // Coupure du relais (Wi-Fi qui décroche) : on se reconnecte tout seul quelques fois avant d'abandonner.
    lost() {
      if (room.retries >= 6) { room.live = false; room.onDown && room.onDown(); return; }
      room.retries++;
      setTimeout(() => { if (!room.live) return; const cli = room.connect(); room.cli = cli; cli.onReady = () => { if (room.cli === cli) room.ready(cli); }; }, 800 * room.retries);
    },
    emit(topic, data) { if (!room.cli || room.cli.dead || !room.cli.ready) return Promise.reject({ code: 'closed' }); room.cli.publish(base + topic, JSON.stringify({ s: id, d: data })); return Promise.resolve(); },
    on(topic, fn) { const a = (handlers[topic] ||= []); a.push(fn); return () => { const i = a.indexOf(fn); if (i >= 0) a.splice(i, 1); }; },
    leave() { room.live = false; if (room.cli) room.cli.close(); return Promise.resolve(); },
    deliver(topic, payload) {
      let o; try { o = JSON.parse(payload); } catch { return; }
      if (!o || typeof o.s !== 'string') return;
      const msg = { data: o.d, peer: o.s, sameTab: o.s === id };
      for (const f of handlers[topic.slice(base.length)] || []) f(msg);
    },
  };
  return room;
}

/* ─── Liaison directe entre l'hôte et chaque camarade (signalée par le relais) ─── */
const RTC = {
  ok() { return typeof RTCPeerConnection === 'function' && !new URLSearchParams(location.search).has('nortc'); },
  healthy(L) { return !!L && L.open && L.dc && L.dc.readyState === 'open' && performance.now() - L.lastIn < 5000; },
  send(L, m) { if (!RTC.healthy(L) || L.dc.bufferedAmount > 262144) return false; try { L.dc.send(JSON.stringify(m)); return true; } catch { return false; } },
  close(L) { if (!L) return; clearTimeout(L.timer); L.open = false; try { L.pc && L.pc.close(); } catch { /* fermé */ } L.pc = null; L.dc = null; },
  // Création d'une liaison : `signal` envoie offre/réponse/candidats par le relais, `onMsg` reçoit les messages.
  make(L, offerer, signal, onMsg, n) {
    RTC.close(L); L.n = n ?? (L.n || 0) + 1; L.cands = []; L.remote = false; L.startAt = performance.now();
    let pc; try { pc = new RTCPeerConnection({ iceServers: RTC_ICE }); } catch { L.gaveUp = true; return null; }
    L.pc = pc; const tag = L.n;
    pc.onicecandidate = (e) => { if (e.candidate && L.pc === pc) signal('ice', { n: tag, c: e.candidate.toJSON ? e.candidate.toJSON() : e.candidate }); };
    const hook = (dc) => {
      L.dc = dc;
      dc.onopen = () => { if (L.pc !== pc) return; L.open = true; L.lastIn = performance.now(); clearTimeout(L.timer); UI.lobby(); };
      dc.onclose = () => { if (L.pc === pc) { L.open = false; UI.lobby(); } };
      dc.onmessage = (e) => { if (L.pc !== pc) return; L.lastIn = performance.now(); let m; try { m = JSON.parse(e.data); } catch { return; } if (Array.isArray(m)) onMsg(m); };
    };
    if (offerer) hook(pc.createDataChannel('sp', { ordered: true })); else pc.ondatachannel = (e) => hook(e.channel);
    pc.onconnectionstatechange = () => { if (L.pc === pc && pc.connectionState === 'failed') { L.open = false; if (L.onFail) L.onFail(); } };
    return pc;
  },
  // Offre/réponse/candidats reçus par le relais.
  async remote(L, kind, d, answer) {
    if (!L || !L.pc || !d || d.n !== L.n) return;
    const pc = L.pc;
    try {
      if (kind === 'rtc') {
        await pc.setRemoteDescription(d.sdp); L.remote = true;
        for (const c of L.cands.splice(0)) await pc.addIceCandidate(c).catch(() => {});
        if (answer) { const a = await pc.createAnswer(); await pc.setLocalDescription(a); answer({ n: L.n, sdp: { type: pc.localDescription.type, sdp: pc.localDescription.sdp } }); }
      } else if (kind === 'ice') { if (L.remote) await pc.addIceCandidate(d.c).catch(() => {}); else L.cands.push(d.c); }
    } catch { /* négociation ratée : le relais continue */ }
  },
};
