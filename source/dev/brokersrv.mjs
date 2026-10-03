// Relais MQTT local (équivalent des relais publics) pour les tests : ws://127.0.0.1:8883
import aedesMod from 'aedes';
import { WebSocketServer, createWebSocketStream } from 'ws';
const Aedes = aedesMod.Aedes || aedesMod.default || aedesMod;
const aedes = typeof Aedes.createBroker === 'function' ? await Aedes.createBroker() : (typeof Aedes === 'function' ? Aedes() : new Aedes());
const DELAY = +(process.env.DELAY || 0); // latence artificielle (ms)
const wss = new WebSocketServer({ host: '127.0.0.1', port: +(process.env.PORT || 8883), handleProtocols: (ps) => (ps.has('mqtt') ? 'mqtt' : false) });
let n = 0, bytes = 0;
wss.on('connection', (ws) => { n++; const s = createWebSocketStream(ws); aedes.handle(s); });
aedes.on('publish', (p) => { bytes += p.payload?.length || 0; });
setInterval(() => { if (process.env.STATS) console.log('conns', n, 'bytes', bytes); }, 5000);
console.log('broker ready');
