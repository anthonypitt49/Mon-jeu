// Vrais sons : chargement depuis assets/sounds/ (servi en HTTP, comme sur GitHub Pages), lecture par chaque fonction sonore, secours synthétisé.
// usage : node sounds.mjs [carte=poste7] ; env SONS=<dossier> pour servir un autre jeu de sons (ex. sortie de keep_sounds.py --vers),
// env Q='nosamples' pour vérifier que tout joue encore sans eux.
import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';
const dir = path.dirname(new URL(import.meta.url).pathname);
const id = process.argv[2] || 'poste7';
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] });
const ctx = await browser.newContext({ viewport: { width: 800, height: 450 } });
await ctx.addInitScript(() => { localStorage.setItem('sp_settings', JSON.stringify({ quality: 0 })); });
const page = await ctx.newPage(); const errors = [];
page.on('pageerror', (e) => errors.push('[pageerror] ' + e.message + '\n' + e.stack));
page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errors.push('[console] ' + m.text().slice(0, 300)); });
await page.route('https://cdn.jsdelivr.net/npm/three@0.186.1/**', (route) => { const u = new URL(route.request().url()); route.fulfill({ path: path.join(dir, 'node_modules/three', u.pathname.replace('/npm/three@0.186.1/', '')), contentType: 'application/javascript' }); });
await page.route('https://fonts.googleapis.com/**', (r) => r.fulfill({ body: '', contentType: 'text/css' }));
await page.route('https://fonts.gstatic.com/**', (r) => r.abort());
if (process.env.SONS) await page.route('**/assets/sounds/**', (r) => { const f = path.join(process.env.SONS, path.basename(new URL(r.request().url()).pathname)); fs.existsSync(f) ? r.fulfill({ path: f }) : r.fulfill({ status: 404, body: '' }); });
await page.goto('http://127.0.0.1:8088/index.html?' + (process.env.Q || '') + '#carte=' + id);
await page.waitForFunction(() => window.__spReady, null, { timeout: 180000 });
await page.evaluate(() => document.querySelector('#soloButton').click());
await page.waitForFunction(() => ['on', 'failed'].includes(SP.Sfx.bankInfo.state) || /nosamples/.test(location.search), null, { timeout: 60000 });
const ev = (f, a) => page.evaluate(f, a);
// shifts : recalage des MP3 (ms), quand le navigateur ne lit pas l'OGG ou avec Q=mp3.
const bank = await ev(() => ({ ...SP.Sfx.bankInfo, names: Object.keys(SP.Sfx.bank), ctx: SP.Sfx.ctx.state, shifts: Object.fromEntries(Object.entries(SP.Sfx.bank).filter(([, b]) => b.d).map(([n, b]) => [n, +(b.d * 1000).toFixed(1)])) }));
console.log('BANK', JSON.stringify(bank));
if (/mp3/.test(process.env.Q || '') && bank.mp3 !== bank.n) errors.push(`[sons] Q=mp3 : ${bank.mp3} MP3 sur ${bank.n} sons`);
// Chaque fonction sonore, en notant les enregistrements qu'elle a réellement joués.
const r = await ev(async () => {
  const S = SP.Sfx, played = {}, orig = S.play.bind(S);
  S.play = (name, ...a) => { const d = orig(name, ...a); if (d) played[name] = (played[name] || 0) + 1; return d; };
  const p = SP.P.pos.clone(); p.x += 3;
  for (const prof of ['pistol', 'revolver', 'rifle', 'carbine', 'smg', 'ar', 'lmg', 'shotgun', 'sniper', 'launcher', 'cryo', 'ray']) { S.gun(prof, null, true); S.gun(prof, p, false); }
  for (const k of ['mag', 'bolt', 'pump', 'shell']) S.reloadSeq(k, 1, p);
  for (let i = 0; i < 24; i++) { S.casing(p, i % 2); S.impact(p, ['metal', 'wood', 'earth'][i % 3]); S.flesh(p, i % 2); } // le jeu en saute une partie au hasard
  for (const s of ['wood', 'mud', 'snow', 'concrete']) S.step(s, null, 1);
  for (const k of ['groan', 'scream', 'attack']) S.zombie(p, k, 0.7);
  S.plankRip(p); S.hammer(p); S.explosion(p, 1.4); S.explosion(p, 0.5); S.artillery(); S.distantMG();
  await new Promise((res) => setTimeout(res, 1500)); // déclics de recharge programmés
  S.play = orig;
  return { played, wind: !!S.wind.rec };
});
console.log('PLAYED', JSON.stringify(r));
// Une minute de jeu accélérée : tirs, infectés, pas, ambiance.
console.log('GAME', JSON.stringify(await ev(() => { SP.P.hp = SP.P.maxHp = 1e6; for (let i = 0; i < 40; i++) { SP.INPUT.fire = true; SP.INPUT.firePressed = true; SP.sim(0.5); SP.INPUT.fire = false; SP.sim(1); } return { round: SP.G.round, kills: SP.P.stats.kills, bank: SP.Sfx.bankInfo.state }; })));
const want = Object.keys(await ev(() => SP.Sfx.bank));
const missing = want.filter((n) => !r.played[n] && !(n === 'vent_neige' && (r.wind || id !== 'poste7')) && !(n === 'pas_neige' && id !== 'poste7')); // neige et vent : Poste 7 seulement (le vent tourne en boucle)
if (missing.length) errors.push('[sons] chargés mais jamais joués : ' + missing.join(', '));
console.log('ERRORS:', errors.length); errors.slice(0, 20).forEach((e) => console.log(e));
await browser.close();
