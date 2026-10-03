// Simulation locale du salon Claude (BroadcastChannel entre onglets du même navigateur).
(() => {
  const me = 'peer' + Math.random().toString(36).slice(2, 8);
  const mkRoom = (name) => {
    const ch = new BroadcastChannel('mock-room-' + name), handlers = {}, peerFns = [], seen = new Map();
    let left = false;
    const deliver = (m) => { (handlers[m.topic] || []).forEach((f) => f(m)); };
    const peersList = () => [{ peer: me, isMe: true, sameTab: true, by: null, kind: 'viewer', guest: false, presence: {}, updatedAt: Date.now() }, ...[...seen.keys()].map((p) => ({ peer: p, isMe: false, sameTab: false, by: null, kind: 'viewer', guest: false, presence: {}, updatedAt: Date.now() }))];
    ch.onmessage = (e) => {
      const m = e.data; if (left) return;
      if (m.kind === 'hi') { const isNew = !seen.has(m.peer); seen.set(m.peer, Date.now()); if (isNew) { ch.postMessage({ kind: 'hi', peer: me }); peerFns.forEach((f) => f({ peers: peersList(), joined: [{ peer: m.peer }], left: [], updated: [] })); } return; }
      if (m.kind === 'bye') { if (seen.delete(m.peer)) peerFns.forEach((f) => f({ peers: peersList(), joined: [], left: [{ peer: m.peer }], updated: [] })); return; }
      if (m.kind === 'msg') deliver({ topic: m.topic, data: m.data, peer: m.peer, isMe: false, sameTab: false, by: null, kind: 'viewer', guest: false });
    };
    ch.postMessage({ kind: 'hi', peer: me });
    const hb = setInterval(() => { ch.postMessage({ kind: 'hi', peer: me }); const now = Date.now(); for (const [p, t] of seen) if (now - t > 4000) { seen.delete(p); peerFns.forEach((f) => f({ peers: peersList(), joined: [], left: [{ peer: p }], updated: [] })); } }, 1000);
    window.__mockStats = window.__mockStats || { emits: 0, maxBytes: 0, topics: {} };
    return {
      name,
      emit(topic, data) {
        const bytes = new TextEncoder().encode(JSON.stringify(data)).length;
        window.__mockStats.emits++; window.__mockStats.maxBytes = Math.max(window.__mockStats.maxBytes, bytes); window.__mockStats.topics[topic] = (window.__mockStats.topics[topic] || 0) + 1;
        if (bytes > 4096) return Promise.reject({ code: 'invalid_argument', message: 'too big ' + bytes });
        ch.postMessage({ kind: 'msg', topic, data, peer: me });
        setTimeout(() => deliver({ topic, data, peer: me, isMe: true, sameTab: true, by: null, kind: 'viewer', guest: false }), 0);
        return Promise.resolve();
      },
      on(topic, fn) { (handlers[topic] ||= []).push(fn); return () => { handlers[topic] = handlers[topic].filter((f) => f !== fn); }; },
      onPeers(fn) { peerFns.push(fn); setTimeout(() => fn({ peers: peersList(), joined: peersList(), left: [], updated: [] }), 0); return () => {}; },
      peers: peersList, presence: () => Promise.resolve(), connected: () => true, onConnection: (f) => { setTimeout(() => f(true)); return () => {}; },
      leave() { left = true; clearInterval(hb); ch.postMessage({ kind: 'bye', peer: me }); ch.close(); return Promise.resolve(); },
    };
  };
  const ns = { join: (name) => Promise.resolve(mkRoom(name)) };
  window.claude = { use: (n) => new Promise((r) => setTimeout(() => r(n === 'room' ? ns : null), 300)) };
})();
