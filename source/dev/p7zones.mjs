// Poste 7 agrandi : toutes les portes ouvertes, le joueur posté dans chaque nouvelle zone (chambre de mine à −1,6 m, cour de
// la ferme, plate-forme d'observation à +1,8 m) ; on vérifie que les infectés y arrivent (chemin, rampes, sol en pente) et
// qu'ils frappent. Sortie : distance la plus courte atteinte et coups reçus par zone, erreurs de la page.
// usage : node p7zones.mjs [secondes par zone=40]
import { chromium } from 'playwright';
import path from 'path';
const dir = path.dirname(new URL(import.meta.url).pathname), secs = +(process.argv[2] || 40);
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const ctx = await browser.newContext({ viewport: { width: 640, height: 360 } });
await ctx.addInitScript(() => { localStorage.setItem('sp_settings', JSON.stringify({ quality: 0 })); });
const page = await ctx.newPage(); const errors = [];
page.on('pageerror', (e) => errors.push('[pageerror] ' + e.message + '\n' + (e.stack || '').slice(0, 400)));
page.on('console', (m) => { if (m.type() === 'error') errors.push('[console] ' + m.text().slice(0, 300)); });
await page.route('https://cdn.jsdelivr.net/npm/three@0.186.1/**', (route) => { const u = new URL(route.request().url()); route.fulfill({ path: path.join(dir, 'node_modules/three', u.pathname.replace('/npm/three@0.186.1/', '')), contentType: 'application/javascript' }); });
await page.route('https://fonts.googleapis.com/**', (r) => r.fulfill({ body: '', contentType: 'text/css' }));
await page.route('https://fonts.gstatic.com/**', (r) => r.abort());
await page.goto((process.env.WEB || 'http://127.0.0.1:8088') + '/index.html#carte=poste7');
await page.waitForFunction(() => window.__spReady, null, { timeout: 300000 });
await page.evaluate(() => document.getElementById('soloButton').click());
await page.waitForTimeout(500);
const spots = { 'chambre de mine': [42, 76], 'ferme (cour)': [18, 70], 'plate-forme': [86, 34], 'galerie (pente)': [63, 66] };
const out = {};
for (const [name, [x, z]] of Object.entries(spots)) {
  out[name] = await page.evaluate(async ([x, z, secs]) => {
    const { G, P, MAP, ZOMBIES } = SP;
    for (const d of MAP.doors) if (!d.open) G.applyEvent('door', { id: d.id });
    for (const zb of [...ZOMBIES]) zb.destroy();
    P.hp = P.maxHp = 1e9; P.pos.set(x, SP.groundAt(x, z), z); P.vel.set(0, 0, 0);
    G.round = Math.max(G.round, 3); G.startRound(G.round); G.breakT = 0;
    let best = 99, hits = 0, n = 0; const hp0 = P.hp, y = P.pos.y;
    for (let t = 0; t < secs; t += 0.1) {
      P.pos.x = x; P.pos.z = z; SP.sim(0.1, 0.05);
      for (const zb of ZOMBIES) if (zb.alive && zb.state !== 'rise') best = Math.min(best, Math.hypot(zb.pos.x - x, zb.pos.z - z));
      n = Math.max(n, ZOMBIES.filter((q) => q.alive).length);
    }
    hits = hp0 - P.hp;
    return { y: +y.toFixed(2), sol: +SP.groundAt(x, z).toFixed(2), vivants: n, plusPres: +best.toFixed(2), degats: Math.round(hits), round: G.round };
  }, [x, z, secs]);
  console.log(name, JSON.stringify(out[name]));
}
console.log('ERRORS', errors.length); for (const e of errors.slice(0, 10)) console.log(e);
await browser.close();
