// Co-op à QUATRE (partie complète) : un hôte et trois invités, chacun se déplace en cercle pendant que l'hôte abat les
// infectés ; on vérifie que chacun voit les trois autres là où ils sont, que la manche est la même partout, et qu'un
// cinquième joueur est refusé pendant la partie (partie complète). Usage : node coop4.mjs [carte=cite]
// Relais : local par défaut ; Q="nortc=1" IGNORE_CERTS=1 pour la vraie liste de relais publics, sans liaison directe.
// (?norender : jeux non dessinés ; quatre jeux en rendu logiciel figeaient le conteneur, au point qu'un invité n'entendait
// plus l'hôte pendant 8 s et prenait sa place)
import { chromium } from 'playwright';
import path from 'path';
const dir = path.dirname(new URL(import.meta.url).pathname);
const MAPID = process.argv[2] || 'cite';
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--allow-loopback-in-peer-connection', '--disable-features=WebRtcHideLocalIpsWithMdns', ...(process.env.IGNORE_CERTS ? ['--ignore-certificate-errors'] : [])] });
const mk = async (tag) => {
  const ctx = await browser.newContext({ viewport: { width: 400, height: 225 } });
  await ctx.addInitScript(() => { localStorage.setItem('sp_settings', JSON.stringify({ quality: 0 })); });
  const page = await ctx.newPage(); page.errors = []; page.tag = tag;
  page.on('pageerror', (e) => page.errors.push(`[${tag} pageerror] ` + e.message + '\n' + e.stack));
  page.on('console', (m) => { if (m.type() === 'error' && !/WebSocket|ERR_|Failed to load resource/.test(m.text())) page.errors.push(`[${tag} console] ` + m.text().slice(0, 300)); });
  await page.route('https://cdn.jsdelivr.net/npm/three@0.186.1/**', (route) => { const u = new URL(route.request().url()); route.fulfill({ path: path.join(dir, 'node_modules/three', u.pathname.replace('/npm/three@0.186.1/', '')), contentType: 'application/javascript' }); });
  await page.route('https://cdn.jsdelivr.net/npm/peerjs@1.5.5/**', (route) => route.fulfill({ path: path.join(dir, 'node_modules/peerjs/dist/peerjs.min.js'), contentType: 'application/javascript' }));
  await page.route('https://fonts.googleapis.com/**', (r) => r.fulfill({ body: '', contentType: 'text/css' }));
  await page.route('https://fonts.gstatic.com/**', (r) => r.abort());
  await page.goto((process.env.WEB || 'http://127.0.0.1:8088') + '/index.html?' + (process.env.Q || 'relay=ws://127.0.0.1:8883&nortc=1') + '&norender#carte=' + MAPID, { timeout: 300000 });
  const t0 = Date.now(); await page.waitForFunction(() => window.__spReady, null, { timeout: 400000 }); console.log('page', tag, 'prête en', Math.round((Date.now() - t0) / 1000), 's');
  return page;
};
const log = (...a) => console.log(...a);
const ui = (page, name, codeVal) => page.evaluate(([n, c]) => { document.getElementById('joinButton').click(); document.getElementById('playerName').value = n; document.getElementById('sessionCode').value = c; document.getElementById('joinSubmit').click(); }, [name, codeVal]);
const pages = [];
for (const t of ['H', 'A', 'B', 'C']) pages.push(await mk(t));
const [host, ...guests] = pages;
await ui(host, 'Hote', ''); await host.waitForFunction(() => SP.NET.active, null, { timeout: 40000 });
const code = await host.evaluate(() => SP.NET.code);
for (const [i, g] of guests.entries()) await ui(g, ['Alpha', 'Bravo', 'Charlie'][i], code);
await host.waitForFunction(() => SP.NET.lobby.length === 4, null, { timeout: 90000 });
log('salon', code, JSON.stringify(await Promise.all(pages.map((p) => p.evaluate(() => [SP.NET.viaLabel(), SP.NET.lobby.length])))));
for (const g of guests) await g.waitForFunction(() => SP.NET.lobby.length === 4, null, { timeout: 60000 }).catch(async () => {
  log('ÉCHEC salon', JSON.stringify(await Promise.all(pages.map((p) => p.evaluate(() => ({ id: SP.P.id, active: SP.NET.active, host: SP.NET.isHost, lobby: SP.NET.lobby.map((q) => q.name), conns: [...SP.NET.conns.keys()], status: document.getElementById('joinStatus').textContent.slice(0, 120), mode: SP.G.mode }))))));
  throw new Error('salon incomplet');
});
await host.evaluate(() => document.getElementById('startCoop').click());
for (const g of guests) await g.waitForFunction(() => SP.G.mode === 'playing', null, { timeout: 90000 });
const ids = await Promise.all(pages.map((p) => p.evaluate(() => SP.P.id)));
await host.waitForFunction((ids) => ids.every((id) => SP.G.players.has(id)), ids, { timeout: 60000 });
await host.evaluate(() => { window.killNear = (r = 7) => { for (const z of SP.ZOMBIES) if (z.alive && z.state !== 'rise') for (const [, p] of SP.G.players) if (z.pos.distanceTo(p.pos) < r) { SP.G.applyDamage(z, 1e7, SP.P.id, { dir: new SP.THREE.Vector3(1, 0, 0) }); break; } }; });
// Chacun tourne autour d'un point de départ différent ; 60 s de jeu, pas de 0,25 s.
const starts = await host.evaluate(() => { const s = SP.spots().start; return [0, 1, 2, 3].map((i) => [s[0] * 2 + 1 + (i % 2) * 2, s[1] * 2 + 1 + (i >> 1) * 2]); });
let worst = 0, t0 = Date.now();
for (let step = 0; step < 240; step++) {
  await Promise.all(pages.map((p, i) => p.evaluate(([step, i, s]) => { const a = step * 0.05 + i; SP.P.hp = SP.P.maxHp = 1e6; SP.P.pos.set(s[0] + Math.cos(a) * 1.2, SP.P.pos.y, s[1] + Math.sin(a) * 1.2); SP.sim(0.25); if (SP.G.authority) killNear(); }, [step, i, starts[i]])));
  await host.waitForTimeout(25);
  if (step % 40 === 39) {
    // Écart entre la position vraie de chaque joueur et celle que les autres affichent.
    const truth = await Promise.all(pages.map((p) => p.evaluate(() => [SP.P.id, SP.P.pos.x, SP.P.pos.z])));
    const seen = await Promise.all(pages.map((p) => p.evaluate(() => [...SP.G.players.values()].filter((r) => !r.isLocal).map((r) => [r.id, r.pos.x, r.pos.z]))));
    let e = 0; for (const list of seen) for (const [id, x, z] of list) { const t = truth.find((q) => q[0] === id); if (t) e = Math.max(e, Math.hypot(t[1] - x, t[2] - z)); }
    worst = Math.max(worst, e);
    log(`t=${(step + 1) / 4} s`, 'joueurs vus', JSON.stringify(seen.map((l) => l.length)), 'écart max', e.toFixed(2), 'm', 'manches', JSON.stringify(await Promise.all(pages.map((p) => p.evaluate(() => SP.G.round)))));
  }
}
log('durée réelle', ((Date.now() - t0) / 1000).toFixed(0), 's');
// Un cinquième joueur pendant la partie : refusé. (Chargé à la fin : une 5e page sur ce conteneur fige les autres plus de
// 45 s pendant son chargement, et l'hôte les retirerait pour silence, comme un vrai joueur figé.)
const extra = await mk('E'); await ui(extra, 'Echo', code);
await extra.waitForFunction(() => /complète|trouvée/.test(document.getElementById('joinStatus').textContent), null, { timeout: 60000 }).catch(() => {});
log('5e joueur :', await extra.evaluate(() => document.getElementById('joinStatus').textContent));
await extra.context().close();
const rounds = await Promise.all(pages.map((p) => p.evaluate(() => SP.G.round))), pl = await Promise.all(pages.map((p) => p.evaluate(() => SP.G.players.size)));
const ok = rounds.every((r) => r === rounds[0]) && pl.every((n) => n === 4) && worst < 3;
log(ok ? 'OK   ' : 'ÉCART', 'manches', JSON.stringify(rounds), 'joueurs', JSON.stringify(pl), 'écart de position max', worst.toFixed(2), 'm');
const errs = pages.flatMap((p) => p.errors);
log('ERRORS', errs.length); errs.slice(0, 8).forEach((e) => log(e.slice(0, 500)));
await browser.close();
