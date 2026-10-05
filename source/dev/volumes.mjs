// Volumes par famille : réglages (général, armes, infectés, ambiance, musique), chaque son sur son canal, coupure complète à 0 %.
// usage : node volumes.mjs [carte=poste7] — un analyseur écoute chaque canal pendant qu'on joue un son de chaque famille.
import { chromium } from 'playwright';
import path from 'path';
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
await page.goto('http://127.0.0.1:8088/index.html?' + (process.env.Q || '') + '#carte=' + id);
await page.waitForFunction(() => window.__spReady, null, { timeout: 180000 });
await page.evaluate(() => document.querySelector('#soloButton').click());
await page.waitForFunction(() => ['on', 'failed'].includes(SP.Sfx.bankInfo.state) || /nosamples/.test(location.search), null, { timeout: 60000 });
// Les textures photo (chargées même en « bas » depuis la 5.0) occupent le fil principal en arrivant : on mesure après.
await page.waitForFunction(() => SP.PHOTO.state !== 'loading', null, { timeout: 120000 });
const ev = (f, a) => page.evaluate(f, a);
const check = (ok, msg) => { if (!ok) errors.push('[volumes] ' + msg); };

// Réglages : la section dépliable existe, chaque curseur règle et enregistre sa valeur.
const ui = await ev(() => {
  SP.UI.openSettings();
  const d = document.querySelector('#settings details.set-more'), out = { details: !!d, closed: d && !d.open, rows: [] };
  for (const [id, key] of [['optVol', 'volume'], ['optVolWeapons', 'volWeapons'], ['optVolZombies', 'volZombies'], ['optVolAmb', 'volAmb'], ['optMusic', 'music']]) {
    const el = document.getElementById(id); if (!el) { out.rows.push([id, 'absent']); continue; }
    el.value = 0.35; el.dispatchEvent(new Event('input'));
    const saved = JSON.parse(localStorage.getItem('sp_settings') || '{}')[key];
    out.rows.push([id, SP.settings[key], saved, document.getElementById(id + 'V').textContent, !!el.closest('details') ]);
  }
  return out;
});
console.log('UI', JSON.stringify(ui));
check(ui.details && ui.closed, 'section « volumes détaillés » absente ou ouverte par défaut');
for (const [id, v, saved, txt, inDetails] of ui.rows) {
  check(v === 0.35 && saved === 0.35 && txt === '35%', `${id} : réglage non appliqué ou non enregistré (${v}, ${saved}, ${txt})`);
  check(inDetails === (id !== 'optVol'), `${id} : mal placé (dans la section dépliable : ${inDetails})`);
}

// Canaux : un analyseur sur chaque famille ; chaque son doit sortir sur la sienne et seulement elle.
const r = await ev(async () => {
  const S = SP.Sfx, c = S.ctx, wait = (ms) => new Promise((res) => setTimeout(res, ms));
  const setVol = (key, v) => { SP.settings[key] = v; S.applyVolume(); };
  for (const k of ['volume', 'volWeapons', 'volZombies', 'volAmb', 'music']) setVol(k, 1);
  const fams = { weapons: S.weapons, zombies: S.zombies, amb: S.amb, sfx: S.sfx };
  const an = {};
  for (const [k, bus] of Object.entries(fams)) { const a = c.createAnalyser(), z = c.createGain(); a.fftSize = 2048; z.gain.value = 0; bus.connect(a); a.connect(z); z.connect(c.destination); an[k] = a; }
  const buf = new Float32Array(2048);
  // Crête de chaque canal pendant `ms` ; avant le son, le bruit de fond (queue du son précédent, ambiance…) est mesuré aussi.
  const peaks = async (ms) => {
    const pk = {}; for (const k in an) pk[k] = 0; const t0 = performance.now();
    while (performance.now() - t0 < ms) { for (const k in an) { an[k].getFloatTimeDomainData(buf); for (const x of buf) pk[k] = Math.max(pk[k], Math.abs(x)); } await wait(15); }
    for (const k in pk) pk[k] = +pk[k].toFixed(4); return pk;
  };
  const listen = async (fn, ms = 900) => {
    await wait(1500); const base = await peaks(250), gains = Object.fromEntries(Object.entries(fams).map(([k, b]) => [k, +b.gain.value.toFixed(3)]));
    fn(); return { ...(await peaks(ms)), base, gains };
  };
  SP.pauseGame(); // pas d'infectés, de géant d'acier ni d'obus pendant les mesures
  setVol('volAmb', 0); // le vent tourne en continu : on le coupe pour juger les autres canaux
  const p = SP.P.pos.clone(); p.x += 3; const v = S.voices; S.voices = 99; // pas de râles d'infectés pendant les mesures
  const res = {};
  res.gun = await listen(() => S.gun('ar', null, true));
  res.reload = await listen(() => S.reloadSeq('mag', 0.6, p));
  res.flesh = await listen(() => { S.flesh(p, true); S.flesh(p, false); });
  res.explosion = await listen(() => S.explosion(p, 1));
  res.hammer = await listen(() => S.hammer(p));
  S.voices = 0; res.zombie = await listen(() => S.zombie(p, 'scream', 1)); S.voices = 99;
  setVol('volAmb', 1); res.ambOn = await listen(() => S.artillery(), 1500);
  // Volume à 0 : le canal se tait entièrement, réverbération et écho compris.
  setVol('volWeapons', 0); res.gunMuted = await listen(() => S.gun('ar', null, true));
  res.weaponsParams = [S.weapons.gain.value, S.weapons.verb.gain.value, S.weapons.echo.gain.value].map((x) => +x.toFixed(4));
  setVol('volZombies', 0); S.voices = 0; res.zombieMuted = await listen(() => S.zombie(p, 'scream', 1)); S.voices = v;
  setVol('volAmb', 0); res.ambMuted = await listen(() => S.artillery(), 1500);
  setVol('volume', 0); res.master = +S.master.gain.value.toFixed(4);
  for (const k of ['volume', 'volWeapons', 'volZombies', 'volAmb', 'music']) setVol(k, k === 'volume' ? 0.8 : k === 'music' ? 0.5 : 1);
  return res;
});
console.log('CANAUX', JSON.stringify(r));
const on = 0.01, off = 0.0005, only = (pk, fam, name) => {
  check(pk[fam] > on, `${name} : rien sur le canal ${fam} (${pk[fam]})`);
  for (const k of ['weapons', 'zombies', 'sfx']) if (k !== fam) check(pk[k] < Math.max(off, pk.base[k] * 1.2), `${name} : déborde sur le canal ${k} (${pk[k]}, fond ${pk.base[k]})`);
};
only(r.gun, 'weapons', 'tir'); only(r.reload, 'weapons', 'recharge'); only(r.flesh, 'weapons', 'impact'); only(r.explosion, 'weapons', 'explosion');
only(r.hammer, 'sfx', 'marteau'); only(r.zombie, 'zombies', 'infecté');
check(r.ambOn.amb > on, `artillerie : rien sur le canal ambiance (${r.ambOn.amb})`);
check(r.gunMuted.weapons < off && r.weaponsParams.every((x) => x < 0.001), `armes à 0 % : encore audibles (${r.gunMuted.weapons}, ${r.weaponsParams})`);
check(r.zombieMuted.zombies < off, `infectés à 0 % : encore audibles (${r.zombieMuted.zombies})`);
check(r.ambMuted.amb < off, `ambiance à 0 % : encore audible (${r.ambMuted.amb})`);
check(r.master < 0.001, `volume général à 0 % : encore audible (${r.master})`);
console.log('ERRORS:', errors.length); errors.slice(0, 20).forEach((e) => console.log(e));
await browser.close();
