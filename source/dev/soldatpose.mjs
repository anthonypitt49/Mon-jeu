// Coéquipier vu de près : prise de l'arme et bras (09e_soldats.js), intempéries de la carte sur la tenue (charCoat).
// Planche de 12 vues d'un soldat : prêt à tirer (trois quarts, profil, dos), prêt bas, plongée sur les épaules, pistolet,
// mitraillette, mitrailleuse, accroupi, rechargement, visée haute, course. Planche dans dev/shots/soldatpose_<modèle>.jpg.
// usage : node soldatpose.mjs [carte=poste7] [rang du soldat=0] [qualité=2]
import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';
const dir = path.dirname(new URL(import.meta.url).pathname);
const id = process.argv[2] || 'poste7', rank = +(process.argv[3] ?? 0), q = +(process.argv[4] ?? 2);
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const ctx = await browser.newContext({ viewport: { width: 480, height: 360 } });
await ctx.addInitScript((q) => { localStorage.setItem('sp_settings', JSON.stringify({ quality: q })); }, q);
const page = await ctx.newPage(); const errors = [];
page.on('pageerror', (e) => errors.push('[pageerror] ' + e.message + '\n' + (e.stack || '').slice(0, 400)));
page.on('console', (m) => { if (m.type() === 'error') errors.push('[console] ' + m.text().slice(0, 300)); });
await page.route('https://cdn.jsdelivr.net/npm/three@0.186.1/**', (route) => { const u = new URL(route.request().url()); route.fulfill({ path: path.join(dir, 'node_modules/three', u.pathname.replace('/npm/three@0.186.1/', '')), contentType: 'application/javascript' }); });
await page.route('https://cdn.jsdelivr.net/npm/n8ao@2.0.1/**', (route) => route.fulfill({ path: path.join(dir, 'node_modules/n8ao/dist/N8AO.js'), contentType: 'application/javascript' }));
await page.route('https://fonts.googleapis.com/**', (r) => r.fulfill({ body: '', contentType: 'text/css' }));
await page.route('https://fonts.gstatic.com/**', (r) => r.abort());
await page.goto((process.env.WEB || 'http://127.0.0.1:8088') + '/index.html#carte=' + id, { timeout: 300000 });
await page.waitForFunction(() => window.__spReady, null, { timeout: 400000 });
await page.evaluate(() => document.querySelector('#soloButton').click());
await page.waitForTimeout(1500);
await page.evaluate((rank) => {
  const { G, P } = SP; P.hp = P.maxHp = 1e9; G.breakT = 1e9; G.toSpawn = 0; for (const z of [...SP.ZOMBIES]) z.destroy();
  const r = G.addPlayer('essai', 'SOLDAT', false); r.soldier = rank; r.weaponKey = 'carbine';
}, rank);
await page.waitForFunction(() => SP.SREAL.state !== 'loading' && SP.SREAL.state !== 'off', null, { timeout: 180000 });
const res = await page.evaluate(async (coat) => {
  const { G, P, R } = SP; document.getElementById('hud').classList.add('hidden');
  if (coat === '0') for (const t of Object.values(SP.SREAL.tpl)) { const c = t.mesh.material.userData.coat; if (c) { c.uCoatTop.value = 0; c.uCoatLow.value = 0; } } // (COAT=0 : sans intempéries)
  const M = SP.MAP, W = SP.MAPW(); let best = 0; for (let i = 0; i < M.edge.length; i++) if (M.edge[i] > M.edge[best] && !M.roof[i]) best = i;
  const cx = ((best % W) + 0.5) * 2, cz = (((best / W) | 0) + 0.5) * 2;
  P.pos.set(cx + 40, SP.groundAt(cx, cz), cz + 40); SP.updatePlayer(0.016); // (joueur loin, hors des vues)
  const r = [...G.players.values()].find((q) => !q.isLocal), a = () => r.avatar;
  const cw = 480, ch = 360, mc = document.createElement('canvas'); mc.width = cw * 4; mc.height = ch * 3; const c2 = mc.getContext('2d');
  const y0 = SP.groundAt(cx, cz);
  // Le soldat regarde vers −z (yaw 0) ; caméra placée en coordonnées du soldat : x à sa droite, z devant lui.
  const view = (dx, dy, dz, ly = 1.25) => { R.camera.position.set(cx + dx, y0 + dy, cz - dz); R.camera.lookAt(cx, y0 + ly, cz); };
  const set = (o) => { r.pos.set(cx, y0, cz); r.yaw = 0; r.pitch = o.pitch || 0; r.flags = o.flags || 0; r.net = null; r.weaponKey = o.gun || 'carbine'; const av = a(); if (av) { av.fireT = o.fire ? 3 : 0; } for (let k = 0; k < 45; k++) { if (o.fire && av) av.fireT = 3; G.update(1 / 30); } };
  R.camera.fov = 34; R.camera.updateProjectionMatrix(); R.viewScene.visible = false; // (gros plan, sans l'arme du joueur)
  const shot = (i, label) => { R.viewScene.visible = false; SP.renderFrame(1 / 30); c2.drawImage(R.renderer.domElement, (i % 4) * cw, ((i / 4) | 0) * ch, cw, ch); c2.fillStyle = '#000b'; c2.fillRect((i % 4) * cw, ((i / 4) | 0) * ch, 300, 20); c2.fillStyle = '#ff6'; c2.font = '13px monospace'; c2.fillText(label, (i % 4) * cw + 5, ((i / 4) | 0) * ch + 14); };
  const views = [
    [{ fire: 1 }, [1.4, 1.55, 1.7], 'prêt à tirer · trois quarts'],
    [{ fire: 1 }, [2.2, 1.35, 0.05], 'prêt à tirer · profil droit'],
    [{ fire: 1 }, [-1.5, 1.6, -1.6], 'prêt à tirer · dos'],
    [{}, [1.3, 1.5, 1.8], 'prêt bas (marche)'],
    [{ fire: 1 }, [0.5, 3.0, 0.9], 'épaules (plongée)', 1.3],
    [{ fire: 1, gun: 'pistol' }, [1.3, 1.5, 1.7], 'pistolet'],
    [{ fire: 1, gun: 'smg' }, [-1.3, 1.5, 1.8], 'mitraillette · gauche'],
    [{ fire: 1, gun: 'lmg' }, [2.1, 1.4, 0.6], 'mitrailleuse · profil'],
    [{ fire: 1, flags: 1 }, [1.4, 1.2, 1.6], 'accroupi', 0.8],
    [{ fire: 1, flags: 32 }, [1.3, 1.5, 1.7], 'rechargement'],
    [{ fire: 1, pitch: 0.5 }, [1.6, 1.3, 1.5], 'visée haute'],
    [{ flags: 2, gun: 'shotgun' }, [1.5, 1.5, 1.6], 'course · fusil à pompe'],
  ];
  views.forEach(([o, v, label, ly], i) => { set(o); view(...v, ly); shot(i, label + ' · ' + (a()?.real?.tpl.id || 'procédural')); });
  return { real: a()?.real?.tpl.id || null, url: mc.toDataURL('image/jpeg', 0.86) };
}, process.env.COAT || '1');
fs.mkdirSync(path.join(dir, 'shots'), { recursive: true });
const out = path.join(dir, 'shots', `soldatpose_${id}_${rank}${process.env.COAT === '0' ? '_sans' : ''}.jpg`);
fs.writeFileSync(out, Buffer.from(res.url.split(',')[1], 'base64'));
console.log(JSON.stringify({ modele: res.real, planche: out }));
console.log('ERRORS', errors.length); for (const e of errors.slice(0, 8)) console.log(e);
await browser.close();
