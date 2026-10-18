// Portes fermées (étape « murs invisibles », source/AUDIT_MURS.md) : pour chaque porte de la carte, le joueur marche vers elle
// des deux côtés avec ses vraies collisions (collideCircle + pBlockedP, puis collideProps) : où s'arrête-t-il par rapport au
// battant, passe-t-il au travers ? Puis porte ouverte : passe-t-il ? Et une balle tirée vers la porte s'arrête-t-elle au battant ?
// Usage : node portes.mjs <carte> (cite, penitencier, filon, poste7) ; WEB=http://127.0.0.1:<port> pour une copie du dépôt.
// Attendu : arrêt à l'épaisseur du battant + rayon du joueur (0,15 + 0,34 m ; 0,6 + 0,34 m pour un amas), jamais au travers,
// passage libre une fois ouverte, balle arrêtée à moins de 0,2 m du battant. Affiche ERRORS n.
import { chromium } from 'playwright';
import path from 'path';
const dir = path.dirname(new URL(import.meta.url).pathname), id = process.argv[2] || 'cite';
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 960, height: 540 } }); const errors = [];
page.on('pageerror', (e) => errors.push('[pageerror] ' + e.message));
await page.route('https://cdn.jsdelivr.net/npm/three@0.186.1/**', (route) => { const u = new URL(route.request().url()); route.fulfill({ path: path.join(dir, 'node_modules/three', u.pathname.replace('/npm/three@0.186.1/', '')), contentType: 'application/javascript' }); });
await page.route('https://cdn.jsdelivr.net/npm/n8ao@2.0.1/**', (route) => route.fulfill({ path: path.join(dir, 'node_modules/n8ao/dist/N8AO.js'), contentType: 'application/javascript' }));
await page.route('https://fonts.googleapis.com/**', (r) => r.fulfill({ body: '', contentType: 'text/css' }));
await page.route('https://fonts.gstatic.com/**', (r) => r.abort());
await page.addInitScript(() => localStorage.setItem('sp_settings', JSON.stringify({ quality: 0 })));
await page.goto((process.env.WEB || 'http://127.0.0.1:8088') + '/index.html?nophoto&nozreal#carte=' + id);
await page.waitForFunction(() => window.__spReady, null, { timeout: 180000 });
await page.evaluate(() => document.querySelector('#soloButton').click());
await page.waitForTimeout(1500);
const res = await page.evaluate(() => {
  const { G, P, MAP, THREE } = SP; P.hp = P.maxHp = 1e9; G.toSpawn = 0; for (const z of [...SP.ZOMBIES]) z.destroy();
  const tcx = (t) => t * 2 + 1, R0 = 0.34, out = [], MAP_ID_IS_FILON = SP.MAP_ID() === 'filon';
  const walk = (p, dx, dz, n) => { for (let k = 0; k < n; k++) { p.x += dx * 0.05; p.z += dz * 0.05; SP.collideCircle(p, R0, SP.pBlockedP); SP.collideProps(p, R0, SP.groundAt(p.x, p.z), 0.3); } return p; };
  for (const d of MAP.doors) {
    if (d.open) continue;
    if (MAP_ID_IS_FILON && d.label === 'Libérer le Colosse') { out.push({ id: d.id, label: d.label, kind: d.kind, axis: d.axis, sides: [], note: 'le Colosse occupe la cage (sa boîte bloque le passage, voulu)' }); continue; }
    const cx = tcx(d.x), cz = tcx(d.z), ax = d.axis === 'x', th = d.slab ? (ax ? d.slab.x1 - cx : d.slab.z1 - cz) : 1, r = { id: d.id, label: d.label, kind: d.kind, axis: d.axis, at: [cx, cz], th: +th.toFixed(2), sides: [] };
    for (const s of [-1, 1]) {
      // Départ à 2,4 m du milieu de la porte, du côté s, dans l'axe ; marche de 3 m vers la porte.
      const p = new THREE.Vector3(cx + (ax ? s * 2.4 : 0), 0, cz + (ax ? 0 : s * 2.4));
      if (SP.pBlockedP(0, 0, Math.floor(p.x / 2), Math.floor(p.z / 2))) { r.sides.push({ s, skip: 'départ hors du sol' }); continue; }
      walk(p, ax ? -s : 0, ax ? 0 : -s, 60);
      const along = ax ? (p.x - cx) * s : (p.z - cz) * s, side = { s, stop: +along.toFixed(2), through: along < 0 };
      // Balle tirée depuis le point d'arrêt vers le milieu de la porte, à 1,2 m de haut.
      const o = new THREE.Vector3(p.x, 1.2, p.z), dir = new THREE.Vector3(cx - p.x, 0, cz - p.z); const L = dir.length(); dir.normalize();
      const h = SP.rayWorld(o, dir, L + 2); side.bullet = h ? +(Math.max(0, L - h.dist) - th).toFixed(2) : null; // distance entre l'impact et la face du battant
      // Porte ouverte : le joueur doit traverser.
      d.open = true; const q = walk(new THREE.Vector3(cx + (ax ? s * 2.4 : 0), 0, cz + (ax ? 0 : s * 2.4)), ax ? -s : 0, ax ? 0 : -s, 100); d.open = false;
      side.openPass = (ax ? (q.x - cx) * s : (q.z - cz) * s) < -1.5;
      r.sides.push(side);
    }
    // Le joueur avancé dans le carreau de la porte n'est pas ramené en arrière par le filet de sécurité de updatePlayer.
    const st = r.sides.find((x) => x.stop != null);
    if (st) { P.pos.set(cx + (ax ? st.s * (th + R0 + 0.02) : 0), 0, cz + (ax ? 0 : st.s * (th + R0 + 0.02))); P.vel.set(0, 0, 0); G.lastSafe = null; for (let k = 0; k < 5; k++) SP.updatePlayer(1 / 60); r.snap = +Math.hypot(P.pos.x - (cx + (ax ? st.s * (th + R0 + 0.02) : 0)), P.pos.z - (cz + (ax ? 0 : st.s * (th + R0 + 0.02)))).toFixed(2); }
    out.push(r);
  }
  return out;
});
let bad = 0;
for (const r of res) {
  const why = [];
  for (const s of r.sides) {
    if (s.skip) continue;
    const want = r.th + 0.34;
    if (s.through) why.push(`côté ${s.s} : traverse la porte fermée`);
    else if (Math.abs(s.stop - want) > 0.12) why.push(`côté ${s.s} : arrêt à ${s.stop} m du milieu (attendu ${want.toFixed(2)})`);
    if (s.bullet == null || s.bullet > 0.2) why.push(`côté ${s.s} : balle arrêtée à ${s.bullet} m du battant`);
    if (!s.openPass) why.push(`côté ${s.s} : ne passe pas porte ouverte`);
  }
  if (r.snap > 0.05) why.push(`ramené de ${r.snap} m par le filet de sécurité`);
  if (why.length) bad++;
  if (r.note) { console.log(`– porte ${r.id} « ${r.label} » : ${r.note}`); continue; }
  console.log(`${why.length ? '✗' : '✓'} porte ${r.id} « ${r.label} » (${r.kind}, axe ${r.axis}) : ${r.sides.map((s) => s.skip ? `côté ${s.s} ${s.skip}` : `côté ${s.s} arrêt ${s.stop} m, balle ${s.bullet}`).join(' ; ')}${why.length ? ' — ' + why.join(' ; ') : ''}`);
}
for (const e of errors) console.log(e);
console.log(`${res.length} portes ; ERRORS ${bad + errors.length}`);
await browser.close();
